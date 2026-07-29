/**
 * §7.2 — pocket status.
 *
 * A POCKET STATUS DESCRIBES THE SPACE THE PASSER IS WORKING IN. It is not a
 * countdown, it is not a play result, and after ADR-033 the ladder says so: the
 * four rungs are CLEAN, PRESSURE, COLLAPSING and IMMEDIATE, and `SACK` — which
 * describes the play having ENDED — is not one of them. See
 * `tunables.pocket.severity` for the ruling and the inversion it removes.
 *
 * The doc states the status per rusher, per tick: "1+ rushers won (winning by
 * 15+) previous tick" is COLLAPSING. ONE won rep is sufficient — it is not a
 * quantity that has to accumulate. That rule is the floor:
 * `pocketFloorFor(previousTickBands)`. §7.2's PRESSURE sentence ("winning by
 * 1-14") was overturned in July 2026 and now requires a beaten blocker or a won
 * rep inside the arrival horizon; the band table carries that, not this file.
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
import type { Tunables } from "../tunables.js";
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

/**
 * A RUNG OF THE LADDER — derived from `pocket.severity`, never restated.
 *
 * `@ff/contracts`' `PocketStatus` is still `CLEAN | PRESSURE | COLLAPSING |
 * IMMEDIATE | SACK`, and after ADR-033 the engine ranks only the first four.
 * That gap is a CONTRACT question and not the engine's to settle (Iron Rule 2),
 * so the engine narrows locally instead of widening the shared type: this alias
 * is the set of statuses the engine's own ladder declares, every engine function
 * that reads a status-keyed table takes it, and a rung is assignable to
 * `PocketStatus` so nothing at the event boundary changes.
 *
 * It is DERIVED rather than written out for the same reason `calibration`'s gate
 * derives its rungs: a hand-written copy is a second declaration of the ladder,
 * and the next rung to be added or removed would move one of them and not the
 * other.
 */
export type PocketStatusRung = keyof Tunables["pocket"]["severity"] & PocketStatus;

/** Ordering on the status ladder; higher is worse for the offense. */
export function pocketSeverity(tunables: Tunables, status: PocketStatusRung): number {
  return tunables.pocket.severity[status];
}

/**
 * The severity of a status READ BACK OUT OF THE EVENT STREAM, where the type is
 * contracts' wider union and the value could in principle be one the ladder does
 * not rank.
 *
 * It THROWS rather than defaulting, and the throw is the point: a status the
 * ladder cannot rank has no place on the ladder, and silently ranking it (at 0,
 * or at −1, or at the bottom) is how `SACK: 4` outranked `IMMEDIATE` for a month
 * without anything noticing. `packages/calibration`'s `severityOf` throws a
 * `RangeError` on the same condition; this is the engine-side mirror.
 */
export function pocketSeverityOfEmitted(tunables: Tunables, status: PocketStatus): number {
  const severity: Readonly<Record<string, number | undefined>> = tunables.pocket.severity;
  const rank = severity[status];
  if (rank === undefined) {
    throw new RangeError(
      `@ff/engine: "${status}" is not a rung of pocket.severity ` +
        `(have ${Object.keys(tunables.pocket.severity).join(", ")}). A pocket status describes ` +
        `the space the passer is working in; an outcome is not a rung of it (ADR-033).`,
    );
  }
  return rank;
}

export function worsePocketStatus(
  tunables: Tunables,
  a: PocketStatusRung,
  b: PocketStatusRung,
): PocketStatusRung {
  return pocketSeverity(tunables, b) > pocketSeverity(tunables, a) ? b : a;
}

/**
 * §7.2's single-rep rule. The worst floor any one rusher's previous-tick band
 * imposes — a matchup that held does not soften a matchup that was lost.
 */
export function pocketFloorFor(
  tunables: Tunables,
  previousTickBands: readonly PassRushBandLabel[],
): PocketStatusRung {
  let floor: PocketStatusRung = "CLEAN";
  for (const band of previousTickBands) {
    floor = worsePocketStatus(tunables, floor, tunables.pocket.minimumStatusByBand[band]);
  }
  return floor;
}

/** Status implied by the accumulated pressure counter alone. */
export function pocketStatusFromPressure(
  tunables: Tunables,
  highestPressure: number,
): PocketStatusRung {
  for (const threshold of tunables.pocket.thresholds) {
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
  tunables: Tunables,
  highestPressure: number,
  previousTickBands: readonly PassRushBandLabel[] = [],
  minTimeToArrival?: number,
): PocketStatusRung {
  return [
    pocketStatusFromPressure(tunables, highestPressure),
    pocketFloorFor(tunables, previousTickBands),
    pocketFloorFromArrival(tunables, minTimeToArrival),
  ].reduce((a, b) => worsePocketStatus(tunables, a, b), "CLEAN" as PocketStatusRung);
}

export function accuracyModifierFor(tunables: Tunables, status: PocketStatusRung): number {
  return tunables.pocket.accuracyModifier[status];
}

export function readCapacityDeltaFor(tunables: Tunables, status: PocketStatusRung): number {
  return tunables.pocket.readCapacityDelta[status];
}

export function forcesDecision(tunables: Tunables, status: PocketStatusRung): boolean {
  const forcing: readonly string[] = tunables.pocket.forcesDecision;
  return forcing.includes(status);
}

/** §7.2 — the QB is going down if he has no one to throw to under this status. */
export function sacksWithoutTarget(tunables: Tunables, status: PocketStatusRung): boolean {
  const sacking: readonly string[] = tunables.pocket.sackWhenNoTarget;
  return sacking.includes(status);
}
