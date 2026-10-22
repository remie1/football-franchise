import { describe, it, expect } from "vitest";
import { createRng, SAVE_FORMAT_VERSION, type CalendarStamp, type SaveFile } from "@ff/contracts";
import { buildLeague, makeSave, readSave, runSeason, SaveError, type GameResolver } from "../src/index.js";

const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7;
  const awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};

const league = buildLeague("world-1");
const base = { league, season: 2027, seed: league.seed, resolve: fake } as const;
const straight = runSeason(base);
const week9: CalendarStamp = { season: 2027, phase: "REGULAR_SEASON", week: 9, day: 7 };
const half = runSeason({ ...base, stopAfter: week9 });
const saveOf = (run: typeof half) => makeSave({ league, calendar: run.calendar, season: run.state, createdBy: "test" });
/** Round-trip through JSON text, as a file on disk would. */
const onDisk = (s: SaveFile) => JSON.stringify(s, null, 2);
const edited = (f: (s: SaveFile) => void): SaveFile => { const s = JSON.parse(onDisk(saveOf(half))) as SaveFile; f(s); return s; };

describe("makeSave / readSave (save and load L2)", () => {
  it("writes the shared save shape with empty roster slots", () => {
    const s = saveOf(half);
    expect(s.formatVersion).toBe(SAVE_FORMAT_VERSION);
    expect(s.worldSeed).toBe("world-1");
    expect(s.calendar).toEqual(week9);
    expect(s.world.teams).toHaveLength(32);
    expect(s.world.players).toEqual([]);
    expect(s.world.season!.results.length).toBeGreaterThan(0);
  });

  it("saved at week 9, read back from JSON text and carried on, gives the straight season", () => {
    const loaded = readSave(onDisk(saveOf(half)));
    expect(loaded.league).toEqual(league);
    const rest = runSeason({ league: loaded.league, season: loaded.save.calendar.season, seed: loaded.save.worldSeed, rules: loaded.rules, resolve: fake, resumeFrom: loaded.save.world.season! });
    expect(JSON.stringify(rest)).toBe(JSON.stringify(straight));
  });

  it("reads saves from camp, the playoffs, and the end of the season", () => {
    for (const stop of [
      { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 1 },
      { season: 2027, phase: "PLAYOFFS", week: 2, day: 7 },
    ] as CalendarStamp[]) expect(() => readSave(onDisk(saveOf(runSeason({ ...base, stopAfter: stop }))))).not.toThrow();
    expect(() => readSave(onDisk(saveOf(straight)))).not.toThrow();
    expect(() => readSave(makeSave({ league, calendar: { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 1 }, season: null, createdBy: "test" }))).not.toThrow();
  });

  it("records what played the games when told (E1), and reads saves without it", () => {
    const s = makeSave({ league, calendar: half.calendar, season: half.state, createdBy: "test", playedWith: { caller: "v5" } });
    expect(readSave(onDisk(s)).save.playedWith).toEqual({ caller: "v5" });
    expect(readSave(onDisk(saveOf(half))).save.playedWith).toBeUndefined();
  });

  it("a save is plain data: the same season saves to the same text", () => {
    expect(onDisk(saveOf(half))).toBe(onDisk(saveOf(runSeason({ ...base, stopAfter: week9 }))));
  });

  const broken: [string, () => unknown, RegExp][] = [
    ["not JSON", () => "{ nope", /not valid JSON/],
    ["not a save", () => ({ hello: 1 }), /not a save file/],
    ["a newer format", () => edited((s) => { s.formatVersion = SAVE_FORMAT_VERSION + 1; }), /newer version/],
    ["a newer ratings list", () => edited((s) => { s.registrySchemaVersion = 99; }), /ratings list is version 99/],
    ["a bad date", () => edited((s) => { s.calendar = { ...s.calendar, week: 40 }; }), /not a real league date/],
    ["a missing team", () => edited((s) => { s.world.teams.pop(); s.leagueRules.teamCount = 31; }), /team that does not exist/],
    ["a team in two divisions", () => edited((s) => { s.world.league.divisions[1]!.teams[0] = s.world.league.divisions[0]!.teams[0]!; }), /two divisions/],
    ["a changed score", () => edited((s) => { s.world.season!.results[0]!.homeScore += 3; }), /standings don't match/],
    ["a missing result", () => edited((s) => { s.world.season!.results.splice(5, 1); }), /missing the result/],
    ["a result after its date", () => edited((s) => { s.calendar = { season: 2027, phase: "REGULAR_SEASON", week: 4, day: 7 }; }), /did not reach/],
    ["another seed", () => edited((s) => { s.worldSeed = "world-2"; }), /another league's dice/],
    ["a roster player who isn't there", () => edited((s) => { s.world.teams[0]!.roster.push("P-ghost" as never); }), /not in the save/],
    ["a damaged played-with note", () => edited((s) => { (s as { playedWith?: unknown }).playedWith = { caller: 5 }; }), /what played the games is damaged/],
    ["edited standings", () => edited((s) => { s.world.season!.standings[0]!.overall.wins += 1; }), /standings don't match/],
  ];
  it.each(broken)("refuses %s with a plain reason", (_, file, why) => {
    expect(() => readSave(file())).toThrow(SaveError);
    expect(() => readSave(file())).toThrow(why);
  });
});
