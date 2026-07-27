/** §9.1 — release vs. press, resolved at tick 0.5 for pressed receivers. */
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, TRAIT } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, rollD100, tierFor, traitModifier } from "../rolls.js";
import { TUNABLES } from "../tunables.js";

export type ReleaseBandLabel = (typeof TUNABLES.release.bands)[number]["label"];

export interface ReleaseArgs {
  readonly receiver: PlayerState;
  readonly defender: PlayerState;
  /** Coverage-subsystem fork; the resolver forks once per actor. */
  readonly coverageRng: Rng;
}

export interface ReleaseOutcome {
  readonly band: ReleaseBandLabel;
  readonly margin: number;
  readonly delaySeconds: number;
  /** Carried into the man-coverage roll as a named modifier. */
  readonly receiverCoverageModifier: number;
  readonly defenderCoverageModifier: number;
  readonly disrupted: boolean;
  readonly receiverRoll: RollDetail;
  readonly defenderRoll: RollDetail;
  readonly check: CheckEmission;
}

export function resolveReleaseVsPress(args: ReleaseArgs): ReleaseOutcome {
  const { receiver, defender, coverageRng } = args;
  const t = TUNABLES.release;

  const receiverMods = compact([
    actorAttrModifier(receiver, "Release", ATTR.releaseWR, t.attrDivisor),
    actorAttrModifier(receiver, "Agility", ATTR.agility, t.attrDivisor),
  ]);

  const defenderMods = compact([
    actorAttrModifier(defender, "Press", ATTR.press, t.attrDivisor),
    actorAttrModifier(defender, "Strength", ATTR.strength, t.attrDivisor),
    traitModifier("Trait: Press Specialist", defender.attributes.traits, TRAIT.pressSpecialist, TUNABLES.traitBonuses.pressSpecialist),
  ]);

  const receiverRoll = rollD100(coverageRng.fork(`${receiver.bio.id}:release`), receiverMods);
  const defenderRoll = rollD100(coverageRng.fork(`${defender.bio.id}:press`), defenderMods);
  const margin = receiverRoll.total - defenderRoll.total;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    margin,
    delaySeconds: band.delaySeconds,
    receiverCoverageModifier: band.wrCoverageMod,
    defenderCoverageModifier: band.cbCoverageMod,
    disrupted: band.disrupted,
    receiverRoll,
    defenderRoll,
    check: {
      checkKind: "release_vs_press",
      actors: [receiver.bio.id, defender.bio.id],
      roll: receiverRoll,
      opposedRoll: defenderRoll,
      tier: tierFor(margin),
      band: band.label,
      margin,
      testsAttrs: [ATTR.releaseWR, ATTR.agility, ATTR.press, ATTR.strength],
    },
  };
}
