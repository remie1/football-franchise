/**
 * ============================================================================
 * THE §7.1 BAND CENSUS — CORPUS. Precondition for ruling 2's re-measurement (entry 68-RESULT).
 * ============================================================================
 *
 *   FF_BC=1 pnpm --filter @ff/calibration exec vitest run test/bandCensus.measure.test.ts
 *   FF_BC=1 FF_BC_GAMES=496 FF_BC_SETS=0,1,2,3 ...
 *
 * ⚠ TIER 3 (Charter §4.1): env-gated. ⚠ MEASUREMENT ONLY: `DEFAULT_TUNABLES`, unpatched, on the
 * COMMITTED tree — the census this dispatch was asked for is about the tree as it ships, not a
 * mechanism base. `packages/engine/src/tunables.ts` is untouched by anything here.
 *
 * ================== WHAT THIS ANSWERS, IN ORDER ==================
 *
 *  1. Every band's share of all `pass_rush_tick` reps (all six, not just `BLOCKER_BEATEN`).
 *  2. `BLOCKER_BEATEN`'s share against the PRE-SPLIT combined 1-14 range
 *     (`BLOCKER_BEATEN` ÷ (`BLOCKER_BEATEN` + `RUSHER_GAINING`)) — the split's effect, made visible.
 *  3. The retirement decomposition: of ADR-049 P2's retirements (§7.1 reps in
 *     `P2_RETIRE_ELIGIBLE_BANDS` where the same rusher already carries a live threat —
 *     `src/knownTruth/bandCensus.ts`'s `p2Retirements`), what fraction is `BLOCKER_BEATEN`
 *     (DEMOTING — `BLOCKER_BEATEN → PRESSURE` re-dirties the tick the retirement would otherwise
 *     have cleared) versus the other three (CLEARING).
 *  4. How often a `BLOCKER_BEATEN` rep coincides with a live arrival clock on the same rusher — the
 *     SAME quantity as `p2Retirements.BLOCKER_BEATEN`, reported against `byBand.BLOCKER_BEATEN` as
 *     its own denominator rather than folded silently into #3, per entry 69's "state both
 *     denominators wherever a share appears".
 *
 * ================== SEED LABEL — OWN PREFIX, PER ENTRY 70 ==================
 *
 * `bc-` — does not share a constant with `pocketChannelShares.test.ts`'s `pcs-` or
 * `pressureHorizonChannelShares.test.ts`'s `phcs-`. Set 0 is `"baseline-0001"`, identical to both of
 * those (the shared common baseline every Tier-3 harness in this package opens with); every set above
 * 0 is derived from this file's OWN label, so a future cross-check against either sibling instrument
 * is cross-validation on an independent sample, not a tautology (entry 70's ruling, same reasoning,
 * applied to a third file rather than re-litigated).
 *
 * ================== WHAT WOULD MAKE THIS GO RED (backlog entry 55) ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | the six-band table is a partition | `sum(byBand) !== reps` |
 * | the corpus exercises §7.1 | fewer than 10,000 `pass_rush_tick` reps (ADR-050's own floor) |
 * | `p2Retirements` never exceeds its own band's population | `p2Retirements[b] > byBand[b]` for any `b` |
 * | `p2Retirements` is confined to the eligible set | any nonzero entry outside `P2_RETIRE_ELIGIBLE_BANDS` |
 * | the seed lists are independent | two sets producing an identical seed digest |
 * | the tree measured is the committed one | `tunablesDigest` differing from `DEFAULT_TUNABLES`'s own |
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
  BAND_LABELS,
  P2_RETIRE_ELIGIBLE_BANDS,
  dirtiesFloor,
  emptyBandCensusFold,
  foldGameBandCensus,
  mergeBandCensusFold,
  type BandCensusFold,
} from "../src/knownTruth/bandCensus.js";

const ENABLED = process.env["FF_BC"] === "1";
const GAMES = Number(process.env["FF_BC_GAMES"] ?? "496");
const SETS = (process.env["FF_BC_SETS"] ?? "0")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n >= 0);

/** Set 0 shared with every sibling Tier-3 harness in this package; sets above 0 are `bc-`-own (entry 70). */
function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/bc-set-${String(set)}`;
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
}

describe.skipIf(!ENABLED)("§7.1 band census — precondition for ruling 2 (entry 68-RESULT)", () => {
  it(
    "folds every pass_rush_tick rep on the committed tree and reports the six-band table, the pre-split share, the retirement decomposition, and the arrival-clock coincidence",
    { timeout: 6 * 60 * 60_000 },
    () => {
      const tunables = DEFAULT_TUNABLES;
      const index = indexLeague(buildFlatLeague({ teams: 32 }));
      const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
      const limit = Math.min(GAMES, fixtures.length);

      const fold: BandCensusFold = emptyBandCensusFold();
      const perSet: { set: number; fold: BandCensusFold }[] = [];
      let gamesRun = 0;
      const seedDigests: string[] = [];

      for (const set of SETS) {
        const seeds = generateSeeds(batchSeedFor(set), fixtures.length);
        const used: string[] = [];
        const setFold = emptyBandCensusFold();
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
          const gameFold = emptyBandCensusFold();
          foldGameBandCensus(gameFold, output.observation.events);
          mergeBandCensusFold(setFold, gameFold);
          used.push(seed);
          gamesRun += 1;
        }
        mergeBandCensusFold(fold, setFold);
        perSet.push({ set, fold: setFold });
        seedDigests.push(`${String(set)} → ${digestSeeds(used)}`);
      }

      say("");
      say("=======================================================================");
      say("§7.1 BAND CENSUS — precondition for ruling 2's re-measurement (entry 68-RESULT)");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(GAMES)} games/set × ${String(SETS.length)} set(s), ${String(gamesRun)} games total`);
      say(`seed digests: ${seedDigests.join(" · ")}`);
      say(`tunablesDigest: ${stableDigest(tunables)} (DEFAULT_TUNABLES, unpatched, committed tree)`);
      say("MEASUREMENT ONLY — no tunable moved, nothing priced. PROPOSE NO LEVER.");
      say("=======================================================================");

      // ---- STRUCTURAL FALSIFIER: the six bands partition every rep -----------
      const sumByBand = BAND_LABELS.reduce((a, b) => a + fold.byBand[b], 0);
      say("");
      say(`partition check: sum(byBand) = ${String(sumByBand)} vs fold.reps = ${String(fold.reps)}`);
      expect(sumByBand).toBe(fold.reps);
      expect(fold.reps).toBeGreaterThanOrEqual(10_000);

      for (const b of BAND_LABELS) {
        expect(fold.p2Retirements[b]).toBeLessThanOrEqual(fold.byBand[b]);
        if (!P2_RETIRE_ELIGIBLE_BANDS.includes(b)) expect(fold.p2Retirements[b]).toBe(0);
      }

      // ---- §1 — THE SIX-BAND TABLE -------------------------------------------
      say("");
      say(`### §1 — EVERY BAND'S SHARE OF ALL ${String(fold.reps)} pass_rush_tick REPS`);
      say("");
      say("| band | reps | share of all reps | P2-eligible? | dirties floor (PRESSURE)? |");
      say("|---|---|---|---|---|");
      for (const b of BAND_LABELS) {
        say(
          `| ${b} | ${String(fold.byBand[b])} | ${pct(fold.byBand[b], fold.reps)} | ` +
            `${P2_RETIRE_ELIGIBLE_BANDS.includes(b) ? "yes" : "no"} | ${dirtiesFloor(tunables, b) ? "yes" : "no"} |`,
        );
      }

      // ---- §2 — BLOCKER_BEATEN vs the pre-split combined 1-14 range ----------
      const preSplitCombined = fold.byBand.BLOCKER_BEATEN + fold.byBand.RUSHER_GAINING;
      say("");
      say("### §2 — BLOCKER_BEATEN AGAINST THE PRE-SPLIT COMBINED RANGE (ADR-033: RUSHER_GAINING was 1-14 before the split)");
      say("");
      say(`BLOCKER_BEATEN (5-14): ${String(fold.byBand.BLOCKER_BEATEN)} reps, ${pct(fold.byBand.BLOCKER_BEATEN, fold.reps)} of ALL reps`);
      say(`RUSHER_GAINING (1-4): ${String(fold.byBand.RUSHER_GAINING)} reps, ${pct(fold.byBand.RUSHER_GAINING, fold.reps)} of ALL reps`);
      say(`combined (the pre-split 1-14 range): ${String(preSplitCombined)} reps, ${pct(preSplitCombined, fold.reps)} of ALL reps`);
      say(`BLOCKER_BEATEN's share OF THE PRE-SPLIT RANGE: ${pct(fold.byBand.BLOCKER_BEATEN, preSplitCombined)}`);

      // ---- §3 — THE RETIREMENT DECOMPOSITION ---------------------------------
      const p2Total = P2_RETIRE_ELIGIBLE_BANDS.reduce((a, b) => a + fold.p2Retirements[b], 0);
      const demoting = fold.p2Retirements.BLOCKER_BEATEN;
      const clearingBands = P2_RETIRE_ELIGIBLE_BANDS.filter((b) => b !== "BLOCKER_BEATEN");
      const clearing = clearingBands.reduce((a, b) => a + fold.p2Retirements[b], 0);
      say("");
      say("### §3 — THE RETIREMENT DECOMPOSITION: of P2-eligible retirements, DEMOTING (BLOCKER_BEATEN) vs CLEARING (the other three)");
      say("");
      say(
        "A P2-eligible retirement = a pass_rush_tick rep in P2_RETIRE_ELIGIBLE_BANDS where the same " +
          "rusher already carried a live threat (`before !== undefined`) — the population " +
          "`passPlay.ts`'s clearsThreat branch would fire RESET for if that band's `reset` flag were " +
          "true. BLOCKER_BEATEN maps to pocket.minimumStatusByBand=PRESSURE (a DIRTY floor), so a " +
          "BLOCKER_BEATEN-triggered retirement removes the arrival clock AND re-dirties the same tick " +
          "via the band floor — a DEMOTION, not a clear. The other three map to CLEAN, so their " +
          "retirement genuinely clears.",
      );
      say("");
      say("| band | P2 retirements | share of P2-eligible retirements | demotes or clears |");
      say("|---|---|---|---|");
      for (const b of P2_RETIRE_ELIGIBLE_BANDS) {
        say(
          `| ${b} | ${String(fold.p2Retirements[b])} | ${pct(fold.p2Retirements[b], p2Total)} | ` +
            `${dirtiesFloor(tunables, b) ? "DEMOTES" : "clears"} |`,
        );
      }
      say("");
      say(`total P2-eligible retirements: ${String(p2Total)}`);
      say(`DEMOTING (BLOCKER_BEATEN): ${String(demoting)} — ${pct(demoting, p2Total)} of P2-eligible retirements`);
      say(`CLEARING (RUSHER_GAINING + STALEMATE + BLOCKER_CONTAINS): ${String(clearing)} — ${pct(clearing, p2Total)} of P2-eligible retirements`);
      expect(demoting + clearing).toBe(p2Total);

      // ---- §4 — ARRIVAL-CLOCK COINCIDENCE, AGAINST BLOCKER_BEATEN'S OWN POPULATION ---
      say("");
      say("### §4 — HOW OFTEN A BLOCKER_BEATEN REP COINCIDES WITH A LIVE ARRIVAL CLOCK ON THE SAME RUSHER");
      say("");
      say(
        "Same numerator as §3's DEMOTING row (`p2Retirements.BLOCKER_BEATEN`), reported against " +
          "BLOCKER_BEATEN's OWN population as the denominator rather than the P2-eligible-retirement " +
          "total — this is the population where the demote-versus-clear distinction actually bites, " +
          "per entry 69's rule to state both denominators wherever a share of this population appears.",
      );
      say("");
      say(`BLOCKER_BEATEN reps: ${String(fold.byBand.BLOCKER_BEATEN)}`);
      say(`… of which coincide with a live arrival clock on the same rusher: ${String(demoting)} — ${pct(demoting, fold.byBand.BLOCKER_BEATEN)} of BLOCKER_BEATEN reps`);
      say(`… and that same count as a share of ALL P2-eligible retirements (§3, restated): ${pct(demoting, p2Total)}`);
      say(`… and as a share of ALL reps: ${pct(demoting, fold.reps)}`);

      // ---- STABILITY ACROSS INDEPENDENT SEED SETS ----------------------------
      // §22a's rule (ladderOccupancy.measure.test.ts): report each list separately with the SD
      // across lists printed beside the rate, so agreement is evidence rather than assumed.
      if (perSet.length > 1) {
        const mean = (xs: readonly number[]): number => xs.reduce((a, x) => a + x, 0) / xs.length;
        const sd = (xs: readonly number[]): number => {
          const m = mean(xs);
          return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
        };
        const bbShareAll = perSet.map((s) => (100 * s.fold.byBand.BLOCKER_BEATEN) / s.fold.reps);
        const bbShareCombined = perSet.map((s) => {
          const c = s.fold.byBand.BLOCKER_BEATEN + s.fold.byBand.RUSHER_GAINING;
          return c === 0 ? 0 : (100 * s.fold.byBand.BLOCKER_BEATEN) / c;
        });
        const demoteShare = perSet.map((s) => {
          const t = P2_RETIRE_ELIGIBLE_BANDS.reduce((a, b) => a + s.fold.p2Retirements[b], 0);
          return t === 0 ? 0 : (100 * s.fold.p2Retirements.BLOCKER_BEATEN) / t;
        });
        const coincidenceRate = perSet.map((s) =>
          s.fold.byBand.BLOCKER_BEATEN === 0
            ? 0
            : (100 * s.fold.p2Retirements.BLOCKER_BEATEN) / s.fold.byBand.BLOCKER_BEATEN,
        );
        say("");
        say("=======================================================================");
        say(`STABILITY — ${String(perSet.length)} INDEPENDENT SEED SETS ("bc-" prefix), SD ACROSS SETS`);
        say("=======================================================================");
        say("");
        say("| set | BLOCKER_BEATEN % of all reps | % of pre-split combined | % of P2-elig. retirements (DEMOTING) | % of own reps w/ live clock |");
        say("|---|---|---|---|---|");
        for (let i = 0; i < perSet.length; i++) {
          say(
            `| ${String(perSet[i]?.set)} | ${(bbShareAll[i] ?? 0).toFixed(3)}% | ${(bbShareCombined[i] ?? 0).toFixed(3)}% | ` +
              `${(demoteShare[i] ?? 0).toFixed(3)}% | ${(coincidenceRate[i] ?? 0).toFixed(3)}% |`,
          );
        }
        say(
          `| **mean / SD** | **${mean(bbShareAll).toFixed(3)}% / ${sd(bbShareAll).toFixed(3)}pp** | ` +
            `**${mean(bbShareCombined).toFixed(3)}% / ${sd(bbShareCombined).toFixed(3)}pp** | ` +
            `**${mean(demoteShare).toFixed(3)}% / ${sd(demoteShare).toFixed(3)}pp** | ` +
            `**${mean(coincidenceRate).toFixed(3)}% / ${sd(coincidenceRate).toFixed(3)}pp** |`,
        );
      }

      say("");
      say(`games ${String(gamesRun)}`);
    },
  );
});
