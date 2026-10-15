/**
 * ADR-072 (ADR-068 step 2) — the coach's leash, and the quarterback's discipline.
 *
 * The leash says which pre-snap decisions the coach has opened on this call: each opens at its
 * own point on a 0–100 slider (`presnap.leash.rungs`). His read says which ones he wants. Wanting
 * one above the leash is a BREACH, and one roll decides whether he commits it: HELD, he makes the
 * decisions the leash opens and none above it; BROKE, he makes every decision his read wants,
 * exactly as he did before the leash existed. With no breach there is nothing to decide, so no die
 * (ADR-005).
 *
 * One fact, like `coverageRead.ts`: which decisions he makes. What they do to the progression
 * belongs to the pass play, which is where the order is.
 */
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import type { PresnapEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, flatModifier, rollD100, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";

/** The pre-snap decisions the leash can open (ADR-072 §1): step 1's re-order, as two rungs. */
export type PreSnapDecision = keyof Tunables["presnap"]["leash"]["rungs"];

/**
 * The top of the slider, every decision open: what a call that states no leash means
 * (`OffensivePlayCall.leash`, ADR-072 §3). The scale's end, not a tunable.
 */
export const LEASH_UNRESTRICTED = 100;

export type LeashBandLabel = Tunables["presnap"]["leash"]["discipline"]["bands"][number]["label"];

export interface LeashBreach {
  readonly band: LeashBandLabel;
  /** He stayed inside the leash: the decisions above it are not made. */
  readonly held: boolean;
  /** The highest rung he wanted, minus the leash. Always at least 1. */
  readonly size: number;
  readonly roll: RollDetail;
  readonly presnap: PresnapEmission;
}

export interface LeashOutcome {
  /** The decisions he makes: every one he wanted that the leash opens, and, if he broke it, the rest. */
  readonly made: ReadonlySet<PreSnapDecision>;
  /** Present exactly when he wanted a decision above the leash, which is when the roll is made. */
  readonly breach?: LeashBreach;
}

/** ADR-072 §2: `d100 + Discipline ÷ attrDivisor + breach ÷ breachDivisor` against `target`. */
export function resolveLeash(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly quarterback: PlayerState;
  readonly leash: number;
  readonly wanted: ReadonlySet<PreSnapDecision>;
  readonly presnapRng: Rng;
}): LeashOutcome {
  const t = args.tunables.presnap.leash;
  const rungsAbove = [...args.wanted].map((d) => t.rungs[d]).filter((rung) => rung > args.leash);
  if (rungsAbove.length === 0) return { made: args.wanted };

  const size = Math.max(...rungsAbove) - args.leash;
  const roll = rollD100(
    args.presnapRng.fork("leashDiscipline"),
    compact([
      actorAttrModifier(args.quarterback, "Discipline (leash)", ATTR.discipline, t.discipline.attrDivisor),
      flatModifier(`Breach of the leash (${String(size)})`, Math.round(size / t.discipline.breachDivisor)),
    ]),
  );
  const margin = roll.total - t.discipline.target;
  const band = bandFor(t.discipline.bands, margin);
  const made = band.held
    ? new Set([...args.wanted].filter((d) => t.rungs[d] <= args.leash))
    : args.wanted;

  return {
    made,
    breach: {
      band: band.label,
      held: band.held,
      size,
      roll,
      presnap: {
        actor: args.quarterback.bio.id,
        kind: "leash_discipline",
        roll,
        target: t.discipline.target,
        tier: tierFor(args.tunables, margin),
        band: band.label,
      },
    },
  };
}
