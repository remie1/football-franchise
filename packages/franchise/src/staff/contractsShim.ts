/**
 * TEMPORARY: ADR-080 P1-P4 exactly as proposed, held here until the owner's typed yes moves them
 * into `@ff/contracts` (`staff.ts`). Delete this file then and import from `@ff/contracts`.
 */
import type {
  CalendarStamp, StaffId, StaffRole, StaffState as ContractsStaffState, TeamId, WinLossTie,
} from "@ff/contracts";

/** ADR-080 P3. */
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
  record: WinLossTie;
  rosterRank?: number;
  unitRank?: number;
  playoffs?: { wins: number; champion: boolean };
}

/** ADR-080 P2: one job on a résumé. */
export interface StaffJob {
  level: CoachingLevel;
  role: StaffRole;
  team?: TeamId;
  employer: string;
  firstSeason: number;
  lastSeason?: number;
  seasons: StaffJobSeason[];
  ended?: StaffDepartureReason | "PROMOTED";
}

/** ADR-075 §3.2, added by ADR-080 P4. */
export interface DefensiveDisguiseTendency {
  readonly passSnapMaskShare: number;
  readonly lookWeights?: Readonly<Record<string, number>>;
  readonly lateShare?: number;
  readonly frontLookShare?: number;
}

/** `StaffState` as it reads once P2 and P4 are in contracts. */
export interface StaffState extends ContractsStaffState {
  career: StaffJob[];
  retiredAfter?: number;
  disguise?: DefensiveDisguiseTendency;
}
