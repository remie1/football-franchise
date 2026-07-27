/** §9.2 route development timing and §8.7 openness drift while the QB holds. */
import { clamp } from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type { RouteDepthClass } from "../types.js";

export type RoutePhase = "JAMMED" | "DEVELOPING" | "OPEN" | "DECAYING";

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

export function routePhaseAt(
  tick: number,
  readySeconds: number,
  jamDelaySeconds: number,
): RoutePhase {
  if (jamDelaySeconds > 0 && tick < TUNABLES.clock.firstTick + jamDelaySeconds) return "JAMMED";
  if (tick < readySeconds) return "DEVELOPING";
  if (tick > TUNABLES.route.decayStartsAtSeconds) return "DECAYING";
  return "OPEN";
}
