import { describe, expect, it } from "vitest";
import { simulatePassPlay } from "../src/index.js";
import { bandFor } from "../src/rolls.js";
import { TUNABLES } from "../src/tunables.js";
import {
  READ_SYSTEMS,
  buildDeflectionScenario,
  buildLopsidedRushScenario,
  buildMixedCoverageScenario,
  buildScenario,
  buildScramblerScenario,
  buildShortConceptScenario,
  buildStalledPocketScenario,
  buildZoneScenario,
  endedInSack,
  withReadSystem,
} from "./fixtures.js";

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
    for (const system of READ_SYSTEMS) {
      for (let i = 0; i < 60; i++) {
        const a = withReadSystem(buildScenario(), system);
        const b = withReadSystem(buildScenario(), system);
        const first = simulatePassPlay(a.state, a.calls, `read-determinism-${system}-${i}`);
        const second = simulatePassPlay(b.state, b.calls, `read-determinism-${system}-${i}`);
        expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
        expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));
        for (const { event } of first.events) {
          if (event.type === "CHECK" && event.payload.checkKind === "anticipation") anticipation += 1;
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

  /**
   * ADR-054 — `QB_PURSUIT` is an additive log call at a site that already
   * computes every value it publishes: no new roll, no read-back into
   * simulation logic. The byte-identical whole-stream comparisons elsewhere in
   * this file would already catch a regression here, since `QB_PURSUIT` is
   * inside `JSON.stringify(events)` like everything else — but silently, the
   * same way ADR-042's own determinism case explains. This one names the
   * event on purpose, and its second half is the stronger check the owner
   * asked for: with the emission stripped back out, the REST of the stream
   * (everything except `QB_PURSUIT`, seq-renumbered so adding one more event
   * does not itself register as a difference) is identical to a second
   * independent run — proof that publishing the clock did not perturb the
   * play `QB_PURSUIT` was added next to.
   */
  it("ADR-054: QB_PURSUIT replays identically, and does not perturb the rest of the stream", () => {
    let pursuits = 0;
    for (let i = 0; i < 200; i++) {
      const a = buildScramblerScenario();
      const b = buildScramblerScenario();
      const seed = `qb-pursuit-determinism-${i}`;
      const first = simulatePassPlay(a.state, a.calls, seed);
      const second = simulatePassPlay(b.state, b.calls, seed);
      // The event itself replays byte-for-byte, same as everything else on the
      // stream.
      expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
      expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));

      const withoutPursuit = (r: typeof first) =>
        JSON.stringify(
          r.events
            .filter((e) => e.event.type !== "QB_PURSUIT")
            .map((e, idx) => ({ ...e, seq: a.state.nextEventSeq + idx })),
        );
      expect(withoutPursuit(second)).toBe(withoutPursuit(first));

      pursuits += first.events.filter((e) => e.event.type === "QB_PURSUIT").length;
    }
    // Not vacuous: the fixture actually produces the event this test is about.
    expect(pursuits).toBeGreaterThan(0);
  });

  it("survives §9.4 and §12: zone reps and live balls replay identically", () => {
    // Both mechanics ADD branch points that a die decides — whether a zone
    // defender breaks on the ball, and who comes up with a deflection — so a
    // reproducibility test that never fires them proves nothing about them.
    let zoneReps = 0;
    let tips = 0;
    for (const build of [buildMixedCoverageScenario, buildDeflectionScenario, buildZoneScenario]) {
      for (let i = 0; i < 80; i++) {
        const a = build();
        const b = build();
        const first = simulatePassPlay(a.state, a.calls, `zonetip-${i}`);
        const second = simulatePassPlay(b.state, b.calls, `zonetip-${i}`);
        expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
        expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));
        for (const { event } of first.events) {
          if (event.type === "CHECK" && event.payload.checkKind === "zone_coverage") zoneReps += 1;
          if (event.type === "TIPPED_BALL") tips += 1;
        }
      }
    }
    expect(zoneReps).toBeGreaterThan(0);
    expect(tips).toBeGreaterThan(0);
  });

  it("a SHORT-primary concept replays identically (CALIBRATION-BACKLOG 4b)", () => {
    let shortRoutes = 0;
    for (let i = 0; i < 60; i++) {
      const a = buildShortConceptScenario();
      const b = buildShortConceptScenario();
      const first = simulatePassPlay(a.state, a.calls, `short-${i}`);
      const second = simulatePassPlay(b.state, b.calls, `short-${i}`);
      expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
      shortRoutes += a.calls.offense.routes.filter((r) => r.depthClass === "SHORT").length;
    }
    expect(shortRoutes).toBeGreaterThan(0);
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

  /**
   * ADR-042 — the newly published quantity replays.
   *
   * The whole-stream assertions above already cover it byte-for-byte; this one
   * exists because they cover it SILENTLY. A field added to a payload is inside
   * `JSON.stringify(events)` whether or not anybody meant it to be, so a test
   * that names the field is what tells the next reader that its determinism was
   * checked ON PURPOSE — and it fails loudly if a future emitter recovers the
   * number from anything less deterministic than the value that decided the
   * classification.
   */
  it("ADR-042: CATCH_RESOLUTION.openness replays identically on the same seed", () => {
    const openness = (seed: string): number[] => {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, seed);
      return events.flatMap(({ event }) =>
        event.type === "CATCH_RESOLUTION" ? [event.payload.openness] : [],
      );
    };
    let observed = 0;
    for (let i = 0; i < 60; i++) {
      const seed = `adr042-determinism-${i}`;
      const first = openness(seed);
      expect(openness(seed)).toEqual(first);
      observed += first.length;
    }
    // Not vacuous: the corpus actually produces catch resolutions.
    expect(observed).toBeGreaterThan(0);
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
      // §12.2's deflection-quality roll is the one check that legitimately
      // exercises NO rating: the doc's Roll 1 is a bare d100 against a
      // situational target, and nothing about the deflector changes how the ball
      // bounces. An empty list is the honest answer, and claiming an attribute
      // would corrupt the perception exposure channel `testsAttrs` exists for.
      if (event.payload.checkKind === "deflection_quality") {
        expect(event.payload.testsAttrs).toEqual([]);
      } else {
        expect(event.payload.testsAttrs.length).toBeGreaterThan(0);
      }
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

  /**
   * ADR-033 — THE TWO RULINGS, REPLAYED.
   *
   * Both changed which branch a play takes: ruling 1 moved margins 1-4 off the
   * PRESSURE floor (so a tick that used to force a decision may not), and ruling
   * 2 removed the `SACK` rung (so a pressure counter at 9 now forces one where it
   * used to force nothing). A determinism test that never reaches those branches
   * says nothing about them, so this one COUNTS its coverage and fails if the
   * fixtures stop producing it — the same discipline the movement and
   * anticipation cases above use.
   */
  it("survives ADR-033: beaten-blocker reps and sacks replay identically", () => {
    let beaten = 0;
    let gaining = 0;
    let sacks = 0;
    for (const build of [buildScenario, buildLopsidedRushScenario, buildStalledPocketScenario]) {
      for (let i = 0; i < 60; i++) {
        const a = build();
        const b = build();
        const first = simulatePassPlay(a.state, a.calls, `adr033-determinism-${i}`);
        const second = simulatePassPlay(b.state, b.calls, `adr033-determinism-${i}`);
        expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
        expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));
        if (endedInSack(first.events)) sacks += 1;
        for (const { event } of first.events) {
          if (event.type !== "CHECK" || event.payload.checkKind !== "pass_rush_tick") continue;
          const band = bandFor(TUNABLES.passRush.bands, event.payload.margin).label;
          if (band === "BLOCKER_BEATEN") beaten += 1;
          if (band === "RUSHER_GAINING") gaining += 1;
        }
      }
    }
    // Both halves of the split rep are REACHED, or the replay above proved
    // nothing about the band this dispatch introduced.
    expect(beaten).toBeGreaterThan(0);
    expect(gaining).toBeGreaterThan(0);
    expect(sacks).toBeGreaterThan(0);
  });

  /**
   * ADR-048 — the openness gain is now conditioned on the coverage rep, so the
   * hold/throw decision reads a different number at every tick after a break and
   * the branch structure of a play depends on which contest class each receiver's
   * rep produced. A replay test that never sees all three classes proves nothing
   * about the branch this dispatch introduced.
   *
   * ⚠ WHAT WOULD MAKE THIS GO RED? Any nondeterminism reachable from the new
   *   code path — the obvious one being an `Object.entries` order dependence or a
   *   `Map` iteration in the gain lookup, neither of which the other determinism
   *   cases would exercise, because none of them looks up a rate by contest.
   *
   * ⚠ AND THE COVERAGE ASSERTIONS AT THE FOOT ARE NOT DECORATION. They are what
   *   separates *"the replay is deterministic"* from *"the replay is
   *   deterministic over the cases this loop happened to produce"*. All three
   *   classes must appear, and the post-break tick count must be non-zero, or the
   *   gain term never ran at all and this case is asserting nothing.
   */
  it("survives ADR-048's contest-conditioned gain: all three classes replay identically", () => {
    const seen = new Set<string>();
    let postBreakTicks = 0;
    for (const build of [buildScenario, buildZoneScenario, buildMixedCoverageScenario, buildStalledPocketScenario]) {
      for (let i = 0; i < 40; i++) {
        const a = build();
        const b = build();
        const first = simulatePassPlay(a.state, a.calls, `adr048-determinism-${i}`);
        const second = simulatePassPlay(b.state, b.calls, `adr048-determinism-${i}`);
        expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
        expect(JSON.stringify(second.newState)).toBe(JSON.stringify(first.newState));

        // Which contest classes this play actually produced, read from the rep's
        // own band rather than from anything this test declares.
        for (const { event } of first.events) {
          if (event.type === "CHECK" && event.payload.checkKind === "man_coverage") {
            const row = TUNABLES.manCoverage.bands.find((r) => r.label === event.payload.band);
            if (row !== undefined) seen.add(row.contest);
          }
          if (event.type === "CHECK" && event.payload.checkKind === "zone_coverage") {
            const row = TUNABLES.zoneCoverage.bands.find((r) => r.label === event.payload.band);
            if (row !== undefined) seen.add(row.contest);
          }
          if (event.type === "ROUTE_STATUS" && event.payload.phase === "DECAYING") postBreakTicks += 1;
        }
      }
    }
    expect([...seen].sort()).toEqual(["EVEN", "IN_FRONT", "TRAILING"]);
    expect(postBreakTicks).toBeGreaterThan(0);
  });

  it("no path in the engine emits SACK as a pocket status (ADR-033 ruling 2)", () => {
    // `PocketStatus` in @ff/contracts still PERMITS "SACK"; the engine's ladder
    // does not rank it, and this asserts the engine never emits it, over every
    // pass fixture and both terminal sack paths (an arrival, and the coverage
    // sack at the tick horizon). The type is the Orchestrator's to narrow — this
    // is the evidence for that petition, kept where it can go stale loudly.
    let statuses = 0;
    for (const build of [buildScenario, buildLopsidedRushScenario, buildStalledPocketScenario, buildScramblerScenario]) {
      for (let i = 0; i < 100; i++) {
        const { state, calls } = build();
        for (const { event } of simulatePassPlay(state, calls, `no-sack-status-${i}`).events) {
          if (event.type !== "POCKET_STATUS") continue;
          statuses += 1;
          expect(Object.keys(TUNABLES.pocket.severity)).toContain(event.payload.status);
        }
      }
    }
    expect(statuses).toBeGreaterThan(1000);
  });
});
