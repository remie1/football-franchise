/**
 * ATTRIBUTE TERMS AS DATA.
 *
 * §1.3 says every attribute contributes `Rating ÷ 5` to a roll, and most of the
 * design doc's formulas are therefore just a LIST of attributes per side. Those
 * lists live in `TUNABLES` as `{ attr, divisor }` entries so that adding a term
 * (ADR-003's `jumping` is the precedent) is a data edit rather than a code edit,
 * and so calibration can thin a stack — which entry 6 of the backlog says is the
 * fix for §12.4 — without touching a resolver.
 *
 * Every id here goes through `resolveAttr`, so a registry kill or rename fails
 * loudly at import instead of silently reading 50 for the rest of the season.
 */
import type { AttrId, PlayerState } from "@ff/contracts";
import { resolveAttr } from "./attrs.js";
import { actorAttrModifier } from "./rolls.js";
import type { RollModifierLike } from "./rolls.js";

export interface AttrTerm {
  readonly attr: string;
  readonly divisor: number;
}

/** "runBlock" → "Run Block", for the §17 printout's modifier sources. */
export function attrTermLabel(attr: string): string {
  return attr.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/** One roll modifier per term, each prefixed with the ACTOR'S own position. */
export function termModifiers(
  actor: PlayerState,
  terms: readonly AttrTerm[],
): RollModifierLike[] {
  return terms.map((term) =>
    actorAttrModifier(actor, attrTermLabel(term.attr), resolveAttr(term.attr), term.divisor),
  );
}

/** The registry ids a term list reads — the CHECK's `testsAttrs`. */
export function termAttrs(terms: readonly AttrTerm[]): AttrId[] {
  return terms.map((term) => resolveAttr(term.attr));
}
