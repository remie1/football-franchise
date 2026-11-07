/**
 * League vocabulary (ADR-078): structure, schedule, results, standings.
 * Data shapes only. Building a schedule, breaking ties and seeding are franchise
 * logic (contracts.md §10).
 */
import type { CalendarStamp } from "./calendar.js";
import type { AttrId, ConferenceId, DivisionId, GameId, PlayerId, TeamId, TradeId } from "./ids.js";
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

// ADR-095 X2 — trades: the pieces that move, and a talk between two teams as it stands.

/** One thing a trade moves from one team to the other: a player under contract, or a pick. */
export type TradePiece =
  | { kind: "PLAYER"; player: PlayerId; from: TeamId; to: TeamId }
  | {
      kind: "PICK";
      /** The pick, named as `DraftPick` names it (draft year, round, whose it was). */
      draft: number; round: number; originalTeam: TeamId; pickKind: DraftPickKind;
      from: TeamId; to: TeamId;
      /** A condition the trade puts on the pick (ADR-086 N2), in the words of the deal and the rule that settles it. */
      condition?: { text: string; rule: PickCondition };
    };

/**
 * ADR-095 §2: which way the calling team leans. Shopping or buying a player, moving up or down in a
 * draft, or OPEN (just asking).
 */
export type TradeDirection = "SHOPPING_PLAYER" | "BUYING_PLAYER" | "MOVING_UP" | "MOVING_DOWN" | "OPEN";

/**
 * ADR-095 §2: the plain-words reasons a GM gives with an offer, drawn from the terms of his value
 * (§3, §4). Never his numbers. A weak GM's reasons can mislead.
 */
export type TradeReason =
  | "HELP_NOW" | "FUTURE_VALUE" | "SALARY" | "PICK_TIMING" | "FIT" | "PRICE";

/** ADR-095 §2: how far a talk has come. ENDED = either side walked away, or the window closed. */
export type TradeTalkStage = "CALL" | "ASKING_PRICE" | "OFFER" | "AGREED" | "PHYSICAL" | "DONE" | "ENDED";

/** ADR-095 §2: one talk between two teams, from the first call to its end. */
export interface TradeTalk {
  id: TradeId;
  teams: [TeamId, TeamId];
  openedBy: TeamId;
  openedAt: CalendarStamp;
  direction: TradeDirection;
  /** What the call is about (named, with no terms yet). */
  about: TradePiece[];
  stage: TradeTalkStage;
  /** The latest proposal on the table, by whom, with his reasons. */
  offer?: { by: TeamId; pieces: TradePiece[]; reasons?: TradeReason[] };
  /** Offers and counters made so far. */
  rounds: number;
  lastAt: CalendarStamp;
}

/** ADR-095 §6: what a physical found, as the examining team read it. */
export type PhysicalResult = "CLEAN" | "CONCERN" | "FAIL";

/** ADR-095 §6: an agreed trade waiting on the receiving team's physical (seven days at most). */
export interface PendingPhysical {
  talk: TradeId;
  player: PlayerId;
  examiningTeam: TeamId;
  agreedAt: CalendarStamp;
  dueBy: CalendarStamp;
}

/**
 * ADR-095 §6: what a team's medical staff concluded from a physical, in their eyes (not the truth).
 * `gamesLess` and `yearsLess`: how much the finding lowered their expectation (games a season,
 * good years). `leaked`: the finding reached the other teams, whose own guesses then drop.
 */
export interface MedicalFinding {
  player: PlayerId;
  examiningTeam: TeamId;
  at: CalendarStamp;
  result: PhysicalResult;
  gamesLess?: number;
  yearsLess?: number;
  leaked: boolean;
}

