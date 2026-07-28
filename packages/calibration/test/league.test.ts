/** The league seam: provenance brands, flat and archetype construction, per-week roster state. */
import { describe, expect, it } from "vitest";
import { ATTRIBUTE_REGISTRY_V1, getAttr, attrId, teamId } from "@ff/contracts";
import { buildArchetypeLeague, ladder } from "../src/league/archetype.js";
import { FLAT_RATING, activeAttrIds, buildFlatLeague, syntheticTeamIds, uniformAttributes } from "../src/league/flat.js";
import {
  NotADerivedLeagueError,
  assertDerivedLeague,
  claimScopeOf,
  type DerivedLeague,
} from "../src/league/provenance.js";
import { POSITION_DEPTH, ROSTER_SIZE } from "../src/league/roster.js";
import {
  RosterUnavailableError,
  buildTeamSnapshot,
  fullStrength,
  indexLeague,
  weekDepthChart,
} from "../src/league/snapshot.js";

describe("the flat league", () => {
  it("sets every active registry attribute of every player to the same value", () => {
    const league = buildFlatLeague({ teams: 2 });
    expect(league.provenance).toBe("FLAT_SYNTHETIC");
    expect(league.league.teams).toHaveLength(2);
    expect(league.league.players).toHaveLength(2 * ROSTER_SIZE);
    for (const player of league.league.players) {
      for (const id of activeAttrIds()) {
        expect(getAttr(player.attributes.values, id)).toBe(FLAT_RATING);
      }
    }
  });

  it("is 60 rather than 50, so 'the attributes are being read' is observable", () => {
    // getAttr's own fallback is 50. A flat-50 league would be indistinguishable from a league
    // whose attribute maps were dropped entirely.
    expect(FLAT_RATING).not.toBe(50);
    expect(uniformAttributes(60)[attrId("accuracy") as unknown as string]).toBe(60);
  });

  it("rosters enough at each position for the deepest card in the corpus", () => {
    // 13 personnel needs three tight ends; 00 needs five receivers; DIME needs four corners.
    expect(POSITION_DEPTH.TE).toBeGreaterThanOrEqual(3);
    expect(POSITION_DEPTH.WR).toBeGreaterThanOrEqual(5);
    expect(POSITION_DEPTH.CB).toBeGreaterThanOrEqual(4);
  });

  it("refuses an override naming an attribute the registry does not have", () => {
    expect(() => buildFlatLeague({ overrides: { notAnAttribute: 70 } })).toThrow(
      /not an active attribute/,
    );
  });

  it("refuses an out-of-scale rating", () => {
    expect(() => buildFlatLeague({ rating: 120 })).toThrow(RangeError);
    expect(() => buildFlatLeague({ overrides: { accuracy: -1 } })).toThrow(RangeError);
  });

  it("states its own construction in the description a report prints", () => {
    const league = buildFlatLeague({ teams: 4, rating: 72, overrides: { accuracy: 90 } });
    expect(league.description).toContain("72");
    expect(league.description).toContain("accuracy=90");
    expect(league.description).toContain(String(ATTRIBUTE_REGISTRY_V1.schemaVersion));
  });

  it("is deterministic — two builds are identical", () => {
    expect(JSON.stringify(buildFlatLeague({ teams: 3 }).league)).toBe(
      JSON.stringify(buildFlatLeague({ teams: 3 }).league),
    );
  });
});

describe("provenance", () => {
  it("refuses a rating-attribution claim about a flat league", () => {
    const league = buildFlatLeague({ teams: 2 });
    expect(() => assertDerivedLeague(league, "test verdict")).toThrow(NotADerivedLeagueError);
  });

  it("states what each provenance may claim, for the report header", () => {
    expect(claimScopeOf("FLAT_SYNTHETIC")).toContain("MECHANIC CLAIMS ONLY");
    expect(claimScopeOf("DESIGNED_ARCHETYPE")).toContain("MONOTONICITY");
    expect(claimScopeOf("DERIVED")).toContain("FULL");
  });

  it("makes a DerivedLeague unconstructable today — the seam @ff/attributes fills", () => {
    // This is a COMPILE-time property. `buildFlatLeague` returns ProvenancedLeague<"FLAT_SYNTHETIC">
    // and nothing in this repository returns ProvenancedLeague<"DERIVED">, so the line below
    // does not typecheck — which is the intended state until Phase 2.
    // @ts-expect-error a flat league is not a derived league
    const derived: DerivedLeague = buildFlatLeague({ teams: 2 });
    expect(derived.provenance).toBe("FLAT_SYNTHETIC");
  });
});

describe("archetype leagues", () => {
  it("applies a design to one team's named positions only", () => {
    const league = buildArchetypeLeague({
      id: "test",
      description: "elite quarterback",
      teams: 2,
      designs: [{ teamIndex: 0, positions: ["QB"], attributes: { accuracy: 95 } }],
    });
    expect(league.provenance).toBe("DESIGNED_ARCHETYPE");
    const [home, away] = syntheticTeamIds(2);
    for (const player of league.league.players) {
      const expected = player.teamId === home && player.bio.position === "QB" ? 95 : 60;
      expect(getAttr(player.attributes.values, attrId("accuracy"))).toBe(expected);
      expect(player.teamId === away || player.bio.position !== "QB" || expected === 95).toBe(true);
    }
  });

  it("honours startersOnly", () => {
    const league = buildArchetypeLeague({
      id: "test",
      description: "one elite corner",
      designs: [
        { teamIndex: 0, positions: ["CB"], attributes: { manCoverage: 95 }, startersOnly: true },
      ],
    });
    const corners = league.league.players.filter(
      (p) => p.bio.position === "CB" && p.teamId === syntheticTeamIds(2)[0],
    );
    const elite = corners.filter((p) => getAttr(p.attributes.values, attrId("manCoverage")) === 95);
    expect(elite).toHaveLength(1);
  });

  it("refuses a design naming a non-registry attribute — a scenario that tests nothing", () => {
    expect(() =>
      buildArchetypeLeague({
        id: "test",
        description: "x",
        designs: [{ teamIndex: 0, positions: ["QB"], attributes: { clairvoyance: 99 } }],
      }),
    ).toThrow(/not an active registry attribute/);
  });

  it("builds a ladder with a rung per value", () => {
    const rungs = ladder("qb", "accuracy", ["QB"], ["accuracy"], [40, 60, 80]);
    expect(rungs.map((r) => r.value)).toEqual([40, 60, 80]);
    expect(rungs[2]?.league.id).toBe("qb-80");
  });
});

describe("per-week roster state", () => {
  it("filters the depth chart to who is available, preserving order", () => {
    const league = buildFlatLeague({ teams: 2 });
    const index = indexLeague(league);
    const team = index.teams.get(String(syntheticTeamIds(2)[0]))!;
    const full = fullStrength(team, 2024, 3);
    expect(weekDepthChart(team, full).QB).toHaveLength(POSITION_DEPTH.QB);

    const starterOut = new Set(full.available);
    const starterQb = team.depthChart.QB?.[0];
    starterOut.delete(String(starterQb));
    const week = { ...full, available: starterOut, source: "REAL_AVAILABILITY" as const, unavailableCount: 1 };
    const chart = weekDepthChart(team, week);
    expect(chart.QB).toHaveLength(POSITION_DEPTH.QB - 1);
    expect(chart.QB?.[0]).toBe(team.depthChart.QB?.[1]);
  });

  it("promotes the backup into the personnel slot the absent starter held", () => {
    const league = buildFlatLeague({ teams: 2 });
    const index = indexLeague(league);
    const team = index.teams.get(String(syntheticTeamIds(2)[0]))!;
    const full = fullStrength(team, 2024, 1);
    const before = buildTeamSnapshot(index, full).snapshot.offense.quarterback;

    const without = new Set(full.available);
    without.delete(String(before));
    const after = buildTeamSnapshot(index, {
      ...full,
      available: without,
      source: "REAL_AVAILABILITY",
      unavailableCount: 1,
    }).snapshot.offense.quarterback;
    expect(after).not.toBe(before);
  });

  it("fails loudly rather than fielding ten men", () => {
    const league = buildFlatLeague({ teams: 2 });
    const index = indexLeague(league);
    const team = index.teams.get(String(syntheticTeamIds(2)[0]))!;
    expect(() =>
      buildTeamSnapshot(index, {
        team: team.id,
        season: 2024,
        week: 1,
        available: new Set<string>(),
        source: "REAL_AVAILABILITY",
        unavailableCount: team.roster.length,
      }),
    ).toThrow(RosterUnavailableError);
  });

  it("uses the same quarterback in the personnel and in the depth chart the caller binds against", () => {
    const league = buildFlatLeague({ teams: 2 });
    const index = indexLeague(league);
    const team = index.teams.get(String(syntheticTeamIds(2)[0]))!;
    const built = buildTeamSnapshot(index, fullStrength(team, 2024, 1));
    // If these disagreed, MatchGameState would take one quarterback and the play card would
    // name the other — visible only as a passer with no attempts.
    expect(built.snapshot.offense.quarterback).toBe(built.depthChart.QB?.[0]);
  });

  it("indexes a league by team and by player", () => {
    const index = indexLeague(buildFlatLeague({ teams: 4 }));
    expect(index.teamIds()).toHaveLength(4);
    expect(index.teams.get(String(teamId("t:03")))).toBeDefined();
    expect(index.players.size).toBe(4 * ROSTER_SIZE);
  });
});
