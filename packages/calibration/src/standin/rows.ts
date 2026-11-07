/**
 * The nflverse tables the stand-in recount reads (ADR-087), as lean rows.
 *
 * - the weekly rosters of one season, EVERY game type (the importer reads its file whole; the real
 *   count keeps the regular season), with the career rows' columns and no name column;
 * - the player table (`players.csv`) for the columns the importer reads for a man: his GSIS id,
 *   birth date and draft year, round and pick. Never a name, `last_season` or `status`;
 * - the schedule (`games.csv`), one season's game days only, to place the file's 23 October point.
 *
 * The CSV scanner and row view are the ingest layer's, through the injury measurement's `scan`.
 * Only the season asked for is decoded; 2025 is held out (`calibration.md` §7) and the asset names
 * refuse it (`careers/data.ts`).
 */

import { scan } from "../injuries/rows.js";
import type { PlayerTableRow, RecountRosterRow } from "./rules.js";

const ROSTER_REQUIRED = ["season", "week", "game_type", "team", "status"] as const;
const ROSTER_EXTRA = [
  "gsis_id", "status_description_abbr", "position", "depth_chart_position", "birth_date", "years_exp",
  "draft_number", "rookie_year", "entry_year", "pfr_id",
] as const;

/** One season's weekly-roster rows, every game type. A row with no GSIS id is kept (the importer's team weeks count it). */
export function parseRecountRosters(text: string, season: number): RecountRosterRow[] {
  return scan(text, ROSTER_REQUIRED, ROSTER_EXTRA, (row) => {
    if (row.int("season") !== season) return null;
    return {
      season,
      week: row.int("week") ?? 0,
      gameType: row.text("game_type") ?? "REG",
      team: row.req("team"),
      gsisId: row.text("gsis_id"),
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

/**
 * The player table by GSIS id, as the importer joins it (`new Map(players.map(...))`: on a
 * repeated id the later row wins). Rows with no GSIS id are dropped.
 */
export function parsePlayerTable(text: string): Map<string, PlayerTableRow> {
  const rows = scan(text, ["gsis_id", "birth_date", "draft_year", "draft_round", "draft_pick"], [], (row) => {
    const gsisId = row.text("gsis_id");
    if (gsisId === null) return null;
    return {
      gsisId,
      birthDate: row.text("birth_date"),
      draftYear: row.int("draft_year"),
      draftRound: row.int("draft_round"),
      draftPick: row.int("draft_pick"),
    };
  });
  return new Map(rows.map((r) => [r.gsisId, r]));
}

/** One week of one season's schedule: its game type and its first and last game days (`YYYY-MM-DD`). */
export interface ScheduleWeek {
  readonly week: number;
  readonly gameType: string;
  readonly first: string;
  readonly last: string;
}

/** The weeks of `season` in `games.csv`, by week. Rows of any other season are dropped unread past their season. */
export function parseScheduleWeeks(text: string, season: number): ScheduleWeek[] {
  const days = scan(text, ["season", "game_type", "week", "gameday"], [], (row) => {
    if (row.int("season") !== season) return null;
    return { week: row.int("week") ?? 0, gameType: row.text("game_type") ?? "REG", day: row.req("gameday") };
  });
  const byWeek = new Map<number, { gameType: string; first: string; last: string }>();
  for (const d of days) {
    const w = byWeek.get(d.week);
    if (w === undefined) byWeek.set(d.week, { gameType: d.gameType, first: d.day, last: d.day });
    else {
      if (d.day < w.first) w.first = d.day;
      if (d.day > w.last) w.last = d.day;
    }
  }
  return [...byWeek.entries()].sort((a, b) => a[0] - b[0]).map(([week, w]) => ({ week, ...w }));
}

/**
 * The week a file fetched on `date` would hold at the latest (CHOSEN reading): the last
 * regular-season week whose first game was played on or before that day. 23 October 2024, a
 * Wednesday, falls after week 7's last game (21 October) and before week 8's first (24 October),
 * so it reads week 7. Null when no week had started.
 */
export function snapshotWeek(weeks: readonly ScheduleWeek[], date: string): number | null {
  const started = weeks.filter((w) => w.gameType === "REG" && w.first <= date).map((w) => w.week);
  return started.length === 0 ? null : Math.max(...started);
}

/** The day after `date` (`YYYY-MM-DD`, UTC). */
export function dayAfter(date: string): string {
  const t = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(t)) throw new Error(`not a date: ${date}`);
  return new Date(t + 86_400_000).toISOString().slice(0, 10);
}
