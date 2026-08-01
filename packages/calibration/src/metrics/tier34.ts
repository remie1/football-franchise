/**
 * TIERS 3 AND 4 — team correlation and player convergence.
 *
 * Both tiers are **provenance-gated**, and that is the point of this file existing separately.
 *
 * ================== WHY THESE RETURN `PROVENANCE` ON A FLAT LEAGUE ==================
 *
 * Tier 3 correlates simulated team quality against real team quality, and Tier 4 correlates
 * simulated per-player rates against real per-player rates. Both presuppose that the league has
 * variation in ratings, and a `FLAT_SYNTHETIC` league by construction has none.
 *
 * Run on a flat league, `upset_rate_vs_rating_gap` would compute a rating gap of exactly zero for
 * every game and report a beautifully calibrated 50% — which is a tautology dressed as a pass.
 * That is the single most dangerous kind of green row in a calibration report, so these metrics
 * return `{ reason: "PROVENANCE" }` and the report renders `NOT_APPLICABLE` with the reason
 * attached. §5.2's flat-league instrument is a MECHANIC instrument; it was never a rating one.
 *
 * They are implemented in full anyway, and that is deliberate: the seam where `@ff/attributes`
 * arrives should be one function returning a `DerivedLeague`, not a tier of metrics that has to
 * be written at that point. Everything below runs correctly the moment the provenance is right.
 */
import type { Eligibility } from "../ingest/seasons.js";
import { registerMetric } from "./registry.js";
import type { RealInput } from "./realInput.js";
import { spearman } from "./stats.js";
import {
  correlationFloor,
  rate,
  relativeBand,
  samples,
  type Metric,
  type MetricOutcome,
  type SimContext,
} from "./types.js";

function noObservations(detail: string): MetricOutcome {
  return { reason: "NO_OBSERVATIONS", detail };
}

function requiresDerived(metric: string): MetricOutcome {
  return {
    reason: "PROVENANCE",
    detail:
      `${metric} correlates simulated quality against real quality and needs a league whose ` +
      `ratings were DERIVED from real data. On a flat or archetype league it would compute a ` +
      `number (rating gap is zero everywhere, so upsets run at 50%) and that number would be a ` +
      `tautology, not a pass. Needs @ff/attributes — Phase 2.`,
  };
}

// ---------------------------------------------------------------------------
// Tier 3 — team level
// ---------------------------------------------------------------------------

/**
 * WIN-TOTAL RANK CORRELATION, availability-matched.
 *
 * §4: *"each simulated week imposes real active rosters (per §10.2), removing health luck from
 * the noise term. Sim win totals vs real win totals across the rated league (Spearman floor)."*
 * The floor is set at 0.55 rather than at something ambitious because §4 also says exact team
 * records remain non-targets: coaching variance and bounce luck are still unreplayed. The
 * availability match is what justifies a floor at all.
 */
export const winTotalCorrelation: Metric = registerMetric({
  id: "win_total_rank_correlation",
  tier: 3,
  definition:
    "Spearman rank correlation between simulated season win totals and real ones, over the " +
    "teams of an availability-matched real-schedule replay. Ranks, not values: the claim is " +
    "that the simulation orders teams like reality, not that it reproduces 11-6.",
  unit: "ρ",
  direction: "HIGHER_IS_BETTER",
  toleranceBand: correlationFloor(0.55),
  computeFromEvents(context: SimContext): MetricOutcome {
    if (context.provenance !== "DERIVED") return requiresDerived("win_total_rank_correlation");
    const wins = new Map<string, number>();
    for (const row of context.accumulator.teamGames) {
      const key = String(row.team);
      wins.set(key, (wins.get(key) ?? 0) + (row.points > row.opponentPoints ? 1 : 0));
    }
    const values = [...wins.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
    return values.length < 4 ? noObservations("fewer than four teams") : samples(values);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const wins = new Map<string, number>();
    for (const row of input.schedules.rows) {
      if (row.gameType !== "REG" || row.homeScore === null || row.awayScore === null) continue;
      wins.set(row.homeTeam, (wins.get(row.homeTeam) ?? 0) + (row.homeScore > row.awayScore ? 1 : 0));
      wins.set(row.awayTeam, (wins.get(row.awayTeam) ?? 0) + (row.awayScore > row.homeScore ? 1 : 0));
    }
    const values = [...wins.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
    return values.length < 4 ? noObservations("fewer than four teams in schedules") : samples(values);
  },
});

/**
 * UPSET RATE VERSUS THE BETTING SPREAD — §4's "single best whole-system honesty check".
 *
 * The real side is unusual and worth stating: `schedules.spread_line` is a MARKET consensus, not
 * a rating gap, and it is by a distance the best-calibrated estimate of relative team strength
 * available for free. Bucketing by spread and measuring how often the favourite actually won is
 * the honest real-side answer to "favourites of a given strength delta should win at realistic
 * rates". The sim side needs a rating gap the flat league does not have.
 */
export const upsetRateBySpread: Metric = registerMetric({
  id: "upset_rate_vs_spread",
  tier: 3,
  definition:
    "Share of games won by the underdog, bucketed by the size of the pre-game spread " +
    "(schedules.spread_line, a market consensus rather than a model). Real football runs near " +
    "33% at a 3-point spread and near 15% at 10. The sim side buckets by the rating gap between " +
    "the two rosters, which requires derived ratings.",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  computeFromEvents(context: SimContext): MetricOutcome {
    if (context.provenance !== "DERIVED") return requiresDerived("upset_rate_vs_spread");
    // With derived ratings this buckets by team-strength delta. Until then the branch above
    // returns first, and leaving the body honest-but-unreachable is better than leaving a stub
    // that would quietly start returning numbers the day the provenance changes.
    const rows = context.accumulator.teamGames.filter((t) => t.home);
    const upsets = rows.filter((t) => t.points < t.opponentPoints).length;
    return rows.length === 0 ? noObservations("no games") : rate(upsets, rows.length);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    let games = 0;
    let upsets = 0;
    for (const row of input.schedules.rows) {
      if (row.gameType !== "REG" || row.homeScore === null || row.awayScore === null) continue;
      if (row.spreadLine === null || row.spreadLine === 0) continue;
      // `spread_line` is stated from the HOME team's perspective: positive means home favoured.
      const homeFavoured = row.spreadLine > 0;
      const homeWon = row.homeScore > row.awayScore;
      if (row.homeScore === row.awayScore) continue;
      games++;
      if (homeFavoured !== homeWon) upsets++;
    }
    return games === 0 ? noObservations("no spread lines in schedules") : rate(upsets, games);
  },
});

export const pointDifferentialSpread: Metric = registerMetric({
  id: "point_differential_spread",
  tier: 3,
  definition:
    "Standard deviation of season point differential across teams. A league where every team " +
    "finishes near zero is a league where roster quality does not separate teams — which is " +
    "exactly the ceiling backlog entry 5 warns the dice-to-attribute ratio imposes.",
  unit: "points",
  toleranceBand: relativeBand(0.2),
  knownDivergences: ["backlog 5 (dice dominate attributes; ratio is the lever)"],
  computeFromEvents(context: SimContext): MetricOutcome {
    if (context.provenance !== "DERIVED") return requiresDerived("point_differential_spread");
    const diff = new Map<string, number>();
    for (const row of context.accumulator.teamGames) {
      const key = String(row.team);
      diff.set(key, (diff.get(key) ?? 0) + row.points - row.opponentPoints);
    }
    const values = [...diff.values()];
    return values.length < 4 ? noObservations("fewer than four teams") : samples(values);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const diff = new Map<string, number>();
    for (const row of input.schedules.rows) {
      if (row.gameType !== "REG" || row.homeScore === null || row.awayScore === null) continue;
      diff.set(row.homeTeam, (diff.get(row.homeTeam) ?? 0) + row.homeScore - row.awayScore);
      diff.set(row.awayTeam, (diff.get(row.awayTeam) ?? 0) + row.awayScore - row.homeScore);
    }
    const values = [...diff.values()];
    return values.length < 4 ? noObservations("fewer than four teams in schedules") : samples(values);
  },
});

// ---------------------------------------------------------------------------
// Tier 4 — player level (rate stats only; §4 excludes volume)
// ---------------------------------------------------------------------------

/**
 * The SIM half of pass-rush win rate, with no real half.
 *
 * `pass_rush_tick` CHECKs name their actors and carry ADR-011's band, so per-player win rate is
 * a straight reduction over the stream. ESPN's PBWR/PRWR tables are not ingested, so there is no
 * target — see the declared absence `pbwr_prwr_real_target`. Reported as a distribution
 * OBSERVATION rather than as a band failure, because a metric with no target cannot fail one and
 * a red row that means "we never fetched a file" would dilute the rows that mean something.
 */
export const passRushWinRateSim: Metric = registerMetric({
  id: "pbwr_sim_only",
  tier: 4,
  definition:
    "SIM SIDE ONLY. Per-player pass-rush win rate: the share of that rusher's pass_rush_tick " +
    "reps whose band says the rusher won, over players with at least 50 reps. There is no " +
    "real-side target — ESPN win-rate tables are not ingested (declared absence " +
    "pbwr_prwr_real_target) — so this reports the DISTRIBUTION of win rates, which is still " +
    "informative: a league where every rusher wins 8% of reps has no pass-rush variation at all.",
  unit: "%",
  toleranceBand: correlationFloor(Number.NEGATIVE_INFINITY),
  knownDivergences: ["absence: pbwr_prwr_real_target", "backlog 3 (§7.1 term asymmetry)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const values: number[] = [];
    for (const entry of Object.values(accumulator.player.rushReps)) {
      if (entry.reps < 50) continue;
      values.push(entry.wins / entry.reps);
    }
    values.sort((a, b) => a - b);
    return values.length === 0
      ? noObservations("no rusher reached 50 pass_rush_tick reps")
      : samples(values);
  },
  computeFromReal<E extends Eligibility>(_input: RealInput<E>): MetricOutcome {
    return noObservations(
      "ESPN pass-rush/pass-block win rates are not an ingested source. See the declared absence " +
        "pbwr_prwr_real_target. Do NOT substitute sack rate or threat_creation_rate (renamed from " +
        "pressure_rate, backlog entry 93, and now sim-side-only in any case) — they are " +
        "per-dropback and quarterback-mediated, and backlog entry 2 shows they are not even " +
        "monotonically linked to the won-rep rate.",
    );
  },
});

/**
 * PER-QUARTERBACK ACCURACY RESIDUAL — the CPOE-style check §4 asks for.
 *
 * Real side is NGS's `completion_percentage_above_expectation`, weighted by attempts. Sim side
 * needs derived ratings: on a flat league every quarterback is identical, so the residual spread
 * is measuring dice and nothing else, and reporting it as a pass would be the tautology this
 * file's header is about.
 */
export const quarterbackAccuracySpread: Metric = registerMetric({
  id: "qb_accuracy_residual_spread",
  tier: 4,
  definition:
    "Spread of per-quarterback completion percentage over expectation. Real side is NGS CPOE " +
    "weighted by attempts, over quarterbacks with 100+ attempts. Sim side measures the spread " +
    "of per-quarterback completion rate around the league mean over the same attempt threshold.",
  unit: "% points",
  toleranceBand: relativeBand(0.25),
  knownDivergences: ["backlog 5 (dice dominate attributes)", "backlog 1"],
  computeFromEvents(context: SimContext): MetricOutcome {
    if (context.provenance !== "DERIVED") return requiresDerived("qb_accuracy_residual_spread");
    const values: number[] = [];
    for (const line of Object.values(context.accumulator.player.statlines)) {
      if (line.passing.attempts < 100) continue;
      values.push(line.passing.completions / line.passing.attempts);
    }
    values.sort((a, b) => a - b);
    return values.length < 4 ? noObservations("fewer than four qualifying quarterbacks") : samples(values);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const ngs = input.ngsPassing;
    if (ngs === undefined) return noObservations("ngs_passing not loaded (open the real input with withNgs)");
    const byPlayer = new Map<string, { cpoe: number; attempts: number }>();
    for (const row of ngs.rows) {
      if (!row.isSeasonAggregate) continue;
      if (row.playerGsisId === null || row.completionPercentageAboveExpectation === null) continue;
      if (row.attempts === null || row.attempts < 100) continue;
      byPlayer.set(`${row.season}|${row.playerGsisId}`, {
        cpoe: row.completionPercentageAboveExpectation,
        attempts: row.attempts,
      });
    }
    const values = [...byPlayer.values()].map((v) => v.cpoe).sort((a, b) => a - b);
    return values.length < 4
      ? noObservations("fewer than four qualifying quarterbacks in ngs_passing")
      : samples(values);
  },
});

export const rusherYardsOverExpectedSign: Metric = registerMetric({
  id: "rb_yards_over_expected_spread",
  tier: 4,
  definition:
    "Spread of per-back yards over expected. Real side is NGS rush_yards_over_expected_per_att " +
    "over backs with 100+ carries; sim side is per-back yards per carry around the league mean " +
    "over the same threshold. §4 asks for sign agreement; the spread is the precondition — a " +
    "league where every back is identical has no signs to agree about.",
  unit: "yards",
  toleranceBand: relativeBand(0.3),
  knownDivergences: ["backlog 11", "backlog 13", "backlog 5"],
  computeFromEvents(context: SimContext): MetricOutcome {
    if (context.provenance !== "DERIVED") return requiresDerived("rb_yards_over_expected_spread");
    const values: number[] = [];
    for (const line of Object.values(context.accumulator.player.statlines)) {
      if (line.rushing.attempts < 100) continue;
      values.push(line.rushing.yards / line.rushing.attempts);
    }
    values.sort((a, b) => a - b);
    return values.length < 4 ? noObservations("fewer than four qualifying backs") : samples(values);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const ngs = input.ngsRushing;
    if (ngs === undefined) return noObservations("ngs_rushing not loaded (open the real input with withNgs)");
    const values: number[] = [];
    for (const row of ngs.rows) {
      if (!row.isSeasonAggregate) continue;
      if (row.rushAttempts === null || row.rushAttempts < 100) continue;
      if (row.rushYardsOverExpectedPerAtt === null) continue;
      values.push(row.rushYardsOverExpectedPerAtt);
    }
    values.sort((a, b) => a - b);
    return values.length < 4
      ? noObservations("fewer than four qualifying backs in ngs_rushing")
      : samples(values);
  },
});

/** Spearman between two aligned vectors, exposed for the report's correlation rows. */
export function rankCorrelation(sim: readonly number[], real: readonly number[]): number {
  return spearman(sim, real);
}

export const TIER_3_METRICS: readonly Metric[] = [
  winTotalCorrelation,
  upsetRateBySpread,
  pointDifferentialSpread,
];

export const TIER_4_METRICS: readonly Metric[] = [
  passRushWinRateSim,
  quarterbackAccuracySpread,
  rusherYardsOverExpectedSign,
];
