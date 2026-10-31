/**
 * ADR-089 step 0 — THE FILING SCHEMA, `adr-089-filed/v1` (plan §3.5, §3.7, §7.2).
 *
 * The loader and the validator on constructed files: a complete filing passes; each kind of damage
 * is refused with its path named; a pending marker is refused outside `PENDING_AT_S4`; the three
 * prediction lists are disjoint; `fillPending` fills a marker and refuses to overwrite a filed
 * value; `filedDigest` is `stableDigest` (key order does not move it, a value does).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { stableDigest } from "../src/harness/digest.js";
import { M_IDS } from "../src/pocket/constructs.js";
import { CORPORA } from "../src/pocket/corpus.js";
import {
  FILED_CONSTANT_NAMES,
  FILED_FORMAT,
  FiledValidationError,
  fillPending,
  filedDigest,
  filedProblems,
  loadFiled,
  pendingAllowedAt,
  pendingPaths,
  saveFiled,
  validateFiled,
  type FiledFile,
} from "../src/pocket/filed.js";
import { GOLDEN_PINS, SEASON_PATH_PINS } from "../src/pocket/golden.js";

const constant = (value: unknown, adrLine: number) => ({ value, adrLine });

/** A complete filing as S4 would write it: M-derived fields pending, everything else filed. */
function complete(): FiledFile {
  return JSON.parse(JSON.stringify({
    format: FILED_FORMAT,
    adr: "ADR-089",
    step: 0,
    base: {
      commit: "e23bf69",
      caller: "v7",
      corpora: CORPORA,
      golden: { pins: GOLDEN_PINS, seasonPath: SEASON_PATH_PINS },
      rows: { hit_or_sack_rate: { pending: "BASE" }, release_distribution: { pending: "BASE", note: "mean and bins" } },
    },
    prediction: {
      a: [{ id: "a.digests", text: "every stream digest unchanged", adrLine: 995 }],
      b: [{ id: "b.m4", text: "M4's 6,395 of 21,962 (29.1%)", construct: "M4" }],
      c: [{ id: "c.legacy-free-run", text: "the legacy free-run restatement equals etaTick" }],
    },
    selectionRule: {
      adrLines: [422, 423, 424, 425, 426, 427],
      grids: { S: { theta: [7, 8, 9, 10, 11, 12, 13, 14, 15], k: 2, beta: 0.5, pushWindow: true }, L: { R: [4, 5, 6, 7, 8] } },
      freeRunClock: "WAIT",
      loss: { curve: "hit_rate_by_release_bin", weighting: "attempts", normalise: "each curve by its own all-bin mean" },
      separation: { statistic: "spread_g = |loss_g(set 1) - loss_g(set 2)|", rule: "none if worst - best <= 2 max_g spread_g" },
      fallback: { id: "D1", curve: "pressured_share_by_release_bin" },
    },
    fittingOrder: { adrLine: 1128, steps: ["5a deltas", "5b clock", "10: b", "10: throwaway appeal", "10: situation weights", "selection re-run", "b refit"], maxPasses: 2, ownerReturn: "a second change of selection returns to the owner" },
    bands: {
      clauses: [
        { id: "s1.window", step: "1", row: "pressure", comparator: "qb_disruption_rate", kind: "graded", adrLine: 1005, text: "the window alone moves pressure by at most B1", hi: { pending: "M1", note: "B1 in points" } },
        { id: "s1.sacks", step: "1", row: "sack_rate", comparator: "sack_rate", kind: "graded", adrLine: 1005, text: "and sacks within 0.3", lo: -0.3, hi: 0.3 },
        { id: "s8a.tolerance", step: "8a", row: "situation", comparator: "situation_q1q3_last_two", kind: "graded", adrLine: 1100, text: "within the tolerance", direction: "UNCHANGED", tolerance: { pending: "M9" } },
        { id: "s1.tick-rule", step: "1", row: "window", comparator: "M1", kind: "structural", adrLine: 1007, text: "the window tick rule" },
      ],
      clauseLines: [1005, 1007, 1100],
    },
    fiveB: {
      adrLine: 1063,
      rows: {
        sack_rate: { acceptance: [5.58, 7.54], contributions: [{ step: "1", value: 0.65 }, { step: "3", value: 0.24 }], derived: [3.94, 5.9], filed: [3.9, 5.9], fullInterval: [2.34, 7.5] },
      },
    },
    m1Bound: {
      definition: "B1 = E + 3*SD",
      E: { pending: "M1" }, SD: { pending: "M1" }, B1: { pending: "M1" }, H: { pending: "M1" }, dropbacks: { pending: "M1" },
      margins1to4: { pending: "M1" }, margins5to14: { pending: "M1" },
      uses: [
        { step: "1", adrLine: 1005, text: "the window alone moves pressure by at most B1" },
        { step: "1", adrLine: 1007, text: "the S band's raised upper pressure edge" },
        { step: "5b", adrLine: 1063, text: "5b's raised pressure edge" },
      ],
    },
    step3Check: { adrLines: [1025, 1026, 1027, 1028], part1: "every free runner's etaTick equals M8's function", part2: "the real rows against their bands" },
    constants: Object.fromEntries(FILED_CONSTANT_NAMES.map((name, i) => [name, constant(i, 578)])),
    rules: {
      arrivalReading: { adrLine: 698, text: "D21" },
      lCrossingTime: { adrLine: 425, text: "T_L, clamped to (t - 0.5, t]" },
      lateBlock: { adrLine: 546, text: "both shapes" },
      missRule: { adrLine: 1172, text: "D31", classes: ["i", "ii", "iii", "iv"], options: ["A", "B", "C"], neverMoves: ["the free-run constants"] },
      bGrid: { adrLine: 669, text: "b in -15..15", values: Array.from({ length: 31 }, (_, i) => i - 15) },
      runMargin: { adrLine: 727, text: "RUN's margin", delta: 10, urgency: [0, 3] },
      unblockedBands: { adrLine: 1172, text: "at most 14 and at most 40", per100DropbacksMax: 14, shareOfHitOrSackMax: 40 },
    },
    M: Object.fromEntries(M_IDS.map((m) => [m, { pending: m }])),
    census: { pathDigest: "fnv1a:365da48d", tunablesDigest: "fnv1a:395a9ae2" },
    context: { sLateArm: { adrLine: 991, text: "the S late arm, context only", seedSet: 2, runAtStep: "1" } },
  })) as FiledFile;
}

/** `complete()` with one edit applied to a mutable copy. */
function damaged(edit: (f: Record<string, any>) => void): unknown {
  const f = complete() as unknown as Record<string, any>;
  edit(f);
  return f;
}

const problemsOf = (edit: (f: Record<string, any>) => void): string => filedProblems(damaged(edit)).join("\n");

describe("ADR-089 step 0: the filing validator", () => {
  it("passes a complete filing, and lists where its pending fields stand", () => {
    expect(filedProblems(complete())).toEqual([]);
    const file = validateFiled(complete());
    const pending = pendingPaths(file).map((p) => `${p.path}=${p.source}`);
    expect(pending).toContain("base.rows.hit_or_sack_rate=BASE");
    expect(pending).toContain("bands.clauses.0.hi=M1");
    expect(pending).toContain("bands.clauses.2.tolerance=M9");
    expect(pending).toContain("m1Bound.B1=M1");
    for (const m of M_IDS) expect(pending).toContain(`M.${m}=${m}`);
  });

  it("refuses a wrong format, adr or step, a missing block and an unknown block", () => {
    expect(problemsOf((f) => { f["format"] = "adr-089-filed/v0"; })).toMatch(/^format:/m);
    expect(problemsOf((f) => { f["adr"] = "ADR-090"; })).toMatch(/^adr:/m);
    expect(problemsOf((f) => { f["step"] = 1; })).toMatch(/^step:/m);
    expect(problemsOf((f) => { delete f["census"]; })).toMatch(/^census: is missing/m);
    expect(problemsOf((f) => { f["extra"] = {}; })).toMatch(/^extra: is not part of the schema/m);
    expect(problemsOf((f) => { f["base"]["note"] = "x"; })).toMatch(/^base\.note: is not part of the schema/m);
  });

  it("refuses damaged clauses: a kind, a duplicate id, a line outside the design, an unbounded graded clause, lo above hi", () => {
    expect(problemsOf((f) => { f["bands"]["clauses"][0]["kind"] = "soft"; })).toMatch(/clauses\.0\.kind/);
    expect(problemsOf((f) => { f["bands"]["clauses"][1]["id"] = "s1.window"; })).toMatch(/filed twice/);
    expect(problemsOf((f) => { f["bands"]["clauses"][1]["adrLine"] = 2019; })).toMatch(/clauses\.1\.adrLine: must be a line of the design/);
    expect(problemsOf((f) => { f["bands"]["clauseLines"].push(0); })).toMatch(/clauseLines\.3/);
    expect(problemsOf((f) => { delete f["bands"]["clauses"][1]["lo"]; delete f["bands"]["clauses"][1]["hi"]; })).toMatch(/needs lo, hi or a direction/);
    expect(problemsOf((f) => { f["bands"]["clauses"][1]["lo"] = 1; })).toMatch(/lo must not exceed hi/);
    expect(problemsOf((f) => { f["bands"]["clauses"][1]["direction"] = "SIDEWAYS"; })).toMatch(/direction/);
  });

  it("refuses the other blocks' damage: M keys, the census digests, b's grid, B1's three uses, a missing constant", () => {
    expect(problemsOf((f) => { delete f["M"]["M5"]; })).toMatch(/^M\.M5: is missing/m);
    expect(problemsOf((f) => { f["M"]["M10"] = 1; })).toMatch(/^M\.M10: is not part of the schema/m);
    expect(problemsOf((f) => { f["census"]["pathDigest"] = "365da48d"; })).toMatch(/census\.pathDigest/);
    expect(problemsOf((f) => { f["rules"]["bGrid"]["values"][3] = 2.5; })).toMatch(/whole numbers/);
    expect(problemsOf((f) => { f["m1Bound"]["uses"].pop(); })).toMatch(/exactly three uses/);
    expect(problemsOf((f) => { delete f["constants"]["freeRun.tauMin"]; })).toMatch(/constants\.freeRun\.tauMin: is missing/);
    expect(problemsOf((f) => { f["fiveB"]["rows"]["sack_rate"]["derived"] = [5.9, 3.94]; })).toMatch(/lo must not exceed hi/);
    expect(problemsOf((f) => { f["base"]["commit"] = "HEAD"; })).toMatch(/base\.commit/);
    expect(problemsOf((f) => { f["context"]["sLateArm"]["seedSet"] = 3; })).toMatch(/seedSet/);
  });

  it("keeps the three prediction lists disjoint", () => {
    expect(problemsOf((f) => { f["prediction"]["c"].push({ id: "a.digests", text: "the same item twice" }); })).toMatch(/also in prediction\.a/);
  });

  it("allows a pending marker only at PENDING_AT_S4's paths, and only a well-formed one", () => {
    expect(problemsOf((f) => { f["census"]["pathDigest"] = { pending: "BASE" }; })).toMatch(/census\.pathDigest: a pending marker is allowed only/);
    expect(problemsOf((f) => { f["bands"]["clauses"][0]["comparator"] = { pending: "M1" }; })).toMatch(/clauses\.0\.comparator/);
    expect(problemsOf((f) => { f["fittingOrder"]["maxPasses"] = { pending: "M2" }; })).toMatch(/fittingOrder\.maxPasses/);
    expect(problemsOf((f) => { f["constants"]["freeRun.tauMin"] = { pending: "M8" }; })).toMatch(/constants\.freeRun\.tauMin/);
    expect(problemsOf((f) => { f["M"]["M3"] = { pending: "M10" }; })).toMatch(/pending names no source/);
    expect(problemsOf((f) => { f["M"]["M3"] = { pending: "M3", value: 1 }; })).toMatch(/\{pending, note\?\} and nothing else/);
    expect(pendingAllowedAt(["bands", "clauses", "7", "hi"])).toBe(true);
    expect(pendingAllowedAt(["bands", "clauses", "7", "step"])).toBe(false);
    expect(pendingAllowedAt(["M", "M8"])).toBe(true);
    expect(pendingAllowedAt(["M", "M8", "wait"])).toBe(false);
  });

  it("validateFiled throws one error naming every problem", () => {
    const bad = damaged((f) => { f["step"] = 2; delete f["rules"]; });
    expect(() => validateFiled(bad)).toThrow(FiledValidationError);
    try {
      validateFiled(bad);
    } catch (e) {
      expect((e as FiledValidationError).problems.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("ADR-089 step 0: loading, saving, filling and the digest", () => {
  const dir = mkdtempSync(join(tmpdir(), "adr089-filed-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("saves and loads a filing through the validator, byte for byte", () => {
    const path = join(dir, "filed.json");
    saveFiled(path, complete());
    expect(loadFiled(path)).toEqual(complete());
    const bytes = readFileSync(path, "utf8");
    expect(bytes.endsWith("}\n")).toBe(true);
    saveFiled(path, loadFiled(path));
    expect(readFileSync(path, "utf8")).toBe(bytes);
  });

  it("refuses to save or load a damaged filing", () => {
    const path = join(dir, "bad.json");
    expect(() => saveFiled(path, damaged((f) => { f["M"]["M1"] = { pending: "nobody" }; }) as FiledFile)).toThrow(FiledValidationError);
    writeFileSync(path, JSON.stringify(damaged((f) => { delete f["prediction"]; })));
    expect(() => loadFiled(path)).toThrow(/prediction: is missing/);
  });

  it("fillPending fills a marker, and refuses a filed value or a missing path", () => {
    const filled = fillPending(complete(), "m1Bound.B1", 1.42);
    expect(filled.m1Bound.B1).toBe(1.42);
    expect(pendingPaths(filled).some((p) => p.path === "m1Bound.B1")).toBe(false);
    expect(fillPending(complete(), "bands.clauses.0.hi", 3.1).bands.clauses[0]!.hi).toBe(3.1);
    expect(() => fillPending(filled, "m1Bound.B1", 2)).toThrow(/append-only/);
    expect(() => fillPending(complete(), "bands.clauses.1.hi", 2)).toThrow(/append-only/);
    expect(() => fillPending(complete(), "m1Bound.nothing", 2)).toThrow(/no field/);
    expect(() => fillPending(complete(), "M.M2", { pending: "M2" } as never)).toThrow(/not another marker/);
  });

  it("filedDigest is stableDigest: key order does not move it, any value does", () => {
    const f = complete();
    expect(filedDigest(f)).toBe(stableDigest(f));
    const reordered = Object.fromEntries(Object.entries(f).reverse());
    expect(filedDigest(reordered)).toBe(filedDigest(f));
    expect(filedDigest(fillPending(f, "m1Bound.E", 0.5))).not.toBe(filedDigest(f));
  });
});
