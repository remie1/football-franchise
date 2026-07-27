/**
 * ADR-004 — a roll is recorded exactly once, in a CHECK or a PRESNAP_READ.
 *
 * These are the mechanical enforcement of the rule. Convention ("count from one
 * or the other") does not survive four domains and a year of development, and
 * the failure mode is invisible: every individual event stays well-formed and
 * only aggregates are wrong.
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent, MatchEventEnvelope, RollDetail } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { buildLopsidedRushScenario, buildScenario, buildScramblerScenario } from "./fixtures.js";

/** Every RollDetail anywhere in the stream, with the event that carried it. */
function allRolls(
  events: readonly MatchEventEnvelope[],
): { roll: RollDetail; type: MatchEvent["type"]; seq: number }[] {
  const found: { roll: RollDetail; type: MatchEvent["type"]; seq: number }[] = [];
  const isRoll = (v: unknown): v is RollDetail => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    return (
      typeof r["die"] === "string" &&
      typeof r["raw"] === "number" &&
      typeof r["total"] === "number" &&
      typeof r["rngLabel"] === "string" &&
      Array.isArray(r["modifiers"])
    );
  };
  const walk = (value: unknown, type: MatchEvent["type"], seq: number): void => {
    if (isRoll(value)) {
      found.push({ roll: value, type, seq });
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item, type, seq);
      return;
    }
    if (typeof value === "object" && value !== null) {
      for (const item of Object.values(value)) walk(item, type, seq);
    }
  };
  for (const { seq, event } of events) walk(event.payload, event.type, seq);
  return found;
}

describe("ADR-004 roll accounting", () => {
  it("no RollDetail appears twice in one play's event stream", () => {
    // The scrambler fixture is here so the §7.2 movement roll and the §8.8
    // escape roll are covered too: ADR-004 has to hold for every roll ADDED,
    // not just the ones that existed when the rule was written.
    const kinds = new Set<string>();
    for (const build of [buildScenario, buildLopsidedRushScenario, buildScramblerScenario]) {
      for (let i = 0; i < 150; i++) {
        const { state, calls } = build();
        const { events } = simulatePassPlay(state, calls, `accounting-${i}`);
        for (const { event } of events) {
          if (event.type === "CHECK") kinds.add(event.payload.checkKind);
        }
        const rolls = allRolls(events);
        expect(rolls.length).toBeGreaterThan(0);

        // rngLabel is the audit key: unique per roll by construction.
        const labels = rolls.map((r) => r.roll.rngLabel);
        expect(new Set(labels).size).toBe(labels.length);

        // ...and belt-and-braces on the whole value, in case a label ever
        // stopped being unique: no identical roll object twice either.
        const serialized = rolls.map((r) => JSON.stringify(r.roll));
        expect(new Set(serialized).size).toBe(serialized.length);
      }
    }
    // ...and prove the new rolls were actually in the sample, so this test
    // cannot silently stop covering them.
    expect(kinds).toContain("hold_decision");
    expect(kinds).toContain("scramble");
  });

  it("every RollDetail lives on a CHECK, except the QB_READ perception roll", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "accounting-home");
    const carriers = new Set(allRolls(events).map((r) => r.type));
    expect(carriers.has("CHECK")).toBe(true);
    for (const type of carriers) {
      expect(["CHECK", "QB_READ", "PRESNAP_READ"]).toContain(type);
    }
  });

  it("CATCH_RESOLUTION references the catch CHECK's roll instead of repeating it", () => {
    let joined = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `catchref-${i}`);
      for (const { event } of events) {
        if (event.type !== "CATCH_RESOLUTION") continue;
        joined += 1;
        expect(event.payload.rollRef.length).toBeGreaterThan(0);
        const check = events.find(
          (e) =>
            e.event.type === "CHECK" &&
            (e.event.payload.checkKind === "catch" || e.event.payload.checkKind === "contested_catch") &&
            e.event.payload.roll.rngLabel === event.payload.rollRef,
        );
        expect(check).toBeDefined();
        // the CHECK is emitted first: the reference always points backwards
        const refSeq = events.find((e) => e.event === event)?.seq ?? -1;
        expect(check?.seq).toBeLessThan(refSeq);
      }
    }
    expect(joined).toBeGreaterThan(0);
  });

  it("QB_READ carries testsAttrs: awareness always, arm talent only on a tight window", () => {
    let tight = 0;
    let wide = 0;
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `reads-${i}`);
      for (const { event } of events) {
        if (event.type !== "QB_READ") continue;
        const attrs = event.payload.testsAttrs.map((a) => String(a));
        expect(attrs).toContain("awareness");
        const windowApplied = event.payload.effectiveOpenness !== event.payload.perceivedOpenness;
        if (windowApplied) {
          tight += 1;
          expect(attrs).toEqual(["awareness", "accuracy", "armStrength", "touch"]);
        } else if (attrs.length === 1) {
          wide += 1;
          expect(attrs).toEqual(["awareness"]);
        }
      }
    }
    expect(tight).toBeGreaterThan(0);
    expect(wide).toBeGreaterThan(0);
  });
});
