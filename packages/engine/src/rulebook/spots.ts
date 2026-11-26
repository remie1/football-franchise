/**
 * THE SPOT OF ENFORCEMENT for a flag during a running play (ADR-093 step 0):
 * the three-and-one method (14-3-5, 14-3-6).
 */
import { GOAL_LINE_B } from "./field.js";
import type { MarkedOffSpot, Team, YardLine } from "./types.js";

/** A spot of enforcement: its name, its yard line, and its citation. */
export interface Spot {
  readonly spot: MarkedOffSpot;
  readonly from: YardLine;
  readonly rule: string;
}

/**
 * The spot for a foul during a run (a handoff, a keeper, a scramble, a sack, a run after the
 * catch). `p`: the previous spot; `d`: the basic spot, the dead-ball spot (14-3-5 bullet 1);
 * `s`: the spot of the foul. The caller has settled a dead ball in an end zone first.
 *
 * B's foul: from the basic spot, or from the previous spot when the basic spot is behind the line.
 * A's foul: from the previous spot when the foul or the basic spot is behind the line; else the
 * spot of the foul when it is behind the basic spot, the basic spot when it is beyond it; the goal
 * line for a foul in B's end zone before A's touchdown.
 */
export function runSpot(by: Team, p: YardLine, d: YardLine, s: YardLine): Spot {
  if (by === "B") {
    return d >= p
      ? { spot: "BASIC_SPOT", from: d, rule: "14-3-6 Exception for fouls committed by the defense; 14-3-5 bullet 1" }
      : { spot: "PREVIOUS_SPOT", from: p, rule: "14-3-6 Exception for fouls committed by the defense" };
  }
  if (s >= GOAL_LINE_B && d >= GOAL_LINE_B) {
    return { spot: "GOAL_LINE", from: GOAL_LINE_B, rule: "14-3-6 Exceptions for fouls committed by the offense, bullet 4; 14-2-2 bullet 3" };
  }
  if (s < p || d < p) {
    return { spot: "PREVIOUS_SPOT", from: p, rule: "14-3-6 Exceptions for fouls committed by the offense, bullet 3" };
  }
  if (s < d) return { spot: "SPOT_OF_FOUL", from: s, rule: "14-3-6 Exceptions for fouls committed by the offense, bullet 1" };
  return { spot: "BASIC_SPOT", from: d, rule: "14-3-6 Exceptions for fouls committed by the offense, bullet 1; 14-3-5 bullet 1" };
}
