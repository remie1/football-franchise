import { describe, it, expect } from "vitest";
import { teamId, type Team } from "@ff/contracts";
import { ageOn, buildStandIns, gamePosition, REAL_TEAM_SLOTS, rosterStatus, type StandInInput } from "../src/importer/real/index.js";
import type { DepthRow, RosterRow } from "../src/importer/real/rows.js";

// Made-up ids and names throughout: no real player appears in a test.
const teams: Team[] = REAL_TEAM_SLOTS.map((_, i) => ({
  id: teamId(`T${String(i + 1).padStart(2, "0")}`),
  displayName: `Team ${i + 1}`, city: `City ${i + 1}`,
  roster: [], staff: [], depthChart: {},
  capState: { capLimit: 0, committed: 0, deadMoney: 0 }, staffBudget: { limit: 0, committed: 0 },
}));

const row = (over: Partial<RosterRow> & { gsis_id: string }): RosterRow => ({
  pfr_id: null, team: "BAL", week: 7, status: "ACT", status_description_abbr: "A01",
  position: "QB", depth_chart_position: "QB", birth_date: "2000-06-15", height: 75, weight: 220,
  years_exp: 3, full_name: `Real Person ${over.gsis_id}`, ...over,
});
const depth = (gsis: string, pos_abb: string, pos_rank: number, team = "BAL", dt = "2026-10-23T00:00:00Z"): DepthRow =>
  ({ dt, team, gsis_id: gsis, pos_abb, pos_rank });

const base: StandInInput = {
  season: 2026, date: "2026-10-23", teams, sealed: {},
  rosters: [
    row({ gsis_id: "g1", pfr_id: "p1" }),
    row({ gsis_id: "g2", birth_date: "1996-10-24", years_exp: 8 }),
    row({ gsis_id: "g3", position: "OL", depth_chart_position: "T" }),
    row({ gsis_id: "g4", position: "OL", depth_chart_position: "T" }),
    row({ gsis_id: "g5", position: "OL", depth_chart_position: "T" }),
    row({ gsis_id: "g6", status: "RES", status_description_abbr: "R01" }),
    row({ gsis_id: "g7", status: "DEV", status_description_abbr: "P01" }),
    row({ gsis_id: "g8", status: "CUT", status_description_abbr: "A01" }),
    row({ gsis_id: "g9", team: "SF" }),
    // an old week: ignored for the team's latest roster
    row({ gsis_id: "g10", week: 3 }),
  ],
  players: [{ gsis_id: "g1", pfr_id: "p1", birth_date: null, draft_year: 2023, draft_round: 1, draft_pick: 12, display_name: "Retired Person" }],
  combine: [{ pfr_id: "p1", ht: "6-3", wt: 222, forty: 4.6, bench: null, vertical: 33, cone: 7.0 }],
  depth: [depth("g2", "QB", 1), depth("g1", "QB", 2), depth("g4", "RT", 1), depth("g3", "LT", 1),
    depth("g1", "QB", 1, "BAL", "2026-10-01T00:00:00Z")],
};

describe("stand-ins (ADR-088 R2)", () => {
  const L = buildStandIns(base);
  const byGsis = (g: string) => L.players.find((p) => String(p.bio.id) === L.sealed[g]!.id)!;

  it("puts each real team in its real division slot", () => {
    expect(REAL_TEAM_SLOTS).toHaveLength(32);
    expect(new Set(REAL_TEAM_SLOTS).size).toBe(32);
    expect(byGsis("g1").teamId).toBe(teamId("T01")); // BAL, AFC North
    expect(byGsis("g9").teamId).toBe(teamId("T32")); // SF, NFC West
  });

  it("copies age, size, draft slot and combine numbers", () => {
    const p = byGsis("g1");
    expect(p.bio).toMatchObject({ age: 26, heightIn: 75, weightLb: 220, draft: { year: 2023, round: 1, pick: 12 } });
    expect(L.provenance.measurements[String(p.bio.id)]).toEqual({ heightIn: 75, weightLb: 220, forty: 4.6, vertical: 33, cone: 7.0 });
    expect(byGsis("g2").bio.age).toBe(29); // birthday tomorrow
    expect(byGsis("g2").bio.draft).toBe("UDFA");
    expect(byGsis("g2").bio.creditedSeasons).toBe(8);
  });

  it("splits the 53, reserve and practice squad, and drops cut players and old weeks", () => {
    const t = L.teams[0]!;
    const ids = (gs: string[]) => gs.map((g) => L.sealed[g]!.id);
    expect(t.roster.map(String).sort()).toEqual(ids(["g1", "g2", "g3", "g4", "g5"]).sort());
    expect(t.reserve!.map(String)).toEqual(ids(["g6"]));
    expect(L.provenance.practiceSquad["T01"]).toEqual(ids(["g7"]));
    expect(L.sealed["g8"]).toBeUndefined();
    expect(L.sealed["g10"]).toBeUndefined();
  });

  it("orders each position by ESPN's latest depth chart, unlisted last", () => {
    const t = L.teams[0]!;
    expect(t.depthChart.QB!.map(String)).toEqual([L.sealed["g2"]!.id, L.sealed["g1"]!.id]);
    // g5 is a tackle ESPN does not list: he takes the side with fewer tackles so far (a tie goes left).
    expect(t.depthChart.LT!.map(String)).toEqual([L.sealed["g3"]!.id, L.sealed["g5"]!.id]);
    expect(t.depthChart.RT!.map(String)).toEqual([L.sealed["g4"]!.id]);
    expect(new Set(Object.values(t.depthChart).flat().map(String))).toEqual(new Set(t.roster.map(String)));
  });

  it("never names a stand-in after a real player, and keeps names across refreshes", () => {
    const real = new Set(base.rosters.map((r) => r.full_name));
    for (const p of L.players) expect(real.has(p.bio.displayName)).toBe(false);
    expect(new Set(L.players.map((p) => p.bio.displayName)).size).toBe(L.players.length);
    const again = buildStandIns({ ...base, sealed: L.sealed, rosters: [...base.rosters, row({ gsis_id: "g11" })] });
    expect(again.sealed["g1"]).toEqual(L.sealed["g1"]);
    expect(again.sealed["g11"]!.id).toBe(`r:${Object.keys(L.sealed).length + 1}`);
  });

  it("elevates a practice-squad kicker when the team's 53 has none", () => {
    const L2 = buildStandIns({ ...base, rosters: [
      ...base.rosters,
      row({ gsis_id: "k1", position: "K", depth_chart_position: "K", status: "DEV", status_description_abbr: "P07" }),
      row({ gsis_id: "w1", position: "WR", depth_chart_position: "WR", status: "DEV", status_description_abbr: "P01" }),
    ] });
    const k = L2.sealed["k1"]!.id;
    expect(L2.teams[0]!.depthChart.K!.map(String)).toEqual([k]);
    expect(L2.provenance.elevated).toEqual([k]);
    expect(L2.provenance.practiceSquad["T01"]).toContain(L2.sealed["w1"]!.id);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(buildStandIns(base).sealed)).toBe(JSON.stringify(L.sealed));
  });
});

describe("helpers", () => {
  it("ageOn counts whole years", () => {
    expect(ageOn("2000-10-23", "2026-10-23")).toBe(26);
    expect(ageOn("2000-10-24", "2026-10-23")).toBe(25);
  });
  it("rosterStatus reads the detailed code, and the coarse status must agree", () => {
    expect(rosterStatus("ACT", "A01")).toBe("active");
    expect(rosterStatus("ACT", "P07")).toBe("practice");
    expect(rosterStatus("RES", "R48")).toBe("reserve");
    expect(rosterStatus("RET", "R02")).toBeUndefined();
    expect(rosterStatus("CUT", "A01")).toBeUndefined();
  });
  it("gamePosition splits tackles and guards by ESPN side, else evenly", () => {
    const sides: Record<string, number> = {};
    expect(gamePosition("T", "OL", new Set(["RT"]), sides)).toBe("RT");
    expect(gamePosition("T", "OL", new Set(), sides)).toBe("LT");
    expect(gamePosition("G", "OL", new Set(), sides)).toBe("LG");
    expect(gamePosition("S", "DB", new Set(), sides)).toBe("SS");
    expect(gamePosition(null, "DB", new Set(), sides)).toBe("CB");
  });
});
