/**
 * The rulebook's two ways of saying no (ADR-093 step 0). A programmer's mistake in the input is
 * thrown (`RulebookInputError`); a legal down the rulebook does not enforce yet is returned as a
 * value (`RulebookRefusal`, built by `refusal`), so a caller can branch on it.
 */
import type { RefusalCode, RulebookRefusal } from "./types.js";

/** Thrown when a down, a play or a flag cannot be taken as given. Module-local, as `OfficialsError` is. */
export class RulebookInputError extends Error {
  constructor(message: string) {
    super(`@ff/engine: rulebook: ${message}`);
    this.name = "RulebookInputError";
  }
}

/**
 * Builds a refusal value.
 * @param code which case is refused.
 * @param rule the citation (rule-section-article) the case turns on.
 * @param step the later step that builds it, and what that step must do.
 * @returns the refusal; pure, a fresh object each call.
 */
export function refusal(code: RefusalCode, rule: string, step: string): RulebookRefusal {
  return { refused: code, rule, step };
}

/** True when `x` is a refusal (an `Administration` has no `refused` field). */
export function isRefusal(x: unknown): x is RulebookRefusal {
  return typeof x === "object" && x !== null && "refused" in x && "rule" in x && "step" in x;
}
