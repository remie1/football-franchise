/**
 * ADR-089 step 6: the switch learns the outs block (`sim/pocketRules.ts`; step-6 plan §1.2, §1.3).
 *
 * 1. Absent from DEFAULT_TUNABLES, not even as an `undefined` key, and from every bundle of steps
 *    1 to 5a, each of which reads `outs` undefined.
 * 2. The petitions: P9, P10, P11, P12, P20 and P21 are false, each declared once as a literal. While
 *    any of P9 to P12 is out, every tree carrying the block is refused before the first die, the
 *    all-off block included, naming the missing ones; with them granted (a test's own set) shapes S
 *    and L read the block, the tunables' own object. P20 gates the caught escape as contact, P21 the
 *    unseen answer, each alone. A withheld petition is still refused by name.
 * 3. The refusals, each named: under legacy (`playsLegacyRules` false for a tree carrying it), on kind
 *    T (`playsTodaysLine` false too), and without its stamp.
 * 4. The dials: seven switches, the three owner questions' closed sets (every option accepted), the
 *    fixed objects, a key the block does not have, and the parts that need another.
 * 5. The log refuses each fact P9 to P12 add unless a test's recorder takes it, and puts it where the
 *    stream will carry it; the stand-in types are the petitions' text (type-level, `tsc` runs here).
 * 6. The scoring marker is typed on `PassPlayStartPayload` (plan §1.3).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { attrId } from "@ff/contracts";
import type { PlayerId, RunSide, ThrowawayCause } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { PetitionNotInContractsError, PlayEventLog, SCRAMBLE_DRILL_KIND, scrambleDrillPayload } from "../src/events.js";
import type { ScrambleDrillEmission, ThrowawayCauseS6, ThrowawayRecordS6 } from "../src/events.js";
import { simulatePassPlayWith } from "../src/sim/passPlay.js";
import {
  P10_IN_CONTRACTS,
  P11_IN_CONTRACTS,
  P12_IN_CONTRACTS,
  P20_IN_CONTRACTS,
  P21_IN_CONTRACTS,
  P9_IN_CONTRACTS,
  PocketRulesError,
  playsLegacyRules,
  playsTodaysLine,
  pocketRulesOf,
  pocketRulesUnder,
} from "../src/sim/pocketRules.js";
import type { ContractPetitions } from "../src/sim/pocketRules.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { OutsTunables, Tunables } from "../src/tunables.js";
import type { PassPlayStartPayload } from "../src/types.js";
import { buildScenario } from "./fixtures.js";
import { APPROACH_CARD, BEAT_CLOCK, L5_TUNABLES, RULE_SETS, SW_TUNABLES, S_TUNABLES, stamp, withBlocks } from "./pocketTunables.js";
import { GRANTED, S4C_TUNABLES, S4L_TUNABLES, S4M_TUNABLES, S4S_TUNABLES, S4_TUNABLES, T_TUNABLES } from "./step4Fixtures.js";
import { CLEAN_POCKET_FILED, S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, withCleanPocket } from "./step5Fixtures.js";
import { GRANTED_S6, OUTS_FILED, OUTS_OFF, S6L_TUNABLES, S6S_TUNABLES, eventAt, outsParts, recorder, withOuts } from "./step6Fixtures.js";

const OLDER_SETS: readonly { readonly name: string; readonly tunables: Tunables }[] = [
  ...RULE_SETS,
  { name: "S4", tunables: S4_TUNABLES },
  { name: "S4S", tunables: S4S_TUNABLES },
  { name: "S4L", tunables: S4L_TUNABLES },
  { name: "S4C", tunables: S4C_TUNABLES },
  { name: "S4M", tunables: S4M_TUNABLES },
  { name: "T", tunables: T_TUNABLES },
  { name: "S5", tunables: S5_TUNABLES },
  { name: "S5S", tunables: S5S_TUNABLES },
  { name: "S5L", tunables: S5L_TUNABLES },
];

const GATE = (missing: string): string =>
  `@ff/engine: the outs block (pocket.outs) is refused until petitions P9, P10, P11 and P12 are in contracts (not yet: ${missing}): the outs write an OUT_OF_POCKET throwaway, THROWAWAY.outsideTackleBox, QB_DECISION.direction and a scramble_drill CHECK`;
const P20_GATE =
  "@ff/engine: the caught escape as contact (pocket.outs.caughtAsContact) is refused until petition P20 is in contracts: its QB_HIT's contactSeconds is the time the escape caught him, a reading QB_HIT.contactSeconds' doc does not list yet";
const P21_GATE =
  "@ff/engine: pocket.outs.caughtSeen UNSEEN_IF_UNREGISTERED is refused until petition P21 is in contracts: QB_HIT.seen is true on every contact before ADR-089 step 7 until its doc allows a catch from a block to be unseen";

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

function outsOf(tunables: Tunables, petitions: ContractPetitions = GRANTED_S6): OutsTunables | undefined {
  const r = pocketRulesUnder(tunables, petitions);
  if (r.kind !== "S" && r.kind !== "L") throw new Error(`not S or L: ${r.kind}`);
  return r.outs;
}

describe("ADR-089 step 6: the outs block is absent by default", () => {
  it("DEFAULT_TUNABLES has no pocket.outs, not even as an undefined key, and legacy stays the bare LEGACY", () => {
    expect("outs" in DEFAULT_TUNABLES.pocket).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(DEFAULT_TUNABLES.pocket, "outs")).toBe(false);
    expect(pocketRulesOf(DEFAULT_TUNABLES)).toEqual({ kind: "LEGACY" });
    expect(Object.keys(pocketRulesOf(DEFAULT_TUNABLES))).toEqual(["kind"]);
    expect(playsLegacyRules(DEFAULT_TUNABLES)).toBe(true);
    expect(playsTodaysLine(DEFAULT_TUNABLES)).toBe(true);
  });

  it("no bundle of steps 1 to 5a carries the key, each reads outs undefined, and each reads alike with step 6's petitions granted or not", () => {
    for (const { name, tunables } of OLDER_SETS) {
      expect("outs" in tunables.pocket, name).toBe(false);
      const r = pocketRulesUnder(tunables, GRANTED_S6);
      expect(pocketRulesUnder(tunables, GRANTED)).toEqual(r);
      expect(pocketRulesOf(tunables)).toEqual(r);
      if (r.kind === "LEGACY") {
        expect(name).toBe("legacy");
        continue;
      }
      expect("outs" in r, name).toBe(true);
      expect(r.outs, name).toBeUndefined();
    }
  });
});

describe("ADR-089 step 6: the petitions are not in contracts, and the gate is joint", () => {
  it("P9, P10, P11, P12, P20 and P21 are false, each declared once as a literal (the form calibration's tie test reads)", () => {
    expect([P9_IN_CONTRACTS, P10_IN_CONTRACTS, P11_IN_CONTRACTS, P12_IN_CONTRACTS, P20_IN_CONTRACTS, P21_IN_CONTRACTS]).toEqual([false, false, false, false, false, false]);
    const source = readFileSync(fileURLToPath(new URL("../src/sim/pocketRules.ts", import.meta.url)), "utf8");
    for (const name of ["P9", "P10", "P11", "P12", "P20", "P21"]) {
      const declared = [...source.matchAll(new RegExp(`^export const ${name}_IN_CONTRACTS = (true|false);$`, "gm"))].map((x) => x[1]);
      expect(declared, name).toEqual(["false"]);
    }
  });

  it("pocketRulesOf refuses every tree carrying the block on S and L, every part off included, naming the four; so does a play, before any event", () => {
    for (const block of [OUTS_FILED, OUTS_OFF, outsParts({ throwawayRule: true }), outsParts({ failedScrambleSack: true })]) {
      for (const base of [S5S_TUNABLES, S5L_TUNABLES, S4S_TUNABLES, SW_TUNABLES, L5_TUNABLES]) {
        const t = withOuts(base, block);
        expect(refusalUnder(t)).toBe(GATE("P9, P10, P11, P12"));
        // Step 4's granted set leaves step 6's out, and they read as their constants.
        expect(refusalUnder(t, GRANTED)).toBe(GATE("P9, P10, P11, P12"));
      }
    }
    const { state, calls } = buildScenario();
    expect(() => simulatePassPlay(state, calls, "s6-gate", S6S_TUNABLES)).toThrow(PocketRulesError);
    expect(() => simulatePassPlay(state, calls, "s6-gate", withOuts(S5S_TUNABLES, OUTS_OFF))).toThrow(GATE("P9, P10, P11, P12").slice("@ff/engine: ".length));
  });

  it("with P9 to P12 (and P20) granted, S and L read the block, the tunables' own object, in frozen rules", () => {
    const s = pocketRulesUnder(S6S_TUNABLES, GRANTED_S6);
    if (s.kind !== "S") throw new Error("not S");
    expect(s.outs).toBe(OUTS_FILED);
    expect(s.cleanPocket).toBe(CLEAN_POCKET_FILED);
    expect(Object.isFrozen(s)).toBe(true);
    expect(s.rules).toEqual({ name: "pocket-1.s6", overlayDigest: "fnv1a:7f600002" });
    expect(Object.keys(s.rules)).toEqual(["name", "overlayDigest"]);
    const l = pocketRulesUnder(S6L_TUNABLES, GRANTED_S6);
    if (l.kind !== "L") throw new Error("not L");
    expect(l.outs).toBe(OUTS_FILED);
    expect(playsLegacyRules(S6S_TUNABLES)).toBe(false);
    expect(playsTodaysLine(S6S_TUNABLES)).toBe(false);
    // Read on any S or L bundle, with or without the step-3 to step-5 blocks.
    for (const base of [S_TUNABLES, SW_TUNABLES, L5_TUNABLES, S4_TUNABLES, S4S_TUNABLES, S5_TUNABLES]) {
      expect(outsOf(withOuts(base, OUTS_OFF)), base.engineRules?.name).toBe(OUTS_OFF);
    }
  });

  it("a withheld petition is still refused by name: each of the four alone", () => {
    for (const petition of ["P9", "P10", "P11", "P12"] as const) {
      expect(refusalUnder(S6S_TUNABLES, { ...GRANTED_S6, [petition]: false })).toBe(GATE(petition));
      expect(refusalUnder(withOuts(S5S_TUNABLES, OUTS_OFF), { ...GRANTED_S6, [petition]: false })).toBe(GATE(petition));
    }
    expect(refusalUnder(S6S_TUNABLES, { ...GRANTED_S6, P10: false, P12: false })).toBe(GATE("P10, P12"));
    const { state, calls } = buildScenario();
    expect(() => simulatePassPlayWith(state, calls, "s6-withheld", S6S_TUNABLES, { petitions: { ...GRANTED_S6, P11: false } })).toThrow(PocketRulesError);
  });

  it("P20 gates the caught escape as contact, and only it", () => {
    const withheld = { ...GRANTED_S6, P20: false };
    expect(refusalUnder(S6S_TUNABLES, withheld)).toBe(P20_GATE);
    expect(refusalUnder(withOuts(S5S_TUNABLES, outsParts({ caughtAsContact: true, caughtSeen: "SEEN" })), withheld)).toBe(P20_GATE);
    const noContact = { ...OUTS_FILED, caughtAsContact: false } as Record<string, unknown>;
    delete noContact["caughtSeen"];
    expect(outsOf(withOuts(S5S_TUNABLES, noContact), withheld)).toBe(noContact);
    // Left out, P20 reads as its constant (false).
    const { P20: _p20, ...withoutP20 } = GRANTED_S6;
    expect(refusalUnder(S6S_TUNABLES, withoutP20)).toBe(P20_GATE);
  });

  it("P21 gates the unseen answer, and only it; the recommended SEEN needs no P21", () => {
    const unseen = withOuts(S5S_TUNABLES, { ...OUTS_FILED, caughtSeen: "UNSEEN_IF_UNREGISTERED" });
    expect(refusalUnder(unseen, { ...GRANTED_S6, P21: false })).toBe(P21_GATE);
    expect(outsOf(unseen)?.caughtSeen).toBe("UNSEEN_IF_UNREGISTERED");
    expect(outsOf(S6S_TUNABLES, { ...GRANTED_S6, P21: false })?.caughtSeen).toBe("SEEN");
    // P20 is read first: an unseen contact without P20 names P20.
    expect(refusalUnder(unseen, { ...GRANTED_S6, P20: false, P21: false })).toBe(P20_GATE);
  });

  it("the step-4 gate is read before step 6's, and a bad dial is named before either", () => {
    expect(refusalUnder(S6S_TUNABLES, { ...GRANTED_S6, P6: false })).toMatch(/refused until petitions P6, P7 and P8 are in contracts \(not yet: P6\)/);
    expect(refusalUnder(withOuts(S5S_TUNABLES, { ...OUTS_FILED, drill: "yes" }), { ...GRANTED_S6, P6: false, P9: false })).toBe(
      "@ff/engine: pocket.outs.drill must be true or false, got yes",
    );
    expect(refusalUnder(withOuts(S5S_TUNABLES, { ...OUTS_FILED, drill: "yes" }))).toBe("@ff/engine: pocket.outs.drill must be true or false, got yes");
  });
});

describe("ADR-089 step 6: refused under legacy, on kind T and without its stamp, never ignored", () => {
  it("under legacy: playsLegacyRules is false and pocketRulesOf refuses it by name", () => {
    for (const block of [OUTS_FILED, OUTS_OFF]) {
      const legacy = withOuts(DEFAULT_TUNABLES, block);
      expect(playsLegacyRules(legacy)).toBe(false);
      expect(playsTodaysLine(legacy)).toBe(false);
      for (const petitions of [undefined, GRANTED_S6]) {
        expect(refusalUnder(legacy, petitions)).toBe(
          "@ff/engine: the outs block (pocket.outs) without a block clock (passRush.beatClock or passRush.repClock); it is a pocket-1 rule, read on shapes S and L only",
        );
      }
      // A stamp does not make it a legacy rule either.
      expect(refusalUnder({ ...legacy, engineRules: stamp("fnv1a:7f600004", "pocket-1.s6") })).toMatch(/^@ff\/engine: the outs block \(pocket\.outs\) without a block clock/);
    }
  });

  it("on kind T: playsTodaysLine is false and pocketRulesOf refuses it by name", () => {
    const t = withOuts(T_TUNABLES, OUTS_OFF);
    expect(playsTodaysLine(T_TUNABLES)).toBe(true);
    expect(playsTodaysLine(t)).toBe(false);
    expect(playsLegacyRules(t)).toBe(false);
    for (const petitions of [undefined, GRANTED_S6]) {
      expect(refusalUnder(t, petitions)).toBe(
        "@ff/engine: the outs block (pocket.outs) on today's line plus contact (kind T), which has no block clock; it is read on shapes S and L only",
      );
    }
    expect(refusalUnder(withOuts(T_TUNABLES, OUTS_FILED), GRANTED_S6)).toMatch(/on today's line plus contact \(kind T\)/);
    // Kind T itself reads outs undefined.
    const plain = pocketRulesUnder(T_TUNABLES, GRANTED_S6);
    if (plain.kind !== "T") throw new Error("not T");
    expect(plain.outs).toBeUndefined();
  });

  it("without its stamp on S or L: refused by name", () => {
    for (const base of [S5S_TUNABLES, S5L_TUNABLES, SW_TUNABLES, L5_TUNABLES]) {
      const unstamped: Tunables = { ...withOuts(base, OUTS_OFF) };
      delete (unstamped as { engineRules?: unknown }).engineRules;
      expect(refusalUnder(unstamped, GRANTED_S6)).toMatch(/without its rules stamp \(engineRules \{ name, overlayDigest \}\)/);
    }
    const bare = withBlocks(withOuts(DEFAULT_TUNABLES, OUTS_OFF), { beatClock: BEAT_CLOCK, approach: APPROACH_CARD });
    expect(refusalUnder(bare, GRANTED_S6)).toBe("@ff/engine: the outs block (pocket.outs) without its rules stamp (engineRules { name, overlayDigest })");
  });

  it("a play handed a refused tree throws before any event", () => {
    const { state, calls } = buildScenario();
    expect(() => simulatePassPlay(state, calls, "s6-refused", withOuts(DEFAULT_TUNABLES, OUTS_FILED))).toThrow(PocketRulesError);
    expect(() => simulatePassPlay(state, calls, "s6-refused", withOuts(T_TUNABLES, OUTS_OFF))).toThrow(PocketRulesError);
    expect(() => simulatePassPlayWith(state, calls, "s6-refused", withOuts(T_TUNABLES, OUTS_OFF), { petitions: GRANTED_S6 })).toThrow(PocketRulesError);
  });
});

describe("ADR-089 step 6: the block's dials", () => {
  const refusal = (block: unknown): string => refusalUnder(withOuts(S5S_TUNABLES, block), GRANTED_S6);
  const accepted = (block: unknown): OutsTunables | undefined => outsOf(withOuts(S5S_TUNABLES, block));

  it("an object, seven switches true or false", () => {
    expect(refusal("on")).toBe("@ff/engine: the outs block (pocket.outs) must be an object, got on");
    expect(refusal(null)).toMatch(/must be an object, got null/);
    expect(refusal([OUTS_FILED])).toMatch(/must be an object/);
    for (const name of ["throwawayRule", "noLateHorizonSack", "direction", "caughtAsContact", "drill", "drillBySide", "failedScrambleSack"] as const) {
      expect(refusal({ ...OUTS_FILED, [name]: 1 })).toBe(`@ff/engine: pocket.outs.${name} must be true or false, got 1`);
      const missing: Record<string, unknown> = { ...OUTS_FILED };
      delete missing[name];
      expect(refusal(missing)).toBe(`@ff/engine: pocket.outs.${name} must be true or false, got undefined`);
    }
  });

  it("a key the block does not have is refused by name", () => {
    expect(refusal({ ...OUTS_FILED, escapecap: { maxPerPlay: 1, whenSpent: "HOLD" } })).toBe(
      "@ff/engine: pocket.outs.escapecap is not a key of the outs block (throwawayRule, scrambleStart, escapeCap, pursuit, noLateHorizonSack, direction, sideCatch, caughtAsContact, caughtSeen, drill, drillBySide, deadlinePick, failedScrambleSack)",
    );
    expect(refusal({ ...OUTS_FILED, seen: "SEEN" })).toMatch(/pocket\.outs\.seen is not a key of the outs block/);
  });

  it("every part off, every part on, and each part alone are accepted, each the tunables' own object", () => {
    const alone: OutsTunables[] = [
      OUTS_OFF,
      OUTS_FILED,
      outsParts({ throwawayRule: true }),
      outsParts({ scrambleStart: "ZERO_GAIN_ONLY" }),
      outsParts({ escapeCap: { maxPerPlay: 1, whenSpent: "HOLD" } }),
      outsParts({ pursuit: { speedBaseline: 70, speedDivisor: 5, mobilityDivisor: 10, mobilityCentering: 7 } }),
      outsParts({ noLateHorizonSack: true }),
      outsParts({ direction: true }),
      outsParts({ direction: true, sideCatch: { perLiveThreat: 10, perUnregistered: 15 } }),
      outsParts({ caughtAsContact: true, caughtSeen: "SEEN" }),
      outsParts({ drill: true }),
      outsParts({ direction: true, drill: true, drillBySide: true }),
      outsParts({ deadlinePick: { runMargin: 1 } }),
      outsParts({ failedScrambleSack: true }),
    ];
    for (const block of alone) expect(accepted(block)).toBe(block);
  });

  it("the owner's three questions: every option is accepted (each a leaf), anything else refused by name", () => {
    for (const whenSpent of ["HOLD", "TODAYS_PATH", "SECOND_ESCAPE", "BELOW_30", "CONTAINED_DOES_NOT_SPEND"] as const) {
      expect(accepted({ ...OUTS_FILED, escapeCap: { maxPerPlay: 1, whenSpent } })?.escapeCap?.whenSpent).toBe(whenSpent);
    }
    for (const scrambleStart of ["ZERO_GAIN_ONLY", "EVERY_RUN"] as const) {
      expect(accepted({ ...OUTS_FILED, scrambleStart })?.scrambleStart).toBe(scrambleStart);
    }
    for (const caughtSeen of ["SEEN", "UNSEEN_IF_UNREGISTERED"] as const) {
      expect(accepted({ ...OUTS_FILED, caughtSeen })?.caughtSeen).toBe(caughtSeen);
    }
    expect(refusal({ ...OUTS_FILED, escapeCap: { maxPerPlay: 1, whenSpent: "THROWAWAY" } })).toBe(
      "@ff/engine: the spent case (pocket.outs.escapeCap.whenSpent) is THROWAWAY, which is not one of HOLD, TODAYS_PATH, SECOND_ESCAPE, BELOW_30, CONTAINED_DOES_NOT_SPEND",
    );
    expect(refusal({ ...OUTS_FILED, escapeCap: { maxPerPlay: 1 } })).toMatch(/the spent case \(pocket\.outs\.escapeCap\.whenSpent\) is undefined, which is not one of/);
    expect(refusal({ ...OUTS_FILED, scrambleStart: "WHERE_HE_IS" })).toBe(
      "@ff/engine: the scramble start (pocket.outs.scrambleStart) is WHERE_HE_IS, which is not one of ZERO_GAIN_ONLY, EVERY_RUN",
    );
    expect(refusal({ ...OUTS_FILED, caughtSeen: true })).toBe(
      "@ff/engine: the caught escape's seen (pocket.outs.caughtSeen) is true, which is not one of SEEN, UNSEEN_IF_UNREGISTERED",
    );
  });

  it("caughtSeen is present exactly when the caught escape as contact is on", () => {
    const missing: Record<string, unknown> = { ...OUTS_FILED };
    delete missing["caughtSeen"];
    expect(refusal(missing)).toBe(
      "@ff/engine: pocket.outs.caughtSeen must be one of SEEN, UNSEEN_IF_UNREGISTERED when the caught escape as contact (pocket.outs.caughtAsContact) is on: it is the owner's answer for that contact's QB_HIT.seen, got undefined",
    );
    expect(refusal(outsParts({ caughtSeen: "SEEN" }))).toBe(
      "@ff/engine: pocket.outs.caughtSeen without the caught escape as contact (pocket.outs.caughtAsContact): it is read only by that contact's QB_HIT",
    );
  });

  it("the cap is one roll a play, with exactly its two keys", () => {
    for (const max of [0, 2, "1", undefined]) {
      expect(refusal({ ...OUTS_FILED, escapeCap: { maxPerPlay: max, whenSpent: "HOLD" } })).toBe(
        `@ff/engine: pocket.outs.escapeCap.maxPerPlay must be 1 (one escape roll a play, ADR-089 §4.7), got ${String(max)}`,
      );
    }
    expect(refusal({ ...OUTS_FILED, escapeCap: true })).toBe("@ff/engine: pocket.outs.escapeCap must be an object { maxPerPlay, whenSpent }, got true");
    expect(refusal({ ...OUTS_FILED, escapeCap: { maxPerPlay: 1, whenSpent: "HOLD", perClean: 1 } })).toBe(
      "@ff/engine: pocket.outs.escapeCap.perClean is not a key of pocket.outs.escapeCap (maxPerPlay, whenSpent)",
    );
  });

  it("pursuit, the side-aware catch and the deadline pick are exactly their values, with exactly their keys", () => {
    expect(refusal({ ...OUTS_FILED, pursuit: { ...OUTS_FILED.pursuit, mobilityDivisor: 5 } })).toBe(
      "@ff/engine: pocket.outs.pursuit.mobilityDivisor must be 10 (CHOSEN, step-6 plan §2.4), got 5",
    );
    expect(refusal({ ...OUTS_FILED, pursuit: { speedBaseline: 70, speedDivisor: 5, mobilityDivisor: 10 } })).toBe(
      "@ff/engine: pocket.outs.pursuit.mobilityCentering must be 7 (CHOSEN, step-6 plan §2.4), got undefined",
    );
    expect(refusal({ ...OUTS_FILED, pursuit: 1 })).toBe(
      "@ff/engine: pocket.outs.pursuit must be an object { speedBaseline, speedDivisor, mobilityDivisor, mobilityCentering }, got 1",
    );
    expect(refusal({ ...OUTS_FILED, sideCatch: { perLiveThreat: 10, perUnregistered: 10 } })).toBe(
      "@ff/engine: pocket.outs.sideCatch.perUnregistered must be 15 (CHOSEN in the design, ADR-089 §4.7), got 10",
    );
    expect(refusal({ ...OUTS_FILED, sideCatch: { perLiveThreat: 10, perUnregistered: 15, perEdge: 10 } })).toBe(
      "@ff/engine: pocket.outs.sideCatch.perEdge is not a key of pocket.outs.sideCatch (perLiveThreat, perUnregistered)",
    );
    // K9: the filed margin was 10 at urgency 0 to 3; the deadline pick reads urgency 0 alone, so 1.
    expect(refusal({ ...OUTS_FILED, deadlinePick: { runMargin: 10 } })).toBe(
      "@ff/engine: pocket.outs.deadlinePick.runMargin must be 1 (K9's re-derived margin: the deadline pick reads urgency 0 only), got 10",
    );
  });

  it("the parts that need another are refused without it, by name", () => {
    expect(refusal(outsParts({ sideCatch: { perLiveThreat: 10, perUnregistered: 15 } }))).toBe(
      "@ff/engine: the side-aware catch (pocket.outs.sideCatch) without escape direction (pocket.outs.direction): it reads the side he breaks to",
    );
    expect(refusal({ ...OUTS_FILED, direction: false })).toMatch(/^@ff\/engine: the side-aware catch \(pocket\.outs\.sideCatch\) without escape direction/);
    expect(refusal(outsParts({ drill: true, drillBySide: true }))).toBe(
      "@ff/engine: the side-aware drill (pocket.outs.drillBySide) without escape direction (pocket.outs.direction): it reads the side he breaks to",
    );
    expect(refusal(outsParts({ direction: true, drillBySide: true }))).toBe(
      "@ff/engine: the side-aware drill (pocket.outs.drillBySide) without the drill (pocket.outs.drill): it sizes the drill's burst steps",
    );
    expect(refusal({ ...OUTS_FILED, drill: false })).toMatch(/the side-aware drill \(pocket\.outs\.drillBySide\) without the drill/);
  });
});

describe("ADR-089 step 6: the log refuses what P9 to P12 add, unless a test's recorder takes it", () => {
  const log = (withRecorder: boolean) => {
    const r = recorder();
    return { r, log: new PlayEventLog("g" as never, "p" as never, { season: 1, week: 1 } as never, 0, withRecorder ? r : undefined) };
  };
  const p = "p1" as PlayerId;
  const cb = "cb1" as PlayerId;
  const roll = { die: "d100" as const, raw: 52, modifiers: [], total: 70, rngLabel: "g/movement/t3.0:drill:p1" };
  const drill: ScrambleDrillEmission = {
    checkKind: SCRAMBLE_DRILL_KIND,
    actors: [p, cb],
    roll,
    target: 66.5,
    tier: "SUCCESS",
    band: "TRAILING",
    margin: 3.5,
    testsAttrs: ["routeRunning", "agility", "manCoverage"].map(attrId),
    rollRef: "g/movement/t3.0:scramble",
  };

  it("without a recorder each is refused by name, and nothing is pushed", () => {
    const { log: l } = log(false);
    const refused = (f: () => void, petition: string, what: string): void => {
      expect(f).toThrow(PetitionNotInContractsError);
      expect(f).toThrow(`@ff/engine: ${what} cannot be written: petition ${petition} is not in contracts (ADR-089 step 6)`);
    };
    refused(() => l.throwaway("OUT_OF_POCKET", "g/movement/t4.5:deadline", true), "P9", "an OUT_OF_POCKET THROWAWAY");
    refused(() => l.throwaway("POCKET_DURESS", "g/movement/t2.5:movement", false), "P10", "THROWAWAY.outsideTackleBox");
    refused(() => l.throwaway("CLOCK_EXPIRED", undefined, false), "P10", "THROWAWAY.outsideTackleBox");
    refused(() => l.qbDecision("SCRAMBLE", { direction: "LEFT" }), "P11", "QB_DECISION.direction");
    refused(() => l.scrambleDrill(drill), "P12", "a scramble_drill CHECK");
    expect(l.drain()).toEqual([]);
    // Today's writes stand, key for key.
    l.throwaway("POCKET_DURESS", "g/movement/t2.5:movement");
    l.throwaway("CLOCK_EXPIRED");
    l.qbDecision("SCRAMBLE");
    const out = l.drain().map((e) => e.event.payload as object);
    expect(out.map((x) => Object.keys(x))).toEqual([["cause", "rollRef"], ["cause"], ["choice"]]);
  });

  it("with a recorder each goes where the stream will carry it: a field by its event's seq, a whole record before the next event", () => {
    const { r, log: l } = log(true);
    l.setTick(2.5);
    l.throwaway("POCKET_DURESS", "g/movement/t2.5:movement", false); // seq 0
    l.setTick(3.0);
    l.qbDecision("SCRAMBLE", { direction: "RIGHT" }); // seq 1
    l.scrambleDrill(drill); // before seq 2
    l.qbDecision("HOLD", { direction: "LEFT" }); // seq 2
    l.setTick(4.5);
    l.throwaway("OUT_OF_POCKET", "g/movement/t4.5:deadline", true); // before seq 3, nothing pushed
    l.throwaway("CLOCK_EXPIRED", undefined, false); // seq 3
    const events = l.drain();
    expect(events.map((e) => e.event.type)).toEqual(["THROWAWAY", "QB_DECISION", "QB_DECISION", "THROWAWAY"]);
    expect(events.map((e) => Object.keys(e.event.payload as object))).toEqual([["cause", "rollRef"], ["choice"], ["choice"], ["cause"]]);
    expect(r.records).toEqual([
      { kind: "outsideTackleBox", value: false, at: { seq: 0, tick: 2.5 } },
      { kind: "direction", side: "RIGHT", at: { seq: 1, tick: 3.0 } },
      { kind: "scrambleDrill", payload: scrambleDrillPayload(drill), at: { seq: 2, tick: 3.0 } },
      { kind: "direction", side: "LEFT", at: { seq: 2, tick: 3.0 } },
      { kind: "outOfPocketThrowaway", payload: { cause: "OUT_OF_POCKET", rollRef: "g/movement/t4.5:deadline", outsideTackleBox: true }, at: { seq: 3, tick: 4.5 } },
      { kind: "outsideTackleBox", value: false, at: { seq: 3, tick: 4.5 } },
    ]);
    // A field record names the event that carries it.
    expect(eventAt(events, { seq: 0, tick: 2.5 })?.event.type).toBe("THROWAWAY");
    expect(eventAt(events, { seq: 1, tick: 3.0 })?.event.type).toBe("QB_DECISION");
  });

  it("the drill CHECK is in checkPayload's key order for a CHECK with a roll, with no opposedRoll", () => {
    const payload = scrambleDrillPayload(drill);
    expect(Object.keys(payload)).toEqual(["checkKind", "actors", "roll", "tier", "margin", "testsAttrs", "target", "band", "rollRef"]);
    expect("opposedRoll" in payload).toBe(false);
    expect(payload.actors).not.toBe(drill.actors);
    expect(payload.rollRef).toBe("g/movement/t3.0:scramble");
  });

  it("a play under the seam with every petition granted and no recorder reads the block (the parts write nothing yet)", () => {
    // The parts are built in later commits; until then a granted tree reads the block and plays.
    const { state, calls } = buildScenario();
    for (const t of [withOuts(S5S_TUNABLES, OUTS_OFF), withOuts(S5L_TUNABLES, OUTS_OFF)]) {
      expect(() => simulatePassPlayWith(state, calls, "s6-seam", t, { petitions: GRANTED_S6 })).not.toThrow();
      expect(() => simulatePassPlayWith(state, calls, "s6-seam", t, { petitions: GRANTED_S6, step6Recorder: recorder() })).not.toThrow();
    }
  });
});

describe("ADR-089 step 6: the stand-in types are the petitions' text, so the lift is a type swap (type-level)", () => {
  it("P9: the cause is today's two and OUT_OF_POCKET, closed at three; P10: the flag is a boolean, written only when given", () => {
    const causes: ThrowawayCauseS6[] = ["POCKET_DURESS", "CLOCK_EXPIRED", "OUT_OF_POCKET"];
    const today: ThrowawayCause = "CLOCK_EXPIRED";
    const widened: ThrowawayCauseS6 = today;
    // @ts-expect-error GROUNDED is not a throwaway cause: a fourth path is a widening petition
    const fourth: ThrowawayCauseS6 = "GROUNDED";
    const out: ThrowawayRecordS6 = { cause: "OUT_OF_POCKET", rollRef: "g/movement/t4.5:deadline", outsideTackleBox: true };
    const plain: ThrowawayRecordS6 = { cause: "CLOCK_EXPIRED" };
    // @ts-expect-error exactOptionalPropertyTypes: outsideTackleBox: undefined is refused
    const undef: ThrowawayRecordS6 = { cause: "CLOCK_EXPIRED", outsideTackleBox: undefined };
    // @ts-expect-error a flag, not a distance
    const yards: ThrowawayRecordS6 = { cause: "CLOCK_EXPIRED", outsideTackleBox: 3 };
    expect(causes).toHaveLength(3);
    expect([widened, fourth, out.cause, plain.cause, undef.cause, yards.cause]).toHaveLength(6);
    expect(Object.keys(plain)).toEqual(["cause"]);
  });

  it("P11: the side is RunSide, LEFT or RIGHT, as on the play cards", () => {
    const { log: l } = { log: new PlayEventLog("g" as never, "p" as never, { season: 1, week: 1 } as never, 0, recorder()) };
    const side: RunSide = "LEFT";
    l.qbDecision("SCRAMBLE", { direction: side });
    // @ts-expect-error a side is LEFT or RIGHT
    l.qbDecision("SCRAMBLE", { direction: "MIDDLE" });
    expect(l.drain()).toHaveLength(2);
  });

  it("P12: the kind is the petition's word; the band is a coverage position", () => {
    expect(SCRAMBLE_DRILL_KIND).toBe("scramble_drill");
    const band: ScrambleDrillEmission["band"] = "IN_FRONT";
    // @ts-expect-error the drill's band is TRAILING, EVEN or IN_FRONT
    const wrong: ScrambleDrillEmission["band"] = "OPEN";
    expect([band, wrong]).toHaveLength(2);
  });

  it("plan §1.3: PLAY_START's scoring marker is typed on PassPlayStartPayload, one value", () => {
    const marker: NonNullable<PassPlayStartPayload["scoring"]> = { failedScramble: "SACK" };
    // @ts-expect-error a failed scramble is scored as a sack or not marked at all
    const run: NonNullable<PassPlayStartPayload["scoring"]> = { failedScramble: "RUN" };
    expect([marker, run].map((m) => Object.keys(m))).toEqual([["failedScramble"], ["failedScramble"]]);
  });
});
