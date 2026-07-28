/**
 * THE SYNTHETIC KNOWN-TRUTH HARNESS, AS A CI GATE.
 *
 * `calibration.md` §10.3 (report cadence, split): *"Synthetic known-truth harness runs on every
 * engine merge as a CI gate (fast breakage detection); the full baseline report runs as a
 * nightly batch."*
 *
 * This file is that gate. It is an ordinary Vitest suite in the package's default test run, so
 * `pnpm -r test` — the repository's own command — executes it, and it needs no separate
 * workflow, no build step and no cached data. `pnpm --filter @ff/calibration known-truth` runs
 * it alone when that is what a developer wants.
 *
 * **It asserts ordering, never realism.** Every Tier 1 metric is currently failing for reasons
 * `CALIBRATION-BACKLOG.md` already diagnoses; an absolute assertion would be red for reasons
 * that have nothing to do with the property under test. "A 95-accuracy quarterback completes
 * more passes than a 40-accuracy one" holds under every open backlog entry, and the day it stops
 * holding an attribute has stopped mattering.
 *
 * Failures print the whole ladder and the batch seeds that produced it, because "monotonicity
 * failed" is not actionable and "40 → 0.31, 60 → 0.35, 80 → 0.34, 95 → 0.38" is.
 */
import { describe, expect, it } from "vitest";
import { failuresOf, runLadder } from "../src/knownTruth/assertions.js";
import { KNOWN_TRUTH_SCENARIOS, scenarioById } from "../src/knownTruth/scenarios.js";

describe("known-truth scenarios", () => {
  it("has at least one scenario per major check family, and each states its hypothesis", () => {
    expect(KNOWN_TRUTH_SCENARIOS.length).toBeGreaterThanOrEqual(5);
    for (const scenario of KNOWN_TRUTH_SCENARIOS) {
      expect(scenario.hypothesis.length).toBeGreaterThan(40);
      expect(scenario.rungs.length).toBeGreaterThanOrEqual(3);
      expect([...scenario.rungs].sort((a, b) => a - b)).toEqual([...scenario.rungs]);
      expect(scenario.attributes.length).toBeGreaterThan(0);
      expect(scenario.minEffect).toBeGreaterThan(0);
    }
  });

  it("names the scenarios it does not have when asked for one", () => {
    expect(() => scenarioById("not-a-scenario")).toThrow(/have /);
  });
});

describe.each(KNOWN_TRUTH_SCENARIOS.map((s) => [s.id, s] as const))(
  "%s",
  (_id, scenario) => {
    it(
      "is monotone in the designed attribute and moves the outcome by at least the floor",
      async () => {
        const result = await runLadder(scenario);
        const failures = failuresOf(result);
        if (failures.length > 0) {
          throw new Error(failures.map((f) => f.report).join("\n\n"));
        }
        expect(result.monotone).toBe(true);
        expect(result.effectPasses).toBe(true);
      },
      600_000,
    );

    it("is reproducible — the same ladder twice produces the same numbers", async () => {
      const a = await runLadder({ ...scenario, games: 2 });
      const b = await runLadder({ ...scenario, games: 2 });
      expect(a.rungs.map((r) => r.measured)).toEqual(b.rungs.map((r) => r.measured));
      expect(a.rungs.map((r) => r.seedDigest)).toEqual(b.rungs.map((r) => r.seedDigest));
    }, 600_000);
  },
);
