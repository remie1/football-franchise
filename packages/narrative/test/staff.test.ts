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
