/**
 * ADR-089 step 1 — the switch, read once a play (`sim/pocketRules.ts`, plan §4).
 *
 * Only closed sets are accepted: no block and no stamp is `legacy`; `beatClock` (with or without
 * its window) with the approach card and a stamp is shape S; `repClock` with the card and a stamp
 * is shape L. Everything else is refused before a single die, with a `PocketRulesError`.
 */
import { describe, expect, it } from "vitest";
import * as barrel from "../src/index.js";
import { simulatePassPlay } from "../src/index.js";
import { PocketRulesError, pocketRulesOf } from "../src/sim/pocketRules.js";
import { DEFAULT_TUNABLES, TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type { EngineRulesStamp, Tunables } from "../src/tunables.js";
import { buildScenario } from "./fixtures.js";
import {
  APPROACH_CARD,
  BEAT_CLOCK,
  BEAT_CLOCK_WITH_WINDOW,
  L5_TUNABLES,
  S_TUNABLES,
  SW_TUNABLES,
  stamp,
  withBlocks,
} from "./pocketTunables.js";

const STAMP = stamp("fnv1a:0badc0de");

function refusal(tunables: Tunables): string {
  try {
    pocketRulesOf(tunables);
  } catch (e) {
    expect(e).toBeInstanceOf(PocketRulesError);
    expect(e).toBeInstanceOf(Error);
    expect((e as Error).name).toBe("PocketRulesError");
    expect((e as Error).message.startsWith("@ff/engine: ")).toBe(true);
    return (e as Error).message;
  }
  throw new Error("expected a PocketRulesError");
}

describe("ADR-089 step 1 — the closed sets", () => {
  it("legacy: DEFAULT_TUNABLES, the raw table and any patch of them carry no block and no stamp", () => {
    const legacy = pocketRulesOf(DEFAULT_TUNABLES);
    expect(legacy).toEqual({ kind: "LEGACY" });
    expect(Object.isFrozen(legacy)).toBe(true);
    expect(pocketRulesOf(TUNABLES)).toBe(legacy);
    const patched = applyTunablePatch(DEFAULT_TUNABLES, {
      tunableId: "passRush.repJitter.divisor",
      currentValue: 4,
      proposedValue: 5,
      evidence: "pocketRules.test.ts",
      expectedEffect: "none on the switch",
    });
    expect(pocketRulesOf(patched)).toBe(legacy);
  });

  it("shape S, with and without the push window", () => {
    const s = pocketRulesOf(S_TUNABLES);
    if (s.kind !== "S") throw new Error("not S");
    expect(s.beatClock).toBe(BEAT_CLOCK);
    expect(s.beatClock.pushWindow).toBeUndefined();
    expect(s.approach).toBe(APPROACH_CARD);
    expect(s.rules).toEqual({ name: "pocket-1.s1", overlayDigest: "fnv1a:5a000001" });
    expect(Object.isFrozen(s.rules)).toBe(true);
    const sw = pocketRulesOf(SW_TUNABLES);
    if (sw.kind !== "S") throw new Error("not S");
    expect(sw.beatClock).toBe(BEAT_CLOCK_WITH_WINDOW);
    expect(sw.beatClock.pushWindow).toEqual({ minMargin: 1, maxMargin: 14, lengthSeconds: 1.0 });
  });

  it("shape L", () => {
    const l = pocketRulesOf(L5_TUNABLES);
    if (l.kind !== "L") throw new Error("not L");
    expect(l.repClock).toEqual({ fullExpressionSeconds: 5 });
    expect(l.approach).toBe(APPROACH_CARD);
    expect(l.rules).toEqual({ name: "pocket-1.s1", overlayDigest: "fnv1a:1c000005" });
  });

  it("accepts a window of a whole number of tick steps, two or more, on the tunables' own grid (CT-2)", () => {
    const sWith = (base: Tunables, lengthSeconds: number): Tunables =>
      withBlocks(base, { beatClock: { ...BEAT_CLOCK, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds } }, approach: APPROACH_CARD }, STAMP);
    for (const lengthSeconds of [1.0, 1.5, 2.0]) expect(pocketRulesOf(sWith(DEFAULT_TUNABLES, lengthSeconds)).kind).toBe("S");
    // The grid is the tunables' own: on a 0.25 s step a 0.5 s window is two steps.
    const fine = applyTunablePatch(DEFAULT_TUNABLES, {
      tunableId: "clock.tickStepSeconds",
      currentValue: DEFAULT_TUNABLES.clock.tickStepSeconds,
      proposedValue: 0.25,
      evidence: "pocketRules.test.ts",
      expectedEffect: "the window's grid",
    });
    expect(pocketRulesOf(sWith(fine, 0.5)).kind).toBe("S");
    expect(() => pocketRulesOf(sWith(fine, 0.25))).toThrow(/whole number of tick steps \(0\.25 s\), at least 2/);
  });

  it("accepts pocket-1 itself and mid-build pocket-1.s<step> names", () => {
    for (const name of ["pocket-1", "pocket-1.s1", "pocket-1.s11", "pocket-1.s5b"]) {
      expect(pocketRulesOf(withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK, approach: APPROACH_CARD }, stamp("fnv1a:1", name))).kind).toBe("S");
    }
  });
});

describe("ADR-089 step 1 — every refusal, before any die", () => {
  const beat = { beatClock: BEAT_CLOCK, approach: APPROACH_CARD };
  const cases: [string, Tunables, string][] = [
    [
      "both clocks",
      withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK, repClock: { fullExpressionSeconds: 5 }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: the tunables carry both block clocks (passRush.beatClock and passRush.repClock); a bundle runs one",
    ],
    [
      "S's clock without the approach card",
      withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK }, STAMP),
      "@ff/engine: a block clock without the approach card (passRush.approach); pocket-1 publishes the approach on every threat",
    ],
    [
      "L's clock without the approach card",
      withBlocks(DEFAULT_TUNABLES, { repClock: { fullExpressionSeconds: 5 } }, STAMP),
      "@ff/engine: a block clock without the approach card (passRush.approach); pocket-1 publishes the approach on every threat",
    ],
    [
      "the approach card without a clock",
      withBlocks(DEFAULT_TUNABLES, { approach: APPROACH_CARD }, STAMP),
      "@ff/engine: the approach card (passRush.approach) without a block clock (passRush.beatClock or passRush.repClock)",
    ],
    [
      "a block without a stamp",
      withBlocks(DEFAULT_TUNABLES, beat),
      "@ff/engine: a pocket-1 overlay without its rules stamp (engineRules { name, overlayDigest })",
    ],
    [
      "a stamp without a block",
      withBlocks(DEFAULT_TUNABLES, {}, STAMP),
      "@ff/engine: a rules stamp (pocket-1.s1) without a pocket-1 block; legacy carries no stamp",
    ],
    [
      "a stamp named legacy, with no block",
      withBlocks(DEFAULT_TUNABLES, {}, stamp("fnv1a:0badc0de", "legacy")),
      "@ff/engine: a rules stamp (legacy) without a pocket-1 block; legacy carries no stamp",
    ],
    [
      "a stamp named legacy, on a block",
      withBlocks(DEFAULT_TUNABLES, beat, stamp("fnv1a:0badc0de", "legacy")),
      "@ff/engine: the rules stamp names legacy, which is not a pocket-1 rules name",
    ],
    [
      "a stamp that is not a pocket-1 name",
      withBlocks(DEFAULT_TUNABLES, beat, stamp("fnv1a:0badc0de", "pocket-2")),
      "@ff/engine: the rules stamp names pocket-2, which is not a pocket-1 rules name",
    ],
    [
      "a stamp in the wrong case",
      withBlocks(DEFAULT_TUNABLES, beat, stamp("fnv1a:0badc0de", "Pocket-1.S1")),
      "@ff/engine: the rules stamp names Pocket-1.S1, which is not a pocket-1 rules name",
    ],
    [
      "a stamp carrying a digest in its name",
      withBlocks(DEFAULT_TUNABLES, beat, stamp("fnv1a:0badc0de", "pocket-1.s1@fnv1a:0badc0de")),
      "@ff/engine: the rules stamp names pocket-1.s1@fnv1a:0badc0de, which is not a pocket-1 rules name",
    ],
    [
      "a stamp without its digest",
      withBlocks(DEFAULT_TUNABLES, beat, stamp("")),
      "@ff/engine: the rules stamp pocket-1.s1 carries no overlay digest",
    ],
    [
      "a theta of 0",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, thetaSeconds: 0 }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.thetaSeconds must be a finite number above 0, got 0",
    ],
    [
      "a negative shape",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, shape: -2 }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.shape must be a finite number above 0, got -2",
    ],
    [
      "a rating weight that is not a number",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, ratingWeight: Number.NaN }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.ratingWeight must be a finite number, got NaN",
    ],
    [
      "a window whose range runs backwards",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, pushWindow: { minMargin: 14, maxMargin: 1, lengthSeconds: 1 } }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.pushWindow runs from 14 to 1: its minimum is above its maximum",
    ],
    [
      "a window of no length",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 0 } }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.pushWindow.lengthSeconds must be a finite number above 0, got 0",
    ],
    // CT-2: the window's gaining tick is t_b - lengthSeconds, so the length must land on the tick grid
    // and be at least two steps, or the gaining tick is never played (off the grid) or falls on the
    // beaten tick (one step), and the BLOCKER_BEATEN tick §4.1.1 files is never played.
    [
      "a window one tick step long (its gaining tick would be its beaten tick)",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 0.5 } }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.pushWindow.lengthSeconds must be a whole number of tick steps (0.5 s), at least 2, so its gaining tick is a played tick before its beaten tick; got 0.5",
    ],
    [
      "a window off the tick grid",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 0.75 } }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.pushWindow.lengthSeconds must be a whole number of tick steps (0.5 s), at least 2, so its gaining tick is a played tick before its beaten tick; got 0.75",
    ],
    [
      "a window shorter than one tick step",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 0.25 } }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.pushWindow.lengthSeconds must be a whole number of tick steps (0.5 s), at least 2, so its gaining tick is a played tick before its beaten tick; got 0.25",
    ],
    [
      "a window of 1.3 s on the 0.5 s grid",
      withBlocks(DEFAULT_TUNABLES, { beatClock: { ...BEAT_CLOCK, pushWindow: { minMargin: 1, maxMargin: 14, lengthSeconds: 1.3 } }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.beatClock.pushWindow.lengthSeconds must be a whole number of tick steps (0.5 s), at least 2, so its gaining tick is a played tick before its beaten tick; got 1.3",
    ],
    [
      "a PUSH range that runs backwards",
      withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK, approach: { pushMinMargin: 9, pushMaxMargin: 2 } }, STAMP),
      "@ff/engine: the approach card's PUSH range runs from 9 to 2: its minimum is above its maximum",
    ],
    [
      "an R of 0",
      withBlocks(DEFAULT_TUNABLES, { repClock: { fullExpressionSeconds: 0 }, approach: APPROACH_CARD }, STAMP),
      "@ff/engine: passRush.repClock.fullExpressionSeconds must be a finite number above 0, got 0",
    ],
  ];

  for (const [what, tunables, message] of cases) {
    it(`refuses ${what}`, () => {
      expect(refusal(tunables)).toBe(message);
      // The play refuses it too, before PLAY_START: nothing is emitted, no die is thrown.
      const { state, calls } = buildScenario();
      expect(() => simulatePassPlay(state, calls, "refused", tunables)).toThrow(PocketRulesError);
    });
  }
});

describe("ADR-089 step 1 — the stamp is copied onto PLAY_START", () => {
  it("an extra run-time key on the stamp does not reach the stream (N2)", () => {
    const loud = { name: "pocket-1.s1", overlayDigest: "fnv1a:0badc0de", secret: "do not publish" } as EngineRulesStamp;
    const tunables = withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }, loud);
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "stamp-copy", tunables);
    const start = events[0]?.event;
    if (start?.type !== "PLAY_START") throw new Error("no PLAY_START");
    const rules = (start.payload as { rules?: unknown }).rules;
    expect(rules).toEqual({ name: "pocket-1.s1", overlayDigest: "fnv1a:0badc0de" });
    expect(Object.keys(rules as object)).toEqual(["name", "overlayDigest"]);
    expect(JSON.stringify(events)).not.toContain("do not publish");
  });

  it("is the engine's own: no barrel runtime name is added (plan §4)", () => {
    expect("PocketRulesError" in barrel).toBe(false);
    expect("pocketRulesOf" in barrel).toBe(false);
    expect("drawBeat" in barrel).toBe(false);
    expect("approachOf" in barrel).toBe(false);
  });
});
