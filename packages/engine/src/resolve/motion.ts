/**
 * ADR-089 step 4 — THE THROWING MOTION AND D21'S RACE (§4.4.6, §4.5; plan §2.1; `pocket-1` from
 * `pocket-1.s4` only).
 *
 * Pure: no die, no generator, no clock read. A throw decided at `t` leaves at `t + rho`,
 * `rho = rho0 - (release - 70) / rhoD` (rho0 0.3 s CHOSEN in §4.4.6, rhoD 400 CHOSEN by AM-7: rho
 * runs 0.475 s at release 0 to 0.2275 s at 99, 0.325 s at the flat league's 60). No floor: over the
 * rating scale it is never below 0, and `sim/pocketRules.ts` refuses a motion that would be, or that
 * would reach one tick step, so a throw never leaves its decision tick's release bin.
 *
 * The race (D21, filed at step 0, never chosen by a fit): a rusher not ARRIVED on the grid at the
 * decision tick hits him inside the motion when his continuous contact time is at most `t + rho`,
 * compared in whole milliseconds (`Math.round(x * 1000)`, so float noise never decides a boundary).
 * His contact time (`contactSecondsOf`):
 *  - a free runner: his free-run time in tenths, his `etaTick` as the clock set it (§4.4.6);
 *  - a won rep under shape S, and a late block under S: the breaking time (`T_j`, or the late beat's
 *    continuous `T`) plus his travel (AM-7's `D21.touched`);
 *  - a won rep under shape L, and a late block under L: the crossing time `T_L` plus his travel,
 *    `T_L = (t - s) + s (15 - m(t - s)) / (m(t) - m(t - s))` with `s` the tick step, clamped to
 *    `(t - s, t]`, and `m(0) = 0`;
 *  - the half-second reading (D14, information only) and kind T (today's clock, which has no
 *    breaking time): his published `etaTick`;
 *  and every DELAYED wait he has served adds its seconds. The continuous time orders nothing but
 * this race: with the ball still in his hand, contact resolves on the grid (`resolve/contact.ts`).
 *
 * Nothing here runs in a game until petitions P7 and P8 are in contracts (`sim/pocketRules.ts`).
 */
import type { PlayerId } from "@ff/contracts";
import type { MotionTunables } from "../tunables.js";
import type { RushAlignment } from "../types.js";
import { gridCompare } from "./contact.js";

/** The release rating at which the motion takes `rho0` (§4.5: `release - 70`). */
export const MOTION_RELEASE_PIVOT = 70;

/** The motion's length in seconds for a quarterback's `release` rating. */
export function rho(release: number, motion: Pick<MotionTunables, "rho0" | "rhoD">): number {
  return motion.rho0 - (release - MOTION_RELEASE_PIVOT) / motion.rhoD;
}

/** Seconds from the snap that the ball leaves his hand: the decision's tick plus the motion. */
export function releaseSeconds(decisionSeconds: number, release: number, motion: Pick<MotionTunables, "rho0" | "rhoD">): number {
  return decisionSeconds + rho(release, motion);
}

/** Seconds as whole milliseconds, the race's unit (plan §2.1). */
export function toMilliseconds(seconds: number): number {
  return Math.round(seconds * 1000);
}

/**
 * Shape L's crossing time (plan §2.1, critique 1 B4): the instant the gradual margin crossed the win
 * threshold, interpolated between the tick before the win and the win's tick, clamped to
 * `(tick - tickStep, tick]`. `previousMargin` is the margin at `tick - tickStep`; it may be left out
 * only on the clock's first tick (`tick - tickStep` is the snap), where it is `m(0) = 0`. An
 * interpolation that falls outside the interval, or cannot be taken (the margin did not rise), reads
 * the win's tick: no earlier crossing can be read from the two margins.
 */
export interface CrossingArgs {
  /** The tick the matchup reported its win (seconds from the snap). */
  readonly tick: number;
  readonly tickStepSeconds: number;
  /** The win threshold, `RUSHER_WINS_REP`'s minimum margin (15). */
  readonly threshold: number;
  /** m(t): the margin on the win's tick. */
  readonly margin: number;
  /** m(t - s): the margin on the tick before. */
  readonly previousMargin?: number;
}

export function crossingSeconds(args: CrossingArgs): number {
  const { tick, tickStepSeconds: s, threshold, margin } = args;
  const before = tick - s;
  let previous = args.previousMargin;
  if (previous === undefined) {
    if (before > 1e-9) {
      throw new Error(`@ff/engine: shape L's crossing time at ${String(tick)} s needs the margin at ${String(before)} s; only the clock's first tick reads m(0) = 0`);
    }
    previous = 0;
  }
  const rise = margin - previous;
  const crossed = before + (s * (threshold - previous)) / rise;
  if (!Number.isFinite(crossed) || crossed <= before || crossed > tick) return tick;
  return crossed;
}

/** How one rusher's contact time is read (D21), by what put him on the quarterback. */
export type ContactClock =
  /** A free runner on the free-run clock: his free-run time in tenths (his `etaTick` as the clock set it). */
  | { readonly kind: "FREE_RUN"; readonly etaTick: number }
  /** A won rep or a late block under shape S: the continuous breaking time plus his travel. */
  | { readonly kind: "BREAKING"; readonly breakingSeconds: number; readonly travelSeconds: number }
  /** A won rep or a late block under shape L: the crossing time plus his travel. */
  | ({ readonly kind: "CROSSING"; readonly travelSeconds: number } & CrossingArgs)
  /** The half-second reading (D14), and kind T's clock: his published `etaTick`. */
  | { readonly kind: "GRID"; readonly etaTick: number };

/** D21's contact time, with every DELAYED wait he has served (`delayedSeconds`, 0 or more) added. */
export function contactSecondsOf(clock: ContactClock, delayedSeconds: number): number {
  if (!(delayedSeconds >= 0) || !Number.isFinite(delayedSeconds)) {
    throw new Error(`@ff/engine: a contact time's DELAYED seconds must be a finite number, 0 or more, got ${String(delayedSeconds)}`);
  }
  switch (clock.kind) {
    case "FREE_RUN":
    case "GRID":
      return clock.etaTick + delayedSeconds;
    case "BREAKING":
      return clock.breakingSeconds + clock.travelSeconds + delayedSeconds;
    case "CROSSING":
      return crossingSeconds(clock) + clock.travelSeconds + delayedSeconds;
  }
}

/** One rusher in the motion's race. */
export interface RaceEntrant {
  readonly rusher: PlayerId;
  readonly alignment: RushAlignment;
  readonly etaTick: number;
  /** D21's contact time (`contactSecondsOf`). */
  readonly contactSeconds: number;
  /** ARRIVED on the grid at the decision tick: his hit is ARRIVAL, never THROWING. */
  readonly arrived: boolean;
}

/**
 * The one `QB_HIT` THROWING of a throw (plan §2.1, AM-7): among the rushers not ARRIVED at the
 * decision tick, those whose contact time is at most `decisionSeconds + rhoSeconds` in whole
 * milliseconds; the earliest, ties in the grid order. `undefined` when nobody reaches him.
 */
export function throwingHit<T extends RaceEntrant>(
  entrants: readonly T[],
  decisionSeconds: number,
  rhoSeconds: number,
  priority: RushAlignment,
): T | undefined {
  const leaves = toMilliseconds(decisionSeconds + rhoSeconds);
  let best: T | undefined;
  let bestMs = 0;
  for (const e of entrants) {
    if (e.arrived) continue;
    const ms = toMilliseconds(e.contactSeconds);
    if (ms > leaves) continue;
    if (best === undefined || ms < bestMs || (ms === bestMs && gridCompare(e, best, priority) < 0)) {
      best = e;
      bestMs = ms;
    }
  }
  return best;
}
