/**
 * ADR-089 step 5's harness (`step5.ts`; plan §4's row, §7, §9 item 10): the pins, the preflight, the
 * refusing gate, the plan, the parser, the step-5 visit on real games (a tiny corpus, scratch only),
 * the grading of both halves on records built from those games, the replays (S-7), the selection in
 * the measures file and R-7's command on it, and a run with an injected player and a scratch cache.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, loadAmendments } from "../src/pocket/amendments.js";
import { STEP5A_RUN_IDS, type ArmId } from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import type { SeedSet } from "../src/pocket/corpus.js";
import { loadFiled } from "../src/pocket/filed.js";
import { RESELECT_VIEW_PIN, reselectFromFile, reselectInputOf } from "../src/pocket/reselectCommand.js";
import { parsePocketArgs, STEP5_SPLIT_REFUSAL } from "../src/pocket/step0.js";
import { rowValueOf, step3StampOf } from "../src/pocket/step3.js";
import { foldDigests } from "../src/pocket/golden.js";
import {
  binsAboveTwiceFtn,
  bin20RawOf,
  cleanScrambleOf,
  fitCorpusProblemOf,
  freshBaseProblems,
  gradeStep5,
  planStep5,
  playableStep5Ids,
  playStep5Arm,
  preflightStep5,
  q5Problems,
  guardAllOf,
  rePointsOf,
  releaseSharesOf,
  step5AliasesOf,
  runStep5,
  s5aRecordProblemOf,
  step5GateRefusal,
  step5GateState,
  step5MeasuresOf,
  STEP5_DIRTY_REFUSAL,
  STEP5_GRID_IDS,
  STEP5_GUARD_CLOCK,
  STEP5A_AMENDMENTS_PIN,
  STEP5A_RECORDS_FINAL,
  STEP5B_AMENDMENTS_PIN,
  STEP5B_RECORDS_FINAL,
  type Step5GateState,
  type Step5Record,
  type Step5RecordsBySet,
} from "../src/pocket/step5.js";
import { RELEASE_BINS } from "../src/pocket/selection.js";
import { am1ArmReading, type GuardSide } from "../src/pocket/guardAm1.js";
import { emptyFitFold } from "../src/pocket/fit5a.js";
import type { Step1Env } from "../src/pocket/step1.js";

const PKG = join(import.meta.dirname, "..");
const FILED = join(PKG, FILED_PATH);
const AMEND = join(PKG, AMENDMENTS_PATH);
const ENV: Step1Env = { fingerprint: "fnv1a:test5", commit: "test", dirty: false, node: "v-test" };
const TINY = { flatFirst: 1, genThroughWeek: 1 } as const;
const OPEN: Step5GateState = { fitPin: "fnv1a:fit", fitRecord: "fnv1a:fit", s5aDigest: "fnv1a:s5a", s5aFinal: true, s5aOutcome: { faults: [], breaches: [], misses: [] } };

let scratch: string;
beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "pocket-step5-"));
});
afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("step 5's pins, preflight and gate", () => {
  it("pins each half's view of the committed amendments file; the records are not final; R-7's view pin is 5b's", () => {
    const whole = loadAmendments(AMEND, loadFiled(FILED));
    expect(amendmentsDigest(amendmentsAtStep(whole, "5a"))).toBe(STEP5A_AMENDMENTS_PIN);
    expect(amendmentsDigest(amendmentsAtStep(whole, "5b"))).toBe(STEP5B_AMENDMENTS_PIN);
    expect(STEP5A_AMENDMENTS_PIN).toBe("fnv1a:3f9478eb");
    expect(RESELECT_VIEW_PIN).toBe(STEP5B_AMENDMENTS_PIN);
    expect(STEP5A_RECORDS_FINAL).toBe(false);
    expect(STEP5B_RECORDS_FINAL).toBe(false);
  });

  it("the preflight reads AM-8 on the S5 view with E0 fresh, and AM-9 or AM-10; a wrong pin is refused", () => {
    const a = preflightStep5("5a", FILED, AMEND).guard;
    expect(a.am8).toBe("AM-8");
    expect(a.readings).toBe("AM-9");
    expect(a.bases).toEqual({ E9: "E0" });
    expect(a.freshBases).toEqual(["E0"]);
    expect(a.skipEqualDials).toBe(true);
    const b = preflightStep5("5b", FILED, AMEND).guard;
    expect(b.readings).toBe("AM-10");
    expect(b.bases).toEqual({ F5: "D1", F0: "F5" });
    expect(() => preflightStep5("5a", FILED, AMEND, { pin: "fnv1a:00000000" })).toThrow(/^ADR-089 step 5a: refused before anything plays: the half's view of the amendments file digests to fnv1a:3f9478eb, not the pin fnv1a:00000000/);
    expect(() => preflightStep5("5b", FILED, AMEND, { pin: null })).toThrow(/is not pinned/);
  });

  it("this build's gate refuses both halves by name: the fit is not recorded", () => {
    const st = step5GateState();
    expect(st.fitPin).toBeUndefined();
    expect(st.s5aDigest).toBeUndefined();
    expect(step5GateRefusal("5a", st)).toMatch(/^ADR-089 step 5a: refused before anything plays \(the gate, plan §9 item 10\): the 5a fit is not recorded/);
    expect(step5GateRefusal("5b", st)).toMatch(/^ADR-089 step 5b: refused .*the 5a fit is not recorded/);
  });

  it("the gate's every refusal, and what --after-owner lifts (a breach, a miss; never a fault)", () => {
    expect(step5GateRefusal("5a", OPEN)).toBeUndefined();
    expect(step5GateRefusal("5b", OPEN)).toBeUndefined();
    expect(step5GateRefusal("5a", { ...OPEN, fitRecord: undefined })).toMatch(/the fit record reports\/adr-089-step5a\.fit\.json is not committed/);
    expect(step5GateRefusal("5a", { ...OPEN, fitRecord: "fnv1a:other" })).toMatch(/digests to fnv1a:other, not POCKET_1_S5A_FIT_DIGEST fnv1a:fit/);
    expect(step5GateRefusal("5a", { ...OPEN, s5aDigest: undefined })).toMatch(/POCKET_1_S5A_DIGEST is unset/);
    expect(step5GateRefusal("5b", { ...OPEN, s5aFinal: false })).toMatch(/the 5a records are not final/);
    const fault = { ...OPEN, s5aOutcome: { faults: ["S-1"], breaches: [], misses: [] } };
    expect(step5GateRefusal("5b", fault)).toMatch(/a build fault \(S-1\)/);
    expect(step5GateRefusal("5b", fault, "2026-11-07T00:00Z")).toMatch(/a build fault/);
    const breach = { ...OPEN, s5aOutcome: { faults: [], breaches: ["E9 against E0, gen"], misses: [] } };
    expect(step5GateRefusal("5b", breach)).toMatch(/an AM-8 breach/);
    expect(step5GateRefusal("5b", breach, "2026-11-07T00:00Z")).toBeUndefined();
    const miss = { ...OPEN, s5aOutcome: { faults: [], breaches: [], misses: ["s5a.cleanScramble"] } };
    expect(step5GateRefusal("5b", miss)).toMatch(/a graded miss \(s5a\.cleanScramble\)/);
    expect(step5GateRefusal("5b", miss, "2026-11-07T00:00Z")).toBeUndefined();
    // Code-tests F6, F7 and F14: a smoke-corpus fit record, 5a records of another half, of one set or with a malformed outcome, and an --after-owner that names no time.
    expect(step5GateRefusal("5b", miss, "yes")).toMatch(/--after-owner "yes" is not a timestamp/);
    expect(fitCorpusProblemOf({ flatFirst: null, genThroughWeek: null })).toBeUndefined();
    expect(fitCorpusProblemOf({ flatFirst: null, genThroughWeek: 2 })).toMatch(/a smoke corpus/);
    expect(fitCorpusProblemOf(undefined)).toMatch(/names no corpus/);
    expect(step5GateRefusal("5a", { ...OPEN, fitCorpusProblem: "the fit record was made on a smoke corpus" })).toMatch(/smoke corpus/);
    expect(s5aRecordProblemOf({ half: "5a", outcome: { faults: [], breaches: [], misses: [] } })).toBeUndefined();
    expect(s5aRecordProblemOf({ half: "5b", outcome: { faults: [], breaches: [], misses: [] } })).toMatch(/not 5a's/);
    expect(s5aRecordProblemOf({ half: "5a", oneSet: 1, outcome: { faults: [], breaches: [], misses: [] } })).toMatch(/one seed set/);
    expect(s5aRecordProblemOf({ half: "5a", outcome: { faults: [] } })).toMatch(/missing or malformed/);
    expect(s5aRecordProblemOf({ half: "5a" })).toMatch(/missing or malformed/);
    expect(step5GateRefusal("5b", { ...OPEN, s5aRecordProblem: "the 5a records were graded on one seed set (1)" })).toMatch(/one seed set/);
    // Fidelity F-15: R-7 with no records file is a named refusal.
    expect(() => reselectFromFile(join(scratch, "absent.json"), FILED, AMEND)).toThrow(/refused: there is no records file at/);
  });

  it("runStep5 is refused before anything plays and no cache is made; a dirty tree is refused once the gate opens", () => {
    const parent = join(scratch, "refused");
    for (const half of ["5a", "5b"] as const) {
      expect(() => runStep5({ half, cacheParent: parent, filedPath: FILED, amendmentsPath: AMEND, env: ENV })).toThrow(/the 5a fit is not recorded/);
    }
    expect(existsSync(parent)).toBe(false);
    expect(() => runStep5({ half: "5a", cacheParent: parent, filedPath: FILED, amendmentsPath: AMEND, env: { ...ENV, dirty: true }, gate: OPEN })).toThrow(STEP5_DIRTY_REFUSAL);
    expect(existsSync(parent)).toBe(false);
  });
});

describe("releaseSharesOf (s5a.under1 and s5a.over35 on the fit's windows; code-tests F11)", () => {
  it("one release in each of the 11 windows: under1 is windows 0 and 1 (2 of 11), over35 windows 6 to 10 (5 of 11)", () => {
    const f = emptyFitFold();
    f.bySystem.HALF_FIELD.counts = f.bySystem.HALF_FIELD.counts.map(() => 1);
    const r = releaseSharesOf(f);
    expect(r.under1).toBeCloseTo((100 * 2) / 11, 12);
    expect(r.over35).toBeCloseTo((100 * 5) / 11, 12);
    expect(releaseSharesOf(emptyFitFold())).toEqual({ under1: null, over35: null });
  });
});

describe("step 5's plan and parser", () => {
  it("plays only the defined arms: 5a E0 and E2 to E8, 5b D1; with a fit and a selection, every arm", () => {
    expect(playableStep5Ids("5a")).toEqual(["E0", "E2", "E3", "E4", "E5", "E6", "E7", "E8"]);
    expect(playableStep5Ids("5b")).toEqual(["D1"]);
    const records = { fitted: { HALF_FIELD: 0.5, FULL_FIELD: 0.25, CONCEPT: 0 }, selection: { at: { shape: "S" as const, theta: 12 }, restampOf: "F6" as const } };
    expect(playableStep5Ids("5a", records)).toEqual([...STEP5A_RUN_IDS]);
    expect(playableStep5Ids("5b", records)).toHaveLength(18);
    const p = planStep5("5a", { shard: { index: 2, count: 3 } });
    expect(p.complete).toHaveLength(16);
    expect(p.mine.map((t) => `${t.id}.set${String(t.seedSet)}`)).toEqual(["E0.set2", "E3.set1", "E4.set2", "E6.set1", "E7.set2"]);
    expect(() => planStep5("5a", { arms: ["E9"] })).toThrow(/E9 is not playable: E9 is one of step 5a's arms, named in this build but not yet defined/);
    expect(() => planStep5("5b", { arms: ["E0"] })).toThrow(/not in step 5b's run/);
  });

  it("parses --step 5a and 5b with each half's flags, and refuses --step 5 and the other half's flags", () => {
    expect(parsePocketArgs(["--step", "5a"], "/")).toEqual({ step: "5a" });
    expect(parsePocketArgs(["--step", "5a", "--arms", "E0,E2", "--shard", "1/3", "--seed-set", "2", "--report", "r.md", "--out", "o.json"], "/")).toEqual({ step: "5a", arms: ["E0", "E2"], shard: { index: 1, count: 3 }, seedSet: 2, report: "/r.md", out: "/o.json" });
    expect(parsePocketArgs(["--step", "5a", "--fit", "--shard", "2/3", "--out", "f.json"], "/")).toEqual({ step: "5a", fit: true, shard: { index: 2, count: 3 }, out: "/f.json" });
    expect(parsePocketArgs(["--step", "5a", "--fit-replay", "0.5,-1", "--gen-through-week", "2", "--out", "x.json"], "/")).toEqual({ step: "5a", fitReplay: [0.5, -1], genThroughWeek: 2, out: "/x.json" });
    expect(parsePocketArgs(["--step", "5a", "--fresh-base", "2", "--out", "x.json"], "/")).toEqual({ step: "5a", freshBase: 2, out: "/x.json" });
    expect(parsePocketArgs(["--arms", "D1", "--step", "5b", "--after-owner", "2026-11-08T14:30Z"], "/")).toEqual({ step: "5b", arms: ["D1"], afterOwner: "2026-11-08T14:30Z" });
    // Code-tests F14: --after-owner is a timestamp; --fit-replay refuses an empty or repeated offset; --step once.
    expect(() => parsePocketArgs(["--step", "5b", "--after-owner", "ts1"], "/")).toThrow(/^--after-owner takes the time of the owner's word/);
    expect(() => parsePocketArgs(["--step", "5a", "--fit-replay", "0,,0.5", "--out", "x.json"], "/")).toThrow(/^--fit-replay takes one to three offsets/);
    expect(() => parsePocketArgs(["--step", "5a", "--fit-replay", "0.5,0.5", "--out", "x.json"], "/")).toThrow(/^--fit-replay names an offset twice/);
    expect(() => parsePocketArgs(["--step", "5a", "--step", "5b"], "/")).toThrow(/^--step is given twice/);
    expect(parsePocketArgs(["--step", "5b", "--reselect", "--from", "r.json"], "/")).toEqual({ step: "5b", reselect: true, from: "/r.json" });
    expect(parsePocketArgs(["--step", "5b", "--reselect", "--from", "r.json", "--first-pass", "f.json"], "/")).toEqual({ step: "5b", reselect: true, from: "/r.json", firstPass: "/f.json" });
    expect(() => parsePocketArgs(["--step", "5b", "--first-pass", "f.json"], "/")).toThrow(/--first-pass goes with --reselect/);
    expect(parsePocketArgs(["--step", "5b", "--digests", "--out", "d.json"], "/")).toEqual({ step: "5b", digests: true, out: "/d.json" });
    expect(() => parsePocketArgs(["--step", "5"], "/")).toThrow(STEP5_SPLIT_REFUSAL);
    expect(() => parsePocketArgs(["--step", "5a", "--after-owner", "x"], "/")).toThrow(/^--after-owner: step 5b's flag, not step 5a's/);
    expect(() => parsePocketArgs(["--step", "5b", "--fit"], "/")).toThrow(/^--fit: step 5a's flag, not step 5b's/);
    expect(() => parsePocketArgs(["--step", "5b", "--reselect"], "/")).toThrow(/--from <file\.json>/);
    expect(() => parsePocketArgs(["--step", "5b", "--reselect", "--from", "r", "--arms", "D1"], "/")).toThrow(/takes --from, --first-pass \(not --arms\)/);
    expect(() => parsePocketArgs(["--step", "5a", "--fit", "--arms", "E0"], "/")).toThrow(/--fit plays the 5a fit's 19 runs .*\(not --arms\)/);
    expect(() => parsePocketArgs(["--step", "5a", "--arms", "F1"], "/")).toThrow(/^--arms: F1 is not an arm \(step 5a's: E0 to E10\)$/);
    expect(() => parsePocketArgs(["--step", "5b", "--digests"], "/")).toThrow(/--digests writes its folds to --out/);
    expect(() => parsePocketArgs(["--step", "5a", "--gen-through-week", "1"], "/")).toThrow(/--gen-through-week goes with --fit/);
    expect(() => parsePocketArgs(["--step", "5a", "--part1"], "/")).toThrow(/^unknown argument --part1/);
    expect(() => parsePocketArgs(["--step", "4", "--fit"], "/")).toThrow(/^unknown argument --fit/);
  });
});

describe("step 5's visit and grading on a tiny corpus (scratch; nothing is recorded)", () => {
  const classify = (): ReturnType<typeof preflightStep5>["guard"]["classify"] => preflightStep5("5a", FILED, AMEND).guard.classify;
  const plays = new Map<string, Step5Record>();
  const play = (id: ArmId, s: SeedSet): Step5Record => {
    const key = `${id}.${String(s)}`;
    if (!plays.has(key)) plays.set(key, playStep5Arm(id, s, ENV, { corpus: TINY, amendments: STEP5A_AMENDMENTS_PIN!, classify: classify() }));
    return plays.get(key)!;
  };

  it("folds every step-5 reading: E0 has no block and no clean scramble, E8 has the block; the bench is clean", { timeout: 240_000 }, () => {
    const e0 = play("E0", 1);
    const e8 = play("E8", 1);
    expect(e0.format).toBe("adr-089-step5-arm/v1");
    for (const l of ["flat", "gen"] as const) {
      expect(e0.s5[l].extra.dropbacks, l).toBeGreaterThan(0);
      expect(e0.s5[l].extra.nonClean, l).toBe(0);
      expect(e8.s5[l].extra.nonClean, l).toBe(0);
      expect(e0.s5[l].rows.block, l).toBe(false);
      expect(e8.s5[l].rows.block, l).toBe(true);
      expect(e0.s5[l].s5.picks.total, l).toBe(0);
      expect(cleanScrambleOf(e0.s5[l]), l).toBe(0);
      expect(e0.s5[l].fit.games.length, l).toBeGreaterThan(0);
      const attempts = RELEASE_BINS.reduce((a, b) => a + e0.s5[l].curve[b]!.attempts, 0);
      expect(attempts, l).toBeGreaterThan(0);
      expect(RELEASE_BINS.reduce((a, b) => a + e0.s5[l].curve[b]!.pressured, 0), l).toBe(0);
      expect(bin20RawOf(e0.s5[l]) ?? 0, l).toBe(0);
      expect(binsAboveTwiceFtn(e0.s5[l]), l).toBe(0);
    }
    // Determinism: a second play is the same record, and its stream digests are the same.
    const again = playStep5Arm("E0", 1, ENV, { corpus: TINY, amendments: STEP5A_AMENDMENTS_PIN!, classify: classify() });
    expect(freshBaseProblems(e0, again)).toEqual([]);
    expect(q5Problems(e0, again)).toEqual([]);
  });

  it("grades 5a: E9 (stood in by E8's record) against E0, the guard on S5, E0 twice (S-7), and the measures' outcome", { timeout: 240_000 }, () => {
    const { file, guard } = preflightStep5("5a", FILED, AMEND);
    const records: Step5RecordsBySet = new Map<ArmId, Partial<Record<SeedSet, Step5Record>>>([
      ["E0", { 1: play("E0", 1), 2: play("E0", 2) }],
      ["E9", { 1: play("E8", 1), 2: play("E8", 2) }],
    ]);
    const g = gradeStep5({ half: "5a", records, file, guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) } });
    const ids = g.sections.clauses.map((c) => c.id);
    for (const id of ["s5a.cleanScramble", "s5a.completion", "s5a.int", "s5a.release", "s5a.cleanOuts", "s5a.removedClass", "s5a.cleanExpiryBar", "s5a.oneCleanMove"]) expect(ids, id).toContain(id);
    const verdict = (id: string): string => g.sections.clauses.find((c) => c.id === id)!.verdict;
    expect(g.sections.clauses.find((c) => c.id === "s5a.cleanScramble")!.note).toMatch(/break-outs may run up to about 0\.5 in 100 high/);
    expect(["PASS", "FAIL"]).toContain(verdict("s5a.cleanScramble"));
    expect(["PASS", "FAIL"]).toContain(verdict("s5a.completion"));
    expect(["PASS", "FAIL"]).toContain(verdict("s5a.int"));
    expect(verdict("s5a.reset")).toBe("NOT PLAYED");
    expect(g.sections.guard.filter((r) => r.arm === "E9").map((r) => r.league)).toEqual(["flat", "gen"]);
    expect(g.sections.replay).toEqual(["E0 set 1, played fresh twice: identical (stream digests and records)", "E0 set 2, played fresh twice: identical (stream digests and records)"]);
    expect(g.sections.proofs.map((p) => p.id)).toEqual(["S-1 proof:clean-expiry-bar", "S-2 proof:one-clean-move", "S-3", "S-6", "rows", "picks:offered", "rows:recomputed", "S-4", "S-9"]);
    // Plan §7.3 (fidelity F-8): time to throw beside the hit and sack figures, the pressured sacks apart.
    const k = play("E8", 1).report.sacks.gen;
    expect(g.sections.affected).toContainEqual(expect.stringContaining(`gen set 1 time to throw ${play("E8", 1).report.timeToThrow.gen.toFixed(2)} s, sacks ${String(k.sacks)} of ${String(k.dropbacks)} dropbacks, pressured sacks ${String(k.pressuredSacks)} of ${String(k.pressuredDropbacks)} pressured dropbacks`));
    expect(g.sections.affected.some((l) => l.startsWith("beside the hit and sack figures, E9: flat set 1 time to throw "))).toBe(true);
    // R-6's third clause (measurement M6): with the fit record's confirm digest, E9's set-1 gen stream must equal it.
    expect(g.sections.proofs.some((p) => p.id === "R-6 confirm")).toBe(false);
    const e9Digest = foldDigests(play("E8", 1).s5.gen.fit.games);
    const confirmed = gradeStep5({ half: "5a", records, file, guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) }, fitConfirmDigest: e9Digest });
    expect(confirmed.sections.proofs.find((p) => p.id === "R-6 confirm")).toMatchObject({ verdict: "PASS" });
    const unconfirmed = gradeStep5({ half: "5a", records, file, guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) }, fitConfirmDigest: "fnv1a:00000000" });
    expect(unconfirmed.sections.outcome.structuralFailures).toEqual([`R-6 confirm: 1 failing, first: E9 set 1 gen folds to ${e9Digest}, the fit record's confirm run to fnv1a:00000000`]);
    // Fidelity F-10: the two recomputed clauses equal collect's registered rows on every record.
    expect(g.sections.proofs.find((p) => p.id === "rows:recomputed")).toMatchObject({ verdict: "PASS", detail: "clean" });
    expect(rowValueOf(play("E8", 1), "pressured_share_by_release_bin", "gen")).not.toBeNull();
    {
      const doctored = structuredClone(play("E8", 1));
      doctored.s5.gen.curve["2.0-2.5"]!.pressured += 1;
      const r = new Map(records);
      r.set("E9", { 1: doctored, 2: play("E8", 2) });
      const gg = gradeStep5({ half: "5a", records: r, file, guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) } });
      expect(gg.sections.proofs.find((p) => p.id === "rows:recomputed")!.detail).toMatch(/^E9 set 1 gen: pressured_share_by_release_bin: the stream's /);
    }
    expect(g.sections.outcome.structuralFailures).toEqual([]);
    // A fresh play that differs is a build fault (S-7).
    const moved = structuredClone(play("E0", 2));
    (moved.s5.gen.fit.games as string[])[0] = "fnv1a:moved";
    const bad = gradeStep5({ half: "5a", records, file, guard, fresh: { 1: play("E0", 1), 2: moved } });
    expect(bad.sections.outcome.structuralFailures).toEqual([expect.stringMatching(/^S-7: E0 set 2's two fresh plays differ: gen: the stream digests differ/)]);
    // AM-9 e9IsE8 (code-tests F1): with the fit on today's deltas E9 is E8; its clauses and guard rows read E8's record.
    expect(step5AliasesOf({ fitted: { HALF_FIELD: 0, FULL_FIELD: 0, CONCEPT: 0 } })).toEqual({ E9: "E8", E1: "E0" });
    expect(step5AliasesOf({ fitted: { HALF_FIELD: 0.5, FULL_FIELD: 0, CONCEPT: 0 } })).toEqual({});
    expect(step5AliasesOf({})).toEqual({});
    const noE9: Step5RecordsBySet = new Map<ArmId, Partial<Record<SeedSet, Step5Record>>>([
      ["E0", { 1: play("E0", 1), 2: play("E0", 2) }],
      ["E8", { 1: play("E8", 1), 2: play("E8", 2) }],
    ]);
    const aliased = gradeStep5({ half: "5a", records: noE9, file, guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) }, aliases: { E9: "E8", E1: "E0" } });
    for (const id of ["s5a.cleanScramble", "s5a.completion", "s5a.int"]) {
      const c = aliased.sections.clauses.find((k) => k.id === id)!;
      expect(c.verdict, id).toBe(g.sections.clauses.find((k) => k.id === id)!.verdict);
      expect(c.values, id).toEqual(g.sections.clauses.find((k) => k.id === id)!.values);
    }
    expect(aliased.sections.outcome.structuralFailures).toEqual([]);
    // The alone arms beside the guard, unguarded (AM-8): E8 against E0 here.
    const alone = aliased.sections.guard.filter((r) => r.arm === "E8");
    expect(alone.map((r) => [r.league, r.role, r.graded])).toEqual([["flat", "information", false], ["gen", "information", false]]);
    // Without the alias, the graded clauses go unplayed, and that is a fault, never a silent pass.
    const silent = gradeStep5({ half: "5a", records: noE9, file, guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) } });
    expect(silent.sections.outcome.structuralFailures).toEqual(expect.arrayContaining([expect.stringMatching(/^s5a\.cleanScramble: a graded clause was not played/), expect.stringMatching(/^s5a\.int: a graded clause was not played/)]));
    expect(silent.sections.outcome.mergeCard).toBe(false);
    // The filed report rows (measurement M5, fidelity F-8, code-tests F4, guardian C5): AM-8's reported splits, the break-outs with C5's row, the raw edges, the guard's detail.
    const e8 = play("E8", 1);
    for (const l of ["flat", "gen"] as const) {
      const sp = e8.s5[l].splits;
      expect(Object.keys(sp).sort()).toEqual(["CLEAN_EXPIRY/AFTER_CLEAN_MOVE", "CLEAN_EXPIRY/OTHER", "DESPERATION/CLEAN", "DESPERATION/DIRTY", "ON_THE_RUN/CLEAN_BREAKOUT", "ON_THE_RUN/PRESSURED", "PROGRESSION/AFTER_CLEAN_MOVE", "PROGRESSION/OTHER"]);
      for (const cls of ["PROGRESSION", "CLEAN_EXPIRY", "ON_THE_RUN", "DESPERATION"] as const) {
        const parts = Object.entries(sp).filter(([k]) => k.startsWith(`${cls}/`)).map(([, v]) => v);
        expect(parts.reduce((a, v) => a + v.aimed, 0), `${l} ${cls}`).toBe(e8.s5[l].guard[cls].aimedByBin.reduce((a, b) => a + b, 0));
        expect(parts.reduce((a, v) => a + v.interceptions, 0), `${l} ${cls}`).toBe(e8.s5[l].guard[cls].interceptions);
      }
      expect(e8.s5[l].extra.releases, l).toBeGreaterThan(0);
    }
    expect(Object.values(e8.s5.gen.splits).some((v) => v.aimed > 0)).toBe(true);
    expect(g.sections.affected.some((x) => x.startsWith("E9 set 1 gen: AM-8's reported splits (INT/aimed, never graded): PROGRESSION AFTER_CLEAN_MOVE "))).toBe(true);
    expect(g.sections.affected.some((x) => /^E9 set 1 gen: break-outs beside s5a\.cleanScramble: .*clean CAUGHT sacks with a named rusher \d+ of \d+/.test(x))).toBe(true);
    for (const id of ["s5a.under1", "s5a.over35"]) expect(g.sections.clauses.find((c) => c.id === id)!.values.some((v) => v.startsWith("beside, the raw edge"))).toBe(true);
    const e9gen = g.sections.guard.find((r) => r.arm === "E9" && r.league === "gen")!;
    expect(e9gen.ownClock).toContain("the release clock: raw seconds on both sides (AM-8)");
    expect(e9gen.ownClock.some((x) => /^league-wide: Z .*minimum breaching mean excess .*set 1 rise .* SE /.test(x))).toBe(true);
    // The guard on AM-8's clock: raw release seconds on both sides (bins and rate table), the league mix from the same raw fold.
    expect(STEP5_GUARD_CLOCK).toBe("RAW");
    for (const id of ["E0", "E8"] as const) for (const l of ["flat", "gen"] as const) {
      const r = play(id, 1);
      const all = guardAllOf(r.s5[l].guard);
      const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
      expect(sum(all.aimedByBin), `${id} ${l}`).toBe(sum(r.report.intGuard[l].all.aimedByBin));
      expect(all.interceptions, `${id} ${l}`).toBe(r.report.intGuard[l].all.interceptions);
    }
    const side = (id: ArmId, l: "flat" | "gen"): Partial<Record<SeedSet, GuardSide>> => Object.fromEntries(([1, 2] as const).map((s) => {
      const r = play(id, s);
      return [s, { all: guardAllOf(r.s5[l].guard), byClass: Object.fromEntries(Object.entries(r.s5[l].guard).map(([cls, c]) => [cls, { aimedByBin: c.aimedByBin, interceptions: c.interceptions }])) }];
    }));
    for (const l of ["flat", "gen"] as const) {
      const row = g.sections.guard.find((r) => r.arm === "E9" && r.league === l)!;
      expect(row.Z, l).toBe(am1ArmReading(side("E0", l), side("E8", l), "RAW", guard.lines).league.Z);
    }
    // s5a.intLeague reads the filed int_rate (INT per attempt, intGuard.intPerAttempt), not INT per aimed throw.
    const intLeague = g.sections.clauses.find((c) => c.id === "s5a.intLeague")!;
    const perAttempt = play("E8", 1).report.intGuard.gen.intPerAttempt - play("E0", 1).report.intGuard.gen.intPerAttempt;
    expect(intLeague.values[1]).toBe(`gen set 1 ${perAttempt.toFixed(2)} (set 2 ${(play("E8", 2).report.intGuard.gen.intPerAttempt - play("E0", 2).report.intGuard.gen.intPerAttempt).toFixed(2)})`);
    expect(intLeague.values.some((v) => v.startsWith("beside, per aimed throw: gen set 1 "))).toBe(true);
    // S-1's halves (plan R-3): a clean-expiry THROW to a man below 30, or a desperation THROW after a clean break-out, is a build fault.
    for (const field of ["belowBarTargetThrows", "onRunDesperation", "emptyPoolThrows"] as const) {
      const doctored = structuredClone(play("E8", 1));
      doctored.s5.gen.extra[field] = 1;
      const r = new Map(records);
      r.set("E9", { 1: doctored, 2: play("E8", 2) });
      const gg = gradeStep5({ half: "5a", records: r, file, guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) } });
      expect(gg.sections.outcome.structuralFailures, field).toEqual([expect.stringMatching(/^S-1 proof:clean-expiry-bar: 1 failing, first: E9 set 1 gen: /)]);
    }
    // S-4 and S-9 (fidelity F-3): stream checks on every record; a doctored record fails them.
    expect(play("E8", 1).s5.gen.extra.attemptReleases).toBeGreaterThan(0);
    expect(play("E8", 1).s5.gen.extra.attemptReleaseSum / play("E8", 1).s5.gen.extra.attemptReleases).toBeCloseTo(rowValueOf(play("E8", 1), "time_to_throw", "gen")!, 9);
    expect(g.sections.affected.some((l) => /^beside S-4, aimed pocket THROWs decided at or under 0\.5 s: E0 set 1 flat: \d+/.test(l))).toBe(true);
    for (const [field, proofId] of [["earlyFloorThrows", "S-4"], ["attemptReleaseSum", "S-9"]] as const) {
      const doctored = structuredClone(play("E8", 1));
      doctored.s5.gen.extra[field] += 1;
      const r = new Map(records);
      r.set("E9", { 1: doctored, 2: play("E8", 2) });
      const gg = gradeStep5({ half: "5a", records: r, file, guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) } });
      expect(gg.sections.outcome.structuralFailures, field).toEqual([expect.stringMatching(new RegExp(`^${proofId}: 1 failing, first: E9 set 1 gen: `))]);
    }
    expect(g.sections.affected.some((l) => /beside S-1: clean-expiry throws rank-pushed inside the cut pool \d+, to a man below 30 0; throws after a clean break-out \d+, of them desperation 0/.test(l))).toBe(true);
    const m = step5MeasuresOf(records, g, guard, ENV.fingerprint, [{ id: "E0", seedSet: 1 }]) as { outcome: { faults: string[]; breaches: string[]; misses: string[] } };
    expect(m.outcome.faults).toEqual([]);
    expect(Array.isArray(m.outcome.misses)).toBe(true);
  });

  it("grades 5b: D1 against step 4's record (S-7), the selection on the grid, its record in the measures and R-7 on it", { timeout: 240_000 }, () => {
    const { file, guard } = preflightStep5("5b", FILED, AMEND);
    // Grid records stood in by E0's, with hand-written curves (the reselect fixture's shape); theta 12 closest.
    const ATT = [1438, 852, 199, 181, 72, 57, 43];
    const grid = new Map<ArmId, Partial<Record<SeedSet, Step5Record>>>();
    STEP5_GRID_IDS.forEach((id, g) => {
      const bySet: Partial<Record<SeedSet, Step5Record>> = {};
      for (const s of [1, 2] as const) {
        const r = structuredClone(play("E0", s));
        const lean = g < 9 ? Math.abs(7 + g - 12) : 3 + g - 9;
        RELEASE_BINS.forEach((b, i) => {
          const a = ATT[i]!;
          r.s5.gen.curve[b] = { attempts: a, pressured: Math.min(a, Math.round((a * [9, 18, 25, 28, 37, 56, 72][i]!) / 100 / (1 + 0.04 * lean * i) + (s === 2 ? g % 3 : 0))) };
          (r.s4.gen.s4.curve as Record<string, { attempts: number; aimed: number; hit: number }>)[b] = { attempts: a, aimed: a, hit: Math.round((a * (3 + i + 0.3 * lean)) / 100) + (s === 2 ? 1 : 0) };
        });
        bySet[s] = r;
      }
      grid.set(id, bySet);
    });
    const d1 = { 1: play("E0", 1), 2: play("E0", 2) };
    const records: Step5RecordsBySet = new Map([...grid.entries(), ["D1" as ArmId, d1]]);
    const step4 = new Map<string, object>([["D1.set1", { ...d1[1], format: "x", stamp: {} }], ["D1.set2", { ...d1[2], report: { moved: true } }]]);
    const g = gradeStep5({ half: "5b", records, file, guard, step4 });
    expect(g.sections.replay).toEqual(["D1 set 1 against step 4's record: equal", "D1 set 2 against step 4's record: differs in report"]);
    expect(g.sections.outcome.structuralFailures).toContainEqual("S-7: D1 set 2 differs from step 4's record in report");
    expect(g.selection?.winner).toBe("S:theta=12");
    expect(g.selection?.stop).toBeUndefined();
    expect(g.sections.selection?.[0]).toBe("gen: winner S:theta=12");
    expect(g.sections.clauses.find((c) => c.id === "s5b.sack")!.verdict).toBe("NOT PLAYED");
    expect(rePointsOf(records, "gen")).toHaveLength(14);
    // R-7: the measures carry the selection; a second recomputation from the filed words agrees, and a moved loss is named.
    const path = join(scratch, "step5b.json");
    writeFileSync(path, JSON.stringify(step5MeasuresOf(records, g, guard, ENV.fingerprint, [])));
    expect(reselectFromFile(path, FILED, AMEND)[0]).toMatch(/agrees with the record/);
    // R-7 (a) and the near-tie listing (fidelity F-4, code-tests F5): the fresh pass's bin counts against the first pass's.
    const lines = reselectFromFile(path, FILED, AMEND, RESELECT_VIEW_PIN, path);
    expect(lines).toContain(`  bin counts identical to the first pass's (${path}), 14 points on both curves and both sets`);
    expect(lines.at(-1)).toMatch(/^ {2}(no two scorable points within 1e-9 on set 1|within 1e-9: )/);
    const firstPath = join(scratch, "step5b-first.json");
    const first = JSON.parse(readFileSync(path, "utf8")) as { selection: { points: { point: string; pressured: Record<"1" | "2", { events: number; attempts: number }[]> }[] } };
    first.selection.points[2]!.pressured["2"][4]!.events += 1;
    writeFileSync(firstPath, JSON.stringify(first));
    expect(() => reselectFromFile(path, FILED, AMEND, RESELECT_VIEW_PIN, firstPath)).toThrow(new RegExp(`the fresh pass's bin counts differ from the first pass's: ${first.selection.points[2]!.point}'s pressured curve on set 2`));
    expect(() => reselectFromFile(path, FILED, AMEND, RESELECT_VIEW_PIN, join(scratch, "no-first.json"))).toThrow(/there is no first-pass records file/);
    const measures = JSON.parse(readFileSync(path, "utf8")) as { selection: { recorded: { pressured: { losses: { set1: number }[] } } } };
    measures.selection.recorded.pressured.losses[0]!.set1 += 1e-6;
    writeFileSync(path, JSON.stringify(measures));
    expect(() => reselectFromFile(path, FILED, AMEND)).toThrow(/the pressured curve's S:theta=7 set1/);
    expect(() => reselectInputOf({})).toThrow(/the records hold no selection/);
    expect(() => reselectFromFile(path, FILED, AMEND, "fnv1a:00000000")).toThrow(/not the pin fnv1a:00000000/);
  });

  it("grades F0's miss split with part 1's free runners earlier than M8's table (measurement M4), and refuses an unfiled guard clause", { timeout: 240_000 }, () => {
    const { file, guard } = preflightStep5("5b", FILED, AMEND);
    const f0 = (s: SeedSet, earlier: number): Step5Record => {
      const r = structuredClone(play("E0", s));
      const s3 = (r as unknown as { s3: { gen: { part1?: { earlier: number } } } }).s3.gen;
      expect(s3.part1, "E0's record folds part 1").toBeDefined();
      s3.part1!.earlier = earlier;
      return r;
    };
    const records: Step5RecordsBySet = new Map<ArmId, Partial<Record<SeedSet, Step5Record>>>([
      ["F0", { 1: f0(1, 3), 2: f0(2, 0) }],
      ["D1", { 1: play("E0", 1), 2: play("E0", 2) }],
    ]);
    const g = gradeStep5({ half: "5b", records, file, guard, step4: new Map() });
    const sack = g.sections.clauses.find((c) => c.id === "s5b.sack")!;
    expect(["PASS", "FAIL"]).toContain(sack.verdict);
    const covered = g.sections.clauses.filter((c) => c.arms[0] === "F0" && (c.verdict === "PASS" || c.verdict === "FAIL"));
    if (covered.some((c) => c.verdict === "FAIL")) {
      expect(g.sections.miss).toContain("free runners earlier than M8's table (part 1): F0 3, D1 beside 0");
      expect(g.sections.miss?.some((l) => l.includes("3 free runner(s) arrive earlier than M8's table"))).toBe(true);
    } else {
      throw new Error("the fixture's F0 should miss a covered row on the tiny corpus");
    }
    // Flat's direction against D1 (plan §7.3; fidelity F-8): F0 and D1 are the same record here, so every row is level.
    expect(g.sections.affected).toContain(`flat's direction against D1 (F0 minus D1, flat, set 1): ${["sack_rate", "hit_or_sack_rate", "release_distribution", "threat_creation_rate", "unblocked_pressures_per_100", "unblocked_share_of_hit_or_sack", "quick_pressure_share_by_origin"].map((row) => `${row} ${rowValueOf(play("E0", 1), row, "flat") === null ? "n/a" : "+0.00 (level)"}`).join("; ")}`);
    expect(g.sections.affected.some((l) => l.startsWith("beside the hit and sack figures, F0: flat set 1 time to throw "))).toBe(true);
    expect(g.sections.affected.some((l) => /^live-WON_REP CLEAN ticks on F0 \(set 1\): flat dropbacks with exactly one \S+%, PUSH ticks \S+; gen /.test(l))).toBe(true);
    // A guard clause the filing does not hold is refused by name, never skipped (measurement M7).
    const a = preflightStep5("5a", FILED, AMEND);
    const without = { ...a.file, bands: { ...a.file.bands, clauses: a.file.bands.clauses.filter((c) => c.id !== "s5a.int") } };
    const e = new Map<ArmId, Partial<Record<SeedSet, Step5Record>>>([["E0", { 1: play("E0", 1), 2: play("E0", 2) }], ["E9", { 1: play("E8", 1), 2: play("E8", 2) }]]);
    expect(() => gradeStep5({ half: "5a", records: e, file: without, guard: a.guard, fresh: { 1: play("E0", 1), 2: play("E0", 2) } })).toThrow(/the guard clause s5a\.int is not in the filing/);
  });

  it("runs 5a with an injected player into a scratch cache: plays, writes E0's second fresh play, reads the cache, then grades", { timeout: 240_000 }, () => {
    const parent = join(scratch, "run");
    const { guard } = preflightStep5("5a", FILED, AMEND);
    const fake = (id: ArmId, s: SeedSet): Step5Record => ({ ...play("E0", s), stamp: step3StampOf(id, s, ENV, guard.digest, TINY) });
    let fresh = 0;
    const opts = {
      half: "5a" as const,
      cacheParent: parent,
      filedPath: FILED,
      amendmentsPath: AMEND,
      env: ENV,
      corpus: TINY,
      gate: OPEN,
      play: fake,
      fresh: (s: SeedSet): Step5Record => {
        fresh += 1;
        return fake("E0", s);
      },
      report: join(scratch, "r5a.md"),
      out: join(scratch, "r5a.json"),
    };
    const first = runStep5(opts);
    const all = ["E0", "E2", "E3", "E4", "E5", "E6", "E7", "E8"].flatMap((id) => [`${id}.set1`, `${id}.set2`]);
    expect(first.played).toEqual(all);
    expect(fresh).toBe(2);
    expect(first.graded).toBe(true);
    expect(first.wrote).toEqual([opts.report, opts.out]);
    expect(readFileSync(opts.report, "utf8")).toMatch(/^# ADR-089 step 5a: the arms/);
    const second = runStep5(opts);
    expect(second.played).toEqual([]);
    expect(second.cached).toEqual(all);
    expect(fresh).toBe(2);
    // A shard's part alone does not grade.
    const { report: _r, out: _o, ...noWrites } = opts;
    const part = runStep5({ ...noWrites, cacheParent: join(scratch, "part"), arms: ["E0"] });
    expect(part.graded).toBe(false);
    expect(part.remaining).toHaveLength(14);
    expect(fresh).toBe(4);
    const m = JSON.parse(readFileSync(opts.out, "utf8")) as { format: string; half: string; outcome: object };
    expect(m.format).toBe("adr-089-step5-measures/v1");
    expect(m.half).toBe("5a");
    expect(Object.keys(m.outcome)).toEqual(["faults", "breaches", "misses"]);
  });

  it("without a stand-in, waits for E0's second fresh plays from the operator's process, then refuses one from another build", { timeout: 240_000 }, () => {
    const parent = join(scratch, "wait");
    const { guard } = preflightStep5("5a", FILED, AMEND);
    const fake = (id: ArmId, s: SeedSet): Step5Record => ({ ...play("E0", s), stamp: step3StampOf(id, s, ENV, guard.digest, TINY) });
    const lines: string[] = [];
    const opts = { half: "5a" as const, cacheParent: parent, filedPath: FILED, amendmentsPath: AMEND, env: ENV, corpus: TINY, gate: OPEN, play: fake, log: (l: string) => lines.push(l) };
    const first = runStep5(opts);
    expect(first.remaining).toEqual([]);
    expect(first.graded).toBe(false);
    const dir = join(parent, ENV.fingerprint);
    expect(first.awaitingFresh).toEqual([1, 2].map((s) => `pnpm --filter @ff/calibration pocket -- --step 5a --fresh-base ${String(s)} --gen-through-week 1 --out ${join(dir, `E0.set${String(s)}.fresh.json`)}`));
    expect(lines.join("\n")).toContain(first.awaitingFresh![1]!);
    writeFileSync(join(dir, "E0.set1.fresh.json"), JSON.stringify(fake("E0", 1)));
    expect(runStep5(opts).awaitingFresh).toHaveLength(1);
    writeFileSync(join(dir, "E0.set2.fresh.json"), JSON.stringify({ ...fake("E0", 2), stamp: step3StampOf("E0", 2, { ...ENV, fingerprint: "fnv1a:other" }, guard.digest, TINY) }));
    expect(() => runStep5(opts)).toThrow(/E0 set 2's second fresh play at .* is not this build's/);
    writeFileSync(join(dir, "E0.set2.fresh.json"), JSON.stringify(fake("E0", 2)));
    const graded = runStep5(opts);
    expect(graded.graded).toBe(true);
    expect(graded.awaitingFresh).toBeUndefined();
    expect(graded.grade!.sections.replay).toEqual(["E0 set 1, played fresh twice: identical (stream digests and records)", "E0 set 2, played fresh twice: identical (stream digests and records)"]);
  });
});

describe("R-7's command does not reach selection.ts", () => {
  it("no module reselectCommand.ts imports, directly or through another, is selection.ts", () => {
    const seen = new Set<string>();
    const walk = (f: string): void => {
      if (seen.has(f)) return;
      seen.add(f);
      for (const m of readFileSync(f, "utf8").matchAll(/^import[^;]*?from\s+"(\.[^"]+)"/gms)) walk(join(f, "..", m[1]!.replace(/\.js$/, ".ts")));
    };
    walk(join(PKG, "src/pocket/reselectCommand.ts"));
    expect([...seen].some((f) => f.endsWith("pocket/selection.ts"))).toBe(false);
    expect([...seen].some((f) => f.endsWith("pocket/reselect.ts"))).toBe(true);
  });
});
