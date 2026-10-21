import { describe, it, expect } from "vitest";
import { DEFAULT_LEAGUE_RULES } from "@ff/contracts";
import { buildLeague, type League } from "../src/index.js";
import { CITIES, NICKNAMES } from "../src/league/buildLeague.js";

describe("buildLeague (season shell S2)", () => {
  const league = buildLeague("world-1");

  it("is 2 conferences of 4 divisions of 4 teams under the default rules", () => {
    expect(league.structure.conferences).toHaveLength(2);
    expect(league.structure.divisions).toHaveLength(8);
    for (const d of league.structure.divisions) expect(d.teams).toHaveLength(4);
    expect(league.teams).toHaveLength(DEFAULT_LEAGUE_RULES.teamCount);
  });

  it("links every team to exactly one division and every division to its conference", () => {
    const placed = league.structure.divisions.flatMap((d) => d.teams);
    expect(new Set(placed).size).toBe(32);
    expect(new Set(placed)).toEqual(new Set(league.teams.map((t) => t.id)));
    for (const c of league.structure.conferences) {
      for (const did of c.divisions) {
        expect(league.structure.divisions.find((d) => d.id === did)!.conference).toBe(c.id);
      }
    }
  });

  it("gives every team a unique city and name", () => {
    expect(new Set(league.teams.map((t) => t.city)).size).toBe(32);
    expect(new Set(league.teams.map((t) => t.displayName)).size).toBe(32);
    expect(CITIES).toHaveLength(32);
    expect(new Set(CITIES).size).toBe(32);
    expect(new Set(NICKNAMES).size).toBe(32);
  });

  it("is deterministic: same seed gives an identical league, a different seed different names", () => {
    const again: League = buildLeague("world-1");
    expect(again).toEqual(league);
    const other = buildLeague("world-2");
    expect(other.teams.map((t) => t.id)).toEqual(league.teams.map((t) => t.id));
    expect(other.teams.map((t) => t.displayName)).not.toEqual(league.teams.map((t) => t.displayName));
  });

  it("survives a JSON round-trip (it goes into the save file)", () => {
    expect(JSON.parse(JSON.stringify(league))).toEqual(league);
  });

  it("refuses a team count that does not fill the eight divisions", () => {
    expect(() => buildLeague("w", { ...DEFAULT_LEAGUE_RULES, teamCount: 30 })).toThrow(/multiple of 8/);
  });
});
