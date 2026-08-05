/**
 * ============================================================================
 * ROADMAP 1e — CONDITIONAL DELIVERABLE: THE THREE CHANNELS' SHARES, ON THE BOUNDED TREE.
 * ============================================================================
 *
 *   FF_PHCS=1 pnpm --filter @ff/calibration exec vitest run test/pressureHorizonChannelShares.test.ts
 *   FF_PHCS=1 FF_PHCS_GAMES=496 FF_PHCS_SETS=0,1 FF_PHCS_HORIZON=2.0 ...
 *
 * ⚠ TIER 3. ⚠ MEASUREMENT ONLY — no tunable moved on disk.
 *
 * ================== WHY THIS FILE, ALONGSIDE `pocketChannelShares.test.ts` ==================
 *
 * Owner's addition to this dispatch: *"if a bounded horizon cannot bring the pressure rate into
 * band, the most valuable thing this dispatch can produce is what the residual is made of… re-run the
 * channel-share measurement and report which channel is EXCLUSIVE on the remaining dirty ticks."*
 * `pocketChannelShares.test.ts` is hard-wired to `DEFAULT_TUNABLES` (its own header explains why: it
 * answers "which channel does the SHIPPING table lean on"). This file reuses its machinery
 * (`reconstructGame`, `foldTick`, `emptyChannelFold` — none of it duplicated) against a SECOND tree:
 * the committed tree with `arrival.pressureWithinSeconds` bounded at this dispatch's derived
 * candidate. It ALSO re-measures the committed-tree table in the same run, on the SAME seeds, so the
 * owner's quoted committed-tree numbers (43.676% / 3.815% / 0.004% exclusive-of-dirty) are VERIFIED
 * here rather than carried forward — the owner's own instruction, and the standing rule that every
 * number he quotes is `REPORTED`, to be independently `COMPUTED` before being relied on.
 *
 * ⛔ **THE COMMITTED-TREE SHARES DO NOT PREDICT THE BOUNDED-TREE SHARES.** Bounding the horizon is
 * exactly the intervention that changes which channel binds — that is what "report the residual" is
 * asking for. Both tables are measured, neither is inferred from the other.
 *
 * ================== THE FALSIFIER, UNCHANGED ==================
 *
 * `reconstructGame`'s own identity check: the worst of the three RECONSTRUCTED channels must equal
 * the published `POCKET_STATUS`, tick for tick, on EVERY tree measured — including the bounded one,
 * where `floorFromArrival`'s own read of `arrival.pressureWithinSeconds` (inside `pocketChannelShares.ts`)
 * must agree with the bounded value or the identity fails immediately. A passing identity check on the
 * bounded tree is therefore also a confirmation that the reconstruction reads the patched tunables and
 * not a stale closure over `DEFAULT_TUNABLES`.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { digestSeeds, generateSeeds } from "../src/harness/seeds.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import {
  CHANNEL_IDS,
  emptyChannelFold,
  foldTick,
  positionsFromSnapshot,
  reconstructGame,
  type ChannelFold,
  type ChannelId,
} from "../src/knownTruth/pocketChannelShares.js";
import { horizonAt, horizonLabel } from "./pressureHorizonPatches.js";

const ENABLED = process.env["FF_PHCS"] === "1";
const GAMES = Number(process.env["FF_PHCS_GAMES"] ?? "496");
const SETS = (process.env["FF_PHCS_SETS"] ?? "0")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n >= 0);
const CANDIDATE_HORIZON = Number(process.env["FF_PHCS_HORIZON"] ?? "2.0");

/**
 * ⛔ THE `phcs-` PREFIX DIVERGES FROM `pocketChannelShares.test.ts`'s `pcs-`, AND THAT IS DELIBERATE —
 * DO NOT "FIX" IT BY SHARING A SEED CONSTANT (owner ruling, backlog entries 66/70).
 *
 * Set 0 is `"baseline-0001"` in both files and is byte-identical; every set above 0 is file-specific,
 * so the two instruments sample **independent populations**.
 *
 * **The agreement between these two files on the committed tree's channel shares (~0.2pp) is
 * CROSS-VALIDATION precisely BECAUSE the seeds differ.** Share the constant and that evidence
 * evaporates — two files reading the same seeds agreeing tells you nothing about sampling error.
 *
 * ⚠ Entry 66 investigated the 257,598-vs-259,737 tick difference between these two files and closed
 * it as **an UNDOCUMENTED divergence, not a wrong one** — so the fix is this comment, not
 * homogenisation. **Homogenising would have removed a property we want while looking like it fixed
 * something.** Full reasoning, including the rejected third option, is at
 * `pocketChannelShares.test.ts`'s own `batchSeedFor`.
 */
function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/phcs-set-${String(set)}`;
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
}

const LABEL: Record<ChannelId, string> = {
  counter: "1 pocketStatusFromPressure (counter)",
  bandFloor: "2 pocketFloorFor (this tick's §7.1 band)",
  arrival: "3 pocketFloorFromArrival (nearest threat / pursuit clock)",
};

interface TreeResult {
  readonly id: string;
  readonly tunables: Tunables;
  fold: ChannelFold;
  identityChecks: number;
  identityMismatches: number;
  dropbacks: number;
  gamesRun: number;
  seedDigests: string[];
}

function measure(id: string, tunables: Tunables): TreeResult {
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const limit = Math.min(GAMES, fixtures.length);

  const result: TreeResult = {
    id,
    tunables,
    fold: emptyChannelFold(),
    identityChecks: 0,
    identityMismatches: 0,
    dropbacks: 0,
    gamesRun: 0,
    seedDigests: [],
  };

  for (const set of SETS) {
    const seeds = generateSeeds(batchSeedFor(set), fixtures.length);
    const used: string[] = [];
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
      const plays = reconstructGame(output.observation.events, tunables, positionsFromSnapshot(built.snapshot));
      for (const play of plays) {
        result.dropbacks += 1;
        result.identityChecks += play.identityChecks;
        result.identityMismatches += play.identityMismatches;
        for (const tick of play.ticks) foldTick(result.fold, tick, tunables);
      }
      used.push(seed);
      result.gamesRun += 1;
    }
    result.seedDigests.push(`${String(set)} → ${digestSeeds(used)}`);
  }
  return result;
}

function report(r: TreeResult): void {
  say("");
  say(`=== ${r.id} ===`);
  say(`tunablesDigest: ${stableDigest(r.tunables)}`);
  say(`seed digests: ${r.seedDigests.join(" · ")}`);
  say(
    `IDENTITY CHECK: ${String(r.identityMismatches)} mismatches of ${String(r.identityChecks)} checks, ` +
      `${String(r.dropbacks)} dropbacks, ${String(r.gamesRun)} games.`,
  );
  expect(r.identityMismatches).toBe(0);

  say("");
  say(
    `SHARE/TIE/EXCLUSIVE over ${String(r.fold.dirtyTicks)} dirty ticks of ${String(r.fold.allTicks)} total ` +
      `(all-three-CLEAN: ${String(r.fold.allTicks - r.fold.dirtyTicks)}, ${pct(r.fold.allTicks - r.fold.dirtyTicks, r.fold.allTicks)})`,
  );
  say("| channel | SHARE (winner, incl. ties) | ALONE | TIED | DOMINATED | EXCLUSIVE/all | EXCLUSIVE/dirty |");
  say("|---|---|---|---|---|---|---|");
  for (const id of CHANNEL_IDS) {
    const dominated = r.fold.dirtyTicks - r.fold.winner[id];
    say(
      `| ${LABEL[id]} | ${String(r.fold.winner[id])} (${pct(r.fold.winner[id], r.fold.dirtyTicks)}) | ` +
        `${String(r.fold.alone[id])} (${pct(r.fold.alone[id], r.fold.dirtyTicks)}) | ` +
        `${String(r.fold.tied[id])} (${pct(r.fold.tied[id], r.fold.dirtyTicks)}) | ` +
        `${String(dominated)} (${pct(dominated, r.fold.dirtyTicks)}) | ` +
        `${String(r.fold.exclusiveOfAll[id])} (${pct(r.fold.exclusiveOfAll[id], r.fold.allTicks)}) | ` +
        `${String(r.fold.exclusiveOfDirty[id])} (${pct(r.fold.exclusiveOfDirty[id], r.fold.dirtyTicks)}) |`,
    );
  }

  say("");
  say("### tie structure (winner subsets, over dirty ticks)");
  say("| winning subset | ticks | share |");
  say("|---|---|---|");
  const entries = [...r.fold.winnerSubsets.entries()].sort((a, b) => b[1] - a[1]);
  for (const [subset, n] of entries) {
    say(`| ${subset.split("+").map((s) => LABEL[s as ChannelId] ?? s).join(" + ")} | ${String(n)} | ${pct(n, r.fold.dirtyTicks)} |`);
  }
  const subsetTotal = entries.reduce((a, [, n]) => a + n, 0);
  expect(subsetTotal).toBe(r.fold.dirtyTicks);
}

describe.skipIf(!ENABLED)("roadmap 1e — channel shares, committed vs. horizon-bounded", () => {
  it(
    "reconstructs both trees, verifies identity on each, reports shares",
    { timeout: 6 * 60 * 60_000 },
    () => {
      say("");
      say("=======================================================================");
      say("ROADMAP 1e — CHANNEL SHARES: COMMITTED vs. arrival.pressureWithinSeconds BOUNDED");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(GAMES)} games × ${String(SETS.length)} set(s)`);
      say(`bounded candidate: arrival.pressureWithinSeconds = ${horizonLabel(CANDIDATE_HORIZON)}`);
      say("MEASUREMENT ONLY — no tunable moved on disk.");
      say("=======================================================================");

      const committed = measure("COMMITTED (DEFAULT_TUNABLES)", DEFAULT_TUNABLES);
      const bounded = measure(
        `BOUNDED (arrival.pressureWithinSeconds = ${horizonLabel(CANDIDATE_HORIZON)})`,
        horizonAt(CANDIDATE_HORIZON),
      );

      report(committed);
      report(bounded);

      say("");
      say("### Side by side — EXCLUSIVE/dirty, both trees");
      say("| channel | committed | bounded |");
      say("|---|---|---|");
      for (const id of CHANNEL_IDS) {
        say(
          `| ${LABEL[id]} | ${pct(committed.fold.exclusiveOfDirty[id], committed.fold.dirtyTicks)} | ` +
            `${pct(bounded.fold.exclusiveOfDirty[id], bounded.fold.dirtyTicks)} |`,
        );
      }
      say(`| dirty ticks | ${String(committed.fold.dirtyTicks)} of ${String(committed.fold.allTicks)} | ${String(bounded.fold.dirtyTicks)} of ${String(bounded.fold.allTicks)} |`);
    },
  );
});
