/**
 * ADR-089 step 0 — THE MISS RULE (default D31, ADR-089:1170-1185; plan §7.2 `rules`).
 *
 * The class (i) threshold (L - n)/(100 - n) against the design's three quoted values
 * (ADR-089:620); each class on a constructed arm, and two classes named together; the unclassed
 * case; nothing to class when nothing missed; a row the rule does not cover refused; the stop
 * rule; and the filed block (item 2's never-moves list, the options, the suppliers in order).
 */
import { describe, expect, it } from "vitest";
import { CLAUSES } from "../src/pocket/bands.js";
import {
  BIN_20_LIMIT,
  CONVERSION_SUPPLIERS,
  FILED_MISS_RULE,
  FILED_UNBLOCKED_BANDS,
  MISS_RULE_COVERS,
  NEVER_MOVES,
  QUICK_SHARE_BAND,
  afterChosenOption,
  classifyMiss,
  supplyThreshold,
  type MissSplit,
} from "../src/pocket/missRule.js";

describe("the class (i) threshold, (L - n)/(100 - n)", () => {
  it("is 5.87 at (29.4, 25), 14.93 at (36.2, 25) and 23.4 at (36.2, 16.7) (ADR-089:620)", () => {
    expect(supplyThreshold(29.4, 25)).toBeCloseTo(5.87, 2);
    expect(supplyThreshold(36.2, 25)).toBeCloseTo(14.93, 2);
    expect(supplyThreshold(36.2, 16.7)).toBeCloseTo(23.4, 1);
  });

  it("reads L on the grid the step uses: 29.4 tick at step 3, 36.2 raw once the motion exists", () => {
    expect(BIN_20_LIMIT).toEqual({ TICK: 29.4, RAW: 36.2 });
    expect(supplyThreshold(BIN_20_LIMIT.TICK, 25)).toBe(supplyThreshold(29.4, 25));
  });

  it("is the share at which the bin just fails when a 2.0 s throw with a free runner is always pressured", () => {
    // bin = f * 100 + (1 - f) * n; at f = threshold the bin is exactly L.
    for (const [L, n] of [[29.4, 25], [36.2, 25], [36.2, 16.7], [36.2, 0]] as const) {
      const f = supplyThreshold(L, n) / 100;
      expect(f * 100 + (1 - f) * n).toBeCloseTo(L, 10);
    }
  });

  it("refuses n of 100 or more", () => {
    expect(() => supplyThreshold(29.4, 100)).toThrow(/below 100/);
  });
});

/** An arm on which every class's conditions are off and nothing missed (step 3, the tick grid). */
function quiet(): MissSplit {
  return {
    grid: "TICK",
    bin20NoFreeRunner: 20,
    freeRunnerShareOf20: 5,
    quick: 40,
    quickNoFreeRunner: 40,
    unblockedPressuresPer100: 10,
    unblockedShareOfHitOrSack: 30,
    freeRunnersEarlierThanM8: 0,
    hitOrSackInBand: true,
    sacksShort: false,
    shareShort: false,
    rows: [
      { clause: "s3.bin20.tick", value: 25, passed: true },
      { clause: "s3.quick", value: 40, passed: true },
      { clause: "s3.unblockedPressures", value: 10, passed: true },
      { clause: "s3.unblockedShare", value: 30, passed: true },
    ],
  };
}

const miss = (split: MissSplit, clause: string, value: number): MissSplit => ({
  ...split,
  rows: split.rows.map((r) => (r.clause === clause ? { clause, value, passed: false } : r)),
});

const classes = (split: MissSplit): readonly string[] => classifyMiss(split).classes.map((c) => c.class);

describe("the class, on constructed arms", () => {
  it("has nothing to class when nothing missed", () => {
    const c = classifyMiss(quiet());
    expect(c.missed).toEqual([]);
    expect(c.classes).toEqual([]);
    expect(c.options).toEqual([]);
  });

  it("(i) supply: the bin passes without a free runner, but free runners are on more than the threshold", () => {
    // n 20 <= 29.4; threshold (29.4 - 20)/80 = 11.75; free runners on 15.
    const s = miss({ ...quiet(), freeRunnerShareOf20: 15 }, "s3.bin20.tick", 32);
    expect(classes(s)).toEqual(["SUPPLY"]);
    expect(classifyMiss(s).classes[0]!.because[0]).toMatch(/above \(L - n\)\/\(100 - n\) = 11\.75/);
  });

  it("(i) supply: unblocked pressures above 14 per 100, or their share above 40", () => {
    expect(classes(miss({ ...quiet(), unblockedPressuresPer100: 15 }, "s3.unblockedPressures", 15))).toEqual(["SUPPLY"]);
    expect(classes(miss({ ...quiet(), unblockedShareOfHitOrSack: 41 }, "s3.unblockedShare", 41))).toEqual(["SUPPLY"]);
  });

  it("(i) supply: the quick share fails while it passes with no free runner", () => {
    expect(classes(miss({ ...quiet(), quick: 60, quickNoFreeRunner: 45 }, "s3.quick", 60))).toEqual(["SUPPLY"]);
  });

  it("(ii) timing: the bin fails without a free runner (n > L), on the grid the step uses", () => {
    const s = miss({ ...quiet(), bin20NoFreeRunner: 31 }, "s3.bin20.tick", 40);
    expect(classes(s)).toEqual(["TIMING"]);
    // On raw seconds the same n is under L = 36.2, so the bin's failure there is not timing.
    const raw: MissSplit = { ...s, grid: "RAW", freeRunnerShareOf20: 0, rows: [{ clause: "mr.bin20.raw", value: 40, passed: false }] };
    expect(classes(raw)).toEqual(["UNCLASSED"]);
  });

  it("(ii) timing: the quick share fails with no free runner, or free runners arrive earlier than M8's table", () => {
    expect(classes(miss({ ...quiet(), quick: 60, quickNoFreeRunner: 58 }, "s3.quick", 60))).toEqual(["TIMING"]);
    expect(classes(miss({ ...quiet(), freeRunnersEarlierThanM8: 3 }, "s3.bin20.tick", 32))).toEqual(["TIMING"]);
  });

  it("(iii) conversion: hit-or-sack in its band but sacks or the share short, with the suppliers in order", () => {
    const s: MissSplit = { ...quiet(), sacksShort: true, rows: [{ clause: "s5b.sack", value: 3.1, passed: false }, { clause: "s5b.hitOrSack", value: 15, passed: true }] };
    const c = classifyMiss(s);
    expect(c.classes.map((x) => x.class)).toEqual(["CONVERSION"]);
    expect(c.classes[0]!.because[0]).toMatch(/sacks short/);
    expect(c.suppliers).toEqual(CONVERSION_SUPPLIERS);
    expect(c.suppliers).toEqual([
      "question 8's rescoring (step 6)",
      "question 7's checklist at the deadline (step 6)",
      "the won-rep half of the alarm (step 7)",
      "step 8b's situation term",
    ]);
    expect(classes({ ...s, sacksShort: false, shareShort: true })).toEqual(["CONVERSION"]);
    // Hit-or-sack outside its band is not conversion.
    expect(classes({ ...s, hitOrSackInBand: false })).toEqual(["UNCLASSED"]);
  });

  it("(iv) unclassed: a covered row misses with none of (i) to (iii) holding, e.g. time to throw", () => {
    const s: MissSplit = { ...quiet(), grid: "RAW", rows: [{ clause: "acc.timeToThrow", value: 3.2, passed: false }] };
    const c = classifyMiss(s);
    expect(c.classes.map((x) => x.class)).toEqual(["UNCLASSED"]);
    expect(c.classes[0]!.because[0]).toMatch(/acc\.timeToThrow missed/);
    expect(c.options).toEqual(["A", "B", "C"]);
    expect(c.suppliers).toEqual([]);
  });

  it("names both classes where two hold on different rows", () => {
    const s = miss(miss({ ...quiet(), unblockedPressuresPer100: 16, bin20NoFreeRunner: 31 }, "s3.unblockedPressures", 16), "s3.bin20.tick", 40);
    expect(classes(s)).toEqual(["SUPPLY", "TIMING"]);
  });

  it("brings the options and decides nothing", () => {
    const c = classifyMiss(miss({ ...quiet(), unblockedPressuresPer100: 15 }, "s3.unblockedPressures", 15));
    expect(c.options).toEqual(["A", "B", "C"]);
    expect(c.decidedBy).toBe("the owner");
  });

  it("refuses a row the miss rule does not cover", () => {
    expect(() => classifyMiss({ ...quiet(), rows: [{ clause: "s3.hitOrSack", value: 9, passed: false }] })).toThrow(/not a row the miss rule covers/);
  });
});

describe("the stop rule and the filed block", () => {
  it("allows one pass of the options per step: a second miss stops the step and goes back to the owner", () => {
    expect(afterChosenOption(false)).toBe("CONTINUE");
    expect(afterChosenOption(true)).toBe("STOP_AND_RETURN_TO_OWNER");
  });

  it("covers only filed clauses, and every one of them carries a band", () => {
    const byId = new Map(CLAUSES.map((c) => [c.id, c]));
    for (const id of MISS_RULE_COVERS) {
      const c = byId.get(id);
      expect(c, id).toBeDefined();
      expect(c!.lo !== undefined || c!.hi !== undefined, `${id} carries a band`).toBe(true);
    }
    expect(new Set(MISS_RULE_COVERS).size).toBe(MISS_RULE_COVERS.length);
  });

  it("files item 2's never-moves list, the four classes, the three options and the stop (ADR-089:1170-1185)", () => {
    expect(FILED_MISS_RULE.adrLine).toBe(1170);
    expect(FILED_MISS_RULE.neverMoves).toEqual(NEVER_MOVES);
    expect(NEVER_MOVES).toHaveLength(7);
    expect(NEVER_MOVES.join(" ")).toMatch(/throw bars/);
    expect(NEVER_MOVES.join(" ")).toMatch(/interception rules/);
    expect(NEVER_MOVES.join(" ")).toMatch(/no completely unblocked man is ever timed as a late block or by a uniform delay/);
    expect(FILED_MISS_RULE.classes).toHaveLength(4);
    expect(FILED_MISS_RULE.classes[0]).toMatch(/^\(i\) Supply/);
    expect(FILED_MISS_RULE.options.map((o) => o.slice(0, 2))).toEqual(["A.", "B.", "C."]);
    expect(FILED_MISS_RULE.params?.["classIFormula"]).toMatch(/\(L - n\) \/ \(100 - n\)/);
    expect(FILED_MISS_RULE.params?.["quickShareBand"]).toEqual([...QUICK_SHARE_BAND]);
    expect(FILED_MISS_RULE.params?.["covers"]).toEqual([...MISS_RULE_COVERS]);
  });

  it("files the unblocked bands: at most 14 per 100 dropbacks and 40 in 100 of hit-or-sack (ADR-089:279)", () => {
    expect(FILED_UNBLOCKED_BANDS.per100DropbacksMax).toBe(14);
    expect(FILED_UNBLOCKED_BANDS.shareOfHitOrSackMax).toBe(40);
    expect(FILED_UNBLOCKED_BANDS.adrLine).toBe(279);
  });
});
