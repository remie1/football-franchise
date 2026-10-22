import { describe, it, expect } from "vitest";
import { staffTurnoverCheck } from "../src/index.js";

/**
 * ADR-080 C5: coaching turnover against the REPORTED NFL figures (ADR-080 provenance table). One seed
 * and 30 offseasons; the bands are wide enough for any seed, narrow enough to catch a broken rule.
 */
describe("the turnover check (ADR-080 C5)", () => {
  const r = staffTurnoverCheck({ seed: "staff-check-test", seasons: 30 });
  const s = r.summary;
  const src = (k: keyof typeof s.hcSourceShares) => s.hcSourceShares[k] ?? 0;

  it("changes about as many head coaches and coordinators a year as the NFL", () => {
    expect(r.perSeason).toHaveLength(30);
    expect(s.changesPerYear.HEAD_COACH.mean).toBeGreaterThan(5); // NFL about 7
    expect(s.changesPerYear.HEAD_COACH.mean).toBeLessThan(9);
    expect(s.changesPerYear.OC.mean).toBeGreaterThan(9); // NFL 10, 18, 16
    expect(s.changesPerYear.OC.mean).toBeLessThan(17);
    expect(s.changesPerYear.DC.mean).toBeGreaterThan(8); // NFL 11
    expect(s.changesPerYear.DC.mean).toBeLessThan(15);
    expect(s.hcTenure.mean).toBeGreaterThan(3.5);
    expect(s.hcTenure.mean).toBeLessThan(6.5);
  });

  it("hires head coaches mostly from coordinators and earlier head coaches, a few from college", () => {
    expect(src("OC") + src("DC")).toBeGreaterThan(0.3); // NFL 47%
    expect(src("OC")).toBeGreaterThan(src("DC")); // NFL 28% to 19%
    expect(src("RETREAD") + src("OUT_OF_WORK")).toBeGreaterThan(0.15); // NFL 26%
    expect(src("RETREAD") + src("OUT_OF_WORK")).toBeLessThan(0.45);
    expect(src("COLLEGE")).toBeLessThan(0.25); // NFL about 10%
  });

  it("keeps the ruler anchored, the pool stocked and the disguise habit near the owner's band", () => {
    expect(s.anchor.coordinatorAverageSkill).toBeGreaterThan(47);
    expect(s.anchor.coordinatorAverageSkill).toBeLessThan(53);
    expect(s.anchor.headCoachAverageSkill).toBeGreaterThan(s.anchor.coordinatorAverageSkill);
    expect(Math.abs(s.dcDisguiseMean.atStart - 0.315)).toBeLessThan(1e-9);
    expect(s.dcDisguiseMean.min).toBeGreaterThan(0.25);
    expect(s.dcDisguiseMean.max).toBeLessThan(0.38);
    expect(s.poolSize.min).toBeGreaterThan(250);
    expect(s.meanHcAge.mean).toBeGreaterThan(44);
    expect(s.meanHcAge.mean).toBeLessThan(57);
    expect(s.treeShareOfCoordinatorHires).toBeGreaterThan(0.15);
    // Most fired head coaches never step down (ADR-080 §7.1); without that rule 20-29 OCs were.
    expect(s.exHeadCoaches.OC.mean).toBeLessThan(20);
    expect(s.exHeadCoaches.DC.mean).toBeLessThan(14);
  });

  it("is the same report for the same seed", () => {
    expect(staffTurnoverCheck({ seed: "staff-check-test", seasons: 3 }).perSeason)
      .toEqual(r.perSeason.slice(0, 3));
  }, 30_000);
});
