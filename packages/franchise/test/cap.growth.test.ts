import { describe, it, expect } from "vitest";
import { projectCaps, historyGrowth, CAP_HISTORY, capRules } from "../src/index.js";

// ADR-085 §5: the cap growth model, checked against the real 2011-2026 history.
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));

describe("the cap growth model", () => {
  it("starts from the real 2026 cap and is the same for the same seed, whatever range is asked for", () => {
    const a = projectCaps("league-1", 2040);
    expect(a[0]!.season).toBe(2027);
    expect(projectCaps("league-1", 2040)).toEqual(a);
    expect(projectCaps("league-1", 2030)).toEqual(a.slice(0, 4));
    expect(projectCaps("league-2", 2040)).not.toEqual(a);
    expect(CAP_HISTORY.at(-1)).toEqual({ season: 2026, cap: capRules.BASE_CAP });
  });

  it("each cap is a round number inside the range announced before it", () => {
    for (const f of projectCaps("league-1", 2060)) {
      expect(f.cap % 100_000).toBe(0);
      expect(f.projectedLow).toBeLessThanOrEqual(f.cap);
      expect(f.projectedHigh).toBeGreaterThanOrEqual(f.cap);
    }
  });

  it("over many leagues, yearly growth looks like the real 2012-2026 history", () => {
    const real = historyGrowth();
    const sim = Array.from({ length: 400 }, (_, i) => projectCaps(`check-${i}`, 2041).map((f) => f.growth)).flat();
    // Real: mean 6.5%, spread 5.4%, one drop in 15 years (2021).
    expect(mean(real)).toBeCloseTo(0.065, 2);
    expect(Math.abs(mean(sim) - mean(real))).toBeLessThan(0.015);
    expect(sd(sim)).toBeGreaterThan(0.025);
    expect(sd(sim)).toBeLessThan(0.07);
    const drops = sim.filter((g) => g < 0).length / sim.length;
    expect(drops).toBeGreaterThan(0.01);
    expect(drops).toBeLessThan(0.12);
  });

  it("the drivers say why: TV money in renewal years, the labour talks the season after the CBA ends", () => {
    const runs = Array.from({ length: 50 }, (_, i) => projectCaps(`why-${i}`, 2035));
    expect(runs.every((r) => r.find((f) => f.season === 2034)!.drivers.media !== undefined)).toBe(true);
    expect(runs.every((r) => r.find((f) => f.season === 2031)!.drivers.labour !== undefined)).toBe(true);
    expect(runs.some((r) => r.find((f) => f.season === 2030)!.drivers.media === undefined)).toBe(true);
  });
});
