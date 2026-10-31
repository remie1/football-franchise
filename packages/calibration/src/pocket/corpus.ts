/**
 * THE POCKET FIX'S CORPORA (ADR-089 step 0; plan §3.3).
 *
 * Every measurement, bench and proof of the pocket fix reads one of three corpora, and every
 * stream reads them through here so that "the flat base" means the same 496 games everywhere:
 *
 *  - `flatBaseline(set)`: the flat league's 496 round-robin games, baselineTool's corpus
 *    (`test/baselineTool.test.ts`: 32 teams, one round, season 2024). Set 1 is its own seeds,
 *    `generateSeeds("baseline-0001", 496)`; set 2 is `generateSeeds("adr-089:seed-set-2", 496)`
 *    over the same fixtures (deviation O4: the `baseline-000N` names belong to the baseline series).
 *  - `genSeason(set)`: the generated league's 2027 regular season through the real season path,
 *    `runRealSeason({seed, stopAfter: 2027 REGULAR_SEASON week 18 day 7})` (272 games). Set 1 is
 *    `pk-01`; set 2 is `pk-02`, which the design's own runs already used (ADR-089:1690).
 *  - `goldenGames(league)`: the two 50-game lists the golden digests pin (plan §0).
 *
 * The second seed sets are filed in the step-0 filing's `base` block. They serve the selection's
 * separation test, M5's noise, M9's tolerance, the miss rule's two-seed-set pricing
 * (ADR-089:1179) and the S late context arm at step 1.
 *
 * EVERY CORPUS IS A VISITOR: `visit(observation, snapshot, meta)` is called once per game, in
 * corpus order, and nothing is kept (a stored 496-game corpus with snapshots runs out of memory).
 * Each takes `{tunables, mirror, callerVersion}` and passes them to `runOneGame` or to
 * `runRealSeason`'s `game`; absent, every game is today's.
 */
import type { GameSnapshot, Tunables } from "@ff/engine";
import { buildLeague } from "@ff/franchise";
import type { CallerVersion } from "../caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { runOneGame } from "../harness/runGame.js";
import { buildFixture, buildFixtures, type GameFixture } from "../harness/schedule.js";
import { generateSeeds } from "../harness/seeds.js";
import { buildFlatLeague } from "../league/flat.js";
import { indexLeague, type LeagueIndex } from "../league/snapshot.js";
import type { SimGameObservation } from "../metrics/collect.js";
import { buildGeneratedLeague } from "../season/generatedLeague.js";
import { runRealSeason } from "../season/realSeason.js";
import type { GoldenLeague } from "./golden.js";

export type SeedSet = 1 | 2;
export const SEED_SETS: readonly SeedSet[] = [1, 2];

/** The corpora's definitions, as the filing's `base` block records them. */
export const CORPORA = Object.freeze({
  flatBaseline: Object.freeze({
    league: "flat",
    teams: 32,
    schedule: Object.freeze({ kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 } as const),
    games: 496,
    seedBatch: Object.freeze({ 1: "baseline-0001", 2: "adr-089:seed-set-2" } as const),
  }),
  genSeason: Object.freeze({
    league: "generated",
    season: 2027,
    stopAfter: Object.freeze({ season: 2027, phase: "REGULAR_SEASON", week: 18, day: 7 } as const),
    games: 272,
    seasonSeed: Object.freeze({ 1: "pk-01", 2: "pk-02" } as const),
  }),
  golden: Object.freeze({
    games: 50,
    flat: Object.freeze({
      teams: 32,
      schedule: Object.freeze({ kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 } as const),
      seedBatch: "baseline-0001",
    }),
    gen: Object.freeze({
      leagueSeed: "pk-01",
      season: 2027,
      schedule: Object.freeze({ kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2027 } as const),
      seedBatch: "adr-089:golden-gen",
    }),
  }),
  /** Every corpus plays the frozen caller, at its default leash. */
  caller: Object.freeze({ tendencies: "FROZEN_TENDENCIES", fourthDown: "FROZEN_FOURTH_DOWN", leash: "default" }),
});

export type CorpusName = "flat-baseline" | "gen-season" | "golden-flat" | "golden-gen";

/** Where a visited game sits in its corpus. Plain data. */
export interface CorpusGameMeta {
  readonly corpus: CorpusName;
  readonly seedSet?: SeedSet;
  /** 0-based, in corpus order. */
  readonly index: number;
  readonly seed: string;
  readonly season: number;
  readonly week: number;
  readonly home: string;
  readonly away: string;
}

export type CorpusVisitor = (observation: SimGameObservation, snapshot: GameSnapshot, meta: CorpusGameMeta) => void;

export interface CorpusOptions {
  readonly tunables?: Tunables;
  /** ADR-089 M5 measurement arms only — see `RunGameInput.mirror`. */
  readonly mirror?: boolean;
  readonly callerVersion?: CallerVersion;
}

export interface CorpusRun {
  readonly corpus: CorpusName;
  readonly games: number;
}

/** `runOneGame`'s optional fields, written only where given. */
function gameFields(opts: CorpusOptions): { readonly tunables?: Tunables; readonly mirror?: boolean; readonly callerVersion?: CallerVersion } {
  return {
    ...(opts.tunables === undefined ? {} : { tunables: opts.tunables }),
    ...(opts.mirror === undefined ? {} : { mirror: opts.mirror }),
    ...(opts.callerVersion === undefined ? {} : { callerVersion: opts.callerVersion }),
  };
}

/** Plays `fixtures[i]` on `seeds[i]`, building each snapshot only when its game is played. */
function playFixtures(
  corpus: CorpusName,
  index: LeagueIndex,
  fixtures: readonly GameFixture[],
  seeds: readonly string[],
  visit: CorpusVisitor,
  opts: CorpusOptions,
  seedSet: SeedSet | undefined,
): CorpusRun {
  fixtures.forEach((fixture, i) => {
    const seed = seeds[i];
    if (seed === undefined) throw new RangeError(`${corpus}: no seed for game ${String(i)}`);
    const built = buildFixture(index, fixture);
    const { observation } = runOneGame({
      built,
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      ...gameFields(opts),
    });
    visit(observation, built.snapshot, {
      corpus,
      ...(seedSet === undefined ? {} : { seedSet }),
      index: i,
      seed,
      season: fixture.season,
      week: fixture.week,
      home: String(fixture.home),
      away: String(fixture.away),
    });
  });
  return { corpus, games: fixtures.length };
}

function limited<T>(list: readonly T[], first: number | undefined): readonly T[] {
  if (first === undefined) return list;
  if (!Number.isInteger(first) || first < 1) throw new RangeError(`first must be a whole number of games, at least 1 (got ${String(first)})`);
  return list.slice(0, first);
}

/** The flat league's 496 round-robin games on seed set 1 or 2. `first` plays only the first n (tests). */
export function flatBaseline(set: SeedSet, visit: CorpusVisitor, opts: CorpusOptions & { readonly first?: number } = {}): CorpusRun {
  const def = CORPORA.flatBaseline;
  const index = indexLeague(buildFlatLeague({ teams: def.teams }));
  const fixtures = buildFixtures(index, def.schedule);
  if (fixtures.length !== def.games) throw new Error(`flatBaseline: ${String(fixtures.length)} fixtures, expected ${String(def.games)}`);
  const seeds = generateSeeds(def.seedBatch[set], fixtures.length).seeds;
  return playFixtures("flat-baseline", index, limited(fixtures, opts.first), seeds, visit, opts, set);
}

/**
 * The generated league's 2027 regular season on seed set 1 (`pk-01`) or 2 (`pk-02`), through the
 * real season path. `throughWeek` stops earlier (tests); the default is week 18, all 272 games.
 */
export function genSeason(set: SeedSet, visit: CorpusVisitor, opts: CorpusOptions & { readonly throughWeek?: number } = {}): CorpusRun {
  const def = CORPORA.genSeason;
  const week = opts.throughWeek ?? def.stopAfter.week;
  if (!Number.isInteger(week) || week < 1 || week > def.stopAfter.week) {
    throw new RangeError(`throughWeek must be a regular-season week, 1 to ${String(def.stopAfter.week)} (got ${String(week)})`);
  }
  const seed = def.seasonSeed[set];
  let games = 0;
  runRealSeason({
    seed,
    season: def.season,
    stopAfter: { ...def.stopAfter, week },
    ...(opts.callerVersion === undefined ? {} : { callerVersion: opts.callerVersion }),
    ...(opts.tunables === undefined && opts.mirror === undefined
      ? {}
      : {
          game: {
            ...(opts.tunables === undefined ? {} : { tunables: opts.tunables }),
            ...(opts.mirror === undefined ? {} : { mirror: opts.mirror }),
          },
        }),
    onGame: (observation, game, snapshot) => {
      visit(observation, snapshot, {
        corpus: "gen-season",
        seedSet: set,
        index: games,
        seed: observation.seed,
        season: game.season,
        week: game.at.week,
        home: String(game.home),
        away: String(game.away),
      });
      games += 1;
    },
  });
  return { corpus: "gen-season", games };
}

/** The golden digests' league index, fixtures and seeds (plan §0), before any game is played. */
export function goldenFixtures(league: GoldenLeague): { readonly index: LeagueIndex; readonly fixtures: readonly GameFixture[]; readonly seeds: readonly string[] } {
  const def = CORPORA.golden;
  const index =
    league === "flat"
      ? indexLeague(buildFlatLeague({ teams: def.flat.teams }))
      : indexLeague(buildGeneratedLeague(buildLeague(def.gen.leagueSeed), { season: def.gen.season }));
  const schedule = league === "flat" ? def.flat.schedule : def.gen.schedule;
  const fixtures = buildFixtures(index, schedule).slice(0, def.games);
  if (fixtures.length !== def.games) throw new Error(`goldenFixtures(${league}): ${String(fixtures.length)} fixtures, expected ${String(def.games)}`);
  const seeds = generateSeeds(league === "flat" ? def.flat.seedBatch : def.gen.seedBatch, def.games).seeds;
  return { index, fixtures, seeds };
}

/** The golden digests' 50 games of one league. `first` plays only the first n (tests). */
export function goldenGames(league: GoldenLeague, visit: CorpusVisitor, opts: CorpusOptions & { readonly first?: number } = {}): CorpusRun {
  const { index, fixtures, seeds } = goldenFixtures(league);
  return playFixtures(league === "flat" ? "golden-flat" : "golden-gen", index, limited(fixtures, opts.first), seeds, visit, opts, undefined);
}
