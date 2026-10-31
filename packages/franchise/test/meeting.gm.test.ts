/**
 * ADR-081 M2: the GM and his report.
 */
import { describe, expect, it } from "vitest";
import { createRng, type PlayerContract, type StaffState } from "@ff/contracts";
import {
  DIFFICULTY, GRADES, POINTS, certaintyOf, gmReport, gradeOdds, leagueTruth, makeGm, pointSkill, rollGrade, runSeason,
  volunteerChance, type GameResolver,
} from "../src/index.js";
import { startingPeople } from "./playersWorld.js";

const people = startingPeople();
const fake: GameResolver = (game, seed) => {
  const rng = createRng(seed, "gm-game");
  const homeScore = rng.int(0, 6) * 7 + rng.int(0, 3), awayScore = rng.int(0, 6) * 7 + rng.int(0, 3);
  return { gameId: game.gameId, home: game.home, away: game.away, homeScore, awayScore, reason: homeScore === awayScore ? "TIE" : "REGULATION", seed };
};
const { league } = await import("./playersWorld.js");
const run = runSeason({ league, season: 2027, seed: "gm", resolve: fake });
// Contracts: each player's deal ends between 2027 and 2030, from his id.
const contracts: PlayerContract[] = people.players.filter((p) => p.teamId !== undefined).map((p) => {
  const last = 2027 + createRng("deal", String(p.bio.id)).int(0, 3);
  return {
    player: p.bio.id, team: p.teamId!, signedAt: { season: 2026, phase: "OFF_EVAL", week: 1, day: 1 },
    years: Array.from({ length: last - 2025 }, (_, i) => ({ season: 2026 + i, baseSalary: 1e6, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: 1e6 })),
  };
});
const truths = leagueTruth({ teams: people.teams, players: people.players, contracts, state: run.state });
const withSkill = (gm: StaffState, v: number): StaffState => ({ ...gm, attributes: Object.fromEntries(Object.keys(gm.attributes).map((k) => [k, v])) });

describe("the grade roll", () => {
  it("hits ADR-081's target rates at the anchors", () => {
    const pct = (xs: number[]) => xs.map((x) => Math.round(x * 100));
    expect(pct(gradeOdds(85, 0))).toEqual([80, 15, 4, 1]);
    expect(pct(gradeOdds(50, 1))).toEqual([25, 30, 28, 17]);
    expect(pct(gradeOdds(25, 0))).toEqual([35, 30, 22, 13]);
  });

  it("is sharper with more skill and on easier points", () => {
    expect(gradeOdds(70, 0)[0]!).toBeGreaterThan(gradeOdds(40, 0)[0]!);
    expect(gradeOdds(50, 0)[0]!).toBeGreaterThan(gradeOdds(50, 1.25)[0]!);
    for (const s of [1, 25, 50, 85, 99]) for (const d of [0, 0.5, 1, 1.25]) {
      const o = gradeOdds(s, d);
      expect(o.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      for (const x of o) expect(x).toBeGreaterThan(0);
    }
  });

  it("rolls the odds it states", () => {
    const rng = createRng("grades", "t");
    const n = 20000;
    const counts = Object.fromEntries(GRADES.map((g) => [g, 0]));
    for (let i = 0; i < n; i++) counts[rollGrade(50, 0, rng)]!++;
    gradeOdds(50, 0).forEach((p, i) => expect(Math.abs(counts[GRADES[i]!]! / n - p)).toBeLessThan(0.015));
  });
});

describe("the GM", () => {
  const team = people.teams[0]!;
  const gm = makeGm(team, "gm-seed");

  it("sits on his team, made from the team's own dice", () => {
    expect(gm.role).toBe("GM");
    expect(gm.teamId).toBe(team.id);
    expect(makeGm(team, "gm-seed")).toEqual(gm);
    expect(makeGm(people.teams[1]!, "gm-seed").attributes).not.toEqual(gm.attributes);
    for (const id of ["performanceAnalysis", "forecasting", "capManagement", "marketSense", "nuance"]) expect(gm.attributes[id]).toBeGreaterThan(0);
  });

  it("reads a point with that point's mix of his skills", () => {
    const s = { ...gm, attributes: { ...gm.attributes, performanceAnalysis: 90, forecasting: 40 } };
    expect(pointSkill(s, "LUCK")).toBeCloseTo(0.8 * 90 + 0.2 * 40, 9);
  });
});

describe("his report", () => {
  const team = people.teams[3]!;
  const truth = truths[3]!;
  const gm = makeGm(team, "gm-seed");
  const takes = gmReport({ gm, truth, seed: "s" });

  it("speaks to all nine points in order, the same from the same seed", () => {
    expect(takes.map((t) => t.claim.point)).toEqual(POINTS);
    expect(gmReport({ gm, truth, seed: "s" })).toEqual(takes);
    expect(gmReport({ gm, truth, seed: "other" })).not.toEqual(takes);
  });

  it("is right when sharp: a perfect GM repeats the truth", () => {
    const perfect = withSkill(gm, 99);
    let sharp = 0;
    for (let k = 0; k < 40; k++) {
      for (const t of gmReport({ gm: perfect, truth, seed: `p${k}` })) {
        if (t.grade !== "SHARP") continue;
        sharp++;
        const c = t.claim;
        if (c.point === "LUCK") expect(c.verdict).toBe(truth.luck.verdict);
        if (c.point === "WINDOW") expect(c.direction).toBe(truth.window);
        if (c.point === "HOLES") expect(c.groups).toEqual(Object.entries(truth.groupsNext).sort((a, b) => a[1]! - b[1]! || (a[0] < b[0] ? -1 : 1)).slice(0, 3).map(([g]) => g));
        if (c.point === "LOSSES") expect(c.players).toEqual(truth.losses.slice(0, 3));
        if (c.point === "NEXT_WINS") expect(Math.abs(c.wins! - truth.winsNext)).toBeLessThanOrEqual(1.25);
      }
    }
    expect(sharp).toBeGreaterThan(200);
  });

  it("is sharper as a whole when his skills are better", () => {
    const share = (v: number) => {
      let s = 0, n = 0;
      for (let k = 0; k < 60; k++) for (const t of gmReport({ gm: withSkill(gm, v), truth, seed: `k${k}` })) { n++; if (t.grade === "SHARP") s++; }
      return s / n;
    };
    expect(share(85)).toBeGreaterThan(share(50) + 0.1);
    expect(share(50)).toBeGreaterThan(share(25) + 0.08);
  });

  it("with nuance, says how sure he is fairly and often; without it, too sure and seldom", () => {
    const rng = createRng("certainty", "t");
    const mean = (g: "SHARP" | "MISS", n: number) => { let s = 0; for (let i = 0; i < 500; i++) s += certaintyOf(g, n, rng); return s / 500; };
    expect(mean("SHARP", 95) - mean("MISS", 95)).toBeGreaterThan(45);
    expect(mean("SHARP", 10) - mean("MISS", 10)).toBeLessThan(10);
    expect(mean("MISS", 10)).toBeGreaterThan(70);
    expect(volunteerChance(90)).toBeGreaterThan(volunteerChance(20) + 0.5);
  });

  it("rates hard points as hard", () => {
    expect(DIFFICULTY.LUCK).toBeLessThan(DIFFICULTY.NEXT_WINS);
    expect(DIFFICULTY.WINDOW).toBe(1.25);
  });
});

describe("the truth", () => {
  it("covers every team, with wins that add to about half the league's games", () => {
    expect(truths).toHaveLength(32);
    const total = truths.reduce((s, t) => s + t.winsNext, 0);
    expect(total / 32).toBeCloseTo(8.5, 0);
    for (const t of truths) {
      expect(t.losses.length).toBe(t.projection.expiring.length);
      expect(["CONTEND", "RETOOL", "REBUILD"]).toContain(t.window);
    }
  });
});
