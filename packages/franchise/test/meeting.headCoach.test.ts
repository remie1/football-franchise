/**
 * ADR-094 §7 (build step 4): the head coach in the end-of-season meeting, behind its switch.
 */
import { describe, expect, it } from "vitest";
import { createRng, type FranchiseEventEnvelope, type MeetingTake, type StaffMeeting } from "@ff/contracts";
import {
  buildStaff, headCoachReport, MEETING_LEAN, runSeason, seatOf, stepsApart, tiltWindow, type GameResolver, type LeaguePeople,
} from "../src/index.js";
import { league, startingPeople } from "./playersWorld.js";

describe("the lean's tilt on a window read (§7)", () => {
  // windowOf: contend at a share of 0.6 next season (10.2 wins), rebuild below half next season and 0.45 after (7.65).
  const near = { winsNext: 9.7, winsAfter: 9.7 };
  const far = { winsNext: 8, winsAfter: 9 };
  it("moves a borderline read one step toward contend at 70 and up, and leaves the rest alone", () => {
    expect(tiltWindow("RETOOL", MEETING_LEAN.contendFrom, near)).toBe("CONTEND");
    expect(tiltWindow("REBUILD", 90, near)).toBe("RETOOL");
    expect(tiltWindow("RETOOL", MEETING_LEAN.contendFrom - 1, near)).toBe("RETOOL");
    expect(tiltWindow("RETOOL", 95, far)).toBe("RETOOL");
    expect(tiltWindow("CONTEND", 95, near)).toBe("CONTEND");
  });
  it("moves a borderline read one step toward rebuild at 30 and under", () => {
    const low = { winsNext: 8, winsAfter: 7.9 };
    expect(tiltWindow("RETOOL", MEETING_LEAN.rebuildTo, low)).toBe("REBUILD");
    expect(tiltWindow("CONTEND", 10, low)).toBe("RETOOL");
    expect(tiltWindow("RETOOL", MEETING_LEAN.rebuildTo + 1, low)).toBe("RETOOL");
    expect(tiltWindow("RETOOL", 5, { winsNext: 9, winsAfter: 9 })).toBe("RETOOL");
  });
});

describe("the head coach's report and his arguments", () => {
  const built = buildStaff(league, { firstSeason: 2027, historySeasons: 4 });
  const hc = built.world.staff.find((s) => seatOf(s) === "HEAD_COACH")!;
  const truth = {
    season: 2027, team: hc.teamId!, winsNext: 9.7, winsAfter: 9.7, window: "RETOOL", luck: { verdict: "EVEN", gap: 0 },
  } as unknown as Parameters<typeof headCoachReport>[0]["truth"];
  it("speaks to next season's wins and the window, the same every time, his lean tilting the window", () => {
    const a = headCoachReport({ coach: hc, truth, seed: "hc", lean: 50 });
    expect(a.map((t) => t.claim.point)).toEqual(["NEXT_WINS", "WINDOW"]);
    expect(headCoachReport({ coach: hc, truth, seed: "hc", lean: 50 })).toEqual(a);
    const hot = headCoachReport({ coach: hc, truth, seed: "hc", lean: 95 });
    expect(hot[1]!.claim.direction).toBe(tiltWindow(a[1]!.claim.direction!, 95, truth));
  });
  it("argues the window by steps apart, and two men's wins by how far apart they are", () => {
    const take = (claim: MeetingTake["claim"]): MeetingTake => ({ speaker: hc.id, claim, grade: "SHARP", certainty: 80, volunteered: false });
    expect(stepsApart(take({ point: "WINDOW", direction: "CONTEND" }), take({ point: "WINDOW", direction: "REBUILD" }))).toBe(2);
    expect(stepsApart(take({ point: "WINDOW", direction: "CONTEND" }), take({ point: "WINDOW", direction: "RETOOL" }))).toBe(1);
    expect(stepsApart(take({ point: "WINDOW", direction: "RETOOL" }), take({ point: "WINDOW", direction: "RETOOL" }))).toBe(0);
    expect(stepsApart(take({ point: "NEXT_WINS", wins: 10 }), take({ point: "NEXT_WINS", wins: 6 }))).toBe(2);
    expect(stepsApart(take({ point: "NEXT_WINS", wins: 10 }), take({ point: "NEXT_WINS", wins: 8 }))).toBe(1);
    expect(stepsApart(take({ point: "NEXT_WINS", wins: 10 }), take({ point: "NEXT_WINS", wins: 9 }))).toBe(0);
  });
});

describe("the meeting in the season's walk, with and without the switch", () => {
  const fake: GameResolver = (game, seed) => {
    const rng = createRng(seed, "meeting-game");
    const homeScore = rng.int(0, 6) * 7 + rng.int(0, 3), awayScore = rng.int(0, 6) * 7 + rng.int(0, 3);
    return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
  };
  const built = buildStaff(league, { firstSeason: 2027, historySeasons: 4 });
  const people: LeaguePeople = { ...startingPeople(), staff: built.world.staff, coaching: { world: built.world } };
  const input = { league, season: 2027, seed: "meet-hc", resolve: fake, people, through: "PLAYOFFS" as const, coaching: {} };
  const meetings = (events: readonly FranchiseEventEnvelope[]): StaffMeeting[] =>
    events.flatMap((e) => (e.event.type === "STAFF_MEETING_HELD" ? [e.event.payload.meeting] : []));
  const off = runSeason({ ...input, meeting: {} });
  const on = runSeason({ ...input, meeting: { headCoach: true } });

  it("leaves the meeting as it was with the switch off", () => {
    const hcs = new Set(built.world.staff.filter((s) => seatOf(s) === "HEAD_COACH").map((s) => String(s.id)));
    for (const m of meetings(off.events)) expect(m.takes.some((t) => hcs.has(String(t.speaker)))).toBe(false);
    expect(on.state.results).toEqual(off.state.results);
  });

  it("with it on, seats the head coach in every meeting, argues with him, and sets each course by the GM's last word", () => {
    const ms = meetings(on.events);
    expect(ms).toHaveLength(32);
    let windowClashes = 0;
    for (const m of ms) {
      const speakers = new Map<string, string[]>();
      for (const t of m.takes) speakers.set(String(t.speaker), [...(speakers.get(String(t.speaker)) ?? []), t.claim.point]);
      expect([...speakers.values()].filter((p) => p.join() === "NEXT_WINS,WINDOW")).toHaveLength(1);
      windowClashes += m.clashes.filter((c) => c.point === "WINDOW").length;
    }
    expect(windowClashes).toBeGreaterThan(0);
    const set = on.events.filter((e) => e.event.type === "TEAM_DIRECTION_SET");
    expect(set).toHaveLength(32);
    // The GM's own read, or (Q3 b) one step toward the coach's after a WINDOW argument.
    const order = ["REBUILD", "RETOOL", "CONTEND"];
    for (const e of set) {
      if (e.event.type !== "TEAM_DIRECTION_SET") continue;
      const m = ms.find((x) => x.team === e.event.payload.team)!;
      const bySpeaker = new Map<string, MeetingTake[]>();
      for (const t of m.takes) bySpeaker.set(String(t.speaker), [...(bySpeaker.get(String(t.speaker)) ?? []), t]);
      const gmWindow = [...bySpeaker.values()].find((ts) => ts.length === 9)!.find((t) => t.claim.point === "WINDOW")!.claim.direction!;
      const hcWindow = [...bySpeaker.values()].find((ts) => ts.length === 2)!.find((t) => t.claim.point === "WINDOW")!.claim.direction!;
      const d = e.event.payload.direction;
      if (d === gmWindow) continue;
      expect(m.clashes.some((c) => c.point === "WINDOW")).toBe(true);
      const g = order.indexOf(gmWindow), h = order.indexOf(hcWindow);
      expect(order.indexOf(d)).toBe(g + Math.sign(h - g));
    }
    expect(runSeason({ ...input, meeting: { headCoach: true } }).events).toEqual(on.events);
  });
});
