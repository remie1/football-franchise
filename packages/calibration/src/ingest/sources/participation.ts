/**
 * nflverse `pbp_participation` — per-play personnel, formation, box count, pass-rusher count,
 * pressure flag, coverage shell, and the full 22-man participant list.
 *
 * Directly relevant to the engine's per-play checks (pass-rush ticks, coverage assignment,
 * pressure rate) and to §3.1's frozen play-caller, which needs real personnel/formation
 * tendencies rather than invented ones.
 *
 * The `*_names` / `*_positions` / `*_numbers` columns are excluded from the projection: they are
 * the same information as the id lists, and they are most of the file's bulk.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

export interface ParticipationRow {
  readonly gameId: string;
  readonly oldGameId: string | null;
  readonly playId: number;
  readonly possessionTeam: string | null;
  readonly offenseFormation: string | null;
  readonly offensePersonnel: string | null;
  readonly defendersInBox: number | null;
  readonly defensePersonnel: string | null;
  readonly numberOfPassRushers: number | null;
  readonly nOffense: number | null;
  readonly nDefense: number | null;
  readonly ngsAirYards: number | null;
  /** Seconds from snap to throw, as NGS measures it. */
  readonly timeToThrow: number | null;
  readonly wasPressure: boolean | null;
  readonly route: string | null;
  readonly defenseManZoneType: string | null;
  readonly defenseCoverageType: string | null;
  readonly offensePlayers: readonly string[];
  readonly defensePlayers: readonly string[];
}

export const participationSource: SourceDefinition<ParticipationRow> = {
  id: "pbp_participation",
  description: "nflverse per-play participation — personnel, formation, box, pressure, coverage",
  ingestVersion: 1,
  assetUrls: (season) => [nflverseAsset("pbp_participation", `pbp_participation_${season}.csv`)],
  minRows: () => 25_000,
  formats: [{
  id: "participation_v1",
  requiredColumns: ["nflverse_game_id", "play_id", "offense_players", "defense_players"],
  projection: [
    "nflverse_game_id", "old_game_id", "play_id", "possession_team", "offense_formation",
    "offense_personnel", "defenders_in_box", "defense_personnel", "number_of_pass_rushers",
    "offense_players", "defense_players", "n_offense", "n_defense", "ngs_air_yards",
    "time_to_throw", "was_pressure", "route", "defense_man_zone_type", "defense_coverage_type",
  ],
  parseRow(row, season: Season): ParticipationRow | null {
    const gameId = row.text("nflverse_game_id");
    if (gameId === null) return null;
    // The asset is already per-season; the guard is belt-and-braces against a mis-tagged file.
    if (!gameId.startsWith(`${season}_`)) return null;
    return {
      gameId,
      oldGameId: row.text("old_game_id"),
      playId: row.int("play_id") ?? -1,
      possessionTeam: row.text("possession_team"),
      offenseFormation: row.text("offense_formation"),
      offensePersonnel: row.text("offense_personnel"),
      defendersInBox: row.int("defenders_in_box"),
      defensePersonnel: row.text("defense_personnel"),
      numberOfPassRushers: row.int("number_of_pass_rushers"),
      nOffense: row.int("n_offense"),
      nDefense: row.int("n_defense"),
      ngsAirYards: row.num("ngs_air_yards"),
      timeToThrow: row.num("time_to_throw"),
      wasPressure: row.bool("was_pressure"),
      route: row.text("route"),
      defenseManZoneType: row.text("defense_man_zone_type"),
      defenseCoverageType: row.text("defense_coverage_type"),
      offensePlayers: row.list("offense_players"),
      defensePlayers: row.list("defense_players"),
    };
  },
  }],
};
