/**
 * THE GAME LOOP'S VOCABULARY — state, snapshot inputs, and the decision seam.
 *
 * The shape is the play loop's, one level up:
 * `(MatchState, GameInputs, seed) → { events, newState }`.
 *
 * Three properties of this file are load-bearing and are stated here rather than
 * discovered later (`docs/decisions/FANTASY-GATE-PHASE1.md` §3):
 *
 *  1. **`MatchState` is complete, flat, readonly and serializable.** Everything
 *     the loop carries forward lives in it. Nothing lives in an instance field,
 *     a closure or a suspended generator, because "construct a game from
 *     scratch", "run two variants of a week side by side" and "re-run a finished
 *     game with replaced inputs" all require the state to be a value.
 *  2. **The world arrives as a per-game SNAPSHOT argument.** `GameSnapshot` holds
 *     players, personnel and chemistry, by value, for this game only. The loop
 *     never acquires a handle on anything long-lived — the same property that
 *     makes the play simulators trivially re-runnable with mid-season roster
 *     updates.
 *  3. **Every in-game decision point is a TYPED REQUEST carrying an authority
 *     tag**, not an untagged callback. v1 has one human holding COACH+GM, so the
 *     tag is inert; it costs one field and it is the field that keeps
 *     split-authority modes reachable.
 */
import type {
  CalendarStamp,
  ChemistryTable,
  GameId,
  PlayerId,
  PlayerState,
  Rng,
  TeamId,
} from "@ff/contracts";
import { gameId as makeGameId } from "@ff/contracts";
import type { AnyPlayCalls, DefensivePlayCall, OffensiveCall } from "../types.js";
import type { PossessionCause } from "./events.js";

// --- identity ---------------------------------------------------------------

/**
 * The stable schedule coordinates a `GameId` is DERIVED from.
 *
 * Never a counter and never a clock. A play's random stream is a pure function
 * of `(seed, gameId, playNumber)`, so a `gameId` that shifts when the schedule is
 * regenerated moves every downstream game's dice. `replay` distinguishes a
 * deliberate re-run of the same fixture (a what-if, a re-simulated week) from the
 * game as scheduled, so the two are addressable independently.
 *
 * This does not violate `ids.ts`'s opacity rule: nobody PARSES the id, the minter
 * derives it.
 */
export interface GameCoordinates {
  readonly season: number;
  readonly week: number;
  readonly home: TeamId;
  readonly away: TeamId;
  /** 0 = the game as scheduled. */
  readonly replay?: number;
}

export function deriveGameId(coordinates: GameCoordinates): GameId {
  const { season, week, home, away, replay = 0 } = coordinates;
  return makeGameId(`g:${season}:w${week}:${String(away)}@${String(home)}:r${replay}`);
}

// --- the world, by value ----------------------------------------------------

/**
 * The eleven on offence, by role. Stated rather than derived from a depth chart
 * or a formation string, on ADR-006's line: the engine may not read football out
 * of a label, so whoever hands it a game states who is playing where.
 */
export interface OffensivePersonnel {
  readonly quarterback: PlayerId;
  readonly runningBack: PlayerId;
  /** At least three; the corpus uses the first three. */
  readonly receivers: readonly PlayerId[];
  readonly tightEnd: PlayerId;
  readonly leftTackle: PlayerId;
  readonly leftGuard: PlayerId;
  readonly center: PlayerId;
  readonly rightGuard: PlayerId;
  readonly rightTackle: PlayerId;
}

/** The eleven on defence, by role. Same rule. */
export interface DefensivePersonnel {
  /** Two ends. */
  readonly edges: readonly PlayerId[];
  /** Two interior linemen. */
  readonly interior: readonly PlayerId[];
  /** Two linebackers. */
  readonly linebackers: readonly PlayerId[];
  /** Three corners: outside, outside, nickel. */
  readonly corners: readonly PlayerId[];
  /** Two safeties: free, strong. */
  readonly safeties: readonly PlayerId[];
}

/** The kicking game's three jobs. Placeholder depth — see TUNABLES.game.specialTeams. */
export interface SpecialTeamsPersonnel {
  readonly kicker: PlayerId;
  readonly punter: PlayerId;
  readonly returner: PlayerId;
}

/**
 * One team's whole contribution to one game, by value. Franchise composes this;
 * the engine reads it and writes nothing back to it.
 */
export interface TeamSnapshot {
  readonly team: TeamId;
  readonly players: Readonly<Record<string, PlayerState>>;
  readonly offense: OffensivePersonnel;
  readonly defense: DefensivePersonnel;
  readonly specialTeams: SpecialTeamsPersonnel;
  /** ADR-008 — resolved pair rapport. Absent ⇒ neutral ⇒ unchanged behaviour. */
  readonly chemistry?: ChemistryTable;
}

export interface GameSnapshot {
  readonly at: CalendarStamp;
  readonly home: TeamSnapshot;
  readonly away: TeamSnapshot;
}

// --- decisions --------------------------------------------------------------

/**
 * What the loop knows when it asks somebody to decide something. Everything on
 * it is already in the event stream by the time the decision is taken, so a
 * consumer can reconstruct why a call was made without the caller telling it.
 */
export interface DecisionSituation {
  readonly period: number;
  readonly clockSeconds: number;
  readonly down: number;
  readonly distance: number;
  /** Yards from the offence's own goal line. */
  readonly ballOn: number;
  readonly offense: TeamId;
  readonly defense: TeamId;
  readonly offenseScore: number;
  readonly defenseScore: number;
  /** Inside `TUNABLES.game.twoMinuteSeconds` of the end of the period. */
  readonly twoMinute: boolean;
}

interface DecisionRequestBase {
  /**
   * v1 holds COACH and GM in one pair of hands, so this is inert — and it is the
   * one field that keeps coach-only and split-authority modes reachable without
   * re-shaping the seam. An untagged `onDecision(state)` forecloses both.
   */
  readonly authority: "COACH";
  readonly situation: DecisionSituation;
}

export interface OffensiveCallRequest extends DecisionRequestBase {
  readonly kind: "OFFENSIVE_PLAY_CALL";
  readonly offense: TeamSnapshot;
  readonly defense: TeamSnapshot;
}

export interface DefensiveCallRequest extends DecisionRequestBase {
  readonly kind: "DEFENSIVE_PLAY_CALL";
  readonly offense: TeamSnapshot;
  readonly defense: TeamSnapshot;
  /** The call the defence is answering. Stated, because the engine has no huddle. */
  readonly against: OffensiveCall;
}

export type FourthDownChoice = "GO_FOR_IT" | "PUNT" | "FIELD_GOAL";

export interface FourthDownRequest extends DecisionRequestBase {
  readonly kind: "FOURTH_DOWN";
  readonly offense: TeamSnapshot;
  /** Distance of the field goal this would be, in yards. */
  readonly fieldGoalDistanceYards: number;
}

export type CoinTossChoice = "RECEIVE" | "DEFER";

export interface CoinTossRequest extends DecisionRequestBase {
  readonly kind: "COIN_TOSS";
  /** The team that won the toss, and is therefore choosing. */
  readonly winner: TeamId;
}

export type CoachDecisionRequest =
  | OffensiveCallRequest
  | DefensiveCallRequest
  | FourthDownRequest
  | CoinTossRequest;

/**
 * THE PLAY-CALLER SEAM.
 *
 * Calibration owns the frozen baseline caller (`calibration.md` §3.1) and it does
 * not exist yet, so this is an INTERFACE plus one minimal deterministic default
 * (`defaultPlayCaller`) — enough for a game to complete, and deliberately not a
 * tendency model.
 *
 * A caller is a pure function of its request. It is handed a seeded `Rng` rather
 * than owning one, so two identical games call the same plays.
 */
export interface PlayCaller {
  /** For the stream and the printout. Not interpreted. */
  readonly name: string;
  callOffense(request: OffensiveCallRequest, rng: Rng): OffensiveCall;
  callDefense(request: DefensiveCallRequest, rng: Rng): DefensivePlayCall;
  decideFourthDown(request: FourthDownRequest): FourthDownChoice;
  decideCoinToss(request: CoinTossRequest): CoinTossChoice;
}

// --- the state -------------------------------------------------------------

export type MatchPhase = "PREGAME" | "KICKOFF" | "SCRIMMAGE" | "EXTRA_POINT" | "FINAL";

export interface Scoreboard {
  readonly home: number;
  readonly away: number;
}

/**
 * The drive in progress. `undefined` between drives, which is the honest state
 * during a kickoff or an extra point — neither is a drive and neither should
 * accrue to one.
 */
export interface DriveState {
  readonly driveNumber: number;
  readonly offense: TeamId;
  readonly defense: TeamId;
  readonly startPeriod: number;
  readonly startClockSeconds: number;
  /** Seconds of game clock consumed at the moment the drive began. */
  readonly startElapsedSeconds: number;
  readonly startYardLine: number;
  readonly plays: number;
}

/**
 * ★ Everything the loop carries forward. Flat, readonly, serializable, complete.
 *
 * Note what is NOT here: players, chemistry, personnel, the play-caller. Those
 * are the per-game snapshot and the inputs, supplied per call. A state object
 * that reached out to a world would make "run this week twice with different
 * inputs" impossible to express.
 */
export interface MatchState {
  readonly gameId: GameId;
  readonly at: CalendarStamp;
  readonly home: TeamId;
  readonly away: TeamId;

  readonly phase: MatchPhase;
  readonly period: number;
  /** Seconds remaining in the current period. */
  readonly clockSeconds: number;

  /** 1-based; part of the PRNG fork label of every play. */
  readonly playNumber: number;
  /** 1-based; part of the PRNG fork label of every drive-level draw. */
  readonly driveNumber: number;
  /** 1-based; part of the PRNG fork label of every kickoff. */
  readonly kickoffNumber: number;
  /** Sequence number the next emitted event will carry. */
  readonly nextEventSeq: number;

  readonly possession: TeamId;
  readonly down: number;
  readonly distance: number;
  /** Yards from the POSSESSING team's own goal line, 0-100. */
  readonly ballOn: number;

  readonly score: Scoreboard;
  readonly drive: DriveState | undefined;

  /**
   * Who kicks off to start the second half, fixed by the coin toss. Carried in
   * state rather than recomputed, because the toss happens once and the rule it
   * implies is consumed forty minutes of game clock later.
   */
  readonly secondHalfKickoffBy: TeamId;
  /**
   * Why the next kickoff is happening, set when the loop decides there will be
   * one. In state rather than in a local because a kickoff is a phase the loop
   * ENTERS, and the reason for it is decided in the iteration before.
   */
  readonly pendingKickoff: PossessionCause | undefined;
  /**
   * Whether the game clock is stopped going into the next snap. This is the
   * whole of the engine's clock-stoppage model: an incompletion, a score, a
   * change of possession and a period boundary stop it; nothing else does,
   * because the engine models neither out of bounds nor penalties.
   */
  readonly clockStopped: boolean;
  /** Set once the game is over; the reason it ended. */
  readonly finalReason: "REGULATION" | "OVERTIME" | "TIE" | undefined;
}

export interface GameInputs {
  readonly coordinates: GameCoordinates;
  readonly snapshot: GameSnapshot;
  /** One caller per team. The offence's caller calls offence; the defence's, defence. */
  readonly callers: { readonly home: PlayCaller; readonly away: PlayCaller };
}

/**
 * The provenance record ★3 asks for. `seed` is not derivable from the stream —
 * `RollDetail.rngLabel` carries the fork PATH, never the seed — and a re-runnable
 * game is only re-runnable if the seed that produced it was written down.
 */
export interface GameSummary {
  readonly gameId: GameId;
  readonly coordinates: GameCoordinates;
  readonly seed: string;
  readonly home: TeamId;
  readonly away: TeamId;
  readonly score: Scoreboard;
  readonly periods: readonly Scoreboard[];
  readonly plays: number;
  readonly drives: number;
  readonly finalReason: "REGULATION" | "OVERTIME" | "TIE";
}

/** A call pair the loop resolved for one snap, kept together for the stream. */
export interface ResolvedCalls {
  readonly calls: AnyPlayCalls;
  readonly offenseCaller: string;
  readonly defenseCaller: string;
}
