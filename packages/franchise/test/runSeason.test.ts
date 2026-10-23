import { describe, it, expect } from "vitest";
import { createRng, DEFAULT_LEAGUE_RULES, compareStamps, type GameResult } from "@ff/contracts";
import { buildLeague, runSeason, advance, type GameResolver } from "../src/index.js";

/** The quick fake: a seeded coin flip on the score, ties allowed. */
const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7;
  const awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};

const league = buildLeague("world-1");
const run = runSeason({ league, season: 2027, seed: "season-1", resolve: fake });

describe("runSeason (season shell S7) with the quick fake", () => {
  it("plays 272 regular-season games and a 13-game postseason", () => {
    const kinds = run.events.flatMap((e) => (e.event.type === "GAME_COMPLETED" ? [e.event.payload.kind] : []));
    expect(kinds.filter((k) => k === "REGULAR")).toHaveLength(272);
    expect(kinds.filter((k) => k !== "REGULAR")).toHaveLength(13);
    expect(run.state.results).toHaveLength(285);
    expect(run.state.bracket!.games).toHaveLength(13);
  });

  it("ends with standings covering 17 games for every team", () => {
    expect(run.state.standings).toHaveLength(32);
    for (const row of run.state.standings) {
      const o = row.overall;
      expect(o.wins + o.losses + o.ties).toBe(17);
    }
  });

  it("seeds the field once and crowns one champion, who won the last game", () => {
    const fieldSet = run.events.filter((e) => e.event.type === "PLAYOFF_FIELD_SET");
    const champion = run.events.filter((e) => e.event.type === "CHAMPION_DECIDED");
    expect(fieldSet).toHaveLength(1);
    expect(champion).toHaveLength(1);
    const last = run.state.results.at(-1)!;
    const winner = last.homeScore > last.awayScore ? last.home : last.away;
    expect(run.state.bracket!.champion).toBe(winner);
  });

  it("emits a well-ordered stream: seq 0..n-1, stamps never go backwards, games on their scheduled day", () => {
    run.events.forEach((e, i) => expect(e.seq).toBe(i));
    for (let i = 1; i < run.events.length; i++) {
      expect(compareStamps(run.events[i - 1]!.at, run.events[i]!.at)).toBeLessThanOrEqual(0);
    }
    const all = [...run.state.schedule.games, ...run.state.bracket!.games];
    for (const e of run.events) {
      if (e.event.type !== "GAME_COMPLETED") continue;
      const id = e.event.payload.result.gameId;
      expect(compareStamps(e.at, all.find((g) => g.gameId === id)!.at)).toBe(0);
    }
    expect(run.events.filter((e) => e.event.type === "DEADLINE_REACHED")).toHaveLength(1);
  });

  it("stops on the first day of the offseason, or at year end when asked", () => {
    expect(run.calendar).toEqual({ season: 2027, phase: "OFF_EVAL", week: 1, day: 1 });
    const year = runSeason({ league, season: 2027, seed: "season-1", resolve: fake, through: "YEAR" });
    expect(year.calendar).toMatchObject({ season: 2027, phase: "OFF_SUMMER", day: 7 });
    expect(year.state).toEqual(run.state);
  });

  it("is deterministic: same inputs give the identical season, a different seed a different one", () => {
    expect(runSeason({ league, season: 2027, seed: "season-1", resolve: fake })).toEqual(run);
    const other = runSeason({ league, season: 2027, seed: "season-2", resolve: fake });
    expect(other.state.results).not.toEqual(run.state.results);
  });

  it("replays a level playoff game on a fresh seed instead of crowning nobody", () => {
    const seeds: string[] = [];
    const levelOnce: GameResolver = (game, seed) => {
      if (game.kind === "REGULAR") return fake(game, seed);
      seeds.push(seed);
      const level = !seed.includes("/replay-");
      return { gameId: game.gameId, home: game.home, away: game.away, homeScore: level ? 10 : 13, awayScore: 10, reason: level ? "TIE" : "OVERTIME", seed };
    };
    const r = runSeason({ league, season: 2027, seed: "season-1", resolve: levelOnce });
    expect(r.state.bracket!.champion).toBeDefined();
    expect(seeds).toHaveLength(26);
    expect(r.state.results.filter((x: GameResult) => x.seed.endsWith("/replay-1"))).toHaveLength(13);
  });

  it("rejects a resolver that answers for the wrong game", () => {
    const wrong: GameResolver = (game, seed) => ({ ...fake(game, seed), home: game.away, away: game.home });
    expect(() => runSeason({ league, season: 2027, seed: "s", resolve: wrong })).toThrow(/resolver answered/);
  });

  it("survives a JSON round-trip (it goes into the save file)", () => {
    expect(JSON.parse(JSON.stringify(run.state))).toEqual(run.state);
  });

  it("onEvent sees every event in order, as it happens, and changes nothing (ADR-082 R2)", () => {
    const seen: number[] = [];
    const schedules = new Set<string>();
    const watched = runSeason({
      league, season: 2027, seed: "season-1", resolve: fake,
      onEvent: (envelope, schedule) => {
        seen.push(envelope.seq);
        schedules.add(JSON.stringify(schedule));
      },
    });
    expect(watched).toEqual(run);
    expect(seen).toEqual(run.events.map((e) => e.seq));
    expect([...schedules]).toEqual([JSON.stringify(run.state.schedule)]);
  });
});

describe("calendar clock: playoff games halt the advance button", () => {
  it("an open-ended advance from a playoff week's first day stops on its game day", () => {
    const world = { calendar: { season: 2027, phase: "PLAYOFFS" as const, week: 1, day: 1 }, leagueRules: DEFAULT_LEAGUE_RULES, season: run.state };
    expect(advance(world).world.calendar).toEqual({ season: 2027, phase: "PLAYOFFS", week: 1, day: 7 });
  });
});
