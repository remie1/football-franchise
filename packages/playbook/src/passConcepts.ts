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
 */
import type { ReadSystem } from "@ff/contracts";
import * as F from "./formations.js";
import type { AnyFormation } from "./formations.js";
import type { ProtectionScheme } from "./protection.js";
import { fiveManLine, sevenManProtection, sixManProtection } from "./protection.js";
import type { OffenseSkillRole, SkillRoleOf } from "./roles.js";
import type { RouteSpec } from "./routes.js";
import { optionRoute, route } from "./routes.js";
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

/** How many rushers this card can account for before somebody comes free. */
export function protectionCapacity(concept: PassConcept): number {
  return concept.protection.protectors.length + concept.protection.checkRelease.length;
}

// --- quick game -------------------------------------------------------------

export const SLANT_FLAT = passConcept({
  id: "PASS_SLANT_FLAT",
  name: "Slant-Flat",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "HALF_FIELD",
  routes: {
    X: route("Hitch", "QUICK", 7, "LW"),
    SLOT: route("Slant", "QUICK", 6, "C"),
    Z: route("Slant", "QUICK", 6, "RH"),
    TE_Y: route("Flat", "QUICK", 2, "RW"),
    RB: route("Swing", "QUICK", 0, "RH"),
  },
  readOrder: ["Z", "TE_Y", "RB"],
  protection: fiveManLine(["RB"]),
  usage: { weight: 9, maxDistance: 8 },
});

export const STICK = passConcept({
  id: "PASS_STICK",
  name: "Stick",
  formation: F.GUN_TRIPS_RT,
  readSystem: "CONCEPT",
  routes: {
    SLOT: route("Stick", "SHORT", 6, "RH"),
    TE_Y: route("Flat", "QUICK", 2, "RW"),
    Z: route("Go", "DEEP", 22, "RW"),
    X: route("Slant", "QUICK", 6, "LH"),
    RB: route("Angle", "QUICK", 4, "LH"),
  },
  readOrder: ["SLOT", "TE_Y", "RB"],
  protection: fiveManLine(["RB"]),
  usage: { weight: 8, maxDistance: 9 },
});

export const SNAG = passConcept({
  id: "PASS_SNAG",
  name: "Snag",
  formation: F.GUN_BUNCH_RT,
  readSystem: "CONCEPT",
  routes: {
    Z: route("Spot", "QUICK", 6, "RH"),
    SLOT: route("Corner", "INTERMEDIATE", 18, "RW"),
    TE_Y: route("Flat", "QUICK", 3, "RW"),
    X: route("Go", "DEEP", 24, "LW"),
  },
  readOrder: ["Z", "SLOT", "TE_Y"],
  protection: sixManProtection("RB"),
  usage: { weight: 6, maxDistance: 10 },
});

export const BUBBLE_NOW = passConcept({
  id: "PASS_BUBBLE_NOW",
  name: "Bubble Now",
  formation: F.GUN_SPREAD_RT,
  readSystem: "CONCEPT",
  routes: {
    SLOT2: route("Bubble", "QUICK", -1, "RW"),
    Z: route("Hitch", "QUICK", 5, "RW"),
    X: route("Hitch", "QUICK", 6, "LW"),
    SLOT: route("Slant", "QUICK", 5, "C"),
    RB: route("Swing", "QUICK", 0, "LH"),
  },
  readOrder: ["SLOT2", "Z"],
  protection: fiveManLine(["RB"]),
  usage: { weight: 5, downs: [1, 2], maxDistance: 10 },
});

export const QUICK_OUTS = passConcept({
  id: "PASS_QUICK_OUTS",
  name: "Quick Outs",
  formation: F.GUN_DOUBLES_12_RT,
  readSystem: "HALF_FIELD",
  routes: {
    Z: route("Out", "SHORT", 7, "RW"),
    TE_Y: route("Out", "SHORT", 6, "RW"),
    X: route("Curl", "SHORT", 10, "LW"),
    TE_U: route("Sit", "SHORT", 8, "LH"),
    RB: route("Flat", "QUICK", 1, "RH"),
  },
  readOrder: ["Z", "TE_Y", "X"],
  protection: fiveManLine(["RB"]),
  usage: { weight: 5, maxDistance: 9 },
});

export const THIRD_SHORT_STICK = passConcept({
  id: "PASS_THIRD_SHORT_STICK",
  name: "Tight Stick",
  formation: F.SINGLEBACK_ACE_RT,
  readSystem: "CONCEPT",
  routes: {
    TE_Y: route("Stick", "SHORT", 5, "RH"),
    Z: route("Slant", "QUICK", 5, "RH"),
    X: route("Slant", "QUICK", 5, "LH"),
    SLOT: route("Flat", "QUICK", 1, "LW"),
  },
  readOrder: ["TE_Y", "Z", "X"],
  protection: sixManProtection("RB"),
  usage: { weight: 4, downs: [3, 4], maxDistance: 3 },
});

// --- rhythm and intermediate ------------------------------------------------

export const Y_CROSS = passConcept({
  id: "PASS_Y_CROSS",
  name: "Y-Cross",
  formation: F.GUN_TRIPS_RT,
  readSystem: "FULL_FIELD",
  routes: {
    TE_Y: route("Deep Cross", "INTERMEDIATE", 16, "LH"),
    Z: route("Go", "DEEP", 24, "RW"),
    SLOT: route("Curl", "SHORT", 12, "RH"),
    X: route("Comeback", "INTERMEDIATE", 16, "LW"),
  },
  readOrder: ["TE_Y", "Z", "SLOT", "X"],
  protection: sixManProtection("RB"),
  usage: { weight: 6, minDistance: 5 },
});

export const MESH = passConcept({
  id: "PASS_MESH",
  name: "Mesh",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "CONCEPT",
  routes: {
    SLOT: route("Shallow Cross", "QUICK", 4, "RH"),
    TE_Y: route("Shallow Cross", "QUICK", 4, "LH"),
    X: route("Corner", "INTERMEDIATE", 18, "LW"),
    Z: route("Dig", "INTERMEDIATE", 14, "RH"),
    RB: route("Swing", "QUICK", 0, "RH"),
  },
  readOrder: ["SLOT", "TE_Y", "RB"],
  protection: fiveManLine(["RB"]),
  usage: { weight: 6, minDistance: 4 },
});

export const CURL_FLAT = passConcept({
  id: "PASS_CURL_FLAT",
  name: "Curl-Flat",
  formation: F.SINGLEBACK_ACE_RT,
  readSystem: "HALF_FIELD",
  routes: {
    Z: route("Curl", "INTERMEDIATE", 12, "RW"),
    TE_Y: route("Flat", "QUICK", 3, "RW"),
    X: route("Curl", "INTERMEDIATE", 12, "LW"),
    SLOT: route("Dig", "INTERMEDIATE", 14, "C"),
  },
  readOrder: ["Z", "TE_Y", "X"],
  protection: sixManProtection("RB"),
  usage: { weight: 7, minDistance: 4 },
});

export const DRIVE = passConcept({
  id: "PASS_DRIVE",
  name: "Drive",
  formation: F.GUN_DOUBLES_12_RT,
  readSystem: "FULL_FIELD",
  routes: {
    TE_U: route("Drag", "QUICK", 5, "RH"),
    X: route("Dig", "INTERMEDIATE", 15, "C"),
    Z: route("Go", "DEEP", 25, "RW"),
    TE_Y: route("Sit", "SHORT", 9, "RH"),
  },
  readOrder: ["X", "TE_U", "TE_Y", "Z"],
  protection: sixManProtection("RB"),
  usage: { weight: 5, minDistance: 5 },
});

export const LEVELS = passConcept({
  id: "PASS_LEVELS",
  name: "Levels",
  formation: F.GUN_TRIPS_RT,
  readSystem: "HALF_FIELD",
  routes: {
    SLOT: route("Dig", "INTERMEDIATE", 12, "C"),
    TE_Y: route("Drag", "QUICK", 5, "C"),
    Z: route("Comeback", "INTERMEDIATE", 16, "RW"),
    X: route("Go", "DEEP", 26, "LW"),
    RB: route("Angle", "SHORT", 5, "LH"),
  },
  readOrder: ["SLOT", "TE_Y", "RB"],
  protection: fiveManLine(["RB"]),
  usage: { weight: 5, minDistance: 4 },
});

export const FLOOD = passConcept({
  id: "PASS_FLOOD",
  name: "Flood",
  formation: F.I_FORM_PRO_RT,
  readSystem: "HALF_FIELD",
  routes: {
    Z: route("Go", "DEEP", 24, "RW"),
    TE_Y: route("Out", "INTERMEDIATE", 14, "RW"),
    FB: route("Flat", "QUICK", 2, "RH"),
    X: route("Deep Cross", "INTERMEDIATE", 16, "C"),
  },
  readOrder: ["TE_Y", "FB", "Z"],
  protection: sixManProtection("RB"),
  usage: { weight: 4, minDistance: 5 },
});

export const SMASH = passConcept({
  id: "PASS_SMASH",
  name: "Smash",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "HALF_FIELD",
  routes: {
    Z: route("Hitch", "QUICK", 7, "RW"),
    TE_Y: route("Corner", "INTERMEDIATE", 20, "RW"),
    X: route("Hitch", "QUICK", 7, "LW"),
    SLOT: route("Corner", "INTERMEDIATE", 20, "LW"),
    RB: route("Flat", "QUICK", 1, "RH"),
  },
  readOrder: ["TE_Y", "Z", "RB"],
  protection: fiveManLine(["RB"]),
  usage: { weight: 5, minDistance: 6 },
});

export const FOLLOW = passConcept({
  id: "PASS_FOLLOW",
  name: "Follow",
  formation: F.SINGLEBACK_TWINS_RT,
  readSystem: "HALF_FIELD",
  routes: {
    TE_Y: route("Shallow Cross", "QUICK", 4, "LH"),
    TE_U: route("Dig", "INTERMEDIATE", 14, "C"),
    X: route("Go", "DEEP", 22, "LW"),
    Z: route("Curl", "SHORT", 10, "RW"),
  },
  readOrder: ["TE_Y", "TE_U", "Z"],
  protection: sixManProtection("RB"),
  usage: { weight: 4, minDistance: 4 },
});

export const SPOT_OPTION = passConcept({
  id: "PASS_SPOT_OPTION",
  name: "Spot Option",
  formation: F.GUN_BUNCH_RT,
  readSystem: "CONCEPT",
  routes: {
    SLOT: optionRoute("Choice", "SHORT", 8, "RH"),
    Z: route("Whip", "QUICK", 5, "RW"),
    TE_Y: route("Wheel", "INTERMEDIATE", 18, "RW"),
    X: route("Post", "DEEP", 25, "LH"),
  },
  readOrder: ["SLOT", "Z", "TE_Y"],
  protection: sixManProtection("RB"),
  usage: { weight: 4, minDistance: 4 },
});

export const SPLIT_BACKS_TEXAS = passConcept({
  id: "PASS_SPLIT_BACKS_TEXAS",
  name: "Texas",
  formation: F.GUN_SPLIT_BACKS_RT,
  readSystem: "HALF_FIELD",
  routes: {
    RB: route("Angle", "SHORT", 5, "C"),
    FB: route("Flat", "QUICK", 2, "RW"),
    X: route("Dig", "INTERMEDIATE", 14, "C"),
    Z: route("Go", "DEEP", 24, "RW"),
    SLOT: route("Curl", "SHORT", 10, "LH"),
  },
  readOrder: ["RB", "FB", "SLOT"],
  protection: fiveManLine(["FB"]),
  usage: { weight: 3, minDistance: 3 },
});

// --- shot plays -------------------------------------------------------------

export const FOUR_VERTS = passConcept({
  id: "PASS_FOUR_VERTS",
  name: "Four Verticals",
  formation: F.GUN_SPREAD_RT,
  readSystem: "FULL_FIELD",
  routes: {
    X: route("Go", "DEEP", 24, "LW"),
    SLOT: route("Seam", "DEEP", 22, "LH"),
    SLOT2: route("Seam", "DEEP", 22, "RH"),
    Z: route("Go", "DEEP", 24, "RW"),
  },
  readOrder: ["SLOT", "SLOT2", "X", "Z"],
  protection: sixManProtection("RB"),
  usage: { weight: 4, minDistance: 7 },
});

export const DAGGER = passConcept({
  id: "PASS_DAGGER",
  name: "Dagger",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "FULL_FIELD",
  routes: {
    SLOT: route("Seam", "DEEP", 24, "LH"),
    X: route("Dig", "INTERMEDIATE", 16, "C"),
    Z: route("Comeback", "INTERMEDIATE", 15, "RW"),
    TE_Y: route("Sit", "SHORT", 8, "RH"),
  },
  readOrder: ["X", "SLOT", "TE_Y", "Z"],
  protection: sixManProtection("RB"),
  usage: { weight: 4, minDistance: 7 },
});

export const YANKEE = passConcept({
  id: "PASS_YANKEE",
  name: "Yankee",
  formation: F.SINGLEBACK_TWINS_RT,
  readSystem: "HALF_FIELD",
  routes: {
    X: route("Post", "DEEP", 30, "C"),
    TE_U: route("Deep Cross", "INTERMEDIATE", 18, "RH"),
    Z: route("Comeback", "INTERMEDIATE", 16, "RW"),
  },
  readOrder: ["X", "TE_U", "Z"],
  protection: sevenManProtection("RB", "TE_Y"),
  usage: { weight: 2, minDistance: 8 },
});

export const POST_WHEEL = passConcept({
  id: "PASS_POST_WHEEL",
  name: "Post-Wheel",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "HALF_FIELD",
  routes: {
    TE_Y: route("Post", "DEEP", 26, "C"),
    RB: route("Wheel", "INTERMEDIATE", 18, "RW"),
    Z: route("Comeback", "INTERMEDIATE", 15, "RW"),
    X: route("Go", "DEEP", 24, "LW"),
    SLOT: route("Drag", "QUICK", 5, "C"),
  },
  readOrder: ["TE_Y", "RB", "Z"],
  protection: fiveManLine(["RB"]),
  usage: { weight: 3, minDistance: 6 },
});

export const MILLS = passConcept({
  id: "PASS_MILLS",
  name: "Mills",
  formation: F.GUN_DOUBLES_12_RT,
  readSystem: "FULL_FIELD",
  routes: {
    Z: route("Post", "DEEP", 28, "RH"),
    TE_Y: route("Dig", "INTERMEDIATE", 16, "C"),
    X: route("Go", "DEEP", 24, "LW"),
    TE_U: route("Curl", "SHORT", 10, "LH"),
  },
  readOrder: ["TE_Y", "Z", "TE_U", "X"],
  protection: sixManProtection("RB"),
  usage: { weight: 3, minDistance: 7 },
});

export const SHOT_POST_CORNER = passConcept({
  id: "PASS_SHOT_POST_CORNER",
  name: "Post-Corner Shot",
  formation: F.I_FORM_PRO_RT,
  readSystem: "HALF_FIELD",
  routes: {
    Z: route("Post-Corner", "DEEP", 24, "RW"),
    TE_Y: route("Seam", "DEEP", 20, "RH"),
    X: route("Go", "DEEP", 26, "LW"),
  },
  readOrder: ["Z", "TE_Y", "X"],
  protection: sevenManProtection("RB", "FB"),
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
  routes: {
    RB: route("Screen", "QUICK", -3, "LH"),
    X: route("Go", "DEEP", 20, "LW"),
    Z: route("Go", "DEEP", 20, "RW"),
    SLOT: route("Slant", "QUICK", 5, "C"),
    TE_Y: route("Sit", "SHORT", 8, "RH"),
  },
  readOrder: ["RB", "TE_Y"],
  protection: fiveManLine(["TE_Y"]),
  usage: { weight: 3, minDistance: 5 },
});

export const HEAVY_RED_ZONE = passConcept({
  id: "PASS_HEAVY_RED_ZONE",
  name: "Heavy Fade-Flat",
  formation: F.SINGLEBACK_HEAVY_RT,
  readSystem: "HALF_FIELD",
  routes: {
    TE_H: route("Fade", "INTERMEDIATE", 14, "RW"),
    TE_Y: route("Flat", "QUICK", 3, "RW"),
    X: route("Slant", "QUICK", 6, "LH"),
    RB: route("Angle", "QUICK", 3, "LH"),
  },
  readOrder: ["TE_H", "TE_Y", "X"],
  protection: sixManProtection("TE_U", ["RB"]),
  usage: { weight: 2, regions: ["RED_ZONE", "GOAL_LINE"] },
});

export const RED_ZONE_RUB = passConcept({
  id: "PASS_RED_ZONE_RUB",
  name: "Bunch Rub",
  formation: F.GUN_BUNCH_RT,
  readSystem: "CONCEPT",
  routes: {
    Z: route("Fade", "INTERMEDIATE", 12, "RW"),
    TE_Y: route("Flat", "QUICK", 2, "RW"),
    SLOT: route("Slant", "QUICK", 5, "C"),
    X: route("Slant", "QUICK", 5, "LH"),
  },
  readOrder: ["Z", "TE_Y", "SLOT"],
  protection: sixManProtection("RB"),
  usage: { weight: 3, regions: ["RED_ZONE", "GOAL_LINE"] },
});

/**
 * EMPTY IS THE ONE PLACE THE CORPUS CANNOT COVER ITSELF, and that is football
 * rather than an oversight. There is no sixth blocker in empty personnel: five
 * linemen protect and the answer to a sixth rusher is a hot route, which the
 * contracts vocabulary cannot express. So these two cards throw
 * `UnprotectableCallError` against a six-man pressure, loudly, at the call site.
 * `test/instantiate.test.ts` asserts exactly that rather than papering over it.
 */
export const EMPTY_QUICK = passConcept({
  id: "PASS_EMPTY_QUICK",
  name: "Empty Stick",
  formation: F.GUN_EMPTY_RT,
  readSystem: "CONCEPT",
  routes: {
    SLOT: route("Stick", "SHORT", 7, "RH"),
    SLOT3: route("Flat", "QUICK", 2, "RW"),
    Z: route("Go", "DEEP", 22, "RW"),
    X: route("Slant", "QUICK", 6, "LH"),
    SLOT2: route("Curl", "SHORT", 11, "LH"),
  },
  readOrder: ["SLOT", "SLOT3", "SLOT2"],
  protection: fiveManLine([]),
  usage: { weight: 2, downs: [3, 4], minDistance: 4 },
});

export const EMPTY_VERTS = passConcept({
  id: "PASS_EMPTY_VERTS",
  name: "Empty Verticals",
  formation: F.GUN_EMPTY_RT,
  readSystem: "FULL_FIELD",
  routes: {
    X: route("Go", "DEEP", 24, "LW"),
    SLOT2: route("Seam", "DEEP", 20, "LH"),
    Z: route("Go", "DEEP", 24, "RW"),
    SLOT: route("Seam", "DEEP", 20, "RH"),
    SLOT3: route("Sit", "SHORT", 9, "C"),
  },
  readOrder: ["SLOT2", "SLOT", "X", "Z", "SLOT3"],
  protection: fiveManLine([]),
  usage: { weight: 1, minDistance: 8 },
});

export const TWO_MINUTE_SAIL = passConcept({
  id: "PASS_TWO_MINUTE_SAIL",
  name: "Two-Minute Sail",
  formation: F.GUN_DOUBLES_RT,
  readSystem: "HALF_FIELD",
  routes: {
    Z: route("Comeback", "INTERMEDIATE", 16, "RW"),
    TE_Y: route("Out", "INTERMEDIATE", 12, "RW"),
    X: route("Comeback", "INTERMEDIATE", 16, "LW"),
    SLOT: route("Out", "SHORT", 8, "LW"),
    RB: route("Flat", "QUICK", 1, "RH"),
  },
  readOrder: ["Z", "TE_Y", "X"],
  protection: fiveManLine(["RB"]),
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
