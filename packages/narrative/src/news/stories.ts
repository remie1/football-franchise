/**
 * What a story is before it runs, and the lines that decide when one fires (ADR-082).
 *
 * The lines are fixed in football terms (owner's Q3): 28 is four touchdowns whatever this
 * league happens to score, so a rout today fires too often and will read right once scoring is
 * tuned. None of them is derived from the sim's numbers.
 */
import type { GameId, TeamId } from "@ff/contracts";
import type { Facts } from "./words.js";

export type Importance = 1 | 2 | 3 | 4 | 5;

/** A story a rule offers. The edition decides which run (ADR-082 "The desk", 2). */
export interface Candidate {
  readonly kind: string;
  readonly importance: Importance;
  readonly teams: readonly TeamId[];
  readonly games: readonly GameId[];
  readonly facts: Facts;
  /** A variant of the kind with lines of its own ("SHOWDOWN.tied"). */
  readonly flavor?: string;
  /** Runs whatever the weekly cap, as every playoff game does (owner's Q4). */
  readonly always?: boolean;
}

export const LINES = {
  /** Won by this much or more: four touchdowns. */
  rout: 28,
  /** Won by this much or less, in regulation: a field goal. */
  close: 3,
  /** The winner trailed by this much after some quarter: two scores. */
  comeback: 14,
  bigComeback: 21,
  /** Both teams together scored this much or more. */
  shootout: 70,
  /** The loser's win share before kickoff was this much higher (6-2 against 2-6 is .500). */
  upsetGap: 0.4,
  /** Each team has played this many games before an upset counts. */
  upsetMinGames: 4,
  /** A win or losing streak is news from this long. */
  streak: 4,
  /** A win streak this long is news when it ends. */
  snapped: 5,
  lastUnbeatenFromWeek: 3,
  lastWinlessFromWeek: 4,
  newLeaderFromWeek: 4,
  showdownFromWeek: 8,
  /** A showdown's leader is at least .500: two winless teams sharing first is not a showdown. */
  showdownMinShare: 0.5,
} as const;

/**
 * Stories that can happen at most once a season. At equal importance they run ahead of the kinds
 * that come round every week: the last unbeaten team is rarer news than a sixth straight win.
 */
export const ONCE_A_SEASON: ReadonlySet<string> = new Set([
  "LAST_UNBEATEN", "UNBEATEN_FALLS", "LAST_WINLESS", "FIRST_WIN",
  "CLINCHED_DIVISION", "CLINCHED_PLAYOFFS", "ELIMINATED",
]);

/** At most this many stories of one kind in an edition, so a week isn't four routs. */
export const MAX_PER_KIND = 2;

/** Headlines a regular-season week keeps (owner's Q4). */
export const DEFAULT_PER_WEEK = 4;

const GAME = [
  "winner", "loser", "winnerCity", "loserCity", "score", "margin", "total", "deficit",
  "winnerRecord", "loserRecord", "winnerRecordBefore", "loserRecordBefore",
] as const;
const ONE_TEAM = ["team", "teamCity", "record"] as const;
const TWO_TEAMS = [...ONE_TEAM, "opponent", "opponentCity", "opponentRecord", "score"] as const;
const STREAK = [...TWO_TEAMS, "count", "countWord", "nth"] as const;
const FIXTURE = ["home", "away", "homeCity", "awayCity", "homeRecord", "awayRecord", "division"] as const;
const RACE = [...ONE_TEAM, "division", "conference"] as const;
const PLAYOFF = [
  "winner", "loser", "winnerCity", "loserCity", "score", "margin", "deficit", "round", "conference",
  "winnerSeed", "loserSeed",
] as const;

/** The facts each story kind provides; its headlines may use these placeholders and no others. */
export const STORY_FACTS: Readonly<Record<string, readonly string[]>> = {
  ROUT: GAME, SHUTOUT: GAME, NAIL_BITER: GAME, OVERTIME: GAME, COMEBACK: GAME,
  LATE_RALLY: GAME, UPSET: GAME, SHOOTOUT: GAME,
  TIE: TWO_TEAMS,
  WIN_STREAK: STREAK, LOSING_STREAK: STREAK, STREAK_SNAPPED: STREAK,
  LAST_UNBEATEN: ONE_TEAM, LAST_WINLESS: ONE_TEAM,
  UNBEATEN_FALLS: [...TWO_TEAMS, "recordBefore"],
  FIRST_WIN: TWO_TEAMS,
  NEW_LEADER: [...ONE_TEAM, "division"],
  SHOWDOWN: FIXTURE,
  // Step 2: the race, the playoffs, the review.
  CLINCHED_DIVISION: RACE, CLINCHED_PLAYOFFS: RACE, ELIMINATED: RACE,
  PLAYOFF_FIELD: [...ONE_TEAM, "conference", "count"],
  PLAYOFF_WIN: PLAYOFF, CONFERENCE_TITLE: PLAYOFF, CHAMPIONSHIP: PLAYOFF,
  BEST_RECORD: ["teams", "count", "record"], WORST_RECORD: ["teams", "count", "record"],
  LONGEST_WIN_STREAK: ["teams", "count", "length"], LONGEST_LOSING_STREAK: ["teams", "count", "length"],
  TOP_OFFENSE: ["teams", "count", "points"], TOP_DEFENSE: ["teams", "count", "points"],
  CHAMPION_PATH: [...ONE_TEAM, "path", "wins"],
};
