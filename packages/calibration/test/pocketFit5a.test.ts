/**
 * ADR-089 step 5a: THE FIT (`fit5a.ts`; plan §4's `fit5a.ts` row, §5.0; AM-9 `fit.*`, filing §4.3).
 *
 * No fit is run here. The windows on their edges; the fold on a real stream (the first golden flat
 * game on E8's bench) against the stream's own THROWs; the loss on hand-checked histograms; the
 * 6,859-point estimate on synthetic per-system histograms with a known minimum; the tie rules
 * (least sum of |offset|, then lexicographic, and CONCEPT set by the tie); the record's round trip
 * and its bitwise recomputation; the write-once refusal; and the runner with a stand-in player and
 * a stand-in fresh replay: the cache, the shards, the refusals, the replay mismatch (a build fault,
 * nothing written) and the confirm run. The committed record's check waits by name until it exists.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { goldenGames } from "../src/pocket/corpus.js";
import {
  FIT5A_DIRTY_REFUSAL,
  FIT5A_FORMAT,
  FIT5A_RECORD,
  FIT5A_RECORDED_REFUSAL,
  FIT5A_REPLAY_FORMAT,
  FIT_COMBINATIONS,
  FIT_GRID_SIZE,
  FIT_OFFSETS,
  FIT_TARGET_AS_PRINTED,
  FIT_TODAY,
  FIT_TODAY_INDEX,
  FIT_WINDOWS,
  FIT_WINDOW_COUNT,
  buildFitRecord,
  callDeviationOf,
  checkFitToday,
  comboIndex,
  emptyFitFold,
  estimateLosses,
  fitBenchTunables,
  fitFoldProblems,
  fitRecordDigest,
  fitRunOf,
  fitTargetUsed,
  fitWindowOf,
  fitWinnerOf,
  foldFitGame,
  jointLoss,
  fitReplayCommandOf,
  fitReplayFileOf,
  readFitRecord,
  readFitReplay,
  replayOffsetsOf,
  runFit5a,
  verifyFitRecord,
  windowLoss,
  writeFitRecordOnce,
  type FitFold,
  type FitReplayResult,
  type FitRun,
  type SystemCounts,
} from "../src/pocket/fit5a.js";
import { fitTableLines, step5GateRefusal, step5GateState } from "../src/pocket/step5.js";
import { CLEAN_BENCH_PARTS, cleanBenchTunablesS5 } from "../src/pocket/oneThreatBench.js";
import { overlayDigestOf, POCKET_1_S5A_DIGEST, POCKET_1_S5A_FIT_DIGEST, POCKET_1_S5A_LEAVES, READ_SYSTEMS, readSystemDeltaLeaves, rulesTunables, type ReadSystem, type ReadSystemOffsets } from "../src/pocket/rules.js";
import { STEP1_CALLER, type Step1Corpus, type Step1Env } from "../src/pocket/step1.js";
import { playsOf, readDropback } from "../src/pocket/throwClass.js";

const zeros = (): number[] => FIT_WINDOWS.map(() => 0);

describe("the windows (AM-9 fit.target)", () => {
  it("are 11, (t - 0.25, t + 0.25] for t = 0.5 to 5.0 and > 5.25, the target as printed sums to 99.8", () => {
    expect(FIT_WINDOW_COUNT).toBe(11);
    expect(FIT_TARGET_AS_PRINTED.reduce((a, b) => a + b, 0)).toBeCloseTo(99.8, 9);
    const used = fitTargetUsed();
    expect(used.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
    expect(used[3]! / used[4]!).toBeCloseTo(26.2 / 23.4, 12);
  });

  it("bin every edge on whole milliseconds: the right edge in, the left edge out, at or under 0.25 s in the first", () => {
    expect(fitWindowOf(0)).toBe(0);
    expect(fitWindowOf(0.25)).toBe(0);
    expect(fitWindowOf(0.75)).toBe(0);
    expect(fitWindowOf(0.751)).toBe(1);
    expect(fitWindowOf(1.25)).toBe(1);
    expect(fitWindowOf(1.2500000001)).toBe(1);
    expect(fitWindowOf(2.25)).toBe(3);
    expect(fitWindowOf(2.26)).toBe(4);
    expect(fitWindowOf(5.0)).toBe(9);
    expect(fitWindowOf(5.25)).toBe(9);
    expect(fitWindowOf(5.251)).toBe(10);
    expect(fitWindowOf(9)).toBe(10);
    // 0.1 + 0.2 lands a hair over 0.3; it is still 300 ms, in the first window.
    expect(fitWindowOf(0.1 + 0.2)).toBe(0);
    expect(() => fitWindowOf(-0.1)).toThrow(RangeError);
    expect(() => fitWindowOf(Number.NaN)).toThrow(RangeError);
  });

  it("the grid is 19 offsets from -1.5 to +3.0 by 0.25 with today at 0, and today's deltas are this build's", () => {
    expect(FIT_GRID_SIZE).toBe(19);
    expect(FIT_COMBINATIONS).toBe(6859);
    expect(FIT_OFFSETS[0]).toBe(-1.5);
    expect(FIT_OFFSETS[18]).toBe(3.0);
    for (let i = 1; i < FIT_GRID_SIZE; i += 1) expect(FIT_OFFSETS[i]! - FIT_OFFSETS[i - 1]!).toBe(0.25);
    expect(FIT_OFFSETS[FIT_TODAY_INDEX]).toBe(0);
    expect(() => checkFitToday()).not.toThrow();
    for (const s of READ_SYSTEMS) expect(DEFAULT_TUNABLES.qb.readSystem[s].budgetDeltaSeconds).toBe(FIT_TODAY[s]);
    const moved = { ...DEFAULT_TUNABLES, qb: { ...DEFAULT_TUNABLES.qb, readSystem: { ...DEFAULT_TUNABLES.qb.readSystem, CONCEPT: { ...DEFAULT_TUNABLES.qb.readSystem.CONCEPT, budgetDeltaSeconds: -0.75 } } } };
    expect(() => checkFitToday(moved as unknown as typeof DEFAULT_TUNABLES)).toThrow(/CONCEPT's delta is -0.75/);
  });

  it("the bench is E8's (every part, the floor among them) at the offsets, stamped pocket-1.s5a, the read-system deltas moved", () => {
    const at0 = fitBenchTunables({ HALF_FIELD: 0, FULL_FIELD: 0, CONCEPT: 0 });
    expect(overlayDigestOf(at0)).toBe(overlayDigestOf(cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS })));
    expect(at0.engineRules?.name).toBe("pocket-1.s5a");
    expect(at0.pocket.cleanPocket?.dropFloor).toBeDefined();
    const moved = fitBenchTunables({ HALF_FIELD: 0.5, FULL_FIELD: -0.25, CONCEPT: 3 });
    expect(moved.qb.readSystem.HALF_FIELD.budgetDeltaSeconds).toBe(0);
    expect(moved.qb.readSystem.FULL_FIELD.budgetDeltaSeconds).toBe(0.75);
    expect(moved.qb.readSystem.CONCEPT.budgetDeltaSeconds).toBe(2);
    expect(overlayDigestOf(moved)).not.toBe(overlayDigestOf(at0));
  });
});

describe("the fold on a real stream (the first golden flat game on E8's bench)", () => {
  let events: readonly MatchEventEnvelope[] = [];
  let fold: FitFold;
  beforeAll(() => {
    goldenGames("flat", (o) => (events = [...o.events]), { tunables: fitBenchTunables({ HALF_FIELD: 0, FULL_FIELD: 0, CONCEPT: 0 }), callerVersion: STEP1_CALLER, first: 1 });
    fold = emptyFitFold();
    foldFitGame(fold, events);
  }, 120_000);

  it("counts every aimed THROW once, under its PLAY_START's read system, and every dropback as a call", () => {
    let dropbacks = 0;
    let throws = 0;
    const bySystem: Record<string, { calls: number; attempts: number }> = {};
    for (const slice of playsOf(events)) {
      const d = readDropback(slice);
      if (d === undefined) continue;
      dropbacks += 1;
      const row = (bySystem[d.start.readSystem] ??= { calls: 0, attempts: 0 });
      row.calls += 1;
      if (d.throwTick !== undefined) {
        throws += 1;
        row.attempts += 1;
      }
    }
    expect(dropbacks).toBeGreaterThan(10);
    expect(throws).toBeGreaterThan(5);
    let attempts = 0;
    let calls = 0;
    for (const s of READ_SYSTEMS) {
      const f = fold.bySystem[s];
      expect(f.counts.reduce((a, b) => a + b, 0)).toBe(f.attempts);
      expect(f.calls).toBe(bySystem[s]?.calls ?? 0);
      expect(f.attempts).toBe(bySystem[s]?.attempts ?? 0);
      attempts += f.attempts;
      calls += f.calls;
    }
    expect(attempts).toBe(throws);
    expect(calls).toBe(dropbacks);
    expect(fold.games).toHaveLength(1);
    expect(fitFoldProblems(fold)).toEqual([]);
  });

  it("bins on THROW.releaseSeconds, or the THROW's tick where it carries none (a throw after an escape)", () => {
    const want = zeros();
    let onTick = 0;
    let tick = 0;
    for (const e of events) {
      const ev = e.event as { type: string; payload: { tick?: number; releaseSeconds?: number } };
      if (ev.type === "TICK") tick = ev.payload.tick!;
      if (ev.type !== "THROW") continue;
      const r = ev.payload.releaseSeconds;
      if (r === undefined) onTick += 1;
      want[fitWindowOf(r ?? tick)]! += 1;
    }
    const got = FIT_WINDOWS.map((_, i) => READ_SYSTEMS.reduce((a, s) => a + fold.bySystem[s].counts[i]!, 0));
    expect(got).toEqual(want);
    expect(READ_SYSTEMS.reduce((a, s) => a + fold.bySystem[s].binnedOnTick, 0)).toBe(onTick);
    expect(onTick).toBeLessThan(READ_SYSTEMS.reduce((a, s) => a + fold.bySystem[s].attempts, 0));
  });

  it("names a throwaway and an unknown read system as build faults", () => {
    const f = emptyFitFold();
    f.throwaways = 2;
    f.unknownSystem = 1;
    expect(fitFoldProblems(f)).toEqual([expect.stringMatching(/2 throwaway\(s\) on the s5 bench/), expect.stringMatching(/1 dropback\(s\) with a read system other than/)]);
  });
});

describe("the loss (AM-9 fit.method)", () => {
  it("is the sum over windows of (sim% - real%)^2 in points squared, at full precision", () => {
    const target = fitTargetUsed();
    const exact = target.map((t) => t * 1000);
    expect(windowLoss(exact)).toBeCloseTo(0, 18);
    const one = zeros();
    one[3] = 7;
    const want = target.reduce((a, t, i) => a + ((i === 3 ? 100 : 0) - t) ** 2, 0);
    expect(windowLoss(one)).toBe(want);
    expect(windowLoss(zeros())).toBe(Number.POSITIVE_INFINITY);
    expect(() => windowLoss([1, 2])).toThrow(/11 windows/);
  });

  it("scores counts, not shares: two systems' histograms add before they normalize", () => {
    const half = zeros();
    half[3] = 90;
    const conc = zeros();
    conc[4] = 10;
    const j = jointLoss({ HALF_FIELD: half, FULL_FIELD: zeros(), CONCEPT: conc });
    const sum = zeros();
    sum[3] = 90;
    sum[4] = 10;
    expect(j).toBe(windowLoss(sum));
    // An equal-weight mix of shares would give 50/50; the counts give 90/10.
    const share = zeros();
    share[3] = 1;
    share[4] = 1;
    expect(j).not.toBe(windowLoss(share));
  });
});

/** Synthetic per-run histograms: system s's mass sits in window base_s + floor(k / 4), so later offsets release later. */
function syntheticRuns(base: Record<ReadSystem, number>, mass: Record<ReadSystem, number>): SystemCounts[] {
  return FIT_OFFSETS.map((_, k) => {
    const at = (s: ReadSystem): number[] => {
      const h = zeros();
      h[Math.min(base[s] + Math.floor(k / 4), FIT_WINDOW_COUNT - 1)] = mass[s];
      return h;
    };
    return { HALF_FIELD: at("HALF_FIELD"), FULL_FIELD: at("FULL_FIELD"), CONCEPT: at("CONCEPT") };
  });
}

describe("the estimate and the winner", () => {
  it("indexes 361a + 19b + c and sums HALF at a, FULL at b, CONCEPT at c", () => {
    expect(comboIndex(0, 0, 0)).toBe(0);
    expect(comboIndex(1, 0, 0)).toBe(361);
    expect(comboIndex(0, 1, 0)).toBe(19);
    expect(comboIndex(18, 18, 18)).toBe(6858);
    const runs = syntheticRuns({ HALF_FIELD: 0, FULL_FIELD: 2, CONCEPT: 5 }, { HALF_FIELD: 3, FULL_FIELD: 5, CONCEPT: 7 });
    const losses = estimateLosses(runs);
    expect(losses).toHaveLength(6859);
    const h = FIT_WINDOWS.map((_, i) => runs[4]!.HALF_FIELD[i]! + runs[9]!.FULL_FIELD[i]! + runs[17]!.CONCEPT[i]!);
    expect(losses[comboIndex(4, 9, 17)]).toBe(windowLoss(h));
    expect(() => estimateLosses(runs.slice(1))).toThrow(/one run per grid offset/);
  });

  it("finds a known minimum: the unique combination that reproduces the target exactly", () => {
    // Each system's run k is a fixed shape shifted by k; the shape at k = 6 (offset 0) for HALF,
    // 10 for FULL and 3 for CONCEPT sums to exactly 1000 x the target.
    const target = fitTargetUsed();
    const runs: SystemCounts[] = FIT_OFFSETS.map((_, k) => ({
      HALF_FIELD: target.map((t, i) => (k === 6 ? t * 200 : i === 10 ? 50 + k : 0)),
      FULL_FIELD: target.map((t, i) => (k === 10 ? t * 300 : i === 0 ? 70 + k : 0)),
      CONCEPT: target.map((t, i) => (k === 3 ? t * 500 : i === 5 ? 90 + k : 0)),
    }));
    const w = fitWinnerOf(estimateLosses(runs));
    expect(w.index).toEqual([6, 10, 3]);
    expect(w.offsets).toEqual({ HALF_FIELD: 0, FULL_FIELD: 1.0, CONCEPT: -0.75 });
    expect(w.deltas).toEqual({ HALF_FIELD: -0.5, FULL_FIELD: 2.0, CONCEPT: -1.75 });
    expect(w.decidedBy).toBe("loss");
    expect(w.tiedWith).toEqual([]);
    expect(w.conceptSetByTie).toBe(false);
    expect(w.onEdge).toEqual({ HALF_FIELD: false, FULL_FIELD: false, CONCEPT: false });
    expect(w.e9IsE8).toBe(false);
    expect(w.loss).toBeLessThan(1e-20);
  });

  it("breaks exact ties by the least sum of |offset|, then lexicographically, and says when CONCEPT was set by the tie", () => {
    const losses = new Array<number>(FIT_COMBINATIONS).fill(10);
    // Tied at 1: (+0.5, 0, 0), (0, -0.5, 0) and (-0.25, 0, -0.25): sums 0.5, 0.5, 0.5.
    const at = (o: number): number => FIT_OFFSETS.indexOf(o);
    losses[comboIndex(at(0.5), at(0), at(0))] = 1;
    losses[comboIndex(at(0), at(-0.5), at(0))] = 1;
    losses[comboIndex(at(-0.25), at(0), at(-0.25))] = 1;
    losses[comboIndex(at(3), at(3), at(3))] = 1;
    const w = fitWinnerOf(losses);
    expect(w.decidedBy).toBe("lexicographic");
    expect(w.offsets).toEqual({ HALF_FIELD: -0.25, FULL_FIELD: 0, CONCEPT: -0.25 });
    expect(w.tiedWith).toHaveLength(3);
    expect(w.conceptSetByTie).toBe(false);

    const l2 = new Array<number>(FIT_COMBINATIONS).fill(10);
    l2[comboIndex(at(1), at(1), at(1))] = 2;
    l2[comboIndex(at(0.25), at(0), at(0))] = 2;
    const w2 = fitWinnerOf(l2);
    expect(w2.decidedBy).toBe("sumAbsOffset");
    expect(w2.offsets).toEqual({ HALF_FIELD: 0.25, FULL_FIELD: 0, CONCEPT: 0 });

    // CONCEPT has no throws at all: every CONCEPT value ties, so CONCEPT is set by the tie (0, least |offset|).
    const runs = syntheticRuns({ HALF_FIELD: 0, FULL_FIELD: 2, CONCEPT: 0 }, { HALF_FIELD: 4, FULL_FIELD: 6, CONCEPT: 0 });
    const w3 = fitWinnerOf(estimateLosses(runs));
    expect(w3.conceptSetByTie).toBe(true);
    expect(w3.offsets.CONCEPT).toBe(0);
    expect(w3.decidedBy).toBe("sumAbsOffset");
  });

  it("says when the winner is on an edge and when it is today's (E9 is E8)", () => {
    const l = new Array<number>(FIT_COMBINATIONS).fill(5);
    l[comboIndex(0, FIT_TODAY_INDEX, 18)] = 1;
    expect(fitWinnerOf(l).onEdge).toEqual({ HALF_FIELD: true, FULL_FIELD: false, CONCEPT: true });
    const t = new Array<number>(FIT_COMBINATIONS).fill(5);
    t[comboIndex(FIT_TODAY_INDEX, FIT_TODAY_INDEX, FIT_TODAY_INDEX)] = 1;
    expect(fitWinnerOf(t).e9IsE8).toBe(true);
    expect(() => fitWinnerOf(new Array<number>(FIT_COMBINATIONS).fill(Number.POSITIVE_INFINITY))).toThrow(/no combination has a finite loss/);
    expect(() => fitWinnerOf([1])).toThrow(/6859 losses/);
  });

  it("call deviation is each system's largest relative distance from its mean; the replay offsets are the winner's distinct offsets", () => {
    const dev = callDeviationOf([
      { HALF_FIELD: 100, FULL_FIELD: 10, CONCEPT: 0 },
      { HALF_FIELD: 110, FULL_FIELD: 10, CONCEPT: 0 },
      { HALF_FIELD: 90, FULL_FIELD: 10, CONCEPT: 0 },
    ]);
    expect(dev.HALF_FIELD).toBeCloseTo(0.1, 12);
    expect(dev.FULL_FIELD).toBe(0);
    expect(dev.CONCEPT).toBe(0);
    expect(replayOffsetsOf({ offsets: { HALF_FIELD: 0.5, FULL_FIELD: -0.25, CONCEPT: 0.5 } })).toEqual([-0.25, 0.5]);
    expect(replayOffsetsOf({ offsets: { HALF_FIELD: 0, FULL_FIELD: 0, CONCEPT: 0 } })).toEqual([0]);
  });
});

// --- the record and the runner --------------------------------------------------------------------------

const CORPUS: Step1Corpus = { flatFirst: null, genThroughWeek: 2 };
const ENV: Step1Env = { fingerprint: "f1f2f3f4f5f6f7f8", commit: "c0ffee", dirty: false, node: "v22" };

/** A synthetic fold for offsets: every system's throws move a window later per 0.5 s of its offset. */
function syntheticFold(o: ReadSystemOffsets): FitFold {
  const f = emptyFitFold();
  const place: Record<ReadSystem, number> = { HALF_FIELD: 2, FULL_FIELD: 5, CONCEPT: 1 };
  for (const s of READ_SYSTEMS) {
    const w = Math.max(0, Math.min(FIT_WINDOW_COUNT - 1, place[s] + Math.floor(o[s] / 0.5)));
    f.bySystem[s].calls = 40;
    f.bySystem[s].attempts = 30;
    f.bySystem[s].counts[w] = 20;
    f.bySystem[s].counts[Math.min(w + 1, 10)] = (f.bySystem[s].counts[Math.min(w + 1, 10)] ?? 0) + 10;
  }
  f.games.push(`g:${String(o.HALF_FIELD)}:${String(o.FULL_FIELD)}:${String(o.CONCEPT)}`);
  return f;
}
const syntheticPlay = (o: ReadSystemOffsets, _c: Step1Corpus): { fold: FitFold; overlayDigest: string } => ({ fold: syntheticFold(o), overlayDigest: `fnv1a:${String(o.HALF_FIELD)}/${String(o.FULL_FIELD)}/${String(o.CONCEPT)}` });
const syntheticReplay = (offsets: readonly number[], corpus: Step1Corpus): FitReplayResult => ({
  format: FIT5A_REPLAY_FORMAT,
  fingerprint: ENV.fingerprint,
  corpus,
  runs: offsets.map((o) => ({ offset: o, counts: fitRunOf(FIT_OFFSETS.indexOf(o), "", syntheticFold({ HALF_FIELD: o, FULL_FIELD: o, CONCEPT: o })).counts })),
});

let dirs: string[] = [];
const scratch = (): string => {
  const d = mkdtempSync(join(tmpdir(), "fit5a-"));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs = [];
});

function syntheticRecord() {
  const runs: FitRun[] = FIT_OFFSETS.map((o, k) => fitRunOf(k, `fnv1a:${String(k)}`, syntheticFold({ HALF_FIELD: o, FULL_FIELD: o, CONCEPT: o })));
  const w = fitWinnerOf(estimateLosses(runs.map((r) => r.counts)));
  const confirm = fitRunOf(FIT_TODAY_INDEX, "x", syntheticFold(w.offsets));
  return buildFitRecord({ amendments: "fnv1a:3f9478eb", fingerprint: ENV.fingerprint, games: 1, benchOverlayDigest: runs[FIT_TODAY_INDEX]!.overlayDigest, corpus: CORPUS, runs, confirm: { counts: confirm.counts, streamDigest: confirm.streamDigest }, replayOffsets: replayOffsetsOf(w) });
}

describe("the record (filing §4.3)", () => {
  it("carries the bench, the target, 19 runs, 6,859 losses in the filed order, today's loss, the winner, the replay and the confirm run, and recomputes bit for bit", () => {
    const r = syntheticRecord();
    expect(r.format).toBe(FIT5A_FORMAT);
    expect(r.bench).toMatchObject({ arm: "E8", league: "gen", seedSet: 1, caller: STEP1_CALLER, corpus: CORPUS });
    expect(r.target.sumAsPrinted).toBe(99.8);
    expect(r.target.adrLine).toBe(194);
    expect(r.runs).toHaveLength(19);
    expect(r.losses.values).toHaveLength(6859);
    expect(r.todayLoss).toBe(r.losses.values[comboIndex(6, 6, 6)]);
    expect(r.winner.loss).toBe(Math.min(...r.losses.values));
    expect("index" in r.winner).toBe(false);
    expect(r.replay.histogramsEqual).toBe(true);
    expect(r.confirm.estimateLoss).toBe(r.winner.loss);
    expect(verifyFitRecord(r)).toEqual([]);
    // No falsifier row by grid value: only window counts, call counts, losses and the winner.
    expect(Object.keys(r.runs[0]!).sort()).toEqual(["atOrUnder025", "attempts", "binnedOnTick", "calls", "counts", "deltas", "k", "offset", "overlayDigest", "streamDigest"]);
  });

  it("prints the fit table from the record (AM-9 reportRows; measurement M5 item 1)", () => {
    const r = syntheticRecord();
    const lines = fitTableLines(r);
    expect(lines).toHaveLength(6 + r.runs.length);
    expect(lines[0]).toBe(`the fit table (AM-9), from the committed record: bench E8 gen set 1, 1 games, caller ${STEP1_CALLER}, clock ${r.bench.clock}; 6859 combinations`);
    expect(lines[1]).toBe(`  today's deltas (HALF_FIELD -0.5, FULL_FIELD 1, CONCEPT -1): loss ${r.todayLoss.toFixed(4)}`);
    const w = r.winner;
    expect(lines[2]).toContain(`winner: offsets HALF_FIELD ${String(w.offsets.HALF_FIELD)}, FULL_FIELD ${String(w.offsets.FULL_FIELD)}, CONCEPT ${String(w.offsets.CONCEPT)}; deltas HALF_FIELD ${String(w.deltas.HALF_FIELD)}`);
    expect(lines[2]).toContain(`loss ${w.loss.toFixed(4)}; decided by ${w.decidedBy}`);
    // The runner-up is the least loss at any other combination, decoded from the filed order.
    const win = comboIndex(FIT_OFFSETS.indexOf(w.offsets.HALF_FIELD), FIT_OFFSETS.indexOf(w.offsets.FULL_FIELD), FIT_OFFSETS.indexOf(w.offsets.CONCEPT));
    let ru = -1;
    r.losses.values.forEach((v, i) => {
      if (i !== win && (ru < 0 || v < r.losses.values[ru]!)) ru = i;
    });
    const n = FIT_OFFSETS.length;
    expect(lines[3]).toBe(`  runner-up: offsets HALF_FIELD ${String(FIT_OFFSETS[Math.floor(ru / (n * n))])}, FULL_FIELD ${String(FIT_OFFSETS[Math.floor(ru / n) % n])}, CONCEPT ${String(FIT_OFFSETS[ru % n])}; loss ${r.losses.values[ru]!.toFixed(4)}`);
    expect(lines[4]).toMatch(/^ {2}call deviation \(largest relative, across the runs\): HALF_FIELD \S+, FULL_FIELD \S+, CONCEPT \S+$/);
    expect(lines[5]).toBe(`  confirm run at the winner's deltas: loss ${r.confirm.loss.toFixed(4)} against the estimate ${r.confirm.estimateLoss.toFixed(4)}, gap ${r.confirm.gapPercent.toFixed(2)}% (${r.confirm.named ? "named" : "not named"}: the line is 20%)`);
    expect(lines[6]).toBe(`  offset -1.5: calls ${String(r.runs[0]!.calls.HALF_FIELD)}/${String(r.runs[0]!.calls.FULL_FIELD)}/${String(r.runs[0]!.calls.CONCEPT)}, attempts ${String(r.runs[0]!.attempts.HALF_FIELD)}/${String(r.runs[0]!.attempts.FULL_FIELD)}/${String(r.runs[0]!.attempts.CONCEPT)} (HALF/FULL/CONCEPT), at or under 0.25 s ${String(r.runs[0]!.atOrUnder025)}`);
  });

  it("refuses to build a record with a combination or a confirm run that has no attempt, or a zero winning loss (code-tests F16)", () => {
    const runs: FitRun[] = FIT_OFFSETS.map((o, k) => fitRunOf(k, `fnv1a:${String(k)}`, syntheticFold({ HALF_FIELD: o, FULL_FIELD: o, CONCEPT: o })));
    const zero = (r: FitRun): FitRun => ({ ...r, counts: { HALF_FIELD: r.counts.HALF_FIELD.map(() => 0), FULL_FIELD: r.counts.FULL_FIELD.map(() => 0), CONCEPT: r.counts.CONCEPT.map(() => 0) } });
    const input = (rs: FitRun[], confirm: FitRun) => ({ amendments: "fnv1a:3f9478eb", fingerprint: ENV.fingerprint, games: 1, benchOverlayDigest: rs[FIT_TODAY_INDEX]!.overlayDigest, corpus: CORPUS, runs: rs, confirm: { counts: confirm.counts, streamDigest: confirm.streamDigest }, replayOffsets: [0] });
    expect(() => buildFitRecord(input(runs.map(zero), runs[FIT_TODAY_INDEX]!))).toThrow(/combination 0 has no attempt in any window, so it has no loss; nothing was written/);
    expect(() => buildFitRecord(input(runs, zero(runs[FIT_TODAY_INDEX]!)))).toThrow(/the confirm run has no attempt in any window/);
  });

  it("refuses a record whose losses, winner or target differ", () => {
    const r = syntheticRecord();
    const values = [...r.losses.values];
    values[100] = values[100]! + 1e-12;
    expect(verifyFitRecord({ ...r, losses: { ...r.losses, values } })).toEqual([expect.stringMatching(/1 loss\(es\) differ, first at index 100/)]);
    expect(verifyFitRecord({ ...r, winner: { ...r.winner, conceptSetByTie: !r.winner.conceptSetByTie } })[0]).toMatch(/the winner recomputes/);
    expect(verifyFitRecord({ ...r, target: { ...r.target, asPrinted: [...r.target.asPrinted].reverse() } })[0]).toMatch(/not ADR-089:194/);
  });

  it("round-trips through a file, is written once and refused over, and its digest is stable", () => {
    const d = scratch();
    const r = syntheticRecord();
    const path = join(d, "fit.json");
    writeFitRecordOnce(path, r);
    const back = readFitRecord(path);
    expect(verifyFitRecord(back)).toEqual([]);
    expect(fitRecordDigest(back)).toBe(fitRecordDigest(r));
    const before = readFileSync(path, "utf8");
    expect(() => writeFitRecordOnce(path, r)).toThrow(/already exists; the fit record is written once/);
    expect(readFileSync(path, "utf8")).toBe(before);
    writeFileSync(join(d, "other.json"), JSON.stringify({ format: "x" }));
    expect(() => readFitRecord(join(d, "other.json"))).toThrow(/not a step-5a fit record/);
  });
});

describe("the gate recomputes the committed record (measurement M6)", () => {
  it("every step-5 run after the writing process recomputes the committed record, and refuses one that does not recompute", () => {
    const d = scratch();
    mkdirSync(join(d, "reports"), { recursive: true });
    const r = syntheticRecord();
    writeFitRecordOnce(join(d, FIT5A_RECORD), r);
    expect(step5GateState(d).fitVerifyProblem).toBeUndefined();
    const e = scratch();
    mkdirSync(join(e, "reports"), { recursive: true });
    const values = [...r.losses.values];
    values[7] = values[7]! + 1e-9;
    writeFitRecordOnce(join(e, FIT5A_RECORD), { ...r, losses: { ...r.losses, values } });
    const st = step5GateState(e);
    expect(st.fitVerifyProblem).toMatch(/^the committed fit record does not recompute: 1 loss\(es\) differ, first at index 7/);
    // (The synthetic record is on a short corpus; the corpus refusal comes first, so it is set aside here.)
    const { fitCorpusProblem: _corpus, ...rest } = st;
    void _corpus;
    expect(step5GateRefusal("5a", { ...rest, fitPin: st.fitRecord, s5aDigest: "fnv1a:00000001" })).toMatch(/does not recompute: 1 loss\(es\) differ/);
    const { fitVerifyProblem: _verify, ...clean } = rest;
    void _verify;
    expect(step5GateRefusal("5a", { ...clean, fitPin: st.fitRecord, s5aDigest: "fnv1a:00000001" })).toBeUndefined();
  });
});

describe("the runner (runFit5a) with a stand-in player and replay", () => {
  const base = (cacheParent: string, extra: object = {}) => ({ env: ENV, amendments: "fnv1a:3f9478eb", cacheParent, corpus: CORPUS, play: syntheticPlay, replay: syntheticReplay, recordedFitDigest: undefined, ...extra });

  it("plays the shards into the cache and writes nothing until all 19 runs are there; then writes the record once", () => {
    const d = scratch();
    const out = join(d, "fit.json");
    const a = runFit5a(base(d, { shard: { index: 1, count: 3 }, out }));
    expect(a.played).toEqual([0, 3, 6, 9, 12, 15, 18]);
    expect(a.remaining).toHaveLength(12);
    expect(a.record).toBeUndefined();
    expect(existsSync(out)).toBe(false);
    runFit5a(base(d, { shard: { index: 2, count: 3 }, out }));
    const c = runFit5a(base(d, { shard: { index: 3, count: 3 }, out }));
    expect(c.remaining).toEqual([]);
    expect(c.wrote).toBe(out);
    const rec = readFitRecord(out);
    expect(verifyFitRecord(rec)).toEqual([]);
    expect(rec.sourceFingerprint).toBe(ENV.fingerprint);
    // A second run reads the cache and refuses to write over the record before anything plays.
    expect(() => runFit5a(base(d, { out }))).toThrow(/already exists; the fit record is written once/);
    const again = runFit5a(base(d));
    expect(again.played).toEqual([]);
    expect(again.cached).toHaveLength(19);
    expect(canon(again.record)).toBe(canon(rec));
  });

  it("refuses a dirty tree, a recorded fit, and a cached run from another build", () => {
    const d = scratch();
    expect(() => runFit5a(base(d, { env: { ...ENV, dirty: true } }))).toThrow(FIT5A_DIRTY_REFUSAL);
    expect(() => runFit5a(base(d, { recordedFitDigest: "fnv1a:00000000" }))).toThrow(FIT5A_RECORDED_REFUSAL);
    runFit5a(base(d, { shard: { index: 1, count: 19 } }));
    expect(() => runFit5a(base(d, { amendments: "fnv1a:ffffffff", shard: { index: 1, count: 19 } }))).toThrow(/the cached run k0 .* is not this build's run/);
  });

  it("a replay that differs is a build fault: nothing is written", () => {
    const d = scratch();
    const out = join(d, "fit.json");
    const bad = (offsets: readonly number[], corpus: Step1Corpus): FitReplayResult => {
      const r = syntheticReplay(offsets, corpus);
      const first = r.runs[0]!;
      const counts = { ...first.counts, CONCEPT: first.counts.CONCEPT.map((x, i) => (i === 0 ? x + 1 : x)) };
      return { ...r, runs: [{ ...first, counts }, ...r.runs.slice(1)] };
    };
    expect(() => runFit5a(base(d, { replay: bad, out }))).toThrow(/a build fault: the fresh process's histograms at offset .* differ/);
    expect(existsSync(out)).toBe(false);
    expect(() => runFit5a(base(d, { replay: (o: readonly number[], c: Step1Corpus) => ({ ...syntheticReplay(o, c), runs: [] }), out }))).toThrow(/missing/);
  });

  it("with no stand-in, waits for the operator's fresh process: prints its command, writes nothing, then reads its file", () => {
    const d = scratch();
    const out = join(d, "fit.json");
    const { replay: _replay, ...noReplay } = base(d, { out }) as ReturnType<typeof base> & { replay?: unknown };
    void _replay;
    const lines: string[] = [];
    const a = runFit5a({ ...noReplay, log: (l: string) => lines.push(l) } as Parameters<typeof runFit5a>[0]);
    const file = fitReplayFileOf(join(d, ENV.fingerprint));
    expect(a.record).toBeUndefined();
    expect(existsSync(out)).toBe(false);
    expect(a.awaitingReplay).toMatch(/^pnpm --filter @ff\/calibration pocket -- --step 5a --fit-replay [-0-9.,]+ --gen-through-week 2 --out /);
    expect(a.awaitingReplay!.endsWith(file)).toBe(true);
    expect(lines.join("\n")).toContain(a.awaitingReplay!);
    const w = a.awaitingReplay!.match(/--fit-replay (\S+)/)![1]!.split(",").map(Number);
    expect(fitReplayCommandOf(w, CORPUS, file)).toBe(a.awaitingReplay);
    // A file from another build, corpus or offsets is refused by name.
    writeFileSync(file, JSON.stringify({ ...syntheticReplay(w, CORPUS), fingerprint: "fnv1a:other" }));
    expect(() => runFit5a(noReplay as Parameters<typeof runFit5a>[0])).toThrow(/is not this fit's: it was played at fnv1a:other/);
    writeFileSync(file, JSON.stringify(syntheticReplay(w, { ...CORPUS, genThroughWeek: 3 })));
    expect(() => readFitReplay(file, ENV.fingerprint, w, CORPUS)).toThrow(/its corpus is/);
    writeFileSync(file, JSON.stringify(syntheticReplay([...w, FIT_OFFSETS.find((o) => !w.includes(o))!], CORPUS)));
    expect(() => readFitReplay(file, ENV.fingerprint, w, CORPUS)).toThrow(/not the winner's/);
    // The operator's process writes the right file: the fit reads it and writes the record.
    writeFileSync(file, JSON.stringify(syntheticReplay(w, CORPUS)));
    const b = runFit5a(noReplay as Parameters<typeof runFit5a>[0]);
    expect(b.awaitingReplay).toBeUndefined();
    expect(b.wrote).toBe(out);
    expect(verifyFitRecord(readFitRecord(out))).toEqual([]);
  });

  it("a run with a throwaway is a build fault and is not cached", () => {
    const d = scratch();
    const play = (o: ReadSystemOffsets, c: Step1Corpus) => {
      const r = syntheticPlay(o, c);
      r.fold.throwaways = 1;
      return r;
    };
    expect(() => runFit5a(base(d, { play }))).toThrow(/a build fault on run k0: 1 throwaway/);
    expect(existsSync(join(d, ENV.fingerprint, "k00.json"))).toBe(false);
  });
});

function canon(x: unknown): string {
  return JSON.stringify(x);
}

describe("the committed fit record (the fit commit, plan §9 item 7)", () => {
  const committed = join(__dirname, "..", FIT5A_RECORD);
  it("is committed, recomputes bit for bit, and its digest is POCKET_1_S5A_FIT_DIGEST", () => {
    expect(existsSync(committed)).toBe(true);
    const r = readFitRecord(committed);
    expect(verifyFitRecord(r)).toEqual([]);
    expect(fitRecordDigest(r)).toBe(POCKET_1_S5A_FIT_DIGEST);
    expect(POCKET_1_S5A_FIT_DIGEST).toBe("fnv1a:2874e804");
    expect(r.bench.corpus).toEqual({ flatFirst: null, genThroughWeek: null });
    expect(r.replay).toEqual({ process: "fresh, no cache", offsets: replayOffsetsOf(r.winner), histogramsEqual: true });
  });
  it("its winner is the literal leaves of pocket-1.s5a (derived here), and pocket-1.s5a is recorded at POCKET_1_S5A_DIGEST", () => {
    const r = readFitRecord(committed);
    expect(r.winner.offsets).toEqual({ HALF_FIELD: 1.0, FULL_FIELD: -1.0, CONCEPT: -0.25 });
    expect(r.winner.deltas).toEqual({ HALF_FIELD: 0.5, FULL_FIELD: 0, CONCEPT: -1.25 });
    expect(r.winner.e9IsE8).toBe(false);
    expect(POCKET_1_S5A_LEAVES).toEqual(readSystemDeltaLeaves(r.winner.offsets));
    const s5a = rulesTunables("pocket-1.s5a");
    for (const s of READ_SYSTEMS) expect(s5a.qb.readSystem[s].budgetDeltaSeconds, s).toBe(r.winner.deltas[s]);
    expect(overlayDigestOf(s5a)).toBe(POCKET_1_S5A_DIGEST);
  });
  it("refuses a second fit now the record is committed (AM-9 fit.record, missAt5a)", () => {
    expect(() => runFit5a({ env: ENV, amendments: "fnv1a:3f9478eb", cacheParent: join(tmpdir(), "never"), corpus: CORPUS })).toThrow(FIT5A_RECORDED_REFUSAL);
  });
});
