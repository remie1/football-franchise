/**
 * PRICING THE SCALE AUDIT'S FINDINGS — env-gated tier B.
 *
 *     FF_SCALE_AUDIT=1 pnpm --filter @ff/calibration exec vitest run test/scaleAudit.measure.test.ts
 *
 * ⚠ **TIER 3 IN CHARTER §4.1's REGISTER — bounded and UNVERIFIABLE.** Nothing in CI can tell whether
 * a human typed the variable, and a tree in which a resolver started reading one of the cells below
 * is byte-identical under `pnpm test`. It is gated for the same reason `FF_BAND_GATE` is: the corpus
 * costs ~14 s a run and this file makes eight of them.
 *
 * ================== RAW AND EXCLUSIVE, AND WHY BOTH (calibration.md §5.3) ==================
 *
 * *"A count that clears the precondition can still be the wrong count."* ADR-032's raw count
 * over-stated its subject's reach by 40×, in the direction that flattered the sweep. So every
 * finding here carries two numbers:
 *
 *   RAW       — how often the corpus SELECTED the row the cell sits in. Read from the band census,
 *               which is the same instrument the band-table gate floors its exemptions with.
 *   EXCLUSIVE — how often the cell DECIDED anything. For a cell behind a guard this is provably
 *               ZERO, and the proof is a total one: perturb the cell to a value that would be
 *               unmissable if it were read, run the whole corpus, and compare the stream digest.
 *               An identical digest over 160 games is not a sample — it is the statement that the
 *               cell has no behavioural surface at all on this corpus.
 *
 * ================== WHAT IS NOT PRICED HERE, SAID OUT LOUD ==================
 *
 * Four findings are reported unpriced, and the reason is the same for all four: **a two-run diff
 * cannot produce a per-PLAY exclusive count when the change propagates.** Moving a release delay or
 * a route's ready time changes a play's outcome, which changes the down, which changes the drive,
 * which changes every subsequent play in the game — so "plays that differ" over-counts without
 * bound and "games that differ" under-counts. The honest options were to report a games-differ
 * figure as though it were a play count, or to say this. `calibration.md` §5.3: *a gap that is
 * reported is evidence; a gap that is averaged over is a fabricated observation wearing the
 * denominator of a real one.*
 *
 *   SA-03 `release.bands.6.delaySeconds`      — raw reported, exclusive DECLINED.
 *   SA-04 `pocket.readCapacityDelta.*`        — raw reported, exclusive DECLINED.
 *   SA-07 `route.readySeconds.DEEP`           — raw reported, exclusive DECLINED.
 *   SA-18 `ballCarrier.zones.3.widthYards`    — ALREADY PRICED by backlog entry 12 at −1.842 y/c
 *                                               alone and −6.293 jointly with
 *                                               `freeRunReachesGoalLine` on `DEFAULT_TUNABLES`,
 *                                               496 games, seeds `baseline-0001`. Re-pricing it
 *                                               here at 160 games would be a worse measurement of a
 *                                               settled number, and per attribution rule 3 the
 *                                               share is a statement about that tunables point.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES, applyTunablePatch, type TunablePatch } from "@ff/engine";
import { BAND_GATE_CORPUS, censusRowReach, runCorpus } from "../src/knownTruth/bandTables.js";

const ENABLED = process.env.FF_SCALE_AUDIT === "1";
const d = ENABLED ? describe : describe.skip;

/** The same 160-game flat-60 corpus the band gate uses, so a reach here is commensurable with one there. */
const CORPUS = BAND_GATE_CORPUS;

function patch(tunableId: string, currentValue: number, proposedValue: number): TunablePatch {
  return {
    tunableId,
    currentValue,
    proposedValue,
    evidence: "Phase 3 systematic scale audit — exclusive-reach probe",
    expectedEffect:
      "NONE if the cell is behind a guard. A digest change proves it is read and the finding " +
      "changes class from a dead cell to a live invented value.",
  };
}

/**
 * The cells this audit claims are answers to questions never asked. Each is perturbed to a value
 * that could not possibly be mistaken for the original if anything read it.
 *
 * ⚠ The perturbations are deliberately ABSURD rather than adjacent. An adjacent value can produce an
 * identical stream by rounding, and an identical stream would then read as a proof of deadness that
 * is really a proof of insensitivity — the same confusion between *not observed* and *not present*
 * §4.1's register exists to stop.
 */
const DEAD_CELL_PROBES: readonly { readonly finding: string; readonly patch: TunablePatch }[] = [
  { finding: "SA-01", patch: patch("throwExec.accuracy.bands.6.catchMod", 0, 77) },
  { finding: "SA-01", patch: patch("throwExec.accuracy.bands.6.defenderContestMod", 0, -77) },
  { finding: "SA-01", patch: patch("throwExec.accuracy.bands.6.difficulty", 0, 77) },
  { finding: "SA-01", patch: patch("ballCarrier.catchTransition.byAccuracyBand.MISS", 0, 77) },
  { finding: "SA-01", patch: patch("ballCarrier.yacMultiplierByAccuracyBand.MISS", 0, 7) },
  { finding: "SA-16", patch: patch("tippedBall.qualityBands.5.speedCheckFromDistance", 99, 0) },
];

d("scale audit — pricing", () => {
  it(
    "reports RAW reach for every band row a finding sits in",
    { timeout: 600_000 },
    () => {
      const observed = runCorpus(DEFAULT_TUNABLES, CORPUS, { countBands: true });
      const census = censusRowReach(DEFAULT_TUNABLES, observed);
      const raw = (checkKind: string, band: string): number =>
        observed.bandCounts.get(`${checkKind}\u0000${band}`) ?? 0;

      const rows = [
        ["SA-01 accuracy MISS               ", raw("accuracy", "MISS")],
        ["SA-16 deflection_quality DEAD     ", raw("deflection_quality", "DEAD")],
        ["SA-03 release ROUTE_DISRUPTED     ", raw("release_vs_press", "ROUTE_DISRUPTED")],
        ["SA-R2 yac DEFENDER_MISSED         ", raw("yac_tackle", "DEFENDER_MISSED")],
        ["SA-R2 secondLevel BROKEN_TACKLE   ", raw("break_tackle", "BROKEN_TACKLE")],
        ["SA-14 catch (routine path)        ", raw("catch", "SECURED") + raw("catch", "CAUGHT_SLIGHT_BOBBLE") +
          raw("catch", "CAUGHT_AFTER_BOBBLE") + raw("catch", "DROPPED_TIP_POSSIBLE") +
          raw("catch", "DROPPED_CLEANLY") + raw("catch", "NOT_CLOSE")],
        ["SA-14 contested_catch (all bands) ", [
          "CLEAN_CATCH", "CATCH_TIP_RISK", "CATCH_HIGH_TIP_RISK", "TIP_BALL", "PBU_TIP", "CLEAN_PBU", "INTERCEPTION",
        ].reduce((n, b) => n + raw("contested_catch", b), 0)],
        ["      contested_catch INTERCEPTION", raw("contested_catch", "INTERCEPTION")],
      ] as const;

      console.log(
        `\nRAW REACH — ${String(observed.games)} games, ${String(observed.plays)} plays, ` +
          `seeds ${observed.seedDigest}, digest ${observed.digest}`,
      );
      for (const [label, n] of rows) console.log(`  ${label} ${String(n)}`);
      console.log(
        `  (census: ${String(census.labelsEmitted)} band labels attributed; ` +
          `${String(census.unattributableKinds.length)} unattributable check kinds)`,
      );

      expect(observed.games).toBe(CORPUS.games);
      expect(observed.plays).toBeGreaterThan(0);
    },
  );

  it(
    "proves EXCLUSIVE = 0 for every cell claimed dead — total comparison, not a sample",
    { timeout: 1_800_000 },
    () => {
      const base = runCorpus(DEFAULT_TUNABLES, CORPUS);
      const live: string[] = [];
      for (const probe of DEAD_CELL_PROBES) {
        const moved = runCorpus(applyTunablePatch(DEFAULT_TUNABLES, probe.patch), CORPUS);
        const identical = moved.digest === base.digest;
        console.log(
          `  ${probe.finding} ${probe.patch.tunableId.padEnd(52)} ` +
            `${String(probe.patch.currentValue)} → ${String(probe.patch.proposedValue)}  ` +
            `${identical ? "EXCLUSIVE 0 (stream identical)" : "LIVE — stream moved"}`,
        );
        if (!identical) live.push(probe.patch.tunableId);
      }
      // A cell that turns out to be READ is not a smaller finding — it is a DIFFERENT one, and the
      // audit's classification of it would be wrong. Red is correct here.
      expect(live).toEqual([]);
    },
  );

  it(
    "prices SA-14 — the contested-catch population §11.1's own words ask for",
    { timeout: 900_000 },
    () => {
      const base = runCorpus(DEFAULT_TUNABLES, CORPUS, { countBands: true });
      // 30 → 40 admits §9.3's SEPARATION_HALF_YARD (openness 40, half a yard) and EVEN_BRACKET (32,
      // a dead-even rep). NAMED, per §22a: nothing else is held — this is a single-cell move and the
      // catch population it re-routes is the same population in both arms.
      const moved = runCorpus(
        applyTunablePatch(DEFAULT_TUNABLES, patch("catching.contestedMaxOpenness", 30, 40)),
        CORPUS,
        { countBands: true },
      );
      const total = (o: typeof base, kind: string, bands: readonly string[]): number =>
        bands.reduce((n, b) => n + (o.bandCounts.get(`${kind}\u0000${b}`) ?? 0), 0);
      const CONTESTED = [
        "CLEAN_CATCH", "CATCH_TIP_RISK", "CATCH_HIGH_TIP_RISK", "TIP_BALL", "PBU_TIP", "CLEAN_PBU", "INTERCEPTION",
      ] as const;
      const ROUTINE = [
        "SECURED", "CAUGHT_SLIGHT_BOBBLE", "CAUGHT_AFTER_BOBBLE", "DROPPED_TIP_POSSIBLE", "DROPPED_CLEANLY", "NOT_CLOSE",
      ] as const;

      const baseContested = total(base, "contested_catch", CONTESTED);
      const movedContested = total(moved, "contested_catch", CONTESTED);
      const baseRoutine = total(base, "catch", ROUTINE);
      const movedRoutine = total(moved, "catch", ROUTINE);
      const baseInt = base.bandCounts.get("contested_catch\u0000INTERCEPTION") ?? 0;
      const movedInt = moved.bandCounts.get("contested_catch\u0000INTERCEPTION") ?? 0;

      console.log(
        `\nSA-14 catching.contestedMaxOpenness 30 → 40, ${String(CORPUS.games)} games\n` +
          `  contested resolutions  ${String(baseContested)} → ${String(movedContested)} ` +
          `(Δ ${String(movedContested - baseContested)})\n` +
          `  routine resolutions    ${String(baseRoutine)} → ${String(movedRoutine)} ` +
          `(Δ ${String(movedRoutine - baseRoutine)})\n` +
          `  INTERCEPTION band      ${String(baseInt)} → ${String(movedInt)} ` +
          `(Δ ${String(movedInt - baseInt)})\n` +
          `  ⚠ The two arms are NOT a clean population diff — a re-routed catch changes the play, ` +
          `which changes the drive. Read the CONTESTED delta as the exclusive reach and the other ` +
          `two as contaminated by propagation.`,
      );
      expect(base.digest).not.toBe(moved.digest);
    },
  );
});
