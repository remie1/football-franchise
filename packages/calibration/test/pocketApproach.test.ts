/**
 * ADR-089 step 0 — THE APPROACH LABEL ON LEGACY FACTS (plan §3.6, §3.7; ADR-089 §4.0, lines 382-394).
 *
 * One case per row of §4.0's table, in its order (so the first row that fits wins), plus the
 * steps 1-2 rule for a touched man; the stream reader on a constructed play; and the reader on
 * real games, where every threat must be labelled and every justifying CHECK found.
 *
 * ADR-089 step 1 (plan §7.2 item 4, §16.3): under `pocket-1` (a `PLAY_START` that carries `rules`)
 * consumers read the PUBLISHED `RUSH_THREAT.approach` (P4), with the derivation beside it; the
 * derivation learns shape S's join (threat → `pass_rush_beat` → rep) and shape L's PUSH (a POWER rep
 * that reported BLOCKER_BEATEN before it won), so S-8 can check derived equals published. On
 * constructed plays here, and on a real `pocket-1.s1` game (the engine, stream E-b, publishes it).
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import {
  APPROACH_ROWS,
  APPROACHES,
  approachesOfGame,
  approachesOfPlay,
  approachOf,
  BEATEN_BAND,
  deriveApproachesOfPlay,
  fromOfApproach,
  LOOPER_FREE_BAND,
  LOOPER_TOUCHED_BAND,
  PICKUP_FREE_BAND,
  PICKUP_TOUCHED_BAND,
  PUSH_MARGIN,
  pushMarginOf,
  type ApproachFacts,
} from "../src/pocket/approach.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { POCKET_1_S1_DIGEST, POCKET_1_S1_OVERLAY, rulesTunables, withOverlay } from "../src/pocket/rules.js";

const threat = (f: Omit<ApproachFacts, "threat" | "penetrator"> & { readonly penetrator?: boolean }): ApproachFacts => ({
  threat: true,
  penetrator: false,
  ...f,
});

describe("ADR-089 §4.0: approachOf, row by row", () => {
  it("row 1: completely unblocked (UNBLOCKED, or a pickup BLOWN_UP) is FREE, FRONT if interior, SIDE if edge", () => {
    expect(approachOf(threat({ origin: "UNBLOCKED", alignment: "INTERIOR", move: "SPEED" }))).toEqual({ approach: "FREE", from: "FRONT", row: "UNBLOCKED_FREE" });
    expect(approachOf(threat({ origin: "UNBLOCKED", alignment: "EDGE", move: "POWER" }))).toEqual({ approach: "FREE", from: "SIDE", row: "UNBLOCKED_FREE" });
    expect(approachOf(threat({ origin: "PICKUP_LOST", band: PICKUP_FREE_BAND, alignment: "EDGE", move: "SPEED" }))).toEqual({ approach: "FREE", from: "SIDE", row: "UNBLOCKED_FREE" });
    expect(approachOf(threat({ origin: "PICKUP_LOST", band: PICKUP_FREE_BAND, alignment: "INTERIOR", move: "POWER" }))).toEqual({ approach: "FREE", from: "FRONT", row: "UNBLOCKED_FREE" });
    // An unblocked penetrator is completely unblocked and not a looper: row 1 comes first.
    expect(approachOf(threat({ origin: "UNBLOCKED", alignment: "EDGE", move: "SPEED", penetrator: true })).approach).toBe("FREE");
  });

  it("row 2: a looper the line never touched (LOOPER_FREE), and a twist's penetrator, is THROUGH from the FRONT", () => {
    const through = { approach: "THROUGH", from: "FRONT", row: "LOOPER_OR_PENETRATOR" };
    expect(approachOf(threat({ origin: "STUNT_LOOPER", band: LOOPER_FREE_BAND, alignment: "EDGE", move: "SPEED" }))).toEqual(through);
    expect(approachOf(threat({ origin: "STUNT_LOOPER", band: LOOPER_FREE_BAND, alignment: "INTERIOR", move: "POWER" }))).toEqual(through);
    // The penetrator row comes before the edge-speed row and the PUSH row.
    expect(approachOf(threat({ origin: "WON_REP", alignment: "EDGE", move: "SPEED", latentMargin: 3, penetrator: true }))).toEqual(through);
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin: 5, penetrator: true }))).toEqual(through);
    // And before row 3 (review CT-N4): a penetrator touched on a pickup or a stunt is still the
    // penetrator, THROUGH from the FRONT, on the edge too (not row 3's ARC).
    for (const touched of [
      { origin: "PICKUP_LOST", band: PICKUP_TOUCHED_BAND },
      { origin: "STUNT_LOOPER", band: LOOPER_TOUCHED_BAND },
    ] as const) {
      expect(approachOf(threat({ ...touched, alignment: "INTERIOR", move: "POWER", penetrator: true }))).toEqual(through);
      expect(approachOf(threat({ ...touched, alignment: "EDGE", move: "SPEED", penetrator: true }))).toEqual(through);
    }
    // Row 1 still comes first: a blown-up pickup's penetrator is FREE.
    expect(approachOf(threat({ origin: "PICKUP_LOST", band: PICKUP_FREE_BAND, alignment: "INTERIOR", move: "POWER", penetrator: true }))).toEqual({ approach: "FREE", from: "FRONT", row: "UNBLOCKED_FREE" });
    // A band the table does not read is refused, penetrator or not.
    expect(() => approachOf(threat({ origin: "PICKUP_LOST", band: "NOT_A_BAND", alignment: "INTERIOR", move: "POWER", penetrator: true }))).toThrow(/§4.0 reads/);
    expect(() => approachOf(threat({ origin: "STUNT_LOOPER", band: "NOT_A_BAND", alignment: "INTERIOR", move: "POWER", penetrator: true }))).toThrow(/§4.0 reads/);
  });

  it("row 3 and the steps 1-2 rule: a man somebody got a hand on (RAN_THROUGH, LATE_EXCHANGE) is ARC if EDGE and THROUGH if INTERIOR", () => {
    for (const touched of [
      { origin: "PICKUP_LOST", band: PICKUP_TOUCHED_BAND },
      { origin: "STUNT_LOOPER", band: LOOPER_TOUCHED_BAND },
    ] as const) {
      expect(approachOf(threat({ ...touched, alignment: "EDGE", move: "POWER" }))).toEqual({ approach: "ARC", from: "SIDE", row: "TOUCHED" });
      expect(approachOf(threat({ ...touched, alignment: "INTERIOR", move: "SPEED" }))).toEqual({ approach: "THROUGH", from: "FRONT", row: "TOUCHED" });
    }
  });

  it("row 4: a won rep, SPEED or FINESSE, on the EDGE is ARC from the SIDE, whatever the margin", () => {
    for (const move of ["SPEED", "FINESSE"] as const) {
      for (const latentMargin of [-6, 0, 5, 14, 22]) {
        expect(approachOf(threat({ origin: "WON_REP", alignment: "EDGE", move, latentMargin }))).toEqual({ approach: "ARC", from: "SIDE", row: "EDGE_SPEED_FINESSE" });
      }
    }
  });

  it("row 5: a won POWER rep with latent margin 1 to 14 is PUSH, FRONT if interior and SIDE if edge", () => {
    for (const latentMargin of [1, 7, 14]) {
      expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin }))).toEqual({ approach: "PUSH", from: "FRONT", row: "POWER_1_TO_14" });
      expect(approachOf(threat({ origin: "WON_REP", alignment: "EDGE", move: "POWER", latentMargin }))).toEqual({ approach: "PUSH", from: "SIDE", row: "POWER_1_TO_14" });
    }
  });

  it("row 6: any other won rep (POWER 15+, a late beat from 0 or less, interior SPEED or FINESSE) is THROUGH, or ARC on the EDGE", () => {
    const through = { approach: "THROUGH", from: "FRONT", row: "OTHER_WON_REP" };
    const arc = { approach: "ARC", from: "SIDE", row: "OTHER_WON_REP" };
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin: 15 }))).toEqual(through);
    expect(approachOf(threat({ origin: "WON_REP", alignment: "EDGE", move: "POWER", latentMargin: 15 }))).toEqual(arc);
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin: 0 }))).toEqual(through);
    expect(approachOf(threat({ origin: "WON_REP", alignment: "EDGE", move: "POWER", latentMargin: -3 }))).toEqual(arc);
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "SPEED", latentMargin: 5 }))).toEqual(through);
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "FINESSE", latentMargin: 9 }))).toEqual(through);
  });

  it("row 7: a matchup not beaten is BLOCKED, with no from-class", () => {
    expect(approachOf({ threat: false, alignment: "EDGE", move: "SPEED", penetrator: false })).toEqual({ approach: "BLOCKED", row: "NOT_BEATEN" });
    expect(approachOf({ threat: false, alignment: "INTERIOR", move: "POWER", penetrator: true })).toEqual({ approach: "BLOCKED", row: "NOT_BEATEN" });
  });

  it("refuses facts the table cannot read", () => {
    expect(() => approachOf(threat({ origin: "PICKUP_LOST", band: "PICKED_UP", alignment: "EDGE", move: "SPEED" }))).toThrow(/PICKUP_LOST/);
    expect(() => approachOf(threat({ origin: "STUNT_LOOPER", band: "PASSED_OFF", alignment: "EDGE", move: "SPEED" }))).toThrow(/STUNT_LOOPER/);
    expect(() => approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER" }))).toThrow(/margin/);
    expect(() => approachOf({ threat: true, alignment: "EDGE", move: "SPEED", penetrator: false })).toThrow(/origin/);
  });

  it("the four bands §4.0 names are the engine's own unblocked bands, so a rename fails here", () => {
    const pickup = new Map(DEFAULT_TUNABLES.blitzPickup.bands.map((b) => [b.label, b]));
    const stunt = new Map(DEFAULT_TUNABLES.stunt.bands.map((b) => [b.label, b]));
    expect(pickup.get(PICKUP_FREE_BAND)?.blocked).toBe(false);
    expect(pickup.get(PICKUP_FREE_BAND)?.arrivalDelaySeconds).toBe(0);
    expect(pickup.get(PICKUP_TOUCHED_BAND)?.blocked).toBe(false);
    expect(pickup.get(PICKUP_TOUCHED_BAND)?.arrivalDelaySeconds).toBeGreaterThan(0);
    expect(stunt.get(LOOPER_FREE_BAND)?.passedOff).toBe(false);
    expect(stunt.get(LOOPER_FREE_BAND)?.arrivalDelaySeconds).toBe(0);
    expect(stunt.get(LOOPER_TOUCHED_BAND)?.passedOff).toBe(false);
    expect(stunt.get(LOOPER_TOUCHED_BAND)?.arrivalDelaySeconds).toBeGreaterThan(0);
  });
});

// --- the stream reader ---------------------------------------------------------

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
const env = (event: Record<string, unknown>): MatchEventEnvelope => ({ seq: 0, at: AT, event: { gameId: "g", playId: "g:p1", ...event } as never });
const roll = (rngLabel: string) => ({ die: "d100", raw: 50, modifiers: [], total: 50, rngLabel });
const check = (checkKind: string, rngLabel: string, margin: number, extra: Record<string, unknown> = {}) =>
  env({ type: "CHECK", payload: { checkKind, actors: [], roll: roll(rngLabel), tier: "TIE", margin, testsAttrs: [], ...extra } });
const rushThreat = (rusher: string, origin: string, rollRef: string, alignment: string, state = "TRAVELLING") =>
  env({ type: "RUSH_THREAT", payload: { rusher, alignment, origin, rollRef, etaTick: 2, state } });

const constructedPlay: readonly MatchEventEnvelope[] = [
  env({
    type: "PLAY_START",
    payload: {
      kind: "PASS_PLAY_V1",
      defense: {
        rush: [
          { rusher: "de1", move: "SPEED", alignment: "EDGE", side: "LEFT" },
          { rusher: "dt1", move: "POWER", alignment: "INTERIOR" },
          { rusher: "dt2", move: "POWER", alignment: "INTERIOR" },
          { rusher: "de2", move: "SPEED", alignment: "EDGE" },
          { rusher: "lb1", move: "SPEED", alignment: "INTERIOR" },
          { rusher: "ss", move: "SPEED", alignment: "EDGE" },
        ],
        stunts: [{ penetrator: "dt2", looper: "de2", complexity: "T_E" }],
      },
    },
  }),
  check("stunt_communication", "presnap/stunt/de2", -40, { band: LOOPER_FREE_BAND }),
  check("blitz_pickup", "presnap/pickup/ss", -8, { band: PICKUP_TOUCHED_BAND }),
  check("pass_rush_rep", "rep/de1", -4, { band: "BLOCKER_CONTAINS" }),
  check("pass_rush_rep", "rep/dt1", 6, { band: "STALEMATE" }),
  check("pass_rush_rep", "rep/dt2", 3, { band: "STALEMATE" }),
  check("pass_rush_tick", "tick/dt1/1.0", 15, { band: "RUSHER_WINS_REP", rollRef: "rep/dt1" }),
  check("pass_rush_tick", "tick/dt2/1.5", 16, { band: "RUSHER_WINS_REP", rollRef: "rep/dt2" }),
  rushThreat("lb1", "UNBLOCKED", "presnap/recognition", "INTERIOR"),
  rushThreat("de2", "STUNT_LOOPER", "presnap/stunt/de2", "EDGE"),
  rushThreat("ss", "PICKUP_LOST", "presnap/pickup/ss", "EDGE"),
  rushThreat("dt1", "WON_REP", "tick/dt1/1.0", "INTERIOR"),
  rushThreat("dt2", "WON_REP", "tick/dt2/1.5", "INTERIOR"),
  rushThreat("dt1", "WON_REP", "tick/dt1/1.0", "INTERIOR", "DELAYED"),
];

describe("ADR-089 §4.0: approachesOfPlay reads the facts off the stream", () => {
  it("labels every rusher of the play, at his first threat, joining each threat to its own CHECK by roll label", () => {
    const labels = approachesOfPlay(constructedPlay);
    const of = (r: string) => labels.get(r)?.label;
    expect([...labels.keys()]).toEqual(["de1", "dt1", "dt2", "de2", "lb1", "ss"]);
    expect(of("de1")).toEqual({ approach: "BLOCKED", row: "NOT_BEATEN" });
    expect(of("dt1")).toEqual({ approach: "PUSH", from: "FRONT", row: "POWER_1_TO_14" });
    expect(labels.get("dt1")?.facts.latentMargin).toBe(6);
    expect(of("dt2")).toEqual({ approach: "THROUGH", from: "FRONT", row: "LOOPER_OR_PENETRATOR" });
    expect(of("de2")).toEqual({ approach: "THROUGH", from: "FRONT", row: "LOOPER_OR_PENETRATOR" });
    expect(of("lb1")).toEqual({ approach: "FREE", from: "FRONT", row: "UNBLOCKED_FREE" });
    expect(of("ss")).toEqual({ approach: "ARC", from: "SIDE", row: "TOUCHED" });
  });

  it("refuses a threat whose justifying CHECK is not in the play", () => {
    const broken = constructedPlay.filter((e) => {
      if (e.event.type !== "CHECK") return true;
      const kind: string = e.event.payload.checkKind;
      if (e.event.payload.roll === undefined) {
        if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
        return true;
      }
      return e.event.payload.roll.rngLabel !== "rep/dt1";
    });
    expect(() => approachesOfPlay(broken)).toThrow(/dt1.*pass_rush_rep/);
  });

  it("gives an empty map for a play with no PLAY_START rush", () => {
    expect(approachesOfPlay([env({ type: "TICK", payload: { tick: 0.5 } })]).size).toBe(0);
  });
});

// ADR-089 P3, guarded before it lands (K-a): only a `pass_rush_tick` may lack a roll (shape S's
// tick, which draws no die). Built loosely, as a newer engine's file would carry it.
const dieless = (checkKind: string, margin: number, extra: Record<string, unknown> = {}) =>
  env({ type: "CHECK", payload: { checkKind, actors: [], tier: "TIE", margin, testsAttrs: [], ...extra } });

describe("ADR-089 P3: approachesOfPlay and a CHECK with no die", () => {
  it("skips a pass_rush_tick with no die: every label is the constructed play's", () => {
    const withTick = [...constructedPlay.slice(0, 4), dieless("pass_rush_tick", 0, { band: "STALEMATE", rollRef: "beat/rep/de1" }), ...constructedPlay.slice(4)];
    expect(approachesOfPlay(withTick)).toEqual(approachesOfPlay(constructedPlay));
  });

  it("refuses any other kind of CHECK with no roll", () => {
    expect(() => approachesOfPlay([...constructedPlay, dieless("blitz_pickup", -8)])).toThrow(/a blitz_pickup CHECK without a roll/);
  });
});

describe("ADR-089 §4.0: approachesOfGame on real games", () => {
  it.each(["flat", "gen"] as const)("%s golden game 0 (v7): every RUSH_THREAT's rusher is labelled, never BLOCKED, on the play's own alignment", (league) => {
    let events: readonly MatchEventEnvelope[] = [];
    goldenGames(league, (observation) => { events = observation.events; }, { first: 1, callerVersion: "v7" });
    const byPlay = approachesOfGame(events);
    const counts = Object.fromEntries(APPROACHES.map((a) => [a, 0])) as Record<string, number>;
    for (const labels of byPlay.values()) for (const t of labels.values()) counts[t.label.approach]! += 1;
    let threats = 0;
    for (const { event } of events) {
      if (event.type !== "RUSH_THREAT") continue;
      threats += 1;
      const labelled = byPlay.get(String(event.playId))?.get(String(event.payload.rusher));
      expect(labelled, `${String(event.playId)} ${String(event.payload.rusher)}`).toBeDefined();
      expect(labelled!.label.approach).not.toBe("BLOCKED");
      expect(labelled!.facts.alignment, `${String(event.playId)} ${String(event.payload.rusher)}`).toBe(event.payload.alignment);
    }
    expect(threats).toBeGreaterThan(0);
    expect(counts["BLOCKED"]).toBeGreaterThan(0);
    expect(counts["PUSH"]! + counts["THROUGH"]! + counts["ARC"]!).toBeGreaterThan(0);
  }, 60_000);
});

// --- ADR-089 step 1: shape L's PUSH, the card's range, the published label ---------------

describe("ADR-089 step 1: approachOf under shape L and on the card's PUSH range", () => {
  it("shape L: a POWER rep that reported BLOCKER_BEATEN before it won is PUSH, whatever its margin (row POWER_BEATEN_FIRST)", () => {
    for (const latentMargin of [-5, 0, 6, 15, 30]) {
      expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin, beatenBeforeWin: true }))).toEqual({ approach: "PUSH", from: "FRONT", row: "POWER_BEATEN_FIRST" });
      expect(approachOf(threat({ origin: "WON_REP", alignment: "EDGE", move: "POWER", latentMargin, beatenBeforeWin: true }))).toEqual({ approach: "PUSH", from: "SIDE", row: "POWER_BEATEN_FIRST" });
    }
    // Shape L reads BEATEN, not the margin, so a POWER rep L knows was not beaten first needs none.
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", beatenBeforeWin: true })).row).toBe("POWER_BEATEN_FIRST");
  });

  it("shape L: a POWER rep that won without BLOCKER_BEATEN first is row 6, even on a margin in the PUSH range", () => {
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin: 6, beatenBeforeWin: false }))).toEqual({ approach: "THROUGH", from: "FRONT", row: "OTHER_WON_REP" });
    expect(approachOf(threat({ origin: "WON_REP", alignment: "EDGE", move: "POWER", latentMargin: 6, beatenBeforeWin: false }))).toEqual({ approach: "ARC", from: "SIDE", row: "OTHER_WON_REP" });
  });

  it("shape L leaves every other row as it was: the penetrator, edge speed, and a non-POWER move", () => {
    expect(approachOf(threat({ origin: "WON_REP", alignment: "EDGE", move: "SPEED", latentMargin: 6, beatenBeforeWin: true }))).toEqual({ approach: "ARC", from: "SIDE", row: "EDGE_SPEED_FINESSE" });
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin: 6, beatenBeforeWin: true, penetrator: true }))).toEqual({ approach: "THROUGH", from: "FRONT", row: "LOOPER_OR_PENETRATOR" });
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "FINESSE", latentMargin: 6, beatenBeforeWin: true }))).toEqual({ approach: "THROUGH", from: "FRONT", row: "OTHER_WON_REP" });
  });

  it("row 5 reads the PUSH range it is given, both ends included", () => {
    const narrow = { min: 3, max: 10 };
    for (const [latentMargin, approach] of [[2, "THROUGH"], [3, "PUSH"], [10, "PUSH"], [11, "THROUGH"]] as const) {
      expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin }), narrow).approach, String(latentMargin)).toBe(approach);
    }
    expect(approachOf(threat({ origin: "WON_REP", alignment: "INTERIOR", move: "POWER", latentMargin: 1 })).approach).toBe("PUSH");
  });

  it("pushMarginOf: the bundle's approach card, or step 0's 1 to 14 for tunables without one", () => {
    expect(pushMarginOf(DEFAULT_TUNABLES)).toBe(PUSH_MARGIN);
    expect(pushMarginOf(rulesTunables("legacy"))).toEqual({ min: 1, max: 14 });
    expect(pushMarginOf(rulesTunables("pocket-1.s1"))).toEqual({ min: POCKET_1_S1_OVERLAY.approach!.pushMinMargin, max: POCKET_1_S1_OVERLAY.approach!.pushMaxMargin });
    // The window moves with the card: withOverlay refuses a window whose range is not the card's PUSH
    // range (review CT-3), and the window alone is refused in engineRules.test.ts.
    const beat = POCKET_1_S1_OVERLAY.beatClock!;
    const card = withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", {
      ...POCKET_1_S1_OVERLAY,
      beatClock: { ...beat, pushWindow: { ...beat.pushWindow!, minMargin: 3, maxMargin: 10 } },
      approach: { pushMinMargin: 3, pushMaxMargin: 10 },
    });
    expect(pushMarginOf(card)).toEqual({ min: 3, max: 10 });
  });

  it("fromOfApproach: ARC from the SIDE and THROUGH from the FRONT always; FREE and PUSH by alignment", () => {
    expect(fromOfApproach("ARC", "INTERIOR")).toBe("SIDE");
    expect(fromOfApproach("ARC", "EDGE")).toBe("SIDE");
    expect(fromOfApproach("THROUGH", "EDGE")).toBe("FRONT");
    expect(fromOfApproach("THROUGH", "INTERIOR")).toBe("FRONT");
    expect(fromOfApproach("FREE", "EDGE")).toBe("SIDE");
    expect(fromOfApproach("FREE", "INTERIOR")).toBe("FRONT");
    expect(fromOfApproach("PUSH", "EDGE")).toBe("SIDE");
    expect(fromOfApproach("PUSH", "INTERIOR")).toBe("FRONT");
  });

  it("the rows: the table's seven, shape L's row 5, and PUBLISHED, which is not a row", () => {
    expect(APPROACH_ROWS).toEqual(["UNBLOCKED_FREE", "LOOPER_OR_PENETRATOR", "TOUCHED", "EDGE_SPEED_FINESSE", "POWER_1_TO_14", "POWER_BEATEN_FIRST", "OTHER_WON_REP", "NOT_BEATEN", "PUBLISHED"]);
    expect(DEFAULT_TUNABLES.passRush.bands.some((b) => b.label === BEATEN_BAND)).toBe(true);
  });
});

const RULES = { name: "pocket-1.s1", overlayDigest: POCKET_1_S1_DIGEST };
const uniform = (rngLabel: string, raw: number) => ({ die: "uniform", raw, modifiers: [], total: raw, rngLabel });
const playStart = (rush: readonly Record<string, string>[], rules?: typeof RULES) =>
  env({ type: "PLAY_START", payload: { kind: "PASS_PLAY_V1", defense: { rush }, ...(rules === undefined ? {} : { rules }) } });
const published = (rusher: string, origin: string, rollRef: string, alignment: string, approach?: string) =>
  env({ type: "RUSH_THREAT", payload: { rusher, alignment, origin, rollRef, etaTick: 2, state: "TRAVELLING", ...(approach === undefined ? {} : { approach }) } });

const S_RUSH = [
  { rusher: "dt1", move: "POWER", alignment: "INTERIOR" },
  { rusher: "dt2", move: "POWER", alignment: "INTERIOR" },
  { rusher: "de1", move: "SPEED", alignment: "EDGE" },
  { rusher: "de2", move: "POWER", alignment: "EDGE" },
  { rusher: "lb1", move: "SPEED", alignment: "INTERIOR" },
];

/**
 * A shape S play, as E-b writes one: each blocked matchup's rep, its `pass_rush_beat` (a uniform,
 * `rollRef` the rep), dieless ticks naming the beat, and each won rep's threat naming the beat,
 * every threat with its published approach. dt1 POWER margin 6 (PUSH), dt2 POWER margin 18
 * (THROUGH), de1 edge SPEED (ARC), de2 never beaten (BLOCKED), lb1 unblocked (FREE).
 */
function sPlay(approaches: Readonly<Record<string, string | undefined>> = { dt1: "PUSH", dt2: "THROUGH", de1: "ARC", lb1: "FREE" }, pocket1 = true) {
  const beat = (r: string, margin: number) => check("pass_rush_beat", `beat/${r}`, margin, { roll: uniform(`beat/${r}`, 0.42), rollRef: `rep/${r}` });
  const ticked = (r: string, band: string, margin: number) => dieless("pass_rush_tick", margin, { actors: [r, `ol-${r}`], band, rollRef: `beat/${r}` });
  return [
    playStart(S_RUSH, pocket1 ? RULES : undefined),
    published("lb1", "UNBLOCKED", "presnap/recognition", "INTERIOR", approaches["lb1"]),
    check("pass_rush_rep", "rep/dt1", 6, { band: "STALEMATE" }),
    beat("dt1", 6),
    check("pass_rush_rep", "rep/dt2", 18, { band: "RUSHER_WINS_REP" }),
    beat("dt2", 18),
    check("pass_rush_rep", "rep/de1", 9, { band: "STALEMATE" }),
    beat("de1", 9),
    check("pass_rush_rep", "rep/de2", -12, { band: "BLOCKER_CONTAINS" }),
    beat("de2", -12),
    ticked("dt1", "STALEMATE", 0),
    ticked("dt2", "RUSHER_WINS_REP", 15),
    published("dt2", "WON_REP", "beat/dt2", "INTERIOR", approaches["dt2"]),
    ticked("de2", "STALEMATE", 0),
    ticked("dt1", "RUSHER_WINS_REP", 15),
    published("dt1", "WON_REP", "beat/dt1", "INTERIOR", approaches["dt1"]),
    ticked("de1", "RUSHER_WINS_REP", 15),
    published("de1", "WON_REP", "beat/de1", "EDGE", approaches["de1"]),
  ];
}

/**
 * A shape L play: rolled ticks (`rollRef` the rep), a `PLAY_START` with `rules`. dt1 POWER, margin
 * 20: BLOCKER_BEATEN, then wins (PUSH). dt2 POWER, margin 6: wins at once (not PUSH under L). dt3
 * POWER, margin 6: wins, then BLOCKER_BEATEN (not PUSH: the beaten tick came after). de1 edge
 * SPEED: ARC.
 */
const L_RUSH = [
  { rusher: "dt1", move: "POWER", alignment: "INTERIOR" },
  { rusher: "dt2", move: "POWER", alignment: "INTERIOR" },
  { rusher: "dt3", move: "POWER", alignment: "EDGE" },
  { rusher: "de1", move: "SPEED", alignment: "EDGE" },
];
function lPlay(approaches: Readonly<Record<string, string | undefined>> = { dt1: "PUSH", dt2: "THROUGH", dt3: "ARC", de1: "ARC" }, pocket1 = true) {
  const tick = (r: string, t: string, band: string, margin: number) => check("pass_rush_tick", `tick/${r}/${t}`, margin, { actors: [r, `ol-${r}`], band, rollRef: `rep/${r}` });
  return [
    playStart(L_RUSH, pocket1 ? RULES : undefined),
    check("pass_rush_rep", "rep/dt1", 20, { band: "RUSHER_WINS_REP" }),
    check("pass_rush_rep", "rep/dt2", 6, { band: "STALEMATE" }),
    check("pass_rush_rep", "rep/dt3", 6, { band: "STALEMATE" }),
    check("pass_rush_rep", "rep/de1", 9, { band: "STALEMATE" }),
    tick("dt1", "1.0", BEATEN_BAND, 7),
    tick("dt2", "1.0", "RUSHER_WINS_REP", 16),
    published("dt2", "WON_REP", "tick/dt2/1.0", "INTERIOR", approaches["dt2"]),
    tick("dt3", "1.0", "RUSHER_WINS_REP", 15),
    published("dt3", "WON_REP", "tick/dt3/1.0", "EDGE", approaches["dt3"]),
    tick("dt1", "1.5", "RUSHER_WINS_REP", 18),
    published("dt1", "WON_REP", "tick/dt1/1.5", "INTERIOR", approaches["dt1"]),
    tick("dt3", "1.5", BEATEN_BAND, 6),
    tick("de1", "1.5", "RUSHER_WINS_REP", 15),
    published("de1", "WON_REP", "tick/de1/1.5", "EDGE", approaches["de1"]),
  ];
}

describe("ADR-089 step 1: the derivation learns shape S's join and shape L's PUSH", () => {
  it("shape S: a won rep's threat names its pass_rush_beat, and the beat names the rep whose margin row 5 reads", () => {
    const labels = deriveApproachesOfPlay(sPlay());
    const of = (r: string) => labels.get(r)?.label;
    expect(of("dt1")).toEqual({ approach: "PUSH", from: "FRONT", row: "POWER_1_TO_14" });
    expect(labels.get("dt1")?.facts.latentMargin).toBe(6);
    expect(labels.get("dt1")?.facts.beatenBeforeWin).toBeUndefined();
    expect(of("dt2")).toEqual({ approach: "THROUGH", from: "FRONT", row: "OTHER_WON_REP" });
    expect(labels.get("dt2")?.facts.latentMargin).toBe(18);
    expect(of("de1")).toEqual({ approach: "ARC", from: "SIDE", row: "EDGE_SPEED_FINESSE" });
    expect(of("de2")).toEqual({ approach: "BLOCKED", row: "NOT_BEATEN" });
    expect(of("lb1")).toEqual({ approach: "FREE", from: "FRONT", row: "UNBLOCKED_FREE" });
  });

  it("shape S: a beat that names no rep, or a rep missing from the play, is refused", () => {
    const noRef = sPlay().map((e) => {
      const ev = e.event as { type: string; payload: Record<string, unknown> };
      if (ev.type === "CHECK" && ev.payload["checkKind"] === "pass_rush_beat" && (ev.payload["roll"] as { rngLabel: string }).rngLabel === "beat/dt1") {
        const { rollRef: _r, ...rest } = ev.payload;
        return env({ type: "CHECK", payload: rest });
      }
      return e;
    });
    expect(() => deriveApproachesOfPlay(noRef)).toThrow(/dt1's pass_rush_beat names no rep/);
    const noRep = sPlay().filter((e) => !(e.event.type === "CHECK" && e.event.payload.roll?.rngLabel === "rep/dt2"));
    expect(() => deriveApproachesOfPlay(noRep)).toThrow(/dt2.*pass_rush_rep/);
  });

  it("shape L: PUSH is a POWER rep that reported BLOCKER_BEATEN before the tick that won, read in the play's order", () => {
    const labels = deriveApproachesOfPlay(lPlay());
    expect(labels.get("dt1")?.label).toEqual({ approach: "PUSH", from: "FRONT", row: "POWER_BEATEN_FIRST" });
    expect(labels.get("dt1")?.facts.beatenBeforeWin).toBe(true);
    expect(labels.get("dt2")?.label).toEqual({ approach: "THROUGH", from: "FRONT", row: "OTHER_WON_REP" });
    expect(labels.get("dt2")?.facts.beatenBeforeWin).toBe(false);
    expect(labels.get("dt3")?.label).toEqual({ approach: "ARC", from: "SIDE", row: "OTHER_WON_REP" });
    expect(labels.get("dt3")?.facts.beatenBeforeWin).toBe(false);
    expect(labels.get("de1")?.label).toEqual({ approach: "ARC", from: "SIDE", row: "EDGE_SPEED_FINESSE" });
  });

  it("legacy: the same rolled play with no rules stamp is labelled as at step 0, by the margin", () => {
    const legacy = lPlay({}, false);
    const labels = approachesOfPlay(legacy);
    expect(labels.get("dt1")?.label).toEqual({ approach: "THROUGH", from: "FRONT", row: "OTHER_WON_REP" });
    expect(labels.get("dt2")?.label).toEqual({ approach: "PUSH", from: "FRONT", row: "POWER_1_TO_14" });
    expect(labels.get("dt3")?.label).toEqual({ approach: "PUSH", from: "SIDE", row: "POWER_1_TO_14" });
    for (const t of labels.values()) {
      expect(t.facts.beatenBeforeWin).toBeUndefined();
      expect(t.derived).toBeUndefined();
    }
    expect(deriveApproachesOfPlay(legacy)).toEqual(labels);
  });
});

describe("ADR-089 step 1: under pocket-1 consumers read the published label; derived equals published", () => {
  it("shape S: every threat's label is its RUSH_THREAT.approach (row PUBLISHED), the derivation beside it, and they agree", () => {
    const labels = approachesOfPlay(sPlay());
    expect([...labels.keys()]).toEqual(["dt1", "dt2", "de1", "de2", "lb1"]);
    expect(labels.get("dt1")?.label).toEqual({ approach: "PUSH", from: "FRONT", row: "PUBLISHED" });
    expect(labels.get("dt2")?.label).toEqual({ approach: "THROUGH", from: "FRONT", row: "PUBLISHED" });
    expect(labels.get("de1")?.label).toEqual({ approach: "ARC", from: "SIDE", row: "PUBLISHED" });
    expect(labels.get("lb1")?.label).toEqual({ approach: "FREE", from: "FRONT", row: "PUBLISHED" });
    // Never a threat: BLOCKED, as derived, with nothing beside it.
    expect(labels.get("de2")?.label).toEqual({ approach: "BLOCKED", row: "NOT_BEATEN" });
    expect(labels.get("de2")?.derived).toBeUndefined();
    const derived = deriveApproachesOfPlay(sPlay());
    for (const [rusher, t] of labels) {
      if (t.derived === undefined) continue;
      expect(t.derived, rusher).toEqual(derived.get(rusher)?.label);
      expect(t.derived.approach, `${rusher}: derived equals published`).toBe(t.label.approach);
      expect(t.derived.from, rusher).toBe(t.label.from);
      expect(t.facts, rusher).toEqual(derived.get(rusher)?.facts);
    }
  });

  it("shape L: the same, with row 5 read off BLOCKER_BEATEN", () => {
    const labels = approachesOfPlay(lPlay());
    expect(labels.get("dt1")?.label).toEqual({ approach: "PUSH", from: "FRONT", row: "PUBLISHED" });
    expect(labels.get("dt1")?.derived).toEqual({ approach: "PUSH", from: "FRONT", row: "POWER_BEATEN_FIRST" });
    for (const [rusher, t] of labels) expect(t.derived?.approach, rusher).toBe(t.label.approach);
  });

  it("the published label wins where the two disagree: the cross-check is S-8's to make, not the reader's", () => {
    const labels = approachesOfPlay(sPlay({ dt1: "THROUGH", dt2: "THROUGH", de1: "ARC", lb1: "FREE" }));
    expect(labels.get("dt1")?.label).toEqual({ approach: "THROUGH", from: "FRONT", row: "PUBLISHED" });
    expect(labels.get("dt1")?.derived).toEqual({ approach: "PUSH", from: "FRONT", row: "POWER_1_TO_14" });
  });

  it("approachesOfGame reads each play by its own rules: a legacy play and a pocket-1 play in one game", () => {
    const second = lPlay({}, false).map((e) => ({ ...e, event: { ...e.event, playId: "g:p2" } }) as MatchEventEnvelope);
    const byPlay = approachesOfGame([...sPlay(), ...second]);
    expect(byPlay.get("g:p1")?.get("dt1")?.label.row).toBe("PUBLISHED");
    expect(byPlay.get("g:p2")?.get("dt2")?.label.row).toBe("POWER_1_TO_14");
  });

  it("refuses a pocket-1 RUSH_THREAT with no approach, a legacy one with one, and a value that is not a threat's approach", () => {
    expect(() => approachesOfPlay(sPlay({ dt1: "PUSH", dt2: undefined, de1: "ARC", lb1: "FREE" }))).toThrow(/pocket-1 play's RUSH_THREAT for rusher dt2 carries no approach \(P4\)/);
    expect(() => approachesOfPlay(sPlay({ dt1: "PUSH", dt2: "THROUGH", de1: "ARC", lb1: "FREE" }, false))).toThrow(/a legacy play \(no PLAY_START rules\) has a RUSH_THREAT that carries an approach/);
    for (const bad of ["BLOCKED", "BEHIND", "push"]) {
      expect(() => approachesOfPlay(sPlay({ dt1: bad, dt2: "THROUGH", de1: "ARC", lb1: "FREE" })), bad).toThrow(new RegExp(`dt1's RUSH_THREAT publishes approach ${bad}, not a threat's approach`));
    }
  });
});

// A real `pocket-1.s1` game, where every RUSH_THREAT carries the engine's approach and the
// derivation must agree with each (S-8).
describe("ADR-089 step 1: approachesOfGame on a real pocket-1.s1 game", () => {
  it.each(["flat", "gen"] as const)("%s golden game 0 (v7) under pocket-1.s1: every threat published, derived equals published", (league) => {
    let events: readonly MatchEventEnvelope[] = [];
    const tunables = rulesTunables("pocket-1.s1");
    goldenGames(league, (observation) => { events = observation.events; }, { first: 1, callerVersion: "v7", tunables });
    const byPlay = approachesOfGame(events, pushMarginOf(tunables));
    let threats = 0;
    for (const { event } of events) {
      if (event.type !== "RUSH_THREAT") continue;
      threats += 1;
      expect(event.payload.approach).toBeDefined();
      const t = byPlay.get(String(event.playId))?.get(String(event.payload.rusher));
      expect(t?.label.row).toBe("PUBLISHED");
      expect(t?.derived?.approach, `${String(event.playId)} ${String(event.payload.rusher)}`).toBe(t?.label.approach);
    }
    expect(threats).toBeGreaterThan(0);
  }, 120_000);
});
