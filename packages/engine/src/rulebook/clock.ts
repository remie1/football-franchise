/**
 * THE CLOCK (ADR-093 step 0): the runoff, the defense's time-saving fouls, the
 * untimed down, and how the game clock and the play clock start after a flag. Used only when the
 * down carries a clock.
 */
import { LAST_FIVE_MINUTES, LAST_FORTY_SECONDS, RUNOFF_SECONDS } from "./field.js";
import { FOUL_TABLE } from "./fouls.js";
import type { Ball } from "./play.js";
import { effectiveWhen, isDead } from "./enforce.js";
import type { ClockResult, RulebookClock, RulebookFlag } from "./types.js";

/** Periods that end a half or the game: the second, the fourth and overtime. */
export function isHalfEndPeriod(c: RulebookClock): boolean {
  return c.period === 2 || c.period === 4 || c.period === 5;
}

/** The period ran out in the down and it ends a half: an untimed down is possible (4-8-2). */
export function isHalfEnd(c: RulebookClock | undefined): boolean {
  return c !== undefined && c.expiredDuringDown && isHalfEndPeriod(c);
}

/**
 * Time is in for the flag (4-4, 4-7-1): a flag at the snap or during the play always; a flag before
 * the snap or after the play when the clock was running and no live-ball flag of the down (either
 * team's) stopped it at the down's end.
 */
function timeIn(c: RulebookClock, f: RulebookFlag, all: readonly RulebookFlag[]): boolean {
  const w = effectiveWhen(f);
  if (w === "AT_SNAP" || w === "DURING_PLAY") return true;
  if (c.withoutFlags !== "RUNNING") return false;
  if (w === "AFTER_PLAY") return !all.some((g) => !isDead(g));
  return true;
}

/**
 * A time-saving foul (4-7-1, 4-7-2): after the two-minute warning (second half, or the second
 * period), a before-the-snap or after-the-play flag with time in, by either team; or the
 * offense's intentional grounding or illegal forward pass.
 */
export function isTimeSaving(c: RulebookClock | undefined, f: RulebookFlag, all: readonly RulebookFlag[]): boolean {
  if (c === undefined || !c.afterTwoMinuteWarning || !isHalfEndPeriod(c)) return false;
  if (f.by === "A" && (f.kind === "INTENTIONAL_GROUNDING" || f.kind === "ILLEGAL_FORWARD_PASS")) return true;
  const w = effectiveWhen(f);
  return (w === "BEFORE_SNAP" || w === "AFTER_PLAY") && timeIn(c, f, all);
}

/**
 * B's time-saving foul in the last 40 seconds with B out of timeouts (4-7-3: "while time is in"). A
 * period that ran out during the down has no time in (3-36-3), so 4-7-3 does not apply.
 */
export function last40Refused(c: RulebookClock | undefined, flags: readonly RulebookFlag[]): boolean {
  if (c === undefined || c.expiredDuringDown || c.secondsLeft > LAST_FORTY_SECONDS || c.timeoutsLeft.B > 0) return false;
  return flags.some((f) => f.by === "B" && isTimeSaving(c, f, flags));
}

/** What an option does to the clock. */
export interface ClockPlan {
  /** The runoff is taken (4-7-1 Item 1). */
  readonly runoff: boolean;
  /** B's time-saving foul enforced: the clock on the ready signal or on the snap, play clock 40. */
  readonly bSaving: null | "READY" | "SNAP";
  /** No timed snap follows in this period. */
  readonly periodOver: boolean;
  /** The next snap is an untimed down. */
  readonly untimedDown: boolean;
  /** An offense's flag before the snap was thrown on the down. */
  readonly aBeforeSnap: boolean;
}

/** The plan for a flag nobody enforced: the period ends if time ran out; nothing else. */
export function plainPlan(c: RulebookClock, flags: readonly RulebookFlag[]): ClockPlan {
  return { runoff: false, bSaving: null, periodOver: c.expiredDuringDown, untimedDown: false, aBeforeSnap: aBefore(flags) };
}

/** True when team A threw a before-the-snap flag on the down. */
export function aBefore(flags: readonly RulebookFlag[]): boolean {
  return flags.some((f) => f.by === "A" && effectiveWhen(f) === "BEFORE_SNAP");
}

/**
 * Builds the clock after the down for a resulting ball and a plan (4-3-2, 4-4, 4-6-3, 4-7-1, 4-8-2).
 *
 * A runoff taken (4-7-1 Item 1: "officials will run off 10 seconds") takes 10 seconds off, never
 * below 0, ends the period when it reaches 0, and sets the play clock to 30 (4-7-1 Item 1: "reset
 * the play clock to 30 seconds"), whatever the enforcement gives, a score included. After a score the
 * game clock starts on the snap, as after any score, standing in for the try or the kick that
 * follows. The option that declines the runoff keeps the time, with `runoff` 0 and play clock 25.
 */
export function buildClock(c: RulebookClock, ball: Ball, plan: ClockPlan): ClockResult {
  const score = ball.k === "TD" || ball.k === "SAFETY";
  const takes = plan.runoff;
  const runoff = takes ? RUNOFF_SECONDS : 0;
  const secondsLeft = Math.max(0, c.secondsLeft - runoff);
  const periodOver = plan.periodOver || (takes && c.secondsLeft <= RUNOFF_SECONDS);
  const base = { secondsLeft, runoff: runoff as 0 | 10, periodOver, untimedDown: plan.untimedDown };
  if (score) return { ...base, gameClockStarts: "ON_SNAP", playClock: takes ? 30 : 25 };
  if (takes) return { ...base, gameClockStarts: "ON_READY", playClock: 30 };
  if (plan.bSaving !== null) {
    return { ...base, gameClockStarts: plan.bSaving === "SNAP" ? "ON_SNAP" : "ON_READY", playClock: 40 };
  }
  // After a period that ran out, or an untimed down, the clock starts on the snap in every period
  // (4-3-2; 3-36-1: the intermission is a timeout).
  const onSnap =
    plan.periodOver || plan.untimedDown ||
    c.withoutFlags === "ON_SNAP" ||
    (c.period === 2 && c.afterTwoMinuteWarning) ||
    ((c.period === 4 || c.period === 5) && c.secondsLeft <= LAST_FIVE_MINUTES) ||
    (plan.aBeforeSnap && (c.period === 4 || c.period === 5) && c.withoutFlags === "RUNNING") ||
    ball.k === "B";
  return { ...base, gameClockStarts: onSnap ? "ON_SNAP" : "ON_READY", playClock: 25 };
}

/** Whether a foul kind is personal (for the untimed-down rules). */
export function isPersonal(f: RulebookFlag): boolean {
  return FOUL_TABLE[f.kind].personal;
}
