/**
 * The held-out-season contract, mechanised.
 *
 * `calibration.md` §7 says *tune on 2022–2024; 2025 is sacred*. A convention that someone has
 * to remember is the failure mode; this module makes the compiler remember it.
 *
 * How it works:
 *   - Real data never leaves the cache as a bare array. It leaves inside an `Evidence<T, E>`
 *     envelope whose phantom brand `E` is `"TUNING"` or `"HELD_OUT"`.
 *   - `Evidence<T, "HELD_OUT">` is not assignable to `Evidence<T, "TUNING">`, so any future
 *     function that consumes tuning evidence (a tunable-patch proposal, a rating fit) simply
 *     cannot be handed 2025 data. It is a type error, not a review comment.
 *   - Held-out data can only be *opened* with a `CheckpointToken`, and the checkpoint names are
 *     a closed union — you cannot invent a new reason to look at 2025.
 *   - Pooling is brand-preserving: `poolEvidence` of a TUNING and a HELD_OUT set widens `E` to
 *     the union, which is again not assignable to `TuningEvidence`.
 *
 * Nothing here is a security boundary — an author determined to cheat can cast. It is a
 * guard rail against the accident, which is the realistic threat.
 */

import type { SourceManifest } from "./manifest.js";
import { eligibilityOf, type Eligibility, type Season } from "./seasons.js";

declare const eligibilityBrand: unique symbol;

/**
 * A batch of ingested rows together with the manifests it came from and the eligibility of the
 * seasons it spans. `manifests` is what `calibration.md` §2 means by "every report cites the
 * manifest versions it ran against".
 */
export interface Evidence<T, E extends Eligibility> {
  readonly rows: readonly T[];
  readonly seasons: readonly Season[];
  readonly manifests: readonly SourceManifest[];
  readonly eligibility: E;
  /** Phantom. Never inhabited at runtime; exists so `E` is invariant to the compiler. */
  readonly [eligibilityBrand]: E;
}

/** Evidence admissible in a tunable-change or rating-change proposal. */
export type TuningEvidence<T> = Evidence<T, "TUNING">;

/** Evidence from a sacred season. Reportable as-is; never citable as justification. */
export type HeldOutEvidence<T> = Evidence<T, "HELD_OUT">;

/** Raised when held-out data is requested through a tuning-only path. */
export class HeldOutSeasonError extends Error {
  readonly seasons: readonly Season[];
  constructor(seasons: readonly Season[], context: string) {
    super(
      `held-out season(s) ${seasons.join(", ")} requested through ${context}. ` +
        `calibration.md §7: tune on 2022–2024; 2025 is sacred. ` +
        `Use openHeldOut() with a declared checkpoint if this is a checkpoint report.`,
    );
    this.name = "HeldOutSeasonError";
    this.seasons = seasons;
  }
}

/**
 * The only reasons the project has agreed to look at 2025 (`calibration.md` §7: "runs only at
 * declared checkpoints"). Closed on purpose — adding a checkpoint is a source change, which is
 * a reviewable event.
 */
export type DeclaredCheckpoint = "PHASE_3_EXIT" | "PRE_V1_SHIP";

export const DECLARED_CHECKPOINTS = ["PHASE_3_EXIT", "PRE_V1_SHIP"] as const satisfies readonly DeclaredCheckpoint[];

declare const checkpointBrand: unique symbol;

/** Proof that a held-out read was declared, by whom, and against which decision record. */
export interface CheckpointToken {
  readonly checkpoint: DeclaredCheckpoint;
  readonly declaredBy: string;
  /** A `docs/decisions/` path or report id. Free text, but required to be non-empty. */
  readonly reference: string;
  readonly [checkpointBrand]: "CheckpointToken";
}

export function declareCheckpoint(input: {
  checkpoint: DeclaredCheckpoint;
  declaredBy: string;
  reference: string;
}): CheckpointToken {
  if (input.declaredBy.trim().length === 0) throw new Error("declareCheckpoint: declaredBy is required");
  if (input.reference.trim().length === 0) {
    throw new Error("declareCheckpoint: reference (decision record or report id) is required");
  }
  return {
    checkpoint: input.checkpoint,
    declaredBy: input.declaredBy,
    reference: input.reference,
  } as CheckpointToken;
}

/** Internal constructor. Callers go through `openForTuning` / `openHeldOut` in `load.ts`. */
export function makeEvidence<T, E extends Eligibility>(
  eligibility: E,
  rows: readonly T[],
  seasons: readonly Season[],
  manifests: readonly SourceManifest[],
): Evidence<T, E> {
  return { rows, seasons, manifests, eligibility } as Evidence<T, E>;
}

/** Seasons in `seasons` that are sacred. */
export function heldOutSubset(seasons: readonly Season[]): Season[] {
  return seasons.filter((s) => eligibilityOf(s) === "HELD_OUT");
}

/**
 * Runtime backstop for the compile-time brand. Any code path that produces a patch proposal
 * should call this on its evidence; it costs nothing and catches casts.
 */
export function assertTuningEvidence<T>(
  evidence: Evidence<T, Eligibility>,
  context: string,
): asserts evidence is TuningEvidence<T> {
  const sacred = heldOutSubset(evidence.seasons);
  if (evidence.eligibility !== "TUNING" || sacred.length > 0) {
    throw new HeldOutSeasonError(sacred.length > 0 ? sacred : evidence.seasons, context);
  }
}

/**
 * Combine evidence batches. Brand-preserving: pooling TUNING with HELD_OUT produces
 * `Evidence<T, "TUNING" | "HELD_OUT">`, which no tuning-only consumer will accept.
 */
export function poolEvidence<T, E extends Eligibility>(
  ...batches: readonly Evidence<T, E>[]
): Evidence<T, E> {
  if (batches.length === 0) throw new Error("poolEvidence: nothing to pool");
  const rows: T[] = [];
  const seasons = new Set<Season>();
  const manifests: SourceManifest[] = [];
  let eligibility: Eligibility = "TUNING";
  for (const b of batches) {
    // element-wise, not spread: a season can be hundreds of thousands of rows (see load.ts)
    for (const row of b.rows) rows.push(row);
    for (const s of b.seasons) seasons.add(s);
    manifests.push(...b.manifests);
    if (b.eligibility === "HELD_OUT") eligibility = "HELD_OUT";
  }
  const sorted = [...seasons].sort((a, b) => a - b);
  return makeEvidence(
    eligibility as E,
    rows,
    sorted,
    manifests.sort((a, b) => a.source.localeCompare(b.source) || a.season - b.season),
  );
}

/** A citation line for a report footer: source@season#schemaHash. */
export function citeManifests(evidence: Evidence<unknown, Eligibility>): string[] {
  return evidence.manifests.map(
    (m) => `${m.source}@${m.season} schema=${m.schemaHash.slice(0, 19)} fetched=${m.fetchedAt}`,
  );
}
