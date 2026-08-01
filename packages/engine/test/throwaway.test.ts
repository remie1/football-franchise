/**
 * ADR-056 Option C — `THROWAWAY` is its own event, THE ACT, distinct from the
 * `QB_DECISION{choice:"THROWAWAY"}` that stays as the decision.
 *
 * Two closed causes, two different dispositions on `rollRef` (the amendment
 * beside ratification):
 *   - `POCKET_DURESS` — the `pocket_movement` CHECK produced this choice, so
 *     its `rngLabel` travels as `rollRef`.
 *   - `CLOCK_EXPIRED` — the clock or the read budget ran out with nobody
 *     open; no roll ran at all (ADR-005), so `rollRef` is genuinely absent,
 *     never invented.
 */
import { describe, expect, it } from "vitest";
import type { MatchEvent, MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { buildScenario, buildStalledPocketScenario } from "./fixtures.js";

type Throwaway = Extract<MatchEvent, { type: "THROWAWAY" }>;
type Check = Extract<MatchEvent, { type: "CHECK" }>;

function throwaways(events: readonly MatchEventEnvelope[]): Throwaway[] {
  return events.flatMap(({ event }) => (event.type === "THROWAWAY" ? [event] : []));
}

function pocketMovementChecks(events: readonly MatchEventEnvelope[]): Check[] {
  return events.flatMap(({ event }) =>
    event.type === "CHECK" && event.payload.checkKind === "pocket_movement" ? [event] : [],
  );
}

describe("ADR-056 — THROWAWAY, the act", () => {
  it("POCKET_DURESS throwaways carry the pocket_movement CHECK's own rngLabel as rollRef", () => {
    let seen = 0;
    for (let i = 0; i < 400; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `throwaway-duress-${i}`);
      const acts = throwaways(events).filter((e) => e.payload.cause === "POCKET_DURESS");
      if (acts.length === 0) continue;
      const checks = pocketMovementChecks(events);
      for (const act of acts) {
        seen += 1;
        expect(act.payload.rollRef).toBeDefined();
        // The reference must name a REAL roll already on this play's stream —
        // never a fabricated label.
        expect(checks.some((c) => c.payload.roll.rngLabel === act.payload.rollRef)).toBe(true);
      }
    }
    // A fixture that never produced this cause would let a wrong disposition
    // pass by omission.
    expect(seen).toBeGreaterThan(0);
  });

  it("CLOCK_EXPIRED throwaways carry no rollRef at all — no roll ran (ADR-005)", () => {
    let seen = 0;
    for (let i = 0; i < 80; i++) {
      const { state, calls } = buildStalledPocketScenario();
      const { events } = simulatePassPlay(state, calls, `throwaway-clock-${i}`);
      const acts = throwaways(events).filter((e) => e.payload.cause === "CLOCK_EXPIRED");
      for (const act of acts) {
        seen += 1;
        expect(act.payload.rollRef).toBeUndefined();
        expect(Object.hasOwn(act.payload, "rollRef")).toBe(false);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("QB_DECISION{choice:THROWAWAY} still fires alongside THROWAWAY — the decision stays, the act is new", () => {
    let sawBoth = 0;
    for (let i = 0; i < 100; i++) {
      const { state, calls } = buildStalledPocketScenario();
      const { events } = simulatePassPlay(state, calls, `throwaway-both-${i}`);
      const acts = throwaways(events).length;
      const decisions = events.filter(
        (e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "THROWAWAY",
      ).length;
      expect(acts).toBe(decisions);
      if (acts > 0) sawBoth += 1;
    }
    expect(sawBoth).toBeGreaterThan(0);
  });

  it("is closed at exactly two causes", () => {
    const causes = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const { state, calls } = i % 2 === 0 ? buildScenario() : buildStalledPocketScenario();
      const { events } = simulatePassPlay(state, calls, `throwaway-causes-${i}`);
      for (const t of throwaways(events)) causes.add(t.payload.cause);
    }
    expect([...causes].sort()).toEqual(["CLOCK_EXPIRED", "POCKET_DURESS"]);
  });

  it("determinism (Charter pillar 4): the same seed reproduces THROWAWAY byte-identically, cause and rollRef included", () => {
    const { state, calls } = buildStalledPocketScenario();
    const a = simulatePassPlay(state, calls, "throwaway-determinism");
    const b = simulatePassPlay(state, calls, "throwaway-determinism");
    expect(throwaways(a.events)).toEqual(throwaways(b.events));
    expect(a.events).toEqual(b.events);
  });

  it("determinism holds for the POCKET_DURESS path too", () => {
    let checked = 0;
    for (let i = 0; i < 60; i++) {
      const { state, calls } = buildScenario();
      const seed = `throwaway-duress-determinism-${i}`;
      const a = simulatePassPlay(state, calls, seed);
      const b = simulatePassPlay(state, calls, seed);
      if (throwaways(a.events).some((t) => t.payload.cause === "POCKET_DURESS")) checked += 1;
      expect(a.events).toEqual(b.events);
    }
    expect(checked).toBeGreaterThan(0);
  });
});
