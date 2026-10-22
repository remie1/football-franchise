/**
 * THE REAL-SIM SEASON RUNNER (`src/season/`, ADR-078 R1).
 *
 *  1. The resolver answers for exactly the game it was given, with the sim's own score.
 *  2. DETERMINISM (Iron Rule 4): same game and seed, same result; it is `runOneGame`'s result.
 *  3. Playoff games (weeks after the regular season) get engine weeks of their own.
 *
 * A whole season is 285 games; that runs from the `season` command, not here.
 */
import { describe, expect, it } from "vitest";
import { buildLeague, buildSchedule } from "@ff/franchise";
import { gameId, type ScheduledGame } from "@ff/contracts";
import { realSimResolver } from "../src/season/realSeason.js";

const league = buildLeague("real-season-test");
const resolve = realSimResolver(league);
const game = buildSchedule(league, 2027, "real-season-test").games[0]!;

describe("realSimResolver", () => {
  const result = resolve(game, "seed-a");

  it("answers for the scheduled game with a plausible final score", () => {
    expect(result).toMatchObject({ gameId: game.gameId, home: game.home, away: game.away, seed: "seed-a" });
    expect(result.homeScore).toBeGreaterThanOrEqual(0);
    expect(result.awayScore).toBeGreaterThanOrEqual(0);
    expect(["REGULATION", "OVERTIME", "TIE"]).toContain(result.reason);
  });

  it("carries the sim's period scores, which add up to the final score (ADR-082 N2)", () => {
    const periods = result.periods ?? [];
    expect(periods.length).toBeGreaterThanOrEqual(4);
    expect(periods.map((p) => p.period)).toEqual(periods.map((_, i) => i + 1));
    expect(periods.reduce((n, p) => n + p.home, 0)).toBe(result.homeScore);
    expect(periods.reduce((n, p) => n + p.away, 0)).toBe(result.awayScore);
  });

  it("is deterministic: same seed, same result; another seed, another game", () => {
    expect(resolve(game, "seed-a")).toEqual(result);
    const others = ["seed-b", "seed-c", "seed-d"].map((s) => resolve(game, s));
    expect(others.some((r) => r.homeScore !== result.homeScore || r.awayScore !== result.awayScore)).toBe(true);
  });

  it("plays a playoff game too", () => {
    const playoff: ScheduledGame = {
      ...game,
      gameId: gameId("S2027-P-WILD_CARD-test"),
      kind: "WILD_CARD",
      at: { season: 2027, phase: "PLAYOFFS", week: 1, day: 7 },
    };
    expect(resolve(playoff, "seed-a")).toMatchObject({ gameId: playoff.gameId, home: game.home });
  });

  it("refuses a team the league does not have", () => {
    expect(() => resolve({ ...game, home: "nobody" as never }, "s")).toThrow(/not in this league/);
  });
});
