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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KNOWN_TRUTH_SCENARIOS, scenarioById } from "../src/knownTruth/scenarios.js";
import { POCKET_STATUS_LADDER_SCENARIO } from "../src/knownTruth/pocketLadder.js";
import { gateFileName } from "./knownTruthGate.js";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * THE SECOND KNOWN-TRUTH FAMILY — property gates over ORDERED ENUMS (Charter §4.1), as opposed
 * to the five ladders over ATTRIBUTES that the rest of this file describes.
 *
 * They share the `knownTruth.<id>.test.ts` naming and the canonical-seed rule and they do NOT
 * share `gateFor`: an attribute ladder asserts that an outcome MOVES (monotone plus an effect
 * floor), while a property gate asserts that it does not move BACKWARDS (monotone, no floor at
 * all, because two rungs measuring the same thing is a legitimate result rather than a defect).
 * Each such scenario carries its own tolerance rule, in its own file, for that reason.
 *
 * They are listed here so the file guard below stays an EXACT match on the directory. Widening
 * it to a prefix, or naming the file so it fell outside the pattern, would have re-opened the
 * "a scenario can be added and never gated" hole in the other direction.
 */
const PROPERTY_GATE_IDS: readonly string[] = [POCKET_STATUS_LADDER_SCENARIO.id];

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
    for (const id of PROPERTY_GATE_IDS) {
      const file = gateFileName(id);
      expect(
        existsSync(join(here, file)),
        `property gate "${id}" has no gate file. Create test/${file} — a property gate nothing ` +
          `runs is a property gate that gates nothing, exactly as for the attribute ladders.`,
      ).toBe(true);
    }
    // `knownTruth.test.ts` is deliberately NOT matched: the pattern needs a non-empty id between
    // the prefix and the `.test.ts` suffix, and this file has none.
    const gateFiles = readdirSync(here).filter((f) => /^knownTruth\..+\.test\.ts$/.test(f));
    const expected = new Set([
      ...KNOWN_TRUTH_SCENARIOS.map((s) => gateFileName(s.id)),
      ...PROPERTY_GATE_IDS.map((id) => gateFileName(id)),
    ]);
    for (const file of gateFiles) {
      expect(
        expected.has(file),
        `test/${file} looks like a gate file but names no scenario in either known-truth registry`,
      ).toBe(true);
    }
    expect(gateFiles.length).toBe(KNOWN_TRUTH_SCENARIOS.length + PROPERTY_GATE_IDS.length);
  });

  it("keeps the gate on the canonical seeds — no gate file may re-draw a ladder", () => {
    /**
     * `runLadder` grew a `batchSeed` option so `ladderRerung.test.ts` can run the same ladder on
     * INDEPENDENT seed lists, which is the only way to measure a `recordedStepSE` (§22a). That
     * option must never reach the gate. A gate whose seeds can be re-drawn is a gate somebody
     * re-runs until it is green — the exact failure `assertions.ts`'s header argues the common-
     * random-numbers design against — and the difference between the two uses is one argument,
     * which is small enough to be added in passing and invisible in review.
     *
     * Checked at the SOURCE, because there is no runtime signal: a re-drawn ladder produces
     * numbers that look exactly like a ladder.
     */
    const gate = readFileSync(join(here, "knownTruthGate.ts"), "utf8");
    expect(
      gate.includes("batchSeed"),
      "test/knownTruthGate.ts mentions `batchSeed`. The gate must call runLadder(scenario) with " +
        "no options, so every CI run measures the same games. Replicates belong in " +
        "test/ladderRerung.test.ts.",
    ).toBe(false);
    for (const scenario of KNOWN_TRUTH_SCENARIOS) {
      const file = readFileSync(join(here, gateFileName(scenario.id)), "utf8");
      expect(
        file.includes(`gateFor("${scenario.id}")`),
        `test/${gateFileName(scenario.id)} must delegate to gateFor("${scenario.id}") rather ` +
          `than driving runLadder itself — one gate shape, one seed policy.`,
      ).toBe(true);
      expect(
        file.includes("runLadder"),
        `test/${gateFileName(scenario.id)} calls runLadder directly. Gate files exist to name a ` +
          `scenario; the running belongs in knownTruthGate.ts.`,
      ).toBe(false);
    }
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

  it("states a mechanism for every scenario, and declares its inert attributes against it", () => {
    // The CONTENT of these two fields is checked against the engine by
    // `attributeClaims.test.ts`, which has to run games to do it. This is the structural half —
    // it costs nothing and it catches the shapes that would make the expensive check meaningless.
    for (const s of KNOWN_TRUTH_SCENARIOS) {
      expect(
        s.mechanismCheckKinds.length,
        `"${s.id}" names no mechanism. Without one, "is this attribute read" has no answer and ` +
          `the attribute list goes back to being prose.`,
      ).toBeGreaterThan(0);
      for (const kind of s.mechanismCheckKinds) expect(kind.trim().length).toBeGreaterThan(0);
      expect(
        s.attributesNotReadByMechanism.length,
        `"${s.id}" declares every attribute it ladders as unread. A scenario whose mechanism ` +
          `reads none of its design measures nothing.`,
      ).toBeLessThan(s.attributes.length);
    }
  });

  it("pins every PROVISIONAL record to a re-measurement rather than to an adjective", () => {
    // §22d marks stale figures provisional. A bare flag would rot the same way the figures did,
    // so the field carries the ladder as re-measured and what invalidated it — enough for a
    // reader to see the size of the drift without running anything.
    for (const s of KNOWN_TRUTH_SCENARIOS) {
      if (s.provisional === undefined) continue;
      expect(
        s.provisional.measuredLadder,
        `"${s.id}" is provisional but its re-measured ladder has ` +
          `${s.provisional.measuredLadder.length} of ${s.rungs.length} rungs`,
      ).toHaveLength(s.rungs.length);
      expect(s.provisional.invalidatedBy.trim().length).toBeGreaterThan(0);
      expect(
        s.provisional.note.length,
        `"${s.id}" says it is provisional and does not say what that costs a reader`,
      ).toBeGreaterThan(40);
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
