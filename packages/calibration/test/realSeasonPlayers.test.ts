/**
 * ADR-087 §10 through the real sim: a season with the players' switches on plays with the people as
 * they are each week, and carrying on from a stop gives exactly the straight run. Two regular-season
 * weeks keep it quick.
 */
import { describe, expect, it } from "vitest";
import { isTruthLayerEvent, type CalendarStamp, type GameParticipation } from "@ff/contracts";
import { buildLeague, buildStaff } from "@ff/franchise";
import { peopleResolver, reservePool, runRealSeason } from "../src/season/realSeason.js";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";

const seed = "players-real-test";
const season = 2027;
const base = buildLeague(seed);
const staff = buildStaff(base, { firstSeason: season, historySeasons: 0, lineups: true }).world.staff;
const players = { development: true, injuries: true } as const;
const week = (n: number): CalendarStamp => ({ season, phase: "REGULAR_SEASON", week: n, day: 7 });

describe("a real-sim season with the players' switches on", () => {
  const straight = runRealSeason({ seed, season, players, staff, stopAfter: week(2) });

  it("plays its games, grows and hurts players, and labels the players' steps' events", () => {
    const types = new Set(straight.run.events.map((e) => e.event.type));
    for (const t of ["GAME_COMPLETED", "RATINGS_CHANGED", "INJURY_OCCURRED"]) expect(types.has(t as never), t).toBe(true);
    expect(straight.run.stepEvents!.length).toBeGreaterThan(0);
    expect(straight.run.events.some((e) => isTruthLayerEvent(e.event))).toBe(true);
  });

  it("starts with a pool of street free agents who are nobody's, and none of the league's own players", () => {
    const pool = reservePool(base, season, true);
    expect(pool.length).toBeGreaterThan(60);
    const league = new Set(straight.rated!.league.players.map((p) => String(p.bio.id)));
    for (const p of pool) {
      expect(p.teamId).toBeUndefined();
      expect(league.has(String(p.bio.id))).toBe(false);
    }
  });

  it("keeps the reserve squads' lone specialists, so the street has a kicker, a punter and a long snapper", () => {
    const pool = reservePool(base, season, true);
    for (const position of ["K", "P", "LS"]) expect(pool.some((p) => p.bio.position === position), position).toBe(true);
  });

  it("carried on from week 1 with the people, the steps' events and the day, gives the straight run", () => {
    const first = runRealSeason({ seed, season, players, staff, stopAfter: week(1) });
    const second = runRealSeason({
      seed, season, players, staff, stopAfter: week(2), resumeFrom: first.run.state,
      resume: { people: first.run.people!, events: first.run.stepEvents!.map((e) => e.envelope), through: first.run.calendar },
    });
    expect(JSON.stringify(second.run.events)).toBe(JSON.stringify(straight.run.events));
    expect(JSON.stringify(second.run.people)).toBe(JSON.stringify(straight.run.people));
  });

  it("refuses the flat league, which has no squads", () => {
    expect(() => runRealSeason({ seed, season, players, rosters: "flat" })).toThrow(/need squads/);
  });

  it("refuses growth for the stand-in league, whose players have no growth records yet", () => {
    expect(() => runRealSeason({ seed, season, players: { development: true }, rosters: "standin" })).toThrow(/no growth records/);
  });
});

describe("peopleResolver", () => {
  const rated = buildGeneratedLeague(base, { season, development: true });
  const people = { teams: rated.league.teams, players: rated.league.players, picks: [], classes: [], freeAgents: [] };
  const [home, away] = rated.league.teams;
  const game = { gameId: "g-test" as never, season, home: home!.id, away: away!.id, at: week(1), kind: "REGULAR" as never };
  const resolve = peopleResolver(rated);

  it("hands back the who-played report beside the result, the same for the same seed", () => {
    const a = resolve(game as never, "s1", people);
    expect("result" in a).toBe(true);
    const report = (a as { extras: { participation: GameParticipation[] } }).extras.participation;
    expect(report.length).toBeGreaterThan(40);
    expect(resolve(game as never, "s1", people)).toEqual(a);
  });

  it("never fields a player who is out, and fields one playing hurt", () => {
    const qb = home!.depthChart.QB![0]!;
    const out = { ...people, players: people.players.map((p) => (p.bio.id === qb ? { ...p, condition: { ...p.condition, injury: { kind: "knee", weeksRemaining: 2, playable: false, setting: "GAME" as const, band: "SHORT" as const, since: week(1) } } } : p)) };
    const report = (resolve(game as never, "s1", out) as { extras: { participation: GameParticipation[] } }).extras.participation;
    expect(report.some((r) => r.player === qb)).toBe(false);
    const sore = { ...people, players: people.players.map((p) => (p.bio.id === qb ? { ...p, condition: { ...p.condition, injury: { kind: "ankle", weeksRemaining: 0, playable: true, inGamePenalty: { speed: -6 }, setting: "GAME" as const, band: "DAY_TO_DAY" as const, since: week(1) } } } : p)) };
    const played = (resolve(game as never, "s1", sore) as { extras: { participation: GameParticipation[] } }).extras.participation;
    expect(played.some((r) => r.player === qb && r.snaps.offense > 0)).toBe(true);
  });

  it("refuses to play without the people", () => {
    expect(() => resolve(game as never, "s1")).toThrow(/none came/);
  });
});
