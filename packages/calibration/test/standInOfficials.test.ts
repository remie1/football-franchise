/**
 * ADR-093 step 1b (plan-v2 C1): the season command plays the stand-in league file's crews, the
 * copies of the real NFL crews under made-up referee names that attributes' `standin-officials`
 * command writes. The reader checks the block when the file is read (`readStandInFile`); the season
 * rule plays the crews as they stand in the file's season and carried one winter into the next
 * (`officiatingFor`); `runRealSeason` refuses new crews for a stand-in league whose file has its own,
 * and those crews standing at a season's start in any season but the file's (a season carried on
 * keeps the crews it has); the season command's line says which (`standInOfficialsLine`); and a
 * stand-in run that asks for no crews has none. No game reads a crew until step 2, so week 1 plays
 * exactly as without them.
 *
 * The synthetic files hold made-up crews `o:01` to `o:17` with referees "Referee 1" to "Referee 17".
 * The committed league file is named where a test reads it, and those tests hold for any block the
 * importer can write (a version the reader knows, the file's season, 2026, 17 crews, each family's
 * mean within 0.5 of 50), not for its leans. Only the last test plays games: a run stopped on day 1
 * of regular-season week 1 has drawn week 1's crews and played nothing, since games are on day 7.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { officiatingCrewId, type CalendarStamp, type MatchEventEnvelope, type OfficiatingCrew, type SaveFile } from "@ff/contracts";
import { buildLeague, runSeason, type GameResolver } from "@ff/franchise";
import { gameBytesDigest, gameDigest } from "../src/pocket/golden.js";
import { DEFAULT_SEASON, officiatingFor, runRealSeason, seasonToPlay, standInOfficialsLine, type SeasonGameWatcher } from "../src/season/realSeason.js";
import { buildStandInLeague, KNOWN_STANDIN_OFFICIALS, readStandInFile, STANDIN_FILE_FORMAT, standInCrewsProblem } from "../src/season/standInLeague.js";

/** The timeout of the test that plays week 1, as `realSeasonOfficials.test.ts` gives its season runs. */
const SLOW = 5 * 60_000;
/** The tests that read the committed file and walk a season to week 1 without a game. */
const WALK = 60_000;
/** The committed league file, by name (a new snapshot is a deliberate change to these tests; a new officials block is not). */
const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
const FAMILIES = ["LINE_HOLDING", "COVERAGE", "PLAYER_SAFETY", "TECHNICAL", "SNAP"] as const;

/** Made on first use and kept. */
function once<T>(make: () => T): () => T {
  let made: { readonly value: T } | undefined;
  return () => (made ??= { value: make() }).value;
}

/** The committed league file, read by the first test that needs it. */
const committed = once(() => readStandInFile(readFileSync(FILE, "utf8")));
/** The committed file and its crews, which attributes' `standin-officials` command writes into it. */
function committedCrews() {
  const file = committed();
  const own = file.officiating;
  if (own === undefined) throw new Error("the committed league file has no officials block: run attributes' standin-officials command on it");
  return { file, own };
}

/** 17 made-up crews, `o:01` to `o:17` with "Referee 1" to "Referee 17": each family's leans run 42 to 58 (TECHNICAL all 50), averaging 50. */
function madeUpCrews(): OfficiatingCrew[] {
  return Array.from({ length: 17 }, (_, i) => ({
    id: officiatingCrewId(`o:${String(i + 1).padStart(2, "0")}`),
    referee: `Referee ${i + 1}`,
    leans: { LINE_HOLDING: 42 + i, COVERAGE: 58 - i, PLAYER_SAFETY: 42 + ((3 * i) % 17), TECHNICAL: 50, SNAP: 42 + ((5 * i) % 17) },
  }));
}

/** A made-up stand-in league file (no teams, no players) of `season`, with `officiating` when given. */
function fileText(officiating?: unknown, season = 2026): string {
  return JSON.stringify({
    format: STANDIN_FILE_FORMAT, season, snapshotDate: "2026-10-23", league: { teams: [], players: [] },
    ...(officiating === undefined ? {} : { officiating }),
  });
}

/** A made-up officials block of 2026: the version, the season, a made-up record of the importer's and the crews, with `over` written on top. */
function block(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { version: "standin-officials/1", season: 2026, asOf: "2026-11-01", method: { spread: "measured" }, crews: madeUpCrews(), ...over };
}

/** A run stopped in training camp plays no game. */
const noGame: GameResolver = () => {
  throw new Error("a game was played");
};
const campLeague = once(() => buildLeague("adr-093-1b:camp"));
/** `runSeason` with these crews standing in 2026, stopped in training camp: it checks them before its first day, and draws no week. */
const standingToCamp = (crews: unknown) => runSeason({
  league: campLeague(), season: 2026, seed: "adr-093-1b:camp", resolve: noGame,
  stopAfter: { season: 2026, phase: "TRAINING_CAMP", week: 1, day: 7 },
  officiating: { kind: "STANDING", crews: crews as OfficiatingCrew[], assignments: [] },
});

/** Day 1 of regular-season week 1: its crews are drawn, and no game is played (games are on day 7). */
const weekOneDayOne = (season: number): CalendarStamp => ({ season, phase: "REGULAR_SEASON", week: 1, day: 1 });

const byId = (crews: readonly OfficiatingCrew[]): OfficiatingCrew[] => [...crews].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const familyMeans = (crews: readonly OfficiatingCrew[]): number[] => FAMILIES.map((f) => crews.reduce((sum, c) => sum + c.leans[f], 0) / crews.length);
const leansOf = (crews: readonly OfficiatingCrew[]): number[][] => byId(crews).map((c) => FAMILIES.map((f) => c.leans[f]));
const named = (crews: readonly OfficiatingCrew[]): string[][] => byId(crews).map((c) => [String(c.id), c.referee]);

/** A game's GAME_START payload. */
function startOf(events: readonly MatchEventEnvelope[]): Record<string, unknown> {
  const start = events.find((e) => e.event.type === "GAME_START");
  if (start === undefined || start.event.type !== "GAME_START") throw new Error("a game with no GAME_START");
  return start.event.payload;
}

/** What a run's games wrote: each game's digests, as the golden pins take them, and its GAME_START payload. */
function watcher(): { readonly digests: string[]; readonly starts: Record<string, unknown>[]; readonly onGame: SeasonGameWatcher } {
  const digests: string[] = [];
  const starts: Record<string, unknown>[] = [];
  return {
    digests,
    starts,
    onGame: (observation) => {
      digests.push(`${gameDigest(observation.events)} ${gameBytesDigest(observation.events)}`);
      starts.push(startOf(observation.events));
    },
  };
}

describe("the stand-in league file's officials, read as data (ADR-093 step 1b)", () => {
  it("reads a league file's crews as data, each as { id, referee, leans } in the families' order, and a file without them as before", () => {
    const without = readStandInFile(fileText());
    expect("officiating" in without).toBe(false);
    expect(without).toEqual(JSON.parse(fileText()));

    // One crew with a key of its own and its leans in another order: the key is left behind and the leans come back in order.
    const crews = madeUpCrews();
    const c = crews[4]!;
    const loose = crews.map((x) => (x !== c ? x : {
      note: "made up", leans: { SNAP: c.leans.SNAP, TECHNICAL: c.leans.TECHNICAL, PLAYER_SAFETY: c.leans.PLAYER_SAFETY, COVERAGE: c.leans.COVERAGE, LINE_HOLDING: c.leans.LINE_HOLDING },
      referee: c.referee, id: c.id,
    }));
    const o = readStandInFile(fileText(block({ crews: loose }))).officiating!;
    expect(o.version).toBe("standin-officials/1");
    expect(o.season).toBe(2026);
    expect(o.crews).toEqual(crews);
    for (const crew of o.crews) {
      expect(Object.keys(crew)).toEqual(["id", "referee", "leans"]);
      expect(Object.keys(crew.leans)).toEqual([...FAMILIES]);
    }
    // The importer's own record passes through unread, in its place.
    expect(Object.keys(o)).toEqual(["version", "season", "asOf", "method", "crews"]);
    expect(o.asOf).toBe("2026-11-01");
    expect(o.method).toEqual({ spread: "measured" });
  });

  it("refuses an officials block it cannot play: damaged, an unknown version, crews of another season, a family whose leans do not average 50", () => {
    for (const damaged of [null, [], "standin-officials/1", block({ crews: undefined })]) {
      expect(() => readStandInFile(fileText(damaged)), JSON.stringify(damaged)).toThrow(/^the stand-in league file's officials are damaged/);
    }
    expect(() => readStandInFile(fileText(block({ version: "standin-officials/2" }))))
      .toThrow(/^the stand-in league file's officials are "standin-officials\/2": this loader does not know these crews \(it knows standin-officials\/1\)/);
    expect(() => readStandInFile(fileText(block({ version: undefined })))).toThrow(/officials are undefined: this loader does not know these crews/);
    expect(() => readStandInFile(fileText(block({ season: 2025 })))).toThrow(/^the stand-in league file's officials stand in 2025, not the file's season 2026/);
    expect(() => readStandInFile(fileText(block(), 2027))).toThrow(/officials stand in 2026, not the file's season 2027/);
    expect(() => readStandInFile(fileText(block({ season: "2026" })))).toThrow(/officials stand in "2026", not the file's season 2026/);

    // Every holding lean at 51 makes a league's crews by franchise's rule, and STANDING plays them as
    // they stand, holding called 2% over the league's rate: the mean is the reader's own rule.
    const at51 = madeUpCrews().map((x) => ({ ...x, leans: { ...x.leans, LINE_HOLDING: 51 } }));
    expect(standInCrewsProblem(at51)).toBeUndefined();
    expect(standingToCamp(at51).officiating!.crews).toEqual(at51);
    expect(() => readStandInFile(fileText(block({ crews: at51 })))).toThrow(/^the stand-in league file's officials average 51\.00 on LINE_HOLDING, not 50 \(within 0\.5\)/);
    // The bound is 0.5 either way: 8 points over or under in all (50.47, 49.53) is read, 9 (50.53, 49.47) is not.
    const moved = (crews: number, by: 1 | -1) => madeUpCrews().map((x, i) => (i < crews ? { ...x, leans: { ...x.leans, SNAP: x.leans.SNAP + by } } : x));
    expect(readStandInFile(fileText(block({ crews: moved(8, 1) }))).officiating!.crews).toEqual(moved(8, 1));
    expect(readStandInFile(fileText(block({ crews: moved(8, -1) }))).officiating!.crews).toEqual(moved(8, -1));
    expect(() => readStandInFile(fileText(block({ crews: moved(9, 1) })))).toThrow(/average 50\.53 on SNAP, not 50/);
    expect(() => readStandInFile(fileText(block({ crews: moved(9, -1) })))).toThrow(/average 49\.47 on SNAP, not 50/);
  });

  it("the committed league file's crews are on the reader's terms: a known version, the file's season (2026), 17 crews, each family's mean within 0.5 of 50", () => {
    const file = committed();
    const o = file.officiating;
    expect(o, "the committed file has its crews (attributes' standin-officials command)").toBeDefined();
    expect(KNOWN_STANDIN_OFFICIALS as readonly string[]).toContain(o!.version);
    expect(file.season).toBe(2026);
    expect(o!.season).toBe(file.season);
    expect(o!.crews).toHaveLength(17);
    expect(standInCrewsProblem(o!.crews)).toBeUndefined();
    for (const [i, mean] of familyMeans(o!.crews).entries()) expect(Math.abs(mean - 50), FAMILIES[i]).toBeLessThanOrEqual(0.5);
  }, WALK);

  it("refuses crews that are not a league's, and runSeason refuses each of them too", () => {
    const good = madeUpCrews();
    const one = (change: (c: Record<string, unknown>) => unknown): unknown[] => good.map((c, i) => (i === 3 ? change({ ...c }) : c));
    const leans = (change: (l: Record<string, unknown>) => unknown): unknown[] => one((c) => ({ ...c, leans: change({ ...(c.leans as Record<string, unknown>) }) }));
    const broken: [string, unknown][] = [
      ["16 crews", good.slice(0, 16)],
      ["18 crews", [...good, { ...good[0]!, id: "o:18", referee: "Referee 18" }]],
      ["a repeated id", one((c) => ({ ...c, id: "o:01" }))],
      ["an empty id", one((c) => ({ ...c, id: "" }))],
      ["a repeated referee", one((c) => ({ ...c, referee: "Referee 1" }))],
      ["an empty referee", one((c) => ({ ...c, referee: "" }))],
      ["no leans", one(({ leans: _l, ...c }) => c)],
      ["a missing family", leans(({ SNAP: _s, ...l }) => l)],
      ["a sixth key (KICKS)", leans((l) => ({ ...l, KICKS: 50 }))],
      ["a lean of 101", leans((l) => ({ ...l, COVERAGE: 101 }))],
      ["a lean of -1", leans((l) => ({ ...l, COVERAGE: -1 }))],
      ["a lean of 50.5", leans((l) => ({ ...l, COVERAGE: 50.5 }))],
      ["a lean of \"50\"", leans((l) => ({ ...l, COVERAGE: "50" }))],
      ["crews not a list", Object.fromEntries(good.map((c) => [String(c.id), c]))],
    ];
    for (const [what, crews] of broken) {
      expect(() => readStandInFile(fileText(block({ crews }))), what).toThrow(/^the stand-in league file's officials/);
      expect(() => standingToCamp(crews), what).toThrow(/^runSeason: the crews are not a league's/);
      if (Array.isArray(crews)) expect(standInCrewsProblem(crews), what).toBeDefined();
    }
    // The valid list passes both, and the season keeps it as it stands.
    expect(readStandInFile(fileText(block({ crews: good }))).officiating!.crews).toEqual(good);
    expect(standingToCamp(good).officiating).toEqual({ season: 2026, crews: good, assignments: [] });
  });
});

describe("the season rule: the league file's crews, standing, carried or refused (ADR-093 step 1b)", () => {
  it("officiatingFor: the file's crews standing in 2026, carried from it into 2027, refused in 2025 and 2028; NEW for a file without them; a save and a file together throw", () => {
    const file = readStandInFile(fileText(block()));
    const crews = file.officiating!.crews;
    expect(officiatingFor(undefined, { file, season: 2026 })).toEqual({ kind: "STANDING", crews, assignments: [] });
    expect(officiatingFor(undefined, { file, season: 2027 })).toEqual({ kind: "CARRY", from: { season: 2026, crews, assignments: [] } });
    for (const season of [2025, 2028]) {
      expect(() => officiatingFor(undefined, { file, season }), String(season)).toThrow(/stand in 2026/);
      expect(() => officiatingFor(undefined, { file, season }), String(season))
        .toThrow(`a season with them plays 2026, or 2027 with them carried one winter, not ${season}; drop --season, or give 2026 or 2027`);
    }
    expect(officiatingFor(undefined, { file: readStandInFile(fileText()), season: 2027 })).toEqual({ kind: "NEW" });
    expect(officiatingFor(undefined, { file: {}, season: 2031 })).toEqual({ kind: "NEW" });

    const league = buildLeague("adr-093-1b:officiating-for");
    const world: SaveFile["world"] = {
      teams: league.teams, players: [], staff: [], contracts: [], perceptions: [], league: league.structure, season: null,
      narrativeState: null, fashion: null,
    };
    const saved = madeUpCrews();
    const save = { world: { ...world, officiating: { crews: saved, assignments: [] } } };
    expect(() => officiatingFor(save, { file, season: 2026 })).toThrow(/a save holds its own crews/);
    expect(() => officiatingFor({ world }, { file: {}, season: 2026 })).toThrow(/a save holds its own crews/);
    // The one-argument calls keep their meaning (step 1's, as `realSeasonOfficials.test.ts` pins them).
    expect(officiatingFor(undefined)).toEqual({ kind: "NEW" });
    expect(officiatingFor(save)).toEqual({ kind: "STANDING", crews: saved, assignments: [] });
    expect(officiatingFor({ world })).toBeUndefined();
  });

  it("runRealSeason refuses new crews for a stand-in league whose file has its own", () => {
    const own = readStandInFile(fileText(block()));
    expect(() => runRealSeason({ seed: "adr-093-1b:new", rosters: "standin", standIn: own, officiating: { kind: "NEW" } }))
      .toThrow("runRealSeason: the stand-in league's crews are its league file's (officiatingFor); new crews are for a league without them");
    // Anything else gets past the refusal: these files have no teams, so each run stops at the first team it builds.
    const noTeam = /^stand-in league file has no team T\d\d/;
    expect(() => runRealSeason({ seed: "adr-093-1b:new", rosters: "standin", standIn: readStandInFile(fileText()), officiating: { kind: "NEW" } })).toThrow(noTeam);
    expect(() => runRealSeason({ seed: "adr-093-1b:new", rosters: "standin", standIn: own })).toThrow(noTeam);
    expect(() => runRealSeason({ seed: "adr-093-1b:new", rosters: "standin", standIn: own, officiating: officiatingFor(undefined, { file: own, season: 2027 })! })).toThrow(noTeam);
    expect(() => runRealSeason({ seed: "adr-093-1b:new", season: 2026, rosters: "standin", standIn: own, officiating: officiatingFor(undefined, { file: own, season: 2026 })! })).toThrow(noTeam);
  });

  it("the season command's line says which: carried one winter from 2026 into 2027, or as they stand in 2026; none for a file without crews, or a run without them", () => {
    const file = readStandInFile(fileText(block()));
    expect(standInOfficialsLine(file, officiatingFor(undefined, { file, season: 2027 }), 2027))
      .toBe("Officials: the league file's 17 crews, copies of the real crews, carried one winter from 2026 into 2027");
    expect(standInOfficialsLine(file, officiatingFor(undefined, { file, season: 2026 }), 2026))
      .toBe("Officials: the league file's 17 crews, copies of the real crews, as they stand in 2026");
    // A file without crews plays drawn ones, as at step 1, with no line; nor is there one without a file, or without crews for the run.
    const without = readStandInFile(fileText());
    expect(standInOfficialsLine(without, officiatingFor(undefined, { file: without, season: 2027 }), 2027)).toBeUndefined();
    expect(standInOfficialsLine(undefined, officiatingFor(undefined), 2027)).toBeUndefined();
    expect(standInOfficialsLine(file, undefined, 2027)).toBeUndefined();
  });
});

describe("a stand-in season with the league file's crews (ADR-093 step 1b; the committed file)", () => {
  it("a stand-in run in 2026 takes the 17 crews as they stand and draws week 1 from them, the same for the same seed", () => {
    const { file, own } = committedCrews();
    const crews = own.crews;
    const officiating = officiatingFor(undefined, { file, season: 2026 })!;
    expect(officiating.kind).toBe("STANDING");
    const play = () => runRealSeason({ seed: "adr-093-1b:standing", season: 2026, rosters: "standin", standIn: file, officiating, stopAfter: weekOneDayOne(2026) }).run;
    const run = play();
    expect(run.state.season).toBe(2026);
    expect(run.state.results).toHaveLength(0);
    const o = run.officiating!;
    expect(o.season).toBe(2026);
    expect(o.crews).toEqual(crews);
    const week1 = run.state.schedule.games.filter((g) => g.at.phase === "REGULAR_SEASON" && g.at.week === 1).map((g) => String(g.gameId)).sort();
    expect(week1).toHaveLength(16);
    expect(o.assignments.map((a) => String(a.game)).sort()).toEqual(week1);
    expect(new Set(o.assignments.map((a) => String(a.crew))).size, "each crew at most once").toBe(16);
    const ids = new Set(crews.map((c) => String(c.id)));
    expect(o.assignments.filter((a) => !ids.has(String(a.crew)))).toEqual([]);
    // Iron Rule 4: the same seed, the same run.
    expect(JSON.stringify(play())).toBe(JSON.stringify(run));
  }, WALK);

  it("carried one winter into 2027, the default season: the same ids and referees, some lean moved, each family's mean within 0.5 of 50, the same for the same seed and other leans for another", () => {
    const { file, own } = committedCrews();
    const season = seasonToPlay({ rosters: "standin", standIn: file });
    expect(season).toBe(DEFAULT_SEASON);
    expect(season).toBe(own.season + 1);
    const officiating = officiatingFor(undefined, { file, season })!;
    expect(officiating).toEqual({ kind: "CARRY", from: { season: own.season, crews: own.crews, assignments: [] } });
    // No season given: the run plays the default, as the season command does with both player switches off.
    const play = (seed: string) => runRealSeason({ seed, rosters: "standin", standIn: file, officiating, stopAfter: weekOneDayOne(season) }).run;
    const run = play("adr-093-1b:carry");
    expect(run.state.season).toBe(season);
    expect(run.state.results).toHaveLength(0);
    const o = run.officiating!;
    expect(o.season).toBe(season);
    expect(o.assignments).toHaveLength(16);
    expect(named(o.crews)).toEqual(named(own.crews));
    expect(leansOf(o.crews)).not.toEqual(leansOf(own.crews));
    for (const [i, mean] of familyMeans(o.crews).entries()) expect(Math.abs(mean - 50), FAMILIES[i]).toBeLessThanOrEqual(0.5);
    // Iron Rule 4: the same seed carries them the same way; another seed draws other leans. The carry's
    // arithmetic is franchise's to pin.
    expect(JSON.stringify(play("adr-093-1b:carry"))).toBe(JSON.stringify(run));
    expect(leansOf(play("adr-093-1b:carry-other").officiating!.crews)).not.toEqual(leansOf(o.crews));
  }, WALK);

  it("runRealSeason takes the file's crews standing only in the file's season, at a season's start: standing in 2027 (the default), 2028 or 2025 is refused before day 1, whoever chose the season; standing in 2026 (asked for or with a player switch on) and carried into 2027, they play; a 2027 season carried on plays on with its own carried crews standing", () => {
    const { file, own } = committedCrews();
    const seed = "adr-093-1b:standing-season";
    // The slip of review TD5: the crews asked for in the file's season, handed to a run of another.
    const standing = officiatingFor(undefined, { file, season: own.season })!;
    expect(standing.kind).toBe("STANDING");
    const refused: readonly { readonly season?: number }[] = [{}, { season: 2027 }, { season: 2028 }, { season: 2025 }];
    for (const asked of refused) {
      const what = JSON.stringify(asked);
      const seen: unknown[] = [];
      // Stopped on day 1 of week 1, so a run that got past the refusal stops there and fails at once, not after a season.
      const stopAfter = weekOneDayOne(asked.season ?? DEFAULT_SEASON);
      expect(() => runRealSeason({ seed, ...asked, rosters: "standin", standIn: file, officiating: standing, stopAfter, onEvent: (e) => { seen.push(e); } }), what)
        .toThrow(`runRealSeason: the stand-in league's crews stand only in 2026, its league file's season, not in ${asked.season ?? DEFAULT_SEASON} (officiatingFor carries them into 2027)`);
      // A run that reached its first day would have seen an event: training camp's first day has one.
      expect(seen, what).toEqual([]);
    }
    // The two the season rule gives play: standing in 2026, asked for or set by a player switch with no season
    // given (the guard reads the season played, not the one asked for), and carried into 2027 with none given.
    const arms = [
      { what: "standing in 2026", asked: { season: 2026 }, season: 2026, kind: "STANDING", officiating: standing },
      { what: "standing in 2026, the file's own with injuries on", asked: { players: { injuries: true } }, season: 2026, kind: "STANDING", officiating: standing },
      { what: "carried into 2027, the default season", asked: {}, season: DEFAULT_SEASON, kind: "CARRY", officiating: officiatingFor(undefined, { file, season: DEFAULT_SEASON })! },
    ] as const;
    for (const { what, asked, season, kind, officiating } of arms) {
      expect(officiating.kind, what).toBe(kind);
      const run = runRealSeason({ seed, ...asked, rosters: "standin", standIn: file, officiating, stopAfter: weekOneDayOne(season) }).run;
      expect(run.state.season, what).toBe(season);
      expect(run.officiating!.season, what).toBe(season);
      expect(run.officiating!.assignments, what).toHaveLength(16);
    }
    // The check is at a season's start: a season carried on from a save keeps the crews it has. A 2027
    // run stopped on day 1 of week 1, carried on with its own carried crews standing (as a save holds
    // them, not the file's), plays on with the same crews, and week 1's 16 games keep theirs.
    const first = runRealSeason({
      seed, rosters: "standin", standIn: file, officiating: officiatingFor(undefined, { file, season: DEFAULT_SEASON })!, stopAfter: weekOneDayOne(DEFAULT_SEASON),
    }).run;
    const kept = first.officiating!;
    expect(kept.assignments).toHaveLength(16);
    expect(kept.crews).not.toEqual(own.crews);
    const carriedOn = runRealSeason({
      seed, rosters: "standin", standIn: file, resumeFrom: first.state,
      officiating: { kind: "STANDING", crews: kept.crews, assignments: kept.assignments },
      stopAfter: { ...weekOneDayOne(DEFAULT_SEASON), day: 2 },
    }).run;
    expect(carriedOn.state.season).toBe(DEFAULT_SEASON);
    expect(carriedOn.officiating).toEqual(kept);
    // Any crews standing at a season's start out of the file's season are refused, not only the file's:
    // here the 2027 run's own carried crews, handed on standing to a new 2027 or 2028 season.
    // And crews that are not the file's at all, by id or by referee: the made-up crews under other ids.
    const strangers = madeUpCrews().map((c, i) => ({ ...c, id: officiatingCrewId(`x:${String(i + 1).padStart(2, "0")}`) }));
    for (const at of [DEFAULT_SEASON, DEFAULT_SEASON + 1]) {
      for (const [whose, crews] of [["carried", kept.crews], ["made-up", strangers]] as const) {
        const seen: unknown[] = [];
        expect(() => runRealSeason({ seed, season: at, rosters: "standin", standIn: file, officiating: { kind: "STANDING", crews, assignments: [] }, stopAfter: weekOneDayOne(at), onEvent: (e) => { seen.push(e); } }), `${whose} ${at}`)
          .toThrow(`runRealSeason: the stand-in league's crews stand only in 2026, its league file's season, not in ${at}`);
        expect(seen, `${whose} ${at}`).toEqual([]);
      }
    }
    // Carried on from a run stopped in training camp, before week 1 is drawn: no game has a crew yet,
    // and the season plays on with its own crews and draws week 1.
    const camp = runRealSeason({
      seed, rosters: "standin", standIn: file, officiating: officiatingFor(undefined, { file, season: DEFAULT_SEASON })!,
      stopAfter: { season: DEFAULT_SEASON, phase: "TRAINING_CAMP", week: 1, day: 7 },
    }).run;
    expect(camp.officiating!.assignments).toEqual([]);
    const fromCamp = runRealSeason({
      seed, rosters: "standin", standIn: file, resumeFrom: camp.state,
      officiating: { kind: "STANDING", crews: camp.officiating!.crews, assignments: [] }, stopAfter: weekOneDayOne(DEFAULT_SEASON),
    }).run;
    expect(fromCamp.officiating!.crews).toEqual(camp.officiating!.crews);
    expect(fromCamp.officiating!.assignments).toHaveLength(16);
  }, WALK);

  it("asked for no crews, a stand-in run has none, whatever its file holds: the batch path of player-checks, cap-check and draft-check, as today", () => {
    const { file } = committedCrews();
    const seed = "adr-093-1b:no-crews";
    const runs = {
      "the default season": runRealSeason({ seed, rosters: "standin", standIn: file, stopAfter: weekOneDayOne(DEFAULT_SEASON) }).run,
      "the file's season": runRealSeason({ seed, season: 2026, rosters: "standin", standIn: file, stopAfter: weekOneDayOne(2026) }).run,
      // player-checks' switched-on arms
      "injuries on": runRealSeason({ seed, rosters: "standin", standIn: file, players: { injuries: true }, stopAfter: weekOneDayOne(2026) }).run,
    };
    for (const [what, run] of Object.entries(runs)) expect("officiating" in run, what).toBe(false);
    // Cap-check and draft-check build the league with buildStandInLeague and hand runSeason no crews:
    // the block never reaches the league or the rated league.
    const built = buildStandInLeague(buildLeague(seed), file);
    expect(Object.keys(built.league)).not.toContain("officiating");
    expect(Object.keys(built.rated.league)).not.toContain("officiating");
  }, WALK);

  it("with the file's crews, standing in 2026 or carried into 2027 (the default season), week 1 plays exactly as without them, and no game is handed a crew (step 2 changes this on purpose)", () => {
    const { file, own } = committedCrews();
    const seed = "adr-093-1b:week-1";
    // The file's season, asked for; and the season command's path with both player switches off and no
    // season given, where `seasonToPlay` gives the default and the crews are carried into it.
    const arms = [
      { what: "standing in 2026", asked: { season: 2026 }, season: 2026, kind: "STANDING" },
      { what: "carried into 2027, the default season", asked: {}, season: DEFAULT_SEASON, kind: "CARRY" },
    ] as const;
    for (const { what, asked, season, kind } of arms) {
      expect(seasonToPlay({ rosters: "standin", standIn: file, ...asked }), what).toBe(season);
      const officiating = officiatingFor(undefined, { file, season })!;
      expect(officiating.kind, what).toBe(kind);
      const stopAfter: CalendarStamp = { season, phase: "REGULAR_SEASON", week: 1, day: 7 };
      const withCrews = watcher();
      const without = watcher();
      const a = runRealSeason({ seed, ...asked, rosters: "standin", standIn: file, officiating, stopAfter, onGame: withCrews.onGame }).run;
      const b = runRealSeason({ seed, ...asked, rosters: "standin", standIn: file, stopAfter, onGame: without.onGame }).run;
      expect(a.state.season, what).toBe(season);
      expect(a.state.results, what).toHaveLength(16);
      const o = a.officiating!;
      expect(o.season, what).toBe(season);
      expect(named(o.crews), what).toEqual(named(own.crews));
      if (kind === "STANDING") expect(o.crews, what).toEqual(own.crews);
      expect(o.assignments, what).toHaveLength(16);
      expect("officiating" in b, what).toBe(false);
      expect(JSON.stringify({ ...a, officiating: undefined }), what).toBe(JSON.stringify(b));
      expect(withCrews.digests, what).toHaveLength(16);
      expect(withCrews.digests, what).toEqual(without.digests);
      expect(withCrews.starts.filter((p) => "crew" in p), what).toEqual([]);
    }
  }, SLOW);
});
