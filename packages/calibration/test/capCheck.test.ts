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

  it("a traded pick's condition kept as words gets the rule the game cannot settle", () => {
    const pick = { draft: 2027, round: 1, originalTeam: teamId("T19"), owner: teamId("T25"), kind: "REGULAR" as const };
    const words = withConditionRule({ ...pick, condition: "Less favorable of own and GB" as never });
    expect(words.condition).toEqual({ text: "Less favorable of own and GB", rule: { kind: "OTHER" } });
    expect(withConditionRule(pick)).toEqual(pick);
  });
});
