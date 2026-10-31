import { describe, it, expect } from "vitest";
import { playerId, teamId } from "@ff/contracts";
import { REAL_FIRST_YEAR, apyOf, firstYearShareFor, veteranContract } from "../src/index.js";

// ADR-085 step 11: deals charge the real share of their yearly value in their first year.
const at = { season: 2026, phase: "OFF_RESET_FA" as const, week: 1, day: 2 };
const deal = (apy: number, years: number, firstYearShare?: number) => veteranContract({
  player: playerId("p"), team: teamId("T1"), season: 2026, signedAt: at, apy, years, bonusShare: 0.35, guaranteedYears: 1,
  minimum: () => 1_000_000, ...(firstYearShare !== undefined ? { firstYearShare } : {}),
});

describe("deal shape (step 11)", () => {
  it("the real first-year share falls as a deal grows", () => {
    expect(firstYearShareFor(0.005)).toBe(0.81);
    expect(firstYearShareFor(0.03)).toBe(0.59);
    expect(firstYearShareFor(0.1)).toBe(0.34);
    const shares = REAL_FIRST_YEAR.map((b) => b.share);
    expect([...shares].sort((a, b) => b - a)).toEqual(shares);
  });

  it("a big deal costs about a third of its yearly value in year one, the same in all, more later", () => {
    const c = deal(30e6, 4, 0.34);
    // The bonus's share each year (35% of the yearly value) plus the minimum: the share is a floor it can't go under.
    expect(c.years[0]!.capHit).toBeLessThan(0.4 * 30e6);
    expect(deal(10e6, 3, 0.59).years[0]!.capHit).toBeCloseTo(0.59 * 10e6, -4);
    expect(apyOf(c)).toBeCloseTo(30e6, -4);
    for (let i = 2; i < 4; i++) expect(c.years[i]!.capHit).toBeGreaterThan(c.years[i - 1]!.capHit);
    expect(c.years[1]!.capHit).toBeGreaterThan(30e6);
  });

  it("the first year never drops under the minimum; a one-year deal is its full price", () => {
    const small = deal(2e6, 2, 0.1);
    expect(small.years[0]!.baseSalary).toBe(1_000_000);
    expect(deal(5e6, 1, 0.34).years[0]!.capHit).toBeCloseTo(5e6, -3);
  });

  it("without a share, base salaries rise evenly as before", () => {
    const c = deal(10e6, 3);
    expect(c.years[1]!.baseSalary / c.years[0]!.baseSalary).toBeCloseTo(1.05, 2);
  });
});
