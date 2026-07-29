import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  IncoherentPlayCallError,
  UnsupportedPlayCallError,
  simulatePassPlay,
} from "../src/index.js";
import type { MatchGameState, PlayCalls } from "../src/types.js";
import { buildScenario, endedInSack, makePlayer } from "./fixtures.js";

const types = (events: readonly MatchEventEnvelope[]): string[] => events.map((e) => e.event.type);

function firstIndex(events: readonly MatchEventEnvelope[], type: string): number {
  return events.findIndex((e) => e.event.type === type);
}

describe("pass play integration", () => {
  it("orders the play: start → ticks → decision → throw → catch → result", () => {
    for (let i = 0; i < 100; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `order-${i}`);
      const list = types(events);
      expect(list[0]).toBe("PLAY_START");
      expect(list[list.length - 1]).toBe("PLAY_RESULT");

      const throwIndex = firstIndex(events, "THROW");
      if (throwIndex >= 0) {
        // A ball leaves on a THROW decision or on a CHECKDOWN (§8.1's outlet,
        // past the progression) — both are decisions to put it in the air.
        const decisionIndex = events.findIndex(
          (e) =>
            e.event.type === "QB_DECISION" &&
            (e.event.payload.choice === "THROW" || e.event.payload.choice === "CHECKDOWN"),
        );
        expect(decisionIndex).toBeGreaterThanOrEqual(0);
        expect(decisionIndex).toBeLessThan(throwIndex);
        const catchIndex = firstIndex(events, "CATCH_RESOLUTION");
        if (catchIndex >= 0) expect(catchIndex).toBeGreaterThan(throwIndex);
      }
    }
  });

  it("emits a TICK and a POCKET_STATUS for every tick of the play", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "ticks");
    const ticks = events.flatMap(({ event }) => (event.type === "TICK" ? [event.payload.tick] : []));
    expect(ticks[0]).toBe(0.5);
    ticks.forEach((t, i) => expect(t).toBeCloseTo(0.5 + i * 0.5, 5));
    const pocketCount = events.filter(({ event }) => event.type === "POCKET_STATUS").length;
    expect(pocketCount).toBeGreaterThanOrEqual(ticks.length);
  });

  it("resolves the pressed receiver's release before his route breaks", () => {
    const { state, calls } = buildScenario();
    const { events } = simulatePassPlay(state, calls, "release-order");
    const release = events.findIndex(
      (e) => e.event.type === "CHECK" && e.event.payload.checkKind === "release_vs_press",
    );
    const coverage = events.findIndex(
      (e) => e.event.type === "CHECK" && e.event.payload.checkKind === "man_coverage",
    );
    expect(release).toBeGreaterThanOrEqual(0);
    expect(coverage).toBeGreaterThan(release);
  });

  it("updates down, distance and field position from the result", () => {
    for (let i = 0; i < 100; i++) {
      const { state, calls } = buildScenario();
      const { events, newState } = simulatePassPlay(state, calls, `state-${i}`);
      const result = events[events.length - 1]?.event;
      if (result?.type !== "PLAY_RESULT") throw new Error("no result");
      const { yards, turnover } = result.payload;
      if (turnover) {
        expect(newState.offenseTeam).toBe(state.defenseTeam);
        expect(newState.down).toBe(1);
        expect(newState.distance).toBe(10);
      } else if (yards >= state.distance) {
        expect(newState.down).toBe(1);
        expect(newState.distance).toBe(10);
        expect(newState.ballOn).toBe(state.ballOn + yards);
      } else {
        expect(newState.down).toBe(state.down + 1);
        expect(newState.distance).toBe(state.distance - yards);
      }
      expect(newState.clockSeconds).toBeLessThan(state.clockSeconds);
    }
  });

  it("takes the sack when a dominant rush arrives before anyone is open", () => {
    const { state, calls } = buildScenario();
    const wrecker = makePlayer("de-wreck", "Wrecking Ball", "DE", {
      passRush: 99, firstStep: 99, powerMove: 99, finesseMove: 99, strength: 99,
    }, ["quickTwitch"]);
    const turnstile = makePlayer("lt-bad", "Turnstile", "LT", {
      passBlock: 5, footwork: 5, strength: 20,
    });
    const players = { ...state.players };
    players[wrecker.bio.id as unknown as string] = wrecker;
    players[turnstile.bio.id as unknown as string] = turnstile;
    // blanket coverage on every route, so the QB never finds an outlet
    for (const assignment of calls.defense.assignments) {
      if (assignment.kind !== "MAN") continue;
      const covered = state.players[assignment.covers as unknown as string];
      const defender = state.players[assignment.defender as unknown as string];
      if (covered === undefined || defender === undefined) throw new Error("bad fixture");
      players[assignment.covers as unknown as string] = makePlayer(
        String(assignment.covers), covered.bio.displayName, covered.bio.position,
        { releaseWR: 5, agility: 10, routeRunning: 5, catching: 40, strength: 40 },
      );
      players[assignment.defender as unknown as string] = makePlayer(
        String(assignment.defender), defender.bio.displayName, defender.bio.position,
        { press: 99, strength: 95, manCoverage: 99, agility: 95, ballSkills: 90, reaction: 90 },
        ["pressSpecialist", "shutdown"],
      );
    }

    const heavyState: MatchGameState = { ...state, players };
    const heavyCalls: PlayCalls = {
      offense: {
        ...calls.offense,
        // only deep routes: nobody breaks open early
        routes: calls.offense.routes.map((r) => ({ ...r, depthClass: "DEEP" as const, airYards: 25 })),
        protection: [{ blocker: turnstile.bio.id, rusher: wrecker.bio.id }],
      },
      defense: {
        ...calls.defense,
        assignments: calls.defense.assignments.map((a) => ({ ...a, technique: "PRESS" as const })),
        rush: [{ rusher: wrecker.bio.id, move: "POWER" }],
      },
    };

    let sacks = 0;
    for (let i = 0; i < 200; i++) {
      const { events } = simulatePassPlay(heavyState, heavyCalls, `sack-${i}`);
      const result = events[events.length - 1]?.event;
      if (result?.type === "PLAY_RESULT" && result.payload.yards < 0) {
        sacks++;
        // ADR-033 — the sack is read off the stream the way §17 reads it: from
        // PLAY_RESULT plus the absence of a throw or a carry. It used to be read
        // off a `POCKET_STATUS: SACK`, which was an outcome wearing a status.
        expect(endedInSack(events)).toBe(true);
        expect(events.some(({ event }) =>
          event.type === "POCKET_STATUS" && event.payload.status === "SACK")).toBe(false);
      }
    }
    expect(sacks).toBeGreaterThan(0);
  });

  /**
   * ==================== THE REJECTION THAT IS GONE ====================
   * This test used to assert that an unblocked rusher THREW
   * `UnsupportedPlayCallError`. It was right to: §7.4 did not exist, and a
   * silent approximation would have produced clean statistics about a game
   * nobody played.
   *
   * It is inverted now, and the inversion is the dispatch's headline. A rusher
   * nobody blocks is a FREE RUNNER — real, legal, resolvable football — and the
   * refusal is what forced every caller to build protection against the actual
   * defensive card, biasing pressure downward (`CALIBRATION-BACKLOG.md` 21).
   *
   * What replaced the throw: a `RUSH_THREAT` with a time of arrival, and a play
   * that finishes.
   * ====================================================================
   */
  it("an unblocked rusher no longer throws — he is a free runner (§7.4)", () => {
    const { state, calls } = buildScenario();
    const noProtection: PlayCalls = {
      ...calls,
      offense: { ...calls.offense, protection: [] },
    };

    expect(() => simulatePassPlay(state, noProtection, "x")).not.toThrow();

    const { events } = simulatePassPlay(state, noProtection, "x");
    expect(events[0]?.event.type).toBe("PLAY_START");
    expect(events[events.length - 1]?.event.type).toBe("PLAY_RESULT");

    // He is published as a threat BEFORE the first tick: no rep created him, so
    // there is no tick at which he won one.
    const threats = events.filter(({ event }) => event.type === "RUSH_THREAT");
    expect(threats.length).toBeGreaterThan(0);
    const first = threats[0]?.event;
    expect(first?.type).toBe("RUSH_THREAT");
    if (first?.type === "RUSH_THREAT") {
      expect(first.tick).toBeUndefined();
      expect(first.payload.state).toBe("TRAVELLING");
      expect(first.payload.etaTick).toBeGreaterThan(0);
      // ADR-004/005 — the threat names a real roll and never a synthetic label.
      expect(first.payload.rollRef.length).toBeGreaterThan(0);
    }

    // No pass_rush_tick rep is rolled for a man nobody is blocking (ADR-005).
    const reps = events.filter(
      ({ event }) => event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick",
    );
    expect(reps).toHaveLength(0);
  });

  /**
   * The rejection VOCABULARY survives its only member. `UnsupportedPlayCallError`
   * stays exported so the next scope limit reuses the distinction rather than
   * reinventing it — and so a caller that catches it keeps compiling.
   */
  it("the two rejection types are still distinct, and incoherence still throws", () => {
    const { state, calls } = buildScenario();
    expect(new UnsupportedPlayCallError("x")).not.toBeInstanceOf(IncoherentPlayCallError);
    const twoRoutes: PlayCalls = {
      ...calls,
      offense: {
        ...calls.offense,
        readOrder: [...calls.offense.readOrder, state.quarterback],
      },
    };
    expect(() => simulatePassPlay(state, twoRoutes, "x")).toThrow(IncoherentPlayCallError);
  });

  it("a receiver nobody covers is no longer an error — it is a hole in the zone (§9.4)", () => {
    const { state, calls } = buildScenario();
    const noCoverage: PlayCalls = {
      ...calls,
      defense: { ...calls.defense, assignments: [] },
    };
    const { events } = simulatePassPlay(state, noCoverage, "uncovered");
    expect(events[events.length - 1]?.event.type).toBe("PLAY_RESULT");
    // No coverage rep runs at all: there is nobody to contest, so there is no
    // die and therefore no CHECK (ADR-005).
    const reps = events.filter(
      ({ event }) =>
        event.type === "CHECK" &&
        (event.payload.checkKind === "man_coverage" || event.payload.checkKind === "zone_coverage"),
    );
    expect(reps).toHaveLength(0);
  });

  it("rejects players missing from game state (ADR-006 coherence)", () => {
    const { state, calls } = buildScenario();
    const stripped: MatchGameState = { ...state, players: {} };
    expect(() => simulatePassPlay(stripped, calls, "x")).toThrow(/is not in state\.players/);
  });
});
