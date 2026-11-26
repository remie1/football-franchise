/**
 * Shared shapes for players' weeks (ADR-087): what the season steps gather about each player's week,
 * and the steps' own memory, kept in saves (S1 `depthMemory`).
 *
 * The development week (`development.ts`), injuries (`injuries.ts`), the weekly depth chart
 * (`depthChart.ts`) and unsigned retirements (`unsigned.ts`) are pure functions of their inputs;
 * `steps.ts` runs them as day steps inside `runSeason`'s walk.
 */
import type { MoodMemory } from "../mood/memory.js";
import type { AttrId, CalendarStamp, InjuryBand, PlayerId, Position, TeamId } from "@ff/contracts";

/** The rating groups of ADR-087 §2.3: what moves each rating. */
export type RatingGroup = "BODY" | "BODY_PRACTICE" | "OWN_CURVE" | "SKILL" | "SMARTS" | "FIXED";

/** One player's week as the steps saw it. Built by `steps.ts`, read by development and injuries. */
export interface PlayerWeek {
  /**
   * With a team whose year is on this week: training camp, preseason, the regular season, the
   * playoffs while his team is still in them, and the spring programme (OTAs). False for a free
   * agent, and for a player whose team's season has ended (until its spring programme).
   */
  readonly withTeam: boolean;
  /** How much of this week's practice he took part in, 0..1: 1 full, about 0.5 playing hurt, 0 out or no practice. */
  readonly practiced: number;
  /** His share of his side's snaps in this week's game, 0..1; 0 when he did not play or there was no game. */
  readonly playShare: number;
  /** All his snaps this week (offence, defence, special teams): his career snaps grow by this. */
  readonly snaps: number;
  /** His one-on-one checks this week, by the rating he used (from the who-played report, P4). */
  readonly contests: readonly { readonly attr: AttrId; readonly won: number; readonly lost: number }[];
  /** The `development` skill (0..100) of the coordinator on his side (OC, DC; STC for K, P, LS). Absent = no staff: read as 50. */
  readonly coachDevelopment?: number;
  /** The defensive coordinator's `teaching` (0..100), for `disguise` (ADR-075 T7). Absent = 50. */
  readonly dcTeaching?: number;
}

/** One past injury, for repeat injuries and a recent return (ADR-087 §5.1, §5.4). */
export interface PastInjury {
  readonly kind: string;
  readonly band: InjuryBand;
  readonly at: CalendarStamp;
  /** When he was healthy again; absent while still hurt. */
  readonly healed?: CalendarStamp;
}

/** A declared position battle (ADR-087 §3.1). */
export interface PositionBattle {
  readonly team: TeamId;
  readonly position: Position;
  readonly players: readonly PlayerId[];
  readonly declared: CalendarStamp;
}

/**
 * ADR-087 §12.4.3 (AB8): one man's regular-season starts, for retirement's "lost his job" term and
 * the profile his review judges him at. Counted only with `retirement: "choice"`, from each
 * regular-season game his team played while he was on its 53 (`roster`): his side is the side of the
 * chart key that listed him at the game, else where most of his snaps came; never his listed position.
 * A game he was on no key and took no snap (out hurt, off the chart) counts nothing.
 */
export interface SeasonStarts {
  /** The regular season these counts are for. */
  readonly season: number;
  /** His snaps on his side in those games. */
  readonly snaps: number;
  /** His team's snaps on that side in the same games (each game's busiest man on the side, as `PlayerWeek.playShare` reads it). */
  readonly sideSnaps: number;
  /** Games of `season` each chart key listed him at (the first key in `SPOT_ORDER` that lists him). */
  readonly charted: Partial<Record<Position, number>>;
  /** Earlier regular seasons he started (half his side's snaps or more), the season before `season` at most. */
  readonly started: readonly number[];
}

/**
 * ADR-087 §12.4.3 (AB8): his last review, taken at each IMMEDIATE moment (`retirement.ts`): the
 * profile he was judged at, his overall there (`overallWithCarryAt`, true ratings), and the fall since
 * the review before, at that review's profile (0 when there was none), which the year's SLOW and LATE
 * moments read too.
 */
export interface RetirementReview {
  /** The league year reviewed: the regular season that ended before the review. */
  readonly season: number;
  readonly profile: Position;
  readonly overall: number;
  /** Points of overall lost since the review before, at its profile, 0 or more. */
  readonly fall: number;
}

/** A starter who lost his spot to injury, kept so his return can be labelled (STARTER_RETURNS / KEPT_AFTER_INJURY). */
export interface InjuredStarter {
  readonly team: TeamId;
  readonly position: Position;
  readonly player: PlayerId;
  /** Who moved up in his place. */
  readonly cover: PlayerId;
  readonly since: CalendarStamp;
}

/**
 * The steps' memory: everything they need beyond the players themselves to carry on exactly, kept
 * in `LeaguePeople.playerMemory` and in a save's `world.development.depthMemory` (S1). Keyed by
 * player id where keyed; plain data, so it survives JSON unchanged.
 */
export interface PlayerMemory {
  /** Past injuries by player id, oldest first. */
  injuries: Record<string, PastInjury[]>;
  /** Each player's last four weeks of game grades and practice grades (0..100), newest last. */
  grades: Record<string, { game: number[]; practice: number[] }>;
  battles: PositionBattle[];
  injuredStarters: InjuredStarter[];
  /** Each current starter's weeks in the job, by `team/position/player`. */
  weeksInJob: Record<string, number>;
  /** When each free agent became unsigned (first day seen without a team), by player id. */
  unsignedSince: Record<string, CalendarStamp>;
  /**
   * Which switches the steps ran with, so a loaded season carries on with the same ones. Set by
   * `steps.ts`. ADR-087 §12.1: the aging options are written only when they are not the default and
   * act (development on, `aging: "ability"`; `aging.ts` `agingSwitches`), so a save made at the
   * defaults is main's to the byte, and a save without them carries on under today's rules.
   * `injuryRisk` (AB5) is written only as `"spot"`, with injuries on (`steps.ts`). AB6's two tuning
   * options are written only where they act and are not the default: `healingByAge` only as `false`,
   * on the spot path (AB9-T6); `perContact` only above 0, on the spot path with `aging: "ability"`
   * (AB9-T5). `retirement` (AB8) is written only as `"choice"` (it acts with either switch on).
   */
  switches?: {
    development: boolean;
    injuries: boolean;
    aging?: "position" | "ability";
    abilityCurves?: "D" | "B";
    techniqueKnee?: boolean;
    smartsSnaps?: number;
    injuryRisk?: "group" | "spot";
    healingByAge?: boolean;
    perContact?: number;
    retirement?: "unsigned" | "choice";
  };
  /**
   * ADR-087 §12.3.6 (AB6): each man's contact taken so far, by player id (`wear.ts`: by roll sets, game
   * by game, from the who-played reports), for wear. Kept only with `aging: "ability"` (absent
   * otherwise, so a save on the default path is unchanged); a man with none has no entry, and a man
   * who retires is forgotten with the rest of his memory.
   */
  contact?: Record<string, number>;
  /**
   * ADR-087 §12.4.3 (AB8): each man's regular-season starts by player id (`SeasonStarts`). Kept only
   * with `retirement: "choice"`; absent otherwise, so a save at the defaults is main's to the byte.
   */
  starts?: Record<string, SeasonStarts>;
  /**
   * ADR-087 §12.4.3 (AB8): each man's last review by player id (`RetirementReview`), written at each
   * IMMEDIATE moment. Kept only with `retirement: "choice"`. Franchise-only (no contracts field).
   */
  lastReview?: Record<string, RetirementReview>;
  /**
   * ADR-096: fan and media mood's own memory (rest points, the watch list's quiet weeks, grade gaps),
   * kept here because this is the save's slot for the steps' memory. Absent until mood runs.
   */
  mood?: MoodMemory;
}

export function emptyMemory(): PlayerMemory {
  return { injuries: {}, grades: {}, battles: [], injuredStarters: [], weeksInJob: {}, unsignedSince: {} };
}
