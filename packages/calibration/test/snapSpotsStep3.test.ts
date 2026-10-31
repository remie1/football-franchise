/**
 * ADR-090 step 3's report (ADR-091 §17, step S-a): the odds it sets the stems against are ADR-091's
 * own (§9.2 at 50 reproduced from D1, D2, D3, D5 and §5.5), and on a few real games every rule it
 * reads back holds and every tally adds up.
 */
import { describe, expect, it } from "vitest";
import type { Cadence, StemTiming } from "@ff/contracts";
import { renderStep3 } from "../src/snapSpots/renderStep3.js";
import {
  CADENCE_ROWS,
  CADENCES,
  caughtShiftingChance,
  LINE_ROLLS,
  madeChance,
  measureStep3,
  PROBLEM_KINDS,
  QUARTERS,
  STEM_OUTCOMES,
  timingChances,
  timingFor,
  TIMINGS,
} from "../src/snapSpots/step3.js";

describe("the odds the report weighs the stems against", () => {
  it("D3 as the ADR files it: by the margin's band and the count", () => {
    const row = (margin: number): StemTiming[] => (["NORMAL", "QUICK", "HARD_COUNT"] as const).map((c) => timingFor(margin, c));
    expect(row(0)).toEqual(["ON_TIME", "CALLED_OFF", "ON_TIME"]);
    expect(row(-1)).toEqual(["EARLY", "CAUGHT", "CALLED_OFF"]);
    expect(row(-19)).toEqual(["EARLY", "CAUGHT", "CALLED_OFF"]);
    expect(row(-20)).toEqual(["CAUGHT", "CAUGHT", "EARLY"]);
  });

  it("reproduces ADR-091 §9.2 with every man at 50, the count read at 50 and D1's home mix", () => {
    // The Mike at 50: Awareness ÷ 5 + Play Recognition ÷ 5 = +20, the count read's term 0; D2's target
    // is 50 plus the count's row (0, 15, 10).
    const mix: Readonly<Record<Cadence, number>> = { NORMAL: 0.8, QUICK: 0.1, HARD_COUNT: 0.1 };
    const row: Readonly<Record<Cadence, number>> = { NORMAL: 0, QUICK: 15, HARD_COUNT: 10 };
    const timing: Record<StemTiming, number> = { ON_TIME: 0, EARLY: 0, CAUGHT: 0, CALLED_OFF: 0 };
    for (const c of CADENCES) {
      const chances = timingChances(20, 50 + row[c], c);
      expect(TIMINGS.reduce((a, t) => a + chances[t], 0)).toBeCloseTo(1, 12);
      for (const t of TIMINGS) timing[t] += mix[c] * chances[t];
    }
    // The quarterback at 50 against 80 (D5); the center and the line at 50 against 45 (§5.5).
    const snapped = madeChance(20, 80);
    const recalled = madeChance(20, 45);
    expect(snapped).toBe(0.41);
    expect(recalled).toBe(0.76);
    const shares = {
      onTime: timing.ON_TIME,
      earlySnapped: timing.EARLY * snapped,
      earlyRecalled: timing.EARLY * (1 - snapped) * recalled,
      earlyWorks: timing.EARLY * (1 - snapped) * (1 - recalled),
      caught: timing.CAUGHT,
      calledOff: timing.CALLED_OFF,
    };
    const tenth = (x: number): number => Math.round(1000 * x) / 10;
    expect(Object.values(shares).map(tenth)).toEqual([62.9, 7.1, 7.7, 2.4, 12.4, 7.5]);
  });

  it("an average lineman is never caught shifting, one at Reaction 30 and Agility 30 is 8 times in 100 (§5.3)", () => {
    expect(caughtShiftingChance(20, 40)).toBe(0);
    expect(caughtShiftingChance(12, 40)).toBe(0.08);
  });
});

describe("ADR-090 step 3 on a few games", () => {
  const measure = measureStep3({ goldenFirst: 2, flatFirst: 8, genThroughWeek: 0 });
  const flat = measure.stems[0]!;

  it("plays the golden games and the flat league's first games, under the default caller", () => {
    expect(measure.golden.map((g) => [g.league, g.games, g.pinned])).toEqual([
      ["flat", 2, undefined],
      ["gen", 2, undefined],
    ]);
    expect(measure.golden.every((g) => g.stripped > 0 && g.events > 0)).toBe(true);
    expect(measure.stems.map((s) => [s.league, s.games])).toEqual([["flat", 8]]);
    expect(flat.all.stems).toBeGreaterThan(0);
  });

  it("finds every rule kept", () => {
    for (const k of PROBLEM_KINDS) expect(flat.problems[k], k).toEqual([]);
  });

  it("adds up: endings, counts, quarters, sides and odds", () => {
    const total = (o: Readonly<Record<string, number>>): number => Object.values(o).reduce((a, x) => a + x, 0);
    expect(total(flat.all.outcomes)).toBe(flat.all.stems);
    expect(total(flat.all.cadences)).toBe(flat.all.stems);
    expect(flat.pass.stems + flat.run.stems).toBe(flat.all.stems);
    expect(flat.home.stems + flat.road.stems).toBe(flat.all.stems);
    expect(QUARTERS.reduce((a, q) => a + flat.byQuarter[q].stems, 0)).toBe(flat.all.stems);
    expect(CADENCE_ROWS.reduce((a, r) => a + total(flat.cadenceRows[r]), 0)).toBe(flat.all.stems);
    for (const t of TIMINGS) expect(flat.timingOdds[t].thrown).toBe(flat.all.stems);
    expect(TIMINGS.reduce((a, t) => a + flat.timingOdds[t].expected, 0)).toBeCloseTo(flat.all.stems, 9);
    expect(flat.rollOdds.stem_timing.thrown).toBe(flat.all.stems);
    const early = flat.all.outcomes.EARLY_SNAPPED + flat.all.outcomes.EARLY_RECALLED + flat.all.outcomes.EARLY_WORKED + flat.all.outcomes.EARLY_RUN;
    expect(flat.rollOdds.snap_on_movement.thrown).toBe(early);
    expect(flat.rollOdds.snap_on_movement.observed).toBe(flat.all.outcomes.EARLY_SNAPPED);
    expect(flat.rollOdds.communication.thrown).toBe(flat.all.outcomes.EARLY_RECALLED + flat.all.outcomes.EARLY_WORKED);
    expect(flat.rollOdds.stem_shift.thrown).toBe(flat.shiftCaughtOdds.thrown);
    expect(flat.rollOdds.adjustment_notice.thrown).toBe(flat.sideline.notices);
    expect(flat.rollOdds.adjustment_read.thrown).toBe(flat.sideline.changes);
    expect(flat.rollOdds.habit_drop.thrown).toBe(flat.sideline.habitsRolled);
    expect(flat.sideline.film.count).toBe(2 * flat.games);
    expect(flat.sideline.halftime.count).toBeLessThanOrEqual(2 * flat.games);
    for (const k of LINE_ROLLS) expect(flat.rollOdds[k].observed).toBeLessThanOrEqual(flat.rollOdds[k].thrown);
    expect(STEM_OUTCOMES).toHaveLength(7);
  });

  it("renders every section, and the same measure the same report", () => {
    const report = renderStep3(measure);
    for (const heading of [
      "## 1. Nothing moved",
      "## 2. The engine kept every rule",
      "## 3. How often the Mike stems",
      "## 4. How the stems ended",
      "## 5. The dice against their own odds",
      "## 6. The quarterback's count",
      "## 7. The count read through a game",
      "## 8. The sideline",
    ]) {
      expect(report).toContain(heading);
    }
    expect(report).not.toContain("❌");
    expect(renderStep3(measure)).toBe(report);
  });
});
