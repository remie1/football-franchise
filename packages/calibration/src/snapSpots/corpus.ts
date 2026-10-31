/**
 * Every snap picture the book can draw (ADR-090 step 0): each card of the book and each composed
 * pressure and creeper of v6's catalogue, bare and wearing every set of coverage looks it can
 * wear (early and late where a safety rotates), under no front look, the Mug, and the Stem toward
 * each side it may go, against each of the twelve formations. The same set the playbook's own
 * proof draws (`packages/playbook/test/snapSpots.test.ts`), which this report restates in numbers.
 *
 * Pure and dieless: the pictures are tables read off the call (ADR-090 §4), so there is no seed.
 */
import { playerId, type PlayerId, type Position } from "@ff/contracts";
import {
  COMPOSED,
  DEFENSIVE_CARDS,
  FORMATIONS,
  V6_COVERAGES,
  applyFrontLook,
  applyLooks,
  buildDefensiveUnit,
  buildOffensiveUnit,
  instantiateDefense,
  legalFrontLooks,
  legalLookCombinations,
  playPreSnap,
  type AnyDefensiveCard,
  type AnyFormation,
  type DepthChart,
  type FrontLookDraw,
  type PreSnapBeats,
  type SnapInput,
} from "@ff/playbook";

const squad = (position: Position, count: number): readonly PlayerId[] =>
  Array.from({ length: count }, (_, i) => playerId(`${position}${i + 1}`));

/** Deep enough to field every personnel grouping in the book; who plays changes no spot. */
export const REPORT_CHART: DepthChart = {
  QB: squad("QB", 2),
  RB: squad("RB", 3),
  FB: squad("FB", 1),
  WR: squad("WR", 6),
  TE: squad("TE", 3),
  LT: squad("LT", 2),
  LG: squad("LG", 2),
  C: squad("C", 2),
  RG: squad("RG", 2),
  RT: squad("RT", 2),
  DE: squad("DE", 4),
  DT: squad("DT", 4),
  NT: squad("NT", 1),
  OLB: squad("OLB", 4),
  MLB: squad("MLB", 2),
  ILB: squad("ILB", 2),
  CB: squad("CB", 5),
  FS: squad("FS", 2),
  SS: squad("SS", 2),
};

export interface DrawnSnap {
  /** The book's call, before any look. */
  readonly base: AnyDefensiveCard;
  /** The call as worn: the coverage looks laid over it, if any. */
  readonly card: AnyDefensiveCard;
  readonly front: FrontLookDraw | undefined;
  readonly formation: AnyFormation;
  readonly input: SnapInput;
  readonly beats: PreSnapBeats;
}

/** Each distinct set of duties: the book's cards, v6's coverages, and each composed pressure. */
export function bookCalls(): readonly AnyDefensiveCard[] {
  const calls = new Map<string, AnyDefensiveCard>();
  for (const card of [...DEFENSIVE_CARDS, ...V6_COVERAGES]) calls.set(card.id, card);
  for (const entry of Object.values(COMPOSED)) {
    if (entry.line === "BOUND" && !calls.has(entry.call.id)) calls.set(entry.call.id, entry.call);
  }
  return [...calls.values()];
}

/** The call bare, then wearing each legal set of coverage looks, early and late where it rotates. */
export function wornCalls(card: AnyDefensiveCard): readonly AnyDefensiveCard[] {
  const worn: AnyDefensiveCard[] = [card];
  for (const looks of legalLookCombinations(card)) {
    if (!looks.some((mask) => mask.row === "BY_TIMING")) {
      worn.push(applyLooks(card, { looks }));
      continue;
    }
    for (const timing of ["EARLY", "LATE"] as const) worn.push(applyLooks(card, { looks, timing }));
  }
  return worn;
}

/** No front look, then each the worn call can wear: the Mug, the Stem toward each legal side. */
export function frontDraws(card: AnyDefensiveCard): readonly (FrontLookDraw | undefined)[] {
  return [
    undefined,
    ...legalFrontLooks(card).flatMap((option): FrontLookDraw[] =>
      option.look === "MUG"
        ? [{ cardId: card.id, look: "MUG" }]
        : option.sides.map((side) => ({ cardId: card.id, look: "STEM", side })),
    ),
  ];
}

/**
 * The snap input for one call against one formation, or `undefined` where this formation makes
 * the front look illegal: `applyFrontLook` hands back the instance it was given, and the call
 * wears no front look on that snap, so there is nothing new to draw.
 */
export function inputOf(formation: AnyFormation, card: AnyDefensiveCard, front?: FrontLookDraw): SnapInput | undefined {
  const offense = buildOffensiveUnit(formation.personnel, REPORT_CHART);
  const unit = buildDefensiveUnit(card.personnel, REPORT_CHART);
  const plain = instantiateDefense(card, unit, { formation, unit: offense });
  const defense = front === undefined ? plain : applyFrontLook(plain, front);
  if (front !== undefined && defense === plain) return undefined;
  return { formation, offense, card, defense };
}

/** Every picture, in book order, then looks, then front looks, then formations. */
export function drawEverySnap(): readonly DrawnSnap[] {
  const drawn: DrawnSnap[] = [];
  for (const base of bookCalls()) {
    for (const card of wornCalls(base)) {
      for (const front of frontDraws(card)) {
        for (const formation of FORMATIONS) {
          const input = inputOf(formation, card, front);
          if (input === undefined) continue;
          drawn.push({ base, card, front, formation, input, beats: playPreSnap(input) });
        }
      }
    }
  }
  return drawn;
}
