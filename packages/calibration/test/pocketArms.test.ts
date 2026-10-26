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
 */
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { stableDigest } from "../src/harness/digest.js";
import {
  allArms,
  ARM_DEFS,
  ARM_IDS,
  armById,
  armOfDigest,
  exclusiveMechanisms,
  HEELS,
  HOLD,
  HORIZONS,
  isArmId,
  LATE,
  lOverlay,
  mechanismsOf,
  PAST_ONLY,
  PATCH_SET_NAMES,
  PATCH_SETS,
  PROOF_OVERLAY_IDS,
  proofOverlay,
  S_OVERLAY,
  S_WINDOW_OVERLAY,
} from "../src/pocket/arms.js";
import { FILED_PATH } from "../src/pocket/bands.js";
import { loadFiled } from "../src/pocket/filed.js";
import { EngineRulesError, overlayDigestOf, POCKET_1_S1_DIGEST, rulesTunables } from "../src/pocket/rules.js";

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
