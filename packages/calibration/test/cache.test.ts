import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertSafeSourceId,
  CacheIntegrityError,
  CachePathError,
  fsCacheStore,
  memoryCacheStore,
  validateManifest,
  type CacheStore,
} from "../src/ingest/cache.js";
import { buildManifest, sha256, type SourceManifest } from "../src/ingest/manifest.js";
import type { Season } from "../src/ingest/seasons.js";
import { TEST_FETCHED_AT } from "./fixtures.js";

const roots: string[] = [];
const tempRoot = (): string => {
  const r = mkdtempSync(join(tmpdir(), "ff-cal-cache-"));
  roots.push(r);
  return r;
};
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

interface Row {
  readonly id: number;
  readonly name: string;
  readonly maybe: string | null;
}

const rows: Row[] = [
  { id: 1, name: "plain", maybe: null },
  { id: 2, name: 'has "quotes" and, commas', maybe: "x" },
  { id: 3, name: "line\nbreak", maybe: null },
];

const manifestFor = (season: Season, rowCount = rows.length, source = "test_source"): SourceManifest =>
  buildManifest({
    source,
    season,
    fetchedAt: TEST_FETCHED_AT,
    profile: [
      { name: "id", type: "integer", populated: true },
      { name: "name", type: "string", populated: true },
    ],
    rowCount,
    scannedRowCount: rowCount,
    projection: null,
    origin: { url: "fixture:test", bytes: 42, contentHash: sha256("payload") },
    ingestVersion: 1,
    formatId: "v1",
  });

const bothStores = (): [string, () => CacheStore][] => [
  ["fs", () => fsCacheStore(tempRoot())],
  ["memory", () => memoryCacheStore()],
];

for (const [label, make] of bothStores()) {
  describe(`${label} cache store`, () => {
    it("round-trips rows and manifest", async () => {
      const store = make();
      const m = manifestFor(2023 as Season);
      await store.write(m, rows);
      expect(await store.has("test_source", 2023 as Season)).toBe(true);
      const back = await store.read<Row>("test_source", 2023 as Season);
      expect(back).not.toBeNull();
      expect(back!.rows).toEqual(rows);
      expect(back!.manifest).toEqual(m);
    });

    it("returns null for a miss rather than throwing", async () => {
      const store = make();
      expect(await store.read("test_source", 2022 as Season)).toBeNull();
      expect(await store.readManifest("test_source", 2022 as Season)).toBeNull();
      expect(await store.has("test_source", 2022 as Season)).toBe(false);
    });

    it("refuses to write when the manifest row count disagrees with the rows", async () => {
      const store = make();
      await expect(store.write(manifestFor(2023 as Season, 99), rows)).rejects.toThrow(CacheIntegrityError);
    });

    it("lists manifests sorted by source then season", async () => {
      const store = make();
      await store.write(manifestFor(2024 as Season, rows.length, "zzz"), rows);
      await store.write(manifestFor(2022 as Season), rows);
      await store.write(manifestFor(2023 as Season), rows);
      expect((await store.listManifests()).map((m) => `${m.source}@${m.season}`)).toEqual([
        "test_source@2022",
        "test_source@2023",
        "zzz@2024",
      ]);
    });

    it("preserves eligibility on a held-out season", async () => {
      const store = make();
      await store.write(manifestFor(2025 as Season), rows);
      expect((await store.readManifest("test_source", 2025 as Season))!.eligibility).toBe("HELD_OUT");
    });
  });
}

describe("path safety", () => {
  it("accepts well-formed source ids", () => {
    expect(assertSafeSourceId("weekly_rosters")).toBe("weekly_rosters");
    expect(assertSafeSourceId("ngs-passing")).toBe("ngs-passing");
  });

  it("rejects traversal and separators", () => {
    for (const bad of ["..", "../x", "a/b", "a\\b", "/abs", "C:x", "", "Upper"]) {
      expect(() => assertSafeSourceId(bad), bad).toThrow(CachePathError);
    }
  });

  it("keeps all filesystem I/O under the cache root", async () => {
    const root = tempRoot();
    const store = fsCacheStore(root);
    await expect(store.has("../escape", 2023 as Season)).rejects.toThrow(CachePathError);
    await store.write(manifestFor(2023 as Season), rows);
    expect(readFileSync(join(root, "test_source", "2023", "manifest.json"), "utf8")).toContain("schemaHash");
  });
});

describe("integrity on read", () => {
  it("rejects a manifest whose declared season contradicts its location", async () => {
    const root = tempRoot();
    const store = fsCacheStore(root);
    mkdirSync(join(root, "test_source", "2023"), { recursive: true });
    writeFileSync(
      join(root, "test_source", "2023", "manifest.json"),
      JSON.stringify(manifestFor(2022 as Season)),
      "utf8",
    );
    await expect(store.readManifest("test_source", 2023 as Season)).rejects.toThrow(/declares/);
  });

  it("rejects a hand-edited manifest claiming 2025 is tunable", () => {
    const tampered = { ...manifestFor(2025 as Season), eligibility: "TUNING" } as SourceManifest;
    expect(() => validateManifest(tampered, "test_source", 2025 as Season)).toThrow(/calibration.md §7/);
  });

  it("rejects a manifest without a usable schemaHash", () => {
    const tampered = { ...manifestFor(2023 as Season), schemaHash: "md5:oops" } as SourceManifest;
    expect(() => validateManifest(tampered, "test_source", 2023 as Season)).toThrow(/schemaHash/);
  });

  it("detects a truncated rows file", async () => {
    const root = tempRoot();
    const store = fsCacheStore(root);
    await store.write(manifestFor(2023 as Season), rows);
    writeFileSync(join(root, "test_source", "2023", "rows.ndjson"), JSON.stringify(rows[0]) + "\n", "utf8");
    await expect(store.read("test_source", 2023 as Season)).rejects.toThrow(/declares 3 rows, file holds 1/);
  });

  it("detects a corrupt row line", async () => {
    const root = tempRoot();
    const store = fsCacheStore(root);
    await store.write(manifestFor(2023 as Season), rows);
    writeFileSync(
      join(root, "test_source", "2023", "rows.ndjson"),
      [JSON.stringify(rows[0]), "{not json", JSON.stringify(rows[2])].join("\n") + "\n",
      "utf8",
    );
    await expect(store.read("test_source", 2023 as Season)).rejects.toThrow(/line 2 is not valid JSON/);
  });

  it("detects a manifest with no rows file beside it", async () => {
    const root = tempRoot();
    const store = fsCacheStore(root);
    await store.write(manifestFor(2023 as Season), rows);
    rmSync(join(root, "test_source", "2023", "rows.ndjson"));
    await expect(store.read("test_source", 2023 as Season)).rejects.toThrow(/rows.ndjson missing/);
  });
});
