import { describe, it, expect } from "vitest";
import {
  DEFAULT_LEAGUE_RULES, playerId,
  type CalendarStamp, type PlayerContract, type PlayerState, type Position, type SeasonState, type Team,
} from "@ff/contracts";
import { buildLeague, capForecast, leagueYearSteps, minimumSalary, veteranContract, type LeagueYearConfig, type LeaguePeople } from "../src/index.js";
import { TAPE_SEASONS, teamGrade } from "../src/cap/leagueYear.js";
import { WANTED, type Rate } from "../src/draft/board.js";

// ADR-085 step 14, scouting veterans by their tape (owner's pick, 2026-11-28): a team's error grading a
// man shrinks with his seasons in the league. Built switched off.

const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;
const cap = capForecast("cap-seed");
const SIGNED: CalendarStamp = { season: 2025, phase: "OFF_RESET_FA", week: 2, day: 1 };
const teams = buildLeague("world-1").teams;

function man(id: string, position: Position, ovr: number, age: number, cs: number, team?: Team): PlayerState {
  return {
    bio: { id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 230, draft: "UDFA", creditedSeasons: cs },
    attributes: { kind: "true", values: { ovr }, traits: new Set<string>() },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    ...(team ? { teamId: team.id } : {}),
  };
}

describe("teamGrade with the tape (step 14, switched off)", () => {
  const skill = 20;
  const errorOf = (p: PlayerState, tape?: boolean) =>
    (tape === undefined ? teamGrade(teams[0]!.id, p, skill, rate, "tape", 2030) : teamGrade(teams[0]!.id, p, skill, rate, "tape", 2030, tape)) - rate(p);

  it("off, the grade is today's: the same draw, the same error", () => {
    for (const cs of [0, 4, 12]) {
      const p = man(`m${cs}`, "WR", 70, 22 + cs, cs);
      expect(errorOf(p, false)).toBe(errorOf(p));
    }
  });

  it("a rookie is graded as before", () => {
    const p = man("rookie", "CB", 64, 22, 0);
    expect(errorOf(p, true)).toBe(errorOf(p, false));
  });

  it("the error shrinks by sqrt(1 + seasons / 4): to about 0.71 at four seasons and a half at twelve", () => {
    expect(TAPE_SEASONS).toBe(4);
    for (const [cs, share] of [[2, 1 / Math.sqrt(1.5)], [4, 1 / Math.sqrt(2)], [12, 0.5]] as const) {
      // The same man by id, so the same draw: only his seasons differ.
      const p = man("vet", "MLB", 68, 22 + cs, cs);
      expect(errorOf(p, false)).not.toBe(0);
      expect(errorOf(p, true)).toBeCloseTo(errorOf(p, false) * share, 12);
    }
  });

  it("same team, man, seed and season: the same grade", () => {
    const p = man("vet", "FS", 71, 30, 8);
    expect(teamGrade(teams[1]!.id, p, skill, rate, "s", 2031, true)).toBe(teamGrade(teams[1]!.id, p, skill, rate, "s", 2031, true));
  });
});

// A league year's market day and re-signing day, with the switch absent, off and on.
const payFor = (ovr: number, cs: number, season: number) => Math.max(minimumSalary(season, cs, cap), 20_000 * Math.max(0, ovr - 50) ** 2);
function deal(p: PlayerState, team: Team, season: number, years: number): PlayerContract {
  const cs = p.bio.creditedSeasons ?? 0;
  return veteranContract({
    player: p.bio.id, team: team.id, season, signedAt: SIGNED, apy: payFor(rate(p), cs, season), years,
    bonusShare: 0, guaranteedYears: 0, minimum: (i) => minimumSalary(season + i, cs + i, cap),
  });
}
/** Two teams of the 53's shape, ratings spread by seat; a third of each team's deals run out after 2026. */
function world(cs: number, freeAgents: PlayerState[]): LeaguePeople {
  const men: PlayerState[] = [];
  const contracts: PlayerContract[] = [];
  const built = teams.slice(0, 2).map((t, k) => {
    const ids: PlayerState[] = [];
    for (const pos of Object.keys(WANTED) as Position[]) {
      for (let i = 0; i < WANTED[pos]; i++) {
        const p = man(`${String(t.id)}-${pos}-${i}`, pos, 70 - 3 * i + k, 23 + cs, cs, t);
        ids.push(p);
        contracts.push(deal(p, t, 2026, (i % 3) + 1));
      }
    }
    men.push(...ids);
    return { ...t, roster: ids.map((p) => p.bio.id), depthChart: {} };
  });
  return {
    teams: built, players: [...men, ...freeAgents], picks: [], classes: [], freeAgents: freeAgents.map((p) => p.bio.id),
    contracts, deadMoney: [],
  };
}
const ctxAt = (day: CalendarStamp) => ({ day, season: day.season, seed: "tape", rules: DEFAULT_LEAGUE_RULES, state: { standings: [] } as unknown as SeasonState, games: [] });
/** Re-signing's first day, the new league year, a premium market day and a value day, each step on its day. */
const DAYS: [string, CalendarStamp][] = [
  ["re-sign", { season: 2026, phase: "OFF_EVAL", week: 1, day: 7 }],
  ["new-league-year", { season: 2026, phase: "OFF_RESET_FA", week: 1, day: 1 }],
  ["free-agency", { season: 2026, phase: "OFF_RESET_FA", week: 1, day: 2 }],
  ["free-agency", { season: 2026, phase: "OFF_RESET_FA", week: 2, day: 1 }],
];
function eventsOf(config: Partial<LeagueYearConfig>, start: LeaguePeople): string {
  const steps = leagueYearSteps({ rate, cap, scouting: () => 0, ...config });
  const out: unknown[] = [];
  let people = start;
  for (const [id, day] of DAYS) {
    const r = steps.find((s) => s.id === id)!.run(people, ctxAt(day));
    out.push(r?.events ?? []);
    people = r?.people ?? people;
  }
  return JSON.stringify(out);
}

describe("the league year with the tape (step 14, switched off)", () => {
  const freeVets = (cs: number) => (["WR", "CB", "DE", "LG"] as Position[]).map((pos, i) => man(`fa-${pos}`, pos, 66 + i, 23 + cs, cs));

  it("off is the league year as it was, on re-signing day and in free agency", () => {
    const people = world(6, freeVets(6));
    const before = eventsOf({}, people);
    expect(JSON.parse(before).flat().length).toBeGreaterThan(0);
    expect(eventsOf({ veteranTape: false }, people)).toBe(before);
  });

  it("on, a league of rookies is judged as before", () => {
    const people = world(0, freeVets(0));
    expect(eventsOf({ veteranTape: true }, people)).toBe(eventsOf({}, people));
  });

  it("on, veterans are judged by their tape, and the same people give the same year", () => {
    const people = world(9, freeVets(9));
    const on = eventsOf({ veteranTape: true }, people);
    expect(eventsOf({ veteranTape: true }, people)).toBe(on);
    expect(on).not.toBe(eventsOf({}, people));
  });
});
