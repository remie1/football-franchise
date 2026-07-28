/**
 * RUNNING A KNOWN-TRUTH SCENARIO, AND THE TWO ASSERTIONS IT MAKES.
 *
 * Deterministic end to end: the batch seed for scenario `s` is `known-truth:{s}`, so a failure is
 * reproducible from the message it printed and re-running the suite twice produces identical
 * numbers. That matters more here than anywhere else in the package — this is the suite
 * `calibration.md` §10.3 puts on **every engine merge as a CI gate**, and a gate that flakes is a
 * gate somebody turns off.
 *
 * ================== EVERY RUNG RUNS ON THE SAME SEEDS ==================
 *
 * COMMON RANDOM NUMBERS, and it is the single most important line in this file.
 *
 * A play's dice are addressed by a hash of `(seed, gameId, playNumber, fork label)` — Spec #1 §8,
 * and `simulateGame`'s structural commitment 2. None of those four depends on a player's
 * ATTRIBUTES. So running rung 40 and rung 95 under the same seed list produces the same schedule,
 * the same play calls and the same raw rolls, and the ONLY difference between the two outcomes is
 * the modifier the attribute contributes. That is a paired comparison rather than two independent
 * samples, and it removes almost all of the variance a monotonicity test has to see through.
 *
 * This was measured rather than assumed, and the measurement is why the file says so this
 * loudly. With per-rung seeds, the coverage ladder read 0.4293 / 0.4068 / 0.3904 / 0.3851 under
 * one set of seeds and 0.3792 / 0.4132 / 0.3876 / 0.4212 under another at the same sample size —
 * clean monotonicity and a broken ladder from the same engine, decided by which games got played.
 * An unpaired design would have made this gate a coin flip, and a coin-flip gate is worse than no
 * gate because it teaches people to re-run it.
 */
import type { Position } from "@ff/contracts";
import type { StatLine } from "@ff/engine";
import { buildArchetypeLeague } from "../league/archetype.js";
import { syntheticTeamIds } from "../league/flat.js";
import { runBatch, type BatchResult } from "../harness/batch.js";
import { generateSeeds } from "../harness/seeds.js";
import type { SimAccumulator } from "../metrics/collect.js";
import { FROZEN_TENDENCIES } from "../caller/frozenTendencies.js";
import { FROZEN_FOURTH_DOWN } from "../caller/frozenTendencies.js";
import type { KnownTruthScenario } from "./scenarios.js";

export interface LadderRung {
  readonly value: number;
  readonly measured: number | null;
  readonly batchSeed: string;
  readonly seedDigest: string;
  readonly games: number;
}

export interface LadderResult {
  readonly scenario: KnownTruthScenario;
  readonly rungs: readonly LadderRung[];
  readonly monotone: boolean;
  readonly worstInversion: number;
  readonly effect: number | null;
  readonly effectPasses: boolean;
  readonly report: string;
}

function statlinesForTeam(accumulator: SimAccumulator, teamIndex: 0 | 1): readonly StatLine[] {
  const team = syntheticTeamIds(2)[teamIndex];
  if (team === undefined) throw new Error("known-truth scenarios use a two-team league");
  return Object.values(accumulator.player.statlines).filter((line) => line.team === team);
}

/** The batch seed a scenario's CANONICAL ladder runs on. The gate never uses any other. */
export function canonicalBatchSeed(scenario: KnownTruthScenario): string {
  return `known-truth:${scenario.id}`;
}

/**
 * The league one rung of a scenario is measured on. Exported so a REPLICATE run and the gate
 * build the identical league from the identical declaration — a probe that rebuilt the design by
 * hand would be measuring a different instrument from the one it reports on.
 */
export function ladderLeagueFor(
  scenario: KnownTruthScenario,
  value: number,
): ReturnType<typeof buildArchetypeLeague> {
  return buildArchetypeLeague({
    id: `${scenario.id}-${value}`,
    description: `${scenario.hypothesis} | ${scenario.attributes.join("+")} at ${value}`,
    base: scenario.baseRating ?? 60,
    teams: 2,
    designs: [
      {
        teamIndex: scenario.designedTeam,
        positions: scenario.positions as readonly Position[],
        attributes: Object.fromEntries(scenario.attributes.map((a) => [a, value])),
      },
    ],
  });
}

export interface RunLadderOptions {
  /**
   * A REPLICATE's batch seed, replacing `known-truth:{id}`.
   *
   * ============ THIS IS THE ONLY WAY TO PRODUCE A `recordedStepSE` ============
   *
   * `scenarios.ts` requires the step SE to be MEASURED across independent seed sets, and every
   * rung of one ladder deliberately shares one seed list (common random numbers, see the header),
   * so a single `runLadder` call cannot produce a spread of any kind — it produces one number per
   * step, exactly. A replicate is the same scenario on a DIFFERENT seed list; the spread of a
   * step across replicates is what `recordedStepSE` records.
   *
   * The gate itself must never pass this. A gate whose seeds could be re-drawn is a gate somebody
   * re-runs until it is green, which is the failure `assertions.ts`'s header exists to prevent —
   * so the default is `canonicalBatchSeed(scenario)` and `test/knownTruth.test.ts` asserts that
   * every gate file calls `runLadder` with the scenario alone.
   */
  readonly batchSeed?: string;
}

export async function runLadder(
  scenario: KnownTruthScenario,
  options: RunLadderOptions = {},
): Promise<LadderResult> {
  const teams = syntheticTeamIds(2);
  const home = teams[0];
  const away = teams[1];
  if (home === undefined || away === undefined) throw new Error("two teams required");

  // One seed list, shared by every rung. See the header: this is the whole variance-reduction
  // argument, and it is why the batch seed does not carry the rung's value.
  const batchSeed = options.batchSeed ?? canonicalBatchSeed(scenario);
  const seeds = generateSeeds(batchSeed, scenario.games);

  const rungs: LadderRung[] = [];
  for (const value of scenario.rungs) {
    const league = ladderLeagueFor(scenario, value);
    const result: BatchResult = await runBatch({
      league,
      schedule: { kind: "SYNTHETIC_PAIR", home, away, games: scenario.games, season: 2024 },
      seeds,
      playCalling: { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN },
    });
    rungs.push({
      value,
      measured: scenario.measurement.measure(
        statlinesForTeam(result.accumulator, scenario.measuredTeam),
        result.accumulator,
      ),
      batchSeed,
      seedDigest: result.seeds.digest,
      games: scenario.games,
    });
  }

  const sign = scenario.direction === "INCREASES" ? 1 : -1;
  let worstInversion = 0;
  for (let i = 1; i < rungs.length; i++) {
    const previous = rungs[i - 1];
    const current = rungs[i];
    if (previous?.measured == null || current?.measured == null) continue;
    const step = sign * (current.measured - previous.measured);
    if (step < 0) worstInversion = Math.min(worstInversion, step);
  }
  const monotone = Math.abs(worstInversion) <= scenario.monotonicityTolerance;

  const first = rungs[0]?.measured ?? null;
  const last = rungs[rungs.length - 1]?.measured ?? null;
  const effect = first === null || last === null ? null : sign * (last - first);
  const effectPasses = effect !== null && effect >= scenario.minEffect;

  return {
    scenario,
    rungs,
    monotone,
    worstInversion,
    effect,
    effectPasses,
    report: renderLadder(scenario, rungs, monotone, worstInversion, effect, effectPasses),
  };
}

export function renderLadder(
  scenario: KnownTruthScenario,
  rungs: readonly LadderRung[],
  monotone: boolean,
  worstInversion: number,
  effect: number | null,
  effectPasses: boolean,
): string {
  const ladder = rungs
    .map((r) => `${r.value} → ${r.measured === null ? "n/a" : r.measured.toFixed(4)}`)
    .join(", ");
  const provisional =
    scenario.provisional === undefined
      ? []
      : [
          `  ⚠ PROVISIONAL RECORD (§22d) — invalidated by ${scenario.provisional.invalidatedBy}. ` +
            `Every figure in the hypothesis below predates it. Ladder as re-measured: ` +
            `${scenario.provisional.measuredLadder.map((v) => v.toFixed(4)).join(" / ")}. ` +
            scenario.provisional.note,
        ];
  return [
    `known-truth "${scenario.id}"`,
    ...provisional,
    `  hypothesis: ${scenario.hypothesis}`,
    `  design: ${scenario.attributes.join("+")} on ${scenario.positions.join("/")} of team ` +
      `${scenario.designedTeam}, measuring ${scenario.measurement.label} on team ${scenario.measuredTeam}`,
    `  ladder (${scenario.direction}): ${ladder}`,
    `  monotone: ${monotone ? "yes" : `NO — worst step ${worstInversion.toFixed(4)} against a tolerance of ${scenario.monotonicityTolerance}`}`,
    `  effect: ${effect === null ? "n/a" : effect.toFixed(4)} against a floor of ${scenario.minEffect} — ${effectPasses ? "ok" : "BELOW FLOOR"}`,
    `  reproduce: batch seed "${rungs[0]?.batchSeed ?? "?"}", ${scenario.games} games, ` +
      `SHARED across every rung (common random numbers) — seed digest ${rungs[0]?.seedDigest ?? "?"}`,
  ].join("\n");
}

export interface KnownTruthFailure {
  readonly scenarioId: string;
  readonly kind: "MONOTONICITY" | "EFFECT_SIZE" | "NO_OBSERVATIONS";
  readonly report: string;
}

export function failuresOf(result: LadderResult): readonly KnownTruthFailure[] {
  const failures: KnownTruthFailure[] = [];
  if (result.rungs.some((r) => r.measured === null)) {
    failures.push({
      scenarioId: result.scenario.id,
      kind: "NO_OBSERVATIONS",
      report:
        `${result.report}\n  → a rung produced too few observations to measure. Raise ` +
        `\`games\` on the scenario, or the measurement's minimum-sample threshold is wrong.`,
    });
    return failures;
  }
  if (!result.monotone) {
    failures.push({
      scenarioId: result.scenario.id,
      kind: "MONOTONICITY",
      report:
        `${result.report}\n  → MONOTONICITY BROKEN. An attribute the design says should matter ` +
        `is inverted, saturated, or swamped by the die. Backlog entry 4 (Poise refunds 3 of a ` +
        `20-point penalty) and entry 5 (modifier stacks reach ~+42 on a d100) are the two ` +
        `standing suspects; check which of the ladder's attributes actually reaches the roll.`,
    });
  }
  if (!result.effectPasses) {
    failures.push({
      scenarioId: result.scenario.id,
      kind: "EFFECT_SIZE",
      report:
        `${result.report}\n  → EFFECT BELOW FLOOR. The ordering may hold and the magnitude does ` +
        `not. If this is new, the lever is the attribute-contribution ratio (the ÷5 divisor) ` +
        `rather than any target number — moving a target shifts the mean, not the amount of the ` +
        `outcome that is skill (backlog entry 5).`,
    });
  }
  return failures;
}
