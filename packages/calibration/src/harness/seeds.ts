/**
 * SEEDS — `calibration.md` §3: *"seeds: string[] — one per game/season run, recorded in every
 * report"*, and the determinism pillar: *"every batch is reproducible from its seed list.
 * Reports cite seeds."*
 *
 * A batch's seeds are generated from a single BATCH SEED through the contracts PRNG, so a report
 * can cite one string and a reader can regenerate the whole list. The list is also recorded in
 * full, because "regenerate it from the batch seed" stops being reproducible the moment this
 * function changes — and a report that is only reproducible against the current source is not
 * reproducible.
 *
 * Both, therefore: the batch seed for convenience, the list for the audit trail, and a digest
 * over the list so a report that quotes 300 seeds can be checked against one line.
 */
import { createRng } from "@ff/contracts";

export interface SeedList {
  /** The one string a reader needs to regenerate this list with the CURRENT generator. */
  readonly batchSeed: string;
  readonly seeds: readonly string[];
  /** FNV-1a over the seed list. What a report quotes; what a re-run must reproduce. */
  readonly digest: string;
}

export function generateSeeds(batchSeed: string, count: number): SeedList {
  if (count <= 0) throw new RangeError("a batch needs at least one seed");
  if (batchSeed.trim().length === 0) throw new Error("a batch seed is required and is quoted in the report");
  const rng = createRng(batchSeed, "batch:seeds");
  const seeds: string[] = [];
  for (let i = 0; i < count; i++) {
    // Hex from two draws: readable, collision-free at batch sizes, and derived rather than
    // sequential so `seeds[12]` is not `seeds[11] + 1` in the engine's hash input.
    const a = Math.floor(rng.next() * 0xffffffff);
    const b = Math.floor(rng.next() * 0xffffffff);
    seeds.push(`${batchSeed}#${i}:${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`);
  }
  return { batchSeed, seeds, digest: digestSeeds(seeds) };
}

/** An explicit list, for re-running a report exactly as filed. */
export function seedListOf(seeds: readonly string[], batchSeed = "explicit"): SeedList {
  if (seeds.length === 0) throw new RangeError("a batch needs at least one seed");
  return { batchSeed, seeds: [...seeds], digest: digestSeeds(seeds) };
}

export function digestSeeds(seeds: readonly string[]): string {
  let h = 0x811c9dc5;
  for (const seed of seeds) {
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    h ^= 0x0a;
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}#${seeds.length}`;
}

export class SeedMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(
      `seed digest mismatch: the report cites ${expected}, this run produced ${actual}. ` +
        `A batch that cannot reproduce its own seed list cannot reproduce its own numbers.`,
    );
    this.name = "SeedMismatchError";
  }
}

export function assertSeedDigest(seeds: readonly string[], expected: string): void {
  const actual = digestSeeds(seeds);
  if (actual !== expected) throw new SeedMismatchError(expected, actual);
}
