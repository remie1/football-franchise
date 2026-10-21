/**
 * S6 — the playoffs (season shell plan; ADR-078 C5).
 *
 * The NFL format (2020-): each conference sends `playoffTeamsPerConference` clubs, seeded by
 * `rankConference` (division winners 1-4, wild cards after). Seeds that make the field a power of
 * two skip the first round (seed 1 with 7 clubs). Every round re-seeds: the best surviving seed
 * hosts the worst, the next best the next worst. The conference winners meet in the championship
 * at a neutral site, after a week off.
 *
 * Weeks are PLAYOFFS weeks: round 1 in week 1, round 2 in week 2, ..., the championship two weeks
 * after the last conference round. Games are on GAME_DAY.
 */
import {
  DEFAULT_LEAGUE_RULES, gameId,
  type ConferenceId, type GameKind, type GameResult, type LeagueRules,
  type PlayoffBracket, type ScheduledGame, type TeamId,
} from "@ff/contracts";
import type { League } from "../league/buildLeague.js";
import { GAME_DAY } from "../schedule/buildSchedule.js";
import { rankConference, type StandingsOptions } from "../standings/computeStandings.js";
import { phaseWeeks } from "../calendar/clock.js";

/** Conference rounds, last first: the kind of the final round, the one before it, and so on. */
const CONFERENCE_ROUNDS_FROM_LAST: readonly GameKind[] = ["CONFERENCE_FINAL", "DIVISIONAL", "WILD_CARD"];

/** How many conference rounds a field of `n` clubs needs. */
export function conferenceRounds(n: number): number {
  if (!Number.isInteger(n) || n < 2) throw new Error(`playoffs: a conference field needs at least 2 clubs, got ${n}`);
  const rounds = Math.ceil(Math.log2(n));
  if (rounds > CONFERENCE_ROUNDS_FROM_LAST.length) {
    throw new Error(`playoffs: ${n} clubs per conference need ${rounds} rounds; at most ${CONFERENCE_ROUNDS_FROM_LAST.length} are named`);
  }
  return rounds;
}

/** The kind of conference round `r` (0-based) in a bracket of `rounds` rounds. */
export function roundKind(r: number, rounds: number): GameKind {
  return CONFERENCE_ROUNDS_FROM_LAST[rounds - 1 - r]!;
}

/** The PLAYOFFS week of conference round `r`, or of the championship when `r === rounds`. */
export function roundWeek(r: number, rounds: number): number {
  return r < rounds ? r + 1 : rounds + 2;
}

/** Pass regular-season results only. Returns the field with no games yet. */
export function seedPlayoffs(
  league: League, results: readonly GameResult[], season: number,
  rules: LeagueRules = DEFAULT_LEAGUE_RULES, opts: StandingsOptions = {},
): PlayoffBracket {
  const n = rules.playoffTeamsPerConference;
  const rounds = conferenceRounds(n);
  if (roundWeek(rounds, rounds) > phaseWeeks("PLAYOFFS", rules)) {
    throw new Error(`playoffs: the championship would fall after the last PLAYOFFS week`);
  }
  const seeds = league.structure.conferences.map((c) => {
    const ranked = rankConference(league, results, c.id, opts);
    if (ranked.length < n) throw new Error(`playoffs: conference ${c.id} has ${ranked.length} clubs, needs ${n}`);
    return { conference: c.id, teams: ranked.slice(0, n).map((r) => r.team) };
  });
  return { season, seeds, games: [] };
}

function winnerOf(r: GameResult): TeamId {
  if (r.homeScore === r.awayScore) throw new Error(`playoffs: game ${r.gameId} ended level; a playoff game needs a winner`);
  return r.homeScore > r.awayScore ? r.home : r.away;
}

function playoffGame(season: number, kind: GameKind, week: number, home: TeamId, away: TeamId): ScheduledGame {
  return {
    gameId: gameId(`S${season}-P-${kind}-${away}@${home}`),
    season,
    kind,
    at: { season, phase: "PLAYOFFS", week, day: GAME_DAY },
    home,
    away,
    neutralSite: kind === "CHAMPIONSHIP",
  };
}

/** Best seed hosts worst, next best the next worst. `alive` is in seed order. */
function pairUp(alive: readonly TeamId[]): [TeamId, TeamId][] {
  const pairs: [TeamId, TeamId][] = [];
  for (let i = 0, j = alive.length - 1; i < j; i++, j--) pairs.push([alive[i]!, alive[j]!]);
  return pairs;
}

/**
 * The bracket after `results`: if every game so far is decided and a round remains, the next
 * round's games are added; if the championship is decided, `champion` is set. Otherwise the
 * bracket comes back unchanged. Pure: call it after every playoff game day.
 */
export function advanceBracket(bracket: PlayoffBracket, results: readonly GameResult[]): PlayoffBracket {
  if (bracket.champion !== undefined) return bracket;
  const byGame = new Map(results.map((r) => [r.gameId, r]));
  if (bracket.games.some((g) => !byGame.has(g.gameId))) return bracket;

  const n = bracket.seeds[0]!.teams.length;
  const rounds = conferenceRounds(n);
  const kindsPlayed = new Set(bracket.games.map((g) => g.kind));

  const champGame = bracket.games.find((g) => g.kind === "CHAMPIONSHIP");
  if (champGame) return { ...bracket, champion: winnerOf(byGame.get(champGame.gameId)!) };

  const losers = new Set(bracket.games.map((g) => {
    const w = winnerOf(byGame.get(g.gameId)!);
    return w === g.home ? g.away : g.home;
  }));

  // Next conference round, or the championship once every conference has one club left.
  const r = [...Array(rounds).keys()].find((k) => !kindsPlayed.has(roundKind(k, rounds)));
  if (r === undefined) {
    const [a, b] = bracket.seeds.map((s) => s.teams.find((t) => !losers.has(t))!);
    if (a === undefined || b === undefined || bracket.seeds.length !== 2) {
      throw new Error(`playoffs: the championship needs exactly two conference winners`);
    }
    // Neutral site; the first-listed conference's winner is the nominal home side.
    const g = playoffGame(bracket.season, "CHAMPIONSHIP", roundWeek(rounds, rounds), a, b);
    return { ...bracket, games: [...bracket.games, g] };
  }

  const byes = 2 ** rounds - n;
  const kind = roundKind(r, rounds);
  const week = roundWeek(r, rounds);
  const added: ScheduledGame[] = [];
  for (const { teams } of bracket.seeds) {
    const alive = teams.filter((t, i) => !losers.has(t) && (r > 0 || i >= byes));
    for (const [home, away] of pairUp(alive)) added.push(playoffGame(bracket.season, kind, week, home, away));
  }
  return { ...bracket, games: [...bracket.games, ...added] };
}

/** The conference a playoff club belongs to in this bracket. */
export function seedOf(bracket: PlayoffBracket, team: TeamId): { conference: ConferenceId; seed: number } | undefined {
  for (const s of bracket.seeds) {
    const i = s.teams.indexOf(team);
    if (i >= 0) return { conference: s.conference, seed: i + 1 };
  }
  return undefined;
}
