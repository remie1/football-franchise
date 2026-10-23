import { describe, it, expect } from "vitest";
import { playerId, teamId } from "@ff/contracts";
import { buildContracts, OTC_TEAM, signedStamp, type ContractHistoryRow, type HistoryYear } from "../src/importer/real/index.js";

const year = (y: number, team: string, cap: number, extra: Partial<HistoryYear> = {}): HistoryYear => ({
  year: String(y), team, base_salary: cap - 1, prorated_bonus: 1, option_bonus: 0, roster_bonus: 0,
  guaranteed_salary: 0, cap_number: cap, workout_bonus: null, per_game_roster_bonus: null, other_bonus: null, ...extra,
});
const deal = (over: Partial<ContractHistoryRow> & { gsis_id: string }): ContractHistoryRow => ({
  is_active: true, year_signed: 2024, years: 4, apy: 5, draft_year: 2020, season_history: [], ...over,
});
const players = new Map([
  ["g1", { id: playerId("r:1"), team: teamId("T01"), code: "BAL" }],
  ["g2", { id: playerId("r:2"), team: teamId("T01"), code: "BAL" }],
  ["g3", { id: playerId("r:3"), team: teamId("T02"), code: "CIN" }],
]);

describe("contracts (ADR-088 R4)", () => {
  const { contracts, missing } = buildContracts({
    season: 2026, players,
    contracts: [
      // g1: an old deal and the current one; his history runs 2025-2029, the last year void (cap 0)
      deal({ gsis_id: "g1", year_signed: 2020, is_active: false }),
      deal({ gsis_id: "g1", year_signed: 2025, season_history: [
        year(2025, "Ravens", 10), year(2026, "Ravens", 12.5, { guaranteed_salary: 11.5, roster_bonus: 0.25 }),
        year(2027, "Ravens", 14), year(2028, "Ravens", 15), year(2029, "Ravens", 0, { base_salary: 20 }),
      ] }),
      // g2: a deal with no row for this season, a rookie deal
      deal({ gsis_id: "g2", year_signed: 2020, apy: 1.25 }),
    ],
  });
  const g1 = contracts.find((c) => String(c.player) === "r:1")!;

  it("copies this season on, on his team, in dollars, skipping years that do not count", () => {
    expect(g1.source).toBe("copied");
    expect(g1.years.map((y) => y.season)).toEqual([2026, 2027, 2028]);
    expect(g1.years[0]).toMatchObject({ baseSalary: 11_500_000, signingBonusProration: 1_000_000, capHit: 12_500_000, rosterBonus: 250_000, guaranteedSalary: 11_500_000, guarantees: { fullyGuaranteed: true } });
    expect(g1.signedAt).toEqual(signedStamp(2025));
    expect(g1.kind).toBe("VETERAN");
  });

  it("estimates a deal with no row for this season at its yearly average", () => {
    const g2 = contracts.find((c) => String(c.player) === "r:2")!;
    expect(g2).toMatchObject({ source: "estimated", kind: "ROOKIE" });
    expect(g2.years).toEqual([{ season: 2026, baseSalary: 1_250_000, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: 1_250_000 }]);
  });

  it("lists players with no current deal", () => {
    expect(missing).toEqual(["r:3"]);
  });

  it("knows all 32 OverTheCap team names", () => {
    expect(new Set(Object.values(OTC_TEAM)).size).toBe(32);
  });
});
