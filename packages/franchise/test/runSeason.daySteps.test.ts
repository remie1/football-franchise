import { describe, it, expect } from "vitest";
import { DEFAULT_LEAGUE_RULES, compareStamps, createRng, stampToString, type CalendarStamp, type FranchiseEvent } from "@ff/contracts";
import { buildLeague, runSeason, nextDay, seasonStart, type DayStep, type GameResolver, type LeaguePeople } from "../src/index.js";

const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7;
  const awayScore = rng.int(0, 5) * 7;
  return { result: { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed }, extras: { note: String(game.gameId) } };
};

const league = buildLeague("world-1");
const people: LeaguePeople = { teams: league.teams, players: [], picks: [], classes: [], freeAgents: [] };

/** Logs every day it sees and the games played on it; keeps a running count in `freeAgents` as a stand-in for state. */
function logger(seen: { day: string; games: number; extras: unknown[] }[]): DayStep {
  return {
    id: "log",
    run: (p, ctx) => {
      seen.push({ day: stampToString(ctx.day), games: ctx.games.length, extras: ctx.games.map((g) => g.extras) });
      const event: FranchiseEvent = { type: "MORALE_CHANGED", payload: { player: "x" as never, delta: 0, reason: "tick" } };
      return ctx.day.day === 7 ? { people: { ...p, freeAgents: [...p.freeAgents, ctx.day.week as never] }, events: [event] } : undefined;
    },
  };
}

describe("runSeason day steps (ADR-086 §2)", () => {
  const seen: { day: string; games: number; extras: unknown[] }[] = [];
  const run = runSeason({ league, season: 2027, seed: "s", resolve: fake, people, daySteps: [logger(seen)], through: "YEAR" });

  it("visits every calendar day exactly once, in order, from camp to the end of the year", () => {
    const days: string[] = [];
    let at: CalendarStamp = seasonStart(2027);
    for (;;) {
      days.push(stampToString(at));
      if (compareStamps(at, run.calendar) >= 0) break;
      at = nextDay(at, DEFAULT_LEAGUE_RULES);
    }
    expect(seen.map((s) => s.day)).toEqual(days);
  });

  it("hands each day's games and their extras to that day's steps, after the games", () => {
    const withGames = seen.filter((s) => s.games > 0);
    expect(withGames.reduce((n, s) => n + s.games, 0)).toBe(run.state.results.length);
    expect(withGames[0]!.extras[0]).toMatchObject({ note: expect.any(String) });
  });

  it("returns the people as the steps left them, and the steps' events in the stream", () => {
    expect(run.people!.freeAgents.length).toBe(seen.filter((s) => s.day.endsWith("D7")).length);
    expect(run.events.filter((e) => e.event.type === "MORALE_CHANGED").length).toBe(run.people!.freeAgents.length);
  });

  it("is the same season with or without steps", () => {
    const plain = runSeason({ league, season: 2027, seed: "s", resolve: fake, through: "YEAR" });
    expect(plain.state).toEqual(run.state);
  });

  it("does not run a day's steps twice when a stopped season is carried on", () => {
    const stop: CalendarStamp = { season: 2027, phase: "REGULAR_SEASON", week: 9, day: 7 };
    const seenA: typeof seen = [];
    const first = runSeason({ league, season: 2027, seed: "s", resolve: fake, people, daySteps: [logger(seenA)], through: "YEAR", stopAfter: stop });
    expect(seenA.at(-1)!.day).toBe(stampToString(stop));
    const seenB: typeof seen = [];
    const second = runSeason({
      league, season: 2027, seed: "s", resolve: fake, through: "YEAR",
      people: first.people!, daySteps: [logger(seenB)], resumeFrom: first.state, stepsDoneThrough: first.calendar,
    });
    expect([...seenA, ...seenB].map((s) => s.day)).toEqual(seen.map((s) => s.day));
    expect(second.people).toEqual(run.people);
  });
});
