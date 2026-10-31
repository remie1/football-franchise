/**
 * ADR-089 — THE ENGINE RULES NAME AND ITS BUNDLES (§9; step 0's plan §4, deviation O11; step 1's
 * plan §3, §4, §7.2 item 1 and §16.4; step 2's plan §1.8; step 3's plan §2.1).
 *
 * The pocket fix lands as a second rules bundle, `pocket-1`, beside today's `legacy` (ADR-089 §9).
 * Callers are orthogonal to rules, so every replay path has to carry, or default to, the rules a
 * game was played under: the baseline identity, the batch provenance, the export file, the season
 * save (petition P1, `SaveFile.playedWith.engineRules`) and the season `--out` file. This module is
 * the one place that knows which names this build has, what an absent name means, when a name is
 * written down, and which tunables each name plays.
 *
 *  - **This build has `legacy`, `pocket-1.s1` (step 1's bundle), `pocket-1.s2` (step 2's) and
 *    `pocket-1.s3` (step 3's)**. A name this build does not have is refused, never converted (ADR-089
 *    §9: "Loading a save under other rules is refused"). Mid-build bundles are `pocket-1.s<step>` (§9).
 *  - **Absent means `legacy`** (default D10). A save, an identity or a provenance written before P1
 *    has no name, and reads as `legacy`. The default stays `legacy` until step 11's flip.
 *  - **A bundle is a tunables overlay plus the switch set** (ADR-089 §9). The engine reads the switch
 *    from the `Tunables` it is handed (`passRush.beatClock`, `passRush.repClock`, `passRush.approach`,
 *    from step 2 `pocket.forcing`, and from step 3 `blitzPickup.freeRun`, `blitzPickup.lateBlock` and
 *    `pocket.climbLane`) and copies the stamp `engineRules: { name, overlayDigest }`
 *    onto `PLAY_START`. `withOverlay` is the only way to make a stamped bundle; `checkStamp` refuses
 *    one whose stamp does not match the dials it carries; `rulesTunables(name)` is what a name plays
 *    (`legacy`: `DEFAULT_TUNABLES` itself).
 *  - **The overlay digest (reading O28)** is `stableDigest` of the tunables the game is played with,
 *    with the `engineRules` stamp removed. Same stamp, same game, patches included. For each design
 *    bundle on `DEFAULT_TUNABLES` it is one fixed value: `POCKET_1_S1_DIGEST`, `POCKET_1_S2_DIGEST`,
 *    `POCKET_1_S3_DIGEST`.
 *  - **`pocket-1.s2` (step 2, §4.3, §6.2)** is `pocket-1.s1`'s blocks on `DEFAULT_TUNABLES` with two
 *    existing leaves changed inside the bundle only (`POCKET_1_S2_LEAVES`: Half, the forcing point
 *    `arrival.collapsingWithinSeconds` 1.0 -> 0.5, and Follows, the warning
 *    `arrival.pressureWithinSeconds` 2.0 -> 1.0, so P = C + (C - I) still holds) and one new block,
 *    `pocket.forcing { rule: "PER_RUSHER" }`: must act per rusher. `pocket.forcing` rides only on a
 *    stamped bundle with a block clock, never under `legacy`, and never under `pocket-1.s1`, so that
 *    name keeps promising step 1's forcing rule. `DEFAULT_TUNABLES` carries none of it.
 *  - **`pocket-1.s3` (step 3, §4.4 to §4.6, §6.3; AM-2)** is built as `pocket-1.s2` is (Half and
 *    Follows on the base, then step 1's blocks and must act per rusher through `withOverlay`), with
 *    three new blocks in its overlay: `blitzPickup.freeRun` (the free-run clock, D18 and D22, with the
 *    step-0 filing's constants, AM-2's `movingGetOffSeconds` 0, reading B over all three origins, and
 *    the picture dial `AS_RULED`), `blitzPickup.lateBlock` (AM-2's `t_e` 1.0 s and `w` 0.1) and
 *    `pocket.climbLane` `FRONT`. The three ride only on a stamped bundle with a block clock, and only
 *    under `pocket-1.s3`: `pocket-1.s1` and `pocket-1.s2` keep promising their own steps' rules.
 *    Under `pocket-1.s3` any subset of them is a bundle (an information arm may carry one alone).
 *    The picture dial is `AS_RULED`, the design picture since the owner granted ADR-090's petition
 *    S3 (2026-10-31); the line-up caller reads it, never physics, and it sits in the tree so the
 *    stamp moves with the picture.
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
import { ATTR_SCALE } from "@ff/contracts";
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

/**
 * ADR-089 step 3's design bundle: step 2's, with the free-run clock for men nobody touched (reading
 * B), the late, weak block for touched men, and the climb lane closed by any FRONT threat.
 */
export const POCKET_1_S3_RULES = "pocket-1.s3";

/** Every engine rules bundle this build can play. */
export const ENGINE_RULES = [LEGACY_RULES, POCKET_1_S1_RULES, POCKET_1_S2_RULES, POCKET_1_S3_RULES] as const;

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
 * ADR-089 step 3's blocks (plan §2.1), typed from the engine's own `Tunables` as the others are (no
 * new engine name), each under the tree it lands in: `blitzPickup.freeRun` (the free-run clock),
 * `blitzPickup.lateBlock` (the late, weak block) and `pocket.climbLane` (`FRONT`).
 */
export interface PocketStep3Overlay {
  readonly blitzPickup?: Pick<Tunables["blitzPickup"], "freeRun" | "lateBlock">;
  readonly pocket?: Pick<Tunables["pocket"], "climbLane">;
}

/**
 * The `pocket-1` blocks an overlay carries, typed from the engine's own `Tunables` (no new engine
 * name): of `passRush`, `beatClock` (shape S, with its optional `pushWindow`), `repClock` (shape L)
 * and `approach` (§4.0's card), which a bundle carries as exactly one clock and the card; and from
 * step 3, `blitzPickup.freeRun`, `blitzPickup.lateBlock` and `pocket.climbLane` (`PocketStep3Overlay`).
 * Step 2's forcing block is `withOverlay`'s fourth argument, as it was.
 */
export type PocketOverlay = Pick<Tunables["passRush"], "beatClock" | "repClock" | "approach"> & PocketStep3Overlay;

/** The keys an overlay may carry, in `withOverlay`'s order (the check below keeps it whole). */
const OVERLAY_KEYS = Object.freeze(["beatClock", "repClock", "approach", "blitzPickup", "pocket"] as const satisfies readonly (keyof PocketOverlay)[]);
const _everyOverlayKeyListed: readonly (typeof OVERLAY_KEYS)[number][] = [] as readonly (keyof PocketOverlay)[];
void _everyOverlayKeyListed;
/** The step-3 keys under the overlay's `blitzPickup` and `pocket`. */
const OVERLAY_PICKUP_KEYS = Object.freeze(["freeRun", "lateBlock"] as const satisfies readonly (keyof NonNullable<PocketStep3Overlay["blitzPickup"]>)[]);
const _everyPickupKeyListed: readonly (typeof OVERLAY_PICKUP_KEYS)[number][] = [] as readonly (keyof NonNullable<PocketStep3Overlay["blitzPickup"]>)[];
void _everyPickupKeyListed;
const OVERLAY_POCKET_KEYS = Object.freeze(["climbLane"] as const satisfies readonly (keyof NonNullable<PocketStep3Overlay["pocket"]>)[]);
const _everyPocketKeyListed: readonly (typeof OVERLAY_POCKET_KEYS)[number][] = [] as readonly (keyof NonNullable<PocketStep3Overlay["pocket"]>)[];
void _everyPocketKeyListed;

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

/** `blitzPickup.freeRun` (ADR-089 step 3), typed from the engine's own `Tunables`. */
export type PocketFreeRun = NonNullable<Tunables["blitzPickup"]["freeRun"]>;
/** `blitzPickup.lateBlock` (ADR-089 step 3): `{ engageSeconds, weakMultiplier }`, `t_e` and `w`. */
export type PocketLateBlock = NonNullable<Tunables["blitzPickup"]["lateBlock"]>;
/** `pocket.climbLane` (ADR-089 step 3): `FRONT`. */
export type PocketClimbLane = NonNullable<Tunables["pocket"]["climbLane"]>;
/** Who the free-run clock times: B (the design, D19), C (every free runner) or A (UNBLOCKED alone). */
export type FreeRunReading = PocketFreeRun["reading"];
/** D19's three kinds of men nobody touched, which a by-origin arm (reading B) narrows the clock to. */
export type FreeRunOrigin = NonNullable<PocketFreeRun["origins"]>[number];
/** The picture the defense's line-up caller draws (AM-2's Mug rule). */
export type FreeRunPicture = PocketFreeRun["picture"];

/**
 * ADR-089 step 3's closed sets, restated from the engine (`sim/pocketRules.ts`, off the barrel, Iron
 * Rule 1). Each check below stops compiling if the engine's set grows past its list.
 */
export const FREE_RUN_READINGS = Object.freeze(["B", "C", "A"] as const satisfies readonly FreeRunReading[]);
const _everyReadingListed: readonly (typeof FREE_RUN_READINGS)[number][] = [] as readonly FreeRunReading[];
void _everyReadingListed;
export const FREE_RUN_ORIGINS = Object.freeze(["UNBLOCKED", "BLOWN_UP", "LOOPER_FREE"] as const satisfies readonly FreeRunOrigin[]);
const _everyOriginListed: readonly (typeof FREE_RUN_ORIGINS)[number][] = [] as readonly FreeRunOrigin[];
void _everyOriginListed;
export const FREE_RUN_PICTURES = Object.freeze(["AS_RULED", "MUG_HEAD_ONLY"] as const satisfies readonly FreeRunPicture[]);
const _everyPictureListed: readonly (typeof FREE_RUN_PICTURES)[number][] = [] as readonly FreeRunPicture[];
void _everyPictureListed;
export const CLIMB_LANES = Object.freeze(["FRONT"] as const satisfies readonly PocketClimbLane[]);
const _everyClimbLaneListed: readonly (typeof CLIMB_LANES)[number][] = [] as readonly PocketClimbLane[];
void _everyClimbLaneListed;

/** AM-2's held groups, in its order (`blitzPickup.freeRun.hold.spot`). */
const HELD_GROUPS = ["downLineman", "linebacker", "defensiveBack"] as const satisfies readonly (keyof NonNullable<NonNullable<PocketFreeRun["hold"]>["spot"]>)[];
const _everyHeldGroupListed: readonly (typeof HELD_GROUPS)[number][] = [] as readonly (keyof NonNullable<NonNullable<PocketFreeRun["hold"]>["spot"]>)[];
void _everyHeldGroupListed;

/** The rating scale a held rating must lie on (`ATTR_SCALE`, contracts' registry). */
const RATING_MIN = ATTR_SCALE.min;
const RATING_MAX = ATTR_SCALE.max;

/**
 * Petition P17 (ADR-089 step-3 plan §3.4): the doc text for the late block's rolled tick on shape L.
 * The owner's typed yes (2026-10-31 14:38:53Z) landed it in contracts (c340520), and E4b flipped this
 * constant and the engine's (`P17_IN_CONTRACTS`, `sim/pocketRules.ts`) in one commit, so a late block
 * on shape L builds here and plays there (C14). Had it stayed out, both would refuse it, this module
 * before any game. `engineRules.test.ts` reads the engine's from its source and fails while the two
 * differ (review CT-F6). Exported so that `arms.ts` can say whether the arm that waits on it (C14) is
 * built (`armRefusal`).
 */
export const P17_IN_CONTRACTS = true;

/**
 * ADR-090's petition S3 (step-3 plan §3.2; AM-2's `design`): the Mug's ruled spot may be read by
 * physics. AM-2 makes the design picture the ruled one (`AS_RULED`, which `POCKET_1_S3_FREE_RUN`
 * carries) only if the owner grants S3 before step 3's arms run; otherwise it is the picture with
 * beat 3 skipped for the Mug alone (`MUG_HEAD_ONLY`). The owner granted S3 on 2026-10-31 (typed yes,
 * 14:38:53Z), and its contracts commit (`playcalls.ts`, the `LOOK` tag and `shownRush`) flipped this
 * constant to true, so `AS_RULED` is the design picture and `POCKET_1_S3_DIGEST` did not move. C10's
 * and C16's pictures (no free-run block, so the ruled one, `caller/frozen.ts`) are the same picture
 * (review FID-F-4). The step-3 harness's refusal of a graded run and R-1's digests on any
 * pocket-1.s3 arm while S3 was not in contracts (`s3PictureRefusal`, review FID-F-1) is now reached
 * only when a test passes `s3Granted: false`.
 */
export const S3_IN_CONTRACTS = true;

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

/**
 * `pocket-1.s3`'s free-run block (ADR-089 §4.4.4, §4.4.5, D18 and D22; plan §2.1): the step-0
 * filing's fifteen `constants.freeRun.*` (`reports/adr-089-step0.filed.json`, filed and never
 * fitted; `engineRules.test.ts` pins each against the filing and `freeRun.ts`'s `FREE_RUN_CONSTANTS`),
 * AM-2's `movingGetOffSeconds` (filed 0, D18's "0 for a man already moving"), reading B (the design,
 * D19: men nobody touched, and AM-2's untouched exchange) over all three origins (no `origins`), no
 * held input, and the picture `AS_RULED`, the design picture under AM-2's Mug rule since the owner
 * granted ADR-090's petition S3 before any step-3 arm ran (2026-10-31; `S3_IN_CONTRACTS`). An s3
 * save or export made before the s3 pins (R-2) is not of record: the overlay digest names these
 * tunables, not the engine code that reads them (review NPC-N3).
 */
export const POCKET_1_S3_FREE_RUN: PocketFreeRun = deepFreeze({
  fortyYards: 40,
  fortyIntercept: 5.6,
  fortySpeedSlope: 1.38,
  fortySpeedScale: 99,
  tauIntercept: 0.77,
  tauSlope: 0.007,
  tauMin: 0.63,
  tauMax: 0.91,
  pathShortenYards: 1.0,
  edgePathFactor: 1.1,
  loopExtraYards: 0.5,
  getOffSeconds: 0.35,
  movingGetOffSeconds: 0,
  delayedSeconds: 0.5,
  etaRoundingSeconds: 0.1,
  creeperYardsPerSecond: 3,
  reading: "B",
  picture: "AS_RULED",
});

/** `pocket-1.s3`'s late block (AM-2, CHOSEN, shown): `t_e` 1.0 s and `w` 0.1. */
export const POCKET_1_S3_LATE_BLOCK: PocketLateBlock = deepFreeze({ engageSeconds: 1.0, weakMultiplier: 0.1 });

/** `pocket-1.s3`'s climb lane (§6.3): closed by any FRONT threat. */
export const POCKET_1_S3_CLIMB_LANE: PocketClimbLane = "FRONT";

/**
 * `pocket-1.s3`'s overlay (plan §2.1): step 1's blocks (`POCKET_1_S1_OVERLAY`) and step 3's three.
 * The forcing block, must act per rusher, is `POCKET_1_S2_FORCING`, given apart as at step 2.
 */
export const POCKET_1_S3_OVERLAY: PocketOverlay = deepFreeze({
  ...POCKET_1_S1_OVERLAY,
  blitzPickup: { freeRun: POCKET_1_S3_FREE_RUN, lateBlock: POCKET_1_S3_LATE_BLOCK },
  pocket: { climbLane: POCKET_1_S3_CLIMB_LANE },
});

/**
 * The overlay digest of `pocket-1.s3` on this build's `DEFAULT_TUNABLES` (O28), recorded at step 3's
 * build as the literal `overlayDigestOf` gives and checked every time the bundle is built (K24).
 * After step 3 merges it is never re-recorded under `pocket-1.s3`: a change that moves the bundle's
 * dials or its stream takes a new name.
 */
export const POCKET_1_S3_DIGEST = "fnv1a:c4462712";

/** O28: `stableDigest` of the tunables with the `engineRules` stamp removed. */
export function overlayDigestOf(tunables: Tunables): string {
  const { engineRules: _stamp, ...dials } = tunables;
  return stableDigest(dials);
}

/**
 * Every `pocket-1` block, by path, in a fixed order: the `passRush` blocks (step 1), `pocket.forcing`
 * (step 2) and step 3's three.
 */
export const POCKET_BLOCKS = Object.freeze([
  "passRush.beatClock",
  "passRush.repClock",
  "passRush.approach",
  "pocket.forcing",
  "blitzPickup.freeRun",
  "blitzPickup.lateBlock",
  "pocket.climbLane",
] as const);
export type PocketBlock = (typeof POCKET_BLOCKS)[number];

/** Step 3's blocks (plan §2.1), in `POCKET_BLOCKS`' order. */
export const STEP3_BLOCKS = Object.freeze(["blitzPickup.freeRun", "blitzPickup.lateBlock", "pocket.climbLane"] as const satisfies readonly PocketBlock[]);
export type Step3Block = (typeof STEP3_BLOCKS)[number];

/** A block's value in a tunables tree (undefined when absent). */
function blockValue(tunables: Tunables, block: PocketBlock): unknown {
  switch (block) {
    case "passRush.beatClock":
      return tunables.passRush.beatClock;
    case "passRush.repClock":
      return tunables.passRush.repClock;
    case "passRush.approach":
      return tunables.passRush.approach;
    case "pocket.forcing":
      return tunables.pocket.forcing;
    case "blitzPickup.freeRun":
      return tunables.blitzPickup.freeRun;
    case "blitzPickup.lateBlock":
      return tunables.blitzPickup.lateBlock;
    case "pocket.climbLane":
      return tunables.pocket.climbLane;
    default: {
      const unhandled: never = block;
      throw new EngineRulesError(`no pocket-1 block ${String(unhandled)}`);
    }
  }
}

/**
 * The `pocket-1` blocks a tunables tree carries, by path, in `POCKET_BLOCKS`' order: the `passRush`
 * blocks (step 1), `pocket.forcing` (step 2; plan §1.8, C2-F2) and step 3's three (plan §2.1), so
 * `withOverlay`, `checkStamp`'s legacy case and the closed sets see every block.
 */
function blocksOf(tunables: Tunables): string[] {
  return POCKET_BLOCKS.filter((block) => blockValue(tunables, block) !== undefined);
}

/**
 * The closed sets the engine accepts (step 1's plan §4): one block clock, `beatClock` (shape S) or
 * `repClock` (shape L), with the approach card; and from step 3 (plan §2.1), for each step-3 block it
 * carries, the clock shape it runs on: the late block on either shape now that petition P17's doc
 * text is in contracts (on shape S only while it is not), as the free-run block and the climb lane
 * run on either shape. Checked here too,
 * so a calibration bundle outside them is refused before any game, with this module's error. (Which
 * reading runs a late block is a dial's matter, checked with the dials, after the overlay digest.)
 */
function assertClosedSet(tunables: Tunables, where: string): void {
  const { passRush } = tunables;
  const clocks = (passRush.beatClock === undefined ? 0 : 1) + (passRush.repClock === undefined ? 0 : 1);
  if (clocks === 2) throw new EngineRulesError(`${where}: a bundle carries one block clock, not both passRush.beatClock and passRush.repClock`);
  if (clocks === 0) throw new EngineRulesError(`${where}: a pocket-1 bundle needs a block clock (passRush.beatClock or passRush.repClock)`);
  if (passRush.approach === undefined) throw new EngineRulesError(`${where}: a pocket-1 bundle needs the approach card (passRush.approach)`);
  for (const block of STEP3_BLOCKS) {
    if (blockValue(tunables, block) === undefined) continue;
    switch (block) {
      case "blitzPickup.freeRun":
        break;
      case "blitzPickup.lateBlock":
        if (passRush.repClock !== undefined && !P17_IN_CONTRACTS) {
          throw new EngineRulesError(
            `${where}: the late block (blitzPickup.lateBlock) on shape L (passRush.repClock) is refused until petition P17's doc text (the late block's rolled tick) is in contracts; shape S runs it`,
          );
        }
        break;
      case "pocket.climbLane":
        break;
      default: {
        const unhandled: never = block;
        throw new EngineRulesError(`${where}: no step-3 block ${String(unhandled)}`);
      }
    }
  }
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
 * the window fills their tick (ADR-089:1160). The engine reads the two as separate dials. Then the
 * forcing block's dials (step 2) and step 3's blocks' (`assertStep3Dials`).
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
  assertStep3Dials(tunables, where);
}

const isObject = (v: unknown): v is Readonly<Record<string, unknown>> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Step 3's dials (plan §2.1), checked here as the engine checks them once a play (`sim/pocketRules.ts`,
 * off the barrel, so restated, Iron Rule 1), each block in `STEP3_BLOCKS`' order with the engine's own
 * words. The free-run block: D18's and D22's constants numbers the clock can run on (the 40's distance,
 * the rating scale, the start's clamp, the bend and the creeper's speed above 0; the reach, the loop's
 * extra leg, both get-offs and the DELAYED wait 0 or more, so the clean bench can push them to 50; the
 * rounding exactly the tenth); the reading, origins (reading B only, each once), AM-2's held references
 * and the picture from their closed sets. The late block: `t_e` 0 or more and `w` above 0. The climb
 * lane: `FRONT`. Then, as the engine does after the blocks' own dials, the readings and the late
 * block: reading C (every free runner on the clock, touched men 0.5 s later) runs no late block, and
 * reading A (every lost block a late block) needs one.
 */
function assertStep3Dials(tunables: Tunables, where: string): void {
  const fail = (message: string): never => {
    throw new EngineRulesError(`${where}: ${message}`);
  };
  const above0 = (v: unknown, what: string): void => {
    if (!finiteNumber(v) || !(v > 0)) fail(`${what} must be a finite number above 0, got ${String(v)}`);
  };
  const finite = (v: unknown, what: string): void => {
    if (!finiteNumber(v)) fail(`${what} must be a finite number, got ${String(v)}`);
  };
  const atLeast0 = (v: unknown, what: string): void => {
    if (!finiteNumber(v) || v < 0) fail(`${what} must be a finite number, 0 or more, got ${String(v)}`);
  };
  const oneOf = (v: unknown, set: readonly string[], what: string): void => {
    if (!set.includes(v as string)) fail(`${what} is ${String(v)}, which is not one of ${set.join(", ")}`);
  };
  for (const block of STEP3_BLOCKS) {
    const value = blockValue(tunables, block);
    if (value === undefined) continue;
    switch (block) {
      case "blitzPickup.freeRun": {
        if (!isObject(value)) fail(`the free-run block (blitzPickup.freeRun) must be an object, got ${String(value)}`);
        const f = value as Readonly<Record<string, unknown>>;
        const leaf = (name: string): string => `blitzPickup.freeRun.${name}`;
        above0(f["fortyYards"], leaf("fortyYards"));
        finite(f["fortyIntercept"], leaf("fortyIntercept"));
        finite(f["fortySpeedSlope"], leaf("fortySpeedSlope"));
        above0(f["fortySpeedScale"], leaf("fortySpeedScale"));
        finite(f["tauIntercept"], leaf("tauIntercept"));
        finite(f["tauSlope"], leaf("tauSlope"));
        above0(f["tauMin"], leaf("tauMin"));
        above0(f["tauMax"], leaf("tauMax"));
        if ((f["tauMin"] as number) > (f["tauMax"] as number)) {
          fail(`the free-run start's clamp (blitzPickup.freeRun.tauMin to tauMax) runs from ${String(f["tauMin"])} to ${String(f["tauMax"])}: its minimum is above its maximum`);
        }
        atLeast0(f["pathShortenYards"], leaf("pathShortenYards"));
        above0(f["edgePathFactor"], leaf("edgePathFactor"));
        atLeast0(f["loopExtraYards"], leaf("loopExtraYards"));
        atLeast0(f["getOffSeconds"], leaf("getOffSeconds"));
        atLeast0(f["movingGetOffSeconds"], leaf("movingGetOffSeconds"));
        atLeast0(f["delayedSeconds"], leaf("delayedSeconds"));
        if (f["etaRoundingSeconds"] !== 0.1) {
          fail(`${leaf("etaRoundingSeconds")} must be 0.1 (the clock rounds to the tenth, as every published etaTick is), got ${String(f["etaRoundingSeconds"])}`);
        }
        above0(f["creeperYardsPerSecond"], leaf("creeperYardsPerSecond"));
        oneOf(f["reading"], FREE_RUN_READINGS, `the free-run block's reading (${leaf("reading")})`);
        const origins = f["origins"];
        if (origins !== undefined) {
          if (f["reading"] !== "B") {
            fail(`the free-run block's origins (${leaf("origins")}) narrow reading B's men nobody touched; reading ${String(f["reading"])} names its own men`);
          }
          if (!Array.isArray(origins) || origins.length === 0) {
            fail(`the free-run block's origins (${leaf("origins")}) must be a list of one or more of ${FREE_RUN_ORIGINS.join(", ")}, got ${JSON.stringify(origins)}`);
          }
          const seen = new Set<unknown>();
          for (const origin of origins as readonly unknown[]) {
            oneOf(origin, FREE_RUN_ORIGINS, `an origin of the free-run block (${leaf("origins")})`);
            if (seen.has(origin)) fail(`the free-run block's origins (${leaf("origins")}) name ${String(origin)} twice`);
            seen.add(origin);
          }
        }
        const hold = f["hold"];
        if (hold !== undefined) {
          if (!isObject(hold)) fail(`the free-run block's hold (${leaf("hold")}) must be an object { spot?, ratings?, drop? }, got ${String(hold)}`);
          const h = hold as Readonly<Record<string, unknown>>;
          if (h["spot"] === undefined && h["ratings"] === undefined && h["drop"] === undefined) {
            fail(`the free-run block's hold (${leaf("hold")}) holds nothing: give it a spot, ratings or a drop, or leave it out`);
          }
          const spot = h["spot"];
          if (spot !== undefined) {
            if (!isObject(spot)) fail(`${leaf("hold.spot")} must be an object of ${HELD_GROUPS.join(", ")}, got ${String(spot)}`);
            for (const group of HELD_GROUPS) {
              const at = (spot as Readonly<Record<string, unknown>>)[group];
              if (!isObject(at)) fail(`${leaf(`hold.spot.${group}`)} must be an object { depth, width }, got ${String(at)}`);
              atLeast0((at as Readonly<Record<string, unknown>>)["depth"], leaf(`hold.spot.${group}.depth`));
              atLeast0((at as Readonly<Record<string, unknown>>)["width"], leaf(`hold.spot.${group}.width`));
            }
          }
          const ratings = h["ratings"];
          if (ratings !== undefined) {
            if (!isObject(ratings)) fail(`${leaf("hold.ratings")} must be an object { speed, acceleration }, got ${String(ratings)}`);
            for (const name of ["speed", "acceleration"] as const) {
              const v = (ratings as Readonly<Record<string, unknown>>)[name];
              if (!finiteNumber(v) || v < RATING_MIN || v > RATING_MAX) fail(`${leaf(`hold.ratings.${name}`)} must be a rating from ${String(RATING_MIN)} to ${String(RATING_MAX)}, got ${String(v)}`);
            }
          }
          if (h["drop"] !== undefined) above0(h["drop"], leaf("hold.drop"));
        }
        oneOf(f["picture"], FREE_RUN_PICTURES, `the free-run block's picture (${leaf("picture")})`);
        break;
      }
      case "blitzPickup.lateBlock": {
        if (!isObject(value)) fail(`the late block (blitzPickup.lateBlock) must be an object { engageSeconds, weakMultiplier }, got ${String(value)}`);
        atLeast0((value as Readonly<Record<string, unknown>>)["engageSeconds"], "blitzPickup.lateBlock.engageSeconds");
        above0((value as Readonly<Record<string, unknown>>)["weakMultiplier"], "blitzPickup.lateBlock.weakMultiplier");
        break;
      }
      case "pocket.climbLane":
        oneOf(value, CLIMB_LANES, "the climb lane rule (pocket.climbLane)");
        break;
      default: {
        const unhandled: never = block;
        fail(`no step-3 block ${String(unhandled)}`);
      }
    }
  }
  const reading: unknown = (tunables.blitzPickup.freeRun as { readonly reading?: unknown } | undefined)?.reading;
  const lateBlock = tunables.blitzPickup.lateBlock !== undefined;
  if (reading === "C" && lateBlock) {
    fail("reading C (blitzPickup.freeRun.reading) puts every free runner on the free-run clock, touched men 0.5 s later, so it runs no late block (blitzPickup.lateBlock)");
  }
  if (reading === "A" && !lateBlock) {
    fail("reading A (blitzPickup.freeRun.reading) makes every lost block a late block, so it needs the late block (blitzPickup.lateBlock)");
  }
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
 * The blocks a name may carry (plan §1.8, C3-12; step 3's plan §2.1, critique 3 N5). Each name keeps
 * promising its own step's rules: `pocket-1.s1` never carries `pocket.forcing` (must act per rusher
 * is step 2's) nor a step-3 block; `pocket-1.s2` never carries a step-3 block (the free-run clock,
 * the late block and the climb lane rule are step 3's); under `pocket-1.s3` any subset of the step-3
 * blocks is a bundle (an information arm carries one alone, as B7 carried no forcing block under
 * `pocket-1.s2`). (The engine is name-agnostic: it accepts any `pocket-1` name.)
 */
function assertBlocksUnderName(tunables: Tunables, rules: OverlayRules, where: string): void {
  const step3 = STEP3_BLOCKS.filter((block) => blockValue(tunables, block) !== undefined);
  const noStep3 = (): void => {
    if (step3.length > 0) {
      throw new EngineRulesError(
        `${where}: ${rules} carries no step-3 block (${step3.join(", ")}); the free-run clock, the late block and the climb lane rule are ${POCKET_1_S3_RULES}'s (ADR-089 step 3)`,
      );
    }
  };
  switch (rules) {
    case POCKET_1_S1_RULES:
      if (tunables.pocket.forcing !== undefined) {
        throw new EngineRulesError(`${where}: ${POCKET_1_S1_RULES} plays step 1's forcing rule and carries no forcing block (pocket.forcing); must act per rusher is ${POCKET_1_S2_RULES}'s (ADR-089 step 2)`);
      }
      noStep3();
      return;
    case POCKET_1_S2_RULES:
      noStep3();
      return;
    case POCKET_1_S3_RULES:
      return;
    default: {
      const unhandled: never = rules;
      throw new EngineRulesError(`${where}: no blocks are named for engine rules ${String(unhandled)}`);
    }
  }
}

/**
 * The keys of one level of an overlay, refused when one is not a `pocket-1` block of that level, so
 * an overlay never carries an existing leaf in with it (a leaf changes through `applyTunablePatch`
 * on the base, before stamping).
 */
function assertOverlayKeys(node: unknown, allowed: readonly string[], level: string, where: string): void {
  if (!isObject(node)) throw new EngineRulesError(`${where}: the overlay's ${level} must be an object of ${allowed.join(", ")}, got ${String(node)}`);
  for (const key of Object.keys(node)) {
    if (!allowed.includes(key)) throw new EngineRulesError(`${where}: the overlay names ${level === "top level" ? key : `${level}.${key}`}, which is not a pocket-1 block (${allowed.join(", ")})`);
  }
}

/**
 * The only way to make a stamped bundle (S1). Refuses a base that already carries a `pocket-1` block
 * (`pocket.forcing` and step 3's included) or a stamp (so a bundle is never stamped twice, and an
 * arm's patches go on the base first, through `applyTunablePatch`), and an overlay key that is not a
 * `pocket-1` block. Merges the `passRush` blocks into `passRush`; when the fourth argument is given
 * (ADR-089 step 2), the forcing block into `pocket` as `pocket.forcing`; and step 3's blocks into
 * `blitzPickup` and `pocket` as `blitzPickup.freeRun`, `blitzPickup.lateBlock` and `pocket.climbLane`
 * (plan §2.1). Each key is added only when given, never as `undefined`. Stamps the result with `name`
 * and its overlay digest (O28), and returns it deep-frozen (N7). The blocks are copied, never frozen
 * in the caller's hands. A forcing block under `pocket-1.s1`, and a step-3 block under `pocket-1.s1`
 * or `pocket-1.s2`, are refused.
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
  assertOverlayKeys(blocks, OVERLAY_KEYS, "top level", where);
  const { blitzPickup: pickupBlocks, pocket: pocketBlocks, ...clockBlocks } = blocks;
  if (pickupBlocks !== undefined) assertOverlayKeys(pickupBlocks, OVERLAY_PICKUP_KEYS, "blitzPickup", where);
  if (pocketBlocks !== undefined) assertOverlayKeys(pocketBlocks, OVERLAY_POCKET_KEYS, "pocket", where);
  const passRush = { ...base.passRush, ...copyData(clockBlocks) };
  const defined = <T extends object>(node: T | undefined): Partial<T> =>
    node === undefined ? {} : (Object.fromEntries(Object.entries(copyData(node)).filter(([, v]) => v !== undefined)) as Partial<T>);
  const step3Pickup = defined(pickupBlocks);
  const step3Pocket = defined(pocketBlocks);
  const blitzPickup = Object.keys(step3Pickup).length === 0 ? base.blitzPickup : { ...base.blitzPickup, ...step3Pickup };
  const pocket =
    forcing === undefined && Object.keys(step3Pocket).length === 0
      ? base.pocket
      : { ...base.pocket, ...(forcing === undefined ? {} : { forcing: copyData(forcing) }), ...step3Pocket };
  const unstamped: Tunables = { ...base, passRush, blitzPickup, pocket };
  assertClosedSet(unstamped, where);
  assertBlocksUnderName(unstamped, name, where);
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
 *    stamping is refused (in a step-3 block too); no forcing block under `pocket-1.s1`, and no
 *    step-3 block under `pocket-1.s1` or `pocket-1.s2`.
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
  assertClosedSet(tunables, where);
  const recomputed = overlayDigestOf(tunables);
  if (stamp.overlayDigest !== recomputed) {
    throw new EngineRulesError(`${where}: the tunables are stamped ${rules} at overlay ${stamp.overlayDigest}, but they digest to ${recomputed}: a dial changed after stamping`);
  }
  assertBlocksUnderName(tunables, rules, where);
  assertDials(tunables, where);
  return tunables;
}

let designBundle: Tunables | undefined;
let stepTwoBundle: Tunables | undefined;
let stepThreeBundle: Tunables | undefined;

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
 * `pocket-1.s3` on `DEFAULT_TUNABLES` (plan §2.1), built exactly as `pocket-1.s2` is: Half and Follows
 * applied to the base by `applyTunablePatch`, then `POCKET_1_S3_OVERLAY` (step 1's blocks and step
 * 3's three) and must act per rusher through `withOverlay`; built once, its digest checked against
 * the recorded literal (K24).
 */
function pocket1s3(): Tunables {
  if (stepThreeBundle !== undefined) return stepThreeBundle;
  const bundle = withOverlay(POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES), POCKET_1_S3_RULES, POCKET_1_S3_OVERLAY, POCKET_1_S2_FORCING);
  const digest = bundle.engineRules?.overlayDigest;
  if (digest !== POCKET_1_S3_DIGEST) {
    throw new EngineRulesError(
      `${POCKET_1_S3_RULES} digests to ${String(digest)} on this build, not the recorded ${POCKET_1_S3_DIGEST}: re-record POCKET_1_S3_DIGEST before step 3 merges, or name the changed rules anew (K24)`,
    );
  }
  stepThreeBundle = bundle;
  return bundle;
}

/**
 * What a rules name plays: `legacy` is `DEFAULT_TUNABLES` itself (the same reference, so a legacy
 * run's tunables, digests and stream are today's by construction); `pocket-1.s1`, `pocket-1.s2` and
 * `pocket-1.s3` are their design bundles, deep-frozen and stamped.
 */
export function rulesTunables(rules: EngineRules): Tunables {
  if (rules === LEGACY_RULES) return DEFAULT_TUNABLES;
  if (rules === POCKET_1_S1_RULES) return pocket1s1();
  if (rules === POCKET_1_S2_RULES) return pocket1s2();
  if (rules === POCKET_1_S3_RULES) return pocket1s3();
  const unhandled: never = rules;
  throw new EngineRulesError(`no bundle for engine rules ${String(unhandled)}`);
}

/**
 * The overlay digest of a rules bundle: none for `legacy`, which is no overlay; the recorded literal
 * for `pocket-1.s1`, `pocket-1.s2` and `pocket-1.s3`. When a later step adds a bundle, the `never`
 * below stops compiling until its overlay's digest is recorded here.
 */
export function engineRulesDigestOf(rules: EngineRules): string | undefined {
  if (rules === LEGACY_RULES) return undefined;
  if (rules === POCKET_1_S1_RULES) return POCKET_1_S1_DIGEST;
  if (rules === POCKET_1_S2_RULES) return POCKET_1_S2_DIGEST;
  if (rules === POCKET_1_S3_RULES) return POCKET_1_S3_DIGEST;
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
