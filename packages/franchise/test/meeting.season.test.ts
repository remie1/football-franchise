/**
 * ADR-081 M3 and M4: the coordinators, clashes, and the meeting in the season's walk.
 */
import { describe, expect, it } from "vitest";
import { compareStamps, createRng, type CalendarStamp, type FranchiseEventEnvelope, type MeetingTake, type StaffId, type StaffState } from "@ff/contracts";
import {
  buildStaff, findClashes, makeGm, runSeason, seasonOverAt, stepsApart, TEMPER,
  GROUP_OF, UNIT_OF, type GameResolver, type LeaguePeople,
} from "../src/index.js";
import { league, startingPeople } from "./playersWorld.js";

const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "meeting-game");
  const homeScore = rng.int(0, 6) * 7 + rng.int(0, 3), awayScore = rng.int(0, 6) * 7 + rng.int(0, 3);
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};
const base = startingPeople();
const built = buildStaff(league, { firstSeason: 2027, historySeasons: 4, lineups: true });
const people: LeaguePeople = { ...base, staff: built.world.staff, coaching: { world: built.world } };
const input = { league, season: 2027, seed: "meet", resolve: fake, people, through: "YEAR" as const, coaching: {}, meeting: {} };
const run = runSeason(input);
const held = run.events.filter((e) => e.event.type === "STAFF_MEETING_HELD");
const meetingOf = (e: FranchiseEventEnvelope) => (e.event as Extract<FranchiseEventEnvelope["event"], { type: "STAFF_MEETING_HELD" }>).payload.meeting;

describe("the meeting in the season's walk (M4)", () => {
  it("seats a GM on every team, once", () => {
    const gms = run.people!.coaching!.world.staff.filter((s) => s.role === "GM");
    expect(gms).toHaveLength(32);
    expect(new Set(gms.map((g) => String(g.teamId))).size).toBe(32);
    for (const t of run.people!.coaching!.world.teams) expect(gms.some((g) => t.staff.includes(g.id))).toBe(true);
  });

  it("holds one meeting a team, the day after its last game", () => {
    expect(held).toHaveLength(32);
    for (const e of held) {
      const m = meetingOf(e);
      const over = seasonOverAt(run.state, m.team)!;
      expect(compareStamps(e.at, over)).toBeGreaterThan(0);
      expect(m.season).toBe(2027);
    }
    // The 18 teams out of the playoffs all meet on the same day, before any playoff team.
    const days = held.map((e) => `${e.at.phase}/${e.at.week}/${e.at.day}`);
    expect(new Set(days.slice(0, 18)).size).toBe(1);
  });

  it("meets before the carousel and sets each team's direction", () => {
    const firstHire = run.events.findIndex((e) => e.event.type === "STAFF_HIRED" || e.event.type === "STAFF_DEPARTED");
    const lastMeeting = run.events.indexOf(held[held.length - 1]!);
    expect(firstHire).toBeGreaterThan(lastMeeting);
    const set = run.events.filter((e) => e.event.type === "TEAM_DIRECTION_SET");
    expect(set).toHaveLength(32);
    for (const t of run.people!.teams) expect(["CONTEND", "RETOOL", "REBUILD"]).toContain(t.direction);
    expect(run.people!.meetings).toHaveLength(32);
  });

  it("gives the GM nine takes and each coordinator his own side only", () => {
    for (const e of held) {
      const m = meetingOf(e);
      const staff = new Map(run.people!.coaching!.world.staff.map((s) => [String(s.id), s] as const));
      const gmTakes = m.takes.filter((t) => staff.get(String(t.speaker))?.role === "GM");
      expect(gmTakes).toHaveLength(9);
      for (const t of m.takes) {
        if (staff.get(String(t.speaker))?.role === "GM") continue;
        expect(["MONEY_CLIFF", "WINDOW"]).not.toContain(t.claim.point);
      }
    }
  });

  it("leaves the games alone", () => {
    const plain = runSeason({ ...input, meeting: undefined } as never);
    expect(plain.state.results).toEqual(run.state.results);
  });

  it("is the same with the same seed, and carries on from a stop exactly", () => {
    expect(runSeason(input).events).toEqual(run.events);
    const stop: CalendarStamp = { season: 2027, phase: "REGULAR_SEASON", week: 9, day: 7 };
    const first = runSeason({ ...input, stopAfter: stop });
    const rest = runSeason({
      ...input, people: structuredClone(first.people!), resumeFrom: first.state,
      stepsDoneThrough: first.calendar, resumeEvents: (first.stepEvents ?? []).map((e) => e.envelope),
    });
    expect(rest.events.map((e) => e.event)).toEqual(run.events.map((e) => e.event));
  });

  it("needs the coaching world", () => {
    expect(() => runSeason({ ...input, coaching: undefined, people: base } as never)).toThrow(/people.coaching/);
  });
});

describe("the coordinators (M3)", () => {
  const m = meetingOf(held[0]!);
  const staff = new Map(run.people!.coaching!.world.staff.map((s) => [String(s.id), s] as const));
  const players = new Map(run.people!.players.map((p) => [String(p.bio.id), p]));

  it("name only their own side's groups and players", () => {
    for (const t of m.takes) {
      const s = staff.get(String(t.speaker))!;
      if (s.role === "GM") continue;
      const side = s.role === "OC" ? "OFFENSE" : "DEFENSE";
      for (const g of t.claim.groups ?? []) expect(UNIT_OF[g as keyof typeof UNIT_OF]).toBe(side);
      for (const p of t.claim.players ?? []) expect(UNIT_OF[GROUP_OF[players.get(String(p))!.bio.position]]).toBe(side);
    }
  });
});

describe("clashes (F4)", () => {
  const take = (speaker: string, claim: MeetingTake["claim"]): MeetingTake => ({ speaker: speaker as StaffId, claim, grade: "SHARP", certainty: 50, volunteered: false });

  it("sees disagreement only where both cannot be right", () => {
    expect(stepsApart(take("a", { point: "LUCK", verdict: "LUCKY" }), take("b", { point: "LUCK", verdict: "UNLUCKY" }))).toBe(2);
    expect(stepsApart(take("a", { point: "LUCK", verdict: "LUCKY" }), take("b", { point: "LUCK", verdict: "EVEN" }))).toBe(1);
    expect(stepsApart(take("a", { point: "LUCK", verdict: "EVEN" }), take("b", { point: "LUCK", verdict: "EVEN" }))).toBe(0);
    expect(stepsApart(take("gm", { point: "NEXT_WINS", wins: 5 }), take("dc", { point: "NEXT_WINS", verdict: "TOP_10" }))).toBe(2);
    expect(stepsApart(take("gm", { point: "NEXT_WINS", wins: 12 }), take("dc", { point: "NEXT_WINS", verdict: "TOP_10" }))).toBe(0);
  });

  it("runs hotter between fiery men than quiet ones", () => {
    const gm = makeGm(league.teams[0]!, "x");
    const heat = (type: StaffState["personalityType"]) => {
      let open = 0;
      for (let i = 0; i < 300; i++) {
        const a = { ...gm, id: "a" as StaffId, personalityType: type }, b = { ...gm, id: "b" as StaffId, personalityType: type };
        const c = findClashes({
          takes: [take("a", { point: "LUCK", verdict: "LUCKY" }), take("b", { point: "LUCK", verdict: "UNLUCKY" })],
          staff: new Map([["a", a], ["b", b]]), lowerView: () => 0, jobOnLine: new Set(), sideGroups: new Map(), seed: `h${i}`, key: "k",
        });
        if (c[0]!.heat !== "POLITE") open++;
      }
      return open;
    };
    expect(TEMPER.fiery).toBeGreaterThan(TEMPER.quiet);
    expect(heat("fiery")).toBeGreaterThan(heat("quiet") + 100);
  });
});
