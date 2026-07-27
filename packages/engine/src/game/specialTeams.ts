/**
 * SPECIAL TEAMS — PLACEHOLDER DEPTH, DECLARED AS SUCH.
 *
 * ================== WHAT THIS FILE IS AND IS NOT ==================
 * `docs/design/match-engine.md` specifies the kicking game NOWHERE. There is no
 * §-anything for a field goal, a punt, a kickoff or a return; the attribute
 * tables (§4.1-§4.9) have no kicker and no punter, and `ATTRIBUTE_REGISTRY_V1`
 * has no kicking attribute of any kind. What exists is three `Position` values
 * — K, P, LS — and a game that cannot end without them.
 *
 * So this is three PROBABILISTIC RESOLVERS, one check each, sized so the macro
 * numbers calibration needs (starting field position, points per drive, drives
 * per game) are not obviously wrong. Everything a real special-teams model has
 * is absent, and the absences are the backlog item, not a defect:
 *
 *   no snap, no hold, no operation time      no block
 *   no protection or coverage units          no directional kicking or hang time
 *   no fair catch, no muff, no fumble        no onside kick
 *   no return blocking or return scheme      no kick- or punt-return touchdown
 *   no long snapper                          no weather (§16 is unimplemented)
 *   no fake, no rugby punt, no coffin corner  no roughing/running-into penalties
 *
 * ⚠ ATTRIBUTES: INTERIM. `TUNABLES.game.specialTeams.*Attr` currently point at
 * `strength` and `accuracy`, which are real registry ids that mean something
 * else. A kicker's leg IS NOT a lineman's strength and a kicker's placement IS
 * NOT a passer's accuracy; they are stand-ins so that kickers differ from each
 * other at all, and so nothing local is invented. ADR-014 petitions for
 * `kickPower`, `kickAccuracy`, `puntPower` and `puntHangTime`. When it lands,
 * the four `*Attr` fields in tunables change and no code here does.
 *
 * ⚠ ROLLS: INTERIM. These rolls ride on their own events rather than on `CHECK`,
 * because `CheckKind` is closed and has no member for any of them. See
 * `game/events.ts`.
 * =================================================================
 */
import { getAttr } from "@ff/contracts";
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { resolveAttr } from "../attrs.js";
import { attrModifier, bandFor, clamp, compact, rollD100, rollD20 } from "../rolls.js";
import { TUNABLES } from "../tunables.js";

const ST = TUNABLES.game.specialTeams;

const KICKER_LEG = resolveAttr(ST.kickerLegAttr);
const KICKER_ACCURACY = resolveAttr(ST.kickerAccuracyAttr);
const PUNTER_LEG = resolveAttr(ST.punterLegAttr);
const RETURNER_SPEED = resolveAttr(ST.returnerSpeedAttr);

// --- the placekick ----------------------------------------------------------

export interface PlacekickResult {
  readonly made: boolean;
  readonly band: string;
  readonly target: number;
  readonly roll: RollDetail;
  readonly distanceYards: number;
}

/**
 * §none — a field goal or an extra point as ONE opposed-to-nothing check.
 *
 * Target rises linearly with distance from `baseTarget` at `baseDistanceYards`.
 * Calibrated against real NFL make rates for a 70/70 kicker (+28 of modifier):
 * roughly 95% from 30, 80% from 40, 65% from 50.
 */
export function resolvePlacekick(args: {
  readonly kicker: PlayerState;
  readonly distanceYards: number;
  readonly rng: Rng;
}): PlacekickResult {
  const fg = ST.fieldGoal;
  const target = Math.round(
    fg.baseTarget + (args.distanceYards - fg.baseDistanceYards) * fg.targetPerYardOver,
  );
  const modifiers = compact([
    attrModifier("K Leg", args.kicker.attributes.values, KICKER_LEG, ST.attrDivisor),
    attrModifier("K Placement", args.kicker.attributes.values, KICKER_ACCURACY, ST.attrDivisor),
  ]);
  const roll = rollD100(args.rng, modifiers);
  const margin = roll.total - target;
  const band = bandFor(fg.bands, margin);
  return { made: band.made, band: band.label, target, roll, distanceYards: args.distanceYards };
}

/** Distance of the field goal that would be attempted from this spot. */
export function fieldGoalDistanceFrom(ballOn: number): number {
  return 100 - ballOn + ST.fieldGoal.snapAndHoldYards;
}

/**
 * Where the defence takes over after a miss: the spot of the kick, or its own
 * 20, whichever is further from its goal line. Stated in the DEFENCE's own
 * coordinates (yards from ITS goal line).
 */
export function missedFieldGoalYardLine(ballOn: number): number {
  const spotOfKick = ballOn - ST.fieldGoal.missSpotYardsBehindLos;
  return Math.max(ST.fieldGoal.missMinimumYardLine, 100 - spotOfKick);
}

// --- the kickoff ------------------------------------------------------------

export interface KickoffResult {
  readonly touchback: boolean;
  readonly returnYards: number;
  /** Yards from the RECEIVING team's own goal line. */
  readonly resultYardLine: number;
  readonly roll: RollDetail;
  readonly returnRoll: RollDetail | undefined;
}

/**
 * One check for depth (touchback or not) and, if it comes back, one for the
 * return. A kick-return touchdown is NOT reachable: `maxReturnYards` (60) from
 * `returnStartYardLine` (5) tops out at the receiving team's 65. That is a known
 * missing outcome, not an oversight.
 */
export function resolveKickoff(args: {
  readonly kicker: PlayerState;
  readonly returner: PlayerState;
  readonly rng: Rng;
}): KickoffResult {
  const ko = ST.kickoff;
  const roll = rollD100(
    args.rng.fork("kick"),
    compact([attrModifier("K Leg", args.kicker.attributes.values, KICKER_LEG, ST.attrDivisor)]),
  );
  if (roll.total >= ko.touchbackTarget) {
    return {
      touchback: true,
      returnYards: 0,
      resultYardLine: ko.touchbackYardLine,
      roll,
      returnRoll: undefined,
    };
  }
  const returnRoll = rollD20(
    args.rng.fork("return"),
    compact([
      attrModifier("KR Speed", args.returner.attributes.values, RETURNER_SPEED, ST.attrDivisor),
    ]),
  );
  const returnYards = returnYardsFrom({
    base: ko.returnBaseYards,
    returner: args.returner,
    baseline: ko.returnerBaseline,
    perSpeedPoint: ko.returnYardsPerSpeedPoint,
    die: returnRoll.raw,
    dieOffset: ko.returnVarianceDieOffset,
    perDiePoint: ko.returnVarianceYardsPerPoint,
    min: ko.minReturnYards,
    max: ko.maxReturnYards,
  });
  return {
    touchback: false,
    returnYards,
    resultYardLine: clamp(ko.returnStartYardLine + returnYards, 1, 99),
    roll,
    returnRoll,
  };
}

// --- the punt ---------------------------------------------------------------

export interface PuntResult {
  readonly grossYards: number;
  readonly touchback: boolean;
  readonly downed: boolean;
  readonly returnYards: number;
  /** Yards from the RECEIVING team's own goal line. */
  readonly resultYardLine: number;
  readonly roll: RollDetail;
  readonly returnRoll: RollDetail | undefined;
}

/**
 * Gross distance from one roll, then a return from another unless the ball is in
 * the receiving team's own end (`downedInsideYardLine`), which stands in for the
 * whole fair-catch / coffin-corner / let-it-bounce apparatus.
 */
export function resolvePunt(args: {
  readonly punter: PlayerState;
  readonly returner: PlayerState;
  /** Yards from the PUNTING team's own goal line. */
  readonly fromYardLine: number;
  readonly rng: Rng;
}): PuntResult {
  const p = ST.punt;
  const roll = rollD20(
    args.rng.fork("punt"),
    compact([attrModifier("P Leg", args.punter.attributes.values, PUNTER_LEG, ST.attrDivisor)]),
  );
  const legPoints = getAttr(args.punter.attributes.values, PUNTER_LEG);
  const gross = clamp(
    Math.round(
      p.baseGrossYards +
        (legPoints - p.legBaseline) * p.legYardsPerPoint +
        (roll.raw + p.varianceDieOffset) * p.varianceYardsPerPoint,
    ),
    p.minGrossYards,
    p.maxGrossYards,
  );

  const landsAt = args.fromYardLine + gross;
  if (landsAt >= 100) {
    return {
      grossYards: gross,
      touchback: true,
      downed: false,
      returnYards: 0,
      resultYardLine: p.touchbackYardLine,
      roll,
      returnRoll: undefined,
    };
  }

  const fieldedAt = 100 - landsAt;
  if (fieldedAt < p.downedInsideYardLine) {
    return {
      grossYards: gross,
      touchback: false,
      downed: true,
      returnYards: 0,
      resultYardLine: Math.max(1, fieldedAt),
      roll,
      returnRoll: undefined,
    };
  }

  const returnRoll = rollD20(
    args.rng.fork("return"),
    compact([
      attrModifier("PR Speed", args.returner.attributes.values, RETURNER_SPEED, ST.attrDivisor),
    ]),
  );
  const returnYards = returnYardsFrom({
    base: p.returnBaseYards,
    returner: args.returner,
    baseline: p.returnerBaseline,
    perSpeedPoint: p.returnYardsPerSpeedPoint,
    die: returnRoll.raw,
    dieOffset: p.returnVarianceDieOffset,
    perDiePoint: p.returnVarianceYardsPerPoint,
    min: p.minReturnYards,
    max: p.maxReturnYards,
  });
  return {
    grossYards: gross,
    touchback: false,
    downed: false,
    returnYards,
    resultYardLine: clamp(fieldedAt + returnYards, 1, 99),
    roll,
    returnRoll,
  };
}

// --- shared -----------------------------------------------------------------

/**
 * One return, in yards. Deterministic in its inputs: a base, a speed term
 * measured against a baseline, and one die. Deliberately identical in shape for
 * kickoffs and punts — the two differ only by their tunables row, which is the
 * `ballCarrier` block's "one mechanic, several profiles" pattern.
 */
function returnYardsFrom(args: {
  readonly base: number;
  readonly returner: PlayerState;
  readonly baseline: number;
  readonly perSpeedPoint: number;
  readonly die: number;
  readonly dieOffset: number;
  readonly perDiePoint: number;
  readonly min: number;
  readonly max: number;
}): number {
  const speed = getAttr(args.returner.attributes.values, RETURNER_SPEED);
  return clamp(
    Math.round(
      args.base +
        (speed - args.baseline) * args.perSpeedPoint +
        (args.die + args.dieOffset) * args.perDiePoint,
    ),
    args.min,
    args.max,
  );
}
