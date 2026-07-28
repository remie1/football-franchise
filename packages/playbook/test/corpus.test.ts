/**
 * CORPUS-WIDE PROPERTIES.
 *
 * The most important test in the package is `every route states a break lane`,
 * because that is `CALIBRATION-BACKLOG.md` entry 8 closing. The second most
 * important is the full offence x defence cross product, because a corpus whose
 * cards only work against the cards they were written next to is a fixture set with
 * more entries.
 */
import { describe, expect, it } from "vitest";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";
import { FORMATIONS } from "../src/formations.js";
import { instantiateDefense, instantiatePass, instantiateRun } from "../src/instantiate.js";
import { PASS_CONCEPTS, protectionCapacity } from "../src/passConcepts.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { RUN_CONCEPTS } from "../src/runConcepts.js";
import { rusherCount } from "../src/defense.js";
import { UnprotectableCallError } from "../src/errors.js";
import {
  errorsOnly,
  validateDefensiveCard,
  validateFormation,
  validatePassConcept,
  validateRunConcept,
} from "../src/validate.js";
import { DEEP_CHART, checkCoherence } from "./fixtures.js";

describe("every card in the corpus is valid", () => {
  it.each(FORMATIONS.map((f) => [f.id, f] as const))("formation %s", (_id, formation) => {
    expect(errorsOnly(validateFormation(formation))).toEqual([]);
  });

  it.each(PASS_CONCEPTS.map((c) => [c.id, c] as const))("pass concept %s", (_id, concept) => {
    expect(errorsOnly(validatePassConcept(concept))).toEqual([]);
  });

  it.each(RUN_CONCEPTS.map((c) => [c.id, c] as const))("run concept %s", (_id, concept) => {
    expect(errorsOnly(validateRunConcept(concept))).toEqual([]);
  });

  it.each(DEFENSIVE_CARDS.map((c) => [c.id, c] as const))("defensive card %s", (_id, card) => {
    expect(errorsOnly(validateDefensiveCard(card))).toEqual([]);
  });
});

describe("horizontal placement — CALIBRATION-BACKLOG entry 8", () => {
  it("states a break lane on every route in the corpus, with none omitted", () => {
    let routes = 0;
    for (const concept of PASS_CONCEPTS) {
      for (const spec of Object.values(concept.routes)) {
        expect(spec.breakZone.horizontal).toBeDefined();
        routes += 1;
      }
    }
    expect(routes).toBeGreaterThan(100);
  });

  it("does not put every route in one lane, which is the failure entry 8 describes", () => {
    const lanes = new Map<string, number>();
    for (const concept of PASS_CONCEPTS) {
      for (const spec of Object.values(concept.routes)) {
        lanes.set(spec.breakZone.horizontal, (lanes.get(spec.breakZone.horizontal) ?? 0) + 1);
      }
    }
    expect(lanes.size).toBe(5);
    const total = [...lanes.values()].reduce((a, b) => a + b, 0);
    for (const [, count] of lanes) {
      // No lane may hold more than half the corpus's routes, and none may be empty.
      expect(count).toBeGreaterThan(0);
      expect(count / total).toBeLessThan(0.5);
    }
  });

  it("uses the whole depth grid the routes can reach", () => {
    const bands = new Set<string>();
    for (const concept of PASS_CONCEPTS) {
      for (const spec of Object.values(concept.routes)) bands.add(spec.breakZone.vertical);
    }
    // VERY_DEEP needs 35+ air yards, which no real concept in the corpus throws.
    expect([...bands].sort()).toEqual(["BACKFIELD", "DEEP", "INTERMEDIATE", "SHORT"]);
  });
});

describe("the cross product — every offensive card against every defensive card", () => {
  const pairs = PASS_CONCEPTS.flatMap((offense) =>
    DEFENSIVE_CARDS.map((defense) => [offense, defense] as const),
  );

  it.each(pairs.map(([o, d]) => [`${o.id} vs ${d.id}`, o, d] as const))(
    "%s",
    (_label, concept, card) => {
      const offenseUnit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
      const defense = instantiateDefense(card, defenseUnit, {
        formation: concept.formation,
        unit: offenseUnit,
      });

      // A card that cannot absorb the pressure must FAIL LOUDLY, not quietly.
      if (rusherCount(card) > protectionCapacity(concept)) {
        expect(() => instantiatePass(concept, offenseUnit, defense)).toThrow(UnprotectableCallError);
        return;
      }
      const offense = instantiatePass(concept, offenseUnit, defense);
      const quarterback = offenseUnit.QB;
      expect(quarterback).toBeDefined();
      if (quarterback === undefined) return;
      expect(checkCoherence(quarterback, offense.call, defense.call).problems).toEqual([]);
    },
  );

  const runPairs = RUN_CONCEPTS.flatMap((offense) =>
    DEFENSIVE_CARDS.map((defense) => [offense, defense] as const),
  );

  it.each(runPairs.map(([o, d]) => [`${o.id} vs ${d.id}`, o, d] as const))(
    "%s",
    (_label, concept, card) => {
      const offenseUnit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
      const defense = instantiateDefense(card, defenseUnit, {
        formation: concept.formation,
        unit: offenseUnit,
      });
      const offense = instantiateRun(concept, offenseUnit, defense);
      const quarterback = offenseUnit.QB;
      expect(quarterback).toBeDefined();
      if (quarterback === undefined) return;
      expect(checkCoherence(quarterback, offense.call, defense.call).problems).toEqual([]);
    },
  );
});

/**
 * THE MEASUREMENT ENTRY 8 ASKED FOR.
 *
 * "Zone-coverage metrics currently describe the fixture rather than the mechanic."
 * With horizontal placement on every route and zone defenders placed on the cells
 * routes actually break into, this is the first time the question "what fraction of
 * routes does a defensive call actually reach?" has an answer. The floor is
 * asserted so a future corpus edit that quietly stops covering anybody fails here.
 */
describe("coverage reach", () => {
  it("reaches a realistic share of routes, and states the number", () => {
    let routes = 0;
    let covered = 0;
    for (const concept of PASS_CONCEPTS) {
      const offenseUnit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      for (const card of DEFENSIVE_CARDS) {
        const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
        const defense = instantiateDefense(card, defenseUnit, {
          formation: concept.formation,
          unit: offenseUnit,
        });
        if (rusherCount(card) > protectionCapacity(concept)) continue;
        const offense = instantiatePass(concept, offenseUnit, defense);
        if (offense.call.kind !== "PASS") continue;
        for (const assignment of offense.call.routes) {
          routes += 1;
          const manned = defense.call.assignments.some(
            (a) => a.kind === "MAN" && a.covers === assignment.receiver,
          );
          const zoned = defense.call.assignments.some(
            (a) =>
              a.kind === "ZONE" &&
              assignment.breakZone !== undefined &&
              a.zone.horizontal === assignment.breakZone.horizontal &&
              a.zone.vertical === assignment.breakZone.vertical,
          );
          if (manned || zoned) covered += 1;
        }
      }
    }
    const rate = covered / routes;
    // Recorded rather than merely asserted: this is the corpus's honest statement
    // about how much of the §3 grid a defensive card can actually occupy, given
    // that `ZoneAssignment` covers exactly one of twenty-five cells (ADR-018).
    expect(routes).toBeGreaterThan(1000);
    expect(rate).toBeGreaterThan(0.45);
    expect(rate).toBeLessThan(0.95);
  });
});

describe("personnel binding", () => {
  it("refuses to fake a personnel grouping the roster cannot field", () => {
    expect(() => buildOffensiveUnit("13", { QB: [], WR: [], TE: [] })).toThrow(
      /no available player for role/,
    );
  });

  it("never puts the same player on the field twice", () => {
    for (const concept of PASS_CONCEPTS) {
      const unit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      const ids = Object.values(unit).map(String);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toHaveLength(11);
    }
    for (const card of DEFENSIVE_CARDS) {
      const unit = buildDefensiveUnit(card.personnel, DEEP_CHART);
      const ids = Object.values(unit).map(String);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toHaveLength(11);
    }
  });
});
