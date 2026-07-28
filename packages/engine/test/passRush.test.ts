import { createRng, setAttr } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { ATTR, resolveAttr } from "../src/attrs.js";
import { resolvePassRushTick } from "../src/resolve/passRush.js";
import {
  accuracyModifierFor,
  advancePressure,
  forcesDecision,
  pocketStatusFor,
  readCapacityDeltaFor,
} from "../src/resolve/pocket.js";
import { TUNABLES, applyTunablePatch } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";

const eliteRusher = makePlayer("r-elite", "Elite Rusher", "DE", {
  passRush: 99, firstStep: 99, powerMove: 99, finesseMove: 99, strength: 99,
}, ["quickTwitch"]);
const poorBlocker = makePlayer("b-poor", "Turnstile", "LT", {
  passBlock: 5, footwork: 5, strength: 20,
});
const eliteBlocker = makePlayer("b-elite", "Wall", "LT", {
  passBlock: 99, footwork: 99, strength: 95,
}, ["brickWall"]);
const poorRusher = makePlayer("r-poor", "Practice Squad", "DE", {
  passRush: 5, firstStep: 5, powerMove: 5, finesseMove: 5, strength: 20,
});

/** The same blocker at a stated `anchor`, everything else held fixed. */
function blockerWithAnchor(rating: number): typeof eliteBlocker {
  const base = makePlayer("b-anchor", "Anchor Test", "LT", {
    passBlock: 60, footwork: 60, strength: 60,
  });
  return {
    ...base,
    attributes: { ...base.attributes, values: setAttr(base.attributes.values, ATTR.anchor, rating) },
  };
}

describe("§7.1 pass rush per tick", () => {
  it("is an opposed roll: rusher roll, blocker opposedRoll, margin = difference", () => {
    const out = resolvePassRushTick({ tunables: TUNABLES,
      rusher: eliteRusher,
      blocker: eliteBlocker,
      move: "SPEED",
      tickRng: createRng("s", "t").fork("x"),
    });
    expect(out.check.checkKind).toBe("pass_rush_tick");
    expect(out.check.opposedRoll).toBe(out.blockerRoll);
    expect(out.margin).toBe(out.rusherRoll.total - out.blockerRoll.total);
  });

  it("applies the move's attribute package (speed / power / finesse)", () => {
    const rng = createRng("s", "t");
    const speed = resolvePassRushTick({ tunables: TUNABLES, rusher: eliteRusher, blocker: eliteBlocker, move: "SPEED", tickRng: rng });
    const power = resolvePassRushTick({ tunables: TUNABLES, rusher: eliteRusher, blocker: eliteBlocker, move: "POWER", tickRng: rng });
    const finesse = resolvePassRushTick({ tunables: TUNABLES, rusher: eliteRusher, blocker: eliteBlocker, move: "FINESSE", tickRng: rng });
    const sources = (o: typeof speed): string[] => o.rusherRoll.modifiers.map((m) => m.source);
    expect(sources(speed).some((s) => s.includes("First Step"))).toBe(true);
    expect(sources(power).some((s) => s.includes("Power Move"))).toBe(true);
    expect(sources(power).some((s) => s.includes("Strength"))).toBe(true);
    expect(sources(finesse).some((s) => s.includes("Finesse Move"))).toBe(true);
  });

  it("adds the counter-move bonus only after a stalemate", () => {
    const rng = createRng("s", "t");
    const after = resolvePassRushTick({ tunables: TUNABLES,
      rusher: eliteRusher, blocker: eliteBlocker, move: "SPEED", previousBand: "STALEMATE", tickRng: rng,
    });
    const counter = after.rusherRoll.modifiers.find((m) => m.source.includes("Counter move"));
    expect(counter?.value).toBe(TUNABLES.passRush.counterMoveAfterStalemate);

    const without = resolvePassRushTick({ tunables: TUNABLES,
      rusher: eliteRusher, blocker: eliteBlocker, move: "SPEED", previousBand: "BLOCKER_CONTAINS", tickRng: rng,
    });
    expect(without.rusherRoll.modifiers.some((m) => m.source.includes("Counter move"))).toBe(false);
  });

  it("fires Quick Twitch only on speed rushes and Brick Wall only against power", () => {
    const rng = createRng("traits", "t");
    const speed = resolvePassRushTick({ tunables: TUNABLES, rusher: eliteRusher, blocker: eliteBlocker, move: "SPEED", tickRng: rng });
    const power = resolvePassRushTick({ tunables: TUNABLES, rusher: eliteRusher, blocker: eliteBlocker, move: "POWER", tickRng: rng });
    expect(speed.rusherRoll.modifiers.some((m) => m.source.includes("Quick Twitch"))).toBe(true);
    expect(power.rusherRoll.modifiers.some((m) => m.source.includes("Quick Twitch"))).toBe(false);
    expect(power.blockerRoll.modifiers.some((m) => m.source.includes("Brick Wall"))).toBe(true);
    expect(speed.blockerRoll.modifiers.some((m) => m.source.includes("Brick Wall"))).toBe(false);
  });

  it("a dominant rusher wins reps and a dominant blocker resets them", () => {
    let rusherWins = 0;
    let blockerResets = 0;
    for (let i = 0; i < 100; i++) {
      const rng = createRng(`rush-${i}`, "t");
      if (resolvePassRushTick({ tunables: TUNABLES, rusher: eliteRusher, blocker: poorBlocker, move: "POWER", tickRng: rng }).band === "RUSHER_WINS_REP") rusherWins++;
      if (resolvePassRushTick({ tunables: TUNABLES, rusher: poorRusher, blocker: eliteBlocker, move: "FINESSE", tickRng: rng }).band === "BLOCKER_RESETS") blockerResets++;
    }
    expect(rusherWins).toBeGreaterThan(70);
    expect(blockerResets).toBeGreaterThan(50);
  });

  /**
   * ADR-028 PETITION 1 — the blocker's third ATTRIBUTE term, and petition 2's
   * constant at 0. The two are one change and are asserted as one: a test that
   * checked only for the anchor term would pass on the configuration ADR-028
   * calls the worst measured in a sixty-config sweep (the term added on TOP of
   * the constant), and a test that checked only the constant would pass on the
   * configuration it calls worse still (the constant removed with nothing put in
   * its place).
   */
  describe("ADR-028 — the blocker's three attribute terms and no constant", () => {
    it("Anchor is a NAMED modifier on the blocker's roll, at the blocker divisor", () => {
      const blocker = blockerWithAnchor(80);
      const out = resolvePassRushTick({
        tunables: TUNABLES, rusher: eliteRusher, blocker, move: "SPEED",
        tickRng: createRng("anchor", "t"),
      });
      const anchor = out.blockerRoll.modifiers.find((m) => m.source.includes("Anchor"));
      expect(anchor).toBeDefined();
      expect(anchor?.attr).toBe(ATTR.anchor);
      expect(anchor?.value).toBe(Math.round(80 / TUNABLES.passRush.blockerAttrDivisor));
    });

    /**
     * The divisor is `passRush.blockerAttrDivisor` and NOT the separate
     * `blitzPickup.blockerAttrDivisor` §7.4 uses. They are both 5 today, so a
     * value assertion cannot tell them apart; patching one and watching the term
     * follow it can.
     */
    it("Anchor follows §7.1's blocker divisor, not §7.4's", () => {
      const patched = applyTunablePatch(TUNABLES, {
        tunableId: "passRush.blockerAttrDivisor",
        currentValue: TUNABLES.passRush.blockerAttrDivisor,
        proposedValue: 10,
        evidence: "unit test",
        expectedEffect: "every §7.1 blocker term halves",
      });
      expect(patched.blitzPickup.blockerAttrDivisor).toBe(5);
      const out = resolvePassRushTick({
        tunables: patched, rusher: eliteRusher, blocker: blockerWithAnchor(80), move: "SPEED",
        tickRng: createRng("divisor", "t"),
      });
      const anchor = out.blockerRoll.modifiers.find((m) => m.source.includes("Anchor"));
      expect(anchor?.value).toBe(Math.round(80 / 10));
    });

    it("the blocker's stack is THREE attribute terms and nothing else", () => {
      const out = resolvePassRushTick({
        tunables: TUNABLES, rusher: eliteRusher, blocker: blockerWithAnchor(60), move: "SPEED",
        tickRng: createRng("stack", "t"),
      });
      // No trait fires (no Brick Wall, and the move is not POWER), so every
      // modifier on this roll must be attribute-backed. A flat term surviving
      // here is the compensator coming back.
      expect(out.blockerRoll.modifiers.map((m) => m.attr)).toEqual([
        ATTR.passBlock, ATTR.footwork, ATTR.anchor,
      ]);
      expect(out.blockerRoll.modifiers.every((m) => m.attr !== undefined)).toBe(true);
      expect(
        out.blockerRoll.modifiers.some((m) => m.source.includes("structural advantage")),
      ).toBe(false);
    });

    it("petition 2: the structural constant is 0, so it contributes nothing to any roll", () => {
      expect(TUNABLES.passRush.blockerStructuralAdvantage).toBe(0);
    });

    /**
     * THE POINT OF THE WHOLE CHANGE, as a property rather than as a number: the
     * blocker's total responds to `anchor` and the response is linear in it. Under
     * the old two-term stack this difference was exactly 0 for every pair of
     * ratings, which is what "a dead attribute" means mechanically.
     */
    it("a better anchor is a better blocker, monotonically and by the right amount", () => {
      const totalFor = (rating: number): number =>
        resolvePassRushTick({
          tunables: TUNABLES, rusher: eliteRusher, blocker: blockerWithAnchor(rating),
          move: "SPEED", tickRng: createRng("mono", "t"),
        }).blockerRoll.total;
      const at20 = totalFor(20);
      const at60 = totalFor(60);
      const at99 = totalFor(99);
      // Same seed, same fork label, same everything but the rating: the raw die
      // is identical, so the difference is the modifier and only the modifier.
      expect(at60 - at20).toBe(Math.round(60 / 5) - Math.round(20 / 5));
      expect(at99 - at60).toBe(Math.round(99 / 5) - Math.round(60 / 5));
      expect(at20).toBeLessThan(at60);
      expect(at60).toBeLessThan(at99);
    });

    /**
     * Spec #6 updates perception from EXPOSURE, so a blocker whose anchor decided
     * a rep has to have that recorded on the check. An attribute that moves a roll
     * without appearing in `testsAttrs` is invisible to progression.
     */
    it("anchor is in testsAttrs, so the rep counts as exposure for it", () => {
      for (const move of ["SPEED", "POWER", "FINESSE"] as const) {
        const out = resolvePassRushTick({
          tunables: TUNABLES, rusher: eliteRusher, blocker: blockerWithAnchor(70), move,
          tickRng: createRng("tests", "t"),
        });
        expect(out.check.testsAttrs).toContain(ATTR.anchor);
        expect(out.check.testsAttrs).toContain(ATTR.passBlock);
        expect(out.check.testsAttrs).toContain(ATTR.footwork);
      }
    });

    /**
     * `anchor` was `active` in the registry and read by NOTHING before this. The
     * registry id is asserted directly so that a kill/rename of the attribute
     * fails HERE, naming the mechanic that depends on it, rather than at
     * `attrs.ts` import time with no indication of what it was for.
     */
    it("reads the registry attribute, not a field named anchor", () => {
      expect(ATTR.anchor).toBe(resolveAttr("anchor"));
    });
  });

  it("maps every band to a pressure delta", () => {
    for (const band of TUNABLES.passRush.bands) {
      expect(TUNABLES.passRush.pressureProgressByBand[band.label]).toBeDefined();
    }
  });
});

describe("§7.2 pocket status", () => {
  it("accumulates pressure and zeroes it on a blocker reset", () => {
    expect(advancePressure(0, { pressureDelta: 2, resetsPressure: false })).toBe(2);
    expect(advancePressure(3, { pressureDelta: 1, resetsPressure: false })).toBe(4);
    expect(advancePressure(5, { pressureDelta: 0, resetsPressure: true })).toBe(0);
    expect(advancePressure(0, { pressureDelta: -3, resetsPressure: false })).toBe(0);
  });

  it("transitions CLEAN → PRESSURE → COLLAPSING → IMMEDIATE → SACK", () => {
    expect(pocketStatusFor(TUNABLES, 0)).toBe("CLEAN");
    expect(pocketStatusFor(TUNABLES, 2)).toBe("CLEAN");
    expect(pocketStatusFor(TUNABLES, 3)).toBe("PRESSURE");
    expect(pocketStatusFor(TUNABLES, 5)).toBe("COLLAPSING");
    expect(pocketStatusFor(TUNABLES, 7)).toBe("IMMEDIATE");
    expect(pocketStatusFor(TUNABLES, 9)).toBe("SACK");
  });

  it("carries the §10.4 accuracy penalties and §7.2 read-capacity loss", () => {
    expect(accuracyModifierFor(TUNABLES, "CLEAN")).toBe(0);
    expect(accuracyModifierFor(TUNABLES, "PRESSURE")).toBe(-10);
    expect(accuracyModifierFor(TUNABLES, "COLLAPSING")).toBe(-20);
    expect(accuracyModifierFor(TUNABLES, "IMMEDIATE")).toBe(-30);
    expect(readCapacityDeltaFor(TUNABLES, "PRESSURE")).toBe(-1);
    expect(forcesDecision(TUNABLES, "CLEAN")).toBe(false);
    expect(forcesDecision(TUNABLES, "PRESSURE")).toBe(false);
    expect(forcesDecision(TUNABLES, "COLLAPSING")).toBe(true);
    expect(forcesDecision(TUNABLES, "IMMEDIATE")).toBe(true);
  });
});
