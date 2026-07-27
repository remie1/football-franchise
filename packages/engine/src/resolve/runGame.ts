/**
 * §14.2 PHASE 3 and §14.3 — WHERE THE BACK PUTS THE BALL, AND WHAT HAPPENS THERE.
 *
 * §14.2's vision check is ZONE-SCHEME ONLY, and that is the mechanical
 * expression of §6.2's "RB Vision Dependency: HIGH / LOW". On a gap play the
 * hole is designed and he hits it; no die is rolled, because there is no
 * decision to roll for (ADR-005: an absent check means no roll was made, never a
 * failed one). On a zone play the same back has to find the best of what the
 * line actually gave him, which may be a cutback behind a defender who overflowed
 * his gap (§6.2) rather than the lane that was drawn.
 *
 * §14.3 then turns the winning gap's ENGAGEMENT MARGIN into yards and into what
 * kind of contact he takes. Its thresholds are not §6.3's — see the warning on
 * `TUNABLES.runBlock.bands`, which is the defect, not the implementation.
 */
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { bandFor, compact, rollD100, tierFor } from "../rolls.js";
import { termAttrs, termModifiers } from "../terms.js";
import { TUNABLES } from "../tunables.js";
import type { GapId, RunGap, RunSide } from "../types.js";
import { yardsInBand } from "./ballCarrier.js";

export type PointOfAttackLabel = (typeof TUNABLES.runGame.pointOfAttack.bands)[number]["label"];
export type PointOfAttackContact =
  (typeof TUNABLES.runGame.pointOfAttack.bands)[number]["contact"];

/** Stable text for `RUN_RESOLUTION.gap` and for the §17 printout. */
export function gapKey(gap: GapId): string {
  return `${gap.side}-${gap.gap}`;
}

/** §3.1 lane a gap runs through, so a run can be placed on the zone grid. */
export function gapLane(gap: GapId): "LW" | "LH" | "C" | "RH" | "RW" {
  return TUNABLES.runGame.gapLane[gap.side][gap.gap];
}

// --- §14.2 PHASE 3: the vision check -----------------------------------------

export interface RbVisionArgs {
  readonly carrier: PlayerState;
  readonly visionRng: Rng;
}

export interface RbVisionOutcome {
  /** "Success: RB finds best lane." */
  readonly foundBestLane: boolean;
  readonly margin: number;
  readonly target: number;
  readonly roll: RollDetail;
  readonly check: CheckEmission;
}

export function resolveRbVision(args: RbVisionArgs): RbVisionOutcome {
  const t = TUNABLES.runGame.vision;
  const mods = compact(termModifiers(args.carrier, t.terms));
  const roll = rollD100(args.visionRng, mods);
  const margin = roll.total - t.target;

  return {
    foundBestLane: margin >= 0,
    margin,
    target: t.target,
    roll,
    check: {
      checkKind: "rb_vision",
      actors: [args.carrier.bio.id],
      roll,
      target: t.target,
      tier: tierFor(margin),
      margin,
      testsAttrs: termAttrs(t.terms),
    },
  };
}

// --- gap selection ------------------------------------------------------------

export interface GapResult {
  readonly gap: RunGap;
  readonly side: RunSide;
  /** §6.3 engagement margin, blocker minus defender. */
  readonly blockMargin: number;
  /** §6.2 — the defender in this gap overflowed, so the lane BEHIND him is live. */
  readonly overflowed: boolean;
  /** Set when a §6.4 climb left a linebacker free in this lane. */
  readonly freeLinebacker: boolean;
}

/**
 * Which gap the ball actually goes through.
 *
 * A back who wins §14.2's vision check takes the best lane on the field —
 * "best" being the gap with the largest engagement margin, with a gap whose
 * defender OVERFLOWED (§6.2) preferred at equal margin, because that is exactly
 * the cutback the doc says zone blocking creates. Everything else runs the gap
 * that was called. No die is involved: the choice is a deterministic function of
 * results the stream already carries (ADR-005).
 */
export function selectGap(
  gaps: readonly GapResult[],
  designed: GapId,
  foundBestLane: boolean,
): GapResult | undefined {
  const designedResult = gaps.find((g) => g.gap === designed.gap && g.side === designed.side);
  if (!foundBestLane) return designedResult ?? gaps[0];
  let best: GapResult | undefined;
  for (const gap of gaps) {
    if (best === undefined) {
      best = gap;
      continue;
    }
    if (gap.blockMargin > best.blockMargin) best = gap;
    else if (gap.blockMargin === best.blockMargin && gap.overflowed && !best.overflowed) best = gap;
  }
  return best;
}

// --- §14.3 RB at the line of scrimmage ----------------------------------------

export interface PointOfAttack {
  readonly band: PointOfAttackLabel;
  readonly contact: PointOfAttackContact;
  /** §14.3's "gains N yards before contact". */
  readonly yardsBeforeContact: number;
}

/**
 * §14.3, keyed on the §6.3 engagement margin in the gap he ran through.
 *
 * Read the four `contact` values as what the doc says happens next:
 *   SECOND_LEVEL — clean through, straight into §14.4.
 *   AT_LOS       — contact at the line; the second level still follows.
 *   POWER        — the stalemate collision, `atLosPower` (RB Power vs Tackling).
 *   EVADE        — a defender in the backfield, `atLosEvade` (Elusiveness vs
 *                  Tackling); failing it is the TFL.
 */
export function pointOfAttackFor(blockMargin: number): PointOfAttack {
  const band = bandFor(TUNABLES.runGame.pointOfAttack.bands, blockMargin);
  return {
    band: band.label,
    contact: band.contact,
    yardsBeforeContact: yardsInBand(band, blockMargin),
  };
}

/** Registry ids §14.2's vision check reads — exported for the exposure channel. */
export const RB_VISION_ATTRS = [ATTR.vision, ATTR.patience] as const;
