/**
 * The local cache. `calibration.md` §2: loaders "write to `data-cache/` (gitignored) as
 * versioned parquet/JSON with a manifest".
 *
 * JSON, not parquet: v1 has no parquet dependency and no reason to add one. Rows are stored as
 * newline-delimited JSON (`rows.ndjson`) so a season can be streamed rather than held whole, and
 * so a corrupt tail truncates one row instead of destroying a file.
 *
 * Layout:
 *   data-cache/
 *     <source>/<season>/manifest.json
 *     <source>/<season>/rows.ndjson
 *     <source>/<season>/raw.bin        (optional; only when keepRaw is set)
 *
 * **No I/O outside the cache root.** Every path is composed from a validated id and resolved
 * back against the root before use.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import type { SourceManifest, SourceId } from "./manifest.js";
import { assertSeason, eligibilityOf, type Season } from "./seasons.js";

/** The default cache root, relative to the package. Gitignored at the repo root. */
export const DEFAULT_CACHE_DIR = "data-cache";

const SAFE_ID = /^[a-z0-9][a-z0-9_-]*$/;

export class CachePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CachePathError";
  }
}

export class CacheIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CacheIntegrityError";
  }
}

export function assertSafeSourceId(id: string): SourceId {
  if (!SAFE_ID.test(id)) {
    throw new CachePathError(
      `unsafe source id "${id}"; must match ${SAFE_ID.source} (no separators, no traversal)`,
    );
  }
  return id;
}

export interface CacheEntry<T> {
  readonly manifest: SourceManifest;
  readonly rows: readonly T[];
}

export interface CacheStore {
  readonly root: string;
  has(source: SourceId, season: Season): Promise<boolean>;
  readManifest(source: SourceId, season: Season): Promise<SourceManifest | null>;
  read<T>(source: SourceId, season: Season): Promise<CacheEntry<T> | null>;
  write<T>(manifest: SourceManifest, rows: readonly T[], raw?: Uint8Array): Promise<void>;
  /** Every manifest present, sorted by source then season. */
  listManifests(): Promise<SourceManifest[]>;
}

/** Resolve a child path and prove it stays under `root`. */
function safeJoin(root: string, ...parts: string[]): string {
  const abs = resolve(root, ...parts);
  const rootAbs = resolve(root);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + sep)) {
    throw new CachePathError(`refusing I/O outside the cache root: ${abs} is not under ${rootAbs}`);
  }
  return abs;
}

export function fsCacheStore(root: string = DEFAULT_CACHE_DIR): CacheStore {
  const rootAbs = isAbsolute(root) ? root : resolve(process.cwd(), root);

  const dirFor = (source: SourceId, season: Season): string =>
    safeJoin(rootAbs, assertSafeSourceId(source), String(assertSeason(season)));

  return {
    root: rootAbs,

    async has(source, season) {
      return existsSync(join(dirFor(source, season), "manifest.json"));
    },

    async readManifest(source, season) {
      const path = safeJoin(dirFor(source, season), "manifest.json");
      if (!existsSync(path)) return null;
      const parsed = JSON.parse(await readFile(path, "utf8")) as SourceManifest;
      validateManifest(parsed, source, season);
      return parsed;
    },

    async read<T>(source: SourceId, season: Season) {
      const manifest = await this.readManifest(source, season);
      if (manifest === null) return null;
      const rowsPath = safeJoin(dirFor(source, season), "rows.ndjson");
      if (!existsSync(rowsPath)) {
        throw new CacheIntegrityError(
          `${source}@${season}: manifest present but rows.ndjson missing; re-ingest this source`,
        );
      }
      const text = await readFile(rowsPath, "utf8");
      const rows: T[] = [];
      let line = 0;
      for (const raw of text.split("\n")) {
        if (raw.length === 0) continue;
        line++;
        try {
          rows.push(JSON.parse(raw) as T);
        } catch (e) {
          throw new CacheIntegrityError(
            `${source}@${season}: rows.ndjson line ${line} is not valid JSON (${(e as Error).message})`,
          );
        }
      }
      if (rows.length !== manifest.rowCount) {
        throw new CacheIntegrityError(
          `${source}@${season}: manifest declares ${manifest.rowCount} rows, file holds ${rows.length}`,
        );
      }
      return { manifest, rows };
    },

    async write<T>(manifest: SourceManifest, rows: readonly T[], raw?: Uint8Array) {
      if (rows.length !== manifest.rowCount) {
        throw new CacheIntegrityError(
          `refusing to write ${manifest.source}@${manifest.season}: manifest says ` +
            `${manifest.rowCount} rows, caller passed ${rows.length}`,
        );
      }
      validateManifest(manifest, manifest.source, manifest.season);
      const dir = dirFor(manifest.source, manifest.season);
      await mkdir(dir, { recursive: true });

      // rows first, then manifest — a manifest is only ever visible once its rows exist.
      const rowsTmp = safeJoin(dir, "rows.ndjson.tmp");
      const rowsPath = safeJoin(dir, "rows.ndjson");
      await writeFile(rowsTmp, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
      await rename(rowsTmp, rowsPath);

      if (raw !== undefined) {
        await writeFile(safeJoin(dir, "raw.bin"), raw);
      }

      const manTmp = safeJoin(dir, "manifest.json.tmp");
      await writeFile(manTmp, JSON.stringify(manifest, null, 2) + "\n", "utf8");
      await rename(manTmp, safeJoin(dir, "manifest.json"));
    },

    async listManifests() {
      if (!existsSync(rootAbs)) return [];
      const out: SourceManifest[] = [];
      for (const sourceDir of await readdir(rootAbs, { withFileTypes: true })) {
        if (!sourceDir.isDirectory() || !SAFE_ID.test(sourceDir.name)) continue;
        const sourcePath = safeJoin(rootAbs, sourceDir.name);
        for (const seasonDir of await readdir(sourcePath, { withFileTypes: true })) {
          if (!seasonDir.isDirectory() || !/^\d{4}$/.test(seasonDir.name)) continue;
          const path = safeJoin(sourcePath, seasonDir.name, "manifest.json");
          if (!existsSync(path)) continue;
          out.push(JSON.parse(await readFile(path, "utf8")) as SourceManifest);
        }
      }
      return out.sort((a, b) => a.source.localeCompare(b.source) || a.season - b.season);
    },
  };
}

/**
 * A cache entry must agree with its own location and with the eligibility rule. A hand-edited
 * manifest claiming 2025 is `TUNING` is exactly the accident calibration.md §7 is guarding
 * against, so it is rejected on read as well as on write.
 */
export function validateManifest(m: SourceManifest, source: SourceId, season: Season): void {
  if (m.source !== source || m.season !== season) {
    throw new CacheIntegrityError(
      `manifest at ${source}/${season} declares ${m.source}/${m.season}`,
    );
  }
  const expected = eligibilityOf(season);
  if (m.eligibility !== expected) {
    throw new CacheIntegrityError(
      `manifest ${source}@${season} declares eligibility "${m.eligibility}" but season ${season} ` +
        `is ${expected} (calibration.md §7)`,
    );
  }
  if (typeof m.schemaHash !== "string" || !m.schemaHash.startsWith("sha256:")) {
    throw new CacheIntegrityError(`manifest ${source}@${season} has no usable schemaHash`);
  }
}

/** In-memory store for tests and dry runs. Touches no filesystem at all. */
export function memoryCacheStore(): CacheStore {
  const entries = new Map<string, { manifest: SourceManifest; rows: readonly unknown[] }>();
  const key = (s: SourceId, y: Season) => `${assertSafeSourceId(s)}/${assertSeason(y)}`;
  return {
    root: "memory://data-cache",
    async has(s, y) {
      return entries.has(key(s, y));
    },
    async readManifest(s, y) {
      const e = entries.get(key(s, y));
      if (e === undefined) return null;
      validateManifest(e.manifest, s, y);
      return e.manifest;
    },
    async read<T>(s: SourceId, y: Season) {
      const e = entries.get(key(s, y));
      if (e === undefined) return null;
      validateManifest(e.manifest, s, y);
      return { manifest: e.manifest, rows: e.rows as readonly T[] };
    },
    async write(manifest, rows) {
      if (rows.length !== manifest.rowCount) {
        throw new CacheIntegrityError(
          `refusing to write ${manifest.source}@${manifest.season}: manifest says ` +
            `${manifest.rowCount} rows, caller passed ${rows.length}`,
        );
      }
      validateManifest(manifest, manifest.source, manifest.season);
      // round-trip through JSON so the memory store cannot accidentally be more permissive
      // than the filesystem one (Dates, undefined, Maps would all survive otherwise).
      entries.set(key(manifest.source, manifest.season), {
        manifest: JSON.parse(JSON.stringify(manifest)) as SourceManifest,
        rows: rows.map((r) => JSON.parse(JSON.stringify(r)) as unknown),
      });
    },
    async listManifests() {
      return [...entries.values()]
        .map((e) => e.manifest)
        .sort((a, b) => a.source.localeCompare(b.source) || a.season - b.season);
    },
  };
}
