/**
 * TIER 2 — distribution shapes (`calibration.md` §4).
 *
 * *"catches 'right mean, wrong shape' errors that Tier 1 misses."* This tier is the reason
 * `CALIBRATION-BACKLOG.md` entry 11 is stated as **"54.5% of ZONE carries gain exactly 5 yards,
 * and the gain histogram has zero mass between 10 and 14, and between 20 and 58"** rather than
 * as "yards per carry is high". The mean was 11.58; the defect was the quantisation. A Tier 1
 * library alone would have produced a red row saying `yards_per_carry` and nothing else.
 *
 * Two test kinds, chosen by what the data is:
 *   - **KS** on continuous samples (per-carry yardage, per-play yardage, team scores). Two-sample,
 *     because both sides are empirical — there is no fitted distribution to test against.
 *   - **Chi-squared** on categorical counts (drive-outcome mix, and the 3/7 key-number structure
 *     of scores, which is categorical precisely because 3 and 7 are not points on a continuum).
 *
 * Bands are p-value floors. A `SHAPE` band of 0.01 says "the two samples are not distinguishable
 * at the 1% level". That is a WEAK test at batch sample sizes and it is deliberately weak to
 * start: at n in the tens of thousands, KS will reject almost any real difference, so a tight
 * shape band on the first report would fail every row and say nothing. §10.1's ratchet tightens
 * it once a metric passes comfortably — which for a shape band means raising the p floor.
 */
import type { Eligibility } from "../ingest/seasons.js";
import { registerMetric } from "./registry.js";
import { isDesignedRush, isScrimmagePlay, type RealInput } from "./realInput.js";
import { histogram } from "./stats.js";
import {
  categorical,
  samples,
  shapeBand,
  type Metric,
  type MetricOutcome,
  type SimContext,
} from "./types.js";

function noObservations(detail: string): MetricOutcome {
  return { reason: "NO_OBSERVATIONS", detail };
}

export const carryDistribution: Metric = registerMetric({
  id: "carry_yardage_distribution",
  tier: 2,
  definition:
    "The full per-carry yardage distribution on designed rushes, compared by two-sample KS. " +
    "Real football has a median near 3-4 with a long breakaway tail; a simulation with the " +
    "right mean and the wrong shape fails here and passes yards_per_carry.",
  unit: "KS p",
  toleranceBand: shapeBand(0.01),
  knownDivergences: ["backlog 11 (§13.1 zones quantise every run)", "backlog 12 (zone 4 unoccupiable)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const values = accumulator.play.designedRushYards;
    return values.length === 0 ? noObservations("no designed rushes") : samples(values);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const values: number[] = [];
    for (const row of input.pbp.rows) {
      if (isDesignedRush(row)) values.push(row.yardsGained ?? 0);
    }
    values.sort((a, b) => a - b);
    return values.length === 0 ? noObservations("no designed rushes in pbp") : samples(values);
  },
});

export const playYardageDistribution: Metric = registerMetric({
  id: "play_yardage_distribution",
  tier: 2,
  definition:
    "Per-scrimmage-play yardage distribution, passes and runs pooled, compared by two-sample KS. " +
    "The tails are what this is for: sacks at one end and explosive plays at the other.",
  unit: "KS p",
  toleranceBand: shapeBand(0.01),
  knownDivergences: ["backlog 11", "backlog 16 (sack/TFL yardage is engine fiction)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const values = accumulator.play.playYards;
    return values.length === 0 ? noObservations("no scrimmage plays") : samples(values);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const values: number[] = [];
    for (const row of input.pbp.rows) {
      if (isScrimmagePlay(row)) values.push(row.yardsGained ?? 0);
    }
    values.sort((a, b) => a - b);
    return values.length === 0 ? noObservations("no scrimmage plays in pbp") : samples(values);
  },
});

export const teamScoreDistribution: Metric = registerMetric({
  id: "team_score_distribution",
  tier: 2,
  definition:
    "Per-team final scores, compared by two-sample KS. The mean lives in Tier 1; this is the " +
    "shape, including whether shutouts and 40-point games occur at real rates.",
  unit: "KS p",
  toleranceBand: shapeBand(0.01),
  knownDivergences: ["backlog 18"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const values = accumulator.teamGames.map((t) => t.points).sort((a, b) => a - b);
    return values.length === 0 ? noObservations("no games") : samples(values);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const values: number[] = [];
    for (const row of input.schedules.rows) {
      if (row.gameType !== "REG" || row.homeScore === null || row.awayScore === null) continue;
      values.push(row.homeScore, row.awayScore);
    }
    values.sort((a, b) => a - b);
    return values.length === 0 ? noObservations("no completed games in schedules") : samples(values);
  },
});

/**
 * THE 3/7 KEY-NUMBER STRUCTURE, and it is categorical on purpose.
 *
 * `calibration.md` §4 names it explicitly. Football scores are not a smooth distribution: they
 * are sums of 3s and 7s, so 3, 7, 10, 14, 17, 20, 24 and 27 are spikes and 5, 8, 11 are troughs.
 * KS is blind to that — a simulation could reproduce the whole cumulative shape while scoring
 * 22-19 as often as 21-20, and a bettor would notice immediately.
 *
 * So the score is bucketed by its residue structure rather than by magnitude, and the test is
 * chi-squared over those buckets.
 */
export const scoreKeyNumbers: Metric = registerMetric({
  id: "score_key_numbers",
  tier: 2,
  definition:
    "Per-team final scores bucketed by key-number structure — exact 3, 7, 10, 14, 17, 20, 21, " +
    "24, 27, 28, 31 and 'other' — compared by chi-squared. Football scores are sums of 3s and " +
    "7s, so the spikes are a property no continuous test can see.",
  unit: "chi² p",
  toleranceBand: shapeBand(0.01),
  // The key-number structure cannot be right while the mean is double reality: the spikes at 3,
  // 7, 10 and 14 are where a 22-point league lives, not where a 44-point one does.
  knownDivergences: ["backlog 18 (scoring is a possession-count problem)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const values = accumulator.teamGames.map((t) => t.points);
    return values.length === 0 ? noObservations("no games") : categorical(keyNumberBuckets(values));
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const values: number[] = [];
    for (const row of input.schedules.rows) {
      if (row.gameType !== "REG" || row.homeScore === null || row.awayScore === null) continue;
      values.push(row.homeScore, row.awayScore);
    }
    return values.length === 0
      ? noObservations("no completed games in schedules")
      : categorical(keyNumberBuckets(values));
  },
});

const KEY_NUMBERS = [0, 3, 6, 7, 10, 13, 14, 17, 20, 21, 23, 24, 27, 28, 30, 31, 34, 35];

export function keyNumberBuckets(scores: readonly number[]): Record<string, number> {
  const counts: Record<string, number> = { other: 0 };
  for (const k of KEY_NUMBERS) counts[String(k)] = 0;
  for (const score of scores) {
    const key = KEY_NUMBERS.includes(score) ? String(score) : "other";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export const marginDistribution: Metric = registerMetric({
  id: "margin_of_victory_distribution",
  tier: 2,
  definition:
    "Absolute margin of victory, bucketed at the key numbers a football margin actually lands " +
    "on (1-2, 3, 4-6, 7, 8-9, 10, 11-13, 14, 15-16, 17, 18-20, 21+ and ties), compared by " +
    "chi-squared. The single most-cited shape in football statistics.",
  unit: "chi² p",
  toleranceBand: shapeBand(0.01),
  knownDivergences: ["backlog 18", "backlog 5 (dice dominate attributes — margins on a flat league)"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const margins = accumulator.teamGames
      .filter((t) => t.home)
      .map((t) => Math.abs(t.points - t.opponentPoints));
    return margins.length === 0 ? noObservations("no games") : categorical(marginBuckets(margins));
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const margins: number[] = [];
    for (const row of input.schedules.rows) {
      if (row.gameType !== "REG" || row.homeScore === null || row.awayScore === null) continue;
      margins.push(Math.abs(row.homeScore - row.awayScore));
    }
    return margins.length === 0
      ? noObservations("no completed games in schedules")
      : categorical(marginBuckets(margins));
  },
});

export function marginBuckets(margins: readonly number[]): Record<string, number> {
  const labels = ["0", "1-2", "3", "4-6", "7", "8-9", "10", "11-13", "14", "15-16", "17", "18-20", "21+"];
  const counts: Record<string, number> = {};
  for (const l of labels) counts[l] = 0;
  for (const m of margins) {
    let label: string;
    if (m === 0) label = "0";
    else if (m <= 2) label = "1-2";
    else if (m === 3) label = "3";
    else if (m <= 6) label = "4-6";
    else if (m === 7) label = "7";
    else if (m <= 9) label = "8-9";
    else if (m === 10) label = "10";
    else if (m <= 13) label = "11-13";
    else if (m === 14) label = "14";
    else if (m <= 16) label = "15-16";
    else if (m === 17) label = "17";
    else if (m <= 20) label = "18-20";
    else label = "21+";
    counts[label] = (counts[label] ?? 0) + 1;
  }
  return counts;
}

export const driveOutcomeMix: Metric = registerMetric({
  id: "drive_outcome_mix",
  tier: 2,
  definition:
    "Share of drives ending in each outcome (touchdown, field goal, missed field goal, punt, " +
    "interception, turnover on downs, safety, end of half), compared by chi-squared. The " +
    "engine's vocabulary and nflverse's are mapped onto one set of labels here, and the mapping " +
    "is stated in the source rather than implied.",
  unit: "chi² p",
  toleranceBand: shapeBand(0.01),
  knownDivergences: ["backlog 18", "engine models no fumbles (ADR-010) so FUMBLE never appears"],
  computeFromEvents({ accumulator }: SimContext): MetricOutcome {
    const counts: Record<string, number> = {};
    for (const [result, n] of Object.entries(accumulator.drive.driveResults)) {
      const label = SIM_DRIVE_LABELS[result] ?? result;
      counts[label] = (counts[label] ?? 0) + n;
    }
    return Object.keys(counts).length === 0 ? noObservations("no drives") : categorical(counts);
  },
  computeFromReal<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
    const seen = new Map<string, string>();
    for (const row of input.pbp.rows) {
      if (row.fixedDrive === null || row.seasonType !== "REG" || row.fixedDriveResult === null) continue;
      seen.set(`${row.gameId}|${row.fixedDrive}`, row.fixedDriveResult);
    }
    const counts: Record<string, number> = {};
    for (const result of seen.values()) {
      const label = REAL_DRIVE_LABELS[result] ?? "other";
      counts[label] = (counts[label] ?? 0) + 1;
    }
    return Object.keys(counts).length === 0 ? noObservations("no drives in pbp") : categorical(counts);
  },
});

/** The engine's `DriveResult` union (ADR-014) onto shared labels. */
const SIM_DRIVE_LABELS: Readonly<Record<string, string>> = {
  TOUCHDOWN: "touchdown",
  FIELD_GOAL: "field_goal",
  MISSED_FIELD_GOAL: "missed_field_goal",
  PUNT: "punt",
  INTERCEPTION: "interception",
  TURNOVER_ON_DOWNS: "downs",
  SAFETY: "safety",
  END_OF_HALF: "end_of_half",
  END_OF_GAME: "end_of_half",
};

/** nflverse's `fixed_drive_result` free text onto the same labels. */
const REAL_DRIVE_LABELS: Readonly<Record<string, string>> = {
  Touchdown: "touchdown",
  "Field goal": "field_goal",
  "Missed field goal": "missed_field_goal",
  Punt: "punt",
  Interception: "interception",
  "Turnover on downs": "downs",
  Safety: "safety",
  "End of half": "end_of_half",
  "Opp touchdown": "opp_touchdown",
  Fumble: "fumble",
  "Fumble, safety": "fumble",
  "Fumble, return TD": "fumble",
};

/**
 * A histogram attachment rather than a test. Reports print it beside the KS result because a
 * p-value tells a reader that two shapes differ and never where, and "zero mass between 10 and
 * 14" is the finding.
 */
export function carryHistogram(values: readonly number[]): Record<string, number> {
  return histogram(values, 2, -10, 40);
}

export const TIER_2_METRICS: readonly Metric[] = [
  carryDistribution,
  playYardageDistribution,
  teamScoreDistribution,
  scoreKeyNumbers,
  marginDistribution,
  driveOutcomeMix,
];
