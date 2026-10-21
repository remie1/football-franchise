/**
 * ADR-073 step 3.4 — THE CORPUS-WIDE CHECKS, OVER v6's CATALOGUE.
 *
 * The book's corpus-wide tests read `DEFENSIVE_CARDS` and nothing else (`shownAssignments.test.ts`
 * says so of itself: a card absent from that array is "shipped untested"). v6's coverages and
 * composed calls live beside the book, never in it (ADR-073 §3.4), so each check is copied here
 * over `V6_COVERAGES` and every entry of `COMPOSED`, unchanged in what it asserts:
 *
 *   - every call is valid (`corpus.test.ts`, "every card in the corpus is valid");
 *   - every offensive card against every composed call: a pass names exactly its free rushers and
 *     converts a hot route when it has one, and every pass and run is coherent (`corpus.test.ts`,
 *     "the cross product");
 *   - every call shows what it plays, and the shown rush is the played rush's own array
 *     (`shownAssignments.test.ts`);
 *   - every run fit crosses into the call as the run pairing sees it, the mirror included
 *     (`runFitCarryAcross.test.ts`);
 *   - every zone duty states a region (`coverage.test.ts`);
 *   - every call can wear a look except a played Cover 0, Prevent and the goal line, and every
 *     look sits over a rotation the catalogue calls (`masks.test.ts`).
 */
import type { CoverageAssignment, RunFit } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { ZONE_SHAPES, regionArea, type ZoneName } from "../src/coverage.js";
import { COMPOSED, V6_COVERAGES, type ComposedCall } from "../src/coverageCatalogue.js";
import { dutyList, mirrorDefensiveCard, rusherCount, type AnyDefensiveCard } from "../src/defense.js";
import { FORMATIONS } from "../src/formations.js";
import { instantiateDefense, instantiatePass, instantiateRun } from "../src/instantiate.js";
import { COVERAGE_MASKS, legalCoverageMasks, legalLookCombinations } from "../src/masks.js";
import { PASS_CONCEPTS, protectionCapacity } from "../src/passConcepts.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { RUN_CONCEPTS } from "../src/runConcepts.js";
import { errorsOnly, validateDefensiveCard } from "../src/validate.js";
import { DEEP_CHART, checkCoherence } from "./fixtures.js";

const ENTRIES: readonly ComposedCall[] = Object.values(COMPOSED);
const BY_KEY = ENTRIES.map((e) => [e.key, e.call] as const);

/** ADR-069 §2.3 and §9.4: the rotations no look may sit over. */
const UNMASKABLE: ReadonlySet<string> = new Set(["COVER_0", "PREVENT", "GOAL_LINE"]);

describe("every v6 coverage and composed call is valid", () => {
  it.each(V6_COVERAGES.map((c) => [c.id, c] as const))("coverage %s", (_id, card) => {
    expect(errorsOnly(validateDefensiveCard(card))).toEqual([]);
  });

  it.each(BY_KEY)("composed %s", (_key, call) => {
    expect(errorsOnly(validateDefensiveCard(call))).toEqual([]);
  });
});

describe("the cross product — every offensive card against every composed call", () => {
  it.each(BY_KEY)("every pass concept against %s", (key, card) => {
    const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
    for (const concept of PASS_CONCEPTS) {
      const label = `${concept.id} vs ${key}`;
      const offenseUnit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      const defense = instantiateDefense(card, defenseUnit, { formation: concept.formation, unit: offenseUnit });
      const offense = instantiatePass(concept, offenseUnit, defense);
      const shortfall = Math.max(0, rusherCount(card) - protectionCapacity(concept));
      expect(offense.unblockedRushers, label).toHaveLength(shortfall);
      if (shortfall > 0) {
        if (offense.call.kind !== "PASS") throw new Error(`${label}: expected a dropback`);
        expect(offense.call.routes.some((r) => r.hot !== undefined), label).toBe(true);
      }
      const quarterback = offenseUnit.QB;
      expect(quarterback, label).toBeDefined();
      if (quarterback === undefined) return;
      expect(checkCoherence(quarterback, offense.call, defense.call).problems, label).toEqual([]);
    }
  });

  it.each(BY_KEY)("every run concept against %s", (key, card) => {
    const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
    for (const concept of RUN_CONCEPTS) {
      const label = `${concept.id} vs ${key}`;
      const offenseUnit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      const defense = instantiateDefense(card, defenseUnit, { formation: concept.formation, unit: offenseUnit });
      const offense = instantiateRun(concept, offenseUnit, defense);
      const quarterback = offenseUnit.QB;
      expect(quarterback, label).toBeDefined();
      if (quarterback === undefined) return;
      expect(checkCoherence(quarterback, offense.call, defense.call).problems, label).toEqual([]);
    }
  });
});

describe("ADR-067 §A / ADR-073 step 3.1 — every composed call shows what it plays", () => {
  it.each(BY_KEY)("%s, against every formation in the corpus", (key, card) => {
    const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
    let assignmentsSeen = 0;
    for (const formation of FORMATIONS) {
      const call = instantiateDefense(card, defenseUnit, {
        formation,
        unit: buildOffensiveUnit(formation.personnel, DEEP_CHART),
      }).call;
      assignmentsSeen += call.assignments.length;
      // No composed call writes a `shows`: only a look does, laid over the call afterwards.
      expect(call.shownAssignments, `${key} vs ${formation.id}`).toEqual(call.assignments);
      expect(call.shownRush, `${key} vs ${formation.id}: the shown rush is a second array`).toBe(call.rush);
    }
    expect(assignmentsSeen, `${key} produced no coverage assignments at all`).toBeGreaterThan(0);
  });
});

describe("ADR-067 §C — runFit is carried onto the coverage assignment, over every composed call", () => {
  const fitKey = (fit: RunFit | undefined): string => (fit === undefined ? "none" : `${fit.side} ${fit.gap}`);
  const CARDS: readonly (readonly [string, AnyDefensiveCard])[] = BY_KEY.flatMap(([key, call]) => [
    [key, call] as const,
    [`${key} (mirrored)`, mirrorDefensiveCard(call)] as const,
  ]);
  let fitsSeen = 0;

  it.each(CARDS)("%s: every assignment's runFit matches its SECOND-level gap, against every formation", (key, card) => {
    const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
    for (const formation of FORMATIONS) {
      const defense = instantiateDefense(card, defenseUnit, {
        formation,
        unit: buildOffensiveUnit(formation.personnel, DEEP_CHART),
      });
      const where = `${key} vs ${formation.id}`;
      const byDefender = new Map<string, CoverageAssignment>();
      for (const a of defense.call.assignments) byDefender.set(String(a.defender), a);
      const second = defense.gaps.filter((g) => g.level === "SECOND");
      for (const gap of second) {
        expect(fitKey(byDefender.get(String(gap.defender))?.runFit), `${where}: ${String(gap.defender)}`).toBe(
          fitKey(gap),
        );
      }
      for (const a of defense.call.assignments) {
        if (a.runFit === undefined) continue;
        fitsSeen += 1;
        const gap = second.find((g) => String(g.defender) === String(a.defender));
        expect(fitKey(gap), `${where}: ${String(a.defender)}`).toBe(fitKey(a.runFit));
      }
    }
  });

  it("carries at least one fit, so the agreement above is not over nothing", () => {
    expect(fitsSeen).toBeGreaterThan(0);
  });
});

describe("v6's catalogue states a region for every zone duty it has", () => {
  const regionsOf = (card: AnyDefensiveCard) =>
    dutyList(card).flatMap(({ role, duty }) =>
      duty.kind === "ZONE"
        ? [{ role, region: duty }]
        : duty.kind === "MAN" && duty.ifAbsent.kind === "ZONE"
          ? [{ role, region: duty.ifAbsent }]
          : [],
    );

  it("never falls back on the one-cell default, on any coverage or composed call", () => {
    let zones = 0;
    for (const [key, card] of [...V6_COVERAGES.map((c) => [c.id, c] as const), ...BY_KEY]) {
      for (const { role, region } of regionsOf(card)) {
        zones += 1;
        expect(regionArea(region), `${key} ${role}`).toBeGreaterThan(1);
        expect(ZONE_SHAPES[region.responsibility], `${key} ${role}`).toBeDefined();
      }
    }
    expect(zones).toBeGreaterThan(100);
  });

  it("uses the whole vocabulary across its composed calls", () => {
    const used = new Set<ZoneName>();
    for (const [, card] of BY_KEY) for (const { region } of regionsOf(card)) used.add(region.responsibility);
    expect([...used].sort()).toEqual((Object.keys(ZONE_SHAPES) as ZoneName[]).sort());
  });
});

describe("ADR-069 — which composed calls can wear a look", () => {
  it("every one can wear at least one look, except a played Cover 0, Prevent and goal line", () => {
    for (const [key, card] of BY_KEY) {
      expect(legalCoverageMasks(card).length > 0, `${key} (${card.family})`).toBe(!UNMASKABLE.has(card.family));
      expect(legalLookCombinations(card).length > 0, `${key} (${card.family})`).toBe(!UNMASKABLE.has(card.family));
    }
  });

  it("every look is stated over a rotation v6's coverages call, so none is stated over nothing", () => {
    for (const mask of COVERAGE_MASKS) {
      expect(V6_COVERAGES.filter((c) => mask.over.includes(c.family)).length, mask.id).toBeGreaterThan(0);
    }
  });
});
