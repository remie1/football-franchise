/**
 * ADR-093 step 1: each week's crews (§6.2, Q3, ruled: "no crew working the same team twice in four
 * weeks"; the step-1 ledger's A6 in §16). Iron Rule 4: a week's crews are a pure function of the
 * crews, the week's games, the earlier assignments and the week's stream, which is always drawn
 * 17 times.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, createRng, gameId, teamId,
  type CalendarStamp, type OfficiatingCrewId, type Rng, type ScheduledGame,
} from "@ff/contracts";
import { assignWeek, buildLeague, buildSchedule, crewIdFor, crewWeek, makeCrews, weekRng, type CrewAssignment } from "../src/index.js";

const rules = DEFAULT_LEAGUE_RULES;
const SEASON = 2027;
const crews = makeCrews("officials-1", SEASON);
const pad = (n: number) => String(n).padStart(2, "0");
const team = (i: number) => teamId(`T${pad(i)}`);
const regular = (week: number): CalendarStamp => ({ season: SEASON, phase: "REGULAR_SEASON", week, day: 7 });

/** A made-up game; `n` orders the games of one week by id. */
function game(week: number, n: number, home: number, away: number, at: CalendarStamp = regular(week)): ScheduledGame {
  return { gameId: gameId(`S${SEASON}-W${pad(week)}-G${pad(n)}-T${pad(away)}@T${pad(home)}`), season: SEASON, kind: "REGULAR", at, home: team(home), away: team(away), neutralSite: false };
}
/** Every team once: a random pairing of `teams` teams, from `rng`. */
function randomWeek(rng: Rng, week: number, teams = 32): ScheduledGame[] {
  const order = Array.from({ length: teams }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = rng.int(0, i); [order[i], order[j]] = [order[j]!, order[i]!]; }
  return Array.from({ length: teams / 2 }, (_, k) => game(week, k, order[2 * k]!, order[2 * k + 1]!));
}
type Earlier = { game: ScheduledGame; crew: OfficiatingCrewId };
const withGames = (games: readonly ScheduledGame[], got: readonly CrewAssignment[]): Earlier[] =>
  got.map((a) => ({ game: games.find((g) => g.gameId === a.game)!, crew: a.crew }));

/** Every way a season's assignments break the rules: a crew on two games of a week, or on a team inside four weeks. */
function ruleBreaks(history: readonly Earlier[]): string[] {
  const out: string[] = [];
  for (const a of history) for (const b of history) {
    if (a === b || a.crew !== b.crew) continue;
    const gap = crewWeek(b.game.at, rules)! - crewWeek(a.game.at, rules)!;
    const shared = [a.game.home, a.game.away].some((t) => t === b.game.home || t === b.game.away);
    if (gap === 0) out.push(`${String(a.crew)} works two games in week ${crewWeek(a.game.at, rules)}`);
    else if (gap > 0 && gap < 4 && shared) out.push(`${String(a.crew)} works ${String(a.game.gameId)} and ${String(b.game.gameId)}`);
  }
  return out;
}

/** A stub stream: hands out `keys` from `next()` and refuses every other draw, counting what it gave. */
function keyStream(keys: readonly number[]): Rng & { readonly given: number } {
  let i = 0;
  const no = (what: string) => (): never => { throw new Error(`the stub stream draws only next(), not ${what}`); };
  return {
    next: () => { if (i >= keys.length) throw new Error("the stub stream ran out"); return keys[i++]!; },
    int: no("int"), d100: no("d100"), d20: no("d20"), pick: no("pick"), fork: no("fork"),
    seed: "stub", label: "stub",
    get given() { return i; },
  };
}
const evenKeys = Array.from({ length: 17 }, (_, i) => (i + 0.5) / 17);

// A real season's regular-season weeks, assigned one after another.
const league = buildLeague("world-1");
const schedule = buildSchedule(league, SEASON, "world-1", { rules });
const season: Earlier[] = [];
for (let w = 1; w <= rules.weeksPerSeason; w++) {
  const games = schedule.games.filter((g) => g.at.week === w);
  season.push(...withGames(games, assignWeek({ crews, games, earlier: season, rules, rng: weekRng("world-1", SEASON, w) })));
}

describe("each week's crews (ADR-093 step 1, §6.2, Q3)", () => {
  it("gives each of a week's games one crew, and no crew two games", () => {
    for (let w = 1; w <= rules.weeksPerSeason; w++) {
      const games = schedule.games.filter((g) => g.at.week === w);
      const got = season.filter((e) => e.game.at.week === w);
      expect(got.map((e) => e.game.gameId)).toEqual(games.map((g) => g.gameId));
      expect(new Set(got.map((e) => e.crew)).size).toBe(games.length);
      for (const e of got) expect(crews.some((c) => c.id === e.crew)).toBe(true);
    }
    expect(season).toHaveLength(272);
  });

  it("never gives a crew a team it worked in the three weeks before, byes included", () => {
    expect(schedule.byes.length).toBeGreaterThan(0);
    expect(ruleBreaks(season)).toEqual([]);
    // T01 plays in week 5 for crew-01, the crew with the fewest games, then sits two weeks. In week 8
    // (three weeks on, the off weeks counted) crew-01 is barred from T01's game; in week 9 it is not.
    const others = crews.slice(1).flatMap((c, i) => [game(1, i, 10 + (i % 11), 21 + (i % 11)), game(2, i, 10 + (i % 11), 21 + (i % 11))].map((g) => ({ game: g, crew: c.id })));
    const earlier: Earlier[] = [{ game: game(5, 0, 1, 2), crew: crewIdFor(0) }, ...others];
    const week8 = assignWeek({ crews, games: [game(8, 0, 1, 3)], earlier, rules, rng: keyStream(evenKeys) });
    expect(week8[0]!.crew).not.toBe(crewIdFor(0));
    const week9 = assignWeek({ crews, games: [game(9, 0, 1, 3)], earlier, rules, rng: keyStream(evenKeys) });
    expect(week9[0]!.crew).toBe(crewIdFor(0));
  });

  it("finds a crew for every game where a first-come pick would fail", () => {
    // A week found by simulating the rule on made-up schedules for the step-1 build plan (seed 7,
    // season 197, week 2; a first-come pick failed in 3.74% of 3,000 seasons' weeks there, COMPUTED):
    // week 1's 16 crews, week 2's games and the 17 keys, as [home, away] team numbers and crew numbers from 0.
    const games2: [number, number][] = [[2, 31], [4, 13], [23, 17], [11, 27], [5, 16], [15, 12], [18, 24], [22, 8], [3, 29], [19, 21], [25, 28], [20, 26], [14, 30], [7, 1], [6, 0], [10, 9]];
    const week1: [number, number, number][] = [[12, 11, 2], [3, 8, 3], [10, 26, 5], [8, 7, 0], [14, 27, 6], [7, 22, 29], [2, 13, 12], [1, 20, 16], [6, 14, 23], [5, 25, 1], [11, 4, 28], [15, 10, 31], [13, 24, 21], [4, 17, 30], [16, 18, 19], [0, 15, 9]];
    const keys = [0.6967266244429983, 0.23158802132476564, 0.007986424531509995, 0.11657533265954911, 0.4217564304031207, 0.3239576368037783, 0.5454892372733212, 0.15376830926856344, 0.09953112478730397, 0.19430361664360507, 0.3426767725330966, 0.3377619224404568, 0.20909087940668802, 0.1624230998293389, 0.5347562981905593, 0.8822672130435093, 0.4694904031607937];
    const reference = [0, 14, 5, 16, 6, 12, 4, 10, 11, 1, 13, 8, 7, 3, 2, 9]; // the simulation's own matching, game by game
    const games = games2.map(([h, a], n) => game(2, n, h, a));
    const earlier = week1.map(([c, h, a], n) => ({ game: game(1, n, h, a), crew: crewIdFor(c) }));

    // The priority (fewest games first, then the key): crew 9 worked no game in week 1.
    const worked = (c: number) => earlier.filter((e) => e.crew === crewIdFor(c)).length;
    const priority = Array.from({ length: 17 }, (_, c) => c).sort((a, b) => worked(a) - worked(b) || keys[a]! - keys[b]!);
    expect(priority).toEqual([9, 2, 8, 3, 7, 13, 12, 1, 5, 11, 10, 4, 16, 14, 6, 0, 15]);
    // A first-come pick in that order fills 15 games and is left with crews 0 and 15 for T10 against T09,
    // and both worked one of them in week 1.
    const barredFrom = (c: number, g: ScheduledGame) => earlier.some((e) => e.crew === crewIdFor(c) && [e.game.home, e.game.away].some((t) => t === g.home || t === g.away));
    const used: number[] = [];
    const stuck = games.findIndex((g) => {
      const c = priority.find((p) => !used.includes(p) && !barredFrom(p, g));
      if (c === undefined) return true;
      used.push(c);
      return false;
    });
    expect(stuck).toBe(15);
    expect(priority.filter((p) => !used.includes(p))).toEqual([0, 15]);

    const stream = keyStream(keys);
    const got = assignWeek({ crews, games, earlier, rules, rng: stream });
    expect(got.map((a) => a.game)).toEqual(games.map((g) => g.gameId));
    expect(new Set(got.map((a) => a.crew)).size).toBe(16);
    expect(ruleBreaks([...earlier, ...withGames(games, got)])).toEqual([]);
    // The first 16 crews in priority cover the week: the last, crew 15, sits.
    expect(got.map((a) => a.crew)).not.toContain(crewIdFor(15));
    expect(got.map((a) => a.crew)).toEqual(reference.map((c) => crewIdFor(c)));
    expect(stream.given).toBe(17);
  });

  it("always finds one: 1,000 random 16-game weeks whose history keeps the rule", () => {
    for (let t = 0; t < 1000; t++) {
      const rng = createRng(`officials-property-${t}`, "weeks");
      const history: Earlier[] = [];
      for (let w = 1; w <= 4; w++) {
        const games = randomWeek(rng, w);
        const got = assignWeek({ crews, games, earlier: history, rules, rng: rng.fork(`week/${w}`) });
        expect(got).toHaveLength(16);
        history.push(...withGames(games, got));
      }
      expect(ruleBreaks(history)).toEqual([]);
    }
  });

  it("draws 17 numbers a week whatever the matching does", () => {
    const weeks: [string, ScheduledGame[], Earlier[]][] = [
      ["a full week", schedule.games.filter((g) => g.at.week === 1), []],
      ["a bye week", schedule.games.filter((g) => g.at.week === 6), season.filter((e) => e.game.at.week < 6)],
      ["one game", [game(3, 0, 1, 2)], []],
      // The fewest-games crew is barred, so the matching widens to the next one.
      ["a widened week", [game(4, 0, 1, 2)], [{ game: game(3, 0, 1, 5), crew: crewIdFor(0) }, ...crews.slice(1).map((c, i) => ({ game: game(1, i, 6 + i, 31), crew: c.id })), ...crews.slice(1).map((c, i) => ({ game: game(2, i, 6 + i, 30), crew: c.id }))]],
    ];
    for (const [name, games, earlier] of weeks) {
      const stream = keyStream(evenKeys);
      assignWeek({ crews, games, earlier, rules, rng: stream });
      expect(stream.given, name).toBe(17);
    }
  });

  it("puts the crews with the fewest games first", () => {
    // Week 1: crew-05 sits. Week 2: whatever the draw, crew-05, one game behind, works.
    const week1 = randomWeek(createRng("officials-fewest", "week-1"), 1);
    const sitting = crewIdFor(4);
    const earlier = week1.map((g, i) => ({ game: g, crew: crews.filter((c) => c.id !== sitting)[i]!.id }));
    const sat = new Set<string>();
    for (let k = 0; k < 20; k++) {
      const games = randomWeek(createRng(`officials-fewest-${k}`, "week-2"), 2);
      const got = assignWeek({ crews, games, earlier, rules, rng: weekRng(`officials-fewest-${k}`, SEASON, 2) });
      expect(got.map((a) => a.crew)).toContain(sitting);
      sat.add(String(crews.find((c) => !got.some((a) => a.crew === c.id))!.id));
    }
    // The crew that sits in week 2 is the draw's: not always the same one.
    expect(sat.size).toBeGreaterThan(1);
  });

  it("numbers playoff weeks after the regular season, so the rule runs from week 18 into the wild-card round", () => {
    expect(crewWeek({ season: SEASON, phase: "REGULAR_SEASON", week: 1, day: 7 }, rules)).toBe(1);
    expect(crewWeek({ season: SEASON, phase: "REGULAR_SEASON", week: 18, day: 7 }, rules)).toBe(18);
    expect(crewWeek({ season: SEASON, phase: "PLAYOFFS", week: 1, day: 7 }, rules)).toBe(19);
    expect(crewWeek({ season: SEASON, phase: "PLAYOFFS", week: 5, day: 1 }, rules)).toBe(23);
    expect(crewWeek({ season: SEASON, phase: "PLAYOFFS", week: 1, day: 7 }, { ...rules, weeksPerSeason: 17 })).toBe(18);
    expect(crewWeek({ season: SEASON, phase: "OFF_EVAL", week: 1, day: 1 }, rules)).toBeUndefined();
    for (const phase of ["TRAINING_CAMP", "PRESEASON", "OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER"] as const) {
      expect(crewWeek({ season: SEASON, phase, week: 1, day: 7 }, rules)).toBeUndefined();
    }
    // A crew that works a team in week 18 is barred from that team in the wild-card round.
    const wildCard = (n: number, home: number, away: number) => ({ ...game(19, n, home, away, { season: SEASON, phase: "PLAYOFFS", week: 1, day: 7 }), kind: "WILD_CARD" as const });
    const earlier = [{ game: game(18, 0, 1, 2), crew: crewIdFor(0) }];
    const got = assignWeek({ crews, games: [wildCard(0, 1, 3)], earlier: [...earlier, ...crews.slice(1).map((c, i) => ({ game: game(17, i, 10 + (i % 8), 20 + (i % 8)), crew: c.id })), ...crews.slice(1).map((c, i) => ({ game: game(16, i, 10 + (i % 8), 20 + (i % 8)), crew: c.id }))], rules, rng: keyStream(evenKeys) });
    expect(got[0]!.crew).not.toBe(crewIdFor(0));
  });

  it("refuses more games than crews, games from two weeks, and an empty list", () => {
    const rng = () => keyStream(evenKeys);
    expect(() => assignWeek({ crews, games: randomWeek(createRng("officials-36", "teams"), 1, 36), earlier: [], rules, rng: rng() })).toThrow(/18 games and only 17 crews/);
    expect(() => assignWeek({ crews, games: [game(1, 0, 1, 2), game(2, 0, 3, 4)], earlier: [], rules, rng: rng() })).toThrow(/more than one week/);
    expect(() => assignWeek({ crews, games: [], earlier: [], rules, rng: rng() })).toThrow(/a week with no games/);
    const camp = game(1, 0, 1, 2, { season: SEASON, phase: "PRESEASON", week: 1, day: 7 });
    expect(() => assignWeek({ crews, games: [camp], earlier: [], rules, rng: rng() })).toThrow(/not in a week the crews work/);
    expect(() => assignWeek({ crews: crews.slice(0, 16), games: [game(1, 0, 1, 2)], earlier: [], rules, rng: rng() })).toThrow(/the crews are not a league's \(there are 16 crews, not 17\)/);
  });

  it("is a pure function of its input, whatever order the crews and games come in", () => {
    const games = schedule.games.filter((g) => g.at.week === 9);
    const earlier = season.filter((e) => e.game.at.week < 9);
    const straight = assignWeek({ crews, games, earlier, rules, rng: weekRng("world-1", SEASON, 9) });
    expect(straight).toEqual(season.filter((e) => e.game.at.week === 9).map((e) => ({ game: e.game.gameId, crew: e.crew })));
    const shuffled = <T>(xs: readonly T[], seed: string): T[] => {
      const r = createRng(seed, "shuffle"); const out = [...xs];
      for (let i = out.length - 1; i > 0; i--) { const j = r.int(0, i); [out[i], out[j]] = [out[j]!, out[i]!]; }
      return out;
    };
    const frozen = <T>(xs: readonly T[]) => Object.freeze(xs.map((x) => Object.freeze({ ...x })));
    const input = { crews: frozen(shuffled(crews, "c")), games: frozen(shuffled(games, "g")), earlier: frozen(shuffled(earlier, "e")) };
    const before = JSON.stringify(input);
    expect(assignWeek({ ...input, rules, rng: weekRng("world-1", SEASON, 9) })).toEqual(straight);
    expect(JSON.stringify(input)).toBe(before);
    expect(assignWeek({ crews, games, earlier, rules, rng: weekRng("world-2", SEASON, 9) })).not.toEqual(straight);
  });

  it("draws a week on franchise:officials/<season>/week/<n>, one number a crew in id order: world-1's weeks rebuilt from that label alone", () => {
    for (let w = 1; w <= rules.weeksPerSeason; w++) {
      const label = `franchise:officials/${SEASON}/week/${w}`;
      expect(weekRng("world-1", SEASON, w).label).toBe(label);
      const documented = createRng("world-1", label);
      const keys = Array.from({ length: 17 }, () => documented.next());
      const games = schedule.games.filter((g) => g.at.week === w);
      const earlier = season.filter((e) => e.game.at.week < w);
      const week = season.filter((e) => e.game.at.week === w);
      // The label's 17 numbers give the week the season drew.
      expect(assignWeek({ crews, games, earlier, rules, rng: keyStream(keys) })).toEqual(week.map((e) => ({ game: e.game.gameId, crew: e.crew })));
      // Fewest games first, then the key. In every week of this season the first crews in that order
      // can cover the week's games, so they are the ones that work, and the rest sit.
      const worked = (c: number) => earlier.filter((e) => e.crew === crewIdFor(c)).length;
      const priority = Array.from({ length: 17 }, (_, c) => c).sort((a, b) => worked(a) - worked(b) || keys[a]! - keys[b]!);
      expect(new Set(week.map((e) => String(e.crew)))).toEqual(new Set(priority.slice(0, games.length).map((c) => String(crewIdFor(c)))));
    }
  });

  it("widens to the next crew in priority only when the crews before it cannot cover the week", () => {
    // Every crew worked one game, so the even keys put them in id order. crew-02 worked `bar` last week.
    const balanced = (bar: ScheduledGame): Earlier[] => crews.map((c, i) => ({ game: i === 1 ? bar : game(1, i, 10 + (i % 11), 21 + (i % 11)), crew: c.id }));
    const week = [game(5, 0, 1, 2), game(5, 1, 3, 4)];
    const crewsFor = (earlier: Earlier[]) => assignWeek({ crews, games: week, earlier, rules, rng: keyStream(evenKeys) }).map((a) => a.crew);
    // crew-02 worked T01: it cannot take the first game, but it can take the second. The first two crews
    // cover the week, so they work, where a matching over all 17 would give the first game to crew-03.
    expect(crewsFor(balanced(game(4, 0, 1, 20)))).toEqual([crewIdFor(0), crewIdFor(1)]);
    // crew-02 worked T01 and T03, so it can take neither game. The first two cannot cover the week, so the
    // next crew, crew-03, works the first game and crew-01 the second; crew-04 does not.
    expect(crewsFor(balanced(game(4, 0, 1, 3)))).toEqual([crewIdFor(2), crewIdFor(0)]);
  });

  it("keeps world-1's 2027 draw as recorded: a change to the draw is deliberate, since saves with crews then stop loading", () => {
    // Each week's crews by number, in its games' order (by day, then game id). readSave replays the draw
    // and refuses saved crews that are not it (ADR-093 §16 A12), so a change here stops every save with a
    // season and crews made before it from loading. Re-record these only on purpose, and say so in the
    // step's note to the owner.
    const drawn = Array.from({ length: rules.weeksPerSeason }, (_, i) =>
      season.filter((e) => e.game.at.week === i + 1).map((e) => String(e.crew).slice(-2)).join(" "));
    expect(drawn).toEqual([
      "10 14 09 04 05 17 08 06 01 07 16 15 03 13 02 11",
      "07 13 03 10 16 09 05 11 17 15 04 06 02 08 01 12",
      "05 15 11 13 10 08 17 01 04 02 06 03 07 12 16 14",
      "16 10 13 02 01 17 03 06 04 15 08 11 12 05 09 14",
      "01 17 04 03 16 05 12 06 14 08 02 15 09 07",
      "04 02 01 12 05 09 14 06 17 07 03 11 10 13",
      "07 03 09 08 17 04 15 01 12 14 10 16 13 11",
      "05 13 03 02 07 15 14 16 10 08 06 11 09 12",
      "02 16 05 14 07 13 06 08 01 11 10 12 09 15",
      "05 13 12 08 11 01 07 02 15 16 17 09 03 04",
      "01 14 16 05 15 09 03 12 11 07 02 10 04 06 17",
      "16 12 02 11 05 15 03 07 08 17 04 10 13 06 14",
      "05 12 02 03 15 07 17 14 04 06 01 10 09 13 08",
      "16 07 13 05 04 12 11 06 01 10 03 17 08 09 14",
      "05 11 12 13 07 06 02 10 17 15 08 04 14 16 09 01",
      "08 02 17 15 05 07 06 04 13 16 11 10 14 03 01 09",
      "07 03 09 17 10 14 08 13 04 12 06 15 11 16 02 01",
      "15 04 09 08 13 02 11 16 01 12 14 10 05 03 17 06",
    ]);
  });
});
