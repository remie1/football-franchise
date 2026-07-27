/**
 * nflverse `injuries` — the official weekly injury report: practice participation Wed/Thu/Fri and
 * the game-status designation (Out / Doubtful / Questionable).
 *
 * Note the distinction from `weekly_rosters`: the injury report is *pre-game* information (what
 * the team declared), whereas roster status is *game-day* fact. Both are ingested because they
 * answer different questions — the report is what a franchise-layer decision-maker would have
 * known, the roster status is what actually happened.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

/** Game-status designation. `NONE` = listed on the report but not given a game designation. */
export type InjuryGameStatus = "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "NONE";

/** Practice participation. */
export type PracticeStatus = "FULL" | "LIMITED" | "DNP" | "NONE";

export interface InjuryRow {
  readonly season: number;
  readonly week: number;
  readonly gameType: string;
  readonly team: string;
  readonly gsisId: string | null;
  readonly fullName: string;
  readonly position: string | null;
  readonly reportPrimaryInjury: string | null;
  readonly reportSecondaryInjury: string | null;
  readonly reportStatusRaw: string | null;
  readonly gameStatus: InjuryGameStatus;
  readonly practicePrimaryInjury: string | null;
  readonly practiceSecondaryInjury: string | null;
  readonly practiceStatusRaw: string | null;
  readonly practiceStatus: PracticeStatus;
  readonly dateModified: string | null;
}

export function normaliseGameStatus(raw: string | null): InjuryGameStatus {
  if (raw === null) return "NONE";
  const v = raw.trim().toLowerCase();
  if (v === "out") return "OUT";
  if (v === "doubtful") return "DOUBTFUL";
  if (v === "questionable") return "QUESTIONABLE";
  return "NONE";
}

export function normalisePracticeStatus(raw: string | null): PracticeStatus {
  if (raw === null) return "NONE";
  const v = raw.trim().toLowerCase();
  if (v.startsWith("full participation")) return "FULL";
  if (v.startsWith("limited participation")) return "LIMITED";
  if (v.startsWith("did not participate")) return "DNP";
  return "NONE";
}

export const injuriesSource: SourceDefinition<InjuryRow> = {
  id: "injuries",
  description: "nflverse weekly injury reports — practice participation + game-status designation",
  ingestVersion: 1,
  assetUrls: (season) => [nflverseAsset("injuries", `injuries_${season}.csv`)],
  minRows: () => 3_000,
  formats: [{
  id: "injuries_v1",
  requiredColumns: ["season", "week", "team", "gsis_id", "report_status", "practice_status", "game_type"],
  projection: null,
  parseRow(row, season: Season): InjuryRow | null {
    if (row.int("season") !== season) return null;
    const reportStatusRaw = row.text("report_status");
    const practiceStatusRaw = row.text("practice_status");
    return {
      season,
      week: row.int("week") ?? 0,
      gameType: row.text("game_type") ?? "REG",
      team: row.req("team"),
      gsisId: row.text("gsis_id"),
      fullName: row.text("full_name") ?? "",
      position: row.text("position"),
      reportPrimaryInjury: row.text("report_primary_injury"),
      reportSecondaryInjury: row.text("report_secondary_injury"),
      reportStatusRaw,
      gameStatus: normaliseGameStatus(reportStatusRaw),
      practicePrimaryInjury: row.text("practice_primary_injury"),
      practiceSecondaryInjury: row.text("practice_secondary_injury"),
      practiceStatusRaw,
      practiceStatus: normalisePracticeStatus(practiceStatusRaw),
      dateModified: row.text("date_modified"),
    };
  },
  }],
};
