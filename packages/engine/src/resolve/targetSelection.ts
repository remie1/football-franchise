/** §8.5 — decision-quality check and target selection. */
import type { PlayerId, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, rollD100, tierFor } from "../rolls.js";
import { TUNABLES } from "../tunables.js";

export type DecisionBandLabel = (typeof TUNABLES.qb.decision.bands)[number]["label"];

export interface TargetCandidate {
  readonly receiver: PlayerId;
  /** What the QB believes, after variance and window compensation. */
  readonly effectiveOpenness: number;
}

export interface TargetSelectionOutcome {
  readonly band: DecisionBandLabel;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly selected: TargetCandidate;
  /** Candidates ordered as the QB ranked them; index 0 is the best option. */
  readonly ranked: readonly TargetCandidate[];
  readonly check: CheckEmission;
}

export function selectTarget(
  qb: PlayerState,
  candidates: readonly TargetCandidate[],
  decisionRng: Rng,
): TargetSelectionOutcome {
  if (candidates.length === 0) throw new Error("selectTarget: no candidates");
  const t = TUNABLES.qb.decision;

  const roll = rollD100(
    decisionRng.fork("quality"),
    compact([actorAttrModifier(qb, "Decision Making", ATTR.decisionMaking, t.attrDivisor)]),
  );
  const margin = roll.total - t.target;
  const band = bandFor(t.bands, margin);

  const ranked = [...candidates].sort((a, b) => b.effectiveOpenness - a.effectiveOpenness);
  const from = Math.min(band.poolFrom, ranked.length - 1);
  const to = Math.max(from + 1, Math.min(band.poolTo, ranked.length));
  const pool = ranked.slice(from, to);
  const first = pool[0];
  if (first === undefined) throw new Error("selectTarget: empty selection pool");
  const selected = pool.length === 1 ? first : decisionRng.fork("selection").pick(pool);

  return {
    band: band.label,
    margin,
    roll,
    selected,
    ranked,
    check: {
      checkKind: "qb_decision",
      actors: [qb.bio.id],
      roll,
      target: t.target,
      tier: tierFor(margin),
      margin,
      testsAttrs: [ATTR.decisionMaking],
    },
  };
}
