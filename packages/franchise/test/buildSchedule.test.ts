import { describe, it, expect } from "vitest";
import type { TeamId, SeasonSchedule } from "@ff/contracts";
import { buildLeague, buildSchedule, BYE_WINDOW } from "../src/index.js";

const league = buildLeague("world-1");
const divisionOf = new Map(league.structure.divisions.flatMap((d) => d.teams.map((t) => [t, d] as const)));
const confOf = (t: TeamId) => divisionOf.get(t)!.conference;
const placeOf = (t: TeamId) => divisionOf.get(t)!.teams.indexOf(t);
const teams = league.teams.map((t) => t.id);

function gamesOf(s: SeasonSchedule, t: TeamId) {
  return s.games.filter((g) => g.home === t || g.away === t);
}
function opponent(g: { home: TeamId; away: TeamId }, t: TeamId) { return g.home === t ? g.away : g.home; }

describe("buildSchedule (season shell S3)", () => {
  const seasons = [2026, 2027, 2028, 2029, 2030, 2031];
  const schedules = new Map(seasons.map((y) => [y, buildSchedule(league, y, `sched-${y}`)] as const));

  it("gives 272 games and every team exactly 17", () => {
    for (const s of schedules.values()) {
      expect(s.games).toHaveLength(272);
      for (const t of teams) expect(gamesOf(s, t)).toHaveLength(17);
    }
  });

  it("never has a team twice in one week, and every team plays every week but its bye", () => {
    for (const s of schedules.values()) {
      for (const t of teams) {
        const weeks = gamesOf(s, t).map((g) => g.at.week);
        expect(new Set(weeks).size).toBe(17);
        const bye = s.byes.find((b) => b.team === t)!.week;
        expect(weeks).not.toContain(bye);
        expect([...weeks, bye].sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
      }
    }
  });

  it("gives one bye per team, in weeks 5-14", () => {
    for (const s of schedules.values()) {
      expect(s.byes).toHaveLength(32);
      expect(new Set(s.byes.map((b) => b.team)).size).toBe(32);
      for (const b of s.byes) {
        expect(b.week).toBeGreaterThanOrEqual(BYE_WINDOW.first);
        expect(b.week).toBeLessThanOrEqual(BYE_WINDOW.last);
      }
    }
  });

  it("splits home and away 8/9, with the 9-home conference alternating each season", () => {
    for (const [y, s] of schedules) {
      for (const t of teams) {
        const home = gamesOf(s, t).filter((g) => g.home === t).length;
        expect([8, 9]).toContain(home);
        const nineHome = confOf(t) === league.structure.conferences[y % 2 === 1 ? 0 : 1]!.id;
        expect(home).toBe(nineHome ? 9 : 8);
      }
    }
  });

  it("follows the formula: 6 division, 4+4 rotating divisions, 2+1 same-place", () => {
    for (const [y, s] of schedules) {
      const prev = y - 1;
      const prevS = schedules.get(prev);
      for (const t of teams) {
        const opps = gamesOf(s, t).map((g) => opponent(g, t));
        const div = divisionOf.get(t)!;
        const inDiv = opps.filter((o) => divisionOf.get(o) === div);
        expect(inDiv).toHaveLength(6);
        for (const rival of div.teams.filter((x) => x !== t)) {
          const both = gamesOf(s, t).filter((g) => opponent(g, t) === rival);
          expect(both.map((g) => g.home === t).sort()).toEqual([false, true]);
        }
        const outside = opps.filter((o) => divisionOf.get(o) !== div);
        const perDiv = new Map<string, TeamId[]>();
        for (const o of outside) perDiv.set(divisionOf.get(o)!.id, [...(perDiv.get(divisionOf.get(o)!.id) ?? []), o]);
        const sizes = [...perDiv.values()].map((l) => l.length).sort();
        expect(sizes).toEqual([1, 1, 1, 4, 4]);
        const singles = { same: 0, cross: 0 }, fours = { same: 0, cross: 0 };
        for (const [did, list] of perDiv) {
          const sameConf = league.structure.divisions.find((d) => d.id === did)!.conference === div.conference;
          if (list.length === 4) expect(new Set(list).size).toBe(4);
          else expect(placeOf(list[0]!)).toBe(placeOf(t)); // same-place, by listed order
          if (list.length === 1) singles[sameConf ? "same" : "cross"]++;
          else fours[sameConf ? "same" : "cross"]++;
        }
        expect(singles).toEqual({ same: 2, cross: 1 });
        expect(fours).toEqual({ same: 1, cross: 1 });
        expect(new Set(opps).size).toBe(14); // 3 rivals + 4 + 4 + 2 + 1, no repeats outside the division
        if (prevS) {
          // the full-division opponents change from one season to the next
          const full = (sch: SeasonSchedule) => {
            const m = new Map<string, number>();
            for (const o of gamesOf(sch, t).map((g) => opponent(g, t))) {
              const d = divisionOf.get(o)!.id;
              m.set(d, (m.get(d) ?? 0) + 1);
            }
            return [...m].filter(([d, n]) => n === 4 && d !== div.id).map(([d]) => d).sort();
          };
          expect(full(s)).not.toEqual(full(prevS));
        }
      }
    }
  });

  it("puts only division games in week 18 and never the same opponent in back-to-back weeks", () => {
    for (const s of schedules.values()) {
      const final = s.games.filter((g) => g.at.week === 18);
      expect(final).toHaveLength(16);
      for (const g of final) expect(divisionOf.get(g.home)).toBe(divisionOf.get(g.away));
      for (const t of teams) {
        const byWeek = new Map(gamesOf(s, t).map((g) => [g.at.week, opponent(g, t)] as const));
        for (let w = 2; w <= 18; w++) {
          if (byWeek.has(w) && byWeek.has(w - 1)) expect(byWeek.get(w)).not.toBe(byWeek.get(w - 1));
        }
      }
    }
  });

  it("uses last season's finish for the same-place games", () => {
    const div = league.structure.divisions[0]!;
    const reversed = [...div.teams].reverse();
    const s = buildSchedule(league, 2026, "sched-2026", { previousFinish: { [div.id]: reversed } });
    const champ = reversed[0]!; // finished first, so meets other first-place teams
    const sameConfOthers = gamesOf(s, champ).map((g) => opponent(g, champ))
      .filter((o) => divisionOf.get(o) !== div && confOf(o) === div.conference);
    const singles = sameConfOthers.filter((o) => sameConfOthers.filter((x) => divisionOf.get(x) === divisionOf.get(o)).length === 1);
    expect(singles).toHaveLength(2);
    for (const o of singles) expect(placeOf(o)).toBe(0);
    expect(() => buildSchedule(league, 2026, "x", { previousFinish: { [div.id]: [div.teams[0]!] } })).toThrow();
  });

  it("is deterministic: same seed, same schedule; a different seed moves the weeks, not the matchups", () => {
    const a = buildSchedule(league, 2026, "sched-2026");
    expect(JSON.stringify(a)).toBe(JSON.stringify(schedules.get(2026)));
    const b = buildSchedule(league, 2026, "another-seed");
    expect(JSON.stringify(b)).not.toBe(JSON.stringify(a));
    const pairs = (s: SeasonSchedule) => s.games.map((g) => `${g.away}@${g.home}`).sort();
    expect(pairs(b)).toEqual(pairs(a));
  });

  it("works for many seeds and leagues", () => {
    for (let i = 0; i < 40; i++) {
      const l = buildLeague(`w-${i}`);
      const s = buildSchedule(l, 2026 + (i % 7), `seed-${i}`);
      expect(s.games).toHaveLength(272);
      expect(new Set(s.games.map((g) => g.gameId)).size).toBe(272);
    }
  });
});
