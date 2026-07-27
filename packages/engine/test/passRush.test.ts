import { createRng } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { resolvePassRushTick } from "../src/resolve/passRush.js";
import {
  accuracyModifierFor,
  advancePressure,
  forcesDecision,
  pocketStatusFor,
  readCapacityDeltaFor,
} from "../src/resolve/pocket.js";
import { TUNABLES } from "../src/tunables.js";
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
