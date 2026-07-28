/**
 * THE METRIC SHAPE — `calibration.md` §4.
 *
 * *"Each metric: `{id, tier, definition, computeFromEvents, computeFromReal, toleranceBand}`.
 * Targets are populated from ingested 2022–2025 data at report time — never hard-coded numbers
 * that rot."*
 *
 * Taken literally, including the last clause: there is no place in this package to put a target
 * number. `computeFromReal` is the target, it runs against the cache at report time, and a
 * metric with no real-side computation cannot be registered.
 *
 * ================== FOUR SAMPLE KINDS, NOT ONE NUMBER ==================
 *
 * Tier 1 wants rates, Tier 2 wants distributions, Tier 3 wants correlations, Tier 4 wants
 * per-player vectors. A single `number` return would force Tier 2 to collapse a shape into a
 * mean, which is precisely the error Tier 2 exists to catch ("right mean, wrong shape"). So the
 * return is a discriminated union and the comparison dispatches on it.
 */
import type { Eligibility } from "../ingest/seasons.js";
import type { LeagueProvenance } from "../league/provenance.js";
import type { RealInput } from "./realInput.js";
import type { SimAccumulator } from "./collect.js";

export type MetricTier = 1 | 2 | 3 | 4;

/** A proportion with its denominator. Wilson intervals need both, so both are required. */
export interface RateSample {
  readonly kind: "RATE";
  readonly successes: number;
  readonly trials: number;
}

/**
 * A mean with the spread and count needed to put an interval on it.
 *
 * `sumSquares` is `null` when the mean is a RATIO OF TOTALS rather than an average of
 * observations — "passing yards ÷ attempts" computed from two counters has a well-defined value
 * and no per-observation spread. The report prints no interval for those and says so. A fake
 * sum-of-squares would produce a confidence interval that looks like every other one and means
 * nothing, which is worse than a blank.
 */
export interface MeanSample {
  readonly kind: "MEAN";
  readonly total: number;
  readonly n: number;
  readonly sumSquares: number | null;
}

/** Raw observations, kept because a shape test needs them (KS). */
export interface SamplesSample {
  readonly kind: "SAMPLES";
  readonly values: readonly number[];
}

/** Counts by category, for chi-squared. */
export interface CategoricalSample {
  readonly kind: "CATEGORICAL";
  readonly counts: Readonly<Record<string, number>>;
}

export type MetricSample = RateSample | MeanSample | SamplesSample | CategoricalSample;

export function rate(successes: number, trials: number): RateSample {
  return { kind: "RATE", successes, trials };
}

export function meanOf(values: readonly number[]): MeanSample {
  let total = 0;
  let sumSquares = 0;
  for (const v of values) {
    total += v;
    sumSquares += v * v;
  }
  return { kind: "MEAN", total, n: values.length, sumSquares };
}

export function meanFrom(total: number, n: number, sumSquares: number): MeanSample {
  return { kind: "MEAN", total, n, sumSquares };
}

/** A mean that is a ratio of two totals, with no per-observation spread. No interval. */
export function ratioMean(total: number, n: number): MeanSample {
  return { kind: "MEAN", total, n, sumSquares: null };
}

export function samples(values: readonly number[]): SamplesSample {
  return { kind: "SAMPLES", values };
}

export function categorical(counts: Readonly<Record<string, number>>): CategoricalSample {
  return { kind: "CATEGORICAL", counts };
}

/** The scalar a rate or a mean reduces to. Shapes have none, by design. */
export function pointEstimate(sample: MetricSample): number | null {
  switch (sample.kind) {
    case "RATE":
      return sample.trials === 0 ? null : sample.successes / sample.trials;
    case "MEAN":
      return sample.n === 0 ? null : sample.total / sample.n;
    case "SAMPLES":
      return sample.values.length === 0
        ? null
        : sample.values.reduce((a, b) => a + b, 0) / sample.values.length;
    case "CATEGORICAL":
      return null;
  }
}

export function sampleSize(sample: MetricSample): number {
  switch (sample.kind) {
    case "RATE":
      return sample.trials;
    case "MEAN":
      return sample.n;
    case "SAMPLES":
      return sample.values.length;
    case "CATEGORICAL":
      return Object.values(sample.counts).reduce((a, b) => a + b, 0);
  }
}

// --- tolerance bands --------------------------------------------------------

/**
 * `calibration.md` §10.1 — **loose-and-ratchet**. Tier 1 opens at ±15% relative; a metric that
 * sits comfortably inside its band across consecutive reports gets its band tightened and
 * locked. **Bands only ever move tighter.**
 *
 * `RELATIVE` and `ABSOLUTE` compare a scalar to the real value. `SHAPE` is a p-value floor on a
 * KS or chi-squared test. `CORRELATION_FLOOR` is a minimum Spearman/Pearson.
 */
export type BandKind = "RELATIVE" | "ABSOLUTE" | "SHAPE" | "CORRELATION_FLOOR";

export interface ToleranceBand {
  readonly kind: BandKind;
  /** ±fraction for RELATIVE, ±units for ABSOLUTE, minimum p for SHAPE, minimum r for CORRELATION_FLOOR. */
  readonly width: number;
  /**
   * Once locked, the band never widens again — that is the ratchet. The value is the report id
   * that locked it, so a reader can go and see the evidence.
   */
  readonly lockedBy?: string;
  /** Every tightening, oldest first. The audit trail §10.1's "rising floor" implies. */
  readonly history: readonly BandChange[];
}

export interface BandChange {
  readonly reportId: string;
  readonly from: number;
  readonly to: number;
  readonly reason: string;
}

export function relativeBand(width = 0.15): ToleranceBand {
  return { kind: "RELATIVE", width, history: [] };
}
export function absoluteBand(width: number): ToleranceBand {
  return { kind: "ABSOLUTE", width, history: [] };
}
export function shapeBand(minP = 0.01): ToleranceBand {
  return { kind: "SHAPE", width: minP, history: [] };
}
export function correlationFloor(minR: number): ToleranceBand {
  return { kind: "CORRELATION_FLOOR", width: minR, history: [] };
}

// --- the metric -------------------------------------------------------------

/**
 * Why a metric might legitimately produce nothing, stated rather than returned as `null`.
 * A report distinguishes "the sim did not do this" from "this metric cannot mean anything on
 * this league", and the second is not a failure.
 */
export type Inapplicable =
  | { readonly reason: "NO_OBSERVATIONS"; readonly detail: string }
  | { readonly reason: "PROVENANCE"; readonly detail: string };

export type MetricOutcome = MetricSample | Inapplicable;

export function isInapplicable(outcome: MetricOutcome): outcome is Inapplicable {
  return "reason" in outcome;
}

export interface SimContext {
  readonly accumulator: SimAccumulator;
  readonly provenance: LeagueProvenance;
}

export interface Metric {
  readonly id: string;
  readonly tier: MetricTier;
  /** One sentence, printed in the report. What is counted, over what denominator. */
  readonly definition: string;
  /** `%`, `per game`, `yards`, … Printed; never parsed. */
  readonly unit: string;
  /** Higher is better / lower is better / neither. Used only for report annotation. */
  readonly direction?: "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";
  computeFromEvents(context: SimContext): MetricOutcome;
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome;
  readonly toleranceBand: ToleranceBand;
  /** Backlog entries this metric is known to be currently failing because of. */
  readonly knownDivergences?: readonly string[];
}
