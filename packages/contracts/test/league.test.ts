import { describe, it, expect } from "vitest";
import {
  conferenceId, divisionId, teamId, gameId,
  DEFAULT_LEAGUE_RULES, SAVE_FORMAT_VERSION,
  type LeagueStructure, type SeasonState, type SaveFile, type FranchiseEvent,
} from "../src/index.js";

// ADR-078: the league shapes are plain data and survive a save round-trip unchanged.
const league: LeagueStructure = {
  conferences: [{ id: conferenceId("C1"), name: "First", divisions: [divisionId("C1-D1")] }],
  divisions: [{ id: divisionId("C1-D1"), name: "First North", conference: conferenceId("C1"), teams: [teamId("T1"), teamId("T2")] }],
};

const at = { season: 2026, phase: "REGULAR_SEASON" as const, week: 1, day: 7 };

const season: SeasonState = {
  season: 2026,
  schedule: {
    season: 2026,
    games: [{ gameId: gameId("G1"), season: 2026, kind: "REGULAR", at, home: teamId("T1"), away: teamId("T2"), neutralSite: false }],
    byes: [{ team: teamId("T1"), week: 9 }],
  },
  results: [{ gameId: gameId("G1"), home: teamId("T1"), away: teamId("T2"), homeScore: 24, awayScore: 24, reason: "TIE", seed: "s" }],
  standings: [{
    team: teamId("T1"),
    overall: { wins: 0, losses: 0, ties: 1 }, division: { wins: 0, losses: 0, ties: 1 },
    conference: { wins: 0, losses: 0, ties: 1 }, home: { wins: 0, losses: 0, ties: 1 },
    away: { wins: 0, losses: 0, ties: 0 }, pointsFor: 24, pointsAgainst: 24, divisionRank: 1,
    tiebreak: { over: teamId("T2"), step: "COIN_TOSS" },
  }],
  bracket: { season: 2026, seeds: [{ conference: conferenceId("C1"), teams: [teamId("T1")] }], games: [], champion: teamId("T1") },
};

describe("league shapes (ADR-078)", () => {
  it("a SaveFile carrying the league and season round-trips through JSON unchanged", () => {
    const save: SaveFile = {
      formatVersion: SAVE_FORMAT_VERSION, createdBy: "test", registrySchemaVersion: 1,
      worldSeed: "w", calendar: at, leagueRules: DEFAULT_LEAGUE_RULES,
      world: { teams: [], players: [], staff: [], contracts: [], perceptions: [], league, season, narrativeState: null, fashion: null },
      history: { seasons: [], transactions: [] },
    };
    expect(JSON.parse(JSON.stringify(save))).toEqual(save);
  });

  it("a SaveFile may record what played its games (save and load E1), and stays valid without it", () => {
    const save: SaveFile = {
      formatVersion: SAVE_FORMAT_VERSION, createdBy: "test", registrySchemaVersion: 1,
      worldSeed: "w", calendar: at, leagueRules: DEFAULT_LEAGUE_RULES,
      world: { teams: [], players: [], staff: [], contracts: [], perceptions: [], league, season, narrativeState: null, fashion: null },
      history: { seasons: [], transactions: [] },
      playedWith: { caller: "v5" },
    };
    expect(JSON.parse(JSON.stringify(save))).toEqual(save);
    const { playedWith: _, ...older } = save;
    expect(JSON.parse(JSON.stringify(older)).playedWith).toBeUndefined();
  });

  it("the season events carry results and seeds", () => {
    const events: FranchiseEvent[] = [
      { type: "GAME_COMPLETED", payload: { result: season.results[0]!, kind: "REGULAR" } },
      { type: "PLAYOFF_FIELD_SET", payload: { season: 2026, seeds: season.bracket!.seeds } },
      { type: "CHAMPION_DECIDED", payload: { season: 2026, team: teamId("T1") } },
    ];
    expect(JSON.parse(JSON.stringify(events))).toEqual(events);
  });
});

describe("news shapes (ADR-082)", () => {
  it("N2: a result may carry its period scores, and still round-trips", () => {
    const withPeriods = {
      ...season.results[0]!,
      periods: [
        { period: 1, home: 7, away: 0 }, { period: 2, home: 3, away: 10 },
        { period: 3, home: 7, away: 7 }, { period: 4, home: 7, away: 7 },
      ],
    };
    expect(withPeriods.periods.reduce((n, p) => n + p.home, 0)).toBe(withPeriods.homeScore);
    expect(JSON.parse(JSON.stringify(withPeriods))).toEqual(withPeriods);
  });

  it("N1: a news story names its kind, importance, teams and games", () => {
    const story: FranchiseEvent = {
      type: "PRESS_STORY_PUBLISHED",
      payload: { kind: "TIE", headline: "First and Second can't be separated", importance: 3, teams: [teamId("T1"), teamId("T2")], games: [gameId("G1")], subjects: [] },
    };
    expect(JSON.parse(JSON.stringify(story))).toEqual(story);
  });
});
