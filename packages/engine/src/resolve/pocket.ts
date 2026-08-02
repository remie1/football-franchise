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
 * quantity that has to accumulate. That used to be, unconditionally, the floor
 * `pocketFloorFor(previousTickBands)` supplies. ADR-058 (August 2026) NARROWED
 * it: a won rep with a threat arrival can see is floored by arrival alone
 * (`pocketFloorFromArrival`, below) — finer-grained than this floor's blanket
 * COLLAPSING, and occasionally lower (a slower EDGE win) or higher (arrival
 * reaches IMMEDIATE, which this floor structurally cannot). `pocketFloorFor`
 * keeps supplying COLLAPSING only for a won rep arrival cannot see — one whose
 * threat was time-retired the instant it was created (`sim/passPlay.ts` omits
 * it from `previousBands` otherwise; see that call site and `tunables.ts`'s
 * `minimumStatusByBand.RUSHER_WINS_REP` comment for the mechanism). §7.2's
 * PRESSURE sentence ("winning by 1-14") was overturned in July 2026 and now
 * requires a beaten blocker or a won rep inside the arrival horizon; the band
 * table carries that, not this file.
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
 * ADR-034 has now narrowed `@ff/contracts`' `PocketStatus` to the same four
 * members the engine ranks, so the two agree today. **The alias is kept anyway,
 * and keeping it is the point of ADR-034's amendment:** this is the DERIVED
 * type — it reads the ladder — and contracts' union is the RESTATED one.
 * Charter §4.1's derivation corollary forbids replacing a derived type with a
 * restated copy of it, whatever their present agreement. Every engine function
 * that reads a status-keyed table takes a rung, and a rung stays assignable to
 * `PocketStatus`, so nothing at the event boundary changes.
 *
 * It is DERIVED rather than written out for the same reason `calibration`'s gate
 * derives its rungs: a hand-written copy is a second declaration of the ladder,
 * and the next rung to be added or removed would move one of them and not the
 * other.
 */
export type PocketStatusRung = keyof Tunables["pocket"]["severity"] & PocketStatus;

/**
 * ============ THE INTERSECTION IS ASSERTED, NOT ASSUMED (ADR-036 item 2) ============
 *
 * `PocketStatusRung` is an INTERSECTION, and an intersection is the quietest
 * possible way for two declarations to disagree: a member present on one side
 * and absent on the other does not error, does not warn, and does not appear —
 * **it silently stops existing**, and every function taking a rung silently
 * stops accepting it. Today the ladder and the union agree; until now nothing
 * said they had to, in either direction.
 *
 * `Exclude<A, B>` is empty exactly when every member of `A` is a member of `B`,
 * so the two aliases below are mutual assignability stated one direction at a
 * time — and stated that way on purpose, because the compiler then names the
 * drifted member in the error (`Type '"PANICKED"' does not satisfy the
 * constraint 'never'`) instead of reporting an unhelpful union mismatch.
 *
 * They are types, so they cost nothing at runtime and are erased entirely.
 * `test/pocketStatus.test.ts` proves both of them actually fire, with
 * `@ts-expect-error` on a deliberately divergent pair.
 */
export type AssertEmptyUnion<T extends never> = T;

/**
 * DIRECTION 1 — a rung on the engine's ladder that the shared union does not
 * declare.
 *
 * The mistake this catches: an author adds a rung to `tunables.pocket.severity`
 * (say `PANICKED: 4`, or restores `SACK`) to model a new state, fills in
 * `accuracyModifier`, `readCapacityDelta` and `minimumStatusByBand` for it, and
 * never files the contract petition that would put it in `PocketStatus`.
 * Without this line the new rung is **intersected away**: `pocketStatusFor`
 * cannot return it, `worsePocketStatus` cannot rank it, the ladder the author
 * believes they extended is unchanged, and the whole edit compiles clean.
 */
export type _EveryRungIsAPocketStatus = AssertEmptyUnion<
  Exclude<keyof Tunables["pocket"]["severity"], PocketStatus>
>;

/**
 * DIRECTION 2 — a member of the shared union with no rung on the ladder.
 *
 * The mistake this catches: contracts widens `PocketStatus` (a petition
 * ratified for some other consumer, or `SACK` coming back) and nobody adds the
 * corresponding row to `pocket.severity`. Without this line the engine simply
 * never produces the new status — but it is now a **legal value on the stream**,
 * so a status the compiler swears is fine reaches `pocketSeverityOfEmitted` and
 * blows up at runtime, in a batch, hours in. That is precisely the direction
 * ADR-033 lived in for a month with `SACK`.
 */
export type _EveryPocketStatusIsARung = AssertEmptyUnion<
  Exclude<PocketStatus, keyof Tunables["pocket"]["severity"]>
>;

/** Ordering on the status ladder; higher is worse for the offense. */
export function pocketSeverity(tunables: Tunables, status: PocketStatusRung): number {
  return tunables.pocket.severity[status];
}

/**
 * The severity of a status READ BACK OUT OF THE EVENT STREAM.
 *
 * **KEPT DELIBERATELY AFTER ADR-034, not left behind by it.** The union is no
 * longer wider than the ladder, and the assertions above now make a future
 * divergence a build failure — so it is fair to ask whether the runtime check
 * can ever fire (Charter §4.1's counter-corollary). It can: this function sits
 * on the far side of a PACKAGE BOUNDARY from the stream's producer, and a type
 * binds no caller arriving from JavaScript, from a JSON save, or from a future
 * consumer built against an older `@ff/contracts`.
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
 *
 * The mapping itself is unchanged and untouched by ADR-058 (every band still
 * floors exactly what `tunables.pocket.minimumStatusByBand` says it does,
 * `RUSHER_WINS_REP` included). What changed is what the CALLER hands this
 * function: `sim/passPlay.ts`'s `previousBands` no longer includes a
 * `RUSHER_WINS_REP` entry for a matchup whose threat is still live, because
 * arrival is now authoritative for a won rep it can see. This function has no
 * way to know that on its own — it only ever sees the band labels it is
 * given — so the narrowing lives entirely at the call site, not here.
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
