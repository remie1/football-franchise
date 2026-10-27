/**
 * ADR-089 step 0 — M3, M4 AND M6 TO M9, AND THE `pocket` COMMAND (plan §6, §6.2).
 *
 *  - M3: the credited sacker (the last ARRIVED), same-tick arrivals split evenly, on constructed
 *    sacks; the real side's credits on constructed play-by-play and depth-chart rows;
 *  - M4: TM's cause rule on constructed ticks (an arrival names its origin, else the band, else the
 *    counter; shares split evenly); the naive rule beside it;
 *  - M6: today's pocket-movement pick restated (urgency, appeals, the climb lane, the throwaway
 *    gate, the bands, the rank clamp, the die's exact chances); contact on constructed arrivals
 *    (the upper bound, the free-run clock, FIGHT against THROWAWAY);
 *  - M7: §4.8's closed form at fixed ratings, and the target nearest 0.90;
 *  - M8: a constructed play's runners under Wait and Table now;
 *  - M9: the windows and the counts on constructed clocks;
 *  - always on, golden games: M4's and M6's identities against the stream, M8's restated times;
 *  - gated `FF_POCKET_BASE=1`, gen seed set 1: the (b) checks (M3 86.90 / 8.64 / 4.43 split, 82.51
 *    unsplit interior, 1,110 same-tick, 4,308 sacks; M4 6,395 of 21,962; throws after an escape
 *    24.0% / 17.1% on 421) and M6's cross-check;
 *  - the command: its arguments, the filing fill (only M.* and m1Bound.*), and a small run.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setAttr, type MatchEventEnvelope, type PlayerId, type PlayerState, type Position } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { emptyAccumulator } from "../src/metrics/collect.js";
import { approachOf, type ThreatApproach } from "../src/pocket/approach.js";
import { M_IDS } from "../src/pocket/constructs.js";
import { CORPORA, genSeason, goldenGames } from "../src/pocket/corpus.js";
import { FILED_CONSTANT_NAMES, FILED_FORMAT, pendingPaths, validateFiled, type FiledFile } from "../src/pocket/filed.js";
import { dropOfCall, freeRunTime, registryAttr } from "../src/pocket/freeRun.js";
import { legacyFreeRunSeconds } from "../src/pocket/legacyFreeRun.js";
import { depthPositionIndex, emptyM3Fold, foldM3Dropback, m3Summary, realSackerMixOf, sackerClassOf } from "../src/pocket/m3SackerMix.js";
import { causesOf, emptyM4Fold, firstNonClean, foldM4Game, foldM4Ticks, m4Summary } from "../src/pocket/m4AlarmMix.js";
import type { ArmTick, RusherChannels } from "../src/pocket/m2ForcingSource.js";
import {
  appealOf,
  brokenReceiverAt,
  chanceOfResponse,
  contactOf,
  emptyM6Fold,
  foldM6Contact,
  foldM6Game,
  m6Summary,
  movementBandOf,
  pickOf,
  priceContact,
  rankChances,
  rankedResponsesOf,
  urgencyOf,
  type RatingOf,
} from "../src/pocket/m6Contact.js";
import { emptyM7Fold, foldM7Game, frontSideEarly, m7Summary, m7Target, senseModifier, sightOf, sightShares, type M7Fold } from "../src/pocket/m7Sight.js";
import { emptyM8Fold, foldM8Game, m8RunnersOf, m8Summary } from "../src/pocket/m8FreeRunClock.js";
import { m9GameOf, m9Table, windowOf } from "../src/pocket/m9Situation.js";
import { emptyRowsFold, foldRowsGame, pocketRows } from "../src/pocket/rows.js";
import { TABLE_NOW } from "../src/pocket/snapSpot.js";
import { dropbacksOf, type Dropback } from "../src/pocket/throwClass.js";
import { baseArm, emptyGuardFold, fillStep0, openFiling, parsePocketArgs, runStep0, sanitize } from "../src/pocket/step0.js";

const T = DEFAULT_TUNABLES;
const BASE = process.env["FF_POCKET_BASE"] === "1";
const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
type Ev = Record<string, unknown>;

// --- constructed plays ----------------------------------------------------------------------------

let playNo = 0;
const env = (playId: string | undefined, event: Ev): MatchEventEnvelope => ({ seq: 0, at: AT, event: { gameId: "g", ...(playId === undefined ? {} : { playId }), ...event } as never });

interface StartOpts {
  readonly rush: readonly Ev[];
  readonly stunts?: readonly Ev[];
  readonly call?: string;
  readonly down?: number;
  readonly clockSeconds?: number;
}

const passStart = (o: StartOpts): Ev => ({
  type: "PLAY_START",
  payload: {
    kind: "PASS_PLAY_V1",
    offense: { team: "OFF", call: o.call ?? "Stick", readSystem: "HALF_FIELD", quarterback: "qb" },
    defense: { team: "DEF", rush: o.rush, ...(o.stunts === undefined ? {} : { stunts: o.stunts }) },
    situation: { down: o.down ?? 1, distance: 10, ballOn: 25, clockSeconds: o.clockSeconds ?? 900 },
  },
});

function play(start: StartOpts, events: readonly Ev[]): readonly MatchEventEnvelope[] {
  playNo += 1;
  const playId = `g:p${String(playNo)}`;
  return [env(playId, passStart(start)), ...events.map((e) => env(playId, e))];
}

const one = (events: readonly MatchEventEnvelope[]): Dropback => {
  const ds = dropbacksOf(events);
  expect(ds.length).toBe(1);
  return ds[0] as Dropback;
};

const tick = (t: number): Ev => ({ type: "TICK", payload: { tick: t } });
const threat = (rusher: string, alignment: string, origin: string, state: string, etaTick = 1.5, rollRef = `r/${rusher}`): Ev => ({
  type: "RUSH_THREAT",
  payload: { rusher, alignment, origin, rollRef, etaTick, state },
});
const check = (checkKind: string, band: string, actors: readonly string[], margin = 0, rngLabel = `${checkKind}/${actors.join(",")}`): Ev => ({
  type: "CHECK",
  payload: { checkKind, band, actors, margin, roll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel } },
});
const result = (yards: number): Ev => ({ type: "PLAY_RESULT", payload: { yards, turnover: false, clockRunoff: 6 } });
const route = (receiver: string, phase: string): Ev => ({ type: "ROUTE_STATUS", payload: { receiver, phase, openness: 50 } });
const throwTo = (target: string): readonly Ev[] => [{ type: "QB_DECISION", payload: { choice: "THROW", target } }, { type: "THROW", payload: { target } }];

const RUSH = [
  { rusher: "dt1", move: "POWER", alignment: "INTERIOR", side: "LEFT", gap: "B" },
  { rusher: "dt2", move: "POWER", alignment: "INTERIOR", side: "RIGHT", gap: "A" },
  { rusher: "de1", move: "SPEED", alignment: "EDGE", side: "RIGHT", gap: "D" },
  { rusher: "lb1", move: "POWER", alignment: "INTERIOR", gap: "A" },
];
const POSITIONS = new Map<string, string>([
  ["dt1", "DT"],
  ["dt2", "NT"],
  ["de1", "DE"],
  ["lb1", "MLB"],
  ["lb2", "OLB"],
]);
const positionOf = (id: string): string | undefined => POSITIONS.get(id);

/** A player with these registry ratings. */
function playerWith(ratings: Readonly<Record<string, number>>, id = "qb"): PlayerState {
  let values = {};
  for (const [name, v] of Object.entries(ratings)) values = setAttr(values, registryAttr(name), v);
  return { bio: { id }, attributes: { kind: "true", values, traits: new Set<string>() } } as unknown as PlayerState;
}

const flat = (v: number): RatingOf => () => v;

// --- M3 -------------------------------------------------------------------------------------------

describe("M3: the credited sacker on constructed sacks", () => {
  it("classes positions: DE and OLB edge, DT and NT interior, MLB and ILB off-ball", () => {
    expect(["DE", "OLB", "DT", "NT", "MLB", "ILB", "CB", "SS", "QB", undefined].map(sackerClassOf)).toEqual(["edge", "edge", "interior", "interior", "offball", "offball", "db", "db", "other", "other"]);
  });

  it("credits the last ARRIVED, splits same-tick arrivals evenly, and reports the first beside", () => {
    const fold = emptyM3Fold();
    // Two arrivals on the sack tick: half each; the last published (de1) takes the unsplit credit.
    foldM3Dropback(fold, one(play({ rush: RUSH }, [tick(0.5), threat("dt1", "INTERIOR", "WON_REP", "TRAVELLING"), tick(2.0), threat("dt1", "INTERIOR", "WON_REP", "ARRIVED"), threat("de1", "EDGE", "WON_REP", "ARRIVED"), result(-7)])), positionOf);
    // An earlier arrival (lb1) and the last one alone on its tick (dt2): dt2 takes the whole sack.
    foldM3Dropback(fold, one(play({ rush: RUSH }, [tick(1.5), threat("lb1", "INTERIOR", "UNBLOCKED", "ARRIVED"), tick(2.0), threat("dt2", "INTERIOR", "STUNT_LOOPER", "ARRIVED"), result(-5)])), positionOf);
    // A sack with no arrival, and a completed throw (no sack).
    foldM3Dropback(fold, one(play({ rush: RUSH }, [tick(3.0), result(-3)])), positionOf);
    foldM3Dropback(fold, one(play({ rush: RUSH }, [tick(2.0), ...throwTo("wr1"), result(8)])), positionOf);
    expect(fold).toMatchObject({ dropbacks: 4, sacks: 3, noArrival: 1, multiSame: 1 });
    expect(fold.unsplit).toEqual({ edge: 1, interior: 1 });
    expect(fold.split).toEqual({ interior: 1.5, edge: 0.5 });
    expect(fold.first).toEqual({ interior: 1, offball: 1 });
    expect(fold.byOrigin).toEqual({ WON_REP: 1, STUNT_LOOPER: 1 });
    expect(fold.splitByPosition).toEqual({ DT: 0.5, DE: 0.5, NT: 1 });
    expect(m3Summary(fold)).toMatchObject({ splitPct: { interior: 75, edge: 25 }, unsplitPct: { edge: 50, interior: 50 }, band: { edge: { min: 45, max: 70 }, interior: { min: 12, max: 32 } } });
  });

  it("splits three same-tick arrivals a third each, so a sack still counts once", () => {
    const fold = emptyM3Fold();
    foldM3Dropback(fold, one(play({ rush: RUSH }, [tick(2.5), threat("dt1", "INTERIOR", "WON_REP", "ARRIVED"), threat("de1", "EDGE", "WON_REP", "ARRIVED"), threat("lb1", "INTERIOR", "UNBLOCKED", "ARRIVED"), result(-6)])), positionOf);
    expect(Object.values(fold.split).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(fold.split["interior"]).toBeCloseTo(1 / 3, 12);
    expect(fold.split["offball"]).toBeCloseTo(1 / 3, 12);
  });

  it("the real side: sack_player_id 1.0, else half sacks 0.5 each, by the season's most common depth-chart position", () => {
    const depth = [
      { format: "weekly", gameType: "REG", season: 2023, gsisId: "A", position: "DE" },
      { format: "weekly", gameType: "REG", season: 2023, gsisId: "A", position: "DE" },
      { format: "weekly", gameType: "REG", season: 2023, gsisId: "A", position: "OLB" },
      { format: "weekly", gameType: "REG", season: 2023, gsisId: "B", position: "NT" },
      { format: "weekly", gameType: "REG", season: 2023, gsisId: "B", position: "DT" },
      { format: "weekly", gameType: "REG", season: 2023, gsisId: "C", position: "ILB" },
      { format: "weekly", gameType: "POST", season: 2023, gsisId: "C", position: "DE" },
      { format: "weekly", gameType: "POST", season: 2023, gsisId: "C", position: "DE" },
    ];
    const index = depthPositionIndex(depth as never);
    expect([index.get("2023|A"), index.get("2023|B"), index.get("2023|C")]).toEqual(["DE", "DT", "ILB"]);
    const row = (over: Record<string, unknown>): Record<string, unknown> => ({
      season: 2023,
      seasonType: "REG",
      qbDropback: true,
      sack: true,
      playDeleted: false,
      abortedPlay: false,
      sackPlayerId: null,
      halfSack1PlayerId: null,
      halfSack2PlayerId: null,
      ...over,
    });
    const pbp = [
      row({ sackPlayerId: "A" }),
      row({ halfSack1PlayerId: "B", halfSack2PlayerId: "C" }),
      row({ sackPlayerId: "Z" }),
      row({ sackPlayerId: "A", seasonType: "POST" }),
      row({ sackPlayerId: "A", qbDropback: false }),
      row({ sackPlayerId: "A", playDeleted: true }),
      row({ sackPlayerId: "A", sack: false }),
    ];
    expect(realSackerMixOf(pbp as never, index)).toEqual({ sacks: 3, credits: { edge: 1, interior: 0.5, offball: 0.5 }, unknownCredits: 1 });
  });
});

// --- M4 -------------------------------------------------------------------------------------------

const channels = (over: Partial<RusherChannels> & { readonly rusher: string }): RusherChannels => ({
  alignment: "INTERIOR",
  position: "DT",
  counter: "CLEAN",
  band: "CLEAN",
  arrival: "CLEAN",
  tta: undefined,
  origin: undefined,
  pressure: 0,
  ...over,
});
const armTick = (t: number, over: Partial<ArmTick>): ArmTick => ({
  tick: t,
  published: "CLEAN",
  status: "CLEAN",
  counter: "CLEAN",
  bandFloor: "CLEAN",
  arrival: "CLEAN",
  minTta: undefined,
  liveThreats: 0,
  rushers: [],
  ...over,
});

describe("M4: TM's cause rule on constructed ticks", () => {
  const first = armTick(1.0, {
    published: "PRESSURE",
    status: "PRESSURE",
    liveThreats: 2,
    rushers: [
      channels({ rusher: "lb1", arrival: "PRESSURE", origin: "UNBLOCKED", band: "PRESSURE", tta: 1.0 }),
      channels({ rusher: "dt1", band: "PRESSURE", counter: "PRESSURE" }),
      channels({ rusher: "dt2", counter: "PRESSURE" }),
      channels({ rusher: "de1", alignment: "EDGE", arrival: "CLEAN", tta: 2.5, origin: "WON_REP" }),
    ],
  });

  it("names an arrival by its origin, else the band, else the counter; a man below the status is no cause", () => {
    expect(causesOf(first, T)).toEqual([
      { rusher: "lb1", kind: "UNBLOCKED" },
      { rusher: "dt1", kind: "BAND" },
      { rusher: "dt2", kind: "COUNTER" },
    ]);
  });

  it("folds the first non-clean tick only, splitting its 1 evenly, with the naive rule beside", () => {
    const later = armTick(1.5, { published: "COLLAPSING", status: "COLLAPSING", rushers: [channels({ rusher: "dt1", counter: "COLLAPSING" })] });
    const ticks = [armTick(0.5, {}), first, later];
    expect(firstNonClean(ticks)).toBe(first);
    const fold = emptyM4Fold();
    const approach: Record<string, string> = { lb1: "FREE", dt1: "THROUGH", dt2: "PUSH" };
    foldM4Ticks(fold, ticks, (r) => approach[r] ?? "UNLABELLED", T);
    foldM4Ticks(fold, [armTick(0.5, {})], () => "X", T);
    foldM4Ticks(fold, [armTick(0.5, { published: "PRESSURE", status: "PRESSURE", rushers: [] })], () => "X", T);
    expect(fold).toMatchObject({ dropbacks: 3, nonClean: 2, multiCause: 1, noCause: 1, naiveMulti: 1, statusChecks: 5, statusMismatches: 0 });
    expect(fold.byKind["UNBLOCKED"]).toBeCloseTo(1 / 3, 12);
    expect(fold.byApproachKind["PUSH/COUNTER"]).toBeCloseTo(1 / 3, 12);
    expect(m4Summary(fold)).toMatchObject({ firstNonClean: 2, multiCause: 1, multiCauseSharePct: 50, naiveMultiSharePct: 50 });
  });
});

// --- M6 -------------------------------------------------------------------------------------------

describe("M6: today's pocket-movement pick, restated", () => {
  it("urgency is 0 with nothing travelling and 3 at contact, by half-ticks inside 1.5 s", () => {
    expect([undefined, 2.0, 1.5, 1.0, 0.5, 0, -0.5].map((m) => urgencyOf(T, m))).toEqual([0, 0, 0, 1, 2, 3, 3]);
  });

  it("an appeal is base + sum round((rating - 70) / divisor) + perUrgencyStep x urgency", () => {
    const a = T.pocketMovement.appeal;
    expect(appealOf(T, a.standIn, flat(70), 3)).toBe(35 - 18);
    expect(appealOf(T, a.throwaway, flat(70), 3)).toBe(25 + 24);
    const r: RatingOf = (n) => ({ poise: 81, pocketPatience: 60 })[n as "poise"] ?? 70;
    // 35 + round(5.5) + round(-5) - 6 x 1 = 35 + 6 - 5 - 6.
    expect(appealOf(T, a.standIn, r, 1)).toBe(30);
  });

  it("drops the climb against an interior threat and after two climbs, pays escape +20 for it, and gates the throwaway at 2.0 s", () => {
    const base = { ratingOf: flat(70), minTta: 1.0, stepUpsUsed: 0, throwawayAvailable: true };
    const open = rankedResponsesOf(T, { ...base, threatAlignments: ["EDGE"] });
    expect(open.urgency).toBe(1);
    expect(open.ranked).toEqual([
      { response: "STEP_UP", appeal: 53 },
      { response: "THROWAWAY", appeal: 33 },
      { response: "STAND_IN", appeal: 29 },
      { response: "ESCAPE", appeal: 10 },
    ]);
    const shut = rankedResponsesOf(T, { ...base, threatAlignments: ["INTERIOR"] });
    expect(shut.ranked.map((r) => r.response)).toEqual(["THROWAWAY", "ESCAPE", "STAND_IN"]);
    expect(shut.ranked.find((r) => r.response === "ESCAPE")?.appeal).toBe(30);
    expect(rankedResponsesOf(T, { ...base, threatAlignments: [], stepUpsUsed: 2 }).ranked.some((r) => r.response === "STEP_UP")).toBe(false);
    expect(rankedResponsesOf(T, { ...base, threatAlignments: [], throwawayAvailable: false }).ranked.some((r) => r.response === "THROWAWAY")).toBe(false);
  });

  it("keeps declaration order on a tie (stand in, escape, throwaway)", () => {
    // Nothing travelling (urgency 0), an interior threat (no climb): stand in 35 - 5 - 5, escape
    // 5 + 0 + 0 + 20 and throwaway 25 + 0 + 0 all score 25.
    const r: RatingOf = (n) => ({ poise: 60, pocketPatience: 60 })[n as "poise"] ?? 70;
    const ranked = rankedResponsesOf(T, { ratingOf: r, minTta: undefined, threatAlignments: ["INTERIOR"], stepUpsUsed: 0, throwawayAvailable: true });
    expect(ranked).toEqual({
      urgency: 0,
      ranked: [
        { response: "STAND_IN", appeal: 25 },
        { response: "ESCAPE", appeal: 25 },
        { response: "THROWAWAY", appeal: 25 },
      ],
    });
  });

  it("bands the margin SOUND / RUSHED / PANICKED and clamps the rank to the pool", () => {
    expect([0, 25, -1, -20, -21, -90].map((m) => movementBandOf(T, m).label)).toEqual(["SOUND", "SOUND", "RUSHED", "RUSHED", "PANICKED", "PANICKED"]);
    const pool = [
      { response: "THROWAWAY" as const, appeal: 49 },
      { response: "STAND_IN" as const, appeal: 17 },
    ];
    expect([0, 1, 2].map((r) => pickOf(pool, r))).toEqual(["THROWAWAY", "STAND_IN", "STAND_IN"]);
  });

  it("gives the die's exact chances over its 100 faces (poise/5 + awareness/5 against 50)", () => {
    // 70/70: +28, margin = face - 22: SOUND on 22-100 (79), RUSHED on 2-21 (20), PANICKED on 1.
    const c = rankChances(T, flat(70));
    expect([c.get(0), c.get(1), c.get(2)].map((x) => Number((x ?? 0).toFixed(10)))).toEqual([0.79, 0.2, 0.01]);
  });
});

describe("M6: contact on constructed arrivals", () => {
  it("prices contact at urgency 3: FIGHT as today's stand-in, THROWAWAY as today's throwaway", () => {
    const p = priceContact(T, flat(70), true);
    expect(p).toMatchObject({ offered: true, fightAppeal: 17, throwawayAppeal: 49, prefersThrowaway: true });
    expect(p.pThrowaway).toBeCloseTo(0.79, 12);
    expect(priceContact(T, flat(70), false)).toMatchObject({ offered: false, prefersThrowaway: false, pThrowaway: 0 });
    // A poised, patient, careless passer: FIGHT ranks first; THROWAWAY only on a RUSHED or PANICKED die.
    const r: RatingOf = (n) => ({ poise: 99, pocketPatience: 99, decisionMaking: 10, awareness: 10 })[n as "poise"] ?? 70;
    const q = priceContact(T, r, true);
    expect(q).toMatchObject({ fightAppeal: 35 + 15 + 15 - 18, throwawayAppeal: 25 - 20 - 15 + 24, prefersThrowaway: false });
    // poise/5 20 + awareness/5 2: margin = face - 28; SOUND on 28-100 (FIGHT), the 27 others THROWAWAY.
    expect(q.pThrowaway).toBeCloseTo(0.27, 12);
    expect(chanceOfResponse(T, [{ response: "STAND_IN", appeal: 47 }, { response: "THROWAWAY", appeal: 14 }], r, "STAND_IN")).toBeCloseTo(0.73, 12);
  });

  const labelFor = (rusher: string, origin: string, alignment = "INTERIOR", band?: string): ThreatApproach => {
    const facts = { threat: true, origin, alignment, move: "POWER", penetrator: false, latentMargin: 20, ...(band === undefined ? {} : { band }) } as never;
    return { rusher, facts, label: approachOf(facts) };
  };
  const players = new Map([["qb", playerWith({ poise: 70, pocketPatience: 70, decisionMaking: 70, awareness: 70 })]]);

  it("finds the broken receiver by his latest route phase at the tick", () => {
    const d = one(play({ rush: RUSH }, [tick(1.0), route("wr1", "DEVELOPING"), tick(2.0), route("wr1", "OPEN"), tick(2.5), route("wr1", "DECAYING"), result(-7)]));
    expect([brokenReceiverAt(d, 1.5), brokenReceiverAt(d, 2.0), brokenReceiverAt(d, 2.5)]).toEqual([false, true, true]);
  });

  it("counts no-target arrivals, the upper bound, the free-run clock and caught escapes apart", () => {
    const fold = emptyM6Fold();
    // 1: a won rep arrives with a receiver broken: inside the bound, THROWAWAY offered.
    const d1 = one(play({ rush: RUSH, down: 3 }, [tick(1.0), route("wr1", "JAMMED"), tick(2.0), route("wr1", "OPEN"), threat("dt1", "INTERIOR", "WON_REP", "ARRIVED"), result(-7)]));
    expect(contactOf(d1, T)).toMatchObject({ kind: "NO_TARGET_ARRIVAL", tick: 2.0, rusher: "dt1", sameTickArrivals: 1, brokenReceiver: true, down: 3 });
    foldM6Contact(fold, d1, new Map([["dt1", labelFor("dt1", "WON_REP")]]), players, T);
    // 2: an unblocked man arrives with a receiver broken: inside the bound, on the free-run clock, nothing offered.
    const d2 = one(play({ rush: RUSH }, [tick(1.5), route("wr1", "OPEN"), threat("lb1", "INTERIOR", "UNBLOCKED", "ARRIVED"), result(-6)]));
    foldM6Contact(fold, d2, new Map([["lb1", labelFor("lb1", "UNBLOCKED")]]), players, T);
    // 3: an arrival before any break: outside the bound.
    const d3 = one(play({ rush: RUSH }, [tick(1.0), route("wr1", "DEVELOPING"), threat("dt2", "INTERIOR", "WON_REP", "ARRIVED"), result(-4)]));
    foldM6Contact(fold, d3, new Map(), players, T);
    // 4: caught from behind on the escape roll.
    const d4 = one(play({ rush: RUSH }, [tick(2.5), route("wr1", "OPEN"), check("scramble", "CAUGHT_FROM_BEHIND", ["qb"], -30), result(-8)]));
    expect(contactOf(d4, T)?.kind).toBe("CAUGHT_ESCAPE");
    foldM6Contact(fold, d4, new Map(), players, T);
    // 5: a throw: no contact.
    foldM6Contact(fold, one(play({ rush: RUSH }, [tick(2.0), ...throwTo("wr1"), result(9)])), new Map(), players, T);
    expect(fold).toMatchObject({ dropbacks: 5, sacks: 4, noTargetArrivals: 3, caughtEscapes: 1, sacksWithoutArrival: 0, upperBound: 2, freeRunClock: 1 });
    expect(fold.upperBoundByApproach).toEqual({ THROUGH: 1, FREE: 1 });
    expect(fold.upperBoundByDown).toEqual({ "3": 1, "1": 1 });
    expect(fold.branch).toMatchObject({ contacts: 2, offered: 1, prefersThrowaway: 1 });
    expect(fold.branch.expectedThrowaway).toBeCloseTo(0.79, 12);
    expect(fold.appealGap).toEqual({ "32": 1 });
    expect(m6Summary(fold)).toMatchObject({ upperBound: 2, branch: { contacts: 2, offered: 1, throwawayPctOfContacts: 39.5, fightPctOfContacts: 60.5 } });
  });
});

// --- M7 -------------------------------------------------------------------------------------------

describe("M7: sight's closed form at fixed ratings", () => {
  it("is awareness/5 rounded, plus 10 with the trait", () => {
    expect(senseModifier({ awareness: 72, trait: false })).toBe(14);
    expect(senseModifier({ awareness: 73, trait: true })).toBe(25);
  });

  it("is EARLY at 0 or more, LATE to -30, NEVER below", () => {
    expect([0, -1, -30, -31].map(sightOf)).toEqual(["EARLY", "LATE", "LATE", "NEVER"]);
  });

  it("gives the exact shares over the 100 faces by from-class (FRONT +20, SIDE 0, BEHIND -30)", () => {
    expect(sightShares(14, "FRONT", 50)).toEqual({ EARLY: 0.85, LATE: 0.15, NEVER: 0 });
    expect(sightShares(14, "SIDE", 50)).toEqual({ EARLY: 0.65, LATE: 0.3, NEVER: 0.05 });
    expect(sightShares(14, "BEHIND", 50)).toEqual({ EARLY: 0.35, LATE: 0.3, NEVER: 0.35 });
  });

  it("picks the target whose FRONT+SIDE EARLY share is nearest 0.90, with the 0.85-0.95 band", () => {
    const fold: M7Fold = { ...emptyM7Fold(), byThreat: { FRONT: new Map([[14, 1]]), SIDE: new Map([[14, 1]]), BEHIND: new Map() } };
    // FRONT is all EARLY to target 35, SIDE is (115 - t)/100: 0.90 exactly at 35; 0.95 at 25; 0.85 at 40.
    expect(frontSideEarly(fold, 35)).toBeCloseTo(0.9, 12);
    expect(m7Target(fold)).toEqual({ target: 35, early: frontSideEarly(fold, 35), band: { lo: 25, hi: 40 } });
    expect(m7Summary(fold)).toMatchObject({ target: 35, rollingThreats: { FRONT: 1, SIDE: 1, BEHIND: 0 } });
  });
});

// --- M8 -------------------------------------------------------------------------------------------

describe("M8: a constructed play's free runners", () => {
  const drop = dropOfCall("Stick");
  const dtTime = legacyFreeRunSeconds(T, { origin: "UNBLOCKED", alignment: "INTERIOR", position: "DT" });
  const lbTime = legacyFreeRunSeconds(T, { origin: "UNBLOCKED", alignment: "INTERIOR", position: "MLB" });
  const olbTime = legacyFreeRunSeconds(T, { origin: "PICKUP_LOST", alignment: "EDGE", position: "OLB", band: "RAN_THROUGH" });
  const rush = [...RUSH, { rusher: "lb2", move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "D" }];
  const d = one(
    play({ rush, call: "Stick" }, [
      check("blitz_pickup", "RAN_THROUGH", ["rb", "lb2"], -5, "pickup/lb2"),
      threat("dt1", "INTERIOR", "UNBLOCKED", "TRAVELLING", dtTime, "free/dt1"),
      threat("lb1", "INTERIOR", "UNBLOCKED", "TRAVELLING", lbTime, "free/lb1"),
      threat("lb2", "EDGE", "PICKUP_LOST", "TRAVELLING", olbTime, "pickup/lb2"),
      tick(0.5),
      ...throwTo("wr1"),
      result(5),
    ]),
  );
  const positions = new Map<PlayerId, Position>([...POSITIONS].map(([k, v]) => [k as PlayerId, v as Position]));
  const players = new Map([
    ["dt1", playerWith({ speed: 38, acceleration: 36 }, "dt1")],
    ["lb1", playerWith({ speed: 65, acceleration: 65 }, "lb1")],
    ["lb2", playerWith({ speed: 70, acceleration: 70 }, "lb2")],
  ]);
  const ctx = { tunables: T, positions, players };

  it("Wait: the down lineman runs the free-run clock from his gap; the backer keeps today's; a touched man is TOUCHED", () => {
    const runners = m8RunnersOf(d, ctx, "WAIT");
    const dt = freeRunTime({ spot: { depth: 1.0, width: 2.25 }, drop, edge: false, ratings: { speed: 38, acceleration: 36 }, delayed: false, moving: false }).eta;
    expect(runners.map((r) => [r.rusher, r.row, r.eta, r.today, r.published])).toEqual([
      ["dt1", "DOWN_LINEMAN", dt, dtTime, dtTime],
      ["lb1", "TODAY", lbTime, lbTime, lbTime],
      ["lb2", "TOUCHED", olbTime, olbTime, olbTime],
    ]);
  });

  it("Table now (information only): the A-gap backer walks up to 2.5 yards", () => {
    const lb = m8RunnersOf(d, ctx, "TABLE_NOW").find((r) => r.rusher === "lb1");
    const t = freeRunTime({ spot: { depth: TABLE_NOW.linebackerWalkedUp.depth, width: 0.75 }, drop, edge: false, ratings: { speed: 65, acceleration: 65 }, delayed: false, moving: false }).eta;
    expect(lb).toMatchObject({ row: "LB_WALKED_UP", eta: t, today: lbTime });
  });
});

// --- M9 -------------------------------------------------------------------------------------------

describe("M9: windows and counts on constructed clocks", () => {
  it("windows the last 120 s of Q1 and Q3 apart from Q2 and Q4, the rest and overtime", () => {
    expect([
      [1, 120],
      [1, 121],
      [3, 0],
      [2, 120],
      [4, 30],
      [2, 600],
      [5, 100],
    ].map(([p, c]) => windowOf(p as number, c as number))).toEqual(["Q1Q3_END", "REST", "Q1Q3_END", "Q2Q4_END", "Q2Q4_END", "REST", "OVERTIME"]);
  });

  it("reads the snap's published clock, counts snaps, dropbacks, throwaways and releases, and checks the rebuild", () => {
    const g = (event: Ev): MatchEventEnvelope => env(undefined, event);
    const run = (playId: string, clockSeconds: number): readonly MatchEventEnvelope[] => [
      env(playId, { type: "PLAY_START", payload: { kind: "RUN_PLAY_V1", situation: { down: 1, distance: 10, ballOn: 30, clockSeconds } } }),
      env(playId, result(4)),
    ];
    const pass = (clockSeconds: number, events: readonly Ev[]): readonly MatchEventEnvelope[] => play({ rush: RUSH, clockSeconds }, events);
    const events = [
      g({ type: "PERIOD_START", payload: { period: 1, clockSeconds: 900 } }),
      g({ type: "DRIVE_START", payload: { driveNumber: 1, offense: "OFF", defense: "DEF", period: 1, clockSeconds: 900, startYardLine: 25, cause: "KICKOFF" } }),
      ...run("g:r1", 900),
      ...pass(860, [tick(2.5), ...throwTo("wr1"), result(7)]),
      ...pass(118, [tick(2.0), { type: "THROWAWAY", payload: { cause: "PRESSURE" } }, result(0)]),
      g({ type: "PERIOD_START", payload: { period: 2, clockSeconds: 900 } }),
      ...pass(100, [tick(3.0), ...throwTo("wr1"), result(12)]),
      ...pass(90, [tick(1.5), result(-6)]),
    ];
    const game = m9GameOf(events);
    expect(game.windows.REST).toEqual({ snaps: 2, dropbacks: 1, throwaways: 0, attempts: 1, releaseSum: 2.5 });
    expect(game.windows.Q1Q3_END).toEqual({ snaps: 1, dropbacks: 1, throwaways: 1, attempts: 1, releaseSum: 2.0 });
    expect(game.windows.Q2Q4_END).toEqual({ snaps: 2, dropbacks: 2, throwaways: 0, attempts: 1, releaseSum: 3.0 });
    // The rebuild (900 less each PLAY_RESULT's 6 s) equals the snap clock only on the first snap and
    // the drive start; it runs ahead (more time left) everywhere else, never below.
    expect(game.clockCheck).toEqual({ snaps: 5, snapsEqual: 1, snapsRebuiltBelow: 0, drives: 1, drivesEqual: 1, drivesRebuiltBelow: 0, snapsWithoutClock: 0 });
    const table = m9Table(new Map([[1, [game, game]]])) as { rows: Record<string, Record<string, { sets: { value: number; se: number; n: number }[]; tolerance: number }>> };
    expect(table.rows["pass_rate"]?.["Q2Q4_END"]?.sets[0]).toMatchObject({ value: 1, n: 4 });
    expect(table.rows["throwaway_rate"]?.["Q1Q3_END"]?.sets[0]?.value).toBe(1);
    expect(table.rows["time_to_throw"]?.["REST"]?.sets[0]?.se).toBeCloseTo(0, 12);
  });
});

// --- always on: golden games -----------------------------------------------------------------------

describe("M4, M6, M7 and M8 against the stream on golden games (always on)", () => {
  for (const league of ["gen", "flat"] as const) {
    it(`${league}: M4's statuses and causes, M6's restated pick, M8's restated times`, () => {
      const m4 = emptyM4Fold();
      const m6 = emptyM6Fold();
      const m7 = emptyM7Fold();
      const m8 = emptyM8Fold();
      goldenGames(
        league,
        (o, snap, meta) => {
          const pos = positionsFromSnapshot(snap);
          foldM4Game(m4, o.events, T, pos, meta.seed);
          foldM6Game(m6, o.events, snap, pos, T, meta.seed);
          foldM7Game(m7, o.events, snap);
          foldM8Game(m8, o.events, snap, pos, T);
        },
        { first: 5 },
      );
      expect(m4.nonClean).toBeGreaterThan(50);
      expect({ statusMismatches: m4.statusMismatches, noCause: m4.noCause }).toEqual({ statusMismatches: 0, noCause: 0 });
      expect(m6.movementChecks).toBeGreaterThan(20);
      expect({ band: m6.bandMismatches, pick: m6.pickMismatches, unread: m6.unreadChecks, examples: m6.mismatchExamples }).toEqual({ band: 0, pick: 0, unread: 0, examples: [] });
      expect(m8.runners).toBeGreaterThan(0);
      expect(m8.publishedMismatches).toBe(0);
      const s7 = m7Summary(m7) as { rollingThreats: { FRONT: number; SIDE: number; BEHIND: number }; target: number };
      expect(s7.rollingThreats.FRONT + s7.rollingThreats.SIDE).toBeGreaterThan(0);
      expect(s7.rollingThreats.BEHIND).toBe(0);
    }, 120_000);
  }
});

// --- gated: the (b) checks on gen seed set 1 --------------------------------------------------------

describe.skipIf(!BASE)("the (b) checks on gen seed set 1 (FF_POCKET_BASE=1)", () => {
  const rows = emptyRowsFold();
  const m4 = emptyM4Fold();
  const m6 = emptyM6Fold();
  beforeAll(() => {
    genSeason(1, (o, snap, meta) => {
      const pos = positionsFromSnapshot(snap);
      foldRowsGame(rows, o.events, T, pos);
      foldM4Game(m4, o.events, T, pos, meta.seed);
      foldM6Game(m6, o.events, snap, pos, T, meta.seed);
    });
  }, 900_000);

  it("M3: split 86.90 / 8.64 / 4.43, unsplit interior 82.51, 1,110 same-tick sacks of 4,308 (two/model.md:96-106)", () => {
    const s = m3Summary(rows.m3) as { splitPct: Record<string, number>; unsplitPct: Record<string, number>; multiSame: number; sacks: number };
    expect([s.splitPct["interior"], s.splitPct["edge"], s.splitPct["offball"]]).toEqual([86.9, 8.64, 4.43]);
    expect(s.unsplitPct["interior"]).toBe(82.51);
    expect([s.multiSame, s.sacks]).toEqual([1110, 4308]);
  });

  it("M4: 6,395 of 21,962 first non-clean ticks have two causes or more (29.1%); naive 7,967 printed beside", () => {
    expect([m4.multiCause, m4.nonClean, m4.naiveMulti, m4.statusMismatches, m4.noCause]).toEqual([6395, 21962, 7967, 0, 0]);
  });

  it("rows: throws after an escape, 24.0% complete at 17.1% INT on 421 aimed (CP §3.1, rev/clean-pocket.md:173; plan §6.4)", () => {
    const c = rows.byClass.ON_THE_RUN;
    const got = { aimed: c.aimed, completion: ((100 * c.completions) / c.aimed).toFixed(1), int: ((100 * c.interceptions) / c.aimed).toFixed(1) };
    process.stdout.write(`ADR-089 (b) gen throws after an escape: ${JSON.stringify(got)} against {"aimed":421,"completion":"24.0","int":"17.1"}\n`);
    expect(got).toEqual({ aimed: 421, completion: "24.0", int: "17.1" });
  });

  it("M6: the restated pick equals every stream pocket_movement CHECK, and every caught escape is counted", () => {
    expect({ band: m6.bandMismatches, pick: m6.pickMismatches, unread: m6.unreadChecks }).toEqual({ band: 0, pick: 0, unread: 0 });
    expect(m6.movementChecks).toBeGreaterThan(1000);
    expect(m6.caughtEscapes).toBe(692);
  });
});

// --- the command -----------------------------------------------------------------------------------

describe("the pocket command's arguments", () => {
  it("takes --step 0 and resolves its paths from the working directory", () => {
    expect(parsePocketArgs(["--", "--step", "0"], "/pkg")).toEqual({ step: 0 });
    expect(parsePocketArgs(["--step", "0", "--write-filed", "reports/adr-089-step0.filed.json", "--out", "/abs/out.json"], "/pkg")).toEqual({
      step: 0,
      writeFiled: "/pkg/reports/adr-089-step0.filed.json",
      out: "/abs/out.json",
    });
  });

  it("takes --step 1 with its flags, its paths resolved from the working directory (the package under pnpm)", () => {
    expect(parsePocketArgs(["--", "--step", "1"], "/pkg")).toEqual({ step: 1 });
    expect(parsePocketArgs(["--step", "1", "--report", "reports/x.md"], "/pkg")).toEqual({ step: 1, report: "/pkg/reports/x.md" });
    expect(
      parsePocketArgs(["--step", "1", "--arms", "A3,A0", "--shard", "2/3", "--cache", "scratch/c", "--seed-set", "2", "--out", "/abs/m.json"], "/pkg"),
    ).toEqual({ step: 1, arms: ["A3", "A0"], shard: { index: 2, count: 3 }, cache: "/pkg/scratch/c", seedSet: 2, out: "/abs/m.json" });
    expect(parsePocketArgs(["--step", "1", "--digests", "--out", "d1.json"], "/pkg")).toEqual({ step: 1, digests: true, out: "/pkg/d1.json" });
    expect(parsePocketArgs(["--step", "1", "--arms", "A0b,A15"], "/pkg")).toEqual({ step: 1, arms: ["A0b", "A15"] });
  });

  it("refuses step 1's bad values and the other step's flags", () => {
    expect(() => parsePocketArgs(["--step", "1", "--arms", "A1,A99"])).toThrow(/A99 is not an arm/);
    expect(() => parsePocketArgs(["--step", "1", "--arms", "A1,,A2"])).toThrow(/an empty arm is not an arm/);
    expect(() => parsePocketArgs(["--step", "1", "--arms", "A1,A1"])).toThrow(/names an arm twice/);
    for (const bad of ["0/3", "4/3", "1/0", "x", "1/2/3", "-1/2", "1.5/3"]) expect(() => parsePocketArgs(["--step", "1", "--shard", bad]), bad).toThrow(/--shard takes i\/n/);
    expect(() => parsePocketArgs(["--step", "1", "--seed-set", "3", "--arms", "A1"])).toThrow(/--seed-set takes 1 or 2/);
    expect(() => parsePocketArgs(["--step", "1", "--seed-set", "2"])).toThrow(/--seed-set re-plays named arms/);
    expect(() => parsePocketArgs(["--step", "1", "--digests"])).toThrow(/--digests writes its folds to --out/);
    expect(() => parsePocketArgs(["--step", "1", "--digests", "--arms", "A1", "--out", "x.json"])).toThrow(/takes --out and nothing else \(not --arms\)/);
    expect(() => parsePocketArgs(["--step", "1", "--write-filed", "f.json"])).toThrow(/--write-filed: step 0's flag/);
    expect(() => parsePocketArgs(["--step", "0", "--arms", "A1"])).toThrow(/--arms: step 1's and step 2's flags, not step 0's/);
    expect(() => parsePocketArgs(["--report", "r.md", "--step", "0"])).toThrow(/--report: step 1's and step 2's flags, not step 0's/);
    expect(() => parsePocketArgs(["--step", "1", "--m2"])).toThrow(/--m2: step 2's flag, not step 1's/);
    expect(() => parsePocketArgs(["--step", "0", "--m2"])).toThrow(/--m2: step 2's flag, not step 0's/);
    // Step 1's --arms is step 1's list: a step-2 arm is not one of it.
    expect(() => parsePocketArgs(["--step", "1", "--arms", "A1,B3"])).toThrow(/--arms: B3 is not an arm \(A0 to A15, A0b\)/);
    expect(() => parsePocketArgs(["--arms", "B1", "--step", "1"])).toThrow(/--arms: B1 is not an arm \(A0 to A15, A0b\)/);
  });

  it("takes --step 2 with its flags; --arms takes step 2's run list only (C2-F4), whatever order the flags come in", () => {
    expect(parsePocketArgs(["--", "--step", "2"], "/pkg")).toEqual({ step: 2 });
    expect(
      parsePocketArgs(["--step", "2", "--arms", "B3,A1", "--shard", "1/3", "--cache", "scratch/c", "--seed-set", "1", "--report", "r.md", "--out", "/abs/m.json"], "/pkg"),
    ).toEqual({ step: 2, arms: ["B3", "A1"], shard: { index: 1, count: 3 }, cache: "/pkg/scratch/c", seedSet: 1, report: "/pkg/r.md", out: "/abs/m.json" });
    expect(parsePocketArgs(["--arms", "A0,A14,A1,A5,A11,B1,B2,B3,B4,B5,B6,B7", "--step", "2"], "/pkg")).toEqual({
      step: 2,
      arms: ["A0", "A14", "A1", "A5", "A11", "B1", "B2", "B3", "B4", "B5", "B6", "B7"],
    });
    // Step 2's --seed-set plays the run (or the arms named) on one set: no --arms needed.
    expect(parsePocketArgs(["--step", "2", "--seed-set", "2"], "/pkg")).toEqual({ step: 2, seedSet: 2 });
    expect(parsePocketArgs(["--step", "2", "--digests", "--out", "d1.json"], "/pkg")).toEqual({ step: 2, digests: true, out: "/pkg/d1.json" });
    expect(parsePocketArgs(["--step", "2", "--m2"], "/pkg")).toEqual({ step: 2, m2: true });
    expect(parsePocketArgs(["--step", "2", "--m2", "--arms", "A1,B4", "--cache", "c", "--seed-set", "2"], "/pkg")).toEqual({
      step: 2,
      m2: true,
      arms: ["A1", "B4"],
      cache: "/pkg/c",
      seedSet: 2,
    });
  });

  it("refuses step 2's bad values and the other steps' flags", () => {
    for (const bad of ["A2", "A3", "A15", "A0b", "B8", "B0", "b1"]) {
      expect(() => parsePocketArgs(["--step", "2", "--arms", `A1,${bad}`]), bad).toThrow(new RegExp(`--arms: ${bad} is not an arm \\(step 2's: A0, A14, A1, A5, A11, B1 to B7\\)`));
    }
    expect(() => parsePocketArgs(["--arms", "A2", "--step", "2"])).toThrow(/--arms: A2 is not an arm \(step 2's/);
    expect(() => parsePocketArgs(["--step", "2", "--arms", "B1,,B2"])).toThrow(/an empty arm is not an arm/);
    expect(() => parsePocketArgs(["--step", "2", "--arms", "B1,B1"])).toThrow(/names an arm twice/);
    expect(() => parsePocketArgs(["--step", "2", "--shard", "4/3"])).toThrow(/--shard takes i\/n/);
    expect(() => parsePocketArgs(["--step", "2", "--seed-set", "0"])).toThrow(/--seed-set takes 1 or 2/);
    expect(() => parsePocketArgs(["--step", "2", "--write-filed", "f.json"])).toThrow(/--write-filed: step 0's flag, not step 2's/);
    expect(() => parsePocketArgs(["--step", "2", "--digests"])).toThrow(/--digests writes its folds to --out/);
    expect(() => parsePocketArgs(["--step", "2", "--digests", "--arms", "A1", "--m2", "--out", "x.json"])).toThrow(/takes --out and nothing else \(not --arms, --m2\)/);
    expect(() => parsePocketArgs(["--step", "2", "--m2", "--shard", "1/2", "--report", "r.md", "--out", "o.json"])).toThrow(
      /--m2 prints M2's section only; it takes --arms, --cache and --seed-set \(not --shard, --report, --out\)/,
    );
    expect(() => parsePocketArgs(["--step", "2", "--seed", "x"])).toThrow(/unknown argument --seed \(pocket -- --step 2/);
  });

  it("refuses another step, a missing step, a flag with no value and an unknown flag", () => {
    expect(() => parsePocketArgs(["--step", "3"])).toThrow(/steps 0, 1 and 2 are built.*--step 3 is not/);
    expect(() => parsePocketArgs(["--step", "01"])).toThrow(/--step 01 is not/);
    expect(() => parsePocketArgs([])).toThrow(/--step is required/);
    expect(() => parsePocketArgs(["--step", "0", "--out"])).toThrow(/requires a value/);
    expect(() => parsePocketArgs(["--step", "0", "--out", "--step"])).toThrow(/requires a value/);
    expect(() => parsePocketArgs(["--step", "0", "--seed", "x"])).toThrow(/unknown argument --seed/);
  });
});

/** A complete filing as S4 writes it: the M block and the M1 bound pending, a clause and a base row pending too. */
function filing(): FiledFile {
  return validateFiled(
    JSON.parse(
      JSON.stringify({
        format: FILED_FORMAT,
        adr: "ADR-089",
        step: 0,
        base: { commit: "e23bf69", caller: "v7", corpora: CORPORA, golden: { note: "constructed" }, rows: { hit_or_sack_rate: { pending: "BASE" } } },
        prediction: { a: [{ id: "a.1", text: "digests unchanged" }], b: [{ id: "b.1", text: "M4's 6,395 of 21,962", construct: "M4" }], c: [{ id: "c.1", text: "legacy restatement" }] },
        selectionRule: {
          adrLines: [422],
          grids: { S: { theta: [7, 8, 9, 10, 11, 12, 13, 14, 15], k: 2, beta: 0.5, pushWindow: true }, L: { R: [4, 5, 6, 7, 8] } },
          freeRunClock: "WAIT",
          loss: { curve: "hit_rate_by_release_bin" },
          separation: { rule: "2 max spread" },
          fallback: { id: "D1" },
        },
        fittingOrder: { adrLine: 1128, steps: ["5a"], maxPasses: 2, ownerReturn: "to the owner" },
        bands: {
          clauses: [{ id: "s1.window", step: "1", row: "pressure", comparator: "M1", kind: "graded", adrLine: 1005, text: "at most B1", hi: { pending: "M1", note: "B1 in points" } }],
          clauseLines: [1005],
        },
        fiveB: { adrLine: 1063, rows: { sack_rate: { acceptance: [5.58, 7.54], contributions: [{ step: "1", value: 0.65 }], derived: [3.94, 5.9], filed: [3.9, 5.9], fullInterval: [2.34, 7.5] } } },
        m1Bound: {
          definition: "B1 = E + 3*SD",
          E: { pending: "M1" },
          SD: { pending: "M1" },
          B1: { pending: "M1" },
          H: { pending: "M1" },
          dropbacks: { pending: "M1" },
          margins1to4: { pending: "M1" },
          margins5to14: { pending: "M1" },
          uses: [
            { step: "1", adrLine: 1005, text: "the window's falsifier" },
            { step: "1", adrLine: 1007, text: "the S band's raised pressure edge" },
            { step: "5b", adrLine: 1063, text: "5b's raised pressure edge" },
          ],
        },
        step3Check: { adrLines: [1025], part1: "M8's function", part2: "the real rows" },
        constants: Object.fromEntries(FILED_CONSTANT_NAMES.map((name) => [name, { value: 0, adrLine: 578 }])),
        rules: {
          arrivalReading: { adrLine: 698, text: "D21" },
          lCrossingTime: { adrLine: 425, text: "T_L" },
          lateBlock: { adrLine: 546, text: "both shapes" },
          missRule: { adrLine: 1172, text: "D31", classes: ["i"], options: ["A"], neverMoves: ["the constants"] },
          bGrid: { adrLine: 669, text: "b", values: [0] },
          runMargin: { adrLine: 727, text: "RUN", delta: 10, urgency: [0, 3] },
          unblockedBands: { adrLine: 1172, text: "14 and 40", per100DropbacksMax: 14, shareOfHitOrSackMax: 40 },
        },
        M: Object.fromEntries(M_IDS.map((m) => [m, m === "M9" ? { filedEarlier: true } : { pending: m }])),
        census: { pathDigest: "fnv1a:365da48d", tunablesDigest: "fnv1a:395a9ae2" },
        context: { sLateArm: { adrLine: 991, text: "context only", seedSet: 2, runAtStep: "1" } },
      }),
    ),
  );
}

describe("the filing fill (--write-filed)", () => {
  const result = {
    M: Object.fromEntries(M_IDS.map((m) => [m, { table: m }])) as never,
    m1Bound: { E: 10.5, SD: 3, B1: 19.5, H: 400, dropbacks: 20000, margins1to4: { E: 1 }, margins5to14: { E: 9.5 } },
  };

  it("fills only the pending M.<id> and m1Bound.* markers, never a filed value, and lists what it leaves", () => {
    const out = fillStep0(filing(), result);
    expect(out.filled).toEqual(["m1Bound.E", "m1Bound.SD", "m1Bound.B1", "m1Bound.H", "m1Bound.dropbacks", "m1Bound.margins1to4", "m1Bound.margins5to14", "M.M1", "M.M2", "M.M3", "M.M4", "M.M5", "M.M6", "M.M7", "M.M8"]);
    expect(out.left).toEqual(["base.rows.hit_or_sack_rate (pending BASE)", "bands.clauses.0.hi (pending M1)"]);
    expect(out.file.M.M3).toEqual({ table: "M3" });
    expect(out.file.M.M9).toEqual({ filedEarlier: true });
    expect(out.file.m1Bound).toMatchObject({ E: 10.5, SD: 3, B1: 19.5, H: 400, dropbacks: 20000, margins1to4: { E: 1 } });
    expect(pendingPaths(out.file).map((p) => p.path)).toEqual(["base.rows.hit_or_sack_rate", "bands.clauses.0.hi"]);
    // A second fill has nothing left of its own to fill.
    expect(fillStep0(out.file, result).filled).toEqual([]);
  });

  const dir = mkdtempSync(join(tmpdir(), "pocket-main-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("refuses a filing that is missing or invalid, before anything is played", () => {
    expect(() => openFiling(join(dir, "absent.json"))).toThrow(/does not exist/);
    const bad = join(dir, "bad.json");
    writeFileSync(bad, JSON.stringify({ format: "nope" }));
    expect(() => openFiling(bad)).toThrow(/not an adr-089-filed\/v1 filing/);
    const good = join(dir, "good.json");
    writeFileSync(good, JSON.stringify(filing()));
    expect(openFiling(good).format).toBe(FILED_FORMAT);
  });

  it("sanitizes to plain JSON", () => {
    expect(sanitize({ a: undefined, b: [1, Number.NaN], c: new Map([[1, 2]]) })).toEqual({ b: [1, null], c: {} });
  });
});

describe("the base arm's real column (review CT-N7)", () => {
  const empty = () => sanitize(pocketRows(emptyRowsFold())) as Record<string, unknown>;
  const input = {
    accumulators: { flat: emptyAccumulator(), gen: emptyAccumulator() },
    rows: { flat: empty(), gen: empty() },
    guard: { flat: emptyGuardFold(), gen: emptyGuardFold() },
  };

  it("has no real column without a real input", () => {
    const arm = baseArm(input);
    expect(arm.rows.length).toBeGreaterThan(10);
    expect(arm.rows.every((r) => !("real" in r))).toBe(true);
  });

  it("fails, not blanks, when a real side throws: an error is never 'no real figure'", () => {
    // Every read of this input throws. Before the fix, the catch turned that into an empty real
    // column and the arm carried on.
    const broken = new Proxy({}, { get: () => { throw new Error("the real input was read and broke"); } });
    expect(() => baseArm({ ...input, real: broken as never })).toThrow(/the real input was read and broke/);
  });
});

describe("a small run of every pass (always on)", () => {
  it("plays every pass, fills M1 to M9 and the rows, and is deterministic", async () => {
    const opts = { flatFirst: 2, genThroughWeek: 1, realSackerCache: null } as const;
    const a = await runStep0(opts);
    expect(Object.keys(a.M)).toEqual([...M_IDS]);
    expect(a.corpora["played"]).toEqual({
      "flat/set1/unmirrored": 2,
      "flat/set1/mirrored": 2,
      "flat/set2/unmirrored": 2,
      "flat/set2/mirrored": 2,
      "gen/set1/unmirrored": 16,
      "gen/set1/mirrored": 16,
      "gen/set2/unmirrored": 16,
      "gen/set2/mirrored": 16,
    });
    expect(a.m1Bound.dropbacks).toBeGreaterThan(500);
    expect(a.m1Bound.B1).toBeCloseTo(a.m1Bound.E + 3 * a.m1Bound.SD, 9);
    expect(Object.keys(a.rows.gen as object)).toEqual(["sacker_mix", "multi_channel_share", "int_per_aimed_by_throw_class", "completion_per_aimed_by_throw_class", "nobody_open_share", "clean_checkdown_share", "clean_later_read_share"]);
    expect((a.M.M3 as { real: { unavailable?: string } }).real.unavailable).toMatch(/not asked for/);
    const b = await runStep0(opts);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    // The fill takes the result as it is.
    expect(fillStep0(filing(), a).filled.length).toBe(15);
  }, 300_000);
});
