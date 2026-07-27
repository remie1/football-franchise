/**
 * nflverse `schedules` — one row per game, 1999→present, in a single season-agnostic asset.
 * Carries the closing spread and total, which Tier 3's "upset rate vs spread" needs.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

export type GameType = "REG" | "WC" | "DIV" | "CON" | "SB" | "PRE";

export interface ScheduleRow {
  readonly gameId: string;
  readonly season: number;
  readonly gameType: string;
  readonly week: number;
  readonly gameday: string | null;
  readonly weekday: string | null;
  readonly gametime: string | null;
  readonly awayTeam: string;
  readonly homeTeam: string;
  readonly awayScore: number | null;
  readonly homeScore: number | null;
  readonly location: string | null;
  /** home_score - away_score, as published. */
  readonly result: number | null;
  readonly total: number | null;
  readonly overtime: boolean | null;
  readonly awayRest: number | null;
  readonly homeRest: number | null;
  readonly awayMoneyline: number | null;
  readonly homeMoneyline: number | null;
  /** Closing line, home perspective (negative = home favoured). */
  readonly spreadLine: number | null;
  readonly totalLine: number | null;
  readonly divGame: boolean | null;
  readonly roof: string | null;
  readonly surface: string | null;
  readonly temp: number | null;
  readonly wind: number | null;
  readonly awayQbId: string | null;
  readonly homeQbId: string | null;
  readonly awayCoach: string | null;
  readonly homeCoach: string | null;
  readonly referee: string | null;
  readonly stadiumId: string | null;
  /** nflverse `old_game_id`; the join key into pbp_participation. */
  readonly oldGameId: string | null;
  /** PFR game id; the join key into snap counts. */
  readonly pfrGameId: string | null;
}

export const schedulesSource: SourceDefinition<ScheduleRow> = {
  id: "schedules",
  description: "nflverse schedules/games — one row per game incl. closing spread & total",
  ingestVersion: 1,
  assetUrls: () => [nflverseAsset("schedules", "games.csv")],
  minRows: () => 250, // 272 regular-season + playoffs; a season below this is truncated
  formats: [{
  id: "games_v1",
  requiredColumns: [
    "game_id", "season", "game_type", "week", "away_team", "home_team",
    "away_score", "home_score", "spread_line", "total_line",
  ],
  projection: [
    "game_id", "season", "game_type", "week", "gameday", "weekday", "gametime",
    "away_team", "away_score", "home_team", "home_score", "location", "result", "total",
    "overtime", "old_game_id", "pfr", "away_rest", "home_rest", "away_moneyline",
    "home_moneyline", "spread_line", "total_line", "div_game", "roof", "surface", "temp",
    "wind", "away_qb_id", "home_qb_id", "away_coach", "home_coach", "referee", "stadium_id",
  ],
  parseRow(row, season: Season): ScheduleRow | null {
    if (row.int("season") !== season) return null;
    return {
      gameId: row.req("game_id"),
      season,
      gameType: row.req("game_type"),
      week: row.int("week") ?? 0,
      gameday: row.text("gameday"),
      weekday: row.text("weekday"),
      gametime: row.text("gametime"),
      awayTeam: row.req("away_team"),
      homeTeam: row.req("home_team"),
      awayScore: row.int("away_score"),
      homeScore: row.int("home_score"),
      location: row.text("location"),
      result: row.int("result"),
      total: row.int("total"),
      overtime: row.bool("overtime"),
      awayRest: row.int("away_rest"),
      homeRest: row.int("home_rest"),
      awayMoneyline: row.int("away_moneyline"),
      homeMoneyline: row.int("home_moneyline"),
      spreadLine: row.num("spread_line"),
      totalLine: row.num("total_line"),
      divGame: row.bool("div_game"),
      roof: row.text("roof"),
      surface: row.text("surface"),
      temp: row.num("temp"),
      wind: row.num("wind"),
      awayQbId: row.text("away_qb_id"),
      homeQbId: row.text("home_qb_id"),
      awayCoach: row.text("away_coach"),
      homeCoach: row.text("home_coach"),
      referee: row.text("referee"),
      stadiumId: row.text("stadium_id"),
      oldGameId: row.text("old_game_id"),
      pfrGameId: row.text("pfr"),
    };
  },
  }],
};
