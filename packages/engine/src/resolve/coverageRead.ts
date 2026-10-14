/**
 * §5.1 — the quarterback's coverage read (ADR-068 step 1).
 *
 * One roll, one fact: how much of the shown coverage he pinned down, and whether what he
 * missed he missed by being WRONG. The consequences — the progression reorder and the
 * misperceived openness — belong to the pass play, which is where the tracks are.
 */
import type { CoverageDisguise, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import type { PresnapEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, rollD100, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";

export type CoverageReadBandLabel = Tunables["presnap"]["coverageRead"]["bands"][number]["label"];

export interface CoverageReadOutcome {
  readonly band: CoverageReadBandLabel;
  /** He recognised the disguise: traps move to the back of his progression. */
  readonly seesThrough: boolean;
  /** He believed the shown look: traps move to the front and read as uncovered. */
  readonly fooled: boolean;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly presnap: PresnapEmission;
}

/** §5.1 verbatim: `d100 + Awareness÷5 + Football IQ÷5` vs `50 + complexity`. */
export function resolveCoverageRead(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly quarterback: PlayerState;
  readonly disguise: CoverageDisguise;
  readonly presnapRng: Rng;
}): CoverageReadOutcome {
  const t = args.tunables.presnap.coverageRead;
  const target = t.target + t.complexity[args.disguise];

  const roll = rollD100(
    args.presnapRng.fork("coverageRead"),
    compact([
      actorAttrModifier(args.quarterback, "Awareness (coverage read)", ATTR.awareness, t.attrDivisor),
      actorAttrModifier(args.quarterback, "Football IQ (coverage read)", ATTR.footballIQ, t.attrDivisor),
    ]),
  );
  const margin = roll.total - target;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    seesThrough: band.seesThrough,
    fooled: band.fooled,
    margin,
    roll,
    presnap: {
      actor: args.quarterback.bio.id,
      kind: "coverage_read",
      roll,
      target,
      tier: tierFor(args.tunables, margin),
      band: band.label,
    },
  };
}
