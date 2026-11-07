import { describe, expect, it } from "vitest";
import { playerId, teamId, type PlayerContract } from "@ff/contracts";
import { DUMMY_SALARY, withConditionRule, withDummyYearsVoid } from "../src/season/capCheck.js";

// ADR-085 §7: how the cap check reads the stand-in league file.
const year = (season: number, baseSalary: number, proration: number) => ({
  season, baseSalary, signingBonusProration: proration, guarantees: { fullyGuaranteed: false }, capHit: baseSalary + proration,
});

describe("the cap check's reading of the league file", () => {
  it("a placeholder year ($99M to $500M base, written in to void) becomes a void year with no cap number", () => {
    const c: PlayerContract = {
      player: playerId("r:1"), team: teamId("T01"), signedAt: { season: 2024, phase: "OFF_RESET_FA", week: 1, day: 1 },
      years: [year(2026, 20e6, 5e6), year(2027, 25e6, 5e6), year(2028, 500e6, 5e6)],
    };
    const v = withDummyYearsVoid(c);
    expect(v.years.map((y) => y.voidYear ?? false)).toEqual([false, false, true]);
    expect(v.years[2]!.capHit).toBe(0);
    expect(v.years[2]!.signingBonusProration).toBe(5e6); // lands as dead money when the deal ends
    expect(v.years.slice(0, 2)).toEqual(c.years.slice(0, 2));
    const real = { ...c, years: [year(2026, DUMMY_SALARY - 1, 0)] };
    expect(withDummyYearsVoid(real)).toBe(real);
  });

  it("a run of years at the end whose stored cap hit leaves the base out is placeholder years too", () => {
    const c: PlayerContract = {
      player: playerId("r:2"), team: teamId("T27"), signedAt: { season: 2024, phase: "OFF_RESET_FA", week: 1, day: 1 },
      years: [
        { ...year(2026, 1.3e6, 30e6) },
        { ...year(2027, 50e6, 3e6), capHit: 3e6 },
        { ...year(2028, 50e6, 3e6), capHit: 3e6 },
      ],
    };
    expect(withDummyYearsVoid(c, 2026).years.map((y) => y.voidYear ?? false)).toEqual([false, true, true]);
    // Not in the file's own season (a deal signed during it has a part-season cap hit), and not before a real year.
    const partSeason = { ...c, years: [{ ...year(2026, 1e6, 0), capHit: 600_000 }] };
    expect(withDummyYearsVoid(partSeason, 2026)).toBe(partSeason);
    const middle = { ...c, years: [c.years[0]!, c.years[1]!, year(2028, 20e6, 3e6)] };
    expect(withDummyYearsVoid(middle, 2026)).toBe(middle);
  });

  it("a placeholder roster bonus comes down to what the stored cap hit holds, and a void year keeps only its proration (step 14)", () => {
    const c: PlayerContract = {
      player: playerId("r:544"), team: teamId("T23"), signedAt: { season: 2024, phase: "OFF_RESET_FA", week: 1, day: 1 },
      years: [
        { ...year(2026, 1.2e6, 8.4e6), rosterBonus: 0 },
        // The file's $100M roster bonus: the stored cap hit holds $8.85M of the year.
        { ...year(2029, 1.4e6, 7.0e6), rosterBonus: 100e6, capHit: 8.85e6 },
      ],
    };
    const v = withDummyYearsVoid(c, 2026);
    expect(v.years[0]).toBe(c.years[0]);
    expect(v.years[1]!.rosterBonus).toBe(450_000);
    expect(v.years[1]!.voidYear).toBeUndefined();
    // A real roster bonus the stored cap hit holds stays, and so does one in the file's own season.
    const held = { ...c, years: [{ ...year(2027, 27e6, 4e6), rosterBonus: 30e6, capHit: 61e6 }] };
    expect(withDummyYearsVoid(held, 2026)).toBe(held);
    const own = { ...c, years: [{ ...year(2026, 1e6, 0), rosterBonus: 35.7e6, capHit: 34e6 }] };
    expect(withDummyYearsVoid(own, 2026)).toBe(own);
    // The file's void year with a $50M roster bonus: no pay, the proration stays.
    const voidPay: PlayerContract = { ...c, years: [year(2026, 4.65e6, 5.55e6), { ...year(2027, 0, 2.3e6), rosterBonus: 50e6, capHit: 4.72e6, voidYear: true }] };
    const w = withDummyYearsVoid(voidPay, 2026);
    expect(w.years[1]).toMatchObject({ baseSalary: 0, rosterBonus: 0, signingBonusProration: 2.3e6, voidYear: true });
  });

  it("a traded pick's condition kept as words gets the rule the game cannot settle", () => {
    const pick = { draft: 2027, round: 1, originalTeam: teamId("T19"), owner: teamId("T25"), kind: "REGULAR" as const };
    const words = withConditionRule({ ...pick, condition: "Less favorable of own and GB" as never });
    expect(words.condition).toEqual({ text: "Less favorable of own and GB", rule: { kind: "OTHER" } });
    expect(withConditionRule(pick)).toEqual(pick);
  });
});
