/**
 * ADR-089 step 0 — WHAT PLAYED A SEASON, WRITTEN DOWN (§9; plan §4, deviation O11).
 *
 * The season command's pure pieces for the engine rules, so they are tested without running the
 * script (`test/seasonStamp.test.ts`):
 *
 *  - **Carrying on** (`--load`): a save's `playedWith.engineRules` (petition P1) says which rules
 *    played it; absent is `legacy`, and a name this build does not have is refused, never converted.
 *    A new league plays `DEFAULT_ENGINE_RULES`.
 *  - **`--save`**: the caller always, the rules only when they are not `legacy`, so a step-0 save is
 *    byte for byte the save E1 wrote.
 *  - **`--out`**: the caller and the rules always (the file recorded neither before ADR-089), the
 *    overlay digest only when the rules are not `legacy`. The news command reads only the season's
 *    seed, league, season and events, so the extra keys change nothing it does.
 *
 * Imports no narrative (ADR-082 R2) and, from `@ff/franchise`, only `makeSave`'s type (ADR-078 R1).
 */
import type { makeSave } from "@ff/franchise";
import { DEFAULT_ENGINE_RULES, rulesOfSave, rulesStampAlways, rulesStampUnlessLegacy, type EngineRules } from "../pocket/rules.js";

/** What `makeSave` takes as its note of what played (E1, with P1's `engineRules`). */
export type SavePlayedWith = NonNullable<Parameters<typeof makeSave>[0]["playedWith"]>;

/**
 * The rules a season plays under: a new league's are `DEFAULT_ENGINE_RULES`; a loaded save's are its
 * own (absent: `legacy`), refused if this build does not have them.
 */
export function seasonRules(loadedSave: { readonly playedWith?: { readonly engineRules?: string } } | undefined): EngineRules {
  return loadedSave === undefined ? DEFAULT_ENGINE_RULES : rulesOfSave(loadedSave.playedWith);
}

/** `--save`'s note of what played: the caller, and the rules only when they are not `legacy`. */
export function savePlayedWith(caller: string, rules: string): SavePlayedWith {
  const { engineRules } = rulesStampUnlessLegacy(rules);
  return { caller, ...(engineRules === undefined ? {} : { engineRules }) };
}

export interface SeasonOutStamp {
  readonly callerVersion: string;
  readonly engineRules: string;
  readonly engineRulesDigest?: string;
}

/** `--out`'s stamp: the caller and the rules always, the overlay digest only when not `legacy`. */
export function seasonOutStamp(caller: string, rules: string, digest?: string): SeasonOutStamp {
  return { callerVersion: caller, ...rulesStampAlways(rules, digest) };
}
