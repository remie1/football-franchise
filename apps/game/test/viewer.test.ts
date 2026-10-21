/**
 * The viewer's read side: opening a game file, and reading the scoreboard off its GAME_END.
 * The UI holds no game logic (Charter D7), so these check that it shows what the stream says and
 * that a wrong file is refused in plain words, not that it adds anything up.
 */
import { describe, expect, it } from "vitest";
import type { GameId, MatchEventEnvelope, TeamId } from "@ff/contracts";
import { GameFileError, parseGameFile, type GameFile } from "../src/gameFile.js";
import { periodLabel, readScoreboard } from "../src/scoreboard.js";

const gameId = "g:test" as GameId;
const at = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 7 } as MatchEventEnvelope["at"];

function file(periods: { period: number; home: number; away: number }[], reason: "REGULATION" | "OVERTIME" | "TIE"): GameFile {
  const home = periods.reduce((s, p) => s + p.home, 0);
  const away = periods.reduce((s, p) => s + p.away, 0);
  const events: MatchEventEnvelope[] = [
    { seq: 0, at, event: { type: "GAME_START", payload: { home: "t:00" as TeamId, away: "t:01" as TeamId, seed: "s" }, gameId } },
    {
      seq: 1,
      at,
      event: { type: "GAME_END", payload: { home, away, periods, plays: 120, drives: 22, reason, seed: "s" }, gameId },
    },
  ];
  return {
    format: "ff-game/1",
    seed: "s",
    league: "flat",
    callerVersion: "default",
    home: { id: "t:00", city: "City 00", name: "Team 00" },
    away: { id: "t:01", city: "City 01", name: "Team 01" },
    players: {},
    events,
    statlines: [],
  };
}

const regulation = file(
  [
    { period: 1, home: 7, away: 0 },
    { period: 2, home: 3, away: 14 },
    { period: 3, home: 0, away: 3 },
    { period: 4, home: 7, away: 0 },
  ],
  "REGULATION",
);

describe("parseGameFile", () => {
  it("opens a game file", () => {
    expect(parseGameFile(JSON.stringify(regulation))).toEqual(regulation);
  });

  it("refuses what isn't one, in plain words", () => {
    expect(() => parseGameFile("not json")).toThrow(GameFileError);
    expect(() => parseGameFile("null")).toThrow(/isn't a game file/);
    expect(() => parseGameFile(JSON.stringify({ ...regulation, format: "ff-game/0" }))).toThrow(/Make it again/);
    expect(() => parseGameFile(JSON.stringify({ ...regulation, events: [] }))).toThrow(/no plays/);
    const { players: _players, ...noPlayers } = regulation;
    expect(() => parseGameFile(JSON.stringify(noPlayers))).toThrow(/missing/);
  });

  it("still opens a file with event kinds it has never seen", () => {
    const newer = { ...regulation, events: [...regulation.events, { seq: 2, at, event: { type: "SOMETHING_NEW", payload: {}, gameId } }] };
    expect(() => parseGameFile(JSON.stringify(newer))).not.toThrow();
  });
});

describe("readScoreboard", () => {
  it("lays out GAME_END's score by quarter, away team on top", () => {
    const board = readScoreboard(regulation);
    expect(board.periodLabels).toEqual(["1", "2", "3", "4"]);
    expect(board.away).toEqual({ team: regulation.away, byPeriod: [0, 14, 3, 0], total: 17 });
    expect(board.home).toEqual({ team: regulation.home, byPeriod: [7, 3, 0, 7], total: 17 });
    expect(board.ending).toBe("Final");
    expect([board.plays, board.drives]).toEqual([120, 22]);
  });

  it("labels overtime and says how the game ended", () => {
    const ot = readScoreboard(file([1, 2, 3, 4, 5].map((period) => ({ period, home: 0, away: period === 5 ? 3 : 0 })), "OVERTIME"));
    expect(ot.periodLabels).toEqual(["1", "2", "3", "4", "OT"]);
    expect(ot.ending).toBe("Final (OT)");
    expect(periodLabel(6)).toBe("OT2");
    expect(readScoreboard(file([{ period: 1, home: 0, away: 0 }], "TIE")).ending).toBe("Final, tied");
  });

  it("refuses a game that never finished", () => {
    expect(() => readScoreboard({ ...regulation, events: regulation.events.slice(0, 1) })).toThrow(/never finished/);
  });
});
