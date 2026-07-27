/**
 * nflverse play-by-play. 372 columns upstream; we persist a projection of ~90.
 *
 * The projection is a *cache-size* decision, not a schema decision: `schemaHash` is computed
 * over all 372 upstream columns, so a rename in a column we do not yet read still trips the
 * drift alarm. Widening the projection later is an `ingestVersion` bump, not a re-design.
 *
 * `desc` (the free-text play description, by far the largest column) is deliberately excluded:
 * it is ~40% of the file and calibration computes from structured fields.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type RowView, type SourceDefinition } from "./types.js";

export interface PbpRow {
  readonly playId: number;
  readonly gameId: string;
  readonly oldGameId: string | null;
  readonly season: number;
  readonly seasonType: string;
  readonly week: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly posteam: string | null;
  readonly posteamType: string | null;
  readonly defteam: string | null;

  // situation
  readonly qtr: number | null;
  readonly down: number | null;
  readonly ydstogo: number | null;
  readonly yardline100: number | null;
  readonly goalToGo: boolean | null;
  readonly gameSecondsRemaining: number | null;
  readonly halfSecondsRemaining: number | null;
  readonly scoreDifferential: number | null;
  readonly posteamScore: number | null;
  readonly defteamScore: number | null;
  readonly posteamTimeoutsRemaining: number | null;
  readonly defteamTimeoutsRemaining: number | null;

  // play identity
  readonly playType: string | null;
  readonly playTypeNfl: string | null;
  readonly specialTeamsPlay: boolean | null;
  readonly abortedPlay: boolean | null;
  readonly playDeleted: boolean | null;
  readonly shotgun: boolean | null;
  readonly noHuddle: boolean | null;
  readonly qbDropback: boolean | null;
  readonly qbKneel: boolean | null;
  readonly qbSpike: boolean | null;
  readonly qbScramble: boolean | null;

  // outcome
  readonly yardsGained: number | null;
  readonly passAttempt: boolean | null;
  readonly rushAttempt: boolean | null;
  readonly completePass: boolean | null;
  readonly incompletePass: boolean | null;
  readonly interception: boolean | null;
  readonly sack: boolean | null;
  readonly qbHit: boolean | null;
  readonly touchdown: boolean | null;
  readonly passTouchdown: boolean | null;
  readonly rushTouchdown: boolean | null;
  readonly returnTouchdown: boolean | null;
  readonly fumble: boolean | null;
  readonly fumbleLost: boolean | null;
  readonly fumbleForced: boolean | null;
  readonly safety: boolean | null;
  readonly touchback: boolean | null;
  readonly firstDown: boolean | null;
  readonly firstDownRush: boolean | null;
  readonly firstDownPass: boolean | null;
  readonly firstDownPenalty: boolean | null;
  readonly thirdDownConverted: boolean | null;
  readonly thirdDownFailed: boolean | null;
  readonly fourthDownConverted: boolean | null;
  readonly fourthDownFailed: boolean | null;

  // passing detail
  readonly passLength: string | null;
  readonly passLocation: string | null;
  readonly airYards: number | null;
  readonly yardsAfterCatch: number | null;
  readonly cp: number | null;
  readonly cpoe: number | null;
  readonly xpass: number | null;
  readonly passOe: number | null;

  // rushing detail
  readonly runLocation: string | null;
  readonly runGap: string | null;

  // kicking / special
  readonly fieldGoalResult: string | null;
  readonly kickDistance: number | null;
  readonly extraPointResult: string | null;
  readonly twoPointConvResult: string | null;
  readonly puntAttempt: boolean | null;
  readonly kickoffAttempt: boolean | null;
  readonly fieldGoalAttempt: boolean | null;
  readonly extraPointAttempt: boolean | null;
  readonly twoPointAttempt: boolean | null;

  // penalties
  readonly penalty: boolean | null;
  readonly penaltyTeam: string | null;
  readonly penaltyType: string | null;
  readonly penaltyYards: number | null;

  // drive / series
  readonly fixedDrive: number | null;
  readonly fixedDriveResult: string | null;
  readonly drivePlayCount: number | null;
  readonly series: number | null;
  readonly seriesResult: string | null;

  // value models (validation only, per Charter D3 family D)
  readonly ep: number | null;
  readonly epa: number | null;
  readonly wp: number | null;
  readonly qbEpa: number | null;
  readonly success: boolean | null;

  // participants
  readonly passerPlayerId: string | null;
  readonly receiverPlayerId: string | null;
  readonly rusherPlayerId: string | null;
  readonly interceptionPlayerId: string | null;
  readonly sackPlayerId: string | null;
  readonly halfSack1PlayerId: string | null;
  readonly halfSack2PlayerId: string | null;
  readonly passDefense1PlayerId: string | null;
  readonly passDefense2PlayerId: string | null;
  readonly forcedFumblePlayer1PlayerId: string | null;
}

const PROJECTION = [
  "play_id", "game_id", "old_game_id", "season", "season_type", "week",
  "home_team", "away_team", "posteam", "posteam_type", "defteam",
  "qtr", "down", "ydstogo", "yardline_100", "goal_to_go",
  "game_seconds_remaining", "half_seconds_remaining", "score_differential",
  "posteam_score", "defteam_score", "posteam_timeouts_remaining", "defteam_timeouts_remaining",
  "play_type", "play_type_nfl", "special_teams_play", "aborted_play", "play_deleted",
  "shotgun", "no_huddle", "qb_dropback", "qb_kneel", "qb_spike", "qb_scramble",
  "yards_gained", "pass_attempt", "rush_attempt", "complete_pass", "incomplete_pass",
  "interception", "sack", "qb_hit", "touchdown", "pass_touchdown", "rush_touchdown",
  "return_touchdown", "fumble", "fumble_lost", "fumble_forced", "safety", "touchback",
  "first_down", "first_down_rush", "first_down_pass", "first_down_penalty",
  "third_down_converted", "third_down_failed", "fourth_down_converted", "fourth_down_failed",
  "pass_length", "pass_location", "air_yards", "yards_after_catch", "cp", "cpoe",
  "xpass", "pass_oe", "run_location", "run_gap",
  "field_goal_result", "kick_distance", "extra_point_result", "two_point_conv_result",
  "punt_attempt", "kickoff_attempt", "field_goal_attempt", "extra_point_attempt",
  "two_point_attempt",
  "penalty", "penalty_team", "penalty_type", "penalty_yards",
  "fixed_drive", "fixed_drive_result", "drive_play_count", "series", "series_result",
  "ep", "epa", "wp", "qb_epa", "success",
  "passer_player_id", "receiver_player_id", "rusher_player_id", "interception_player_id",
  "sack_player_id", "half_sack_1_player_id", "half_sack_2_player_id",
  "pass_defense_1_player_id", "pass_defense_2_player_id", "forced_fumble_player_1_player_id",
] as const;

export const pbpSource: SourceDefinition<PbpRow> = {
  id: "pbp",
  description: "nflverse play-by-play (372 cols upstream, ~100 persisted; `desc` excluded)",
  ingestVersion: 1,
  assetUrls: (season) => [nflverseAsset("pbp", `play_by_play_${season}.csv.gz`)],
  minRows: () => 40_000, // ~49k plays in a modern season incl. playoffs
  formats: [{
  id: "pbp_v1",
  requiredColumns: [
    "play_id", "game_id", "season", "week", "posteam", "defteam", "play_type",
    "yards_gained", "pass_attempt", "rush_attempt", "complete_pass", "interception", "sack",
  ],
  projection: [...PROJECTION],
  parseRow(row: RowView, season: Season): PbpRow | null {
    if (row.int("season") !== season) return null;
    return {
      playId: row.int("play_id") ?? -1,
      gameId: row.req("game_id"),
      oldGameId: row.text("old_game_id"),
      season,
      seasonType: row.text("season_type") ?? "REG",
      week: row.int("week") ?? 0,
      homeTeam: row.req("home_team"),
      awayTeam: row.req("away_team"),
      posteam: row.text("posteam"),
      posteamType: row.text("posteam_type"),
      defteam: row.text("defteam"),

      qtr: row.int("qtr"),
      down: row.int("down"),
      ydstogo: row.int("ydstogo"),
      yardline100: row.int("yardline_100"),
      goalToGo: row.bool("goal_to_go"),
      gameSecondsRemaining: row.int("game_seconds_remaining"),
      halfSecondsRemaining: row.int("half_seconds_remaining"),
      scoreDifferential: row.int("score_differential"),
      posteamScore: row.int("posteam_score"),
      defteamScore: row.int("defteam_score"),
      posteamTimeoutsRemaining: row.int("posteam_timeouts_remaining"),
      defteamTimeoutsRemaining: row.int("defteam_timeouts_remaining"),

      playType: row.text("play_type"),
      playTypeNfl: row.text("play_type_nfl"),
      specialTeamsPlay: row.bool("special_teams_play"),
      abortedPlay: row.bool("aborted_play"),
      playDeleted: row.bool("play_deleted"),
      shotgun: row.bool("shotgun"),
      noHuddle: row.bool("no_huddle"),
      qbDropback: row.bool("qb_dropback"),
      qbKneel: row.bool("qb_kneel"),
      qbSpike: row.bool("qb_spike"),
      qbScramble: row.bool("qb_scramble"),

      yardsGained: row.int("yards_gained"),
      passAttempt: row.bool("pass_attempt"),
      rushAttempt: row.bool("rush_attempt"),
      completePass: row.bool("complete_pass"),
      incompletePass: row.bool("incomplete_pass"),
      interception: row.bool("interception"),
      sack: row.bool("sack"),
      qbHit: row.bool("qb_hit"),
      touchdown: row.bool("touchdown"),
      passTouchdown: row.bool("pass_touchdown"),
      rushTouchdown: row.bool("rush_touchdown"),
      returnTouchdown: row.bool("return_touchdown"),
      fumble: row.bool("fumble"),
      fumbleLost: row.bool("fumble_lost"),
      fumbleForced: row.bool("fumble_forced"),
      safety: row.bool("safety"),
      touchback: row.bool("touchback"),
      firstDown: row.bool("first_down"),
      firstDownRush: row.bool("first_down_rush"),
      firstDownPass: row.bool("first_down_pass"),
      firstDownPenalty: row.bool("first_down_penalty"),
      thirdDownConverted: row.bool("third_down_converted"),
      thirdDownFailed: row.bool("third_down_failed"),
      fourthDownConverted: row.bool("fourth_down_converted"),
      fourthDownFailed: row.bool("fourth_down_failed"),

      passLength: row.text("pass_length"),
      passLocation: row.text("pass_location"),
      airYards: row.int("air_yards"),
      yardsAfterCatch: row.int("yards_after_catch"),
      cp: row.num("cp"),
      cpoe: row.num("cpoe"),
      xpass: row.num("xpass"),
      passOe: row.num("pass_oe"),

      runLocation: row.text("run_location"),
      runGap: row.text("run_gap"),

      fieldGoalResult: row.text("field_goal_result"),
      kickDistance: row.int("kick_distance"),
      extraPointResult: row.text("extra_point_result"),
      twoPointConvResult: row.text("two_point_conv_result"),
      puntAttempt: row.bool("punt_attempt"),
      kickoffAttempt: row.bool("kickoff_attempt"),
      fieldGoalAttempt: row.bool("field_goal_attempt"),
      extraPointAttempt: row.bool("extra_point_attempt"),
      twoPointAttempt: row.bool("two_point_attempt"),

      penalty: row.bool("penalty"),
      penaltyTeam: row.text("penalty_team"),
      penaltyType: row.text("penalty_type"),
      penaltyYards: row.int("penalty_yards"),

      fixedDrive: row.int("fixed_drive"),
      fixedDriveResult: row.text("fixed_drive_result"),
      drivePlayCount: row.int("drive_play_count"),
      series: row.int("series"),
      seriesResult: row.text("series_result"),

      ep: row.num("ep"),
      epa: row.num("epa"),
      wp: row.num("wp"),
      qbEpa: row.num("qb_epa"),
      success: row.bool("success"),

      passerPlayerId: row.text("passer_player_id"),
      receiverPlayerId: row.text("receiver_player_id"),
      rusherPlayerId: row.text("rusher_player_id"),
      interceptionPlayerId: row.text("interception_player_id"),
      sackPlayerId: row.text("sack_player_id"),
      halfSack1PlayerId: row.text("half_sack_1_player_id"),
      halfSack2PlayerId: row.text("half_sack_2_player_id"),
      passDefense1PlayerId: row.text("pass_defense_1_player_id"),
      passDefense2PlayerId: row.text("pass_defense_2_player_id"),
      forcedFumblePlayer1PlayerId: row.text("forced_fumble_player_1_player_id"),
    };
  },
  }],
};
