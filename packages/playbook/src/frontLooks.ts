/**
 * THE FRONT LOOKS — ADR-073 §2.5: the Mug and the Stem, which calls can wear one, the dice that
 * draw one, and R28, the rule every call wearing one keeps.
 *
 * A coverage look (`masks.ts`) lies about the coverage: it changes `shownAssignments`. A front
 * look lies about the RUSH: it changes `shownRush`, what the offence is shown of who comes.
 *
 *  - **Mug** (the backers' half of the Cover 0 mug; ADR-073 Decision 3). LB_W and LB_M — in Dime
 *    LB_M alone — walked up as A-gap rushers, with the line in its stance. Legal where a walked-up
 *    backer or a down lineman drops: a man shown rushing who does not come.
 *  - **Stem** (the line). Every rushing down lineman shown one spot toward the side opposite the
 *    played strength, so the shown strength lies. Legal where three or more down linemen rush,
 *    none drops, and no shifted lineman lands on a spot another shown rusher holds.
 *
 * Neither is legal over Prevent or a goal-line call (§2.5). The look is the caller's draw, made
 * once a snap on the CALLED card — the card after its coverage looks — and never on the huddle's
 * anticipated card: the huddle cannot see a look; the line reads it (R30).
 *
 * ================== NOT IN THE COVERAGE LOOKS' CATALOGUE ==================
 *
 * A front look in `COVERAGE_MASKS` would change `legalLookCombinations`, and so v4's and v6's
 * `wears` and `which` dice, on every call it is legal over (§2.5). So it is drawn here, on the
 * caller's own `defense-front` fork, and nothing on caller v1–v6's path imports this module.
 *
 * ================== THE DICE ==================
 *
 * `drawFrontLook` throws each die on its own child of the Rng it is given, and none on that Rng
 * itself; each die is one `weightedPick`, so `distribution.ts` stays the only module that consumes
 * randomness. No die is thrown that would turn nothing (ADR-005):
 *
 *  - `wears`, only if a look in the catalogue is legal on the called card: yes at the rate given,
 *    `FRONT_LOOK_RATE` unless the caller says otherwise;
 *  - `which`, only if both looks remain, at equal weight (Q5(a): "split evenly where both fit");
 *  - `stem-side`, only for a Stem over a balanced played rush with both sides legal, at equal
 *    weight. Over a balanced rush with one legal side the draw names that side and throws nothing.
 *
 * ================== R28 ==================
 *
 * Every tag is derived or checked, never only declared (R28; ADR-071 §6). ADR-073 §3.5 states the
 * rule for a front look: a front LOOK tag is carried exactly when `shownRush` is not the same array
 * as `rush`, and then the two lists differ in at least one entry on rusher, side, alignment or gap
 * (`shownRushDiffers`). `move` never counts, and a side or gap stated on one list and omitted on
 * the other is not a difference (P1).
 * `validateFrontLook` states the rule as diagnostics; `assertValidFrontLook` throws on them.
 */
import type { DefensivePlayCall, DefensiveTag, Rng, RunGap, RunSide, ShownRusher } from "@ff/contracts";
import type { AnyDefensiveCard, CoverageFamily, DefensiveDuty } from "./defense.js";
import { dutyList } from "./defense.js";
import { FRONT_LOOK_RATE, weightedPick } from "./distribution.js";
import { InvalidCardError, PlaybookError } from "./errors.js";
import type { DefensePersonnel, DefenseRole } from "./roles.js";
import { DEFENSE_ROLE_GROUP } from "./roles.js";
import type { Diagnostic } from "./validate.js";

// --- the catalogue -----------------------------------------------------------------------------

/** The two front looks (ADR-073 §2.5). */
export type FrontLookId = "MUG" | "STEM";

/**
 * The catalogue, in the order the draw walks it: the Mug, then the Stem. The ORDER is part of the
 * draw, as `COVERAGE_MASKS`' is: `/which` picks between the legal looks in it.
 */
export const FRONT_LOOKS: readonly FrontLookId[] = ["MUG", "STEM"];

/** The word the captain says (ADR-073 §2.5's tags). */
const FRONT_LOOK_NAME: Readonly<Record<FrontLookId, string>> = { MUG: "Mug", STEM: "Stem" };

const isFrontLookId = (id: string): id is FrontLookId => id === "MUG" || id === "STEM";

/**
 * The look as the call says it: a LOOK tag, `{kind: "LOOK", id: "MUG" | "STEM", name: "Mug" |
 * "Stem"}`, said after the coverage looks. The renderer tells the Mug look from the "Mug" front
 * name by its place in the call (ADR-073 §2.5, ADR-071).
 */
export function frontLookTag(id: FrontLookId): DefensiveTag {
  return { kind: "LOOK", id, name: FRONT_LOOK_NAME[id] };
}

/** Whether a tag is a front LOOK tag (a Mug or a Stem), as against a coverage look. */
export function isFrontLookTag(tag: DefensiveTag): boolean {
  return tag.kind === "LOOK" && isFrontLookId(tag.id);
}

// --- the pieces legality reads -----------------------------------------------------------------

/** Both looks are illegal over these (ADR-073 §2.5). */
const NO_FRONT_LOOK: ReadonlySet<CoverageFamily> = new Set<CoverageFamily>(["PREVENT", "GOAL_LINE"]);

/** The backers a Mug walks up: LB_M alone in Dime, LB_W and LB_M otherwise (ADR-073 §2.5). */
function walkedUpBackers(personnel: DefensePersonnel): readonly DefenseRole[] {
  return personnel === "DIME" ? ["LB_M"] : ["LB_W", "LB_M"];
}

const isDownLineman = (role: DefenseRole): boolean => DEFENSE_ROLE_GROUP[role] === "LINE";

const drops = (duty: DefensiveDuty): boolean => duty.kind !== "RUSH";

/** R25's test at card level: a coverage look moved this man (`applyLooks` writes `shows` on him). */
const carriesShows = (duty: DefensiveDuty): boolean => duty.kind !== "RUSH" && duty.shows !== undefined;

/** A rusher where the Stem reads him: whether he is a down lineman, and his side and gap. */
interface Spot {
  readonly line: boolean;
  readonly side: RunSide;
  readonly gap: RunGap;
}

/** §2.5's positions, left to right: D, C, B, A | A, B, C, D. */
const POSITIONS: readonly { readonly side: RunSide; readonly gap: RunGap }[] = [
  { side: "LEFT", gap: "D" },
  { side: "LEFT", gap: "C" },
  { side: "LEFT", gap: "B" },
  { side: "LEFT", gap: "A" },
  { side: "RIGHT", gap: "A" },
  { side: "RIGHT", gap: "B" },
  { side: "RIGHT", gap: "C" },
  { side: "RIGHT", gap: "D" },
];

function positionOf(side: RunSide, gap: RunGap): number {
  const at = POSITIONS.findIndex((p) => p.side === side && p.gap === gap);
  if (at < 0) throw new PlaybookError(`no position ${side} ${gap}`);
  return at;
}

/** One spot toward X, clamped at the ends (§2.5): a lineman at the end stays where he is. */
const towards = (at: number, x: RunSide): number =>
  Math.min(POSITIONS.length - 1, Math.max(0, at + (x === "LEFT" ? -1 : 1)));

/** More played rushers on one side is the strength; `undefined` is a balanced rush (§2.5). */
function playedStrength(rush: readonly Spot[]): RunSide | undefined {
  const left = rush.filter((r) => r.side === "LEFT").length;
  const right = rush.length - left;
  if (left === right) return undefined;
  return left > right ? "LEFT" : "RIGHT";
}

const opposite = (side: RunSide): RunSide => (side === "LEFT" ? "RIGHT" : "LEFT");

/**
 * The Stem's one-spot rule (ADR-073 §2.5): shifted toward X, no down lineman lands on a (side,
 * gap) another shown rusher holds — a shifted lineman, or a rusher off the line where he plays.
 */
function stemClear(rush: readonly Spot[], x: RunSide): boolean {
  const shown = rush.map((r) => {
    const at = positionOf(r.side, r.gap);
    return { line: r.line, at: r.line ? towards(at, x) : at };
  });
  return shown.every((a, i) => !a.line || shown.every((b, j) => j === i || b.at !== a.at));
}

/** The card's played rush, as the Stem reads it: every RUSH duty's side and gap (`RushDuty.gap`). */
function cardRush(card: AnyDefensiveCard): readonly Spot[] {
  return dutyList(card).flatMap(({ role, duty }) =>
    duty.kind === "RUSH" ? [{ line: isDownLineman(role), side: duty.side, gap: duty.gap }] : [],
  );
}

// --- legality ----------------------------------------------------------------------------------

/** A look the called card can wear: the Mug, or the Stem with the sides X may take. */
export type FrontLookOption =
  | { readonly look: "MUG" }
  | {
      readonly look: "STEM";
      /**
       * The X the Stem may shift toward: the one side opposite the played strength, or, over a
       * balanced rush, each side that keeps the one-spot rule (LEFT first). Never empty.
       */
      readonly sides: readonly RunSide[];
    };

/**
 * The front looks the CALLED card can wear (ADR-073 §2.5), in `FRONT_LOOKS` order. The card is the
 * card after its coverage looks, so a man a coverage look moves carries `shows` here.
 *
 *  - **Neither** over Prevent or a goal-line call.
 *  - **The Mug** iff a walked-up backer (LB_W and LB_M; LB_M alone in Dime) or a down lineman does
 *    not rush: the Mug shows him rushing, so it moves somebody.
 *  - **The Stem** iff three or more down linemen rush and none drops, and toward some X — the side
 *    opposite the played strength, counted over every RUSH duty, or either side over a balanced
 *    rush — no shifted lineman lands on a (side, gap) another shown rusher holds. Positions are
 *    read off each RUSH duty's `gap` and `side`.
 *  - **R25**: a look is illegal if a man it would move carries `shows`, which only a coverage look
 *    writes (`applyLooks`). The Mug moves the walked-up backers and the dropping linemen; the Stem
 *    moves rushing linemen, whom no coverage look can move (`applyLooks` refuses), so for the Stem
 *    the check is vacuous by construction.
 *
 * Legality is the card's: a MAN duty counts as dropping whatever its `ifAbsent`. Where a formation
 * makes the drawn look illegal on the instantiated call, that call wears none (§2.5).
 */
export function legalFrontLooks(card: AnyDefensiveCard): readonly FrontLookOption[] {
  if (NO_FRONT_LOOK.has(card.family)) return [];
  const duties = dutyList(card);
  const walkedUp = new Set(walkedUpBackers(card.personnel));
  const backers = duties.filter((entry) => walkedUp.has(entry.role)).map((entry) => entry.duty);
  const line = duties.filter((entry) => isDownLineman(entry.role)).map((entry) => entry.duty);
  const options: FrontLookOption[] = [];

  const mugMoves = [...backers, ...line.filter(drops)];
  if ((backers.some(drops) || line.some(drops)) && !mugMoves.some(carriesShows)) options.push({ look: "MUG" });

  const rushingLine = line.filter((duty) => !drops(duty));
  if (rushingLine.length >= 3 && !line.some(drops) && !rushingLine.some(carriesShows)) {
    const rush = cardRush(card);
    const strength = playedStrength(rush);
    const candidates: readonly RunSide[] = strength === undefined ? ["LEFT", "RIGHT"] : [opposite(strength)];
    const sides = candidates.filter((x) => stemClear(rush, x));
    if (sides.length > 0) options.push({ look: "STEM", sides });
  }
  return options;
}

// --- the draw ----------------------------------------------------------------------------------

/**
 * The front look drawn for a snap, bound to the called card it was drawn on (`cardId`: an
 * instantiated defence carries no family, so the card that passed `legalFrontLooks` is named).
 * A Stem over a balanced played rush names its X in `side`; over an unbalanced one the played
 * strength sets X and `side` is absent.
 */
export type FrontLookDraw = { readonly cardId: string } & (
  | { readonly look: "MUG" }
  | { readonly look: "STEM"; readonly side?: RunSide }
);

const YES_NO: readonly boolean[] = [true, false];

/** A yes/no die: one two-item pick, yes with weight `rate`, no with `1 − rate` (as `pressureDraw.ts`'s). */
function yes(rng: Rng, rate: number): boolean {
  return weightedPick(rng, YES_NO, (answer) => (answer ? rate : 1 - rate));
}

function checkedCatalogue(catalogue: readonly FrontLookId[]): void {
  let last = -1;
  for (const id of catalogue) {
    const at = FRONT_LOOKS.indexOf(id);
    if (at <= last) {
      throw new PlaybookError(
        `a front-look catalogue is FRONT_LOOKS or a part of it, in its order, each look once: got ` +
          `[${catalogue.join(", ")}] — the order is part of the draw`,
      );
    }
    last = at;
  }
}

/**
 * The front look over the called card (ADR-073 §2.5), on the Rng it is given — the caller's
 * `defense-front` fork. Its dice are that Rng's children, `wears`, `which` and `stem-side`, each
 * thrown only where this module's header says (ADR-005).
 *
 * `catalogue` narrows the looks before `wears` and keeps the rate: the legal looks it does not
 * name are not offered, and an empty catalogue throws no die. It must be `FRONT_LOOKS` or a part
 * of it, in its order. `rate` is the chance of a look on a call that can wear one: the owner's
 * `FRONT_LOOK_RATE`, which the caller passes.
 *
 * Returns the look, or `undefined` for none.
 */
export function drawFrontLook(
  rng: Rng,
  card: AnyDefensiveCard,
  catalogue: readonly FrontLookId[] = FRONT_LOOKS,
  rate: number = FRONT_LOOK_RATE,
): FrontLookDraw | undefined {
  checkedCatalogue(catalogue);
  if (!(Number.isFinite(rate) && rate >= 0 && rate <= 1)) {
    throw new PlaybookError(`the front-look rate ${rate} over ${card.id} is no rate`);
  }
  const options = legalFrontLooks(card).filter((option) => catalogue.includes(option.look));
  const [first] = options;
  if (first === undefined || !yes(rng.fork("wears"), rate)) return undefined;
  const option = options.length === 1 ? first : weightedPick(rng.fork("which"), options, () => 1);
  if (option.look === "MUG") return { cardId: card.id, look: "MUG" };
  if (playedStrength(cardRush(card)) !== undefined) return { cardId: card.id, look: "STEM" };
  const [only] = option.sides;
  const side =
    option.sides.length === 1 && only !== undefined ? only : weightedPick(rng.fork("stem-side"), option.sides, () => 1);
  return { cardId: card.id, look: "STEM", side };
}

// --- R28 ---------------------------------------------------------------------------------------

/**
 * Whether the shown rush differs from the played one, entry by entry (ADR-073 §3.5's R28 and
 * `front_look_rate`'s comparison): the lengths differ, or at some index the rusher differs, both
 * entries state a side and the sides differ, both state a gap and the gaps differ, or the
 * alignments differ. `move` is never read. A side or gap stated on one list and omitted on the
 * other is no difference (P1); an alignment is compared as stated, and R28 refuses an omitted one.
 */
export function shownRushDiffers(rush: readonly ShownRusher[], shown: readonly ShownRusher[]): boolean {
  if (rush.length !== shown.length) return true;
  return rush.some((played, i) => {
    const seen = shown[i];
    if (seen === undefined || seen.rusher !== played.rusher) return true;
    if (played.side !== undefined && seen.side !== undefined && played.side !== seen.side) return true;
    if (played.gap !== undefined && seen.gap !== undefined && played.gap !== seen.gap) return true;
    return played.alignment !== seen.alignment;
  });
}

const err = (code: string, where: string, message: string): Diagnostic => ({
  code,
  severity: "ERROR",
  where,
  message,
});

/**
 * R28 (ADR-073 §3.5): a front LOOK tag is carried iff `shownRush` is not the same array as
 * `rush`, and then the two differ in at least one entry (`shownRushDiffers`). With it:
 *
 *  - `C_FRONT_LOOK_TWICE` — two or more front LOOK tags: at most one front look a call (R21);
 *  - `C_FRONT_LOOK_UNNAMED` — a second shown-rush list and no front LOOK tag;
 *  - `C_FRONT_LOOK_UNWORN` — a front LOOK tag over the same array, or over a copy that differs
 *    from `rush` in no entry;
 *  - `C_FRONT_LOOK_NAME` — a front LOOK tag whose `name` is not its id's word, "Mug" or "Stem";
 *  - `C_FRONT_LOOK_ORDER` — a front LOOK tag that is not the call's last tag: the call is said
 *    line game, pressure, coverage looks, then the front look;
 *  - `C_SHOWN_ALIGNMENT_OMITTED` — an entry of either list with no `alignment` on a call with a
 *    second list. Alignments are compared resolved, and the playbook cannot resolve an omitted
 *    one (that needs the engine's tunables), so it is refused rather than guessed.
 *
 * The order of the entries is not part of the rule: a tagged, permuted copy of `rush` differs
 * entry by entry, and passes.
 */
export function validateFrontLook(call: DefensivePlayCall): readonly Diagnostic[] {
  const out: Diagnostic[] = [];
  const fronts = call.tags.flatMap((tag, i) => (isFrontLookTag(tag) ? [{ tag, i }] : []));
  if (fronts.length > 1) {
    out.push(
      err(
        "C_FRONT_LOOK_TWICE",
        "call.tags",
        `${fronts.length} front looks (${fronts.map((f) => f.tag.id).join(", ")}) — at most one a call (R21)`,
      ),
    );
  }
  for (const { tag, i } of fronts) {
    const word = isFrontLookId(tag.id) ? FRONT_LOOK_NAME[tag.id] : undefined;
    if (tag.name !== word) {
      out.push(err("C_FRONT_LOOK_NAME", `call.tags[${i}]`, `the ${tag.id} look is said "${String(word)}", not "${tag.name}"`));
    }
    if (i !== call.tags.length - 1) {
      out.push(
        err(
          "C_FRONT_LOOK_ORDER",
          `call.tags[${i}]`,
          `the ${tag.id} look is tag ${i + 1} of ${call.tags.length}; a front look is said last`,
        ),
      );
    }
  }
  const second = call.shownRush !== call.rush;
  if (second) {
    const lists: readonly (readonly [string, readonly ShownRusher[]])[] = [
      ["call.rush", call.rush],
      ["call.shownRush", call.shownRush],
    ];
    for (const [name, list] of lists) {
      list.forEach((entry, i) => {
        if (entry.alignment === undefined) {
          out.push(
            err(
              "C_SHOWN_ALIGNMENT_OMITTED",
              `${name}[${i}]`,
              `${String(entry.rusher)} states no alignment; under a second shown-rush list it is ` +
                `compared resolved, and the playbook cannot resolve it`,
            ),
          );
        }
      });
    }
    if (fronts.length === 0) {
      out.push(
        err("C_FRONT_LOOK_UNNAMED", "call.shownRush", "a second shown-rush list and no front LOOK tag names it"),
      );
    }
  }
  if (fronts.length > 0 && (!second || !shownRushDiffers(call.rush, call.shownRush))) {
    out.push(
      err(
        "C_FRONT_LOOK_UNWORN",
        "call.shownRush",
        second
          ? "a front LOOK tag over a shown rush that differs from the played one in no entry"
          : "a front LOOK tag over the played rush itself (`shownRush` is `rush`)",
      ),
    );
  }
  return out;
}

/** R28, loud: throws `InvalidCardError` with every diagnostic `validateFrontLook` finds. */
export function assertValidFrontLook(call: DefensivePlayCall): void {
  const problems = validateFrontLook(call);
  if (problems.length > 0) {
    throw new InvalidCardError(`defensive call "${call.personnel} ${call.front}, ${call.concept}"`, problems);
  }
}
