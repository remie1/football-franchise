/**
 * ADR-089 step 4 — THE STEP-4 HARNESS (`step4.ts`; plan §5, §8, §9 commit 8).
 *
 * AM-6 and AM-7 are filed (ADR-089 Appendix H, H.8 and H.9) and step 4's view is pinned
 * (`STEP4_AMENDMENTS_PIN`); P6, P7 and P8 are in contracts, so the D arms are planned and built and
 * the committed file is refused nothing (the gates refuse only a test's withheld petition). These tests:
 *  - read AM-6 and AM-7 from the committed file, and prove the refusals in their order (AM-6, AM-7,
 *    the pin, the gates) on temporary copies of it cut to AM-5, with AM-6 and AM-7 (or changed copies
 *    of them) appended;
 *  - grade hand-built records (step 3's committed records of the bases, re-formatted, and D records
 *    built from their bases' with hand-made s4 folds) with the gates passed in as granted;
 *  - check the stamp-free projection against step 3's records, the plan's D arms, the cache's
 *    refusal from a dirty tree, `--digests`' refusal of a withheld petition and the closed writes.
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
import { POCKET_1_S4_MOTION, STEP4_PETITIONS_GRANTED } from "../src/pocket/rules.js";
import { emptyS4Fold, type S4Fold } from "../src/pocket/s4Stream.js";
import { jsonText, type Step1Env } from "../src/pocket/step1.js";
import {
  closedStep4Writes,
  gradeStep4,
  isStep4ArmId,
  loadStep3References,
  part1Findings,
  STEP4_TL_LINE,
  planStep4,
  preflightStep4,
  preflightStep4Previews,
  q4Problems,
  q4Projection,
  readingProblems,
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

type AmendmentsJson = Record<string, unknown> & { entries: Record<string, unknown>[] };
/** The committed amendments file as plain JSON (AM-1 to AM-7; AM-6 and AM-7 filed before step 4, ADR-089 Appendix H, H.8 and H.9). */
const COMMITTED = JSON.parse(readFileSync(AMENDMENTS, "utf8")) as AmendmentsJson;
const entryJson = (id: string): Record<string, unknown> => {
  const found = COMMITTED.entries.find((x) => x["id"] === id);
  if (found === undefined) throw new Error(`the committed file holds no ${id}`);
  return found;
};
/** AM-6 and AM-7 as committed. */
const AM6 = entryJson("AM-6");
const AM7 = entryJson("AM-7");

let written = 0;
/**
 * A temporary copy of the committed amendments file cut to the entries filed before step 4 (AM-1
 * to AM-5), with `entries` appended; its path and its step-4 view's digest. With AM-6 and AM-7 as
 * committed it is the committed file again; a cut or changed copy proves a refusal.
 */
function withEntries(...entries: Record<string, unknown>[]): { readonly path: string; readonly pin: string } {
  const json = structuredClone(COMMITTED);
  json.entries = json.entries.filter((x) => x["id"] !== "AM-6" && x["id"] !== "AM-7");
  json.entries.push(...structuredClone(entries));
  written += 1;
  const path = join(DIR, `amendments-${String(written)}.json`);
  writeFileSync(path, jsonText(json));
  return { path, pin: amendmentsDigest(amendmentsAtStep(loadAmendments(path, loadFiled(FILED)), "4")) };
}
const DIR = tempDir("am");
const BOTH = withEntries(AM6, AM7);
/** The file cut to AM-5: neither AM-6 nor AM-7 filed. */
const NONE = withEntries();
const granted = { pin: BOTH.pin, petitions: STEP4_PETITIONS_GRANTED };

describe("the refusals, in order", () => {
  it("the committed file holds AM-6 and AM-7 and is pinned: with P6, P7 and P8 in contracts, nothing is refused", () => {
    expect(STEP4_AMENDMENTS_PIN).toBe("fnv1a:e0c05cf0");
    expect(BOTH.pin, "the copy with AM-6 and AM-7 as committed is the committed file").toBe(STEP4_AMENDMENTS_PIN);
    expect(amendmentsDigest(amendmentsAtStep(loadAmendments(AMENDMENTS, loadFiled(FILED)), "4"))).toBe(STEP4_AMENDMENTS_PIN);
    const g = preflightStep4(FILED, AMENDMENTS).guard;
    expect(g).toMatchObject({ am6: "AM-6", am6Record: "ADR-089 Appendix H, H.8", am7: "AM-7", am7Record: "ADR-089 Appendix H, H.9", bases: { D1: "C1", D2: "C2", D6: "C2" }, lines: { zLeague: 2, zClass: 3, zSetSE0: 0 } });
    expect(Object.keys(g.readings)).toHaveLength(16);
  });

  it("AM-6's rule is AM-1's but for its bases, and AM-7 carries no guard rule", () => {
    const am1 = structuredClone(entryJson("AM-1")["rule"]) as Record<string, unknown>;
    const am6 = structuredClone(AM6["rule"]) as Record<string, unknown>;
    expect(am6["bases"]).toEqual({ "4": { D1: "C1", D2: "C2", D6: "C2" } });
    delete am1["bases"];
    delete am6["bases"];
    expect(am6).toEqual(am1);
    expect({ ...AM1_RULE_BUT_BASES }).toEqual(am6);
    expect(Object.keys(AM7["rule"] as Record<string, unknown>)).toEqual(["readings"]);
    // AM-7 files the motion's CHOSEN values the s4 bundle plays (rho0 0.3 s, rho_d 400).
    const chosen = String(((AM7["rule"] as Record<string, unknown>)["readings"] as Record<string, unknown>)["chosen"]);
    expect(chosen).toMatch(/^rho0 0\.3 s and rho_d 400 \(rho 0\.2275 to 0\.4725 s/);
    expect({ rho0: POCKET_1_S4_MOTION.rho0, rhoD: POCKET_1_S4_MOTION.rhoD }).toEqual({ rho0: 0.3, rhoD: 400 });
    expect([AM6["ownersWord"], AM7["ownersWord"]], "shown to the owner, not asked").toEqual([null, null]);
  });

  it("the file cut to AM-5 holds no AM-6: refused by AM-6's name, before anything plays", () => {
    expect(() => preflightStep4(FILED, NONE.path, { pin: NONE.pin })).toThrow(/^ADR-089 step 4: refused to read s4\.motion\.int: AM-6 \(the guard at step 4/);
    expect(am6Refusal("x")).toMatch(/is not filed in the amendments file's step-4 view: x\./);
  });

  it("AM-6 alone: refused by AM-7's name", () => {
    const only6 = withEntries(AM6);
    expect(() => preflightStep4(FILED, only6.path, { pin: only6.pin, petitions: STEP4_PETITIONS_GRANTED })).toThrow(/^ADR-089 step 4: refused to grade: AM-7 \(step 4's readings/);
    const short7 = withEntries(AM6, { ...AM7, supersedes: ["s4.tilt.pushBlocked"] });
    expect(() => preflightStep4(FILED, short7.path, { pin: short7.pin })).toThrow(/AM-7 does not supersede s4\.tilt\.freeRun, s4\.tilt\.behindNever/);
  });

  it("AM-6 must map D6 on C2 and every D arm on this build's base", () => {
    const wrong = withEntries({ ...AM6, rule: { ...AM1_RULE_BUT_BASES, bases: { "4": { D1: "C1", D2: "C2", D6: "C1" } } } }, AM7);
    expect(() => preflightStep4(FILED, wrong.path, { pin: wrong.pin })).toThrow(/refused to read s4\.motion\.int: .*reads D6 against C1, not C2/);
    const off = withEntries({ ...AM6, rule: { ...AM1_RULE_BUT_BASES, bases: { "4": { D1: "C2", D2: "C2", D6: "C2" } } } }, AM7);
    expect(() => preflightStep4(FILED, off.path, { pin: off.pin })).toThrow(/AM-6's step-4 base map reads D1 against C2, and this build's arm against C1/);
  });

  it("AM-6 and AM-7 filed: refused under no pin (as before the filing commit), then on a wrong pin", () => {
    expect(() => preflightStep4(FILED, BOTH.path, { pin: null })).toThrow(/^ADR-089 step 4: refused to grade: step 4's view of the amendments file \(fnv1a:[0-9a-f]{8}\) is not pinned/);
    expect(() => preflightStep4(FILED, BOTH.path, { pin: "fnv1a:00000000" })).toThrow(/digests to fnv1a:[0-9a-f]{8}, not the pin fnv1a:00000000/);
  });

  it("pinned: refused when a test withholds P6, P7 or P8; with all three in contracts, the guard reads", () => {
    for (const withheld of [{ P6: false }, { P7: false }, { P8: false }]) {
      expect(() => preflightStep4(FILED, BOTH.path, { pin: BOTH.pin, petitions: withheld })).toThrow(STEP4_GATES_REFUSAL);
    }
    expect(preflightStep4(FILED, BOTH.path, { pin: BOTH.pin }).guard).toEqual(preflightStep4(FILED, BOTH.path, granted).guard);
    const g = preflightStep4(FILED, BOTH.path, granted).guard;
    expect(g).toMatchObject({ am6: "AM-6", am7: "AM-7", bases: { D1: "C1", D2: "C2", D6: "C2" }, lines: { zLeague: 2, zClass: 3, zSetSE0: 0 } });
  });

  it("the previews: step 3's view never moves, so step 3's records keep grading", () => {
    const v = preflightStep4Previews(FILED, BOTH.path);
    expect(amendmentsDigest(amendmentsAtStep(loadAmendments(BOTH.path, loadFiled(FILED)), "3"))).toBe(STEP3_AMENDMENTS_DIGEST);
    expect(v.view.entries.map((e) => e.id).slice(-2)).toEqual(["AM-6", "AM-7"]);
    // An entry filed before step 3 after the fact moves step 3's view: refused.
    const late = withEntries({ ...AM7, id: "AM-6", filedBeforeStep: "3", steps: ["3"], supersedes: [], untouched: [] });
    expect(() => preflightStep4Previews(FILED, late.path)).toThrow(/step-3 view digests to fnv1a:[0-9a-f]{8}, not fnv1a:517bb9fe/);
  });

  it("runStep4 refuses before any cache is made, by the same names", () => {
    const parent = tempDir("cache");
    const play = (): Step4Record => {
      throw new Error("nothing plays");
    };
    expect(() => runStep4({ cacheParent: parent, filedPath: FILED, amendmentsPath: NONE.path, env: ENV, play, preflight: { pin: NONE.pin } })).toThrow(/AM-6/);
    expect(() => runStep4({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: ENV, play, preflight: { pin: BOTH.pin, petitions: { P7: false } } })).toThrow(STEP4_GATES_REFUSAL);
    expect(() => runStep4({ cacheParent: parent, filedPath: FILED, amendmentsPath: BOTH.path, env: { ...ENV, dirty: true }, play, preflight: granted })).toThrow(STEP4_DIRTY_REFUSAL);
    expect(existsSync(join(parent, ENV.fingerprint))).toBe(false);
  });

  it("s4.motion.int refuses without AM-6 and reads D6 against C2 under it", () => {
    const view = preflightStep4Previews(FILED, NONE.path).view;
    const mix = { aimedByBin: [10, 30, 40, 20, 10, 5, 2], interceptions: 3 };
    expect(() => s4MotionIntReading(view, { 1: mix, 2: mix }, { 1: mix, 2: mix }, "RAW")).toThrow(/AM-6/);
    const r = s4MotionIntReading(preflightStep4Previews(FILED, BOTH.path).view, { 1: mix, 2: mix }, { 1: mix, 2: mix }, "RAW");
    expect(r).toMatchObject({ clause: "s4.motion.int", entry: "AM-6", arm: "D6", base: "C2" });
    expect(r.reading.verdict).toBe("PASS");
  });
});

describe("the plan, --part1, --digests and the closed writes", () => {
  it("plays the bases and the D arms since the lift, and plans a D arm by name", () => {
    expect(STEP4_BASE_IDS).toEqual(["A0", "A14", "A1", "A11", "C1", "C2", "C14"]);
    expect(STEP4_PLAYABLE_RUN_IDS).toEqual([...STEP4_BASE_IDS, ...STEP4_ARM_IDS]);
    expect(planStep4({}).complete).toHaveLength(48);
    const all = STEP4_PLAYABLE_RUN_IDS.flatMap((id) => [`${id}.1`, `${id}.2`]);
    expect(planStep4({ shard: { index: 2, count: 3 } }).mine.map((t) => `${t.id}.${String(t.seedSet)}`)).toEqual(all.filter((_, i) => i % 3 === 1));
    expect(planStep4({ shard: { index: 2, count: 3 } }).mine.slice(0, 5).map((t) => `${t.id}.${String(t.seedSet)}`)).toEqual(["A0.2", "A1.1", "A11.2", "C2.1", "C14.2"]);
    for (const id of STEP4_ARM_IDS) expect(planStep4({ arms: [id] }).targets.map((t) => t.id), id).toEqual([id, id]);
    expect(() => planStep4({ arms: ["B3"] })).toThrow(/B3 is not in this run/);
    expect(step4FoldsOf("C1")).toEqual({ m5: false });
  });

  it("--part1 refuses a dirty tree before a cache is made, and --digests refuses a withheld petition before anything plays", () => {
    const parent = tempDir("p1");
    expect(() => runStep4Part1({ cacheParent: parent, filedPath: FILED, amendmentsPath: AMENDMENTS, env: { ...ENV, dirty: true } })).toThrow(STEP4_DIRTY_REFUSAL);
    expect(() => runStep4Part1({ cacheParent: parent, filedPath: FILED, amendmentsPath: AMENDMENTS, env: { ...ENV, dirty: true }, arms: ["D1"] })).toThrow(STEP4_DIRTY_REFUSAL);
    expect(existsSync(join(parent, ENV.fingerprint))).toBe(false);
    for (const withheld of [{ P6: false }, { P7: false }, { P8: false }]) {
      expect(() => runStep4Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v", petitions: withheld })).toThrow(STEP4_DIGESTS_REFUSAL);
    }
  });

  it("never writes over steps 1 to 3's committed records", () => {
    expect(closedStep4Writes({ report: "reports/adr-089-step3.md", out: "reports/adr-089-step2.json" }, PKG)).toEqual(["--report reports/adr-089-step3.md", "--out reports/adr-089-step2.json"]);
    expect(closedStep4Writes({ report: "reports/adr-089-step4.md" }, PKG)).toEqual([]);
    expect(closedStep4Writes({ report: "reports/adr-089-step4.md" }, PKG, PKG, true)).toEqual(["--report reports/adr-089-step4.md"]);
    // A probe run never writes over step 4's own records, final or not (review 2 N5).
    expect(closedStep4Writes({ report: "reports/adr-089-step4.md", out: "reports/adr-089-step4.json", probes: true }, PKG)).toEqual(["--report reports/adr-089-step4.md", "--out reports/adr-089-step4.json"]);
    expect(closedStep4Writes({ report: "/tmp/probes.md", probes: true }, PKG)).toEqual([]);
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
  const d = isStep4ArmId(id);
  // A D arm is stamped pocket-1.s4 and, like every arm with a base, carries its affected plays.
  const report = r["report"] as Record<string, unknown>;
  if (d && report["affectedPlays"] === undefined) report["affectedPlays"] = { flat: 0, gen: 0 };
  return { ...r, format: STEP4_ARM_FORMAT, stamp: { ...(r["stamp"] as object), arm: id, ...(d ? { rules: "pocket-1.s4" } : {}) }, s4: { flat: folds(s4), gen: folds(s4) } } as unknown as Step4Record;
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
    const mapped = s.guard.filter((g) => g.role === "graded");
    expect(mapped.map((g) => `${g.arm}:${g.against}:${g.league}`)).toEqual(["D1:C1:flat", "D1:C1:gen", "D2:C2:flat", "D2:C2:gen", "D6:C2:flat", "D6:C2:gen"]);
    for (const g of mapped) {
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
    expect(clause("s4.falsifier.release").note).toMatch(/waits for the probes \(--probes\)/);
    expect(clause("s4.sackCredit").verdict).toBe("PASS");
    expect(s.outcome.mergeCard).toBe(false);
    const text = renderStep4Report(grade, records);
    expect(text).toMatch(/^# ADR-089 step 4: the arms/);
    expect(renderStep4Sections(s).join("\n")).toMatch(/## Waiting, by name/);
  });

  it("time to throw beside every hit and sack figure; D4 beside the contact clauses, D5, D1 and D2 beside the motion's (F6, F8)", () => {
    const sack = clause("s4.contact.flat.sack").values;
    expect(sack[0]).toMatch(/^flat set 1 \S+ \(set 2 \S+\) \[time to throw D3 \d+\.\d{3} s \(throwaways in\)\]$/);
    expect(sack.some((v) => v === "beside, never graded: D4 flat set 1 not played")).toBe(true);
    expect(clause("s4.contact.hitOrSack").values.some((v) => v.startsWith("beside, never graded: D4 against A14 flat"))).toBe(true);
    expect(clause("s4.contact.hitOrSack").values[0]).toMatch(/\[time to throw D3 .* against A0 .*\]$/);
    // Pressure is not a hit or sack figure: no time to throw on it.
    expect(clause("s4.contact.pressure").values[0]).not.toMatch(/time to throw/);
    const hits = clause("s4.motion.hits").values;
    expect(hits.some((v) => /^beside, never graded: D1 against C1 flat set 1 \S+ \(set 2 \S+\) \[time to throw D1 /.test(v))).toBe(true);
    expect(hits.some((v) => v.startsWith("beside, never graded: D2 against C2 gen"))).toBe(true);
    expect(hits.some((v) => v === "beside, never graded: D5 against C1 flat set 1 not played")).toBe(true);
    const curve = clause("s4.motion.curveRises").values;
    expect(curve.some((v) => v.startsWith("beside, never graded: D1 flat set 1 aimed-weighted"))).toBe(true);
    expect(curve.some((v) => v === "raw release bins against decision bins (AM-7 item 3; rho below 0.5, so 0): throws moved on D6 flat set 1 0, set 2 0")).toBe(true);
    expect(s.arms.find((a) => a.arm === "D9")!.lines[2]).toMatch(/\[time to throw n\/a s \(throwaways in\), n\/a s aimed\]$/);
  });

  it("AM-6's printed-beside rows: the cumulative line, the accepted state and the information readings, never graded (F4)", () => {
    const beside = s.guard.filter((g) => g.role !== "graded");
    expect(beside.map((g) => `${g.role}:${g.arm}:${g.against}:${g.league}`)).toEqual([
      "cumulative:D1:A0:flat", "cumulative:D1:A0:gen", "cumulative:D2:A14:flat", "cumulative:D2:A14:gen",
      "accepted:D1:A1:flat", "accepted:D1:A1:gen", "accepted:D2:A11:flat", "accepted:D2:A11:gen",
      "information:D3:A0:flat", "information:D3:A0:gen", "information:D4:A14:flat", "information:D4:A14:gen",
      "information:D5:C1:flat", "information:D5:C1:gen", "information:D7:C1:flat", "information:D7:C1:gen",
    ]);
    expect(beside.filter((g) => g.arm === "D1").every((g) => g.verdict === "REPORTED" && !g.graded && g.ownClock.length === 2)).toBe(true);
    expect(beside.filter((g) => g.arm === "D4" || g.arm === "D5" || g.arm === "D7").every((g) => g.verdict === "NOT PLAYED")).toBe(true);
    // D1 far riskier than A0 reads as a breach on the statistic, and is still never graded or a guard breach.
    const m = new Map(records);
    const bump = (r: Step4Record): Step4Record => {
      const c = structuredClone(r) as unknown as { report: { intGuard: Record<string, { all: { interceptions: number } }> } };
      for (const l of ["flat", "gen"]) c.report.intGuard[l]!.all.interceptions *= 5;
      return c as unknown as Step4Record;
    };
    m.set("D1", { 1: bump(records.get("D1")![1]!), 2: bump(records.get("D1")![2]!) });
    const g = gradeStep4(m, file, guard, REFS).sections;
    const cumulative = g.guard.filter((x) => x.role === "cumulative" && x.arm === "D1");
    expect(cumulative.some((x) => x.breaches.length > 0)).toBe(true);
    expect(cumulative.every((x) => x.verdict === "REPORTED")).toBe(true);
    expect(g.outcome.guardBreaches.every((b) => b.startsWith("D1 against C1"))).toBe(true);
    expect(renderStep4Sections(s).join("\n")).toMatch(/- D1 against A0, flat \[cumulative, printed beside, never graded\]: REPORTED/);
  });

  it("AM-6's declared prints and the EXT-4 reports are printed (F5, F7)", () => {
    expect(s.declared!.some((l) => l.startsWith("D1 flat set 1: interceptions/aimed throws on THROWING-hit throws"))).toBe(true);
    expect(s.declared!.some((l) => l.startsWith("D3 gen set 2: interceptions/aimed throws after a SHED"))).toBe(true);
    expect(s.declared!.some((l) => l.startsWith("D5 "))).toBe(false);
    expect(grade.groups.map((x) => `${String(x.seedSet)}:${x.input.arms.map((a) => a.arm.split(" ")[0]).join(",")}`)).toEqual([
      "1:C1,D1", "1:C2,D2,D6,D8", "1:A0,D3", "1:D8,D9,D10,D11",
      "2:C1,D1", "2:C2,D2,D6,D8", "2:A0,D3", "2:D8,D9,D10,D11",
    ]);
    const text = renderStep4Report(grade, records);
    expect(text).toMatch(/## AM-6's declared prints/);
    expect(text).toMatch(/## The EXT-4 reports, one per base and seed set/);
    expect(text).toMatch(/ADR-089 step 4: the pocket report \(2 arms; both leagues/);
    // A D arm without its affected plays is a structural failure, named, not a thrown report.
    const m = new Map(records);
    const bare = structuredClone(records.get("D3")![1]!) as unknown as { report: Record<string, unknown> };
    delete bare.report["affectedPlays"];
    m.set("D3", { ...records.get("D3")!, 1: bare as unknown as Step4Record });
    expect(gradeStep4(m, file, guard, REFS).sections.outcome.structuralFailures.some((f) => f.startsWith("the EXT-4 report for A0 with D3, set 1, is refused"))).toBe(true);
  });

  it("s4.rawBins: an aimed throw off its decision bin is a fold fault; s4.reading is read from the arms and their stamps (F20, F19)", () => {
    expect(s.proofs.find((p) => p.id === "s4.rawBins")!.verdict).toBe("PASS");
    const m = new Map(records);
    const moved = emptyS4Fold();
    moved.rawBinMoved = 1;
    m.set("D6", { ...records.get("D6")!, 1: recordOf("D6", "C2", 1, moved) });
    const g = gradeStep4(m, file, guard, REFS).sections;
    expect(g.outcome.foldFaults.some((f) => f.startsWith("s4.rawBins: 2 failing"))).toBe(true);
    expect(clause("s4.reading").verdict).toBe("PASS");
    const wrong = new Map(records);
    const r = structuredClone(records.get("D1")![1]!) as unknown as { stamp: Record<string, unknown> };
    r.stamp["rules"] = "pocket-1.s3";
    wrong.set("D1", { ...records.get("D1")!, 1: r as unknown as Step4Record });
    expect(readingProblems(wrong, guard)).toEqual(["D1 set 1 is stamped pocket-1.s3, not pocket-1.s4"]);
    expect(gradeStep4(wrong, file, guard, REFS).sections.clauses.find((c) => c.id === "s4.reading")!.verdict).toBe("FAIL");
    expect(readingProblems(records, { bases: { D14: "D1" } as never })).toEqual(["D14 is in the guard's map"]);
  });

  it("a one-set run grades nothing", () => {
    const one = gradeStep4(records, file, guard, REFS, 1).sections;
    expect(one.clauses.filter((c) => c.verdict === "PASS" || c.verdict === "FAIL").map((c) => c.id).sort()).toEqual(["s4.qbHitFields", "s4.reading", "s4.sackCredit"]);
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

  it("after the lift nothing waits for it: --part1's lines and the grade's waits say what is not checked, by name", () => {
    const r = part1Findings(new Map([["C1", { 1: recordOf("C1", "C1", 1, emptyS4Fold()) }]]), REFS);
    const waits = gradeStep4(records, file, guard, REFS).sections.waits;
    for (const l of [...r.lines, ...waits]) expect(l, l).not.toMatch(/\blift\b/);
    expect(r.lines).toContain(STEP4_TL_LINE);
    expect(waits).toContain(STEP4_TL_LINE);
    // R-1 and the s4 pins landed (40137fc, POCKET_1_S4_PINS): the grade no longer says they wait.
    for (const l of waits) expect(l, l).not.toMatch(/R-1|s4 pins|not pinned/);
  });
});
