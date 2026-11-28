/**
 * ADR-089 STEP 6: THE HARNESS (step-6 plan §3.2, K2; §7, §8.2, §10.3), with nothing played: every
 * step-6 arm waits on the owner's typed yes, so the arms are built only with a test's own petitions
 * (`STEP6_PETITIONS_GRANTED`) and every play is a fake returning `s6Synthetic.ts`'s records. The
 * committed amendments file is only read: AM-13 is a stand-in on a copy (`s6StandIn.ts`), carrying the
 * answers a test gives, never a recorded answer.
 *
 *  1. The gate at this head refuses the run, F5's second fresh play and R-1 before anything plays,
 *     and makes no cache; then the preflight, the arms' build and a dirty tree refuse in that order.
 *  2. The preflight refuses each condition alone, by name: the filing, the amendments file (missing,
 *     unloadable), its step-3, step-4 and step-5a views, the step-6 view's pin, AM-12 (absent, its
 *     class view, its base map), AM-13 (absent, its answers), a choice not yet made; and passes for
 *     every option of the owner's three questions, reading AM-12's guard and AM-13's answers.
 *  3. The arms, the plan, the cache, the records: the arms refused without petitions and distinct with
 *     them; the plan's targets and shards; the cache refused on a dirty tree; F5's fresh file and its
 *     command; the writes over committed records; a cached record's problems; the folds and recipe a
 *     step-6 arm plays with; `playStep6Arm`'s refusals and its wiring into step 5's play.
 *  4. The run with fakes: shards, the cache read back, the grade once every target and F5's second
 *     fresh plays are there (or the commands it waits on), the report and the measures, one seed set,
 *     and each refusal of a cached record, of a fresh play and of a committed report from a dirty tree.
 *  5. R-1's stamp, the empty pin scaffold tied to the flags, and the replays' references.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AMENDMENTS_DIGEST, STEP3_AMENDMENTS_DIGEST, AMENDMENTS_PATH } from "../src/pocket/amendments.js";
import { STEP6_ARM_IDS, STEP6_RUN_IDS, type ArmId, type Step6Arm, type Step6ArmId } from "../src/pocket/arms.js";
import type { SeedSet } from "../src/pocket/corpus.js";
import { STEP0_FILED_DIGEST } from "../src/pocket/filed.js";
import { POCKET_1_S5A_DIGEST, POCKET_1_S6_DIGEST, readsStep3Facts, RECOMMENDED_OUTS_OPTIONS, everyOutsOptions, STEP6_PETITIONS_GRANTED, step6PetitionsUnder, type OutsOptions } from "../src/pocket/rules.js";
import { emptyStep6LeagueFolds } from "../src/pocket/s6Checks.js";
import { STEP6_ARM_FORMAT, STEP6_CLOCK_LABEL, STEP6_MEASURES_FORMAT, type Step6Record } from "../src/pocket/s6Grade.js";
import { POCKET_1_S6_PIN_STRIP, POCKET_1_S6_PINS, POCKET_1_S6_PINS_MEASURED_AT, S6_PIN_ARM_IDS, type S6PinArmId } from "../src/pocket/s6Pins.js";
import { STEP1_CALLER, FULL_CORPUS, armFileOf, jsonText, type Step1Env } from "../src/pocket/step1.js";
import { step3StampOf } from "../src/pocket/step3.js";
import { STEP4_AMENDMENTS_PIN, type PlayStep4Options, type Step4Record } from "../src/pocket/step4.js";
import { emptyStep5LeagueFolds, STEP5A_AMENDMENTS_PIN, step5FoldsOf } from "../src/pocket/step5.js";
import {
  buildStep6Arms,
  cachedStep6Problems,
  closedStep6Writes,
  loadStep6References,
  planStep6,
  playStep6Arm,
  playStep6Fresh,
  preflightStep6,
  readStep6Record,
  runStep6,
  runStep6Digests,
  s6PinStampOf,
  step6CacheDir,
  step6Command,
  STEP6_DIRTY_REFUSAL,
  step6FoldsOf,
  step6FreshCommandOf,
  step6FreshFileOf,
  step6GateRefusal,
  step6GateState,
  step6PetitionsOut,
  step6PinRefusal,
  STEP6_RECORDS,
  STEP6_RECORDS_FINAL,
  step6RecipeOf,
  step6TargetName,
  type PlayStep6Options,
  type Step6GateState,
  type Step6Options,
} from "../src/pocket/step6.js";
import { AMEND, entry, FILED, PKG, standInFile } from "./s6StandIn.js";
import { synthRecord } from "./s6Synthetic.js";

const scratch = mkdtempSync(join(tmpdir(), "pocket-step6-harness-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));
let dirs = 0;
const freshDir = (name: string): string => {
  dirs += 1;
  const d = join(scratch, `${name}-${String(dirs)}`);
  mkdirSync(d, { recursive: true });
  return d;
};

/** A gate state with every condition of plan §10.3 met (synthetic: no build holds it yet; as K0's test). */
const OPEN: Step6GateState = {
  s5aFinal: true,
  s5aOutcome: { faults: [], breaches: [], misses: ["s5a.cleanScramble: flat 12.96, gen 6.89 against 2 to 6"] },
  viewDigest: "fnv1a:view6",
  viewPin: "fnv1a:view6",
  ownersAnswer: { s5aMiss: "s5a.cleanScramble", answeredAt: "2026-11-27T14:28:48Z" },
  guard: "AM-12",
  readings: { answers: RECOMMENDED_OUTS_OPTIONS },
  petitionsOut: [],
  s6Digest: "fnv1a:s6",
};

const ENV: Step1Env = { fingerprint: "synthfp", commit: "c0ffee", dirty: false, node: "v22" };

/** The stand-in file with the recommended answers (the gate privileges none; each option is read below). */
let SI: { readonly path: string; readonly pin: string };
let BUILT: ReadonlyMap<Step6ArmId, Step6Arm>;
beforeAll(() => {
  SI = standInFile(scratch);
  BUILT = buildStep6Arms(RECOMMENDED_OUTS_OPTIONS, STEP6_PETITIONS_GRANTED);
});
const armOf = (id: Step6ArmId): Step6Arm => BUILT.get(id)!;

interface PlayCall {
  readonly id: string;
  readonly seedSet: SeedSet;
  readonly arm?: string;
  readonly amendments: string;
  readonly thirdOf: boolean;
}

/** A fake player: each target's synthetic record, stamped as the harness stamps it (`step3StampOf`), with the built arm's recipe. */
function fakePlayer(calls: PlayCall[]): NonNullable<Step6Options["play"]> {
  return (id, s, env, o) => {
    calls.push({ id, seedSet: s, ...(o.arm === undefined ? {} : { arm: o.arm.id }), amendments: o.amendments, thirdOf: o.thirdOf !== undefined });
    return synthRecord(id, s, { stamp: () => step3StampOf(id, s, env, o.amendments, o.corpus ?? FULL_CORPUS, o.arm), recipe: () => (o.arm === undefined ? undefined : step6RecipeOf(o.arm)) });
  };
}

/** The references the replays read: the synthetic D1 and E9 (the replays leave the stamp out). */
const synthRefs = (): Map<string, object> => new Map((["D1", "E9"] as const).flatMap((id) => ([1, 2] as const).map((s) => [`${id}.set${String(s)}`, synthRecord(id, s)] as [string, object])));

/** A run's options with fakes for everything that would play. */
function runOptions(dir: string, calls: PlayCall[], thirdCalls: SeedSet[], lines: string[], over: Partial<Step6Options> = {}): Step6Options {
  return {
    cacheParent: join(dir, "cache"),
    filedPath: FILED,
    amendmentsPath: SI.path,
    env: ENV,
    gate: OPEN,
    preflight: { pin: SI.pin },
    petitions: STEP6_PETITIONS_GRANTED,
    play: fakePlayer(calls),
    thirds: (s) => {
      thirdCalls.push(s);
      return () => "MID";
    },
    references: synthRefs(),
    fresh: (s) => synthRecord("F5", s, { stamp: () => step3StampOf("F5", s, ENV, SI.pin, FULL_CORPUS) }),
    log: (l) => {
      lines.push(l);
    },
    report: join(dir, "s6.md"),
    out: join(dir, "s6.json"),
    ...over,
  };
}

const NOT_YOURS = "nothing plays";

describe("refused before anything plays, in order: the gate, the preflight, the arms, a dirty tree", () => {
  it("the gate at this head refuses the run, F5's second fresh play and R-1, and makes no cache", () => {
    const refusal = step6GateRefusal(step6GateState())!;
    expect(refusal).toMatch(/\(4\) P9, P10, P11, P12, P20 in contracts .*; \(5\) pocket-1\.s6 recorded \(POCKET_1_S6_DIGEST is unset\)\. Nothing has played and no cache was made$/);
    const dir = freshDir("gate");
    const calls: PlayCall[] = [];
    const { gate: _g, ...noGate } = runOptions(dir, calls, [], []);
    void _g;
    expect(() => runStep6(noGate)).toThrow(refusal);
    expect(() => playStep6Fresh({ seedSet: 1, filedPath: FILED, amendmentsPath: SI.path, env: ENV, preflight: { pin: SI.pin }, play: fakePlayer(calls) })).toThrow(refusal);
    expect(() => runStep6Digests({ filedPath: FILED, amendmentsPath: SI.path, node: "v22", preflight: { pin: SI.pin }, petitions: STEP6_PETITIONS_GRANTED })).toThrow(refusal);
    expect(calls).toEqual([]);
    expect(existsSync(join(dir, "cache"))).toBe(false);
  });

  it("with the gate open: the preflight (the view not pinned), then the arms' build (no petition in contracts), then a dirty tree", () => {
    const dir = freshDir("order");
    const calls: PlayCall[] = [];
    const o = runOptions(dir, calls, [], []);
    expect(() => runStep6({ ...o, preflight: {} })).toThrow(step6PinRefusal(SI.pin, null));
    const { petitions: _p, ...noPetitions } = o;
    void _p;
    expect(() => runStep6(noPetitions)).toThrow(NOT_YOURS);
    expect(() => runStep6(noPetitions)).toThrow(/P9/);
    expect(() => runStep6({ ...o, env: { ...ENV, dirty: true } })).toThrow(STEP6_DIRTY_REFUSAL);
    expect(() => playStep6Fresh({ seedSet: 1, filedPath: FILED, amendmentsPath: SI.path, env: ENV, gate: OPEN, play: fakePlayer(calls) })).toThrow(step6PinRefusal(SI.pin, null));
    expect(() => runStep6Digests({ filedPath: FILED, amendmentsPath: SI.path, node: "v22", gate: OPEN, preflight: { pin: SI.pin } })).toThrow(NOT_YOURS);
    expect(calls).toEqual([]);
    expect(existsSync(join(dir, "cache"))).toBe(false);
  });

  it("the command with the gate open refuses a write over committed records before its preflight", async () => {
    const lines: string[] = [];
    await expect(step6Command({ step: 6, report: join(PKG, "reports/adr-089-step5a.md") }, (l) => lines.push(l), OPEN)).rejects.toThrow(/--report .*adr-089-step5a\.md would write over committed records, which are never edited\. Write elsewhere$/);
    expect(lines).toEqual(["ADR-089 step 6: the arms: the gate is open"]);
    await expect(step6Command({ step: 6, digests: true, out: join(PKG, AMENDMENTS_PATH) }, () => undefined, OPEN)).rejects.toThrow(/would write over committed records/);
  });
});

describe("the preflight (plan §10.3, once the gate is open): each refusal alone, and every answer read", () => {
  const refusalOf = (o: Parameters<typeof standInFile>[1], pin?: string | null): string => {
    const f = standInFile(scratch, o);
    try {
      preflightStep6(FILED, f.path, { pin: pin === undefined ? f.pin : pin });
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
    return "passed";
  };
  const lead = "ADR-089 step 6: refused before anything plays: ";

  it("the filing, the amendments file and its step-3, step-4 and step-5a views", () => {
    const filed = JSON.parse(readFileSync(FILED, "utf8")) as { bands: { clauses: { text: string }[] } };
    filed.bands.clauses[0]!.text += " (edited)";
    const tampered = join(scratch, "filed-edited.json");
    writeFileSync(tampered, `${JSON.stringify(filed, null, 2)}\n`);
    expect(() => preflightStep6(tampered, SI.path, { pin: SI.pin })).toThrow(new RegExp(`^${lead}the step-0 filing digests to fnv1a:[0-9a-f]{8}, not ${STEP0_FILED_DIGEST}$`));
    const missing = join(scratch, "no-such-amendments.json");
    expect(() => preflightStep6(FILED, missing, { pin: SI.pin })).toThrow(`${lead}the amendments file ${missing} does not exist`);
    expect(refusalOf({ text: "{" })).toMatch(new RegExp(`^${lead}`));
    const edited = (id: string) => (j: { entries: Record<string, unknown>[] }): void => {
      const e = entry(j as never, id);
      e["reason"] = `${String(e["reason"])} (edited)`;
    };
    expect(refusalOf({ edit: edited("AM-1") })).toMatch(new RegExp(`^${lead}the step-3 view digests to fnv1a:[0-9a-f]{8}, not ${STEP3_AMENDMENTS_DIGEST}$`));
    expect(refusalOf({ edit: edited("AM-6") })).toMatch(new RegExp(`^${lead}the step-4 view digests to fnv1a:[0-9a-f]{8}, not ${String(STEP4_AMENDMENTS_PIN)}$`));
    expect(refusalOf({ edit: edited("AM-8") })).toMatch(new RegExp(`^${lead}the step-5a view digests to fnv1a:[0-9a-f]{8}, not ${String(STEP5A_AMENDMENTS_PIN)}$`));
    // AM-11 and AM-12 are filed before step 6 only: an edit there is the step-6 view's, read by its pin.
    expect(refusalOf({ edit: edited("AM-12") }, SI.pin)).toBe(step6PinRefusal(standInFile(scratch, { edit: edited("AM-12") }).pin, SI.pin));
  });

  it("the step-6 view's pin: unset (this build), or another", () => {
    expect(() => preflightStep6(FILED, AMEND)).toThrow(step6PinRefusal(AMENDMENTS_DIGEST, null));
    expect(refusalOf({}, null)).toBe(step6PinRefusal(SI.pin, null));
    expect(refusalOf({}, "fnv1a:00000000")).toBe(step6PinRefusal(SI.pin, "fnv1a:00000000"));
    expect(SI.pin).not.toBe(AMENDMENTS_DIGEST);
  });

  it("AM-12: absent, its class view, its base map", () => {
    const noAm12 = refusalOf({ am13: false, edit: (j) => void (j.entries = j.entries.filter((e) => e["id"] !== "AM-12")) });
    expect(noAm12).toMatch(new RegExp(`^${lead}AM-12 \\(the guard at step 6\\) is not filed in the view: `));
    expect(refusalOf({ edit: (j) => void delete (entry(j, "AM-12")["rule"] as Record<string, unknown>)["classView"] })).toBe(`${lead}AM-12 maps step 6's guard on the class view undefined, not S5`);
    const withBase = (arm: string, base: string) => (j: { entries: Record<string, unknown>[] }): void => {
      ((entry(j as never, "AM-12")["rule"] as { bases: Record<string, Record<string, string>> }).bases["6"]!)[arm] = base;
    };
    expect(refusalOf({ edit: withBase("HB0", "F5") })).toBe(`${lead}AM-12's step-6 base map reads HB0 against F5, and this build's arm against E9`);
    expect(refusalOf({ edit: withBase("H1", "D1") })).toBe(`${lead}AM-12's step-6 base map reads H1 against D1, and this build's arm against F5`);
  });

  it("AM-13: absent, its answers, a choice not yet made", () => {
    expect(refusalOf({ am13: false })).toMatch(new RegExp(`^${lead}AM-13 \\(step 6's readings\\) is not filed in the view: `));
    expect(refusalOf({ answers: { ...RECOMMENDED_OUTS_OPTIONS, seen: "MAYBE" } })).toBe(`${lead}AM-13's ownersWord.answers.seen is "MAYBE", not one of SEEN, UNSEEN_IF_UNREGISTERED`);
    expect(refusalOf({ answers: { spentChecklist: "HOLD" } })).toBe(`${lead}AM-13's ownersWord.answers.scrambleStart is null, not one of ZERO_GAIN_ONLY, EVERY_RUN`);
    expect(refusalOf({ answers: null })).toBe(`${lead}AM-13's ownersWord holds no answers (spentChecklist, scrambleStart, seen)`);
    expect(refusalOf({ edit: (j) => void (entry(j, "AM-13")["reason"] = "a stand-in, <HOLD|SECOND_ESCAPE>") })).toMatch(new RegExp(`^${lead}the view holds a choice not yet made: .*AM-13.* holds the choice <HOLD\\|SECOND_ESCAPE>$`));
  });

  it("passes for every option of the owner's three questions, reading AM-12's guard on the S5 view and AM-13's answers", () => {
    const all = everyOutsOptions();
    expect(all).toHaveLength(20);
    for (const answers of all) {
      const f = standInFile(scratch, { answers });
      const { file, guard } = preflightStep6(FILED, f.path, { pin: f.pin });
      expect(file.bands.clauses.length).toBeGreaterThan(0);
      expect(guard.answers, JSON.stringify(answers)).toEqual(answers);
      expect(guard.digest).toBe(f.pin);
      expect([guard.guardEntry, guard.readingsEntry, guard.rule.classView, guard.skipEqualDials]).toEqual(["AM-12", "AM-13", "S5", true]);
      expect(guard.bases).toEqual({ H0: "F5", F5: "D1" });
      expect(guard.freshBases).toEqual(["F5"]);
      expect(guard.lines).toEqual({ zLeague: 2, zClass: 3, zSetSE0: 0 });
      expect(guard.view.entries.map((e) => e.id).at(-1)).toBe("AM-13");
      expect(typeof guard.classify).toBe("function");
    }
  });
});

describe("the arms, the plan, the cache and the records", () => {
  it("builds every step-6 arm under the answers with a test's petitions, distinct among themselves and from D1, F5 and E9; refuses them without", () => {
    expect(() => buildStep6Arms(RECOMMENDED_OUTS_OPTIONS)).toThrow(NOT_YOURS);
    expect([...BUILT.keys()]).toEqual([...STEP6_ARM_IDS]);
    // H2L and HB2L play the other scramble start (information only), every other arm the answers.
    for (const a of BUILT.values()) expect(a.outsOptions, a.id).toEqual(["H2L", "HB2L"].includes(a.id) ? { ...RECOMMENDED_OUTS_OPTIONS, scrambleStart: "EVERY_RUN" } : RECOMMENDED_OUTS_OPTIONS);
    const other: OutsOptions = { spentChecklist: "BELOW_30", scrambleStart: "EVERY_RUN", seen: "UNSEEN_IF_UNREGISTERED" };
    const b = buildStep6Arms(other, STEP6_PETITIONS_GRANTED);
    expect(b.get("H0")!.outsOptions).toEqual(other);
    expect(b.get("H0")!.tunablesDigest).not.toBe(armOf("H0").tunablesDigest);
    expect(b.get("H2L")!.outsOptions).toEqual({ ...other, scrambleStart: "ZERO_GAIN_ONLY" });
    expect(b.get("H2L")!.tunables.pocket?.outs?.scrambleStart).toBe("ZERO_GAIN_ONLY");
    expect(armOf("H2L").tunables.pocket?.outs?.scrambleStart).toBe("EVERY_RUN");
  });

  it("plans step 6's run on both seed sets, a shard of it, some arms, or one seed set", () => {
    const all = planStep6();
    expect(all.targets).toHaveLength(STEP6_RUN_IDS.length * 2);
    expect(all.targets.slice(0, 6).map(step6TargetName)).toEqual(["D1.set1", "D1.set2", "F5.set1", "F5.set2", "E9.set1", "E9.set2"]);
    expect(all.complete).toEqual(all.targets);
    expect(all.mine).toEqual(all.targets);
    expect(all.oneSet).toBeUndefined();
    const shard = planStep6({ shard: { index: 2, count: 3 } });
    expect(shard.mine).toEqual(all.targets.filter((_, i) => i % 3 === 1));
    expect(shard.complete).toEqual(all.targets);
    expect(planStep6({ arms: ["H0", "F5"] }).targets.map(step6TargetName)).toEqual(["F5.set1", "F5.set2", "H0.set1", "H0.set2"]);
    expect(planStep6({ arms: ["H0", "F5"] }).complete).toEqual(all.targets);
    const one = planStep6({ seedSet: 2 });
    expect(one.targets.map(step6TargetName)).toEqual(STEP6_RUN_IDS.map((id) => `${id}.set2`));
    expect(one.complete).toEqual(one.targets);
    expect(one.oneSet).toBe(2);
    for (const shardOf of [{ index: 0, count: 3 }, { index: 4, count: 3 }, { index: 1, count: 0 }, { index: 1.5, count: 3 }]) expect(() => planStep6({ shard: shardOf })).toThrow(RangeError);
    expect(() => planStep6({ arms: ["H0", "H0"] })).toThrow("--arms names an arm twice: H0,H0");
    expect(() => planStep6({ arms: ["A1"] })).toThrow(/^--arms: A1 is not in step 6's run \(D1, F5, E9, H0, /);
    expect(() => planStep6({ arms: ["A1", "E0"] })).toThrow(/^--arms: A1, E0 are not in step 6's run/);
  });

  it("makes the cache only from a clean tree; F5's fresh file sits beside the records, with the command the operator runs", () => {
    const parent = join(freshDir("cache"), "parent");
    expect(() => step6CacheDir(parent, { ...ENV, dirty: true })).toThrow(STEP6_DIRTY_REFUSAL);
    expect(existsSync(parent)).toBe(false);
    const dir = step6CacheDir(parent, ENV);
    expect(dir).toBe(join(parent, "synthfp"));
    expect(existsSync(dir)).toBe(true);
    expect(step6FreshFileOf(dir, 2)).toBe(join(dir, "F5.set2.fresh.json"));
    expect(step6FreshCommandOf(1, "/x/F5.set1.fresh.json")).toBe("pnpm --filter @ff/calibration pocket -- --step 6 --fresh-base 1 --out /x/F5.set1.fresh.json");
  });

  it("never writes over the filing, the amendments file or a closed step's records, nor step 6's own once final", () => {
    expect(closedStep6Writes({ report: "reports/adr-089-step5a.md", out: "reports/adr-089-step4.json" }, PKG)).toEqual(["--report reports/adr-089-step5a.md", "--out reports/adr-089-step4.json"]);
    expect(closedStep6Writes({ out: "reports/adr-089-step0.filed.json" }, PKG)).toEqual(["--out reports/adr-089-step0.filed.json"]);
    expect(closedStep6Writes({ out: AMENDMENTS_PATH }, PKG)).toEqual([`--out ${AMENDMENTS_PATH}`]);
    expect(STEP6_RECORDS).toEqual(["reports/adr-089-step6.md", "reports/adr-089-step6.json"]);
    expect(STEP6_RECORDS_FINAL).toBe(false);
    expect(closedStep6Writes({ report: STEP6_RECORDS[0], out: STEP6_RECORDS[1] }, PKG)).toEqual([]);
    expect(closedStep6Writes({ report: STEP6_RECORDS[0], out: STEP6_RECORDS[1] }, PKG, PKG, true)).toEqual([`--report ${STEP6_RECORDS[0]}`, `--out ${STEP6_RECORDS[1]}`]);
    expect(closedStep6Writes({ report: "/tmp/s6.md" }, PKG)).toEqual([]);
  });

  it("a cached record stands for this build's arm only with its stamp, view, clock label and, on a step-6 arm, its recipe", () => {
    const h0 = armOf("H0");
    const want = step3StampOf("H0", 1, ENV, SI.pin, FULL_CORPUS, h0);
    const good = synthRecord("H0", 1, { stamp: () => want, recipe: () => step6RecipeOf(h0) });
    expect(cachedStep6Problems(good, want, h0)).toEqual([]);
    expect(cachedStep6Problems({ ...good, stamp: { ...good.stamp, commit: "other", dirty: true } } as Step6Record, want, h0)).toEqual([]);
    expect(cachedStep6Problems({ ...good, stamp: { ...want, amendments: "fnv1a:old" } } as Step6Record, want, h0)).toEqual([`stamped with amendments fnv1a:old, not this build's view ${SI.pin}`]);
    expect(cachedStep6Problems({ ...good, stamp: { ...want, overlayDigest: "fnv1a:other" } } as Step6Record, want, h0)).toEqual([`overlayDigest: cached "fnv1a:other", this build ${JSON.stringify(h0.overlayDigest)}`]);
    const { clock: _c, ...noClock } = good;
    void _c;
    expect(cachedStep6Problems(noClock as Step6Record, want, h0)).toEqual([`clock: cached null, this build "${STEP6_CLOCK_LABEL}"`]);
    const otherRecipe = { ...step6RecipeOf(h0), outsOptions: { ...RECOMMENDED_OUTS_OPTIONS, seen: "UNSEEN_IF_UNREGISTERED" as const } };
    expect(cachedStep6Problems({ ...good, step6: otherRecipe }, want, h0)).toEqual([`step6: cached ${JSON.stringify(otherRecipe)}, this build ${JSON.stringify(step6RecipeOf(h0))}`]);
    const { step6: _r, ...noRecipe } = good;
    void _r;
    expect(cachedStep6Problems(noRecipe as Step6Record, want, h0)).toEqual([`step6: cached null, this build ${JSON.stringify(step6RecipeOf(h0))}`]);
    const d1Want = step3StampOf("D1", 1, ENV, SI.pin, FULL_CORPUS);
    const d1 = synthRecord("D1", 1, { stamp: () => d1Want });
    expect(cachedStep6Problems(d1, d1Want, undefined)).toEqual([]);
    expect(cachedStep6Problems({ ...d1, step6: step6RecipeOf(h0) }, d1Want, undefined)).toEqual(["step6: a recipe on an arm that is not a step-6 arm"]);
    const path = join(freshDir("record"), "x.json");
    writeFileSync(path, jsonText({ format: "adr-089-step5-arm/v1" }));
    expect(() => readStep6Record(path)).toThrow(`${path}: not a step-6 arm record (format adr-089-step5-arm/v1)`);
    writeFileSync(path, jsonText(good));
    expect(readStep6Record(path).format).toBe(STEP6_ARM_FORMAT);
  });

  it("the folds and recipe a step-6 arm plays with: step 3's folds where its tree reads them, never M2 or M5's mirror; D1, F5 and E9 as step 5 played them", () => {
    for (const id of ["D1", "F5", "E9"] as const) expect(step6FoldsOf(id), id).toEqual(step5FoldsOf(id));
    for (const a of BUILT.values()) expect(step6FoldsOf(a.id, a), a.id).toEqual({ s3Folds: readsStep3Facts(a.rules) && a.tunables.blitzPickup.freeRun !== undefined, m2: false, m5: false });
    expect(step6FoldsOf("H0", armOf("H0")).s3Folds).toBe(true);
    expect(step6RecipeOf(armOf("H0"))).toEqual({ kind: "league", parts: [...armOf("H0").step6.parts], outsOptions: RECOMMENDED_OUTS_OPTIONS, ratingOverridesDigest: armOf("H0").ratingOverridesDigest, mirror: false });
    expect(step6RecipeOf(armOf("H0M")).mirror).toBe(true);
    expect(step6RecipeOf(armOf("HB0")).kind).toBe("bench");
    expect(step6RecipeOf(armOf("H13")).ratingOverridesDigest).not.toBe(step6RecipeOf(armOf("H0")).ratingOverridesDigest);
    expect(step6RecipeOf(armOf("H14")).ratingOverridesDigest).not.toBe(step6RecipeOf(armOf("H13")).ratingOverridesDigest);
  });

  it("playStep6Arm refuses an arm played otherwise than built, and wires a step-6 arm into step 5's play with its tree, ratings, mirror and folds", () => {
    const base: Omit<PlayStep6Options, "arm"> = { amendments: SI.pin, classify: (() => "PROGRESSION") as never };
    expect(() => playStep6Arm("H0", 1, ENV, base)).toThrow("ADR-089 step 6: H0 is a step-6 arm: it plays only as built (buildStep6Arm, under AM-13's answers)");
    expect(() => playStep6Arm("F5", 1, ENV, { ...base, arm: armOf("H0") })).toThrow("ADR-089 step 6: F5 is not a step-6 arm: it plays as step 5 played it, with no built arm");
    expect(() => playStep6Arm("H3", 1, ENV, { ...base, arm: armOf("H0") })).toThrow("ADR-089 step 6: the built arm is H0, not H3");
    expect(() => playStep6Arm("A1" as ArmId, 1, ENV, base)).toThrow(/^ADR-089 step 6: A1 is not in step 6's run \(D1, F5, E9, H0, /);
    const seen: { id: ArmId; seedSet: SeedSet; opts: PlayStep4Options }[] = [];
    const playStep4 = (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep4Options): Step4Record => {
      seen.push({ id, seedSet, opts });
      return { format: "adr-089-step4-arm/v1", stamp: step3StampOf(id, seedSet, env, opts.amendments, FULL_CORPUS, opts.arm?.arm), report: { rows: [] } } as unknown as Step4Record;
    };
    for (const id of ["H0", "H13", "H0M", "D1"] as const) {
      const arm = id === "D1" ? undefined : armOf(id);
      const r = playStep6Arm(id, 2, ENV, { ...base, ...(arm === undefined ? {} : { arm }), thirdOf: () => "MID", playStep4 });
      const o = seen.at(-1)!.opts;
      expect([seen.at(-1)!.id, seen.at(-1)!.seedSet], id).toEqual([id, 2]);
      expect([o.label, o.amendments], id).toEqual(["pocket step 6", SI.pin]);
      expect(o.folds, id).toEqual(step6FoldsOf(id, arm));
      expect(typeof o.visit, id).toBe("function");
      expect(typeof o.finish, id).toBe("function");
      if (arm === undefined) expect(o.arm, id).toBeUndefined();
      else {
        expect(o.arm!.arm, id).toBe(arm);
        expect(o.arm!.ratings, id).toEqual(id === "H13" ? arm.step6.ratings : undefined);
        expect(typeof o.arm!.rosters, id).toBe(id === "H13" ? "function" : "undefined");
        expect(o.arm!.mirror, id).toBe(id === "H0M" ? true : undefined);
      }
      expect(r.format, id).toBe(STEP6_ARM_FORMAT);
      expect(r.clock, id).toBe(STEP6_CLOCK_LABEL);
      expect(r.step6, id).toEqual(arm === undefined ? undefined : step6RecipeOf(arm));
      expect(r.s6, id).toEqual({ flat: emptyStep6LeagueFolds(), gen: emptyStep6LeagueFolds() });
      expect(r.s5, id).toEqual({ flat: emptyStep5LeagueFolds(), gen: emptyStep5LeagueFolds() });
    }
  });
});

describe("the run with fakes: the cache, the grade, the report and the measures", () => {
  it("plays each shard's targets with the thirds read first, grades once every target and F5's two fresh plays are cached, and reads the cache back", () => {
    const dir = freshDir("run");
    const calls: PlayCall[] = [];
    const thirdCalls: SeedSet[] = [];
    const lines: string[] = [];
    const o = runOptions(dir, calls, thirdCalls, lines);
    const first = runStep6({ ...o, shard: { index: 1, count: 2 } });
    expect(first.graded).toBe(false);
    expect(first.played).toEqual(planStep6({ shard: { index: 1, count: 2 } }).mine.map(step6TargetName));
    expect(first.remaining).toEqual(planStep6({ shard: { index: 2, count: 2 } }).mine.map(step6TargetName));
    expect(first.wrote).toEqual([]);
    // Two shards of the run: the first is every arm on seed set 1, so its thirds are set 1's only.
    expect(first.played).toEqual(STEP6_RUN_IDS.map((id) => `${id}.set1`));
    expect(thirdCalls).toEqual([1]);
    expect(lines[0]).toBe(`pocket step 6: fingerprint synthfp; amendments at step 6 ${SI.pin} (AM-12, AM-13); the owner's answers {"scrambleStart":"ZERO_GAIN_ONLY","seen":"SEEN","spentChecklist":"HOLD"}; ${STEP6_CLOCK_LABEL}; arms cached in ${join(dir, "cache", "synthfp")}`);
    expect(existsSync(step6FreshFileOf(first.cacheDir, 1))).toBe(true);
    expect(existsSync(step6FreshFileOf(first.cacheDir, 2))).toBe(false);
    const second = runStep6({ ...o, shard: { index: 2, count: 2 } });
    expect([second.graded, second.remaining, second.cached]).toEqual([true, [], []]);
    expect(thirdCalls).toEqual([1, 2]);
    expect(second.wrote).toEqual([o.report, o.out]);
    expect(calls).toHaveLength(STEP6_RUN_IDS.length * 2);
    expect(new Set(calls.map((c) => `${c.id}.set${String(c.seedSet)}`)).size).toBe(calls.length);
    for (const c of calls) {
      expect(c.amendments, c.id).toBe(SI.pin);
      expect(c.thirdOf, c.id).toBe(true);
      expect(c.arm, c.id).toBe((STEP6_ARM_IDS as readonly string[]).includes(c.id) ? c.id : undefined);
    }
    // The grade: the only fault is S-8' on H0, since pocket-1.s6 is not recorded in this build.
    const g = second.grade!.sections;
    expect(POCKET_1_S6_DIGEST).toBeUndefined();
    expect(g.outcome.faults).toEqual([`S-8': H0's overlay digest ${String(armOf("H0").overlayDigest)} is not POCKET_1_S6_DIGEST undefined`]);
    expect(g.replays).toContain(`S-8': F5's overlay digest ${String(POCKET_1_S5A_DIGEST)} equals POCKET_1_S5A_DIGEST ${String(POCKET_1_S5A_DIGEST)}`);
    expect(g.replays).toContain("F5 set 1: two fresh plays in separate processes identical");
    expect(g.replays).toContain("D1 set 2 gen: equals its record");
    const report = readFileSync(o.report!, "utf8");
    expect(report.split("\n")[0]).toBe("# ADR-089 step 6: the outs");
    expect(report).toContain(`- fingerprint: synthfp; commit: c0ffee; node v22; caller ${STEP1_CALLER}; ${STEP6_CLOCK_LABEL}`);
    const measures = JSON.parse(readFileSync(o.out!, "utf8")) as Record<string, unknown>;
    expect(Object.keys(measures)).toEqual(["format", "filedDigest", "amendments", "guard", "readings", "answers", "fingerprint", "clock", "outcome", "arms", "grade"]);
    expect([measures["format"], measures["filedDigest"], measures["amendments"], measures["guard"], measures["readings"], measures["fingerprint"], measures["clock"]]).toEqual([STEP6_MEASURES_FORMAT, STEP0_FILED_DIGEST, SI.pin, "AM-12", "AM-13", "synthfp", STEP6_CLOCK_LABEL]);
    expect(measures["answers"]).toEqual(RECOMMENDED_OUTS_OPTIONS);
    expect(Object.keys(measures["arms"] as object)).toEqual(planStep6().complete.map(step6TargetName));
    expect(JSON.stringify(measures)).not.toMatch(/"(startedAt|finishedAt|host|hostname|cwd)"/);
    // A third run reads every target back from the cache and grades the same.
    const third = runStep6(o);
    expect([third.played, third.cached.length, third.graded]).toEqual([[], STEP6_RUN_IDS.length * 2, true]);
    expect(third.grade!.sections.outcome).toEqual(g.outcome);
    expect(calls).toHaveLength(STEP6_RUN_IDS.length * 2);
  });

  it("without F5's second fresh plays it prints their commands and waits; with them (playStep6Fresh) it grades", () => {
    const dir = freshDir("fresh");
    const calls: PlayCall[] = [];
    const lines: string[] = [];
    const { fresh: _f, ...o } = runOptions(dir, calls, [], lines);
    void _f;
    const waiting = runStep6(o);
    expect(waiting.graded).toBe(false);
    expect(waiting.remaining).toEqual([]);
    expect(waiting.awaitingFresh).toEqual([1, 2].map((s) => step6FreshCommandOf(s as SeedSet, step6FreshFileOf(waiting.cacheDir, s as SeedSet))));
    expect(lines.at(-1)).toMatch(/^pocket step 6: every target is cached; F5's second fresh play is not there yet \(AM-12, S-7'\)\. In another shell run\n {2}pnpm --filter @ff\/calibration pocket -- --step 6 --fresh-base 1 --out .*\n {2}pnpm .* --fresh-base 2 --out .*\nthen run this command again to grade$/);
    const thirdCalls: SeedSet[] = [];
    for (const s of [1, 2] as const) {
      const r = playStep6Fresh({ seedSet: s, filedPath: FILED, amendmentsPath: SI.path, env: ENV, gate: OPEN, preflight: { pin: SI.pin }, play: fakePlayer(calls), thirds: (x) => (thirdCalls.push(x), () => "MID") });
      expect([r.stamp.arm, r.stamp.seedSet]).toEqual(["F5", s]);
      writeFileSync(step6FreshFileOf(waiting.cacheDir, s), jsonText(r));
    }
    expect(thirdCalls).toEqual([1, 2]);
    expect(calls.slice(-2).map((c) => [c.id, c.seedSet, c.arm, c.thirdOf])).toEqual([["F5", 1, undefined, true], ["F5", 2, undefined, true]]);
    const graded = runStep6(o);
    expect(graded.graded).toBe(true);
    expect(graded.played).toEqual([]);
    // --fresh-base refuses a guard that plays no base fresh.
    const noFresh = standInFile(scratch, { edit: (j) => void delete (entry(j, "AM-12")["rule"] as Record<string, unknown>)["freshBases"] });
    expect(() => playStep6Fresh({ seedSet: 1, filedPath: FILED, amendmentsPath: noFresh.path, env: ENV, gate: OPEN, preflight: { pin: noFresh.pin }, play: fakePlayer(calls) })).toThrow("ADR-089 step 6: --fresh-base plays F5's second fresh play, and AM-12 plays no base fresh (its rule.freshBases)");
  });

  it("one seed set: its targets only, F5's fresh play on that set, graded as reported, the measures marked", () => {
    const dir = freshDir("one");
    const calls: PlayCall[] = [];
    const o = runOptions(dir, calls, [], []);
    const r = runStep6({ ...o, seedSet: 2 });
    expect(r.graded).toBe(true);
    expect(r.played).toEqual(STEP6_RUN_IDS.map((id) => `${id}.set2`));
    expect(existsSync(step6FreshFileOf(r.cacheDir, 2))).toBe(true);
    expect(existsSync(step6FreshFileOf(r.cacheDir, 1))).toBe(false);
    expect(r.grade!.sections.oneSet).toBe(2);
    expect(r.grade!.sections.outcome.misses).toEqual([]);
    const measures = JSON.parse(readFileSync(o.out!, "utf8")) as Record<string, unknown>;
    expect(measures["oneSet"]).toBe(2);
    expect(Object.keys(measures["arms"] as object)).toEqual(STEP6_RUN_IDS.map((id) => `${id}.set2`));
  });

  it("refuses a cached record that is not this build's arm, a fresh play that is not this build's, and a committed report from a dirty record", () => {
    const dir = freshDir("refuse");
    const calls: PlayCall[] = [];
    const o = runOptions(dir, calls, [], []);
    const done = runStep6(o);
    expect(done.graded).toBe(true);
    const h3 = armFileOf(done.cacheDir, "H3", 1);
    const original = readFileSync(h3, "utf8");
    writeFileSync(h3, jsonText({ ...(JSON.parse(original) as object), clock: "tampered" }));
    expect(() => runStep6({ ...o, arms: ["H3"] })).toThrow(`ADR-089 step 6: the cached H3.set1 at ${h3} is not this build's arm: clock: cached "tampered", this build "${STEP6_CLOCK_LABEL}". Delete it, or use another --cache`);
    expect(() => runStep6({ ...o, arms: ["H0"] })).toThrow(`ADR-089 step 6: refused to grade: the cached H3.set1 at ${h3} is not this build's arm: clock: cached "tampered", this build "${STEP6_CLOCK_LABEL}"`);
    writeFileSync(h3, original);
    const fresh1 = step6FreshFileOf(done.cacheDir, 1);
    const freshText = readFileSync(fresh1, "utf8");
    const f = JSON.parse(freshText) as { stamp: Record<string, unknown> };
    writeFileSync(fresh1, jsonText({ ...f, stamp: { ...f.stamp, amendments: "fnv1a:old" } }));
    expect(() => runStep6(o)).toThrow(`ADR-089 step 6: refused to grade: F5 set 1's second fresh play at ${fresh1} is not this build's: stamped with amendments fnv1a:old, not this build's view ${SI.pin}. Delete it and run the fresh process again`);
    writeFileSync(fresh1, freshText);
    const dirtyRecord = JSON.parse(original) as { stamp: Record<string, unknown> };
    writeFileSync(h3, jsonText({ ...dirtyRecord, stamp: { ...dirtyRecord.stamp, dirty: true } }));
    expect(runStep6(o).graded).toBe(true);
    expect(() => runStep6({ ...o, committedDir: dir })).toThrow("ADR-089 step 6: refused to grade a committed report: a record was played on a dirty tree");
    expect(calls).toHaveLength(STEP6_RUN_IDS.length * 2);
  });
});

describe("R-1's stamp, the empty pin scaffold, the references", () => {
  it("R-1 stamps each arm with its ratings' digest and mirror beside its overlay digest; it refuses an id that is not a step-6 arm before anything plays", () => {
    const h0 = s6PinStampOf(armOf("H0"));
    expect(Object.keys(h0)).toEqual(["arm", "rules", "overlayDigest", "tunablesDigest", "patches", "ratingOverridesDigest", "mirror"]);
    expect([h0.arm, h0.rules, h0.mirror]).toEqual(["H0", "pocket-1.s6", false]);
    const h13 = s6PinStampOf(armOf("H13"));
    const h0m = s6PinStampOf(armOf("H0M"));
    expect(h13.overlayDigest).toBe(h0.overlayDigest);
    expect(h0m.overlayDigest).toBe(h0.overlayDigest);
    expect(h13.ratingOverridesDigest).not.toBe(h0.ratingOverridesDigest);
    expect([h0m.mirror, h0m.ratingOverridesDigest]).toEqual([true, h0.ratingOverridesDigest]);
    expect(() => runStep6Digests({ filedPath: FILED, amendmentsPath: SI.path, node: "v22", gate: OPEN, preflight: { pin: SI.pin }, petitions: STEP6_PETITIONS_GRANTED, arms: ["F5" as S6PinArmId] })).toThrow(new RangeError("F5 is not a step-6 arm"));
  });

  it("POCKET_1_S6_PINS is null, measured nowhere and stripping nothing, while pocket-1.s6 is unrecorded and its petitions are out", () => {
    expect(POCKET_1_S6_PINS).toBeNull();
    expect(POCKET_1_S6_PINS_MEASURED_AT).toBeNull();
    expect(POCKET_1_S6_PIN_STRIP).toEqual([]);
    expect(S6_PIN_ARM_IDS).toEqual(["H0", "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10", "H11", "H12", "H13", "H14", "H15", "H2L", "H0M", "HB0", "HB2L"]);
    expect(S6_PIN_ARM_IDS.every((id) => (STEP6_ARM_IDS as readonly string[]).includes(id))).toBe(true);
    // The tie: the pins are filled only after the lift, which records the digest and sets the flags together.
    expect(POCKET_1_S6_DIGEST).toBeUndefined();
    expect(Object.values(step6PetitionsUnder({})).every((v) => v === false)).toBe(true);
    expect(step6PetitionsOut()).toEqual(["P9", "P10", "P11", "P12", "P20"]);
    expect(POCKET_1_S6_PINS === null).toBe(POCKET_1_S6_DIGEST === undefined);
  });

  it("the replays' references: D1 from step 4's committed records, E9 from step 5a's", () => {
    const refs = loadStep6References();
    for (const k of ["D1.set1", "D1.set2", "E9.set1", "E9.set2"]) expect(refs.has(k), k).toBe(true);
    const a5 = JSON.parse(readFileSync(join(PKG, "reports/adr-089-step5a.json"), "utf8")) as { arms: Record<string, object> };
    expect(refs.get("E9.set2")).toEqual(a5.arms["E9.set2"]);
    expect((refs.get("D1.set1") as { stamp: { arm: string } }).stamp.arm).toBe("D1");
    // A package with no 5a records has D1's only.
    const bare = freshDir("bare");
    mkdirSync(join(bare, "reports"), { recursive: true });
    copyFileSync(join(PKG, "reports/adr-089-step4.json"), join(bare, "reports/adr-089-step4.json"));
    expect([...loadStep6References(bare).keys()].sort()).toEqual(["D1.set1", "D1.set2"]);
  });
});
