/**
 * §12 — THE TIPPED BALL SYSTEM.
 *
 * A deflection used to terminate the play as a batted-down incompletion
 * (vertical-slice deviation #7). It does not, in football: a tipped ball is a
 * live ball, and what happens to it is two rolls.
 *
 *  ROLL 1 (§12.2) DEFLECTION QUALITY — how recoverable the ball is. A base
 *  target number set by how high the ball was when it was hit, modified by how
 *  hard it was thrown, rolled against, and the RESULT sets the FINAL target
 *  number every recovery attempt is then measured against. A hard bullet swatted
 *  at the waist is dead on the turf; a touch pass tipped at the high point hangs.
 *
 *  ROLL 2 (§12.4) RECOVERY — every eligible player, in Reaction order, first
 *  success takes it. Offence wins ties. A defensive recovery is an INTERCEPTION,
 *  and it is a real and material source of them.
 *
 * THROW HEIGHT IS NOT MODELLED and Roll 1 requires it. It is DERIVED here from
 * three things the engine does have — where the ball was hit (in the lane, or at
 * the catch point), how far the route was going, and how the ball was thrown —
 * rather than by inventing a trajectory field. The whole mapping lives in
 * `TUNABLES.tippedBall` and is marked INTERPRETATION there.
 */
import { getAttr } from "@ff/contracts";
import type { AttrId, PlayerId, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT, attrName, resolveAttr } from "../attrs.js";
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
import type { FieldZone, RouteDepthClass, ThrowType } from "../types.js";
import { zoneDistance } from "./zone.js";

export type ThrowHeight = keyof typeof TUNABLES.tippedBall.baseTargetByHeight;
export type DeflectionQualityLabel = (typeof TUNABLES.tippedBall.qualityBands)[number]["label"];
export type DeflectionQualityBand = (typeof TUNABLES.tippedBall.qualityBands)[number];

/** Where the ball was when the defender got a hand on it. */
export type DeflectionPoint = "LANE" | "CATCH_POINT";

/**
 * §12.2's missing input, derived. A ball knocked down in the throwing lane is at
 * its flattest, a stride after the release; a ball deflected at the catch point
 * is at the end of an arc that rises with the distance it travelled, tilted a
 * notch either way by how hard it was thrown.
 */
export function throwHeightFor(
  point: DeflectionPoint,
  depthClass: RouteDepthClass,
  throwType: ThrowType,
): ThrowHeight {
  const t = TUNABLES.tippedBall;
  const ladder: readonly ThrowHeight[] = t.heightLadder;
  if (point === "LANE") return t.heightAtLane;
  const base: ThrowHeight = t.heightAtCatchPointByDepth[depthClass];
  const steps = t.heightStepsByThrowType[throwType];
  const index = Math.max(0, Math.min(ladder.length - 1, ladder.indexOf(base) + steps));
  return ladder[index] ?? base;
}

export interface DeflectionQualityArgs {
  readonly deflector: PlayerState;
  readonly point: DeflectionPoint;
  readonly depthClass: RouteDepthClass;
  readonly throwType: ThrowType;
  readonly tipRng: Rng;
}

export interface DeflectionQualityOutcome {
  readonly height: ThrowHeight;
  readonly result: DeflectionQualityLabel;
  readonly band: DeflectionQualityBand;
  readonly targetNumber: number;
  readonly finalTargetNumber: number;
  readonly recoverable: boolean;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

/**
 * §12.2. The roll carries no attribute term — the doc's Roll 1 is `d100` against
 * a situational target, and nothing about the deflector changes how the ball
 * bounces. `testsAttrs` is therefore honestly EMPTY: this check exercises no
 * rating, and claiming one would corrupt the perception exposure channel.
 */
export function resolveDeflectionQuality(args: DeflectionQualityArgs): DeflectionQualityOutcome {
  const t = TUNABLES.tippedBall;
  const height = throwHeightFor(args.point, args.depthClass, args.throwType);

  const mods = compact([
    flatModifier(`Ball velocity: ${args.throwType}`, t.velocityModifier[args.throwType]),
    // §16 is not implemented; every weather key is zero and `compact` drops it.
    flatModifier("Weather", t.weatherModifier.DOME_CLEAR),
  ]);
  const targetNumber = t.baseTargetByHeight[height] + mods.reduce((a, m) => a + m.value, 0);

  const roll = rollD100(args.tipRng.fork("quality"), []);
  const margin = roll.total - targetNumber;
  const band = bandFor(t.qualityBands, margin);

  return {
    height,
    result: band.label,
    band,
    targetNumber,
    finalTargetNumber: band.finalTargetNumber,
    recoverable: band.recoverable,
    margin,
    roll,
    check: {
      checkKind: "deflection_quality",
      actors: [args.deflector.bio.id],
      roll,
      target: targetNumber,
      tier: tierFor(margin),
      band: band.label,
      margin,
      testsAttrs: [],
    },
  };
}

// ---------------------------------------------------------------------------

export type BallSide = "OFFENSE" | "DEFENSE";

/** A player who might get to the ball, and everything §12.3/§12.4 need about him. */
export interface RecoveryCandidate {
  readonly player: PlayerState;
  readonly side: BallSide;
  readonly zone: FieldZone;
  /** §12.4 "Already tracking ball": the target, the man contesting him, the deflector. */
  readonly trackingBall: boolean;
  /** §12.4 "Engaged in block": everyone in protection. */
  readonly engagedInBlock: boolean;
}

export interface EligibleRecoverer extends RecoveryCandidate {
  /** 0 same zone, 1 adjacent, 2 two zones away. */
  readonly zoneDistance: number;
}

/**
 * §12.3 — who can even attempt it, by deflection result and zone proximity.
 *
 * The doc's "Speed check" cells are implemented as a DETERMINISTIC rating gate
 * (`recovery.speedCheckMinSpeed`), not a die: §10.1's arm-strength requirement is
 * the standing precedent for a threshold with no roll behind it, and §12.4
 * already pays Speed a second time as a modifier.
 */
export function eligibleRecoverers(
  band: DeflectionQualityBand,
  ballZone: FieldZone,
  candidates: readonly RecoveryCandidate[],
): EligibleRecoverer[] {
  if (!band.recoverable) return [];
  const minSpeed = TUNABLES.tippedBall.recovery.speedCheckMinSpeed;
  const out: EligibleRecoverer[] = [];
  for (const candidate of candidates) {
    const distance = zoneDistance(candidate.zone, ballZone);
    if (distance > band.maxZoneDistance) continue;
    if (distance >= band.speedCheckFromDistance) {
      if (getAttr(candidate.player.attributes.values, ATTR.speed) < minSpeed) continue;
    }
    out.push({ ...candidate, zoneDistance: distance });
  }
  return out;
}

/**
 * §12.4's resolution order: Reaction highest first, offence ahead of defence on
 * a tie ("possession advantage"), then player id so the order is total and the
 * stream is reproducible without a die.
 */
export function recoveryOrder(candidates: readonly EligibleRecoverer[]): EligibleRecoverer[] {
  return [...candidates].sort((a, b) => {
    const reaction =
      getAttr(b.player.attributes.values, ATTR.reaction) -
      getAttr(a.player.attributes.values, ATTR.reaction);
    if (reaction !== 0) return reaction;
    if (a.side !== b.side) return a.side === "OFFENSE" ? -1 : 1;
    return String(a.player.bio.id).localeCompare(String(b.player.bio.id));
  });
}

function proximityModifier(distance: number): number {
  const p = TUNABLES.tippedBall.recovery.proximityModifier;
  if (distance <= 0) return p.sameZone;
  if (distance === 1) return p.adjacentZone;
  return p.twoZonesAway;
}

export interface RecoveryAttemptArgs {
  readonly candidate: EligibleRecoverer;
  readonly band: DeflectionQualityBand;
  readonly finalTargetNumber: number;
  readonly tipRng: Rng;
}

export interface RecoveryAttemptOutcome {
  readonly player: PlayerId;
  readonly recovered: boolean;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

/** §12.4 — one player's attempt at a live ball. */
export function resolveRecoveryAttempt(args: RecoveryAttemptArgs): RecoveryAttemptOutcome {
  const t = TUNABLES.tippedBall.recovery;
  const { candidate, band, finalTargetNumber, tipRng } = args;
  const who = candidate.player;

  const handsAttr = resolveAttr(
    candidate.side === "OFFENSE" ? t.offenseHandsAttr : t.defenseHandsAttr,
  );

  const mods = compact([
    flatModifier(`Proximity: ${zoneProximityLabel(candidate.zoneDistance)}`, proximityModifier(candidate.zoneDistance)),
    actorAttrModifier(who, attrName(handsAttr), handsAttr, t.handsDivisor),
    ...t.attrTerms.map((term) => {
      const id = resolveAttr(term.attr);
      return actorAttrModifier(who, attrName(id), id, term.divisor);
    }),
    traitModifier("Trait: Ball Hawk", who.attributes.traits, TRAIT.ballHawk, t.traits.ballHawk),
    traitModifier("Trait: Reliable Hands", who.attributes.traits, TRAIT.reliableHands, t.traits.reliableHands),
    candidate.trackingBall ? flatModifier("Already tracking the ball", t.situational.alreadyTrackingBall) : undefined,
    candidate.engagedInBlock ? flatModifier("Engaged in a block", t.situational.engagedInBlock) : undefined,
    band.giftZone ? flatModifier("Gift zone", t.situational.giftZoneBonus) : undefined,
  ]);

  const roll = rollD100(tipRng.fork(`recover:${who.bio.id}`), mods);
  const margin = roll.total - finalTargetNumber;

  return {
    player: who.bio.id,
    // §12.4: "Must MEET OR EXCEED Final Target Number".
    recovered: margin >= 0,
    margin,
    roll,
    check: {
      checkKind: "deflection_recovery",
      actors: [who.bio.id],
      roll,
      target: finalTargetNumber,
      tier: tierFor(margin),
      margin,
      testsAttrs: recoveryTestsAttrs(handsAttr),
    },
  };
}

function recoveryTestsAttrs(handsAttr: AttrId): AttrId[] {
  return [handsAttr, ...TUNABLES.tippedBall.recovery.attrTerms.map((term) => resolveAttr(term.attr))];
}

export function zoneProximityLabel(distance: number): string {
  if (distance <= 0) return "same zone";
  if (distance === 1) return "adjacent zone";
  return "two zones away";
}

/** Exposed so the §17 renderer can name the branch a Roll 1 margin selected. */
export function deflectionQualityBandFor(margin: number): DeflectionQualityLabel {
  return bandFor(TUNABLES.tippedBall.qualityBands, margin).label;
}
