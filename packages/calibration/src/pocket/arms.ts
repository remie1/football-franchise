/**
 * THE STEP-1 ARMS (ADR-089 step 1; plan §7.2 item 2, §9.3; readings O23 to O28, O32, O33).
 *
 * Step 1 builds both block clocks behind the switch and prices them on the flat league's 496 games
 * and the generated league's 272, at caller v7 (`ADR:941`, §6.1). This module is the arm table: what
 * each arm plays, on which seed set, against which base, and which filed clauses it carries. It
 * plays nothing; `step1.ts` plays the arms.
 *
 *  - **The patch sets** change existing leaves of `DEFAULT_TUNABLES` through `applyTunablePatch`
 *    (which refuses an unknown path or a stale value): `HOLD`, Appendix B's stand-in hold (budget
 *    +2.0 s, every route +1.0 s; the pricing arms, `ADR:925`); `HEELS` and `PAST_ONLY`, revision 1's
 *    Heels and Past-only tunables (§4.2, reading O24); `LATE`, revision 1's late free rushers
 *    (pickups +2.5 s, loopers +2.0 s) and `HORIZONS`, its COLLAPSING 0.5 s and PRESSURE 1.0 s
 *    horizons, which with `HOLD` and `HEELS` are revision 1's S late setting (O27, `ADR:1686`, `:1963`).
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
  POCKET_1_S1_OVERLAY,
  POCKET_1_S1_RULES,
  checkStamp,
  overlayDigestOf,
  rulesTunables,
  withOverlay,
  type EngineRules,
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

export const PATCH_SET_NAMES = ["HOLD", "HEELS", "PAST_ONLY", "LATE", "HORIZONS"] as const;
export type PatchSetName = (typeof PATCH_SET_NAMES)[number];

export const PATCH_SETS: Readonly<Record<PatchSetName, readonly TunablePatch[]>> = Object.freeze({ HOLD, HEELS, PAST_ONLY, LATE, HORIZONS });

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

// --- the arm table (§9.3) ------------------------------------------------------------------------

export const ARM_IDS = ["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15", "A0b"] as const;
export type ArmId = (typeof ARM_IDS)[number];

export function isArmId(id: string): id is ArmId {
  return (ARM_IDS as readonly string[]).includes(id);
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

// --- the built arms --------------------------------------------------------------------------------

/** An arm (or a proof overlay) with its tunables built. Plain data and frozen tunables. */
export interface Arm extends Omit<ArmDef, "id"> {
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

function build(def: Omit<ArmDef, "id"> & { readonly id: ArmId | ProofOverlayId }): Arm {
  const patches = def.patchSets.flatMap((name) => PATCH_SETS[name]);
  const overlay = overlayOf(def.clock);
  let tunables: Tunables;
  let rules: EngineRules;
  if (overlay === undefined) {
    rules = LEGACY_RULES;
    tunables = patches.length === 0 ? DEFAULT_TUNABLES : deepFreeze(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES));
  } else {
    rules = POCKET_1_S1_RULES;
    // The design bundle is the one rules.ts builds and checks against POCKET_1_S1_DIGEST.
    tunables =
      patches.length === 0 && overlay === S_WINDOW_OVERLAY
        ? rulesTunables(POCKET_1_S1_RULES)
        : withOverlay(patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), POCKET_1_S1_RULES, overlay);
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

let table: { readonly arms: ReadonlyMap<ArmId, Arm>; readonly proofs: ReadonlyMap<ProofOverlayId, Arm>; readonly byDigest: ReadonlyMap<string, Arm> } | undefined;

function armTable(): NonNullable<typeof table> {
  if (table !== undefined) return table;
  const arms = new Map<ArmId, Arm>();
  for (const def of ARM_DEFS) arms.set(def.id, build(def));
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

/** Every arm of §9.3, in the table's order. */
export function allArms(): readonly Arm[] {
  return ARM_IDS.map((id) => armById(id));
}

export function armById(id: ArmId): Arm {
  const arm = armTable().arms.get(id);
  if (arm === undefined) throw new Error(`arms: no arm ${id}`);
  return arm;
}

/** S-5's proof overlays, L4 and L6. */
export function proofOverlay(id: ProofOverlayId): Arm {
  const arm = armTable().proofs.get(id);
  if (arm === undefined) throw new Error(`arms: no proof overlay ${id}`);
  return arm;
}

/**
 * The arm (or proof overlay) whose dials a stream's `PLAY_START.rules.overlayDigest` names (N9).
 * Refused: a digest no arm of this build carries, since nobody could rebuild that stream's margins.
 */
export function armOfDigest(overlayDigest: string): Arm {
  const arm = armTable().byDigest.get(overlayDigest);
  if (arm === undefined) {
    throw new EngineRulesError(`a stream stamped with overlay ${overlayDigest}, which no step-1 arm of this build carries: its dials cannot be named (N9)`);
  }
  return arm;
}

/** An arm's mechanisms, for the exclusive affected-play counts against its base (ADR-089:927). */
export const MECHANISMS = ["S", "WINDOW", "L", "HEELS", "PAST_ONLY", "HOLD", "HORIZONS", "LATE"] as const;
export type Mechanism = (typeof MECHANISMS)[number];

export function mechanismsOf(arm: Pick<ArmDef, "clock" | "patchSets">): readonly Mechanism[] {
  const out: Mechanism[] = [];
  if (arm.clock.kind === "S") {
    out.push("S");
    if (arm.clock.window) out.push("WINDOW");
  }
  if (arm.clock.kind === "L") out.push("L");
  for (const name of arm.patchSets) out.push(name);
  return out;
}

/** The mechanisms an arm has and its base does not (all of them for an arm with no base). */
export function exclusiveMechanisms(arm: Pick<ArmDef, "clock" | "patchSets" | "base">): readonly Mechanism[] {
  const own = mechanismsOf(arm);
  if (arm.base === undefined) return own;
  const base = new Set(mechanismsOf(armById(arm.base)));
  return own.filter((m) => !base.has(m));
}
