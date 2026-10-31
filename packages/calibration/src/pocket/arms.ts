/**
 * THE ARMS OF STEPS 1, 2 AND 3 (ADR-089 step 1: plan §7.2 item 2, §9.3, readings O23 to O28, O32,
 * O33; step 2: plan §4.1, §4.2, readings O35 to O47, AM-1's base map; step 3: plan §5.1, §4.2,
 * AM-2's references, AM-3's base map named).
 *
 * Step 1 builds both block clocks behind the switch and prices them on the flat league's 496 games
 * and the generated league's 272, at caller v7 (`ADR:941`, §6.1). Step 2 adds must act per rusher,
 * the half-second forcing point and the one-second warning, in seven arms B1 to B7 on the same
 * leagues and caller (`ADR:942`, §6.2), and re-plays five step-1 arms as their bases. This module is
 * the arm table: what each arm plays, on which seed set, against which base, and which filed clauses
 * it carries. It plays nothing; `step1.ts` (and step 2's harness) play the arms.
 *
 *  - **Per-step lists** (C2-F4). `ARM_IDS` (`STEP1_RUN_IDS`) is step 1's 17 and is unchanged, so
 *    `--step 1`, `allArms()`, `ARM_DEFS` and `isArmId` are step 1's as they were. `STEP2_ARM_IDS` is
 *    B1 to B7 (the graded arms, `STEP2_ARM_DEFS`); `STEP2_RUN_IDS` is what step 2 plays: the
 *    re-played bases A0, A14, A1, A5, A11 (`STEP2_BASES`) and B1 to B7. `ArmId` is the union.
 *  - **Step 3's arms** (plan §5.1, §4.2). `STEP3_ARM_IDS` is C1 to C16 and `STEP3_RUN_IDS` what
 *    step 3 plays: the re-played bases A0, A14, A1, A11, B3, B6 and B5, then C1 to C16.
 *    `STEP3_ARM_DEFS` is plan §5.1's table row by row. Every C arm but C13 is stamped `pocket-1.s3`
 *    at its own overlay digest; only C1's is `POCKET_1_S3_DIGEST` (C1 is the bundle itself,
 *    `rulesTunables("pocket-1.s3")`). An arm's step-3 blocks (`step3`: the free-run block, the late
 *    block, the climb lane rule) go in through `withOverlay` with its clock and card; the arms that
 *    hold an input carry AM-2's references (`AM2_REFERENCES`) as `freeRun.hold`; C6 draws the other
 *    of the two snap pictures (`freeRun.picture`, read by the frozen pair's line-up, K5); C13 is the
 *    uniform delay, B3 with the `LATE` patch set, stamped `pocket-1.s2` at its own digest; C15 is C1
 *    with the pickup and exchange band edges 30 points easier (`BAND_EDGES`, the readers' supply-cut
 *    stand-in, a band-edge shift, not a protection design). C14 (the L basis, B5 with the step-3
 *    blocks) is defined and refused while petition P17 is not in contracts (`waitsOn`): `withOverlay`
 *    refuses a late block on shape L, so the table does not build it, `armById` refuses it by name
 *    and `armRefusal` says why. The command line still refuses `--step 3` (its harness is K4's).
 *    Step 1's and step 2's lists, arms and digests are as they were.
 *  - **Step 2's arms** are stamped `pocket-1.s2` with their own overlay digests (O28), whatever their
 *    forcing rule; the re-played bases keep their step-1 stamps and digests. B3 is the design bundle
 *    itself, `rulesTunables("pocket-1.s2")`. Each B arm's base is AM-1's step-2 map (B1, B2, B3, B4,
 *    B7 on A1; B5 on A5; B6 on A11): the previous step's arm with the same settings except this
 *    step's mechanisms.
 *
 *  - **The patch sets** change existing leaves of `DEFAULT_TUNABLES` through `applyTunablePatch`
 *    (which refuses an unknown path or a stale value): `HOLD`, Appendix B's stand-in hold (budget
 *    +2.0 s, every route +1.0 s; the pricing arms, `ADR:925`); `HEELS` and `PAST_ONLY`, revision 1's
 *    Heels and Past-only tunables (§4.2, reading O24); `LATE`, revision 1's late free rushers
 *    (pickups +2.5 s, loopers +2.0 s) and `HORIZONS`, its COLLAPSING 0.5 s and PRESSURE 1.0 s
 *    horizons, which with `HOLD` and `HEELS` are revision 1's S late setting (O27, `ADR:1686`, `:1963`).
 *    Step 2's `HALF` and `FOLLOWS` are `rules.ts`'s `POCKET_1_S2_LEAVES`, split: the same two leaves
 *    and values as `HORIZONS`, which is left as it was so step 1's records do not move.
 *  - **An arm with a block clock** is its patches on `DEFAULT_TUNABLES`, then the overlay, through
 *    `withOverlay` (the only maker of a stamped bundle): it carries the rules name `pocket-1.s1` and
 *    its own overlay digest (O28), so same stamp means same game, patches included. A1 is the design
 *    bundle itself, `rulesTunables("pocket-1.s1")`. **An arm on the legacy clock** (A0, A9, A10,
 *    A14, A0b) is `legacy` plus patches: no stamp, no block, and its `PLAY_START` carries no `rules`.
 *  - **Every arm's tunables are deep-frozen**, and each has its digest, `overlayDigestOf` of its
 *    tunables (the dials less the stamp; for a legacy arm that is its whole tunables), which is
 *    distinct for every arm.
 *  - **`armOfDigest`** maps a stream's `PLAY_START.rules.overlayDigest` to the arm (or the proof
 *    overlay) whose dials made it; an unmapped digest is refused (N9): a stream nobody can name the
 *    dials of cannot be rebuilt.
 *  - **The proof overlays L4 and L6** (shape L at R = 4 and R = 6) are not arms: they run only in
 *    S-5's stream proof (`pocketStep1Stream`, `FF_POCKET_ON=1`), with A3's R = 5, for "L equals
 *    today from t >= R at R = 4, 5, 6".
 *
 * No value here is a candidate (ADR-061): the clocks' values are the design's provisional ones, and
 * every pricing arm is labelled "pricing arm, never a design value".
 */
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { stableDigest } from "../harness/digest.js";
import type { SeedSet } from "./corpus.js";
import {
  EngineRulesError,
  LEGACY_RULES,
  P17_IN_CONTRACTS,
  POCKET_1_S1_OVERLAY,
  POCKET_1_S1_RULES,
  POCKET_1_S2_LEAVES,
  POCKET_1_S2_RULES,
  POCKET_1_S3_CLIMB_LANE,
  POCKET_1_S3_FREE_RUN,
  POCKET_1_S3_LATE_BLOCK,
  POCKET_1_S3_RULES,
  checkStamp,
  overlayDigestOf,
  rulesTunables,
  withOverlay,
  type EngineRules,
  type ForcingRule,
  type FreeRunOrigin,
  type FreeRunPicture,
  type FreeRunReading,
  type OverlayRules,
  type PocketClimbLane,
  type PocketFreeRun,
  type PocketLateBlock,
  type PocketOverlay,
} from "./rules.js";

/** Freeze a plain-data tree in place, every depth, and return the same reference. */
function deepFreeze<T>(node: T): T {
  if (typeof node !== "object" || node === null || Object.isFrozen(node)) return node;
  Object.freeze(node);
  for (const key of Object.getOwnPropertyNames(node)) deepFreeze((node as Record<string, unknown>)[key]);
  return node;
}

// --- the patch sets ------------------------------------------------------------------------------

/**
 * A patch as `applyTunablePatch` takes it. Named from the patcher rather than imported, so `src`
 * takes no engine name beyond the 39 `adr089Surface.test.ts` measured there (`TunablePatch` is
 * test-only in that set).
 */
export type TunablePatch = Parameters<typeof applyTunablePatch>[1];

const patch = (tunableId: string, currentValue: string | number, proposedValue: string | number, evidence: string): TunablePatch =>
  Object.freeze({ tunableId, currentValue, proposedValue, evidence, expectedEffect: "ADR-089 step 1 arm only; information or pricing, never a design value (ADR-061)" });

const HOLD_EVIDENCE = "ADR-089 Appendix B, the stand-in hold (budget +2.0 s, every route +1.0 s); the pricing arms of steps 1 to 4 (ADR:925)";
const HEELS_EVIDENCE = "ADR-089 §4.2, revision 1's Heels and Past-only tunables (M2a to M2c), information arms under L (ADR:476; reading O24)";
const LATE_EVIDENCE = "ADR-089 revision 1's S late setting, late free rushers: pickups +2.5 s, loopers +2.0 s (ADR:1686, :1963; reading O27)";
const HORIZONS_EVIDENCE = "ADR-089 revision 1's S late setting, COLLAPSING 0.5 s and PRESSURE 1.0 s (ADR:1686, :1963; reading O27)";

/** Appendix B's stand-in hold: the quarterback's budget 2.5 -> 4.5 s, every route's ready time +1.0 s. */
export const HOLD: readonly TunablePatch[] = Object.freeze([
  patch("qb.timeBudget.baseSeconds", 2.5, 4.5, HOLD_EVIDENCE),
  patch("route.readySeconds.QUICK", 1.0, 2.0, HOLD_EVIDENCE),
  patch("route.readySeconds.SHORT", 1.5, 2.5, HOLD_EVIDENCE),
  patch("route.readySeconds.INTERMEDIATE", 2.0, 3.0, HOLD_EVIDENCE),
  patch("route.readySeconds.DEEP", 2.5, 3.5, HOLD_EVIDENCE),
]);

/** Heels (O24): the BLOCKER_BEATEN floor PRESSURE -> CLEAN, and RUSHER_GAINING's counter delta 1 -> 0. */
export const HEELS: readonly TunablePatch[] = Object.freeze([
  patch("pocket.minimumStatusByBand.BLOCKER_BEATEN", "PRESSURE", "CLEAN", HEELS_EVIDENCE),
  patch("passRush.pressureProgressByBand.RUSHER_GAINING.delta", 1, 0, HEELS_EVIDENCE),
]);

/** Past only (O24): Heels, and BLOCKER_BEATEN's counter delta 1 -> 0 too. */
export const PAST_ONLY: readonly TunablePatch[] = Object.freeze([
  ...HEELS,
  patch("passRush.pressureProgressByBand.BLOCKER_BEATEN.delta", 1, 0, HEELS_EVIDENCE),
]);

/** Late free rushers (O27): RAN_THROUGH 0.5 -> 3.0 s, BLOWN_UP 0 -> 2.5 s; LATE_EXCHANGE 0.5 -> 2.5 s, LOOPER_FREE 0 -> 2.0 s. */
export const LATE: readonly TunablePatch[] = Object.freeze([
  patch("blitzPickup.bands.2.arrivalDelaySeconds", 0.5, 3.0, LATE_EVIDENCE),
  patch("blitzPickup.bands.3.arrivalDelaySeconds", 0, 2.5, LATE_EVIDENCE),
  patch("stunt.bands.2.arrivalDelaySeconds", 0.5, 2.5, LATE_EVIDENCE),
  patch("stunt.bands.3.arrivalDelaySeconds", 0, 2.0, LATE_EVIDENCE),
]);

/** The S late setting's horizons (O27): COLLAPSING within 1.0 -> 0.5 s, PRESSURE within 2.0 -> 1.0 s. */
export const HORIZONS: readonly TunablePatch[] = Object.freeze([
  patch("arrival.collapsingWithinSeconds", 1.0, 0.5, HORIZONS_EVIDENCE),
  patch("arrival.pressureWithinSeconds", 2.0, 1.0, HORIZONS_EVIDENCE),
]);

/** One leaf of `rules.ts`'s `POCKET_1_S2_LEAVES`, by its path (exactly one). */
function s2Leaf(tunableId: string): readonly TunablePatch[] {
  const found = POCKET_1_S2_LEAVES.filter((p) => p.tunableId === tunableId);
  if (found.length !== 1) throw new Error(`arms: POCKET_1_S2_LEAVES holds ${String(found.length)} patches of ${tunableId}, not 1`);
  return Object.freeze([...found]);
}

/** Step 2's Half (question 2): COLLAPSING within 1.0 -> 0.5 s, must act's threat part by D32. */
export const HALF: readonly TunablePatch[] = s2Leaf("arrival.collapsingWithinSeconds");

/** Step 2's Follows (question 3): PRESSURE within 2.0 -> 1.0 s, the warning, a status only. */
export const FOLLOWS: readonly TunablePatch[] = s2Leaf("arrival.pressureWithinSeconds");

const BAND_EDGES_EVIDENCE =
  "ADR-089 step 3 plan §5.1, C15: the readers' supply-cut stand-in, a band-edge shift, not a protection design (ADR-089:1978); information, priced for the miss rule's option A";

/** How many points easier C15 makes every finite pickup and exchange band edge (plan §5.1). */
export const BAND_EDGE_SHIFT = 30;

/**
 * Step 3's `BAND_EDGES` (C15, plan §5.1): every finite band edge of the blitz pickup and of the
 * stunt exchange `BAND_EDGE_SHIFT` (30) points lower, so a margin that lost a pickup or an exchange
 * by under 30 points is read one band better (PICKED_UP_CLEAN 15 -> -15, PICKED_UP 0 -> -30,
 * RAN_THROUGH -19 -> -49; PASSED_OFF_CLEAN 20 -> -10, PASSED_OFF 0 -> -30, LATE_EXCHANGE -19 -> -49).
 * The last band of each (BLOWN_UP, LOOPER_FREE) has no finite edge and is untouched; the dice are
 * not.
 */
export const BAND_EDGES: readonly TunablePatch[] = Object.freeze([
  patch("blitzPickup.bands.0.minMargin", 15, 15 - BAND_EDGE_SHIFT, BAND_EDGES_EVIDENCE),
  patch("blitzPickup.bands.1.minMargin", 0, 0 - BAND_EDGE_SHIFT, BAND_EDGES_EVIDENCE),
  patch("blitzPickup.bands.2.minMargin", -19, -19 - BAND_EDGE_SHIFT, BAND_EDGES_EVIDENCE),
  patch("stunt.bands.0.minMargin", 20, 20 - BAND_EDGE_SHIFT, BAND_EDGES_EVIDENCE),
  patch("stunt.bands.1.minMargin", 0, 0 - BAND_EDGE_SHIFT, BAND_EDGES_EVIDENCE),
  patch("stunt.bands.2.minMargin", -19, -19 - BAND_EDGE_SHIFT, BAND_EDGES_EVIDENCE),
]);

/**
 * The patch sets, step 2's two appended after step 1's five, which keep their order, then step 3's
 * one (`BAND_EDGES`, C15).
 */
export const PATCH_SET_NAMES = ["HOLD", "HEELS", "PAST_ONLY", "LATE", "HORIZONS", "HALF", "FOLLOWS", "BAND_EDGES"] as const;
export type PatchSetName = (typeof PATCH_SET_NAMES)[number];

export const PATCH_SETS: Readonly<Record<PatchSetName, readonly TunablePatch[]>> = Object.freeze({ HOLD, HEELS, PAST_ONLY, LATE, HORIZONS, HALF, FOLLOWS, BAND_EDGES });

// --- the overlays --------------------------------------------------------------------------------

/** The approach card's PUSH range on every overlay: 1 to 14 (§4.0; the design bundle's). */
const APPROACH_CARD = Object.freeze({ pushMinMargin: 1, pushMaxMargin: 14 });

/** Shape S with the push window: the design bundle's overlay (A1, A11). */
export const S_WINDOW_OVERLAY: PocketOverlay = POCKET_1_S1_OVERLAY;

/** Shape S at the design's dials without the window: information only (A2), and A15's clock. */
export const S_OVERLAY: PocketOverlay = deepFreeze({
  beatClock: { thetaSeconds: 11, shape: 2, ratingWeight: 0.5 },
  approach: { ...APPROACH_CARD },
});

/** Shape L at R. */
export function lOverlay(R: number): PocketOverlay {
  if (!(R > 0)) throw new RangeError(`arms: R must be positive, got ${String(R)}`);
  return deepFreeze({ repClock: { fullExpressionSeconds: R }, approach: { ...APPROACH_CARD } });
}

// --- step 3's blocks (plan §5.1; AM-2) ---------------------------------------------------------------

/** The free-run block's AM-2 hold, typed from `rules.ts`'s `PocketFreeRun` (no new engine name). */
export type FreeRunHold = NonNullable<PocketFreeRun["hold"]>;

/**
 * AM-2's references (`reports/adr-089-amendments.filed.json`, AM-2's `rule.references`; CHOSEN,
 * information only, never a design value): Speed 50 and Acceleration 50; a drop of 5.0 yards; a
 * spot by group, depth and width from the ball, down lineman (1.0, 2.5), linebacker (2.5, 2.5),
 * defensive back (5.0, 7.0). The arms that vary one input (C3, C4, C5) hold the other two at these.
 * `pocketArms.test.ts` reads each number back out of the committed text.
 */
export const AM2_REFERENCES: Required<FreeRunHold> = deepFreeze({
  spot: {
    downLineman: { depth: 1.0, width: 2.5 },
    linebacker: { depth: 2.5, width: 2.5 },
    defensiveBack: { depth: 5.0, width: 7.0 },
  },
  ratings: { speed: 50, acceleration: 50 },
  drop: 5.0,
});

/**
 * An arm's step-3 blocks (plan §5.1), each the tunables block of the same name: `freeRun`
 * (`blitzPickup.freeRun`, the free-run clock), `lateBlock` (`blitzPickup.lateBlock`, the late, weak
 * block) and `climbLane` (`pocket.climbLane`, FRONT). Absent is "off" for each. Only a
 * `pocket-1.s3` arm carries any (`withOverlay` refuses one under another name).
 */
export interface Step3Blocks {
  readonly freeRun?: PocketFreeRun;
  readonly lateBlock?: PocketLateBlock;
  readonly climbLane?: PocketClimbLane;
}

/** The design's free-run block with one change: its reading, its origins, its hold or its picture. */
function freeRunWith(change: { readonly reading?: FreeRunReading; readonly origins?: readonly FreeRunOrigin[]; readonly hold?: FreeRunHold; readonly picture?: FreeRunPicture }): PocketFreeRun {
  return deepFreeze({ ...POCKET_1_S3_FREE_RUN, ...change });
}

/** The other of the two snap pictures from the design's (C6, plan §5.1; AM-2's Mug rule). */
export const OTHER_PICTURE: FreeRunPicture = POCKET_1_S3_FREE_RUN.picture === "AS_RULED" ? "MUG_HEAD_ONLY" : "AS_RULED";

/** `pocket-1.s3`'s three blocks, the design's (C1, C2, C14, C15). */
const S3_BLOCKS: Step3Blocks = deepFreeze({ freeRun: POCKET_1_S3_FREE_RUN, lateBlock: POCKET_1_S3_LATE_BLOCK, climbLane: POCKET_1_S3_CLIMB_LANE });

// --- the arm table (§9.3) ------------------------------------------------------------------------

/** Step 1's 17 arms, in §9.3's order: what `--step 1` plays. Unchanged at step 2. */
export const ARM_IDS = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15", "A0b"] as const;
export type Step1ArmId = (typeof ARM_IDS)[number];

/** Step 1's run list: `ARM_IDS` itself (the same array). */
export const STEP1_RUN_IDS: readonly Step1ArmId[] = ARM_IDS;

/** Step 2's seven graded arms (plan §4.1), in order. */
export const STEP2_ARM_IDS = ["B1", "B2", "B3", "B4", "B5", "B6", "B7"] as const;
export type Step2ArmId = (typeof STEP2_ARM_IDS)[number];

/**
 * Step 3's sixteen arms (plan §5.1), in order. AM-3's base map names C1, C2 and C11 (plan §4.2), so
 * the ids are arms of this build before any C arm runs; `STEP3_ARM_DEFS` defines them (C14 refused
 * while P17 is not in contracts), and the step-3 harness (K4) plays them.
 */
export const STEP3_ARM_IDS = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15", "C16"] as const;
export type Step3ArmId = (typeof STEP3_ARM_IDS)[number];

/** Every arm id of this build: step 1's, step 2's and step 3's. */
export type ArmId = Step1ArmId | Step2ArmId | Step3ArmId;

/**
 * What `--step 2` plays (plan §4.1, §4.6): the five re-played step-1 arms, A0 and A14 for AM-1's
 * cumulative line, A1, A5 and A11 as the B arms' bases, then B1 to B7.
 */
export const STEP2_RUN_IDS = ["A0", "A14", "A1", "A5", "A11", ...STEP2_ARM_IDS] as const satisfies readonly ArmId[];
export type Step2RunId = (typeof STEP2_RUN_IDS)[number];

/**
 * What `--step 3` plays (plan §5.1), once its harness is built (K4): the seven re-played bases, A0
 * and A14 for the cumulative line, A1 and A11 for the accepted state, B3, B6 and B5 as the C arms'
 * bases, then C1 to C16 (C14 refused while P17 is not in contracts, `armRefusal`). The command
 * line refuses `--step 3` in this build.
 */
export const STEP3_RUN_IDS = ["A0", "A14", "A1", "A11", "B3", "B6", "B5", ...STEP3_ARM_IDS] as const satisfies readonly ArmId[];
export type Step3RunId = (typeof STEP3_RUN_IDS)[number];

/** Every arm id of this build, step 1's then step 2's then step 3's. */
export const ALL_ARM_IDS: readonly ArmId[] = Object.freeze([...ARM_IDS, ...STEP2_ARM_IDS, ...STEP3_ARM_IDS]);

/** A step-1 arm id (`ARM_IDS`), as at step 1: step 1's command line reads it. */
export function isArmId(id: string): id is Step1ArmId {
  return (ARM_IDS as readonly string[]).includes(id);
}

/** A step-2 arm id, B1 to B7. */
export function isStep2ArmId(id: string): id is Step2ArmId {
  return (STEP2_ARM_IDS as readonly string[]).includes(id);
}

/** A step-3 arm id, C1 to C16. */
export function isStep3ArmId(id: string): id is Step3ArmId {
  return (STEP3_ARM_IDS as readonly string[]).includes(id);
}

/**
 * Any arm of this build, step 1's, step 2's or step 3's (for example AM-1's and AM-3's base maps,
 * whose arms must all be arms of this build). C14 is an arm of this build though it is refused
 * while P17 is not in contracts.
 */
export function isAnyArmId(id: string): id is ArmId {
  return (ALL_ARM_IDS as readonly string[]).includes(id);
}

/** The steps that have an arm list in this build (step 3's command is not built: K4). */
export const ARM_STEPS = [1, 2, 3] as const;
export type ArmStep = (typeof ARM_STEPS)[number];

/** A step's run list: `--arms` at that step takes these ids and no others (C2-F4). */
export function runIdsOf(step: ArmStep): readonly ArmId[] {
  switch (step) {
    case 1:
      return STEP1_RUN_IDS;
    case 2:
      return STEP2_RUN_IDS;
    case 3:
      return STEP3_RUN_IDS;
    default: {
      const never: never = step;
      throw new Error(`arms: no run list for step ${String(never)}`);
    }
  }
}

/** Whether `id` is in a step's run list. */
export function isRunIdOf(step: ArmStep, id: string): id is ArmId {
  return (runIdsOf(step) as readonly string[]).includes(id);
}

/** Which block clock an arm runs: today's, S, S with the window, or L at R. */
export type ArmClock = { readonly kind: "LEGACY" } | { readonly kind: "S"; readonly window: boolean } | { readonly kind: "L"; readonly R: number };

export interface ArmDef {
  readonly id: ArmId;
  readonly what: string;
  readonly clock: ArmClock;
  /** The existing leaves the arm changes, in the order they are applied. */
  readonly patchSets: readonly PatchSetName[];
  readonly seedSet: SeedSet;
  readonly role: string;
  /** A pricing arm (the stand-in hold): "pricing arm, never a design value". */
  readonly pricing: boolean;
  /** The arm its guard and affected counts read (O32): same league, same seeds, same non-clock patches. */
  readonly base?: ArmId;
  /** The filed clauses graded on this arm (§9.3's "graded" column). */
  readonly graded: readonly string[];
  /** The filed clauses reported on it. */
  readonly reported: readonly string[];
  /**
   * The rules name an arm with a block clock is stamped with (O28): absent is `pocket-1.s1`, step
   * 1's arms; step 2's arms carry `pocket-1.s2`. An arm on today's clock carries none.
   */
  readonly rules?: OverlayRules;
  /**
   * The arm's `pocket.forcing` rule (step 2, plan §1.8): `PER_RUSHER` (must act per rusher) or
   * `COUNTER_LESS_SEEN` (the narrower counter rule). Absent: no block, step 1's forcing rule.
   */
  readonly forcing?: ForcingRule;
  /** Step 3's blocks (plan §5.1), under `pocket-1.s3` only. Absent: none. */
  readonly step3?: Step3Blocks;
  /**
   * The contract petition the arm waits on, when its blocks are refused until it is in contracts:
   * C14's late block on shape L waits on P17 (plan §3.4). Such an arm is defined, never built while
   * the petition is out (`armRefusal`).
   */
  readonly waitsOn?: "P17";
}

const GUARD = ["guard.mix", "guard.byClass"] as const;
const S = (window: boolean): ArmClock => ({ kind: "S", window });
const L = (R: number): ArmClock => ({ kind: "L", R });
const LEGACY: ArmClock = { kind: "LEGACY" };

export const ARM_DEFS: readonly ArmDef[] = deepFreeze([
  { id: "A0", what: "legacy, today's clock", clock: LEGACY, patchSets: [], seedSet: 1, role: "base", pricing: false, graded: [], reported: [] },
  {
    id: "A1", what: "S with the window (theta 11, k 2, beta 0.5; window 1-14, 1.0 s)", clock: S(true), patchSets: [], seedSet: 1, role: "design", pricing: false, base: "A0",
    graded: ["s1.S.pressure", "s1.S.sack", "s1.S.release", "s1.falsifier.pressure45", ...GUARD], reported: ["s1.expected.sack"],
  },
  {
    id: "A2", what: "S without the window", clock: S(false), patchSets: [], seedSet: 1, role: "information only", pricing: false, base: "A0",
    graded: ["s1.window.pressure", "s1.window.sack", "s1.falsifier.pressure45", ...GUARD], reported: [],
  },
  {
    id: "A3", what: "L at R = 5", clock: L(5), patchSets: [], seedSet: 1, role: "design point, provisional", pricing: false, base: "A0",
    graded: ["s1.falsifier.pressure45", "s1.falsifier.floorCounter", ...GUARD], reported: ["s1.L5.pressure"],
  },
  {
    id: "A4", what: "L at R = 8", clock: L(8), patchSets: [], seedSet: 1, role: "priced point", pricing: false, base: "A0",
    graded: [
      "s1.L8.flat.pressure", "s1.L8.flat.sack", "s1.L8.flat.release", "s1.L8.gen.pressure", "s1.L8.gen.sack", "s1.L8.gen.release",
      "s1.falsifier.pressure45", "s1.falsifier.floorCounter", ...GUARD,
    ],
    reported: ["s1.L8.flat.hitOrSack", "s1.L8.gen.hitOrSack"],
  },
  { id: "A5", what: "L8 with Heels", clock: L(8), patchSets: ["HEELS"], seedSet: 1, role: "information, for the return package", pricing: false, base: "A0", graded: [...GUARD], reported: [] },
  { id: "A6", what: "L8 with Past only", clock: L(8), patchSets: ["PAST_ONLY"], seedSet: 1, role: "information, for the return package", pricing: false, base: "A0", graded: [...GUARD], reported: [] },
  { id: "A7", what: "L5 with Heels", clock: L(5), patchSets: ["HEELS"], seedSet: 1, role: "information", pricing: false, base: "A0", graded: [...GUARD], reported: [] },
  { id: "A8", what: "L5 with Past only", clock: L(5), patchSets: ["PAST_ONLY"], seedSet: 1, role: "information", pricing: false, base: "A0", graded: [...GUARD], reported: [] },
  { id: "A9", what: "Heels alone (legacy clock)", clock: LEGACY, patchSets: ["HEELS"], seedSet: 1, role: "information, the joint's alone arm (O23)", pricing: false, base: "A0", graded: [...GUARD], reported: [] },
  { id: "A10", what: "Past only alone (legacy clock)", clock: LEGACY, patchSets: ["PAST_ONLY"], seedSet: 1, role: "information, the joint's alone arm (O23)", pricing: false, base: "A0", graded: [...GUARD], reported: [] },
  { id: "A11", what: "A1 with the stand-in hold", clock: S(true), patchSets: ["HOLD"], seedSet: 1, role: "pricing arm, never a design value", pricing: true, base: "A14", graded: [...GUARD], reported: [] },
  { id: "A12", what: "A4 with the stand-in hold", clock: L(8), patchSets: ["HOLD"], seedSet: 1, role: "pricing arm, never a design value", pricing: true, base: "A14", graded: [...GUARD], reported: [] },
  { id: "A13", what: "A3 with the stand-in hold", clock: L(5), patchSets: ["HOLD"], seedSet: 1, role: "pricing arm, never a design value", pricing: true, base: "A14", graded: [...GUARD], reported: [] },
  { id: "A14", what: "the base with the stand-in hold", clock: LEGACY, patchSets: ["HOLD"], seedSet: 1, role: "pricing reference, base of A11-A13", pricing: true, graded: [], reported: [] },
  {
    id: "A15", what: "S without the window at theta 11, with HOLD, HORIZONS, HEELS and LATE: revision 1's S late setting less its coin (context only, O27)",
    clock: S(false), patchSets: ["HOLD", "HORIZONS", "HEELS", "LATE"], seedSet: 2, role: "context only (sLateArm, O27)", pricing: true, base: "A0b", graded: [...GUARD], reported: [],
  },
  { id: "A0b", what: "legacy with HOLD, HORIZONS, HEELS and LATE", clock: LEGACY, patchSets: ["HOLD", "HORIZONS", "HEELS", "LATE"], seedSet: 2, role: "base of A15", pricing: true, graded: [], reported: [] },
] satisfies readonly ArmDef[]);

// --- step 2's arms (plan §4.1, §4.2) -------------------------------------------------------------------

const S2 = POCKET_1_S2_RULES;

/**
 * Step 2's seven arms (plan §4.1). Every one plays both leagues at caller v7 on both seed sets (AM-1
 * pools them); `seedSet` is the set its graded clauses read (set 1, as step 1 graded), and set 2 is
 * played beside it. `base` is AM-1's step-2 map. B1 and B2 are the "alone" arms (`ADR:925`, O37):
 * each leaves the other mechanism out, so each breaks the July derivation (P = C + (C - I)) and is
 * information, never a design value; B3 is the design; B6 the pricing arm (`ADR:928`); B4, B5 and
 * B7 information.
 */
export const STEP2_ARM_DEFS: readonly ArmDef[] = deepFreeze([
  {
    id: "B1", what: "the forcing point alone: must act per rusher at 0.5 s, the warning left at 2.0 s", clock: S(true), patchSets: ["HALF"], forcing: "PER_RUSHER", rules: S2,
    seedSet: 1, role: "information, the forcing point alone (ADR:925): breaks the July derivation, not a design value", pricing: false, base: "A1",
    graded: ["s2.falsifier.sacksDown", ...GUARD], reported: [],
  },
  {
    id: "B2", what: "the warning alone: 1.0 s, under step 1's forcing rule at 1.0 s", clock: S(true), patchSets: ["FOLLOWS"], rules: S2,
    seedSet: 1, role: "information, the warning alone (ADR:925): breaks the July derivation, not a design value", pricing: false, base: "A1",
    graded: [...GUARD], reported: [],
  },
  {
    id: "B3", what: "both, with must act per rusher: pocket-1.s2 itself", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S2,
    seedSet: 1, role: "design", pricing: false, base: "A1",
    graded: ["s2.pressure.flat", "s2.pressure.gen", "s2.hitOrSack", "s2.sack", ...GUARD], reported: [],
  },
  {
    id: "B4", what: "the narrower counter rule at the same horizons", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "COUNTER_LESS_SEEN", rules: S2,
    seedSet: 1, role: "information (ADR:494), not ruled on", pricing: false, base: "A1",
    graded: [...GUARD], reported: [],
  },
  {
    id: "B5", what: "A5 with the horizons, under step 1's forcing rule: pkA's A123", clock: L(8), patchSets: ["HEELS", "HALF", "FOLLOWS"], rules: S2,
    seedSet: 1, role: "information, the basis arm on L (F.9 item 6)", pricing: false, base: "A5",
    graded: [...GUARD], reported: [],
  },
  {
    id: "B6", what: "B3 with the stand-in hold", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S2,
    seedSet: 1, role: "pricing arm, never a design value", pricing: true, base: "A11",
    graded: [...GUARD], reported: [],
  },
  {
    id: "B7", what: "A1 with the horizons, under step 1's forcing rule", clock: S(true), patchSets: ["HALF", "FOLLOWS"], rules: S2,
    seedSet: 1, role: "information, the basis mechanism on S (C1-F9)", pricing: false, base: "A1",
    graded: [...GUARD], reported: [],
  },
] satisfies readonly ArmDef[]);

/** A step-1 arm step 2 re-plays, with its step-2 role and the step-2 clauses reported on its streams. */
export interface Step2Base {
  readonly id: Step1ArmId;
  readonly role: string;
  readonly reported: readonly string[];
}

/**
 * The five step-1 arms step 2 re-plays (plan §4.1), with their step-1 stamps and digests: A0 and A14
 * for AM-1's cumulative line (B3 against A0, B6 against A14; reported, never graded), A1, A5 and
 * A11 as the B arms' bases. Their re-plays must equal step 1's records (AM-1 §4.3, Q-2).
 */
export const STEP2_BASES: readonly Step2Base[] = deepFreeze([
  { id: "A0", role: "today's game, re-played: AM-1's cumulative line only (reported)", reported: [] },
  { id: "A14", role: "today's clock with the hold, re-played: AM-1's cumulative line only (pricing)", reported: [] },
  { id: "A1", role: "step 1's design arm, re-played: base of B1 to B4 and B7; M2 is read on its streams", reported: ["s2.m2"] },
  { id: "A5", role: "L8 with Heels, re-played: base of B5; M2 on its streams for the L return package", reported: [] },
  { id: "A11", role: "A1 with the stand-in hold, re-played: base of B6", reported: [] },
] satisfies readonly Step2Base[]);

// --- step 3's arms (plan §5.1) -----------------------------------------------------------------------

const S3 = POCKET_1_S3_RULES;

/** The clauses C1 grades and reports (the filing's step-3 graded rows, plan §5.2). */
const S3_GRADED = ["s3.bin20.tick", "s3.quick", "s3.unblockedPressures", "s3.unblockedShare"] as const;
/** The stand-in expectations, read as C2 minus B6 deltas on gen (plan §5.3). */
const S3_STAND_IN = ["s3.hitOrSack", "s3.expected.pressure", "s3.expected.sack", "s3.expected.bin20", "s3.expected.quick"] as const;

/**
 * Step 3's sixteen arms (plan §5.1), row by row. Every one plays both leagues at caller v7 on both
 * seed sets; `seedSet` is the set its graded clauses read (set 1, as step 2 graded). `base` is the
 * table's base column (AM-3 maps C1 on B3, C2 on B6 and C11 on B3; the others are information, their
 * Z printed against the same base, unguarded). "Today" is today's set times; the hand-off fix and
 * D16's path come with the free-run block. The arms that vary one input (C3, C4, C5) hold the other
 * two at AM-2's references. C14 waits on P17 (`waitsOn`) and is never built while P17 is out.
 */
export const STEP3_ARM_DEFS: readonly ArmDef[] = deepFreeze([
  {
    id: "C1", what: "the design: B3 with the free-run clock (reading B; real spot, ratings and drop), the late block on S and the climb lane FRONT: pocket-1.s3 itself",
    clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3, step3: S3_BLOCKS,
    seedSet: 1, role: "design", pricing: false, base: "B3",
    graded: [...S3_GRADED, ...GUARD], reported: ["s3.quickOrigin", "s3.unblockedMen"],
  },
  {
    id: "C2", what: "C1 on B6: the design with the stand-in hold", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3, step3: S3_BLOCKS,
    seedSet: 1, role: "pricing arm, never a design value", pricing: true, base: "B6",
    graded: [...GUARD], reported: [...S3_STAND_IN],
  },
  {
    id: "C3", what: "the snap spot alone: reading B on the real spot, ratings and drop held at AM-2's references; no late block, no climb lane rule",
    clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { freeRun: freeRunWith({ hold: { ratings: AM2_REFERENCES.ratings, drop: AM2_REFERENCES.drop } }) },
    seedSet: 1, role: "information, the snap spot alone (AM-2's references hold the others)", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C4", what: "Speed and Acceleration alone: reading B on real ratings, spot and drop held at AM-2's references; no late block, no climb lane rule",
    clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { freeRun: freeRunWith({ hold: { spot: AM2_REFERENCES.spot, drop: AM2_REFERENCES.drop } }) },
    seedSet: 1, role: "information, Speed and Acceleration alone (AM-2's references hold the others)", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C5", what: "the drop alone: reading B on the real drop, spot and ratings held at AM-2's references; no late block, no climb lane rule",
    clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { freeRun: freeRunWith({ hold: { spot: AM2_REFERENCES.spot, ratings: AM2_REFERENCES.ratings } }) },
    seedSet: 1, role: "information, the drop alone (AM-2's references hold the others)", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C6", what: "C1 with the Mug's other picture", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { ...S3_BLOCKS, freeRun: freeRunWith({ picture: OTHER_PICTURE }) },
    seedSet: 1, role: "information, the other of the two snap pictures (AM-2's Mug rule)", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C7", what: "UNBLOCKED alone on the clock, real inputs; the rest today's times", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { freeRun: freeRunWith({ origins: ["UNBLOCKED"] }) },
    seedSet: 1, role: "information, UNBLOCKED alone", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C8", what: "BLOWN_UP alone on the clock, real inputs; the rest today's times", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { freeRun: freeRunWith({ origins: ["BLOWN_UP"] }) },
    seedSet: 1, role: "information, BLOWN_UP alone", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C9", what: "LOOPER_FREE and the untouched exchange alone on the clock, real inputs; the rest today's times", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { freeRun: freeRunWith({ origins: ["LOOPER_FREE"] }) },
    seedSet: 1, role: "information, LOOPER_FREE alone (the untouched exchange with it, AM-2)", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C10", what: "the late block alone on S: no free-run clock (men nobody touched keep today's times), no climb lane rule", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { lateBlock: POCKET_1_S3_LATE_BLOCK },
    seedSet: 1, role: "information, the late block alone", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C11", what: "reading (c): every free runner on the clock, touched men 0.5 s later; no late block; the climb lane FRONT", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { freeRun: freeRunWith({ reading: "C" }), climbLane: POCKET_1_S3_CLIMB_LANE },
    seedSet: 1, role: "information, priced for the miss rule's option C; guarded under AM-3", pricing: false, base: "B3", graded: [...GUARD], reported: [],
  },
  {
    id: "C12", what: "reading (a): UNBLOCKED alone on the clock; the late block on S for every man with a hand on him (BLOWN_UP and LOOPER_FREE too); the climb lane FRONT",
    clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { freeRun: freeRunWith({ reading: "A" }), lateBlock: POCKET_1_S3_LATE_BLOCK, climbLane: POCKET_1_S3_CLIMB_LANE },
    seedSet: 1, role: "information, reading (a), never offered", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C13", what: "the uniform delay: B3 with the LATE patch set (pickups +2.5 s, loopers +2.0 s), under pocket-1.s2", clock: S(true), patchSets: ["HALF", "FOLLOWS", "LATE"], forcing: "PER_RUSHER", rules: S2,
    seedSet: 1, role: "contrast only: revision 1's uniform delay, never offered for a man nobody touched", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C14", what: "the L basis: B5 (L8 with Heels and the horizons) with the free-run clock as C1, the late block on L and the climb lane FRONT",
    clock: L(8), patchSets: ["HEELS", "HALF", "FOLLOWS"], rules: S3, step3: S3_BLOCKS, waitsOn: "P17",
    seedSet: 1, role: "information, the L basis; refused until petition P17 is in contracts, dropped if P17 is declined", pricing: false, base: "B5", graded: [], reported: [],
  },
  {
    id: "C15", what: "C1 with the pickup and exchange band edges 30 points easier (the readers' supply-cut stand-in, a band-edge shift, not a protection design)",
    clock: S(true), patchSets: ["HALF", "FOLLOWS", "BAND_EDGES"], forcing: "PER_RUSHER", rules: S3, step3: S3_BLOCKS,
    seedSet: 1, role: "information, priced for the miss rule's option A", pricing: false, base: "B3", graded: [], reported: [],
  },
  {
    id: "C16", what: "the climb lane FRONT alone: no free-run clock, no late block", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S3,
    step3: { climbLane: POCKET_1_S3_CLIMB_LANE },
    seedSet: 1, role: "information, the climb lane alone", pricing: false, base: "B3", graded: [], reported: [],
  },
] satisfies readonly ArmDef[]);

// --- the built arms --------------------------------------------------------------------------------

/** An arm (or a proof overlay) with its tunables built. Plain data and frozen tunables. */
export interface Arm extends Omit<ArmDef, "id" | "rules"> {
  readonly id: ArmId | ProofOverlayId;
  readonly rules: EngineRules;
  /** Deep-frozen; checked against `rules` by `checkStamp` when built. */
  readonly tunables: Tunables;
  /** `overlayDigestOf(tunables)`: the dials less the stamp (O28), distinct for every arm. */
  readonly digest: string;
  /** The stamp's overlay digest, when the arm carries one (equal to `digest`). */
  readonly overlayDigest?: string;
  /** `stableDigest` of the whole tunables, the stamp included. */
  readonly tunablesDigest: string;
  /** Every patch applied, in order. */
  readonly patches: readonly TunablePatch[];
}

export const PROOF_OVERLAY_IDS = ["L4", "L6"] as const;
export type ProofOverlayId = (typeof PROOF_OVERLAY_IDS)[number];

const PROOF_DEFS: readonly (Omit<ArmDef, "id"> & { readonly id: ProofOverlayId })[] = deepFreeze([
  { id: "L4", what: "L at R = 4 (S-5's proof overlay)", clock: L(4), patchSets: [], seedSet: 1, role: "proof overlay for S-5 (s1.falsifier.lToday)", pricing: false, graded: [], reported: [] },
  { id: "L6", what: "L at R = 6 (S-5's proof overlay)", clock: L(6), patchSets: [], seedSet: 1, role: "proof overlay for S-5 (s1.falsifier.lToday)", pricing: false, graded: [], reported: [] },
] satisfies readonly (Omit<ArmDef, "id"> & { readonly id: ProofOverlayId })[]);

function overlayOf(clock: ArmClock): PocketOverlay | undefined {
  switch (clock.kind) {
    case "LEGACY":
      return undefined;
    case "S":
      return clock.window ? S_WINDOW_OVERLAY : S_OVERLAY;
    case "L":
      return lOverlay(clock.R);
  }
}

/**
 * Whether a step-2 arm is `pocket-1.s2`'s design bundle itself: S with the window, Half and Follows
 * in `POCKET_1_S2_LEAVES`' order, and must act per rusher (B3).
 */
function isS2DesignArm(def: Pick<ArmDef, "patchSets" | "forcing">, overlay: PocketOverlay): boolean {
  return overlay === S_WINDOW_OVERLAY && def.forcing === "PER_RUSHER" && def.patchSets.length === 2 && def.patchSets[0] === "HALF" && def.patchSets[1] === "FOLLOWS";
}

/**
 * Whether a step-3 arm is `pocket-1.s3`'s design bundle itself: B3's settings (`isS2DesignArm`) and
 * the design's three blocks, by reference (C1).
 */
function isS3DesignArm(def: Pick<ArmDef, "patchSets" | "forcing" | "step3">, overlay: PocketOverlay): boolean {
  const b = def.step3;
  return isS2DesignArm(def, overlay) && b !== undefined && b.freeRun === POCKET_1_S3_FREE_RUN && b.lateBlock === POCKET_1_S3_LATE_BLOCK && b.climbLane === POCKET_1_S3_CLIMB_LANE;
}

/** An arm's whole overlay: its clock's blocks and card, then its step-3 blocks, each only when given. */
function withStep3(clockOverlay: PocketOverlay, blocks: Step3Blocks | undefined): PocketOverlay {
  if (blocks === undefined) return clockOverlay;
  const pickup = {
    ...(blocks.freeRun === undefined ? {} : { freeRun: blocks.freeRun }),
    ...(blocks.lateBlock === undefined ? {} : { lateBlock: blocks.lateBlock }),
  };
  return {
    ...clockOverlay,
    ...(Object.keys(pickup).length === 0 ? {} : { blitzPickup: pickup }),
    ...(blocks.climbLane === undefined ? {} : { pocket: { climbLane: blocks.climbLane } }),
  };
}

/**
 * Builds one arm from its definition: the patches, the overlay, the rules stamp and the forcing
 * block, checked by `checkStamp`. Exported as `buildArm` only as a test seam (review FID-F-8,
 * CT-F9): no definition in this file reaches the legacy-clock tripwire, so the test builds one that does.
 */
export function buildArm(def: Omit<ArmDef, "id"> & { readonly id: ArmId | ProofOverlayId }): Arm {
  return build(def);
}

function build(def: Omit<ArmDef, "id"> & { readonly id: ArmId | ProofOverlayId }): Arm {
  const patches = def.patchSets.flatMap((name) => PATCH_SETS[name]);
  const overlay = overlayOf(def.clock);
  let tunables: Tunables;
  let rules: EngineRules;
  if (overlay === undefined) {
    if (def.rules !== undefined || def.forcing !== undefined || def.step3 !== undefined) {
      throw new EngineRulesError(`arm ${def.id}: an arm on today's clock carries no rules stamp and no forcing block`);
    }
    rules = LEGACY_RULES;
    tunables = patches.length === 0 ? DEFAULT_TUNABLES : deepFreeze(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES));
  } else if (def.rules === POCKET_1_S3_RULES) {
    rules = def.rules;
    // C1 is the bundle rules.ts builds and checks against POCKET_1_S3_DIGEST; every other step-3 arm
    // is its patches on DEFAULT_TUNABLES, then its clock, card and step-3 blocks and its forcing
    // block, through withOverlay (which refuses C14's late block on shape L while P17 is out).
    tunables = isS3DesignArm(def, overlay)
      ? rulesTunables(POCKET_1_S3_RULES)
      : withOverlay(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), def.rules, withStep3(overlay, def.step3), def.forcing === undefined ? undefined : { rule: def.forcing });
  } else if (def.step3 !== undefined) {
    throw new EngineRulesError(`arm ${def.id}: only a ${POCKET_1_S3_RULES} arm carries step 3's blocks`);
  } else if (def.rules === undefined || def.rules === POCKET_1_S1_RULES) {
    rules = POCKET_1_S1_RULES;
    // The design bundle is the one rules.ts builds and checks against POCKET_1_S1_DIGEST.
    tunables =
      patches.length === 0 && overlay === S_WINDOW_OVERLAY && def.forcing === undefined
        ? rulesTunables(POCKET_1_S1_RULES)
        : withOverlay(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), POCKET_1_S1_RULES, overlay, def.forcing === undefined ? undefined : { rule: def.forcing });
  } else {
    rules = def.rules;
    // B3 is the bundle rules.ts builds and checks against POCKET_1_S2_DIGEST; the other step-2 arms
    // are their patches on DEFAULT_TUNABLES, then the overlay and their forcing block, if any.
    tunables = isS2DesignArm(def, overlay)
      ? rulesTunables(POCKET_1_S2_RULES)
      : withOverlay(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), def.rules, overlay, def.forcing === undefined ? undefined : { rule: def.forcing });
  }
  checkStamp(tunables, rules, `arm ${def.id}`);
  const digest = overlayDigestOf(tunables);
  const stamped = tunables.engineRules?.overlayDigest;
  return Object.freeze({
    ...def,
    rules,
    tunables,
    digest,
    ...(stamped === undefined ? {} : { overlayDigest: stamped }),
    tunablesDigest: stableDigest(tunables),
    patches: Object.freeze([...patches]),
  });
}

/** Whether the petition an arm waits on is in contracts (only P17 is named). */
function petitionIn(petition: NonNullable<ArmDef["waitsOn"]>): boolean {
  switch (petition) {
    case "P17":
      return P17_IN_CONTRACTS;
    default: {
      const unhandled: never = petition;
      throw new Error(`arms: no petition ${String(unhandled)}`);
    }
  }
}

/**
 * Why an arm of this build is not built, or `undefined` when it is: an arm whose petition is not
 * yet in contracts (C14, P17). The step-3 harness skips it and its report says why.
 */
export function armRefusal(id: ArmId): string | undefined {
  const def = STEP3_ARM_DEFS.find((d) => d.id === id);
  if (def?.waitsOn === undefined || petitionIn(def.waitsOn)) return undefined;
  return `${id} waits on petition ${def.waitsOn} (the late block's rolled tick on shape L): the late block on shape L is refused until its doc text is in contracts (ADR-089 step 3, plan §3.4, §5.1); dropped if ${def.waitsOn} is declined`;
}

let table: { readonly arms: ReadonlyMap<ArmId, Arm>; readonly proofs: ReadonlyMap<ProofOverlayId, Arm>; readonly byDigest: ReadonlyMap<string, Arm> } | undefined;

function armTable(): NonNullable<typeof table> {
  if (table !== undefined) return table;
  const arms = new Map<ArmId, Arm>();
  for (const def of [...ARM_DEFS, ...STEP2_ARM_DEFS, ...STEP3_ARM_DEFS]) {
    if (armRefusal(def.id) !== undefined) continue;
    arms.set(def.id, build(def));
  }
  const proofs = new Map<ProofOverlayId, Arm>();
  for (const def of PROOF_DEFS) proofs.set(def.id, build(def));
  const byDigest = new Map<string, Arm>();
  for (const arm of [...arms.values(), ...proofs.values()]) {
    const seen = [...arms.values(), ...proofs.values()].find((a) => a !== arm && a.digest === arm.digest);
    if (seen !== undefined) throw new Error(`arms: ${arm.id} and ${seen.id} have the same digest ${arm.digest}; every arm's dials are its own (O28)`);
    if (arm.overlayDigest !== undefined) byDigest.set(arm.overlayDigest, arm);
  }
  table = { arms, proofs, byDigest };
  return table;
}

/** Every arm of §9.3, in the table's order (step 1's 17, as at step 1). */
export function allArms(): readonly Arm[] {
  return ARM_IDS.map((id) => armById(id));
}

/** Step 2's seven arms, B1 to B7. */
export function step2Arms(): readonly Arm[] {
  return STEP2_ARM_IDS.map((id) => armById(id));
}

/** Step 3's arms this build builds, C1 to C16 in order, less any refused (C14 while P17 is out). */
export function step3Arms(): readonly Arm[] {
  return STEP3_ARM_IDS.filter((id) => armRefusal(id) === undefined).map((id) => armById(id));
}

/**
 * Every arm this build builds, step 1's 17, step 2's 7, then step 3's (15 while C14 waits on P17),
 * each in its table's order.
 */
export function everyArm(): readonly Arm[] {
  return ALL_ARM_IDS.filter((id) => armRefusal(id) === undefined).map((id) => armById(id));
}

/** The arm of `id`. Refused: an id of no arm, and an arm whose petition is not in contracts (`armRefusal`). */
export function armById(id: ArmId): Arm {
  const arm = armTable().arms.get(id);
  if (arm === undefined) {
    const refusal = armRefusal(id);
    if (refusal !== undefined) throw new EngineRulesError(`arms: ${refusal}: nothing plays it`);
    throw new Error(`arms: no arm ${id}`);
  }
  return arm;
}

/** S-5's proof overlays, L4 and L6. */
export function proofOverlay(id: ProofOverlayId): Arm {
  const arm = armTable().proofs.get(id);
  if (arm === undefined) throw new Error(`arms: no proof overlay ${id}`);
  return arm;
}

/**
 * The arm (or proof overlay) whose dials a stream's `PLAY_START.rules.overlayDigest` names (N9),
 * step 1's, step 2's and step 3's alike. Refused: a digest no arm of this build carries, since
 * nobody could rebuild that stream's margins.
 */
export function armOfDigest(overlayDigest: string): Arm {
  const arm = armTable().byDigest.get(overlayDigest);
  if (arm === undefined) {
    throw new EngineRulesError(`a stream stamped with overlay ${overlayDigest}, which no step-1 arm of this build carries, nor any step-2 or step-3 arm: its dials cannot be named (N9)`);
  }
  return arm;
}

/**
 * An arm's mechanisms, for the exclusive affected-play counts against its base (ADR-089:927). Step
 * 2's four are appended after step 1's eight, which keep their order (C3-13): `MUST_ACT` (the
 * forcing rule PER_RUSHER), `HALF`, `FOLLOWS` (the two leaves) and `COUNTER_LESS_SEEN` (the
 * narrower counter rule). Step 3's five follow: `FREE_RUN` (a free-run block, whatever its reading,
 * origins or hold), `LATE_BLOCK`, `CLIMB_FRONT`, `MUG_HEAD_ONLY` (a free-run block drawing the
 * Head-only picture) and `BAND_EDGES` (C15's patch set).
 */
export const MECHANISMS = [
  "S", "WINDOW", "L", "HEELS", "PAST_ONLY", "HOLD", "HORIZONS", "LATE", "MUST_ACT", "HALF", "FOLLOWS", "COUNTER_LESS_SEEN",
  "FREE_RUN", "LATE_BLOCK", "CLIMB_FRONT", "MUG_HEAD_ONLY", "BAND_EDGES",
] as const;
export type Mechanism = (typeof MECHANISMS)[number];

/** The mechanism a forcing rule is. */
const FORCING_MECHANISM: Readonly<Record<ForcingRule, Mechanism>> = Object.freeze({ PER_RUSHER: "MUST_ACT", COUNTER_LESS_SEEN: "COUNTER_LESS_SEEN" });

/**
 * An arm's mechanisms: its clock, its patch sets in order, then its forcing rule (step 2), then its
 * step-3 blocks (the free-run block, the Head-only picture, the late block, the climb lane rule).
 */
export function mechanismsOf(arm: Pick<ArmDef, "clock" | "patchSets" | "forcing" | "step3">): readonly Mechanism[] {
  const out: Mechanism[] = [];
  if (arm.clock.kind === "S") {
    out.push("S");
    if (arm.clock.window) out.push("WINDOW");
  }
  if (arm.clock.kind === "L") out.push("L");
  for (const name of arm.patchSets) out.push(name);
  if (arm.forcing !== undefined) out.push(FORCING_MECHANISM[arm.forcing]);
  const b = arm.step3;
  if (b?.freeRun !== undefined) {
    out.push("FREE_RUN");
    if (b.freeRun.picture === "MUG_HEAD_ONLY") out.push("MUG_HEAD_ONLY");
  }
  if (b?.lateBlock !== undefined) out.push("LATE_BLOCK");
  if (b?.climbLane !== undefined) out.push("CLIMB_FRONT");
  return out;
}

/** The mechanisms an arm has and its base does not (all of them for an arm with no base). */
export function exclusiveMechanisms(arm: Pick<ArmDef, "clock" | "patchSets" | "base" | "forcing" | "step3">): readonly Mechanism[] {
  const own = mechanismsOf(arm);
  if (arm.base === undefined) return own;
  const base = new Set(mechanismsOf(armById(arm.base)));
  return own.filter((m) => !base.has(m));
}
