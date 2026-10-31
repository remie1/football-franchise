/**
 * ADR-090 step 1's report (`pnpm --filter @ff/calibration snap-spots -- --step 1`), on the first
 * two golden games of each league: every play carries a whole picture, each game is its pinned
 * game once the picture is taken off, and the cell check reads the engine's own rule. The full run
 * (100 games) writes `reports/adr-090-step1.md`; the golden suites check all 50 a league.
 */
import { describe, expect, it } from "vitest";
import { CELL_JOBS } from "../src/snapSpots/cells.js";
import { renderStep1 } from "../src/snapSpots/renderStep1.js";
import { measureStep1, STEP1_CALLER } from "../src/snapSpots/step1.js";
import { readGoldenFixture } from "./goldenDigestsShared.js";

const FIRST = 2;
const measure = measureStep1({ first: FIRST });
const cells = measure.cells;

describe("ADR-090 step 1: the snap-picture report", () => {
  it("puts a whole picture on every play, passes and runs", () => {
    expect(cells.games).toBe(2 * FIRST);
    expect(cells.passPlays).toBeGreaterThan(0);
    expect(cells.runPlays).toBeGreaterThan(0);
    expect(cells.passPlays + cells.runPlays).toBe(cells.plays);
    expect(cells.pictures).toBe(cells.plays);
    expect(cells.broken).toEqual([]);
  });

  it("plays the pinned games once the picture is taken off, canonical and byte", () => {
    const fixture = readGoldenFixture();
    for (const league of measure.leagues) {
      const pinned = fixture?.leagues[league.league]?.[STEP1_CALLER];
      expect(pinned, "test/fixtures/adr089-golden.json").toBeDefined();
      expect(league.games).toBe(FIRST);
      expect(league.canonical).toEqual(pinned!.canonical.slice(0, FIRST));
      expect(league.bytes).toEqual(pinned!.bytes.slice(0, FIRST));
      // A part of a league folds to no pin; the report says so instead of comparing.
      expect(league.pinned).toBeUndefined();
    }
  });

  it("reads the engine's rule: the quarterback stands in the backfield square, every rusher starts past the line", () => {
    expect(cells.byJob.PASSER.men).toBe(cells.passPlays);
    expect(cells.byJob.PASSER.sameCell).toBe(cells.byJob.PASSER.men);
    expect(cells.byJob.RUSH.men).toBeGreaterThan(0);
    expect(cells.byJob.RUSH.sameBand).toBe(0);
    expect(cells.routesWithNoBreakCell).toBe(0);
  });

  it("lists every man whose square differs, each once", () => {
    for (const job of CELL_JOBS) {
      const row = cells.byJob[job];
      const listed = cells.differences.filter((d) => d.job === job).reduce((a, d) => a + d.men, 0);
      expect(row.sameCell + listed, job).toBe(row.men);
      expect(row.sameCell).toBeLessThanOrEqual(Math.min(row.sameLane, row.sameBand));
    }
  });

  it("writes the report with every section and nothing failed", () => {
    const text = renderStep1(measure);
    for (const heading of ["## 1.", "## 2.", "## 3.", "### Why they differ", "### Every difference"]) expect(text).toContain(heading);
    expect(text).not.toContain("❌");
    expect(text).toContain("a part of the league");
  });
});
