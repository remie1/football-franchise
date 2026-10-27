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
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { stableDigest } from "../src/harness/digest.js";
import { readFileSync } from "node:fs";
import {
  ALL_ARM_IDS,
  allArms,
  ARM_DEFS,
  ARM_IDS,
  armById,
  armOfDigest,
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
  type ArmId,
} from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { loadFiled } from "../src/pocket/filed.js";
import {
  EngineRulesError,
  overlayDigestOf,
  POCKET_1_S1_DIGEST,
  POCKET_1_S2_DIGEST,
  POCKET_1_S2_LEAVES,
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
    expect([...PATCH_SET_NAMES]).toEqual(["HOLD", "HEELS", "PAST_ONLY", "LATE", "HORIZONS", "HALF", "FOLLOWS"]);
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
    expect([...ALL_ARM_IDS]).toEqual([...ARM_IDS, ...STEP2_ARM_IDS]);
    expect(everyArm().map((a) => a.id)).toEqual([...ALL_ARM_IDS]);
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
    const all = [...everyArm(), ...PROOF_OVERLAY_IDS.map((id) => proofOverlay(id))];
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
      "a stream stamped with overlay fnv1a:00000000, which no step-1 arm of this build carries, nor any step-2 arm: its dials cannot be named (N9)",
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
    expect([...MECHANISMS]).toEqual(["S", "WINDOW", "L", "HEELS", "PAST_ONLY", "HOLD", "HORIZONS", "LATE", "MUST_ACT", "HALF", "FOLLOWS", "COUNTER_LESS_SEEN"]);
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
    expect(ids).toHaveLength(24);
  });
});
