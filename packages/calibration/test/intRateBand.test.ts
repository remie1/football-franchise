/**
 * Backlog entry 169 / `calibration.md` §10.1 amendment 1: `int_rate` is the one band widened, by
 * owner ruling, to ±25% relative. These pin the ruling's edges against the real 2.28% so the row
 * stays a live check: the accepted ~1.8% passes, a slide below ~1.7% fails.
 */
import { describe, expect, it } from "vitest";
import { getMetric } from "../src/metrics/registry.js";
import { rate } from "../src/metrics/types.js";
import { BandWidenedError, evaluateMetric, ratchetBand } from "../src/report/bands.js";
import "../src/metrics/index.js";

const REAL = rate(2_280, 100_000);

describe("int_rate band (owner ruling, amendment 1)", () => {
  const metric = getMetric("int_rate");

  it("is ±25% relative, with the widening recorded in its history", () => {
    expect(metric.toleranceBand.kind).toBe("RELATIVE");
    expect(metric.toleranceBand.width).toBe(0.25);
    expect(metric.toleranceBand.history).toHaveLength(1);
    expect(metric.toleranceBand.history[0]).toMatchObject({ from: 0.15, to: 0.25 });
  });

  it("passes the accepted ~1.8% and today's ~1.9%", () => {
    expect(evaluateMetric(metric, rate(1_800, 100_000), REAL).verdict).toMatch(/^PASS/);
    expect(evaluateMetric(metric, rate(1_920, 100_000), REAL).verdict).toMatch(/^PASS/);
  });

  it("fails again below ~1.7% and above ~2.85%", () => {
    expect(evaluateMetric(metric, rate(1_650, 100_000), REAL).verdict).toMatch(/^FAIL/);
    expect(evaluateMetric(metric, rate(2_900, 100_000), REAL).verdict).toMatch(/^FAIL/);
  });

  it("leaves the ratchet unable to widen it further", () => {
    expect(() => ratchetBand("int_rate", metric.toleranceBand, 0.3, "r", "x")).toThrow(BandWidenedError);
  });
});
