/**
 * The end-of-season staff meeting (ADR-081 G2, G3). Franchise holds the meeting and grades every
 * claim; these are the shapes it records. Nothing in the sim reads them.
 */
import type { CalendarStamp } from "./calendar.js";
import type { PlayerId, StaffId, TeamId } from "./ids.js";

/** G3: the course the team's decision-maker sets after the meeting. */
export type TeamDirection = "CONTEND" | "RETOOL" | "REBUILD";

/** G2: the nine points, in the meeting's three parts (the season we had, next season, the season after). */
export type MeetingPoint =
  | "LUCK" | "GOOD_AND_BAD"                                  // the season we had
  | "HOLES" | "DECLINE" | "LOSSES" | "NEXT_WINS"             // next season
  | "GROWTH" | "MONEY_CLIFF" | "WINDOW";                     // the season after

/** G2: how close a claim lands to the truth. Kept on the record; the user sees it only on the report card. */
export type AccuracyGrade = "SHARP" | "CLOSE" | "OFF" | "MISS";

/**
 * G2: what a man claims on one point. Which fields a point fills is franchise's rule; free text is
 * kept out so the claim can be graded and re-worded.
 */
export interface MeetingClaim {
  point: MeetingPoint;
  /** LUCK: "LUCKY" | "UNLUCKY" | "EVEN"; GOOD_AND_BAD: a unit's grade; and the like. */
  verdict?: string;
  /** Position groups named, strongest or weakest first as the point reads (franchise's group names). */
  groups?: string[];
  players?: PlayerId[];
  /** NEXT_WINS: the wins he expects. */
  wins?: number;
  /** WINDOW: the course he argues for. */
  direction?: TeamDirection;
}

/** G2: one man on one point. */
export interface MeetingTake {
  speaker: StaffId;
  claim: MeetingClaim;
  /** Hidden from the user until the report card. */
  grade: AccuracyGrade;
  /** How sure he is, 0-100, fixed at the meeting: asking twice gets the same answer. */
  certainty: number;
  /** True when he said it without being asked. */
  volunteered: boolean;
}

/** G2: two men's takes on one point that disagree, and how hot it got. */
export interface MeetingClash {
  point: MeetingPoint;
  between: [StaffId, StaffId];
  heat: "POLITE" | "OPEN_ARGUMENT" | "RIFT";
}

/** G2: one team's meeting. The save keeps each team's last one, for next year's report card. */
export interface StaffMeeting {
  team: TeamId;
  /** The season just played. */
  season: number;
  at: CalendarStamp;
  takes: MeetingTake[];
  clashes: MeetingClash[];
}
