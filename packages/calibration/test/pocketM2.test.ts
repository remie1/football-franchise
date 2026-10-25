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
 */
import { DEFAULT_TUNABLES } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { tickJitter } from "../src/pocket/clocks.js";
import { goldenGames } from "../src/pocket/corpus.js";
import {
  ARM_L5,
  ARM_S,
  ARM_TODAY,
  emptyM2Fold,
  foldM2,
  forcedDecisionOf,
  M2_ARMS,
  M2_FAR_SECONDS,
  m2Summary,
  m2UndrawnJitter,
  m2Uniform,
  replayGame,
  wonRepIdentity,
  type ArmReplay,
  type ArmTick,
  type RusherChannels,
} from "../src/pocket/m2ForcingSource.js";

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
  ({ playId: "p", start: undefined as never, ticks, wonRepEvents: [], publishedWonRepEvents: [], releaseTick: undefined, pursuitTick: undefined, escapeTick: undefined, jitterChecks: 0, jitterMismatches: 0 }) as ArmReplay;

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
