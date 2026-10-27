/**
 * ADR-089 step 2 — THE HARNESS (`src/pocket/step2.ts`; step-2 plan §4.1 to §4.7, §6's K3 row).
 *
 *  - the refusals before anything plays (plan §4.6): the filing, a missing or unpinned amendments
 *    file, a step-2 base map that is missing, misses an arm, names one step 2 does not grade, or reads
 *    an arm against another base than this build's; `runStep2`, `--m2` and `--digests` alike, with no
 *    arm played and no cache made;
 *  - the stamp (step 1's, its `amendments` the pinned digest, the key in its place), the plan's
 *    targets and shards, the packed guard vectors;
 *  - Q-2's projection on the committed step-1 records: equal to itself, moved by a projected field,
 *    blind to the fields it leaves out by name;
 *  - real arms on a cut corpus (A0, A1, B3): step 1's record in every field step 1 has, the step-2
 *    folds clean, deterministic, no clock, host or path field; Q-3's digests through the pins;
 *  - grading synthetic records (cut-corpus records re-stamped and edited): a pass, a graded failure,
 *    an AM-1 breach (league-wide and DESPERATION's), a structural failure, a fold fault (NOT
 *    JUDGED), the amendments-stamp refusal, one seed set (reported), a missing arm, Q-2 against
 *    references, and the report;
 *  - the run through its `play` seam: shards that grade once every target is cached and write the
 *    same bytes, the one-arm `--out`, a stale cache and another amendments digest refused, a committed
 *    report refused from a dirty tree, `--m2` and one seed set;
 *  - Q-3c, when `reports/adr-089-step2.json` is committed: re-grading its records reproduces the
 *    committed report and measures, byte for byte.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AMENDMENTS_DIGEST, AMENDMENTS_PATH, amendmentsDigest } from "../src/pocket/amendments.js";
import { armById, STEP2_ARM_IDS, STEP2_RUN_IDS, type ArmId } from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import type { SeedSet } from "../src/pocket/corpus.js";
import { loadFiled, STEP0_FILED_DIGEST, type FiledFile } from "../src/pocket/filed.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import { LEAGUES } from "../src/pocket/report.js";
import { POCKET_1_S1_BASE_PINS } from "../src/pocket/s1BasePins.js";
import { POCKET_1_S1_PINS } from "../src/pocket/s1Pins.js";
import { s2Problems, selfCheckOf } from "../src/pocket/s2Stream.js";
import { armFileOf, jsonText, playArm, referenceOf, stampOf, type ArmRecord, type Step1Corpus, type Step1Env } from "../src/pocket/step1.js";
import {
  checkFilingForStep2,
  digestPinProblems,
  gradeStep2,
  loadStep1References,
  packGuardGame,
  planStep2,
  playStep2Arm,
  preflightStep2,
  q2Problems,
  rateDiffSE,
  recordsOfMeasures,
  renderStep2Report,
  runStep2,
  runStep2Digests,
  runStep2M2,
  STEP2_ARM_FORMAT,
  STEP2_DIGESTS_FORMAT,
  STEP2_GROUPS,
  STEP2_MEASURES_FORMAT,
  STEP2_RECORDS_FORMAT,
  step2MeasuresOf,
  step2StampOf,
  unpackGuardGame,
  unpackS2Folds,
  type Step1References,
  type Step2DigestsResult,
  type Step2Grade,
  type Step2Record,
  type Step2Records,
} from "../src/pocket/step2.js";

const PKG = resolve(import.meta.dirname, "..");
const FILED = join(PKG, FILED_PATH);
const AMENDMENTS = join(PKG, AMENDMENTS_PATH);
const TINY: Step1Corpus = { flatFirst: 1, genThroughWeek: 1 };
const ENV: Step1Env = { fingerprint: "0123456789abcdef", commit: "c".repeat(40), dirty: false, node: "v22.0.0-test" };
const NO_REFS: Step1References = new Map();

type W<T> = T extends readonly (infer U)[] ? W<U>[] : T extends object ? { -readonly [K in keyof T]: W<T[K]> } : T;
const clone = <T>(x: T): W<T> => structuredClone(x) as W<T>;

const scratch: string[] = [];
function tempDir(label: string): string {
  const dir = mkdtempSync(join(tmpdir(), `ff-step2-${label}-`));
  scratch.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const committedFiling = (): FiledFile => loadFiled(FILED);
const committedAmendments = (): Record<string, unknown> => JSON.parse(readFileSync(AMENDMENTS, "utf8")) as Record<string, unknown>;
/** AM-1's step-2 base map in a parsed amendments file. */
const step2Map = (json: Record<string, unknown>): Record<string, string> =>
  ((json["entries"] as Record<string, unknown>[])[0]!["rule"] as { bases: Record<string, Record<string, string>> }).bases["2"]!;

// --- the refusals ------------------------------------------------------------------------------------------

describe("the refusals before anything plays (plan §4.6)", () => {
  it("passes the committed filing and amendments, and hands the grading AM-1's map, lines and cumulative line", () => {
    const { file, guard } = preflightStep2(FILED, AMENDMENTS);
    expect(file.bands.clauses.length).toBeGreaterThan(0);
    expect(guard).toEqual({
      digest: AMENDMENTS_DIGEST,
      entry: "AM-1",
      record: "ADR-089 Appendix F, F.11",
      bases: { B1: "A1", B2: "A1", B3: "A1", B4: "A1", B5: "A5", B6: "A11", B7: "A1" },
      lines: { zLeague: 2, zClass: 3, zSetSE0: 0 },
      cumulative: { design: "A0", pricing: "A14" },
    });
    for (const id of STEP2_ARM_IDS) expect(guard.bases[id], id).toBe(armById(id).base);
  });

  it("refuses a filing that leaves an s2 or guard field pending, then one that is not the committed filing", () => {
    expect(() => checkFilingForStep2(committedFiling())).not.toThrow();
    const pending = clone(committedFiling());
    const i = pending.bands.clauses.findIndex((c) => c.id === "s2.sack");
    (pending.bands.clauses[i] as unknown as Record<string, unknown>)["hi"] = { pending: "M1" };
    expect(() => checkFilingForStep2(pending as unknown as FiledFile)).toThrow(new RegExp(`bands\\.clauses\\.${String(i)}\\.hi pending; every s2 and guard field must be filed first`));
    const changed = clone(committedFiling());
    changed.bands.clauses[0]!.text = `${changed.bands.clauses[0]!.text} `;
    expect(() => checkFilingForStep2(changed as unknown as FiledFile)).toThrow(/digests to fnv1a:[0-9a-f]{8}, not fnv1a:9a1c90e9/);
  });

  /** Writes an amendments file edited by `edit`; returns its path and the digest that would pin it. */
  const amendmentsWith = (dir: string, edit: (json: Record<string, unknown>) => void): { path: string; pin: string } => {
    const json = committedAmendments();
    edit(json);
    const path = join(dir, "amendments.json");
    writeFileSync(path, jsonText(json));
    return { path, pin: amendmentsDigest(json) };
  };

  it("refuses a missing amendments file, a changed one under the committed pin, and every faulty step-2 map", () => {
    const dir = tempDir("pre");
    expect(() => preflightStep2(FILED, join(dir, "none.json"))).toThrow(/^ADR-089 step 2: refused before anything plays: the amendments file .*none\.json does not exist/);
    const touched = amendmentsWith(dir, (j) => { (j["entries"] as Record<string, unknown>[])[0]!["reason"] = "changed"; });
    expect(() => preflightStep2(FILED, touched.path)).toThrow(/refused before anything plays: ADR-089: the amendments file .* digests to fnv1a:[0-9a-f]{8}, not the pin fnv1a:d5f9de6d/);
    expect(() => preflightStep2(FILED, touched.path, touched.pin)).not.toThrow();

    const basesOf = (j: Record<string, unknown>): Record<string, unknown> => ((j["entries"] as Record<string, unknown>[])[0]!["rule"] as { bases: Record<string, unknown> }).bases;
    const noBases = amendmentsWith(dir, (j) => { delete basesOf(j)["2"]; });
    expect(() => preflightStep2(FILED, noBases.path, noBases.pin)).toThrow(/^ADR-089 step 2: refused before anything plays: not an adr-089-amendments\/v1 file:\n {2}- entries\.0\.rule\.bases: must map at least one step/);
    const noMap = amendmentsWith(dir, (j) => { const b = basesOf(j); b["3"] = b["2"]; delete b["2"]; });
    expect(() => preflightStep2(FILED, noMap.path, noMap.pin)).toThrow(/^ADR-089 step 2: refused before anything plays: ADR-089: no filed amendment maps step 2's guard bases/);
    const missing = amendmentsWith(dir, (j) => { delete step2Map(j)["B7"]; });
    expect(() => preflightStep2(FILED, missing.path, missing.pin)).toThrow(/refused before anything plays: AM-1's step-2 base map names no base for B7: every graded arm needs one/);
    const extra = amendmentsWith(dir, (j) => { step2Map(j)["A2"] = "A0"; });
    expect(() => preflightStep2(FILED, extra.path, extra.pin)).toThrow(/refused before anything plays: AM-1's step-2 base map names A2, which step 2 does not grade \(B1 to B7\)/);
    const differ = amendmentsWith(dir, (j) => { step2Map(j)["B5"] = "A1"; });
    expect(() => preflightStep2(FILED, differ.path, differ.pin)).toThrow(/refused before anything plays: AM-1's step-2 base map reads B5 against A1, and this build's arm against A5/);
  });

  it("plays nothing and makes no cache when refused: the run, --m2 and --digests alike", () => {
    const dir = tempDir("refused");
    const differ = amendmentsWith(dir, (j) => { step2Map(j)["B3"] = "A0"; });
    const changedFiling = clone(committedFiling());
    changedFiling.bands.clauses[0]!.text = "changed";
    const badFiling = join(dir, "filed.json");
    writeFileSync(badFiling, jsonText(changedFiling));
    let plays = 0;
    const play = (): Step2Record => {
      plays += 1;
      throw new Error("played");
    };
    const cacheParent = join(dir, "cache");
    const cases: [string, string, string | undefined, RegExp][] = [
      [FILED, join(dir, "none.json"), undefined, /does not exist/],
      [FILED, AMENDMENTS, "fnv1a:00000000", /not the pin fnv1a:00000000/],
      [FILED, differ.path, differ.pin, /reads B3 against A0/],
      [badFiling, AMENDMENTS, undefined, /digests to/],
    ];
    for (const [filedPath, amendmentsPath, pin, why] of cases) {
      const common = { filedPath, amendmentsPath, ...(pin === undefined ? {} : { amendmentsPin: pin }), cacheParent, env: ENV, corpus: TINY, play, references: NO_REFS };
      expect(() => runStep2(common), String(why)).toThrow(why);
      expect(() => runStep2M2(common), String(why)).toThrow(why);
      expect(() => runStep2Digests({ filedPath, amendmentsPath, ...(pin === undefined ? {} : { amendmentsPin: pin }), node: "v", first: 1 }), String(why)).toThrow(why);
    }
    expect(plays).toBe(0);
    expect(existsSync(cacheParent)).toBe(false);
  });
});

// --- the stamp, the plan and the packed vectors ------------------------------------------------------------

describe("the stamp", () => {
  it("is step 1's stamp with the amendments digest in step 1's amendments field, the key in its place", () => {
    for (const id of ["A1", "B3", "B5"] as const) {
      const one = stampOf(id, 2, ENV, TINY);
      const two = step2StampOf(id, 2, ENV, TINY);
      expect(Object.keys(two)).toEqual(Object.keys(one));
      expect(one.amendments).toBe("none");
      expect(two).toEqual({ ...one, amendments: AMENDMENTS_DIGEST });
    }
    expect(step2StampOf("B3", 1, ENV).rules).toBe("pocket-1.s2");
    expect(step2StampOf("A1", 1, ENV).rules).toBe("pocket-1.s1");
  });
});

describe("the plan", () => {
  const names = (ts: readonly { id: ArmId; seedSet: SeedSet }[]): string[] => ts.map((t) => `${t.id}.set${String(t.seedSet)}`);

  it("plays every arm of the run on both seed sets in STEP2_RUN_IDS order; three shards are 8, 8 and 8, disjoint and complete", () => {
    const all = planStep2({});
    expect(names(all.targets)).toEqual(STEP2_RUN_IDS.flatMap((id) => [`${id}.set1`, `${id}.set2`]));
    expect(all.complete).toEqual(all.targets);
    expect(all.oneSet).toBeUndefined();
    const shards = [1, 2, 3].map((index) => names(planStep2({ shard: { index, count: 3 } }).mine));
    expect(shards.map((s) => s.length)).toEqual([8, 8, 8]);
    expect(shards.flat().sort()).toEqual(names(all.targets).sort());
    expect(new Set(shards.flat()).size).toBe(24);
    for (const n of [1, 5, 24, 30]) {
      const parts = Array.from({ length: n }, (_, i) => names(planStep2({ shard: { index: i + 1, count: n } }).mine));
      expect(parts.flat().sort(), String(n)).toEqual(names(all.targets).sort());
    }
  });

  it("plays named arms in the run's order, the whole step still the complete list; one seed set is its own complete list", () => {
    const named = planStep2({ arms: ["B3", "A1"] });
    expect(names(named.targets)).toEqual(["A1.set1", "A1.set2", "B3.set1", "B3.set2"]);
    expect(named.complete).toHaveLength(24);
    const one = planStep2({ seedSet: 2 });
    expect(names(one.targets)).toEqual(STEP2_RUN_IDS.map((id) => `${id}.set2`));
    expect(one.complete).toEqual(one.targets);
    expect(one.oneSet).toBe(2);
    expect(names(planStep2({ arms: ["B6"], seedSet: 1 }).complete)).toEqual(["B6.set1"]);
  });

  it("refuses a bad shard, an arm named twice and an arm that is not step 2's", () => {
    expect(() => planStep2({ shard: { index: 0, count: 3 } })).toThrow(/--shard takes i\/n/);
    expect(() => planStep2({ shard: { index: 4, count: 3 } })).toThrow(/--shard takes i\/n/);
    expect(() => planStep2({ arms: ["B1", "B1"] })).toThrow(/names an arm twice/);
    expect(() => planStep2({ arms: ["A2", "B1"] })).toThrow(/--arms: A2 is not step 2's/);
  });
});

describe("the packed guard vectors", () => {
  it("round-trip one game a line, the id URI-encoded; a line that is not one is refused", () => {
    const v = {
      game: 12,
      gameId: "g 1|x/é",
      classes: { DESPERATION: { aimedByBin: [1, 0, 2, 0, 0, 0, 0], interceptions: 1, completions: 1 }, CHECKDOWN: { aimedByBin: [0, 3, 0, 0, 0, 0, 1], interceptions: 0, completions: 3 } },
      desperation: { DIRTY: { aimedByBin: [1, 0, 2, 0, 0, 0, 0], interceptions: 1, completions: 1 } },
    };
    const line = packGuardGame(v as never);
    expect(line).toBe("12 g%201%7Cx%2F%C3%A9 DESPERATION=1,0,2,0,0,0,0/1/1 CHECKDOWN=0,3,0,0,0,0,1/0/3 | DIRTY=1,0,2,0,0,0,0/1/1");
    expect(unpackGuardGame(line)).toEqual(v);
    expect(unpackGuardGame("3 g |")).toEqual({ game: 3, gameId: "g", classes: {}, desperation: {} });
    expect(() => unpackGuardGame("x g |")).toThrow(/not a packed guard vector/);
    expect(() => unpackGuardGame("3 g A=1,2/3")).toThrow(/not a packed guard vector/);
    expect(() => unpackGuardGame("3 g A=1,x/0/0 |")).toThrow(/not a packed guard cell/);
  });
});

describe("rateDiffSE", () => {
  it("is the binomial SE of a difference of two per-dropback rates in percent, the arms independent", () => {
    expect(rateDiffSE(30, 1000, 20, 1000)).toBeCloseTo(100 * Math.sqrt((0.3 * 0.7) / 1000 + (0.2 * 0.8) / 1000), 12);
    expect(rateDiffSE(null, 1000, 20, 1000)).toBeNull();
    expect(rateDiffSE(30, 0, 20, 1000)).toBeNull();
  });
});

// --- Q-2 on the committed step-1 records --------------------------------------------------------------------

describe("Q-2: the re-played bases against step 1's records (plan §4.5)", () => {
  const refs = loadStep1References();

  it("reads set 1 from the committed step-1 report and set 2 from the committed fixture, for every re-played base", () => {
    expect([...refs.keys()].sort()).toEqual(["A0", "A1", "A11", "A14", "A5"].flatMap((id) => [`${id}.set1`, `${id}.set2`]).sort());
    for (const [name, r] of refs) expect(`${r.stamp.arm}.set${String(r.stamp.seedSet)}`).toBe(name);
  });

  it("is empty on a record against itself, and names each projected field that moves", () => {
    const a1 = refs.get("A1.set1")!;
    expect(q2Problems(a1, a1)).toEqual([]);
    expect(q2Problems(refs.get("A1.set2")!, a1)).toContain("measures");
    const moved = (edit: (r: W<ArmRecord>) => void): readonly string[] => {
      const r = clone(a1);
      edit(r);
      return q2Problems(r as unknown as ArmRecord, a1);
    };
    expect(moved((r) => { r.measures.gen.pressure = (r.measures.gen.pressure ?? 0) + 0.01; })).toEqual(["measures"]);
    expect(moved((r) => { r.s1.flat.beats.beats += 1; })).toEqual(["s1"]);
    expect(moved((r) => { r.report.intGuard.flat.intPerAimed += 0.001; })).toEqual(["report.intGuard.flat"]);
    expect(moved((r) => { r.report.intGuard.gen.all.interceptions += 1; })).toEqual(["report.intGuard.gen"]);
    expect(moved((r) => { r.report.sacks = clone(refs.get("A0.set1")!.report.sacks); })).toEqual(["report.sacks"]);
  });

  it("leaves out, by name, the stamp, report.isBase, report.affectedPlays and every field step 2 adds", () => {
    const a1 = refs.get("A1.set1")!;
    const r = clone(a1) as W<ArmRecord> & Record<string, unknown>;
    r.stamp = clone(step2StampOf("A1", 1, ENV)) as never;
    r.report.isBase = !r.report.isBase;
    delete r.report.affectedPlays;
    (r.report.intGuard.flat as unknown as Record<string, unknown>)["desperationSplit"] = { DIRTY: 1 };
    r["s2"] = { flat: {}, gen: {} };
    (r as Record<string, unknown>)["format"] = STEP2_ARM_FORMAT;
    expect(q2Problems(r as unknown as ArmRecord, a1)).toEqual([]);
  });
});

// --- real arms on a cut corpus -------------------------------------------------------------------------------

/** The cut-corpus records the synthetic arms are made from: today's clock, step 1's forcing rule, and per rusher. */
const TEMPLATE_IDS = ["A0", "A1", "B3"] as const;
const templates = new Map<ArmId, Step2Record>();
let a1Step1: ArmRecord | undefined;
let a1Again: Step2Record | undefined;

beforeAll(() => {
  for (const id of TEMPLATE_IDS) templates.set(id, playStep2Arm(id, 1, ENV, { corpus: TINY }));
  a1Step1 = playArm("A1", 1, ENV, { corpus: TINY });
  a1Again = playStep2Arm("A1", 1, ENV, { corpus: TINY });
}, 300_000);

const templateOf = (id: ArmId): ArmId => (armById(id).forcing === "PER_RUSHER" ? "B3" : armById(id).clock.kind === "LEGACY" ? "A0" : "A1");

/**
 * An arm's synthetic record: its template re-stamped as the arm, its guard and its measures made
 * A1's (so the guard passes as given), then B3 inside every s2 band against A1 and B1's sacks above
 * A1's (so the clauses pass as given).
 */
function synthetic(id: ArmId, seedSet: SeedSet, env: Step1Env = ENV, corpus: Step1Corpus = TINY): W<Step2Record> {
  const a1 = templates.get("A1")!;
  const r = clone(templates.get(templateOf(id))!);
  r.stamp = clone(step2StampOf(id, seedSet, env, corpus));
  r.report.arm = id;
  r.report.intGuard = clone(a1.report.intGuard);
  r.measures = clone(a1.measures);
  for (const l of LEAGUES) {
    r.s2[l].guardGames = clone(a1.s2[l].guardGames);
    r.s2[l].desperation = clone(a1.s2[l].desperation);
  }
  const shift: Partial<Record<ArmId, Record<"flat" | "gen", { pressure?: number; hitOrSack?: number; sack?: number }>>> = {
    B3: { flat: { pressure: -3.4, hitOrSack: 0.8, sack: 0.5 }, gen: { pressure: -2.8, hitOrSack: 0.8, sack: 0.5 } },
    B1: { flat: { sack: 0.2 }, gen: { sack: 0.2 } },
    B7: { flat: { sack: 0.1 }, gen: { sack: 0.1 } },
  };
  for (const l of LEAGUES) {
    const d = shift[id]?.[l];
    const m = r.measures[l];
    if (d?.pressure !== undefined) m.pressure = m.pressure! + d.pressure;
    if (d?.hitOrSack !== undefined) m.hitOrSack = m.hitOrSack! + d.hitOrSack;
    if (d?.sack !== undefined) m.sack = m.sack! + d.sack;
  }
  const ref = referenceOf(id);
  if (ref === undefined) {
    delete r.affected;
    delete r.report.affectedPlays;
  } else if (r.affected === undefined) {
    r.affected = { ...clone(a1.affected!), against: ref };
    r.report.affectedPlays = clone(a1.report.affectedPlays!);
  } else r.affected.against = ref;
  if (id !== "A0") delete r.baseRows;
  return r;
}

type Editable = Map<ArmId, Partial<Record<SeedSet, W<Step2Record>>>>;
const recordsOf = (edit?: (m: Editable) => void, sets: readonly SeedSet[] = [1, 2]): Step2Records => {
  const m: Editable = new Map(STEP2_RUN_IDS.map((id) => [id, Object.fromEntries(sets.map((s) => [s, synthetic(id, s)])) as Partial<Record<SeedSet, W<Step2Record>>>]));
  edit?.(m);
  return m as unknown as Step2Records;
};
const rec = (m: Editable, id: ArmId, s: SeedSet): W<Step2Record> => m.get(id)![s]!;

describe("real arms on a cut corpus, and the digests", () => {
  it("is step 1's record in every field step 1 has, re-stamped, with the step-2 folds of each league", () => {
    const a1 = templates.get("A1")!;
    const { format, stamp, s2, ...rest } = a1;
    const { format: f1, stamp: st1, ...rest1 } = a1Step1!;
    expect(format).toBe(STEP2_ARM_FORMAT);
    expect(f1).not.toBe(STEP2_ARM_FORMAT);
    expect(stamp).toEqual(step2StampOf("A1", 1, ENV, TINY));
    expect(st1).toEqual(stampOf("A1", 1, ENV, TINY));
    expect(jsonText(rest)).toBe(jsonText(rest1));
    expect(q2Problems(a1, a1Step1!)).toEqual([]);
    expect(Object.keys(s2)).toEqual(["flat", "gen"]);
  });

  it("folds every arm's step-2 stream clean, its guard one packed line a game, its must-act rule the arm's", () => {
    for (const id of TEMPLATE_IDS) {
      const r = templates.get(id)!;
      expect({ flat: r.measures.flat.games, gen: r.measures.gen.games }).toEqual({ flat: 1, gen: 16 });
      for (const l of LEAGUES) {
        const f = unpackS2Folds(r.s2[l]);
        expect(s2Problems(f), `${id} ${l}`).toEqual([]);
        expect(r.s2[l].guardGames, `${id} ${l}`).toHaveLength(l === "flat" ? 1 : 16);
        expect(r.s2[l].guardGames.every((g) => typeof g === "string" && !g.includes("\n"))).toBe(true);
        expect(f.guardGames.map(packGuardGame)).toEqual(r.s2[l].guardGames);
        expect(r.s2[l].arrival.cases + r.s2[l].warning.statusTicks).toBeGreaterThan(0);
      }
    }
    expect(templates.get("B3")!.s2.gen.mustAct.rule).toBe("PER_RUSHER");
    expect(selfCheckOf(templates.get("B3")!.s2.gen.mustAct).offRule).toBeNull();
    expect(templates.get("A1")!.s2.gen.mustAct.rule).toBe("STEP_1");
    expect(selfCheckOf(templates.get("A1")!.s2.gen.mustAct)).toMatchObject({ offRule: { exceptions: 0 }, witness: { exceptions: 0 }, passed: true });
    expect(selfCheckOf(templates.get("B3")!.s2.gen.mustAct)).toMatchObject({ witness: { exceptions: 0 }, passed: true });
    expect(templates.get("B3")!.affected?.against).toBe("A1");
    expect(templates.get("B3")!.stamp.rules).toBe("pocket-1.s2");
  });

  it("is deterministic: the same arm twice is the same bytes", () => {
    expect(jsonText(a1Again)).toBe(jsonText(templates.get("A1")));
  });

  it("holds no clock, host or path field", () => {
    for (const r of templates.values()) {
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

  it("Q-3: A1's golden folds through the step-2 digests equal S-9's pins (first 10 a league); a step-2 arm is stamped pocket-1.s2", () => {
    const d = runStep2Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v-test", first: 10, arms: ["A1"] });
    expect(d).toMatchObject({ format: STEP2_DIGESTS_FORMAT, amendments: AMENDMENTS_DIGEST, gamesPerLeague: 10, caller: "v7" });
    expect(digestPinProblems(d)).toEqual([]);
    const b3 = runStep2Digests({ filedPath: FILED, amendmentsPath: AMENDMENTS, node: "v-test", first: 1, arms: ["B3"] });
    expect(b3.arms["B3"]!.stamp).toEqual({ arm: "B3", rules: "pocket-1.s2", overlayDigest: armById("B3").overlayDigest, tunablesDigest: armById("B3").tunablesDigest, patches: armById("B3").patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`) });
    for (const l of GOLDEN_LEAGUES) expect(b3.arms["B3"]!.leagues[l]).toMatchObject({ games: 1, canonicalFold: expect.stringMatching(/^fnv1a:[0-9a-f]{8}$/) });
    expect(jsonText(b3)).not.toMatch(/"(ms|elapsed|wallClock\w*|started\w*)"/);
  }, 300_000);
});

describe("digestPinProblems (Q-3's base check)", () => {
  const fromPins = (games: 50 | 10): W<Step2DigestsResult> => {
    const pins = [["A1", POCKET_1_S1_PINS.arms.A1], ["A5", POCKET_1_S1_BASE_PINS.arms.A5], ["A11", POCKET_1_S1_BASE_PINS.arms.A11]] as const;
    return {
      format: STEP2_DIGESTS_FORMAT,
      amendments: AMENDMENTS_DIGEST,
      node: "v",
      caller: "v7",
      gamesPerLeague: games,
      arms: Object.fromEntries(pins.map(([id, pin]) => [id, {
        stamp: clone(pin.stamp),
        leagues: Object.fromEntries(GOLDEN_LEAGUES.map((l) => {
          const p = games === 50 ? pin.leagues[l] : pin.leagues[l].first10;
          return [l, { games, events: p.events, canonicalFold: p.canonicalFold, byteFold: p.byteFold }];
        })),
      }])),
    } as W<Step2DigestsResult>;
  };

  it("holds on the pins at 50 games and at 10, and names every field that moves", () => {
    expect(digestPinProblems(fromPins(50) as unknown as Step2DigestsResult)).toEqual([]);
    expect(digestPinProblems(fromPins(10) as unknown as Step2DigestsResult)).toEqual([]);
    const moved = fromPins(50);
    moved.arms["A1"]!.leagues["flat"]!.canonicalFold = "fnv1a:00000000";
    moved.arms["A11"]!.leagues["gen"]!.events += 1;
    moved.arms["A5"]!.stamp.tunablesDigest = "fnv1a:00000000";
    expect(digestPinProblems(moved as unknown as Step2DigestsResult)).toEqual([
      "A1 flat canonicalFold: fnv1a:00000000, pinned " + POCKET_1_S1_PINS.arms.A1.leagues.flat.canonicalFold,
      expect.stringMatching(/^A5: stamp /),
      `A11 gen events: ${String(POCKET_1_S1_BASE_PINS.arms.A11.leagues.gen.events + 1)}, pinned ${String(POCKET_1_S1_BASE_PINS.arms.A11.leagues.gen.events)}`,
    ]);
    const ten = fromPins(10);
    ten.arms["A1"]!.leagues["gen"]!.byteFold = "fnv1a:00000000";
    expect(digestPinProblems(ten as unknown as Step2DigestsResult)).toEqual([expect.stringMatching(/^A1 gen byteFold: fnv1a:00000000, pinned /)]);
    const one = fromPins(50);
    one.gamesPerLeague = 1;
    one.arms["A1"]!.leagues["flat"]!.canonicalFold = "fnv1a:00000000";
    expect(digestPinProblems(one as unknown as Step2DigestsResult)).toEqual([]);
  });
});

// --- grading ---------------------------------------------------------------------------------------------------

describe("grading synthetic records", () => {
  const preflight = (): ReturnType<typeof preflightStep2> => preflightStep2(FILED, AMENDMENTS);
  const grade = (records: Step2Records, oneSet?: SeedSet, refs: Step1References = NO_REFS): Step2Grade => {
    const { file, guard } = preflight();
    return gradeStep2(records, file, guard, refs, oneSet);
  };
  const clause = (g: Step2Grade, id: string) => g.sections.clauses.find((c) => c.id === id)!;
  const proof = (g: Step2Grade, id: string) => g.sections.proofs.find((p) => p.id === id)!;

  it("as given: every proof passes (Q-2 not checked on a cut corpus), every clause holds, no breach, the merge card may be posted", () => {
    const g = grade(recordsOf());
    expect(g.sections.proofs.map((p) => [p.id, p.kind, p.verdict])).toEqual([
      ["s2.selfCheck", "fold", "PASS"],
      ["s2.falsifier.counterAlone", "structural", "PASS"],
      ["s2.falsifier.everyArrival", "structural", "PASS"],
      ["s2.warning.clean", "structural", "PASS"],
      ["s2.liveSet", "structural", "PASS"],
      ["s1.streamChecks", "structural", "PASS"],
      ["s2.m2.identity", "fold", "PASS"],
      ["q2.replay", "structural", "NOT CHECKED"],
    ]);
    expect(proof(g, "q2.replay").detail).toMatch(/^A0 set 1 NOT CHECKED \(a cut corpus, tests only\)/);
    expect(g.sections.clauses.map((c) => [c.id, c.verdict])).toEqual([
      ["s2.pressure.flat", "PASS"],
      ["s2.pressure.gen", "PASS"],
      ["s2.hitOrSack", "PASS"],
      ["s2.sack", "PASS"],
      ["s2.falsifier.sacksDown", "PASS"],
      ["s2.m2", "REPORTED"],
      ["s2.falsifier.counterAlone", "PASS"],
      ["s2.falsifier.everyArrival", "PASS"],
      ["guard.reported.intPerAttempt", "PASS"],
      ["guard.reported.intPerAimed", "PASS"],
      ["guard.reported.forced", "PASS"],
      ["guard.reported.intSource", "PASS"],
      ["guard.reported.completion", "PASS"],
      ["guard.reported.completionAimed", "PASS"],
      ["guard.reported.intByClass", "PASS"],
      ["guard.reported.completionByClass", "PASS"],
      ["guard.mix", "PASS"],
      ["guard.byClass", "PASS"],
      ["guard.removedClass", "PASS"],
      ["guard.onTheRun.clean", "REPORTED"],
      ["guard.onTheRun.pressured", "REPORTED"],
    ]);
    expect(clause(g, "s2.pressure.flat").values).toEqual([expect.stringMatching(/^B3 - A1 flat set 1 -3\.40 points \(binomial SE \d+\.\d\d\); set 2 -3\.40; two-set mean -3\.40$/)]);
    expect(clause(g, "s2.hitOrSack").values).toHaveLength(2);
    expect(clause(g, "s2.sack").values[0]).toMatch(/\[time to throw B3 \d\.\d{3} s, A1 \d\.\d{3} s\]$/);
    expect(clause(g, "s2.falsifier.sacksDown").note).toBe("the forcing point lowers sacks: B1 minus A1 at or above 0 on each league, set 1 (O38)");
    expect(clause(g, "guard.mix").filed).toMatch(/^as amended by AM-1 \(ADR-089 Appendix F, F\.11\): pooled Z over both seed sets above 2 breaches/);
    expect(clause(g, "guard.byClass").filed).toMatch(/above 3 breaches/);
    expect(g.sections.outcome).toEqual({ structuralFailures: [], foldFaults: [], gradedFailures: [], guardBreaches: [], mergeCard: true, next: [] });
    // Seven graded arms on both leagues, then the cumulative line (B3 against A0, B6 against A14).
    expect(g.sections.guard.map((r) => `${r.arm}/${r.base}/${r.league}${r.cumulative ? "/cumulative" : ""}`)).toEqual([
      ...STEP2_ARM_IDS.flatMap((id) => LEAGUES.map((l) => `${id}/${armById(id).base!}/${l}`)),
      "B3/A0/flat/cumulative", "B3/A0/gen/cumulative", "B6/A14/flat/cumulative", "B6/A14/gen/cumulative",
    ]);
    for (const r of g.sections.guard) {
      expect(r.reading.breaches).toEqual([]);
      expect(r.desperation.map((h) => h.half)).toEqual(["DIRTY", "CLEAN"]);
      expect(r.reweighted).toHaveLength(2);
      expect(r.checkdown.arm.map((c) => c.seedSet)).toEqual([1, 2]);
    }
    expect(g.groups.map((x) => `${String(x.seedSet)}:${x.input.arms.map((a) => a.arm.split(" ")[0]).join(",")}`)).toEqual(
      [1, 2].flatMap((s) => STEP2_GROUPS.map((gr) => `${String(s)}:${[gr.base, ...gr.arms].join(",")}`)),
    );
    expect(g.groups.every((x) => x.input.step === "2" && x.input.filedGuardSuperseded === "AM-1 (ADR-089 Appendix F, F.11)")).toBe(true);
    expect(g.groups.map((x) => x.input.arms.filter((a) => a.isBase).length)).toEqual(new Array(10).fill(1));
    expect(g.sections.headline).toHaveLength(4);
    expect(g.sections.interaction.map((x) => x.formula)).toEqual(new Array(4).fill("B3 - (B1 + B2 - A1)"));
    expect(g.sections.arms.map((a) => `${a.arm.split(" ")[0]!}/${a.league}`)).toEqual(STEP2_RUN_IDS.flatMap((id) => LEAGUES.map((l) => `${id}/${l}`)));
  });

  it("a graded clause outside its band is a graded failure, reported as filed: the merge card is not held, nothing re-runs", () => {
    const g = grade(recordsOf((m) => {
      const a1 = rec(m, "A1", 1).measures.flat;
      rec(m, "B3", 1).measures.flat.pressure = a1.pressure! + 5;
    }));
    expect(clause(g, "s2.pressure.flat").verdict).toBe("FAIL");
    expect(g.sections.outcome.gradedFailures).toEqual([expect.stringMatching(/^s2\.pressure\.flat \(-4\.9 to -1\.9\): B3 - A1 flat set 1 \+5\.00 points \(binomial SE \d+\.\d\d\); set 2 -3\.40; two-set mean \+0\.80$/)]);
    expect(g.sections.outcome.mergeCard).toBe(true);
    expect(g.sections.outcome.next).toEqual(["the graded failures go to the owner as filed: no band moves, nothing re-files, nothing is tuned to pass or re-run to try again"]);
    // Set 2 alone outside the band does not fail the clause: set 1 is graded, set 2 printed beside.
    const two = grade(recordsOf((m) => { rec(m, "B3", 2).measures.gen.pressure = rec(m, "A1", 2).measures.gen.pressure! + 5; }));
    expect(clause(two, "s2.pressure.gen").verdict).toBe("PASS");
  });

  it("sacksDown: a failure within 2 SE of its line says so, and B1 and B7 of opposite signs go to the owner together (R12)", () => {
    const g = grade(recordsOf((m) => {
      for (const s of [1, 2] as const) {
        rec(m, "B1", s).measures.flat.sack = rec(m, "A1", s).measures.flat.sack! - 0.1;
        rec(m, "B7", s).measures.flat.sack = rec(m, "A1", s).measures.flat.sack! + 0.3;
      }
    }));
    const c = clause(g, "s2.falsifier.sacksDown");
    expect(c.verdict).toBe("FAIL");
    expect(c.note).toContain("flat: a filed failure within noise of its line (within 2 SE of 0), both sets beside, not re-run (S4-8)");
    expect(c.note).toContain("flat: B1 and B7 disagree in sign, so both go to the owner (R12)");
    expect(c.note).not.toContain("gen:");
    expect(c.values.at(-1)).toMatch(/^beside, set 1: flat: B7 - A1 \+0\.30, B3 - B2 \+0\.50; gen: B7 - A1 \+0\.10, B3 - B2 \+0\.50$/);
    // A difference of 0 has no sign to disagree with.
    const zero = grade(recordsOf((m) => { for (const s of [1, 2] as const) rec(m, "B7", s).measures.gen.sack = rec(m, "A1", s).measures.gen.sack!; }));
    expect(clause(zero, "s2.falsifier.sacksDown").note).not.toContain("disagree");
  });

  it("an AM-1 breach stops the step: the guard clause fails, the merge card waits, and the cumulative line is never graded", () => {
    const g = grade(recordsOf((m) => { for (const s of [1, 2] as const) rec(m, "B3", s).report.intGuard.gen.all.interceptions += 40; }));
    expect(clause(g, "guard.mix").verdict).toBe("FAIL");
    expect(clause(g, "guard.byClass").verdict).toBe("PASS");
    expect(g.sections.outcome.guardBreaches).toEqual([expect.stringMatching(/^B3 against A1, gen: league-wide Z \+\d+\.\d\d$/)]);
    expect(g.sections.outcome.mergeCard).toBe(false);
    expect(g.sections.outcome.next).toEqual([expect.stringMatching(/^AM-1 breaches: the step stops \(ADR-089:1306\)/)]);
    const cumulative = g.sections.guard.find((r) => r.cumulative && r.arm === "B3" && r.league === "gen")!;
    expect(cumulative.reading.breaches).toEqual(["league-wide"]);
    expect(g.sections.outcome.guardBreaches.some((b) => b.includes("against A0"))).toBe(false);
  });

  it("a DESPERATION breach goes to the owner with the class's composition: the halves re-weighted and the checkdown looks by trigger", () => {
    const g = grade(recordsOf((m) => {
      for (const s of [1, 2] as const) {
        const d = rec(m, "B3", s).report.intGuard.gen.byClass.DESPERATION!;
        expect(d.aimedByBin.reduce((a, b) => a + b, 0)).toBeGreaterThan(50);
        d.interceptions += 25;
      }
    }));
    expect(clause(g, "guard.byClass").verdict).toBe("FAIL");
    expect(g.sections.outcome.guardBreaches).toEqual([expect.stringMatching(/^B3 against A1, gen: DESPERATION Z \+\d+\.\d\d$/)]);
    expect(g.sections.outcome.next).toHaveLength(2);
    expect(g.sections.outcome.next[1]).toMatch(/^a DESPERATION or CHECKDOWN breach goes to the owner with the class's composition/);
    const row = g.sections.guard.find((r) => !r.cumulative && r.arm === "B3" && r.league === "gen")!;
    expect(row.desperation.map((h) => h.bySet.length)).toEqual([2, 2]);
    expect(row.checkdown.base.map((c) => c.rule)).toEqual(["STEP_1", "STEP_1"]);
    expect(row.checkdown.arm.map((c) => c.rule)).toEqual(["PER_RUSHER", "PER_RUSHER"]);
  });

  it("a structural proof that fails is a structural failure, and holds the merge card", () => {
    const g = grade(recordsOf((m) => {
      const a = rec(m, "B3", 1).s2.gen.arrival;
      a.problemCount = 1;
      a.problems = ["play p: the arrival tick ends in neither a THROW nor a SACK"];
    }));
    expect(proof(g, "s2.falsifier.everyArrival").verdict).toBe("FAIL");
    expect(clause(g, "s2.falsifier.everyArrival").verdict).toBe("FAIL");
    expect(g.sections.outcome.structuralFailures).toEqual([expect.stringMatching(/^s2\.falsifier\.everyArrival: .*B3 set 1 gen \(1; first: play p: the arrival tick/)]);
    expect(g.sections.outcome.mergeCard).toBe(false);
    const counter = grade(recordsOf((m) => { rec(m, "B1", 2).s2.flat.mustAct.problemCount = 1; }));
    expect(proof(counter, "s2.falsifier.counterAlone").verdict).toBe("FAIL");
    expect(counter.sections.outcome.mergeCard).toBe(false);
    const live = grade(recordsOf((m) => { rec(m, "A5", 2).s2.gen.liveSet.problemCount = 2; }));
    expect(proof(live, "s2.liveSet").detail).toMatch(/A5 set 2 gen \(2; first: \)/);
  });

  it("a fold fault prints NOT JUDGED on the clauses it feeds, and the step cannot close", () => {
    const self = grade(recordsOf((m) => { rec(m, "A1", 1).s2.flat.mustAct.problemCount = 1; }));
    expect(proof(self, "s2.selfCheck").verdict).toBe("FAIL");
    expect(proof(self, "s2.falsifier.counterAlone").verdict).toBe("NOT JUDGED");
    expect(clause(self, "s2.falsifier.counterAlone").verdict).toBe("NOT JUDGED");
    expect(self.sections.outcome.foldFaults).toEqual([expect.stringMatching(/^s2\.selfCheck: /)]);
    expect(self.sections.outcome.structuralFailures).toEqual([]);
    expect(self.sections.outcome.mergeCard).toBe(false);
    expect(self.sections.outcome.next).toEqual(["fix the fold (plan §4.7, kind 2): the clauses it feeds print NOT JUDGED until then, and the step cannot close"]);
    const m2 = grade(recordsOf((m) => { rec(m, "A1", 2).s2.gen.m2.statusMismatches = 1; }));
    expect(proof(m2, "s2.m2.identity").verdict).toBe("FAIL");
    expect(clause(m2, "s2.m2").verdict).toBe("NOT JUDGED");
    expect(m2.sections.outcome.mergeCard).toBe(false);
    // The self-check's other direction (review F-1, F-6): a witness exception on a PER_RUSHER arm is a fold fault, not the falsifier's failure.
    const witness = grade(recordsOf((m) => {
      const w = rec(m, "B3", 1).s2.gen.mustAct.witness;
      w.problemCount = 1;
      w.problems = ["play p tick 2.5: witness: a closing HOLD at or past throwawayEarliestSeconds (2 s) on a tick whose restated count part holds"];
    }));
    expect(proof(witness, "s2.selfCheck").verdict).toBe("FAIL");
    expect(proof(witness, "s2.selfCheck").detail).toMatch(/B3 set 1 gen: 1 witness exceptions over [0-9]+ closing HOLDs and [0-9]+ CLOCK_EXPIRED \(first: play p tick 2.5: witness: /);
    expect(proof(witness, "s2.falsifier.counterAlone").verdict).toBe("NOT JUDGED");
    expect(witness.sections.outcome.foldFaults).toEqual([expect.stringMatching(/^s2\.selfCheck: /)]);
    expect(witness.sections.outcome.mergeCard).toBe(false);
    // With no closing HOLD past throwawayEarliestSeconds anywhere, the generous direction saw no case: FAIL, not PASS.
    const noCase = grade(recordsOf((m) => { for (const bySet of m.values()) for (const r of Object.values(bySet)) for (const l of LEAGUES) r!.s2[l].mustAct.witness.countHolds = 0; }));
    expect(proof(noCase, "s2.selfCheck").verdict).toBe("FAIL");
    expect(proof(noCase, "s2.selfCheck").detail).toMatch(/the generous direction saw no case/);
    // Without A1 in the run, counterAlone is not checked (A1's self-check is its witness).
    const noA1 = grade(recordsOf((m) => { m.delete("A1"); }));
    expect(proof(noA1, "s2.falsifier.counterAlone").verdict).toBe("NOT CHECKED");
  });

  it("refuses a record stamped with another amendments digest, and one filed under another arm or set", () => {
    expect(() => grade(recordsOf((m) => { rec(m, "A1", 1).stamp.amendments = "fnv1a:00000000"; }))).toThrow(/refused to grade: A1 \(set 1\) is stamped with amendments fnv1a:00000000, not fnv1a:d5f9de6d/);
    expect(() => grade(recordsOf((m) => { m.get("B3")![2] = synthetic("B3", 1); }))).toThrow(/refused to grade: the record filed as B3 set 2 is B3 set 1/);
  });

  it("one seed set is reported, never graded: no clause passes or fails, no breach stops it, no merge card", () => {
    const g = grade(recordsOf((m) => { rec(m, "B3", 2).report.intGuard.gen.all.interceptions += 40; }, [2]), 2);
    expect(g.sections.oneSet).toBe(2);
    for (const id of ["s2.pressure.flat", "s2.pressure.gen", "s2.hitOrSack", "s2.sack", "s2.falsifier.sacksDown", "guard.mix", "guard.byClass"]) expect(clause(g, id).verdict, id).toBe("REPORTED");
    expect(clause(g, "s2.pressure.flat").values[0]).toMatch(/^B3 - A1 flat set 2 -3\.40 points \(binomial SE \d+\.\d\d\)$/);
    expect(g.sections.outcome.guardBreaches).toEqual([]);
    // One set's reading is reported (no pooled Z), however far its set z is above the line.
    const row = g.sections.guard.find((r) => !r.cumulative && r.arm === "B3" && r.league === "gen")!;
    expect(row.reading.league).toMatchObject({ verdict: "REPORTED", graded: false, Z: null });
    expect(row.reading.league.sets.map((x) => x.seedSet)).toEqual([2]);
    expect(row.reading.league.sets[0]!.z).toBeGreaterThan(2);
    expect(row.reading.breaches).toEqual([]);
    expect(g.sections.outcome.mergeCard).toBe(false);
    expect(g.sections.outcome.next).toEqual(["this run played seed set 2 only: it is reported, never graded; the step's verdict needs both seed sets (pocket -- --step 2)"]);
    expect(g.groups.map((x) => x.seedSet)).toEqual([2, 2, 2, 2, 2]);
  });

  it("a partial run grades what it played: the missing arm is named and the merge card waits", () => {
    const g = grade(recordsOf((m) => { m.delete("B5"); }));
    expect(g.sections.guard.some((r) => r.arm === "B5")).toBe(false);
    expect(clause(g, "guard.mix").values.at(-1)).toBe("not played: B5");
    expect(g.sections.outcome.mergeCard).toBe(false);
    expect(g.sections.outcome.next).toEqual(["not every target of the step is in this run (missing B5.set1, B5.set2): the merge card waits for the full run"]);
    const noB3 = grade(recordsOf((m) => { m.delete("B3"); }));
    expect(clause(noB3, "s2.sack")).toMatchObject({ verdict: "NOT PLAYED", values: ["not played: B3"] });
  });

  it("Q-2: a re-played base on the full corpus is checked against its step-1 record; a difference is a structural failure", () => {
    const full = (m: Editable): void => { rec(m, "A1", 1).stamp.corpus = { flatFirst: null, genThroughWeek: null }; };
    const same = recordsOf(full);
    const refs: Step1References = new Map([["A1.set1", same.get("A1")![1]! as unknown as ArmRecord]]);
    const pass = grade(same, undefined, refs);
    expect(proof(pass, "q2.replay").verdict).toBe("PASS");
    expect(proof(pass, "q2.replay").detail).toContain("A1 set 1 equal");
    expect(proof(pass, "q2.replay").detail).toContain("A1 set 2 NOT CHECKED (a cut corpus, tests only)");
    const other = clone(same.get("A1")![1]!);
    other.measures.flat.pressure = other.measures.flat.pressure! + 1;
    const fail = grade(same, undefined, new Map([["A1.set1", other as unknown as ArmRecord]]));
    expect(proof(fail, "q2.replay").verdict).toBe("FAIL");
    expect(fail.sections.outcome.structuralFailures).toEqual(["q2.replay: " + proof(fail, "q2.replay").detail]);
    expect(proof(fail, "q2.replay").detail).toMatch(/A1 set 1 differs on measures$/);
    const noRef = grade(same, undefined, NO_REFS);
    expect(proof(noRef, "q2.replay").detail).toContain("A1 set 1 NOT CHECKED (no step-1 record)");
  });

  it("is deterministic, and its report prints every section and every group report", () => {
    const records = recordsOf();
    const a = grade(records);
    const b = grade(recordsOf());
    expect(jsonText(a)).toBe(jsonText(b));
    const text = renderStep2Report(a, records);
    expect(text).toBe(renderStep2Report(b, recordsOf()));
    expect(text.startsWith("# ADR-089 step 2: the arms\n")).toBe(true);
    for (const h of [
      "## What failed, first",
      "## The headline: B3 (pocket-1.s2) against A1 (step 1's design), re-played on the same seeds",
      "## The clause table",
      "## The three-arm decomposition",
      "## The world and the rule",
      "## The information arms",
      "## The pricing arm: B6 against A11",
      "## M2: the counter-forced share of forced decisions",
      "## The interception guard under AM-1 (ADR-089 Appendix F, F.11; entry AM-1, amendments fnv1a:d5f9de6d)",
      "### B3 against A0, gen (the cumulative line: reported, never graded)",
      "## The structural proofs and fold checks inside the arms",
      "## The step reports, one per base group and seed set",
    ]) expect(text, h).toContain(h);
    expect(text.split("\n").filter((l) => l === "```text")).toHaveLength(10);
    expect(text).toContain("the filed guard against");
    expect(text).toContain("(CUT: flat first 1, gen through week 1; tests only)");
    expect(text).not.toContain(tmpdir());
    const one = grade(recordsOf(undefined, [1]), 1);
    expect(renderStep2Report(one, recordsOf(undefined, [1])).split("\n")[0]).toBe("# ADR-089 step 2: the arms, seed set 1 only (reported, never graded)");
  });
});

// --- the run ------------------------------------------------------------------------------------------------------

describe("the run", () => {
  const seam = (calls: string[]) => (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: { corpus?: Step1Corpus }): Step2Record => {
    calls.push(`${id}.set${String(seedSet)}`);
    return synthetic(id, seedSet, env, opts.corpus ?? TINY) as unknown as Step2Record;
  };
  const base = (dir: string, calls: string[]) => ({ filedPath: FILED, amendmentsPath: AMENDMENTS, cacheParent: join(dir, "cache"), env: ENV, corpus: TINY, play: seam(calls), references: NO_REFS });

  it("plays a shard at a time, grades once every target is cached, and two finishing invocations write the same bytes", () => {
    const dir = tempDir("run");
    const calls: string[] = [];
    const common = base(dir, calls);
    const report = join(dir, "out", "step2.md");
    const out = join(dir, "out", "step2.json");
    const r1 = runStep2({ ...common, shard: { index: 1, count: 3 }, report, out });
    expect(r1).toMatchObject({ graded: false, wrote: [], cached: [] });
    expect(r1.played).toHaveLength(8);
    expect(r1.remaining).toHaveLength(16);
    expect(r1.cacheDir).toBe(join(dir, "cache", ENV.fingerprint));
    expect(existsSync(report) || existsSync(out)).toBe(false);
    expect(runStep2({ ...common, shard: { index: 2, count: 3 }, report, out }).graded).toBe(false);
    const r3 = runStep2({ ...common, shard: { index: 3, count: 3 }, report, out });
    expect(r3).toMatchObject({ graded: true, remaining: [], wrote: [report, out] });
    expect(calls.slice().sort()).toEqual(STEP2_RUN_IDS.flatMap((id) => [`${id}.set1`, `${id}.set2`]).sort());
    const bytes = { report: readFileSync(report, "utf8"), out: readFileSync(out, "utf8") };
    const measures = JSON.parse(bytes.out) as { format: string; filedDigest: string; amendments: string; fingerprint: string; arms: Record<string, Step2Record> };
    expect(measures).toMatchObject({ format: STEP2_MEASURES_FORMAT, filedDigest: STEP0_FILED_DIGEST, amendments: AMENDMENTS_DIGEST, fingerprint: ENV.fingerprint });
    expect(Object.keys(measures.arms)).toEqual(STEP2_RUN_IDS.flatMap((id) => [`${id}.set1`, `${id}.set2`]));
    expect(bytes.out).not.toContain(dir);
    expect(bytes.report).not.toContain(dir);
    // The measures file re-grades to itself and its report (Q-3c's path, on this run's files).
    const back = recordsOfMeasures(measures);
    const { file, guard } = preflightStep2(FILED, AMENDMENTS);
    const again = gradeStep2(back.records, file, guard, NO_REFS, back.oneSet);
    expect(renderStep2Report(again, back.records)).toBe(bytes.report);
    expect(jsonText(step2MeasuresOf(back.records, again, guard, back.fingerprint, back.targets, back.oneSet))).toBe(bytes.out);

    const rerun = runStep2({ ...common, shard: { index: 1, count: 3 }, report, out });
    expect(rerun).toMatchObject({ graded: true, played: [] });
    expect(rerun.cached).toHaveLength(8);
    expect(readFileSync(report, "utf8")).toBe(bytes.report);
    expect(readFileSync(out, "utf8")).toBe(bytes.out);
    expect(calls).toHaveLength(24);
  });

  it("writes one named arm's records to --out, each its cache file, whether or not every target is cached (Q-3b)", () => {
    const dir = tempDir("one");
    const out = join(dir, "B3.json");
    const r = runStep2({ ...base(dir, []), arms: ["B3"], out });
    expect(r).toMatchObject({ graded: false, played: ["B3.set1", "B3.set2"], wrote: [out] });
    const body = JSON.parse(readFileSync(out, "utf8")) as { format: string; amendments: string; fingerprint: string; records: Record<string, unknown> };
    expect(body).toMatchObject({ format: STEP2_RECORDS_FORMAT, amendments: AMENDMENTS_DIGEST, fingerprint: ENV.fingerprint });
    expect(Object.keys(body.records)).toEqual(["B3.set1", "B3.set2"]);
    for (const s of [1, 2] as const) expect(body.records[`B3.set${String(s)}`]).toEqual(JSON.parse(readFileSync(armFileOf(r.cacheDir, "B3", s), "utf8")));
    const two = runStep2({ ...base(dir, []), arms: ["B3", "A1"], out: join(dir, "two.json") });
    expect(two.wrote).toEqual([]);
  });

  it("refuses a cached arm whose stamp is not this build's, naming another amendments digest first", () => {
    const dir = tempDir("stale");
    const calls: string[] = [];
    const common = { ...base(dir, calls), arms: ["A1"] as ArmId[], seedSet: 1 as SeedSet };
    runStep2(common);
    expect(() => runStep2({ ...common, env: { ...ENV, node: "v99.0.0" } })).toThrow(/the cached A1 \(set 1\) at .* is not this build's arm: node: cached "v22\.0\.0-test", this build "v99\.0\.0"\. Delete it, or use another --cache/);
    expect(() => runStep2({ ...common, corpus: { flatFirst: 2, genThroughWeek: 1 } })).toThrow(/corpus: cached/);
    const path = armFileOf(join(dir, "cache", ENV.fingerprint), "A1", 1);
    const record = JSON.parse(readFileSync(path, "utf8")) as W<Step2Record>;
    record.stamp.amendments = "fnv1a:00000000";
    writeFileSync(path, jsonText(record));
    expect(() => runStep2(common)).toThrow(/the cached A1 \(set 1\) at .* is not this build's arm: stamped with amendments fnv1a:00000000, not this build's fnv1a:d5f9de6d\. Delete it/);
    expect(calls).toEqual(["A1.set1"]);
    writeFileSync(armFileOf(join(dir, "cache", ENV.fingerprint), "A5", 1), '{"format":"adr-089-step1-arm/v1"}\n');
    expect(() => runStep2({ ...common, arms: ["A5"] })).toThrow(/not a step-2 arm record/);
  });

  it("refuses a committed report from a dirty tree before playing, and from arms stamped dirty when grading", () => {
    const dir = tempDir("committed");
    const committedDir = join(dir, "reports");
    const calls: string[] = [];
    const common = { ...base(dir, calls), committedDir };
    expect(() => runStep2({ ...common, env: { ...ENV, dirty: true }, report: join(committedDir, "adr-089-step2.md") })).toThrow(/a committed report \(under reports\/\) is made from a clean tree/);
    expect(() => runStep2({ ...common, env: { ...ENV, dirty: true }, out: join(committedDir, "sub", "m.json") })).toThrow(/made from a clean tree/);
    expect(calls).toEqual([]);
    expect(runStep2({ ...common, env: { ...ENV, dirty: true }, report: join(dir, "reportsx", "r.md") }).graded).toBe(true);
    expect(() => runStep2({ ...common, report: join(committedDir, "adr-089-step2.md") })).toThrow(/refused to grade a committed report: A0\.set1 was played on a dirty tree/);
    expect(existsSync(committedDir)).toBe(false);
  });

  it("--m2 plays or reads A1 on both sets and returns M2's section, the fingerprint and Q-2's note beside", () => {
    const dir = tempDir("m2");
    const calls: string[] = [];
    const r = runStep2M2(base(dir, calls));
    expect(calls).toEqual(["A1.set1", "A1.set2"]);
    expect(r.m2.rows.map((x) => `${x.arm}/${x.league}/${x.sets}`)).toEqual(["A1/flat/1", "A1/flat/2", "A1/flat/1 and 2", "A1/gen/1", "A1/gen/2", "A1/gen/1 and 2"]);
    expect(r.m2.filed.map((f) => `${f.league}/${f.arm}`)).toEqual(["flat/S-theta11-window", "flat/L-R8", "flat/L-R5", "gen/S-theta11-window", "gen/L-R8", "gen/L-R5"]);
    expect(r.m2.band).toEqual({ lo: 0, hi: 0.02 });
    expect(r.m2.notes.slice(-2)).toEqual([`source fingerprint ${ENV.fingerprint}`, "Q-2's projection: A1.set1 not checked (a cut corpus); A1.set2 not checked (a cut corpus)"]);
    const again = runStep2M2({ ...base(dir, calls), arms: ["A1", "B3"], seedSet: 1 });
    expect(again.cached).toEqual(["A1.set1"]);
    expect(again.played).toEqual(["B3.set1"]);
    expect(again.m2.rows.filter((x) => x.arm === "B3").map((x) => [x.sets, x.zeroByTheRule])).toEqual([["1", true], ["1", true]]);
  });

  it("one seed set plays the run on that set and reports it, never grades it", () => {
    const dir = tempDir("set2");
    const calls: string[] = [];
    const report = join(dir, "r.md");
    const r = runStep2({ ...base(dir, calls), seedSet: 2, report });
    expect(calls).toEqual(STEP2_RUN_IDS.map((id) => `${id}.set2`));
    expect(r.graded).toBe(true);
    expect(r.grade!.sections.oneSet).toBe(2);
    expect(r.grade!.sections.outcome.mergeCard).toBe(false);
    expect(readFileSync(report, "utf8").split("\n")[0]).toBe("# ADR-089 step 2: the arms, seed set 2 only (reported, never graded)");
  });
});

// --- Q-3c ---------------------------------------------------------------------------------------------------------

const COMMITTED_JSON = join(PKG, "reports", "adr-089-step2.json");
const COMMITTED_MD = join(PKG, "reports", "adr-089-step2.md");

describe("Q-3c: the committed step-2 report", () => {
  it.runIf(existsSync(COMMITTED_JSON) && existsSync(COMMITTED_MD))("re-grading the committed records reproduces the committed report and measures, byte for byte", () => {
    const text = readFileSync(COMMITTED_JSON, "utf8");
    const back = recordsOfMeasures(JSON.parse(text));
    const { file, guard } = preflightStep2(FILED, AMENDMENTS);
    const g = gradeStep2(back.records, file, guard, loadStep1References(), back.oneSet);
    expect(renderStep2Report(g, back.records)).toBe(readFileSync(COMMITTED_MD, "utf8"));
    expect(jsonText(step2MeasuresOf(back.records, g, guard, back.fingerprint, back.targets, back.oneSet))).toBe(text);
  });
});
