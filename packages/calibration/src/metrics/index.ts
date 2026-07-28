/**
 * THE METRIC LIBRARY — `calibration.md` §4.
 *
 * Importing this module registers every metric. The tier modules have registration side effects
 * (`registerMetric` at declaration), so `allMetrics()` is only complete once they have been
 * imported, and they are imported here rather than lazily anywhere else — a registry whose
 * contents depend on which file happened to be loaded first is a registry that produces
 * different reports on different days.
 *
 * ★ READ `absence.ts` BEFORE ADDING A COVERAGE METRIC. ★
 *
 * The library has no coverage-quality metric and the omission is deliberate, documented and
 * enforced: `registerMetric` refuses a candidate that names coverage reach, coverage percentage,
 * grid ownership or route openness, with ADR-019's evidence attached to the failure.
 */
export * from "./types.js";
export * from "./absence.js";
export * from "./registry.js";
export * from "./stats.js";
export * from "./collect.js";
export * from "./realInput.js";

// Registration side effects. Order is alphabetical by tier and does not matter — ids are unique
// and `allMetrics()` sorts — but it is fixed so a diff of this file is meaningful.
export * from "./tier1.js";
export * from "./tier2.js";
export * from "./tier34.js";
