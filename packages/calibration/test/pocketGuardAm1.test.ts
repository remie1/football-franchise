/**
 * ADR-089 step 2: AM-1's READING OF THE GUARD (`guardAm1.ts`; the amendment's §3.5 table, §4.4,
 * §4.5; Appendix F, F.11).
 *
 * On step 1's own records (seed set 1 from the committed `reports/adr-089-step1.json`, seed set 2
 * from the committed fixture `test/fixtures/adr089-step1-set2/`), AM-1's statistic gives the values
 * the amendment states: A1 against A0, flat league-wide Z +5.69 (a breach), gen +2.41 (a breach),
 * flat DESPERATION +2.87 (no breach at 3.0); A5 against A0, flat DESPERATION +3.34 (a class breach);
 * A9 against A0, flat +0.55 (a pass); A11 against A1, flat -11.55 (a pass); and e* against A1, 0.16
 * flat and 0.34 gen league-wide (an A1-sized arm read against A1). Then the edge cases: Z exactly at
 * the line passes (strict); a one-set arm is reported, not graded; a set with SE 0 scores z = 0 and
 * the reading is kept; a class fall never offsets a class rise; REMOVED and NO_BASE are as filed; and
 * the filed verdict is carried beside every AM-1 verdict. The paired SE and the DESPERATION halves'
 * re-weighting (reported, never graded) are tested on constructed vectors.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ArmId } from "../src/pocket/arms.js";
import type { IntMix } from "../src/pocket/bands.js";
import type { SeedSet } from "../src/pocket/corpus.js";
import {
  AM1_LINES,
  am1ArmReading,
  am1ClassReading,
  am1Reading,
  DESPERATION_HALVES,
  pairedReading,
  pairedSet,
  reweightedBy,
  reweightedDesperation,
  seZeroWithExcess,
  type GuardSide,
} from "../src/pocket/guardAm1.js";
import type { League } from "../src/pocket/report.js";
import type { GuardGameVector } from "../src/pocket/s2Stream.js";
import type { ArmRecord } from "../src/pocket/step1.js";

const PKG = join(import.meta.dirname, "..");
const set1 = JSON.parse(readFileSync(join(PKG, "reports", "adr-089-step1.json"), "utf8")) as { arms: Record<string, ArmRecord> };
const set2 = (id: ArmId): ArmRecord => JSON.parse(readFileSync(join(PKG, "test", "fixtures", "adr089-step1-set2", `${id}.set2.json`), "utf8")) as ArmRecord;

/** An arm's guard sides on one league, set 1 from the committed run, set 2 from the fixture. */
function sides(id: ArmId, league: League): Partial<Record<SeedSet, GuardSide>> {
  const one = set1.arms[id]!;
  const two = set2(id);
  expect(one.stamp.seedSet, `${id} set 1`).toBe(1);
  expect(two.stamp.seedSet, `${id} set 2`).toBe(2);
  return { 1: one.report.intGuard[league], 2: two.report.intGuard[league] };
}

const read = (arm: ArmId, base: ArmId, league: League) => am1ArmReading(sides(base, league), sides(arm, league), "TICK");
const r2 = (v: number | null | undefined): string => (v === null || v === undefined ? "null" : v.toFixed(2));
const signed = (v: number | null | undefined): string => (v === null || v === undefined ? "null" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}`);

describe("AM-1 on step 1's records (the amendment's §3.5 values)", () => {
  it("A1 against A0: flat league-wide Z +5.69, a breach; gen +2.41, a breach; flat DESPERATION +2.87, not a breach at 3.0", () => {
    const flat = read("A1", "A0", "flat");
    const gen = read("A1", "A0", "gen");
    expect(signed(flat.league.Z)).toBe("+5.69");
    expect(flat.league.verdict).toBe("BREACH");
    expect(flat.league.graded).toBe(true);
    expect(signed(gen.league.Z)).toBe("+2.41");
    expect(gen.league.verdict).toBe("BREACH");
    const desp = flat.classes.find((c) => c.cls === "DESPERATION")!;
    expect(desp.graded).toBe(true);
    expect(signed(desp.reading!.Z)).toBe("+2.87");
    expect(desp.reading!.line).toBe(3.0);
    expect(desp.reading!.verdict).toBe("PASS");
    expect(flat.breaches).toEqual(["league-wide"]);
    // The per-set figures AM-1 §5.1 quotes for set 2 (rise +0.82, allowed +0.20, SE 0.12, z +5.31).
    const s2 = flat.league.sets.find((s) => s.seedSet === 2)!;
    expect([signed(s2.rise), signed(s2.allowed), r2(s2.se), signed(s2.z)]).toEqual(["+0.82", "+0.20", "0.12", "+5.31"]);
  });

  it("A5 against A0: flat DESPERATION +3.34, a class breach", () => {
    const flat = read("A5", "A0", "flat");
    const desp = flat.classes.find((c) => c.cls === "DESPERATION")!;
    expect(signed(desp.reading!.Z)).toBe("+3.34");
    expect(desp.reading!.verdict).toBe("BREACH");
    expect(flat.breaches).toContain("DESPERATION");
  });

  it("A9 against A0: flat +0.55, a pass", () => {
    const flat = read("A9", "A0", "flat");
    expect(signed(flat.league.Z)).toBe("+0.55");
    expect(flat.league.verdict).toBe("PASS");
  });

  it("A11 against A1: flat -11.55, a pass", () => {
    const flat = read("A11", "A1", "flat");
    expect(signed(flat.league.Z)).toBe("-11.55");
    expect(flat.league.verdict).toBe("PASS");
  });

  it("e* against A1 (an A1-sized arm read against A1): 0.16 flat and 0.34 gen, league-wide", () => {
    expect(r2(read("A1", "A1", "flat").league.eStar)).toBe("0.16");
    expect(r2(read("A1", "A1", "gen").league.eStar)).toBe("0.34");
  });

  it("carries the filed verdict beside every AM-1 verdict (A9 against A0: AM-1 passes where the filed rule breached)", () => {
    for (const league of ["flat", "gen"] as const) {
      const r = read("A9", "A0", league);
      for (const reading of [r.league, ...r.classes.flatMap((c) => (c.reading === undefined ? [] : [c.reading]))]) {
        expect(typeof reading.filedPasses).toBe("boolean");
        for (const s of reading.sets) expect(s.filedPasses).toBe(s.rise <= s.allowed);
      }
      expect(r.breaches).toEqual([]);
    }
    // F.6: the filed rule breached A9 on some reading; AM-1 passes them all.
    const filed = [read("A9", "A0", "flat"), read("A9", "A0", "gen")].flatMap((r) => r.filedBreaches);
    expect(filed.length).toBeGreaterThan(0);
  });
});

// --- the edge cases, on constructed counts ----------------------------------------------------------

/** A population with `n` aimed throws all in the first release bin and `i` interceptions. */
const mix = (n: number, i: number): IntMix => ({ aimedByBin: [n, 0, 0, 0, 0, 0, 0], interceptions: i });

describe("AM-1's edge cases", () => {
  it("Z exactly at the line passes; any amount above it breaches (strict >)", () => {
    const base = { 1: mix(4000, 80), 2: mix(4000, 76) };
    const arm = { 1: mix(4000, 104), 2: mix(4000, 101) };
    const r = am1Reading(base, arm, "TICK", "LEAGUE");
    expect(r.Z).not.toBeNull();
    const at = am1Reading(base, arm, "TICK", "LEAGUE", { ...AM1_LINES, zLeague: r.Z! });
    expect(at.verdict).toBe("PASS");
    const below = am1Reading(base, arm, "TICK", "LEAGUE", { ...AM1_LINES, zLeague: r.Z! - 1e-9 });
    expect(below.verdict).toBe("BREACH");
    // The class line is its own (3.0).
    expect(am1Reading(base, arm, "TICK", "CLASS").line).toBe(3.0);
    expect(am1Reading(base, arm, "TICK", "LEAGUE").line).toBe(2.0);
  });

  it("a one-set arm is reported, not graded", () => {
    const r = am1Reading({ 1: mix(4000, 80), 2: mix(4000, 76) }, { 1: mix(4000, 200) }, "TICK", "LEAGUE");
    expect(r.sets.map((s) => s.seedSet)).toEqual([1]);
    expect(r.graded).toBe(false);
    expect(r.Z).toBeNull();
    expect(r.eStar).toBeNull();
    expect(r.verdict).toBe("REPORTED");
    const arm = am1ArmReading({ 1: { all: mix(4000, 80), byClass: { PROGRESSION: mix(4000, 80) } } }, { 1: { all: mix(4000, 200), byClass: { PROGRESSION: mix(4000, 200) } } }, "TICK");
    expect(arm.graded).toBe(false);
    expect(arm.breaches).toEqual([]);
    expect(arm.classes[0]!.graded).toBe(false);
    expect(arm.classes[0]!.reading!.verdict).toBe("REPORTED");
  });

  it("a set whose SE is 0 scores z = 0 and the reading is kept", () => {
    const r = am1Reading({ 1: mix(300, 0), 2: mix(4000, 80) }, { 1: mix(300, 0), 2: mix(4000, 140) }, "TICK", "CLASS");
    const one = r.sets.find((s) => s.seedSet === 1)!;
    expect(one.se).toBe(0);
    expect(one.seZero).toBe(true);
    expect(one.z).toBe(0);
    expect(r.graded).toBe(true);
    expect(r.Z).toBeCloseTo(r.sets.find((s) => s.seedSet === 2)!.z / Math.SQRT2, 12);
    expect(r.eStar).toBeNull();
  });

  it("pins today's SE-0 rule where it is not monotone: one more interception turns a BREACH into a PASS, and the set is flagged (review CT-F3)", () => {
    // Base: set 1 0 of 3 intercepted, set 2 8 of 400. The arm's set 2: 25 of 400 (z +3.04).
    const base = { 1: mix(3, 0), 2: mix(400, 8) };
    const oneOfTwo = am1Reading(base, { 1: mix(2, 1), 2: mix(400, 25) }, "TICK", "CLASS");
    const twoOfTwo = am1Reading(base, { 1: mix(2, 2), 2: mix(400, 25) }, "TICK", "CLASS");
    expect(oneOfTwo.sets.find((x) => x.seedSet === 2)!.z).toBeCloseTo(3.0397, 4);
    // Set 1 at 1 of 2: SE 35.36, z +1.41, so Z +3.15 breaches the class line (3.0).
    expect(oneOfTwo.sets.find((x) => x.seedSet === 1)!.se).toBeCloseTo(35.3553, 4);
    expect(oneOfTwo.sets.find((x) => x.seedSet === 1)!.z).toBeCloseTo(1.4142, 4);
    expect(oneOfTwo.Z).toBeCloseTo(3.1494, 4);
    expect(oneOfTwo.verdict).toBe("BREACH");
    expect(seZeroWithExcess(oneOfTwo)).toEqual([]);
    // Set 1 at 2 of 2 (a 100-point rise): SE 0, scored 0 as AM-1 files it, so Z +2.15 passes.
    const one = twoOfTwo.sets.find((x) => x.seedSet === 1)!;
    expect([one.se, one.seZero, one.z, one.excess]).toEqual([0, true, AM1_LINES.zSetSE0, 100]);
    expect(twoOfTwo.Z).toBeCloseTo(2.1494, 4);
    expect(twoOfTwo.verdict).toBe("PASS");
    // The filed reading beside both shows the rise; the SE-0 set with a positive excess is flagged.
    expect([oneOfTwo.filedPasses, twoOfTwo.filedPasses]).toEqual([false, false]);
    expect(seZeroWithExcess(twoOfTwo)).toEqual([1]);
    // An SE-0 set with no excess (0 of 300 against 0 of 300) is not flagged.
    expect(seZeroWithExcess(am1Reading({ 1: mix(300, 0), 2: mix(4000, 80) }, { 1: mix(300, 0), 2: mix(4000, 140) }, "TICK", "CLASS"))).toEqual([]);
  });

  it("a class fall never offsets a class rise, and a league-wide pass never excuses a class breach", () => {
    const side = (prog: IntMix, rank: IntMix): GuardSide => ({
      all: { aimedByBin: prog.aimedByBin.map((x, i) => x + (rank.aimedByBin[i] ?? 0)), interceptions: prog.interceptions + rank.interceptions },
      byClass: { PROGRESSION: prog, RANK_PUSHED: rank },
    });
    // PROGRESSION rises by 1.5 points and RANK_PUSHED falls by 1.5 on equal counts: the league is flat.
    const base = { 1: side(mix(5000, 100), mix(5000, 100)), 2: side(mix(5000, 100), mix(5000, 100)) };
    const arm = { 1: side(mix(5000, 175), mix(5000, 25)), 2: side(mix(5000, 175), mix(5000, 25)) };
    const r = am1ArmReading(base, arm, "TICK");
    expect(r.league.verdict).toBe("PASS");
    expect(r.classes.find((c) => c.cls === "PROGRESSION")!.reading!.verdict).toBe("BREACH");
    expect(r.classes.find((c) => c.cls === "RANK_PUSHED")!.reading!.verdict).toBe("PASS");
    expect(r.breaches).toEqual(["PROGRESSION"]);
  });

  it("REMOVED and NO_BASE are as filed: reported with their counts, never scored or graded", () => {
    const base: Partial<Record<SeedSet, GuardSide>> = {
      1: { all: mix(1000, 20), byClass: { PROGRESSION: mix(900, 18), ON_THE_RUN: mix(100, 2) } },
      2: { all: mix(1000, 20), byClass: { PROGRESSION: mix(900, 18), ON_THE_RUN: mix(100, 2) } },
    };
    const arm: Partial<Record<SeedSet, GuardSide>> = {
      1: { all: mix(1000, 20), byClass: { PROGRESSION: mix(950, 19), CLEAN_EXPIRY: mix(50, 1) } },
      2: { all: mix(1000, 20), byClass: { PROGRESSION: mix(950, 19), CLEAN_EXPIRY: mix(50, 1) } },
    };
    const removed = am1ClassReading(base, arm, "TICK", "ON_THE_RUN");
    expect(removed.bySet).toEqual([
      { seedSet: 1, status: "REMOVED", baseThrows: 100, baseInterceptions: 2 },
      { seedSet: 2, status: "REMOVED", baseThrows: 100, baseInterceptions: 2 },
    ]);
    expect(removed.reading).toBeUndefined();
    expect(removed.graded).toBe(false);
    const noBase = am1ClassReading(base, arm, "TICK", "CLEAN_EXPIRY");
    expect(noBase.bySet).toEqual([
      { seedSet: 1, status: "NO_BASE", armThrows: 50, armInterceptions: 1 },
      { seedSet: 2, status: "NO_BASE", armThrows: 50, armInterceptions: 1 },
    ]);
    expect(noBase.graded).toBe(false);
    // A class scored on one set and REMOVED on the other is not graded either (AM-1 §4.5).
    const mixed = am1ClassReading(base, { ...arm, 1: { all: mix(1000, 20), byClass: { PROGRESSION: mix(900, 18), ON_THE_RUN: mix(100, 9) } } }, "TICK", "ON_THE_RUN");
    expect(mixed.bySet.map((s) => s.status)).toEqual(["SCORED", "REMOVED"]);
    expect(mixed.graded).toBe(false);
    expect(mixed.reading!.verdict).toBe("REPORTED");
    // A class empty on both sides on every set is not a reading at all.
    const r = am1ArmReading(base, arm, "TICK");
    expect(r.classes.map((c) => c.cls).sort()).toEqual(["CLEAN_EXPIRY", "ON_THE_RUN", "PROGRESSION"]);
    expect(r.breaches).toEqual([]);
  });

  it("refuses a population with no aimed throws, and a reading with no set in common", () => {
    expect(() => am1Reading({ 1: mix(0, 0) }, { 1: mix(10, 0) }, "TICK", "CLASS")).toThrow(/no aimed throws in the base/);
    expect(() => am1Reading({ 1: mix(10, 0) }, { 2: mix(10, 0) }, "TICK", "CLASS")).toThrow(/no seed set holds both/);
  });
});

// --- reported: the paired SE and DESPERATION's halves ----------------------------------------------

const game = (i: number, prog: readonly [number, number], desp?: { DIRTY?: readonly [number, number]; CLEAN?: readonly [number, number] }): GuardGameVector => {
  const cell = ([n, k]: readonly [number, number]) => ({ aimedByBin: [n, 0, 0, 0, 0, 0, 0], interceptions: k, completions: 0 });
  return {
    game: i,
    gameId: `g${String(i)}`,
    classes: { PROGRESSION: cell(prog) },
    desperation: Object.fromEntries(Object.entries(desp ?? {}).map(([h, v]) => [h, cell(v)])),
  };
};

describe("the paired, game-clustered SE (reported, never graded)", () => {
  it("is the delta method over paired games, by hand on three games", () => {
    const base = [game(0, [10, 1]), game(1, [10, 0]), game(2, [10, 2])];
    const arm = [game(0, [10, 2]), game(1, [10, 1]), game(2, [10, 2])];
    const p = pairedSet(1, base, arm, { of: "LEAGUE" }, "TICK")!;
    // ra = 5/30, rb = 3/30; one bin, so the allowance and its noise are 0. u_g = 100 (dIa_g - dIb_g) / 10.
    // u = (100 (2 - 10/6) - 100 (1 - 1)) / 10 ... computed below directly.
    const ra = 5 / 30;
    const rb = 3 / 30;
    const u = [0, 1, 2].map((g) => (100 * ([2, 1, 2][g]! - ra * 10)) / 10 - (100 * ([1, 0, 2][g]! - rb * 10)) / 10);
    const se = Math.sqrt((3 / 2) * u.reduce((a, x) => a + x * x, 0)) / 3;
    expect(p.games).toBe(3);
    expect(p.excess).toBeCloseTo(100 * (ra - rb), 12);
    expect(p.se).toBeCloseTo(se, 12);
    expect(p.z).toBeCloseTo((100 * (ra - rb)) / se, 12);
  });

  it("is 0 with z null for identical arms, pools two sets, and refuses unpaired games", () => {
    const g = [game(0, [10, 1]), game(1, [12, 0]), game(2, [9, 2])];
    expect(pairedSet(1, g, g, { of: "CLASS", cls: "PROGRESSION" }, "TICK")).toEqual({ seedSet: 1, games: 3, excess: 0, se: 0, z: null });
    const base = [game(0, [10, 1]), game(1, [10, 0]), game(2, [10, 2])];
    const arm = [game(0, [10, 2]), game(1, [10, 1]), game(2, [10, 2])];
    const two = pairedReading({ 1: base, 2: base }, { 1: arm, 2: arm }, { of: "LEAGUE" }, "TICK");
    expect(two.sets).toHaveLength(2);
    expect(two.Z).toBeCloseTo((2 * two.sets[0]!.z!) / Math.SQRT2, 12);
    expect(pairedReading({ 1: base }, { 1: arm }, { of: "LEAGUE" }, "TICK").Z).toBeNull();
    expect(() => pairedSet(1, base, arm.slice(0, 2), { of: "LEAGUE" }, "TICK")).toThrow(/same seeds/);
    expect(() => pairedSet(1, base, [game(0, [10, 2]), { ...game(1, [10, 1]), gameId: "other" }, game(2, [10, 2])], { of: "LEAGUE" }, "TICK")).toThrow(/same seeds/);
    expect(pairedSet(1, base, arm, { of: "HALF", half: "DIRTY" }, "TICK")).toBeNull();
  });

  it("reads DESPERATION's halves from the per-game vectors", () => {
    const base = [game(0, [10, 1], { DIRTY: [4, 1], CLEAN: [6, 0] }), game(1, [10, 0], { DIRTY: [5, 0], CLEAN: [5, 1] })];
    const arm = [game(0, [10, 1], { DIRTY: [4, 2], CLEAN: [6, 0] }), game(1, [10, 0], { DIRTY: [5, 1], CLEAN: [5, 1] })];
    const dirty = pairedSet(1, base, arm, { of: "HALF", half: "DIRTY" }, "TICK")!;
    expect(dirty.excess).toBeCloseTo(100 * (3 / 9 - 1 / 9), 12);
    const clean = pairedSet(1, base, arm, { of: "HALF", half: "CLEAN" }, "TICK")!;
    expect(clean.excess).toBe(0);
  });
});

describe("DESPERATION re-weighted to the base's composition (AM-1 §4.5, reported)", () => {
  it("weights each half's rate change by the base's share of that half", () => {
    const base = { DIRTY: mix(100, 10), CLEAN: mix(300, 6) };
    const arm = { DIRTY: mix(300, 30), CLEAN: mix(100, 2) };
    const r = reweightedDesperation(1, base, arm);
    // Same rates in each half, only the membership moved: the class rises, the re-weighted rise is 0.
    expect(r.rise).toBeCloseTo((100 * 32) / 400 - (100 * 16) / 400, 12);
    expect(r.reweightedRise).toBeCloseTo(0, 12);
    expect(r.baseShare).toEqual({ DIRTY: 25, CLEAN: 75 });
    expect(r.armShare).toEqual({ DIRTY: 75, CLEAN: 25 });
    const worse = reweightedDesperation(2, base, { DIRTY: mix(100, 20), CLEAN: mix(300, 6) });
    expect(worse.reweightedRise).toBeCloseTo(0.25 * 10, 12);
    expect(reweightedDesperation(1, base, { DIRTY: mix(100, 10), CLEAN: mix(0, 0) }).reweightedRise).toBeNull();
    expect(reweightedDesperation(1, { DIRTY: mix(0, 0), CLEAN: mix(0, 0) }, arm).rise).toBeNull();
  });

  it("re-weights any class split into parts the same way: CHECKDOWN by trigger (review FID-F-2)", () => {
    const parts = ["THREAT", "COUNT", "STATUS", "NONE"] as const;
    const base = { THREAT: mix(100, 4), COUNT: mix(300, 3), STATUS: mix(100, 1), NONE: mix(0, 0) };
    // The arm moves looks from STATUS to THREAT at the same rates in each part: the class rises, the re-weighted rise is 0.
    const arm = { THREAT: mix(200, 8), COUNT: mix(300, 3), STATUS: mix(0, 0), NONE: mix(0, 0) };
    const moved = reweightedBy(1, parts, base, arm);
    expect(moved.rise).toBeCloseTo((100 * 11) / 500 - (100 * 8) / 500, 12);
    // STATUS, a part the base throws in, has no arm throws: its rate change is not defined.
    expect(moved.reweightedRise).toBeNull();
    expect(moved.baseShare).toEqual({ THREAT: 20, COUNT: 60, STATUS: 20, NONE: 0 });
    expect(moved.armShare).toEqual({ THREAT: 40, COUNT: 60, STATUS: 0, NONE: 0 });
    const same = reweightedBy(2, parts, base, { THREAT: mix(200, 8), COUNT: mix(300, 3), STATUS: mix(100, 1), NONE: mix(0, 0) });
    expect(same.reweightedRise).toBeCloseTo(0, 12);
    const worse = reweightedBy(2, parts, base, { THREAT: mix(100, 9), COUNT: mix(300, 3), STATUS: mix(100, 1), NONE: mix(0, 0) });
    expect(worse.reweightedRise).toBeCloseTo(0.2 * 5, 12);
    // DESPERATION's is the same function over its halves.
    const d = { DIRTY: mix(100, 10), CLEAN: mix(300, 6) };
    expect(reweightedBy(1, DESPERATION_HALVES, d, d)).toEqual(reweightedDesperation(1, d, d));
  });
});
