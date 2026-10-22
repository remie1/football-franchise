/**
 * A WHOLE SEASON THROUGH THE REAL SIM (season shell S7; ADR-078 R1).
 *
 * Franchise runs the season but may not import the engine, so it asks "who won?" through a
 * `GameResolver`. This file is the real one: each scheduled game is played by `runOneGame`, the
 * same path every batch uses, on the flat league's rosters.
 *
 * R1 permits calibration → franchise for exactly: the league builder, `buildSchedule`,
 * `computeStandings`, `seedPlayoffs`, `runSeason` and the `GameResolver` type
 * (`test/seasonSurface.test.ts` holds us to it).
 *
 * It only READS the sim: no tunable, caller default or seed path is touched.
 *
 * Rosters: franchise's teams have no players yet, so team i of the franchise league plays with
 * team i of the flat league (every attribute 60). Results are therefore close to coin flips — a
 * real season shape with equal teams, until `@ff/attributes` supplies rated rosters.
 */
import { DEFAULT_LEAGUE_RULES, type GameResult, type LeagueRules, type ScheduledGame, type TeamId } from "@ff/contracts";
import { buildLeague, runSeason, type GameResolver, type League, type SeasonRun } from "@ff/franchise";
import type { CallerVersion } from "../caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { runOneGame } from "../harness/runGame.js";
import { buildFixture, type GameFixture } from "../harness/schedule.js";
import { buildFlatLeague } from "../league/flat.js";
import { fullStrength, indexLeague } from "../league/snapshot.js";

export interface RealSimOptions {
  readonly callerVersion?: CallerVersion;
  readonly rules?: LeagueRules;
}

/** The engine's week for a scheduled game: playoff weeks follow the regular season's. */
function simWeek(game: ScheduledGame, rules: LeagueRules): number {
  return game.at.phase === "REGULAR_SEASON" ? game.at.week : rules.weeksPerSeason + game.at.week;
}

export function realSimResolver(league: League, opts: RealSimOptions = {}): GameResolver {
  const rules = opts.rules ?? DEFAULT_LEAGUE_RULES;
  const index = indexLeague(buildFlatLeague({ teams: league.teams.length }));
  const flatIds = index.teamIds();
  const toFlat = new Map<string, TeamId>(league.teams.map((t, i) => [String(t.id), flatIds[i]!]));
  const flatOf = (t: TeamId): TeamId => {
    const f = toFlat.get(String(t));
    if (f === undefined) throw new Error(`realSimResolver: team ${String(t)} is not in this league`);
    return f;
  };

  return (game, seed): GameResult => {
    const week = simWeek(game, rules);
    const home = flatOf(game.home);
    const away = flatOf(game.away);
    const fixture: GameFixture = {
      season: game.season,
      week,
      home,
      away,
      homeRoster: fullStrength(index.teams.get(String(home))!, game.season, week),
      awayRoster: fullStrength(index.teams.get(String(away))!, game.season, week),
      replay: 0,
    };
    const { observation } = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      ...(opts.callerVersion === undefined ? {} : { callerVersion: opts.callerVersion }),
    });
    const s = observation.summary;
    return {
      gameId: game.gameId,
      home: game.home,
      away: game.away,
      homeScore: s.score.home,
      awayScore: s.score.away,
      reason: s.finalReason,
      seed,
      // ADR-082 N2: the stories read how the game unfolded; the sim already kept it.
      periods: s.periods.map((p, i) => ({ period: i + 1, home: p.home, away: p.away })),
    };
  };
}

export interface RealSeasonInput {
  readonly seed: string;
  readonly season?: number;
  readonly callerVersion?: CallerVersion;
}

/** Build the fictional league from `seed` and play its season through the real sim. */
export function runRealSeason(input: RealSeasonInput): { league: League; run: SeasonRun } {
  const league = buildLeague(input.seed);
  const resolve = realSimResolver(league, input.callerVersion === undefined ? {} : { callerVersion: input.callerVersion });
  const run = runSeason({ league, season: input.season ?? 2027, seed: input.seed, resolve });
  return { league, run };
}
