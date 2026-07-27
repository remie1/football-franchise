/** §8.2–§8.4, §8.7 — QB processing capacity, perceived openness, effective openness. */
import { getAttr } from "@ff/contracts";
import type { AttrId, PlayerState, Rng, RollDetail, RollModifier } from "@ff/contracts";
import { ATTR, TRAIT } from "../attrs.js";
import { clamp, flatModifier, rollD20 } from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type { PocketStatus, ReadSystem } from "../types.js";
import { readCapacityDeltaFor } from "./pocket.js";

export interface QbReadOutcome {
  readonly actualOpenness: number;
  readonly perceivedOpenness: number;
  readonly effectiveOpenness: number;
  readonly windowModifier: number;
  readonly varianceRoll: RollDetail;
  /**
   * ADR-004 — what this read actually exercised. Awareness always (§8.3
   * variance narrowing); the arm-talent trio only when the §8.4 tight-window
   * modifier was applied, because on a wide-open read it never ran.
   */
  readonly testsAttrs: readonly AttrId[];
}

/** §8.4 — the attributes the tight-window compensation term is built from. */
const TIGHT_WINDOW_ATTRS: readonly AttrId[] = [ATTR.accuracy, ATTR.armStrength, ATTR.touch];

/**
 * §8.3 — the QB never sees actual openness, only a variance-shifted estimate.
 *
 * `extraModifiers` carries situational terms that belong on THIS roll because
 * the doc writes them against it — §8.8's scramble vision cone ("−20 direction
 * of run / −40 back toward the line") is the only current caller. Putting them
 * in the roll's modifier list rather than adjusting the result afterwards keeps
 * perceived openness reconstructible from the stream.
 */
export function resolveQbRead(
  qb: PlayerState,
  actualOpenness: number,
  readRng: Rng,
  extraModifiers: readonly RollModifier[] = [],
): QbReadOutcome {
  const t = TUNABLES.qb;
  const awarenessTerm = Math.round(
    (getAttr(qb.attributes.values, ATTR.awareness) - t.awarenessVariance.baseline) / t.awarenessVariance.divisor,
  );
  const varianceRoll = rollD20(readRng, [
    flatModifier("d20 variance offset", t.awarenessVariance.d20Offset),
    { source: `${qb.bio.position} Awareness (variance narrowing)`, attr: ATTR.awareness, value: awarenessTerm },
    ...extraModifiers.filter((m) => m.value !== 0),
  ]);

  const perceivedOpenness = Math.round(
    clamp(actualOpenness + varianceRoll.total, TUNABLES.route.minOpenness, TUNABLES.route.maxOpenness),
  );
  const tightWindow = perceivedOpenness < t.window.tightWindowThreshold;
  const windowModifier = tightWindow ? windowModifierFor(qb) : 0;
  const effectiveOpenness = Math.round(
    clamp(perceivedOpenness + windowModifier, TUNABLES.route.minOpenness, TUNABLES.route.maxOpenness),
  );

  return {
    actualOpenness,
    perceivedOpenness,
    effectiveOpenness,
    windowModifier,
    varianceRoll,
    // `tightWindow`, not `windowModifier !== 0`: a baseline QB's compensation
    // sums to zero but the check still ran against his arm talent.
    testsAttrs: tightWindow ? [ATTR.awareness, ...TIGHT_WINDOW_ATTRS] : [ATTR.awareness],
  };
}

/** §8.4 — what a tight window is worth to THIS quarterback. */
export function windowModifierFor(qb: PlayerState): number {
  const w = TUNABLES.qb.window;
  const v = qb.attributes.values;
  return (
    Math.round((getAttr(v, ATTR.accuracy) - w.baseline) / w.accuracyDivisor) +
    Math.round((getAttr(v, ATTR.armStrength) - w.baseline) / w.armStrengthDivisor) +
    Math.round((getAttr(v, ATTR.touch) - w.baseline) / w.touchDivisor)
  );
}

/** §8.1 + §8.2 — reads available this tick, before the fractional carry. */
export function readCapacityPerTick(qb: PlayerState, system: ReadSystem, pocket: PocketStatus): number {
  const t = TUNABLES.qb;
  const extra = Math.floor(
    (getAttr(qb.attributes.values, ATTR.decisionMaking) - t.extraReads.baseline) / t.extraReads.divisor,
  );
  const systemRate = t.readSystem[system].readsPerTick;
  const floor = Math.min(systemRate, t.minReadsPerTick);
  const base = systemRate + Math.max(0, extra);
  return Math.max(floor, base + readCapacityDeltaFor(pocket));
}

export function maxReadsFor(system: ReadSystem): number {
  return TUNABLES.qb.readSystem[system].maxReads;
}

/**
 * §8.7 — how long this QB will stand in a clean pocket.
 *
 * The reading system is an argument, not a detail: §8.7's budget and §8.1's
 * anticipation profile are ONE mechanic seen from two sides. A quarterback who
 * releases on timing is late the moment he needs a fourth tick; a quarterback
 * working a four-man progression at half a read per tick has not finished
 * looking when a half-field passer is already out of the play.
 */
export function timeBudgetSeconds(qb: PlayerState, system: ReadSystem): number {
  const t = TUNABLES.qb;
  const patience = getAttr(qb.attributes.values, ATTR.pocketPatience);
  const sensing = qb.attributes.traits.has(TRAIT.pocketAwareness as unknown as string)
    ? t.pressureSensing.pocketAwarenessBudgetSeconds
    : 0;
  return (
    t.timeBudget.baseSeconds +
    (patience - t.timeBudget.baseline) / t.timeBudget.divisor +
    sensing +
    t.readSystem[system].budgetDeltaSeconds
  );
}

/**
 * §8.5 — the effective openness at which THIS system's quarterback pulls the
 * trigger on a primary. A full-field passer has reads left and passes on a
 * marginal window; a concept passer has two and takes what the key gives him.
 */
export function throwThresholdFor(system: ReadSystem): number {
  return TUNABLES.qb.throwThreshold + TUNABLES.qb.readSystem[system].throwThresholdDelta;
}
