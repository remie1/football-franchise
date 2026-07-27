/**
 * §9.4 — ZONE COVERAGE, both halves of it.
 *
 * 1. THE ROUTE ENTERS A ZONE. `d100 + WR Route Running ÷ 5` against a target of
 *    `50 + Defender Zone Coverage ÷ 5`. Note what this is NOT: it is not an
 *    opposed roll. Man coverage is two men racing each other and the doc rolls
 *    both; zone is one receiver working against a spot somebody is standing in,
 *    and the doc gives the defender a target number rather than a die. Keeping
 *    that asymmetry is the difference between simulating zone and re-skinning
 *    man — a zone defender's rating sets how small the window is, it does not
 *    get its own variance.
 *
 * 2. THE DEFENDER READS THE QUARTERBACK. `d100 + ZoneCoverage÷5 + Awareness÷5`
 *    against `60 + QB Disguise`. This is the mechanic that makes zone dangerous
 *    rather than merely soft: a defender playing an area with his eyes on the
 *    passer can leave the area early. Resolved AT THE RELEASE, because that is
 *    what the doc says he breaks on.
 *
 * `QB Disguise` names an attribute that does not exist in §4.1 or in
 * `ATTRIBUTE_REGISTRY_V1`, and cannot be a 0-99 rating on scale grounds (added
 * raw to 60 it would make the check unwinnable). See
 * `TUNABLES.zoneCoverage.readQb.disguise` for what stands in and why.
 */
import { getAttr } from "@ff/contracts";
import type { AttrId, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT, resolveAttr } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import {
  actorAttrModifier,
  bandFor,
  compact,
  flatModifier,
  rollD100,
  tierFor,
  traitModifier,
} from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type { ContestPosition } from "../types.js";

export type ZoneCoverageBandLabel = (typeof TUNABLES.zoneCoverage.bands)[number]["label"];

export interface ZoneCoverageArgs {
  readonly receiver: PlayerState;
  readonly defender: PlayerState;
  readonly coverageRng: Rng;
}

export interface ZoneCoverageOutcome {
  readonly band: ZoneCoverageBandLabel;
  readonly margin: number;
  readonly target: number;
  readonly openness: number;
  readonly contestPosition: ContestPosition;
  /** He found the hole and sat down in it — §8.7's decay slows (see tunables). */
  readonly settled: boolean;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

const ZONE_COVERAGE_ATTRS: readonly AttrId[] = [ATTR.routeRunning, ATTR.zoneCoverage];

export function resolveZoneCoverage(args: ZoneCoverageArgs): ZoneCoverageOutcome {
  const { receiver, defender, coverageRng } = args;
  const t = TUNABLES.zoneCoverage;

  const receiverMods = compact([
    actorAttrModifier(receiver, "Route Running", ATTR.routeRunning, t.receiverAttrDivisor),
    traitModifier(
      "Trait: Route Technician",
      receiver.attributes.traits,
      TRAIT.routeTechnician,
      TUNABLES.traitBonuses.routeTechnician,
    ),
  ]);

  // The defender's rating is the TARGET, not a roll (see the module comment).
  const target =
    t.target +
    Math.round(getAttr(defender.attributes.values, ATTR.zoneCoverage) / t.defenderAttrDivisor);

  const roll = rollD100(coverageRng.fork(`${receiver.bio.id}:zone`), receiverMods);
  const margin = roll.total - target;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    margin,
    target,
    openness: band.openness,
    contestPosition: band.contest,
    settled: band.settled,
    roll,
    check: {
      // ADR-009 narrowed `zone_coverage` to exactly this rep: the route working
      // against a spot somebody is standing in. The read-the-QB rep below is
      // `zone_read_qb`, so nothing has to infer which is which from actor shape.
      checkKind: "zone_coverage",
      actors: [receiver.bio.id, defender.bio.id],
      roll,
      target,
      tier: tierFor(margin),
      margin,
      testsAttrs: ZONE_COVERAGE_ATTRS,
    },
  };
}

/** Exposed so the §17 renderer can name the branch a margin selected. */
export function zoneCoverageBandFor(margin: number): ZoneCoverageBandLabel {
  return bandFor(TUNABLES.zoneCoverage.bands, margin).label;
}

// ---------------------------------------------------------------------------

/**
 * §9.4's "QB Disguise", derived. INTERPRETATION — see the tunables block. This
 * is a MODIFIER-scale quantity (roughly −6..+6), not a rating.
 */
export function qbDisguise(quarterback: PlayerState): number {
  const d = TUNABLES.zoneCoverage.readQb.disguise;
  return d.terms.reduce((total, term) => {
    const value = getAttr(quarterback.attributes.values, resolveAttr(term.attr));
    return total + Math.round((value - d.baseline) / term.divisor);
  }, 0);
}

export interface ZoneReadArgs {
  readonly defender: PlayerState;
  readonly quarterback: PlayerState;
  readonly coverageRng: Rng;
}

export interface ZoneReadOutcome {
  /** Did he leave the area early and break on the ball? */
  readonly brokeOnBall: boolean;
  readonly margin: number;
  readonly target: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

const ZONE_READ_ATTRS: readonly AttrId[] = [ATTR.zoneCoverage, ATTR.awareness];

export function resolveZoneRead(args: ZoneReadArgs): ZoneReadOutcome {
  const { defender, quarterback, coverageRng } = args;
  const t = TUNABLES.zoneCoverage.readQb;

  const disguise = qbDisguise(quarterback);
  const target = t.baseTarget + disguise;

  const mods = compact([
    actorAttrModifier(defender, "Zone Coverage", ATTR.zoneCoverage, t.attrDivisor),
    actorAttrModifier(defender, "Awareness", ATTR.awareness, t.attrDivisor),
  ]);

  const roll = rollD100(coverageRng.fork(`${defender.bio.id}:zoneread`), mods);
  const margin = roll.total - target;

  return {
    brokeOnBall: margin >= 0,
    margin,
    target,
    roll,
    check: {
      // ADR-009 item 2 — §9.4's second roll has its own member. Before it, a
      // consumer counting `zone_coverage` was adding route reps to read reps.
      checkKind: "zone_read_qb",
      actors: [defender.bio.id, quarterback.bio.id],
      roll,
      target,
      tier: tierFor(margin),
      margin,
      testsAttrs: ZONE_READ_ATTRS,
    },
  };
}

/** §9.4 "Creates +20 to contest/interception", as a named roll modifier. */
export function brokeOnBallContestModifier(): { source: string; value: number } {
  return {
    source: "Zone defender broke on the ball (§9.4)",
    value: TUNABLES.zoneCoverage.readQb.contestBonus,
  };
}

/**
 * §8.7 decay for a receiver who has settled into a soft spot. Zone coverage does
 * not close on a man the way a corner running with him does, so the window shuts
 * at its own (tunable, currently zero) rate.
 */
export function settledOpennessAt(
  baseOpenness: number,
  readySeconds: number,
  tick: number,
): number {
  const r = TUNABLES.route;
  const step = TUNABLES.clock.tickStepSeconds;
  const growthEnd = Math.min(tick, r.decayStartsAtSeconds);
  const gainSteps = Math.max(0, (growthEnd - readySeconds) / step);
  const decaySteps = Math.max(0, (tick - r.decayStartsAtSeconds) / step);
  const raw =
    baseOpenness +
    r.opennessGainPerTick * gainSteps -
    TUNABLES.zoneCoverage.settledDecayPerTick * decaySteps;
  return Math.round(Math.max(r.minOpenness, Math.min(r.maxOpenness, raw)));
}
