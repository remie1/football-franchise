/**
 * SELECTION — situation in, card out, through the contracts PRNG.
 *
 * This is NOT a play-caller and must not grow into one. `calibration.md` §3.1's
 * frozen baseline caller decides run versus pass from real play-by-play; a smarter
 * caller is a franchise feature later. All this does is pick WITHIN a family once
 * that decision is made, using the usage weights in `distribution.ts` — which are
 * priors, and which the frozen caller should eventually replace.
 *
 * No card applying to a situation is a LOUD failure rather than a fallback to the
 * first card in the list. A silent fallback would make one card enormously
 * over-represented in exactly the situations nobody checked.
 */
import type { Rng } from "@ff/contracts";
import { DEFENSIVE_CARDS } from "./defensiveCards.js";
import type { AnyDefensiveCard } from "./defense.js";
import type { PlaySituation } from "./distribution.js";
import { usageApplies, weightedPick } from "./distribution.js";
import { PlaybookError } from "./errors.js";
import type { PassConcept } from "./passConcepts.js";
import { PASS_CONCEPTS } from "./passConcepts.js";
import type { RunConcept } from "./runConcepts.js";
import { RUN_CONCEPTS } from "./runConcepts.js";

function applicable<T extends { readonly usage: { readonly weight: number } }>(
  cards: readonly T[],
  situation: PlaySituation,
  usageOf: (card: T) => Parameters<typeof usageApplies>[0],
): readonly T[] {
  return cards.filter((card) => card.usage.weight > 0 && usageApplies(usageOf(card), situation));
}

export function applicablePassConcepts(situation: PlaySituation): readonly PassConcept[] {
  return applicable(PASS_CONCEPTS, situation, (c) => c.usage);
}

export function applicableRunConcepts(situation: PlaySituation): readonly RunConcept[] {
  return applicable(RUN_CONCEPTS, situation, (c) => c.usage);
}

export function applicableDefensiveCards(situation: PlaySituation): readonly AnyDefensiveCard[] {
  return applicable(DEFENSIVE_CARDS, situation, (c) => c.usage);
}

function pickOrThrow<T extends { readonly id: string; readonly usage: { readonly weight: number } }>(
  rng: Rng,
  candidates: readonly T[],
  family: string,
  situation: PlaySituation,
): T {
  if (candidates.length === 0) {
    throw new PlaybookError(
      `no ${family} applies to ${situation.down} and ${situation.distance} at ` +
        `${situation.ballOn}${situation.twoMinute ? " (two-minute)" : ""}`,
    );
  }
  return weightedPick(rng, candidates, (card) => card.usage.weight);
}

export function selectPassConcept(rng: Rng, situation: PlaySituation): PassConcept {
  return pickOrThrow(rng, applicablePassConcepts(situation), "pass concept", situation);
}

export function selectRunConcept(rng: Rng, situation: PlaySituation): RunConcept {
  return pickOrThrow(rng, applicableRunConcepts(situation), "run concept", situation);
}

export function selectDefensiveCard(rng: Rng, situation: PlaySituation): AnyDefensiveCard {
  return pickOrThrow(rng, applicableDefensiveCards(situation), "defensive card", situation);
}
