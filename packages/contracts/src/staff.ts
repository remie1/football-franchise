/**
 * Coaching staffs: contracts, careers, why a coach left, the DC's disguise habit (ADR-080 P1-P4).
 * Franchise builds and reads these; nothing in the sim does yet.
 */
import type { StaffId, TeamId } from "./ids.js";
import type { CalendarStamp } from "./calendar.js";
import type { WinLossTie } from "./league.js";
import type { StaffRole } from "./players.js";

/** ADR-080 P3: why a coach left a team. */
export type StaffDepartureReason = "FIRED" | "HIRED_AWAY" | "RETIRED" | "CONTRACT_EXPIRED";

/** ADR-080 P1: a coach's contract with a team. Money is dollars per season. */
export interface StaffContract {
  staff: StaffId;
  team: TeamId;
  role: StaffRole;
  firstSeason: number;
  lastSeason: number;
  salary: number;
  signedAt: CalendarStamp;
  /** Set when it ends early. A FIRED coach's salary still counts through lastSeason (dead money). */
  terminated?: { at: CalendarStamp; reason: StaffDepartureReason };
}

/** ADR-080 P2: where a job was. College jobs appear only on résumés. */
export type CoachingLevel = "NFL" | "COLLEGE";

/** ADR-080 P2: one season of a job, as a résumé shows it. */
export interface StaffJobSeason {
  season: number;
  /** The team's regular season. */
  record: WinLossTie;
  /** 1 = best roster in its league; absent when not known. */
  rosterRank?: number;
  /** A coordinator's unit, 1 = best; absent otherwise. */
  unitRank?: number;
  /** Absent = missed the playoffs. */
  playoffs?: { wins: number; champion: boolean };
}

/** ADR-080 P2: one job on a résumé. */
export interface StaffJob {
  level: CoachingLevel;
  role: StaffRole;
  /** A job in this league; absent for college. */
  team?: TeamId;
  /** The team's or the college programme's name. */
  employer: string;
  firstSeason: number;
  /** Absent while he holds it. */
  lastSeason?: number;
  seasons: StaffJobSeason[];
  /** Absent while he holds it. */
  ended?: StaffDepartureReason | "PROMOTED";
}

/**
 * ADR-075 §3.2, added by ADR-080 P4. Owner's units: share of passing snaps. Absent fields = league
 * defaults.
 */
export interface DefensiveDisguiseTendency {
  readonly passSnapMaskShare: number;
  readonly lookWeights?: Readonly<Record<string, number>>;
  readonly lateShare?: number;
  readonly frontLookShare?: number;
}
