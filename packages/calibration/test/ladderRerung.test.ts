/**
 * RE-RUNGING A KNOWN-TRUTH LADDER, AND RE-DERIVING ITS STEP SE — the standing instrument.
 *
 *   FF_LADDER=1 FF_LADDER_SCENARIO=ol-passblock-sack-rate FF_LADDER_STAGE=usage     pnpm --filter @ff/calibration test ladderRerung
 *   FF_LADDER=1 FF_LADDER_SCENARIO=ol-passblock-sack-rate FF_LADDER_STAGE=curve     ...
 *   FF_LADDER=1 FF_LADDER_SCENARIO=ol-passblock-sack-rate FF_LADDER_STAGE=replicate ...
 *
 * ============================ WHY THIS IS A STANDING TOOL ============================
 *
 * `CALIBRATION-BACKLOG.md` §22d: *"every sensitivity figure measured before the re-runging is
 * PROVISIONAL"*. That is not a one-off condition — it recurs on every engine change that moves a
 * response curve, and ADR-028 is the second time it has. The first re-runging (accuracy,
 * coverage) was done with throwaway scripts, and the consequence was that when ADR-028 changed
 * §7.1's slope there was no instrument to re-measure with, only a table in a backlog entry.
 *
 * Three stages, in the order §22d requires them:
 *
 *  1. **`usage`** — WHICH ATTRIBUTES THE MECHANIC ACTUALLY READS, derived from the stream. Run
 *     first, because a ladder that sets an attribute the mechanic never consults is measuring a
 *     narrower thing than it claims, and that is invisible in the outcome numbers.
 *  2. **`curve`** — MAP BEFORE YOU CHOOSE RUNGS. A wide grid at full per-rung sample. Rungs
 *     chosen before the curve exists is exactly backlog entry 22's error, and §22d exists because
 *     it was made twice.
 *  3. **`replicate`** — the chosen ladder under K INDEPENDENT batch seeds. §22a: one run cannot
 *     produce an SE. Every rung of one ladder shares one seed list on purpose (common random
 *     numbers), so a single run yields exactly one number per step and no spread whatsoever.
 *
 * ============================ WHAT IT MAY AND MAY NOT DO ============================
 *
 * ⛔ **No tunable is patched anywhere in this file.** It runs `DEFAULT_TUNABLES` exclusively.
 * Re-recording a ladder measures the engine as committed; a re-record taken under a patch would
 * be a record of something nobody ships.
 *
 * ⛔ **It never reduces `n`** (§22c). Every stage runs at the scenario's own `games` unless
 * `FF_LADDER_GAMES` is raised, and the replicate stage refuses a value below the scenario's.
 *
 * ⛔ **It exports nothing and registers no metric** — same rule as `pressureSweep.test.ts` and
 * `attribution.test.ts`, for the reason in `metrics/absence.ts`: a one-off measurement that
 * becomes a registered metric is a metric library that grows by accident.
 */
import { describe, expect, it } from "vitest";
import {
  canonicalBatchSeed,
  runLadder,
  type LadderResult,
} from "../src/knownTruth/assertions.js";
import {
  deriveAttributeUsage,
  mechanismVerdicts,
  renderAttributeUsage,
} from "../src/knownTruth/attributeUsage.js";
import { KNOWN_TRUTH_SCENARIOS, scenarioById } from "../src/knownTruth/scenarios.js";

const enabled = process.env["FF_LADDER"] === "1";
const STAGE = process.env["FF_LADDER_STAGE"] ?? "usage";
const SCENARIO = process.env["FF_LADDER_SCENARIO"] ?? "";
const REPLICATES = Number(process.env["FF_LADDER_SEEDS"] ?? "6");

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

/** The scenarios this invocation addresses: one named, or all of them. */
function selected(): readonly ReturnType<typeof scenarioById>[] {
  return SCENARIO === "" ? KNOWN_TRUTH_SCENARIOS : [scenarioById(SCENARIO)];
}

/**
 * `FF_LADDER_ATTRS` overrides the attribute LIST, and it is not a convenience.
 *
 * It is how the question "does dropping an attribute the mechanism never reads change what this
 * ladder measures?" gets answered by measurement rather than by argument. An inert attribute is
 * inert in the MECHANISM; it can still be read elsewhere — `sustain` is read by
 * `second_level_climb`, so setting it on the rung moves the RUN game, which moves down-and-distance
 * and therefore the pass mix a sack rate is computed over. Whether that is a large effect or a
 * rounding error is a fact about the engine, and this switch is how it is obtained.
 */
function overrides(scenario: ReturnType<typeof scenarioById>): {
  rungs: readonly number[];
  games: number;
  attributes: readonly string[];
} {
  const raw = process.env["FF_LADDER_RUNGS"];
  const rungs =
    raw === undefined || raw.trim() === ""
      ? scenario.rungs
      : raw.split(",").map((s) => Number(s.trim()));
  const games = Number(process.env["FF_LADDER_GAMES"] ?? String(scenario.games));
  const rawAttrs = process.env["FF_LADDER_ATTRS"];
  const attributes =
    rawAttrs === undefined || rawAttrs.trim() === ""
      ? scenario.attributes
      : rawAttrs.split(",").map((s) => s.trim());
  return { rungs, games, attributes };
}

function sd(values: readonly number[]): number {
  if (values.length < 2) return Number.NaN;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const ss = values.reduce((a, b) => a + (b - mean) * (b - mean), 0);
  return Math.sqrt(ss / (values.length - 1));
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : values.reduce((a, b) => a + b, 0) / values.length;
}

/** Steps of one ladder, in `direction`'s sign — the same convention `recordedSteps` uses. */
function stepsOf(result: LadderResult): readonly number[] {
  const sign = result.scenario.direction === "INCREASES" ? 1 : -1;
  const steps: number[] = [];
  for (let i = 1; i < result.rungs.length; i++) {
    const a = result.rungs[i - 1]?.measured;
    const b = result.rungs[i]?.measured;
    steps.push(a == null || b == null ? Number.NaN : sign * (b - a));
  }
  return steps;
}

describe.skipIf(!enabled)("known-truth ladder re-runging", () => {
  /**
   * STAGE 1 — the derived attribute claim, printed raw.
   *
   * Prints the FULL `readBy` table and not only the mechanism verdict, because choosing
   * `mechanismCheckKinds` correctly needs to see what else exists. A scenario whose attribute is
   * read only by a check kind nobody would call its mechanism is a finding about the SCENARIO.
   */
  it.skipIf(STAGE !== "usage")(
    "usage — which attributes each scenario's mechanic actually reads, from the stream",
    () => {
      const games = Number(process.env["FF_LADDER_USAGE_GAMES"] ?? "12");
      for (const scenario of selected()) {
        const usage = deriveAttributeUsage(scenario, games);
        say("");
        say(`=== ${scenario.id} — ${games} games at rung ${scenario.rungs[scenario.rungs.length - 1]}`);
        say(`declared mechanism: ${scenario.mechanismCheckKinds.join(", ")}`);
        for (const line of renderAttributeUsage(scenario, usage)) say(line);
        say("");
        say("EVERY attribute read anywhere in these games, with the check kinds that read it:");
        for (const [attr, kinds] of [...usage.readBy].sort((a, b) => a[0].localeCompare(b[0]))) {
          say(`  ${attr.padEnd(18)} ${kinds.join(", ")}`);
        }
        const inert = mechanismVerdicts(scenario, usage).filter((v) => v.inert);
        say("");
        say(
          inert.length === 0
            ? "VERDICT: every laddered attribute is read by the declared mechanism."
            : `VERDICT: INERT IN THIS MECHANISM — ${inert.map((v) => v.attribute).join(", ")}`,
        );
        expect(usage.checksObserved).toBeGreaterThan(0);
      }
    },
    30 * 60_000,
  );

  /**
   * STAGE 2 — the response curve. §22d's map-before-you-choose.
   *
   * Runs at the scenario's own per-rung sample by default rather than a cheap one, because entry
   * 22's wrong numbers came from a curve mapped at 40 games and believed.
   */
  it.skipIf(STAGE !== "curve")(
    "curve — maps the outcome against the attribute across the whole scale",
    async () => {
      for (const scenario of selected()) {
        const { rungs, games, attributes } = overrides(scenario);
        const result = await runLadder({ ...scenario, rungs, games, attributes });
        say("");
        say(`=== ${scenario.id} RESPONSE CURVE — ${games} games a rung, seed "${canonicalBatchSeed(scenario)}"`);
        say(`attributes laddered: ${attributes.join("+")}`);
        say(`measuring ${scenario.measurement.label} (${scenario.direction}) on team ${scenario.measuredTeam}`);
        say(`seed digest ${result.rungs[0]?.seedDigest ?? "?"}`);
        say("");
        say("| rung | measured | step from previous | per rating point |");
        say("|---|---|---|---|");
        for (const [i, rung] of result.rungs.entries()) {
          const previous = result.rungs[i - 1];
          const sign = scenario.direction === "INCREASES" ? 1 : -1;
          const step =
            previous === undefined || previous.measured === null || rung.measured === null
              ? null
              : sign * (rung.measured - previous.measured);
          const span = previous === undefined ? 0 : rung.value - previous.value;
          say(
            `| ${rung.value} | ${rung.measured === null ? "n/a" : rung.measured.toFixed(4)} | ` +
              `${step === null ? "—" : step.toFixed(4)} | ` +
              `${step === null || span === 0 ? "—" : (step / span).toFixed(5)} |`,
          );
        }
        expect(result.rungs.length).toBe(rungs.length);
      }
    },
    6 * 60 * 60_000,
  );

  /**
   * STAGE 3 — K independent seed sets. THE ONLY THING THAT CAN PRODUCE A `recordedStepSE`.
   *
   * ================ WHAT THE RECORDED NUMBER IS, AND WHY IT IS THE SD ================
   *
   * `recordedStepSE` is the spread of ONE ladder's step, not the standard error of the mean of K
   * of them. The gate runs one ladder on one fixed seed list; what threatens it is a single
   * draw's step landing below `−monotonicityTolerance`. Dividing by √K would describe the
   * precision of this measurement rather than the variability of the thing being gated, and would
   * shrink the recorded number every time somebody ran more replicates — a noise margin that
   * improves because you measured it harder is not a noise margin.
   *
   * Both are printed. The SD is the one to record.
   *
   * K ≥ 6 by default because three proved optimistic once already: `db-coverage`'s second step
   * read 0.028 over three seeds and 0.091 over six. An SD from three samples is itself a
   * high-variance estimate, and it errs cheap.
   */
  it.skipIf(STAGE !== "replicate")(
    "replicate — the chosen ladder under K independent batch seeds, for the step SE",
    async () => {
      for (const scenario of selected()) {
        const { rungs, games, attributes } = overrides(scenario);
        if (games < scenario.games) {
          throw new Error(
            `§22c: refusing to replicate "${scenario.id}" at ${games} games when the scenario ` +
              `runs ${scenario.games}. Never buy wall clock by reducing n.`,
          );
        }
        const spec = { ...scenario, rungs, games, attributes };

        // Replicate 0 IS the canonical seed list — the ladder the gate actually runs — so the
        // recorded ladder values and the spread come from one measurement rather than two.
        const seeds = [
          canonicalBatchSeed(scenario),
          ...Array.from({ length: REPLICATES - 1 }, (_, i) => `${canonicalBatchSeed(scenario)}/replicate-${i + 1}`),
        ];

        const ladders: LadderResult[] = [];
        for (const batchSeed of seeds) ladders.push(await runLadder(spec, { batchSeed }));

        say("");
        say(`=== ${scenario.id} REPLICATES — rungs ${rungs.join("/")}, ${games} games a rung, ${seeds.length} independent seed sets`);
        say(`attributes laddered: ${attributes.join("+")}`);
        say("");
        say(`| batch seed | seed digest | ${rungs.map((r) => `rung ${r}`).join(" | ")} |`);
        say(`|---|---|${rungs.map(() => "---").join("|")}|`);
        for (const [i, ladder] of ladders.entries()) {
          say(
            `| \`${seeds[i]}\` | \`${ladder.rungs[0]?.seedDigest ?? "?"}\` | ` +
              ladder.rungs.map((r) => (r.measured === null ? "n/a" : r.measured.toFixed(4))).join(" | ") +
              " |",
          );
        }

        const perStep: number[][] = rungs.slice(1).map(() => []);
        for (const ladder of ladders) {
          for (const [i, step] of stepsOf(ladder).entries()) perStep[i]?.push(step);
        }

        say("");
        say("| step | canonical | mean across seeds | SD (RECORD THIS) | SEM (sd/√K) | min | max |");
        say("|---|---|---|---|---|---|---|");
        const canonical = stepsOf(ladders[0] as LadderResult);
        for (const [i, values] of perStep.entries()) {
          const s = sd(values);
          say(
            `| ${rungs[i]}→${rungs[i + 1]} | ${(canonical[i] ?? Number.NaN).toFixed(4)} | ` +
              `${mean(values).toFixed(4)} | ${s.toFixed(4)} | ${(s / Math.sqrt(values.length)).toFixed(4)} | ` +
              `${Math.min(...values).toFixed(4)} | ${Math.max(...values).toFixed(4)} |`,
          );
        }

        say("");
        say("Margins the recorded numbers would produce (knownTruth.test.ts's two halves):");
        const smallest = Math.min(...perStep.map((v) => mean(v)));
        for (const [i, values] of perStep.entries()) {
          const s = sd(values);
          const m = mean(values);
          say(
            `  ${rungs[i]}→${rungs[i + 1]}: step ${m.toFixed(4)} ± ${s.toFixed(4)} — ` +
              `noise margin at tolerance ${scenario.monotonicityTolerance}: ` +
              `${((m + scenario.monotonicityTolerance) / s).toFixed(1)}σ (need ≥ 4)`,
          );
        }
        say(
          `  SIGNAL margin: smallest mean step ${smallest.toFixed(4)}, so the tolerance must be ` +
            `≤ ${(smallest / 2).toFixed(4)} (currently ${scenario.monotonicityTolerance})`,
        );
        const spans = ladders.map((l) => stepsOf(l).reduce((a, b) => a + b, 0));
        say(
          `  SPAN across the ladder: mean ${mean(spans).toFixed(4)} ± ${sd(spans).toFixed(4)}, ` +
            `canonical ${(spans[0] ?? Number.NaN).toFixed(4)}, floor ${scenario.minEffect} ` +
            `(knownTruth.test.ts requires floor ≤ 0.8 × recorded span)`,
        );

        expect(ladders.length).toBe(seeds.length);
      }
    },
    12 * 60 * 60_000,
  );
});
