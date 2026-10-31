/**
 * The cap check's walk, widened for the 20-season check (ADR-087 D5b): the players' switches, the
 * watchers (`onDay`, `onEvent`, and `onRun`'s run with the people it started from), the staff
 * transform, the coaches' and the meeting's steps (the coaching world in the people), and the limbo
 * sweep.
 *
 * Switched off, `runSeason` is handed exactly today's setup (a copy of the walk's setup as it was
 * before the widening is kept below to compare with). Switched on, a walk stopped in the second week
 * of the 2026 regular season gives the same event stream on two runs, the same with a reader watching
 * every day as without one, and the same as a walk with no day watcher at all.
 *
 * `runSeason` is wrapped so a test can see what the walk hands it: by default the wrapper calls the
 * real one and changes nothing; a test may stop the walk there, or answer with a made-up season.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  compareStamps, gameId, positionOverall, teamId,
  type CalendarStamp, type FranchiseEventEnvelope, type PlayerId, type PlayerState, type ScheduledGame, type StaffState,
} from "@ff/contracts";
import { buildLeague, buildStaff, capForecast, type runSeason, type SeasonRun } from "@ff/franchise";
import { generateDraftClass } from "@ff/attributes";
import {
  limboPlayers, OPENING_ROOM, runCapCheck, sweepLimbo, transformStaff, withConditionRule, withDummyYearsVoid, type CapCheckInput,
} from "../src/season/capCheck.js";
import { armInput, COACH_STYLE_LINEUPS } from "../src/season/careerCheckRun.js";
import { runDraftCheck } from "../src/season/draftCheck.js";
import { unfilledPosition } from "../src/season/lineup.js";
import { peopleResolver, type SeasonPeople } from "../src/season/realSeason.js";
import { buildStandInLeague, readStandInFile } from "../src/season/standInLeague.js";

type SeasonInput = Parameters<typeof runSeason>[0];
type RunSeason = (input: SeasonInput) => SeasonRun;

const hook = vi.hoisted(() => ({ runSeason: undefined as undefined | ((input: never, real: never) => unknown) }));
vi.mock("@ff/franchise", async (importOriginal) => {
  const real = await importOriginal<typeof import("@ff/franchise")>();
  return {
    ...real,
    runSeason: (input: Parameters<typeof real.runSeason>[0]) =>
      hook.runSeason === undefined ? real.runSeason(input) : (hook.runSeason as (i: typeof input, r: typeof real.runSeason) => SeasonRun)(input, real.runSeason),
  };
});

/** Run `body` with `runSeason` answered by `answer` (given the real one), then put the real one back. */
function withRunSeason<T>(answer: (input: SeasonInput, real: RunSeason) => SeasonRun, body: () => T): T {
  hook.runSeason = answer as never;
  try {
    return body();
  } finally {
    hook.runSeason = undefined;
  }
}

const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
const file = readStandInFile(readFileSync(FILE, "utf8")) as CapCheckInput["file"];
const SEED = "cap-check-widen-test";
const json = (x: unknown) => JSON.stringify(x, (_k, v) => (v instanceof Set ? [...v] : v));
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

class Stop extends Error {}

/** The first season's `runSeason` input of a walk, caught and the walk stopped there. */
function firstSeasonInput(input: Omit<CapCheckInput, "seed" | "file" | "seasons">): SeasonInput {
  let caught: SeasonInput | undefined;
  withRunSeason((i) => { caught = i; throw new Stop("caught"); }, () => {
    expect(() => runCapCheck({ seed: SEED, file, seasons: 1, ...input })).toThrow(Stop);
  });
  return caught!;
}

/**
 * The walk's setup as it was before the widening (`runCapCheck` at 01b541b), copied: what its first
 * `runSeason` call was handed, and the rated league its resolver played.
 */
function todaysSetup(seed: string) {
  const base = buildLeague(seed);
  const { league, rated } = buildStandInLeague(base, file);
  const cap = capForecast(seed);
  const first = file.season;
  const staff = buildStaff(base, { firstSeason: first }).world.staff;
  const capHit = (c: NonNullable<typeof file.contracts>[number]) => c.years.find((y) => y.season === first)?.capHit ?? 0;
  const opening = new Map<string, number>();
  for (const c of file.contracts ?? []) opening.set(String(c.team), (opening.get(String(c.team)) ?? 0) + capHit(c));
  for (const d of file.deadMoney ?? []) if (d.season === first) opening.set(String(d.team), (opening.get(String(d.team)) ?? 0) + d.amount);
  const capCarryover = league.teams.map((t) => ({
    team: t.id, season: first, amount: Math.max(0, (opening.get(String(t.id)) ?? 0) - cap(first)) + OPENING_ROOM,
  }));
  const people: SeasonPeople = {
    capCarryover,
    teams: league.teams,
    players: [...rated.league.players],
    picks: (file.picks ?? []).map(withConditionRule),
    classes: [],
    freeAgents: [],
    contracts: (file.contracts ?? []).map((c) => withDummyYearsVoid(c, first)),
    deadMoney: [...(file.deadMoney ?? [])],
    staff: [...staff],
  };
  return { data: { league: { ...league, teams: people.teams }, season: first, seed: `${seed}/${first}`, people, through: "YEAR" }, rated, cap };
}

const GAME: ScheduledGame = {
  gameId: gameId("cap-check-widen-test-game"), season: 2026, kind: "REGULAR",
  at: { season: 2026, phase: "REGULAR_SEASON", week: 1, day: 7 }, home: teamId("T01"), away: teamId("T02"), neutralSite: false,
};

describe("the cap check's walk, switched off: runSeason is handed today's setup", () => {
  it("with players absent, empty, or both off, every part of the first season's input is today's", () => {
    const today = todaysSetup(SEED);
    const todayGame = json(peopleResolver(today.rated)(GAME, "game-seed", today.data.people));
    const todayClass = generateDraftClass({ seed: SEED, draft: 2027, usedNames: new Set(["A B"]) });
    for (const players of [undefined, {}, { development: false, injuries: false }]) {
      const input = firstSeasonInput(players === undefined ? {} : { players });
      // Nothing new is handed over: no players' steps, no coaches' or meeting's steps, no day steps, no event watcher.
      expect(Object.keys(input).sort()).toEqual(["draft", "league", "leagueYear", "people", "resolve", "season", "seed", "through"]);
      expect(input.people!.coaching).toBeUndefined();
      const { league, season, seed, people, through } = input;
      expect(json({ league, season, seed, people, through })).toBe(json(today.data));
      // The staff has no stored leanings, as before (they are stored only with a switch on).
      expect(people!.staff!.filter((s) => s.lineup !== undefined)).toEqual([]);
      // The money and draft settings: the same grade, the same cap, the same classes.
      expect(Object.keys(input.leagueYear!).sort()).toEqual(["cap", "rate"]);
      expect(Object.keys(input.draft!).sort()).toEqual(["cap", "makeClass", "rate"]);
      expect(input.draft!.cap).toBe(input.leagueYear!.cap);
      expect(input.draft!.rate).toBe(input.leagueYear!.rate);
      for (let s = 2026; s <= 2040; s++) expect(input.leagueYear!.cap(s)).toBe(today.cap(s));
      for (const p of people!.players) expect(input.leagueYear!.rate(p)).toBe(positionOverall(p.bio.position, p.attributes.values));
      expect(json(input.draft!.makeClass(2027, new Set(["A B"]))))
        .toBe(json({ draftClass: todayClass.draftClass, players: todayClass.players }));
      // The resolver plays the same rated league: one game, the same result and who-played report.
      expect(json(input.resolve(GAME, "game-seed", input.people))).toBe(todayGame);
    }
  }, 300_000);
});

describe("the cap check's walk, widened (made-up seasons answer runSeason)", () => {
  const strip = (p: PlayerState): PlayerState => { const { teamId: _t, ...rest } = p; return rest as PlayerState; };
  const ids = (n: number) => file.league.players.slice(n * 100, n * 100 + 1)[0]!.bio.id;
  // A: loses his team without joining the free agents (a reserve-list player after the league year);
  // B: a prospect on no team; C: on no team and a free agent already.
  const A = ids(1), B = ids(2), C = ids(3);
  const leaveSomeOut = (p: SeasonPeople): SeasonPeople => ({
    ...p,
    players: p.players.map((x) => (String(x.bio.id) === String(A) || String(x.bio.id) === String(C) ? strip(x)
      : String(x.bio.id) === String(B) ? { ...strip(x), bio: { ...x.bio, draft: "PROSPECT" as const } } : x)),
    freeAgents: p.freeAgents.some((id) => String(id) === String(C)) ? p.freeAgents : [...p.freeAgents, C],
  });
  /** A walk whose every season is answered with its starting people, `edit`ed, and no events. */
  function madeUpWalk(input: Omit<CapCheckInput, "seed" | "file">, edit: (p: SeasonPeople) => SeasonPeople = (p) => p) {
    const handed: SeasonInput[] = [];
    const returned: SeasonRun[] = [];
    const years = withRunSeason((i) => {
      handed.push(i);
      const run = {
        state: { season: i.season } as unknown as SeasonRun["state"],
        calendar: { season: i.season, phase: "OFF_SUMMER", week: 1, day: 7 } as CalendarStamp,
        events: [], complete: true, people: edit(i.people!),
      } satisfies SeasonRun;
      returned.push(run);
      return run;
    }, () => runCapCheck({ seed: SEED, file, ...input }));
    return { handed, returned, years };
  }

  it("onRun is handed the run and the people it started from; switched on, the limbo is swept after it", () => {
    const calls: Parameters<NonNullable<CapCheckInput["onRun"]>>[] = [];
    const seen: PlayerId[][] = [];
    const { handed, returned, years } = madeUpWalk({
      seasons: 2, players: { injuries: true },
      onRun: (...args) => { calls.push(args); seen.push([...args[2].freeAgents]); },
    }, leaveSomeOut);
    expect(years).toHaveLength(2);
    expect(calls.map((c) => c[0])).toEqual([2026, 2027]);
    for (let k = 0; k < 2; k++) {
      expect(calls[k]![3].run).toBe(returned[k]);
      expect(calls[k]![3].before).toBe(handed[k]!.people);
      expect(calls[k]![2]).toBe(returned[k]!.people);
    }
    // onRun sees the season's people as it left them: A in limbo, not yet a free agent.
    expect(limboPlayers(returned[0]!.people!)).toEqual([A]);
    expect(seen[0]).not.toContain(A);
    // The next season starts with A a free agent, after those already there; the prospect stays out, and C is not listed twice.
    expect(handed[1]!.people!.freeAgents).toEqual([...returned[0]!.people!.freeAgents, A]);
    expect(handed[1]!.people!.freeAgents).not.toContain(B);
    expect(handed[1]!.people!.freeAgents.filter((id) => String(id) === String(C))).toHaveLength(1);
    expect(limboPlayers(returned[1]!.people!)).toEqual([]);
  }, 300_000);

  it("switched off, nothing is swept: the next season starts with the people the last one left", () => {
    const { handed, returned } = madeUpWalk({ seasons: 2 }, leaveSomeOut);
    expect(limboPlayers(returned[0]!.people!)).toEqual([A]);
    expect(handed[1]!.people).toBe(returned[0]!.people);
  }, 300_000);

  it("the sweep adds only players on no team, outside the pool and not prospects, in the players' order", () => {
    const p = (id: string, team?: string, draft?: "PROSPECT") => ({
      bio: { id, ...(draft ? { draft } : { draft: "UDFA" }) }, ...(team ? { teamId: team } : {}),
    }) as unknown as PlayerState;
    const people = {
      teams: [], picks: [], classes: [],
      players: [p("x1", "T01"), p("x2"), p("x3", undefined, "PROSPECT"), p("x4"), p("x5")],
      freeAgents: ["x4"],
    } as unknown as SeasonPeople;
    expect(limboPlayers(people)).toEqual(["x2", "x5"]);
    const swept = sweepLimbo(people);
    expect(swept.freeAgents).toEqual(["x4", "x2", "x5"]);
    expect(people.freeAgents).toEqual(["x4"]);
    expect(sweepLimbo(swept)).toBe(swept);
  });

  it("draft-check's three-argument onRun still works on the widened walk", () => {
    const r = withRunSeason((i) => ({
      state: { season: i.season } as unknown as SeasonRun["state"],
      calendar: { season: i.season, phase: "OFF_SUMMER", week: 1, day: 7 }, events: [], complete: true, people: i.people!,
    }), () => runDraftCheck({ seed: SEED, file, seasons: 2 }));
    expect(r.drafts).toBe(2);
    expect(r.perYear.map((y) => y.draft)).toEqual([2027, 2028]);
  }, 300_000);

  it("switched on: the players' steps with the season runner's lineup rule, coaches' leanings kept, classes with growth records", () => {
    const dev = firstSeasonInput({ players: { development: true } });
    expect(dev.players?.development).toBe(true);
    expect(dev.players?.injuries).toBe(false);
    expect(dev.draft!.makeClass(2027, new Set()).players.every((p) => p.attributes.development !== undefined)).toBe(true);
    const hurt = firstSeasonInput({ players: { injuries: true } });
    expect(Object.keys(hurt.players!).sort()).toEqual(["development", "injuries", "unfilled"]);
    expect(hurt.players?.development).toBe(false);
    expect(hurt.players?.injuries).toBe(true);
    expect(hurt.draft!.makeClass(2027, new Set()).players.some((p) => p.attributes.development !== undefined)).toBe(false);
    // The file's records for the switch on, and the practice squads on the teams.
    expect(dev.people!.players.every((p) => p.attributes.development !== undefined)).toBe(true);
    expect(hurt.people!.players.some((p) => p.condition.injury !== undefined)).toBe(true);
    expect(hurt.people!.teams.some((t) => (t.practiceSquad?.length ?? 0) > 0)).toBe(true);
    // Every head coach in a seat keeps his leanings all walk.
    const coaches = hurt.people!.staff!.filter((s) => s.role === "HEAD_COACH" && s.teamId !== undefined);
    expect(coaches).toHaveLength(32);
    expect(coaches.every((s) => s.lineup !== undefined)).toBe(true);
    // The coaches live in the walk: the whole coaching world (buildStaff's, views not yet seated) rides
    // in the people, the staff is its staff (one array), and the coaches' and the meeting's steps run.
    for (const input of [dev, hurt]) {
      expect(input.coaching).toEqual({});
      expect(input.meeting).toEqual({});
      expect(input.people!.coaching!.world.staff).toBe(input.people!.staff);
      expect(input.people!.coaching!.relationships).toBeUndefined();
    }
    expect(json(hurt.people!.coaching!.world)).toBe(json(buildStaff(buildLeague(SEED), { firstSeason: 2026, lineups: true }).world));
    // The lineup rule is the season runner's: a team at full strength can field a side; with nobody fit, not.
    const rated = buildStandInLeague(buildLeague(SEED), file, { injuries: true }).rated;
    const team = hurt.people!.teams[0]!;
    const players = new Map(hurt.people!.players.map((p) => [String(p.bio.id), p]));
    const all = new Set(team.roster.map(String));
    expect(hurt.players!.unfilled!(team, all, players)).toBe(unfilledPosition(rated, team, all, players));
    expect(hurt.players!.unfilled!(team, new Set(), players)).toBe(unfilledPosition(rated, team, new Set(), players));
    expect(hurt.players!.unfilled!(team, new Set(), players)).toBeDefined();
  }, 300_000);

  it("onDay is one day step that hands on what it sees and does nothing; onEvent is passed through; absent, neither is added", () => {
    const onEvent = () => {};
    const seen: unknown[][] = [];
    const input = firstSeasonInput({ onDay: (...args) => { seen.push(args); }, onEvent });
    expect(input.onEvent).toBe(onEvent);
    expect(input.daySteps).toHaveLength(1);
    const step = input.daySteps![0]!;
    const ctx = { day: { season: 2026, phase: "TRAINING_CAMP", week: 1, day: 1 }, season: 2026, seed: "s", games: [] } as unknown as Parameters<typeof step.run>[1];
    expect(step.run(input.people!, ctx)).toBeUndefined();
    expect(seen).toHaveLength(1);
    expect(seen[0]![0]).toBe(2026);
    expect(seen[0]![1]).toBe(ctx.day);
    expect(seen[0]![2]).toBe(input.people);
    expect(seen[0]![3]).toBe(ctx.games);
    const plain = firstSeasonInput({ players: { injuries: true } });
    expect("daySteps" in plain).toBe(false);
    expect("onEvent" in plain).toBe(false);
  }, 300_000);

  it("staffTransform changes the staff the walk starts with, given buildStaff's (with leanings when switched on)", () => {
    const plain = firstSeasonInput({ players: { injuries: true } });
    const given: (readonly StaffState[])[] = [];
    const leanIncumbent = (staff: readonly StaffState[]): StaffState[] => {
      given.push(staff);
      return staff.map((s) => (s.role === "HEAD_COACH" && s.teamId !== undefined ? { ...s, lineup: { incumbent: 100, veteran: 50, form: 0 } } : s));
    };
    const arm = firstSeasonInput({ players: { injuries: true }, staffTransform: leanIncumbent });
    expect(given).toHaveLength(1);
    expect(json(given[0])).toBe(json(plain.people!.staff));
    const coaches = arm.people!.staff!.filter((s) => s.role === "HEAD_COACH" && s.teamId !== undefined);
    expect(coaches).toHaveLength(32);
    expect(coaches.every((s) => json(s.lineup) === json({ incumbent: 100, veteran: 50, form: 0 }))).toBe(true);
    expect(json(arm.people!.staff!.filter((s) => s.role !== "HEAD_COACH"))).toBe(json(plain.people!.staff!.filter((s) => s.role !== "HEAD_COACH")));
    // Both views of the staff are the arm's, one array.
    expect(arm.people!.coaching!.world.staff).toBe(arm.people!.staff);
  }, 300_000);

  it("transformStaff changes both views of the staff as one array, or the staff alone with no coaching world", () => {
    const staff = buildStaff(buildLeague(SEED), { firstSeason: 2026, lineups: true }).world;
    const people = { teams: [], players: [], picks: [], classes: [], freeAgents: [], staff: staff.staff, coaching: { world: staff } } as unknown as SeasonPeople;
    const lean = armInput("form").staffTransform!;
    const changed = transformStaff(people, lean);
    expect(changed.staff).toBe(changed.coaching!.world.staff);
    expect(json(changed.staff)).toBe(json(lean(staff.staff)));
    expect(Object.keys(changed)).toEqual(Object.keys(people));
    expect(json({ ...changed.coaching!.world, staff: [] })).toBe(json({ ...staff, staff: [] }));
    expect(people.staff).toBe(staff.staff); // the people handed in are not changed
    const { coaching: _c, ...alone } = people;
    const changedAlone = transformStaff(alone, lean);
    expect("coaching" in changedAlone).toBe(false);
    expect(json(changedAlone.staff)).toBe(json(lean(staff.staff)));
  }, 300_000);

  it("a head coach the carousel seats takes the arm's leanings before the next season; both views stay one array", () => {
    const arm = armInput("incumbent");
    const sittingHead = (s: StaffState, team?: string) => {
      const j = s.career[s.career.length - 1];
      return j !== undefined && j.level === "NFL" && j.role === "HEAD_COACH" && j.lastSeason === undefined && j.ended === undefined
        && j.team !== undefined && (team === undefined || String(j.team) === team);
    };
    const NATURAL = { incumbent: 20, veteran: 60, form: 70 };
    let newHead: string | undefined;
    /** The carousel, made up: T01's head coach fired and a man from the pool seated with leanings of his own, as franchise seats one. */
    const carousel = (p: SeasonPeople): SeasonPeople => {
      if (p.coaching === undefined || newHead !== undefined) return p;
      const world = p.coaching.world;
      const fired = world.staff.find((s) => sittingHead(s, "T01"))!;
      const hired = world.staff.find((s) => s.teamId === undefined && s.retiredAfter === undefined && s.career.length > 0 && !sittingHead(s))!;
      newHead = String(hired.id);
      const staff = world.staff.map((s): StaffState => {
        if (s === fired) {
          const { teamId: _t, ...rest } = s;
          return { ...rest, career: s.career.map((j, i) => (i === s.career.length - 1 ? { ...j, lastSeason: 2026, ended: "FIRED" as const } : j)) } as StaffState;
        }
        if (s === hired) {
          return {
            ...s, role: "HEAD_COACH", teamId: teamId("T01"), lineup: { ...NATURAL },
            career: [...s.career, { level: "NFL", role: "HEAD_COACH", team: teamId("T01"), employer: "T01", firstSeason: 2027, seasons: [] }],
          };
        }
        return s;
      });
      return { ...p, staff, coaching: { ...p.coaching, world: { ...world, staff } } };
    };
    const { handed, returned } = madeUpWalk({ seasons: 3, ...arm }, carousel);
    expect(handed).toHaveLength(3);
    for (const h of handed) {
      // Every season: the coaches' and the meeting's steps, the coaching world in the people, both views one array.
      expect(h.coaching).toEqual({});
      expect(h.meeting).toEqual({});
      expect(h.people!.staff).toBe(h.people!.coaching!.world.staff);
      const heads = h.people!.staff!.filter((s) => sittingHead(s));
      expect(heads).toHaveLength(32);
      expect(heads.every((s) => json(s.lineup) === json(COACH_STYLE_LINEUPS.incumbent))).toBe(true);
    }
    // The season ended with the new man's own leanings (the walk's people are not changed in place) ...
    const seated = (p: SeasonPeople) => p.staff!.find((s) => String(s.id) === newHead)!;
    expect(newHead).toBeDefined();
    expect(seated(returned[0]!.people!).lineup).toEqual(NATURAL);
    // ... and the next season started with the arm's.
    expect(sittingHead(seated(handed[1]!.people!), "T01")).toBe(true);
    expect(seated(handed[1]!.people!).lineup).toEqual(COACH_STYLE_LINEUPS.incumbent);
    expect(seated(handed[2]!.people!).lineup).toEqual(COACH_STYLE_LINEUPS.incumbent);
  }, 300_000);
});

describe("the cap check's walk, switched on: one seed, one event stream", () => {
  /** Where the walks stop: the first day of the 2026 regular season's second week. */
  const WEEK_2: CalendarStamp = { season: 2026, phase: "REGULAR_SEASON", week: 2, day: 1 };
  const SWITCHED = { development: true, injuries: true } as const;

  /**
   * Play the switched-on walk until 2026 regular-season week 2 and digest its event stream: every
   * event up to the stop, and those stamped before week 2 (which a walk stopped another way also
   * has in full). Stopped by `onDay` on week 2's first day, or, with no day watcher at all, by `onEvent`
   * at the first event stamped in week 2. With `reader`, `onDay` and `onRun` read everything they
   * are handed, every day.
   */
  function streamToWeek2(opts: { readonly stopBy: "onDay" | "onEvent"; readonly reader?: boolean }) {
    const all = createHash("sha256");
    const beforeWeek2 = createHash("sha256");
    let events = 0;
    let days = 0;
    let read = 0;
    const onEvent = (e: FranchiseEventEnvelope) => {
      if (opts.stopBy === "onEvent" && compareStamps(e.at, WEEK_2) >= 0) throw new Stop("week 2");
      const line = `${json(e)}\n`;
      all.update(line);
      if (compareStamps(e.at, WEEK_2) < 0) beforeWeek2.update(line);
      events++;
    };
    const readAll = (...xs: unknown[]) => { read += json(xs).length; };
    const onDay: NonNullable<CapCheckInput["onDay"]> = (season, day, people, games) => {
      days++;
      if (opts.reader) readAll(season, day, people, games);
      if (compareStamps(day, WEEK_2) >= 0) throw new Stop("week 2");
    };
    expect(() => runCapCheck({
      seed: SEED, file, seasons: 1, players: SWITCHED, onEvent,
      ...(opts.stopBy === "onDay" ? { onDay } : {}),
      ...(opts.reader ? { onRun: (...args: unknown[]) => readAll(...args), onYear: (y: unknown) => readAll(y) } : {}),
    })).toThrow(Stop);
    return { all: all.digest("hex"), beforeWeek2: beforeWeek2.digest("hex"), events, days, read };
  }

  it("the same seed gives the same stream twice, the same with a full reader watching, and the same with no day watcher", () => {
    const first = streamToWeek2({ stopBy: "onDay" });
    const second = streamToWeek2({ stopBy: "onDay" });
    const watched = streamToWeek2({ stopBy: "onDay", reader: true });
    const unwatched = streamToWeek2({ stopBy: "onEvent" });
    // The walk got into the regular season, with games played and the players' steps running.
    expect(first.events).toBeGreaterThan(100);
    expect(first.days).toBeGreaterThan(7);
    expect(watched.read).toBeGreaterThan(0);
    expect(second).toEqual(first);
    expect(watched.all).toBe(first.all);
    expect(watched.events).toBe(first.events);
    expect(watched.days).toBe(first.days);
    expect(unwatched.beforeWeek2).toBe(first.beforeWeek2);
    expect(first.beforeWeek2).not.toBe(sha256(""));
  }, 300_000);
});
