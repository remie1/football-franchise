/**
 * THE COACHING BEAT (ADR-084 L4; coaching-change news, Q5 a; leaks, Q4 b).
 *
 *  1. Every head coach who leaves and every one hired gets a headline; coordinator moves, one roundup.
 *  2. Only a man holding a strained or broken view leaks, never by name, about once in two years
 *     strained and once a year broken, at most once a team a week, and only in the room left.
 *  3. A grudge opening is its own story.
 */
import { describe, expect, it } from "vitest";
import {
  type CalendarStamp, type FranchiseEvent, type FranchiseEventEnvelope, type RelationshipWord, type StaffId, type TeamId,
} from "@ff/contracts";
import { writeNews } from "../src/news/desk.js";
import type { StaffSeat, StaffView } from "../src/news/staff.js";
import { day, input, schedule, seasonEvents, T } from "./fixtures.js";

const sched = schedule(18);
const sid = (s: string) => s as StaffId;
/** Each team: head coach H-<team>, coordinators O-, D-, S-. */
const SEATS: StaffSeat[] = Object.values(T).flatMap((team) => ([
  ["H", "HEAD_COACH"], ["O", "OC"], ["D", "DC"], ["S", "STC"],
] as const).map(([p, role]) => ({ id: sid(`${p}-${String(team)}`), team, role })));

const offDay = (week: number): CalendarStamp => day(week, 1, "OFF_EVAL");
let seq = 10_000;
const at = (when: CalendarStamp, event: FranchiseEvent): FranchiseEventEnvelope => ({ seq: seq++, at: when, event });
const stories = (eds: ReturnType<typeof writeNews>) => eds.flatMap((e) => e.stories.map((s) => ({ label: e.label, ...s.event.payload })));

describe("coaching changes (Q5 a)", () => {
  const w = offDay(1);
  const carousel = [
    at(w, { type: "STAFF_DEPARTED", payload: { staff: sid(`H-${String(T.A1)}`), team: T.A1!, reason: "FIRED" } }),
    at(w, { type: "STAFF_DEPARTED", payload: { staff: sid(`H-${String(T.B1)}`), team: T.B1!, reason: "FIRED" } }),
    at(w, { type: "STAFF_DEPARTED", payload: { staff: sid(`D-${String(T.A3)}`), team: T.A3!, reason: "FIRED" } }),
    at(w, { type: "STAFF_HIRED", payload: { staff: sid(`O-${String(T.A1)}`), team: T.A1!, role: "HEAD_COACH" } }),
    at(w, { type: "STAFF_DEPARTED", payload: { staff: sid(`O-${String(T.A2)}`), team: T.A2!, reason: "HIRED_AWAY" } }),
    at(w, { type: "STAFF_HIRED", payload: { staff: sid(`O-${String(T.A2)}`), team: T.B1!, role: "HEAD_COACH" } }),
    at(w, { type: "STAFF_HIRED", payload: { staff: sid("NEW-1"), team: T.A3!, role: "DC" } }),
  ];
  const events = [...seasonEvents(sched, "beat"), ...carousel, at(offDay(2), { type: "CALENDAR_PHASE_ENTERED", payload: { phase: "OFF_EVAL" } })];
  const eds = writeNews({ ...input(sched), staff: SEATS }, events);
  const coaching = stories(eds).filter((s) => s.label === "Coaching changes");

  it("runs a headline for each head coach who leaves and each one hired, whatever the cap", () => {
    expect(coaching.filter((s) => s.kind === "COACH_DEPARTS").map((s) => s.teams.map(String))).toEqual([[String(T.A1)], [String(T.B1)]]);
    expect(coaching.filter((s) => s.kind === "COACH_HIRED")).toHaveLength(2);
  });

  it("tells a promotion from a hire off another staff, and names jobs and teams, never men", () => {
    const hires = coaching.filter((s) => s.kind === "COACH_HIRED").map((s) => s.headline);
    expect(hires.some((h) => /offensive coordinator/.test(h) && /Ashford|Anchors/.test(h))).toBe(true);
    expect(hires.some((h) => /Bayport|Bison/.test(h))).toBe(true);
    for (const s of coaching) expect(s.headline).not.toMatch(/H-|O-|D-|NEW-/);
  });

  it("rolls the coordinator moves into one roundup", () => {
    const roundup = coaching.filter((s) => s.kind === "COORDINATOR_ROUNDUP");
    expect(roundup).toHaveLength(1);
    expect(roundup[0]!.headline).toMatch(/\b(2|two)\b/i); // two seats: A2's OC (gone), A3's DC (left and filled)
  });
});

/** A year of quiet offseason weeks (one event each), with every view in `word`. */
function quietYear(word: RelationshipWord, seed = "leaks") {
  const views: StaffView[] = SEATS.filter((s) => s.role !== "HEAD_COACH").map((s) => ({
    from: s.id, of: { staff: sid(`H-${String(s.team)}`) }, word,
  }));
  const events: FranchiseEventEnvelope[] = [];
  for (let y = 0; y < 10; y++) {
    for (let w = 1; w <= 52; w++) {
      const when: CalendarStamp = { season: 2027 + y, phase: "OFF_SUMMER", week: w, day: 1 };
      events.push(at(when, { type: "CALENDAR_DEADLINE_REACHED", payload: { deadline: "x" } } as unknown as FranchiseEvent));
    }
  }
  return stories(writeNews({ ...input(sched, seed), staff: SEATS, views }, events));
}

describe("leaks (Q4 b)", () => {
  it("come only from a strained or broken view, about once a year a man when broken, half that strained", () => {
    const broken = quietYear("broken").filter((s) => s.kind === "LEAK");
    const strained = quietYear("strained").filter((s) => s.kind === "LEAK");
    // 24 coordinators over 10 years: about 240 broken, about 120 strained, less the one-a-team-a-week rule.
    expect(broken.length).toBeGreaterThan(160);
    expect(broken.length).toBeLessThan(300);
    expect(strained.length).toBeGreaterThan(70);
    expect(strained.length).toBeLessThan(170);
    expect(quietYear("professional").some((s) => s.kind === "LEAK")).toBe(false);
    expect(quietYear("good").some((s) => s.kind === "LEAK")).toBe(false);
  });

  it("name the job, never the man", () => {
    for (const s of quietYear("broken").filter((x) => x.kind === "LEAK")) {
      expect(s.headline).toMatch(/coordinator|staff/);
      expect(s.headline).not.toMatch(/O-|D-|S-|H-/);
    }
  });

  it("wait for room: a week whose games fill the paper carries none", () => {
    const views: StaffView[] = SEATS.filter((s) => s.role !== "HEAD_COACH").map((s) => ({ from: s.id, of: { staff: sid(`H-${String(s.team)}`) }, word: "broken" }));
    const eds = writeNews({ ...input(sched), staff: SEATS, views }, seasonEvents(sched, "beat"));
    for (const e of eds) {
      const leaks = e.stories.filter((s) => s.event.payload.kind === "LEAK").length;
      const others = e.stories.filter((s) => s.event.payload.kind !== "LEAK").length;
      if (leaks > 0) expect(others).toBeLessThan(4);
    }
  });

  it("follow the views as they move: a view that turns sour starts leaking, one that recovers stops", () => {
    const holder = sid(`O-${String(T.A1)}`);
    const boss = { staff: sid(`H-${String(T.A1)}`) };
    const change = (when: CalendarStamp, before: RelationshipWord, after: RelationshipWord) =>
      at(when, { type: "RELATIONSHIP_CHANGED", payload: { from: holder, of: boss, delta: 0, cause: "TEST", before, after } });
    const events: FranchiseEventEnvelope[] = [];
    for (let y = 0; y < 20; y++) {
      for (let w = 1; w <= 52; w++) {
        const when: CalendarStamp = { season: 2027 + y, phase: "OFF_SUMMER", week: w, day: 1 };
        if (y === 0 && w === 1) events.push(change(when, "professional", "broken"));
        else if (y === 10 && w === 1) events.push(change(when, "broken", "good"));
        else events.push(at(when, { type: "CALENDAR_DEADLINE_REACHED", payload: { deadline: "x" } } as unknown as FranchiseEvent));
      }
    }
    const eds = writeNews({ ...input(sched), staff: SEATS }, events);
    const leakSeasons = eds.filter((e) => e.stories.some((s) => s.event.payload.kind === "LEAK")).map((e) => e.at.season);
    expect(leakSeasons.length).toBeGreaterThan(3);
    for (const s of leakSeasons) expect(s).toBeLessThan(2037);
  });
});

describe("grudges", () => {
  it("a rift opening is a story of its own", () => {
    const when = offDay(3);
    const events = [at(when, { type: "RELATIONSHIP_CHANGED", payload: {
      from: sid(`D-${String(T.B2)}`), of: { staff: sid(`O-${String(T.B2)}`) }, delta: -35, cause: "OPEN_ARGUMENT",
      before: "professional", after: "strained", rift: "OPENED",
    } })];
    const s = stories(writeNews({ ...input(sched), staff: SEATS }, events));
    expect(s.map((x) => x.kind)).toEqual(["RIFT"]);
    expect(s[0]!.headline).toMatch(/defensive coordinator/);
    expect(s[0]!.teams.map(String)).toEqual([String(T.B2 as TeamId)]);
  });
});

describe("the GM and his head coach (ADR-094 step 5)", () => {
  const gm = (t: TeamId) => sid(`G-${String(t)}`);
  const hc = (t: TeamId) => sid(`H-${String(t)}`);
  const WITH_GMS: StaffSeat[] = [...SEATS, ...Object.values(T).map((team) => ({ id: gm(team), team, role: "GM" as const }))];
  const argued = (when: CalendarStamp, team: TeamId, coachStance: "BUY" | "HOLD" | "SELL", outcome: "BUY" | "HOLD" | "SELL", heat: "POLITE" | "OPEN_ARGUMENT" | "RIFT") =>
    at(when, { type: "COURSE_ARGUED", payload: {
      team, season: when.season, week: when.week, gm: gm(team), coach: hc(team), gmStance: outcome, coachStance, heat, outcome,
    } });

  it("seats the GM on the beat: his sour views leak, by job, and his moves stay out of the coordinator roundup", () => {
    const views: StaffView[] = Object.values(T).map((team) => ({ from: gm(team), of: { staff: hc(team) }, word: "broken" }));
    const events: FranchiseEventEnvelope[] = [];
    for (let w = 1; w <= 52 * 3; w++) {
      events.push(at({ season: 2027 + Math.floor((w - 1) / 52), phase: "OFF_SUMMER", week: ((w - 1) % 52) + 1, day: 1 },
        { type: "CALENDAR_DEADLINE_REACHED", payload: { deadline: "x" } } as unknown as FranchiseEvent));
    }
    const leaks = stories(writeNews({ ...input(sched, "gm-leaks"), staff: WITH_GMS, views }, events)).filter((s) => s.kind === "LEAK");
    expect(leaks.length).toBeGreaterThan(10); // 8 men, 3 years, about once a year each
    for (const s of leaks) {
      expect(s.headline).toMatch(/general manager|front office/i);
      expect(s.headline).not.toMatch(/G-|H-/);
    }
    const w = offDay(1);
    const moves = [
      at(w, { type: "STAFF_DEPARTED", payload: { staff: gm(T.A1!), team: T.A1!, reason: "FIRED" } }),
      at(w, { type: "STAFF_HIRED", payload: { staff: sid("NEW-GM"), team: T.A1!, role: "GM" } }),
    ];
    expect(stories(writeNews({ ...input(sched), staff: WITH_GMS }, moves)).some((s) => s.kind === "COORDINATOR_ROUNDUP")).toBe(false);
  });

  it("leaks an open argument over the course now and then, the week the split starts, and never a polite one", () => {
    const count = (heat: "POLITE" | "OPEN_ARGUMENT" | "RIFT") => {
      let leaks = 0;
      for (let i = 0; i < 400; i++) {
        const when: CalendarStamp = { season: 2027 + i, phase: "OFF_SUMMER", week: 1, day: 1 };
        const s = stories(writeNews({ ...input(sched, `course-${i}`), staff: WITH_GMS }, [argued(when, T.B3!, "BUY", "HOLD", heat)]));
        leaks += s.filter((x) => x.kind === "COURSE_LEAK").length;
        for (const x of s) expect(x.headline).not.toMatch(/G-|H-/);
      }
      return leaks;
    };
    expect(count("POLITE")).toBe(0);
    const open = count("OPEN_ARGUMENT"), rift = count("RIFT");
    expect(open).toBeGreaterThan(60); // 400 x 0.25
    expect(open).toBeLessThan(140);
    expect(rift).toBeGreaterThan(200); // 400 x 0.6
    expect(rift).toBeLessThan(280);
  });

  it("does not leak the same split again the next week, but does when it widens", () => {
    let again = 0, wider = 0;
    for (let i = 0; i < 300; i++) {
      const w1: CalendarStamp = { season: 2027, phase: "OFF_SUMMER", week: 1, day: 1 };
      const w2: CalendarStamp = { ...w1, week: 2 };
      const same = stories(writeNews({ ...input(sched, `again-${i}`), staff: WITH_GMS }, [
        argued(w1, T.A2!, "BUY", "HOLD", "RIFT"), argued(w2, T.A2!, "BUY", "HOLD", "RIFT"),
      ]));
      again += same.filter((x) => x.kind === "COURSE_LEAK").length > 1 ? 1 : 0;
      const grew = stories(writeNews({ ...input(sched, `again-${i}`), staff: WITH_GMS }, [
        argued(w1, T.A2!, "BUY", "HOLD", "RIFT"), argued(w2, T.A2!, "BUY", "SELL", "RIFT"),
      ]));
      wider += grew.filter((x) => x.kind === "COURSE_LEAK").length > 1 ? 1 : 0;
    }
    expect(again).toBe(0);
    expect(wider).toBeGreaterThan(60); // both weeks leak about 0.6 x 0.6 of the time
  });

  it("runs a deadline-week headline for each team still split after the last games before the deadline", () => {
    const events = [...seasonEvents(sched, "deadline")];
    const ins = (e: FranchiseEventEnvelope) => {
      const i = events.findIndex((x) => compareAt(x.at, e.at) > 0);
      events.splice(i < 0 ? events.length : i, 0, e);
    };
    const compareAt = (a: CalendarStamp, b: CalendarStamp) => a.week - b.week || a.day - b.day;
    ins(argued(day(8, 7), T.A3!, "BUY", "SELL", "POLITE")); // split in week 8, made up by week 9
    ins(argued(day(9, 7), T.A1!, "BUY", "HOLD", "POLITE"));
    ins(argued(day(9, 7), T.B2!, "HOLD", "SELL", "OPEN_ARGUMENT"));
    ins(argued(day(9, 7), T.B4!, "BUY", "BUY", "POLITE")); // the GM met him all the way: no split
    ins(at(day(10, 2), { type: "DEADLINE_REACHED", payload: { deadlineId: "TRADE_DEADLINE", autoResolved: true } }));
    const s = stories(writeNews({ ...input(sched), staff: WITH_GMS }, events)).filter((x) => x.kind === "DEADLINE_SPLIT");
    expect(s.map((x) => x.label)).toEqual(["Week 10", "Week 10"]);
    expect(s.map((x) => String(x.teams[0])).sort()).toEqual([String(T.A1), String(T.B2)]);
    expect(s.find((x) => String(x.teams[0]) === String(T.A1))!.headline).toMatch(/Ashford|Anchors/);
    for (const x of s) expect(x.headline).not.toMatch(/G-|H-/);
  });
});
