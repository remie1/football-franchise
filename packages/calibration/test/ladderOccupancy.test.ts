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
 *  1. **The ladder is a partition.** Nine tiers, contiguous intervals, occupancies summing to 1.
 *     A ladder whose tiers overlap or gap is a mis-specification no probability can be read off.
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
  it("is a nine-tier contiguous partition of the margin line", () => {
    const tiers = ladderTiers();
    expect(tiers).toHaveLength(9);
    expect(tiers[0]?.ceiling).toBe(Number.POSITIVE_INFINITY);
    expect(tiers[8]?.floor).toBe(Number.NEGATIVE_INFINITY);
    for (let i = 1; i < tiers.length; i++) {
      // No gap and no overlap: each tier's ceiling is exactly one below the tier above's floor.
      expect(tiers[i]?.ceiling, `tier ${String(i)}`).toBe((tiers[i - 1]?.floor ?? 0) - 1);
    }
    // The bounded rungs' widths, which is where the shape of the thing lives.
    expect(tiers.slice(1, 8).map((t) => t.width)).toEqual([15, 10, 4, 1, 4, 10, 15]);
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
   * `CRITICAL_SUCCESS` together, because a `minMargin` band row is open above and a ladder TIER is
   * not.
   *
   * And the number that has never been quoted at all: `CRITICAL_SUCCESS` is the MODAL tier of the
   * ladder on this roll form, at 24.850%.
   */
  it("pins the canonical even-roll occupancies of both forms", () => {
    const { opposedEven, targetOnTheNumber } = canonicalOccupancies();
    expect(ladderOrder().map((t) => `${t} ${p3(opposedEven.get(t))}`)).toMatchInlineSnapshot(`
      [
        "CRITICAL_SUCCESS 24.850",
        "STRONG_SUCCESS 11.700",
        "SUCCESS 9.050",
        "MARGINAL_SUCCESS 3.900",
        "TIE 1.000",
        "MARGINAL_FAILURE 3.900",
        "FAILURE 9.050",
        "STRONG_FAILURE 11.700",
        "CRITICAL_FAILURE 24.850",
      ]
    `);
    expect(ladderOrder().map((t) => `${t} ${p3(targetOnTheNumber.get(t))}`)).toMatchInlineSnapshot(`
      [
        "CRITICAL_SUCCESS 71.000",
        "STRONG_SUCCESS 15.000",
        "SUCCESS 10.000",
        "MARGINAL_SUCCESS 4.000",
        "TIE 0.000",
        "MARGINAL_FAILURE 0.000",
        "FAILURE 0.000",
        "STRONG_FAILURE 0.000",
        "CRITICAL_FAILURE 0.000",
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
    expect(rows.filter((r) => r.levelInvariant).map((r) => (r.variant === "" ? r.kind : `${r.kind}:${r.variant}`)).sort())
      .toMatchSnapshot();
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
    expect(DEFAULT_TUNABLES.resultTierLadder).toHaveLength(9);
  });
});
