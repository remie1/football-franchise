/** §10 — throw type, arm-strength gate, passing lane, accuracy. */
import { getAttr } from "@ff/contracts";
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import { chemistryEstablished, chemistrySupportsBackShoulder } from "../chemistry.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, flatModifier, rollD100, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { ContestPosition, PocketStatus, RouteDepthClass, ThrowType } from "../types.js";
import { accuracyModifierFor } from "./pocket.js";

export type AccuracyBandLabel = (Tunables["throwExec"]["accuracy"]["bands"])[number]["label"];
export type AccuracyBand = (Tunables["throwExec"]["accuracy"]["bands"])[number];

/** §10.2 — deterministic throw-type selection from the situation. */
export function selectThrowType(
  tunables: Tunables,
  depthClass: RouteDepthClass,
  effectiveOpenness: number,
): ThrowType {
  const t = tunables.throwExec.typeSelection;
  if (effectiveOpenness <= t.tightWindowMaxOpenness) return "BULLET";
  const touch: readonly string[] = t.touchDepthClasses;
  if (touch.includes(depthClass)) return "TOUCH";
  const bullet: readonly string[] = t.bulletDepthClasses;
  return bullet.includes(depthClass) ? "BULLET" : "TOUCH";
}

/** §10.1 — does this throw sit above the QB's arm-strength gate? */
export function armStrengthShortfall(tunables: Tunables, qb: PlayerState, airYards: number): boolean {
  const arm = getAttr(qb.attributes.values, ATTR.armStrength);
  for (const req of tunables.throwExec.armRequirements) {
    if (airYards >= req.minAirYards) return arm < req.minArmStrength;
  }
  return false;
}

export interface AccuracyOutcome {
  readonly band: AccuracyBandLabel;
  readonly bandEffects: AccuracyBand;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

export interface AccuracyArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly qb: PlayerState;
  readonly airYards: number;
  readonly throwType: ThrowType;
  readonly pocket: PocketStatus;
  readonly armShortfall: boolean;
  /**
   * ADR-008 — this pair's 0-100 rapport, already resolved by the caller.
   * Omitted reads neutral, which produces neither §10.4's +5 nor §10.2's −10.
   */
  readonly chemistryLevel?: number;
  readonly throwRng: Rng;
}

export function resolveAccuracy(args: AccuracyArgs): AccuracyOutcome {
  const { qb, airYards, throwType, pocket, armShortfall, throwRng, tunables } = args;
  const t = tunables.throwExec.accuracy;
  const chemistry = args.chemistryLevel ?? tunables.chemistry.neutralLevel;

  const pocketPenalty = accuracyModifierFor(tunables, pocket);
  const poiseRefundRaw = Math.max(
    0,
    Math.round((getAttr(qb.attributes.values, ATTR.poise) - tunables.qb.poise.baseline) / tunables.qb.poise.divisor),
  );
  const poiseRefund = Math.min(poiseRefundRaw, Math.abs(pocketPenalty));

  const depth = t.depthModifier;
  const depthMod =
    airYards < depth.shortMaxYards
      ? flatModifier(`Depth: short (<${depth.shortMaxYards} yds)`, depth.shortBonus)
      : airYards <= depth.intermediateMaxYards
        ? flatModifier("Depth: intermediate", depth.intermediateBonus)
        : flatModifier("Depth: deep", depth.deepBonus);

  const mods = compact([
    actorAttrModifier(qb, "Accuracy", ATTR.accuracy, t.attrDivisor),
    flatModifier(`Pocket: ${pocket}`, pocketPenalty),
    pocketPenalty < 0
      ? { source: `${qb.bio.position} Poise (pressure resistance)`, attr: ATTR.poise, value: poiseRefund }
      : undefined,
    depthMod,
    flatModifier(`Throw type: ${throwType}`, t.throwTypeModifier[throwType]),
    armShortfall
      ? flatModifier("Below arm-strength threshold (§10.1)", tunables.throwExec.underArmThresholdAccuracyPenalty)
      : undefined,
    // §10.4 verbatim: "Chemistry with receiver: +5" (ADR-008).
    chemistryEstablished(tunables, chemistry)
      ? flatModifier(`Chemistry with receiver (${chemistry})`, tunables.chemistry.establishedAccuracyBonus)
      : undefined,
    // §10.2: the back-shoulder throw "requires chemistry (else −10)". WIRED AND
    // DORMANT — `selectThrowType` never returns BACK_SHOULDER today, so this is
    // unreachable until §10.2's selection grows the branch. It is placed here
    // rather than held in reserve so that the day it does, the penalty is
    // already correct and already in the printout.
    throwType === "BACK_SHOULDER" && !chemistrySupportsBackShoulder(tunables, chemistry)
      ? flatModifier("Back shoulder without chemistry (§10.2)", tunables.chemistry.backShoulderWithoutChemistry)
      : undefined,
  ]);

  const roll = rollD100(throwRng.fork("accuracy"), mods);
  const margin = roll.total - t.target;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    bandEffects: band,
    margin,
    roll,
    check: {
      checkKind: "accuracy",
      actors: [qb.bio.id],
      roll,
      target: t.target,
      tier: tierFor(tunables, margin),
      // ADR-011 — §10.4's PLACEMENT BAND, and the reason the whole amendment
      // exists: it drives the catch modifier, the defender's contest modifier,
      // the catch difficulty and §10.5's YAC multiplier. `THROW.rollRef` points
      // here rather than copying it.
      band: band.label,
      margin,
      testsAttrs: armShortfall ? [ATTR.accuracy, ATTR.poise, ATTR.armStrength] : [ATTR.accuracy, ATTR.poise],
    },
  };
}

export interface PassingLaneOutcome {
  readonly deflected: boolean;
  readonly margin: number;
  readonly target: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

export interface PassingLaneArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly defender: PlayerState;
  readonly quarterback: PlayerState;
  readonly throwType: ThrowType;
  readonly throwRng: Rng;
}

/**
 * §10.3 — a defender close enough to the target can get into the throwing lane.
 * Success is a deflection; the tipped-ball system is out of this slice, so a
 * deflection is resolved as a batted-down incompletion.
 */
export function resolvePassingLane(args: PassingLaneArgs): PassingLaneOutcome {
  const { defender, quarterback, throwType, throwRng, tunables } = args;
  const t = tunables.throwExec.lane;

  const angleKey = t.angleByThrowType[throwType];
  const target = t.target + t.velocityModifier[throwType] + t.angleModifier[angleKey];

  const mods = compact([
    actorAttrModifier(defender, "Reaction", ATTR.reaction, t.attrDivisor),
    actorAttrModifier(defender, "Ball Skills", ATTR.ballSkills, t.attrDivisor),
  ]);

  const roll = rollD100(throwRng.fork(`lane:${defender.bio.id}`), mods);
  const margin = roll.total - target;

  return {
    deflected: margin >= 0,
    margin,
    target,
    roll,
    check: {
      checkKind: "passing_lane",
      actors: [defender.bio.id, quarterback.bio.id],
      roll,
      target,
      tier: tierFor(tunables, margin),
      margin,
      testsAttrs: [ATTR.reaction, ATTR.ballSkills],
    },
  };
}

/** §10.3 — is this defender actually in the throwing lane? */
export function laneDefenderEligible(
  tunables: Tunables,
  contestPosition: ContestPosition,
  actualOpenness: number,
): boolean {
  const eligible: readonly string[] = tunables.throwExec.lane.eligibleContestPositions;
  return eligible.includes(contestPosition) && actualOpenness <= tunables.throwExec.lane.contestOpennessMax;
}
