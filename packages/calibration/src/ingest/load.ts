/**
 * Reading the cache, through the eligibility gate.
 *
 * There is deliberately **no** function that hands back rows without an eligibility brand. The
 * only way to get 2025 data out of the cache is `openHeldOut`, which demands a `CheckpointToken`,
 * and what it returns is `HeldOutEvidence` — a type no tuning consumer will accept.
 */

import type { CacheStore } from "./cache.js";
import {
  HeldOutSeasonError,
  heldOutSubset,
  makeEvidence,
  type CheckpointToken,
  type Evidence,
  type HeldOutEvidence,
  type TuningEvidence,
} from "./eligibility.js";
import type { SourceId, SourceManifest } from "./manifest.js";
import { eligibilityOf, type Eligibility, type Season } from "./seasons.js";
import type { SourceDefinition } from "./sources/types.js";

export class MissingCacheError extends Error {
  constructor(source: SourceId, season: Season, root: string) {
    super(
      `${source}@${season} is not in the cache at ${root}. ` +
        `Run: pnpm --filter @ff/calibration ingest --seasons ${season} --sources ${source}`,
    );
    this.name = "MissingCacheError";
  }
}

async function readSeasons<T>(
  store: CacheStore,
  source: SourceId,
  seasons: readonly Season[],
): Promise<{ rows: T[]; manifests: SourceManifest[] }> {
  const rows: T[] = [];
  const manifests: SourceManifest[] = [];
  for (const season of seasons) {
    const entry = await store.read<T>(source, season);
    if (entry === null) throw new MissingCacheError(source, season, store.root);
    // Not `push(...rows)`: a single season of the 2025 depth-chart snapshot format is 554k rows,
    // which blows the argument limit and shows up as a bare "maximum call stack size exceeded".
    for (const row of entry.rows) rows.push(row);
    manifests.push(entry.manifest);
  }
  return { rows, manifests };
}

/**
 * Open cached rows for tuning. Throws if any requested season is held out.
 *
 * Accepts either a `SourceDefinition` (so `T` is inferred) or a bare source id (so a caller that
 * only wants to count rows need not import the definition).
 */
export async function openForTuning<T>(
  store: CacheStore,
  source: SourceDefinition<T> | SourceId,
  seasons: readonly Season[],
): Promise<TuningEvidence<T>> {
  const id = typeof source === "string" ? source : source.id;
  const sacred = heldOutSubset(seasons);
  if (sacred.length > 0) throw new HeldOutSeasonError(sacred, `openForTuning(${id})`);
  const { rows, manifests } = await readSeasons<T>(store, id, seasons);
  return makeEvidence<T, "TUNING">("TUNING", rows, [...seasons], manifests);
}

/**
 * Open held-out (2025) rows. Requires a declared checkpoint (`calibration.md` §7). The token is
 * carried into every manifest citation so a checkpoint report states on its face which
 * declaration authorised it.
 */
export async function openHeldOut<T>(
  store: CacheStore,
  source: SourceDefinition<T> | SourceId,
  seasons: readonly Season[],
  token: CheckpointToken,
): Promise<HeldOutEvidence<T>> {
  const id = typeof source === "string" ? source : source.id;
  const notSacred = seasons.filter((s) => eligibilityOf(s) !== "HELD_OUT");
  if (notSacred.length > 0) {
    throw new Error(
      `openHeldOut(${id}): season(s) ${notSacred.join(", ")} are not held out; use openForTuning`,
    );
  }
  const { rows, manifests } = await readSeasons<T>(store, id, seasons);
  void token; // presence is the point; nothing to compute from it here
  return makeEvidence<T, "HELD_OUT">("HELD_OUT", rows, [...seasons], manifests);
}

/**
 * Manifest-only inspection across every season, held-out included.
 *
 * Safe because manifests carry no football facts — only provenance. This is what an ingest
 * status/drift report reads, and it is the one place the 2025 gate does not apply.
 */
export async function openManifests(
  store: CacheStore,
  source?: SourceId,
): Promise<SourceManifest[]> {
  const all = await store.listManifests();
  return source === undefined ? all : all.filter((m) => m.source === source);
}

/** For diagnostics that must span both cohorts and are explicitly not evidence. */
export async function openForInspection<T>(
  store: CacheStore,
  source: SourceDefinition<T> | SourceId,
  seasons: readonly Season[],
  reason: string,
): Promise<Evidence<T, Eligibility>> {
  if (reason.trim().length === 0) {
    throw new Error("openForInspection: a reason is required (it lands in the report footer)");
  }
  const id = typeof source === "string" ? source : source.id;
  const { rows, manifests } = await readSeasons<T>(store, id, seasons);
  const eligibility: Eligibility = heldOutSubset(seasons).length > 0 ? "HELD_OUT" : "TUNING";
  return makeEvidence<T, Eligibility>(eligibility, rows, [...seasons], manifests);
}
