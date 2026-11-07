/**
 * ADR-096 step 2's `mood-check` tally: counts levels and the takes' mood sides from the events.
 */
import { describe, expect, it } from "vitest";
import { gameId, type FranchiseEventEnvelope, type MoodReading, type SeasonState, type TeamId } from "@ff/contracts";
import { moodReport, playoffChance, sumTallies, tallyMoodSeason } from "../src/season/moodCheck.js";

const team = (fans: number, media: number, causes: string[] = []): MoodReading[] => [
  { audience: "FANS", subject: { kind: "TEAM" }, value: fans, change: 0, causes },
  { audience: "MEDIA", subject: { kind: "TEAM" }, value: media, change: 0, causes },
];
const at = (week: number) => ({ season: 2026, phase: "REGULAR_SEASON" as const, week, day: 1 });
const mood = (t: string, week: number, readings: MoodReading[]): FranchiseEventEnvelope => ({
  seq: 0, at: at(week), event: { type: "PUBLIC_MOOD_UPDATED", payload: { team: t as TeamId, season: 2026, week, readings } },
});
// Two teams, three weeks: A loses every game, B wins every game.
const games = [1, 2, 3].map((w) => ({ gameId: gameId(`G${w}`), at: at(w), home: "A" as TeamId, away: "B" as TeamId, kind: "REGULAR" as const }));
const state = {
  season: 2026, schedule: { season: 2026, games }, standings: [],
  results: games.map((g) => ({ gameId: g.gameId, home: g.home, away: g.away, homeScore: 10, awayScore: 30, reason: "REGULATION" as const, seed: "s" })),
} as unknown as SeasonState;

describe("mood-check's tally", () => {
  const hc: MoodReading = { audience: "FANS", subject: { kind: "STAFF", staff: "S1" as never, seat: "HEAD_COACH" }, value: -45, change: 0, causes: [] };
  const events = [
    mood("A", 1, team(-30, -10)), mood("A", 2, team(-50, -15)), mood("A", 3, [...team(-70, -20, ["LOSING_STREAK_3"]), hc]),
    mood("B", 1, team(30, 10)), mood("B", 2, team(50, 15)), mood("B", 3, team(65, 20)),
  ];
  const t = tallyMoodSeason(2026, events, state);

  it("counts each level by audience", () => {
    expect(t.teamWeeks).toBe(6);
    expect(t.levels.FANS["-60"]).toBe(1);
    expect(t.levels.FANS["-40"]).toBe(2);
    expect(t.levels.FANS["40"]).toBe(2);
    expect(t.levels.FANS["60"]).toBe(1);
    expect(t.levels.MEDIA["-40"]).toBe(0);
    expect(t.furiousOnce).toBe(1);
    expect(t.homeMargin).toBe(-20);
  });

  it("finds FIRE in a losing streak, and TANK only once the playoff chance is gone", () => {
    expect(t.takeWeeks.FIRE).toBe(1);
    expect(t.fireBySeat.HEAD_COACH).toBe(1);
    // 0-2 and 0-3 in this three-game season: next to no chance, with fans at -50 and -70.
    expect(t.takeWeeks.TANK).toBe(2);
    expect(playoffChance({ wins: 0, losses: 3, ties: 0 }, 0)).toBeLessThan(0.1);
  });

  it("sums seasons and writes a report", () => {
    const s = sumTallies([t, t]);
    expect(s.teamWeeks).toBe(12);
    expect(s.teamSeasons).toBe(4);
    expect(moodReport([t], { league: "x", seed: "y", build: "z" })).toContain("| Fans | 16.7% |");
  });
});
