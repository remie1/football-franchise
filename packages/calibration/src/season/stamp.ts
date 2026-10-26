/**
 * ADR-089 — WHAT PLAYED A SEASON, WRITTEN DOWN (§9; step 0's plan §4, deviation O11; step 1's plan
 * §3 and §16.4, K18 settled by option (a)).
 *
 * The season command's pure pieces for the engine rules, so they are tested without running the
 * script (`test/seasonStamp.test.ts`):
 *
 *  - **Which rules** (`seasonRules`): a new league plays the rules `--engine-rules` names, or
 *    `DEFAULT_ENGINE_RULES`. Carrying on (`--load`), a save's `playedWith.engineRules` (petition P1)
 *    says which rules played it: absent (or exactly `legacy`) is `legacy`, `<name>@<digest>` is that
 *    bundle at that overlay digest, and anything this build cannot play as written is refused, never
 *    converted. A `--engine-rules` that differs from the save's is refused with its own message
 *    (ADR-089:1321, "refused, not converted").
 *  - **`--save`**: the caller always, the rules only when they are not `legacy`, as
 *    `<name>@<digest>` (`saveRulesName`), so a legacy save is byte for byte the save E1 wrote.
 *  - **`--out`**: the caller and the rules always (the file recorded neither before ADR-089), the
 *    overlay digest beside the name only when the rules are not `legacy`. The news command reads only
 *    the season's seed, league, season and events, so the extra keys change nothing it does.
 *
 * Imports no narrative (ADR-082 R2) and, from `@ff/franchise`, only `makeSave`'s type (ADR-078 R1).
 */
import type { makeSave } from "@ff/franchise";
import {
  EngineRulesError,
  engineRulesNamed,
  rulesOfSave,
  rulesStampAlways,
  saveRulesName,
  type EngineRules,
} from "../pocket/rules.js";

/** What `makeSave` takes as its note of what played (E1, with P1's `engineRules`). */
export type SavePlayedWith = NonNullable<Parameters<typeof makeSave>[0]["playedWith"]>;

/**
 * The rules a season plays under. A new league: the rules `requested` names (`--engine-rules`),
 * checked, or `DEFAULT_ENGINE_RULES` when it names none. A loaded save: its own rules (absent:
 * `legacy`), refused if this build cannot play them as written; a `requested` name is checked and
 * must be the save's, or the run is refused before anything is played.
 */
export function seasonRules(
  loadedSave: { readonly playedWith?: { readonly engineRules?: string } } | undefined,
  requested?: string,
): EngineRules {
  const asked = requested === undefined ? undefined : engineRulesNamed(requested, "season --engine-rules");
  if (loadedSave === undefined) return asked ?? engineRulesNamed(undefined, "season");
  const saved = rulesOfSave(loadedSave.playedWith);
  if (asked !== undefined && asked !== saved) {
    throw new EngineRulesError(
      `This save was played with engine rules ${saved}; carrying it on under ${asked} is refused, not converted (ADR-089 §9). Drop --engine-rules, or name ${saved}`,
    );
  }
  return saved;
}

/** `--save`'s note of what played: the caller, and the rules only when they are not `legacy` (K18 (a)). */
export function savePlayedWith(caller: string, rules: EngineRules): SavePlayedWith {
  const engineRules = saveRulesName(rules);
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
