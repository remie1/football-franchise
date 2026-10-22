/**
 * THE SEASON'S OWN SQUADS (ADR-079 R4).
 *
 *  1. Every personnel group the playbook declares can be fielded from every generated roster.
 *  2. The resolver plays a game with the two teams' own squads, deterministically, and the
 *     squads matter: the same game on the flat league comes out differently.
 *  3. The generated league is the franchise league's teams, filled in.
 */
import { describe, expect, it } from "vitest";
import { buildLeague, buildSchedule } from "@ff/franchise";
import {
  buildDefensiveUnit, buildOffensiveUnit, DEFENSE_PERSONNEL, OFFENSE_PERSONNEL,
} from "@ff/playbook";
import { buildGeneratedLeague } from "../src/season/generatedLeague.js";
import { realSimResolver } from "../src/season/realSeason.js";

const league = buildLeague("generated-season-test");
const rated = buildGeneratedLeague(league, { season: 2027 });
const game = buildSchedule(league, 2027, "generated-season-test").games[0]!;

describe("generated squads in the season runner", () => {
  it("is the franchise league's teams, each with a 53-man roster", () => {
    expect(rated.provenance).toBe("GENERATED_FICTIONAL");
    expect(rated.league.teams.map((t) => t.id)).toEqual(league.teams.map((t) => t.id));
    expect(rated.league.teams.map((t) => t.displayName)).toEqual(league.teams.map((t) => t.displayName));
    for (const t of rated.league.teams) expect(t.roster).toHaveLength(53);
  });

  it("can field every offensive and defensive personnel group from every roster", () => {
    for (const t of rated.league.teams) {
      for (const p of OFFENSE_PERSONNEL) expect(() => buildOffensiveUnit(p, t.depthChart), `${String(t.id)} ${p}`).not.toThrow();
      for (const p of DEFENSE_PERSONNEL) expect(() => buildDefensiveUnit(p, t.depthChart), `${String(t.id)} ${p}`).not.toThrow();
    }
  });

  it("plays a game with the teams' own squads, deterministically", () => {
    const resolve = realSimResolver(league, { rated });
    const a = resolve(game, "seed-a");
    expect(a).toMatchObject({ gameId: game.gameId, home: game.home, away: game.away });
    expect(resolve(game, "seed-a")).toEqual(a);
    const flat = realSimResolver(league);
    const seeds = ["seed-a", "seed-b", "seed-c"];
    const differs = seeds.some((s) => {
      const g = realSimResolver(league, { rated })(game, s);
      const f = flat(game, s);
      return g.homeScore !== f.homeScore || g.awayScore !== f.awayScore;
    });
    expect(differs).toBe(true);
  });

  it("refuses a rated league that is missing one of the franchise league's teams", () => {
    const short = { ...rated, league: { ...rated.league, teams: rated.league.teams.slice(1) } };
    expect(() => realSimResolver(league, { rated: short })).toThrow(/has no team/);
  });
});
