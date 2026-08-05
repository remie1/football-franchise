/**
 * ============================================================================
 * THE THREAT POPULATION CENSUS — Part 2 of the post-entry-81 dispatch. A CENSUS, NOT A LEVER.
 * ============================================================================
 *
 *   FF_TPC=1 pnpm --filter @ff/calibration exec vitest run test/threatPopulationCensus.test.ts
 *   FF_TPC=1 FF_TPC_GAMES=496 ...
 *
 * ⚠ MEASUREMENT ONLY — no tunable moved on disk, none patched in memory. `DEFAULT_TUNABLES`, one
 * configuration, own seed prefix. See `src/knownTruth/threatPopulationCensus.ts` for the full
 * argument and the four questions this file reports.
 *
 * ================== STEP ONE — WAS THIS RULED? ==================
 *
 * Searched `docs/decisions/` for a prior census of live-threat population size/lifetime before this
 * file was written. None found: entry 40 measured SUPPLY (`startsThreat` fires on 31.858–31.909% of
 * §7.1 reps) and a coarse RESET/still-live/ARRIVED split (44.244% / 55.756% / 7.040%, overlapping
 * categories, entry 40a). Nobody has measured live-threat COUNT per tick, per-dropback distinct
 * count, or a mutually-exclusive lifetime partition before. This file is the first direct census.
 *
 * ================== THE FALSIFIER ==================
 *
 * `threatPopulationCensus.ts`'s `real` map and `RUSH_THREAT` handling are the SAME triggers and the
 * SAME upsert/delete semantics as `pocketChannelShares.ts`'s `reconstructPlay`, which is proven
 * against the engine's own `POCKET_STATUS` stream at 0 mismatches. This file does not re-prove that
 * identity from scratch; it calls `reconstructGame` (imported, unmodified) over the SAME games and
 * reports its `identityChecks`/`identityMismatches` as the falsifier for the population this census
 * counts. `identityMismatches` MUST be 0, asserted, not merely printed.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { positionsFromSnapshot, reconstructGame } from "../src/knownTruth/pocketChannelShares.js";
import {
  DROPBACK_THREAT_CAP,
  LIFETIME_BUCKET_CAP_SECONDS,
  LIFETIME_BUCKET_SECONDS,
  LIFETIME_REASONS,
  THREAT_COUNT_CAP,
  emptyCensusFold,
  foldGameCensus,
  median,
  quantile,
  type CensusFold,
} from "../src/knownTruth/threatPopulationCensus.js";

const ENABLED = process.env["FF_TPC"] === "1";
const GAMES = Number(process.env["FF_TPC_GAMES"] ?? "496");

/**
 * ⛔ ITS OWN PREFIX — not `"baseline-0001"` alone (the canonical set-0 shared by every other pocket
 * instrument), a dedicated string, because this file is a single-point census rather than a
 * cross-instrument comparison and has no cross-validation reason to share a seed list (entries
 * 66/70's reasoning, applied to a file that has no sibling to diverge FROM).
 */
const BATCH_SEED = "baseline-0001/tpc-set-0";

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
}

function refuseSmallN(): void {
  if (GAMES < 496) {
    throw new Error(
      `§22c: refusing to census at ${GAMES} games when the baseline runs 496. ` +
        "Never buy wall clock by reducing n; shard by seed set across processes instead.",
    );
  }
}

describe.skipIf(!ENABLED)("threat population census", () => {
  it(
    "measures live-threat population and lifetime on DEFAULT_TUNABLES — proposes nothing",
    { timeout: 6 * 60 * 60_000 },
    () => {
      refuseSmallN();

      const tunables = DEFAULT_TUNABLES;
      expect(stableDigest(tunables)).toBe(stableDigest(DEFAULT_TUNABLES));

      const index = indexLeague(buildFlatLeague({ teams: 32 }));
      const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
      const limit = Math.min(GAMES, fixtures.length);
      const seeds = generateSeeds(BATCH_SEED, fixtures.length);

      const fold: CensusFold = emptyCensusFold();
      let identityChecks = 0;
      let identityMismatches = 0;
      const used: string[] = [];
      const started = Date.now();

      for (let i = 0; i < limit; i++) {
        const fixture = fixtures[i];
        const seed = seeds.seeds[i];
        if (fixture === undefined || seed === undefined) continue;
        const built = buildFixture(index, fixture);
        const output = runOneGame({
          built,
          seed,
          tendencies: FROZEN_TENDENCIES,
          fourthDown: FROZEN_FOURTH_DOWN,
          tunables,
        });
        foldGameCensus(fold, output.observation.events, tunables);
        for (const play of reconstructGame(output.observation.events, tunables, positionsFromSnapshot(built.snapshot))) {
          identityChecks += play.identityChecks;
          identityMismatches += play.identityMismatches;
        }
        used.push(seed);
      }
      const wallMs = Date.now() - started;

      say("");
      say("=======================================================================");
      say("THREAT POPULATION CENSUS — flat-60 32t (FLAT_SYNTHETIC), DEFAULT_TUNABLES");
      say(`SYNTHETIC_ROUND_ROBIN 2024 · ${limit} games`);
      say(`seed digest: ${digestSeeds(used)} (batch seed: ${BATCH_SEED})`);
      say(`tunablesDigest: ${stableDigest(tunables)} (must equal DEFAULT_TUNABLES)`);
      say(`wall ms: ${wallMs}`);
      say("MEASUREMENT ONLY — no tunable moved on disk, none patched. PROPOSES NOTHING.");
      say("=======================================================================");

      // -------------------------------------------------------------------------------------------
      // FALSIFIER
      // -------------------------------------------------------------------------------------------
      say("");
      say(`FALSIFIER: ${identityMismatches} mismatches of ${identityChecks} identity checks ` +
        "(reconstructGame, pocketChannelShares.ts, imported unmodified, run over the same games).");
      expect(identityMismatches).toBe(0);

      // -------------------------------------------------------------------------------------------
      // QUESTION 1 — arrival-channel dirty-tick share, split by mechanism
      // -------------------------------------------------------------------------------------------
      say("");
      say("QUESTION 1 — fraction of ticks with >=1 live threat within 2.0s (arrival channel dirty):");
      say(`  overall:              ${pct(fold.arrivalDirtyTicks, fold.totalTicks)} of ${fold.totalTicks} ticks`);
      say(
        `  non-pursuit ticks:    ${pct(fold.nonPursuitDirtyTicks, fold.nonPursuitTicks)} of ` +
          `${fold.nonPursuitTicks} (${pct(fold.nonPursuitTicks, fold.totalTicks)} of all ticks)`,
      );
      say(
        `  pursuit-clock ticks:  ${pct(fold.pursuitDirtyTicks, fold.pursuitTicks)} of ` +
          `${fold.pursuitTicks} (${pct(fold.pursuitTicks, fold.totalTicks)} of all ticks)`,
      );
      expect(fold.nonPursuitTicks + fold.pursuitTicks).toBe(fold.totalTicks);
      expect(fold.nonPursuitDirtyTicks + fold.pursuitDirtyTicks).toBe(fold.arrivalDirtyTicks);

      // -------------------------------------------------------------------------------------------
      // QUESTION 2 — live-threat-count distributions
      // -------------------------------------------------------------------------------------------
      say("");
      say(`QUESTION 2a — live-threat count per NON-PURSUIT tick (${fold.nonPursuitTicks} ticks):`);
      for (let i = 0; i <= THREAT_COUNT_CAP; i++) {
        const label = i === THREAT_COUNT_CAP ? `${String(i)}+` : String(i);
        say(`  ${label.padStart(3)}: ${pct(fold.liveThreatCountHist[i] ?? 0, fold.nonPursuitTicks)}`);
      }
      const histSum = fold.liveThreatCountHist.reduce((a, b) => a + b, 0);
      expect(histSum).toBe(fold.nonPursuitTicks);

      say("");
      say(`QUESTION 2b — distinct threats per DROPBACK (${fold.dropbacks} dropbacks; entry 40's cross-check figure was 2.711/dropback):`);
      for (let i = 0; i <= DROPBACK_THREAT_CAP; i++) {
        const label = i === DROPBACK_THREAT_CAP ? `${String(i)}+` : String(i);
        say(`  ${label.padStart(3)}: ${pct(fold.distinctThreatsPerDropbackHist[i] ?? 0, fold.dropbacks)}`);
      }
      const dHistSum = fold.distinctThreatsPerDropbackHist.reduce((a, b) => a + b, 0);
      expect(dHistSum).toBe(fold.dropbacks);
      say(`  mean distinct threats/dropback: ${(fold.distinctThreatsTotal / fold.dropbacks).toFixed(3)}`);

      // -------------------------------------------------------------------------------------------
      // QUESTION 3 — lifetime distribution
      // -------------------------------------------------------------------------------------------
      say("");
      say(
        `QUESTION 3 — threat lifetime, ticks from creation to FIRST of {RESET, ARRIVED} or PLAY_END ` +
          `(${fold.lifetimeCount} threat instances, ${LIFETIME_BUCKET_SECONDS}s buckets):`,
      );
      const capBucket = Math.round(LIFETIME_BUCKET_CAP_SECONDS / LIFETIME_BUCKET_SECONDS);
      for (let b = 0; b <= capBucket; b++) {
        const lo = (b * LIFETIME_BUCKET_SECONDS).toFixed(1);
        const label = b === capBucket ? `${lo}+` : `${lo}-${((b + 1) * LIFETIME_BUCKET_SECONDS).toFixed(1)}`;
        say(`  ${label.padStart(9)}s: ${pct(fold.lifetimeHist[b] ?? 0, fold.lifetimeCount)}`);
      }
      const lifetimeHistSum = fold.lifetimeHist.reduce((a, b) => a + b, 0);
      expect(lifetimeHistSum).toBe(fold.lifetimeCount);

      say("");
      say("  lifetime by terminal reason (mutually exclusive by construction):");
      let reasonSum = 0;
      for (const r of LIFETIME_REASONS) {
        say(`    ${r.padEnd(10)}: ${pct(fold.lifetimeByReason[r], fold.lifetimeCount)}`);
        reasonSum += fold.lifetimeByReason[r];
      }
      expect(reasonSum).toBe(fold.lifetimeCount);

      const sorted = [...fold.lifetimeSecondsSorted].sort((a, b) => a - b);
      say("");
      say(
        `  mean: ${(fold.lifetimeSecondsSum / fold.lifetimeCount).toFixed(3)}s · ` +
          `median: ${median(sorted).toFixed(3)}s · p90: ${quantile(sorted, 0.9).toFixed(3)}s · ` +
          `p99: ${quantile(sorted, 0.99).toFixed(3)}s`,
      );

      // -------------------------------------------------------------------------------------------
      // QUESTION 4 — the population a CLEAN play could ever be drawn from
      // -------------------------------------------------------------------------------------------
      say("");
      say(
        "QUESTION 4 — fraction of dropbacks with >=1 tick carrying NO live threat within 2.0s at all " +
          "(arrival channel reads CLEAN at least once):",
      );
      say(`  ${pct(fold.dropbacksWithAnyArrivalCleanTick, fold.dropbacks)} of ${fold.dropbacks} dropbacks`);
      say(
        `  (complement — EVERY tick of the dropback carries a live threat within 2.0s): ` +
          `${pct(fold.dropbacks - fold.dropbacksWithAnyArrivalCleanTick, fold.dropbacks)}`,
      );
    },
  );
});
