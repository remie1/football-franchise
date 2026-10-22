/**
 * THE SEASON STORIES (ADR-082 step 2): the race inside the desk, the playoff field, every playoff
 * game, and the season in review.
 */
import { describe, expect, it } from "vitest";
import {
  conferenceId, type CalendarStamp, type FranchiseEventEnvelope, type GameKind, type GameResult,
} from "@ff/contracts";
import { createNewsDesk, writeNews } from "../src/news/desk.js";
import { applyResults } from "../src/news/records.js";
import { fieldStories, listOf, playoffStory, reviewStories, seedsOf } from "../src/news/season.js";
import { EMPTY, LEAGUE, T, day, game, input, quarters, schedule, seasonEvents } from "./fixtures.js";

const ATL = conferenceId("ATL");
const PAC = conferenceId("PAC");
/** Two playoff teams a conference is too few to test seeds; three: two division winners and a wild card. */
const FIELD = [{ conference: ATL, teams: [T.A1!, T.A3!, T.A2!] }, { conference: PAC, teams: [T.B1!, T.B3!, T.B2!] }];
const SEEDS = seedsOf(FIELD);

describe("helpers", () => {
  it("lists names the way a paper does", () => {
    expect(listOf(["Bison"])).toBe("Bison");
    expect(listOf(["Bison", "Lynx"])).toBe("Bison and Lynx");
    expect(listOf(["Bison", "Lynx", "Owls"])).toBe("Bison, Lynx and Owls");
  });

  it("reads seeds from the field, 1 for the first team", () => {
    expect(SEEDS.get("A1")).toBe(1);
    expect(SEEDS.get("B2")).toBe(3);
  });
});

describe("playoff stories", () => {
  const story = (g: GameResult, kind: GameKind = "WILD_CARD") => playoffStory(g, kind, SEEDS, LEAGUE);

  it("names the round's story and always runs", () => {
    expect(story(game("A3", 24, "A2", 20))).toMatchObject({ kind: "PLAYOFF_WIN", importance: 3, always: true });
    expect(story(game("A3", 24, "A2", 20), "DIVISIONAL")?.kind).toBe("PLAYOFF_WIN");
    expect(story(game("A1", 24, "A3", 20), "CONFERENCE_FINAL")).toMatchObject({ kind: "CONFERENCE_TITLE", importance: 4, facts: { conference: "Atlantic" } });
    expect(story(game("A1", 24, "B1", 20), "CHAMPIONSHIP")).toMatchObject({ kind: "CHAMPIONSHIP", importance: 5 });
  });

  it("flavors a game by how it went: overtime, then comeback, then upset, then rout", () => {
    expect(story(game("A3", 23, "A2", 20, { reason: "OVERTIME" }))?.flavor).toBe("overtime");
    const comeback = game("A3", 21, "A2", 31, { periods: quarters([14, 7, 0, 0], [0, 0, 14, 17]) });
    expect(story(comeback)?.flavor).toBe("comeback"); // A2 (3 seed) also upset A3 (2 seed)
    expect(story(game("A3", 20, "A2", 24))).toMatchObject({ flavor: "upset", facts: { winnerSeed: 3, loserSeed: 2 } });
    expect(story(game("A3", 48, "A2", 10))?.flavor).toBe("rout");
    expect(story(game("A3", 24, "A2", 20))?.flavor).toBeUndefined();
  });

  it("calls nothing an upset in the championship, where the seeds are from different conferences", () => {
    expect(story(game("A1", 20, "B2", 24), "CHAMPIONSHIP")?.flavor).toBeUndefined();
  });

  it("writes one field story per conference, about its top seed", () => {
    const after = applyResults(EMPTY, [game("A1", 30, "B4", 10)]);
    expect(fieldStories(FIELD, after, LEAGUE)).toMatchObject([
      { kind: "PLAYOFF_FIELD", always: true, teams: ["A1"], facts: { conference: "Atlantic", record: "1-0", count: 3 } },
      { kind: "PLAYOFF_FIELD", always: true, teams: ["B1"], facts: { conference: "Pacific" } },
    ]);
  });
});

describe("the season in review", () => {
  const records = applyResults(EMPTY, [
    game("A1", 40, "A2", 0, {}, "1"), game("A3", 30, "A4", 10, {}, "2"), game("B1", 30, "B2", 10, {}, "3"), game("B3", 30, "B4", 10, {}, "4"),
    game("A1", 30, "A3", 10, {}, "5"), game("A2", 30, "A4", 10, {}, "6"), game("B1", 30, "B3", 10, {}, "7"), game("B2", 30, "B4", 10, {}, "8"),
  ]);
  const playoffs = [game("A1", 20, "A2", 10, {}, "p1"), game("A1", 30, "B1", 20, {}, "p2")];
  const stories = reviewStories(records, LEAGUE, T.A1!, playoffs);
  const of = (kind: string) => stories.find((s) => s.kind === kind)!;

  it("reviews the records, the streaks and the points, every story running", () => {
    expect(stories.map((s) => s.kind)).toEqual([
      "BEST_RECORD", "WORST_RECORD", "LONGEST_WIN_STREAK", "LONGEST_LOSING_STREAK", "TOP_OFFENSE", "TOP_DEFENSE", "CHAMPION_PATH",
    ]);
    expect(stories.every((s) => s.always)).toBe(true);
    expect(of("BEST_RECORD")).toMatchObject({ facts: { teams: "Anchors and Hawks", record: "2-0", count: 2 } });
    expect(of("BEST_RECORD").flavor).toBeUndefined();
    expect(of("TOP_OFFENSE")).toMatchObject({ teams: ["A1"], facts: { points: 70 } });
    expect(of("TOP_DEFENSE")).toMatchObject({ teams: ["A1"], facts: { points: 10 } });
  });

  it("names both teams when two share a mark", () => {
    expect(of("WORST_RECORD")).toMatchObject({ teams: ["A4", "B4"], facts: { teams: "Foundry and Rams", record: "0-2", count: 2 } });
    expect(of("LONGEST_LOSING_STREAK").facts.length).toBe(2);
  });

  it("switches to the many-team lines when more than two share a mark", () => {
    const week1 = applyResults(EMPTY, [game("A1", 20, "A2", 10, {}, "a"), game("A3", 20, "A4", 10, {}, "b"), game("B1", 20, "B2", 10, {}, "c"), game("B3", 20, "B4", 10, {}, "d")]);
    const best = reviewStories(week1, LEAGUE, null, []).find((s) => s.kind === "BEST_RECORD")!;
    expect(best).toMatchObject({ flavor: "many", facts: { count: 4, record: "1-0", teams: "Anchors, Comets, Hawks and Owls" } });
  });

  it("has no champion's path before there is a champion", () => {
    expect(reviewStories(records, LEAGUE, null, []).some((s) => s.kind === "CHAMPION_PATH")).toBe(false);
  });

  it("traces the champion's path through the playoffs", () => {
    expect(of("CHAMPION_PATH")).toMatchObject({ teams: ["A1"], facts: { path: "Bison and Hawks", wins: 2, record: "2-0" } });
  });
});

/** A whole small season: 18 weeks, then a three-team-a-conference playoff and the offseason. */
function playoffEvents(regular: FranchiseEventEnvelope[]): FranchiseEventEnvelope[] {
  const at = (week: number, d: number): CalendarStamp => day(week, d, "PLAYOFFS");
  const out = [...regular];
  const push = (stamp: CalendarStamp, event: FranchiseEventEnvelope["event"]) => out.push({ seq: out.length, at: stamp, event });
  const played = (stamp: CalendarStamp, kind: GameKind, g: GameResult) => push(stamp, { type: "GAME_COMPLETED", payload: { result: g, kind } });
  push(at(1, 1), { type: "CALENDAR_PHASE_ENTERED", payload: { phase: "PLAYOFFS" } });
  push(at(1, 1), { type: "PLAYOFF_FIELD_SET", payload: { season: 2027, seeds: FIELD.map((c) => ({ conference: c.conference, teams: [...c.teams] })) } });
  played(at(1, 7), "WILD_CARD", game("A3", 24, "A2", 20, {}, "wc-a"));
  played(at(1, 7), "WILD_CARD", game("B3", 20, "B2", 27, {}, "wc-b"));
  push(at(2, 1), { type: "WEEK_ADVANCED", payload: { stamp: at(2, 1) } });
  played(at(2, 7), "CONFERENCE_FINAL", game("A1", 31, "A3", 17, {}, "cf-a"));
  played(at(2, 7), "CONFERENCE_FINAL", game("B1", 17, "B2", 20, { reason: "OVERTIME" }, "cf-b"));
  push(at(3, 1), { type: "WEEK_ADVANCED", payload: { stamp: at(3, 1) } });
  played(at(3, 7), "CHAMPIONSHIP", game("A1", 27, "B2", 24, {}, "final"));
  push(at(3, 7), { type: "CHAMPION_DECIDED", payload: { season: 2027, team: T.A1! } });
  return out;
}

describe("the desk across a whole season", () => {
  const sched = schedule(18);
  const regular = seasonEvents(sched, "season-test");
  const offseason: FranchiseEventEnvelope = {
    seq: 999, at: day(1, 1, "OFF_EVAL"), event: { type: "CALENDAR_PHASE_ENTERED", payload: { phase: "OFF_EVAL" } },
  };
  const all = [...playoffEvents(regular), offseason];
  const news = writeNews(input(sched), all);
  const labels = news.map((e) => e.label);

  it("runs the playoff rounds and then the review", () => {
    expect(labels.slice(-4)).toEqual(["Wild-card round", "Conference finals", "Championship", "Season review"]);
    const wildCard = news.at(-4)!;
    expect(wildCard.stories.map((s) => s.event.payload.kind)).toEqual(["PLAYOFF_FIELD", "PLAYOFF_FIELD", "PLAYOFF_WIN", "PLAYOFF_WIN"]);
    expect(news.at(-2)!.stories.map((s) => s.event.payload.kind)).toEqual(["CHAMPIONSHIP"]);
    expect(news.at(-1)!.stories.find((s) => s.event.payload.kind === "CHAMPION_PATH")?.event.payload.teams.map(String)).toEqual(["A1"]);
  });

  it("gives every playoff game a headline", () => {
    const games = news.flatMap((e) => e.stories.flatMap((s) => s.event.payload.games.map(String)));
    for (const id of ["wc-a", "wc-b", "cf-a", "cf-b", "final"]) expect(games).toContain(id);
  });

  it("reports each team's clinch and elimination at most once", () => {
    const race = news.flatMap((e) => e.stories).filter((s) => ["CLINCHED_DIVISION", "CLINCHED_PLAYOFFS", "ELIMINATED"].includes(s.event.payload.kind));
    const keys = race.map((s) => `${s.event.payload.kind}/${String(s.event.payload.teams[0])}`);
    expect(new Set(keys).size).toBe(keys.length);
    const clinched = race.filter((s) => s.event.payload.kind !== "ELIMINATED").map((s) => String(s.event.payload.teams[0]));
    expect(new Set(clinched).size).toBe(clinched.length); // a division clinch is never followed by a playoff clinch
  });

  it("reviews the season at finish when the stream stops before the offseason", () => {
    const desk = createNewsDesk(input(sched));
    const editions = [...playoffEvents(regular).flatMap((e) => desk.take(e)), ...desk.finish()];
    expect(editions.at(-1)!.label).toBe("Season review");
    expect(editions.filter((e) => e.label === "Season review")).toHaveLength(1);
  });

  it("writes no review without a champion", () => {
    expect(writeNews(input(sched), regular).some((e) => e.label === "Season review")).toBe(false);
  });

  it("stays deterministic through the playoffs", () => {
    expect(writeNews(input(sched), all)).toEqual(news);
  });
});

