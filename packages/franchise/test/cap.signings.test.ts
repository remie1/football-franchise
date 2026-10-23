import { describe, it, expect } from "vitest";
import { teamId, type PlayerId } from "@ff/contracts";
import {
  earnsCreditedSeason, minimumSalary, minimumContract, signPracticeSquad, rookieContract, tagPrice, tagContract,
  tenderPrice, capRules, ROOKIE_SCALE_2026,
} from "../src/index.js";

// ADR-085 §2: CBA-priced deals, checked against the real 2026 numbers.
const base = { player: "P1" as PlayerId, team: teamId("T1"), season: 2026, signedAt: { season: 2026, phase: "OFF_DRAFT" as const, week: 1, day: 1 } };
const cap = capRules.BASE_CAP;
const capFor = (s: number) => cap * 1.07 ** (s - 2026);

describe("minimums and credited seasons", () => {
  it("2026 minimums match the real table by credited seasons", () => {
    expect([0, 1, 2, 3, 4, 6, 7, 12].map((n) => minimumSalary(2026, n))).toEqual([885e3, 1005e3, 1075e3, 1145e3, 1215e3, 1215e3, 1300e3, 1300e3]);
  });

  it("they rise $45k a year through 2030, then grow with the cap", () => {
    expect(minimumSalary(2027, 0)).toBe(930e3);
    expect(minimumSalary(2030, 7)).toBe(1480e3);
    expect(() => minimumSalary(2031, 0)).toThrow();
    expect(minimumSalary(2031, 0, capFor)).toBe(Math.round(1065e3 * 1.07 / 1000) * 1000);
  });

  it("three games on full pay status earn a credited season", () => {
    expect(earnsCreditedSeason(2)).toBe(false);
    expect(earnsCreditedSeason(3)).toBe(true);
  });

  it("a minimum deal pays each year's minimum as he gains seasons", () => {
    expect(minimumContract({ ...base, creditedSeasons: 2, years: 2 }).years.map((y) => y.baseSalary)).toEqual([1075e3, 1190e3]);
  });

  it("practice squad: $13,750 a week for young players, veterans between the real limits", () => {
    expect(signPracticeSquad({ ...base, creditedSeasons: 1 }).years[0]!.baseSalary).toBe(247_500);
    expect(signPracticeSquad({ ...base, creditedSeasons: 4 }).years[0]!.baseSalary).toBe(330_300);
    expect(signPracticeSquad({ ...base, creditedSeasons: 4, veteranWeekly: 99_999 }).years[0]!.baseSalary).toBe(411_300);
    expect(signPracticeSquad({ ...base, creditedSeasons: 0 }).kind).toBe("PRACTICE_SQUAD");
  });
});

describe("rookie contracts", () => {
  const total = (c: ReturnType<typeof rookieContract>) => c.years.reduce((s, y) => s + y.baseSalary, 0) + (c.signingBonus ?? 0);

  it("the 2026 scale has every pick, highest first", () => {
    expect(ROOKIE_SCALE_2026).toHaveLength(257);
    expect(ROOKIE_SCALE_2026[0]).toEqual([57_271_000, 57_271_000]);
    for (let i = 1; i < ROOKIE_SCALE_2026.length; i++) expect(ROOKIE_SCALE_2026[i]![0]).toBeLessThanOrEqual(ROOKIE_SCALE_2026[i - 1]![0]);
  });

  it("the first pick: four fully guaranteed years worth the real total, minimum bases, the rest as bonus, a fifth-year option", () => {
    const c = rookieContract({ ...base, pick: 1, cap });
    expect(c.kind).toBe("ROOKIE");
    expect(c.years.map((y) => y.season)).toEqual([2026, 2027, 2028, 2029]);
    expect(total(c)).toBe(57_271_000);
    expect(c.years.map((y) => y.baseSalary)).toEqual([885e3, 1050e3, 1165e3, 1280e3]);
    expect(c.years.every((y) => y.guarantees.fullyGuaranteed)).toBe(true);
    expect(c.fifthYearOption).toEqual({ season: 2030, price: 0 });
    expect(c.years[0]!.capHit).toBe(885e3 + c.years[0]!.signingBonusProration);
  });

  it("a late pick: real total, only the real guarantee, no option", () => {
    const c = rookieContract({ ...base, pick: 257, cap });
    expect(total(c)).toBe(4_500_000);
    expect(c.fifthYearOption).toBeUndefined();
    expect((c.signingBonus ?? 0) + c.years.reduce((s, y) => s + (y.guaranteedSalary ?? 0), 0)).toBeGreaterThanOrEqual(120_000);
  });

  it("the scale grows with the cap; undrafted rookies sign three minimum years", () => {
    expect(total(rookieContract({ ...base, pick: 1, cap: cap * 1.1 }))).toBe(Math.round(57_271_000 * 1.1 / 1000) * 1000);
    const u = rookieContract({ ...base, pick: "UDFA", cap });
    expect(u.kind).toBe("ROOKIE");
    expect(u.years.map((y) => y.baseSalary)).toEqual([885e3, 1050e3, 1165e3]);
  });
});

describe("tags and tenders", () => {
  it("2026 tag prices match the real ones; at least 120% of his last salary; they grow with the cap", () => {
    expect(tagPrice("QB", "FRANCHISE_TAG", cap)).toBe(43_895_000);
    expect(tagPrice("NT", "TRANSITION_TAG", cap)).toBe(22_521_000);
    expect(tagPrice("RB", "FRANCHISE_TAG", cap, 20e6)).toBe(24e6);
    expect(tagPrice("K", "FRANCHISE_TAG", cap * 1.1)).toBe(Math.round(6_649_000 * 1.1 / 1000) * 1000);
    const t = tagContract({ ...base, position: "WR", kind: "FRANCHISE_TAG", cap });
    expect(t.years).toHaveLength(1);
    expect(t.years[0]!.guarantees.fullyGuaranteed).toBe(true);
    expect(t.kind).toBe("FRANCHISE_TAG");
  });

  it("RFA tenders: the 2026 levels, the first-round one at least 110% of his last salary", () => {
    expect(tenderPrice("ORIGINAL_ROUND", cap)).toBe(3_674_000);
    expect(tenderPrice("FIRST_ROUND", cap, 10e6)).toBe(11e6);
  });
});
