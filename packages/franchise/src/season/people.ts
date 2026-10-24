/**
 * The league's people, carried through the year (ADR-086 §2), and the day steps that change them.
 *
 * `runSeason` walks the calendar day by day when it has day steps. Each step gets one look at every
 * day, after that day's games and before the clock moves on, and decides for itself whether it has
 * anything to do: the draft runs on its day, cut-down day on its day, the aging thread's growth on
 * each week's last day (ADR-087). Steps run in the order given. Same people, day and seed → the
 * same result, or a season is not reproducible.
 */
import type {
  CalendarStamp, DeadMoneyCharge, DraftClass, DraftPick, FranchiseEvent, GameResult, LeagueRules, PlayerContract,
  PlayerId, PlayerState, ScheduledGame, SeasonState, StaffState, Team, TeamId,
} from "@ff/contracts";

export interface LeaguePeople {
  teams: Team[];
  players: PlayerState[];
  /** Every pick of every future draft someone holds; a team's untraded picks may be left out. */
  picks: DraftPick[];
  classes: DraftClass[];
  /** Players on no team who can still be signed. */
  freeAgents: PlayerId[];
  /** The coaching staff, for steps that read it (ADR-087's growth reads coordinators). */
  staff?: StaffState[];
  /** Waiver priority, first claim first: the last draft's first-round order (ADR-086 §8). */
  waiverOrder?: TeamId[];
  /**
   * Player contracts (ADR-085). The draft signs every pick and undrafted rookie here, cut-down day
   * ends the deals of players it lets go and signs practice squads. Absent = an empty book.
   */
  contracts?: PlayerContract[];
  /** Dead money from cut-down day's releases (ADR-085 K3). */
  deadMoney?: DeadMoneyCharge[];
  /**
   * Free-agent signings with a new team (ADR-085's market adds them), kept for the compensatory
   * formula (ADR-086 §5) and saved as `world.draft.freeAgentMoves`. The compensatory step reads the
   * league year just ended and drops older ones.
   */
  freeAgentMoves?: { player: PlayerId; from: TeamId; to: TeamId; apy: number; signedAt: CalendarStamp }[];
}

export interface DayStepContext {
  day: CalendarStamp;
  season: number;
  seed: string;
  rules: LeagueRules;
  state: SeasonState;
  /** The games played on this day, with whatever the resolver handed back beside the score. */
  games: readonly { game: ScheduledGame; result: GameResult; extras?: unknown }[];
}

export interface DayStep {
  id: string;
  /** Undefined = nothing to do today. */
  run(people: LeaguePeople, ctx: DayStepContext): { people: LeaguePeople; events: FranchiseEvent[] } | undefined;
}

/** True on the given phase/week/day of any season. */
export function isDay(day: CalendarStamp, at: { phase: string; week: number; day: number }): boolean {
  return day.phase === at.phase && day.week === at.week && day.day === at.day;
}
