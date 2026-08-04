/**
 * TIER 1 — league invariants. Rates, not volumes (`calibration.md` §4).
 *
 * Every metric here computes both sides from the same definition, and the definition is the
 * `definition` field rather than a comment, because that string is what the report prints and a
 * report that shows a number without its denominator is not diagnosable.
 *
 * ================== WHAT THE FIRST BASELINE IS EXPECTED TO DO ==================
 *
 * Fail. Widely. `CALIBRATION-BACKLOG.md` has completion near 45% against ~65%, yards per carry
 * near 9.3 against ~4.3, sacks near 10.8 a game against ~2.5, with entry 3's §7.1 term asymmetry
 * frozen and entries 1, 2, 6, 7 and 9-15 open with named levers. (That freeze is HISTORY as of
 * ADR-027/028: `blockerStructuralAdvantage` was unfrozen for measurement, then set to 0 with
 * `anchor` added as a third blocker term, which closes the term asymmetry itself. The figures in
 * this paragraph are the FIRST baseline's and are kept as written — a paragraph about what the
 * first report was expected to do should not be edited to describe the fifth. `reports/` holds
 * what each actually did.) §10.1's bands are a **rising
 * floor, not an entry exam** — they open at ±15% relative precisely so that the first report is
 * a map of known divergences rather than a verdict.
 *
 * So each metric carries `knownDivergences`, the report prints them beside the failure, and a
 * red row that already has a diagnosis reads as "still open" rather than as news. A red row with
 * NO backlog entry beside it is the one worth reading twice.
 */
import { BLITZ_MIN_RUSHERS } from "./collect.js";
import { registerMetric } from "./registry.js";
import {
  isDesignedRush,
  isDropback,
  isPassAttempt,
  isScrimmagePlay,
  type RealInput,
} from "./realInput.js";
import type { Eligibility } from "../ingest/seasons.js";
import {
  absoluteBand,
  categorical,
  meanFrom,
  rate,
  ratioMean,
  relativeBand,
  type Metric,
  type MetricOutcome,
  type SimContext,
} from "./types.js";

function noObservations(detail: string): MetricOutcome {
  return { reason: "NO_OBSERVATIONS", detail };
}

/** Sum, count and sum-of-squares in one pass; a `MeanSample` needs all three. */
function meanOver<T>(rows: readonly T[], keep: (row: T) => number | null): MetricOutcome {
  let total = 0;
  let n = 0;
  let sumSquares = 0;
  for (const row of rows) {
    const value = keep(row);
    if (value === null) continue;
    total += value;
    n++;
    sumSquares += value * value;
  }
  return n === 0 ? noObservations("no qualifying rows") : meanFrom(total, n, sumSquares);
}

function meanOfNumbers(values: readonly number[], what: string): MetricOutcome {
  if (values.length === 0) return noObservations(`no ${what} observed`);
  let total = 0;
  let sumSquares = 0;
  for (const v of values) {
    total += v;
    sumSquares += v * v;
  }
  return meanFrom(total, values.length, sumSquares);
}

// ---------------------------------------------------------------------------
// passing
// ---------------------------------------------------------------------------

export const completionPct: Metric = registerMetric({
  id: "completion_pct",
  tier: 1,
  definition:
    "Completions ÷ pass attempts. Attempts exclude sacks and scrambles (nflverse types both as " +
    "play_type=pass, and neither is a throw); kneels and spikes are excluded league-wide.",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  knownDivergences: [
    "backlog 1 (accuracy bands)",
    "backlog 3 (§7.1 term asymmetry, closed by ADR-028)",
    "backlog 18",
    // Backlog entry 94/95: `passAttempts` now includes throwaways (it always should have — the
    // real side always did, via `isPassAttempt` below). This made the FAIL LARGER on the
    // canonical arm (-38.64pp → -42.24pp relative, baseline-0007 vs the post-fix re-run): a
    // denominator fix, not a new mechanic regression.
    "backlog 95: denominator now includes throwaways (backlog 94); FAIL widened on the canonical " +
      "arm as a direct, correct consequence — not a new mechanic",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.passAttempts === 0
      ? noObservations("no pass attempts")
      : rate(p.completions, p.passAttempts);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let attempts = 0;
    let completions = 0;
    for (const row of input.pbp.rows) {
      if (!isPassAttempt(row)) continue;
      attempts++;
      if (row.completePass === true) completions++;
    }
    return attempts === 0 ? noObservations("no pass attempts in pbp") : rate(completions, attempts);
  },
});

export const interceptionRate: Metric = registerMetric({
  id: "int_rate",
  tier: 1,
  definition: "Interceptions ÷ pass attempts.",
  unit: "%",
  direction: "LOWER_IS_BETTER",
  toleranceBand: relativeBand(0.15),
  knownDivergences: [
    "backlog 6 (§12.4 recovery roll)",
    "backlog 7 (zone defender reads the QB)",
    // Backlog entry 94/95: this row's VERDICT FLIPPED, PASS → FAIL (known), between
    // `baseline-0007` and the post-fix re-run on the identical arm — sim 2.04%→1.92%, real
    // unchanged 2.28%, relative deviation -10.5%→-15.47%, crossing the ±15% band. The numerator
    // (interceptions) did not change; the denominator grew because throwaways (never intercepted)
    // now count as attempts. The flip is a direct, correct consequence of the population fix, not
    // a new interception mechanic — read this note before treating the FAIL as news.
    "backlog 95: verdict flipped PASS→FAIL(known) purely from the backlog 94 denominator fix " +
      "(interceptions unchanged; throwaways, never intercepted, now count as attempts)",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.passAttempts === 0
      ? noObservations("no pass attempts")
      : rate(p.interceptions, p.passAttempts);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let attempts = 0;
    let ints = 0;
    for (const row of input.pbp.rows) {
      if (!isPassAttempt(row)) continue;
      attempts++;
      if (row.interception === true) ints++;
    }
    return attempts === 0 ? noObservations("no pass attempts in pbp") : rate(ints, attempts);
  },
});

export const sackRate: Metric = registerMetric({
  id: "sack_rate",
  tier: 1,
  definition:
    "Sacks ÷ dropbacks. A dropback is nflverse's own qb_dropback flag (isDropback, realInput.ts), " +
    "not play_type=pass — a scramble types play_type=run or no_play, never pass, and qb_dropback " +
    "is what actually carries whether the offence dropped back to throw.",
  unit: "%",
  direction: "LOWER_IS_BETTER",
  toleranceBand: relativeBand(0.15),
  knownDivergences: [
    "backlog 2 (rusher time-of-arrival + missing move branch)",
    "backlog 3",
    // Dropback/scramble denominator dispatch: isDropback previously keyed on play_type=pass, which
    // silently excluded every REG run-typed scramble (1,035 of 2023's 2,916 total dropbacks under
    // the corrected definition, cache-measured) from the real-side population. Pooled 2022-2024
    // (the canonical TUNING arm): real dropbacks 58,277 -> 61,279 (+3,002, sacks unchanged at
    // 4,020 — a sack is never scramble-typed), real sack_rate 6.898% -> 6.560%. Sim side (dropbacks,
    // sacks) is UNCHANGED — this is a real-side-only fix. FAIL(known) verdict does not flip; the
    // gap widens slightly because the sim was already over-predicting sacks and the corrected real
    // denominator is larger, not smaller.
    "backlog [dropback/scramble denominator]: real dropbacks 58,277->61,279 (+3,002), sacks " +
      "unchanged 4,020, real sack_rate 6.898%->6.560%; verdict unchanged (FAIL known, gap widens)",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0 ? noObservations("no dropbacks") : rate(p.sacks, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let dropbacks = 0;
    let sacks = 0;
    for (const row of input.pbp.rows) {
      if (!isDropback(row)) continue;
      dropbacks++;
      if (row.sack === true) sacks++;
    }
    return dropbacks === 0 ? noObservations("no dropbacks in pbp") : rate(sacks, dropbacks);
  },
});

/**
 * ⛔⛔ RENAMED FROM `pressure_rate`; REAL SIDE STRIPPED (owner ruling, dispatch B — CALIBRATION-
 * BACKLOG entry 93). READ THIS BEFORE CITING EITHER SIDE.
 *
 * ================== THE SUPERSESSION, STATED EXPLICITLY (not a silent edit) ==================
 *
 * Backlog entry 68 ruled: *"`pressure_rate` STAYS. It is the figure comparable to real football
 * and remains the headline against 29.225%."* ⛔ **THAT CLAUSE IS STRUCK BY OWNER RULING.** It had
 * no derivation, citation or provenance row anywhere in this corpus (entry 87 item 3), and entry
 * 92 found the identical pattern in ADR-033: a claim placed among measurements is read as one.
 *
 * The comparability itself is recorded UNESTABLISHED, not merely unmeasured — see the
 * comparability provenance row in `../ingest/sources/participation.ts` (above
 * `ParticipationRow.wasPressure`): if NGS's own description of its pressure product governs
 * nflverse's `was_pressure`, the real column counts QB-bail-and-coverage causes this metric's sim
 * side is STRUCTURALLY INCAPABLE of producing — `POCKET_STATUS` is derived purely from the
 * blocker/rusher contest and is not even published while the quarterback is out of the pocket.
 *
 * ⛔ PROHIBITION: DO NOT COMPARE THIS METRIC TO nflverse `was_pressure` OR ANY OTHER REAL PRESSURE
 * FIGURE. WHY: the comparability is UNESTABLISHED (see the provenance row cited above), and no
 * amount of re-running this corpus closes that from inside this repo. WHAT WOULD LIFT IT: an
 * nflverse/NGS artefact, at a stated revision, that states which NGS pressure product populates
 * `was_pressure` and since when, or documents a source/methodology change across seasons —
 * `participation.ts` §4 states the exact bar. Absent that, this metric's real side stays retired.
 *
 * ================== THE RED THIS STRIPPING DELETES — NAMED SO IT IS NOT MISTAKEN FOR A FIX ======
 *
 * Through `baseline-0007` (canonical `flat-60-32t` arm, 496 games, batch seed `baseline-0001`,
 * seed digest `fnv1a:020c1dcb#496`) this metric — then named `pressure_rate` — graded
 * **FAIL (known): sim 89.73% vs real 29.23%**, n 43,370/56,893. Stripping the real side deletes
 * that failing row from every future report's tally. **THE GAP IS UNEXPLAINED AND UNCHANGED — it
 * is being RETIRED AS A COMPARISON, NOT CLOSED**, and `computeFromReal` below says so, with those
 * exact figures, on every render, rather than quietly returning an unexplained absence.
 *
 * ================== WHY THE OLD NAME HAD TO GO, AND WHAT THE NEW ONE DOES NOT CLAIM =============
 *
 * `pressure_rate` implied a real-football comparison this metric cannot support. It remains
 * useful as an INTERNAL PROTECTION-INTEGRITY DIAGNOSTIC — `pocket_status_distribution` and every
 * pocket dispatch still read it, unchanged, for the reasons the mechanic prose below states. What
 * it STOPS doing is claiming a comparison it cannot support.
 *
 * ================== THE MECHANIC PROSE BELOW IS UNCHANGED FOOTBALL, NOT RE-DERIVED ==============
 *
 * `knownDivergences` below still cites backlog 2/3 and the ADR-024 caller note: those are about
 * what DRIVES the sim-side number, not about a real comparison, and remain accurate.
 */
export const threatCreationRate: Metric = registerMetric({
  id: "threat_creation_rate",
  tier: 1,
  definition:
    "SIM SIDE ONLY, never graded against real football — see the header above for the ruling and " +
    "why. Dropbacks on which the pocket was ever anything other than CLEAN ÷ dropbacks: an " +
    "internal protection-integrity diagnostic, not a claim about a real pressure rate.",
  unit: "%",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  /**
   * ★ THE CALLER NOTE WAS STALE ONCE ALREADY AND IS KEPT CORRECTED HERE (backlog 28's note). ★
   *
   * It used to read *"frozen caller: protection is perfectly informed"*. That was true at
   * `callerVersion` v1 and became FALSE at v2 (ADR-024): the caller now builds protection against
   * an ANTICIPATED front and is wrong about roughly a quarter of rushers — `unaccounted_rusher_rate`
   * is 26.08% in `baseline-0005`, against 0.13% at v1. Kept as mechanic context for the SIM number
   * even though the metric is no longer graded: it is still true that a caller which guesses
   * biases this rate up, by the 1.54pp ADR-024 measured.
   */
  knownDivergences: [
    "backlog 2",
    "backlog 3",
    "frozen caller v2: protection is built against an ANTICIPATED front and misses ~26% of rushers (ADR-024) — biases this UP, by 1.54pp when measured",
    "backlog 93: renamed from pressure_rate, real side retired — see this metric's own header",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0
      ? noObservations("no dropbacks")
      : rate(p.pressuredDropbacks, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "RETIRED comparison, not a passing metric (owner ruling, CALIBRATION-BACKLOG entry 93, " +
        "superseding entry 68's clause \"pressure_rate stays as the figure comparable to real " +
        "football\"). Through baseline-0007 (canonical flat-60-32t arm, 496 games, batch seed " +
        "baseline-0001, seed digest fnv1a:020c1dcb#496) this metric, then named pressure_rate, " +
        "graded FAIL (known): sim 89.73% vs real 29.23%, n 43,370/56,893. That gap is UNEXPLAINED " +
        "AND UNCHANGED; retiring the comparison does not close it. WHY RETIRED: whether nflverse " +
        "participation's was_pressure charters the same event this metric's sim side counts is " +
        "UNESTABLISHED, not merely unmeasured — see the comparability provenance row above " +
        "ParticipationRow.wasPressure in ../ingest/sources/participation.ts. WHAT WOULD LIFT " +
        "THIS: an nflverse/NGS artefact, at a stated revision, establishing was_pressure's " +
        "governing semantics (participation.ts section 4 states the exact bar). Until then: do " +
        "not substitute any other real pressure figure here, and do not read this row's absence " +
        "as the gap having closed.",
    );
  },
});

/**
 * ============ THE SEVERITY PARTITION — PRIMARY, ALONGSIDE `threat_creation_rate` (backlog 67/67-RESULT) ============
 *
 * `threat_creation_rate` is `1 − P(every tick CLEAN)` over a dropback: it counts a dropback the instant
 * its worst tick leaves CLEAN, and never again. A lever that demotes a tick from COLLAPSING to
 * PRESSURE — a real, football-meaningful reduction in how bad the pocket got — moves nothing on
 * that rate, because PRESSURE is still non-CLEAN. Measured on the canonical corpus (`baseline-0001`
 * + `baseline-0001/pcs-set-1`, 992 games, 86,291 dropbacks, 257,598 ticks, identity falsifier 0):
 * on `COLLAPSING` — 72.2% of every dirty tick — a lever acting on the arrival channel alone is
 * invisible to `threat_creation_rate` 63.629% of the time; on the band floor, 94.226% of the time.
 * (Measured under this metric's former name, `pressure_rate` — the SIM-SIDE number is unchanged by
 * the rename; see that metric's own header for the renamed/stripped disposition, backlog entry 93.)
 *
 * ⚠ ENTRY 68's RULING IS PARTIALLY SUPERSEDED (dispatch B, backlog entry 93). It read: *"`pressure_
 * rate` STAYS — it is the figure comparable to real football (nflverse `was_pressure`) and remains
 * the headline against the real 29.225%. But no pocket lever may be priced on it ALONE again."*
 * ⛔ **THE FIRST HALF IS STRUCK** — `threat_creation_rate` (that metric's new name) has its real side
 * retired; it is no longer a headline against 29.225% or against anything real. **THE SECOND HALF
 * STANDS, UNCHANGED**: every pocket dispatch still reads this row beside `threat_creation_rate`; a
 * lever that moves this distribution but not the rate is evidence of a real, mis-priced effect, not
 * evidence of nothing. That discipline was never about the real-side comparison — it was about the
 * rate's OWN blindness to severity, which the rename does not touch.
 *
 * SIM SIDE ONLY, deliberately: no ingested source charts pocket severity tick-by-tick.
 * nflverse/NGS `was_pressure` is the single boolean `threat_creation_rate` used to be compared
 * against, before that comparison was retired (backlog entry 93); FTN charts `is_qb_out_of_pocket`
 * and blitz/rusher counts, neither of which is a severity ladder. A real-side target for this shape
 * does not exist and is not invented here (declared absence: `pocket_status_distribution_real_side`,
 * same shape as `hot_route_rate`'s).
 *
 * WHERE THIS LIVES, AND WHY (stated per the ruling that promoted it): the exclusive-share,
 * WHICH-CHANNEL-DID-IT diagnosis (`pocketChannelShares.ts`) stays a Tier 3, env-gated,
 * `Tunables`-reading instrument — it reconstructs three channels off the public tunables tree and
 * pays for a per-tick identity check, which is the right cost for a disambiguation tool run by
 * choice. This row is different: it is a tally of one field the stream already publishes verbatim
 * (`POCKET_STATUS.payload.status`), needs no `Tunables`, cannot throw on a tunables/stream
 * mismatch, and costs nothing beyond what `threat_creation_rate` already pays to fold the same
 * event. That is why it is promoted to Tier 1 and made standing rather than left beside its
 * diagnostic sibling: the ruling makes it something every report must show, and a Tier-3 env-gated
 * row is something a report can go without showing.
 *
 * 🔴 RED-TRIGGER, BOTH DIRECTIONS (entry 55's required field, entry 60's prohibition — named
 * rather than left silent):
 *   - It reddens (the count for a status is WRONG) if `collect.ts`'s `POCKET_STATUS` handler ever
 *     tallies a tick this metric's dropback-level sibling `threat_creation_rate` does not agree is
 *     pass-dropback-scoped — enforced structurally, not by a separate gate: both read the same
 *     `current.isPass` guard in `foldGame`'s `POCKET_STATUS` case, so the two cannot disagree about
 *     WHICH ticks count without a code change touching both in the same edit.
 *   - It reddens (the four-way split is WRONG) if `pocketChannelShares.test.ts`'s cross-check
 *     against this metric's tallies (`StatusPartitionedFold.overall.allTicks` and
 *     `byStatus[S].allTicks` against `pocketStatusTicks`, same canonical corpus) fails to match —
 *     the two are independent tallies of the identical published field and a mismatch means one of
 *     the two folds drifted from the stream, not that pocket behaviour changed.
 *   - ⛔ IT WILL NEVER FLAG A DEMOTION AS A PROBLEM — that is the metric working. It reddens on a
 *     COUNTING defect, never on a football one; whether a given distribution is GOOD is a judgement
 *     this row supplies the evidence for and does not make itself, exactly as `threat_creation_rate`
 *     does not judge its own ~90% either. Nothing computes "is this shift beneficial" — that is
 *     still a per-lever, per-dispatch reading.
 */
export const pocketStatusDistribution: Metric = registerMetric({
  id: "pocket_status_distribution",
  tier: 1,
  definition:
    "SIM SIDE ONLY. Every in-pocket tick of every pass dropback, tallied by its published " +
    "POCKET_STATUS (CLEAN / PRESSURE / COLLAPSING / IMMEDIATE). Report ALONGSIDE " +
    "threat_creation_rate, never in place of it: threat_creation_rate is 1 - P(every tick CLEAN) " +
    "and cannot see a demotion between two non-CLEAN statuses (backlog 67/67-RESULT) — this row " +
    "is where that demotion shows up. No pocket lever may be priced on threat_creation_rate alone.",
  unit: "share",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: ["backlog 67", "backlog 67-RESULT", "backlog 1g", "backlog 1f-RESULT", "ADR-049"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const ticks = accumulator.play.pocketStatusTicks;
    const total = Object.values(ticks).reduce((a, b) => a + b, 0);
    return total === 0 ? noObservations("no POCKET_STATUS ticks published") : categorical(ticks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "no ingested source charts pocket severity tick-by-tick. nflverse/NGS was_pressure is the " +
        "single boolean threat_creation_rate USED TO BE compared against, before backlog entry 93 " +
        "retired that comparison; FTN charts rusher counts and is_qb_out_of_pocket, neither a " +
        "severity ladder. Do NOT substitute threat_creation_rate's (former) real side here — a " +
        "boolean has no distribution to compare a four-way split against, and that comparison no " +
        "longer exists to substitute in any case.",
    );
  },
});

/**
 * ================== BACKLOG DISPATCH C — PIPELINE EXIT (`qb_disruption_rate`) ==================
 *
 * `threat_creation_rate` counts PIPELINE ENTRY: a dropback where the pocket was ever anything
 * other than CLEAN. Nothing in this project counted EXIT until this row — whether that entry
 * ever converted into something that actually disrupted the passer, as against a pocket that
 * dirtied for one tick and cleared. Dispatch C's whole point is making that entry:exit ratio
 * legible (see `threat_entry_exit_ratio`, below); this is the exit half of it.
 *
 * ================== C WAS RE-RULED MID-DRAFT — READ THIS BEFORE READING THE REST ==============
 *
 * C was drafted as *"build `qb_disruption_rate`; the real side transfers verbatim from
 * `pressure_rate`."* THAT PREMISE IS DEAD. Transferring the real side would assert exactly the
 * `was_pressure` comparability claim backlog entry 93 retired UNESTABLISHED (see
 * `threat_creation_rate`'s own header and the comparability provenance row in
 * `../ingest/sources/participation.ts` above `ParticipationRow.wasPressure`). So this metric ships
 * SIM-SIDE-ONLY, as an OBSERVATION, and acquires a real side only when `was_pressure`'s semantics
 * are established at a stated revision — a FUTURE OWNER RULING, not a follow-up task here.
 *
 * ================== THE PREDICATE — ONE EXPLICIT DISJUNCTION, EACH DISJUNCT JUSTIFIED ==========
 *
 * A dropback is "disrupted" iff, anywhere during it, ONE of three things the PUBLIC event stream
 * actually states became true (`PlayFold.disruptedDropbacks`'s own comment in `collect.ts` carries
 * the full derivation; this is the summary a reader of `tier1.ts` should not have to leave it for):
 *
 *   (1) a `RUSH_THREAT` reached `state: "ARRIVED"` — a rusher actually got there, not merely that
 *       the pocket's status implied someone was travelling.
 *   (2) a `POCKET_STATUS` was ever a status in `DEFAULT_TUNABLES.pocket.forcesDecision`
 *       (`COLLAPSING`/`IMMEDIATE` today) — the pocket got severe enough, from ANY channel
 *       (counter, band floor, or arrival), to force the quarterback to decide THIS tick.
 *   (3) the dropback ended in a sack — the IDENTICAL inference `sack_rate`'s own numerator uses
 *       (no THROW, no scramble, no interception, negative result yards); no second sack rule.
 *
 * The DRAFTED shape also named a fourth disjunct — "the QB was hit" — and it is DROPPED here,
 * not silently narrowed: `@ff/contracts`' `MatchEvent` union (`packages/contracts/src/events.ts`)
 * publishes no event for a quarterback being hit as distinct from being sacked. There is no `HIT`
 * event, and inventing a proxy for one would be reaching past the public stream into a fact the
 * engine never states — exactly what this dispatch's standing instruction forbids.
 *
 * ================== THE SUBSET RELATION — VERIFIED, NOT INHERITED (dispatch C item 3) =========
 *
 * The dispatch's own premise — "arrival forces IMMEDIATE; forcesDecision requires
 * COLLAPSING/IMMEDIATE; every sack was measured non-CLEAN" — was checked rather than assumed, and
 * it HOLDS under `DEFAULT_TUNABLES`, with two disjuncts proven and one measured:
 *
 *   - (1) and (2) are proven BY CONSTRUCTION off values on the permitted `DEFAULT_TUNABLES`
 *     surface: `pocket.severity` ranks `CLEAN: 0 < COLLAPSING: 2 < IMMEDIATE: 3`
 *     (`packages/engine/src/tunables.ts`), `forcesDecision` names exactly those two non-CLEAN
 *     rungs, and `pocketFloorFromArrival` (`rushThreat.ts`) returns `IMMEDIATE` on the IDENTICAL
 *     comparison `hasArrived` (`rushThreat.ts` — DORMANT since the no-target sack's re-anchoring
 *     off it, zero production call sites; kept for the LABEL question) computes. So neither
 *     disjunct can fire on a tick whose status stayed CLEAN, which means neither can fire on a
 *     dropback whose WORST tick stayed CLEAN — exactly the condition `threat_creation_rate`'s
 *     `pressuredDropbacks` flag tests. `collect.ts`'s `disruptedDropbacks` header carries the full
 *     derivation, including CALIBRATION-BACKLOG entry 126 finding 8's caveat that this identity
 *     holds only at the committed tunable value.
 *   - (3) is MEASURED, not proven for every code path: backlog 87/88 measured 0 of 6,593 sim
 *     sacks landing on a CLEAN-worst dropback on the canonical corpus, and entries 91/92 traced
 *     why (two sack paths are non-CLEAN by construction or by a separately measured population;
 *     the third, the only one that COULD be CLEAN-worst, never fires under `DEFAULT_TUNABLES`).
 *     Entry 91's "by construction" for the no-target sack path read off that path calling
 *     `hasArrived`; it is now re-anchored to `minTta <= 0` directly and no longer calls it. The
 *     conclusion is unchanged at `DEFAULT_TUNABLES` and is now independently confirmed by entry
 *     129's `pathSum === sacks` measurement (496 games / 32 teams, no fourth site) — see
 *     `collect.ts`'s header for the full note.
 *
 * ⇒ `disruptedDropbacks <= pressuredDropbacks` always, on this tree, under `DEFAULT_TUNABLES`.
 * PINNED: `test/metrics.test.ts` asserts the inequality across the fold's own 30-game corpus, so
 * a future change that breaks it fails a test rather than shipping a ratio that silently exceeds
 * 100%. See `threat_entry_exit_ratio` for where that ratio is reported.
 *
 * ================== THE IDENTITY CHECK (dispatch C item 2) — NEGATIVE, REPORTED AS SUCH =======
 *
 * Checked against every existing `PlayFold` accumulator field before this one was added:
 * `pressuredDropbacks` is a per-dropback worst-status boolean with no per-signal breakdown;
 * `pressuredSacks`/`sacks` carry sacks only; `pocketStatusTicks` is a per-TICK tally, not a
 * per-dropback boolean, and folds three channels together with no dropback-level flag recoverable
 * from it; `threatOrigins`/`threatOriginDropbacks` carry HOW a rusher came free, never WHETHER he
 * arrived. None is an algebraic rearrangement of `disruptedDropbacks`, and none can reconstruct it
 * after the fact. Result: NO IDENTITY FOUND. Unlike entry 88's `pressure_to_sack` — where the
 * answer SHOULD have been no and the failure was that nobody checked — this is the check run and
 * the answer genuinely IS no, reported rather than left implicit.
 */
export const qbDisruptionRate: Metric = registerMetric({
  id: "qb_disruption_rate",
  tier: 1,
  definition:
    "SIM SIDE ONLY, never graded — see this metric's own header (above, `tier1.ts`) for the full " +
    "predicate derivation, the subset-relation proof, and the identity check. Counts PIPELINE " +
    "EXIT: dropbacks on which a RUSH_THREAT reached ARRIVED, OR a POCKET_STATUS was ever in " +
    "DEFAULT_TUNABLES.pocket.forcesDecision (COLLAPSING/IMMEDIATE), OR the dropback ended in a " +
    "sack (sack_rate's own inference) — ÷ dropbacks. NO REAL SIDE, BY DESIGN, NOT MERELY " +
    "UNMEASURED: transferring threat_creation_rate's former real side here would assert the exact " +
    "was_pressure comparability retired UNESTABLISHED by backlog entry 93 (see the comparability " +
    "provenance row above ParticipationRow.wasPressure in ../ingest/sources/participation.ts). " +
    "This metric acquires a real side only when was_pressure's governing semantics are " +
    "established at a stated revision — a future owner ruling, not a follow-up task.",
  unit: "%",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: [
    "backlog dispatch C: exit measure, built alongside threat_creation_rate's entry measure",
    "backlog 93 (threat_creation_rate's real side retirement, the reason this metric never had one)",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0
      ? noObservations("no dropbacks")
      : rate(p.disruptedDropbacks, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "NO REAL SIDE BY DESIGN, not merely unmeasured (backlog dispatch C, ruled differently from " +
        "its original draft). Transferring threat_creation_rate's former real side here would " +
        "assert the exact was_pressure comparability backlog entry 93 retired UNESTABLISHED — see " +
        "the comparability provenance row above ParticipationRow.wasPressure in " +
        "../ingest/sources/participation.ts. This metric acquires a real side only when " +
        "was_pressure's governing semantics are established at a stated revision (participation.ts " +
        "section 4 states the exact bar); that is a future owner ruling, not something this " +
        "dispatch may substitute in the meantime.",
    );
  },
});

/**
 * ================== THE ENTRY:EXIT RATIO — A DECLARED QUOTIENT, RULED ON MID-DISPATCH ==========
 *
 * Owner steer, mid-dispatch: a ratio of two existing rows sharing a denominator is an identity BY
 * DEFINITION, and no amount of population-conditioning removes that the way it did for
 * `pressure_to_sack` (backlog 88) — because THIS ratio has no real side to condition differently
 * in the first place. Entry 88's defect was never that a row was a quotient; it was that NOTHING
 * SAID SO, and that the quotient was graded against a real side as though it were an independent
 * measurement. The ruling: ship the ratio ONLY if its own `definition` DECLARES it is a derived
 * quotient of two named rows already in the report, not independent evidence. This is that
 * declaration.
 *
 * `threat_entry_exit_ratio` IS `qb_disruption_rate ÷ threat_creation_rate`, computed directly as
 * `disruptedDropbacks ÷ pressuredDropbacks` (both rows already in this report; `dropbacks` is the
 * shared denominator both of THOSE rows divide by, and it cancels algebraically — this metric IS
 * that cancellation, named rather than hidden). It reads no accumulator field neither of its two
 * inputs already reads, so there is nothing here for the item-2 identity check to find that
 * wasn't already known and stated: unlike `qb_disruption_rate` and `threat_creation_rate`
 * themselves — each independently checked against every other accumulator field and found NOT to
 * be a rearrangement of anything, entries above — this row's whole content is that rearrangement.
 *
 * P(pipeline exit | pipeline entry): of dropbacks whose pocket ever left CLEAN, the share that
 * went on to a published disruption signal. This is the FIRST instrument in this project that
 * could show a supply lever doing something a mere entry/exit count could not — every named
 * threshold lever previously refused because `threat_creation_rate` alone reads only WHETHER any
 * threat existed, never how much of it converted (backlog 81, 89).
 */
export const threatEntryExitRatio: Metric = registerMetric({
  id: "threat_entry_exit_ratio",
  tier: 1,
  definition:
    "DERIVED QUOTIENT, DECLARED AS ONE — not an independent measurement (see this metric's own " +
    "header for the owner's mid-dispatch ruling on why declaring, rather than avoiding, is the " +
    "correct disposition here). This row equals qb_disruption_rate ÷ threat_creation_rate " +
    "exactly, computed directly as disruptedDropbacks ÷ pressuredDropbacks (both accumulator " +
    "fields already read by those two rows; dropbacks, their shared denominator, cancels " +
    "algebraically). P(pipeline exit | pipeline entry): of dropbacks whose pocket ever left CLEAN, " +
    "the share that also produced a published disruption signal (RUSH_THREAT ARRIVED, a " +
    "forcesDecision pocket status, or a sack — see qb_disruption_rate's definition for the full " +
    "predicate). SIM SIDE ONLY; never graded, for the same reason its two inputs are not.",
  unit: "%",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: [
    "backlog dispatch C: declared quotient of qb_disruption_rate and threat_creation_rate",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.pressuredDropbacks === 0
      ? noObservations("no pressured dropbacks")
      : rate(p.disruptedDropbacks, p.pressuredDropbacks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "NO REAL SIDE: a declared quotient of two sim-side-only rows (qb_disruption_rate, " +
        "threat_creation_rate) has no real counterpart to compare against — see both metrics' own " +
        "headers for why neither has one.",
    );
  },
});

/**
 * ============================ THE THREE PRESSURE METRICS ============================
 *
 * ADR-022's impact table says, in its own words, that calibration *"can measure blitz, stunt and
 * hot-route rates against the real corpus"* — these are that sentence carried out, and they are
 * registered rather than left in a probe file because the whole point of the ADR-022/ADR-023
 * sequence is that these numbers stop being fixture-grade and start being report rows.
 *
 * `pressure_to_sack` is the one worth explaining. Sack rate and pressure rate are both per
 * DROPBACK, so they move together and neither can say whether the engine generates too much
 * pressure or converts too much of it. The conversion rate is the term that separates them, and
 * it is the one Mandate-3 wants: a sim with the right pressure rate and the wrong conversion is a
 * MECHANIC error in §7.2's arrival model; a sim with the wrong pressure rate and the right
 * conversion is a §7.1/§7.4 error one step earlier.
 */
export const blitzRate: Metric = registerMetric({
  id: "blitz_rate",
  tier: 1,
  definition:
    "Dropbacks the defence rushed five or more men on ÷ dropbacks. Sim side counts " +
    "PLAY_START.defense.rush; real side counts FTN charting's `n_pass_rushers`, joined to " +
    "play-by-play dropbacks. Both sides use the same five-man threshold and neither counts " +
    "'blitzers' — FTN's separate `n_blitzers` column charts non-linemen, which is a different " +
    "question the engine's rush list cannot answer.",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  knownDivergences: [
    // Backlog entry 94 finding (clustering section) / dispatch on it: the real side's `n_pass_
    // rushers` has no vendored operational definition (`ftn.ts`, above `FtnChartingRow.
    // nPassRushers`). GRADE UNCHANGED (owner-ruled, standing) — this states the open question,
    // not a claimed defect.
    "backlog 94/[n_pass_rushers dispatch]: real side reads FTN's `n_pass_rushers`, hand-charted " +
      "from film within 48 hours of the game (vendored in ftn.ts); no retrieved source states " +
      "whether that count is the defensive CALL or the OBSERVED rush, and the sim side is " +
      "structurally a CALLED quantity only (PLAY_START.defense.rush is assigned once, pre-play, " +
      "with no post-snap add/remove mechanism). Verdict UNESTABLISHED, not upgraded: a computed " +
      "distribution-shape check (ftn.ts item 6) found the real side's variance ~40% higher than " +
      "the sim's, and ~2% of real mass outside the sim's exact rusher-count support {3,4,5,6} — " +
      "consistent with an observed-vs-called gap but equally consistent with the engine's call " +
      "generator simply sampling a narrower range than real defensive coordinators do, which the " +
      "test cannot separate. Lift condition: an FTN/nflverse artefact, at a stated revision, " +
      "stating which `n_pass_rushers` charts (ftn.ts item 4). Also unstable across seasons: the " +
      "pooled 24.22% real figure (2022-2024) masks a 20.24%-26.76% spread by season, wider than " +
      "`was_pressure`'s 1.63pp spread over the same seasons (ftn.ts item 5).",
    // Dropback/scramble denominator dispatch: isDropback's fix (real-side only) widens the join
    // population here too, since this row keys dropbackKeys off isDropback. Pooled 2022-2024:
    // FTN-joined dropbacks 58,202 -> 61,204 (+3,002, full coverage — every added pbp dropback key
    // found a non-null nPassRushers row), blitzes 14,096 -> 14,642, real blitz_rate 24.219% ->
    // 23.923%. Sim side UNCHANGED. Verdict unaffected: still well inside the 0.15 relative band
    // (old deviation -0.0025, new -0.0099), and the UNESTABLISHED comparability qualifier above is
    // untouched — this fix changed which rows join, not what n_pass_rushers means.
    "backlog [dropback/scramble denominator]: real (FTN-joined) dropbacks 58,202->61,204 (+3,002), " +
      "blitzes 14,096->14,642, real blitz_rate 24.219%->23.923%; verdict unchanged (PASS+, still " +
      "well inside band)",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0 ? noObservations("no dropbacks") : rate(p.blitzDropbacks, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const ftn = input.ftn;
    if (ftn === undefined) {
      return noObservations("ftn_charting not loaded (open the real input with withFtn)");
    }
    // Joined for exactly the reason `pressure_to_sack`'s real side is (`tier1.ts`, below): FTN
    // carries a row per charted play, and a run play has a pass-rusher count too.
    const dropbackKeys = new Set<string>();
    for (const row of input.pbp.rows) {
      if (isDropback(row)) dropbackKeys.add(`${row.gameId}|${row.playId}`);
    }
    let dropbacks = 0;
    let blitzes = 0;
    for (const row of ftn.rows) {
      if (row.nPassRushers === null) continue;
      if (!dropbackKeys.has(`${row.gameId}|${row.playId}`)) continue;
      dropbacks++;
      if (row.nPassRushers >= BLITZ_MIN_RUSHERS) blitzes++;
    }
    return dropbacks === 0
      ? noObservations("no FTN row joined to a pbp dropback for these seasons")
      : rate(blitzes, dropbacks);
  },
});

export const pressureToSackRate: Metric = registerMetric({
  id: "pressure_to_sack",
  tier: 1,
  definition:
    "P(sack | pressured) on BOTH sides — how often pressure is converted, as distinct from how " +
    "often it happens. Both the numerator and the denominator are conditioned on the SAME " +
    "pressure definition on each side (backlog 87 dispatch A): a sack that occurred on an " +
    "otherwise-CLEAN dropback is excluded from the numerator, on both sides, because it never " +
    "entered the pressured population the rate is a share of. Sim side: numerator is sacks " +
    "whose dropback's worst POCKET_STATUS was not CLEAN (the identical flag `pressuredDropbacks` " +
    "itself uses — not a second notion of 'pressured'). The rule excludes a sack on a CLEAN-worst " +
    "dropback (an ADR-033 coverage sack) from the numerator UNCONDITIONALLY — the exclusion is " +
    "arithmetic and neither depends on nor asserts how often that case occurs. Measured, not " +
    "assumed: 0 of 6,593 sim sacks were CLEAN-worst on the canonical baseline-0007 arm (496 " +
    "games, batch seed `baseline-0001`, seed digest `fnv1a:020c1dcb#496`; backlog 87 dispatch A) " +
    "— one arm's count, not a claim about the general rate. Denominator is " +
    "dropbacks whose worst POCKET_STATUS was not CLEAN. Real side: numerator is `sack` among " +
    "participation rows where `was_pressure` is true, joined to play-by-play dropbacks; " +
    "denominator is those same `was_pressure`-true participation rows. Only the two sides' " +
    "underlying definition of 'pressure' may still differ from each other — `was_pressure`'s " +
    "own semantics are not determinable from inside this repo (backlog 87 item 4) — but within " +
    "each side, numerator and denominator now share one population by construction.",
  unit: "%",
  direction: "LOWER_IS_BETTER",
  toleranceBand: relativeBand(0.15),
  knownDivergences: [
    "backlog 2 (rusher time-of-arrival + missing move branch)",
    "backlog 3 (§7.1 term asymmetry, closed by ADR-028)",
    // Backlog entry 94 finding 4 / ruling 3: the caveat moves from the footer `definition` prose
    // into THIS list so it renders in the Tier 1 table's per-row notes column, not only in
    // source. GRADE UNCHANGED (owner-ruled) — this states the mechanism, not a generic warning.
    //
    // CAVEAT COMPLETENESS CORRECTION (post-`3019dd8`): the "Lift condition" sentence below used to
    // name only the `was_pressure`-semantics artefact. `3019dd8` (dropback/scramble denominator
    // fix, see the dispatch note immediately below) changed the REAL CONDITIONING SET this caveat
    // is about — dropback/scramble denominator dispatch, below, is the one that moved — so the
    // lift condition now states BOTH bars a future re-derivation must clear, not only the first.
    "backlog 88/94: real side conditions on `was_pressure`, whose governing semantics are " +
      "UNESTABLISHED (backlog 87 item 4, vendored in participation.ts); if NGS's own pressure " +
      "description governs it, the real pressured population includes QB-bail and coverage-hold " +
      "causes the sim's POCKET_STATUS-derived pressured population is structurally incapable of " +
      "containing (no coverage-separation input, and not published at all while the QB is out of " +
      "the pocket) — a conditional rate over a different conditioning set is a different quantity " +
      "(backlog 88, one level up). Lift condition, TWO BARS, NEITHER SATISFIES THE OTHER: (1) an " +
      "nflverse/NGS artefact, at a stated revision, establishing what `was_pressure` charters " +
      "(participation.ts item 4) — UNCHANGED and STILL OPEN as of `3019dd8`; see the dropback/" +
      "scramble denominator note below, which moved a different fact and does not touch this one. " +
      "(2) any future re-derivation of this row must join against the CURRENT `isDropback` " +
      "(nflverse's own `qb_dropback` flag, `realInput.ts`, since `3019dd8`), not the " +
      "`playType === \"pass\"` definition every pre-`3019dd8` figure in this corpus — including " +
      "this row's own before-figures in the note below — used. Absent (1), treat this row's real " +
      "side as conditioned on an unverified population regardless of which dropback definition " +
      "supplies it; (2) alone never closes (1).",
    // Dropback/scramble denominator dispatch (`3019dd8`): this row's real-side CONDITIONING SET
    // changed, not merely its size. WAS: `dropbackKeys` (this row's `computeFromReal`, below) built
    // from `isDropback` keyed on `playType === "pass"`, which silently excluded every REG run-typed
    // scramble. IS, since `3019dd8`: `isDropback` keys on nflverse's own `qb_dropback` flag
    // (`realInput.ts`), which includes those scrambles. Pooled 2022-2024: pressured
    // (was_pressure=true, joined) 16,627 -> 17,602 (+975 — fewer than the +3,002 dropback delta, so
    // most of the newly included run-typed scrambles are NOT charted was_pressure=true),
    // sacks-within-pressured unchanged at 2,722 (a sack is never scramble-typed, so sackedKeys is
    // identical old/new), real pressure_to_sack 16.371% -> 15.464%. Sim side UNCHANGED. Verdict
    // unaffected: old relative deviation 0.0349, new 0.0956, both well inside the 0.15 band — still
    // PASS+.
    //
    // TWO SEPARATE FACTS. DO NOT LET ONE READ AS PROGRESS ON THE OTHER: the POPULATION this row
    // conditions on MOVED (measured, above, and it is this fact alone that this dispatch
    // establishes). The MEANING of `was_pressure` did NOT become any more established by that move
    // — the semantics question in the caveat above is UNCHANGED and STILL OPEN. This fix changed
    // which pbp rows this side's join admits; it did not touch, and could not touch, what
    // `was_pressure` charters.
    "backlog [dropback/scramble denominator, extended post-3019dd8]: real side's CONDITIONING SET " +
      "changed — WAS dropbackKeys via isDropback(playType===\"pass\"), IS (since 3019dd8) via " +
      "isDropback(qb_dropback). Pressured (joined) 16,627->17,602 (+975), sacks-within-pressured " +
      "unchanged 2,722, real pressure_to_sack 16.371%->15.464%; verdict unchanged (PASS+, still " +
      "well inside band). The population moved; was_pressure's semantics did NOT — that question " +
      "(caveat above) is unchanged and still open; do not read this note as progress on it.",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.pressuredDropbacks === 0
      ? noObservations("no pressured dropbacks")
      : rate(p.pressuredSacks, p.pressuredDropbacks);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const participation = input.participation;
    if (participation === undefined) {
      return noObservations("participation not loaded (open the real input with withParticipation)");
    }
    const sackedKeys = new Set<string>();
    const dropbackKeys = new Set<string>();
    for (const row of input.pbp.rows) {
      if (!isDropback(row)) continue;
      const key = `${row.gameId}|${row.playId}`;
      dropbackKeys.add(key);
      if (row.sack === true) sackedKeys.add(key);
    }
    let pressured = 0;
    let sacks = 0;
    for (const row of participation.rows) {
      if (row.wasPressure !== true) continue;
      const key = `${row.gameId}|${row.playId}`;
      if (!dropbackKeys.has(key)) continue;
      pressured++;
      if (sackedKeys.has(key)) sacks++;
    }
    return pressured === 0
      ? noObservations("no pressured participation row joined to a pbp dropback for these seasons")
      : rate(sacks, pressured);
  },
});

/**
 * SIM-SIDE ONLY, and registered as an observation rather than a graded row.
 *
 * A hot conversion is a *sight adjustment*: the receiver ran a different route from the one the
 * card drew. Nothing in the eleven ingested sources charts that. FTN charts `n_blitzers`,
 * `read_thrown` and `is_qb_out_of_pocket` — all things about the throw, none about whether a
 * route was converted before the snap — so there is no real side to be had and an infinite band
 * is the honest shape. It is here rather than in a probe file because ADR-023 makes "a card that
 * cannot block six states a hot" a corpus rule, and a corpus rule with no standing measurement is
 * a rule nobody can tell has stopped holding.
 */
export const hotRouteRate: Metric = registerMetric({
  id: "hot_route_rate",
  tier: 1,
  definition:
    "SIM SIDE ONLY. Dropbacks on which at least one route actually converted hot ÷ dropbacks, " +
    "read from PLAY_START.offense.hotConversions. A conversion requires an unaccounted rusher " +
    "AND a passed §5.3 recognition AND a card that states a hot, so this is the product of all " +
    "three and not a count of cards that could convert. No ingested source charts sight " +
    "adjustments, so there is no real-side target and this row is never graded.",
  unit: "%",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0
      ? noObservations("no dropbacks")
      : rate(p.hotConversionDropbacks, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "no ingested source charts a sight adjustment. FTN's n_blitzers counts rushers, not " +
        "conversions; nflverse has nothing at all. Do NOT substitute the blitz rate for this — " +
        "the conversion rate is the blitz rate times the recognition rate times the share of " +
        "cards that state a hot, and equating them would make §5.3's roll invisible.",
    );
  },
});

/**
 * The other half of the ADR-023 story, and it is the one that moved most. §7.4 step 1's
 * UNACCOUNTED is a fact about the CALL — it is what the frozen caller could not previously
 * produce, because playbook refused the front and the caller re-drew the concept (backlog 21).
 * Observation, not a graded row: no source charts "was this rusher named by the protection".
 */
export const unaccountedRusherRate: Metric = registerMetric({
  id: "unaccounted_rusher_rate",
  tier: 1,
  definition:
    "SIM SIDE ONLY. Dropbacks with at least one rusher no ProtectionAssignment named ÷ " +
    "dropbacks, from PLAY_START.defense.unaccountedRushers. This is the number backlog entry 21 " +
    "was about: while the caller re-drew every concept it could not protect, it was structurally " +
    "zero. No real source charts protection assignments, so it is never graded.",
  unit: "%",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0
      ? noObservations("no dropbacks")
      : rate(p.unaccountedRusherDropbacks, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "no ingested source states which rushers a protection named. FTN's n_blitzers is the " +
        "nearest thing and it counts who rushed, not who was blocked.",
    );
  },
});

/**
 * ============ THE STARVED BRANCH, PROMOTED FROM A PROBE TO A REPORT ROW (ADR-024) ============
 *
 * `baseline-0002` recorded **`PICKUP_LOST` = 0 in 496 games** and that single number is most of
 * why ADR-024 exists: §7.4 step 3 is a built, tested, ratified mechanic that had never once
 * resolved. The number lived in an env-gated probe (`test/sackAttribution.test.ts`), which is
 * exactly how a fact that important goes unnoticed the second time.
 *
 * It is an OBSERVATION and never graded. `RUSH_THREAT.origin` (ADR-022 petition 5) is a statement
 * about the engine's own resolution vocabulary and no ingested source charts anything like it —
 * FTN's `n_blitzers` counts who rushed, not how each of them came free. Do NOT substitute the
 * blitz rate for this: a five-man pressure a six-man protection answers produces no free runner
 * at all, which is the entire distinction ADR-024 turns on.
 *
 * ONE ENTRY PER (PLAY, RUSHER), not per publication — a threat transitions and re-publishes, and
 * counting envelopes would triple-count one free runner and turn a population into a rate.
 */
export const freeRunnerOriginMix: Metric = registerMetric({
  id: "free_runner_origin_mix",
  tier: 1,
  definition:
    "SIM SIDE ONLY. Rush threats by `RUSH_THREAT.origin`, one per (play, rusher): WON_REP is " +
    "§7.1's won rep, and UNBLOCKED / PICKUP_LOST / STUNT_LOOPER are the three ways to be coming " +
    "without one. PICKUP_LOST is §7.4 step 3's contest and was structurally ZERO in every batch " +
    "before ADR-024, because the caller's protection was built against the actual defensive card " +
    "and therefore never failed. No ingested source charts how a rusher came free.",
  unit: "share",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: ["backlog 21", "backlog 22b", "ADR-024", "ADR-026"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const origins = accumulator.play.threatOrigins;
    const total = Object.values(origins).reduce((a, b) => a + b, 0);
    return total === 0 ? noObservations("no rush threats published") : categorical(origins);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "no ingested source states HOW a pass rusher came free. FTN charts `n_pass_rushers` and " +
        "`n_blitzers` — both counts of who rushed — and nothing charts whether the protection " +
        "accounted for him. Do not substitute the blitz rate: a five-man pressure a six-man " +
        "protection answers produces no free runner at all.",
    );
  },
});

export const yardsPerAttempt: Metric = registerMetric({
  id: "yards_per_attempt",
  tier: 1,
  definition: "Passing yards ÷ pass attempts, counting incompletions as zero.",
  unit: "yards",
  toleranceBand: relativeBand(0.15),
  knownDivergences: [
    "backlog 1",
    "backlog 15 (accuracy→YAC double-count)",
    // Backlog entry 94/95: throwaways (zero yards, per the incompletion branch) now populate
    // `passAttemptYards` too, widening the denominator. FAIL grew, -44.62pp → -47.86pp relative
    // on the canonical arm (baseline-0007 vs the post-fix re-run) — expected, not a new mechanic.
    "backlog 95: denominator now includes zero-yard throwaways (backlog 94); FAIL widened as a " +
      "direct, correct consequence",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.play.passAttemptYards, "pass attempts");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    return meanOver(input.pbp.rows, (row) =>
      isPassAttempt(row) ? (row.completePass === true ? (row.yardsGained ?? 0) : 0) : null,
    );
  },
});

export const timeToThrow: Metric = registerMetric({
  id: "time_to_throw",
  tier: 1,
  definition:
    "Mean seconds from snap to release, over pass ATTEMPTS — sacks and scrambles excluded (" +
    "neither is a release), throwaways INCLUDED on both sides (a throwaway is a release too, " +
    "just not to a receiver; backlog entry 94 ruling 2 — this string used to claim throwaways " +
    "were excluded 'from both sides', which was false of the real-side join even before this " +
    "dispatch, since `isPassAttempt` never excluded them). Sim side reads the tick of whichever " +
    "event fired — a THROW, or a THROWAWAY QB_DECISION when no THROW occurred — off the SAME " +
    "0.5s-grid `TICK.payload.tick` either way. Real side is participation's per-play " +
    "`time_to_throw`, joined to every `isPassAttempt` row (throwaway-inclusive by the identical " +
    "population `completion_pct`/`int_rate`/etc. share); whether NGS's release-time value for a " +
    "throwaway is measured the same way as for a targeted throw is not determinable from inside " +
    "this repo (no vendored NGS dictionary, backlog entry 87 item 4).",
  unit: "seconds",
  toleranceBand: relativeBand(0.15),
  knownDivergences: [
    "backlog 2b (progression + anticipation)",
    "backlog 2",
    "backlog 95: sim population widened to include throwaway release ticks (previously threw-" +
      "only, backlog 94) so both sides share the pass-attempt population. This is the one metric " +
      "of the five where the fix REDUCED the FAIL: -58.12pp → -55.89pp relative on the canonical " +
      "arm (baseline-0007 vs the post-fix re-run) — sim rose 1.123s→1.183s (throwaways average a " +
      "longer hold than a completed/incomplete throw in this engine), real unchanged at 2.682s. " +
      "Still FAIL(known); backlog 2/2b's progression+anticipation gap dominates either way.",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.play.throwTicks, "throws");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const participation = input.participation;
    if (participation === undefined) {
      return noObservations("participation not loaded (open the real input with withParticipation)");
    }
    // Joined to attempts for the same reason `pressure_to_sack`'s real side joins to dropbacks
    // (`tier1.ts`, above): a non-null `time_to_throw` on a row that was not a throw would put a
    // zero in the mean.
    const attemptKeys = new Set<string>();
    for (const row of input.pbp.rows) {
      if (isPassAttempt(row)) attemptKeys.add(`${row.gameId}|${row.playId}`);
    }
    return meanOver(participation.rows, (row) =>
      attemptKeys.has(`${row.gameId}|${row.playId}`) ? row.timeToThrow : null,
    );
  },
});

export const explosivePassRate: Metric = registerMetric({
  id: "explosive_pass_rate",
  tier: 1,
  definition: "Completions gaining 20+ yards ÷ pass attempts.",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  // Downstream of completion percentage: an explosive pass has to be completed first.
  knownDivergences: [
    "backlog 1 (completion rate)",
    "backlog 3",
    // Backlog entry 94/95: a throwaway is never explosive (never caught) but now counts in the
    // denominator. FAIL widened, -50.67pp → -53.56pp relative on the canonical arm (baseline-0007
    // vs the post-fix re-run) — a direct, correct consequence of the population fix.
    "backlog 95: denominator now includes throwaways, never explosive (backlog 94); FAIL widened " +
      "as a direct, correct consequence",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.passAttempts === 0
      ? noObservations("no pass attempts")
      : rate(p.explosivePasses, p.passAttempts);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let attempts = 0;
    let explosive = 0;
    for (const row of input.pbp.rows) {
      if (!isPassAttempt(row)) continue;
      attempts++;
      if (row.completePass === true && (row.yardsGained ?? 0) >= 20) explosive++;
    }
    return attempts === 0 ? noObservations("no pass attempts in pbp") : rate(explosive, attempts);
  },
});

// ---------------------------------------------------------------------------
// running
// ---------------------------------------------------------------------------

export const yardsPerCarry: Metric = registerMetric({
  id: "yards_per_carry",
  tier: 1,
  definition: "Designed-rush yards ÷ designed rush attempts. Quarterback scrambles excluded from both sides.",
  unit: "yards",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 11 (§13.1 zones quantise runs)", "backlog 12", "backlog 13", "backlog 14"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.play.designedRushYards, "designed rushes");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    return meanOver(input.pbp.rows, (row) => (isDesignedRush(row) ? (row.yardsGained ?? 0) : null));
  },
});

export const explosiveRushRate: Metric = registerMetric({
  id: "explosive_rush_rate",
  tier: 1,
  definition: "Designed rushes gaining 10+ yards ÷ designed rush attempts.",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 11", "backlog 12 (zone 4 is unoccupiable)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.rushAttempts === 0
      ? noObservations("no designed rushes")
      : rate(p.explosiveRushes, p.rushAttempts);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let attempts = 0;
    let explosive = 0;
    for (const row of input.pbp.rows) {
      if (!isDesignedRush(row)) continue;
      attempts++;
      if ((row.yardsGained ?? 0) >= 10) explosive++;
    }
    return attempts === 0 ? noObservations("no designed rushes in pbp") : rate(explosive, attempts);
  },
});

// ---------------------------------------------------------------------------
// situational
// ---------------------------------------------------------------------------

export const thirdDownConversion: Metric = registerMetric({
  id: "third_down_conversion",
  tier: 1,
  definition:
    "Third-down scrimmage plays gaining the distance ÷ third-down scrimmage plays. Both sides " +
    "measure the yardage against the distance to go rather than trusting a first-down flag, so " +
    "the two definitions cannot drift apart.",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 1", "backlog 18"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.thirdDowns === 0
      ? noObservations("no third downs")
      : rate(p.thirdDownConversions, p.thirdDowns);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let attempts = 0;
    let converted = 0;
    for (const row of input.pbp.rows) {
      if (!isScrimmagePlay(row) || row.down !== 3 || row.ydstogo === null) continue;
      attempts++;
      if ((row.yardsGained ?? 0) >= row.ydstogo) converted++;
    }
    return attempts === 0 ? noObservations("no third downs in pbp") : rate(converted, attempts);
  },
});

export const redZoneTouchdownRate: Metric = registerMetric({
  id: "red_zone_td_rate",
  tier: 1,
  definition:
    "Touchdowns ÷ scrimmage snaps taken inside the opponent's 20. Snap-denominated rather than " +
    "trip-denominated because a 'trip' is a drive-level construct the two sides define " +
    "differently, and a metric whose denominator disagrees across sides is worse than none.",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 18 (scoring is a possession-count problem)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.redZoneSnaps === 0
      ? noObservations("no red-zone snaps")
      : rate(p.redZoneTouchdowns, p.redZoneSnaps);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let snaps = 0;
    let touchdowns = 0;
    for (const row of input.pbp.rows) {
      if (!isScrimmagePlay(row) || row.yardline100 === null || row.yardline100 > 20) continue;
      snaps++;
      if (row.touchdown === true) touchdowns++;
    }
    return snaps === 0 ? noObservations("no red-zone snaps in pbp") : rate(touchdowns, snaps);
  },
});

export const yardsPerPlay: Metric = registerMetric({
  id: "yards_per_play",
  tier: 1,
  definition: "Yards gained ÷ scrimmage plays, passes and runs together, sacks included as losses.",
  unit: "yards",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 11", "backlog 16 (sack/TFL yardage is engine fiction)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.play.playYards, "scrimmage plays");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    return meanOver(input.pbp.rows, (row) => (isScrimmagePlay(row) ? (row.yardsGained ?? 0) : null));
  },
});

// ---------------------------------------------------------------------------
// drives and games
// ---------------------------------------------------------------------------

export const playsPerDrive: Metric = registerMetric({
  id: "plays_per_drive",
  tier: 1,
  definition: "Scrimmage plays ÷ drives.",
  unit: "plays",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 18 (drives are short, not numerous)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.drive.drivePlaySamples, "drives");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const drives = new Map<string, number>();
    for (const row of input.pbp.rows) {
      if (!isScrimmagePlay(row) || row.fixedDrive === null) continue;
      const key = `${row.gameId}|${row.fixedDrive}`;
      drives.set(key, (drives.get(key) ?? 0) + 1);
    }
    return meanOfNumbers([...drives.values()], "drives");
  },
});

export const threeAndOutRate: Metric = registerMetric({
  id: "three_and_out_rate",
  tier: 1,
  definition:
    "Drives of three or fewer plays ending in a punt or a turnover on downs ÷ all drives. " +
    "Excludes end-of-half drives, which are short for a reason that is not the offence's.",
  unit: "%",
  direction: "LOWER_IS_BETTER",
  toleranceBand: relativeBand(0.15),
  // The same number as plays/drive, seen from the other end: short drives end in punts.
  knownDivergences: ["backlog 18 (drives are short, not numerous)", "backlog 1"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const d = accumulator.drive;
    const clockDrives =
      d.drives - (d.driveResults["END_OF_HALF"] ?? 0) - (d.driveResults["END_OF_GAME"] ?? 0);
    return clockDrives <= 0 ? noObservations("no drives") : rate(d.threeAndOuts, clockDrives);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const plays = new Map<string, number>();
    const result = new Map<string, string>();
    for (const row of input.pbp.rows) {
      if (row.fixedDrive === null || row.seasonType !== "REG") continue;
      const key = `${row.gameId}|${row.fixedDrive}`;
      if (isScrimmagePlay(row)) plays.set(key, (plays.get(key) ?? 0) + 1);
      if (row.fixedDriveResult !== null) result.set(key, row.fixedDriveResult);
    }
    let drives = 0;
    let threeAndOuts = 0;
    for (const [key, outcome] of result) {
      if (outcome === "End of half" || outcome === "End of game") continue;
      drives++;
      const count = plays.get(key) ?? 0;
      if (count > 0 && count <= 3 && (outcome === "Punt" || outcome === "Turnover on downs")) {
        threeAndOuts++;
      }
    }
    return drives === 0 ? noObservations("no drives in pbp") : rate(threeAndOuts, drives);
  },
});

export const pointsPerDrive: Metric = registerMetric({
  id: "points_per_drive",
  tier: 1,
  definition: "Points scored by the offence on a drive ÷ drives. Defensive and return scores excluded.",
  unit: "points",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 18"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.drive.drivePointSamples, "drives");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    // Points are inferred from the drive result rather than summed off plays, because a
    // conversion attempt lives on a separate row and a two-point try would otherwise be lost.
    const POINTS: Readonly<Record<string, number>> = {
      Touchdown: 6.95, // a touchdown plus the league's ~95% extra-point conversion
      "Field goal": 3,
      Safety: -2,
    };
    const results = new Map<string, string>();
    for (const row of input.pbp.rows) {
      if (row.fixedDrive === null || row.seasonType !== "REG" || row.fixedDriveResult === null) continue;
      results.set(`${row.gameId}|${row.fixedDrive}`, row.fixedDriveResult);
    }
    return meanOfNumbers([...results.values()].map((r) => POINTS[r] ?? 0), "drives");
  },
});

export const drivesPerTeamGame: Metric = registerMetric({
  id: "drives_per_team_game",
  tier: 1,
  definition: "Drives ÷ team-games. One team's possessions in one game.",
  unit: "drives",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 18 (32.0 measured against 22-24)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.teamGames.map((t) => t.drives), "team-games");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const perTeamGame = new Map<string, Set<number>>();
    for (const row of input.pbp.rows) {
      if (row.fixedDrive === null || row.seasonType !== "REG" || row.posteam === null) continue;
      const key = `${row.gameId}|${row.posteam}`;
      let set = perTeamGame.get(key);
      if (set === undefined) {
        set = new Set<number>();
        perTeamGame.set(key, set);
      }
      set.add(row.fixedDrive);
    }
    return meanOfNumbers([...perTeamGame.values()].map((s) => s.size), "team-games");
  },
});

export const puntsPerTeamGame: Metric = registerMetric({
  id: "punts_per_team_game",
  tier: 1,
  definition:
    "Punts ÷ team-games. Counted from the PUNT event on the sim side and from `punt_attempt` " +
    "on the real side, so a blocked or aborted punt counts as an attempt on both.",
  unit: "punts",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 18 (downstream of plays/drive)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.teamGames.map((t) => t.punts), "team-games");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const punts = new Map<string, number>();
    const teamGames = new Set<string>();
    for (const row of input.pbp.rows) {
      if (row.seasonType !== "REG" || row.posteam === null) continue;
      const key = `${row.gameId}|${row.posteam}`;
      teamGames.add(key);
      if (row.puntAttempt === true) punts.set(key, (punts.get(key) ?? 0) + 1);
    }
    if (teamGames.size === 0) return noObservations("no team-games in pbp");
    return meanOfNumbers([...teamGames].map((k) => punts.get(k) ?? 0), "team-games");
  },
});

export const pointsPerTeamGame: Metric = registerMetric({
  id: "points_per_team_game",
  tier: 1,
  definition: "Final score ÷ team-games. The headline number, and the one every other Tier 1 metric feeds.",
  unit: "points",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 18 (30.6 measured against 22.5)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.teamGames.map((t) => t.points), "team-games");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const points: number[] = [];
    for (const row of input.schedules.rows) {
      if (row.gameType !== "REG" || row.homeScore === null || row.awayScore === null) continue;
      points.push(row.homeScore, row.awayScore);
    }
    return meanOfNumbers(points, "team-games in schedules");
  },
});

// ---------------------------------------------------------------------------
// kicking
// ---------------------------------------------------------------------------

export const fieldGoalPct: Metric = registerMetric({
  id: "field_goal_pct",
  tier: 1,
  definition: "Field goals made ÷ field goals attempted, all distances pooled.",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 19 (special teams are placeholder depth)", "backlog 18 (attempts skew long)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const d = accumulator.drive;
    return d.fieldGoalAttempts === 0
      ? noObservations("no field goals attempted")
      : rate(d.fieldGoalsMade, d.fieldGoalAttempts);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let attempts = 0;
    let made = 0;
    for (const row of input.pbp.rows) {
      if (row.seasonType !== "REG" || row.fieldGoalAttempt !== true) continue;
      attempts++;
      if (row.fieldGoalResult === "made") made++;
    }
    return attempts === 0 ? noObservations("no field goals in pbp") : rate(made, attempts);
  },
});

export const extraPointPct: Metric = registerMetric({
  id: "extra_point_pct",
  tier: 1,
  definition: "Extra points made ÷ extra points attempted.",
  unit: "%",
  toleranceBand: relativeBand(0.05),
  knownDivergences: ["backlog 19"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const d = accumulator.drive;
    return d.extraPointAttempts === 0
      ? noObservations("no extra points attempted")
      : rate(d.extraPointsMade, d.extraPointAttempts);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let attempts = 0;
    let made = 0;
    for (const row of input.pbp.rows) {
      if (row.seasonType !== "REG" || row.extraPointAttempt !== true) continue;
      attempts++;
      if (row.extraPointResult === "good") made++;
    }
    return attempts === 0 ? noObservations("no extra points in pbp") : rate(made, attempts);
  },
});

// ---------------------------------------------------------------------------
// interception-source decomposition (§4 Tier 1) — three of four sources
// ---------------------------------------------------------------------------

export const interceptionSourceMix: Metric = registerMetric({
  id: "int_source_mix",
  tier: 1,
  definition:
    "Interceptions attributed to the cause the stream states: TIPPED_RECOVERY (a TIPPED_BALL " +
    "recovered by the defence), CONTESTED_CATCH (the ball was thrown and a defender took it), " +
    "DIRECT (a turnover on a dropback with no throw). §4 asks for a FOURTH source — the unseen " +
    "defender — and it is a declared absence, so this mix is reported without a residual bucket " +
    "rather than with one that would silently absorb the missing mechanic.",
  unit: "share",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: ["backlog 6", "backlog 4a", "absence: int_source_unseen_defender"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const sources = accumulator.play.intSources;
    const total = Object.values(sources).reduce((a, b) => a + b, 0);
    return total === 0 ? noObservations("no interceptions") : categorical(sources);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "nflverse does not attribute interception cause. This decomposition is a sim-side " +
        "OBSERVATION with no real-side target; see the declared absence " +
        "int_source_unseen_defender for what a real side would need.",
    );
  },
});

// ---------------------------------------------------------------------------
// throwaway cause partition (backlog entry 100; ADR-056 amended beside Option C)
// ---------------------------------------------------------------------------

/**
 * ⛔ **WHY THIS EXISTS: `THROWAWAY.payload.cause` WAS SHIPPED (ADR-056's amendment) AND NOTHING
 * READ IT.** `pocketLadder.ts`'s `throwaway_rate` diagnostic — the only place a throwaway rate
 * was reported anywhere in this package before this dispatch — folds `POCKET_DURESS` (the pocket
 * beat him) and `CLOCK_EXPIRED` (nobody got open; the clock ran out with no duress at all) into
 * one number, and its own header already says why that is dangerous: *"A throwaway is produced
 * either by urgency … or by the clock expiring with nobody open. Those are opposite mechanisms
 * wearing the same event."* No metric anywhere separated them. This does.
 *
 * ================== PRE-REGISTRATION (written before the canonical-arm figures below) ==================
 *
 * Three branches, and what each would say about the model:
 *
 *  - **HEAVY `CLOCK_EXPIRED` SKEW** (mostly route/coverage-side): would mean the undifferentiated
 *    rate is, in the main, a statement about opening quality and read timing, not about
 *    protection — pocket levers (arrival horizons, band floors, `forcesDecision`) would have
 *    little leverage over it, and it would corroborate `pocketLadder.ts`'s own recorded-red note
 *    (that ladder's throwaway rise at its one measured rung was clock-driven) as the GENERAL case
 *    rather than an artefact of that one induced rung.
 *  - **HEAVY `POCKET_DURESS` SKEW** (mostly protection-side): would mean the undifferentiated rate
 *    IS, contra the diagnostic's own caution, mostly a pocket-integrity signal on this arm — and
 *    would flag that `pocketLadder.ts`'s recorded note (clock-driven at ITS rung) does not
 *    generalise to the canonical arm under `DEFAULT_TUNABLES`: that note describes one induced
 *    rung of a synthetic ladder walk, not this baseline's default-tunables population, and the two
 *    corpora would be shown to disagree about which mechanism dominates.
 *  - **ROUGHLY EVEN SPLIT**: would mean the mixed-mechanism caution holds even off the ladder walk
 *    — the undifferentiated rate is unusable for mechanism attribution under default tunables too,
 *    not only at an induced extreme, and this split becomes a required instrument for every future
 *    dispatch that reads a throwaway number.
 *
 * ================== THE MEASUREMENT — canonical arm, named ==================
 *
 * **Arm: canonical `flat-60-32t`, 496 games, batch seed `baseline-0001`, seed digest
 * `fnv1a:020c1dcb#496`, `DEFAULT_TUNABLES`, frozen caller v2/v1** — the same arm `baseline-0007`
 * and backlog entries 94–99 cite; `dropbacks 43,370`, `throwaways 1,653` reproduce those entries'
 * own printed counts exactly, which is the check that this ran on the arm it claims to.
 *
 * **`POCKET_DURESS` 1,343 of 1,653 (81.25% of throwaways; 3.097% of dropbacks).
 * `CLOCK_EXPIRED` 310 of 1,653 (18.75% of throwaways; 0.715% of dropbacks).**
 *
 * ⇒ **THE SECOND BRANCH.** A heavy `POCKET_DURESS` skew, four-to-one. On the canonical arm, under
 * default tunables, the undifferentiated `throwaway_rate` (below) is predominantly a
 * PROTECTION-SIDE signal, not a route/coverage one — the pocket is, in the large majority of
 * cases, the reason the ball came out with no target. This is the OPEN prediction resolving
 * against the branch this dispatch's own brief called unexpected relative to
 * `pocketLadder.ts`'s prose: that file's recorded note describes a `CLOCK_EXPIRED`-driven rise at
 * ONE INDUCED RUNG of a synthetic ladder walk (a corpus built to isolate the pocket mechanic in
 * isolation), not the canonical arm's default-tunables population — and the two corpora do not
 * agree about which mechanism dominates. Neither figure is wrong; they are measurements of
 * different populations, and this is the first time that has been checked rather than assumed.
 *
 * ================== THE IDENTITY CHECK (backlog entry 88's rule, ADR-056's brief) ==================
 *
 * `throwaway_rate` (below) is NOT a fourth independent quantity. `throwawaysByCause` sums to
 * `throwaways` by construction (`collect.ts`'s own field comment; pinned by
 * `test/metrics.test.ts`'s "decomposes throwaways by cause" case), so `throwaway_rate ==
 * throwaway_rate_pocket_duress + throwaway_rate_clock_expired` always. It is shipped anyway, as a
 * DECLARED DERIVED ROW, because the undifferentiated rate already has a name and a citation
 * history in this project (`pocketLadder.ts`'s `DIAGNOSTIC_MEASURES`, and backlog entries
 * referencing its movement, e.g. "+2.78pp") — dropping it here would leave a reader summing two
 * Tier 1 rows by hand to reconstruct a number this project has been citing as one figure for
 * months. Its `definition` says so and names both rows, per the rule that an undeclared derived
 * row is the defect and a declared one is not.
 *
 * ================== WHY SIM SIDE ONLY, PERMANENTLY (comparability provenance) ==================
 *
 * `THROWAWAY.payload.cause` is a fact the ENGINE publishes about ITS OWN decision process — which
 * branch of `passPlay.ts` fired. No ingested source could ever carry this, for the same reason
 * `int_source_mix` above has none: the ingestion layer shipped eleven sources (`calibration.md`
 * §2 — nflverse schedules/pbp, participation, three NGS tables, ESPN win rates, FTN charting,
 * rosters, depth charts, injuries, snap counts) and nflverse codes a throwaway as an ordinary
 * incomplete `pass_attempt` with no cause column of any kind (backlog entry 94 finding 1). This is
 * not a gap an engine change or a future ingest could close; it is a fact about what a broadcast
 * box score can state. `computeFromReal` says so on every one of the three rows below rather than
 * leaving the absence silent (item 3 of this dispatch's brief).
 */
export const throwawayRatePocketDuress: Metric = registerMetric({
  id: "throwaway_rate_pocket_duress",
  tier: 1,
  definition:
    "SIM SIDE ONLY — no real column exists for this quantity and none ever will; see " +
    "computeFromReal for the comparability provenance. Throwaways whose THROWAWAY.payload.cause " +
    "is POCKET_DURESS (passPlay.ts's forcesDecision(pocket) branch — the pocket forced the " +
    "decision) ÷ dropbacks. One of two rows that PARTITION throwaway_rate (below) by mechanism; " +
    "see that row for the identity and throwaway_rate_clock_expired for the other cause.",
  unit: "%",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: [
    "ADR-056 (amended beside Option C) — backlog entry 100",
    "canonical arm (baseline-0001, 496 games): 1,343/43,370 = 3.097% (81.25% of all throwaways)",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0
      ? noObservations("no dropbacks")
      : rate(p.throwawaysByCause["POCKET_DURESS"] ?? 0, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "COMPARABILITY PROVENANCE: no real side, structurally, not merely unmeasured. " +
        "THROWAWAY.payload.cause states WHY the engine's own decision process produced a " +
        "throwaway, and no broadcast box score records a quarterback's reason for throwing the " +
        "ball away — nflverse codes a throwaway as an ordinary incomplete pass_attempt with no " +
        "cause column at all (backlog entry 94 finding 1), and none of the eleven ingested " +
        "sources (calibration.md §2) charts it either. This is not a gap the engine or a future " +
        "ingest could close; see this metric's own header comment for the full argument. Do not " +
        "substitute any other real-side figure here.",
    );
  },
});

export const throwawayRateClockExpired: Metric = registerMetric({
  id: "throwaway_rate_clock_expired",
  tier: 1,
  definition:
    "SIM SIDE ONLY — no real column exists for this quantity and none ever will; see " +
    "computeFromReal for the comparability provenance. Throwaways whose THROWAWAY.payload.cause " +
    "is CLOCK_EXPIRED (passPlay.ts's other throwaway path — the clock/reads ran out with NO " +
    "pocket duress at all: 'nobody got open') ÷ dropbacks. The other of the two rows that " +
    "PARTITION throwaway_rate (below) by mechanism; see that row for the identity and " +
    "throwaway_rate_pocket_duress for the other cause.",
  unit: "%",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: [
    "ADR-056 (amended beside Option C) — backlog entry 100",
    "canonical arm (baseline-0001, 496 games): 310/43,370 = 0.715% (18.75% of all throwaways)",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0
      ? noObservations("no dropbacks")
      : rate(p.throwawaysByCause["CLOCK_EXPIRED"] ?? 0, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "COMPARABILITY PROVENANCE: no real side, structurally, not merely unmeasured. " +
        "THROWAWAY.payload.cause states WHY the engine's own decision process produced a " +
        "throwaway, and no broadcast box score records a quarterback's reason for throwing the " +
        "ball away — nflverse codes a throwaway as an ordinary incomplete pass_attempt with no " +
        "cause column at all (backlog entry 94 finding 1), and none of the eleven ingested " +
        "sources (calibration.md §2) charts it either. This is not a gap the engine or a future " +
        "ingest could close; see throwaway_rate_pocket_duress's header comment for the full " +
        "argument. Do not substitute any other real-side figure here.",
    );
  },
});

export const throwawayRate: Metric = registerMetric({
  id: "throwaway_rate",
  tier: 1,
  definition:
    "SIM SIDE ONLY — no real column exists for this quantity and none ever will (same " +
    "comparability provenance as its two components; see computeFromReal). DECLARED DERIVED ROW: " +
    "throwaway_rate_pocket_duress + throwaway_rate_clock_expired, i.e. every throwaway (either " +
    "cause) ÷ dropbacks — an undifferentiated mix of the two mechanisms named above, not new " +
    "information beyond them. Carried because the undifferentiated rate already has a name and a " +
    "citation history in this project: pocketLadder.ts's DIAGNOSTIC_MEASURES computes the " +
    "identical shape (throwaways ÷ dropbacks) on that instrument's own ladder-walk corpus rather " +
    "than this baseline arm — a DIFFERENT population under the SAME name, deliberately kept in " +
    "sync (backlog entry 93's naming precedent) rather than left to silently diverge.",
  unit: "%",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: [
    "ADR-056 (amended beside Option C) — backlog entry 100",
    "DECLARED DERIVED from throwaway_rate_pocket_duress + throwaway_rate_clock_expired",
    "canonical arm (baseline-0001, 496 games): 1,653/43,370 = 3.811%; 81.25% POCKET_DURESS / 18.75% CLOCK_EXPIRED",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0 ? noObservations("no dropbacks") : rate(p.throwaways, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "COMPARABILITY PROVENANCE: no real side, structurally, not merely unmeasured — same " +
        "reason as its two components (throwaway_rate_pocket_duress, throwaway_rate_clock_expired): " +
        "nflverse codes a throwaway as an ordinary incomplete pass_attempt with no cause column, " +
        "and none of the eleven ingested sources (calibration.md §2) charts WHY a quarterback " +
        "threw the ball away. See throwaway_rate_pocket_duress's header comment for the full " +
        "argument. Do not substitute any other real-side figure here.",
    );
  },
});

/**
 * A STRUCTURAL metric, and it is registered through the `allowStructural` gate on purpose.
 *
 * It describes what the corpus CALLED — the shell mix, and separately the rusher-count mix. That
 * is the orthogonality test `CALIBRATION-BACKLOG.md` 8b makes standing: **a corpus that hit the
 * blitz rate by inflating Cover 0 to four times its real frequency would pass every distribution
 * check while describing football nobody plays.** Each marginal is individually correct; only
 * the joint distribution is wrong, and nothing in a report shows a joint distribution unless
 * somebody puts both marginals in it.
 *
 * It is NOT a coverage grade and says so in its own definition. See the declared absence
 * `coverage_quality_separation_at_throw` for the metric that would be.
 */
export const structuralCoverageShellMix: Metric = registerMetric(
  {
    id: "structural_shell_and_rusher_mix",
    tier: 1,
    definition:
      "What the defence CALLED: the mix of coverage shells, and separately the mix of rusher " +
      "counts, both taken from PLAY_START. This is a structural description of the corpus in " +
      "use — it validates that the caller is calling what the corpus says it calls — and it is " +
      "NOT a measure of how well the coverage worked. No number in this metric grades a defence.",
    unit: "share",
    toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
    computeFromEvents({ accumulator }: SimContext): MetricOutcome {
      const p = accumulator.play;
      const counts: Record<string, number> = {};
      for (const [shell, n] of Object.entries(p.coverageShells)) counts[`shell:${shell}`] = n;
      for (const [rushers, n] of Object.entries(p.rusherCounts)) counts[`rushers:${rushers}`] = n;
      return Object.keys(counts).length === 0
        ? noObservations("no PLAY_START defensive detail")
        : categorical(counts);
    },
    computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
      const participation = input.participation;
      if (participation === undefined) {
        return noObservations("participation not loaded (open the real input with withParticipation)");
      }
      const counts: Record<string, number> = {};
      for (const row of participation.rows) {
        if (row.defenseManZoneType !== null) {
          counts[`shell:${row.defenseManZoneType}`] = (counts[`shell:${row.defenseManZoneType}`] ?? 0) + 1;
        }
        if (row.numberOfPassRushers !== null) {
          const key = `rushers:${row.numberOfPassRushers}`;
          counts[key] = (counts[key] ?? 0) + 1;
        }
      }
      return Object.keys(counts).length === 0
        ? noObservations("participation carries no coverage or rusher detail for these seasons")
        : categorical(counts);
    },
  },
  { allowStructural: true },
);

/**
 * The real side of the declared coverage-quality absence, computed and standing.
 *
 * Registered as an OBSERVATION — no band, no sim side — because that is the honest shape of a
 * one-sided absence. It is here so the target is dated and reproducible from the day the engine
 * can finally answer it, and so a reader of the report can see that the missing half is the SIM
 * half. `computeFromEvents` returns `NO_OBSERVATIONS` with the absence's id in the detail, which
 * is where somebody looking to "fill the gap" will arrive.
 */
export const realSideCoverageSeparation: Metric = registerMetric({
  id: "separation_at_throw_real_side_only",
  tier: 1,
  definition:
    "REAL SIDE ONLY. Mean NGS separation in yards at the catch point (ngs_receiving " +
    "avg_separation, weighted by targets) and the FTN contested-target share " +
    "(ftn_charting is_contested_ball). This is the target for the declared absence " +
    "coverage_quality_separation_at_throw. The engine cannot produce the other half.",
  unit: "yards / share",
  toleranceBand: absoluteBand(Number.POSITIVE_INFINITY),
  knownDivergences: ["absence: coverage_quality_separation_at_throw"],
  computeFromEvents(_context: SimContext): MetricOutcome {
    return noObservations(
      "The engine cannot report how contested a route was. This is the declared absence " +
        "coverage_quality_separation_at_throw — see its entry for what the engine must emit, " +
        "and for the four numbers that must NOT be substituted here. Do not fill this in with " +
        "a figure derived from zone spans or route openness.",
    );
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const ngs = input.ngsReceiving;
    if (ngs === undefined) {
      return noObservations("ngs_receiving not loaded (open the real input with withNgs)");
    }
    let weighted = 0;
    let targets = 0;
    for (const row of ngs.rows) {
      if (row.isSeasonAggregate) continue;
      if (row.avgSeparation === null || row.targets === null || row.targets === 0) continue;
      weighted += row.avgSeparation * row.targets;
      targets += row.targets;
    }
    return targets === 0
      ? noObservations("ngs_receiving carries no avg_separation rows for these seasons")
      : ratioMean(weighted, targets);
  },
});

export const TIER_1_METRICS: readonly Metric[] = [
  completionPct,
  interceptionRate,
  sackRate,
  threatCreationRate,
  pocketStatusDistribution,
  qbDisruptionRate,
  threatEntryExitRatio,
  pressureToSackRate,
  blitzRate,
  hotRouteRate,
  unaccountedRusherRate,
  yardsPerAttempt,
  timeToThrow,
  explosivePassRate,
  yardsPerCarry,
  explosiveRushRate,
  thirdDownConversion,
  redZoneTouchdownRate,
  yardsPerPlay,
  playsPerDrive,
  threeAndOutRate,
  pointsPerDrive,
  drivesPerTeamGame,
  puntsPerTeamGame,
  pointsPerTeamGame,
  fieldGoalPct,
  extraPointPct,
  interceptionSourceMix,
  throwawayRatePocketDuress,
  throwawayRateClockExpired,
  throwawayRate,
  structuralCoverageShellMix,
  realSideCoverageSeparation,
];
