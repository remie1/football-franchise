/**
 * ADR-089 step 0 — THE BLOCK CLOCK'S SELECTION RULE (§4.1, ADR-089:422-427; plan §7.2 `selectionRule`).
 *
 * On constructed curves (no engine): the loss's reading reproduces the design's one stated shape
 * distance (K1's 0.0035, ADR-089:173); a synthetic grid with a known minimum picks it; flat losses
 * fire "no separation" and fallback D1, which then picks the pressured curve's minimum and says so;
 * the rule refuses any grid but the filed one; and the curve helpers (rates, RMS, twice-FTN, the
 * "rises from 2.0 s" slope) on hand-checkable inputs.
 */
import { describe, expect, it } from "vitest";
import {
  BIN_COUNT,
  FILED_FITTING_ORDER,
  FILED_SELECTION_RULE,
  GRID_POINTS,
  L_GRID,
  REAL,
  RELEASE_BINS,
  S_GRID,
  attemptWeightedSlope,
  binRates,
  binsAboveTwiceFtn,
  curveRms,
  gridPointId,
  risesFrom2s,
  selectBlockClock,
  shapeLoss,
  type BinCount,
  type GridArm,
  type GridPoint,
} from "../src/pocket/selection.js";

/** A curve of percent rates as bin counts, exact to 0.001 points. */
const counts = (rates: readonly number[]): readonly BinCount[] => rates.map((r) => ({ events: Math.round(r * 1000), attempts: 100_000 }));

/** A shape distortion that grows with |d|, keeps every rate positive, and leaves the curve unchanged at d = 0. */
const tilt = (real: readonly number[], d: number): readonly number[] => real.map((r, i) => r * Math.exp(0.03 * d * (i - 3)));

function arm(point: GridPoint, hit1: readonly number[], hit2: readonly number[], pr1: readonly number[], pr2: readonly number[]): GridArm {
  return { point, hit: { 1: counts(hit1), 2: counts(hit2) }, pressured: { 1: counts(pr1), 2: counts(pr2) } };
}

describe("the grids and the filed blocks", () => {
  it("files the O5 grids: theta 7..15 at k 2, beta 0.5 with the push window, and R 4..8; 14 points in the tie order", () => {
    expect(S_GRID.theta).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect([S_GRID.k, S_GRID.beta, S_GRID.pushWindow]).toEqual([2, 0.5, true]);
    expect(L_GRID.R).toEqual([4, 5, 6, 7, 8]);
    expect(GRID_POINTS.map(gridPointId)).toEqual([
      ...[7, 8, 9, 10, 11, 12, 13, 14, 15].map((t) => `S:theta=${String(t)}`),
      ...[4, 5, 6, 7, 8].map((r) => `L:R=${String(r)}`),
    ]);
    expect(FILED_SELECTION_RULE.grids).toEqual({ S: { theta: [...S_GRID.theta], k: 2, beta: 0.5, pushWindow: true }, L: { R: [...L_GRID.R] } });
  });

  it("runs every arm on question 19's answer, Wait", () => {
    expect(FILED_SELECTION_RULE.freeRunClock.startsWith("WAIT:")).toBe(true);
  });

  it("files the curves it reads as the design prints them (ADR-089:169, :179, :181)", () => {
    expect(RELEASE_BINS).toHaveLength(BIN_COUNT);
    expect(FILED_SELECTION_RULE.loss["real"]).toEqual([2.7, 7.1, 10.6, 11.0, 13.8, 16.1, 18.0]);
    expect(FILED_SELECTION_RULE.fallback["real"]).toEqual([9.0, 18.1, 24.6, 27.9, 36.9, 56.0, 72.6]);
    expect(FILED_SELECTION_RULE.loss["weights"]).toEqual([26.1, 24.3, 20.6, 12.9, 6.7, 5.2, 4.2]);
    expect(FILED_SELECTION_RULE.fallback["id"]).toBe("D1");
  });

  it("files the fitting order with two passes at most and the owner return (ADR-089:1128)", () => {
    expect(FILED_FITTING_ORDER.adrLine).toBe(1128);
    expect(FILED_FITTING_ORDER.maxPasses).toBe(2);
    expect(FILED_FITTING_ORDER.steps).toHaveLength(7);
    expect(FILED_FITTING_ORDER.steps[0]).toMatch(/5a/);
    expect(FILED_FITTING_ORDER.steps[1]).toMatch(/5b.*b at its provisional 5/);
    expect(FILED_FITTING_ORDER.ownerReturn).toMatch(/second pass would change the selection again/);
  });
});

describe("the loss", () => {
  it("reproduces K1's shape distance between the two real hit curves: 0.0034 against a REPORTED 0.0035 (ADR-089:173)", () => {
    const loss = shapeLoss(REAL.hitRaw, REAL.hitRawWithThrowaways);
    expect(loss).toBeGreaterThan(0.00335);
    expect(loss).toBeLessThan(0.00345);
  });

  it("is why the unweighted all-bin mean is the filed reading: the attempt-weighted mean gives 0.0053 or more", () => {
    const w = REAL.attemptSharesRaw;
    const W = w.reduce((a, b) => a + b, 0);
    const wmean = (xs: readonly number[]): number => xs.reduce((s, x, i) => s + w[i]! * x, 0) / W;
    const ms = wmean(REAL.hitRaw);
    const mr = wmean(REAL.hitRawWithThrowaways);
    const alt = REAL.hitRaw.reduce((s, x, i) => s + w[i]! * (x / ms - REAL.hitRawWithThrowaways[i]! / mr) ** 2, 0) / W;
    expect(alt).toBeGreaterThan(0.0053);
  });

  it("is shape only: zero for the real curve and for any multiple of it", () => {
    expect(shapeLoss(REAL.hitRaw, REAL.hitRaw)).toBe(0);
    expect(shapeLoss(REAL.hitRaw.map((r) => r * 0.37), REAL.hitRaw)).toBeCloseTo(0, 12);
    expect(shapeLoss(tilt(REAL.hitRaw, 2), REAL.hitRaw)).toBeGreaterThan(shapeLoss(tilt(REAL.hitRaw, 1), REAL.hitRaw));
  });

  it("refuses a curve of the wrong length, a zero mean and negative weights", () => {
    expect(() => shapeLoss([1, 2, 3], REAL.hitRaw)).toThrow(/7 bins/);
    expect(() => shapeLoss([0, 0, 0, 0, 0, 0, 0], REAL.hitRaw)).toThrow(/mean of 0/);
    expect(() => shapeLoss(REAL.hitRaw, REAL.hitRaw, [1, 1, 1, 1, 1, 1, -1])).toThrow(/non-negative/);
  });
});

describe("the rule", () => {
  it("picks a synthetic grid's known minimum (S at theta 11) when the losses separate", () => {
    const arms = GRID_POINTS.map((p) => {
      const d = p.shape === "S" ? p.value - 11 : p.value + 3;
      const c = tilt(REAL.hitRaw, d);
      const c2 = c.map((x, i) => x + (i === 0 ? 0.002 : 0));
      return arm(p, c, c2, REAL.pressuredRaw, REAL.pressuredRaw);
    });
    const v = selectBlockClock(arms);
    expect(v.winner).toBe("S:theta=11");
    expect(v.curve).toBe("hit_rate_by_release_bin");
    expect(v.fallbackUsed).toBe(false);
    expect(v.primary.separated).toBe(true);
    expect(v.fallback).toBeUndefined();
    expect(v.primary.best).toBeCloseTo(0, 6);
    expect(v.says.join(" ")).toMatch(/separates/);
  });

  it("takes the arms in any order and scores them in the filed order", () => {
    const arms = GRID_POINTS.map((p) => {
      const c = tilt(REAL.hitRaw, p.shape === "S" ? Math.abs(p.value - 9) : 9);
      return arm(p, c, c, REAL.pressuredRaw, REAL.pressuredRaw);
    });
    expect(selectBlockClock([...arms].reverse()).winner).toBe("S:theta=9");
  });

  it("breaks a tie to the earlier filed point", () => {
    // Every point carries the real curve's shape, so every loss is 0 on set 1; set 2 differs on S:theta=7 only, so the spread
    // is positive and the grid does not separate; the pressured curve then ties everywhere too.
    const arms = GRID_POINTS.map((p) => {
      const c2 = p.shape === "S" && p.value === 7 ? tilt(REAL.hitRaw, 1) : REAL.hitRaw;
      return arm(p, REAL.hitRaw, c2, REAL.pressuredRaw, REAL.pressuredRaw);
    });
    const v = selectBlockClock(arms);
    expect(v.primary.winner).toBe("S:theta=7");
    expect(v.winner).toBe("S:theta=7");
  });

  it("fires 'no separation' on flat losses and falls back to the pressured curve (D1), which picks its own minimum and says so", () => {
    const arms = GRID_POINTS.map((p, i) => {
      // Hit curves: nearly flat losses on set 1 and a set-2 spread larger than the whole range.
      const h1 = tilt(REAL.hitRaw, 1 + 0.01 * (i % 3));
      const h2 = tilt(REAL.hitRaw, 3);
      // Pressured curves: a known minimum at L:R=6, well separated.
      const d = p.shape === "L" ? p.value - 6 : -(4 + 0.1 * (p.value - 7));
      const pr = tilt(REAL.pressuredRaw, d);
      return arm(p, h1, h2, pr, pr);
    });
    const v = selectBlockClock(arms);
    expect(v.primary.separated).toBe(false);
    expect(v.primary.worst - v.primary.best).toBeLessThanOrEqual(2 * v.primary.maxSpread);
    expect(v.fallbackUsed).toBe(true);
    expect(v.curve).toBe("pressured_share_by_release_bin");
    expect(v.fallback?.separated).toBe(true);
    expect(v.winner).toBe("L:R=6");
    expect(v.says.join(" ")).toMatch(/fallback D1 applies/);
    expect(v.says.join(" ")).toMatch(/moves out of the falsifiers and into the fitted ledger/);
  });

  it("reports a fallback that does not separate either, and keeps its minimum", () => {
    const arms = GRID_POINTS.map((p, i) => {
      const h1 = tilt(REAL.hitRaw, 1);
      const h2 = tilt(REAL.hitRaw, 3);
      const p1 = tilt(REAL.pressuredRaw, i === 4 ? 0.5 : 1);
      const p2 = tilt(REAL.pressuredRaw, 3);
      return arm(p, h1, h2, p1, p2);
    });
    const v = selectBlockClock(arms);
    expect(v.fallbackUsed).toBe(true);
    expect(v.fallback?.separated).toBe(false);
    expect(v.winner).toBe(gridPointId(GRID_POINTS[4]!));
    expect(v.says.join(" ")).toMatch(/does not separate the grid either/);
  });

  it("refuses any grid but the filed one: a missing point, a point given twice, a point not filed", () => {
    const arms = GRID_POINTS.map((p) => arm(p, REAL.hitRaw, REAL.hitRaw, REAL.pressuredRaw, REAL.pressuredRaw));
    expect(() => selectBlockClock(arms.slice(1))).toThrow(/missing S:theta=7/);
    expect(() => selectBlockClock([...arms, arms[0]!])).toThrow(/given twice/);
    const extra = arm({ shape: "S", value: 16 }, REAL.hitRaw, REAL.hitRaw, REAL.pressuredRaw, REAL.pressuredRaw);
    expect(() => selectBlockClock([...arms.slice(1), extra])).toThrow(/not filed S:theta=16/);
  });
});

describe("the curve helpers", () => {
  it("reads bin rates in percent and refuses an empty bin or impossible counts", () => {
    expect(binRates(counts(REAL.hitRaw))).toEqual(REAL.hitRaw.map((r) => (100 * Math.round(r * 1000)) / 100_000));
    const empty = [...counts(REAL.hitRaw)];
    empty[3] = { events: 0, attempts: 0 };
    expect(() => binRates(empty)).toThrow(/3.0-3.5 has no attempts/);
    const bad = [...counts(REAL.hitRaw)];
    bad[0] = { events: 5, attempts: 4 };
    expect(() => binRates(bad)).toThrow(/5 events in 4 attempts/);
  });

  it("measures the attempt-weighted RMS distance over the first five bins (ADR-089:1142)", () => {
    expect(curveRms(REAL.pressuredRaw, REAL.pressuredRaw, REAL.attemptSharesRaw)).toBe(0);
    expect(curveRms(REAL.pressuredRaw.map((r) => r + 3), REAL.pressuredRaw, REAL.attemptSharesRaw)).toBeCloseTo(3, 12);
    // A miss in the sixth bin alone is outside the five bins read.
    const sixth = REAL.pressuredRaw.map((r, i) => (i === 5 ? r + 40 : r));
    expect(curveRms(sixth, REAL.pressuredRaw, REAL.attemptSharesRaw)).toBe(0);
    expect(curveRms(sixth, REAL.pressuredRaw, REAL.attemptSharesRaw, 7)).toBeGreaterThan(0);
  });

  it("names the bins from 2.0 s on above twice FTN's, never the first", () => {
    const sim = REAL.hitRaw.map((r, i) => (i === 0 || i === 3 ? r * 2.5 : r));
    expect(binsAboveTwiceFtn(sim, REAL.hitRaw)).toEqual(["3.0-3.5"]);
    expect(binsAboveTwiceFtn(REAL.hitRaw.map((r) => r * 2), REAL.hitRaw)).toEqual([]);
  });

  it("reads 'rises from 2.0 s on' as a positive attempt-weighted slope (ADR-089:1040)", () => {
    const attempts = REAL.attemptSharesRaw;
    expect(risesFrom2s(REAL.hitRaw, attempts)).toBe(true);
    expect(attemptWeightedSlope([5, 5, 5, 5, 5, 5, 5], attempts)).toBeCloseTo(0, 12);
    expect(risesFrom2s([5, 5, 5, 5, 5, 5, 5], attempts)).toBe(false);
    // The first bin is not read: a high first bin and a flat rest is no rise.
    expect(risesFrom2s([40, 5, 5, 5, 5, 5, 5], attempts)).toBe(false);
    expect(risesFrom2s([1, 9, 8, 7, 6, 5, 4], attempts)).toBe(false);
    // An exact line through the midpoints from 2.0 s has that line's slope.
    const line = [99, 2.25, 2.75, 3.25, 3.75, 4.5, 5.5].map((x) => 2 * x + 1);
    expect(attemptWeightedSlope(line, attempts)).toBeCloseTo(2, 12);
    expect(() => attemptWeightedSlope(REAL.hitRaw, [1, 0, 0, 0, 0, 0, 0])).toThrow(/no attempts/);
    expect(() => attemptWeightedSlope(REAL.hitRaw, [0, 1, 0, 0, 0, 0, 0])).toThrow(/one midpoint/);
  });
});
