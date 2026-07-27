/**
 * NFL Next Gen Stats, via nflverse. Charter §3-D3 family B — the best isolated skill signals,
 * and simultaneously calibration's Tier 4 convergence targets (`calibration.md` §4): average
 * time-to-throw, CPOE, separation, rush yards over expected.
 *
 * **Asset choice, and why it is the all-seasons file.** Per-season assets (`ngs_<season>_<type>`)
 * exist only through 2024, and the 2024 ones are *published but near-empty* — four rows for
 * passing where 603 are expected. Measured against them, a 2024 baseline would be computed from
 * four players and would look like a calibration failure rather than a data failure. The
 * all-seasons `ngs_<type>.csv.gz` is complete for 2016–2025, is under 1 MB, and is therefore the
 * primary; the per-season files remain as a fallback only.
 *
 * Consequence: every season scans the whole file and keeps one season's rows, so `rowCount` is
 * much smaller than `scannedRowCount` in the manifest. That is expected, and the two fields exist
 * so it is visible rather than mysterious.
 *
 * `week = 0` rows are the season aggregate; they are kept and flagged, not dropped, because Tier
 * 4 wants season-level rates while the play-caller fit wants weeks.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type RowView, type SourceDefinition } from "./types.js";

export interface NgsCommon {
  readonly season: number;
  readonly seasonType: string;
  readonly week: number;
  /** true when this row is the season aggregate rather than a single week. */
  readonly isSeasonAggregate: boolean;
  readonly playerGsisId: string | null;
  readonly playerDisplayName: string;
  readonly playerPosition: string | null;
  readonly team: string | null;
}

export interface NgsPassingRow extends NgsCommon {
  readonly avgTimeToThrow: number | null;
  readonly avgCompletedAirYards: number | null;
  readonly avgIntendedAirYards: number | null;
  readonly avgAirYardsDifferential: number | null;
  readonly aggressiveness: number | null;
  readonly maxCompletedAirDistance: number | null;
  readonly avgAirYardsToSticks: number | null;
  readonly attempts: number | null;
  readonly passYards: number | null;
  readonly passTouchdowns: number | null;
  readonly interceptions: number | null;
  readonly passerRating: number | null;
  readonly completions: number | null;
  readonly completionPercentage: number | null;
  readonly expectedCompletionPercentage: number | null;
  readonly completionPercentageAboveExpectation: number | null;
  readonly avgAirDistance: number | null;
  readonly maxAirDistance: number | null;
}

export interface NgsRushingRow extends NgsCommon {
  readonly efficiency: number | null;
  readonly percentAttemptsGteEightDefenders: number | null;
  readonly avgTimeToLos: number | null;
  readonly rushAttempts: number | null;
  readonly rushYards: number | null;
  readonly expectedRushYards: number | null;
  readonly rushYardsOverExpected: number | null;
  readonly avgRushYards: number | null;
  readonly rushYardsOverExpectedPerAtt: number | null;
  readonly rushPctOverExpected: number | null;
  readonly rushTouchdowns: number | null;
}

export interface NgsReceivingRow extends NgsCommon {
  readonly avgCushion: number | null;
  readonly avgSeparation: number | null;
  readonly avgIntendedAirYards: number | null;
  readonly percentShareOfIntendedAirYards: number | null;
  readonly receptions: number | null;
  readonly targets: number | null;
  readonly catchPercentage: number | null;
  readonly yards: number | null;
  readonly recTouchdowns: number | null;
  readonly avgYac: number | null;
  readonly avgExpectedYac: number | null;
  readonly avgYacAboveExpectation: number | null;
}

const COMMON_REQUIRED = ["season", "season_type", "week", "player_gsis_id", "team_abbr"] as const;

function ngsUrls(kind: string) {
  return (season: Season): readonly string[] => [
    nflverseAsset("nextgen_stats", `ngs_${kind}.csv.gz`),
    // fallback only; per-season assets stop at 2024 and the 2024 ones are near-empty upstream.
    nflverseAsset("nextgen_stats", `ngs_${season}_${kind}.csv.gz`),
  ];
}

function common(row: RowView, season: Season): NgsCommon | null {
  if (row.int("season") !== season) return null;
  const week = row.int("week") ?? 0;
  return {
    season,
    seasonType: row.text("season_type") ?? "REG",
    week,
    isSeasonAggregate: week === 0,
    playerGsisId: row.text("player_gsis_id"),
    playerDisplayName: row.text("player_display_name") ?? "",
    playerPosition: row.text("player_position"),
    team: row.text("team_abbr"),
  };
}

export const ngsPassingSource: SourceDefinition<NgsPassingRow> = {
  id: "ngs_passing",
  description: "Next Gen Stats passing — time to throw, aggressiveness, CPOE",
  ingestVersion: 1,
  assetUrls: ngsUrls("passing"),
  minRows: () => 300,
  formats: [{
  id: "ngs_passing_v1",
  requiredColumns: [...COMMON_REQUIRED, "avg_time_to_throw", "completion_percentage_above_expectation"],
  projection: null,
  parseRow(row, season) {
    const base = common(row, season);
    if (base === null) return null;
    return {
      ...base,
      avgTimeToThrow: row.num("avg_time_to_throw"),
      avgCompletedAirYards: row.num("avg_completed_air_yards"),
      avgIntendedAirYards: row.num("avg_intended_air_yards"),
      avgAirYardsDifferential: row.num("avg_air_yards_differential"),
      aggressiveness: row.num("aggressiveness"),
      maxCompletedAirDistance: row.num("max_completed_air_distance"),
      avgAirYardsToSticks: row.num("avg_air_yards_to_sticks"),
      attempts: row.int("attempts"),
      passYards: row.int("pass_yards"),
      passTouchdowns: row.int("pass_touchdowns"),
      interceptions: row.int("interceptions"),
      passerRating: row.num("passer_rating"),
      completions: row.int("completions"),
      completionPercentage: row.num("completion_percentage"),
      expectedCompletionPercentage: row.num("expected_completion_percentage"),
      completionPercentageAboveExpectation: row.num("completion_percentage_above_expectation"),
      avgAirDistance: row.num("avg_air_distance"),
      maxAirDistance: row.num("max_air_distance"),
    };
  },
  }],
};

export const ngsRushingSource: SourceDefinition<NgsRushingRow> = {
  id: "ngs_rushing",
  description: "Next Gen Stats rushing — efficiency, time to LOS, rush yards over expected",
  ingestVersion: 1,
  assetUrls: ngsUrls("rushing"),
  minRows: () => 300,
  formats: [{
  id: "ngs_rushing_v1",
  requiredColumns: [...COMMON_REQUIRED, "rush_yards_over_expected", "avg_time_to_los"],
  projection: null,
  parseRow(row, season) {
    const base = common(row, season);
    if (base === null) return null;
    return {
      ...base,
      efficiency: row.num("efficiency"),
      percentAttemptsGteEightDefenders: row.num("percent_attempts_gte_eight_defenders"),
      avgTimeToLos: row.num("avg_time_to_los"),
      rushAttempts: row.int("rush_attempts"),
      rushYards: row.int("rush_yards"),
      expectedRushYards: row.num("expected_rush_yards"),
      rushYardsOverExpected: row.num("rush_yards_over_expected"),
      avgRushYards: row.num("avg_rush_yards"),
      rushYardsOverExpectedPerAtt: row.num("rush_yards_over_expected_per_att"),
      rushPctOverExpected: row.num("rush_pct_over_expected"),
      rushTouchdowns: row.int("rush_touchdowns"),
    };
  },
  }],
};

export const ngsReceivingSource: SourceDefinition<NgsReceivingRow> = {
  id: "ngs_receiving",
  description: "Next Gen Stats receiving — cushion, separation, YAC over expected",
  ingestVersion: 1,
  assetUrls: ngsUrls("receiving"),
  minRows: () => 700,
  formats: [{
  id: "ngs_receiving_v1",
  requiredColumns: [...COMMON_REQUIRED, "avg_separation", "avg_cushion"],
  projection: null,
  parseRow(row, season) {
    const base = common(row, season);
    if (base === null) return null;
    return {
      ...base,
      avgCushion: row.num("avg_cushion"),
      avgSeparation: row.num("avg_separation"),
      avgIntendedAirYards: row.num("avg_intended_air_yards"),
      percentShareOfIntendedAirYards: row.num("percent_share_of_intended_air_yards"),
      receptions: row.int("receptions"),
      targets: row.int("targets"),
      catchPercentage: row.num("catch_percentage"),
      yards: row.int("yards"),
      recTouchdowns: row.int("rec_touchdowns"),
      avgYac: row.num("avg_yac"),
      avgExpectedYac: row.num("avg_expected_yac"),
      avgYacAboveExpectation: row.num("avg_yac_above_expectation"),
    };
  },
  }],
};
