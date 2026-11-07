/**
 * ADR-094 Q13 a: presidents fire GMs and head coaches in midseason, an interim finishing the year.
 */
import { afterEach, describe, it, expect } from "vitest";
import type { CalendarStamp, StaffState, WinLossTie } from "@ff/contracts";
import {
  buildLeague, buildStaff, makeGm, runMidseasonWeek, runStaffOffseason, standInSeason, gmPressure, seatOf, currentJob,
  isInterimContract, ladderJob, MIDSEASON, INTERIM_KEEP, SEATS, seatRelationships, checkViews,
  type StaffWorld,
} from "../src/index.js";

const SEED = "staff-mid";
const league = buildLeague(SEED);
const built = buildStaff(league, { firstSeason: 2026, historySeasons: 8 });

function withGms(world: StaffWorld): StaffWorld {
  const gms = world.teams.map((t) => {
    const gm = makeGm(t, SEED);
    gm.career = [{ ...gm.career[0]!, firstSeason: world.season }];
    return gm;
  });
  return { ...world, teams: world.teams.map((t, i) => ({ ...t, staff: [...t.staff, gms[i]!.id] })), staff: [...world.staff, ...gms] };
}

/** One season, its offseason, then a world in season two with GMs and a front office. */
const season1 = standInSeason(league, withGms(built.world), built.standIn, SEED);
const world2 = runStaffOffseason({ world: withGms(built.world), results: season1.summaries, seed: SEED }).world;
const at = (week: number): CalendarStamp => ({ season: world2.season, phase: "REGULAR_SEASON", week, day: 7 });
const records = (w: StaffWorld, rec: WinLossTie) => new Map(w.teams.map((t) => [String(t.id), rec]));
const winless = { wins: 0, losses: 8, ties: 0 };
const base = { world: world2, season: world2.season, weeks: 18, seed: SEED };

const saved = { ...MIDSEASON };
const savedKeep = { ...INTERIM_KEEP };
afterEach(() => { Object.assign(MIDSEASON, saved); Object.assign(INTERIM_KEEP, savedKeep); });

/** Every team has one man in each coaching seat and one seated GM. */
function assertSeated(w: StaffWorld) {
  for (const team of w.teams) {
    for (const seat of SEATS) expect(w.staff.filter((s) => seatOf(s) === seat && s.teamId === team.id), `${String(team.id)} ${seat}`).toHaveLength(1);
    expect(w.staff.filter((s) => s.role === "GM" && s.teamId === team.id), `${String(team.id)} GM`).toHaveLength(1);
  }
  expect(new Set(w.staff.map((s) => String(s.id))).size).toBe(w.staff.length);
}

describe("midseason firings (ADR-094 Q13 a)", () => {
  it("fires no one before week 4 or in the last three weeks, and hands back the same world", () => {
    for (const week of [1, 2, 3, 16, 17, 18]) {
      const r = runMidseasonWeek({ ...base, week, at: at(week), records: records(world2, winless) });
      expect(r.world).toBe(world2);
      expect(r.events).toEqual([]);
    }
  });

  it("fires more, the worse the record", () => {
    const count = (rec: WinLossTie) => {
      let n = 0;
      for (let week = 4; week <= 15; week++) n += runMidseasonWeek({ ...base, week, at: at(week), records: records(world2, rec) }).moves.filter((m) => m.kind === "DEPARTED").length;
      return n;
    };
    expect(count(winless)).toBeGreaterThan(count({ wins: 6, losses: 2, ties: 0 }));
  });

  it("seats an interim head coach from his coordinators and backfills the coordinator's seat", () => {
    MIDSEASON.hcScale = 1; MIDSEASON.hcPower = 0; MIDSEASON.gmScale = 0;
    const r = runMidseasonWeek({ ...base, week: 8, at: at(8), records: records(world2, winless) });
    assertSeated(r.world);
    const fired = r.moves.filter((m) => m.kind === "DEPARTED");
    expect(fired).toHaveLength(world2.teams.length);
    for (const m of r.moves.filter((x) => x.kind === "HIRED")) expect(m.interim).toBe(true);
    for (const team of r.world.teams) {
      const hc = r.world.staff.find((s) => seatOf(s) === "HEAD_COACH" && s.teamId === team.id)!;
      const before = world2.staff.find((s) => s.id === hc.id)!;
      expect(["OC", "DC"]).toContain(seatOf(before));
      const c = r.world.contracts.find((x) => x.staff === hc.id && x.team === team.id && x.terminated === undefined)!;
      expect(isInterimContract(c)).toBe(true);
    }
    // The fired men's deals stay on the books (dead money); their résumés keep the season so far.
    for (const m of fired) {
      const man = r.world.staff.find((s) => s.id === m.staff)!;
      expect(currentJob(man)).toBeUndefined();
      expect(man.career[man.career.length - 1]!.seasons.at(-1)!.record).toEqual(winless);
      expect(r.world.contracts.some((c) => c.staff === m.staff && c.terminated?.reason === "FIRED")).toBe(true);
    }
    // Nothing changes the input.
    expect(world2.staff.filter((s) => seatOf(s) === "HEAD_COACH")).toHaveLength(world2.teams.length);
  });

  it("seats an interim GM from the team's front office", () => {
    MIDSEASON.gmScale = 1; MIDSEASON.gmPower = 0; MIDSEASON.hcScale = 0;
    const r = runMidseasonWeek({ ...base, week: 8, at: at(8), records: records(world2, winless) });
    assertSeated(r.world);
    for (const team of r.world.teams) {
      const gm = r.world.staff.find((s) => s.role === "GM" && s.teamId === team.id)!;
      const before = world2.staff.find((s) => s.id === gm.id)!;
      expect(ladderJob(before)?.team).toBe(team.id);
    }
    const events = r.events.map((e) => e.event.type);
    expect(events.filter((t) => t === "STAFF_DEPARTED")).toHaveLength(world2.teams.length);
    expect(events.filter((t) => t === "STAFF_HIRED")).toHaveLength(world2.teams.length);
  });

  it("never touches the user's team", () => {
    MIDSEASON.hcScale = 1; MIDSEASON.hcPower = 0; MIDSEASON.gmScale = 1; MIDSEASON.gmPower = 0;
    const user = world2.teams[0]!.id;
    const r = runMidseasonWeek({ ...base, week: 8, at: at(8), records: records(world2, winless), userTeam: user });
    expect(r.moves.some((m) => m.team === user)).toBe(false);
    expect(r.gmMoves.some((m) => m.team === user)).toBe(false);
  });

  it("is the same twice from the same seed, and keeps the views whole", () => {
    MIDSEASON.hcScale = 0.5; MIDSEASON.gmScale = 0.5;
    const views = seatRelationships(world2);
    const go = () => runMidseasonWeek({ ...base, week: 8, at: at(8), records: records(world2, winless), relationships: { views } });
    const a = go();
    expect(go()).toEqual(a);
    checkViews(a.relationships!, a.world);
  });

  it("opens the job after the season unless the interim is kept on", () => {
    MIDSEASON.hcScale = 1; MIDSEASON.hcPower = 0; MIDSEASON.gmScale = 1; MIDSEASON.gmPower = 0;
    const mid = runMidseasonWeek({ ...base, week: 8, at: at(8), records: records(world2, winless) });
    // Each team's interim head coach and GM (another team may hire one of them; his own team does not keep him).
    const interims = new Set([
      ...mid.moves.filter((m) => m.interim && m.seat === "HEAD_COACH"), ...mid.gmMoves.filter((m) => m.interim),
    ].map((m) => `${String(m.team)}/${String(m.staff)}`));
    const results = standInSeason(league, mid.world, season1.state, SEED).summaries;
    INTERIM_KEEP.HEAD_COACH = 0; INTERIM_KEEP.GM = 0;
    const off = runStaffOffseason({ world: mid.world, results, seed: SEED });
    for (const team of off.world.teams) {
      const hc = off.world.staff.find((s) => seatOf(s) === "HEAD_COACH" && s.teamId === team.id)!;
      const gm = off.world.staff.find((s) => s.role === "GM" && s.teamId === team.id)!;
      expect(interims.has(`${String(team.id)}/${String(hc.id)}`)).toBe(false);
      expect(interims.has(`${String(team.id)}/${String(gm.id)}`)).toBe(false);
    }
    INTERIM_KEEP.HEAD_COACH = 1; INTERIM_KEEP.GM = 1;
    const kept = runStaffOffseason({ world: mid.world, results, seed: SEED });
    for (const team of kept.world.teams) {
      const hc = kept.world.staff.find((s) => seatOf(s) === "HEAD_COACH" && s.teamId === team.id)!;
      expect(interims.has(`${String(team.id)}/${String(hc.id)}`)).toBe(true);
      const c = kept.world.contracts.find((x) => x.staff === hc.id && x.team === team.id && x.terminated === undefined)!;
      expect(c.lastSeason).toBeGreaterThan(world2.season);
    }
  });
});

describe("a GM's pressure (ADR-094 §2)", () => {
  const gm: StaffState = world2.staff.find((s) => s.role === "GM" && s.teamId !== undefined)!;
  const now = (wins: number, losses: number) => ({ season: world2.season, record: { wins, losses, ties: 0 }, teamCount: 32, presidentTalent: 50 });
  it("rises with a losing record and with the last contract year", () => {
    expect(gmPressure(gm, now(1, 9))).toBeGreaterThan(gmPressure(gm, now(9, 1)));
    expect(gmPressure(gm, { ...now(5, 5), lastContractYear: true })).toBeGreaterThan(gmPressure(gm, now(5, 5)));
  });
});
