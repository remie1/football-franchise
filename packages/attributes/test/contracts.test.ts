import { describe, it, expect } from "vitest";
import { playerId, teamId } from "@ff/contracts";
import { buildContracts, estimatedYears, OTC_TEAM, refreshContracts, signedStamp, type ContractHistoryRow, type HistoryYear } from "../src/importer/real/index.js";

const year = (y: number, team: string, cap: number, extra: Partial<HistoryYear> = {}): HistoryYear => ({
  year: String(y), team, base_salary: cap - 1, prorated_bonus: 1, option_bonus: 0, roster_bonus: 0,
  guaranteed_salary: 0, cap_number: cap, workout_bonus: null, per_game_roster_bonus: null, other_bonus: null, ...extra,
});
const deal = (over: Partial<ContractHistoryRow> & { gsis_id: string }): ContractHistoryRow => ({
  is_active: true, year_signed: 2024, years: 4, value: null, guaranteed: null, apy: 5, draft_year: 2020, season_history: [], ...over,
});
const players = new Map([
  ["g1", { id: playerId("r:1"), team: teamId("T01"), code: "BAL" }],
  ["g2", { id: playerId("r:2"), team: teamId("T01"), code: "BAL" }],
  ["g3", { id: playerId("r:3"), team: teamId("T02"), code: "CIN" }],
]);

describe("contracts (ADR-088 R4)", () => {
  const { contracts, source, missing } = buildContracts({
    season: 2026, players,
    contracts: [
      // g1: an old deal and the current one (2025-2027); 2028 is a void year, 2029 does not count (cap 0)
      deal({ gsis_id: "g1", year_signed: 2020, is_active: false }),
      deal({ gsis_id: "g1", year_signed: 2025, years: 3, season_history: [
        year(2025, "Ravens", 10), year(2026, "Ravens", 12.5, { guaranteed_salary: 11.5, roster_bonus: 0.25 }),
        year(2027, "Ravens", 14), year(2028, "Ravens", 1, { base_salary: 0 }), year(2029, "Ravens", 0, { base_salary: 20 }),
      ] }),
      // g2: a deal with no row for this season, a rookie deal
      deal({ gsis_id: "g2", year_signed: 2020, apy: 1.25 }),
    ],
  });
  const g1 = contracts.find((c) => String(c.player) === "r:1")!;

  it("copies this season on, on his team, in dollars, skipping years that do not count", () => {
    expect(source["r:1"]).toBe("copied");
    expect(g1.years.map((y) => y.season)).toEqual([2026, 2027, 2028]);
    expect(g1.years.map((y) => y.voidYear ?? false)).toEqual([false, false, true]);
    expect(g1.years[0]).toMatchObject({ baseSalary: 11_500_000, signingBonusProration: 1_000_000, capHit: 12_500_000, rosterBonus: 250_000, guaranteedSalary: 11_500_000, guarantees: { fullyGuaranteed: true } });
    expect(g1.signedAt).toEqual(signedStamp(2025));
    expect(g1.kind).toBe("VETERAN");
  });

  it("estimates a deal with no row for this season at its yearly average", () => {
    const g2 = contracts.find((c) => String(c.player) === "r:2")!;
    expect(g2.kind).toBe("ROOKIE");
    expect(source["r:2"]).toBe("estimated");
    expect(g2.years).toEqual([{ season: 2026, baseSalary: 1_250_000, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: 1_250_000 }]);
  });

  it("lists players with no current deal", () => {
    expect(missing).toEqual(["r:3"]);
  });

  it("gives a deal with no year rows yet its real length, at its yearly average, guaranteed money as a spread bonus", () => {
    // A third-round pick of this season: four years, $7M, $1.5M guaranteed (his signing bonus).
    const third = estimatedYears(deal({ gsis_id: "g", year_signed: 2026, draft_year: 2026, years: 4, value: 7, apy: 1.75, guaranteed: 1.5 }), 2026);
    expect(third.map((y) => y.season)).toEqual([2026, 2027, 2028, 2029]);
    expect(third[3]).toEqual({ season: 2029, baseSalary: 1_375_000, signingBonusProration: 375_000, guarantees: { fullyGuaranteed: false }, capHit: 1_750_000 });
    // A first-rounder's deal is guaranteed whole: every year's salary is.
    const first = estimatedYears(deal({ gsis_id: "g", year_signed: 2026, draft_year: 2026, years: 4, value: 22, apy: 5.5, guaranteed: 22 }), 2026);
    expect(first).toHaveLength(4);
    expect(first[0]).toEqual({ season: 2026, baseSalary: 5_500_000, signingBonusProration: 0, guarantees: { fullyGuaranteed: true }, capHit: 5_500_000, guaranteedSalary: 5_500_000 });
    // An undrafted man's three years; a deal signed last year runs its remaining years; one year stays one.
    expect(estimatedYears(deal({ gsis_id: "g", year_signed: 2026, draft_year: 2026, years: 3, value: 3.12, apy: 1.04, guaranteed: 0 }), 2026)).toHaveLength(3);
    expect(estimatedYears(deal({ gsis_id: "g", year_signed: 2025, years: 3, value: 6, apy: 2, guaranteed: 0 }), 2026).map((y) => y.season)).toEqual([2026, 2027]);
    expect(estimatedYears(deal({ gsis_id: "g", year_signed: 2026, years: 1, value: 0.25, apy: 0.25 }), 2026)).toHaveLength(1);
  });

  it("refreshes a file's estimated deals and refuses rows that are not its snapshot's", () => {
    const rows = [
      deal({ gsis_id: "g1", year_signed: 2025, years: 3, season_history: [year(2026, "Ravens", 12.5), year(2027, "Ravens", 14)] }),
      deal({ gsis_id: "g2", year_signed: 2026, draft_year: 2026, years: 4, value: 7, apy: 1.75, guaranteed: 1.5 }),
    ];
    const sealed = { g1: { id: "r:1" }, g2: { id: "r:2" } };
    const teams = [{ id: teamId("T01") }, { id: teamId("T02") }];
    const inLeague = [{ bio: { id: playerId("r:1") }, teamId: teamId("T01") }, { bio: { id: playerId("r:2") }, teamId: teamId("T01") }];
    const copied = buildContracts({ season: 2026, contracts: rows, players: new Map([["g1", { id: playerId("r:1"), team: teamId("T01"), code: "BAL" }]]) }).contracts[0]!;
    // The file as the importer wrote it before: the rookie on one year at his yearly average.
    const oneYear = { player: playerId("r:2"), team: teamId("T01"), signedAt: signedStamp(2026), kind: "ROOKIE" as const,
      years: [{ season: 2026, baseSalary: 1_750_000, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: 1_750_000 }] };
    const source = { "r:1": "copied" as const, "r:2": "estimated" as const };
    const out = refreshContracts({ season: 2026, rows, sealed, teams, players: inLeague, contracts: [copied, oneYear], source });
    expect(out.changed).toEqual(["r:2"]);
    expect(out.contracts[0]).toBe(copied);
    expect(out.contracts[1]!.years.map((y) => y.season)).toEqual([2026, 2027, 2028, 2029]);
    // Run again on its own output: nothing changes.
    expect(refreshContracts({ season: 2026, rows, sealed, teams, players: inLeague, contracts: out.contracts, source }).changed).toEqual([]);
    // Rows whose copied deal comes out otherwise are another snapshot's.
    const other = [deal({ ...rows[0]!, gsis_id: "g1", season_history: [year(2026, "Ravens", 13), year(2027, "Ravens", 14)] }), rows[1]!];
    expect(() => refreshContracts({ season: 2026, rows: other, sealed, teams, players: inLeague, contracts: [copied, oneYear], source })).toThrow(/not its snapshot's/);
  });

  it("knows all 32 OverTheCap team names", () => {
    expect(new Set(Object.values(OTC_TEAM)).size).toBe(32);
  });
});
