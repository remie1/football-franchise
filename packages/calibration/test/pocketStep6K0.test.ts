/**
 * ADR-089 STEP 6, K0 (step-6 plan §3.1 items 2, 3, 5 and 6; §10.3): before the filing of AM-11 and
 * AM-12 and before any step-6 arm, with no play change.
 *
 *  1. Step 6's arm ids are named and inert: `STEP6_ARM_IDS` (35 ids) are arms of this build
 *     (`isAnyArmId`, so AM-12's base map validates), `runIdsOf(6)` is D1, F5, E9 and then them, no
 *     earlier step's run list takes one, and `armById` refuses each by name; nothing defines them.
 *  2. The name `pocket-1.s6` is refused: `rulesTunables` refuses it by name, it is neither an engine
 *     rules name nor a stamped one, and `POCKET_1_S6_DIGEST` is unset.
 *  3. `--step 6` is parsed (`parseStep6Args`: the run flags, `--fresh-base`, `--digests`; no
 *     `--after-owner`), and step 6's gate (`step6.ts`) refuses before anything plays, naming every
 *     condition it waits for; on synthetic states it opens only when all five hold, for every option of
 *     each of the owner's three questions, so no answer is privileged.
 *  4. Step 5b's pin is its view under the played order, the whole file in this build, so
 *     `--step 5b --digests` keeps its preflight; 5b is still held by the owner's Wait.
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { AMENDMENTS_DIGEST, AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, amendmentsProblems, loadAmendments, type AmendmentsFile } from "../src/pocket/amendments.js";
import {
  ALL_ARM_IDS,
  ARM_IDS,
  ARM_STEPS,
  armById,
  armRefusal,
  everyArm,
  isAnyArmId,
  isRunIdOf,
  isStep5aArmId,
  isStep5bArmId,
  isStep6ArmId,
  runIdsOf,
  step5ArmRefusal,
  step6ArmRefusal,
  STEP2_ARM_IDS,
  STEP3_ARM_IDS,
  STEP4_ARM_IDS,
  STEP5A_ARM_IDS,
  STEP5B_ARM_IDS,
  STEP6_ARM_IDS,
  STEP6_RUN_IDS,
  type ArmId,
} from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { loadFiled } from "../src/pocket/filed.js";
import {
  ENGINE_RULES,
  EngineRulesError,
  engineRulesNamed,
  isEngineRules,
  isStampedRules,
  POCKET_1_S6_DIGEST,
  POCKET_1_S6_REFUSAL,
  POCKET_1_S6_RULES,
  rulesTunables,
  stampedRulesNamed,
  type StampedRules,
} from "../src/pocket/rules.js";
import { parsePocketArgs, parseStep6Args, pocketCommand, STEP6_AFTER_OWNER_REFUSAL } from "../src/pocket/step0.js";
import { preflightStep5, step5GateRefusal, step5GateState, STEP5A_AMENDMENTS_PIN, STEP5B_AMENDMENTS_PIN, STEP5B_WAIT_REFUSAL } from "../src/pocket/step5.js";
import {
  STEP6_AMENDMENTS_PIN,
  STEP6_ANSWER_OPTIONS,
  STEP6_HARNESS_REFUSAL,
  STEP6_PETITIONS,
  STEP6_UNSEEN_ANSWER,
  step6AnswersProblem,
  step6Command,
  step6GateRefusal,
  step6GateState,
  step6GateWaits,
  step6PetitionsOut,
  step6ViewFacts,
  type Step6Answers,
  type Step6GateState,
} from "../src/pocket/step6.js";

const PKG = join(import.meta.dirname, "..");
const FILED = join(PKG, FILED_PATH);
const AMEND = join(PKG, AMENDMENTS_PATH);
const whole = (): AmendmentsFile => loadAmendments(AMEND, loadFiled(FILED));

const scratch = mkdtempSync(join(tmpdir(), "pocket-step6-k0-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** The plan's recommended answer to each question (the bundle's default leaf); the gate privileges none. */
const RECOMMENDED: Step6Answers = { spentChecklist: "HOLD", scrambleStart: "ZERO_GAIN_ONLY", seen: "SEEN" };

/** A gate state with every condition of plan §10.3 met (synthetic: no build holds it yet). */
const OPEN: Step6GateState = {
  s5aFinal: true,
  s5aOutcome: { faults: [], breaches: [], misses: ["s5a.cleanScramble: flat 12.96, gen 6.89 against 2 to 6"] },
  viewDigest: "fnv1a:view6",
  viewPin: "fnv1a:view6",
  ownersAnswer: { s5aMiss: "s5a.cleanScramble", answeredAt: "2026-11-27T14:28:48Z" },
  guard: "AM-12",
  readings: { answers: RECOMMENDED },
  petitionsOut: [],
  s6Digest: "fnv1a:s6",
};

describe("step 6's arm ids, named and inert (plan §3.1 item 2, §5)", () => {
  it("lists the 35 step-6 arms in the plan's order, and step 6's run list: D1, F5 and E9, then them", () => {
    const H = Array.from({ length: 16 }, (_, i) => `H${String(i)}`);
    expect([...STEP6_ARM_IDS]).toEqual([...H, "H2L", "H0M", "HB0", "HB2", "HB3", "HB4", "HB5", "HB7", "HB9", "HB10", "HB11", "HB12", "HBN", "HB2L", "HF1", "HF2", "HF3", "HF4", "HF5"]);
    expect(STEP6_ARM_IDS).toHaveLength(35);
    expect(new Set(STEP6_ARM_IDS).size).toBe(35);
    expect([...STEP6_RUN_IDS]).toEqual(["D1", "F5", "E9", ...STEP6_ARM_IDS]);
    expect(runIdsOf(6)).toBe(STEP6_RUN_IDS);
    expect([...ARM_STEPS]).toEqual([1, 2, 3, 4, "5a", "5b", 6]);
    // ALL_ARM_IDS gains them after step 5's, so AM-12's map names arms of this build.
    expect(ALL_ARM_IDS.slice(-35)).toEqual([...STEP6_ARM_IDS]);
    expect(ALL_ARM_IDS.slice(0, -35)).toEqual([...ARM_IDS, ...STEP2_ARM_IDS, ...STEP3_ARM_IDS, ...STEP4_ARM_IDS, ...STEP5A_ARM_IDS, ...STEP5B_ARM_IDS]);
    expect(Object.isFrozen(ALL_ARM_IDS)).toBe(true);
  });

  it("checks an id per step: step 6's run list takes its own, no earlier step's takes a step-6 id, and an earlier arm is in step 6's list only as D1, F5 or E9", () => {
    const earlier = ARM_STEPS.filter((s) => s !== 6);
    for (const id of STEP6_ARM_IDS) {
      expect(isAnyArmId(id), id).toBe(true);
      expect(isStep6ArmId(id), id).toBe(true);
      expect(isStep5aArmId(id) || isStep5bArmId(id), id).toBe(false);
      expect(isRunIdOf(6, id), id).toBe(true);
      for (const step of earlier) expect(isRunIdOf(step, id), `${id} at step ${String(step)}`).toBe(false);
    }
    for (const id of ALL_ARM_IDS.slice(0, -35)) {
      expect(isStep6ArmId(id), id).toBe(false);
      expect(isRunIdOf(6, id), id).toBe(["D1", "F5", "E9"].includes(id));
      expect(step6ArmRefusal(id), id).toBeUndefined();
    }
    for (const bad of ["H16", "H", "h0", "H00", "HB1", "HB6", "HB8", "HB13", "HF0", "HF6", "HBN2", "H0L", ""]) {
      expect(isAnyArmId(bad), bad).toBe(false);
      expect(isStep6ArmId(bad), bad).toBe(false);
      for (const step of ARM_STEPS) expect(isRunIdOf(step, bad), `${bad} at step ${String(step)}`).toBe(false);
    }
  });

  it("defines none: armById refuses each by name, nothing else refuses it, and everyArm is as it was", () => {
    for (const id of STEP6_ARM_IDS) {
      const why = step6ArmRefusal(id);
      expect(why, id).toBe(`${id} is one of step 6's arms, named in this build but not yet defined (ADR-089 step 6, plan §5): defined with step 6's bundle (plan §3.2, K1)`);
      expect(() => armById(id), id).toThrow(`arms: ${why!}: nothing plays it`);
      expect(armRefusal(id), id).toBeUndefined();
      expect(step5ArmRefusal(id), id).toBeUndefined();
      expect(everyArm().some((a) => a.id === id), id).toBe(false);
    }
    expect(() => armById("H16" as ArmId)).toThrow(/^arms: no arm H16$/);
  });

  it("AM-12's base map on a stand-in entry names arms of this build; an id past HF5 does not (the committed file is only read)", () => {
    const filing = loadFiled(FILED);
    const withBases = (bases: Record<string, Record<string, string>>): unknown => {
      const j = JSON.parse(JSON.stringify(whole())) as { entries: Record<string, unknown>[] };
      const standIn = JSON.parse(JSON.stringify(j.entries.find((e) => e["id"] === "AM-8"))) as Record<string, unknown>;
      standIn["id"] = `AM-${String(j.entries.length + 1)}`;
      standIn["filedBeforeStep"] = "6";
      standIn["steps"] = ["6"];
      const rule = standIn["rule"] as Record<string, unknown>;
      rule["bases"] = bases;
      rule["freshBases"] = { F5: "played fresh" };
      j.entries.push(standIn);
      return j;
    };
    expect(amendmentsProblems(withBases({ "6": { H0: "F5", F5: "D1" } }), filing)).toEqual([]);
    const past = amendmentsProblems(withBases({ "6": { H16: "F5", F5: "D1" } }), filing);
    expect(past).toEqual(["entries.10.rule.bases.6.H16: not an arm of this build"]);
  });
});

describe("the name pocket-1.s6, refused (plan §1.1, §3.1 item 3)", () => {
  it("rulesTunables refuses it by name; it is neither an engine rules name nor a stamped one, and its digest is unset", () => {
    expect(POCKET_1_S6_RULES).toBe("pocket-1.s6");
    expect(() => rulesTunables(POCKET_1_S6_RULES as unknown as StampedRules)).toThrow(EngineRulesError);
    expect(() => rulesTunables(POCKET_1_S6_RULES as unknown as StampedRules)).toThrow(POCKET_1_S6_REFUSAL);
    expect(POCKET_1_S6_REFUSAL).toMatch(/^pocket-1\.s6 is named but not recorded: it is recorded after step 6's bundle commit/);
    expect(POCKET_1_S6_DIGEST).toBeUndefined();
    expect(isEngineRules(POCKET_1_S6_RULES)).toBe(false);
    expect(isStampedRules(POCKET_1_S6_RULES)).toBe(false);
    expect([...ENGINE_RULES]).toEqual(["legacy", "pocket-1.s1", "pocket-1.s2", "pocket-1.s3", "pocket-1.s4", "pocket-1.s5a"]);
    expect(() => engineRulesNamed(POCKET_1_S6_RULES, "--engine-rules")).toThrow(/^--engine-rules: engine rules "pocket-1\.s6" are not in this build/);
    expect(() => stampedRulesNamed(POCKET_1_S6_RULES, "stamp")).toThrow(/^stamp: engine rules "pocket-1\.s6" are not in this build/);
    // Another unknown name keeps today's words.
    expect(() => rulesTunables("pocket-1.s7" as unknown as StampedRules)).toThrow(/^no bundle for engine rules pocket-1\.s7$/);
  });
});

describe("--step 6, parsed (plan §3.1 item 5, §9)", () => {
  it("takes the run flags, --fresh-base <set> --out and --digests --out, paths resolved against the package", () => {
    expect(parsePocketArgs(["--step", "6"], "/")).toEqual({ step: 6 });
    expect(parsePocketArgs(["--", "--step", "6", "--arms", "H0,F5", "--shard", "2/3", "--cache", "c", "--seed-set", "2", "--report", "r.md", "--out", "o.json"], "/pkg")).toEqual({
      step: 6,
      arms: ["H0", "F5"],
      shard: { index: 2, count: 3 },
      cache: resolve("/pkg", "c"),
      seedSet: 2,
      report: resolve("/pkg", "r.md"),
      out: resolve("/pkg", "o.json"),
    });
    expect(parsePocketArgs(["--arms", "D1,E9,HF5", "--step", "6"], "/")).toEqual({ step: 6, arms: ["D1", "E9", "HF5"] });
    expect(parseStep6Args(["--step", "6", "--fresh-base", "1", "--out", "f.json"], "/pkg")).toEqual({ step: 6, freshBase: 1, out: resolve("/pkg", "f.json") });
    expect(parseStep6Args(["--step", "6", "--digests", "--out", "d.json"], "/pkg")).toEqual({ step: 6, digests: true, out: resolve("/pkg", "d.json") });
  });

  it("refuses --after-owner, an arm outside step 6's run list, and flags of other steps or modes", () => {
    expect(() => parsePocketArgs(["--step", "6", "--after-owner", "2026-11-27T14:28:48Z"], "/")).toThrow(STEP6_AFTER_OWNER_REFUSAL);
    expect(STEP6_AFTER_OWNER_REFUSAL).toMatch(/^--after-owner: step 6 takes no --after-owner; its gate reads the owner's words on the 5a miss from the amendments file \(AM-11's rule\.gate\.step6\)/);
    expect(() => parsePocketArgs(["--step", "6", "--arms", "E0"], "/")).toThrow(/^--arms: E0 is not an arm \(step 6's: D1, F5, E9, H0 to H15, H2L, H0M, HB0, HB2 to HB5, HB7, HB9 to HB12, HBN, HB2L, HF1 to HF5\)$/);
    expect(() => parsePocketArgs(["--step", "6", "--arms", "H16"], "/")).toThrow(/^--arms: H16 is not an arm/);
    expect(() => parsePocketArgs(["--step", "6", "--arms", "H0,H0"], "/")).toThrow(/^--arms names an arm twice: H0,H0$/);
    expect(() => parsePocketArgs(["--step", "6", "--fresh-base", "3", "--out", "f.json"], "/")).toThrow(/^--fresh-base takes 1 or 2; 3 is not$/);
    expect(() => parsePocketArgs(["--step", "6", "--fresh-base", "1"], "/")).toThrow(/^--fresh-base writes to --out <file>$/);
    expect(() => parsePocketArgs(["--step", "6", "--fresh-base", "1", "--arms", "F5", "--out", "f.json"], "/")).toThrow(/^--fresh-base is F5's second fresh play, .*; it takes --out \(not --arms\)$/);
    expect(() => parsePocketArgs(["--step", "6", "--digests"], "/")).toThrow(/^--digests writes its folds to --out <file>$/);
    expect(() => parsePocketArgs(["--step", "6", "--digests", "--shard", "1/3", "--out", "d.json"], "/")).toThrow(/^--digests plays only the golden 50 a league under the step-6 arms \(R-1\); it takes --out \(not --shard\)$/);
    expect(() => parsePocketArgs(["--step", "6", "--digests", "--fresh-base", "2", "--out", "d.json"], "/")).toThrow(/^--fresh-base and --digests are separate runs/);
    for (const flag of ["--fit", "--reselect", "--part1", "--m2", "--probes", "--write-filed"]) expect(() => parsePocketArgs(["--step", "6", flag], "/"), flag).toThrow(new RegExp(`^unknown argument ${flag} \\(pocket -- --step 6 `));
    expect(() => parsePocketArgs(["--step", "6", "--step", "6"], "/")).toThrow(/^--step is given twice$/);
    expect(() => parsePocketArgs(["--step", "6", "--out"], "/")).toThrow(/^--out requires a value$/);
    // A step not built is still refused by name.
    expect(() => parsePocketArgs(["--step", "7"], "/")).toThrow(/^ADR-089: steps 0, 1, 2, 3, 4, 5a, 5b and 6 are built .*; --step 7 is not$/);
  });
});

describe("step 6's gate (plan §10.3), refusing before anything plays", () => {
  it("this build's state: the 5a records are final with no fault or breach and one graded miss; nothing else is on file", () => {
    const st = step6GateState();
    expect(st.s5aFinal).toBe(true);
    expect(st.s5aRecordProblem).toBeUndefined();
    expect(st.s5aOutcome).toEqual({ faults: [], breaches: [], misses: ["s5a.cleanScramble: flat 12.96, gen 6.89 against 2 to 6"] });
    expect(st.amendmentsProblem).toBeUndefined();
    expect(st.viewDigest).toBe(amendmentsDigest(amendmentsAtStep(whole(), "6")));
    expect(st.viewDigest).toBe(AMENDMENTS_DIGEST);
    expect(st.viewPin).toBeNull();
    expect(STEP6_AMENDMENTS_PIN).toBeNull();
    expect(st.ownersAnswer).toBeUndefined();
    expect(st.guard).toBeUndefined();
    expect(st.readings).toBeUndefined();
    expect(st.petitionsOut).toEqual(["P9", "P10", "P11", "P12", "P20"]);
    expect(st.s6Digest).toBeUndefined();
  });

  it("refuses this build, naming every condition it waits for, in the plan's order", () => {
    const st = step6GateState();
    expect(step6GateWaits(st)).toEqual([
      "(2) the owner's words on the 5a miss s5a.cleanScramble, filed in AM-11's rule.gate.step6 (the step-6 view holds no AM-11)",
      `(3) the step-6 view of the amendments file (${AMENDMENTS_DIGEST}) pinned: STEP6_AMENDMENTS_PIN is set when AM-13, step 6's readings, is filed`,
      "(3) step 6's guard map, filed as AM-12 (no filed entry maps step 6's guard bases)",
      "(3) AM-13, step 6's readings, filed with the owner's three answers (spentChecklist, scrambleStart, seen) in its ownersWord",
      "(4) P9, P10, P11, P12, P20 in contracts (each after the owner's typed yes and contracts-guardian's review, then the lift)",
      "(5) pocket-1.s6 recorded (POCKET_1_S6_DIGEST is unset)",
    ]);
    const refusal = step6GateRefusal(st);
    expect(refusal).toMatch(/^ADR-089 step 6: refused before anything plays \(the gate, plan §10\.3\): it waits for \(2\) the owner's words on the 5a miss s5a\.cleanScramble/);
    expect(refusal).toMatch(/; \(5\) pocket-1\.s6 recorded \(POCKET_1_S6_DIGEST is unset\)\. Nothing has played and no cache was made$/);
  });

  it("opens only when all five conditions hold, for every option of each of the owner's three questions", () => {
    let combos = 0;
    for (const spentChecklist of STEP6_ANSWER_OPTIONS.spentChecklist) {
      for (const scrambleStart of STEP6_ANSWER_OPTIONS.scrambleStart) {
        for (const seen of STEP6_ANSWER_OPTIONS.seen) {
          const answers = { spentChecklist, scrambleStart, seen };
          expect(step6AnswersProblem(answers), JSON.stringify(answers)).toBeUndefined();
          expect(step6GateRefusal({ ...OPEN, readings: { answers } }), JSON.stringify(answers)).toBeUndefined();
          // With the petitions this build has (none in contracts), every answer still waits on them, and "unseen" on P21 too.
          const out = step6PetitionsOut(seen);
          expect(out, seen).toEqual(seen === STEP6_UNSEEN_ANSWER ? [...STEP6_PETITIONS, "P21"] : [...STEP6_PETITIONS]);
          expect(step6GateWaits({ ...OPEN, readings: { answers }, petitionsOut: out })).toEqual([`(4) ${out.join(", ")} in contracts (each after the owner's typed yes and contracts-guardian's review, then the lift)`]);
          combos += 1;
        }
      }
    }
    expect(combos).toBe(20);
    expect(STEP6_ANSWER_OPTIONS).toEqual({
      spentChecklist: ["HOLD", "TODAYS_PATH", "SECOND_ESCAPE", "BELOW_30", "CONTAINED_DOES_NOT_SPEND"],
      scrambleStart: ["ZERO_GAIN_ONLY", "EVERY_RUN"],
      seen: ["SEEN", "UNSEEN_IF_UNREGISTERED"],
    });
    expect(step6PetitionsOut()).toEqual([...STEP6_PETITIONS]);
    expect(step6GateRefusal(OPEN)).toBeUndefined();
  });

  it("refuses each condition alone, by name: the 5a records, the owner's words, the view's pin, the guard, the answers, the petitions, the recorded bundle", () => {
    const waitsOf = (st: Step6GateState): readonly string[] => step6GateWaits(st);
    const { s5aOutcome: _o, ...noOutcome } = OPEN;
    expect(waitsOf({ ...noOutcome, s5aRecordProblem: "the 5a records were graded on one seed set (1); only a two-set grade opens step 6" })).toEqual(["(1) the 5a records were graded on one seed set (1); only a two-set grade opens step 6"]);
    expect(waitsOf({ ...OPEN, s5aFinal: false })).toEqual(["(1) the 5a records are not final (STEP5A_RECORDS_FINAL, reports/adr-089-step5a.json)"]);
    expect(waitsOf(noOutcome)).toEqual(["(1) the 5a records are not final (STEP5A_RECORDS_FINAL, reports/adr-089-step5a.json)"]);
    expect(waitsOf({ ...OPEN, s5aOutcome: { faults: ["S-1"], breaches: [], misses: [] } })).toEqual(["(1) the 5a records hold a build fault (S-1); a build fault is fixed, never waived"]);
    expect(waitsOf({ ...OPEN, s5aOutcome: { faults: [], breaches: ["E9 against E0, gen"], misses: [] } })).toEqual(["(1) the 5a records hold an AM-8 breach (E9 against E0, gen); it goes to the owner, and step 6 opens only on 5a records with no breach"]);
    // No graded miss: nothing to answer, so no words are needed.
    const { ownersAnswer: _a, ...noAnswer } = OPEN;
    expect(waitsOf({ ...noAnswer, s5aOutcome: { faults: [], breaches: [], misses: [] } })).toEqual([]);
    expect(waitsOf(noAnswer)).toEqual(["(2) the owner's words on the 5a miss s5a.cleanScramble, filed in AM-11's rule.gate.step6 (the step-6 view holds no AM-11)"]);
    expect(waitsOf({ ...OPEN, ownersAnswer: { s5aMiss: "s5a.cleanOuts", answeredAt: "2026-11-27T14:28:48Z" } })).toEqual(['(2) the owner\'s words on the 5a miss s5a.cleanScramble: AM-11\'s rule.gate.step6 answers "s5a.cleanOuts", not it']);
    expect(waitsOf({ ...OPEN, ownersAnswer: { s5aMiss: "s5a.cleanScramble", answeredAt: "yesterday" } })).toEqual(['(2) the time of the owner\'s words on the 5a miss s5a.cleanScramble: AM-11\'s rule.gate.step6.answeredAt is "yesterday", not an ISO 8601 UTC time']);
    expect(waitsOf({ ...OPEN, ownersAnswer: { s5aMiss: "s5a.cleanScramble", answeredAt: undefined } })).toEqual(["(2) the time of the owner's words on the 5a miss s5a.cleanScramble: AM-11's rule.gate.step6.answeredAt is null, not an ISO 8601 UTC time"]);
    // A second miss the words do not answer.
    expect(waitsOf({ ...OPEN, s5aOutcome: { faults: [], breaches: [], misses: ["s5a.cleanScramble: x", "s5a.under1: y"] } })).toEqual(['(2) the owner\'s words on the 5a miss s5a.under1: AM-11\'s rule.gate.step6 answers "s5a.cleanScramble", not it']);
    const { viewDigest: _d, ...noView } = OPEN;
    expect(waitsOf({ ...noView, amendmentsProblem: "the file does not load" })).toEqual(["(3) an amendments file that loads: the file does not load"]);
    expect(waitsOf({ ...OPEN, viewPin: null })).toEqual(["(3) the step-6 view of the amendments file (fnv1a:view6) pinned: STEP6_AMENDMENTS_PIN is set when AM-13, step 6's readings, is filed"]);
    expect(waitsOf({ ...OPEN, viewPin: "fnv1a:other" })).toEqual(["(3) the step-6 view of the amendments file as pinned: it digests to fnv1a:view6, not STEP6_AMENDMENTS_PIN fnv1a:other; an amendment is append-only"]);
    const { guard: _g, ...noGuard } = OPEN;
    expect(waitsOf(noGuard)).toEqual(["(3) step 6's guard map, filed as AM-12 (no filed entry maps step 6's guard bases)"]);
    expect(waitsOf({ ...OPEN, guard: "AM-1" })).toEqual(["(3) step 6's guard as AM-12 files it: the view's guard at step 6 is AM-1's"]);
    const { readings: _r, ...noReadings } = OPEN;
    expect(waitsOf(noReadings)).toEqual(["(3) AM-13, step 6's readings, filed with the owner's three answers (spentChecklist, scrambleStart, seen) in its ownersWord"]);
    expect(waitsOf({ ...OPEN, petitionsOut: ["P12"] })).toEqual(["(4) P12 in contracts (each after the owner's typed yes and contracts-guardian's review, then the lift)"]);
    expect(waitsOf({ ...OPEN, s6Digest: undefined })).toEqual(["(5) pocket-1.s6 recorded (POCKET_1_S6_DIGEST is unset)"]);
  });

  it("reads the owner's answers as AM-13 files them: one option of each question, and nothing else", () => {
    expect(step6AnswersProblem(RECOMMENDED)).toBeUndefined();
    expect(step6AnswersProblem(undefined)).toBe("AM-13's ownersWord holds no answers (spentChecklist, scrambleStart, seen)");
    expect(step6AnswersProblem(["HOLD"])).toBe("AM-13's ownersWord holds no answers (spentChecklist, scrambleStart, seen)");
    expect(step6AnswersProblem({ ...RECOMMENDED, spentChecklist: "hold" })).toBe('AM-13\'s ownersWord.answers.spentChecklist is "hold", not one of HOLD, TODAYS_PATH, SECOND_ESCAPE, BELOW_30, CONTAINED_DOES_NOT_SPEND');
    expect(step6AnswersProblem({ spentChecklist: "HOLD", scrambleStart: "EVERY_RUN" })).toBe("AM-13's ownersWord.answers.seen is null, not one of SEEN, UNSEEN_IF_UNREGISTERED");
    expect(step6AnswersProblem({ ...RECOMMENDED, extra: "x" })).toBe("AM-13's ownersWord.answers names extra, which no question asks (spentChecklist, scrambleStart, seen)");
    expect(step6GateWaits({ ...OPEN, readings: { answers: { ...RECOMMENDED, scrambleStart: "SOME_RUNS" } } })).toEqual([
      '(3) the owner\'s three answers in AM-13: AM-13\'s ownersWord.answers.scrambleStart is "SOME_RUNS", not one of ZERO_GAIN_ONLY, EVERY_RUN',
    ]);
  });

  it("reads AM-11's words, AM-12's guard and AM-13's answers from a step-6 view (stand-ins on a copy)", () => {
    const j = JSON.parse(JSON.stringify(whole())) as { entries: Record<string, unknown>[] } & AmendmentsFile;
    expect(step6ViewFacts(amendmentsAtStep(j, "6"))).toEqual({});
    const am8 = j.entries.find((e) => e["id"] === "AM-8")!;
    const base = { supersedes: [], untouched: [], defaults: [], adrLines: [946], cites: [], reason: "a stand-in", ownersWord: null };
    j.entries.push({ ...base, id: "AM-11", name: "stand-in", filedBeforeStep: "6", steps: ["6", "5b"], record: "J.9", rule: { gate: { step6: { s5aMiss: "s5a.cleanScramble", answeredAt: "2026-11-27T14:28:48Z" } } } });
    j.entries.push({ ...JSON.parse(JSON.stringify(am8)), id: "AM-12", filedBeforeStep: "6", steps: ["6"], rule: { ...(am8["rule"] as object), bases: { "6": { H0: "F5", F5: "D1" } }, freshBases: { F5: "fresh" } } });
    j.entries.push({ ...base, id: "AM-13", name: "stand-in", filedBeforeStep: "6", steps: ["6", "5b"], record: "J.11", ownersWord: { ts: "2026-11-28T00:00:00Z", answers: RECOMMENDED }, rule: { readings: {} } });
    expect(amendmentsProblems(j, loadFiled(FILED))).toEqual([]);
    const facts = step6ViewFacts(amendmentsAtStep(j, "6"));
    expect(facts).toEqual({ ownersAnswer: { s5aMiss: "s5a.cleanScramble", answeredAt: "2026-11-27T14:28:48Z" }, guard: "AM-12", readings: { answers: RECOMMENDED } });
    // 5a's view holds none of them.
    expect(step6ViewFacts(amendmentsAtStep(j, "5a"))).toEqual({});
  });

  it("step6Command refuses before anything plays, whatever the arguments, and makes no cache; an open gate in this build still plays nothing", async () => {
    const cache = join(scratch, "cache");
    const lines: string[] = [];
    const log = (line: string): void => {
      lines.push(line);
    };
    const refusal = step6GateRefusal(step6GateState())!;
    for (const args of [parseStep6Args(["--step", "6", "--cache", cache]), parseStep6Args(["--step", "6", "--digests", "--out", join(scratch, "d.json")]), parseStep6Args(["--step", "6", "--fresh-base", "2", "--out", join(scratch, "f.json")])]) {
      await expect(step6Command(args, log)).rejects.toThrow(refusal);
    }
    await expect(pocketCommand(["--step", "6", "--cache", cache])).rejects.toThrow(refusal);
    expect(existsSync(cache)).toBe(false);
    expect(existsSync(join(scratch, "d.json")) || existsSync(join(scratch, "f.json"))).toBe(false);
    expect(lines).toEqual([]);
    await expect(step6Command({ step: 6 }, log, OPEN)).rejects.toThrow(STEP6_HARNESS_REFUSAL);
    expect(lines).toEqual(["ADR-089 step 6: the arms: the gate is open"]);
  });
});

describe("step 5b under the played order (plan §3.1 item 6)", () => {
  it("5b's pin is its view, which holds every entry filed before step 6 (the whole file in this build); its preflight passes; it is still held by the owner's Wait", () => {
    const file = whole();
    expect(amendmentsDigest(amendmentsAtStep(file, "5b"))).toBe(STEP5B_AMENDMENTS_PIN);
    expect(STEP5B_AMENDMENTS_PIN).toBe(AMENDMENTS_DIGEST);
    expect(STEP5A_AMENDMENTS_PIN).toBe("fnv1a:3f9478eb");
    const b = preflightStep5("5b", FILED, AMEND).guard;
    expect([b.am8, b.readings]).toEqual(["AM-8", "AM-10"]);
    expect(b.bases).toEqual({ F5: "D1", F0: "F5" });
    expect(step5GateRefusal("5b", step5GateState())).toBe(`ADR-089 step 5b: refused before anything plays (the gate, plan §9 item 10): ${STEP5B_WAIT_REFUSAL}. Nothing has played and no cache was made`);
    expect(step5GateRefusal("5a", step5GateState())).toBeUndefined();
  });
});
