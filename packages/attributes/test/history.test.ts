import { describe, it, expect } from "vitest";
import { buildHistory, type InjuryRow, type SnapRow } from "../src/importer/real/index.js";

const snap = (pfr: string, season: number, off: number, st = 0): SnapRow => ({
  pfr_player_id: pfr, season, game_type: "REG", offense_pct: null, defense_pct: null, st_pct: null,
  offense_snaps: off, defense_snaps: 0, st_snaps: st,
});
const inj = (gsis: string, week: number, part: string | null, practice: string | null = null): InjuryRow =>
  ({ gsis_id: gsis, week, report_primary_injury: part, practice_primary_injury: practice, report_status: part ? "Out" : null });

describe("career history (ADR-088, for ADR-087)", () => {
  const h = buildHistory({
    season: 2026,
    players: new Map([["r:1", { pfr: "p1", gsis: "g1", reserveCode: "R01" }], ["r:2", { gsis: "g2", reserveCode: "R99" }], ["r:3", { pfr: "p3", gsis: "g3" }]]),
    snaps: [snap("p1", 2015, 60), snap("p1", 2025, 50), snap("p1", 2025, 0, 5), snap("p1", 2025, 0), { ...snap("p1", 2025, 70), game_type: "POST" }, snap("p1", 2026, 40)],
    injuries: [inj("g1", 2, "Knee"), inj("g1", 5, null, "Not injury related - resting player"), inj("g3", 3, null, "Ankle")],
  });

  it("sums regular-season career snaps and counts games with a snap", () => {
    expect(h["r:1"]!.snaps).toEqual({ offense: 150, defense: 0, specialTeams: 5 });
    expect(h["r:1"]!.gamesPlayed).toEqual([
      { season: 2022, games: 0 }, { season: 2023, games: 0 }, { season: 2024, games: 0 }, { season: 2025, games: 2 }, { season: 2026, games: 1 },
    ]);
  });

  it("names the reserve list it knows, and keeps any other code raw", () => {
    expect(h["r:1"]!.reserve).toEqual({ type: "INJURED_RESERVE", code: "R01" });
    expect(h["r:2"]!.reserve).toEqual({ type: "OTHER", code: "R99" });
    expect(h["r:3"]!.reserve).toBeUndefined();
  });

  it("keeps the latest real injury, skipping rest days", () => {
    expect(h["r:1"]!.injury).toEqual({ week: 2, part: "Knee", status: "Out" });
    expect(h["r:3"]!.injury).toEqual({ week: 3, part: "Ankle", status: null });
    expect(h["r:2"]!.injury).toBeUndefined();
  });
});
