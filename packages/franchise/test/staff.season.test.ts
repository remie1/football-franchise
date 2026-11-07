import { describe, it, expect } from "vitest";
import { createRng, type CalendarStamp, type FranchiseEventEnvelope, type RelationshipView } from "@ff/contracts";
import {
  buildLeague, buildStaff, checkViews, restPoint, runSeason, runStaffOffseason, seatRelationships, summariseSeason, PHASE_WEEKS, DAYS_PER_WEEK,
  type GameResolver, type LeaguePeople,
} from "../src/index.js";

// ADR-084 step 1: the coaching carousel and the views in the season's walk.

const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "fake-game");
  const homeScore = rng.int(0, 5) * 7;
  const awayScore = rng.int(0, 5) * 7;
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};

const league = buildLeague("staff-walk");
const built = buildStaff(league, { firstSeason: 2027, historySeasons: 6 });
const people: LeaguePeople = {
  teams: league.teams, players: [], picks: [], classes: [], freeAgents: [],
  staff: built.world.staff, coaching: { world: built.world },
};
const base = { league, season: 2027, seed: "walk", resolve: fake, people, through: "YEAR" as const };
const run = runSeason({ ...base, coaching: {} });
const after = run.people!.coaching!;

const types = (events: readonly FranchiseEventEnvelope[]) => events.map((e) => e.event.type);
const staffEvents = (events: readonly FranchiseEventEnvelope[]) =>
  events.filter((e) => e.event.type === "STAFF_DEPARTED" || e.event.type === "STAFF_HIRED").map((e) => e.event);

describe("the coaches in the season's walk (ADR-084 step 1)", () => {
  it("plays the same season with or without the coaches' steps", () => {
    const plain = runSeason(base);
    expect(plain.state).toEqual(run.state);
    expect(plain.people!.coaching!.world).toBe(built.world);
  });

  it("runs the carousel once, after the playoffs, on the season just played", () => {
    // The world as the playoffs end: the season's midseason firings (ADR-094 Q13 a) already made.
    const end: CalendarStamp = { season: 2027, phase: "PLAYOFFS", week: PHASE_WEEKS.PLAYOFFS, day: DAYS_PER_WEEK };
    const before = runSeason({ ...base, coaching: {}, stopAfter: end }).people!.coaching!;
    const direct = runStaffOffseason({
      world: before.world, results: summariseSeason(run.state), seed: "walk", players: new Map(),
      relationships: { views: before.relationships! },
    });
    expect(after.world).toEqual(direct.world);
    expect(after.world.season).toBe(2028);
    const offseason = (events: readonly FranchiseEventEnvelope[]) => staffEvents(events.filter((e) => e.at.phase === "OFF_EVAL"));
    expect(offseason(run.events)).toEqual(staffEvents(direct.events));
    expect(offseason(run.events).length).toBeGreaterThan(0);
    const at = run.events.filter((e) => e.event.type === "STAFF_HIRED" && e.at.phase !== "REGULAR_SEASON").map((e) => e.at);
    expect(new Set(at.map((s) => `${s.phase}/${s.week}/${s.day}`))).toEqual(new Set(["OFF_EVAL/1/1"]));
  });

  it("fires in midseason only after a regular-season week's games, an interim taking each chair", () => {
    const mid = run.events.filter((e) => (e.event.type === "STAFF_HIRED" || e.event.type === "STAFF_DEPARTED") && e.at.phase === "REGULAR_SEASON");
    for (const e of mid) expect(e.at.day).toBe(DAYS_PER_WEEK);
    const fired = mid.filter((e) => e.event.type === "STAFF_DEPARTED");
    for (const e of fired) expect((e.event as { payload: { reason: string } }).payload.reason).toBe("FIRED");
    // Every chair emptied in midseason is filled the same day.
    expect(mid.filter((e) => e.event.type === "STAFF_HIRED").length).toBeGreaterThanOrEqual(fired.length);
  });

  it("keeps people.staff equal to the coaching world's staff", () => {
    expect(run.people!.staff).toBe(after.world.staff);
  });

  it("seats the views, carries them through the carousel and drifts them each week", () => {
    expect(after.relationships).toBeDefined();
    checkViews(after.relationships!, after.world);
    // The carousel moved views off their rest points (results, hires); the summer weeks drew them back.
    const people = new Map(after.world.staff.map((s) => [String(s.id), s]));
    const gap = (v: RelationshipView) => Math.abs(v.score - restPoint(v, people));
    const moved = after.relationships!.filter((v) => gap(v) > 1e-9);
    expect(moved.length).toBeGreaterThan(0);
    const results = types(run.events).filter((t) => t === "RELATIONSHIP_CHANGED").length;
    expect(results).toBeGreaterThan(0);
  });

  it("does nothing before the playoffs end but the midseason firings", () => {
    const stop: CalendarStamp = { season: 2027, phase: "REGULAR_SEASON", week: 9, day: 7 };
    const part = runSeason({ ...base, coaching: {}, stopAfter: stop });
    const moves = staffEvents(part.events);
    if (moves.length === 0) expect(part.people!.coaching!.world).toBe(built.world);
    expect(part.people!.coaching!.world.season).toBe(2027);
    for (const e of part.events.filter((x) => x.event.type === "STAFF_HIRED" || x.event.type === "STAFF_DEPARTED")) {
      expect(e.at.phase).toBe("REGULAR_SEASON");
    }
    // Seated at their rest points, the views have nothing to drift toward, so nothing is reported.
    checkViews(part.people!.coaching!.relationships!, part.people!.coaching!.world);
    expect(types(part.events)).not.toContain("RELATIONSHIP_CHANGED");
  });

  it("carries on from a stop exactly as a straight run", () => {
    const stop: CalendarStamp = { season: 2027, phase: "REGULAR_SEASON", week: 9, day: 7 };
    const first = runSeason({ ...base, coaching: {}, stopAfter: stop });
    const saved = (first.stepEvents ?? []).map((e) => e.envelope);
    const rest = runSeason({
      ...base, coaching: {}, people: structuredClone(first.people!), resumeFrom: first.state,
      stepsDoneThrough: first.calendar, resumeEvents: saved,
    });
    expect(rest.people!.coaching).toEqual(after);
    expect(rest.events.map((e) => e.event)).toEqual(run.events.map((e) => e.event));
  });

  it("is the same with the same seed", () => {
    const again = runSeason({ ...base, coaching: {} });
    expect(again.people!.coaching).toEqual(after);
    expect(again.events).toEqual(run.events);
  });

  it("needs the coaching world", () => {
    expect(() => runSeason({ ...base, people: (({ coaching: _, ...rest }) => rest)(people), coaching: {} })).toThrow(/people.coaching/);
  });
});
