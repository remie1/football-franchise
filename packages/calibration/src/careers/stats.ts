/**
 * Small statistics for the career baselines (ADR-087 D5b): means, standard deviations, the
 * across-seasons standard error and a deterministic bootstrap over players.
 *
 * The bootstrap draws from the seeded PRNG in `@ff/contracts` only, from a fixed seed string, so the
 * same data always gives the same standard errors.
 */

import { createRng, type Rng } from "@ff/contracts";

/** A measured number, its standard error, and the count it rests on (rows, players, pairs or seasons). */
export interface Estimate {
  readonly value: number;
  readonly se: number;
  readonly n: number;
}

export const mean = (xs: readonly number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Sample standard deviation (n − 1); 0 for fewer than two values. */
export function sampleSd(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Population standard deviation (n), as the season checks compute a win spread. */
export function populationSd(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
}

/** Values kept to a fixed number of decimals so the JSON is stable and readable. */
export function round(x: number, places = 4): number {
  if (!Number.isFinite(x)) return 0;
  const f = 10 ** places;
  return Math.round(x * f) / f;
}

/**
 * A cross-section row pooled over seasons: the mean of the per-season values, with standard error
 * = the sample SD across seasons / √seasons. `n` is the total count behind the season values.
 */
export function acrossSeasons(values: readonly number[], n: number): Estimate {
  return { value: mean(values), se: values.length === 0 ? 0 : sampleSd(values) / Math.sqrt(values.length), n };
}

/** The seed string every bootstrap in the career baselines starts from. */
export const BOOTSTRAP_SEED = "nfl-careers/bootstrap/v1";
/** Bootstrap replicates per row. */
export const BOOTSTRAP_REPLICATES = 200;

export interface BootstrapResult {
  /** SD of the statistic over the replicates where it was defined. */
  readonly se: number;
  /** Share of replicates where the statistic was defined (not null). */
  readonly resolved: number;
}

/**
 * Bootstrap over players: `units` holds each player's observations; each replicate draws as many
 * players as there are, with replacement, and recomputes `stat` on their pooled observations.
 */
export function bootstrapOverPlayers<T>(
  units: readonly (readonly T[])[],
  stat: (sample: readonly T[]) => number | null,
  rng: Rng,
  replicates: number = BOOTSTRAP_REPLICATES,
): BootstrapResult {
  if (units.length === 0) return { se: 0, resolved: 0 };
  const values: number[] = [];
  for (let b = 0; b < replicates; b++) {
    const sample: T[] = [];
    for (let i = 0; i < units.length; i++) {
      const unit = units[rng.int(0, units.length - 1)]!;
      for (const x of unit) sample.push(x);
    }
    const v = stat(sample);
    if (v !== null && Number.isFinite(v)) values.push(v);
  }
  return { se: sampleSd(values), resolved: values.length / replicates };
}

/** The bootstrap stream for one labeled row (`careers/QB/reach5`, ...), forked from the fixed seed. */
export function bootstrapRng(label: string): Rng {
  return createRng(BOOTSTRAP_SEED).fork(label);
}

/** Pearson correlation; 0 when either side has no spread. */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}
