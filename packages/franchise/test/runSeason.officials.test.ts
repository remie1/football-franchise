/**
 * ADR-093 step 1: runSeason makes, assigns, carries and hands each game its crew, opt-in (§6.1 to
 * §6.3; the step-1 ledger's A6 and A12 in §16). Without `officiating` a season is exactly as before,
 * so no pinned season moves; with it, every game of the season gets one crew, week by week, and a
 * run stopped and carried on from its crews is the straight run, crews included (Iron Rule 4).
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_LEAGUE_RULES, createRng, type CalendarStamp, type OfficiatingCrew, type OfficiatingCrewId, type ScheduledGame } from "@ff/contracts";
import {
  assignWeek, buildLeague, carryCrews, crewWeek, makeCrews, phaseWeeks, runSeason, weekRng,
  type GameContext, type GameResolver, type OfficiatingInput, type SeasonRun,
} from "../src/index.js";
import { SEASON as PLAYERS_SEASON, league as playersLeague, resolve as playersResolve, startingPeople } from "./playersWorld.js";

/** The quick fake from runSeason.test.ts: a seeded coin flip on the score, ties allowed. */
const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7;
  const awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};

const rules = DEFAULT_LEAGUE_RULES;
const league = buildLeague("world-1");
const base = { league, season: 2027, seed: "world-1", resolve: fake } as const;
const NEW: OfficiatingInput = { kind: "NEW" };
const without = runSeason(base);
const straight = runSeason({ ...base, officiating: NEW });
const standing = (run: SeasonRun): OfficiatingInput => ({ kind: "STANDING", crews: run.officiating!.crews, assignments: run.officiating!.assignments });
const onDisk = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const at = (phase: CalendarStamp["phase"], week: number, day: number): CalendarStamp => ({ season: 2027, phase, week, day });

const gamesOf = (run: SeasonRun) => [...run.state.schedule.games, ...(run.state.bracket?.games ?? [])];
const idOrder = (a: ScheduledGame, b: ScheduledGame) => (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0);
/** The order the season draws its games' crews in: week by week, then by day and game id. */
const drawOrder = (run: SeasonRun) => [...gamesOf(run)].sort((a, b) => crewWeek(a.at, rules)! - crewWeek(b.at, rules)! || (a.at.day - b.at.day) || idOrder(a, b));
/** Every crew a run gave, with its game and the week the rule counts it in. */
function worked(run: SeasonRun) {
  const games = new Map(gamesOf(run).map((g) => [String(g.gameId), g]));
  return run.officiating!.assignments.map((a) => ({ game: games.get(String(a.game))!, crew: String(a.crew), week: crewWeek(games.get(String(a.game))!.at, rules)! }));
}
/** A crew on two games of one week, or on a team twice inside four weeks. */
function ruleBreaks(run: SeasonRun): string[] {
  const out: string[] = [];
  const all = worked(run);
  for (const a of all) for (const b of all) {
    if (a === b || a.crew !== b.crew || b.week < a.week) continue;
    const shared = [a.game.home, a.game.away].some((t) => t === b.game.home || t === b.game.away);
    if (b.week === a.week) out.push(`${a.crew} works two games in week ${a.week}`);
    else if (b.week - a.week < 4 && shared) out.push(`${a.crew} works ${String(a.game.gameId)} and ${String(b.game.gameId)}`);
  }
  return out;
}

/** The straight season's games in the order it draws their crews. */
const straightOrder = drawOrder(straight);

/**
 * The stops runSeason.resume.test.ts carries on from: camp, the preseason, every week's last day, and
 * one mid-week day. Then three playoff days before their week's games (the wild-card, divisional and
 * final weeks), where only the stop itself draws the week, from the bracket's games.
 */
const stops: CalendarStamp[] = [
  at("TRAINING_CAMP", 1, 1),
  at("PRESEASON", 2, 3),
  ...Array.from({ length: rules.weeksPerSeason }, (_, i) => at("REGULAR_SEASON", i + 1, 7)),
  at("REGULAR_SEASON", 9, 4),
  ...Array.from({ length: phaseWeeks("PLAYOFFS", rules) }, (_, i) => at("PLAYOFFS", i + 1, 7)),
  at("PLAYOFFS", 1, 1),
  at("PLAYOFFS", 2, 3),
  at("PLAYOFFS", 5, 3),
];

/** 50 seasons, each with its own schedule, for the rule and the workload. */
const fifty = Array.from({ length: 50 }, (_, i) => runSeason({ ...base, seed: `officials-${i + 1}`, officiating: NEW }));

describe("runSeason with the league's officials (ADR-093 step 1)", () => {
  it("without officiating, nothing changes", () => {
    const args: number[] = [];
    const asked = new Set<string>();
    const recording: GameResolver = (...a: Parameters<GameResolver>) => {
      args.push(a.length);
      asked.add(String(a[0].gameId));
      return fake(a[0], a[1]);
    };
    const run = runSeason({ ...base, resolve: recording });
    expect(asked.size).toBe(285);
    expect(args.every((n) => n === 2)).toBe(true);
    expect("officiating" in run).toBe(false);
    expect(JSON.stringify(run)).toBe(JSON.stringify(without));
    expect(JSON.stringify({ ...straight, officiating: undefined })).toBe(JSON.stringify(without));
  });

  it("with NEW, every game of the season has one crew", () => {
    const o = straight.officiating!;
    expect(o.season).toBe(2027);
    expect(o.crews).toEqual(makeCrews("world-1", 2027));
    expect(o.assignments).toHaveLength(285);
    expect(o.assignments.map((a) => a.game)).toEqual(straightOrder.map((g) => g.gameId));
    expect(new Set(o.assignments.map((a) => a.game)).size).toBe(285);
    const ids = new Set(o.crews.map((c) => String(c.id)));
    for (const a of o.assignments) expect(ids.has(String(a.crew))).toBe(true);
    expect(Object.keys(o)).toEqual(["season", "crews", "assignments"]);
    expect(Object.keys(straight).at(-1)).toBe("officiating");
  });

  it("keeps the four-week rule all season, playoffs included, and no crew works two games in a week", () => {
    for (const run of fifty) {
      expect(run.officiating!.assignments).toHaveLength(285);
      expect(worked(run).some((w) => w.week > rules.weeksPerSeason)).toBe(true);
      expect(ruleBreaks(run)).toEqual([]);
    }
  });

  it("spreads the work", () => {
    let even = 0;
    for (const run of fifty) {
      const games = new Map<string, number>(run.officiating!.crews.map((c) => [String(c.id), 0]));
      const playoffCrews: string[] = [];
      for (const w of worked(run)) {
        if (w.game.kind === "REGULAR") games.set(w.crew, games.get(w.crew)! + 1);
        else playoffCrews.push(w.crew);
      }
      for (const n of games.values()) {
        expect(n).toBeGreaterThanOrEqual(15);
        expect(n).toBeLessThanOrEqual(17);
      }
      expect(playoffCrews).toHaveLength(13);
      if ([...games.values()].every((n) => n === 16)) {
        even++;
        expect(new Set(playoffCrews).size).toBe(13);
      }
    }
    console.log(`ADR-093 step 1, games a crew: every crew worked 15 to 17 regular-season games in each of 50 seasons; exactly 16 each in ${even} of 50, and in each of those the 13 playoff games had 13 different crews`);
  });

  it("hands each game's crew to the resolver in its context, and the same crew to a replayed level playoff game", () => {
    const calls: { game: string; seed: string; people: unknown; context: GameContext | undefined; args: number }[] = [];
    const levelOnce: GameResolver = (...a: Parameters<GameResolver>) => {
      const [game, seed, people, context] = a;
      calls.push({ game: String(game.gameId), seed, people, context, args: a.length });
      if (game.kind === "REGULAR") return fake(game, seed);
      const level = !seed.includes("/replay-");
      return { gameId: game.gameId, home: game.home, away: game.away, homeScore: level ? 10 : 13, awayScore: 10, reason: level ? "TIE" : "OVERTIME", seed };
    };
    const r = runSeason({ ...base, resolve: levelOnce, officiating: NEW });
    const crewOf = new Map(r.officiating!.assignments.map((a) => [String(a.game), String(a.crew)]));
    const crews = new Map<string, OfficiatingCrew>(r.officiating!.crews.map((c) => [String(c.id), c]));
    expect(calls).toHaveLength(272 + 26);
    for (const c of calls) {
      expect(c.args).toBe(4);
      expect(c.people).toBeUndefined();
      expect(Object.keys(c.context!)).toEqual(["crew"]);
      expect(c.context!.crew).toBe(crews.get(crewOf.get(c.game)!));
    }
    const replayed = calls.filter((c) => c.seed.endsWith("/replay-1"));
    expect(replayed).toHaveLength(13);
    for (const c of replayed) {
      const firstTry = calls.find((x) => x.game === c.game && !x.seed.includes("/replay-"))!;
      expect(c.context!.crew).toBe(firstTry.context!.crew);
    }
  });

  it("hands each game the season's own frozen crew, so a resolver cannot change a crew for later games or the save", () => {
    let calls = 0;
    const refused: string[] = [];
    // A resolver that tries to write to the crew it is handed, which the type allows.
    const meddling: GameResolver = (game, seed, _people, context) => {
      calls++;
      const crew = context!.crew!;
      try { crew.leans.SNAP = 99; } catch (e) { refused.push((e as Error).name); }
      try { crew.referee = "Someone Else"; } catch (e) { refused.push((e as Error).name); }
      return fake(game, seed);
    };
    const run = runSeason({ ...base, resolve: meddling, officiating: NEW });
    expect(JSON.stringify(run.officiating)).toBe(JSON.stringify(straight.officiating));
    for (const c of run.officiating!.crews) expect(Object.isFrozen(c) && Object.isFrozen(c.leans)).toBe(true);
    // A season carried in, and one carried on from a save: the crews a caller hands in are copied,
    // never frozen in place, and the season's own copies are frozen.
    const next = runSeason({ ...base, season: 2028, resolve: meddling, officiating: { kind: "CARRY", from: straight.officiating! } });
    expect(next.officiating!.crews).toEqual(carryCrews(straight.officiating!.crews, "world-1", 2028));
    for (const c of next.officiating!.crews) expect(Object.isFrozen(c) && Object.isFrozen(c.leans)).toBe(true);
    const first = runSeason({ ...base, officiating: NEW, stopAfter: at("REGULAR_SEASON", 9, 4) });
    const given = onDisk({ kind: "STANDING", crews: first.officiating!.crews, assignments: first.officiating!.assignments } as const);
    const rest = runSeason({ ...base, resumeFrom: onDisk(first.state), resolve: meddling, officiating: given });
    expect(JSON.stringify(rest)).toBe(JSON.stringify(straight));
    for (const c of given.crews) expect(Object.isFrozen(c) || Object.isFrozen(c.leans)).toBe(false);
    for (const c of rest.officiating!.crews) expect(Object.isFrozen(c) && Object.isFrozen(c.leans)).toBe(true);
    // Every write was refused.
    expect(calls).toBeGreaterThan(285 + 285);
    expect(refused).toHaveLength(2 * calls);
    expect(new Set(refused)).toEqual(new Set(["TypeError"]));
  });

  it("changes no result and no event", () => {
    expect(JSON.stringify(straight.state)).toBe(JSON.stringify(without.state));
    expect(JSON.stringify(straight.events)).toBe(JSON.stringify(without.events));
    expect(straight.calendar).toEqual(without.calendar);
  });

  it("is deterministic", () => {
    const again = runSeason({ ...base, officiating: NEW });
    expect(JSON.stringify(again.officiating)).toBe(JSON.stringify(straight.officiating));
    const other = runSeason({ ...base, seed: "world-2", officiating: NEW });
    expect(other.officiating!.crews.map((c) => c.leans)).not.toEqual(straight.officiating!.crews.map((c) => c.leans));
    expect(other.officiating!.assignments).not.toEqual(straight.officiating!.assignments);
  });

  it("keeps world-1's 2027 crews as recorded, playoffs included: a change to the draw is deliberate, since saves with crews then stop loading", () => {
    // The regular season is the week-by-week draw that officials.assign.test.ts keeps as recorded.
    const chain: { game: ScheduledGame; crew: OfficiatingCrewId }[] = [];
    for (let w = 1; w <= rules.weeksPerSeason; w++) {
      const games = straight.state.schedule.games.filter((g) => g.at.week === w);
      const got = assignWeek({ crews: straight.officiating!.crews, games, earlier: chain, rules, rng: weekRng("world-1", 2027, w) });
      chain.push(...got.map((a) => ({ game: games.find((g) => g.gameId === a.game)!, crew: a.crew })));
    }
    expect(straight.officiating!.assignments.slice(0, 272)).toEqual(chain.map(({ game, crew }) => ({ game: game.gameId, crew })));
    // The playoffs' crews by number, round by round (crew weeks 19, 20, 21 and 23; week 22 has no games).
    // readSave replays the draw and refuses saved crews that are not it (ADR-093 §16 A12): re-record
    // these only on purpose, and say so in the step's note to the owner.
    const playoffs = worked(straight).filter((w) => w.week > rules.weeksPerSeason);
    const rounds = [1, 2, 3, 5].map((r) => playoffs.filter((w) => w.week === rules.weeksPerSeason + r).map((w) => w.crew.slice(-2)).join(" "));
    expect(rounds).toEqual(["01 04 02 11 13 03", "10 12 08 17", "05 06", "15"]);
    expect(playoffs).toHaveLength(13);
  });

  it.each(stops.map((s) => [`${s.phase} W${s.week}D${s.day}`, s] as const))(
    "stopped after %s with crews, then carried on from STANDING, matches the straight season, crews included",
    (_, stop) => {
      const first = runSeason({ ...base, officiating: NEW, stopAfter: stop });
      expect(first.complete).toBe(false);
      // The stop's week is drawn, and nothing after it: the straight run's crews up to the stop's week.
      const week = crewWeek(stop, rules) ?? 0;
      const reached = straight.officiating!.assignments.filter((_a, i) => crewWeek(straightOrder[i]!.at, rules)! <= week);
      expect(first.officiating!.assignments).toEqual(reached);
      if (stop.phase === "TRAINING_CAMP" || stop.phase === "PRESEASON") expect(first.officiating!.assignments).toEqual([]);
      if (stop.phase === "PLAYOFFS" && stop.week === 4) {
        // The week off before the final: crew week 22 has no games, so it has no crews.
        expect(first.officiating!.assignments).toHaveLength(272 + 6 + 4 + 2);
        expect(worked(first).some((w) => w.week === rules.weeksPerSeason + 4)).toBe(false);
      }
      const saved = onDisk({ state: first.state, officiating: standing(first) });
      const second = runSeason({ ...base, resumeFrom: saved.state, officiating: saved.officiating });
      expect(second.complete).toBe(true);
      expect(JSON.stringify(second)).toBe(JSON.stringify(straight));
    },
  );

  it("a run stopped in game week has that week's crews before its games are played", () => {
    const stop = at("REGULAR_SEASON", 9, 4);
    const first = runSeason({ ...base, officiating: NEW, stopAfter: stop });
    const week9 = first.state.schedule.games.filter((g) => g.at.week === 9);
    expect(week9).toHaveLength(14);
    const crewOf = new Map(first.officiating!.assignments.map((a) => [String(a.game), a.crew]));
    for (const g of week9) {
      expect(crewOf.has(String(g.gameId))).toBe(true);
      expect(first.state.results.some((r) => r.gameId === g.gameId)).toBe(false);
    }
    expect(first.state.schedule.games.filter((g) => g.at.week === 10).some((g) => crewOf.has(String(g.gameId)))).toBe(false);
  });

  it("refuses saved crews that are not this season's draw", () => {
    const first = runSeason({ ...base, officiating: NEW, stopAfter: at("REGULAR_SEASON", 9, 4) });
    const swap = (week: number) => {
      const a = [...first.officiating!.assignments];
      const [i, j] = a.flatMap((x, k) => (String(x.game).includes(`-W${String(week).padStart(2, "0")}-`) ? [k] : [])).slice(0, 2) as [number, number];
      [a[i], a[j]] = [{ ...a[i]!, crew: a[j]!.crew }, { ...a[j]!, crew: a[i]!.crew }];
      return a;
    };
    // Week 9's crews are saved, its games not yet played; week 3's were played.
    for (const week of [9, 3]) {
      expect(() => runSeason({ ...base, resumeFrom: first.state, officiating: { kind: "STANDING", crews: first.officiating!.crews, assignments: swap(week) } }))
        .toThrow(new RegExp(`runSeason: the saved crew for S2027-W0${week}-\\S+ is not this season's draw`));
    }
  });

  it("refuses a week only partly given, crews for games the run never reaches, and saved results with no saved crews", () => {
    const mid = runSeason({ ...base, officiating: NEW, stopAfter: at("REGULAR_SEASON", 9, 4) });
    const crews = mid.officiating!.crews;
    const all = mid.officiating!.assignments;
    const inWeek = (week: number) => (a: { game: unknown }) => String(a.game).includes(`-W${String(week).padStart(2, "0")}-`);
    const partly = all.filter((a) => a !== all.find(inWeek(9)));
    expect(() => runSeason({ ...base, resumeFrom: mid.state, officiating: { kind: "STANDING", crews, assignments: partly } }))
      .toThrow("runSeason: the save gives crews to only some of week 9's games");
    expect(() => runSeason({ ...base, resumeFrom: mid.state, stopAfter: at("REGULAR_SEASON", 8, 7), officiating: { kind: "STANDING", crews, assignments: all } }))
      .toThrow(/^runSeason: the save has crews for games this run did not reach \(S2027-W09-/);
    const bare = all.filter((a) => !inWeek(3)(a));
    expect(() => runSeason({ ...base, resumeFrom: mid.state, officiating: { kind: "STANDING", crews, assignments: bare } }))
      .toThrow(/^runSeason: the save has a result but no crew for S2027-W03-/);
    const one = all.filter((a) => a !== all.find(inWeek(3)));
    expect(() => runSeason({ ...base, resumeFrom: mid.state, officiating: { kind: "STANDING", crews, assignments: one } }))
      .toThrow(/^runSeason: the save has a result but no crew for S2027-W03-/);
    const twice = [...all, all[0]!];
    expect(() => runSeason({ ...base, resumeFrom: mid.state, officiating: { kind: "STANDING", crews, assignments: twice } }))
      .toThrow(/^runSeason: the save gives S2027-W01-\S+ two crews/);
  });

  it("refuses NEW or CARRY in a resumed season, CARRY from any season but the last, and STANDING assignments without a resumed season", () => {
    const mid = runSeason({ ...base, officiating: NEW, stopAfter: at("REGULAR_SEASON", 9, 7) });
    const o = mid.officiating!;
    expect(() => runSeason({ ...base, resumeFrom: mid.state, officiating: NEW })).toThrow(/runSeason: a season carried on from a save keeps the crews it has/);
    expect(() => runSeason({ ...base, season: 2028, resumeFrom: { ...mid.state, season: 2028 }, officiating: { kind: "CARRY", from: o } }))
      .toThrow(/not season 2028/); // the saved season is checked first
    const year2028 = runSeason({ ...base, season: 2028, officiating: { kind: "CARRY", from: o }, stopAfter: { season: 2028, phase: "REGULAR_SEASON", week: 2, day: 7 } });
    expect(() => runSeason({ ...base, season: 2028, resumeFrom: year2028.state, officiating: { kind: "CARRY", from: o } }))
      .toThrow(/runSeason: a season carried on from a save keeps the crews it has/);
    expect(() => runSeason({ ...base, season: 2029, officiating: { kind: "CARRY", from: o } })).toThrow("runSeason: the crews carried in are 2027's, but season 2029 carries in 2028's");
    expect(() => runSeason({ ...base, officiating: { kind: "CARRY", from: o } })).toThrow("runSeason: the crews carried in are 2027's, but season 2027 carries in 2026's");
    expect(() => runSeason({ ...base, season: 2028, officiating: { kind: "CARRY", from: { ...o, crews: o.crews.slice(1) } } }))
      .toThrow("runSeason: the crews carried in are not a league's (there are 16 crews, not 17)");
    expect(() => runSeason({ ...base, officiating: { kind: "STANDING", crews: o.crews, assignments: o.assignments } }))
      .toThrow("runSeason: saved crews for games need the season they were saved in (resumeFrom)");
    expect(() => runSeason({ ...base, officiating: { kind: "STANDING", crews: o.crews.slice(1), assignments: [] } }))
      .toThrow("runSeason: the crews are not a league's (there are 16 crews, not 17)");
    // A league's standing crews with nothing given yet start a season as NEW's would.
    expect(JSON.stringify(runSeason({ ...base, officiating: { kind: "STANDING", crews: o.crews, assignments: [] } }))).toBe(JSON.stringify(straight));
  });

  it("a season carried on from a save with no crews plays on without them", () => {
    const first = runSeason({ ...base, stopAfter: at("REGULAR_SEASON", 9, 7) });
    const second = runSeason({ ...base, resumeFrom: onDisk(first.state) });
    expect("officiating" in second).toBe(false);
    expect(JSON.stringify(second)).toBe(JSON.stringify(without));
  });

  it("carries the crews into the next season", () => {
    const next = runSeason({ ...base, season: 2028, officiating: { kind: "CARRY", from: straight.officiating! } });
    const o = next.officiating!;
    expect(o.season).toBe(2028);
    expect(o.crews.map((c) => [c.id, c.referee])).toEqual(straight.officiating!.crews.map((c) => [c.id, c.referee]));
    expect(o.crews).toEqual(carryCrews(straight.officiating!.crews, "world-1", 2028));
    expect(o.crews.map((c) => c.leans)).not.toEqual(straight.officiating!.crews.map((c) => c.leans));
    expect(o.assignments).toHaveLength(285);
    expect(o.assignments.map((a) => a.game)).toEqual(drawOrder(next).map((g) => g.gameId));
    expect(o.assignments.every((a) => String(a.game).startsWith("S2028-"))).toBe(true);
    expect(ruleBreaks(next)).toEqual([]);
    // The season itself is the one played without crews.
    expect(JSON.stringify({ ...next, officiating: undefined })).toBe(JSON.stringify(runSeason({ ...base, season: 2028 })));
  });

  it("with people and the players' steps on, the same crews and assignments as without them", () => {
    const both = { development: true, injuries: true } as const;
    const players = { league: playersLeague, season: PLAYERS_SEASON, seed: playersLeague.seed, resolve: playersResolve, officiating: NEW } as const;
    const plain = runSeason(players);
    const stepped = runSeason({ ...players, people: startingPeople(), players: both });
    expect(stepped.stepEvents!.length).toBeGreaterThan(0);
    expect(JSON.stringify(stepped.officiating)).toBe(JSON.stringify(plain.officiating));
    const week9 = { season: PLAYERS_SEASON, phase: "REGULAR_SEASON", week: 9, day: 7 } as const;
    const first = runSeason({ ...players, people: startingPeople(), players: both, stopAfter: week9 });
    const second = runSeason({
      ...players, people: first.people!, players: both, resumeFrom: first.state, stepsDoneThrough: first.calendar,
      resumeEvents: first.stepEvents!.map((e) => e.envelope), officiating: standing(first),
    });
    expect(JSON.stringify(second.officiating)).toBe(JSON.stringify(plain.officiating));
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(stepped.events));
  }, 120_000);

  it("a YEAR run hands back this season's crews", () => {
    const year = runSeason({ ...base, through: "YEAR", officiating: NEW });
    expect(year.calendar).toMatchObject({ season: 2027, phase: "OFF_SUMMER", day: 7 });
    expect(year.officiating!.season).toBe(2027);
    expect(JSON.stringify(year.officiating)).toBe(JSON.stringify(straight.officiating));
  });

  it("can stop twice and carry on twice with crews", () => {
    const a = runSeason({ ...base, officiating: NEW, stopAfter: at("REGULAR_SEASON", 5, 7) });
    const b = runSeason({ ...base, resumeFrom: onDisk(a.state), officiating: onDisk(standing(a)), stopAfter: at("PLAYOFFS", 2, 7) });
    expect(b.complete).toBe(false);
    const c = runSeason({ ...base, resumeFrom: onDisk(b.state), officiating: onDisk(standing(b)) });
    expect(JSON.stringify(c)).toBe(JSON.stringify(straight));
  });

  it("can stop twice mid-week, before the week's games, and carry on twice with crews", () => {
    // Each stop draws its own week. At REGULAR_SEASON W5D3, weeks 1 to 5 have crews (78 games) and
    // week 5's 14 games are not yet played.
    const a = runSeason({ ...base, officiating: NEW, stopAfter: at("REGULAR_SEASON", 5, 3) });
    expect(a.state.results).toHaveLength(78 - 14);
    expect(a.officiating!.assignments).toEqual(straight.officiating!.assignments.slice(0, 78));
    // At PLAYOFFS W2D3, the 4 divisional games have crews too; of the playoffs, only the wild-card round is played.
    const b = runSeason({ ...base, resumeFrom: onDisk(a.state), officiating: onDisk(standing(a)), stopAfter: at("PLAYOFFS", 2, 3) });
    expect(b.complete).toBe(false);
    expect(b.state.results).toHaveLength(272 + 6);
    expect(b.officiating!.assignments).toEqual(straight.officiating!.assignments.slice(0, 272 + 6 + 4));
    const c = runSeason({ ...base, resumeFrom: onDisk(b.state), officiating: onDisk(standing(b)) });
    expect(JSON.stringify(c)).toBe(JSON.stringify(straight));
  });
});
