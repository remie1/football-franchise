import { describe, it, expect } from "vitest";
import {
  teamId, DEFAULT_LEAGUE_RULES, SAVE_FORMAT_VERSION,
  type StaffState, type StaffContract, type StaffId, type SaveFile, type FranchiseEvent,
} from "../src/index.js";

// ADR-080 P1-P4: the staff shapes are plain data and survive a save round-trip unchanged.
const at = { season: 2026, phase: "OFF_EVAL" as const, week: 1, day: 1 };
const id = "S00001" as StaffId;

const coach: StaffState = {
  id, displayName: "Test Coach", role: "DC", age: 47, attributes: { gamePlanning: 61 }, schemeFamily: "DEF_43_OVER",
  lineage: ["S00002" as StaffId], personalityType: "cerebral", teamId: teamId("T1"),
  career: [
    { level: "COLLEGE", role: "DC", employer: "Ashgrove State", firstSeason: 2020, lastSeason: 2022, ended: "HIRED_AWAY",
      seasons: [{ season: 2022, record: { wins: 9, losses: 3, ties: 0 } }] },
    { level: "NFL", role: "DC", team: teamId("T1"), employer: "First", firstSeason: 2023,
      seasons: [{ season: 2025, record: { wins: 11, losses: 6, ties: 0 }, rosterRank: 20, unitRank: 4, playoffs: { wins: 1, champion: false } }] },
  ],
  disguise: { passSnapMaskShare: 0.34 },
};

const contract: StaffContract = {
  staff: id, team: teamId("T2"), role: "OC", firstSeason: 2024, lastSeason: 2027, salary: 2_500_000, signedAt: at,
  terminated: { at, reason: "FIRED" },
};

describe("staff shapes (ADR-080)", () => {
  it("a coach with a career and a disguise habit, and a terminated contract, survive JSON unchanged", () => {
    expect(JSON.parse(JSON.stringify(coach))).toEqual(coach);
    expect(JSON.parse(JSON.stringify(contract))).toEqual(contract);
  });

  it("a save carries staff contracts, and a save without them still type-checks", () => {
    const save: SaveFile = {
      formatVersion: SAVE_FORMAT_VERSION, createdBy: "test", registrySchemaVersion: 1, worldSeed: "s", calendar: at,
      leagueRules: DEFAULT_LEAGUE_RULES,
      world: {
        teams: [], players: [], staff: [coach], staffContracts: [contract], contracts: [], perceptions: [],
        league: { conferences: [], divisions: [] }, season: null, narrativeState: null, fashion: null,
      },
      history: { seasons: [], transactions: [] },
    };
    expect(JSON.parse(JSON.stringify(save))).toEqual(save);
    const { staffContracts: _omit, ...older } = save.world;
    const before: SaveFile = { ...save, world: older };
    expect(before.world.staffContracts).toBeUndefined();
  });

  it("the staff events carry a typed role and reason", () => {
    const hired: FranchiseEvent = { type: "STAFF_HIRED", payload: { staff: id, team: teamId("T1"), role: "HEAD_COACH" } };
    const left: FranchiseEvent = { type: "STAFF_DEPARTED", payload: { staff: id, team: teamId("T1"), reason: "CONTRACT_EXPIRED" } };
    expect([hired.type, left.type]).toEqual(["STAFF_HIRED", "STAFF_DEPARTED"]);
  });
});
