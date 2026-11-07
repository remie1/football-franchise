/**
 * ADR-096 step 2: fan and media mood. §9 step 2's tests: same seed, same moods; save and load keeps
 * them; a blowout loss to a worse team moves fans more than a close loss to a better one; fans move
 * further and faster than media; drift fades a bad week; with mood off, the season is today's.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, gameId, type CalendarStamp, type FranchiseEventEnvelope, type GameResult, type MoodReading, type TeamId,
} from "@ff/contracts";
import {
  MOOD, MOOD_STEP_PREFIX, PLAYER_STEP_PREFIX, buildStaff, makeSave, moodSteps, readGame, readSave, runSeason, type LeaguePeople, type TeamStrength,
} from "../src/index.js";
import { SEASON, league, resolve, startingPeople } from "./playersWorld.js";

const both = { development: true, injuries: true } as const;
const base = { league, season: SEASON, seed: league.seed, resolve, through: "YEAR" as const };
const week9: CalendarStamp = { season: SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 };
function people(): LeaguePeople {
  const start = startingPeople();
  const built = buildStaff(league, { firstSeason: SEASON, historySeasons: 2, lineups: true });
  return { ...start, staff: built.world.staff, coaching: { world: built.world } };
}
const withMood = { ...base, players: both, coaching: {}, meeting: {}, mood: {} };
const straight = runSeason({ ...withMood, people: people() });
type MoodEvent = Extract<FranchiseEventEnvelope["event"], { type: "PUBLIC_MOOD_UPDATED" }>;
const moods = (events: readonly FranchiseEventEnvelope[]) => events.filter((e) => e.event.type === "PUBLIC_MOOD_UPDATED").map((e) => e.event as MoodEvent);

const strength = (team: string, total: number): TeamStrength => ({
  team: team as TeamId, total, units: { OFFENSE: total / 2, DEFENSE: total / 2, SPECIAL_TEAMS: 0 }, groups: {}, starters: [],
});
const result = (homeScore: number, awayScore: number): GameResult => ({
  gameId: gameId("G1"), home: "H" as TeamId, away: "A" as TeamId, homeScore, awayScore, reason: "REGULATION", seed: "s",
});
const leagueBase = { points: 22, offense: 0, defense: 0 };

describe("one game's read (§3.1)", () => {
  it("makes a blowout loss to a worse team far worse than a close loss to a better one", () => {
    // Home is 10 points better than away in the first, 10 worse in the second.
    const blowout = readGame(result(10, 38), "H" as TeamId, { own: strength("H", 10), other: strength("A", 0) }, leagueBase, -1);
    const close = readGame(result(24, 27), "H" as TeamId, { own: strength("H", 0), other: strength("A", 10) }, leagueBase, -1);
    expect(blowout.s).toBeLessThan(-0.9);
    expect(close.s).toBeGreaterThan(-0.4);
    expect(blowout.causes).toEqual(expect.arrayContaining(["LOSS_TO_WORSE_TEAM", "BLOWOUT_LOSS", "HOME_LOSS"]));
    expect(close.causes).toContain("LOSS_TO_BETTER_TEAM");
  });

  it("adds a streak past its second game, and splits the result between the offense and the defense", () => {
    const r = readGame(result(35, 10), "H" as TeamId, { own: strength("H", 0), other: strength("A", 0) }, leagueBase, 4);
    expect(r.causes).toContain("WINNING_STREAK_4");
    expect(r.offense).toBeGreaterThan(0.5);
    expect(r.defense).toBeGreaterThan(0.5);
    const shut = readGame(result(3, 30), "H" as TeamId, { own: strength("H", 0), other: strength("A", 0) }, leagueBase, -1);
    expect(shut.offense).toBeLessThan(-0.8);
  });

  it("reads a blown lead and a late loss from the period scores", () => {
    const g: GameResult = {
      ...result(24, 27), periods: [{ period: 1, home: 14, away: 0 }, { period: 2, home: 7, away: 0 }, { period: 3, home: 0, away: 13 }, { period: 4, home: 3, away: 14 }],
    };
    const home = readGame(g, "H" as TeamId, { own: strength("H", 0), other: strength("A", 0) }, leagueBase, -1);
    const away = readGame(g, "A" as TeamId, { own: strength("A", 0), other: strength("H", 0) }, leagueBase, 1);
    expect(home.causes).toEqual(expect.arrayContaining(["BLOWN_LEAD", "LOST_LATE"]));
    expect(away.causes).toEqual(expect.arrayContaining(["COMEBACK", "WON_LATE"]));
  });
});

describe("mood in the season's walk", () => {
  it("gives every team one reading event a game, and keeps each within -100 to 100", () => {
    const events = moods(straight.events);
    const gameEvents = events.filter((e) => e.payload.week !== undefined);
    const preseason = new Set(straight.state.schedule.games.filter((g) => g.kind === "PRESEASON").map((g) => String(g.gameId)));
    const played = straight.state.results.filter((r) => !preseason.has(String(r.gameId))).length * 2;
    expect(gameEvents.length).toBe(played);
    for (const e of events) for (const r of e.payload.readings) {
      expect(Math.abs(r.value)).toBeLessThanOrEqual(100);
    }
    for (const t of straight.people!.teams) {
      expect(t.mood?.some((r) => r.subject.kind === "TEAM" && r.audience === "FANS")).toBe(true);
      expect(t.mood!.filter((r) => r.subject.kind === "PLAYER" && r.audience === "FANS").length).toBeLessThanOrEqual(MOOD.watch.size);
    }
  });

  it("is the same season, moods and all, from the same seed (Iron Rule 4)", () => {
    const again = runSeason({ ...withMood, people: people() });
    expect(JSON.stringify(moods(again.events))).toBe(JSON.stringify(moods(straight.events)));
  });

  it("moves fans further and faster than media", () => {
    let fans = 0, media = 0, n = 0, fansWider = 0;
    for (const e of moods(straight.events).filter((x) => x.payload.week !== undefined)) {
      const team = e.payload.readings.filter((r) => r.subject.kind === "TEAM");
      const f = team.find((r) => r.audience === "FANS")!, m = team.find((r) => r.audience === "MEDIA")!;
      fans += Math.abs(f.change); media += Math.abs(m.change); n++;
      if (Math.abs(f.value) >= Math.abs(m.value)) fansWider++;
    }
    expect(fans / n).toBeGreaterThan(2 * (media / n));
    expect(fansWider / n).toBeGreaterThan(0.7);
  });

  it("seats the head coach, GM and coordinators, and the head coach moves with the team", () => {
    const e = moods(straight.events).find((x) => x.payload.week === 5)!;
    const seats = e.payload.readings.filter((r) => r.subject.kind === "STAFF" && r.audience === "FANS").map((r) => (r.subject as { seat: string }).seat);
    expect(seats).toEqual(expect.arrayContaining(["HEAD_COACH", "OC", "DC"]));
  });

  it("lifts the fans when a head coach or GM is fired after the season", () => {
    const fired = straight.events.filter((e) => e.event.type === "STAFF_DEPARTED" && e.event.payload.reason === "FIRED" && e.at.phase === "OFF_EVAL");
    expect(fired.length).toBeGreaterThan(0);
    const causes = moods(straight.events).filter((e) => e.payload.week === undefined).flatMap((e) => e.payload.readings.flatMap((r) => r.causes));
    expect(causes.some((c) => c === "COACH_FIRED" || c === "GM_FIRED")).toBe(true);
  });

  it("drifts a bad week toward the rest point in a week with no game", () => {
    const team = straight.people!.teams[0]!;
    const angry: MoodReading[] = [
      { audience: "FANS", subject: { kind: "TEAM" }, value: -60, change: -30, causes: ["LOSS_TO_WORSE_TEAM"] },
      { audience: "MEDIA", subject: { kind: "TEAM" }, value: -20, change: -10, causes: ["LOSS_TO_WORSE_TEAM"] },
    ];
    const p: LeaguePeople = { ...straight.people!, teams: straight.people!.teams.map((t) => (t.id === team.id ? { ...t, mood: angry } : t)), playerMemory: { ...straight.people!.playerMemory!, mood: { ...straight.people!.playerMemory!.mood!, rest: {} } } };
    const day: CalendarStamp = { season: SEASON + 1, phase: "OFF_SUMMER", week: 2, day: 7 };
    const step = moodSteps()[0]!;
    const r = step.run(p, { day, season: SEASON + 1, seed: "x", rules: DEFAULT_LEAGUE_RULES, state: { ...straight.state, results: [], schedule: { ...straight.state.schedule, games: [] } }, games: [] })!;
    const after = r.people.teams.find((t) => t.id === team.id)!.mood!;
    const fans = after.find((x) => x.audience === "FANS" && x.subject.kind === "TEAM")!;
    expect(fans.value).toBe(-54);
    expect(after.find((x) => x.audience === "MEDIA" && x.subject.kind === "TEAM")!.value).toBe(-18);
    expect(r.events).toEqual([]); // drift alone is no event (M1: weeks with a game or a moment)
  });

  it("remembers a tenth of the season's final team mood as next year's rest point", () => {
    const memory = straight.people!.playerMemory!.mood!;
    for (const t of straight.people!.teams) expect(memory.rest[String(t.id)]?.season).toBe(SEASON);
  });

  it("stopped at week 9 and carried on through a save gives the straight season's moods", () => {
    // Players and mood only: the coaches stay seated as they start (a coaching save is its own thread's check).
    const plain = { ...base, players: both, mood: {} };
    const whole = runSeason({ ...plain, people: startingPeople() });
    const first = runSeason({ ...plain, people: startingPeople(), stopAfter: week9 });
    const p = first.people!;
    const save = makeSave({
      league: { ...league, teams: p.teams }, calendar: first.calendar, season: first.state, createdBy: "test", players: p.players,
      development: {
        events: first.stepEvents!.filter((e) => e.step.startsWith(PLAYER_STEP_PREFIX) || e.step.startsWith(MOOD_STEP_PREFIX)).map((e) => e.envelope),
        depthMemory: p.playerMemory!,
      },
    });
    const loaded = readSave(JSON.stringify(save, (_k, v: unknown) => (v instanceof Set ? [...v] : v)));
    expect(loaded.development!.people.teams.map((t) => t.mood)).toEqual(p.teams.map((t) => t.mood));
    expect(loaded.development!.people.playerMemory!.mood).toEqual(p.playerMemory!.mood);
    const second = runSeason({
      ...plain, people: { ...loaded.development!.people, staff: p.staff! },
      resumeFrom: loaded.save.world.season!, stepsDoneThrough: loaded.save.calendar, resumeEvents: loaded.development!.events,
    });
    expect(moods(whole.events).length).toBeGreaterThan(500);
    expect(JSON.stringify(moods(second.events))).toBe(JSON.stringify(moods(whole.events)));
    expect(JSON.stringify(second.people!.teams.map((t) => t.mood))).toBe(JSON.stringify(whole.people!.teams.map((t) => t.mood)));
  });

  it("changes nothing else: without mood the season is today's, event for event", () => {
    const off = runSeason({ ...base, players: both, coaching: {}, meeting: {}, people: people() });
    expect(moods(off.events)).toEqual([]);
    const rest = straight.events.filter((e) => e.event.type !== "PUBLIC_MOOD_UPDATED").map((e) => e.event);
    expect(JSON.stringify(rest)).toBe(JSON.stringify(off.events.map((e) => e.event)));
    expect(JSON.stringify(off.people!.teams.map((t) => ({ ...t, mood: undefined })))).toBe(JSON.stringify(straight.people!.teams.map((t) => ({ ...t, mood: undefined }))));
  });
});
