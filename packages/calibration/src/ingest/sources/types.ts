/**
 * What a source *is*: an asset URL per season, a required-column contract, a projection, and a
 * row decoder. Everything else about ingestion (fetch, decompress, scan, hash, cache, drift) is
 * generic and lives in `run.ts`.
 */

import type { SourceId } from "../manifest.js";
import type { Season } from "../seasons.js";

/** nflverse publishes as GitHub release assets, one release tag per dataset family. */
export const NFLVERSE_RELEASE_BASE = "https://github.com/nflverse/nflverse-data/releases/download";

export function nflverseAsset(tag: string, asset: string): string {
  return `${NFLVERSE_RELEASE_BASE}/${tag}/${asset}`;
}

/** Column-name-addressed view over one scanned row. Names, never positions. */
export interface RowView {
  /** Raw cell, `""` when absent or empty. */
  raw(column: string): string;
  /** Trimmed cell, or `null` when empty. */
  text(column: string): string | null;
  /** Non-empty cell; throws when missing. */
  req(column: string): string;
  int(column: string): number | null;
  num(column: string): number | null;
  /** Accepts `TRUE/FALSE`, `true/false`, `1/0`. */
  bool(column: string): boolean | null;
  /** Semicolon-separated list (nflverse participation player lists). */
  list(column: string, separator?: string): string[];
}

export class RowDecodeError extends Error {
  constructor(source: SourceId, season: Season, rowIndex: number, message: string) {
    super(`${source}@${season} row ${rowIndex}: ${message}`);
    this.name = "RowDecodeError";
  }
}

export function makeRowView(keptColumns: readonly string[]): {
  view: RowView;
  bind(values: readonly string[]): void;
} {
  const index = new Map<string, number>();
  keptColumns.forEach((c, i) => index.set(c, i));
  let current: readonly string[] = [];

  const raw = (column: string): string => {
    const i = index.get(column);
    return i === undefined ? "" : (current[i] ?? "");
  };

  const view: RowView = {
    raw,
    text(column) {
      const v = raw(column).trim();
      return v.length === 0 ? null : v;
    },
    req(column) {
      const v = raw(column).trim();
      if (v.length === 0) throw new Error(`required column "${column}" is empty or absent`);
      return v;
    },
    int(column) {
      const v = raw(column).trim();
      if (v.length === 0) return null;
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.trunc(n);
    },
    num(column) {
      const v = raw(column).trim();
      if (v.length === 0) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    },
    bool(column) {
      const v = raw(column).trim();
      if (v.length === 0) return null;
      if (v === "1" || v === "TRUE" || v === "true" || v === "True") return true;
      if (v === "0" || v === "FALSE" || v === "false" || v === "False") return false;
      return null;
    },
    list(column, separator = ";") {
      const v = raw(column).trim();
      if (v.length === 0) return [];
      return v.split(separator).map((s) => s.trim()).filter((s) => s.length > 0);
    },
  };

  return {
    view,
    bind(values) {
      current = values;
    },
  };
}

/**
 * One upstream shape of a source.
 *
 * Sources have more than one shape more often than is comfortable: nflverse replaced
 * `depth_charts` wholesale for 2025 (weekly rows keyed by season/week became daily snapshots
 * keyed by a timestamp). Formats are selected from the *actual header*, not from the season, so a
 * format change lands in whichever season it lands in and the manifest records which one was
 * parsed.
 */
export interface SourceFormat<TRow> {
  /** Recorded in the manifest as `formatId`. */
  readonly id: string;
  /** Absent from the header => this format did not arrive. */
  readonly requiredColumns: readonly string[];
  /** Columns materialised and persisted. `null` = all. Profiling always covers all. */
  readonly projection: readonly string[] | null;
  /**
   * Decode one row. Return `null` to drop it — used by season-agnostic assets to keep only the
   * requested season.
   */
  parseRow(row: RowView, season: Season, rowIndex: number): TRow | null;
  /**
   * Optional extra discriminator, for the case where two formats share their required columns.
   * Defaults to "every required column is present".
   */
  matches?(columns: readonly string[]): boolean;
}

export function formatMatches(format: SourceFormat<unknown>, columns: readonly string[]): boolean {
  const present = new Set(columns);
  if (!format.requiredColumns.every((c) => present.has(c))) return false;
  return format.matches?.(columns) ?? true;
}

export interface SourceDefinition<TRow> {
  readonly id: SourceId;
  /** One line, shown by `ingest --list`. */
  readonly description: string;
  /**
   * Bump when a projection or `parseRow` changes in a way that invalidates cached rows.
   * `run.ts` re-ingests when the cached manifest's `ingestVersion` is lower.
   */
  readonly ingestVersion: number;
  /**
   * Candidate asset URLs in priority order. The first that fetches wins — this is how NGS falls
   * back between the all-seasons file and the per-season ones.
   */
  assetUrls(season: Season): readonly string[];
  /** Accepted upstream shapes, in priority order. First match wins. */
  readonly formats: readonly SourceFormat<TRow>[];
  /**
   * Plausibility floor. An ingest that persists fewer rows than this fails loudly instead of
   * writing a thin cache. nflverse's `ngs_2024_*` per-season assets are published but contain
   * four rows; without a floor that silently becomes a baseline computed from four players.
   */
  minRows?(season: Season): number;
}

/**
 * Existential form for the heterogeneous registry. `TRow` appears only in return position, so
 * every concrete `SourceDefinition<X>` is assignable here without a cast.
 */
export type AnySourceDefinition = SourceDefinition<unknown>;
