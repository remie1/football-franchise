import { describe, expect, it } from "vitest";
import { type FranchiseEvent, type MoodReading, type PlayerId, type StaffId, type Team, type TeamId } from "../src/index.js";

// ADR-096 M1, M2: fan and media mood.
const team = "T1" as TeamId;
const readings: MoodReading[] = [
  { audience: "FANS", subject: { kind: "TEAM" }, value: -42, change: -18, causes: ["LOSS_TO_WORSE_TEAM", "LOSING_STREAK_3"] },
  { audience: "MEDIA", subject: { kind: "STAFF", staff: "hc" as StaffId, seat: "HEAD_COACH" }, value: -12, change: -4, causes: ["BIG_CALL"] },
  { audience: "FANS", subject: { kind: "PLAYER", player: "p9" as PlayerId }, value: 55, change: 20, causes: [] },
];

describe("fan and media mood (ADR-096)", () => {
  it("M1: a team's moods are one public event, with or without a week", () => {
    const weekly: FranchiseEvent = { type: "PUBLIC_MOOD_UPDATED", payload: { team, season: 2027, week: 9, readings } };
    const offseason: FranchiseEvent = { type: "PUBLIC_MOOD_UPDATED", payload: { team, season: 2027, readings: readings.slice(0, 1) } };
    expect(JSON.parse(JSON.stringify(weekly))).toEqual(weekly);
    expect(offseason.payload).not.toHaveProperty("week");
  });

  it("M2: a saved team carries its moods, and a team without them is still a team", () => {
    const t: Pick<Team, "mood"> = { mood: readings };
    const none: Pick<Team, "mood"> = {};
    expect(JSON.parse(JSON.stringify(t))).toEqual(t);
    expect(none.mood).toBeUndefined();
  });
});
