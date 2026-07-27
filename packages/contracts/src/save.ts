import type { CalendarStamp } from "./calendar.js";
import type { Team, PlayerState, StaffState, PlayerContract, PerceivedAttributes } from "./players.js";

export const SAVE_FORMAT_VERSION = 1;

/**
 * Raw match event streams are NOT saved — determinism regenerates any game
 * from worldSeed + inputs. Only summaries persist.
 */
export interface SaveFile {
  formatVersion: number;
  createdBy: string;
  registrySchemaVersion: number;
  worldSeed: string;
  calendar: CalendarStamp;
  leagueRules: LeagueRules;
  world: {
    teams: Team[];
    players: PlayerState[];
    staff: StaffState[];
    contracts: PlayerContract[];
    perceptions: PerceivedAttributes[];
    standings: unknown;
    narrativeState: unknown;
    fashion: unknown;
  };
  history: { seasons: unknown[]; transactions: unknown[] };
  /** Reserved for fantasy mode (Spec #10 §4 watch item) — petitioned in before v1 freeze. */
  leagueContext?: unknown;
}

/** League structure is DATA, not constants (Spec #5 §14.1). Tier B changes need user assent. */
export interface LeagueRules {
  teamCount: number;
  gamesPerSeason: number;
  weeksPerSeason: number;
  byeWeeksPerTeam: number;
  playoffTeamsPerConference: number;
  rosterLimit: number;
  practiceSquadLimit: number;
  tradeDeadline: { phase: string; week: number; day: number };
  salaryCap: number;
  franchiseTagEnabled: boolean;
}

export const DEFAULT_LEAGUE_RULES: LeagueRules = {
  teamCount: 32,
  gamesPerSeason: 17,
  weeksPerSeason: 18,
  byeWeeksPerTeam: 1,
  playoffTeamsPerConference: 7,
  rosterLimit: 53,
  practiceSquadLimit: 16,
  tradeDeadline: { phase: "REGULAR_SEASON", week: 10, day: 2 },
  salaryCap: 300_000_000,
  franchiseTagEnabled: true,
};
