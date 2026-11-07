/**
 * ADR-089 step 0 — THE CLEAN BENCH (plan §6.3, §9 (b) and (c); P-6). Gated `FF_POCKET_BENCH=1`.
 *
 * pkB's tunables-only recipe (`cleanBenchTunables`: four `applyTunablePatch` leaves, in memory),
 * played on both base corpora's seed set 1: the flat league's 496 games through `runOneGame`'s
 * `tunables`, and the generated league's 2027 season through C1's `game.tunables` on the real
 * season path.
 *
 * **(c), code correctness, asserted:** release (the mean of `collect.ts`'s `throwTicks`) flat
 * 1.6634 s and gen 1.7992 s; throwaways (THROWAWAY per PASS PLAY_START) 20.625% and 11.127%; 52,882
 * and 28,588 dropbacks; pressured 0 and sacks 0 on both.
 *
 * **(b), the REPORTED figures of `rev/clean-pocket.md` §3.2 (:186-189), by `throwClass.ts`:** nobody
 * open gen 30.2% (8,631 of 28,588), desperation 10.1, checkdowns 8.9, throwaways 11.1; flat 43.6%
 * (23,064 of 52,882), 6.8, 16.2, 20.6; and the class guards, gen desperation INT 19.0% and
 * rank-pushed 16.3% of dropbacks at 20.9% INT. Beside the plan's list (additions, from the same
 * table, :190-192): flat desperation INT 5.7%, flat rank-pushed 14.1% at 12.4%, and open throws'
 * completion / INT, gen 48.0% / 2.66% and flat 46.8% / 0.38%. Each figure prints with "reproduced"
 * or "REPORTED-UNREPRODUCED" beside it, and is asserted as reproduced at the printed precision.
 *
 * **Step 3's clean bench (ADR-089 step 3, plan §2.9):** `cleanBenchTunablesS3` (the `pocket-1.s3`
 * bundle on the four leaves, the free-run get-off, moving get-off and late block's engage time at
 * 50 s) is checked always (built through `withOverlay`, stamped, nothing else of the bundle moved);
 * under the gate it plays the same two corpora on the published picture, every s3 PASS play's
 * `PLAY_START` carrying its snap, with pressured 0 and sacks 0 asserted on both leagues and release
 * and throwaways reported. The legacy bench above stays asserted as it was.
 *
 * **Step 4's and step 5's clean benches (ADR-089 step 5, plan §4, §5.1; P-6's s4 row):**
 * `cleanBenchTunablesS4` (arm E0: `pocket-1.s4` on the four leaves with step 3's three 50 s values) and
 * `cleanBenchTunablesS5(parts, offsets)` (the same bench with the clean-pocket parts an arm turns on,
 * stamped `pocket-1.s5a`, and the three read-system deltas moved) are checked always. Under the gate
 * the s4 bench plays both corpora's seed set 1 and reproduces pkB: step 0's bench decisions exactly
 * (dropbacks, throwaways 20.625% and 11.127%, decision tick 1.6634 s and 1.7992 s, nobody open and
 * the class guards, interceptions per attempt 2.32% and 6.95%), the throwing motion moving only the
 * release (1.9214 s and 2.0655 s), with no pressure and no sack. The s5 bench (every part on) is a
 * smoke under the gate, gen weeks 1 and 2 and flat's first 32 games: every PASS play stamped
 * `pocket-1.s5a`, no status above CLEAN and no ARRIVED threat (S-6); its release, throwaways and
 * sacks are printed, never asserted (a caught clean break-out is a sack with no sacker, AM-9).
 */
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { emptyAccumulator, foldGame, type SimAccumulator } from "../src/metrics/collect.js";
import { flatBaseline, genSeason } from "../src/pocket/corpus.js";
import {
  CLEAN_BENCH_PARTS,
  CLEAN_BENCH_S3_SECONDS,
  cleanBenchTunables,
  cleanBenchTunablesS3,
  cleanBenchTunablesS4,
  cleanBenchTunablesS5,
  cleanPocketBlockOf,
} from "../src/pocket/oneThreatBench.js";
import {
  checkStamp,
  EngineRulesError,
  NO_READ_SYSTEM_OFFSETS,
  POCKET_1_S2_LEAVES,
  POCKET_1_S3_DIGEST,
  POCKET_1_S3_RULES,
  POCKET_1_S4_DIGEST,
  POCKET_1_S5A_CLEAN_POCKET,
  POCKET_1_S5A_DROP_FLOOR,
  overlayDigestOf,
  rulesOnPlayStart,
  rulesTunables,
} from "../src/pocket/rules.js";
import { emptyRowsFold, foldRowsDropback, type RowsFold } from "../src/pocket/rows.js";
import { dropbacksOf } from "../src/pocket/throwClass.js";

const GATED = process.env["FF_POCKET_BENCH"] !== "1";

interface BenchRun {
  acc: SimAccumulator;
  rows: RowsFold;
  passStarts: number;
  throwaways: number;
  games: number;
  ms: number;
}

function emptyRun(): BenchRun {
  return { acc: emptyAccumulator(), rows: emptyRowsFold(), passStarts: 0, throwaways: 0, games: 0, ms: 0 };
}

function foldBench(run: BenchRun, events: readonly MatchEventEnvelope[], tunables: Tunables, positions: ReadonlyMap<PlayerId, Position>): void {
  let pass = false;
  for (const { event } of events) {
    if (event.type === "PLAY_START") {
      pass = (event.payload as { readonly kind?: unknown } | undefined)?.kind === "PASS_PLAY_V1";
      if (pass) run.passStarts += 1;
    } else if (pass && event.type === "THROWAWAY") run.throwaways += 1;
  }
  for (const d of dropbacksOf(events)) foldRowsDropback(run.rows, d, tunables, (id) => positions.get(id as PlayerId));
}

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (n: number, d: number): number => (d === 0 ? 0 : (100 * n) / d);

function summary(run: BenchRun): Record<string, unknown> {
  const c = run.rows.byClass;
  const nobody = c.CHECKDOWN.dropbacks + c.DESPERATION.dropbacks + c.THROWAWAY.dropbacks + c.SACK.dropbacks;
  return {
    games: run.games,
    seconds: Number((run.ms / 1000).toFixed(1)),
    release: mean(run.acc.play.throwTicks).toFixed(4),
    throwawaysPct: pct(run.throwaways, run.passStarts).toFixed(3),
    passStarts: run.passStarts,
    accDropbacks: run.acc.play.dropbacks,
    rowsDropbacks: run.rows.dropbacks,
    pressured: run.acc.play.pressuredDropbacks,
    sacks: run.acc.play.sacks,
    nobodyOpen: { n: nobody, of: run.rows.dropbacks, pct: pct(nobody, run.rows.dropbacks).toFixed(1) },
    split: {
      desperation: pct(c.DESPERATION.dropbacks, run.rows.dropbacks).toFixed(1),
      checkdowns: pct(c.CHECKDOWN.dropbacks, run.rows.dropbacks).toFixed(1),
      throwaways: pct(c.THROWAWAY.dropbacks, run.rows.dropbacks).toFixed(1),
      sacks: c.SACK.dropbacks,
    },
    guards: {
      desperationInt: pct(c.DESPERATION.interceptions, c.DESPERATION.aimed).toFixed(1),
      rankPushedShare: pct(c.RANK_PUSHED.dropbacks, run.rows.dropbacks).toFixed(1),
      rankPushedInt: pct(c.RANK_PUSHED.interceptions, c.RANK_PUSHED.aimed).toFixed(1),
      openCompletion: pct(c.PROGRESSION.completions, c.PROGRESSION.aimed).toFixed(1),
      openInt: pct(c.PROGRESSION.interceptions, c.PROGRESSION.aimed).toFixed(2),
    },
    byClassDropbacks: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.dropbacks])),
  };
}

/** Prints a (b) figure as reproduced or REPORTED-UNREPRODUCED, then returns whether it reproduced. */
function reported(league: string, what: string, got: unknown, want: unknown): boolean {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  process.stdout.write(`ADR-089 clean bench (b) ${league} ${what}: ${JSON.stringify(got)} against ${JSON.stringify(want)}: ${ok ? "reproduced" : "REPORTED-UNREPRODUCED"}\n`);
  return ok;
}

describe.skipIf(GATED)("ADR-089 step 0: the clean bench (FF_POCKET_BENCH=1)", () => {
  const tunables = cleanBenchTunables();
  const flat = emptyRun();
  const gen = emptyRun();

  beforeAll(() => {
    let t0 = Date.now();
    flatBaseline(
      1,
      (o, snap) => {
        flat.acc = foldGame(flat.acc, o);
        foldBench(flat, o.events, tunables, positionsFromSnapshot(snap));
        flat.games += 1;
      },
      { tunables },
    );
    flat.ms = Date.now() - t0;
    t0 = Date.now();
    genSeason(
      1,
      (o, snap) => {
        gen.acc = foldGame(gen.acc, o);
        foldBench(gen, o.events, tunables, positionsFromSnapshot(snap));
        gen.games += 1;
      },
      { tunables },
    );
    gen.ms = Date.now() - t0;
    process.stdout.write(`ADR-089 clean bench:\n${JSON.stringify({ flat: summary(flat), gen: summary(gen) }, null, 1)}\n`);
  }, 1_800_000);

  it("(c) flat: release 1.6634 s, throwaways 20.625%, 52,882 dropbacks, no pressure and no sacks", () => {
    expect(flat.games).toBe(496);
    expect(mean(flat.acc.play.throwTicks).toFixed(4)).toBe("1.6634");
    expect(pct(flat.throwaways, flat.passStarts).toFixed(3)).toBe("20.625");
    expect(flat.passStarts).toBe(52_882);
    expect(flat.rows.dropbacks).toBe(52_882);
    expect(flat.acc.play.pressuredDropbacks).toBe(0);
    expect(flat.acc.play.sacks).toBe(0);
  });

  it("(c) gen: release 1.7992 s, throwaways 11.127%, 28,588 dropbacks, no pressure and no sacks", () => {
    expect(gen.games).toBe(272);
    expect(mean(gen.acc.play.throwTicks).toFixed(4)).toBe("1.7992");
    expect(pct(gen.throwaways, gen.passStarts).toFixed(3)).toBe("11.127");
    expect(gen.passStarts).toBe(28_588);
    expect(gen.rows.dropbacks).toBe(28_588);
    expect(gen.acc.play.pressuredDropbacks).toBe(0);
    expect(gen.acc.play.sacks).toBe(0);
  });

  it("(b) nobody open and its split: gen 30.2% (8,631 of 28,588), 10.1 / 8.9 / 11.1; flat 43.6% (23,064 of 52,882), 6.8 / 16.2 / 20.6", () => {
    const g = summary(gen) as { nobodyOpen: unknown; split: { desperation: string; checkdowns: string; throwaways: string } };
    const f = summary(flat) as typeof g;
    const results = [
      reported("gen", "nobody open", g.nobodyOpen, { n: 8631, of: 28588, pct: "30.2" }),
      reported("gen", "split desperation / checkdowns / throwaways", [g.split.desperation, g.split.checkdowns, g.split.throwaways], ["10.1", "8.9", "11.1"]),
      reported("flat", "nobody open", f.nobodyOpen, { n: 23064, of: 52882, pct: "43.6" }),
      reported("flat", "split desperation / checkdowns / throwaways", [f.split.desperation, f.split.checkdowns, f.split.throwaways], ["6.8", "16.2", "20.6"]),
    ];
    expect(results).toEqual([true, true, true, true]);
  });

  it("(b) the class guards on gen: desperation INT 19.0%; rank-pushed 16.3% of dropbacks at 20.9% INT", () => {
    const g = summary(gen) as { guards: Record<string, string> };
    const results = [
      reported("gen", "desperation INT per aimed", g.guards["desperationInt"], "19.0"),
      reported("gen", "rank-pushed share / INT per aimed", [g.guards["rankPushedShare"], g.guards["rankPushedInt"]], ["16.3", "20.9"]),
    ];
    expect(results).toEqual([true, true]);
  });

  it("(b, additions from the same table) flat desperation INT 5.7%, flat rank-pushed 14.1% at 12.4%, open throws 48.0% / 2.66% and 46.8% / 0.38%", () => {
    const g = summary(gen) as { guards: Record<string, string> };
    const f = summary(flat) as typeof g;
    const results = [
      reported("flat", "desperation INT per aimed", f.guards["desperationInt"], "5.7"),
      reported("flat", "rank-pushed share / INT per aimed", [f.guards["rankPushedShare"], f.guards["rankPushedInt"]], ["14.1", "12.4"]),
      reported("gen", "open throws completion / INT per aimed", [g.guards["openCompletion"], g.guards["openInt"]], ["48.0", "2.66"]),
      reported("flat", "open throws completion / INT per aimed", [f.guards["openCompletion"], f.guards["openInt"]], ["46.8", "0.38"]),
    ];
    expect(results).toEqual([true, true, true, true]);
  });
});

// --- step 3's clean bench (plan §2.9) ----------------------------------------------------------------

describe("ADR-089 step 3: the s3 clean bench's tunables (cleanBenchTunablesS3)", () => {
  const t = cleanBenchTunablesS3();
  const s3 = rulesTunables(POCKET_1_S3_RULES);

  it("is pocket-1.s3 with the free-run get-offs and the late block's engage time at 50 s, past the last tick", () => {
    expect(CLEAN_BENCH_S3_SECONDS).toBe(50);
    expect(t.blitzPickup.freeRun).toEqual({ ...s3.blitzPickup.freeRun, getOffSeconds: 50, movingGetOffSeconds: 50 });
    expect(t.blitzPickup.lateBlock).toEqual({ ...s3.blitzPickup.lateBlock, engageSeconds: 50 });
    for (const v of [t.blitzPickup.freeRun!.getOffSeconds, t.blitzPickup.freeRun!.movingGetOffSeconds, t.blitzPickup.lateBlock!.engageSeconds]) expect(v).toBeGreaterThan(t.clock.maxTick);
    expect(t.pocket.climbLane).toBe(s3.pocket.climbLane);
    expect(t.pocket.forcing).toEqual(s3.pocket.forcing);
    expect(t.passRush.beatClock).toEqual(s3.passRush.beatClock);
    expect(t.passRush.repClock).toEqual(s3.passRush.repClock);
    expect(t.passRush.approach).toEqual(s3.passRush.approach);
    expect(t.passRush.beatClock).toBeDefined();
  });

  it("sits on the clean bench's four leaves and Half and Follows, as pocket-1.s3 sits on Half and Follows", () => {
    expect(t.passRush.blockerStructuralAdvantage).toBe(500);
    expect(t.blitzPickup.freeRunnerArrivalSeconds).toBe(50);
    expect(t.blitzPickup.freeRunnerPath.maxArrivalSeconds).toBe(99);
    expect(t.stunt.looperArrivalSeconds).toBe(50);
    expect(t.arrival).toEqual(s3.arrival);
    expect(POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES).arrival).toEqual(s3.arrival);
  });

  it("is stamped pocket-1.s3 at a digest of its own, the one its tunables recompute, and frozen", () => {
    expect(t.engineRules?.name).toBe(POCKET_1_S3_RULES);
    expect(t.engineRules?.overlayDigest).not.toBe(POCKET_1_S3_DIGEST);
    const { engineRules: _stamp, ...unstamped } = t;
    expect(t.engineRules?.overlayDigest).toBe(overlayDigestOf(unstamped as Tunables));
    expect(Object.isFrozen(t)).toBe(true);
    expect(Object.isFrozen(t.blitzPickup.freeRun)).toBe(true);
    // DEFAULT_TUNABLES and the bundle are untouched.
    expect(DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage).toBe(0);
    expect(s3.blitzPickup.freeRun?.getOffSeconds).toBe(0.35);
    expect(s3.engineRules?.overlayDigest).toBe(POCKET_1_S3_DIGEST);
  });
});

interface S3BenchRun extends BenchRun {
  s3PassStarts: number;
  pictures: number;
  /** Free runners published at the snap, and the earliest `etaTick` among them. */
  snapThreats: number;
  earliestSnapEta: number;
}

function foldS3Bench(run: S3BenchRun, events: readonly MatchEventEnvelope[], tunables: Tunables, positions: ReadonlyMap<PlayerId, Position>): void {
  foldBench(run, events, tunables, positions);
  let ticked = true;
  for (const { event } of events) {
    if (event.type === "PLAY_START") {
      ticked = false;
      const payload = event.payload as { readonly kind?: unknown; readonly snap?: unknown } | undefined;
      if (payload?.kind !== "PASS_PLAY_V1" || rulesOnPlayStart(payload)?.name !== POCKET_1_S3_RULES) continue;
      run.s3PassStarts += 1;
      if (payload.snap !== undefined) run.pictures += 1;
    } else if (event.type === "TICK") ticked = true;
    else if (event.type === "RUSH_THREAT" && !ticked) {
      run.snapThreats += 1;
      run.earliestSnapEta = Math.min(run.earliestSnapEta, event.payload.etaTick);
    }
  }
}

function s3Summary(run: S3BenchRun): Record<string, unknown> {
  const { seconds: _seconds, ...rest } = summary(run);
  return { ...rest, s3PassStarts: run.s3PassStarts, pictures: run.pictures, snapThreats: run.snapThreats, earliestSnapEta: run.snapThreats === 0 ? null : run.earliestSnapEta };
}

describe.skipIf(GATED)("ADR-089 step 3: the s3 clean bench (FF_POCKET_BENCH=1)", () => {
  const tunables = cleanBenchTunablesS3();
  const empty = (): S3BenchRun => ({ ...emptyRun(), s3PassStarts: 0, pictures: 0, snapThreats: 0, earliestSnapEta: Number.POSITIVE_INFINITY });
  const flat = empty();
  const gen = empty();

  beforeAll(() => {
    flatBaseline(
      1,
      (o, snap) => {
        flat.acc = foldGame(flat.acc, o);
        foldS3Bench(flat, o.events, tunables, positionsFromSnapshot(snap));
        flat.games += 1;
      },
      { tunables },
    );
    genSeason(
      1,
      (o, snap) => {
        gen.acc = foldGame(gen.acc, o);
        foldS3Bench(gen, o.events, tunables, positionsFromSnapshot(snap));
        gen.games += 1;
      },
      { tunables },
    );
    process.stdout.write(`ADR-089 s3 clean bench:\n${JSON.stringify({ flat: s3Summary(flat), gen: s3Summary(gen) }, null, 1)}\n`);
  }, 1_800_000);

  it.each([
    ["flat", () => flat, 496],
    ["gen", () => gen, 272],
  ] as const)("%s: every PASS play is s3 on its published picture; pressured 0 and sacks 0 (release and throwaways reported)", (league, run, games) => {
    const r = run();
    process.stdout.write(`ADR-089 s3 clean bench ${league}: release ${mean(r.acc.play.throwTicks).toFixed(4)} s, throwaways ${pct(r.throwaways, r.passStarts).toFixed(3)}% of ${String(r.passStarts)} PASS plays\n`);
    expect(r.games).toBe(games);
    expect(r.passStarts).toBeGreaterThan(0);
    expect(r.s3PassStarts).toBe(r.passStarts);
    expect(r.pictures).toBe(r.s3PassStarts);
    if (r.snapThreats > 0) expect(r.earliestSnapEta).toBeGreaterThan(tunables.clock.maxTick);
    expect(r.acc.play.pressuredDropbacks).toBe(0);
    expect(r.acc.play.sacks).toBe(0);
  });
});

// --- step 4's and step 5's clean benches (ADR-089 step 5, plan §4, §5.1) ------------------------------

/** MEASURED: the s4 clean bench's overlay digest on this build (the scratch recipe of plan §4, filing §1.1). */
const CLEAN_BENCH_S4_DIGEST = "fnv1a:cd268010";

/** Every leaf of a tree, by dotted path. */
function leafMap(node: unknown, path = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (typeof node !== "object" || node === null) {
    out.set(path, node);
    return out;
  }
  for (const [k, v] of Object.entries(node)) for (const [p, x] of leafMap(v, path === "" ? k : `${path}.${k}`)) out.set(p, x);
  return out;
}

/** The leaf paths where two trees differ (either side). */
function movedLeaves(a: Tunables, b: Tunables): string[] {
  const la = leafMap(a);
  const lb = leafMap(b);
  return [...new Set([...la.keys(), ...lb.keys()])].filter((p) => la.get(p) !== lb.get(p)).sort();
}

const BENCH_LEAVES = [
  "passRush.blockerStructuralAdvantage",
  "blitzPickup.freeRunnerArrivalSeconds",
  "blitzPickup.freeRunnerPath.maxArrivalSeconds",
  "stunt.looperArrivalSeconds",
  "blitzPickup.freeRun.getOffSeconds",
  "blitzPickup.freeRun.movingGetOffSeconds",
  "blitzPickup.lateBlock.engageSeconds",
];

describe("ADR-089 step 5: the s4 and s5 clean benches' tunables (cleanBenchTunablesS4, cleanBenchTunablesS5)", () => {
  const s4 = cleanBenchTunablesS4();

  it("the s4 bench is pocket-1.s4 on the four leaves with step 3's three 50 s values, at its measured digest, frozen", () => {
    expect(s4.engineRules).toEqual({ name: "pocket-1.s4", overlayDigest: CLEAN_BENCH_S4_DIGEST });
    expect(overlayDigestOf(s4)).toBe(CLEAN_BENCH_S4_DIGEST);
    expect(CLEAN_BENCH_S4_DIGEST).not.toBe(POCKET_1_S4_DIGEST);
    expect(movedLeaves(rulesTunables("pocket-1.s4"), s4)).toEqual([...BENCH_LEAVES, "engineRules.overlayDigest"].sort());
    expect([s4.blitzPickup.freeRun!.getOffSeconds, s4.blitzPickup.freeRun!.movingGetOffSeconds, s4.blitzPickup.lateBlock!.engageSeconds]).toEqual([CLEAN_BENCH_S3_SECONDS, CLEAN_BENCH_S3_SECONDS, CLEAN_BENCH_S3_SECONDS]);
    // Step 3's bench plus step 4's two blocks, and nothing else.
    expect(movedLeaves(cleanBenchTunablesS3(), s4).every((p) => p.startsWith("pocket.contact.") || p.startsWith("throwExec.motion.") || p.startsWith("engineRules."))).toBe(true);
    expect("cleanPocket" in s4.pocket).toBe(false);
    expect(Object.isFrozen(s4) && Object.isFrozen(s4.pocket) && Object.isFrozen(s4.blitzPickup.freeRun)).toBe(true);
    expect(cleanBenchTunablesS4().engineRules).toEqual(s4.engineRules);
    expect(checkStamp(s4, "pocket-1.s4", "w")).toBe(s4);
  });

  it("the s5 bench with every part on is the s4 bench plus pocket-1.s5a's block, stamped pocket-1.s5a", () => {
    const all = cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS });
    expect([...CLEAN_BENCH_PARTS]).toEqual(["d23", "move", "bump", "breakOut", "d23OnRun", "floor"]);
    expect(all.engineRules?.name).toBe("pocket-1.s5a");
    expect(all.engineRules?.overlayDigest).toBe(overlayDigestOf(all));
    expect(all.pocket.cleanPocket).toEqual(POCKET_1_S5A_CLEAN_POCKET);
    expect(movedLeaves(s4, all).every((p) => p.startsWith("pocket.cleanPocket.") || p.startsWith("engineRules."))).toBe(true);
    expect(checkStamp(all, "pocket-1.s5a", "w")).toBe(all);
    expect(Object.isFrozen(all.pocket.cleanPocket)).toBe(true);
  });

  it("each part maps to its switch; no part is the block with every part off and no floor; E10's reset 0", () => {
    const off = cleanPocketBlockOf({ on: [] });
    expect(off).toEqual({ d23: false, expiryBar: 30, move: false, resetSeconds: 1.0, bump: false, breakOut: false, d23OnRun: false });
    expect("dropFloor" in off).toBe(false);
    for (const part of ["d23", "move", "bump", "breakOut", "d23OnRun"] as const) {
      expect(cleanPocketBlockOf({ on: [part] }), part).toEqual({ ...off, [part]: true });
    }
    expect(cleanPocketBlockOf({ on: ["floor"] })).toEqual({ ...off, dropFloor: POCKET_1_S5A_DROP_FLOOR });
    expect(cleanPocketBlockOf({ on: CLEAN_BENCH_PARTS, resetSeconds: 0 })).toEqual({ ...POCKET_1_S5A_CLEAN_POCKET, resetSeconds: 0 });
    const builtOff = cleanBenchTunablesS5({ on: [] });
    const builtE10 = cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS, resetSeconds: 0 });
    const builtFloor = cleanBenchTunablesS5({ on: ["floor"] });
    const digests = [s4, builtOff, builtFloor, builtE10, cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS })].map((t) => t.engineRules?.overlayDigest);
    expect(new Set(digests).size).toBe(digests.length);
    expect(builtOff.pocket.cleanPocket).toEqual(off);
    expect(() => cleanPocketBlockOf({ on: ["floor", "floor"] })).toThrow("cleanPocketBlockOf: the part floor is named twice");
    expect(() => cleanPocketBlockOf({ on: ["reset" as never] })).toThrow("cleanPocketBlockOf: no clean-pocket part reset (d23, move, bump, breakOut, d23OnRun, floor)");
    expect(() => cleanBenchTunablesS5({ on: ["move"], resetSeconds: 0.25 })).toThrow(EngineRulesError);
    expect(() => cleanBenchTunablesS5({ on: ["move"], resetSeconds: 0.25 })).toThrow(
      "withOverlay(pocket-1.s5a): pocket.cleanPocket.resetSeconds must be a whole number of tenths of a second (the restated budget is rounded to the tenth), got 0.25",
    );
  });

  it("offsets move only the three read-system deltas; with no parts the tree is stamped pocket-1.s4 (E1), and with no offsets either it is the s4 bench", () => {
    const same = cleanBenchTunablesS5(undefined, NO_READ_SYSTEM_OFFSETS);
    expect(same.engineRules).toEqual(s4.engineRules);
    expect(movedLeaves(s4, same)).toEqual([]);
    const offsets = { HALF_FIELD: 1.0, FULL_FIELD: -0.5, CONCEPT: 0.25 };
    const e1 = cleanBenchTunablesS5(undefined, offsets);
    expect(e1.engineRules?.name).toBe("pocket-1.s4");
    expect(movedLeaves(s4, e1)).toEqual(["engineRules.overlayDigest", "qb.readSystem.CONCEPT.budgetDeltaSeconds", "qb.readSystem.FULL_FIELD.budgetDeltaSeconds", "qb.readSystem.HALF_FIELD.budgetDeltaSeconds"]);
    expect([e1.qb.readSystem.HALF_FIELD.budgetDeltaSeconds, e1.qb.readSystem.FULL_FIELD.budgetDeltaSeconds, e1.qb.readSystem.CONCEPT.budgetDeltaSeconds]).toEqual([0.5, 0.5, -0.75]);
    const e9 = cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS }, offsets);
    expect(e9.engineRules?.name).toBe("pocket-1.s5a");
    expect(movedLeaves(cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS }), e9)).toEqual(["engineRules.overlayDigest", "qb.readSystem.CONCEPT.budgetDeltaSeconds", "qb.readSystem.FULL_FIELD.budgetDeltaSeconds", "qb.readSystem.HALF_FIELD.budgetDeltaSeconds"]);
    // An offset of 0 patches nothing: E9 at today's deltas is E8 (plan §5: "E9 is E8").
    expect(cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS }, { HALF_FIELD: 0, FULL_FIELD: 0, CONCEPT: 0 }).engineRules).toEqual(cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS }).engineRules);
    expect(() => cleanBenchTunablesS5(undefined, { ...NO_READ_SYSTEM_OFFSETS, CONCEPT: Number.NaN })).toThrow("readSystemDeltaLeaves: the CONCEPT offset must be a finite number of seconds, got NaN");
    // DEFAULT_TUNABLES is untouched.
    expect(DEFAULT_TUNABLES.qb.readSystem.HALF_FIELD.budgetDeltaSeconds).toBe(-0.5);
    expect("cleanPocket" in DEFAULT_TUNABLES.pocket).toBe(false);
  });
});

interface StepBenchRun extends BenchRun {
  /** PASS plays stamped with the bench's rules name. */
  stamped: number;
  /** Mean of each dropback's decision tick (the THROW or THROWAWAY's tick), summed and counted. */
  decisionSum: number;
  decisions: number;
  /** POCKET_STATUS above CLEAN, and ARRIVED threats (S-6). */
  dirtyStatuses: number;
  arrived: number;
}

function emptyStepRun(): StepBenchRun {
  return { ...emptyRun(), stamped: 0, decisionSum: 0, decisions: 0, dirtyStatuses: 0, arrived: 0 };
}

function foldStepBench(run: StepBenchRun, events: readonly MatchEventEnvelope[], tunables: Tunables, positions: ReadonlyMap<PlayerId, Position>): void {
  foldBench(run, events, tunables, positions);
  const name = tunables.engineRules?.name;
  for (const { event } of events) {
    if (event.type === "PLAY_START") {
      const payload = event.payload as { readonly kind?: unknown } | undefined;
      if (payload?.kind === "PASS_PLAY_V1" && rulesOnPlayStart(payload)?.name === name) run.stamped += 1;
    } else if (event.type === "POCKET_STATUS" && (event.payload as { readonly status?: unknown }).status !== "CLEAN") run.dirtyStatuses += 1;
    else if (event.type === "RUSH_THREAT" && event.payload.state === "ARRIVED") run.arrived += 1;
  }
  for (const d of dropbacksOf(events)) {
    const tick = d.throwTick ?? d.throwawayTick;
    if (tick === undefined) continue;
    run.decisionSum += tick;
    run.decisions += 1;
  }
}

function interceptions(run: BenchRun): number {
  return Object.values(run.rows.byClass).reduce((n, c) => n + c.interceptions, 0);
}

function playStepBench(tunables: Tunables, opts: { readonly flatFirst?: number; readonly genThroughWeek?: number } = {}): { flat: StepBenchRun; gen: StepBenchRun } {
  const flat = emptyStepRun();
  const gen = emptyStepRun();
  flatBaseline(
    1,
    (o, snap) => {
      flat.acc = foldGame(flat.acc, o);
      foldStepBench(flat, o.events, tunables, positionsFromSnapshot(snap));
      flat.games += 1;
    },
    { tunables, ...(opts.flatFirst === undefined ? {} : { first: opts.flatFirst }) },
  );
  genSeason(
    1,
    (o, snap) => {
      gen.acc = foldGame(gen.acc, o);
      foldStepBench(gen, o.events, tunables, positionsFromSnapshot(snap));
      gen.games += 1;
    },
    { tunables, ...(opts.genThroughWeek === undefined ? {} : { throughWeek: opts.genThroughWeek }) },
  );
  return { flat, gen };
}

function stepSummary(run: StepBenchRun): Record<string, unknown> {
  const { seconds: _seconds, ...rest } = summary(run);
  return {
    ...rest,
    stamped: run.stamped,
    decisionTick: run.decisions === 0 ? null : (run.decisionSum / run.decisions).toFixed(4),
    intPerAttempt: pct(interceptions(run), run.passStarts).toFixed(2),
    interceptions: interceptions(run),
    dirtyStatuses: run.dirtyStatuses,
    arrived: run.arrived,
  };
}

describe.skipIf(GATED)("ADR-089 step 5: the s4 clean bench reproduces pkB (FF_POCKET_BENCH=1; P-6's s4 row)", () => {
  const tunables = cleanBenchTunablesS4();
  let flat = emptyStepRun();
  let gen = emptyStepRun();

  beforeAll(() => {
    ({ flat, gen } = playStepBench(tunables));
    process.stdout.write(`ADR-089 s4 clean bench:\n${JSON.stringify({ flat: stepSummary(flat), gen: stepSummary(gen) }, null, 1)}\n`);
  }, 1_800_000);

  it.each([
    ["flat", () => flat, { games: 496, dropbacks: 52_882, throwaways: "20.625", decision: "1.6634", release: "1.9214", intPerAttempt: "2.32", interceptions: 1229, nobody: { n: 23064, of: 52882, pct: "43.6" }, desperation: [3594, 204] }],
    ["gen", () => gen, { games: 272, dropbacks: 28_588, throwaways: "11.127", decision: "1.7992", release: "2.0655", intPerAttempt: "6.95", interceptions: 1987, nobody: { n: 8631, of: 28588, pct: "30.2" }, desperation: [2893, 549] }],
  ] as const)("%s: step 0's bench decisions exactly, the motion moving only the release; every PASS play s4; no pressure and no sack", (_league, run, want) => {
    const r = run();
    expect(r.games).toBe(want.games);
    expect(r.passStarts).toBe(want.dropbacks);
    expect(r.rows.dropbacks).toBe(want.dropbacks);
    expect(r.stamped).toBe(r.passStarts);
    expect(pct(r.throwaways, r.passStarts).toFixed(3)).toBe(want.throwaways);
    expect((r.decisionSum / r.decisions).toFixed(4)).toBe(want.decision);
    expect(mean(r.acc.play.throwTicks).toFixed(4)).toBe(want.release);
    expect(interceptions(r)).toBe(want.interceptions);
    expect(pct(interceptions(r), r.passStarts).toFixed(2)).toBe(want.intPerAttempt);
    expect((summary(r) as { nobodyOpen: unknown }).nobodyOpen).toEqual(want.nobody);
    expect([r.rows.byClass.DESPERATION.dropbacks, r.rows.byClass.DESPERATION.interceptions]).toEqual([...want.desperation]);
    expect(r.rows.byClass.CLEAN_EXPIRY.dropbacks).toBe(0);
    expect(r.acc.play.pressuredDropbacks).toBe(0);
    expect(r.acc.play.sacks).toBe(0);
    expect(r.dirtyStatuses).toBe(0);
    expect(r.arrived).toBe(0);
  });
});

describe.skipIf(GATED)("ADR-089 step 5: the s5 clean bench, every part on (FF_POCKET_BENCH=1; a smoke: gen weeks 1 and 2, flat's first 32 games)", () => {
  const tunables = cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS });
  let flat = emptyStepRun();
  let gen = emptyStepRun();

  beforeAll(() => {
    ({ flat, gen } = playStepBench(tunables, { flatFirst: 32, genThroughWeek: 2 }));
    process.stdout.write(`ADR-089 s5 clean bench (smoke):\n${JSON.stringify({ flat: stepSummary(flat), gen: stepSummary(gen) }, null, 1)}\n`);
  }, 600_000);

  it.each([
    ["flat", () => flat, 32],
    ["gen", () => gen, 32],
  ] as const)("%s: every PASS play stamped pocket-1.s5a; no status above CLEAN, no ARRIVED threat (S-6), no pressured dropback", (_league, run, games) => {
    const r = run();
    expect(r.games).toBe(games);
    expect(r.passStarts).toBeGreaterThan(0);
    expect(r.stamped).toBe(r.passStarts);
    expect(r.dirtyStatuses).toBe(0);
    expect(r.arrived).toBe(0);
    expect(r.acc.play.pressuredDropbacks).toBe(0);
  });
});
