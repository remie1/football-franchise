import { describe, it, expect } from "vitest";
import { COACH_ATTRIBUTE_REGISTRY_V1, createRng } from "@ff/contracts";
import {
  averageSkill, buildLeague, buildStaff, freshStaff, makeCoach, seatOf, sideOf, currentJob, isRetired,
  SEATS, STAFF_TUNING, COACH_SKILLS,
} from "../src/index.js";
import type { StaffWorld } from "../src/index.js";

const league = buildLeague("staff-1");
const built = buildStaff(league, { firstSeason: 2026 });
const world = built.world;

/** Every (team, seat, season) a job's résumé line claims. */
function claims(w: StaffWorld) {
  const seen = new Map<string, string[]>();
  for (const s of w.staff) {
    for (const job of s.career) {
      if (job.level !== "NFL" || job.team === undefined || job.role === "POSITION_COACH") continue;
      for (const line of job.seasons) {
        const k = `${String(job.team)}/${job.role}/${line.season}`;
        seen.set(k, [...(seen.get(k) ?? []), String(s.id)]);
      }
    }
  }
  return seen;
}

describe("coach maker (ADR-080 C1)", () => {
  it("rates every coach on all 19 skills, 1-99", () => {
    expect(COACH_SKILLS).toEqual(Object.keys(COACH_ATTRIBUTE_REGISTRY_V1));
    for (const s of world.staff) {
      for (const id of COACH_SKILLS) {
        const v = s.attributes[id]!;
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(99);
      }
    }
  });

  it("gives defensive coaches a disguise habit inside the owner's 10%-55%, and nobody else one", () => {
    for (const s of world.staff) {
      if (s.role === "PRESIDENT") {
        expect(s.schemeFamily).toBeUndefined();
        expect(s.disguise).toBeUndefined();
        continue;
      }
      if (sideOf(s) === "DEFENSE") {
        expect(s.disguise!.passSnapMaskShare).toBeGreaterThanOrEqual(0.10);
        expect(s.disguise!.passSnapMaskShare).toBeLessThanOrEqual(0.55);
        expect(s.disguise!.lookWeights).toBeUndefined(); // league defaults until the ADR-075 build
      } else {
        expect(s.disguise).toBeUndefined();
      }
    }
  });

  it("is a pure function of its seed", () => {
    const a = makeCoach(createRng("x", "c"), 0, { kind: "SEAT", seat: "DC", team: league.teams[0]!, season: 2000 }, new Set());
    const b = makeCoach(createRng("x", "c"), 0, { kind: "SEAT", seat: "DC", team: league.teams[0]!, season: 2000 }, new Set());
    expect(a).toEqual(b);
  });
});

describe("buildStaff (ADR-080 C1)", () => {
  it("seats a head coach, both coordinators, a special teams coach and a president on every team", () => {
    expect(world.season).toBe(2026);
    for (const team of world.teams) {
      const staff = team.staff.map((id) => world.staff.find((s) => s.id === id)!);
      expect(staff.map((s) => s.role).sort()).toEqual(["DC", "HEAD_COACH", "OC", "PRESIDENT", "STC"]);
      for (const s of staff) expect(s.teamId).toBe(team.id);
      for (const seat of SEATS) {
        const holders = world.staff.filter((s) => seatOf(s) === seat && s.teamId === team.id);
        expect(holders).toHaveLength(1);
        expect(currentJob(holders[0]!)!.team).toBe(team.id);
      }
    }
    // Nobody outside team.staff claims a team.
    const listed = new Set(world.teams.flatMap((t) => t.staff.map(String)));
    for (const s of world.staff) if (s.teamId !== undefined) expect(listed.has(String(s.id))).toBe(true);
  });

  it("writes résumés that agree with each other: one holder per seat per team-season", () => {
    const seen = claims(world);
    expect(seen.size).toBeGreaterThan(32 * 4 * 19);
    for (const [k, ids] of seen) expect(ids, k).toHaveLength(1);
  });

  it("gives every seated coach one live contract covering the first season, and counts the budget", () => {
    for (const team of world.teams) {
      for (const id of team.staff) {
        const s = world.staff.find((x) => x.id === id)!;
        if (s.role === "PRESIDENT") continue;
        const live = world.contracts.filter((c) => c.staff === id && c.team === team.id && c.terminated === undefined
          && c.firstSeason <= 2026 && c.lastSeason >= 2026);
        expect(live, String(id)).toHaveLength(1);
      }
      const committed = world.contracts
        .filter((c) => c.team === team.id && c.firstSeason <= 2026 && c.lastSeason >= 2026
          && (c.terminated === undefined || c.terminated.reason === "FIRED"))
        .reduce((sum, c) => sum + c.salary, 0);
      expect(team.staffBudget).toEqual({ limit: STAFF_TUNING.defaultStaffBudget, committed });
    }
  });

  it("anchors the ruler: the average sitting coordinator's average skill is 50 (47-53); head coaches higher", () => {
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const coords = world.staff.filter((s) => seatOf(s) === "OC" || seatOf(s) === "DC");
    const hcs = world.staff.filter((s) => seatOf(s) === "HEAD_COACH");
    const c = mean(coords.map((s) => averageSkill(s.attributes)));
    expect(c).toBeGreaterThan(47);
    expect(c).toBeLessThan(53);
    expect(mean(hcs.map((s) => averageSkill(s.attributes)))).toBeGreaterThan(c);
  });

  it("re-centres the sitting DCs' disguise habit on exactly 31.5% (ADR-075 §3.3)", () => {
    const dcs = world.staff.filter((s) => seatOf(s) === "DC");
    expect(dcs).toHaveLength(32);
    const mean = dcs.reduce((a, s) => a + s.disguise!.passSnapMaskShare, 0) / dcs.length;
    expect(Math.abs(mean - 0.315)).toBeLessThan(1e-9);
  });

  it("has a pool, a coaching tree and retirements after the history", () => {
    const pool = world.staff.filter((s) => !isRetired(s) && s.role !== "PRESIDENT" && seatOf(s) === undefined);
    expect(pool.length).toBeGreaterThanOrEqual(STAFF_TUNING.poolTarget - 5);
    expect(world.staff.some(isRetired)).toBe(true);
    const coords = world.staff.filter((s) => seatOf(s) === "OC" || seatOf(s) === "DC");
    expect(coords.filter((s) => s.lineage.length > 0).length).toBeGreaterThan(16);
    expect(built.history).toHaveLength(20);
    expect(built.history[19]![0]!.season).toBe(2025);
  });

  it("is deterministic, seed-sensitive and survives a JSON round trip (it goes in the save)", () => {
    expect(buildStaff(league, { firstSeason: 2026, historySeasons: 5 }))
      .toEqual(buildStaff(league, { firstSeason: 2026, historySeasons: 5 }));
    const other = buildStaff(league, { firstSeason: 2026, historySeasons: 5, seed: "another" });
    expect(other.world.staff.map((s) => s.displayName)).not.toEqual(
      buildStaff(league, { firstSeason: 2026, historySeasons: 5 }).world.staff.map((s) => s.displayName));
    expect(JSON.parse(JSON.stringify(world))).toEqual(world);
  });

  it("leaves the league it was given untouched", () => {
    const fresh = buildLeague("staff-1");
    expect(league).toEqual(fresh);
    expect(freshStaff(league, 2000, "s").teams[0]!.staff).toHaveLength(5);
    expect(league.teams[0]!.staff).toEqual([]);
  });
});
