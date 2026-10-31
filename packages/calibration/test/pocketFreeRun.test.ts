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
 *
 * ADR-089 step 3 (plan §2.2, R-6; §2.8):
 *  - **R-6's shared literal table, calibration's side.** The engine's `test/freeRun.test.ts` pins
 *    32 cases in the engine's terms, whose seconds, yards and ETA this package's `freeRunTime`
 *    produced once at 93c2762. The same literals are pasted here, the block checked to be the
 *    engine's text character for character, and each case is asserted with `Object.is` against
 *    `freeRunTime` on part 1's conversion of a published spot (`part1.ts`'s `freeRunInputOf`):
 *    the two functions are bit-identical on it, from both sides.
 *  - **AM-2's monotone reading on the unit grid**, this side (paths 3 to 14 yards by halves, set,
 *    DELAYED and moving starts, ratings 0 to 99): Acceleration +1, and Speed and Acceleration +1
 *    together, are never later at the published tenth; the deeper drop is never sooner. Speed alone
 *    is reported by count and size.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ATTRIBUTE_REGISTRY_V1, setAttr, type PlayerState } from "@ff/contracts";
import { PASS_CONCEPTS } from "@ff/playbook";
import { beforeAll, describe, expect, it } from "vitest";
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
import { CREEPER_MOVING, freeRunInputOf } from "../src/pocket/part1.js";

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

// --- ADR-089 step 3: R-6's shared literal table, calibration's side -------------------------------

/** The creeper's moving entry, as the engine's table states it (AM-2's filed creeper). */
const CREEP = Object.freeze({ dx: 0, dy: -1, yardsPerSecond: 3 });

/** One case in the engine's terms (its `FreeRunInput`), with this package's figures pasted. */
interface SharedRow {
  readonly name: string;
  readonly spot: { readonly x: number; readonly y: number; readonly moving?: typeof CREEP };
  readonly ballX: number;
  readonly dropYards: number;
  readonly edge: boolean;
  readonly loop?: { readonly partnerSpot: { readonly x: number; readonly y: number } };
  readonly ratings: RunnerRatings;
  readonly delayed: boolean;
  readonly seconds: number;
  readonly yards: number;
  readonly eta: number;
}

// R-6: the engine's literal block, pasted unchanged; the test below checks it is the engine's text.
const SHARED: readonly SharedRow[] = [
  { name: "down lineman, A gap, ratings 0", spot: { x: 1, y: 1 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 0, acceleration: 0 }, delayed: false, seconds: 1.5774246924774413, yards: 5.082762530298219, eta: 1.6 },
  { name: "down lineman, A gap, ratings 50", spot: { x: 1, y: 1 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 50, acceleration: 50 }, delayed: false, seconds: 1.4641853271976357, yards: 5.082762530298219, eta: 1.5 },
  { name: "down lineman, A gap, ratings 99", spot: { x: 1, y: 1 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 99, acceleration: 99 }, delayed: false, seconds: 1.3481752750928635, yards: 5.082762530298219, eta: 1.3 },
  { name: "down lineman, B gap left, drop 7", spot: { x: -2.5, y: 1 }, ballX: 0, dropYards: 7, edge: false, ratings: { speed: 50, acceleration: 50 }, delayed: false, seconds: 1.7594898559454113, yards: 7.3815273071201055, eta: 1.8 },
  { name: "down lineman, C gap EDGE, 60/58", spot: { x: 4.5, y: 1 }, ballX: 0, dropYards: 5, edge: true, ratings: { speed: 60, acceleration: 58 }, delayed: false, seconds: 1.7067708586105916, yards: 7.15, eta: 1.7 },
  { name: "down lineman, D gap EDGE left, drop 7, ratings 99", spot: { x: -6, y: 1 }, ballX: 0, dropYards: 7, edge: true, ratings: { speed: 99, acceleration: 99 }, delayed: false, seconds: 1.867350133991446, yards: 9.9, eta: 1.9 },
  { name: "tau at its floor (Speed 20, Acceleration 99)", spot: { x: 2.5, y: 1 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 20, acceleration: 99 }, delayed: false, seconds: 1.5279372729267044, yards: 5.5, eta: 1.5 },
  { name: "tau at its ceiling (Speed 99, Acceleration 20), EDGE, drop 7", spot: { x: -6, y: 1 }, ballX: 0, dropYards: 7, edge: true, ratings: { speed: 99, acceleration: 20 }, delayed: false, seconds: 1.9191639744991265, yards: 9.9, eta: 1.9 },
  { name: "tau at the floor's edge (Acceleration - Speed 20)", spot: { x: 1, y: 1 }, ballX: 0, dropYards: 7, edge: false, ratings: { speed: 30, acceleration: 50 }, delayed: false, seconds: 1.7110574851346092, yards: 7.062257748298549, eta: 1.7 },
  { name: "tau at the ceiling's edge (Acceleration - Speed -20)", spot: { x: -1, y: 1 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 70, acceleration: 50 }, delayed: false, seconds: 1.4656190545221297, yards: 5.082762530298219, eta: 1.5 },
  { name: "Mug backer, 1.5 deep in the A gap", spot: { x: 1, y: 1.5 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 65, acceleration: 65 }, delayed: false, seconds: 1.4927110387301479, yards: 5.576473218982953, eta: 1.5 },
  { name: "walked-up backer, B gap left", spot: { x: -2.5, y: 2.5 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 65, acceleration: 65 }, delayed: false, seconds: 1.6566392252170923, yards: 6.905694150420948, eta: 1.7 },
  { name: "walked-up backer, D gap EDGE, drop 7", spot: { x: 6, y: 2.5 }, ballX: 0, dropYards: 7, edge: true, ratings: { speed: 70, acceleration: 68 }, delayed: false, seconds: 2.135175279490969, yards: 11.259712779834327, eta: 2.1 },
  { name: "disguised backer (ZONE_BLITZ), ratings 0", spot: { x: 2.5, y: 4.5 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 0, acceleration: 0 }, delayed: false, seconds: 2.1069250307498115, yards: 8.82344135219425, eta: 2.1 },
  { name: "DELAYED backer, A gap left", spot: { x: -1, y: 4.5 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 50, acceleration: 50 }, delayed: true, seconds: 2.4012823188905434, yards: 8.5524865872714, eta: 2.4 },
  { name: "DELAYED backer, C gap EDGE, drop 7, ratings 99", spot: { x: 4.5, y: 4.5 }, ballX: 0, dropYards: 7, edge: true, ratings: { speed: 99, acceleration: 99 }, delayed: true, seconds: 2.6204964510830315, yards: 12.483997938751315, eta: 2.6 },
  { name: "slot blitz, 5 deep at 7 across, 80/78", spot: { x: 7, y: 5 }, ballX: 0, dropYards: 5, edge: true, ratings: { speed: 80, acceleration: 78 }, delayed: false, seconds: 2.201405036028617, yards: 12.327211177307074, eta: 2.2 },
  { name: "DELAYED slot blitz left, drop 7, ratings 0", spot: { x: -7, y: 5 }, ballX: 0, dropYards: 7, edge: true, ratings: { speed: 0, acceleration: 0 }, delayed: true, seconds: 3.300694417073833, yards: 14.181688388394786, eta: 3.3 },
  { name: "corner rushing from outside his receiver, ratings 99", spot: { x: -13, y: 5 }, ballX: 0, dropYards: 5, edge: true, ratings: { speed: 99, acceleration: 99 }, delayed: false, seconds: 2.537609185570536, yards: 16.9413414135424, eta: 2.5 },
  { name: "safety rolled down over the B gap, drop 7", spot: { x: 2.5, y: 5 }, ballX: 0, dropYards: 7, edge: false, ratings: { speed: 50, acceleration: 50 }, delayed: false, seconds: 2.2152740208097326, yards: 11.257650672131263, eta: 2.2 },
  { name: "creeper moving at 3 yd/s, ratings 50", spot: { x: -2.5, y: 4.5, moving: CREEP }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 50, acceleration: 50 }, delayed: false, seconds: 1.3513681826906554, yards: 8.82344135219425, eta: 1.4 },
  { name: "creeper, drop 7, ratings 99", spot: { x: -2.5, y: 4.5, moving: CREEP }, ballX: 0, dropYards: 7, edge: false, ratings: { speed: 99, acceleration: 99 }, delayed: false, seconds: 1.408651304612361, yards: 10.76860229593982, eta: 1.4 },
  { name: "creeper, ratings 0", spot: { x: -2.5, y: 4.5, moving: CREEP }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 0, acceleration: 0 }, delayed: false, seconds: 1.48523157563758, yards: 8.82344135219425, eta: 1.5 },
  { name: "creeper at tau's floor (20/99), drop 7", spot: { x: -2.5, y: 4.5, moving: CREEP }, ballX: 0, dropYards: 7, edge: false, ratings: { speed: 20, acceleration: 99 }, delayed: false, seconds: 1.6411374345179928, yards: 10.76860229593982, eta: 1.6 },
  { name: "looper, EDGE C to the A gap (no bend), 60/58", spot: { x: 4.5, y: 1 }, ballX: 0, dropYards: 5, edge: true, loop: { partnerSpot: { x: 1, y: 1 } }, ratings: { speed: 60, acceleration: 58 }, delayed: false, seconds: 1.9341173715718059, yards: 9.082762530298218, eta: 1.9 },
  { name: "looper crossing the center, A left to B right, drop 7", spot: { x: -1, y: 1 }, ballX: 0, dropYards: 7, edge: false, loop: { partnerSpot: { x: 2.5, y: 1 } }, ratings: { speed: 38, acceleration: 36 }, delayed: false, seconds: 2.2877568156152965, yards: 11.381527307120106, eta: 2.3 },
  { name: "looper, C to A on the left, ratings 99", spot: { x: -4, y: 1 }, ballX: 0, dropYards: 5, edge: false, loop: { partnerSpot: { x: -1, y: 1 } }, ratings: { speed: 99, acceleration: 99 }, delayed: false, seconds: 1.7332095146706856, yards: 8.582762530298218, eta: 1.7 },
  { name: "looper, B to A, drop 7, ratings 0", spot: { x: 2.5, y: 1 }, ballX: 0, dropYards: 7, edge: false, loop: { partnerSpot: { x: 1, y: 1 } }, ratings: { speed: 0, acceleration: 0 }, delayed: false, seconds: 2.13897023193682, yards: 9.06225774829855, eta: 2.1 },
  { name: "AM-2's down-lineman reference (1.0, 2.5), 50/50, drop 5", spot: { x: 2.5, y: 1 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 50, acceleration: 50 }, delayed: false, seconds: 1.5199714809883855, yards: 5.5, eta: 1.5 },
  { name: "AM-2's linebacker reference (2.5, 2.5), 50/50, drop 5", spot: { x: 2.5, y: 2.5 }, ballX: 0, dropYards: 5, edge: false, ratings: { speed: 50, acceleration: 50 }, delayed: false, seconds: 1.7004741315022436, yards: 6.905694150420948, eta: 1.7 },
  { name: "AM-2's defensive-back reference (5.0, 7.0), EDGE, DELAYED", spot: { x: 7, y: 5 }, ballX: 0, dropYards: 5, edge: true, ratings: { speed: 50, acceleration: 50 }, delayed: true, seconds: 2.8357124388637764, yards: 12.327211177307074, eta: 2.8 },
  { name: "a ball off the middle (ballX -3), width from the ball", spot: { x: -1, y: 1 }, ballX: -3, dropYards: 5, edge: false, ratings: { speed: 50, acceleration: 50 }, delayed: false, seconds: 1.4966579185115987, yards: 5.324555320336759, eta: 1.5 },
];

/** The engine's test file, whose SHARED block this one must equal character for character. */
const ENGINE_FREE_RUN_TEST = join(dirname(fileURLToPath(import.meta.url)), "../../engine/test/freeRun.test.ts");
const SHARED_OPENING = "const SHARED: readonly SharedRow[] = [";

function sharedBlockOf(text: string): string {
  const start = text.indexOf(SHARED_OPENING);
  if (start < 0) throw new Error("no SHARED block");
  const end = text.indexOf("\n];", start);
  if (end < 0) throw new Error("the SHARED block does not close");
  return text.slice(start, end + 3);
}

describe("R-6: the shared literal table, the engine's clock bit for bit (calibration's side)", () => {
  it("is the engine's block, character for character, with the same creeper", () => {
    const here = sharedBlockOf(readFileSync(fileURLToPath(import.meta.url), "utf8"));
    const engine = readFileSync(ENGINE_FREE_RUN_TEST, "utf8");
    expect(here).toBe(sharedBlockOf(engine));
    expect(engine).toContain("const CREEP: FreeRunMoving = Object.freeze({ dx: 0, dy: -1, yardsPerSecond: 3 });");
    expect(CREEP).toEqual(CREEPER_MOVING);
    expect(SHARED.length).toBe(32);
  });

  it.each(SHARED.map((r) => [r.name, r] as const))("%s", (_name, row) => {
    const t = freeRunTime(
      freeRunInputOf({
        spot: row.spot,
        ballX: row.ballX,
        drop: row.dropYards,
        edge: row.edge,
        ...(row.loop === undefined ? {} : { loopPartner: row.loop.partnerSpot }),
        ratings: row.ratings,
        delayed: row.delayed,
      }),
    );
    expect(Object.is(t.seconds, row.seconds), `${String(t.seconds)} against ${String(row.seconds)}`).toBe(true);
    expect(Object.is(t.yards, row.yards), `${String(t.yards)} against ${String(row.yards)}`).toBe(true);
    expect(Object.is(t.eta, row.eta)).toBe(true);
  });
});

// --- ADR-089 step 3: AM-2's monotone reading on the unit grid, calibration's side -----------------

describe("AM-2's monotone reading on the unit grid, this package's function (paths 3 to 14 yards, ratings 0 to 99, set, DELAYED and moving)", () => {
  const PATHS = Array.from({ length: 23 }, (_, i) => 3 + i / 2);
  const STARTS = [
    { name: "set", moving: false, delayed: false },
    { name: "DELAYED", moving: false, delayed: true },
    { name: "moving", moving: true, delayed: false },
  ] as const;
  /** seconds[path][start][speed * 100 + acceleration], before rounding: a straight path of exactly that length (no width, drop + 1). */
  let seconds: Float64Array[][] = [];
  const at = (p: number, s: number, speed: number, acceleration: number): number => seconds[p]![s]![speed * 100 + acceleration]!;

  beforeAll(() => {
    seconds = PATHS.map((yards) =>
      STARTS.map((start) => {
        const out = new Float64Array(100 * 100);
        for (let speed = 0; speed < 100; speed++) {
          for (let acceleration = 0; acceleration < 100; acceleration++) {
            out[speed * 100 + acceleration] = freeRunTime({ spot: { depth: 0, width: 0 }, drop: yards + 1, edge: false, ratings: { speed, acceleration }, delayed: start.delayed, moving: start.moving }).seconds;
          }
        }
        return out;
      }),
    );
  }, 120_000);

  it("runs exactly the grid's path lengths", () => {
    for (const yards of PATHS) expect(pathYards({ spot: { depth: 0, width: 0 }, drop: yards + 1, edge: false })).toBe(yards);
  });

  it("graded: one point more Acceleration, and one more of both, are never later at the published tenth (nor before rounding)", () => {
    let pairs = 0;
    for (let p = 0; p < PATHS.length; p++) {
      for (let s = 0; s < STARTS.length; s++) {
        for (let speed = 0; speed < 100; speed++) {
          for (let acceleration = 0; acceleration < 99; acceleration++) {
            const before = at(p, s, speed, acceleration);
            const quicker = at(p, s, speed, acceleration + 1);
            pairs += 1;
            if (!(roundEta(quicker) <= roundEta(before)) || !(quicker <= before + 1e-12)) throw new Error(`Acceleration +1 is later: ${String(PATHS[p])} yd, ${STARTS[s]!.name}, ${String(speed)}/${String(acceleration)}`);
            if (speed === 99) continue;
            const both = at(p, s, speed + 1, acceleration + 1);
            if (!(roundEta(both) <= roundEta(before)) || !(both <= before + 1e-12)) throw new Error(`Speed and Acceleration +1 is later: ${String(PATHS[p])} yd, ${STARTS[s]!.name}, ${String(speed)}/${String(acceleration)}`);
          }
        }
      }
    }
    expect(pairs).toBe(23 * 3 * 100 * 99);
  });

  it("graded: the deeper of the card's drops (7 against 5) is never sooner, set, DELAYED and moving, at half-yard widths to 8 and depths 1 to 5", () => {
    const grid = [0, 11, 22, 33, 44, 55, 66, 77, 88, 99];
    let pairs = 0;
    for (let width = 0; width <= 8; width += 0.5) {
      for (const depth of [1, 1.5, 2.5, 4.5, 5]) {
        for (const edge of [false, true]) {
          for (const start of STARTS) {
            for (const speed of grid) {
              for (const acceleration of grid) {
                const input = { spot: { depth, width }, drop: 5, edge, ratings: { speed, acceleration }, delayed: start.delayed, moving: start.moving };
                const shallow = freeRunTime(input);
                const deep = freeRunTime({ ...input, drop: 7 });
                pairs += 1;
                if (!(deep.eta >= shallow.eta) || !(deep.seconds > shallow.seconds)) throw new Error(`the deeper drop is sooner at width ${String(width)}, depth ${String(depth)}`);
              }
            }
          }
        }
      }
    }
    expect(pairs).toBe(17 * 5 * 2 * 3 * 100);
  });

  it("reported (AM-2): one point more Speed alone, Acceleration held, can be later, by under 0.002 s, on critique 1's grid", () => {
    let pairs = 0;
    let later = 0;
    let laterAtTheTenth = 0;
    let worst = 0;
    for (let p = PATHS.indexOf(5); p <= PATHS.indexOf(13); p++) {
      for (let s = 0; s < STARTS.length; s++) {
        for (let speed = 0; speed < 99; speed++) {
          for (let acceleration = 0; acceleration < 100; acceleration++) {
            const before = at(p, s, speed, acceleration);
            const after = at(p, s, speed + 1, acceleration);
            pairs += 1;
            if (after > before) {
              later += 1;
              worst = Math.max(worst, after - before);
            }
            if (roundEta(after) > roundEta(before)) laterAtTheTenth += 1;
          }
        }
      }
    }
    console.log(`##POCKET_S3_SPEED_ALONE_CALIBRATION## ${JSON.stringify({ pairs, later, laterAtTheTenth, worstSeconds: Number(worst.toFixed(6)) })}`);
    expect(pairs).toBe(504_900);
    expect(later).toBeGreaterThan(0);
    expect(worst).toBeLessThan(0.002);
  });
});
