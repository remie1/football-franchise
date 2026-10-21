/**
 * S6 against a real postseason: seeding the 2023 field from the real regular season, then
 * feeding the real winners round by round must produce the real matchups, hosts and champion.
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_LEAGUE_RULES, teamId, type GameResult, type PlayoffBracket, type ScheduledGame } from "@ff/contracts";
import { advanceBracket, conferenceRounds, roundKind, roundWeek, seedPlayoffs, seedOf } from "../src/index.js";
import { nflLeague, nflResults, ids, AFC, NFC } from "./nflSeasons.js";

/** Plays the open games with `winners` (a set of team ids) winning 24-17 at home or 17-24 away. */
function decide(games: readonly ScheduledGame[], winners: ReadonlySet<string>, done: GameResult[]): GameResult[] {
  const out = [...done];
  for (const g of games) {
    if (out.some((r) => r.gameId === g.gameId)) continue;
    const homeWins = winners.has(String(g.home));
    if (!homeWins && !winners.has(String(g.away))) throw new Error(`no winner listed for ${String(g.gameId)}`);
    out.push({ gameId: g.gameId, home: g.home, away: g.away, homeScore: homeWins ? 24 : 17, awayScore: homeWins ? 17 : 24, reason: "REGULATION", seed: "t" });
  }
  return out;
}

const matchups = (b: PlayoffBracket, kind: string) =>
  b.games.filter((g) => g.kind === kind).map((g) => `${String(g.away)}@${String(g.home)}`).sort();

describe("playoffs: the 2023 NFL postseason", () => {
  const field = seedPlayoffs(nflLeague, nflResults(2023), 2023);

  it("seeds 7 per conference from the regular season", () => {
    expect(field.seeds).toEqual([
      { conference: AFC, teams: ids("BAL BUF KC HOU CLE MIA PIT") },
      { conference: NFC, teams: ids("SF DAL DET TB PHI LA GB") },
    ]);
    expect(field.games).toEqual([]);
    expect(seedOf(field, teamId("GB"))).toEqual({ conference: NFC, seed: 7 });
  });

  it("plays the real bracket round by round, re-seeding, and crowns the real champion", () => {
    let b = advanceBracket(field, []);
    expect(matchups(b, "WILD_CARD")).toEqual(["CLE@HOU", "GB@DAL", "LA@DET", "MIA@KC", "PHI@TB", "PIT@BUF"]);
    let results = decide(b.games, new Set(ids("HOU KC BUF GB TB DET").map(String)), []);

    b = advanceBracket(b, results);
    // Re-seeding: the 1 seed hosts the lowest survivor (GB is the 7 seed).
    expect(matchups(b, "DIVISIONAL")).toEqual(["GB@SF", "HOU@BAL", "KC@BUF", "TB@DET"]);
    results = decide(b.games, new Set(ids("BAL KC SF DET").map(String)), results);

    b = advanceBracket(b, results);
    expect(matchups(b, "CONFERENCE_FINAL")).toEqual(["DET@SF", "KC@BAL"]);
    results = decide(b.games, new Set(ids("KC SF").map(String)), results);

    b = advanceBracket(b, results);
    const final = b.games.find((g) => g.kind === "CHAMPIONSHIP")!;
    expect(final).toMatchObject({ neutralSite: true, at: { phase: "PLAYOFFS", week: 5 } });
    expect(new Set([String(final.home), String(final.away)])).toEqual(new Set(["KC", "SF"]));
    expect(b.champion).toBeUndefined();
    results = decide(b.games, new Set(["KC"]), results);

    b = advanceBracket(b, results);
    expect(b.champion).toBe("KC");
    expect(b.games).toHaveLength(13);
    expect(advanceBracket(b, results)).toBe(b);
  });

  it("does not move on while a game of the round is unplayed", () => {
    const b = advanceBracket(field, []);
    const partial = decide(b.games.slice(0, 5), new Set(ids("HOU KC BUF GB TB DET").map(String)), []);
    expect(advanceBracket(b, partial)).toBe(b);
  });

  it("refuses a level playoff result", () => {
    const b = advanceBracket(field, []);
    const level = b.games.map((g): GameResult => ({ gameId: g.gameId, home: g.home, away: g.away, homeScore: 20, awayScore: 20, reason: "TIE", seed: "t" }));
    expect(() => advanceBracket(b, level)).toThrow(/needs a winner/);
  });
});

describe("playoffs: bracket arithmetic", () => {
  it("names rounds and weeks for 7, 6, 4 and 2 clubs", () => {
    expect(conferenceRounds(7)).toBe(3);
    expect(conferenceRounds(6)).toBe(3);
    expect(conferenceRounds(4)).toBe(2);
    expect(conferenceRounds(2)).toBe(1);
    expect([0, 1, 2].map((r) => roundKind(r, 3))).toEqual(["WILD_CARD", "DIVISIONAL", "CONFERENCE_FINAL"]);
    expect([0, 1, 2, 3].map((r) => roundWeek(r, 3))).toEqual([1, 2, 3, 5]);
    expect(() => conferenceRounds(9)).toThrow(/rounds/);
  });

  it("gives the top two seeds a bye with a 6-club field", () => {
    const b = advanceBracket(seedPlayoffs(nflLeague, nflResults(2023), 2023, { ...DEFAULT_LEAGUE_RULES, playoffTeamsPerConference: 6 }), []);
    expect(matchups(b, "WILD_CARD")).toEqual(["CLE@HOU", "LA@DET", "MIA@KC", "PHI@TB"]);
  });
});
