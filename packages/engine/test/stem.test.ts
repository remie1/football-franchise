/**
 * THE STEM AT THE LINE: THE ARITHMETIC (ADR-091 §5, step S-a).
 *
 * Every number asserted here is one the ADR printed before anything was built: the D3 table cell
 * by cell, §9.2's shares of stem endings with every rating at 50, and §5.3's shift misses. The
 * shares are computed exactly, face by face of each d100, so they are the formulas' own numbers
 * rather than a sample of them.
 */
import { describe, expect, it } from "vitest";
import {
  STEM_DIALS,
  cadenceRow,
  caughtShifting,
  countReadModifier,
  stemTimingFor,
  timingTarget,
} from "../src/game/stem.js";
import type { Cadence } from "../src/game/stem.js";

const FACES = Array.from({ length: 100 }, (_, i) => i + 1);

/** The share of d100 faces whose margin (face + modifiers − target) passes `test`. */
const share = (modifiers: number, target: number, test: (margin: number) => boolean): number =>
  FACES.filter((face) => test(face + modifiers - target)).length / 100;

/** A rating of 50 is +10 on a roll (`rating ÷ 5`). */
const AVERAGE = 10;

/**
 * ADR-091 §9.2's six endings of a plain stem with every rating at 50 and the count read at 50,
 * for a cadence mix, in percent.
 */
type Endings = Record<"onTime" | "earlySnapped" | "earlyRecalled" | "earlyWorked" | "caught" | "calledOff", number>;

function endings(mix: Readonly<Record<Cadence, number>>): Endings {
  const out: Endings = { onTime: 0, earlySnapped: 0, earlyRecalled: 0, earlyWorked: 0, caught: 0, calledOff: 0 };
  const snapped = share(AVERAGE + AVERAGE, STEM_DIALS.snapOnMovement.target, (m) => m >= 0);
  const recalled = share(AVERAGE + AVERAGE, STEM_DIALS.recall.target + STEM_DIALS.recall.noise, (m) => m >= 0);
  for (const cadence of ["NORMAL", "QUICK", "HARD_COUNT"] as const) {
    const weight = mix[cadence];
    const mike = AVERAGE + AVERAGE + countReadModifier(50);
    for (const face of FACES) {
      const timing = stemTimingFor(face + mike - timingTarget(cadence), cadence);
      const w = weight / 100 / FACES.length;
      if (timing === "ON_TIME") out.onTime += w;
      else if (timing === "CAUGHT") out.caught += w;
      else if (timing === "CALLED_OFF") out.calledOff += w;
      else {
        out.earlySnapped += w * snapped;
        out.earlyRecalled += w * (1 - snapped) * recalled;
        out.earlyWorked += w * (1 - snapped) * (1 - recalled);
      }
    }
  }
  for (const key of Object.keys(out) as (keyof Endings)[]) out[key] *= 100;
  return out;
}

describe("the Mike's timing (ADR-091 §5.2, D2 and D3)", () => {
  it("reads the margin by the cadence's column, the D3 table cell by cell", () => {
    const cells: readonly (readonly [number, Cadence, string])[] = [
      [0, "NORMAL", "ON_TIME"],
      [-1, "NORMAL", "EARLY"],
      [-19, "NORMAL", "EARLY"],
      [-20, "NORMAL", "CAUGHT"],
      [0, "QUICK", "CALLED_OFF"],
      [-1, "QUICK", "CAUGHT"],
      [-20, "QUICK", "CAUGHT"],
      [0, "HARD_COUNT", "ON_TIME"],
      [-1, "HARD_COUNT", "CALLED_OFF"],
      [-19, "HARD_COUNT", "CALLED_OFF"],
      [-20, "HARD_COUNT", "EARLY"],
      [35, "HARD_COUNT", "ON_TIME"],
    ];
    for (const [margin, cadence, timing] of cells) expect(stemTimingFor(margin, cadence), `${cadence} at ${margin}`).toBe(timing);
  });

  it("puts the target at 50 plus the cadence's row, and a hard count seen coming adds nothing (ADR-092 §5.4)", () => {
    expect([timingTarget("NORMAL"), timingTarget("QUICK"), timingTarget("HARD_COUNT")]).toEqual([50, 65, 60]);
    expect(cadenceRow("HARD_COUNT", true)).toBe(0);
    expect(cadenceRow("QUICK", true)).toBe(15);
  });

  it("moves the roll 2 for every 5 points of count read (ADR-092 §6, D11), always a whole number", () => {
    expect([0, 45, 50, 55, 100].map(countReadModifier)).toEqual([-20, -2, 0, 2, 20]);
    for (let read = 0; read <= 100; read += 0.25) expect(Number.isInteger(countReadModifier(read))).toBe(true);
  });
});

describe("§9.2's shares with every rating at 50 and the count read at 50", () => {
  it("the offense at home (80 normal, 10 quick, 10 hard): on time 62.9, caught 7.1 + 12.4, wasted 7.7 + 7.5, works early 2.4", () => {
    const home = endings({ NORMAL: 80, QUICK: 10, HARD_COUNT: 10 });
    expect(home.onTime).toBeCloseTo(62.9, 1);
    expect(home.earlySnapped).toBeCloseTo(7.1, 1);
    expect(home.earlyRecalled).toBeCloseTo(7.7, 1);
    expect(home.earlyWorked).toBeCloseTo(2.4, 1);
    expect(home.caught).toBeCloseTo(12.4, 1);
    expect(home.calledOff).toBeCloseTo(7.5, 1);
    const total = Object.values(home).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 9);
  });

  it("on the road (90 normal, 10 quick, no hard count): on time 63.9 and caught 20.4", () => {
    const road = endings({ NORMAL: 90, QUICK: 10, HARD_COUNT: 0 });
    expect(road.onTime).toBeCloseTo(63.9, 1);
    expect(road.caught + road.earlySnapped).toBeCloseTo(20.4, 1);
  });

  it("an early stem 17.2 times in 100 at home, snapped on 41 in 100 of them (the offside line's factors)", () => {
    const home = endings({ NORMAL: 80, QUICK: 10, HARD_COUNT: 10 });
    expect(home.earlySnapped + home.earlyRecalled + home.earlyWorked).toBeCloseTo(17.2, 9);
    expect(share(AVERAGE + AVERAGE, STEM_DIALS.snapOnMovement.target, (m) => m >= 0)).toBe(0.41);
  });
});

describe("the line's shift (ADR-091 §5.3, D4)", () => {
  it("an average lineman never misses by 20; one at Reaction 30 and Agility 30 does 8 times in 100", () => {
    expect(share(AVERAGE + AVERAGE, STEM_DIALS.shift.target, caughtShifting)).toBe(0);
    expect(share(6 + 6, STEM_DIALS.shift.target, caughtShifting)).toBe(0.08);
  });

  it("a miss by 19 is set, by 20 still moving", () => {
    expect(caughtShifting(-19)).toBe(false);
    expect(caughtShifting(-20)).toBe(true);
  });
});
