/** §8.8 — the escape check, the vision cone, and the scramble drill. */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import type { PlayerState } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import {
  pursuitDeadline,
  resolveScramble,
  scrambleOpennessAt,
  visionConeModifier,
  visionConeRollModifier,
} from "../src/resolve/scramble.js";
import type { RushThreat } from "../src/resolve/rushThreat.js";
import { TUNABLES } from "../src/tunables.js";
import { buildScenario, makePlayer } from "./fixtures.js";

const rng = (label: string) => createRng("scramble-seed", label);

const RUNNER: PlayerState = makePlayer("qb-run", "Kai Devereaux", "QB", {
  awareness: 74, decisionMaking: 72, accuracy: 74, mobility: 95, improvisation: 93,
});
const STATUE: PlayerState = makePlayer("qb-stand", "Bill Rafferty", "QB", {
  awareness: 84, decisionMaking: 86, accuracy: 90, mobility: 45, improvisation: 40,
});

function threat(alignment: "EDGE" | "INTERIOR", etaTick: number): RushThreat {
  return {
    rusher: buildScenario().calls.defense.rush[0]?.rusher ?? buildScenario().state.quarterback,
    alignment,
    wonAtTick: 1.0,
    etaTick,
    rollRef: "test/rush-rep",
  };
}

describe("§8.8 the escape check", () => {
  it("mobility and improvisation are the whole roll", () => {
    const out = resolveScramble({ qb: RUNNER, tick: 2.0, threats: [threat("EDGE", 3.0)], scrambleRng: rng("a") });
    expect(out.check.checkKind).toBe("scramble");
    expect(out.check.testsAttrs.map(String)).toEqual(["mobility", "improvisation"]);
    expect(out.roll.modifiers.map((m) => m.attr).filter(Boolean).map(String)).toEqual([
      "mobility",
      "improvisation",
    ]);
  });

  it("a runner escapes far more often than a statue, on the same seeds", () => {
    let runner = 0;
    let statue = 0;
    for (let i = 0; i < 300; i++) {
      const threats = [threat("EDGE", 3.0)];
      if (resolveScramble({ qb: RUNNER, tick: 2.0, threats, scrambleRng: rng(`e-${i}`) }).escaped) runner += 1;
      if (resolveScramble({ qb: STATUE, tick: 2.0, threats, scrambleRng: rng(`e-${i}`) }).escaped) statue += 1;
    }
    expect(runner).toBeGreaterThan(statue);
    expect(statue).toBeGreaterThan(0);
  });

  it("edge rushers are the contain players: getting out past one is harder", () => {
    const interiorOnly = resolveScramble({
      qb: RUNNER, tick: 2.0, threats: [threat("INTERIOR", 3.0)], scrambleRng: rng("t"),
    });
    const edgeToo = resolveScramble({
      qb: RUNNER, tick: 2.0, threats: [threat("INTERIOR", 3.0), threat("EDGE", 3.0)], scrambleRng: rng("t"),
    });
    expect(edgeToo.check.target ?? 0).toBeGreaterThan(interiorOnly.check.target ?? 0);
    expect(edgeToo.margin).toBeLessThan(interiorOnly.margin);
  });

  it("a late escape attempt is harder than an early one", () => {
    const early = resolveScramble({ qb: RUNNER, tick: 1.0, threats: [threat("EDGE", 2.5)], scrambleRng: rng("u") });
    const late = resolveScramble({ qb: RUNNER, tick: 2.0, threats: [threat("EDGE", 2.5)], scrambleRng: rng("u") });
    expect(late.check.target ?? 0).toBeGreaterThan(early.check.target ?? 0);
  });

  it("a bad enough attempt is caught from behind — the bail that ends worse", () => {
    let caught = 0;
    let contained = 0;
    let escaped = 0;
    for (let i = 0; i < 400; i++) {
      const out = resolveScramble({
        qb: STATUE, tick: 2.0, threats: [threat("EDGE", 2.5)], scrambleRng: rng(`c-${i}`),
      });
      if (out.sacked) caught += 1;
      else if (out.escaped) escaped += 1;
      else contained += 1;
      // A caught scramble is never also an escape.
      expect(out.sacked && out.escaped).toBe(false);
    }
    expect(caught).toBeGreaterThan(0);
    expect(contained).toBeGreaterThan(0);
    expect(escaped).toBeGreaterThan(0);
  });

  it("is deterministic on the same label", () => {
    const args = { qb: RUNNER, tick: 2.0, threats: [threat("EDGE", 3.0)] };
    const a = resolveScramble({ ...args, scrambleRng: rng("same") });
    const b = resolveScramble({ ...args, scrambleRng: rng("same") });
    expect(a).toEqual(b);
  });
});

describe("§8.8 vision cone", () => {
  it("forward is full, the direction of the run costs, behind him costs most", () => {
    expect(visionConeModifier("DEEP")).toBe(0);
    expect(visionConeModifier("INTERMEDIATE")).toBe(0);
    expect(visionConeModifier("SHORT")).toBe(-20);
    expect(visionConeModifier("QUICK")).toBe(-40);
  });

  it("rides on the awareness roll as a named modifier, so it stays auditable", () => {
    const mod = visionConeRollModifier("QUICK");
    expect(mod.value).toBe(-40);
    expect(mod.source).toContain("Scramble vision cone");
    expect(mod.attr).toBeUndefined();
  });
});

describe("§8.8 the scramble drill", () => {
  it("openness climbs from where it stood when the QB left, and stops climbing", () => {
    const gain = TUNABLES.scramble.opennessGainPerTick;
    expect(scrambleOpennessAt(40, 2.0, 2.0)).toBe(40);
    expect(scrambleOpennessAt(40, 2.0, 2.5)).toBe(40 + gain);
    expect(scrambleOpennessAt(40, 2.0, 3.0)).toBe(40 + 2 * gain);
    expect(scrambleOpennessAt(80, 2.0, 6.0)).toBe(TUNABLES.scramble.maxOpenness);
  });

  it("never rewinds: openness before the escape is the escape value", () => {
    expect(scrambleOpennessAt(40, 2.0, 1.0)).toBe(40);
  });

  it("pursuit gives the quarterback a fixed window outside the pocket", () => {
    expect(pursuitDeadline(2.0)).toBe(2.0 + TUNABLES.scramble.pursuitSeconds);
  });
});

describe("§8.8 over real event streams", () => {
  /**
   * The flat five yards this used to assert is gone. A quarterback who tucks it
   * is a ball carrier and goes through §14.4's machinery — so the assertion is
   * no longer a constant, it is that the carry was actually RESOLVED: a
   * RUN_RESOLUTION naming him, agreeing with PLAY_RESULT, and rolls behind it.
   */
  it("a scramble that never finds a receiver is resolved as a carry, not a constant", () => {
    let runs = 0;
    const yardages = new Set<number>();
    for (let i = 0; i < 1500; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `scram-${i}`);
      const decisions = events.filter(
        (e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "SCRAMBLE",
      );
      if (decisions.length < 2) continue;
      runs += 1;
      const result = events.find((e) => e.event.type === "PLAY_RESULT");
      const run = events.find((e) => e.event.type === "RUN_RESOLUTION");
      if (result?.event.type !== "PLAY_RESULT") throw new Error("no result");
      if (run?.event.type !== "RUN_RESOLUTION") throw new Error("no run resolution");
      expect(run.event.payload.carrier).toBe(state.quarterback);
      // ADR-010 item 2 — `carryType`, not a `"SCRAMBLE"` sentinel in the
      // free-text gap field. A quarterback who tucked it ran no designed gap, so
      // `gap` is ABSENT and nothing was blocked ahead of him.
      expect(run.event.payload.carryType).toBe("SCRAMBLE");
      expect(run.event.payload.gap).toBeUndefined();
      expect(run.event.payload.yardsBeforeContact).toBe(0);
      expect(run.event.payload.yards).toBe(result.event.payload.yards);
      expect(result.event.payload.turnover).toBe(false);
      yardages.add(result.event.payload.yards);
    }
    expect(runs).toBeGreaterThan(0);
    // A constant produces one value; a resolution produces a distribution.
    expect(yardages.size).toBeGreaterThan(1);
  });

  it("receivers in the drill are still reported, and the cone reaches the read", () => {
    let coned = 0;
    for (let i = 0; i < 1500 && coned === 0; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `cone-${i}`);
      for (const { event } of events) {
        if (event.type !== "QB_READ") continue;
        if (event.payload.varianceRoll.modifiers.some((m) => m.source.includes("Scramble vision cone"))) {
          coned += 1;
        }
      }
    }
    expect(coned).toBeGreaterThan(0);
  });
});
