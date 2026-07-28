/**
 * THE METRIC REGISTRY, AND THE GATE EVERY METRIC PASSES THROUGH.
 *
 * `registerMetric` is not a convenience over `Array.push`. It is where a candidate metric is
 * checked against every declared absence's forbidden substitutes, which is the mechanism that
 * makes `absence.ts` load-bearing rather than documentary.
 *
 * The realistic accident is not malice. It is: somebody adds a coverage metric because the
 * library visibly has none, finds `laneSpan`/`depthSpan` sitting on every `ZoneAssignment` in
 * the stream, computes the fraction of the grid a coverage owns, calls it `coverage_reach`, and
 * ships a report where it passes its band. Nothing in that report could reveal the problem —
 * ADR-019's whole finding is that the number is real, converges, and grades thin coverage
 * higher. So the check happens at registration, and it fails with the evidence attached.
 */
import {
  AbsentMetricError,
  absenceById,
  assertNotForbiddenSubstitute,
  METRIC_ABSENCES,
} from "./absence.js";
import type { Metric, MetricTier } from "./types.js";

const REGISTRY = new Map<string, Metric>();

export class DuplicateMetricError extends Error {
  constructor(id: string) {
    super(`metric "${id}" is already registered; ids are unique so a report can key on them`);
    this.name = "DuplicateMetricError";
  }
}

export class UnknownMetricError extends Error {
  constructor(id: string) {
    super(
      `no metric "${id}". Registered: ${[...REGISTRY.keys()].sort().join(", ")}. ` +
        `Declared absences: ${METRIC_ABSENCES.map((a) => a.id).join(", ")}.`,
    );
    this.name = "UnknownMetricError";
  }
}

/**
 * Register a metric. Throws `ForbiddenSubstituteError` if its id or definition names one of the
 * numbers a declared absence forbids.
 *
 * `allowStructural` is the sanctioned escape hatch and it is deliberately awkward: a metric
 * asserting that it describes the CARDS rather than grading the COVERAGE has to say `structural`
 * in its id AND pass the flag AND state the distinction in its definition. Three deliberate acts
 * is roughly the right cost for "I know what ADR-019 says and this is the other case".
 */
export function registerMetric(
  metric: Metric,
  options: { readonly allowStructural?: boolean } = {},
): Metric {
  if (REGISTRY.has(metric.id)) throw new DuplicateMetricError(metric.id);
  if (absenceById(metric.id) !== undefined) {
    throw new AbsentMetricError(absenceById(metric.id)!);
  }
  assertNotForbiddenSubstitute(metric.id, `metric id "${metric.id}"`, options);
  assertNotForbiddenSubstitute(
    metric.definition,
    `the definition of metric "${metric.id}"`,
    options,
  );
  if (options.allowStructural === true && !metric.id.includes("structural")) {
    throw new Error(
      `metric "${metric.id}" was registered with allowStructural, but its id does not contain ` +
        `"structural". A structural description must say so where a reader will see it — in a ` +
        `report table, the id is all they see.`,
    );
  }
  if (metric.definition.trim().length === 0) {
    throw new Error(`metric "${metric.id}" has no definition; the definition is printed in every report`);
  }
  REGISTRY.set(metric.id, metric);
  return metric;
}

/**
 * Look a metric up. A declared absence throws `AbsentMetricError` carrying the whole entry —
 * what the metric should be, why it is not there, what the engine must emit, and what must not
 * be substituted. That is the difference between a gap and a hole somebody falls into.
 */
export function getMetric(id: string): Metric {
  const metric = REGISTRY.get(id);
  if (metric !== undefined) return metric;
  const absence = absenceById(id);
  if (absence !== undefined) throw new AbsentMetricError(absence);
  throw new UnknownMetricError(id);
}

export function allMetrics(): readonly Metric[] {
  return [...REGISTRY.values()].sort((a, b) => a.tier - b.tier || a.id.localeCompare(b.id));
}

export function metricsInTier(tier: MetricTier): readonly Metric[] {
  return allMetrics().filter((m) => m.tier === tier);
}

export function isRegistered(id: string): boolean {
  return REGISTRY.has(id);
}

/** Test-only: registries are module state and a test that registers must be able to undo it. */
export function unregisterMetricForTest(id: string): void {
  REGISTRY.delete(id);
}
