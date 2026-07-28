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
 * frozen and entries 1, 2, 6, 7 and 9-15 open with named levers. §10.1's bands are a **rising
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
  knownDivergences: ["backlog 1 (accuracy bands)", "backlog 3 (§7.1 term asymmetry, frozen)", "backlog 18"],
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
  knownDivergences: ["backlog 6 (§12.4 recovery roll)", "backlog 7 (zone defender reads the QB)"],
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
    "Sacks ÷ dropbacks. A dropback is every play_type=pass, which includes sacks, scrambles and " +
    "throwaways — the denominator is the number of times the offence chose to drop back.",
  unit: "%",
  direction: "LOWER_IS_BETTER",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 2 (rusher time-of-arrival + missing move branch)", "backlog 3"],
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

export const pressureRate: Metric = registerMetric({
  id: "pressure_rate",
  tier: 1,
  definition:
    "Dropbacks on which the pocket was ever anything other than CLEAN ÷ dropbacks. Real side is " +
    "nflverse participation's `was_pressure`, which is NGS-derived. Which seasons it covers is a " +
    "property of the CACHE, not of this metric — read the manifest list the report prints.",
  unit: "%",
  direction: "LOWER_IS_BETTER",
  toleranceBand: relativeBand(0.15),
  /**
   * ★ THE THIRD CLAUSE WAS STALE AND IS CORRECTED HERE (backlog 28's note). ★
   *
   * It read *"frozen caller: protection is perfectly informed"*. That was true at `callerVersion`
   * v1 and became FALSE at v2 (ADR-024): the caller now builds protection against an ANTICIPATED
   * front and is wrong about roughly a quarter of rushers — `unaccounted_rusher_rate` is 26.08%
   * in `baseline-0005`, against 0.13% at v1.
   *
   * The row is still correctly `FAIL (known)` against entries 2 and 3; only the clause naming the
   * caller was wrong, and a wrong clause on a failing row is worse than none, because it offers a
   * reader a spare explanation for a gap that no longer has one. Rewritten rather than deleted:
   * the caller IS still a confound, it is simply the opposite confound. Perfectly-informed
   * protection biased pressure DOWN; a caller that guesses biases it up, by the 1.54pp ADR-024
   * measured, which is a rounding error against 89.14% versus a real 29.23%.
   */
  knownDivergences: [
    "backlog 2",
    "backlog 3",
    "frozen caller v2: protection is built against an ANTICIPATED front and misses ~26% of rushers (ADR-024) — biases this UP, by 1.54pp when measured",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0
      ? noObservations("no dropbacks")
      : rate(p.pressuredDropbacks, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const participation = input.participation;
    if (participation === undefined) {
      return noObservations("participation not loaded (open the real input with withParticipation)");
    }
    /**
     * JOINED TO PLAY-BY-PLAY, and the join is load-bearing rather than tidy.
     *
     * `was_pressure` is populated on rows that are not dropbacks at all — the participation file
     * carries a row per play, and a run play reads `false`. Counting non-null rows gave 111,016
     * "dropbacks" across two seasons against roughly 38,000 real ones a season, and a pressure
     * rate of 17.5% against a published figure near a third. That number was wrong in the
     * direction that would have made the engine's 87% look worse than it is, which is the sort
     * of real-side error that survives review because it makes the sim look bad.
     */
    const dropbackKeys = new Set<string>();
    for (const row of input.pbp.rows) {
      if (isDropback(row)) dropbackKeys.add(`${row.gameId}|${row.playId}`);
    }
    let dropbacks = 0;
    let pressured = 0;
    for (const row of participation.rows) {
      if (row.wasPressure === null) continue;
      if (!dropbackKeys.has(`${row.gameId}|${row.playId}`)) continue;
      dropbacks++;
      if (row.wasPressure) pressured++;
    }
    return dropbacks === 0
      ? noObservations(
          "no participation row joined to a pbp dropback for these seasons. Participation is " +
            "ingested per season and its coverage has changed over time; check the manifest " +
            "list rather than assuming a season range",
        )
      : rate(pressured, dropbacks);
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
  // Not a divergence claimed by any entry yet: this row is measured for the first time here.
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.dropbacks === 0 ? noObservations("no dropbacks") : rate(p.blitzDropbacks, p.dropbacks);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const ftn = input.ftn;
    if (ftn === undefined) {
      return noObservations("ftn_charting not loaded (open the real input with withFtn)");
    }
    // Joined for exactly the reason `pressure_rate` is: FTN carries a row per charted play, and
    // a run play has a pass-rusher count too.
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
    "Sacks ÷ PRESSURED dropbacks — how often pressure is converted, as distinct from how often " +
    "it happens. Sim side: dropbacks whose worst POCKET_STATUS was not CLEAN. Real side: " +
    "participation's `was_pressure`, joined to play-by-play dropbacks, against `sack`.",
  unit: "%",
  direction: "LOWER_IS_BETTER",
  toleranceBand: relativeBand(0.15),
  knownDivergences: [
    "backlog 2 (rusher time-of-arrival + missing move branch)",
    "backlog 3 (§7.1 term asymmetry, frozen)",
  ],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const p = accumulator.play;
    return p.pressuredDropbacks === 0
      ? noObservations("no pressured dropbacks")
      : rate(p.sacks, p.pressuredDropbacks);
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
  knownDivergences: ["backlog 1", "backlog 15 (accuracy→YAC double-count)"],
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
    "Mean seconds from snap to release, over throws only (sacks, scrambles and throwaways " +
    "excluded from both sides). Sim side reads TICK.payload.tick, which is already in seconds " +
    "on a 0.5s grid; real side is participation's per-play `time_to_throw`.",
  unit: "seconds",
  toleranceBand: relativeBand(0.15),
  knownDivergences: ["backlog 2b (progression + anticipation)", "backlog 2"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    return meanOfNumbers(accumulator.play.throwTicks, "throws");
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const participation = input.participation;
    if (participation === undefined) {
      return noObservations("participation not loaded (open the real input with withParticipation)");
    }
    // Joined to attempts for the same reason `pressure_rate` is joined to dropbacks: a
    // non-null `time_to_throw` on a row that was not a throw would put a zero in the mean.
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
  knownDivergences: ["backlog 1 (completion rate)", "backlog 3"],
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
  pressureRate,
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
  structuralCoverageShellMix,
  realSideCoverageSeparation,
];
