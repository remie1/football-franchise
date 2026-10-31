import { describe, expect, it } from "vitest";
import {
  COACH_ATTRIBUTE_REGISTRY_V1,
  type FranchiseEvent, type SaveFile, type StaffMeeting, type StaffRole, type StaffId, type Team, type TeamId,
} from "../src/index.js";

// ADR-081 G1, G2, G3, G5: the end-of-season meeting's shapes.
const sid = (s: string) => s as StaffId;
const team = "T1" as TeamId;
const meeting: StaffMeeting = {
  team, season: 2027, at: { season: 2028, phase: "OFF_EVAL", week: 1, day: 1 },
  takes: [
    { speaker: sid("gm"), claim: { point: "LUCK", verdict: "LUCKY" }, grade: "SHARP", certainty: 80, volunteered: true },
    { speaker: sid("dc"), claim: { point: "HOLES", groups: ["CB", "S"] }, grade: "MISS", certainty: 95, volunteered: false },
    { speaker: sid("gm"), claim: { point: "WINDOW", direction: "REBUILD" }, grade: "CLOSE", certainty: 55, volunteered: true },
  ],
  clashes: [{ point: "HOLES", between: [sid("gm"), sid("dc")], heat: "OPEN_ARGUMENT" }],
};

describe("the end-of-season meeting (ADR-081)", () => {
  it("G1: the GM is a staff seat", () => {
    const role: StaffRole = "GM";
    expect(role).toBe("GM");
  });

  it("G2: a meeting and a 'how sure?' are events, and the save keeps meetings", () => {
    const held: FranchiseEvent = { type: "STAFF_MEETING_HELD", payload: { meeting } };
    const asked: FranchiseEvent = { type: "MEETING_CERTAINTY_ASKED", payload: { team, season: 2027, speaker: sid("dc"), point: "HOLES", certainty: 95 } };
    expect(JSON.parse(JSON.stringify(held))).toEqual(held);
    expect(asked.type).toBe("MEETING_CERTAINTY_ASKED");
    const world: Pick<SaveFile["world"], "meetings"> = { meetings: [meeting] };
    expect(world.meetings![0]!.takes).toHaveLength(3);
  });

  it("G3: a team carries its direction, and setting it is an event", () => {
    const t: Pick<Team, "direction"> = { direction: "RETOOL" };
    const set: FranchiseEvent = { type: "TEAM_DIRECTION_SET", payload: { team, season: 2027, direction: "CONTEND", authority: "GM" } };
    expect(t.direction).toBe("RETOOL");
    expect(set.payload).toMatchObject({ direction: "CONTEND" });
  });

  it("G5: five new staff skills join the coaches' list, after the first 19", () => {
    const ids = Object.keys(COACH_ATTRIBUTE_REGISTRY_V1);
    expect(ids).toHaveLength(24);
    expect(ids.slice(19)).toEqual(["performanceAnalysis", "forecasting", "capManagement", "marketSense", "nuance"]);
  });
});
