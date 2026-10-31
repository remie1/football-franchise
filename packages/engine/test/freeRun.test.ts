/**
 * ADR-089 step 3 — THE FREE-RUN CLOCK, D18 AND D22 (`resolve/freeRun.ts`; plan §2.2, R-5, R-6).
 *
 * 1. THE SHARED TABLE (R-6, critique 2 B3). The engine does not import calibration and calibration
 *    does not import the engine's clock, so agreement is pinned by a literal table instead: 32 cases
 *    in the engine's terms (a published snap spot, the ball, the drop, EDGE, a loop's partner,
 *    ratings, DELAYED, the creeper's moving entry), whose seconds, yards and ETA were produced ONCE
 *    by calibration's step-0 `freeRunTime` (`packages/calibration/src/pocket/freeRun.ts`, at
 *    93c2762), reading each spot as AM-2's part 1 does (depth y, width |x - ballX|; a looper runs
 *    from the partner's spot after |x_partner - x_own| + 0.5), and pasted with full precision.
 *    Every value is asserted with `Object.is`: the two functions are bit-identical on it.
 *    Calibration's `pocketFreeRun.test.ts` pins the same table.
 * 2. D18's numbers, D22's paths, the get-off, DELAYED, the creeper and the rounding.
 * 3. AM-2's monotone reading on the unit grid (paths 3 to 14 yards, ratings 0 to 99, set, DELAYED
 *    and moving starts): Acceleration +1, and Speed and Acceleration +1 together, are never later
 *    at the published tenth; the deeper drop is never sooner. Speed alone is reported by count and
 *    size (D18's start is relative to Speed), on critique 1's grid of 504,900 pairs.
 * 4. The mirror: x -> -x gives the same time, bit for bit.
 * 5. AM-2's invariant: every free-run time on the grid of ADR-090's rows, ratings 0 to 99 and both
 *    drops is later than `t_e` (1.0 s), held by this test, never by a throw in play.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import * as barrel from "../src/index.js";
import {
  FreeRunEntryError,
  distanceAfter,
  fortySeconds,
  freeRunClock,
  freeRunPathYards,
  freeRunRatingsOf,
  freeRunSecondsFor,
  movingEntryProblem,
  roundFreeRunEta,
  secondsToCover,
  tauSeconds,
  topSpeed,
} from "../src/resolve/freeRun.js";
import type { FreeRunInput, FreeRunMoving, FreeRunRatings } from "../src/resolve/freeRun.js";
import type { FreeRunTunables } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";
import { FREE_RUN_FILED, LATE_BLOCK_FILED } from "./pocketTunables.js";

const C = FREE_RUN_FILED;
const CREEP: FreeRunMoving = Object.freeze({ dx: 0, dy: -1, yardsPerSecond: 3 });

interface SharedRow extends FreeRunInput {
  readonly name: string;
  /** calibration's `freeRunTime(...).seconds`, `.yards` and `.eta`, pasted. */
  readonly seconds: number;
  readonly yards: number;
  readonly eta: number;
}

/** R-6: produced once by calibration's `freeRunTime` at 93c2762; never edited by hand. */
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

const near = (actual: number, expected: number, tol = 0.005): void => {
  expect(Math.abs(actual - expected), `${String(actual)} against ${String(expected)}`).toBeLessThanOrEqual(tol);
};
const ratings = (speed: number, acceleration: number): FreeRunRatings => ({ speed, acceleration });
const withDials = (patch: Partial<Record<keyof FreeRunTunables, unknown>>): FreeRunTunables => ({ ...C, ...patch }) as FreeRunTunables;
const mirrored = (a: FreeRunInput): FreeRunInput => ({
  ...a,
  spot: { ...a.spot, x: -a.spot.x },
  ballX: -a.ballX,
  ...(a.loop === undefined ? {} : { loop: { partnerSpot: { x: -a.loop.partnerSpot.x, y: a.loop.partnerSpot.y } } }),
});
const startSpot = (x: number, y: number, start: Start): FreeRunInput["spot"] => (start === "moving" ? { x, y, moving: CREEP } : { x, y });

type Start = "set" | "DELAYED" | "moving";

/**
 * ADR-090's rows as built (`packages/playbook/src/snapSpots.ts`, D4 and §4.6, read at 93c2762), by
 * depth, with the starts each can have: a down lineman at 1.0 and the Mug's backer at 1.5 are set; a
 * walked-up backer (STANDARD, ZERO) at 2.5 is set (no Creeper call walks a backer up: every one is
 * ZONE_BLITZ, `playbook/src/coverageCatalogue.ts`, and a creeper the Mug walked up is set); a
 * disguised backer (ZONE_BLITZ, DELAYED) at 4.5 and a rushing defensive back at 5.0 may be set,
 * DELAYED or the creeper. Widths run the half-yard grid from the ball out to 8 yards (both sides
 * alike, by the mirror), EDGE or not.
 */
const ROWS: readonly (readonly [number, readonly Start[]])[] = [
  [1.0, ["set"]],
  [1.5, ["set"]],
  [2.5, ["set"]],
  [4.5, ["set", "DELAYED", "moving"]],
  [5.0, ["set", "DELAYED", "moving"]],
];

describe("R-6: the shared table, calibration's freeRunTime bit for bit", () => {
  it("has 32 cases covering ratings 0, 50 and 99, both tau clamps, drops 5 and 7, set, DELAYED and moving starts, EDGE and the loop", () => {
    expect(SHARED.length).toBe(32);
    const speeds = new Set(SHARED.map((r) => r.ratings.speed));
    for (const s of [0, 50, 99]) expect(speeds.has(s)).toBe(true);
    expect(SHARED.some((r) => tauSeconds(C, r.ratings) === C.tauMin)).toBe(true);
    expect(SHARED.some((r) => tauSeconds(C, r.ratings) === C.tauMax)).toBe(true);
    expect(new Set(SHARED.map((r) => r.dropYards))).toEqual(new Set([5, 7]));
    expect(SHARED.some((r) => r.delayed)).toBe(true);
    expect(SHARED.some((r) => r.spot.moving !== undefined)).toBe(true);
    expect(SHARED.some((r) => !r.delayed && r.spot.moving === undefined)).toBe(true);
    expect(SHARED.some((r) => r.edge && r.loop === undefined)).toBe(true);
    expect(SHARED.some((r) => r.loop !== undefined)).toBe(true);
    expect(SHARED.some((r) => r.ballX !== 0)).toBe(true);
  });

  it.each(SHARED.map((r) => [r.name, r] as const))("%s", (_name, row) => {
    const clock = freeRunClock(C, row);
    expect(Object.is(clock.unroundedSeconds, row.seconds), `${String(clock.unroundedSeconds)} against ${String(row.seconds)}`).toBe(true);
    expect(Object.is(clock.distanceYards, row.yards), `${String(clock.distanceYards)} against ${String(row.yards)}`).toBe(true);
    expect(Object.is(clock.etaSeconds, row.eta)).toBe(true);
    expect(Object.is(clock.closingSpeed, row.yards / row.seconds)).toBe(true);
  });
});

describe("D18: speed and acceleration (ADR-089 §4.4.4)", () => {
  const NT = ratings(32, 29);
  const DE = ratings(60, 58);
  const CB = ratings(80, 78);

  it("gives the 40s and top speeds of §4.4.4 (the free-runner reader's typical men)", () => {
    expect(fortySeconds(C, 0)).toBe(5.6);
    expect(fortySeconds(C, 99)).toBeCloseTo(4.22, 10);
    expect(fortySeconds(C, 50)).toBe(5.6 - (1.38 * 50) / 99);
    near(fortySeconds(C, NT.speed), 5.15);
    near(fortySeconds(C, DE.speed), 4.76);
    near(fortySeconds(C, CB.speed), 4.48);
    near(topSpeed(C, NT), 9.17);
    near(topSpeed(C, DE), 10.05);
    near(topSpeed(C, CB), 10.8);
  });

  it("clamps the start to 0.63 to 0.91 s, relative to Speed", () => {
    expect(tauSeconds(C, ratings(60, 60))).toBe(0.77);
    expect(tauSeconds(C, ratings(20, 99))).toBe(0.63);
    expect(tauSeconds(C, ratings(99, 20))).toBe(0.91);
    near(tauSeconds(C, NT), 0.791, 1e-12);
  });

  it("runs the 40 in the 40 time (x(F) = 40), and covers a path by bisection", () => {
    for (const r of [NT, DE, CB, ratings(0, 0), ratings(99, 99)]) near(distanceAfter(C, fortySeconds(C, r.speed), r), 40, 1e-9);
    near(secondsToCover(C, 40, DE), fortySeconds(C, DE.speed), 1e-9);
    expect(secondsToCover(C, 0, DE)).toBe(0);
    expect(() => secondsToCover(C, -1, DE)).toThrow(FreeRunEntryError);
    expect(() => secondsToCover(C, Number.NaN, DE)).toThrow(FreeRunEntryError);
    expect(() => secondsToCover(C, 1e6, DE)).toThrow(/beyond a minute's run/);
  });

  it("reads Speed and Acceleration through the registry (Iron Rule 5)", () => {
    expect(freeRunRatingsOf(makePlayer("lb-x", "Ray Okafor", "MLB", { speed: 65, acceleration: 63 }))).toEqual(ratings(65, 63));
    // getAttr's absent-id fallback, as every engine read has it.
    expect(freeRunRatingsOf(makePlayer("lb-y", "Ike Brandt", "MLB", {}))).toEqual(ratings(50, 50));
  });
});

describe("D22 and §4.4.5: the path and the time", () => {
  const at = (x: number, y: number, patch: Partial<FreeRunInput> = {}): FreeRunInput => ({
    spot: { x, y },
    ballX: 0,
    dropYards: 5,
    edge: false,
    ratings: ratings(50, 50),
    delayed: false,
    ...patch,
  });

  it("takes the reach off the straight path and bends 1.1 round the edge, measured from the ball's x", () => {
    expect(freeRunPathYards(C, at(0, 1))).toBeCloseTo(5, 12);
    expect(freeRunPathYards(C, at(0, 1, { edge: true }))).toBeCloseTo(5.5, 12);
    expect(freeRunPathYards(C, at(3, 1, { dropYards: 3 }))).toBeCloseTo(4, 12);
    expect(Object.is(freeRunPathYards(C, at(4, 1, { ballX: 3 })), freeRunPathYards(C, at(1, 1)))).toBe(true);
    expect(Object.is(freeRunPathYards(C, at(-2.5, 2.5)), freeRunPathYards(C, at(2.5, 2.5)))).toBe(true);
  });

  it("a looper crosses |x_partner - x_own| + 0.5 yards, then runs from the partner's spot, with no bend", () => {
    const loop = { partnerSpot: { x: 1, y: 1 } };
    const looped = freeRunPathYards(C, at(4, 1, { loop, edge: true }));
    expect(Object.is(looped, freeRunPathYards(C, at(1, 1)) + (3 + 0.5))).toBe(true);
    expect(Object.is(freeRunPathYards(C, at(4, 1, { loop, edge: false })), looped)).toBe(true);
    // Crossing the center: positions signed by side.
    const across = freeRunPathYards(C, at(-1, 1, { loop: { partnerSpot: { x: 2.5, y: 1 } } }));
    expect(Object.is(across, freeRunPathYards(C, at(2.5, 1)) + (3.5 + 0.5))).toBe(true);
  });

  it("never runs a negative path: a man inside the reach covers 0 yards and arrives at his get-off", () => {
    const inside = freeRunClock(C, at(0, -5.5));
    expect(inside.distanceYards).toBe(0);
    expect(inside.unroundedSeconds).toBe(C.getOffSeconds);
    expect(inside.closingSpeed).toBe(0);
  });

  it("reproduces §4.4.5's rated rows to 0.01 s at both drops, and the loop from C to A", () => {
    const NT = ratings(32, 29);
    const DT = ratings(38, 36);
    const DE = ratings(60, 58);
    const MLB = ratings(65, 65);
    const CB = ratings(80, 78);
    // name, x, y, EDGE, ratings, at 5 yd, at 7 yd (ADR-089 §4.4.5's typical times).
    const rows: readonly (readonly [string, number, number, boolean, FreeRunRatings, number, number])[] = [
      ["free nose tackle, head up", 0, 1.0, false, NT, 1.5, 1.77],
      ["3-technique", 1.9, 1.0, false, DT, 1.53, 1.78],
      ["end in the C gap", 4.5, 1.0, true, DE, 1.71, 1.92],
      ["wide edge rusher", 6.0, 1.5, true, DE, 1.88, 2.08],
      ["A-gap linebacker at 1.5", 0.75, 1.5, false, MLB, 1.49, 1.73],
      ["walked-up B-gap linebacker", 2.25, 2.5, false, MLB, 1.65, 1.87],
      ["off linebacker at 5, B gap", 2.25, 5.0, false, MLB, 1.93, 2.15],
      ["slot corner blitz", 7.0, 5.0, true, CB, 2.2, 2.39],
    ];
    expect(rows.length).toBe(8);
    for (const [, x, y, edge, r, at5, at7] of rows) {
      near(freeRunClock(C, at(x, y, { edge, ratings: r })).unroundedSeconds, at5);
      near(freeRunClock(C, at(x, y, { edge, ratings: r, dropYards: 7 })).unroundedSeconds, at7);
    }
    const loop = { partnerSpot: { x: 0.75, y: 1.0 } };
    near(freeRunClock(C, at(3.75, 1.0, { loop, ratings: DE })).unroundedSeconds, 1.87);
    near(freeRunClock(C, at(3.75, 1.0, { loop, ratings: DE, dropYards: 7 })).unroundedSeconds, 2.1);
  });
});

describe("the start: the get-off, DELAYED, the creeper; and the rounding", () => {
  const base: FreeRunInput = { spot: { x: -2.5, y: 4.5 }, ballX: 0, dropYards: 5, edge: false, ratings: ratings(65, 63), delayed: false };

  it("a set man: get-off 0.35 s, then the run; DELAYED adds 0.5 s", () => {
    const yards = freeRunPathYards(C, base);
    const set = freeRunClock(C, base);
    expect(Object.is(set.unroundedSeconds, 0.35 + 0 + secondsToCover(C, yards, base.ratings))).toBe(true);
    const delayed = freeRunClock(C, { ...base, delayed: true });
    expect(Object.is(delayed.unroundedSeconds, 0.35 + 0.5 + secondsToCover(C, yards, base.ratings))).toBe(true);
    near(delayed.unroundedSeconds - set.unroundedSeconds, 0.5, 1e-12);
    expect(delayed.closingSpeed).toBeLessThan(set.closingSpeed);
  });

  it("the creeper: no get-off, already moving at 3 yd/s along his path (no projection), so sooner than set", () => {
    const yards = freeRunPathYards(C, base);
    const creeper = freeRunClock(C, { ...base, spot: { ...base.spot, moving: CREEP } });
    expect(Object.is(creeper.unroundedSeconds, 0 + 0 + secondsToCover(C, yards, base.ratings, 3))).toBe(true);
    expect(Object.is(creeper.distanceYards, yards)).toBe(true);
    expect(creeper.unroundedSeconds).toBeLessThan(freeRunClock(C, base).unroundedSeconds - C.getOffSeconds);
    expect(Object.is(freeRunSecondsFor(C, yards, base.ratings, true, false), creeper.unroundedSeconds)).toBe(true);
  });

  it("the clean bench's levers push the get-offs past clock.maxTick (AM-2's bench); part 1's negative control moves the time", () => {
    const bench = withDials({ getOffSeconds: 50, movingGetOffSeconds: 50 });
    expect(freeRunClock(bench, base).unroundedSeconds).toBeGreaterThan(50);
    expect(freeRunClock(bench, { ...base, spot: { ...base.spot, moving: CREEP } }).unroundedSeconds).toBeGreaterThan(50);
    expect(freeRunClock(withDials({ getOffSeconds: 0.36 }), base).unroundedSeconds).toBeGreaterThan(freeRunClock(C, base).unroundedSeconds);
  });

  it("rounds to the tenth with toFixed, as every published etaTick is rounded", () => {
    expect(roundFreeRunEta(1.649)).toBe(1.6);
    expect(roundFreeRunEta(1.65)).toBe(1.6);
    expect(roundFreeRunEta(1.651)).toBe(1.7);
    for (const row of SHARED) {
      const clock = freeRunClock(C, row);
      expect(clock.etaSeconds).toBe(Number(clock.unroundedSeconds.toFixed(1)));
    }
  });

  it("is pure: the same entry gives the same clock, and the module throws no die and reads no clock", () => {
    for (const row of SHARED) expect(freeRunClock(C, row)).toEqual(freeRunClock(C, row));
    const source = readFileSync(join(import.meta.dirname, "..", "src", "resolve", "freeRun.ts"), "utf8");
    for (const banned of ["Math.random", "Date.now", "performance.now", "new Date", ".fork(", "Rng"]) expect(source.includes(banned), banned).toBe(false);
  });
});

describe("the moving-entry rule (plan §2.2): only the creeper's entry is timed", () => {
  const moving = (m: FreeRunMoving): FreeRunInput => ({
    spot: { x: -2.5, y: 4.5, moving: m },
    ballX: 0,
    dropYards: 5,
    edge: false,
    ratings: ratings(50, 50),
    delayed: false,
  });

  it("accepts the creeper's entry, straight at the line at the filed 3 yd/s", () => {
    expect(movingEntryProblem(C, CREEP)).toBeUndefined();
    expect(() => freeRunClock(C, moving(CREEP))).not.toThrow();
  });

  const refused: readonly (readonly [string, FreeRunMoving, string])[] = [
    ["across the line", { dx: 1, dy: 0, yardsPerSecond: 3 }, "moves (1, 0), not straight at the line (0, -1)"],
    ["at an angle", { dx: 0.5, dy: -1, yardsPerSecond: 3 }, "moves (0.5, -1), not straight at the line (0, -1)"],
    ["away from the line", { dx: 0, dy: 1, yardsPerSecond: 3 }, "moves (0, 1), not straight at the line (0, -1)"],
    ["slower than the creeper", { dx: 0, dy: -1, yardsPerSecond: 2.5 }, "moves at 2.5 yd/s, not the creeper's filed 3 yd/s"],
    ["faster than the creeper", { dx: 0, dy: -1, yardsPerSecond: 3.5 }, "moves at 3.5 yd/s, not the creeper's filed 3 yd/s"],
  ];
  for (const [what, m, problem] of refused) {
    it(`refuses a man moving ${what}, a configuration fault`, () => {
      expect(movingEntryProblem(C, m)).toBe(problem);
      let thrown: unknown;
      try {
        freeRunClock(C, moving(m));
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(FreeRunEntryError);
      expect((thrown as Error).name).toBe("FreeRunEntryError");
      expect((thrown as Error).message).toBe(`@ff/engine: the free-run clock cannot time a man who ${problem}`);
    });
  }
});

describe("the mirror: x -> -x gives the same clock, bit for bit", () => {
  it("on every case of the shared table", () => {
    for (const row of SHARED) {
      const a = freeRunClock(C, row);
      const b = freeRunClock(C, mirrored(row));
      expect(Object.is(a.unroundedSeconds, b.unroundedSeconds), row.name).toBe(true);
      expect(Object.is(a.distanceYards, b.distanceYards), row.name).toBe(true);
      expect(Object.is(a.etaSeconds, b.etaSeconds), row.name).toBe(true);
    }
  });

  it("on a grid of half-yard spots, loopers included", () => {
    for (let x = -8; x <= 8; x += 0.5) {
      for (const [y] of ROWS) {
        for (const edge of [false, true]) {
          const a: FreeRunInput = { spot: { x, y }, ballX: 0, dropYards: 7, edge, ratings: ratings(44, 61), delayed: y > 4 };
          expect(Object.is(freeRunClock(C, a).unroundedSeconds, freeRunClock(C, mirrored(a)).unroundedSeconds)).toBe(true);
          const looped: FreeRunInput = { ...a, spot: { x, y: 1 }, loop: { partnerSpot: { x: x / 2, y: 1 } } };
          expect(Object.is(freeRunClock(C, looped).unroundedSeconds, freeRunClock(C, mirrored(looped)).unroundedSeconds)).toBe(true);
        }
      }
    }
  });
});

describe("AM-2's monotone reading on the unit grid (paths 3 to 14 yards, ratings 0 to 99, set, DELAYED and moving)", () => {
  const PATHS = Array.from({ length: 23 }, (_, i) => 3 + i / 2);
  const STARTS: readonly { readonly name: Start; readonly moving: boolean; readonly delayed: boolean }[] = [
    { name: "set", moving: false, delayed: false },
    { name: "DELAYED", moving: false, delayed: true },
    { name: "moving", moving: true, delayed: false },
  ];
  /** seconds[path][start][speed * 100 + acceleration], before rounding, through the engine's own function. */
  let seconds: Float64Array[][] = [];
  const at = (p: number, s: number, speed: number, acceleration: number): number => seconds[p]![s]![speed * 100 + acceleration]!;

  beforeAll(() => {
    seconds = PATHS.map((yards) =>
      STARTS.map((start) => {
        const out = new Float64Array(100 * 100);
        for (let speed = 0; speed < 100; speed++) {
          for (let acceleration = 0; acceleration < 100; acceleration++) {
            out[speed * 100 + acceleration] = freeRunSecondsFor(C, yards, ratings(speed, acceleration), start.moving, start.delayed);
          }
        }
        return out;
      }),
    );
  }, 120_000);

  it("graded: one point more Acceleration is never later at the published tenth (nor before rounding)", () => {
    let pairs = 0;
    for (let p = 0; p < PATHS.length; p++) {
      for (let s = 0; s < STARTS.length; s++) {
        for (let speed = 0; speed < 100; speed++) {
          for (let acceleration = 0; acceleration < 99; acceleration++) {
            const before = at(p, s, speed, acceleration);
            const after = at(p, s, speed, acceleration + 1);
            pairs += 1;
            if (!(roundFreeRunEta(after) <= roundFreeRunEta(before)) || !(after <= before + 1e-12)) {
              throw new Error(`Acceleration +1 is later: ${String(PATHS[p])} yd, ${STARTS[s]!.name}, ${String(speed)}/${String(acceleration)}`);
            }
          }
        }
      }
    }
    expect(pairs).toBe(23 * 3 * 100 * 99);
  });

  it("graded: one point more of both Speed and Acceleration is never later at the published tenth (nor before rounding)", () => {
    let pairs = 0;
    for (let p = 0; p < PATHS.length; p++) {
      for (let s = 0; s < STARTS.length; s++) {
        for (let speed = 0; speed < 99; speed++) {
          for (let acceleration = 0; acceleration < 99; acceleration++) {
            const before = at(p, s, speed, acceleration);
            const after = at(p, s, speed + 1, acceleration + 1);
            pairs += 1;
            if (!(roundFreeRunEta(after) <= roundFreeRunEta(before)) || !(after <= before + 1e-12)) {
              throw new Error(`Speed and Acceleration +1 is later: ${String(PATHS[p])} yd, ${STARTS[s]!.name}, ${String(speed)}/${String(acceleration)}`);
            }
          }
        }
      }
    }
    expect(pairs).toBe(23 * 3 * 99 * 99);
  });

  it("a longer path is never sooner (so the shortest spot of a row bounds the row)", () => {
    for (let p = 1; p < PATHS.length; p++) {
      for (let s = 0; s < STARTS.length; s++) {
        for (let i = 0; i < 100 * 100; i++) {
          if (!(seconds[p]![s]![i]! > seconds[p - 1]![s]![i]!)) throw new Error(`a longer path is not later at ${String(PATHS[p])} yd`);
        }
      }
    }
  });

  it("graded: the deeper of the card's drops (7 against 5) is never sooner, on ADR-090's rows and on loopers", () => {
    const grid = [0, 11, 22, 33, 44, 55, 66, 77, 88, 99];
    let pairs = 0;
    for (let x = 0; x <= 8; x += 0.5) {
      for (const [y, starts] of ROWS) {
        for (const edge of [false, true]) {
          for (const start of starts) {
            for (const speed of grid) {
              for (const acceleration of grid) {
                const a: FreeRunInput = { spot: startSpot(x, y, start), ballX: 0, dropYards: 5, edge, ratings: ratings(speed, acceleration), delayed: start === "DELAYED" };
                const shallow = freeRunClock(C, a);
                const deep = freeRunClock(C, { ...a, dropYards: 7 });
                pairs += 1;
                if (!(deep.etaSeconds >= shallow.etaSeconds) || !(deep.unroundedSeconds > shallow.unroundedSeconds)) {
                  throw new Error(`the deeper drop is sooner at x ${String(x)}, y ${String(y)}`);
                }
              }
            }
          }
        }
      }
    }
    for (let own = -6; own <= 6; own += 1) {
      for (let partner = -4; partner <= 4; partner += 1) {
        for (const speed of grid) {
          const a: FreeRunInput = { spot: { x: own, y: 1 }, ballX: 0, dropYards: 5, edge: false, loop: { partnerSpot: { x: partner, y: 1 } }, ratings: ratings(speed, speed), delayed: false };
          pairs += 1;
          expect(freeRunClock(C, { ...a, dropYards: 7 }).etaSeconds).toBeGreaterThanOrEqual(freeRunClock(C, a).etaSeconds);
        }
      }
    }
    const startsOnRows = ROWS.reduce((n, [, starts]) => n + starts.length, 0);
    // 17 widths, 9 row starts, 2 (EDGE or not), 10 by 10 ratings; then 13 by 9 loops at 10 ratings.
    expect(startsOnRows).toBe(9);
    expect(pairs).toBe(17 * startsOnRows * 2 * grid.length * grid.length + 13 * 9 * grid.length);
  });

  it("reported (AM-2): one point more Speed alone, Acceleration held, can be later, by under 0.002 s, on critique 1's grid", () => {
    // Critique 1's grid: paths 5.0 to 13.0 yards by halves, Acceleration 0 to 99, Speed 0 to 98,
    // set, DELAYED and moving starts: 17 * 100 * 99 * 3 = 504,900 (Speed, Speed + 1) pairs. AM-2
    // reports the count and the largest size, unrounded and at the tenth; nothing is graded.
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
            if (roundFreeRunEta(after) > roundFreeRunEta(before)) laterAtTheTenth += 1;
          }
        }
      }
    }
    console.log(`##POCKET_S3_SPEED_ALONE## ${JSON.stringify({ pairs, later, laterAtTheTenth, worstSeconds: Number(worst.toFixed(6)) })}`);
    expect(pairs).toBe(504_900);
    expect(later).toBeGreaterThan(0);
    expect(laterAtTheTenth).toBeGreaterThan(0);
    expect(worst).toBeLessThan(0.002);
  });
});

describe("AM-2's invariant: every free-run time is later than t_e (held by a test, never by a throw in play)", () => {
  const T_E = LATE_BLOCK_FILED.engageSeconds;

  it("t_e is AM-2's 1.0 s", () => {
    expect(T_E).toBe(1.0);
  });

  it("the shortest spot of each row and start, at every rating 0 to 99, at the shallower drop: published later than t_e", () => {
    let fastest = Number.POSITIVE_INFINITY;
    let where = "";
    for (const [y, starts] of ROWS) {
      for (const start of starts) {
        for (let speed = 0; speed < 100; speed++) {
          for (let acceleration = 0; acceleration < 100; acceleration++) {
            const clock = freeRunClock(C, { spot: startSpot(0, y, start), ballX: 0, dropYards: 5, edge: false, ratings: ratings(speed, acceleration), delayed: start === "DELAYED" });
            if (clock.unroundedSeconds < fastest) {
              fastest = clock.unroundedSeconds;
              where = `${String(y)} yd ${start}, ${String(speed)}/${String(acceleration)}: ${String(clock.unroundedSeconds)} s, published ${String(clock.etaSeconds)}`;
            }
            if (!(clock.etaSeconds > T_E)) throw new Error(`a free runner at ${String(clock.etaSeconds)} s, not later than t_e, at ${String(y)} yd ${start}`);
          }
        }
      }
    }
    console.log(`##POCKET_S3_FASTEST_FREE_RUNNER## ${where}`);
    expect(fastest).toBeGreaterThan(T_E);
  });

  it("every spot of the rows (half-yard widths to 8, EDGE or not, both drops, loopers) on a ratings grid: later than t_e", () => {
    const grid = [0, 9, 18, 27, 36, 45, 54, 63, 72, 81, 90, 99];
    let spots = 0;
    for (let x = 0; x <= 8; x += 0.5) {
      for (const [y, starts] of ROWS) {
        for (const edge of [false, true]) {
          for (const dropYards of [5, 7]) {
            for (const start of starts) {
              for (const speed of grid) {
                for (const acceleration of grid) {
                  const clock = freeRunClock(C, { spot: startSpot(x, y, start), ballX: 0, dropYards, edge, ratings: ratings(speed, acceleration), delayed: start === "DELAYED" });
                  spots += 1;
                  if (!(clock.etaSeconds > T_E)) throw new Error(`a free runner at ${String(clock.etaSeconds)} s at x ${String(x)}, y ${String(y)}`);
                }
              }
            }
          }
        }
      }
    }
    for (let own = -6; own <= 6; own += 0.5) {
      for (const partner of [-1, 0, 1]) {
        for (const speed of grid) {
          const clock = freeRunClock(C, { spot: { x: own, y: 1 }, ballX: 0, dropYards: 5, edge: false, loop: { partnerSpot: { x: partner, y: 1 } }, ratings: ratings(speed, speed), delayed: false });
          spots += 1;
          expect(clock.etaSeconds).toBeGreaterThan(T_E);
        }
      }
    }
    expect(spots).toBeGreaterThan(80_000);
  });
});

describe("the engine's surface (plan §2.2): the clock is not exported to calibration", () => {
  it("no barrel name for the free-run clock", () => {
    for (const name of ["freeRunClock", "freeRunSecondsFor", "freeRunPathYards", "movingEntryProblem", "FreeRunEntryError", "freeRunRatingsOf", "secondsToCover", "roundFreeRunEta"]) {
      expect(name in barrel, name).toBe(false);
    }
  });
});
