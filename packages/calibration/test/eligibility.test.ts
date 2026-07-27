/**
 * The held-out-season contract (`calibration.md` §7) as executable assertions.
 *
 * The compile-time half of this guard cannot be asserted at runtime, so the type errors are
 * pinned with `@ts-expect-error` — which fails the build if the guard ever stops holding.
 */

import { describe, expect, it } from "vitest";
import {
  assertTuningEvidence,
  citeManifests,
  declareCheckpoint,
  DECLARED_CHECKPOINTS,
  heldOutSubset,
  HeldOutSeasonError,
  makeEvidence,
  poolEvidence,
  type Evidence,
  type HeldOutEvidence,
  type TuningEvidence,
} from "../src/ingest/eligibility.js";
import type { SourceManifest } from "../src/ingest/manifest.js";
import { buildManifest, sha256 } from "../src/ingest/manifest.js";
import type { Eligibility, Season } from "../src/ingest/seasons.js";
import { TEST_FETCHED_AT } from "./fixtures.js";

const manifest = (season: Season): SourceManifest =>
  buildManifest({
    source: "test_source",
    season,
    fetchedAt: TEST_FETCHED_AT,
    profile: [{ name: "a", type: "integer", populated: true }],
    rowCount: 1,
    scannedRowCount: 1,
    projection: null,
    origin: { url: "fixture:test", bytes: 1, contentHash: sha256("x") },
    ingestVersion: 1,
    formatId: "v1",
  });

const tuning = makeEvidence<number, "TUNING">("TUNING", [1, 2], [2022, 2023] as Season[], [
  manifest(2022 as Season),
  manifest(2023 as Season),
]);
const heldOut = makeEvidence<number, "HELD_OUT">("HELD_OUT", [3], [2025] as Season[], [
  manifest(2025 as Season),
]);

describe("the evidence brand", () => {
  it("does not let held-out evidence stand in for tuning evidence (compile time)", () => {
    const accept = (_e: TuningEvidence<number>): void => {};
    accept(tuning);
    // @ts-expect-error — 2025 evidence must not satisfy a tuning-only consumer.
    accept(heldOut);
  });

  it("does not let tuning evidence stand in for held-out evidence either", () => {
    const accept = (_e: HeldOutEvidence<number>): void => {};
    accept(heldOut);
    // @ts-expect-error — the brand is invariant in both directions.
    accept(tuning);
  });

  it("catches a cast at runtime as well", () => {
    const smuggled = heldOut as unknown as Evidence<number, Eligibility>;
    expect(() => assertTuningEvidence(smuggled, "a tunable patch")).toThrow(HeldOutSeasonError);
  });

  it("accepts genuine tuning evidence", () => {
    expect(() => assertTuningEvidence(tuning, "a tunable patch")).not.toThrow();
  });

  it("catches a manifest-level lie: TUNING brand carrying a sacred season", () => {
    const lying = makeEvidence<number, "TUNING">("TUNING", [9], [2025] as Season[], [manifest(2025 as Season)]);
    expect(() => assertTuningEvidence(lying, "a rating patch")).toThrow(/2025/);
  });
});

describe("pooling", () => {
  it("preserves the brand when pooling like with like", () => {
    const pooled = poolEvidence(tuning, tuning);
    expect(pooled.eligibility).toBe("TUNING");
    expect(pooled.rows).toEqual([1, 2, 1, 2]);
    expect(pooled.seasons).toEqual([2022, 2023]);
    const accept = (_e: TuningEvidence<number>): void => {};
    accept(pooled);
  });

  it("contaminates the pool when a held-out batch is mixed in", () => {
    const mixed = poolEvidence<number, Eligibility>(tuning, heldOut);
    expect(mixed.eligibility).toBe("HELD_OUT");
    expect(mixed.seasons).toEqual([2022, 2023, 2025]);
    expect(() => assertTuningEvidence(mixed, "a pooled baseline")).toThrow(HeldOutSeasonError);
    const accept = (_e: TuningEvidence<number>): void => {};
    // @ts-expect-error — a contaminated pool is not tuning evidence.
    accept(mixed);
  });

  it("refuses to pool nothing", () => {
    expect(() => poolEvidence()).toThrow(/nothing to pool/);
  });
});

describe("declared checkpoints", () => {
  it("enumerates the only reasons 2025 may be read", () => {
    expect([...DECLARED_CHECKPOINTS]).toEqual(["PHASE_3_EXIT", "PRE_V1_SHIP"]);
  });

  it("requires an author and a decision-record reference", () => {
    expect(() =>
      declareCheckpoint({ checkpoint: "PHASE_3_EXIT", declaredBy: "", reference: "ADR-020" }),
    ).toThrow(/declaredBy/);
    expect(() =>
      declareCheckpoint({ checkpoint: "PHASE_3_EXIT", declaredBy: "orchestrator", reference: "  " }),
    ).toThrow(/reference/);
  });

  it("rejects an invented checkpoint at compile time", () => {
    declareCheckpoint({ checkpoint: "PRE_V1_SHIP", declaredBy: "orchestrator", reference: "ADR-020" });
    declareCheckpoint({
      // @ts-expect-error — checkpoints are a closed set.
      checkpoint: "JUST_CURIOUS",
      declaredBy: "orchestrator",
      reference: "ADR-020",
    });
  });

  it("cannot be forged from a plain object literal", () => {
    const accept = (_t: ReturnType<typeof declareCheckpoint>): void => {};
    // @ts-expect-error — the token is branded; only declareCheckpoint mints one.
    accept({ checkpoint: "PHASE_3_EXIT", declaredBy: "me", reference: "r" });
  });
});

describe("helpers", () => {
  it("identifies the sacred subset of a season list", () => {
    expect(heldOutSubset([2022, 2024, 2025] as Season[])).toEqual([2025]);
    expect(heldOutSubset([2022, 2024] as Season[])).toEqual([]);
  });

  it("produces a citation line per manifest for report footers", () => {
    const lines = citeManifests(tuning);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^test_source@2022 schema=sha256:[0-9a-f]{12} fetched=/);
  });
});
