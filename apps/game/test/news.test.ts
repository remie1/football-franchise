/**
 * The News page's read side (ADR-082 step 3): opening a news file, and laying out what the news
 * desk wrote. The screen words nothing and ranks nothing (Charter D7), so these check that it
 * shows the desk's headlines in the desk's order with each one-game story's final score, and that
 * a wrong file is refused in plain words.
 */
import { describe, expect, it } from "vitest";
import type { CalendarStamp, FranchiseEventEnvelope, GameId, TeamId } from "@ff/contracts";
import { NewsFileError, parseNewsFile, readNews, type NewsFile } from "../src/newsFile.js";

const at = { season: 2027, phase: "REGULAR_SEASON", week: 1, day: 7 } as CalendarStamp;

function story(seq: number, kind: string, headline: string, games: string[], importance: 1 | 2 | 3 | 4 | 5 = 2): FranchiseEventEnvelope {
  return {
    seq,
    at,
    event: {
      type: "PRESS_STORY_PUBLISHED",
      payload: { kind, headline, importance, teams: [], games: games.map((g) => g as GameId), subjects: [] },
    },
  };
}

const news: NewsFile = {
  format: "ff-news/1",
  seed: "s",
  season: 2027,
  teams: [
    { id: "t1", city: "Crestview", name: "Miners" },
    { id: "t2", city: "Harbor City", name: "Bison" },
  ],
  results: [
    { gameId: "g1" as GameId, home: "t2" as TeamId, away: "t1" as TeamId, homeScore: 27, awayScore: 42, reason: "REGULATION", seed: "x" },
    { gameId: "g2" as GameId, home: "t1" as TeamId, away: "t2" as TeamId, homeScore: 20, awayScore: 20, reason: "TIE", seed: "y" },
  ],
  editions: [
    {
      label: "Week 1",
      at,
      stories: [story(0, "UNBEATEN_FALLS", "Perfect no more: Miners topple Bison", ["g1"], 3), story(1, "TIE", "Deadlock in Crestview", ["g2"], 3)],
    },
    {
      label: "Season review",
      at,
      stories: [story(2, "CHAMPION_PATH", "The champions' road: Miners past Bison", ["g1", "g2"], 4), story(3, "BEST_RECORD", "Miners finish with the best record", [], 3)],
    },
  ],
};

describe("parseNewsFile", () => {
  it("opens a news file", () => {
    expect(parseNewsFile(JSON.stringify(news))).toEqual(news);
  });

  it("refuses what isn't one, in plain words", () => {
    expect(() => parseNewsFile("not json")).toThrow(NewsFileError);
    expect(() => parseNewsFile("null")).toThrow(/isn't a news file/);
    expect(() => parseNewsFile(JSON.stringify({ format: "ff-game/1" }))).toThrow(/Make it again/);
    expect(() => parseNewsFile(JSON.stringify({ ...news, editions: [] }))).toThrow(/no headlines/);
    const { results: _results, ...noScores } = news;
    expect(() => parseNewsFile(JSON.stringify(noScores))).toThrow(/missing/);
  });
});

describe("readNews", () => {
  const editions = readNews(news);

  it("keeps the desk's editions and order, each with its own link", () => {
    expect(editions.map((e) => [e.id, e.label])).toEqual([
      ["edition-1", "Week 1"],
      ["edition-2", "Season review"],
    ]);
    expect(editions[0]!.lines.map((l) => l.headline)).toEqual(["Perfect no more: Miners topple Bison", "Deadlock in Crestview"]);
    expect(editions[1]!.lines.map((l) => [l.kind, l.importance])).toEqual([
      ["CHAMPION_PATH", 4],
      ["BEST_RECORD", 3],
    ]);
  });

  it("adds the final score to a one-game story: winner first, the home team first in a tie", () => {
    expect(editions[0]!.lines.map((l) => l.score)).toEqual(["Crestview Miners 42, Harbor City Bison 27", "Crestview Miners 20, Harbor City Bison 20"]);
  });

  it("adds no score to a story about several games, or none", () => {
    expect(editions[1]!.lines.map((l) => l.score)).toEqual([undefined, undefined]);
  });

  it("skips events it doesn't know, so a newer desk's file still opens", () => {
    const unknown = { seq: 9, at, event: { type: "SOMETHING_NEW", payload: {} } } as unknown as FranchiseEventEnvelope;
    const newer: NewsFile = { ...news, editions: [{ label: "Week 2", at, stories: [unknown, story(10, "ROUT", "Still here", [])] }] };
    expect(readNews(newer)[0]!.lines.map((l) => l.headline)).toEqual(["Still here"]);
  });

  it("shows a team's id rather than a blank when the file lacks its name", () => {
    expect(readNews({ ...news, teams: [] })[0]!.lines[0]!.score).toBe("t1 42, t2 27");
  });
});
