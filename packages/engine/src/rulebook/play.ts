/**
 * THE PLAY'S OWN RESULT (ADR-093 step 0): where the ball and the series stand when
 * a down ends with no flag, in A's frame, and the conversion of that internal state into the
 * public `DownResult`.
 */
import { FIELD_LENGTH, GOAL_LINE_A, GOAL_LINE_B, TOUCHBACK_SPOT_A, flip, newLine } from "./field.js";
import type { ClockResult, DownResult, PlayCounts, RulebookDown, RulebookPlay, Team, YardLine } from "./types.js";

/** The ball after a down, A's frame throughout. */
export type Ball =
  /** A snaps next. `fresh`: a new series (first and 10, or goal to go; first and less after the defense's dead-ball delay, 14-1-2 Item 5 Exceptions). */
  | { readonly k: "A"; readonly spot: YardLine; readonly down: 1 | 2 | 3 | 4; readonly line: YardLine; readonly fresh: boolean }
  /** B snaps next, first and 10, at `spot` (A's frame). */
  | { readonly k: "B"; readonly spot: YardLine; readonly cause: "INTERCEPTION" | "DOWNS"; readonly endSpotA: YardLine }
  | { readonly k: "TD"; readonly by: Team }
  | { readonly k: "SAFETY"; readonly by: Team };

/** A first down for A at `spot`: first and 10 (or goal to go). */
export function freshA(spot: YardLine): Ball {
  return { k: "A", spot, down: 1, line: newLine(spot), fresh: true };
}

/** The dead-ball spot of a play (3-12-1, 8-1-4): a run's or a catch's or an interception's end, else the previous spot. */
export function deadBallOf(down: RulebookDown, play: RulebookPlay): YardLine {
  if (play.kind === "RUN") return play.deadBallSpot;
  if (play.kind === "PASS" && play.outcome.result !== "INCOMPLETE") return play.outcome.deadBallSpot;
  return down.snapSpot;
}

/** Where A stands after a dead ball at `d` that ends in the field with A holding the ball (3-8-2, 3-35-3). */
export function advanceA(down: RulebookDown, d: YardLine): Ball {
  if (d >= GOAL_LINE_B) return { k: "TD", by: "A" };
  if (d <= GOAL_LINE_A) return { k: "SAFETY", by: "B" };
  if (d >= down.lineToGain) return freshA(d);
  if (down.down < 4) return { k: "A", spot: d, down: (down.down + 1) as 1 | 2 | 3 | 4, line: down.lineToGain, fresh: false };
  return { k: "B", spot: d, cause: "DOWNS", endSpotA: d };
}

/** The play's own result with no flags. */
export function playBall(down: RulebookDown, play: RulebookPlay): Ball {
  switch (play.kind) {
    case "NO_PLAY":
      return { k: "A", spot: down.snapSpot, down: down.down, line: down.lineToGain, fresh: false };
    case "RUN":
      return advanceA(down, play.deadBallSpot);
    case "PASS": {
      const o = play.outcome;
      if (o.result === "COMPLETE") return advanceA(down, o.deadBallSpot);
      if (o.result === "INCOMPLETE") {
        if (down.down < 4) return { k: "A", spot: down.snapSpot, down: (down.down + 1) as 1 | 2 | 3 | 4, line: down.lineToGain, fresh: false };
        return { k: "B", spot: down.snapSpot, cause: "DOWNS", endSpotA: down.snapSpot };
      }
      const d = o.deadBallSpot;
      if (d <= GOAL_LINE_A) return { k: "TD", by: "B" };
      if (d >= GOAL_LINE_B) return { k: "B", spot: TOUCHBACK_SPOT_A, cause: "INTERCEPTION", endSpotA: d };
      return { k: "B", spot: d, cause: "INTERCEPTION", endSpotA: d };
    }
  }
}

/** The ball's next-snap team, or null on a score. */
export function nextTeam(b: Ball): Team | null {
  if (b.k === "A") return "A";
  if (b.k === "B") return "B";
  return null;
}

/** Turns an internal ball into the public result. */
export function toResult(b: Ball, playCounts: PlayCounts, clock?: ClockResult): DownResult {
  const c = clock === undefined ? {} : { clock };
  switch (b.k) {
    case "A":
      return {
        kind: "NEXT_SNAP",
        next: { team: "A", ballOn: b.spot, down: b.down, lineToGain: b.line, distance: b.line - b.spot },
        end: b.fresh ? { kind: "FIRST_DOWN" } : { kind: "SAME_SERIES" },
        playCounts,
        ...c,
      };
    case "B": {
      const ballOn = flip(b.spot);
      const line = newLine(ballOn);
      return {
        kind: "NEXT_SNAP",
        next: { team: "B", ballOn, down: 1, lineToGain: line, distance: line - ballOn },
        end: { kind: "CHANGE_OF_POSSESSION", cause: b.cause, endSpotA: b.endSpotA },
        playCounts,
        ...c,
      };
    }
    case "TD":
      return { kind: "SCORE", score: "TOUCHDOWN", by: b.by, playCounts, ...c };
    case "SAFETY":
      return { kind: "SCORE", score: "SAFETY", by: b.by, playCounts, ...c };
  }
}

/** True when two results are the same in everything but `playCounts` (for dropping an accept that equals the decline). */
export function sameOutcome(a: DownResult, b: DownResult): boolean {
  const strip = (r: DownResult) => JSON.stringify({ ...r, playCounts: undefined });
  return strip(a) === strip(b);
}

/** Field length re-exported for the callers that check a spot is inside. */
export const FIELD = FIELD_LENGTH;
