/**
 * `@ff/calibration` — the arbiter. Spec: `docs/design/calibration.md`.
 *
 * Phase 1, deliverable 1 only: real-data ingestion, local cache, source manifests, and the
 * weekly-availability join. The batch harness, metric library, frozen play-caller and the four
 * reports are later deliverables and are deliberately absent.
 *
 * Import boundary: this package imports `@ff/contracts`, and (per ADR-012, when the harness
 * lands) `@ff/engine`'s four named surfaces. Ingestion needs neither.
 */

export * from "./ingest/index.js";
