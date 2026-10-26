/**
 * ADR-089 — THE ENGINE RULES NAME AND ITS BUNDLES (`src/pocket/rules.ts`; step 0's plan §4,
 * deviation O11; step 1's plan §3, §4, §7.2 items 1 and 11, §16.4).
 *
 *  1. This build has `legacy` and `pocket-1.s1`, and `legacy` is the default (§9: "main's default
 *     stays `legacy` until step 11's flip commit").
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
 */
import { describe, expect, it } from "vitest";
import { applyTunablePatch, DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { stableDigest } from "../src/harness/digest.js";
import {
  DEFAULT_ENGINE_RULES,
  ENGINE_RULES,
  EngineRulesError,
  LEGACY_RULES,
  POCKET_1_S1_DIGEST,
  POCKET_1_S1_OVERLAY,
  POCKET_1_S1_RULES,
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
  type PocketOverlay,
} from "../src/pocket/rules.js";

/** K18's literal: the overlay digest of `pocket-1.s1` on this build (N9). Re-recorded only under K24. */
const RECORDED_POCKET_1_S1_DIGEST = "fnv1a:69a7cc48";

/** Every object node of a tree, with its path. */
function nodes(value: unknown, path = "$"): [string, object][] {
  if (typeof value !== "object" || value === null) return [];
  return [[path, value], ...Object.entries(value).flatMap(([k, v]) => nodes(v, `${path}.${k}`))];
}

describe("the rules this build has (ADR-089 §9)", () => {
  it("is legacy and pocket-1.s1, and legacy is the default", () => {
    expect(LEGACY_RULES).toBe("legacy");
    expect(POCKET_1_S1_RULES).toBe("pocket-1.s1");
    expect([...ENGINE_RULES]).toEqual(["legacy", "pocket-1.s1"]);
    expect(DEFAULT_ENGINE_RULES).toBe("legacy");
    expect(isEngineRules("legacy")).toBe(true);
    expect(isEngineRules("pocket-1")).toBe(false);
    expect(isEngineRules("pocket-1.s1")).toBe(true);
  });

  it("checks a named bundle: absent is the default, an unknown name or the word default is refused", () => {
    expect(engineRulesNamed(undefined, "here")).toBe("legacy");
    expect(engineRulesNamed("legacy", "here")).toBe("legacy");
    expect(engineRulesNamed("pocket-1.s1", "here")).toBe("pocket-1.s1");
    for (const bad of ["pocket-1", "pocket-1.s9", "default", "", "Legacy", `pocket-1.s1@${POCKET_1_S1_DIGEST}`]) {
      expect(() => engineRulesNamed(bad, "here")).toThrow(EngineRulesError);
    }
    expect(() => engineRulesNamed("pocket-1.s9", "runBatch")).toThrow(/^runBatch: engine rules "pocket-1.s9" are not in this build, which has legacy, pocket-1.s1/);
  });

  it("legacy has no overlay digest; pocket-1.s1's is the recorded literal", () => {
    expect(engineRulesDigestOf("legacy")).toBeUndefined();
    expect(engineRulesDigestOf("pocket-1.s1")).toBe(POCKET_1_S1_DIGEST);
    expect(POCKET_1_S1_DIGEST).toBe(RECORDED_POCKET_1_S1_DIGEST);
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

// Type-level: the overlay is typed from the engine's own Tunables, so a block the engine does not
// know is a compile error, not a silent extra key.
const _typed: PocketOverlay = POCKET_1_S1_OVERLAY;
// @ts-expect-error a block that is not a pocket-1 block of passRush
const _unknownBlock: PocketOverlay = { lateClock: { seconds: 1 } };
void _typed;
void _unknownBlock;
