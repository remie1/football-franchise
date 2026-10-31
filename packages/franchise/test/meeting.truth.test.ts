/**
 * ADR-081 M1: the meeting's truth side. Point 1 (were we lucky?) and team strength.
 */
import { describe, expect, it } from "vitest";
import { createRng, type GameResult, type SeasonState, type TeamId } from "@ff/contracts";
import { LUCK, leagueStrength, pythagorean, seasonLuck, teamStrength, verdictOf, strengthWinShare, runSeason, type GameResolver } from "../src/index.js";
import { league, player, startingPeople } from "./playersWorld.js";

const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "luck-game");
  const homeScore = rng.int(0, 6) * 7 + rng.int(0, 3), awayScore = rng.int(0, 6) * 7 + rng.int(0, 3);
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};
const run = runSeason({ league, season: 2027, seed: "luck", resolve: fake });
const luck = seasonLuck(run.state);

describe("were we lucky? (point 1)", () => {
  it("reads the Pythagorean share with the NFL's exponent", () => {
    expect(pythagorean(400, 400)).toBeCloseTo(0.5, 12);
    expect(pythagorean(0, 0)).toBe(0.5);
    expect(pythagorean(450, 300)).toBeCloseTo(450 ** 2.37 / (450 ** 2.37 + 300 ** 2.37), 12);
    expect(pythagorean(450, 300)).toBeGreaterThan(0.7);
  });

  it("calls a gap within a win exactly as good as the record", () => {
    expect(verdictOf(LUCK.evenWins)).toBe("EVEN");
    expect(verdictOf(-LUCK.evenWins)).toBe("EVEN");
    expect(verdictOf(1.01)).toBe("LUCKY");
    expect(verdictOf(-1.01)).toBe("UNLUCKY");
  });

  it("counts regular-season games only, and agrees with the standings", () => {
    expect(luck).toHaveLength(32);
    for (const t of luck) {
      const row = run.state.standings.find((r) => r.team === t.team)!;
      expect(t.games).toBe(17);
      expect(t.wins).toBe(row.overall.wins + row.overall.ties / 2);
      expect(t.pointsFor).toBe(row.pointsFor);
      expect(t.pointsAgainst).toBe(row.pointsAgainst);
      expect(t.gap).toBeCloseTo(t.wins - t.expectedWins, 12);
      expect(t.oneScore.wins + t.oneScore.losses + t.oneScore.ties).toBeLessThanOrEqual(17);
      expect(t.scheduleStrength).toBeGreaterThan(0);
      expect(t.scheduleStrength).toBeLessThan(1);
    }
    // League-wide the gaps nearly cancel: luck is zero-sum apart from the curve's shape.
    expect(Math.abs(luck.reduce((s, t) => s + t.gap, 0))).toBeLessThan(6);
  });

  it("sees a team that won every close game as lucky", () => {
    const a = "A" as TeamId, b = "B" as TeamId;
    const results: GameResult[] = [];
    const games = [];
    for (let i = 0; i < 10; i++) {
      const won = i < 6; // six 1-point wins, four 20-point losses
      const g = { gameId: `g${i}` as GameResult["gameId"], season: 2027, kind: "REGULAR" as const, at: { season: 2027, phase: "REGULAR_SEASON" as const, week: i + 1, day: 7 }, home: a, away: b, neutralSite: false };
      games.push(g);
      results.push({ gameId: g.gameId, home: a, away: b, homeScore: won ? 21 : 10, awayScore: won ? 20 : 30, reason: "REGULATION", seed: "x" });
    }
    const row = (team: TeamId) => ({ team, overall: { wins: 0, losses: 0, ties: 0 }, division: { wins: 0, losses: 0, ties: 0 }, conference: { wins: 0, losses: 0, ties: 0 }, home: { wins: 0, losses: 0, ties: 0 }, away: { wins: 0, losses: 0, ties: 0 }, pointsFor: 0, pointsAgainst: 0, divisionRank: 1 });
    const state: SeasonState = { season: 2027, schedule: { season: 2027, games, byes: [] }, results, standings: [row(a), row(b)] };
    const [ta, tb] = seasonLuck(state);
    expect(ta!.wins).toBe(6);
    expect(ta!.oneScore).toEqual({ wins: 6, losses: 0, ties: 0 });
    expect(ta!.verdict).toBe("LUCKY");
    expect(tb!.verdict).toBe("UNLUCKY");
  });
});

describe("team strength", () => {
  const people = startingPeople();
  const strengths = leagueStrength(people.teams, people.players);
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));

  it("rates each team's 26 starters (11 on offense, 12 on defense, 3 specialists), one value each", () => {
    for (const s of strengths) {
      expect(s.starters).toHaveLength(26);
      expect(s.total).toBeCloseTo(s.units.OFFENSE + s.units.DEFENSE + s.units.SPECIAL_TEAMS, 9);
      expect(Object.keys(s.groups).sort()).toEqual(["CB", "DL", "LB", "OL", "QB", "RB", "S", "ST", "TE", "WR"]);
    }
  });

  it("goes up when a starter gets better, and a quarterback counts more than a long snapper", () => {
    const team = people.teams[0]!;
    const base = teamStrength(team, byId).total;
    const better = (pos: "QB" | "LS") => {
      const id = String(team.depthChart[pos]![0]);
      const p = byId.get(id)!;
      const m = new Map(byId);
      m.set(id, player(id, pos, 90, p.bio.age, team.id));
      return teamStrength(team, m).total - base;
    };
    expect(better("QB")).toBeGreaterThan(0);
    expect(better("QB")).toBeGreaterThan(better("LS") * 3);
  });

  it("fills a short depth chart from the roster by overall", () => {
    const team = { ...people.teams[0]!, depthChart: {} };
    const s = teamStrength(team, byId);
    expect(s.starters).toHaveLength(26);
    const qb = s.starters.find((x) => x.position === "QB")!;
    expect(String(qb.player.bio.id)).toBe(String(people.teams[0]!.depthChart.QB![0]));
  });

  it("turns strength into a win share around the league mean", () => {
    expect(strengthWinShare(10, 10)).toBe(0.5);
    expect(strengthWinShare(50, 10)).toBeGreaterThan(0.7);
    expect(strengthWinShare(-30, 10)).toBeLessThan(0.3);
  });
});
