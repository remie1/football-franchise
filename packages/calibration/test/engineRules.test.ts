/**
 * ADR-089 — THE ENGINE RULES NAME AND ITS BUNDLES (`src/pocket/rules.ts`; step 0's plan §4,
 * deviation O11; step 1's plan §3, §4, §7.2 items 1 and 11, §16.4; step 2's plan §1.2, §1.3, §1.8).
 *
 *  1. This build has `legacy`, `pocket-1.s1` and `pocket-1.s2`, and `legacy` is the default (§9:
 *     "main's default stays `legacy` until step 11's flip commit").
 *  2. A name is checked: absent is the default, a name this build does not have is refused, and so
 *     is the word "default", so nothing is ever stamped with anything but the rules that played.
 *  3. The bundles: `rulesTunables("legacy")` is `DEFAULT_TUNABLES` itself; `pocket-1.s1` is the
 *     design overlay (theta 11, k 2, beta 0.5, the push window 1 to 14 over 1.0 s, the card 1 to 14)
 *     on `DEFAULT_TUNABLES`, stamped with its overlay digest (O28), pinned here as a literal (N9),
 *     deep-frozen at every depth (N7). `withOverlay` refuses what it must; `checkStamp` refuses a
 *     stamp that does not match the dials, including a leaf patched after stamping (S1).
 *  4. The save (K18 (a), F12): absent or exactly `legacy` is `legacy`, before any other rule; other
 *     rules are `<name>@<digest>`; every refusal has its own message; the grammar is pinned.
 *  5. When a name is written: never for `legacy` on the identity, provenance and save; always on the
 *     export file and `--out`; the overlay digest only when the rules are not `legacy`.
 *  6. Step 2's bundle `pocket-1.s2`: step 1's blocks on `DEFAULT_TUNABLES` with Half
 *     (`arrival.collapsingWithinSeconds` 1.0 -> 0.5) and Follows (`arrival.pressureWithinSeconds`
 *     2.0 -> 1.0, so P = C + (C - I) holds) changed inside the bundle only, and `pocket.forcing`
 *     PER_RUSHER; its digest a recorded literal. `withOverlay`'s fourth argument adds the forcing
 *     key only when given; the forcing block is refused under `legacy`, under `pocket-1.s1`, on a
 *     base that has one, outside the closed set, and under PER_RUSHER on a forcing point the engine
 *     would refuse. `DEFAULT_TUNABLES` does not move (census and digest).
 */
import { describe, expect, it } from "vitest";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { stableDigest } from "../src/harness/digest.js";
import {
  DEFAULT_ENGINE_RULES,
  ENGINE_RULES,
  EngineRulesError,
  FORCING_RULES,
  LEGACY_RULES,
  POCKET_1_S1_DIGEST,
  POCKET_1_S1_OVERLAY,
  POCKET_1_S1_RULES,
  POCKET_1_S2_DIGEST,
  POCKET_1_S2_FORCING,
  POCKET_1_S2_LEAVES,
  POCKET_1_S2_RULES,
  checkStamp,
  engineRulesDigestOf,
  engineRulesNamed,
  isEngineRules,
  overlayDigestOf,
  rulesOfSave,
  rulesOnPlayStart,
  rulesStampAlways,
  rulesStampUnlessLegacy,
  rulesTunables,
  saveRulesName,
  withOverlay,
  type PocketForcing,
  type PocketOverlay,
} from "../src/pocket/rules.js";
import { allArms, armById, step2Arms } from "../src/pocket/arms.js";
import { seasonRules } from "../src/season/stamp.js";

/** K18's literal: the overlay digest of `pocket-1.s1` on this build (N9). Re-recorded only under K24. */
const RECORDED_POCKET_1_S1_DIGEST = "fnv1a:69a7cc48";

/**
 * The overlay digest of `pocket-1.s2` on this build, recorded at step 2's build (plan §1.8, K24).
 * After step 2 merges it is never re-recorded under `pocket-1.s2`: a changed build takes a new name.
 */
const RECORDED_POCKET_1_S2_DIGEST = "fnv1a:03754f60";

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

/** Every object node of a tree, with its path. */
function nodes(value: unknown, path = "$"): [string, object][] {
  if (typeof value !== "object" || value === null) return [];
  return [[path, value], ...Object.entries(value).flatMap(([k, v]) => nodes(v, `${path}.${k}`))];
}

describe("the rules this build has (ADR-089 §9)", () => {
  it("is legacy, pocket-1.s1 and pocket-1.s2, and legacy is the default", () => {
    expect(LEGACY_RULES).toBe("legacy");
    expect(POCKET_1_S1_RULES).toBe("pocket-1.s1");
    expect(POCKET_1_S2_RULES).toBe("pocket-1.s2");
    expect([...ENGINE_RULES]).toEqual(["legacy", "pocket-1.s1", "pocket-1.s2"]);
    expect(DEFAULT_ENGINE_RULES).toBe("legacy");
    expect(isEngineRules("legacy")).toBe(true);
    expect(isEngineRules("pocket-1")).toBe(false);
    expect(isEngineRules("pocket-1.s1")).toBe(true);
    expect(isEngineRules("pocket-1.s2")).toBe(true);
    expect(isEngineRules("pocket-1.s3")).toBe(false);
  });

  it("checks a named bundle: absent is the default, an unknown name or the word default is refused", () => {
    expect(engineRulesNamed(undefined, "here")).toBe("legacy");
    expect(engineRulesNamed("legacy", "here")).toBe("legacy");
    expect(engineRulesNamed("pocket-1.s1", "here")).toBe("pocket-1.s1");
    expect(engineRulesNamed("pocket-1.s2", "here")).toBe("pocket-1.s2");
    for (const bad of ["pocket-1", "pocket-1.s9", "pocket-1.s3", "default", "", "Legacy", `pocket-1.s1@${POCKET_1_S1_DIGEST}`, `pocket-1.s2@${POCKET_1_S2_DIGEST}`]) {
      expect(() => engineRulesNamed(bad, "here")).toThrow(EngineRulesError);
    }
    expect(() => engineRulesNamed("pocket-1.s9", "runBatch")).toThrow(
      'runBatch: engine rules "pocket-1.s9" are not in this build, which has legacy, pocket-1.s1, pocket-1.s2 (ADR-089 §9)',
    );
  });

  it("legacy has no overlay digest; pocket-1.s1's and pocket-1.s2's are the recorded literals", () => {
    expect(engineRulesDigestOf("legacy")).toBeUndefined();
    expect(engineRulesDigestOf("pocket-1.s1")).toBe(POCKET_1_S1_DIGEST);
    expect(POCKET_1_S1_DIGEST).toBe(RECORDED_POCKET_1_S1_DIGEST);
    expect(engineRulesDigestOf("pocket-1.s2")).toBe(POCKET_1_S2_DIGEST);
    expect(POCKET_1_S2_DIGEST).toBe(RECORDED_POCKET_1_S2_DIGEST);
  });

  it("every rules name is [a-z0-9.-] only, so none can hold the save's @ (F12)", () => {
    for (const r of ENGINE_RULES) expect(r).toMatch(/^[a-z0-9.-]+$/);
  });
});

describe("the bundles (plan §4; N7, N9, O28, S1)", () => {
  it("legacy plays DEFAULT_TUNABLES itself, the same reference, which carries no stamp and no block", () => {
    expect(rulesTunables("legacy")).toBe(DEFAULT_TUNABLES);
    expect(DEFAULT_TUNABLES.engineRules).toBeUndefined();
    expect(DEFAULT_TUNABLES.passRush.beatClock).toBeUndefined();
    expect(DEFAULT_TUNABLES.passRush.repClock).toBeUndefined();
    expect(DEFAULT_TUNABLES.passRush.approach).toBeUndefined();
    // The binding's tunables digest: DEFAULT_TUNABLES is unchanged at run time.
    expect(stableDigest(DEFAULT_TUNABLES)).toBe("fnv1a:395a9ae2");
    expect(checkStamp(DEFAULT_TUNABLES, "legacy")).toBe(DEFAULT_TUNABLES);
  });

  it("pocket-1.s1 is the design overlay on DEFAULT_TUNABLES, stamped with its overlay digest", () => {
    const b = rulesTunables("pocket-1.s1");
    expect(rulesTunables("pocket-1.s1")).toBe(b);
    expect(POCKET_1_S1_OVERLAY).toEqual({
      beatClock: { thetaSeconds: 11, shape: 2, ratingWeight: 0.5, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 1.0 } },
      approach: { pushMinMargin: 1, pushMaxMargin: 14 },
    });
    expect(b.passRush.beatClock).toEqual(POCKET_1_S1_OVERLAY.beatClock);
    expect(b.passRush.approach).toEqual(POCKET_1_S1_OVERLAY.approach);
    expect(b.passRush.repClock).toBeUndefined();
    expect(b.engineRules).toEqual({ name: "pocket-1.s1", overlayDigest: RECORDED_POCKET_1_S1_DIGEST });
    expect(Object.keys(b.engineRules!)).toEqual(["name", "overlayDigest"]);
    // O28: the digest is of the tunables with the stamp removed, i.e. DEFAULT_TUNABLES plus the blocks.
    expect(overlayDigestOf(b)).toBe(RECORDED_POCKET_1_S1_DIGEST);
    expect(stableDigest({ ...DEFAULT_TUNABLES, passRush: { ...DEFAULT_TUNABLES.passRush, ...POCKET_1_S1_OVERLAY } })).toBe(RECORDED_POCKET_1_S1_DIGEST);
    expect(stableDigest(b)).not.toBe(RECORDED_POCKET_1_S1_DIGEST);
    // Question 1 Today: every existing leaf is DEFAULT_TUNABLES' own.
    const { engineRules: _s, passRush: pr, ...rest } = b;
    const { beatClock: _b, approach: _a, ...passRushRest } = pr;
    const { passRush: dpr, ...drest } = DEFAULT_TUNABLES;
    expect(stableDigest(rest)).toBe(stableDigest(drest));
    expect(stableDigest(passRushRest)).toBe(stableDigest(dpr));
    expect(checkStamp(b, "pocket-1.s1")).toBe(b);
  });

  it("the overlay digest ignores the stamp and nothing else", () => {
    const b = rulesTunables("pocket-1.s1");
    expect(overlayDigestOf({ ...b, engineRules: { name: "pocket-1.s1", overlayDigest: "fnv1a:00000000" } })).toBe(RECORDED_POCKET_1_S1_DIGEST);
    expect(overlayDigestOf(DEFAULT_TUNABLES)).toBe(stableDigest(DEFAULT_TUNABLES));
    const shifted = withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", { ...POCKET_1_S1_OVERLAY, beatClock: { ...POCKET_1_S1_OVERLAY.beatClock!, thetaSeconds: 13 } });
    expect(shifted.engineRules!.overlayDigest).not.toBe(RECORDED_POCKET_1_S1_DIGEST);
    expect(checkStamp(shifted, "pocket-1.s1")).toBe(shifted);
  });

  it("every bundle is frozen at every depth, and the overlay is too (N7)", () => {
    for (const tree of [rulesTunables("pocket-1.s1"), POCKET_1_S1_OVERLAY, withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", { repClock: { fullExpressionSeconds: 5 }, approach: { pushMinMargin: 1, pushMaxMargin: 14 } })]) {
      const all = nodes(tree);
      expect(all.length).toBeGreaterThan(3);
      for (const [path, node] of all) expect(Object.isFrozen(node), path).toBe(true);
    }
  });

  it("withOverlay copies the blocks it is given: the caller's objects stay as they were", () => {
    const blocks = { beatClock: { thetaSeconds: 9, shape: 2, ratingWeight: 0.5 }, approach: { pushMinMargin: 1, pushMaxMargin: 14 } };
    const b = withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", blocks);
    expect(Object.isFrozen(blocks.beatClock)).toBe(false);
    expect(b.passRush.beatClock).not.toBe(blocks.beatClock);
    expect(b.passRush.beatClock).toEqual(blocks.beatClock);
  });

  it("withOverlay refuses a stamped base, a base with a block, legacy, and a bundle outside the closed sets", () => {
    const stamped = rulesTunables("pocket-1.s1");
    const card = { pushMinMargin: 1, pushMaxMargin: 14 };
    const cases: [string, () => unknown, RegExp][] = [
      ["a stamped base", () => withOverlay(stamped, "pocket-1.s1", POCKET_1_S1_OVERLAY), /already carries the rules stamp pocket-1.s1/],
      ["a base with a block", () => withOverlay({ ...DEFAULT_TUNABLES, passRush: { ...DEFAULT_TUNABLES.passRush, approach: card } }, "pocket-1.s1", POCKET_1_S1_OVERLAY), /already carries passRush.approach/],
      ["legacy", () => withOverlay(DEFAULT_TUNABLES, "legacy" as never, POCKET_1_S1_OVERLAY), /legacy carries no stamp/],
      ["a name this build does not have", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s9" as never, POCKET_1_S1_OVERLAY), /a pocket-1 rules name this build has/],
      ["both clocks", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", { ...POCKET_1_S1_OVERLAY, repClock: { fullExpressionSeconds: 5 } }), /one block clock, not both/],
      ["no clock", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", { approach: card }), /needs a block clock/],
      ["no card", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", { beatClock: POCKET_1_S1_OVERLAY.beatClock! }), /needs the approach card/],
      ["nothing", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", {}), /needs a block clock/],
    ];
    for (const [label, run, message] of cases) {
      expect(run, label).toThrow(EngineRulesError);
      expect(run, label).toThrow(message);
    }
  });

  it("withOverlay and checkStamp refuse a dial no clock can run on, and a window whose range is not the card's, before any game (NPC-3, CT-2, CT-3)", () => {
    const card = { pushMinMargin: 1, pushMaxMargin: 14 };
    const beat = { thetaSeconds: 11, shape: 2, ratingWeight: 0.5 };
    const window = (over: Partial<{ minMargin: number; maxMargin: number; lengthSeconds: number }>) => ({ ...beat, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 1.0, ...over } });
    const cases: [string, PocketOverlay, string][] = [
      ["a theta of 0", { beatClock: { ...beat, thetaSeconds: 0 }, approach: card }, "passRush.beatClock.thetaSeconds must be a finite number above 0, got 0"],
      ["a negative shape", { beatClock: { ...beat, shape: -2 }, approach: card }, "passRush.beatClock.shape must be a finite number above 0, got -2"],
      ["a rating weight that is not a number", { beatClock: { ...beat, ratingWeight: Number.NaN }, approach: card }, "passRush.beatClock.ratingWeight must be a finite number, got NaN"],
      ["a window whose range runs backwards", { beatClock: window({ minMargin: 14, maxMargin: 1 }), approach: card }, "passRush.beatClock.pushWindow runs from 14 to 1: its minimum is above its maximum"],
      ["a window of no length", { beatClock: window({ lengthSeconds: 0 }), approach: card }, "passRush.beatClock.pushWindow.lengthSeconds must be a finite number above 0, got 0"],
      ["a window one tick step long", { beatClock: window({ lengthSeconds: 0.5 }), approach: card }, "passRush.beatClock.pushWindow.lengthSeconds must be a whole number of tick steps (0.5 s), at least 2, got 0.5"],
      ["a window off the tick grid", { beatClock: window({ lengthSeconds: 0.75 }), approach: card }, "passRush.beatClock.pushWindow.lengthSeconds must be a whole number of tick steps (0.5 s), at least 2, got 0.75"],
      ["a window whose range is not the card's", { beatClock: window({ minMargin: 3, maxMargin: 9 }), approach: card }, "the push window's margin range (3 to 9) is not the approach card's PUSH range (1 to 14); both name the same POWER reps (ADR-089 §4.0, §4.1.1)"],
      ["a PUSH range that runs backwards", { beatClock: beat, approach: { pushMinMargin: 9, pushMaxMargin: 2 } }, "the approach card's PUSH range (passRush.approach) runs from 9 to 2: its minimum is above its maximum"],
      ["an R of 0", { repClock: { fullExpressionSeconds: 0 }, approach: card }, "passRush.repClock.fullExpressionSeconds must be a finite number above 0, got 0"],
    ];
    for (const [label, blocks, message] of cases) {
      expect(() => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", blocks), label).toThrow(EngineRulesError);
      expect(() => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", blocks), label).toThrow(`withOverlay(pocket-1.s1): ${message}`);
      // A bundle stamped by hand, its digest right, is refused by checkStamp the same way.
      const unstamped: Tunables = { ...DEFAULT_TUNABLES, passRush: { ...DEFAULT_TUNABLES.passRush, ...blocks } };
      const byHand: Tunables = { ...unstamped, engineRules: { name: "pocket-1.s1", overlayDigest: overlayDigestOf(unstamped) } };
      expect(() => checkStamp(byHand, "pocket-1.s1", "runBatch"), label).toThrow(`runBatch: ${message}`);
    }
    // A window of a whole number of steps, two or more, with the card's range, is a bundle.
    for (const lengthSeconds of [1.0, 1.5, 2.0]) expect(checkStamp(withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", { beatClock: window({ lengthSeconds }), approach: card }), "pocket-1.s1")).toBeDefined();
  });

  it("checkStamp refuses a leaf patched after stamping (S1), in the overlay or out of it", () => {
    const b = rulesTunables("pocket-1.s1");
    const patch = (tunableId: string, currentValue: number, proposedValue: number): Tunables =>
      applyTunablePatch(b, { tunableId, currentValue, proposedValue, evidence: "test", expectedEffect: "test" });
    for (const after of [patch("passRush.beatClock.thetaSeconds", 11, 13), patch("passRush.approach.pushMaxMargin", 14, 12), patch("qb.timeBudget.baseSeconds", 2.5, 4.5)]) {
      expect(after.engineRules).toEqual(b.engineRules);
      expect(() => checkStamp(after, "pocket-1.s1", "runBatch")).toThrow(EngineRulesError);
      expect(() => checkStamp(after, "pocket-1.s1", "runBatch")).toThrow(/^runBatch: the tunables are stamped pocket-1.s1 at overlay fnv1a:69a7cc48, but they digest to fnv1a:[0-9a-f]{8}: a dial changed after stamping$/);
    }
    // Patching the base first, then stamping, is the way an arm is made, and it checks.
    const patchedBase = applyTunablePatch(DEFAULT_TUNABLES, { tunableId: "qb.timeBudget.baseSeconds", currentValue: 2.5, proposedValue: 4.5, evidence: "test", expectedEffect: "test" });
    const arm = withOverlay(patchedBase, "pocket-1.s1", POCKET_1_S1_OVERLAY);
    expect(checkStamp(arm, "pocket-1.s1")).toBe(arm);
    expect(arm.engineRules!.overlayDigest).not.toBe(RECORDED_POCKET_1_S1_DIGEST);
  });

  it("checkStamp refuses every mismatch between the name and the tunables, each with its own message", () => {
    const b = rulesTunables("pocket-1.s1");
    const blockOnly: Tunables = { ...DEFAULT_TUNABLES, passRush: { ...DEFAULT_TUNABLES.passRush, ...POCKET_1_S1_OVERLAY } };
    const misnamed: Tunables = { ...b, engineRules: { name: "pocket-1.s9", overlayDigest: RECORDED_POCKET_1_S1_DIGEST } };
    const stampOnly: Tunables = { ...DEFAULT_TUNABLES, engineRules: { name: "pocket-1.s1", overlayDigest: stableDigest(DEFAULT_TUNABLES) } };
    const cases: [string, () => unknown, string][] = [
      ["legacy named, a stamped bundle passed", () => checkStamp(b, "legacy", "w"), "w: the run names engine rules legacy, but the tunables carry the rules stamp pocket-1.s1"],
      ["legacy named, a block with no stamp", () => checkStamp(blockOnly, "legacy", "w"), "w: the run names engine rules legacy, but the tunables carry passRush.beatClock, passRush.approach with no rules stamp"],
      ["pocket-1.s1 named, unstamped tunables", () => checkStamp(DEFAULT_TUNABLES, "pocket-1.s1", "w"), "w: the run names engine rules pocket-1.s1, but the tunables carry no rules stamp; a bundle is made by withOverlay or rulesTunables"],
      ["pocket-1.s1 named, a block with no stamp", () => checkStamp(blockOnly, "pocket-1.s1", "w"), "w: the run names engine rules pocket-1.s1, but the tunables carry no rules stamp; a bundle is made by withOverlay or rulesTunables"],
      ["a stamp that names other rules", () => checkStamp(misnamed, "pocket-1.s1", "w"), "w: the run names engine rules pocket-1.s1, but the tunables are stamped pocket-1.s9"],
      ["a stamp without a block", () => checkStamp(stampOnly, "pocket-1.s1", "w"), "w: a pocket-1 bundle needs a block clock (passRush.beatClock or passRush.repClock)"],
    ];
    for (const [label, run, message] of cases) {
      expect(run, label).toThrow(EngineRulesError);
      expect(run, label).toThrow(message);
    }
    // Legacy plus patches is legacy: no stamp, no block, any leaves.
    const heels = applyTunablePatch(DEFAULT_TUNABLES, { tunableId: "pocket.minimumStatusByBand.BLOCKER_BEATEN", currentValue: "PRESSURE", proposedValue: "CLEAN", evidence: "test", expectedEffect: "test" });
    expect(checkStamp(heels, "legacy")).toBe(heels);
  });
});

describe("the stamp on the stream (PLAY_START.rules)", () => {
  it("reads a well-formed stamp, and nothing from a legacy payload or a malformed one", () => {
    expect(rulesOnPlayStart({ kind: "PASS_PLAY_V1", rules: { name: "pocket-1.s1", overlayDigest: RECORDED_POCKET_1_S1_DIGEST } })).toEqual({ name: "pocket-1.s1", overlayDigest: RECORDED_POCKET_1_S1_DIGEST });
    expect(rulesOnPlayStart({ kind: "PASS_PLAY_V1" })).toBeUndefined();
    for (const bad of [undefined, null, 5, "x", { rules: null }, { rules: { name: "pocket-1.s1" } }, { rules: { name: 1, overlayDigest: "d" } }]) {
      expect(rulesOnPlayStart(bad)).toBeUndefined();
    }
  });
});

describe("the rules a save was played with (P1; K18 (a), plan §16.4)", () => {
  it("is legacy when the save names none, before P1 or since, or names exactly legacy", () => {
    expect(rulesOfSave(undefined)).toBe("legacy");
    expect(rulesOfSave({})).toBe("legacy");
    expect(rulesOfSave({ caller: "v5" } as { engineRules?: string })).toBe("legacy");
    expect(rulesOfSave({ engineRules: "legacy" })).toBe("legacy");
  });

  it("is the bundle when the save names it at this build's digest", () => {
    expect(rulesOfSave({ engineRules: `pocket-1.s1@${RECORDED_POCKET_1_S1_DIGEST}` })).toBe("pocket-1.s1");
    expect(rulesOfSave({ engineRules: `pocket-1.s2@${RECORDED_POCKET_1_S2_DIGEST}` })).toBe("pocket-1.s2");
  });

  it("writes pocket-1.s2 as <name>@<digest>, and refuses one bundle's digest under the other's name (ADR-089 §9, step 2)", () => {
    expect(saveRulesName("pocket-1.s2")).toBe(`pocket-1.s2@${RECORDED_POCKET_1_S2_DIGEST}`);
    expect(() => rulesOfSave({ engineRules: `pocket-1.s2@${RECORDED_POCKET_1_S1_DIGEST}` })).toThrow(
      `This save was played with engine rules pocket-1.s2 at overlay ${RECORDED_POCKET_1_S1_DIGEST}; this build's pocket-1.s2 is ${RECORDED_POCKET_1_S2_DIGEST}`,
    );
    expect(() => rulesOfSave({ engineRules: `pocket-1.s1@${RECORDED_POCKET_1_S2_DIGEST}` })).toThrow(
      `This save was played with engine rules pocket-1.s1 at overlay ${RECORDED_POCKET_1_S2_DIGEST}; this build's pocket-1.s1 is ${RECORDED_POCKET_1_S1_DIGEST}`,
    );
    expect(() => rulesOfSave({ engineRules: "pocket-1.s2" })).toThrow("This save was played with engine rules pocket-1.s2 and carries no overlay digest");
  });

  it("the season command plays pocket-1.s2 when named, carries an s2 save on under its own rules, and refuses to convert (Q-8)", () => {
    expect(seasonRules(undefined, "pocket-1.s2")).toBe("pocket-1.s2");
    const s2Save = { playedWith: { engineRules: `pocket-1.s2@${RECORDED_POCKET_1_S2_DIGEST}` } };
    const s1Save = { playedWith: { engineRules: `pocket-1.s1@${RECORDED_POCKET_1_S1_DIGEST}` } };
    expect(seasonRules(s2Save)).toBe("pocket-1.s2");
    expect(seasonRules(s2Save, "pocket-1.s2")).toBe("pocket-1.s2");
    // A pocket-1.s1 save still loads as itself.
    expect(seasonRules(s1Save)).toBe("pocket-1.s1");
    expect(() => seasonRules(s1Save, "pocket-1.s2")).toThrow(EngineRulesError);
    expect(() => seasonRules(s1Save, "pocket-1.s2")).toThrow(/^This save was played with engine rules pocket-1.s1; carrying it on under pocket-1.s2 is refused, not converted/);
    expect(() => seasonRules(s2Save, "pocket-1.s1")).toThrow(/^This save was played with engine rules pocket-1.s2; carrying it on under pocket-1.s1 is refused, not converted/);
    expect(() => seasonRules({}, "pocket-1.s2")).toThrow(/^This save was played with engine rules legacy; carrying it on under pocket-1.s2 is refused/);
  });

  it("writes legacy as nothing and other rules as <name>@<digest>, and every non-legacy name round-trips (F12)", () => {
    expect(saveRulesName("legacy")).toBeUndefined();
    expect(saveRulesName("pocket-1.s1")).toBe(`pocket-1.s1@${RECORDED_POCKET_1_S1_DIGEST}`);
    for (const r of ENGINE_RULES) {
      if (r === "legacy") continue;
      const written = saveRulesName(r);
      expect(written).toMatch(/^[a-z0-9.-]+@fnv1a:[0-9a-f]{8}$/);
      expect(rulesOfSave({ engineRules: written! })).toBe(r);
    }
    // And legacy round-trips by absence.
    const legacy = saveRulesName("legacy");
    expect(rulesOfSave(legacy === undefined ? {} : { engineRules: legacy })).toBe("legacy");
  });

  it("refuses a bare non-legacy name: it carries no overlay digest", () => {
    expect(() => rulesOfSave({ engineRules: "pocket-1.s1" })).toThrow(EngineRulesError);
    expect(() => rulesOfSave({ engineRules: "pocket-1.s1" })).toThrow(
      "This save was played with engine rules pocket-1.s1 and carries no overlay digest; a save of non-legacy rules is stamped <name>@<digest>",
    );
  });

  it("refuses a malformed value", () => {
    for (const bad of ["pocket-1.s1@xyz", "@fnv1a:1a2b3c4d", "", "pocket-1.s1@fnv1a:1A2B3C4D", "pocket-1.s1@fnv1a:1a2b3c4", "Pocket-1.s1@fnv1a:1a2b3c4d", "pocket-1.s1@@fnv1a:1a2b3c4d", "pocket-1.s9", "legacy@xyz"]) {
      expect(() => rulesOfSave({ engineRules: bad }), bad).toThrow(EngineRulesError);
      expect(() => rulesOfSave({ engineRules: bad }), bad).toThrow(/^This save's engine rules ".*" are malformed; a legacy save carries none, and any other is stamped <name>@fnv1a:<8 hex digits>$/);
    }
  });

  it("refuses legacy with an overlay digest, with its own message (checker A6)", () => {
    expect(() => rulesOfSave({ engineRules: "legacy@fnv1a:1a2b3c4d" })).toThrow(EngineRulesError);
    expect(() => rulesOfSave({ engineRules: "legacy@fnv1a:1a2b3c4d" })).toThrow("This save names engine rules legacy with an overlay digest; a legacy save carries none");
  });

  it("refuses rules this version does not have, as the season command refuses a caller", () => {
    expect(() => rulesOfSave({ engineRules: "pocket-1.s9@fnv1a:1a2b3c4d" })).toThrow(EngineRulesError);
    expect(() => rulesOfSave({ engineRules: "pocket-1.s9@fnv1a:1a2b3c4d" })).toThrow("This save was played with engine rules pocket-1.s9, which this version does not have");
  });

  it("refuses a known name at an overlay digest that is not this build's", () => {
    expect(() => rulesOfSave({ engineRules: "pocket-1.s1@fnv1a:00000000" })).toThrow(EngineRulesError);
    expect(() => rulesOfSave({ engineRules: "pocket-1.s1@fnv1a:00000000" })).toThrow(
      `This save was played with engine rules pocket-1.s1 at overlay fnv1a:00000000; this build's pocket-1.s1 is ${RECORDED_POCKET_1_S1_DIGEST}`,
    );
  });
});

describe("when the name is written (O11)", () => {
  it("identity, provenance and save: nothing for legacy, so they stay byte for byte today's", () => {
    expect(rulesStampUnlessLegacy("legacy")).toEqual({});
    expect(Object.keys(rulesStampUnlessLegacy("legacy", "fnv1a:00000000"))).toEqual([]);
    expect(JSON.stringify({ a: 1, ...rulesStampUnlessLegacy("legacy") })).toBe(JSON.stringify({ a: 1 }));
  });

  it("identity and provenance: any other name is written, whatever this build has, with its digest when given", () => {
    expect(rulesStampUnlessLegacy("pocket-1.s1")).toEqual({ engineRules: "pocket-1.s1" });
    expect(rulesStampUnlessLegacy("pocket-1.s1", "fnv1a:1234abcd")).toEqual({ engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:1234abcd" });
  });

  it("export and --out: the name always, the digest never for legacy", () => {
    expect(rulesStampAlways("legacy")).toEqual({ engineRules: "legacy" });
    expect(rulesStampAlways("legacy", "fnv1a:00000000")).toEqual({ engineRules: "legacy" });
    expect(rulesStampAlways("pocket-1.s1")).toEqual({ engineRules: "pocket-1.s1" });
    expect(rulesStampAlways("pocket-1.s1", "fnv1a:1234abcd")).toEqual({ engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:1234abcd" });
  });
});

describe("pocket-1.s2, step 2's bundle (plan §1.2, §1.3, §1.8)", () => {
  const card = { pushMinMargin: 1, pushMaxMargin: 14 };
  const leaf = (t: Tunables, tunableId: string, currentValue: number, proposedValue: number): Tunables =>
    applyTunablePatch(t, { tunableId, currentValue, proposedValue, evidence: "test", expectedEffect: "test" });
  /** DEFAULT_TUNABLES with Half and Follows, the base `pocket-1.s2` is stamped on. */
  const horizons = (): Tunables => POCKET_1_S2_LEAVES.reduce(applyTunablePatch, DEFAULT_TUNABLES);

  it("its leaves are Half and Follows from DEFAULT_TUNABLES' own values, and DEFAULT_TUNABLES does not move", () => {
    expect(POCKET_1_S2_LEAVES.map((p) => [p.tunableId, p.currentValue, p.proposedValue])).toEqual([
      ["arrival.collapsingWithinSeconds", 1.0, 0.5],
      ["arrival.pressureWithinSeconds", 2.0, 1.0],
    ]);
    for (const p of POCKET_1_S2_LEAVES) expect(p.evidence).toBe("ADR-089 §4.3, Half and Follows; D32");
    expect(DEFAULT_TUNABLES.arrival.collapsingWithinSeconds).toBe(1.0);
    expect(DEFAULT_TUNABLES.arrival.pressureWithinSeconds).toBe(2.0);
    expect(DEFAULT_TUNABLES.arrival.immediateWithinSeconds).toBe(0.0);
    // The July rule on the defaults: P = C + (C - I).
    const d = DEFAULT_TUNABLES.arrival;
    expect(d.pressureWithinSeconds).toBe(d.collapsingWithinSeconds + (d.collapsingWithinSeconds - d.immediateWithinSeconds));
    expect("forcing" in DEFAULT_TUNABLES.pocket).toBe(false);
    expect(stableDigest(DEFAULT_TUNABLES)).toBe("fnv1a:395a9ae2");
    expect(Object.isFrozen(POCKET_1_S2_LEAVES)).toBe(true);
    expect(POCKET_1_S2_FORCING).toEqual({ rule: "PER_RUSHER" });
    expect(Object.isFrozen(POCKET_1_S2_FORCING)).toBe(true);
    expect([...FORCING_RULES]).toEqual(["PER_RUSHER", "COUNTER_LESS_SEEN"]);
  });

  it("is step 1's blocks, Half and Follows, and must act per rusher on DEFAULT_TUNABLES, stamped at the recorded digest", () => {
    const b = rulesTunables("pocket-1.s2");
    expect(rulesTunables("pocket-1.s2")).toBe(b);
    expect(b.engineRules).toEqual({ name: "pocket-1.s2", overlayDigest: RECORDED_POCKET_1_S2_DIGEST });
    expect(overlayDigestOf(b)).toBe(RECORDED_POCKET_1_S2_DIGEST);
    expect(b.passRush.beatClock).toEqual(POCKET_1_S1_OVERLAY.beatClock);
    expect(b.passRush.approach).toEqual(POCKET_1_S1_OVERLAY.approach);
    expect(b.passRush.repClock).toBeUndefined();
    expect(b.pocket.forcing).toEqual({ rule: "PER_RUSHER" });
    expect(Object.keys(b.pocket.forcing!)).toEqual(["rule"]);
    // Half and Follows, and the July rule kept: P = C + (C - I) = 0.5 + (0.5 - 0.0) (plan §1.3).
    const a = b.arrival;
    expect([a.collapsingWithinSeconds, a.pressureWithinSeconds, a.immediateWithinSeconds]).toEqual([0.5, 1.0, 0.0]);
    expect(a.pressureWithinSeconds).toBe(a.collapsingWithinSeconds + (a.collapsingWithinSeconds - a.immediateWithinSeconds));
    // O28: the digest is of the tunables less the stamp, built here by hand.
    const h = horizons();
    expect(stableDigest({ ...h, passRush: { ...h.passRush, ...POCKET_1_S1_OVERLAY }, pocket: { ...h.pocket, forcing: { rule: "PER_RUSHER" } } })).toBe(RECORDED_POCKET_1_S2_DIGEST);
    // Every leaf but the two horizons, the blocks and the stamp is DEFAULT_TUNABLES' own.
    const base = leaves(DEFAULT_TUNABLES);
    const after = leaves(b);
    const moved = [...after].filter(([p, v]) => base.get(p) !== v).map(([p]) => p).sort();
    expect(moved).toEqual([
      "arrival.collapsingWithinSeconds",
      "arrival.pressureWithinSeconds",
      "engineRules.name",
      "engineRules.overlayDigest",
      "passRush.approach.pushMaxMargin",
      "passRush.approach.pushMinMargin",
      "passRush.beatClock.pushWindow.lengthSeconds",
      "passRush.beatClock.pushWindow.maxMargin",
      "passRush.beatClock.pushWindow.minMargin",
      "passRush.beatClock.ratingWeight",
      "passRush.beatClock.shape",
      "passRush.beatClock.thetaSeconds",
      "pocket.forcing.rule",
    ]);
    expect([...base.keys()].filter((p) => !after.has(p))).toEqual([]);
    expect(checkStamp(b, "pocket-1.s2")).toBe(b);
    for (const [path, node] of nodes(b)) expect(Object.isFrozen(node), path).toBe(true);
  });

  it("is another bundle than pocket-1.s1, which keeps step 1's forcing rule and its digest", () => {
    const s1 = rulesTunables("pocket-1.s1");
    const s2 = rulesTunables("pocket-1.s2");
    expect("forcing" in s1.pocket).toBe(false);
    expect(s1.engineRules?.overlayDigest).toBe(RECORDED_POCKET_1_S1_DIGEST);
    expect(RECORDED_POCKET_1_S2_DIGEST).not.toBe(RECORDED_POCKET_1_S1_DIGEST);
    expect(stableDigest(s2)).not.toBe(stableDigest(s1));
    // O28: the digest names the dials, the name names the code. Step 1's dials stamped pocket-1.s2
    // digest as pocket-1.s1 does; only the stamp's name tells them apart.
    const sameDials = withOverlay(DEFAULT_TUNABLES, "pocket-1.s2", POCKET_1_S1_OVERLAY);
    expect(sameDials.engineRules).toEqual({ name: "pocket-1.s2", overlayDigest: RECORDED_POCKET_1_S1_DIGEST });
  });

  it("withOverlay adds the forcing key only when it is given, and copies it", () => {
    const without = withOverlay(horizons(), "pocket-1.s2", POCKET_1_S1_OVERLAY);
    expect("forcing" in without.pocket).toBe(false);
    expect(Object.keys(without.pocket)).toEqual(Object.keys(DEFAULT_TUNABLES.pocket));
    const forcing: PocketForcing = { rule: "COUNTER_LESS_SEEN" };
    const withRule = withOverlay(horizons(), "pocket-1.s2", POCKET_1_S1_OVERLAY, forcing);
    expect(Object.keys(withRule.pocket)).toEqual([...Object.keys(DEFAULT_TUNABLES.pocket), "forcing"]);
    expect(withRule.pocket.forcing).toEqual({ rule: "COUNTER_LESS_SEEN" });
    expect(withRule.pocket.forcing).not.toBe(forcing);
    expect(Object.isFrozen(forcing)).toBe(false);
    expect(Object.isFrozen(withRule.pocket.forcing)).toBe(true);
    // Every rule of the closed set is a bundle, under S and under L, and the rule is in the digest.
    const digests = new Set<string>();
    for (const rule of FORCING_RULES) {
      for (const blocks of [POCKET_1_S1_OVERLAY, { repClock: { fullExpressionSeconds: 8 }, approach: card }]) {
        const t = withOverlay(horizons(), "pocket-1.s2", blocks, { rule });
        expect(checkStamp(t, "pocket-1.s2")).toBe(t);
        digests.add(t.engineRules!.overlayDigest);
      }
    }
    expect(digests.size).toBe(4);
    expect(digests.has(without.engineRules!.overlayDigest)).toBe(false);
  });

  it("withOverlay refuses the forcing block on a base that has one, under pocket-1.s1, and outside the closed set", () => {
    const forced: Tunables = { ...DEFAULT_TUNABLES, pocket: { ...DEFAULT_TUNABLES.pocket, forcing: { rule: "PER_RUSHER" } } };
    const cases: [string, () => unknown, string][] = [
      ["a base with a forcing block", () => withOverlay(forced, "pocket-1.s2", POCKET_1_S1_OVERLAY), "withOverlay(pocket-1.s2): the base already carries pocket.forcing; a bundle's blocks come from its overlay"],
      ["a base with a forcing block, given one too", () => withOverlay(forced, "pocket-1.s2", POCKET_1_S1_OVERLAY, POCKET_1_S2_FORCING), "withOverlay(pocket-1.s2): the base already carries pocket.forcing; a bundle's blocks come from its overlay"],
      [
        "a forcing block under pocket-1.s1",
        () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", POCKET_1_S1_OVERLAY, POCKET_1_S2_FORCING),
        "withOverlay(pocket-1.s1): pocket-1.s1 plays step 1's forcing rule and carries no forcing block (pocket.forcing); must act per rusher is pocket-1.s2's (ADR-089 step 2)",
      ],
      ["the counter rule under pocket-1.s1", () => withOverlay(DEFAULT_TUNABLES, "pocket-1.s1", POCKET_1_S1_OVERLAY, { rule: "COUNTER_LESS_SEEN" }), "withOverlay(pocket-1.s1): pocket-1.s1 plays step 1's forcing rule"],
      ["step 1's rule by name", () => withOverlay(horizons(), "pocket-1.s2", POCKET_1_S1_OVERLAY, { rule: "STEP_1" } as never), "withOverlay(pocket-1.s2): the forcing block's rule (pocket.forcing.rule) is STEP_1, which is not one of PER_RUSHER, COUNTER_LESS_SEEN"],
      ["a rule in the wrong case", () => withOverlay(horizons(), "pocket-1.s2", POCKET_1_S1_OVERLAY, { rule: "per_rusher" } as never), "withOverlay(pocket-1.s2): the forcing block's rule (pocket.forcing.rule) is per_rusher, which is not one of PER_RUSHER, COUNTER_LESS_SEEN"],
      ["no rule", () => withOverlay(horizons(), "pocket-1.s2", POCKET_1_S1_OVERLAY, {} as never), "withOverlay(pocket-1.s2): the forcing block's rule (pocket.forcing.rule) is undefined, which is not one of PER_RUSHER, COUNTER_LESS_SEEN"],
      ["a block that is not an object", () => withOverlay(horizons(), "pocket-1.s2", POCKET_1_S1_OVERLAY, "PER_RUSHER" as never), "withOverlay(pocket-1.s2): the forcing block (pocket.forcing) must be an object { rule }, got PER_RUSHER"],
      ["a null block", () => withOverlay(horizons(), "pocket-1.s2", POCKET_1_S1_OVERLAY, null as never), "withOverlay(pocket-1.s2): the forcing block (pocket.forcing) must be an object { rule }, got null"],
    ];
    for (const [label, run, message] of cases) {
      expect(run, label).toThrow(EngineRulesError);
      expect(run, label).toThrow(message);
    }
  });

  it("under PER_RUSHER, refuses a forcing point the engine would refuse; COUNTER_LESS_SEEN is free of those checks", () => {
    const iAboveC = leaf(horizons(), "arrival.immediateWithinSeconds", 0, 0.6);
    const cases: [string, Tunables, string][] = [
      ["a negative forcing point", leaf(DEFAULT_TUNABLES, "arrival.collapsingWithinSeconds", 1.0, -0.5), "arrival.collapsingWithinSeconds (must act's threat part) must be a finite number, 0 or more, got -0.5"],
      ["a forcing point that is not a number", leaf(DEFAULT_TUNABLES, "arrival.collapsingWithinSeconds", 1.0, Number.NaN), "arrival.collapsingWithinSeconds (must act's threat part) must be a finite number, 0 or more, got NaN"],
      ["IMMEDIATE above the forcing point", iAboveC, "arrival.immediateWithinSeconds (0.6) may not lie above arrival.collapsingWithinSeconds (0.5): an IMMEDIATE from an arrival would not force"],
      ["IMMEDIATE not a number", leaf(DEFAULT_TUNABLES, "arrival.immediateWithinSeconds", 0, Number.NaN), "arrival.immediateWithinSeconds (NaN) may not lie above arrival.collapsingWithinSeconds (1): an IMMEDIATE from an arrival would not force"],
      ["IMMEDIATE below 0 (review CT-F4)", leaf(DEFAULT_TUNABLES, "arrival.immediateWithinSeconds", 0, -0.1), "arrival.immediateWithinSeconds must be 0 or more, as the forcing point is, got -0.1: an arrived threat would not read IMMEDIATE"],
    ];
    for (const [label, base, message] of cases) {
      expect(() => withOverlay(base, "pocket-1.s2", POCKET_1_S1_OVERLAY, POCKET_1_S2_FORCING), label).toThrow(EngineRulesError);
      expect(() => withOverlay(base, "pocket-1.s2", POCKET_1_S1_OVERLAY, POCKET_1_S2_FORCING), label).toThrow(`withOverlay(pocket-1.s2): under pocket.forcing PER_RUSHER, ${message}`);
      // The same dials stamped by hand, the digest right, are refused by checkStamp the same way.
      const unstamped: Tunables = { ...base, passRush: { ...base.passRush, ...POCKET_1_S1_OVERLAY }, pocket: { ...base.pocket, forcing: POCKET_1_S2_FORCING } };
      const byHand: Tunables = { ...unstamped, engineRules: { name: "pocket-1.s2", overlayDigest: overlayDigestOf(unstamped) } };
      expect(() => checkStamp(byHand, "pocket-1.s2", "runBatch"), label).toThrow(`runBatch: under pocket.forcing PER_RUSHER, ${message}`);
      // Without the forcing block, or under the narrower rule, the arrival checks do not apply.
      expect(withOverlay(base, "pocket-1.s2", POCKET_1_S1_OVERLAY).engineRules?.name, label).toBe("pocket-1.s2");
      expect(withOverlay(base, "pocket-1.s2", POCKET_1_S1_OVERLAY, { rule: "COUNTER_LESS_SEEN" }).pocket.forcing, label).toEqual({ rule: "COUNTER_LESS_SEEN" });
    }
    // A forcing point of 0 with IMMEDIATE at 0 is a bundle, as the engine accepts it.
    const zero = leaf(leaf(DEFAULT_TUNABLES, "arrival.collapsingWithinSeconds", 1.0, 0), "arrival.pressureWithinSeconds", 2.0, 0);
    expect(withOverlay(zero, "pocket-1.s2", POCKET_1_S1_OVERLAY, POCKET_1_S2_FORCING).pocket.forcing).toEqual({ rule: "PER_RUSHER" });
  });

  it("checkStamp sees the forcing block: refused under legacy and under pocket-1.s1, and a forcing rule changed after stamping", () => {
    const s2 = rulesTunables("pocket-1.s2");
    const forcingOnly: Tunables = { ...DEFAULT_TUNABLES, pocket: { ...DEFAULT_TUNABLES.pocket, forcing: { rule: "PER_RUSHER" } } };
    const blocksAndForcing: Tunables = { ...forcingOnly, passRush: { ...DEFAULT_TUNABLES.passRush, ...POCKET_1_S1_OVERLAY } };
    const s1Unstamped: Tunables = { ...DEFAULT_TUNABLES, passRush: { ...DEFAULT_TUNABLES.passRush, ...POCKET_1_S1_OVERLAY }, pocket: { ...DEFAULT_TUNABLES.pocket, forcing: { rule: "PER_RUSHER" } } };
    const s1ByHand: Tunables = { ...s1Unstamped, engineRules: { name: "pocket-1.s1", overlayDigest: overlayDigestOf(s1Unstamped) } };
    const ruleChanged = applyTunablePatch(s2, { tunableId: "pocket.forcing.rule", currentValue: "PER_RUSHER", proposedValue: "COUNTER_LESS_SEEN", evidence: "test", expectedEffect: "test" });
    const { forcing: _f, ...pocketWithout } = s2.pocket;
    const forcingDropped: Tunables = { ...s2, pocket: pocketWithout };
    const cases: [string, () => unknown, string | RegExp][] = [
      ["legacy named, a forcing block alone", () => checkStamp(forcingOnly, "legacy", "w"), "w: the run names engine rules legacy, but the tunables carry pocket.forcing with no rules stamp"],
      ["legacy named, the blocks and a forcing block", () => checkStamp(blocksAndForcing, "legacy", "w"), "w: the run names engine rules legacy, but the tunables carry passRush.beatClock, passRush.approach, pocket.forcing with no rules stamp"],
      ["legacy named, pocket-1.s2 passed", () => checkStamp(s2, "legacy", "w"), "w: the run names engine rules legacy, but the tunables carry the rules stamp pocket-1.s2"],
      ["pocket-1.s1 named, a forcing block stamped by hand", () => checkStamp(s1ByHand, "pocket-1.s1", "w"), "w: pocket-1.s1 plays step 1's forcing rule and carries no forcing block (pocket.forcing); must act per rusher is pocket-1.s2's (ADR-089 step 2)"],
      ["pocket-1.s1 named, pocket-1.s2 passed", () => checkStamp(s2, "pocket-1.s1", "w"), "w: the run names engine rules pocket-1.s1, but the tunables are stamped pocket-1.s2"],
      ["the rule changed after stamping", () => checkStamp(ruleChanged, "pocket-1.s2", "w"), /^w: the tunables are stamped pocket-1.s2 at overlay fnv1a:03754f60, but they digest to fnv1a:[0-9a-f]{8}: a dial changed after stamping$/],
      ["the block dropped after stamping", () => checkStamp(forcingDropped, "pocket-1.s2", "w"), /^w: the tunables are stamped pocket-1.s2 at overlay fnv1a:03754f60, but they digest to fnv1a:[0-9a-f]{8}: a dial changed after stamping$/],
      ["a horizon patched after stamping", () => checkStamp(leaf(s2, "arrival.pressureWithinSeconds", 1.0, 2.0), "pocket-1.s2", "w"), /a dial changed after stamping$/],
    ];
    for (const [label, run, message] of cases) {
      expect(run, label).toThrow(EngineRulesError);
      expect(run, label).toThrow(message);
    }
    // A pocket-1.s2 bundle with no forcing block plays step 1's rule under the step-2 name (B2, B5, B7).
    const noForcing = withOverlay(horizons(), "pocket-1.s2", POCKET_1_S1_OVERLAY);
    expect(checkStamp(noForcing, "pocket-1.s2")).toBe(noForcing);
  });

  it("keeps the July rule P = C + (C - I), and of the step-2 arms only the alone arms B1 and B2 break it (plan §1.3, O37)", () => {
    const keeps = (t: Tunables): boolean => {
      const a = t.arrival;
      return a.pressureWithinSeconds === a.collapsingWithinSeconds + (a.collapsingWithinSeconds - a.immediateWithinSeconds);
    };
    expect(keeps(rulesTunables("pocket-1.s2"))).toBe(true);
    expect(step2Arms().filter((a) => !keeps(a.tunables)).map((a) => a.id)).toEqual(["B1", "B2"]);
    for (const a of allArms()) expect(keeps(a.tunables), a.id).toBe(true);
    // B1: the forcing point at 0.5 s, the warning left at 2.0 s. B2: the warning at 1.0 s with the
    // forcing point at 1.0 s, so the arrival floor's PRESSURE rung is empty (P = C).
    const b1 = armById("B1").tunables.arrival;
    const b2 = armById("B2").tunables.arrival;
    expect([b1.collapsingWithinSeconds, b1.pressureWithinSeconds]).toEqual([0.5, 2.0]);
    expect([b2.collapsingWithinSeconds, b2.pressureWithinSeconds]).toEqual([1.0, 1.0]);
    expect(b2.pressureWithinSeconds).toBe(b2.collapsingWithinSeconds);
  });

  it("is written down like any non-legacy bundle (O11)", () => {
    expect(rulesStampUnlessLegacy("pocket-1.s2", RECORDED_POCKET_1_S2_DIGEST)).toEqual({ engineRules: "pocket-1.s2", engineRulesDigest: RECORDED_POCKET_1_S2_DIGEST });
    expect(rulesStampAlways("pocket-1.s2", RECORDED_POCKET_1_S2_DIGEST)).toEqual({ engineRules: "pocket-1.s2", engineRulesDigest: RECORDED_POCKET_1_S2_DIGEST });
  });
});

// Type-level: the overlay is typed from the engine's own Tunables, so a block the engine does not
// know is a compile error, not a silent extra key.
const _typed: PocketOverlay = POCKET_1_S1_OVERLAY;
// @ts-expect-error a block that is not a pocket-1 block of passRush
const _unknownBlock: PocketOverlay = { lateClock: { seconds: 1 } };
void _typed;
void _unknownBlock;
// And the forcing block too: a rule outside the engine's closed set does not compile.
const _forcing: PocketForcing = POCKET_1_S2_FORCING;
// @ts-expect-error a forcing rule the engine does not have
const _unknownRule: PocketForcing = { rule: "STEP_1" };
void _forcing;
void _unknownRule;
