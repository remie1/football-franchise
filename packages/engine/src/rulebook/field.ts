/**
 * THE FRAME (ADR-093 step 0): the field's numbers and the little arithmetic every enforcement uses.
 * The rulebook's numbers are constants here, not dials: a series is 10 yards, a personal foul 15,
 * the runoff 10 seconds.
 *
 * Everything is in Team A's frame (A snapped the down; 3-35-2): A's end zone is `y <= 0`, B's is
 * `y >= 100` (3-11-3, the goal line is in the end zone). Fractions are kept exactly.
 */
import type { Team, YardLine } from "./types.js";

/** Yards from one goal line to the other (3-11-1). */
export const FIELD_LENGTH = 100;
/** A's goal line in A's frame (3-11-3). */
export const GOAL_LINE_A = 0;
/** B's goal line in A's frame (3-11-3). */
export const GOAL_LINE_B = 100;
/** Yards to gain for a new series (3-8-3). */
export const YARDS_TO_GAIN = 10;
/** The yards of a personal foul (12-2, 12-3). */
export const PERSONAL_FOUL_YARDS = 15;
/** The runoff of a time-saving foul by the offense (4-7-1, 4-7-2). */
export const RUNOFF_SECONDS = 10;
/** After a touchback the ball comes out to the 20 (14-2-2 bullet 1, 11-6-3). */
export const TOUCHBACK_YARD_LINE = 20;
/** The touchback spot in A's frame: B's 20. */
export const TOUCHBACK_SPOT_A: YardLine = FIELD_LENGTH - TOUCHBACK_YARD_LINE;
/** The lowest and highest spot an input may name (a foul or a dead ball a little into an end zone). */
export const SPOT_MIN = -10;
export const SPOT_MAX = 110;
/** A's frame: a snap on or outside the defense's 2 (8-5 Penalty): the ball is placed at the 1. */
export const DPI_OUTSIDE_TWO_LIMIT = 98;
/** Where defensive pass interference in the end zone puts the ball when snapped on or outside the 2 (A's frame). */
export const DPI_ONE_YARD_LINE = 99;
/** A's seconds of time-out of the clock: the last five minutes of the second half (4-3-2). */
export const LAST_FIVE_MINUTES = 300;
/** The two-minute warning's mark in seconds (4-7-1, 7-4-4). */
export const TWO_MINUTES = 120;
/** The last 40 seconds of a half (4-7-3). */
export const LAST_FORTY_SECONDS = 40;

/** Flips a yard line into the other team's frame (3-35-2). */
export function flip(y: YardLine): YardLine {
  return FIELD_LENGTH - y;
}

/** The team that is not `t`. */
export function other(t: Team): Team {
  return t === "A" ? "B" : "A";
}

/** The line to gain of a new series snapped at `spot` (3-8-3): 10 yards, or the goal line when nearer. */
export function newLine(spot: YardLine): YardLine {
  return Math.min(GOAL_LINE_B, spot + YARDS_TO_GAIN);
}

/** One distance penalty marked off, after half the distance (14-2-1). */
export interface Moved {
  /** Where the ball stands, A's frame. */
  readonly to: YardLine;
  /** True when 14-2-1 cut the yards (the yards were more than half the distance; exactly half is not more). */
  readonly halved: boolean;
}

/**
 * Marks `yards` against `against` from `from` (14-2-1): the offender's goal line is A's for team A,
 * B's for team B; a distance of more than half to that goal line is cut to half of it. Exact: a
 * half yard stays a half yard.
 */
export function moveAgainst(against: Team, from: YardLine, yards: number): Moved {
  const distance = against === "A" ? from - GOAL_LINE_A : GOAL_LINE_B - from;
  const half = distance / 2;
  const halved = yards > half;
  const used = halved ? half : yards;
  return { to: against === "A" ? from - used : from + used, halved };
}
