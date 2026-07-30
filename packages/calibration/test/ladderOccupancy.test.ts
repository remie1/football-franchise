/**
 * THE LADDER OCCUPANCY GATE — free tier, runs on every push.
 *
 * The whole instrument is arithmetic over `DEFAULT_TUNABLES` (d100 is uniform; the difference of two
 * d100s is triangular), so there is no corpus here and no seeds. `ladderOccupancy.measure.test.ts`
 * carries the empirical half, whose only job is to FALSIFY this file's one restatement — the tier
 * walk — and to confirm the shift buckets the corpus really produces.
 *
 * What is asserted:
 *
 *  1. **The ladder is a partition.** Seventeen tiers (ADR-052/053 widened it from nine — the
 *     ratified engine-scope ladder, ADR-053), contiguous intervals, occupancies summing to 1. A
 *     ladder whose tiers overlap or gap is a mis-specification no probability can be read off.
 *  2. **The canonical rows are pinned** — what a tier means on a perfectly even roll of each form.
 *     These are the numbers the owner's ruling rests on and they must not move silently.
 *  3. **The per-check surface is pinned**, so a term added to any resolver's stack (which moves a
 *     check's shift, which moves its tier occupancies) is a deliberate change.
 *  4. **`levelInvariant` is pinned per check.** That column is the flat-league trap: it says whether
 *     a number read off the flat-60 corpus is a property of the ladder or of the fixture, and
 *     getting it backwards is what backlog entry 49 warns about.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import {
  FLAT_LEVEL,
  LADDER_READERS_WITHOUT_SCALE,
  LEVELS,
  canonicalOccupancies,
  ladderOrder,
  ladderTiers,
  renderLadderOccupancy,
  renderTierAcrossLevels,
  sweepLadderOccupancy,
  tierOfMargin,
  uniformOccupancy,
  triangularOccupancy,
} from "../src/knownTruth/ladderOccupancy.js";

const p3 = (x: number | undefined): string => (100 * (x ?? 0)).toFixed(3);

describe("result-tier ladder — occupancy", () => {
  it("is a seventeen-tier contiguous partition of the margin line", () => {
    const tiers = ladderTiers();
    // ⛔ PINNED, NOT DERIVED, AND DELIBERATELY SO. `ladderTiers()` is `rows.map(...)` over
    // `DEFAULT_TUNABLES.resultTierLadder` one-to-one — comparing its length back against
    // `resultTierLadder.length` here would be a tautology that cannot fail (Charter §4.1's
    // fourth shape). 17 is ADR-052/053's ratified engine-scope rung count, restated as a fact
    // about the committed tree rather than re-derived from the same array. What reddens this:
    // a future re-banding of `resultTierLadder` (the independent, non-tautological cross-check
    // against `ResultTier`'s own cardinality lives below, in "prints the reports").
    expect(tiers).toHaveLength(17);
    expect(tiers[0]?.ceiling).toBe(Number.POSITIVE_INFINITY);
    expect(tiers[16]?.floor).toBe(Number.NEGATIVE_INFINITY);
    for (let i = 1; i < tiers.length; i++) {
      // No gap and no overlap: each tier's ceiling is exactly one below the tier above's floor.
      expect(tiers[i]?.ceiling, `tier ${String(i)}`).toBe((tiers[i - 1]?.floor ?? 0) - 1);
    }
    // The bounded rungs' widths, which is where the shape of the thing lives. ADR-053's lattice
    // is a flat 15-wide step outward from STRONG_SUCCESS/STRONG_FAILURE on both sides (floors
    // 30/45/60/75/90 and their mirror) around the untouched interior (10, 4, 1, 4, 10) — the
    // interior is unchanged from the pre-ratification ladder because only floors above 30 moved.
    expect(tiers.slice(1, 16).map((t) => t.width)).toEqual([
      15, 15, 15, 15, 15, 10, 4, 1, 4, 10, 15, 15, 15, 15, 15,
    ]);
  });

  it("assigns every margin in [-200, 200] to exactly the tier the ladder's floors imply", () => {
    for (let m = -200; m <= 200; m++) {
      const tier = tierOfMargin(m);
      const row = ladderTiers().find((t) => t.tier === tier);
      expect(row, `margin ${String(m)}`).toBeDefined();
      expect(m >= (row?.floor ?? 0) && m <= (row?.ceiling ?? 0), `margin ${String(m)} in ${tier}`).toBe(true);
    }
  });

  it("produces probability distributions — every check's nine tiers sum to 1", () => {
    for (const shift of [-99, -40, -12, 0, 12, 40, 99]) {
      for (const occ of [uniformOccupancy(shift), triangularOccupancy(shift)]) {
        const total = [...occ.values()].reduce((a, b) => a + b, 0);
        expect(Math.abs(total - 1), `shift ${String(shift)}`).toBeLessThan(1e-12);
      }
    }
    for (const row of sweepLadderOccupancy()) {
      const total = [...row.occupancy.values()].reduce((a, b) => a + b, 0);
      expect(Math.abs(total - 1), `${row.kind}:${row.variant}`).toBeLessThan(1e-12);
    }
  });

  /**
   * ⛔ THE HEADLINE, AND THE DISTINCTION THE RECORD HAS BEEN CONFLATING.
   *
   * On a perfectly even OPPOSED roll `STRONG_SUCCESS` OCCUPIES 11.700% of resolutions. The 36.550%
   * figure quoted throughout ADR-049 and `scaleSurface.ts` is P(margin ≥ 15) — `STRONG_SUCCESS` AND
   * everything above it together, because a `minMargin` band row is open above and a ladder TIER is
   * not. `STRONG_SUCCESS` is untouched by ADR-052/053's re-banding (its floor 15/ceiling 29 never
   * moved), so this figure holds exactly as before.
   *
   * ⚠ **THE SECOND SENTENCE THIS COMMENT USED TO MAKE IS NOW FALSE, AND THAT IS THE FIX WORKING.**
   * On the PRE-ratification nine-rung ladder, `CRITICAL_SUCCESS` was the open top rung and absorbed
   * everything past ±30 — MODAL at 24.850%, which is exactly the defect ADR-050 measured and the
   * owner ruled against (`ladderTail.ts`'s `PRE_RATIFICATION_LADDER` / `IMPOSSIBILITY`). On the
   * RATIFIED seventeen-rung ladder below, `CRITICAL_SUCCESS` is an interior BOUNDED rung (floor 60,
   * ceiling 74) at 4.950%, and the new open extremes (`TOTAL_SUCCESS` / `TOTAL_FAILURE`, floor ±90)
   * are the RAREST tiers on the ladder at 0.550% each — tail monotonicity holding by construction.
   * No tier is modal at a quarter of resolutions anymore; the widest tiers are `STRONG_SUCCESS` /
   * `STRONG_FAILURE` at 11.700%, unchanged from before.
   */
  it("pins the canonical even-roll occupancies of both forms", () => {
    const { opposedEven, targetOnTheNumber } = canonicalOccupancies();
    expect(ladderOrder().map((t) => `${t} ${p3(opposedEven.get(t))}`)).toMatchInlineSnapshot(`
      [
        "TOTAL_SUCCESS 0.550",
        "OVERWHELMING_SUCCESS 2.700",
        "CRITICAL_SUCCESS 4.950",
        "DOMINANT_SUCCESS 7.200",
        "DECISIVE_SUCCESS 9.450",
        "STRONG_SUCCESS 11.700",
        "SUCCESS 9.050",
        "MARGINAL_SUCCESS 3.900",
        "TIE 1.000",
        "MARGINAL_FAILURE 3.900",
        "FAILURE 9.050",
        "STRONG_FAILURE 11.700",
        "DECISIVE_FAILURE 9.450",
        "DOMINANT_FAILURE 7.200",
        "CRITICAL_FAILURE 4.950",
        "OVERWHELMING_FAILURE 2.700",
        "TOTAL_FAILURE 0.550",
      ]
    `);
    // ⚠ This snapshot was NOT reported by the ADR-053 dispatch's test run — the assertion above it
    // in this same `it` throws on mismatch and vitest never reaches this one. Computed fresh rather
    // than left stale: `CRITICAL_SUCCESS`'s floor moved 30 → 60 (open → bounded, ceiling 74), so its
    // TARGET-form occupancy (its width in a 100-wide uniform window, clipped) drops from the OLD
    // open rung's 71.000 (window [30,100], width 71) to the new bounded rung's 15.000 (window
    // [60,74], width 15, entirely inside [1,100]). `TOTAL_SUCCESS` is now the open top rung and
    // reads its own clipped width, 11.000 (window [90,100]).
    expect(ladderOrder().map((t) => `${t} ${p3(targetOnTheNumber.get(t))}`)).toMatchInlineSnapshot(`
      [
        "TOTAL_SUCCESS 11.000",
        "OVERWHELMING_SUCCESS 15.000",
        "CRITICAL_SUCCESS 15.000",
        "DOMINANT_SUCCESS 15.000",
        "DECISIVE_SUCCESS 15.000",
        "STRONG_SUCCESS 15.000",
        "SUCCESS 10.000",
        "MARGINAL_SUCCESS 4.000",
        "TIE 0.000",
        "MARGINAL_FAILURE 0.000",
        "FAILURE 0.000",
        "STRONG_FAILURE 0.000",
        "DECISIVE_FAILURE 0.000",
        "DOMINANT_FAILURE 0.000",
        "CRITICAL_FAILURE 0.000",
        "OVERWHELMING_FAILURE 0.000",
        "TOTAL_FAILURE 0.000",
      ]
    `);
  });

  /**
   * The cumulative agrees with `scaleSurface`'s independently written `pOpposed`, which is the check
   * on the check: two functions, different shapes (one sums a cumulative, one sums a partition),
   * same number.
   */
  it("reproduces scaleSurface's 36.6% as a CUMULATIVE, not an occupancy", () => {
    const rows = sweepLadderOccupancy();
    const power = rows.find((r) => r.kind === "pass_rush_tick" && r.variant === "POWER");
    expect(p3(power?.occupancy.get("STRONG_SUCCESS"))).toBe("11.700");
    expect(p3(power?.cumulative.get("STRONG_SUCCESS"))).toBe("36.550");
  });

  /**
   * ⛔ WHY EVERY TARGET ROW IN THE TABLE READS THE SAME SEVEN NUMBERS.
   *
   * A TARGET margin is uniform on a 100-wide window. The ladder's seven BOUNDED tiers span
   * [−29, 29] — 59 points — so whenever the window covers that span entirely, each bounded tier's
   * occupancy is exactly its WIDTH in percent (15 / 10 / 4 / 1 / 4 / 10 / 15) and the shift moves
   * probability only between the two OPEN rungs.
   *
   * The window covers [−29, 29] iff `1 + shift ≤ −29` and `100 + shift ≥ 29`, i.e. **shift ∈
   * [−71, −30]**. That interval is asserted here with both its edges, because "the middle of the
   * ladder is shift-invariant" is the claim the whole cross-check comparison rests on and it is
   * NOT true everywhere: `catch` at −83 clips `STRONG_SUCCESS` to 3%, and `field_goal` at −10 clips
   * four tiers to zero.
   */
  it("pins the shift interval over which a TARGET check's seven bounded tiers read their widths", () => {
    const widths = { STRONG_SUCCESS: 0.15, SUCCESS: 0.1, MARGINAL_SUCCESS: 0.04, TIE: 0.01, MARGINAL_FAILURE: 0.04, FAILURE: 0.1, STRONG_FAILURE: 0.15 } as const;
    for (let shift = -71; shift <= -30; shift++) {
      const occ = uniformOccupancy(shift);
      for (const [tier, w] of Object.entries(widths)) {
        expect(occ.get(tier as keyof typeof widths), `shift ${String(shift)} ${tier}`).toBeCloseTo(w, 12);
      }
    }
    // Both edges are TIGHT — one step outside and a bounded tier is clipped by the window.
    expect(uniformOccupancy(-72).get("STRONG_SUCCESS")).toBeCloseTo(0.14, 12);
    expect(uniformOccupancy(-29).get("STRONG_FAILURE")).toBeCloseTo(0.14, 12);
  });

  it("pins the per-check even-contest surface", () => {
    // ⛔ Re-recorded (`vitest -u`) for ADR-052/053, and reviewed rather than transcribed: `CS=`
    // is every check's `CRITICAL_SUCCESS` occupancy, and that column's ceiling is now 15.000 —
    // `CRITICAL_SUCCESS` moved from the open top rung (unbounded, could read as high as 71.000 on
    // a TARGET check parked on top of it) to a bounded 15-wide interior rung (floor 60, ceiling
    // 74), so no row can exceed the rung's own width in percent. `SS=` (`STRONG_SUCCESS`) and
    // `>=15=` (the cumulative at its floor) are UNCHANGED row for row — that boundary never moved.
    // What reddens this: a term added to any resolver's stack (moves a check's shift) or the
    // ladder re-banding again.
    const rows = sweepLadderOccupancy();
    const flat = LEVELS.indexOf(FLAT_LEVEL);
    expect(
      rows.map(
        (r) =>
          `${r.variant === "" ? r.kind : `${r.kind}:${r.variant}`} ` +
          `${r.form[0] ?? "?"} shift=${String(r.shifts[flat])} ` +
          `SS=${p3(r.occupancy.get("STRONG_SUCCESS"))} CS=${p3(r.occupancy.get("CRITICAL_SUCCESS"))} ` +
          `>=15=${p3(r.cumulative.get("STRONG_SUCCESS"))} ${r.levelInvariant ? "inv" : "LEVEL-VARIANT"}`,
      ),
    ).toMatchSnapshot();
  });

  it("pins which checks are LEVEL-INVARIANT — the flat-league trap, per check", () => {
    const rows = sweepLadderOccupancy();
    // Which checks are level-invariant is a property of TERM SYMMETRY (same count, same divisors on
    // both stacks), not of the ladder — re-banding `resultTierLadder` cannot move a check from one
    // list to the other, and it did not: this first snapshot is untouched by ADR-052/053.
    expect(rows.filter((r) => r.levelInvariant).map((r) => (r.variant === "" ? r.kind : `${r.kind}:${r.variant}`)).sort())
      .toMatchSnapshot();
    // ⛔ Re-recorded (`vitest -u`) for ADR-052/053. `levelSpread` is the largest swing ANY tier's
    // occupancy takes across `LEVELS`, and for most of these checks that tier is `CRITICAL_SUCCESS`
    // — now capped at a 15-point-wide rung instead of the old open one, so every spread driven by
    // it shrank (e.g. `field_goal` 40.0pp → 17.0pp, `deflection_recovery` 100.0pp → 41.0pp). Sanity
    // check: no value here exceeds 41.0pp, consistent with the widest bounded rung anywhere on the
    // ladder being 15 points (open-rung-driven spreads are bounded by "up to 100% minus whatever the
    // rest of the window claims", which is what still lets `deflection_recovery` read above 15).
    expect(
      rows
        .filter((r) => !r.levelInvariant)
        .map((r) => `${r.variant === "" ? r.kind : `${r.kind}:${r.variant}`} spread=${(100 * r.levelSpread).toFixed(1)}pp`)
        .sort(),
    ).toMatchSnapshot();
  });

  it("records the ladder readers the scale surface cannot describe", () => {
    // Both emit CHECKs through `game/specialTeams.ts`'s `distanceCheck`, which calls `tierFor`, and
    // both are pinned UNIMPLEMENTED by `scaleSurface.test.ts`. That pin is about SCALE, not about
    // producers, and the difference matters the moment anyone censuses tiers.
    expect([...LADDER_READERS_WITHOUT_SCALE].sort()).toEqual(["kick_return", "punt"]);
  });

  it("prints the reports", () => {
    const rows = sweepLadderOccupancy();
    console.log(`\n${renderLadderOccupancy(rows)}\n`);
    console.log(`\n${renderTierAcrossLevels(rows, "STRONG_SUCCESS")}\n`);
    console.log(`\n${renderTierAcrossLevels(rows, "STRONG_SUCCESS", true)}\n`);
    console.log(`\n${renderTierAcrossLevels(rows, "CRITICAL_SUCCESS")}\n`);
  });

  /**
   * ⛔ MOVED OUT OF "prints the reports", where it had no relation to printing — a stray assertion
   * parked in an unrelated test hides its own subject as much as a stale number does.
   *
   * ⚠ **CONSIDERED AND REJECTED: deriving this from `ResultTier`'s own cardinality.** `ByTier<T>`
   * (`@ff/contracts`) is a mapped type over every `ResultTier` member with no index signature —
   * instantiating one and reading `Object.keys(...).length` would be a genuinely non-tautological
   * cross-check (the engine tree and the contracts union are two independently authored artifacts;
   * nothing structural forces them to agree). Its own doc comment forbids exactly that
   * instantiation: *"NOTHING INSTANTIATES THIS TODAY, AND THAT IS DELIBERATE (ADR-053 §6) … Use it
   * the moment such a site exists. Do not manufacture one."* Building one here to pass this test
   * would be manufacturing the site that ruling named. So: PINNED, not derived — 17 is ADR-052/053's
   * ratified rung count, restated with the reason attached rather than left as a bare integer.
   *
   * What reddens it: `resultTierLadder` gaining or losing a rung. What it will NOT catch: that
   * count drifting from `ResultTier`'s own member count — a mismatched literal elsewhere in the
   * repo would not compile (`ResultTier` is a closed union), and `bandTableGate.test.ts`'s note
   * that `vitest run` does not typecheck `test/` is exactly why `pnpm typecheck` runs alongside
   * this suite rather than being substituted for it.
   */
  it("resultTierLadder carries the ratified seventeen rungs", () => {
    expect(DEFAULT_TUNABLES.resultTierLadder).toHaveLength(17);
  });
});
