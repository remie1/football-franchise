import { describe, it, expect } from "vitest";
import {
  CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES,
  type CalendarStamp, type FranchiseEventEnvelope, type RelationshipView, type TeamId,
} from "@ff/contracts";
import {
  buildLeague, buildStaff, checkViews, driftWeek, phaseWeeks, restPoint, runStaffOffseason, seatOf, seatRelationships,
  standInSeason, viewKey, winShare,
  type RelationshipContext, type StaffWorld,
} from "../src/index.js";

// ADR-084 L2: the coaching carousel carries the views along (results, firings, hires, extensions).

const league = buildLeague("rel-2");
const built = buildStaff(league, { firstSeason: 2026, historySeasons: 8 });
const played = standInSeason(league, built.world, built.standIn, "rel-2");
const views = seatRelationships(built.world);
const plain = runStaffOffseason({ world: built.world, results: played.summaries, seed: "rel-2" });
// Carried, not read (ADR-084 L2a); the readers (L2b) are checked in relationships.stayOrGo.test.ts.
const kept = runStaffOffseason({ world: built.world, results: played.summaries, seed: "rel-2", relationships: { views, read: false } });

const changes = (events: readonly FranchiseEventEnvelope[]) =>
  events.flatMap((e) => (e.event.type === "RELATIONSHIP_CHANGED" ? [{ at: e.at, ...e.event.payload }] : []));
const people = (w: StaffWorld) => new Map(w.staff.map((s) => [String(s.id), s]));
const headCoachOf = (w: StaffWorld, team: TeamId) => w.staff.find((s) => s.teamId === team && seatOf(s) === "HEAD_COACH")!;

/** The year's calendar weeks, camp to the end of summer (52). */
function weeksOf(season: number, from: number, to: number): CalendarStamp[] {
  const out: CalendarStamp[] = [];
  for (const phase of CALENDAR_PHASE_ORDER.slice(from, to)) {
    for (let week = 1; week <= phaseWeeks(phase, DEFAULT_LEAGUE_RULES); week++) out.push({ season, phase, week, day: 1 });
  }
  return out;
}
const OFF = CALENDAR_PHASE_ORDER.indexOf("OFF_EVAL");

/** Seasons of stand-in results with the views carried week by week: drift, then the carousel. */
function years(n: number, seed: string, ctx: RelationshipContext = {}) {
  let world = built.world, standIn = built.standIn;
  let v = seatRelationships(world, ctx);
  const events: FranchiseEventEnvelope[] = [];
  const drift = (stamps: CalendarStamp[]) => {
    for (const at of stamps) {
      const r = driftWeek(v, world, at, ctx, events.length);
      v = r.views;
      events.push(...r.events);
    }
  };
  for (let y = 0; y < n; y++) {
    drift(weeksOf(world.season, 0, OFF));
    const season = standInSeason(league, world, standIn, seed);
    standIn = season.state;
    const off = runStaffOffseason({ world, results: season.summaries, seed, relationships: { views: v, context: ctx } });
    for (const e of off.events) events.push({ ...e, seq: events.length });
    world = off.world;
    v = off.relationships!;
    drift(weeksOf(world.season - 1, OFF, CALENDAR_PHASE_ORDER.length));
  }
  return { world, views: v, events };
}

describe("the carousel with views (ADR-084 L2)", () => {
  it("carried without reading, decides exactly as without them; it only adds the views' moves to the events", () => {
    expect(kept.world).toEqual(plain.world);
    expect(kept.decisions).toEqual(plain.decisions);
    expect(kept.moves).toEqual(plain.moves);
    const own = kept.events.filter((e) => e.event.type !== "RELATIONSHIP_CHANGED").map((e) => ({ at: e.at, event: e.event }));
    expect(own).toEqual(plain.events.map((e) => ({ at: e.at, event: e.event })));
    kept.events.forEach((e, i) => expect(e.seq).toBe(i));
    expect(plain.relationships).toBeUndefined();
    expect(changes(kept.events).length).toBeGreaterThan(0);
  });

  it("leaves one view per direction between the men on each new staff", () => {
    checkViews(kept.relationships!, kept.world);
  });

  it("moves every view with its team's season: +5 winning, -5 losing, +5 more for a playoff win", () => {
    const results = new Map(played.summaries.map((r) => [String(r.team), r]));
    const teamOf = new Map(built.world.staff.map((s) => [String(s.id), s.teamId]));
    const seen = new Map<string, string[]>();
    for (const c of changes(kept.events)) {
      if (c.cause !== "WINNING_SEASON" && c.cause !== "LOSING_SEASON" && c.cause !== "PLAYOFF_WIN") continue;
      const key = viewKey(c.from, c.of);
      seen.set(key, [...(seen.get(key) ?? []), `${c.cause} ${c.delta}`]);
    }
    for (const v of views) {
      const r = results.get(String(teamOf.get(String(v.from))))!;
      const want: string[] = [];
      if (winShare(r.record) > 0.5) want.push("WINNING_SEASON 5");
      if (winShare(r.record) < 0.5) want.push("LOSING_SEASON -5");
      if ((r.playoffs?.wins ?? 0) > 0) want.push("PLAYOFF_WIN 5");
      expect(seen.get(viewKey(v.from, v.of)) ?? []).toEqual(want);
    }
  });

  it("starts a new coordinator's view of the head coach who hired him 10 above its rest point, his others at rest", () => {
    const hires = kept.moves.filter((m) => m.kind === "HIRED" && m.seat !== "HEAD_COACH");
    expect(hires.length).toBeGreaterThan(0);
    expect(changes(kept.events).filter((c) => c.cause === "HIRED")).toHaveLength(hires.length);
    const p = people(kept.world);
    const after = kept.relationships!;
    for (const m of hires) {
      const hc = headCoachOf(kept.world, m.team);
      for (const v of after.filter((x) => x.from === m.staff)) {
        const toBoss = "staff" in v.of && v.of.staff === hc.id;
        expect(v.score, viewKey(v.from, v.of)).toBeCloseTo(restPoint(v, p) + (toBoss ? 10 : 0), 10);
      }
    }
  });

  it("an extension pleases the coordinator (+10 on his head coach); a head coach's, from the president, moves nothing", () => {
    const coordinators = kept.decisions.filter((d) => d.type === "EXTEND_STAFF" && d.payload.seat !== "HEAD_COACH");
    expect(coordinators.length).toBeGreaterThan(0);
    const extended = changes(kept.events).filter((c) => c.cause === "EXTENDED");
    expect(extended.map((c) => c.from)).toEqual(coordinators.map((d) => d.payload.staff));
    for (const c of extended) expect(c.delta).toBe(10);
  });

  it("a firing stings the fired man's friends: with every view close, each sting costs a head coach 12", () => {
    const close = views.map((v) => ({ ...v, score: 70 }));
    const r = runStaffOffseason({ world: built.world, results: played.summaries, seed: "rel-2", relationships: { views: close } });
    const stung = changes(r.events).filter((c) => c.cause === "CLOSE_FRIEND_FIRED");
    expect(stung.length).toBeGreaterThan(0);
    for (const c of stung) {
      // A new head coach's views start at rest, so a sting there can open a rift (-25 more).
      expect(c.delta).toBe(c.rift === "OPENED" ? -12 - 25 : -12);
      const boss = r.world.staff.find((s) => "staff" in c.of && s.id === c.of.staff)!;
      expect(seatOf(boss)).toBe("HEAD_COACH");
    }
    // No view of a fired man was merely good, and a president's firing of a head coach stings nobody.
    expect(changes(r.events).some((c) => c.cause === "FRIEND_FIRED")).toBe(false);
    checkViews(r.relationships!, r.world);
  });

  it("on the user's team, the moves land on views of the user", () => {
    const user = built.world.teams.find((t) => kept.moves.some((m) => m.team === t.id && m.kind === "HIRED" && m.seat !== "HEAD_COACH"))!.id;
    const ctx = { userTeam: user };
    const r = runStaffOffseason({
      world: built.world, results: played.summaries, seed: "rel-2", relationships: { views: seatRelationships(built.world, ctx), context: ctx, read: false },
    });
    checkViews(r.relationships!, r.world, ctx);
    const hired = changes(r.events).filter((c) => c.cause === "HIRED" && "user" in c.of);
    expect(hired.length).toBe(kept.moves.filter((m) => m.team === user && m.kind === "HIRED" && m.seat !== "HEAD_COACH").length);
    for (const c of hired) expect(c.delta).toBe(10);
    expect(r.world).toEqual(plain.world);
  });
});

describe("views over several seasons (ADR-084 L1-L2)", () => {
  const a = years(4, "rel-3");

  it("is deterministic: the same seed gives the same views and events, another seed others", () => {
    const again = years(4, "rel-3");
    expect(again.views).toEqual(a.views);
    expect(again.events).toEqual(a.events);
    expect(years(4, "rel-4").views).not.toEqual(a.views);
  });

  it("keeps every score in range, the views in step with the staffs, and opens rifts only through moves that can", () => {
    checkViews(a.views, a.world);
    const opened = new Set(changes(a.events).filter((c) => c.rift === "OPENED").map((c) => c.cause));
    for (const cause of opened) expect(["FRIEND_FIRED", "CLOSE_FRIEND_FIRED"]).toContain(cause);
    const repaired = new Set(changes(a.events).filter((c) => c.rift === "REPAIRED").map((c) => c.cause));
    for (const cause of repaired) expect(["EXTENDED", "PLAYOFF_WIN"]).toContain(cause);
    for (const v of a.views) if (v.rift) expect(["FRIEND_FIRED", "CLOSE_FRIEND_FIRED"]).toContain(v.rift.cause);
  });

  it("reports drift only as a change of word", () => {
    const drifts = changes(a.events).filter((c) => c.cause === "DRIFT");
    expect(drifts.length).toBeGreaterThan(0);
    for (const c of drifts) expect(c.before).not.toBe(c.after);
  });

  it("runs on the user's team too", () => {
    const ctx = { userTeam: built.world.teams[3]!.id };
    const u = years(2, "rel-3", ctx);
    checkViews(u.views, u.world, ctx);
    expect(u.views.filter((v: RelationshipView) => "user" in v.of)).toHaveLength(3);
  });
});
