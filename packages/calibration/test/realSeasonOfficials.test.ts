/**
 * ADR-093 step 1 through the season command's path (plan-v2 S7). Asked for its crews, a new league's
 * season gives each week's games one of its 17 crews; a save keeps the crews and each game's crew
 * (F7); and the season carried on from that save with its own crews (`officiatingFor`, as the season
 * command's `--load` does) is the straight run, crews included. No game is handed a crew at step 1,
 * so asking for crews moves nothing on the pinned season path: pk-01, 2027, saved after
 * regular-season week 4 (64 games) and carried on to week 5. Week 5 is the first week with byes (14
 * games, franchise's buildSchedule.ts), and its four-week window, weeks 2 to 4, lies wholly inside
 * the save, so its draw reads only saved crews.
 *
 * Each run is made once, in the first test that needs it, under that test's timeout.
 */
import { describe, expect, it } from "vitest";
import { gameId, officiatingCrewId, type CalendarStamp, type MatchEventEnvelope, type OfficiatingCrew, type SaveFile } from "@ff/contracts";
import { buildLeague, makeSave, readSave, type SeasonRun } from "@ff/franchise";
import { stableDigest } from "../src/harness/digest.js";
import { foldDigests, gameBytesDigest, gameDigest, SEASON_PATH_PINS } from "../src/pocket/golden.js";
import { officiatingFor, runRealSeason, type SeasonGameWatcher } from "../src/season/realSeason.js";

const SLOW = 5 * 60_000;
const NEW = { kind: "NEW" } as const;
const W5D7: CalendarStamp = { season: SEASON_PATH_PINS.stopAfter.season, phase: "REGULAR_SEASON", week: 5, day: 7 };

/** Traits are a Set; JSON gets them as a list, as the season command writes a save (its own listTraits). */
const listSets = (_k: string, v: unknown): unknown => (v instanceof Set ? [...v] : v);

/** Made on first use and kept. */
function once<T>(make: () => T): () => T {
  let made: { readonly value: T } | undefined;
  return () => (made ??= { value: make() }).value;
}

/** A game's GAME_START payload. */
function startOf(events: readonly MatchEventEnvelope[]): Record<string, unknown> {
  const start = events.find((e) => e.event.type === "GAME_START");
  if (start === undefined || start.event.type !== "GAME_START") throw new Error("a game with no GAME_START");
  return start.event.payload;
}

/** What a run's games wrote: each one's digests, as the golden pins take them, and its GAME_START. */
interface Seen {
  readonly canonical: string[];
  readonly bytes: string[];
  readonly starts: Record<string, unknown>[];
}
function watcher(): { readonly seen: Seen; readonly onGame: SeasonGameWatcher } {
  const seen: Seen = { canonical: [], bytes: [], starts: [] };
  return {
    seen,
    onGame: (observation) => {
      seen.canonical.push(gameDigest(observation.events));
      seen.bytes.push(gameBytesDigest(observation.events));
      seen.starts.push(startOf(observation.events));
    },
  };
}

const firstWatch = watcher();
const secondWatch = watcher();

/** The pinned season path, asked for its crews: weeks 1 to 4, 64 games. */
const first = once(() => runRealSeason({
  seed: SEASON_PATH_PINS.seed, stopAfter: SEASON_PATH_PINS.stopAfter, officiating: NEW, onGame: firstWatch.onGame,
}));
/**
 * Its save, read back from JSON text: the league, the season, the generated squads' players (their
 * teams have rosters) and the crews. The season command's `--save` also keeps the coaches and its
 * note of what played the games; this save leaves both out, as the crews' round trip needs neither.
 */
const loaded = once(() => {
  const { league, rated, run } = first();
  const save = makeSave({
    league, calendar: run.calendar, season: run.state, createdBy: "test", players: rated!.league.players, officiating: run.officiating!,
  });
  return readSave(JSON.stringify(save, listSets, 2));
});
/** Carried on from the save with its crews, as `--load` does, to week 5: 14 new games. */
const second = once(() => {
  const l = loaded();
  return runRealSeason({
    seed: l.save.worldSeed, season: l.save.calendar.season, league: l.league, rules: l.rules, resumeFrom: l.save.world.season!,
    stopAfter: W5D7, officiating: officiatingFor(l.save)!, onGame: secondWatch.onGame,
  });
});
/** The same season played straight to week 5 with its crews: 78 games. */
const straight = once(() => runRealSeason({ seed: SEASON_PATH_PINS.seed, stopAfter: W5D7, officiating: NEW }));

const idsOf = (games: readonly { readonly gameId: unknown }[]): string[] => games.map((g) => String(g.gameId)).sort();
const regularWeeks = (run: SeasonRun, from: number, to: number) =>
  run.state.schedule.games.filter((g) => g.at.phase === "REGULAR_SEASON" && g.at.week >= from && g.at.week <= to);

describe("the season command's crews through the real sim (ADR-093 step 1)", () => {
  it("asking for crews changes nothing on the pinned season path", () => {
    const { run } = first();
    const { canonical, bytes, starts } = firstWatch.seen;
    expect(canonical, "games played").toHaveLength(SEASON_PATH_PINS.games);
    expect(foldDigests(canonical), "canonical fold, 64 games").toBe(SEASON_PATH_PINS.canonicalFold);
    expect(foldDigests(bytes), "byte fold, 64 games").toBe(SEASON_PATH_PINS.byteFold);
    expect(foldDigests(canonical.slice(0, 50)), "canonical fold, first 50").toBe(SEASON_PATH_PINS.first50CanonicalFold);
    expect(foldDigests(bytes.slice(0, 50)), "byte fold, first 50").toBe(SEASON_PATH_PINS.first50ByteFold);
    // The run is the pinned one but for its crews: stableDigest drops a member that is undefined.
    expect("officiating" in run).toBe(true);
    expect(stableDigest({ ...run, officiating: undefined }), "the season's run without its crews").toBe(SEASON_PATH_PINS.run);
    // No game is handed its crew at step 1, so no GAME_START carries one.
    expect(starts).toHaveLength(SEASON_PATH_PINS.games);
    expect(starts.filter((p) => "crew" in p)).toEqual([]);
  }, SLOW);

  it("weeks 1 to 4's 64 games each get one of 17 crews", () => {
    const { run } = first();
    const o = run.officiating!;
    expect(o.season).toBe(SEASON_PATH_PINS.stopAfter.season);
    expect(o.crews).toHaveLength(17);
    const crews = new Set(o.crews.map((c) => String(c.id)));
    expect(crews.size).toBe(17);
    expect(o.assignments).toHaveLength(SEASON_PATH_PINS.games);
    const given = o.assignments.map((a) => String(a.game));
    expect(new Set(given).size, "each game once").toBe(SEASON_PATH_PINS.games);
    expect([...given].sort()).toEqual(idsOf(regularWeeks(run, 1, 4)));
    expect([...given].sort()).toEqual(idsOf(run.state.results));
    expect(o.assignments.filter((a) => !crews.has(String(a.crew)))).toEqual([]);
  }, SLOW);

  it("the save keeps the crews and each game's crew, read back from JSON text", () => {
    const o = first().run.officiating!;
    expect(loaded().save.world.officiating).toEqual({ crews: o.crews, assignments: o.assignments });
  }, SLOW);

  it("carried on to week 5 with the saved crews, the run is the straight run's, crews included", () => {
    const rest = second().run;
    const all = straight().run;
    expect(JSON.stringify(rest)).toBe(JSON.stringify(all));
    // Week 5's 14 games, the first drawn after the save: the same crews as the straight run's draw.
    const week5 = new Set(idsOf(regularWeeks(all, 5, 5)));
    expect(week5.size).toBe(14);
    const ofWeek5 = (run: SeasonRun) => run.officiating!.assignments.filter((a) => week5.has(String(a.game)));
    expect(ofWeek5(rest)).toHaveLength(14);
    expect(ofWeek5(rest)).toEqual(ofWeek5(all));
    // Every game the save gave a crew keeps it, and the same seed drew the same crews (Iron Rule 4).
    const saved = first().run.officiating!;
    expect(all.officiating!.assignments).toHaveLength(SEASON_PATH_PINS.games + 14);
    expect(rest.officiating!.assignments.slice(0, SEASON_PATH_PINS.games)).toEqual(saved.assignments);
    expect(all.officiating!.assignments.slice(0, SEASON_PATH_PINS.games)).toEqual(saved.assignments);
    expect(all.officiating!.crews).toEqual(saved.crews);
    // The carried-on season's own games are handed no crew either.
    expect(secondWatch.seen.starts).toHaveLength(14);
    expect(secondWatch.seen.starts.filter((p) => "crew" in p)).toEqual([]);
  }, SLOW);

  it("officiatingFor: NEW with no save, STANDING with a save's slot, nothing for a save without one", () => {
    const league = buildLeague("adr-093:officiating-for");
    const world: SaveFile["world"] = {
      teams: league.teams, players: [], staff: [], contracts: [], perceptions: [], league: league.structure, season: null,
      narrativeState: null, fashion: null,
    };
    const crews: OfficiatingCrew[] = Array.from({ length: 17 }, (_, i) => ({
      id: officiatingCrewId(`crew-${String(i + 1).padStart(2, "0")}`),
      referee: `Referee ${i + 1}`,
      leans: { LINE_HOLDING: 50, COVERAGE: 50, PLAYER_SAFETY: 50, TECHNICAL: 50, SNAP: 50 },
    }));
    const assignments = [{ game: gameId("g-1"), crew: crews[0]!.id }, { game: gameId("g-2"), crew: crews[16]!.id }];

    expect(officiatingFor(undefined)).toEqual({ kind: "NEW" });
    expect(officiatingFor({ world: { ...world, officiating: { crews, assignments } } })).toEqual({ kind: "STANDING", crews, assignments });
    // A save from before a season holds crews and no game's crew yet: they stand as they are.
    expect(officiatingFor({ world: { ...world, officiating: { crews, assignments: [] } } })).toEqual({ kind: "STANDING", crews, assignments: [] });
    expect(officiatingFor({ world })).toBeUndefined();
  });
});
