import { describe, it, expect } from "vitest";
import {
  teamId, storylineId,
  type CalendarStamp, type FranchiseEventEnvelope, type PersonalityType, type RelationshipView, type StaffId,
  type StaffState, type Team, type TeamId,
} from "@ff/contracts";
import {
  applyExtension, applyFiring, applyMove, applyStoryEffect, buildLeague, buildStaff, checkViews, driftWeek, restPoint,
  seatOf, seatRelationships, sitDownChance, syncViews, viewKey, wordFor, RELATIONSHIP_MOVES,
  type MoveRequest, type RelationshipContext, type StaffWorld,
} from "../src/index.js";

// ADR-084 L1: the relationship ledger on small hand-made staffs, and on a made-up league's.

const T = teamId("T1");
const at = (week: number): CalendarStamp => ({ season: 2026, phase: "REGULAR_SEASON", week, day: 1 });

function team(id: TeamId = T): Team {
  return {
    id, displayName: `Team ${String(id)}`, city: "City", roster: [], staff: [], depthChart: {},
    capState: { capLimit: 0, committed: 0, deadMoney: 0 }, staffBudget: { limit: 0, committed: 0 },
  };
}

let made = 0;
function coach(type: PersonalityType, role: "HEAD_COACH" | "OC" | "DC" | "STC", lineage: StaffId[] = [], tm: TeamId = T): StaffState {
  made++;
  return {
    id: `X${String(made).padStart(4, "0")}` as StaffId, displayName: `Coach ${made}`, role, age: 50, attributes: {},
    lineage, personalityType: type, teamId: tm,
    career: [{ level: "NFL", role, team: tm, employer: `Team ${String(tm)}`, firstSeason: 2026, seasons: [] }],
  };
}

function world(staff: StaffState[], teams: Team[] = [team()]): StaffWorld {
  for (const t of teams) t.staff = staff.filter((s) => s.teamId === t.id).map((s) => s.id);
  return { season: 2026, teams, staff, contracts: [] };
}

const people = (w: StaffWorld) => new Map(w.staff.map((s) => [String(s.id), s]));
const find = (views: readonly RelationshipView[], from: StaffId, of: RelationshipView["of"]) =>
  views.find((v) => viewKey(v.from, v.of) === viewKey(from, of))!;

/** Run moves in order, as one week's events. */
function run(views: RelationshipView[], w: StaffWorld, reqs: MoveRequest[], when: CalendarStamp, ctx: RelationshipContext = {},
  week: FranchiseEventEnvelope[] = []) {
  let out = views;
  for (const req of reqs) {
    const r = applyMove(out, req, w, when, ctx, { firstSeq: week.length, thisWeek: week });
    out = r.views;
    week.push(...r.events);
  }
  return { views: out, events: week };
}

const TYPES: PersonalityType[] = ["demanding", "playersCoach", "cerebral", "fiery", "quiet"];
/** ADR-084 §4: row = the man who feels, column = the man he judges. */
const REST_TABLE = [
  [16, -8, 4, 4, -4],
  [-16, 16, -4, -4, 8],
  [8, 0, 16, -12, 8],
  [4, 4, -12, 16, -8],
  [-12, 12, 8, -12, 12],
];

describe("views and words (ADR-084 §3)", () => {
  it("names a score by the five bands, edges included", () => {
    const cases: [number, string][] = [
      [100, "close"], [50, "close"], [49.99, "good"], [20, "good"], [19.99, "professional"], [0, "professional"],
      [-19, "professional"], [-19.99, "professional"], [-20, "strained"], [-49.99, "strained"], [-50, "broken"], [-100, "broken"],
    ];
    for (const [score, word] of cases) expect(wordFor(score), String(score)).toBe(word);
  });

  it("seats every view on every staff at its rest point, one per direction", () => {
    const league = buildLeague("rel-seat");
    const { world: w } = buildStaff(league, { firstSeason: 2026, historySeasons: 3 });
    const views = seatRelationships(w);
    expect(views).toHaveLength(32 * 12);
    checkViews(views, w);
    const p = people(w);
    for (const v of views) expect(v.score).toBe(restPoint(v, p));
    expect(views.some((v) => v.rift !== undefined)).toBe(false);
  });

  it("on the user's team, the user stands in the head coach's place and holds no views", () => {
    const league = buildLeague("rel-seat");
    const { world: w } = buildStaff(league, { firstSeason: 2026, historySeasons: 3 });
    const user = w.teams[0]!.id;
    const ctx = { userTeam: user };
    const views = seatRelationships(w, ctx);
    expect(views).toHaveLength(31 * 12 + 6 + 3);
    checkViews(views, w, ctx);
    const hc = w.staff.find((s) => s.teamId === user && seatOf(s) === "HEAD_COACH")!;
    expect(views.some((v) => v.from === hc.id || ("staff" in v.of && v.of.staff === hc.id))).toBe(false);
    const ofUser = views.filter((v) => "user" in v.of);
    expect(ofUser).toHaveLength(3);
    for (const v of ofUser) {
      expect(w.staff.find((s) => s.id === v.from)!.teamId).toBe(user);
      expect(v.score).toBe(0); // the user's own type waits for ADR-083
    }
    expect(() => checkViews(seatRelationships(w), w, ctx)).toThrow();
  });

  it("refuses views that are missing, doubled, stray or out of range", () => {
    const hc = coach("demanding", "HEAD_COACH"), oc = coach("quiet", "OC");
    const other = coach("fiery", "DC", [], teamId("T2"));
    const w = world([hc, oc, other], [team(), team(teamId("T2"))]);
    const views = seatRelationships(w);
    expect(views).toHaveLength(2);
    expect(() => checkViews(views.slice(1), w)).toThrow(/missing/);
    expect(() => checkViews([...views, views[0]!], w)).toThrow(/twice/);
    expect(() => checkViews([...views, { from: oc.id, of: { staff: other.id }, score: 0 }], w)).toThrow(/not a view/);
    expect(() => checkViews([{ ...views[0]!, score: 101 }, views[1]!], w)).toThrow(/score/);
  });

  it("keeps step with the staffs: a man who leaves takes his views with him, a newcomer starts at rest", () => {
    const hc = coach("demanding", "HEAD_COACH"), oc = coach("cerebral", "OC"), dc = coach("fiery", "DC");
    const w = world([hc, oc, dc]);
    let views = seatRelationships(w).map((v) => ({ ...v, score: v.score + 7 }));
    // The DC leaves; a special teams coach arrives.
    dc.career[0]!.lastSeason = 2026;
    dc.career[0]!.ended = "FIRED";
    delete dc.teamId;
    const stc = coach("quiet", "STC");
    w.staff.push(stc);
    views = syncViews(views, w);
    checkViews(views, w);
    expect(views.some((v) => v.from === dc.id || ("staff" in v.of && v.of.staff === dc.id))).toBe(false);
    const p = people(w);
    for (const v of views) {
      const fresh = v.from === stc.id || ("staff" in v.of && v.of.staff === stc.id);
      expect(v.score).toBe(restPoint(v, p) + (fresh ? 0 : 7));
    }
  });
});

describe("rest points and drift (ADR-084 §4)", () => {
  it("rests on ADR-080's fit read one way: §4's table", () => {
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const a = coach(TYPES[i]!, "OC"), b = coach(TYPES[j]!, "DC");
        expect(restPoint({ from: a.id, of: { staff: b.id } }, people(world([a, b]))), `${TYPES[i]} of ${TYPES[j]}`).toBe(REST_TABLE[i]![j]);
      }
    }
  });

  it("adds 8 for the same coaching tree, takes 30 off under a rift, and rests a view of the user on his main trait", () => {
    const hc = coach("demanding", "HEAD_COACH");
    const oc = coach("demanding", "OC", [hc.id]);
    const mentor = "X9999" as StaffId;
    const dc = coach("cerebral", "DC", [mentor]), stc = coach("cerebral", "STC", [mentor]);
    const p = people(world([hc, oc, dc, stc]));
    expect(restPoint({ from: oc.id, of: { staff: hc.id } }, p)).toBe(16 + 8); // worked under him
    expect(restPoint({ from: hc.id, of: { staff: oc.id } }, p)).toBe(16 + 8);
    expect(restPoint({ from: dc.id, of: { staff: stc.id } }, p)).toBe(16 + 8); // same mentor
    expect(restPoint({ from: dc.id, of: { staff: hc.id } }, p)).toBe(8);
    expect(restPoint({ from: dc.id, of: { staff: hc.id }, rift: { since: at(1), cause: "PLAY_CALLS_TAKEN" } }, p)).toBe(8 - 30);
    const ofUser = { from: dc.id, of: { user: T } };
    expect(restPoint(ofUser, p)).toBe(0);
    expect(restPoint(ofUser, p, { userType: "fiery" })).toBe(-12); // a cerebral man on a fiery boss
  });

  it("halves a gap in 34 to 35 weeks, takes 65% of it in a year, and reports only a change of word", () => {
    const a = coach("cerebral", "OC"), b = coach("cerebral", "DC");
    const w = world([a, b]);
    let views: RelationshipView[] = [{ from: a.id, of: { staff: b.id }, score: 16 + 40 }];
    const events: FranchiseEventEnvelope[] = [];
    const gaps: number[] = [];
    for (let k = 1; k <= 52; k++) {
      const r = driftWeek(views, w, at(k), {}, events.length);
      views = r.views;
      events.push(...r.events);
      gaps.push(views[0]!.score - 16);
    }
    expect(gaps[33]).toBeGreaterThan(20);
    expect(gaps[34]).toBeLessThan(20);
    expect(gaps[51]! / 40).toBeCloseTo(0.35, 2);
    expect(events).toHaveLength(1);
    expect(events[0]!.event).toMatchObject({ type: "RELATIONSHIP_CHANGED", payload: { cause: "DRIFT", before: "close", after: "good" } });
    expect(events[0]!.at).toEqual(at(9));
  });
});

describe("moves and rifts (ADR-084 §5-§6)", () => {
  const dc = coach("playersCoach", "DC"), hc = coach("demanding", "HEAD_COACH");
  const w = world([hc, dc]);
  const ctx: RelationshipContext = { userType: "demanding" };
  const you = { user: T };

  it("opens a rift when a move that can open one leaves the view strained: -25 at once, rest 30 lower", () => {
    const start: RelationshipView[] = [{ from: dc.id, of: you, score: -16 }];
    const taken = applyMove(start, { move: "PLAY_CALLS_TAKEN", from: dc.id, of: you }, w, at(1), ctx);
    const v = taken.views[0]!;
    expect(v.score).toBe(-16 - 15 - 25);
    expect(v.rift).toEqual({ since: at(1), cause: "PLAY_CALLS_TAKEN" });
    expect(restPoint(v, people(w), ctx)).toBe(-16 - 30);
    expect(taken.events.map((e) => e.event)).toEqual([{
      type: "RELATIONSHIP_CHANGED",
      payload: { from: dc.id, of: you, delta: -40, cause: "PLAY_CALLS_TAKEN", before: "professional", after: "broken", rift: "OPENED" },
    }]);
    // A second one moves the view but opens nothing more.
    const again = applyMove(taken.views, { move: "BLAMED_IN_PUBLIC", from: dc.id, of: you }, w, at(2), ctx);
    expect(again.views[0]!.score).toBe(-56 - 12);
    expect(again.views[0]!.rift!.cause).toBe("PLAY_CALLS_TAKEN");
    expect(again.events[0]!.event).not.toHaveProperty("payload.rift");
    // Everyday choices and time repair nothing; a repair move does, without giving the 25 back.
    let views = applyMove(again.views, { move: "SIGNED_HIS_PLAYER", from: dc.id, of: you }, w, at(3), ctx).views;
    for (let k = 0; k < 52; k++) views = driftWeek(views, w, at(4), ctx).views;
    expect(views[0]!.rift).toBeDefined();
    expect(views[0]!.score).toBeGreaterThan(-68 + 2);
    expect(views[0]!.score).toBeLessThan(-46);
    const before = views[0]!.score;
    const kept = applyMove(views, { move: "PROMISE_KEPT", from: dc.id, of: you }, w, at(5), ctx);
    expect(kept.views[0]!.rift).toBeUndefined();
    expect(kept.views[0]!.score).toBe(before + 8);
    expect(kept.events[0]!.event).toMatchObject({ payload: { cause: "PROMISE_KEPT", rift: "REPAIRED" } });
  });

  it("opens nothing when the view stays above strained", () => {
    const r = applyMove([{ from: dc.id, of: you, score: 10 }], { move: "PLAY_CALLS_TAKEN", from: dc.id, of: you }, w, at(1), ctx);
    expect(r.views[0]).toEqual({ from: dc.id, of: you, score: -5 });
  });

  it("caps everyday moves on a view of the user at 3 a week, either way; big moments and staff views are not capped", () => {
    const oc = coach("quiet", "OC");
    const w2 = world([hc, dc, oc]);
    const start: RelationshipView[] = [{ from: dc.id, of: you, score: 0 }, { from: dc.id, of: { staff: oc.id }, score: 0 }];
    const thrown: MoveRequest = { move: "PLAN_THROWN_OUT", from: dc.id, of: you };
    const week1 = run(start, w2, [thrown, thrown, thrown], at(1));
    expect(week1.events.map((e) => e.event.type === "RELATIONSHIP_CHANGED" && e.event.payload.delta)).toEqual([-2, -1]);
    expect(find(week1.views, dc.id, you).score).toBe(-3);
    const grant = run(week1.views, w2, [{ move: "PRACTICE_GRANTED", from: dc.id, of: you }], at(1), {}, week1.events);
    expect(find(grant.views, dc.id, you).score).toBe(-2);
    const week2 = run(grant.views, w2, [thrown], at(2));
    expect(find(week2.views, dc.id, you).score).toBe(-4);
    const big = run(week2.views, w2, [thrown, thrown, { move: "LOWBALLED", from: dc.id, of: you }], at(2), {}, week2.events);
    expect(find(big.views, dc.id, you).score).toBe(-4 - 1 - 5); // -1 under the cap, then the lowball in full
    const polite: MoveRequest = { move: "POLITE_DISAGREEMENT", from: dc.id, of: { staff: oc.id } };
    expect(find(run(start, w2, [polite, polite, polite], at(1)).views, dc.id, { staff: oc.id }).score).toBe(-6);
  });

  it("sizes \"how sure are you?\" by where the view rests, doubles a clash settled in the open, and checks a meeting answer's size", () => {
    const sure: MoveRequest = { move: "ASKED_HOW_SURE", from: dc.id, of: you };
    const one = (c: RelationshipContext, req: MoveRequest = sure) => applyMove([{ from: dc.id, of: you, score: 0 }], req, w, at(1), c).views[0]!.score;
    expect(one({})).toBe(-2); // rests at 0
    expect(one({ userType: "demanding" })).toBe(-3); // a players' coach on a demanding boss rests at -16
    expect(one({ userType: "playersCoach" })).toBe(-1); // ... on a players' coach at +16
    expect(one({}, { move: "BACKED_IN_CLASH", from: dc.id, of: you, inTheOpen: true })).toBe(10);
    expect(one({}, { move: "BACKED_IN_CLASH", from: dc.id, of: you })).toBe(5);
    expect(one({}, { move: "MEETING_ANSWER", from: dc.id, of: you, size: 2 })).toBe(2);
    expect(() => one({}, { move: "MEETING_ANSWER", from: dc.id, of: you })).toThrow(/size/);
    expect(() => one({}, { move: "MEETING_ANSWER", from: dc.id, of: you, size: 4 })).toThrow(/size/);
    expect(() => one({}, { move: "LOWBALLED", from: dc.id, of: you, size: 1 })).toThrow(/fixed/);
    expect(() => applyMove([], sure, w, at(1))).toThrow(/no view/);
  });

  it("gives the sit-down its odds: 50% plus half the mean view of the user, kept to 10%-90%", () => {
    expect(sitDownChance(40)).toBeCloseTo(0.7, 10);
    expect(sitDownChance(-30)).toBeCloseTo(0.35, 10);
    expect(sitDownChance(100)).toBe(0.9);
    expect(sitDownChance(-100)).toBe(0.1);
  });

  it("lets a storyline's ending (V3) move a view up to 25 and open or repair a rift", () => {
    const start: RelationshipView[] = [{ from: dc.id, of: { staff: hc.id }, score: -40, rift: { since: at(1), cause: "OPEN_ARGUMENT" } }];
    const healed = applyStoryEffect(start, {
      kind: "RELATIONSHIP_DELTA", from: dc.id, of: { staff: hc.id }, delta: 20, rift: "REPAIR", reason: storylineId("old-hand-1"),
    }, at(9));
    expect(healed.views[0]).toEqual({ from: dc.id, of: { staff: hc.id }, score: -20 });
    expect(healed.events[0]!.event).toMatchObject({ payload: { cause: "STORYLINE:old-hand-1", rift: "REPAIRED", delta: 20 } });
    const feud = applyStoryEffect(healed.views, {
      kind: "RELATIONSHIP_DELTA", from: dc.id, of: { staff: hc.id }, delta: 0, rift: "OPEN", reason: storylineId("bad-blood-1"),
    }, at(10));
    expect(feud.views[0]!.score).toBe(-45);
    expect(feud.views[0]!.rift).toEqual({ since: at(10), cause: "STORYLINE:bad-blood-1" });
    expect(() => applyStoryEffect(start, {
      kind: "RELATIONSHIP_DELTA", from: dc.id, of: { staff: hc.id }, delta: 26, reason: storylineId("x"),
    }, at(9))).toThrow(/at most 25/);
  });

  it("keeps the table's sizes as §5 writes them", () => {
    const m = RELATIONSHIP_MOVES;
    expect([m.HIRED.delta, m.PROMOTED.delta, m.EXTENDED.delta, m.PROMISE_KEPT.delta, m.DEFENDED_IN_PUBLIC.delta, m.KEPT_OVER_PRESIDENT.delta])
      .toEqual([10, 12, 10, 8, 12, 15]);
    expect([m.LOWBALLED.delta, m.PLAY_CALLS_TAKEN.delta, m.BLAMED_IN_PUBLIC.delta, m.PROMISE_BROKEN.delta, m.FRIEND_FIRED.delta, m.CLOSE_FRIEND_FIRED.delta])
      .toEqual([-5, -15, -12, -15, -8, -12]);
    expect([m.WINNING_SEASON.delta, m.LOSING_SEASON.delta, m.PLAYOFF_WIN.delta]).toEqual([5, -5, 5]);
    const opens = Object.entries(m).filter(([, s]) => "rift" in s && s.rift === "CAN_OPEN").map(([k]) => k).sort();
    expect(opens).toEqual(["BLAMED_IN_PUBLIC", "CLOSE_FRIEND_FIRED", "FRIEND_FIRED", "NOT_BACKED_IN_CLASH", "PLAY_CALLS_TAKEN", "PROMISE_BROKEN"]);
    const repairs = Object.entries(m).filter(([, s]) => "rift" in s && s.rift === "REPAIRS").map(([k]) => k).sort();
    expect(repairs).toEqual(["DEFENDED_IN_PUBLIC", "EXTENDED", "KEPT_OVER_PRESIDENT", "PROMISE_KEPT", "PROMOTED", "SIT_DOWN_WORKED"]);
    expect(Object.values(m).filter((s) => s.kind === "EVERYDAY").every((s) => Math.abs(s.delta) <= 3)).toBe(true);
  });
});

describe("the carousel's own moves on a hand-made staff (ADR-084 §5.2)", () => {
  const hc = coach("demanding", "HEAD_COACH"), oc = coach("cerebral", "OC"), dc = coach("fiery", "DC"), stc = coach("demanding", "STC");
  const w = world([hc, oc, dc, stc]);
  const base = seatRelationships(w);
  const set = (views: RelationshipView[], from: StaffId, of: StaffId, score: number) =>
    views.map((v) => (viewKey(v.from, v.of) === viewKey(from, { staff: of }) ? { ...v, score } : v));

  it("a firing costs the boss 8 with each man good with the fired one, 12 with each man close to him", () => {
    let views = set(base, oc.id, dc.id, 60);
    views = set(views, stc.id, dc.id, 25);
    views = set(views, hc.id, dc.id, 70); // the boss's own view does not count
    const r = applyFiring(views, w, T, "DC", dc.id, at(1));
    expect(find(r.views, oc.id, { staff: hc.id }).score).toBe(find(views, oc.id, { staff: hc.id }).score - 12);
    expect(find(r.views, stc.id, { staff: hc.id }).score).toBe(find(views, stc.id, { staff: hc.id }).score - 8);
    expect(r.events.map((e) => e.event.type === "RELATIONSHIP_CHANGED" && e.event.payload.cause)).toEqual(["CLOSE_FRIEND_FIRED", "FRIEND_FIRED"]);
    // On the user's team the user is the boss.
    const ctx = { userTeam: T };
    const mine = set(set(seatRelationships(w, ctx), oc.id, dc.id, 60), stc.id, dc.id, 25);
    const r2 = applyFiring(mine, w, T, "DC", dc.id, at(1), ctx);
    expect(find(r2.views, oc.id, { user: T }).score).toBe(-12);
    expect(find(r2.views, stc.id, { user: T }).score).toBe(-8);
  });

  it("a president firing a head coach moves nothing: his views are not kept yet", () => {
    const views = base.map((v) => ({ ...v, score: 60 }));
    expect(applyFiring(views, w, T, "HEAD_COACH", hc.id, at(1)).events).toEqual([]);
  });

  it("an extension lifts the man's view of his boss 10 and repairs his grudge against him", () => {
    const views = base.map((v) => (viewKey(v.from, v.of) === viewKey(dc.id, { staff: hc.id })
      ? { ...v, score: -40, rift: { since: at(1), cause: "CLOSE_FRIEND_FIRED" } } : v));
    const r = applyExtension(views, w, T, "DC", dc.id, at(2));
    expect(find(r.views, dc.id, { staff: hc.id })).toEqual({ from: dc.id, of: { staff: hc.id }, score: -30 });
    expect(applyExtension(views, w, T, "HEAD_COACH", hc.id, at(2)).events).toEqual([]);
  });
});

describe("the worked example of ADR-084 §9", () => {
  // A players'-coach DC and a demanding GM (the GM seat is ADR-081's; the ledger reads only types).
  const dc = coach("playersCoach", "DC"), gm = coach("demanding", "OC");
  const w = world([dc, gm]);
  const you = { user: T };
  const start: RelationshipView[] = [
    { from: dc.id, of: { staff: gm.id }, score: -16 },
    { from: gm.id, of: { staff: dc.id }, score: -8 },
    { from: dc.id, of: you, score: 24 },
    { from: gm.id, of: you, score: 12 },
  ];
  const score = (views: RelationshipView[], from: StaffId, of: RelationshipView["of"]) => find(views, from, of).score;

  it("comes out as written, the weekly cap included", () => {
    const meeting = run(start, w, [
      { move: "OPEN_ARGUMENT", from: dc.id, of: { staff: gm.id } },
      { move: "OPEN_ARGUMENT", from: gm.id, of: { staff: dc.id } },
    ], at(1));
    expect(score(meeting.views, dc.id, { staff: gm.id })).toBe(-26);
    expect(score(meeting.views, gm.id, { staff: dc.id })).toBe(-18);
    const sided = run(meeting.views, w, [
      { move: "BACKED_IN_CLASH", from: gm.id, of: you, inTheOpen: true },
      { move: "NOT_BACKED_IN_CLASH", from: dc.id, of: you, inTheOpen: true },
      { move: "LOST_CLASH_TO", from: dc.id, of: { staff: gm.id }, inTheOpen: true },
    ], at(1), {}, meeting.events);
    expect(score(sided.views, gm.id, you)).toBe(22);
    expect(score(sided.views, dc.id, you)).toBe(8);
    expect(score(sided.views, dc.id, { staff: gm.id })).toBe(-31);
    // Two "how sure?"s in the meeting week: -2, then only -1 under the 3-a-week cap.
    const asked = run(sided.views, w, [
      { move: "ASKED_HOW_SURE", from: dc.id, of: you }, { move: "ASKED_HOW_SURE", from: dc.id, of: you },
    ], at(1), {}, sided.events);
    expect(score(asked.views, dc.id, you)).toBe(5);
    expect(asked.views.map((v) => wordFor(v.score))).toEqual(["strained", "professional", "professional", "good"]);
    expect(asked.views.some((v) => v.rift)).toBe(false);

    // Six weeks later: the GM's corner signed over the DC's objection.
    let later = asked.views;
    for (let k = 2; k <= 7; k++) later = driftWeek(later, w, at(k)).views;
    later = run(later, w, [
      { move: "WENT_AGAINST_HIS_ROSTER_CALL", from: dc.id, of: you }, { move: "SIGNED_HIS_PLAYER", from: gm.id, of: you },
    ], at(7)).views;
    expect(Math.round(score(later, dc.id, you))).toBe(2);
    expect(Math.round(score(later, gm.id, you))).toBe(21);
    expect(Math.round(score(later, dc.id, { staff: gm.id }))).toBe(-29);

    // A year after the meeting, results aside.
    for (let k = 8; k <= 53; k++) later = driftWeek(later, w, at(k)).views;
    expect(score(later, gm.id, { staff: dc.id })).toBeCloseTo(-11.5, 2);
    expect(score(later, dc.id, { staff: gm.id })).toBeCloseTo(-21.25, 2);
    expect(wordFor(score(later, dc.id, { staff: gm.id }))).toBe("strained");
  });

  it("had the clash boiled over, the DC would hold a rift: -56, resting at -46", () => {
    const boiled = run(start, w, [
      { move: "OPEN_ARGUMENT", from: dc.id, of: { staff: gm.id }, openRift: true },
      { move: "LOST_CLASH_TO", from: dc.id, of: { staff: gm.id } },
    ], at(1));
    const v = find(boiled.views, dc.id, { staff: gm.id });
    expect(v.score).toBe(-56);
    expect(restPoint(v, people(w))).toBe(-46);
    expect(v.rift).toEqual({ since: at(1), cause: "OPEN_ARGUMENT" });
  });
});
