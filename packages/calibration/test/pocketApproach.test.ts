/**
 * ADR-089 step 0 — THE APPROACH LABEL ON LEGACY FACTS (plan §3.6, §3.7; ADR-089 §4.0, lines 382-394).
 *
 * One case per row of §4.0's table, in its order (so the first row that fits wins), plus the
 * steps 1-2 rule for a touched man; the stream reader on a constructed play; and the reader on
 * real games, where every threat must be labelled and every justifying CHECK found.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import {
  APPROACHES,
  approachesOfGame,
  approachesOfPlay,
  approachOf,
  LOOPER_FREE_BAND,
  LOOPER_TOUCHED_BAND,
  PICKUP_FREE_BAND,
  PICKUP_TOUCHED_BAND,
  type ApproachFacts,
} from "../src/pocket/approach.js";
import { goldenGames } from "../src/pocket/corpus.js";

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
