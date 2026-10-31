/**
 * ADR-089 step 3 — THE FREE-RUN CLOCK, D18 AND D22, AS A PURE FUNCTION (plan §2.2; ADR-089
 * §4.4.4, §4.4.5).
 *
 * A man nobody touched (D19) arrives by a physical clock: from where he stands at the snap (his
 * entry in ADR-090's snap picture), at his own Speed and Acceleration, to the depth of the
 * quarterback's drop. No die (ADR-005): the same inputs give the same time, bit for bit.
 *
 *   40 time       F    = fortyIntercept - fortySpeedSlope * Speed / fortySpeedScale   (5.6 - 1.38 S / 99)
 *   start         tau  = clamp(tauIntercept - tauSlope * (Acceleration - Speed), tauMin, tauMax)
 *   top speed     vmax = fortyYards / (F - tau * (1 - e^(-F / tau)))                 (closed form)
 *   distance      x(t) = vmax * t - (vmax - v0) * tau * (1 - e^(-t / tau))            (v0 0 unless moving)
 *   path          L    = sqrt((y + drop)^2 + |x - ballX|^2) - reach, times the bend if EDGE and not
 *                        looping; a looper first crosses |x_partner - x_own| + loopExtraYards, then
 *                        runs straight from the partner's spot
 *   time          ETA  = get-off (set, or moving) + DELAYED wait if delayed + T, x(T) = L, to 0.1 s
 *
 * OPERATION FOR OPERATION AS CALIBRATION'S `src/pocket/freeRun.ts` (step 0's M8 function; critique
 * 2 N2, critique 3 N2): the same expressions in the same order, the same bisection (200 halvings of
 * [0, 60]), the same `Math.max(0, ...)` on the straight leg and the same `Number(s.toFixed(1))`. The
 * engine does not import calibration and calibration does not import this (the surface pins stay
 * as they are); a shared table of about 30 cases, its unrounded seconds produced once by
 * calibration's `freeRunTime`, is pinned with `Object.is` in both packages' tests (R-6).
 *
 * A MOVING ENTRY (plan §2.2, R8). ADR-090 draws one moving man, the creeper, straight at the line
 * (`dx` 0, `dy` -1) at the filed 3 yd/s. That entry is the only one the clock times: v0 is then
 * `creeperYardsPerSecond` along his path (no projection onto it) with `movingGetOffSeconds`. Any
 * other moving entry is refused (`movingEntryProblem`, `FreeRunEntryError`): a configuration fault,
 * never a chance event. The caller refuses it first, with its own named error (plan §2.3).
 *
 * `distanceYards` is the whole path, the crossing leg included; `closingSpeed` is
 * `distanceYards / unroundedSeconds`, the trip's average speed from the snap, the get-off and any
 * DELAYED wait included (0 for a path of no yards). Engine-internal: nothing here is published
 * until petition P5 is in contracts (`PocketRules.threatGeometry`).
 */
import { getAttr } from "@ff/contracts";
import type { PlayerState } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import type { FreeRunTunables } from "../tunables.js";

/** A man's motion at the snap, as ADR-090's `PlayerSnapSpot.moving` gives it. */
export interface FreeRunMoving {
  readonly dx: number;
  readonly dy: number;
  readonly yardsPerSecond: number;
}

/** Where a man stands at the snap: x across from the ball (negative is the offense's left), y off the line (positive downfield). */
export interface FreeRunSpot {
  readonly x: number;
  readonly y: number;
  readonly moving?: FreeRunMoving;
}

export interface FreeRunRatings {
  readonly speed: number;
  readonly acceleration: number;
}

export interface FreeRunInput {
  /** His own published snap spot (for a looper: his own, the one he crosses from). */
  readonly spot: FreeRunSpot;
  /** The ball's x on the snap (ADR-090: 0 on every snap for now). */
  readonly ballX: number;
  /** The quarterback's drop, the card's `dropDepthYards` (D22). */
  readonly dropYards: number;
  /** His rush alignment is EDGE: the bend round the tackle (not for a looper). */
  readonly edge: boolean;
  /** A looper (§4.4.5): he crosses to his partner's spot, then runs from it. */
  readonly loop?: { readonly partnerSpot: { readonly x: number; readonly y: number } };
  readonly ratings: FreeRunRatings;
  /** A DELAYED blitz waits `delayedSeconds` (a linebacker or defensive back; the caller decides). */
  readonly delayed: boolean;
}

export interface FreeRunClock {
  /** The ETA, rounded to the tenth as every published `etaTick` is. */
  readonly etaSeconds: number;
  /** Get-off, any DELAYED wait and the run, before rounding. */
  readonly unroundedSeconds: number;
  /** The whole path in yards, the looper's crossing leg included. */
  readonly distanceYards: number;
  /** `distanceYards / unroundedSeconds`, yards a second from the snap (0 for no yards). */
  readonly closingSpeed: number;
}

/** A free runner's entry the clock cannot time (a moving entry other than the creeper's, a negative path). */
export class FreeRunEntryError extends Error {
  constructor(message: string) {
    super(`@ff/engine: ${message}`);
    this.name = "FreeRunEntryError";
  }
}

/** Step 1 of §4.4.4: the 40 time from Speed. */
export function fortySeconds(c: FreeRunTunables, speed: number): number {
  return c.fortyIntercept - (c.fortySpeedSlope * speed) / c.fortySpeedScale;
}

/** Step 2: the start, relative to Speed, clamped. */
export function tauSeconds(c: FreeRunTunables, r: FreeRunRatings): number {
  const raw = c.tauIntercept - c.tauSlope * (r.acceleration - r.speed);
  return Math.min(c.tauMax, Math.max(c.tauMin, raw));
}

/** Step 3: the top speed that runs the 40 in F seconds (closed form; vmax is linear in the 40). */
export function topSpeed(c: FreeRunTunables, r: FreeRunRatings): number {
  const f = fortySeconds(c, r.speed);
  const tau = tauSeconds(c, r);
  return c.fortyYards / (f - tau * (1 - Math.exp(-f / tau)));
}

/** Step 4: yards after t seconds of running, from v0 (0 unless already moving). */
export function distanceAfter(c: FreeRunTunables, t: number, r: FreeRunRatings, v0 = 0): number {
  const vmax = topSpeed(c, r);
  const tau = tauSeconds(c, r);
  return vmax * t - (vmax - v0) * tau * (1 - Math.exp(-t / tau));
}

/**
 * The running time T with x(T) = L. x is strictly increasing in t for v0 of 0 or more, so the
 * bisection converges to its one root: 200 halvings of [0, 60], as calibration's `secondsToCover`.
 */
export function secondsToCover(c: FreeRunTunables, yards: number, r: FreeRunRatings, v0 = 0): number {
  if (!(yards >= 0)) throw new FreeRunEntryError(`the free-run clock was handed a path of ${String(yards)} yards`);
  if (yards === 0) return 0;
  let lo = 0;
  let hi = 60;
  if (distanceAfter(c, hi, r, v0) < yards) throw new FreeRunEntryError(`a free-run path of ${String(yards)} yards is beyond a minute's run`);
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (distanceAfter(c, mid, r, v0) < yards) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Why a moving entry cannot be timed, or `undefined` when it is the creeper's: straight at the line
 * (`dx` 0, `dy` -1) at the filed `creeperYardsPerSecond` (plan §2.2, R8). The caller refuses any
 * other with its own named error before it times the man (plan §2.3).
 */
export function movingEntryProblem(c: FreeRunTunables, moving: FreeRunMoving): string | undefined {
  if (moving.dx !== 0 || moving.dy !== -1) {
    return `moves (${String(moving.dx)}, ${String(moving.dy)}), not straight at the line (0, -1)`;
  }
  if (moving.yardsPerSecond !== c.creeperYardsPerSecond) {
    return `moves at ${String(moving.yardsPerSecond)} yd/s, not the creeper's filed ${String(c.creeperYardsPerSecond)} yd/s`;
  }
  return undefined;
}

/** §4.4.5's path in yards: the straight leg from where he runs, the bend, and a looper's crossing leg. */
export function freeRunPathYards(c: FreeRunTunables, a: Pick<FreeRunInput, "spot" | "ballX" | "dropYards" | "edge" | "loop">): number {
  const from = a.loop === undefined ? a.spot : a.loop.partnerSpot;
  const width = Math.abs(from.x - a.ballX);
  const straight = Math.sqrt((from.y + a.dropYards) ** 2 + width ** 2) - c.pathShortenYards;
  const run = a.loop === undefined && a.edge ? straight * c.edgePathFactor : straight;
  const cross = a.loop === undefined ? undefined : Math.abs(a.loop.partnerSpot.x - a.spot.x) + c.loopExtraYards;
  return Math.max(0, run) + (cross ?? 0);
}

/** Rounded to the tenth, as `resolve/rushThreat.ts` rounds an ETA and calibration's `roundEta` does. */
export function roundFreeRunEta(seconds: number): number {
  return Number(seconds.toFixed(1));
}

/**
 * §4.4.5's time over a path of `yards`, before rounding: the get-off (`movingGetOffSeconds` for the
 * creeper, `getOffSeconds` for a set man), then any DELAYED wait, then the run, summed in that order
 * as calibration's `freeRunTime` sums them. A moving man starts at `creeperYardsPerSecond`.
 */
export function freeRunSecondsFor(c: FreeRunTunables, yards: number, ratings: FreeRunRatings, moving: boolean, delayed: boolean): number {
  const runSeconds = secondsToCover(c, yards, ratings, moving ? c.creeperYardsPerSecond : 0);
  return (moving ? c.movingGetOffSeconds : c.getOffSeconds) + (delayed ? c.delayedSeconds : 0) + runSeconds;
}

/** §4.4.5's time for one man nobody touched. Pure; no die. */
export function freeRunClock(c: FreeRunTunables, a: FreeRunInput): FreeRunClock {
  const moving = a.spot.moving;
  if (moving !== undefined) {
    const problem = movingEntryProblem(c, moving);
    if (problem !== undefined) throw new FreeRunEntryError(`the free-run clock cannot time a man who ${problem}`);
  }
  const distanceYards = freeRunPathYards(c, a);
  const unroundedSeconds = freeRunSecondsFor(c, distanceYards, a.ratings, moving !== undefined, a.delayed);
  return {
    etaSeconds: roundFreeRunEta(unroundedSeconds),
    unroundedSeconds,
    distanceYards,
    closingSpeed: distanceYards === 0 ? 0 : distanceYards / unroundedSeconds,
  };
}

/** Speed and Acceleration through the registry (Iron Rule 5; `contracts/src/registry.ts:63-64`). */
export function freeRunRatingsOf(player: PlayerState): FreeRunRatings {
  return { speed: getAttr(player.attributes.values, ATTR.speed), acceleration: getAttr(player.attributes.values, ATTR.acceleration) };
}
