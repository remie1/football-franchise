/**
 * The source manifest (`calibration.md` §2): `{source, season, fetchedAt, schemaHash}`.
 *
 * Those four are the contract. Everything else on `SourceManifest` is derived detail that makes
 * drift *diagnosable* rather than merely detectable — when a hash changes you want "column
 * `was_pressure` went boolean → string", not "the hash changed".
 *
 * Two hashes, deliberately distinct:
 *   - `schemaHash`  — over the column *shape* (names + value types). Changes when upstream
 *     restructures. This is the one the spec names.
 *   - `contentHash` — over the raw fetched bytes. Changes when upstream *revises* data with the
 *     same shape, which nflverse does routinely (PBP corrections). Conflating the two would
 *     make every routine revision look like schema drift, and drift alarms that cry wolf stop
 *     being read.
 */

import { createHash } from "node:crypto";
import type { ColumnProfile } from "./csv.js";
import { eligibilityOf, type Eligibility, type Season } from "./seasons.js";

export type SourceId = string;

export interface ManifestOrigin {
  /** URL fetched, or `fixture:<name>` when served from a committed fixture. */
  readonly url: string;
  readonly bytes: number;
  /** sha256 of the raw (pre-decompression) payload. */
  readonly contentHash: string;
}

export interface SourceManifest {
  // ---- the four the spec names ----
  readonly source: SourceId;
  readonly season: Season;
  /** ISO-8601 UTC. Data *about* a fetch; never an input to a simulation. */
  readonly fetchedAt: string;
  /** `sha256:<hex>` over the canonical schema pre-image (column names **and** value types). */
  readonly schemaHash: string;

  // ---- derived detail ----
  /**
   * `sha256:<hex>` over sorted column *names* only.
   *
   * Companion to `schemaHash`, and the difference between the two is diagnostic: same
   * `columnNameHash` with a different `schemaHash` means the column set is intact and only value
   * types moved — which is usually a sparsely-populated column rather than a redesign, and
   * warrants a different reaction from "six columns vanished".
   */
  readonly columnNameHash: string;
  /** Which declared upstream format matched this file's header. */
  readonly formatId: string;
  /** Baked in so a cache file declares its own eligibility (calibration.md §7). */
  readonly eligibility: Eligibility;
  /** Rows persisted to cache for this season. */
  readonly rowCount: number;
  /**
   * Rows present in the upstream asset. Differs from `rowCount` for season-agnostic assets
   * (`schedules/games.csv` is every season since 1999; NGS 2025 only exists inside the
   * all-seasons file), which are scanned whole and then filtered.
   */
  readonly scannedRowCount: number;
  readonly columnCount: number;
  /** The pre-image of `schemaHash`, kept so drift can be diffed rather than just detected. */
  readonly columns: readonly ColumnProfile[];
  /** Columns persisted to cache; `null` means all of them. */
  readonly projection: readonly string[] | null;
  readonly origin: ManifestOrigin;
  /** Bumped when *our* parser/projection changes, invalidating cached rows. */
  readonly ingestVersion: number;
}

export function sha256(data: string | Uint8Array): string {
  const h = createHash("sha256");
  h.update(typeof data === "string" ? Buffer.from(data, "utf8") : data);
  return `sha256:${h.digest("hex")}`;
}

/**
 * Canonical pre-image for `schemaHash`.
 *
 * Sorted by column name, so a pure reordering of upstream columns does **not** trip the alarm —
 * every parser here is name-addressed, so a reorder is genuinely benign, and a hash that fires
 * on benign changes gets ignored. Each entry is `name:type`, so a type change fires.
 *
 * `populated` is deliberately excluded: a column that happens to be all-empty in one season and
 * populated in another is a data fact, not a schema fact, and including it would make the hash
 * season-dependent for a source whose shape never changed.
 */
export function schemaPreImage(profile: readonly ColumnProfile[]): string {
  return [...profile]
    .map((c) => `${c.name}:${c.type}`)
    .sort()
    .join("\n");
}

export function computeSchemaHash(profile: readonly ColumnProfile[]): string {
  return sha256(schemaPreImage(profile));
}

export function computeColumnNameHash(profile: readonly ColumnProfile[]): string {
  return sha256(
    [...profile]
      .map((c) => c.name)
      .sort()
      .join("\n"),
  );
}

export interface BuildManifestInput {
  readonly source: SourceId;
  readonly season: Season;
  readonly fetchedAt: string;
  readonly profile: readonly ColumnProfile[];
  readonly rowCount: number;
  readonly scannedRowCount: number;
  readonly projection: readonly string[] | null;
  readonly origin: ManifestOrigin;
  readonly ingestVersion: number;
  readonly formatId: string;
}

export function buildManifest(input: BuildManifestInput): SourceManifest {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(input.fetchedAt)) {
    throw new TypeError(`fetchedAt must be ISO-8601 UTC with a Z suffix, got "${input.fetchedAt}"`);
  }
  return {
    source: input.source,
    season: input.season,
    fetchedAt: input.fetchedAt,
    schemaHash: computeSchemaHash(input.profile),
    columnNameHash: computeColumnNameHash(input.profile),
    formatId: input.formatId,
    eligibility: eligibilityOf(input.season),
    rowCount: input.rowCount,
    scannedRowCount: input.scannedRowCount,
    columnCount: input.profile.length,
    columns: input.profile,
    projection: input.projection,
    origin: input.origin,
    ingestVersion: input.ingestVersion,
  };
}

// ---------------------------------------------------------------- drift ----

export type ColumnDriftKind = "added" | "removed" | "retyped";

export interface ColumnDrift {
  readonly kind: ColumnDriftKind;
  readonly column: string;
  readonly before?: string;
  readonly after?: string;
}

export interface DriftReport {
  readonly source: SourceId;
  readonly season: Season;
  /** true when `schemaHash` differs. */
  readonly schemaChanged: boolean;
  /** true when the set of column *names* changed — the more serious half of schema drift. */
  readonly columnSetChanged: boolean;
  /** true when the source parsed under a different declared format than last time. */
  readonly formatChanged: boolean;
  /** true when the bytes differ but the schema does not — an upstream data revision. */
  readonly contentRevised: boolean;
  readonly rowCountDelta: number;
  readonly columns: readonly ColumnDrift[];
  readonly before: { schemaHash: string; fetchedAt: string; rowCount: number };
  readonly after: { schemaHash: string; fetchedAt: string; rowCount: number };
}

/** Diff two manifests for the same source+season. */
export function diffManifests(before: SourceManifest, after: SourceManifest): DriftReport {
  if (before.source !== after.source || before.season !== after.season) {
    throw new Error(
      `diffManifests: mismatched subjects ${before.source}@${before.season} vs ${after.source}@${after.season}`,
    );
  }
  const beforeCols = new Map(before.columns.map((c) => [c.name, c]));
  const afterCols = new Map(after.columns.map((c) => [c.name, c]));
  const drift: ColumnDrift[] = [];
  for (const [name, b] of beforeCols) {
    const a = afterCols.get(name);
    if (a === undefined) {
      drift.push({ kind: "removed", column: name, before: b.type });
    } else if (a.type !== b.type) {
      drift.push({ kind: "retyped", column: name, before: b.type, after: a.type });
    }
  }
  for (const [name, a] of afterCols) {
    if (!beforeCols.has(name)) drift.push({ kind: "added", column: name, after: a.type });
  }
  drift.sort((x, y) => x.column.localeCompare(y.column));
  const schemaChanged = before.schemaHash !== after.schemaHash;
  return {
    source: after.source,
    season: after.season,
    schemaChanged,
    columnSetChanged: before.columnNameHash !== after.columnNameHash,
    formatChanged: before.formatId !== after.formatId,
    contentRevised: !schemaChanged && before.origin.contentHash !== after.origin.contentHash,
    rowCountDelta: after.rowCount - before.rowCount,
    columns: drift,
    before: { schemaHash: before.schemaHash, fetchedAt: before.fetchedAt, rowCount: before.rowCount },
    after: { schemaHash: after.schemaHash, fetchedAt: after.fetchedAt, rowCount: after.rowCount },
  };
}

export function formatDrift(report: DriftReport): string {
  const head = `${report.source}@${report.season}`;
  if (!report.schemaChanged && !report.contentRevised && report.rowCountDelta === 0) {
    return `${head}: unchanged`;
  }
  const lines: string[] = [];
  if (report.formatChanged) lines.push(`${head}: FORMAT CHANGED — reparsed under a different declared format`);
  if (report.schemaChanged) {
    lines.push(
      `${head}: SCHEMA DRIFT (${report.columnSetChanged ? "column set changed" : "value types only"}) ` +
        `${report.before.schemaHash} -> ${report.after.schemaHash}`,
    );
    for (const d of report.columns) {
      lines.push(
        d.kind === "retyped"
          ? `  retyped  ${d.column}: ${d.before} -> ${d.after}`
          : d.kind === "added"
            ? `  added    ${d.column} (${d.after})`
            : `  removed  ${d.column} (was ${d.before})`,
      );
    }
  } else if (report.contentRevised) {
    lines.push(`${head}: data revised upstream (same schema)`);
  }
  if (report.rowCountDelta !== 0) {
    lines.push(`  rows ${report.before.rowCount} -> ${report.after.rowCount} (${report.rowCountDelta >= 0 ? "+" : ""}${report.rowCountDelta})`);
  }
  return lines.join("\n");
}

/** Clock seam so `fetchedAt` never makes a test non-deterministic. */
export interface Clock {
  nowIso(): string;
}

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
};

export function fixedClock(iso: string): Clock {
  return { nowIso: () => iso };
}
