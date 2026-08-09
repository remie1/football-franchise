/**
 * PASS CONCEPTS — the corpus, and the type that makes a broken one uncompilable.
 *
 * `passConcept()` is generic in two parameters and both of them do work:
 *
 *  - `P` is the personnel grouping, taken from the formation, so `routes` may only
 *    name roles that are actually on the field. A 12-personnel card that assigns a
 *    route to `SLOT` is a compile error, not a validator finding.
 *  - `R` is the set of roles that HAVE a route, inferred from the `routes` object
 *    literal. `readOrder` is `readonly NoInfer<R>[]`, so a progression naming
 *    somebody with nothing to run is a compile error too — the same rejection the
 *    engine makes at runtime in `assertCoherentPlayCall`, moved to authoring time
 *    where ADR-006 says it belongs.
 *
 * Charter §4.1, prefer a compile error to a convention. Two of the engine's four
 * runtime rejections are now unreachable from this package by construction.
 *
 * WHAT THE CONCEPTS ARE SHAPED AROUND. Every route states its break lane. Depth is
 * derived from air yards by `breakAt`, so the vertical half can never contradict
 * `airYards` and the author only decides the half that is a real decision. The
 * spread of concepts across quick / rhythm / shot / screen is chosen to reproduce
 * the published depth-of-target shares in `distribution.ts`, which
 * `test/distribution.test.ts` asserts rather than assumes.
 *
 * BACKS RELEASE BEHIND THE LINE (backlog 8a). A swing is caught a yard or two BEHIND
 * the line of scrimmage, not on it, and a back's "flat" route out of the backfield is
 * a swing. The corpus said nought and one; it now says minus two and minus one, which
 * moves the behind-the-line share of the route mix from 1.4% to ~7%. That is a
 * correction to where the ball is caught rather than a distribution tweak — and it is
 * still deliberately below the ~13% share of ATTEMPTS, because the checkdown is
 * thrown far more often than it is run and target selection is §8.5's job, not a
 * card's.
 *
 * THE SIXTH PROTECTOR'S SIDE. Every formation in the corpus is right-strength, so
 * the back in a six-man protection has the backside — LEFT — throughout. That is a
 * property of the formations rather than a default: `sixManProtection` requires the
 * side, and a left-strength card would state RIGHT.
 *
 * ======================= ADR-022: SCHEME AND SIGHT ADJUSTMENT =======================
 *
 * **WHICH CARDS SLIDE.** Five-man protections slide; six- and seven-man protections
 * are big-on-big MAN. That is not a taxonomy, it is the arithmetic: five men against
 * a possible six rushers cannot answer man-for-man, so the answer is a gap rule and
 * one leftover the offence covers another way. Six in against six is a body apiece.
 *
 * **WHICH WAY.** *The line slides away from the man who answers that side.* With a
 * check-release back that man is the back, and his side is the one his route releases
 * to — you do not send a back across the formation to check a linebacker. In empty
 * there is no back and the answer is the hot receiver, so the slide covers the half he
 * is not in. `validate.ts` carries this as a WARNING (`C_SLIDE_TOWARD_THE_OUTLET`)
 * rather than an error, because sliding to the outlet is legal football and merely
 * usually a mistake.
 *
 * The distribution this produces is 9 LEFT to 4 RIGHT, and that skew is honest rather
 * than chosen: every formation in the corpus is right-strength, so most check-release
 * backs release right, so most lines slide left. It is a property of a right-handed
 * formation set and it is stated in `distribution.ts` as such.
 *
 * **WHICH CARDS STATE A HOT ROUTE, and the rule that decides it.** *A concept states a
 * hot when its answer to pressure is not already its first read.* Three shapes fall
 * out of that and all three are real:
 *
 *  - **Quick game says nothing.** Slant-Flat's first read is the slant. Designating it
 *    hot would move to the front of the progression a man who is already at the front.
 *    A card that says nothing here is saying the true thing: this concept IS the
 *    answer. `validate.ts` rejects the no-op (`C_HOT_IS_A_NO_OP`) so it cannot creep
 *    in as decoration.
 *  - **Rhythm concepts designate.** Curl-Flat, Smash, Levels, Drive, Flood all carry a
 *    quick route behind a slower first read — the flat, the hitch, the drag. Against
 *    pressure that man is thrown first and his route does not change, which is what
 *    `alreadyHot` says and exactly what a coach means by "the flat is your hot".
 *  - **Shot plays and empty CONVERT.** Four Verticals, Mills, Post-Wheel and both empty
 *    cards have nothing quick on the field, so somebody breaks his route off: the inside
 *    seam sits down, the post becomes a slant, the wheel becomes a swing. Those state a
 *    new route AND a new break zone, because a converted route is somewhere else.
 *
 *  - **Two families deliberately state nothing at all**, and the refusal is the point.
 *    **Max protect** (Yankee, Post-Corner Shot) answers pressure with bodies — seven in,
 *    and a hot route on top would be a second answer to a problem already paid for.
 *    **The screen** answers it by design: a blitz is what a screen wants.
 */
import type { ReadSystem } from "@ff/contracts";
import * as F from "./formations.js";
import type { AnyFormation } from "./formations.js";
import type { ProtectionScheme } from "./protection.js";
import { fiveManSlide, sevenManProtection, sixManProtection } from "./protection.js";
import type { OffenseSkillRole, SkillRoleOf } from "./roles.js";
import type { RouteSpec } from "./routes.js";
import { alreadyHot, convertsTo, hot, optionRoute, route } from "./routes.js";
import type { SituationalUsage } from "./distribution.js";

/**
 * `F` is inferred from the formation OBJECT rather than from a personnel literal,
 * so `F["personnel"]` is `"11"` and `SkillRoleOf<F["personnel"]>` is a closed union
 * of the five roles actually on the field. Inferring a bare `P` from
 * `FormationTemplate<P>` does not work — `alignments` is a mapped type over a
 * deferred index and TypeScript falls back to the constraint, which silently
 * widens the check to "any skill role". This shape keeps the check real.
 */
export interface PassConceptSpec<F extends AnyFormation, R extends SkillRoleOf<F["personnel"]>> {
  readonly id: string;
  readonly name: string;
  readonly formation: F;
  readonly readSystem: ReadSystem;
  /**
   * How far behind the line the launch point is. Required: a card that does not
   * state it would author a launch point by default, and the default is the thing
   * the engine must not guess.
   *
   * The corpus states it by the formation's `quarterback` spot. SHOTGUN is 5.0. Any
   * UNDER_CENTER card is 7.0 — deliberately not 8.0, because that class covers three-,
   * five- and seven-step drops alike and a corpus that cannot tell them apart must
   * author the mid-to-deep generic rather than the deepest of the three.
   */
  readonly dropDepthYards: number;
  readonly routes: { readonly [K in R]: RouteSpec };
  /** `NoInfer` so `R` is fixed by `routes` alone; a stray name here will not widen it. */
  readonly readOrder: readonly NoInfer<R>[];
  readonly protection: ProtectionScheme;
  readonly usage: SituationalUsage;
}

/** The erased card. What the corpus stores and what instantiation consumes. */
export interface PassConcept {
  readonly id: string;
  readonly name: string;
  readonly formation: AnyFormation;
  readonly readSystem: ReadSystem;
  /** See `PassConceptSpec.dropDepthYards`. Survives erasure because instantiation reads it. */
  readonly dropDepthYards: number;
  readonly routes: Readonly<Partial<Record<OffenseSkillRole, RouteSpec>>>;
  readonly readOrder: readonly OffenseSkillRole[];
  readonly protection: ProtectionScheme;
  readonly usage: SituationalUsage;
}

export function passConcept<F extends AnyFormation, R extends SkillRoleOf<F["personnel"]>>(
  spec: PassConceptSpec<F, R>,
): PassConcept {
  return spec;
}

/**
 * How many rushers this card can account for before somebody comes free.
 *
 * It is no longer a limit on what may be PLAYED — a free runner resolves (ADR-023) —
 * only on what may be blocked. A card below the corpus's heaviest pressure has to
 * carry a hot route instead, and `validate.ts` enforces exactly that trade.
 */
export function protectionCapacity(concept: PassConcept): number {
  return concept.protection.protectors.length + concept.protection.checkRelease.length;
}

/** The roles whose route converts or is designated hot, in `routes` order. */
export function hotRoles(concept: PassConcept): readonly OffenseSkillRole[] {
  return (Object.keys(concept.routes) as OffenseSkillRole[]).filter(
    (role) => concept.routes[role]?.hot !== undefined,
  );
}

/** Whether this concept has any stated answer to a rusher nobody blocked. */
export function statesAHotRoute(concept: PassConcept): boolean {
  return hotRoles(concept).length > 0;
}

// --- quick game -------------------------------------------------------------

export const SLANT_FLAT = passConcept({
  id: "PASS_SLANT_FLAT",
  name: "Slant-Flat",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 5.0,
  routes: {
    X: route("Hitch", "QUICK", 7, "LW"),
    SLOT: route("Slant", "QUICK", 6, "C"),
    Z: route("Slant", "QUICK", 6, "RH"),
    TE_Y: route("Flat", "QUICK", 2, "RW"),
    RB: route("Swing", "QUICK", -2, "RH"),
  },
  readOrder: ["Z", "TE_Y", "RB"],
  // No hot, and that is the statement: the slant IS the hot, and it is already the
  // first read. The back releases right, so the line slides left.
  protection: fiveManSlide("LEFT", ["RB"]),
  usage: { weight: 9, maxDistance: 8 },
});

export const STICK = passConcept({
  id: "PASS_STICK",
  name: "Stick",
  formation: F.GUN_TRIPS_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 5.0,
  routes: {
    SLOT: route("Stick", "SHORT", 6, "RH"),
    TE_Y: route("Flat", "QUICK", 2, "RW"),
    Z: route("Go", "DEEP", 22, "RW"),
    X: route("Slant", "QUICK", 6, "LH"),
    RB: route("Angle", "QUICK", 4, "LH"),
  },
  readOrder: ["SLOT", "TE_Y", "RB"],
  protection: fiveManSlide("RIGHT", ["RB"]),
  usage: { weight: 8, maxDistance: 9 },
});

export const SNAG = passConcept({
  id: "PASS_SNAG",
  name: "Snag",
  formation: F.GUN_BUNCH_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 5.0,
  routes: {
    Z: route("Spot", "QUICK", 6, "RH"),
    SLOT: route("Corner", "INTERMEDIATE", 18, "RW"),
    TE_Y: route("Flat", "QUICK", 3, "RW"),
    X: route("Go", "DEEP", 24, "LW"),
  },
  readOrder: ["Z", "SLOT", "TE_Y"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 6, maxDistance: 10 },
});

export const BUBBLE_NOW = passConcept({
  id: "PASS_BUBBLE_NOW",
  name: "Bubble Now",
  formation: F.GUN_SPREAD_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 5.0,
  routes: {
    SLOT2: route("Bubble", "QUICK", -1, "RW"),
    Z: route("Hitch", "QUICK", 5, "RW"),
    X: route("Hitch", "QUICK", 6, "LW"),
    SLOT: route("Slant", "QUICK", 5, "C"),
    RB: route("Swing", "QUICK", -2, "LH"),
  },
  readOrder: ["SLOT2", "Z"],
  protection: fiveManSlide("RIGHT", ["RB"]),
  usage: { weight: 5, downs: [1, 2], maxDistance: 10 },
});

export const QUICK_OUTS = passConcept({
  id: "PASS_QUICK_OUTS",
  name: "Quick Outs",
  formation: F.GUN_DOUBLES_12_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 5.0,
  routes: {
    Z: route("Out", "SHORT", 7, "RW"),
    TE_Y: route("Out", "SHORT", 6, "RW"),
    X: route("Curl", "SHORT", 10, "LW"),
    TE_U: route("Sit", "SHORT", 8, "LH"),
    RB: route("Swing", "QUICK", -1, "RH"),
  },
  readOrder: ["Z", "TE_Y", "X"],
  protection: fiveManSlide("LEFT", ["RB"]),
  usage: { weight: 5, maxDistance: 9 },
});

export const THIRD_SHORT_STICK = passConcept({
  id: "PASS_THIRD_SHORT_STICK",
  name: "Tight Stick",
  formation: F.SINGLEBACK_ACE_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 7.0,
  routes: {
    TE_Y: route("Stick", "SHORT", 5, "RH"),
    Z: route("Slant", "QUICK", 5, "RH"),
    X: route("Slant", "QUICK", 5, "LH"),
    SLOT: route("Flat", "QUICK", 1, "LW"),
  },
  readOrder: ["TE_Y", "Z", "X"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 4, downs: [3, 4], maxDistance: 3 },
});

// --- rhythm and intermediate ------------------------------------------------

export const Y_CROSS = passConcept({
  id: "PASS_Y_CROSS",
  name: "Y-Cross",
  formation: F.GUN_TRIPS_RT,
  readSystem: "FULL_FIELD",
  dropDepthYards: 5.0,
  routes: {
    // The crosser IS the first read and he is sixteen yards away, so against pressure
    // he runs it shallow. A real conversion: new route, new depth, new band, same lane.
    TE_Y: convertsTo(
      route("Deep Cross", "INTERMEDIATE", 16, "LH"),
      hot("Shallow Cross", "QUICK", 4, "LH"),
    ),
    Z: route("Go", "DEEP", 24, "RW"),
    SLOT: route("Curl", "SHORT", 12, "RH"),
    X: route("Comeback", "INTERMEDIATE", 16, "LW"),
  },
  readOrder: ["TE_Y", "Z", "SLOT", "X"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 6, minDistance: 5 },
});

export const MESH = passConcept({
  id: "PASS_MESH",
  name: "Mesh",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 5.0,
  routes: {
    SLOT: route("Shallow Cross", "QUICK", 4, "RH"),
    TE_Y: route("Shallow Cross", "QUICK", 4, "LH"),
    X: route("Corner", "INTERMEDIATE", 18, "LW"),
    Z: route("Dig", "INTERMEDIATE", 14, "RH"),
    RB: route("Swing", "QUICK", -2, "RH"),
  },
  readOrder: ["SLOT", "TE_Y", "RB"],
  protection: fiveManSlide("LEFT", ["RB"]),
  usage: { weight: 6, minDistance: 4 },
});

export const CURL_FLAT = passConcept({
  id: "PASS_CURL_FLAT",
  name: "Curl-Flat",
  formation: F.SINGLEBACK_ACE_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 7.0,
  routes: {
    Z: route("Curl", "INTERMEDIATE", 12, "RW"),
    // "The flat is your hot." He is already running it; what changes is that the
    // quarterback goes there first instead of second. Designation, not conversion.
    TE_Y: alreadyHot(route("Flat", "QUICK", 3, "RW")),
    X: route("Curl", "INTERMEDIATE", 12, "LW"),
    SLOT: route("Dig", "INTERMEDIATE", 14, "C"),
  },
  readOrder: ["Z", "TE_Y", "X"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 7, minDistance: 4 },
});

export const DRIVE = passConcept({
  id: "PASS_DRIVE",
  name: "Drive",
  formation: F.GUN_DOUBLES_12_RT,
  readSystem: "FULL_FIELD",
  dropDepthYards: 5.0,
  routes: {
    TE_U: alreadyHot(route("Drag", "QUICK", 5, "RH")),
    X: route("Dig", "INTERMEDIATE", 15, "C"),
    Z: route("Go", "DEEP", 25, "RW"),
    TE_Y: route("Sit", "SHORT", 9, "RH"),
  },
  readOrder: ["X", "TE_U", "TE_Y", "Z"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 5, minDistance: 5 },
});

export const LEVELS = passConcept({
  id: "PASS_LEVELS",
  name: "Levels",
  formation: F.GUN_TRIPS_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 5.0,
  routes: {
    SLOT: route("Dig", "INTERMEDIATE", 12, "C"),
    TE_Y: alreadyHot(route("Drag", "QUICK", 5, "C")),
    Z: route("Comeback", "INTERMEDIATE", 16, "RW"),
    X: route("Go", "DEEP", 26, "LW"),
    RB: route("Angle", "SHORT", 5, "LH"),
  },
  readOrder: ["SLOT", "TE_Y", "RB"],
  protection: fiveManSlide("RIGHT", ["RB"]),
  usage: { weight: 5, minDistance: 4 },
});

export const FLOOD = passConcept({
  id: "PASS_FLOOD",
  name: "Flood",
  formation: F.I_FORM_PRO_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 7.0,
  routes: {
    Z: route("Go", "DEEP", 24, "RW"),
    TE_Y: route("Out", "INTERMEDIATE", 14, "RW"),
    FB: alreadyHot(route("Flat", "QUICK", 2, "RH")),
    X: route("Deep Cross", "INTERMEDIATE", 16, "C"),
  },
  readOrder: ["TE_Y", "FB", "Z"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 4, minDistance: 5 },
});

export const SMASH = passConcept({
  id: "PASS_SMASH",
  name: "Smash",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 5.0,
  routes: {
    // Smash against pressure is the hitch, and it has been for forty years.
    Z: alreadyHot(route("Hitch", "QUICK", 7, "RW")),
    TE_Y: route("Corner", "INTERMEDIATE", 20, "RW"),
    X: route("Hitch", "QUICK", 7, "LW"),
    SLOT: route("Corner", "INTERMEDIATE", 20, "LW"),
    RB: route("Swing", "QUICK", -1, "RH"),
  },
  readOrder: ["TE_Y", "Z", "RB"],
  protection: fiveManSlide("LEFT", ["RB"]),
  usage: { weight: 5, minDistance: 6 },
});

export const FOLLOW = passConcept({
  id: "PASS_FOLLOW",
  name: "Follow",
  formation: F.SINGLEBACK_TWINS_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 7.0,
  routes: {
    TE_Y: route("Shallow Cross", "QUICK", 4, "LH"),
    TE_U: route("Dig", "INTERMEDIATE", 14, "C"),
    X: route("Go", "DEEP", 22, "LW"),
    Z: route("Curl", "SHORT", 10, "RW"),
  },
  readOrder: ["TE_Y", "TE_U", "Z"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 4, minDistance: 4 },
});

export const SPOT_OPTION = passConcept({
  id: "PASS_SPOT_OPTION",
  name: "Spot Option",
  formation: F.GUN_BUNCH_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 5.0,
  routes: {
    SLOT: optionRoute("Choice", "SHORT", 8, "RH"),
    Z: route("Whip", "QUICK", 5, "RW"),
    TE_Y: route("Wheel", "INTERMEDIATE", 18, "RW"),
    X: route("Post", "DEEP", 25, "LH"),
  },
  readOrder: ["SLOT", "Z", "TE_Y"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 4, minDistance: 4 },
});

export const SPLIT_BACKS_TEXAS = passConcept({
  id: "PASS_SPLIT_BACKS_TEXAS",
  name: "Texas",
  formation: F.GUN_SPLIT_BACKS_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 5.0,
  routes: {
    RB: route("Angle", "SHORT", 5, "C"),
    FB: route("Flat", "QUICK", 2, "RW"),
    X: route("Dig", "INTERMEDIATE", 14, "C"),
    Z: route("Go", "DEEP", 24, "RW"),
    SLOT: route("Curl", "SHORT", 10, "LH"),
  },
  readOrder: ["RB", "FB", "SLOT"],
  protection: fiveManSlide("LEFT", ["FB"]),
  usage: { weight: 3, minDistance: 3 },
});

// --- shot plays -------------------------------------------------------------

export const FOUR_VERTS = passConcept({
  id: "PASS_FOUR_VERTS",
  name: "Four Verticals",
  formation: F.GUN_SPREAD_RT,
  readSystem: "FULL_FIELD",
  dropDepthYards: 5.0,
  routes: {
    X: route("Go", "DEEP", 24, "LW"),
    // Nothing on this card is quick, so somebody has to break off, and it is the
    // inside seams — they are the men running into the space a blitz vacates. Both
    // sit down; each states the band and the lane he sits down in.
    SLOT: convertsTo(route("Seam", "DEEP", 22, "LH"), hot("Sit", "SHORT", 8, "LH")),
    SLOT2: convertsTo(route("Seam", "DEEP", 22, "RH"), hot("Sit", "SHORT", 8, "RH")),
    Z: route("Go", "DEEP", 24, "RW"),
  },
  readOrder: ["SLOT", "SLOT2", "X", "Z"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 4, minDistance: 7 },
});

export const DAGGER = passConcept({
  id: "PASS_DAGGER",
  name: "Dagger",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "FULL_FIELD",
  dropDepthYards: 5.0,
  routes: {
    SLOT: route("Seam", "DEEP", 24, "LH"),
    X: route("Dig", "INTERMEDIATE", 16, "C"),
    Z: route("Comeback", "INTERMEDIATE", 15, "RW"),
    TE_Y: alreadyHot(route("Sit", "SHORT", 8, "RH")),
  },
  readOrder: ["X", "SLOT", "TE_Y", "Z"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 4, minDistance: 7 },
});

export const YANKEE = passConcept({
  id: "PASS_YANKEE",
  name: "Yankee",
  formation: F.SINGLEBACK_TWINS_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 7.0,
  routes: {
    X: route("Post", "DEEP", 30, "C"),
    TE_U: route("Deep Cross", "INTERMEDIATE", 18, "RH"),
    Z: route("Comeback", "INTERMEDIATE", 16, "RW"),
  },
  readOrder: ["X", "TE_U", "Z"],
  protection: sevenManProtection("RB", "LEFT", "TE_Y", "RIGHT"),
  usage: { weight: 2, minDistance: 8 },
});

export const POST_WHEEL = passConcept({
  id: "PASS_POST_WHEEL",
  name: "Post-Wheel",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 5.0,
  routes: {
    TE_Y: route("Post", "DEEP", 26, "C"),
    // The back's wheel and the back's check release are the same decision made twice:
    // if the pressure comes and he is not needed in protection, the wheel becomes the
    // swing. If he IS needed, `pulledIn` takes the route away and this never happens.
    RB: convertsTo(route("Wheel", "INTERMEDIATE", 18, "RW"), hot("Swing", "QUICK", -1, "RH")),
    Z: route("Comeback", "INTERMEDIATE", 15, "RW"),
    X: route("Go", "DEEP", 24, "LW"),
    SLOT: route("Drag", "QUICK", 5, "C"),
  },
  readOrder: ["TE_Y", "RB", "Z"],
  protection: fiveManSlide("LEFT", ["RB"]),
  usage: { weight: 3, minDistance: 6 },
});

export const MILLS = passConcept({
  id: "PASS_MILLS",
  name: "Mills",
  formation: F.GUN_DOUBLES_12_RT,
  readSystem: "FULL_FIELD",
  dropDepthYards: 5.0,
  routes: {
    // Post becomes slant: the canonical sight adjustment, and the one that most
    // obviously needs a new break zone — twenty-eight yards to six is two bands.
    Z: convertsTo(route("Post", "DEEP", 28, "RH"), hot("Slant", "QUICK", 6, "RH")),
    TE_Y: route("Dig", "INTERMEDIATE", 16, "C"),
    X: route("Go", "DEEP", 24, "LW"),
    TE_U: route("Curl", "SHORT", 10, "LH"),
  },
  readOrder: ["TE_Y", "Z", "TE_U", "X"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 3, minDistance: 7 },
});

export const SHOT_POST_CORNER = passConcept({
  id: "PASS_SHOT_POST_CORNER",
  name: "Post-Corner Shot",
  formation: F.I_FORM_PRO_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 7.0,
  routes: {
    Z: route("Post-Corner", "DEEP", 24, "RW"),
    TE_Y: route("Seam", "DEEP", 20, "RH"),
    X: route("Go", "DEEP", 26, "LW"),
  },
  readOrder: ["Z", "TE_Y", "X"],
  protection: sevenManProtection("RB", "LEFT", "FB", "RIGHT"),
  usage: { weight: 2, minDistance: 7 },
});

// --- screens and specials ---------------------------------------------------

/**
 * The receivers run off rather than block, because a `RouteAssignment` is the only
 * thing an eligible man can be given on a dropback — there is no "stalk block" on a
 * pass call, only on a run (`SpaceBlockAssignment`). Clearing coverage out is what
 * they are doing anyway on a slip screen; the honest note is that their blocking is
 * not modelled, so a screen's yardage will be driven by YAC mechanics alone.
 */
export const RB_SLIP_SCREEN = passConcept({
  id: "PASS_RB_SLIP_SCREEN",
  name: "RB Slip Screen",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 5.0,
  routes: {
    RB: route("Screen", "QUICK", -3, "LH"),
    X: route("Go", "DEEP", 20, "LW"),
    Z: route("Go", "DEEP", 20, "RW"),
    SLOT: route("Slant", "QUICK", 5, "C"),
    TE_Y: route("Sit", "SHORT", 8, "RH"),
  },
  readOrder: ["RB", "TE_Y"],
  // NO HOT, on purpose. A screen's answer to pressure is the screen: the rushers who
  // came are the rushers who are not there when the ball is caught. Adding a sight
  // adjustment would be a second answer to a problem the design already solves.
  protection: fiveManSlide("LEFT", ["TE_Y"]),
  usage: { weight: 3, minDistance: 5 },
});

export const HEAVY_RED_ZONE = passConcept({
  id: "PASS_HEAVY_RED_ZONE",
  name: "Heavy Fade-Flat",
  formation: F.SINGLEBACK_HEAVY_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 7.0,
  routes: {
    TE_H: route("Fade", "INTERMEDIATE", 14, "RW"),
    TE_Y: alreadyHot(route("Flat", "QUICK", 3, "RW")),
    X: route("Slant", "QUICK", 6, "LH"),
    RB: route("Angle", "QUICK", 3, "LH"),
  },
  readOrder: ["TE_H", "TE_Y", "X"],
  protection: sixManProtection("TE_U", "LEFT", ["RB"]),
  usage: { weight: 2, regions: ["RED_ZONE", "GOAL_LINE"] },
});

export const RED_ZONE_RUB = passConcept({
  id: "PASS_RED_ZONE_RUB",
  name: "Bunch Rub",
  formation: F.GUN_BUNCH_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 5.0,
  routes: {
    Z: route("Fade", "INTERMEDIATE", 12, "RW"),
    TE_Y: alreadyHot(route("Flat", "QUICK", 2, "RW")),
    SLOT: route("Slant", "QUICK", 5, "C"),
    X: route("Slant", "QUICK", 5, "LH"),
  },
  readOrder: ["Z", "TE_Y", "SLOT"],
  protection: sixManProtection("RB", "LEFT"),
  usage: { weight: 3, regions: ["RED_ZONE", "GOAL_LINE"] },
});

/**
 * EMPTY IS WHERE THE HOT ROUTE STOPS BEING OPTIONAL, and these two cards are the
 * reason ADR-022 petition 2 was not optional either.
 *
 * There is no sixth blocker in empty personnel — five linemen protect, nobody is in
 * the backfield to check-release, and a six-man pressure therefore has one man the
 * offence cannot block by any arrangement of bodies. **That is football, not a gap in
 * the corpus.** Until ADR-022 these cards could not say the thing every real offence
 * says about them, so playbook refused the front instead: they threw
 * `UnprotectableCallError` against a six-man pressure and the caller re-drew a concept.
 * That refusal was `CALIBRATION-BACKLOG.md` entry 21 in miniature — a corpus that
 * declines every front it cannot answer perfectly reports pressure rates biased down.
 *
 * They now state the answer. The free rusher comes, `unblocked` names him, and whether
 * the hot beats him is §5.3's recognition roll rather than a property of the card.
 * `validate.ts` makes it structural: a concept that cannot block six and states no hot
 * is `C_NO_ANSWER_TO_PRESSURE`, an error.
 */
export const EMPTY_QUICK = passConcept({
  id: "PASS_EMPTY_QUICK",
  name: "Empty Stick",
  formation: F.GUN_EMPTY_RT,
  readSystem: "CONCEPT",
  dropDepthYards: 5.0,
  routes: {
    SLOT: route("Stick", "SHORT", 7, "RH"),
    // The answer is to the RIGHT, so the line slides LEFT and covers the half he is
    // not in. Two statements about the same free rusher, made from opposite ends.
    SLOT3: alreadyHot(route("Flat", "QUICK", 2, "RW")),
    Z: route("Go", "DEEP", 22, "RW"),
    X: route("Slant", "QUICK", 6, "LH"),
    SLOT2: route("Curl", "SHORT", 11, "LH"),
  },
  readOrder: ["SLOT", "SLOT3", "SLOT2"],
  protection: fiveManSlide("LEFT", []),
  usage: { weight: 2, downs: [3, 4], minDistance: 4 },
});

export const EMPTY_VERTS = passConcept({
  id: "PASS_EMPTY_VERTS",
  name: "Empty Verticals",
  formation: F.GUN_EMPTY_RT,
  readSystem: "FULL_FIELD",
  dropDepthYards: 5.0,
  routes: {
    X: route("Go", "DEEP", 24, "LW"),
    // Five men running vertically and one rusher nobody blocked. The backside seam
    // converts, which is both the answer and the reason the line slides the other way.
    SLOT2: convertsTo(route("Seam", "DEEP", 20, "LH"), hot("Slant", "QUICK", 6, "C")),
    Z: route("Go", "DEEP", 24, "RW"),
    SLOT: route("Seam", "DEEP", 20, "RH"),
    SLOT3: route("Sit", "SHORT", 9, "C"),
  },
  readOrder: ["SLOT2", "SLOT", "X", "Z", "SLOT3"],
  protection: fiveManSlide("RIGHT", []),
  usage: { weight: 1, minDistance: 8 },
});

export const TWO_MINUTE_SAIL = passConcept({
  id: "PASS_TWO_MINUTE_SAIL",
  name: "Two-Minute Sail",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "HALF_FIELD",
  dropDepthYards: 5.0,
  routes: {
    Z: route("Comeback", "INTERMEDIATE", 16, "RW"),
    // Same route, shorter. A twelve-yard out against pressure is a sack; a six-yard
    // out is a first down and the clock stops. Different band, so it says so.
    TE_Y: convertsTo(route("Out", "INTERMEDIATE", 12, "RW"), hot("Out", "SHORT", 6, "RW")),
    X: route("Comeback", "INTERMEDIATE", 16, "LW"),
    SLOT: route("Out", "SHORT", 8, "LW"),
    RB: route("Swing", "QUICK", -1, "RH"),
  },
  readOrder: ["Z", "TE_Y", "X"],
  protection: fiveManSlide("LEFT", ["RB"]),
  usage: { weight: 3, twoMinuteOnly: true },
});

export const PASS_CONCEPTS: readonly PassConcept[] = [
  SLANT_FLAT,
  STICK,
  SNAG,
  BUBBLE_NOW,
  QUICK_OUTS,
  THIRD_SHORT_STICK,
  Y_CROSS,
  MESH,
  CURL_FLAT,
  DRIVE,
  LEVELS,
  FLOOD,
  SMASH,
  FOLLOW,
  SPOT_OPTION,
  SPLIT_BACKS_TEXAS,
  FOUR_VERTS,
  DAGGER,
  YANKEE,
  POST_WHEEL,
  MILLS,
  SHOT_POST_CORNER,
  RB_SLIP_SCREEN,
  HEAVY_RED_ZONE,
  RED_ZONE_RUB,
  EMPTY_QUICK,
  EMPTY_VERTS,
  TWO_MINUTE_SAIL,
];
