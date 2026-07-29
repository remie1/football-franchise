/**
 * RE-DERIVING THE POCKET-STATUS LADDER'S STEP SDs — the standing instrument behind its record.
 *
 *   FF_POCKET_LADDER=1 FF_POCKET_LADDER_SEEDS=8 npx vitest run test/pocketLadderRerung.test.ts
 *   FF_POCKET_LADDER=1 FF_POCKET_LADDER_SEEDS=8 FF_POCKET_LADDER_PROBE=RUSHER_GAINING ...
 *   FF_POCKET_LADDER_DEFECT=1 FF_POCKET_LADDER_SEEDS=8 ...   ← re-measures `sensitivityTarget`
 *   FF_POCKET_LADDER_REACH=1  FF_POCKET_LADDER_SEEDS=3 ...   ← re-measures the probe's REACH
 *
 * `ladderRerung.test.ts` does this for the five ATTRIBUTE ladders and states why it has to be a
 * standing tool rather than a throwaway script: §22d makes every figure measured before an engine
 * change PROVISIONAL, and the first re-runging was done with scripts nobody could re-run. The
 * pocket-status ladder's `recordedSteps` / `recordedStepSD` / `sensitivityTarget` are exactly
 * such figures, and the engine change that would invalidate them was already scheduled when this
 * file was written — the owner had ruled that `SACK` leaves the severity ladder.
 *
 * ============================ IT LANDED (ADR-033), AND THIS IS WHAT WAS DONE ============================
 *
 * The procedure below was not optional and was followed in order. It is left in the imperative
 * because the NEXT engine change to this ladder runs it again.
 *
 *  1. **Re-run at ≥8 seed lists.** Every step's SD moves when the ladder loses a rung. Done: the
 *     `rerung` arm, 8 lists × 160 games × 4 rungs, and the SD reported is the SD of ONE ladder's
 *     step across the lists — never the SEM of eight, because the gate runs one ladder and what
 *     threatens it is a single draw. §22c: `n` went UP (the probe widened), never down.
 *  2. **`sensitivityTarget` may NOT simply be deleted along with the rung it was measured on.** A
 *     tolerance with no defect behind it is unfalsifiable. Done, and NOT by the route ADR-033 §7.1
 *     suggested: the `readCapacityDelta.SACK` orphan it proposed as the replacement sizer was
 *     itself removed by ADR-033, so there is nothing left to re-introduce — and even when it
 *     existed it sized nothing behavioural, being a table row read only on ticks carrying a status
 *     that no longer exists. The replacement is `SIZING_DEFECT`, this file's `defect` arm: the
 *     same defect CLASS as the retired red (an upward-closure hole at the top of
 *     `pocket.forcesDecision`) injected at the ladder's new top. The retired red is kept in full
 *     as each measure's `retiredRed`, with the probe, the `n` and what removed it.
 *  3. **Both margin rules are re-checked.** They are asserted in
 *     `knownTruth.pocket-status-ladder.test.ts` and they read the recorded fields, so a re-record
 *     that breaks a rule reddens the free half of the gate immediately.
 *  4. **The probe's REACH is re-derived, never assumed.** ADR-033 re-shaped `passRush.bands`, so
 *     the probe's stated reach was about a different set of bands from the one it names. The
 *     `reach` arm measures it; nothing in this package infers it.
 *
 * ============================ WHAT IT MAY AND MAY NOT DO ============================
 *
 * ⛔ It measures the SAME instrument the gate runs — `runPocketLadder` with a replaced batch seed
 *    — and never a hand-rebuilt copy of it. A replicate that rebuilt the walk would be sizing the
 *    noise of a different experiment from the one being gated. The `defect` arm obeys this too:
 *    it passes `base`, which `runPocketLadder` patches the rungs on top of, so the walk itself is
 *    untouched.
 * ⛔ It never reduces `games` below the scenario's own (§22c).
 * ⛔ It patches nothing except the rung itself and, in the `defect` arm, the one named leaf in
 *    `SIZING_DEFECT`. Both are `applyTunablePatch`, in memory, dead with the process.
 * ⛔ It exports nothing and registers no metric.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { buildFlatLeague, syntheticTeamIds } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  POCKET_STATUS_LADDER_SCENARIO,
  SIZING_DEFECT,
  canonicalPocketLadderSeed,
  pocketStatusLadder,
  runPocketLadder,
  rusherAheadBands,
  signedSteps,
  tunablesWithSizingDefect,
  type PocketLadderScenario,
} from "../src/knownTruth/pocketLadder.js";

const enabled = process.env["FF_POCKET_LADDER"] === "1";
const defectEnabled = process.env["FF_POCKET_LADDER_DEFECT"] === "1";
const reachEnabled = process.env["FF_POCKET_LADDER_REACH"] === "1";
const REPLICATES = Number(process.env["FF_POCKET_LADDER_SEEDS"] ?? "8");
const GAMES = Number(process.env["FF_POCKET_LADDER_GAMES"] ?? "0");
/** Comma-separated band list, so the one-band probe ADR-032 used stays measurable. */
const PROBE = process.env["FF_POCKET_LADDER_PROBE"] ?? "";

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? Number.NaN : values.reduce((a, b) => a + b, 0) / values.length;
}

function sd(values: readonly number[]): number {
  if (values.length < 2) return Number.NaN;
  const m = mean(values);
  return Math.sqrt(values.reduce((a, b) => a + (b - m) * (b - m), 0) / (values.length - 1));
}

/**
 * Set 0 is the gate's own canonical list, so one arm of every replicate is directly comparable
 * to what CI measures. Sets 1..K-1 are independent.
 */
function batchSeedFor(scenario: PocketLadderScenario, set: number): string {
  const canonical = canonicalPocketLadderSeed(scenario);
  return set === 0 ? canonical : `${canonical}/set-${set}`;
}

describe.skipIf(!enabled)("pocket-status ladder — replicate", () => {
  it(
    "re-derives every step's mean and SD across independent seed lists",
    async () => {
      const base = POCKET_STATUS_LADDER_SCENARIO;
      const games = GAMES > 0 ? GAMES : base.games;
      expect(
        games,
        `§22c: a replicate may not measure below the scenario's own ${base.games} games`,
      ).toBeGreaterThanOrEqual(base.games);
      const scenario: PocketLadderScenario =
        PROBE === "" ? base : { ...base, probeBands: PROBE.split(",").map((s) => s.trim()) };

      const ladder = pocketStatusLadder();
      say("");
      say("=======================================================================");
      say(`pocket-status ladder REPLICATE — ${REPLICATES} seed lists × ${games} games a rung`);
      say(`probe: pocket.minimumStatusByBand.{${scenario.probeBands.join(",")}}`);
      say(`rungs: ${ladder.join(" → ")}`);
      say("=======================================================================");

      // axis id → step index → one value per seed list
      const collected = new Map<string, number[][]>();
      for (const m of scenario.measures) {
        collected.set(m.id, ladder.slice(1).map(() => []));
      }

      for (let set = 0; set < REPLICATES; set++) {
        const result = await runPocketLadder(scenario, {
          batchSeed: batchSeedFor(scenario, set),
          games,
        });
        for (const axis of result.axes) {
          const values = result.rungs.map((r) => r.measured[axis.measure.id] ?? null);
          const steps = signedSteps(axis.measure, values);
          const into = collected.get(axis.measure.id);
          if (into === undefined) continue;
          for (const [i, step] of steps.entries()) {
            if (step !== null) into[i]?.push(step);
          }
        }
        say(
          `##POCKETLADDER##${JSON.stringify({
            set,
            batchSeed: batchSeedFor(scenario, set),
            seedDigest: result.rungs[0]?.seedDigest,
            games,
            probe: scenario.probeBands,
            rungs: result.rungs.map((r) => ({
              status: r.status,
              measured: r.measured,
              diagnostics: r.diagnostics,
              tunablesDigest: r.tunablesDigest,
            })),
          })}`,
        );
      }

      say("");
      for (const m of scenario.measures) {
        const perStep = collected.get(m.id) ?? [];
        say(`--- ${m.id} (tolerance ${m.tolerance}, target ${m.sensitivityTarget}) ---`);
        for (const [i, values] of perStep.entries()) {
          const mu = mean(values);
          const s = sd(values);
          const margin = mu < -m.tolerance ? "INVERSION" : `${((mu + m.tolerance) / s).toFixed(1)}σ`;
          say(
            `  ${ladder[i]}→${ladder[i + 1]}: mean ${mu.toFixed(5)} sd ${s.toFixed(5)} ` +
              `noise-margin ${margin}  [${values.map((v) => v.toFixed(5)).join(", ")}]`,
          );
        }
        say(
          `  RECORDED in scenarios: steps [${m.recordedSteps.join(", ")}] ` +
            `SD [${m.recordedStepSD.join(", ")}]`,
        );
      }
      say("");
      say(
        "Copy the measured means and SDs into URGENCY_MEASURES, then re-run the gate's " +
          "tolerance-rule tests. They read the recorded fields, so a record that breaks either " +
          "margin reddens immediately and for free.",
      );
    },
    7_200_000,
  );
});

// ===========================================================================
// THE SIZING DEFECT — what `sensitivityTarget` is measured on
// ===========================================================================

describe.skipIf(!defectEnabled)("pocket-status ladder — the sizing defect", () => {
  it(
    "measures the inversion the gate is required to catch, across independent seed lists",
    async () => {
      const scenario = POCKET_STATUS_LADDER_SCENARIO;
      const games = GAMES > 0 ? GAMES : scenario.games;
      expect(
        games,
        `§22c: the sizing measurement may not run below the gate's own ${scenario.games} games — ` +
          "a target measured at a smaller n is a target for a different gate",
      ).toBeGreaterThanOrEqual(scenario.games);

      // Applied here, once, so a stale patch throws BEFORE 5,000 games are spent.
      const base = tunablesWithSizingDefect();
      const ladder = pocketStatusLadder();
      say("");
      say("=======================================================================");
      say(`pocket-status ladder SIZING DEFECT — ${REPLICATES} seed lists × ${games} games a rung`);
      say(`defect: ${SIZING_DEFECT.label}`);
      for (const p of SIZING_DEFECT.patches) {
        say(`  ${p.tunableId}: "${p.currentValue}" → "${p.proposedValue}"`);
      }
      say(`probe: pocket.minimumStatusByBand.{${scenario.probeBands.join(",")}}`);
      say(`rungs: ${ladder.join(" → ")}`);
      say("");
      say("This is the walk the gate runs, on a base with ONE named leaf patched. The number it");
      say("produces is `sensitivityTarget`: the size of a real inversion the tolerance must be");
      say("able to see. It is not a step the healthy ladder produces and must never be confused");
      say("with one — the healthy steps come from the `rerung` arm above.");
      say("=======================================================================");

      const collected = new Map<string, number[][]>();
      for (const m of scenario.measures) {
        collected.set(m.id, ladder.slice(1).map(() => []));
      }

      for (let set = 0; set < REPLICATES; set++) {
        const result = await runPocketLadder(scenario, {
          batchSeed: batchSeedFor(scenario, set),
          games,
          base,
        });
        for (const axis of result.axes) {
          const values = result.rungs.map((r) => r.measured[axis.measure.id] ?? null);
          const steps = signedSteps(axis.measure, values);
          const into = collected.get(axis.measure.id);
          if (into === undefined) continue;
          for (const [i, step] of steps.entries()) {
            if (step !== null) into[i]?.push(step);
          }
        }
        say(
          `##POCKETDEFECT##${JSON.stringify({
            set,
            batchSeed: batchSeedFor(scenario, set),
            seedDigest: result.rungs[0]?.seedDigest,
            games,
            defect: SIZING_DEFECT.patches.map((p) => p.tunableId),
            rungs: result.rungs.map((r) => ({
              status: r.status,
              measured: r.measured,
              tunablesDigest: r.tunablesDigest,
            })),
          })}`,
        );
      }

      say("");
      for (const m of scenario.measures) {
        const perStep = collected.get(m.id) ?? [];
        say(`--- ${m.id} (recorded target ${m.sensitivityTarget}) ---`);
        for (const [i, values] of perStep.entries()) {
          const mu = mean(values);
          const s = sd(values);
          const negatives = values.filter((v) => v < 0).length;
          say(
            `  ${ladder[i]}→${ladder[i + 1]}: mean ${mu.toFixed(5)} sd ${s.toFixed(5)} ` +
              `(${negatives}/${values.length} lists negative)  ` +
              `[${values.map((v) => v.toFixed(5)).join(", ")}]`,
          );
        }
      }
      say("");
      say("The `sensitivityTarget` of each axis is |mean| of its MOST NEGATIVE step above. The");
      say("signal margin then requires tolerance ≤ half of it, and the noise margin requires");
      say("tolerance ≥ 4 × the HEALTHY step SDs from the `rerung` arm. If the two conflict, raise");
      say("`games` or widen the probe's reach — never the tolerance, never a smaller n (§22c).");
    },
    7_200_000,
  );
});

// ===========================================================================
// THE PROBE'S REACH — measured, because it sizes every argument above
// ===========================================================================

interface ReachCounts {
  dropbacks: number;
  reps: number;
  /** Reps by band. */
  readonly repsByBand: Map<string, number>;
  /** Dropbacks carrying at least one rep of the band. */
  readonly dropbacksWithBand: Map<string, number>;
  /** Dropbacks carrying at least one rep of ANY probe band. */
  dropbacksInProbe: number;
}

function countReach(
  counts: ReachCounts,
  events: readonly MatchEventEnvelope[],
  probe: ReadonlySet<string>,
): void {
  let isPass = false;
  let currentPlayId: string | null = null;
  let bands = new Set<string>();

  const flush = (): void => {
    if (!isPass) return;
    counts.dropbacks += 1;
    let inProbe = false;
    for (const band of bands) {
      counts.dropbacksWithBand.set(band, (counts.dropbacksWithBand.get(band) ?? 0) + 1);
      if (probe.has(band)) inProbe = true;
    }
    if (inProbe) counts.dropbacksInProbe += 1;
  };

  for (const envelope of events) {
    const event = envelope.event;
    const playId = event.playId === undefined ? null : String(event.playId);
    if (playId !== null && playId !== currentPlayId) {
      flush();
      currentPlayId = playId;
      isPass = false;
      bands = new Set<string>();
    }
    if (event.type === "PLAY_START") {
      // `payload` is `unknown` in contracts; read structurally, as `metrics/collect.ts` does.
      const payload: unknown = event.payload;
      isPass =
        typeof payload === "object" &&
        payload !== null &&
        (payload as Record<string, unknown>)["kind"] === "PASS_PLAY_V1";
      bands = new Set<string>();
    } else if (event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick") {
      const band = event.payload.band;
      if (band !== undefined) {
        bands.add(band);
        counts.reps += 1;
        counts.repsByBand.set(band, (counts.repsByBand.get(band) ?? 0) + 1);
      }
    }
  }
  flush();
}

describe.skipIf(!reachEnabled)("pocket-status ladder — the probe's reach", () => {
  it(
    "measures what share of dropbacks the probe bands touch, at DEFAULT_TUNABLES",
    () => {
      const scenario = POCKET_STATUS_LADDER_SCENARIO;
      const games = GAMES > 0 ? GAMES : scenario.games;
      const probe = new Set(scenario.probeBands);
      const teams = syntheticTeamIds(2);
      const home = teams[0];
      const away = teams[1];
      if (home === undefined || away === undefined) throw new Error("two teams required");

      say("");
      say("=======================================================================");
      say(`pocket-status ladder PROBE REACH — ${REPLICATES} seed lists × ${games} games`);
      say(`probe: ${scenario.probeBands.join(", ")}`);
      say(`derived by rusherAheadBands(): ${rusherAheadBands().join(", ")}`);
      say("");
      say("MEASURED AT DEFAULT_TUNABLES, NOT AT A RUNG. Reach is the question 'how many dropbacks");
      say("carry a rep the probe can floor', and it is asked of the committed engine — a rung");
      say("changes the trajectory and would answer a different question at each one. The league,");
      say("the schedule and the seed lists are the gate's own.");
      say("=======================================================================");

      const shares: number[] = [];
      for (let set = 0; set < REPLICATES; set++) {
        const league = buildFlatLeague({ teams: 2, variant: "pocket-ladder-reach" });
        const index = indexLeague(league);
        const fixtures = buildFixtures(index, {
          kind: "SYNTHETIC_PAIR",
          home,
          away,
          games,
          season: 2024,
        });
        const seeds = generateSeeds(batchSeedFor(scenario, set), games);
        const counts: ReachCounts = {
          dropbacks: 0,
          reps: 0,
          repsByBand: new Map<string, number>(),
          dropbacksWithBand: new Map<string, number>(),
          dropbacksInProbe: 0,
        };
        for (const [i, fixture] of fixtures.entries()) {
          const seed = seeds.seeds[i];
          if (seed === undefined) continue;
          const output = runOneGame({
            built: buildFixture(index, fixture),
            seed,
            tendencies: FROZEN_TENDENCIES,
            fourthDown: FROZEN_FOURTH_DOWN,
            tunables: DEFAULT_TUNABLES,
          });
          countReach(counts, output.observation.events, probe);
        }
        const share = counts.dropbacksInProbe / counts.dropbacks;
        shares.push(share);
        say("");
        say(`  set ${set} (${batchSeedFor(scenario, set)}) — ${counts.dropbacks} dropbacks, ` +
          `${counts.reps} §7.1 reps`);
        for (const [band, n] of [...counts.repsByBand.entries()].sort((a, b) => b[1] - a[1])) {
          const withBand = counts.dropbacksWithBand.get(band) ?? 0;
          say(
            `    ${band.padEnd(18)} reps ${String(n).padStart(6)} ` +
              `(${((n / counts.reps) * 100).toFixed(2)}% of reps) · dropbacks touched ` +
              `${String(withBand).padStart(5)} (${((withBand / counts.dropbacks) * 100).toFixed(2)}%)` +
              `${probe.has(band) ? "  ← PROBE" : ""}`,
          );
        }
        say(`    PROBE REACH (any probe band): ${counts.dropbacksInProbe} / ${counts.dropbacks} = ` +
          `${(share * 100).toFixed(2)}%`);
      }
      say("");
      say(
        `PROBE REACH across ${shares.length} lists: mean ${(mean(shares) * 100).toFixed(2)}% ` +
          `sd ${(sd(shares) * 100).toFixed(2)}pp`,
      );
      say("This number belongs in the scenario's `hypothesis` and nowhere else may restate it.");
    },
    7_200_000,
  );
});
