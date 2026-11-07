import { describe, it, expect } from "vitest";
import { REPLACEMENT_GRADE, STARTERS, WANTED } from "../src/draft/board.js";
import { VALUE_FOR_MONEY, depthValue, helpOf, liftAt, pointPriceAt, pushedOut, valueForMoney } from "../src/cap/valueForMoney.js";
import type { MarketCurve } from "../src/cap/value.js";

// ADR-085 step 14, §3.1 (owner's yes, 2026-11-06): value for money, every man at the position counted.

/** A market where pay rises slowly through the middle and steeply at the top. */
const curve: MarketCurve = {
  grades: Array.from({ length: 101 }, (_, i) => 50 + i * 0.3),
  apys: Array.from({ length: 101 }, (_, i) => 1_000_000 + (i < 80 ? i * 50_000 : 80 * 50_000 + (i - 80) * 1_000_000)),
};

describe("value for money (ADR-085 step 14, §3.1)", () => {
  it("counts every seat of the position's shape, starters fully and backups at the backup weight", () => {
    // Wide receivers: three starters, six wanted.
    expect(STARTERS.WR).toBe(3);
    expect(WANTED.WR).toBe(6);
    const v = depthValue("WR", [80, 75, 70, 65, 60, 55]);
    expect(v).toBeCloseTo(80 + 75 + 70 + VALUE_FOR_MONEY.backupWeight * (65 + 60 + 55), 6);
    // An empty seat or a man below the replacement grade counts as a street free agent.
    expect(depthValue("WR", [80, 75, 70, 40])).toBeCloseTo(80 + 75 + 70 + VALUE_FOR_MONEY.backupWeight * 3 * REPLACEMENT_GRADE, 6);
  });

  it("counts a position with no set starter at half a starter for its first man", () => {
    expect(STARTERS.FB).toBe(0);
    expect(depthValue("FB", [70])).toBeCloseTo(0.5 * 70, 6);
  });

  it("lifts the team by what he adds over every man there, not over the cheapest", () => {
    const here = [78, 76, 74, 60, 58, 56];
    // Nearly as good as the starters: he pushes the third starter to the bench and the last backup out.
    expect(liftAt("WR", here, 77)).toBeCloseTo((77 - 74) + VALUE_FOR_MONEY.backupWeight * (74 - 56), 6);
    // No better than the last backup: no lift at all.
    expect(liftAt("WR", here, 55)).toBe(0);
    // A hole is worth filling even with a modest man.
    expect(liftAt("WR", [78, 76], 62)).toBeCloseTo(62 - REPLACEMENT_GRADE, 6);
  });

  it("prices a rating point at the man's own level of the market", () => {
    const middle = pointPriceAt(curve, 60);
    const top = pointPriceAt(curve, 78);
    expect(middle).toBeGreaterThan(0);
    expect(top).toBeGreaterThan(5 * middle);
    expect(pointPriceAt(undefined, 70)).toBe(0);
  });

  it("is the lift at a point's price, less his pay over the minimum and any other cost", () => {
    const base = { position: "WR" as const, here: [78, 76, 74, 60, 58, 56], grade: 77, floor: 1_000_000, curve };
    const lift = liftAt("WR", base.here, 77) * pointPriceAt(curve, 77);
    expect(valueForMoney({ ...base, apy: 3_000_000 })).toBeCloseTo(lift - 2_000_000, 0);
    expect(valueForMoney({ ...base, apy: 3_000_000, extraCost: 500_000 })).toBeCloseTo(lift - 2_500_000, 0);
    // The same man at a star's price is a poor buy for a team already this deep.
    expect(valueForMoney({ ...base, apy: 30_000_000 })).toBeLessThan(0);
  });

  it("a man's help is his lift at a point's price before his pay: value for money is it less his cost", () => {
    // Free agency's "offers" prices call the man who would help a team most first (step 14).
    const base = { position: "WR" as const, here: [78, 76, 74, 60, 58, 56], grade: 77, floor: 1_000_000, curve };
    expect(helpOf(base)).toBeCloseTo(liftAt("WR", base.here, 77) * pointPriceAt(curve, 77), 0);
    for (const apy of [1_000_000, 3_000_000, 30_000_000]) {
      expect(helpOf(base)).toBeCloseTo(valueForMoney({ ...base, apy, extraCost: 400_000 }) + (apy - base.floor) + 400_000, 0);
    }
    // With no price for a point, his lift alone, as value for money reads it there.
    expect(helpOf({ ...base, curve: undefined })).toBeCloseTo(liftAt("WR", base.here, 77), 6);
  });

  it("with no price for a point in the market yet, is his lift alone", () => {
    const here = [78, 76, 74, 60, 58, 56];
    const flat: MarketCurve = { grades: [60, 70, 80], apys: [1_000_000, 1_000_000, 1_000_000] };
    for (const c of [undefined, flat]) {
      expect(valueForMoney({ position: "WR", here, grade: 77, apy: 3_000_000, floor: 1_000_000, curve: c, extraCost: 500_000 })).toBeCloseTo(liftAt("WR", here, 77), 6);
    }
  });

  it("finds the man a signing would push off the 53", () => {
    const men = [{ g: 70, id: "a" }, { g: 65, id: "b" }];
    // Right tackle: one wanted.
    expect(WANTED.RT).toBe(1);
    expect(pushedOut([{ g: 70, id: "a" }], "RT", 72)?.id).toBe("a");
    expect(pushedOut([{ g: 70, id: "a" }], "RT", 68)).toBeUndefined();
    // Room to spare: nobody goes.
    expect(pushedOut(men, "WR", 90)).toBeUndefined();
  });
});
