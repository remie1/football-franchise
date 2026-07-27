/**
 * ADR-005 — `QB_DECISION.tier` is present when and only when §8.5's
 * decision-quality roll actually ran.
 *
 * A hold with every route at openness 0 is the QB doing his job. Before this
 * patch it was reported as CRITICAL_FAILURE, several times per play, because
 * the schema forced a tier the dice had never produced.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import type { PlayCalls } from "../src/index.js";
import { buildScenario, buildStalledPocketScenario } from "./fixtures.js";

function decisions(
  events: readonly MatchEventEnvelope[],
): { tick: number | undefined; choice: string; tier: string | undefined }[] {
  return events.flatMap(({ event }) =>
    event.type === "QB_DECISION"
      ? [{ tick: event.tick, choice: event.payload.choice, tier: event.payload.tier }]
      : [],
  );
}

/** Routes that cannot possibly have developed at tick 0.5: every one is DEEP. */
function slowDevelopingCalls(calls: PlayCalls): PlayCalls {
  return {
    ...calls,
    offense: {
      ...calls.offense,
      routes: calls.offense.routes.map((r) => ({ ...r, depthClass: "DEEP" as const, airYards: 25 })),
    },
  };
}

describe("ADR-005 decision tier", () => {
  it("a hold with every route at openness 0 carries no tier", () => {
    const { state, calls } = buildScenario();
    const slow: PlayCalls = slowDevelopingCalls(calls);
    const { events } = simulatePassPlay(state, slow, "adr005-hold");

    // Tick 0.5: nothing has broken open, no read is possible, no §8.5 roll runs.
    const openness = events.flatMap(({ event }) =>
      event.type === "ROUTE_STATUS" && event.tick === 0.5 ? [event.payload.openness] : [],
    );
    expect(openness.every((o) => o === 0)).toBe(true);

    const first = decisions(events).find((d) => d.tick === 0.5);
    expect(first).toEqual({ tick: 0.5, choice: "HOLD", tier: undefined });
  });

  it("no QB_DECISION ever carries a tier without a decision-quality CHECK at the same tick", () => {
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `adr005-${i}`);
      const rollTicks = new Set(
        events.flatMap(({ event }) =>
          event.type === "CHECK" && event.payload.checkKind === "qb_decision" ? [event.tick] : [],
        ),
      );
      for (const { event } of events) {
        if (event.type !== "QB_DECISION") continue;
        if (event.payload.tier === undefined) continue;
        expect(rollTicks.has(event.tick)).toBe(true);
      }
    }
  });

  it("holds and throwaways never carry a tier; throws always do", () => {
    let holds = 0;
    let throwaways = 0;
    let throws = 0;
    // Two shapes: the live matchup (throws, forced holds) and a stalled pocket
    // that runs the clock out into a throwaway.
    const builds = [buildScenario, buildStalledPocketScenario];
    for (let i = 0; i < 300; i++) {
      const build = builds[i % builds.length];
      if (build === undefined) throw new Error("no builder");
      const { state, calls } = build();
      const { events } = simulatePassPlay(state, calls, `adr005-mix-${i}`);
      for (const d of decisions(events)) {
        if (d.choice === "HOLD") {
          holds += 1;
          expect(d.tier).toBeUndefined();
        }
        if (d.choice === "THROWAWAY") {
          throwaways += 1;
          expect(d.tier).toBeUndefined();
        }
        if (d.choice === "THROW") {
          throws += 1;
          expect(d.tier).toBeDefined();
        }
      }
    }
    expect(holds).toBeGreaterThan(0);
    expect(throwaways).toBeGreaterThan(0);
    expect(throws).toBeGreaterThan(0);
  });

  it("a stalled play is a sequence of untiered holds, not a sequence of failures", () => {
    // The exact printout ADR-005 was raised on: HOLD, HOLD, HOLD — and not one
    // of them a CRITICAL_FAILURE, because not one of them was a check.
    const { state, calls } = buildStalledPocketScenario();
    const { events } = simulatePassPlay(state, slowDevelopingCalls(calls), "adr005-forced");
    const held = decisions(events).filter((d) => d.choice === "HOLD");
    expect(held.length).toBeGreaterThan(1);
    expect(held.every((d) => d.tier === undefined)).toBe(true);
  });
});
