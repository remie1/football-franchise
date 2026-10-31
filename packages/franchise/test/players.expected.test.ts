import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, playerId, teamId,
  type AttributeMap, type CalendarPhase, type CalendarStamp, type PlayerState, type Position,
} from "@ff/contracts";
import { phaseWeeks } from "../src/calendar/clock.js";
import {
  EXPECTED_STARTER_SNAPS_PER_GAME, developmentWeek, expectedOverallChange, overallWithCarry, yearWeeks,
} from "../src/players/development.js";
import type { PlayerWeek } from "../src/players/types.js";

// ADR-087 D5b: the year ahead, expected (for the cap's veteran decisions). Checked against the real
// development week averaged over many seeds, walked through the same calendar.

const RULES = DEFAULT_LEAGUE_RULES;
const SEASON = 2030;
const BYE_WEEK = 9;
const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));

function makePlayer(id: string, position: Position, age: number, o: { seasons?: number; growth?: number; rating?: number; prospect?: boolean; development?: boolean } = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, o.rating ?? 62]));
  return {
    bio: {
      id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 220,
      draft: o.prospect ? "PROSPECT" : { year: SEASON - (o.seasons ?? 0), round: 3, pick: 70 },
      creditedSeasons: o.seasons ?? 0,
    },
    attributes: {
      kind: "true", values, traits: new Set(),
      ...(o.development === false ? {} : {
        development: { growth: o.growth ?? 1, snaps: 0, carry: {}, body: { forty: 4.6, cone: 7.1, vertical: 33, bench: 18 } },
      }),
    },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    teamId: teamId("T1"),
  };
}

const PRACTICE: ReadonlySet<CalendarPhase> = new Set(["OFF_ROOKIES_OTAS", "TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON"]);

/**
 * The real week, walked `weeks` weeks from `at`: a team that misses the playoffs, a bye in week 9, a year
 * older entering camp, a credited season entering the evaluation phase. Returns his overall change.
 */
function realChange(start: PlayerState, at: CalendarStamp, weeks: number, starter: boolean, seed: string): number {
  let p = start;
  let phaseIndex = CALENDAR_PHASE_ORDER.indexOf(at.phase);
  let week = at.week;
  let season = at.season;
  for (let i = 0; i < weeks; i++) {
    const phase = CALENDAR_PHASE_ORDER[phaseIndex]!;
    const game = starter && phase === "REGULAR_SEASON" && week !== BYE_WEEK;
    const w: PlayerWeek = PRACTICE.has(phase)
      ? { withTeam: true, practiced: 1, playShare: game ? 1 : 0, snaps: game ? EXPECTED_STARTER_SNAPS_PER_GAME : 0, contests: [] }
      : { withTeam: false, practiced: 0, playShare: 0, snaps: 0, contests: [] };
    p = developmentWeek({ players: [p], at: { season, phase, week, day: 7 }, rules: RULES, seed, weeks: new Map([[String(p.bio.id), w]]) }).players[0]!;
    week++;
    if (week > phaseWeeks(phase, RULES)) {
      week = 1;
      phaseIndex = (phaseIndex + 1) % CALENDAR_PHASE_ORDER.length;
      const next = CALENDAR_PHASE_ORDER[phaseIndex]!;
      if (next === CALENDAR_PHASE_ORDER[0]) { season++; p = { ...p, bio: { ...p.bio, age: p.bio.age + 1 } }; }
      if (next === "OFF_EVAL") p = { ...p, bio: { ...p.bio, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1 } };
    }
  }
  return overallWithCarry(p) - overallWithCarry(start);
}

const meanOverSeeds = (p: PlayerState, at: CalendarStamp, weeks: number, starter: boolean, n: number) => {
  let sum = 0;
  for (let k = 0; k < n; k++) sum += realChange(p, at, weeks, starter, `expected-${k}`);
  return sum / n;
};

const NEW_LEAGUE_YEAR: CalendarStamp = { season: SEASON, phase: "OFF_RESET_FA", week: 1, day: 1 };
const CAMP: CalendarStamp = { season: SEASON, phase: "TRAINING_CAMP", week: 1, day: 1 };

describe("expectedOverallChange", () => {
  it("is the real week's mean: a year from the new league year and from camp, starter and backup, young and old", () => {
    const cases: { p: PlayerState; at: CalendarStamp; starter: boolean }[] = [
      { p: makePlayer("rookie-cb", "CB", 22, { seasons: 0 }), at: CAMP, starter: true },
      { p: makePlayer("young-wr", "WR", 24, { seasons: 2 }), at: NEW_LEAGUE_YEAR, starter: false },
      { p: makePlayer("prime-lt", "LT", 27, { seasons: 5, growth: 1.3 }), at: NEW_LEAGUE_YEAR, starter: true },
      { p: makePlayer("old-rb", "RB", 31, { seasons: 9, growth: 0.8 }), at: NEW_LEAGUE_YEAR, starter: true },
      { p: makePlayer("older-qb", "QB", 35, { seasons: 13 }), at: CAMP, starter: false },
    ];
    for (const c of cases) {
      const expected = expectedOverallChange(c.p, { at: c.at, starter: c.starter });
      const real = meanOverSeeds(c.p, c.at, yearWeeks(RULES), c.starter, 48);
      expect(Math.abs(expected - real), `${String(c.p.bio.id)}: expected ${expected.toFixed(3)}, real mean ${real.toFixed(3)}`).toBeLessThan(0.12);
    }
  });

  it("gives a rookie starter more than a rookie backup, both gaining, and an old man a loss", () => {
    const rookie = makePlayer("rookie", "FS", 22);
    const starter = expectedOverallChange(rookie, { at: NEW_LEAGUE_YEAR, starter: true });
    const backup = expectedOverallChange(rookie, { at: NEW_LEAGUE_YEAR, starter: false });
    expect(backup).toBeGreaterThan(0);
    expect(starter).toBeGreaterThan(backup);
    expect(expectedOverallChange(makePlayer("vet", "SS", 34, { seasons: 12 }), { at: NEW_LEAGUE_YEAR, starter: true })).toBeLessThan(0);
  });

  it("counts part of a year when asked, and a year by default", () => {
    const p = makePlayer("p", "MLB", 25, { seasons: 3 });
    const year = expectedOverallChange(p, { at: NEW_LEAGUE_YEAR, starter: true });
    expect(expectedOverallChange(p, { at: NEW_LEAGUE_YEAR, starter: true, weeks: yearWeeks(RULES) })).toBe(year);
    expect(expectedOverallChange(p, { at: NEW_LEAGUE_YEAR, starter: true, weeks: 0 })).toBe(0);
    const half = expectedOverallChange(p, { at: NEW_LEAGUE_YEAR, starter: true, weeks: 26 });
    expect(half).not.toBe(year);
  });

  it("is pure and repeatable: the same answer twice, the player untouched", () => {
    const p = makePlayer("p", "DE", 29, { seasons: 7 });
    const frozen = structuredClone(p);
    const a = expectedOverallChange(p, { at: NEW_LEAGUE_YEAR, starter: true });
    const b = expectedOverallChange(p, { at: NEW_LEAGUE_YEAR, starter: true });
    expect(a).toBe(b);
    expect(p).toEqual(frozen);
  });

  it("is 0 for a prospect and for a man with no development record", () => {
    expect(expectedOverallChange(makePlayer("pr", "WR", 21, { prospect: true }), { at: NEW_LEAGUE_YEAR, starter: true })).toBe(0);
    expect(expectedOverallChange(makePlayer("nd", "WR", 24, { development: false }), { at: NEW_LEAGUE_YEAR, starter: true })).toBe(0);
  });
});
