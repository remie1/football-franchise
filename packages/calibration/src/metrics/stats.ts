/**
 * STATISTICS — intervals and shape tests.
 *
 * `calibration.md` §3: *"All reports carry sample sizes and 95% CIs — no naked point
 * estimates."* Every function here exists to satisfy that sentence, and each states its
 * approximation so a reader knows what the interval is worth.
 *
 * No dependency is added for this. The four things needed — a Wilson interval, a normal
 * interval on a mean, a two-sample KS statistic and a chi-squared statistic with a p-value —
 * are forty lines together, and a statistics package in a package that ships no statistics is a
 * supply-chain surface for nothing.
 */

export interface Interval {
  readonly low: number;
  readonly high: number;
}

const Z95 = 1.959963984540054;

/**
 * Wilson score interval — the right one for a proportion, and specifically the right one near 0
 * and 1 where the normal approximation goes outside [0,1]. Several Tier 1 metrics (interception
 * rate ~2%, fumble rate) live exactly there.
 */
export function wilsonInterval(successes: number, trials: number, z = Z95): Interval {
  if (trials === 0) return { low: 0, high: 1 };
  const p = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const centre = p + z2 / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * trials)) / trials);
  return {
    low: Math.max(0, (centre - spread) / denominator),
    high: Math.min(1, (centre + spread) / denominator),
  };
}

/**
 * Normal interval on a mean. Fine at the sample sizes a batch produces; stated, not assumed.
 * `sumSquares === null` means the value is a ratio of totals with no per-observation spread —
 * there is no interval, and NaN is the honest answer rather than a fabricated one.
 */
export function meanInterval(total: number, n: number, sumSquares: number | null, z = Z95): Interval {
  if (sumSquares === null || n < 2) return { low: Number.NaN, high: Number.NaN };
  const mean = total / n;
  const variance = Math.max(0, (sumSquares - n * mean * mean) / (n - 1));
  const stderr = Math.sqrt(variance / n);
  return { low: mean - z * stderr, high: mean + z * stderr };
}

export function standardDeviation(total: number, n: number, sumSquares: number | null): number {
  if (sumSquares === null || n < 2) return Number.NaN;
  const mean = total / n;
  return Math.sqrt(Math.max(0, (sumSquares - n * mean * mean) / (n - 1)));
}

// --- shape tests ------------------------------------------------------------

export interface KsResult {
  readonly statistic: number;
  readonly pValue: number;
  readonly nA: number;
  readonly nB: number;
}

/**
 * Two-sample Kolmogorov–Smirnov. Both inputs must be sorted ascending; `mergeAccumulators` sorts
 * its sample vectors for exactly this reason (and, independently, so that worker count cannot
 * change a result).
 *
 * The p-value is the asymptotic Kolmogorov distribution, which is the standard approximation and
 * is good for the n a batch produces. It is reported to two significant figures in reports
 * because pretending to more precision than an asymptotic approximation has would be dishonest.
 */
export function kolmogorovSmirnov(a: readonly number[], b: readonly number[]): KsResult {
  const nA = a.length;
  const nB = b.length;
  if (nA === 0 || nB === 0) return { statistic: Number.NaN, pValue: Number.NaN, nA, nB };
  let i = 0;
  let j = 0;
  let statistic = 0;
  while (i < nA && j < nB) {
    const av = a[i] ?? 0;
    const bv = b[j] ?? 0;
    if (av <= bv) i++;
    if (bv <= av) j++;
    statistic = Math.max(statistic, Math.abs(i / nA - j / nB));
  }
  const effective = Math.sqrt((nA * nB) / (nA + nB));
  return { statistic, pValue: kolmogorovP((effective + 0.12 + 0.11 / effective) * statistic), nA, nB };
}

/** Q_KS(λ) = 2 Σ (-1)^{k-1} e^{-2k²λ²}. Truncated at 100 terms; converges far sooner. */
function kolmogorovP(lambda: number): number {
  if (lambda <= 0) return 1;
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    const term = 2 * (k % 2 === 1 ? 1 : -1) * Math.exp(-2 * k * k * lambda * lambda);
    sum += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return Math.min(1, Math.max(0, sum));
}

export interface ChiSquaredResult {
  readonly statistic: number;
  readonly degreesOfFreedom: number;
  readonly pValue: number;
  /** Categories dropped because the expected count was too small to be meaningful. */
  readonly droppedCategories: readonly string[];
}

/**
 * Chi-squared goodness of fit of `observed` counts against the SHAPE of `expected` counts,
 * rescaled to the observed total.
 *
 * Categories whose expected count falls below `minExpected` (5, the conventional floor) are
 * dropped and NAMED, rather than pooled into an "other" bucket. Pooling would hide which
 * categories are rare, and in a drive-outcome mix "safety was too rare to test" is information.
 */
export function chiSquared(
  observed: Readonly<Record<string, number>>,
  expected: Readonly<Record<string, number>>,
  minExpected = 5,
): ChiSquaredResult {
  const categories = [...new Set([...Object.keys(observed), ...Object.keys(expected)])].sort();
  const observedTotal = Object.values(observed).reduce((a, b) => a + b, 0);
  const expectedTotal = Object.values(expected).reduce((a, b) => a + b, 0);
  if (observedTotal === 0 || expectedTotal === 0) {
    return { statistic: Number.NaN, degreesOfFreedom: 0, pValue: Number.NaN, droppedCategories: [] };
  }
  let statistic = 0;
  let used = 0;
  const dropped: string[] = [];
  for (const category of categories) {
    const e = ((expected[category] ?? 0) / expectedTotal) * observedTotal;
    if (e < minExpected) {
      dropped.push(category);
      continue;
    }
    const o = observed[category] ?? 0;
    statistic += ((o - e) * (o - e)) / e;
    used++;
  }
  const df = Math.max(1, used - 1);
  return { statistic, degreesOfFreedom: df, pValue: chiSquaredP(statistic, df), droppedCategories: dropped };
}

/** Upper tail of the chi-squared distribution via the regularised incomplete gamma function. */
function chiSquaredP(statistic: number, df: number): number {
  if (!Number.isFinite(statistic) || statistic <= 0) return 1;
  return upperIncompleteGammaRegularised(df / 2, statistic / 2);
}

function logGamma(x: number): number {
  // Lanczos, g=7, n=9. Standard coefficients.
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const z = x - 1;
  let a = c[0] ?? 0;
  const t = z + 7.5;
  for (let i = 1; i < 9; i++) a += (c[i] ?? 0) / (z + i);
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

function upperIncompleteGammaRegularised(s: number, x: number): number {
  if (x < s + 1) {
    // Series expansion for the LOWER tail, then complement.
    let sum = 1 / s;
    let term = sum;
    for (let n = 1; n < 1000; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return Math.max(0, Math.min(1, 1 - sum * Math.exp(-x + s * Math.log(x) - logGamma(s))));
  }
  // Continued fraction (Lentz) for the upper tail directly.
  const tiny = 1e-300;
  let b = x + 1 - s;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }
  return Math.max(0, Math.min(1, Math.exp(-x + s * Math.log(x) - logGamma(s)) * h));
}

// --- correlation ------------------------------------------------------------

export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return Number.NaN;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i] ?? 0;
    sy += ys[i] ?? 0;
  }
  const mx = sx / n;
  const my = sy / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = (xs[i] ?? 0) - mx;
    const b = (ys[i] ?? 0) - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denominator = Math.sqrt(dx * dy);
  return denominator === 0 ? Number.NaN : num / denominator;
}

/** Spearman: Pearson on midrank-transformed values. Ties averaged, which matters for win totals. */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  return pearson(midranks(xs), midranks(ys));
}

export function midranks(values: readonly number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && (indexed[j + 1]?.v ?? 0) === (indexed[i]?.v ?? 0)) j++;
    const rank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      const entry = indexed[k];
      if (entry !== undefined) ranks[entry.i] = rank;
    }
    i = j + 1;
  }
  return ranks;
}

/** Histogram with fixed-width bins, for report attachments and chi-squared on continuous data. */
export function histogram(
  values: readonly number[],
  binWidth: number,
  min: number,
  max: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let edge = min; edge < max; edge += binWidth) {
    counts[binLabel(edge, binWidth)] = 0;
  }
  for (const value of values) {
    const clamped = Math.max(min, Math.min(max - binWidth, value));
    const edge = min + Math.floor((clamped - min) / binWidth) * binWidth;
    const label = binLabel(edge, binWidth);
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}

function binLabel(edge: number, width: number): string {
  return `${edge}..${edge + width}`;
}
