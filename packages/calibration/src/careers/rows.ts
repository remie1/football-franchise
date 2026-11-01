/**
 * The three nflverse tables the career baselines read, as lean rows (ADR-087 D5b).
 *
 * Each decoder keeps only the columns the measures need. No name column is ever kept: players are
 * known by their ids, and only aggregates leave this module's callers (Iron Rule 7 spirit,
 * `calibration.md` §7). Only regular-season rows are kept (`game_type` REG). The CSV scanner and
 * row view are the ingest layer's, through the injury measurement's `scan`.
 */

import { isRegular, scan } from "../injuries/rows.js";

/** One player's line on one team's weekly roster (nflverse `roster_weekly_<season>.csv`). */
export interface CareerRosterRow {
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly gsisId: string;
  /** Coarse status verbatim: ACT, INA, RES, DEV, CUT, RET, ... */
  readonly status: string | null;
  /** NFL description code verbatim: A01, I01, P01, R01, ... (blank in some seasons). */
  readonly code: string | null;
  readonly position: string | null;
  readonly depthChartPosition: string | null;
  /** `YYYY-MM-DD`. */
  readonly birthDate: string | null;
  readonly yearsExp: number | null;
  /** Overall pick; null when undrafted. */
  readonly draftNumber: number | null;
  readonly rookieYear: number | null;
  readonly entryYear: number | null;
  readonly pfrId: string | null;
}

/** One player's snaps for one team in one game (nflverse `snap_counts_<season>.csv`, from PFR). */
export interface CareerSnapRow {
  readonly season: number;
  readonly week: number;
  readonly gameId: string;
  readonly team: string;
  readonly pfrId: string;
  /** PFR's listed position (used only when the player has no roster row that season). */
  readonly position: string | null;
  readonly offense: number;
  readonly defense: number;
  readonly special: number;
}

/** One player's ids and birth date (nflverse `players.csv`); no other column is read. */
export interface PlayerIdRow {
  readonly pfrId: string;
  readonly gsisId: string | null;
  readonly birthDate: string | null;
}

const ROSTER_REQUIRED = ["season", "week", "game_type", "team", "gsis_id", "status"] as const;
const ROSTER_EXTRA = [
  "status_description_abbr", "position", "depth_chart_position", "birth_date", "years_exp",
  "draft_number", "rookie_year", "entry_year", "pfr_id",
] as const;

export function parseCareerRosters(text: string, season: number): CareerRosterRow[] {
  return scan(text, ROSTER_REQUIRED, ROSTER_EXTRA, (row) => {
    const gsisId = row.text("gsis_id");
    if (row.int("season") !== season || !isRegular(row) || gsisId === null) return null;
    return {
      season,
      week: row.int("week") ?? 0,
      team: row.req("team"),
      gsisId,
      status: row.text("status"),
      code: row.text("status_description_abbr"),
      position: row.text("position"),
      depthChartPosition: row.text("depth_chart_position"),
      birthDate: row.text("birth_date"),
      yearsExp: row.int("years_exp"),
      draftNumber: row.int("draft_number"),
      rookieYear: row.int("rookie_year"),
      entryYear: row.int("entry_year"),
      pfrId: row.text("pfr_id"),
    };
  });
}

const SNAP_REQUIRED = ["game_id", "season", "game_type", "week", "team", "pfr_player_id", "offense_snaps", "defense_snaps", "st_snaps"] as const;

export function parseCareerSnaps(text: string, season: number): CareerSnapRow[] {
  return scan(text, SNAP_REQUIRED, ["position"], (row) => {
    const pfrId = row.text("pfr_player_id");
    if (row.int("season") !== season || !isRegular(row) || pfrId === null) return null;
    return {
      season,
      week: row.int("week") ?? 0,
      gameId: row.req("game_id"),
      team: row.req("team"),
      pfrId,
      position: row.text("position"),
      offense: row.int("offense_snaps") ?? 0,
      defense: row.int("defense_snaps") ?? 0,
      special: row.int("st_snaps") ?? 0,
    };
  });
}

/** `players.csv`: the PFR id, the GSIS id and the birth date, nothing else (never `last_season` or `status`). */
export function parsePlayerIds(text: string): PlayerIdRow[] {
  return scan(text, ["pfr_id", "gsis_id", "birth_date"], [], (row) => {
    const pfrId = row.text("pfr_id");
    if (pfrId === null) return null;
    return { pfrId, gsisId: row.text("gsis_id"), birthDate: row.text("birth_date") };
  });
}
