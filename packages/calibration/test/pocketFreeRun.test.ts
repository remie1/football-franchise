/**
 * ADR-089 step 0 — THE FREE-RUN CLOCK (D18, D22) AND THE WAIT SNAP SPOT (plan §6.1; C1-S4).
 *
 * The inputs are the free-runner reader's (`rev/free-runner.md:297-301`, §3.3's table: each man at
 * his position's typical rating): NT 32/29, DT 38/36, DE 60/58, MLB 65/65, CB 80/78 (Speed /
 * Acceleration). Each row's snap spot and EDGE flag are §4.4.5's (ADR-089:600-611). The design's
 * table gives every time to 0.01 s, so the test asserts all nine rated rows to 0.01 s, the loop at
 * 1.87 / 2.10 (C 3.75 to A 0.75, +0.5 yd), the top speeds 9.17 / 10.05 / 10.80 and the 40s
 * 5.15 / 4.76 / 4.48. The creeper row is reported only: its rating is filed nowhere (1.54 / 1.74 at
 * 80/78, against the table's 1.55 / 1.75).
 */
import { ATTRIBUTE_REGISTRY_V1, setAttr, type PlayerState } from "@ff/contracts";
import { PASS_CONCEPTS } from "@ff/playbook";
import { describe, expect, it } from "vitest";
import {
  FREE_RUN_CONSTANTS,
  distanceAfter,
  dropOfCall,
  fortySeconds,
  freeRunTime,
  loopCrossYards,
  pathYards,
  ratingsOf,
  registryAttr,
  roundEta,
  secondsToCover,
  tauSeconds,
  topSpeed,
  type RunnerRatings,
} from "../src/pocket/freeRun.js";
import { GAP_WIDTH_YARDS, SNAP_ANSWER, isDownLineman, signedX, tableNowSnapSpot, waitSnapSpot } from "../src/pocket/snapSpot.js";

const NT: RunnerRatings = { speed: 32, acceleration: 29 };
const DT: RunnerRatings = { speed: 38, acceleration: 36 };
const DE: RunnerRatings = { speed: 60, acceleration: 58 };
const MLB: RunnerRatings = { speed: 65, acceleration: 65 };
const CB: RunnerRatings = { speed: 80, acceleration: 78 };

const near = (actual: number, expected: number, tol = 0.005): void => {
  expect(Math.abs(actual - expected), `${String(actual)} against ${String(expected)}`).toBeLessThanOrEqual(tol);
};

/** §4.4.5's rated rows: name, spot, EDGE, ratings, QB at 5 yd, at 7 yd. */
const ROWS = [
  ["free nose tackle, head up", { depth: 1.0, width: 0 }, false, NT, 1.5, 1.77],
  ["3-technique", { depth: 1.0, width: 1.9 }, false, DT, 1.53, 1.78],
  ["end in the C gap", { depth: 1.0, width: 4.5 }, true, DE, 1.71, 1.92],
  ["wide edge rusher", { depth: 1.5, width: 6.0 }, true, DE, 1.88, 2.08],
  ["A-gap linebacker at 1.5 (Mug arm)", { depth: 1.5, width: 0.75 }, false, MLB, 1.49, 1.73],
  ["walked-up B-gap linebacker", { depth: 2.5, width: 2.25 }, false, MLB, 1.65, 1.87],
  ["off linebacker at 5, B gap", { depth: 5.0, width: 2.25 }, false, MLB, 1.93, 2.15],
  ["slot corner blitz", { depth: 5.0, width: 7.0 }, true, CB, 2.2, 2.39],
] as const;

describe("D18: speed and acceleration", () => {
  it("gives the reader's 40s and top speeds", () => {
    near(fortySeconds(NT.speed), 5.15);
    near(fortySeconds(DE.speed), 4.76);
    near(fortySeconds(CB.speed), 4.48);
    near(topSpeed(NT), 9.17);
    near(topSpeed(DE), 10.05);
    near(topSpeed(CB), 10.8);
    expect(fortySeconds(99)).toBeCloseTo(4.22, 10);
    expect(fortySeconds(0)).toBe(5.6);
  });

  it("clamps the start to 0.63-0.91 s, relative to Speed", () => {
    expect(tauSeconds({ speed: 60, acceleration: 60 })).toBe(0.77);
    expect(tauSeconds({ speed: 20, acceleration: 99 })).toBe(0.63);
    expect(tauSeconds({ speed: 99, acceleration: 20 })).toBe(0.91);
    near(tauSeconds(NT), 0.791, 1e-12); // the reader's "0.79", unrounded
  });

  it("runs the 40 in the 40 time (x(F) = 40)", () => {
    for (const r of [NT, DT, DE, MLB, CB]) near(distanceAfter(fortySeconds(r.speed), r), 40, 1e-9);
    near(secondsToCover(40, DE), fortySeconds(DE.speed), 1e-9);
    expect(secondsToCover(0, DE)).toBe(0);
    expect(() => secondsToCover(-1, DE)).toThrow(RangeError);
  });

  it("reads Speed and Acceleration through the registry", () => {
    const attrs = ATTRIBUTE_REGISTRY_V1.attributes as Readonly<Record<string, unknown>>;
    expect("speed" in attrs && "acceleration" in attrs).toBe(true);
    expect(() => registryAttr("not-an-attribute")).toThrow(/not an attribute/);
    let values = setAttr({}, registryAttr("speed"), 60);
    values = setAttr(values, registryAttr("acceleration"), 58);
    const player = { attributes: { kind: "true", values, traits: new Set<string>() } } as unknown as PlayerState;
    expect(ratingsOf(player)).toEqual(DE);
  });
});

describe("D22 and §4.4.5: the path and the time", () => {
  it.each(ROWS)("%s: %s", (_name, spot, edge, ratings, at5, at7) => {
    near(freeRunTime({ spot, drop: 5, edge, ratings }).seconds, at5);
    near(freeRunTime({ spot, drop: 7, edge, ratings }).seconds, at7);
  });

  it("reproduces the ninth rated row, the loop from C to A (1.87 / 2.10)", () => {
    const cross = loopCrossYards(3.75, 0.75);
    expect(cross).toBe(3.5);
    near(freeRunTime({ spot: { depth: 1.0, width: 0.75 }, drop: 5, edge: false, ratings: DE, loopCrossYards: cross }).seconds, 1.87);
    near(freeRunTime({ spot: { depth: 1.0, width: 0.75 }, drop: 7, edge: false, ratings: DE, loopCrossYards: cross }).seconds, 2.1);
  });

  it("reports the creeper (inputs not filed): 80/78 moving at 3 yd/s gives 1.54 / 1.74 against the table's 1.55 / 1.75", () => {
    const at5 = freeRunTime({ spot: { depth: 7.0, width: 3.0 }, drop: 5, edge: false, ratings: CB, moving: true }).seconds;
    const at7 = freeRunTime({ spot: { depth: 7.0, width: 3.0 }, drop: 7, edge: false, ratings: CB, moving: true }).seconds;
    console.log(`##POCKET_CREEPER## reported, inputs not filed: ${at5.toFixed(3)} / ${at7.toFixed(3)} against the table's 1.55 / 1.75`);
    near(at5, 1.54);
    near(at7, 1.74);
  });

  it("adds 0.5 s for a DELAYED blitz and rounds the ETA to a tenth", () => {
    const base = freeRunTime({ spot: { depth: 4.5, width: 2.25 }, drop: 5, edge: false, ratings: MLB });
    const delayed = freeRunTime({ spot: { depth: 4.5, width: 2.25 }, drop: 5, edge: false, ratings: MLB, delayed: true });
    near(delayed.seconds - base.seconds, 0.5, 1e-12);
    expect(base.eta).toBe(roundEta(base.seconds));
    expect(roundEta(1.649)).toBe(1.6);
    expect(roundEta(1.65)).toBe(1.6); // toFixed's own rounding, as the engine rounds (`rushThreat.ts:524`)
    expect(roundEta(1.651)).toBe(1.7);
  });

  it("shortens by the 1-yard reach and bends 1.1 round the edge", () => {
    expect(pathYards({ spot: { depth: 1, width: 0 }, drop: 5, edge: false })).toBeCloseTo(5, 12);
    expect(pathYards({ spot: { depth: 1, width: 0 }, drop: 5, edge: true })).toBeCloseTo(5.5, 12);
    expect(FREE_RUN_CONSTANTS["freeRun.edgePathFactor"]).toBe(1.1);
  });

  it("is monotone: quicker is never later; faster and quicker together is never later; a deeper drop is never sooner", () => {
    const spot = { depth: 2.5, width: 2.25 };
    for (let s = 10; s <= 94; s += 7) {
      for (let a = 10; a <= 94; a += 7) {
        const t = freeRunTime({ spot, drop: 5, edge: false, ratings: { speed: s, acceleration: a } }).seconds;
        const both = freeRunTime({ spot, drop: 5, edge: false, ratings: { speed: s + 5, acceleration: a + 5 } }).seconds;
        const quicker = freeRunTime({ spot, drop: 5, edge: false, ratings: { speed: s, acceleration: a + 5 } }).seconds;
        const deeper = freeRunTime({ spot, drop: 7, edge: false, ratings: { speed: s, acceleration: a } }).seconds;
        expect(both).toBeLessThanOrEqual(t + 1e-12);
        expect(quicker).toBeLessThanOrEqual(t + 1e-12);
        expect(deeper).toBeGreaterThanOrEqual(t - 1e-12);
      }
    }
  });

  it("reports (finding for step 3's proof): Speed alone, Acceleration held, can be later by under 0.002 s", () => {
    // D18 makes tau relative to Speed (tau = 0.77 - 0.007 (A - S)): one more point of Speed with the
    // same Acceleration lengthens the start. Over a short path that can outweigh the shorter 40, so
    // the design's step-3 clause "a faster ... man is never later" (ADR-089:943) does not hold for
    // Speed alone under the filed D18. The constants are filed, never fitted (D18), so this is
    // reported, not changed. Asserted here: the effect is real and small.
    let pairs = 0;
    let later = 0;
    let laterEta = 0;
    let worst = 0;
    for (const yards of [3, 4, 5, 6, 7, 8, 9, 10, 12, 14]) {
      for (let s = 0; s < 99; s += 1) {
        for (let a = 0; a <= 99; a += 3) {
          const r = { speed: s, acceleration: a };
          const f = { speed: s + 1, acceleration: a };
          const t = secondsToCover(yards, r);
          const q = secondsToCover(yards, f);
          pairs += 1;
          if (q > t + 1e-12) {
            later += 1;
            worst = Math.max(worst, q - t);
          }
          if (roundEta(q + 0.35) > roundEta(t + 0.35)) laterEta += 1;
        }
      }
    }
    console.log(`##POCKET_SPEED_ALONE## ${JSON.stringify({ pairs, later, worstSeconds: Number(worst.toFixed(5)), laterAtTheTenth: laterEta })}`);
    expect(later).toBeGreaterThan(0);
    expect(worst).toBeLessThan(0.002);
  });

  it("looks the drop up by the call's name: 28 unique concepts, 5.0 or 7.0", () => {
    const names = new Set(PASS_CONCEPTS.map((c) => c.name));
    expect(names.size).toBe(28);
    for (const n of names) expect([5, 7]).toContain(dropOfCall(n));
    expect(() => dropOfCall("No Such Concept")).toThrow(/needs exactly one/);
  });
});

describe("the snap spot under Wait (question 19, ADR-089:5)", () => {
  it("is filed as Wait", () => {
    expect(SNAP_ANSWER).toBe("WAIT");
  });

  it("places a down lineman at 1.0 yard in his gap, +0.75 on the EDGE", () => {
    expect(isDownLineman("DT")).toBe(true);
    expect(isDownLineman("DE")).toBe(true);
    expect(isDownLineman("NT")).toBe(true);
    expect(isDownLineman("OLB")).toBe(false);
    expect(waitSnapSpot({ position: "DT", alignment: "INTERIOR", gap: "B" })).toEqual({ row: "DOWN_LINEMAN", spot: { depth: 1, width: 2.25 }, delayed: false, moving: false });
    expect(waitSnapSpot({ position: "DE", alignment: "EDGE", gap: "C" })).toEqual({ row: "DOWN_LINEMAN", spot: { depth: 1, width: 4.5 }, delayed: false, moving: false });
    expect(GAP_WIDTH_YARDS).toEqual({ A: 0.75, B: 2.25, C: 3.75, D: 5.25 });
  });

  it("keeps everyone else on today's time, and places no lineman without a gap", () => {
    expect(waitSnapSpot({ position: "MLB", alignment: "INTERIOR", gap: "A" })).toEqual({ row: "TODAY" });
    expect(waitSnapSpot({ position: "CB", alignment: "EDGE", gap: "D", disguise: "DELAYED" })).toEqual({ row: "TODAY" });
    expect(waitSnapSpot({ position: "DT", alignment: "INTERIOR" })).toBeUndefined();
  });

  it("gives the end in the C gap the §4.4.5 row exactly (1.71 / 1.92 at 60/58)", () => {
    const placed = waitSnapSpot({ position: "DE", alignment: "EDGE", gap: "C" });
    if (placed === undefined || placed.row === "TODAY") throw new Error("expected a spot");
    near(freeRunTime({ spot: placed.spot, drop: 5, edge: true, ratings: DE }).seconds, 1.71);
  });
});

describe("Table now (information only)", () => {
  it("places each row of the placeholder table", () => {
    expect(tableNowSnapSpot({ position: "MLB", alignment: "INTERIOR", gap: "B" }, false)?.row).toBe("LB_WALKED_UP");
    expect(tableNowSnapSpot({ position: "MLB", alignment: "INTERIOR", gap: "B", disguise: "ZERO" }, false)?.spot).toEqual({ depth: 2.5, width: 2.25 });
    const disguised = tableNowSnapSpot({ position: "ILB", alignment: "INTERIOR", gap: "A", disguise: "DELAYED" }, false);
    expect(disguised).toEqual({ row: "LB_DISGUISED", spot: { depth: 4.5, width: 0.75 }, delayed: true, moving: false });
    expect(tableNowSnapSpot({ position: "MLB", alignment: "INTERIOR", gap: "A", disguise: "ZONE_BLITZ" }, false)?.delayed).toBe(false);
    expect(tableNowSnapSpot({ position: "OLB", alignment: "EDGE", gap: "D" }, false)).toEqual({ row: "LB_ON_THE_EDGE", spot: { depth: 1.5, width: 6.0 }, delayed: false, moving: false });
    expect(tableNowSnapSpot({ position: "CB", alignment: "EDGE", gap: "D", disguise: "DELAYED" }, false)).toEqual({ row: "SLOT_CORNER", spot: { depth: 5, width: 7 }, delayed: true, moving: false });
    expect(tableNowSnapSpot({ position: "SS", alignment: "INTERIOR", gap: "B" }, false)?.moving).toBe(true);
  });

  it("moves only a mugged backer under the Mug arm", () => {
    const facts = { position: "MLB", alignment: "INTERIOR", gap: "B", mugShownGap: "A" } as const;
    expect(tableNowSnapSpot(facts, false)?.row).toBe("LB_WALKED_UP");
    expect(tableNowSnapSpot(facts, true)).toEqual({ row: "LB_MUG", spot: { depth: 1.5, width: 0.75 }, delayed: false, moving: false });
    expect(tableNowSnapSpot({ position: "DT", alignment: "INTERIOR", gap: "A", mugShownGap: "A" }, true)?.row).toBe("DOWN_LINEMAN");
  });

  it("signs x by side for the loop", () => {
    expect(signedX({ depth: 1, width: 3.75 }, "LEFT")).toBe(-3.75);
    expect(signedX({ depth: 1, width: 0.75 }, "RIGHT")).toBe(0.75);
    expect(loopCrossYards(-3.75, 0.75)).toBe(5);
  });
});
