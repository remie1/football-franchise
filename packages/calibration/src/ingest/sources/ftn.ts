/**
 * FTN charting, free via nflverse. Charter §3-D3 family C.
 *
 * The reason this matters to calibration rather than only to attributes: it is the only free
 * source that charts *play-level intent and quality judgements* — play action, screen, RPO, QB
 * out of pocket, throwaway, interception-worthy, catchable, contested, drop, blitzer count,
 * QB-fault sack. Several Tier 1 metrics in `calibration.md` §4 have no honest real-side
 * computation without it, in particular the **INT-source decomposition** (a real INT that FTN
 * charted as interception-worthy is a different event from one off a tipped ball) and the
 * QB-fault split of sack rate.
 *
 * Joins to pbp on `nflverse_game_id` + `nflverse_play_id`.
 */

import type { Season } from "../seasons.js";
import { nflverseAsset, type SourceDefinition } from "./types.js";

export interface FtnChartingRow {
  readonly gameId: string;
  readonly playId: number;
  readonly ftnGameId: string | null;
  readonly ftnPlayId: string | null;
  readonly season: number;
  readonly week: number;

  readonly startingHash: string | null;
  readonly qbLocation: string | null;
  readonly nOffenseBackfield: number | null;
  readonly nDefenseBox: number | null;
  readonly nBlitzers: number | null;
  readonly nPassRushers: number | null;

  readonly isNoHuddle: boolean | null;
  readonly isMotion: boolean | null;
  readonly isPlayAction: boolean | null;
  readonly isScreenPass: boolean | null;
  readonly isRpo: boolean | null;
  readonly isTrickPlay: boolean | null;
  readonly isQbSneak: boolean | null;

  readonly isQbOutOfPocket: boolean | null;
  readonly isInterceptionWorthy: boolean | null;
  readonly isThrowAway: boolean | null;
  readonly isCatchableBall: boolean | null;
  readonly isContestedBall: boolean | null;
  readonly isCreatedReception: boolean | null;
  readonly isDrop: boolean | null;
  readonly isQbFaultSack: boolean | null;
  readonly readThrown: string | null;

  readonly datePulled: string | null;
}

export const ftnChartingSource: SourceDefinition<FtnChartingRow> = {
  id: "ftn_charting",
  description: "FTN play charting — play action/screen/RPO, pressure detail, INT-worthy, drops",
  ingestVersion: 1,
  assetUrls: (season) => [nflverseAsset("ftn_charting", `ftn_charting_${season}.csv`)],
  minRows: () => 25_000,
  formats: [{
  id: "ftn_v1",
  requiredColumns: [
    "nflverse_game_id", "nflverse_play_id", "season", "week",
    "is_play_action", "is_interception_worthy", "is_catchable_ball", "is_qb_fault_sack",
  ],
  projection: null,
  parseRow(row, season: Season): FtnChartingRow | null {
    if (row.int("season") !== season) return null;
    return {
      gameId: row.req("nflverse_game_id"),
      playId: row.int("nflverse_play_id") ?? -1,
      ftnGameId: row.text("ftn_game_id"),
      ftnPlayId: row.text("ftn_play_id"),
      season,
      week: row.int("week") ?? 0,

      startingHash: row.text("starting_hash"),
      qbLocation: row.text("qb_location"),
      nOffenseBackfield: row.int("n_offense_backfield"),
      nDefenseBox: row.int("n_defense_box"),
      nBlitzers: row.int("n_blitzers"),
      nPassRushers: row.int("n_pass_rushers"),

      isNoHuddle: row.bool("is_no_huddle"),
      isMotion: row.bool("is_motion"),
      isPlayAction: row.bool("is_play_action"),
      isScreenPass: row.bool("is_screen_pass"),
      isRpo: row.bool("is_rpo"),
      isTrickPlay: row.bool("is_trick_play"),
      isQbSneak: row.bool("is_qb_sneak"),

      isQbOutOfPocket: row.bool("is_qb_out_of_pocket"),
      isInterceptionWorthy: row.bool("is_interception_worthy"),
      isThrowAway: row.bool("is_throw_away"),
      isCatchableBall: row.bool("is_catchable_ball"),
      isContestedBall: row.bool("is_contested_ball"),
      isCreatedReception: row.bool("is_created_reception"),
      isDrop: row.bool("is_drop"),
      isQbFaultSack: row.bool("is_qb_fault_sack"),
      readThrown: row.text("read_thrown"),

      datePulled: row.text("date_pulled"),
    };
  },
  }],
};
