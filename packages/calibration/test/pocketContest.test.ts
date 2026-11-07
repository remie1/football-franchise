/**
 * ADR-089 step 0 — THE CONTEST'S BOUNDARY b (§4.5 item 5, ADR-089:669-671; deviation O6; plan §7.2 `rules`).
 *
 * b's closed form on both signs against brute-force enumeration of two d100s, its two quoted values
 * (0.456 at b = 5, 0.505 at b = 0), monotone over the filed grid, its start at `resultTierLadder`'s
 * SUCCESS boundary, the grid itself (-15 to 15), and the reachable range filed as REPORTED stand-ins.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { B_DOMAIN, B_GRID, B_REACHABLE_RANGE, B_START, FILED_B_GRID, pSackAtBoundary } from "../src/pocket/contest.js";
import { POCKET_1_S4_CONTACT } from "../src/pocket/rules.js";

/** P(x - y >= b) for x, y independent and uniform on 1..100, by counting all 10,000 pairs. */
function enumerate(b: number): number {
  let n = 0;
  for (let x = 1; x <= 100; x++) for (let y = 1; y <= 100; y++) if (x - y >= b) n++;
  return n / 10000;
}

describe("b's closed form, P(d100 - d100 >= b)", () => {
  it("is 0.456 at b = 5 and 0.505 at b = 0 (ADR-089:669)", () => {
    expect(pSackAtBoundary(5)).toBeCloseTo(0.456, 3);
    expect(pSackAtBoundary(5)).toBe((95 * 96) / 20000);
    expect(pSackAtBoundary(0)).toBeCloseTo(0.505, 3);
    expect(pSackAtBoundary(0)).toBe(1 - (99 * 100) / 20000);
  });

  it("equals the enumeration of all 10,000 pairs at every b of the grid and at the domain's edges", () => {
    for (const b of [...B_GRID, B_DOMAIN[0], B_DOMAIN[1], 1, -1, 50, -50]) {
      expect(pSackAtBoundary(b), `b = ${String(b)}`).toBeCloseTo(enumerate(b), 12);
    }
    expect(pSackAtBoundary(100)).toBe(0);
    expect(pSackAtBoundary(-99)).toBe(1);
  });

  it("falls strictly as b rises over the grid (a lower b means more sacks; O6)", () => {
    for (let i = 1; i < B_GRID.length; i++) expect(pSackAtBoundary(B_GRID[i]!)).toBeLessThan(pSackAtBoundary(B_GRID[i - 1]!));
  });

  it("refuses a b outside the whole numbers -99 to 100", () => {
    expect(() => pSackAtBoundary(101)).toThrow(/whole number/);
    expect(() => pSackAtBoundary(-100)).toThrow(/whole number/);
    expect(() => pSackAtBoundary(2.5)).toThrow(/whole number/);
  });
});

describe("b as filed", () => {
  it("starts at resultTierLadder's SUCCESS boundary", () => {
    const success = DEFAULT_TUNABLES.resultTierLadder.find((r) => r.label === "SUCCESS");
    expect(success?.minMargin).toBe(B_START);
    expect(B_START).toBe(5);
  });

  it("has the grid of the whole numbers -15 to 15 (O6) and files it", () => {
    expect(B_GRID).toEqual(Array.from({ length: 31 }, (_, i) => i - 15));
    expect(FILED_B_GRID.values).toEqual(B_GRID);
    expect(FILED_B_GRID.adrLine).toBe(669);
    expect(FILED_B_GRID.params?.["start"]).toBe(5);
    expect(FILED_B_GRID.params?.["target"]).toBe(44.6);
    expect(FILED_B_GRID.params?.["fittedAt"]).toBe("10");
  });

  it("files the reachable range as REPORTED stand-ins measured at the grid's ends at steps 4 and 10, never widened (ADR-089:671, :1123)", () => {
    expect(B_REACHABLE_RANGE.adrLine).toBe(671);
    expect(B_REACHABLE_RANGE.continuousReading).toEqual([24, 36]);
    expect(B_REACHABLE_RANGE.gridReading).toEqual([37, 57]);
    expect(B_REACHABLE_RANGE.measuredAt).toEqual(["4", "10"]);
    expect(B_REACHABLE_RANGE.unit).toMatch(/REPORTED/);
    expect(B_REACHABLE_RANGE.neverWidened).toMatch(/never widened/);
    expect(FILED_B_GRID.params?.["reachableRange"]).toMatchObject({ adrLine: 671, measuredAt: ["4", "10"] });
  });
});

/**
 * ADR-089 step 4, R-6: THE SHARED LITERAL TABLE (plan §2.1; critique 2 F20, critique 3 N6). The same
 * literals as `engine/test/contact.test.ts`'s `CLOSED_FORMS`, pasted, so a change to either package's
 * closed form fails a test in that package: P(RUSHER_SACKS) at b with equal reads and no tilt, and the
 * second arrival's 0.85 at the filed target.
 */
const CLOSED_FORMS: readonly (readonly [number, number])[] = [
  [-15, 0.643],
  [-14, 0.6345],
  [-13, 0.6259],
  [-12, 0.6172],
  [-11, 0.6084],
  [-10, 0.5995],
  [-9, 0.5905],
  [-8, 0.5814],
  [-7, 0.5722],
  [-6, 0.5629],
  [-5, 0.5535],
  [-4, 0.544],
  [-3, 0.5344],
  [-2, 0.5247],
  [-1, 0.5149],
  [0, 0.505],
  [1, 0.495],
  [2, 0.4851],
  [3, 0.4753],
  [4, 0.4656],
  [5, 0.456],
  [6, 0.4465],
  [7, 0.4371],
  [8, 0.4278],
  [9, 0.4186],
  [10, 0.4095],
  [11, 0.4005],
  [12, 0.3916],
  [13, 0.3828],
  [14, 0.3741],
  [15, 0.3655],
];
const SECOND_ARRIVAL_AT_15 = 0.85;

describe("ADR-089 step 4, R-6: the closed forms against the engine's literal table", () => {
  it("covers the filed grid, -15 to 15, and pSackAtBoundary is the table at every b", () => {
    expect(CLOSED_FORMS.map(([b]) => b)).toEqual(B_GRID);
    for (const [b, p] of CLOSED_FORMS) expect(pSackAtBoundary(b), `b = ${String(b)}`).toBeCloseTo(p, 12);
    expect(CLOSED_FORMS.find(([b]) => b === POCKET_1_S4_CONTACT.boundary)?.[1]).toBe(0.456);
  });

  it("the second arrival at the filed target is 0.85: (100 - target)/100", () => {
    const second = POCKET_1_S4_CONTACT.secondArrival;
    if (second === "RATED") throw new Error("pocket-1.s4 files a second arrival with a target");
    expect(second.target).toBe(15);
    expect((100 - second.target) / 100).toBe(SECOND_ARRIVAL_AT_15);
  });
});
