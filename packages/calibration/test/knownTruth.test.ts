/**
 * THE SYNTHETIC KNOWN-TRUTH HARNESS, AS A CI GATE — the registry-level half.
 *
 * `calibration.md` §10.3 (report cadence, split): *"Synthetic known-truth harness runs on every
 * engine merge as a CI gate (fast breakage detection); the full baseline report runs as a
 * nightly batch."*
 *
 * The LADDERS live one per file, in `knownTruth.<scenario id>.test.ts`, so Vitest runs them in
 * parallel — `knownTruthGate.ts` explains why that split is what pays for their sample sizes.
 * This file holds what is true of the scenario SET rather than of any one ladder, and the most
 * important thing in it is the guard that every scenario in the registry actually has a file: a
 * per-file split trades "one loop cannot miss a scenario" for "a scenario can be added and never
 * gated", and that trade is only safe if something checks.
 *
 * **The gate asserts ordering, never realism.** Every Tier 1 metric is currently failing for
 * reasons `CALIBRATION-BACKLOG.md` already diagnoses; an absolute assertion would be red for
 * reasons that have nothing to do with the property under test. "A more accurate quarterback
 * completes more passes" holds under every open backlog entry, and the day it stops holding an
 * attribute has stopped mattering.
 *
 * Failures print the whole ladder and the batch seeds that produced it, because "monotonicity
 * failed" is not actionable and "0 → 0.3057, 20 → 0.3364, 40 → 0.3728, 95 → 0.4055" is.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KNOWN_TRUTH_SCENARIOS, scenarioById } from "../src/knownTruth/scenarios.js";
import { gateFileName } from "./knownTruthGate.js";

const here = dirname(fileURLToPath(import.meta.url));

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

  it("every scenario has a gate file, and every gate file has a scenario", () => {
    // The failure this exists for: someone adds a sixth scenario to the registry, every existing
    // test still passes, and the sixth is never run by anything. Under the old single-file
    // `describe.each` that was impossible; under the split it is one forgotten file away, so the
    // guard is not optional bookkeeping — it is the price of the split.
    for (const scenario of KNOWN_TRUTH_SCENARIOS) {
      const file = gateFileName(scenario.id);
      expect(
        existsSync(join(here, file)),
        `scenario "${scenario.id}" has no gate file. Create test/${file} containing ` +
          `\`gateFor("${scenario.id}")\` — a scenario nothing runs is a scenario that gates nothing.`,
      ).toBe(true);
    }
    // `knownTruth.test.ts` is deliberately NOT matched: the pattern needs a non-empty id between
    // the prefix and the `.test.ts` suffix, and this file has none.
    const gateFiles = readdirSync(here).filter((f) => /^knownTruth\..+\.test\.ts$/.test(f));
    const expected = new Set(KNOWN_TRUTH_SCENARIOS.map((s) => gateFileName(s.id)));
    for (const file of gateFiles) {
      expect(
        expected.has(file),
        `test/${file} looks like a gate file but names no scenario in the registry`,
      ).toBe(true);
    }
    expect(gateFiles.length).toBe(KNOWN_TRUTH_SCENARIOS.length);
  });

  // ===================== THE TOLERANCE RULE, AS AN ASSERTION =====================
  //
  // `scenarios.ts` states the rule a tolerance and a sample size are set by. These three tests
  // are that rule, checked. They cost nothing — they read recorded numbers rather than running
  // batches — and they exist because the failure mode they prevent is the one that produced this
  // whole change: a ladder went red, and the cheapest green was to widen the tolerance until it
  // could not fail. With these in place that edit does not typecheck as a small one. It has to
  // move a field labelled "measured", beside a hypothesis quoting the seed digest that measured
  // it, which is a falsification a reviewer can see.

  it("records one measured step, with an SE, for every step of every ladder", () => {
    for (const s of KNOWN_TRUTH_SCENARIOS) {
      const steps = s.rungs.length - 1;
      expect(s.recordedSteps, `"${s.id}" records ${s.recordedSteps.length} of ${steps} steps`)
        .toHaveLength(steps);
      expect(s.recordedStepSE, `"${s.id}" records ${s.recordedStepSE.length} of ${steps} SEs`)
        .toHaveLength(steps);
      for (const [i, step] of s.recordedSteps.entries()) {
        // A recorded step at or below zero is a ladder that measured an inversion and shipped
        // anyway. The gate would be asserting an ordering the scenario itself denies.
        expect(step, `"${s.id}" step ${i} was recorded as ${step}`).toBeGreaterThan(0);
        expect((s.recordedStepSE[i] ?? 0) > 0, `"${s.id}" step ${i} has no SE`).toBe(true);
      }
    }
  });

  it("keeps every tolerance under half the step it polices — the SIGNAL margin", () => {
    for (const s of KNOWN_TRUTH_SCENARIOS) {
      const smallest = Math.min(...s.recordedSteps);
      expect(
        s.monotonicityTolerance,
        `"${s.id}" tolerates a dip of ${s.monotonicityTolerance} on a ladder whose smallest ` +
          `MEASURED step is ${smallest}. A tolerance above half the step it polices cannot catch ` +
          `that step inverting, which is the only thing it is there to catch. Move the rungs to ` +
          `where the effect lives — never widen the tolerance.`,
      ).toBeLessThanOrEqual(smallest / 2);
    }
  });

  it("keeps every step at least four SE clear of its tolerance — the NOISE margin", () => {
    for (const s of KNOWN_TRUTH_SCENARIOS) {
      for (const [i, step] of s.recordedSteps.entries()) {
        const se = s.recordedStepSE[i] ?? Number.POSITIVE_INFINITY;
        const margin = (step + s.monotonicityTolerance) / se;
        expect(
          margin,
          `"${s.id}" step ${s.rungs[i]}→${s.rungs[i + 1]} sits ${margin.toFixed(1)}σ from its ` +
            `tolerance (step ${step}, SE ${se} at ${s.games} games). Under 4σ this gate flakes ` +
            `on a suite that runs on every push. Raise \`games\` — SE falls as 1/√games — or ` +
            `widen the rung spacing so the step itself is bigger.`,
        ).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("keeps every effect floor below the span the ladder actually measured", () => {
    for (const s of KNOWN_TRUTH_SCENARIOS) {
      const span = s.recordedSteps.reduce((a, b) => a + b, 0);
      // A floor is a REGRESSION floor: it must sit below what the engine does today, or it is
      // red on day one and ignored by day three. 80% leaves room for the sampling noise on the
      // span itself, which is roughly one step's SE.
      expect(
        s.minEffect,
        `"${s.id}" floors the effect at ${s.minEffect} against a measured span of ` +
          `${span.toFixed(4)}. A floor is a regression gate, not an aspiration.`,
      ).toBeLessThanOrEqual(span * 0.8);
    }
  });
});
