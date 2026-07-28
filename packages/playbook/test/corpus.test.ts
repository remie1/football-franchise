/**
 * CORPUS-WIDE PROPERTIES.
 *
 * The most important test in the package is `every route states a break lane`,
 * because that is `CALIBRATION-BACKLOG.md` entry 8's stated cause closing. The second
 * most important is the full offence x defence cross product, because a corpus whose
 * cards only work against the cards they were written next to is a fixture set with
 * more entries.
 *
 * The coverage-reach block at the bottom is the one to read before quoting a number
 * out of this package. It explains why 85.8% is a better-DEFINED measurement than the
 * 66.7% it replaces and a worse GRADE than either of them looks.
 */
import { describe, expect, it } from "vitest";
import { regionCovers } from "../src/coverage.js";
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
 * ================= COVERAGE REACH, AND WHAT IT NOW MEANS =================
 *
 * The number moved from **66.7% to 85.8%** when zones became regions, and the
 * important thing about that is NOT that it went up.
 *
 * **The two numbers measure different things.** With one-cell zones, "covered" meant
 * a route broke into the exact cell a defender was standing in — COINCIDENCE, and
 * mostly a property of how well one author matched his own two card sets. With
 * regions it means some defender is RESPONSIBLE for the area the route broke into,
 * which is a fact the card states and a reader can check. The second is a real
 * measurement; the first was an artefact. That is the improvement, and it is a
 * change of definition rather than an improvement in the defence.
 *
 * **It is a worse grade than it looks, and in one specific way it is backwards.** A
 * zone shell divides the field between its defenders, so a competent shell is
 * responsible for nearly all of it and the union tends toward one. Worse: the FEWER
 * defenders drop, the WIDER each region has to be, so a three-under fire zone is
 * responsible for more of the field per man than a four-under Cover 3 and therefore
 * scores HIGHER on reach while being easier to throw against. Reach is a coverage
 * inventory, not a coverage quality. Anything that grades a defence has to weigh how
 * much ground each responsible man has, and that is a mechanic the engine owns.
 *
 * So what these tests assert is the thing the corpus can actually be responsible
 * for: that the shells DIFFER, that the holes are where the football says they
 * should be, and that nothing has quietly become uniform padding.
 */
describe("coverage reach", () => {
  interface Reach {
    routes: number;
    covered: number;
    manned: number;
    zoned: number;
    zoneDefenders: number;
  }
  const empty = (): Reach => ({ routes: 0, covered: 0, manned: 0, zoned: 0, zoneDefenders: 0 });

  const total = empty();
  const byFamily = new Map<string, Reach>();
  const uncovered = new Map<string, number>();

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
      const family = byFamily.get(card.family) ?? empty();
      byFamily.set(card.family, family);
      for (const assignment of offense.call.routes) {
        const manned = defense.call.assignments.some(
          (a) => a.kind === "MAN" && a.covers === assignment.receiver,
        );
        // The span test, run against exactly what the engine receives — spans
        // optional, absent meaning nought (ADR-018).
        const zoneDefenders = defense.call.assignments.filter(
          (a) =>
            a.kind === "ZONE" &&
            assignment.breakZone !== undefined &&
            regionCovers(a, assignment.breakZone),
        ).length;
        for (const bucket of [total, family]) {
          bucket.routes += 1;
          bucket.zoneDefenders += zoneDefenders;
          if (manned) bucket.manned += 1;
          if (zoneDefenders > 0) bucket.zoned += 1;
          if (manned || zoneDefenders > 0) bucket.covered += 1;
        }
        if (!manned && zoneDefenders === 0 && assignment.breakZone !== undefined) {
          const cell = `${assignment.breakZone.horizontal}-${assignment.breakZone.vertical}`;
          uncovered.set(cell, (uncovered.get(cell) ?? 0) + 1);
        }
      }
    }
  }

  it("states the number: 85.8% of routes break into a manned or zoned area", () => {
    expect(total.routes).toBeGreaterThan(2000);
    const rate = total.covered / total.routes;
    expect(rate).toBeGreaterThan(0.82);
    expect(rate).toBeLessThan(0.9);
    // 34.7% man, 57.7% zone. They overlap: a manned receiver can break into a zone.
    expect(total.manned / total.routes).toBeGreaterThan(0.3);
    expect(total.zoned / total.routes).toBeGreaterThan(0.5);
  });

  it("does not cover everything, which a padded corpus would", () => {
    // 1.15 zone defenders per route across the whole cross product. If a future edit
    // widens spans to make a metric look good this is where it shows up first.
    expect(total.zoneDefenders / total.routes).toBeLessThan(1.5);
    expect(total.covered).toBeLessThan(total.routes);
  });

  /**
   * THE ASSERTION THAT MATTERS. If every shell reached the same share, the number
   * would be a property of the grid rather than of the football, and the fact that
   * it rose would mean nothing at all.
   */
  it("discriminates between coverage families rather than covering uniformly", () => {
    const rates = [...byFamily].map(([family, r]) => [family, r.covered / r.routes] as const);
    expect(rates.length).toBeGreaterThan(8);
    const values = rates.map(([, rate]) => rate);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.25);

    const rateOf = (family: string): number =>
      rates.find(([f]) => f === family)?.[1] ?? Number.NaN;
    // Prevent concedes everything in front of it; Cover 3 does not. Quarters leaves
    // the centre lane; Cover 3 covers it with a middle-third player.
    expect(rateOf("PREVENT")).toBeLessThan(rateOf("COVER_2"));
    expect(rateOf("COVER_2")).toBeLessThan(rateOf("COVER_3"));
    expect(rateOf("QUARTERS")).toBeLessThan(rateOf("COVER_3"));
  });

  it("leaves its holes where the shells actually have holes", () => {
    const worst = [...uncovered].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const cells = worst.map(([cell]) => cell);
    // The intermediate band outside the numbers is the largest residue in the corpus
    // — the comeback and corner window that two-high and three-deep both concede,
    // and the corpus's formations are right-handed, so the RIGHT one is the biggest.
    expect(cells).toContain("RW-INTERMEDIATE");
    // Nothing deep dominates the residue: deep is where zone shells put their men.
    expect(cells.filter((c) => c.endsWith("-DEEP"))).toEqual([]);
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
