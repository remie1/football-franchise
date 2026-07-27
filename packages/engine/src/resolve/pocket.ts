/**
 * §7.2 — pocket status.
 *
 * The doc states the status per rusher, per tick: "1+ rushers winning by 1-14"
 * is PRESSURE, "1+ rushers won (winning by 15+) previous tick" is COLLAPSING.
 * ONE won rep is sufficient — it is not a quantity that has to accumulate. That
 * rule is the floor: `pocketFloorFor(previousTickBands)`.
 *
 * On top of it each rusher carries a pressure counter fed by his band result,
 * which is what escalates a sustained rush past COLLAPSING to IMMEDIATE and
 * then to a SACK — a state the doc describes ("rusher in the QB's face") but
 * gives no single-tick trigger for. The counter can only make the status WORSE
 * than the floor, never better.
 *
 * The third input is the TIME-OF-ARRIVAL floor (`./rushThreat.ts`): how long
 * the nearest travelling rusher still needs. This is what separates COLLAPSING
 * from SACK — the doc's two states were previously the same instant.
 *
 * All inputs are read from the previous tick, which reproduces the doc's
 * one-tick lag ("pressure/hit next tick").
 */
import { TUNABLES } from "../tunables.js";
import type { PocketStatus } from "../types.js";
import type { PassRushBandLabel } from "./passRush.js";
import { pocketFloorFromArrival } from "./rushThreat.js";

export interface PressureUpdate {
  readonly pressureDelta: number;
  readonly resetsPressure: boolean;
}

export function advancePressure(current: number, update: PressureUpdate): number {
  if (update.resetsPressure) return 0;
  return Math.max(0, current + update.pressureDelta);
}

/** Ordering on the status ladder; higher is worse for the offense. */
export function pocketSeverity(status: PocketStatus): number {
  return TUNABLES.pocket.severity[status];
}

export function worsePocketStatus(a: PocketStatus, b: PocketStatus): PocketStatus {
  return pocketSeverity(b) > pocketSeverity(a) ? b : a;
}

/**
 * §7.2's single-rep rule. The worst floor any one rusher's previous-tick band
 * imposes — a matchup that held does not soften a matchup that was lost.
 */
export function pocketFloorFor(previousTickBands: readonly PassRushBandLabel[]): PocketStatus {
  let floor: PocketStatus = "CLEAN";
  for (const band of previousTickBands) {
    floor = worsePocketStatus(floor, TUNABLES.pocket.minimumStatusByBand[band]);
  }
  return floor;
}

/** Status implied by the accumulated pressure counter alone. */
export function pocketStatusFromPressure(highestPressure: number): PocketStatus {
  for (const threshold of TUNABLES.pocket.thresholds) {
    if (highestPressure >= threshold.minProgress) return threshold.label;
  }
  return "CLEAN";
}

/**
 * The status the QB actually plays under: the worst of the doc's per-rep floor,
 * the nearest threat's time of arrival, and the accumulated counter.
 *
 * `minTimeToArrival` is `undefined` when nobody is travelling — which is not the
 * same as "nobody won a rep this tick", because a threat outlives the rep that
 * created it until the blocker resets him or the quarterback moves.
 */
export function pocketStatusFor(
  highestPressure: number,
  previousTickBands: readonly PassRushBandLabel[] = [],
  minTimeToArrival?: number,
): PocketStatus {
  return [
    pocketStatusFromPressure(highestPressure),
    pocketFloorFor(previousTickBands),
    pocketFloorFromArrival(minTimeToArrival),
  ].reduce(worsePocketStatus, "CLEAN");
}

export function accuracyModifierFor(status: PocketStatus): number {
  return TUNABLES.pocket.accuracyModifier[status];
}

export function readCapacityDeltaFor(status: PocketStatus): number {
  return TUNABLES.pocket.readCapacityDelta[status];
}

export function forcesDecision(status: PocketStatus): boolean {
  const forcing: readonly string[] = TUNABLES.pocket.forcesDecision;
  return forcing.includes(status);
}

/** §7.2 — the QB is going down if he has no one to throw to under this status. */
export function sacksWithoutTarget(status: PocketStatus): boolean {
  const sacking: readonly string[] = TUNABLES.pocket.sackWhenNoTarget;
  return sacking.includes(status);
}
