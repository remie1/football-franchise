/**
 * ADR-089 step 4 — THE SWITCH LEARNS CONTACT AND THE MOTION (`sim/pocketRules.ts`; plan §1.1, §1.2).
 *
 * 1. The gates: P6, P7 and P8 are not in contracts, so every bundle carrying `pocket.contact` or
 *    `throwExec.motion` is refused before the first die, naming the blocks and the petitions; a
 *    play handed one throws before a single event.
 * 2. With the three granted (a test's own petitions): shapes S and L read both blocks; kind T
 *    ("today's line plus contact") is the stamp, the approach card and the contact block and
 *    nothing else, with today's step-2 and step-3 parts.
 * 3. The refusals: either block without its stamp; the motion with no block clock; the contact with
 *    no clock and no card; kind T with forcing or a step-3 block; every dial outside its domain.
 * 4. `playsLegacyRules` learns both blocks, and the bundles of steps 1 to 3 read neither.
 */
import { describe, expect, it } from "vitest";
import { simulatePassPlay } from "../src/index.js";
import {
  P6_IN_CONTRACTS,
  P7_IN_CONTRACTS,
  P8_IN_CONTRACTS,
  PocketRulesError,
  playsLegacyRules,
  pocketRulesOf,
  pocketRulesUnder,
} from "../src/sim/pocketRules.js";
import type { ContractPetitions } from "../src/sim/pocketRules.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { buildScenario } from "./fixtures.js";
import {
  APPROACH_CARD,
  FREE_RUN_FILED,
  L5_TUNABLES,
  RULE_SETS,
  S2_TUNABLES,
  S3_TUNABLES,
  S_TUNABLES,
  stamp,
  withForcing,
  withStep3,
} from "./pocketTunables.js";
import { CONTACT_FILED, GRANTED, MOTION_FILED, todaysLine, withStep4 } from "./step4Fixtures.js";

const S4_TUNABLES = withStep4(S3_TUNABLES, { contact: CONTACT_FILED, motion: MOTION_FILED });

function refusalUnder(tunables: Tunables, petitions: ContractPetitions | undefined = undefined): string {
  try {
    if (petitions === undefined) pocketRulesOf(tunables);
    else pocketRulesUnder(tunables, petitions);
  } catch (e) {
    expect(e).toBeInstanceOf(PocketRulesError);
    expect((e as Error).message.startsWith("@ff/engine: ")).toBe(true);
    return (e as Error).message;
  }
  throw new Error("expected a PocketRulesError");
}

describe("ADR-089 step 4 — the gates (P6, P7, P8 not in contracts)", () => {
  it("the three constants are false in this build", () => {
    expect(P6_IN_CONTRACTS).toBe(false);
    expect(P7_IN_CONTRACTS).toBe(false);
    expect(P8_IN_CONTRACTS).toBe(false);
  });

  it("every bundle carrying a step-4 block is refused, naming the blocks and the petitions", () => {
    const cases: readonly [Tunables, RegExp][] = [
      [withStep4(S_TUNABLES, { contact: CONTACT_FILED }), /^@ff\/engine: the contact block \(pocket\.contact\) is refused until petitions P6, P7 and P8 are in contracts \(not yet: P6, P7, P8\)/],
      [withStep4(S_TUNABLES, { motion: MOTION_FILED }), /^@ff\/engine: the throwing motion \(throwExec\.motion\) is refused until/],
      [S4_TUNABLES, /the contact block \(pocket\.contact\) and the throwing motion \(throwExec\.motion\) are refused until/],
      [withStep4(L5_TUNABLES, { contact: CONTACT_FILED, motion: MOTION_FILED }), /are refused until petitions P6, P7 and P8/],
      [todaysLine(), /the contact block \(pocket\.contact\) is refused until/],
    ];
    for (const [tunables, message] of cases) {
      expect(refusalUnder(tunables)).toMatch(message);
      // A test that gives only P5 and P17 sees the build's step-4 gate.
      expect(refusalUnder(tunables, { P5: true, P17: true })).toMatch(message);
    }
  });

  it("one petition withheld is enough to refuse, and the message names it", () => {
    expect(refusalUnder(S4_TUNABLES, { ...GRANTED, P8: false })).toMatch(/\(not yet: P8\)/);
    expect(refusalUnder(S4_TUNABLES, { ...GRANTED, P6: false, P7: false })).toMatch(/\(not yet: P6, P7\)/);
    expect(refusalUnder(withStep4(S_TUNABLES, { motion: MOTION_FILED }), { ...GRANTED, P6: false })).toMatch(/\(not yet: P6\)/);
  });

  it("a play handed a step-4 bundle throws before a single event", () => {
    const { state, calls } = buildScenario();
    for (const tunables of [S4_TUNABLES, withStep4(S_TUNABLES, { contact: CONTACT_FILED }), todaysLine()]) {
      expect(() => simulatePassPlay(state, calls, "step4-gate", tunables)).toThrow(PocketRulesError);
    }
  });

  it("a block's own dials are checked before the gate, so a bad dial is named even while the gate is shut", () => {
    expect(refusalUnder(withStep4(S_TUNABLES, { contact: { ...CONTACT_FILED, boundary: 4.5 } }))).toMatch(/pocket\.contact\.boundary must be a whole number/);
  });
});

describe("ADR-089 step 4 — shapes S and L read both blocks (petitions granted)", () => {
  it("S and L carry the blocks they are given, the tunables' own objects", () => {
    const s = pocketRulesUnder(S4_TUNABLES, GRANTED);
    if (s.kind !== "S") throw new Error("not S");
    expect(s.contact).toBe(CONTACT_FILED);
    expect(s.motion).toBe(MOTION_FILED);
    expect(s.freeRun).toBe(FREE_RUN_FILED);
    expect(Object.isFrozen(s)).toBe(true);
    const motionOnly = pocketRulesUnder(withStep4(S_TUNABLES, { motion: MOTION_FILED }), GRANTED);
    if (motionOnly.kind !== "S") throw new Error("not S");
    expect(motionOnly.contact).toBeUndefined();
    expect(motionOnly.motion).toBe(MOTION_FILED);
    const l = pocketRulesUnder(withStep4(L5_TUNABLES, { contact: CONTACT_FILED, motion: MOTION_FILED }), GRANTED);
    if (l.kind !== "L") throw new Error("not L");
    expect(l.contact).toBe(CONTACT_FILED);
    expect(l.motion).toBe(MOTION_FILED);
  });

  it("every bundle of steps 1 to 3 reads neither block, and is the same with the petitions granted", () => {
    for (const { name, tunables } of RULE_SETS) {
      const r = pocketRulesOf(tunables);
      if (r.kind === "LEGACY") {
        expect(name).toBe("legacy");
        continue;
      }
      expect(r.kind === "S" || r.kind === "L").toBe(true);
      if (r.kind === "T") throw new Error("unreachable");
      expect(r.contact).toBeUndefined();
      expect(r.motion).toBeUndefined();
      expect(pocketRulesUnder(tunables, GRANTED)).toEqual(r);
    }
  });

  it("the second arrival off (D12) and the contest before the throw (D13) and the grid reading (D14) are accepted dials", () => {
    const variants = [
      { ...CONTACT_FILED, secondArrival: "RATED" },
      { ...CONTACT_FILED, order: "CONTEST_BEFORE_THROW" },
      { ...CONTACT_FILED, boundary: -15 },
      { ...CONTACT_FILED, boundary: 15 },
    ];
    for (const contact of variants) {
      const r = pocketRulesUnder(withStep4(S_TUNABLES, { contact }), GRANTED);
      if (r.kind !== "S") throw new Error("not S");
      expect(r.contact).toBe(contact);
    }
    const grid = { ...MOTION_FILED, reading: "GRID" };
    const g = pocketRulesUnder(withStep4(S_TUNABLES, { motion: grid }), GRANTED);
    if (g.kind !== "S") throw new Error("not S");
    expect(g.motion).toBe(grid);
  });
});

describe("ADR-089 step 4 — kind T, today's line plus contact (petitions granted)", () => {
  it("the stamp, the approach card and the contact block, with today's step-2 and step-3 parts", () => {
    const t = pocketRulesUnder(todaysLine(), GRANTED);
    expect(t).toEqual({
      kind: "T",
      approach: APPROACH_CARD,
      rules: { name: "pocket-1.s4", overlayDigest: "fnv1a:7e000004" },
      forcing: "STEP_1",
      freeRun: undefined,
      lateBlock: undefined,
      climbLane: "INTERIOR",
      threatGeometry: false,
      contact: CONTACT_FILED,
      motion: undefined,
    });
    if (t.kind !== "T") throw new Error("not T");
    expect(t.contact).toBe(CONTACT_FILED);
    expect(Object.keys(t.rules)).toEqual(["name", "overlayDigest"]);
    expect(Object.isFrozen(t)).toBe(true);
    expect(Object.isFrozen(t.rules)).toBe(true);
    expect(playsLegacyRules(todaysLine())).toBe(false);
  });

  it("anything else with a contact block and no block clock is refused", () => {
    expect(refusalUnder(withStep4(todaysLine(), { motion: MOTION_FILED }), GRANTED)).toMatch(
      /the throwing motion \(throwExec\.motion\) without a block clock .* today's line plus contact \(kind T\) runs the contact alone/,
    );
    expect(refusalUnder(withForcing(todaysLine(), { rule: "PER_RUSHER" }), GRANTED)).toMatch(/the forcing block \(pocket\.forcing\) without a block clock/);
    expect(refusalUnder(withStep3(todaysLine(), { climbLane: "FRONT" }), GRANTED)).toMatch(/the climb lane rule \(pocket\.climbLane\) without a block clock/);
    expect(refusalUnder(withStep3(todaysLine(), { freeRun: FREE_RUN_FILED }), GRANTED)).toMatch(/the free-run block \(blitzPickup\.freeRun\) without a block clock/);
    const noCard: Tunables = { ...todaysLine(), passRush: { ...DEFAULT_TUNABLES.passRush } };
    expect(refusalUnder(noCard, GRANTED)).toMatch(/the contact block \(pocket\.contact\) without a block clock needs the approach card/);
    // The card without the contact block is refused as before.
    const cardOnly: Tunables = { ...DEFAULT_TUNABLES, engineRules: stamp("fnv1a:1"), passRush: { ...DEFAULT_TUNABLES.passRush, approach: APPROACH_CARD } };
    expect(refusalUnder(cardOnly, GRANTED)).toMatch(/the approach card \(passRush\.approach\) without a block clock/);
  });

  it("a stamp that is not a pocket-1 name, or carries no digest, is refused under T as under S and L", () => {
    expect(refusalUnder({ ...todaysLine(), engineRules: stamp("fnv1a:1", "legacy") }, GRANTED)).toMatch(/not a pocket-1 rules name/);
    expect(refusalUnder({ ...todaysLine(), engineRules: stamp("", "pocket-1.s4") }, GRANTED)).toMatch(/carries no overlay digest/);
  });
});

describe("ADR-089 step 4 — either block without its stamp, or under legacy, is refused, never ignored", () => {
  it("playsLegacyRules learns both blocks", () => {
    expect(playsLegacyRules(DEFAULT_TUNABLES)).toBe(true);
    expect(playsLegacyRules(withStep4(DEFAULT_TUNABLES, { contact: CONTACT_FILED }))).toBe(false);
    expect(playsLegacyRules(withStep4(DEFAULT_TUNABLES, { motion: MOTION_FILED }))).toBe(false);
  });

  it("no stamp: refused by name", () => {
    for (const petitions of [undefined, GRANTED]) {
      expect(refusalUnder(withStep4(DEFAULT_TUNABLES, { contact: CONTACT_FILED }), petitions)).toMatch(
        /^@ff\/engine: the contact block \(pocket\.contact\) without its rules stamp/,
      );
      expect(refusalUnder(withStep4(DEFAULT_TUNABLES, { motion: MOTION_FILED }), petitions)).toMatch(
        /^@ff\/engine: the throwing motion \(throwExec\.motion\) without its rules stamp/,
      );
      const unstampedS: Tunables = { ...withStep4(S_TUNABLES, { contact: CONTACT_FILED }) };
      delete (unstampedS as { engineRules?: unknown }).engineRules;
      expect(refusalUnder(unstampedS, petitions)).toMatch(/without its rules stamp/);
    }
  });

  it("a stamp and the motion alone on today's line: refused", () => {
    const stampedMotion = withStep4({ ...DEFAULT_TUNABLES, engineRules: stamp("fnv1a:2", "pocket-1.s4") }, { motion: MOTION_FILED });
    expect(refusalUnder(stampedMotion, GRANTED)).toMatch(/the throwing motion \(throwExec\.motion\) without a block clock/);
  });
});

describe("ADR-089 step 4 — the dials' domains", () => {
  const contactRefusal = (contact: unknown): string => refusalUnder(withStep4(S2_TUNABLES, { contact }), GRANTED);
  const motionRefusal = (motion: unknown): string => refusalUnder(withStep4(S2_TUNABLES, { motion }), GRANTED);

  it("the contact block", () => {
    expect(contactRefusal("on")).toMatch(/the contact block \(pocket\.contact\) must be an object/);
    expect(contactRefusal({ ...CONTACT_FILED, boundary: "5" })).toMatch(/pocket\.contact\.boundary must be a whole number/);
    expect(contactRefusal({ ...CONTACT_FILED, boundary: Number.NaN })).toMatch(/pocket\.contact\.boundary must be a whole number/);
    expect(contactRefusal({ ...CONTACT_FILED, tilts: undefined })).toMatch(/pocket\.contact\.tilts must be an object/);
    expect(contactRefusal({ ...CONTACT_FILED, tilts: { ...CONTACT_FILED.tilts, freeRun: undefined } })).toMatch(
      /pocket\.contact\.tilts\.freeRun must be an object \{ on, rusherBonus \}/,
    );
    expect(contactRefusal({ ...CONTACT_FILED, tilts: { ...CONTACT_FILED.tilts, pushBlocked: { on: "yes", quarterbackBonus: 20 } } })).toMatch(
      /pocket\.contact\.tilts\.pushBlocked\.on must be true or false/,
    );
    expect(contactRefusal({ ...CONTACT_FILED, tilts: { ...CONTACT_FILED.tilts, behindNever: { on: true, rusherBonus: -10 } } })).toMatch(
      /pocket\.contact\.tilts\.behindNever\.rusherBonus must be a finite number, 0 or more/,
    );
    expect(contactRefusal({ ...CONTACT_FILED, tilts: { ...CONTACT_FILED.tilts, pushBlocked: { on: true } } })).toMatch(
      /pocket\.contact\.tilts\.pushBlocked\.quarterbackBonus must be a finite number/,
    );
    expect(contactRefusal({ ...CONTACT_FILED, shedDelaySeconds: -0.5 })).toMatch(/pocket\.contact\.shedDelaySeconds must be a finite number, 0 or more/);
    expect(contactRefusal({ ...CONTACT_FILED, pushShedDelaySeconds: 0.75 })).toMatch(/pocket\.contact\.pushShedDelaySeconds must be a whole number of tenths/);
    expect(contactRefusal({ ...CONTACT_FILED, secondArrival: "OFF" })).toMatch(/pocket\.contact\.secondArrival must be "RATED" or an object \{ target \}/);
    expect(contactRefusal({ ...CONTACT_FILED, secondArrival: { target: 15.5 } })).toMatch(/pocket\.contact\.secondArrival\.target must be a whole number/);
    expect(contactRefusal({ ...CONTACT_FILED, secondArrival: { target: 101 } })).toMatch(/must lie from 0 to 100/);
    expect(contactRefusal({ ...CONTACT_FILED, secondArrival: { target: -1 } })).toMatch(/must lie from 0 to 100/);
    expect(contactRefusal({ ...CONTACT_FILED, order: "BOTH" })).toMatch(/the contact order \(pocket\.contact\.order\) is BOTH, which is not one of CONTEST_AFTER_THROW, CONTEST_BEFORE_THROW/);
    // The edges that are accepted.
    for (const ok of [
      { ...CONTACT_FILED, shedDelaySeconds: 0, pushShedDelaySeconds: 0 },
      { ...CONTACT_FILED, secondArrival: { target: 0 } },
      { ...CONTACT_FILED, secondArrival: { target: 100 } },
      { ...CONTACT_FILED, tilts: { ...CONTACT_FILED.tilts, freeRun: { on: false, rusherBonus: 0 } } },
    ]) {
      expect(pocketRulesUnder(withStep4(S2_TUNABLES, { contact: ok }), GRANTED).kind).toBe("S");
    }
  });

  it("the motion: rho0 and rhoD above 0, its reading, and rho in [0, one tick step) over the rating scale", () => {
    expect(motionRefusal(7)).toMatch(/the throwing motion \(throwExec\.motion\) must be an object/);
    expect(motionRefusal({ ...MOTION_FILED, rho0: 0 })).toMatch(/throwExec\.motion\.rho0 must be a finite number above 0/);
    expect(motionRefusal({ ...MOTION_FILED, rhoD: -400 })).toMatch(/throwExec\.motion\.rhoD must be a finite number above 0/);
    expect(motionRefusal({ ...MOTION_FILED, reading: "HALF" })).toMatch(/the motion's arrival reading \(throwExec\.motion\.reading\) is HALF/);
    // rho at release 0 is 0.45 + 70/400 = 0.625 s: past one tick step.
    expect(motionRefusal({ ...MOTION_FILED, rho0: 0.45 })).toMatch(/runs 0\.625 s at release 0: rho must stay below one tick step \(0\.5 s\)/);
    // rho at release 99 is 0.05 - 29/100 < 0.
    expect(motionRefusal({ ...MOTION_FILED, rho0: 0.05, rhoD: 100 })).toMatch(/at release 99: rho must be 0 or more/);
    // The longest accepted: just under the tick step at release 0.
    expect(pocketRulesUnder(withStep4(S2_TUNABLES, { motion: { ...MOTION_FILED, rho0: 0.32 } }), GRANTED).kind).toBe("S");
  });
});
