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
 * Under ADR-071 a mask is a LOOK tag, said last in the call by the word the captain uses.
 * Phase 1 (ADR-069) built the safety looks, which tell the first lie — the look shows a hole
 * the rotation fills:
 *
 *  - **Show 2** — both safeties at deep halves; the card rolls to one-high. Over a quarters
 *    rotation the corners squat in the flats too — the owner's "passive Cover 2 that converts
 *    to an aggressive Quarters match". (Phase 1's Two-High and Two-High Cover 2 look, which
 *    sat over disjoint rotations, as one word.)
 *  - **Show 1** — the free safety in the middle, the strong safety walked down; the card spins
 *    to two-high. (Phase 1's Single-High.)
 *
 * ADR-071 step 2 adds the corner looks (ADR-070 §1, ADR-071 §4). Two of them tell the second
 * lie — the look shows a man blanketed who is open at the snap — which needs a man look, so
 * `shows` can say one since this step:
 *
 *  - **Press** — both corners pressed on the #1 to their side; they bail to their deep zones.
 *  - **Split** — Cover 6 shown as its own mirror: the quarter-side corner pressed, the cloud
 *    corner off and deep; they trade jobs at the snap.
 *  - **Show 4** — the corners off and deep, a quarters look, over a rotation whose corners
 *    squat on the flats at the snap. The first lie again, told by the corners.
 *
 * **Robber** is not a mask: it is Show 2 over a robbing rotation, and Cover 3 Buzz is one.
 * The Stem and the Mug (the Cover 0 mug's backers' half; ADR-073 Decision 3) lie about the
 * rush, not the coverage: they are front looks, in `frontLooks.ts` (ADR-073 §2.5), and never
 * ride this catalogue — a front look here would change `legalLookCombinations`, and so v4's
 * and v6's dice.
 *
 * ================== ONE LOOK PER POSITION GROUP ==================
 *
 * A call can wear more than one look (ADR-070 §2, ADR-071 §3): at most one per position group,
 * so never two on one man — Show 2 with Press over Cover 3 is the owner's "commonest modern
 * two-high disguise". Show 2 over a quarters rotation moves the corners as well as the safeties,
 * so it combines with no corner look. Whether a call is disguised is still ONE die at ruling 4's
 * rate; the looks change which disguise is worn, not how often (`selectLooks`).
 *
 * ================== STATED, THEN CHECKED ==================
 *
 * Each mask STATES the rotations it may sit over (`over`). `test/masks.test.ts` CHECKS every
 * stated pairing against every card in those families, and every legal combination against
 * every formation: the men it moves are on the field, none of them rushes, and the look it
 * produces differs from what the card plays. A pairing that would show exactly what it plays is
 * refused there rather than drawn, because a mask that changes nothing would be a die that turns
 * nothing (ADR-005) and would count toward a disguise rate it does not earn.
 */
import type { CoverageDisguise, DefensiveTag, Rng, RunSide } from "@ff/contracts";
import { zone } from "./coverage.js";
import type {
  AnyDefensiveCard,
  CoverageFamily,
  DefensiveDuty,
  ManTarget,
  ShownDuty,
  ShownMan,
  ZoneDuty,
} from "./defense.js";
import { COVERAGE_MASK_RATE, LATE_ROTATION_SHARE, weightedPick } from "./distribution.js";
import { PlaybookError } from "./errors.js";
import { DEFENSE_ROLE_GROUP, type DefenseGroup, type DefenseRole } from "./roles.js";

export type CoverageMaskId = "SHOW_2" | "SHOW_1" | "PRESS" | "SPLIT" | "SHOW_4";

/**
 * EARLY: the safeties move before the snap and the quarterback can see the end of it — §5.1's
 * "rotated shell", +10. LATE: the look is held until the ball is snapped — §5.1's "heavy
 * disguise (late rotation)", +20.
 */
export type MaskTiming = "EARLY" | "LATE";

/**
 * WHEN THE LOOK COMES OFF, which is what sets §5.1's row (ADR-069 §9.5).
 *
 * BY_TIMING: a safety rotation, rolled EARLY (+10) or LATE (+20) — `MaskTiming`.
 * AT_THE_SNAP: a corner's bail or squat, which happens at the snap whatever the call: +10
 * (`CHOSEN — provenance NONE`, §9.5), and no timing die is rolled for it (ADR-005).
 */
export type LookRow = "BY_TIMING" | "AT_THE_SNAP";

export interface CoverageMask {
  readonly id: CoverageMaskId;
  /** The word the captain says. Becomes the LOOK tag's `name` on the call (ADR-071). */
  readonly name: string;
  /** The rotations it may be laid over — stated here, checked in `test/masks.test.ts`. */
  readonly over: readonly CoverageFamily[];
  readonly row: LookRow;
  /**
   * What each defender the mask moves shows, worked out against the card it is masking —
   * sides depend on where the card puts its safeties and corners. Every role it CAN move,
   * whether or not the card already plays that duty; `maskShows` keeps only the ones that
   * differ.
   */
  readonly looks: (card: AnyDefensiveCard) => Readonly<Partial<Record<DefenseRole, ShownDuty>>>;
}

/**
 * The looks one call wears, in catalogue order, and how late they rotate. `timing` is present
 * exactly when one of them is a safety rotation (`BY_TIMING`): a call wearing only corner looks
 * rolls no timing die, because nothing would turn on it.
 */
export interface LookDraw {
  readonly looks: readonly CoverageMask[];
  readonly timing?: MaskTiming;
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

/** The outside corners, each with the side he lines up on. */
const CORNERS: readonly (readonly [DefenseRole, RunSide])[] = [
  ["CB_L", "LEFT"],
  ["CB_R", "RIGHT"],
];

function deepQuarter(side: RunSide): ZoneDuty {
  return { kind: "ZONE", ...zone("DEEP_QUARTER", side === "LEFT" ? "LW" : "RW") };
}

/** Pressed on the #1 to his side — the man a corner presses in the corpus's own man calls. */
function pressOn(side: RunSide): ShownMan {
  return { kind: "MAN", target: { kind: "NUMBER", side, number: 1 }, technique: "PRESS" };
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
  row: "BY_TIMING",
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
  row: "BY_TIMING",
  looks: (card) => {
    const strong = strongSafetySide(card);
    return {
      S_F: { kind: "ZONE", ...zone("DEEP_MIDDLE_THIRD", "C") },
      S_S: { kind: "ZONE", ...zone("HOOK_CURL", strong === "LEFT" ? "LH" : "RH") },
    };
  },
};

/**
 * Both corners pressed on the #1 to their side — a man look — bailing at the snap to the deep
 * zones the card gives them (ADR-070 §1's Press-Bail). The second lie (ADR-070 §3): the look
 * shows a receiver blanketed who is open at the snap, so a fooled quarterback passes on him.
 *
 * Over the rotations whose corners play deep: Cover 3 and Fire Zone (thirds), Quarters
 * (quarters). Not over Cover 6, whose corners play different jobs — that is Split — and never
 * over man coverage, which already presses: a pressed look over it is the truth.
 */
export const PRESS: CoverageMask = {
  id: "PRESS",
  name: "Press",
  over: ["COVER_3", "FIRE_ZONE", "QUARTERS"],
  row: "AT_THE_SNAP",
  looks: () => ({ CB_L: pressOn("LEFT"), CB_R: pressOn("RIGHT") }),
};

/**
 * Cover 6 shown as its own mirror (ADR-070 §1's Split-Field): the quarter-side corner is shown
 * pressed and bails to his deep quarter at the snap; the cloud corner is shown off and deep, at
 * a deep quarter, and drives the flat at the snap. Each corner's job comes from the card, so a
 * Cover 6 to either side is split the right way round.
 *
 * ⛔ No guessing: a card without exactly one corner on a deep quarter and one in the flat has no
 * quarter side and cloud side to trade, and it throws rather than splitting something else.
 */
export const SPLIT: CoverageMask = {
  id: "SPLIT",
  name: "Split",
  over: ["COVER_6"],
  row: "AT_THE_SNAP",
  looks: (card) => {
    const jobs = CORNERS.map(([role, side]) => {
      const duty = card.duties[role];
      return { role, side, job: duty?.kind === "ZONE" ? duty.responsibility : duty?.kind };
    });
    const quarter = jobs.filter((c) => c.job === "DEEP_QUARTER");
    const cloud = jobs.filter((c) => c.job === "FLAT");
    if (quarter.length !== 1 || cloud.length !== 1) {
      throw new PlaybookError(
        `Split over ${card.id}: its corners play ${jobs.map((c) => `${c.role} ${String(c.job)}`).join(", ")} — ` +
          `Split needs one on a deep quarter and one in the flat`,
      );
    }
    const shown: Partial<Record<DefenseRole, ShownDuty>> = {};
    for (const corner of quarter) shown[corner.role] = pressOn(corner.side);
    for (const corner of cloud) shown[corner.role] = deepQuarter(corner.side);
    return shown;
  },
};

/**
 * A quarters look (ADR-071 §4, the owner's word): both corners off and deep, each at the deep
 * quarter on his side. Over Cover 2 (Tampa 2 included) they squat on the flats at the snap, so
 * the flat that looked empty has a corner in it — Phase 1's lie, told by the corners. Over
 * Cover 6 only the cloud corner moves; the quarter-side corner already plays the deep quarter.
 *
 * Never over press man (Cover 2 Man): a corner shown eight yards off cannot press at the snap,
 * and a look may not change the technique a man plays. `CHOSEN — a football judgement, the
 * owner's to correct` (ADR-071 §4).
 */
export const SHOW_4: CoverageMask = {
  id: "SHOW_4",
  name: "Show 4",
  over: ["COVER_2", "COVER_6"],
  row: "AT_THE_SNAP",
  looks: () => ({ CB_L: deepQuarter("LEFT"), CB_R: deepQuarter("RIGHT") }),
};

/**
 * Phase 1's catalogue (ADR-069 §9.6) in Phase 1's order, with its two two-high masks folded
 * into Show 2's place: the looks caller v3 wears, kept so v3 draws exactly what it always drew.
 */
export const PHASE_1_MASKS: readonly CoverageMask[] = [SHOW_2, SHOW_1];

/**
 * Every look the engine can resolve: Phase 1's, then ADR-071 step 2's corner looks — what
 * caller v4 wears. The ORDER is part of the draw: `legalLookCombinations` lists combinations in
 * it, and `weightedPick` walks that list.
 */
export const COVERAGE_MASKS: readonly CoverageMask[] = [SHOW_2, SHOW_1, PRESS, SPLIT, SHOW_4];

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

function sameTarget(a: ManTarget, b: ManTarget): boolean {
  switch (a.kind) {
    case "NUMBER":
      return b.kind === "NUMBER" && a.side === b.side && a.number === b.number;
    case "BACK":
      return b.kind === "BACK" && a.index === b.index;
    case "TIGHT_END":
      return b.kind === "TIGHT_END" && a.index === b.index;
  }
}

function showsWhatHePlays(played: DefensiveDuty, shown: ShownDuty): boolean {
  if (shown.kind === "ZONE") return sameZone(played, shown);
  return played.kind === "MAN" && sameTarget(played.target, shown.target) && played.technique === shown.technique;
}

/**
 * What the mask makes each man show on THIS card — only the men whose shown duty differs from
 * the one they play. A strong safety who already plays the deep half the mask would show him in
 * is not moved, and does not appear here.
 */
export function maskShows(
  card: AnyDefensiveCard,
  mask: CoverageMask,
): Readonly<Partial<Record<DefenseRole, ShownDuty>>> {
  const shows: Partial<Record<DefenseRole, ShownDuty>> = {};
  for (const [role, shown] of Object.entries(mask.looks(card)) as [DefenseRole, ShownDuty][]) {
    const played = card.duties[role];
    if (played === undefined) {
      throw new PlaybookError(`${mask.name} moves ${role}, and ${card.id} has no ${role} on the field`);
    }
    if (!showsWhatHePlays(played, shown)) shows[role] = shown;
  }
  return shows;
}

/** The position groups a look moves on this card — the men it moves, by group (ADR-071 §3). */
function groupsMoved(card: AnyDefensiveCard, mask: CoverageMask): ReadonlySet<DefenseGroup> {
  return new Set((Object.keys(maskShows(card, mask)) as DefenseRole[]).map((role) => DEFENSE_ROLE_GROUP[role]));
}

/**
 * EVERY SET OF LOOKS THIS CARD CAN WEAR (ADR-070 §2, ADR-071 §3 rule 1): each legal look alone,
 * then each set of legal looks whose moved men fall in different position groups — so no two
 * looks in a set move the same group, and none moves the same man.
 *
 * In catalogue order, single looks first, then pairs, then larger sets. That order is part of the
 * draw, and it is why a catalogue whose looks never combine (Phase 1's: Show 2 and Show 1 both
 * move the safeties) draws exactly as it did one look at a time.
 */
export function legalLookCombinations(
  card: AnyDefensiveCard,
  catalogue: readonly CoverageMask[] = COVERAGE_MASKS,
): readonly (readonly CoverageMask[])[] {
  const legal = legalCoverageMasks(card, catalogue).map((mask) => ({ mask, groups: groupsMoved(card, mask) }));
  type Entry = (typeof legal)[number];
  const apart = (a: Entry, b: Entry): boolean => [...a.groups].every((group) => !b.groups.has(group));
  const combinations: (readonly CoverageMask[])[] = [];
  let sets: { readonly last: number; readonly entries: readonly Entry[] }[] = legal.map((entry, i) => ({
    last: i,
    entries: [entry],
  }));
  while (sets.length > 0) {
    combinations.push(...sets.map((set) => set.entries.map((entry) => entry.mask)));
    const larger: { readonly last: number; readonly entries: readonly Entry[] }[] = [];
    for (const set of sets) {
      legal.forEach((entry, j) => {
        if (j > set.last && set.entries.every((other) => apart(other, entry))) {
          larger.push({ last: j, entries: [...set.entries, entry] });
        }
      });
    }
    sets = larger;
  }
  return combinations;
}

function disguiseRow(timing: MaskTiming): CoverageDisguise {
  return timing === "LATE" ? "LATE_ROTATION" : "ROTATED";
}

/**
 * The card, wearing its looks: each moved man's duty carries `shows`, the card carries §5.1's
 * complexity row and one LOOK tag per look, in the draw's order, and nothing else changes.
 * `instantiateDefense` turns the `shows` into `shownAssignments`, and says the tags last.
 *
 * THE ROW. A corner look's bail is §5.1's +10 (ADR-069 §9.5); a safety rotation is +10 early and
 * +20 late. A call wearing both takes the LARGER of the two (ADR-070 §1) — it is still one look,
 * read once — and the safety rotation's row is never the smaller, so it is the row.
 *
 * ⛔ LOUD, NOT FORGIVING: a look that moves nobody on this card, a look that moves a rusher, two
 * looks moving one position group, and a timing that does not match the looks (missing on a
 * safety rotation, present on corner looks alone) each throw. `selectLooks` never produces one;
 * a hand-built draw that does is a bug, and a disguise counted that never happened.
 */
export function applyLooks(card: AnyDefensiveCard, draw: LookDraw): AnyDefensiveCard {
  if (draw.looks.length === 0) {
    throw new PlaybookError(`${card.id}: a draw with no look — a call that wears nothing is the card itself`);
  }
  const duties: Partial<Record<DefenseRole, DefensiveDuty>> = { ...card.duties };
  const groupOwner = new Map<DefenseGroup, CoverageMask>();
  for (const mask of draw.looks) {
    const shows = maskShows(card, mask);
    const moved = Object.keys(shows) as DefenseRole[];
    if (moved.length === 0) {
      throw new PlaybookError(
        `${mask.name} over ${card.id} shows exactly what the card plays — that is not a ` +
          `disguise, and the mask must not state this rotation in \`over\``,
      );
    }
    for (const role of moved) {
      const group = DEFENSE_ROLE_GROUP[role];
      const owner = groupOwner.get(group);
      if (owner !== undefined && owner !== mask) {
        throw new PlaybookError(
          `${owner.name} and ${mask.name} both move ${group} on ${card.id} — one look per position ` +
            `group (ADR-071 §3)`,
        );
      }
      groupOwner.set(group, mask);
      const duty = card.duties[role];
      const shown = shows[role];
      if (duty === undefined || shown === undefined) continue;
      if (duty.kind === "RUSH") {
        throw new PlaybookError(
          `${mask.name} moves ${role} on ${card.id}, who rushes — a coverage look never moves a ` +
            `rusher; a shown rush is a front look's (\`applyFrontLook\`, ADR-073 §2.5)`,
        );
      }
      duties[role] = { ...duty, shows: shown };
    }
  }
  const timed = draw.looks.some((mask) => mask.row === "BY_TIMING");
  if (timed && draw.timing === undefined) {
    throw new PlaybookError(`${card.id}: a safety rotation needs a timing, early or late`);
  }
  if (!timed && draw.timing !== undefined) {
    throw new PlaybookError(
      `${card.id}: a timing for corner looks alone — they come off at the snap, so it would turn ` +
        `nothing (ADR-005)`,
    );
  }
  const coverageDisguise = draw.timing === undefined ? "ROTATED" : disguiseRow(draw.timing);
  const looks = [...(card.looks ?? []), ...draw.looks.map(lookTag)];
  return { ...card, duties, coverageDisguise, looks };
}

// --- the draw --------------------------------------------------------------------

const WEARS: readonly boolean[] = [true, false];
const TIMINGS: readonly MaskTiming[] = ["EARLY", "LATE"];

/**
 * Does this call wear a look, which looks, and how late do they rotate?
 *
 * ONE DIE DECIDES WHETHER (ADR-069 ruling 4, ADR-070 ruling 4): `COVERAGE_MASK_RATE`, the one
 * league-wide number, whatever the catalogue. A second pick chooses among the legal combinations
 * at EQUAL weight (ADR-070 §2, `CHOSEN — provenance NONE`; it becomes a defensive coordinator's
 * tendency when ruling 4's trait lands). The timing die is rolled only when a safety rotation is
 * worn. The caller draws all of this on an address of its own, after the card, so the card it
 * draws is the card it would have drawn without looks.
 *
 * **No die is rolled for a card nothing can mask** (ADR-005) — a goal-line call, Prevent, a
 * played Cover 0 — and none for "which looks" when only one combination is legal.
 *
 * PHASE 1 DRAWS AS IT ALWAYS DID. Over `PHASE_1_MASKS` no two looks combine, so the
 * combinations are the single looks in Phase 1's order at Phase 1's equal weights, and every die
 * falls where it fell: caller v3 is unchanged by this step (ADR-071 §11).
 */
export function selectLooks(
  rng: Rng,
  card: AnyDefensiveCard,
  catalogue: readonly CoverageMask[] = COVERAGE_MASKS,
): LookDraw | undefined {
  const combinations = legalLookCombinations(card, catalogue);
  if (combinations.length === 0) return undefined;
  const wears = weightedPick(rng, WEARS, (w) => (w ? COVERAGE_MASK_RATE : 1 - COVERAGE_MASK_RATE));
  if (!wears) return undefined;
  const only = combinations.length === 1 ? combinations[0] : undefined;
  const looks = only ?? weightedPick(rng, combinations, () => 1);
  if (!looks.some((mask) => mask.row === "BY_TIMING")) return { looks };
  const timing = weightedPick(rng, TIMINGS, (t) =>
    t === "LATE" ? LATE_ROTATION_SHARE : 1 - LATE_ROTATION_SHARE,
  );
  return { looks, timing };
}
