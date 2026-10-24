/**
 * Shared shapes for players' weeks (ADR-087): what the season steps gather about each player's week,
 * and the steps' own memory, kept in saves (S1 `depthMemory`).
 *
 * The development week (`development.ts`), injuries (`injuries.ts`), the weekly depth chart
 * (`depthChart.ts`) and unsigned retirements (`unsigned.ts`) are pure functions of their inputs;
 * `steps.ts` runs them as day steps inside `runSeason`'s walk.
 */
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
  /** Which switches the steps ran with, so a loaded season carries on with the same ones. Set by `steps.ts`. */
  switches?: { development: boolean; injuries: boolean };
}

export function emptyMemory(): PlayerMemory {
  return { injuries: {}, grades: {}, battles: [], injuredStarters: [], weeksInJob: {}, unsignedSince: {} };
}
