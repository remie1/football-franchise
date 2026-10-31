/**
 * ADR-089 — THE ENGINE RULES NAME AND ITS BUNDLES (§9; step 0's plan §4, deviation O11; step 1's
 * plan §3, §4, §7.2 item 1 and §16.4; step 2's plan §1.8).
 *
 * The pocket fix lands as a second rules bundle, `pocket-1`, beside today's `legacy` (ADR-089 §9).
 * Callers are orthogonal to rules, so every replay path has to carry, or default to, the rules a
 * game was played under: the baseline identity, the batch provenance, the export file, the season
 * save (petition P1, `SaveFile.playedWith.engineRules`) and the season `--out` file. This module is
 * the one place that knows which names this build has, what an absent name means, when a name is
 * written down, and which tunables each name plays.
 *
 *  - **This build has `legacy`, `pocket-1.s1` (step 1's bundle) and `pocket-1.s2` (step 2's)**. A
 *    name this build does not have is refused, never converted (ADR-089 §9: "Loading a save under
 *    other rules is refused"). Mid-build bundles are `pocket-1.s<step>` (§9).
 *  - **Absent means `legacy`** (default D10). A save, an identity or a provenance written before P1
 *    has no name, and reads as `legacy`. The default stays `legacy` until step 11's flip.
 *  - **A bundle is a tunables overlay plus the switch set** (ADR-089 §9). The engine reads the switch
 *    from the `Tunables` it is handed (`passRush.beatClock`, `passRush.repClock`, `passRush.approach`,
 *    and from step 2 `pocket.forcing`) and copies the stamp `engineRules: { name, overlayDigest }`
 *    onto `PLAY_START`. `withOverlay` is the only way to make a stamped bundle; `checkStamp` refuses
 *    one whose stamp does not match the dials it carries; `rulesTunables(name)` is what a name plays
 *    (`legacy`: `DEFAULT_TUNABLES` itself).
 *  - **The overlay digest (reading O28)** is `stableDigest` of the tunables the game is played with,
 *    with the `engineRules` stamp removed. Same stamp, same game, patches included. For each design
 *    bundle on `DEFAULT_TUNABLES` it is one fixed value: `POCKET_1_S1_DIGEST`, `POCKET_1_S2_DIGEST`.
 *  - **`pocket-1.s2` (step 2, §4.3, §6.2)** is `pocket-1.s1`'s blocks on `DEFAULT_TUNABLES` with two
 *    existing leaves changed inside the bundle only (`POCKET_1_S2_LEAVES`: Half, the forcing point
 *    `arrival.collapsingWithinSeconds` 1.0 -> 0.5, and Follows, the warning
 *    `arrival.pressureWithinSeconds` 2.0 -> 1.0, so P = C + (C - I) still holds) and one new block,
 *    `pocket.forcing { rule: "PER_RUSHER" }`: must act per rusher. `pocket.forcing` rides only on a
 *    stamped bundle with a block clock, never under `legacy`, and never under `pocket-1.s1`, so that
 *    name keeps promising step 1's forcing rule. `DEFAULT_TUNABLES` carries none of it.
 *  - **When it is written (O11).** The export file and `season --out` always write `engineRules`, so
 *    they say what played. The identity, the batch provenance and the save write it only when it is
 *    not `legacy`, so a legacy identity and a legacy save stay byte for byte today's. The overlay
 *    digest, `engineRulesDigest`, is written only when the rules are not `legacy` (legacy has no
 *    overlay: it is `DEFAULT_TUNABLES`, which `tunablesDigest` already measures).
 *  - **The save (K18, settled by option (a); plan §3, §16.4).** `playedWith.engineRules` is absent for
 *    `legacy` and otherwise `<name>@<digest>`, the design bundle's name and overlay digest in one
 *    string (`saveRulesName`, read back by `rulesOfSave`). The field is free text by contract and
 *    only this module writes or parses it; `engineRules.test.ts` pins its grammar. Only the design
 *    bundle can be named by a save or an export: arm bundles live in the pocket harness and the
 *    batch provenance only.
 *
 * Step 0's `playedUnder` tripwire is retired: the engine now takes the rules (in the tunables), so a
 * game of this package is played under the rules it names.
 */
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { stableDigest } from "../harness/digest.js";

/** Today's rules: the engine as it stands, under `DEFAULT_TUNABLES`. */
export const LEGACY_RULES = "legacy";

/** ADR-089 step 1's design bundle: shape S with the push window, and the approach card. */
export const POCKET_1_S1_RULES = "pocket-1.s1";

/**
 * ADR-089 step 2's design bundle: step 1's, with the forcing point at half a second (Half), the
 * warning at one second (Follows), and must act per rusher (`pocket.forcing` PER_RUSHER).
 */
export const POCKET_1_S2_RULES = "pocket-1.s2";

/** Every engine rules bundle this build can play. */
export const ENGINE_RULES = [LEGACY_RULES, POCKET_1_S1_RULES, POCKET_1_S2_RULES] as const;

export type EngineRules = (typeof ENGINE_RULES)[number];

/** A rules name that carries an overlay (every name but `legacy`). */
export type OverlayRules = Exclude<EngineRules, typeof LEGACY_RULES>;

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

// --- the overlay -----------------------------------------------------------------

/**
 * The `pocket-1` blocks of `passRush`, typed from the engine's own `Tunables` (no new engine name):
 * `beatClock` (shape S, with its optional `pushWindow`), `repClock` (shape L) and `approach` (§4.0's
 * card). A bundle carries exactly one clock and the card.
 */
export type PocketOverlay = Pick<Tunables["passRush"], "beatClock" | "repClock" | "approach">;

/**
 * The `pocket.forcing` block (ADR-089 step 2, §4.3; plan §1.8), typed from the engine's own
 * `Tunables` as `PocketOverlay` is (no new engine name): `{ rule }`. `PER_RUSHER` is must act per
 * rusher (the quarterback is forced only when a threat is within `arrival.collapsingWithinSeconds`,
 * or one has arrived, or his count or reads run out); `COUNTER_LESS_SEEN` is the narrower counter
 * rule, run as information only (`ADR:494`). Absent is step 1's forcing rule, the status's
 * `pocket.forcesDecision`.
 */
export type PocketForcing = NonNullable<Tunables["pocket"]["forcing"]>;

/** `pocket.forcing.rule`. */
export type ForcingRule = PocketForcing["rule"];

/**
 * The closed set of `pocket.forcing.rule`, restated from the engine (`sim/pocketRules.ts`, off the
 * barrel, Iron Rule 1). The check below stops compiling if the engine's set grows past this list.
 */
export const FORCING_RULES = Object.freeze(["PER_RUSHER", "COUNTER_LESS_SEEN"] as const satisfies readonly ForcingRule[]);
const _everyForcingRuleListed: readonly (typeof FORCING_RULES)[number][] = [] as readonly ForcingRule[];
void _everyForcingRuleListed;

/** Freeze a plain-data tree in place, every depth, and return the same reference. */
function deepFreeze<T>(node: T): T {
  if (typeof node !== "object" || node === null || Object.isFrozen(node)) return node;
  Object.freeze(node);
  for (const key of Object.getOwnPropertyNames(node)) deepFreeze((node as Record<string, unknown>)[key]);
  return node;
}

/** A fresh copy of a plain-data tree (numbers, strings, booleans, arrays, plain objects). */
function copyData<T>(node: T): T {
  if (Array.isArray(node)) return node.map(copyData) as T;
  if (typeof node !== "object" || node === null) return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) out[k] = copyData(v);
  return out as T;
}

/**
 * Step 1's design bundle (ADR-089 §6.1, §4.1, §4.1.1, §4.0; all values PROVISIONAL, none a candidate,
 * ADR-061): shape S at theta 11 s, k 2, rating weight 0.5 on the time scale (hazard weight
 * k x beta = 1.0), with the push window (question 16, Yes) on POWER reps of margin 1 to 14 over
 * 1.0 s; the approach card's PUSH range 1 to 14. Question 1 Today: no existing leaf changes.
 */
export const POCKET_1_S1_OVERLAY: PocketOverlay = deepFreeze({
  beatClock: {
    thetaSeconds: 11,
    shape: 2,
    ratingWeight: 0.5,
    pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 1.0 },
  },
  approach: { pushMinMargin: 1, pushMaxMargin: 14 },
});

/**
 * The overlay digest of `pocket-1.s1` on this build's `DEFAULT_TUNABLES` (O28; K18's `<digest>`).
 * Recorded as a literal so a save or an export names it without playing anything, and checked
 * against the bundle every time the bundle is built: a change to `DEFAULT_TUNABLES` or to the
 * overlay that leaves this literal behind refuses to build the bundle until it is re-recorded (K24,
 * read with S-9: a change that moves `pocket-1.s1`'s stream takes a new rules name instead).
 */
export const POCKET_1_S1_DIGEST = "fnv1a:69a7cc48";

/**
 * A patch as `applyTunablePatch` takes it, named from the patcher (as `arms.ts` names it), so `src`
 * takes no engine name beyond the ones `adr089Surface.test.ts` measured.
 */
type LeafPatch = Parameters<typeof applyTunablePatch>[1];

const S2_EVIDENCE = "ADR-089 §4.3, Half and Follows; D32";
const S2_EFFECT = "ADR-089 step 2's bundle pocket-1.s2 and its arms only, behind the switch; PROVISIONAL, never in DEFAULT_TUNABLES (ADR-061)";

/**
 * The two existing leaves `pocket-1.s2` changes (ADR-089 §4.3; plan §1.2, §1.3), inside the bundle
 * only, applied by `applyTunablePatch` on the base before `withOverlay` stamps it:
 *  - **Half** (question 2): `arrival.collapsingWithinSeconds` 1.0 -> 0.5. By D32 it is also must
 *    act's threat part, which reads the same leaf; no new dial.
 *  - **Follows** (question 3): `arrival.pressureWithinSeconds` 2.0 -> 1.0, the July rule applied,
 *    not amended: P = C + (C - I) = 0.5 + (0.5 - 0.0). Under must act per rusher it is a status only.
 * The step-2 arms' patch sets `HALF` and `FOLLOWS` are these two, split (`arms.ts`).
 */
export const POCKET_1_S2_LEAVES: readonly LeafPatch[] = deepFreeze([
  { tunableId: "arrival.collapsingWithinSeconds", currentValue: 1.0, proposedValue: 0.5, evidence: S2_EVIDENCE, expectedEffect: S2_EFFECT },
  { tunableId: "arrival.pressureWithinSeconds", currentValue: 2.0, proposedValue: 1.0, evidence: S2_EVIDENCE, expectedEffect: S2_EFFECT },
]);

/** `pocket-1.s2`'s forcing block: must act per rusher (§4.3). */
export const POCKET_1_S2_FORCING: PocketForcing = deepFreeze({ rule: "PER_RUSHER" });

/**
 * The overlay digest of `pocket-1.s2` on this build's `DEFAULT_TUNABLES` (O28), recorded once at
 * step 2's build as a literal and checked every time the bundle is built (K24). After step 2 merges
 * it is never re-recorded under `pocket-1.s2`: a change that moves the bundle's dials or its stream
 * takes a new name (`pocket-1.s3`), as `s1Pins.ts` says for `pocket-1.s1`.
 */
export const POCKET_1_S2_DIGEST = "fnv1a:03754f60";

/** O28: `stableDigest` of the tunables with the `engineRules` stamp removed. */
export function overlayDigestOf(tunables: Tunables): string {
  const { engineRules: _stamp, ...dials } = tunables;
  return stableDigest(dials);
}

/**
 * The `pocket-1` blocks a tunables tree carries, by path, in a fixed order: the `passRush` blocks
 * (step 1) and `pocket.forcing` (step 2; plan §1.8, C2-F2), so `withOverlay`, `checkStamp`'s legacy
 * case and the closed set all see the forcing block too.
 */
function blocksOf(tunables: Tunables): string[] {
  const out: string[] = [];
  const { passRush, pocket } = tunables;
  if (passRush.beatClock !== undefined) out.push("passRush.beatClock");
  if (passRush.repClock !== undefined) out.push("passRush.repClock");
  if (passRush.approach !== undefined) out.push("passRush.approach");
  if (pocket.forcing !== undefined) out.push("pocket.forcing");
  return out;
}

/**
 * The closed sets the engine accepts (step 1's plan §4): one block clock, `beatClock` (shape S) or
 * `repClock` (shape L), with the approach card. Checked here too, so a calibration bundle outside
 * them is refused before any game, with this module's error.
 */
function assertClosedSet(passRush: Tunables["passRush"], where: string): void {
  const clocks = (passRush.beatClock === undefined ? 0 : 1) + (passRush.repClock === undefined ? 0 : 1);
  if (clocks === 2) throw new EngineRulesError(`${where}: a bundle carries one block clock, not both passRush.beatClock and passRush.repClock`);
  if (clocks === 0) throw new EngineRulesError(`${where}: a pocket-1 bundle needs a block clock (passRush.beatClock or passRush.repClock)`);
  if (passRush.approach === undefined) throw new EngineRulesError(`${where}: a pocket-1 bundle needs the approach card (passRush.approach)`);
}

const finiteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * The dials of a `pocket-1` bundle, checked here as the engine checks them at the top of each pass
 * play (`sim/pocketRules.ts`, which is not on the engine's barrel, so the rules are restated, Iron
 * Rule 1), so a bundle no clock can run on is refused before any game rather than inside its first
 * pass play (review NPC-3): S's theta and shape above 0 and its rating weight finite; the push
 * window's range in order and its length a whole number of the tunables' tick steps, two or more
 * (CT-2); L's R above 0; the card's PUSH range in order. And one rule of calibration's own (CT-3):
 * a window's margin range is the card's PUSH range, since §4.0's PUSH row and §4.1.1's window both
 * name "a POWER rep of latent margin 1 to 14", and under S the PUSH reps are counted apart because
 * the window fills their tick (ADR-089:1160). The engine reads the two as separate dials.
 */
function assertDials(tunables: Tunables, where: string): void {
  const { beatClock, repClock, approach } = tunables.passRush;
  const above0 = (v: unknown, what: string): void => {
    if (!finiteNumber(v) || !(v > 0)) throw new EngineRulesError(`${where}: ${what} must be a finite number above 0, got ${String(v)}`);
  };
  const inOrder = (min: unknown, max: unknown, what: string): void => {
    if (!finiteNumber(min) || !finiteNumber(max)) throw new EngineRulesError(`${where}: ${what} must run between two finite numbers, got ${String(min)} to ${String(max)}`);
    if (min > max) throw new EngineRulesError(`${where}: ${what} runs from ${String(min)} to ${String(max)}: its minimum is above its maximum`);
  };
  if (approach !== undefined) inOrder(approach.pushMinMargin, approach.pushMaxMargin, "the approach card's PUSH range (passRush.approach)");
  if (beatClock !== undefined) {
    above0(beatClock.thetaSeconds, "passRush.beatClock.thetaSeconds");
    above0(beatClock.shape, "passRush.beatClock.shape");
    if (!finiteNumber(beatClock.ratingWeight)) throw new EngineRulesError(`${where}: passRush.beatClock.ratingWeight must be a finite number, got ${String(beatClock.ratingWeight)}`);
    const w = beatClock.pushWindow;
    if (w !== undefined) {
      inOrder(w.minMargin, w.maxMargin, "passRush.beatClock.pushWindow");
      above0(w.lengthSeconds, "passRush.beatClock.pushWindow.lengthSeconds");
      const step = tunables.clock.tickStepSeconds;
      const steps = w.lengthSeconds / step;
      if (!(Math.abs(steps - Math.round(steps)) < 1e-9 && Math.round(steps) >= 2)) {
        throw new EngineRulesError(`${where}: passRush.beatClock.pushWindow.lengthSeconds must be a whole number of tick steps (${String(step)} s), at least 2, got ${String(w.lengthSeconds)}`);
      }
      if (approach !== undefined && (w.minMargin !== approach.pushMinMargin || w.maxMargin !== approach.pushMaxMargin)) {
        throw new EngineRulesError(
          `${where}: the push window's margin range (${String(w.minMargin)} to ${String(w.maxMargin)}) is not the approach card's PUSH range (${String(approach.pushMinMargin)} to ${String(approach.pushMaxMargin)}); both name the same POWER reps (ADR-089 §4.0, §4.1.1)`,
        );
      }
    }
  }
  if (repClock !== undefined) above0(repClock.fullExpressionSeconds, "passRush.repClock.fullExpressionSeconds");
  assertForcing(tunables, where);
}

/**
 * The forcing block's dials (ADR-089 step 2, plan §1.8), checked here as the engine checks them once
 * a play (`sim/pocketRules.ts`, off the barrel, so restated, Iron Rule 1): an object `{ rule }`
 * whose rule is in the closed set; and under `PER_RUSHER` a forcing point (must act's threat part,
 * `arrival.collapsingWithinSeconds`, D32) that is a finite number, 0 or more, with
 * `arrival.immediateWithinSeconds` finite, not above it and not below 0, so an IMMEDIATE from an
 * arrival always forces and an arrived threat reads IMMEDIATE (review CT-F4). Absent passes: that is
 * step 1's forcing rule.
 */
function assertForcing(tunables: Tunables, where: string): void {
  const forcing: unknown = tunables.pocket.forcing;
  if (forcing === undefined) return;
  if (typeof forcing !== "object" || forcing === null) {
    throw new EngineRulesError(`${where}: the forcing block (pocket.forcing) must be an object { rule }, got ${String(forcing)}`);
  }
  const rule: unknown = (forcing as { readonly rule?: unknown }).rule;
  if (!(FORCING_RULES as readonly unknown[]).includes(rule)) {
    throw new EngineRulesError(`${where}: the forcing block's rule (pocket.forcing.rule) is ${String(rule)}, which is not one of ${FORCING_RULES.join(", ")}`);
  }
  if (rule === "PER_RUSHER") {
    const { collapsingWithinSeconds: c, immediateWithinSeconds: i } = tunables.arrival;
    if (!finiteNumber(c) || c < 0) {
      throw new EngineRulesError(`${where}: under pocket.forcing PER_RUSHER, arrival.collapsingWithinSeconds (must act's threat part) must be a finite number, 0 or more, got ${String(c)}`);
    }
    if (!finiteNumber(i) || i > c) {
      throw new EngineRulesError(
        `${where}: under pocket.forcing PER_RUSHER, arrival.immediateWithinSeconds (${String(i)}) may not lie above arrival.collapsingWithinSeconds (${String(c)}): an IMMEDIATE from an arrival would not force`,
      );
    }
    if (i < 0) {
      throw new EngineRulesError(`${where}: under pocket.forcing PER_RUSHER, arrival.immediateWithinSeconds must be 0 or more, as the forcing point is, got ${String(i)}: an arrived threat would not read IMMEDIATE`);
    }
  }
}

/**
 * The forcing block under the name a bundle is stamped with (plan §1.8, C3-12): `pocket-1.s1` is
 * step 1's bundle and keeps promising step 1's forcing rule, so it never carries `pocket.forcing`.
 * (The engine is name-agnostic: it accepts any `pocket-1` name.)
 */
function assertForcingUnderName(tunables: Tunables, rules: OverlayRules, where: string): void {
  if (rules === POCKET_1_S1_RULES && tunables.pocket.forcing !== undefined) {
    throw new EngineRulesError(`${where}: ${POCKET_1_S1_RULES} plays step 1's forcing rule and carries no forcing block (pocket.forcing); must act per rusher is ${POCKET_1_S2_RULES}'s (ADR-089 step 2)`);
  }
}

/**
 * The only way to make a stamped bundle (S1). Refuses a base that already carries a `pocket-1` block
 * (`pocket.forcing` included) or a stamp (so a bundle is never stamped twice, and an arm's patches go
 * on the base first, through `applyTunablePatch`), merges the blocks into `passRush` and, when the
 * fourth argument is given (ADR-089 step 2), the forcing block into `pocket` as `pocket.forcing`
 * (the key is added only then, never as `forcing: undefined`), stamps the result with `name` and its
 * overlay digest (O28), and returns it deep-frozen (N7). The blocks are copied, never frozen in the
 * caller's hands. A forcing block under `pocket-1.s1` is refused.
 */
export function withOverlay(base: Tunables, name: OverlayRules, blocks: PocketOverlay, forcing?: PocketForcing): Tunables {
  const where = `withOverlay(${name})`;
  if ((name as string) === LEGACY_RULES || !isEngineRules(name)) {
    throw new EngineRulesError(`${where}: a bundle is stamped with a pocket-1 rules name this build has (${ENGINE_RULES.filter((r) => r !== LEGACY_RULES).join(", ")}); legacy carries no stamp`);
  }
  if (base.engineRules !== undefined) {
    throw new EngineRulesError(`${where}: the base already carries the rules stamp ${base.engineRules.name}; a bundle is stamped once`);
  }
  const already = blocksOf(base);
  if (already.length > 0) {
    throw new EngineRulesError(`${where}: the base already carries ${already.join(", ")}; a bundle's blocks come from its overlay`);
  }
  const passRush = { ...base.passRush, ...copyData(blocks) };
  assertClosedSet(passRush, where);
  const unstamped: Tunables = forcing === undefined ? { ...base, passRush } : { ...base, passRush, pocket: { ...base.pocket, forcing: copyData(forcing) } };
  assertForcingUnderName(unstamped, name, where);
  assertDials(unstamped, where);
  return deepFreeze({ ...unstamped, engineRules: { name, overlayDigest: overlayDigestOf(unstamped) } });
}

/**
 * The tunables a run is about to play, checked against the rules it names (S1), before any game: at
 * every calibration entry (`runBatch`, the season command, the export, and the step-1 harness), and
 * again in `runOneGame`, the one function every calibration game is played through (review NPC-1),
 * against the rules its own stamp names.
 *  - `legacy`: no stamp and no `pocket-1` block, `pocket.forcing` included (patched leaves are fine:
 *    that is `legacy` plus patches, and its `PLAY_START` has no `rules`).
 *  - any other name: a stamp naming exactly it, a bundle in the closed sets, and an overlay digest
 *    that `overlayDigestOf` recomputes from the tunables actually passed, so a leaf patched after
 *    stamping is refused; and no forcing block under `pocket-1.s1`.
 * Returns the tunables, for chaining.
 */
export function checkStamp(tunables: Tunables, rules: EngineRules, where = "checkStamp"): Tunables {
  const stamp = tunables.engineRules;
  const blocks = blocksOf(tunables);
  if (rules === LEGACY_RULES) {
    if (stamp !== undefined) {
      throw new EngineRulesError(`${where}: the run names engine rules legacy, but the tunables carry the rules stamp ${stamp.name}`);
    }
    if (blocks.length > 0) {
      throw new EngineRulesError(`${where}: the run names engine rules legacy, but the tunables carry ${blocks.join(", ")} with no rules stamp`);
    }
    return tunables;
  }
  if (stamp === undefined) {
    throw new EngineRulesError(`${where}: the run names engine rules ${rules}, but the tunables carry no rules stamp; a bundle is made by withOverlay or rulesTunables`);
  }
  if (stamp.name !== rules) {
    throw new EngineRulesError(`${where}: the run names engine rules ${rules}, but the tunables are stamped ${stamp.name}`);
  }
  assertClosedSet(tunables.passRush, where);
  const recomputed = overlayDigestOf(tunables);
  if (stamp.overlayDigest !== recomputed) {
    throw new EngineRulesError(`${where}: the tunables are stamped ${rules} at overlay ${stamp.overlayDigest}, but they digest to ${recomputed}: a dial changed after stamping`);
  }
  assertForcingUnderName(tunables, rules, where);
  assertDials(tunables, where);
  return tunables;
}

let designBundle: Tunables | undefined;
let stepTwoBundle: Tunables | undefined;

/** `pocket-1.s1` on `DEFAULT_TUNABLES`, built once, its digest checked against the recorded literal. */
function pocket1s1(): Tunables {
  if (designBundle !== undefined) return designBundle;
  const bundle = withOverlay(DEFAULT_TUNABLES, POCKET_1_S1_RULES, POCKET_1_S1_OVERLAY);
  const digest = bundle.engineRules?.overlayDigest;
  if (digest !== POCKET_1_S1_DIGEST) {
    throw new EngineRulesError(
      `${POCKET_1_S1_RULES} digests to ${String(digest)} on this build, not the recorded ${POCKET_1_S1_DIGEST}: re-record POCKET_1_S1_DIGEST, or name the changed rules anew (K24, S-9)`,
    );
  }
  designBundle = bundle;
  return bundle;
}

/**
 * `pocket-1.s2` on `DEFAULT_TUNABLES` (plan §1.8): Half and Follows applied to the base by
 * `applyTunablePatch`, then step 1's blocks and must act per rusher through `withOverlay`; built
 * once, its digest checked against the recorded literal (K24).
 */
function pocket1s2(): Tunables {
  if (stepTwoBundle !== undefined) return stepTwoBundle;
  const bundle = withOverlay(POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES), POCKET_1_S2_RULES, POCKET_1_S1_OVERLAY, POCKET_1_S2_FORCING);
  const digest = bundle.engineRules?.overlayDigest;
  if (digest !== POCKET_1_S2_DIGEST) {
    throw new EngineRulesError(
      `${POCKET_1_S2_RULES} digests to ${String(digest)} on this build, not the recorded ${POCKET_1_S2_DIGEST}: re-record POCKET_1_S2_DIGEST before step 2 merges, or name the changed rules anew (K24)`,
    );
  }
  stepTwoBundle = bundle;
  return bundle;
}

/**
 * What a rules name plays: `legacy` is `DEFAULT_TUNABLES` itself (the same reference, so a legacy
 * run's tunables, digests and stream are today's by construction); `pocket-1.s1` and `pocket-1.s2`
 * are their design bundles, deep-frozen and stamped.
 */
export function rulesTunables(rules: EngineRules): Tunables {
  if (rules === LEGACY_RULES) return DEFAULT_TUNABLES;
  if (rules === POCKET_1_S1_RULES) return pocket1s1();
  if (rules === POCKET_1_S2_RULES) return pocket1s2();
  const unhandled: never = rules;
  throw new EngineRulesError(`no bundle for engine rules ${String(unhandled)}`);
}

/**
 * The overlay digest of a rules bundle: none for `legacy`, which is no overlay; the recorded literal
 * for `pocket-1.s1` and `pocket-1.s2`. When a later step adds a bundle, the `never` below stops
 * compiling until its overlay's digest is recorded here.
 */
export function engineRulesDigestOf(rules: EngineRules): string | undefined {
  if (rules === LEGACY_RULES) return undefined;
  if (rules === POCKET_1_S1_RULES) return POCKET_1_S1_DIGEST;
  if (rules === POCKET_1_S2_RULES) return POCKET_1_S2_DIGEST;
  const unhandled: never = rules;
  throw new EngineRulesError(`no overlay digest for engine rules ${String(unhandled)}`);
}

// --- the stamp on the stream -------------------------------------------------------

/** The rules stamp a `pocket-1` pass play's `PLAY_START` carries (`PassPlayStartPayload.rules`). */
export interface PlayStartRules {
  readonly name: string;
  readonly overlayDigest: string;
}

/**
 * The `rules` a `PLAY_START` payload carries (ADR-089 §9: present exactly when the rules are not
 * `legacy`), read structurally since contracts types the payload `unknown`; `undefined` for a
 * legacy play or any payload without a well-formed stamp (both fields strings).
 */
export function rulesOnPlayStart(payload: unknown): PlayStartRules | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const rules = (payload as { readonly rules?: unknown }).rules;
  if (typeof rules !== "object" || rules === null) return undefined;
  const { name, overlayDigest } = rules as { readonly name?: unknown; readonly overlayDigest?: unknown };
  return typeof name === "string" && typeof overlayDigest === "string" ? { name, overlayDigest } : undefined;
}

// --- the save (K18, option (a)) ------------------------------------------------------

/** `<name>@<digest>`: a rules name of `[a-z0-9.-]`, then `fnv1a:` and 8 lowercase hex digits. */
const SAVE_RULES = /^[a-z0-9.-]+@fnv1a:[0-9a-f]{8}$/;

/**
 * What `--save` writes in `playedWith.engineRules`: nothing for `legacy`, so a legacy save stays
 * byte for byte today's; otherwise `<name>@<digest>`, the bundle's name and overlay digest.
 */
export function saveRulesName(rules: EngineRules): string | undefined {
  const digest = engineRulesDigestOf(rules);
  return digest === undefined ? undefined : `${rules}@${digest}`;
}

/**
 * The rules a save was played with (ADR-089 P1, K18 (a)). An absent field or exactly `"legacy"` is
 * `legacy`, before any other rule, so every save that loaded at step 0 still loads. Otherwise the
 * string must be `<name>@<digest>` (split at the last `@`), naming a non-legacy rules bundle this
 * build has at this build's overlay digest. Every refusal has its own message (plan §16.4,
 * `contracts-edits.md` §5): a known name with no digest; a malformed string; `legacy` with a digest;
 * a name this version does not have; and a digest that is not this build's.
 */
export function rulesOfSave(playedWith: { readonly engineRules?: string } | undefined): EngineRules {
  const value = playedWith?.engineRules;
  if (value === undefined || value === LEGACY_RULES) return LEGACY_RULES;
  const at = value.lastIndexOf("@");
  if (at < 0 && isEngineRules(value)) {
    throw new EngineRulesError(
      `This save was played with engine rules ${value} and carries no overlay digest; a save of non-legacy rules is stamped <name>@<digest>`,
    );
  }
  if (!SAVE_RULES.test(value)) {
    throw new EngineRulesError(
      `This save's engine rules ${JSON.stringify(value)} are malformed; a legacy save carries none, and any other is stamped <name>@fnv1a:<8 hex digits>`,
    );
  }
  const name = value.slice(0, at);
  const digest = value.slice(at + 1);
  if (name === LEGACY_RULES) {
    throw new EngineRulesError("This save names engine rules legacy with an overlay digest; a legacy save carries none");
  }
  if (!isEngineRules(name)) {
    throw new EngineRulesError(`This save was played with engine rules ${name}, which this version does not have`);
  }
  const ours = engineRulesDigestOf(name);
  if (digest !== ours) {
    throw new EngineRulesError(`This save was played with engine rules ${name} at overlay ${digest}; this build's ${name} is ${String(ours)}`);
  }
  return name;
}

// --- what is written where (O11) ---------------------------------------------------

export interface RulesStamp {
  readonly engineRules?: string;
  readonly engineRulesDigest?: string;
}

/**
 * The stamp for the identity and the batch provenance: nothing for `legacy`, so those stay byte for
 * byte today's; otherwise the name, and its overlay digest when there is one. It takes any name:
 * what to write is decided here, whether the build has the name is decided by the reader. (The save
 * writes `saveRulesName` instead, K18.)
 */
export function rulesStampUnlessLegacy(name: string, digest?: string): RulesStamp {
  if (name === LEGACY_RULES) return {};
  return { engineRules: name, ...(digest === undefined ? {} : { engineRulesDigest: digest }) };
}

/** The stamp for the export file and `season --out`: always the name; the digest only when not `legacy`. */
export function rulesStampAlways(name: string, digest?: string): { readonly engineRules: string; readonly engineRulesDigest?: string } {
  return { engineRules: name, ...(name === LEGACY_RULES || digest === undefined ? {} : { engineRulesDigest: digest }) };
}
