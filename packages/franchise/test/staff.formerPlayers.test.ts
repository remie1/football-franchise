/**
 * ADR-094 §10 (build step 3b): former players come back as coaches and scouts.
 */
import { describe, it, expect } from "vitest";
import { attrId, playerId, type FranchiseEvent, type PlayerState } from "@ff/contracts";
import {
  buildLeague, buildStaff, currentJob, enterFormerPlayers, fromPlayer, isFrontOfficeRole, makeGm, retireeGoes, runStaffOffseason,
  scoutsReady, standInRetirees, staffSteps, staffTurnoverCheck, standInSeason, FORMER_PLAYERS,
  type DayStepContext, type LeaguePeople, type Retiree, type StaffWorld,
} from "../src/index.js";
import { gmScore } from "../src/staff/frontOffice.js";

const SEED = "former";
const league = buildLeague(SEED);
const built = buildStaff(league, { firstSeason: 2026, historySeasons: 4 });
const world: StaffWorld = (() => {
  const gms = built.world.teams.map((t) => makeGm(t, SEED));
  return { ...built.world, teams: built.world.teams.map((t, i) => ({ ...t, staff: [...t.staff, gms[i]!.id] })), staff: [...built.world.staff, ...gms] };
})();
const retirees = standInRetirees(2026, 32, SEED);

describe("who comes back (ADR-094 §10)", () => {
  it("reads awareness, discipline and career length, never position, and is the same draw every time", () => {
    const share = (f: (r: Retiree) => Retiree, goes: "COACH" | "SCOUT") => {
      let n = 0;
      for (let k = 0; k < 40; k++) for (const r of standInRetirees(2000 + k, 32, SEED)) if (retireeGoes(f(r), SEED) === goes) n++;
      return n;
    };
    const keep = (r: Retiree) => r;
    expect(share((r) => ({ ...r, awareness: 75, discipline: 75 }), "COACH")).toBeGreaterThan(share((r) => ({ ...r, awareness: 25, discipline: 25 }), "COACH"));
    expect(share((r) => ({ ...r, awareness: 75 }), "SCOUT")).toBeGreaterThan(share((r) => ({ ...r, awareness: 25 }), "SCOUT"));
    expect(share((r) => ({ ...r, seasons: 10 }), "COACH")).toBeGreaterThan(share((r) => ({ ...r, seasons: 0 }), "COACH"));
    expect(share((r) => ({ ...r, age: FORMER_PLAYERS.maxAge + 1 }), "COACH")).toBe(0);
    expect(share(keep, "COACH")).toBeGreaterThan(0);
    for (const r of retirees) expect(retireeGoes(r, SEED)).toBe(retireeGoes(r, SEED));
  });

  it("reads a real player's sheet", () => {
    const p = {
      bio: { id: playerId("P1"), displayName: "Sam Field", position: "LB", age: 31, heightIn: 74, weightLb: 240, draft: "UDFA", creditedSeasons: 8 },
      attributes: { kind: "true", values: { [attrId("awareness") as string]: 70, [attrId("discipline") as string]: 60 }, traits: {} },
    } as unknown as PlayerState;
    expect(fromPlayer(p)).toEqual({ id: "P1", name: "Sam Field", age: 31, seasons: 8, awareness: 70, discipline: 60 });
  });
});

describe("coming in", () => {
  const after = enterFormerPlayers(world, retirees, world.season, SEED);
  const newcomers = after.staff.filter((s) => s.formerPlayer !== undefined);

  it("seats coaches as young position coaches and scouts on front offices, under their own names", () => {
    expect(newcomers.length).toBeGreaterThan(0);
    const byId = new Map(retirees.map((r) => [String(r.id), r]));
    for (const s of newcomers) {
      const r = byId.get(String(s.formerPlayer))!;
      expect(s.displayName).toBe(r.name);
      expect(s.age).toBe(r.age);
      const job = currentJob(s)!;
      expect(job.firstSeason).toBe(world.season);
      expect(["POSITION_COACH", "SCOUT"]).toContain(job.role);
      if (job.role === "SCOUT") expect(isFrontOfficeRole(s.role)).toBe(true);
    }
    expect(newcomers.some((s) => currentJob(s)!.role === "SCOUT")).toBe(true);
    expect(newcomers.some((s) => currentJob(s)!.role === "POSITION_COACH")).toBe(true);
    expect(new Set(after.staff.map((s) => String(s.id))).size).toBe(after.staff.length);
    // Nothing changes the input; nobody comes in twice.
    expect(world.staff.some((s) => s.formerPlayer !== undefined)).toBe(false);
    expect(enterFormerPlayers(after, retirees, world.season, SEED)).toBe(after);
    expect(enterFormerPlayers(world, [], world.season, SEED)).toBe(world);
  });

  it("hands a long-serving scout the scouting director's chair when it opens", () => {
    // Four seasons on, empty one team's scouting director chair and play the offseason.
    const team = after.teams.find((t) => newcomers.some((s) => currentJob(s)!.role === "SCOUT" && currentJob(s)!.team === t.id))!;
    let w = after;
    for (let y = 0; y < FORMER_PLAYERS.scoutYears; y++) {
      const played = standInSeason(league, w, built.standIn, SEED);
      w = runStaffOffseason({ world: w, results: played.summaries, seed: SEED }).world;
    }
    const ready = scoutsReady(w, w.teams.find((t) => t.id === team.id)!, w.season, (s) => gmScore(s.attributes));
    expect(ready.length).toBeGreaterThan(0);
    const cleared = structuredClone(w);
    const director = cleared.staff.find((s) => currentJob(s)?.role === "SCOUTING_DIRECTOR" && currentJob(s)?.team === team.id)!;
    const job = currentJob(director)!;
    job.lastSeason = cleared.season - 1;
    job.ended = "RETIRED";
    director.retiredAfter = cleared.season - 1;
    const played = standInSeason(league, cleared, built.standIn, SEED);
    const next = runStaffOffseason({ world: cleared, results: played.summaries, seed: SEED }).world;
    const sd = next.staff.find((s) => currentJob(s)?.role === "SCOUTING_DIRECTOR" && currentJob(s)?.team === team.id)!;
    expect(sd.formerPlayer).toBeDefined();
    expect(sd.career.some((j) => j.role === "SCOUT" && j.ended === "PROMOTED")).toBe(true);
  });
});

describe("the many-season check", () => {
  it("counts the former players in each seat, the same for the same seed, and leaves them out on request", () => {
    const a = staffTurnoverCheck({ seed: SEED, seasons: 15, gms: true });
    expect(staffTurnoverCheck({ seed: SEED, seasons: 15, gms: true })).toEqual(a);
    const f = a.summary.former!;
    expect(f.seated.POSITION_COACH.played).toBeGreaterThan(0);
    expect(f.seated.HEAD_COACH.men).toBeGreaterThan(0);
    const none = staffTurnoverCheck({ seed: SEED, seasons: 5, formerPlayers: false });
    expect(none.summary.former).toBeUndefined();
  });
});

describe("in the season's walk", () => {
  it("brings in the players who retired today, read as they stood this morning", () => {
    const step = staffSteps().find((s) => s.id === "staff:former-players")!;
    const players: PlayerState[] = retirees.map((r) => ({
      bio: { id: r.id, displayName: r.name, position: "LB", age: r.age, heightIn: 74, weightLb: 240, draft: "UDFA", creditedSeasons: r.seasons },
      attributes: { kind: "true", values: { awareness: r.awareness, discipline: r.discipline }, traits: {} },
    }) as unknown as PlayerState);
    const morning: LeaguePeople = { teams: league.teams, players, picks: [], classes: [], freeAgents: [], staff: world.staff, coaching: { world } };
    const now: LeaguePeople = { ...morning, players: [] };
    const day = { season: 2026, seed: SEED, dayStart: morning } as unknown as DayStepContext;
    expect(step.run(now, { ...day, earlier: [] })).toBeUndefined();
    const earlier: FranchiseEvent[] = players.map((p) => ({ type: "PLAYER_RETIRED", payload: { player: p.bio.id, timing: "SEASON_END", reason: "UNSIGNED" } }));
    const r = step.run(now, { ...day, earlier })!;
    expect(r.people.coaching!.world).toEqual(enterFormerPlayers(world, retirees, world.season, SEED));
    expect(r.people.staff).toBe(r.people.coaching!.world.staff);
  });
});
