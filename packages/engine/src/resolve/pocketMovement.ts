/**
 * §7.2's third option — "QB must throw, **move**, or take hit".
 *
 * The engine implemented *throw* and *take hit*. This is *move*, as TWO
 * distinct mechanics rather than one blended "evade":
 *
 *   STEP UP   climb the pocket. Resets or delays EDGE threats; does nothing
 *             against interior penetration, because you cannot climb into a
 *             three-technique. The cheap, common, correct answer, and a QB who
 *             climbs is still a passer.
 *   ESCAPE    leave the pocket, triggering §8.8's scramble drill. Gated by
 *             mobility and improvisation.
 *
 * Selection is deliberately NOT an if-ladder on pocket status. Each available
 * response carries an APPEAL score built from this quarterback's own attributes
 * and the shape of the threat in front of him; one d100 then decides how far
 * down his own preference list the moment pushes him, using the same band→rank
 * mechanic §8.5 uses for target selection. What falls out should be
 * recognisable:
 *
 *   - a statue with high poise stands in and throws (standIn appeal is poise
 *     and patience; escape appeal is mobility he does not have);
 *   - a mobile quarterback escapes — but only when the climb lane is gone,
 *     which is exactly what interior penetration takes away;
 *   - a panicky one is pushed off index 0 by a bad roll and bails into a worse
 *     outcome than the one he fled.
 */
import { getAttr } from "@ff/contracts";
import type { AttrId, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR, attrName } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, rollD100, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { ArrivalClock } from "./rushThreat.js";
import { minTimeToArrival, threatsWithAlignment, urgencySteps } from "./rushThreat.js";

export type PocketResponse = "STAND_IN" | "STEP_UP" | "ESCAPE" | "THROWAWAY";
export type PocketMovementBandLabel = (Tunables["pocketMovement"]["bands"])[number]["label"];

type AppealKey = keyof Tunables["pocketMovement"]["appeal"];

interface AppealTerm {
  readonly attr: string;
  readonly divisor: number;
}

interface AppealSpec {
  readonly base: number;
  readonly terms: readonly AppealTerm[];
  readonly perUrgencyStep: number;
}

/** One response, scored. Ordered highest-first, this is the QB's preference list. */
export interface ResponseAppeal {
  readonly response: PocketResponse;
  readonly appeal: number;
}

export interface PocketMovementArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly qb: PlayerState;
  readonly tick: number;
  /** Rushers currently travelling. Shape, not just count, drives availability. */
  readonly threats: readonly ArrivalClock[];
  readonly stepUpsUsed: number;
  /** §8.7 — a throwaway is only legal once the concept has had time to develop. */
  readonly throwawayAvailable: boolean;
  readonly movementRng: Rng;
}

export interface PocketMovementOutcome {
  readonly response: PocketResponse;
  readonly band: PocketMovementBandLabel;
  readonly margin: number;
  readonly roll: RollDetail;
  /** Every response he could have taken, best-first. Index 0 is what he wanted. */
  readonly ranked: readonly ResponseAppeal[];
  readonly urgency: number;
  readonly check: CheckEmission;
}

const RESPONSE_BY_APPEAL_KEY: Readonly<Record<AppealKey, PocketResponse>> = {
  standIn: "STAND_IN",
  stepUp: "STEP_UP",
  escape: "ESCAPE",
  throwaway: "THROWAWAY",
};

function attrIdOf(name: string): AttrId {
  const id = (ATTR as Readonly<Record<string, AttrId>>)[name];
  if (id === undefined) throw new Error(`@ff/engine: pocketMovement term "${name}" is not a registry attribute`);
  return id;
}

function appealFrom(
  tunables: Tunables,
  qb: PlayerState,
  spec: AppealSpec,
  urgency: number,
): number {
  const baseline = tunables.pocketMovement.appealBaseline;
  const attrTotal = spec.terms.reduce(
    (sum, term) => sum + Math.round((getAttr(qb.attributes.values, attrIdOf(term.attr)) - baseline) / term.divisor),
    0,
  );
  return spec.base + attrTotal + spec.perUrgencyStep * urgency;
}

/**
 * Is the climb lane open? Two ways it is not: somebody is penetrating the
 * interior (you cannot climb into him), or the quarterback has already climbed
 * as far as the pocket goes.
 */
export function climbLaneOpen(
  tunables: Tunables,
  threats: readonly ArrivalClock[],
  stepUpsUsed: number,
): boolean {
  if (stepUpsUsed >= tunables.pocketMovement.stepUp.maxPerPlay) return false;
  return threatsWithAlignment(threats, "INTERIOR").length === 0;
}

/** The QB's own ranking of the responses available to him, best-first. */
export function rankResponses(args: {
  readonly tunables: Tunables;
  readonly qb: PlayerState;
  readonly tick: number;
  readonly threats: readonly ArrivalClock[];
  readonly stepUpsUsed: number;
  readonly throwawayAvailable: boolean;
}): { readonly ranked: readonly ResponseAppeal[]; readonly urgency: number } {
  const { tunables } = args;
  const t = tunables.pocketMovement;
  const urgency = urgencySteps(tunables, minTimeToArrival(args.threats, args.tick));
  const canClimb = climbLaneOpen(tunables, args.threats, args.stepUpsUsed);

  const scored: ResponseAppeal[] = [];
  for (const key of Object.keys(t.appeal) as AppealKey[]) {
    const response = RESPONSE_BY_APPEAL_KEY[key];
    if (response === "STEP_UP" && !canClimb) continue;
    if (response === "THROWAWAY" && !args.throwawayAvailable) continue;
    const spec: AppealSpec = t.appeal[key];
    let appeal = appealFrom(tunables, args.qb, spec, urgency);
    // The bonus that makes interior pressure hurt: with the climb lane gone,
    // leaving is the only way to buy space, so a mobile QB reaches for it.
    if (response === "ESCAPE" && !canClimb) appeal += t.appeal.escape.noClimbLaneBonus;
    scored.push({ response, appeal });
  }

  // Ties break on the fixed declaration order of tunables.pocketMovement.appeal,
  // which `Array.prototype.sort` preserves — no die, so no hidden randomness.
  const ranked = [...scored].sort((a, b) => b.appeal - a.appeal);
  return { ranked, urgency };
}

export function resolvePocketMovement(args: PocketMovementArgs): PocketMovementOutcome {
  const { tunables } = args;
  const t = tunables.pocketMovement;
  const { ranked, urgency } = rankResponses(args);
  if (ranked.length === 0) throw new Error("@ff/engine: pocket movement with no available response");

  const testsAttrs = t.checkTerms.map((term) => attrIdOf(term.attr));
  const roll = rollD100(
    args.movementRng,
    compact(
      t.checkTerms.map((term, i) => {
        const id = testsAttrs[i] ?? attrIdOf(term.attr);
        // The attribute half of the source is the REGISTRY'S name, looked up —
        // never the id with its first letter capitalised (contracts.md §1: ids
        // are opaque). Only the "(pocket movement)" qualifier is ours.
        return actorAttrModifier(args.qb, `${attrName(id)} (pocket movement)`, id, term.divisor);
      }),
    ),
  );
  const margin = roll.total - t.target;
  const band = bandFor(t.bands, margin);

  // One roll decides the whole thing (ADR-004): the band names how far down his
  // own preference list the moment pushed him, and the rank is read directly.
  const rank = Math.min(band.takeRank, ranked.length - 1);
  const chosen = ranked[rank];
  if (chosen === undefined) throw new Error("@ff/engine: empty pocket-movement selection pool");

  return {
    response: chosen.response,
    band: band.label,
    margin,
    roll,
    ranked,
    urgency,
    check: {
      // ADR-007: §8.7's `hold_decision` (keep holding or not, against
      // pocketPatience) and this — §7.2's stand / climb / leave / eat it, against
      // poise and awareness — are different checks with different consequences,
      // and calibration can now count them separately.
      checkKind: "pocket_movement",
      actors: [args.qb.bio.id],
      roll,
      target: t.target,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs,
    },
  };
}

/** Kept for calibration/test use; the §17 renderer reads the band off the stream. */
export function pocketMovementBandFor(
  tunables: Tunables,
  margin: number,
): PocketMovementBandLabel {
  return bandFor(tunables.pocketMovement.bands, margin).label;
}
