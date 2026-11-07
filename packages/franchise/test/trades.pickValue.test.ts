import { describe, it, expect } from "vitest";
import { staffId } from "@ff/contracts";
import {
  PICK_COUNT, marketValue, productionValue, objectiveValue, FUTURE_DISCOUNT, GM_CURVES, GM_CURVE_NAMES, gmCurveValue,
  drawPickCurve, pickCurveOf, drawFuturePickDial, PICK_CURVE, classGrade, classMultiplier, landingSpread, gmPickValue,
} from "../src/index.js";

// ADR-095 §4, §4b: pick values.
const slots = Array.from({ length: PICK_COUNT }, (_, i) => i + 1);
const total = (f: (n: number) => number) => slots.reduce((s, n) => s + f(n), 0);
const argmax = (f: (n: number) => number) => slots.reduce((b, n) => (f(n) > f(b) ? n : b), 1);

describe("the objective curves (counted)", () => {
  it("start at 1 for the first pick and fall, the market steeper than production", () => {
    expect(marketValue(1)).toBe(1);
    expect(productionValue(1)).toBe(1);
    for (const n of [2, 10, 32, 64, 128, 256]) {
      expect(marketValue(n)).toBeLessThan(marketValue(n - 1));
      expect(marketValue(n)).toBeLessThan(productionValue(n));
    }
    // The fitted points: the market prices pick 32 at about 31% of pick 1, production at about 55%.
    expect(marketValue(32)).toBeCloseTo(0.31, 1);
    expect(productionValue(32)).toBeCloseTo(0.55, 1);
  });

  it("the time preference makes next year's pick about a round lower (the reported rule of thumb)", () => {
    const nextYearMidFirst = FUTURE_DISCOUNT * marketValue(16);
    const eq = slots.reduce((b, n) => (Math.abs(marketValue(n) - nextYearMidFirst) < Math.abs(marketValue(b) - nextYearMidFirst) ? n : b), 1);
    expect(eq).toBeGreaterThanOrEqual(40);
    expect(eq).toBeLessThanOrEqual(50);
  });
});

describe("GM curves (owner's ruling 14:37Z)", () => {
  it("every curve adds up to the same whole-draft total: it moves value between rounds, never adds", () => {
    for (const k of GM_CURVE_NAMES) expect(total((n) => gmCurveValue(k, n))).toBeCloseTo(total(objectiveValue), 6);
  });

  it("each shape puts its value where it says", () => {
    expect(gmCurveValue("TOP_HEAVY", 1)).toBeGreaterThan(objectiveValue(1));
    expect(gmCurveValue("TOP_HEAVY", 100)).toBeLessThan(objectiveValue(100));
    expect(argmax((n) => gmCurveValue("MIDDLE_ROUNDS", n))).toBeGreaterThan(32);
    expect(argmax((n) => gmCurveValue("MIDDLE_ROUNDS", n))).toBeLessThanOrEqual(128);
    expect(argmax((n) => gmCurveValue("DAY_TWO", n))).toBeGreaterThan(32);
    expect(argmax((n) => gmCurveValue("DAY_TWO", n))).toBeLessThanOrEqual(96);
    expect(gmCurveValue("TOP_TEN_OR_BUST", 5) / gmCurveValue("TOP_TEN_OR_BUST", 40)).toBeGreaterThan(gmCurveValue("TOP_HEAVY", 5) / gmCurveValue("TOP_HEAVY", 40));
    expect(gmCurveValue("LATE_ROUND_FINDER", 200)).toBeGreaterThan(objectiveValue(200) * 2);
    expect(gmCurveValue("VOLUME", 200) / gmCurveValue("VOLUME", 1)).toBeGreaterThan(0.3);
    expect(gmCurveValue("EVEN_HANDED", 50)).toBeCloseTo(objectiveValue(50), 9);
  });

  it("shares add to 1; the draw is fixed by man and seed; a held curve wins over the draw", () => {
    expect(GM_CURVE_NAMES.reduce((s, k) => s + GM_CURVES[k].share, 0)).toBeCloseTo(1, 9);
    const gm = { id: staffId("GM-1"), attributes: {} };
    expect(drawPickCurve(gm, "s")).toBe(drawPickCurve(gm, "s"));
    expect(pickCurveOf({ ...gm, attributes: { [PICK_CURVE]: GM_CURVE_NAMES.indexOf("VOLUME") } }, "s")).toBe("VOLUME");
    const seen = new Set(Array.from({ length: 400 }, (_, i) => drawPickCurve({ id: staffId(`G${i}`) }, "s")));
    expect(seen.size).toBe(GM_CURVE_NAMES.length);
    const dials = Array.from({ length: 200 }, (_, i) => drawFuturePickDial({ id: staffId(`G${i}`) }, "s", 90));
    expect(dials.reduce((s, d) => s + d, 0) / dials.length).toBeGreaterThan(1.1);
    expect(Math.min(...dials)).toBeGreaterThanOrEqual(0.5);
  });
});

describe("a GM's value of a pick", () => {
  it("blends 80/20, tilts by course, discounts by year with his dial, and follows the class", () => {
    const base = gmPickValue({ at: 10, yearsAhead: 0, curve: "EVEN_HANDED" });
    expect(base).toBeCloseTo(objectiveValue(10), 9);
    expect(gmPickValue({ at: 10, yearsAhead: 0, curve: "EVEN_HANDED", direction: "REBUILD" })).toBeCloseTo(base * 1.1, 9);
    expect(gmPickValue({ at: 10, yearsAhead: 0, curve: "EVEN_HANDED", direction: "CONTEND" })).toBeCloseTo(base * 0.9, 9);
    expect(gmPickValue({ at: 10, yearsAhead: 1, curve: "EVEN_HANDED" })).toBeCloseTo(base * FUTURE_DISCOUNT, 9);
    expect(gmPickValue({ at: 10, yearsAhead: 1, curve: "EVEN_HANDED", dial: 0.5 })).toBeGreaterThan(gmPickValue({ at: 10, yearsAhead: 1, curve: "EVEN_HANDED" }));
    expect(gmPickValue({ at: 10, yearsAhead: 0, curve: "EVEN_HANDED", classStrength: 0.061 })).toBeCloseTo(base * (1 + 0.126), 9);
    expect(gmPickValue({ at: 50, yearsAhead: 0, curve: "EVEN_HANDED", classStrength: 0.061 })).toBeCloseTo(objectiveValue(50) * 1.061, 9);
  });

  it("a Top-heavy GM loves a pick that might be top five more than its likely slot says", () => {
    const spread = landingSpread(12, 1);
    expect(spread.reduce((s, l) => s + l.p, 0)).toBeCloseTo(1, 9);
    const asSpread = gmPickValue({ at: spread, yearsAhead: 0, curve: "TOP_HEAVY" });
    const atMean = gmPickValue({ at: Math.round(spread.reduce((s, l) => s + l.p * l.slot, 0)), yearsAhead: 0, curve: "TOP_HEAVY" });
    expect(asSpread).toBeGreaterThan(atMean);
  });

  it("further drafts drift toward the middle and widen", () => {
    const mean = (l: ReturnType<typeof landingSpread>) => l.reduce((s, x) => s + x.p * x.slot, 0);
    expect(mean(landingSpread(3, 0))).toBeLessThan(mean(landingSpread(3, 2)));
    expect(landingSpread(3, 0, 2)[0]!.slot).toBe(33);
  });

  it("class letters follow the counted spread", () => {
    expect(classGrade(0.12)).toBe("A");
    expect(classGrade(0)).toBe("C");
    expect(classGrade(-0.12)).toBe("F");
    expect(classMultiplier(0.1, 1)).toBeGreaterThan(classMultiplier(0.1, 40));
  });
});
