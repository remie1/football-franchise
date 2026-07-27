/**
 * nflverse `snap_counts` (scraped from PFR) — per player, per game, offensive/defensive/special
 * snaps and share. This is the "snap shares" half of `calibration.md` §10.2, and the ground truth
 * for *who actually took the field*, which is what makes an availability-matched replay match.
 *
 * Keyed by `pfr_player_id`, not gsis. `weekly_rosters` carries `pfr_id`, which is the join.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

export interface SnapCountRow {
  readonly gameId: string;
  readonly pfrGameId: string | null;
  readonly season: number;
  readonly gameType: string;
  readonly week: number;
  readonly player: string;
  readonly pfrPlayerId: string | null;
  readonly position: string | null;
  readonly team: string;
  readonly opponent: string | null;
  readonly offenseSnaps: number | null;
  readonly offensePct: number | null;
  readonly defenseSnaps: number | null;
  readonly defensePct: number | null;
  readonly stSnaps: number | null;
  readonly stPct: number | null;
}

export const snapCountsSource: SourceDefinition<SnapCountRow> = {
  id: "snap_counts",
  description: "nflverse snap counts (PFR) — per-player per-game offence/defence/ST snaps and share",
  ingestVersion: 1,
  assetUrls: (season) => [nflverseAsset("snap_counts", `snap_counts_${season}.csv`)],
  minRows: () => 20_000, // ~26.5k player-games per season
  formats: [{
  id: "snap_counts_v1",
  requiredColumns: [
    "game_id", "season", "week", "player", "pfr_player_id", "team",
    "offense_snaps", "defense_snaps", "st_snaps",
  ],
  projection: null,
  parseRow(row, season: Season): SnapCountRow | null {
    if (row.int("season") !== season) return null;
    return {
      gameId: row.req("game_id"),
      pfrGameId: row.text("pfr_game_id"),
      season,
      gameType: row.text("game_type") ?? "REG",
      week: row.int("week") ?? 0,
      player: row.text("player") ?? "",
      pfrPlayerId: row.text("pfr_player_id"),
      position: row.text("position"),
      team: row.req("team"),
      opponent: row.text("opponent"),
      offenseSnaps: row.int("offense_snaps"),
      offensePct: row.num("offense_pct"),
      defenseSnaps: row.int("defense_snaps"),
      defensePct: row.num("defense_pct"),
      stSnaps: row.int("st_snaps"),
      stPct: row.num("st_pct"),
    };
  },
  }],
};
