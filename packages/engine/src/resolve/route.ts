/** §9.2 route development timing and §8.7 openness drift while the QB holds. */
import type { RoutePhase } from "@ff/contracts";
import { clamp } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { ContestPosition, RouteDepthClass } from "../types.js";

/**
 * `RoutePhase` is contracts' (ADR-013) — it rides on `ROUTE_STATUS.phase`, and
 * the local copy this module used to declare was a subset waiting to happen.
 * Re-exported so existing `from "./route.js"` imports are undisturbed.
 *
 * `SCRAMBLE_DRILL` (ADR-007) is not produced by `routePhaseAt` — it is not a
 * point on the route's own timeline. It is what a receiver is doing once the
 * quarterback has left the pocket (§8.8): the play has changed shape, he has
 * abandoned the route that was called, and coverage has stopped closing on him.
 *
 * `SETTLED` (ADR-009) is the zone counterpart: a receiver who beat a zone and
 * SAT DOWN in the window is not running away from anybody, so neither `OPEN`
 * ("the route has broken and is still running") nor `DECAYING` ("coverage is
 * closing") describes him — and `zoneCoverage.settledDecayPerTick` means the
 * second is literally false.
 */
export type { RoutePhase };

/** Base development time plus any jam delay from the release battle. */
export function routeReadySeconds(
  tunables: Tunables,
  depthClass: RouteDepthClass,
  delaySeconds: number,
): number {
  return tunables.route.readySeconds[depthClass] + delaySeconds;
}

/**
 * §8.7's GAIN, ACCUMULATED OVER `steps` TICKS SINCE THE BREAK, CONDITIONED ON THE
 * REP THAT PRODUCED THE BREAK (ADR-048).
 *
 * Two phases, because *separation is created at the break and then defended*:
 * the first `burstSteps` carry the burst rate, everything after carries the
 * steady rate. Both rates are multiples of §8.7's own `opennessGainPerTick`; the
 * ladder and the two rejections that produced it are in `tunables.route`.
 *
 * `steps` is deliberately a real number rather than an integer: a caller may ask
 * about a tick that is not on the route's own grid (a jam delay puts a break at
 * 1.5 s while a read happens at 1.6 s in a future caller), and the split has to
 * behave sensibly there rather than depending on nobody doing it.
 *
 * ⚠ MONOTONE IN `steps` ONLY FOR A NON-NEGATIVE RATE. `IN_FRONT` descends, on
 *   purpose — that is *"the defender may close"* — and its floor is
 *   `route.minOpenness`, which is where the two lost-rep rows eventually meet.
 *   See `test/opennessContestConditioning.test.ts`, which measures the tick that
 *   happens at rather than assuming it does not.
 */
export function opennessGainOverSteps(
  tunables: Tunables,
  contest: ContestPosition,
  steps: number,
): number {
  const t = tunables.route;
  const unit = t.opennessGainPerTick;
  const rates = t.contestGain.byContest[contest];
  const n = Math.max(0, steps);
  const burstSteps = Math.min(n, t.contestGain.burstSteps);
  const steadySteps = n - burstSteps;
  return unit * rates.burst * burstSteps + unit * rates.steady * steadySteps;
}

/**
 * Openness at time `tick` for a route that broke open at `readySeconds` with
 * `baseOpenness`: routes keep improving until the decay point, then coverage
 * closes on them (§8.7).
 *
 * `contest` is REQUIRED and never defaulted (ADR-048). A default would mean a
 * call site that forgot the rep silently got somebody else's gain curve, and the
 * whole point of the ruling is that the rep is not ignorable — same reasoning as
 * `ManCoverageArgs.tunables`: a missed call site must be a compile error.
 */
export function opennessAt(
  tunables: Tunables,
  baseOpenness: number,
  readySeconds: number,
  tick: number,
  contest: ContestPosition,
): number {
  const t = tunables.route;
  const step = tunables.clock.tickStepSeconds;
  const growthEnd = Math.min(tick, t.decayStartsAtSeconds);
  const gainSteps = Math.max(0, (growthEnd - readySeconds) / step);
  const decaySteps = Math.max(0, (tick - t.decayStartsAtSeconds) / step);
  const raw =
    baseOpenness +
    opennessGainOverSteps(tunables, contest, gainSteps) -
    t.opennessDecayPerTick * decaySteps;
  return Math.round(clamp(raw, t.minOpenness, t.maxOpenness));
}

/**
 * `settled` is the §9.4 rep's own answer (`ZoneCoverageOutcome.settled`), not an
 * inference: a receiver who found the soft spot reports SETTLED from the moment
 * he gets there, and never DECAYING, because nothing is decaying.
 */
export function routePhaseAt(
  tunables: Tunables,
  tick: number,
  readySeconds: number,
  jamDelaySeconds: number,
  settled = false,
): Exclude<RoutePhase, "SCRAMBLE_DRILL"> {
  if (jamDelaySeconds > 0 && tick < tunables.clock.firstTick + jamDelaySeconds) return "JAMMED";
  if (tick < readySeconds) return "DEVELOPING";
  if (settled) return "SETTLED";
  if (tick > tunables.route.decayStartsAtSeconds) return "DECAYING";
  return "OPEN";
}
