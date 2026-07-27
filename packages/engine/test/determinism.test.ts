import { describe, expect, it } from "vitest";
import { simulatePassPlay } from "../src/index.js";
import { buildScenario, buildScramblerScenario, withReadSystem } from "./fixtures.js";

describe("determinism (Charter pillar 5)", () => {
  it("same seed produces a byte-identical event stream and identical new state", () => {
    const a = buildScenario();
    const b = buildScenario();
    const first = simulatePassPlay(a.state, a.calls, "world-seed-1");
    const second = simulatePassPlay(b.state, b.calls, "world-seed-1");

    // Byte-identical: serialize the whole stream, not a summary of it.
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
    expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));
  });

  it("survives the §7.2 move branch: streams carrying movement and scramble rolls replay identically", () => {
    // The branch structure of a play now depends on rolls made mid-play (climb,
    // escape, stand in), so a reproducibility test that never exercises those
    // branches proves nothing about them.
    let movement = 0;
    let scrambles = 0;
    for (let i = 0; i < 120; i++) {
      const a = buildScramblerScenario();
      const b = buildScramblerScenario();
      const first = simulatePassPlay(a.state, a.calls, `move-determinism-${i}`);
      const second = simulatePassPlay(b.state, b.calls, `move-determinism-${i}`);
      expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
      expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));
      for (const { event } of first.events) {
        if (event.type !== "CHECK") continue;
        if (event.payload.checkKind === "pocket_movement") movement += 1;
        if (event.payload.checkKind === "scramble") scrambles += 1;
      }
    }
    expect(movement).toBeGreaterThan(0);
    expect(scrambles).toBeGreaterThan(0);
  });

  it("survives §8.1's progression: streams carrying anticipation rolls replay identically", () => {
    // The branch structure now depends on a roll made mid-play for a receiver
    // whose route has not broken (§8.1 anticipation), and on the checkdown look
    // that follows when it fails. A determinism test that never fires those
    // proves nothing about them.
    let anticipation = 0;
    let checkdowns = 0;
    for (const system of ["HALF_FIELD", "FULL_FIELD", "CONCEPT"] as const) {
      for (let i = 0; i < 60; i++) {
        const a = withReadSystem(buildScenario(), system);
        const b = withReadSystem(buildScenario(), system);
        const first = simulatePassPlay(a.state, a.calls, `read-determinism-${system}-${i}`);
        const second = simulatePassPlay(b.state, b.calls, `read-determinism-${system}-${i}`);
        expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
        expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));
        for (const { event } of first.events) {
          if (event.type === "CHECK" && event.payload.checkKind === "qb_read") anticipation += 1;
          if (event.type === "QB_DECISION" && event.payload.choice === "CHECKDOWN") checkdowns += 1;
        }
      }
    }
    expect(anticipation).toBeGreaterThan(0);
    expect(checkdowns).toBeGreaterThan(0);
  });

  it("RUSH_THREAT replays identically, including the arrivals a step-up moved", () => {
    let travelling = 0;
    let delayed = 0;
    for (let i = 0; i < 120; i++) {
      const a = buildScramblerScenario();
      const b = buildScramblerScenario();
      const first = simulatePassPlay(a.state, a.calls, `threat-determinism-${i}`);
      const second = simulatePassPlay(b.state, b.calls, `threat-determinism-${i}`);
      const threatsOf = (r: typeof first): string =>
        JSON.stringify(r.events.filter((e) => e.event.type === "RUSH_THREAT"));
      expect(threatsOf(second)).toBe(threatsOf(first));
      for (const { event } of first.events) {
        if (event.type !== "RUSH_THREAT") continue;
        if (event.payload.state === "TRAVELLING") travelling += 1;
        if (event.payload.state === "DELAYED") delayed += 1;
      }
    }
    expect(travelling).toBeGreaterThan(0);
    expect(delayed).toBeGreaterThan(0);
  });

  it("re-simulating from the same state object is stable across repeated calls", () => {
    const { state, calls } = buildScenario();
    const runs = Array.from({ length: 5 }, () => JSON.stringify(simulatePassPlay(state, calls, "abc").events));
    expect(new Set(runs).size).toBe(1);
  });

  it("a different seed produces a different event stream", () => {
    const { state, calls } = buildScenario();
    const a = simulatePassPlay(state, calls, "world-seed-1");
    const b = simulatePassPlay(state, calls, "world-seed-2");
    expect(JSON.stringify(b.events)).not.toBe(JSON.stringify(a.events));
  });

  it("a different play number reshuffles the stream (per-play forks)", () => {
    const one = buildScenario({ playNumber: 12 });
    const two = buildScenario({ playNumber: 13 });
    const a = simulatePassPlay(one.state, one.calls, "same-seed");
    const b = simulatePassPlay(two.state, two.calls, "same-seed");
    const rolls = (r: typeof a): number[] =>
      r.events.flatMap(({ event }) => (event.type === "CHECK" ? [event.payload.roll.raw] : []));
    expect(rolls(b)).not.toEqual(rolls(a));
  });

  it("does not mutate its inputs", () => {
    const { state, calls } = buildScenario();
    const stateBefore = JSON.stringify(state);
    const callsBefore = JSON.stringify(calls);
    simulatePassPlay(state, calls, "purity");
    expect(JSON.stringify(state)).toBe(stateBefore);
    expect(JSON.stringify(calls)).toBe(callsBefore);
  });

  it("every roll carries the play's PRNG fork label", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "labels");
    const labels: string[] = [];
    for (const { event } of events) {
      if (event.type === "CHECK") {
        labels.push(event.payload.roll.rngLabel);
        if (event.payload.opposedRoll) labels.push(event.payload.opposedRoll.rngLabel);
      }
      // ADR-004: QB_READ.varianceRoll is the one roll outside a CHECK.
      // CATCH_RESOLUTION carries a rollRef, not a roll — see the accounting test.
      if (event.type === "QB_READ") labels.push(event.payload.varianceRoll.rngLabel);
      if (event.type === "CATCH_RESOLUTION") labels.push(event.payload.rollRef);
    }
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.startsWith("game:g-2026-04-hou-den/play:12/")).toBe(true);
    }
    expect(labels.some((l) => l.includes("/rush/"))).toBe(true);
    expect(labels.some((l) => l.includes("/coverage/"))).toBe(true);
  });

  it("sequence numbers continue from the incoming state and are contiguous", () => {
    const { state, calls } = buildScenario();
    const { events, newState } = simulatePassPlay(state, calls, "seq");
    expect(events[0]?.seq).toBe(state.nextEventSeq);
    events.forEach((envelope, index) => {
      expect(envelope.seq).toBe(state.nextEventSeq + index);
      expect(envelope.at).toEqual(state.at);
    });
    expect(newState.nextEventSeq).toBe(state.nextEventSeq + events.length);
    expect(newState.playNumber).toBe(state.playNumber + 1);
  });

  it("emits exactly one PLAY_START and one PLAY_RESULT per play", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "shape");
    const count = (type: string): number =>
      events.filter(({ event }) => event.type === type).length;
    expect(count("PLAY_START")).toBe(1);
    expect(count("PLAY_RESULT")).toBe(1);
    expect(events[events.length - 1]?.event.type).toBe("PLAY_RESULT");
  });

  it("every CHECK populates testsAttrs and named modifier sources", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "audit");
    let checks = 0;
    for (const { event } of events) {
      if (event.type !== "CHECK") continue;
      checks += 1;
      expect(event.payload.testsAttrs.length).toBeGreaterThan(0);
      expect(event.payload.actors.length).toBeGreaterThan(0);
      for (const mod of event.payload.roll.modifiers) {
        expect(mod.source.length).toBeGreaterThan(0);
      }
    }
    expect(checks).toBeGreaterThan(0);
  });

  it("produces a resolved play across many seeds without throwing", () => {
    const { state, calls } = buildScenario();
    for (let i = 0; i < 200; i++) {
      const { events, newState } = simulatePassPlay(state, calls, `seed-${i}`);
      const result = events[events.length - 1]?.event;
      expect(result?.type).toBe("PLAY_RESULT");
      expect(Number.isFinite(newState.ballOn)).toBe(true);
    }
  });
});
