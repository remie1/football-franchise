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
 * `tunables.tippedBall` and is marked INTERPRETATION there.
 */
import { getAttr } from "@ff/contracts";
import type { AttrId, PlayerId, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT, attrName, resolveAttr } from "../attrs.js";
import type { CheckEmission, TippedBallRecovery } from "../events.js";
import {
  actorAttrModifier,
  bandFor,
  compact,
  flatModifier,
  rollD100,
  tierFor,
  traitModifier,
} from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { FieldZone, RouteDepthClass, ThrowType } from "../types.js";
import { zoneDistance } from "./zone.js";

export type ThrowHeight = keyof Tunables["tippedBall"]["baseTargetByHeight"];
export type DeflectionQualityLabel = (Tunables["tippedBall"]["qualityBands"])[number]["label"];
export type DeflectionQualityBand = (Tunables["tippedBall"]["qualityBands"])[number];

/** Where the ball was when the defender got a hand on it. */
export type DeflectionPoint = "LANE" | "CATCH_POINT";

/**
 * §12.2's missing input, derived. A ball knocked down in the throwing lane is at
 * its flattest, a stride after the release; a ball deflected at the catch point
 * is at the end of an arc that rises with the distance it travelled, tilted a
 * notch either way by how hard it was thrown.
 */
export function throwHeightFor(
  tunables: Tunables,
  point: DeflectionPoint,
  depthClass: RouteDepthClass,
  throwType: ThrowType,
): ThrowHeight {
  const t = tunables.tippedBall;
  const ladder: readonly ThrowHeight[] = t.heightLadder;
  if (point === "LANE") return t.heightAtLane;
  const base: ThrowHeight = t.heightAtCatchPointByDepth[depthClass];
  const steps = t.heightStepsByThrowType[throwType];
  const index = Math.max(0, Math.min(ladder.length - 1, ladder.indexOf(base) + steps));
  return ladder[index] ?? base;
}

export interface DeflectionQualityArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
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
  /**
   * ADR-036. Was `finalTargetNumber: number` plus `recoverable: boolean`, which
   * let a caller read a target off a dead ball. The two facts are one fact and
   * are now carried as one: on a `DEAD` deflection there is no threshold, and
   * `recovery.finalTargetNumber` does not exist to be read.
   */
  readonly recovery: TippedBallRecovery;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

/**
 * The band's recovery state, read the only way the band permits: by branching.
 *
 * `DEAD` has no `finalTargetNumber` KEY (`tunables.tippedBall.qualityBands`), so
 * `band.finalTargetNumber` does not compile on the union and this function is
 * where the narrowing happens, once.
 */
export function recoveryFor(band: DeflectionQualityBand): TippedBallRecovery {
  return band.recoverable
    ? { recoverable: true, finalTargetNumber: band.finalTargetNumber }
    : { recoverable: false };
}

/**
 * §12.2. The roll carries no attribute term — the doc's Roll 1 is `d100` against
 * a situational target, and nothing about the deflector changes how the ball
 * bounces. `testsAttrs` is therefore honestly EMPTY: this check exercises no
 * rating, and claiming one would corrupt the perception exposure channel.
 */
export function resolveDeflectionQuality(args: DeflectionQualityArgs): DeflectionQualityOutcome {
  const { tunables } = args;
  const t = tunables.tippedBall;
  const height = throwHeightFor(tunables, args.point, args.depthClass, args.throwType);

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
    recovery: recoveryFor(band),
    margin,
    roll,
    check: {
      checkKind: "deflection_quality",
      actors: [args.deflector.bio.id],
      roll,
      target: targetNumber,
      tier: tierFor(tunables, margin),
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
  tunables: Tunables,
  band: DeflectionQualityBand,
  ballZone: FieldZone,
  candidates: readonly RecoveryCandidate[],
): EligibleRecoverer[] {
  if (!band.recoverable) return [];
  const minSpeed = tunables.tippedBall.recovery.speedCheckMinSpeed;
  const out: EligibleRecoverer[] = [];
  for (const candidate of candidates) {
    const distance = zoneDistance(tunables, candidate.zone, ballZone);
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

function proximityModifier(tunables: Tunables, distance: number): number {
  const p = tunables.tippedBall.recovery.proximityModifier;
  if (distance <= 0) return p.sameZone;
  if (distance === 1) return p.adjacentZone;
  return p.twoZonesAway;
}

/**
 * ADR-036 — the bands a recovery can actually be attempted on. `DEAD` is not
 * one of them and is not merely discouraged from being one: it lacks
 * `finalTargetNumber`, so it is not assignable here.
 */
export type RecoverableBand = Extract<DeflectionQualityBand, { recoverable: true }>;

export interface RecoveryAttemptArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly candidate: EligibleRecoverer;
  /**
   * ADR-036: this used to be the whole union PLUS a separate
   * `finalTargetNumber: number`, so nothing stopped a caller pairing the `DEAD`
   * row with an invented threshold. The band now carries its own target and is
   * the only place the target comes from.
   */
  readonly band: RecoverableBand;
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
  const { candidate, band, tipRng, tunables } = args;
  const t = tunables.tippedBall.recovery;
  const who = candidate.player;
  const finalTargetNumber = band.finalTargetNumber;

  const handsAttr = resolveAttr(
    candidate.side === "OFFENSE" ? t.offenseHandsAttr : t.defenseHandsAttr,
  );

  const mods = compact([
    flatModifier(`Proximity: ${zoneProximityLabel(candidate.zoneDistance)}`, proximityModifier(tunables, candidate.zoneDistance)),
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
      tier: tierFor(tunables, margin),
      margin,
      testsAttrs: recoveryTestsAttrs(tunables, handsAttr),
    },
  };
}

function recoveryTestsAttrs(tunables: Tunables, handsAttr: AttrId): AttrId[] {
  return [handsAttr, ...tunables.tippedBall.recovery.attrTerms.map((term) => resolveAttr(term.attr))];
}

export function zoneProximityLabel(distance: number): string {
  if (distance <= 0) return "same zone";
  if (distance === 1) return "adjacent zone";
  return "two zones away";
}

/** Exposed so the §17 renderer can name the branch a Roll 1 margin selected. */
export function deflectionQualityBandFor(tunables: Tunables, margin: number): DeflectionQualityLabel {
  return bandFor(tunables.tippedBall.qualityBands, margin).label;
}
