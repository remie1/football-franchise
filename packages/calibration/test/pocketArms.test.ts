/**
 * ADR-089 step 1 — THE ARMS (`src/pocket/arms.ts`; plan §7.2 items 2 and 11, §9.3; readings O23 to
 * O28, O32, O33; N7, N9).
 *
 *  1. Every patch of every patch set applies to `DEFAULT_TUNABLES` (from its filed current value to
 *     its proposed value), and only the leaves it names move.
 *  2. The design overlay's two 1-14 ranges (the push window and the approach card) agree, and the
 *     overlays are the design's dials (theta 11, k 2, beta 0.5; R 5 and 8; the proof overlays R 4, 6).
 *  3. The table is §9.3's: 17 arms, A0 to A15 and A0b; the bases (O32); A15 and A0b on seed set 2;
 *     the pricing arms labelled; every graded or reported clause id is one the filing holds.
 *  4. Every arm's digest is stable (the same on a rebuild and pinned for A0 and A1) and distinct
 *     from every other arm's and proof overlay's (O28); a stamped arm's stamp is its digest.
 *  5. `armOfDigest` maps every stamped arm and both proof overlays, and refuses an unknown digest (N9).
 *  6. Every arm's tunables are frozen at every depth (N7); a legacy arm carries no stamp and no block.
 *
 * Step 2 (plan §4.1, §4.2; AM-1's base map), in the describes after these, which are step 1's and
 * unchanged:
 *  7. `HALF` and `FOLLOWS` are `rules.ts`'s `POCKET_1_S2_LEAVES`, split, appended after step 1's
 *     patch sets; together they are `HORIZONS`' leaves and values, and `HORIZONS` is as it was.
 *  8. The per-step lists: step 1's 17 unchanged; B1 to B7; step 2's run list A0, A14, A1, A5, A11,
 *     B1 to B7; `--arms` per step.
 *  9. The step-2 table is plan §4.1's, row by row; each base is AM-1's filed map and the previous
 *     step's arm with the same settings except this step's mechanisms; the clauses are the filing's.
 * 10. Every B arm is stamped `pocket-1.s2` at its own digest, B3 is the bundle itself, B5 is A5 plus
 *     the horizons (pkA's A123); the forcing key is present exactly on B1, B3, B4 and B6.
 * 11. The 26 digests of the union are distinct and `armOfDigest` maps every stamped one.
 * 12. The mechanisms: step 2's four appended, and each B arm's exclusive set against its base.
 *
 * Step 3 (plan §5.1, §4.2; AM-2's references), in the last describes:
 * 13. C1 to C16 and step 3's run list (the bases A0, A14, A1, A11, B3, B6, B5, then the C arms) are
 *     arms of this build: `isAnyArmId` and `isRunIdOf(3, ...)` take them, `isArmId` and step 1's and
 *     step 2's run lists do not; `ALL_ARM_IDS` gains them after step 2's, and step 1's and step 2's
 *     lists are unchanged.
 * 14. The table is plan §5.1's, row by row: clock, patches, forcing, rules, base, each arm's step-3
 *     blocks (reading, origins, hold, picture, late block, climb lane), the graded and reported
 *     clauses (the filing's step-3 rows, every one carried); the held references are AM-2's, read
 *     back out of the committed text.
 * 15. Every C arm but C13 is stamped `pocket-1.s3` at its own digest and C1 is the bundle itself at
 *     `POCKET_1_S3_DIGEST`; C13 is B3 plus `LATE` stamped `pocket-1.s2`; C15 is C1 plus
 *     `BAND_EDGES`; each is its patches, clock and blocks built afresh; each moves only its own
 *     leaves against its base; the digests of the whole union are distinct and `armOfDigest` maps
 *     every stamped one.
 * 16. C14 is defined and refused while P17 is out: the table does not build it, `armById` refuses it
 *     by name, `armRefusal` says why, and its definition really is refused by `withOverlay`.
 * 17. The mechanisms: step 3's five appended; each C arm's exclusive set against its base.
 * 18. AM-3's base map (C1 on B3, C2 on B6, C11 on B3) on a stand-in entry names arms of this build;
 *     an id past C16 does not. The committed amendments file is read, never written; `pocket
 *     --step 3` (K4) refuses C14 with `armRefusal`'s reason.
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { stableDigest } from "../src/harness/digest.js";
import { readFileSync } from "node:fs";
import { amendmentsProblems, AMENDMENTS_PATH, guardFor, loadAmendments } from "../src/pocket/amendments.js";
import {
  ALL_ARM_IDS,
  allArms,
  ARM_DEFS,
  ARM_IDS,
  armById,
  armOfDigest,
  buildArm,
  everyArm,
  exclusiveMechanisms,
  FOLLOWS,
  HALF,
  HEELS,
  HOLD,
  HORIZONS,
  isAnyArmId,
  isArmId,
  isRunIdOf,
  isStep2ArmId,
  isStep3ArmId,
  LATE,
  lOverlay,
  MECHANISMS,
  mechanismsOf,
  PAST_ONLY,
  PATCH_SET_NAMES,
  PATCH_SETS,
  PROOF_OVERLAY_IDS,
  proofOverlay,
  runIdsOf,
  S_OVERLAY,
  S_WINDOW_OVERLAY,
  STEP1_RUN_IDS,
  STEP2_ARM_DEFS,
  STEP2_ARM_IDS,
  STEP2_BASES,
  STEP2_RUN_IDS,
  step2Arms,
  STEP3_ARM_DEFS,
  STEP3_ARM_IDS,
  STEP3_RUN_IDS,
  step3Arms,
  AM2_REFERENCES,
  armRefusal,
  BAND_EDGE_SHIFT,
  BAND_EDGES,
  OTHER_PICTURE,
  type ArmDef,
  type ArmId,
  type ArmStep,
} from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { loadFiled } from "../src/pocket/filed.js";
import { parsePocketArgs } from "../src/pocket/step0.js";
import {
  EngineRulesError,
  overlayDigestOf,
  POCKET_1_S1_DIGEST,
  POCKET_1_S1_RULES,
  POCKET_1_S2_DIGEST,
  POCKET_1_S2_RULES,
  POCKET_1_S2_LEAVES,
  POCKET_1_S3_CLIMB_LANE,
  POCKET_1_S3_DIGEST,
  POCKET_1_S3_FREE_RUN,
  POCKET_1_S3_LATE_BLOCK,
  POCKET_1_S3_OVERLAY,
  rulesTunables,
  withOverlay,
} from "../src/pocket/rules.js";

/** The value at a dotted tunable path (numeric segments index arrays). */
function leafAt(root: unknown, path: string): unknown {
  let node: unknown = root;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/** Every leaf of a tree, by dotted path. */
function leaves(value: unknown, path = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (typeof value !== "object" || value === null) {
    out.set(path, value);
    return out;
  }
  for (const [k, v] of Object.entries(value)) for (const [p, x] of leaves(v, path === "" ? k : `${path}.${k}`)) out.set(p, x);
  return out;
}

function nodes(value: unknown, path = "$"): [string, object][] {
  if (typeof value !== "object" || value === null) return [];
  return [[path, value], ...Object.entries(value).flatMap(([k, v]) => nodes(v, `${path}.${k}`))];
}

describe("the patch sets (§7.2 item 2)", () => {
  it("each patch applies to DEFAULT_TUNABLES, from its filed current value to its proposed value", () => {
    for (const name of PATCH_SET_NAMES) {
      for (const p of PATCH_SETS[name]) {
        expect(leafAt(DEFAULT_TUNABLES, p.tunableId), `${name} ${p.tunableId} now`).toBe(p.currentValue);
        const patched = applyTunablePatch(DEFAULT_TUNABLES, p);
        expect(leafAt(patched, p.tunableId), `${name} ${p.tunableId} patched`).toBe(p.proposedValue);
      }
    }
  });

  it("moves only the leaves it names", () => {
    const base = leaves(DEFAULT_TUNABLES);
    for (const name of PATCH_SET_NAMES) {
      const set = PATCH_SETS[name];
      const after = leaves(set.reduce(applyTunablePatch, DEFAULT_TUNABLES));
      const moved = [...after].filter(([p, v]) => base.get(p) !== v).map(([p]) => p).sort();
      expect(moved, name).toEqual(set.map((p) => p.tunableId).sort());
    }
  });

  it("holds the plan's values: the hold, Heels, Past only, the late free rushers and the horizons", () => {
    const pairs = (set: typeof HOLD) => set.map((p) => [p.tunableId, p.currentValue, p.proposedValue]);
    expect(pairs(HOLD)).toEqual([
      ["qb.timeBudget.baseSeconds", 2.5, 4.5],
      ["route.readySeconds.QUICK", 1.0, 2.0],
      ["route.readySeconds.SHORT", 1.5, 2.5],
      ["route.readySeconds.INTERMEDIATE", 2.0, 3.0],
      ["route.readySeconds.DEEP", 2.5, 3.5],
    ]);
    expect(pairs(HEELS)).toEqual([
      ["pocket.minimumStatusByBand.BLOCKER_BEATEN", "PRESSURE", "CLEAN"],
      ["passRush.pressureProgressByBand.RUSHER_GAINING.delta", 1, 0],
    ]);
    expect(pairs(PAST_ONLY)).toEqual([...pairs(HEELS), ["passRush.pressureProgressByBand.BLOCKER_BEATEN.delta", 1, 0]]);
    // The bands' labels, so the indexes in the paths are the plan's RAN_THROUGH, BLOWN_UP, LATE_EXCHANGE, LOOPER_FREE.
    expect(leafAt(DEFAULT_TUNABLES, "blitzPickup.bands.2.label")).toBe("RAN_THROUGH");
    expect(leafAt(DEFAULT_TUNABLES, "blitzPickup.bands.3.label")).toBe("BLOWN_UP");
    expect(leafAt(DEFAULT_TUNABLES, "stunt.bands.2.label")).toBe("LATE_EXCHANGE");
    expect(leafAt(DEFAULT_TUNABLES, "stunt.bands.3.label")).toBe("LOOPER_FREE");
    expect(pairs(LATE)).toEqual([
      ["blitzPickup.bands.2.arrivalDelaySeconds", 0.5, 3.0],
      ["blitzPickup.bands.3.arrivalDelaySeconds", 0, 2.5],
      ["stunt.bands.2.arrivalDelaySeconds", 0.5, 2.5],
      ["stunt.bands.3.arrivalDelaySeconds", 0, 2.0],
    ]);
    expect(pairs(HORIZONS)).toEqual([
      ["arrival.collapsingWithinSeconds", 1.0, 0.5],
      ["arrival.pressureWithinSeconds", 2.0, 1.0],
    ]);
  });
});

describe("the overlays", () => {
  it("the design overlay's push window and approach card are the same 1-14 range", () => {
    const w = S_WINDOW_OVERLAY.beatClock?.pushWindow;
    const card = S_WINDOW_OVERLAY.approach;
    expect(w).toEqual({ minMargin: 1, maxMargin: 14, lengthSeconds: 1.0 });
    expect(card).toEqual({ pushMinMargin: 1, pushMaxMargin: 14 });
    expect([w?.minMargin, w?.maxMargin]).toEqual([card?.pushMinMargin, card?.pushMaxMargin]);
  });

  it("are the design's dials: S without the window, and L at R", () => {
    expect(S_OVERLAY).toEqual({ beatClock: { thetaSeconds: 11, shape: 2, ratingWeight: 0.5 }, approach: { pushMinMargin: 1, pushMaxMargin: 14 } });
    expect({ ...S_WINDOW_OVERLAY.beatClock, pushWindow: undefined }).toEqual({ ...S_OVERLAY.beatClock, pushWindow: undefined });
    expect(lOverlay(5)).toEqual({ repClock: { fullExpressionSeconds: 5 }, approach: { pushMinMargin: 1, pushMaxMargin: 14 } });
    expect(() => lOverlay(0)).toThrow(/R must be positive/);
    expect(proofOverlay("L4").tunables.passRush.repClock).toEqual({ fullExpressionSeconds: 4 });
    expect(proofOverlay("L6").tunables.passRush.repClock).toEqual({ fullExpressionSeconds: 6 });
  });
});

describe("the arm table (§9.3)", () => {
  it("has the 17 arms in order, A15 and A0b on seed set 2, and every base an arm of the table", () => {
    expect([...ARM_IDS]).toEqual(["A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A11", "A12", "A13", "A14", "A15", "A0b"]);
    expect(ARM_DEFS.map((d) => d.id)).toEqual([...ARM_IDS]);
    expect(ARM_DEFS.filter((d) => d.seedSet === 2).map((d) => d.id)).toEqual(["A15", "A0b"]);
    const bases = Object.fromEntries(ARM_DEFS.map((d) => [d.id, d.base ?? null]));
    expect(bases).toEqual({
      A0: null, A1: "A0", A2: "A0", A3: "A0", A4: "A0", A5: "A0", A6: "A0", A7: "A0", A8: "A0", A9: "A0", A10: "A0",
      A11: "A14", A12: "A14", A13: "A14", A14: null, A15: "A0b", A0b: null,
    });
    for (const d of ARM_DEFS) {
      if (d.base === undefined) continue;
      const base = armById(d.base);
      // O32: same league, same seeds, same non-clock patches (A5 to A10's Heels and Past only are
      // the mechanisms those information arms price, against A0).
      expect(base.seedSet, d.id).toBe(d.seedSet);
      expect(base.clock.kind, `${d.id}'s base runs today's clock`).toBe("LEGACY");
      if (!["A5", "A6", "A7", "A8", "A9", "A10"].includes(d.id)) expect([...d.patchSets], d.id).toEqual([...base.patchSets]);
    }
    expect(isArmId("A0b")).toBe(true);
    expect(isArmId("A16")).toBe(false);
  });

  it("labels the pricing arms and runs the clocks the table names", () => {
    expect(ARM_DEFS.filter((d) => d.pricing).map((d) => d.id)).toEqual(["A11", "A12", "A13", "A14", "A15", "A0b"]);
    for (const id of ["A11", "A12", "A13"] as const) expect(armById(id).role).toBe("pricing arm, never a design value");
    const clock = Object.fromEntries(ARM_DEFS.map((d) => [d.id, d.clock.kind === "L" ? `L${String(d.clock.R)}` : d.clock.kind === "S" ? (d.clock.window ? "S+W" : "S") : "LEGACY"]));
    expect(clock).toEqual({
      A0: "LEGACY", A1: "S+W", A2: "S", A3: "L5", A4: "L8", A5: "L8", A6: "L8", A7: "L5", A8: "L5", A9: "LEGACY", A10: "LEGACY",
      A11: "S+W", A12: "L8", A13: "L5", A14: "LEGACY", A15: "S", A0b: "LEGACY",
    });
  });

  it("names only clauses the filing holds, each graded or reported as filed", () => {
    const file = loadFiled(join(import.meta.dirname, "..", FILED_PATH));
    const kind = new Map(file.bands.clauses.map((c) => [c.id, c.kind]));
    for (const d of ARM_DEFS) {
      for (const id of d.graded) expect(kind.get(id), `${d.id} grades ${id}`).toBe("graded");
      for (const id of d.reported) expect(kind.get(id), `${d.id} reports ${id}`).toBe("reported");
    }
    const graded = new Set(ARM_DEFS.flatMap((d) => d.graded));
    const reported = new Set(ARM_DEFS.flatMap((d) => d.reported));
    // Every graded and reported step-1 clause is carried by some arm.
    for (const c of file.bands.clauses) {
      if (c.step !== "1" || c.kind === "structural") continue;
      expect(c.kind === "graded" ? graded.has(c.id) : reported.has(c.id), c.id).toBe(true);
    }
    for (const d of ARM_DEFS) if (d.base !== undefined) expect(d.graded, `${d.id} grades the guard`).toEqual(expect.arrayContaining(["guard.mix", "guard.byClass"]));
  });

  it("gives each arm the mechanisms its base lacks (the exclusive affected counts)", () => {
    const ex = Object.fromEntries(ARM_DEFS.map((d) => [d.id, [...exclusiveMechanisms(d)]]));
    expect(ex).toEqual({
      A0: [], A1: ["S", "WINDOW"], A2: ["S"], A3: ["L"], A4: ["L"], A5: ["L", "HEELS"], A6: ["L", "PAST_ONLY"], A7: ["L", "HEELS"], A8: ["L", "PAST_ONLY"],
      A9: ["HEELS"], A10: ["PAST_ONLY"], A11: ["S", "WINDOW"], A12: ["L"], A13: ["L"], A14: ["HOLD"], A15: ["S"], A0b: ["HOLD", "HORIZONS", "HEELS", "LATE"],
    });
    expect(mechanismsOf(armById("A15"))).toEqual(["S", "HOLD", "HORIZONS", "HEELS", "LATE"]);
  });
});

describe("the built arms (O28, N7, N9)", () => {
  it("A0 is DEFAULT_TUNABLES itself and A1 is the design bundle, at POCKET_1_S1_DIGEST", () => {
    expect(armById("A0").tunables).toBe(DEFAULT_TUNABLES);
    expect(armById("A0").digest).toBe("fnv1a:395a9ae2");
    expect(armById("A1").tunables).toBe(rulesTunables("pocket-1.s1"));
    expect(armById("A1").digest).toBe(POCKET_1_S1_DIGEST);
    expect(armById("A1").overlayDigest).toBe(POCKET_1_S1_DIGEST);
  });

  it("every digest is stable and distinct from every other arm's and proof overlay's", () => {
    const all = [...allArms(), ...PROOF_OVERLAY_IDS.map((id) => proofOverlay(id))];
    const digests = all.map((a) => a.digest);
    expect(new Set(digests).size).toBe(all.length);
    for (const a of all) {
      expect(overlayDigestOf(a.tunables), a.id).toBe(a.digest);
      expect(stableDigest(a.tunables), a.id).toBe(a.tunablesDigest);
      if (a.rules === "legacy") {
        expect(a.overlayDigest, a.id).toBeUndefined();
        expect(a.tunables.engineRules, a.id).toBeUndefined();
        expect(a.tunables.passRush.beatClock ?? a.tunables.passRush.repClock ?? a.tunables.passRush.approach, a.id).toBeUndefined();
        expect(a.digest, `${a.id}: a legacy arm's digest is its whole tunables'`).toBe(a.tunablesDigest);
      } else {
        expect(a.tunables.engineRules, a.id).toEqual({ name: "pocket-1.s1", overlayDigest: a.digest });
        expect(a.overlayDigest, a.id).toBe(a.digest);
      }
    }
  });

  it("armOfDigest maps every stamped arm and both proof overlays, and refuses an unknown digest", () => {
    for (const a of [...allArms(), ...PROOF_OVERLAY_IDS.map((id) => proofOverlay(id))]) {
      if (a.overlayDigest === undefined) continue;
      expect(armOfDigest(a.overlayDigest), a.id).toBe(a);
    }
    expect(() => armOfDigest("fnv1a:00000000")).toThrow(EngineRulesError);
    expect(() => armOfDigest("fnv1a:00000000")).toThrow(/no step-1 arm of this build carries/);
    // A legacy arm's digest is not a stamp: nothing on a stream names it.
    expect(() => armOfDigest(armById("A0").digest)).toThrow(EngineRulesError);
  });

  it("every arm's tunables are frozen at every depth", () => {
    for (const a of [...allArms(), ...PROOF_OVERLAY_IDS.map((id) => proofOverlay(id))]) {
      for (const [path, node] of nodes(a.tunables)) expect(Object.isFrozen(node), `${a.id} ${path}`).toBe(true);
      expect(Object.isFrozen(a), a.id).toBe(true);
    }
  });

  it("each arm carries exactly its patches, applied in order on DEFAULT_TUNABLES", () => {
    for (const a of allArms()) {
      expect(a.patches.map((p) => p.tunableId), a.id).toEqual(a.patchSets.flatMap((n) => PATCH_SETS[n].map((p) => p.tunableId)));
      for (const p of a.patches) expect(leafAt(a.tunables, p.tunableId), `${a.id} ${p.tunableId}`).toBe(p.proposedValue);
      const untouched: Tunables = a.tunables;
      expect(untouched.passRush.bands).toEqual(DEFAULT_TUNABLES.passRush.bands);
    }
  });
});

// --- step 2 (plan §4.1, §4.2; AM-1) ---------------------------------------------------------------

/** AM-1's filed step-2 base map, read from the filed amendments file (commit b65ab25). */
const AMENDMENTS_FILE = join(import.meta.dirname, "..", "reports", "adr-089-amendments.filed.json");
function am1StepTwoBases(): Record<string, string> {
  const file = JSON.parse(readFileSync(AMENDMENTS_FILE, "utf8")) as { entries: { id: string; rule: { bases: Record<string, Record<string, string>> } }[] };
  const am1 = file.entries.find((e) => e.id === "AM-1");
  if (am1 === undefined) throw new Error("no AM-1 in the amendments file");
  return am1.rule.bases["2"]!;
}

const clockLabel = (d: { readonly clock: { readonly kind: string; readonly window?: boolean; readonly R?: number } }): string =>
  d.clock.kind === "L" ? `L${String(d.clock.R)}` : d.clock.kind === "S" ? (d.clock.window === true ? "S+W" : "S") : "LEGACY";

describe("step 2's patch sets (plan §4.1)", () => {
  it("HALF and FOLLOWS are POCKET_1_S2_LEAVES split, appended after step 1's five", () => {
    expect([...PATCH_SET_NAMES].slice(0, 7)).toEqual(["HOLD", "HEELS", "PAST_ONLY", "LATE", "HORIZONS", "HALF", "FOLLOWS"]);
    expect(PATCH_SETS.HALF).toBe(HALF);
    expect(PATCH_SETS.FOLLOWS).toBe(FOLLOWS);
    expect(HALF).toEqual([POCKET_1_S2_LEAVES[0]]);
    expect(FOLLOWS).toEqual([POCKET_1_S2_LEAVES[1]]);
    expect(HALF[0]).toBe(POCKET_1_S2_LEAVES[0]);
    expect(FOLLOWS[0]).toBe(POCKET_1_S2_LEAVES[1]);
    expect(HALF.map((p) => [p.tunableId, p.currentValue, p.proposedValue])).toEqual([["arrival.collapsingWithinSeconds", 1.0, 0.5]]);
    expect(FOLLOWS.map((p) => [p.tunableId, p.currentValue, p.proposedValue])).toEqual([["arrival.pressureWithinSeconds", 2.0, 1.0]]);
  });

  it("together they are HORIZONS' leaves and values, so B5 is A5 plus HORIZONS (pkA's A123)", () => {
    const pairs = (set: readonly { tunableId: string; currentValue: unknown; proposedValue: unknown }[]) => set.map((p) => [p.tunableId, p.currentValue, p.proposedValue]);
    expect(pairs([...HALF, ...FOLLOWS])).toEqual(pairs(HORIZONS));
    const viaHorizons = withOverlay([...HEELS, ...HORIZONS].reduce(applyTunablePatch, DEFAULT_TUNABLES), "pocket-1.s2", lOverlay(8));
    expect(armById("B5").digest).toBe(viaHorizons.engineRules!.overlayDigest);
  });
});

describe("step 2's arm lists (plan §4.1, C2-F4)", () => {
  it("keeps step 1's 17 as they were and lists B1 to B7 and step 2's run list apart", () => {
    expect(ARM_IDS).toHaveLength(17);
    expect(STEP1_RUN_IDS).toBe(ARM_IDS);
    expect(ARM_DEFS.map((d) => d.id)).toEqual([...ARM_IDS]);
    expect(allArms().map((a) => a.id)).toEqual([...ARM_IDS]);
    expect([...STEP2_ARM_IDS]).toEqual(["B1", "B2", "B3", "B4", "B5", "B6", "B7"]);
    expect(STEP2_ARM_DEFS.map((d) => d.id)).toEqual([...STEP2_ARM_IDS]);
    expect(step2Arms().map((a) => a.id)).toEqual([...STEP2_ARM_IDS]);
    expect([...STEP2_RUN_IDS]).toEqual(["A0", "A14", "A1", "A5", "A11", "B1", "B2", "B3", "B4", "B5", "B6", "B7"]);
    expect(STEP2_BASES.map((b) => b.id)).toEqual(["A0", "A14", "A1", "A5", "A11"]);
    expect([...STEP2_RUN_IDS]).toEqual([...STEP2_BASES.map((b) => b.id), ...STEP2_ARM_IDS]);
    // Step 3's ids are appended after step 2's; every arm this build builds is in that order.
    expect([...ALL_ARM_IDS]).toEqual([...ARM_IDS, ...STEP2_ARM_IDS, ...STEP3_ARM_IDS]);
    expect(everyArm().map((a) => a.id).slice(0, 24)).toEqual([...ARM_IDS, ...STEP2_ARM_IDS]);
  });

  it("checks an id per step: step 1 takes its 17 only, step 2 its run list only", () => {
    expect(runIdsOf(1)).toBe(STEP1_RUN_IDS);
    expect(runIdsOf(2)).toBe(STEP2_RUN_IDS);
    for (const id of ARM_IDS) {
      expect(isArmId(id), id).toBe(true);
      expect(isRunIdOf(1, id), id).toBe(true);
      expect(isAnyArmId(id), id).toBe(true);
      expect(isStep2ArmId(id), id).toBe(false);
    }
    for (const id of STEP2_ARM_IDS) {
      expect(isArmId(id), `${id}: step 1's command line does not take a step-2 arm`).toBe(false);
      expect(isRunIdOf(1, id), id).toBe(false);
      expect(isRunIdOf(2, id), id).toBe(true);
      expect(isStep2ArmId(id), id).toBe(true);
      expect(isAnyArmId(id), id).toBe(true);
    }
    for (const id of ARM_IDS) expect(isRunIdOf(2, id), id).toBe((STEP2_RUN_IDS as readonly string[]).includes(id));
    for (const bad of ["A2", "A15", "A0b"]) expect(isRunIdOf(2, bad), bad).toBe(false);
    for (const bad of ["B0", "B8", "b1", "", "A16"]) {
      expect(isAnyArmId(bad), bad).toBe(false);
      expect(isRunIdOf(1, bad), bad).toBe(false);
      expect(isRunIdOf(2, bad), bad).toBe(false);
    }
  });
});

describe("step 2's arm table (plan §4.1)", () => {
  it("is the plan's table, row by row", () => {
    const rows = Object.fromEntries(STEP2_ARM_DEFS.map((d) => [d.id, [clockLabel(d), [...d.patchSets].join("+") || "-", d.forcing ?? "-", d.base ?? "-", d.rules ?? "-", d.pricing, d.seedSet]]));
    expect(rows).toEqual({
      B1: ["S+W", "HALF", "PER_RUSHER", "A1", "pocket-1.s2", false, 1],
      B2: ["S+W", "FOLLOWS", "-", "A1", "pocket-1.s2", false, 1],
      B3: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "A1", "pocket-1.s2", false, 1],
      B4: ["S+W", "HALF+FOLLOWS", "COUNTER_LESS_SEEN", "A1", "pocket-1.s2", false, 1],
      B5: ["L8", "HEELS+HALF+FOLLOWS", "-", "A5", "pocket-1.s2", false, 1],
      B6: ["S+W", "HOLD+HALF+FOLLOWS", "PER_RUSHER", "A11", "pocket-1.s2", true, 1],
      B7: ["S+W", "HALF+FOLLOWS", "-", "A1", "pocket-1.s2", false, 1],
    });
    expect(armById("B3").role).toBe("design");
    expect(armById("B6").role).toBe("pricing arm, never a design value");
    // The "alone" arms leave the other mechanism out, so each breaks the July derivation (O37).
    for (const id of ["B1", "B2"] as const) expect(armById(id).role, id).toMatch(/breaks the July derivation, not a design value$/);
    for (const id of ["B4", "B5", "B7"] as const) expect(armById(id).role, id).toMatch(/^information/);
  });

  it("each base is AM-1's filed step-2 map, a re-played step-1 arm on the same seeds", () => {
    const filed = am1StepTwoBases();
    expect(Object.fromEntries(STEP2_ARM_DEFS.map((d) => [d.id, d.base]))).toEqual(filed);
    expect(Object.keys(filed).sort()).toEqual([...STEP2_ARM_IDS].sort());
    for (const d of STEP2_ARM_DEFS) {
      const base = armById(d.base!);
      expect(isArmId(base.id), `${d.id}'s base is a step-1 arm`).toBe(true);
      expect(STEP2_BASES.some((b) => b.id === base.id), `${d.id}'s base ${base.id} is re-played`).toBe(true);
      expect(base.seedSet, d.id).toBe(d.seedSet);
    }
  });

  it("each base has the arm's settings except this step's mechanisms (AM-1 §4.3)", () => {
    const stepTwo = new Set(["HALF", "FOLLOWS"]);
    for (const d of STEP2_ARM_DEFS) {
      const base = armById(d.base!);
      expect(clockLabel(base), `${d.id}'s base runs its clock`).toBe(clockLabel(d));
      expect(d.patchSets.filter((n) => !stepTwo.has(n)), `${d.id}'s other patches are its base's`).toEqual([...base.patchSets]);
      expect(base.forcing, `${d.id}'s base plays step 1's forcing rule`).toBeUndefined();
      expect(base.rules, d.id).toBe("pocket-1.s1");
      expect(base.pricing, d.id).toBe(d.pricing);
    }
  });

  it("names only clauses the filing holds, each as filed, and carries every graded or reported step-2 clause", () => {
    const file = loadFiled(join(import.meta.dirname, "..", FILED_PATH));
    const clause = new Map(file.bands.clauses.map((c) => [c.id, c]));
    for (const d of STEP2_ARM_DEFS) {
      for (const id of d.graded) expect(clause.get(id)?.kind, `${d.id} grades ${id}`).toBe("graded");
      for (const id of d.reported) expect(clause.get(id)?.kind, `${d.id} reports ${id}`).toBe("reported");
      for (const id of [...d.graded, ...d.reported]) expect(["2", "guard"], `${d.id}: ${id} is a step-2 or guard clause`).toContain(clause.get(id)?.step);
      expect(d.graded, `${d.id} grades the guard (AM-1: every arm in the map)`).toEqual(expect.arrayContaining(["guard.mix", "guard.byClass"]));
    }
    for (const b of STEP2_BASES) for (const id of b.reported) expect(clause.get(id)?.kind, `${b.id} reports ${id}`).toBe("reported");
    const graded = new Set(STEP2_ARM_DEFS.flatMap((d) => d.graded));
    const reported = new Set([...STEP2_ARM_DEFS.flatMap((d) => d.reported), ...STEP2_BASES.flatMap((b) => b.reported)]);
    for (const c of file.bands.clauses) {
      if (c.step !== "2" || c.kind === "structural") continue;
      expect(c.kind === "graded" ? graded.has(c.id) : reported.has(c.id), c.id).toBe(true);
    }
    // Plan §4.2: the four s2 bands on B3, the forcing point's sacks on B1, M2 on A1's streams.
    expect(armById("B3").graded).toEqual(["s2.pressure.flat", "s2.pressure.gen", "s2.hitOrSack", "s2.sack", "guard.mix", "guard.byClass"]);
    expect(armById("B1").graded).toEqual(["s2.falsifier.sacksDown", "guard.mix", "guard.byClass"]);
    expect(STEP2_BASES.find((b) => b.id === "A1")?.reported).toEqual(["s2.m2"]);
    for (const id of ["B2", "B4", "B5", "B6", "B7"] as const) expect(armById(id).graded, id).toEqual(["guard.mix", "guard.byClass"]);
  });
});

describe("step 2's built arms (plan §4.1, O28, C3-12, C3-14)", () => {
  it("every B arm is stamped pocket-1.s2 at its own digest; step 1's arms keep their stamps", () => {
    for (const a of step2Arms()) {
      expect(a.rules, a.id).toBe("pocket-1.s2");
      expect(a.tunables.engineRules, a.id).toEqual({ name: "pocket-1.s2", overlayDigest: a.digest });
      expect(a.overlayDigest, a.id).toBe(a.digest);
    }
    for (const a of allArms()) expect(a.rules, a.id).toBe(a.clock.kind === "LEGACY" ? "legacy" : "pocket-1.s1");
  });

  it("B3 is pocket-1.s2 itself, at POCKET_1_S2_DIGEST, and the same as its patches, overlay and forcing built afresh", () => {
    const b3 = armById("B3");
    expect(b3.tunables).toBe(rulesTunables("pocket-1.s2"));
    expect(b3.digest).toBe(POCKET_1_S2_DIGEST);
    const fresh = withOverlay(b3.patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), "pocket-1.s2", S_WINDOW_OVERLAY, { rule: "PER_RUSHER" });
    expect(fresh.engineRules!.overlayDigest).toBe(POCKET_1_S2_DIGEST);
    expect(stableDigest(fresh)).toBe(b3.tunablesDigest);
  });

  it("each B arm is its patches on DEFAULT_TUNABLES, then its clock's overlay and its forcing block", () => {
    for (const a of step2Arms()) {
      const overlay = a.clock.kind === "L" ? lOverlay(a.clock.R) : S_WINDOW_OVERLAY;
      const fresh = withOverlay(a.patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), "pocket-1.s2", overlay, a.forcing === undefined ? undefined : { rule: a.forcing });
      expect(fresh.engineRules!.overlayDigest, a.id).toBe(a.digest);
      expect(a.patches.map((p) => p.tunableId), a.id).toEqual(a.patchSets.flatMap((n) => PATCH_SETS[n].map((p) => p.tunableId)));
      for (const p of a.patches) expect(leafAt(a.tunables, p.tunableId), `${a.id} ${p.tunableId}`).toBe(p.proposedValue);
    }
  });

  it("moves only this step's leaves, the forcing block and the stamp against its base", () => {
    const expected: Record<string, string[]> = {
      B1: ["arrival.collapsingWithinSeconds", "pocket.forcing.rule"],
      B2: ["arrival.pressureWithinSeconds"],
      B3: ["arrival.collapsingWithinSeconds", "arrival.pressureWithinSeconds", "pocket.forcing.rule"],
      B4: ["arrival.collapsingWithinSeconds", "arrival.pressureWithinSeconds", "pocket.forcing.rule"],
      B5: ["arrival.collapsingWithinSeconds", "arrival.pressureWithinSeconds"],
      B6: ["arrival.collapsingWithinSeconds", "arrival.pressureWithinSeconds", "pocket.forcing.rule"],
      B7: ["arrival.collapsingWithinSeconds", "arrival.pressureWithinSeconds"],
    };
    for (const a of step2Arms()) {
      const before = leaves(armById(a.base!).tunables);
      const after = leaves(a.tunables);
      const moved = [...after].filter(([p, v]) => before.get(p) !== v).map(([p]) => p).filter((p) => !p.startsWith("engineRules.")).sort();
      expect(moved, a.id).toEqual(expected[a.id]);
      expect([...before.keys()].filter((p) => !after.has(p)), a.id).toEqual([]);
    }
  });

  it("carries the forcing key exactly on B1, B3, B4 and B6, never as undefined", () => {
    for (const id of ["A0", "A1", "A5", "A11", "A14", "B2", "B5", "B7"] as const) expect("forcing" in armById(id).tunables.pocket, id).toBe(false);
    for (const id of ["B1", "B3", "B4", "B6"] as const) expect("forcing" in armById(id).tunables.pocket, id).toBe(true);
    for (const a of allArms()) expect("forcing" in a.tunables.pocket, a.id).toBe(false);
    const rules = Object.fromEntries(step2Arms().map((a) => [a.id, a.tunables.pocket.forcing?.rule ?? null]));
    expect(rules).toEqual({ B1: "PER_RUSHER", B2: null, B3: "PER_RUSHER", B4: "COUNTER_LESS_SEEN", B5: null, B6: "PER_RUSHER", B7: null });
    for (const a of step2Arms()) expect(a.forcing ?? null, a.id).toBe(rules[a.id]);
  });

  it("has 26 distinct digests over the union, and armOfDigest maps every stamped one", () => {
    const all = [...allArms(), ...step2Arms(), ...PROOF_OVERLAY_IDS.map((id) => proofOverlay(id))];
    expect(all).toHaveLength(26);
    expect(new Set(all.map((a) => a.digest)).size).toBe(26);
    for (const a of all) {
      expect(overlayDigestOf(a.tunables), a.id).toBe(a.digest);
      expect(stableDigest(a.tunables), a.id).toBe(a.tunablesDigest);
      // Legacy arms are told apart by their whole tunables, which carry no stamp.
      if (a.rules === "legacy") expect(a.digest, a.id).toBe(a.tunablesDigest);
      else expect(armOfDigest(a.overlayDigest!), a.id).toBe(a);
    }
    expect(all.filter((a) => a.rules === "pocket-1.s2").map((a) => a.id)).toEqual([...STEP2_ARM_IDS]);
    expect(() => armOfDigest("fnv1a:00000000")).toThrow(EngineRulesError);
    expect(() => armOfDigest("fnv1a:00000000")).toThrow(
      "a stream stamped with overlay fnv1a:00000000, which no step-1 arm of this build carries, nor any step-2 or step-3 arm: its dials cannot be named (N9)",
    );
  });

  it("every B arm's tunables are frozen at every depth", () => {
    for (const a of step2Arms()) {
      for (const [path, node] of nodes(a.tunables)) expect(Object.isFrozen(node), `${a.id} ${path}`).toBe(true);
      expect(Object.isFrozen(a), a.id).toBe(true);
    }
  });
});

describe("step 2's mechanisms (plan §4.1, C3-13)", () => {
  it("appends MUST_ACT, HALF, FOLLOWS and COUNTER_LESS_SEEN after step 1's eight, which keep their order", () => {
    expect([...MECHANISMS].slice(0, 12)).toEqual(["S", "WINDOW", "L", "HEELS", "PAST_ONLY", "HOLD", "HORIZONS", "LATE", "MUST_ACT", "HALF", "FOLLOWS", "COUNTER_LESS_SEEN"]);
  });

  it("gives each B arm the mechanisms its base lacks, the forcing rule last", () => {
    const ex = Object.fromEntries(STEP2_ARM_DEFS.map((d) => [d.id, [...exclusiveMechanisms(d)]]));
    expect(ex).toEqual({
      B1: ["HALF", "MUST_ACT"],
      B2: ["FOLLOWS"],
      B3: ["HALF", "FOLLOWS", "MUST_ACT"],
      B4: ["HALF", "FOLLOWS", "COUNTER_LESS_SEEN"],
      B5: ["HALF", "FOLLOWS"],
      B6: ["HALF", "FOLLOWS", "MUST_ACT"],
      B7: ["HALF", "FOLLOWS"],
    });
    expect(mechanismsOf(armById("B6"))).toEqual(["S", "WINDOW", "HOLD", "HALF", "FOLLOWS", "MUST_ACT"]);
    expect(mechanismsOf(armById("B5"))).toEqual(["L", "HEELS", "HALF", "FOLLOWS"]);
    // Step 1's arms carry no forcing rule, so their mechanisms are step 1's.
    for (const a of allArms()) expect(mechanismsOf(a).some((m) => m === "MUST_ACT" || m === "COUNTER_LESS_SEEN" || m === "HALF" || m === "FOLLOWS"), a.id).toBe(false);
    const ids: ArmId[] = [...ALL_ARM_IDS];
    expect(ids).toHaveLength(40);
    expect([...allArms(), ...step2Arms()]).toHaveLength(24);
  });
});

describe("the legacy-clock tripwire in build (review FID-F-8, CT-F9)", () => {
  const a0 = ARM_DEFS.find((d) => d.id === "A0")!;
  it("refuses an arm on today's clock that carries a rules stamp or a forcing block, and builds the one that carries neither", () => {
    expect(a0.clock).toEqual({ kind: "LEGACY" });
    const built = buildArm(a0);
    expect(built.rules).toBe("legacy");
    expect(built.tunables).toBe(DEFAULT_TUNABLES);
    expect(built.digest).toBe(armById("A0").digest);
    const message = /^arm A0: an arm on today's clock carries no rules stamp and no forcing block$/;
    const defs: Parameters<typeof buildArm>[0][] = [{ ...a0, rules: POCKET_1_S1_RULES }, { ...a0, rules: POCKET_1_S2_RULES }, { ...a0, forcing: "PER_RUSHER" }, { ...a0, rules: POCKET_1_S2_RULES, forcing: "COUNTER_LESS_SEEN" }];
    for (const def of defs) {
      expect(() => buildArm(def), JSON.stringify({ rules: def.rules, forcing: def.forcing })).toThrow(EngineRulesError);
      expect(() => buildArm(def)).toThrow(message);
    }
  });
});


// --- step 3 (plan §5.1, §4.2; AM-2's references) ---------------------------------------------------------

/** One line for an arm's step-3 blocks: the free-run block's reading, origins, hold and picture; the late block; the climb lane. */
function blocksLabel(d: Pick<ArmDef, "step3">): string {
  const f = d.step3?.freeRun;
  const free = f === undefined ? "-" : [f.reading, f.origins?.join("|") ?? "all", f.hold === undefined ? "real" : `held:${Object.keys(f.hold).sort().join("|")}`, f.picture].join(" ");
  return [free, d.step3?.lateBlock === undefined ? "-" : "late", d.step3?.climbLane ?? "-"].join(" / ");
}

const DESIGN_PICTURE = POCKET_1_S3_FREE_RUN.picture;
const step3Def = (id: string): ArmDef => {
  const def = STEP3_ARM_DEFS.find((d) => d.id === id);
  if (def === undefined) throw new Error(`no step-3 def ${id}`);
  return def;
};
const BUILT_C = STEP3_ARM_IDS.filter((id) => id !== "C14");

describe("step 3's arm lists (plan §5.1, §4.2)", () => {
  it("lists C1 to C16 and step 3's run list: the seven re-played bases, then the C arms", () => {
    expect([...STEP3_ARM_IDS]).toEqual(Array.from({ length: 16 }, (_, i) => `C${String(i + 1)}`));
    expect([...STEP3_RUN_IDS]).toEqual(["A0", "A14", "A1", "A11", "B3", "B6", "B5", ...STEP3_ARM_IDS]);
    expect(new Set(STEP3_RUN_IDS).size).toBe(STEP3_RUN_IDS.length);
    for (const id of STEP3_RUN_IDS.slice(0, 7)) expect(everyArm().some((a) => a.id === id), id).toBe(true);
    expect(Object.isFrozen(ALL_ARM_IDS)).toBe(true);
    expect(STEP3_ARM_DEFS.map((d) => d.id)).toEqual([...STEP3_ARM_IDS]);
    // Every C arm is built but C14, which waits on P17; everyArm() is the three steps' in order.
    expect(step3Arms().map((a) => a.id)).toEqual(BUILT_C);
    expect(everyArm().map((a) => a.id)).toEqual([...ARM_IDS, ...STEP2_ARM_IDS, ...BUILT_C]);
    // Step 1's and step 2's lists are as they were.
    expect(ARM_IDS).toHaveLength(17);
    expect(STEP1_RUN_IDS).toBe(ARM_IDS);
    expect([...STEP2_RUN_IDS]).toEqual(["A0", "A14", "A1", "A5", "A11", "B1", "B2", "B3", "B4", "B5", "B6", "B7"]);
    expect(ARM_DEFS.map((d) => d.id)).toEqual([...ARM_IDS]);
    expect(STEP2_ARM_DEFS.map((d) => d.id)).toEqual([...STEP2_ARM_IDS]);
  });

  it("checks an id per step: step 3 takes its run list only, steps 1 and 2 no C id", () => {
    const steps: readonly ArmStep[] = [1, 2, 3];
    expect(runIdsOf(3)).toBe(STEP3_RUN_IDS);
    expect(steps.map((step) => runIdsOf(step))).toEqual([STEP1_RUN_IDS, STEP2_RUN_IDS, STEP3_RUN_IDS]);
    for (const id of STEP3_ARM_IDS) {
      expect(isAnyArmId(id), id).toBe(true);
      expect(isStep3ArmId(id), id).toBe(true);
      expect(isRunIdOf(3, id), id).toBe(true);
      expect(isArmId(id), id).toBe(false);
      expect(isStep2ArmId(id), id).toBe(false);
      expect(isRunIdOf(1, id), id).toBe(false);
      expect(isRunIdOf(2, id), id).toBe(false);
    }
    for (const id of [...ARM_IDS, ...STEP2_ARM_IDS]) {
      expect(isStep3ArmId(id), id).toBe(false);
      expect(isRunIdOf(3, id), id).toBe((STEP3_RUN_IDS as readonly string[]).includes(id));
    }
    // A5 is step 2's base for B5, not one of step 3's re-played bases; B1, B2, B4 and B7 are not re-played.
    for (const notRun of ["A5", "A2", "A15", "A0b", "B1", "B2", "B4", "B7"]) expect(isRunIdOf(3, notRun), notRun).toBe(false);
    for (const bad of ["C0", "C17", "c1", "C01", "C", ""]) {
      expect(isAnyArmId(bad), bad).toBe(false);
      expect(isStep3ArmId(bad), bad).toBe(false);
      for (const step of steps) expect(isRunIdOf(step, bad), `${bad} at step ${String(step)}`).toBe(false);
    }
  });
});

describe("step 3's arm table (plan §5.1)", () => {
  it("is the plan's table, row by row", () => {
    const D = DESIGN_PICTURE;
    const O = OTHER_PICTURE;
    expect(O).not.toBe(D);
    expect(new Set([D, O])).toEqual(new Set(["AS_RULED", "MUG_HEAD_ONLY"]));
    const rows = Object.fromEntries(
      STEP3_ARM_DEFS.map((d) => [d.id, [clockLabel(d), [...d.patchSets].join("+") || "-", d.forcing ?? "-", d.base ?? "-", d.rules ?? "-", d.pricing, d.seedSet, blocksLabel(d), d.waitsOn ?? "-"]]),
    );
    const s3 = "pocket-1.s3";
    const all = `B all real ${D} / late / FRONT`;
    expect(rows).toEqual({
      C1: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, all, "-"],
      C2: ["S+W", "HOLD+HALF+FOLLOWS", "PER_RUSHER", "B6", s3, true, 1, all, "-"],
      C3: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `B all held:drop|ratings ${D} / - / -`, "-"],
      C4: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `B all held:drop|spot ${D} / - / -`, "-"],
      C5: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `B all held:ratings|spot ${D} / - / -`, "-"],
      C6: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `B all real ${O} / late / FRONT`, "-"],
      C7: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `B UNBLOCKED real ${D} / - / -`, "-"],
      C8: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `B BLOWN_UP real ${D} / - / -`, "-"],
      C9: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `B LOOPER_FREE real ${D} / - / -`, "-"],
      C10: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, "- / late / -", "-"],
      C11: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `C all real ${D} / - / FRONT`, "-"],
      C12: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, `A all real ${D} / late / FRONT`, "-"],
      C13: ["S+W", "HALF+FOLLOWS+LATE", "PER_RUSHER", "B3", "pocket-1.s2", false, 1, "- / - / -", "-"],
      C14: ["L8", "HEELS+HALF+FOLLOWS", "-", "B5", s3, false, 1, all, "P17"],
      C15: ["S+W", "HALF+FOLLOWS+BAND_EDGES", "PER_RUSHER", "B3", s3, false, 1, all, "-"],
      C16: ["S+W", "HALF+FOLLOWS", "PER_RUSHER", "B3", s3, false, 1, "- / - / FRONT", "-"],
    });
    expect(step3Def("C1").role).toBe("design");
    expect(step3Def("C2").role).toBe("pricing arm, never a design value");
    expect(step3Def("C13").role).toMatch(/^contrast only/);
    expect(step3Def("C12").role).toMatch(/never offered$/);
    for (const id of ["C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C14", "C15", "C16"]) expect(step3Def(id).role, id).toMatch(/^information/);
  });

  it("each free-run block is the design's with the one change its row names; the design's late block and climb lane are pocket-1.s3's", () => {
    const { reading, origins, hold, picture, ...constants } = POCKET_1_S3_FREE_RUN;
    expect([reading, origins, hold, picture]).toEqual(["B", undefined, undefined, DESIGN_PICTURE]);
    for (const d of STEP3_ARM_DEFS) {
      const f = d.step3?.freeRun;
      if (f === undefined) continue;
      const { reading: r, origins: o, hold: h, picture: p, ...rest } = f;
      expect(rest, `${d.id} keeps the fifteen constants and movingGetOffSeconds`).toEqual(constants);
      const changes = [r !== reading, o !== undefined, h !== undefined, p !== picture].filter(Boolean).length;
      expect(changes, `${d.id} changes at most one input of the design's free-run block`).toBe(f === POCKET_1_S3_FREE_RUN ? 0 : 1);
      if (d.step3?.lateBlock !== undefined) expect(d.step3.lateBlock, d.id).toBe(POCKET_1_S3_LATE_BLOCK);
      if (d.step3?.climbLane !== undefined) expect(d.step3.climbLane, d.id).toBe(POCKET_1_S3_CLIMB_LANE);
    }
    for (const id of ["C1", "C2", "C14", "C15"]) expect(step3Def(id).step3, id).toEqual({ freeRun: POCKET_1_S3_FREE_RUN, lateBlock: POCKET_1_S3_LATE_BLOCK, climbLane: POCKET_1_S3_CLIMB_LANE });
    expect(step3Def("C1").step3?.freeRun).toBe(POCKET_1_S3_FREE_RUN);
    // The held inputs are AM-2's references, never the arm's own numbers.
    expect(step3Def("C3").step3?.freeRun?.hold).toEqual({ ratings: AM2_REFERENCES.ratings, drop: AM2_REFERENCES.drop });
    expect(step3Def("C4").step3?.freeRun?.hold).toEqual({ spot: AM2_REFERENCES.spot, drop: AM2_REFERENCES.drop });
    expect(step3Def("C5").step3?.freeRun?.hold).toEqual({ spot: AM2_REFERENCES.spot, ratings: AM2_REFERENCES.ratings });
  });

  it("holds AM-2's references, read back out of the committed text", () => {
    const file = JSON.parse(readFileSync(AMENDMENTS_FILE, "utf8")) as { entries: { id: string; rule: { references?: string } }[] };
    const text = file.entries.find((e) => e.id === "AM-2")?.rule.references ?? "";
    const num = (re: RegExp): number[] => {
      const m = re.exec(text);
      if (m === null) throw new Error(`AM-2's references do not say ${String(re)}: ${text}`);
      return m.slice(1).map(Number);
    };
    expect(num(/Speed (\d+(?:\.\d+)?) and Acceleration (\d+(?:\.\d+)?)/)).toEqual([AM2_REFERENCES.ratings.speed, AM2_REFERENCES.ratings.acceleration]);
    expect(num(/drop (\d+(?:\.\d+)?) yards/)).toEqual([AM2_REFERENCES.drop]);
    const s = AM2_REFERENCES.spot;
    expect(num(/down lineman \((\d+(?:\.\d+)?), (\d+(?:\.\d+)?)\), linebacker \((\d+(?:\.\d+)?), (\d+(?:\.\d+)?)\), defensive back \((\d+(?:\.\d+)?), (\d+(?:\.\d+)?)\)/)).toEqual([
      s.downLineman.depth, s.downLineman.width, s.linebacker.depth, s.linebacker.width, s.defensiveBack.depth, s.defensiveBack.width,
    ]);
    expect(AM2_REFERENCES).toEqual({ spot: { downLineman: { depth: 1, width: 2.5 }, linebacker: { depth: 2.5, width: 2.5 }, defensiveBack: { depth: 5, width: 7 } }, ratings: { speed: 50, acceleration: 50 }, drop: 5 });
    for (const [path, node] of nodes(AM2_REFERENCES)) expect(Object.isFrozen(node), path).toBe(true);
  });

  it("C15's band edges are every finite pickup and exchange edge 30 points easier, and nothing else", () => {
    expect(BAND_EDGE_SHIFT).toBe(30);
    expect(PATCH_SET_NAMES[PATCH_SET_NAMES.length - 1]).toBe("BAND_EDGES");
    expect(PATCH_SETS.BAND_EDGES).toBe(BAND_EDGES);
    expect(BAND_EDGES.map((p) => [p.tunableId, p.currentValue, p.proposedValue])).toEqual([
      ["blitzPickup.bands.0.minMargin", 15, -15],
      ["blitzPickup.bands.1.minMargin", 0, -30],
      ["blitzPickup.bands.2.minMargin", -19, -49],
      ["stunt.bands.0.minMargin", 20, -10],
      ["stunt.bands.1.minMargin", 0, -30],
      ["stunt.bands.2.minMargin", -19, -49],
    ]);
    const labels = (path: "blitzPickup" | "stunt"): unknown[] => [0, 1, 2, 3].map((i) => leafAt(DEFAULT_TUNABLES, `${path}.bands.${String(i)}.label`));
    expect(labels("blitzPickup")).toEqual(["PICKED_UP_CLEAN", "PICKED_UP", "RAN_THROUGH", "BLOWN_UP"]);
    expect(labels("stunt")).toEqual(["PASSED_OFF_CLEAN", "PASSED_OFF", "LATE_EXCHANGE", "LOOPER_FREE"]);
    const c15 = armById("C15").tunables;
    expect(c15.blitzPickup.bands.map((b) => b.minMargin)).toEqual([-15, -30, -49, Number.NEGATIVE_INFINITY]);
    expect(c15.stunt.bands.map((b) => b.minMargin)).toEqual([-10, -30, -49, Number.NEGATIVE_INFINITY]);
  });

  it("each base is a re-played base on the same seeds, with the arm's settings except step 3's mechanisms", () => {
    const stepThreePatches = new Set(["LATE", "BAND_EDGES"]);
    const replayed = STEP3_RUN_IDS.slice(0, 7);
    for (const d of STEP3_ARM_DEFS) {
      expect(replayed, `${d.id}'s base is re-played at step 3`).toContain(d.base);
      const base = armById(d.base!);
      expect(base.seedSet, d.id).toBe(d.seedSet);
      expect(clockLabel(base), `${d.id}'s base runs its clock`).toBe(clockLabel(d));
      expect(d.patchSets.filter((n) => !stepThreePatches.has(n)), `${d.id}'s other patches are its base's`).toEqual([...base.patchSets]);
      expect(base.forcing, d.id).toBe(d.forcing);
      expect(base.rules, d.id).toBe("pocket-1.s2");
      expect(base.pricing, d.id).toBe(d.pricing);
    }
  });

  it("names only clauses the filing holds, each as filed, and carries every graded or reported step-3 clause", () => {
    const file = loadFiled(join(import.meta.dirname, "..", FILED_PATH));
    const clause = new Map(file.bands.clauses.map((c) => [c.id, c]));
    for (const d of STEP3_ARM_DEFS) {
      for (const id of d.graded) expect(clause.get(id)?.kind, `${d.id} grades ${id}`).toBe("graded");
      for (const id of d.reported) expect(clause.get(id)?.kind, `${d.id} reports ${id}`).toBe("reported");
      for (const id of [...d.graded, ...d.reported]) expect(["3", "guard"], `${d.id}: ${id} is a step-3 or guard clause`).toContain(clause.get(id)?.step);
    }
    const graded = new Set(STEP3_ARM_DEFS.flatMap((d) => d.graded));
    const reported = new Set(STEP3_ARM_DEFS.flatMap((d) => d.reported));
    for (const c of file.bands.clauses) {
      if (c.step !== "3" || c.kind === "structural") continue;
      expect(c.kind === "graded" ? graded.has(c.id) : reported.has(c.id), c.id).toBe(true);
    }
    // Plan §5.2 to §5.4: the step's graded rows on C1; the stand-in expectations on C2 (read as C2
    // minus B6 on gen); AM-3's map guards C1, C2 and C11 only.
    expect(step3Def("C1").graded).toEqual(["s3.bin20.tick", "s3.quick", "s3.unblockedPressures", "s3.unblockedShare", "guard.mix", "guard.byClass"]);
    expect(step3Def("C1").reported).toEqual(["s3.quickOrigin", "s3.unblockedMen"]);
    expect(step3Def("C2").reported).toEqual(["s3.hitOrSack", "s3.expected.pressure", "s3.expected.sack", "s3.expected.bin20", "s3.expected.quick"]);
    const guarded = STEP3_ARM_DEFS.filter((d) => d.graded.includes("guard.mix")).map((d) => d.id);
    expect(guarded).toEqual(["C1", "C2", "C11"]);
    for (const id of ["C2", "C11"]) expect(step3Def(id).graded, id).toEqual(["guard.mix", "guard.byClass"]);
    for (const d of STEP3_ARM_DEFS) if (!guarded.includes(d.id)) expect(d.graded, d.id).toEqual([]);
  });
});

describe("step 3's built arms (plan §5.1, O28)", () => {
  it("every C arm but C13 is stamped pocket-1.s3 at its own digest; C13 is stamped pocket-1.s2 at its own", () => {
    for (const a of step3Arms()) {
      const name = a.id === "C13" ? "pocket-1.s2" : "pocket-1.s3";
      expect(a.rules, a.id).toBe(name);
      expect(a.tunables.engineRules, a.id).toEqual({ name, overlayDigest: a.digest });
      expect(a.overlayDigest, a.id).toBe(a.digest);
      if (a.id !== "C1") expect(a.digest, a.id).not.toBe(POCKET_1_S3_DIGEST);
    }
  });

  it("C1 is pocket-1.s3 itself, at POCKET_1_S3_DIGEST, and the same as its patches, overlay, blocks and forcing built afresh", () => {
    const c1 = armById("C1");
    expect(c1.tunables).toBe(rulesTunables("pocket-1.s3"));
    expect(c1.digest).toBe(POCKET_1_S3_DIGEST);
    const fresh = withOverlay(c1.patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), "pocket-1.s3", POCKET_1_S3_OVERLAY, { rule: "PER_RUSHER" });
    expect(fresh.engineRules!.overlayDigest).toBe(POCKET_1_S3_DIGEST);
    expect(stableDigest(fresh)).toBe(c1.tunablesDigest);
    // Built through withOverlay from copies (not the design's references), C1's definition gives the same bundle.
    const copies = buildArm({ ...step3Def("C1"), step3: { freeRun: { ...POCKET_1_S3_FREE_RUN }, lateBlock: { ...POCKET_1_S3_LATE_BLOCK }, climbLane: POCKET_1_S3_CLIMB_LANE } });
    expect(copies.tunables).not.toBe(c1.tunables);
    expect(copies.digest).toBe(POCKET_1_S3_DIGEST);
    expect(copies.tunablesDigest).toBe(c1.tunablesDigest);
  });

  it("each C arm is its patches on DEFAULT_TUNABLES, then its clock's overlay, its step-3 blocks and its forcing block", () => {
    for (const a of step3Arms()) {
      const clock = a.clock.kind === "L" ? lOverlay(a.clock.R) : S_WINDOW_OVERLAY;
      const b = a.step3 ?? {};
      const pickup = { ...(b.freeRun === undefined ? {} : { freeRun: b.freeRun }), ...(b.lateBlock === undefined ? {} : { lateBlock: b.lateBlock }) };
      const overlay = { ...clock, ...(Object.keys(pickup).length > 0 ? { blitzPickup: pickup } : {}), ...(b.climbLane === undefined ? {} : { pocket: { climbLane: b.climbLane } }) };
      const fresh = withOverlay(a.patches.reduce(applyTunablePatch, DEFAULT_TUNABLES), a.id === "C13" ? "pocket-1.s2" : "pocket-1.s3", overlay, a.forcing === undefined ? undefined : { rule: a.forcing });
      expect(fresh.engineRules!.overlayDigest, a.id).toBe(a.digest);
      expect(stableDigest(fresh), a.id).toBe(a.tunablesDigest);
      expect(a.patches.map((p) => p.tunableId), a.id).toEqual(a.patchSets.flatMap((n) => PATCH_SETS[n].map((p) => p.tunableId)));
      for (const p of a.patches) expect(leafAt(a.tunables, p.tunableId), `${a.id} ${p.tunableId}`).toBe(p.proposedValue);
    }
  });

  it("moves only its own leaves and blocks against its base", () => {
    const free = "blitzPickup.freeRun.";
    const late = "blitzPickup.lateBlock.";
    const climb = "pocket.climbLane";
    const lateLeaves = LATE.map((p) => p.tunableId);
    const edges = BAND_EDGES.map((p) => p.tunableId);
    const expected: Record<string, readonly string[]> = {
      C1: [free, late, climb], C2: [free, late, climb], C3: [free], C4: [free], C5: [free], C6: [free, late, climb], C7: [free], C8: [free], C9: [free],
      C10: [late], C11: [free, climb], C12: [free, late, climb], C13: lateLeaves, C15: [...edges, free, late, climb], C16: [climb],
    };
    for (const a of step3Arms()) {
      const before = leaves(armById(a.base!).tunables);
      const after = leaves(a.tunables);
      const moved = [...after].filter(([p, v]) => before.get(p) !== v).map(([p]) => p).filter((p) => !p.startsWith("engineRules."));
      const allowed = expected[a.id]!;
      const owner = (p: string): string | undefined => allowed.find((x) => (x.endsWith(".") ? p.startsWith(x) : p === x));
      for (const p of moved) expect(owner(p), `${a.id} moves ${p}`).toBeDefined();
      for (const x of allowed) expect(moved.some((p) => owner(p) === x), `${a.id} moves ${x}`).toBe(true);
      expect([...before.keys()].filter((p) => !after.has(p)), a.id).toEqual([]);
    }
    // Only C6 draws the other picture; every other free-run block draws the design's.
    for (const a of step3Arms()) {
      const p = a.tunables.blitzPickup.freeRun?.picture;
      if (p !== undefined) expect(p, a.id).toBe(a.id === "C6" ? OTHER_PICTURE : DESIGN_PICTURE);
    }
  });

  it("has distinct digests over the whole union, and armOfDigest maps every stamped one", () => {
    const all = [...everyArm(), ...PROOF_OVERLAY_IDS.map((id) => proofOverlay(id))];
    expect(all).toHaveLength(17 + 7 + 15 + 2);
    expect(new Set(all.map((a) => a.digest)).size).toBe(all.length);
    for (const a of all) {
      expect(overlayDigestOf(a.tunables), a.id).toBe(a.digest);
      if (a.rules !== "legacy") expect(armOfDigest(a.overlayDigest!), a.id).toBe(a);
    }
    expect(all.filter((a) => a.rules === "pocket-1.s3").map((a) => a.id)).toEqual(BUILT_C.filter((id) => id !== "C13"));
    expect(armOfDigest(POCKET_1_S3_DIGEST).id).toBe("C1");
  });

  it("every C arm's tunables are frozen at every depth", () => {
    for (const a of step3Arms()) {
      for (const [path, node] of nodes(a.tunables)) expect(Object.isFrozen(node), `${a.id} ${path}`).toBe(true);
      expect(Object.isFrozen(a), a.id).toBe(true);
    }
    for (const d of STEP3_ARM_DEFS) for (const [path, node] of nodes(d)) expect(Object.isFrozen(node), `${d.id} ${path}`).toBe(true);
  });

  it("refuses step 3's blocks on an arm of another rules name", () => {
    const c10 = step3Def("C10");
    expect(() => buildArm({ ...c10, rules: "pocket-1.s2" })).toThrow(/^arm C10: only a pocket-1\.s3 arm carries step 3's blocks$/);
    expect(() => buildArm({ ...c10, rules: "pocket-1.s1" })).toThrow(EngineRulesError);
    const { rules: _rules, forcing: _forcing, ...unstamped } = c10;
    expect(() => buildArm({ ...unstamped, clock: { kind: "LEGACY" }, patchSets: [] })).toThrow(/^arm C10: an arm on today's clock carries no rules stamp and no forcing block$/);
  });
});

describe("C14 waits on petition P17 (plan §3.4, §5.1)", () => {
  it("is defined, not built: armById refuses it by name and armRefusal says why", () => {
    expect(armRefusal("C14")).toBe(
      "C14 waits on petition P17 (the late block's rolled tick on shape L): the late block on shape L is refused until its doc text is in contracts (ADR-089 step 3, plan §3.4, §5.1); dropped if P17 is declined",
    );
    expect(() => armById("C14")).toThrow(EngineRulesError);
    expect(() => armById("C14")).toThrow(/^arms: C14 waits on petition P17 .*: nothing plays it$/);
    for (const id of ALL_ARM_IDS) if (id !== "C14") expect(armRefusal(id), id).toBeUndefined();
    expect(() => armById("Z9" as ArmId)).toThrow(/^arms: no arm Z9$/);
    expect(everyArm().some((a) => a.id === "C14")).toBe(false);
    expect(step3Arms().some((a) => a.id === "C14")).toBe(false);
  });

  it("its definition really is refused, by the late block on shape L, and without the late block it builds", () => {
    const c14 = step3Def("C14");
    for (const d of STEP3_ARM_DEFS) expect(d.waitsOn === "P17", d.id).toBe(d.clock.kind === "L" && d.step3?.lateBlock !== undefined);
    expect(() => buildArm(c14)).toThrow(EngineRulesError);
    expect(() => buildArm(c14)).toThrow(/the late block \(blitzPickup\.lateBlock\) on shape L \(passRush\.repClock\) is refused until petition P17's doc text/);
    const { lateBlock: _late, ...rest } = c14.step3!;
    const { waitsOn: _waits, ...free } = c14;
    const without = buildArm({ ...free, step3: rest });
    expect(without.rules).toBe("pocket-1.s3");
    expect(without.tunables.passRush.repClock).toEqual({ fullExpressionSeconds: 8 });
    expect(without.tunables.blitzPickup.lateBlock).toBeUndefined();
  });
});

describe("step 3's mechanisms (plan §5.1)", () => {
  it("appends FREE_RUN, LATE_BLOCK, CLIMB_FRONT, MUG_HEAD_ONLY and BAND_EDGES after step 2's", () => {
    expect([...MECHANISMS].slice(12)).toEqual(["FREE_RUN", "LATE_BLOCK", "CLIMB_FRONT", "MUG_HEAD_ONLY", "BAND_EDGES"]);
    for (const a of [...allArms(), ...step2Arms()]) {
      expect(mechanismsOf(a).some((m) => ["FREE_RUN", "LATE_BLOCK", "CLIMB_FRONT", "MUG_HEAD_ONLY", "BAND_EDGES"].includes(m)), a.id).toBe(false);
    }
  });

  it("gives each C arm the mechanisms its base lacks", () => {
    const mug = OTHER_PICTURE === "MUG_HEAD_ONLY" ? ["MUG_HEAD_ONLY"] : [];
    const designMug = DESIGN_PICTURE === "MUG_HEAD_ONLY" ? ["MUG_HEAD_ONLY"] : [];
    const s3 = ["FREE_RUN", ...designMug, "LATE_BLOCK", "CLIMB_FRONT"];
    const ex = Object.fromEntries(STEP3_ARM_DEFS.map((d) => [d.id, [...exclusiveMechanisms(d)]]));
    expect(ex).toEqual({
      C1: s3, C2: s3,
      C3: ["FREE_RUN", ...designMug], C4: ["FREE_RUN", ...designMug], C5: ["FREE_RUN", ...designMug],
      C6: ["FREE_RUN", ...mug, "LATE_BLOCK", "CLIMB_FRONT"],
      C7: ["FREE_RUN", ...designMug], C8: ["FREE_RUN", ...designMug], C9: ["FREE_RUN", ...designMug],
      C10: ["LATE_BLOCK"],
      C11: ["FREE_RUN", ...designMug, "CLIMB_FRONT"],
      C12: s3,
      C13: ["LATE"],
      C14: s3,
      C15: ["BAND_EDGES", ...s3],
      C16: ["CLIMB_FRONT"],
    });
  });
});

describe("AM-3's base map and the command line at step 3 (plan §4.2, §2.10)", () => {
  it("AM-3's base map on a stand-in entry names arms of this build; an id past C16 does not (the committed file is only read)", () => {
    const PKG = join(import.meta.dirname, "..");
    const filing = loadFiled(join(PKG, FILED_PATH));
    const committed = loadAmendments(join(PKG, AMENDMENTS_PATH), filing);
    expect(() => guardFor(committed, "3")).toThrow(/no filed amendment maps step 3's guard bases/);
    const withBases = (bases: Record<string, Record<string, string>>): unknown => {
      const j = JSON.parse(JSON.stringify(committed)) as { entries: Record<string, unknown>[] };
      const standIn = JSON.parse(JSON.stringify(j.entries.find((e) => e["id"] === "AM-1"))) as Record<string, unknown>;
      standIn["id"] = `AM-${String(j.entries.length + 1)}`;
      standIn["filedBeforeStep"] = "3";
      standIn["steps"] = ["3", "4", "5a", "5b", "6", "7", "8a", "8b", "9", "10"];
      (standIn["rule"] as Record<string, unknown>)["bases"] = bases;
      j.entries.push(standIn);
      return j;
    };
    expect(amendmentsProblems(withBases({ "3": { C1: "B3", C2: "B6", C11: "B3" } }), filing)).toEqual([]);
    // The stand-in's map is the table's base column for the three guarded arms.
    for (const [arm, base] of Object.entries({ C1: "B3", C2: "B6", C11: "B3" })) expect(step3Def(arm).base, arm).toBe(base);
    const past = amendmentsProblems(withBases({ "3": { C17: "B3", C2: "C0" } }), filing);
    expect(past.some((p) => /bases\.3\.C17: not an arm of this build/.test(p)), past.join("; ")).toBe(true);
    expect(past.some((p) => /bases\.3\.C2: its base "C0" is not an arm of this build/.test(p)), past.join("; ")).toBe(true);
  });

  it("the command line takes --step 3 (K4's harness) and refuses C14 by armRefusal's reason; step 2's takes no C arm", () => {
    expect(parsePocketArgs(["--step", "3", "--arms", "C1"], "/")).toEqual({ step: 3, arms: ["C1"] });
    expect(() => parsePocketArgs(["--step", "3", "--arms", "C14"], "/")).toThrow(`--arms: C14 is not playable: ${armRefusal("C14") ?? "?"}`);
    expect(() => parsePocketArgs(["--step", "2", "--arms", "C1"], "/")).toThrow(/^--arms: C1 is not an arm \(step 2's: A0, A14, A1, A5, A11, B1 to B7\)$/);
  });
});
