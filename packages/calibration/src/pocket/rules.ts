/**
 * ADR-089 step 0 — THE ENGINE RULES NAME (§9; plan §4, deviation O11).
 *
 * The pocket fix lands as a second rules bundle, `pocket-1`, beside today's `legacy` (ADR-089 §9).
 * Callers are orthogonal to rules, so every replay path has to carry, or default to, the rules a
 * game was played under: the baseline identity, the batch provenance, the export file, the season
 * save (petition P1, `SaveFile.playedWith.engineRules`) and the season `--out` file. This module is
 * the one place that knows which names this build has, what an absent name means, and when a name
 * is written down.
 *
 *  - **This build has `legacy` only.** Step 1 adds `pocket-1.s1`; a name this build does not have is
 *    refused, never converted (ADR-089 §9: "Loading a save under other rules is refused").
 *  - **Absent means `legacy`** (default D10). A save, an identity or a provenance written before P1
 *    has no name, and reads as `legacy`.
 *  - **When it is written (O11).** The export file and `season --out` always write `engineRules`, so
 *    they say what played. The identity, the batch provenance and the save write it only when it is
 *    not `legacy`, so a legacy identity and a legacy save stay byte for byte today's. The overlay
 *    digest, `engineRulesDigest`, is written only when the rules are not `legacy` (legacy has no
 *    overlay: it is `DEFAULT_TUNABLES`, which `tunablesDigest` already measures).
 *  - **Nothing reaches the engine at step 0 (K4).** `runOneGame` and `runRealSeason` take no rules
 *    name, so every game this package plays is played under `legacy`. `playedUnder` is the tripwire
 *    that keeps it honest when step 1 widens `ENGINE_RULES`.
 */

/** Today's rules: the engine as it stands, under `DEFAULT_TUNABLES`. */
export const LEGACY_RULES = "legacy";

/** Every engine rules bundle this build can play. Step 1 adds `pocket-1.s1`. */
export const ENGINE_RULES = [LEGACY_RULES] as const;

export type EngineRules = (typeof ENGINE_RULES)[number];

/** What a run plays when it names no rules: `legacy` until step 11's flip (ADR-089 §9). */
export const DEFAULT_ENGINE_RULES: EngineRules = LEGACY_RULES;

export class EngineRulesError extends Error {
  override name = "EngineRulesError";
}

export function isEngineRules(name: string): name is EngineRules {
  return (ENGINE_RULES as readonly string[]).includes(name);
}

/**
 * The rules a run names, checked: absent is `DEFAULT_ENGINE_RULES`; a name this build does not have
 * is refused, so nothing is ever stamped with a word ("default", a typo, a later step's bundle) in
 * place of the rules that played.
 */
export function engineRulesNamed(name: string | undefined, where: string): EngineRules {
  if (name === undefined) return DEFAULT_ENGINE_RULES;
  if (!isEngineRules(name)) {
    throw new EngineRulesError(
      `${where}: engine rules ${JSON.stringify(name)} are not in this build, which has ${ENGINE_RULES.join(", ")} (ADR-089 §9)`,
    );
  }
  return name;
}

/**
 * The rules a save was played with (ADR-089 P1): no `engineRules` is `legacy`; a name this build does
 * not have is refused, as `season/main.ts` refuses a caller it does not have.
 */
export function rulesOfSave(playedWith: { readonly engineRules?: string } | undefined): EngineRules {
  const name = playedWith?.engineRules;
  if (name === undefined) return LEGACY_RULES;
  if (!isEngineRules(name)) throw new EngineRulesError(`This save was played with engine rules ${name}, which this version does not have`);
  return name;
}

/**
 * The overlay digest of a rules bundle: none for `legacy`, which is no overlay. When step 1 adds a
 * bundle, the `never` below stops compiling until its overlay's digest is computed here.
 */
export function engineRulesDigestOf(rules: EngineRules): string | undefined {
  if (rules === LEGACY_RULES) return undefined;
  const unhandled: never = rules;
  throw new EngineRulesError(`no overlay digest for engine rules ${String(unhandled)}`);
}

/**
 * K4: the rules a game of this package is actually played under. At step 0 that is `legacy` for every
 * name this build has, because no engine input takes a rules name yet. The return type is the
 * tripwire: once `ENGINE_RULES` gains a name, this stops compiling until the engine's input takes it
 * (ADR-012 item 2), so no game can be stamped with rules it was not played under.
 */
export function playedUnder(rules: EngineRules): typeof LEGACY_RULES {
  return rules;
}

export interface RulesStamp {
  readonly engineRules?: string;
  readonly engineRulesDigest?: string;
}

/**
 * The stamp for the identity, the batch provenance and the save: nothing for `legacy`, so those stay
 * byte for byte today's; otherwise the name, and its overlay digest when there is one. It takes any
 * name: what to write is decided here, whether the build has the name is decided by the reader.
 */
export function rulesStampUnlessLegacy(name: string, digest?: string): RulesStamp {
  if (name === LEGACY_RULES) return {};
  return { engineRules: name, ...(digest === undefined ? {} : { engineRulesDigest: digest }) };
}

/** The stamp for the export file and `season --out`: always the name; the digest only when not `legacy`. */
export function rulesStampAlways(name: string, digest?: string): { readonly engineRules: string; readonly engineRulesDigest?: string } {
  return { engineRules: name, ...(name === LEGACY_RULES || digest === undefined ? {} : { engineRulesDigest: digest }) };
}
