import { createRng } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { ATTR } from "../src/attrs.js";
import {
  maxReadsFor,
  perceptionHalfWidth,
  perceptionVariance,
  readCapacityPerTick,
  resolveQbRead,
  throwThresholdFor,
  timeBudgetSeconds,
  windowModifierFor,
} from "../src/resolve/qbRead.js";
import { selectTarget } from "../src/resolve/targetSelection.js";
import type { TargetCandidate } from "../src/resolve/targetSelection.js";
import { bandFor } from "../src/rolls.js";
import { TUNABLES } from "../src/tunables.js";
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

/**
 * §8.3 AS AMENDED (ADR-040, owner ruling on ADR-039 SA-09).
 *
 * Two properties are required of the perception band and neither is the
 * engine's to choose: it is CENTRED ON THE TRUE VALUE at every awareness, and
 * its half-width is MONOTONE DECREASING in awareness. Both are proved here over
 * EVERY face of the die and every rating on the registry's range, rather than
 * sampled — a statistical check on a symmetric band is exactly the instrument
 * that would let a half-point of optimism back in.
 */
describe("§8.3 perception band", () => {
  const FACES = Array.from({ length: 20 }, (_, i) => i + 1);
  const RATINGS = Array.from({ length: 100 }, (_, i) => i);
  const HALF_WIDTHS = [0, 0.5, 1, 2, 4.2, 5, 7.5, 10, 12, 16, 24];

  it("perceived = actual + variance roll total, and the roll is still §8.3's d20", () => {
    const out = resolveQbRead(TUNABLES, eliteQb, 60, createRng("s", "qbread"));
    expect(out.varianceRoll.die).toBe("d20");
    expect(out.perceivedOpenness).toBe(Math.max(0, Math.min(100, 60 + out.varianceRoll.total)));
  });

  it("the roll's arithmetic is still raw + Σmodifiers = total", () => {
    for (const qb of [eliteQb, averageQb, poorQb]) {
      for (let i = 0; i < 200; i++) {
        const roll = resolveQbRead(TUNABLES, qb, 50, createRng(`acct-${i}`, "qbread")).varianceRoll;
        const sum = roll.modifiers.reduce((acc, m) => acc + m.value, 0);
        expect(roll.total).toBe(roll.raw + sum);
      }
    }
  });

  it("awareness is emitted as a named, attribute-tagged modifier on every read", () => {
    for (const qb of [eliteQb, averageQb, poorQb]) {
      const roll = resolveQbRead(TUNABLES, qb, 50, createRng("mod", "qbread")).varianceRoll;
      const awareness = roll.modifiers.find((m) => m.attr === ATTR.awareness);
      expect(awareness).toBeDefined();
      // The half-width is IN the printout: the band is the mechanic.
      expect(awareness?.source).toContain("perception band");
    }
  });

  it("CENTRED: the variance map is odd, so the mean over the die is exactly zero", () => {
    for (const halfWidth of HALF_WIDTHS) {
      for (const face of FACES) {
        expect(perceptionVariance(21 - face, halfWidth)).toBe(-perceptionVariance(face, halfWidth));
      }
      const total = FACES.reduce((acc, face) => acc + perceptionVariance(face, halfWidth), 0);
      expect(total).toBe(0);
    }
  });

  it("CENTRED at every rating on the registry's range, not merely at the ones in the doc", () => {
    for (const rating of RATINGS) {
      const qb = makePlayer(`qb-${rating}`, "Reader", "QB", { awareness: rating });
      const halfWidth = perceptionHalfWidth(TUNABLES, qb);
      const total = FACES.reduce((acc, face) => acc + perceptionVariance(face, halfWidth), 0);
      expect(total).toBe(0);
    }
  });

  it("the band reaches its stated half-width and never exceeds it", () => {
    for (const halfWidth of HALF_WIDTHS) {
      const magnitudes = FACES.map((face) => Math.abs(perceptionVariance(face, halfWidth)));
      expect(Math.max(...magnitudes)).toBe(Math.round(halfWidth));
    }
  });

  it("MONOTONE: better awareness is a narrower band, at every rating and on every face", () => {
    const widthAt = (rating: number): number =>
      perceptionHalfWidth(TUNABLES, makePlayer(`qb-${rating}`, "Reader", "QB", { awareness: rating }));
    for (let rating = 1; rating < 100; rating++) {
      expect(widthAt(rating)).toBeLessThan(widthAt(rating - 1));
      for (const face of FACES) {
        expect(Math.abs(perceptionVariance(face, widthAt(rating)))).toBeLessThanOrEqual(
          Math.abs(perceptionVariance(face, widthAt(rating - 1))),
        );
      }
    }
  });

  it("the half-width is §8.3's own numbers: ±10 at the baseline, ±5 for an elite passer", () => {
    expect(perceptionHalfWidth(TUNABLES, averageQb)).toBe(10 - (75 - 70) / 5);
    expect(perceptionHalfWidth(TUNABLES, eliteQb)).toBe(5);
    expect(perceptionHalfWidth(TUNABLES, poorQb)).toBe(12);
    expect(perceptionHalfWidth(TUNABLES, makePlayer("qb-base", "Base", "QB", { awareness: 70 }))).toBe(10);
  });

  it("NOT OPTIMISM: an elite passer's band is narrower than a poor one's, both sides", () => {
    // The defect this replaces gave the elite quarterback −5..+15 and the poor
    // one −12..+8: same width, shifted centre. Both bands are now centred, and
    // the observed range is symmetric.
    const observed = (qb: typeof eliteQb): { low: number; high: number; mean: number } => {
      let low = Infinity;
      let high = -Infinity;
      let sum = 0;
      const n = 2000;
      for (let i = 0; i < n; i++) {
        const v = resolveQbRead(TUNABLES, qb, 50, createRng(`v-${i}`, "qbread")).varianceRoll.total;
        low = Math.min(low, v);
        high = Math.max(high, v);
        sum += v;
      }
      return { low, high, mean: sum / n };
    };
    const elite = observed(eliteQb);
    const poor = observed(poorQb);
    expect(elite).toMatchObject({ low: -5, high: 5 });
    expect(poor).toMatchObject({ low: -12, high: 12 });
    expect(Math.abs(elite.mean)).toBeLessThan(0.5);
    expect(Math.abs(poor.mean)).toBeLessThan(0.5);
  });

  it("§8.8's vision cone still shifts the centre — a deliberate bias is not awareness", () => {
    const cone = { source: "Scramble vision cone", value: -40 };
    const plain = resolveQbRead(TUNABLES, eliteQb, 50, createRng("cone", "qbread"));
    const blind = resolveQbRead(TUNABLES, eliteQb, 50, createRng("cone", "qbread"), [cone]);
    expect(blind.varianceRoll.total).toBe(plain.varianceRoll.total - 40);
  });

  it("is deterministic: the same seed produces the same read", () => {
    const a = resolveQbRead(TUNABLES, eliteQb, 55, createRng("det", "qbread"));
    const b = resolveQbRead(TUNABLES, eliteQb, 55, createRng("det", "qbread"));
    expect(a.varianceRoll).toEqual(b.varianceRoll);
    expect(a.perceivedOpenness).toBe(b.perceivedOpenness);
  });
});

describe("§8.4 effective openness", () => {
  it("window modifier is accuracy/2 + arm/4 + touch/4 over the 70 baseline", () => {
    expect(windowModifierFor(TUNABLES, eliteQb)).toBe(10 + 5 + 4);
    expect(windowModifierFor(TUNABLES, averageQb)).toBe(3 + 1 + 1);
    expect(windowModifierFor(TUNABLES, poorQb)).toBe(-4 + -1 + -2);
  });

  it("applies the window modifier only inside a tight window", () => {
    for (let i = 0; i < 200; i++) {
      const out = resolveQbRead(TUNABLES, eliteQb, 40, createRng(`w-${i}`, "qbread"));
      if (out.perceivedOpenness < TUNABLES.qb.window.tightWindowThreshold) {
        expect(out.windowModifier).toBe(windowModifierFor(TUNABLES, eliteQb));
        expect(out.effectiveOpenness).toBe(Math.min(100, out.perceivedOpenness + out.windowModifier));
      } else {
        expect(out.windowModifier).toBe(0);
        expect(out.effectiveOpenness).toBe(out.perceivedOpenness);
      }
    }
  });

  it("a tight window is 'open' for an elite arm and stays tight for a poor one", () => {
    const elite = resolveQbRead(TUNABLES, eliteQb, 35, createRng("tight", "qbread"));
    const poor = resolveQbRead(TUNABLES, poorQb, 35, createRng("tight", "qbread"));
    expect(elite.effectiveOpenness).toBeGreaterThan(poor.effectiveOpenness);
  });
});

describe("§8.1/§8.2 processing capacity and §8.7 time budget", () => {
  it("reads per tick = system base + (Decision Making − 70) ÷ 20, minus pressure", () => {
    // ADR-055 §6 point 3 — `readCapacityPerTick` takes the raw delta rather
    // than a `PocketStatusRung` now, so the pocket ladder's own table is read
    // here explicitly rather than passed as a rung for the function to look
    // up itself.
    const delta = TUNABLES.pocket.readCapacityDelta;
    expect(readCapacityPerTick(TUNABLES, eliteQb, "HALF_FIELD", delta.CLEAN)).toBe(2);
    expect(readCapacityPerTick(TUNABLES, eliteQb, "HALF_FIELD", delta.PRESSURE)).toBe(1);
    expect(readCapacityPerTick(TUNABLES, averageQb, "HALF_FIELD", delta.CLEAN)).toBe(1);
    expect(readCapacityPerTick(TUNABLES, averageQb, "FULL_FIELD", delta.CLEAN)).toBe(0.5);
    expect(readCapacityPerTick(TUNABLES, averageQb, "CONCEPT", delta.CLEAN)).toBe(2);
    // pressure removes ADDITIONAL reads; the QB always still sees his current read
    expect(readCapacityPerTick(TUNABLES, poorQb, "HALF_FIELD", delta.IMMEDIATE)).toBe(1);
    expect(readCapacityPerTick(TUNABLES, averageQb, "FULL_FIELD", delta.IMMEDIATE)).toBe(0.5);
  });

  it("progression depth comes from the reading system", () => {
    expect(maxReadsFor(TUNABLES, "HALF_FIELD")).toBe(3);
    expect(maxReadsFor(TUNABLES, "FULL_FIELD")).toBe(4);
    expect(maxReadsFor(TUNABLES, "CONCEPT")).toBe(2);
  });

  it("time budget is 2.5s at baseline patience and grows with it", () => {
    // Measured on HALF_FIELD's system delta of −0.5s; the doc's bare formula is
    // `base + patience` and the system term rides on top of it.
    const half = TUNABLES.qb.readSystem.HALF_FIELD.budgetDeltaSeconds;
    expect(timeBudgetSeconds(TUNABLES, averageQb, "HALF_FIELD")).toBe(2.5 + half);
    // 2.5 + (90 − 70) / 20 = 3.5s for the patient QB
    expect(timeBudgetSeconds(TUNABLES, eliteQb, "HALF_FIELD")).toBe(3.5 + half);
    // Pocket Awareness buys another half tick of feel in the pocket
    expect(
      timeBudgetSeconds(TUNABLES, makePlayer("qb-pa", "Feel", "QB", { pocketPatience: 90 }, ["pocketAwareness"]), "HALF_FIELD"),
    ).toBe(4 + half);
    expect(timeBudgetSeconds(TUNABLES, poorQb, "HALF_FIELD")).toBeLessThan(2.5 + half);
  });

  it("§8.7's budget moves with §8.1's anticipation, not separately from it", () => {
    // One quarterback, three systems: the passer who releases on timing does not
    // get the hold profile of one who waits to see separation.
    const full = timeBudgetSeconds(TUNABLES, averageQb, "FULL_FIELD");
    const halfField = timeBudgetSeconds(TUNABLES, averageQb, "HALF_FIELD");
    const concept = timeBudgetSeconds(TUNABLES, averageQb, "CONCEPT");
    expect(full).toBeGreaterThan(halfField);
    expect(halfField).toBeGreaterThan(concept);
  });

  it("the trigger-pull threshold is a property of the reading system", () => {
    expect(throwThresholdFor(TUNABLES, "FULL_FIELD")).toBeGreaterThan(throwThresholdFor(TUNABLES, "HALF_FIELD"));
    expect(throwThresholdFor(TUNABLES, "HALF_FIELD")).toBeGreaterThan(throwThresholdFor(TUNABLES, "CONCEPT"));
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
    const out = selectTarget(TUNABLES, eliteQb, candidates, createRng("s", "qbread"));
    expect(out.check.target).toBe(50);
    expect(out.check.checkKind).toBe("qb_decision");
    expect(out.roll.modifiers.map((m) => m.source)).toContain("QB Decision Making");
    expect(out.margin).toBe(out.roll.total - 50);
  });

  it("ranks candidates by effective openness, best first", () => {
    const out = selectTarget(TUNABLES, eliteQb, candidates, createRng("s", "qbread"));
    expect(out.ranked.map((c) => c.effectiveOpenness)).toEqual([80, 60, 40, 20]);
  });

  it("always picks inside the band's rank window", () => {
    for (let i = 0; i < 300; i++) {
      const out = selectTarget(TUNABLES, averageQb, candidates, createRng(`t-${i}`, "qbread"));
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
      const out = selectTarget(TUNABLES, eliteQb, candidates, createRng(`o-${i}`, "qbread"));
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
      const out = selectTarget(TUNABLES, poorQb, only, createRng(`s-${i}`, "qbread"));
      expect(out.selected).toBe(only[0]);
    }
  });

  it("refuses to select with no candidates", () => {
    expect(() => selectTarget(TUNABLES, eliteQb, [], createRng("s", "qbread"))).toThrow();
  });
});
