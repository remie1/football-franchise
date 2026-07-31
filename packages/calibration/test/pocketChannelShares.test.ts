/**
 * ============================================================================
 * ROADMAP 1d, STEP 1 — THE THREE CHANNELS' SHARES, TIE STRUCTURE AND EXCLUSIVE SHARE.
 * ============================================================================
 *
 *   FF_PCS=1 pnpm --filter @ff/calibration exec vitest run test/pocketChannelShares.test.ts
 *   FF_PCS=1 FF_PCS_GAMES=496 FF_PCS_SETS=0,1 ...
 *
 * ⚠ TIER 3 (Charter §4.1): env-gated. ⚠ MEASUREMENT ONLY: `DEFAULT_TUNABLES`, unpatched, on the
 * COMMITTED tree — the tree entry 1d's football question is actually about. (The arrival-only base
 * from ADR-049/`geometryTimeRetirement.ts` artificially extinguishes channels 1 and 2; it is the
 * right tree for isolating channel 3's mechanism and the WRONG tree for measuring which of the
 * three the shipping table actually leans on, which is this file's question.)
 *
 * ================== THE OWNER'S CONSTRAINT, QUOTED SO IT CANNOT BE SOFTENED ==================
 *
 * "MEASURE THE THREE CHANNELS' CONTRIBUTIONS INDEPENDENTLY BEFORE CHANGING ANYTHING. Not the
 * lever's size — the channels' shares. Entry 40 and ADR-050's ruling were both priced against a
 * determinant that was not binding; do not make it three." This file prices nothing and proposes no
 * tunable value. `packages/engine/src/tunables.ts` is untouched by anything here.
 *
 * ================== THREE QUANTITIES, DELIBERATELY KEPT SEPARATE ==================
 *
 *   SHARE      how often is this channel the max (winner), INCLUDING ties?
 *   TIE        of that share, how much is ALONE (unique max) vs TIED (shared max)?
 *   EXCLUSIVE  how often is this channel the ONLY non-CLEAN channel — i.e. the ceiling on any
 *              intervention that acts SOLELY on it, because on every other dirty tick something
 *              else would still hold the pocket dirty even if this channel were fully neutralised.
 *
 * A channel with a large SHARE and a small EXCLUSIVE share is REDUNDANT, not powerful — the exact
 * shape ADR-049 found for threat supply (63.6pp where it acts alone, 0.111pp on the committed tree
 * where two other channels are live and sufficient on their own).
 *
 * ================== THE §5.3 ANALOGY, AND WHERE IT DOES AND DOES NOT TRANSFER ==================
 *
 * §5.3's RAW/EXCLUSIVE discipline was built for PLAY-SCOPE PRICING: a population predicate plus a
 * TREATMENT arm, comparing a control stream to a patched one. This file has no treatment arm — it
 * is a single-run, tick-level DESCRIPTIVE PARTITION of the committed engine's own three channels,
 * not a before/after comparison. The transfer is real at the concept level (RAW = "this subject's
 * own effect is present"; EXCLUSIVE = "no redundant cause is also present on the same unit"), and it
 * is applied here at TICK grain instead of PLAY grain, per the owner's framing. What does NOT
 * transfer: there is no ISOLATION arm (nothing is patched, so there is no rejected complement to
 * assert digest-equality over) and no RAW-vs-EXCLUSIVE *stream* distinction (a single reconstruction
 * has no second arm to publish harder than). Declared here rather than forced into the play-scope
 * shape it does not fit.
 *
 * ================== THE FALSIFIER ==================
 *
 * `reconstructPlay` (src/knownTruth/pocketChannelShares.ts) asserts that the worst of the three
 * RECONSTRUCTED channels equals the published `POCKET_STATUS`, tick for tick. If this identity does
 * not hold at 0 mismatches, nothing below it may be cited — the share/tie/exclusive numbers are
 * read off the RECONSTRUCTION, not off the engine directly (the engine does not publish which
 * channel decided), so an unverified reconstruction would be reporting shares of a claim, not of the
 * engine's own behaviour.
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
import {
  CHANNEL_IDS,
  DIRTY_STATUSES,
  emptyChannelFold,
  emptyStatusPartitionedFold,
  emptyTieAlignmentSplit,
  foldTick,
  foldTickByStatus,
  foldTieAlignmentSplit,
  reconstructGame,
  type ChannelFold,
  type ChannelId,
} from "../src/knownTruth/pocketChannelShares.js";

const ENABLED = process.env["FF_PCS"] === "1";
const GAMES = Number(process.env["FF_PCS_GAMES"] ?? "496");
const SETS = (process.env["FF_PCS_SETS"] ?? "0")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n >= 0);

function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/pcs-set-${String(set)}`;
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

function renderChannelTable(f: ChannelFold, title: string): void {
  say("");
  say(`### ${title} — over ${String(f.dirtyTicks)} ticks of ${String(f.allTicks)} total in this partition`);
  say("| channel | SHARE (winner, incl. ties) | — ALONE | — TIED | DOMINATED | EXCLUSIVE / all ticks | EXCLUSIVE / dirty ticks |");
  say("|---|---|---|---|---|---|---|");
  for (const id of CHANNEL_IDS) {
    const dominated = f.dirtyTicks - f.winner[id];
    say(
      `| ${LABEL[id]} | ${String(f.winner[id])} (${pct(f.winner[id], f.dirtyTicks)}) | ` +
        `${String(f.alone[id])} (${pct(f.alone[id], f.dirtyTicks)}) | ` +
        `${String(f.tied[id])} (${pct(f.tied[id], f.dirtyTicks)}) | ` +
        `${String(dominated)} (${pct(dominated, f.dirtyTicks)}) | ` +
        `${String(f.exclusiveOfAll[id])} (${pct(f.exclusiveOfAll[id], f.allTicks)}) | ` +
        `${String(f.exclusiveOfDirty[id])} (${pct(f.exclusiveOfDirty[id], f.dirtyTicks)}) |`,
    );
  }
}

function mergeFold(a: ChannelFold, b: ChannelFold): void {
  a.allTicks += b.allTicks;
  a.dirtyTicks += b.dirtyTicks;
  for (const id of CHANNEL_IDS) {
    a.winner[id] += b.winner[id];
    a.alone[id] += b.alone[id];
    a.tied[id] += b.tied[id];
    a.exclusiveOfAll[id] += b.exclusiveOfAll[id];
    a.exclusiveOfDirty[id] += b.exclusiveOfDirty[id];
  }
  for (const [k, v] of b.winnerSubsets) a.winnerSubsets.set(k, (a.winnerSubsets.get(k) ?? 0) + v);
}

describe.skipIf(!ENABLED)("roadmap 1d step 1 — the three channels' shares, tie structure, exclusive share", () => {
  it(
    "reconstructs all three channels from the committed stream, verifies the identity, and reports shares",
    { timeout: 6 * 60 * 60_000 },
    () => {
      const tunables = DEFAULT_TUNABLES;
      const index = indexLeague(buildFlatLeague({ teams: 32 }));
      const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
      const limit = Math.min(GAMES, fixtures.length);

      const fold = emptyChannelFold();
      const statusFold = emptyStatusPartitionedFold();
      const tieAlignment = emptyTieAlignmentSplit();
      let identityChecks = 0;
      let identityMismatches = 0;
      let dropbacks = 0;
      let gamesRun = 0;
      const seedDigests: string[] = [];

      for (const set of SETS) {
        const seeds = generateSeeds(batchSeedFor(set), fixtures.length);
        const used: string[] = [];
        for (let i = 0; i < limit; i++) {
          const fixture = fixtures[i];
          const seed = seeds.seeds[i];
          if (fixture === undefined || seed === undefined) continue;
          const output = runOneGame({
            built: buildFixture(index, fixture),
            seed,
            tendencies: FROZEN_TENDENCIES,
            fourthDown: FROZEN_FOURTH_DOWN,
            tunables,
          });
          const plays = reconstructGame(output.observation.events, tunables);
          for (const play of plays) {
            dropbacks += 1;
            identityChecks += play.identityChecks;
            identityMismatches += play.identityMismatches;
            for (const tick of play.ticks) {
              foldTick(fold, tick, tunables);
              foldTickByStatus(statusFold, tick, tunables);
              foldTieAlignmentSplit(tieAlignment, tick, tunables);
            }
          }
          used.push(seed);
          gamesRun += 1;
        }
        seedDigests.push(`${String(set)} → ${digestSeeds(used)}`);
      }

      say("");
      say("=======================================================================");
      say("ROADMAP 1d STEP 1 — THE THREE CHANNELS' SHARES (COMMITTED TREE)");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(GAMES)} games per set × ${String(SETS.length)} set(s)`);
      say(`seed digests: ${seedDigests.join(" · ")}`);
      say(`tunablesDigest: ${stableDigest(tunables)} (DEFAULT_TUNABLES, unpatched)`);
      say("MEASUREMENT ONLY — no tunable moved, nothing priced.");
      say("=======================================================================");

      // ---- THE FALSIFIER --------------------------------------------------
      say("");
      say("### THE IDENTITY CHECK — the falsifier for everything below");
      say("");
      say(
        `worst-of-3-reconstructed vs published POCKET_STATUS: ${String(identityMismatches)} mismatches ` +
          `of ${String(identityChecks)} checks, across ${String(dropbacks)} dropbacks, ${String(gamesRun)} games.`,
      );
      expect(identityMismatches).toBe(0);

      // ---- SHARE / TIE / EXCLUSIVE -----------------------------------------
      say("");
      say(`### SHARE, TIE STRUCTURE, EXCLUSIVE SHARE — over ${String(fold.dirtyTicks)} DIRTY ticks of ${String(fold.allTicks)} total`);
      say(`(all-three-CLEAN ticks: ${String(fold.allTicks - fold.dirtyTicks)}, ${pct(fold.allTicks - fold.dirtyTicks, fold.allTicks)} of all ticks — excluded from SHARE/TIE by construction, since nothing is binding on a clean tick)`);
      say("");
      say("| channel | SHARE (winner, incl. ties) | — ALONE | — TIED | DOMINATED | EXCLUSIVE / all ticks | EXCLUSIVE / dirty ticks |");
      say("|---|---|---|---|---|---|---|");
      for (const id of CHANNEL_IDS) {
        const dominated = fold.dirtyTicks - fold.winner[id];
        say(
          `| ${LABEL[id]} | ${String(fold.winner[id])} (${pct(fold.winner[id], fold.dirtyTicks)}) | ` +
            `${String(fold.alone[id])} (${pct(fold.alone[id], fold.dirtyTicks)}) | ` +
            `${String(fold.tied[id])} (${pct(fold.tied[id], fold.dirtyTicks)}) | ` +
            `${String(dominated)} (${pct(dominated, fold.dirtyTicks)}) | ` +
            `${String(fold.exclusiveOfAll[id])} (${pct(fold.exclusiveOfAll[id], fold.allTicks)}) | ` +
            `${String(fold.exclusiveOfDirty[id])} (${pct(fold.exclusiveOfDirty[id], fold.dirtyTicks)}) |`,
        );
      }
      say("");
      say(
        "SHARE = winner (incl. ties) ÷ dirty ticks. ALONE/TIED partition SHARE exactly (ALONE+TIED=SHARE). " +
          "DOMINATED = dirty ticks − SHARE. EXCLUSIVE/all = the owner's addition: this channel non-CLEAN AND " +
          "the other two CLEAN, ÷ ALL ticks (the direct upper bound on a lever acting on this channel ALONE, " +
          "against the WHOLE population). EXCLUSIVE/dirty is the same numerator against the dirty-tick " +
          "denominator instead — both reported per ADR-054's 'two percentages, different questions' precedent.",
      );

      // ---- TIE STRUCTURE, EXPLICIT SUBSETS ---------------------------------
      say("");
      say("### TIE STRUCTURE — every winner SUBSET, over dirty ticks (not reduced to one owner per tick)");
      say("");
      say("| winning subset | ticks | share of dirty ticks |");
      say("|---|---|---|");
      const entries = [...fold.winnerSubsets.entries()].sort((a, b) => b[1] - a[1]);
      for (const [subset, n] of entries) {
        say(`| ${subset.split("+").map((s) => LABEL[s as ChannelId] ?? s).join(" + ")} | ${String(n)} | ${pct(n, fold.dirtyTicks)} |`);
      }
      const subsetTotal = entries.reduce((a, [, n]) => a + n, 0);
      say("");
      say(`subset total ${String(subsetTotal)} vs dirty ticks ${String(fold.dirtyTicks)}: ${subsetTotal === fold.dirtyTicks ? "MATCH" : "⛔ MISMATCH"} (every dirty tick has exactly one winner subset)`);
      expect(subsetTotal).toBe(fold.dirtyTicks);

      // ---- STATUS PARTITION — 1f-RESULT's gating abstention ----------------
      // "pocketChannelShares.ts partitions dirty ticks by WINNING CHANNEL, never by OUTPUT
      // STATUS." This cross-cuts the SAME fold, SAME ticks, by `published` — no second run, no
      // second reconstruction. The partition-internal consistency check below is the falsifier
      // for the CROSS-CUT specifically (distinct from the identity check above, which is the
      // falsifier for the reconstruction): every dirty tick belongs to exactly one status, so the
      // three status buckets must sum back to the overall dirty-tick count exactly.
      say("");
      say("=======================================================================");
      say("STATUS PARTITION — the same channel table, cross-cut by EMITTED STATUS (1f-RESULT)");
      say("=======================================================================");
      const byStatusSum = DIRTY_STATUSES.reduce((a, s) => a + statusFold.byStatus[s].dirtyTicks, 0);
      say("");
      say(
        `partition check: ${DIRTY_STATUSES.map((s) => `${s}=${String(statusFold.byStatus[s].dirtyTicks)}`).join(" + ")} ` +
          `= ${String(byStatusSum)} vs overall dirty ticks ${String(fold.dirtyTicks)}: ` +
          `${byStatusSum === fold.dirtyTicks ? "MATCH" : "⛔ MISMATCH"}`,
      );
      expect(byStatusSum).toBe(fold.dirtyTicks);
      for (const s of DIRTY_STATUSES) {
        renderChannelTable(statusFold.byStatus[s], `STATUS = ${s}`);
      }
      say("");
      say(
        "NOTE: inside each STATUS = … table, EXCLUSIVE/all-ticks and EXCLUSIVE/dirty-ticks columns " +
          "are numerically IDENTICAL. That is not a bug — every tick fed to a status bucket is " +
          "already dirty by construction (its `published` IS that status), so there is no CLEAN " +
          "population left inside the bucket for the two denominators to differ over.",
      );

      // ---- ARRIVAL'S EXCLUSIVE SHARE, DECOMPOSED BY STATUS — the number 1f's ruling assumed ---
      say("");
      say("### ARRIVAL'S EXCLUSIVE SHARE, BY EMITTED STATUS — this is what 1f's ruling was built on and never measured");
      say("");
      const arrivalExclusiveTotal = fold.exclusiveOfDirty.arrival;
      const arrivalExclusiveByStatusSum = DIRTY_STATUSES.reduce(
        (a, s) => a + statusFold.byStatus[s].exclusiveOfDirty.arrival,
        0,
      );
      say(
        `arrival exclusive-of-dirty, overall: ${String(arrivalExclusiveTotal)} ticks ` +
          `(${pct(arrivalExclusiveTotal, fold.dirtyTicks)} of all dirty ticks)`,
      );
      say(
        `sum over the three statuses: ${String(arrivalExclusiveByStatusSum)} — ` +
          `${arrivalExclusiveByStatusSum === arrivalExclusiveTotal ? "MATCH" : "⛔ MISMATCH"} against the overall count`,
      );
      expect(arrivalExclusiveByStatusSum).toBe(arrivalExclusiveTotal);
      say("");
      say("| status | arrival-exclusive ticks | share of arrival's OWN exclusive total | share of ALL dirty ticks |");
      say("|---|---|---|---|");
      for (const s of DIRTY_STATUSES) {
        const n = statusFold.byStatus[s].exclusiveOfDirty.arrival;
        say(`| ${s} | ${String(n)} | ${pct(n, arrivalExclusiveTotal)} | ${pct(n, fold.dirtyTicks)} |`);
      }

      // ---- THE DEMOTE-VS-CLEAR DISTINCTION, PER CHANNEL, PER STATUS ---------
      // `pressure_rate` (a DIAGNOSTIC_MEASURES entry elsewhere in this package, see
      // pocketLadder.ts) counts ANY non-CLEAN tick. So within one channel's STATUS = COLLAPSING
      // table above: its ALONE count is ticks that would go fully CLEAR if that channel alone
      // were neutralised (nothing else is non-CLEAN on those ticks); its TIED+DOMINATED count
      // ("not ALONE") is ticks where at least one other channel is independently non-CLEAN, so
      // neutralising this channel's OWN contribution would still leave the tick at whatever THAT
      // other channel reads — which this fold does not further resolve (see the report's
      // abstention: it would require re-deriving each channel's own status distribution
      // conditional on being dominated, which this cross-cut does not compute).
      say("");
      say("### THE DEMOTE-VS-CLEAR DISTINCTION, PER CHANNEL, READ OFF THE STATUS TABLES ABOVE");
      say("");
      say(
        "`pressure_rate` counts any non-CLEAN tick, so it is BLIND to a channel change that moves a " +
          "tick from COLLAPSING to PRESSURE (both non-CLEAN) and can only ever see a change that " +
          "moves a tick to or from CLEAN. For each channel, on STATUS = COLLAPSING and STATUS = " +
          "IMMEDIATE ticks: ALONE is the count that would go fully CLEAR (and therefore move " +
          "`pressure_rate`) if that channel's own contribution were removed; TIED+DOMINATED is the " +
          "count that would NOT (another channel is independently non-CLEAN on the same tick, so " +
          "`pressure_rate` stays put regardless of what happens to THIS channel).",
      );
      say("");
      say("| channel | status | would CLEAR (ALONE) | would NOT clear (TIED+DOMINATED) |");
      say("|---|---|---|---|");
      for (const s of ["COLLAPSING", "IMMEDIATE"] as const) {
        const f = statusFold.byStatus[s];
        for (const id of CHANNEL_IDS) {
          const notClear = f.dirtyTicks - f.alone[id];
          say(
            `| ${LABEL[id]} | ${s} | ${String(f.alone[id])} (${pct(f.alone[id], f.dirtyTicks)}) | ` +
              `${String(notClear)} (${pct(notClear, f.dirtyTicks)}) |`,
          );
        }
      }

      // ---- ALIGNMENT SPLIT ON THE arrival+bandFloor TIE ---------------------
      // Finding 3 (1f-RESULT): RUSHER_WINS_REP both drives the band floor to COLLAPSING AND
      // creates/refreshes the arrival clock, and for an INTERIOR rusher the two constants
      // (INTERIOR travel 1.0s, collapsingWithinSeconds 1.0) meet EXACTLY at creation. The
      // enumeration flagged this tie subset as unmeasured by alignment. Taken cheaply here off
      // `TickChannels.arrivalAlignment`, which names the alignment of the rusher whose ETA sets
      // channel 3's value — see that field's doc comment for exactly what it does and does not
      // establish (it is NOT asserted to be the same rusher who set the band floor).
      say("");
      say("=======================================================================");
      say("ALIGNMENT SPLIT ON THE arrival+bandFloor TIE (1f-RESULT Finding 3, cheap extension)");
      say("=======================================================================");
      const tieTotal = tieAlignment.interior + tieAlignment.edge + tieAlignment.unattributed;
      const subsetFromTable = fold.winnerSubsets.get("arrival+bandFloor") ?? 0;
      say("");
      say(
        `tie-alignment ticks classified: ${String(tieTotal)} vs "arrival+bandFloor" row of the TIE ` +
          `STRUCTURE table above: ${String(subsetFromTable)} — ` +
          `${tieTotal === subsetFromTable ? "MATCH" : "⛔ MISMATCH"} (same predicate, computed twice)`,
      );
      expect(tieTotal).toBe(subsetFromTable);
      say("");
      say("| argmin-arrival rusher's alignment | ticks | share of the arrival+bandFloor tie |");
      say("|---|---|---|");
      say(`| INTERIOR (travel 1.0s — the exact-coincidence case) | ${String(tieAlignment.interior)} | ${pct(tieAlignment.interior, tieTotal)} |`);
      say(`| EDGE (travel 1.5–2.0s — not the coincident case) | ${String(tieAlignment.edge)} | ${pct(tieAlignment.edge, tieTotal)} |`);
      say(`| unattributed (pursuit clock live, or no live threat) | ${String(tieAlignment.unattributed)} | ${pct(tieAlignment.unattributed, tieTotal)} |`);
      say("");
      say(
        "ABSTENTION: this attributes the tie to the alignment of the rusher whose ETA determines " +
          "channel 3's value on the tied tick. It does NOT establish that the SAME rusher set " +
          "channel 2's band floor — `previousBand` is a worst-of across every rusher with a live " +
          "matchup and can persist from an earlier tick after the argmin-arrival rusher has " +
          "changed, and this fold does not track band-floor provenance per rusher. So an INTERIOR " +
          "row here is consistent with Finding 3's exact-coincidence mechanism but is not a proof " +
          "that every counted tick IS that mechanism specifically (as opposed to an INTERIOR " +
          "rusher's arrival tying against a DIFFERENT rusher's stale COLLAPSING band). Resolving " +
          "that fully would require tracking, per rusher, which CHECK last set its `previousBand` " +
          "and cross-referencing that rusher's id against the argmin-arrival rusher's id — not " +
          "computed here.",
      );

      say("");
      say(`dropbacks ${String(dropbacks)} · games ${String(gamesRun)}`);
    },
  );
});
