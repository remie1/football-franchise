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
  ChemistryTable,
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

/**
 * §3.1 — the horizontal grid, left sideline to right sideline.
 *
 * SCOPE. This is NOT the full field model of §3; it is the minimum that makes
 * "is a defender in this route's zone?" answerable from a play call, which is
 * what §9.4 and §12.3 require and nothing more. There are no coordinates, no
 * yard lines and no motion: a player occupies one cell for the whole play.
 */
export type HorizontalZone = "LW" | "LH" | "C" | "RH" | "RW";

/** §3.2 — the depth grid. Yard boundaries live in `TUNABLES.zoneModel`. */
export type VerticalZone = "BACKFIELD" | "SHORT" | "INTERMEDIATE" | "DEEP" | "VERY_DEEP";

/** One cell of the §3 grid. */
export interface FieldZone {
  readonly horizontal: HorizontalZone;
  readonly vertical: VerticalZone;
}

export interface RouteAssignment {
  readonly receiver: PlayerId;
  /** Free text: the play card's name for the route ("Go", "Dig"). Renderer only. */
  readonly routeName: string;
  readonly depthClass: RouteDepthClass;
  readonly airYards: number;
  /**
   * §3 — the cell the route ends up in when it declares.
   *
   * Optional, because the vertical half is DERIVABLE: §3.2 states the depth
   * bands in yards and `airYards` is already on the card. The horizontal half is
   * not derivable from anything the engine has, so an omitted `breakZone` falls
   * back to `TUNABLES.zoneModel.defaultHorizontal` — which is a fake, and is the
   * reason a zone defence worth simulating states this field.
   */
  readonly breakZone?: FieldZone;
}

export interface ProtectionAssignment {
  readonly blocker: PlayerId;
  readonly rusher: PlayerId;
}

export interface OffensivePlayCall {
  /** Discriminant of `OffensiveCall`. A dropback. */
  readonly kind: "PASS";
  readonly name: string;
  readonly formation: string;
  readonly readSystem: ReadSystem;
  readonly routes: readonly RouteAssignment[];
  /** Progression order; must reference receivers that have a route. */
  readonly readOrder: readonly PlayerId[];
  readonly protection: readonly ProtectionAssignment[];
}

// --- §6 / §14 — the run call ------------------------------------------------

/** §6.2 — the two families of blocking scheme, and they behave differently. */
export type RunScheme = "ZONE" | "GAP";

/** §6.1 — A between centre and guard, B guard/tackle, C outside the tackle, D the edge. */
export type RunGap = "A" | "B" | "C" | "D";

/** §6.1's diagram is symmetric about the centre; a gap is not identified without a side. */
export type RunSide = "LEFT" | "RIGHT";

/** §13.3's three named ways to block a man in space. */
export type BlockType = "STALK" | "CRACK" | "LEAD";

export interface GapId {
  readonly gap: RunGap;
  readonly side: RunSide;
}

/**
 * §6.3 — one gap of the play design: who is blocking, and whom.
 *
 * The pairing is STATED, not inferred, for the same reason `ProtectionAssignment`
 * is: the engine is forbidden from reading a formation string (ADR-006), so it
 * cannot work out which defender is in the B gap. `doubleTeamWith` and `pulling`
 * are §6.3's two scheme modifiers, and both are properties of the CALL.
 */
export interface RunBlockAssignment {
  readonly blocker: PlayerId;
  readonly defender: PlayerId;
  readonly gap: RunGap;
  readonly side: RunSide;
  /** §6.3 "Double team: +20 to OL". The second man does not block anyone else. */
  readonly doubleTeamWith?: PlayerId;
  /** §6.3 "Pulling blocker in space: −10 to OL, +10 to defender". */
  readonly pulling?: boolean;
}

/** §13.3 / §14.5 — a blocker working in space rather than at the line. */
export interface SpaceBlockAssignment {
  readonly blocker: PlayerId;
  readonly defender: PlayerId;
  readonly blockType: BlockType;
}

/**
 * §14 — a designed run.
 *
 * `designedGap`/`designedSide` are where the play is drawn to go. On a GAP
 * scheme that is where the ball goes, full stop (§6.2: "RB Vision Dependency:
 * LOW — designed hole, RB hits it decisively"). On a ZONE scheme it is only the
 * starting point: §14.2's vision check decides whether he finds the best lane or
 * runs the one that was called.
 */
export interface RunPlayCall {
  /** Discriminant of `OffensiveCall`. A handoff. */
  readonly kind: "RUN";
  readonly name: string;
  readonly formation: string;
  readonly scheme: RunScheme;
  readonly designedGap: RunGap;
  readonly designedSide: RunSide;
  readonly carrier: PlayerId;
  readonly blocking: readonly RunBlockAssignment[];
  /** §14.5 — stalk/crack/lead blocks on defenders who are not in a gap. */
  readonly perimeter?: readonly SpaceBlockAssignment[];
}

export type OffensiveCall = OffensivePlayCall | RunPlayCall;

/**
 * COVERAGE IS PER ASSIGNMENT, NOT PER CALL.
 *
 * The vertical slice carried `DefensivePlayCall.coverage: "MAN"` — one flag for
 * eleven defenders. That flag cannot express what real defences actually do:
 * Cover 1 Robber is man everywhere with a zone player in the hole; Cover 3 is
 * three deep zones plus matched underneath; a fire zone drops a defensive end.
 * A single enum on the whole call has to lie about all of them, so it is gone,
 * and each defender now states his own technique.
 */
export interface ManAssignment {
  readonly kind: "MAN";
  readonly defender: PlayerId;
  readonly covers: PlayerId;
  readonly technique: CoverageTechnique;
}

/** §9.4 — a defender responsible for a cell of the §3 grid rather than a man. */
export interface ZoneAssignment {
  readonly kind: "ZONE";
  readonly defender: PlayerId;
  readonly zone: FieldZone;
}

export type CoverageAssignment = ManAssignment | ZoneAssignment;

/**
 * What the defence PLAYED, derived from the assignments rather than declared.
 * Emitted on PLAY_START so a consumer can split man from zone without walking
 * every assignment — and so `MIXED` is sayable at all.
 */
export type CoverageShell = "MAN" | "ZONE" | "MIXED" | "NONE";

/**
 * Where the rusher starts, and therefore how far he has to travel once he wins
 * (§7.2 time-of-arrival). This is a property of the DEFENSIVE CALL, not of the
 * player: the same end who lines up wide on first down walks inside on a
 * passing down, and the two are worth very different things.
 */
export type RushAlignment = "EDGE" | "INTERIOR";

export interface RushAssignment {
  readonly rusher: PlayerId;
  readonly move: RushMove;
  /**
   * Optional. Omitted, it is derived from the rusher's `Position`
   * (`TUNABLES.arrival.interiorPositions`), which is right for a base four-man
   * front and wrong for anything creative — an A-gap blitzing linebacker has to
   * say so.
   */
  readonly alignment?: RushAlignment;
}

/**
 * A rush assignment after the engine has resolved the optional alignment. This
 * is what goes into PLAY_START, so the stream carries the alignment the play was
 * actually simulated with rather than the one the caller happened to type.
 */
export interface ResolvedRushAssignment extends RushAssignment {
  readonly alignment: RushAlignment;
}

export interface DefensivePlayCall {
  readonly name: string;
  readonly front: string;
  /**
   * Man and zone assignments, mixed freely. A receiver named by no `ManAssignment`
   * is played by whatever zone his route breaks into; if no zone defender is
   * responsible for that cell, he is uncovered, which is what a hole in a zone is.
   */
  readonly assignments: readonly CoverageAssignment[];
  readonly rush: readonly RushAssignment[];
}

export interface PlayCalls {
  readonly offense: OffensivePlayCall;
  readonly defense: DefensivePlayCall;
}

export interface RunPlayCalls {
  readonly offense: RunPlayCall;
  readonly defense: DefensivePlayCall;
}

/**
 * What `simulatePlay` takes. Discriminated on `offense.kind`, so a caller that
 * hands the engine a run gets the run simulation and a caller that hands it a
 * dropback gets the pass one, with no flag and no inference.
 */
export type AnyPlayCalls = PlayCalls | RunPlayCalls;

export function isRunCall(calls: AnyPlayCalls): calls is RunPlayCalls {
  return calls.offense.kind === "RUN";
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
