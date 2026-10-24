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
 *
 * Players (ADR-087 §10): with `players` switched on (development, injuries or both), franchise's
 * players' steps run in the walk, the season runs through the offseason (`through: "YEAR"`), and
 * the resolver plays each game with the league's people as they are that day: hurt players sit,
 * those playing hurt take the field with their penalties off this game's copies of their ratings,
 * and each result comes back with the who-played report (`participation.ts`). Teams that cannot
 * field a side sign from a pool of street free agents made at the start (`reservePool`). Both
 * switches off, nothing here changes: the same resolver, rosters and walk as before.
 */
import {
  clampRating, DEFAULT_LEAGUE_RULES, teamId,
  type CalendarStamp, type FranchiseEventEnvelope, type GameResult, type LeagueRules, type PlayerState, type ScheduledGame,
  type SeasonSchedule, type SeasonState, type StaffState, type Team, type TeamId,
} from "@ff/contracts";
import type { GameSummary } from "@ff/engine";
import { buildLeague, runSeason, type GameResolver, type League, type SeasonRun } from "@ff/franchise";
import type { CallerVersion } from "../caller/anticipate.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { runOneGame } from "../harness/runGame.js";
import { buildFixture, type GameFixture } from "../harness/schedule.js";
import { buildFlatLeague } from "../league/flat.js";
import type { AnyProvenancedLeague } from "../league/provenance.js";
import { fullStrength, indexLeague, type LeagueIndex, type WeekRoster } from "../league/snapshot.js";
import { buildGeneratedLeague, type GeneratedLeague } from "./generatedLeague.js";
import { unfilledPosition } from "./lineup.js";
import { participationFrom } from "./participation.js";
import { buildStandInLeague, type readStandInFile, type StandInLeague } from "./standInLeague.js";

/** The league's people as `runSeason` carries them (ADR-086 §2), read off the resolver's type. */
export type SeasonPeople = NonNullable<Parameters<GameResolver>[2]>;
/** The players' switches (ADR-087 §9). */
export interface PlayerSwitches {
  readonly development?: boolean;
  readonly injuries?: boolean;
}
const switchedOn = (s: PlayerSwitches | undefined): boolean => s?.development === true || s?.injuries === true;

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
    return resultOf(game, seed, observation.summary);
  };
}

function resultOf(game: ScheduledGame, seed: string, s: GameSummary): GameResult {
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
}

/** Fit to play this week: no injury, or one he plays through. Franchise's `isAvailable`, which calibration may not import. */
const canPlay = (p: PlayerState): boolean => p.condition.injury === undefined || p.condition.injury.playable;

/** A player playing hurt, for one game: his penalties taken off a copy of his ratings (ADR-087 §5.3). */
function asFielded(p: PlayerState): PlayerState {
  const penalty = p.condition.injury?.playable ? p.condition.injury.inGamePenalty : undefined;
  if (penalty === undefined) return p;
  const values = { ...p.attributes.values };
  for (const [attr, delta] of Object.entries(penalty)) {
    const was = values[attr];
    if (was !== undefined && delta !== undefined) values[attr] = clampRating(was + delta);
  }
  return { ...p, attributes: { ...p.attributes, values } };
}

/**
 * ADR-087 §10: the resolver for a season with the players' switches on. It plays each game with
 * the people `runSeason` hands it (their rosters, depth charts and ratings that day), sits players
 * who cannot play, fields the ones playing hurt with their penalties, and returns the who-played
 * report beside the result.
 */
export function peopleResolver(rated: AnyProvenancedLeague, opts: Omit<RealSimOptions, "rated"> = {}): GameResolver {
  const rules = opts.rules ?? DEFAULT_LEAGUE_RULES;
  return (game, seed, people) => {
    if (people === undefined) throw new Error("peopleResolver: the season hands its people to the resolver, and none came");
    const week = simWeek(game, rules);
    const teams = new Map(people.teams.map((t) => [String(t.id), t]));
    const players = new Map(people.players.map((p) => [String(p.bio.id), p]));
    const roster = (id: TeamId): WeekRoster => {
      const team = teams.get(String(id));
      if (team === undefined) throw new Error(`peopleResolver: team ${String(id)} is not in the season's people`);
      const available = new Set(team.roster.map(String).filter((pid) => { const p = players.get(pid); return p !== undefined && canPlay(p); }));
      return { team: team.id, season: game.season, week, available, source: "SEASON_AVAILABILITY", unavailableCount: team.roster.length - available.size };
    };
    const homeRoster = roster(game.home);
    const awayRoster = roster(game.away);
    const fielded = new Map(players);
    for (const r of [homeRoster, awayRoster]) for (const pid of r.available) fielded.set(pid, asFielded(players.get(pid)!));
    const index: LeagueIndex = { league: rated, teams, players: fielded, teamIds: () => people.teams.map((t) => t.id) };
    const built = buildFixture(index, { season: game.season, week, home: game.home, away: game.away, homeRoster, awayRoster, replay: 0 });
    const { observation } = runOneGame({
      built,
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      ...(opts.callerVersion === undefined ? {} : { callerVersion: opts.callerVersion }),
    });
    return { result: resultOf(game, seed, observation.summary), extras: { participation: participationFrom(observation.events, built.snapshot) } };
  };
}

/** How many reserve teams' worth of street free agents a season with the switches on starts with. */
export const RESERVE_TEAMS = 3;

/**
 * The street free agents a season with the players' switches on starts with (ADR-087 §10), until
 * the cap thread's pool fills `freeAgents`: `RESERVE_TEAMS` made-up squads from the world seed's own
 * reserve stream, less each position's best man where the squad has a backup behind him (backups,
 * not starters, are who is left unsigned in-season; a squad's lone kicker, punter or long snapper
 * stays, so the street has specialists). CHOSEN. Their ids (`p:FA1:…`) cannot meet the league's
 * (`p:T01:…`).
 */
export function reservePool(league: League, season: number, development: boolean): PlayerState[] {
  const stubs: Team[] = league.teams.slice(0, RESERVE_TEAMS).map((t, i) => ({ ...t, id: teamId(`FA${i + 1}`), roster: [], depthChart: {} }));
  const made = buildGeneratedLeague({ ...league, seed: `${league.seed}/free-agents`, teams: stubs }, { season, development });
  const best = new Set(made.league.teams.flatMap((t) => Object.values(t.depthChart).filter((ids) => (ids?.length ?? 0) > 1).map((ids) => String(ids![0]))));
  return made.league.players.filter((p) => !best.has(String(p.bio.id))).map(({ teamId: _team, ...p }) => p);
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
  /** ADR-087: growth and aging, injuries, or both. Absent or both off, the season is today's. */
  readonly players?: PlayerSwitches;
  /** With `players`: the coaches (their coordinators teach, their head coaches set the depth charts). */
  readonly staff?: readonly StaffState[];
  /**
   * With `players`, carrying on from a save (S1): the people as the save left them, the players'
   * steps' events up to its day, and that day, so no day's steps run twice.
   */
  readonly resume?: { readonly people: SeasonPeople; readonly events: readonly FranchiseEventEnvelope[]; readonly through: CalendarStamp };
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
  const switched = switchedOn(input.players);
  if (switched && rosters === "flat") throw new Error("runRealSeason: development and injuries need squads; the flat league has none");
  if (rosters === "standin" && input.players?.development === true) {
    throw new Error("runRealSeason: the stand-in league's players have no growth records yet (ADR-087 §2.5); development needs generated squads");
  }
  if (input.resume !== undefined && !switched) throw new Error("runRealSeason: carrying on a season's people needs the players' switches");
  let league: League = base;
  let rated: GeneratedLeague | StandInLeague | undefined;
  if (rosters === "generated") {
    rated = buildGeneratedLeague(base, {
      season,
      ...(input.teamStrengthSd === undefined ? {} : { teamStrengthSd: input.teamStrengthSd }),
      ...(switched && input.players?.development === true ? { development: true } : {}),
    });
    league = { ...base, teams: rated.league.teams };
  } else if (rosters === "standin") {
    if (input.standIn === undefined) throw new Error("runRealSeason: rosters \"standin\" needs the league file (standIn)");
    ({ league, rated } = buildStandInLeague(base, input.standIn));
  }
  const caller = input.callerVersion === undefined ? {} : { callerVersion: input.callerVersion };
  const common = {
    league, season, seed: input.seed, rules,
    ...(input.stopAfter ? { stopAfter: input.stopAfter } : {}),
    ...(input.resumeFrom ? { resumeFrom: input.resumeFrom } : {}),
    ...(input.onEvent ? { onEvent: input.onEvent } : {}),
  };
  if (!switched || rated === undefined) {
    const resolve = realSimResolver(league, { rules, ...caller, ...(rated === undefined ? {} : { rated }) });
    return { league, ...(rated === undefined ? {} : { rated }), run: runSeason({ ...common, resolve }) };
  }

  // ADR-087 §10: the players' steps in the walk, through the offseason.
  const squads = rated;
  const development = input.players?.development === true;
  const people: SeasonPeople = input.resume?.people ?? (() => {
    const pool = reservePool(base, season, development);
    return {
      teams: league.teams,
      players: [...squads.league.players, ...pool],
      picks: [],
      classes: [],
      freeAgents: pool.map((p) => p.bio.id),
      ...(input.staff ? { staff: [...input.staff] } : {}),
    };
  })();
  const run = runSeason({
    ...common,
    resolve: peopleResolver(squads, { rules, ...caller }),
    people,
    through: "YEAR",
    players: {
      development,
      injuries: input.players?.injuries === true,
      unfilled: (team, available, players) => unfilledPosition(squads, team, available, players),
    },
    ...(input.resume ? { resumeEvents: input.resume.events, stepsDoneThrough: input.resume.through } : {}),
  });
  return { league, rated, run };
}
