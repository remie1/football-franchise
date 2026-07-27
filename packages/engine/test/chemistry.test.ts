/**
 * ADR-008 — chemistry as a real input, end to end.
 *
 * The load-bearing assertion in this file is the NO-OP one: an engine that
 * behaves differently when handed an absent chemistry table has broken the
 * migration promise the ADR was ratified on ("absent table ⇒ every pair reads
 * 50 ⇒ today's behaviour exactly"). Everything else is about the two doc lines
 * that were recorded and inert since the vertical slice finally firing.
 */
import { createRng } from "@ff/contracts";
import type { ChemistryTable } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import {
  chemistryEstablished,
  chemistryLevel,
  chemistrySupportsBackShoulder,
} from "../src/chemistry.js";
import { resolveAccuracy } from "../src/resolve/throwExecution.js";
import { simulatePassPlay } from "../src/index.js";
import { TUNABLES } from "../src/tunables.js";
import type { MatchGameState } from "../src/types.js";
import { buildCleanPocketScenario, buildScenario, makePlayer } from "./fixtures.js";

const QB = makePlayer("qb-chem", "Passer", "QB", { accuracy: 84, poise: 80, armStrength: 86 });

function tableFor(receiver: string, level: number): ChemistryTable {
  return { [QB.bio.id as unknown as string]: { [receiver]: level } };
}

describe("ADR-008 — the read path degrades to neutral, always", () => {
  const neutral = TUNABLES.chemistry.neutralLevel;

  it("an absent table reads neutral", () => {
    expect(chemistryLevel(undefined, QB.bio.id, QB.bio.id)).toBe(neutral);
  });

  it("a table with no row for this passer reads neutral", () => {
    expect(chemistryLevel({ other: { x: 99 } }, QB.bio.id, QB.bio.id)).toBe(neutral);
  });

  it("a row with no entry for this receiver reads neutral", () => {
    expect(chemistryLevel(tableFor("someone-else", 99), QB.bio.id, QB.bio.id)).toBe(neutral);
  });

  it("a real pair reads its own level", () => {
    expect(chemistryLevel(tableFor(String(QB.bio.id), 88), QB.bio.id, QB.bio.id)).toBe(88);
  });
});

describe("ADR-008 — §10.4's '+5 chemistry with receiver' is live", () => {
  const accuracy = (chemistryLevel?: number): ReturnType<typeof resolveAccuracy> =>
    resolveAccuracy({
      qb: QB,
      airYards: 14,
      throwType: "BULLET",
      pocket: "CLEAN",
      armShortfall: false,
      ...(chemistryLevel === undefined ? {} : { chemistryLevel }),
      throwRng: createRng("acc", "throw"),
    });

  it("pays out exactly the doc's +5, above the threshold", () => {
    const mod = accuracy(90).roll.modifiers.find((m) => m.source.startsWith("Chemistry with receiver"));
    expect(mod?.value).toBe(5);
    expect(TUNABLES.chemistry.establishedAccuracyBonus).toBe(5);
  });

  it("a neutral or unfamiliar pairing gets nothing", () => {
    for (const level of [undefined, TUNABLES.chemistry.neutralLevel, 20]) {
      const sources = accuracy(level).roll.modifiers.map((m) => m.source);
      expect(sources.some((s) => s.startsWith("Chemistry with receiver"))).toBe(false);
    }
  });

  it("the threshold is a real threshold, not a rename of neutral", () => {
    expect(TUNABLES.chemistry.establishedThreshold).toBeGreaterThan(TUNABLES.chemistry.neutralLevel);
    expect(chemistryEstablished(TUNABLES.chemistry.establishedThreshold)).toBe(true);
    expect(chemistryEstablished(TUNABLES.chemistry.establishedThreshold - 1)).toBe(false);
  });
});

describe("ADR-008 — §10.2's back-shoulder −10 is wired and dormant", () => {
  it("the penalty exists and applies to a BACK_SHOULDER throw without chemistry", () => {
    const out = resolveAccuracy({
      qb: QB,
      airYards: 14,
      throwType: "BACK_SHOULDER",
      pocket: "CLEAN",
      armShortfall: false,
      chemistryLevel: 20,
      throwRng: createRng("bs", "throw"),
    });
    const mod = out.roll.modifiers.find((m) => m.source.includes("Back shoulder without chemistry"));
    expect(mod?.value).toBe(-10);
  });

  it("...and vanishes when the pairing has the chemistry the throw requires", () => {
    const out = resolveAccuracy({
      qb: QB,
      airYards: 14,
      throwType: "BACK_SHOULDER",
      pocket: "CLEAN",
      armShortfall: false,
      chemistryLevel: 90,
      throwRng: createRng("bs", "throw"),
    });
    expect(out.roll.modifiers.some((m) => m.source.includes("Back shoulder"))).toBe(false);
    expect(chemistrySupportsBackShoulder(90)).toBe(true);
  });

  it("DORMANT: nothing in the engine selects a BACK_SHOULDER throw yet", () => {
    // §10.2's selection rule has no back-shoulder branch. The term above is
    // reachable only through the resolver's own argument, which is exactly the
    // state ADR-008 asked for: correct on the day the branch exists.
    let backShoulders = 0;
    for (let i = 0; i < 300; i++) {
      const { state, calls } = buildScenario();
      const { events } = simulatePassPlay(state, calls, `bs-${i}`);
      for (const { event } of events) {
        if (event.type === "THROW" && event.payload.throwType === "BACK_SHOULDER") backShoulders += 1;
      }
    }
    expect(backShoulders).toBe(0);
  });
});

describe("ADR-008 — over real event streams", () => {
  const withChemistry = (state: MatchGameState, level: number): MatchGameState => {
    const row: Record<string, number> = {};
    for (const id of Object.keys(state.players)) row[id] = level;
    return { ...state, chemistry: { [state.quarterback as unknown as string]: row } };
  };

  it("MIGRATION IS A NO-OP: an all-neutral table is byte-identical to no table", () => {
    for (let i = 0; i < 60; i++) {
      const { state, calls } = buildScenario();
      const bare = simulatePassPlay(state, calls, `noop-${i}`);
      const neutral = simulatePassPlay(
        withChemistry(state, TUNABLES.chemistry.neutralLevel),
        calls,
        `noop-${i}`,
      );
      expect(JSON.stringify(neutral.events)).toBe(JSON.stringify(bare.events));
    }
  });

  it("a partnership shows up in the stream as a named modifier on both rolls", () => {
    let anticipationTerms = 0;
    let accuracyTerms = 0;
    for (let i = 0; i < 200; i++) {
      const { state, calls } = buildCleanPocketScenario();
      const { events } = simulatePassPlay(withChemistry(state, 95), calls, `pair-${i}`);
      for (const { event } of events) {
        if (event.type !== "CHECK") continue;
        const sources = event.payload.roll.modifiers.map((m) => m.source);
        if (event.payload.checkKind === "anticipation") {
          if (sources.some((s) => s.startsWith("QB/receiver chemistry"))) anticipationTerms += 1;
        }
        if (event.payload.checkKind === "accuracy") {
          if (sources.some((s) => s.startsWith("Chemistry with receiver"))) accuracyTerms += 1;
        }
      }
    }
    expect(anticipationTerms).toBeGreaterThan(0);
    expect(accuracyTerms).toBeGreaterThan(0);
  });

  it("the engine never writes chemistry back — it is franchise's state", () => {
    const { state, calls } = buildScenario();
    const withPairs = withChemistry(state, 80);
    const before = JSON.stringify(withPairs.chemistry);
    const { newState } = simulatePassPlay(withPairs, calls, "readonly");
    expect(JSON.stringify(withPairs.chemistry)).toBe(before);
    expect(JSON.stringify(newState.chemistry)).toBe(before);
  });
});
