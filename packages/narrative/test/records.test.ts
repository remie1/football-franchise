/**
 * The running records the stories read (ADR-082): a tally of regular-season results.
 */
import { describe, expect, it } from "vitest";
import { applyResults, gamesBehind, leadersOf, recordOf, recordText, winShare } from "../src/news/records.js";
import { EMPTY, T, game } from "./fixtures.js";

describe("records", () => {
  const r = applyResults(EMPTY, [
    game("A1", 30, "A2", 10, {}, "1"), game("A1", 17, "A2", 17, {}, "2"),
    game("A2", 24, "A1", 21, {}, "3"), game("A2", 24, "A1", 21, {}, "4"),
  ]);

  it("tallies wins, losses, ties and points for both teams", () => {
    expect(recordOf(r, T.A1!)).toMatchObject({ wins: 1, losses: 2, ties: 1, pointsFor: 89, pointsAgainst: 75 });
    expect(recordOf(r, T.A2!)).toMatchObject({ wins: 2, losses: 1, ties: 1, pointsFor: 75, pointsAgainst: 89 });
    expect(recordText(recordOf(r, T.A1!))).toBe("1-2-1");
    expect(winShare(recordOf(r, T.A1!))).toBe(1.5 / 4);
  });

  it("keeps the current run and the season's longest; a tie is a run of its own", () => {
    expect(recordOf(r, T.A1!).streak).toEqual({ result: "L", length: 2 });
    expect(recordOf(r, T.A2!).streak).toEqual({ result: "W", length: 2 });
    expect(recordOf(r, T.A2!).longestWinStreak).toBe(2);
    expect(recordOf(r, T.A1!).longestLosingStreak).toBe(2);
  });

  it("doesn't change the records it was given", () => {
    const before = applyResults(EMPTY, [game("A1", 30, "A2", 10)]);
    const copy = JSON.stringify([...before]);
    applyResults(before, [game("A2", 30, "A1", 10, {}, "x")]);
    expect(JSON.stringify([...before])).toBe(copy);
    expect(gamesIn(EMPTY)).toBe(0);
  });

  it("names every team sharing the best record as a leader, and counts games behind", () => {
    const split = applyResults(EMPTY, [game("A1", 30, "B1", 10, {}, "a"), game("A2", 30, "B2", 10, {}, "b")]);
    expect(leadersOf(split, [T.A1!, T.A2!]).map(String)).toEqual(["A1", "A2"]);
    expect(leadersOf(EMPTY, [T.A1!, T.A2!])).toEqual([]);
    expect(gamesBehind(recordOf(r, T.A2!), recordOf(r, T.A1!))).toBe(1);
  });
});

function gamesIn(records: typeof EMPTY): number {
  return [...records.values()].reduce((n, x) => n + x.wins + x.losses + x.ties, 0);
}
