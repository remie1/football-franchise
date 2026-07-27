import { createRng } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import {
  TUNABLES,
  bandFor,
  maxReadsFor,
  readCapacityPerTick,
  resolveQbRead,
  selectTarget,
  throwThresholdFor,
  timeBudgetSeconds,
  windowModifierFor,
} from "../src/index.js";
import type { TargetCandidate } from "../src/index.js";
import { makePlayer } from "./fixtures.js";

const eliteQb = makePlayer("qb-elite", "Franchise", "QB", {
  awareness: 95, decisionMaking: 90, accuracy: 90, armStrength: 88, touch: 85, pocketPatience: 90, poise: 90,
});
const averageQb = makePlayer("qb-avg", "Bridge", "QB", {
  awareness: 75, decisionMaking: 70, accuracy: 75, armStrength: 75, touch: 75, pocketPatience: 70, poise: 70,
});
const poorQb = makePlayer("qb-poor", "Backup", "QB", {
  awareness: 60, decisionMaking: 55, accuracy: 62, armStrength: 66, touch: 60, pocketPatience: 55, poise: 58,
});

describe("§8.3 awareness variance", () => {
  it("perceived = actual + variance roll total, and the roll is a d20", () => {
    const out = resolveQbRead(eliteQb, 60, createRng("s", "qbread"));
    expect(out.varianceRoll.die).toBe("d20");
    expect(out.perceivedOpenness).toBe(Math.max(0, Math.min(100, 60 + out.varianceRoll.total)));
    expect(out.varianceRoll.modifiers.map((m) => m.source)).toContain("d20 variance offset");
  });

  // The doc's illustrative ranges assume a 0-based d20; @ff/contracts rolls 1..20,
  // so each window sits one point higher at the bottom end.
  it("awareness narrows the variance window (d20 1..20)", () => {
    const range = (qb: typeof eliteQb): [number, number] => {
      let low = Infinity;
      let high = -Infinity;
      for (let i = 0; i < 400; i++) {
        const v = resolveQbRead(qb, 50, createRng(`v-${i}`, "qbread")).varianceRoll.total;
        low = Math.min(low, v);
        high = Math.max(high, v);
      }
      return [low, high];
    };
    expect(range(eliteQb)).toEqual([-4, 15]);
    expect(range(averageQb)).toEqual([-8, 11]);
    expect(range(poorQb)).toEqual([-11, 8]);
  });
});

describe("§8.4 effective openness", () => {
  it("window modifier is accuracy/2 + arm/4 + touch/4 over the 70 baseline", () => {
    expect(windowModifierFor(eliteQb)).toBe(10 + 5 + 4);
    expect(windowModifierFor(averageQb)).toBe(3 + 1 + 1);
    expect(windowModifierFor(poorQb)).toBe(-4 + -1 + -2);
  });

  it("applies the window modifier only inside a tight window", () => {
    for (let i = 0; i < 200; i++) {
      const out = resolveQbRead(eliteQb, 40, createRng(`w-${i}`, "qbread"));
      if (out.perceivedOpenness < TUNABLES.qb.window.tightWindowThreshold) {
        expect(out.windowModifier).toBe(windowModifierFor(eliteQb));
        expect(out.effectiveOpenness).toBe(Math.min(100, out.perceivedOpenness + out.windowModifier));
      } else {
        expect(out.windowModifier).toBe(0);
        expect(out.effectiveOpenness).toBe(out.perceivedOpenness);
      }
    }
  });

  it("a tight window is 'open' for an elite arm and stays tight for a poor one", () => {
    const elite = resolveQbRead(eliteQb, 35, createRng("tight", "qbread"));
    const poor = resolveQbRead(poorQb, 35, createRng("tight", "qbread"));
    expect(elite.effectiveOpenness).toBeGreaterThan(poor.effectiveOpenness);
  });
});

describe("§8.1/§8.2 processing capacity and §8.7 time budget", () => {
  it("reads per tick = system base + (Decision Making − 70) ÷ 20, minus pressure", () => {
    expect(readCapacityPerTick(eliteQb, "HALF_FIELD", "CLEAN")).toBe(2);
    expect(readCapacityPerTick(eliteQb, "HALF_FIELD", "PRESSURE")).toBe(1);
    expect(readCapacityPerTick(averageQb, "HALF_FIELD", "CLEAN")).toBe(1);
    expect(readCapacityPerTick(averageQb, "FULL_FIELD", "CLEAN")).toBe(0.5);
    expect(readCapacityPerTick(averageQb, "CONCEPT", "CLEAN")).toBe(2);
    // pressure removes ADDITIONAL reads; the QB always still sees his current read
    expect(readCapacityPerTick(poorQb, "HALF_FIELD", "IMMEDIATE")).toBe(1);
    expect(readCapacityPerTick(averageQb, "FULL_FIELD", "IMMEDIATE")).toBe(0.5);
  });

  it("progression depth comes from the reading system", () => {
    expect(maxReadsFor("HALF_FIELD")).toBe(3);
    expect(maxReadsFor("FULL_FIELD")).toBe(4);
    expect(maxReadsFor("CONCEPT")).toBe(2);
  });

  it("time budget is 2.5s at baseline patience and grows with it", () => {
    // Measured on HALF_FIELD's system delta of −0.5s; the doc's bare formula is
    // `base + patience` and the system term rides on top of it.
    const half = TUNABLES.qb.readSystem.HALF_FIELD.budgetDeltaSeconds;
    expect(timeBudgetSeconds(averageQb, "HALF_FIELD")).toBe(2.5 + half);
    // 2.5 + (90 − 70) / 20 = 3.5s for the patient QB
    expect(timeBudgetSeconds(eliteQb, "HALF_FIELD")).toBe(3.5 + half);
    // Pocket Awareness buys another half tick of feel in the pocket
    expect(
      timeBudgetSeconds(makePlayer("qb-pa", "Feel", "QB", { pocketPatience: 90 }, ["pocketAwareness"]), "HALF_FIELD"),
    ).toBe(4 + half);
    expect(timeBudgetSeconds(poorQb, "HALF_FIELD")).toBeLessThan(2.5 + half);
  });

  it("§8.7's budget moves with §8.1's anticipation, not separately from it", () => {
    // One quarterback, three systems: the passer who releases on timing does not
    // get the hold profile of one who waits to see separation.
    const full = timeBudgetSeconds(averageQb, "FULL_FIELD");
    const halfField = timeBudgetSeconds(averageQb, "HALF_FIELD");
    const concept = timeBudgetSeconds(averageQb, "CONCEPT");
    expect(full).toBeGreaterThan(halfField);
    expect(halfField).toBeGreaterThan(concept);
  });

  it("the trigger-pull threshold is a property of the reading system", () => {
    expect(throwThresholdFor("FULL_FIELD")).toBeGreaterThan(throwThresholdFor("HALF_FIELD"));
    expect(throwThresholdFor("HALF_FIELD")).toBeGreaterThan(throwThresholdFor("CONCEPT"));
  });
});

describe("§8.5 target selection", () => {
  const candidates: TargetCandidate[] = [
    { receiver: makePlayer("a", "A", "WR", {}).bio.id, effectiveOpenness: 80 },
    { receiver: makePlayer("b", "B", "WR", {}).bio.id, effectiveOpenness: 60 },
    { receiver: makePlayer("c", "C", "WR", {}).bio.id, effectiveOpenness: 40 },
    { receiver: makePlayer("d", "D", "WR", {}).bio.id, effectiveOpenness: 20 },
  ];

  it("rolls d100 + Decision Making ÷ 5 vs. target 50", () => {
    const out = selectTarget(eliteQb, candidates, createRng("s", "qbread"));
    expect(out.check.target).toBe(50);
    expect(out.check.checkKind).toBe("qb_decision");
    expect(out.roll.modifiers.map((m) => m.source)).toContain("QB Decision Making");
    expect(out.margin).toBe(out.roll.total - 50);
  });

  it("ranks candidates by effective openness, best first", () => {
    const out = selectTarget(eliteQb, candidates, createRng("s", "qbread"));
    expect(out.ranked.map((c) => c.effectiveOpenness)).toEqual([80, 60, 40, 20]);
  });

  it("always picks inside the band's rank window", () => {
    for (let i = 0; i < 300; i++) {
      const out = selectTarget(averageQb, candidates, createRng(`t-${i}`, "qbread"));
      const band = bandFor(TUNABLES.qb.decision.bands, out.margin);
      const from = Math.min(band.poolFrom, out.ranked.length - 1);
      const to = Math.max(from + 1, Math.min(band.poolTo, out.ranked.length));
      const pool = out.ranked.slice(from, to).map((c) => c.effectiveOpenness);
      expect(pool).toContain(out.selected.effectiveOpenness);
      expect(out.band).toBe(band.label);
    }
  });

  it("an OPTIMAL decision takes the best option outright", () => {
    let optimal = 0;
    for (let i = 0; i < 300; i++) {
      const out = selectTarget(eliteQb, candidates, createRng(`o-${i}`, "qbread"));
      if (out.band === "OPTIMAL") {
        optimal++;
        expect(out.selected.effectiveOpenness).toBe(80);
      }
    }
    expect(optimal).toBeGreaterThan(0);
  });

  it("with a single candidate the pool collapses to that receiver", () => {
    const only = candidates.slice(0, 1);
    for (let i = 0; i < 50; i++) {
      const out = selectTarget(poorQb, only, createRng(`s-${i}`, "qbread"));
      expect(out.selected).toBe(only[0]);
    }
  });

  it("refuses to select with no candidates", () => {
    expect(() => selectTarget(eliteQb, [], createRng("s", "qbread"))).toThrow();
  });
});
