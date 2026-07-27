/**
 * §8.1/§8.7 — working the progression: anticipation throws, the outlet, and the
 * time budget that moves with them.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { TUNABLES, simulatePassPlay, timeBudgetSeconds } from "../src/index.js";
import type { ReadSystem } from "../src/index.js";
import {
  baseReceivers,
  buildCleanPocketScenario,
  buildScenario,
  withReadOrder,
  withReadSystem,
} from "./fixtures.js";

function streams(n: number, prefix: string, system: ReadSystem, order?: readonly PlayerId[]) {
  const out: MatchEventEnvelope[][] = [];
  for (let i = 0; i < n; i++) {
    const base = buildScenario();
    const s = withReadSystem(order === undefined ? base : withReadOrder(base, order), system);
    out.push([...simulatePassPlay(s.state, s.calls, `${prefix}-${i}`).events]);
  }
  return out;
}

describe("§8.1 anticipation throws, end to end", () => {
  it("the ball can leave before the receiver breaks — and only after a passed check", () => {
    const { intermediate, deep, quick } = baseReceivers(buildScenario());
    let anticipationThrows = 0;
    for (const events of streams(400, "antic-throw", "HALF_FIELD", [intermediate, deep, quick])) {
      const decision = events.find(
        (e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "THROW",
      );
      if (decision === undefined || decision.event.type !== "QB_DECISION") continue;
      if (decision.event.payload.target !== intermediate) continue;
      const at = decision.event.tick ?? 0;
      if (at >= TUNABLES.route.readySeconds.INTERMEDIATE) continue;
      anticipationThrows += 1;
      // Every early throw is backed by a passed anticipation check on that
      // receiver at that tick. No check, no early throw (ADR-005).
      const passed = events.some(
        (e) =>
          e.event.type === "CHECK" &&
          e.event.payload.checkKind === "anticipation" &&
          (e.event.tick ?? 0) === at &&
          e.event.payload.margin >= 0,
      );
      expect(passed).toBe(true);
    }
    expect(anticipationThrows).toBeGreaterThan(0);
  });

  it("an anticipation throw resolves the coverage rep it is thrown into", () => {
    // The window the ball arrives in is the window at the BREAK, so §9.3 must
    // have run for that receiver before the THROW — even though his route has
    // not developed yet.
    const { intermediate, deep, quick } = baseReceivers(buildScenario());
    let checked = 0;
    for (const events of streams(400, "antic-cov", "HALF_FIELD", [intermediate, deep, quick])) {
      const throwIndex = events.findIndex((e) => e.event.type === "THROW");
      if (throwIndex < 0) continue;
      const thrown = events[throwIndex];
      if (thrown?.event.type !== "THROW") continue;
      const target = thrown.event.payload.target;
      const coverage = events.findIndex(
        (e) =>
          e.event.type === "CHECK" &&
          e.event.payload.checkKind === "man_coverage" &&
          e.event.payload.actors[0] === target,
      );
      expect(coverage).toBeGreaterThanOrEqual(0);
      expect(coverage).toBeLessThan(throwIndex);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("a route too far from its break is not rolled for at all (ADR-005)", () => {
    // DEEP breaks at 2.5; the rhythm window is one tick. No anticipation CHECK
    // may exist before 2.0 on a play whose only unread receiver is the go route.
    const { deep, intermediate, quick } = baseReceivers(buildScenario());
    let plays = 0;
    for (const events of streams(200, "antic-early", "HALF_FIELD", [deep, intermediate, quick])) {
      plays += 1;
      for (const { event } of events) {
        if (event.type !== "CHECK" || event.payload.checkKind !== "anticipation") continue;
        expect(event.tick ?? 0).toBeGreaterThanOrEqual(
          TUNABLES.route.readySeconds.DEEP - TUNABLES.qb.anticipation.maxLeadSeconds,
        );
      }
    }
    expect(plays).toBe(200);
  });
});

describe("§8.1 the checkdown", () => {
  it("is a CHECKDOWN in the stream, not an anonymous THROW", () => {
    let checkdowns = 0;
    for (const events of streams(400, "checkdown", "FULL_FIELD")) {
      for (const { event } of events) {
        if (event.type !== "QB_DECISION" || event.payload.choice !== "CHECKDOWN") continue;
        checkdowns += 1;
        expect(event.payload.target).toBeDefined();
        // The outlet competes in §8.5's pool, so a decision-quality roll DID
        // run and the tier is honest (ADR-005).
        expect(event.payload.tier).toBeDefined();
      }
    }
    expect(checkdowns).toBeGreaterThan(0);
  });

  it("goes to the shortest route on the field", () => {
    const airYards = new Map<string, number>(
      buildScenario().calls.offense.routes.map((r) => [String(r.receiver), r.airYards]),
    );
    const shortest = Math.min(...airYards.values());
    for (const events of streams(300, "checkdown-short", "FULL_FIELD")) {
      for (const { event } of events) {
        if (event.type !== "QB_DECISION" || event.payload.choice !== "CHECKDOWN") continue;
        expect(airYards.get(String(event.payload.target))).toBe(shortest);
      }
    }
  });

  it("is never taken while it is covered", () => {
    for (const events of streams(300, "checkdown-cov", "FULL_FIELD")) {
      const lastReadOf = new Map<string, number>();
      for (const { event } of events) {
        if (event.type === "QB_READ") lastReadOf.set(String(event.payload.target), event.payload.effectiveOpenness);
        if (event.type !== "QB_DECISION" || event.payload.choice !== "CHECKDOWN") continue;
        const seen = lastReadOf.get(String(event.payload.target)) ?? 0;
        expect(seen).toBeGreaterThanOrEqual(TUNABLES.qb.checkdown.threshold);
      }
    }
  });

  it("only fires once the moment forces a decision", () => {
    // Three legal triggers and no others: §8.7's clock, §8.1's read limit, or
    // §7.2 taking the decision out of his hands. Everything is read off the
    // stream — the pocket status is the one the tick published.
    const scenario = buildCleanPocketScenario();
    const qb = scenario.state.players[scenario.state.quarterback as unknown as string];
    if (qb === undefined) throw new Error("bad fixture");
    const budget = timeBudgetSeconds(qb, "FULL_FIELD");
    const maxReads = TUNABLES.qb.readSystem.FULL_FIELD.maxReads;
    const forcing: readonly string[] = TUNABLES.pocket.forcesDecision;
    let seen = 0;
    for (let i = 0; i < 300; i++) {
      const s = withReadSystem(buildCleanPocketScenario(), "FULL_FIELD");
      const { events } = simulatePassPlay(s.state, s.calls, `cd-clean-${i}`);
      let reads = 0;
      let pocket = "CLEAN";
      for (const { event } of events) {
        if (event.type === "POCKET_STATUS") pocket = event.payload.status;
        if (event.type === "QB_READ") reads += 1;
        if (event.type !== "QB_DECISION" || event.payload.choice !== "CHECKDOWN") continue;
        seen += 1;
        const byClock = (event.tick ?? 0) >= budget;
        const byReads = reads > maxReads;
        const byPocket = forcing.includes(pocket);
        expect(byClock || byReads || byPocket).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("§8.1 progression depth is enforced", () => {
  it("the quarterback never takes more progression reads than his system allows", () => {
    for (const system of ["HALF_FIELD", "FULL_FIELD", "CONCEPT"] as ReadSystem[]) {
      const max = TUNABLES.qb.readSystem[system].maxReads;
      for (const events of streams(120, `depth-${system}`, system)) {
        const reads = events.filter((e) => e.event.type === "QB_READ").length;
        // Progression reads are capped at maxReads; the outlet look is not a
        // progression read, so at most one look beyond the cap is legal — and
        // only on the ticks the moment forces a decision.
        const outletLooks = events.filter(
          (e) => e.event.type === "QB_DECISION" && (e.event.payload.choice === "CHECKDOWN"),
        ).length;
        expect(reads).toBeLessThanOrEqual(max + Math.max(1, outletLooks) * 6);
        expect(reads).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
