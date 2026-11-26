/**
 * THE INJURIES SNAPSHOT'S ROWS (ADR-087 AB7, §12.3.7): the four kinds of file `standin-injuries` reads,
 * the columns it reads from each, and how a parquet cell becomes the value the copied spell rules
 * (`injuryRules.ts`) read.
 *
 * Calibration reads the same nflverse tables as CSV (`injuries/rows.ts`, through `RowView`), so the
 * reading here mirrors `RowView`: text is trimmed and an empty cell is null (`text`); a number is
 * truncated (`int`); a blank or missing `game_type` reads as the regular season (`isRegular`); a
 * required text cell that is empty refuses the run, by column and file only. Names (`full_name`,
 * `player`) are read only for the snap join, inside `buildTimelines`, and never leave it.
 */
import type { GameRow, ReportRow, RosterRow, SnapRow } from "./injuryRules.js";
import { normaliseGameStatus, normalisePracticeStatus } from "./injuryRules.js";
import type { ReadRows } from "./rows.js";

/** The schedules' columns read: each game, and its date for the cut. */
export const INJURY_SCHEDULE_COLUMNS = ["game_id", "season", "game_type", "week", "home_team", "away_team", "gameday"] as const;
/** One season's weekly rosters. */
export const INJURY_ROSTER_COLUMNS = [
  "season", "week", "team", "gsis_id", "status", "status_description_abbr", "game_type", "pfr_id", "full_name",
] as const;
/** One season's injury reports. */
export const INJURY_REPORT_COLUMNS = [
  "season", "week", "team", "gsis_id", "game_type", "report_primary_injury", "practice_primary_injury", "report_status", "practice_status",
] as const;
/** One season's snap counts. */
export const INJURY_SNAP_COLUMNS = [
  "season", "week", "team", "game_type", "pfr_player_id", "player", "offense_snaps", "defense_snaps", "st_snaps",
] as const;

/** A row as the parquet reader gives it: the columns asked for, values of any JSON kind. */
type Raw = Readonly<Record<string, unknown>>;

/** `RowView.text`: trimmed, and an empty or missing cell is null. */
export function cellText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

/** `RowView.int`: a whole number, truncated; null when empty or not a number. */
export function cellInt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** `RowView.req`: a text cell that must be there; refused by file and column alone, never by value. */
function cellReq(v: unknown, key: string, column: string): string {
  const s = cellText(v);
  if (s === null) throw new Error(`${key}.parquet: a row has no ${column}; the run stops`);
  return s;
}

/** `isRegular`: a blank or missing `game_type` is the regular season, as calibration reads it. */
export function isRegularRow(row: Raw): boolean {
  return (cellText(row.game_type) ?? "REG") === "REG";
}

/** A game of the schedules, with its date (`gameday`, null when the file has none). */
export interface DatedGameRow extends GameRow {
  readonly gameday: string | null;
}

/** calibration's `parseGames`: the regular-season games of `seasons`, with their dates. */
export function gameRows(rows: readonly Raw[], seasons: readonly number[]): DatedGameRow[] {
  const keep = new Set(seasons);
  const out: DatedGameRow[] = [];
  for (const row of rows) {
    const season = cellInt(row.season);
    if (season === null || !keep.has(season) || !isRegularRow(row)) continue;
    out.push({
      season,
      week: cellInt(row.week) ?? 0,
      gameId: cellReq(row.game_id, "schedules", "game_id"),
      home: cellReq(row.home_team, "schedules", "home_team"),
      away: cellReq(row.away_team, "schedules", "away_team"),
      gameday: cellText(row.gameday),
    });
  }
  return out;
}

/** calibration's `parseRosters`: one season's regular-season rows with a gsis id. */
export function rosterRows(rows: readonly Raw[], season: number, key: string): RosterRow[] {
  const out: RosterRow[] = [];
  for (const row of rows) {
    const gsisId = cellText(row.gsis_id);
    if (cellInt(row.season) !== season || !isRegularRow(row) || gsisId === null) continue;
    out.push({
      season,
      week: cellInt(row.week) ?? 0,
      team: cellReq(row.team, key, "team"),
      gsisId,
      name: cellText(row.full_name) ?? "",
      status: cellText(row.status),
      code: cellText(row.status_description_abbr),
      pfrId: cellText(row.pfr_id),
    });
  }
  return out;
}

/** calibration's `parseReports`. */
export function reportRows(rows: readonly Raw[], season: number, key: string): ReportRow[] {
  const out: ReportRow[] = [];
  for (const row of rows) {
    const gsisId = cellText(row.gsis_id);
    if (cellInt(row.season) !== season || !isRegularRow(row) || gsisId === null) continue;
    out.push({
      season,
      week: cellInt(row.week) ?? 0,
      team: cellReq(row.team, key, "team"),
      gsisId,
      reportInjury: cellText(row.report_primary_injury),
      gameStatus: normaliseGameStatus(cellText(row.report_status)),
      practiceInjury: cellText(row.practice_primary_injury),
      practiceStatus: normalisePracticeStatus(cellText(row.practice_status)),
    });
  }
  return out;
}

/** calibration's `parseSnaps`: offence, defence and special-teams snaps, an empty cell read as 0. */
export function snapRows(rows: readonly Raw[], season: number, key: string): SnapRow[] {
  const out: SnapRow[] = [];
  for (const row of rows) {
    if (cellInt(row.season) !== season || !isRegularRow(row)) continue;
    out.push({
      season,
      week: cellInt(row.week) ?? 0,
      team: cellReq(row.team, key, "team"),
      pfrId: cellText(row.pfr_player_id),
      name: cellText(row.player) ?? "",
      snaps: (cellInt(row.offense_snaps) ?? 0) + (cellInt(row.defense_snaps) ?? 0) + (cellInt(row.st_snaps) ?? 0),
    });
  }
  return out;
}

/** Rows whose `game_type` is blank or missing (read as the regular season, as calibration does): counted for the printout. */
export const blankGameType = (rows: readonly Raw[]): number => rows.filter((r) => cellText(r.game_type) === null).length;

/** The schedules, read once. */
export async function loadInjuryScheduleRows(dir: string, read: ReadRows): Promise<Raw[]> {
  return read<Raw>(dir, "schedules", INJURY_SCHEDULE_COLUMNS);
}

/** One season's three files, read only when that season is built, so no more than one season's rows are held. */
export async function loadInjurySeasonRows(dir: string, season: number, read: ReadRows): Promise<{ rosters: Raw[]; reports: Raw[]; snaps: Raw[] }> {
  return {
    rosters: await read<Raw>(dir, `rosters${season}`, INJURY_ROSTER_COLUMNS),
    reports: await read<Raw>(dir, `injuries${season}`, INJURY_REPORT_COLUMNS),
    snaps: await read<Raw>(dir, `snaps${season}`, INJURY_SNAP_COLUMNS),
  };
}
