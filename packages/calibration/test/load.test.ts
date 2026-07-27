import { describe, expect, it } from "vitest";
import { memoryCacheStore } from "../src/ingest/cache.js";
import { declareCheckpoint, HeldOutSeasonError, type TuningEvidence } from "../src/ingest/eligibility.js";
import { MissingCacheError, openForInspection, openForTuning, openHeldOut, openManifests } from "../src/ingest/load.js";
import { buildManifest, sha256, type SourceManifest } from "../src/ingest/manifest.js";
import type { Season } from "../src/ingest/seasons.js";
import { TEST_FETCHED_AT } from "./fixtures.js";

interface Row {
  readonly season: number;
  readonly value: number;
}

const manifest = (season: Season, rowCount: number, source = "test_source"): SourceManifest =>
  buildManifest({
    source,
    season,
    fetchedAt: TEST_FETCHED_AT,
    profile: [{ name: "value", type: "integer", populated: true }],
    rowCount,
    scannedRowCount: rowCount,
    projection: null,
    origin: { url: "fixture:test", bytes: 1, contentHash: sha256(`${source}${season}`) },
    ingestVersion: 1,
    formatId: "v1",
  });

async function seed() {
  const store = memoryCacheStore();
  for (const season of [2022, 2023, 2024, 2025] as Season[]) {
    const rows: Row[] = [
      { season, value: season * 10 },
      { season, value: season * 10 + 1 },
    ];
    await store.write(manifest(season, rows.length), rows);
  }
  return store;
}

const checkpoint = declareCheckpoint({
  checkpoint: "PHASE_3_EXIT",
  declaredBy: "orchestrator",
  reference: "docs/decisions/ADR-0XX.md",
});

describe("openForTuning", () => {
  it("returns pooled rows and manifests for tuning seasons", async () => {
    const store = await seed();
    const evidence = await openForTuning<Row>(store, "test_source", [2022, 2023, 2024] as Season[]);
    expect(evidence.eligibility).toBe("TUNING");
    expect(evidence.rows).toHaveLength(6);
    expect(evidence.manifests.map((m) => m.season)).toEqual([2022, 2023, 2024]);
    const accept = (_e: TuningEvidence<Row>): void => {};
    accept(evidence);
  });

  it("refuses 2025 and says why", async () => {
    const store = await seed();
    await expect(openForTuning<Row>(store, "test_source", [2025 as Season])).rejects.toThrow(
      HeldOutSeasonError,
    );
    await expect(openForTuning<Row>(store, "test_source", [2025 as Season])).rejects.toThrow(
      /tune on 2022–2024; 2025 is sacred/,
    );
  });

  it("refuses a request that merely includes 2025", async () => {
    const store = await seed();
    await expect(
      openForTuning<Row>(store, "test_source", [2022, 2023, 2024, 2025] as Season[]),
    ).rejects.toThrow(HeldOutSeasonError);
  });

  it("reports a missing cache entry with the command that would fix it", async () => {
    const store = memoryCacheStore();
    await expect(openForTuning<Row>(store, "test_source", [2023 as Season])).rejects.toThrow(
      MissingCacheError,
    );
    await expect(openForTuning<Row>(store, "test_source", [2023 as Season])).rejects.toThrow(
      /pnpm --filter @ff\/calibration ingest --seasons 2023 --sources test_source/,
    );
  });
});

describe("openHeldOut", () => {
  it("returns held-out evidence when a checkpoint is declared", async () => {
    const store = await seed();
    const evidence = await openHeldOut<Row>(store, "test_source", [2025 as Season], checkpoint);
    expect(evidence.eligibility).toBe("HELD_OUT");
    expect(evidence.rows).toHaveLength(2);
  });

  it("cannot be called without a token (compile time)", async () => {
    const store = await seed();
    // @ts-expect-error — the checkpoint token is required, not optional. The call is made so the
    // arity error is real; it succeeds at runtime because the token is a compile-time gate.
    await openHeldOut<Row>(store, "test_source", [2025 as Season]);
  });

  it("refuses to launder tuning seasons through the held-out door", async () => {
    const store = await seed();
    await expect(
      openHeldOut<Row>(store, "test_source", [2023 as Season], checkpoint),
    ).rejects.toThrow(/are not held out; use openForTuning/);
  });
});

describe("openManifests", () => {
  it("reads provenance across every season including the sacred one", async () => {
    const store = await seed();
    const all = await openManifests(store);
    expect(all.map((m) => m.season)).toEqual([2022, 2023, 2024, 2025]);
    expect(all.find((m) => m.season === 2025)!.eligibility).toBe("HELD_OUT");
  });

  it("filters by source", async () => {
    const store = await seed();
    expect(await openManifests(store, "nope")).toEqual([]);
  });
});

describe("large seasons", () => {
  it("pools a season far larger than the spread-argument limit", async () => {
    const store = memoryCacheStore();
    const big: Row[] = Array.from({ length: 250_000 }, (_, i) => ({ season: 2023, value: i }));
    await store.write(manifest(2023 as Season, big.length), big);
    const evidence = await openForTuning<Row>(store, "test_source", [2023 as Season]);
    expect(evidence.rows).toHaveLength(big.length);
  });
});

describe("openForInspection", () => {
  it("spans both cohorts but marks the result held-out", async () => {
    const store = await seed();
    const e = await openForInspection<Row>(
      store,
      "test_source",
      [2024, 2025] as Season[],
      "ingest status report",
    );
    expect(e.eligibility).toBe("HELD_OUT");
    expect(e.rows).toHaveLength(4);
  });

  it("demands a stated reason", async () => {
    const store = await seed();
    await expect(
      openForInspection<Row>(store, "test_source", [2024 as Season], "  "),
    ).rejects.toThrow(/reason is required/);
  });
});
