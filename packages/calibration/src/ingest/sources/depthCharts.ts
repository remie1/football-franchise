/**
 * nflverse `depth_charts` — the complement to availability: when a starter is out, this is who
 * the team said would replace him.
 *
 * **This source changed shape entirely for 2025 and the change is not backward compatible.**
 *
 *  - 2022–2024 (`weekly_v1`): 15 columns, one row per player per *week*, carrying
 *    `season`, `week`, `game_type`, `club_code`, `depth_team` (1 = starter), `formation`.
 *  - 2025+ (`daily_snapshot_v1`): 12 columns, one row per player per *daily scrape*, keyed by a
 *    `dt` timestamp with **no season, no week and no game_type**. Position moved from a single
 *    `position` column to a `pos_grp` / `pos_abb` / `pos_slot` / `pos_rank` decomposition. The
 *    2025 asset holds 221 daily snapshots spanning 2025-08-03 to 2026-03-14 and 554k rows.
 *
 * Both are ingested faithfully and the manifest records which format was parsed. What is
 * deliberately *not* done here is inventing a snapshot-date → season-week mapping: that requires
 * the schedule, it is a judgement call about which snapshot represents a given game week, and
 * fabricating it inside a loader would hide a real modelling decision behind a parser. It is
 * reported as a gap instead. Consumers can discriminate on `format`.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

export type DepthChartFormat = "weekly" | "daily_snapshot";

export interface DepthChartRow {
  readonly format: DepthChartFormat;
  readonly season: number;
  /** `null` in the 2025+ daily-snapshot format — the file does not carry a week. */
  readonly week: number | null;
  /** `null` in the 2025+ daily-snapshot format. */
  readonly gameType: string | null;
  /** ISO timestamp of the scrape; `null` in the weekly format. */
  readonly snapshotAt: string | null;
  readonly team: string;
  readonly gsisId: string | null;
  readonly fullName: string;
  /** `position` (weekly) or `pos_abb` (daily). */
  readonly position: string | null;
  /** `depth_position` (weekly) or `pos_name` (daily). */
  readonly depthPosition: string | null;
  /** `depth_team` (weekly) or `pos_rank` (daily). 1 = starter. */
  readonly depthTeam: number | null;
  /** `formation` (weekly) or `pos_grp` (daily), e.g. "Offense" vs "Base 4-3 D". */
  readonly unitLabel: string | null;
  readonly jerseyNumber: number | null;
  readonly eliasId: string | null;
  readonly espnId: string | null;
  /** Ordering slot within the unit; daily format only. */
  readonly positionSlot: number | null;
}

export const depthChartsSource: SourceDefinition<DepthChartRow> = {
  id: "depth_charts",
  description: "nflverse depth charts — weekly (≤2024) or daily snapshot (2025+); format recorded",
  ingestVersion: 2,
  assetUrls: (season) => [nflverseAsset("depth_charts", `depth_charts_${season}.csv`)],
  minRows: () => 10_000,
  formats: [
    {
      id: "weekly_v1",
      requiredColumns: ["season", "week", "club_code", "depth_team", "gsis_id", "position", "game_type"],
      projection: null,
      parseRow(row, season: Season): DepthChartRow | null {
        if (row.int("season") !== season) return null;
        return {
          format: "weekly",
          season,
          week: row.int("week"),
          gameType: row.text("game_type") ?? "REG",
          snapshotAt: null,
          team: row.req("club_code"),
          gsisId: row.text("gsis_id"),
          fullName: row.text("full_name") ?? "",
          position: row.text("position"),
          depthPosition: row.text("depth_position"),
          depthTeam: row.int("depth_team"),
          unitLabel: row.text("formation"),
          jerseyNumber: row.int("jersey_number"),
          eliasId: row.text("elias_id"),
          espnId: null,
          positionSlot: null,
        };
      },
    },
    {
      id: "daily_snapshot_v1",
      requiredColumns: ["dt", "team", "gsis_id", "pos_abb", "pos_rank", "pos_grp"],
      projection: null,
      parseRow(row, season: Season): DepthChartRow | null {
        const dt = row.text("dt");
        if (dt === null) return null;
        return {
          format: "daily_snapshot",
          season,
          week: null,
          gameType: null,
          snapshotAt: dt,
          team: row.req("team"),
          gsisId: row.text("gsis_id"),
          fullName: row.text("player_name") ?? "",
          position: row.text("pos_abb"),
          depthPosition: row.text("pos_name"),
          depthTeam: row.int("pos_rank"),
          unitLabel: row.text("pos_grp"),
          jerseyNumber: null,
          eliasId: null,
          espnId: row.text("espn_id"),
          positionSlot: row.int("pos_slot"),
        };
      },
    },
  ],
};
