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
import { createRng, playerId } from "@ff/contracts";
import { checkPayload } from "../src/events.js";
import type { BeatTickEmission, CheckEmission } from "../src/events.js";
import { simulateGame, simulatePassPlay } from "../src/index.js";
import { isGameScoped } from "../src/game/events.js";
import { TUNABLES } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";
import type { Tunables } from "../src/tunables.js";
import { PASS_FIXTURES, RULE_SETS, STEP1_RULE_SET_NAMES, isShapeS, isStep3 } from "./pocketTunables.js";
import { callsUnder } from "./snapFixtures.js";
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
  tunables?: Tunables,
): MatchEventEnvelope[][] {
  const out: MatchEventEnvelope[][] = [];
  for (let i = 0; i < n; i++) {
    const { state, calls } = build();
    out.push([
      ...(tunables === undefined
        ? simulatePassPlay(state, calls, `${prefix}-${i}`)
        : simulatePassPlay(state, callsUnder(tunables, state, calls), `${prefix}-${i}`, tunables)
      ).events,
    ]);
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

  /**
   * ADR-089 step 1 (plan §16.2): the join names the tick under `legacy` and shape L, and the
   * `pass_rush_beat` under shape S, whose own `rollRef` names the rep (tick → beat → rep).
   */
  for (const { name, tunables } of RULE_SETS) {
    const joinKind = isShapeS(name) ? "pass_rush_beat" : "pass_rush_tick";
    it(`rollRef names a ${joinKind} roll that is already in the stream (ADR-004) (${name})`, () => {
      let joined = 0;
      for (const events of sweep(buildScenario, 200, "ref", tunables)) {
        const rushLabels = new Map<string, { seq: number; rollRef: string | undefined }>();
        const reps = new Map<string, number>();
        const dieless: { seq: number; rollRef: string | undefined }[] = [];
        for (const { seq, event } of events) {
          if (event.type !== "CHECK") continue;
          if (event.payload.checkKind === "pass_rush_rep") reps.set(event.payload.roll.rngLabel, seq);
          if (event.payload.checkKind === joinKind) {
            const kind: string = event.payload.checkKind;
            if (event.payload.roll === undefined) {
              if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
              continue;
            }
            rushLabels.set(event.payload.roll.rngLabel, { seq, rollRef: event.payload.rollRef });
          }
          if (event.payload.checkKind === "pass_rush_tick" && event.payload.roll === undefined) {
            dieless.push({ seq, rollRef: event.payload.rollRef });
          }
        }
        for (const { seq, event } of events) {
          if (event.type !== "RUSH_THREAT") continue;
          joined += 1;
          const at = rushLabels.get(event.payload.rollRef);
          expect(at).toBeDefined();
          // The reference always points backwards...
          expect(at?.seq ?? Infinity).toBeLessThan(seq);
          // ...and the CHECK it names points backwards at the rep.
          expect(reps.get(at?.rollRef ?? "") ?? Infinity).toBeLessThan(at?.seq ?? -Infinity);
        }
        // Shape S's dieless ticks name the beat, which is already in the stream; nothing else has one.
        if (isShapeS(name)) {
          for (const d of dieless) expect(rushLabels.get(d.rollRef ?? "")?.seq ?? Infinity).toBeLessThan(d.seq);
        } else {
          expect(dieless).toEqual([]);
        }
      }
      expect(joined).toBeGreaterThan(0);
    });
  }

  it("carries no RollDetail and no tier — no die produces an ETA (ADR-005)", () => {
    for (const events of sweep(buildScenario, 100, "notier")) {
      for (const t of threats(events)) {
        const keys = Object.keys(t.payload).sort();
        expect(keys).toEqual(["alignment", "etaTick", "origin", "rollRef", "rusher", "state"]);
      }
    }
  });

  /**
   * ADR-089 P4 and §9 (S4): under `pocket-1` every threat also says how he got there, as its last
   * key, and every pass play's PLAY_START names its rules as ITS last key. The legacy key set
   * above stays exact; this is the ON case beside it.
   */
  for (const { name, tunables } of RULE_SETS) {
    if (name === "legacy") continue;
    it(`under ${name}: RUSH_THREAT gains approach and PLAY_START gains rules, each as the last key`, () => {
      let published = 0;
      for (const build of [buildScenario, buildScramblerScenario, buildStalledPocketScenario]) {
        for (const events of sweep(build, 60, `on-${name}`, tunables)) {
          const start = events[0]?.event;
          if (start?.type !== "PLAY_START") throw new Error("no PLAY_START");
          const keys = Object.keys(start.payload as object);
          // ADR-090 S2: calls that carry the snap picture put it on PLAY_START after `rules`; an s3
          // set's pass play always carries one (plan §2.3), every other set's plays here none.
          expect(keys).toEqual(["kind", "offense", "defense", "situation", "rules", ...(isStep3(name) ? ["snap"] : [])]);
          const rules = (start.payload as { rules: { name: string; overlayDigest: string } }).rules;
          expect(rules).toEqual(tunables.engineRules);
          expect(Object.keys(rules)).toEqual(["name", "overlayDigest"]);
          for (const t of threats(events)) {
            published += 1;
            // ADR-089 P5 (E6b): an s3 set with the free-run block publishes the threat's distance
            // and closing speed after `approach`, both or neither; every other set neither.
            const pair = isStep3(name) && "distanceYards" in t.payload ? ["distanceYards", "closingSpeed"] : [];
            expect(Object.keys(t.payload)).toEqual(["rusher", "alignment", "origin", "rollRef", "etaTick", "state", "approach", ...pair]);
            expect(["FREE", "ARC", "THROUGH", "PUSH"]).toContain(t.payload.approach);
          }
        }
      }
      expect(published).toBeGreaterThan(0);
    });
  }

  it("in a game under pocket-1, rules is on every pass play's PLAY_START and on no other (O20)", () => {
    const sw = RULE_SETS.find((r) => r.name === "SW");
    if (sw === undefined) throw new Error("no SW");
    const fixture = buildGameFixture({ seed: "rules-on-pass-plays" });
    const { events } = simulateGame(fixture.state, fixture.inputs, fixture.seed, sw.tunables);
    const kinds = new Map<string, number>();
    for (const { event } of events) {
      if (event.type !== "PLAY_START") continue;
      const p = event.payload as { kind: string; rules?: unknown };
      kinds.set(p.kind, (kinds.get(p.kind) ?? 0) + 1);
      if (p.kind === "PASS_PLAY_V1") {
        expect(Object.keys(p).at(-1)).toBe("rules");
        expect(p.rules).toEqual(sw.tunables.engineRules);
      } else {
        expect("rules" in p).toBe(false);
      }
    }
    expect(kinds.get("PASS_PLAY_V1") ?? 0).toBeGreaterThan(10);
    expect(kinds.size).toBeGreaterThan(1);
  });

  it("under legacy: PLAY_START keeps today's keys and no threat carries approach", () => {
    for (const build of [buildScenario, buildScramblerScenario, buildStalledPocketScenario]) {
      for (const events of sweep(build, 60, "off")) {
        const start = events[0]?.event;
        if (start?.type !== "PLAY_START") throw new Error("no PLAY_START");
        expect(Object.keys(start.payload as object)).toEqual(["kind", "offense", "defense", "situation"]);
        for (const t of threats(events)) {
          expect(Object.keys(t.payload)).toEqual(["rusher", "alignment", "origin", "rollRef", "etaTick", "state"]);
        }
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
 * ADR-054 — the pursuit clock gets its own publisher, `QB_PURSUIT`, rather
 * than a `RUSH_THREAT` wearing a fabricated `rusher`/`alignment`. It is a
 * PUBLICATION of values already computed at `resolveScramble`'s call site —
 * `sinceTick`, `deadlineTick` (`pursuitDeadline(tunables, tick)`) and
 * `rollRef` (the §8.8 escape CHECK's `rngLabel`) — so these tests check shape
 * and joins, never a new derivation.
 */
describe("ADR-054 — QB_PURSUIT", () => {
  type Pursuit = Extract<MatchEventEnvelope["event"], { type: "QB_PURSUIT" }>;

  function pursuits(events: readonly MatchEventEnvelope[]): Pursuit[] {
    return events.flatMap(({ event }) => (event.type === "QB_PURSUIT" ? [event] : []));
  }

  it("carries exactly sinceTick, deadlineTick and rollRef — no rusher, no alignment, no origin", () => {
    let seen = 0;
    for (const events of sweep(buildScramblerScenario, 300, "pursuit-shape")) {
      for (const p of pursuits(events)) {
        seen += 1;
        expect(Object.keys(p.payload).sort()).toEqual(["deadlineTick", "rollRef", "sinceTick"]);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("at most one publication per play, and at least one play has exactly one (a successful escape)", () => {
    let escapes = 0;
    for (const events of sweep(buildScramblerScenario, 400, "pursuit-count")) {
      const list = pursuits(events);
      // No `DELAYED`/`RESET`/`ARRIVED` lifecycle to mirror (ADR-054 §3): the
      // deadline never moves once set, so a play carries this event zero or
      // one times, never more.
      expect(list.length).toBeLessThanOrEqual(1);
      if (list.length === 1) escapes += 1;
    }
    expect(escapes).toBeGreaterThan(0);
  });

  it("a play with no successful §8.8 escape publishes no QB_PURSUIT", () => {
    let checked = 0;
    for (const events of sweep(buildScenario, 300, "pursuit-none")) {
      const escaped = events.some(
        (e) => e.event.type === "QB_DECISION" && e.event.payload.choice === "SCRAMBLE",
      );
      if (escaped) continue;
      checked += 1;
      expect(pursuits(events).length).toBe(0);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("rollRef names the §8.8 escape CHECK already in the stream, and points backwards (ADR-004)", () => {
    let joined = 0;
    for (const events of sweep(buildScramblerScenario, 300, "pursuit-ref")) {
      const scrambleChecks = new Map<string, number>();
      for (const { seq, event } of events) {
        if (event.type === "CHECK" && event.payload.checkKind === "scramble") {
          scrambleChecks.set(event.payload.roll.rngLabel, seq);
        }
      }
      for (const { seq, event } of events) {
        if (event.type !== "QB_PURSUIT") continue;
        joined += 1;
        const at = scrambleChecks.get(event.payload.rollRef);
        expect(at).toBeDefined();
        expect(at ?? Infinity).toBeLessThan(seq);
      }
    }
    expect(joined).toBeGreaterThan(0);
  });

  it("sinceTick is the tick it was emitted on, and deadlineTick is fixed at sinceTick + pursuitSeconds", () => {
    let seen = 0;
    for (const events of sweep(buildScramblerScenario, 300, "pursuit-numbers")) {
      for (const p of pursuits(events)) {
        seen += 1;
        expect(p.tick).toBe(p.payload.sinceTick);
        expect(p.payload.deadlineTick).toBe(
          Number((p.payload.sinceTick + TUNABLES.scramble.pursuitSeconds).toFixed(1)),
        );
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("immediately follows the scramble CHECK it references — one publication, no lifecycle", () => {
    let seen = 0;
    for (const events of sweep(buildScramblerScenario, 300, "pursuit-adjacency")) {
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (e === undefined || e.event.type !== "QB_PURSUIT") continue;
        seen += 1;
        const prev = events[i - 1];
        expect(prev?.event.type).toBe("CHECK");
        if (prev?.event.type === "CHECK") expect(prev.event.payload.checkKind).toBe("scramble");
      }
    }
    expect(seen).toBeGreaterThan(0);
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
    // ADR-016 item 1 moved `PLACEKICK`, `PUNT` and `KICKOFF` OUT of this set:
    // a field goal is a fourth down, a punt is a play, a kickoff is a free-kick
    // down, and each one's summary now carries the same `PlayId` its own CHECKs
    // carry. What is left is boundaries, decisions and scoreboard states.
    const GAME_SCOPED = new Set([
      "GAME_START", "COIN_TOSS", "PERIOD_START", "PERIOD_END", "POSSESSION_CHANGE",
      "DRIVE_START", "DRIVE_END", "SCORE", "COACH_DECISION", "GAME_END",
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
    for (const type of ["PLACEKICK", "PUNT", "KICKOFF"]) expect(seen).toContain(type);
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
      const kind: string = event.payload.checkKind;
      if (event.payload.roll === undefined) {
        if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
        continue;
      }
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

  /**
   * ADR-016 item 1. The summary of a play could not name the play its own roll
   * named: `PLACEKICK` / `PUNT` / `KICKOFF` were GAME-scoped and their `CHECK`s
   * were not, so "is this event about a play?" had two answers for two events
   * describing the same down.
   *
   * The check below is the strong form of the fix rather than a restatement of
   * it. It does not assume the two ids were produced by the same expression: it
   * joins summary to roll through `rollRef` — the ADR-004 join that was the only
   * available one before this — and then asserts the `playId` on either end of
   * that join agrees. A second minting would fail it.
   */
  it("a kick's summary names the SAME play its own CHECKs name", () => {
    const playOfRoll = new Map<string, string>();
    for (const { event } of game.events) {
      if (event.type !== "CHECK") continue;
      const kind: string = event.payload.checkKind;
      if (event.payload.roll === undefined) {
        if (kind !== "pass_rush_tick") throw new Error(`a ${kind} CHECK without a roll`);
        continue;
      }
      playOfRoll.set(event.payload.roll.rngLabel, String(event.playId));
    }

    const ids: string[] = [];
    for (const { event } of game.events) {
      if (event.type !== "PLACEKICK" && event.type !== "PUNT" && event.type !== "KICKOFF") continue;
      const id = String(event.playId);
      ids.push(id);
      // Honest, and the same two coordinates the PRNG fork label uses.
      expect(id).toMatch(/:(kickoff|punt|fieldGoal|pat):\d+$/);
      expect(id).not.toContain(":final");
      const refs = [
        event.payload.rollRef,
        ...(event.type === "PLACEKICK" ? [] : [event.payload.returnRollRef]),
      ];
      for (const ref of refs) {
        if (ref === undefined) continue;
        expect(playOfRoll.get(ref), `${ref} is referenced by no CHECK`).toBe(id);
      }
    }

    expect(ids.length).toBeGreaterThan(20);
    // One id per kick: a summary and its rolls share an id, but two kicks never do.
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The consequence ADR-016 item 1 states plainly: `GAME_END.plays` still counts
   * SCRIMMAGE plays and would continue to. "Downs including kicks" is a count of
   * distinct `playId`s, which is what item 1 made possible — so the two numbers
   * must differ by exactly the number of kicks.
   */
  it("GAME_END.plays stays scrimmage-only; distinct playIds are the wider count", () => {
    const end = game.events.map((e) => e.event).find((e) => e.type === "GAME_END");
    if (end?.type !== "GAME_END") throw new Error("no GAME_END");
    const distinct = new Set<string>();
    let kicks = 0;
    for (const { event } of game.events) {
      if (event.playId !== undefined) distinct.add(String(event.playId));
      if (event.type === "PLACEKICK" || event.type === "PUNT" || event.type === "KICKOFF") kicks += 1;
    }
    expect(distinct.size).toBe(end.payload.plays + kicks);
  });
});

/**
 * ADR-089 N1 — `checkPayload`'s key order. The legacy branch is today's body, untouched; the
 * dieless branch, keyed on the emission having no `roll` key at all, keeps the same order less
 * `roll` and `opposedRoll`.
 */
describe("ADR-089 N1 — the CHECK payload's keys, in order", () => {
  const LEGACY_TICK = ["checkKind", "actors", "roll", "tier", "margin", "testsAttrs", "opposedRoll", "band", "rollRef"];
  const DIELESS_TICK = ["checkKind", "actors", "tier", "margin", "testsAttrs", "band", "rollRef"];

  it("a legacy pass_rush_tick, built and as the stream carries it", () => {
    const rng = createRng("keys", "t");
    const roll = { die: "d100" as const, raw: 50, modifiers: [], total: 50, rngLabel: rng.label };
    const emission: CheckEmission = {
      checkKind: "pass_rush_tick",
      actors: [playerId("r"), playerId("b")],
      roll,
      opposedRoll: { ...roll, rngLabel: "b" },
      tier: "TIE",
      band: "STALEMATE",
      margin: 0,
      testsAttrs: [],
      rollRef: "rep",
    };
    expect(Object.keys(checkPayload(emission))).toEqual(LEGACY_TICK);
    let ticks = 0;
    for (const events of sweep(buildScenario, 20, "keys")) {
      for (const { event } of events) {
        if (event.type !== "CHECK" || event.payload.checkKind !== "pass_rush_tick") continue;
        ticks += 1;
        expect(Object.keys(event.payload)).toEqual(LEGACY_TICK);
      }
    }
    expect(ticks).toBeGreaterThan(0);
  });

  it("a dieless tick: the same keys less roll and opposedRoll, built and as the stream carries it", () => {
    const emission: BeatTickEmission = {
      checkKind: "pass_rush_tick",
      actors: [playerId("r"), playerId("b")],
      tier: "TIE",
      band: "STALEMATE",
      margin: 0,
      testsAttrs: [],
      rollRef: "beat",
    };
    expect(Object.keys(checkPayload(emission))).toEqual(DIELESS_TICK);
    const sw = RULE_SETS.find((r) => r.name === "SW");
    if (sw === undefined) throw new Error("no SW");
    let ticks = 0;
    for (const events of sweep(buildScenario, 20, "keys", sw.tunables)) {
      for (const { event } of events) {
        if (event.type !== "CHECK" || event.payload.checkKind !== "pass_rush_tick") continue;
        ticks += 1;
        expect(Object.keys(event.payload)).toEqual(DIELESS_TICK);
      }
    }
    expect(ticks).toBeGreaterThan(0);
  });
});

/**
 * ADR-089 step 2 — NO NEW VOCABULARY (plan §1.1, §3). Must act per rusher (S2) and the narrower
 * counter (S2N) decide among the same choices, publish the same event types and CHECK kinds, and
 * name the same throwaway causes as the step-1 rule sets (legacy, S, SW, L5, L8) on the same
 * fixtures and seeds; and every key set of every event is one those rule sets publish too.
 */
describe("ADR-089 step 2 — must act adds no event, CHECK kind, choice or cause", () => {
  it("under S2 and S2N every word of the stream is one the step-1 rule sets already use", () => {
    const words = (events: readonly MatchEventEnvelope[], into: Set<string>): void => {
      for (const { event } of events) {
        into.add(`type:${event.type}`);
        into.add(`keys:${event.type}:${Object.keys(event.payload as object).join(",")}`);
        if (event.type === "CHECK") into.add(`check:${event.payload.checkKind}`);
        if (event.type === "QB_DECISION") into.add(`choice:${event.payload.choice}`);
        if (event.type === "THROWAWAY") into.add(`cause:${event.payload.cause}`);
        if (event.type === "POCKET_STATUS") into.add(`status:${event.payload.status}`);
        if (event.type === "RUSH_THREAT") into.add(`threat:${event.payload.state}:${event.payload.origin}`);
      }
    };
    const step1 = new Set<string>();
    const step2 = new Map<string, Set<string>>([["S2", new Set()], ["S2N", new Set()]]);
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 40; i++) {
        for (const { name, tunables } of RULE_SETS) {
          const { state, calls } = build();
          const { events } = simulatePassPlay(state, callsUnder(tunables, state, calls), `vocabulary-s2-${fixture}-${i}`, tunables);
          if (STEP1_RULE_SET_NAMES.includes(name)) words(events, step1);
          const into = step2.get(name);
          if (into !== undefined) words(events, into);
        }
      }
    }
    for (const [name, seen] of step2) {
      expect([...seen].filter((w) => !step1.has(w)), name).toEqual([]);
      // Not vacuous: the forced acts are all in the sample.
      for (const w of ["choice:THROW", "choice:CHECKDOWN", "choice:HOLD", "choice:STEP_UP", "choice:SCRAMBLE", "choice:THROWAWAY", "cause:POCKET_DURESS", "cause:CLOCK_EXPIRED", "check:pocket_movement"]) {
        expect(seen.has(w), `${name}: ${w}`).toBe(true);
      }
    }
  });
});
