import { describe, it, expect } from "vitest";
import {
  CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, compareStamps, gameId, teamId,
  type CalendarStamp, type FranchiseEventEnvelope, type SeasonState,
} from "@ff/contracts";
import {
  advance, nextDay, seasonStart, phaseWeeks, DAYS_PER_WEEK, PHASE_WEEKS, type ClockWorld,
} from "../src/index.js";

const rules = DEFAULT_LEAGUE_RULES;
const start = (): ClockWorld => ({ calendar: seasonStart(1), leagueRules: rules });
const lastDayOfSeason = (season: number): CalendarStamp =>
  ({ season, phase: "OFF_SUMMER", week: PHASE_WEEKS.OFF_SUMMER, day: DAYS_PER_WEEK });
const types = (evs: FranchiseEventEnvelope[]) => evs.map((e) => e.event.type);

describe("calendar clock (season shell S5)", () => {
  const year = advance(start(), seasonStart(2));

  it("walks a whole year: every phase in order, then camp of the next season", () => {
    const phases = year.events.flatMap((e) => e.event.type === "CALENDAR_PHASE_ENTERED" ? [e.event.payload.phase] : []);
    expect(phases).toEqual([...CALENDAR_PHASE_ORDER.slice(1), "TRAINING_CAMP"]);
    expect(year.world.calendar).toEqual(seasonStart(2));
  });

  it("fires one WEEK_ADVANCED per week, numbered 1..n inside each phase", () => {
    const weeks = year.events.flatMap((e) => e.event.type === "WEEK_ADVANCED" ? [e.event.payload.stamp] : []);
    const total = CALENDAR_PHASE_ORDER.reduce((n, p) => n + phaseWeeks(p, rules), 0);
    expect(weeks).toHaveLength(total); // camp week 1 of season 1 is the start, season 2's is the end
    const regular = weeks.filter((s) => s.phase === "REGULAR_SEASON").map((s) => s.week);
    expect(regular).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    for (const s of weeks) expect(s.day).toBe(1);
  });

  it("reaches the trade deadline once a season, on Tuesday (day 2) of regular-season week 10", () => {
    const hits = year.events.filter((e) => e.event.type === "DEADLINE_REACHED");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.at).toEqual({ season: 1, phase: "REGULAR_SEASON", week: 10, day: 2 });
    expect(hits[0]!.event).toEqual({ type: "DEADLINE_REACHED", payload: { deadlineId: "TRADE_DEADLINE", autoResolved: true } });
  });

  it("emits phase, then week, then deadline on the same day, with seq counting up and stamps never going back", () => {
    const firstDay = year.events.filter((e) => compareStamps(e.at, { season: 1, phase: "PRESEASON", week: 1, day: 1 }) === 0);
    expect(types(firstDay)).toEqual(["CALENDAR_PHASE_ENTERED", "WEEK_ADVANCED"]);
    year.events.forEach((e, i) => {
      expect(e.seq).toBe(i);
      if (i > 0) expect(compareStamps(year.events[i - 1]!.at, e.at)).toBeLessThanOrEqual(0);
    });
  });

  it("is deterministic: the same world and target give an identical event stream", () => {
    expect(advance(start(), seasonStart(2))).toEqual(year);
  });

  it("is idempotent: advancing to where the world already is (or earlier) does nothing", () => {
    const again = advance(year.world, seasonStart(2));
    expect(again.events).toEqual([]);
    expect(again.world).toBe(year.world);
    expect(advance(year.world, seasonStart(1)).events).toEqual([]);
  });

  it("splitting a walk into pieces gives the same stream as one walk", () => {
    const mid: CalendarStamp = { season: 1, phase: "REGULAR_SEASON", week: 10, day: 1 };
    const a = advance(start(), mid);
    const b = advance(a.world, seasonStart(2), { firstSeq: a.events.length });
    expect([...a.events, ...b.events]).toEqual(year.events);
  });

  it("rolls the season over after the last day of summer", () => {
    expect(nextDay(lastDayOfSeason(3), rules)).toEqual(seasonStart(4));
  });

  it("passes the rest of the world through untouched", () => {
    const world = { ...start(), note: "kept" };
    const r = advance(world, { season: 1, phase: "TRAINING_CAMP", week: 2, day: 3 });
    expect(r.world.note).toBe("kept");
    expect(world.calendar).toEqual(seasonStart(1)); // the input is not mutated
  });

  it("refuses a day that is not on the calendar", () => {
    expect(() => advance(start(), { season: 1, phase: "REGULAR_SEASON", week: 19, day: 1 })).toThrow();
    expect(() => advance(start(), { season: 1, phase: "PRESEASON", week: 1, day: 8 })).toThrow();
  });

  it("follows the rules as data: a 17-week season moves the playoffs up a week", () => {
    const short = { ...rules, weeksPerSeason: 17 };
    const r = advance({ calendar: seasonStart(1), leagueRules: short }, seasonStart(2));
    const playoffs = r.events.find((e) => e.event.type === "CALENDAR_PHASE_ENTERED" && e.event.payload.phase === "PLAYOFFS");
    expect(nextDay({ season: 1, phase: "REGULAR_SEASON", week: 17, day: 7 }, short)).toEqual(playoffs!.at);
  });
});

describe("the advance button (no target, Spec #5 §13)", () => {
  /** Press until the calendar reaches `until`, returning where each press stopped. */
  function press(world: ClockWorld, until: CalendarStamp): CalendarStamp[] {
    const stops: CalendarStamp[] = [];
    while (compareStamps(world.calendar, until) < 0) {
      world = advance(world).world;
      stops.push(world.calendar);
    }
    return stops;
  }

  it("skips empty offseason days and stops only when a phase opens", () => {
    const stops = press({ calendar: { season: 1, phase: "OFF_EVAL", week: 1, day: 1 }, leagueRules: rules }, seasonStart(2));
    expect(stops.map((s) => s.phase)).toEqual(["OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER", "TRAINING_CAMP"]);
    for (const s of stops) expect([s.week, s.day]).toEqual([1, 1]);
  });

  it("stops at the start of every regular-season and playoff week, and at the trade deadline", () => {
    const from: CalendarStamp = { season: 1, phase: "PRESEASON", week: 1, day: 1 };
    const stops = press({ calendar: from, leagueRules: rules }, { season: 1, phase: "OFF_EVAL", week: 1, day: 1 });
    const inSeason = stops.filter((s) => s.phase === "REGULAR_SEASON");
    expect(inSeason).toHaveLength(18 + 1);
    expect(inSeason).toContainEqual({ season: 1, phase: "REGULAR_SEASON", week: 10, day: 2 });
    expect(stops.filter((s) => s.phase === "PLAYOFFS")).toHaveLength(5);
    expect(stops.filter((s) => s.phase === "PRESEASON")).toEqual([]);
  });

  it("stops on a day with a scheduled game", () => {
    const sunday: CalendarStamp = { season: 1, phase: "PRESEASON", week: 2, day: 7 };
    const season: SeasonState = {
      season: 1, results: [], standings: [],
      schedule: {
        season: 1, byes: [],
        games: [{ gameId: gameId("G1"), season: 1, kind: "PRESEASON", at: sunday, home: teamId("T01"), away: teamId("T02"), neutralSite: false }],
      },
    };
    const r = advance({ calendar: { season: 1, phase: "PRESEASON", week: 1, day: 1 }, leagueRules: rules, season });
    expect(r.world.calendar).toEqual(sunday);
    expect(types(r.events)).toEqual(["WEEK_ADVANCED"]); // week 2 began on the way
  });

  it("always moves at least one day", () => {
    const r = advance(start());
    expect(compareStamps(r.world.calendar, seasonStart(1))).toBeGreaterThan(0);
  });
});
