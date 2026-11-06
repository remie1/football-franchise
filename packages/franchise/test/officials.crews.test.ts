/**
 * ADR-093 step 1: the league's 17 officiating crews, made from the seed and carried into each new
 * season (§6.1 to §6.3; the step-1 ledger's A4 and A5 in §16). Iron Rule 4: makeCrews and carryCrews
 * are pure functions of their inputs, and every draw replays from its documented label.
 */
import { describe, expect, it } from "vitest";
import { createRng, type CrewLeanFamily, type OfficiatingCrew } from "@ff/contracts";
import { CREW_RULES, carryCrews, crewIdFor, crewsProblem, makeCrews, officialsRng } from "../src/index.js";
import { drawName } from "../src/staff/makeCoach.js";
import { FIRST_NAMES, LAST_NAMES } from "../src/staff/tables.js";
import { clamp, normal } from "../src/staff/world.js";

const FAMILIES = CREW_RULES.families;
const SEASON = 2027;
const seeds = (n: number) => Array.from({ length: n }, (_, i) => `officials-${i + 1}`);

const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
/** The population SD: the 17 crews are the whole league, not a sample of it. */
const popSd = (xs: readonly number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
function pearson(xs: readonly number[], ys: readonly number[]): number {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  xs.forEach((x, i) => { const y = ys[i]!; sxy += (x - mx) * (y - my); sxx += (x - mx) ** 2; syy += (y - my) ** 2; });
  return sxy / Math.sqrt(sxx * syy);
}
const leansIn = (crews: readonly OfficiatingCrew[], f: CrewLeanFamily) => crews.map((c) => c.leans[f]);
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * The realized SD of 17 settled leans against the SD they are drawn at (COMPUTED): the expected
 * population SD of 17 normal draws is √(16/17) × c4(17), where c4(17) = √(2/16) × Γ(8.5) ÷ Γ(8).
 */
const gammaHalf = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5].reduce((p, x) => p * x, Math.sqrt(Math.PI)); // Γ(8.5)
const REALIZED = Math.sqrt(16 / 17) * Math.sqrt(2 / 16) * gammaHalf / 5040; // Γ(8) = 7!

/** 20 seeds, each one made season and 50 carried after it. */
const chains = seeds(20).map((seed) => {
  const run = [makeCrews(seed, SEASON)];
  for (let k = 1; k <= 50; k++) run.push(carryCrews(run[k - 1]!, seed, SEASON + k));
  return run;
});

describe("the league's officiating crews (ADR-093 step 1, §6.1 to §6.3)", () => {
  it("makes 17 crews, crew-01 to crew-17, each with its own made-up referee and a whole lean from 0 to 100 on each of the five families", () => {
    const crews = makeCrews("officials-1", SEASON);
    expect(crews.map((c) => String(c.id))).toEqual(Array.from({ length: 17 }, (_, i) => `crew-${pad(i + 1)}`));
    expect(crews.map((c) => c.id)).toEqual(Array.from({ length: 17 }, (_, i) => crewIdFor(i)));
    expect(new Set(crews.map((c) => c.referee)).size).toBe(17);
    const madeUp = new Set(FIRST_NAMES.flatMap((first) => LAST_NAMES.map((last) => `${first} ${last}`)));
    for (const c of crews) {
      expect(Object.keys(c)).toEqual(["id", "referee", "leans"]);
      expect(madeUp.has(c.referee)).toBe(true);
      expect(Object.keys(c.leans)).toEqual([...FAMILIES]);
      for (const f of FAMILIES) {
        expect(Number.isInteger(c.leans[f])).toBe(true);
        expect(c.leans[f]).toBeGreaterThanOrEqual(0);
        expect(c.leans[f]).toBeLessThanOrEqual(100);
      }
    }
    expect(crewsProblem(crews)).toBeUndefined();
    // The five are the contract's own families, all of them, in its order.
    const all: Record<CrewLeanFamily, true> = { LINE_HOLDING: true, COVERAGE: true, PLAYER_SAFETY: true, TECHNICAL: true, SNAP: true };
    expect([...FAMILIES]).toEqual(Object.keys(all));
    expect(Object.keys(CREW_RULES.leanSd)).toEqual([...FAMILIES]);
  });

  it("is a pure function of the seed and the season", () => {
    const leans = (crews: readonly OfficiatingCrew[]) => crews.map((c) => c.leans);
    const first = makeCrews("officials-1", SEASON);
    expect(makeCrews("officials-1", SEASON)).toEqual(first);
    expect(leans(makeCrews("officials-2", SEASON))).not.toEqual(leans(first));
    expect(leans(makeCrews("officials-1", SEASON + 1))).not.toEqual(leans(first));
    const carried = carryCrews(first, "officials-1", SEASON + 1);
    expect(carryCrews(first, "officials-1", SEASON + 1)).toEqual(carried);
    expect(leans(carryCrews(first, "officials-2", SEASON + 1))).not.toEqual(leans(carried));
    expect(leans(carryCrews(first, "officials-1", SEASON + 2))).not.toEqual(leans(carried));
    expect(officialsRng("officials-1", SEASON).label).toBe("franchise:officials/2027");
  });

  it("centers each family on 50 every season", () => {
    for (const seed of seeds(200)) {
      const made = makeCrews(seed, SEASON);
      for (const crews of [made, carryCrews(made, seed, SEASON + 1)]) {
        for (const f of FAMILIES) expect(Math.abs(mean(leansIn(crews, f)) - 50)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it("spreads each family as CREW_RULES.leanSd says", () => {
    expect(REALIZED.toFixed(3)).toBe("0.955");
    const made = seeds(1000).map((seed) => makeCrews(seed, SEASON));
    const lines: string[] = [];
    for (const f of FAMILIES) {
      const realized = mean(made.map((crews) => popSd(leansIn(crews, f))));
      const target = REALIZED * CREW_RULES.leanSd[f];
      lines.push(`${f} ${realized.toFixed(2)} against ${target.toFixed(2)} (drawn at ${CREW_RULES.leanSd[f]})`);
      expect(Math.abs(realized / target - 1)).toBeLessThan(0.03);
    }
    console.log(`ADR-093 step 1, the crews' lean SD in one season, mean over 1,000 seeds:\n  ${lines.join("\n  ")}`);
  });

  it("carries a crew into the next season: same id and referee, each lean drawn toward its last at CREW_RULES.carry", () => {
    for (const run of chains) {
      for (const crews of run.slice(1)) {
        expect(crews.map((c) => [c.id, c.referee])).toEqual(run[0]!.map((c) => [c.id, c.referee]));
      }
    }
    const lines: string[] = [];
    for (const f of FAMILIES) {
      const before: number[] = [], after: number[] = [];
      for (const run of chains) {
        for (let k = 1; k < run.length; k++) {
          for (let c = 0; c < 17; c++) { before.push(run[k - 1]![c]!.leans[f]); after.push(run[k]![c]!.leans[f]); }
        }
      }
      expect(before).toHaveLength(20 * 50 * 17);
      const r = pearson(before, after);
      lines.push(`${f} r ${r.toFixed(3)}`);
      expect(Math.abs(r - CREW_RULES.carry)).toBeLessThan(0.03);
    }
    console.log(`ADR-093 step 1, the crews' lean carried a season (dial ${CREW_RULES.carry}), pooled over 20 seeds × 50 carries × 17 crews:\n  ${lines.join("\n  ")}`);
  });

  it("does not drift: after 50 carried seasons each family's spread is still leanSd's", () => {
    for (const f of FAMILIES) {
      const late = chains.flatMap((run) => run.slice(-10).map((crews) => popSd(leansIn(crews, f))));
      expect(late).toHaveLength(200);
      expect(Math.abs(mean(late) / (REALIZED * CREW_RULES.leanSd[f]) - 1)).toBeLessThan(0.1);
      for (const crews of chains.map((run) => run.at(-1)!)) expect(Math.abs(mean(leansIn(crews, f)) - 50)).toBeLessThanOrEqual(0.5);
    }
  });

  it("holds the carry at 0.68, the owner's answer to question 1, and each family's lean SD at §16 A4's numbers", () => {
    // The tests above check the draws against whatever CREW_RULES says, so these numbers are pinned
    // here. The carry is the owner's answer to question 1 on 2026-11-06 (0.68, against 0.35 as
    // written), a dated §15 entry of ADR-093 (§16 A5), and changes only with the owner's word; a
    // family's spread only at its own step, which measures it again (§16 A4).
    expect(CREW_RULES.carry).toBe(0.68);
    expect(CREW_RULES.leanSd).toEqual({ LINE_HOLDING: 8.6, COVERAGE: 8.8, PLAYER_SAFETY: 14.0, TECHNICAL: 10.3, SNAP: 4.4 });
  });

  it("crewsProblem names what is wrong", () => {
    const good = makeCrews("officials-1", SEASON);
    const withLean = (v: unknown) => good.map((c, i) => (i === 3 ? { ...c, leans: { ...c.leans, SNAP: v } } : c));
    const cases: [string, unknown, RegExp][] = [
      ["a missing family", good.map((c, i) => (i === 3 ? { ...c, leans: { LINE_HOLDING: 50, COVERAGE: 50, PLAYER_SAFETY: 50, TECHNICAL: 50 } } : c)), /crew-04 has no SNAP lean/],
      ["a lean of 101", withLean(101), /crew-04's SNAP lean is not a whole number from 0 to 100 \(101\)/],
      ["a lean of \"50\"", withLean("50"), /crew-04's SNAP lean is not a whole number from 0 to 100 \("50"\)/],
      ["a lean of 50.5", withLean(50.5), /crew-04's SNAP lean is not a whole number from 0 to 100 \(50.5\)/],
      ["one crew twice", [...good.slice(0, 16), good[0]], /crew crew-01 appears twice/],
      ["16 crews", good.slice(0, 16), /there are 16 crews, not 17/],
      ["an empty referee", good.map((c, i) => (i === 3 ? { ...c, referee: "" } : c)), /crew crew-04 has no referee/],
      ["two crews with one referee", good.map((c, i) => (i === 3 ? { ...c, referee: good[0]!.referee } : c)), /two crews have the referee/],
      ["a lean on KICKS", good.map((c, i) => (i === 3 ? { ...c, leans: { ...c.leans, KICKS: 50 } } : c)), /crew-04 leans on KICKS, not one of the five families/],
      ["an empty id", good.map((c, i) => (i === 3 ? { ...c, id: "" } : c)), /crew 4 on the list has no id/],
      ["no leans", good.map((c, i) => (i === 3 ? { id: c.id, referee: c.referee } : c)), /crew crew-04 has no leans/],
      ["a crew that is not an object", good.map((c, i) => (i === 3 ? "crew-04" : c)), /crew 4 on the list is not a crew/],
      ["not a list", { crews: good }, /not a list/],
    ];
    const reasons = cases.map(([name, crews, why]) => {
      const reason = crewsProblem(crews);
      expect(reason, name).toMatch(why);
      return reason;
    });
    expect(new Set(reasons).size).toBe(cases.length);
  });

  it("names and leans are drawn on their own forks: changing the referees' names moves no lean", () => {
    const seed = "officials-7";
    // The leans, from their labels alone: one normal a family, then re-centered, clamped and rounded.
    const settled = (raw: Record<CrewLeanFamily, number>[]) => {
      const shift = Object.fromEntries(FAMILIES.map((f) => [f, 50 - mean(raw.map((l) => l[f]))]));
      return raw.map((l) => Object.fromEntries(FAMILIES.map((f) => [f, Math.round(clamp(l[f] + shift[f]!, 0, 100))])));
    };
    const fresh = settled(Array.from({ length: 17 }, (_, i) => {
      const rng = createRng(seed, `franchise:officials/${SEASON}/new/leans/crew-${pad(i + 1)}`);
      return Object.fromEntries(FAMILIES.map((f) => [f, 50 + CREW_RULES.leanSd[f] * normal(rng)])) as Record<CrewLeanFamily, number>;
    }));
    const made = makeCrews(seed, SEASON);
    expect(made.map((c) => c.leans)).toEqual(fresh);
    // The referees, from their own label alone.
    const names = createRng(seed, `franchise:officials/${SEASON}/new/names`);
    const taken = new Set<string>();
    expect(made.map((c) => c.referee)).toEqual(Array.from({ length: 17 }, () => drawName(names, taken)));
    // A season later, from the carry's labels alone.
    const rho = CREW_RULES.carry;
    const carried = settled(made.map((c) => {
      const rng = createRng(seed, `franchise:officials/${SEASON + 1}/carry/leans/${String(c.id)}`);
      return Object.fromEntries(FAMILIES.map((f) => [f, 50 + rho * (c.leans[f] - 50) + Math.sqrt(1 - rho * rho) * CREW_RULES.leanSd[f] * normal(rng)])) as Record<CrewLeanFamily, number>;
    }));
    expect(carryCrews(made, seed, SEASON + 1).map((c) => c.leans)).toEqual(carried);
    // Other referees' names, the same leans: the carry reads ids and leans, never names.
    const renamed = made.map((c, i) => ({ ...c, referee: `Another Name ${i}` }));
    expect(carryCrews(renamed, seed, SEASON + 1).map((c) => c.leans)).toEqual(carried);
  });

  it("carries in id order whatever order the crews come in, leaves them as they were, and refuses a list that is not a league's", () => {
    const made = makeCrews("officials-1", SEASON);
    const frozen = Object.freeze([...made].reverse().map((c) => Object.freeze({ ...c, leans: Object.freeze({ ...c.leans }) })));
    const before = JSON.stringify(frozen);
    expect(carryCrews(frozen, "officials-1", SEASON + 1)).toEqual(carryCrews(made, "officials-1", SEASON + 1));
    expect(JSON.stringify(frozen)).toBe(before);
    expect(() => carryCrews(made.slice(0, 16), "officials-1", SEASON + 1)).toThrow(/carryCrews: last season's crews are not a league's \(there are 16 crews, not 17\)/);
  });
});
