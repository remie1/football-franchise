/**
 * ADR-089 step 3 — THE HARNESS (`src/pocket/step3.ts`; step-3 plan §2.10, §5.2 to §5.4 and §7;
 * plan §9 commit 14).
 *
 *  - the refusals before anything plays: the filing; the amendments file (whole, under its pin) and
 *    its step-3 view holding AM-1 and AM-2; and, for a run that grades, a filed guard map at step 3
 *    (AM-3). The committed file holds no AM-3, so a grading run REFUSES by name, with nothing played
 *    and no cache made; `--part1` and `--digests` are previews and play without it. The tests that
 *    need AM-3 append a stand-in entry (AM-3's draft, `AM3_STAND_IN` below) to a temporary copy of
 *    the committed file and pin that copy; the committed file is only read;
 *  - the map's own checks (only step 3's playable arms, each against this build's base), the stamp
 *    (the step-3 view's digest; a preview's records are refused by a grading run), the plan (C14
 *    refused by its reason, C6 played) and the run lists;
 *  - the pure readings: the binomial SE, "not resolved by two seed sets", the miss rule's step-3
 *    split (the bin's supply reason only when the bin missed; an empty class unclassed), the alone
 *    arms' paired gap, the first free-runner arrival, and Q-3's stamp-free projection on step 2's
 *    committed records;
 *  - real arms on a cut corpus (C1, B3): the s3 folds on the pocket-1.s3 arm and not on the base,
 *    M2 STREAM not folded on the s3 arm, C1's mirrored corpora (M5, the exact free-run mirror), the
 *    composition cells adding to the guard's class rows, a re-played base equal to step 2's own
 *    record on Q-3's projection, determinism, and no clock, host or path field;
 *  - grading synthetic records (the cut-corpus records re-stamped and edited): a pass, a graded
 *    miss with its miss reading, "not resolved by two seed sets", an AM-3 breach (and an information
 *    arm's, which is not one), a structural failure, Q-3 against a moved reference, one seed set, a
 *    missing target, a cut corpus, the amendments-stamp refusal, and the report;
 *  - the run through its `play` seam: shards that grade once every target is cached and write the
 *    same bytes, the one-arm `--out`, a preview's cache refused by a grading run, a committed report
 *    refused from a dirty tree, and `--part1` (its arms, its faults);
 *  - R-1: the digests' pin check on the pins, A1's real folds through it, a C arm's stamp and its
 *    unstripped fold; and the closed records no step-3 command writes over.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, amendmentsDigestAtStep, loadAmendments, STEP2_AMENDMENTS_DIGEST } from "../src/pocket/amendments.js";
import { armById, armRefusal, STEP2_ARM_IDS, STEP3_ARM_IDS, STEP3_RUN_IDS, type ArmId } from "../src/pocket/arms.js";
import { FILED_PATH, GUARD_CLASSES } from "../src/pocket/bands.js";
import { SEED_SETS, type SeedSet } from "../src/pocket/corpus.js";
import { loadFiled, STEP0_FILED_DIGEST, type FiledFile } from "../src/pocket/filed.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import type { MissSplit } from "../src/pocket/missRule.js";
import { part1Problems } from "../src/pocket/part1.js";
import { LEAGUES, waitLiteralText } from "../src/pocket/report.js";
import { POCKET_1_S3_FREE_RUN, POCKET_1_S3_RULES, S3_IN_CONTRACTS } from "../src/pocket/rules.js";
import { pictureOptionsOf } from "../src/caller/frozen.js";
import { POCKET_1_S1_BASE_PINS } from "../src/pocket/s1BasePins.js";
import { POCKET_1_S1_PINS } from "../src/pocket/s1Pins.js";
import { POCKET_1_S2_PINS } from "../src/pocket/s2Pins.js";
import { emptyS2Folds } from "../src/pocket/s2Stream.js";
import { s3Problems } from "../src/pocket/s3Stream.js";
import { FULL_CORPUS, jsonText, type Step1Corpus, type Step1Env } from "../src/pocket/step1.js";
import { packS2Folds, playStep2Arm } from "../src/pocket/step2.js";
import {
  am3Refusal,
  checkFilingForStep3,
  classifyStep3Miss,
  closedStep3Writes,
  firstFreeRunnerTenths,
  gradeStep3,
  isS3Arm,
  loadStep2References,
  notResolvedBySets,
  pairedEtaGap,
  planStep3,
  playStep3Arm,
  preflightStep3,
  preflightStep3Previews,
  q3Problems,
  q3Projection,
  renderStep3Report,
  runStep3,
  runStep3Digests,
  runStep3Part1,
  addWaitLiteral,
  emptyWaitLiteralFold,
  s3PictureRefusal,
  shareSE,
  STEP3_ARM_FORMAT,
  STEP3_BASE_IDS,
  STEP3_DIGEST_ARMS,
  STEP3_DIGESTS_FORMAT,
  STEP3_M5_ARM,
  STEP3_MEASURES_FORMAT,
  STEP3_PART1_IDS,
  STEP3_PLAYABLE,
  STEP3_PLAYABLE_RUN_IDS,
  STEP3_RECORDS_FORMAT,
  step3DigestPinProblems,
  step3Groups,
  step3MeasuresOf,
  step3StampOf,
  type PlayStep3Options,
  type Step2References,
  type Step3DigestsResult,
  type Step3Grade,
  type Step3Guard,
  type Step3Record,
  type Step3Records,
  unmadeChoicesOf,
} from "../src/pocket/step3.js";
import type { Dropback } from "../src/pocket/throwClass.js";

const PKG = resolve(import.meta.dirname, "..");
const FILED = join(PKG, FILED_PATH);
const AMENDMENTS = join(PKG, AMENDMENTS_PATH);
const TINY: Step1Corpus = { flatFirst: 1, genThroughWeek: 1 };
const ENV: Step1Env = { fingerprint: "0123456789abcdef", commit: "c".repeat(40), dirty: false, node: "v22.0.0-test" };

type W<T> = T extends readonly (infer U)[] ? W<U>[] : T extends object ? { -readonly [K in keyof T]: W<T[K]> } : T;
const clone = <T>(x: T): W<T> => structuredClone(x) as W<T>;

const scratch: string[] = [];
function tempDir(label: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ff-step3-${label}-`));
  scratch.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/**
 * AM-3's draft as the step-3 plan's reviser wrote it (the guard's base map at step 3; ADR-089
 * Appendix G, G.9), standing in for the entry stream A files. Only these tests read it, appended to
 * a temporary copy of the committed amendments file; nothing here is filed.
 */
const AM3_STAND_IN = {
  id: "AM-3",
  name: "the guard at step 3: the design, its pricing arm and reading (c) against step 2's arms",
  filedBeforeStep: "3",
  steps: ["3"],
  supersedes: ["guard.mix", "guard.byClass"],
  untouched: ["acc.intGuard", "s4.motion.int", "s5a.int"],
  defaults: ["D9", "D28"],
  adrLines: [1306, 1308],
  cites: [943, 1030, 1287, 1159, 1036, 1053],
  record: "ADR-089 Appendix G, G.9",
  reason: "a stand-in for AM-3 in the tests only: C1 against B3, C2 against B6 and C11 against B3, as the step-3 plan's §4.2 maps them",
  ownersWord: null,
  rule: {
    base: "previousStepArm",
    pricingBase: "previousStepPricingArm",
    bases: { "3": { C1: "B3", C2: "B6", C11: "B3" } },
    laterBases: "filed as a named entry before that step's arms run",
    gradedArms: "every arm in the step's map",
    replayMustEqualPreviousRecords: true,
    allowance: "filed",
    se: "binomialIndependent",
    statistic: "pooledZ",
    seedSets: [1, 2],
    zLeague: 2.0,
    zClass: 3.0,
    breachIf: "greaterThan",
    zSetSE0: 0,
    classes: "GUARD_CLASSES",
    reportedSplits: { DESPERATION: ["DIRTY", "CLEAN"] },
    dirtyPocket: "lastStatusAtOrBeforeRelease",
    onCompositionClassBreach: ["DESPERATION", "CHECKDOWN"],
    reportFiledReading: true,
    reportMinimumExcess: true,
    reportPairedSE: true,
    cumulative: { design: "A0", pricing: "A14", graded: false },
    acceptedState: { design: "A1", pricing: "A11", fromStep: "3", graded: false },
  },
} as const;

type AmendmentsJson = Record<string, unknown> & { entries: Record<string, unknown>[] };
const committedAmendments = (): AmendmentsJson => JSON.parse(readFileSync(AMENDMENTS, "utf8")) as AmendmentsJson;
const committedFiling = (): FiledFile => loadFiled(FILED);

let written = 0;
/** A temporary copy of the committed amendments file with AM-3's stand-in appended (edited by `edit`); its path and the whole file's pin. */
function withAm3(dir: string, edit?: (am3: Record<string, unknown>, json: AmendmentsJson) => void): { path: string; pin: string } {
  const json = committedAmendments();
  const am3 = clone(AM3_STAND_IN) as unknown as Record<string, unknown>;
  edit?.(am3, json);
  json.entries.push(am3);
  written += 1;
  const path = join(dir, `amendments-${String(written)}.json`);
  writeFileSync(path, jsonText(json));
  return { path, pin: amendmentsDigest(json) };
}
const mapOf = (am3: Record<string, unknown>): Record<string, Record<string, string>> => (am3["rule"] as { bases: Record<string, Record<string, string>> }).bases;

const AM3_DIR = mkdtempSync(join(tmpdir(), "ff-step3-am3-"));
scratch.push(AM3_DIR);
const AM3 = withAm3(AM3_DIR);
const am3Guard = (): Step3Guard => preflightStep3(FILED, AM3.path, AM3.pin).guard;
/** The step-3 view's digest of the committed file (no AM-3): what a preview's records are stamped with. */
const previewDigest = (): string => amendmentsDigest(amendmentsAtStep(loadAmendments(AMENDMENTS, committedFiling()), "3"));

// --- the refusals ------------------------------------------------------------------------------------------

describe("the refusals before anything plays (plan §2.10, §4.2)", () => {
  it("passes the committed filing and amendments for a preview: the step-3 view holds AM-1 and AM-2, and its digest is the stamp", () => {
    const v = preflightStep3Previews(FILED, AMENDMENTS);
    expect(v.view.entries.map((e) => e.id)).toEqual(["AM-1", "AM-2"]);
    expect(v.digest).toBe(previewDigest());
    expect(v.am2).toBe("AM-2 (ADR-089 Appendix G, G.8)");
    expect(v.file.bands.clauses.some((c) => c.step === "3")).toBe(true);
  });

  it("REFUSES to grade while AM-3 is not filed (guardFor(view, \"3\") throws), naming AM-3, G.9 and the previews rule", () => {
    expect(() => preflightStep3(FILED, AMENDMENTS)).toThrow(
      /^ADR-089 step 3: refused to grade: AM-3 \(the guard's base map at step 3, ADR-089 Appendix G, G\.9; step-3 plan §4\.2\) is not filed in the amendments file's step-3 view: ADR-089: no filed amendment maps step 3's guard bases; a step's guard reads only a base map filed before its arms run \(AM-1 §4\.3\)\. Nothing has played/,
    );
    expect(am3Refusal("why")).toMatch(/: why\. Nothing has played and no cache was made\. Runs before AM-3 are previews \(AM-2's previews rule\): --part1 and --digests play without it; nothing they print is graded, priced or offered$/);
  });

  it("runStep3 refuses before anything plays and before any cache is made, whatever arms, shard or set it is given", () => {
    const dir = tempDir("noam3");
    let played = 0;
    const play = (): Step3Record => {
      played += 1;
      throw new Error("must not play");
    };
    for (const extra of [{}, { arms: ["C1"] as ArmId[] }, { shard: { index: 1, count: 3 } }, { seedSet: 2 as SeedSet }]) {
      const cacheParent = join(dir, "cache");
      expect(() => runStep3({ cacheParent, filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, play, ...extra })).toThrow(/^ADR-089 step 3: refused to grade: AM-3 /);
      expect(existsSync(cacheParent)).toBe(false);
    }
    expect(played).toBe(0);
  });

  it("refuses a filing that leaves an s3 or guard field pending, then one that is not the committed filing", () => {
    expect(() => checkFilingForStep3(committedFiling())).not.toThrow();
    const pending = clone(committedFiling());
    const i = pending.bands.clauses.findIndex((c) => c.id === "s3.quick");
    (pending.bands.clauses[i] as unknown as Record<string, unknown>)["hi"] = { pending: "M1" };
    expect(() => checkFilingForStep3(pending as unknown as FiledFile)).toThrow(new RegExp(`bands\\.clauses\\.${String(i)}\\.hi pending; every s3 and guard field must be filed first`));
    const changed = clone(committedFiling());
    changed.bands.clauses[0]!.text = `${changed.bands.clauses[0]!.text} `;
    expect(() => checkFilingForStep3(changed as unknown as FiledFile)).toThrow(new RegExp(`digests to fnv1a:[0-9a-f]{8}, not ${STEP0_FILED_DIGEST}`));
  });

  it("refuses a missing amendments file, a changed one under the committed pin, and a step-3 view without AM-2", () => {
    const dir = tempDir("pre");
    expect(() => preflightStep3Previews(FILED, join(dir, "none.json"))).toThrow(/^ADR-089 step 3: refused before anything plays: the amendments file .*none\.json does not exist/);
    const json = committedAmendments();
    json.entries[0]!["reason"] = "changed";
    const touched = join(dir, "touched.json");
    writeFileSync(touched, jsonText(json));
    expect(() => preflightStep3Previews(FILED, touched)).toThrow(/refused before anything plays: ADR-089: the amendments file .* digests to fnv1a:[0-9a-f]{8}, not the pin fnv1a:/);
    const noAm2 = committedAmendments();
    noAm2.entries = noAm2.entries.filter((e) => e["id"] !== "AM-2");
    const path = join(dir, "no-am2.json");
    writeFileSync(path, jsonText(noAm2));
    expect(() => preflightStep3Previews(FILED, path, amendmentsDigest(noAm2))).toThrow(/refused before anything plays: the amendments file's step-3 view holds no AM-2/);
  });
});

describe("AM-3 on a temporary copy (its stand-in): the guard step 3 grades with", () => {
  it("hands the grading AM-3's map, AM-1's lines, the cumulative line and the accepted state; step 2's view does not move", () => {
    const g = am3Guard();
    expect(g).toEqual({
      digest: amendmentsDigestAtStep(loadAmendments(AM3.path, committedFiling()), "3"),
      entry: "AM-3",
      record: "ADR-089 Appendix G, G.9",
      am2: "AM-2 (ADR-089 Appendix G, G.8)",
      bases: { C1: "B3", C2: "B6", C11: "B3" },
      lines: { zLeague: 2, zClass: 3, zSetSE0: 0 },
      cumulative: { design: "A0", pricing: "A14" },
      accepted: { design: "A1", pricing: "A11" },
    });
    for (const [id, base] of Object.entries(g.bases)) expect(armById(id as ArmId).base, id).toBe(base);
    // The step-3 view moves with AM-3, so a preview's records (stamped before AM-3) are not this view's.
    expect(g.digest).not.toBe(previewDigest());
    expect(amendmentsDigestAtStep(loadAmendments(AM3.path, committedFiling()), "2")).toBe(STEP2_AMENDMENTS_DIGEST);
    // Under the committed pin the copy is refused: an amendment moves the pin with it.
    expect(() => preflightStep3(FILED, AM3.path)).toThrow(/refused before anything plays: ADR-089: the amendments file .* digests to fnv1a:[0-9a-f]{8}, not the pin /);
  });

  it("refuses a map naming an arm step 3 does not grade, an arm this build does not play, or another base than the arm's", () => {
    const dir = tempDir("map");
    const refused = (bases: Record<string, string>): string => {
      const { path, pin } = withAm3(dir, (am3) => { mapOf(am3)["3"] = bases; });
      try {
        preflightStep3(FILED, path, pin);
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
      return "no refusal";
    };
    expect(refused({ C1: "B3", B1: "A1" })).toMatch(/^ADR-089 step 3: refused before anything plays: AM-3's step-3 base map names B1, which step 3 does not grade \(its arms are C1 to C16\)$/);
    expect(refused({ C1: "B3", C14: "B5" })).toBe(`ADR-089 step 3: refused before anything plays: AM-3's step-3 base map grades C14, which this build does not play: ${armRefusal("C14") ?? "?"}`);
    expect(refused({ C1: "B6", C2: "B6" })).toBe("ADR-089 step 3: refused before anything plays: AM-3's step-3 base map reads C1 against B6, and this build's arm against B3");
    expect(refused({ C1: "B3", C6: "B3" })).toBe("no refusal");
  });

  it("an AM-3 filed before step 4 is not in step 3's view: still refused by name", () => {
    const dir = tempDir("late");
    const { path, pin } = withAm3(dir, (am3) => {
      am3["filedBeforeStep"] = "4";
      am3["steps"] = ["4"];
      mapOf(am3)["4"] = mapOf(am3)["3"]!;
      delete mapOf(am3)["3"];
    });
    expect(() => preflightStep3(FILED, path, pin)).toThrow(/^ADR-089 step 3: refused to grade: AM-3 /);
    expect(preflightStep3Previews(FILED, path, pin).digest).toBe(previewDigest());
  });

  it("review MEAS-S6: refuses a step-3 view whose entry still holds a choice not yet made (<a | b>); AM-1 and AM-2 hold none", () => {
    expect(unmadeChoicesOf(preflightStep3Previews(FILED, AMENDMENTS).view)).toEqual([]);
    const dir = tempDir("choice");
    const { path, pin } = withAm3(dir, (am3) => {
      am3["reason"] = "C1 reads <the picture as ruled, the Mug worn | the Mug's Head-only picture>; the rest as the plan maps it";
    });
    expect(() => preflightStep3(FILED, path, pin)).toThrow(
      "ADR-089 step 3: refused before anything plays: the amendments file's step-3 view holds a choice not yet made: AM-3.reason holds the choice <the picture as ruled, the Mug worn | the Mug's Head-only picture>. An entry is filed with its choice made",
    );
    // A made choice, or a bare bar outside angle brackets, is not one.
    const made = withAm3(dir, (am3) => { am3["reason"] = "C1 reads the picture as ruled, the Mug worn (S3 granted) | noted"; });
    expect(preflightStep3(FILED, made.path, made.pin).guard.entry).toBe("AM-3");
  });

  it("review FID-F-1: while S3 is not in contracts and the design picture is AS_RULED, a graded run and R-1's digests refuse any pocket-1.s3 arm before anything plays", () => {
    expect(S3_IN_CONTRACTS).toBe(false);
    expect(POCKET_1_S3_FREE_RUN.picture).toBe("AS_RULED");
    expect(s3PictureRefusal(["A1", "B3", "C13"])).toBeUndefined();
    expect(s3PictureRefusal(["C1", "C13", "C1", "C2"])).toMatch(/^ADR-089 step 3: refused before anything plays: C1, C2 play pocket-1\.s3, whose design picture is AS_RULED .* S3 is not in contracts \(S3_IN_CONTRACTS, src\/pocket\/rules\.ts\)\. .*Nothing has played and no cache was made; --part1 still plays/);
    expect(s3PictureRefusal(["C1"], true)).toBeUndefined();
    const dir = tempDir("s3");
    const cacheParent = join(dir, "cache");
    let played = 0;
    const play = (): Step3Record => {
      played += 1;
      throw new Error("must not play");
    };
    expect(() => runStep3({ cacheParent, filedPath: FILED, amendmentsPath: AM3.path, amendmentsPin: AM3.pin, env: ENV, play, references: new Map(), arms: ["C1"], seedSet: 1 })).toThrow(/^ADR-089 step 3: refused before anything plays: C1 plays pocket-1\.s3/);
    expect(() => runStep3({ cacheParent, filedPath: FILED, amendmentsPath: AM3.path, amendmentsPin: AM3.pin, env: ENV, play, references: new Map() })).toThrow(/^ADR-089 step 3: refused before anything plays: C1, C2, .* play pocket-1\.s3/);
    expect(() => runStep3Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v-test", first: 1, arms: ["A1", "C3"] })).toThrow(/^ADR-089 step 3: refused before anything plays: C3 plays pocket-1\.s3/);
    expect(() => runStep3Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v-test", first: 1 })).toThrow(/^ADR-089 step 3: refused before anything plays: C1, C2, /);
    expect(played).toBe(0);
    expect(existsSync(cacheParent)).toBe(false);
  });

  it("review FID-F-4 tripwire: C10 and C16 (no free-run block) draw the picture C1 draws; if the design picture flips this fails", () => {
    expect(pictureOptionsOf(armById("C10").tunables)).toEqual(pictureOptionsOf(armById("C1").tunables));
    expect(pictureOptionsOf(armById("C16").tunables)).toEqual(pictureOptionsOf(armById("C1").tunables));
  });
});

// --- the run lists, the stamp and the plan --------------------------------------------------------------------

describe("the run lists, the stamp and the plan (plan §5.1)", () => {
  it("plays C1 to C16 less C14 (P17), C6 among them; C13 alone of them plays pocket-1.s2; the bases are the seven re-played", () => {
    expect(STEP3_PLAYABLE).toEqual(STEP3_ARM_IDS.filter((id) => id !== "C14"));
    expect(STEP3_PLAYABLE).toContain("C6");
    expect(armRefusal("C14")).toMatch(/^C14 waits on petition P17/);
    expect(STEP3_PLAYABLE_RUN_IDS).toEqual(STEP3_RUN_IDS.filter((id) => id !== "C14"));
    expect(STEP3_BASE_IDS).toEqual(["A0", "A14", "A1", "A11", "B3", "B6", "B5"]);
    expect(STEP3_PART1_IDS).toEqual(STEP3_PLAYABLE.filter((id) => id !== "C13"));
    expect(STEP3_PLAYABLE.filter((id) => !isS3Arm(id))).toEqual(["C13"]);
    expect(STEP3_DIGEST_ARMS).toEqual([...STEP3_PLAYABLE, "A1", "A5", "A11", ...STEP2_ARM_IDS]);
    expect(STEP3_M5_ARM).toBe("C1");
    // Each playable C arm is in exactly one group, with the base it reads.
    const groups = step3Groups();
    expect(groups.map((g) => g.base)).toEqual(STEP3_BASE_IDS);
    expect(groups.flatMap((g) => g.arms).sort()).toEqual([...STEP3_PLAYABLE].sort());
    for (const g of groups) for (const id of g.arms) expect(armById(id).base, id).toBe(g.base);
  });

  it("stamps step 1's stamp with the step-3 view's digest", () => {
    const s = step3StampOf("C1", 2, ENV, "fnv1a:12345678", TINY);
    expect(s).toMatchObject({ arm: "C1", seedSet: 2, amendments: "fnv1a:12345678", rules: POCKET_1_S3_RULES, corpus: TINY, fingerprint: ENV.fingerprint });
    expect(step3StampOf("C13", 1, ENV, "x").rules).toBe("pocket-1.s2");
    expect(step3StampOf("B3", 1, ENV, "x").corpus).toEqual(FULL_CORPUS);
  });

  it("plans every playable target on both sets, shards every n-th, and refuses C14 by its reason", () => {
    const all = planStep3({});
    expect(all.targets).toHaveLength(2 * STEP3_PLAYABLE_RUN_IDS.length);
    expect(all.targets.slice(0, 4)).toEqual([{ id: "A0", seedSet: 1 }, { id: "A0", seedSet: 2 }, { id: "A14", seedSet: 1 }, { id: "A14", seedSet: 2 }]);
    expect(all.complete).toEqual(all.targets);
    expect(all.targets.some((t) => t.id === "C14")).toBe(false);
    const shards = [1, 2, 3].map((index) => planStep3({ shard: { index, count: 3 } }).mine);
    expect(shards.flat().length).toBe(all.targets.length);
    expect(new Set(shards.flat().map((t) => `${t.id}.${String(t.seedSet)}`)).size).toBe(all.targets.length);
    expect(planStep3({ arms: ["C2", "C1"], seedSet: 2 })).toEqual({ targets: [{ id: "C1", seedSet: 2 }, { id: "C2", seedSet: 2 }], complete: [{ id: "C1", seedSet: 2 }, { id: "C2", seedSet: 2 }], mine: [{ id: "C1", seedSet: 2 }, { id: "C2", seedSet: 2 }], oneSet: 2 });
    expect(() => planStep3({ arms: ["C1", "C14"] })).toThrow(new RegExp(`^--arms: C14 is not playable: C14 waits on petition P17`));
    expect(() => planStep3({ arms: ["A5"] })).toThrow(/--arms: A5 is not in this run/);
    expect(() => planStep3({ arms: ["C1", "C1"] })).toThrow(/names an arm twice/);
    expect(() => planStep3({ shard: { index: 4, count: 3 } })).toThrow(/--shard takes i\/n/);
  });
});

// --- the pure readings ------------------------------------------------------------------------------------------

describe("the readings (plan §5.2, §7; critique 4 S4-8, S4-14)", () => {
  it("shareSE is the binomial SE in points", () => {
    expect(shareSE(50, 100)).toBeCloseTo(5, 12);
    expect(shareSE(20, 400)).toBeCloseTo(2, 12);
    expect(shareSE(null, 10)).toBeNull();
    expect(shareSE(10, 0)).toBeNull();
  });

  it("not resolved by two seed sets: the other set across the line and within 2 SE of it", () => {
    const hi = { hi: 29.4 };
    expect(notResolvedBySets(28, 30, 1, hi)).toBe(true);
    expect(notResolvedBySets(28, 31.4, 1, hi)).toBe(true);
    expect(notResolvedBySets(28, 31.5, 1, hi)).toBe(false);
    expect(notResolvedBySets(28, 29, 0.1, hi)).toBe(false);
    expect(notResolvedBySets(30, 29, 1, hi)).toBe(true);
    expect(notResolvedBySets(28, null, 1, hi)).toBe(false);
    expect(notResolvedBySets(28, 30, null, hi)).toBe(false);
    const band = { lo: 30, hi: 55 };
    expect(notResolvedBySets(31, 29, 1, band)).toBe(true);
    expect(notResolvedBySets(54, 56, 1, band)).toBe(true);
    expect(notResolvedBySets(40, 20, 1, band)).toBe(false);
  });

  const split = (over: Partial<MissSplit>, rows: Record<string, boolean>): MissSplit => ({
    grid: "TICK", bin20NoFreeRunner: 20, freeRunnerShareOf20: 30, quick: 40, quickNoFreeRunner: 40, unblockedPressuresPer100: 10, unblockedShareOfHitOrSack: 30,
    freeRunnersEarlierThanM8: 0, hitOrSackInBand: false, sacksShort: false, shareShort: false,
    rows: Object.entries(rows).map(([clause, passed]) => ({ clause, value: 0, passed })),
    ...over,
  });
  const ALL_PASS = { "s3.bin20.tick": true, "s3.quick": true, "s3.unblockedPressures": true, "s3.unblockedShare": true };

  it("classifies a step-3 miss with the bin's supply reason only when the bin missed (AM-2), and names an empty class unclassed", () => {
    expect(classifyStep3Miss(split({}, ALL_PASS))).toEqual({ missed: [], classes: [] });
    // The bin missed: its supply reason stands.
    const bin = classifyStep3Miss(split({}, { ...ALL_PASS, "s3.bin20.tick": false }));
    expect(bin.missed).toEqual(["s3.bin20.tick"]);
    expect(bin.classes).toEqual([{ class: "SUPPLY", because: [expect.stringMatching(/^the 2\.0 s bin passes without a free runner \(n 20(\.0+)? <= L 29\.4/)] }]);
    // The quick share missed, the bin passed: the bin's reason is dropped, the quick share's stays.
    const quick = classifyStep3Miss(split({ quick: 60 }, { ...ALL_PASS, "s3.quick": false }));
    expect(quick.classes).toEqual([{ class: "SUPPLY", because: [expect.stringMatching(/^the quick-pressure share fails \(60(\.0+)?\) while it passes with no free runner/)] }]);
    // Timing alone once the bin's reason is dropped.
    const timing = classifyStep3Miss(split({ quick: 60, quickNoFreeRunner: 60 }, { ...ALL_PASS, "s3.quick": false }));
    expect(timing.classes.map((c) => c.class)).toEqual(["TIMING"]);
    // Only the bin's reason held, and the bin passed: unclassed.
    const none = classifyStep3Miss(split({}, { ...ALL_PASS, "s3.unblockedShare": false }));
    expect(none).toEqual({ missed: ["s3.unblockedShare"], classes: [{ class: "UNCLASSED", because: ["s3.unblockedShare missed with none of (i) to (iii) holding"] }] });
    // AM-2's free-runner key: a man earlier than M8's table is a timing reason.
    expect(classifyStep3Miss(split({ freeRunnersEarlierThanM8: 2 }, { ...ALL_PASS, "s3.unblockedShare": false })).classes).toEqual([{ class: "TIMING", because: ["2 free runner(s) arrive earlier than M8's table"] }]);
  });

  it("the alone arms' gap: ratio means in seconds, paired by game, its SE by the delta method", () => {
    const g = pairedEtaGap([{ arm: ["30/2", "40/2"], base: ["20/2", "20/2"] }]);
    expect(g.games).toBe(2);
    expect(g.armMean).toBeCloseTo(1.75, 12);
    expect(g.baseMean).toBeCloseTo(1.0, 12);
    expect(g.gap).toBeCloseTo(0.75, 12);
    expect(g.se).toBeCloseTo(0.25, 12);
    // Two sets pool their games; a lone game has no SE; no free runner on either side has no mean.
    expect(pairedEtaGap([{ arm: ["30/2"], base: ["20/2"] }, { arm: ["40/2"], base: ["20/2"] }])).toEqual(g);
    expect(pairedEtaGap([{ arm: ["30/2"], base: ["20/2"] }]).se).toBeNull();
    expect(pairedEtaGap([{ arm: ["0/0"], base: ["20/2"] }])).toEqual({ armMean: null, baseMean: null, gap: null, se: null, games: 1 });
  });

  it("the first free-runner arrival: the earliest first-published etaTick of a man not on a won rep, in tenths", () => {
    const t = (rusher: string, origin: string, etaTick: number): unknown => ({ tick: 0.5, rusher, alignment: "EDGE", origin, rollRef: "r", etaTick, state: "RUSHING" });
    const d = (threats: unknown[]): Dropback => ({ threats } as unknown as Dropback);
    expect(firstFreeRunnerTenths(d([t("a", "WON_REP", 1.0), t("b", "FREE_RUNNER", 2.34), t("b", "FREE_RUNNER", 1.5), t("c", "CLOCK_RUNNER", 2.6)]))).toBe(23);
    expect(firstFreeRunnerTenths(d([t("a", "WON_REP", 1.0)]))).toBeUndefined();
  });

  it("review FID-F-2: the literal Wait count is the untouched men published earlier than the filed table; the later and the same are beside, not counted", () => {
    const fold = emptyWaitLiteralFold();
    const r = (published: number, eta: number, row: string, untouched = true) => ({ untouched, published, eta, row });
    addWaitLiteral(fold, [r(1.6, 1.8, "WIDE_9"), r(2.4, 2.0, "SLOT"), r(1.94, 1.9, "SLOT"), r(1.2, 2.0, "TOUCHED", false), r(1.0, 1.3, "WIDE_9")]);
    expect(fold).toEqual({ men: 4, sooner: 2, later: 1, same: 1, byRow: { WIDE_9: 2 } });
    expect(waitLiteralText(fold)).toBe("2 of 4 D19 men earlier than the filed Wait table (WIDE_9 2); later 1, same 1");
  });
});

describe("Q-3's projection on step 2's committed records (plan §5.1)", () => {
  const refs = loadStep2References();

  it("reads both seed sets of the seven re-played bases from reports/adr-089-step2.json", () => {
    expect([...refs.keys()]).toEqual(STEP3_BASE_IDS.flatMap((id) => [`${id}.set1`, `${id}.set2`]));
  });

  it("is equal on itself, moved by a projected field, blind to the format, the stamp, s3 and m5", () => {
    const b3 = refs.get("B3.set1")!;
    expect(q3Problems(b3, b3)).toEqual([]);
    expect(q3Problems(refs.get("B3.set2")!, b3)).toContain("measures");
    const r = clone(b3) as Record<string, unknown> & { measures: { gen: { pressure: number } } };
    r["format"] = STEP3_ARM_FORMAT;
    r["stamp"] = step3StampOf("B3", 1, ENV, "fnv1a:00000000");
    r["s3"] = { flat: {}, gen: {} };
    r["m5"] = {};
    expect(q3Problems(r, b3)).toEqual([]);
    expect(Object.keys(q3Projection(r))).not.toContain("s3");
    r.measures.gen.pressure += 0.01;
    expect(q3Problems(r, b3)).toEqual(["measures"]);
    const s2 = clone(b3) as Record<string, unknown>;
    delete s2["s2"];
    expect(q3Problems(s2, b3)).toEqual(["s2"]);
  });
});

// --- real arms on a cut corpus -----------------------------------------------------------------------------------

let c1: Step3Record | undefined;
let c1Again: Step3Record | undefined;
let b3: Step3Record | undefined;
let b3Step2: object | undefined;

beforeAll(() => {
  c1 = playStep3Arm("C1", 1, ENV, { corpus: TINY, amendments: "fnv1a:00000001" });
  c1Again = playStep3Arm("C1", 1, ENV, { corpus: TINY, amendments: "fnv1a:00000001" });
  b3 = playStep3Arm("B3", 1, ENV, { corpus: TINY, amendments: "fnv1a:00000001" });
  b3Step2 = playStep2Arm("B3", 1, ENV, { corpus: TINY });
}, 300_000);

describe("real arms on a cut corpus (C1, B3)", () => {
  it("C1 carries the s3 folds clean on both leagues, M2 STREAM not folded; B3 carries none of them and its M2 STREAM", () => {
    const r = c1!;
    expect(r.format).toBe(STEP3_ARM_FORMAT);
    expect(r.stamp).toEqual(step3StampOf("C1", 1, ENV, "fnv1a:00000001", TINY));
    const emptyM2 = jsonText(packS2Folds(emptyS2Folds()).m2);
    for (const l of LEAGUES) {
      const L = r.s3[l];
      expect(L.part1, l).not.toBeNull();
      expect(part1Problems(L.part1!), l).toEqual([]);
      expect(L.part1!.part1.checked, l).toBeGreaterThan(0);
      expect(L.part1!.monotone.men, l).toBeGreaterThan(0);
      expect(L.lateBlock !== null && L.census !== null).toBe(true);
      expect(s3Problems({ lateBlock: L.lateBlock!, census: L.census! }), l).toEqual([]);
      const w = L.waitLiteral!;
      expect(w.sooner + w.later + w.same, l).toBe(w.men);
      expect(Object.values(w.byRow).reduce((a, b) => a + b, 0), l).toBe(w.sooner);
      console.log(`C1 cut corpus ${l}: the literal Wait count ${JSON.stringify(w)}`);
      expect(jsonText(r.s2[l].m2), l).toBe(emptyM2);
      expect(jsonText(b3!.s2[l].m2), l).not.toBe(emptyM2);
      expect(b3!.s3[l]).toMatchObject({ lateBlock: null, census: null, part1: null, waitLiteral: null });
      for (const x of [r, b3!]) {
        expect(x.s3[l].freeRunnerEta).toHaveLength(x.measures[l].games);
        expect(x.s3[l].freeRunnerEta.every((s) => /^\d+\/\d+$/.test(s))).toBe(true);
        expect(x.s3[l].missSplit.counts.dropbacks).toBe(x.measures[l].dropbacks);
      }
    }
    expect({ flat: r.measures.flat.games, gen: r.measures.gen.games }).toEqual({ flat: 1, gen: 16 });
  });

  it("C1 plays its corpora mirrored for M5, and the free-run mirror is exact; no other arm does", () => {
    for (const l of LEAGUES) {
      const m = c1!.m5![l];
      expect(m.unmirrored).toHaveLength(c1!.measures[l].games);
      expect(m.mirrored).toHaveLength(c1!.measures[l].games);
      expect(m.freeRunMirror.exact, l).toBe(true);
      expect(m.freeRunMirror.menCompared, l).toBeGreaterThan(0);
      expect(m.unmirrored.every((g) => !("freeRun" in g))).toBe(true);
    }
    expect(b3!.m5).toBeUndefined();
  });

  it("the composition cells of each guard class add to that class's aimed throws and interceptions in the guard's rows", () => {
    for (const r of [c1!, b3!]) {
      for (const l of LEAGUES) {
        for (const cls of GUARD_CLASSES) {
          const cells = Object.values(r.s3[l].composition[cls] ?? {});
          const row = r.report.intGuard[l].byClass[cls]!;
          expect([cells.reduce((a, c) => a + c.aimed, 0), cells.reduce((a, c) => a + c.interceptions, 0)], `${r.stamp.arm} ${l} ${cls}`).toEqual([row.aimedByBin.reduce((a, b) => a + b, 0), row.interceptions]);
        }
        for (const cells of Object.values(r.s3[l].composition)) for (const k of Object.keys(cells)) expect(k).toMatch(/^(none|\d+\.\d)\|(THREAT|COUNT|STATUS|NONE)$/);
      }
    }
  });

  it("a re-played base is step 2's own record on Q-3's projection (B3, cut corpus)", () => {
    expect(q3Problems(b3!, b3Step2!)).toEqual([]);
  });

  it("is deterministic: the same arm twice is the same bytes", () => {
    expect(jsonText(c1Again)).toBe(jsonText(c1));
  });

  it("holds no clock, host or path field", () => {
    for (const r of [c1!, b3!]) {
      const text = jsonText(r);
      expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:/);
      expect(text).not.toContain(PKG);
      expect(text).not.toContain(tmpdir());
      const keys: string[] = [];
      const walk = (v: unknown): void => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (typeof v === "object" && v !== null) for (const [k, x] of Object.entries(v)) { keys.push(k); walk(x); }
      };
      walk(r);
      expect(keys.filter((k) => /wall|elapsed|millis|started|host|cwd|path|date/i.test(k) || /^ms$|[a-z]Ms$/.test(k))).toEqual([]);
    }
  });
});

// --- grading ---------------------------------------------------------------------------------------------------

/** C1's graded rows inside their bands (bin at most 29.4, quick 30 to 55, unblocked pressures at most 14, their share at most 40). */
const IN_BAND: Readonly<Record<string, number>> = { pressured_share_by_release_bin: 20, quick_pressure_share_by_origin: 40, unblocked_pressures_per_100: 10, unblocked_share_of_hit_or_sack: 30 };

/**
 * An arm's synthetic record: C1's cut-corpus record for a pocket-1.s3 arm, B3's for any other,
 * re-stamped as the arm with `amendments`; every guard side B3's (so the guard passes as given), the
 * graded rows inside their bands, and M5 on C1 only.
 */
function synthetic(id: ArmId, seedSet: SeedSet, amendments: string, corpus: Step1Corpus = FULL_CORPUS, env: Step1Env = ENV): W<Step3Record> {
  const s3 = isS3Arm(id);
  const r = clone(s3 ? c1! : b3!);
  r.stamp = clone(step3StampOf(id, seedSet, env, amendments, corpus));
  r.report.arm = id;
  r.report.intGuard = clone(b3!.report.intGuard);
  for (const l of LEAGUES) {
    r.s2[l].guardGames = clone(b3!.s2[l].guardGames);
    r.s2[l].desperation = clone(b3!.s2[l].desperation);
    r.s2[l].checkdown = clone(b3!.s2[l].checkdown);
  }
  if (id !== STEP3_M5_ARM) delete r.m5;
  // The cut corpus's flat league is one game, whose bootstrap SE is 0: M5's rows are made their own mirror.
  else for (const l of LEAGUES) r.m5![l].mirrored = clone(r.m5![l].unmirrored);
  for (const row of r.report.rows) {
    const v = IN_BAND[row.id];
    if (v !== undefined) (row as { values: Record<string, number | null> }).values = { flat: v, gen: v };
  }
  return r;
}

type Editable = Map<ArmId, Partial<Record<SeedSet, W<Step3Record>>>>;
const recordsOf = (amendments: string, edit?: (m: Editable) => void, sets: readonly SeedSet[] = [1, 2], corpus: Step1Corpus = FULL_CORPUS): Step3Records => {
  const m: Editable = new Map(STEP3_PLAYABLE_RUN_IDS.map((id) => [id, Object.fromEntries(sets.map((s) => [s, synthetic(id, s, amendments, corpus)])) as Partial<Record<SeedSet, W<Step3Record>>>]));
  edit?.(m);
  return m as unknown as Step3Records;
};
const rec = (m: Editable, id: ArmId, s: SeedSet): W<Step3Record> => m.get(id)![s]!;
const setRow = (r: W<Step3Record>, row: string, league: "flat" | "gen", v: number): void => {
  (r.report.rows.find((x) => x.id === row)!.values as Record<string, number>)[league] = v;
};
/** Each re-played base-set's own record as its step-2 reference, so Q-3 finds them equal. */
const selfRefs = (records: Step3Records): Step2References =>
  new Map(STEP3_BASE_IDS.flatMap((id) => SEED_SETS.flatMap((s) => (records.get(id)?.[s] === undefined ? [] : [[`${id}.set${String(s)}`, records.get(id)![s]! as object] as const]))));

describe("grading synthetic records under AM-3's stand-in", () => {
  const file = committedFiling();
  const guard = am3Guard();
  const grade = (records: Step3Records, oneSet?: SeedSet, refs?: Step2References): Step3Grade => gradeStep3(records, file, guard, refs ?? selfRefs(records), oneSet);
  const clause = (g: Step3Grade, id: string) => g.sections.clauses.find((c) => c.id === id)!;
  const proof = (g: Step3Grade, id: string) => g.sections.proofs.find((p) => p.id === id)!;
  let records: Step3Records;
  let g: Step3Grade;
  beforeAll(() => {
    records = recordsOf(guard.digest);
    g = grade(records);
  });

  it("as given: every proof passes, every graded clause holds, no breach, and the merge card may be posted", () => {
    expect(g.sections.proofs.map((p) => [p.id, p.kind, p.verdict])).toEqual([
      ["s3.part1", "structural", "PASS"],
      ["s3.monotone", "structural", "PASS"],
      ["s3.mirror", "structural", "PASS"],
      ["s3.lateBlock", "structural", "PASS"],
      ["s3.neverOffered", "structural", "PASS"],
      ["s2.selfCheck", "fold", "PASS"],
      ["s2.falsifier.counterAlone", "structural", "PASS"],
      ["s2.falsifier.everyArrival", "structural", "PASS"],
      ["s2.warning.clean", "structural", "PASS"],
      ["s2.liveSet", "structural", "PASS"],
      ["s2.m2.identity", "fold", "PASS"],
      ["s1.streamChecks", "structural", "PASS"],
      ["q3.replay", "structural", "PASS"],
    ]);
    // M2 STREAM is folded on the bases and C13 only: eight arms on two sets.
    expect(proof(g, "s2.m2.identity").detail).toBe("16 arm-sets; failures none");
    expect(proof(g, "q3.replay").detail).toBe(STEP3_BASE_IDS.flatMap((id) => [`${id} set 1 equal`, `${id} set 2 equal`]).join("; "));
    for (const id of ["s3.bin20.tick", "s3.quick", "s3.unblockedPressures", "s3.unblockedShare", "guard.mix", "guard.byClass"]) expect(clause(g, id).verdict, id).toBe("PASS");
    expect(clause(g, "s3.part1.determinism").verdict).toBe("NOT CHECKED");
    expect(clause(g, "s3.part1.m8").filed).toMatch(/^superseded by AM-2 \(ADR-089 Appendix G, G\.8\): part 1 on the published picture/);
    expect(clause(g, "s3.bin20.tick").values[0]).toMatch(/^C1 flat set 1 20\.00 \(binomial SE \d+\.\d\d; B3 20\.00\); set 2 20\.00; two-set mean 20\.00 \[time to throw C1 \d\.\d{3} s, B3 \d\.\d{3} s\]$/);
    expect(clause(g, "guard.mix").filed).toMatch(/^as AM-1's reading under AM-3 \(ADR-089 Appendix G, G\.9\): pooled Z over both seed sets above 2 breaches/);
    expect(clause(g, "guard.mix").note).toBe("graded on C1 against B3, C2 against B6, C11 against B3; the filed reading, e* and the paired SE are printed beside every reading in the guard section");
    expect(g.sections.outcome).toEqual({ structuralFailures: [], foldFaults: [], gradedFailures: [], guardBreaches: [], mergeCard: true, next: [] });
    expect(g.sections.notPlayable).toEqual([{ arm: "C14", reason: armRefusal("C14") }]);
    expect(g.sections.amendments).toEqual({ digest: guard.digest, entry: "AM-3", record: "ADR-089 Appendix G, G.9", zLeague: 2, zClass: 3, zSetSE0: 0, am2: "AM-2 (ADR-089 Appendix G, G.8)" });
  });

  it("reads the guard as AM-3 maps it, then the cumulative line and the accepted state, then every other arm as information", () => {
    const by = (role: string): string[] => g.sections.guard.filter((r) => r.role === role).map((r) => `${r.arm}/${r.base}/${r.league}`);
    expect(by("graded")).toEqual(["C1/B3/flat", "C1/B3/gen", "C2/B6/flat", "C2/B6/gen", "C11/B3/flat", "C11/B3/gen"]);
    expect(by("cumulative")).toEqual(["C1/A0/flat", "C1/A0/gen", "C2/A14/flat", "C2/A14/gen"]);
    expect(by("accepted")).toEqual(["C1/A1/flat", "C1/A1/gen", "C2/A11/flat", "C2/A11/gen"]);
    expect(by("information")).toEqual(STEP3_PLAYABLE.filter((id) => !["C1", "C2", "C11"].includes(id)).flatMap((id) => LEAGUES.map((l) => `${id}/${armById(id).base!}/${l}`)));
    for (const r of g.sections.guard) expect(r.reading.breaches).toEqual([]);
  });

  it("prints the composition, the miss readings, the options, the stand-ins, the alone arms and part 1", () => {
    const s = g.sections;
    expect(s.composition.map((c) => `${c.arm}/${c.base}/${c.league}/${c.cls}`)).toEqual(
      [["C1", "B3"], ["C2", "B6"]].flatMap(([a, b]) => LEAGUES.flatMap((l) => GUARD_CLASSES.map((cls) => `${a!}/${b!}/${l}/${cls}`))),
    );
    const c1Gen = s.composition.find((c) => c.arm === "C1" && c.league === "gen" && c.cls === "RANK_PUSHED")!;
    expect(c1Gen.cells.reduce((a, c) => a + c.armAimed, 0)).toBe(2 * Object.values(c1!.s3.gen.composition["RANK_PUSHED"]!).reduce((a, c) => a + c.aimed, 0));
    expect(s.miss.readings.map((r) => `${r.arm}/${r.league}/${String(r.seedSet)}`)).toEqual(["C1", "C2"].flatMap((a) => LEAGUES.flatMap((l) => [1, 2].map((x) => `${a}/${l}/${String(x)}`))));
    for (const r of s.miss.readings) {
      expect(r.missed).toEqual([]);
      expect(r.classes).toEqual([]);
      expect(r.note).toBe("class (iii), conversion: n/a at step 3 (sacks are not a covered row and hit-or-sack is reported)");
    }
    expect(s.miss.options.map((o) => [o.option, o.pricedBy.split(" ")[0]])).toEqual([["A", "C15"], ["B", "nothing"], ["C", "C11"]]);
    expect(s.miss.neverOffered[0]).toMatch(/^C12, /);
    expect(s.miss.neverOffered[1]).toMatch(/^C13, /);
    expect(s.standIns).toHaveLength(5 * 2 * 2);
    expect(s.alone.map((a) => `${a.arm}/${a.league}`)).toEqual(["C3", "C4", "C5", "C7", "C8", "C9", "C10", "C16"].flatMap((id) => LEAGUES.map((l) => `${id}/${l}`)));
    expect(s.alone.every((a) => a.games === 2 * (a.league === "flat" ? 1 : 16))).toBe(true);
    expect(s.part1.rows.map((r) => r.arm)).toEqual(STEP3_PART1_IDS.flatMap((id) => LEAGUES.flatMap(() => [id, id])));
    expect(s.m5?.arm).toBe("C1");
    expect(s.headline.map((h) => `${h.arm}-${h.against}`)).toEqual(LEAGUES.flatMap(() => [1, 2].flatMap(() => ["C1-B3", "C2-B6"])));
    expect(g.groups.map((x) => `${String(x.seedSet)}:${x.input.arms.map((a) => a.arm.split(" ")[0]).join(",")}`)).toEqual(
      [1, 2].flatMap((x) => step3Groups().map((gr) => `${String(x)}:${[gr.base, ...gr.arms].join(",")}`)),
    );
    expect(g.groups.every((x) => x.input.step === "3" && x.input.filedGuardSuperseded === "AM-3 (ADR-089 Appendix G, G.9)")).toBe(true);
  });

  it("a graded clause outside its band is a miss: classed on each set, the sets' classes named when they differ, the card not held", () => {
    const miss = grade(recordsOf(guard.digest, (m) => setRow(rec(m, "C1", 1), "pressured_share_by_release_bin", "gen", 35)));
    expect(clause(miss, "s3.bin20.tick").verdict).toBe("FAIL");
    expect(miss.sections.outcome.gradedFailures).toEqual([expect.stringMatching(/^s3\.bin20\.tick \(at most 29\.4\): C1 flat set 1 20\.00 .*; C1 gen set 1 35\.00 /)]);
    expect(miss.sections.outcome.mergeCard).toBe(true);
    expect(miss.sections.outcome.next).toEqual([expect.stringMatching(/^each miss is classed by the miss rule on C1 and C2, on each seed set/)]);
    const r = miss.sections.miss.readings.find((x) => x.arm === "C1" && x.league === "gen" && x.seedSet === 1)!;
    expect(r.missed).toEqual(["s3.bin20.tick"]);
    expect(r.classes!.length).toBeGreaterThan(0);
    expect(miss.sections.miss.setsDiffer).toEqual([expect.stringMatching(/^C1 gen: set 1 missed s3\.bin20\.tick; classed .*; set 2 missed nothing; classed nothing \(both named; critique 4 S4-8\)$/)]);
    // Set 2 alone outside the band does not fail the clause: set 1 is graded.
    const two = grade(recordsOf(guard.digest, (m) => setRow(rec(m, "C1", 2), "pressured_share_by_release_bin", "gen", 35)));
    expect(clause(two, "s3.bin20.tick").verdict).toBe("PASS");
    expect(clause(two, "s3.bin20.tick").note).toContain("gen: the sets differ (set 1 PASS, set 2 FAIL)");
  });

  it("names a verdict two seed sets do not resolve: set 2 across the line within 2 SE of it", () => {
    const close = grade(recordsOf(guard.digest, (m) => {
      setRow(rec(m, "C1", 1), "pressured_share_by_release_bin", "gen", 29);
      setRow(rec(m, "C1", 2), "pressured_share_by_release_bin", "gen", 29.8);
    }));
    expect(clause(close, "s3.bin20.tick").verdict).toBe("PASS");
    expect(clause(close, "s3.bin20.tick").note).toContain("gen: not resolved by two seed sets (set 1 PASS, set 2 FAIL, within 2 SE of the line)");
    expect(close.sections.outcome.next).toEqual(["not resolved by two seed sets: s3.bin20.tick gen; the grade stays set 1's, and both sets go to the owner"]);
  });

  it("an AM-3 breach stops the step; the same rise on an information arm, the cumulative line or the accepted state is printed, never a breach", () => {
    const b = grade(recordsOf(guard.digest, (m) => { for (const s of [1, 2] as const) rec(m, "C1", s).report.intGuard.gen.all.interceptions += 40; }));
    expect(clause(b, "guard.mix").verdict).toBe("FAIL");
    expect(b.sections.outcome.guardBreaches).toEqual([expect.stringMatching(/^C1 against B3, gen: league-wide Z \+\d+\.\d\d$/)]);
    expect(b.sections.outcome.mergeCard).toBe(false);
    expect(b.sections.outcome.next[0]).toMatch(/^AM-3 breaches: the step stops \(ADR-089:1306; D9\)/);
    expect(b.sections.guard.filter((r) => r.arm === "C1" && r.league === "gen" && r.role !== "graded").every((r) => r.reading.breaches.includes("league-wide"))).toBe(true);
    const info = grade(recordsOf(guard.digest, (m) => { for (const s of [1, 2] as const) rec(m, "C3", s).report.intGuard.gen.all.interceptions += 40; }));
    expect(info.sections.guard.find((r) => r.arm === "C3" && r.league === "gen")!.reading.breaches).toEqual(["league-wide"]);
    expect(info.sections.outcome.guardBreaches).toEqual([]);
    expect(clause(info, "guard.mix").verdict).toBe("PASS");
  });

  it("M5 outside the noise fails the mirror guard: C1's own cut-corpus mirror, whose one flat game has a bootstrap SE of 0", () => {
    const real = grade(recordsOf(guard.digest, (m) => { for (const s of [1, 2] as const) rec(m, "C1", s).m5 = clone(c1!.m5!); }));
    expect(proof(real, "s3.mirror").verdict).toBe("FAIL");
    expect(proof(real, "s3.mirror").detail).toMatch(/^failures flat [a-z_]+ outside the noise/);
    expect(proof(real, "s3.mirror").detail).not.toContain("gen ");
    expect(real.sections.m5!.leagues.find((l) => l.league === "flat")!.rows.filter((r) => !r.withinNoiseOnEverySet).map((r) => [r.row, r.tolerance < 1e-9])).toEqual([["escape_rate", true], ["looper_moved_share", true]]);
    // The exact free-run mirror failing is named too.
    const inexact = grade(recordsOf(guard.digest, (m) => { const f = rec(m, "C1", 2).m5!.gen.freeRunMirror; f.exact = false; f.menDiffering = 3; }));
    expect(proof(inexact, "s3.mirror").detail).toContain("gen set 2 free-run mirror not exact (3 of ");
    // Without C1 in the run there is no M5 to read.
    const noC1 = grade(recordsOf(guard.digest, (m) => { m.delete("C1"); }));
    expect(proof(noC1, "s3.mirror")).toMatchObject({ verdict: "NOT APPLICABLE", detail: "M5's rows not applicable: C1 is not in this run; failures none" });
  });

  it("review CT-F3: no proof passes on an arm-league it did not read, and part 1's mirror is graded without M5", () => {
    // s3.part1: one arm-league that times free runners from the picture and checked nobody.
    const unread = grade(recordsOf(guard.digest, (m) => { rec(m, "C5", 2).s3.gen.part1!.part1.checked = 0; }));
    expect(proof(unread, "s3.part1").verdict).toBe("FAIL");
    expect(proof(unread, "s3.part1").detail).toContain("C5 set 2 gen: no man checked: the proof saw no case");
    // s3.monotone: a monotone arm-league with no man read, and one with no part-1 fold.
    const noMen = grade(recordsOf(guard.digest, (m) => { rec(m, "C2", 1).s3.flat.part1!.monotone.men = 0; }));
    expect(proof(noMen, "s3.monotone").verdict).toBe("FAIL");
    expect(proof(noMen, "s3.monotone").detail).toContain("C2 set 1 flat: no man read");
    const noFold = grade(recordsOf(guard.digest, (m) => { rec(m, "C2", 2).s3.gen.part1 = null; }));
    expect(proof(noFold, "s3.monotone").detail).toContain("C2 set 2 gen: no part-1 fold");
    expect(proof(noFold, "s3.monotone").verdict).toBe("FAIL");
    expect(proof(noFold, "s3.mirror").verdict).toBe("FAIL");
    // s3.mirror: part 1's mirrored time differing on an arm fails whether or not C1 (M5) is in the run.
    const selfCheck = grade(recordsOf(guard.digest, (m) => {
      m.delete("C1");
      const f = rec(m, "C5", 1).s3.flat.part1!.mirror;
      f.failed = 2;
    }));
    expect(proof(selfCheck, "s3.mirror").verdict).toBe("FAIL");
    expect(proof(selfCheck, "s3.mirror").detail).toMatch(/^M5's rows not applicable: C1 is not in this run; failures C5 set 1 flat: 2 of \d+ men's mirrored times differ \(calibration self-check\)$/);
    // s3.lateBlock: a missing fold fails, and no late block expected anywhere a reading makes one fails.
    const noLate = grade(recordsOf(guard.digest, (m) => { rec(m, "C6", 2).s3.flat.lateBlock = null; }));
    expect(proof(noLate, "s3.lateBlock").verdict).toBe("FAIL");
    expect(proof(noLate, "s3.lateBlock").detail).toContain("C6 set 2 flat: no late-block fold");
    const noCase = grade(recordsOf(guard.digest, (m) => {
      for (const [, bySet] of m) for (const r of Object.values(bySet)) for (const l of LEAGUES) if (r!.s3[l].lateBlock !== null) r!.s3[l].lateBlock!.expected = 0;
    }));
    expect(proof(noCase, "s3.lateBlock").verdict).toBe("FAIL");
    expect(proof(noCase, "s3.lateBlock").detail).toContain("no late block expected: the proof saw no case");
  });

  it("a structural failure is a build fault and holds the card; a moved step-2 reference fails Q-3", () => {
    const planted = grade(recordsOf(guard.digest, (m) => {
      const p = rec(m, "C5", 2).s3.flat.part1!;
      p.problemCount = 1;
      p.problems = ["planted"];
    }));
    expect(proof(planted, "s3.part1").verdict).toBe("FAIL");
    expect(planted.sections.outcome.structuralFailures).toEqual([expect.stringMatching(/^s3\.part1: .*C5 set 2 flat: part 1: 1 failure, first: planted/)]);
    expect(planted.sections.outcome.mergeCard).toBe(false);
    const recs = recordsOf(guard.digest);
    const refs = new Map(selfRefs(recs));
    const moved = clone(refs.get("A0.set1")!) as W<Step3Record>;
    moved.measures.gen.pressure = (moved.measures.gen.pressure ?? 0) + 0.01;
    refs.set("A0.set1", moved);
    const q3 = grade(recs, undefined, refs);
    expect(proof(q3, "q3.replay").verdict).toBe("FAIL");
    expect(q3.sections.outcome.structuralFailures).toEqual([expect.stringMatching(/^q3\.replay: .*A0 set 1 differs on measures/)]);
    const none = grade(recs, undefined, new Map());
    expect(proof(none, "q3.replay").detail).toContain("A0 set 1 has no step-2 record (a missing reference on the full corpus fails)");
  });

  it("one seed set is reported, never graded; a missing target and a cut corpus hold the card", () => {
    const one = grade(recordsOf(guard.digest, undefined, [1]), 1);
    expect(clause(one, "s3.bin20.tick").verdict).toBe("REPORTED");
    expect(clause(one, "guard.mix").verdict).toBe("REPORTED");
    expect(one.sections.oneSet).toBe(1);
    expect(one.sections.outcome.mergeCard).toBe(false);
    expect(one.sections.outcome.next).toContain("this run played seed set 1 only: it is reported, never graded; the step's verdict needs both seed sets (pocket -- --step 3)");
    const missing = grade(recordsOf(guard.digest, (m) => { delete m.get("C2")![2]; }));
    expect(missing.sections.outcome.mergeCard).toBe(false);
    expect(missing.sections.outcome.next).toContain("not every target of the step is in this run (missing C2.set2): the merge card waits for the full run");
    const cut = grade(recordsOf(guard.digest, undefined, [1, 2], TINY));
    expect(proof(cut, "q3.replay").verdict).toBe("NOT CHECKED");
    expect(cut.sections.outcome.mergeCard).toBe(false);
    expect(cut.sections.outcome.next.some((n) => n.startsWith("this run is on a cut corpus (tests only; 44 arm-sets)"))).toBe(true);
  });

  it("refuses a record stamped with another step-3 view (a preview's) or filed under another arm", () => {
    const preview = previewDigest();
    expect(() => grade(recordsOf(guard.digest, (m) => { rec(m, "C1", 1).stamp.amendments = preview; }))).toThrow(
      new RegExp(`^ADR-089 step 3: refused to grade: C1 \\(set 1\\) is stamped with amendments ${preview}, not the step-3 view's ${guard.digest}$`),
    );
    expect(() => grade(recordsOf(guard.digest, (m) => { rec(m, "C2", 2).stamp.arm = "C3"; }))).toThrow(/the record filed as C2 set 2 is C3 set 2/);
  });

  it("renders the report: the refusal-free summary, C14 not played, every step-3 section, and one step report per base group and set", () => {
    const text = renderStep3Report(g, records);
    expect(text.startsWith("# ADR-089 step 3: the arms\n")).toBe(true);
    for (const h of [
      "## What failed, first",
      "## Arms defined and not played",
      `- C14: ${armRefusal("C14") ?? "?"}`,
      "## The clause table",
      "## Part 1, the touched men's check, the monotone check and the mirror",
      "## M5 on C1:",
      "## The miss rule on C1 and C2",
      "## The stand-in expectations, read as C2 minus B6",
      "## The alone arms:",
      "## The interception guard under AM-3 (ADR-089 Appendix G, G.9;",
      "## The declared composition print",
      "### B3 (pocket-1.s2, step 2's design, re-played) with C1,",
    ]) expect(text, h).toContain(h);
    expect(text).not.toContain(tmpdir());
    const measures = step3MeasuresOf(records, g, guard, ENV.fingerprint, planStep3({}).complete) as Record<string, unknown>;
    expect(measures["format"]).toBe(STEP3_MEASURES_FORMAT);
    expect(measures["amendments"]).toBe(guard.digest);
    expect(Object.keys(measures["arms"] as object)).toHaveLength(44);
  });
});

// --- the run through its play seam ----------------------------------------------------------------------------------

describe("the run through its play seam", () => {
  const guard = (): Step3Guard => am3Guard();
  let plays: string[] = [];
  const play = (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep3Options): Step3Record => {
    plays.push(`${id}.set${String(seedSet)}`);
    return synthetic(id, seedSet, opts.amendments, opts.corpus ?? FULL_CORPUS, env) as unknown as Step3Record;
  };
  const refsFor = (amendments: string): Step2References => selfRefs(recordsOf(amendments));

  it("shards play their targets, the last grades once every target is cached, and a re-run reads the cache to the same bytes", () => {
    const dir = tempDir("run");
    const refs = refsFor(guard().digest);
    const common = { cacheParent: join(dir, "cache"), filedPath: FILED, amendmentsPath: AM3.path, amendmentsPin: AM3.pin, env: ENV, play, references: refs, s3Granted: true };
    plays = [];
    const first = runStep3({ ...common, shard: { index: 1, count: 2 } });
    expect(first.graded).toBe(false);
    expect(first.played).toHaveLength(22);
    expect(first.remaining).toHaveLength(22);
    const report = join(dir, "s3.md");
    const out = join(dir, "s3.json");
    const second = runStep3({ ...common, shard: { index: 2, count: 2 }, report, out });
    expect(second.graded).toBe(true);
    expect(second.played).toHaveLength(22);
    expect(second.wrote).toEqual([report, out]);
    expect(second.grade!.sections.outcome).toEqual({ structuralFailures: [], foldFaults: [], gradedFailures: [], guardBreaches: [], mergeCard: true, next: [] });
    expect(plays).toHaveLength(44);
    const bytes = [readFileSync(report, "utf8"), readFileSync(out, "utf8")];
    plays = [];
    const again = runStep3({ ...common, report, out });
    expect(again.played).toEqual([]);
    expect(again.cached).toHaveLength(44);
    expect(plays).toEqual([]);
    expect([readFileSync(report, "utf8"), readFileSync(out, "utf8")]).toEqual(bytes);
    expect((JSON.parse(bytes[1]!) as { format: string }).format).toBe(STEP3_MEASURES_FORMAT);
  });

  it("one arm with --out writes its records; one set grades as reported", () => {
    const dir = tempDir("one");
    const out = join(dir, "c1.json");
    const r = runStep3({ cacheParent: join(dir, "cache"), filedPath: FILED, amendmentsPath: AM3.path, amendmentsPin: AM3.pin, env: ENV, play, references: new Map(), arms: ["C1"], seedSet: 1, out, s3Granted: true });
    expect(r.graded).toBe(true);
    expect(r.wrote).toEqual([out]);
    expect(r.grade!.sections.oneSet).toBe(1);
    const body = JSON.parse(readFileSync(out, "utf8")) as { format: string; amendments: string; records: Record<string, Step3Record> };
    expect(body.format).toBe(STEP3_RECORDS_FORMAT);
    expect(body.amendments).toBe(guard().digest);
    expect(Object.keys(body.records)).toEqual(["C1.set1"]);
  });

  it("a preview's cache (stamped before AM-3) is refused by name by a grading run, never re-used", () => {
    const dir = tempDir("stale");
    const cacheParent = join(dir, "cache");
    const p = runStep3Part1({ cacheParent, filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, play, arms: ["C1"], seedSet: 1 });
    expect(p.played).toEqual(["C1.set1"]);
    expect(() => runStep3({ cacheParent, filedPath: FILED, amendmentsPath: AM3.path, amendmentsPin: AM3.pin, env: ENV, play, references: new Map(), arms: ["C1"], seedSet: 1, s3Granted: true })).toThrow(
      new RegExp(`the cached C1 \\(set 1\\) at .* is not this build's arm: stamped with amendments ${previewDigest()}, not this build's step-3 view ${guard().digest}\\. Delete it, or use another --cache`),
    );
  });

  it("refuses a committed report from a dirty tree before anything plays", () => {
    const dir = tempDir("dirty");
    plays = [];
    expect(() => runStep3({ cacheParent: join(dir, "cache"), filedPath: FILED, amendmentsPath: AM3.path, amendmentsPin: AM3.pin, env: { ...ENV, dirty: true }, play, committedDir: dir, report: join(dir, "r.md"), s3Granted: true })).toThrow(
      /a committed report \(under reports\/\) is made from a clean tree, and this tree is dirty/,
    );
    expect(plays).toEqual([]);
  });

  it("--part1 plays the asked pocket-1.s3 arms without AM-3, prints M5 when C1 is asked, and names every build fault", () => {
    const dir = tempDir("part1");
    const r = runStep3Part1({ cacheParent: join(dir, "cache"), filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, play, arms: ["C1", "C10"], seedSet: 1 });
    expect(r.played).toEqual(["C1.set1", "C10.set1"]);
    expect(r.part1.rows.map((x) => `${x.arm}/${x.league}/${String(x.seedSet)}`)).toEqual(["C1/flat/1", "C1/gen/1", "C10/flat/1", "C10/gen/1"]);
    expect(r.part1.rows.map((x) => x.monotoneGraded)).toEqual([true, true, false, false]);
    expect(r.m5?.arm).toBe("C1");
    expect(r.problems).toEqual([]);
    const without = runStep3Part1({ cacheParent: join(dir, "cache"), filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, play, arms: ["C10"], seedSet: 1 });
    expect(without.cached).toEqual(["C10.set1"]);
    expect(without.m5).toBeNull();
    const faulty = (id: ArmId, s: SeedSet, env: Step1Env, opts: PlayStep3Options): Step3Record => {
      const x = synthetic(id, s, opts.amendments, opts.corpus ?? FULL_CORPUS, env);
      x.s3.gen.part1!.problemCount = 2;
      x.s3.gen.part1!.problems = ["planted"];
      x.s3.flat.part1!.mirror.failed = 1;
      return x as unknown as Step3Record;
    };
    const f = runStep3Part1({ cacheParent: join(dir, "faulty"), filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, play: faulty, arms: ["C2"], seedSet: 2 });
    expect(f.problems).toEqual(["C2 set 2 flat: 1 men's mirrored times differ", "C2 set 2 gen: part 1, 2 failure(s), first: planted"]);
    for (const bad of ["B3", "C13"] as const) {
      expect(() => runStep3Part1({ cacheParent: join(dir, "x"), filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, play, arms: [bad] }), bad).toThrow(new RegExp(`^--part1 reads the pocket-1\\.s3 arms only \\(${STEP3_PART1_IDS.join(", ")}\\); ${bad} is not one$`));
    }
    expect(() => runStep3Part1({ cacheParent: join(dir, "x"), filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, play, arms: ["C14"] })).toThrow(/C14 is not playable: C14 waits on petition P17/);
  });
});

// --- R-1 and the closed records ------------------------------------------------------------------------------------

describe("R-1: the digests and their pin check (plan §2.10, §6.2)", () => {
  const fromPins = (games: 50 | 10): W<Step3DigestsResult> => {
    const pins: [string, (typeof POCKET_1_S1_PINS.arms)["A1"]][] = [
      ["A1", POCKET_1_S1_PINS.arms.A1],
      ["A5", POCKET_1_S1_BASE_PINS.arms.A5],
      ["A11", POCKET_1_S1_BASE_PINS.arms.A11],
      ...STEP2_ARM_IDS.map((id) => [id, POCKET_1_S2_PINS.arms[id]] as [string, (typeof POCKET_1_S1_PINS.arms)["A1"]]),
    ];
    return {
      format: STEP3_DIGESTS_FORMAT,
      amendments: "fnv1a:00000000",
      node: "v",
      caller: "v7",
      gamesPerLeague: games,
      arms: Object.fromEntries(pins.map(([id, pin]) => [id, {
        stamp: clone(pin.stamp),
        leagues: Object.fromEntries(GOLDEN_LEAGUES.map((l) => {
          const p = games === 50 ? pin.leagues[l] : pin.leagues[l].first10;
          return [l, { games, events: p.events, canonicalFold: p.canonicalFold, byteFold: p.byteFold, unstrippedCanonicalFold: "x", unstrippedByteFold: "x" }];
        })),
      }])),
    } as W<Step3DigestsResult>;
  };

  it("holds on the s1, base and s2 pins at 50 games and at 10, and names every s1, base or s2 field that moves", () => {
    expect(step3DigestPinProblems(fromPins(50) as unknown as Step3DigestsResult)).toEqual([]);
    expect(step3DigestPinProblems(fromPins(10) as unknown as Step3DigestsResult)).toEqual([]);
    const moved = fromPins(50);
    moved.arms["A1"]!.leagues["flat"]!.canonicalFold = "fnv1a:00000000";
    moved.arms["A11"]!.leagues["gen"]!.events += 1;
    moved.arms["B4"]!.leagues["gen"]!.byteFold = "fnv1a:00000000";
    moved.arms["B7"]!.stamp.tunablesDigest = "fnv1a:00000000";
    expect(step3DigestPinProblems(moved as unknown as Step3DigestsResult)).toEqual([
      `A1 flat canonicalFold: fnv1a:00000000, pinned ${POCKET_1_S1_PINS.arms.A1.leagues.flat.canonicalFold}`,
      `A11 gen events: ${String(POCKET_1_S1_BASE_PINS.arms.A11.leagues.gen.events + 1)}, pinned ${String(POCKET_1_S1_BASE_PINS.arms.A11.leagues.gen.events)}`,
      `B4 gen byteFold: fnv1a:00000000, pinned ${POCKET_1_S2_PINS.arms.B4.leagues.gen.byteFold}`,
      expect.stringMatching(/^B7: stamp /),
    ]);
    // An unstripped fold is printed, never pinned; a run of neither 50 nor 10 games is not checked.
    const unstripped = fromPins(10);
    unstripped.arms["B1"]!.leagues["flat"]!.unstrippedCanonicalFold = "fnv1a:00000000";
    expect(step3DigestPinProblems(unstripped as unknown as Step3DigestsResult)).toEqual([]);
    const one = fromPins(50);
    one.gamesPerLeague = 1;
    one.arms["A1"]!.leagues["flat"]!.canonicalFold = "fnv1a:00000000";
    expect(step3DigestPinProblems(one as unknown as Step3DigestsResult)).toEqual([]);
  });

  it("plays without AM-3: A1's real folds (first 10 a league) equal S-9's pins; a C arm is stamped pocket-1.s3 and folded unstripped beside", () => {
    const d = runStep3Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v-test", first: 10, arms: ["A1"] });
    expect(d).toMatchObject({ format: STEP3_DIGESTS_FORMAT, amendments: previewDigest(), gamesPerLeague: 10, caller: "v7" });
    expect(step3DigestPinProblems(d)).toEqual([]);
    const c = runStep3Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v-test", first: 1, arms: ["C1"], s3Granted: true });
    expect(c.arms["C1"]!.stamp).toMatchObject({ arm: "C1", rules: POCKET_1_S3_RULES, overlayDigest: armById("C1").overlayDigest, tunablesDigest: armById("C1").tunablesDigest });
    for (const l of GOLDEN_LEAGUES) {
      const f = c.arms["C1"]!.leagues[l]!;
      expect(f).toMatchObject({ games: 1, canonicalFold: expect.stringMatching(/^fnv1a:[0-9a-f]{8}$/), unstrippedCanonicalFold: expect.stringMatching(/^fnv1a:[0-9a-f]{8}$/) });
      // The picture is in an s3 arm's stream, and the pins' fold strips it.
      expect(f.unstrippedCanonicalFold, l).not.toBe(f.canonicalFold);
    }
    expect(() => runStep3Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v-test", first: 1, arms: ["C14"] })).toThrow(/^C14 is not playable: C14 waits on petition P17/);
  }, 300_000);
});

describe("the closed records no step-3 command writes over", () => {
  it("refuses step 1's and step 2's committed records (and step 3's once final), compared on real paths", () => {
    expect(closedStep3Writes({ report: "reports/adr-089-step2.md", out: "reports/adr-089-step1.json" }, PKG, PKG)).toEqual(["--report reports/adr-089-step2.md", "--out reports/adr-089-step1.json"]);
    expect(closedStep3Writes({ out: join(PKG, "reports", "..", "reports", "adr-089-step2.json") }, "/", PKG)).toEqual([`--out ${join(PKG, "reports", "..", "reports", "adr-089-step2.json")}`]);
    expect(closedStep3Writes({ report: "reports/adr-089-step3.md", out: "reports/adr-089-step3.json" }, PKG, PKG, false)).toEqual([]);
    expect(closedStep3Writes({ report: "reports/adr-089-step3.md", out: "reports/adr-089-step3.json" }, PKG, PKG, true)).toEqual(["--report reports/adr-089-step3.md", "--out reports/adr-089-step3.json"]);
    expect(closedStep3Writes({ report: "/tmp/s3.md", out: "/tmp/s3.json" }, PKG, PKG)).toEqual([]);
    expect(closedStep3Writes({}, PKG, PKG)).toEqual([]);
  });
});

// Every step-3 arm id is listed exactly once in the run (the C arms after the bases).
describe("the run's order", () => {
  it("is the bases, then C1 to C16", () => {
    expect(STEP3_RUN_IDS.slice(0, 7)).toEqual(STEP3_BASE_IDS);
    expect(STEP3_RUN_IDS.slice(7)).toEqual(STEP3_ARM_IDS);
    expect(SEED_SETS).toEqual([1, 2]);
  });
});

