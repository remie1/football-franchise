import { describe, it, expect } from "vitest";
import type { PersonalityType, PlayerState, StaffId, Team, TeamId } from "@ff/contracts";
import {
  buildLeague, buildStaff, candidateReport, readResume, reputation, firedStigma, rosterFit, rosterExpectation,
  sideLean, unprovenPenalty, seatOf, STYLE_MATCH, STAFF_TUNING,
} from "../src/index.js";
import type { StaffState } from "../src/staff/contractsShim.js";

const league = buildLeague("staff-3");
const { world } = buildStaff(league, { firstSeason: 2026, historySeasons: 6 });

/** A bare coach with a made-up résumé. */
function coach(jobs: StaffState["career"], extra: Partial<StaffState> = {}): StaffState {
  return {
    id: "X1" as StaffId, displayName: "Test Coach", role: "OC", age: 45, attributes: {}, schemeFamily: "OFF_SPREAD",
    lineage: [], personalityType: "cerebral", career: jobs, ...extra,
  };
}
const T = "T01" as TeamId;
const nflHc = (seasons: { season: number; wins: number; rosterRank?: number }[]): StaffState["career"][number] => ({
  level: "NFL", role: "HEAD_COACH", team: T, employer: "Test", firstSeason: seasons[0]!.season,
  lastSeason: seasons[seasons.length - 1]!.season, ended: "FIRED",
  seasons: seasons.map((s) => ({
    season: s.season, record: { wins: s.wins, losses: 17 - s.wins, ties: 0 },
    ...(s.rosterRank !== undefined ? { rosterRank: s.rosterRank } : {}),
  })),
});

describe("reading a résumé (ADR-080 §7.3, the owner's note on Q6)", () => {
  it("credits a coach who beat a bad roster, the more so the sharper the reader", () => {
    const bad = coach([nflHc([{ season: 2024, wins: 6, rosterRank: 32 }, { season: 2025, wins: 6, rosterRank: 31 }])]);
    const sharp = readResume(bad, "HEAD_COACH", 2025, 1, 32).points;
    const blunt = readResume(bad, "HEAD_COACH", 2025, 0, 32).points;
    expect(blunt).toBeLessThan(0); // 6-11 at face value
    expect(sharp).toBeGreaterThan(0); // 6-11 with the league's worst roster beat what it should have done
    expect(rosterExpectation(1, 32)).toBeCloseTo(0.7);
    expect(rosterExpectation(32, 32)).toBeCloseTo(0.3);
  });

  it("counts a college season for less than an NFL season with the same record", () => {
    const college = coach([{ level: "COLLEGE", role: "HEAD_COACH", employer: "Ashgrove State", firstSeason: 2024, lastSeason: 2025,
      seasons: [2024, 2025].map((season) => ({ season, record: { wins: 10, losses: 2, ties: 0 } })) }]);
    const nfl = coach([{ level: "NFL", role: "HEAD_COACH", team: T, employer: "Test", firstSeason: 2024, lastSeason: 2025,
      seasons: [2024, 2025].map((season) => ({ season, record: { wins: 14, losses: 3, ties: 0 } })) }]);
    const c = readResume(college, "HEAD_COACH", 2025, 0.5, 32);
    const n = readResume(nfl, "HEAD_COACH", 2025, 0.5, 32);
    expect(c.lines[0]!.weight).toBeLessThan(n.lines[0]!.weight);
    expect(c.points).toBeLessThan(n.points);
    expect(c.points).toBeGreaterThan(0);
  });

  it("weighs recent seasons most", () => {
    const r = readResume(coach([nflHc([{ season: 2021, wins: 8 }, { season: 2025, wins: 8 }])]), "HEAD_COACH", 2025, 0.5, 32);
    expect(r.lines[0]!.weight).toBeLessThan(r.lines[1]!.weight);
    expect(r.lines[1]!.weight).toBe(1);
  });

  it("trusts a long good record more than one good year", () => {
    const one = readResume(coach([nflHc([{ season: 2025, wins: 12 }])]), "HEAD_COACH", 2025, 0.5, 32).points;
    const four = readResume(coach([nflHc([2022, 2023, 2024, 2025].map((season) => ({ season, wins: 12 })))]), "HEAD_COACH", 2025, 0.5, 32).points;
    expect(four).toBeGreaterThan(one);
  });

  it("marks a fired head coach for head coach searches only, more heavily while it is recent", () => {
    const fired = coach([nflHc([{ season: 2024, wins: 4 }])]);
    expect(firedStigma(fired, "HEAD_COACH", 2025)).toBe(STAFF_TUNING.firedHcStigmaRecent);
    expect(firedStigma(fired, "HEAD_COACH", 2030)).toBe(STAFF_TUNING.firedHcStigmaLater);
    expect(firedStigma(fired, "OC", 2025)).toBe(0);
    expect(firedStigma(coach([]), "HEAD_COACH", 2025)).toBe(0);
  });

  it("costs a head coach candidate who never ran a unit, less if he ran one only in college", () => {
    const line = (season: number) => ({ season, record: { wins: 8, losses: 4, ties: 0 } });
    const position = coach([{ level: "NFL", role: "POSITION_COACH", team: T, employer: "Test", firstSeason: 2020, seasons: [line(2020)] }]);
    const college = coach([{ level: "COLLEGE", role: "HEAD_COACH", employer: "Ashgrove State", firstSeason: 2020, seasons: [line(2020)] }]);
    const nflDc = coach([{ level: "NFL", role: "DC", team: T, employer: "Test", firstSeason: 2020, seasons: [line(2020)] }],
      { schemeFamily: "DEF_43_OVER" });
    expect(unprovenPenalty(position, "HEAD_COACH")).toBe(STAFF_TUNING.hcUnprovenPenalty);
    expect(unprovenPenalty(college, "HEAD_COACH")).toBe(STAFF_TUNING.hcCollegeOnlyPenalty);
    expect(unprovenPenalty(nflDc, "HEAD_COACH")).toBe(0);
    expect(unprovenPenalty(position, "OC")).toBe(0);
    // The lean toward offensive minds and away from special teams, head coach searches only.
    const stc = coach([], { schemeFamily: "ST_SPECIAL_TEAMS" });
    expect(sideLean(college, "HEAD_COACH")).toBe(STAFF_TUNING.hcSideLean.OFFENSE);
    expect(sideLean(nflDc, "HEAD_COACH")).toBe(STAFF_TUNING.hcSideLean.DEFENSE);
    expect(sideLean(stc, "HEAD_COACH")).toBe(STAFF_TUNING.hcSideLean.SPECIAL_TEAMS);
    expect(STAFF_TUNING.hcSideLean.OFFENSE).toBeGreaterThan(STAFF_TUNING.hcSideLean.DEFENSE);
    expect(STAFF_TUNING.hcSideLean.DEFENSE).toBeGreaterThan(STAFF_TUNING.hcSideLean.SPECIAL_TEAMS);
    expect(sideLean(college, "OC")).toBe(0);
  });
});

describe("the interview and the report (ADR-080 §7.2, §7.4)", () => {
  const team = world.teams[0]!;
  const pres = world.staff.find((s) => s.teamId === team.id && s.role === "PRESIDENT")!;
  const candidate = world.staff.find((s) => seatOf(s) === "OC" && s.teamId !== team.id)!;
  const report = (talentEvaluation: number) => candidateReport({
    candidate, seat: "HEAD_COACH",
    evaluator: { staff: { ...pres, attributes: { ...pres.attributes, talentEvaluation } }, team },
    played: 2025, teamCount: 32, players: new Map(), seed: "staff-3",
  });

  it("reads every skill with an error that shrinks as the evaluator's talent evaluation rises", () => {
    const sharp = report(95);
    const blunt = report(20);
    expect(sharp.readError).toBeLessThan(blunt.readError);
    expect(sharp.readError).toBeCloseTo(STAFF_TUNING.interviewErrorMin + STAFF_TUNING.interviewErrorSpan * 0.05);
    expect(Object.keys(sharp.read)).toHaveLength(19);
    const off = (r: ReturnType<typeof report>) =>
      Object.entries(r.read).reduce((sum, [id, v]) => sum + Math.abs(v - candidate.attributes[id]!), 0);
    expect(off(sharp)).toBeLessThan(off(blunt));
  });

  it("is the same read every time for the same team, candidate and year", () => {
    expect(report(60)).toEqual(report(60));
  });

  it("adds up: read + résumé + experience + fit + lean - age - stigma - unproven", () => {
    const r = report(60);
    const sum = r.seatRead + r.resume.points + r.experience + STAFF_TUNING.fitPoints * r.fit + (r.tree ? STAFF_TUNING.treeBonus : 0)
      + r.sideLean - r.agePenalty - r.stigma - r.unproven;
    expect(r.judgement).toBeCloseTo(sum, 9);
  });

  it("ranks the public's interview list by résumé, experience and buzz", () => {
    const a = reputation(candidate, "HEAD_COACH", 2025, 32, "staff-3");
    expect(a).toBe(reputation(candidate, "HEAD_COACH", 2025, 32, "staff-3"));
    expect(Number.isFinite(a)).toBe(true);
  });
});

describe("roster fit (ADR-080 §5)", () => {
  const player = (id: string, type: PersonalityType, coachingStyle?: number): PlayerState => ({
    bio: { id: id as PlayerState["bio"]["id"], displayName: id, position: "WR", age: 25, heightIn: 72, weightLb: 200, draft: "UDFA" },
    attributes: {} as PlayerState["attributes"],
    condition: { stamina: 100, morale: 0 },
    personality: { type, needs: coachingStyle === undefined ? {} : { coachingStyle } },
  });

  it("is 0 with no roster (every team today)", () => {
    expect(rosterFit("fiery", world.teams[0]!, new Map())).toBe(0);
  });

  it("averages the style-match row over the players, weighted by how much each cares and doubled for starters", () => {
    const players = [player("P1", "fiery"), player("P2", "quiet", 3)];
    const team: Team = { ...world.teams[0]!, roster: players.map((p) => p.bio.id), depthChart: { WR: [players[0]!.bio.id] } };
    const map = new Map(players.map((p) => [String(p.bio.id), p]));
    const fit = rosterFit("demanding", team, map);
    const expected = (2 * STYLE_MATCH.demanding.fiery + 3 * STYLE_MATCH.demanding.quiet) / 5;
    expect(fit).toBeCloseTo(expected, 12);
  });
});
