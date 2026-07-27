/** §9.2 route development timing and §8.7 openness drift while the QB holds. */
import { clamp } from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type { RouteDepthClass } from "../types.js";

/**
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
export type RoutePhase =
  | "JAMMED"
  | "DEVELOPING"
  | "OPEN"
  | "SETTLED"
  | "DECAYING"
  | "SCRAMBLE_DRILL";

/** Base development time plus any jam delay from the release battle. */
export function routeReadySeconds(depthClass: RouteDepthClass, delaySeconds: number): number {
  return TUNABLES.route.readySeconds[depthClass] + delaySeconds;
}

/**
 * Openness at time `tick` for a route that broke open at `readySeconds` with
 * `baseOpenness`: routes keep improving until the decay point, then coverage
 * closes on them (§8.7).
 */
export function opennessAt(baseOpenness: number, readySeconds: number, tick: number): number {
  const t = TUNABLES.route;
  const step = TUNABLES.clock.tickStepSeconds;
  const growthEnd = Math.min(tick, t.decayStartsAtSeconds);
  const gainSteps = Math.max(0, (growthEnd - readySeconds) / step);
  const decaySteps = Math.max(0, (tick - t.decayStartsAtSeconds) / step);
  const raw = baseOpenness + t.opennessGainPerTick * gainSteps - t.opennessDecayPerTick * decaySteps;
  return Math.round(clamp(raw, t.minOpenness, t.maxOpenness));
}

/**
 * `settled` is the §9.4 rep's own answer (`ZoneCoverageOutcome.settled`), not an
 * inference: a receiver who found the soft spot reports SETTLED from the moment
 * he gets there, and never DECAYING, because nothing is decaying.
 */
export function routePhaseAt(
  tick: number,
  readySeconds: number,
  jamDelaySeconds: number,
  settled = false,
): Exclude<RoutePhase, "SCRAMBLE_DRILL"> {
  if (jamDelaySeconds > 0 && tick < TUNABLES.clock.firstTick + jamDelaySeconds) return "JAMMED";
  if (tick < readySeconds) return "DEVELOPING";
  if (settled) return "SETTLED";
  if (tick > TUNABLES.route.decayStartsAtSeconds) return "DECAYING";
  return "OPEN";
}
