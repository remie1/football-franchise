/**
 * THE WEEKLY STORY RULES (ADR-082 step 1). Each rule fires on its line and not below it, and a
 * game offers only its most important story.
 */
import { describe, expect, it } from "vitest";
import type { GameResult } from "@ff/contracts";
import { applyResults, type Records } from "../src/news/records.js";
import type { Candidate } from "../src/news/stories.js";
import { gameStory, teamStories, weeklyCandidates, winnersDeficit, type WeekContext } from "../src/news/weekly.js";
import { EMPTY, LEAGUE, game, quarters, schedule } from "./fixtures.js";

function ctx(week: number, results: GameResult[], before: Records = EMPTY, sched = schedule(18)): WeekContext {
  return { week, results, before, after: applyResults(before, results), league: LEAGUE, schedule: sched };
}

/** The records after a list of weeks, each a list of results. */
const history = (...weeks: GameResult[][]) => weeks.reduce<Records>((r, w) => applyResults(r, w), EMPTY);

const kindOf = (g: GameResult, c: WeekContext = ctx(1, [g])) => gameStory(g, c)?.kind ?? null;
const team = (c: WeekContext, kind: string) => teamStories(c).filter((s) => s.kind === kind);

describe("game stories", () => {
  it("a rout is 28 or more, and 27 is not", () => {
    expect(kindOf(game("A1", 38, "A2", 10))).toBe("ROUT");
    expect(kindOf(game("A1", 37, "A2", 10))).toBeNull();
  });

  it("a shutout, a tie, overtime, a nail-biter and a shootout", () => {
    expect(kindOf(game("A1", 10, "A2", 0))).toBe("SHUTOUT");
    expect(kindOf(game("A1", 20, "A2", 20))).toBe("TIE");
    expect(kindOf(game("A1", 23, "A2", 20, { reason: "OVERTIME" }))).toBe("OVERTIME");
    expect(kindOf(game("A1", 23, "A2", 20))).toBe("NAIL_BITER");
    expect(kindOf(game("A1", 24, "A2", 20))).toBeNull();
    expect(kindOf(game("A1", 38, "A2", 32))).toBe("SHOOTOUT");
    expect(kindOf(game("A1", 36, "A2", 33))).toBe("NAIL_BITER"); // 69 points: close, not a shootout
  });

  it("a shutout rout is a shutout: the more important story wins", () => {
    expect(kindOf(game("A1", 42, "A2", 0))).toBe("SHUTOUT");
  });

  it("reads the winner's deficit after each of the first three quarters", () => {
    // Away (A2) trails 0-14 after one, 3-21 after two, 17-24 after three, wins 31-24.
    const g = game("A1", 24, "A2", 31, { periods: quarters([14, 7, 3, 0], [0, 3, 14, 14]) });
    expect(winnersDeficit(g)).toEqual({ worst: 18, afterThree: 7 });
    expect(gameStory(g, ctx(1, [g]))).toMatchObject({ kind: "COMEBACK", importance: 3, facts: { deficit: 18 } });
  });

  it("a comeback is 14 or more; 21 or more is bigger news", () => {
    const from = (deficit: number) => game("A1", 30, "A2", 31, { periods: quarters([deficit, 0, 0, 30 - deficit], [0, 0, 0, 31]) });
    expect(kindOf(from(13))).toBe("LATE_RALLY");
    expect(gameStory(from(14), ctx(1, [from(14)]))?.importance).toBe(3);
    expect(gameStory(from(21), ctx(1, [from(21)]))?.importance).toBe(4);
  });

  it("a late rally is a winner behind after three quarters; level after three is not", () => {
    const behind = game("A1", 20, "A2", 17, { periods: quarters([0, 3, 7, 10], [7, 7, 3, 0]) });
    const level = game("A1", 24, "A2", 17, { periods: quarters([7, 3, 7, 7], [7, 7, 3, 0]) });
    expect(kindOf(behind)).toBe("LATE_RALLY");
    expect(kindOf(level)).toBeNull();
  });

  it("without period scores there is no comeback story, never a guessed one", () => {
    expect(kindOf(game("A1", 30, "A2", 31))).toBe("NAIL_BITER");
  });

  it("an upset needs four games each and a .400 gap in win share before kickoff", () => {
    const four = [1, 2, 3, 4].map((w) => [game("A1", 30, "B1", 0, {}, `a${w}`), game("A2", 0, "B2", 30, {}, `b${w}`)]);
    const before = history(...four); // A1 4-0, A2 0-4
    const g = game("A2", 21, "A1", 20);
    const c = ctx(5, [g], before);
    expect(gameStory(g, c)).toMatchObject({ kind: "UPSET", facts: { winnerRecordBefore: "0-4", loserRecordBefore: "4-0" } });
    const three = history(...four.slice(0, 3));
    expect(kindOf(g, ctx(4, [g], three))).toBe("NAIL_BITER");
    // 3-1 against 1-3 is a .500 gap: an upset. 3-2 against 2-3 is .200: not.
    const swing = (k: string) => [game("A1", 0, "B1", 30, {}, `c${k}`), game("A2", 30, "B2", 0, {}, `d${k}`)];
    const closer = history(...four.slice(0, 3), swing("1"));
    expect(kindOf(g, ctx(5, [g], closer))).toBe("UPSET");
    const closest = history(...four.slice(0, 3), swing("1"), swing("2"));
    expect(kindOf(g, ctx(6, [g], closest))).toBe("NAIL_BITER");
  });
});

describe("team stories", () => {
  const wins = (n: number, t = "A1") => Array.from({ length: n }, (_, i) => [game(t, 30, "B4", 10, {}, `w${i}`)]);

  it("a win streak is news from four, and bigger from six and nine", () => {
    const at = (n: number) => {
      const before = history(...wins(n - 1));
      return team(ctx(n, [game("A1", 30, "B4", 10, {}, "now")], before), "WIN_STREAK");
    };
    expect(at(3)).toEqual([]);
    expect(at(4)).toMatchObject([{ importance: 2, facts: { count: 4, nth: "fourth", countWord: "four" } }]);
    expect(at(6)[0]?.importance).toBe(3);
    expect(at(9)[0]?.importance).toBe(4);
  });

  it("a losing streak the same way", () => {
    const losses = Array.from({ length: 4 }, (_, i) => [game("B4", 10, "A1", 30, {}, `l${i}`)]);
    const c = ctx(5, [game("B4", 10, "A2", 30, {}, "now")], history(...losses.slice(0, 3)));
    expect(team(c, "LOSING_STREAK")).toMatchObject([{ teams: ["B4"], facts: { count: 4 } }]);
  });

  it("a tie ends a streak; a bye week doesn't", () => {
    const tie = ctx(4, [game("A1", 20, "B4", 20, {}, "tie")], history(...wins(3)));
    expect(team(tie, "WIN_STREAK")).toEqual([]);
    // Three wins, a week off (no game), then a fourth: still a four-game streak.
    const fourth = ctx(5, [game("A1", 30, "B3", 0, {}, "after-bye")], history(...wins(3), []));
    expect(team(fourth, "WIN_STREAK")[0]?.facts.count).toBe(4);
  });

  it("a win streak of five is news when it ends, about both teams", () => {
    const c = ctx(6, [game("B3", 31, "A1", 30, {}, "snap")], history(...wins(5)));
    expect(team(c, "STREAK_SNAPPED")).toMatchObject([{ teams: ["A1", "B3"], facts: { count: 5, team: "Anchors", opponent: "Owls" } }]);
    const four = ctx(5, [game("B3", 31, "A1", 30, {}, "snap")], history(...wins(4)));
    expect(team(four, "STREAK_SNAPPED")).toEqual([]);
  });

  /** Week 1: the four home teams win. Week 2: three of those four lose. */
  const w1 = [game("A1", 20, "A2", 10, {}, "1a"), game("A3", 20, "A4", 10, {}, "1b"), game("B1", 20, "B2", 10, {}, "1c"), game("B3", 20, "B4", 10, {}, "1d")];
  const w2 = [game("A2", 20, "A1", 10, {}, "2a"), game("A4", 20, "A3", 10, {}, "2b"), game("B2", 20, "B1", 10, {}, "2c"), game("B3", 20, "B4", 10, {}, "2d")];

  it("the last unbeaten team, from week 3", () => {
    expect(team(ctx(2, w2, history(w1)), "LAST_UNBEATEN")).toEqual([]); // week 2 is too early
    const c = ctx(3, w2, history(w1));
    expect(team(c, "LAST_UNBEATEN")).toMatchObject([{ teams: ["B3"], facts: { record: "2-0" } }]);
  });

  it("the last unbeaten team's first loss", () => {
    const before = history(w1, w2); // B3 2-0, the only unbeaten team
    const c = ctx(3, [game("B4", 20, "B3", 10, {}, "3a")], before);
    expect(team(c, "UNBEATEN_FALLS")).toMatchObject([{ teams: ["B3", "B4"], importance: 3, facts: { recordBefore: "2-0", record: "2-1" } }]);
  });

  it("the last winless team, from week 4, and its first win", () => {
    // Only the Atlantic plays: A2 and A4 lose three times each.
    const losers = [1, 2, 3].map((w) => [game("A1", 30, "A2", 0, {}, `x${w}`), game("A3", 30, "A4", 0, {}, `y${w}`)]);
    const before = history(...losers);
    const c = ctx(4, [game("A4", 10, "A1", 0, {}, "4a"), game("A2", 0, "A3", 10, {}, "4b")], before);
    expect(team(c, "LAST_WINLESS")).toMatchObject([{ teams: ["A2"], facts: { record: "0-4" } }]);
    const next = ctx(5, [game("A2", 10, "A1", 0, {}, "5a")], c.after);
    expect(team(next, "FIRST_WIN")).toMatchObject([{ teams: ["A2"], facts: { opponent: "Anchors", record: "1-4" } }]);
  });

  it("a new division leader, alone in first, from week 4", () => {
    // A1 is 2-1 and leads; A2 is 1-1 after a bye. In week 4 A1 loses and A2 wins: A2 alone in first.
    const before = history(
      [game("A1", 20, "B1", 10, {}, "n1"), game("A2", 20, "B2", 10, {}, "n2")],
      [game("A1", 20, "B3", 10, {}, "n3")],
      [game("A1", 10, "B1", 20, {}, "n5"), game("A2", 10, "B4", 20, {}, "n4")],
    );
    const results = [game("A1", 10, "B3", 20, {}, "n7"), game("A2", 20, "B4", 10, {}, "n8")];
    expect(team(ctx(4, results, before), "NEW_LEADER")).toMatchObject([{ teams: ["A2"], facts: { division: "Atlantic North", record: "2-1" } }]);
    expect(team(ctx(3, results, before), "NEW_LEADER")).toEqual([]);
  });

  it("next week's showdown: leader against a rival within a game, from week 8", () => {
    const sched = schedule(18);
    // The fixture rotation pairs A1 with A2 every seventh week; preview a meeting from week 9 on.
    const meeting = sched.games.find((g) => g.at.week >= 9 && [g.home, g.away].map(String).sort().join() === "A1,A2")!;
    const week = meeting.at.week - 1;
    const before = history(...Array.from({ length: week - 1 }, (_, i) => [game("A1", 20, "B1", 10, {}, `s${i}a`), game("A2", 20, "B2", 10, {}, `s${i}b`)]));
    const level = ctx(week, [game("A1", 20, "B3", 10, {}, "sa"), game("A2", 20, "B4", 10, {}, "sb")], before, sched);
    expect(team(level, "SHOWDOWN")).toMatchObject([{ flavor: "tied", games: [meeting.gameId] }]);
    const apart = ctx(week, [game("A1", 20, "B3", 10, {}, "sa"), game("A2", 10, "B4", 20, {}, "sb")], before, sched);
    expect(team(apart, "SHOWDOWN")).toHaveLength(1);
    expect(team(apart, "SHOWDOWN")[0]?.flavor).toBeUndefined();
  });

  it("no showdown between teams sharing first below .500", () => {
    const sched = schedule(18);
    const meeting = sched.games.find((g) => g.at.week >= 9 && [g.home, g.away].map(String).sort().join() === "A1,A2")!;
    const week = meeting.at.week - 1;
    const before = history(...Array.from({ length: week - 1 }, (_, i) => [game("A1", 10, "B1", 20, {}, `s${i}a`), game("A2", 10, "B2", 20, {}, `s${i}b`)]));
    const c = ctx(week, [game("A1", 10, "B3", 20, {}, "sa"), game("A2", 10, "B4", 20, {}, "sb")], before, sched);
    expect(team(c, "SHOWDOWN").filter((s) => s.teams.map(String).includes("A1"))).toEqual([]);
  });
});

describe("weeklyCandidates", () => {
  it("offers one story per game at most, then the team stories", () => {
    const results = [game("A1", 42, "A2", 0, {}, "g1"), game("A3", 24, "A4", 20, {}, "g2"), game("B1", 24, "B2", 17, {}, "g3")];
    const all: Candidate[] = weeklyCandidates(ctx(1, results));
    expect(all.map((c) => c.kind)).toEqual(["SHUTOUT"]);
  });

  it("every story names teams from the league and games from the week or the schedule", () => {
    const results = [game("A1", 42, "A2", 0, {}, "g1"), game("B3", 23, "B4", 20, { reason: "OVERTIME" }, "g2")];
    for (const c of weeklyCandidates(ctx(1, results))) {
      for (const t of c.teams) expect(LEAGUE.teams.has(String(t))).toBe(true);
      expect(c.games.length).toBeGreaterThan(0);
    }
  });
});
