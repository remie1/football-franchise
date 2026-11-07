/**
 * The snapshot's rows, as the importer reads them (ADR-088). Only the columns named are read, and
 * import-real's are the columns used. The officials snapshot's rows (ADR-093 step 1b) are plan-v2
 * §3 A1's lists, three columns of which nothing reads yet: the schedules' `week`, the officials
 * table's `season` and the plays' `season`. Field names are nflverse's.
 */
import { FIRST_SNAP_SEASON, readRows } from "./snapshot.js";
import type { ContractHistoryRow } from "./contracts.js";
import type { TrackingRow, TrackingSource } from "./tracking.js";

export interface RosterRow {
  readonly gsis_id: string | null;
  readonly pfr_id: string | null;
  readonly team: string;
  readonly week: number;
  readonly status: string;
  /** The detailed status (A01 the 53, P0x practice squad, R0x reserve lists); `standins.ts`. */
  readonly status_description_abbr: string | null;
  readonly position: string | null;
  readonly depth_chart_position: string | null;
  readonly birth_date: string | null;
  readonly height: number | null;
  readonly weight: number | null;
  readonly years_exp: number | null;
  /** Read only to keep stand-in names off real ones (`standins.ts`). */
  readonly full_name: string | null;
}

export interface PlayerRow {
  readonly gsis_id: string | null;
  /** Fills the roster file's gaps (it lacks a quarter of the pfr ids). */
  readonly pfr_id: string | null;
  readonly birth_date: string | null;
  readonly draft_year: number | null;
  readonly draft_round: number | null;
  readonly draft_pick: number | null;
  /** Read only to keep stand-in names off every real player, past or present (`standins.ts`). */
  readonly display_name: string | null;
}

export interface CombineRow {
  readonly pfr_id: string | null;
  readonly ht: string | null;
  readonly wt: number | null;
  readonly forty: number | null;
  readonly bench: number | null;
  readonly vertical: number | null;
  readonly cone: number | null;
}

export interface DepthRow {
  readonly dt: string;
  readonly team: string;
  readonly gsis_id: string | null;
  readonly pos_abb: string;
  readonly pos_rank: number;
}

export interface ContractRow extends ContractHistoryRow {
  readonly apy_cap_pct: number | null;
}

export interface SnapRow {
  readonly pfr_player_id: string | null;
  readonly season: number;
  readonly game_type: string;
  readonly offense_pct: number | null;
  readonly defense_pct: number | null;
  readonly st_pct: number | null;
  readonly offense_snaps: number | null;
  readonly defense_snaps: number | null;
  readonly st_snaps: number | null;
}

const cols = <T>(...names: (keyof T & string)[]) => names;

export interface InjuryRow {
  readonly gsis_id: string | null;
  readonly week: number;
  readonly report_primary_injury: string | null;
  readonly practice_primary_injury: string | null;
  readonly report_status: string | null;
}

/** Every season's snap rows from `FIRST_SNAP_SEASON` through `season`. */
export async function loadSnapRows(dir: string, season: number): Promise<SnapRow[]> {
  const out: SnapRow[] = [];
  for (let y = FIRST_SNAP_SEASON; y <= season; y++) {
    out.push(...await readRows<SnapRow>(dir, `snaps${y}`, cols<SnapRow>(
      "pfr_player_id", "season", "game_type", "offense_pct", "defense_pct", "st_pct", "offense_snaps", "defense_snaps", "st_snaps")));
  }
  return out;
}

export async function loadSnapshotRows(dir: string, season: number) {
  const [rosters, players, combine, depth, contracts, snaps, injuries] = await Promise.all([
    readRows<RosterRow>(dir, "rosters", cols<RosterRow>(
      "gsis_id", "pfr_id", "team", "week", "status", "status_description_abbr", "position", "depth_chart_position",
      "birth_date", "height", "weight", "years_exp", "full_name")),
    readRows<PlayerRow>(dir, "players", cols<PlayerRow>("gsis_id", "pfr_id", "birth_date", "draft_year", "draft_round", "draft_pick", "display_name")),
    readRows<CombineRow>(dir, "combine", cols<CombineRow>("pfr_id", "ht", "wt", "forty", "bench", "vertical", "cone")),
    readRows<DepthRow>(dir, "depth", cols<DepthRow>("dt", "team", "gsis_id", "pos_abb", "pos_rank")),
    readRows<ContractRow>(dir, "contracts", cols<ContractRow>(
      "gsis_id", "is_active", "year_signed", "years", "apy", "apy_cap_pct", "draft_year", "season_history")),
    loadSnapRows(dir, season),
    readRows<InjuryRow>(dir, "injuries", cols<InjuryRow>("gsis_id", "week", "report_primary_injury", "practice_primary_injury", "report_status")),
  ]);
  return { rosters, players, combine, depth, contracts, snaps, injuries };
}

/**
 * A game in the schedules (the officials snapshot, ADR-093 step 1b): who refereed it, the one source
 * the copies read for that, and its coaches, read only to keep made-up referees off real names.
 */
export interface ScheduleRow {
  readonly game_id: string;
  /** The old-style id, which the officials table's `game_id` uses. */
  readonly old_game_id: string | null;
  readonly season: number;
  readonly game_type: string;
  readonly week: number;
  /** Null until the game is played. */
  readonly home_score: number | null;
  readonly referee: string | null;
  readonly home_coach: string | null;
  readonly away_coach: string | null;
}

/**
 * One official at one game (the officials table), read for the taken set and the port check only.
 * `official_id` is never read: nflverse renumbered the officials in 2023 (ADR-093 step 1b).
 */
export interface OfficialRow {
  /** The old-style game id (the schedules' `old_game_id`). */
  readonly game_id: string;
  readonly official_name: string | null;
  readonly position: string | null;
  readonly season: number;
}

/** One play. Every flag is in `desc`, which holds real players' names and never leaves the importer. */
export interface PlayRow {
  readonly game_id: string;
  readonly old_game_id: string | null;
  readonly season: number;
  readonly season_type: string;
  readonly play_type: string | null;
  readonly desc: string | null;
}

/**
 * How the officials snapshot's loaders below read a file: `readRows` (`snapshot.ts`), which reads only
 * the columns named. A test passes a stand-in that keeps only the columns asked for, as the parquet
 * reader does, so a column a loader's list leaves out shows (ADR-093 step 1b).
 */
export type ReadRows = <T>(dir: string, key: string, columns: readonly string[]) => Promise<T[]>;

export async function loadScheduleRows(dir: string, read: ReadRows = readRows): Promise<ScheduleRow[]> {
  return read<ScheduleRow>(dir, "schedules", cols<ScheduleRow>(
    "game_id", "old_game_id", "season", "game_type", "week", "home_score", "referee", "home_coach", "away_coach"));
}

export async function loadOfficialRows(dir: string, read: ReadRows = readRows): Promise<OfficialRow[]> {
  return read<OfficialRow>(dir, "officials", cols<OfficialRow>("game_id", "official_name", "position", "season"));
}

/** Every real player's `display_name` in the officials snapshot's players list, read only for the taken set. */
export async function loadPlayerNames(dir: string, read: ReadRows = readRows): Promise<string[]> {
  const rows = await read<Pick<PlayerRow, "display_name">>(dir, "players", cols<PlayerRow>("display_name"));
  return rows.map((r) => r.display_name).filter((n): n is string => typeof n === "string");
}

/** One season of plays (`pbp<season>`), so a caller counts a season at a time and keeps no more. */
export async function loadPlayRows(dir: string, season: number, read: ReadRows = readRows): Promise<PlayRow[]> {
  return read<PlayRow>(dir, `pbp${season}`, cols<PlayRow>("game_id", "old_game_id", "season", "season_type", "play_type", "desc"));
}

/** Which file, id column and value columns each tracking source reads (`tracking.ts`). */
const TRACKING: Readonly<Record<TrackingSource, { file: string; id: string; columns: readonly string[] }>> = {
  ngsPass: { file: "ngsPass", id: "player_gsis_id", columns: ["completion_percentage_above_expectation", "attempts"] },
  ngsRec: { file: "ngsRec", id: "player_gsis_id", columns: ["avg_separation", "targets", "avg_yac_above_expectation", "receptions"] },
  ngsRush: { file: "ngsRush", id: "player_gsis_id", columns: ["rush_yards_over_expected_per_att", "rush_attempts"] },
  pfrPass: { file: "pfrPass", id: "pfr_id", columns: ["on_tgt_pct", "pass_attempts"] },
  pfrRec: { file: "pfrRec", id: "pfr_id", columns: ["drop_percent", "tgt", "brk_tkl", "rec"] },
  pfrRush: { file: "pfrRush", id: "pfr_id", columns: ["brk_tkl", "att"] },
  pfrDef: { file: "pfrDef", id: "pfr_id", columns: ["prss", "g", "yds_tgt", "tgt", "m_tkl_percent", "comb"] },
};

/** The tracking rows of the given seasons. Next Gen Stats: the regular season's totals (week 0). */
export async function loadTrackingRows(dir: string, seasons: readonly number[]): Promise<Record<TrackingSource, TrackingRow[]>> {
  const out = {} as Record<TrackingSource, TrackingRow[]>;
  for (const [source, t] of Object.entries(TRACKING) as [TrackingSource, (typeof TRACKING)[TrackingSource]][]) {
    const ngs = source.startsWith("ngs");
    const extra = ngs ? ["season_type", "week"] : [];
    const raw = await readRows<Record<string, unknown>>(dir, t.file, [t.id, "season", ...extra, ...t.columns]);
    out[source] = raw
      .filter((r) => seasons.includes(r.season as number) && r[t.id] != null && (!ngs || (r.season_type === "REG" && r.week === 0)))
      .map((r) => ({
        id: String(r[t.id]),
        season: r.season as number,
        values: Object.fromEntries(t.columns.map((c) => [c, typeof r[c] === "number" ? (r[c] as number) : null])),
      }));
  }
  return out;
}
