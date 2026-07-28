/**
 * §3 ZONE-BASED FIELD MODEL — the minimum of it, stated plainly.
 *
 * WHAT IS MODELLED. §3.1's five horizontal lanes and §3.2's five depth bands, as
 * a 5×5 grid of cells; the depth band a route ends in, derived from its air
 * yards against §3.2's stated yard boundaries; and the number of cells between
 * two players, which is the quantity §3.3, §9.4 and §12.3 are all written
 * against ("same zone / adjacent / two zones away").
 *
 * WHAT IS FAKED, and it matters:
 *
 *  - **Horizontal position is not derivable.** Nothing on a play card says which
 *    side of the field a route runs to. A `RouteAssignment` may state a
 *    `breakZone`; one that does not gets `tunables.zoneModel.defaultHorizontal`,
 *    which puts every silent route in the same lane and therefore in the same
 *    zone as every other silent route. That is a fake, not a model, and it is
 *    why the fixtures that exercise zone coverage state `breakZone` explicitly.
 *  - **Players do not move.** A player occupies one cell for the entire play:
 *    receivers their break cell, man defenders their receiver's cell, zone
 *    defenders their ANCHOR cell, everyone in protection the backfield. There is
 *    no path, no closing speed and no time — §3.3's "reaction determines who
 *    arrives first" is expressed as §12.4's Reaction ORDERING, not as travel.
 *    A zone defender's RESPONSIBILITY is now a region (below) while his POSITION
 *    is still the single cell he is standing in; §12.3's recovery eligibility
 *    reads the position, because that is where the man is.
 *  - **Adjacency does not gate coverage.** §3.3 lets an adjacent-zone defender
 *    interact on a speed check at −10; §9.4 asks only about the SAME zone.
 *    §9.4's literal question is the one implemented here. Adjacency is used only
 *    where the doc uses it explicitly: §12.3's recovery eligibility.
 *
 * WHAT ADR-018 CHANGED, AND WHAT IT DID NOT. A `ZoneAssignment` now states an
 * anchor plus an optional `laneSpan` / `depthSpan`, so "is a defender
 * responsible for this cell?" is a REGION test rather than cell equality —
 * `zoneAssignmentCovers` below. A Cover 2 corner finally touches a route that
 * breaks one band deeper in his own lane, which he could not before: seven
 * defenders held seven of twenty-five cells and everything else was uncovered
 * BY CONSTRUCTION rather than by design.
 *
 * Both spans default to 0, so this is not a behaviour change on its own — every
 * card written before ADR-018 covers exactly its anchor cell and resolves
 * identically. What moves the numbers is a card SAYING a span, which is the
 * point: the reach becomes a property of the defensive call instead of a
 * property of how well one author guessed which cells the offence would use.
 */
import type { PlayerId } from "@ff/contracts";
import type { Tunables } from "../tunables.js";
import type {
  CoverageAssignment,
  FieldZone,
  HorizontalZone,
  RouteAssignment,
  VerticalZone,
  ZoneAssignment,
} from "../types.js";

/** §3.2 — which depth band a route that gains `airYards` finishes in. */
export function verticalZoneForAirYards(tunables: Tunables, airYards: number): VerticalZone {
  const bounds = tunables.zoneModel.verticalUpperYards;
  if (airYards <= bounds.BACKFIELD) return "BACKFIELD";
  if (airYards <= bounds.SHORT) return "SHORT";
  if (airYards <= bounds.INTERMEDIATE) return "INTERMEDIATE";
  if (airYards <= bounds.DEEP) return "DEEP";
  return "VERY_DEEP";
}

/**
 * The cell a route breaks into. Stated by the play card where the card states
 * it; otherwise depth from §3.2 and the faked default lane horizontally.
 */
export function routeZone(tunables: Tunables, assignment: RouteAssignment): FieldZone {
  if (assignment.breakZone !== undefined) return assignment.breakZone;
  return {
    horizontal: tunables.zoneModel.defaultHorizontal,
    vertical: verticalZoneForAirYards(tunables, assignment.airYards),
  };
}

/** Everyone in protection — blockers, rushers, the passer — is here. */
export function backfieldZone(tunables: Tunables): FieldZone {
  return {
    horizontal: tunables.zoneModel.defaultHorizontal,
    vertical: tunables.zoneModel.backfieldVertical,
  };
}

function horizontalIndex(tunables: Tunables, h: HorizontalZone): number {
  const order: readonly HorizontalZone[] = tunables.zoneModel.horizontalOrder;
  return order.indexOf(h);
}

function verticalIndex(tunables: Tunables, v: VerticalZone): number {
  const order: readonly VerticalZone[] = tunables.zoneModel.verticalOrder;
  return order.indexOf(v);
}

/**
 * How many cells apart two players are, as §3.3 counts them: 0 same zone,
 * 1 adjacent, 2+ "two zones away". Diagonals count as one step (Chebyshev),
 * because a defender one lane over and one band deeper is one move away, not two.
 */
export function zoneDistance(tunables: Tunables, a: FieldZone, b: FieldZone): number {
  return Math.max(
    Math.abs(horizontalIndex(tunables, a.horizontal) - horizontalIndex(tunables, b.horizontal)),
    Math.abs(verticalIndex(tunables, a.vertical) - verticalIndex(tunables, b.vertical)),
  );
}

export function sameZone(a: FieldZone, b: FieldZone): boolean {
  return a.horizontal === b.horizontal && a.vertical === b.vertical;
}

/** Stable string form, for map keys and printouts. */
export function zoneKey(zone: FieldZone): string {
  return `${zone.horizontal}/${zone.vertical}`;
}

/**
 * A span, normalised. A defender always covers the cell he is standing in, so a
 * region can never be smaller than a point: a negative span would make an
 * assignment cover NOTHING, including its own anchor, which is not a hole in a
 * zone — it is a defender who is nowhere. Fractional spans are floored for the
 * same reason `zoneDistance` counts whole cells.
 *
 * ⚠ This NORMALISES rather than REJECTS, which is a deliberate limit and is
 * reported as one. `assertCoherentPlayCall` is where a nonsense span belongs
 * (it is arithmetic about the card's own arguments, exactly ADR-006's line), and
 * adding a rejection was outside this dispatch's brief.
 */
function spanOf(value: number | undefined): number {
  if (value === undefined) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * Does this assignment's region contain `cell`? (ADR-018 petition 1.)
 *
 * A zone is `zone.horizontal ± laneSpan` by `zone.vertical ± depthSpan`, a
 * rectangle on the §3 grid anchored on the cell the card states. Both spans
 * default to 0, so an assignment that states neither covers exactly its anchor
 * and behaves precisely as it did before spans existed.
 *
 * The lane and depth tests are SEPARATE (a Chebyshev ball, not a Euclidean one):
 * a deep third is one lane by three bands and a curl/flat is three lanes by one,
 * and a single radius cannot express either. This is the same metric
 * `zoneDistance` already counts §3.3's "adjacent" with.
 */
export function zoneAssignmentCovers(
  tunables: Tunables,
  assignment: ZoneAssignment,
  cell: FieldZone,
): boolean {
  const lanes =
    horizontalIndex(tunables, cell.horizontal) -
    horizontalIndex(tunables, assignment.zone.horizontal);
  const bands =
    verticalIndex(tunables, cell.vertical) - verticalIndex(tunables, assignment.zone.vertical);
  return (
    Math.abs(lanes) <= spanOf(assignment.laneSpan) && Math.abs(bands) <= spanOf(assignment.depthSpan)
  );
}

/**
 * §9.4 step 2 — "check if a zone defender is present in that zone", now that a
 * zone is a REGION and not a cell.
 *
 * ================== WHO PLAYS IT WHEN TWO MEN COVER IT ==================
 * §9.4 is written for ONE defender in the route's zone: it hands that man's Zone
 * Coverage rating to the receiver as a target and rolls once. Exact-match made a
 * second claimant nearly impossible; spans make it ordinary — a deep third and a
 * curl/flat overlap wherever a corner's lane meets a linebacker's depth.
 *
 * THE RULING: **the defender whose ANCHOR CELL is nearest the route's cell**,
 * measured with §3.3's own cell distance; ties break on declaration order.
 *
 * Why that one, and not something else:
 *
 *  - It is the doc's existing vocabulary for the question. §3.3 already measures
 *    players against each other in cells — "same zone / adjacent / two zones
 *    away" — and `tunables.tippedBall.proximityModifier` already spends that
 *    quantity to decide who is near enough to affect a live ball. Picking the
 *    nearest man is the doc's own answer to "who is closest", not a new idea.
 *  - It is what a span MEANS. The anchor is the landmark the card puts the
 *    defender on; the span is how far his responsibility reaches from it. Two
 *    men reaching the same cell are not equally there, and the one whose
 *    landmark is the cell is playing it while the one who is stretching to it is
 *    not.
 *  - It preserves the pre-span behaviour EXACTLY. With every span 0 the only
 *    claimant possible is at distance 0, and the first such in declaration order
 *    is what the old exact-match loop returned.
 *  - It adds no die and no bracket. ADR-005: nothing is asserted that no roll
 *    produced, and the second defender is simply not resolved — he is not
 *    modelled as help, because the doc has no help mechanic and inventing one
 *    would put coverage in the stream that no rule produced.
 *
 * ⚠ FLAGGED, because the choice is genuinely arguable. "Tightest region wins"
 * (the most specific responsibility) and "highest Zone Coverage wins" (the best
 * player takes it) are both defensible and both would produce different numbers.
 * Nearest-anchor was chosen because it is the only one of the three the design
 * doc already contains a measure for. If calibration wants another, it is one
 * comparator in `nearestClaimant` — and it should be an ADR, not a patch.
 * ========================================================================
 */
export function zoneDefenderFor(
  tunables: Tunables,
  assignments: readonly CoverageAssignment[],
  zone: FieldZone,
): ZoneCoverageAssignmentView | undefined {
  let best: ZoneCoverageAssignmentView | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const assignment of assignments) {
    if (assignment.kind !== "ZONE") continue;
    if (!zoneAssignmentCovers(tunables, assignment, zone)) continue;
    // §3.3's own measure, reused rather than restated — the grid's orderings
    // live in `tunables.zoneModel` and there is exactly one copy of them.
    const distance = zoneDistance(tunables, assignment.zone, zone);
    // STRICTLY less: an equal distance leaves the incumbent in place, which is
    // declaration order — the tie-break this function already used.
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { defender: assignment.defender, zone: assignment.zone };
    }
  }
  return best;
}

export interface ZoneCoverageAssignmentView {
  readonly defender: PlayerId;
  readonly zone: FieldZone;
}
