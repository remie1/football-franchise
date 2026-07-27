import { describe, expect, it } from "vitest";
import {
  assertSeason,
  eligibilityOf,
  HELD_OUT_SEASONS,
  INGEST_SEASONS,
  isHeldOut,
  isSeason,
  parseSeasonSpec,
  TUNING_SEASONS,
} from "../src/ingest/seasons.js";

describe("season scope", () => {
  it("covers 2022-2025 (calibration.md §2)", () => {
    expect([...INGEST_SEASONS]).toEqual([2022, 2023, 2024, 2025]);
  });

  it("holds out 2025 and only 2025 (calibration.md §7)", () => {
    expect([...HELD_OUT_SEASONS]).toEqual([2025]);
    expect(TUNING_SEASONS).toEqual([2022, 2023, 2024]);
  });

  it("partitions every in-scope season into exactly one cohort", () => {
    for (const s of INGEST_SEASONS) {
      const heldOut = isHeldOut(s);
      expect(eligibilityOf(s)).toBe(heldOut ? "HELD_OUT" : "TUNING");
      expect(TUNING_SEASONS.includes(s)).toBe(!heldOut);
    }
    expect(TUNING_SEASONS.length + HELD_OUT_SEASONS.length).toBe(INGEST_SEASONS.length);
  });

  it("rejects out-of-scope seasons", () => {
    expect(isSeason(2021)).toBe(false);
    expect(() => assertSeason(2021)).toThrow(/out of ingestion scope/);
  });
});

describe("parseSeasonSpec", () => {
  it("parses a range", () => {
    expect(parseSeasonSpec("2022-2025")).toEqual([2022, 2023, 2024, 2025]);
  });

  it("parses a single season", () => {
    expect(parseSeasonSpec("2023")).toEqual([2023]);
  });

  it("parses a mixture, de-duplicated and sorted", () => {
    expect(parseSeasonSpec("2024,2022-2023,2024")).toEqual([2022, 2023, 2024]);
  });

  it("rejects an inverted range", () => {
    expect(() => parseSeasonSpec("2025-2022")).toThrow(/inverted/);
  });

  it("rejects out-of-scope seasons inside a range", () => {
    expect(() => parseSeasonSpec("2019-2023")).toThrow(/out of ingestion scope/);
  });

  it("rejects junk", () => {
    expect(() => parseSeasonSpec("last year")).toThrow(SyntaxError);
    expect(() => parseSeasonSpec("")).toThrow(SyntaxError);
  });
});
