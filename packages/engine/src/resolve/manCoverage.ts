/** §9.3 — man coverage separation at the route break point. */
import type { PlayerState, Rng, RollDetail, RollModifier } from "@ff/contracts";
import { ATTR, TRAIT } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import {
  actorAttrModifier,
  bandFor,
  compact,
  flatModifier,
  rollD100,
  sumModifiers,
  tierFor,
  traitModifier,
} from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { ContestPosition } from "../types.js";

export type ManCoverageBandLabel = (Tunables["manCoverage"]["bands"])[number]["label"];

export interface ManCoverageArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly receiver: PlayerState;
  readonly defender: PlayerState;
  /** Carried from the release battle (§9.1 outcome effects). */
  readonly receiverReleaseModifier?: number;
  readonly defenderReleaseModifier?: number;
  readonly coverageRng: Rng;
}

export interface ManCoverageOutcome {
  readonly band: ManCoverageBandLabel;
  readonly margin: number;
  /** Base openness at the break point, on the §8.4 0-100 scale. */
  readonly openness: number;
  readonly contestPosition: ContestPosition;
  readonly receiverRoll: RollDetail;
  readonly defenderRoll: RollDetail;
  readonly check: CheckEmission;
}

/**
 * Both sides' modifiers for one rep. Shared by the rolled rep and the typical one, so the
 * expectation a quarterback forms before the snap is built from exactly the terms the
 * snap resolves.
 */
function manCoverageModifiers(
  tunables: Tunables,
  receiver: PlayerState,
  defender: PlayerState,
  receiverReleaseModifier: number | undefined,
  defenderReleaseModifier: number | undefined,
): { readonly receiverMods: RollModifier[]; readonly defenderMods: RollModifier[] } {
  const t = tunables.manCoverage;
  return {
    receiverMods: compact([
      actorAttrModifier(receiver, "Route Running", ATTR.routeRunning, t.attrDivisor),
      actorAttrModifier(receiver, "Agility", ATTR.agility, t.attrDivisor),
      traitModifier("Trait: Route Technician", receiver.attributes.traits, TRAIT.routeTechnician, tunables.traitBonuses.routeTechnician),
      receiverReleaseModifier === undefined
        ? undefined
        : flatModifier("Release battle carry-over", receiverReleaseModifier),
    ]),
    defenderMods: compact([
      actorAttrModifier(defender, "Man Coverage", ATTR.manCoverage, t.attrDivisor),
      actorAttrModifier(defender, "Agility", ATTR.agility, t.attrDivisor),
      traitModifier("Trait: Shutdown", defender.attributes.traits, TRAIT.shutdown, tunables.traitBonuses.shutdown),
      defenderReleaseModifier === undefined
        ? undefined
        : flatModifier("Release battle carry-over", defenderReleaseModifier),
    ]),
  };
}

export interface TypicalManCoverage {
  readonly band: ManCoverageBandLabel;
  readonly margin: number;
  readonly openness: number;
  readonly contestPosition: ContestPosition;
}

/**
 * ADR-070 §3 — the TYPICAL rep between these two, with no die: both d100s sit at their
 * mean and cancel, so the margin is the modifiers alone. It is what a quarterback expects
 * of a matchup the look shows him before the snap. No release carry-over, because the
 * release has not happened when he forms the expectation.
 */
export function typicalManCoverage(
  tunables: Tunables,
  receiver: PlayerState,
  defender: PlayerState,
): TypicalManCoverage {
  const { receiverMods, defenderMods } = manCoverageModifiers(tunables, receiver, defender, undefined, undefined);
  const margin = sumModifiers(receiverMods) - sumModifiers(defenderMods);
  const band = bandFor(tunables.manCoverage.bands, margin);
  return { band: band.label, margin, openness: band.openness, contestPosition: band.contest };
}

export function resolveManCoverage(args: ManCoverageArgs): ManCoverageOutcome {
  const { receiver, defender, coverageRng, tunables } = args;
  const t = tunables.manCoverage;

  const { receiverMods, defenderMods } = manCoverageModifiers(
    tunables,
    receiver,
    defender,
    args.receiverReleaseModifier,
    args.defenderReleaseModifier,
  );

  const receiverRoll = rollD100(coverageRng.fork(`${receiver.bio.id}:route`), receiverMods);
  const defenderRoll = rollD100(coverageRng.fork(`${defender.bio.id}:man`), defenderMods);
  const margin = receiverRoll.total - defenderRoll.total;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    margin,
    openness: band.openness,
    contestPosition: band.contest,
    receiverRoll,
    defenderRoll,
    check: {
      checkKind: "man_coverage",
      actors: [receiver.bio.id, defender.bio.id],
      roll: receiverRoll,
      opposedRoll: defenderRoll,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [ATTR.routeRunning, ATTR.agility, ATTR.manCoverage],
    },
  };
}
