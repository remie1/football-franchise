/**
 * ADR-068 step 1 — §5.1's coverage read, and the one decision it drives.
 *
 * The fixture is the zone scenario with one lie added: the defender who plays the dig's
 * cell SHOWS a deep zone on the far side, so the shown look leaves the dig alone. That
 * receiver is the TRAP. What is asserted:
 *
 *   - no read is rolled when the shown look is the played one (ADR-005), on every
 *     undisguised fixture;
 *   - with a trap, exactly one `coverage_read` is rolled per play, against
 *     `50 + §5.1 complexity`, and lands on one of §5.1's six rows;
 *   - FOOLED (misread rows): the trap leads the progression, and every in-structure read
 *     of him carries the named misread modifier — while the coverage contest still names
 *     the defender who was really there;
 *   - SEES THROUGH (good/perfect rows): the trap goes to the back, and no read is skewed;
 *   - the rows in between leave the progression exactly as called.
 *
 * Every branch is required to have been reached, so a fixture that stopped producing a
 * band cannot pass by never testing it.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope, PlayerId } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { TUNABLES } from "../src/tunables.js";
import type { PlayCalls } from "../src/types.js";
import {
  baseReceivers,
  buildMixedCoverageScenario,
  buildScenario,
  buildZoneScenario,
  type Scenario,
} from "./fixtures.js";

const SEEDS = Array.from({ length: 300 }, (_, i) => `adr-068-step1-${String(i)}`);

/** The zone scenario, with the dig's defender showing a deep zone on the far side. */
function disguisedZoneScenario(): Scenario & { readonly trap: PlayerId; readonly trapDefender: PlayerId } {
  const base = buildZoneScenario();
  const { intermediate } = baseReceivers(base);
  const played = base.calls.defense.assignments;
  const digDefender = played[1]?.defender;
  if (digDefender === undefined) throw new Error("bad fixture");
  const shown: PlayCalls["defense"]["assignments"] = played.map((a) =>
    a.defender === digDefender ? { kind: "ZONE", defender: a.defender, zone: { horizontal: "LW", vertical: "DEEP" } } : a,
  );
  return {
    ...base,
    calls: {
      ...base.calls,
      defense: { ...base.calls.defense, shownAssignments: shown, coverageDisguise: "ROTATED" },
    },
    trap: intermediate,
    trapDefender: digDefender,
  };
}

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

function misreadReadsOf(events: readonly MatchEventEnvelope[], receiver: PlayerId): { skewed: number; total: number } {
  let skewed = 0;
  let total = 0;
  for (const e of events) {
    if (e.event.type !== "QB_READ") continue;
    const p = payload(e) as { target: unknown; varianceRoll: { modifiers: readonly { source: string }[] } };
    if (String(p.target) !== String(receiver)) continue;
    total += 1;
    if (p.varianceRoll.modifiers.some((m) => m.source.startsWith("Coverage misread"))) skewed += 1;
  }
  return { skewed, total };
}

const FOOLED: ReadonlySet<string> = new Set(TUNABLES.presnap.coverageRead.bands.filter((b) => b.fooled).map((b) => b.label));
const SEES: ReadonlySet<string> = new Set(TUNABLES.presnap.coverageRead.bands.filter((b) => b.seesThrough).map((b) => b.label));
const LABELS: ReadonlySet<string> = new Set(TUNABLES.presnap.coverageRead.bands.map((b) => b.label));

describe("ADR-068 step 1 — the coverage read", () => {
  it.each([
    ["man", buildScenario],
    ["zone", buildZoneScenario],
    ["mixed", buildMixedCoverageScenario],
  ] as const)("rolls nothing when the shown look is the played one (%s)", (_, build) => {
    for (const seed of SEEDS.slice(0, 60)) {
      const s = build();
      expect(coverageReads(simulatePassPlay(s.state, s.calls, seed).events), seed).toEqual([]);
    }
  });

  it("rolls once per play against 50 + §5.1 complexity, and acts on the band", () => {
    const undisguised = buildZoneScenario();
    const calledOrder = readOrderOf(simulatePassPlay(undisguised.state, undisguised.calls, SEEDS[0] ?? "x").events);
    const counts = { fooled: 0, sees: 0, neither: 0, skewedReads: 0 };

    for (const seed of SEEDS) {
      const s = disguisedZoneScenario();
      const { events } = simulatePassPlay(s.state, s.calls, seed);
      const reads = coverageReads(events);
      expect(reads, seed).toHaveLength(1);
      const read = reads[0] as { target: number; band: string };
      expect(read.target).toBe(TUNABLES.presnap.coverageRead.target + TUNABLES.presnap.coverageRead.complexity.ROTATED);
      expect(LABELS.has(read.band), `${seed}: ${read.band}`).toBe(true);

      const order = readOrderOf(events);
      const trap = String(s.trap);
      const misread = misreadReadsOf(events, s.trap);

      if (FOOLED.has(read.band)) {
        counts.fooled += 1;
        expect(order[0], `${seed}: a fooled QB leads with the shown hole`).toBe(trap);
        // Per play he may never get to read the trap (a sack first, a scramble); across
        // the fooled plays he must, or the misperception never reached a read at all.
        counts.skewedReads += misread.skewed;
      } else if (SEES.has(read.band)) {
        counts.sees += 1;
        expect(order[order.length - 1], `${seed}: a QB who saw through it reads the trap last`).toBe(trap);
        expect(misread.skewed, seed).toBe(0);
      } else {
        counts.neither += 1;
        expect(order, `${seed}: ${read.band} leaves the progression as called`).toEqual(calledOrder);
        expect(misread.skewed, seed).toBe(0);
      }

      // The lie is in his eyes, not on the field: the dig's coverage contest is still
      // against the defender who actually plays that cell.
      for (const e of events) {
        if (e.event.type !== "CHECK") continue;
        const p = payload(e) as { checkKind: string; actors: readonly unknown[] };
        if (p.checkKind !== "zone_coverage" || !p.actors.map(String).includes(trap)) continue;
        expect(p.actors.map(String), seed).toContain(String(s.trapDefender));
      }
    }

    expect(counts.fooled, "no seed produced a misread").toBeGreaterThan(0);
    expect(counts.skewedReads, "fooled plays, but no read of the trap carried the misread").toBeGreaterThan(0);
    expect(counts.sees, "no seed produced a read that saw through it").toBeGreaterThan(0);
    expect(counts.neither, "no seed produced an adequate or partial read").toBeGreaterThan(0);
  });

  it("is reproducible: the same seed gives the same stream with the disguise on", () => {
    const a = disguisedZoneScenario();
    const b = disguisedZoneScenario();
    expect(JSON.stringify(simulatePassPlay(b.state, b.calls, "adr-068-det").events)).toBe(
      JSON.stringify(simulatePassPlay(a.state, a.calls, "adr-068-det").events),
    );
  });
});
