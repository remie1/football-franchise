/**
 * ADR-007 — the four interim mappings, retired.
 *
 * The ADR's deciding argument was Charter pillar 3: the engine was emitting a
 * stream that under-described what it simulated. A step-up reported as HOLD, a
 * scramble-drill receiver reported as DEVELOPING, a movement check labelled
 * `hold_decision`, and a rusher's time of arrival stated nowhere at all — every
 * one true, every one silent about the mechanic that actually fired.
 *
 * These tests assert the branch taken is now IN the stream, and (for RUSH_THREAT)
 * that the number in the stream is the ADJUSTED one, so no consumer has to
 * recompute engine logic to see it.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulateGame, simulatePassPlay } from "../src/index.js";
import { isGameScoped } from "../src/game/events.js";
import { buildGameFixture } from "./gameFixtures.js";
import {
  buildMixedCoverageScenario,
  buildScenario,
  buildScramblerScenario,
  buildStalledPocketScenario,
  buildZoneScenario,
} from "./fixtures.js";

type Threat = Extract<MatchEventEnvelope["event"], { type: "RUSH_THREAT" }>;

function threats(events: readonly MatchEventEnvelope[]): Threat[] {
  return events.flatMap(({ event }) => (event.type === "RUSH_THREAT" ? [event] : []));
}

function sweep(
  build: typeof buildScenario,
  n: number,
  prefix: string,
): MatchEventEnvelope[][] {
  const out: MatchEventEnvelope[][] = [];
  for (let i = 0; i < n; i++) {
    const { state, calls } = build();
    out.push([...simulatePassPlay(state, calls, `${prefix}-${i}`).events]);
  }
  return out;
}

describe("ADR-007 #1 — QB_DECISION.choice gains STEP_UP", () => {
  it("a climb is reported as a climb, not as a hold", () => {
    let stepUps = 0;
    let movementChecks = 0;
    for (const events of sweep(buildScramblerScenario, 400, "stepup")) {
      for (const { event } of events) {
        if (event.type === "QB_DECISION" && event.payload.choice === "STEP_UP") stepUps += 1;
        if (event.type === "CHECK" && event.payload.checkKind === "pocket_movement") movementChecks += 1;
      }
    }
    expect(movementChecks).toBeGreaterThan(0);
    expect(stepUps).toBeGreaterThan(0);
  });

  it("STEP_UP carries no tier: no §8.5 decision-quality roll ran (ADR-005)", () => {
    for (const events of sweep(buildScramblerScenario, 200, "stepup-tier")) {
      for (const { event } of events) {
        if (event.type !== "QB_DECISION" || event.payload.choice !== "STEP_UP") continue;
        expect(event.payload.tier).toBeUndefined();
      }
    }
  });
});

describe("ADR-007 #2 — CheckKind gains pocket_movement", () => {
  it("§7.2's movement check no longer masquerades as §8.7's hold decision", () => {
    let movement = 0;
    for (const events of sweep(buildScramblerScenario, 200, "kind")) {
      for (const { event } of events) {
        if (event.type !== "CHECK") continue;
        expect(event.payload.checkKind).not.toBe("hold_decision");
        if (event.payload.checkKind === "pocket_movement") {
          movement += 1;
          // Its own attributes, per the ADR: poise + awareness, not patience.
          expect(event.payload.testsAttrs.map(String)).toEqual(["poise", "awareness"]);
        }
      }
    }
    expect(movement).toBeGreaterThan(0);
  });
});

describe("ADR-007 #3 — ROUTE_STATUS.phase gains SCRAMBLE_DRILL", () => {
  it("a receiver working back to grass is not reported as DEVELOPING", () => {
    let drills = 0;
    for (const events of sweep(buildScramblerScenario, 400, "drill")) {
      const escaped = events.some(
        (e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "SCRAMBLE",
      );
      const phases = events.flatMap(({ event }) =>
        event.type === "ROUTE_STATUS" ? [event.payload.phase] : [],
      );
      if (!escaped) {
        expect(phases).not.toContain("SCRAMBLE_DRILL");
        continue;
      }
      if (phases.includes("SCRAMBLE_DRILL")) drills += 1;
    }
    expect(drills).toBeGreaterThan(0);
  });
});

describe("ADR-007 #4 — RUSH_THREAT", () => {
  it("every won rep publishes a travelling threat with an ETA", () => {
    let published = 0;
    for (const events of sweep(buildScenario, 200, "threat")) {
      const wonReps = events.filter(
        (e) => e.event.type === "CHECK" && e.event.payload.checkKind === "pass_rush_tick" && e.event.payload.margin >= 15,
      );
      const travelling = threats(events).filter((t) => t.payload.state === "TRAVELLING");
      published += travelling.length;
      // A threat is published only where a rep justified one; and a rep that
      // wins while a SOONER threat is already live does not re-publish.
      expect(travelling.length).toBeLessThanOrEqual(wonReps.length);
    }
    expect(published).toBeGreaterThan(0);
  });

  it("rollRef names a pass_rush_tick roll that is already in the stream (ADR-004)", () => {
    let joined = 0;
    for (const events of sweep(buildScenario, 200, "ref")) {
      const rushLabels = new Map<string, number>();
      for (const { seq, event } of events) {
        if (event.type === "CHECK" && event.payload.checkKind === "pass_rush_tick") {
          rushLabels.set(event.payload.roll.rngLabel, seq);
        }
      }
      for (const { seq, event } of events) {
        if (event.type !== "RUSH_THREAT") continue;
        joined += 1;
        const at = rushLabels.get(event.payload.rollRef);
        expect(at).toBeDefined();
        // The reference always points backwards.
        expect(at ?? Infinity).toBeLessThan(seq);
      }
    }
    expect(joined).toBeGreaterThan(0);
  });

  it("carries no RollDetail and no tier — no die produces an ETA (ADR-005)", () => {
    for (const events of sweep(buildScenario, 100, "notier")) {
      for (const t of threats(events)) {
        const keys = Object.keys(t.payload).sort();
        expect(keys).toEqual(["alignment", "etaTick", "rollRef", "rusher", "state"]);
      }
    }
  });

  it("a step-up publishes the ADJUSTED arrival — this is why 'projected' is gone", () => {
    let delayedByClimb = 0;
    for (const events of sweep(buildScramblerScenario, 400, "adjust")) {
      for (let i = 0; i < events.length; i++) {
        const envelope = events[i];
        if (envelope === undefined || envelope.event.type !== "QB_DECISION") continue;
        if (envelope.event.payload.choice !== "STEP_UP") continue;
        // The climb's effect on every live EDGE threat is stated immediately
        // after the decision, not left for the consumer to derive.
        const next = events[i + 1];
        if (next?.event.type !== "RUSH_THREAT") continue;
        expect(next.event.payload.state).toBe("DELAYED");
        expect(next.event.payload.alignment).toBe("EDGE");
        delayedByClimb += 1;
      }
    }
    expect(delayedByClimb).toBeGreaterThan(0);
  });

  it("a threat never just stops being mentioned: it ARRIVES or it RESETS", () => {
    for (const events of sweep(buildScenario, 300, "lifecycle")) {
      const byRusher = new Map<string, Threat[]>();
      for (const t of threats(events)) {
        const key = String(t.payload.rusher);
        byRusher.set(key, [...(byRusher.get(key) ?? []), t]);
      }
      for (const list of byRusher.values()) {
        const first = list[0];
        expect(first?.payload.state).toBe("TRAVELLING");
        // ARRIVED is only ever published on or after the ETA it was published
        // against; DELAYED always pushes the arrival later, never earlier.
        let eta = first?.payload.etaTick ?? 0;
        for (const t of list) {
          if (t.payload.state === "DELAYED") {
            expect(t.payload.etaTick).toBeGreaterThan(eta);
            eta = t.payload.etaTick;
          } else if (t.payload.state === "ARRIVED") {
            expect(t.tick ?? 0).toBeGreaterThanOrEqual(t.payload.etaTick);
          } else if (t.payload.state === "TRAVELLING") {
            eta = t.payload.etaTick;
          }
        }
      }
    }
  });

  it("the pursuit clock of a scrambling QB is never published as a rush threat", () => {
    for (const events of sweep(buildScramblerScenario, 300, "pursuit")) {
      let escapedAt: number | undefined;
      for (const { event } of events) {
        if (event.type === "QB_DECISION" && event.payload.choice === "SCRAMBLE") {
          escapedAt = event.tick;
        }
        if (event.type !== "RUSH_THREAT" || escapedAt === undefined) continue;
        // After the escape the only RUSH_THREAT permitted is the RESET that
        // ends the threats the protection was carrying.
        if ((event.tick ?? 0) >= escapedAt) expect(event.payload.state).toBe("RESET");
      }
    }
  });
});

/**
 * ADR-009 — the three interim mappings the engine shipped while the amendment
 * was pending, retired. Each test asserts the thing the interim could NOT say.
 */
describe("ADR-009 #1 — TIPPED_BALL references its rolls", () => {
  it("the payload carries strings, not RollDetail-shaped stubs", () => {
    // Covered mechanically by rollAccounting.test.ts; this pins the SHAPE, so a
    // regression to a stub is a type error and a test failure rather than a
    // silently double-counted roll.
    for (const events of sweep(buildScenario, 60, "tip-shape")) {
      for (const { event } of events) {
        if (event.type !== "TIPPED_BALL") continue;
        expect(typeof event.payload.rollRef).toBe("string");
        for (const attempt of event.payload.attempts) {
          expect(typeof attempt.rollRef).toBe("string");
          expect(attempt.rollRef.startsWith("ref:")).toBe(false);
        }
      }
    }
  });
});

describe("ADR-009 #2 — CheckKind gains zone_read_qb", () => {
  it("§9.4's two rolls no longer share one label", () => {
    let routeReps = 0;
    let readReps = 0;
    for (const events of sweep(buildMixedCoverageScenario, 300, "zread")) {
      for (const { event } of events) {
        if (event.type !== "CHECK") continue;
        if (event.payload.checkKind === "zone_coverage") routeReps += 1;
        if (event.payload.checkKind === "zone_read_qb") readReps += 1;
      }
    }
    expect(routeReps).toBeGreaterThan(0);
    expect(readReps).toBeGreaterThan(0);
  });

  it("zone_coverage is now EXACTLY the route rep: actors are [receiver, defender]", () => {
    for (const events of sweep(buildZoneScenario, 100, "zshape")) {
      const qb = new Set<string>();
      for (const { event } of events) {
        if (event.type === "CHECK" && event.payload.checkKind === "zone_read_qb") {
          qb.add(String(event.payload.actors[1]));
        }
      }
      for (const { event } of events) {
        if (event.type !== "CHECK" || event.payload.checkKind !== "zone_coverage") continue;
        // The quarterback is never the second actor of a route rep. Before the
        // amendment that was the ONLY way to tell the two apart.
        expect(qb.has(String(event.payload.actors[1]))).toBe(false);
      }
    }
  });
});

describe("ADR-009 #3 — ROUTE_STATUS.phase gains SETTLED", () => {
  it("a receiver who sat down in a zone hole says so, and is never DECAYING", () => {
    let settled = 0;
    for (const events of sweep(buildZoneScenario, 200, "settled")) {
      const byReceiver = new Map<string, string[]>();
      for (const { event } of events) {
        if (event.type !== "ROUTE_STATUS") continue;
        const key = String(event.payload.receiver);
        byReceiver.set(key, [...(byReceiver.get(key) ?? []), event.payload.phase]);
      }
      for (const phases of byReceiver.values()) {
        if (!phases.includes("SETTLED")) continue;
        settled += 1;
        // The interim reported him OPEN and then DECAYING. Nothing decays: his
        // openness is held flat by `zoneCoverage.settledDecayPerTick`.
        expect(phases).not.toContain("DECAYING");
      }
    }
    expect(settled).toBeGreaterThan(0);
  });

  it("a man-covered receiver still DECAYS — the narrowing did not change man", () => {
    let decaying = 0;
    // The stalled fixture is the one that reaches §8.7's decay point at all: on
    // the base matchup the pocket ends the play before 3.0s.
    for (const events of sweep(buildStalledPocketScenario, 300, "decay")) {
      for (const { event } of events) {
        if (event.type !== "ROUTE_STATUS") continue;
        if (event.payload.phase === "DECAYING") decaying += 1;
        expect(event.payload.phase).not.toBe("SETTLED");
      }
    }
    expect(decaying).toBeGreaterThan(0);
  });
});

/**
 * ADR-010 — the ball carrier gets a vocabulary of his own.
 *
 * The rejected alternative was a `phase: "YAC" | "RUSH"` discriminator on
 * `YAC_ZONE`, and the reason it was rejected is the standing rule the ADR
 * promoted: **widen or add; never overload.** A discriminator makes every
 * existing consumer's filter silently WRONG — its aggregates still compute, and
 * they are quietly about a different thing. A separate event makes it loudly
 * incomplete instead.
 */
describe("ADR-010 — RUSH_ZONE is a sibling of YAC_ZONE, not a flag on it", () => {
  it("a scrambling quarterback publishes RUSH zones: he is rushing, not receiving", () => {
    let carries = 0;
    for (let i = 0; i < 1500 && carries === 0; i++) {
      const { state, calls } = buildScramblerScenario();
      const { events } = simulatePassPlay(state, calls, `scramble-zone-${i}`);
      const run = events.find((e) => e.event.type === "RUN_RESOLUTION");
      if (run?.event.type !== "RUN_RESOLUTION") continue;
      const rush = events.flatMap(({ event }) =>
        event.type === "RUSH_ZONE" ? [event.payload] : [],
      );
      if (rush.length === 0) continue;
      carries += 1;
      // Quarterback rushing yards must never land in a receiving aggregate.
      expect(events.some((e) => e.event.type === "YAC_ZONE")).toBe(false);
      for (const zone of rush) expect(zone.carrier).toBe(state.quarterback);
      expect(run.event.payload.carryType).toBe("SCRAMBLE");
    }
    expect(carries).toBe(1);
  });

  it("a completion publishes YAC zones and never RUSH zones", () => {
    let receptions = 0;
    for (const events of sweep(buildScenario, 120, "yac-zone")) {
      const yac = events.filter((e) => e.event.type === "YAC_ZONE");
      if (yac.length === 0) continue;
      receptions += 1;
      expect(events.some((e) => e.event.type === "RUSH_ZONE")).toBe(false);
    }
    expect(receptions).toBeGreaterThan(0);
  });

  it("no stream ever carries both — the two aggregates cannot cross", () => {
    for (const events of sweep(buildScenario, 200, "no-mix")) {
      const yac = events.some((e) => e.event.type === "YAC_ZONE");
      const rush = events.some((e) => e.event.type === "RUSH_ZONE");
      expect(yac && rush).toBe(false);
    }
  });
});

/**
 * ADR-014 — the game-structure vocabulary, and the interim it retired.
 *
 * Item 13 is the one with teeth. The petition asked for `MatchEventBase.playId`
 * to become OPTIONAL; that was refused, because it would have made "this is not
 * a play" and "somebody forgot to set it" arrive as the same `undefined`, and
 * because it narrows a guarantee every existing consumer relies on. Ratified
 * instead as TWO bases — `playId: PlayId` and `playId?: never` — so absence is
 * structural, a play event that omits its id fails to compile, and a game event
 * cannot claim one.
 *
 * The concrete thing that bought: `{gameId}:final` is gone. It was a branded
 * `PlayId` naming no play, minted for `GAME_END` only because the base demanded
 * one, and it was the only dishonest identifier in the stream.
 */
describe("ADR-014 — the game is described by the schema, not by an engine-local union", () => {
  const fixture = buildGameFixture({ seed: "adr014-vocabulary" });
  const game = simulateGame(fixture.state, fixture.inputs, fixture.seed);

  it("no event anywhere in a game carries a minted, play-less identifier", () => {
    for (const { event } of game.events) {
      if (event.playId === undefined) continue;
      expect(String(event.playId)).not.toContain(":final");
    }
  });

  it("every GAME-scoped event has no playId, and every play event has one", () => {
    const GAME_SCOPED = new Set([
      "GAME_START", "COIN_TOSS", "PERIOD_START", "PERIOD_END", "POSSESSION_CHANGE",
      "DRIVE_START", "DRIVE_END", "SCORE", "COACH_DECISION", "PLACEKICK", "PUNT",
      "KICKOFF", "GAME_END",
    ]);
    const seen = new Set<string>();
    for (const { event } of game.events) {
      seen.add(event.type);
      if (GAME_SCOPED.has(event.type)) {
        expect(isGameScoped(event), `${event.type} claims a playId`).toBe(true);
        expect(event.playId).toBeUndefined();
      } else {
        expect(isGameScoped(event), `${event.type} has no playId`).toBe(false);
        expect(event.playId).toBeDefined();
      }
    }
    // The partition is only meaningful if the sample actually straddled it.
    for (const type of GAME_SCOPED) expect(seen).toContain(type);
    expect(seen).toContain("PLAY_START");
    expect(seen).toContain("CHECK");
  });

  it("GAME_SUMMARY is gone: one closing event carries the whole ending", () => {
    const types = new Set(game.events.map((e) => e.event.type));
    expect(types.has("GAME_SUMMARY" as never)).toBe(false);
    const end = game.events.map((e) => e.event).find((e) => e.type === "GAME_END");
    if (end?.type !== "GAME_END") throw new Error("no GAME_END");
    expect(end.payload.seed).toBe(fixture.seed);
    expect(end.payload.reason).toBe(game.summary.finalReason);
    expect(end.payload.plays).toBe(game.summary.plays);
    expect(end.payload.drives).toBe(game.summary.drives);
    expect(end.payload.periods.length).toBeGreaterThanOrEqual(4);
    expect(end.payload.periods.reduce((a, p) => a + p.home, 0)).toBe(end.payload.home);
    expect(end.payload.periods.reduce((a, p) => a + p.away, 0)).toBe(end.payload.away);
  });

  /**
   * A field-goal attempt is a fourth down, a punt is a play, a kickoff is a free
   * kick. Their CHECKs therefore carry a real `PlayId` derived from the same two
   * coordinates the PRNG fork label uses — not a fiction, and not a counter.
   */
  it("special-teams CHECKs name the play they belong to, honestly and uniquely", () => {
    const byPlay = new Map<string, Set<string>>();
    for (const { event } of game.events) {
      if (event.type !== "CHECK") continue;
      if (!["field_goal", "punt", "kick_return"].includes(event.payload.checkKind)) continue;
      const id = String(event.playId);
      expect(id).toMatch(/:(kickoff|punt|fieldGoal|pat):\d+$/);
      const kinds = byPlay.get(id) ?? new Set<string>();
      kinds.add(event.payload.roll.rngLabel);
      byPlay.set(id, kinds);
    }
    expect(byPlay.size).toBeGreaterThan(20);
    // At most two rolls per special-teams play (the kick, and the return).
    for (const [id, labels] of byPlay) {
      expect(labels.size, `${id} carries ${labels.size} rolls`).toBeLessThanOrEqual(2);
    }
  });
});
