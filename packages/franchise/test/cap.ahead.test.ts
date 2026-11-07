import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, DEFAULT_LEAGUE_RULES, createRng, playerId, staffId,
  type AttributeMap, type CalendarStamp, type PlayerContract, type PlayerState, type Position, type StaffState, type Team, type TeamDirection, type TeamId,
} from "@ff/contracts";
import {
  AHEAD, aheadView, buildLeague, decisionSeason, gmEvaluation, legacyRuleAge, leagueYearSteps, makeGm, marketCurves, outlookError, outlookPeriod,
  runCutdown, termAt, valuePlayer, veteranContract, minimumSalary, capForecast, type LeaguePeople,
} from "../src/index.js";
import { expectedOverallChange, expectedOverallPath, overallWithCarry, yearWeeks } from "../src/players/development.js";
import { WANTED, type Rate } from "../src/draft/board.js";

// ADR-085 step 13: computer teams judge a man ahead, over years set by their direction, through their
// GM's eyes, with no position in the age rules (owner's rulings of 2026-10-31 and 2026-11-06).

const ACTIVE = Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((d) => d.status === "active").map((d) => String(d.id));
const SEASON = 2030;
/** Free agency's second day: deals signed now are for 2031. */
const AT: CalendarStamp = { season: SEASON, phase: "OFF_RESET_FA", week: 1, day: 2 };

function grown(id: string, position: Position, age: number, o: { rating?: number; growth?: number; development?: boolean; prospect?: boolean; team?: TeamId } = {}): PlayerState {
  const values: AttributeMap = Object.fromEntries(ACTIVE.map((a) => [a, o.rating ?? 62]));
  const seasons = Math.max(0, age - 22);
  return {
    bio: {
      id: playerId(id), displayName: id, position, age, heightIn: 74, weightLb: 220,
      draft: o.prospect ? "PROSPECT" : { year: SEASON - seasons, round: 3, pick: 70 }, creditedSeasons: seasons,
    },
    attributes: {
      kind: "true", values, traits: new Set(),
      ...(o.development === false ? {} : {
        development: { growth: o.growth ?? 1, snaps: 0, carry: {}, body: { forty: 4.6, cone: 7.1, vertical: 33, bench: 18 } },
      }),
    },
    condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
    ...(o.team !== undefined ? { teamId: o.team } : {}),
  };
}

const base: Rate = overallWithCarry;
const LEAGUE = buildLeague("world-1");
const withRoster = (t: Team, men: readonly PlayerState[], direction?: TeamDirection): Team => {
  const { direction: _none, ...rest } = t;
  return { ...rest, roster: men.map((p) => p.bio.id), depthChart: {}, ...(direction ? { direction } : {}) };
};
const pathOf = (p: PlayerState, starter: boolean, at: CalendarStamp = AT) => expectedOverallPath(p, { at, starter, years: AHEAD.most });
const meanOf = (xs: readonly number[], n: number) => xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
const gmFor = (t: Team, skill: number): StaffState => {
  const gm = makeGm(t, "gm-seed");
  return { ...gm, attributes: { ...gm.attributes, forecasting: skill, talentEvaluation: skill } };
};

describe("the expected path (ADR-087's expected change, a year at a time)", () => {
  it("is the expected change at the end of each of the next three years, from one walk", () => {
    for (const [p, starter] of [[grown("young", "WR", 23), true], [grown("old", "CB", 32), false]] as const) {
      const path = pathOf(p, starter);
      expect(path).toHaveLength(3);
      path.forEach((x, k) => expect(x).toBeCloseTo(expectedOverallChange(p, { at: AT, starter, weeks: (k + 1) * yearWeeks(DEFAULT_LEAGUE_RULES) }), 9));
    }
    expect(pathOf(grown("none", "WR", 30, { development: false }), true)).toEqual([0, 0, 0]);
    expect(pathOf(grown("prospect", "WR", 21, { prospect: true }), true)).toEqual([0, 0, 0]);
  });
});

describe("how far ahead a team looks (owner, 2026-11-06: contend 1, retool 2, rebuild 3)", () => {
  // Each team: a starting QB (rated higher) and a backup. One QB starts.
  const dirs: (TeamDirection | undefined)[] = ["CONTEND", "RETOOL", "REBUILD", undefined];
  const men = dirs.map((_, i) => {
    const t = LEAGUE.teams[i]!.id;
    return { starter: grown(`s${i}`, "QB", 26, { rating: 70, team: t }), backup: grown(`b${i}`, "QB", 24, { rating: 55, team: t }) };
  });
  const teams = dirs.map((d, i) => withRoster(LEAGUE.teams[i]!, [men[i]!.starter, men[i]!.backup], d));
  const free = grown("fa", "QB", 31, { rating: 66 });
  const star = grown("star", "QB", 27, { rating: 80 });
  const players = [...men.flatMap((m) => [m.starter, m.backup]), free, star];
  const view = aheadView(base);
  view.setToday({ at: AT, people: { teams, players } });
  const ahead = (team: TeamId | undefined, p: PlayerState) => view.rate(team, p) - base(p);

  it("judges its starters over its direction's years, a backup a year further (three at most), with no GM: the truth", () => {
    const want = [1, 2, 3, 2];
    dirs.forEach((_, i) => {
      const t = teams[i]!.id;
      expect(ahead(t, men[i]!.starter)).toBeCloseTo(meanOf(pathOf(men[i]!.starter, true), want[i]!), 9);
      expect(ahead(t, men[i]!.backup)).toBeCloseTo(meanOf(pathOf(men[i]!.backup, false), Math.min(3, want[i]! + 1)), 9);
      // A newcomer: as a backup when he would not start for it today, else as a starter.
      expect(ahead(t, free)).toBeCloseTo(meanOf(pathOf(free, false), Math.min(3, want[i]! + 1)), 9);
      expect(ahead(t, star)).toBeCloseTo(meanOf(pathOf(star, false), want[i]!), 9);
    });
  });

  it("with no team (a man's own view of his worth): the middle years, a year more for a backup", () => {
    expect(ahead(undefined, free)).toBeCloseTo(meanOf(pathOf(free, false), AHEAD.noDirection), 9);
    expect(ahead(undefined, men[0]!.backup)).toBeCloseTo(meanOf(pathOf(men[0]!.backup, false), AHEAD.noDirection + 1), 9);
  });

  it("reads a man with no growth record, a prospect, or a day not set as today", () => {
    const old = grown("plain", "QB", 34, { development: false });
    const prospect = grown("kid", "QB", 21, { prospect: true });
    expect(view.rate(teams[2]!.id, old)).toBe(base(old));
    expect(view.rate(teams[2]!.id, prospect)).toBe(base(prospect));
    expect(view.value(teams[2]!.id, old)).toBeUndefined();
    const unset = aheadView(base);
    expect(unset.rate(teams[2]!.id, men[2]!.starter)).toBe(base(men[2]!.starter));
  });

  it("a deal's shift reads his expected rating across the deal's years instead", () => {
    const t = teams[0]!.id; // contend: one year
    const p = men[0]!.starter;
    expect(view.rate(t, p) + view.dealShift(t, p, 3)).toBeCloseTo(base(p) + meanOf(pathOf(p, true), 3), 9);
    expect(view.dealShift(t, p, 1)).toBeCloseTo(0, 9);
    // Past three years, the third year's average stands.
    expect(view.dealShift(t, p, 5)).toBeCloseTo(view.dealShift(t, p, 3), 9);
  });
});

describe("the GM's outlook (owner's answers 1a, 2b, 3)", () => {
  it("refreshes at the new league year, at the end of camp (cut-down day) and right after the last games before the trade deadline", () => {
    const s = (season: number, phase: CalendarStamp["phase"], week: number, day: number): CalendarStamp => ({ season, phase, week, day });
    expect(outlookPeriod(s(2030, "OFF_RESET_FA", 1, 1))).toBe("2031/A");
    expect(outlookPeriod(s(2030, "OFF_SUMMER", 2, 3))).toBe("2031/A");
    expect(outlookPeriod(s(2031, "TRAINING_CAMP", 1, 1))).toBe("2031/A");
    expect(outlookPeriod(s(2031, "PRESEASON", 3, 1))).toBe("2031/A");
    expect(outlookPeriod(s(2031, "PRESEASON", 3, 2))).toBe("2031/B"); // cut-down day
    expect(outlookPeriod(s(2031, "REGULAR_SEASON", 9, 7))).toBe("2031/B"); // week 9's games
    expect(outlookPeriod(s(2031, "REGULAR_SEASON", 10, 1))).toBe("2031/C"); // the deadline is Tuesday of week 10
    expect(outlookPeriod(s(2031, "PLAYOFFS", 1, 7))).toBe("2031/C");
    expect(outlookPeriod(s(2031, "OFF_EVAL", 3, 1))).toBe("2031/C");
    expect(outlookPeriod(s(2031, "OFF_RESET_FA", 1, 1))).toBe("2032/A");
    expect(decisionSeason(s(2031, "OFF_EVAL", 3, 1))).toBe(2032);
    expect(decisionSeason(s(2032, "PRESEASON", 3, 2))).toBe(2032);
  });

  it("a strong GM's typical miss is about 25% smaller than a weak one's, the season's own luck counted", () => {
    expect(outlookError(25)).toBeCloseTo(AHEAD.errorAt25, 9);
    expect(outlookError(85)).toBeCloseTo(AHEAD.errorAt85, 9);
    const luck = 0.29; // sd a year, measured by the aging thread (2026-11-06)
    const miss = (skill: number) => Math.hypot(outlookError(skill), luck);
    expect(1 - miss(85) / miss(25)).toBeGreaterThan(0.24);
    expect(1 - miss(85) / miss(25)).toBeLessThan(0.26);
  });

  // Three contenders: a weak GM, a strong GM and none. Free agents, judged a year ahead by each.
  const [weak, strong, none] = [0, 1, 2].map((i) => withRoster(LEAGUE.teams[i]!, [], "CONTEND"));
  const staff = [gmFor(weak!, 25), gmFor(strong!, 85)];
  const rng = createRng("ahead-test", "free agents");
  const pool = Array.from({ length: 300 }, (_, i) => grown(`f${i}`, "WR", 22 + rng.int(0, 12), { rating: 50 + rng.int(0, 25), growth: 0.6 + 0.8 * rng.next() }));
  const people = { teams: [weak!, strong!, none!], players: pool, staff };
  const view = aheadView(base);
  const missOf = (team: Team) => pool.map((p) => view.rate(team.id, p) - view.rate(none!.id, p));
  view.setToday({ at: AT, people });
  const weakNow = missOf(weak!);
  const strongNow = missOf(strong!);

  it("is the truth plus the GM's error, its size set by his Forecasting and Talent Evaluation", () => {
    const sd = (xs: number[]) => Math.sqrt(xs.reduce((a, x) => a + x * x, 0) / xs.length);
    expect(sd(weakNow)).toBeGreaterThan(0.85);
    expect(sd(weakNow)).toBeLessThan(1.15);
    expect(sd(strongNow) / sd(weakNow)).toBeGreaterThan(0.6);
    expect(sd(strongNow) / sd(weakNow)).toBeLessThan(0.85);
  });

  it("holds through its stretch of the year; at the next refresh half of it stays and half is drawn again", () => {
    view.setToday({ at: { season: SEASON, phase: "OFF_DRAFT", week: 3, day: 1 }, people });
    expect(missOf(weak!)).toEqual(weakNow);
    view.setToday({ at: { season: SEASON + 1, phase: "PRESEASON", week: 3, day: 2 }, people });
    const after = missOf(weak!);
    expect(after.filter((x, i) => x !== weakNow[i]!).length).toBeGreaterThan(290);
    const corr = (xs: number[], ys: number[]) => {
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
      let sxy = 0, sxx = 0, syy = 0;
      xs.forEach((x, i) => { sxy += (x - mx) * (ys[i]! - my); sxx += (x - mx) ** 2; syy += (ys[i]! - my) ** 2; });
      return sxy / Math.sqrt(sxx * syy);
    };
    expect(corr(weakNow, after)).toBeGreaterThan(AHEAD.errorKeep - 0.15);
    expect(corr(weakNow, after)).toBeLessThan(AHEAD.errorKeep + 0.15);
    // The same GM, man and stretch: the same guess in another view (a resumed run).
    const again = aheadView(base);
    again.setToday({ at: { season: SEASON + 1, phase: "PRESEASON", week: 3, day: 2 }, people });
    pool.slice(0, 20).forEach((p, i) => expect(again.rate(weak!.id, p) - again.rate(none!.id, p)).toBeCloseTo(after[i]!, 9));
  });

  it("the market's judge is the GM's Talent Evaluation; with no GM, the head coach's; with neither, 50", () => {
    const t = LEAGUE.teams[5]!;
    const hc: StaffState = { ...makeGm(t, "x"), id: staffId("HC-x"), role: "HEAD_COACH", attributes: { talentEvaluation: 71 } };
    const gm: StaffState = { ...makeGm(t, "x"), attributes: { talentEvaluation: 64 } };
    expect(gmEvaluation(t.id, { staff: [hc, gm] })).toBe(64);
    expect(gmEvaluation(t.id, { staff: [hc] })).toBe(71);
    expect(gmEvaluation(t.id, { staff: [{ ...gm, retiredAfter: 2029 }] })).toBe(50);
    expect(gmEvaluation(t.id, {})).toBe(50);
  });
});

describe("the age rules read a man by his expected change, never his position (owner, 2026-11-06)", () => {
  // A league of quarterbacks, 23 to 33, all alike but for age.
  const men = Array.from({ length: 33 }, (_, i) => grown(`q${i}`, "QB", 23 + (i % 11), { rating: 66 }));
  const view = aheadView(base);
  view.setToday({ at: AT, people: { teams: [], players: men } });
  const at = (age: number) => view.ruleAge(undefined, men.find((p) => p.bio.age === age)!);

  it("with growth off: his age, four years younger at QB, K, P and LS (as before step 13)", () => {
    expect(legacyRuleAge(32, "QB")).toBe(28);
    expect(legacyRuleAge(32, "WR")).toBe(32);
    expect(view.ruleAge(undefined, grown("plain", "QB", 32, { development: false }))).toBe(28);
  });

  it("with growth on: the age at which the league's men are expected to change as he is, with no four-year allowance", () => {
    expect(at(33)).toBeGreaterThan(at(23) + 5);
    expect(at(33)).toBeGreaterThan(30);
    for (let a = 24; a <= 33; a++) expect(at(a)).toBeGreaterThanOrEqual(at(a - 1) - 1e-9);
  });

  it("prices a man judged ahead with no age discount, the deal as long as his rule age allows, at his rating across its years", () => {
    const wr = (id: string, ovr: number, age: number) => ({ ...grown(id, "WR", age, { development: false }), attributes: { kind: "true" as const, values: { ovr }, traits: new Set<string>() } });
    const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;
    const ps = [wr("a", 60, 25), wr("b", 70, 25), wr("c", 80, 25)];
    const t = LEAGUE.teams[0]!.id;
    const cs = ps.map((p, i) => veteranContract({ player: p.bio.id, team: t, season: 2026, signedAt: AT, apy: (i + 1) * 10e6, years: 2, bonusShare: 0, guaranteedYears: 0, minimum: () => 1e6 }));
    const curves = marketCurves(cs, ps, 2026, rate);
    const old = wr("old", 70, 33);
    expect(valuePlayer(old, 70, curves, 1e6).apy).toBeLessThan(20e6); // growth off: the age discount
    const steady = valuePlayer(old, 70, curves, 1e6, 300e6, { ruleAge: 26, shift: () => 0 });
    expect(steady.apy).toBeCloseTo(20e6, -5);
    expect(steady.years).toBe(termAt(26, 0.5, steady.apy / 300e6));
    const fading = valuePlayer(old, 70, curves, 1e6, 300e6, { ruleAge: 33, shift: (y) => -3 * y });
    expect(fading.years).toBe(1);
    expect(fading.apy).toBeLessThan(steady.apy);
  });
});

describe("cut-down by each team's own judgment (step 13)", () => {
  it("keeps the man its judge prefers; the depth chart stays on today's ratings", () => {
    const t = LEAGUE.teams[0]!;
    const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;
    const man = (id: string, pos: Position, ovr: number, age: number) =>
      ({ ...grown(id, pos, age, { development: false, team: t.id }), attributes: { kind: "true" as const, values: { ovr }, traits: new Set<string>() } });
    const roster: PlayerState[] = [];
    for (const pos of Object.keys(WANTED) as Position[]) for (let i = 0; i < WANTED[pos]; i++) roster.push(man(`${pos}${i}`, pos, 70 - i, 27));
    const vet = man("vet", "WR", 61, 31);
    const kid = man("kid", "WR", 60, 27);
    roster.push(vet, kid);
    const people: LeaguePeople = { teams: [{ ...t, roster: roster.map((p) => p.bio.id), depthChart: {} }], players: roster, picks: [], classes: [], freeAgents: [], contracts: [], deadMoney: [] };
    const input = { season: 2031, rules: { ...DEFAULT_LEAGUE_RULES, rosterLimit: roster.length - 1 }, rate };
    const today = runCutdown(people, input).people.teams[0]!;
    expect(today.roster.map(String)).toContain("vet");
    expect(today.roster.map(String)).not.toContain("kid");
    // Its GM sees the kid growing past the veteran.
    const judged = runCutdown(people, { ...input, rateFor: () => (p: PlayerState) => rate(p) + (String(p.bio.id) === "kid" ? 3 : 0) }).people.teams[0]!;
    expect(judged.roster.map(String)).toContain("kid");
    expect(judged.roster.map(String)).not.toContain("vet");
    expect(judged.depthChart.WR!.map(String).indexOf("kid")).toBe(judged.depthChart.WR!.length - 1);
  });
});

describe("the league year's judge (owner's answer 1a)", () => {
  // Four teams, every deal running out after 2026: re-signing day for 2027.
  const cap = capForecast("cap-seed");
  const rate: Rate = (p) => p.attributes.values["ovr"] ?? 50;
  const teams = LEAGUE.teams.slice(0, 4);
  const players: PlayerState[] = [];
  const contracts: PlayerContract[] = [];
  const rosters = teams.map((t) => {
    const rng = createRng("judge", String(t.id));
    const ids = [];
    for (const pos of Object.keys(WANTED) as Position[]) for (let i = 0; i < WANTED[pos]; i++) {
      const ovr = 55 + rng.int(0, 25) - 4 * i;
      const cs = 1 + rng.int(0, 9);
      const p = { ...grown(`${String(t.id)}-${pos}-${i}`, pos, 22 + cs, { development: false, team: t.id }), attributes: { kind: "true" as const, values: { ovr }, traits: new Set<string>() } };
      players.push(p); ids.push(p.bio.id);
      contracts.push(veteranContract({ player: p.bio.id, team: t.id, season: 2026, signedAt: AT, apy: Math.max(minimumSalary(2026, cs), 25_000 * Math.max(0, ovr - 52) ** 2), years: 1 + rng.int(0, 2), bonusShare: 0.2, guaranteedYears: 1, minimum: (k) => minimumSalary(2026 + k, cs + k) }));
    }
    return { ...t, roster: ids, depthChart: {} };
  });
  const reSignOn = (staff: StaffState[] | undefined, scouting?: (team: TeamId) => number) => {
    const step = leagueYearSteps({ rate, cap, ...(scouting ? { scouting: (team) => scouting(team) } : {}) }).find((s) => s.id === "re-sign")!;
    const people: LeaguePeople = { teams: rosters, players, picks: [], classes: [], freeAgents: [], contracts, deadMoney: [], ...(staff ? { staff } : {}) };
    const ctx = { day: { season: 2026, phase: "OFF_EVAL" as const, week: 3, day: 1 }, season: 2026, seed: "judge", rules: DEFAULT_LEAGUE_RULES, state: { season: 2026, schedule: { season: 2026, games: [] }, results: [], standings: [] }, games: [] };
    return JSON.stringify(step.run(people, ctx as never)?.events ?? []);
  };

  it("grades by the GM's Talent Evaluation when a GM is seated, the head coach's (else 50) when not, as before", () => {
    const gms = teams.map((t) => gmFor(t, 95));
    expect(reSignOn(gms)).toBe(reSignOn(undefined, () => 95));
    expect(reSignOn(gms)).not.toBe(reSignOn(undefined, () => 5));
    expect(reSignOn(undefined)).toBe(reSignOn(undefined, () => 50));
  });
});
