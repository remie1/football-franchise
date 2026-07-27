/**
 * §13 + §14.4 — THE BALL CARRIER. One set of machinery, two sections.
 *
 * A man with the ball in his hands is the same simulation problem whether he
 * caught it, was handed it, recovered a tip, or tucked it and ran as the pocket
 * came apart. Four mechanics do all of it:
 *
 *   1. `resolveTackleContest`  — carrier versus tackler, an opposed d100 whose
 *      attribute terms and result bands come from a PROFILE. §13.2's immediate
 *      YAC roll, §14.4's second-level tackle attempt, and §14.3's two contests
 *      at the line are the four profiles; they differ in what they test and what
 *      the bands pay, not in how they resolve.
 *   2. `resolveBlockInSpace`   — §13.3 / §14.5. Blocker's run block against the
 *      defender's ability to get off it. A defender who is not shed is out of
 *      the play for that zone.
 *   3. `resolvePursuitAngle`   — §14.4. A gate: fail it and there is no tackle
 *      attempt at all, because he did not get there.
 *   4. `resolveBreakaway`      — §13.4. Fires once, after the carrier clears the
 *      zone the doc names, and it is the only thing that can end a play in the
 *      end zone from open field.
 *
 * `advanceCarrier` drives them zone by zone (§13.1), and is the function both
 * `simulateRunPlay` and the pass play's post-catch phase call. What the two
 * modes disagree on is DATA, in `TUNABLES.ballCarrier`: which contest profile
 * applies, and which zones gate a tackle behind a pursuit check.
 *
 * WHAT NO DIE PRODUCES HERE. Where the doc gives a yardage RANGE ("gain 3-5
 * yards"), the position inside it is a deterministic function of the margin the
 * recorded roll already produced — never a second, unrecorded die. That is
 * ADR-007's rule for the rusher ETA applied to yardage.
 */
import { getAttr } from "@ff/contracts";
import type { CheckKind, PlayerId, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT, resolveAttr } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import {
  bandFor,
  compact,
  flatModifier,
  rollD100,
  tierFor,
  traitModifier,
} from "../rolls.js";
import { termAttrs, termModifiers } from "../terms.js";
import { TUNABLES } from "../tunables.js";
import type { BlockType, VerticalZone } from "../types.js";

// --- §13.2 / §14.3 / §14.4 — the tackle contest ------------------------------

export type ContestProfileKey = keyof typeof TUNABLES.ballCarrier.contests;

/**
 * The shape every contest band shares. The four profiles in tunables are
 * `as const` tuples of DIFFERENT literal types, so this is what lets one
 * resolver read all of them — the widening is here and explicit rather than an
 * `any` at the call site.
 */
export interface ContestBand {
  readonly label: string;
  readonly minMargin: number;
  readonly minYards: number;
  readonly maxYards: number;
  readonly tackled: boolean;
  readonly broken: boolean;
}

export interface TackleContestArgs {
  readonly carrier: PlayerState;
  readonly tackler: PlayerState;
  readonly profile: ContestProfileKey;
  /** §13.2's catch-transition modifiers. Empty for a runner. */
  readonly carrierModifiers?: readonly ReturnType<typeof flatModifier>[];
  readonly contestRng: Rng;
}

export interface TackleContestOutcome {
  readonly band: string;
  readonly margin: number;
  /** Yards gained in this encounter — never the whole play's yardage. */
  readonly yards: number;
  /** Is the carrier down? */
  readonly tackled: boolean;
  /** §17.2's "broken tackles" — a contest the carrier won outright. */
  readonly broken: boolean;
  readonly roll: RollDetail;
  readonly opposedRoll: RollDetail;
  readonly check: CheckEmission;
}

export function resolveTackleContest(args: TackleContestArgs): TackleContestOutcome {
  const t = TUNABLES.ballCarrier;
  const profile = t.contests[args.profile];

  const carrierMods = compact([
    ...termModifiers(args.carrier, profile.carrierTerms),
    traitModifier(
      "Trait: Power Runner",
      args.carrier.attributes.traits,
      TRAIT.powerRunner,
      t.carrierTraits.powerRunner,
    ),
    ...(args.carrierModifiers ?? []),
  ]);
  const tacklerMods = compact([
    ...termModifiers(args.tackler, profile.tacklerTerms),
    traitModifier(
      "Trait: High Motor",
      args.tackler.attributes.traits,
      TRAIT.highMotor,
      t.tacklerTraits.highMotor,
    ),
  ]);

  const roll = rollD100(args.contestRng.fork("carrier"), carrierMods);
  const opposedRoll = rollD100(args.contestRng.fork("tackler"), tacklerMods);
  const margin = roll.total - opposedRoll.total;
  const bands: readonly ContestBand[] = profile.bands;
  const band = bandFor(bands, margin);

  return {
    band: band.label,
    margin,
    yards: yardsInBand(band, margin),
    tackled: band.tackled,
    broken: band.broken,
    roll,
    opposedRoll,
    check: {
      checkKind: profile.checkKind as CheckKind,
      actors: [args.carrier.bio.id, args.tackler.bio.id],
      roll,
      opposedRoll,
      tier: tierFor(margin),
      margin,
      testsAttrs: [...termAttrs(profile.carrierTerms), ...termAttrs(profile.tacklerTerms)],
    },
  };
}

/**
 * Where inside a stated range a result lands. §13.2's "gain 3-5 yards" is a
 * range because a partial tackle is not one fixed distance; the doc does not say
 * a second die decides it, and rolling one would put a roll in the stream that
 * no CHECK records (ADR-004). So the margin does it: one extra yard per
 * `marginPerExtraYard` above the band floor, capped by the band's own maximum.
 */
export function yardsInBand(
  band: { readonly minMargin: number; readonly minYards: number; readonly maxYards: number },
  margin: number,
): number {
  if (band.maxYards <= band.minYards) return band.minYards;
  const over = Math.max(0, margin - band.minMargin);
  const extra = Math.floor(over / TUNABLES.ballCarrier.marginPerExtraYard);
  return Math.min(band.maxYards, band.minYards + extra);
}

// --- §13.3 / §14.5 — blocking in space ---------------------------------------

export interface BlockInSpaceArgs {
  readonly blocker: PlayerState;
  readonly defender: PlayerState;
  readonly blockType: BlockType;
  readonly blockRng: Rng;
}

export interface BlockInSpaceOutcome {
  readonly band: string;
  readonly margin: number;
  /** Is the defender out of this zone's play? */
  readonly occupied: boolean;
  readonly roll: RollDetail;
  readonly opposedRoll: RollDetail;
  readonly check: CheckEmission;
}

export function resolveBlockInSpace(args: BlockInSpaceArgs): BlockInSpaceOutcome {
  const t = TUNABLES.ballCarrier.blockInSpace;
  const profile = t.profiles[args.blockType];

  const blockerMods = compact([
    ...termModifiers(args.blocker, profile.blockerTerms),
    flatModifier(`${args.blockType} block (§13.3)`, profile.blockerBonus),
    traitModifier("Trait: Road Grader", args.blocker.attributes.traits, TRAIT.roadGrader, t.traits.roadGrader),
  ]);
  const defenderMods = compact(termModifiers(args.defender, profile.defenderTerms));

  const roll = rollD100(args.blockRng.fork("blocker"), blockerMods);
  const opposedRoll = rollD100(args.blockRng.fork("defender"), defenderMods);
  const margin = roll.total - opposedRoll.total;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    margin,
    occupied: band.occupied,
    roll,
    opposedRoll,
    check: {
      checkKind: t.checkKind as CheckKind,
      actors: [args.blocker.bio.id, args.defender.bio.id],
      roll,
      opposedRoll,
      tier: tierFor(margin),
      margin,
      testsAttrs: [...termAttrs(profile.blockerTerms), ...termAttrs(profile.defenderTerms)],
    },
  };
}

// --- §14.4 — the pursuit angle -----------------------------------------------

export interface PursuitAngleArgs {
  readonly carrier: PlayerState;
  readonly defender: PlayerState;
  readonly pursuitRng: Rng;
}

export interface PursuitAngleOutcome {
  /** He got there. Fail this and there is no tackle attempt at all. */
  readonly madePursuit: boolean;
  readonly margin: number;
  readonly target: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

/**
 * §14.4 verbatim, and note the target: `50 + (RB Speed − Defender Speed)`, a RAW
 * rating difference rather than a ÷5 one. That is the doc's, and it is the
 * biggest single term anywhere in the engine — a 95-speed back against a
 * 70-speed linebacker moves the target 25 points on its own.
 */
export function resolvePursuitAngle(args: PursuitAngleArgs): PursuitAngleOutcome {
  const t = TUNABLES.ballCarrier.pursuitAngle;
  const speed = resolveAttr(t.speedAttr);
  const target =
    t.target +
    getAttr(args.carrier.attributes.values, speed) -
    getAttr(args.defender.attributes.values, speed);

  const mods = compact([
    ...termModifiers(args.defender, t.defenderTerms),
    traitModifier(
      "Trait: High Motor",
      args.defender.attributes.traits,
      TRAIT.highMotor,
      TUNABLES.ballCarrier.tacklerTraits.highMotor,
    ),
  ]);
  const roll = rollD100(args.pursuitRng, mods);
  const margin = roll.total - target;

  return {
    madePursuit: margin >= 0,
    margin,
    target,
    roll,
    check: {
      checkKind: "pursuit_angle",
      actors: [args.defender.bio.id, args.carrier.bio.id],
      roll,
      target,
      tier: tierFor(margin),
      margin,
      testsAttrs: [...termAttrs(t.defenderTerms), speed],
    },
  };
}

// --- §13.4 — the breakaway ---------------------------------------------------

export interface BreakawayArgs {
  readonly carrier: PlayerState;
  readonly pursuer: PlayerState;
  readonly breakawayRng: Rng;
}

export interface BreakawayOutcome {
  readonly band: string;
  readonly margin: number;
  /** "Touchdown potential" — nobody left between him and the goal line. */
  readonly freeRun: boolean;
  readonly roll: RollDetail;
  readonly opposedRoll: RollDetail;
  readonly check: CheckEmission;
}

export function resolveBreakaway(args: BreakawayArgs): BreakawayOutcome {
  const t = TUNABLES.ballCarrier.breakaway;

  const carrierMods = compact([
    ...termModifiers(args.carrier, t.carrierTerms),
    traitModifier(
      "Trait: Home Run Hitter",
      args.carrier.attributes.traits,
      TRAIT.homeRunHitter,
      t.traits.homeRunHitter,
    ),
  ]);
  const pursuerMods = compact(termModifiers(args.pursuer, t.pursuerTerms));

  const roll = rollD100(args.breakawayRng.fork("carrier"), carrierMods);
  const opposedRoll = rollD100(args.breakawayRng.fork("pursuer"), pursuerMods);
  const margin = roll.total - opposedRoll.total;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    margin,
    freeRun: band.freeRun,
    roll,
    opposedRoll,
    check: {
      checkKind: "breakaway",
      actors: [args.carrier.bio.id, args.pursuer.bio.id],
      roll,
      opposedRoll,
      tier: tierFor(margin),
      margin,
      testsAttrs: [...termAttrs(t.carrierTerms), ...termAttrs(t.pursuerTerms)],
    },
  };
}

// --- the zone model ----------------------------------------------------------

/** §3.2 band → yards downfield, for placing a man in a §13.1 zone. */
export function depthOfVerticalZone(vertical: VerticalZone): number {
  return TUNABLES.ballCarrier.verticalDepthYards[vertical];
}

/**
 * §13.1 — which zone a defender standing `depthYards` downfield is in, relative
 * to a carrier at `carrierYards`. `undefined` means he is behind the play: the
 * doc's zone table is forward-only and does not model chasing from behind.
 */
export function zoneOfDefender(depthYards: number, carrierYards: number): number | undefined {
  const t = TUNABLES.ballCarrier;
  const ahead = depthYards - carrierYards;
  if (ahead < -t.behindReachYards) return undefined;
  let edge = 0;
  for (const zone of t.zones) {
    edge += zone.widthYards;
    if (ahead <= edge) return zone.zone;
  }
  return t.zones[t.zones.length - 1]?.zone;
}

export function zoneWidth(zone: number): number {
  return TUNABLES.ballCarrier.zones.find((z) => z.zone === zone)?.widthYards ?? 0;
}

// --- the advance -------------------------------------------------------------

export type CarrierMode = "YAC" | "RUSH";

/** A defender in the carrier's path, and the man (if any) assigned to him. */
export interface Pursuer {
  readonly defender: PlayerState;
  /** §13.1 zone, relative to where the carrier started. */
  readonly zone: number;
  readonly blocker?: PlayerState;
  readonly blockType?: BlockType;
}

export interface AdvanceArgs {
  readonly carrier: PlayerState;
  readonly mode: CarrierMode;
  readonly pursuers: readonly Pursuer[];
  /**
   * Yards he is ALREADY past his origin when the advance begins. Zero after a
   * catch; §14.3's "yards before contact" on a run, so a back who came through
   * a wide-open hole starts four yards into zone 1 rather than re-running it.
   */
  readonly startYards?: number;
  /** Yards from the carrier's start to the goal line. Caps the run. */
  readonly yardsToGoalLine: number;
  /** §13.2's catch-transition modifiers, applied to the zone-1 contest only. */
  readonly zone1CarrierModifiers?: readonly ReturnType<typeof flatModifier>[];
  readonly carrierRng: Rng;
  /** Every roll made here is published through this, in order. */
  readonly emitCheck: (check: CheckEmission) => void;
  /** One call per zone the carrier enters, with the yards he made in it. */
  readonly emitZone: (zone: number, yardsInZone: number) => void;
  /** Advances the play clock as the carrier crosses zones. */
  readonly onZoneEntered?: (zone: number) => void;
}

export interface AdvanceOutcome {
  readonly yards: number;
  readonly tackled: boolean;
  readonly brokenTackles: number;
  /** The last man to win a contest against him, if anybody did. */
  readonly tackledBy?: PlayerId;
  readonly reachedEndZone: boolean;
}

/**
 * §13.1's zone-by-zone advance, and §14.4's "second level and beyond" — the same
 * loop, because they are the same football.
 *
 * Per zone: block the men who have a blocker (§13.3 step 3), then every free
 * defender gets his shot at the carrier (§13.3 step 2). Whether that shot is
 * gated behind a §14.4 pursuit-angle check is `pursuitGateZones`, which is where
 * the two doc sections genuinely differ — §13 sends an unblocked defender
 * straight into the tackle attempt everywhere except zone 4 ("pursuit only"),
 * §14.4 gates the whole second level.
 *
 * Clearing a zone with nobody left standing earns its full width and moves him
 * on. §13.4's breakaway fires once, on clearing `breakawayAfterZone`.
 */
export function advanceCarrier(args: AdvanceArgs): AdvanceOutcome {
  const t = TUNABLES.ballCarrier;
  const gates: readonly number[] = t.pursuitGateZones[args.mode];
  const profile: ContestProfileKey = args.mode === "YAC" ? "yac" : "secondLevel";

  let yards = args.startYards ?? 0;
  let brokenTackles = 0;
  let tackled = false;
  let tackledBy: PlayerId | undefined;
  let freeRunning = false;
  let zoneEnd = 0;

  for (const zoneSpec of t.zones) {
    const zone = zoneSpec.zone;
    zoneEnd += zoneSpec.widthYards;
    if (tackled) break;
    // Already PAST it. Strictly past: §14.3's "3-5 yards before contact" puts a
    // back who came through a wide-open hole exactly ON zone 1's boundary, and
    // the men standing there are the linebackers he still has to beat. Skipping
    // the zone he ends up in would teleport him through the second level.
    if (zoneEnd < yards) continue;
    args.onZoneEntered?.(zone);
    const zoneStart = yards;
    const zoneRng = args.carrierRng.fork(`z${zone}`);

    if (!freeRunning) {
      // Deterministic encounter order: the man most likely to make the play
      // first. No die decides who gets there — §3's model has no travel time.
      const inZone = args.pursuers
        .filter((p) => p.zone === zone)
        .sort((a, b) => pursuitRank(b.defender) - pursuitRank(a.defender) ||
          String(a.defender.bio.id).localeCompare(String(b.defender.bio.id)));

      for (const pursuer of inZone) {
        if (tackled) break;
        const encounterRng = zoneRng.fork(String(pursuer.defender.bio.id));

        // §13.3 step 3 — a blocked defender who does not get off the block is
        // out of the play for this zone.
        if (pursuer.blocker !== undefined) {
          const block = resolveBlockInSpace({
            blocker: pursuer.blocker,
            defender: pursuer.defender,
            blockType: pursuer.blockType ?? "STALK",
            blockRng: encounterRng.fork("block"),
          });
          args.emitCheck(block.check);
          if (block.occupied) continue;
        }

        // §14.4 — the gate. Failing it is not a failed tackle; it is not being
        // there, so no tackle contest is rolled at all (ADR-005).
        if (gates.includes(zone)) {
          const pursuit = resolvePursuitAngle({
            carrier: args.carrier,
            defender: pursuer.defender,
            pursuitRng: encounterRng.fork("pursuit"),
          });
          args.emitCheck(pursuit.check);
          if (!pursuit.madePursuit) continue;
        }

        const contest = resolveTackleContest({
          carrier: args.carrier,
          tackler: pursuer.defender,
          profile,
          ...(zone === 1 && args.zone1CarrierModifiers !== undefined
            ? { carrierModifiers: args.zone1CarrierModifiers }
            : {}),
          contestRng: encounterRng.fork("tackle"),
        });
        args.emitCheck(contest.check);
        yards += contest.yards;
        if (contest.broken) brokenTackles += 1;
        if (contest.tackled) {
          tackled = true;
          tackledBy = pursuer.defender.bio.id;
        }
      }
    }

    // Nobody left standing in this zone: he runs through the rest of it.
    if (!tackled) yards = Math.max(yards, zoneEnd);
    args.emitZone(zone, yards - zoneStart);

    if (yards >= args.yardsToGoalLine) break;

    // §13.4 — one breakaway check, on clearing the zone the doc names.
    if (!tackled && !freeRunning && zone === t.breakawayAfterZone) {
      const pursuer = bestPursuerBeyond(args.pursuers, zone);
      if (pursuer !== undefined) {
        const breakaway = resolveBreakaway({
          carrier: args.carrier,
          pursuer,
          breakawayRng: zoneRng.fork("breakaway"),
        });
        args.emitCheck(breakaway.check);
        freeRunning = breakaway.freeRun;
        if (freeRunning && t.breakaway.freeRunReachesGoalLine) yards = args.yardsToGoalLine;
      }
    }
  }

  const capped = Math.min(yards, args.yardsToGoalLine);
  return {
    yards: capped,
    tackled,
    brokenTackles,
    ...(tackledBy === undefined ? {} : { tackledBy }),
    reachedEndZone: capped >= args.yardsToGoalLine,
  };
}

/** §13.4's "best pursuing defender" — the deepest man left, by pursuit rating. */
function bestPursuerBeyond(
  pursuers: readonly Pursuer[],
  zone: number,
): PlayerState | undefined {
  const beyond = pursuers.filter((p) => p.zone > zone);
  const pool = beyond.length > 0 ? beyond : pursuers;
  let best: PlayerState | undefined;
  for (const p of pool) {
    if (best === undefined || pursuitRank(p.defender) > pursuitRank(best)) best = p.defender;
  }
  return best;
}

/** Ordering only — never a roll, never a modifier. */
function pursuitRank(player: PlayerState): number {
  return (
    getAttr(player.attributes.values, ATTR.pursuit) +
    getAttr(player.attributes.values, ATTR.tackling)
  );
}
