/**
 * The generic ingest pipeline: fetch → decode → scan (project + profile) → decode rows →
 * manifest → drift diff → cache.
 *
 * Everything source-specific lives in `sources/`; everything network-specific lives behind
 * `Fetcher`. This file is therefore fully testable offline with `fixtureFetcher` +
 * `memoryCacheStore`, which is how it is tested.
 */

import type { CacheStore } from "./cache.js";
import { readCsvHeader, scanCsv, type ColumnProfile } from "./csv.js";
import { decodeText, type Fetcher, FetchError } from "./fetcher.js";
import {
  buildManifest,
  diffManifests,
  sha256,
  systemClock,
  type Clock,
  type DriftReport,
  type SourceId,
  type SourceManifest,
} from "./manifest.js";
import { eligibilityOf, type Season } from "./seasons.js";
import {
  formatMatches,
  makeRowView,
  type AnySourceDefinition,
  type SourceDefinition,
  type SourceFormat,
} from "./sources/types.js";

export interface IngestOptions {
  readonly fetcher: Fetcher;
  readonly store: CacheStore;
  readonly clock?: Clock;
  /** Re-fetch even when a current cache entry exists. */
  readonly force?: boolean;
  /** Persist the raw payload beside the rows. Off by default; the cache is big enough. */
  readonly keepRaw?: boolean;
  readonly log?: (line: string) => void;
}

export type IngestOutcome = "fetched" | "cached" | "skipped";

export interface IngestResult {
  readonly source: SourceId;
  readonly season: Season;
  readonly outcome: IngestOutcome;
  readonly manifest: SourceManifest;
  /** Non-null when this season had a previous manifest to compare against. */
  readonly drift: DriftReport | null;
  /** URL that actually served the data (candidates are tried in order). */
  readonly url: string;
  /** Which declared upstream format matched. */
  readonly formatId: string;
  readonly warnings: readonly string[];
  readonly elapsedMs: number;
}

export class IngestError extends Error {
  readonly source: SourceId;
  readonly season: Season;
  constructor(source: SourceId, season: Season, message: string, options?: { cause?: unknown }) {
    super(`ingest ${source}@${season}: ${message}`, options);
    this.name = "IngestError";
    this.source = source;
    this.season = season;
  }
}

/** Ingest one source for one season. */
export async function ingestSource<T>(
  definition: SourceDefinition<T>,
  season: Season,
  options: IngestOptions,
): Promise<IngestResult> {
  const startedAt = Date.now();
  const clock = options.clock ?? systemClock;
  const log = options.log ?? (() => {});
  const warnings: string[] = [];

  const previous = await options.store.readManifest(definition.id, season);
  if (
    previous !== null &&
    options.force !== true &&
    previous.ingestVersion >= definition.ingestVersion
  ) {
    return {
      source: definition.id,
      season,
      outcome: "cached",
      manifest: previous,
      drift: null,
      url: previous.origin.url,
      formatId: previous.formatId,
      warnings,
      elapsedMs: Date.now() - startedAt,
    };
  }
  if (previous !== null && previous.ingestVersion < definition.ingestVersion) {
    warnings.push(
      `re-ingesting: cached ingestVersion ${previous.ingestVersion} < current ${definition.ingestVersion}`,
    );
  }

  const candidates = definition.assetUrls(season);
  if (candidates.length === 0) {
    throw new IngestError(definition.id, season, "source declares no asset URLs");
  }

  let payload: { url: string; body: Uint8Array } | null = null;
  const attemptErrors: string[] = [];
  for (const url of candidates) {
    try {
      const res = await options.fetcher.fetch(url);
      payload = { url, body: res.body };
      break;
    } catch (e) {
      attemptErrors.push(`${url} -> ${e instanceof FetchError ? e.message : String(e)}`);
    }
  }
  if (payload === null) {
    throw new IngestError(
      definition.id,
      season,
      `no candidate asset could be fetched:\n  ${attemptErrors.join("\n  ")}`,
    );
  }
  if (candidates.length > 1 && payload.url !== candidates[0]) {
    warnings.push(`fell back from ${candidates[0]} to ${payload.url}`);
  }

  const text = decodeText(payload.body);

  // ---- format selection, from the actual header ------------------------
  const header = readCsvHeader(text);
  const format: SourceFormat<T> | undefined = definition.formats.find((f) => formatMatches(f, header));
  if (format === undefined) {
    throw new IngestError(
      definition.id,
      season,
      `no declared format matches the upstream header (${header.length} columns: ` +
        `${header.slice(0, 15).join(", ")}${header.length > 15 ? ", …" : ""}).\n` +
        definition.formats
          .map((f) => `  format "${f.id}" wants: ${f.requiredColumns.join(", ")}`)
          .join("\n"),
    );
  }
  if (previous !== null && previous.formatId !== format.id) {
    warnings.push(`format changed: cached "${previous.formatId}" -> upstream now "${format.id}"`);
  }

  const rows: T[] = [];
  let bind: ((values: readonly string[]) => void) | null = null;
  let view: ReturnType<typeof makeRowView>["view"] | null = null;
  let decodeFailures = 0;
  let firstDecodeError: string | null = null;

  const scan = scanCsv(text, {
    keep: format.projection,
    requiredColumns: format.requiredColumns,
    onColumns: (keptColumns) => {
      const rv = makeRowView(keptColumns);
      bind = rv.bind;
      view = rv.view;
    },
    onRow: (values, index) => {
      bind!(values);
      try {
        const parsed = format.parseRow(view!, season, index);
        if (parsed !== null) rows.push(parsed);
      } catch (e) {
        decodeFailures++;
        if (firstDecodeError === null) firstDecodeError = `row ${index}: ${(e as Error).message}`;
      }
    },
  });

  if (decodeFailures > 0) {
    throw new IngestError(
      definition.id,
      season,
      `${decodeFailures} row(s) failed to decode; first was ${firstDecodeError}`,
    );
  }
  if (rows.length === 0) {
    throw new IngestError(
      definition.id,
      season,
      `parsed 0 rows from ${scan.rowCount} scanned (${payload.url}). ` +
        `An empty cache is worse than a failed ingest, so this is an error.`,
    );
  }
  const floor = definition.minRows?.(season);
  if (floor !== undefined && rows.length < floor) {
    throw new IngestError(
      definition.id,
      season,
      `only ${rows.length} rows parsed from ${scan.rowCount} scanned (${payload.url}), ` +
        `below the plausibility floor of ${floor}. The asset exists but is thin; refusing to ` +
        `cache it, because a baseline computed from it would look like a calibration failure ` +
        `rather than a data failure.`,
    );
  }

  const manifest = buildManifest({
    source: definition.id,
    season,
    fetchedAt: clock.nowIso(),
    profile: scan.profile as readonly ColumnProfile[],
    rowCount: rows.length,
    scannedRowCount: scan.rowCount,
    projection: format.projection,
    formatId: format.id,
    origin: {
      url: payload.url,
      bytes: payload.body.byteLength,
      contentHash: sha256(payload.body),
    },
    ingestVersion: definition.ingestVersion,
  });

  const drift = previous === null ? null : diffManifests(previous, manifest);
  if (drift !== null && drift.schemaChanged) {
    warnings.push(
      `SCHEMA DRIFT vs cached manifest: ${drift.columns.length} column change(s); ` +
        `see manifest.columns for the diff`,
    );
  }

  await options.store.write(
    manifest,
    rows,
    options.keepRaw === true ? payload.body : undefined,
  );

  log(
    `${definition.id}@${season} (${eligibilityOf(season)}) [${format.id}] ` +
      `${rows.length}/${scan.rowCount} rows, ${scan.columns.length} cols, ${manifest.schemaHash.slice(0, 19)}`,
  );

  return {
    source: definition.id,
    season,
    outcome: "fetched",
    manifest,
    drift,
    url: payload.url,
    formatId: format.id,
    warnings,
    elapsedMs: Date.now() - startedAt,
  };
}

export interface IngestPlanEntry {
  readonly source: AnySourceDefinition;
  readonly season: Season;
}

export interface BatchIngestReport {
  readonly results: readonly IngestResult[];
  readonly failures: readonly { source: SourceId; season: Season; error: string }[];
}

/**
 * Ingest a plan. Failures are collected rather than thrown so one dead asset does not abandon a
 * whole run — but they are returned, and the CLI exits non-zero on any of them. Silent partial
 * success is the failure mode this guards against.
 */
export async function ingestAll(
  plan: readonly IngestPlanEntry[],
  options: IngestOptions,
): Promise<BatchIngestReport> {
  const results: IngestResult[] = [];
  const failures: { source: SourceId; season: Season; error: string }[] = [];
  for (const entry of plan) {
    try {
      results.push(await ingestSource(entry.source, entry.season, options));
    } catch (e) {
      failures.push({
        source: entry.source.id,
        season: entry.season,
        error: e instanceof Error ? e.message : String(e),
      });
      options.log?.(`FAILED ${entry.source.id}@${entry.season}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { results, failures };
}
