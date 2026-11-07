/**
 * ADR-094 §3-§6 (build step 3): the weekly read, buy / hold / sell, the argument and the souring.
 */
import { describe, it, expect } from "vitest";
import {
  createRng, type CalendarStamp, type FranchiseEvent, type GameResult, type RelationshipView, type SeasonState, type Team,
} from "@ff/contracts";
import {
  runSeason, type GameResolver, type LeaguePeople,
  buildLeague, buildSchedule, buildStaff, makeGm, playoffChance, seatOf, seatRelationships, stanceFor, stepToward, stepsBetween,
  weeklyStance, STANCE, type StaffWorld, type WeekRead,
} from "../src/index.js";

const SEED = "stance";
const league = buildLeague(SEED);
const built = buildStaff(league, { firstSeason: 2026, historySeasons: 8 });
const world: StaffWorld = (() => {
  const gms = built.world.teams.map((t) => makeGm(t, SEED));
  return {
    ...built.world,
    teams: built.world.teams.map((t, i) => ({ ...t, staff: [...t.staff, gms[i]!.id] })),
    staff: [...built.world.staff, ...gms],
  };
})();
const season = world.season;
const schedule = buildSchedule(league, season, SEED);
const WEEKS = Math.max(...schedule.games.filter((g) => g.kind === "REGULAR").map((g) => g.at.week));

/** A season's results with teams of set strength, so records spread out. */
const state: SeasonState = (() => {
  const strength = new Map(league.teams.map((t, i) => [String(t.id), (i % 8) - 3.5]));
  const rng = createRng(SEED, "test:results");
  const results: GameResult[] = schedule.games.filter((g) => g.kind === "REGULAR").map((g) => {
    const edge = strength.get(String(g.home))! - strength.get(String(g.away))!;
    const homeWins = rng.next() < 1 / (1 + Math.exp(-edge / 2));
    return { gameId: g.gameId, home: g.home, away: g.away, homeScore: homeWins ? 24 : 17, awayScore: homeWins ? 17 : 24, reason: "REGULATION", seed: "x" };
  });
  return { season, schedule, results, standings: [] };
})();
const teams: Team[] = league.teams.map((t) => ({ ...t }));
const at = (week: number): CalendarStamp => ({ season, phase: "REGULAR_SEASON", week, day: 7 });
const base = { world, state, season, weeks: WEEKS, seed: SEED };

/** Every week of the season in turn, threading teams and views as the day step does. */
function walk(opts: { views?: RelationshipView[]; userTeam?: Team["id"]; fixedViews?: boolean } = {}) {
  let t = teams;
  let views = opts.views;
  const weeks: { events: FranchiseEvent[]; reads: Map<string, WeekRead> }[] = [];
  for (let week = 1; week <= WEEKS; week++) {
    const r = weeklyStance({
      ...base, teams: t, week, at: at(week), ...(views ? { views } : {}),
      context: opts.userTeam !== undefined ? { userTeam: opts.userTeam } : {},
    });
    t = r.teams;
    if (!opts.fixedViews) views = r.views;
    weeks.push({ events: r.events, reads: r.reads });
  }
  return { teams: t, views, weeks };
}

describe("the chance of making the playoffs (ADR-094 §3, Q6 a)", () => {
  it("rises with wins and settles as the games run out", () => {
    expect(playoffChance({ wins: 5, losses: 3, ties: 0 }, 9)).toBeGreaterThan(playoffChance({ wins: 3, losses: 5, ties: 0 }, 9));
    expect(playoffChance({ wins: 12, losses: 2, ties: 0 }, 3)).toBeGreaterThan(0.95);
    expect(playoffChance({ wins: 2, losses: 12, ties: 0 }, 3)).toBeLessThan(0.02);
    const start = playoffChance({ wins: 0, losses: 0, ties: 0 }, 17);
    expect(start).toBeGreaterThan(0.3);
    expect(start).toBeLessThan(0.55);
  });
});

describe("a man's stance (ADR-094 §4)", () => {
  it("buys above the bar and sells below it, a win-now lean lowering both", () => {
    expect(stanceFor(STANCE.buy, 50)).toBe("BUY");
    expect(stanceFor(STANCE.sell - 0.01, 50)).toBe("SELL");
    expect(stanceFor((STANCE.buy + STANCE.sell) / 2, 50)).toBe("HOLD");
    expect(stanceFor(STANCE.buy - 0.05, 90)).toBe("BUY");
    expect(stanceFor(STANCE.sell + 0.05, 10)).toBe("SELL");
    expect(stepsBetween("SELL", "BUY")).toBe(2);
    expect(stepToward("SELL", "BUY")).toBe("HOLD");
    expect(stepToward("BUY", "HOLD")).toBe("HOLD");
  });
});

describe("the weekly stance (ADR-094 §3-§6)", () => {
  const views = seatRelationships(world);

  it("is the same twice from the same seed, and sets each team's stance only through its events", () => {
    const a = walk({ views });
    expect(walk({ views })).toEqual(a);
    const set = a.weeks.flatMap((w) => w.events).filter((e) => e.type === "TEAM_STANCE_SET");
    expect(set.length).toBeGreaterThan(teams.length);
    for (const team of a.teams) {
      const last = set.filter((e) => e.type === "TEAM_STANCE_SET" && e.payload.team === team.id).at(-1);
      expect(team.stance).toBe(last?.type === "TEAM_STANCE_SET" ? last.payload.stance : undefined);
      // Q5 a: the stance never moves the team's direction.
      expect(team.direction).toBe(teams.find((t) => t.id === team.id)!.direction);
    }
    const stances = new Set(a.teams.map((t) => t.stance));
    expect(stances.has("BUY")).toBe(true);
    expect(stances.has("SELL")).toBe(true);
  });

  it("lets the GM decide, meeting a winning coach one step only when he thinks well of him (Q3 b)", () => {
    const all = (w: ReturnType<typeof walk>) => w.weeks.flatMap((x) => [...x.reads.values()]);
    const cold = all(walk({ views: views.map((v) => ({ ...v, score: 0 })), fixedViews: true }));
    for (const r of cold) expect(r.outcome).toBe(r.gmStance);
    const warm = all(walk({ views: views.map((v) => ({ ...v, score: 40 })), fixedViews: true }));
    const met = warm.filter((r) => r.argument?.winner === "COACH");
    expect(met.length).toBeGreaterThan(0);
    for (const r of met) expect(r.outcome).toBe(stepToward(r.gmStance, r.coachStance));
    for (const r of warm.filter((x) => x.argument?.winner !== "COACH")) expect(r.outcome).toBe(r.gmStance);
    expect(cold.filter((r) => r.argument).length).toBeGreaterThan(0);
  });

  it("charges a split's first argument, a hotter or wider one, and every fourth week of it (Q4 a)", () => {
    const w = walk({ views, fixedViews: true });
    const rank = { POLITE: 0, OPEN_ARGUMENT: 1, RIFT: 2 };
    let checked = 0;
    for (const team of world.teams) {
      const gm = world.staff.find((s) => s.role === "GM" && s.teamId === team.id)!;
      let run = 0;
      let last: WeekRead["argument"];
      w.weeks.forEach((week, i) => {
        if (i + 1 >= WEEKS) return;
        const a = week.reads.get(String(team.id))?.argument;
        if (!a) { run = 0; last = undefined; return; }
        const expected = run === 0 || rank[a.heat] > rank[last!.heat] || a.steps > last!.steps || run % STANCE.repeatEvery === 0;
        const charged = week.events.some((e) => e.type === "RELATIONSHIP_CHANGED" && e.payload.from === gm.id
          && (e.payload.cause === "POLITE_DISAGREEMENT" || e.payload.cause === "OPEN_ARGUMENT"));
        expect(charged, `${String(team.id)} week ${i + 1}`).toBe(expected);
        if (run > 0 && !expected) checked++;
        run++;
        last = a;
      });
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("sours the overruled coach on his GM", () => {
    const w = walk({ views, fixedViews: true });
    const events = w.weeks.flatMap((x) => x.events);
    const overruled = events.filter((e) => e.type === "RELATIONSHIP_CHANGED" && e.payload.cause === "OVERRULED_ON_COURSE");
    expect(overruled.length).toBeGreaterThan(0);
    for (const e of overruled) {
      if (e.type !== "RELATIONSHIP_CHANGED") continue;
      const from = world.staff.find((s) => s.id === e.payload.from)!;
      expect(seatOf(from)).toBe("HEAD_COACH");
      expect(e.payload.delta).toBeLessThan(0);
    }
  });

  it("leaves the user's team alone, and reads nothing after the last week", () => {
    const user = teams[0]!.id;
    const w = walk({ views, userTeam: user });
    expect(w.teams[0]!.stance).toBeUndefined();
    expect(w.weeks.flatMap((x) => x.events).some((e) => "team" in e.payload && e.payload.team === user)).toBe(false);
    expect(w.weeks.at(-1)!.events).toEqual([]);
    // Without views the stance still moves, and nothing sours.
    const bare = walk();
    expect(bare.weeks.flatMap((x) => x.events).some((e) => e.type === "RELATIONSHIP_CHANGED")).toBe(false);
    expect(bare.teams.some((t) => t.stance !== undefined)).toBe(true);
  });
});

describe("the stance in the season's walk", () => {
  const fake: GameResolver = (game, seed) => {
    const rng = createRng(seed, "fake-game");
    const homeScore = rng.int(0, 5) * 7;
    const awayScore = rng.int(0, 5) * 7;
    return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
  };
  const people: LeaguePeople = {
    teams: league.teams, players: [], picks: [], classes: [], freeAgents: [], staff: world.staff, coaching: { world },
  };
  const walkBase = { league, season, seed: "walk", resolve: fake, people, through: "PLAYOFFS" as const };

  it("sets stances each week and carries on from a stop exactly as a straight run", () => {
    const straight = runSeason({ ...walkBase, coaching: {} });
    const types = straight.events.map((e) => e.event.type);
    expect(types).toContain("TEAM_STANCE_SET");
    expect(types).toContain("COURSE_ARGUED");
    for (const e of straight.events.filter((x) => x.event.type === "TEAM_STANCE_SET")) {
      expect(e.at.phase).toBe("REGULAR_SEASON");
      expect(e.at.week).toBeLessThan(WEEKS);
    }
    expect(straight.people!.teams.some((t) => t.stance !== undefined)).toBe(true);
    const stop: CalendarStamp = { season, phase: "REGULAR_SEASON", week: 9, day: 7 };
    const first = runSeason({ ...walkBase, coaching: {}, stopAfter: stop });
    const rest = runSeason({
      ...walkBase, coaching: {}, people: structuredClone(first.people!), resumeFrom: first.state,
      stepsDoneThrough: first.calendar, resumeEvents: (first.stepEvents ?? []).map((e) => e.envelope),
    });
    expect(rest.people).toEqual(straight.people);
    expect(rest.events.map((e) => e.event)).toEqual(straight.events.map((e) => e.event));
  });
});
