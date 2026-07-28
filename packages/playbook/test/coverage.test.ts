/**
 * THE ZONE VOCABULARY — the properties the corpus leans on without saying so.
 *
 * Three of these are load-bearing beyond this file:
 *
 *  - every responsibility's lane set is MIRROR-SYMMETRIC, which is what makes
 *    `mirrorDefensiveCard` produce a card that is still legal;
 *  - no responsibility is a point, which is ADR-018 §Petition 1 stated as a test
 *    rather than as an intention;
 *  - the shapes are NOT uniform, which is the difference between modelling zones and
 *    padding them until a metric improves.
 */
import { describe, expect, it } from "vitest";
import { LANES, mirrorLane } from "../src/alignment.js";
import type { SpannedZone, ZoneName } from "../src/coverage.js";
import {
  DEPTH_BANDS,
  ZONE_SHAPES,
  bandIndex,
  regionArea,
  regionCells,
  regionCovers,
  zone,
} from "../src/coverage.js";
import { DEFENSIVE_CARDS } from "../src/defensiveCards.js";
import { dutyList } from "../src/defense.js";

const NAMES = Object.keys(ZONE_SHAPES) as ZoneName[];

describe("every responsibility is a region", () => {
  it.each(NAMES)("%s covers more than one cell", (name) => {
    const shape = ZONE_SHAPES[name];
    for (const lane of shape.lanes) {
      const region = { zone: { horizontal: lane, vertical: shape.vertical }, ...shape };
      expect(regionArea(region), `${name} at ${lane}`).toBeGreaterThan(1);
    }
  });

  it("does not pad: no responsibility owns more than nine of twenty-five cells", () => {
    for (const name of NAMES) {
      const shape = ZONE_SHAPES[name];
      for (const lane of shape.lanes) {
        const region = { zone: { horizontal: lane, vertical: shape.vertical }, ...shape };
        expect(regionArea(region), `${name} at ${lane}`).toBeLessThanOrEqual(9);
      }
    }
  });

  it("uses genuinely different shapes rather than one shape with different names", () => {
    const shapes = new Set(NAMES.map((n) => `${ZONE_SHAPES[n].laneSpan}x${ZONE_SHAPES[n].depthSpan}`));
    expect(shapes.size).toBeGreaterThan(2);
    // The two families of underneath player are the clearest case: one buys width and
    // pays in depth, the other does the opposite. If these ever converge, the
    // vocabulary has stopped saying anything.
    expect(ZONE_SHAPES.CURL_FLAT.laneSpan).toBeGreaterThan(ZONE_SHAPES.HOOK_CURL.laneSpan);
    expect(ZONE_SHAPES.HOOK_CURL.depthSpan).toBeGreaterThan(ZONE_SHAPES.CURL_FLAT.depthSpan);
    // A half is wider than a quarter and a third sits between them.
    expect(ZONE_SHAPES.DEEP_HALF.laneSpan).toBeGreaterThan(ZONE_SHAPES.DEEP_QUARTER.laneSpan);
  });

  it("anchors every responsibility in lanes that mirror into each other", () => {
    for (const name of NAMES) {
      for (const lane of ZONE_SHAPES[name].lanes) {
        expect(ZONE_SHAPES[name].lanes, `${name} at ${lane}`).toContain(mirrorLane(lane));
      }
    }
  });
});

describe("the constructor cannot produce a region that disagrees with itself", () => {
  it("takes the band and both spans from the responsibility", () => {
    const third = zone("DEEP_THIRD", "LW");
    expect(third).toEqual({
      responsibility: "DEEP_THIRD",
      zone: { horizontal: "LW", vertical: "DEEP" },
      laneSpan: 1,
      depthSpan: 1,
    });
  });

  it("puts a deep third over two lanes from the intermediate band up", () => {
    const cells = regionCells(zone("DEEP_THIRD", "LW")).map((c) => `${c.horizontal}-${c.vertical}`);
    expect(cells).toContain("LH-INTERMEDIATE");
    expect(cells).toContain("LW-DEEP");
    expect(cells).not.toContain("C-DEEP");
    expect(cells).not.toContain("LW-SHORT");
  });

  it("puts the flat at and behind the line, outside, and nowhere near the dig", () => {
    const cells = regionCells(zone("FLAT", "RW")).map((c) => `${c.horizontal}-${c.vertical}`);
    expect(cells).toContain("RW-BACKFIELD");
    expect(cells).toContain("RH-SHORT");
    expect(cells).not.toContain("RW-INTERMEDIATE");
  });
});

describe("membership honours the contracts default", () => {
  it("treats an omitted span as nought, which is what a pre-ADR-018 card means", () => {
    const point = { zone: { horizontal: "C", vertical: "SHORT" } } as const;
    expect(regionCovers(point, { horizontal: "C", vertical: "SHORT" })).toBe(true);
    expect(regionCovers(point, { horizontal: "C", vertical: "INTERMEDIATE" })).toBe(false);
    expect(regionCovers(point, { horizontal: "RH", vertical: "SHORT" })).toBe(false);
    expect(regionArea(point)).toBe(1);
  });

  it("clamps at the edges of the field rather than wrapping round it", () => {
    const wide: SpannedZone = {
      zone: { horizontal: "LW", vertical: "BACKFIELD" },
      laneSpan: 1,
      depthSpan: 1,
    };
    expect(regionCells(wide).map((c) => c.horizontal)).not.toContain("RW");
    expect(regionCells(wide).map((c) => c.vertical)).toEqual(
      expect.not.arrayContaining(["INTERMEDIATE"]),
    );
    expect(regionArea(wide)).toBe(4);
  });

  it("orders the grid the way the rest of the package does", () => {
    expect(bandIndex("BACKFIELD")).toBeLessThan(bandIndex("DEEP"));
    expect(DEPTH_BANDS).toHaveLength(5);
    expect(LANES).toHaveLength(5);
  });
});

describe("the corpus states a region for every zone duty it has", () => {
  it("never falls back on the one-cell default anywhere in twenty-two cards", () => {
    let zones = 0;
    for (const card of DEFENSIVE_CARDS) {
      for (const { role, duty } of dutyList(card)) {
        const regions =
          duty.kind === "ZONE"
            ? [duty]
            : duty.kind === "MAN" && duty.ifAbsent.kind === "ZONE"
              ? [duty.ifAbsent]
              : [];
        for (const region of regions) {
          zones += 1;
          expect(regionArea(region), `${card.id} ${role}`).toBeGreaterThan(1);
          expect(ZONE_SHAPES[region.responsibility]).toBeDefined();
        }
      }
    }
    // Seven coverage defenders on most cards, plus every man defender's fallback.
    expect(zones).toBeGreaterThan(100);
  });

  it("uses most of the vocabulary, so no responsibility is a type with no card", () => {
    const used = new Set<ZoneName>();
    for (const card of DEFENSIVE_CARDS) {
      for (const { duty } of dutyList(card)) {
        if (duty.kind === "ZONE") used.add(duty.responsibility);
        if (duty.kind === "MAN" && duty.ifAbsent.kind === "ZONE") {
          used.add(duty.ifAbsent.responsibility);
        }
      }
    }
    expect([...used].sort()).toEqual(NAMES.sort());
  });
});
