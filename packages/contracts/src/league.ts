/**
 * League vocabulary (ADR-078): structure, schedule, results, standings.
 * Data shapes only. Building a schedule, breaking ties and seeding are franchise
 * logic (contracts.md §10).
 */
import type { CalendarStamp } from "./calendar.js";
import type { AttrId, ConferenceId, DivisionId, GameId, PlayerId, TeamId } from "./ids.js";
import type { GameEndReason } from "./events.js";

// C2 — structure is data, not constants (Spec #5 §14.1).
export interface Conference { id: ConferenceId; name: string; divisions: DivisionId[] }
export interface Division { id: DivisionId; name: string; conference: ConferenceId; teams: TeamId[] }
export interface LeagueStructure { conferences: Conference[]; divisions: Division[] }

// C3 — the schedule.
export type GameKind =
  | "PRESEASON" | "REGULAR"
  | "WILD_CARD" | "DIVISIONAL" | "CONFERENCE_FINAL" | "CHAMPIONSHIP";

export interface ScheduledGame {
  gameId: GameId;
  season: number;
  kind: GameKind;
  at: CalendarStamp;
  home: TeamId;
  away: TeamId;
  neutralSite: boolean;
}

export interface SeasonSchedule {
  season: number;
  games: ScheduledGame[];
  byes: { team: TeamId; week: number }[];
}

// C4 — a game's result. `seed` makes it re-runnable, as GAME_END.payload.seed.
export interface GameResult {
  gameId: GameId;
  home: TeamId;
  away: TeamId;
  homeScore: number;
  awayScore: number;
  reason: GameEndReason;
  seed: string;
  /**
   * ADR-082 N2: points scored in each period (5 and up are overtime), as GAME_END.payload.periods.
   * Optional: a resolver that does not know them leaves it out.
   */
  periods?: readonly { period: number; home: number; away: number }[];
}

/**
 * ADR-087 P4: who played in a game and how, one entry per player who took a snap. Built by whoever
 * plays the game (the season runner, from the match events) and handed back beside the result, so
 * franchise reads who played without parsing play events (Iron Rule 1). `contests`: his one-on-one
 * checks by the rating he used, won and lost.
 */
export interface GameParticipation {
  player: PlayerId;
  team: TeamId;
  snaps: { offense: number; defense: number; special: number };
  contests: { attr: AttrId; won: number; lost: number }[];
}

// C5 — standings. A view: everything here is derivable from results + LeagueStructure,
// carried so the UI and narrative never recompute it.
export interface WinLossTie { wins: number; losses: number; ties: number }

export type TiebreakStep =
  | "HEAD_TO_HEAD" | "DIVISION_RECORD" | "COMMON_GAMES" | "CONFERENCE_RECORD"
  | "STRENGTH_OF_VICTORY" | "STRENGTH_OF_SCHEDULE"
  | "CONFERENCE_POINTS_RANK" | "LEAGUE_POINTS_RANK"
  | "COMMON_NET_POINTS" | "NET_POINTS" | "NET_TOUCHDOWNS" | "COIN_TOSS";

export interface StandingsRow {
  team: TeamId;
  overall: WinLossTie;
  division: WinLossTie;
  conference: WinLossTie;
  home: WinLossTie;
  away: WinLossTie;
  pointsFor: number;
  pointsAgainst: number;
  /** 1..teams-per-division. */
  divisionRank: number;
  /** Set when a tie was broken to place this team above another; the UI can say why. */
  tiebreak?: { over: TeamId; step: TiebreakStep };
}

export interface PlayoffBracket {
  season: number;
  /** Per conference; index 0 is seed 1. */
  seeds: { conference: ConferenceId; teams: TeamId[] }[];
  games: ScheduledGame[];
  champion?: TeamId;
}

export interface SeasonState {
  season: number;
  schedule: SeasonSchedule;
  results: GameResult[];
  standings: StandingsRow[];
  bracket?: PlayoffBracket;
}

// ADR-086 C1 — draft picks: who each pick belonged to and who holds it now.
export type DraftPickKind = "REGULAR" | "COMPENSATORY" | "SPECIAL_COMPENSATORY";

/**
 * ADR-086 C1 / N2: how a traded pick's condition is settled from the game's own seasons.
 * PLAYING_TIME and PLAYOFF_FINISH: the pick becomes `round` if the condition is met.
 * PICK_SWAP: the holder gets the better or worse of this pick and `otherTeam`'s in the same round.
 * OTHER: a condition the game cannot settle; the pick stays as it is.
 */
export type PickCondition =
  | { kind: "PLAYING_TIME"; player: PlayerId; season: number; snapShare: number; round: number }
  | { kind: "PLAYOFF_FINISH"; team: TeamId; season: number; reached: GameKind; round: number }
  | { kind: "PICK_SWAP"; otherTeam: TeamId; ownerGets: "BETTER" | "WORSE" }
  | { kind: "OTHER" };

export interface DraftPick {
  /** The draft's year. */
  draft: number;
  round: number;
  /** Whose pick it was. */
  originalTeam: TeamId;
  /** Who holds it now. */
  owner: TeamId;
  kind: DraftPickKind;
  /** Its number in the draft, once the order is fixed. */
  overall?: number;
  /** A traded pick's condition: the source's own words, and the rule that settles it. */
  condition?: { text: string; rule: PickCondition; settled?: boolean };
}

// ADR-086 C2 — a draft class: the prospects of one draft, before anyone owns them.
export interface DraftClass { draft: number; prospects: PlayerId[] }
