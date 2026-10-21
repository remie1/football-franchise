/**
 * S7 — one season, end to end (season shell plan; ADR-078).
 *
 * Builds the schedule, runs the clock from the first day of camp, plays each game day's games
 * through a `GameResolver`, keeps the standings current, seeds and plays the playoffs, and stops
 * on the first day of the offseason (or, with `through: "YEAR"`, on the last day of OFF_SUMMER).
 *
 * Franchise never imports the engine (Iron Rule 1). Who wins a game is the resolver's business:
 * tests pass a seeded fake, and calibration passes the real sim (ADR-078 R1).
 *
 * Same league, season, seed and resolver → the identical season and event stream.
 */
import {
  DEFAULT_LEAGUE_RULES, compareStamps, stampToString,
  type CalendarStamp, type FranchiseEvent, type FranchiseEventEnvelope, type GameResult,
  type LeagueRules, type ScheduledGame, type SeasonState, type TeamId,
} from "@ff/contracts";
import type { League } from "../league/buildLeague.js";
import { advance, phaseWeeks, seasonStart, DAYS_PER_WEEK, type ClockWorld } from "../calendar/clock.js";
import { buildSchedule } from "../schedule/buildSchedule.js";
import { computeStandings } from "../standings/computeStandings.js";
import { advanceBracket, seedPlayoffs } from "../playoffs/bracket.js";

/**
 * Plays one game. Must return a result for exactly `game` (same id, home and away) and must be a
 * pure function of its arguments, or the season is not reproducible.
 */
export type GameResolver = (game: ScheduledGame, seed: string) => GameResult;

export interface RunSeasonInput {
  league: League;
  season: number;
  seed: string;
  resolve: GameResolver;
  rules?: LeagueRules;
  /** Last season's division finishes, for the same-place games (see `buildSchedule`). */
  previousFinish?: Readonly<Record<string, readonly TeamId[]>>;
  /** Where to stop: the first day of the offseason (default) or the last day of the year. */
  through?: "PLAYOFFS" | "YEAR";
}

export interface SeasonRun {
  state: SeasonState;
  calendar: CalendarStamp;
  events: FranchiseEventEnvelope[];
}

/** A playoff game the resolver returns level is played again on a fresh seed, at most this often. */
export const MAX_PLAYOFF_REPLAYS = 10;

export function gameSeed(seed: string, game: ScheduledGame): string {
  return `${seed}/${String(game.gameId)}`;
}

function play(game: ScheduledGame, seed: string, resolve: GameResolver): GameResult {
  const base = gameSeed(seed, game);
  for (let replay = 0; replay <= MAX_PLAYOFF_REPLAYS; replay++) {
    const s = replay === 0 ? base : `${base}/replay-${replay}`;
    const r = resolve(game, s);
    if (r.gameId !== game.gameId || r.home !== game.home || r.away !== game.away) {
      throw new Error(`runSeason: resolver answered ${String(r.gameId)} (${String(r.away)}@${String(r.home)}) for ${String(game.gameId)}`);
    }
    if (game.kind === "REGULAR" || game.kind === "PRESEASON" || r.homeScore !== r.awayScore) return r;
  }
  throw new Error(`runSeason: playoff game ${String(game.gameId)} was level after ${MAX_PLAYOFF_REPLAYS} replays`);
}

const sameDay = (a: CalendarStamp, b: CalendarStamp) => compareStamps(a, b) === 0;

export function runSeason(input: RunSeasonInput): SeasonRun {
  const { league, season, seed, resolve } = input;
  const rules = input.rules ?? DEFAULT_LEAGUE_RULES;
  const schedule = buildSchedule(league, season, seed, {
    rules,
    ...(input.previousFinish ? { previousFinish: input.previousFinish } : {}),
  });

  // Standings and seeding count regular-season games only.
  const regularIds = new Set(schedule.games.filter((g) => g.kind === "REGULAR").map((g) => String(g.gameId)));
  let state: SeasonState = { season, schedule, results: [], standings: computeStandings(league, [], { seed }) };
  let world: ClockWorld = { calendar: seasonStart(season), leagueRules: rules, season: state };
  const events: FranchiseEventEnvelope[] = [];
  const emit = (event: FranchiseEvent) => events.push({ seq: events.length, at: world.calendar, event });
  const moveTo = (to: CalendarStamp) => {
    const r = advance(world, to, { firstSeq: events.length });
    events.push(...r.events);
    world = r.world;
  };

  emit({ type: "CALENDAR_PHASE_ENTERED", payload: { phase: world.calendar.phase } });

  const played = new Set<string>();
  const pending = () => [...state.schedule.games, ...(state.bracket?.games ?? [])]
    .filter((g) => !played.has(String(g.gameId)))
    .sort((a, b) => compareStamps(a.at, b.at) || String(a.gameId).localeCompare(String(b.gameId)));

  for (;;) {
    const queue = pending();
    if (queue.length === 0) {
      if (state.bracket?.champion !== undefined) break;
      if (state.bracket === undefined) {
        moveTo({ season, phase: "PLAYOFFS", week: 1, day: 1 });
        const regular = state.results.filter((r) => regularIds.has(String(r.gameId)));
        const bracket = advanceBracket(seedPlayoffs(league, regular, season, rules, { seed }), state.results);
        state = { ...state, bracket };
        world = { ...world, season: state };
        emit({ type: "PLAYOFF_FIELD_SET", payload: { season, seeds: bracket.seeds } });
        continue;
      }
      throw new Error(`runSeason: the bracket stalled without a champion at ${stampToString(world.calendar)}`);
    }

    const day = queue[0]!.at;
    moveTo(day);
    const results = [...state.results];
    for (const game of queue.filter((g) => sameDay(g.at, day))) {
      const result = play(game, seed, resolve);
      results.push(result);
      played.add(String(game.gameId));
      emit({ type: "GAME_COMPLETED", payload: { result, kind: game.kind } });
    }
    const regular = results.filter((r) => regularIds.has(String(r.gameId)));
    state = { ...state, results, standings: computeStandings(league, regular, { seed }) };
    if (state.bracket) {
      const bracket = advanceBracket(state.bracket, results);
      state = { ...state, bracket };
      if (bracket.champion !== undefined) emit({ type: "CHAMPION_DECIDED", payload: { season, team: bracket.champion } });
    }
    world = { ...world, season: state };
  }

  const end: CalendarStamp = input.through === "YEAR"
    ? { season, phase: "OFF_SUMMER", week: phaseWeeks("OFF_SUMMER", rules), day: DAYS_PER_WEEK }
    : { season, phase: "OFF_EVAL", week: 1, day: 1 };
  moveTo(end);
  return { state, calendar: world.calendar, events };
}
