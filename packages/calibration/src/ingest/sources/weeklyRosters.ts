/**
 * nflverse `weekly_rosters` — one row per player per team per week, carrying that week's roster
 * status. This is the spine of availability-matched replay (`calibration.md` §10.2): it is the
 * only free source that says, week by week, who was active, who was on the inactive list, and
 * who was on a reserve list (and, via the description code, roughly why).
 *
 * External ids (`pfr_id`, `espn_id`) are kept deliberately: `snap_counts` is PFR-keyed and
 * ESPN's win-rate tables are ESPN-keyed, so this table is also the id crosswalk.
 */

import type { Season } from "../seasons.js";
import { resolveStatus, type Availability, type StatusConfidence, type UnavailabilityReason } from "./rosterStatus.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

export interface WeeklyRosterRow {
  readonly season: number;
  readonly week: number;
  readonly gameType: string;
  readonly team: string;
  readonly gsisId: string | null;
  readonly fullName: string;
  readonly position: string | null;
  readonly depthChartPosition: string | null;
  readonly ngsPosition: string | null;
  readonly jerseyNumber: number | null;

  /** Coarse status verbatim: ACT | INA | DEV | RES | CUT | RET | EXE | TRC | TRD | … */
  readonly status: string | null;
  /** NFL description code verbatim: A01 | I01 | R01 | R40 | P01 | W03 | … */
  readonly statusDescriptionAbbr: string | null;
  readonly availability: Availability;
  readonly unavailabilityReason: UnavailabilityReason | null;
  readonly statusConfidence: StatusConfidence | "NONE";
  /** true when `statusDescriptionAbbr` was not in the code table — surfaced, never swallowed. */
  readonly unmappedStatusCode: boolean;

  // crosswalk + biographical priors used downstream by @ff/attributes
  readonly pfrId: string | null;
  readonly espnId: string | null;
  readonly esbId: string | null;
  readonly heightInches: number | null;
  readonly weightLbs: number | null;
  readonly birthDate: string | null;
  readonly college: string | null;
  readonly yearsExp: number | null;
  readonly entryYear: number | null;
  readonly rookieYear: number | null;
  readonly draftClub: string | null;
  readonly draftNumber: number | null;
}

export const weeklyRostersSource: SourceDefinition<WeeklyRosterRow> = {
  id: "weekly_rosters",
  description: "nflverse weekly rosters — per-week status (active/inactive/reserve) + id crosswalk",
  ingestVersion: 1,
  assetUrls: (season) => [nflverseAsset("weekly_rosters", `roster_weekly_${season}.csv`)],
  minRows: () => 30_000, // ~46.5k player-weeks per season
  formats: [{
  id: "weekly_rosters_v1",
  requiredColumns: ["season", "week", "team", "status", "status_description_abbr", "gsis_id", "full_name", "game_type"],
  projection: [
    "season", "team", "position", "depth_chart_position", "jersey_number", "status",
    "full_name", "first_name", "last_name", "birth_date", "height", "weight", "college",
    "gsis_id", "espn_id", "pfr_id", "years_exp", "ngs_position", "week", "game_type",
    "status_description_abbr", "esb_id", "entry_year", "rookie_year", "draft_club", "draft_number",
  ],
  parseRow(row, season: Season): WeeklyRosterRow | null {
    if (row.int("season") !== season) return null;
    const status = row.text("status");
    const code = row.text("status_description_abbr");
    const resolved = resolveStatus(status, code);
    return {
      season,
      week: row.int("week") ?? 0,
      gameType: row.text("game_type") ?? "REG",
      team: row.req("team"),
      gsisId: row.text("gsis_id"),
      fullName: row.text("full_name") ?? "",
      position: row.text("position"),
      depthChartPosition: row.text("depth_chart_position"),
      ngsPosition: row.text("ngs_position"),
      jerseyNumber: row.int("jersey_number"),

      status,
      statusDescriptionAbbr: code,
      availability: resolved.availability,
      unavailabilityReason: resolved.reason,
      statusConfidence: resolved.confidence,
      unmappedStatusCode: resolved.unmappedCode,

      pfrId: row.text("pfr_id"),
      espnId: row.text("espn_id"),
      esbId: row.text("esb_id"),
      heightInches: row.num("height"),
      weightLbs: row.num("weight"),
      birthDate: row.text("birth_date"),
      college: row.text("college"),
      yearsExp: row.int("years_exp"),
      entryYear: row.int("entry_year"),
      rookieYear: row.int("rookie_year"),
      draftClub: row.text("draft_club"),
      draftNumber: row.int("draft_number"),
    };
  },
  }],
};
