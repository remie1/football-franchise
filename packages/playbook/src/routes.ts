/**
 * ROUTES — and the field this package exists to make mandatory.
 *
 * `RouteAssignment.breakZone` is OPTIONAL in contracts, and the comment there says
 * exactly why: the vertical half is derivable from `airYards` against §3.2's bands,
 * the horizontal half is derivable from nothing, and an omitted `breakZone` falls
 * back to a default lane — which puts every silent route in the same zone and is
 * `CALIBRATION-BACKLOG.md` entry 8.
 *
 * **In this package it is required.** `RouteSpec.breakZone` is not optional, so a
 * route without horizontal placement does not compile. That is the closure of entry
 * 8 stated as a type rather than as a review comment.
 *
 * `breakAt()` derives the vertical half from air yards so an author only ever
 * chooses the half that is a real decision. Every route in the corpus is built with
 * it, which is why `routeVerticalMatchesAirYards` can never fire on the shipped
 * cards — it exists for cards that arrive from JSON or from a UI authoring surface
 * later, where nothing enforces the constructor.
 *
 * **THE SAME RULE APPLIES TO A HOT CONVERSION, AND THAT IS NOT NEGOTIABLE.** ADR-022
 * gave `RouteAssignment` a `hot?: HotRouteSpec` whose `breakZone` is optional with
 * "omitted ⇒ keep the original". A converted route does not keep the original — that
 * is what converting means — so in this package `HotSpec.breakZone` is required and
 * `hot()` derives its band the same way `route()` does. The entry-8 invariant does
 * not weaken because a second route type arrived; it now covers two.
 */
import type { FieldZone, HorizontalZone, RouteDepthClass, VerticalZone } from "@ff/contracts";

/**
 * A closed union, so a typo is a compile error and the tendency model can group by
 * route without a string table that silently gains a "Slannt".
 */
export type RouteName =
  | "Go"
  | "Fade"
  | "Seam"
  | "Post"
  | "Corner"
  | "Post-Corner"
  | "Sluggo"
  | "Deep Cross"
  | "Dig"
  | "Curl"
  | "Comeback"
  | "Out"
  | "Slant"
  | "Hitch"
  | "Stick"
  | "Spot"
  | "Sit"
  | "Choice"
  | "Whip"
  | "Pivot"
  | "Drag"
  | "Shallow Cross"
  | "Flat"
  | "Arrow"
  | "Angle"
  | "Swing"
  | "Wheel"
  | "Bubble"
  | "Screen";

/**
 * Which way a route may move horizontally from where the man aligned.
 *
 * This is the check that stops a corpus stating horizontal placement and getting it
 * wrong: an Out route that finishes two lanes INSIDE its release point is not an
 * out, and a card that says so would feed the zone model a placement that looks
 * authoritative and is fiction — entry 8's failure mode wearing a break zone.
 */
export type LateralDirection = "IN" | "OUT" | "EITHER" | "NONE";

export interface RouteEnvelope {
  readonly depthClasses: readonly RouteDepthClass[];
  readonly minAirYards: number;
  readonly maxAirYards: number;
  /** Lanes of the §3.1 grid the route may cross. 0 means it finishes in its own lane. */
  readonly maxLaneTravel: number;
  readonly lateral: LateralDirection;
}

/**
 * WHERE THESE NUMBERS COME FROM. Route depths are the conventional coaching
 * definitions (a dig breaks at 12-15, a comeback at 14-18, a slant at 3 and is
 * caught at 5-8). The ranges are widened at both ends relative to the coaching
 * number because `airYards` here is the CATCH point, not the break point, and
 * because real route depths vary by down and by coordinator. They are wide enough
 * to admit anything a real playbook would draw and narrow enough that a
 * transposed digit does not pass.
 */
export const ROUTE_ENVELOPES: Readonly<Record<RouteName, RouteEnvelope>> = {
  Go: { depthClasses: ["DEEP"], minAirYards: 18, maxAirYards: 45, maxLaneTravel: 0, lateral: "NONE" },
  Fade: { depthClasses: ["INTERMEDIATE", "DEEP"], minAirYards: 12, maxAirYards: 35, maxLaneTravel: 1, lateral: "OUT" },
  Seam: { depthClasses: ["INTERMEDIATE", "DEEP"], minAirYards: 12, maxAirYards: 35, maxLaneTravel: 1, lateral: "EITHER" },
  Post: { depthClasses: ["INTERMEDIATE", "DEEP"], minAirYards: 14, maxAirYards: 42, maxLaneTravel: 2, lateral: "IN" },
  Corner: { depthClasses: ["INTERMEDIATE", "DEEP"], minAirYards: 12, maxAirYards: 32, maxLaneTravel: 1, lateral: "OUT" },
  "Post-Corner": { depthClasses: ["DEEP"], minAirYards: 18, maxAirYards: 35, maxLaneTravel: 1, lateral: "OUT" },
  Sluggo: { depthClasses: ["DEEP"], minAirYards: 16, maxAirYards: 35, maxLaneTravel: 1, lateral: "EITHER" },
  "Deep Cross": { depthClasses: ["INTERMEDIATE", "DEEP"], minAirYards: 14, maxAirYards: 30, maxLaneTravel: 3, lateral: "EITHER" },
  Dig: { depthClasses: ["INTERMEDIATE"], minAirYards: 10, maxAirYards: 20, maxLaneTravel: 2, lateral: "IN" },
  Curl: { depthClasses: ["SHORT", "INTERMEDIATE"], minAirYards: 8, maxAirYards: 16, maxLaneTravel: 1, lateral: "IN" },
  Comeback: { depthClasses: ["INTERMEDIATE", "DEEP"], minAirYards: 12, maxAirYards: 20, maxLaneTravel: 1, lateral: "OUT" },
  Out: { depthClasses: ["SHORT", "INTERMEDIATE"], minAirYards: 5, maxAirYards: 18, maxLaneTravel: 1, lateral: "OUT" },
  Slant: { depthClasses: ["QUICK", "SHORT"], minAirYards: 3, maxAirYards: 9, maxLaneTravel: 2, lateral: "IN" },
  Hitch: { depthClasses: ["QUICK", "SHORT"], minAirYards: 4, maxAirYards: 9, maxLaneTravel: 0, lateral: "NONE" },
  Stick: { depthClasses: ["QUICK", "SHORT"], minAirYards: 5, maxAirYards: 9, maxLaneTravel: 1, lateral: "EITHER" },
  Spot: { depthClasses: ["QUICK", "SHORT"], minAirYards: 4, maxAirYards: 9, maxLaneTravel: 1, lateral: "IN" },
  Sit: { depthClasses: ["SHORT", "INTERMEDIATE"], minAirYards: 6, maxAirYards: 16, maxLaneTravel: 1, lateral: "EITHER" },
  Choice: { depthClasses: ["SHORT", "INTERMEDIATE"], minAirYards: 5, maxAirYards: 14, maxLaneTravel: 2, lateral: "EITHER" },
  Whip: { depthClasses: ["QUICK", "SHORT"], minAirYards: 3, maxAirYards: 9, maxLaneTravel: 1, lateral: "OUT" },
  Pivot: { depthClasses: ["QUICK", "SHORT"], minAirYards: 3, maxAirYards: 9, maxLaneTravel: 1, lateral: "EITHER" },
  Drag: { depthClasses: ["QUICK", "SHORT"], minAirYards: 3, maxAirYards: 10, maxLaneTravel: 3, lateral: "EITHER" },
  "Shallow Cross": { depthClasses: ["QUICK", "SHORT"], minAirYards: 2, maxAirYards: 8, maxLaneTravel: 4, lateral: "EITHER" },
  Flat: { depthClasses: ["QUICK"], minAirYards: 0, maxAirYards: 6, maxLaneTravel: 2, lateral: "OUT" },
  Arrow: { depthClasses: ["QUICK", "SHORT"], minAirYards: 2, maxAirYards: 8, maxLaneTravel: 2, lateral: "OUT" },
  Angle: { depthClasses: ["QUICK", "SHORT"], minAirYards: 2, maxAirYards: 8, maxLaneTravel: 1, lateral: "IN" },
  Swing: { depthClasses: ["QUICK"], minAirYards: -3, maxAirYards: 3, maxLaneTravel: 2, lateral: "OUT" },
  Wheel: { depthClasses: ["INTERMEDIATE", "DEEP"], minAirYards: 12, maxAirYards: 30, maxLaneTravel: 2, lateral: "OUT" },
  Bubble: { depthClasses: ["QUICK"], minAirYards: -3, maxAirYards: 2, maxLaneTravel: 2, lateral: "OUT" },
  Screen: { depthClasses: ["QUICK"], minAirYards: -6, maxAirYards: 1, maxLaneTravel: 2, lateral: "EITHER" },
};

export const ROUTE_NAMES: readonly RouteName[] = Object.keys(ROUTE_ENVELOPES) as RouteName[];

/**
 * §9.2's development-time classes against the air yards that produce them, widened
 * at the seams on purpose: the class is a TIMING property (when the route declares)
 * and `airYards` is a SPATIAL one (where the ball is caught). A slant declares at
 * three yards and is caught at seven; both facts are true and the classes overlap.
 * The bands reject the incoherent case — a DEEP-classed four-yard route — not the
 * ambiguous one.
 */
export const DEPTH_CLASS_AIR_YARDS: Readonly<
  Record<RouteDepthClass, { readonly min: number; readonly max: number }>
> = {
  QUICK: { min: -6, max: 8 },
  SHORT: { min: 4, max: 13 },
  INTERMEDIATE: { min: 9, max: 22 },
  DEEP: { min: 16, max: 60 },
};

/**
 * §3.2's depth bands, as inclusive upper bounds in air yards. Identical to
 * `TUNABLES.zoneModel.verticalUpperYards`, which is the engine's copy of the same
 * doc table — DUPLICATED RATHER THAN IMPORTED because playbook may not import the
 * engine (ADR-017 §Decision 3), and a test asserts the two agree by pinning the
 * doc's numbers here. If the engine ever retunes these, `verticalZoneForAirYards`
 * disagrees and every card's stated break zone quietly moves one band: that is a
 * contract petition, not a silent drift, and it is written down here so the next
 * person finds it.
 */
export const VERTICAL_UPPER_YARDS: Readonly<Record<"BACKFIELD" | "SHORT" | "INTERMEDIATE" | "DEEP", number>> = {
  BACKFIELD: 0,
  SHORT: 10,
  INTERMEDIATE: 20,
  DEEP: 35,
};

export function verticalZoneForAirYards(airYards: number): VerticalZone {
  if (airYards <= VERTICAL_UPPER_YARDS.BACKFIELD) return "BACKFIELD";
  if (airYards <= VERTICAL_UPPER_YARDS.SHORT) return "SHORT";
  if (airYards <= VERTICAL_UPPER_YARDS.INTERMEDIATE) return "INTERMEDIATE";
  if (airYards <= VERTICAL_UPPER_YARDS.DEEP) return "DEEP";
  return "VERY_DEEP";
}

/**
 * A route as a card states it. Note `breakZone` — required, where contracts has it
 * optional. This type is the corpus's promise about entry 8.
 */
export interface RouteSpec {
  readonly routeName: RouteName;
  readonly depthClass: RouteDepthClass;
  readonly airYards: number;
  readonly breakZone: FieldZone;
  /** §9.5 — the receiver reads coverage and picks. Presentation and future mechanic. */
  readonly option?: true;
  /** What he runs instead when the offence answers pressure (ADR-022 petition 2). */
  readonly hot?: HotSpec;
}

/**
 * A HOT CONVERSION — the sight adjustment, and the mechanic that makes a blitz a
 * risk to the defence rather than a free win (ADR-022 petition 2).
 *
 * **`breakZone` IS REQUIRED HERE, exactly as it is on `RouteSpec`.** Contracts makes
 * it optional with "omitted ⇒ keep the original", which is a sane contract-level
 * default and a corpus-level fake: a route that breaks off into vacated space is
 * breaking off SOMEWHERE, and a conversion that does not say where hands the zone
 * model the pre-snap lane for a post-snap route. Entry 8's failure mode, one
 * mechanic later. `hot()` derives the depth band from air yards for the same reason
 * `breakAt()` does, so the author only ever chooses the lane.
 */
export interface HotSpec {
  readonly routeName: RouteName;
  readonly depthClass: RouteDepthClass;
  readonly airYards: number;
  readonly breakZone: FieldZone;
}

/** The route he breaks off into. Lane is the author's choice; the band is derived. */
export function hot(
  routeName: RouteName,
  depthClass: RouteDepthClass,
  airYards: number,
  lane: HorizontalZone,
): HotSpec {
  return { routeName, depthClass, airYards, breakZone: breakAt(lane, airYards) };
}

/**
 * "He breaks it off." The base route and what it becomes.
 *
 * Used where every route on the card is too slow to beat a free runner, so somebody
 * has to convert — the seam that sits down, the post that becomes a slant.
 */
export function convertsTo(base: RouteSpec, to: HotSpec): RouteSpec {
  return { ...base, hot: to };
}

/**
 * "He IS the hot, and he does not have to change what he is doing."
 *
 * The other half of real football's answer to pressure, and the reason the two
 * constructors are separate. A coach's hot rule is sometimes a CONVERSION (the
 * sight adjustment) and sometimes just a DESIGNATION — "against pressure the flat is
 * your hot" — where the route was already quick and the only thing that changes is
 * that the quarterback goes there first.
 *
 * The engine models both with one field, because it does two things with a hot
 * route: it converts it, and it moves the receiver to the front of the progression.
 * An unchanged conversion is the second of those on its own, which is precisely what
 * a designation is. `validate.ts` then refuses the case where it buys nothing —
 * an unchanged hot on the man who is ALREADY the first read converts nothing and
 * re-orders nothing, and is an authoring slip rather than a football statement.
 */
export function alreadyHot(base: RouteSpec): RouteSpec {
  return {
    ...base,
    hot: {
      routeName: base.routeName,
      depthClass: base.depthClass,
      airYards: base.airYards,
      breakZone: base.breakZone,
    },
  };
}

/** True when the conversion changes nothing but the progression. */
export function isDesignationOnly(base: RouteSpec): boolean {
  const to = base.hot;
  if (to === undefined) return false;
  return (
    to.routeName === base.routeName &&
    to.depthClass === base.depthClass &&
    to.airYards === base.airYards &&
    to.breakZone.horizontal === base.breakZone.horizontal &&
    to.breakZone.vertical === base.breakZone.vertical
  );
}

/**
 * The only constructor the corpus uses. The author picks the lane — the half that
 * is a real decision — and the depth band comes from §3.2 so it cannot disagree
 * with `airYards`.
 */
export function breakAt(lane: HorizontalZone, airYards: number): FieldZone {
  return { horizontal: lane, vertical: verticalZoneForAirYards(airYards) };
}

/** Convenience: a whole route, with the derived break zone. */
export function route(
  routeName: RouteName,
  depthClass: RouteDepthClass,
  airYards: number,
  lane: HorizontalZone,
): RouteSpec {
  return { routeName, depthClass, airYards, breakZone: breakAt(lane, airYards) };
}

/** Same, flagged as an option route (§9.5). */
export function optionRoute(
  routeName: RouteName,
  depthClass: RouteDepthClass,
  airYards: number,
  lane: HorizontalZone,
): RouteSpec {
  return { routeName, depthClass, airYards, breakZone: breakAt(lane, airYards), option: true };
}
