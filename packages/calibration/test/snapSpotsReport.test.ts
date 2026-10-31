/**
 * ADR-090 step 0's report (`pnpm --filter @ff/calibration snap-spots`): its counts read the live
 * book, so a card or a table that breaks an August range, puts two men on one spot, or leaves a
 * man out fails here, not only in a report nobody re-ran.
 */
import { describe, expect, it } from "vitest";
import { drawEverySnap } from "../src/snapSpots/corpus.js";
import { measureSnapSpots, techniqueOf } from "../src/snapSpots/measure.js";
import { CHOSEN_RULES, renderSnapSpots } from "../src/snapSpots/render.js";

const measure = measureSnapSpots(drawEverySnap());
const depths = (tally: Readonly<Record<string, number>>): number[] => Object.keys(tally).map(Number.parseFloat);

describe("ADR-090 step 0: the snap-spot report", () => {
  it("draws every picture whole, and nobody on anybody but the two the calls ask for", () => {
    expect(measure.formations).toBe(12);
    expect(measure.pictures).toBeGreaterThan(4_000);
    expect(measure.mugPictures).toBeGreaterThan(0);
    expect(measure.stemPictures).toBeGreaterThan(0);
    expect(measure.incomplete).toEqual([]);
    expect(measure.otherSharedSpots).toEqual([]);
    expect(measure.quarterbackBehindCenter).toBeGreaterThan(0);
    expect(measure.mugBackerBehindTackle).toBeGreaterThan(0);
  });

  it("reads a down lineman's technique from D3's line, the same on either side", () => {
    expect([0, 1, 1.5, 2.5, 3, 4, 4.5, 6].map(techniqueOf)).toEqual(["0", "1", "2", "3", "4", "5", "6", "9"]);
    expect([-1, -2.5, -4.5, -6].map(techniqueOf)).toEqual(["1", "3", "6", "9"]);
  });

  it("keeps table D4 inside every one of the owner's August ranges (ADR-066:607-610)", () => {
    expect(Object.keys(measure.technique).map(Number).every((t) => t >= 0 && t <= 9)).toBe(true);
    expect(Object.keys(measure.lineDepths)).toEqual(["1 DOWN"]);
    expect(depths(measure.backersNotRushing).every((y) => y >= 4 && y <= 7)).toBe(true);
    const press = measure.manDepths.filter((r) => r.technique === "PRESS");
    const off = measure.manDepths.filter((r) => r.technique === "OFF");
    expect(press.length).toBeGreaterThan(0);
    expect(off.length).toBeGreaterThan(0);
    expect(press.every((r) => r.depth >= 1 && r.depth <= 2)).toBe(true);
    expect(off.every((r) => r.depth >= 5 && r.depth <= 8)).toBe(true);
  });

  it("shades a man defender away from his help (D5): outside with a safety in the middle, never outside with none", () => {
    const rows = (help: string, shade?: string) =>
      measure.leverage.filter((r) => r.help === help && (shade === undefined || r.shade === shade)).reduce((a, r) => a + r.men, 0);
    expect(rows("a safety in the deep middle", "outside")).toBe(rows("a safety in the deep middle"));
    expect(rows("nobody in the deep middle", "inside")).toBeGreaterThan(0);
    expect(rows("nobody in the deep middle", "outside")).toBe(0);
    expect(rows("bracketed with a backer", "outside")).toBe(rows("bracketed with a backer"));
  });

  it("maps every back and receiver to his formation's lane but the split backs (D2), as step 1 will list", () => {
    expect(measure.laneDifferences).toEqual(["GUN_SPLIT_BACKS_RT RB: LH to C", "GUN_SPLIT_BACKS_RT FB: RH to C"]);
  });

  it("finishes an early rotation before the snap and holds a late one to it", () => {
    const early = measure.looks.filter((r) => r.look.endsWith("(early)"));
    const late = measure.looks.filter((r) => r.look.endsWith("(late)"));
    expect(early.length).toBeGreaterThan(0);
    expect(early.every((r) => r.atSnapMax === 0)).toBe(true);
    expect(late.every((r) => r.atSnapMean === r.shownMean)).toBe(true);
  });

  it("writes the report with every range met and every chosen rule listed", () => {
    const text = renderSnapSpots(measure);
    for (const heading of ["## 1.", "## 2.", "## 3.", "## 4.", "## 5.", "## 6."]) expect(text).toContain(heading);
    expect(text).not.toContain("❌");
    expect(text.match(/✅ yes/g)?.length).toBe(6);
    for (const rule of CHOSEN_RULES) expect(text).toContain(rule);
  });
});
