import { describe, it, expect } from "vitest";
import { teamId, type CalendarStamp, type ContractYear, type PlayerContract, type PlayerId } from "@ff/contracts";
import {
  capNumber, prorate, leagueYear, transactionYear, releasePlayer, expireContract, restructure, teamCapTotal, liveIn,
  isTop51Window,
} from "../src/index.js";

// ADR-085 §2: the money rules on hand-written contracts.
const T = teamId("T1");
const p = (n: number) => `P${n}` as PlayerId;
const stamp = (season: number, phase: CalendarStamp["phase"], week = 1): CalendarStamp => ({ season, phase, week, day: 1 });
const yr = (season: number, base: number, prorated: number, extra: Partial<ContractYear> = {}): ContractYear => ({
  season, baseSalary: base, signingBonusProration: prorated, guarantees: { fullyGuaranteed: false }, capHit: 0, ...extra,
});
// A 4-year deal signed for 2026: $20M bonus ($5M a year), base 10/15/20/25, 2026 base guaranteed, $2M roster bonus each year.
const deal = (): PlayerContract => ({
  player: p(1), team: T, signedAt: stamp(2025, "OFF_RESET_FA"), kind: "VETERAN", signingBonus: 20_000_000,
  years: [
    yr(2026, 10e6, 5e6, { guaranteedSalary: 10e6, rosterBonus: 2e6 }),
    yr(2027, 15e6, 5e6, { rosterBonus: 2e6, workoutBonus: 500_000 }),
    yr(2028, 20e6, 5e6, { rosterBonus: 2e6 }),
    yr(2029, 25e6, 5e6, { rosterBonus: 2e6 }),
  ],
});

describe("cap numbers and proration", () => {
  it("a year's cap number adds salary, prorations, bonuses and likely incentives only", () => {
    expect(capNumber(yr(2026, 1e6, 2e6, { optionBonusProration: 3e5, rosterBonus: 4e5, workoutBonus: 1e5, perGameRosterBonus: 51e4, incentives: { likely: 2e5, unlikely: 9e6 } })))
      .toBe(1e6 + 2e6 + 3e5 + 4e5 + 1e5 + 51e4 + 2e5);
  });

  it("a bonus spreads over at most five years and the shares add up exactly", () => {
    expect(prorate(30e6, 6)).toEqual([6e6, 6e6, 6e6, 6e6, 6e6]);
    expect(prorate(10e6, 3)).toEqual([3_333_334, 3_333_333, 3_333_333]);
    expect(prorate(10e6, 3).reduce((a, b) => a + b, 0)).toBe(10e6);
  });

  it("the offseason from the new league year belongs to the next contract season; February cuts count there too", () => {
    expect(leagueYear(stamp(2026, "PLAYOFFS"))).toBe(2026);
    expect(leagueYear(stamp(2026, "OFF_EVAL"))).toBe(2026);
    expect(transactionYear(stamp(2026, "OFF_EVAL"))).toBe(2027);
    expect(leagueYear(stamp(2026, "OFF_RESET_FA"))).toBe(2027);
    expect(leagueYear(stamp(2026, "OFF_SUMMER"))).toBe(2027);
    expect(isTop51Window(stamp(2026, "OFF_DRAFT"))).toBe(true);
    expect(isTop51Window(stamp(2027, "REGULAR_SEASON"))).toBe(false);
  });
});

describe("releasing a player", () => {
  it("before June 1: all bonus left and guaranteed salary land this year; the roster bonus is owed once the league year has opened", () => {
    const r = releasePlayer(deal(), stamp(2025, "OFF_DRAFT")); // league year 2026
    expect(r.charges).toEqual([{ team: T, player: p(1), reason: "RELEASED", season: 2026, amount: 20e6 + 10e6 + 2e6 }]);
    expect(r.contract.ended).toEqual({ at: stamp(2025, "OFF_DRAFT"), reason: "RELEASED" });
    expect(r.events).toEqual([{ type: "PLAYER_RELEASED", payload: { player: p(1), team: T, postJune1: false } }]);
  });

  it("a February cut is processed at the new league year and saves that year's roster bonus", () => {
    const r = releasePlayer(deal(), stamp(2026, "OFF_EVAL")); // counts in 2027
    expect(r.charges).toEqual([{ team: T, player: p(1), reason: "RELEASED", season: 2027, amount: 15e6 }]);
  });

  it("after June 1: this year keeps its own share, the rest lands next year", () => {
    const r = releasePlayer(deal(), stamp(2026, "OFF_SUMMER")); // league year 2027, workout done
    expect(r.charges.map((c) => [c.season, c.amount])).toEqual([[2027, 5e6 + 2e6 + 5e5], [2028, 10e6]]);
    expect(r.contract.ended?.postJune1).toBe(true);
  });

  it("a designated post-June-1 cut in March splits the same way", () => {
    const r = releasePlayer(deal(), stamp(2026, "OFF_RESET_FA"), { designatedPostJune1: true });
    expect(r.charges.map((c) => [c.season, c.amount])).toEqual([[2027, 7e6], [2028, 10e6]]);
  });

  it("a cut in season costs that season's whole cap number and moves the rest to next year", () => {
    const r = releasePlayer(deal(), stamp(2026, "REGULAR_SEASON", 5));
    expect(r.charges.map((c) => [c.season, c.amount])).toEqual([[2026, 17e6], [2027, 15e6]]);
  });

  it("injury-only guarantees are owed only to an injured player", () => {
    const c = deal(); c.years[1] = { ...c.years[1]!, guarantees: { fullyGuaranteed: false, injuryOnly: true } };
    const healthy = releasePlayer(c, stamp(2026, "OFF_EVAL"));
    const hurt = releasePlayer(c, stamp(2026, "OFF_EVAL"), { injured: true });
    expect(hurt.charges[0]!.amount - healthy.charges[0]!.amount).toBe(15e6);
  });

  it("an ended contract no longer counts as a live deal from its transaction year", () => {
    const r = releasePlayer(deal(), stamp(2026, "OFF_EVAL"));
    expect(liveIn(r.contract, 2026)).toBe(true);
    expect(liveIn(r.contract, 2027)).toBe(false);
    expect(() => releasePlayer(r.contract, stamp(2026, "OFF_DRAFT"))).toThrow();
  });
});

describe("expiry and void years", () => {
  it("a deal runs out at the league year after its last real year; void years' bonus lands as dead money then", () => {
    const c: PlayerContract = { ...deal(), years: [yr(2026, 1e6, 4e6), yr(2027, 0, 4e6, { voidYear: true }), yr(2028, 0, 4e6, { voidYear: true })] };
    expect(expireContract(c, 2026, stamp(2025, "OFF_RESET_FA"))).toBeNull();
    const e = expireContract(c, 2027, stamp(2026, "OFF_RESET_FA"))!;
    expect(e.contract.ended?.reason).toBe("VOIDED");
    expect(e.charges).toEqual([{ team: T, player: p(1), season: 2027, amount: 8e6, reason: "VOIDED" }]);
    expect(e.events[0]!.type).toBe("CONTRACT_EXPIRED");
    const plain = expireContract({ ...deal(), years: [yr(2026, 1e6, 0)] }, 2027, stamp(2026, "OFF_RESET_FA"))!;
    expect(plain.contract.ended?.reason).toBe("EXPIRED");
    expect(plain.charges).toEqual([]);
  });
});

describe("restructures", () => {
  it("turning base salary into bonus saves this year and pushes money to later years", () => {
    const before = deal();
    const { contract, events } = restructure(before, 2027, 12e6, { floor: 1_215_000 });
    // 12M over 2027-2029 = 4M a year: 2027 drops from 22.5M to 14.5M.
    expect(contract.years.map((y) => y.capHit)).toEqual([17e6, 14.5e6, 31e6, 36e6]);
    expect(contract.years[2]!.signingBonusProration).toBe(5e6 + 4e6);
    expect(contract.signingBonus).toBe(32e6);
    expect(events).toEqual([{ type: "CONTRACT_RESTRUCTURED", payload: { player: p(1) } }]);
  });

  it("void years spread the bonus thinner, and the floor keeps the minimum", () => {
    const { contract } = restructure(deal(), 2028, 15e6, { addVoidYears: 3 });
    expect(contract.years.filter((y) => y.voidYear).map((y) => y.season)).toEqual([2030, 2031, 2032]);
    expect(contract.years.find((y) => y.season === 2028)!.signingBonusProration).toBe(5e6 + 3e6);
    expect(contract.years.find((y) => y.season === 2032)!.signingBonusProration).toBe(3e6);
    expect(() => restructure(deal(), 2027, 15e6, { floor: 1e6 })).toThrow();
  });
});

describe("a team's cap total", () => {
  it("counts live deals and dead money; in the top-51 window only the 51 biggest numbers count", () => {
    const many: PlayerContract[] = Array.from({ length: 53 }, (_, i) => ({
      player: p(100 + i), team: T, signedAt: stamp(2025, "OFF_RESET_FA"), years: [yr(2026, (i + 1) * 1e6, 0)],
    }));
    const other: PlayerContract = { ...many[0]!, player: p(999), team: teamId("T2") };
    const dead = [{ team: T, player: p(1), season: 2026, amount: 7e6, reason: "RELEASED" as const }];
    const all = teamCapTotal(T, 2026, [...many, other], dead);
    expect(all).toEqual({ contracts: 1431e6, dead: 7e6, total: 1438e6, counted: 53 });
    const top = teamCapTotal(T, 2026, many, dead, { top51: true });
    expect(top.counted).toBe(51);
    expect(top.contracts).toBe(1431e6 - 1e6 - 2e6);
  });
});
