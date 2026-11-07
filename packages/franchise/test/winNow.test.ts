import { describe, it, expect } from "vitest";
import { teamId, type PersonalityType, type StaffId, type StaffState, type Team, type TeamId } from "@ff/contracts";
import {
  LEAN_CENTER, PRESSURE_PUSH, WIN_NOW_LEAN, checkViews, drawWinNowLean, headCoachFireChance, headCoachPressure, headCoachVerdict, restPoint,
  seatRelationships, syncViews, viewKey, winNowLean, withWinNowLean, workingLean,
  type StaffWorld,
} from "../src/index.js";

// ADR-094 build step 1: leans from patient to win-now (§1), job pressure (§2), and the views the GM
// and the head coach hold of each other (§6).

const T = teamId("T1");
const SEED = "adr094-step1";

function team(id: TeamId = T): Team {
  return {
    id, displayName: `Team ${String(id)}`, city: "City", roster: [], staff: [], depthChart: {},
    capState: { capLimit: 0, committed: 0, deadMoney: 0 }, staffBudget: { limit: 0, committed: 0 },
  };
}

let made = 0;
function man(type: PersonalityType, role: "HEAD_COACH" | "OC" | "DC" | "GM", tm: TeamId = T, seasons: StaffState["career"][number]["seasons"] = []): StaffState {
  made++;
  return {
    id: `W${String(made).padStart(4, "0")}` as StaffId, displayName: `Man ${made}`, role, age: 50, attributes: { politics: 50 },
    lineage: [], personalityType: type, teamId: tm,
    career: [{ level: "NFL", role, team: tm, employer: `Team ${String(tm)}`, firstSeason: 2024, seasons }],
  };
}

function world(staff: StaffState[], teams: Team[] = [team()]): StaffWorld {
  for (const t of teams) t.staff = staff.filter((s) => s.teamId === t.id).map((s) => s.id);
  return { season: 2026, teams, staff, contracts: [] };
}

describe("ADR-094 §1: leans", () => {
  it("are the same for the same man and seed, and differ by seed", () => {
    const gm = man("quiet", "GM");
    expect(drawWinNowLean(gm, SEED)).toBe(drawWinNowLean(gm, SEED));
    const draws = new Set(["a", "b", "c", "d", "e", "f"].map((s) => drawWinNowLean(gm, s)));
    expect(draws.size).toBeGreaterThan(1);
  });

  it("are whole points inside 0..100, GMs centered near 40 and head coaches near 60", () => {
    const gms: number[] = [], hcs: number[] = [];
    for (let i = 0; i < 400; i++) {
      const type: PersonalityType = (["demanding", "playersCoach", "cerebral", "fiery", "quiet"] as const)[i % 5]!;
      gms.push(drawWinNowLean(man(type, "GM"), SEED));
      hcs.push(drawWinNowLean(man(type, "HEAD_COACH"), SEED));
    }
    for (const x of [...gms, ...hcs]) { expect(Number.isInteger(x)).toBe(true); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100); }
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(Math.abs(mean(gms) - LEAN_CENTER.GM)).toBeLessThan(3);
    expect(Math.abs(mean(hcs) - LEAN_CENTER.HEAD_COACH)).toBeLessThan(3);
  });

  it("lean win-now for fiery men and patient for quiet ones, on average (Q1 a)", () => {
    const avg = (type: PersonalityType) => {
      let s = 0;
      for (let i = 0; i < 300; i++) s += drawWinNowLean(man(type, "HEAD_COACH"), SEED);
      return s / 300;
    };
    expect(avg("fiery") - avg("quiet")).toBeGreaterThan(14);
  });

  it("read the lean a man holds before drawing one, and a stored lean is the draw", () => {
    const hc = man("fiery", "HEAD_COACH");
    expect(winNowLean({ ...hc, attributes: { ...hc.attributes, [WIN_NOW_LEAN]: 12 } }, SEED)).toBe(12);
    const stored = withWinNowLean(hc, SEED);
    expect(stored.attributes[WIN_NOW_LEAN]).toBe(drawWinNowLean(hc, SEED));
    expect(winNowLean(stored, "another seed")).toBe(drawWinNowLean(hc, SEED));
    expect(hc.attributes[WIN_NOW_LEAN]).toBeUndefined();
  });
});

describe("ADR-094 §2: pressure and the working lean", () => {
  it("pushes a lean two thirds of the way to 100 at full pressure and not at all at none (Q2 a)", () => {
    expect(workingLean(40, 1)).toBeCloseTo(40 + 60 * PRESSURE_PUSH);
    expect(workingLean(40, 1)).toBeCloseTo(80);
    expect(workingLean(40, 0)).toBe(40);
    expect(workingLean(40, 2)).toBeCloseTo(80);
    expect(workingLean(100, 0.5)).toBe(100);
  });

  it("rises as the season goes badly, and with the last contract year", () => {
    const hc = man("demanding", "HEAD_COACH", T, [
      { season: 2024, record: { wins: 8, losses: 9, ties: 0 }, rosterRank: 16 },
      { season: 2025, record: { wins: 6, losses: 11, ties: 0 }, rosterRank: 16 },
    ]);
    const base = { season: 2026, rosterRank: 16, teamCount: 32, presidentTalent: 50 };
    const good = headCoachPressure(hc, { ...base, record: { wins: 7, losses: 2, ties: 0 } });
    const bad = headCoachPressure(hc, { ...base, record: { wins: 2, losses: 7, ties: 0 } });
    expect(bad).toBeGreaterThan(good);
    const lastYear = headCoachPressure(hc, { ...base, record: { wins: 2, losses: 7, ties: 0 }, lastContractYear: true });
    expect(lastYear).toBeCloseTo(Math.min(1, bad + 0.15));
  });

  it("is the president's offseason chance when the season so far is the whole season", () => {
    const seasons = [
      { season: 2024, record: { wins: 10, losses: 7, ties: 0 }, rosterRank: 10 },
      { season: 2025, record: { wins: 5, losses: 12, ties: 0 }, rosterRank: 12 },
    ];
    const hc = man("cerebral", "HEAD_COACH", T, seasons);
    const now = { season: 2026, record: { wins: 4, losses: 13, ties: 0 }, rosterRank: 14 };
    const p = headCoachPressure(hc, { ...now, teamCount: 32, presidentTalent: 60 });
    const offseason = headCoachFireChance(headCoachVerdict([...seasons, now], { played: 2026, teamCount: 32, correction: 0.6, politics: 50 }));
    expect(p).toBe(offseason);
    expect(p).toBeGreaterThan(0);
  });

  it("is 0 for a man with no job", () => {
    const hc = man("quiet", "HEAD_COACH");
    const out = { ...hc, career: [{ ...hc.career[0]!, lastSeason: 2025, ended: "FIRED" as const }] };
    expect(headCoachPressure(out, { season: 2026, record: { wins: 0, losses: 9, ties: 0 }, teamCount: 32, presidentTalent: 50 })).toBe(0);
  });
});

describe("ADR-094 §6: the GM and the head coach hold views of each other", () => {
  it("one each way, at their rest points, and none between the GM and the coordinators", () => {
    const hc = man("fiery", "HEAD_COACH"), oc = man("cerebral", "OC"), gm = man("quiet", "GM");
    const w = world([hc, oc, gm]);
    const views = seatRelationships(w);
    const keys = new Set(views.map((v) => viewKey(v.from, v.of)));
    expect(keys.has(viewKey(gm.id, { staff: hc.id }))).toBe(true);
    expect(keys.has(viewKey(hc.id, { staff: gm.id }))).toBe(true);
    expect(keys.has(viewKey(gm.id, { staff: oc.id }))).toBe(false);
    expect(keys.has(viewKey(oc.id, { staff: gm.id }))).toBe(false);
    expect(views.length).toBe(4);
    const people = new Map(w.staff.map((s) => [String(s.id), s]));
    for (const v of views) expect(v.score).toBe(restPoint(v, people));
    expect(() => checkViews(views, w)).not.toThrow();
  });

  it("on the user's team, the GM views the user, who stands in the head coach's place", () => {
    const hc = man("fiery", "HEAD_COACH"), gm = man("quiet", "GM");
    const w = world([hc, gm]);
    const views = seatRelationships(w, { userTeam: T });
    expect(views.map((v) => viewKey(v.from, v.of))).toEqual([viewKey(gm.id, { user: T })]);
  });

  it("a team with no GM, and a GM with no head coach, add nothing", () => {
    const hc = man("fiery", "HEAD_COACH", teamId("T2")), gm = man("quiet", "GM", teamId("T3"));
    const w = world([hc, gm], [team(teamId("T2")), team(teamId("T3"))]);
    expect(seatRelationships(w)).toEqual([]);
  });

  it("syncing an older world's views adds the GM's at rest and keeps the rest", () => {
    const hc = man("fiery", "HEAD_COACH"), oc = man("cerebral", "OC"), gm = man("demanding", "GM");
    const before = seatRelationships(world([hc, oc]));
    const moved = before.map((v) => ({ ...v, score: v.score + 7 }));
    const w = world([hc, oc, gm]);
    const after = syncViews(moved, w);
    expect(after.slice(0, moved.length)).toEqual(moved);
    expect(after.length).toBe(moved.length + 2);
    expect(() => checkViews(after, w)).not.toThrow();
  });
});
