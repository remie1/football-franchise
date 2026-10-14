/**
 * PRE-SNAP MASKS — ADR-069. The look a defence SHOWS, as a named piece laid over a card.
 *
 * ================== A CARD IS THE ROTATION; A MASK IS THE LOOK ==================
 *
 * The owner's three parts of a defensive call (ADR-069): **front and blitz** (the card's
 * `front` and its rush), **the pre-snap mask** (this file), **the post-snap rotation** (the
 * card's duties — what is actually played). A card says who plays what after the snap; a
 * mask says what the quarterback sees before it. They are separate so any rotation can be
 * called honestly OR behind a disguise, which is how a real defence uses them: Cover 3 Sky
 * is a safety-force rotation, and it is a disguise only on the snaps it is called from a
 * two-high look.
 *
 * ⛔ **A MASK NEVER CHANGES WHAT IS PLAYED** (ruling 1). It writes `shows` onto the duties of
 * the men it moves and nothing else, so the played coverage, the rush, the run fits and the
 * gap integrity `validate.ts` checks are the card's, untouched. That is why the card weights,
 * tuned to `COVERAGE_SHELL_USAGE` and `BLITZ_RATE_PRIOR`, need no re-tuning: the mask is drawn
 * after the card, on an address of its own, and cannot move either marginal.
 *
 * ================== THE CATALOGUE, AND WHAT IS NOT IN IT YET ==================
 *
 * The owner's catalogue (ADR-069 §9) has seven masks. Phase 1 built the ones the engine can
 * already resolve — each moves only men whose shown duty is a ZONE, and the lie each tells is
 * the one ADR-068 step 1 built (the look shows a hole the rotation fills). Under ADR-071 a mask
 * is a LOOK tag, said last in the call by the word the captain uses:
 *
 *  - **Show 2** — both safeties at deep halves; the card rolls to one-high. Over a quarters
 *    rotation the corners squat in the flats too — the owner's "passive Cover 2 that converts
 *    to an aggressive Quarters match". (Phase 1's Two-High and Two-High Cover 2 look, which
 *    sat over disjoint rotations, as one word.)
 *  - **Show 1** — the free safety in the middle, the strong safety walked down; the card spins
 *    to two-high. (Phase 1's Single-High.)
 *
 * **Robber** is not a mask: it is Show 2 over a robbing rotation, and Cover 3 Buzz is one.
 * Press and Split need a shown MAN look (ADR-070, ADR-071 step 2); Stem and the Cover 0 mug
 * need a shown rush (ADR-069 Phase 3).
 *
 * ================== STATED, THEN CHECKED ==================
 *
 * Each mask STATES the rotations it may sit over (`over`). `test/masks.test.ts` CHECKS every
 * stated pairing against every card in those families: the men it moves are on the field,
 * none of them rushes, and the look it produces differs from what the card plays. A pairing
 * that would show exactly what it plays is refused there rather than drawn, because a mask
 * that changes nothing would be a die that turns nothing (ADR-005) and would count toward a
 * disguise rate it does not earn.
 */
import type { CoverageDisguise, DefensiveTag, Rng, RunSide } from "@ff/contracts";
import { zone } from "./coverage.js";
import type { AnyDefensiveCard, CoverageFamily, DefensiveDuty, ZoneDuty } from "./defense.js";
import { COVERAGE_MASK_RATE, LATE_ROTATION_SHARE, weightedPick } from "./distribution.js";
import { PlaybookError } from "./errors.js";
import type { DefenseRole } from "./roles.js";

export type CoverageMaskId = "SHOW_2" | "SHOW_1";

/**
 * EARLY: the safeties move before the snap and the quarterback can see the end of it — §5.1's
 * "rotated shell", +10. LATE: the look is held until the ball is snapped — §5.1's "heavy
 * disguise (late rotation)", +20.
 */
export type MaskTiming = "EARLY" | "LATE";

export interface CoverageMask {
  readonly id: CoverageMaskId;
  /** The word the captain says. Becomes the LOOK tag's `name` on the call (ADR-071). */
  readonly name: string;
  /** The rotations it may be laid over — stated here, checked in `test/masks.test.ts`. */
  readonly over: readonly CoverageFamily[];
  /**
   * Relative weight when more than one mask is legal over one card (Quarters and Cover 6 can
   * wear either Show 2 or Show 1). `CHOSEN — provenance NONE` (ADR-069 §9).
   */
  readonly weight: number;
  /**
   * What each defender the mask moves shows, worked out against the card it is masking —
   * sides depend on where the card puts its safeties. Every role it CAN move, whether or not
   * the card already plays that duty; `maskShows` keeps only the ones that differ.
   */
  readonly looks: (card: AnyDefensiveCard) => Readonly<Partial<Record<DefenseRole, ZoneDuty>>>;
}

export interface MaskDraw {
  readonly mask: CoverageMask;
  readonly timing: MaskTiming;
}

// --- sides -------------------------------------------------------------------

function laneSide(lane: string): RunSide | undefined {
  if (lane === "LW" || lane === "LH") return "LEFT";
  if (lane === "RW" || lane === "RH") return "RIGHT";
  return undefined;
}

/** Which side of the field a duty is played on: its zone's lane, its man's side, else its fit. */
function dutySide(duty: DefensiveDuty): RunSide | undefined {
  switch (duty.kind) {
    case "ZONE":
      return laneSide(duty.zone.horizontal) ?? duty.runFit?.side;
    case "MAN":
      return (duty.target.kind === "NUMBER" ? duty.target.side : undefined) ?? duty.runFit?.side;
    case "RUSH":
      return duty.side;
  }
}

/**
 * THE STRONG SAFETY'S SIDE, AND THE FREE SAFETY TAKES THE OTHER.
 *
 * A two-high look puts each safety over the half he will play from, so the man who rolls to
 * the left flat shows the left half and the trip he makes at the snap is the short one. On
 * Cover 3 Sky and Cover 1 Rat this reproduces exactly what ADR-068 step 1 wrote by hand.
 *
 * ⛔ No silent default: a card whose strong safety plays the middle with no run fit has no
 * side, and guessing one would put every such disguise on the same half of the field.
 */
function strongSafetySide(card: AnyDefensiveCard): RunSide {
  const duty = card.duties.S_S;
  const side = duty === undefined ? undefined : dutySide(duty);
  if (side === undefined) {
    throw new PlaybookError(
      `cannot place ${card.id}'s safeties in a mask: its strong safety's duty names no side ` +
        `(no lane, no man's side, no run fit)`,
    );
  }
  return side;
}

function otherSide(side: RunSide): RunSide {
  return side === "LEFT" ? "RIGHT" : "LEFT";
}

function deepHalf(side: RunSide): ZoneDuty {
  return { kind: "ZONE", ...zone("DEEP_HALF", side === "LEFT" ? "LH" : "RH") };
}

function twoHighSafeties(card: AnyDefensiveCard): Partial<Record<DefenseRole, ZoneDuty>> {
  const strong = strongSafetySide(card);
  return { S_S: deepHalf(strong), S_F: deepHalf(otherSide(strong)) };
}

// --- the catalogue ---------------------------------------------------------------

/** The quarters rotations, over which a Cover 2 shell lies about the corners as well. */
const QUARTERS_ROTATIONS: readonly CoverageFamily[] = ["QUARTERS", "COVER_6"];

/**
 * A Cover 2 shell shown: both safeties at deep halves.
 *
 * Over a one-high rotation (Cover 3, Cover 1, Fire Zone) the safeties roll at the snap and that
 * is the whole lie. Over a quarters rotation the safeties already play halves, and the lie is
 * the corners — the owner's "passive Cover 2 that converts to an aggressive Quarters match":
 * they squat in the flats before the snap and play deep at it, so the hole shot a Cover 2
 * invites has a corner on top of it.
 *
 * Phase 1 named these two masks (Two-High; Two-High, Cover 2 look). Their rotations never
 * overlapped, so one word draws exactly as the two did (ADR-071 §7 step 1).
 */
export const SHOW_2: CoverageMask = {
  id: "SHOW_2",
  name: "Show 2",
  over: ["COVER_3", "COVER_1", "FIRE_ZONE", "QUARTERS", "COVER_6"],
  weight: 1,
  looks: (card) =>
    QUARTERS_ROTATIONS.includes(card.family)
      ? {
          ...twoHighSafeties(card),
          CB_L: { kind: "ZONE", ...zone("FLAT", "LW") },
          CB_R: { kind: "ZONE", ...zone("FLAT", "RW") },
        }
      : twoHighSafeties(card),
};

/**
 * One-high shown, two-high played: the free safety sits in the middle and the strong safety
 * walks down over the tight end side, then bails to a deep half at the snap. The deep
 * sideline the quarterback expected against one-high has a half safety over it.
 */
export const SHOW_1: CoverageMask = {
  id: "SHOW_1",
  name: "Show 1",
  over: ["COVER_2", "QUARTERS", "COVER_6", "COVER_2_MAN"],
  weight: 1,
  looks: (card) => {
    const strong = strongSafetySide(card);
    return {
      S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
      S_S: { kind: "ZONE", ...zone("HOOK_CURL", strong === "LEFT" ? "LH" : "RH") },
    };
  },
};

/**
 * Phase 1 of ADR-069 §9.6 — every mask the engine can already resolve. The ORDER is part of the
 * draw (`weightedPick` walks the legal list in this order), so it is Phase 1's order with the
 * two two-high masks folded into Show 2's place.
 */
export const COVERAGE_MASKS: readonly CoverageMask[] = [SHOW_2, SHOW_1];

/** The mask as the call says it: a LOOK tag (ADR-071). */
export function lookTag(mask: CoverageMask): DefensiveTag {
  return { kind: "LOOK", id: mask.id, name: mask.name };
}

// --- legality and application -----------------------------------------------

/** The masks that state they may sit over this card's rotation. */
export function legalCoverageMasks(
  card: AnyDefensiveCard,
  catalogue: readonly CoverageMask[] = COVERAGE_MASKS,
): readonly CoverageMask[] {
  return catalogue.filter((mask) => mask.over.includes(card.family));
}

function sameZone(played: DefensiveDuty, shown: ZoneDuty): boolean {
  return (
    played.kind === "ZONE" &&
    played.responsibility === shown.responsibility &&
    played.zone.horizontal === shown.zone.horizontal &&
    played.zone.vertical === shown.zone.vertical &&
    played.laneSpan === shown.laneSpan &&
    played.depthSpan === shown.depthSpan
  );
}

/**
 * What the mask makes each man show on THIS card — only the men whose shown duty differs from
 * the one they play. A strong safety who already plays the deep half the mask would show him in
 * is not moved, and does not appear here.
 */
export function maskShows(
  card: AnyDefensiveCard,
  mask: CoverageMask,
): Readonly<Partial<Record<DefenseRole, ZoneDuty>>> {
  const shows: Partial<Record<DefenseRole, ZoneDuty>> = {};
  for (const [role, shown] of Object.entries(mask.looks(card)) as [DefenseRole, ZoneDuty][]) {
    const played = card.duties[role];
    if (played === undefined) {
      throw new PlaybookError(`${mask.name} moves ${role}, and ${card.id} has no ${role} on the field`);
    }
    if (!sameZone(played, shown)) shows[role] = shown;
  }
  return shows;
}

function disguiseRow(timing: MaskTiming): CoverageDisguise {
  return timing === "LATE" ? "LATE_ROTATION" : "ROTATED";
}

/**
 * The card, wearing the mask: the moved men's duties carry `shows`, the card carries §5.1's
 * complexity row and the mask's LOOK tag, and nothing else changes. `instantiateDefense` turns
 * the `shows` into `shownAssignments` exactly as it always has, and says the tag last.
 */
export function applyCoverageMask(card: AnyDefensiveCard, draw: MaskDraw): AnyDefensiveCard {
  const shows = maskShows(card, draw.mask);
  const moved = Object.keys(shows) as DefenseRole[];
  if (moved.length === 0) {
    throw new PlaybookError(
      `${draw.mask.name} over ${card.id} shows exactly what the card plays — that is not a ` +
        `disguise, and the mask must not state this rotation in \`over\``,
    );
  }
  const duties: Partial<Record<DefenseRole, DefensiveDuty>> = { ...card.duties };
  for (const role of moved) {
    const duty = card.duties[role];
    const shown = shows[role];
    if (duty === undefined || shown === undefined) continue;
    if (duty.kind === "RUSH") {
      throw new PlaybookError(
        `${draw.mask.name} moves ${role} on ${card.id}, who rushes — a shown rush is ADR-069 ` +
          `Phase 3 and nothing can show it yet`,
      );
    }
    duties[role] = { ...duty, shows: shown };
  }
  const looks = [...(card.looks ?? []), lookTag(draw.mask)];
  return { ...card, duties, coverageDisguise: disguiseRow(draw.timing), looks };
}

// --- the draw --------------------------------------------------------------------

const WEARS: readonly boolean[] = [true, false];
const TIMINGS: readonly MaskTiming[] = ["EARLY", "LATE"];

/**
 * Does this call wear a mask, which one, and how late does it rotate?
 *
 * **No die is rolled for a card nothing can mask** (ADR-005) — a goal-line call, Prevent, a
 * played Cover 0 — and none for "which mask" when only one is legal. The rate is ruling 4's
 * one league-wide number (`COVERAGE_MASK_RATE`); the caller draws this on an address of its
 * own, after the card, so the card it draws is the card it would have drawn without masks.
 */
export function selectCoverageMask(
  rng: Rng,
  card: AnyDefensiveCard,
  catalogue: readonly CoverageMask[] = COVERAGE_MASKS,
): MaskDraw | undefined {
  const legal = legalCoverageMasks(card, catalogue);
  if (legal.length === 0) return undefined;
  const wears = weightedPick(rng, WEARS, (w) => (w ? COVERAGE_MASK_RATE : 1 - COVERAGE_MASK_RATE));
  if (!wears) return undefined;
  const only = legal.length === 1 ? legal[0] : undefined;
  const mask = only ?? weightedPick(rng, legal, (m) => m.weight);
  const timing = weightedPick(rng, TIMINGS, (t) =>
    t === "LATE" ? LATE_ROTATION_SHARE : 1 - LATE_ROTATION_SHARE,
  );
  return { mask, timing };
}
