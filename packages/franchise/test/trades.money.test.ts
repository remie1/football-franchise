import { describe, it, expect } from "vitest";
import { teamId, type CalendarStamp, type ContractYear, type PlayerContract, type PlayerId } from "@ff/contracts";
import { capNumber, releasePlayer, salaryLeft, teamCapTotal, tradePlayer, tradeWindowOpen, tradeableDrafts } from "../src/index.js";

// ADR-095 §1: the money of a trade, on hand-written contracts (the same deal cap.money.test.ts cuts).
const A = teamId("T1"), B = teamId("T2");
const p = (n: number) => `P${n}` as PlayerId;
const stamp = (season: number, phase: CalendarStamp["phase"], week = 1, day = 1): CalendarStamp => ({ season, phase, week, day });
const yr = (season: number, base: number, prorated: number, extra: Partial<ContractYear> = {}): ContractYear => ({
  season, baseSalary: base, signingBonusProration: prorated, guarantees: { fullyGuaranteed: false }, capHit: 0, ...extra,
});
// A 4-year deal for 2026-2029: $20M bonus ($5M a year), base 10/15/20/25, 2026 base guaranteed, $2M roster bonus each year.
const deal = (): PlayerContract => ({
  player: p(1), team: A, signedAt: stamp(2025, "OFF_RESET_FA"), kind: "VETERAN", signingBonus: 20_000_000,
  years: [
    yr(2026, 10e6, 5e6, { guaranteedSalary: 10e6, rosterBonus: 2e6 }),
    yr(2027, 15e6, 5e6, { rosterBonus: 2e6, workoutBonus: 500_000 }),
    yr(2028, 20e6, 5e6, { rosterBonus: 2e6 }),
    yr(2029, 25e6, 5e6, { rosterBonus: 2e6 }),
  ],
});
const sum = (xs: { change: number }[]) => xs.reduce((s, x) => s + x.change, 0);

describe("trade money (ADR-095 §1)", () => {
  it("in the regular season the receiver takes the cheques left and every later year, and no bonus", () => {
    const at = stamp(2026, "REGULAR_SEASON", 10, 2); // deadline day: 9 of 18 weeks paid
    expect(salaryLeft(at)).toBe(0.5);
    const r = tradePlayer(deal(), B, at);
    expect(r.received.team).toBe(B);
    expect(r.received.signingBonus).toBeUndefined();
    expect(r.received.years.map((y) => [y.season, y.baseSalary, y.signingBonusProration, y.rosterBonus ?? 0]))
      .toEqual([[2026, 5e6, 0, 0], [2027, 15e6, 0, 2e6], [2028, 20e6, 0, 2e6], [2029, 25e6, 0, 2e6]]);
    expect(r.received.years[0]!.guaranteedSalary).toBe(5e6);
    expect(r.received.years.every((y) => y.capHit === capNumber(y))).toBe(true);
  });

  it("the sender keeps what it paid and its bonus share, and the later shares accelerate (after June 1: next season)", () => {
    const r = tradePlayer(deal(), B, stamp(2026, "REGULAR_SEASON", 10, 2));
    // 2026: $5M proration + $2M roster bonus + $5M of cheques paid; 2027: the 2027-2029 shares, $15M.
    expect(r.charges).toEqual([
      { team: A, player: p(1), reason: "TRADED", season: 2026, amount: 12e6 },
      { team: A, player: p(1), reason: "TRADED", season: 2027, amount: 15e6 },
    ]);
    expect(r.sent.ended).toEqual({ at: stamp(2026, "REGULAR_SEASON", 10, 2), reason: "TRADED", postJune1: true });
  });

  it("before June 1 every later share lands now; the receiver pays this year's workout bonus", () => {
    const c = deal();
    const at = stamp(2026, "OFF_DRAFT", 2); // league year 2027, before June 1
    const r = tradePlayer(c, B, at);
    // 2027 sender: its $5M share + the $2M roster bonus paid at the new league year + 2028-2029 shares $10M.
    expect(r.charges).toEqual([{ team: A, player: p(1), reason: "TRADED", season: 2027, amount: 17e6 }]);
    expect(r.received.years.map((y) => y.season)).toEqual([2027, 2028, 2029]);
    expect(r.received.years[0]).toMatchObject({ baseSalary: 15e6, workoutBonus: 500_000, signingBonusProration: 0 });
    expect(r.received.years[0]!.rosterBonus).toBeUndefined();
  });

  it("nothing is lost or made: each season the two caps' changes add up to the moved bonus timing only", () => {
    const c = deal();
    const at = stamp(2026, "OFF_DRAFT", 2);
    const r = tradePlayer(c, B, at);
    const before = [2027, 2028, 2029].reduce((s, season) => s + capNumber(c.years.find((y) => y.season === season)!), 0);
    const afterSender = r.charges.reduce((s, d) => s + d.amount, 0);
    const afterReceiver = r.received.years.reduce((s, y) => s + capNumber(y), 0);
    expect(afterSender + afterReceiver).toBe(before);
    expect(sum(r.capMoves)).toBe(0);
    // The cap totals agree with the moves.
    const contracts = [r.sent, r.received];
    expect(teamCapTotal(A, 2027, contracts, r.charges).total).toBe(17e6);
    expect(teamCapTotal(B, 2027, contracts, r.charges).total).toBe(15e6 + 2e6 + 500_000 - 2e6);
  });

  it("the sender's dead money is the same as a cut's, less the guaranteed salary the receiver now owes", () => {
    const at = stamp(2026, "OFF_DRAFT", 2);
    const cut = releasePlayer(deal(), at).charges.reduce((s, d) => s + d.amount, 0);
    const traded = tradePlayer(deal(), B, at).charges.reduce((s, d) => s + d.amount, 0);
    expect(cut - traded).toBe(0); // 2027-2029 carry no guaranteed salary in this deal
  });

  it("refuses an ended contract or a trade to his own team", () => {
    const at = stamp(2026, "OFF_DRAFT", 2);
    expect(() => tradePlayer(tradePlayer(deal(), B, at).sent, B, at)).toThrow();
    expect(() => tradePlayer(deal(), A, at)).toThrow();
  });
});

describe("the trade window (ADR-095 §1, §4b)", () => {
  it("opens at the new league year and closes after the deadline until the next one", () => {
    expect(tradeWindowOpen(stamp(2026, "OFF_RESET_FA"))).toBe(true);
    expect(tradeWindowOpen(stamp(2026, "TRAINING_CAMP"))).toBe(true);
    expect(tradeWindowOpen(stamp(2026, "REGULAR_SEASON", 10, 2))).toBe(true);
    expect(tradeWindowOpen(stamp(2026, "REGULAR_SEASON", 10, 3))).toBe(false);
    expect(tradeWindowOpen(stamp(2026, "PLAYOFFS"))).toBe(false);
    expect(tradeWindowOpen(stamp(2026, "OFF_EVAL"))).toBe(false);
  });

  it("three drafts trade, four on draft day (owner's ruling 2026-11-07)", () => {
    expect(tradeableDrafts(stamp(2026, "REGULAR_SEASON", 9))).toEqual([2027, 2028, 2029]);
    expect(tradeableDrafts(stamp(2026, "OFF_DRAFT", 3, 3))).toEqual([2027, 2028, 2029]);
    expect(tradeableDrafts(stamp(2026, "OFF_DRAFT", 3, 4))).toEqual([2027, 2028, 2029, 2030]);
    expect(tradeableDrafts(stamp(2026, "OFF_DRAFT", 3, 5))).toEqual([2028, 2029, 2030]);
    expect(tradeableDrafts(stamp(2026, "OFF_SUMMER"))).toEqual([2028, 2029, 2030]);
    expect(tradeableDrafts(stamp(2027, "TRAINING_CAMP"))).toEqual([2028, 2029, 2030]);
  });
});
