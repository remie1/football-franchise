import type { CalendarStamp } from "./calendar.js";
import type { LeagueStructure, SeasonState } from "./league.js";
import type { Team, PlayerState, StaffState, PlayerContract, PerceivedAttributes, DeadMoneyCharge } from "./players.js";
import type { StaffContract } from "./staff.js";
import type { RelationshipView } from "./relationships.js";

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
    /** ADR-080 P1: coaches' contracts. Optional, so saves written before it still load. */
    staffContracts?: StaffContract[];
    /** ADR-084 V1: every staff member's views, one entry per direction. Optional, as above. */
    relationships?: RelationshipView[];
    contracts: PlayerContract[];
    /** ADR-085 K3: every dead-money charge, past and future seasons. Optional, so older saves still load. */
    deadMoney?: DeadMoneyCharge[];
    /** ADR-085 K4: the cap each season, with the range published before it was set. Optional, as above. */
    capHistory?: CapSeason[];
    perceptions: PerceivedAttributes[];
    /** ADR-078 C7: conferences and divisions, as data (Spec #5 §14.1). */
    league: LeagueStructure;
    /** ADR-078 C7: the current season; null before a schedule exists. Replaces `standings: unknown`. */
    season: SeasonState | null;
    narrativeState: unknown;
    fashion: unknown;
  };
  history: { seasons: unknown[]; transactions: unknown[] };
  /**
   * Save and load E1 (ADR-078 R1 amendment 1, 2026-10-21): what played the saved games, so carrying
   * on cannot quietly switch to other rules. Free text (e.g. a play-caller version) so contracts stay
   * engine-agnostic. Absent in saves that predate it.
   */
  playedWith?: { caller: string };
  /** Reserved for fantasy mode (Spec #10 §4 watch item) — petitioned in before v1 freeze. */
  leagueContext?: unknown;
}

/** ADR-085 K4: one season's cap. `LeagueRules.salaryCap` stays the current season's number. */
export interface CapSeason {
  season: number;
  cap: number;
  projectedLow?: number;
  projectedHigh?: number;
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
