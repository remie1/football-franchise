/**
 * ADR-093 step 1 (§6.2, Q3): each week's crews. Every game of a week gets one crew, no crew works
 * two games, and no crew works a team it worked in the three weeks before (Q3, ruled: "no crew
 * working the same team twice in four weeks"), byes included. Playoff weeks count on from the
 * regular season's, so the rule runs from week 18 into the wild-card round. Each season starts
 * clean: the save keeps only this season's assignments (§16 A6).
 *
 * The rule can always be met. Each game's two teams played at most six games in the three weeks
 * before, so at most 6 of the 17 crews are barred from it; each crew worked at most three games, so
 * it is barred from at most 6 of this week's; and with at most 16 games a week Hall's condition
 * holds. A first-come pick can still paint itself into a corner (in about 4 weeks in 100 of a
 * simulated league, COMPUTED), so the week is a matching: the crews with the fewest games so far
 * come first, the week's own draw breaks their ties, and Kuhn's augmenting paths move an earlier
 * game to another of its crews when a later game needs the one it has.
 */
import {
  compareStamps, stampToString,
  type CalendarStamp, type LeagueRules, type OfficiatingCrew, type OfficiatingCrewId, type Rng, type ScheduledGame,
} from "@ff/contracts";
import { crewsProblem, officialsRng, type CrewAssignment } from "./crews.js";
import { CREW_RULES } from "./tables.js";

/**
 * The week number the four-week rule counts in: REGULAR_SEASON week w is w, PLAYOFFS week w is
 * rules.weeksPerSeason + w (as calibration numbers the engine's weeks). Any other phase has no games
 * the crews work, and no number.
 */
export function crewWeek(at: CalendarStamp, rules: LeagueRules): number | undefined {
  if (at.phase === "REGULAR_SEASON") return at.week;
  if (at.phase === "PLAYOFFS") return rules.weeksPerSeason + at.week;
  return undefined;
}

/** A week's own stream: the 17 draws that break the crews' ties that week. */
export const weekRng = (seed: string, season: number, week: number): Rng => officialsRng(seed, season).fork(`week/${week}`);

export interface AssignWeekInput {
  readonly crews: readonly OfficiatingCrew[];
  /**
   * Every game of one week, at least one; refused otherwise. An empty list is a caller's bug: a
   * week with no games (PLAYOFFS week 4, the week off before the final) is never drawn.
   */
  readonly games: readonly ScheduledGame[];
  /** This season's assignments before this week, with their games. */
  readonly earlier: readonly { readonly game: ScheduledGame; readonly crew: OfficiatingCrewId }[];
  readonly rules: LeagueRules;
  readonly rng: Rng;
}

const byCrewId = (a: OfficiatingCrew, b: OfficiatingCrew): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byGameDay = (a: ScheduledGame, b: ScheduledGame): number =>
  compareStamps(a.at, b.at) || (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0);

/**
 * One crew for each game of the week (§6.2), in the games' order by (day, game id). Pure: the same
 * crews, games and earlier assignments, in any order, and the same stream give the same crews. It
 * draws exactly one number a crew (17), in id order, whatever the matching does, so a week's draw
 * never moves another's.
 */
export function assignWeek(input: AssignWeekInput): CrewAssignment[] {
  const problem = crewsProblem(input.crews);
  if (problem !== undefined) throw new Error(`assignWeek: the crews are not a league's (${problem})`);
  if (input.games.length === 0) throw new Error("assignWeek: a week with no games has no crews to give");
  const crews = [...input.crews].sort(byCrewId);
  const games = [...input.games].sort(byGameDay);
  const first = games[0]!;
  const week = crewWeek(first.at, input.rules);
  if (week === undefined) throw new Error(`assignWeek: ${String(first.gameId)} is not in a week the crews work (${stampToString(first.at)})`);
  const stray = games.find((g) => crewWeek(g.at, input.rules) !== week);
  if (stray) throw new Error(`assignWeek: the games are from more than one week (${String(first.gameId)}, ${String(stray.gameId)})`);
  if (games.length > crews.length) throw new Error(`assignWeek: ${games.length} games and only ${crews.length} crews`);

  // Each crew's games this season before this week, and the teams it worked in the three weeks before.
  const worked = new Map(crews.map((c) => [String(c.id), 0]));
  const barred = new Map(crews.map((c) => [String(c.id), new Set<string>()]));
  for (const { game, crew } of input.earlier) {
    const w = crewWeek(game.at, input.rules);
    const id = String(crew);
    if (w === undefined || w >= week || !worked.has(id)) continue;
    worked.set(id, worked.get(id)! + 1);
    if (week - w < CREW_RULES.teamWeeks) barred.get(id)!.add(String(game.home)).add(String(game.away));
  }
  // One draw a crew, in id order, before anything depends on the matching.
  const key = new Map(crews.map((c) => [String(c.id), input.rng.next()]));
  const order = [...crews].sort((a, b) =>
    worked.get(String(a.id))! - worked.get(String(b.id))! || key.get(String(a.id))! - key.get(String(b.id))! || byCrewId(a, b));
  const allowed = (c: OfficiatingCrew, g: ScheduledGame): boolean => {
    const teams = barred.get(String(c.id))!;
    return !teams.has(String(g.home)) && !teams.has(String(g.away));
  };
  // The crews with the fewest games first; widen to the next crew only when they cannot cover the week.
  for (let m = games.length; m <= order.length; m++) {
    const crewOf = match(games, order.slice(0, m), allowed);
    if (crewOf) return games.map((g, i) => ({ game: g.gameId, crew: crewOf[i]!.id }));
  }
  // Unreachable while each team plays at most once a week (Hall's condition, above).
  throw new Error(`assignWeek: no crew for every game of week ${week}`);
}

/**
 * Kuhn's augmenting paths: each game in order tries the crews in order, and takes a crew another
 * game holds when that game can move to one of its other crews. The crew for each game, or
 * undefined when some game is left with none.
 */
function match(
  games: readonly ScheduledGame[], crews: readonly OfficiatingCrew[], allowed: (c: OfficiatingCrew, g: ScheduledGame) => boolean,
): OfficiatingCrew[] | undefined {
  const gameOf = new Map<number, number>();
  const place = (gi: number, seen: Set<number>): boolean => {
    for (let ci = 0; ci < crews.length; ci++) {
      if (seen.has(ci) || !allowed(crews[ci]!, games[gi]!)) continue;
      seen.add(ci);
      const held = gameOf.get(ci);
      if (held === undefined || place(held, seen)) {
        gameOf.set(ci, gi);
        return true;
      }
    }
    return false;
  };
  for (let gi = 0; gi < games.length; gi++) if (!place(gi, new Set())) return undefined;
  const crewOf: OfficiatingCrew[] = [];
  for (const [ci, gi] of gameOf) crewOf[gi] = crews[ci]!;
  return crewOf;
}
