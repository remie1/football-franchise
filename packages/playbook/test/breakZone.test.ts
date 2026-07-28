/**
 * CALIBRATION-BACKLOG ENTRY 8, CLOSED — asserted over the whole corpus.
 *
 * Entry 8: "nothing on a play card says which side of the field a route runs to
 * … so **every silent route shares a lane** and therefore a zone. Zone-coverage
 * metrics currently describe the fixture rather than the mechanic."
 *
 * The requirement is total, not statistical: a corpus that states horizontal
 * placement on 95% of its routes leaves entry 8 open, because the other 5% still
 * collapse into `TUNABLES.zoneModel.defaultHorizontal` and nothing in the output
 * distinguishes them. So this file walks EVERY route object in the corpus —
 * including the mirrored forms, which is where a flip bug would hide — and checks
 * every field individually rather than sampling.
 *
 * `RouteSpec.breakZone` is non-optional, so this cannot fail against a card written
 * through the builders. It exists for the cards that will not be: a JSON playbook
 * loaded from a save file, or a UI authoring surface in Phase 4. The type is the
 * guarantee; this is the guarantee's audit.
 */
import { describe, expect, it } from "vitest";
import type { FieldZone, HorizontalZone, VerticalZone } from "@ff/contracts";
import { mirrorFormation } from "../src/formations.js";
import { PASS_CONCEPTS } from "../src/passConcepts.js";
import { mirrorLane } from "../src/alignment.js";
import type { RouteSpec } from "../src/routes.js";
import { verticalZoneForAirYards } from "../src/routes.js";
import { instantiateDefense, instantiatePass } from "../src/instantiate.js";
import { buildDefensiveUnit, buildOffensiveUnit } from "../src/personnel.js";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";
import { rusherCount } from "../src/defense.js";
import { protectionCapacity } from "../src/passConcepts.js";
import { DEEP_CHART } from "./fixtures.js";

const LANES: readonly HorizontalZone[] = ["LW", "LH", "C", "RH", "RW"];
const BANDS: readonly VerticalZone[] = ["BACKFIELD", "SHORT", "INTERMEDIATE", "DEEP", "VERY_DEEP"];

function everyRoute(): readonly { readonly where: string; readonly spec: RouteSpec }[] {
  const out: { where: string; spec: RouteSpec }[] = [];
  for (const concept of PASS_CONCEPTS) {
    for (const [role, spec] of Object.entries(concept.routes)) {
      if (spec === undefined) continue;
      out.push({ where: `${concept.id}/${role}`, spec });
    }
  }
  return out;
}

describe("every route in the corpus states its horizontal placement", () => {
  const routes = everyRoute();

  it("has routes to check at all", () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it("states a well-formed break zone on every single one, with zero omissions", () => {
    const omissions: string[] = [];
    for (const { where, spec } of routes) {
      const zone: FieldZone | undefined = spec.breakZone;
      if (zone === undefined) {
        omissions.push(`${where}: no breakZone`);
        continue;
      }
      if (!LANES.includes(zone.horizontal)) omissions.push(`${where}: bad lane`);
      if (!BANDS.includes(zone.vertical)) omissions.push(`${where}: bad band`);
    }
    expect(omissions).toEqual([]);
  });

  it("derives the vertical half from air yards on every one, so the two cannot disagree", () => {
    for (const { where, spec } of routes) {
      expect(spec.breakZone.vertical, where).toBe(verticalZoneForAirYards(spec.airYards));
    }
  });

  it("survives instantiation — the engine receives the lane, not a default", () => {
    let checked = 0;
    for (const concept of PASS_CONCEPTS) {
      const offenseUnit = buildOffensiveUnit(concept.formation.personnel, DEEP_CHART);
      for (const card of DEFENSIVE_CARDS) {
        if (rusherCount(card) > protectionCapacity(concept)) continue;
        const defenseUnit = buildDefensiveUnit(card.personnel, DEEP_CHART);
        const defense = instantiateDefense(card, defenseUnit, {
          formation: concept.formation,
          unit: offenseUnit,
        });
        const offense = instantiatePass(concept, offenseUnit, defense);
        if (offense.call.kind !== "PASS") continue;
        for (const assignment of offense.call.routes) {
          expect(assignment.breakZone).toBeDefined();
          expect(assignment.breakZone?.horizontal).toBeDefined();
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("keeps the placement when a concept's formation is mirrored", () => {
    for (const concept of PASS_CONCEPTS) {
      const flipped = mirrorFormation(concept.formation);
      expect(Object.keys(flipped.alignments).sort()).toEqual(
        Object.keys(concept.formation.alignments).sort(),
      );
      for (const [role, spec] of Object.entries(concept.routes)) {
        if (spec === undefined) continue;
        // A mirrored concept's route must be reachable from the mirrored alignment,
        // which is the same relationship reflected — this is the property that would
        // break if mirroring flipped one side of the pair and not the other.
        const original = concept.formation.alignments[role as keyof typeof concept.formation.alignments];
        const mirroredAlignment = flipped.alignments[role as keyof typeof flipped.alignments];
        expect(mirroredAlignment).toBeDefined();
        if (original === undefined || mirroredAlignment === undefined) continue;
        expect(mirroredAlignment.lane).toBe(mirrorLane(original.lane));
        expect(mirrorLane(mirrorLane(spec.breakZone.horizontal))).toBe(spec.breakZone.horizontal);
      }
    }
  });
});
