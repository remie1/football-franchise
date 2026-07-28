/**
 * TOLERANCE BANDS — `calibration.md` §10.1, **loose-and-ratchet**.
 *
 *   > Tier 1 opens at ±15% relative; whenever a metric sits comfortably inside its band across
 *   > consecutive reports, the band tightens and locks. **Bands only ever move tighter — a
 *   > rising floor.** Every report states the current band table.
 *
 * Three consequences are implemented here rather than left to discipline:
 *
 *  1. **`ratchetBand` cannot widen.** It takes the incumbent and a proposal and returns the
 *     tighter of the two. There is no loosen path, and adding one would be a visible change to
 *     this file rather than a number somebody edited in a table.
 *  2. **The band table is versioned and hashed**, and the report prints it in full every time.
 *     "Every report states the current band table" is not a formatting suggestion — a report
 *     whose bands you cannot see is a report whose pass/fail column means nothing.
 *  3. **A first report that fails widely is the expected state**, so a verdict distinguishes
 *     `FAIL` from `FAIL_KNOWN` — a failure with a backlog entry attached. The second is a map
 *     reference; the first is news.
 */
import {
  chiSquared,
  kolmogorovSmirnov,
  meanInterval,
  spearman,
  wilsonInterval,
  type Interval,
} from "../metrics/stats.js";
import {
  isInapplicable,
  pointEstimate,
  sampleSize,
  type BandChange,
  type Metric,
  type MetricOutcome,
  type MetricSample,
  type ToleranceBand,
} from "../metrics/types.js";

export type BandVerdict =
  | "PASS"
  /** Outside the band, and the metric names no known divergence. Read this row twice. */
  | "FAIL"
  /** Outside the band, and a backlog entry already explains it. Still open, not news. */
  | "FAIL_KNOWN"
  /** Comfortably inside — the condition §10.1 ratchets on. */
  | "PASS_COMFORTABLE"
  /** The metric could not produce a number on one side or the other. */
  | "NO_DATA"
  /** The metric is meaningless on this league's provenance. */
  | "NOT_APPLICABLE"
  /** The metric has no target: an observation, reported and never graded. */
  | "OBSERVATION";

/**
 * "Comfortably" inside, for the ratchet. Half the band, which means a metric qualifies for a
 * tightening only if the tightening it would receive would still have passed.
 */
export const COMFORT_FRACTION = 0.5;

/** How many consecutive comfortable reports before a band tightens and locks. */
export const RATCHET_AFTER_REPORTS = 2;

export interface MetricEvaluation {
  readonly metricId: string;
  readonly tier: number;
  readonly definition: string;
  readonly unit: string;
  readonly verdict: BandVerdict;
  readonly band: ToleranceBand;
  /** The scalar comparison, when there is one. */
  readonly sim: number | null;
  readonly real: number | null;
  readonly simN: number;
  readonly realN: number;
  readonly simInterval: Interval | null;
  readonly realInterval: Interval | null;
  /** Relative deviation for RELATIVE bands, absolute for ABSOLUTE, p-value for SHAPE, ρ for CORRELATION_FLOOR. */
  readonly deviation: number | null;
  /** How the deviation should be read, in words, for the report. */
  readonly deviationLabel: string;
  readonly detail: string;
  readonly knownDivergences: readonly string[];
  /** True when this metric would qualify for a ratchet if the previous report also did. */
  readonly comfortable: boolean;
  /**
   * The scalar the previous report recorded, when there was one. Present on the evaluation
   * rather than looked up at render time so the trend column is a property of the report value
   * and survives serialisation — a trend a renderer computes is a trend nothing else can read.
   */
  readonly previousSim?: number;
}

function intervalFor(sample: MetricSample): Interval | null {
  switch (sample.kind) {
    case "RATE":
      return wilsonInterval(sample.successes, sample.trials);
    case "MEAN": {
      const i = meanInterval(sample.total, sample.n, sample.sumSquares);
      return Number.isNaN(i.low) ? null : i;
    }
    case "SAMPLES": {
      let total = 0;
      let sumSquares = 0;
      for (const v of sample.values) {
        total += v;
        sumSquares += v * v;
      }
      const i = meanInterval(total, sample.values.length, sumSquares);
      return Number.isNaN(i.low) ? null : i;
    }
    case "CATEGORICAL":
      return null;
  }
}

/**
 * Compare one metric's two sides against its band.
 *
 * The dispatch is on the BAND kind and then on the sample kind, in that order, because the band
 * is what the report is asserting and the sample kind is how it can be measured. A `SHAPE` band
 * over `SAMPLES` is a KS test; over `CATEGORICAL` it is chi-squared; over anything else it is a
 * configuration error and says so rather than silently falling back to a relative comparison.
 */
export function evaluateMetric(
  metric: Metric,
  simOutcome: MetricOutcome,
  realOutcome: MetricOutcome,
): MetricEvaluation {
  const band = metric.toleranceBand;
  const base = {
    metricId: metric.id,
    tier: metric.tier as number,
    definition: metric.definition,
    unit: metric.unit,
    band,
    knownDivergences: metric.knownDivergences ?? [],
  };

  if (isInapplicable(simOutcome) && simOutcome.reason === "PROVENANCE") {
    return {
      ...base,
      verdict: "NOT_APPLICABLE",
      sim: null,
      real: null,
      simN: 0,
      realN: 0,
      simInterval: null,
      realInterval: null,
      deviation: null,
      deviationLabel: "n/a",
      detail: simOutcome.detail,
      comfortable: false,
    };
  }

  const isObservation =
    !Number.isFinite(band.width) || band.width === Number.NEGATIVE_INFINITY;

  if (isInapplicable(simOutcome) || isInapplicable(realOutcome)) {
    const detail = [
      isInapplicable(simOutcome) ? `sim: ${simOutcome.detail}` : null,
      isInapplicable(realOutcome) ? `real: ${realOutcome.detail}` : null,
    ]
      .filter((s): s is string => s !== null)
      .join(" | ");
    return {
      ...base,
      verdict: isObservation ? "OBSERVATION" : "NO_DATA",
      sim: isInapplicable(simOutcome) ? null : pointEstimate(simOutcome),
      real: isInapplicable(realOutcome) ? null : pointEstimate(realOutcome),
      simN: isInapplicable(simOutcome) ? 0 : sampleSize(simOutcome),
      realN: isInapplicable(realOutcome) ? 0 : sampleSize(realOutcome),
      simInterval: isInapplicable(simOutcome) ? null : intervalFor(simOutcome),
      realInterval: isInapplicable(realOutcome) ? null : intervalFor(realOutcome),
      deviation: null,
      deviationLabel: "n/a",
      detail,
      comfortable: false,
    };
  }

  const sim = pointEstimate(simOutcome);
  const real = pointEstimate(realOutcome);
  const common = {
    ...base,
    sim,
    real,
    simN: sampleSize(simOutcome),
    realN: sampleSize(realOutcome),
    simInterval: intervalFor(simOutcome),
    realInterval: intervalFor(realOutcome),
  };

  if (isObservation) {
    return {
      ...common,
      verdict: "OBSERVATION",
      deviation: null,
      deviationLabel: "observation — no target",
      detail: "reported, never graded",
      comfortable: false,
    };
  }

  switch (band.kind) {
    case "RELATIVE": {
      if (sim === null || real === null || real === 0) {
        return { ...common, verdict: "NO_DATA", deviation: null, deviationLabel: "n/a", detail: "no scalar comparison", comfortable: false };
      }
      const deviation = (sim - real) / Math.abs(real);
      return finish(common, metric, deviation, band.width, `relative deviation (band ±${(band.width * 100).toFixed(0)}%)`);
    }
    case "ABSOLUTE": {
      if (sim === null || real === null) {
        return { ...common, verdict: "NO_DATA", deviation: null, deviationLabel: "n/a", detail: "no scalar comparison", comfortable: false };
      }
      const deviation = sim - real;
      return finish(common, metric, deviation, band.width, `absolute deviation (band ±${band.width} ${metric.unit})`);
    }
    case "SHAPE": {
      if (simOutcome.kind === "SAMPLES" && realOutcome.kind === "SAMPLES") {
        const ks = kolmogorovSmirnov(simOutcome.values, realOutcome.values);
        return floorVerdict(common, metric, ks.pValue, band.width, `KS p (floor ${band.width}); D=${ks.statistic.toFixed(4)}`);
      }
      if (simOutcome.kind === "CATEGORICAL" && realOutcome.kind === "CATEGORICAL") {
        const chi = chiSquared(simOutcome.counts, realOutcome.counts);
        const dropped = chi.droppedCategories.length === 0 ? "" : `; dropped (expected<5): ${chi.droppedCategories.join(", ")}`;
        return floorVerdict(
          common,
          metric,
          chi.pValue,
          band.width,
          `chi² p (floor ${band.width}); χ²=${chi.statistic.toFixed(2)} df=${chi.degreesOfFreedom}${dropped}`,
        );
      }
      return {
        ...common,
        verdict: "NO_DATA",
        deviation: null,
        deviationLabel: "n/a",
        detail:
          `a SHAPE band needs SAMPLES on both sides (KS) or CATEGORICAL on both sides (chi²); ` +
          `got sim=${simOutcome.kind} real=${realOutcome.kind}. This is a metric-definition error.`,
        comfortable: false,
      };
    }
    case "CORRELATION_FLOOR": {
      if (simOutcome.kind !== "SAMPLES" || realOutcome.kind !== "SAMPLES") {
        return {
          ...common,
          verdict: "NO_DATA",
          deviation: null,
          deviationLabel: "n/a",
          detail: `a CORRELATION_FLOOR band needs SAMPLES on both sides; got sim=${simOutcome.kind} real=${realOutcome.kind}`,
          comfortable: false,
        };
      }
      const rho = spearman(simOutcome.values, realOutcome.values);
      return floorVerdict(common, metric, rho, band.width, `Spearman ρ (floor ${band.width})`);
    }
  }
}

type Common = Omit<
  MetricEvaluation,
  "verdict" | "deviation" | "deviationLabel" | "detail" | "comfortable"
>;

function finish(
  common: Common,
  metric: Metric,
  deviation: number,
  width: number,
  label: string,
): MetricEvaluation {
  const magnitude = Math.abs(deviation);
  const inside = magnitude <= width;
  const comfortable = magnitude <= width * COMFORT_FRACTION;
  return {
    ...common,
    verdict: inside ? (comfortable ? "PASS_COMFORTABLE" : "PASS") : failVerdict(metric),
    deviation,
    deviationLabel: label,
    detail: inside ? "" : outsideDetail(metric),
    comfortable,
  };
}

function floorVerdict(
  common: Common,
  metric: Metric,
  value: number,
  floor: number,
  label: string,
): MetricEvaluation {
  if (!Number.isFinite(value)) {
    return { ...common, verdict: "NO_DATA", deviation: null, deviationLabel: label, detail: "test produced no value", comfortable: false };
  }
  const inside = value >= floor;
  // "Comfortably" for a floor means clearing it by half again, not by half.
  const comfortable = value >= floor * 1.5;
  return {
    ...common,
    verdict: inside ? (comfortable ? "PASS_COMFORTABLE" : "PASS") : failVerdict(metric),
    deviation: value,
    deviationLabel: label,
    detail: inside ? "" : outsideDetail(metric),
    comfortable,
  };
}

function failVerdict(metric: Metric): BandVerdict {
  return (metric.knownDivergences ?? []).length > 0 ? "FAIL_KNOWN" : "FAIL";
}

function outsideDetail(metric: Metric): string {
  const known = metric.knownDivergences ?? [];
  return known.length > 0
    ? `outside band; already diagnosed: ${known.join("; ")}`
    : "outside band, and NO backlog entry claims it — this row is new";
}

// --- the ratchet ------------------------------------------------------------

export interface BandTable {
  readonly version: string;
  readonly entries: Readonly<Record<string, ToleranceBand>>;
}

/** The opening table: whatever each metric declares. §10.1's "Tier 1 opens at ±15% relative". */
export function openingBandTable(metrics: readonly Metric[], version = "bands-v0"): BandTable {
  const entries: Record<string, ToleranceBand> = {};
  for (const metric of metrics) entries[metric.id] = metric.toleranceBand;
  return { version, entries };
}

export class BandWidenedError extends Error {
  constructor(id: string, from: number, to: number) {
    super(
      `refusing to widen the band for "${id}" from ${from} to ${to}. calibration.md §10.1: ` +
        `bands only ever move tighter — a rising floor. If a band is genuinely wrong, that is a ` +
        `spec amendment, not a report-time adjustment.`,
    );
    this.name = "BandWidenedError";
  }
}

/**
 * Tighten a band. Refuses to widen — including for a `SHAPE` or `CORRELATION_FLOOR` band, where
 * "tighter" means a HIGHER number and the comparison flips. Getting that backwards would quietly
 * relax exactly the bands whose failure matters most, so it is a switch on the kind rather than
 * a `Math.min`.
 */
export function ratchetBand(
  id: string,
  current: ToleranceBand,
  proposedWidth: number,
  reportId: string,
  reason: string,
): ToleranceBand {
  const tighter =
    current.kind === "SHAPE" || current.kind === "CORRELATION_FLOOR"
      ? proposedWidth > current.width
      : proposedWidth < current.width;
  if (!tighter) throw new BandWidenedError(id, current.width, proposedWidth);
  const change: BandChange = { reportId, from: current.width, to: proposedWidth, reason };
  return {
    kind: current.kind,
    width: proposedWidth,
    lockedBy: reportId,
    history: [...current.history, change],
  };
}

/**
 * The ratchet decision for one metric, given how many consecutive comfortable reports it has had.
 * Returns the proposal rather than applying it: tightening a band is a decision somebody records,
 * not something a report does to itself while nobody is looking.
 */
export interface RatchetProposal {
  readonly metricId: string;
  readonly from: number;
  readonly to: number;
  readonly consecutiveComfortableReports: number;
  readonly reason: string;
}

export function proposeRatchets(
  evaluations: readonly MetricEvaluation[],
  comfortableStreak: Readonly<Record<string, number>>,
  reportId: string,
): readonly RatchetProposal[] {
  const proposals: RatchetProposal[] = [];
  for (const evaluation of evaluations) {
    if (!evaluation.comfortable) continue;
    const streak = (comfortableStreak[evaluation.metricId] ?? 0) + 1;
    if (streak < RATCHET_AFTER_REPORTS) continue;
    if (evaluation.band.lockedBy !== undefined) continue;
    const band = evaluation.band;
    const to =
      band.kind === "SHAPE" || band.kind === "CORRELATION_FLOOR"
        ? band.width * 1.5
        : band.width * COMFORT_FRACTION;
    proposals.push({
      metricId: evaluation.metricId,
      from: band.width,
      to,
      consecutiveComfortableReports: streak,
      reason: `${streak} consecutive reports comfortably inside (|deviation| <= ${COMFORT_FRACTION}× band) as of ${reportId}`,
    });
  }
  return proposals;
}

/** Update the streak counters a report carries forward. */
export function updateComfortStreaks(
  previous: Readonly<Record<string, number>>,
  evaluations: readonly MetricEvaluation[],
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const evaluation of evaluations) {
    next[evaluation.metricId] = evaluation.comfortable ? (previous[evaluation.metricId] ?? 0) + 1 : 0;
  }
  return next;
}
