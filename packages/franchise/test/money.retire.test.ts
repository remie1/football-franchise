import { describe, it, expect } from "vitest";
import { teamId, type CalendarStamp, type ContractYear, type DeadMoneyCharge, type PlayerContract, type PlayerId } from "@ff/contracts";
import { OWN_MOMENTS, capNumber, liveIn, releasePlayer, retire, teamCapTotal, type OwnTiming } from "../src/index.js";

// ADR-087 §12.4.4 (AB8) and the money thread's answer to M1 (§12.11): a man who retires forfeits his
// salary, guaranteed or not; only the proration not yet counted (option bonus included) accelerates,
// split at June 1; no clawback; no PLAYER_RELEASED. Same hand-written deal as `cap.money.test.ts`.
const T = teamId("T1");
const p = (n: number) => `P${n}` as PlayerId;
const stamp = (season: number, phase: CalendarStamp["phase"], week = 1, day = 1): CalendarStamp => ({ season, phase, week, day });
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
// The three own-choice moments of the 2026 season's year (§12.4.2): LATE is the 2027 camp.
const at = (t: OwnTiming): CalendarStamp => {
  const m = OWN_MOMENTS[t];
  return stamp(t === "LATE" ? 2027 : 2026, m.phase, m.week, m.day);
};
const years = (charges: readonly DeadMoneyCharge[]) => charges.map((c) => [c.season, c.amount]);

describe("retiring: each moment books the right years", () => {
  it("IMMEDIATE (OFF_EVAL week 1 day 7) books into the next league year, all of it before June 1", () => {
    const r = releasePlayer(deal(), at("IMMEDIATE"), { reason: "RETIRED" });
    expect(r.charges).toEqual([{ team: T, player: p(1), reason: "RETIRED", season: 2027, amount: 5e6 + 10e6 }]);
    expect(r.contract.ended).toEqual({ at: at("IMMEDIATE"), reason: "RETIRED" });
  });

  it("SLOW (OFF_RESET_FA week 1 day 2) books in the new league year before June 1, and owes no roster bonus", () => {
    const r = releasePlayer(deal(), at("SLOW"), { reason: "RETIRED" });
    expect(years(r.charges)).toEqual([[2027, 15e6]]);
    // A release that day owes the 2027 roster bonus (the league year has opened); a retirement forfeits it.
    expect(years(releasePlayer(deal(), at("SLOW")).charges)).toEqual([[2027, 17e6]]);
  });

  it("LATE (camp) falls after June 1: this year's share now, the rest next year, no salary or bonus", () => {
    const r = releasePlayer(deal(), at("LATE"), { reason: "RETIRED" });
    expect(years(r.charges)).toEqual([[2027, 5e6], [2028, 10e6]]);
    expect(r.contract.ended).toEqual({ at: at("LATE"), reason: "RETIRED", postJune1: true });
    // A camp cut keeps the roster and workout bonus; a retirement forfeits them.
    expect(years(releasePlayer(deal(), at("LATE")).charges)).toEqual([[2027, 5e6 + 2e6 + 5e5], [2028, 10e6]]);
  });

  it("the salary is forfeited, guaranteed or not, injury-only guarantees too", () => {
    const c = deal();
    c.years[1] = { ...c.years[1]!, guaranteedSalary: 15e6 };
    c.years[2] = { ...c.years[2]!, guarantees: { fullyGuaranteed: false, injuryOnly: true } };
    expect(years(releasePlayer(c, at("IMMEDIATE")).charges)).toEqual([[2027, 30e6]]);
    expect(years(releasePlayer(c, at("IMMEDIATE"), { reason: "RETIRED" }).charges)).toEqual([[2027, 15e6]]);
    expect(years(releasePlayer(c, at("IMMEDIATE"), { reason: "RETIRED", injured: true }).charges)).toEqual([[2027, 15e6]]);
  });

  it("the option bonus's proration and void years' proration accelerate with the signing bonus's", () => {
    const c = deal();
    c.years[2] = { ...c.years[2]!, optionBonusProration: 3e6 };
    c.years.push(yr(2030, 0, 4e6, { voidYear: true }));
    expect(years(releasePlayer(c, at("SLOW"), { reason: "RETIRED" }).charges)).toEqual([[2027, 5e6 + 5e6 + 3e6 + 5e6 + 4e6]]);
    expect(years(releasePlayer(c, at("LATE"), { reason: "RETIRED" }).charges)).toEqual([[2027, 5e6], [2028, 5e6 + 3e6 + 5e6 + 4e6]]);
  });

  it("the split is by the date alone: a release's post-June-1 designation is not read", () => {
    const plain = releasePlayer(deal(), at("SLOW"), { reason: "RETIRED" });
    const designated = releasePlayer(deal(), at("SLOW"), { reason: "RETIRED", designatedPostJune1: true });
    expect(designated).toEqual(plain);
  });

  it("a deal with no proration left costs nothing", () => {
    const c: PlayerContract = { ...deal(), signingBonus: 0, years: deal().years.map((y) => ({ ...y, signingBonusProration: 0 })) };
    const r = releasePlayer(c, at("IMMEDIATE"), { reason: "RETIRED" });
    expect(r.charges).toEqual([]);
    expect(r.contract.ended?.reason).toBe("RETIRED");
  });
});

describe("retire(): the book", () => {
  it("ends his live deal RETIRED and books its charges to the dead money", () => {
    const book = [deal()];
    const dead: DeadMoneyCharge[] = [];
    const r = retire(book, dead, p(1), T, at("IMMEDIATE"));
    expect(book[0]!.ended).toEqual({ at: at("IMMEDIATE"), reason: "RETIRED" });
    expect(dead).toEqual(r.charges);
    expect(years(dead)).toEqual([[2027, 15e6]]);
    expect(dead.every((d) => d.reason === "RETIRED" && d.team === T)).toBe(true);
  });

  it("a man with a later deal with the same team ends both, and both deals' proration accelerates", () => {
    const extension: PlayerContract = {
      player: p(1), team: T, signedAt: stamp(2026, "REGULAR_SEASON", 4), kind: "VETERAN", signingBonus: 6e6,
      years: [yr(2030, 30e6, 3e6, { guaranteedSalary: 30e6 }), yr(2031, 30e6, 3e6)],
    };
    const other: PlayerContract = { ...deal(), player: p(2) };
    const book = [deal(), extension, other];
    const dead: DeadMoneyCharge[] = [];
    const r = retire(book, dead, p(1), T, at("LATE"));
    expect(book[0]!.ended?.reason).toBe("RETIRED");
    expect(book[1]!.ended?.reason).toBe("RETIRED");
    expect(book[2]!.ended).toBeUndefined();
    // The first deal: 5M now and 10M next year; the extension: all 6M next year (none of it is 2027's).
    expect(years(r.charges)).toEqual([[2027, 5e6], [2028, 10e6], [2028, 6e6]]);
    expect(dead).toEqual(r.charges);
  });

  it("the team's cap room goes up by his cap hit less the dead money", () => {
    for (const t of ["IMMEDIATE", "SLOW", "LATE"] as const) {
      const book = [deal()];
      const dead: DeadMoneyCharge[] = [];
      const before = teamCapTotal(T, 2027, book, dead, { at: at(t) }).total;
      retire(book, dead, p(1), T, at(t));
      const after = teamCapTotal(T, 2027, book, dead, { at: at(t) }).total;
      const hit = capNumber(deal().years[1]!);
      const charged = dead.filter((d) => d.season === 2027).reduce((s, d) => s + d.amount, 0);
      expect(before).toBe(hit);
      expect(before - after).toBe(hit - charged);
      expect(liveIn(book[0]!, 2027)).toBe(false);
    }
  });

  it("sends no PLAYER_RELEASED, and a man with no deal costs nothing", () => {
    const book = [deal()];
    const dead: DeadMoneyCharge[] = [];
    expect(retire(book, dead, p(1), T, at("SLOW")).events).toEqual([]);
    expect(releasePlayer(deal(), at("SLOW"), { reason: "RETIRED" }).events).toEqual([]);
    const none = retire(book, dead, p(9), T, at("SLOW"));
    expect(none).toEqual({ charges: [], events: [] });
    expect(dead).toHaveLength(1);
  });

  it("a deal already ended cannot retire again; a second retire() finds no live deal and books nothing", () => {
    const book = [deal()];
    const dead: DeadMoneyCharge[] = [];
    retire(book, dead, p(1), T, at("IMMEDIATE"));
    expect(() => releasePlayer(book[0]!, at("SLOW"), { reason: "RETIRED" })).toThrow();
    expect(retire(book, dead, p(1), T, at("SLOW")).charges).toEqual([]);
    expect(dead).toHaveLength(1);
  });
});
