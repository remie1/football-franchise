/**
 * THE BLOCK CLOCK'S SELECTION RULE, FILED AT STEP 0 (ADR-089 §4.1, ADR-089:422-427; plan §7.2
 * `selectionRule`, `fittingOrder`; deviation O5).
 *
 * At step 5b the rule picks the block clock's shape (S or L) and its one scale mechanically, and at
 * step 10 it is re-run once after b is fitted (`FILED_FITTING_ORDER`). Filed here, before any engine
 * arm runs:
 *
 *  - **The grids (O5).** S: theta in {7, 8, ..., 15} at k 2, beta 0.5, every point with the push
 *    window (question 16). L: R in {4, 5, 6, 7, 8}. Every arm of either shape runs step 3's free-run
 *    clock as answered: question 19 = Wait (ADR-089:5, :558).
 *  - **The loss.** The attempt-weighted squared distance between the sim's and the real hit rate on
 *    thrown balls by release bin, each curve first divided by its own all-bin mean, on aimed throws
 *    on both sides, in raw-second bins read from `THROW.releaseSeconds`:
 *
 *        loss = sum_i w_i (s_i / mean(s) - r_i / mean(r))^2 / sum_i w_i
 *
 *    `w` is the real share of attempts by raw-second bin (§2.2, ADR-089:181), the same for every
 *    grid point; `mean` is the unweighted mean of a curve's seven bin rates. Shape only: the level is
 *    left out on purpose, so hits on thrown balls per dropback stay a prediction (ADR-089:422). The
 *    reading of "its own all-bin mean" is the one that reproduces the design's one stated shape
 *    distance: §2.2's two real hit curves (aimed, and counting throwaways) are 0.0034 apart on their
 *    printed bins against K1's REPORTED 0.0035 (ADR-089:173); dividing by the attempt-weighted mean
 *    instead gives 0.0053 to 0.0064.
 *  - **The winner** minimises the loss on seed set 1, over all 14 points of both shapes; a tie goes
 *    to the earlier point in the filed grid order (S by theta, then L by R). No die.
 *  - **Separation (O5).** `spread_g = |loss_g(set 1) - loss_g(set 2)|`; there is no separation if
 *    `worst - best <= 2 * max_g spread_g` (ADR-089:425: "the best and worst points within twice the
 *    loss's own spread across two seed sets").
 *  - **Fallback D1** (ADR-089:425). With no separation, the pressured-by-release curve becomes the
 *    selection curve, by the same loss, separation and winner rule, on attempts with throwaways
 *    counted as throws on both sides; it moves out of the falsifiers into the fitted ledger, and the
 *    report says so. If the fallback does not separate either, the design states no further step:
 *    its minimum is still the winner and its separation is reported.
 *  - **Not on sacks, not on ESPN** (ADR-089:426).
 *
 * It also files the clock readings the loss reads (ADR-089:422): default D21's arrival reading
 * (ADR-089:698), L's crossing time with its clamp and m(0), and the late block on both shapes
 * (ADR-089:546). And the step-4 construct "the hit curve rises from 2.0 s on" (ADR-089:1040), a
 * positive attempt-weighted least-squares slope of hit rate on bin midpoint; the open last bin's
 * midpoint is read as 5.5 s, because a play stops at `clock.maxTick` 6.0 s (`tunables.ts:93`).
 */
import type { SeedSet } from "./corpus.js";
import type { FiledFittingOrder, FiledRule, FiledSelectionRule } from "./filed.js";

// --- the bins and the real curves (§2.2, ADR-089:165-188) -----------------------------------------

export const RELEASE_BINS = Object.freeze(["<2.0", "2.0-2.5", "2.5-3.0", "3.0-3.5", "3.5-4.0", "4-5", ">=5"] as const);
export const BIN_COUNT = RELEASE_BINS.length;
/** Lower edges, seconds; the last bin is open. */
export const BIN_LOWER_EDGES: readonly number[] = Object.freeze([0, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0]);
/** Bin midpoints for the "rises" slope; the first bin's is 1.0 (it starts at the snap), the open last bin's 5.5 (play ends at 6.0 s). */
export const BIN_MIDPOINTS: readonly number[] = Object.freeze([1.0, 2.25, 2.75, 3.25, 3.75, 4.5, 5.5]);
/** Index of the first bin "from 2.0 s on". */
export const FROM_2S = 1;

/** §2.2's real curves, as printed (percent). */
export const REAL = Object.freeze({
  /** QB hit rate on aimed throws, raw seconds: the selection curve (ADR-089:169). */
  hitRaw: Object.freeze([2.7, 7.1, 10.6, 11.0, 13.8, 16.1, 18.0]),
  /** The same, tick-aligned (ADR-089:170). */
  hitTick: Object.freeze([1.9, 5.4, 9.7, 10.6, 12.7, 15.3, 18.0]),
  /** Counting throwaways, raw (K1, for reference; ADR-089:171). */
  hitRawWithThrowaways: Object.freeze([2.7, 7.3, 10.9, 11.4, 14.8, 19.2, 21.5]),
  /** Pressured share by release bin, raw seconds: the fallback curve (ADR-089:179). */
  pressuredRaw: Object.freeze([9.0, 18.1, 24.6, 27.9, 36.9, 56.0, 72.6]),
  pressuredTick: Object.freeze([7.3, 14.7, 22.3, 26.8, 32.5, 49.6, 71.5]),
  /** Share of attempts by bin (ADR-089:181-182). */
  attemptSharesRaw: Object.freeze([26.1, 24.3, 20.6, 12.9, 6.7, 5.2, 4.2]),
  attemptSharesTick: Object.freeze([17.0, 23.4, 23.0, 16.1, 8.9, 6.6, 5.0]),
  /** INT per aimed throw by bin (ADR-089:185-186), for §8's guard. */
  intPerAimedRaw: Object.freeze([1.10, 2.07, 2.98, 3.07, 3.74, 3.00, 4.41]),
  intPerAimedTick: Object.freeze([0.93, 1.64, 2.74, 2.96, 3.42, 3.46, 4.16]),
});

// --- the grids (deviation O5) ---------------------------------------------------------------------

export const S_GRID = Object.freeze({ theta: Object.freeze([7, 8, 9, 10, 11, 12, 13, 14, 15]), k: 2, beta: 0.5, pushWindow: true as const });
export const L_GRID = Object.freeze({ R: Object.freeze([4, 5, 6, 7, 8]) });

export type Shape = "S" | "L";
export interface GridPoint {
  readonly shape: Shape;
  /** theta for S, R for L. */
  readonly value: number;
}
export const gridPointId = (p: GridPoint): string => (p.shape === "S" ? `S:theta=${String(p.value)}` : `L:R=${String(p.value)}`);

/** The 14 points, in the filed order (S by theta, then L by R): the tie order. */
export const GRID_POINTS: readonly GridPoint[] = Object.freeze([
  ...S_GRID.theta.map((value) => Object.freeze({ shape: "S" as const, value })),
  ...L_GRID.R.map((value) => Object.freeze({ shape: "L" as const, value })),
]);

// --- the loss -------------------------------------------------------------------------------------

/** One bin of a sim curve: `events` (aimed hits, or pressured attempts) out of `attempts`. */
export interface BinCount {
  readonly events: number;
  readonly attempts: number;
}

function checkLength(name: string, xs: readonly unknown[]): void {
  if (xs.length !== BIN_COUNT) throw new Error(`${name}: a curve has ${String(BIN_COUNT)} bins (${RELEASE_BINS.join(", ")}), got ${String(xs.length)}`);
}

/** Bin rates in percent; a bin with no attempts has no rate and the loss refuses it. */
export function binRates(curve: readonly BinCount[]): readonly number[] {
  checkLength("binRates", curve);
  return curve.map((b, i) => {
    if (!(b.attempts > 0)) throw new Error(`binRates: bin ${RELEASE_BINS[i]!} has no attempts, so the curve has no rate there`);
    if (b.events < 0 || b.events > b.attempts) throw new Error(`binRates: bin ${RELEASE_BINS[i]!} has ${String(b.events)} events in ${String(b.attempts)} attempts`);
    return (100 * b.events) / b.attempts;
  });
}

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** The filed shape loss between two curves of bin rates, weighted by `weights` (default: the real raw attempt shares). */
export function shapeLoss(sim: readonly number[], real: readonly number[], weights: readonly number[] = REAL.attemptSharesRaw): number {
  checkLength("shapeLoss sim", sim);
  checkLength("shapeLoss real", real);
  checkLength("shapeLoss weights", weights);
  const ms = mean(sim);
  const mr = mean(real);
  if (!(ms > 0) || !(mr > 0)) throw new Error("shapeLoss: a curve with an all-bin mean of 0 has no shape");
  const W = weights.reduce((a, b) => a + b, 0);
  if (!(W > 0) || weights.some((w) => w < 0)) throw new Error("shapeLoss: the weights must be non-negative with a positive sum");
  let s = 0;
  for (let i = 0; i < BIN_COUNT; i++) s += weights[i]! * (sim[i]! / ms - real[i]! / mr) ** 2;
  return s / W;
}

/**
 * Attempt-weighted RMS distance in points over the first `bins` bins (ADR-089:428: "weighted by
 * FTN's attempt shares on the same grid"), for the pressured-by-release falsifier (at most 12 over
 * the first five bins, ADR-089:1142).
 */
export function curveRms(sim: readonly number[], real: readonly number[], weights: readonly number[], bins = 5): number {
  checkLength("curveRms sim", sim);
  checkLength("curveRms real", real);
  checkLength("curveRms weights", weights);
  let s = 0;
  let W = 0;
  for (let i = 0; i < bins; i++) {
    s += weights[i]! * (sim[i]! - real[i]!) ** 2;
    W += weights[i]!;
  }
  if (!(W > 0)) throw new Error("curveRms: the weights must have a positive sum");
  return Math.sqrt(s / W);
}

/** The release bins from 2.0 s on whose sim rate is above twice FTN's (ADR-089:447, :1063, :1142). */
export function binsAboveTwiceFtn(sim: readonly number[], real: readonly number[]): readonly string[] {
  checkLength("binsAboveTwiceFtn sim", sim);
  checkLength("binsAboveTwiceFtn real", real);
  const out: string[] = [];
  for (let i = FROM_2S; i < BIN_COUNT; i++) if (sim[i]! > 2 * real[i]!) out.push(RELEASE_BINS[i]!);
  return out;
}

/**
 * The attempt-weighted least-squares slope of rate on bin midpoint, over the bins from `from` on
 * (ADR-089:1040). "Rises from 2.0 s on" is a positive slope over `from = FROM_2S`.
 */
export function attemptWeightedSlope(rates: readonly number[], attempts: readonly number[], from = FROM_2S): number {
  checkLength("attemptWeightedSlope rates", rates);
  checkLength("attemptWeightedSlope attempts", attempts);
  let W = 0;
  let sx = 0;
  let sy = 0;
  for (let i = from; i < BIN_COUNT; i++) {
    W += attempts[i]!;
    sx += attempts[i]! * BIN_MIDPOINTS[i]!;
    sy += attempts[i]! * rates[i]!;
  }
  if (!(W > 0)) throw new Error("attemptWeightedSlope: no attempts in the bins read");
  const mx = sx / W;
  const my = sy / W;
  let sxy = 0;
  let sxx = 0;
  for (let i = from; i < BIN_COUNT; i++) {
    sxy += attempts[i]! * (BIN_MIDPOINTS[i]! - mx) * (rates[i]! - my);
    sxx += attempts[i]! * (BIN_MIDPOINTS[i]! - mx) ** 2;
  }
  if (!(sxx > 0)) throw new Error("attemptWeightedSlope: the bins read carry attempts at one midpoint only");
  return sxy / sxx;
}

export const risesFrom2s = (rates: readonly number[], attempts: readonly number[]): boolean => attemptWeightedSlope(rates, attempts) > 0;

// --- the rule -------------------------------------------------------------------------------------

/** One grid point's two curves on each seed set (aimed hits by bin; pressured attempts by bin). */
export interface GridArm {
  readonly point: GridPoint;
  readonly hit: Readonly<Record<SeedSet, readonly BinCount[]>>;
  readonly pressured: Readonly<Record<SeedSet, readonly BinCount[]>>;
}

export type SelectionCurve = "hit_rate_by_release_bin" | "pressured_share_by_release_bin";

export interface CurveVerdict {
  readonly curve: SelectionCurve;
  readonly losses: readonly { readonly point: string; readonly set1: number; readonly set2: number; readonly spread: number }[];
  readonly best: number;
  readonly worst: number;
  readonly maxSpread: number;
  readonly separated: boolean;
  /** The point with the least set-1 loss (ties to the earlier filed point). */
  readonly winner: string;
}

export interface SelectionVerdict {
  readonly winner: string;
  readonly curve: SelectionCurve;
  readonly fallbackUsed: boolean;
  readonly primary: CurveVerdict;
  readonly fallback?: CurveVerdict;
  /** What the report must say. */
  readonly says: readonly string[];
}

function verdictOn(curve: SelectionCurve, arms: readonly GridArm[]): CurveVerdict {
  const real = curve === "hit_rate_by_release_bin" ? REAL.hitRaw : REAL.pressuredRaw;
  const losses = arms.map((arm) => {
    const pick = curve === "hit_rate_by_release_bin" ? arm.hit : arm.pressured;
    const set1 = shapeLoss(binRates(pick[1]), real);
    const set2 = shapeLoss(binRates(pick[2]), real);
    return { point: gridPointId(arm.point), set1, set2, spread: Math.abs(set1 - set2) };
  });
  let winner = losses[0]!;
  for (const l of losses) if (l.set1 < winner.set1) winner = l;
  const best = Math.min(...losses.map((l) => l.set1));
  const worst = Math.max(...losses.map((l) => l.set1));
  const maxSpread = Math.max(...losses.map((l) => l.spread));
  return { curve, losses, best, worst, maxSpread, separated: worst - best > 2 * maxSpread, winner: winner.point };
}

/**
 * Applies the filed rule to the 14 grid arms, mechanically. The arms must be exactly the filed grid
 * (any order); they are scored in the filed order, which is the tie order.
 */
export function selectBlockClock(arms: readonly GridArm[]): SelectionVerdict {
  const byId = new Map(arms.map((a) => [gridPointId(a.point), a]));
  if (byId.size !== arms.length) throw new Error("selectBlockClock: a grid point is given twice");
  const expected = GRID_POINTS.map(gridPointId);
  const missing = expected.filter((id) => !byId.has(id));
  const extra = [...byId.keys()].filter((id) => !expected.includes(id));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(`selectBlockClock: the arms must be exactly the filed grid (missing ${missing.join(", ") || "none"}; not filed ${extra.join(", ") || "none"})`);
  }
  const ordered = expected.map((id) => byId.get(id)!);
  const primary = verdictOn("hit_rate_by_release_bin", ordered);
  if (primary.separated) {
    return { winner: primary.winner, curve: primary.curve, fallbackUsed: false, primary, says: [`the hit-by-release shape loss separates the grid; ${primary.winner} wins`] };
  }
  const fallback = verdictOn("pressured_share_by_release_bin", ordered);
  const says = [
    `the hit-by-release shape loss does not separate the grid (worst - best ${(primary.worst - primary.best).toPrecision(4)} <= 2 x ${primary.maxSpread.toPrecision(4)}); fallback D1 applies`,
    "the pressured-by-release curve is the selection curve: it moves out of the falsifiers and into the fitted ledger",
    `${fallback.winner} wins on the pressured-by-release curve`,
  ];
  if (!fallback.separated) says.push("the fallback curve does not separate the grid either; the design states no further step, and its minimum stands as filed");
  return { winner: fallback.winner, curve: fallback.curve, fallbackUsed: true, primary, fallback, says };
}

// --- the filed blocks -----------------------------------------------------------------------------

export const FILED_SELECTION_RULE: FiledSelectionRule = {
  adrLines: [422, 425, 426],
  grids: {
    S: { theta: S_GRID.theta, k: S_GRID.k, beta: S_GRID.beta, pushWindow: S_GRID.pushWindow },
    L: { R: L_GRID.R },
  },
  freeRunClock:
    "WAIT: step 3's free-run clock as question 19 was answered (ADR-089:5): down linemen run from their snap spot (depth 1.0, " +
    "width his gap, EDGE +0.75), every other free runner keeps today's set times (ADR-089:558)",
  loss: {
    curve: "hit_rate_by_release_bin",
    population: "aimed throws on both sides (pass attempts not charted as throwaways)",
    clock: "raw-second bins read from THROW.releaseSeconds (P8, from step 4)",
    bins: [...RELEASE_BINS],
    real: [...REAL.hitRaw],
    realSource: "ADR-089:169 (FTN 2023-24, n 34,578), as printed",
    weights: [...REAL.attemptSharesRaw],
    weightsSource: "the real share of attempts by raw-second bin (ADR-089:181), the same for every grid point",
    normalise: "each curve divided by its own all-bin mean: the unweighted mean of its seven bin rates",
    formula: "sum_i w_i (s_i / mean(s) - r_i / mean(r))^2 / sum_i w_i",
    shapeOnly: "the level is left out on purpose, so that hits on thrown balls per dropback stay a prediction (ADR-089:422)",
    reproduces: "0.0034 between ADR-089:169 and :171 on their printed bins, against K1's REPORTED 0.0035 (ADR-089:173)",
    winner: "the least loss on seed set 1, over all 14 points of both shapes",
    ties: "the earlier point in the filed order: S by theta ascending, then L by R ascending",
    appliedAt: "5b",
    rerun: "once, mechanically, at step 10 after b, the throwaway appeal and the situation weights are fitted (fittingOrder)",
    notOn: "sacks (post hoc in the ADR-061 sense) and ESPN (no league average; entry 125) (ADR-089:426)",
  },
  separation: {
    statistic: "spread_g = |loss_g(set 1) - loss_g(set 2)|",
    rule: "no separation if worst - best <= 2 * max_g spread_g, best and worst on seed set 1, over all 14 points",
    seedSets: [1, 2],
    adrLine: 425,
  },
  fallback: {
    id: "D1",
    curve: "pressured_share_by_release_bin",
    population: "attempts, throwaways counted as throws on both sides (ADR-089:188)",
    real: [...REAL.pressuredRaw],
    realSource: "ADR-089:179, as printed",
    weights: [...REAL.attemptSharesRaw],
    rule: "the same loss, separation statistic and winner rule",
    ledger: "the pressured-by-release curve moves out of the falsifiers and into the fitted ledger, and the report says so",
    ifNotSeparatedEither: "the design states no further step: the fallback's minimum stands and its separation is reported",
    adrLine: 425,
  },
};

export const FILED_FITTING_ORDER: FiledFittingOrder = {
  adrLine: 1128,
  steps: [
    "1. step 5a: the three read-system budget deltas, on the clean bench, which sees no line",
    "2. step 5b: the block clock, by the filed selection rule, with b at its provisional 5",
    "3. step 10: b, fitted to the league sack share of hit-or-sack, 44.6%, on its filed grid",
    "4. step 10: the throwaway appeal, fitted to 3.54% overall and 8.84% pressured",
    "5. step 10: the situation weights",
    "6. step 10: the block clock selection re-run once, mechanically, with those three fixed (b moves hits between release bins)",
    "7. step 10: if the selection changes, b is refitted once on the new clock and the process stops; both passes are reported",
  ],
  maxPasses: 2,
  ownerReturn: "If the second pass would change the selection again, the design comes back to the owner (ADR-089:1128).",
};

export const FILED_ARRIVAL_READING: FiledRule = {
  adrLine: 698,
  text:
    "Default D21, filed at step 0 and never chosen by a fit: for the throwing motion, a free runner reaches him at his free-run " +
    "time in tenths; a beaten blocker's man reaches him at his breaking time T_j plus his travel, not at his published arrival " +
    "on the half-second grid; under shape L the breaking time is L's crossing time. This is a race between the throw and the " +
    "hit only: with the ball still in his hand, contact resolves on the half-second grid, as today. RUSH_THREAT.etaTick keeps " +
    "its documented meaning; the continuous time lives only on QB_HIT. The half-second reading runs as information only, and " +
    "switching readings to pass a row is never allowed (ADR-089:1040).",
  params: {
    freeRunner: "his free-run time, in tenths (ADR-089:618)",
    wonRepS: "T_j + his travel (ADR-061's table, unchanged)",
    wonRepL: "T_L + his travel",
    lateBlock: "the late block's breaking or crossing time + his travel (ADR-089:546)",
    heldBall: "contact on the half-second grid, as today",
    onTheStream: "QB_HIT.contactSeconds; RUSH_THREAT.etaTick unchanged",
    informationOnly: "the half-second reading",
  },
};

export const FILED_L_CROSSING_TIME: FiledRule = {
  adrLine: 422,
  text:
    "Under shape L a won rep's continuous time is its crossing time, interpolated within the tick from its two reported margins: " +
    "T_L = (t - 0.5) + 0.5 * (15 - m(t - 0.5)) / (m(t) - m(t - 0.5)), clamped to (t - 0.5, t], where t is the first tick at " +
    "which the margin reaches 15 (RUSHER_WINS_REP); m(0) = 0, which follows from min(1, 0/R) = 0. His arrival is T_L plus his " +
    "travel, so both shapes are scored on the same reading.",
  params: {
    formula: "T_L = (t - 0.5) + 0.5 * (15 - m(t - 0.5)) / (m(t) - m(t - 0.5))",
    clamp: "(t - 0.5, t]",
    t: "the first tick whose margin reaches 15",
    threshold: 15,
    tickStepSeconds: 0.5,
    m0: "m(0) = 0, from min(1, 0/R) = 0 (C1-N2; not CHOSEN)",
    arrival: "T_L + his travel",
  },
};

export const FILED_LATE_BLOCK: FiledRule = {
  adrLine: 546,
  text:
    "The late block on both shapes, for a man somebody got a hand on only (RAN_THROUGH, LATE_EXCHANGE; default D19). Its rep " +
    "margin is the touching CHECK's margin turned round, m = -(margin) of the blitz_pickup or stunt_communication CHECK, so 1 to " +
    "19. Shape S: T = t_e + w * theta * exp(-beta * m/41) * E^(1/k), w the weak-block multiplier, E drawn on fork beat/<rollRef> " +
    "where rollRef is that CHECK's rngLabel, published as a pass_rush_beat CHECK (P2). Shape L: round(min(1, (t - t_e)/(w * R)) " +
    "* (m + jitter_t)), the jitter drawn each tick on .../t<tick>/<rusherId>:late. Once beaten, his threat is built as a won " +
    "rep's is, and D21 reads his time as the shape's breaking or crossing time plus that travel. Its dials t_e and w stay CHOSEN.",
  params: {
    appliesTo: ["RAN_THROUGH", "LATE_EXCHANGE"],
    never: ["BLOWN_UP", "LOOPER_FREE"],
    margin: "m = -(margin of the touching CHECK), 1 to 19",
    shapeS: "T = t_e + w * theta * exp(-beta * m/41) * E^(1/k); E on beat/<rollRef of the touching CHECK>",
    shapeL: "round(min(1, (t - t_e) / (w * R)) * (m + jitter_t)); jitter on .../t<tick>/<rusherId>:late",
    dials: ["t_e", "w"],
    arrival: "D21: breaking or crossing time + travel",
  },
};
