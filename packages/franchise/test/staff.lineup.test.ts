import { describe, it, expect } from "vitest";
import { staffId, teamId, type PersonalityType, type StaffState } from "@ff/contracts";
import { buildLeague, buildStaff, seatOf } from "../src/index.js";
import {
  EVEN_LINEUP, LINEUP_BY_TYPE, hasQuickHook, headCoachOf, lineupFor, teamLineup, type Lineup,
} from "../src/players/lineup.js";

// ADR-087 C1: a head coach's depth-chart leanings, and buildStaff's `lineups` switch.

const TYPES: readonly PersonalityType[] = ["demanding", "playersCoach", "cerebral", "fiery", "quiet"];

function coach(n: number, type: PersonalityType, team = "T1", o: Partial<StaffState> = {}): StaffState {
  return {
    id: staffId(`S${String(n).padStart(5, "0")}`),
    displayName: `Coach ${n}`,
    role: "HEAD_COACH",
    age: 50,
    attributes: {},
    lineage: [],
    personalityType: type,
    teamId: teamId(team),
    career: [{ level: "NFL", role: "HEAD_COACH", team: teamId(team), employer: team, firstSeason: 2020, seasons: [] }],
    ...o,
  };
}

const meanOf = (xs: readonly Lineup[], k: keyof Lineup) => xs.reduce((s, x) => s + x[k], 0) / xs.length;
/** Five hundred coaches of each type, leanings drawn. */
const drawn: Record<PersonalityType, Lineup[]> = Object.fromEntries(TYPES.map((type, t) =>
  [type, Array.from({ length: 500 }, (_, i) => lineupFor(coach(t * 1000 + i, type), "lineup-seed"))])) as Record<PersonalityType, Lineup[]>;

describe("lineupFor (C1)", () => {
  it("is a pure function of the coach and the seed, in whole points 0..100", () => {
    const c = coach(7, "cerebral");
    expect(lineupFor(c, "a")).toEqual(lineupFor(structuredClone(c), "a"));
    expect(lineupFor(c, "a")).not.toEqual(lineupFor(c, "b"));
    expect(lineupFor(c, "a")).not.toEqual(lineupFor(coach(8, "cerebral"), "a"));
    for (const list of Object.values(drawn)) {
      for (const l of list) {
        for (const v of [l.incumbent, l.veteran, l.form]) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("follows his type (§3.1's proposed mapping) with variation of his own", () => {
    const m = (type: PersonalityType, k: keyof Lineup) => meanOf(drawn[type], k);
    // Sticks with the incumbent: strongest in players' coaches and quiet coaches.
    for (const other of ["demanding", "cerebral", "fiery"] as const) {
      expect(m("playersCoach", "incumbent")).toBeGreaterThan(m(other, "incumbent"));
      expect(m("quiet", "incumbent")).toBeGreaterThan(m(other, "incumbent"));
    }
    // Leans to veterans: strongest in demanding and quiet coaches.
    for (const other of ["playersCoach", "cerebral", "fiery"] as const) {
      expect(m("demanding", "veteran")).toBeGreaterThan(m(other, "veteran"));
      expect(m("quiet", "veteran")).toBeGreaterThan(m(other, "veteran"));
    }
    // Plays who looks best: strongest in cerebral coaches.
    for (const other of ["playersCoach", "quiet", "demanding", "fiery"] as const) expect(m("cerebral", "form")).toBeGreaterThan(m(other, "form"));
    // Fiery: middling on all three.
    for (const k of ["incumbent", "veteran", "form"] as const) {
      expect(m("fiery", k)).toBeGreaterThan(40);
      expect(m("fiery", k)).toBeLessThan(60);
    }
    // Each type's mean sits near its table entry, and coaches of a type differ from one another.
    for (const type of TYPES) {
      for (const k of ["incumbent", "veteran", "form"] as const) {
        expect(Math.abs(m(type, k) - LINEUP_BY_TYPE[type][k])).toBeLessThan(2);
        expect(new Set(drawn[type].map((l) => l[k])).size).toBeGreaterThan(10);
      }
    }
  });

  it("gives only a fiery coach the quick hook", () => {
    for (const type of TYPES) expect(hasQuickHook(coach(1, type))).toBe(type === "fiery");
    expect(hasQuickHook(undefined)).toBe(false);
  });
});

describe("teamLineup", () => {
  const stored: Lineup = { incumbent: 11, veteran: 22, form: 33 };
  const staff = [
    coach(1, "quiet", "T1", { lineup: stored }),
    coach(2, "cerebral", "T2"),
    { ...coach(3, "fiery", "T3"), role: "OC" as const, career: [{ level: "NFL" as const, role: "OC" as const, team: teamId("T3"), employer: "T3", firstSeason: 2020, seasons: [] }] },
  ];

  it("reads his stored leanings, else draws them", () => {
    expect(teamLineup(teamId("T1"), staff, "s")).toEqual(stored);
    expect(teamLineup(teamId("T2"), staff, "s")).toEqual(lineupFor(staff[1]!, "s"));
  });

  it("uses even leanings for the owner's team, for a team without a head coach, and with no staff", () => {
    expect(teamLineup(teamId("T1"), staff, "s", teamId("T1"))).toEqual(EVEN_LINEUP);
    expect(teamLineup(teamId("T3"), staff, "s")).toEqual(EVEN_LINEUP);
    expect(teamLineup(teamId("T1"), undefined, "s")).toEqual(EVEN_LINEUP);
    expect(teamLineup(teamId("T2"), staff, "s", teamId("T1"))).toEqual(lineupFor(staff[1]!, "s"));
  });

  it("finds the sitting head coach only", () => {
    expect(headCoachOf(teamId("T1"), staff)?.id).toBe(staff[0]!.id);
    expect(headCoachOf(teamId("T3"), staff)).toBeUndefined();
    const fired = coach(4, "demanding", "T4", { career: [{ level: "NFL", role: "HEAD_COACH", team: teamId("T4"), employer: "T4", firstSeason: 2020, lastSeason: 2022, seasons: [], ended: "FIRED" }] });
    expect(headCoachOf(teamId("T4"), [fired])).toBeUndefined();
  });
});

describe("buildStaff's lineups switch (C1)", () => {
  const league = buildLeague("lineup-league");
  const plain = buildStaff(league, { firstSeason: 2026, historySeasons: 4 });
  const off = buildStaff(league, { firstSeason: 2026, historySeasons: 4, lineups: false });
  const on = buildStaff(league, { firstSeason: 2026, historySeasons: 4, lineups: true });
  const json = (x: unknown) => JSON.stringify(x);

  it("changes nothing when off", () => {
    expect(json(off)).toBe(json(plain));
    expect(plain.world.staff.some((s) => s.lineup !== undefined)).toBe(false);
  });

  it("when on, gives every sitting head coach his leanings and nobody else any, moving no other draw", () => {
    const heads = on.world.staff.filter((s) => seatOf(s) === "HEAD_COACH");
    expect(heads).toHaveLength(league.teams.length);
    for (const s of on.world.staff) {
      if (seatOf(s) === "HEAD_COACH") expect(s.lineup).toEqual(lineupFor(s, league.seed));
      else expect(s.lineup).toBeUndefined();
    }
    const stripped = { ...on, world: { ...on.world, staff: on.world.staff.map(({ lineup: _lineup, ...rest }) => rest) } };
    expect(json(stripped)).toBe(json(plain));
  });

  it("draws from the staff seed when one is given", () => {
    const seeded = buildStaff(league, { firstSeason: 2026, historySeasons: 0, lineups: true, seed: "other" });
    const hc = seeded.world.staff.find((s) => seatOf(s) === "HEAD_COACH")!;
    expect(hc.lineup).toEqual(lineupFor(hc, "other"));
  });
});
