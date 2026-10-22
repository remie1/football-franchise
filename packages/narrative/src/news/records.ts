/**
 * Running team records, tallied from regular-season results (ADR-082).
 *
 * A tally, not standings: no tiebreaks. Where two teams share the best record the news says they
 * are tied for first, which is true whatever a tiebreak would later decide. Standings proper stay
 * franchise's (ADR-078 C5).
 */
import type { GameResult, TeamId } from "@ff/contracts";

export interface Streak {
  readonly result: "W" | "L" | "T";
  readonly length: number;
}

export interface TeamRecord {
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly pointsFor: number;
  readonly pointsAgainst: number;
  /** The current run. A tie is a run of its own, so it ends a win or losing streak. */
  readonly streak: Streak | null;
  readonly longestWinStreak: number;
  readonly longestLosingStreak: number;
}

export type Records = ReadonlyMap<string, TeamRecord>;

const EMPTY: TeamRecord = {
  wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0,
  streak: null, longestWinStreak: 0, longestLosingStreak: 0,
};

export function emptyRecords(teams: readonly TeamId[]): Records {
  return new Map(teams.map((t) => [String(t), EMPTY]));
}

export function recordOf(records: Records, team: TeamId): TeamRecord {
  return records.get(String(team)) ?? EMPTY;
}

export const played = (r: TeamRecord): number => r.wins + r.losses + r.ties;

/** Win share, a tie counting half a win; 0 before the first game. */
export const winShare = (r: TeamRecord): number => (played(r) === 0 ? 0 : (r.wins + r.ties / 2) / played(r));

/** "9-3", or "9-3-1" with a tie. */
export const recordText = (r: TeamRecord): string => `${r.wins}-${r.losses}${r.ties > 0 ? `-${r.ties}` : ""}`;

function after(r: TeamRecord, scored: number, allowed: number): TeamRecord {
  const result = scored > allowed ? "W" : scored < allowed ? "L" : "T";
  const length = r.streak?.result === result ? r.streak.length + 1 : 1;
  return {
    wins: r.wins + (result === "W" ? 1 : 0),
    losses: r.losses + (result === "L" ? 1 : 0),
    ties: r.ties + (result === "T" ? 1 : 0),
    pointsFor: r.pointsFor + scored,
    pointsAgainst: r.pointsAgainst + allowed,
    streak: { result, length },
    longestWinStreak: result === "W" ? Math.max(r.longestWinStreak, length) : r.longestWinStreak,
    longestLosingStreak: result === "L" ? Math.max(r.longestLosingStreak, length) : r.longestLosingStreak,
  };
}

/** The records after `results`, in order. The input is not changed. */
export function applyResults(records: Records, results: readonly GameResult[]): Records {
  const next = new Map(records);
  for (const g of results) {
    next.set(String(g.home), after(recordOf(next, g.home), g.homeScore, g.awayScore));
    next.set(String(g.away), after(recordOf(next, g.away), g.awayScore, g.homeScore));
  }
  return next;
}

/** Division leaders: every team sharing the best win share among those that have played. */
export function leadersOf(records: Records, teams: readonly TeamId[]): TeamId[] {
  const live = teams.filter((t) => played(recordOf(records, t)) > 0);
  if (live.length === 0) return [];
  const best = Math.max(...live.map((t) => winShare(recordOf(records, t))));
  return live.filter((t) => winShare(recordOf(records, t)) === best);
}

/** Games behind `leader`, the usual way: half the difference in wins plus half the difference in losses. */
export function gamesBehind(leader: TeamRecord, team: TeamRecord): number {
  return ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
}
