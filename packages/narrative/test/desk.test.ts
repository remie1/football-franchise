/**
 * THE NEWS DESK (ADR-082).
 *
 *  1. DETERMINISM (Iron Rule 4): the same season and seed give the same news, word for word.
 *  2. READ ONLY: the desk changes none of the events it reads.
 *  3. THE EDITION RULES: at most 4 a week (owner's Q4), no team twice, at most two of a kind,
 *     playoff games always run, once-a-season news first at equal importance.
 *  4. One edition per calendar week with news, closed when the next week's first event arrives.
 */
import { describe, expect, it } from "vitest";
import { createRng, gameId, teamId, type FranchiseEventEnvelope } from "@ff/contracts";
import { createNewsDesk, selectStories, writeNews } from "../src/news/desk.js";
import { formatEdition } from "../src/news/format.js";
import type { Candidate } from "../src/news/stories.js";
import { day, game, input, schedule, seasonEvents } from "./fixtures.js";

const sched = schedule(18);
const events = seasonEvents(sched, "desk-test");

function deepFreeze<T>(x: T): T {
  if (x !== null && typeof x === "object" && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x)) deepFreeze(v);
  }
  return x;
}

const candidate = (kind: string, importance: Candidate["importance"], teams: string[], extra: Partial<Candidate> = {}): Candidate =>
  ({ kind, importance, teams: teams.map(teamId), games: [gameId(`${kind}-${teams.join("-")}`)], facts: {}, ...extra });

describe("the desk", () => {
  const editions = writeNews(input(sched), events);

  it("is deterministic: same season and seed, the same news word for word", () => {
    expect(writeNews(input(sched), events)).toEqual(editions);
  });

  it("another seed can word it differently, never report different games", () => {
    const other = writeNews(input(sched, "another-seed"), events);
    const headlines = (e: typeof editions) => e.flatMap((x) => x.stories.map((s) => s.event.payload.headline));
    expect(headlines(other)).not.toEqual(headlines(editions));
    const games = (e: typeof editions) => new Set(e.flatMap((x) => x.stories.flatMap((s) => s.event.payload.games.map(String))));
    const played = new Set(sched.games.map((g) => String(g.gameId)));
    for (const g of games(other)) expect(played.has(g)).toBe(true);
  });

  it("reads without changing anything", () => {
    const frozen = deepFreeze(structuredClone(events));
    expect(() => writeNews(input(sched), frozen)).not.toThrow();
    expect(frozen).toEqual(events);
  });

  it("publishes one edition per week with news, labelled by the week, at most 4 headlines each", () => {
    const weeks = editions.map((e) => Number(/^Week (\d+)$/.exec(e.label)?.[1]));
    expect(weeks).toEqual([...new Set(weeks)].sort((a, b) => a - b));
    expect(weeks.every((w) => w >= 1 && w <= 18)).toBe(true);
    expect(weeks.length).toBeGreaterThan(12); // a quiet week can happen; a quiet season would be a bug
    for (const e of editions) {
      expect(e.stories.length).toBeGreaterThan(0);
      expect(e.stories.length).toBeLessThanOrEqual(4);
      expect(e.at).toEqual(day(Number(e.label.slice(5)), 7));
    }
  });

  it("names no team twice in a week, and runs at most two stories of a kind", () => {
    for (const e of editions) {
      const teams = e.stories.flatMap((s) => s.event.payload.teams.map(String));
      expect(new Set(teams).size, e.label).toBe(teams.length);
      const kinds = e.stories.map((s) => s.event.payload.kind);
      for (const k of new Set(kinds)) expect(kinds.filter((x) => x === k).length).toBeLessThanOrEqual(2);
    }
  });

  it("numbers its stories in order and writes a headline for each", () => {
    const all = editions.flatMap((e) => e.stories);
    expect(all.map((s) => s.seq)).toEqual(all.map((_, i) => i));
    for (const s of all) {
      expect(s.event.type).toBe("PRESS_STORY_PUBLISHED");
      expect(s.event.payload.headline).not.toMatch(/[{}]/);
      expect(s.event.payload.subjects).toEqual([]);
    }
  });

  it("closes a week when the next week's first event arrives, and the last at finish", () => {
    const desk = createNewsDesk(input(sched));
    const week1 = events.filter((e) => e.at.week === 1);
    expect(week1.flatMap((e) => desk.take(e))).toEqual([]);
    const next = events.find((e) => e.at.week === 2)!;
    expect(desk.take(next).map((e) => e.label)).toEqual(["Week 1"]);
    expect(desk.finish()).toEqual([]); // week 2 has had no games yet
  });

  it("publishes nothing for a week without games", () => {
    const quiet: FranchiseEventEnvelope[] = [
      { seq: 0, at: day(1, 1, "TRAINING_CAMP"), event: { type: "CALENDAR_PHASE_ENTERED", payload: { phase: "TRAINING_CAMP" } } },
      { seq: 1, at: day(2, 1, "TRAINING_CAMP"), event: { type: "WEEK_ADVANCED", payload: { stamp: day(2, 1, "TRAINING_CAMP") } } },
    ];
    expect(writeNews(input(sched), quiet)).toEqual([]);
  });

  it("gives the score of a game it has seen, winner first", () => {
    const desk = createNewsDesk(input(sched));
    const g = game("A1", 10, "B2", 24, {}, "seen");
    desk.take({ seq: 0, at: day(1, 7), event: { type: "GAME_COMPLETED", payload: { result: g, kind: "REGULAR" } } });
    expect(desk.scoreLine(g.gameId)).toBe("Fairhaven Lynx 24, Ashford Anchors 10");
    expect(desk.scoreLine(gameId("never-played"))).toBeUndefined();
  });

  it("prints an edition with its scores", () => {
    const desk = createNewsDesk(input(sched));
    const printed = [...events.flatMap((e) => desk.take(e)), ...desk.finish()].map((e) => formatEdition(e, desk.scoreLine));
    expect(printed[0]!.split("\n")[0]).toBe("Week 1");
    expect(printed[0]).toMatch(/\n {2}\S.*\(\w[\w ]* \d+, \w[\w ]* \d+\)/);
    expect(formatEdition(editions[0]!)).not.toMatch(/\(/);
  });
});

describe("choosing the stories", () => {
  const rng = () => createRng("select", "test");

  it("keeps the most important, at most four", () => {
    const c = ["A1", "A2", "A3", "A4", "B1", "B2"].map((t, i) => candidate(`K${i}`, (i < 2 ? 4 : 2) as Candidate["importance"], [t]));
    const kept = selectStories(c, rng(), 4);
    expect(kept).toHaveLength(4);
    expect(kept.slice(0, 2).map((k) => k.importance)).toEqual([4, 4]);
  });

  it("never names a team twice, and runs at most two of a kind", () => {
    const kept = selectStories([
      candidate("ROUT", 2, ["A1", "A2"]), candidate("WIN_STREAK", 3, ["A1"]),
      candidate("ROUT", 2, ["A3", "A4"]), candidate("ROUT", 2, ["B1", "B2"]), candidate("ROUT", 2, ["B3", "B4"]),
    ], rng(), 4);
    expect(kept.map((k) => k.kind).sort()).toEqual(["ROUT", "ROUT", "WIN_STREAK"]);
    expect(kept.some((k) => k.teams.map(String).join() === "A1,A2")).toBe(false);
  });

  it("runs every always-story outside the cap", () => {
    const games = ["A1", "A2", "A3", "A4", "B1", "B2"].map((t) => candidate("PLAYOFF", 3, [t], { always: true }));
    const kept = selectStories([...games, candidate("OTHER", 5, ["B3"]), candidate("OTHER", 2, ["A1"])], rng(), 4);
    expect(kept.filter((k) => k.always)).toHaveLength(6);
    expect(kept.filter((k) => !k.always).map((k) => k.teams.map(String))).toEqual([["B3"]]);
  });

  it("puts once-a-season news ahead of a weekly kind of the same importance", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const kept = selectStories([candidate("WIN_STREAK", 3, ["A1"]), candidate("LAST_UNBEATEN", 3, ["A1"])], createRng(seed, "x"), 4);
      expect(kept.map((k) => k.kind)).toEqual(["LAST_UNBEATEN"]);
    }
  });

  it("breaks other ties with the dice, not by team id", () => {
    const pair = [candidate("ROUT", 2, ["A1"]), candidate("ROUT", 2, ["B4"])];
    const first = (seed: string) => String(selectStories(pair, createRng(seed, "x"), 1)[0]!.teams[0]);
    const firsts = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(first));
    expect(firsts).toEqual(new Set(["A1", "B4"]));
  });
});
