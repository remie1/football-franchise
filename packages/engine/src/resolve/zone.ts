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
 *    `breakZone`; one that does not gets `TUNABLES.zoneModel.defaultHorizontal`,
 *    which puts every silent route in the same lane and therefore in the same
 *    zone as every other silent route. That is a fake, not a model, and it is
 *    why the fixtures that exercise zone coverage state `breakZone` explicitly.
 *  - **Players do not move.** A player occupies one cell for the entire play:
 *    receivers their break cell, man defenders their receiver's cell, zone
 *    defenders their stated cell, everyone in protection the backfield. There is
 *    no path, no closing speed and no time — §3.3's "reaction determines who
 *    arrives first" is expressed as §12.4's Reaction ORDERING, not as travel.
 *  - **Adjacency does not gate coverage.** §3.3 lets an adjacent-zone defender
 *    interact on a speed check at −10; §9.4 asks only about the SAME zone.
 *    §9.4's literal question is the one implemented here. Adjacency is used only
 *    where the doc uses it explicitly: §12.3's recovery eligibility.
 */
import type { PlayerId } from "@ff/contracts";
import { TUNABLES } from "../tunables.js";
import type {
  CoverageAssignment,
  FieldZone,
  HorizontalZone,
  RouteAssignment,
  VerticalZone,
} from "../types.js";

/** §3.2 — which depth band a route that gains `airYards` finishes in. */
export function verticalZoneForAirYards(airYards: number): VerticalZone {
  const bounds = TUNABLES.zoneModel.verticalUpperYards;
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
export function routeZone(assignment: RouteAssignment): FieldZone {
  if (assignment.breakZone !== undefined) return assignment.breakZone;
  return {
    horizontal: TUNABLES.zoneModel.defaultHorizontal,
    vertical: verticalZoneForAirYards(assignment.airYards),
  };
}

/** Everyone in protection — blockers, rushers, the passer — is here. */
export function backfieldZone(): FieldZone {
  return {
    horizontal: TUNABLES.zoneModel.defaultHorizontal,
    vertical: TUNABLES.zoneModel.backfieldVertical,
  };
}

function horizontalIndex(h: HorizontalZone): number {
  const order: readonly HorizontalZone[] = TUNABLES.zoneModel.horizontalOrder;
  return order.indexOf(h);
}

function verticalIndex(v: VerticalZone): number {
  const order: readonly VerticalZone[] = TUNABLES.zoneModel.verticalOrder;
  return order.indexOf(v);
}

/**
 * How many cells apart two players are, as §3.3 counts them: 0 same zone,
 * 1 adjacent, 2+ "two zones away". Diagonals count as one step (Chebyshev),
 * because a defender one lane over and one band deeper is one move away, not two.
 */
export function zoneDistance(a: FieldZone, b: FieldZone): number {
  return Math.max(
    Math.abs(horizontalIndex(a.horizontal) - horizontalIndex(b.horizontal)),
    Math.abs(verticalIndex(a.vertical) - verticalIndex(b.vertical)),
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
 * §9.4 step 2 — "check if zone defender is present in that zone". Ties break on
 * declaration order, which is deterministic and needs no die (ADR-005).
 */
export function zoneDefenderFor(
  assignments: readonly CoverageAssignment[],
  zone: FieldZone,
): ZoneCoverageAssignmentView | undefined {
  for (const assignment of assignments) {
    if (assignment.kind !== "ZONE") continue;
    if (sameZone(assignment.zone, zone)) {
      return { defender: assignment.defender, zone: assignment.zone };
    }
  }
  return undefined;
}

export interface ZoneCoverageAssignmentView {
  readonly defender: PlayerId;
  readonly zone: FieldZone;
}
