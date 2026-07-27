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

  const blockerMods = compact([
    flatModifier("Protection structural advantage", t.blockerStructuralAdvantage),
    actorAttrModifier(blocker, "Pass Block", ATTR.passBlock, t.blockerAttrDivisor),
    actorAttrModifier(blocker, "Footwork", ATTR.footwork, t.blockerAttrDivisor),
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
      ],
    },
  };
}
