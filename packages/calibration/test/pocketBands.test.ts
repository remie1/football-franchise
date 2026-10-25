/**
 * ADR-089 step 0 — EVERY BAND (§6.1-§6.10 and §8's guard; plan §7.2 `bands`, `fiveB`, `m1Bound`; C1-S7).
 *
 * The clauses are well formed; the plan's examples are filed as the plan states them; the
 * completeness list is the plan's ranges less the lines that state no clause, and each of those is
 * proved, against the C0 bytes of the ADR, to be a blank line, a heading or a table rule; entry
 * 125's comparator check passes on today's registry and refuses each kind of bad comparator; 5b's
 * bands are re-derived; the M1 bound is the one quantity in its three uses; and §8's additive mix
 * rule, league-wide and by class.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allMetrics } from "../src/metrics/index.js";
import {
  ACCEPTANCE_BANDS,
  CLAUSES,
  CLAUSE_LINES,
  CLAUSE_LINE_RANGES,
  FIVE_B,
  FIVE_B_CONTRIBUTIONS,
  FUTURE_ROWS,
  GUARD_CLASSES,
  LINES_WITHOUT_CLAUSE,
  M1_BOUND,
  PROOFS,
  RETIRED_REAL_SIDES,
  comparatorProblems,
  derive5b,
  expandRanges,
  intGuard,
  intGuardByClass,
  mixPredictedRise,
  type IntMix,
} from "../src/pocket/bands.js";
import { ADR_089_LINES, CLAUSE_DIRECTIONS, CLAUSE_KINDS, isPending, type BandClause } from "../src/pocket/filed.js";
import { REAL } from "../src/pocket/selection.js";
import { stableDigest } from "../src/harness/digest.js";

const ADR_PATH = join(import.meta.dirname, "..", "..", "..", "docs", "decisions", "ADR-089-the-pocket-on-a-real-clock.md");
const ADR_LINES = readFileSync(ADR_PATH, "utf8").split("\n");
const line = (n: number): string => ADR_LINES[n - 1]!;
/** `stableDigest` of the C0 lines 1 to 2018 (ADR-089 as C0 landed it, and as /mnt/project-files holds it). */
const C0_DIGEST = "fnv1a:b175b420";

const byId = new Map(CLAUSES.map((c) => [c.id, c]));
const get = (id: string): BandClause => {
  const c = byId.get(id);
  if (c === undefined) throw new Error(`no clause ${id}`);
  return c;
};
const STEPS = new Set(["1", "2", "3", "4", "5a", "5b", "6", "7", "8a", "8b", "9", "10", "acceptance", "guard"]);

describe("the clauses", () => {
  it("are well formed: unique ids, a known step, kind and direction, a design line, text, and lo <= hi", () => {
    expect(byId.size).toBe(CLAUSES.length);
    for (const c of CLAUSES) {
      expect(STEPS.has(c.step), `${c.id}: step ${c.step}`).toBe(true);
      expect(CLAUSE_KINDS).toContain(c.kind);
      if (c.direction !== undefined) expect(CLAUSE_DIRECTIONS).toContain(c.direction);
      expect(Number.isInteger(c.adrLine) && c.adrLine >= 1 && c.adrLine <= ADR_089_LINES, `${c.id}: line ${String(c.adrLine)}`).toBe(true);
      expect(c.text.length, c.id).toBeGreaterThan(0);
      expect(c.row.length, c.id).toBeGreaterThan(0);
      if (typeof c.lo === "number" && typeof c.hi === "number") expect(c.lo, c.id).toBeLessThanOrEqual(c.hi);
    }
  });

  it("gives every graded or reported clause a band, a value or a direction", () => {
    for (const c of CLAUSES.filter((x) => x.kind !== "structural")) {
      expect(c.lo !== undefined || c.hi !== undefined || c.direction !== undefined, c.id).toBe(true);
    }
  });

  it("files step 1 as the plan's example: L at R = 8, 36.50 / 2.86 / 2.41 / 1.590 with tolerances; S 28-40 / 2-4 / 1.5-1.7; pressure above 45", () => {
    expect(get("s1.L8.flat.pressure")).toMatchObject({ lo: 33.5, hi: 39.5, tolerance: 3, kind: "graded" });
    expect(get("s1.L8.flat.hitOrSack")).toMatchObject({ lo: 2.86, hi: 2.86, kind: "reported" });
    expect(get("s1.L8.flat.sack")).toMatchObject({ lo: 1.91, hi: 2.91, tolerance: 0.5 });
    expect(get("s1.L8.flat.release")).toMatchObject({ lo: 1.54, hi: 1.64, tolerance: 0.05 });
    expect(get("s1.S.pressure").lo).toBe(28);
    expect(isPending(get("s1.S.pressure").hi)).toBe(true);
    expect(get("s1.S.sack")).toMatchObject({ lo: 2, hi: 4 });
    expect(get("s1.S.release")).toMatchObject({ lo: 1.5, hi: 1.7 });
    expect(get("s1.falsifier.pressure45")).toMatchObject({ hi: 45, kind: "graded" });
    expect(get("s1.window.ticks")).toMatchObject({ kind: "structural", comparator: "proof:window-ticks" });
  });

  it("files acceptance's graded triple: sacks 5.58-7.54, hit-or-sack 12.5-16.9, time to throw 2.24-3.03", () => {
    expect(get("acc.sack")).toMatchObject({ lo: 5.58, hi: 7.54, kind: "graded", adrLine: 1134 });
    expect(get("acc.hitOrSack")).toMatchObject({ lo: 12.5, hi: 16.9, kind: "graded" });
    expect(get("acc.timeToThrow")).toMatchObject({ lo: 2.24, hi: 3.03, kind: "graded" });
    expect(ACCEPTANCE_BANDS).toEqual({ sack_rate: [5.58, 7.54], hit_or_sack_rate: [12.5, 16.9] });
  });

  it("files §8's guard: league-wide (D9) and by class (D28), the removed class and throws on the run", () => {
    expect(get("guard.mix")).toMatchObject({ kind: "graded", adrLine: 1306 });
    expect(get("guard.byClass")).toMatchObject({ kind: "graded", adrLine: 1308 });
    expect(get("guard.removedClass").kind).toBe("structural");
    expect(get("guard.onTheRun.clean")).toMatchObject({ lo: 2.11, hi: 2.11 });
    expect(get("guard.onTheRun.pressured")).toMatchObject({ lo: 3.25, hi: 3.25 });
  });

  it("leaves pending only the M-derived edges: B1 on three pressure edges, M2's share, M9's three Q1/Q3 tolerances on 8a and acceptance", () => {
    const pending: string[] = [];
    for (const c of CLAUSES) {
      for (const f of ["lo", "hi", "tolerance"] as const) {
        const v = c[f];
        if (isPending(v)) pending.push(`${c.id}.${f}:${v.pending}`);
        else if (v !== undefined) expect(typeof v, `${c.id}.${f}`).toBe("number");
      }
    }
    expect(pending.sort()).toEqual([
      "acc.q1q3.passRate.tolerance:M9",
      "acc.q1q3.timeToThrow.tolerance:M9",
      "acc.q1q3.tolerance:M9",
      "s1.S.pressure.hi:M1",
      "s1.window.pressure.hi:M1",
      "s1.window.pressure.lo:M1",
      "s2.m2.hi:M2",
      "s2.m2.lo:M2",
      "s5b.pressure.hi:M1",
      "s8a.q1q3.passRate.tolerance:M9",
      "s8a.q1q3.timeToThrow.tolerance:M9",
      "s8a.q1q3.tolerance:M9",
    ]);
  });
});

describe("the completeness list (the C0 bytes)", () => {
  // C3 (plan §7.3 item 6) appends Appendix E after the C0 bytes, so the file is the C0 lines, pinned
  // by digest, then nothing but that appendix: every filed adrLine still points at the C0 text.
  it("reads the C0 bytes at their filed length, with only Appendix E after them", () => {
    const c0 = ADR_LINES.slice(0, ADR_089_LINES);
    expect(c0).toHaveLength(ADR_089_LINES);
    expect(stableDigest(c0.join("\n")), "ADR-089's C0 lines changed: every filed adrLine reads them").toBe(C0_DIGEST);
    const after = ADR_LINES.slice(ADR_089_LINES);
    if (after.length > 1) {
      expect(after[0]).toBe("");
      expect(after[1]).toBe("## Appendix E: the step-0 filing record");
      expect(after.slice(2).filter((l) => /^## /.test(l))).toEqual([]);
    }
    expect(ADR_LINES.at(-1)).toBe("");
  });

  it("is exactly the plan's ranges less the lines that state no clause, the two disjoint", () => {
    const ranges = expandRanges(CLAUSE_LINE_RANGES);
    const without = Object.keys(LINES_WITHOUT_CLAUSE).map(Number);
    expect(new Set(ranges).size).toBe(ranges.length);
    for (const n of without) expect(CLAUSE_LINES, `line ${String(n)}`).not.toContain(n);
    expect([...CLAUSE_LINES, ...without].sort((a, b) => a - b)).toEqual([...ranges].sort((a, b) => a - b));
  });

  it("puts every clause's line in the list, and every listed line has a clause", () => {
    const lines = new Set(CLAUSE_LINES);
    for (const c of CLAUSES) expect(lines.has(c.adrLine), c.id).toBe(true);
    for (const n of CLAUSE_LINES) expect(CLAUSES.some((c) => c.adrLine === n), `line ${String(n)}`).toBe(true);
  });

  it("leaves out only blank lines, headings and table rules, each proved on the C0 bytes", () => {
    const separator = /^\|(\s*:?-+:?\s*\|)+$/;
    for (const [n, kind] of Object.entries(LINES_WITHOUT_CLAUSE)) {
      const text = line(Number(n));
      const at = `ADR-089:${n} (${kind}): ${text.slice(0, 80)}`;
      if (kind === "blank") expect(text.trim(), at).toBe("");
      else if (kind === "table separator") expect(separator.test(text), at).toBe(true);
      else if (kind === "table header") {
        expect(text.startsWith("|"), at).toBe(true);
        expect(separator.test(line(Number(n) + 1)), at).toBe(true);
      } else {
        expect(/^\*\*[^*]+\*\*( \([^)]*\))?:$|^\*\*[^*]+:\*\*$/.test(text), at).toBe(true);
      }
    }
  });

  it("lists no blank line or table rule as a clause's line", () => {
    for (const n of CLAUSE_LINES) {
      const text = line(n);
      expect(text.trim(), `ADR-089:${String(n)}`).not.toBe("");
      expect(/^\|(\s*:?-+:?\s*\|)+$/.test(text), `ADR-089:${String(n)}`).toBe(false);
    }
  });
});

describe("entry 125: what each clause is compared against", () => {
  const metricIds = new Set(allMetrics().map((m) => m.id));

  it("resolves every comparator on today's registry, the constructs, a filed future row or a filed proof", () => {
    expect(comparatorProblems(CLAUSES, metricIds)).toEqual([]);
  });

  it("files every future row with the step it must exist by, and every proof with the step that builds it", () => {
    for (const [id, r] of Object.entries(FUTURE_ROWS)) {
      expect(id.startsWith("row:"), id).toBe(true);
      expect(STEPS.has(r.mustExistBy), id).toBe(true);
    }
    for (const [id, p] of Object.entries(PROOFS)) {
      expect(id.startsWith("proof:"), id).toBe(true);
      expect(STEPS.has(p.builtAt) || p.builtAt === "0", id).toBe(true);
    }
    const used = new Set(CLAUSES.map((c) => c.comparator));
    for (const id of Object.keys(FUTURE_ROWS)) expect(used.has(id), `${id} is used`).toBe(true);
  });

  it("marks every clause on pressure 'sim side only', because its real side is retired", () => {
    expect(Object.keys(RETIRED_REAL_SIDES)).toEqual(["threat_creation_rate"]);
    const onPressure = CLAUSES.filter((c) => c.comparator === "threat_creation_rate");
    expect(onPressure.length).toBeGreaterThan(10);
    for (const c of onPressure) expect(c.row, c.id).toMatch(/sim side only/);
  });

  it("refuses an unknown id, an unfiled row or proof, a proof on a graded clause, and pressure without 'sim side only'", () => {
    const base = get("s1.S.sack");
    const bad: BandClause[] = [
      { ...base, id: "x.unknown", comparator: "no_such_metric" },
      { ...base, id: "x.row", comparator: "row:not_filed" },
      { ...base, id: "x.proof", comparator: "proof:not-filed", kind: "structural" },
      { ...base, id: "x.gradedProof", comparator: "proof:off-bytes" },
      { ...base, id: "x.pressure", comparator: "threat_creation_rate", row: "pressure" },
    ];
    const problems = comparatorProblems(bad, metricIds);
    expect(problems).toHaveLength(5);
    expect(problems[0]).toMatch(/x\.unknown: no_such_metric is neither an allMetrics\(\) id nor a constructs\.ts id/);
    expect(problems[1]).toMatch(/x\.row: row:not_filed is not a filed future row/);
    expect(problems[2]).toMatch(/x\.proof: proof:not-filed is not a filed proof/);
    expect(problems[3]).toMatch(/x\.gradedProof: a proof comparator .* structural clause only/);
    expect(problems[4]).toMatch(/x\.pressure: threat_creation_rate's .*sim side only/);
  });
});

describe("5b, re-derived (ADR-089:1063)", () => {
  it("shifts acceptance down by the later steps' midpoints: 1.64 for sacks and -1.28 for hit-or-sack", () => {
    expect(derive5b(ACCEPTANCE_BANDS.sack_rate, FIVE_B_CONTRIBUTIONS.sack_rate).shift).toBeCloseTo(1.64, 10);
    expect(derive5b(ACCEPTANCE_BANDS.hit_or_sack_rate, FIVE_B_CONTRIBUTIONS.hit_or_sack_rate).shift).toBeCloseTo(-1.28, 10);
  });

  it("reproduces 3.94-5.90 (filed 3.9-5.9) and 13.78-18.18 (filed 13.8-18.2), with the full intervals 2.34-7.50 and 10.68-21.28", () => {
    const s = derive5b(ACCEPTANCE_BANDS.sack_rate, FIVE_B_CONTRIBUTIONS.sack_rate);
    expect(s.derived[0]).toBeCloseTo(3.94, 10);
    expect(s.derived[1]).toBeCloseTo(5.9, 10);
    expect(s.filed).toEqual([3.9, 5.9]);
    expect(s.fullInterval[0]).toBeCloseTo(2.34, 10);
    expect(s.fullInterval[1]).toBeCloseTo(7.5, 10);
    const h = derive5b(ACCEPTANCE_BANDS.hit_or_sack_rate, FIVE_B_CONTRIBUTIONS.hit_or_sack_rate);
    expect(h.derived[0]).toBeCloseTo(13.78, 10);
    expect(h.derived[1]).toBeCloseTo(18.18, 10);
    expect(h.filed).toEqual([13.8, 18.2]);
    expect(h.fullInterval[0]).toBeCloseTo(10.68, 10);
    expect(h.fullInterval[1]).toBeCloseTo(21.28, 10);
  });

  it("files the same figures in the fiveB block and on 5b's two clauses", () => {
    expect(FIVE_B.adrLine).toBe(1063);
    expect(FIVE_B.rows["sack_rate"]!.filed).toEqual([3.9, 5.9]);
    expect(FIVE_B.rows["hit_or_sack_rate"]!.filed).toEqual([13.8, 18.2]);
    expect(get("s5b.sack")).toMatchObject({ lo: 3.9, hi: 5.9, kind: "graded" });
    expect(get("s5b.hitOrSack")).toMatchObject({ lo: 13.8, hi: 18.2, kind: "graded" });
  });
});

describe("the M1 bound (deviation O1): one quantity, B1, in all three uses", () => {
  it("is pending M1 in every figure until C3", () => {
    for (const f of ["E", "SD", "B1", "H", "dropbacks", "margins1to4", "margins5to14"] as const) {
      const v = M1_BOUND[f];
      expect(isPending(v) && v.pending === "M1", f).toBe(true);
    }
    expect(M1_BOUND.definition).toMatch(/B1 = E \+ 3 \* SD/);
  });

  it("names its three uses, and those are exactly the clauses with an M1 edge", () => {
    expect(M1_BOUND.uses.map((u) => [u.step, u.adrLine])).toEqual([["1", 1007], ["1", 1007], ["5b", 1063]]);
    const named = new Set(M1_BOUND.uses.flatMap((u) => [...u.text.matchAll(/\(([^)]*\.[^)]*)\)/g)].flatMap((m) => m[1]!.split(", "))));
    const withM1 = CLAUSES.filter((c) => [c.lo, c.hi, c.tolerance].some((v) => isPending(v) && v.pending === "M1")).map((c) => c.id);
    expect([...named].sort()).toEqual(["s1.S.pressure", "s1.window.pressure", "s1.window.sack", "s5b.pressure"]);
    expect(withM1.sort()).toEqual(["s1.S.pressure", "s1.window.pressure", "s5b.pressure"]);
  });
});

describe("§8's guard: the additive mix rule (D9) and by class (D28)", () => {
  const at = (bin: number, n: number): number[] => Array.from({ length: 7 }, (_, i) => (i === bin ? n : 0));
  const mix = (aimedByBin: readonly number[], interceptions: number): IntMix => ({ aimedByBin, interceptions });

  it("predicts no rise for an unchanged release mix, and the real rate difference for a whole shift", () => {
    expect(mixPredictedRise(at(0, 100), at(0, 300), "RAW")).toBe(0);
    expect(mixPredictedRise(at(0, 100), at(1, 100), "RAW")).toBeCloseTo(REAL.intPerAimedRaw[1]! - REAL.intPerAimedRaw[0]!, 12);
    expect(mixPredictedRise(at(0, 100), at(1, 100), "TICK")).toBeCloseTo(REAL.intPerAimedTick[1]! - REAL.intPerAimedTick[0]!, 12);
    const half = [50, 50, 0, 0, 0, 0, 0];
    expect(mixPredictedRise(at(0, 100), half, "RAW")).toBeCloseTo(0.5 * (2.07 - 1.1), 12);
  });

  it("passes a rise within the predicted one and breaks on a rise beyond it", () => {
    const base = mix(at(0, 1000), 11);
    const within = intGuard(base, mix(at(1, 1000), 20), "RAW");
    expect(within.baseRate).toBeCloseTo(1.1, 12);
    expect(within.armRate).toBeCloseTo(2.0, 12);
    expect(within.allowed).toBeCloseTo(0.97, 12);
    expect(within.passes).toBe(true);
    expect(intGuard(base, mix(at(1, 1000), 21), "RAW").passes).toBe(false);
  });

  it("reads six aimed classes: normal-bar, rank-pushed, checkdown, clean-expiry, desperation, on the run", () => {
    expect(GUARD_CLASSES).toEqual(["PROGRESSION", "RANK_PUSHED", "CHECKDOWN", "CLEAN_EXPIRY", "DESPERATION", "ON_THE_RUN"]);
  });

  it("never lets a fall in one class offset a rise in another", () => {
    const base = { PROGRESSION: mix(at(0, 1000), 11), DESPERATION: mix(at(0, 1000), 50) };
    const arm = { PROGRESSION: mix(at(0, 1000), 30), DESPERATION: mix(at(0, 1000), 20) };
    const leagueWide = intGuard(mix(at(0, 2000), 61), mix(at(0, 2000), 50), "RAW");
    expect(leagueWide.passes).toBe(true);
    const v = intGuardByClass(base, arm, "RAW");
    expect(v.passes).toBe(false);
    expect(v.byClass.PROGRESSION).toMatchObject({ status: "SCORED", passes: false });
    expect(v.byClass.DESPERATION).toMatchObject({ status: "SCORED", passes: true });
  });

  it("reports a removed class with its count and interceptions, and a class with no base apart, neither scored", () => {
    const base = { PROGRESSION: mix(at(0, 1000), 11), DESPERATION: mix(at(2, 400), 76) };
    const arm = { PROGRESSION: mix(at(0, 1000), 11), CLEAN_EXPIRY: mix(at(4, 200), 3) };
    const v = intGuardByClass(base, arm, "TICK");
    expect(v.byClass.DESPERATION).toEqual({ status: "REMOVED", baseThrows: 400, baseInterceptions: 76 });
    expect(v.byClass.CLEAN_EXPIRY).toEqual({ status: "NO_BASE", armThrows: 200, armInterceptions: 3 });
    expect(v.byClass.PROGRESSION).toMatchObject({ status: "SCORED", passes: true });
    expect(v.byClass.CHECKDOWN).toBeUndefined();
    expect(v.passes).toBe(true);
  });

  it("refuses a mix of the wrong length or with no aimed throws", () => {
    expect(() => mixPredictedRise([1, 2], at(0, 1), "RAW")).toThrow(/one count per release bin/);
    expect(() => mixPredictedRise(at(0, 0), at(0, 1), "RAW")).toThrow(/at least one aimed throw/);
  });
});
