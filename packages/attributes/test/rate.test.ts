import { describe, it, expect } from "vitest";
import { playerId, type PlayerState, type Position } from "@ff/contracts";
import { normalScores, probit, rateStandIns, standings, trackingScores, type Signals, type TrackingRow } from "../src/importer/real/index.js";
import { overallAt } from "../src/fictional/generate.js";

const sig = (s: Partial<Signals>): Signals => ({ rookieDeal: false, yearsInLeague: 5, ...s });

describe("ranking helpers", () => {
  it("probit inverts the normal CDF", () => {
    expect(probit(0.5)).toBeCloseTo(0, 9);
    expect(probit(0.975)).toBeCloseTo(1.959964, 5);
    expect(probit(0.01)).toBeCloseTo(-2.326348, 5);
  });
  it("normalScores ranks, and ties share a score", () => {
    const z = normalScores([3, 1, 2, 2]);
    expect(z[1]).toBeLessThan(z[2]!);
    expect(z[2]).toBe(z[3]);
    expect(z[0]).toBeGreaterThan(z[2]!);
  });
});

describe("standings (ADR-088 R3)", () => {
  it("ranks within the position group: a well-paid starter above a cheap backup", () => {
    const s = standings([
      { id: "a", position: "QB", signals: sig({ capShare: 0.2, snapShare: 0.95, depthRank: 1, pick: 3 }) },
      { id: "b", position: "QB", signals: sig({ capShare: 0.01, snapShare: 0.05, depthRank: 2, pick: 150 }) },
      { id: "c", position: "QB", signals: sig({ capShare: 0.05, snapShare: 0.5, depthRank: 2 }) },
    ]);
    expect(s.get("a")!.talent).toBeGreaterThan(s.get("c")!.talent);
    expect(s.get("c")!.talent).toBeGreaterThan(s.get("b")!.talent);
    expect(s.get("a")!.sources).toEqual(["pay", "draft", "snaps", "depth"]);
    expect(s.get("c")!.sources).toEqual(["pay", "snaps", "depth"]); // undrafted: ranked, not named
  });

  it("pulls a player with few signals toward the middle (a rookie is not judged on his slot alone)", () => {
    const players = [
      { id: "rookie", position: "WR" as Position, signals: sig({ rookieDeal: true, yearsInLeague: 0, pick: 1 }) },
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `v${i}`, position: "WR" as Position,
        signals: sig({ capShare: 0.01 * (i + 1), snapShare: 0.1 * (i + 1), depthRank: 9 - i, pick: 20 * (i + 1) }),
      })),
    ];
    const s = standings(players);
    expect(s.get("rookie")!.talent).toBeLessThan(s.get("v8")!.talent);
  });

  it("ranks the groups separately: a guard is not compared with a quarterback", () => {
    const s = standings([
      { id: "q", position: "QB", signals: sig({ capShare: 0.2 }) },
      { id: "g", position: "LG", signals: sig({ capShare: 0.01 }) },
    ]);
    expect(s.get("q")!.talent).toBe(s.get("g")!.talent);
  });
});

describe("tracking (ADR-088 R3b)", () => {
  const players = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, position: "WR" as Position, gsis: `g${i}`, pfr: `p${i}` }));
  const rows = (vol: (i: number) => number): Record<string, TrackingRow[]> => ({
    ngsPass: [], ngsRush: [], pfrPass: [], pfrRush: [], pfrDef: [], pfrRec: [],
    ngsRec: players.map((p, i) => ({ id: p.gsis, season: 2025, values: { avg_separation: 2 + i * 0.2, targets: vol(i), avg_yac_above_expectation: null, receptions: null } })),
  });

  it("scores the measure within the group and points it at its ratings", () => {
    const t = trackingScores(players, rows(() => 100) as never);
    expect(t.get("w9")!.nudges.routeRunning).toBeGreaterThan(0);
    expect(t.get("w0")!.nudges.routeRunning).toBeLessThan(0);
    expect(t.get("w9")!.measures).toEqual(["separation"]);
  });

  it("shrinks a small sample and ignores one below the minimum", () => {
    const big = trackingScores(players, rows(() => 200) as never).get("w9")!.play!;
    const small = trackingScores(players, rows(() => 20) as never).get("w9")!.play!;
    expect(small).toBeLessThan(big);
    expect(trackingScores(players, rows((i) => (i === 9 ? 5 : 100)) as never).get("w9")).toBeUndefined();
  });
});

describe("rateStandIns (ADR-088 R3)", () => {
  const player = (id: string, position: Position): PlayerState => ({
    bio: { id: playerId(id), displayName: id, position, age: 26, heightIn: 72, weightLb: 200, draft: "UDFA" },
    attributes: { kind: "true", values: {}, traits: new Set() }, condition: { stamina: 100, morale: 0 },
    personality: { needs: {}, type: "quiet" },
  });
  const players = [player("a", "CB"), player("b", "CB"), player("c", "CB")];
  const input = {
    seed: "t", players,
    measurements: { a: { heightIn: 72, weightLb: 195, forty: 4.35, bench: 15, vertical: 40, cone: 6.8 }, b: { heightIn: 72, weightLb: 195, forty: 4.6 }, c: { heightIn: 72, weightLb: 195 } },
    signals: { a: sig({ capShare: 0.1, snapShare: 1, depthRank: 1 }), b: sig({ capShare: 0.02, snapShare: 0.5, depthRank: 2 }), c: sig({}) },
  };

  it("pins body ratings to the combine and marks the drills it filled in", () => {
    const r = rateStandIns(input);
    const [a, b, c] = r.players;
    expect(a!.attributes.values.speed).toBeGreaterThan(b!.attributes.values.speed!);
    expect(r.ratings.a!.imputed).toEqual([]);
    expect(r.ratings.b!.imputed).toEqual(["bench", "vertical", "cone"]);
    // c ran no forty: he takes his position's average of those who did.
    expect(c!.attributes.values.speed).toBe(Math.round(((5.6 - 4.475) / (5.6 - 4.22)) * 99));
    expect(r.ratings.c!.skill).toBe("guess");
    expect(overallAt("CB", a!.attributes.values)).toBeGreaterThan(overallAt("CB", c!.attributes.values));
  });

  it("gives every player every active rating, deterministically, and applies nudges", () => {
    const r = rateStandIns(input);
    expect(Object.keys(r.players[0]!.attributes.values).length).toBeGreaterThan(50);
    expect(JSON.stringify(rateStandIns(input).players.map((p) => p.attributes.values))).toBe(JSON.stringify(r.players.map((p) => p.attributes.values)));
    const nudged = rateStandIns({ ...input, nudges: { a: { manCoverage: 1 } } });
    expect(nudged.players[0]!.attributes.values.manCoverage).toBe(Math.min(99, r.players[0]!.attributes.values.manCoverage! + 8));
  });
});
