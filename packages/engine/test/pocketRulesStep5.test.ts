/**
 * ADR-089 step 5a: the switch learns the clean-pocket block (`sim/pocketRules.ts`; plan §1.2).
 *
 * 1. Absent from DEFAULT_TUNABLES, not even as an `undefined` key, and from every bundle of steps
 *    1 to 4.
 * 2. Shapes S and L read it (the tunables' own object); every older bundle reads `undefined`.
 * 3. The refusals, each named: under legacy (`playsLegacyRules` false for a tree carrying it), on
 *    kind T (`playsTodaysLine` false too), and without its stamp. No petition gates it.
 * 4. The dials' domains: five switches, D23's bar 30, the reset on the tenth, the CHOSEN floor.
 * 5. In this commit nothing reads the block beyond the reader: a play under S or L with the
 *    all-off block gives the stream it gives without the block (same stamp).
 */
import { describe, expect, it } from "vitest";
import { simulatePassPlay } from "../src/index.js";
import { PocketRulesError, playsLegacyRules, playsTodaysLine, pocketRulesOf, pocketRulesUnder } from "../src/sim/pocketRules.js";
import type { ContractPetitions } from "../src/sim/pocketRules.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { buildScenario } from "./fixtures.js";
import { L5_TUNABLES, RULE_SETS, S2_TUNABLES, S_TUNABLES, SW_TUNABLES, stamp, withBlocks, APPROACH_CARD, BEAT_CLOCK } from "./pocketTunables.js";
import { CONTACT_FILED, GRANTED, S4C_TUNABLES, S4L_TUNABLES, S4M_TUNABLES, S4S_TUNABLES, S4_TUNABLES, T_TUNABLES, withStep4 } from "./step4Fixtures.js";
import { CLEAN_POCKET_FILED, CLEAN_POCKET_OFF, DROP_FLOOR_FILED, withCleanPocket } from "./step5Fixtures.js";

const STEP4_SETS: readonly { readonly name: string; readonly tunables: Tunables }[] = [
  { name: "S4", tunables: S4_TUNABLES },
  { name: "S4S", tunables: S4S_TUNABLES },
  { name: "S4L", tunables: S4L_TUNABLES },
  { name: "S4C", tunables: S4C_TUNABLES },
  { name: "S4M", tunables: S4M_TUNABLES },
  { name: "T", tunables: T_TUNABLES },
];

/** A stamped s5a-like bundle on shape S (step 4's shape S with both blocks) and on shape L. */
const S5S = withCleanPocket({ ...S4S_TUNABLES, engineRules: stamp("fnv1a:7f000001", "pocket-1.s5a") }, CLEAN_POCKET_FILED);
const S5L = withCleanPocket({ ...S4L_TUNABLES, engineRules: stamp("fnv1a:7f000002", "pocket-1.s5a") }, CLEAN_POCKET_FILED);

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

describe("ADR-089 step 5a: the clean-pocket block is absent by default", () => {
  it("DEFAULT_TUNABLES has no pocket.cleanPocket, not even as an undefined key, and legacy stays the bare LEGACY", () => {
    expect("cleanPocket" in DEFAULT_TUNABLES.pocket).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(DEFAULT_TUNABLES.pocket, "cleanPocket")).toBe(false);
    expect(pocketRulesOf(DEFAULT_TUNABLES)).toEqual({ kind: "LEGACY" });
    expect(Object.keys(pocketRulesOf(DEFAULT_TUNABLES))).toEqual(["kind"]);
    expect(playsLegacyRules(DEFAULT_TUNABLES)).toBe(true);
  });

  it("no bundle of steps 1 to 4 carries the key, and each reads cleanPocket undefined", () => {
    for (const { name, tunables } of [...RULE_SETS, ...STEP4_SETS]) {
      expect("cleanPocket" in tunables.pocket, name).toBe(false);
      const r = pocketRulesUnder(tunables, GRANTED);
      if (r.kind === "LEGACY") {
        expect(name).toBe("legacy");
        continue;
      }
      expect(r.cleanPocket, name).toBeUndefined();
      expect(pocketRulesOf(tunables)).toEqual(r);
    }
  });
});

describe("ADR-089 step 5a: shapes S and L read the block", () => {
  it("S and L carry the block they are given, the tunables' own object, frozen rules", () => {
    const s = pocketRulesOf(S5S);
    if (s.kind !== "S") throw new Error("not S");
    expect(s.cleanPocket).toBe(CLEAN_POCKET_FILED);
    expect(s.contact).toBe(CONTACT_FILED);
    expect(Object.isFrozen(s)).toBe(true);
    expect(s.rules).toEqual({ name: "pocket-1.s5a", overlayDigest: "fnv1a:7f000001" });
    const l = pocketRulesOf(S5L);
    if (l.kind !== "L") throw new Error("not L");
    expect(l.cleanPocket).toBe(CLEAN_POCKET_FILED);
    expect(playsLegacyRules(S5S)).toBe(false);
    expect(playsTodaysLine(S5S)).toBe(false);
  });

  it("is read on any S or L bundle, with or without the step-2 to step-4 blocks, and no petition gates it", () => {
    for (const base of [S_TUNABLES, SW_TUNABLES, L5_TUNABLES, S2_TUNABLES, S4_TUNABLES]) {
      const t = withCleanPocket(base, CLEAN_POCKET_FILED);
      const r = pocketRulesUnder(t, { P5: false, P17: false, P6: true, P7: true, P8: true });
      if (r.kind !== "S" && r.kind !== "L") throw new Error("not S or L");
      expect(r.cleanPocket).toBe(CLEAN_POCKET_FILED);
    }
    // With the step-4 petitions withheld, a bundle with no step-4 block still reads the block.
    const noStep4 = withCleanPocket(SW_TUNABLES, CLEAN_POCKET_FILED);
    const r = pocketRulesUnder(noStep4, { P5: true, P17: true, P6: false, P7: false, P8: false });
    if (r.kind !== "S") throw new Error("not S");
    expect(r.cleanPocket).toBe(CLEAN_POCKET_FILED);
  });

  it("the accepted variants: every part off with no floor, each part alone, the reset 0 (E10) and 1.0, the floor alone", () => {
    const variants = [
      CLEAN_POCKET_OFF,
      { ...CLEAN_POCKET_OFF, d23: true },
      { ...CLEAN_POCKET_OFF, move: true },
      { ...CLEAN_POCKET_OFF, move: true, bump: true },
      { ...CLEAN_POCKET_OFF, breakOut: true, d23OnRun: true },
      { ...CLEAN_POCKET_OFF, dropFloor: DROP_FLOOR_FILED },
      { ...CLEAN_POCKET_FILED, resetSeconds: 0 },
      { ...CLEAN_POCKET_FILED, resetSeconds: 1.5 },
    ];
    for (const block of variants) {
      const r = pocketRulesOf(withCleanPocket(S4S_TUNABLES, block));
      if (r.kind !== "S") throw new Error("not S");
      expect(r.cleanPocket).toBe(block);
    }
  });
});

describe("ADR-089 step 5a: refused under legacy, on kind T and without its stamp, never ignored", () => {
  it("under legacy: playsLegacyRules is false and pocketRulesOf refuses it by name", () => {
    for (const block of [CLEAN_POCKET_FILED, CLEAN_POCKET_OFF]) {
      const legacy = withCleanPocket(DEFAULT_TUNABLES, block);
      expect(playsLegacyRules(legacy)).toBe(false);
      expect(playsTodaysLine(legacy)).toBe(false);
      expect(refusalUnder(legacy)).toBe(
        "@ff/engine: the clean-pocket block (pocket.cleanPocket) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule, read on shapes S and L only",
      );
      // A stamp does not make it a legacy rule either.
      expect(refusalUnder({ ...legacy, engineRules: stamp("fnv1a:7f000003", "pocket-1.s5a") })).toMatch(
        /^@ff\/engine: the clean-pocket block \(pocket\.cleanPocket\) without a block clock/,
      );
    }
  });

  it("on kind T: playsTodaysLine is false and pocketRulesOf refuses it by name", () => {
    const t = withCleanPocket(T_TUNABLES, CLEAN_POCKET_FILED);
    expect(playsTodaysLine(T_TUNABLES)).toBe(true);
    expect(playsTodaysLine(t)).toBe(false);
    expect(playsLegacyRules(t)).toBe(false);
    for (const petitions of [undefined, GRANTED]) {
      expect(refusalUnder(t, petitions)).toBe(
        "@ff/engine: the clean-pocket block (pocket.cleanPocket) on today's line plus contact (kind T), which has no block clock; it is read on shapes S and L only",
      );
    }
    expect(refusalUnder(withCleanPocket(T_TUNABLES, CLEAN_POCKET_OFF))).toMatch(/on today's line plus contact \(kind T\)/);
  });

  it("without its stamp on S or L: refused by name", () => {
    for (const base of [S4S_TUNABLES, S4L_TUNABLES, SW_TUNABLES, L5_TUNABLES]) {
      const unstamped: Tunables = { ...withCleanPocket(base, CLEAN_POCKET_FILED) };
      delete (unstamped as { engineRules?: unknown }).engineRules;
      expect(refusalUnder(unstamped)).toMatch(/without its rules stamp \(engineRules \{ name, overlayDigest \}\)/);
    }
    const bare = withBlocks(withCleanPocket(DEFAULT_TUNABLES, CLEAN_POCKET_FILED), { beatClock: BEAT_CLOCK, approach: APPROACH_CARD });
    expect(refusalUnder(bare)).toBe(
      "@ff/engine: the clean-pocket block (pocket.cleanPocket) without its rules stamp (engineRules { name, overlayDigest })",
    );
  });

  it("a play handed a refused tree throws before any event", () => {
    const { state, calls } = buildScenario();
    expect(() => simulatePassPlay(state, calls, "s5-refused", withCleanPocket(DEFAULT_TUNABLES, CLEAN_POCKET_FILED))).toThrow(PocketRulesError);
    expect(() => simulatePassPlay(state, calls, "s5-refused", withCleanPocket(T_TUNABLES, CLEAN_POCKET_FILED))).toThrow(PocketRulesError);
  });
});

describe("ADR-089 step 5a: the block's dials", () => {
  const refusal = (block: unknown): string => refusalUnder(withCleanPocket(S4S_TUNABLES, block));

  it("an object, five switches true or false", () => {
    expect(refusal("on")).toMatch(/the clean-pocket block \(pocket\.cleanPocket\) must be an object, got on/);
    expect(refusal(null)).toMatch(/must be an object, got null/);
    expect(refusal([CLEAN_POCKET_FILED])).toMatch(/must be an object/);
    for (const name of ["d23", "move", "bump", "breakOut", "d23OnRun"] as const) {
      expect(refusal({ ...CLEAN_POCKET_FILED, [name]: 1 })).toBe(`@ff/engine: pocket.cleanPocket.${name} must be true or false, got 1`);
      const missing: Record<string, unknown> = { ...CLEAN_POCKET_FILED };
      delete missing[name];
      expect(refusal(missing)).toBe(`@ff/engine: pocket.cleanPocket.${name} must be true or false, got undefined`);
    }
  });

  it("D23's bar is 30 and nothing else", () => {
    for (const bar of [25, 31, "30", undefined]) {
      expect(refusal({ ...CLEAN_POCKET_FILED, expiryBar: bar })).toBe(`@ff/engine: pocket.cleanPocket.expiryBar must be 30 (D23's bar), got ${String(bar)}`);
    }
  });

  it("the reset: a finite number, 0 or more, a whole number of tenths", () => {
    expect(refusal({ ...CLEAN_POCKET_FILED, resetSeconds: -0.5 })).toMatch(/pocket\.cleanPocket\.resetSeconds must be a finite number, 0 or more, got -0\.5/);
    expect(refusal({ ...CLEAN_POCKET_FILED, resetSeconds: Number.NaN })).toMatch(/resetSeconds must be a finite number, 0 or more/);
    expect(refusal({ ...CLEAN_POCKET_FILED, resetSeconds: Number.POSITIVE_INFINITY })).toMatch(/resetSeconds must be a finite number, 0 or more/);
    expect(refusal({ ...CLEAN_POCKET_FILED, resetSeconds: "1.0" })).toMatch(/resetSeconds must be a finite number, 0 or more/);
    expect(refusal({ ...CLEAN_POCKET_FILED, resetSeconds: 0.25 })).toBe(
      "@ff/engine: pocket.cleanPocket.resetSeconds must be a whole number of tenths of a second (the restated budget is rounded to the tenth), got 0.25",
    );
  });

  it("the drop floor, when present, is exactly the CHOSEN four by depth class", () => {
    expect(refusal({ ...CLEAN_POCKET_FILED, dropFloor: true })).toMatch(/pocket\.cleanPocket\.dropFloor must be an object \{ QUICK, SHORT, INTERMEDIATE, DEEP \}/);
    expect(refusal({ ...CLEAN_POCKET_FILED, dropFloor: { ...DROP_FLOOR_FILED, SHORT: 1.0 } })).toBe(
      "@ff/engine: pocket.cleanPocket.dropFloor.SHORT must be 1.5 (the drop floor is CHOSEN, ADR-089 §4.6), got 1",
    );
    expect(refusal({ ...CLEAN_POCKET_FILED, dropFloor: { QUICK: 1.0, SHORT: 1.5, INTERMEDIATE: 2.0 } })).toMatch(/dropFloor\.DEEP must be 2 .* got undefined/);
    expect(refusal({ ...CLEAN_POCKET_FILED, dropFloor: { ...DROP_FLOOR_FILED, QUICK: 0.5 } })).toMatch(/dropFloor\.QUICK must be 1 /);
  });

  it("a bad dial is named before the step-4 gate, as the step-4 blocks' are", () => {
    expect(refusalUnder(withCleanPocket(S4S_TUNABLES, { ...CLEAN_POCKET_FILED, expiryBar: 25 }), { ...GRANTED, P6: false })).toMatch(
      /pocket\.cleanPocket\.expiryBar must be 30/,
    );
  });
});

describe("ADR-089 step 5a: nothing reads the block yet beyond the reader", () => {
  it("under S and L the all-off block gives the stream the bundle gives without it (same stamp)", () => {
    for (const base of [S4S_TUNABLES, S4L_TUNABLES, SW_TUNABLES, withStep4(L5_TUNABLES, {})]) {
      for (let i = 0; i < 12; i++) {
        const { state, calls } = buildScenario();
        const without = simulatePassPlay(state, calls, `s5-off-${i}`, base);
        const again = buildScenario();
        const withBlock = simulatePassPlay(again.state, again.calls, `s5-off-${i}`, withCleanPocket(base, CLEAN_POCKET_OFF));
        expect(JSON.stringify(withBlock.events)).toBe(JSON.stringify(without.events));
      }
    }
  });
});
