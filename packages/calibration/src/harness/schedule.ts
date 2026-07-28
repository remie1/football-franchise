/**
 * SCHEDULES — `calibration.md` §3's `schedule: ScheduleSpec` ("real season replays or synthetic
 * round-robins"), and the per-week roster state a full-fidelity replay needs (§10.2).
 *
 * A fixture is a game to simulate: two teams, a week, and the roster each may field that week.
 * Both schedule kinds produce the same shape, so nothing downstream knows which it got — which
 * is what makes a synthetic-schedule batch and a real-replay batch comparable.
 *
 * ================== THE 2025 PROBLEM IS NOT SOLVED HERE ==================
 *
 * `CALIBRATION-BACKLOG.md` entry 20: nflverse replaced the weekly depth-chart format with a
 * daily snapshot carrying no week, so an availability-matched replay of 2025 has no depth
 * ordering. This module does not invent a snapshot-date → week mapping, and neither does the
 * ingestion layer. A 2025 replay is buildable — availability comes from weekly rosters, which
 * still key by week — and it runs with `depthTeam` null throughout, so slot ORDER falls back to
 * the league's own depth chart. That is stated in `RealReplaySpec.depthChartCoverage` rather
 * than being a silent difference between a 2024 replay and a 2025 one.
 */
import type { CalendarStamp, TeamId } from "@ff/contracts";
import type { DepthChart } from "@ff/playbook";
import type { PlayerWeekAvailability } from "../ingest/availability.js";
import { gamedayRoster } from "../ingest/availability.js";
import type { ScheduleRow } from "../ingest/sources/schedules.js";
import { buildGameSnapshot, fullStrength, type LeagueIndex, type WeekRoster } from "../league/snapshot.js";
import type { GameSnapshot } from "@ff/engine";

export interface GameFixture {
  readonly season: number;
  readonly week: number;
  readonly home: TeamId;
  readonly away: TeamId;
  readonly homeRoster: WeekRoster;
  readonly awayRoster: WeekRoster;
  /** 0 = the game as scheduled. Non-zero addresses a deliberate re-run (§ GameCoordinates). */
  readonly replay: number;
}

export interface BuiltFixture {
  readonly fixture: GameFixture;
  readonly snapshot: GameSnapshot;
  readonly homeDepthChart: DepthChart;
  readonly awayDepthChart: DepthChart;
  readonly at: CalendarStamp;
}

export type ScheduleSpec =
  | {
      readonly kind: "SYNTHETIC_ROUND_ROBIN";
      /** Every team plays every other team this many times. */
      readonly rounds: number;
      readonly season: number;
    }
  | {
      readonly kind: "SYNTHETIC_PAIR";
      /** One matchup repeated. The micro-scenario shape: maximum plays, minimum variables. */
      readonly home: TeamId;
      readonly away: TeamId;
      readonly games: number;
      readonly season: number;
    }
  | {
      readonly kind: "REAL_REPLAY";
      readonly season: number;
      /** nflverse schedule rows for the season, already filtered to the game type wanted. */
      readonly schedule: readonly ScheduleRow[];
      /**
       * Weekly availability. Omitted means every fixture runs at full strength, and the batch
       * report says so — §10.2 chose accuracy over convenience and a silently full-strength
       * replay would be the convenience.
       */
      readonly availability?: readonly PlayerWeekAvailability[];
      /** Map nflverse team abbreviations onto league team ids. Required: nothing can guess it. */
      readonly teamMap: Readonly<Record<string, TeamId>>;
    };

export class ScheduleError extends Error {
  constructor(message: string) {
    super(`@ff/calibration: schedule — ${message}`);
    this.name = "ScheduleError";
  }
}

/** Circle method: a round-robin where every team plays exactly once per round. */
function roundRobinPairs(teams: readonly TeamId[]): readonly (readonly [TeamId, TeamId])[][] {
  const list = [...teams];
  if (list.length % 2 === 1) list.push(undefined as unknown as TeamId);
  const n = list.length;
  const rounds: (readonly [TeamId, TeamId])[][] = [];
  for (let round = 0; round < n - 1; round++) {
    const pairs: (readonly [TeamId, TeamId])[] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a === undefined || b === undefined) continue;
      // Alternate home and away by round so home advantage does not accrue to one half.
      pairs.push(round % 2 === 0 ? [a, b] : [b, a]);
    }
    rounds.push(pairs);
    const fixed = list[0];
    const rotated = list.slice(1);
    const last = rotated.pop();
    if (fixed !== undefined && last !== undefined) {
      list.length = 0;
      list.push(fixed, last, ...rotated);
    }
  }
  return rounds;
}

export function buildFixtures(index: LeagueIndex, spec: ScheduleSpec): readonly GameFixture[] {
  switch (spec.kind) {
    case "SYNTHETIC_ROUND_ROBIN": {
      const teams = index.teamIds();
      const rounds = roundRobinPairs(teams);
      const fixtures: GameFixture[] = [];
      let week = 0;
      for (let r = 0; r < spec.rounds; r++) {
        for (const round of rounds) {
          week++;
          for (const [home, away] of round) {
            fixtures.push(fullStrengthFixture(index, spec.season, week, home, away));
          }
        }
      }
      return fixtures;
    }
    case "SYNTHETIC_PAIR": {
      const fixtures: GameFixture[] = [];
      for (let i = 0; i < spec.games; i++) {
        fixtures.push({
          ...fullStrengthFixture(index, spec.season, 1, spec.home, spec.away),
          // Same fixture, distinct games: `replay` is what `deriveGameId` uses to keep their
          // random streams apart without pretending they are different weeks.
          replay: i,
        });
      }
      return fixtures;
    }
    case "REAL_REPLAY": {
      const fixtures: GameFixture[] = [];
      for (const row of spec.schedule) {
        if (row.season !== spec.season) continue;
        const home = spec.teamMap[row.homeTeam];
        const away = spec.teamMap[row.awayTeam];
        if (home === undefined || away === undefined) {
          throw new ScheduleError(
            `no league team mapped for "${home === undefined ? row.homeTeam : row.awayTeam}" ` +
              `(game ${row.gameId}). A replay that silently skips a fixture produces a season ` +
              `with the wrong number of games and a win total nobody can compare.`,
          );
        }
        fixtures.push({
          season: row.season,
          week: row.week,
          home,
          away,
          homeRoster: rosterFor(index, spec, row.season, row.week, row.homeTeam, home),
          awayRoster: rosterFor(index, spec, row.season, row.week, row.awayTeam, away),
          replay: 0,
        });
      }
      if (fixtures.length === 0) {
        throw new ScheduleError(`no schedule rows for season ${spec.season}`);
      }
      return fixtures;
    }
  }
}

function fullStrengthFixture(
  index: LeagueIndex,
  season: number,
  week: number,
  home: TeamId,
  away: TeamId,
): GameFixture {
  const homeTeam = index.teams.get(String(home));
  const awayTeam = index.teams.get(String(away));
  if (homeTeam === undefined || awayTeam === undefined) {
    throw new ScheduleError(`team ${String(home)} or ${String(away)} is not in this league`);
  }
  return {
    season,
    week,
    home,
    away,
    homeRoster: fullStrength(homeTeam, season, week),
    awayRoster: fullStrength(awayTeam, season, week),
    replay: 0,
  };
}

/**
 * The availability-matched roster for one team-week.
 *
 * The join is by NAME between nflverse's roster rows and the league's players, which is only
 * sound once `@ff/attributes` produces a league whose player ids trace back to gsis ids. Until
 * then a real replay against a synthetic league has nobody to match, so the availability list is
 * used to decide HOW MANY are out rather than WHICH — and that is stated, loudly, rather than
 * quietly producing a full-strength roster that claims to be availability-matched.
 */
function rosterFor(
  index: LeagueIndex,
  spec: Extract<ScheduleSpec, { kind: "REAL_REPLAY" }>,
  season: number,
  week: number,
  nflverseTeam: string,
  team: TeamId,
): WeekRoster {
  const leagueTeam = index.teams.get(String(team));
  if (leagueTeam === undefined) throw new ScheduleError(`team ${String(team)} is not in this league`);
  if (spec.availability === undefined) return fullStrength(leagueTeam, season, week);

  const active = gamedayRoster(spec.availability, { season, week, team: nflverseTeam });
  const byId = new Map<string, string>();
  for (const player of index.league.league.players) {
    if (player.bio.displayName.length > 0) byId.set(player.bio.displayName.toLowerCase(), String(player.bio.id));
  }
  const available = new Set<string>();
  for (const row of active) {
    const matched = byId.get(row.playerName.toLowerCase());
    if (matched !== undefined) available.add(matched);
  }
  if (available.size === 0) {
    throw new ScheduleError(
      `availability-matched replay of ${nflverseTeam} ${season} week ${week} matched NONE of ` +
        `${active.length} active players to league ${index.league.id} (provenance ` +
        `${index.league.provenance}). A synthetic league has no real names to join on, so an ` +
        `availability-matched replay against it is not a thing that exists. Either supply a ` +
        `DERIVED league or drop \`availability\` and accept — visibly — a full-strength replay.`,
    );
  }
  return {
    team,
    season,
    week,
    available,
    source: "REAL_AVAILABILITY",
    unavailableCount: leagueTeam.roster.length - available.size,
  };
}

/** Materialise a fixture into the engine's per-game snapshot plus the two depth charts. */
export function buildFixture(index: LeagueIndex, fixture: GameFixture): BuiltFixture {
  const at: CalendarStamp = {
    season: fixture.season,
    phase: "REGULAR_SEASON",
    week: fixture.week,
    day: 1,
  };
  const built = buildGameSnapshot(index, at, fixture.homeRoster, fixture.awayRoster);
  return {
    fixture,
    snapshot: built.snapshot,
    homeDepthChart: built.homeDepthChart,
    awayDepthChart: built.awayDepthChart,
    at,
  };
}
