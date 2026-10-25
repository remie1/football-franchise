/**
 * ADR-089 step 0 — THE ENGINE RULES NAME (`src/pocket/rules.ts`; plan §4, deviation O11).
 *
 *  1. This build has `legacy` only, and it is the default (§9: "main's default stays `legacy` until
 *     step 11's flip commit").
 *  2. A name is checked: absent is the default, a name this build does not have is refused, and so is
 *     the word "default", so nothing is ever stamped with anything but the rules that played.
 *  3. A save with no `engineRules` is `legacy` (P1, default D10); an unknown name refuses, as an
 *     unknown caller does.
 *  4. When a name is written: never for `legacy` on the identity, provenance and save; always on the
 *     export file and `--out`; the overlay digest only when the rules are not `legacy`.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENGINE_RULES,
  ENGINE_RULES,
  EngineRulesError,
  LEGACY_RULES,
  engineRulesDigestOf,
  engineRulesNamed,
  isEngineRules,
  playedUnder,
  rulesOfSave,
  rulesStampAlways,
  rulesStampUnlessLegacy,
} from "../src/pocket/rules.js";

describe("the rules this build has (ADR-089 §9)", () => {
  it("is legacy only, and legacy is the default", () => {
    expect(LEGACY_RULES).toBe("legacy");
    expect([...ENGINE_RULES]).toEqual(["legacy"]);
    expect(DEFAULT_ENGINE_RULES).toBe("legacy");
    expect(isEngineRules("legacy")).toBe(true);
    expect(isEngineRules("pocket-1")).toBe(false);
    expect(isEngineRules("pocket-1.s1")).toBe(false);
  });

  it("checks a named bundle: absent is the default, an unknown name or the word default is refused", () => {
    expect(engineRulesNamed(undefined, "here")).toBe("legacy");
    expect(engineRulesNamed("legacy", "here")).toBe("legacy");
    for (const bad of ["pocket-1", "pocket-1.s1", "default", "", "Legacy"]) {
      expect(() => engineRulesNamed(bad, "here")).toThrow(EngineRulesError);
    }
    expect(() => engineRulesNamed("pocket-1.s1", "runBatch")).toThrow(/^runBatch: engine rules "pocket-1.s1" are not in this build, which has legacy/);
  });

  it("legacy has no overlay digest, and every game this package plays is played under legacy (K4)", () => {
    expect(engineRulesDigestOf("legacy")).toBeUndefined();
    expect(playedUnder(engineRulesNamed(undefined, "here"))).toBe("legacy");
  });
});

describe("the rules a save was played with (P1)", () => {
  it("is legacy when the save names none, before P1 or since", () => {
    expect(rulesOfSave(undefined)).toBe("legacy");
    expect(rulesOfSave({})).toBe("legacy");
    expect(rulesOfSave({ caller: "v5" } as { engineRules?: string })).toBe("legacy");
    expect(rulesOfSave({ engineRules: "legacy" })).toBe("legacy");
  });

  it("refuses rules this version does not have, as the season command refuses a caller", () => {
    expect(() => rulesOfSave({ engineRules: "pocket-1.s1" })).toThrow(EngineRulesError);
    expect(() => rulesOfSave({ engineRules: "pocket-1.s1" })).toThrow("This save was played with engine rules pocket-1.s1, which this version does not have");
    expect(() => rulesOfSave({ engineRules: "" })).toThrow(/which this version does not have/);
  });
});

describe("when the name is written (O11)", () => {
  it("identity, provenance and save: nothing for legacy, so they stay byte for byte today's", () => {
    expect(rulesStampUnlessLegacy("legacy")).toEqual({});
    expect(Object.keys(rulesStampUnlessLegacy("legacy", "fnv1a:00000000"))).toEqual([]);
    expect(JSON.stringify({ a: 1, ...rulesStampUnlessLegacy("legacy") })).toBe(JSON.stringify({ a: 1 }));
  });

  it("identity, provenance and save: any other name is written, whatever this build has, with its digest when given", () => {
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
