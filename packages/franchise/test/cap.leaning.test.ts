import { describe, it, expect } from "vitest";
import { playerId, staffId, type PlayerContract, type PlayerState, type StaffState, type TeamId } from "@ff/contracts";
import {
  CAP_LEANING, buildLeague, capLeaning, capPlan, floorShortfall, marketCurves, planWithFloor, quantile, teamCapPlan, veteranContract,
} from "../src/index.js";

// ADR-085 step 10: how a front office plans its cap room (owner's Q1-Q3, 2026-10-31).
const league = buildLeague("world-1");
const team = league.teams[0]!.id;
const at = { season: 2025, phase: "OFF_RESET_FA" as const, week: 1, day: 1 };

function president(id: string, teamId: TeamId, leaning?: number): StaffState {
  return {
    id: staffId(id), displayName: `P ${id}`, role: "PRESIDENT", age: 55, teamId,
    attributes: leaning === undefined ? {} : { [CAP_LEANING]: leaning },
    lineage: [], personalityType: "quiet", career: [],
  } as unknown as StaffState;
}

describe("cap leaning (step 10)", () => {
  it("win now keeps $5M, rolls over a quarter and restructures for all its March room; flexible the other end", () => {
    expect(capPlan(0)).toEqual({ cushion: 5_000_000, lookAhead: 0.25, marchRoom: 1, voidYears: true });
    expect(capPlan(100)).toEqual({ cushion: 10_000_000, lookAhead: 1, marchRoom: 0.5, voidYears: false });
    expect(capPlan(50).cushion).toBe(7_500_000);
    // Step 11: only win-now teams (33 and under) add void years.
    expect(capPlan(33).voidYears).toBe(true);
    expect(capPlan(50).voidYears).toBe(false);
  });

  it("the team president holds it; a team with none plans from the middle", () => {
    expect(teamCapPlan(team, [president("p1", team, 0)])).toEqual(capPlan(0));
    expect(teamCapPlan(team, undefined)).toEqual(capPlan(50));
    expect(teamCapPlan(team, [{ ...president("p2", team, 0), retiredAfter: 2025 } as StaffState])).toEqual(capPlan(50));
  });

  it("a president made before step 10 draws his from who he is: the same every time, spread across 0-100", () => {
    const drawn = Array.from({ length: 300 }, (_, i) => capLeaning(president(`old${i}`, team)));
    expect(capLeaning(president("old7", team))).toBe(drawn[7]);
    expect(drawn.filter((l) => l < 34).length).toBeGreaterThan(70);
    expect(drawn.filter((l) => l > 66).length).toBeGreaterThan(70);
  });
});

describe("the spending floor (step 10, CBA Art. 12)", () => {
  const cap = () => 100_000_000;
  const deal = (apy: number, season: number, years: number): PlayerContract =>
    veteranContract({ player: playerId(`x${apy}${season}`), team, season, signedAt: at, apy, years, bonusShare: 0, guaranteedYears: 0, minimum: () => 1e6 });

  it("a team that spent 89% a year is level; one that spent less must make it up", () => {
    expect(floorShortfall(team, 2028, [deal(89e6, 2026, 1), deal(89e6, 2027, 1)], [], cap, 2026)).toBeCloseTo(0, -3);
    // 70% in 2026 and 2027: 38% short over the window (19 points a year).
    expect(floorShortfall(team, 2028, [deal(70e6, 2026, 1), deal(70e6, 2027, 1)], [], cap, 2026)).toBeCloseTo(38e6, -5);
    // Seasons before the window's start never count.
    expect(floorShortfall(team, 2028, [deal(70e6, 2026, 1), deal(70e6, 2027, 1)], [], cap, 2028)).toBeCloseTo(0, -3);
  });

  it("only four league years count", () => {
    const old = deal(10e6, 2020, 4); // short years, all before the window
    expect(floorShortfall(team, 2028, [old, deal(89e6, 2025, 1), deal(89e6, 2026, 1), deal(89e6, 2027, 1)], [], cap, 2020)).toBeCloseTo(0, -3);
  });

  it("a team behind the floor spends like a win-now team, keeping its cushion", () => {
    const flexible = capPlan(100);
    expect(planWithFloor(flexible, 0)).toEqual(flexible);
    expect(planWithFloor(flexible, 1e6)).toEqual({ ...capPlan(0), cushion: flexible.cushion });
  });
});

describe("the market's price list (step 10, the middle class)", () => {
  it("counts last season's deals too, each player once on his latest", () => {
    const p = (id: string, ovr: number): PlayerState => ({
      bio: { id: playerId(id), displayName: id, position: "WR", age: 27, heightIn: 74, weightLb: 200, draft: "UDFA", creditedSeasons: 5 },
      attributes: { kind: "true", values: { ovr }, traits: new Set<string>() },
      condition: { stamina: 100, morale: 0 }, personality: { needs: {}, type: "quiet" },
    }) as PlayerState;
    const ps = [p("a", 60), p("b", 70)];
    const mk = (pl: PlayerState, apy: number, season: number) =>
      veteranContract({ player: pl.bio.id, team, season, signedAt: { ...at, season: season - 1 }, apy, years: 1, bonusShare: 0, guaranteedYears: 0, minimum: () => 1e6 });
    // a's one-year deal ran out last season; b has two, the later one counts.
    const cs = [mk(ps[0]!, 2e6, 2026), mk(ps[1]!, 4e6, 2026), mk(ps[1]!, 6e6, 2027)];
    const apys = marketCurves(cs, ps, 2027, (x) => x.attributes.values["ovr"] ?? 50).get("WR")!.apys;
    expect(apys.length).toBe(2);
    expect(quantile(apys, 1)).toBeCloseTo(6e6, -4);
  });
});
