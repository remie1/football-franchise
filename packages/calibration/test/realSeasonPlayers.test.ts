/**
 * ADR-087 §10 through the real sim: a season with the players' switches on plays with the people as
 * they are each week, and carrying on from a stop gives exactly the straight run. Two regular-season
 * weeks keep it quick.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isTruthLayerEvent, type CalendarStamp, type GameParticipation } from "@ff/contracts";
import { buildLeague, buildStaff } from "@ff/franchise";
import { peopleResolver, reservePool, runRealSeason } from "../src/season/realSeason.js";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";
import { forSwitches, readStandInFile } from "../src/season/standInLeague.js";

/** The committed stand-in league, with its growth records (ADR-087 §2.5), named rather than "the newest". */
const STANDIN_FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");

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

  it("refuses growth on a stand-in league file without growth records, and plays one that has them, the same for the same seed", () => {
    const file = readStandInFile(readFileSync(STANDIN_FILE, "utf8"));
    // The file as it was before `standin-development`: no records on anyone (commit e23bf69's players, by their JSON's sha256).
    const old = { ...file, league: { ...file.league, players: file.league.players.map((p) => forSwitches(p, undefined)) } };
    const oldJson = JSON.stringify(old.league.players, (_k, v) => (v instanceof Set ? [...v] : v));
    expect(createHash("sha256").update(oldJson).digest("hex")).toBe("b080396cca79b579bc1a4e1d0547c046f89d14f4e9256c9095a9dbcd09844450");
    const growth = { development: true } as const;
    expect(() => runRealSeason({ seed, players: growth, rosters: "standin", standIn: old })).toThrow(/no growth records; run standin-development/);
    const stopAfter: CalendarStamp = { season: file.season, phase: "REGULAR_SEASON", week: 1, day: 7 };
    // Both switches on (growth and the copied injuries), played twice: the same seed, the same events (Iron Rule 4).
    const play = () => runRealSeason({ seed, players, rosters: "standin", standIn: file, stopAfter });
    const played = play();
    const again = play();
    expect(JSON.stringify(again.run.events)).toBe(JSON.stringify(played.run.events));
    expect(JSON.stringify(again.run.people, (_k, v) => (v instanceof Set ? [...v] : v))).toBe(JSON.stringify(played.run.people, (_k, v) => (v instanceof Set ? [...v] : v)));
    expect(played.run.state.results.length).toBe(16);
    // The replay covers practice-squad call-ups (ADR-087 §11): some team called up one of its own.
    const squads = (file.league.provenance as { practiceSquad: Record<string, string[]> }).practiceSquad;
    expect(played.run.events.some((e) => e.event.type === "CONTRACT_SIGNED" &&
      (squads[String(e.event.payload.team)] ?? []).includes(String(e.event.payload.player)))).toBe(true);
    const standIns = new Set(file.league.players.map((p) => String(p.bio.id)));
    const moved = played.run.events.flatMap((e) => (e.event.type === "RATINGS_CHANGED" ? e.event.payload.changes : [])).filter((c) => standIns.has(String(c.player)));
    expect(moved.length).toBeGreaterThan(100);
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
