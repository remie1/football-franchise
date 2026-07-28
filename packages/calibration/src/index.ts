/**
 * `@ff/calibration` — the arbiter. Spec: `docs/design/calibration.md`.
 *
 * Phase 1 deliverables 1-4:
 *   1. ingestion, cache, manifests, weekly-availability join          `ingest/`
 *   2. the metric library, with real-side computations                `metrics/`
 *   3. the batch harness + the frozen play-caller + per-week rosters  `harness/`, `caller/`, `league/`
 *   4. the synthetic known-truth harness                              `knownTruth/`
 *
 * Deliverable 5 — the first baseline report — is `report/`, and lands the day a full-game batch
 * runs against a league somebody can defend.
 *
 * IMPORT BOUNDARY. This package imports:
 *   - `@ff/contracts`, always;
 *   - `@ff/engine`, through **ADR-012's named surface only** — the simulation entry points and
 *     their types, the tunables-patch interface (`Tunables`, `DEFAULT_TUNABLES`,
 *     `applyTunablePatch`), the debug renderer, and the statline reducer. Never a resolver,
 *     never `bandFor`, never `TUNABLES` as a mutable value;
 *   - `@ff/playbook` (ADR-017), the corpus the frozen caller selects from.
 *
 * ★ THE METRIC LIBRARY HAS DECLARED ABSENCES. ★ `metrics/absence.ts` names four metrics this
 * library should have and deliberately does not — first among them **coverage quality
 * (separation at the throw)** — each with the numbers that must not be substituted for it and
 * the evidence for why. `registerMetric` enforces it; every baseline report prints it.
 */

export * from "./ingest/index.js";

export * from "./league/provenance.js";
export * from "./league/roster.js";
export * from "./league/flat.js";
export * from "./league/archetype.js";
export * from "./league/snapshot.js";

export * from "./caller/tendencies.js";
export * from "./caller/fourthDown.js";
export * from "./caller/fit.js";
export * from "./caller/frozen.js";
export * from "./caller/frozenTendencies.js";

export * from "./metrics/index.js";

export * from "./harness/seeds.js";
export * from "./harness/schedule.js";
export * from "./harness/runGame.js";
export * from "./harness/batch.js";
export * from "./harness/workerPool.js";

export * from "./report/bands.js";
export * from "./report/baseline.js";

export * from "./knownTruth/scenarios.js";
export * from "./knownTruth/assertions.js";
