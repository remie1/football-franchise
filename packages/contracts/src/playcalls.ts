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
  /** The route he converts to if the offence recognises pressure (ADR-022). */
  readonly hot?: HotRouteSpec;
}

export interface ProtectionAssignment {
  readonly blocker: PlayerId;
  readonly rusher: PlayerId;
}

/**
 * The protection SCHEME, as distinct from its pairings (ADR-022 petition 1).
 *
 * A discriminated union rather than `kind` plus an optional `slideSide` with a runtime
 * check: on a slide, the side is not optional information, and Charter §4.1 says take the
 * shape that makes the wrong card fail to compile. The engine's own weaker draft was
 * self-reported as "policy where a type would do" and is not what shipped.
 *
 * An omitted `protectionScheme` on a call means MAN — which is exactly what a bare list of
 * pairings already is, so every card written before this is unchanged.
 */
export type ProtectionCall =
  | {
      readonly kind: "MAN";
      /** §5.3 / §7.3's "Centre". Omitted ⇒ that term is not rolled, and no stand-in is
       *  substituted: the engine cannot tell which blocker is the centre from a pairing
       *  list, and ADR-006 forbids reading it out of `formation`. */
      readonly center?: PlayerId;
      /** Men in protection not pre-paired to a rusher, in pickup priority order. */
      readonly available?: readonly PlayerId[];
    }
  | {
      readonly kind: "SLIDE";
      readonly slideSide: RunSide;
      readonly center?: PlayerId;
      readonly available?: readonly PlayerId[];
    };

/**
 * A hot route: the offence's answer to pressure (§5.3, ADR-022 petition 2). A converted
 * route is just a different route, so the spec is the fields a route already has.
 *
 * This is the mechanic that makes a blitz a RISK rather than a free win. Measured: a blitz
 * the quarterback misses pre-snap sacks him on 13.99% of dropbacks; one he saw and answered
 * sacks him on 4.29%, against 11.16% on a snap with no blitz at all.
 */
export interface HotRouteSpec {
  readonly routeName: string;
  readonly depthClass: RouteDepthClass;
  readonly airYards: number;
  /** The area the pressure vacated, as the CARD sees it. Omitted ⇒ keep the original. */
  readonly breakZone?: FieldZone;
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
  /** Omitted ⇒ MAN, i.e. exactly what a list of pairings already means (ADR-022). */
  readonly protectionScheme?: ProtectionCall;
  /**
   * Where the throw happens — the quarterback's distance behind the line of scrimmage at
   * the moment of release, in yards (ADR-066 §Petition 2).
   *
   * ⛔ THIS CONFLATES TWO THINGS BY CONSTRUCTION, and the number cannot be decomposed back
   * into them: where the FORMATION puts him, and how far the DROP takes him. Shotgun is
   * ~5.0 with the drop adding little; under centre starts at 0 and the whole value comes
   * from the drop. A seven-step from under centre and a shotgun play that drifts back both
   * author ~8.0, and nothing here distinguishes them.
   *
   * REQUIRED, deliberately. A card that omits it is a compile error rather than a runtime
   * state, so there is NO missing-value fallback and none may be built — a branch handling
   * a condition the type system forbids can never run.
   *
   * ON THE CARD AND NOT THE FORMATION. At formation level this takes exactly two values
   * across the whole corpus, so a shotgun screen and a shotgun seven-step would be
   * identical at the point the travel model measures. Card level makes them identical only
   * until somebody authors the difference. Initial values are still read off the formation
   * — SHOTGUN 5.0, UNDER_CENTER 7.0 — and 7.0 rather than 8.0 because that class covers
   * three-, five- and seven-step drops and a corpus that cannot distinguish them must not
   * author the deepest.
   *
   * ⚠ THE LIMIT THIS CANNOT EXPRESS: a moving launch point. A quarterback travelling
   * backward during his drop changes the distance mid-flight. That needs a QB position that
   * VARIES WITH TICK — the geometry could consume it, and nothing publishes it. Named here
   * rather than left to be discovered when someone asks why the drop does not matter.
   *
   * NOT on `RunPlayCall`: a run play has no launch point in the sense the model uses, and
   * adding it there would author a value nothing reads. A mesh point for run fits would be
   * a different field with a different football meaning, petitioned then.
   */
  readonly dropDepthYards: number;
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
  /**
   * Which gap he comes through (ADR-065 §Petition 1). The other half of `side`'s own
   * justification: that field exists so a card can say "left A-gap blitz", and until now
   * only the `left` half crossed this boundary.
   *
   * `RushDuty.gap` has been authored on EVERY rush duty in the shipped corpus since the
   * corpus was written — every front defender owns a gap in the run fit. It stopped at
   * `instantiate.ts`'s `declaredRush`, which took `move`/`alignment`/`side` and dropped it.
   * So this is a CARRY-ACROSS of existing data, not new information: no card gains a value
   * an author has to choose.
   *
   * NOTHING READS IT YET, AND THAT IS THE POINT OF LANDING IT. A subject appears when a
   * travel model computes a DISTANCE rather than looking one up: `alignment` is
   * `EDGE|INTERIOR`, which is a classification, and a gap plus a side is a position. The
   * category is not the distance.
   *
   * ADDITIVE, NOT A REPLACEMENT (owner ruling, ADR-065). `gap` and `alignment` overlap but
   * are not the same fact — `alignment` is coarse and the engine reads it in several places,
   * including `arrival.travelSecondsByAlignmentAndMove`, ratified by ADR-061 and extended by
   * ADR-064. Whether `alignment` becomes redundant is ruled when there is a distance model
   * to make it redundant, not on the strength of a projection.
   *
   * Optional, defaulting to today's behaviour.
   */
  readonly gap?: RunGap;
}

/** §7.3's four complexities, verbatim. */
export type StuntComplexity = "T_E" | "T_T" | "DELAYED" | "TRIPLE";

/**
 * A stunt is a RELATIONSHIP between two rushers (ADR-022 petition 3), which is why it is a
 * separate list rather than a `stuntWith` field on each `RushAssignment` — that shape lets a
 * card state the pair inconsistently (A twisting with B while B twists with C).
 */
export interface StuntCall {
  readonly penetrator: PlayerId;
  readonly looper: PlayerId;
  readonly complexity: StuntComplexity;
}

/**
 * §5.3's four disguise rows (ADR-022 petition 4). An absent value means `STANDARD`, and that
 * is not a silent default — it is §5.3's own +0 row, "standard blitz, LB walked up". A card
 * that says nothing is describing the least disguised pressure in the doc's table.
 *
 * Deliberately NOT derived from the coverage shell: a delayed blitz's whole point is that it
 * looks like the same shell, so deriving disguise from it would make the two the same axis.
 */
export type BlitzDisguise = "STANDARD" | "ZONE_BLITZ" | "DELAYED" | "ZERO";

export interface DefensivePlayCall {
  readonly name: string;
  readonly front: string;
  readonly stunts?: readonly StuntCall[];
  readonly blitzDisguise?: BlitzDisguise;
  /**
   * Man and zone assignments, mixed freely. A receiver named by no `ManAssignment` is
   * played by whatever zone his route breaks into; if no zone defender is responsible for
   * that cell he is uncovered, which is what a hole in a zone is.
   */
  readonly assignments: readonly CoverageAssignment[];
  /**
   * What the offence SEES before the snap, as against `assignments`, which is what
   * actually resolves (ADR-067 §A).
   *
   * ⛔ IDENTICAL TO `assignments` TODAY, AND IDENTICAL BY CONSTRUCTION RATHER THAN BY
   * COINCIDENCE: `instantiateDefense` builds both from the same `dutyList(card)` in the
   * same pass. Not two values that happen to agree and could drift — one source read
   * twice. A test asserts the deep equality for every shipped card, and when a card first
   * declares a divergence that test does not get deleted: it becomes the test that proves
   * each divergence is DELIBERATE.
   *
   * WHY THIS EXISTS. There is no shown-vs-played pair anywhere in the engine today
   * (backlog entry 165): a defensive card states duties and the duties are what happens.
   * `blitzDisguise` is NOT that pair — it shifts a recognition target (+0/15/20/25) about
   * a rush that is already fixed and that protection has already paired against. It models
   * DEGRADED PERCEPTION OF ONE TRUTH. Being deceived requires two.
   *
   * WHY PER-ASSIGNMENT RATHER THAN A SECOND CALL. A safety showing two-high and playing
   * one-high is ONE ASSIGNMENT differing, not a different defence. A parallel second call
   * would double the authoring burden to express a single-defender change.
   *
   * ⚠ NOTHING READS THIS YET, and that is deliberate — it lands inert so that the mechanic
   * built on it can be measured on its own. Its SUBJECT CONDITION: a consumer appears when
   * a coverage assignment is resolved against what the quarterback believed rather than
   * against what was played. What produces a divergence is undesigned.
   */
  readonly shownAssignments: readonly CoverageAssignment[];
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
