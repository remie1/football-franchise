/**
 * ============================================================================
 * THE LADDER CENSUS — env-gated Tier 3. MEASUREMENT ONLY. FALSIFICATION, NOT DISCOVERY.
 * ============================================================================
 *
 *   FF_LADDER=1 pnpm --filter @ff/calibration exec vitest run test/ladderOccupancy.measure.test.ts
 *
 * ⚠ TIER 3 (Charter §4.1): env-gated, so CI cannot tell whether a human typed the variable.
 * ⚠ MEASUREMENT ONLY (ADR-027): no patch, no tunable moved, `DEFAULT_TUNABLES` throughout.
 *
 * ================== WHY A CORPUS AT ALL, WHEN THE ANSWER IS ARITHMETIC ==================
 *
 * `ladderOccupancy.test.ts` computes every number in the report exactly and needs no simulation.
 * *A derivation beats a sample*, so this file does NOT re-measure the occupancies and no figure
 * quoted from it should be preferred to the derived one. It exists for three things a derivation
 * cannot do:
 *
 *  1. **Falsify the one restatement.** `tierOfMargin` restates `rolls.ts`'s `bandFor`, which is not
 *     on the engine's barrel. The engine publishes BOTH `margin` and `tier` on every resolution, so
 *     the restatement is checked against the engine's own answer on every observation. **Red at one
 *     disagreement.**
 *  2. **Discover the SHIFT BUCKETS the engine really produces**, without being told what to look
 *     for. The static sweep predicts a shift per check from the term stacks in `SURFACE`; the census
 *     computes it from the stream by an identity (`shift = margin − raw + opposedRaw`) and reports
 *     what it finds. `SURFACE`'s `pass_rush_tick` row describes only the POWER branch and says so —
 *     if the corpus shows a second §7.1 bucket at −12, the DECLARED `PASS_RUSH_VARIANTS` is
 *     confirmed by a measurement that was not looking for it.
 *  3. **Weight the buckets.** A per-rep probability is not a per-play rate. Only the corpus can say
 *     how the §7.1 reps divide between the branches, and that mixture is what turns three exact
 *     numbers into ADR-049's measured 31.909%.
 *
 * ================== METHOD ==================
 *
 *  1. §22a — **four INDEPENDENT seed lists**, each the same size, each reported separately, with the
 *     SD ACROSS LISTS printed beside every rate. A single list would give a standard error and no
 *     evidence that the lists agree.
 *  2. §22c — n is not negotiable. 160 games a list, the band gate's corpus size, so a count here is
 *     commensurable with a reach there.
 *  3. Determinism — every list is `generateSeeds(batchSeed, n)` and its digest is printed. The report
 *     cites seeds.
 *
 * ================== ⛔ WHAT THIS CORPUS STRUCTURALLY CANNOT SEE ==================
 *
 * It is `FLAT_SYNTHETIC` at 60. **Every contest in it is an equal-ratings contest, so it observes
 * exactly one column of the static sweep's six** and can say nothing about whether a check's tier
 * occupancy moves with league level. That question is answered by the derivation and only by the
 * derivation. A reader who takes a level-VARIANT row's census figure for a property of the ladder
 * has made backlog entry 49's mistake; `levelInvariant` is printed on every row of the static table
 * so the distinction is never one lookup away.
 *
 * ================== WHAT WOULD MAKE THIS GO RED (backlog entry 55) ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | the tier walk restates `bandFor` | one observation whose published `tier` ≠ `tierOfMargin(margin)` |
 * | the derivation predicts the engine | a **d100** cell with n ≥ 2,000 whose worst tier sits > 4 SE from the exact prediction |
 * | the d20 exclusion is the declared one | a d20 emission on a kind outside `DECLARED_NON_LADDER_EMISSIONS.kinds` |
 * | the corpus exercises the subject | fewer than 10,000 `pass_rush_tick` observations |
 * | the seed lists are independent | two lists producing an identical seed digest |
 *
 * For the printed shares themselves: **nothing.** They are measurements, not gates.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  DECLARED_NON_LADDER_EMISSIONS,
  countTierWalkMismatches,
  finishCensus,
  foldLadder,
  isD100,
  ladderOrder,
  renderCensus,
  triangularOccupancy,
  uniformOccupancy,
  worstZ,
  type LadderCell,
} from "../src/knownTruth/ladderOccupancy.js";

const ENABLED = process.env["FF_LADDER"] === "1";
const d = ENABLED ? describe : describe.skip;

const GAMES = Number(process.env["FF_LADDER_GAMES"] ?? "160");
/** Four independent lists. Set 0 is the band gate's own, so its numbers are cross-checkable. */
const SEED_SETS: readonly string[] = [
  "known-truth:band-table-monotonicity",
  "known-truth:ladder-occupancy/set-1",
  "known-truth:ladder-occupancy/set-2",
  "known-truth:ladder-occupancy/set-3",
];

interface Run {
  readonly batchSeed: string;
  readonly seedDigest: string;
  readonly games: number;
  readonly cells: Map<string, ReturnType<typeof foldLadder> extends Map<string, infer C> ? C : never>;
  readonly mismatches: number;
}

function runList(batchSeed: string, games: number): Run {
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  if (fixtures.length < games) {
    throw new RangeError(
      `the ladder census asked for ${String(games)} games and the schedule yields ` +
        `${String(fixtures.length)}. §22c: n is not negotiable — widen the schedule, never the ask.`,
    );
  }
  const seeds = generateSeeds(batchSeed, fixtures.length);
  const cells = foldLadder([]);
  let mismatches = 0;
  const used: string[] = [];
  for (let i = 0; i < games; i++) {
    const fixture = fixtures[i];
    const seed = seeds.seeds[i];
    if (fixture === undefined || seed === undefined) continue;
    const output = runOneGame({
      built: buildFixture(index, fixture),
      seed,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
      tunables: DEFAULT_TUNABLES,
    });
    used.push(seed);
    const stream: readonly MatchEventEnvelope[] = output.observation.events;
    foldLadder(stream, cells);
    mismatches += countTierWalkMismatches(stream);
  }
  return { batchSeed, seedDigest: digestSeeds(used), games: used.length, cells, mismatches };
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** SD ACROSS LISTS, not a within-list standard error. Four lists, so the /(n−1) form. */
function sd(xs: readonly number[]): number {
  if (xs.length < 2) return Number.NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

d("result-tier ladder — corpus census", () => {
  it(
    "censuses every tiered resolution, per check and per shift, against the exact derivation",
    { timeout: 1_800_000 },
    () => {
      const runs = SEED_SETS.map((s) => runList(s, GAMES));
      const digests = runs.map((r) => r.seedDigest);
      expect(new Set(digests).size, "seed lists must be independent").toBe(runs.length);

      console.log(
        `\nLADDER CENSUS — ${String(runs.length)} independent seed lists × ${String(GAMES)} games, ` +
          `flat-60 FLAT_SYNTHETIC, DEFAULT_TUNABLES`,
      );
      for (const r of runs) console.log(`  seeds ${r.batchSeed.padEnd(44)} ${r.seedDigest}`);

      // ---- 1. THE FALSIFICATION OF THE RESTATED WALK -----------------------
      const mismatches = runs.reduce((a, r) => a + r.mismatches, 0);
      console.log(`\n  tier-walk mismatches across all four lists: ${String(mismatches)}`);
      expect(mismatches, "tierOfMargin must reproduce the engine's published tier exactly").toBe(0);

      // ---- 2. THE POOLED CENSUS -------------------------------------------
      const pooled = foldLadder([]);
      for (const r of runs) {
        for (const [key, cell] of r.cells) {
          const into = pooled.get(key);
          if (into === undefined) {
            pooled.set(key, {
              kind: cell.kind,
              form: cell.form,
              die: cell.die,
              shift: cell.shift,
              counts: new Map(cell.counts),
              n: cell.n,
            });
            continue;
          }
          for (const [tier, n] of cell.counts) into.counts.set(tier, (into.counts.get(tier) ?? 0) + n);
          into.n += cell.n;
        }
      }
      const census = finishCensus(pooled, mismatches);
      console.log(`\n${renderCensus(census, 2_000)}\n`);

      // ---- 3. THE DERIVATION IS THE PREDICTION, AND IT IS TESTED ----------
      //
      // ⚠ SCOPED TO d100. `game/specialTeams.ts`'s header declares that the three DISTANCE checks
      // roll a d20 against a neutral die and that their `tier` "is NOT meaningful and should be read
      // as noise". A uniform-d100 model of a d20 deviation would be WRONG ARITHMETIC, not a wrong
      // engine, so including them would make this gate red about its own mis-specification.
      // **This scoping was added because the gate went red on its first unstaged run and named them
      // — the exclusion is a measured finding, not a convenience.**
      const tested: LadderCell[] = census.cells.filter((c) => c.n >= 2_000 && isD100(c));
      expect(tested.length, "the corpus must exercise something").toBeGreaterThan(5);
      const failures: string[] = [];
      for (const cell of tested) {
        const z = worstZ(cell);
        if (z.z > 4) failures.push(`${cell.kind} shift=${String(cell.shift)} n=${String(cell.n)} ${z.tier} z=${z.z.toFixed(2)}`);
      }
      console.log(
        `  ${String(tested.length)} d100 cells with n ≥ 2,000 compared against the exact derivation; ` +
          `worst z overall ${Math.max(...tested.map((c) => worstZ(c).z)).toFixed(2)}`,
      );
      expect(failures, "the exact derivation must predict the engine").toEqual([]);

      // ---- 3b. THE d20 DISTANCE CHECKS, QUANTIFIED ------------------------
      //
      // The engine DECLARES these tiers meaningless. Nobody had measured how meaningless. Printed
      // rather than asserted: it is a statement about the current special-teams placeholder, and a
      // real kicking model would change it without anything here being wrong.
      const d20 = census.cells.filter((c) => !isD100(c) && c.n >= 200);
      console.log(
        `\nDECLARED NON-LADDER EMISSIONS (${DECLARED_NON_LADDER_EMISSIONS.die}, ` +
          `${DECLARED_NON_LADDER_EMISSIONS.source})`,
      );
      for (const cell of d20) {
        const reached = ladderOrder().filter((t) => (cell.counts.get(t) ?? 0) > 0);
        console.log(
          `  ${cell.kind.padEnd(14)} shift ${String(cell.shift).padStart(4)}  n=${String(cell.n).padStart(7)}  ` +
            `reaches ${String(reached.length)}/9 tiers: ${reached.join(", ")}`,
        );
      }
      // The exclusion must be the DECLARED one. A d20 tier appearing on any other kind would mean a
      // resolver started throwing a different die and the declaration no longer covers the set.
      expect(
        [...new Set(census.cells.filter((c) => !isD100(c)).map((c) => c.kind))].sort(),
        "the d20 exclusion must be exactly the declared set",
      ).toEqual([...DECLARED_NON_LADDER_EMISSIONS.kinds].sort());

      // ---- 4. §7.1's BRANCH MIXTURE, WHICH ONLY A CORPUS CAN SUPPLY -------
      const rush = census.cells.filter((c) => c.kind === "pass_rush_tick");
      const rushN = rush.reduce((a, c) => a + c.n, 0);
      expect(rushN, "the corpus must exercise §7.1").toBeGreaterThan(10_000);
      console.log(`\n§7.1 SHIFT BUCKETS — ${String(rushN)} reps, ${String(rush.length)} buckets`);
      let wonReps = 0;
      for (const c of [...rush].sort((a, b) => b.n - a.n)) {
        const order = ladderOrder();
        const won = order
          .slice(0, order.indexOf("STRONG_SUCCESS") + 1)
          .reduce((a, t) => a + (c.counts.get(t) ?? 0), 0);
        wonReps += won;
        const predicted = triangularOccupancy(c.shift);
        const predictedWon =
          (predicted.get("CRITICAL_SUCCESS") ?? 0) + (predicted.get("STRONG_SUCCESS") ?? 0);
        console.log(
          `  shift ${String(c.shift).padStart(4)}  n=${String(c.n).padStart(8)} ` +
            `(${((100 * c.n) / rushN).toFixed(3)}% of reps)  margin ≥ 15 observed ` +
            `${((100 * won) / c.n).toFixed(3)}%  exact ${(100 * predictedWon).toFixed(3)}%`,
        );
      }
      console.log(
        `  POOLED margin ≥ 15 (= RUSHER_WINS_REP): ${((100 * wonReps) / rushN).toFixed(3)}% ` +
          `— ADR-049 §6c measured 31.909% at play scope and 31.858% at corpus scope`,
      );

      // ---- 5. PER-LIST SPREAD, so the pooled figures carry a dispersion ---
      const perList = runs.map((r) => {
        let n = 0;
        let won = 0;
        const order = ladderOrder();
        const top = new Set(order.slice(0, order.indexOf("STRONG_SUCCESS") + 1));
        for (const cell of r.cells.values()) {
          if (cell.kind !== "pass_rush_tick") continue;
          n += cell.n;
          for (const [tier, k] of cell.counts) if (top.has(tier)) won += k;
        }
        return (100 * won) / n;
      });
      console.log(
        `  per-list: [${perList.map((x) => x.toFixed(3)).join(", ")}]  ` +
          `mean ${mean(perList).toFixed(3)}%  SD across lists ${sd(perList).toFixed(3)}pp`,
      );

      // ---- 6. WHAT THE CORPUS SAW THAT THE SCALE SURFACE DOES NOT DESCRIBE
      console.log(
        `\n  ladder readers with no scale descriptor: ` +
          `${census.kindsWithoutScale.length === 0 ? "(none)" : census.kindsWithoutScale.join(", ")}`,
      );
      console.log(
        `  described but never produced by this corpus: ` +
          `${census.kindsNotObserved.length === 0 ? "(none)" : census.kindsNotObserved.join(", ")}`,
      );
    },
  );

});
