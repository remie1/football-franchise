/**
 * The four nflverse tables the injury measurement reads, as lean rows (ADR-087 §5, build step E).
 *
 * The ingest layer (`../ingest/`) covers 2022-2025 only (its `Season` type), and the measurement
 * wants 2019-2024 plus 2018 to look back from. So this file parses the same upstream assets with
 * the ingest layer's own CSV scanner, row view and status normalisers, without its season gate.
 * 2025 is never read here: it is the held-out season (`calibration.md` §7).
 *
 * Only regular-season rows are kept (`game_type` REG).
 */

import { scanCsv } from "../ingest/csv.js";
import {
  normaliseGameStatus, normalisePracticeStatus, type InjuryGameStatus, type PracticeStatus,
} from "../ingest/sources/injuries.js";
import { makeRowView, type RowView } from "../ingest/sources/types.js";

/** One regular-season game (nflverse `games.csv`). */
export interface GameRow {
  readonly season: number;
  readonly week: number;
  readonly gameId: string;
  readonly home: string;
  readonly away: string;
}

/** One player on one team's roster in one game week (nflverse `roster_weekly_<season>.csv`). */
export interface RosterRow {
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly gsisId: string;
  readonly name: string;
  readonly position: string | null;
  /** Coarse status verbatim: ACT, INA, RES, DEV, CUT, ... */
  readonly status: string | null;
  /** NFL description code verbatim: A01, R01, R48, ... (blank in 2019 and early 2020). */
  readonly code: string | null;
  readonly pfrId: string | null;
}

/** One player's line on one team's final injury report of a week (nflverse `injuries_<season>.csv`). */
export interface ReportRow {
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly gsisId: string;
  readonly name: string;
  readonly position: string | null;
  readonly reportInjury: string | null;
  readonly gameStatus: InjuryGameStatus;
  readonly practiceInjury: string | null;
  readonly practiceStatus: PracticeStatus;
}

/** One player's snaps in one game (nflverse `snap_counts_<season>.csv`, from PFR). */
export interface SnapRow {
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly pfrId: string | null;
  readonly name: string;
  readonly position: string | null;
  /** Offence + defence + special teams snaps. */
  readonly snaps: number;
}

/** Scan a CSV and decode each regular-season row with `decode`; rows it returns null for are dropped. */
export function scan<T>(
  text: string,
  required: readonly string[],
  extra: readonly string[],
  decode: (row: RowView) => T | null,
): T[] {
  const out: T[] = [];
  let bind: (values: readonly string[]) => void = () => {};
  let view: RowView | null = null;
  scanCsv(text, {
    requiredColumns: required,
    keep: [...required, ...extra],
    onColumns: (kept) => {
      const made = makeRowView(kept);
      view = made.view;
      bind = made.bind;
    },
    onRow: (values) => {
      bind(values);
      if (view === null) return;
      const row = decode(view);
      if (row !== null) out.push(row);
    },
  });
  return out;
}

export const isRegular = (row: RowView): boolean => (row.text("game_type") ?? "REG") === "REG";

/** `games.csv` covers every season since 1999; keep the regular-season games of `seasons`. */
export function parseGames(text: string, seasons: readonly number[]): GameRow[] {
  const keep = new Set(seasons);
  return scan(text, ["game_id", "season", "game_type", "week", "home_team", "away_team"], [], (row) => {
    const season = row.int("season");
    if (season === null || !keep.has(season) || !isRegular(row)) return null;
    return {
      season,
      week: row.int("week") ?? 0,
      gameId: row.req("game_id"),
      home: row.req("home_team"),
      away: row.req("away_team"),
    };
  });
}

export function parseRosters(text: string, season: number): RosterRow[] {
  return scan(text, ["season", "week", "team", "gsis_id", "status", "game_type"], ["full_name", "position", "status_description_abbr", "pfr_id"], (row) => {
    const gsisId = row.text("gsis_id");
    if (row.int("season") !== season || !isRegular(row) || gsisId === null) return null;
    return {
      season,
      week: row.int("week") ?? 0,
      team: row.req("team"),
      gsisId,
      name: row.text("full_name") ?? "",
      position: row.text("position"),
      status: row.text("status"),
      code: row.text("status_description_abbr"),
      pfrId: row.text("pfr_id"),
    };
  });
}

export function parseReports(text: string, season: number): ReportRow[] {
  return scan(text, ["season", "week", "team", "gsis_id", "report_status", "practice_status", "game_type"], ["full_name", "position", "report_primary_injury", "practice_primary_injury"], (row) => {
    const gsisId = row.text("gsis_id");
    if (row.int("season") !== season || !isRegular(row) || gsisId === null) return null;
    return {
      season,
      week: row.int("week") ?? 0,
      team: row.req("team"),
      gsisId,
      name: row.text("full_name") ?? "",
      position: row.text("position"),
      reportInjury: row.text("report_primary_injury"),
      gameStatus: normaliseGameStatus(row.text("report_status")),
      practiceInjury: row.text("practice_primary_injury"),
      practiceStatus: normalisePracticeStatus(row.text("practice_status")),
    };
  });
}

export function parseSnaps(text: string, season: number): SnapRow[] {
  return scan(text, ["season", "week", "team", "player", "offense_snaps", "defense_snaps", "st_snaps", "game_type"], ["pfr_player_id", "position"], (row) => {
    if (row.int("season") !== season || !isRegular(row)) return null;
    return {
      season,
      week: row.int("week") ?? 0,
      team: row.req("team"),
      pfrId: row.text("pfr_player_id"),
      name: row.text("player") ?? "",
      position: row.text("position"),
      snaps: (row.int("offense_snaps") ?? 0) + (row.int("defense_snaps") ?? 0) + (row.int("st_snaps") ?? 0),
    };
  });
}
