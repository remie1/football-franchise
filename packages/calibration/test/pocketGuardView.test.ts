/**
 * ADR-089 step 5 — THE GUARD READS ITS CLASS VIEW (AM-8, `filing.md` §3.1: "`guardAm1.ts` reads the
 * view"; plan §3).
 *
 *  1. `guardClassView` and `guardClassifier`: a rule naming no view (AM-1, AM-3, AM-6) reads
 *     `throwClassOf`; a rule naming "S5" reads `throwClassOfS5`.
 *  2. `isFreshBase` reads `rule.freshBases` (AM-8's E0); `skipsEqualDials` skips a pair only when the
 *     rule says so and the two overlay digests are equal.
 *  3. The guard's class mixes take the classifier: on D1's golden games (the first 5 a league),
 *     `foldGuardGame` and `guardGameVector` under the view hold the same throws as under
 *     `throwClassOf`, with some DESPERATION throws moved to CLEAN_EXPIRY and nothing else moved; the
 *     moved throws leave DESPERATION's halves (read at the release, so a throw clean at the decision
 *     and dirty at the release would leave the DIRTY half; on these games all leave the CLEAN half).
 *     With no classifier passed both read as before.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { armById } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES } from "../src/pocket/golden.js";
import { guardClassifier, guardClassView, isFreshBase, skipsEqualDials } from "../src/pocket/guardAm1.js";
import { guardGameVector, s2ContextOf, type GuardCell, type GuardGameVector } from "../src/pocket/s2Stream.js";
import { emptyGuardFold, foldGuardGame, type GuardFold } from "../src/pocket/step0.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { throwClassOf, throwClassOfS5 } from "../src/pocket/throwClass.js";

describe("the class view a guard rule names", () => {
  it("reads throwClassOf with no view and throwClassOfS5 with S5", () => {
    expect(guardClassView({})).toBeUndefined();
    expect(guardClassifier({})).toBe(throwClassOf);
    expect(guardClassView({ classView: "S5" })).toBe("S5");
    expect(guardClassifier({ classView: "S5" })).toBe(throwClassOfS5);
  });

  it("plays a base fresh only when the rule names it in freshBases", () => {
    const rule = { freshBases: { E0: "played fresh and twice" } };
    expect(isFreshBase(rule, "E0")).toBe(true);
    expect(isFreshBase(rule, "D1")).toBe(false);
    expect(isFreshBase({}, "E0")).toBe(false);
  });

  it("skips a pair only when the rule says so and the two overlay digests are equal", () => {
    expect(skipsEqualDials({ skipEqualDials: true }, "fnv1a:0000000a", "fnv1a:0000000a")).toBe(true);
    expect(skipsEqualDials({ skipEqualDials: true }, "fnv1a:0000000a", "fnv1a:0000000b")).toBe(false);
    expect(skipsEqualDials({ skipEqualDials: false }, "fnv1a:0000000a", "fnv1a:0000000a")).toBe(false);
    expect(skipsEqualDials({}, "fnv1a:0000000a", "fnv1a:0000000a")).toBe(false);
  });
});

const aimed = (c: { aimedByBin: readonly number[] }): number => c.aimedByBin.reduce((a, b) => a + b, 0);

describe("the guard's class mixes under step 5's view (D1's golden games, the first 5 a league)", () => {
  it("move only DESPERATION throws to CLEAN_EXPIRY, out of DESPERATION's halves", () => {
    const { tunables } = armById("D1");
    const before = emptyGuardFold();
    const byDefault = emptyGuardFold();
    const view = emptyGuardFold();
    const vOld: GuardGameVector[] = [];
    const vView: GuardGameVector[] = [];
    const vDefault: GuardGameVector[] = [];
    for (const league of GOLDEN_LEAGUES) {
      goldenGames(
        league,
        (o, snapshot) => {
          const events: readonly MatchEventEnvelope[] = o.events;
          const ctx = s2ContextOf(tunables, snapshot);
          foldGuardGame(before, events, tunables, throwClassOf);
          foldGuardGame(byDefault, events, tunables);
          foldGuardGame(view, events, tunables, throwClassOfS5);
          guardGameVector(vOld, events, ctx, throwClassOf);
          guardGameVector(vDefault, events, ctx);
          guardGameVector(vView, events, ctx, throwClassOfS5);
        },
        { tunables, callerVersion: STEP1_CALLER, first: 5 },
      );
    }
    // No classifier passed reads as throwClassOf.
    expect(byDefault).toEqual(before);
    expect(vDefault).toEqual(vOld);

    // The view moves some DESPERATION throws to CLEAN_EXPIRY and nothing else.
    expect(aimed(before.CLEAN_EXPIRY)).toBe(0);
    const moved = aimed(view.CLEAN_EXPIRY);
    expect(moved).toBeGreaterThan(0);
    expect(aimed(view.DESPERATION)).toBe(aimed(before.DESPERATION) - moved);
    for (const cls of Object.keys(before) as (keyof GuardFold)[]) {
      if (cls === "DESPERATION" || cls === "CLEAN_EXPIRY") continue;
      expect(view[cls], cls).toEqual(before[cls]);
    }
    const sum = (a: GuardFold[keyof GuardFold], b: GuardFold[keyof GuardFold]) => ({
      aimedByBin: a.aimedByBin.map((n, i) => n + (b.aimedByBin[i] ?? 0)),
      interceptions: a.interceptions + b.interceptions,
      completions: a.completions + b.completions,
    });
    expect(sum(view.DESPERATION, view.CLEAN_EXPIRY)).toEqual(before.DESPERATION);

    // Game by game: the same games; the moved throws leave the CLEAN half, the DIRTY half is untouched.
    expect(vView.map((g) => g.gameId)).toEqual(vOld.map((g) => g.gameId));
    let movedByGame = 0;
    let cleanOnly = 0;
    const zero: GuardCell = { aimedByBin: [], interceptions: 0, completions: 0 };
    for (const [i, g] of vView.entries()) {
      const o = vOld[i]!;
      const m = aimed(g.classes.CLEAN_EXPIRY ?? zero);
      movedByGame += m;
      // The halves read the release tick, the view the decision's: a throw clean at the decision and
      // dirty at the release would leave the DIRTY half. Neither half grows; together they lose m.
      const half = (v: GuardGameVector, h: "CLEAN" | "DIRTY"): number => aimed(v.desperation[h] ?? zero);
      expect(half(g, "CLEAN"), g.gameId).toBeLessThanOrEqual(half(o, "CLEAN"));
      expect(half(g, "DIRTY"), g.gameId).toBeLessThanOrEqual(half(o, "DIRTY"));
      expect(half(g, "CLEAN") + half(g, "DIRTY"), g.gameId).toBe(half(o, "CLEAN") + half(o, "DIRTY") - m);
      if (half(g, "DIRTY") === half(o, "DIRTY")) cleanOnly += m;
      expect(aimed(g.classes.DESPERATION ?? zero), g.gameId).toBe(aimed(o.classes.DESPERATION ?? zero) - m);
      for (const cls of Object.keys(o.classes) as (keyof GuardFold)[]) if (cls !== "DESPERATION") expect(g.classes[cls], `${g.gameId} ${cls}`).toEqual(o.classes[cls]);
    }
    expect(movedByGame).toBe(moved);
    // On these games every moved throw was clean at the release too: it left the CLEAN half.
    expect(cleanOnly).toBe(moved);
    console.log(`pocketGuardView D1, first 5 a league: DESPERATION ${String(aimed(before.DESPERATION))} aimed, of them CLEAN_EXPIRY under the view ${String(moved)}`);
  }, 300_000);
});
