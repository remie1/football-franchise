/**
 * SPECIAL TEAMS — PLACEHOLDER DEPTH, DECLARED AS SUCH.
 *
 * ================== WHAT THIS FILE IS AND IS NOT ==================
 * `docs/design/match-engine.md` specifies the kicking game NOWHERE. There is no
 * §-anything for a field goal, a punt, a kickoff or a return; the attribute
 * tables (§4.1-§4.9) have no kicker and no punter.
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
 * ================== WHAT ADR-014 CHANGED HERE ==================
 *
 * ATTRIBUTES. `TUNABLES.game.specialTeams.*Attr` used to point at `strength` and
 * `accuracy` — real registry ids that mean something else — because the registry
 * had no kicking attribute at all. It now has `kickPower`, `kickAccuracy`,
 * `puntPower` and `puntHangTime`, and the tunables point at them. NO RESOLUTION
 * CHANGED: `MIGRATION_V2_TO_V3` seeds each new attribute from exactly the id
 * that stood in for it, so a migrated roster kicks identically, roll for roll
 * (`test/tunablesThreading.test.ts` asserts it against the old mapping). The one
 * thing that did change is the modifier LABELS — see the note in
 * `resolvePlacekick`.
 *
 * ROLLS. These no longer ride inline on their own events. Each resolver returns
 * a `CheckEmission`, the loop emits it as a `CHECK` (`field_goal`, `punt`,
 * `kick_return`), and `PLACEKICK` / `PUNT` / `KICKOFF` carry only `rollRef`s —
 * ADR-004's rule, with the exception it never chose now closed.
 *
 * ⚠ TWO OF THESE CHECKS ROLL A d20 AGAINST A NEUTRAL DIE RATHER THAN A TARGET.
 * A punt and a return produce a DISTANCE, not a pass or a fail, so there is no
 * target number to state and no band table to name. `target` is therefore the
 * neutral die (the value at which the variance term contributes nothing) and
 * `margin` is the deviation from it, which is exactly the quantity that moves
 * the yardage. `band` is absent, which per ADR-011 means "no band table behind
 * this resolution" — never "the band was not worth carrying".
 */
import { getAttr } from "@ff/contracts";
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { attrName, resolveAttr } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, clamp, compact, rollD100, rollD20, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";

/** The four registry ids the kicking game reads, resolved from the tunables. */
function attrs(tunables: Tunables) {
  const st = tunables.game.specialTeams;
  return {
    kickerLeg: resolveAttr(st.kickerLegAttr),
    kickerAccuracy: resolveAttr(st.kickerAccuracyAttr),
    punterLeg: resolveAttr(st.punterLegAttr),
    returnerSpeed: resolveAttr(st.returnerSpeedAttr),
  };
}

// --- the placekick ----------------------------------------------------------

export interface PlacekickResult {
  readonly made: boolean;
  readonly band: string;
  readonly target: number;
  readonly distanceYards: number;
  /** ADR-004: the roll lives HERE, once. `check.roll.rngLabel` is the join key. */
  readonly check: CheckEmission;
}

/**
 * §none — a field goal or an extra point as ONE opposed-to-nothing check.
 *
 * Target rises linearly with distance from `baseTarget` at `baseDistanceYards`.
 * Calibrated against real NFL make rates for a 70/70 kicker (+28 of modifier):
 * roughly 95% from 30, 80% from 40, 65% from 50.
 */
export function resolvePlacekick(args: {
  readonly tunables: Tunables;
  readonly kicker: PlayerState;
  readonly distanceYards: number;
  readonly rng: Rng;
}): PlacekickResult {
  const { tunables } = args;
  const ST = tunables.game.specialTeams;
  const a = attrs(tunables);
  const fg = ST.fieldGoal;
  const target = Math.round(
    fg.baseTarget + (args.distanceYards - fg.baseDistanceYards) * fg.targetPerYardOver,
  );
  // The attribute half of every source is the REGISTRY'S display name, looked
  // up — never a hand-written label. Before ADR-014 these read "K Leg" and
  // "K Placement" over `strength` and `accuracy`, which was the last place in
  // the engine where the stream named an attribute a way the registry does not.
  const modifiers = compact([
    actorAttrModifier(args.kicker, attrName(a.kickerLeg), a.kickerLeg, ST.attrDivisor),
    actorAttrModifier(args.kicker, attrName(a.kickerAccuracy), a.kickerAccuracy, ST.attrDivisor),
  ]);
  const roll = rollD100(args.rng, modifiers);
  const margin = roll.total - target;
  const band = bandFor(fg.bands, margin);
  return {
    made: band.made,
    band: band.label,
    target,
    distanceYards: args.distanceYards,
    check: {
      checkKind: "field_goal",
      actors: [args.kicker.bio.id],
      roll,
      target,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [a.kickerLeg, a.kickerAccuracy],
    },
  };
}

/** Distance of the field goal that would be attempted from this spot. */
export function fieldGoalDistanceFrom(tunables: Tunables, ballOn: number): number {
  return 100 - ballOn + tunables.game.specialTeams.fieldGoal.snapAndHoldYards;
}

/**
 * Where the defence takes over after a miss: the spot of the kick, or its own
 * 20, whichever is further from its goal line. Stated in the DEFENCE's own
 * coordinates (yards from ITS goal line).
 */
export function missedFieldGoalYardLine(tunables: Tunables, ballOn: number): number {
  const fg = tunables.game.specialTeams.fieldGoal;
  const spotOfKick = ballOn - fg.missSpotYardsBehindLos;
  return Math.max(fg.missMinimumYardLine, 100 - spotOfKick);
}

// --- the kickoff ------------------------------------------------------------

export interface KickoffResult {
  readonly touchback: boolean;
  readonly returnYards: number;
  /** Yards from the RECEIVING team's own goal line. */
  readonly resultYardLine: number;
  readonly check: CheckEmission;
  readonly returnCheck: CheckEmission | undefined;
}

/**
 * One check for depth (touchback or not) and, if it comes back, one for the
 * return. A kick-return touchdown is NOT reachable: `maxReturnYards` (60) from
 * `returnStartYardLine` (5) tops out at the receiving team's 65. That is a known
 * missing outcome, not an oversight.
 *
 * Both rolls are `kick_return` CHECKs. ADR-014 §C considered and DECLINED a
 * separate `kickoff` member ("a placekick is a placekick; the distance and the
 * situation are on the event"), so the leg roll and the return roll share the
 * kind and are told apart by `actors` and by the `KICKOFF` event beside them.
 */
export function resolveKickoff(args: {
  readonly tunables: Tunables;
  readonly kicker: PlayerState;
  readonly returner: PlayerState;
  readonly rng: Rng;
}): KickoffResult {
  const { tunables } = args;
  const ST = tunables.game.specialTeams;
  const a = attrs(tunables);
  const ko = ST.kickoff;
  const roll = rollD100(
    args.rng.fork("kick"),
    compact([actorAttrModifier(args.kicker, attrName(a.kickerLeg), a.kickerLeg, ST.attrDivisor)]),
  );
  const margin = roll.total - ko.touchbackTarget;
  const check: CheckEmission = {
    checkKind: "kick_return",
    actors: [args.kicker.bio.id],
    roll,
    target: ko.touchbackTarget,
    tier: tierFor(tunables, margin),
    margin,
    testsAttrs: [a.kickerLeg],
  };

  if (roll.total >= ko.touchbackTarget) {
    return {
      touchback: true,
      returnYards: 0,
      resultYardLine: ko.touchbackYardLine,
      check,
      returnCheck: undefined,
    };
  }

  const returnRoll = rollD20(
    args.rng.fork("return"),
    compact([
      actorAttrModifier(args.returner, attrName(a.returnerSpeed), a.returnerSpeed, ST.attrDivisor),
    ]),
  );
  const returnYards = returnYardsFrom({
    base: ko.returnBaseYards,
    speed: getAttr(args.returner.attributes.values, a.returnerSpeed),
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
    check,
    returnCheck: distanceCheck(tunables, {
      checkKind: "kick_return",
      actor: args.returner,
      roll: returnRoll,
      neutralDie: -ko.returnVarianceDieOffset,
      testsAttrs: [a.returnerSpeed],
    }),
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
  readonly check: CheckEmission;
  readonly returnCheck: CheckEmission | undefined;
}

/**
 * Gross distance from one roll, then a return from another unless the ball is in
 * the receiving team's own end (`downedInsideYardLine`), which stands in for the
 * whole fair-catch / coffin-corner / let-it-bounce apparatus.
 */
export function resolvePunt(args: {
  readonly tunables: Tunables;
  readonly punter: PlayerState;
  readonly returner: PlayerState;
  /** Yards from the PUNTING team's own goal line. */
  readonly fromYardLine: number;
  readonly rng: Rng;
}): PuntResult {
  const { tunables } = args;
  const ST = tunables.game.specialTeams;
  const a = attrs(tunables);
  const p = ST.punt;
  const roll = rollD20(
    args.rng.fork("punt"),
    compact([actorAttrModifier(args.punter, attrName(a.punterLeg), a.punterLeg, ST.attrDivisor)]),
  );
  const check = distanceCheck(tunables, {
    checkKind: "punt",
    actor: args.punter,
    roll,
    neutralDie: -p.varianceDieOffset,
    testsAttrs: [a.punterLeg],
  });
  const legPoints = getAttr(args.punter.attributes.values, a.punterLeg);
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
      check,
      returnCheck: undefined,
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
      check,
      returnCheck: undefined,
    };
  }

  const returnRoll = rollD20(
    args.rng.fork("return"),
    compact([
      actorAttrModifier(args.returner, attrName(a.returnerSpeed), a.returnerSpeed, ST.attrDivisor),
    ]),
  );
  const returnYards = returnYardsFrom({
    base: p.returnBaseYards,
    speed: getAttr(args.returner.attributes.values, a.returnerSpeed),
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
    check,
    returnCheck: distanceCheck(tunables, {
      checkKind: "kick_return",
      actor: args.returner,
      roll: returnRoll,
      neutralDie: -p.returnVarianceDieOffset,
      testsAttrs: [a.returnerSpeed],
    }),
  };
}

// --- shared -----------------------------------------------------------------

/**
 * A CHECK for a roll that produces a DISTANCE rather than a verdict. See the
 * ⚠ note at the top of the file: `target` is the neutral die and `margin` is the
 * deviation from it, so the number in the stream is the one that moved the ball.
 */
function distanceCheck(
  tunables: Tunables,
  args: {
    readonly checkKind: CheckEmission["checkKind"];
    readonly actor: PlayerState;
    readonly roll: RollDetail;
    readonly neutralDie: number;
    readonly testsAttrs: CheckEmission["testsAttrs"];
  },
): CheckEmission {
  const margin = args.roll.total - args.neutralDie;
  return {
    checkKind: args.checkKind,
    actors: [args.actor.bio.id],
    roll: args.roll,
    target: args.neutralDie,
    tier: tierFor(tunables, margin),
    margin,
    testsAttrs: args.testsAttrs,
  };
}

/**
 * One return, in yards. Deterministic in its inputs: a base, a speed term
 * measured against a baseline, and one die. Deliberately identical in shape for
 * kickoffs and punts — the two differ only by their tunables row, which is the
 * `ballCarrier` block's "one mechanic, several profiles" pattern.
 */
function returnYardsFrom(args: {
  readonly base: number;
  readonly speed: number;
  readonly baseline: number;
  readonly perSpeedPoint: number;
  readonly die: number;
  readonly dieOffset: number;
  readonly perDiePoint: number;
  readonly min: number;
  readonly max: number;
}): number {
  return clamp(
    Math.round(
      args.base +
        (args.speed - args.baseline) * args.perSpeedPoint +
        (args.die + args.dieOffset) * args.perDiePoint,
    ),
    args.min,
    args.max,
  );
}
