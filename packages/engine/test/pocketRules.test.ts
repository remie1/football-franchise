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
import { P17_IN_CONTRACTS, P5_IN_CONTRACTS, PocketRulesError, pocketRulesOf, pocketRulesUnder } from "../src/sim/pocketRules.js";
import { DEFAULT_TUNABLES, TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type {
  ClimbLaneTunables,
  EngineRulesStamp,
  ForcingTunables,
  FreeRunTunables,
  LateBlockTunables,
  Tunables,
} from "../src/tunables.js";
import { buildScenario } from "./fixtures.js";
import {
  APPROACH_CARD,
  BEAT_CLOCK,
  BEAT_CLOCK_WITH_WINDOW,
  FREE_RUN_FILED,
  HOLD_REFERENCES,
  L5_TUNABLES,
  L8_TUNABLES,
  LATE_BLOCK_FILED,
  RULE_SETS,
  S3_TUNABLES,
  S_TUNABLES,
  SW_TUNABLES,
  stamp,
  withBlocks,
  withForcing,
  withStep3,
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

describe("ADR-089 step 2 — the forcing block (pocket.forcing), read once a play", () => {
  const PER_RUSHER: ForcingTunables = Object.freeze({ rule: "PER_RUSHER" });
  const COUNTER_LESS_SEEN: ForcingTunables = Object.freeze({ rule: "COUNTER_LESS_SEEN" });
  const arrival = (base: Tunables, leaf: "collapsingWithinSeconds" | "immediateWithinSeconds" | "pressureWithinSeconds", value: number): Tunables =>
    applyTunablePatch(base, {
      tunableId: `arrival.${leaf}`,
      currentValue: base.arrival[leaf],
      proposedValue: value,
      evidence: "pocketRules.test.ts",
      expectedEffect: "the forcing block's arrival checks",
    });
  /** A forcing block on SW's dials and stamp, on `base`'s other leaves. */
  const sw = (base: Tunables, forcing: unknown): Tunables =>
    withForcing(withBlocks(base, { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }, STAMP), forcing as ForcingTunables);

  it("absent is STEP_1 on every step-1 bundle, S and L alike; legacy carries no forcing at all", () => {
    for (const t of [S_TUNABLES, SW_TUNABLES, L5_TUNABLES, L8_TUNABLES]) {
      expect("forcing" in t.pocket).toBe(false);
      const r = pocketRulesOf(t);
      if (r.kind === "LEGACY") throw new Error("not a pocket-1 bundle");
      expect(r.forcing).toBe("STEP_1");
      expect(Object.isFrozen(r)).toBe(true);
    }
    expect("forcing" in DEFAULT_TUNABLES.pocket).toBe(false);
    expect(pocketRulesOf(DEFAULT_TUNABLES)).toEqual({ kind: "LEGACY" });
    expect("forcing" in pocketRulesOf(DEFAULT_TUNABLES)).toBe(false);
  });

  it("PER_RUSHER and COUNTER_LESS_SEEN, under S and under L, at today's and at step 2's horizons", () => {
    const half = arrival(arrival(DEFAULT_TUNABLES, "collapsingWithinSeconds", 0.5), "pressureWithinSeconds", 1.0);
    for (const base of [DEFAULT_TUNABLES, half]) {
      for (const forcing of [PER_RUSHER, COUNTER_LESS_SEEN]) {
        const s = pocketRulesOf(sw(base, forcing));
        if (s.kind !== "S") throw new Error("not S");
        expect(s.forcing).toBe(forcing.rule);
        expect(s.beatClock).toBe(BEAT_CLOCK_WITH_WINDOW);
        expect(s.rules).toEqual({ name: "pocket-1.s1", overlayDigest: "fnv1a:0badc0de" });
        const l = pocketRulesOf(withForcing(withBlocks(base, { repClock: { fullExpressionSeconds: 8 }, approach: APPROACH_CARD }, STAMP), forcing));
        if (l.kind !== "L") throw new Error("not L");
        expect(l.forcing).toBe(forcing.rule);
      }
    }
  });

  it("PER_RUSHER accepts a forcing point of 0 (arrivals only) and an IMMEDIATE horizon equal to it", () => {
    const zero = arrival(DEFAULT_TUNABLES, "collapsingWithinSeconds", 0);
    expect(zero.arrival.immediateWithinSeconds).toBe(0);
    const r = pocketRulesOf(sw(zero, PER_RUSHER));
    expect(r.kind === "S" && r.forcing).toBe("PER_RUSHER");
  });

  it("the arrival checks are PER_RUSHER's own: COUNTER_LESS_SEEN forces on the status, as step 1 does", () => {
    const above = arrival(arrival(DEFAULT_TUNABLES, "collapsingWithinSeconds", 0.5), "immediateWithinSeconds", 0.6);
    const r = pocketRulesOf(sw(above, COUNTER_LESS_SEEN));
    expect(r.kind === "S" && r.forcing).toBe("COUNTER_LESS_SEEN");
    expect(pocketRulesOf(withBlocks(above, { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }, STAMP)).kind).toBe("S");
  });

  it("is read from the tunables it is handed, never cached between plays", () => {
    const { state, calls } = buildScenario();
    expect(() => simulatePassPlay(state, calls, "forcing-read", sw(DEFAULT_TUNABLES, PER_RUSHER))).not.toThrow();
    expect(() => simulatePassPlay(state, calls, "forcing-read", sw(DEFAULT_TUNABLES, { rule: "NOT_A_RULE" }))).toThrow(PocketRulesError);
    expect(() => simulatePassPlay(state, calls, "forcing-read", sw(DEFAULT_TUNABLES, COUNTER_LESS_SEEN))).not.toThrow();
  });

  const beat = { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD };
  const cases: [string, Tunables, string][] = [
    [
      "a forcing block alone (no clock, no card, no stamp)",
      withForcing(DEFAULT_TUNABLES, PER_RUSHER),
      "@ff/engine: the forcing block (pocket.forcing) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule",
    ],
    [
      "a forcing block with a stamp and no clock",
      withForcing(withBlocks(DEFAULT_TUNABLES, {}, STAMP), COUNTER_LESS_SEEN),
      "@ff/engine: the forcing block (pocket.forcing) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule",
    ],
    [
      "a forcing block on a clock without its stamp",
      withForcing(withBlocks(DEFAULT_TUNABLES, beat), PER_RUSHER),
      "@ff/engine: the forcing block (pocket.forcing) without its rules stamp (engineRules { name, overlayDigest })",
    ],
    [
      "a forcing block that is not an object",
      sw(DEFAULT_TUNABLES, null),
      "@ff/engine: the forcing block (pocket.forcing) must be an object { rule }, got null",
    ],
    [
      "a forcing block without a rule",
      sw(DEFAULT_TUNABLES, {}),
      "@ff/engine: the forcing block's rule (pocket.forcing.rule) is undefined, which is not one of PER_RUSHER, COUNTER_LESS_SEEN",
    ],
    [
      "the play-level name STEP_1 as a rule (absent is step 1's rule)",
      sw(DEFAULT_TUNABLES, { rule: "STEP_1" }),
      "@ff/engine: the forcing block's rule (pocket.forcing.rule) is STEP_1, which is not one of PER_RUSHER, COUNTER_LESS_SEEN",
    ],
    [
      "a rule in the wrong case",
      sw(DEFAULT_TUNABLES, { rule: "per_rusher" }),
      "@ff/engine: the forcing block's rule (pocket.forcing.rule) is per_rusher, which is not one of PER_RUSHER, COUNTER_LESS_SEEN",
    ],
    [
      "PER_RUSHER with a negative forcing point",
      sw(arrival(DEFAULT_TUNABLES, "collapsingWithinSeconds", -0.5), PER_RUSHER),
      "@ff/engine: under pocket.forcing PER_RUSHER, arrival.collapsingWithinSeconds (must act's threat part) must be a finite number, 0 or more, got -0.5",
    ],
    [
      "PER_RUSHER with a forcing point that is not a number",
      sw(arrival(DEFAULT_TUNABLES, "collapsingWithinSeconds", Number.NaN), PER_RUSHER),
      "@ff/engine: under pocket.forcing PER_RUSHER, arrival.collapsingWithinSeconds (must act's threat part) must be a finite number, 0 or more, got NaN",
    ],
    [
      "PER_RUSHER with an infinite forcing point",
      sw(arrival(DEFAULT_TUNABLES, "collapsingWithinSeconds", Number.POSITIVE_INFINITY), PER_RUSHER),
      "@ff/engine: under pocket.forcing PER_RUSHER, arrival.collapsingWithinSeconds (must act's threat part) must be a finite number, 0 or more, got Infinity",
    ],
    [
      "PER_RUSHER with the IMMEDIATE horizon above the forcing point",
      sw(arrival(arrival(DEFAULT_TUNABLES, "collapsingWithinSeconds", 0.5), "immediateWithinSeconds", 0.6), PER_RUSHER),
      "@ff/engine: under pocket.forcing PER_RUSHER, arrival.immediateWithinSeconds (0.6) may not lie above arrival.collapsingWithinSeconds (0.5): an IMMEDIATE from an arrival would not force",
    ],
    [
      "PER_RUSHER with a negative IMMEDIATE horizon (review CT-F4)",
      sw(arrival(DEFAULT_TUNABLES, "immediateWithinSeconds", -0.1), PER_RUSHER),
      "@ff/engine: under pocket.forcing PER_RUSHER, arrival.immediateWithinSeconds must be 0 or more, as the forcing point is, got -0.1: an arrived threat would not read IMMEDIATE",
    ],
    [
      "PER_RUSHER with an IMMEDIATE horizon that is not a number",
      sw(arrival(DEFAULT_TUNABLES, "immediateWithinSeconds", Number.NaN), PER_RUSHER),
      "@ff/engine: under pocket.forcing PER_RUSHER, arrival.immediateWithinSeconds (NaN) may not lie above arrival.collapsingWithinSeconds (1): an IMMEDIATE from an arrival would not force",
    ],
  ];

  for (const [what, tunables, message] of cases) {
    it(`refuses ${what}, before any die`, () => {
      expect(refusal(tunables)).toBe(message);
      const { state, calls } = buildScenario();
      expect(() => simulatePassPlay(state, calls, "refused", tunables)).toThrow(PocketRulesError);
    });
  }

  it("the existing refusals keep their order: a forcing block does not mask a clock or card refusal", () => {
    expect(refusal(withForcing(withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK, repClock: { fullExpressionSeconds: 5 }, approach: APPROACH_CARD }, STAMP), PER_RUSHER))).toBe(
      "@ff/engine: the tunables carry both block clocks (passRush.beatClock and passRush.repClock); a bundle runs one",
    );
    expect(refusal(withForcing(withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK }, STAMP), PER_RUSHER))).toBe(
      "@ff/engine: a block clock without the approach card (passRush.approach); pocket-1 publishes the approach on every threat",
    );
    expect(refusal(withForcing(withBlocks(DEFAULT_TUNABLES, { approach: APPROACH_CARD }, STAMP), PER_RUSHER))).toBe(
      "@ff/engine: the approach card (passRush.approach) without a block clock (passRush.beatClock or passRush.repClock)",
    );
  });

  it("PLAY_START's rules keep their two keys: the forcing rule is named by the digest, not by a key", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "forcing-stamp", sw(DEFAULT_TUNABLES, PER_RUSHER));
    const start = events[0]?.event;
    if (start?.type !== "PLAY_START") throw new Error("no PLAY_START");
    const rules = (start.payload as { rules?: unknown }).rules;
    expect(rules).toEqual({ name: "pocket-1.s1", overlayDigest: "fnv1a:0badc0de" });
    expect(Object.keys(rules as object)).toEqual(["name", "overlayDigest"]);
    expect(JSON.stringify(start.payload)).not.toContain("PER_RUSHER");
  });
});

describe("ADR-089 step 3 — the free-run block, the late block and the climb lane, read once a play (plan §2.1)", () => {
  const S3 = stamp("fnv1a:5f000031", "pocket-1.s3");
  const sOn = (base: Tunables = DEFAULT_TUNABLES): Tunables => withBlocks(base, { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }, S3);
  const lOn = (base: Tunables = DEFAULT_TUNABLES): Tunables => withBlocks(base, { repClock: { fullExpressionSeconds: 8 }, approach: APPROACH_CARD }, S3);
  const freeRun = (patch: Record<string, unknown>): FreeRunTunables => ({ ...FREE_RUN_FILED, ...patch }) as unknown as FreeRunTunables;
  const late = (patch: Record<string, unknown>): LateBlockTunables => ({ ...LATE_BLOCK_FILED, ...patch }) as unknown as LateBlockTunables;
  const GRANTED = Object.freeze({ P5: true, P17: true });
  const NONE = Object.freeze({ P5: false, P17: false });

  it("DEFAULT_TUNABLES carries no step-3 block; legacy stays the bare LEGACY", () => {
    expect("freeRun" in DEFAULT_TUNABLES.blitzPickup).toBe(false);
    expect("lateBlock" in DEFAULT_TUNABLES.blitzPickup).toBe(false);
    expect("climbLane" in DEFAULT_TUNABLES.pocket).toBe(false);
    expect(pocketRulesOf(DEFAULT_TUNABLES)).toEqual({ kind: "LEGACY" });
    expect(Object.keys(pocketRulesOf(DEFAULT_TUNABLES))).toEqual(["kind"]);
  });

  it("every step-1 and step-2 bundle reads no block: today's set times, no late block, the INTERIOR climb lane, nothing published", () => {
    for (const { name, tunables } of RULE_SETS) {
      const r = pocketRulesOf(tunables);
      if (r.kind === "LEGACY") {
        expect(name).toBe("legacy");
        continue;
      }
      expect(r.freeRun, name).toBeUndefined();
      expect(r.lateBlock, name).toBeUndefined();
      expect(r.climbLane, name).toBe("INTERIOR");
      expect(r.threatGeometry, name).toBe(false);
      expect(Object.isFrozen(r), name).toBe(true);
    }
  });

  it("the design bundle's shape: the blocks by reference, the FRONT climb lane, and no geometry published while P5 is not in contracts", () => {
    const r = pocketRulesOf(S3_TUNABLES);
    if (r.kind !== "S") throw new Error("not S");
    expect(r.freeRun).toBe(FREE_RUN_FILED);
    expect(r.lateBlock).toBe(LATE_BLOCK_FILED);
    expect(r.climbLane).toBe("FRONT");
    expect(r.threatGeometry).toBe(false);
    expect(r.forcing).toBe("PER_RUSHER");
    expect(r.rules).toEqual({ name: "pocket-1.s3", overlayDigest: "fnv1a:5f000030" });
    expect(Object.isFrozen(r)).toBe(true);
  });

  it("the two petitions are not in contracts in this build (P5, P17): the code constants are false", () => {
    expect(P5_IN_CONTRACTS).toBe(false);
    expect(P17_IN_CONTRACTS).toBe(false);
    expect(pocketRulesUnder(S3_TUNABLES, NONE)).toEqual(pocketRulesOf(S3_TUNABLES));
  });

  it("accepts any subset of the three blocks under a stamped clock (C10: a late block alone; C16: the climb lane alone)", () => {
    const blocks = { freeRun: FREE_RUN_FILED, lateBlock: LATE_BLOCK_FILED, climbLane: "FRONT" as ClimbLaneTunables };
    const keys = ["freeRun", "lateBlock", "climbLane"] as const;
    for (let mask = 1; mask < 8; mask++) {
      const chosen: { freeRun?: FreeRunTunables; lateBlock?: LateBlockTunables; climbLane?: ClimbLaneTunables } = {};
      keys.forEach((key, i) => {
        if ((mask & (1 << i)) !== 0) Object.assign(chosen, { [key]: blocks[key] });
      });
      const r = pocketRulesOf(withStep3(sOn(), chosen));
      if (r.kind !== "S") throw new Error("not S");
      expect(r.freeRun).toBe(chosen.freeRun);
      expect(r.lateBlock).toBe(chosen.lateBlock);
      expect(r.climbLane).toBe(chosen.climbLane ?? "INTERIOR");
      expect(r.threatGeometry).toBe(false);
    }
  });

  it("the readings: B with or without a late block (C3 runs touched men on today's times), C without one, A with one", () => {
    for (const lateBlock of [undefined, LATE_BLOCK_FILED]) {
      const blocks = lateBlock === undefined ? { freeRun: FREE_RUN_FILED } : { freeRun: FREE_RUN_FILED, lateBlock };
      const r = pocketRulesOf(withStep3(sOn(), blocks));
      expect(r.kind === "S" && r.freeRun?.reading).toBe("B");
    }
    expect(pocketRulesOf(withStep3(sOn(), { freeRun: freeRun({ reading: "C" }) })).kind).toBe("S");
    expect(pocketRulesOf(withStep3(sOn(), { freeRun: freeRun({ reading: "A" }), lateBlock: LATE_BLOCK_FILED })).kind).toBe("S");
  });

  it("reading B's by-origin arms (C7 to C9), AM-2's held references (C3 to C5) and both pictures (C1, C6)", () => {
    for (const origins of [["UNBLOCKED"], ["BLOWN_UP"], ["LOOPER_FREE"], ["UNBLOCKED", "BLOWN_UP", "LOOPER_FREE"]]) {
      const r = pocketRulesOf(withStep3(sOn(), { freeRun: freeRun({ origins }) }));
      expect(r.kind === "S" && r.freeRun?.origins).toEqual(origins);
    }
    const { spot, ratings, drop } = HOLD_REFERENCES;
    for (const hold of [{ spot }, { ratings }, { drop }, HOLD_REFERENCES]) {
      const r = pocketRulesOf(withStep3(sOn(), { freeRun: freeRun({ hold }) }));
      expect(r.kind === "S" && r.freeRun?.hold).toBe(hold);
    }
    for (const picture of ["AS_RULED", "MUG_HEAD_ONLY"]) {
      const r = pocketRulesOf(withStep3(sOn(), { freeRun: freeRun({ picture }) }));
      expect(r.kind === "S" && r.freeRun?.picture).toBe(picture);
    }
  });

  it("the clean bench's levers and part 1's negative control are dials it accepts (get-offs and t_e at 50; get-off 0.36)", () => {
    const bench = withStep3(sOn(), {
      freeRun: freeRun({ getOffSeconds: 50, movingGetOffSeconds: 50 }),
      lateBlock: late({ engageSeconds: 50 }),
    });
    expect(pocketRulesOf(bench).kind).toBe("S");
    expect(pocketRulesOf(withStep3(sOn(), { freeRun: freeRun({ getOffSeconds: 0.36 }) })).kind).toBe("S");
  });

  it("shape L takes the free-run clock and the climb lane; its late block only once P17 is in contracts", () => {
    const l = pocketRulesOf(withStep3(lOn(), { freeRun: FREE_RUN_FILED, climbLane: "FRONT" }));
    if (l.kind !== "L") throw new Error("not L");
    expect(l.freeRun).toBe(FREE_RUN_FILED);
    expect(l.lateBlock).toBeUndefined();
    expect(l.climbLane).toBe("FRONT");
    const withLate = withStep3(lOn(), { freeRun: FREE_RUN_FILED, lateBlock: LATE_BLOCK_FILED });
    expect(() => pocketRulesOf(withLate)).toThrow(PocketRulesError);
    expect(() => pocketRulesUnder(withLate, { P5: true, P17: false })).toThrow(PocketRulesError);
    const granted = pocketRulesUnder(withLate, { P5: false, P17: true });
    expect(granted.kind === "L" && granted.lateBlock).toBe(LATE_BLOCK_FILED);
  });

  it("threatGeometry: true only with a free-run block AND P5 in contracts", () => {
    const off = pocketRulesOf(S3_TUNABLES);
    expect(off.kind === "S" && off.threatGeometry).toBe(false);
    const withP5 = pocketRulesUnder(S3_TUNABLES, GRANTED);
    expect(withP5.kind === "S" && withP5.threatGeometry).toBe(true);
    const noClock = pocketRulesUnder(withStep3(sOn(), { lateBlock: LATE_BLOCK_FILED, climbLane: "FRONT" }), GRANTED);
    expect(noClock.kind === "S" && noClock.threatGeometry).toBe(false);
    const onL = pocketRulesUnder(withStep3(lOn(), { freeRun: FREE_RUN_FILED }), { P5: true, P17: false });
    expect(onL.kind === "L" && onL.threatGeometry).toBe(true);
    for (const { name, tunables } of RULE_SETS) {
      const r = pocketRulesUnder(tunables, GRANTED);
      if (r.kind !== "LEGACY") expect(r.threatGeometry, name).toBe(false);
    }
  });

  it("PLAY_START's rules keep their two keys: a refused step-3 bundle throws before the stream, and the dials never ride on the stamp", () => {
    const loud = withStep3(withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }, S3), {
      freeRun: freeRun({ reading: "C" }),
      lateBlock: LATE_BLOCK_FILED,
    });
    const { state, calls } = buildScenario();
    expect(() => simulatePassPlay(state, calls, "s3-refused", loud)).toThrow(PocketRulesError);
    const r = pocketRulesOf(S3_TUNABLES);
    expect(r.kind === "S" && Object.keys(r.rules)).toEqual(["name", "overlayDigest"]);
  });

  const free = (patch: Record<string, unknown>): Tunables => withStep3(sOn(), { freeRun: freeRun(patch) });
  const cases: [string, Tunables, string][] = [
    [
      "a free-run block under legacy (no clock, no card, no stamp)",
      withStep3(DEFAULT_TUNABLES, { freeRun: FREE_RUN_FILED }),
      "@ff/engine: the free-run block (blitzPickup.freeRun) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule",
    ],
    [
      "a late block under legacy",
      withStep3(DEFAULT_TUNABLES, { lateBlock: LATE_BLOCK_FILED }),
      "@ff/engine: the late block (blitzPickup.lateBlock) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule",
    ],
    [
      "the climb lane rule under legacy",
      withStep3(DEFAULT_TUNABLES, { climbLane: "FRONT" }),
      "@ff/engine: the climb lane rule (pocket.climbLane) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule",
    ],
    [
      "a free-run block with a stamp and no clock",
      withStep3(withBlocks(DEFAULT_TUNABLES, {}, S3), { freeRun: FREE_RUN_FILED }),
      "@ff/engine: the free-run block (blitzPickup.freeRun) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule",
    ],
    [
      "a late block on a clock without its stamp",
      withStep3(withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK_WITH_WINDOW, approach: APPROACH_CARD }), { lateBlock: LATE_BLOCK_FILED }),
      "@ff/engine: the late block (blitzPickup.lateBlock) without its rules stamp (engineRules { name, overlayDigest })",
    ],
    [
      "the climb lane rule on a clock without its stamp",
      withStep3(withBlocks(DEFAULT_TUNABLES, { repClock: { fullExpressionSeconds: 8 }, approach: APPROACH_CARD }), { climbLane: "FRONT" }),
      "@ff/engine: the climb lane rule (pocket.climbLane) without its rules stamp (engineRules { name, overlayDigest })",
    ],
    [
      "a late block on shape L while P17 is not in contracts",
      withStep3(lOn(), { lateBlock: LATE_BLOCK_FILED }),
      "@ff/engine: the late block (blitzPickup.lateBlock) on shape L (passRush.repClock) is refused until petition P17's doc text (the late block's rolled tick) is in contracts; shape S runs it",
    ],
    [
      "reading C with a late block",
      withStep3(sOn(), { freeRun: freeRun({ reading: "C" }), lateBlock: LATE_BLOCK_FILED }),
      "@ff/engine: reading C (blitzPickup.freeRun.reading) puts every free runner on the free-run clock, touched men 0.5 s later, so it runs no late block (blitzPickup.lateBlock)",
    ],
    [
      "reading A without a late block",
      free({ reading: "A" }),
      "@ff/engine: reading A (blitzPickup.freeRun.reading) makes every lost block a late block, so it needs the late block (blitzPickup.lateBlock)",
    ],
    ["a reading outside the set", free({ reading: "D" }), "@ff/engine: the free-run block's reading (blitzPickup.freeRun.reading) is D, which is not one of B, C, A"],
    ["a reading in the wrong case", free({ reading: "b" }), "@ff/engine: the free-run block's reading (blitzPickup.freeRun.reading) is b, which is not one of B, C, A"],
    ["no reading", free({ reading: undefined }), "@ff/engine: the free-run block's reading (blitzPickup.freeRun.reading) is undefined, which is not one of B, C, A"],
    [
      "a picture outside the two",
      free({ picture: "HEAD_ONLY" }),
      "@ff/engine: the free-run block's picture (blitzPickup.freeRun.picture) is HEAD_ONLY, which is not one of AS_RULED, MUG_HEAD_ONLY",
    ],
    [
      "no picture",
      free({ picture: undefined }),
      "@ff/engine: the free-run block's picture (blitzPickup.freeRun.picture) is undefined, which is not one of AS_RULED, MUG_HEAD_ONLY",
    ],
    [
      "a climb lane rule outside its one value (today's rule is the block's absence)",
      withStep3(sOn(), { climbLane: "INTERIOR" as ClimbLaneTunables }),
      "@ff/engine: the climb lane rule (pocket.climbLane) is INTERIOR, which is not one of FRONT",
    ],
    [
      "a climb lane rule in the wrong case",
      withStep3(sOn(), { climbLane: "front" as ClimbLaneTunables }),
      "@ff/engine: the climb lane rule (pocket.climbLane) is front, which is not one of FRONT",
    ],
    [
      "origins under reading C",
      withStep3(sOn(), { freeRun: freeRun({ reading: "C", origins: ["UNBLOCKED"] }) }),
      "@ff/engine: the free-run block's origins (blitzPickup.freeRun.origins) narrow reading B's men nobody touched; reading C names its own men",
    ],
    [
      "origins under reading A",
      withStep3(sOn(), { freeRun: freeRun({ reading: "A", origins: ["UNBLOCKED"] }), lateBlock: LATE_BLOCK_FILED }),
      "@ff/engine: the free-run block's origins (blitzPickup.freeRun.origins) narrow reading B's men nobody touched; reading A names its own men",
    ],
    [
      "an empty origins list",
      free({ origins: [] }),
      "@ff/engine: the free-run block's origins (blitzPickup.freeRun.origins) must be a list of one or more of UNBLOCKED, BLOWN_UP, LOOPER_FREE, got []",
    ],
    [
      "origins that are not a list",
      free({ origins: "UNBLOCKED" }),
      "@ff/engine: the free-run block's origins (blitzPickup.freeRun.origins) must be a list of one or more of UNBLOCKED, BLOWN_UP, LOOPER_FREE, got \"UNBLOCKED\"",
    ],
    [
      "an origin outside D19's three (a touched man's band)",
      free({ origins: ["RAN_THROUGH"] }),
      "@ff/engine: an origin of the free-run block (blitzPickup.freeRun.origins) is RAN_THROUGH, which is not one of UNBLOCKED, BLOWN_UP, LOOPER_FREE",
    ],
    [
      "an origin named twice",
      free({ origins: ["BLOWN_UP", "BLOWN_UP"] }),
      "@ff/engine: the free-run block's origins (blitzPickup.freeRun.origins) name BLOWN_UP twice",
    ],
    [
      "a hold that holds nothing",
      free({ hold: {} }),
      "@ff/engine: the free-run block's hold (blitzPickup.freeRun.hold) holds nothing: give it a spot, ratings or a drop, or leave it out",
    ],
    [
      "a held spot missing a group",
      free({ hold: { spot: { downLineman: { depth: 1, width: 2.5 }, linebacker: { depth: 2.5, width: 2.5 } } } }),
      "@ff/engine: blitzPickup.freeRun.hold.spot.defensiveBack must be an object { depth, width }, got undefined",
    ],
    [
      "a held spot with a negative depth",
      free({ hold: { spot: { ...HOLD_REFERENCES.spot, linebacker: { depth: -2.5, width: 2.5 } } } }),
      "@ff/engine: blitzPickup.freeRun.hold.spot.linebacker.depth must be a finite number, 0 or more, got -2.5",
    ],
    [
      "a held rating off the scale",
      free({ hold: { ratings: { speed: 100, acceleration: 50 } } }),
      "@ff/engine: blitzPickup.freeRun.hold.ratings.speed must be a rating from 0 to 99, got 100",
    ],
    [
      "a held rating that is not a number",
      free({ hold: { ratings: { speed: 50 } } }),
      "@ff/engine: blitzPickup.freeRun.hold.ratings.acceleration must be a rating from 0 to 99, got undefined",
    ],
    ["a held drop of 0", free({ hold: { drop: 0 } }), "@ff/engine: blitzPickup.freeRun.hold.drop must be a finite number above 0, got 0"],
    [
      "an ETA rounding other than the tenth",
      free({ etaRoundingSeconds: 0.05 }),
      "@ff/engine: blitzPickup.freeRun.etaRoundingSeconds must be 0.1 (the clock rounds to the tenth, as every published etaTick is), got 0.05",
    ],
    ["a negative get-off", free({ getOffSeconds: -0.1 }), "@ff/engine: blitzPickup.freeRun.getOffSeconds must be a finite number, 0 or more, got -0.1"],
    ["a moving get-off that is not a number", free({ movingGetOffSeconds: Number.NaN }), "@ff/engine: blitzPickup.freeRun.movingGetOffSeconds must be a finite number, 0 or more, got NaN"],
    ["a negative DELAYED wait", free({ delayedSeconds: -0.5 }), "@ff/engine: blitzPickup.freeRun.delayedSeconds must be a finite number, 0 or more, got -0.5"],
    ["a 40 of no yards", free({ fortyYards: 0 }), "@ff/engine: blitzPickup.freeRun.fortyYards must be a finite number above 0, got 0"],
    ["a rating scale of 0", free({ fortySpeedScale: 0 }), "@ff/engine: blitzPickup.freeRun.fortySpeedScale must be a finite number above 0, got 0"],
    ["a 40 intercept that is not a number", free({ fortyIntercept: Number.POSITIVE_INFINITY }), "@ff/engine: blitzPickup.freeRun.fortyIntercept must be a finite number, got Infinity"],
    [
      "a start clamp that runs backwards",
      free({ tauMin: 0.91, tauMax: 0.63 }),
      "@ff/engine: the free-run start's clamp (blitzPickup.freeRun.tauMin to tauMax) runs from 0.91 to 0.63: its minimum is above its maximum",
    ],
    ["a start floor of 0", free({ tauMin: 0 }), "@ff/engine: blitzPickup.freeRun.tauMin must be a finite number above 0, got 0"],
    ["a negative reach", free({ pathShortenYards: -1 }), "@ff/engine: blitzPickup.freeRun.pathShortenYards must be a finite number, 0 or more, got -1"],
    ["a bend that is not a number", free({ edgePathFactor: Number.NaN }), "@ff/engine: blitzPickup.freeRun.edgePathFactor must be a finite number above 0, got NaN"],
    ["a negative loop leg", free({ loopExtraYards: -0.5 }), "@ff/engine: blitzPickup.freeRun.loopExtraYards must be a finite number, 0 or more, got -0.5"],
    ["a creeper standing still", free({ creeperYardsPerSecond: 0 }), "@ff/engine: blitzPickup.freeRun.creeperYardsPerSecond must be a finite number above 0, got 0"],
    [
      "a free-run block that is not an object",
      withStep3(sOn(), { freeRun: null as unknown as FreeRunTunables }),
      "@ff/engine: the free-run block (blitzPickup.freeRun) must be an object, got null",
    ],
    [
      "a late block that is not an object",
      withStep3(sOn(), { lateBlock: null as unknown as LateBlockTunables }),
      "@ff/engine: the late block (blitzPickup.lateBlock) must be an object { engageSeconds, weakMultiplier }, got null",
    ],
    [
      "a negative t_e",
      withStep3(sOn(), { lateBlock: late({ engageSeconds: -1 }) }),
      "@ff/engine: blitzPickup.lateBlock.engageSeconds must be a finite number, 0 or more, got -1",
    ],
    [
      "a weak multiplier of 0",
      withStep3(sOn(), { lateBlock: late({ weakMultiplier: 0 }) }),
      "@ff/engine: blitzPickup.lateBlock.weakMultiplier must be a finite number above 0, got 0",
    ],
  ];

  for (const [what, tunables, message] of cases) {
    it(`refuses ${what}, before any die`, () => {
      expect(refusal(tunables)).toBe(message);
      const { state, calls } = buildScenario();
      expect(() => simulatePassPlay(state, calls, "refused", tunables)).toThrow(PocketRulesError);
    });
  }

  it("the late block on shape L is the one refusal a granted P17 lifts; a granted P5 lifts none", () => {
    const passes = (tunables: Tunables, petitions: { P5: boolean; P17: boolean }): boolean => {
      try {
        pocketRulesUnder(tunables, petitions);
        return true;
      } catch (e) {
        expect(e).toBeInstanceOf(PocketRulesError);
        return false;
      }
    };
    expect(cases.filter(([, t]) => passes(t, GRANTED)).map(([what]) => what)).toEqual(["a late block on shape L while P17 is not in contracts"]);
    expect(cases.filter(([, t]) => passes(t, { P5: true, P17: false })).map(([what]) => what)).toEqual([]);
    expect(pocketRulesUnder(withStep3(lOn(), { lateBlock: LATE_BLOCK_FILED }), GRANTED).kind).toBe("L");
  });

  it("the earlier refusals keep their order: a step-3 block masks no clock, card or forcing refusal", () => {
    const s3 = { freeRun: FREE_RUN_FILED, lateBlock: LATE_BLOCK_FILED, climbLane: "FRONT" as ClimbLaneTunables };
    expect(refusal(withStep3(withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK, repClock: { fullExpressionSeconds: 5 }, approach: APPROACH_CARD }, S3), s3))).toBe(
      "@ff/engine: the tunables carry both block clocks (passRush.beatClock and passRush.repClock); a bundle runs one",
    );
    expect(refusal(withStep3(withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK }, S3), s3))).toBe(
      "@ff/engine: a block clock without the approach card (passRush.approach); pocket-1 publishes the approach on every threat",
    );
    expect(refusal(withStep3(withForcing(DEFAULT_TUNABLES, { rule: "PER_RUSHER" }), s3))).toBe(
      "@ff/engine: the forcing block (pocket.forcing) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule",
    );
    expect(refusal(withStep3(sOn(), { ...s3, lateBlock: late({ weakMultiplier: 0 }), freeRun: freeRun({ reading: "C" }) }))).toBe(
      "@ff/engine: blitzPickup.lateBlock.weakMultiplier must be a finite number above 0, got 0",
    );
    expect(refusal(withStep3(withBlocks(DEFAULT_TUNABLES, { beatClock: BEAT_CLOCK, approach: APPROACH_CARD }, stamp("fnv1a:5f000031", "pocket-2")), s3))).toBe(
      "@ff/engine: the rules stamp names pocket-2, which is not a pocket-1 rules name",
    );
  });
});
