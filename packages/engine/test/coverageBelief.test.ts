/**
 * ADR-070 §3 — the second lie. A fooled quarterback believes the SHOWN coverage's typical
 * outcome on every receiver the look lies about, so a look can make a covered man look open
 * (a TRAP, ADR-068 step 1's case, tested in `coverageRead.test.ts`) or an open man look
 * covered (a HIDDEN MAN, tested here). What is asserted:
 *
 *   - the typical rep is the rolled rep with its dice at their mean, checked term for term
 *     against the checks the engine publishes;
 *   - a hidden man (shown a zone defender, played nobody): one read per play; FOOLED, he goes
 *     last and every in-structure read of him is skewed DOWN; SEEING THROUGH it, he goes
 *     first and nothing is skewed; in between, the order is as called;
 *   - a look that puts a man on a receiver nobody plays (Phase 2's Press, at the engine) is a
 *     hidden man too, and the misread names the man;
 *   - shown one defender and played another, the direction of the lie follows their ratings;
 *   - a look that moves a man without changing what anyone expects rolls no read (ADR-005).
 *
 * Every branch is required to have been reached, so a fixture that stopped producing a band
 * cannot pass by never testing it.
 */
import { describe, expect, it } from "vitest";
import { createRng, setAttr } from "@ff/contracts";
import type { MatchEventEnvelope, PlayerId, PlayerState } from "@ff/contracts";
import { resolveAttr } from "../src/attrs.js";
import { simulatePassPlay } from "../src/index.js";
import { resolveManCoverage, typicalManCoverage } from "../src/resolve/manCoverage.js";
import { resolveZoneCoverage, typicalZoneCoverage } from "../src/resolve/zoneCoverage.js";
import { D100_MEAN } from "../src/rolls.js";
import { TUNABLES } from "../src/tunables.js";
import type { PlayCalls } from "../src/types.js";
import { baseReceivers, buildMixedCoverageScenario, buildZoneScenario, type Scenario } from "./fixtures.js";

const SEEDS = Array.from({ length: 300 }, (_, i) => `adr-070-belief-${String(i)}`);

const FOOLED: ReadonlySet<string> = new Set(TUNABLES.presnap.coverageRead.bands.filter((b) => b.fooled).map((b) => b.label));
const SEES: ReadonlySet<string> = new Set(TUNABLES.presnap.coverageRead.bands.filter((b) => b.seesThrough).map((b) => b.label));

type Assignments = PlayCalls["defense"]["assignments"];

function payload(e: MatchEventEnvelope): Record<string, unknown> {
  return e.event.payload as Record<string, unknown>;
}

function coverageReads(events: readonly MatchEventEnvelope[]): Record<string, unknown>[] {
  return events
    .filter((e) => e.event.type === "PRESNAP_READ" && payload(e)["kind"] === "coverage_read")
    .map(payload);
}

function readOrderOf(events: readonly MatchEventEnvelope[]): readonly string[] {
  const start = events.find((e) => e.event.type === "PLAY_START");
  const offense = (start === undefined ? {} : payload(start)["offense"]) as { readOrder?: readonly string[] };
  return (offense.readOrder ?? []).map(String);
}

/** Every misread modifier on a read of this receiver: its name and its size. */
function misreadsOf(
  events: readonly MatchEventEnvelope[],
  receiver: PlayerId,
): readonly { readonly source: string; readonly value: number }[] {
  const out: { source: string; value: number }[] = [];
  for (const e of events) {
    if (e.event.type !== "QB_READ") continue;
    const p = payload(e) as { target: unknown; varianceRoll: { modifiers: readonly { source: string; value: number }[] } };
    if (String(p.target) !== String(receiver)) continue;
    for (const m of p.varianceRoll.modifiers) if (m.source.startsWith("Coverage misread")) out.push(m);
  }
  return out;
}

function withRating(players: Scenario["state"]["players"], id: PlayerId, attr: string, value: number): Scenario["state"]["players"] {
  const existing = players[id as unknown as string];
  if (existing === undefined) throw new Error(`bad fixture: no player ${String(id)}`);
  const updated: PlayerState = {
    ...existing,
    attributes: { ...existing.attributes, values: setAttr(existing.attributes.values, resolveAttr(attr), value) },
  };
  return { ...players, [id as unknown as string]: updated };
}

function withShown(base: Scenario, shown: Assignments, played: Assignments = base.calls.defense.assignments): Scenario {
  return {
    ...base,
    calls: {
      ...base.calls,
      defense: { ...base.calls.defense, assignments: played, shownAssignments: shown, coverageDisguise: "ROTATED" },
    },
  };
}

function defendersOf(s: Scenario): { readonly cb1: PlayerId; readonly cb2: PlayerId; readonly lb: PlayerId } {
  const a = s.calls.defense.assignments;
  const cb1 = a[0]?.defender;
  const cb2 = a[1]?.defender;
  const lb = a[2]?.defender;
  if (cb1 === undefined || cb2 === undefined || lb === undefined) throw new Error("bad fixture");
  return { cb1, cb2, lb };
}

/** The mixed scenario's flat: the receiver its corner plays man on. */
function flatReceiverOf(s: Scenario): PlayerId {
  const flat = s.calls.offense.routes.find((r) => r.depthClass === "QUICK")?.receiver;
  if (flat === undefined) throw new Error("bad fixture");
  return flat;
}

function player(s: Scenario, id: PlayerId): PlayerState {
  const p = s.state.players[id as unknown as string];
  if (p === undefined) throw new Error(`bad fixture: no player ${String(id)}`);
  return p;
}

/**
 * Plays the scenario on every seed and checks the hidden man's place and reads in each band.
 * Returns how many plays landed in each branch, so the caller can require all three.
 */
function exerciseHiddenMan(
  s: Scenario,
  hidden: PlayerId,
  expectedSource: string,
): { fooled: number; sees: number; neither: number; skewedReads: number } {
  const counts = { fooled: 0, sees: 0, neither: 0, skewedReads: 0 };
  const calledOrder = s.calls.offense.readOrder.map(String);
  for (const seed of SEEDS) {
    const { events } = simulatePassPlay(s.state, s.calls, seed);
    const reads = coverageReads(events);
    expect(reads, seed).toHaveLength(1);
    const band = String((reads[0] as { band: unknown }).band);
    const order = readOrderOf(events);
    const misreads = misreadsOf(events, hidden);

    if (FOOLED.has(band)) {
      counts.fooled += 1;
      expect(order[order.length - 1], `${seed}: a fooled QB reads the man the look covered last`).toBe(String(hidden));
      for (const m of misreads) {
        expect(m.source, seed).toBe(expectedSource);
        expect(m.value, `${seed}: the look made him read worse than he is`).toBeLessThanOrEqual(0);
      }
      counts.skewedReads += misreads.filter((m) => m.value < 0).length;
    } else if (SEES.has(band)) {
      counts.sees += 1;
      expect(order[0], `${seed}: a QB who saw through it reads the hidden man first`).toBe(String(hidden));
      expect(misreads, seed).toEqual([]);
    } else {
      counts.neither += 1;
      expect(order, `${seed}: ${band} leaves the progression as called`).toEqual(calledOrder);
      expect(misreads, seed).toEqual([]);
    }
  }
  return counts;
}

describe("ADR-070 §3 — the typical rep is the rolled rep with its dice at their mean", () => {
  it("man coverage: the margin is the two sides' modifiers, term for term", () => {
    const s = buildMixedCoverageScenario();
    const quick = flatReceiverOf(s);
    for (const defenderId of s.calls.defense.assignments.map((a) => a.defender)) {
      const receiver = player(s, quick);
      const defender = player(s, defenderId);
      const typical = typicalManCoverage(TUNABLES, receiver, defender);
      for (const seed of SEEDS.slice(0, 40)) {
        const rolled = resolveManCoverage({ tunables: TUNABLES, receiver, defender, coverageRng: createRng(seed, "man") });
        expect(rolled.margin - (rolled.receiverRoll.raw - rolled.defenderRoll.raw), seed).toBe(typical.margin);
      }
      expect(typical.openness).toBe(TUNABLES.manCoverage.bands.find((b) => b.label === typical.band)?.openness);
    }
  });

  it("man coverage: equal men expect an even bracket — ADR-070 §3's worked example", () => {
    const s = buildMixedCoverageScenario();
    const quick = flatReceiverOf(s);
    const cb2 = s.calls.defense.assignments.find((a) => a.kind === "MAN")?.defender;
    if (cb2 === undefined) throw new Error("bad fixture");
    let players = withRating(s.state.players, quick, "routeRunning", 70);
    players = withRating(players, quick, "agility", 80);
    players = withRating(players, cb2, "manCoverage", 70);
    players = withRating(players, cb2, "agility", 80);
    const receiver = players[quick as unknown as string];
    const defender = players[cb2 as unknown as string];
    if (receiver === undefined || defender === undefined) throw new Error("bad fixture");
    const typical = typicalManCoverage(TUNABLES, receiver, defender);
    expect(typical.margin).toBe(0);
    expect(typical.band).toBe("EVEN_BRACKET");
  });

  it("zone coverage: the margin is the mean face plus his modifiers against the target, never on a boundary", () => {
    const s = buildZoneScenario();
    const { deep, intermediate, quick } = baseReceivers(s);
    const { cb1, cb2, lb } = defendersOf(s);
    for (const receiverId of [deep, intermediate, quick]) {
      for (const defenderId of [cb1, cb2, lb]) {
        const receiver = player(s, receiverId);
        const defender = player(s, defenderId);
        const typical = typicalZoneCoverage(TUNABLES, receiver, defender);
        expect(Number.isInteger(typical.margin), "a typical zone margin sits on a band boundary").toBe(false);
        for (const seed of SEEDS.slice(0, 20)) {
          const rolled = resolveZoneCoverage({ tunables: TUNABLES, receiver, defender, coverageRng: createRng(seed, "zone") });
          expect(rolled.margin - rolled.roll.raw + D100_MEAN, seed).toBe(typical.margin);
        }
      }
    }
  });

  it("a better defender never raises what the receiver can expect", () => {
    const s = buildZoneScenario();
    const { intermediate } = baseReceivers(s);
    const { cb2 } = defendersOf(s);
    const receiver = player(s, intermediate);
    let lastMan = Number.POSITIVE_INFINITY;
    let lastZone = Number.POSITIVE_INFINITY;
    for (let rating = 20; rating <= 99; rating += 1) {
      const players = withRating(withRating(s.state.players, cb2, "manCoverage", rating), cb2, "zoneCoverage", rating);
      const defender = players[cb2 as unknown as string];
      if (defender === undefined) throw new Error("bad fixture");
      const man = typicalManCoverage(TUNABLES, receiver, defender).openness;
      const zone = typicalZoneCoverage(TUNABLES, receiver, defender).openness;
      expect(man, `man at ${String(rating)}`).toBeLessThanOrEqual(lastMan);
      expect(zone, `zone at ${String(rating)}`).toBeLessThanOrEqual(lastZone);
      lastMan = man;
      lastZone = zone;
    }
  });
});

describe("ADR-070 §3 — a look can hide an open man", () => {
  it("a zone defender shown over a hole: fooled, he is read last and read low", () => {
    // The shallow cross breaks into LH/SHORT, which nobody plays. The backer SHOWS that cell.
    const base = buildZoneScenario();
    const { quick } = baseReceivers(base);
    const { lb } = defendersOf(base);
    const shown = base.calls.defense.assignments.map((a) =>
      a.defender === lb ? ({ kind: "ZONE", defender: lb, zone: { horizontal: "LH", vertical: "SHORT" } } as const) : a,
    );
    const counts = exerciseHiddenMan(
      withShown(base, shown),
      quick,
      "Coverage misread: the shown look had a zone defender on him (ADR-070)",
    );
    expect(counts.fooled, "no seed produced a misread").toBeGreaterThan(0);
    expect(counts.skewedReads, "fooled plays, but no read of the hidden man was skewed").toBeGreaterThan(0);
    expect(counts.sees, "no seed produced a read that saw through it").toBeGreaterThan(0);
    expect(counts.neither, "no seed produced an adequate or partial read").toBeGreaterThan(0);
  });

  it("a man shown pressing a receiver nobody plays (Press, at the engine): the misread names the man", () => {
    // The flat's corner bails to a deep zone at the snap, and nobody else plays RW/SHORT.
    const base = buildMixedCoverageScenario();
    const flat = flatReceiverOf(base);
    const corner = base.calls.defense.assignments.find((a) => a.kind === "MAN")?.defender;
    if (corner === undefined) throw new Error("bad fixture");
    const played: Assignments = base.calls.defense.assignments.map((a) =>
      a.defender === corner ? ({ kind: "ZONE", defender: corner, zone: { horizontal: "RW", vertical: "DEEP" } } as const) : a,
    );
    const shown: Assignments = base.calls.defense.assignments.map((a) =>
      a.defender === corner ? ({ kind: "MAN", defender: corner, covers: flat, technique: "PRESS" } as const) : a,
    );
    const counts = exerciseHiddenMan(
      withShown(base, shown, played),
      flat,
      "Coverage misread: the shown look had a man on him (ADR-070)",
    );
    expect(counts.fooled).toBeGreaterThan(0);
    expect(counts.skewedReads).toBeGreaterThan(0);
    expect(counts.sees).toBeGreaterThan(0);
    expect(counts.neither).toBeGreaterThan(0);

    // The lie is in his eyes, not on the field: the flat is a hole, so no coverage contest
    // is ever rolled on him, whatever he was shown.
    const s = withShown(base, shown, played);
    for (const seed of SEEDS.slice(0, 60)) {
      for (const e of simulatePassPlay(s.state, s.calls, seed).events) {
        if (e.event.type !== "CHECK") continue;
        const p = payload(e) as { checkKind: string; actors: readonly unknown[] };
        if (p.checkKind === "man_coverage" || p.checkKind === "zone_coverage") {
          expect(p.actors.map(String), seed).not.toContain(String(flat));
        }
      }
    }
  });

  it("shown one defender and played another: the stronger man shown hides, the weaker one traps", () => {
    // Swap the two corners' zones in the look. The Go is SHOWN the weak corner and played by
    // the strong one (a trap); the Dig is shown the strong corner and played by the weak one
    // (a hidden man). Ratings far apart, so the two typical reps cannot share a band.
    const base = buildZoneScenario();
    const { deep, intermediate } = baseReceivers(base);
    const { cb1, cb2 } = defendersOf(base);
    const players = withRating(withRating(base.state.players, cb1, "zoneCoverage", 99), cb2, "zoneCoverage", 20);
    const rated: Scenario = { ...base, state: { ...base.state, players } };
    const played = rated.calls.defense.assignments;
    const zoneOf = (id: PlayerId) => {
      const a = played.find((x) => x.defender === id);
      if (a === undefined || a.kind !== "ZONE") throw new Error("bad fixture");
      return a.zone;
    };
    const shown: Assignments = played.map((a) =>
      a.defender === cb1
        ? ({ kind: "ZONE", defender: cb1, zone: zoneOf(cb2) } as const)
        : a.defender === cb2
          ? ({ kind: "ZONE", defender: cb2, zone: zoneOf(cb1) } as const)
          : a,
    );
    const s = withShown(rated, shown);
    let fooled = 0;
    let sees = 0;
    for (const seed of SEEDS) {
      const { events } = simulatePassPlay(s.state, s.calls, seed);
      const reads = coverageReads(events);
      expect(reads, seed).toHaveLength(1);
      const band = String((reads[0] as { band: unknown }).band);
      const order = readOrderOf(events);
      if (FOOLED.has(band)) {
        fooled += 1;
        expect(order[0], seed).toBe(String(deep));
        expect(order[order.length - 1], seed).toBe(String(intermediate));
        for (const m of misreadsOf(events, deep)) expect(m.value, seed).toBeGreaterThanOrEqual(0);
        for (const m of misreadsOf(events, intermediate)) expect(m.value, seed).toBeLessThanOrEqual(0);
      } else if (SEES.has(band)) {
        sees += 1;
        expect(order[0], seed).toBe(String(intermediate));
        expect(order[order.length - 1], seed).toBe(String(deep));
      }
    }
    expect(fooled).toBeGreaterThan(0);
    expect(sees).toBeGreaterThan(0);
  });

  it("a look that moves a man without changing what anyone expects rolls no read (ADR-005)", () => {
    // The Go's corner shown a band deeper, still over the Go: the same man on the same route.
    // And the backer shown in a cell no route breaks into, from one no route breaks into.
    const base = buildZoneScenario();
    const { cb1, lb } = defendersOf(base);
    const shown: Assignments = base.calls.defense.assignments.map((a) =>
      a.defender === cb1
        ? ({ kind: "ZONE", defender: cb1, zone: { horizontal: "RW", vertical: "VERY_DEEP" }, depthSpan: 1 } as const)
        : a.defender === lb
          ? ({ kind: "ZONE", defender: lb, zone: { horizontal: "RH", vertical: "INTERMEDIATE" } } as const)
          : a,
    );
    const s = withShown(base, shown);
    expect(s.calls.defense.shownAssignments).not.toBe(s.calls.defense.assignments);
    for (const seed of SEEDS.slice(0, 60)) {
      expect(coverageReads(simulatePassPlay(s.state, s.calls, seed).events), seed).toEqual([]);
    }
  });

  it("is reproducible: the same seed gives the same stream with a hidden man", () => {
    const base = buildZoneScenario();
    const { lb } = defendersOf(base);
    const shown = base.calls.defense.assignments.map((a) =>
      a.defender === lb ? ({ kind: "ZONE", defender: lb, zone: { horizontal: "LH", vertical: "SHORT" } } as const) : a,
    );
    const a = withShown(base, shown);
    const b = withShown(buildZoneScenario(), shown);
    expect(JSON.stringify(simulatePassPlay(b.state, b.calls, "adr-070-det").events)).toBe(
      JSON.stringify(simulatePassPlay(a.state, a.calls, "adr-070-det").events),
    );
  });
});
