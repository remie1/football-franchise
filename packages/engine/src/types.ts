/**
 * Engine-local input/output shapes for a simulated play.
 *
 * These are NOT redefinitions of shared contract types — every player, id,
 * event, calendar stamp, attribute and PLAY CALL here comes from @ff/contracts.
 * What lives in this file is the engine's own STATE vocabulary: the state a play
 * simulation runs against, the payloads it puts on PLAY_START, and the result it
 * hands back.
 */
import type {
  AnyPlayCalls,
  BlockType,
  CalendarStamp,
  ChemistryTable,
  CoverageAssignment,
  CoverageShell,
  CoverageTechnique,
  DefensivePlayCall,
  FieldZone,
  GameId,
  GapId,
  HorizontalZone,
  ManAssignment,
  MatchEventEnvelope,
  OffensiveCall,
  OffensivePlayCall,
  PlayCalls,
  PlayerId,
  PlayerState,
  PocketStatus,
  ProtectionAssignment,
  ReadSystem,
  ResolvedRushAssignment,
  RouteAssignment,
  RouteDepthClass,
  RunBlockAssignment,
  RunGap,
  RunPlayCall,
  RunPlayCalls,
  RunScheme,
  RunSide,
  RushAlignment,
  RushAssignment,
  RushMove,
  SpaceBlockAssignment,
  TeamId,
  ThrowType,
  VerticalZone,
  ZoneAssignment,
} from "@ff/contracts";

/**
 * ADR-013 — `PocketStatus`, `ThrowType` and `RushAlignment` are NOT declared
 * here any more. They are members of match-event payloads, contracts names them,
 * and a local copy silently becomes a subset the moment contracts widens one.
 * They are re-exported so that every existing `from "../types.js"` import keeps
 * working and the ADR-012 barrel surface is unchanged — the DEFINITION moved,
 * the spelling did not.
 */
export type { PocketStatus, RushAlignment, ThrowType };

/**
 * ADR-017 — THE PLAY-CALL VOCABULARY IS NOT DECLARED HERE ANY MORE EITHER, AND
 * THE ENGINE'S STATE VOCABULARY BELOW STILL IS.
 *
 * Three parties must now agree on what a play card IS: `playbook` authors them,
 * this package resolves them, `calibration` constructs them for batches. Under
 * Charter §4's Amendment 6 corollary a type two or more domains both need is by
 * definition shared vocabulary, and a play call passes `contracts.md` §10's test
 * cleanly — it is inert data with no target number, no modifier and no formula.
 * Two declarations of the same shape are structurally identical right up until
 * one side widens, and then the drift is invisible because each side's tests
 * still pass; so there is now exactly one, in `@ff/contracts/playcalls`.
 *
 * This NARROWS ADR-013's refusal rather than reversing it. What ADR-013 actually
 * refused to move — `MatchGameState`, `SimulationResult`, the PLAY_START payload
 * shapes, `ContestPosition`, the tunables — is engine machinery and is still
 * declared below.
 *
 * Re-exported for the same reason as the ADR-013 block above: every existing
 * `from "../types.js"` import keeps working and the ADR-012 barrel surface is
 * unchanged. The DEFINITION moved; the spelling did not.
 */
export type {
  AnyPlayCalls,
  BlockType,
  CoverageAssignment,
  CoverageShell,
  CoverageTechnique,
  DefensivePlayCall,
  FieldZone,
  GapId,
  HorizontalZone,
  ManAssignment,
  OffensiveCall,
  OffensivePlayCall,
  PlayCalls,
  ProtectionAssignment,
  ReadSystem,
  ResolvedRushAssignment,
  RouteAssignment,
  RouteDepthClass,
  RunBlockAssignment,
  RunGap,
  RunPlayCall,
  RunPlayCalls,
  RunScheme,
  RunSide,
  RushAssignment,
  RushMove,
  SpaceBlockAssignment,
  VerticalZone,
  ZoneAssignment,
};

/**
 * `isRunCall` is a VALUE — a type guard, not a type — so it needs a value
 * re-export rather than an `export type`. It stays off the ADR-012 barrel, which
 * `test/tunablePatch.test.ts` asserts; this line only preserves the module path
 * its call sites already use.
 */
export { isRunCall } from "@ff/contracts";

/**
 * §12.3 — where a defender is relative to the receiver at the catch point. This
 * is a CHECK INPUT the engine derives during a play, not something a card states,
 * so ADR-013's refusal still covers it and it stays here.
 */
export type ContestPosition = "TRAILING" | "EVEN" | "IN_FRONT";

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
  /**
   * ADR-008 — resolved QB↔receiver rapport, keyed passer → receiver, 0-100 with
   * 50 neutral. Franchise-owned pair state, delivered as a snapshot; the engine
   * reads it and never writes it. Absent table, absent passer, or absent pair
   * all read 50, which is the neutral modifier and today's behaviour exactly.
   */
  readonly chemistry?: ChemistryTable;
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
    /**
     * The progression the quarterback actually worked, filtered to receivers who
     * have a route. §8.1's reading systems are only auditable from the stream if
     * the ORDER is in it — a consumer counting "did he get to his third read?"
     * cannot reconstruct it from `routes`, which is a set, not a sequence.
     */
    readonly readOrder: readonly PlayerId[];
    readonly protection: readonly ProtectionAssignment[];
  };
  readonly defense: {
    readonly team: TeamId;
    readonly call: string;
    readonly front: string;
    /** Derived from `assignments`, not echoed from the call: `MIXED` is sayable. */
    readonly coverage: CoverageShell;
    readonly assignments: readonly CoverageAssignment[];
    /** Alignment resolved: §7.2's time-of-arrival model depends on it. */
    readonly rush: readonly ResolvedRushAssignment[];
  };
  readonly situation: {
    readonly down: number;
    readonly distance: number;
    readonly ballOn: number;
    readonly clockSeconds: number;
  };
}

/**
 * PLAY_START payload for a designed run. Same open slot as `PassPlayStartPayload`
 * and the same reason it is worth filling: `RUN_RESOLUTION` states the gap the
 * ball ACTUALLY went through, and "did the back find the cutback?" is only
 * answerable if the gap it was DRAWN to is also in the stream.
 */
export interface RunPlayStartPayload {
  readonly kind: "RUN_PLAY_V1";
  readonly offense: {
    readonly team: TeamId;
    readonly call: string;
    readonly formation: string;
    readonly scheme: RunScheme;
    readonly carrier: PlayerId;
    readonly designedGap: string;
    readonly blocking: readonly RunBlockAssignment[];
    readonly perimeter: readonly SpaceBlockAssignment[];
  };
  readonly defense: {
    readonly team: TeamId;
    readonly call: string;
    readonly front: string;
    readonly coverage: CoverageShell;
    readonly assignments: readonly CoverageAssignment[];
    readonly rush: readonly ResolvedRushAssignment[];
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
