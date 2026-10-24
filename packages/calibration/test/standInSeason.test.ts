/**
 * THE STAND-IN LEAGUE IN THE SEASON RUNNER (ADR-088 R5).
 *
 * Reads the committed league file by name (a file, not an import: ADR-079 R1's surface is unchanged)
 * and checks that every team can field every personnel group and that a game plays.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLeague, buildSchedule } from "@ff/franchise";
import { buildDefensiveUnit, buildOffensiveUnit, DEFENSE_PERSONNEL, OFFENSE_PERSONNEL } from "@ff/playbook";
import { realSimResolver } from "../src/season/realSeason.js";
import { buildStandInLeague, readStandInFile } from "../src/season/standInLeague.js";

// The committed league file, by name (a new snapshot is a deliberate change to this test).
const file = readStandInFile(readFileSync(join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json"), "utf8"));
const base = buildLeague("standin-season-test");
const { league, rated } = buildStandInLeague(base, file);

describe("stand-in league in the season runner", () => {
  it("is the franchise league's teams, each with its stand-in name and squad", () => {
    expect(rated.provenance).toBe("REAL_STAND_IN");
    expect(league.teams.map((t) => t.id)).toEqual(base.teams.map((t) => t.id));
    expect(league.structure).toBe(base.structure);
    for (const t of league.teams) {
      expect(t.roster.length).toBeGreaterThanOrEqual(45);
      expect(t.capState).toEqual(base.teams.find((b) => b.id === t.id)!.capState);
    }
    expect(rated.league.players[0]!.attributes.traits).toBeInstanceOf(Set);
  });

  it("can field every offensive and defensive personnel group from every roster", () => {
    for (const t of league.teams) {
      for (const p of OFFENSE_PERSONNEL) expect(() => buildOffensiveUnit(p, t.depthChart), `${String(t.id)} ${p}`).not.toThrow();
      for (const p of DEFENSE_PERSONNEL) expect(() => buildDefensiveUnit(p, t.depthChart), `${String(t.id)} ${p}`).not.toThrow();
    }
  });

  it("plays every team's first game, deterministically", () => {
    const resolve = realSimResolver(league, { rated });
    const games = buildSchedule(league, file.season, "standin-season-test").games;
    const first = new Map<string, (typeof games)[number]>();
    for (const g of games) for (const t of [g.home, g.away]) if (!first.has(String(t))) first.set(String(t), g);
    for (const g of new Set(first.values())) expect(() => resolve(g, "s")).not.toThrow();
    const g = games[0]!;
    expect(resolve(g, "seed-a")).toEqual(resolve(g, "seed-a"));
  });

  it("refuses a file that is not a stand-in league", () => {
    expect(() => readStandInFile(JSON.stringify({ format: "other" }))).toThrow(/not a stand-in league file/);
  });
});
