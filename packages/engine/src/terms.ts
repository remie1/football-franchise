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
 * Every id here goes through `resolveAttr`, and `src/attrs.ts`'s load-time sweep
 * resolves all of them BEFORE a play can run, so a registry kill or rename fails
 * at import instead of silently reading 50 for the rest of the season.
 *
 * `{ attr, divisor }` is one of the two spellings that sweep recognises (the
 * other is a `…Attr` key). A term list spelled any other way escapes it.
 */
import type { AttrId, PlayerState } from "@ff/contracts";
import { attrName, resolveAttr } from "./attrs.js";
import { actorAttrModifier } from "./rolls.js";
import type { RollModifierLike } from "./rolls.js";

export interface AttrTerm {
  readonly attr: string;
  readonly divisor: number;
}

/**
 * One roll modifier per term, each prefixed with the ACTOR'S own position.
 *
 * The attribute half of the label is the REGISTRY'S display name, looked up, and
 * never a transformation of the id. `docs/design/contracts.md` §1: *"IDs are
 * opaque. No domain may parse meaning out of an ID string."* The regex this
 * replaced spelled `yac` as "Yac" where the registry says "YAC", `pullSkill` as
 * "Pull Skill" where the registry says "Pulling", and `footballIQ` as
 * "Football I Q" — and those strings were reaching `RollDetail.modifiers[].source`
 * in the live stream.
 */
export function termModifiers(
  actor: PlayerState,
  terms: readonly AttrTerm[],
): RollModifierLike[] {
  return terms.map((term) => {
    const id = resolveAttr(term.attr);
    return actorAttrModifier(actor, attrName(id), id, term.divisor);
  });
}

/** The registry ids a term list reads — the CHECK's `testsAttrs`. */
export function termAttrs(terms: readonly AttrTerm[]): AttrId[] {
  return terms.map((term) => resolveAttr(term.attr));
}
