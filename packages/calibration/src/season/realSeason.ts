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
 * Rosters (ADR-079): by default each team plays with its own made-up squad from
 * `buildGeneratedLeague`. With `rosters: "flat"`, team i of the franchise league plays with team
 * i of the flat league instead (every attribute 60): equal teams, results close to coin flips.
 * With `rosters: "standin"`, the teams are the real NFL's stand-ins from a league file (ADR-088).
 */
import {
  DEFAULT_LEAGUE_RULES,
  type CalendarStamp, type FranchiseEventEnvelope, type GameResult, type LeagueRules, type ScheduledGame,
  type SeasonSchedule, type SeasonState, type TeamId,
} from "@ff/contracts";
import { buildLeague, runSeason, type GameResolver, type League, type SeasonRun } from "@ff/franchise";
import type { CallerVersion } from "../caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { runOneGame } from "../harness/runGame.js";
import { buildFixture, type GameFixture } from "../harness/schedule.js";
import { buildFlatLeague } from "../league/flat.js";
import type { AnyProvenancedLeague } from "../league/provenance.js";
import { fullStrength, indexLeague } from "../league/snapshot.js";
import { buildGeneratedLeague, type GeneratedLeague } from "./generatedLeague.js";
import { buildStandInLeague, type readStandInFile, type StandInLeague } from "./standInLeague.js";

export interface RealSimOptions {
  readonly callerVersion?: CallerVersion;
  readonly rules?: LeagueRules;
  /**
   * The rated league whose teams play: its team ids must be the franchise league's. Absent, the
   * flat league stands in, team i for team i.
   */
  readonly rated?: AnyProvenancedLeague;
}

/** The engine's week for a scheduled game: playoff weeks follow the regular season's. */
function simWeek(game: ScheduledGame, rules: LeagueRules): number {
  return game.at.phase === "REGULAR_SEASON" ? game.at.week : rules.weeksPerSeason + game.at.week;
}

/** Always a plain result (a `GameResolver` may also hand back extras; this one has none). */
export function realSimResolver(league: League, opts: RealSimOptions = {}): (game: ScheduledGame, seed: string) => GameResult {
  const rules = opts.rules ?? DEFAULT_LEAGUE_RULES;
  const index = indexLeague(opts.rated ?? buildFlatLeague({ teams: league.teams.length }));
  const ratedIds = index.teamIds();
  if (opts.rated !== undefined) {
    const missing = league.teams.filter((t) => !index.teams.has(String(t.id)));
    if (missing.length > 0) throw new Error(`realSimResolver: rated league ${index.league.id} has no team ${String(missing[0]!.id)}`);
  }
  const toRated = new Map<string, TeamId>(
    league.teams.map((t, i) => [String(t.id), opts.rated === undefined ? ratedIds[i]! : t.id]),
  );
  const ratedOf = (t: TeamId): TeamId => {
    const f = toRated.get(String(t));
    if (f === undefined) throw new Error(`realSimResolver: team ${String(t)} is not in this league`);
    return f;
  };

  return (game, seed): GameResult => {
    const week = simWeek(game, rules);
    const home = ratedOf(game.home);
    const away = ratedOf(game.away);
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

export type SeasonRosters = "generated" | "flat" | "standin";

export interface RealSeasonInput {
  readonly seed: string;
  readonly season?: number;
  readonly callerVersion?: CallerVersion;
  /** A league read from a save; built from `seed` when absent. */
  readonly league?: League;
  readonly rules?: LeagueRules;
  /** Save and load: stop after this day, or carry on from a saved season. */
  readonly stopAfter?: CalendarStamp;
  readonly resumeFrom?: SeasonState;
  /** Whose players play: each team's own made-up squad (default), or the flat league's. */
  readonly rosters?: SeasonRosters;
  /** With `rosters: "standin"`: the parsed league file (ADR-088 R5). */
  readonly standIn?: ReturnType<typeof readStandInFile>;
  /** Team-strength spread for generated squads (ADR-079 Q2; tuned in R5). */
  readonly teamStrengthSd?: number;
  /** Sees each event as the season plays (the season command's headlines, ADR-082 R2). Watches only. */
  readonly onEvent?: (envelope: FranchiseEventEnvelope, schedule: SeasonSchedule) => void;
}

/**
 * Build the fictional league from `seed` (or take a saved one) and play its season through the
 * real sim. Generated squads are rebuilt from the league's seed and the season, so a loaded save
 * gets the same players it was saved with.
 */
export function runRealSeason(input: RealSeasonInput): { league: League; rated?: GeneratedLeague | StandInLeague; run: SeasonRun } {
  const base = input.league ?? buildLeague(input.seed);
  const rules = input.rules ?? DEFAULT_LEAGUE_RULES;
  const season = input.season ?? 2027;
  const rosters = input.rosters ?? "generated";
  let league: League = base;
  let rated: GeneratedLeague | StandInLeague | undefined;
  if (rosters === "generated") {
    rated = buildGeneratedLeague(base, { season, ...(input.teamStrengthSd === undefined ? {} : { teamStrengthSd: input.teamStrengthSd }) });
    league = { ...base, teams: rated.league.teams };
  } else if (rosters === "standin") {
    if (input.standIn === undefined) throw new Error("runRealSeason: rosters \"standin\" needs the league file (standIn)");
    ({ league, rated } = buildStandInLeague(base, input.standIn));
  }
  const resolve = realSimResolver(league, {
    rules,
    ...(input.callerVersion === undefined ? {} : { callerVersion: input.callerVersion }),
    ...(rated === undefined ? {} : { rated }),
  });
  const run = runSeason({
    league, season, seed: input.seed, resolve, rules,
    ...(input.stopAfter ? { stopAfter: input.stopAfter } : {}),
    ...(input.resumeFrom ? { resumeFrom: input.resumeFrom } : {}),
    ...(input.onEvent ? { onEvent: input.onEvent } : {}),
  });
  return { league, ...(rated === undefined ? {} : { rated }), run };
}
