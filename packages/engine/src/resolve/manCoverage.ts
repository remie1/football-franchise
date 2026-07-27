/** §9.3 — man coverage separation at the route break point. */
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, flatModifier, rollD100, tierFor, traitModifier } from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type { ContestPosition } from "../types.js";

export type ManCoverageBandLabel = (typeof TUNABLES.manCoverage.bands)[number]["label"];

export interface ManCoverageArgs {
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

export function resolveManCoverage(args: ManCoverageArgs): ManCoverageOutcome {
  const { receiver, defender, coverageRng } = args;
  const t = TUNABLES.manCoverage;

  const receiverMods = compact([
    actorAttrModifier(receiver, "Route Running", ATTR.routeRunning, t.attrDivisor),
    actorAttrModifier(receiver, "Agility", ATTR.agility, t.attrDivisor),
    traitModifier("Trait: Route Technician", receiver.attributes.traits, TRAIT.routeTechnician, TUNABLES.traitBonuses.routeTechnician),
    args.receiverReleaseModifier === undefined
      ? undefined
      : flatModifier("Release battle carry-over", args.receiverReleaseModifier),
  ]);

  const defenderMods = compact([
    actorAttrModifier(defender, "Man Coverage", ATTR.manCoverage, t.attrDivisor),
    actorAttrModifier(defender, "Agility", ATTR.agility, t.attrDivisor),
    traitModifier("Trait: Shutdown", defender.attributes.traits, TRAIT.shutdown, TUNABLES.traitBonuses.shutdown),
    args.defenderReleaseModifier === undefined
      ? undefined
      : flatModifier("Release battle carry-over", args.defenderReleaseModifier),
  ]);

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
      tier: tierFor(margin),
      margin,
      testsAttrs: [ATTR.routeRunning, ATTR.agility, ATTR.manCoverage],
    },
  };
}
