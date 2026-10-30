/**
 * ADR-089 step 0 — M2, WHERE THE FORCING COMES FROM (plan §6.2; deviation O14; K1).
 *
 *  - constructed forced decisions: one set by the counter with the nearest threat far (M2's
 *    construct), one set by an arrival close in, one forced by the band floor alone, one censored;
 *  - the dice: S's uniform and L's undrawn jitter hang from `createRng(<game seed>, "adr-089:m2")`
 *    forked by the rep's roll label, and are pure functions of it;
 *  - on 5 golden games of each league, always on: the jitter formula `round((rusher - blocker) /
 *    passRush.repJitter.divisor)` reproduces every published `pass_rush_tick` margin exactly, and the
 *    TODAY replay equals the stream (every POCKET_STATUS and every WON_REP RUSH_THREAT).
 *
 * ADR-089 step 2 (plan §1.6, stream K2): M2 on real streams, `ARM_STREAM`. Constructed: the
 * forced decision under each rule (PER_RUSHER's is the first tick with a threat within C; the other
 * rules keep the status), the fold's one-arm guard, its zero-by-the-rule flag, the merge, TM's
 * construct `b.tm-399`, the Garwood interval and `streamTickMargin` against `s1Stream.ts`'s
 * `lMarginExact`. On golden games, always on: STREAM's rebuild equals the arm's own stream under
 * the legacy clock (A0), S (A1), L (A5), PER_RUSHER (B3) and the narrower counter (B4), with every
 * rolled tick's margin reproduced and S's dieless ticks counted apart; and on B4's first 16 gen
 * games the narrower counter's rebuild is needed (the plain counter misses a status there).
 */
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { armById } from "../src/pocket/arms.js";
import { tickJitter } from "../src/pocket/clocks.js";
import { goldenGames } from "../src/pocket/corpus.js";
import {
  ARM_L5,
  ARM_S,
  ARM_STREAM,
  ARM_TODAY,
  emptyM2Fold,
  emptyM2StreamFold,
  foldM2,
  foldM2Stream,
  foldM2StreamGame,
  foldTm399Game,
  forcedDecisionByRule,
  forcedDecisionOf,
  forcingRuleOf,
  M2_ARMS,
  M2_FAR_SECONDS,
  m2StreamSummary,
  m2Summary,
  m2UndrawnJitter,
  m2Uniform,
  m2ZeroByTheRule,
  mergeM2StreamFolds,
  poissonInterval95,
  replayGame,
  streamTickMargin,
  TM399_TRAVEL_SECONDS,
  wonRepIdentity,
  type ArmReplay,
  type ArmTick,
  type M2StreamFold,
  type RusherChannels,
} from "../src/pocket/m2ForcingSource.js";
import { lMarginExact } from "../src/pocket/s1Stream.js";

const T = DEFAULT_TUNABLES;

const rusher = (over: Partial<RusherChannels> & { readonly rusher: string }): RusherChannels => ({
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

const tickOf = (t: number, over: Partial<ArmTick>): ArmTick => ({
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

const replay = (ticks: readonly ArmTick[]): ArmReplay =>
  ({ playId: "p", start: undefined as never, ticks, wonRepEvents: [], publishedWonRepEvents: [], releaseTick: undefined, pursuitTick: undefined, escapeTick: undefined, jitterChecks: 0, jitterMismatches: 0, jitterSkipped: 0 }) as ArmReplay;

describe("M2's forced decision, constructed", () => {
  it("a counter-forced decision with no threat near is M2's construct, set by the highest counter", () => {
    const r = replay([
      tickOf(0.5, { status: "PRESSURE", counter: "PRESSURE", rushers: [rusher({ rusher: "dt1", pressure: 3 })] }),
      tickOf(1.0, {
        status: "COLLAPSING",
        counter: "COLLAPSING",
        rushers: [rusher({ rusher: "dt1", pressure: 5, counter: "COLLAPSING" }), rusher({ rusher: "de1", alignment: "EDGE", position: "DE", pressure: 2 })],
      }),
    ]);
    const f = forcedDecisionOf(r, T);
    expect(f).toMatchObject({ tick: 1.0, counterForces: true, arrivalForces: false, far: true, counterFar: true });
    expect(f?.setter?.rusher).toBe("dt1");
    const fold = emptyM2Fold();
    foldM2(fold, r, T, ARM_S);
    expect([fold.forced, fold.counterFar, fold.byAlignment.INTERIOR, fold.byPosition.DT]).toEqual([1, 1, 1, 1]);
  });

  it("a counter-forced decision with a threat within 0.5 s is not counted as far", () => {
    expect(M2_FAR_SECONDS).toBe(0.5);
    const r = replay([tickOf(1.5, { status: "IMMEDIATE", counter: "COLLAPSING", arrival: "IMMEDIATE", minTta: 0.5, liveThreats: 1, rushers: [rusher({ rusher: "dt1", pressure: 6, tta: 0.5, arrival: "IMMEDIATE" })] })]);
    const f = forcedDecisionOf(r, T);
    expect(f).toMatchObject({ tick: 1.5, counterForces: true, arrivalForces: true, far: false, counterFar: false });
  });

  it("an arrival-forced decision is not the counter's", () => {
    const r = replay([tickOf(2.0, { status: "IMMEDIATE", arrival: "IMMEDIATE", minTta: 0, liveThreats: 1, rushers: [rusher({ rusher: "lb1", position: "MLB", tta: 0, arrival: "IMMEDIATE", origin: "UNBLOCKED" })] })]);
    const f = forcedDecisionOf(r, T);
    expect(f).toMatchObject({ counterForces: false, arrivalForces: true, counterFar: false });
    expect(f?.setter).toBeUndefined();
    const fold = emptyM2Fold();
    foldM2(fold, r, T, ARM_L5);
    expect([fold.forced, fold.counterFar, fold.bandFarOnly]).toEqual([1, 0, 0]);
  });

  it("a band-floor forcing with nothing near is reported apart from the construct", () => {
    const r = replay([tickOf(1.0, { status: "COLLAPSING", bandFloor: "COLLAPSING", rushers: [rusher({ rusher: "dt1", band: "COLLAPSING" })] })]);
    const fold = emptyM2Fold();
    foldM2(fold, r, T, ARM_S);
    expect([fold.forced, fold.counterFar, fold.bandFarOnly]).toEqual([1, 0, 1]);
  });

  it("an arm that never forces before today's stop is censored (first-order, K1)", () => {
    const fold = emptyM2Fold();
    foldM2(fold, replay([tickOf(0.5, { status: "PRESSURE", counter: "PRESSURE" })]), T, ARM_S);
    expect([fold.dropbacks, fold.forced, fold.censored]).toEqual([1, 0, 1]);
    expect(m2Summary(fold)).toMatchObject({ censored: 1, censoredSharePct: 100 });
  });
});

describe("M2's dice (O14)", () => {
  it("S's uniform is in (0, 1] and a pure function of the game seed and the rep's label", () => {
    const u = m2Uniform("seed-a", "g:p1/rush/dt1:rep");
    expect(u).toBeGreaterThan(0);
    expect(u).toBeLessThanOrEqual(1);
    expect(m2Uniform("seed-a", "g:p1/rush/dt1:rep")).toBe(u);
    expect(m2Uniform("seed-a", "g:p1/rush/dt2:rep")).not.toBe(u);
    expect(m2Uniform("seed-b", "g:p1/rush/dt1:rep")).not.toBe(u);
  });

  it("L's undrawn jitter is the jitter formula on two d100s from the tick's fork", () => {
    const j = m2UndrawnJitter(T, "seed-a", "g:p1/rush/dt1:rep", 2.5);
    expect(m2UndrawnJitter(T, "seed-a", "g:p1/rush/dt1:rep", 2.5)).toBe(j);
    expect(Math.abs(j)).toBeLessThanOrEqual(Math.ceil(99 / T.passRush.repJitter.divisor));
  });

  it("the jitter formula rounds the rolled difference over the divisor", () => {
    const div = T.passRush.repJitter.divisor;
    expect(tickJitter(T, 80, 40)).toBe(Math.round(40 / div));
    expect(tickJitter(T, 40, 80)).toBe(Math.round(-40 / div));
    expect(tickJitter(T, 50, 50)).toBe(0);
  });

  it("names four arms: today, S with the window, L at R 5 and at R 8", () => {
    expect(M2_ARMS.map((a) => a.id)).toEqual(["today", "S-theta11-window", "L-R5", "L-R8"]);
  });
});

describe("M2 on 5 golden games of each league (always on)", () => {
  for (const league of ["gen", "flat"] as const) {
    it(`${league}: the jitter formula reproduces every pass_rush_tick margin, and TODAY equals the stream`, () => {
      let statusChecks = 0;
      let statusMismatches = 0;
      let threatChecks = 0;
      let threatMismatches = 0;
      let jitterChecks = 0;
      let jitterMismatches = 0;
      goldenGames(
        league,
        (o, snap, meta) => {
          for (const r of replayGame(o.events, { tunables: T, positions: positionsFromSnapshot(snap), gameSeed: meta.seed, arm: ARM_TODAY })) {
            for (const t of r.ticks) {
              statusChecks += 1;
              if (t.status !== t.published) statusMismatches += 1;
            }
            const id = wonRepIdentity(r);
            threatChecks += id.checks;
            threatMismatches += id.mismatches;
            jitterChecks += r.jitterChecks;
            jitterMismatches += r.jitterMismatches;
          }
        },
        { first: 5 },
      );
      expect(statusChecks).toBeGreaterThan(500);
      expect(threatChecks).toBeGreaterThan(300);
      expect(jitterChecks).toBeGreaterThan(2000);
      expect({ statusMismatches, threatMismatches, jitterMismatches }).toEqual({ statusMismatches: 0, threatMismatches: 0, jitterMismatches: 0 });
    }, 120_000);
  }
});

// --- ADR-089 step 2: M2 on real streams (ARM_STREAM) ----------------------------------------------------

const B3 = armById("B3").tunables;
const B4 = armById("B4").tunables;

/** A counter-forced tick far out at 1.0, then a threat within 0.5 s at 1.5. */
const counterThenThreat = (): ArmReplay =>
  replay([
    tickOf(1.0, { status: "COLLAPSING", counter: "COLLAPSING", minTta: 1.5, liveThreats: 1, rushers: [rusher({ rusher: "dt1", pressure: 5, counter: "COLLAPSING", tta: 1.5 })] }),
    tickOf(1.5, { status: "IMMEDIATE", counter: "COLLAPSING", arrival: "IMMEDIATE", minTta: 0.5, liveThreats: 1, rushers: [rusher({ rusher: "dt1", pressure: 6, counter: "COLLAPSING", tta: 0.5, arrival: "IMMEDIATE" })] }),
  ]);

describe("ADR-089 step 2: M2 on the arm's own stream, constructed (plan §1.6)", () => {
  it("ARM_STREAM is its own arm, not one of step 0's four", () => {
    expect(ARM_STREAM).toEqual({ id: "stream", kind: "STREAM" });
    expect(Object.isFrozen(ARM_STREAM)).toBe(true);
    expect(M2_ARMS.map((a) => a.id)).toEqual(["today", "S-theta11-window", "L-R5", "L-R8"]);
  });

  it("reads the forcing rule off the arm: absent is step 1's", () => {
    expect(forcingRuleOf(T)).toBe("STEP_1");
    expect(forcingRuleOf(armById("A1").tunables)).toBe("STEP_1");
    expect(forcingRuleOf(B3)).toBe("PER_RUSHER");
    expect(forcingRuleOf(B4)).toBe("COUNTER_LESS_SEEN");
  });

  it("under PER_RUSHER the forced decision is the first tick with a threat within C, not the status", () => {
    const r = counterThenThreat();
    expect(forcedDecisionOf(r, T)).toMatchObject({ tick: 1.0, counterFar: true });
    expect(forcedDecisionByRule(r, T)).toEqual(forcedDecisionOf(r, T));
    expect(B3.arrival.collapsingWithinSeconds).toBe(0.5);
    expect(forcedDecisionByRule(r, B3)).toMatchObject({ tick: 1.5, far: false, counterFar: false, counterForces: true });
    // The narrower counter keeps the status rule.
    expect(forcedDecisionByRule(r, B4)).toEqual(forcedDecisionOf(r, B4));
  });

  it("under PER_RUSHER an arrived threat forces, and a play with no threat within C is unforced", () => {
    const arrived = replay([tickOf(2.0, { status: "IMMEDIATE", arrival: "IMMEDIATE", minTta: 0, liveThreats: 1, rushers: [rusher({ rusher: "lb1", tta: 0, origin: "UNBLOCKED" })] })]);
    expect(forcedDecisionByRule(arrived, B3)).toMatchObject({ tick: 2.0, far: false });
    const far = replay([tickOf(1.0, { status: "IMMEDIATE", counter: "IMMEDIATE", minTta: 0.6, liveThreats: 1 })]);
    expect(forcedDecisionByRule(far, B3)).toBeUndefined();
    const fold = emptyM2StreamFold();
    foldM2Stream(fold, far, B3);
    expect([fold.dropbacks, fold.forced, fold.unforced]).toEqual([1, 0, 1]);
  });

  it("one fold reads one arm: a second rule or a second C is refused", () => {
    const fold = emptyM2StreamFold();
    foldM2Stream(fold, counterThenThreat(), B3);
    expect([fold.rule, fold.collapsingWithin, fold.forced, fold.counterFar]).toEqual(["PER_RUSHER", 0.5, 1, 0]);
    expect(() => foldM2Stream(fold, counterThenThreat(), T)).toThrow(/under PER_RUSHER and STEP_1/);
    const wideC: Tunables = { ...B3, arrival: { ...B3.arrival, collapsingWithinSeconds: 1.0 } };
    expect(() => foldM2Stream(fold, counterThenThreat(), wideC)).toThrow(/with C 0.5 and 1/);
  });

  it("calls PER_RUSHER's construct 0 by the rule only when C is at or inside the far line", () => {
    const at = emptyM2StreamFold();
    foldM2Stream(at, counterThenThreat(), B3);
    expect(m2ZeroByTheRule(at)).toBe(true);
    expect(m2StreamSummary(at)).toMatchObject({ arm: "stream", rule: "PER_RUSHER", zeroByTheRule: true, counterFar: 0 });
    const wide = emptyM2StreamFold();
    const wideC: Tunables = { ...B3, arrival: { ...B3.arrival, collapsingWithinSeconds: 1.0 } };
    const r = replay([tickOf(1.0, { status: "COLLAPSING", counter: "COLLAPSING", minTta: 0.8, liveThreats: 1, rushers: [rusher({ rusher: "dt1", pressure: 5, tta: 0.8 })] })]);
    foldM2Stream(wide, r, wideC);
    expect(wide.counterFar).toBe(1);
    expect(m2ZeroByTheRule(wide)).toBe(false);
    expect(m2StreamSummary(wide)).toMatchObject({ zeroByTheRule: null });
    const step1 = emptyM2StreamFold();
    foldM2Stream(step1, counterThenThreat(), T);
    expect([step1.counterFar, m2ZeroByTheRule(step1)]).toEqual([1, false]);
    expect(m2StreamSummary(step1)).toMatchObject({ rule: "STEP_1", zeroByTheRule: null, counterFarSharePct: 100, byAlignment: { INTERIOR: 1 }, byPosition: { DT: 1 } });
  });

  it("merges two folds of one arm by summing, and refuses two arms", () => {
    const a = emptyM2StreamFold();
    const b = emptyM2StreamFold();
    foldM2Stream(a, counterThenThreat(), T);
    foldM2Stream(b, counterThenThreat(), T);
    foldM2Stream(b, replay([tickOf(0.5, { status: "PRESSURE" })]), T);
    b.tm399 = { edge: 3, far: 1, farCB: 1 };
    const m = mergeM2StreamFolds(a, b);
    expect([m.rule, m.dropbacks, m.forced, m.unforced, m.counterFar, m.byPosition, m.tm399]).toEqual(["STEP_1", 3, 2, 1, 2, { DT: 2 }, { edge: 3, far: 1, farCB: 1 }]);
    expect(mergeM2StreamFolds(emptyM2StreamFold(), a)).toEqual(a);
    const c = emptyM2StreamFold();
    foldM2Stream(c, counterThenThreat(), B3);
    expect(() => mergeM2StreamFolds(a, c)).toThrow(/STEP_1 and PER_RUSHER/);
  });

  it("restates L's exact tick margin (lMarginExact) and today's sum off the arm's own clock", () => {
    const L = armById("A5").tunables;
    const R = L.passRush.repClock?.fullExpressionSeconds;
    expect(R).toBeDefined();
    for (let tick = 0.5; tick <= 10; tick += 0.5) {
      for (let rep = -12; rep <= 12; rep += 3) {
        for (const jitter of [-2, 0, 1]) {
          expect(streamTickMargin(L, tick, rep, jitter)).toBe(lMarginExact(tick, R as number, rep + jitter));
          expect(streamTickMargin(T, tick, rep, jitter)).toBe(rep + jitter);
        }
      }
    }
  });

  it("prints a count with its exact (Garwood) 95% interval", () => {
    const at = (k: number): readonly number[] => {
      const i = poissonInterval95(k);
      return [Number(i.lo.toFixed(4)), Number(i.hi.toFixed(4))];
    };
    expect(at(0)).toEqual([0, 3.6889]);
    expect(at(1)).toEqual([0.0253, 5.5716]);
    expect(at(2)).toEqual([0.2422, 7.2247]);
    expect(at(10)).toEqual([4.7954, 18.3904]);
    expect(() => poissonInterval95(-1)).toThrow(RangeError);
    expect(() => poissonInterval95(1.5)).toThrow(RangeError);
  });
});

describe("ADR-089 step 2: TM's construct b.tm-399 (each rusher's first WON_REP threat, EDGE, travel 2.5 s or more)", () => {
  const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
  const env = (playId: string, event: Record<string, unknown>): MatchEventEnvelope => ({ seq: 0, at: AT, event: { gameId: "g", playId, ...event } as never });
  const start = (playId: string, kind = "PASS_PLAY_V1"): MatchEventEnvelope =>
    env(playId, {
      type: "PLAY_START",
      payload: {
        kind,
        offense: { team: "OFF", call: "SMASH", readSystem: "HALF_FIELD", quarterback: "qb" },
        defense: { team: "DEF", rush: [{ rusher: "cb1", move: "SPEED", alignment: "EDGE", side: "LEFT", gap: "D" }] },
        situation: { down: 1, distance: 10, ballOn: 25, clockSeconds: 900 },
      },
    });
  const threat = (playId: string, rusher: string, origin: string, alignment: string, etaTick: number): MatchEventEnvelope =>
    env(playId, { type: "RUSH_THREAT", payload: { rusher, origin, alignment, state: "TRAVELLING", etaTick } });
  const tickAt = (playId: string, t: number): MatchEventEnvelope => env(playId, { type: "TICK", payload: { tick: t } });

  it("counts the first edge WON_REP threat per rusher and dropback, its travel from the tick it was published, and the cornerbacks", () => {
    expect(TM399_TRAVEL_SECONDS).toBe(2.5);
    const positions = new Map<PlayerId, Position>([["cb1" as PlayerId, "CB" as Position], ["de1" as PlayerId, "DE" as Position]]);
    const events = [
      start("p1"),
      tickAt("p1", 0.5),
      threat("p1", "cb1", "WON_REP", "EDGE", 3.0), // travel 2.5: far, a CB
      threat("p1", "cb1", "WON_REP", "EDGE", 2.0), // his second: not counted
      threat("p1", "de1", "WON_REP", "EDGE", 2.9), // travel 2.4: edge, not far
      threat("p1", "dt1", "WON_REP", "INTERIOR", 5.0), // interior
      threat("p1", "lb1", "UNBLOCKED", "EDGE", 5.0), // not won on a rep
      start("p2"),
      tickAt("p2", 1.0),
      threat("p2", "cb1", "WON_REP", "EDGE", 3.5), // a new dropback: counted again, far
      start("r1", "RUN_PLAY_V1"),
      threat("r1", "cb1", "WON_REP", "EDGE", 9.0), // not a dropback
    ];
    const fold = { edge: 0, far: 0, farCB: 0 };
    foldTm399Game(fold, events, positions);
    expect(fold).toEqual({ edge: 3, far: 2, farCB: 2 });
  });
});

describe("ADR-089 step 2: M2 STREAM on 5 golden games of each league (always on)", () => {
  /** The STREAM fold of the arm's own first `first` golden games of one league. */
  const streamOf = (tunables: Tunables, league: "flat" | "gen", first: number): M2StreamFold => {
    const fold = emptyM2StreamFold();
    goldenGames(league, (o, snap) => foldM2StreamGame(fold, o.events, tunables, positionsFromSnapshot(snap)), { tunables, callerVersion: "v7", first });
    return fold;
  };
  for (const league of ["flat", "gen"] as const) {
    it(`${league}: the rebuild equals each arm's own stream (legacy, S, L, PER_RUSHER, the narrower counter)`, () => {
      const lines: string[] = [];
      for (const id of ["A0", "A1", "A5", "B3", "B4"] as const) {
        const f = streamOf(armById(id).tunables, league, 5);
        lines.push(`${id}: ${JSON.stringify(m2StreamSummary(f))}`);
        expect(f.statusChecks, id).toBeGreaterThan(1000);
        expect(f.threatChecks, id).toBeGreaterThan(50);
        expect({ id, statusMismatches: f.statusMismatches, threatMismatches: f.threatMismatches, jitterMismatches: f.jitterMismatches }).toEqual({ id, statusMismatches: 0, threatMismatches: 0, jitterMismatches: 0 });
        if (id === "A1" || id === "B3" || id === "B4") {
          // Shape S: every tick dieless, counted apart, none checked.
          expect([f.jitterChecks, f.jitterSkipped > 1000], id).toEqual([0, true]);
        } else {
          expect([f.jitterChecks > 1000, f.jitterSkipped], id).toEqual([true, 0]);
        }
        expect(f.dropbacks, id).toBe(f.forced + f.unforced);
        expect(f.tm399.edge, id).toBeGreaterThan(0);
      }
      const b3 = streamOf(B3, league, 5);
      expect([b3.rule, m2ZeroByTheRule(b3), b3.counterFar]).toEqual(["PER_RUSHER", true, 0]);
      console.log(`M2 STREAM, ${league}, first 5:\n${lines.join("\n")}`);
    }, 300_000);
  }

  it("gen, B4's first 16 games: the narrower counter's rebuild is needed (the plain counter misses a status there)", () => {
    const { forcing: _forcing, ...plainPocket } = B4.pocket;
    const plain = { ...B4, pocket: plainPocket } as Tunables;
    expect(forcingRuleOf(plain)).toBe("STEP_1");
    const narrower = emptyM2StreamFold();
    const counter = emptyM2StreamFold();
    goldenGames(
      "gen",
      (o, snap) => {
        const positions = positionsFromSnapshot(snap);
        foldM2StreamGame(narrower, o.events, B4, positions);
        foldM2StreamGame(counter, o.events, plain, positions);
      },
      { tunables: B4, callerVersion: "v7", first: 16 },
    );
    expect(narrower.statusMismatches).toBe(0);
    expect(counter.statusMismatches).toBeGreaterThan(0);
    console.log(`B4 gen first 16: narrower ${String(narrower.statusMismatches)} of ${String(narrower.statusChecks)}, plain counter ${String(counter.statusMismatches)} of ${String(counter.statusChecks)}`);
  }, 300_000);
});
