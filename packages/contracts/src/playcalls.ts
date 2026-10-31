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
import type { SnapPicture } from "./snap.js";
import type { Cadence, StemCall } from "./stem.js";

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
  /**
   * The route he converts to if the offence's pressure read pictures pressure, truly or not
   * (ADR-022; ADR-073 §2.3).
   */
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
      /**
       * Check-release men who RELEASED — running a route in this call — whom the line may keep
       * in to block before the snap, in the card's order (ADR-073). Each listed man is in
       * `routes`; the list is disjoint from `available` and from every `protection[].blocker`
       * (the engine validator refuses otherwise). It is not playbook's
       * `ProtectionScheme.checkRelease`, a list of roles that includes men later pulled into
       * protection: it is what is left of that list, by PlayerId. Omitted ⇒ nobody may be kept in.
       */
      readonly checkRelease?: readonly PlayerId[];
    }
  | {
      readonly kind: "SLIDE";
      /**
       * The huddle's slide; with `slideCheck` the line may check it before the snap, and the
       * engine reports a check on the stream.
       */
      readonly slideSide: RunSide;
      readonly center?: PlayerId;
      readonly available?: readonly PlayerId[];
      /**
       * Check-release men who RELEASED — running a route in this call — whom the line may keep
       * in to block before the snap, in the card's order (ADR-073). Each listed man is in
       * `routes`; the list is disjoint from `available` and from every `protection[].blocker`
       * (the engine validator refuses otherwise). It is not playbook's
       * `ProtectionScheme.checkRelease`, a list of roles that includes men later pulled into
       * protection: it is what is left of that list, by PlayerId. Omitted ⇒ nobody may be kept in.
       */
      readonly checkRelease?: readonly PlayerId[];
      /**
       * The line may check the slide to the other side before the snap, toward the pressure it
       * reads (ADR-073). Omitted ⇒ the slide is run as called.
       */
      readonly slideCheck?: true;
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
  /**
   * THE COACH'S LEASH ON THIS CALL (ADR-068 step 2, ADR-072): how far the quarterback may stray
   * from it before the snap, from 0 (run it as called) to 100 (every pre-snap decision open).
   * Each decision opens at its own point on the slider (ADR-072 §1). A read that wants one above
   * the leash is a breach, and his `discipline` decides whether he commits it (§2).
   *
   * A whole number from 0 to 100. Omitted ⇒ 100, every decision open: what a call has meant since
   * ADR-068 step 1, so a call built before the leash keeps its meaning.
   *
   * ON THE CALL, NOT THE TEAM. The call is already the coach's decision (the request that produces
   * it carries `authority: "COACH"`, Iron Rule 6), and a coach may loosen it for one situation.
   *
   * NOT on `RunPlayCall`: a run has no pre-snap decision yet, and a field there would author a value
   * nothing reads (ADR-072, Implied scope).
   */
  readonly leash?: number;
  /**
   * The quarterback's count (ADR-091 petition M1). Asked of the offense's play-caller only on a snap
   * whose defense wears a stem, once both calls are made, and set on the call the play runs; absent
   * means a normal count. At ADR-090 step 3 nothing after the snap reads it: the `STEM` event records
   * it beside the stem it met.
   */
  readonly cadence?: Cadence;
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
  /** The quarterback's count, as on `OffensivePlayCall` (ADR-091 petition M1). */
  readonly cadence?: Cadence;
}

export type OffensiveCall = OffensivePlayCall | RunPlayCall;

// --- the defensive call -----------------------------------------------------

/**
 * A second-level defender's run responsibility: the gap he fits if the play is a run
 * (ADR-067 §C).
 *
 * A PAIR, NOT TWO FIELDS, unlike `RushAssignment`'s separate `gap` and `side`: a fit is
 * optional as a whole — a deep safety on a pass-first call has none — and two optional
 * fields would let a card state a gap without a side, which §6.1 says is not a gap.
 *
 * Moved here from `playbook`, where it was declared locally on the grounds that the pair
 * was a card-side shape and not shared vocabulary. That stopped being true when it
 * started crossing the boundary on `CoverageAssignment`; a local copy now would be the
 * subset-drift ADR-013 names.
 */
export interface RunFit {
  readonly gap: RunGap;
  readonly side: RunSide;
}

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
  /**
   * His run fit (ADR-067 §C) — the gap he plays if it is a run, as the card authored it.
   *
   * A CARRY-ACROSS, NOT NEW INFORMATION: `runFit` has been authored on the corpus's
   * second-level duties since the corpus was written, and `playbook` already reads it —
   * `instantiateRun` pairs run blockers with second-level defenders through it. What
   * stopped at `instantiate.ts` was the crossing into this call, so the engine and the
   * stream never saw it. Same shape as ADR-065's `RushAssignment.gap`.
   *
   * WHY ON THE COVERAGE ASSIGNMENT. A fit is where a defender STARTS, and the shown/played
   * pair (`DefensivePlayCall.shownAssignments`) is per assignment: carried here, a safety
   * who shows a deep half and rolls down into the box can show one fit and play another,
   * and a consumer diffing the two lists sees it with no further field.
   *
   * ⚠ NOTHING IN THE ENGINE READS IT. Its subject condition: a run-game consumer of the
   * shown fit (blocking that pairs against what was shown, the run-side analogue of §D)
   * or a starting position for the pre-snap phase. Optional, absent where the card states
   * no fit.
   */
  readonly runFit?: RunFit;
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
  /** See `ManAssignment.runFit`. */
  readonly runFit?: RunFit;
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
   * ITS FIRST READER IS THE FRONT LOOK (ADR-073), which places the shown line by it; the
   * engine only echoes it. A front look may show a different gap in `shownRush`; the engine's
   * physics reads neither, and PLAY_START echoes both (ADR-073). A physics reader appears when
   * a travel model computes a DISTANCE rather than looking one up: `alignment` is
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

/**
 * A man as the defence SHOWS him rushing before the snap (ADR-073). No `move`: a move is
 * played, never shown; what a stance gives away is a read, not card data (ADR-068 §1).
 * Omitted fields mean what they mean on `RushAssignment`; a side or gap stated on one list
 * and omitted on the other is not a difference. Every `RushAssignment` is one.
 */
export type ShownRusher = Pick<RushAssignment, "rusher" | "alignment" | "side" | "gap">;

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

/**
 * §5.1's complexity rows for the quarterback's coverage read (ADR-068 step 1): a basic
 * shell, a rotated shell, a heavy disguise with a late rotation. An absent value means
 * `BASIC`, the doc's own +0 row.
 *
 * DECLARED, NOT DERIVED, for the reason `BlitzDisguise` is: WHETHER the shown look
 * differs from the played one is derivable — diff `shownAssignments` against
 * `assignments` — but how LATE the rotation comes is not on the card anywhere, and it is
 * what makes one disguise harder to read than another.
 *
 * Separate from `BlitzDisguise` because the two are rolled separately and fail
 * independently (ADR-068 §2): a defence can hide its coverage and show its rush, or the
 * reverse.
 */
export type CoverageDisguise = "BASIC" | "ROTATED" | "LATE_ROTATION";

/**
 * The three kinds of tag on a defensive call (ADR-071), by the LAYER of the call each one
 * changes:
 *
 *  - `LOOK` — only what the offence is shown: `shownAssignments` (a coverage look) or
 *    `shownRush` (a front look: Stem, Mug). Never what is played (ADR-069 ruling 1).
 *    "Show 2", "Show 1".
 *  - `PRESSURE` — who rushes, and who takes the rushers' coverage (`rush`, `assignments`).
 *    "Fire", "Double A", "Smoke", "Zero".
 *  - `FRONT` — how the line plays (`stunts`). "Tex", "Twist", "Delay", "Triple".
 *
 * The kind follows the layer, not the column a word sits in on a call sheet: a line that
 * shows one front and plays another (a stem) changes the shown layer, so it is a LOOK.
 */
export type DefensiveTagKind = "LOOK" | "PRESSURE" | "FRONT";

/**
 * One tag on a defensive call (ADR-071): a single word that changes one or two position
 * groups and leaves the rest of the call alone.
 *
 * A NAME, NOT THE CHANGE. What a tag changed is already in the call — `shownAssignments` for
 * a coverage LOOK, `shownRush` for a front LOOK, `rush` and `assignments` for a PRESSURE,
 * `stunts` for a FRONT tag — and the engine resolves those fields, never this one. The tag
 * says what produced them, so a renderer can say the call and calibration can split a rate by
 * it. `id` is the catalogue's key; `name` is the word the captain says.
 */
export interface DefensiveTag {
  readonly kind: DefensiveTagKind;
  /** The catalogue's key: `"SHOW_2"`, `"FIRE"`, `"TEX"`. */
  readonly id: string;
  /** The word the captain says: `"Show 2"`, `"Fire"`, `"Tex"`. */
  readonly name: string;
}

/**
 * A defensive call, said in the order a call sheet says it (ADR-071): **personnel, front,
 * concept, tags** — "Nickel Over Tex, Fire, Cover 3, Show 2". The four are NAMES: a renderer
 * prints them and nothing resolves them. What the engine resolves is `assignments`,
 * `shownAssignments`, `rush`, `shownRush`, `stunts`, `blitzDisguise` and `coverageDisguise`.
 */
export interface DefensivePlayCall {
  /** Who is on the field: `"Nickel"`. The call's first part (ADR-071). */
  readonly personnel: string;
  /** How the line and the box align, without the personnel: `"Over"` (ADR-071). */
  readonly front: string;
  /**
   * The base concept — what is played after the snap: `"Cover 3 Sky"` (ADR-071). The owner's
   * call sheet calls it the foundation; a pressure or a look is a tag on top of it.
   *
   * Not `coverage`: `PLAY_START.defense.coverage` is the MAN / ZONE / MIXED shell the engine
   * derives from `assignments`, a different fact under the same word.
   */
  readonly concept: string;
  /**
   * The tags the call wears (ADR-071), in the order said: front tags, then the pressure, then
   * the looks. Empty ⇒ a vanilla call: the card's own rush and line, shown as it is played.
   */
  readonly tags: readonly DefensiveTag[];
  readonly stunts?: readonly StuntCall[];
  readonly blitzDisguise?: BlitzDisguise;
  /** §5.1's complexity row for the coverage read (ADR-068). Absent ⇒ `BASIC`. */
  readonly coverageDisguise?: CoverageDisguise;
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
   * ⛔ IDENTICAL TO `assignments` UNLESS THE CALL WEARS A COVERAGE LOOK. A call with no
   * shown duty gets the SAME ARRAY in both fields (`instantiateDefense`), so identity is by
   * construction, not by agreement. A call that wears a coverage look (a `LOOK` in `tags`
   * above — ADR-069, ADR-071; the look states a shown duty for each defender it moves) gets a
   * second list differing in exactly those assignments. No card in the corpus states a shown
   * duty of its own, and `playbook`'s `shownAssignments` test fails if one starts to.
   *
   * A front look (Stem, Mug; ADR-073) changes `shownRush` and leaves this the same array.
   *
   * WHY THIS EXISTS. There is no shown-vs-played pair anywhere in the engine today
   * (backlog entry 165): a defensive card states duties and the duties are what happens.
   * `blitzDisguise` is NOT that pair — it shifts a recognition target (+0/15/20/25) about
   * a rush that is already fixed, that the offence's protection was paired against before the
   * snap (against the real rush or a caller's anticipation of it, ADR-024), and that the line may
   * adjust to when the call states the option (ADR-073). It models
   * DEGRADED PERCEPTION OF ONE TRUTH. Being deceived requires two. For the rush, the two
   * are `rush` and `shownRush` (ADR-073).
   *
   * WHY PER-ASSIGNMENT RATHER THAN A SECOND CALL. A safety showing two-high and playing
   * one-high is ONE ASSIGNMENT differing, not a different defence. A parallel second call
   * would double the authoring burden to express a single-defender change.
   *
   * READ BY THE QUARTERBACK'S COVERAGE READ (ADR-068 step 1): on a misread he perceives a
   * receiver against this list rather than `assignments`; the catch still resolves against
   * `assignments`.
   */
  readonly shownAssignments: readonly CoverageAssignment[];
  readonly rush: readonly RushAssignment[];
  /**
   * What the offence SEES of the rush, as against `rush`, which resolves (ADR-073).
   *
   * THE SAME ARRAY AS `rush` unless the call wears a front look; a front look is the only
   * writer of a second list.
   *
   * READ BY THE PRESSURE READ (ADR-073 step 3.2b), beside the validator and the PLAY_START
   * echo: the offence's picture is judged against this list. Physics never reads it.
   */
  readonly shownRush: readonly ShownRusher[];
  /**
   * The stem this call wears (ADR-091 petition M2): which stem, and the Mike who calls it. Present
   * exactly when the call wears the Stem's front `LOOK` tag; the engine resolves this field, never
   * the tag. The front shown is `shownRush` and the front played is `rush`, so the men it moves are
   * the ones `shownRush` shows somewhere `rush` does not play them. At ADR-090 step 3 the stem plays
   * out at the line and is recorded (`STEM`); nothing after the snap reads how it ended.
   */
  readonly stem?: StemCall;
}

// --- what a simulation takes ------------------------------------------------

export interface PlayCalls {
  readonly offense: OffensivePlayCall;
  readonly defense: DefensivePlayCall;
  /**
   * Where every man stands at the snap (ADR-090 petition S5): the picture the caller drew with the
   * playbook from the two calls it holds. It has to come in on the calls because every beat that
   * places a man reads a formation, a defender's role or a zone's name, none of which the engine may
   * see (ADR-006, Iron Rule 1). The engine copies it onto `PLAY_START` (`PlayStartSnap`, S2) and
   * never builds one itself.
   *
   * Absent when the caller drew none (the engine's own default caller has no playbook; a test may
   * build its calls by hand), and then `PLAY_START` carries none. ADR-090 step 1 reads it nowhere
   * else: replayed seeds give identical outcomes with it or without it.
   */
  readonly snap?: SnapPicture;
}

export interface RunPlayCalls {
  readonly offense: RunPlayCall;
  readonly defense: DefensivePlayCall;
  /** As `PlayCalls.snap` (ADR-090 S5). */
  readonly snap?: SnapPicture;
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
