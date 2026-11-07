/**
 * ADR-089 step 4 — THE STEP-4 HARNESS (`step4.ts`; plan §5, §8, §9 commit 8).
 *
 * AM-6 and AM-7 are not filed in this build, and P6, P7 and P8 are not in contracts, so no D arm
 * plays and every graded run is refused by name. These tests:
 *  - prove the refusals in their order (AM-6, AM-7, the pin, the gates) on temporary copies of the
 *    committed amendments file with stand-ins for AM-6 and AM-7 appended (the filing's §2.1 and §3.1
 *    texts; only these tests read them; nothing is filed);
 *  - grade hand-built records (step 3's committed records of the bases, re-formatted, and D records
 *    built from their bases' with hand-made s4 folds) with the gates passed in as granted;
 *  - check the stamp-free projection against step 3's records, the plan's refusal of a D arm, the
 *    cache's refusal from a dirty tree, `--digests`' refusal and the closed writes.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, loadAmendments, STEP3_AMENDMENTS_DIGEST } from "../src/pocket/amendments.js";
import { STEP4_ARM_IDS, type ArmId } from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import type { SeedSet } from "../src/pocket/corpus.js";
import { loadFiled } from "../src/pocket/filed.js";
import { am6Refusal, s4MotionIntReading } from "../src/pocket/guardAm1.js";
import { emptyM3Fold } from "../src/pocket/m3SackerMix.js";
import { emptyM6Step4Fold } from "../src/pocket/m6Contact.js";
import { renderStep4Sections } from "../src/pocket/report.js";
import { STEP4_PETITIONS_GRANTED } from "../src/pocket/rules.js";
import { emptyS4Fold, type S4Fold } from "../src/pocket/s4Stream.js";
import { jsonText, type Step1Env } from "../src/pocket/step1.js";
import {
  closedStep4Writes,
  gradeStep4,
  loadStep3References,
  part1Findings,
  planStep4,
  preflightStep4,
  preflightStep4Previews,
  q4Problems,
  q4Projection,
  renderStep4Report,
  runStep4,
  runStep4Digests,
  runStep4Part1,
  STEP3_RECORDS_JSON,
  STEP4_AMENDMENTS_PIN,
  STEP4_ARM_FORMAT,
  STEP4_BASE_IDS,
  STEP4_DIGESTS_REFUSAL,
  STEP4_DIRTY_REFUSAL,
  STEP4_GATES_REFUSAL,
  STEP4_PLAYABLE_RUN_IDS,
  step4FoldsOf,
  type Step4Guard,
  type Step4Record,
  type Step4Records,
} from "../src/pocket/step4.js";

const PKG = resolve(import.meta.dirname, "..");
const FILED = join(PKG, FILED_PATH);
const AMENDMENTS = join(PKG, AMENDMENTS_PATH);
const ENV: Step1Env = { fingerprint: "0123456789abcdef", commit: "c".repeat(40), dirty: false, node: "v22.0.0-test" };

const scratch: string[] = [];
const tempDir = (label: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `ff-step4-${label}-`));
  scratch.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const AM1_RULE_BUT_BASES = {
  base: "previousStepArm",
  pricingBase: "previousStepPricingArm",
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
};

/** AM-6's machine entry (step-4 filing §2.1) with stand-in text for its one placeholder; tests only. */
const AM6_STAND_IN = {
  id: "AM-6",
  name: "the guard at step 4: the design, its pricing arm and the motion alone against step 3's arms",
  filedBeforeStep: "4",
  steps: ["4"],
  supersedes: ["guard.mix", "guard.byClass", "s4.motion.int"],
  untouched: ["acc.intGuard", "s5a.int"],
  defaults: ["D9", "D28"],
  adrLines: [1306, 1308, 1036],
  cites: [932, 944, 1287, 1159, 1053],
  record: "ADR-089 Appendix H, H.8",
  reason: "a stand-in for AM-6 in the tests only: D1 against C1, D2 against C2 and D6 against C2, as the step-4 filing's §2.1 maps them",
  ownersWord: null,
  rule: { ...AM1_RULE_BUT_BASES, bases: { "4": { D1: "C1", D2: "C2", D6: "C2" } } },
};

/** AM-7's machine entry (step-4 filing §3.1), its readings cut to their names; tests only. */
const AM7_STAND_IN = {
  id: "AM-7",
  name: "step 4: the arms the clauses read, the hit construct, the tilts' reading and the chosen values",
  filedBeforeStep: "4",
  steps: ["4"],
  supersedes: ["s4.tilt.pushBlocked", "s4.tilt.freeRun", "s4.tilt.behindNever"],
  untouched: [
    "s4.contact.flat.sack", "s4.contact.gen.sack", "s4.contact.pressure", "s4.contact.hitOrSack", "s4.contact.gen.share", "s4.contact.flat.share", "s4.motion.hits", "s4.motion.curveRises",
    "s4.falsifier.ratingProbes", "s4.falsifier.release", "s4.reading", "s4.sackerMix.edge", "s4.sackerMix.interior", "s4.bRange", "s4.sackCredit", "s4.qbHitFields",
  ],
  defaults: ["D11", "D14", "D21", "D34"],
  adrLines: [1036, 1040, 1041, 1042, 1043],
  cites: [653, 660, 672, 692, 698, 944, 932],
  record: "ADR-089 Appendix H, H.9",
  reason: "a stand-in for AM-7 in the tests only",
  ownersWord: null,
  rule: { readings: { "s4.contact.arm": "D3 against A0", "s4.motion.arm": "D6 against C2", "s4.tilt.reading": "D9, D10, D11 against D8; first rated :contest; 2 SE; 30 contacts" } },
};

type AmendmentsJson = Record<string, unknown> & { entries: Record<string, unknown>[] };
let written = 0;
/** A temporary copy of the committed amendments file with `entries` appended; its path and its step-4 view's digest. */
function withEntries(...entries: Record<string, unknown>[]): { readonly path: string; readonly pin: string } {
  const json = JSON.parse(readFileSync(AMENDMENTS, "utf8")) as AmendmentsJson;
  json.entries.push(...structuredClone(entries));
  written += 1;
  const path = join(DIR, `amendments-${String(written)}.json`);
  writeFileSync(path, jsonText(json));
  return { path, pin: amendmentsDigest(amendmentsAtStep(loadAmendments(path, loadFiled(FILED)), "4")) };
}
const DIR = tempDir("am");
const BOTH = withEntries(AM6_STAND_IN, AM7_STAND_IN);
const granted = { pin: BOTH.pin, petitions: STEP4_PETITIONS_GRANTED };

describe("the refusals, in order", () => {
  it("the committed file holds no AM-6: refused by AM-6's name, before anything plays", () => {
    expect(STEP4_AMENDMENTS_PIN).toBeNull();
    expect(() => preflightStep4(FILED, AMENDMENTS)).toThrow(/^ADR-089 step 4: refused to read s4\.motion\.int: AM-6 \(the guard at step 4/);
    expect(am6Refusal("x")).toMatch(/is not filed in the amendments file's step-4 view: x\./);
  });

  it("AM-6 alone: refused by AM-7's name", () => {
    const only6 = withEntries(AM6_STAND_IN);
    expect(() => preflightStep4(FILED, only6.path, { pin: only6.pin, petitions: STEP4_PETITIONS_GRANTED })).toThrow(/^ADR-089 step 4: refused to grade: AM-7 \(step 4's readings/);
    const short7 = withEntries(AM6_STAND_IN, { ...AM7_STAND_IN, supersedes: ["s4.tilt.pushBlocked"] });
    expect(() => preflightStep4(FILED, short7.path, { pin: short7.pin })).toThrow(/AM-7 does not supersede s4\.tilt\.freeRun, s4\.tilt\.behindNever/);
  });

  it("AM-6 must map D6 on C2 and every D arm on this build's base", () => {
    const wrong = withEntries({ ...AM6_STAND_IN, rule: { ...AM1_RULE_BUT_BASES, bases: { "4": { D1: "C1", D2: "C2", D6: "C1" } } } }, AM7_STAND_IN);
    expect(() => preflightStep4(FILED, wrong.path, { pin: wrong.pin })).toThrow(/refused to read s4\.motion\.int: .*reads D6 against C1, not C2/);
    const off = withEntries({ ...AM6_STAND_IN, rule: { ...AM1_RULE_BUT_BASES, bases: { "4": { D1: "C2", D2: "C2", D6: "C2" } } } }, AM7_STAND_IN);
    expect(() => preflightStep4(FILED, off.path, { pin: off.pin })).toThrow(/AM-6's step-4 base map reads D1 against C2, and this build's arm against C1/);
  });

  it("AM-6 and AM-7 filed: refused while step 4's view is not pinned, then on a wrong pin", () => {
    expect(() => preflightStep4(FILED, BOTH.path)).toThrow(/^ADR-089 step 4: refused to grade: step 4's view of the amendments file \(fnv1a:[0-9a-f]{8}\) is not pinned/);
    expect(() => preflightStep4(FILED, BOTH.path, { pin: "fnv1a:00000000" })).toThrow(/digests to fnv1a:[0-9a-f]{8}, not the pin fnv1a:00000000/);
  });

  it("pinned: refused while P6, P7 or P8 is out; with all three given, the guard reads", () => {
    expect(() => preflightStep4(FILED, BOTH.path, { pin: BOTH.pin })).toThrow(STEP4_GATES_REFUSAL);
    expect(() => preflightStep4(FILED, BOTH.path, { pin: BOTH.pin, petitions: { P6: true, P7: true } })).toThrow(STEP4_GATES_REFUSAL);
    const g = preflightStep4(FILED, BOTH.path, granted).guard;
    expect(g).toMatchObject({ am6: "AM-6", am7: "AM-7", bases: { D1: "C1", D2: "C2", D6: "C2" }, lines: { zLeague: 2, zClass: 3, zSetSE0: 0 } });
  });

  it("the previews: step 3's view never moves, so step 3's records keep grading", () => {
    const v = preflightStep4Previews(FILED, BOTH.path);
    expect(amendmentsDigest(amendmentsAtStep(loadAmendments(BOTH.path, loadFiled(FILED)), "3"))).toBe(STEP3_AMENDMENTS_DIGEST);
    expect(v.view.entries.map((e) => e.id).slice(-2)).toEqual(["AM-6", "AM-7"]);
    // An entry filed before step 3 after the fact moves step 3's view: refused.
    const late = withEntries({ ...AM7_STAND_IN, id: "AM-6", filedBeforeStep: "3", steps: ["3"], supersedes: [], untouched: [] });
    expect(() => preflightStep4Previews(FILED, late.path)).toThrow(/step-3 view digests to fnv1a:[0-9a-f]{8}, not fnv1a:517bb9fe/);
  });

  it("runStep4 refuses before any cache is made, by the same names", () => {
    const parent = tempDir("cache");
    const play = (): Step4Record => {
      throw new Error("nothing plays");
    };
    expect(() => runStep4({ cacheParent: parent, filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, play })).toThrow(/AM-6/);
    expect(() => runStep4({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: ENV, play, preflight: { pin: BOTH.pin } })).toThrow(STEP4_GATES_REFUSAL);
    expect(() => runStep4({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: { ...ENV, dirty: true }, play, preflight: granted })).toThrow(STEP4_DIRTY_REFUSAL);
    expect(existsSync(join(parent, ENV.fingerprint))).toBe(false);
  });

  it("s4.motion.int refuses without AM-6 and reads D6 against C2 under it", () => {
    const view = preflightStep4Previews(FILED, AMENDMENTS).view;
    const mix = { aimedByBin: [10, 30, 40, 20, 10, 5, 2], interceptions: 3 };
    expect(() => s4MotionIntReading(view, { 1: mix, 2: mix }, { 1: mix, 2: mix }, "RAW")).toThrow(/AM-6/);
    const r = s4MotionIntReading(preflightStep4Previews(FILED, BOTH.path).view, { 1: mix, 2: mix }, { 1: mix, 2: mix }, "RAW");
    expect(r).toMatchObject({ clause: "s4.motion.int", entry: "AM-6", arm: "D6", base: "C2" });
    expect(r.reading.verdict).toBe("PASS");
  });
});

describe("the plan, --part1, --digests and the closed writes", () => {
  it("plays the bases only before the lift and refuses a D arm by its petitions", () => {
    expect(STEP4_PLAYABLE_RUN_IDS).toEqual(["A0", "A14", "A1", "A11", "C1", "C2", "C14"]);
    expect(STEP4_BASE_IDS).toEqual(STEP4_PLAYABLE_RUN_IDS);
    expect(planStep4({}).complete).toHaveLength(14);
    expect(planStep4({ shard: { index: 2, count: 3 } }).mine.map((t) => `${t.id}.${String(t.seedSet)}`)).toEqual(["A0.2", "A1.1", "A11.2", "C2.1", "C14.2"]);
    for (const id of STEP4_ARM_IDS) expect(() => planStep4({ arms: [id] })).toThrow(new RegExp(`${id} is not playable: ${id} waits on petitions P6, P7 and P8`));
    expect(() => planStep4({ arms: ["B3"] })).toThrow(/B3 is not in this run/);
    expect(step4FoldsOf("C1")).toEqual({ m5: false });
  });

  it("--part1 refuses a dirty tree before a cache is made, and --digests refuses while the gates are false", () => {
    const parent = tempDir("p1");
    expect(() => runStep4Part1({ cacheParent: parent, filedPath: FILED, amendmentsPath: AMENDMENTS, env: { ...ENV, dirty: true } })).toThrow(STEP4_DIRTY_REFUSAL);
    expect(existsSync(join(parent, ENV.fingerprint))).toBe(false);
    expect(() => runStep4Part1({ cacheParent: parent, filedPath: FILED, amendmentsPath: AMENDMENTS, env: ENV, arms: ["D1"] })).toThrow(/D1 is not playable/);
    expect(() => runStep4Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v" })).toThrow(STEP4_DIGESTS_REFUSAL);
  });

  it("never writes over steps 1 to 3's committed records", () => {
    expect(closedStep4Writes({ report: "reports/adr-089-step3.md", out: "reports/adr-089-step2.json" }, PKG)).toEqual(["--report reports/adr-089-step3.md", "--out reports/adr-089-step2.json"]);
    expect(closedStep4Writes({ report: "reports/adr-089-step4.md" }, PKG)).toEqual([]);
    expect(closedStep4Writes({ report: "reports/adr-089-step4.md" }, PKG, PKG, true)).toEqual(["--report reports/adr-089-step4.md"]);
  });
});

// --- grading hand-built records --------------------------------------------------------------------

const REFS = loadStep3References();
const step3Of = (id: ArmId, s: SeedSet): Record<string, unknown> => {
  const r = REFS.get(`${id}.set${String(s)}`);
  if (r === undefined) throw new Error(`${STEP3_RECORDS_JSON} holds no ${id}.set${String(s)}`);
  return r as Record<string, unknown>;
};
const folds = (f: S4Fold = emptyS4Fold()) => ({ s4: f, m3: emptyM3Fold(), m6: emptyM6Step4Fold() });
/** Step 3's record of `from`, re-formatted as a step-4 record of `id`, with `s4` its s4 fold on both leagues. */
const recordOf = (id: ArmId, from: ArmId, s: SeedSet, s4: S4Fold = emptyS4Fold()): Step4Record => {
  const r = structuredClone(step3Of(from, s));
  delete r["m5"];
  return { ...r, format: STEP4_ARM_FORMAT, stamp: { ...(r["stamp"] as object), arm: id }, s4: { flat: folds(s4), gen: folds(s4) } } as unknown as Step4Record;
};
const tilted = (cls: "PUSH_BLOCKED" | "FREE_RUN" | "BEHIND_NEVER", contacts: number, sacks: number): S4Fold => {
  const f = emptyS4Fold();
  f.s4Plays = 100;
  f.byClass[cls] = { contacts, sacks };
  return f;
};

describe("gradeStep4 on hand-built records (pure)", () => {
  const guard: Step4Guard = preflightStep4(FILED, BOTH.path, granted).guard;
  const records = new Map<ArmId, Partial<Record<SeedSet, Step4Record>>>();
  for (const id of STEP4_BASE_IDS) records.set(id, { 1: recordOf(id, id, 1), 2: recordOf(id, id, 2) });
  const d = (id: ArmId, from: ArmId, s4: (s: SeedSet) => S4Fold = () => emptyS4Fold()): void => {
    records.set(id, { 1: recordOf(id, from, 1, s4(1)), 2: recordOf(id, from, 2, s4(2)) });
  };
  d("D1", "C1");
  d("D2", "C2");
  d("D3", "A0");
  d("D6", "C2");
  d("D8", "C2", () => {
    const f = emptyS4Fold();
    f.byClass = { PUSH_BLOCKED: { contacts: 200, sacks: 60 }, FREE_RUN: { contacts: 200, sacks: 60 }, BEHIND_NEVER: { contacts: 5, sacks: 1 }, NONE: { contacts: 0, sacks: 0 } };
    return f;
  });
  d("D9", "C2", () => tilted("PUSH_BLOCKED", 200, 40));
  d("D10", "C2", () => tilted("FREE_RUN", 200, 30));
  d("D11", "C2", () => tilted("BEHIND_NEVER", 5, 3));
  const file = loadFiled(FILED);
  const grade = gradeStep4(records, file, guard, REFS);
  const s = grade.sections;
  const clause = (id: string) => s.clauses.find((c) => c.id === id)!;

  it("reads all twenty s4 clauses", () => {
    expect(s.clauses.map((c) => c.id).sort()).toEqual(file.bands.clauses.filter((c) => c.step === "4").map((c) => c.id).sort());
    expect(s.clauses).toHaveLength(20);
  });

  it("the re-played bases equal step 3's records on the stamp-free projection; a moved field is named", () => {
    expect(s.replay).toHaveLength(14);
    expect(s.replay.every((r) => r.verdict === "PASS")).toBe(true);
    const moved = recordOf("C1", "C1", 1);
    (moved as unknown as { report: { timeToThrow: unknown } }).report.timeToThrow = 0;
    expect(q4Problems(moved, step3Of("C1", 1))).toEqual(["report"]);
    expect(Object.keys(q4Projection(recordOf("C1", "C1", 1)))).not.toContain("s4");
  });

  it("the tilts under AM-7: D9 down, D10 up, D11 unreadable under 30 contacts; summed over leagues and sets", () => {
    const t = (id: string) => s.tilts.find((x) => x.clause === id)!;
    expect(t("s4.tilt.pushBlocked")).toMatchObject({ arm: "D9", against: "D8", direction: "DOWN", verdict: "PASS", tilted: { contacts: 800, sacks: 160 }, untilted: { contacts: 800, sacks: 240 } });
    expect(t("s4.tilt.freeRun")).toMatchObject({ arm: "D10", direction: "UP", verdict: "FAIL" });
    // Under 30 contacts a side even summed (20 against 20).
    expect(t("s4.tilt.behindNever").verdict).toBe("UNREADABLE");
    expect(clause("s4.tilt.behindNever").verdict).toBe("NOT JUDGED");
    expect(s.outcome.gradedFailures.some((f) => f.startsWith("s4.tilt.freeRun"))).toBe(true);
    expect(s.outcome.next.some((f) => f.startsWith("s4.tilt.behindNever is unreadable"))).toBe(true);
    // A tilt against its direction also fails s4.qbHitFields (the filed text's "also").
    expect(clause("s4.qbHitFields").verdict).toBe("FAIL");
  });

  it("the guard under AM-6 on D1, D2 and D6: an arm equal to its base breaches nothing; the own-clock print is beside", () => {
    expect(s.guard.map((g) => `${g.arm}:${g.against}:${g.league}`)).toEqual(["D1:C1:flat", "D1:C1:gen", "D2:C2:flat", "D2:C2:gen", "D6:C2:flat", "D6:C2:gen"]);
    for (const g of s.guard) {
      expect(g.verdict).toBe("PASS");
      expect(g.ownClock).toHaveLength(2);
    }
    expect(clause("s4.motion.int").verdict).toBe("PASS");
    // D6 equal to C2 adds no hit: the motion's band (at least +3) fails.
    expect(clause("s4.motion.hits").verdict).toBe("FAIL");
  });

  it("s4.motion.int reads D6 against C2 in that direction: D6 riskier breaches, D6 safer passes", () => {
    const scaled = (k: number): Step4Records => {
      const m = new Map(records);
      const bump = (r: Step4Record): Step4Record => {
        const c = structuredClone(r) as unknown as { report: { intGuard: Record<string, { all: { interceptions: number } }> } };
        for (const l of ["flat", "gen"]) c.report.intGuard[l]!.all.interceptions = Math.round(c.report.intGuard[l]!.all.interceptions * k);
        return c as unknown as Step4Record;
      };
      const d6 = records.get("D6")!;
      m.set("D6", { 1: bump(d6[1]!), 2: bump(d6[2]!) });
      return m;
    };
    const verdictAt = (k: number): string => gradeStep4(scaled(k), file, guard, REFS).sections.clauses.find((c) => c.id === "s4.motion.int")!.verdict;
    expect(verdictAt(3)).toBe("FAIL");
    expect(verdictAt(0)).toBe("PASS");
  });

  it("the arms not played are NOT PLAYED; the falsifiers wait; the merge card is not posted with a structural failure", () => {
    expect(clause("s4.bRange").verdict).toBe("NOT PLAYED");
    expect(clause("s4.falsifier.release")).toMatchObject({ verdict: "NOT CHECKED" });
    expect(clause("s4.falsifier.release").note).toMatch(/waits for the lift/);
    expect(clause("s4.sackCredit").verdict).toBe("PASS");
    expect(s.outcome.mergeCard).toBe(false);
    const text = renderStep4Report(grade, records);
    expect(text).toMatch(/^# ADR-089 step 4: the arms/);
    expect(renderStep4Sections(s).join("\n")).toMatch(/## Waiting, by name/);
  });

  it("a one-set run grades nothing", () => {
    const one = gradeStep4(records, file, guard, REFS, 1).sections;
    expect(one.clauses.filter((c) => c.verdict === "PASS" || c.verdict === "FAIL").map((c) => c.id).sort()).toEqual(["s4.qbHitFields", "s4.sackCredit"]);
    expect(one.outcome.gradedFailures).toEqual([]);
  });

  it("--part1's findings: the bases' replay equal, a stream problem named", () => {
    const bad = emptyS4Fold();
    bad.problemCount = 1;
    bad.problems = ["p1: C-1"];
    const r = part1Findings(new Map([["C1", { 1: recordOf("C1", "C1", 1, bad) }]]), REFS);
    expect(r.problems).toEqual(["C1 set 1 flat: the s4 stream, 1 problem(s), first: p1: C-1", "C1 set 1 gen: the s4 stream, 1 problem(s), first: p1: C-1"]);
    expect(r.lines.some((l) => l === "C1 set 1: the replay equals step 3's record")).toBe(true);
  });
});
