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
 *
 * Save and load: `stopAfter` ends the run early on a chosen day, and `resumeFrom` carries on from a
 * saved season. A resumed run replays the season from its first day with the saved games read from
 * the save instead of played, so stopping and carrying on gives the season, event stream included,
 * that one straight run gives.
 *
 * `onEvent` sees each event as it happens, for a caller that reports while the season plays (the
 * season command's headlines, ADR-082 R2). It only watches: the run is the same with or without it.
 *
 * People and day steps (ADR-086 §2): with `people`, the run also carries the league's teams, players,
 * picks and classes through the year, and each `daySteps` entry gets one look at every day the walk
 * passes, after that day's games: the draft, cut-down day and the aging thread's weekly growth all
 * run this way, in one walk. A step decides for itself whether the day is its day.
 *
 * Players (ADR-087 §10): with `players`, the development week, injuries, the weekly depth chart and
 * unsigned retirements run as day steps too, after any `daySteps`. A resumed run does not run a
 * day's steps again; `resumeEvents` hands back what they emitted on those days, so the resumed
 * stream is the one a straight run gives.
 */
import {
  DEFAULT_LEAGUE_RULES, compareStamps, stampToString,
  type CalendarStamp, type FranchiseEvent, type FranchiseEventEnvelope, type GameResult,
  type LeagueRules, type ScheduledGame, type SeasonSchedule, type SeasonState, type TeamId,
} from "@ff/contracts";
import type { League } from "../league/buildLeague.js";
import type { LeaguePeople, DayStep } from "./people.js";
import { draftSteps, turnYear, type DraftStepsConfig } from "../draft/steps.js";
import { PLAYER_STEP_PREFIX, playerSteps, type PlayerStepsConfig } from "../players/steps.js";
import { leagueYearSteps, type LeagueYearConfig } from "../cap/leagueYear.js";
import { advance, nextDay, phaseWeeks, seasonStart, DAYS_PER_WEEK, type ClockWorld } from "../calendar/clock.js";
import { buildSchedule } from "../schedule/buildSchedule.js";
import { computeStandings } from "../standings/computeStandings.js";
import { advanceBracket, seedPlayoffs } from "../playoffs/bracket.js";

/**
 * Plays one game. Must return a result for exactly `game` (same id, home and away) and must be a
 * pure function of its arguments, or the season is not reproducible.
 */
export type GameResolver = (game: ScheduledGame, seed: string, people?: LeaguePeople) => GameResult | ResolvedGame;

/** A result with whatever else the resolver learned (ADR-086 §2; e.g. who played, for ADR-087). Day steps see it. */
export interface ResolvedGame { result: GameResult; extras?: unknown }

const unwrap = (r: GameResult | ResolvedGame): ResolvedGame => ("result" in r ? r : { result: r });

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
  /**
   * Stop early: play every game day up to and including this day, move the clock to it, and return
   * with `complete: false`. A day's games are played all together or not at all.
   */
  stopAfter?: CalendarStamp;
  /**
   * Carry on from a saved season: its results are used as they stand and only the rest is played.
   * The save must be of this season, built from the same league and seed.
   */
  resumeFrom?: SeasonState;
  /** Called with each event as it is added, and the season's schedule. Watches only. */
  onEvent?: (envelope: FranchiseEventEnvelope, schedule: SeasonSchedule) => void;
  /** ADR-086 §2: the league's people, carried through the walk and handed to the resolver. */
  people?: LeaguePeople;
  /** ADR-086 §2: run on every day the walk passes, after the day's games, in this order. Needs `people`. */
  daySteps?: readonly DayStep[];
  /**
   * A resumed run: the steps already ran on every day up to and including this one (the save's
   * calendar), and `people` is as they left it, so they are not run again.
   */
  stepsDoneThrough?: CalendarStamp;
  /**
   * ADR-086: play the draft's offseason. Its steps run after `daySteps` (`draftSteps`), and a run that
   * completes its year turns the year for the next season (`turnYear`), so `SeasonRun.people` is ready
   * to start it. Needs `people`.
   */
  draft?: DraftStepsConfig;
  /**
   * ADR-087 §10: the players' steps (development, injuries, depth charts, unsigned retirements), with
   * their switches. Needs `people`. Absent, or both switches off, adds no steps.
   */
  players?: PlayerStepsConfig;
  /**
   * ADR-085: play the league year (the cap, re-signings and tags, deals running out, free agency,
   * cap compliance). Its steps run after the players' and before the draft's. Needs `people`.
   */
  leagueYear?: LeagueYearConfig;
  /**
   * A resumed run: the events the players' steps emitted on the days up to `stepsDoneThrough` (a
   * save's `world.development.events`, S1), emitted again on their days in place of running the steps.
   */
  resumeEvents?: readonly FranchiseEventEnvelope[];
}

export interface SeasonRun {
  state: SeasonState;
  calendar: CalendarStamp;
  events: FranchiseEventEnvelope[];
  /** False when `stopAfter` ended the run before its end date. */
  complete: boolean;
  /** The people as the run left them; absent when the run was given none. */
  people?: LeaguePeople;
  /**
   * Every event a day step emitted (or a resumed run handed back through `resumeEvents`), with the
   * step's id, in stream order. Absent when the run had no steps.
   */
  stepEvents?: { step: string; envelope: FranchiseEventEnvelope }[];
}

/** A playoff game the resolver returns level is played again on a fresh seed, at most this often. */
export const MAX_PLAYOFF_REPLAYS = 10;

export function gameSeed(seed: string, game: ScheduledGame): string {
  return `${seed}/${String(game.gameId)}`;
}

function play(game: ScheduledGame, seed: string, resolve: GameResolver, saved: ReadonlyMap<string, GameResult>, people?: LeaguePeople): ResolvedGame {
  const base = gameSeed(seed, game);
  const kept = saved.get(String(game.gameId));
  if (kept) {
    const replays = Array.from({ length: MAX_PLAYOFF_REPLAYS }, (_, k) => `${base}/replay-${k + 1}`);
    if (kept.home !== game.home || kept.away !== game.away || (kept.seed !== base && !replays.includes(kept.seed))) {
      throw new Error(`runSeason: the saved result for ${String(game.gameId)} was not played in this season`);
    }
    return { result: kept };
  }
  for (let replay = 0; replay <= MAX_PLAYOFF_REPLAYS; replay++) {
    const s = replay === 0 ? base : `${base}/replay-${replay}`;
    const resolved = unwrap(people ? resolve(game, s, people) : resolve(game, s));
    const r = resolved.result;
    if (r.gameId !== game.gameId || r.home !== game.home || r.away !== game.away) {
      throw new Error(`runSeason: resolver answered ${String(r.gameId)} (${String(r.away)}@${String(r.home)}) for ${String(game.gameId)}`);
    }
    if (game.kind === "REGULAR" || game.kind === "PRESEASON" || r.homeScore !== r.awayScore) return resolved;
  }
  throw new Error(`runSeason: playoff game ${String(game.gameId)} was level after ${MAX_PLAYOFF_REPLAYS} replays`);
}

const sameDay = (a: CalendarStamp, b: CalendarStamp) => compareStamps(a, b) === 0;

export function runSeason(input: RunSeasonInput): SeasonRun {
  const { league, season, seed, resolve, stopAfter, resumeFrom } = input;
  // Order: the caller's steps, the players' (ADR-087), the league year's (ADR-085), then the draft's (ADR-086).
  const steps = [
    ...(input.daySteps ?? []), ...(input.players ? playerSteps(input.players) : []),
    ...(input.leagueYear ? leagueYearSteps(input.leagueYear) : []), ...(input.draft ? draftSteps(input.draft) : []),
  ];
  if (steps.length > 0 && !input.people) throw new Error("runSeason: daySteps, the players' steps, the league year and the draft need people");
  let people = input.people;
  const rules = input.rules ?? DEFAULT_LEAGUE_RULES;
  const schedule = buildSchedule(league, season, seed, {
    rules,
    ...(input.previousFinish ? { previousFinish: input.previousFinish } : {}),
  });
  if (stopAfter && compareStamps(stopAfter, seasonStart(season)) < 0) {
    throw new Error(`runSeason: stopAfter ${stampToString(stopAfter)} is before the season starts`);
  }
  if (resumeFrom && (resumeFrom.season !== season || JSON.stringify(resumeFrom.schedule) !== JSON.stringify(schedule))) {
    throw new Error(`runSeason: the saved season is not season ${season} of this league and seed`);
  }
  const saved = new Map((resumeFrom?.results ?? []).map((r) => [String(r.gameId), r]));

  // Standings and seeding count regular-season games only.
  const regularIds = new Set(schedule.games.filter((g) => g.kind === "REGULAR").map((g) => String(g.gameId)));
  let state: SeasonState = { season, schedule, results: [], standings: computeStandings(league, [], { seed }) };
  let world: ClockWorld = { calendar: seasonStart(season), leagueRules: rules, season: state };
  const events: FranchiseEventEnvelope[] = [];
  const record = (envelope: FranchiseEventEnvelope) => {
    events.push(envelope);
    input.onEvent?.(envelope, schedule);
  };
  const emit = (event: FranchiseEvent) => record({ seq: events.length, at: world.calendar, event });
  // The last day whose steps have run. A resumed run's steps ran already, up to the save's day.
  let stepped: CalendarStamp | undefined = input.stepsDoneThrough;
  const stepEvents: { step: string; envelope: FranchiseEventEnvelope }[] = [];
  const stepEmit = (step: string, event: FranchiseEvent) => {
    emit(event);
    stepEvents.push({ step, envelope: events[events.length - 1]! });
  };
  // What the steps emitted on the days a resumed run does not run them again, by day.
  const resumed = new Map<string, FranchiseEventEnvelope[]>();
  for (const e of input.resumeEvents ?? []) {
    const k = stampToString(e.at);
    resumed.set(k, [...(resumed.get(k) ?? []), e]);
  }
  // The games played on the current day, for its steps.
  let today: { game: ScheduledGame; result: GameResult; extras?: unknown }[] = [];
  const runSteps = () => {
    const day = world.calendar;
    const games = today;
    today = [];
    if (steps.length === 0) return;
    if (stepped && compareStamps(day, stepped) <= 0) {
      for (const e of resumed.get(stampToString(day)) ?? []) stepEmit(`${PLAYER_STEP_PREFIX}resumed`, e.event);
      return;
    }
    stepped = day;
    for (const step of steps) {
      const r = step.run(people!, { day, season, seed, rules, state, games });
      if (!r) continue;
      people = r.people;
      for (const event of r.events) stepEmit(step.id, event);
    }
  };
  const moveTo = (to: CalendarStamp) => {
    if (steps.length === 0) {
      const r = advance(world, to, { firstSeq: events.length });
      for (const envelope of r.events) record(envelope);
      world = r.world;
      return;
    }
    // Day by day, so each day's steps run after its games and before the clock moves on.
    while (compareStamps(world.calendar, to) < 0) {
      runSteps();
      const r = advance(world, nextDay(world.calendar, rules), { firstSeq: events.length });
      for (const envelope of r.events) record(envelope);
      world = r.world;
    }
  };

  emit({ type: "CALENDAR_PHASE_ENTERED", payload: { phase: world.calendar.phase } });

  const played = new Set<string>();
  const past = (at: CalendarStamp) => stopAfter !== undefined && compareStamps(at, stopAfter) > 0;
  const finish = (complete: boolean): SeasonRun => {
    const unused = [...saved.keys()].filter((id) => !played.has(id));
    if (unused.length > 0) throw new Error(`runSeason: the save has results this run did not reach (${unused.slice(0, 3).join(", ")})`);
    runSteps();
    if (complete && input.draft && input.through === "YEAR") {
      const turned = turnYear(people!, { season: season + 1, rules, ...(input.draft.cap ? { cap: input.draft.cap } : {}) });
      people = turned.people;
      for (const event of turned.events) emit(event);
    }
    return { state, calendar: world.calendar, events, complete, ...(people ? { people } : {}), ...(steps.length > 0 ? { stepEvents } : {}) };
  };
  const pending = () => [...state.schedule.games, ...(state.bracket?.games ?? [])]
    .filter((g) => !played.has(String(g.gameId)))
    .sort((a, b) => compareStamps(a.at, b.at) || String(a.gameId).localeCompare(String(b.gameId)));

  for (;;) {
    const queue = pending();
    if (queue.length === 0) {
      if (state.bracket?.champion !== undefined) break;
      if (state.bracket === undefined) {
        if (past({ season, phase: "PLAYOFFS", week: 1, day: 1 })) break;
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
    if (past(day)) break;
    moveTo(day);
    const results = [...state.results];
    for (const game of queue.filter((g) => sameDay(g.at, day))) {
      const { result, extras } = play(game, seed, resolve, saved, people);
      if (steps.length > 0) today.push({ game, result, ...(extras !== undefined ? { extras } : {}) });
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
  if (stopAfter && compareStamps(stopAfter, end) < 0) {
    moveTo(stopAfter);
    return finish(false);
  }
  moveTo(end);
  return finish(true);
}
