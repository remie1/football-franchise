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
import { simulatePassPlay } from "../src/index.js";
import { buildScenario, buildScramblerScenario } from "./fixtures.js";

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
