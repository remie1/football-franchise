import type { CalendarStamp } from "./calendar.js";
import type { DraftClass, DraftPick, LeagueStructure, SeasonState } from "./league.js";
import type { GameId, OfficiatingCrewId, PlayerId, TeamId } from "./ids.js";
import type { Team, PlayerState, StaffState, PlayerContract, PerceivedAttributes, DeadMoneyCharge } from "./players.js";
import type { StaffContract } from "./staff.js";
import type { FranchiseEventEnvelope } from "./events.js";
import type { RelationshipView } from "./relationships.js";
import type { OfficiatingCrew } from "./officials.js";
import type { StaffMeeting } from "./meeting.js";

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
    /** ADR-081 G2: each team's last end-of-season meeting, for next year's report card. Optional, as above. */
    meetings?: StaffMeeting[];
    /**
     * ADR-086 C6: the draft. Every pick of every future draft someone holds (untraded picks may be
     * left out: a team holds its own by default), the classes, and last year's free-agent moves for
     * the compensatory formula. Optional, so older saves still load.
     */
    draft?: {
      picks: DraftPick[];
      classes: DraftClass[];
      freeAgentMoves: { player: PlayerId; from: TeamId; to: TeamId; apy: number; signedAt: CalendarStamp }[];
    };
    contracts: PlayerContract[];
    /** ADR-085 K3: every dead-money charge, past and future seasons. Optional, so older saves still load. */
    deadMoney?: DeadMoneyCharge[];
    /** ADR-085 K4: the cap each season, with the range published before it was set. Optional, as above. */
    capHistory?: CapSeason[];
    /**
     * ADR-087 S1: what players' development, injuries, depth charts and unsigned retirements did this
     * season (every event those steps and the emergency signings emitted, truth-layer ones included),
     * and the steps' own memory (open position battles, who started before an injury, recent grades,
     * when each free agent became unsigned), so a loaded season carries on exactly. `depthMemory` is
     * franchise's shape. Optional, so older saves still load.
     */
    development?: { events: FranchiseEventEnvelope[]; depthMemory: unknown };
    perceptions: PerceivedAttributes[];
    /** ADR-078 C7: conferences and divisions, as data (Spec #5 §14.1). */
    league: LeagueStructure;
    /** ADR-078 C7: the current season; null before a schedule exists. Replaces `standings: unknown`. */
    season: SeasonState | null;
    /**
     * ADR-093 F7: the league's officials (§6.2, §6.3), beside the season whose games they work.
     * `crews`: its crews as they stand this season (a new season draws each crew's leans again from
     * its last, §6.1). `assignments`: every game of this season given a crew so far, played or not,
     * one entry per game, made week by week (the coaches see their crew in game week, §6.2).
     * Optional, so saves written before it still load; absent, the league has no crews yet and its
     * games are played without one.
     */
    officiating?: {
      crews: OfficiatingCrew[];
      assignments: { game: GameId; crew: OfficiatingCrewId }[];
    };
    narrativeState: unknown;
    fashion: unknown;
  };
  history: { seasons: unknown[]; transactions: unknown[] };
  /**
   * Save and load E1 (ADR-078 R1 amendment 1, 2026-10-21): what played the saved games, so carrying
   * on cannot quietly switch to other rules. Free text (e.g. a play-caller version) so contracts stay
   * engine-agnostic. Absent in saves that predate it.
   *
   * `engineRules` (ADR-089 P1, default D10): the engine rules bundle that played them, by name, also
   * free text. Absent means `legacy`, so every save written before it, and every save played under
   * `legacy`, loads as `legacy`.
   */
  playedWith?: { caller: string; engineRules?: string };
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
  /** ADR-086 C3: the offseason roster limit (NFL: 90). Absent = the default. */
  offseasonRosterLimit?: number;
  /** ADR-086 C3: rounds, and the compensatory picks' league and per-team limits (NFL: 7, 32, 4). */
  draft?: { rounds: number; compensatoryLimit: number; compensatoryPerTeam: number };
  /** ADR-086 C3: the day rosters must be down to `rosterLimit` (NFL: the Tuesday after the last preseason week). */
  cutdown?: { phase: string; week: number; day: number };
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
  offseasonRosterLimit: 90,
  draft: { rounds: 7, compensatoryLimit: 32, compensatoryPerTeam: 4 },
  cutdown: { phase: "PRESEASON", week: 3, day: 2 },
};
