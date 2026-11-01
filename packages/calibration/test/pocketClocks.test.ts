/**
 * ADR-089 step 0 — THE TWO BLOCK CLOCKS, CLOSED FORM (plan §6.1).
 *
 * Shape S's breaking time and the push window (§4.1, §4.1.1), shape L's margin and its crossing
 * time, and the late block on both shapes (§4.4.2), at the provisional values. Nothing plays.
 */
import { DEFAULT_TUNABLES } from "@ff/engine";
import { describe, expect, it } from "vitest";
import {
  PUSH_WINDOW,
  SHAPE_S_PROVISIONAL,
  beatTickOf,
  clockOf,
  exponentialOf,
  lateBreakingTimeS,
  lateMarginL,
  lateRepMargin,
  passRushBandOf,
  pushWindowApplies,
  pushWindowTicks,
  shapeLCrossingTime,
  shapeLFirstWin,
  shapeLMargin,
  shapeSBreakingTime,
  shapeSBrokenBy,
  shapeSReportedMargin,
  shapeSScale,
  tickJitter,
  ticksOf,
} from "../src/pocket/clocks.js";
import { lateLMarginExact } from "../src/pocket/s1Stream.js";

const T = DEFAULT_TUNABLES;
const clock = clockOf(T);

describe("the clock grid", () => {
  it("reads today's clock: first tick 0.5 s, step 0.5 s, last 6.0 s", () => {
    expect(clock).toEqual({ firstTick: 0.5, tickStepSeconds: 0.5, maxTick: 6.0 });
    const ticks = ticksOf(clock);
    expect(ticks.length).toBe(12);
    expect(ticks[0]).toBe(0.5);
    expect(ticks[11]).toBe(6.0);
  });
});

describe("shape S, the breaking time (ADR-089 §4.1)", () => {
  it("is theta * exp(-beta m/41) * E^(1/k) at the provisional 11 / 2 / 0.5", () => {
    expect(SHAPE_S_PROVISIONAL).toEqual({ theta: 11, k: 2, beta: 0.5 });
    expect(shapeSScale(0)).toBe(11);
    expect(shapeSScale(41)).toBeCloseTo(11 * Math.exp(-0.5), 12);
    expect(shapeSScale(-41)).toBeCloseTo(11 * Math.exp(0.5), 12);
    expect(shapeSBreakingTime(0, Math.exp(-1))).toBeCloseTo(11, 12);
    expect(shapeSBreakingTime(0, Math.exp(-0.25))).toBeCloseTo(5.5, 12);
    expect(shapeSBreakingTime(41, Math.exp(-0.25))).toBeCloseTo(5.5 * Math.exp(-0.5), 12);
    expect(shapeSBreakingTime(0, Math.exp(-0.25), SHAPE_S_PROVISIONAL, 1.0)).toBeCloseTo(6.5, 12);
    expect(shapeSBreakingTime(0, 1)).toBe(0);
  });

  it("has F(T(u)) = 1 - u, and F is 0 before the block starts", () => {
    for (const m of [-20, 0, 7, 14, 30]) {
      for (const u of [0.05, 0.3, 0.5, 0.9]) expect(shapeSBrokenBy(shapeSBreakingTime(m, u), m)).toBeCloseTo(1 - u, 12);
    }
    expect(shapeSBrokenBy(0, 5)).toBe(0);
    expect(shapeSBrokenBy(0.9, 5, SHAPE_S_PROVISIONAL, 1.0)).toBe(0);
    expect(shapeSBrokenBy(1.0, 0)).toBeCloseTo(1 - Math.exp(-((1 / 11) ** 2)), 12);
  });

  it("refuses a uniform outside (0, 1]", () => {
    expect(() => exponentialOf(0)).toThrow(RangeError);
    expect(() => exponentialOf(1.2)).toThrow(RangeError);
    expect(exponentialOf(1)).toBe(0);
  });

  it("is beaten on the first tick at or after T, the earliest being 0.5 s", () => {
    expect(beatTickOf(0, clock)).toBe(0.5);
    expect(beatTickOf(0.1, clock)).toBe(0.5);
    expect(beatTickOf(0.5, clock)).toBe(0.5);
    expect(beatTickOf(0.5000001, clock)).toBe(1.0);
    expect(beatTickOf(1.2, clock)).toBe(1.5);
    expect(beatTickOf(1.5, clock)).toBe(1.5);
    expect(beatTickOf(6.0, clock)).toBe(6.0);
    expect(beatTickOf(6.01, clock)).toBeUndefined();
    expect(() => beatTickOf(Number.POSITIVE_INFINITY, clock)).toThrow(RangeError);
  });

  it("reports min(0, m) before the beat and max(15, m) from the beat on", () => {
    const rep = { m: 10, move: "SPEED", beatTick: 2.0 };
    expect(ticksOf(clock).map((t) => shapeSReportedMargin(t, rep, clock, true))).toEqual([0, 0, 0, 15, 15, 15, 15, 15, 15, 15, 15, 15]);
    expect(shapeSReportedMargin(1.0, { m: -8, move: "SPEED", beatTick: 3.0 }, clock, true)).toBe(-8);
    expect(shapeSReportedMargin(3.5, { m: 22, move: "POWER", beatTick: 0.5 }, clock, true)).toBe(22);
    expect(shapeSReportedMargin(4.0, { m: 6, move: "POWER", beatTick: undefined }, clock, true)).toBe(0);
    expect(passRushBandOf(T, shapeSReportedMargin(1.0, rep, clock, true))).toBe("STALEMATE");
    expect(passRushBandOf(T, shapeSReportedMargin(2.0, rep, clock, true))).toBe("RUSHER_WINS_REP");
  });
});

describe("the push window (ADR-089 §4.1.1)", () => {
  it("applies to POWER reps with latent margin 1 to 14 only", () => {
    expect(PUSH_WINDOW.lengthSeconds).toBe(1.0);
    expect(pushWindowApplies("POWER", 1)).toBe(true);
    expect(pushWindowApplies("POWER", 14)).toBe(true);
    expect(pushWindowApplies("POWER", 0)).toBe(false);
    expect(pushWindowApplies("POWER", 15)).toBe(false);
    expect(pushWindowApplies("SPEED", 8)).toBe(false);
    expect(pushWindowApplies("FINESSE", 8)).toBe(false);
  });

  it("reports min(m, 4) on t_b - 1.0 (GAINING) and max(m, 5) on t_b - 0.5 (BEATEN), for every margin 1 to 14", () => {
    for (let m = 1; m <= 14; m += 1) {
      const w = pushWindowTicks(2.0, m, clock);
      expect(w).toEqual([
        { tick: 1.0, margin: Math.min(m, 4) },
        { tick: 1.5, margin: Math.max(m, 5) },
      ]);
      expect(passRushBandOf(T, w[0]?.margin as number)).toBe("RUSHER_GAINING");
      expect(passRushBandOf(T, w[1]?.margin as number)).toBe("BLOCKER_BEATEN");
    }
  });

  it("drops a window tick before 0.5 s: a 1.0 s break reports only t_b - 0.5, a 0.5 s break reports none", () => {
    expect(pushWindowTicks(1.0, 3, clock)).toEqual([{ tick: 0.5, margin: 5 }]);
    expect(pushWindowTicks(0.5, 3, clock)).toEqual([]);
    expect(pushWindowTicks(1.5, 9, clock)).toEqual([
      { tick: 0.5, margin: 4 },
      { tick: 1.0, margin: 9 },
    ]);
  });

  it("puts the window into the reported series only when it is on and the rep qualifies", () => {
    const rep = { m: 10, move: "POWER", beatTick: 2.0 };
    expect(ticksOf(clock).slice(0, 5).map((t) => shapeSReportedMargin(t, rep, clock, true))).toEqual([0, 4, 10, 15, 15]);
    expect(ticksOf(clock).slice(0, 5).map((t) => shapeSReportedMargin(t, rep, clock, false))).toEqual([0, 0, 0, 15, 15]);
    const narrow = { m: 2, move: "POWER", beatTick: 1.5 };
    expect(ticksOf(clock).slice(0, 4).map((t) => shapeSReportedMargin(t, narrow, clock, true))).toEqual([2, 5, 15, 15]);
    const wide = { m: 16, move: "POWER", beatTick: 2.0 };
    expect(ticksOf(clock).slice(0, 4).map((t) => shapeSReportedMargin(t, wide, clock, true))).toEqual([0, 0, 0, 16]);
  });
});

describe("shape L, the gradual clock (ADR-089 §4.1)", () => {
  it("is round(min(1, t/R) * (repMargin + jitter)), with m(0) = 0", () => {
    expect(shapeLMargin(0, 5, 20, 4)).toBe(0);
    expect(shapeLMargin(2.5, 5, 20, 4)).toBe(12);
    expect(shapeLMargin(5, 5, 20, 4)).toBe(24);
    expect(shapeLMargin(6, 5, 20, 4)).toBe(24);
    expect(shapeLMargin(6, 8, 20, 4)).toBe(18); // 0.75 at the last tick when R = 8
    expect(shapeLMargin(1, 5, -7, 0)).toBe(-1); // round(-1.4)
    expect(Object.is(shapeLMargin(0.5, 5, -3, 0), 0)).toBe(true); // round(-0.3) is -0; reported as 0
    expect(() => shapeLMargin(1, 0, 1, 1)).toThrow(RangeError);
    expect(() => shapeLMargin(-0.5, 5, 1, 1)).toThrow(RangeError);
  });

  it("equals today's tick from t >= R, and at R = 8 never exceeds 0.75 of it in a play", () => {
    for (const t of ticksOf(clock)) {
      if (t >= 5) expect(shapeLMargin(t, 5, 13, 3)).toBe(16);
      expect(Math.abs(shapeLMargin(t, 8, 30, 10))).toBeLessThanOrEqual(30);
    }
  });

  it("interpolates the crossing time within the tick, clamped to (t - 0.5, t]", () => {
    expect(shapeLCrossingTime(2.0, 10, 20)).toBeCloseTo(1.75, 12);
    expect(shapeLCrossingTime(2.0, 14, 15)).toBe(2.0);
    expect(shapeLCrossingTime(0.5, 0, 30)).toBeCloseTo(0.25, 12);
    expect(shapeLCrossingTime(3.0, -5, 35)).toBeCloseTo(2.5 + 0.5 * 0.5, 12);
    const c = shapeLCrossingTime(1.0, 14.999999, 1e9);
    expect(c).toBeGreaterThan(0.5);
    expect(c).toBeLessThanOrEqual(1.0);
    expect(() => shapeLCrossingTime(2.0, 15, 20)).toThrow(RangeError);
    expect(() => shapeLCrossingTime(2.0, 10, 14)).toThrow(RangeError);
  });

  it("finds the first win of a series and starts it from m(0) = 0", () => {
    const ticks = ticksOf(clock);
    const margins = ticks.map((t) => shapeLMargin(t, 5, 25, 0)); // 3, 5, 8, 10, 13, 15, ...
    expect(margins.slice(0, 6)).toEqual([3, 5, 8, 10, 13, 15]);
    expect(shapeLFirstWin(ticks, margins)).toEqual({ tick: 3.0, crossing: 3.0 });
    expect(shapeLFirstWin([0.5, 1.0], [30, 40])).toEqual({ tick: 0.5, crossing: 0.25 });
    expect(shapeLFirstWin([0.5, 1.0], [3, 4])).toBeUndefined();
    expect(() => shapeLFirstWin([0.5], [1, 2])).toThrow(RangeError);
  });
});

describe("the late block on both shapes (ADR-089 §4.4.2)", () => {
  it("turns the touching CHECK's margin round: RAN_THROUGH and LATE_EXCHANGE span -19 to -1, so 1 to 19", () => {
    const ranThrough = T.blitzPickup.bands.findIndex((b) => b.label === "RAN_THROUGH");
    const lateExchange = T.stunt.bands.findIndex((b) => b.label === "LATE_EXCHANGE");
    expect(T.blitzPickup.bands[ranThrough]?.minMargin).toBe(-19);
    expect(T.blitzPickup.bands[ranThrough - 1]?.minMargin).toBe(0);
    expect(T.stunt.bands[lateExchange]?.minMargin).toBe(-19);
    expect(T.stunt.bands[lateExchange - 1]?.minMargin).toBe(0);
    expect(lateRepMargin(-19)).toBe(19);
    expect(lateRepMargin(-1)).toBe(1);
  });

  it("S: T = t_e + w * theta * exp(-beta m/41) * E^(1/k)", () => {
    const m = 7;
    expect(lateBreakingTimeS(m, Math.exp(-1), 1.0, 2)).toBeCloseTo(1.0 + 2 * 11 * Math.exp((-0.5 * 7) / 41), 12);
    expect(lateBreakingTimeS(m, 1, 1.5, 3)).toBe(1.5);
    expect(lateBreakingTimeS(m, Math.exp(-0.25), 1.0, 1)).toBeCloseTo(shapeSBreakingTime(m, Math.exp(-0.25), SHAPE_S_PROVISIONAL, 1.0), 12);
    expect(() => lateBreakingTimeS(m, 0.5, 1, 0)).toThrow(RangeError);
  });

  it("L: round(min(t - t_e, w R) * (m + jitter) / (w R)), AM-2's float form, from t_e on", () => {
    // Review CT-F5: the tie where min(1, (t - t_e)/(w R)) * x rounds the other way (-26).
    expect(lateMarginL(0.8, 0.5, 0.1, 4, -30, -4)).toBe(-25);
    expect(lateMarginL(0.8, 0.5, 0.1, 4, -30, -4)).toBe(lateLMarginExact(0.8, 0.5, 0.1, 4, -34));
    expect(lateMarginL(1.0, 1.0, 2, 5, 9, 3)).toBe(0);
    expect(lateMarginL(6.0, 1.0, 2, 5, 9, 3)).toBe(6); // 0.5 * 12
    expect(lateMarginL(11.0, 1.0, 2, 5, 9, 3)).toBe(12);
    expect(lateMarginL(3.5, 1.0, 1, 5, 9, 3)).toBe(6);
    expect(() => lateMarginL(0.5, 1.0, 2, 5, 9, 3)).toThrow(RangeError);
    expect(() => lateMarginL(2, 1.0, 0, 5, 9, 3)).toThrow(RangeError);
  });
});

describe("bands and today's jitter", () => {
  it("re-bands through passRush.bands", () => {
    expect(passRushBandOf(T, 15)).toBe("RUSHER_WINS_REP");
    expect(passRushBandOf(T, 14)).toBe("BLOCKER_BEATEN");
    expect(passRushBandOf(T, 5)).toBe("BLOCKER_BEATEN");
    expect(passRushBandOf(T, 4)).toBe("RUSHER_GAINING");
    expect(passRushBandOf(T, 1)).toBe("RUSHER_GAINING");
    expect(passRushBandOf(T, 0)).toBe("STALEMATE");
    expect(passRushBandOf(T, -14)).toBe("BLOCKER_CONTAINS");
    expect(passRushBandOf(T, -15)).toBe("BLOCKER_RESETS");
  });

  it("restates the tick jitter as round((rusher - blocker)/4)", () => {
    expect(T.passRush.repJitter.divisor).toBe(4);
    expect(tickJitter(T, 60, 49)).toBe(3);
    expect(tickJitter(T, 49, 60)).toBe(-3);
    expect(tickJitter(T, 50, 48)).toBe(1); // Math.round(0.5)
    expect(tickJitter(T, 48, 50) + 0).toBe(0); // Math.round(-0.5) is -0
  });
});
