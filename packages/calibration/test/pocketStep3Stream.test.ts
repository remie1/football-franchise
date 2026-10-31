/**
 * ADR-089 step 3 — THE s3 STREAM'S READERS (plan §2.7; AM-2's `lateBlock`, `toucher`,
 * `untouchedExchange` and `freeRunKey`).
 *
 * Constructed: AM-2's key (`freeRunKey.ts`) on every reading; `s1Stream.ts` widened on an s3 play
 * only (a late beat naming its pickup CHECK, its dieless ticks naming the beat, every margin
 * rebuilt), and the very same events on an s1 play read as orphans exactly as before; step 3's
 * five exclusive mechanisms; `s3Stream.ts`'s late-block check (each fact it must refuse) and its
 * census; `deriveFrom` unchanged on a beaten late block (ARC or THROUGH); a late tick counted as a
 * tick of its own block by the band census and the ladder; M5's exact free-run mirror row.
 *
 * In the suite: the first 3 golden games of each league under C1, C2, C10, C12 and C15, every
 * step-1 fold and the step-3 folds with no failure and the late block seen; the miss split's two
 * readings on real folds (equal under reading C, as they must be); a late tick credited to the
 * rusher and the toucher; M5's mirror row exact on C1. Under `FF_POCKET_ON=1`: 50 golden games a
 * league under every playable step-3 arm. The counts go to stdout.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { emptyAccumulator, foldGame } from "../src/metrics/collect.js";
import { missSplitFigures } from "../src/metrics/pocketRows.js";
import { emptyBandCensusFold, foldPlayBandCensus } from "../src/knownTruth/bandCensus.js";
import { emptyLadderSkipped, foldLadder } from "../src/knownTruth/ladderOccupancy.js";
import { deriveApproachesOfPlay } from "../src/pocket/approach.js";
import { armById, armRefusal, exclusiveMechanisms, STEP3_ARM_IDS, type ArmId } from "../src/pocket/arms.js";
import { beatTickOf, clockOf, lateBreakingTimeS, passRushBandOf } from "../src/pocket/clocks.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { clockKeyOf, clockOriginOf, D19_KEY, isTouched, onClockUnder, touchOfCheck, type ClockKey, type Touch } from "../src/pocket/freeRunKey.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import { emptyM5Game, m5Compare, m5FreeRunMirror, m5GameOf, picturesMirror, type FreeRunMirrorPlay, type M5Game } from "../src/pocket/m5Mirror.js";
import { POCKET_1_S1_DIGEST, POCKET_1_S3_DIGEST, rulesTunables } from "../src/pocket/rules.js";
import {
  beatAccounting,
  dialsOf,
  DIELESS_TICK_KEYS,
  emptyAffectedFold,
  emptyBeatAccountingFold,
  emptyReproduceFold,
  emptyS1Folds,
  foldAffectedGame,
  foldS1Game,
  isS3Play,
  lateBeatLabelOf,
  lateLMarginExact,
  lateReportedMarginS,
  reproduceMargins,
  s1PlaysOf,
  s1Problems,
  tierOf,
} from "../src/pocket/s1Stream.js";
import {
  emptyLateBlockFold,
  emptyS3CensusFold,
  emptyS3Folds,
  expectsLateBlock,
  foldS3Game,
  lateBlockCheck,
  mergeS3Census,
  s3Census,
  s3Problems,
  standingRecordsOf,
} from "../src/pocket/s3Stream.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 3;

const C1 = armById("C1").tunables;
const C15 = armById("C15").tunables;
const S3_STAMP = { name: "pocket-1.s3", overlayDigest: POCKET_1_S3_DIGEST } as const;
const S1_STAMP = { name: "pocket-1.s1", overlayDigest: POCKET_1_S1_DIGEST } as const;

// --- AM-2's key ------------------------------------------------------------------------------------

describe("AM-2's key: who is on the free-run clock under an arm's reading (freeRunKey.ts)", () => {
  it("reads the arm's reading and origins, and D19's (reading B, every origin) on an arm with no free-run block", () => {
    expect(clockKeyOf(rulesTunables("legacy"))).toBe(D19_KEY);
    expect(clockKeyOf(rulesTunables("pocket-1.s2"))).toBe(D19_KEY);
    expect(clockKeyOf(armById("C10").tunables)).toBe(D19_KEY);
    expect(clockKeyOf(C1)).toEqual({ reading: "B", d19: false });
    expect(clockKeyOf(armById("C11").tunables)).toEqual({ reading: "C", d19: false });
    expect(clockKeyOf(armById("C12").tunables)).toEqual({ reading: "A", d19: false });
    expect(clockKeyOf(armById("C7").tunables)).toEqual({ reading: "B", origins: ["UNBLOCKED"], d19: false });
    expect(clockKeyOf(armById("C9").tunables)).toEqual({ reading: "B", origins: ["LOOPER_FREE"], d19: false });
  });

  it("the hand on a pickup is its back; on a stunt the looper's blocker, named only by the exchange modifier", () => {
    expect(touchOfCheck({ checkKind: "blitz_pickup", actors: ["rb", "lb"], band: "RAN_THROUGH" })).toEqual({ checkKind: "blitz_pickup", band: "RAN_THROUGH", hand: "rb" });
    const stunt = (mods: readonly string[], actors: readonly string[]) => ({ checkKind: "stunt_communication", actors, band: "LATE_EXCHANGE", roll: { modifiers: mods.map((source) => ({ source, value: 1 })) } });
    expect(touchOfCheck(stunt(["C Awareness (center)", "LG Awareness (exchange)"], ["c", "lg", "dt", "de"]))?.hand).toBe("lg");
    expect(touchOfCheck(stunt(["LG Awareness (exchange)"], ["lg", "dt", "de"]))?.hand).toBe("lg");
    // No adjacent blocker: AM-2's untouched exchange.
    expect(touchOfCheck(stunt(["C Awareness (center)"], ["c", "dt", "de"]))?.hand).toBeUndefined();
    expect(touchOfCheck({ checkKind: "pass_rush_rep", actors: ["de", "lt"] })).toBeUndefined();
  });

  it("touched is RAN_THROUGH or LATE_EXCHANGE with a hand (D19); the untouched exchange and the free bands are not", () => {
    const t = (band: string, hand?: string): Touch => ({ checkKind: "blitz_pickup", band, hand });
    expect(isTouched(t("RAN_THROUGH", "rb"))).toBe(true);
    expect(isTouched({ checkKind: "stunt_communication", band: "LATE_EXCHANGE", hand: "lg" })).toBe(true);
    expect(isTouched({ checkKind: "stunt_communication", band: "LATE_EXCHANGE", hand: undefined })).toBe(false);
    expect(isTouched(t("BLOWN_UP", "rb"))).toBe(false);
    expect(isTouched(undefined)).toBe(false);
    expect([clockOriginOf("UNBLOCKED"), clockOriginOf("PICKUP_LOST"), clockOriginOf("STUNT_LOOPER"), clockOriginOf("WON_REP")]).toEqual(["UNBLOCKED", "BLOWN_UP", "LOOPER_FREE", undefined]);
  });

  it("puts the men on the clock that the engine's timeFreeRunners does, reading by reading", () => {
    const B: ClockKey = { reading: "B", d19: false };
    const C: ClockKey = { reading: "C", d19: false };
    const A: ClockKey = { reading: "A", d19: false };
    const ranThrough: Touch = { checkKind: "blitz_pickup", band: "RAN_THROUGH", hand: "rb" };
    const blownUp: Touch = { checkKind: "blitz_pickup", band: "BLOWN_UP", hand: "rb" };
    const untouchedExchange: Touch = { checkKind: "stunt_communication", band: "LATE_EXCHANGE", hand: undefined };
    const looperFree: Touch = { checkKind: "stunt_communication", band: "LOOPER_FREE", hand: "lg" };
    const rows: readonly [string, Touch | undefined][] = [
      ["UNBLOCKED", undefined],
      ["PICKUP_LOST", ranThrough],
      ["PICKUP_LOST", blownUp],
      ["STUNT_LOOPER", untouchedExchange],
      ["STUNT_LOOPER", looperFree],
      ["WON_REP", undefined],
    ];
    const on = (key: ClockKey): boolean[] => rows.map(([o, t]) => onClockUnder(key, o, t));
    expect(on(B)).toEqual([true, false, true, true, true, false]);
    expect(on(D19_KEY)).toEqual(on(B));
    expect(on(C)).toEqual([true, true, true, true, true, false]);
    expect(on(A)).toEqual([true, false, false, true, false, false]);
    expect(on({ reading: "B", origins: ["UNBLOCKED"], d19: false })).toEqual([true, false, false, false, false, false]);
    expect(on({ reading: "B", origins: ["LOOPER_FREE"], d19: false })).toEqual([false, false, false, true, true, false]);
  });
});

// --- a constructed s3 play: a back gets a hand on an edge rusher, who beats the late block ------

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
type Ev = Record<string, unknown>;
let seq = 0;

function env(playId: string, event: Ev, tick?: number): MatchEventEnvelope {
  seq += 1;
  return { seq, at: AT, event: { gameId: "g", playId, ...(tick === undefined ? {} : { tick }), ...event } as never };
}

const d100 = (rngLabel: string, raw = 50) => ({ die: "d100", raw, modifiers: [], total: raw, rngLabel });

interface LatePlayOptions {
  readonly playId?: string;
  readonly rules?: { readonly name: string; readonly overlayDigest: string };
  readonly tunables?: Tunables;
  /** The touching CHECK's margin (RAN_THROUGH is -19 to -1). */
  readonly touchMargin?: number;
  readonly u?: number;
  /** Override one field of the late beat. */
  readonly beat?: Ev;
  /** Override the tick margins (by tick). */
  readonly tickMargin?: (tick: number, margin: number) => number;
  /** Put the late beat after the first TICK. */
  readonly beatAfterTick?: boolean;
  /** The beaten threat: published, its origin, and whether it comes a tick early. */
  readonly threat?: "NONE" | "WRONG_ORIGIN" | "EARLY";
  /** An extra late tick before t_e. */
  readonly tickBeforeTe?: boolean;
  /** Drop the beat (S's late block with no beat). */
  readonly noBeat?: boolean;
  /** Extra events at the snap (after the CHECKs, before the first TICK). */
  readonly extra?: readonly Ev[];
}

interface LatePlay {
  readonly events: readonly MatchEventEnvelope[];
  readonly touchLabel: string;
  readonly beatLabel: string;
  readonly m: number;
  readonly beatTick: number;
  readonly ticks: readonly number[];
}

/** One s3 PASS play: rb picks up de1 and is run through; de1's late block, its ticks, and (by default) his beaten threat. */
function latePlay(opts: LatePlayOptions = {}): LatePlay {
  const playId = opts.playId ?? "g:p1";
  const tunables = opts.tunables ?? C1;
  const d = dialsOf(tunables);
  const late = tunables.blitzPickup.lateBlock!;
  const touchMargin = opts.touchMargin ?? -5;
  const m = -touchMargin;
  const u = opts.u ?? 0.5;
  const touchLabel = `game:g/play:1/presnap/pickup/rb:pickup`;
  const beatLabel = lateBeatLabelOf(touchLabel)!;
  const beatTick = beatTickOf(lateBreakingTimeS(m, u, late.engageSeconds, late.weakMultiplier, d.s!), d.clock)!;
  const grid = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0].filter((t) => t >= late.engageSeconds - 1e-9 && t <= beatTick + 0.5 + 1e-9);
  const ticks = opts.tickBeforeTe === true ? [0.5, ...grid] : grid;
  const start = env(playId, {
    type: "PLAY_START",
    payload: {
      kind: "PASS_PLAY_V1",
      offense: { team: "OFF", call: "SMASH", readSystem: "HALF_FIELD", quarterback: "qb" },
      defense: { team: "DEF", rush: [{ rusher: "de1", move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "D" }] },
      situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 900 },
      rules: opts.rules ?? S3_STAMP,
    },
  });
  const pickup = env(playId, {
    type: "CHECK",
    payload: { checkKind: "blitz_pickup", actors: ["rb", "de1"], roll: d100(touchLabel), tier: tierOf(tunables, touchMargin), margin: touchMargin, testsAttrs: ["passBlock"], band: "RAN_THROUGH" },
  });
  const beat = env(playId, {
    type: "CHECK",
    payload: {
      checkKind: "pass_rush_beat",
      actors: ["de1", "rb"],
      roll: { die: "uniform", raw: u, modifiers: [], total: u, rngLabel: beatLabel },
      tier: tierOf(tunables, m),
      margin: m,
      testsAttrs: [],
      rollRef: touchLabel,
      ...(opts.beat ?? {}),
    },
  });
  const events: MatchEventEnvelope[] = [start, pickup];
  if (opts.beatAfterTick !== true && opts.noBeat !== true) events.push(beat);
  for (const e of opts.extra ?? []) events.push(env(playId, e));
  if (opts.threat === "EARLY") {
    events.push(env(playId, { type: "RUSH_THREAT", payload: { rusher: "de1", alignment: "EDGE", origin: "PICKUP_LOST", rollRef: touchLabel, etaTick: 2.0, state: "TRAVELLING", approach: "ARC" } }));
  }
  let first = true;
  for (const t of ticks) {
    events.push(env(playId, { type: "TICK", payload: { tick: t } }, t));
    if (first && opts.beatAfterTick === true) events.push(beat);
    first = false;
    const base = lateReportedMarginS(t, m, beatTick, d.bands.win);
    const margin = opts.tickMargin?.(t, base) ?? base;
    events.push(env(playId, { type: "CHECK", payload: { checkKind: "pass_rush_tick", actors: ["de1", "rb"], tier: tierOf(tunables, margin), margin, testsAttrs: [], band: passRushBandOf(tunables, margin), rollRef: beatLabel } }, t));
    if (Math.abs(t - beatTick) < 1e-9 && opts.threat !== "NONE" && opts.threat !== "EARLY") {
      events.push(env(playId, { type: "RUSH_THREAT", payload: { rusher: "de1", alignment: "EDGE", origin: opts.threat === "WRONG_ORIGIN" ? "UNBLOCKED" : "PICKUP_LOST", rollRef: touchLabel, etaTick: t + 1.1, state: "TRAVELLING", approach: "ARC" } }, t));
    }
  }
  events.push(env(playId, { type: "PLAY_RESULT", payload: { yards: 0, turnover: false, clockRunoff: 6 } }));
  return { events, touchLabel, beatLabel, m, beatTick, ticks };
}

describe("s1Stream.ts reads the late block on s3 plays only (plan §2.7)", () => {
  it("the constructed late block is the engine's shape: a beat tick inside the play, ticks from t_e", () => {
    const p = latePlay();
    expect(p.m).toBe(5);
    expect(p.beatTick).toBeGreaterThan(1.0);
    expect(p.ticks[0]).toBe(1.0);
    expect(p.ticks.at(-1)).toBeGreaterThan(p.beatTick);
  });

  it("an s3 play's late beat and its ticks are its late block, not orphans", () => {
    const [play] = s1PlaysOf(latePlay().events);
    expect(isS3Play(play!)).toBe(true);
    expect(play!.lateBlocks).toHaveLength(1);
    expect(play!.lateBlocks[0]!.beat?.c.checkKind).toBe("pass_rush_beat");
    expect(play!.lateBlocks[0]!.ticks.length).toBeGreaterThan(1);
    expect(play!.orphanBeats).toEqual([]);
    expect(play!.orphanTicks).toEqual([]);
    expect(play!.matchups).toEqual([]);
    expect(play!.rushers).toEqual(["de1"]);
    for (const k of play!.lateBlocks[0]!.ticks) expect(k.keys).toEqual(DIELESS_TICK_KEYS);
  });

  it("the very same events on an s1 play are orphans, and beatAccounting fails them exactly as before", () => {
    const [play] = s1PlaysOf(latePlay({ rules: S1_STAMP }).events);
    expect(isS3Play(play!)).toBe(false);
    expect(play!.lateBlocks).toEqual([]);
    expect(play!.orphanBeats).toHaveLength(1);
    expect(play!.orphanTicks.length).toBeGreaterThan(1);
    const fold = emptyBeatAccountingFold();
    beatAccounting(fold, play!, dialsOf(armById("A1").tunables));
    expect(fold.problemCount).toBe(1 + play!.orphanTicks.length);
  });

  it("beatAccounting passes the late block on an s3 play, counting its beat and dieless ticks as the loop does", () => {
    const p = latePlay();
    const [play] = s1PlaysOf(p.events);
    const fold = emptyBeatAccountingFold();
    beatAccounting(fold, play!, dialsOf(C1));
    expect(fold.problems).toEqual([]);
    expect(fold).toMatchObject({ beats: 1, reps: 0, uniformRolls: 1, dielessTicks: p.ticks.length, rolledTicks: 0, jitterRolls: 0 });
  });

  it.each([
    ["a second actor who is not the toucher", { actors: ["de1", "lg"] }, "is not the toucher rb"],
    ["a first actor who is not a rusher of the play", { actors: ["xx", "rb"] }, "is not a rusher of the play"],
    ["a margin that is not the CHECK's turned round", { margin: 4 }, "is not the CHECK's turned round"],
    ["a tier that is not the margin's", { tier: "CRITICAL_SUCCESS" }, "tier CRITICAL_SUCCESS"],
    ["attributes", { testsAttrs: ["speed"] }, "testsAttrs is not empty"],
  ] as const)("beatAccounting refuses a late beat with %s", (_name, beat, message) => {
    const [play] = s1PlaysOf(latePlay({ beat }).events);
    const fold = emptyBeatAccountingFold();
    beatAccounting(fold, play!, dialsOf(C1));
    expect(fold.problems.join("\n")).toContain(message);
  });

  it("beatAccounting refuses a late beat on the wrong label or with modifiers", () => {
    const p = latePlay();
    const bad = latePlay({ beat: { roll: { die: "uniform", raw: 0.5, modifiers: [{ source: "x", value: 1 }], total: 0.5, rngLabel: `${p.beatLabel}/x` } } });
    const [play] = s1PlaysOf(bad.events);
    const fold = emptyBeatAccountingFold();
    beatAccounting(fold, play!, dialsOf(C1));
    const text = fold.problems.join("\n");
    expect(text).toContain("modifiers");
    expect(text).toContain("not rush/beat/<touching label>");
  });

  it("reproduceMargins rebuilds every late tick from the beat's U (S), into the S count", () => {
    const p = latePlay();
    const [play] = s1PlaysOf(p.events);
    const fold = emptyReproduceFold();
    reproduceMargins(fold, play!, dialsOf(C1));
    expect(fold.problems).toEqual([]);
    expect(fold.ticks).toEqual({ LEGACY: 0, S: p.ticks.length, L: 0 });
  });

  it("reproduceMargins refuses a late tick off the clock, and one before t_e", () => {
    const p = latePlay();
    const off = latePlay({ tickMargin: (t, mg) => (Math.abs(t - p.beatTick) < 1e-9 ? mg - 1 : mg) });
    const fold = emptyReproduceFold();
    reproduceMargins(fold, s1PlaysOf(off.events)[0]!, dialsOf(C1));
    expect(fold.problemCount).toBe(1);
    expect(fold.problems[0]).toContain("late S");
    const early = emptyReproduceFold();
    reproduceMargins(early, s1PlaysOf(latePlay({ tickBeforeTe: true }).events)[0]!, dialsOf(C1));
    expect(early.problems[0]).toContain("before t_e");
  });

  it("the margin forms: S is min(0, m) before the beat tick and max(win, m) from it; L is AM-2's exact form", () => {
    expect([lateReportedMarginS(1.0, 5, 2.0, 15), lateReportedMarginS(2.0, 5, 2.0, 15), lateReportedMarginS(2.5, 19, 2.0, 15), lateReportedMarginS(3.0, 5, undefined, 15)]).toEqual([0, 15, 19, 0]);
    // round(min(t - t_e, w R) (m + jitter) / (w R)) + 0, w R = 0.1 x 5 = 0.5.
    expect([lateLMarginExact(1.0, 1.0, 0.1, 5, 12), lateLMarginExact(1.25, 1.0, 0.1, 5, 12), lateLMarginExact(1.5, 1.0, 0.1, 5, 12), lateLMarginExact(3.0, 1.0, 0.1, 5, -3)]).toEqual([0, 6, 12, -3]);
    expect(Object.is(lateLMarginExact(1.0, 1.0, 0.1, 5, -3), 0)).toBe(true);
  });
});

// --- step 3's five exclusive mechanisms -------------------------------------------------------------

describe("foldAffectedGame: step 3's five mechanisms (plan §5.1)", () => {
  const count = (events: readonly MatchEventEnvelope[], tunables: Tunables, mechanisms: Parameters<typeof emptyAffectedFold>[0]) => {
    const fold = emptyAffectedFold(mechanisms);
    foldAffectedGame(fold, events, tunables, mechanisms);
    return fold;
  };

  it("LATE_BLOCK: a play with a late block; FREE_RUN: a threat on the clock under the arm's reading", () => {
    const touched = latePlay();
    const unblocked = latePlay({
      playId: "g:p2",
      extra: [{ type: "RUSH_THREAT", payload: { rusher: "lb9", alignment: "INTERIOR", origin: "UNBLOCKED", rollRef: "game:g/play:2/presnap/unblocked", etaTick: 1.9, state: "TRAVELLING", approach: "FREE" } }],
    });
    const fold = count([...touched.events, ...unblocked.events], C1, ["FREE_RUN", "LATE_BLOCK", "CLIMB_FRONT"]);
    expect(fold.dropbacks).toBe(2);
    expect(fold.byMechanism).toEqual({ FREE_RUN: 1, LATE_BLOCK: 2, CLIMB_FRONT: 0 });
    // Reading C would put the touched man on the clock as well: the same plays under C11.
    expect(count(touched.events, armById("C11").tunables, ["FREE_RUN"]).byMechanism).toEqual({ FREE_RUN: 1 });
  });

  it("CLIMB_FRONT: a movement CHECK whose live threats close the lane under FRONT and not under INTERIOR", () => {
    const threat = (alignment: string, approach: string) => ({ type: "RUSH_THREAT", payload: { rusher: "de2", alignment, origin: "WON_REP", rollRef: "r", etaTick: 3.0, state: "TRAVELLING", approach } });
    const movement = { type: "CHECK", payload: { checkKind: "pocket_movement", actors: ["qb"], roll: d100("game:g/play:1/movement/t1.0:movement"), tier: "SUCCESS", margin: 3, testsAttrs: ["pocketPresence"], band: "SOUND" } };
    const front = latePlay({ extra: [threat("EDGE", "THROUGH"), movement] });
    const side = latePlay({ playId: "g:p2", extra: [threat("INTERIOR", "THROUGH"), movement] });
    const arc = latePlay({ playId: "g:p3", extra: [threat("INTERIOR", "ARC"), movement] });
    expect(count(front.events, C1, ["CLIMB_FRONT"]).byMechanism).toEqual({ CLIMB_FRONT: 1 });
    expect(count(side.events, C1, ["CLIMB_FRONT"]).byMechanism).toEqual({ CLIMB_FRONT: 0 });
    expect(count(arc.events, C1, ["CLIMB_FRONT"]).byMechanism).toEqual({ CLIMB_FRONT: 1 });
  });

  it("BAND_EDGES: a pickup whose published band is not its margin's under the unshifted edges; MUG_HEAD_ONLY: every dropback", () => {
    const shifted = latePlay({ tunables: C15, touchMargin: -40 });
    // Under C15 a margin of -40 is RAN_THROUGH (from -49); under today's edges it is BLOWN_UP (below -19).
    expect(count(shifted.events, C15, ["BAND_EDGES", "MUG_HEAD_ONLY"]).byMechanism).toEqual({ BAND_EDGES: 1, MUG_HEAD_ONLY: 1 });
    expect(count(latePlay({ tunables: C15, touchMargin: -5 }).events, C15, ["BAND_EDGES"]).byMechanism).toEqual({ BAND_EDGES: 0 });
  });

  it("a step-1 or step-2 count is the same whether or not a step-3 mechanism is asked for", () => {
    const events = latePlay().events;
    const alone = count(events, C1, ["HALF", "FOLLOWS"]);
    const both = count(events, C1, ["HALF", "FOLLOWS", "FREE_RUN", "LATE_BLOCK"]);
    expect({ HALF: both.byMechanism.HALF, FOLLOWS: both.byMechanism.FOLLOWS }).toEqual(alone.byMechanism);
  });
});

// --- s3Stream.ts --------------------------------------------------------------------------------------

describe("s3Stream.ts: the late block's place in the stream, and the census", () => {
  const check = (events: readonly MatchEventEnvelope[], tunables: Tunables = C1) => {
    const fold = emptyLateBlockFold();
    for (const play of s1PlaysOf(events)) lateBlockCheck(fold, play, tunables);
    return fold;
  };

  it("passes the constructed late block: expected, beaten, ticks from t_e", () => {
    const p = latePlay();
    const fold = check(p.events);
    expect(fold.problems).toEqual([]);
    expect(fold).toMatchObject({ plays: 1, s3Plays: 1, lateBlocks: 1, expected: 1, beaten: 1, ticks: p.ticks.length });
  });

  it("reads no play but an s3 play", () => {
    const fold = check(latePlay({ rules: S1_STAMP }).events, armById("A1").tunables);
    expect(fold).toMatchObject({ plays: 1, s3Plays: 0, problemCount: 0, lateBlocks: 0, expected: 0 });
  });

  it.each([
    ["no late beat for a touched man", { noBeat: true }, "has no late beat"],
    ["a late beat after the first TICK", { beatAfterTick: true }, "after the play's first TICK"],
    ["a beaten threat with another origin", { threat: "WRONG_ORIGIN" }, "has origin UNBLOCKED, not PICKUP_LOST"],
    ["a threat before his beat tick", { threat: "EARLY" }, "comes before his beat tick"],
    ["no threat on the tick he beat his block", { threat: "NONE" }, "no TRAVELLING threat follows on it"],
    ["a late tick before t_e", { tickBeforeTe: true }, "before t_e"],
  ] as const)("refuses %s", (_name, opts, message) => {
    const fold = check(latePlay(opts as LatePlayOptions).events);
    expect(fold.problems.join("\n")).toContain(message);
  });

  it("refuses a late block on an arm with no late block, and the late man's rep", () => {
    expect(check(latePlay().events, armById("C11").tunables).problems.join("\n")).toContain("no late block");
    const rep = { type: "CHECK", payload: { checkKind: "pass_rush_rep", actors: ["de1", "lt"], roll: d100("game:g/play:1/rush/de1:rep/de1:rush"), opposedRoll: d100("x"), tier: "SUCCESS", margin: 3, testsAttrs: ["passRush"], band: "STALEMATE" } };
    expect(check(latePlay({ extra: [rep] }).events).problems.join("\n")).toContain("has a pass_rush_rep");
  });

  it("which records the arm's reading makes late blocks of", () => {
    const touched: Touch = { checkKind: "blitz_pickup", band: "RAN_THROUGH", hand: "rb" };
    const blown: Touch = { checkKind: "blitz_pickup", band: "BLOWN_UP", hand: "rb" };
    const exchange: Touch = { checkKind: "stunt_communication", band: "LATE_EXCHANGE", hand: undefined };
    const looper: Touch = { checkKind: "stunt_communication", band: "LOOPER_FREE", hand: "lg" };
    const picked: Touch = { checkKind: "blitz_pickup", band: "PICKED_UP", hand: "rb" };
    const row = (id: ArmId) => {
      const t = armById(id).tunables;
      const key = clockKeyOf(t);
      return [touched, blown, exchange, looper, picked].map((x) => expectsLateBlock(t, key, x.checkKind, x));
    };
    expect(row("C1")).toEqual([true, false, false, false, false]);
    expect(row("C10")).toEqual([true, false, false, false, false]);
    expect(row("C12")).toEqual([true, true, false, true, false]);
    expect(row("C11")).toEqual([false, false, false, false, false]);
    expect(row("C16")).toEqual([false, false, false, false, false]);
  });

  it("a twist that frees a picked-up man again replaces his pickup's record; a passed-off twist replaces none", () => {
    const k = (index: number, checkKind: string, actors: readonly string[], band: string, label: string) => ({ index, tick: 0, keys: [], c: { checkKind, actors, band, tier: "X", margin: -5, testsAttrs: [], roll: d100(label) } });
    const checks = [
      k(1, "blitz_pickup", ["c", "de1"], "RAN_THROUGH", "pickup/de1"),
      k(2, "blitz_pickup", ["rb", "lb1"], "RAN_THROUGH", "pickup/lb1"),
      k(3, "stunt_communication", ["c", "dt1", "de1"], "LATE_EXCHANGE", "stunt/de1"),
      k(4, "stunt_communication", ["lg", "dt2", "lb1"], "PASSED_OFF", "stunt/lb1"),
    ];
    expect([...standingRecordsOf({ checks })].sort()).toEqual(["pickup/lb1", "stunt/de1"]);
  });

  it("the census counts the late blocks, the touched men and the men on the clock; two censuses add", () => {
    const fold = emptyS3CensusFold();
    const p1 = latePlay();
    const p2 = latePlay({ playId: "g:p2", extra: [{ type: "RUSH_THREAT", payload: { rusher: "lb9", alignment: "INTERIOR", origin: "UNBLOCKED", rollRef: "u", etaTick: 1.9, state: "TRAVELLING", approach: "FREE" } }] });
    for (const play of s1PlaysOf([...p1.events, ...p2.events])) s3Census(fold, play, C1);
    expect(fold).toMatchObject({ plays: 2, s3Plays: 2, lateByBand: { RAN_THROUGH: 2 }, lateByKind: { blitz_pickup: 2 }, reachedBeat: 2, heldThePlay: 0, carried: 0, touched: 2, untouchedExchanges: 0, reading: "B" });
    expect(fold.clockMenByOrigin).toEqual({ UNBLOCKED: 1 });
    const twice = mergeS3Census(fold, fold);
    expect(twice.lateByBand).toEqual({ RAN_THROUGH: 4 });
    expect(twice.reading).toBe("B");
    const other = emptyS3CensusFold();
    for (const play of s1PlaysOf(p1.events)) s3Census(other, play, armById("C12").tunables);
    expect(() => mergeS3Census(fold, other)).toThrow("two arms' censuses");
  });
});

// --- deriveFrom, the band census and the ladder on a late block --------------------------------------

describe("the other readers of a late block (plan §2.7)", () => {
  it("deriveFrom is unchanged: a beaten late block derives ARC (EDGE) or THROUGH (INTERIOR), row TOUCHED", () => {
    const edge = deriveApproachesOfPlay(latePlay().events);
    expect(edge.get("de1")?.label).toEqual({ approach: "ARC", from: "SIDE", row: "TOUCHED" });
    const interior = latePlay().events.map((e) => {
      const ev = e.event as unknown as { type: string; payload: Record<string, unknown> };
      if (ev.type === "PLAY_START") {
        return { ...e, event: { ...ev, payload: { ...ev.payload, defense: { team: "DEF", rush: [{ rusher: "de1", move: "POWER", alignment: "INTERIOR", side: "LEFT", gap: "B" }] } } } } as never;
      }
      return e;
    });
    expect(deriveApproachesOfPlay(interior).get("de1")?.label).toEqual({ approach: "THROUGH", from: "FRONT", row: "TOUCHED" });
  });

  it("the band census counts a late tick as a tick of its own block, by its band", () => {
    const p = latePlay();
    const fold = emptyBandCensusFold();
    foldPlayBandCensus(fold, p.events);
    expect(fold.reps).toBe(p.ticks.length);
    const wins = p.ticks.filter((t) => t >= p.beatTick - 1e-9).length;
    expect(fold.byBand.RUSHER_WINS_REP).toBe(wins);
    expect(fold.byBand[passRushBandOf(C1, 0) as keyof typeof fold.byBand]).toBe(p.ticks.length - wins);
  });

  it("the ladder skips a late beat's uniform and a late block's dieless ticks, and counts the touching CHECK", () => {
    const skipped = emptyLadderSkipped();
    const cells = foldLadder(latePlay().events, undefined, skipped);
    expect(skipped.uniformRolls).toBe(1);
    expect([...cells.values()].map((c) => c.kind)).toEqual(["blitz_pickup"]);
  });
});

// --- M5's exact free-run mirror row ---------------------------------------------------------------------

describe("M5's exact free-run mirror row, written only for s3 streams (plan §2.7, §2.8)", () => {
  const play = (playId: string, sign: 1 | -1, eta = 2.3, men = [{ rusher: "lb1", origin: "UNBLOCKED", eta }]): FreeRunMirrorPlay => ({
    playId,
    call: "SMASH",
    rush: "lb1:POWER:INTERIOR",
    defense: [["lb1", sign * 2.5, 4.5], ["de1", sign * -4, 1]],
    men,
  });
  const game = (plays: FreeRunMirrorPlay[]): M5Game => ({ ...emptyM5Game(), freeRun: plays });

  it("pairs the plays whose pictures mirror and compares every man on the clock in both, exactly", () => {
    expect(picturesMirror(play("p1", 1), play("p1", -1))).toBe(true);
    expect(picturesMirror(play("p1", 1), play("p1", 1))).toBe(false);
    const row = m5FreeRunMirror([game([play("p1", 1), play("p2", 1)])], [game([play("p1", -1), play("p2", 1)])]);
    expect(row).toMatchObject({ playsUnmirrored: 2, playsMirrored: 2, playsPaired: 1, menCompared: 1, menDiffering: 0, menInOneOnly: 0, exact: true });
    const off = m5FreeRunMirror([game([play("p1", 1)])], [game([play("p1", -1, 2.4)])]);
    expect(off).toMatchObject({ menCompared: 1, menDiffering: 1, exact: false });
    expect(off.sample[0]).toContain("2.3 unmirrored, 2.4 mirrored");
    const none = m5FreeRunMirror([game([play("p1", 1, 2.3, [])])], [game([play("p1", -1, 2.3, [])])]);
    expect(none).toMatchObject({ menCompared: 0, exact: false });
  });

  it("a game with no s3 play carries no freeRun, and m5Compare writes the row only when a game does", () => {
    const legacy: M5Game = { ...emptyM5Game(), dropbacks: 2, escapes: 1 };
    const runs = [1, 2].flatMap((set) => [false, true].map((mirrored) => ({ league: "flat", set, mirrored, games: [legacy, legacy] })));
    expect(Object.keys(m5Compare("flat", runs))).toEqual(["league", "rows", "totals", "escapeDirection"]);
    const s3 = [1, 2].flatMap((set) => [false, true].map((mirrored) => ({ league: "flat", set, mirrored, games: [game([play("p1", mirrored ? -1 : 1)])] })));
    const out = m5Compare("flat", s3) as { readonly freeRunMirror: Record<string, { readonly exact: boolean }> };
    expect(Object.keys(out.freeRunMirror)).toEqual(["set1", "set2"]);
    expect(out.freeRunMirror["set1"]!.exact).toBe(true);
    expect("freeRun" in m5GameOf(latePlay({ rules: S1_STAMP }).events, armById("A1").tunables)).toBe(false);
  });
});

// --- on the golden games ---------------------------------------------------------------------------------

describe("on the golden games: every step-1 fold and the step-3 folds pass on s3 streams", () => {
  const ARMS: readonly ArmId[] = ON ? STEP3_ARM_IDS.filter((id) => armRefusal(id) === undefined && id !== "C6") : ["C1", "C2", "C10", "C12", "C15"];
  it.each(ARMS)("%s", (id) => {
    const arm = armById(id);
    const s1 = emptyS1Folds();
    const s3 = emptyS3Folds();
    const mechanisms = exclusiveMechanisms(arm);
    const affected = emptyAffectedFold(mechanisms);
    for (const league of GOLDEN_LEAGUES) {
      goldenGames(league, (o) => {
        foldS1Game(s1, o.events, arm.tunables);
        foldS3Game(s3, o.events, arm.tunables);
        foldAffectedGame(affected, o.events, arm.tunables, mechanisms);
      }, { tunables: arm.tunables, callerVersion: "v7", first: FIRST });
    }
    console.log(
      `${id}: ${String(s3.lateBlock.s3Plays)} s3 plays, late blocks ${String(s3.lateBlock.lateBlocks)} (expected ${String(s3.lateBlock.expected)}, beaten ${String(s3.lateBlock.beaten)}, ticks ${String(s3.lateBlock.ticks)}); ` +
        `census ${JSON.stringify(s3.census)}; affected ${JSON.stringify(affected.byMechanism)}`,
    );
    expect(s1Problems(s1)).toEqual([]);
    expect(s3Problems(s3)).toEqual([]);
    expect(s3.lateBlock.s3Plays).toBe(s3.lateBlock.plays);
    expect(s3.lateBlock.lateBlocks).toBe(s3.lateBlock.expected);
    if (arm.tunables.blitzPickup.lateBlock !== undefined) {
      expect(s3.lateBlock.lateBlocks).toBeGreaterThan(0);
      expect(s1.margins.ticks.S).toBeGreaterThan(0);
    }
    if (mechanisms.includes("FREE_RUN")) expect(affected.byMechanism.FREE_RUN).toBeGreaterThan(0);
    if (mechanisms.includes("LATE_BLOCK")) expect(affected.byMechanism.LATE_BLOCK).toBeGreaterThan(0);
    if (mechanisms.includes("BAND_EDGES")) expect(affected.byMechanism.BAND_EDGES).toBeGreaterThan(0);
  }, 600_000);
});

describe("on the golden games: the miss split under the arm's reading, both figures (AM-2's key)", () => {
  const foldOf = (id: ArmId) => {
    const arm = armById(id);
    const acc = emptyAccumulator();
    for (const league of GOLDEN_LEAGUES) goldenGames(league, (o) => foldGame(acc, o, arm.tunables), { tunables: arm.tunables, callerVersion: "v7", first: FIRST });
    return acc.play.pocket;
  };

  it("reading C puts every free runner on the clock, so its split is the origin-keyed one, figure for figure", () => {
    const pf = foldOf("C11");
    const split = missSplitFigures(pf);
    console.log(`C11 miss split: ${JSON.stringify(split)}`);
    expect(pf.clockKey.clockMen).toBeGreaterThan(0);
    expect(split.byClock.bin20NoFreeRunner).toBe(split.byOrigin.bin20NoFreeRunner);
    expect(split.byClock.freeRunnerShareOf20).toBe(split.byOrigin.freeRunnerShareOf20);
    expect(split.byClock.quickNoFreeRunner).toBe(split.byOrigin.quickNoFreeRunner);
    expect(split.byClock.quickShareByCause["CLOCK_RUNNER"]).toBe(split.byOrigin.quickShareByCause["FREE_RUNNER"]);
  }, 600_000);

  it("reading B (the design) leaves touched men off the clock: no more clock runners than free runners, and both figures printed", () => {
    const pf = foldOf("C1");
    const split = missSplitFigures(pf);
    console.log(`C1 miss split: ${JSON.stringify(split)}; clock men ${String(pf.clockKey.clockMen)}, free-run men ${String(pf.freeRunMen)}`);
    expect(pf.clockKey.clockMen).toBeGreaterThan(0);
    expect(split.byClock.freeRunnerShareOf20!).toBeLessThanOrEqual(split.byOrigin.freeRunnerShareOf20!);
    expect(split.quick).not.toBeNull();
  }, 600_000);

  it("a late tick is a tick of its own block for the player folds: the rusher's rep, the toucher's block", () => {
    const acc = emptyAccumulator();
    const rushReps = new Map<string, number>();
    const blockReps = new Map<string, number>();
    let lateTicks = 0;
    goldenGames("flat", (o) => {
      foldGame(acc, o, C1);
      for (const { event } of o.events) {
        if (event.type !== "CHECK" || event.payload.checkKind !== "pass_rush_tick") continue;
        const [r, b] = event.payload.actors.map(String);
        rushReps.set(r!, (rushReps.get(r!) ?? 0) + 1);
        if (b !== undefined) blockReps.set(b, (blockReps.get(b) ?? 0) + 1);
      }
      for (const play of s1PlaysOf(o.events)) for (const lb of play.lateBlocks) lateTicks += lb.ticks.length;
    }, { tunables: C1, callerVersion: "v7", first: FIRST });
    expect(lateTicks).toBeGreaterThan(0);
    for (const [p, n] of rushReps) expect(acc.player.rushReps[p]?.reps, p).toBe(n);
    for (const [p, n] of blockReps) expect(acc.player.blockReps[p]?.reps, p).toBe(n);
  }, 600_000);
});

describe("on the golden games: M5's free-run mirror row is exact on C1", () => {
  it("every man on the clock in a play whose mirrored picture was drawn arrives on the same tenth", () => {
    const u: M5Game[] = [];
    const m: M5Game[] = [];
    goldenGames("flat", (o) => u.push(m5GameOf(o.events, C1)), { tunables: C1, callerVersion: "v7", first: FIRST + 3 });
    goldenGames("flat", (o) => m.push(m5GameOf(o.events, C1)), { tunables: C1, callerVersion: "v7", first: FIRST + 3, mirror: true });
    const row = m5FreeRunMirror(u, m);
    console.log(`C1 free-run mirror: ${JSON.stringify(row)}`);
    expect(row.menCompared).toBeGreaterThan(0);
    expect(row.exact).toBe(true);
  }, 600_000);
});
