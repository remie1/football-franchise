/**
 * §6.2, §6.3, §6.4 — THE LINE OF SCRIMMAGE ON A RUN.
 *
 * Three rolls, and they are three different questions:
 *
 *   §6.3 RUN BLOCK ENGAGEMENT (`run_block`) — one blocker against one defender
 *        in one gap, both schemes. `d100 + RunBlock÷5 + Strength÷5` against
 *        `d100 + RunStuff÷5 + Strength÷5`, plus the double-team and pulling
 *        modifiers. Symmetric in terms, unlike §7.1 — the run game does not have
 *        the pass rush's structural asymmetry (backlog entry 3).
 *
 *   §6.2 GAP INTEGRITY (`gap_battle`) — ZONE SCHEME ONLY. "For each gap, check
 *        if defender maintains gap integrity: Defender Gap Discipline vs. OL
 *        Zone Execution." This is a separate roll from the engagement and it is
 *        what produces §6.2's "cutback lanes available if defense overflows": a
 *        defender who loses it has run himself out of his gap, and the lane
 *        behind him is live for a back with the vision to see it. It is also the
 *        only thing in the engine that reads `gapDiscipline`.
 *
 *   §6.4 SECOND-LEVEL CLIMB (`second_level_climb`) — triggered by winning the
 *        first level by 10+. `d100 + Awareness÷5 + Sustain÷5` against
 *        `50 + LB Play Recognition÷5`. Success takes a linebacker out of the
 *        play; failure leaves him free, and he shows up in §14.4's second level.
 *
 * ⚠ §6.3's result table and §14.3's disagree about the same margin. See the
 * warning on `TUNABLES.runBlock.bands`. Neither is rescaled here.
 */
import { getAttr } from "@ff/contracts";
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { bandFor, compact, flatModifier, rollD100, tierFor, traitModifier } from "../rolls.js";
import { termAttrs, termModifiers } from "../terms.js";
import { TUNABLES } from "../tunables.js";

export type RunBlockBandLabel = (typeof TUNABLES.runBlock.bands)[number]["label"];

export interface RunBlockArgs {
  readonly blocker: PlayerState;
  readonly defender: PlayerState;
  /** §6.3 "Double team: +20 to OL". */
  readonly doubleTeam: boolean;
  /** §6.3 "Pulling blocker in space: −10 to OL, +10 to defender". */
  readonly pulling: boolean;
  readonly blockRng: Rng;
}

export interface RunBlockOutcome {
  readonly band: RunBlockBandLabel;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly opposedRoll: RollDetail;
  readonly check: CheckEmission;
}

export function resolveRunBlock(args: RunBlockArgs): RunBlockOutcome {
  const t = TUNABLES.runBlock;

  const blockerMods = compact([
    ...termModifiers(args.blocker, t.blockerTerms),
    args.doubleTeam ? flatModifier("Double team (§6.3)", t.doubleTeamBonus) : undefined,
    args.pulling ? flatModifier("Pulling in space (§6.3)", t.pullingBlockerPenalty) : undefined,
    traitModifier("Trait: Road Grader", args.blocker.attributes.traits, TRAIT.roadGrader, t.traits.roadGrader),
  ]);
  const defenderMods = compact([
    ...termModifiers(args.defender, t.defenderTerms),
    args.pulling ? flatModifier("Blocker pulling (§6.3)", t.pullingDefenderBonus) : undefined,
    traitModifier("Trait: Run Stuffer", args.defender.attributes.traits, TRAIT.runStuffer, t.traits.runStuffer),
  ]);

  const roll = rollD100(args.blockRng.fork("ol"), blockerMods);
  const opposedRoll = rollD100(args.blockRng.fork("dl"), defenderMods);
  const margin = roll.total - opposedRoll.total;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    margin,
    roll,
    opposedRoll,
    check: {
      checkKind: "run_block",
      actors: [args.blocker.bio.id, args.defender.bio.id],
      roll,
      opposedRoll,
      tier: tierFor(margin),
      band: band.label,
      margin,
      testsAttrs: [...termAttrs(t.blockerTerms), ...termAttrs(t.defenderTerms)],
    },
  };
}

export function runBlockBandFor(margin: number): RunBlockBandLabel {
  return bandFor(TUNABLES.runBlock.bands, margin).label;
}

// --- §6.2 zone scheme: gap integrity -----------------------------------------

export interface GapIntegrityArgs {
  readonly blocker: PlayerState;
  readonly defender: PlayerState;
  readonly gapRng: Rng;
}

export interface GapIntegrityOutcome {
  readonly band: string;
  readonly margin: number;
  /** He lost his gap. The lane behind him is a cutback (§6.2). */
  readonly overflowed: boolean;
  readonly roll: RollDetail;
  readonly opposedRoll: RollDetail;
  readonly check: CheckEmission;
}

/**
 * Margin is DEFENDER minus blocker — the doc writes it "Defender Gap Discipline
 * vs. OL Zone Execution", defender first, and the thing being tested is whether
 * the DEFENCE holds. A defender who wins keeps his gap.
 */
export function resolveGapIntegrity(args: GapIntegrityArgs): GapIntegrityOutcome {
  const t = TUNABLES.runBlock.gapIntegrity;

  const defenderMods = compact(termModifiers(args.defender, t.defenderTerms));
  const blockerMods = compact(termModifiers(args.blocker, t.blockerTerms));

  const roll = rollD100(args.gapRng.fork("dl"), defenderMods);
  const opposedRoll = rollD100(args.gapRng.fork("ol"), blockerMods);
  const margin = roll.total - opposedRoll.total;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    margin,
    overflowed: band.overflowed,
    roll,
    opposedRoll,
    check: {
      checkKind: "gap_battle",
      actors: [args.defender.bio.id, args.blocker.bio.id],
      roll,
      opposedRoll,
      tier: tierFor(margin),
      band: band.label,
      margin,
      testsAttrs: [...termAttrs(t.defenderTerms), ...termAttrs(t.blockerTerms)],
    },
  };
}

// --- §6.4 second-level climb -------------------------------------------------

export interface SecondLevelClimbArgs {
  readonly climber: PlayerState;
  readonly linebacker: PlayerState;
  readonly climbRng: Rng;
}

export interface SecondLevelClimbOutcome {
  /** SUCCESS: "LB engaged, clean lane for RB". */
  readonly engaged: boolean;
  readonly margin: number;
  readonly target: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

/** §6.4 "Triggers when OL wins first-level block by 10+". */
export function climbTriggered(firstLevelMargin: number): boolean {
  return firstLevelMargin >= TUNABLES.runBlock.secondLevelClimb.triggerMinMargin;
}

export function resolveSecondLevelClimb(args: SecondLevelClimbArgs): SecondLevelClimbOutcome {
  const t = TUNABLES.runBlock.secondLevelClimb;

  const target =
    t.target +
    Math.round(
      getAttr(args.linebacker.attributes.values, ATTR.playRecognition) / t.defenderAttrDivisor,
    );
  const mods = compact(termModifiers(args.climber, t.climberTerms));
  const roll = rollD100(args.climbRng, mods);
  const margin = roll.total - target;

  return {
    engaged: margin >= 0,
    margin,
    target,
    roll,
    check: {
      checkKind: "second_level_climb",
      actors: [args.climber.bio.id, args.linebacker.bio.id],
      roll,
      target,
      tier: tierFor(margin),
      margin,
      testsAttrs: [...termAttrs(t.climberTerms), ATTR.playRecognition],
    },
  };
}
