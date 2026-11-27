/**
 * ADR-089 STEP 5a'S FIT (plan §4's `fit5a.ts` row, §5.0; AM-9 `fit.*`, filing §4.1 and §4.3): the three
 * read-system budget deltas, fitted on the clean bench to the clean attempts row's release windows.
 *
 *  - **Dials** (`fit.dials`): `qb.readSystem.{HALF_FIELD,FULL_FIELD,CONCEPT}.budgetDeltaSeconds`, today
 *    -0.5, +1.0 and -1.0 s, and nothing else.
 *  - **Grid** (`fit.grid`): offsets from today's values, -1.5 to +3.0 s by 0.25 s (19 values). Run k
 *    sets all three deltas to today's plus offset k. Never widened; a winner on an edge says so.
 *  - **Target** (`fit.target`, ADR-089:194): 11 windows (t - 0.25, t + 0.25] for t = 0.5 to 5.0 by
 *    0.5, the last "> 5.25", as printed (sum 99.8), renormalized to 100. A release at or under 0.25 s
 *    counts in the first window (counted apart, `atOrUnder025`).
 *  - **Population** (`fit.population`): every aimed THROW on the bench, in the pocket and on the run,
 *    binned on `THROW.releaseSeconds`, or its tick where it has none (a throw after an escape),
 *    keyed to its read system by `PLAY_START`'s `readSystem`. Runs and sacks are not attempts; the
 *    s5 bench has no throwaway (counted, and refused by the runner as a build fault).
 *  - **Bench** (`fit.bench`): E8 (the checklist joint, the drop floor, the reset 1.0 s), the
 *    generated league, seed set 1, caller v7, on step 4's clock.
 *  - **Method** (`fit.method`): the 19 runs give per-system window counts h_s(g); for every (a, b, c)
 *    on the grid (6,859 combinations) the estimate sums h_HALF(a) + h_FULL(b) + h_CONCEPT(c),
 *    normalizes to percent and scores the sum over the windows of (sim - real)^2 in percentage points
 *    squared, at full float precision. The least loss wins; exactly equal losses go to the least sum
 *    of |offset|, then to the lexicographically smallest (HALF, FULL, CONCEPT).
 *  - **Approximation** (`fit.approximation`): each system's call count across the runs (the largest
 *    relative deviation), and a confirm run at the winning deltas jointly with its full-run loss
 *    beside the estimate's; a gap over 20% is named. The estimate decides.
 *  - **Record** (`fit.record`, filing §4.3): written once, refusing to overwrite; window counts, call
 *    counts, losses and the winner only, never a falsifier row by grid value (critique 4 S10). Before
 *    it is written a fresh process with no cache re-plays the winning offsets' runs and must give
 *    byte-equal histograms; otherwise nothing is written (a build fault). Library code never starts
 *    a process (`carryForward.test.ts`): the operator runs the fresh one in another shell
 *    (`--fit-replay`, the command printed), which writes `fit-replay.json` beside the cached runs.
 *
 * The pure parts (windows, folds, losses, winner, record, recomputation) are separate from the runner
 * (`runFit5a`), which plays the runs into a cache keyed by the source fingerprint (refused from a
 * dirty tree), reads the fresh replay the operator's second process wrote (`readFitReplay`, or a
 * test's stand-in), plays the confirm run and writes the record. No clock is read and no die is drawn here outside the games themselves.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { canonicalise, stableDigest } from "../harness/digest.js";
import { genSeason } from "./corpus.js";
import { STEP0_FILED_DIGEST } from "./filed.js";
import { foldDigests, gameDigest } from "./golden.js";
import { CLEAN_BENCH_PARTS, cleanBenchTunablesS5 } from "./oneThreatBench.js";
import { overlayDigestOf, POCKET_1_S5A_FIT_DIGEST, READ_SYSTEMS, type ReadSystem, type ReadSystemOffsets } from "./rules.js";
import { jsonText, STEP1_CALLER, writeAtomic, type Step1Corpus, type Step1Env } from "./step1.js";
import { playsOf, readDropback } from "./throwClass.js";

export const FIT5A_FORMAT = "adr-089-step5a-fit/v1";
export const FIT5A_RUN_FORMAT = "adr-089-step5a-fit-run/v1";
export const FIT5A_REPLAY_FORMAT = "adr-089-step5a-fit-replay/v1";

/** The committed fit record, relative to the package (AM-9 `fit.record`). */
export const FIT5A_RECORD = "reports/adr-089-step5a.fit.json";

/** The grid's offsets from today's deltas, seconds, in order (AM-9 `fit.grid`): 19 values. */
export const FIT_OFFSETS: readonly number[] = Object.freeze([-1.5, -1.25, -1.0, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0]);
export const FIT_GRID_SIZE = FIT_OFFSETS.length;
export const FIT_COMBINATIONS = FIT_GRID_SIZE ** 3;
/** The index of offset 0 (today's deltas). */
export const FIT_TODAY_INDEX = FIT_OFFSETS.indexOf(0);

/** Today's deltas (AM-9 `fit.dials`), checked against `DEFAULT_TUNABLES` by `checkFitToday`. */
export const FIT_TODAY: Readonly<Record<ReadSystem, number>> = Object.freeze({ HALF_FIELD: -0.5, FULL_FIELD: 1.0, CONCEPT: -1.0 });

/** The 11 windows (AM-9 `fit.target`). */
export const FIT_WINDOWS: readonly string[] = Object.freeze(["(0.25,0.75]", "(0.75,1.25]", "(1.25,1.75]", "(1.75,2.25]", "(2.25,2.75]", "(2.75,3.25]", "(3.25,3.75]", "(3.75,4.25]", "(4.25,4.75]", "(4.75,5.25]", ">5.25"]);
export const FIT_WINDOW_COUNT = FIT_WINDOWS.length;

/** ADR-089:194, the clean attempts row, as printed (percent; sums to 99.8). */
export const FIT_TARGET_AS_PRINTED: readonly number[] = Object.freeze([0.5, 5.8, 14.3, 26.2, 23.4, 15.5, 7.9, 3.1, 1.2, 0.8, 1.1]);
export const FIT_TARGET_ADR_LINE = 194;

/** The target renormalized to 100 at full precision (the sim side sums to 100). */
export function fitTargetUsed(): readonly number[] {
  const sum = FIT_TARGET_AS_PRINTED.reduce((a, b) => a + b, 0);
  return FIT_TARGET_AS_PRINTED.map((x) => (100 * x) / sum);
}

/** Refuses a base whose read-system deltas are not today's (the grid is offsets from these). */
export function checkFitToday(base: Tunables = DEFAULT_TUNABLES): void {
  for (const s of READ_SYSTEMS) {
    const v = base.qb.readSystem[s].budgetDeltaSeconds;
    if (v !== FIT_TODAY[s]) throw new Error(`ADR-089 step 5a fit: ${s}'s delta is ${String(v)} on this build, not today's ${String(FIT_TODAY[s])}; the grid is offsets from today's values (AM-9 fit.grid)`);
  }
}

/**
 * The window a release falls in (0 to 10), on whole milliseconds so no edge depends on float error:
 * (t - 0.25, t + 0.25] for t = 0.5 to 5.0, at or under 0.25 s in the first window, over 5.25 s in the last.
 */
export function fitWindowOf(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError(`fitWindowOf: a release must be a finite number of seconds at or after the snap (got ${String(seconds)})`);
  const ms = Math.round(seconds * 1000);
  if (ms <= 750) return 0;
  if (ms > 5250) return FIT_WINDOW_COUNT - 1;
  return Math.ceil((ms - 250) / 500) - 1;
}

// --- the fold ------------------------------------------------------------------------------------------

/** One system's figures on one run. */
export interface FitSystemFold {
  /** Dropbacks called with this read system. */
  calls: number;
  /** Aimed THROWs (the population). */
  attempts: number;
  /** Of them, binned on the tick (no `releaseSeconds`: a throw after an escape). */
  binnedOnTick: number;
  /** Window counts, `FIT_WINDOWS` order. */
  counts: number[];
}

export interface FitFold {
  bySystem: Record<ReadSystem, FitSystemFold>;
  /** Releases at or under 0.25 s (counted in the first window). */
  atOrUnder025: number;
  /** Throwaways seen (0 on the s5 bench; the runner refuses any). */
  throwaways: number;
  /** Dropbacks whose read system is not one of the three (refused by the runner). */
  unknownSystem: number;
  /** One `gameDigest` per game, in order. */
  games: string[];
}

export function emptyFitFold(): FitFold {
  const sys = (): FitSystemFold => ({ calls: 0, attempts: 0, binnedOnTick: 0, counts: FIT_WINDOWS.map(() => 0) });
  return { bySystem: { HALF_FIELD: sys(), FULL_FIELD: sys(), CONCEPT: sys() }, atOrUnder025: 0, throwaways: 0, unknownSystem: 0, games: [] };
}

const isReadSystem = (s: string): s is ReadSystem => (READ_SYSTEMS as readonly string[]).includes(s);

/** The THROW's `releaseSeconds` on a play's events, when it carries one. */
export function releaseSecondsOf(events: readonly MatchEventEnvelope[]): number | undefined {
  for (const e of events) {
    const ev = e.event as { readonly type?: unknown; readonly payload?: { readonly releaseSeconds?: unknown } };
    if (ev.type === "THROW") return typeof ev.payload?.releaseSeconds === "number" ? ev.payload.releaseSeconds : undefined;
  }
  return undefined;
}

/** Adds one game's aimed throws to the fold (AM-9 `fit.population`). */
export function foldFitGame(fold: FitFold, events: readonly MatchEventEnvelope[]): void {
  fold.games.push(gameDigest(events));
  for (const slice of playsOf(events)) {
    const d = readDropback(slice);
    if (d === undefined) continue;
    if (d.throwawayTick !== undefined) fold.throwaways += 1;
    if (!isReadSystem(d.start.readSystem)) {
      fold.unknownSystem += 1;
      continue;
    }
    const sys = fold.bySystem[d.start.readSystem];
    sys.calls += 1;
    if (d.throwTick === undefined) continue;
    const raw = releaseSecondsOf(slice.events);
    const release = raw ?? d.throwTick;
    if (raw === undefined) sys.binnedOnTick += 1;
    if (Math.round(release * 1000) <= 250) fold.atOrUnder025 += 1;
    sys.attempts += 1;
    const w = fitWindowOf(release);
    sys.counts[w] = (sys.counts[w] ?? 0) + 1;
  }
}

// --- the loss and the winner (pure) ---------------------------------------------------------------------

/** Window counts per system for one run (the record's `runs[k].counts`). */
export type SystemCounts = Readonly<Record<ReadSystem, readonly number[]>>;

/** The loss of one window histogram against the target: sum of (sim% - real%)^2, full precision. */
export function windowLoss(counts: readonly number[], target: readonly number[] = fitTargetUsed()): number {
  if (counts.length !== FIT_WINDOW_COUNT || target.length !== FIT_WINDOW_COUNT) throw new Error(`windowLoss: ${String(FIT_WINDOW_COUNT)} windows on both sides`);
  const total = counts.reduce((a, b) => a + b, 0);
  if (!(total > 0)) return Number.POSITIVE_INFINITY;
  let s = 0;
  for (let i = 0; i < FIT_WINDOW_COUNT; i += 1) s += ((100 * counts[i]!) / total - target[i]!) ** 2;
  return s;
}

/** The index of a combination: 361 * iHALF + 19 * iFULL + iCONCEPT (filing §4.3 `losses.order`). */
export const comboIndex = (iHalf: number, iFull: number, iConcept: number): number => FIT_GRID_SIZE * FIT_GRID_SIZE * iHalf + FIT_GRID_SIZE * iFull + iConcept;

/**
 * Every combination's estimated loss (AM-9 `fit.method`): the sum of HALF's counts at a, FULL's at b
 * and CONCEPT's at c, one histogram, scored against the target.
 */
export function estimateLosses(runs: readonly SystemCounts[], target: readonly number[] = fitTargetUsed()): number[] {
  if (runs.length !== FIT_GRID_SIZE) throw new Error(`estimateLosses: one run per grid offset (${String(FIT_GRID_SIZE)}), got ${String(runs.length)}`);
  const out = new Array<number>(FIT_COMBINATIONS);
  const h = new Array<number>(FIT_WINDOW_COUNT);
  for (let a = 0; a < FIT_GRID_SIZE; a += 1) {
    for (let b = 0; b < FIT_GRID_SIZE; b += 1) {
      for (let c = 0; c < FIT_GRID_SIZE; c += 1) {
        for (let i = 0; i < FIT_WINDOW_COUNT; i += 1) h[i] = runs[a]!.HALF_FIELD[i]! + runs[b]!.FULL_FIELD[i]! + runs[c]!.CONCEPT[i]!;
        out[comboIndex(a, b, c)] = windowLoss(h, target);
      }
    }
  }
  return out;
}

export type FitDecidedBy = "loss" | "sumAbsOffset" | "lexicographic";

export interface FitWinner {
  readonly index: readonly [number, number, number];
  readonly offsets: Readonly<Record<ReadSystem, number>>;
  readonly deltas: Readonly<Record<ReadSystem, number>>;
  readonly loss: number;
  /** The other combinations whose loss is exactly the winner's, as offsets. */
  readonly tiedWith: readonly Readonly<Record<ReadSystem, number>>[];
  readonly decidedBy: FitDecidedBy;
  /** CONCEPT's offset was set by the tie rule: another CONCEPT value gives exactly the same loss at the winner's HALF and FULL. */
  readonly conceptSetByTie: boolean;
  readonly onEdge: Readonly<Record<ReadSystem, boolean>>;
  /** The winner is today's deltas on all three: E9 is E8 and is not defined apart. */
  readonly e9IsE8: boolean;
}

const offsetsAt = (a: number, b: number, c: number): Record<ReadSystem, number> => ({ HALF_FIELD: FIT_OFFSETS[a]!, FULL_FIELD: FIT_OFFSETS[b]!, CONCEPT: FIT_OFFSETS[c]! });
const sumAbs = (o: Readonly<Record<ReadSystem, number>>): number => Math.abs(o.HALF_FIELD) + Math.abs(o.FULL_FIELD) + Math.abs(o.CONCEPT);

/** The winner (AM-9 `fit.method`): least loss; exact ties to the least sum of |offset|, then the lexicographically smallest (HALF, FULL, CONCEPT). */
export function fitWinnerOf(losses: readonly number[]): FitWinner {
  if (losses.length !== FIT_COMBINATIONS) throw new Error(`fitWinnerOf: ${String(FIT_COMBINATIONS)} losses, got ${String(losses.length)}`);
  let best = Number.POSITIVE_INFINITY;
  for (const v of losses) if (v < best) best = v;
  if (!Number.isFinite(best)) throw new Error("fitWinnerOf: no combination has a finite loss (every histogram is empty)");
  const tied: [number, number, number][] = [];
  for (let a = 0; a < FIT_GRID_SIZE; a += 1) for (let b = 0; b < FIT_GRID_SIZE; b += 1) for (let c = 0; c < FIT_GRID_SIZE; c += 1) if (losses[comboIndex(a, b, c)] === best) tied.push([a, b, c]);
  const minSum = Math.min(...tied.map(([a, b, c]) => sumAbs(offsetsAt(a, b, c))));
  const bySum = tied.filter(([a, b, c]) => sumAbs(offsetsAt(a, b, c)) === minSum);
  // Lexicographic on (HALF, FULL, CONCEPT) offsets; the grid ascends, so the first in index order.
  const win = bySum[0]!;
  const decidedBy: FitDecidedBy = tied.length === 1 ? "loss" : bySum.length === 1 ? "sumAbsOffset" : "lexicographic";
  const [a, b, c] = win;
  const offsets = offsetsAt(a, b, c);
  let conceptSetByTie = false;
  for (let cc = 0; cc < FIT_GRID_SIZE; cc += 1) if (cc !== c && losses[comboIndex(a, b, cc)] === best) conceptSetByTie = true;
  const edge = (i: number): boolean => i === 0 || i === FIT_GRID_SIZE - 1;
  return {
    index: [a, b, c],
    offsets,
    deltas: { HALF_FIELD: FIT_TODAY.HALF_FIELD + offsets.HALF_FIELD, FULL_FIELD: FIT_TODAY.FULL_FIELD + offsets.FULL_FIELD, CONCEPT: FIT_TODAY.CONCEPT + offsets.CONCEPT },
    loss: best,
    tiedWith: tied.filter((t) => t !== win).map(([x, y, z]) => offsetsAt(x, y, z)),
    decidedBy,
    conceptSetByTie,
    onEdge: { HALF_FIELD: edge(a), FULL_FIELD: edge(b), CONCEPT: edge(c) },
    e9IsE8: offsets.HALF_FIELD === 0 && offsets.FULL_FIELD === 0 && offsets.CONCEPT === 0,
  };
}

/** The largest relative deviation of each system's call count from its mean across the runs (AM-9 `fit.approximation`). */
export function callDeviationOf(calls: readonly Readonly<Record<ReadSystem, number>>[]): Record<ReadSystem, number> {
  const out = {} as Record<ReadSystem, number>;
  for (const s of READ_SYSTEMS) {
    const xs = calls.map((c) => c[s]);
    const mean = xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
    out[s] = mean === 0 ? 0 : Math.max(...xs.map((x) => Math.abs(x - mean) / mean));
  }
  return out;
}

/** The distinct offsets the winner uses (one to three), ascending: the runs the fresh replay re-plays. */
export function replayOffsetsOf(w: Pick<FitWinner, "offsets">): readonly number[] {
  return [...new Set(READ_SYSTEMS.map((s) => w.offsets[s]))].sort((x, y) => x - y);
}

/** The full-run loss of a joint run (the confirm run): all systems' counts summed. */
export function jointLoss(bySystem: SystemCounts, target: readonly number[] = fitTargetUsed()): number {
  const h = FIT_WINDOWS.map((_, i) => READ_SYSTEMS.reduce((a, s) => a + (bySystem[s][i] ?? 0), 0));
  return windowLoss(h, target);
}

/** The confirm run's gap over the estimate, percent of the estimate; named when above 20% (AM-9 `fit.approximation`). */
export const FIT_GAP_NAMED_PERCENT = 20;

// --- the record (filing §4.3) ---------------------------------------------------------------------------

export interface FitRun {
  readonly k: number;
  readonly offset: number;
  readonly deltas: Readonly<Record<ReadSystem, number>>;
  readonly overlayDigest: string;
  readonly streamDigest: string;
  readonly calls: Readonly<Record<ReadSystem, number>>;
  readonly attempts: Readonly<Record<ReadSystem, number>>;
  readonly binnedOnTick: Readonly<Record<ReadSystem, number>>;
  readonly atOrUnder025: number;
  readonly counts: SystemCounts;
}

export interface FitRecord {
  readonly format: typeof FIT5A_FORMAT;
  readonly adr: string;
  readonly filing: string;
  readonly amendments: string;
  readonly rule: string;
  readonly sourceFingerprint: string;
  readonly bench: {
    readonly arm: "E8";
    readonly league: "gen";
    readonly seedSet: 1;
    readonly games: number;
    readonly caller: string;
    readonly clock: string;
    readonly overlayDigest: string;
    readonly corpus: Step1Corpus;
  };
  readonly today: Readonly<Record<ReadSystem, number>>;
  readonly offsets: readonly number[];
  readonly target: { readonly windows: readonly string[]; readonly asPrinted: readonly number[]; readonly sumAsPrinted: number; readonly used: readonly number[]; readonly adrLine: number };
  readonly runs: readonly FitRun[];
  readonly callDeviation: Readonly<Record<ReadSystem, number>>;
  readonly losses: { readonly order: string; readonly values: readonly number[] };
  readonly todayLoss: number;
  readonly winner: Omit<FitWinner, "index">;
  readonly replay: { readonly process: "fresh, no cache"; readonly offsets: readonly number[]; readonly histogramsEqual: true };
  readonly confirm: { readonly deltas: Readonly<Record<ReadSystem, number>>; readonly streamDigest: string; readonly loss: number; readonly estimateLoss: number; readonly gapPercent: number; readonly named: boolean };
}

export const FIT_CLOCK_TEXT = "S theta 11, k 2, beta 0.5, push window";
export const FIT_LOSS_ORDER = "index = 361 * iHALF + 19 * iFULL + iCONCEPT, i into offsets";

/** One cached fit run's figures from its fold. */
export function fitRunOf(k: number, overlayDigest: string, fold: FitFold): FitRun {
  const offset = FIT_OFFSETS[k];
  if (offset === undefined) throw new RangeError(`fitRunOf: no grid offset ${String(k)}`);
  const by = <T>(f: (s: FitSystemFold) => T): Record<ReadSystem, T> => ({ HALF_FIELD: f(fold.bySystem.HALF_FIELD), FULL_FIELD: f(fold.bySystem.FULL_FIELD), CONCEPT: f(fold.bySystem.CONCEPT) });
  return {
    k,
    offset,
    deltas: { HALF_FIELD: FIT_TODAY.HALF_FIELD + offset, FULL_FIELD: FIT_TODAY.FULL_FIELD + offset, CONCEPT: FIT_TODAY.CONCEPT + offset },
    overlayDigest,
    streamDigest: foldDigests(fold.games),
    calls: by((s) => s.calls),
    attempts: by((s) => s.attempts),
    binnedOnTick: by((s) => s.binnedOnTick),
    atOrUnder025: fold.atOrUnder025,
    counts: by((s) => [...s.counts]),
  };
}

export interface FitRecordInput {
  readonly amendments: string;
  readonly fingerprint: string;
  readonly games: number;
  readonly benchOverlayDigest: string;
  readonly corpus: Step1Corpus;
  readonly runs: readonly FitRun[];
  readonly confirm: { readonly counts: SystemCounts; readonly streamDigest: string };
  readonly replayOffsets: readonly number[];
}

/** Builds the record (pure) once the replay has matched: the losses, the winner and the confirm run's gap. */
export function buildFitRecord(x: FitRecordInput): FitRecord {
  if (x.runs.length !== FIT_GRID_SIZE || x.runs.some((r, i) => r.k !== i)) throw new Error(`buildFitRecord: the ${String(FIT_GRID_SIZE)} runs in offset order`);
  const target = fitTargetUsed();
  const values = estimateLosses(x.runs.map((r) => r.counts), target);
  // A combination with no attempt in any window has no loss (`windowLoss` gives Infinity, which JSON
  // writes as null, and `verifyFitRecord` would then read as an altered record): refused here by name,
  // before anything is written (code-tests F16).
  const empty = values.findIndex((v) => !Number.isFinite(v));
  if (empty >= 0) throw new Error(`buildFitRecord: combination ${String(empty)} has no attempt in any window, so it has no loss; nothing was written`);
  const w = fitWinnerOf(values);
  const { index: _index, ...winner } = w;
  void _index;
  const confirmLoss = jointLoss(x.confirm.counts, target);
  if (!Number.isFinite(confirmLoss)) throw new Error("buildFitRecord: the confirm run has no attempt in any window, so it has no loss; nothing was written");
  if (w.loss === 0) throw new Error("buildFitRecord: the winner's estimated loss is 0, so the confirm run's gap has no percent (AM-9 `fit.approximation` reads it); nothing was written");
  const gapPercent = (100 * (confirmLoss - w.loss)) / w.loss;
  return {
    format: FIT5A_FORMAT,
    adr: "docs/decisions/ADR-089-the-pocket-on-a-real-clock.md",
    filing: STEP0_FILED_DIGEST,
    amendments: x.amendments,
    rule: "AM-9 readings fit.*",
    sourceFingerprint: x.fingerprint,
    bench: { arm: "E8", league: "gen", seedSet: 1, games: x.games, caller: STEP1_CALLER, clock: FIT_CLOCK_TEXT, overlayDigest: x.benchOverlayDigest, corpus: { flatFirst: x.corpus.flatFirst, genThroughWeek: x.corpus.genThroughWeek } },
    today: { ...FIT_TODAY },
    offsets: [...FIT_OFFSETS],
    target: { windows: [...FIT_WINDOWS], asPrinted: [...FIT_TARGET_AS_PRINTED], sumAsPrinted: 99.8, used: target, adrLine: FIT_TARGET_ADR_LINE },
    runs: x.runs,
    callDeviation: callDeviationOf(x.runs.map((r) => r.calls)),
    losses: { order: FIT_LOSS_ORDER, values },
    todayLoss: values[comboIndex(FIT_TODAY_INDEX, FIT_TODAY_INDEX, FIT_TODAY_INDEX)]!,
    winner,
    replay: { process: "fresh, no cache", offsets: [...x.replayOffsets], histogramsEqual: true },
    confirm: { deltas: { ...w.deltas }, streamDigest: x.confirm.streamDigest, loss: confirmLoss, estimateLoss: w.loss, gapPercent, named: Math.abs(gapPercent) > FIT_GAP_NAMED_PERCENT },
  };
}

/**
 * Recomputes the 6,859 losses and the winner from a record's runs and target (R-6's second-process
 * check): every problem found, empty when the record holds exactly. Losses compare bit for bit.
 */
export function verifyFitRecord(r: FitRecord): readonly string[] {
  const out: string[] = [];
  if (r.format !== FIT5A_FORMAT) out.push(`format ${String(r.format)}, not ${FIT5A_FORMAT}`);
  if (canonicalise(r.offsets) !== canonicalise(FIT_OFFSETS)) out.push("the offsets are not the filed grid");
  if (canonicalise(r.target.asPrinted) !== canonicalise(FIT_TARGET_AS_PRINTED)) out.push("the target is not ADR-089:194 as printed");
  if (canonicalise(r.target.used) !== canonicalise(fitTargetUsed())) out.push("the target used is not the printed target renormalized to 100");
  if (out.length > 0) return out;
  const values = estimateLosses(r.runs.map((x) => x.counts), r.target.used);
  const differ = values.flatMap((v, i) => (Object.is(v, r.losses.values[i]) ? [] : [i]));
  if (r.losses.values.length !== values.length) out.push(`${String(r.losses.values.length)} losses, not ${String(values.length)}`);
  else if (differ.length > 0) out.push(`${String(differ.length)} loss(es) differ, first at index ${String(differ[0])}: ${String(r.losses.values[differ[0]!])} recorded, ${String(values[differ[0]!])} recomputed`);
  const { index: _index, ...w } = fitWinnerOf(values);
  void _index;
  if (canonicalise(w) !== canonicalise(r.winner)) out.push(`the winner recomputes to ${canonicalise(w.offsets)} (${w.decidedBy}), not the recorded ${canonicalise(r.winner.offsets)}`);
  return out;
}

/** The record's digest (`POCKET_1_S5A_FIT_DIGEST` once committed). */
export const fitRecordDigest = (r: FitRecord): string => stableDigest(r);

/** Reads a fit record and checks its form; refused when it is not one. */
export function readFitRecord(path: string): FitRecord {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as FitRecord;
  if (parsed.format !== FIT5A_FORMAT) throw new Error(`${path}: not a step-5a fit record (format ${String((parsed as { format?: unknown }).format)})`);
  return parsed;
}

/** Writes the record once: refused when the file already exists (AM-9 `fit.record`). */
export function writeFitRecordOnce(path: string, record: FitRecord): void {
  if (existsSync(path)) throw new Error(`ADR-089 step 5a fit: ${path} already exists; the fit record is written once and never over (AM-9 fit.record). Nothing was written`);
  writeAtomic(path, jsonText(record));
}

// --- the runner -----------------------------------------------------------------------------------------

/** The offsets every system takes on run k (all three move together). */
export const offsetsOfRun = (k: number): ReadSystemOffsets => {
  const o = FIT_OFFSETS[k];
  if (o === undefined) throw new RangeError(`no grid offset ${String(k)}`);
  return { HALF_FIELD: o, FULL_FIELD: o, CONCEPT: o };
};

/** The fit's bench at given offsets: E8's parts (every part of the block, the floor among them). */
export const fitBenchTunables = (offsets: ReadSystemOffsets): Tunables => cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS }, offsets);

/** Plays one fit run (gen, seed set 1, caller v7) at the given offsets and folds it. */
export function playFitRun(offsets: ReadSystemOffsets, corpus: Step1Corpus): { readonly fold: FitFold; readonly overlayDigest: string } {
  const tunables = fitBenchTunables(offsets);
  const fold = emptyFitFold();
  genSeason(1, (o) => foldFitGame(fold, o.events), { tunables, callerVersion: STEP1_CALLER, ...(corpus.genThroughWeek === null ? {} : { throughWeek: corpus.genThroughWeek }) });
  return { fold, overlayDigest: overlayDigestOf(tunables) };
}

/** A fit run's problems a record may not carry (AM-9 `fit.population`: the s5 bench has no throwaway). */
export function fitFoldProblems(fold: FitFold): readonly string[] {
  return [
    ...(fold.throwaways > 0 ? [`${String(fold.throwaways)} throwaway(s) on the s5 bench, which has none (AM-9 fit.population)`] : []),
    ...(fold.unknownSystem > 0 ? [`${String(fold.unknownSystem)} dropback(s) with a read system other than HALF_FIELD, FULL_FIELD and CONCEPT`] : []),
  ];
}

interface CachedFitRun {
  readonly format: typeof FIT5A_RUN_FORMAT;
  readonly stamp: { readonly k: number; readonly offset: number; readonly overlayDigest: string; readonly fingerprint: string; readonly filedDigest: string; readonly amendments: string; readonly caller: string; readonly corpus: Step1Corpus };
  readonly fold: FitFold;
}

export interface FitReplayResult {
  readonly format: typeof FIT5A_REPLAY_FORMAT;
  /** The build that played it (the fresh process's own source fingerprint). */
  readonly fingerprint: string;
  readonly corpus: Step1Corpus;
  readonly runs: readonly { readonly offset: number; readonly counts: SystemCounts }[];
}

/** Plays the given offsets' runs with no cache and returns their histograms (what the fresh process does). */
export function fitReplay(offsets: readonly number[], corpus: Step1Corpus, fingerprint: string): FitReplayResult {
  return {
    format: FIT5A_REPLAY_FORMAT,
    fingerprint,
    corpus,
    runs: offsets.map((o) => {
      const k = FIT_OFFSETS.indexOf(o);
      if (k < 0) throw new RangeError(`fitReplay: ${String(o)} is not a grid offset`);
      return { offset: o, counts: fitRunOf(k, "", playFitRun(offsetsOfRun(k), corpus).fold).counts };
    }),
  };
}

/** Where the operator's fresh process writes the fit's replay: beside the cached runs. */
export const fitReplayFileOf = (cacheDir: string): string => join(cacheDir, "fit-replay.json");

/** The command the operator runs in another shell for the fit's fresh replay (R-6). */
export function fitReplayCommandOf(offsets: readonly number[], corpus: Step1Corpus, file: string): string {
  return `pnpm --filter @ff/calibration pocket -- --step 5a --fit-replay ${offsets.join(",")}${corpus.genThroughWeek === null ? "" : ` --gen-through-week ${String(corpus.genThroughWeek)}`} --out ${file}`;
}

/**
 * The fresh replay the operator's second process wrote, or `undefined` while it is not there. A file
 * from another build, another corpus or other offsets is refused by name (delete it and run again).
 */
export function readFitReplay(file: string, fingerprint: string, offsets: readonly number[], corpus: Step1Corpus): FitReplayResult | undefined {
  if (!existsSync(file)) return undefined;
  const r = JSON.parse(readFileSync(file, "utf8")) as FitReplayResult;
  const why =
    r.format !== FIT5A_REPLAY_FORMAT
      ? `its format is ${String((r as { format?: unknown }).format)}, not ${FIT5A_REPLAY_FORMAT}`
      : r.fingerprint !== fingerprint
        ? `it was played at ${String(r.fingerprint)}, not this build's ${fingerprint}`
        : canonicalise(r.corpus) !== canonicalise({ flatFirst: corpus.flatFirst, genThroughWeek: corpus.genThroughWeek })
          ? `its corpus is ${canonicalise(r.corpus)}, not ${canonicalise(corpus)}`
          : canonicalise(r.runs.map((x) => x.offset)) !== canonicalise(offsets)
            ? `it re-plays offsets ${r.runs.map((x) => String(x.offset)).join(", ")}, not the winner's ${offsets.join(", ")}`
            : undefined;
  if (why !== undefined) throw new Error(`ADR-089 step 5a fit: the fresh replay at ${file} is not this fit's: ${why}. Delete it and run the fresh process again`);
  return r;
}

/** The named refusal of a fit once its record is committed (`POCKET_1_S5A_FIT_DIGEST` recorded). */
export const FIT5A_RECORDED_REFUSAL =
  "ADR-089 step 5a fit: refused: the fit is recorded (POCKET_1_S5A_FIT_DIGEST is set); the fit record is written once and never re-fitted (AM-9 fit.record, missAt5a). Nothing has played";

/** The named refusal of a fit cache from a dirty tree. */
export const FIT5A_DIRTY_REFUSAL =
  "ADR-089 step 5a fit: refused before anything plays: this tree is dirty, and the fit's runs are cached only from a clean tree (their fingerprint must name a commit the record can be re-made from): commit first. Nothing has played and no cache was made";

export interface Fit5aOptions {
  readonly env: Step1Env;
  readonly amendments: string;
  readonly cacheParent: string;
  readonly corpus: Step1Corpus;
  readonly shard?: { readonly index: number; readonly count: number };
  /** Where the record goes (written once); absent, the runs are played and nothing is written. */
  readonly out?: string;
  readonly log?: (line: string) => void;
  /** Tests only: plays a run (default `playFitRun`). */
  readonly play?: (offsets: ReadSystemOffsets, corpus: Step1Corpus) => { readonly fold: FitFold; readonly overlayDigest: string };
  /** Tests only: the fresh process's replay (default `readFitReplay` on `fit-replay.json` in the cache; `undefined` while it is not there). */
  readonly replay?: (offsets: readonly number[], corpus: Step1Corpus) => FitReplayResult | undefined;
  /** Tests only: stands in for `POCKET_1_S5A_FIT_DIGEST`. */
  readonly recordedFitDigest?: string | undefined;
}

export interface Fit5aResult {
  readonly cacheDir: string;
  readonly played: readonly number[];
  readonly cached: readonly number[];
  readonly remaining: readonly number[];
  readonly record?: FitRecord;
  readonly wrote?: string;
  /** Set while the fresh replay is not there: the command the operator runs in another shell, then `--fit` again. */
  readonly awaitingReplay?: string;
}

const runFileOf = (dir: string, k: number): string => join(dir, `k${String(k).padStart(2, "0")}.json`);

/**
 * `--step 5a --fit`: plays this shard's runs into the cache; once all 19 are cached, recomputes the
 * winner and reads the fresh process's re-play of the winning offsets' runs (byte-equal histograms
 * or a build fault, nothing written); while that is not there it prints the command and stops;
 * then it plays the confirm run and writes the record once to `out`.
 */
export function runFit5a(opts: Fit5aOptions): Fit5aResult {
  const log = opts.log ?? ((): void => undefined);
  const recorded = "recordedFitDigest" in opts ? opts.recordedFitDigest : POCKET_1_S5A_FIT_DIGEST;
  if (recorded !== undefined) throw new Error(FIT5A_RECORDED_REFUSAL);
  if (opts.env.dirty) throw new Error(FIT5A_DIRTY_REFUSAL);
  if (opts.out !== undefined && existsSync(opts.out)) throw new Error(`ADR-089 step 5a fit: ${opts.out} already exists; the fit record is written once and never over (AM-9 fit.record). Nothing has played`);
  checkFitToday();
  const shard = opts.shard ?? { index: 1, count: 1 };
  const cacheDir = join(opts.cacheParent, opts.env.fingerprint);
  mkdirSync(cacheDir, { recursive: true });
  const play = opts.play ?? playFitRun;
  const stampOf = (k: number, overlayDigest: string): CachedFitRun["stamp"] => ({
    k,
    offset: FIT_OFFSETS[k]!,
    overlayDigest,
    fingerprint: opts.env.fingerprint,
    filedDigest: STEP0_FILED_DIGEST,
    amendments: opts.amendments,
    caller: STEP1_CALLER,
    corpus: { flatFirst: opts.corpus.flatFirst, genThroughWeek: opts.corpus.genThroughWeek },
  });
  const read = (k: number): CachedFitRun => {
    const r = JSON.parse(readFileSync(runFileOf(cacheDir, k), "utf8")) as CachedFitRun;
    const want = stampOf(k, r.stamp.overlayDigest);
    if (r.format !== FIT5A_RUN_FORMAT || canonicalise(r.stamp) !== canonicalise(want)) {
      throw new Error(`ADR-089 step 5a fit: the cached run k${String(k)} at ${runFileOf(cacheDir, k)} is not this build's run (${canonicalise(r.stamp)}); delete it, or use another --cache`);
    }
    return r;
  };
  const played: number[] = [];
  const cached: number[] = [];
  for (let k = 0; k < FIT_GRID_SIZE; k += 1) {
    if (k % shard.count !== shard.index - 1) continue;
    if (existsSync(runFileOf(cacheDir, k))) {
      read(k);
      cached.push(k);
      continue;
    }
    log(`pocket step 5a fit: playing run k${String(k)} (offset ${String(FIT_OFFSETS[k])} s)`);
    const r = play(offsetsOfRun(k), opts.corpus);
    const problems = fitFoldProblems(r.fold);
    if (problems.length > 0) throw new Error(`ADR-089 step 5a fit: a build fault on run k${String(k)}: ${problems.join("; ")}. Nothing was written`);
    writeAtomic(runFileOf(cacheDir, k), jsonText({ format: FIT5A_RUN_FORMAT, stamp: stampOf(k, r.overlayDigest), fold: r.fold } satisfies CachedFitRun));
    played.push(k);
  }
  const remaining = FIT_OFFSETS.flatMap((_, k) => (existsSync(runFileOf(cacheDir, k)) ? [] : [k]));
  if (remaining.length > 0) {
    log(`pocket step 5a fit: ${String(remaining.length)} run(s) still to play (k${remaining.join(", k")}); the record is written once every run is cached`);
    return { cacheDir, played, cached, remaining };
  }
  const runs = FIT_OFFSETS.map((_, k) => {
    const r = read(k);
    return fitRunOf(k, r.stamp.overlayDigest, r.fold);
  });
  const games = read(0).fold.games.length;
  const { index: _index, ...w } = fitWinnerOf(estimateLosses(runs.map((r) => r.counts)));
  void _index;
  const replayOffsets = replayOffsetsOf(w);
  log(`pocket step 5a fit: the estimate's winner is ${canonicalise(w.offsets)} (${w.decidedBy}); a fresh process re-plays offsets ${replayOffsets.join(", ")}`);
  const replayFile = fitReplayFileOf(cacheDir);
  const fresh = (opts.replay ?? ((o: readonly number[], c: Step1Corpus) => readFitReplay(replayFile, opts.env.fingerprint, o, c)))(replayOffsets, opts.corpus);
  if (fresh === undefined) {
    const awaitingReplay = fitReplayCommandOf(replayOffsets, opts.corpus, replayFile);
    log(`pocket step 5a fit: the fresh replay is not there yet; in another shell run\n  ${awaitingReplay}\nthen run --fit again (the 19 runs are cached; nothing is written until the replay matches)`);
    return { cacheDir, played, cached, remaining, awaitingReplay };
  }
  for (const o of replayOffsets) {
    const mine = runs[FIT_OFFSETS.indexOf(o)]!.counts;
    const theirs = fresh.runs.find((x) => x.offset === o)?.counts;
    if (theirs === undefined || canonicalise(theirs) !== canonicalise(mine)) {
      throw new Error(`ADR-089 step 5a fit: a build fault: the fresh process's histograms at offset ${String(o)} differ from the cached run's (${theirs === undefined ? "missing" : canonicalise(theirs)} against ${canonicalise(mine)}). Nothing was written`);
    }
  }
  log(`pocket step 5a fit: the fresh replay matches in content (histograms, stamp and fingerprint; that it ran in a separate process is not proven, build departure 1); playing the confirm run at ${canonicalise(w.offsets)}`);
  const confirm = play(w.offsets, opts.corpus);
  const confirmProblems = fitFoldProblems(confirm.fold);
  if (confirmProblems.length > 0) throw new Error(`ADR-089 step 5a fit: a build fault on the confirm run: ${confirmProblems.join("; ")}. Nothing was written`);
  const confirmRun = fitRunOf(FIT_TODAY_INDEX, confirm.overlayDigest, confirm.fold);
  const record = buildFitRecord({
    amendments: opts.amendments,
    fingerprint: opts.env.fingerprint,
    games,
    benchOverlayDigest: runs[FIT_TODAY_INDEX]!.overlayDigest,
    corpus: opts.corpus,
    runs,
    confirm: { counts: confirmRun.counts, streamDigest: confirmRun.streamDigest },
    replayOffsets,
  });
  const problems = verifyFitRecord(record);
  if (problems.length > 0) throw new Error(`ADR-089 step 5a fit: the record does not recompute: ${problems.join("; ")}`);
  if (opts.out === undefined) return { cacheDir, played, cached, remaining, record };
  writeFitRecordOnce(opts.out, record);
  log(`pocket step 5a fit: wrote ${opts.out} (${fitRecordDigest(record)})`);
  return { cacheDir, played, cached, remaining, record, wrote: opts.out };
}
