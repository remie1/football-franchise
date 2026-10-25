import { describe, it, expect } from "vitest";
import { createRng, SAVE_FORMAT_VERSION, type CalendarStamp, type SaveFile } from "@ff/contracts";
import {
  buildLeague, buildStaff, makeSave, readSave, runSeason, runStaffOffseason, seatRelationships, summariseSeason, SaveError,
  type GameResolver,
} from "../src/index.js";

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

  it("carries the engine rules name when told (ADR-089 P1), and a save without one loads with it absent, read as legacy", () => {
    const pocket = makeSave({ league, calendar: half.calendar, season: half.state, createdBy: "test", playedWith: { caller: "v7", engineRules: "pocket-1.s1" } });
    expect(readSave(onDisk(pocket)).save.playedWith).toEqual({ caller: "v7", engineRules: "pocket-1.s1" });
    // A legacy save (and every save made before P1) names only its caller: the field stays absent,
    // which the season command reads as `legacy`, and the file has no rules key at all.
    const legacy = makeSave({ league, calendar: half.calendar, season: half.state, createdBy: "test", playedWith: { caller: "v7" } });
    const loaded = readSave(onDisk(legacy)).save.playedWith!;
    expect(loaded).toEqual({ caller: "v7" });
    expect("engineRules" in loaded).toBe(false);
    expect(onDisk(legacy)).not.toContain("engineRules");
  });

  it("carries the rostered players when given them (ADR-079), and refuses rosters without them", () => {
    const team = league.teams[0]!;
    const pid = "p:T01:QB0" as never;
    const player = {
      bio: { id: pid, displayName: "Test Player", position: "QB", age: 25, heightIn: 75, weightLb: 220, draft: "UDFA" },
      attributes: { kind: "true", values: { accuracy: 70 }, traits: new Set<string>() },
      condition: { stamina: 100, morale: 0 },
      personality: { needs: {}, type: "quiet" },
      teamId: team.id,
    } as const;
    const rostered = { ...league, teams: league.teams.map((t, i) => (i === 0 ? { ...t, roster: [pid], depthChart: { QB: [pid] } } : t)) };
    const s = makeSave({ league: rostered, calendar: half.calendar, season: half.state, createdBy: "test", players: [player as never] });
    const text = JSON.stringify(s, (_k, v) => (v instanceof Set ? [...v] : v), 2);
    const loaded = readSave(text);
    expect(loaded.save.world.players.map((p) => String(p.bio.id))).toEqual(["p:T01:QB0"]);
    expect(loaded.league.teams[0]!.roster).toEqual([pid]);
    expect(() => makeSave({ league: rostered, calendar: half.calendar, season: half.state, createdBy: "test" })).toThrow(/not in the save/);
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
    ["a damaged engine rules name (ADR-089 P1)", () => edited((s) => { (s as { playedWith?: unknown }).playedWith = { caller: "v5", engineRules: 5 }; }), /what played the games is damaged/],
    ["an empty engine rules name (ADR-089 P1)", () => edited((s) => { (s as { playedWith?: unknown }).playedWith = { caller: "v5", engineRules: "" }; }), /what played the games is damaged/],
    ["edited standings", () => edited((s) => { s.world.season!.standings[0]!.overall.wins += 1; }), /standings don't match/],
  ];
  it.each(broken)("refuses %s with a plain reason", (_, file, why) => {
    expect(() => readSave(file())).toThrow(SaveError);
    expect(() => readSave(file())).toThrow(why);
  });
});

describe("saves keep the coaching staff (ADR-080, ADR-084)", () => {
  const built = buildStaff(league, { firstSeason: 2027, historySeasons: 5 });
  const views = seatRelationships(built.world);
  const staff = { world: built.world, relationships: views };
  const staffSave = (run: typeof half, s: typeof staff = staff) =>
    makeSave({ league, calendar: run.calendar, season: run.state, createdBy: "test", staff: s });
  const editedStaff = (f: (s: SaveFile) => void): SaveFile => { const s = JSON.parse(onDisk(staffSave(half))) as SaveFile; f(s); return s; };

  it("keeps every coach, their contracts, each team's staff and the views, and hands back the same world", () => {
    const s = staffSave(half);
    expect(s.world.staff).toHaveLength(built.world.staff.length);
    expect(s.world.staffContracts).toHaveLength(built.world.contracts.length);
    expect(s.world.relationships).toHaveLength(views.length);
    const loaded = readSave(onDisk(s));
    expect(loaded.staff!.world).toEqual(built.world);
    expect(loaded.staff!.relationships).toEqual(views);
  });

  it("saved at week 9 and carried on, gives the straight season, and the same offseason after it", () => {
    const loaded = readSave(onDisk(staffSave(half)));
    const rest = runSeason({ league: loaded.league, season: 2027, seed: loaded.save.worldSeed, rules: loaded.rules, resolve: fake, resumeFrom: loaded.save.world.season! });
    expect(JSON.stringify(rest.state)).toBe(JSON.stringify(straight.state));
    const offseason = (w: typeof built.world, v: typeof views) =>
      runStaffOffseason({ world: w, results: summariseSeason(straight.state), seed: league.seed, relationships: { views: v } });
    expect(JSON.stringify(offseason(loaded.staff!.world, loaded.staff!.relationships!))).toBe(JSON.stringify(offseason(built.world, views)));
  });

  it("reads a save made after the carousel, with the staffs set for next season", () => {
    const after = runStaffOffseason({ world: built.world, results: summariseSeason(straight.state), seed: league.seed, relationships: { views } });
    const loaded = readSave(onDisk(staffSave(straight, { world: after.world, relationships: after.relationships! })));
    expect(loaded.staff!.world.season).toBe(2028);
    expect(loaded.staff!.world).toEqual(after.world);
  });

  it("keeps coaches without their views, and older saves without coaches load with none", () => {
    const loaded = readSave(onDisk(staffSave(half, { world: built.world } as typeof staff)));
    expect(loaded.staff!.relationships).toBeUndefined();
    expect(readSave(onDisk(saveOf(half))).staff).toBeUndefined();
  });

  const brokenStaff: [string, () => unknown, RegExp][] = [
    ["a coach twice", () => editedStaff((s) => { s.world.staff.push(s.world.staff[0]!); }), /appears twice/],
    ["a staff list naming a missing coach", () => editedStaff((s) => { s.world.teams[0]!.staff.push("S-ghost" as never); }), /not in the save/],
    ["a seated coach missing from his staff list", () => editedStaff((s) => { s.world.teams[0]!.staff.pop(); }), /whose staff list doesn't have him/],
    ["a contract for a missing coach", () => editedStaff((s) => { s.world.staffContracts![0]!.staff = "S-ghost" as never; }), /contract is for a coach who is not in the save/],
    ["coaches without contracts", () => editedStaff((s) => { delete s.world.staffContracts; }), /no contracts list/],
    ["a view lost", () => editedStaff((s) => { s.world.relationships!.pop(); }), /views don't match/],
    ["coaches from another year", () => editedStaff((s) => { s.calendar = { ...s.calendar, season: 2030 }; s.world.season!.season = 2030; }), /set for 2027/],
  ];
  it.each(brokenStaff)("refuses %s with a plain reason", (_, file, why) => {
    expect(() => readSave(file())).toThrow(SaveError);
    expect(() => readSave(file())).toThrow(why);
  });
});
