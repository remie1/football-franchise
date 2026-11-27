/**
 * THE ARMS OF STEPS 1 TO 4, AND STEP 5'S ARM IDS (ADR-089 step 1: plan §7.2 item 2, §9.3,
 * readings O23 to O28, O32, O33; step 2: plan §4.1, §4.2, readings O35 to O47, AM-1's base map;
 * step 3: plan §5.1, §4.2, AM-2's references, AM-3's base map named; step 4: plan §4, the ids, the
 * run list and the base column; step 5: plan §5.1, §5.2, the ids and the run lists only).
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
 *    blocks) waits on petition P17 (`waitsOn`), which is in contracts (E4b), so it is built and
 *    played like the others. Were its petition out, `withOverlay` would refuse a late block on
 *    shape L, so the table would not build it, `armById` would refuse it by name, `armRefusal` would
 *    say why, and the command line (`--step 3`, K4) would refuse it with that reason.
 *    Step 1's and step 2's lists, arms and digests are as they were.
 *  - **Step 4's arms** (plan §4, §5; ADR-089 §6.4). `STEP4_ARM_IDS` is D1 to D17 and
 *    `STEP4_RUN_IDS` what step 4 plays: the re-played bases A0, A14, A1, A11, C1, C2 and C14, then D1
 *    to D17. `STEP4_ARM_BASES` is plan §4's base column, and `STEP4_ARM_DEFS` (K2b) defines each arm
 *    on the same base. They are in `ArmId`, `ALL_ARM_IDS` and `ARM_STEPS` so that AM-6's base map
 *    (D1 on C1, D2 on C2, D6 on C2) names arms of this build before any D arm runs. Every D arm waits
 *    on petitions P6, P7 and P8 (`waitsOn`): while any is out, the table does not build it, `armById`
 *    refuses it by name, `armRefusal` says why, and `--step 4 --arms Dn` is refused with that reason.
 *    A test builds one with the petitions granted through `buildArm`'s seam. Steps 1 to 3's lists,
 *    arms and digests are as they were.
 *  - **Step 5's arm ids, named and inert** (ADR-089 step 5, plan §5.1, §5.2, §9 order item 1; AM-8,
 *    `filing.md` §3.1). `STEP5A_ARM_IDS` is E0 to E10 (the clean bench) and `STEP5B_ARM_IDS` F0 to
 *    F14, G1 and G2 (the league); `STEP5A_RUN_IDS` and `STEP5B_RUN_IDS` are what `--step 5a` and
 *    `--step 5b` will play (5b: D1 replayed, F1 to F14, then F0, G1 and G2 after the selection). They
 *    are in `ArmId`, `ALL_ARM_IDS` and `ARM_STEPS` so that AM-8's base maps (E9 on E0; F5 on D1, F0
 *    on F5) and its fresh base (E0) name arms of this build before any step-5 arm runs. Nothing
 *    defines or plays them yet: `armById` refuses one by name (`step5ArmRefusal` says when it is
 *    defined), `everyArm()` and the table hold steps 1 to 4's arms only, and the command line
 *    refuses `--step 5a` and `--step 5b`. Steps 1 to 4's lists, arms and digests are as they were.
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
import { cleanBenchTunablesS5, CLEAN_BENCH_PARTS, type CleanBenchPart, type CleanBenchParts } from "./oneThreatBench.js";
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
  POCKET_1_S4_CONTACT,
  POCKET_1_S4_MOTION,
  POCKET_1_S4_RULES,
  POCKET_1_S5A_LEAVES,
  POCKET_1_S5A_OVERLAY,
  POCKET_1_S5A_RULES,
  POCKET_1_S5B_OVERLAY,
  POCKET_1_S5B_RULES,
  READ_SYSTEMS,
  checkStamp,
  isStep5Rules,
  readSystemDeltaLeaves,
  step5Bundle,
  step5OverlayAt,
  overlayDigestOf,
  step4PetitionsIn,
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
  type PocketContact,
  type PocketLateBlock,
  type PocketMotion,
  type PocketOverlay,
  type ReadSystemOffsets,
  type StampedRules,
  type Step4Petitions,
  type Step5Rules,
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
 * the ids are arms of this build before any C arm runs; `STEP3_ARM_DEFS` defines them (C14 waits on
 * P17, in contracts since c340520 and lifted in E4b), and the step-3 harness (K4) plays them.
 */
export const STEP3_ARM_IDS = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "C15", "C16"] as const;
export type Step3ArmId = (typeof STEP3_ARM_IDS)[number];

/**
 * Step 4's seventeen arms (plan §4), in order. AM-6's base map names D1, D2 and D6 (plan §3.1), so
 * the ids are arms of this build before any D arm runs; `STEP4_ARM_DEFS` defines them, and since
 * P6, P7 and P8 are in contracts this build builds and plays them (`armRefusal` names none).
 */
export const STEP4_ARM_IDS = ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9", "D10", "D11", "D12", "D13", "D14", "D15", "D16", "D17"] as const;
export type Step4ArmId = (typeof STEP4_ARM_IDS)[number];

/**
 * Step 5a's eleven arms on the clean bench (ADR-089 step 5, plan §5.1), in order: E0, the s4 clean
 * bench (AM-8's base, played fresh and twice), E1 to E8 (each part alone, then jointly), E9
 * (`pocket-1.s5a` on the bench, graded against E0) and E10 (E9 with no reset). E1, E9 and E10 are
 * defined once the 5a fit is recorded (the fit commit, done: `POCKET_1_S5A_LEAVES`), the others with
 * the step-5 bundles.
 */
export const STEP5A_ARM_IDS = ["E0", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8", "E9", "E10"] as const;
export type Step5aArmId = (typeof STEP5A_ARM_IDS)[number];

/**
 * Step 5b's arms on the league (ADR-089 step 5, plan §5.2), in order: F0 (the selection's winner
 * restamped `pocket-1.s5b`), F1 to F9 (S at theta 7 to 15; F5 is `pocket-1.s5a` itself), F10 to F14
 * (L at R 4 to 8), then G1 and G2 (F0 with C15's band edges and with C11's reading, information,
 * never graded). Named, not yet defined (inert): F0, G1 and G2 are defined only once the 5b selection
 * is recorded (the selection commit), F1 to F14 with the step-5 bundles; nothing in this build plays
 * them.
 */
export const STEP5B_ARM_IDS = ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "G1", "G2"] as const;
export type Step5bArmId = (typeof STEP5B_ARM_IDS)[number];

/** Every arm id of this build: step 1's, step 2's, step 3's and step 4's, then step 5's (named only). */
export type ArmId = Step1ArmId | Step2ArmId | Step3ArmId | Step4ArmId | Step5aArmId | Step5bArmId;

/**
 * What `--step 2` plays (plan §4.1, §4.6): the five re-played step-1 arms, A0 and A14 for AM-1's
 * cumulative line, A1, A5 and A11 as the B arms' bases, then B1 to B7.
 */
export const STEP2_RUN_IDS = ["A0", "A14", "A1", "A5", "A11", ...STEP2_ARM_IDS] as const satisfies readonly ArmId[];
export type Step2RunId = (typeof STEP2_RUN_IDS)[number];

/**
 * What `--step 3` plays (plan §5.1; its harness is `step3.ts`, K4): the seven re-played bases, A0
 * and A14 for the cumulative line, A1 and A11 for the accepted state, B3, B6 and B5 as the C arms'
 * bases, then C1 to C16 (less any arm whose petition is out, `armRefusal`: none since P17, E4b).
 */
export const STEP3_RUN_IDS = ["A0", "A14", "A1", "A11", "B3", "B6", "B5", ...STEP3_ARM_IDS] as const satisfies readonly ArmId[];
export type Step3RunId = (typeof STEP3_RUN_IDS)[number];

/**
 * What `--step 4` plays (plan §4; its harness is `step4.ts`): the seven re-played bases, A0 and A14
 * for the cumulative line, A1 and A11 for the accepted state, C1, C2 and C14 as the D arms' bases,
 * then D1 to D17 (less any arm whose petitions are out, `armRefusal`: none since P6, P7 and P8 are in
 * contracts).
 */
export const STEP4_RUN_IDS = ["A0", "A14", "A1", "A11", "C1", "C2", "C14", ...STEP4_ARM_IDS] as const satisfies readonly ArmId[];
export type Step4RunId = (typeof STEP4_RUN_IDS)[number];

/**
 * Plan §4's base column, row by row: the arm each D arm's guard, affected counts and printed deltas
 * read. D1, D5 and D7 on C1 (the design); D2, D6 and D8 on C2 (the pricing build); D3 on A0 and D4
 * on A14 (today's line, kind T); D9 to D11 on D8 (the tilts' base); D12 to D14 on D1; D15 and D16 on
 * D2; D17 on C14 (shape L). Step 4's arm definitions (K2b) carry the same bases.
 */
export const STEP4_ARM_BASES: Readonly<Record<Step4ArmId, ArmId>> = Object.freeze({
  D1: "C1", D2: "C2", D3: "A0", D4: "A14", D5: "C1", D6: "C2", D7: "C1", D8: "C2", D9: "D8",
  D10: "D8", D11: "D8", D12: "D1", D13: "D1", D14: "D1", D15: "D2", D16: "D2", D17: "C14",
});

/**
 * What `--step 5a` will play (plan §5.1), once its harness is built: E0 to E10 on the clean bench, both
 * leagues, both seed sets (E0, the base, a second time in a fresh process). Named only: the command
 * line refuses `--step 5a` in this build.
 */
export const STEP5A_RUN_IDS = [...STEP5A_ARM_IDS] as const satisfies readonly ArmId[];
export type Step5aRunId = (typeof STEP5A_RUN_IDS)[number];

/**
 * What `--step 5b` will play (plan §5.2), once its harness is built: D1 replayed (step 4's design, the
 * base of F5), the fourteen grid points F1 to F14 (the first pass), then F0, G1 and G2 (the second
 * pass, after the selection; none of them if L wins). Named only: the command line refuses
 * `--step 5b` in this build.
 */
export const STEP5B_RUN_IDS = [
  "D1", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14", "F0", "G1", "G2",
] as const satisfies readonly ArmId[];
export type Step5bRunId = (typeof STEP5B_RUN_IDS)[number];

/** Every arm id of this build, step 1's then step 2's then step 3's then step 4's, then step 5a's and 5b's (named, not yet defined). */
export const ALL_ARM_IDS: readonly ArmId[] = Object.freeze([...ARM_IDS, ...STEP2_ARM_IDS, ...STEP3_ARM_IDS, ...STEP4_ARM_IDS, ...STEP5A_ARM_IDS, ...STEP5B_ARM_IDS]);

/**
 * The arms this build defines: steps 1 to 4's, in order (`everyArm()`, the table). Step 4's are
 * built and played since P6, P7 and P8 are in contracts (`armRefusal` names none).
 */
const DEFINED_ARM_IDS: readonly ArmId[] = Object.freeze([...ARM_IDS, ...STEP2_ARM_IDS, ...STEP3_ARM_IDS, ...STEP4_ARM_IDS]);

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

/** A step-4 arm id, D1 to D17. */
export function isStep4ArmId(id: string): id is Step4ArmId {
  return (STEP4_ARM_IDS as readonly string[]).includes(id);
}

/** A step-5a arm id, E0 to E10 (named; not yet defined). */
export function isStep5aArmId(id: string): id is Step5aArmId {
  return (STEP5A_ARM_IDS as readonly string[]).includes(id);
}

/** A step-5b arm id, F0 to F14, G1 or G2 (named; not yet defined). */
export function isStep5bArmId(id: string): id is Step5bArmId {
  return (STEP5B_ARM_IDS as readonly string[]).includes(id);
}

/** The step-5 arms whose definitions wait on a record: E1, E9 and E10 on the 5a fit; F0, G1 and G2 on the 5b selection (plan §4, arms.ts row). */
export const STEP5_DEFINED_AT_FIT: readonly Step5aArmId[] = Object.freeze(["E1", "E9", "E10"] as const);
export const STEP5_DEFINED_AT_SELECTION: readonly Step5bArmId[] = Object.freeze(["F0", "G1", "G2"] as const);

/**
 * Why a step-5 arm id names no arm in this build, or `undefined` when it does (and for any other id).
 * E0 and E2 to E8 are defined with the step-5 bundles (`STEP5_ARM_DEFS`); E1, E9, E10 and F1 to F14
 * wait on the 5a fit's record (their deltas are the fit's: `POCKET_1_S5A_LEAVES`); F0, G1 and G2 on
 * the 5b selection's (they are the winner's: `POCKET_1_S5B_OVERLAY`). When the fit lands on today's
 * deltas, E1 is E0 and E9 is E8 (AM-9 `fit.record`, `e9IsE8`): neither is defined apart, and the
 * refusal says so. `records` is a test's seam (default: this build's recorded literals).
 */
export function step5ArmRefusal(id: string, records: Step5Records = recordedStep5()): string | undefined {
  if (!isStep5aArmId(id) && !isStep5bArmId(id)) return undefined;
  const half = isStep5aArmId(id) ? "5a" : "5b";
  const def = STEP5_ARM_DEFS.find((d) => d.id === id)!;
  const r = def.step5;
  const needsFit = (r.kind === "bench" && r.fitted) || r.kind === "league";
  const needsSelection = r.kind === "league" && r.at === "selection";
  const named = (when: string): string => `${id} is one of step ${half}'s arms, named in this build but not yet defined (ADR-089 step 5, plan §5): ${when}`;
  if (needsFit && records.fitted === undefined) return named("defined only once the 5a fit is recorded (its deltas are the fit's)");
  if (needsSelection && records.selection === undefined) return named("defined only once the 5b selection is recorded (it is the winner's build)");
  if (records.fitted !== undefined && READ_SYSTEMS.every((s) => records.fitted![s] === 0) && (id === "E1" || id === "E9")) {
    return `${id} is ${id === "E1" ? "E0" : "E8"}: the 5a fit landed on today's deltas, so ${id}'s dials are ${id === "E1" ? "E0" : "E8"}'s and it is not defined apart (AM-9 fit.record, e9IsE8)`;
  }
  return undefined;
}

/**
 * Any arm of this build, step 1's to step 4's, or step 5's (for example AM-1's, AM-3's, AM-6's and
 * AM-8's base maps, whose arms must all be arms of this build). C14 is an arm of this build whether
 * or not P17 is in contracts; a step-5 id is one though nothing defines it yet.
 */
export function isAnyArmId(id: string): id is ArmId {
  return (ALL_ARM_IDS as readonly string[]).includes(id);
}

/**
 * The steps that have an arm list in this build (step 4's D arms wait on P6, P7 and P8). Step 5's two
 * halves, "5a" and "5b", have their run lists named; their command is not built.
 */
export const ARM_STEPS = [1, 2, 3, 4, "5a", "5b"] as const;
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
    case 4:
      return STEP4_RUN_IDS;
    case "5a":
      return STEP5A_RUN_IDS;
    case "5b":
      return STEP5B_RUN_IDS;
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
  /** Step 3's blocks (plan §5.1), under `pocket-1.s3` and `pocket-1.s4` only. Absent: none. */
  readonly step3?: Step3Blocks;
  /** Step 4's blocks (plan §1.1, §4), under `pocket-1.s4` only. Absent: none. */
  readonly step4?: Step4Blocks;
  /**
   * The contract petitions the arm waits on, when its blocks are refused until they are in
   * contracts: C14's late block on shape L waits on P17 (plan §3.4), in contracts since c340520 and
   * lifted in E4b; every D arm's step-4 blocks wait on P6, P7 and P8 (step-4 plan §6). Such an arm is
   * defined, never built while a petition is out (`armRefusal`).
   */
  readonly waitsOn?: "P17" | "P6_P7_P8";
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
 * two at AM-2's references. C14 waits on P17 (`waitsOn`), in contracts since c340520 and lifted in
 * E4b, so it is built.
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
    seedSet: 1, role: "information, the L basis (its late block on shape L is petition P17's, in contracts)", pricing: false, base: "B5", graded: [], reported: [],
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

// --- step 4's arms (step-4 plan §4) ------------------------------------------------------------------

/**
 * An arm's step-4 blocks (step-4 plan §1.1, §4), each the tunables block of the same name: `contact`
 * (`pocket.contact`, the rated arrival contest, its tilts, the shed and the second arrival) and
 * `motion` (`throwExec.motion`, the throwing motion and D21's race). Absent is "off" for each. Only a
 * `pocket-1.s4` arm carries either (`withOverlay` refuses one under another name).
 */
export interface Step4Blocks {
  readonly contact?: PocketContact;
  readonly motion?: PocketMotion;
}

/** The contact block's three tilts by name, in the engine's order (`pocket.contact.tilts`). */
export const CONTACT_TILT_NAMES = ["pushBlocked", "freeRun", "behindNever"] as const;
export type ContactTiltName = (typeof CONTACT_TILT_NAMES)[number];

/** The design's contact block with every tilt off (its magnitudes kept): D3, D4 and D8. */
export const UNTILTED_CONTACT: PocketContact = deepFreeze({
  ...POCKET_1_S4_CONTACT,
  tilts: {
    pushBlocked: { ...POCKET_1_S4_CONTACT.tilts.pushBlocked, on: false },
    freeRun: { ...POCKET_1_S4_CONTACT.tilts.freeRun, on: false },
    behindNever: { ...POCKET_1_S4_CONTACT.tilts.behindNever, on: false },
  },
});

/** The untilted contact block with one tilt on at the design's size (D9, D10, D11: one tilt alone against D8). */
export function oneTiltContact(name: ContactTiltName): PocketContact {
  return deepFreeze({ ...UNTILTED_CONTACT, tilts: { ...UNTILTED_CONTACT.tilts, [name]: { ...POCKET_1_S4_CONTACT.tilts[name], on: true } } });
}

/** The design's contact block with one change (D12, D13, D15, D16). */
function contactWith(change: Partial<PocketContact>): PocketContact {
  return deepFreeze({ ...POCKET_1_S4_CONTACT, ...change });
}

/** The design's motion with one change (D14). */
function motionWith(change: Partial<PocketMotion>): PocketMotion {
  return deepFreeze({ ...POCKET_1_S4_MOTION, ...change });
}

/** `pocket-1.s4`'s two blocks, the design's (D1, D2, D17). */
const S4_BLOCKS: Step4Blocks = deepFreeze({ contact: POCKET_1_S4_CONTACT, motion: POCKET_1_S4_MOTION });

const S4 = POCKET_1_S4_RULES;

/** The contact clauses, read on D3 against A0 (AM-7 item 1). */
const S4_CONTACT_CLAUSES = ["s4.contact.flat.sack", "s4.contact.gen.sack", "s4.contact.pressure", "s4.contact.hitOrSack", "s4.contact.gen.share", "s4.contact.flat.share"] as const;
/** The motion clauses, read on D6 against C2 (AM-7 item 2; `s4.motion.int` under AM-6). */
const S4_MOTION_CLAUSES = ["s4.motion.hits", "s4.motion.curveRises", "s4.motion.int"] as const;

/**
 * Step 4's seventeen arms (step-4 plan §4), row by row. Every one plays both leagues at caller v7 on
 * both seed sets; `seedSet` is the set its graded clauses read (set 1, AM-7 item 15). `base` is the
 * table's base column (`STEP4_ARM_BASES`; AM-6 maps D1 on C1, D2 on C2 and D6 on C2). Every D arm is
 * stamped `pocket-1.s4` at its own overlay digest; only D1's is `POCKET_1_S4_DIGEST` (D1 is the
 * bundle itself, `rulesTunables("pocket-1.s4")`). D3 and D4 are kind T (today's line plus contact,
 * plan §1.2): today's clock (`LEGACY`) with the approach card and the contact block alone. Every D
 * arm waits on P6, P7 and P8 (`waitsOn`): while any is out the table does not build it, `armById`
 * refuses it by name, `armRefusal` says why, and the command line refuses it with that reason.
 */
export const STEP4_ARM_DEFS: readonly ArmDef[] = deepFreeze([
  {
    id: "D1", what: "the design: C1 with contact (tilted, b 5, the second arrival, the shed, the rebuild) and the motion (D21): pocket-1.s4 itself",
    clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS, step4: S4_BLOCKS, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "design", pricing: false, base: "C1",
    graded: [...GUARD, "s4.reading", "s4.sackCredit", "s4.qbHitFields"], reported: ["s4.sackerMix.edge", "s4.sackerMix.interior"],
  },
  {
    id: "D2", what: "the pricing build: C2 with both blocks", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS, step4: S4_BLOCKS, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "pricing arm, never a design value", pricing: true, base: "C2", graded: [...GUARD], reported: [],
  },
  {
    id: "D3", what: "contact alone, untilted, on today's line (kind T on A0: today's clock, the stem and the count read as A0 plays them)", clock: LEGACY, patchSets: [], rules: S4, step4: { contact: UNTILTED_CONTACT }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "the contact clauses' arm (AM-7 item 1)", pricing: false, base: "A0", graded: [...S4_CONTACT_CLAUSES], reported: [],
  },
  {
    id: "D4", what: "D3 with the stand-in hold (kind T on A14)", clock: LEGACY, patchSets: ["HOLD"], rules: S4, step4: { contact: UNTILTED_CONTACT }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "printed beside the contact clauses (AM-7 item 1's other reading)", pricing: true, base: "A14", graded: [], reported: [],
  },
  {
    id: "D5", what: "the motion alone on C1", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS, step4: { motion: POCKET_1_S4_MOTION }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "printed beside the motion clauses", pricing: false, base: "C1", graded: [], reported: [],
  },
  {
    id: "D6", what: "the motion alone on the pricing build (C2)", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS, step4: { motion: POCKET_1_S4_MOTION }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "the motion clauses' arm (AM-7 item 2); guarded under AM-6", pricing: true, base: "C2", graded: [...S4_MOTION_CLAUSES, ...GUARD], reported: [],
  },
  {
    id: "D7", what: "contact alone on C1, tilted (the conjoined rule's contact alone on the design)", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: POCKET_1_S4_CONTACT }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "printed, reported direction only", pricing: false, base: "C1", graded: [], reported: [],
  },
  {
    id: "D8", what: "contact alone on C2, untilted (the tilts' base)", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: UNTILTED_CONTACT }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "printed, the tilts' base", pricing: true, base: "C2", graded: [], reported: [],
  },
  {
    id: "D9", what: "D8 with the PUSH or BLOCKED tilt alone", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: oneTiltContact("pushBlocked") }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "the PUSH or BLOCKED tilt alone (AM-7 item 5)", pricing: true, base: "D8", graded: ["s4.tilt.pushBlocked"], reported: [],
  },
  {
    id: "D10", what: "D8 with the free-run tilt alone", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: oneTiltContact("freeRun") }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "the free-run tilt alone (AM-7 items 5 and 6)", pricing: true, base: "D8", graded: ["s4.tilt.freeRun"], reported: [],
  },
  {
    id: "D11", what: "D8 with the BEHIND or NEVER tilt alone", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: oneTiltContact("behindNever") }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "the BEHIND or NEVER tilt alone (AM-7 item 5)", pricing: true, base: "D8", graded: ["s4.tilt.behindNever"], reported: [],
  },
  {
    id: "D12", what: "D1 with the second arrival off (every arrival a rated :contest)", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: contactWith({ secondArrival: "RATED" }), motion: POCKET_1_S4_MOTION }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "information, direction only (AM-7 item 12)", pricing: false, base: "D1", graded: [], reported: [],
  },
  {
    id: "D13", what: "D1 with the contest before the throw", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: contactWith({ order: "CONTEST_BEFORE_THROW" }), motion: POCKET_1_S4_MOTION }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "information (§4.5 item 7)", pricing: false, base: "D1", graded: [], reported: [],
  },
  {
    id: "D14", what: "D1 on the half-second arrival reading", clock: S(true), patchSets: ["HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: POCKET_1_S4_CONTACT, motion: motionWith({ reading: "GRID" }) }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "information only, never a candidate (s4.reading)", pricing: false, base: "D1", graded: [], reported: [],
  },
  {
    id: "D15", what: "D2 at b = -15", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: contactWith({ boundary: -15 }), motion: POCKET_1_S4_MOTION }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "b's reachable range, the grid's low end (reported)", pricing: true, base: "D2", graded: [], reported: ["s4.bRange"],
  },
  {
    id: "D16", what: "D2 at b = +15", clock: S(true), patchSets: ["HOLD", "HALF", "FOLLOWS"], forcing: "PER_RUSHER", rules: S4, step3: S3_BLOCKS,
    step4: { contact: contactWith({ boundary: 15 }), motion: POCKET_1_S4_MOTION }, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "b's reachable range, the grid's high end (reported)", pricing: true, base: "D2", graded: [], reported: ["s4.bRange"],
  },
  {
    id: "D17", what: "C14 (shape L) with both blocks: the build check under L (T_L)", clock: L(8), patchSets: ["HEELS", "HALF", "FOLLOWS"], rules: S4, step3: S3_BLOCKS, step4: S4_BLOCKS, waitsOn: "P6_P7_P8",
    seedSet: 1, role: "information, the build check under shape L", pricing: false, base: "C14", graded: [], reported: [],
  },
] satisfies readonly ArmDef[]);

// --- the built arms --------------------------------------------------------------------------------

/** An arm (or a proof overlay) with its tunables built. Plain data and frozen tunables. */
export interface Arm extends Omit<ArmDef, "id" | "rules"> {
  readonly id: ArmId | ProofOverlayId;
  /** The stamp's rules name: an engine name, or (step 5's arms only) `pocket-1.s5a` or `pocket-1.s5b`. */
  readonly rules: StampedRules;
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
 * Whether a step-4 arm is `pocket-1.s4`'s design bundle itself: C1's settings (`isS3DesignArm`) and
 * the design's two step-4 blocks, by reference (D1).
 */
function isS4DesignArm(def: Pick<ArmDef, "patchSets" | "forcing" | "step3" | "step4">, overlay: PocketOverlay): boolean {
  const b = def.step4;
  return isS3DesignArm(def, overlay) && b !== undefined && b.contact === POCKET_1_S4_CONTACT && b.motion === POCKET_1_S4_MOTION;
}

/** An overlay with step 4's blocks added under `pocket` (beside the climb lane) and `throwExec`, each only when given. */
function withStep4(overlay: PocketOverlay, blocks: Step4Blocks | undefined): PocketOverlay {
  if (blocks === undefined) return overlay;
  return {
    ...overlay,
    ...(blocks.contact === undefined ? {} : { pocket: { ...(overlay.pocket ?? {}), contact: blocks.contact } }),
    ...(blocks.motion === undefined ? {} : { throwExec: { motion: blocks.motion } }),
  };
}

/**
 * Builds one arm from its definition: the patches, the overlay, the rules stamp and the forcing
 * block, checked by `checkStamp`. Exported as `buildArm` only as a test seam (review FID-F-8,
 * CT-F9): no definition in this file reaches the legacy-clock tripwire, so the test builds one that
 * does. `petitions` is a test's own set (step 4): with P6, P7 and P8 granted it builds a D arm before
 * the lift, so a test can read its tunables and digest; nothing outside a test passes it.
 */
export function buildArm(def: Omit<ArmDef, "id"> & { readonly id: ArmId | ProofOverlayId }, petitions?: Step4Petitions): Arm {
  return build(def, petitions);
}

function build(def: Omit<ArmDef, "id"> & { readonly id: ArmId | ProofOverlayId }, petitions: Step4Petitions = {}): Arm {
  const patches = def.patchSets.flatMap((name) => PATCH_SETS[name]);
  const overlay = overlayOf(def.clock);
  let tunables: Tunables;
  let rules: EngineRules;
  if (def.step4 !== undefined && def.rules !== POCKET_1_S4_RULES) {
    throw new EngineRulesError(`arm ${def.id}: only a ${POCKET_1_S4_RULES} arm carries step 4's blocks`);
  }
  if (overlay === undefined && def.rules === POCKET_1_S4_RULES) {
    // Kind T (step-4 plan §1.2; D3, D4): today's clock plus patches, the approach card and the contact
    // block alone, stamped pocket-1.s4 at its own digest. withOverlay refuses anything else with no clock.
    const contact = def.step4?.contact;
    if (contact === undefined || def.step4?.motion !== undefined || def.step3 !== undefined || def.forcing !== undefined) {
      throw new EngineRulesError(`arm ${def.id}: today's line plus contact (kind T) carries the contact block alone: no motion, no step-3 block, no forcing block`);
    }
    rules = POCKET_1_S4_RULES;
    tunables = withOverlay(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), POCKET_1_S4_RULES, { approach: { ...APPROACH_CARD }, pocket: { contact } });
  } else if (overlay === undefined) {
    if (def.rules !== undefined || def.forcing !== undefined || def.step3 !== undefined) {
      throw new EngineRulesError(`arm ${def.id}: an arm on today's clock carries no rules stamp and no forcing block`);
    }
    rules = LEGACY_RULES;
    tunables = patches.length === 0 ? DEFAULT_TUNABLES : deepFreeze(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES));
  } else if (def.rules === POCKET_1_S4_RULES) {
    rules = def.rules;
    // D1 is the bundle rules.ts builds and checks against POCKET_1_S4_DIGEST; every other step-4 arm
    // with a clock is its patches on DEFAULT_TUNABLES, then its clock, card, step-3 and step-4 blocks
    // and its forcing block, through withOverlay.
    tunables = isS4DesignArm(def, overlay)
      ? rulesTunables(POCKET_1_S4_RULES)
      : withOverlay(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), def.rules, withStep4(withStep3(overlay, def.step3), def.step4), def.forcing === undefined ? undefined : { rule: def.forcing });
  } else if (def.rules === POCKET_1_S3_RULES) {
    rules = def.rules;
    // C1 is the bundle rules.ts builds and checks against POCKET_1_S3_DIGEST; every other step-3 arm
    // is its patches on DEFAULT_TUNABLES, then its clock, card and step-3 blocks and its forcing
    // block, through withOverlay (which would refuse C14's late block on shape L were P17 out).
    tunables = isS3DesignArm(def, overlay)
      ? rulesTunables(POCKET_1_S3_RULES)
      : withOverlay(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), def.rules, withStep3(overlay, def.step3), def.forcing === undefined ? undefined : { rule: def.forcing });
  } else if (def.rules !== undefined && isStep5Rules(def.rules)) {
    // ADR-089 step 5 (plan §1.1, §5): step 5's arms are defined with their harness, which builds
    // their bench and league bundles (`cleanBenchTunablesS5`, `step5Bundle`); this table builds none.
    throw new EngineRulesError(`arm ${def.id}: no arm of this table is stamped ${def.rules}; step 5's arms are built by the step-5 harness`);
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
  checkStamp(tunables, rules, `arm ${def.id}`, petitions);
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

/** Whether the petition an arm waits on is in contracts (P17; or all three of P6, P7 and P8). */
function petitionIn(petition: NonNullable<ArmDef["waitsOn"]>): boolean {
  switch (petition) {
    case "P17":
      return P17_IN_CONTRACTS;
    case "P6_P7_P8":
      return step4PetitionsIn();
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
  const def = STEP3_ARM_DEFS.find((d) => d.id === id) ?? STEP4_ARM_DEFS.find((d) => d.id === id);
  if (def?.waitsOn === undefined || petitionIn(def.waitsOn)) return undefined;
  if (def.waitsOn === "P6_P7_P8") {
    return (
      `${id} waits on petitions P6, P7 and P8 (arrival_contest, QB_HIT, THROW.releaseSeconds): its step-4 blocks are refused before any game until the owner's typed yes to each ` +
      "and contracts-guardian's review land their text in contracts (ADR-089 step 4, plan §6); nothing plays it before the lift"
    );
  }
  return `${id} waits on petition ${def.waitsOn} (the late block's rolled tick on shape L): the late block on shape L is refused until its doc text is in contracts (ADR-089 step 3, plan §3.4, §5.1); dropped if ${def.waitsOn} is declined`;
}

/** Step 4's definition of a D arm (built or not), or `undefined` for any other id. */
export function step4ArmDef(id: ArmId): ArmDef | undefined {
  return STEP4_ARM_DEFS.find((d) => d.id === id);
}

let table: { readonly arms: ReadonlyMap<ArmId, Arm>; readonly proofs: ReadonlyMap<ProofOverlayId, Arm>; readonly byDigest: ReadonlyMap<string, readonly Arm[]> } | undefined;

function armTable(): NonNullable<typeof table> {
  if (table !== undefined) return table;
  const arms = new Map<ArmId, Arm>();
  for (const def of [...ARM_DEFS, ...STEP2_ARM_DEFS, ...STEP3_ARM_DEFS, ...STEP4_ARM_DEFS]) {
    if (armRefusal(def.id) !== undefined) continue;
    arms.set(def.id, build(def));
  }
  const proofs = new Map<ProofOverlayId, Arm>();
  for (const def of PROOF_DEFS) proofs.set(def.id, build(def));
  const byDigest = new Map<string, Arm[]>();
  for (const arm of [...arms.values(), ...proofs.values()]) {
    const seen = [...arms.values(), ...proofs.values()].find((a) => a !== arm && a.digest === arm.digest && a.rules === arm.rules);
    if (seen !== undefined) throw new Error(`arms: ${arm.id} and ${seen.id} have the same rules ${arm.rules} and the same dials ${arm.digest}; every arm is distinct by (rules name, dials) (O28 as amended at step 5)`);
    if (arm.overlayDigest !== undefined) byDigest.set(arm.overlayDigest, [...(byDigest.get(arm.overlayDigest) ?? []), arm]);
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

/** Step 3's arms this build builds, C1 to C16 in order, less any refused (none since P17, E4b). */
export function step3Arms(): readonly Arm[] {
  return STEP3_ARM_IDS.filter((id) => armRefusal(id) === undefined).map((id) => armById(id));
}

/**
 * Every arm this build builds, step 1's 17, step 2's 7, then step 3's 16 (C14 included since P17,
 * E4b), then step 4's 17 once P6, P7 and P8 are in contracts (none before), each in its table's
 * order.
 */
export function everyArm(): readonly Arm[] {
  return DEFINED_ARM_IDS.filter((id) => armRefusal(id) === undefined).map((id) => armById(id));
}

/**
 * The arm of `id`. Refused: an id of no arm, an arm whose petition is not in contracts
 * (`armRefusal`), and a step-5 id, which this build names but does not define (`step5ArmRefusal`).
 */
export function armById(id: ArmId): Arm {
  const arm = armTable().arms.get(id) ?? ((isStep5aArmId(id) || isStep5bArmId(id)) && step5ArmRefusal(id) === undefined ? step5Table().arms.get(id) : undefined);
  if (arm === undefined) {
    const inert = step5ArmRefusal(id);
    if (inert !== undefined) throw new Error(`arms: ${inert}: nothing plays it`);
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
 * The arm (or proof overlay) whose dials a stream's `PLAY_START.rules` names (N9), step 1's to step
 * 5's alike. O28 as amended at step 5: an arm is distinct by (rules name, dials), so the lookup is by
 * both; F0 (the winner's dials restamped `pocket-1.s5b`, `restampOf`) shares its grid arm's dials
 * under another name. With `rules` left out (a reader of steps 1 to 4, whose arms' dials are distinct
 * on their own), the one arm with those dials; refused if two carry them. Refused: dials no arm of
 * this build carries, since nobody could rebuild that stream's margins.
 */
export function armOfDigest(overlayDigest: string, rules?: StampedRules): Arm {
  const pick = (m: ReadonlyMap<string, readonly Arm[]>): readonly Arm[] => (m.get(overlayDigest) ?? []).filter((a) => rules === undefined || a.rules === rules);
  // Steps 1 to 4's table first, so a reader of their streams never builds step 5's.
  const early = rules !== undefined && isStep5Rules(rules) ? [] : pick(armTable().byDigest);
  const found = early.length > 0 ? early : pick(step5Table().byDigest);
  if (found.length === 0) {
    throw new EngineRulesError(
      `a stream stamped with overlay ${overlayDigest}${rules === undefined ? "" : ` under ${rules}`}, which no step-1 arm of this build carries, nor any step-2, step-3, step-4 or step-5 arm: its dials cannot be named (N9)`,
    );
  }
  if (found.length > 1) throw new EngineRulesError(`overlay ${overlayDigest} is carried by ${found.map((a) => `${a.id} (${a.rules})`).join(" and ")}: name the rules as well (O28 as amended at step 5)`);
  return found[0]!;
}

/**
 * An arm's mechanisms, for the exclusive affected-play counts against its base (ADR-089:927). Step
 * 2's four are appended after step 1's eight, which keep their order (C3-13): `MUST_ACT` (the
 * forcing rule PER_RUSHER), `HALF`, `FOLLOWS` (the two leaves) and `COUNTER_LESS_SEEN` (the
 * narrower counter rule). Step 3's five follow: `FREE_RUN` (a free-run block, whatever its reading,
 * origins or hold), `LATE_BLOCK`, `CLIMB_FRONT`, `MUG_HEAD_ONLY` (a free-run block drawing the
 * Head-only picture) and `BAND_EDGES` (C15's patch set). Step 4's two follow: `CONTACT` (a contact
 * block, whatever its tilts, b or second arrival) and `MOTION` (a throwing motion, whatever its
 * reading).
 */
export const MECHANISMS = [
  "S", "WINDOW", "L", "HEELS", "PAST_ONLY", "HOLD", "HORIZONS", "LATE", "MUST_ACT", "HALF", "FOLLOWS", "COUNTER_LESS_SEEN",
  "FREE_RUN", "LATE_BLOCK", "CLIMB_FRONT", "MUG_HEAD_ONLY", "BAND_EDGES",
  "CONTACT", "MOTION",
] as const;
export type Mechanism = (typeof MECHANISMS)[number];

/** The mechanism a forcing rule is. */
const FORCING_MECHANISM: Readonly<Record<ForcingRule, Mechanism>> = Object.freeze({ PER_RUSHER: "MUST_ACT", COUNTER_LESS_SEEN: "COUNTER_LESS_SEEN" });

/**
 * An arm's mechanisms: its clock, its patch sets in order, then its forcing rule (step 2), then its
 * step-3 blocks (the free-run block, the Head-only picture, the late block, the climb lane rule),
 * then its step-4 blocks (the contact block, the motion).
 */
export function mechanismsOf(arm: Pick<ArmDef, "clock" | "patchSets" | "forcing" | "step3" | "step4">): readonly Mechanism[] {
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
  if (arm.step4?.contact !== undefined) out.push("CONTACT");
  if (arm.step4?.motion !== undefined) out.push("MOTION");
  return out;
}

/** The mechanisms an arm has and its base does not (all of them for an arm with no base). */
export function exclusiveMechanisms(arm: Pick<ArmDef, "clock" | "patchSets" | "base" | "forcing" | "step3" | "step4">): readonly Mechanism[] {
  const own = mechanismsOf(arm);
  if (arm.base === undefined) return own;
  const base = new Set(mechanismsOf(step4ArmDef(arm.base) ?? armById(arm.base)));
  return own.filter((m) => !base.has(m));
}

// --- step 5's arms (plan §5.1, §5.2; AM-8, AM-9, AM-10) ---------------------------------------------

/** A grid point of the 5b block clock: S at theta (k 2, beta 0.5, the push window) or L at R. */
export type Step5Grid = { readonly shape: "S"; readonly theta: number } | { readonly shape: "L"; readonly R: number };

/**
 * How a step-5 arm's tunables are built (plan §5.1, §5.2):
 *  - `bench`: the clean bench (`cleanBenchTunablesS5`) with `parts` (none: step 4's bench, stamped
 *    `pocket-1.s4`) and today's or the fitted deltas;
 *  - `league`: `step5Bundle` with the fitted deltas, on `pocket-1.s5a`'s overlay at a grid point, or
 *    at the selection's winner (`"selection"`), stamped `rules`; `extra` adds C15's band edges (G1)
 *    or C11's reading (c) (G2).
 */
export type Step5Recipe =
  | { readonly kind: "bench"; readonly parts?: CleanBenchParts; readonly fitted: boolean }
  | { readonly kind: "league"; readonly at: Step5Grid | "selection"; readonly rules: Step5Rules; readonly extra?: "BAND_EDGES" | "READING_C" };

export interface Step5ArmDef extends Omit<ArmDef, "id" | "rules"> {
  readonly id: Step5aArmId | Step5bArmId;
  readonly rules: OverlayRules | Step5Rules;
  readonly step5: Step5Recipe;
}

/**
 * The records the step-5 arms wait on: the fit's deltas (offsets from today's, `POCKET_1_S5A_LEAVES`)
 * and the selection's winner (its grid point and the F arm it restamps, `POCKET_1_S5B_OVERLAY`).
 */
export interface Step5Records {
  readonly fitted?: ReadSystemOffsets;
  readonly selection?: { readonly at: Step5Grid; readonly restampOf: Step5bArmId };
}

/** The F arm at each grid point: F1 to F9 S theta 7 to 15, F10 to F14 L R 4 to 8. */
export const STEP5_GRID: Readonly<Record<string, Step5Grid>> = Object.freeze({
  F1: { shape: "S", theta: 7 }, F2: { shape: "S", theta: 8 }, F3: { shape: "S", theta: 9 }, F4: { shape: "S", theta: 10 }, F5: { shape: "S", theta: 11 },
  F6: { shape: "S", theta: 12 }, F7: { shape: "S", theta: 13 }, F8: { shape: "S", theta: 14 }, F9: { shape: "S", theta: 15 },
  F10: { shape: "L", R: 4 }, F11: { shape: "L", R: 5 }, F12: { shape: "L", R: 6 }, F13: { shape: "L", R: 7 }, F14: { shape: "L", R: 8 },
});

/** The F arm at a grid point. */
export function gridArmOf(at: Step5Grid): Step5bArmId {
  const hit = Object.entries(STEP5_GRID).find(([, g]) => (g.shape === "S" && at.shape === "S" ? g.theta === at.theta : g.shape === "L" && at.shape === "L" ? g.R === at.R : false));
  if (hit === undefined) throw new RangeError(`arms: ${JSON.stringify(at)} is not a 5b grid point`);
  return hit[0] as Step5bArmId;
}

/** The offsets a set of read-system leaf patches makes (proposed less current), 0 for a system with none. */
export function offsetsOfLeaves(leaves: readonly TunablePatch[]): ReadSystemOffsets {
  const out: Record<string, number> = { HALF_FIELD: 0, FULL_FIELD: 0, CONCEPT: 0 };
  for (const l of leaves) {
    const m = /^qb\.readSystem\.(HALF_FIELD|FULL_FIELD|CONCEPT)\.budgetDeltaSeconds$/.exec(l.tunableId);
    if (m === null) throw new EngineRulesError(`arms: ${l.tunableId} is not one of the fit's three dials`);
    out[m[1]!] = Number(l.proposedValue) - Number(l.currentValue);
  }
  return out as ReadSystemOffsets;
}

/** The grid point a step-5 overlay's block clock is at. */
export function gridOfOverlay(o: PocketOverlay): Step5Grid {
  if (o.beatClock !== undefined) return { shape: "S", theta: o.beatClock.thetaSeconds };
  if (o.repClock !== undefined) return { shape: "L", R: o.repClock.fullExpressionSeconds };
  throw new EngineRulesError("arms: a step-5 overlay with no block clock");
}

/** This build's recorded step-5 literals as the arms read them (none until the fit and the selection commits). */
export function recordedStep5(): Step5Records {
  const fitted = POCKET_1_S5A_LEAVES === undefined ? undefined : offsetsOfLeaves(POCKET_1_S5A_LEAVES);
  if (fitted === undefined || POCKET_1_S5B_OVERLAY === undefined) return fitted === undefined ? {} : { fitted };
  const at = gridOfOverlay(POCKET_1_S5B_OVERLAY);
  return { fitted, selection: { at, restampOf: gridArmOf(at) } };
}

/** The bench parts of E2 to E8 and E9, E10 (plan §5.1's table). */
const EP = (on: readonly CleanBenchPart[], resetSeconds?: number): CleanBenchParts => ({ on, ...(resetSeconds === undefined ? {} : { resetSeconds }) });
const CHECKLIST: readonly CleanBenchPart[] = ["d23", "move", "bump", "breakOut", "d23OnRun"];
const S5A_GRADED = ["s5a.cleanScramble", "s5a.completion", "s5a.int"] as const;
const S5A_REPORTED = ["s5a.release", "s5a.under1", "s5a.over35", "s5a.cleanOuts", "s5a.checkdown", "s5a.laterRead", "s5a.nobodyOpen", "s5a.removedClass", "s5a.cleanThrowaway", "s5a.intLeague"] as const;
const S5B_GRADED = ["s5b.sack", "s5b.hitOrSack", "s5b.release", "s5b.clockExpired", "s5b.pressure", "mr.bin20.raw", "mr.unblockedPressures", "mr.unblockedShare"] as const;
const S5B_REPORTED = ["s5b.binsTwiceFtn", "s5b.quick", "s5b.standIn", "mr.unblockedMen"] as const;

/** Every step-5 arm's shared league settings: step 4's design (S with the window, Half and Follows, must act per rusher, step 3's and step 4's blocks). */
const S5_COMMON = { clock: S(true), patchSets: ["HALF", "FOLLOWS"] as PatchSetName[], forcing: "PER_RUSHER" as ForcingRule, step3: S3_BLOCKS, step4: S4_BLOCKS, seedSet: 1 as SeedSet, pricing: false };

const bench = (id: Step5aArmId, what: string, role: string, rules: OverlayRules | Step5Rules, parts: CleanBenchParts | undefined, fitted: boolean, base: ArmId | undefined, graded: readonly string[] = [], reported: readonly string[] = []): Step5ArmDef => ({
  ...S5_COMMON, id, what, role, rules, ...(base === undefined ? {} : { base }), graded: [...graded], reported: [...reported], step5: { kind: "bench", ...(parts === undefined ? {} : { parts }), fitted },
});
const grid = (id: Step5bArmId): Step5ArmDef => {
  const at = STEP5_GRID[id]!;
  const where = at.shape === "S" ? `S theta ${String(at.theta)}` : `L R ${String(at.R)}`;
  return {
    ...S5_COMMON, ...(at.shape === "L" ? { clock: L(at.R) } : {}), id, rules: POCKET_1_S5A_RULES,
    what: id === "F5" ? `pocket-1.s5a itself (${where})` : `pocket-1.s5a at ${where}`,
    role: "a 5b grid point (the first pass)", base: id === "F5" ? "D1" : "F5", graded: id === "F5" ? [...GUARD] : [], reported: [],
    step5: { kind: "league", at, rules: POCKET_1_S5A_RULES },
  };
};

/**
 * Step 5's arms (plan §5.1, §5.2), row by row. E0 to E10 on the clean bench (both leagues, both seed
 * sets); F1 to F14 the 5b grid on the league; F0 the winner restamped `pocket-1.s5b`; G1 and G2 F0
 * with C15's band edges and with C11's reading (c). `base` is AM-8's map where it names one (E9 on
 * E0, F5 on D1, F0 on F5) and otherwise the arm each alone arm is priced against (plan §5.1's role
 * column). Built by `buildStep5Arm`, never by `build`; refused by name while its record is out
 * (`step5ArmRefusal`).
 */
export const STEP5_ARM_DEFS: readonly Step5ArmDef[] = deepFreeze([
  bench("E0", "step 4's build on the clean bench (cleanBenchTunablesS4)", "base; guard base; played fresh and twice", POCKET_1_S4_RULES, undefined, false, undefined),
  bench("E1", "the fitted deltas alone (pocket-1.s4 with leaf patches)", "the count alone", POCKET_1_S4_RULES, undefined, true, "E0"),
  bench("E2", "the drop floor alone", "the floor alone", POCKET_1_S5A_RULES, EP(["floor"]), false, "E0"),
  bench("E3", "D23 alone", "item b alone", POCKET_1_S5A_RULES, EP(["d23"]), false, "E0"),
  bench("E4", "the clean move alone (climb, restart, reset 1.0), no bump", "item d alone", POCKET_1_S5A_RULES, EP(["move"]), false, "E0"),
  bench("E5", "E4 with the bump", "the bump's price (E5 - E4)", POCKET_1_S5A_RULES, EP(["move", "bump"]), false, "E4"),
  bench("E6", "the break-out with D23 on the run; D23 in the pocket off", "item e alone", POCKET_1_S5A_RULES, EP(["breakOut", "d23OnRun"]), false, "E0"),
  bench("E7", "the checklist joint, today's deltas, no floor", "checklist joint", POCKET_1_S5A_RULES, EP(CHECKLIST), false, "E0"),
  bench("E8", "E7 with the floor", "the fit's base build", POCKET_1_S5A_RULES, EP(CLEAN_BENCH_PARTS), false, "E7"),
  bench("E9", "E8 with the fitted deltas: pocket-1.s5a on the bench", "graded; guard pair with E0", POCKET_1_S5A_RULES, EP(CLEAN_BENCH_PARTS), true, "E0", [...S5A_GRADED, ...GUARD], S5A_REPORTED),
  bench("E10", "E9 with no reset (resetSeconds 0)", "the reset alone (D33)", POCKET_1_S5A_RULES, EP(CLEAN_BENCH_PARTS, 0), true, "E9", [], ["s5a.reset"]),
  {
    ...S5_COMMON, id: "F0", rules: POCKET_1_S5B_RULES, what: "the selection's winner restamped pocket-1.s5b (b 5)", role: "graded (AM-10 s5b.arm)",
    base: "F5", graded: [...S5B_GRADED, ...GUARD], reported: [...S5B_REPORTED], step5: { kind: "league", at: "selection", rules: POCKET_1_S5B_RULES },
  },
  ...(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14"] as const).map(grid),
  {
    ...S5_COMMON, id: "G1", rules: POCKET_1_S5B_RULES, patchSets: ["HALF", "FOLLOWS", "BAND_EDGES"], what: "F0 with C15's band edges", role: "information, prices the miss rule's option A; never graded",
    base: "F0", graded: [], reported: [], step5: { kind: "league", at: "selection", rules: POCKET_1_S5B_RULES, extra: "BAND_EDGES" },
  },
  {
    ...S5_COMMON, id: "G2", rules: POCKET_1_S5B_RULES, step3: { freeRun: freeRunWith({ reading: "C" }), climbLane: POCKET_1_S3_CLIMB_LANE }, what: "F0 with C11's reading (c)",
    role: "information, prices the miss rule's option C; never graded", base: "F0", graded: [], reported: [], step5: { kind: "league", at: "selection", rules: POCKET_1_S5B_RULES, extra: "READING_C" },
  },
] satisfies readonly Step5ArmDef[]);

/** Step 5's definition of an arm (built or not), or `undefined` for any other id. */
export function step5ArmDef(id: ArmId): Step5ArmDef | undefined {
  return STEP5_ARM_DEFS.find((d) => d.id === id);
}

/** The block clock's overlay at a grid point (`step5OverlayAt`; at S theta 11 it is `POCKET_1_S5A_OVERLAY`'s value). */
export function step5OverlayOfGrid(at: Step5Grid): PocketOverlay {
  if (at.shape === "S") return step5OverlayAt({ beatClock: { ...POCKET_1_S5A_OVERLAY.beatClock!, thetaSeconds: at.theta } });
  return step5OverlayAt({ repClock: { fullExpressionSeconds: at.R } });
}

/**
 * Builds one step-5 arm from its definition and the records it waits on (plan §5): a bench arm by
 * `cleanBenchTunablesS5`, a league arm by `step5Bundle` with the fitted deltas as leaves on the base;
 * checked by `checkStamp` under its own rules name. Refused (by `step5ArmRefusal`'s message) when a
 * record it needs is not given. Exported as a test seam: a test builds the whole step-5 table with a
 * fit and a selection of its own (`step5ArmsWith`); the build reads its recorded literals.
 */
export function buildStep5Arm(def: Step5ArmDef, records: Step5Records): Arm {
  const refusal = step5ArmRefusal(def.id, records);
  if (refusal !== undefined) throw new Error(`arms: ${refusal}: nothing plays it`);
  const r = def.step5;
  const offsets = records.fitted ?? { HALF_FIELD: 0, FULL_FIELD: 0, CONCEPT: 0 };
  let tunables: Tunables;
  let patches: readonly TunablePatch[];
  if (r.kind === "bench") {
    const used = r.fitted ? offsets : { HALF_FIELD: 0, FULL_FIELD: 0, CONCEPT: 0 };
    tunables = cleanBenchTunablesS5(r.parts, used);
    patches = readSystemDeltaLeaves(used, POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES));
  } else {
    const at = r.at === "selection" ? records.selection!.at : r.at;
    let overlay = step5OverlayOfGrid(at);
    if (r.extra === "READING_C") {
      const freeRun = def.step3?.freeRun;
      if (freeRun === undefined || def.step3?.lateBlock !== undefined) throw new EngineRulesError(`arm ${def.id}: reading (c) carries the free-run block and no late block`);
      overlay = deepFreeze({ ...overlay, blitzPickup: { freeRun } });
    }
    const leaves = [...readSystemDeltaLeaves(offsets), ...(r.extra === "BAND_EDGES" ? BAND_EDGES : [])];
    tunables = step5Bundle(r.rules, leaves, overlay);
    patches = leaves;
  }
  checkStamp(tunables, def.rules, `arm ${def.id}`);
  const digest = overlayDigestOf(tunables);
  const stamped = tunables.engineRules?.overlayDigest;
  return Object.freeze({
    ...def,
    tunables,
    digest,
    ...(stamped === undefined ? {} : { overlayDigest: stamped }),
    tunablesDigest: stableDigest(tunables),
    patches: Object.freeze([...patches]),
  });
}

/**
 * The step-5 arms `records` define, in `STEP5_ARM_DEFS`' order, checked under O28 as amended at step
 * 5: distinct by (rules name, dials) among themselves and against `others` (steps 1 to 4's), and F0's
 * dials equal its grid arm's (`restampOf`, R-9), the one pair that shares dials. A test seam
 * (`step5ArmsWith`); the build's table is `step5Table()`.
 */
export function step5ArmsWith(records: Step5Records, others: readonly Arm[] = []): { readonly arms: ReadonlyMap<ArmId, Arm>; readonly byDigest: ReadonlyMap<string, readonly Arm[]>; readonly restampOf?: Step5bArmId } {
  const arms = new Map<ArmId, Arm>();
  for (const def of STEP5_ARM_DEFS) if (step5ArmRefusal(def.id, records) === undefined) arms.set(def.id, buildStep5Arm(def, records));
  const all = [...others, ...arms.values()];
  for (const arm of arms.values()) {
    const seen = all.find((a) => a !== arm && a.digest === arm.digest && a.rules === arm.rules);
    if (seen !== undefined) throw new Error(`arms: ${arm.id} and ${seen.id} have the same rules ${arm.rules} and the same dials ${arm.digest}; every arm is distinct by (rules name, dials) (O28 as amended at step 5)`);
  }
  const restampOf = records.selection?.restampOf;
  const f0 = arms.get("F0");
  if (f0 !== undefined && restampOf !== undefined) {
    const grid = arms.get(restampOf);
    if (grid === undefined || grid.digest !== f0.digest) throw new Error(`arms: F0 restamps ${restampOf}, but its dials ${f0.digest} are not ${restampOf}'s ${String(grid?.digest)} (R-9)`);
  }
  const byDigest = new Map<string, Arm[]>();
  for (const arm of arms.values()) if (arm.overlayDigest !== undefined) byDigest.set(arm.overlayDigest, [...(byDigest.get(arm.overlayDigest) ?? []), arm]);
  return { arms, byDigest, ...(restampOf === undefined ? {} : { restampOf }) };
}

let fiveTable: ReturnType<typeof step5ArmsWith> | undefined;

/** This build's step-5 arms (E0 to E10 and F1 to F14 since the fit is recorded; F0, G1 and G2 wait on the selection), built once. */
function step5Table(): ReturnType<typeof step5ArmsWith> {
  if (fiveTable !== undefined) return fiveTable;
  const t = armTable();
  fiveTable = step5ArmsWith(recordedStep5(), [...t.arms.values(), ...t.proofs.values()]);
  return fiveTable;
}

/** The grid arm F0 restamps (R-9), once the selection is recorded. */
export function restampOf(id: ArmId): ArmId | undefined {
  return id === "F0" ? step5Table().restampOf : undefined;
}

/** The step-5 arms this build defines, in `STEP5_ARM_DEFS`' order. */
export function step5Arms(): readonly Arm[] {
  return [...step5Table().arms.values()];
}
