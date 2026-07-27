/**
 * Engine-local input/output shapes for the pass-play slice.
 *
 * These are NOT redefinitions of shared contract types — every player, id,
 * event, calendar stamp and attribute here comes from @ff/contracts. What lives
 * in this file is the engine's own call/state vocabulary: the arguments a play
 * simulation takes and the state it hands back.
 */
import type {
  CalendarStamp,
  GameId,
  MatchEventEnvelope,
  PlayerId,
  PlayerState,
  TeamId,
} from "@ff/contracts";

export type RouteDepthClass = "QUICK" | "SHORT" | "INTERMEDIATE" | "DEEP";
export type RushMove = "SPEED" | "POWER" | "FINESSE";
export type CoverageTechnique = "PRESS" | "OFF";
export type ReadSystem = "HALF_FIELD" | "FULL_FIELD" | "CONCEPT";
export type PocketStatus = "CLEAN" | "PRESSURE" | "COLLAPSING" | "IMMEDIATE" | "SACK";
export type ThrowType = "BULLET" | "TOUCH" | "BACK_SHOULDER" | "THROWAWAY";
export type ContestPosition = "TRAILING" | "EVEN" | "IN_FRONT";

export interface RouteAssignment {
  readonly receiver: PlayerId;
  /** Free text: the play card's name for the route ("Go", "Dig"). Renderer only. */
  readonly routeName: string;
  readonly depthClass: RouteDepthClass;
  readonly airYards: number;
}

export interface ProtectionAssignment {
  readonly blocker: PlayerId;
  readonly rusher: PlayerId;
}

export interface OffensivePlayCall {
  readonly name: string;
  readonly formation: string;
  readonly readSystem: ReadSystem;
  readonly routes: readonly RouteAssignment[];
  /** Progression order; must reference receivers that have a route. */
  readonly readOrder: readonly PlayerId[];
  readonly protection: readonly ProtectionAssignment[];
}

export interface ManAssignment {
  readonly defender: PlayerId;
  readonly covers: PlayerId;
  readonly technique: CoverageTechnique;
}

export interface RushAssignment {
  readonly rusher: PlayerId;
  readonly move: RushMove;
}

export interface DefensivePlayCall {
  readonly name: string;
  readonly front: string;
  /** This slice implements man coverage only (zone is out of scope). */
  readonly coverage: "MAN";
  readonly assignments: readonly ManAssignment[];
  readonly rush: readonly RushAssignment[];
}

export interface PlayCalls {
  readonly offense: OffensivePlayCall;
  readonly defense: DefensivePlayCall;
}

/**
 * The engine's view of game state. Franchise owns the real one; this is the
 * subset a play needs. `at` rides along because EventEnvelope requires it.
 */
export interface MatchGameState {
  readonly gameId: GameId;
  readonly at: CalendarStamp;
  /** 1-based play counter; part of the PRNG fork label. */
  readonly playNumber: number;
  /** Sequence number the next emitted event will carry. */
  readonly nextEventSeq: number;
  /** PlayerId-keyed. Engine reads attributes from these through the registry. */
  readonly players: Readonly<Record<string, PlayerState>>;
  readonly offenseTeam: TeamId;
  readonly defenseTeam: TeamId;
  readonly quarterback: PlayerId;
  readonly down: number;
  readonly distance: number;
  /** Yards from the offense's own goal line (0-100). */
  readonly ballOn: number;
  readonly clockSeconds: number;
}

/**
 * PLAY_START payload. `MatchEvent["PLAY_START"].payload` is typed `unknown` in
 * contracts — a deliberately open slot. This is the engine's shape for it, and
 * a candidate for a future petition to type it in contracts.
 */
export interface PassPlayStartPayload {
  readonly kind: "PASS_PLAY_V1";
  readonly offense: {
    readonly team: TeamId;
    readonly call: string;
    readonly formation: string;
    readonly quarterback: PlayerId;
    readonly readSystem: ReadSystem;
    readonly routes: readonly RouteAssignment[];
    readonly protection: readonly ProtectionAssignment[];
  };
  readonly defense: {
    readonly team: TeamId;
    readonly call: string;
    readonly front: string;
    readonly coverage: "MAN";
    readonly assignments: readonly ManAssignment[];
    readonly rush: readonly RushAssignment[];
  };
  readonly situation: {
    readonly down: number;
    readonly distance: number;
    readonly ballOn: number;
    readonly clockSeconds: number;
  };
}

export interface SimulationResult {
  readonly events: readonly MatchEventEnvelope[];
  readonly newState: MatchGameState;
}
