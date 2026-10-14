/**
 * THE WORDS OF A DEFENSIVE CALL — ADR-071.
 *
 * A call is said in four parts, in the owner's order: **personnel, front, concept, tags** —
 * "Nickel Over Tex, Fire, Cover 3, Show 2". The first three are names a card states. A tag is
 * one word that changes one or two position groups, of one of three kinds by the LAYER of the
 * call it changes (contracts' `DefensiveTagKind`):
 *
 *  - a **look** changes only what the offence is shown — `masks.ts`, drawn over a card;
 *  - a **pressure** changes who rushes and who takes their coverage — declared on the card;
 *  - a **front tag** changes how the line plays — derived from the card's stunts.
 *
 * ================== EVERY TAG IS DERIVED OR CHECKED, NEVER ONLY DECLARED ==================
 *
 * A tag is a NAME for a change already written into the call, so the one way it can lie is by
 * naming a change that is not there. Each kind is pinned to its layer differently:
 *
 *  - A line game is DERIVED from the stunts (`LINE_GAME_TAGS`), so a card cannot name one it
 *    does not play. `validate.ts` refuses a card whose stunts disagree on their row.
 *  - A pressure is DECLARED on the card and CHECKED against its rushers (`validate.ts`,
 *    `D_PRESSURE_*`): declared exactly when somebody off the line rushes, and each word with
 *    the rushers and the deep help it says.
 *  - A look is worn exactly when the shown coverage differs from the played one;
 *    `masks.test.ts` and calibration's `shownAssignmentsStream` hold every look to that.
 */
import type { DefensiveTag, StuntComplexity } from "@ff/contracts";
import type { AnyDefensiveCard } from "./defense.js";
import { stuntComplexity } from "./defense.js";
import type { DefensePersonnel } from "./roles.js";

/**
 * The call's first part, as said. TOTAL over `DefensePersonnel`, so a fifth personnel
 * grouping does not compile until somebody names it.
 */
export const PERSONNEL_WORD: Readonly<Record<DefensePersonnel, string>> = {
  BASE: "Base",
  NICKEL: "Nickel",
  DIME: "Dime",
  GOAL_LINE: "Goal Line",
};

/**
 * Line games, by match-engine §7.3's complexity row. The words are `CHOSEN — provenance NONE`
 * (ADR-071 §4); §7.3 names the rows "T/E twist", "T/T (tackle twist)", "Delayed twist" and
 * "Triple exchange". Total over `StuntComplexity`, so a new row does not compile unnamed.
 */
export const LINE_GAME_TAGS: Readonly<Record<StuntComplexity, DefensiveTag>> = {
  T_E: { kind: "FRONT", id: "TEX", name: "Tex" },
  T_T: { kind: "FRONT", id: "TWIST", name: "Twist" },
  DELAYED: { kind: "FRONT", id: "DELAY", name: "Delay" },
  TRIPLE: { kind: "FRONT", id: "TRIPLE", name: "Triple" },
};

/**
 * Who comes from off the line (ADR-071 §4). What each word must be on the card that declares
 * it is `validate.ts`'s to check:
 *
 *  - **Fire** — backers, and not both through the A gaps; deep help kept.
 *  - **Double A** — both backers through the A gaps; deep help kept. The owner's own word.
 *  - **Smoke** — the nickel or the dime; deep help kept.
 *  - **Zero** — nobody deep (`noDeepHelp`).
 */
export type PressureTagId = "FIRE" | "DOUBLE_A" | "SMOKE" | "ZERO";

export const PRESSURE_TAGS: Readonly<Record<PressureTagId, DefensiveTag>> = {
  FIRE: { kind: "PRESSURE", id: "FIRE", name: "Fire" },
  DOUBLE_A: { kind: "PRESSURE", id: "DOUBLE_A", name: "Double A" },
  SMOKE: { kind: "PRESSURE", id: "SMOKE", name: "Smoke" },
  ZERO: { kind: "PRESSURE", id: "ZERO", name: "Zero" },
};

/**
 * The tags a card wears, in the order the call says them: the line game, the pressure, then
 * the looks. Empty for a vanilla call.
 */
export function callTags(card: AnyDefensiveCard): readonly DefensiveTag[] {
  const lineGame = stuntComplexity(card);
  return [
    ...(lineGame === undefined ? [] : [LINE_GAME_TAGS[lineGame]]),
    ...(card.pressure === undefined ? [] : [PRESSURE_TAGS[card.pressure]]),
    ...(card.looks ?? []),
  ];
}
