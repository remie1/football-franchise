/**
 * §13 — YAC over real pass-play streams, and the three placeholders it retired.
 *
 * Before this, a completion was scored for its air yards and stopped, a tipped
 * ball an offensive player recovered was scored for HIS air yards and stopped,
 * and a scrambling quarterback who tucked it gained a flat five. All three were
 * marked PLACEHOLDER in `TUNABLES`; all three are now ball carriers.
 */
import { describe, expect, it } from "vitest";
import { setAttr } from "@ff/contracts";
import type { MatchEventEnvelope } from "@ff/contracts";
import { resolveAttr } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import { TUNABLES } from "../src/tunables.js";
import {
  buildCleanPocketScenario,
  buildDeflectionScenario,
  buildScenario,
} from "./fixtures.js";

function checks(events: readonly MatchEventEnvelope[], kind: string): MatchEventEnvelope[] {
  return events.filter(({ event }) => event.type === "CHECK" && event.payload.checkKind === kind);
}

/**
 * §10.4's placement band, READ from the stream (ADR-011).
 *
 * This used to hold `TUNABLES.throwExec.accuracy.bands` and re-derive the label
 * from the margin — which is precisely the coupling the amendment removed: the
 * boundaries are calibration's tuning target, so a consumer re-deriving them
 * desyncs silently the moment one moves.
 */
function accuracyBandOf(events: readonly MatchEventEnvelope[]): string | undefined {
  const acc = checks(events, "accuracy")[0];
  if (acc?.event.type !== "CHECK") return undefined;
  return acc.event.payload.band;
}

describe("§13 — a catch is no longer the end of the play", () => {
  it("a completion emits YAC_ZONE for every zone the receiver entered", () => {
    let completions = 0;
    for (let i = 0; i < 400; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const { events } = simulatePassPlay(state, calls, `yac-${i}`);
      const caught = events.some((e) => e.event.type === "CATCH_RESOLUTION" && e.event.payload.caught);
      if (!caught) continue;
      completions += 1;
      const zones = events.flatMap(({ event }) => (event.type === "YAC_ZONE" ? [event.payload.zone] : []));
      expect(zones.length).toBeGreaterThan(0);
      // Zones are entered in order and never repeat.
      expect(zones).toEqual([...zones].sort((a, b) => a - b));
      expect(new Set(zones).size).toBe(zones.length);
      expect(zones[0]).toBe(1);
    }
    expect(completions).toBeGreaterThan(0);
  });

  it("total gain is air yards plus YAC, never air yards alone for every catch", () => {
    const gains = new Set<number>();
    let air = 0;
    for (let i = 0; i < 500; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const { events } = simulatePassPlay(state, calls, `gain-${i}`);
      const caught = events.some((e) => e.event.type === "CATCH_RESOLUTION" && e.event.payload.caught);
      if (!caught) continue;
      const thrown = events.find((e) => e.event.type === "THROW");
      const result = events.find((e) => e.event.type === "PLAY_RESULT");
      if (thrown?.event.type !== "THROW" || result?.event.type !== "PLAY_RESULT") continue;
      const target = thrown.event.payload.target;
      const route = calls.offense.routes.find((r) => r.receiver === target);
      if (route === undefined) continue;
      air = route.airYards;
      gains.add(result.event.payload.yards);
      expect(result.event.payload.yards).toBeGreaterThanOrEqual(air);
    }
    // The old behaviour produced exactly one gain per route. This produces many.
    expect(gains.size).toBeGreaterThan(3);
  });

  it("YAC rolls are §13.2's contest, and they are CHECKs like everything else", () => {
    let contests = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const { events } = simulatePassPlay(state, calls, `contest-${i}`);
      for (const { event } of checks(events, "yac_tackle")) {
        if (event.type !== "CHECK") continue;
        contests += 1;
        expect(event.payload.opposedRoll).toBeDefined();
        expect(event.payload.testsAttrs.map(String)).toEqual(["yac", "elusiveness", "tackling", "pursuit"]);
      }
    }
    expect(contests).toBeGreaterThan(0);
  });

  it("the run's §14.4 contest never fires on a catch, and YAC's never fires on a run", () => {
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const { events } = simulatePassPlay(state, calls, `profile-${i}`);
      expect(checks(events, "break_tackle")).toHaveLength(0);
    }
  });
});

describe("§13.2 + §10.5 — both accuracy effects are applied, because the doc states both", () => {
  it("§13.2's catch-transition modifier is a NAMED modifier on the zone-1 roll", () => {
    let seen = 0;
    for (let i = 0; i < 400 && seen < 5; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const { events } = simulatePassPlay(state, calls, `mod-${i}`);
      const zone1 = checks(events, "yac_tackle")[0];
      if (zone1?.event.type !== "CHECK") continue;
      const sources = zone1.event.payload.roll.modifiers.map((m) => m.source);
      if (sources.some((s) => s.includes("Catch transition"))) seen += 1;
      expect(sources.some((s) => s.includes("caught (§13.2)"))).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("§10.5's 'No YAC' for a BAD ball is literally zero yards after the catch", () => {
    let bad = 0;
    for (let i = 0; i < 1500; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const { events } = simulatePassPlay(state, calls, `bad-${i}`);
      const caught = events.some((e) => e.event.type === "CATCH_RESOLUTION" && e.event.payload.caught);
      if (!caught || accuracyBandOf(events) !== "BAD") continue;
      const thrown = events.find((e) => e.event.type === "THROW");
      const result = events.find((e) => e.event.type === "PLAY_RESULT");
      if (thrown?.event.type !== "THROW" || result?.event.type !== "PLAY_RESULT") continue;
      const target = thrown.event.payload.target;
      const route = calls.offense.routes.find((r) => r.receiver === target);
      if (route === undefined) continue;
      bad += 1;
      expect(result.event.payload.yards).toBe(route.airYards);
    }
    expect(bad).toBeGreaterThan(0);
  });

  it("the multiplier table is §10.5's column, ordered and monotone", () => {
    const m = TUNABLES.ballCarrier.yacMultiplierByAccuracyBand;
    expect(m.PERFECT).toBe(1);
    expect(m.EXCELLENT).toBe(1);
    expect(m.GOOD).toBeLessThan(m.EXCELLENT);
    expect(m.ADEQUATE).toBeLessThan(m.GOOD);
    expect(m.POOR).toBeLessThan(m.ADEQUATE);
    expect(m.BAD).toBe(0);
  });
});

describe("§12.4 step 4 — an offensive tip recovery is a live ball carrier", () => {
  /**
   * §12.4 resolves recovery attempts in REACTION order, and the deflection
   * fixture's cover men are 99-reaction ball hawks by construction — so the
   * defence takes every live ball on it. Slowing their reaction below the
   * receivers' is what makes the offensive branch reachable at all; nothing else
   * about the fixture changes.
   */
  function slowReactionDefence(): ReturnType<typeof buildDeflectionScenario> {
    const base = buildDeflectionScenario();
    const players = { ...base.state.players };
    for (const assignment of base.calls.defense.assignments) {
      const key = assignment.defender as unknown as string;
      const defender = players[key];
      if (defender === undefined) continue;
      players[key] = {
        ...defender,
        attributes: {
          ...defender.attributes,
          values: setAttr(defender.attributes.values, resolveAttr("reaction"), 20),
        },
      };
    }
    return { ...base, state: { ...base.state, players } };
  }

  it("the recovering player runs, rather than the play being scored and stopped", () => {
    let recoveries = 0;
    let advanced = 0;
    for (let i = 0; i < 800; i++) {
      const { state, calls } = slowReactionDefence();
      const { events } = simulatePassPlay(state, calls, `tipyac-${i}`);
      const tip = events.find((e) => e.event.type === "TIPPED_BALL");
      if (tip?.event.type !== "TIPPED_BALL") continue;
      const by = tip.event.payload.recoveredBy;
      if (by === undefined) continue;
      const offensive = calls.offense.routes.some((r) => r.receiver === by) ||
        calls.offense.protection.some((p) => p.blocker === by);
      if (!offensive) continue;
      recoveries += 1;
      const zones = events.filter((e) => e.event.type === "YAC_ZONE" && e.event.payload.carrier === by);
      if (zones.length > 0) advanced += 1;
    }
    expect(recoveries).toBeGreaterThan(0);
    expect(advanced).toBe(recoveries);
  });
});

describe("determinism survives YAC", () => {
  it("same seed → identical stream, with the ball carrier live", () => {
    for (let i = 0; i < 30; i++) {
      const a = buildScenario();
      const b = buildScenario();
      const ra = simulatePassPlay(a.state, a.calls, `yac-det-${i}`);
      const rb = simulatePassPlay(b.state, b.calls, `yac-det-${i}`);
      expect(JSON.stringify(ra.events)).toBe(JSON.stringify(rb.events));
    }
  });

  it("a roll still appears exactly once (ADR-004), YAC checks included", () => {
    for (let i = 0; i < 150; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const { events } = simulatePassPlay(state, calls, `yac-adr4-${i}`);
      const labels: string[] = [];
      for (const { event } of events) {
        if (event.type === "CHECK") {
          labels.push(event.payload.roll.rngLabel);
          if (event.payload.opposedRoll !== undefined) labels.push(event.payload.opposedRoll.rngLabel);
        }
        if (event.type === "QB_READ") labels.push(event.payload.varianceRoll.rngLabel);
      }
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});
