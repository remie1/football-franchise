/** §7.1 — one rusher vs. one blocker, resolved every tick. */
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, flatModifier, rollD100, tierFor, traitModifier } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { RushMove } from "../types.js";

export type PassRushBandLabel = (Tunables["passRush"]["bands"])[number]["label"];

export interface PassRushArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly rusher: PlayerState;
  readonly blocker: PlayerState;
  readonly move: RushMove;
  /** Band from this matchup's previous tick — drives the counter-move bonus. */
  readonly previousBand?: PassRushBandLabel;
  /** Tick-scoped fork; the resolver forks once per actor for auditability. */
  readonly tickRng: Rng;
}

export interface PassRushOutcome {
  readonly band: PassRushBandLabel;
  readonly margin: number;
  readonly rusherRoll: RollDetail;
  readonly blockerRoll: RollDetail;
  readonly pressureDelta: number;
  readonly resetsPressure: boolean;
  readonly check: CheckEmission;
}

export function resolvePassRushTick(args: PassRushArgs): PassRushOutcome {
  const { rusher, blocker, move, previousBand, tickRng, tunables } = args;
  const t = tunables.passRush;

  const moveMods =
    move === "SPEED"
      ? [
          actorAttrModifier(rusher, "speed rush (First Step)", ATTR.firstStep, t.rusherAttrDivisor),
          traitModifier("Trait: Quick Twitch", rusher.attributes.traits, TRAIT.quickTwitch, tunables.traitBonuses.quickTwitch),
        ]
      : move === "POWER"
        ? [
            actorAttrModifier(rusher, "power rush (Power Move)", ATTR.powerMove, t.rusherAttrDivisor),
            actorAttrModifier(rusher, "power rush (Strength)", ATTR.strength, t.rusherAttrDivisor),
          ]
        : [actorAttrModifier(rusher, "finesse (Finesse Move)", ATTR.finesseMove, t.rusherAttrDivisor)];

  const rusherMods = compact([
    actorAttrModifier(rusher, "Pass Rush", ATTR.passRush, t.rusherAttrDivisor),
    ...moveMods,
    previousBand === "STALEMATE"
      ? flatModifier("Counter move after stalemate", t.counterMoveAfterStalemate)
      : undefined,
  ]);

  /**
   * ADR-028 petition 1. The blocker's third ATTRIBUTE term, and the reason
   * `t.blockerStructuralAdvantage` is now 0.
   *
   * The stack used to be `round(v/5)·2 + BSA`, so the constant's contribution to
   * the SLOPE of protection against line quality was identically zero: at a
   * 20-rated line 65.2% of the blocker's edge did not respond to a rating at all.
   * A third real term replaces those points with points that do. The flat term
   * below stays in the list — it is still the §7.1 structural dial, it is simply
   * set to 0, and `compact` drops it from the stream while it is.
   */
  const blockerMods = compact([
    flatModifier("Protection structural advantage", t.blockerStructuralAdvantage),
    actorAttrModifier(blocker, "Pass Block", ATTR.passBlock, t.blockerAttrDivisor),
    actorAttrModifier(blocker, "Footwork", ATTR.footwork, t.blockerAttrDivisor),
    actorAttrModifier(blocker, "Anchor", ATTR.anchor, t.blockerAttrDivisor),
    move === t.brickWallMove
      ? traitModifier("Trait: Brick Wall (anchor)", blocker.attributes.traits, TRAIT.brickWall, tunables.traitBonuses.brickWall)
      : undefined,
  ]);

  const rusherRoll = rollD100(tickRng.fork(`${rusher.bio.id}:rush`), rusherMods);
  const blockerRoll = rollD100(tickRng.fork(`${blocker.bio.id}:block`), blockerMods);
  const margin = rusherRoll.total - blockerRoll.total;
  const band = bandFor(t.bands, margin);
  const progress = t.pressureProgressByBand[band.label];

  return {
    band: band.label,
    margin,
    rusherRoll,
    blockerRoll,
    pressureDelta: progress.delta,
    resetsPressure: progress.reset,
    check: {
      checkKind: "pass_rush_tick",
      actors: [rusher.bio.id, blocker.bio.id],
      roll: rusherRoll,
      opposedRoll: blockerRoll,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [
        ATTR.passRush,
        ...(move === "SPEED" ? [ATTR.firstStep] : move === "POWER" ? [ATTR.powerMove, ATTR.strength] : [ATTR.finesseMove]),
        ATTR.passBlock,
        ATTR.footwork,
        ATTR.anchor,
      ],
    },
  };
}
