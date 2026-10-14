/**
 * ADR-067 §C — `CoverageAssignment.runFit` IS CARRIED, NOT READ.
 *
 * The fit crosses into the call so the stream and a later consumer can see it; nothing in this
 * package may act on it yet. The claim is checked by running plays, not by searching source:
 * every fixture's coverage gets a fit on every assignment, both versions are simulated on the
 * same seeds, and the streams must be identical once the fit itself is removed from the
 * published `assignments`/`shownAssignments`. A fit that moved a single roll, branch or
 * ordering anywhere in the play would show up as a difference.
 *
 * The fit is varied per assignment (gap and side cycle) so that a reader keyed on a particular
 * gap or side cannot hide behind a uniform value. Pass and run sims are both covered, since
 * both publish the assignments.
 */
import { describe, expect, it } from "vitest";
import type {
  CoverageAssignment,
  DefensivePlayCall,
  MatchEventEnvelope,
  RunFit,
} from "@ff/contracts";
import { simulatePassPlay, simulateRunPlay } from "../src/index.js";
import {
  buildMixedCoverageScenario,
  buildRunScenario,
  buildScenario,
  buildZoneScenario,
} from "./fixtures.js";

const FITS: readonly RunFit[] = [
  { gap: "A", side: "LEFT" },
  { gap: "B", side: "RIGHT" },
  { gap: "C", side: "LEFT" },
  { gap: "D", side: "RIGHT" },
];

/** The same call with a fit on every assignment, shown and played still one array (§A). */
function withFits(defense: DefensivePlayCall): DefensivePlayCall {
  const assignments: CoverageAssignment[] = defense.assignments.map((a, i) => ({
    ...a,
    runFit: FITS[i % FITS.length] as RunFit,
  }));
  return { ...defense, assignments, shownAssignments: assignments };
}

/** The stream with every published `runFit` removed — the only place the fit may appear. */
function withoutFits(events: readonly MatchEventEnvelope[]): string {
  return JSON.stringify(events, (key, value: unknown) => (key === "runFit" ? undefined : value));
}

function fitsPublished(events: readonly MatchEventEnvelope[]): number {
  return (JSON.stringify(events).match(/"runFit":/g) ?? []).length;
}

const SEEDS = Array.from({ length: 40 }, (_, i) => `adr-067-c-${String(i)}`);

describe("ADR-067 §C — a run fit on the coverage call changes nothing the engine does", () => {
  it.each([
    ["man", buildScenario],
    ["zone", buildZoneScenario],
    ["mixed", buildMixedCoverageScenario],
  ] as const)("pass play, %s coverage: identical stream apart from the fit itself", (_, build) => {
    let published = 0;
    for (const seed of SEEDS) {
      const plain = build();
      const fitted = build();
      expect(fitted.calls.defense.assignments.length, "fixture has no coverage to fit").toBeGreaterThan(0);
      const a = simulatePassPlay(plain.state, plain.calls, seed);
      const b = simulatePassPlay(
        fitted.state,
        { ...fitted.calls, defense: withFits(fitted.calls.defense) },
        seed,
      );
      published += fitsPublished(b.events);
      expect(withoutFits(b.events), `seed ${seed}`).toBe(withoutFits(a.events));
      expect(JSON.stringify(b.newState), `seed ${seed}`).toBe(JSON.stringify(a.newState));
    }
    // Non-vacuity: the fit must actually have reached the stream, or this compared two plain plays.
    expect(published, "no runFit reached the stream — the fitted call was never simulated").toBeGreaterThan(0);
  });

  it.each([["ZONE"], ["GAP"]] as const)("run play, %s scheme: identical stream apart from the fit itself", (scheme) => {
    let published = 0;
    for (const seed of SEEDS) {
      const plain = buildRunScenario(scheme);
      const fitted = buildRunScenario(scheme);
      expect(fitted.calls.defense.assignments.length, "fixture has no coverage to fit").toBeGreaterThan(0);
      const a = simulateRunPlay(plain.state, plain.calls, seed);
      const b = simulateRunPlay(
        fitted.state,
        { ...fitted.calls, defense: withFits(fitted.calls.defense) },
        seed,
      );
      published += fitsPublished(b.events);
      expect(withoutFits(b.events), `seed ${seed}`).toBe(withoutFits(a.events));
      expect(JSON.stringify(b.newState), `seed ${seed}`).toBe(JSON.stringify(a.newState));
    }
    expect(published, "no runFit reached the stream — the fitted call was never simulated").toBeGreaterThan(0);
  });
});
