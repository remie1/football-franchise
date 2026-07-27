/**
 * Seeded, forkable PRNG. Determinism pillar: same seed → identical stream.
 * Pure TS (no node crypto) so it runs identically in browser workers.
 * Math.random is banned repo-wide; everything routes through here.
 */
export interface Rng {
  next(): number;                 // [0,1)
  int(minIncl: number, maxIncl: number): number;
  d100(): number;
  d20(): number;
  pick<T>(items: readonly T[]): T;
  fork(label: string): Rng;
  readonly seed: string;
  readonly label: string;
}

/** FNV-1a → 32-bit seed from an arbitrary string. */
function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, well-distributed. */
function mulberry32(a: number): () => number {
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string, label = "root"): Rng {
  const next = mulberry32(hashSeed(`${seed}::${label}`));
  const rng: Rng = {
    next,
    int(minIncl, maxIncl) {
      if (maxIncl < minIncl) throw new Error("int: max < min");
      return minIncl + Math.floor(next() * (maxIncl - minIncl + 1));
    },
    d100() { return rng.int(1, 100); },
    d20() { return rng.int(1, 20); },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error("pick: empty array");
      return items[rng.int(0, items.length - 1)]!;
    },
    fork(childLabel: string) { return createRng(seed, `${label}/${childLabel}`); },
    seed,
    label,
  };
  return rng;
}
