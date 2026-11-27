/**
 * ADR-089 step 5 — STEP 5'S CLASS VIEW ON THE GOLDEN GAMES OF THE s2, s3 AND s4 PINS (AM-8, `filing.md`
 * §3.1; plan §3; critique 3 S9).
 *
 * Every arm of `POCKET_1_S2_PINS`, `POCKET_1_S3_PINS` and `POCKET_1_S4_PINS` (B1 to B7, C1 to C16, D1 to
 * D17) plays its golden games (the first 10 a league in the suite; all 50 under `FF_POCKET_ON=1`), and
 * every dropback is classed twice:
 *
 *  1. Under the old function, `throwClassOf`, which steps 1 to 4 read: the counts by class, arm and
 *     league equal those recorded on 517002e before step 5's view landed (`BEFORE`, measured there by
 *     this same count with the source at the base), so adding the view moved no class steps 1 to 4
 *     read. CLEAN_EXPIRY is empty under it, on every arm.
 *  2. Under step 5's view, `throwClassOfS5`: every play's class is the old one, except DESPERATION
 *     plays whose last status at or before the decision is CLEAN and whose best read is at 30 or more,
 *     which read CLEAN_EXPIRY, and those only. The view's counts are the old counts with that move.
 */
import { describe, expect, it } from "vitest";
import { stableDigest } from "../src/harness/digest.js";
import { armById, type ArmId } from "../src/pocket/arms.js";
import type { ThrowClass } from "../src/pocket/constructs.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES, type GoldenLeague } from "../src/pocket/golden.js";
import { POCKET_1_S2_PINS } from "../src/pocket/s2Pins.js";
import { POCKET_1_S3_PINS } from "../src/pocket/s3Pins.js";
import { POCKET_1_S4_PINS } from "../src/pocket/s4Pins.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { CLEAN_EXPIRY_BAR, dropbacksOf, lastStatusAtOrBefore, throwClassOf, throwClassOfS5 } from "../src/pocket/throwClass.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 10;

type PinSet = "S2" | "S3" | "S4";
type Counts = Partial<Record<ThrowClass, number>>;
type Table = Record<PinSet, Record<string, Record<GoldenLeague, Counts>>>;

/**
 * The old function's counts at 517002e, before step 5's view: the whole table's `stableDigest` (by
 * pin set, arm, league and class), each pin set's, and each set's totals by league.
 */
const BEFORE: Readonly<Record<10 | 50, { readonly digest: string; readonly bySet: Readonly<Record<PinSet, string>>; readonly totals: Readonly<Record<PinSet, Readonly<Record<GoldenLeague, Counts>>>> }>> = {
  10: {
    digest: "fnv1a:ec9cd258",
    bySet: { S2: "fnv1a:5099bb99", S3: "fnv1a:8862957a", S4: "fnv1a:0e735267" },
    totals: {
      S2: {
        flat: { CHECKDOWN: 1155, DESPERATION: 442, ON_THE_RUN: 16, PROGRESSION: 2868, RANK_PUSHED: 886, SACK: 240, SCRAMBLE: 292, THROWAWAY: 1097 },
        gen: { CHECKDOWN: 816, DESPERATION: 817, ON_THE_RUN: 24, PROGRESSION: 3544, RANK_PUSHED: 964, SACK: 289, SCRAMBLE: 79, THROWAWAY: 633 },
      },
      S3: {
        flat: { CHECKDOWN: 2752, DESPERATION: 1033, ON_THE_RUN: 55, PROGRESSION: 6727, RANK_PUSHED: 2169, SACK: 372, SCRAMBLE: 407, THROWAWAY: 2630 },
        gen: { CHECKDOWN: 1801, DESPERATION: 1825, ON_THE_RUN: 89, PROGRESSION: 8374, RANK_PUSHED: 2350, SACK: 471, SCRAMBLE: 110, THROWAWAY: 1549 },
      },
      S4: {
        flat: { CHECKDOWN: 2151, DESPERATION: 941, ON_THE_RUN: 58, PROGRESSION: 6716, RANK_PUSHED: 2114, SACK: 811, SCRAMBLE: 1231, THROWAWAY: 2704 },
        gen: { CHECKDOWN: 2026, DESPERATION: 1781, ON_THE_RUN: 160, PROGRESSION: 8096, RANK_PUSHED: 2012, SACK: 876, SCRAMBLE: 533, THROWAWAY: 1661 },
      },
    },
  },
  50: {
    digest: "fnv1a:3d489bec",
    bySet: { S2: "fnv1a:91dbb8d8", S3: "fnv1a:c5a12df3", S4: "fnv1a:11bd98a5" },
    totals: {
      S2: {
        flat: { CHECKDOWN: 5745, DESPERATION: 2256, ON_THE_RUN: 114, PROGRESSION: 14461, RANK_PUSHED: 4504, SACK: 1283, SCRAMBLE: 1336, THROWAWAY: 5822 },
        gen: { CHECKDOWN: 4457, DESPERATION: 3983, ON_THE_RUN: 117, PROGRESSION: 17564, RANK_PUSHED: 5144, SACK: 1320, SCRAMBLE: 442, THROWAWAY: 3353 },
      },
      S3: {
        flat: { CHECKDOWN: 13470, DESPERATION: 5461, ON_THE_RUN: 268, PROGRESSION: 33744, RANK_PUSHED: 10857, SACK: 2185, SCRAMBLE: 2012, THROWAWAY: 13829 },
        gen: { CHECKDOWN: 9834, DESPERATION: 9122, ON_THE_RUN: 320, PROGRESSION: 41443, RANK_PUSHED: 12466, SACK: 2028, SCRAMBLE: 672, THROWAWAY: 7936 },
      },
      S4: {
        flat: { CHECKDOWN: 10636, DESPERATION: 5267, ON_THE_RUN: 344, PROGRESSION: 33991, RANK_PUSHED: 10577, SACK: 4203, SCRAMBLE: 5742, THROWAWAY: 13310 },
        gen: { CHECKDOWN: 9921, DESPERATION: 8904, ON_THE_RUN: 554, PROGRESSION: 40086, RANK_PUSHED: 11206, SACK: 4512, SCRAMBLE: 2677, THROWAWAY: 8528 },
      },
    },
  },
};

const PIN_SETS: readonly (readonly [PinSet, readonly ArmId[]])[] = [
  ["S2", Object.keys(POCKET_1_S2_PINS.arms) as ArmId[]],
  ["S3", Object.keys(POCKET_1_S3_PINS.arms) as ArmId[]],
  ["S4", Object.keys(POCKET_1_S4_PINS.arms) as ArmId[]],
];

const bump = (c: Counts, k: ThrowClass): void => {
  c[k] = (c[k] ?? 0) + 1;
};
const sorted = (c: Counts): Counts => Object.fromEntries(Object.entries(c).sort(([a], [b]) => (a < b ? -1 : 1))) as Counts;

/** The old function's table and the view's, filled arm by arm by the cases below, then read whole by the last test. */
const OLD = Object.fromEntries(PIN_SETS.map(([set]) => [set, {}])) as Table;
const S5 = Object.fromEntries(PIN_SETS.map(([set]) => [set, {}])) as Table;

const totalsOf = (t: Table, set: PinSet, league: GoldenLeague): Counts => {
  const out: Counts = {};
  for (const arm of Object.values(t[set])) for (const [k, n] of Object.entries(arm[league])) out[k as ThrowClass] = (out[k as ThrowClass] ?? 0) + (n ?? 0);
  return sorted(out);
};

describe(`step 5's class view on the golden games of the s2, s3 and s4 pins (first ${String(FIRST)} a league)`, () => {
  const cases = PIN_SETS.flatMap(([set, arms]) => arms.map((id) => [set, id] as const));
  it.each(cases)(
    "%s %s: the view moves only clean DESPERATION throws with someone at 30 or more, to CLEAN_EXPIRY; the old function has no CLEAN_EXPIRY",
    (set, id) => {
      const { tunables } = armById(id);
      OLD[set][id] = { flat: {}, gen: {} };
      S5[set][id] = { flat: {}, gen: {} };
      const otherwise: string[] = [];
      const notDefined: string[] = [];
      for (const league of GOLDEN_LEAGUES) {
        const o: Counts = {};
        const v: Counts = {};
        let moved = 0;
        goldenGames(league, (game) => {
          for (const d of dropbacksOf(game.events)) {
            const a = throwClassOf(d, tunables);
            const b = throwClassOfS5(d, tunables);
            bump(o, a.cls);
            bump(v, b.cls);
            if (a.cls === b.cls) continue;
            if (a.cls === "DESPERATION" && b.cls === "CLEAN_EXPIRY") {
              moved += 1;
              const decision = [...d.decisions].reverse().find((x) => x.choice === "THROW")!;
              const status = lastStatusAtOrBefore(d, decision.tick);
              const clean = status === undefined || status === "CLEAN";
              if (!(clean && b.best !== undefined && b.bar !== undefined && b.best >= CLEAN_EXPIRY_BAR && b.best < b.bar)) notDefined.push(`${league} ${d.playId}`);
            } else otherwise.push(`${league} ${d.playId}: ${a.cls} became ${b.cls}`);
          }
        }, { tunables, callerVersion: STEP1_CALLER, first: FIRST });
        OLD[set][id]![league] = sorted(o);
        S5[set][id]![league] = sorted(v);
        expect(o.CLEAN_EXPIRY, `${league}: CLEAN_EXPIRY under the old function`).toBeUndefined();
        expect(v.CLEAN_EXPIRY ?? 0, league).toBe(moved);
        expect(sorted({ ...v, DESPERATION: (v.DESPERATION ?? 0) + moved, CLEAN_EXPIRY: 0 }), league).toEqual(sorted({ ...o, DESPERATION: o.DESPERATION ?? 0, CLEAN_EXPIRY: 0 }));
        process.stdout.write(`pocketThrowClassS5Pins ${set} ${id} ${league}: ${String(FIRST)} games, DESPERATION ${String(o.DESPERATION ?? 0)}, of them CLEAN_EXPIRY under the view ${String(moved)}
`);
      }
      expect(otherwise).toEqual([]);
      expect(notDefined).toEqual([]);
    },
    10 * 60_000,
  );

  it("the old function's counts, every arm and league, equal those at 517002e before the view: no class steps 1 to 4 read has moved", () => {
    const before = BEFORE[FIRST];
    for (const [set, arms] of PIN_SETS) expect(Object.keys(OLD[set]).sort(), `${set}: every arm was played (run the whole file)`).toEqual([...arms].sort());
    for (const [set] of PIN_SETS) for (const league of GOLDEN_LEAGUES) expect(totalsOf(OLD, set, league), `${set} ${league}`).toEqual(before.totals[set][league]);
    for (const [set] of PIN_SETS) expect(stableDigest(OLD[set]), set).toBe(before.bySet[set]);
    expect(stableDigest(OLD)).toBe(before.digest);
    // The view is exercised: today's builds throw clean desperation balls with someone at 30 or more.
    const moved = PIN_SETS.reduce((a, [set]) => a + GOLDEN_LEAGUES.reduce((b, league) => b + (totalsOf(S5, set, league).CLEAN_EXPIRY ?? 0), 0), 0);
    expect(moved).toBeGreaterThan(0);
  });
});
