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
import { isRollRefStub, referencedRollLabel, simulatePassPlay } from "../src/index.js";
import {
  buildDeflectionScenario,
  buildLopsidedRushScenario,
  buildScenario,
  buildScramblerScenario,
} from "./fixtures.js";

/**
 * Every RollDetail anywhere in the stream, with the event that carried it.
 *
 * INTERIM VOCABULARY (ADR-009): `TIPPED_BALL.qualityRoll` and `attempts[].roll`
 * are typed `RollDetail` in contracts, which predates ADR-004. The engine fills
 * them with self-identifying REFERENCE STUBS rather than repeating rolls that
 * already live in the `deflection_quality` / `deflection_recovery` CHECKs, and a
 * stub is not a roll — so this walker skips them, exactly as it would skip a
 * `rollRef` string once ADR-009 lands. A dedicated test below asserts every stub
 * really is a stub and really does point at a CHECK, so the skip cannot hide a
 * duplicated roll.
 */
function allRolls(
  events: readonly MatchEventEnvelope[],
): { roll: RollDetail; type: MatchEvent["type"]; seq: number }[] {
  const found: { roll: RollDetail; type: MatchEvent["type"]; seq: number }[] = [];
  const isRoll = (v: unknown): v is RollDetail => {
    if (typeof v !== "object" || v === null) return false;
    const r = v as Record<string, unknown>;
    if (
      typeof r["die"] !== "string" ||
      typeof r["raw"] !== "number" ||
      typeof r["total"] !== "number" ||
      typeof r["rngLabel"] !== "string" ||
      !Array.isArray(r["modifiers"])
    ) {
      return false;
    }
    return !isRollRefStub(v as unknown as RollDetail);
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
    expect(kinds).toContain("pocket_movement");
    expect(kinds).toContain("scramble");
    // §8.1's anticipation roll — its own CheckKind as of ADR-008 part B.
    expect(kinds).toContain("anticipation");
  });

  it("RUSH_THREAT carries no roll: it references one (ADR-004/007)", () => {
    let threats = 0;
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `threat-accounting-${i}`);
      const rushLabels = new Set(
        events.flatMap(({ event }) =>
          event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick"
            ? [event.payload.roll.rngLabel]
            : [],
        ),
      );
      for (const { event } of events) {
        if (event.type !== "RUSH_THREAT") continue;
        threats += 1;
        expect(allRolls([{ seq: 0, at: state.at, event }]).length).toBe(0);
        expect(rushLabels.has(event.payload.rollRef)).toBe(true);
      }
    }
    expect(threats).toBeGreaterThan(0);
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

  it("TIPPED_BALL references its rolls instead of repeating them (ADR-004/009)", () => {
    let tips = 0;
    let attempts = 0;
    for (let i = 0; i < 400; i++) {
      const { state, calls } = buildDeflectionScenario();
      const { events } = simulatePassPlay(state, calls, `tipref-${i}`);
      const labels = new Map<string, number>();
      for (const { seq, event } of events) {
        if (event.type !== "CHECK") continue;
        if (event.payload.checkKind !== "deflection_quality" && event.payload.checkKind !== "deflection_recovery") {
          continue;
        }
        labels.set(event.payload.roll.rngLabel, seq);
      }
      for (const { seq, event } of events) {
        if (event.type !== "TIPPED_BALL") continue;
        tips += 1;
        const stubs = [event.payload.qualityRoll, ...event.payload.attempts.map((a) => a.roll)];
        for (const stub of stubs) {
          // Self-identifying: a stub can never be mistaken for, or counted as, a roll.
          expect(isRollRefStub(stub)).toBe(true);
          expect(stub.raw).toBe(0);
          expect(stub.modifiers).toEqual([]);
          // ...and it points backwards at a CHECK that is really in the stream.
          const at = labels.get(referencedRollLabel(stub));
          expect(at).toBeDefined();
          expect(at ?? Infinity).toBeLessThan(seq);
        }
        attempts += event.payload.attempts.length;
      }
    }
    expect(tips).toBeGreaterThan(0);
    expect(attempts).toBeGreaterThan(0);
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
