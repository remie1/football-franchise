/**
 * ============================================================================
 * RULING 2's RE-MEASUREMENT — ON THE COMMITTED TREE, FULLY DE-CONFOUNDED.
 * ============================================================================
 *
 *   FF_R2C=1 pnpm --filter @ff/calibration exec vitest run test/ruling2CommittedDispatch.test.ts
 *   FF_R2C=1 FF_R2C_GAMES=496 FF_R2C_SETS=0,1,2,3 ...
 *
 * ⚠ TIER 3 (Charter §4.1): env-gated. ⚠ MEASUREMENT ONLY (ADR-027): `DEFAULT_TUNABLES`, unpatched.
 * `packages/engine/src/tunables.ts` is not written by anything in this file.
 *
 * CALIBRATION-BACKLOG entries 72/73/76/71-RESULT/68/ADR-049 §9. Ruling 2's THREE original confounds
 * (metric blindness to demotion; `retireOn`'s P2 ceiling; the unbounded pressure horizon) are ALL
 * closed — see `src/knownTruth/ruling2CommittedRetirement.ts`'s header for the citation chain. This
 * dispatch answers the question entry 72 sequenced ahead of everything else: what does GEOMETRY and
 * TIME retirement add ON TOP OF the committed tree, where entry 73's sustained-containment route
 * (`containRetiresAfterConsecutiveContains: 2`) is already live and already inside `published`.
 *
 * ================== §RESULT-0 — THE PREMISE LEDGER, COMPUTED, NOT TRANSCRIBED ==================
 *
 * Every quoted fact in the brief is re-derived from the committed tree before anything else runs, per
 * Charter §4.1: "a claim is unverified until something computes it." Reported whichever way it comes
 * out, including confirmations — the signal is that the premise was computed, not that a defect was
 * found (standing instruction, this brief's own text).
 *
 * ================== THE OUTCOME VARIABLE IS SEVERITY (entries 67-RESULT/68), NOT THE RATE ==================
 *
 * `pocket_status_distribution` leads every table below. `dirtyTickShare` (`100 − CLEAN%`, PER TICK) is
 * derived from the same distribution and reported ALONGSIDE it, never as the criterion a lever is
 * priced against.
 *
 * ⛔ RENAME RECORD (entry 69's discipline; backlog entry 80's standing prohibition): this column was
 * previously rendered and labelled `pressure_rate`. It is NOT `pressure_rate` — that metric
 * (`tier1.ts`, `pocketLadder.ts`) is `1 − P(every tick CLEAN)` PER PLAY (~90% on the canonical corpus);
 * this column is `100 − CLEAN%` PER TICK, the DIRTY-TICK SHARE (~63.9–70.5% across arms on the same
 * corpus). The two are ~20pp apart because one dirty tick anywhere in a multi-tick dropback is enough
 * to make the whole PLAY count as pressured, so the play-level rate is always ≥ the tick-level share.
 * The old label invited the exact tier-vs-cumulative conflation ADR-050 named. ⛔ Nothing may cite this
 * column's `63.876%` (joint arm) as progress toward `pressure_rate`'s real-NFL comparison `29.225%` —
 * they are different quantities; see CALIBRATION-BACKLOG entry 80's prohibition, restated here because
 * the column carried the old name, not just the report's prose.
 *
 * ================== ⛔ THE LOWER-BOUND CAVEAT, AT FULL STRENGTH — RESTATED, NOT WEAKENED BY THE RE-READ ==================
 *
 * Every arm below holds EVERY quarterback decision fixed at what the published stream actually did.
 * A live retirement rule would also change STEP_UP/HOLD/SCRAMBLE choices on later ticks and which
 * `pass_rush_tick` reps are even rolled. None of that is recomputed. This dispatch can only ever
 * produce a LOWER BOUND on Ruling 2's reach on SEVERITY, and it says nothing about SACK or
 * COMPLETION — a re-measurement does not upgrade a lower bound into a price (entry 72's own words,
 * quoted rather than paraphrased).
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { stableDigest } from "../src/harness/digest.js";
import { runOneGame } from "../src/harness/runGame.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds, digestSeeds } from "../src/harness/seeds.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { emptyAccumulator, foldGame, type SimAccumulator } from "../src/metrics/collect.js";
import {
  emptyRuling2Fold,
  foldGameRuling2,
  mergeRuling2Fold,
  RETIREMENT_ARMS,
  type RetirementArm,
  type Ruling2Fold,
} from "../src/knownTruth/ruling2CommittedRetirement.js";
import {
  BAND_LABELS,
  emptyBandCensusFold,
  foldGameBandCensus,
  mergeBandCensusFold,
  P2_RETIRE_ELIGIBLE_BANDS,
  type BandCensusFold,
} from "../src/knownTruth/bandCensus.js";

const ENABLED = process.env["FF_R2C"] === "1";
const GAMES = Number(process.env["FF_R2C_GAMES"] ?? "496");
const SETS = (process.env["FF_R2C_SETS"] ?? "0")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n >= 0);

/**
 * ⛔ OWN SEED PREFIX (entry 70). `r2c-` is DISTINCT from `bc-` (`bandCensus.measure.test.ts`), `pcs-`
 * (`pocketChannelShares.test.ts`), `phcs-` (`pressureHorizonChannelShares.test.ts`), and
 * `ruling2-set-` (`ruling2Dispatch.test.ts`, the ARRIVAL-ONLY-base dispatch). Set 0 is `baseline-0001`
 * in every one of those files and is byte-identical; every set above 0 samples an INDEPENDENT
 * population, so a cross-check between this dispatch and any of the others is cross-validation, not
 * tautology (entries 66/70/74).
 */
function batchSeedFor(set: number): string {
  return set === 0 ? "baseline-0001" : `baseline-0001/r2c-set-${String(set)}`;
}

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}
function pct(n: number, d: number, places = 3): string {
  return d === 0 ? "—" : `${((n / d) * 100).toFixed(places)}%`;
}

// ---------------------------------------------------------------------------
// §RESULT-0 — THE PREMISE LEDGER
// ---------------------------------------------------------------------------

function reportPremises(bc: BandCensusFold): void {
  say("");
  say("### §RESULT-0 — PREMISE LEDGER, COMPUTED FROM THE COMMITTED TREE AND THIS CORPUS'S OWN BAND CENSUS");
  say("");
  const T = DEFAULT_TUNABLES;

  const p1 = T.arrival.containRetiresAfterConsecutiveContains === 2;
  say(
    `1. \`arrival.containRetiresAfterConsecutiveContains === 2\` (entry 73 shipped): ` +
      `${T.arrival.containRetiresAfterConsecutiveContains === 2 ? "CONFIRMED" : "⛔ CONFLICT"} ` +
      `(committed value: ${String(T.arrival.containRetiresAfterConsecutiveContains)})`,
  );
  say(
    `2. \`arrival.pressureWithinSeconds === 2.0\`, not POS_INF (entry 76 shipped): ` +
      `${T.arrival.pressureWithinSeconds === 2.0 ? "CONFIRMED" : "⛔ CONFLICT"} ` +
      `(committed value: ${String(T.arrival.pressureWithinSeconds)})`,
  );
  say(
    `3. \`RUSHER_WINS_REP\` excluded from \`P2_RETIRE_ELIGIBLE_BANDS\` (59-RESULT — never a confound): ` +
      `${!P2_RETIRE_ELIGIBLE_BANDS.includes("RUSHER_WINS_REP") ? "CONFIRMED" : "⛔ CONFLICT"} ` +
      `(set: ${P2_RETIRE_ELIGIBLE_BANDS.join(", ")})`,
  );
  const blockerContainsShareOfAll = bc.byBand.BLOCKER_CONTAINS / Math.max(1, bc.reps);
  const p2Total = BAND_LABELS.reduce((a, b) => a + bc.p2Retirements[b], 0);
  const blockerContainsShareOfP2 = bc.p2Retirements.BLOCKER_CONTAINS / Math.max(1, p2Total);
  say(
    `4. \`BLOCKER_CONTAINS\` share of all \`pass_rush_tick\` reps, RE-MEASURED on THIS corpus: ` +
      `${pct(bc.byBand.BLOCKER_CONTAINS, bc.reps)} (71-RESULT's canonical-N figure: 13.156%) — ` +
      `${Math.abs(blockerContainsShareOfAll * 100 - 13.156) < 1.5 ? "CONSISTENT (within 1.5pp, different N/seeds)" : "⚠ DIVERGES beyond 1.5pp — flagged, not silently reconciled"}`,
  );
  say(
    `5. \`BLOCKER_CONTAINS\` share of P2-ELIGIBLE-style retirements (live threat present at the CHECK, ` +
      `regardless of whether that route retires on the committed tree), RE-MEASURED: ` +
      `${pct(bc.p2Retirements.BLOCKER_CONTAINS, p2Total)} (71-RESULT's canonical-N figure: 50.024%) — ` +
      `${Math.abs(blockerContainsShareOfP2 * 100 - 50.024) < 5 ? "CONSISTENT (within 5pp, different N/seeds)" : "⚠ DIVERGES beyond 5pp — flagged, not silently reconciled"}`,
  );
  say("");
  say(
    "NOTE ON #4/#5's DENOMINATOR: this corpus's own band census is folded on `DEFAULT_TUNABLES` " +
      "(supply UNCORRECTED, i.e. `minMargin: 15`, matching this dispatch's own base) — the SAME tree " +
      "71-RESULT measured its committed-supply figures against, but a DIFFERENT, independently-seeded " +
      "corpus (`r2c-`, not `bc-`). Agreement is corroboration; a divergence beyond sampling noise would " +
      "be a live conflict brought here rather than buried.",
  );
  expect(p1).toBe(true);
}

// ---------------------------------------------------------------------------
// THE CORPUS RUNNER
// ---------------------------------------------------------------------------

interface Measured {
  readonly set: number;
  readonly acc: SimAccumulator;
  readonly r2: Ruling2Fold;
  readonly bc: BandCensusFold;
  readonly tunablesDigest: string;
  readonly seedDigest: string;
  readonly games: number;
  readonly wallMs: number;
}

function run(set: number): Measured {
  const index = indexLeague(buildFlatLeague({ teams: 32 }));
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds(batchSeedFor(set), fixtures.length);
  const limit = Math.min(GAMES, fixtures.length);
  const started = Date.now();
  const used: string[] = [];
  let acc = emptyAccumulator();
  const r2 = emptyRuling2Fold();
  const bc = emptyBandCensusFold();

  for (let i = 0; i < limit; i++) {
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
    acc = foldGame(acc, output.observation);
    foldGameRuling2(r2, output.observation.events, DEFAULT_TUNABLES);
    foldGameBandCensus(bc, output.observation.events);
    used.push(seed);
  }

  return {
    set,
    acc,
    r2,
    bc,
    tunablesDigest: stableDigest(DEFAULT_TUNABLES),
    seedDigest: digestSeeds(used),
    games: limit,
    wallMs: Date.now() - started,
  };
}

// ---------------------------------------------------------------------------
// RENDERING
// ---------------------------------------------------------------------------

function severityTotal(s: { CLEAN: number; PRESSURE: number; COLLAPSING: number; IMMEDIATE: number }): number {
  return s.CLEAN + s.PRESSURE + s.COLLAPSING + s.IMMEDIATE;
}

function renderSeverityDistribution(rows: readonly Measured[]): void {
  say("");
  say("### §RESULT-1 — LEADING: `pocket_status_distribution`, published vs each arm (all ticks)");
  say("");
  const merged = emptyRuling2Fold();
  for (const r of rows) mergeRuling2Fold(merged, r.r2);
  const total = severityTotal(merged.published);

  say(
    "| stream | CLEAN | PRESSURE | COLLAPSING | IMMEDIATE | dirtyTickShare (100 − CLEAN%, PER TICK — " +
      "NOT pressure_rate, reported alongside — NOT the criterion) |",
  );
  say("|---|---|---|---|---|---|");
  const renderRow = (label: string, s: typeof merged.published): void => {
    const dirtyTickShare = s.PRESSURE + s.COLLAPSING + s.IMMEDIATE;
    say(
      `| ${label} | ${pct(s.CLEAN, total)} | ${pct(s.PRESSURE, total)} | ${pct(s.COLLAPSING, total)} | ` +
        `${pct(s.IMMEDIATE, total)} | ${pct(dirtyTickShare, total)} |`,
    );
  };
  renderRow("published (committed tree, as shipped — entry 73 already inside this)", merged.published);
  renderRow("geometryOnly (Ruling 2, geometry alone, time held off)", merged.arm.geometryOnly);
  renderRow("timeOnly (Ruling 2, time alone, geometry held off)", merged.arm.timeOnly);
  renderRow("joint (Ruling 2, both rules live)", merged.arm.joint);
  say("");
  say(`total ticks folded: ${String(total)} (${String(merged.dropbacks)} PASS dropbacks)`);
}

function renderDemoteClear(rows: readonly Measured[]): void {
  say("");
  say("### §RESULT-2 — DEMOTE vs CLEAR, per arm (entry 71-RESULT's question, restated for geometry/time)");
  say("");
  const merged = emptyRuling2Fold();
  for (const r of rows) mergeRuling2Fold(merged, r.r2);
  const dirtyTotal = merged.published.PRESSURE + merged.published.COLLAPSING + merged.published.IMMEDIATE;

  say("| arm | touched | touched / dirty ticks | demoted | demoted / touched | cleared | cleared / touched |");
  say("|---|---|---|---|---|---|---|");
  for (const arm of RETIREMENT_ARMS) {
    const dc = merged.armDemoteClear[arm];
    say(
      `| ${arm} | ${String(dc.touched)} | ${pct(dc.touched, dirtyTotal)} | ${String(dc.demoted)} | ` +
        `${pct(dc.demoted, dc.touched)} | ${String(dc.cleared)} | ${pct(dc.cleared, dc.touched)} |`,
    );
  }
  say("");
  say(`dirty published ticks (denominator for "touched / dirty ticks"): ${String(dirtyTotal)}`);
  say(
    "A tick NOT touched was either never retirement's business (no live threat this rule could reach) " +
      "or another channel (counter/bandFloor, or a DIFFERENT live threat) already held the same floor — " +
      "not distinguished further here; see §RESULT-1 for the aggregate severity shift this produces.",
  );
}

function renderRetiredCounts(rows: readonly Measured[]): void {
  say("");
  say("### §RESULT-3 — retirement counts, per arm, per 1000 dropbacks");
  say("");
  const merged = emptyRuling2Fold();
  for (const r of rows) mergeRuling2Fold(merged, r.r2);
  const perK = (n: number): string => ((n / Math.max(1, merged.dropbacks)) * 1000).toFixed(3);
  say("| arm | geometry-retired threats/1000 dropbacks | time-retired threats/1000 dropbacks |");
  say("|---|---|---|");
  for (const arm of RETIREMENT_ARMS) {
    say(`| ${arm} | ${perK(merged.geometryRetiredThreats[arm])} | ${perK(merged.timeRetiredThreats[arm])} |`);
  }
}

function renderProvenance(rows: readonly Measured[]): void {
  say("");
  say("### Provenance");
  say("");
  say("| set | seed label | games | dropbacks | identity mismatches / checks | wall ms |");
  say("|---|---|---|---|---|---|");
  for (const r of rows) {
    say(
      `| ${String(r.set)} | \`${batchSeedFor(r.set)}\` | ${String(r.games)} | ${String(r.r2.dropbacks)} | ` +
        `${String(r.r2.identityMismatches)} / ${String(r.r2.identityChecks)} | ${String(r.wallMs)} |`,
    );
  }
  say(`\`DEFAULT_TUNABLES\` digest: \`${stableDigest(DEFAULT_TUNABLES)}\` (unpatched, committed tree)`);
  say(`seed digests: ${rows.map((r) => `set ${String(r.set)} → \`${r.seedDigest}\``).join(" · ")}`);
  say(
    `SIZE NOTE: ${String(GAMES)} games × ${String(SETS.length)} seed list(s) = ` +
      `${String(rows.reduce((a, r) => a + r.games, 0))} games total, ` +
      `${String(rows.reduce((a, r) => a + r.r2.dropbacks, 0))} PASS dropbacks. Canonical N per §22c is ` +
      "496 games; this dispatch is sized against the standing budget and states its actual N rather " +
      "than assuming it.",
  );
}

// ---------------------------------------------------------------------------

describe.skipIf(!ENABLED)("ruling 2's re-measurement — committed tree, severity-primary, geometry+time", () => {
  it(
    "prices Ruling 2's geometry+time reclassification ON TOP OF the committed tree (entry 73 already " +
      "inside `published`), reporting the severity distribution and demote/clear split before the rate",
    { timeout: 6 * 60 * 60_000 },
    () => {
      const rows: Measured[] = SETS.map((set) => run(set));

      say("");
      say("=======================================================================");
      say("RULING 2's RE-MEASUREMENT — COMMITTED TREE, FULLY DE-CONFOUNDED");
      say(`flat-60 32t (FLAT_SYNTHETIC) · SYNTHETIC_ROUND_ROBIN 2024 · ${String(GAMES)} games/set`);
      say(`seed sets: ${SETS.map((s) => `${String(s)} → "${batchSeedFor(s)}"`).join(" · ")}`);
      say("MEASUREMENT ONLY — DEFAULT_TUNABLES, unpatched; packages/engine is UNCHANGED.");
      say("⛔ LOWER BOUND: every arm holds every QB decision fixed at what the published stream did.");
      say("=======================================================================");

      const mergedBc = emptyBandCensusFold();
      for (const r of rows) mergeBandCensusFold(mergedBc, r.bc);
      reportPremises(mergedBc);

      renderSeverityDistribution(rows);
      renderDemoteClear(rows);
      renderRetiredCounts(rows);
      renderProvenance(rows);

      // THE FALSIFIER: `pocketChannelShares.reconstructPlay`'s own identity check, read through
      // `foldPlayRuling2`. If this fails, nothing above may be cited.
      for (const r of rows) {
        expect(r.r2.identityMismatches).toBe(0);
      }
      expect(rows.length).toBe(SETS.length);
    },
  );
});
