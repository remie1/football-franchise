/** §8.2–§8.4, §8.7 — QB processing capacity, perceived openness, effective openness. */
import { getAttr } from "@ff/contracts";
import type { AttrId, PlayerState, Rng, RollDetail, RollModifier } from "@ff/contracts";
import { ATTR, TRAIT } from "../attrs.js";
import { clamp, compact, flatModifier, rollD20Shaped } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { ReadSystem } from "../types.js";

export interface QbReadOutcome {
  readonly actualOpenness: number;
  readonly perceivedOpenness: number;
  readonly effectiveOpenness: number;
  readonly windowModifier: number;
  readonly varianceRoll: RollDetail;
  /**
   * ADR-004 — what this read actually exercised. Awareness always (§8.3's
   * perception band); the arm-talent trio only when the §8.4 tight-window
   * modifier was applied, because on a wide-open read it never ran.
   */
  readonly testsAttrs: readonly AttrId[];
}

/** §8.4 — the attributes the tight-window compensation term is built from. */
const TIGHT_WINDOW_ATTRS: readonly AttrId[] = [ATTR.accuracy, ATTR.armStrength, ATTR.touch];

/** A d20's faces, and the widest excursion the fold below can produce. */
const D20_FACES = 20;
const MAX_EXCURSION = D20_FACES - 1;

/**
 * §8.3 (AMENDED) — THE HALF-WIDTH OF THIS QUARTERBACK'S PERCEPTION BAND.
 *
 * `baseHalfWidth − (Awareness − baseline) ÷ divisor`, which is §8.3's own
 * `d20 − 10` and its own `(Awareness − 70) ÷ 5` doing what §8.3's sentence
 * always said they did. Strictly decreasing in awareness: an elite passer sees
 * the field ACCURATELY, which is a narrower band around the truth and never an
 * optimistic one. See the ⚠ block on `TUNABLES.qb.awarenessVariance`.
 */
export function perceptionHalfWidth(tunables: Tunables, qb: PlayerState): number {
  const t = tunables.qb.awarenessVariance;
  const narrowing = (getAttr(qb.attributes.values, ATTR.awareness) - t.baseline) / t.divisor;
  // A band cannot be narrower than nothing. NOT a magnitude and therefore not a
  // tunable: on the registry's 0-99 range the largest narrowing is 5.8 against a
  // base of 10, so this floor is unreachable today. It exists so that a rating
  // outside that range could not MIRROR the band and break monotonicity.
  return Math.max(0, t.baseHalfWidth - narrowing);
}

/**
 * §8.3 (AMENDED) — one face of the d20, folded onto a band of half-width `h`.
 *
 * `face → 2·face − 21` maps 1..20 onto ±{1,3,…,19}: symmetric about the die's
 * own midpoint, with no face landing on zero and no face unpaired. Scaling that
 * to ±h and rounding AWAY FROM ZERO keeps the map ODD —
 * `variance(21 − face) === −variance(face)` for every face and every half-width
 * — so the mean over the die is EXACTLY zero rather than approximately zero.
 *
 * That last detail is the whole repair: `Math.round` alone breaks ties upward,
 * and a half-point of systematic optimism is the same defect as five points of
 * it. `test/qbDecision.test.ts` proves the property over every face rather than
 * sampling it.
 */
export function perceptionVariance(face: number, halfWidth: number): number {
  const scaled = ((2 * face - (D20_FACES + 1)) * halfWidth) / MAX_EXCURSION;
  return Math.sign(scaled) * Math.round(Math.abs(scaled));
}

/** Half-widths are fractional at most ratings; the printout gets one decimal. */
function formatHalfWidth(halfWidth: number): string {
  return Number.isInteger(halfWidth) ? String(halfWidth) : halfWidth.toFixed(1);
}

/**
 * §8.3 — the QB never sees actual openness, only an estimate drawn from a band
 * CENTRED ON THE TRUTH whose width is his awareness (ADR-040).
 *
 * `extraModifiers` carries situational terms that belong on THIS roll because
 * the doc writes them against it — §8.8's scramble vision cone ("−20 direction
 * of run / −40 back toward the line") is the only current caller. Putting them
 * in the roll's modifier list rather than adjusting the result afterwards keeps
 * perceived openness reconstructible from the stream. They ARE deliberate mean
 * shifts, and that is the point of the distinction: a quarterback running for
 * his life genuinely cannot see the backside of the field, whereas awareness
 * buys accuracy of perception and never optimism.
 */
export function resolveQbRead(
  tunables: Tunables,
  qb: PlayerState,
  actualOpenness: number,
  readRng: Rng,
  extraModifiers: readonly RollModifier[] = [],
): QbReadOutcome {
  const t = tunables.qb;
  const baseHalfWidth = t.awarenessVariance.baseHalfWidth;
  const halfWidth = perceptionHalfWidth(tunables, qb);

  const varianceRoll = rollD20Shaped(readRng, (face) => [
    // The die's own fold onto the baseline band: what a 70-awareness passer sees.
    flatModifier(`d20 → perception band (±${baseHalfWidth})`, perceptionVariance(face, baseHalfWidth) - face),
    // What awareness is worth on THIS draw — always emitted, even at zero, because
    // the band width is the mechanic and a reader of the §17 printout has to see
    // it. Its sign always points TOWARDS the truth for a better-than-baseline
    // quarterback and away from it for a worse one.
    {
      source: `${qb.bio.position} Awareness (perception band ±${formatHalfWidth(halfWidth)})`,
      attr: ATTR.awareness,
      value: perceptionVariance(face, halfWidth) - perceptionVariance(face, baseHalfWidth),
    },
    ...compact(extraModifiers),
  ]);

  const perceivedOpenness = Math.round(
    clamp(actualOpenness + varianceRoll.total, tunables.route.minOpenness, tunables.route.maxOpenness),
  );
  const tightWindow = perceivedOpenness < t.window.tightWindowThreshold;
  const windowModifier = tightWindow ? windowModifierFor(tunables, qb) : 0;
  const effectiveOpenness = Math.round(
    clamp(perceivedOpenness + windowModifier, tunables.route.minOpenness, tunables.route.maxOpenness),
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
export function windowModifierFor(tunables: Tunables, qb: PlayerState): number {
  const w = tunables.qb.window;
  const v = qb.attributes.values;
  return (
    Math.round((getAttr(v, ATTR.accuracy) - w.baseline) / w.accuracyDivisor) +
    Math.round((getAttr(v, ATTR.armStrength) - w.baseline) / w.armStrengthDivisor) +
    Math.round((getAttr(v, ATTR.touch) - w.baseline) / w.touchDivisor)
  );
}

/**
 * §8.1 + §8.2 — reads available this tick, before the fractional carry.
 *
 * `capacityDelta` is supplied by the caller rather than looked up here from a
 * `PocketStatusRung`, so this function is blind to WHERE the delta came from.
 * ADR-055 §6 point 3: a passer still in the pocket is charged
 * `pocket.readCapacityDelta[status]` (`resolve/pocket.ts`'s
 * `readCapacityDeltaFor`); a passer in pursuit is charged
 * `tunables.scramble.readCapacityDelta` instead — its own constant, not a
 * `PocketStatusRung` borrowed for a state that is not a pocket status
 * (backlog entry 84). `sim/passPlay.ts` picks which at the one call site.
 */
export function readCapacityPerTick(
  tunables: Tunables,
  qb: PlayerState,
  system: ReadSystem,
  capacityDelta: number,
): number {
  const t = tunables.qb;
  const extra = Math.floor(
    (getAttr(qb.attributes.values, ATTR.decisionMaking) - t.extraReads.baseline) / t.extraReads.divisor,
  );
  const systemRate = t.readSystem[system].readsPerTick;
  const floor = Math.min(systemRate, t.minReadsPerTick);
  const base = systemRate + Math.max(0, extra);
  return Math.max(floor, base + capacityDelta);
}

export function maxReadsFor(tunables: Tunables, system: ReadSystem): number {
  return tunables.qb.readSystem[system].maxReads;
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
export function timeBudgetSeconds(tunables: Tunables, qb: PlayerState, system: ReadSystem): number {
  const t = tunables.qb;
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
export function throwThresholdFor(tunables: Tunables, system: ReadSystem): number {
  return tunables.qb.throwThreshold + tunables.qb.readSystem[system].throwThresholdDelta;
}
