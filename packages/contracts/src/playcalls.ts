/**
 * The play-call vocabulary — what a play card IS (ADR-017).
 *
 * WHY THIS IS IN THE CONSTITUTION AND THE ENGINE'S STATE VOCABULARY IS NOT.
 * Three parties must agree on this shape: `playbook` authors cards, `engine` resolves
 * them, `calibration` constructs them for batches. Under Charter §4's Amendment 6
 * corollary, a type two or more domains both need is by definition shared vocabulary.
 *
 * It passes `contracts.md` §10's test cleanly, which is the discipline that keeps that
 * corollary from becoming a licence: a play call is inert DATA. Formations are strings,
 * assignments are PlayerId pairs, routes are depth classes and yardages. There is no
 * target number here, no modifier, no formula — those are engine tunables and they stay
 * there.
 *
 * This NARROWS [ADR-013]'s refusal to move "the engine's play-call vocabulary" into
 * contracts; it does not contradict it. What ADR-013 actually refused — `MatchGameState`,
 * `SimulationResult`, the tunables, the PLAY_START payload shapes — is engine machinery
 * and stays in the engine. Two parties made these types engine detail; three make them
 * shared vocabulary.
 *
 * ADR-006 governs what may be said here: a card states relationships explicitly and the
 * engine never infers football from a formation string. That is why every pairing below
 * — blocker↔rusher, blocker↔defender, defender↔receiver — is STATED.
 *
 * WHAT IS DELIBERATELY NOT HERE (ADR-018). `ResolvedRushAssignment`, `CoverageShell` and
 * `GapId` were briefly in this file and were moved back to the engine. Each is a product of
 * RESOLUTION rather than something a card states: a coverage shell is computed by walking
 * assignments, a resolved alignment is what the engine produces after defaulting a missing
 * one from a tunable, and no card has a `GapId` field at all. The test this file is held to
 * is "what a play card IS" — the atoms (`RunGap`, `RunSide`, `RushAlignment`, `FieldZone`,
 * the call types) are shared vocabulary; their resolution products are engine machinery.
 */
import type { PlayerId } from "./ids.js";
import type { RushAlignment } from "./events.js";

// --- shared vocabulary ------------------------------------------------------

export type RouteDepthClass = "QUICK" | "SHORT" | "INTERMEDIATE" | "DEEP";
export type RushMove = "SPEED" | "POWER" | "FINESSE";
export type CoverageTechnique = "PRESS" | "OFF";
export type ReadSystem = "HALF_FIELD" | "FULL_FIELD" | "CONCEPT";

/**
 * The horizontal grid, left sideline to right sideline (match-engine.md §3.1).
 *
 * SCOPE: not the full field model — the minimum that makes "is a defender in this route's
 * zone?" answerable from a play card, which is what §9.4 and §12.3 need. No coordinates,
 * no yard lines, no motion; a player occupies one cell for the whole play.
 */
export type HorizontalZone = "LW" | "LH" | "C" | "RH" | "RW";

/** The depth grid (§3.2). Yard boundaries are engine tunables, not vocabulary. */
export type VerticalZone = "BACKFIELD" | "SHORT" | "INTERMEDIATE" | "DEEP" | "VERY_DEEP";

/** One cell of the §3 grid. */
export interface FieldZone {
  readonly horizontal: HorizontalZone;
  readonly vertical: VerticalZone;
}

// --- the pass call ----------------------------------------------------------

export interface RouteAssignment {
  readonly receiver: PlayerId;
  /** The card's name for the route ("Go", "Dig"). Presentation only. */
  readonly routeName: string;
  readonly depthClass: RouteDepthClass;
  readonly airYards: number;
  /**
   * Where the route ends up when it declares (§3).
   *
   * Optional only because the VERTICAL half is derivable — §3.2 states the depth bands and
   * `airYards` is on the card. The HORIZONTAL half is derivable from nothing, and an
   * omitted `breakZone` therefore falls back to a default lane, which is a fake and is
   * `CALIBRATION-BACKLOG.md` entry 8. **A corpus worth simulating states this field on
   * every route.**
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

// --- the run call -----------------------------------------------------------

/** The two families of blocking scheme; they behave differently (§6.2). */
export type RunScheme = "ZONE" | "GAP";

/** A between centre and guard, B guard/tackle, C outside the tackle, D the edge (§6.1). */
export type RunGap = "A" | "B" | "C" | "D";

/** §6.1's diagram is symmetric about the centre; a gap is not identified without a side. */
export type RunSide = "LEFT" | "RIGHT";

/** The three named ways to block a man in space (§13.3). */
export type BlockType = "STALK" | "CRACK" | "LEAD";

/**
 * One gap of the play design: who blocks, and whom (§6.3).
 *
 * The pairing is STATED, not inferred, because ADR-006 forbids the engine reading a
 * formation string — it cannot work out for itself which defender is in the B gap.
 */
export interface RunBlockAssignment {
  readonly blocker: PlayerId;
  readonly defender: PlayerId;
  readonly gap: RunGap;
  readonly side: RunSide;
  /** §6.3's double team. The second man blocks nobody else. */
  readonly doubleTeamWith?: PlayerId;
  /** §6.3's pulling blocker in space. */
  readonly pulling?: boolean;
}

/** A blocker working in space rather than at the line (§13.3 / §14.5). */
export interface SpaceBlockAssignment {
  readonly blocker: PlayerId;
  readonly defender: PlayerId;
  readonly blockType: BlockType;
}

/**
 * A designed run (§14).
 *
 * `designedGap`/`designedSide` are where the play is drawn to go. On a GAP scheme that is
 * where the ball goes; on a ZONE scheme it is the starting point, and §14.2's vision check
 * decides whether the back finds a better lane.
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
  /** Stalk/crack/lead blocks on defenders who are not in a gap (§14.5). */
  readonly perimeter?: readonly SpaceBlockAssignment[];
}

export type OffensiveCall = OffensivePlayCall | RunPlayCall;

// --- the defensive call -----------------------------------------------------

/**
 * COVERAGE IS PER ASSIGNMENT, NOT PER CALL.
 *
 * A single `coverage` flag on the whole call cannot express what real defences do: Cover 1
 * Robber is man everywhere with a zone player in the hole; Cover 3 is three deep zones plus
 * matched underneath; a fire zone drops a lineman. One enum has to lie about all of them.
 */
export interface ManAssignment {
  readonly kind: "MAN";
  readonly defender: PlayerId;
  readonly covers: PlayerId;
  readonly technique: CoverageTechnique;
}

/**
 * A defender responsible for a REGION of the §3 grid rather than a man (§9.4).
 *
 * `zone` is the anchor cell; the spans widen it (ADR-018). A zone defender covering exactly
 * one cell of twenty-five is not a zone — it is man coverage with extra steps, and it is why
 * `CALIBRATION-BACKLOG.md` entry 8 stayed open after every route gained a break zone. A Cover
 * 2 corner must touch a route one band deeper in his own lane.
 *
 * Both default to 0, so every card and call site written before this is unchanged.
 */
export interface ZoneAssignment {
  readonly kind: "ZONE";
  readonly defender: PlayerId;
  readonly zone: FieldZone;
  /** Lanes covered either side of `zone.horizontal`. 0 (default) = the anchor cell only. */
  readonly laneSpan?: number;
  /** Depth bands covered either side of `zone.vertical`. 0 (default) = the anchor cell only. */
  readonly depthSpan?: number;
}

export type CoverageAssignment = ManAssignment | ZoneAssignment;

/**
 * Where the rusher starts, and therefore how far he travels once he wins (§7.2's
 * time-of-arrival model). A property of the CALL, not the player: the same end who lines up
 * wide on first down walks inside on a passing down, and the two are worth very different
 * things.
 */
export interface RushAssignment {
  readonly rusher: PlayerId;
  readonly move: RushMove;
  /**
   * Omitted, it is derived from the rusher's `Position` — right for a base four-man front
   * and wrong for anything creative. An A-gap blitzing linebacker has to say so.
   */
  readonly alignment?: RushAlignment;
  /**
   * Which side he comes from (ADR-018). Without it a card cannot say "left A-gap blitz",
   * so blocker↔rusher pairing has no geometry and has to be invented — which can put the
   * left tackle on the right end, resolve cleanly, and produce plausible numbers from an
   * impossible matchup.
   *
   * The asymmetry is the evidence this was missing: run blocking already pairs correctly,
   * because `RunBlockAssignment` carries a side and this did not.
   *
   * Optional, defaulting to today's behaviour.
   */
  readonly side?: RunSide;
}

export interface DefensivePlayCall {
  readonly name: string;
  readonly front: string;
  /**
   * Man and zone assignments, mixed freely. A receiver named by no `ManAssignment` is
   * played by whatever zone his route breaks into; if no zone defender is responsible for
   * that cell he is uncovered, which is what a hole in a zone is.
   */
  readonly assignments: readonly CoverageAssignment[];
  readonly rush: readonly RushAssignment[];
}

// --- what a simulation takes ------------------------------------------------

export interface PlayCalls {
  readonly offense: OffensivePlayCall;
  readonly defense: DefensivePlayCall;
}

export interface RunPlayCalls {
  readonly offense: RunPlayCall;
  readonly defense: DefensivePlayCall;
}

/**
 * Discriminated on `offense.kind`, so a caller handing over a run gets the run simulation
 * and a caller handing over a dropback gets the pass one — no flag, no inference.
 */
export type AnyPlayCalls = PlayCalls | RunPlayCalls;

/** Type guard. `contracts.md` §7 permits type guards here; it permits no other logic. */
export function isRunCall(calls: AnyPlayCalls): calls is RunPlayCalls {
  return calls.offense.kind === "RUN";
}
