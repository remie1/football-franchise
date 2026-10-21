import { describe, it, expect } from "vitest";
import { createRng, DEFAULT_LEAGUE_RULES, type CalendarStamp } from "@ff/contracts";
import { buildLeague, runSeason, phaseWeeks, type GameResolver } from "../src/index.js";

/** The quick fake from runSeason.test.ts: a seeded coin flip on the score, ties allowed. */
const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7;
  const awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};

const league = buildLeague("world-1");
const base = { league, season: 2027, seed: "world-1", resolve: fake } as const;
const straight = runSeason(base);

/** The last day of every regular-season and playoff week, plus a mid-week day and camp. */
const stops: CalendarStamp[] = [
  { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 1 },
  { season: 2027, phase: "PRESEASON", week: 2, day: 3 },
  ...Array.from({ length: DEFAULT_LEAGUE_RULES.weeksPerSeason }, (_, i) => ({ season: 2027, phase: "REGULAR_SEASON" as const, week: i + 1, day: 7 })),
  { season: 2027, phase: "REGULAR_SEASON", week: 9, day: 4 },
  ...Array.from({ length: phaseWeeks("PLAYOFFS", DEFAULT_LEAGUE_RULES) }, (_, i) => ({ season: 2027, phase: "PLAYOFFS" as const, week: i + 1, day: 7 })),
];

describe("runSeason save and load: stop after a day, carry on from the save", () => {
  it.each(stops.map((s) => [`${s.phase} W${s.week}D${s.day}`, s] as const))("stopped after %s, then resumed, matches the straight season", (_, stop) => {
    const first = runSeason({ ...base, stopAfter: stop });
    expect(first.complete).toBe(false);
    expect(first.calendar).toEqual(stop);
    // Only games on or before the stop day are played.
    const all = [...first.state.schedule.games, ...(first.state.bracket?.games ?? [])];
    for (const r of first.state.results) {
      const g = all.find((x) => x.gameId === r.gameId)!;
      expect(g.at.phase === stop.phase ? g.at.week < stop.week || (g.at.week === stop.week && g.at.day <= stop.day) : true).toBe(true);
    }
    // The resolver is never asked about a game the save already holds.
    const asked = new Set<string>();
    const watching: GameResolver = (game, seed) => { asked.add(String(game.gameId)); return fake(game, seed); };
    const second = runSeason({ ...base, resolve: watching, resumeFrom: JSON.parse(JSON.stringify(first.state)) });
    for (const r of first.state.results) expect(asked.has(String(r.gameId))).toBe(false);
    expect(asked.size + first.state.results.length).toBe(straight.state.results.length);
    expect(second.complete).toBe(true);
    expect(JSON.stringify(second)).toBe(JSON.stringify(straight));
  });

  it("can stop twice and carry on twice", () => {
    const a = runSeason({ ...base, stopAfter: { season: 2027, phase: "REGULAR_SEASON", week: 5, day: 7 } });
    const b = runSeason({ ...base, resumeFrom: a.state, stopAfter: { season: 2027, phase: "PLAYOFFS", week: 2, day: 7 } });
    expect(b.complete).toBe(false);
    const c = runSeason({ ...base, resumeFrom: b.state });
    expect(JSON.stringify(c)).toBe(JSON.stringify(straight));
  });

  it("a straight run is unchanged by the new options", () => {
    expect(straight.complete).toBe(true);
    expect(JSON.stringify(runSeason({ ...base, resumeFrom: { ...straight.state, results: [] } }))).toBe(JSON.stringify(straight));
  });

  it("refuses a save from another seed or season, or with a result it never reaches", () => {
    const half = runSeason({ ...base, stopAfter: { season: 2027, phase: "REGULAR_SEASON", week: 9, day: 7 } }).state;
    expect(() => runSeason({ ...base, seed: "other", resumeFrom: half })).toThrow(/not season 2027/);
    expect(() => runSeason({ ...base, season: 2028, resumeFrom: half })).toThrow(/not season 2028/);
    const tampered = { ...half, results: half.results.map((r, i) => (i === 0 ? { ...r, seed: "made-up" } : r)) };
    expect(() => runSeason({ ...base, resumeFrom: tampered })).toThrow(/was not played in this season/);
    expect(() => runSeason({ ...base, resumeFrom: half, stopAfter: { season: 2027, phase: "REGULAR_SEASON", week: 2, day: 7 } })).toThrow(/did not reach/);
    expect(() => runSeason({ ...base, stopAfter: { season: 2026, phase: "OFF_SUMMER", week: 1, day: 1 } })).toThrow(/before the season starts/);
  });
});
