/**
 * THE LADDER-TAIL DERIVATION GATE — free tier, runs on every push.
 *
 * Everything here is arithmetic over `DEFAULT_TUNABLES` and over CANDIDATE ladders that do not
 * exist yet. There is no corpus and there are no seeds, for the same reason `ladderOccupancy.test.ts`
 * has none: a firing probability on a d100 is derivable exactly, and a derivation beats a sample.
 *
 * ⚠ **THE ONE THING A DERIVATION CANNOT CHECK IS ITSELF.** This file's survival functions are a
 * SECOND implementation of arithmetic `ladderOccupancy.ts` already publishes — closed-form here,
 * summed there. A second source of truth is checked rather than trusted: the first test compares
 * them on the committed ladder at every integer shift in [−200, 200], on all nine rungs, and one
 * disagreement is red.
 *
 * The six claims from `ladderTail.ts`'s red table are asserted below, in its order.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import {
  LEVELS,
  ladderOrder,
  ladderStructures,
  shiftAt,
  triangularOccupancy,
  uniformOccupancy,
} from "../src/knownTruth/ladderOccupancy.js";
import {
  DERIVED_SUCCESS_FLOORS,
  DERIVED_SUCCESS_FLOORS_ENGINE_SCOPE,
  ENGINE_OPPOSED_SHIFTS,
  FORM_CONFLICT,
  IMPOSSIBILITY,
  NAMING,
  OPEN_RUNG_STOP,
  PASS_RUSH_MIXTURE,
  PIVOTS,
  REJECTED_RULES,
  RUSHER_WINS_REP_INVARIANT,
  admissibleSet,
  boundedSpan,
  committedLadder,
  committedSuccessFloors,
  derivedLadder,
  engineShifts,
  mirroredLadder,
  mixtureOccupancy,
  monotoneShiftBand,
  occupancy,
  renderLadder,
  tailMonotone,
  targetCompliantShifts,
  targetExactWidthWindow,
} from "../src/knownTruth/ladderTail.js";

const p3 = (x: number): string => (100 * x).toFixed(3);

function tail(ladder: readonly { readonly label: string }[], shift = 0): string[] {
  const rows = occupancy(ladder as never, "OPPOSED", shift);
  const pivot = rows.findIndex((r) => r.label === PIVOTS.success);
  return rows
    .slice(0, pivot + 1)
    .reverse()
    .map((r) => `${r.label} ${p3(r.occupancy)}`);
}

describe("ladder tail — the derivation", () => {
  /** RED CLAIM 1: the survival functions are the same arithmetic ADR-050 gated. */
  it("agrees with ladderOccupancy on every rung at every shift in [-200, 200]", () => {
    const committed = committedLadder();
    for (let shift = -200; shift <= 200; shift++) {
      const tri = triangularOccupancy(shift);
      const uni = uniformOccupancy(shift);
      const mineT = occupancy(committed, "OPPOSED", shift);
      const mineU = occupancy(committed, "TARGET", shift);
      for (const t of ladderOrder()) {
        expect(mineT.find((r) => r.label === t)?.occupancy, `OPPOSED ${String(shift)} ${t}`).toBeCloseTo(tri.get(t) ?? 0, 12);
        expect(mineU.find((r) => r.label === t)?.occupancy, `TARGET ${String(shift)} ${t}`).toBeCloseTo(uni.get(t) ?? 0, 12);
      }
    }
  });

  /** RED CLAIM 2: the committed ladder is the one being fixed — derived, so this throws not drifts. */
  it("derives the frozen floors from the tunables tree", () => {
    expect(committedSuccessFloors()).toEqual([1, 5, 15, 30]);
    expect(DEFAULT_TUNABLES.resultTierLadder).toHaveLength(9);
    // The mirror is the committed one and is NOT symmetric in the floors.
    expect(committedLadder().map((r) => r.floor)).toEqual([30, 15, 5, 1, 0, -4, -14, -29, Number.NEGATIVE_INFINITY]);
  });

  /** RED CLAIM 3: §7.1's mixture is ADR-050's — falsified BEFORE any candidate is priced with it. */
  it("reproduces ADR-050's committed §7.1 mixture to three decimals", () => {
    const mix = mixtureOccupancy(committedLadder());
    const by = (label: string): string => p3(mix.find((r) => r.label === label)?.occupancy ?? 0);
    expect(by("CRITICAL_SUCCESS")).toBe("21.055");
    expect(by("STRONG_SUCCESS")).toBe("10.816");
    expect(by("SUCCESS")).toBe("8.458");
    expect(by("CRITICAL_FAILURE")).toBe("29.365");
    expect(PASS_RUSH_MIXTURE.reduce((a, b) => a + b.weight, 0)).toBeCloseTo(1, 12);
  });

  /**
   * ⛔ THE DEFECT, RESTATED AS THE PROPERTY IT VIOLATES.
   *
   * The committed ladder is not monotone at ANY shift — its band is empty. That is stronger than
   * "it is not monotone on an even contest": there is no fixture anywhere at which the committed
   * ladder's extreme rungs are rarer than the ones beneath them.
   */
  it("shows the committed ladder violates the property at every shift", () => {
    expect(tailMonotone(committedLadder(), "OPPOSED", 0, PIVOTS).holds).toBe(false);
    expect(monotoneShiftBand(committedLadder(), "OPPOSED").width).toBe(0);
    expect(tail(committedLadder())).toMatchInlineSnapshot(`
      [
        "STRONG_SUCCESS 11.700",
        "CRITICAL_SUCCESS 24.850",
      ]
    `);
  });

  /**
   * ⛔ RED CLAIM 4: THE +1 IMPOSSIBILITY. Any (r = 1) ladder passing would redden this.
   *
   * The closed form and the exhaustive search are made to agree, because either one alone is a
   * claim about the other's blind spot: `24.850 > 2 × 11.700` is the reason, and "0 of 69 integer
   * boundaries pass" is the demonstration.
   */
  it("proves one new rung per side cannot satisfy the property, by argument and by search", () => {
    expect(IMPOSSIBILITY.massAboveThirty).toBeGreaterThan(IMPOSSIBILITY.supOfDecreasingSplit(2));
    expect(admissibleSet(1)).toHaveLength(0);
    expect(IMPOSSIBILITY.minimumRungsAbovePivot).toBe(3);
    // The best a single split can do — still above the pivot on both new rungs.
    const best = mirroredLadder([IMPOSSIBILITY.bestSingleSplit.boundary], { success: ["X_S"], failure: ["X_F"] });
    expect(tail(best)).toMatchInlineSnapshot(`
      [
        "STRONG_SUCCESS 11.700",
        "CRITICAL_SUCCESS 12.600",
        "X_S 12.250",
      ]
    `);
  });

  /**
   * ⛔ RED CLAIM 5: THE SPAN THEOREM. A ladder that is both opposed-monotone and has a non-empty
   * target exact-width window would redden this — and none exists.
   */
  it("proves no ladder serves both roll forms", () => {
    expect(targetExactWidthWindow(committedLadder())).toEqual({ lo: -71, hi: -30, width: 42 });
    expect(boundedSpan(committedLadder())).toBe(FORM_CONFLICT.committedBoundedSpan);
    expect(FORM_CONFLICT.minTopFloorForOpposedMonotonicity).toBeGreaterThan(FORM_CONFLICT.maxTopFloorForTargetExactWidth);
    for (const r of [2, 3]) {
      for (const a of admissibleSet(r)) {
        const top = a.floors[a.floors.length - 1] ?? 0;
        expect(top, `r=${String(r)} floors ${a.floors.join(",")}`).toBeGreaterThanOrEqual(
          FORM_CONFLICT.minTopFloorForOpposedMonotonicity,
        );
        const ladder = mirroredLadder(a.floors, {
          success: a.floors.map((_, i) => `S${String(i)}`),
          failure: a.floors.map((_, i) => `F${String(i)}`),
        });
        expect(targetExactWidthWindow(ladder).width, `r=${String(r)} floors ${a.floors.join(",")}`).toBe(0);
      }
    }
  });

  /** STRICT monotonicity on TARGET is unsatisfiable, not merely hard — equal widths, equal mass. */
  it("shows strict monotonicity is unsatisfiable on the TARGET form", () => {
    const derived = derivedLadder("OUTER");
    // Two 15-wide rungs inside the window read 15.000 each — equal, so no strict decrease exists.
    const rows = occupancy(derived, "TARGET", -30);
    expect(p3(rows.find((r) => r.label === "DECISIVE_SUCCESS")?.occupancy ?? 0)).toBe("15.000");
    expect(p3(rows.find((r) => r.label === "DOMINANT_SUCCESS")?.occupancy ?? 0)).toBe("15.000");
    expect(tailMonotone(derived, "TARGET", -30, PIVOTS, true).holds).toBe(false);
    expect(tailMonotone(derived, "TARGET", -30, PIVOTS, false).holds).toBe(true);
    expect(FORM_CONFLICT.strictMonotonicityOnTarget).toContain("UNSATISFIABLE");
  });

  /** The engine's own even-contest shift set — the scope the property has to be gated over. */
  it("pins the shifts an evenly rated contest actually produces", () => {
    const opposed = engineShifts().find((f) => f.form === "OPPOSED");
    expect(opposed?.shifts).toEqual(ENGINE_OPPOSED_SHIFTS);
    const target = engineShifts().find((f) => f.form === "TARGET");
    expect(target?.min).toBe(-90);
    expect(target?.max).toBe(30);
  });

  /**
   * ⛔ RED CLAIM 6: THE DERIVED LADDER. Its monotone shift band narrowing means a boundary moved.
   *
   * Step 15 comes from the ladder's own outermost bounded width; the stop comes from the property.
   * Nothing here is a chosen number, and the two scopes differ only in the shift the stop is
   * evaluated at.
   */
  it("derives the tail boundaries and pins their occupancies", () => {
    expect(OPEN_RUNG_STOP.step).toBe(15);
    expect(DERIVED_SUCCESS_FLOORS).toEqual([45, 60, 75]);
    expect(DERIVED_SUCCESS_FLOORS_ENGINE_SCOPE).toEqual([45, 60, 75, 90]);

    const derived = derivedLadder("OUTER");
    expect(tailMonotone(derived, "OPPOSED", 0, PIVOTS).holds).toBe(true);
    expect(monotoneShiftBand(derived, "OPPOSED")).toEqual({ lo: -10, hi: 10, width: 21 });
    expect(tail(derived)).toMatchInlineSnapshot(`
      [
        "STRONG_SUCCESS 11.700",
        "DECISIVE_SUCCESS 9.450",
        "DOMINANT_SUCCESS 7.200",
        "CRITICAL_SUCCESS 4.950",
        "TOTAL_SUCCESS 3.250",
      ]
    `);

    const wide = derivedLadder("OUTER", DERIVED_SUCCESS_FLOORS_ENGINE_SCOPE);
    expect(monotoneShiftBand(wide, "OPPOSED")).toEqual({ lo: -24, hi: 24, width: 21 * 0 + 49 });
    for (const s of ENGINE_OPPOSED_SHIFTS) {
      expect(tailMonotone(wide, "OPPOSED", s, PIVOTS).holds, `shift ${String(s)}`).toBe(true);
    }
    // ⛔ …and the shift-0-scope ladder does NOT survive the engine's own shift set. It fails at SIX
    // of eleven, and **−12 is §7.1's SPEED/FINESSE branch — half of every pass-rush rep played.**
    // That is the finding that makes the scope a ruling rather than a detail.
    expect(ENGINE_OPPOSED_SHIFTS.filter((s) => !tailMonotone(derived, "OPPOSED", s, PIVOTS).holds)).toEqual([
      -20, -16, -12, 12, 16, 20,
    ]);
  });

  /**
   * ⛔ `RUSHER_WINS_REP` IS INVARIANT, AND THE RULING PREDICTS IT WILL MOVE.
   *
   * `passRush.bands` is a separate `minMargin` table. `P(margin ≥ 15)` cannot be changed by
   * re-partitioning the ladder above 15, and this asserts it to the decimal on the played mixture.
   */
  it("shows the §7.1 band rate does not move under any of the derived ladders", () => {
    const cum = (l: readonly { readonly label: string }[]): string =>
      p3(mixtureOccupancy(l as never).find((r) => r.label === PIVOTS.success)?.atOrAbove ?? 0);
    expect(cum(committedLadder())).toBe(RUSHER_WINS_REP_INVARIANT.pctBefore.toFixed(3));
    expect(cum(derivedLadder("OUTER"))).toBe(RUSHER_WINS_REP_INVARIANT.pctAfter.toFixed(3));
    expect(cum(derivedLadder("ADJACENT"))).toBe(RUSHER_WINS_REP_INVARIANT.pctAfter.toFixed(3));
    expect(cum(derivedLadder("OUTER", DERIVED_SUCCESS_FLOORS_ENGINE_SCOPE))).toBe("31.871");
    // The TIER the owner's 10–15% window names is likewise untouched: [15, 29] never moved.
    const mix = mixtureOccupancy(derivedLadder("OUTER"));
    expect(p3(mix.find((r) => r.label === PIVOTS.success)?.occupancy ?? 0)).toBe("10.816");
  });

  /** §7.1 as played, under the derived ladder — the column the ruling has to be read against. */
  it("pins §7.1's played occupancy under the derived ladder", () => {
    const mix = mixtureOccupancy(derivedLadder("OUTER"));
    expect(mix.map((r) => `${r.label} ${p3(r.occupancy)} / cum ${p3(r.atOrAbove)}`)).toMatchInlineSnapshot(`
      [
        "TOTAL_SUCCESS 2.107 / cum 2.107",
        "CRITICAL_SUCCESS 4.066 / cum 6.173",
        "DOMINANT_SUCCESS 6.316 / cum 12.489",
        "DECISIVE_SUCCESS 8.566 / cum 21.055",
        "STRONG_SUCCESS 10.816 / cum 31.871",
        "SUCCESS 8.458 / cum 40.329",
        "MARGINAL_SUCCESS 3.661 / cum 43.990",
        "TIE 0.940 / cum 44.930",
        "MARGINAL_FAILURE 3.759 / cum 48.689",
        "FAILURE 9.362 / cum 58.051",
        "STRONG_FAILURE 12.584 / cum 70.635",
        "DECISIVE_FAILURE 10.334 / cum 80.969",
        "DOMINANT_FAILURE 8.084 / cum 89.053",
        "CRITICAL_FAILURE 5.834 / cum 94.887",
        "TOTAL_FAILURE 5.113 / cum 100.000",
      ]
    `);
  });

  /**
   * ⛔ THE LIVE CONSUMER, AND THE CONSTRAINT BINDS ON THE NAME RATHER THAN THE BOUNDARY.
   *
   * `packages/engine/test/tippedBall.test.ts` filters §12.1's "uncatchable" on
   * `accuracyTier === "CRITICAL_FAILURE"` — 55 of 371 accuracy checks. `match-engine` measured that
   * a `CRITICAL_FAILURE` floor at −60 moves 0 of them, at −50 moves 6, at −40 moves 22.
   *
   * No boundary moves between the two namings. Only the label does, and the OUTER assignment is the
   * one whose `CRITICAL_FAILURE` floor is beyond −60.
   */
  it("records where CRITICAL_FAILURE's floor lands under each naming", () => {
    const floorOf = (l: readonly { readonly label: string; readonly floor: number }[]): number =>
      l.find((r) => r.label === "CRITICAL_FAILURE")?.floor ?? 0;
    expect(floorOf(committedLadder())).toBe(Number.NEGATIVE_INFINITY);
    expect(floorOf(derivedLadder("ADJACENT"))).toBe(-44); // SHORT of -60 — the conflict, unshaded.
    expect(floorOf(derivedLadder("OUTER"))).toBe(-74); // beyond -60 — moves zero live consumers.
    expect(NAMING.OUTER.criticalAt).toBe("[60, 74] / [-74, -60]");
  });

  /**
   * The rejections are the evidence that no boundary was picked to hit a rate.
   *
   * ⚠ **ASSERTED, NOT SNAPSHOTTED.** A snapshot records whatever was there and regenerates under
   * `-u`, which is the exact failure mode this whole ADR exists to fix: a value that moved without
   * anyone deciding it should. Six named rules, each pinned by the thing that makes it a
   * compensation, so deleting one is a visible edit to a test rather than a silent re-record.
   */
  it("records every rule that was tried and refused", () => {
    const rules = REJECTED_RULES.map((r) => r.rule).join(" | ");
    expect(REJECTED_RULES).toHaveLength(6);
    expect(rules).toContain("target rate");
    expect(rules).toContain("Constant HAZARD");
    expect(rules).toContain("Constant DENSITY RATIO");
    expect(rules).toContain("Extrapolate the committed width sequence");
    expect(rules).toContain("Quantiles of the triangular");
    expect(rules).toContain("Minimum-departure width");
    // The two that are INFEASIBLE rather than merely unprincipled say so.
    expect(REJECTED_RULES.filter((r) => r.why.includes("INFEASIBLE") || r.why.includes("never terminates"))).toHaveLength(2);
  });

  it("prints the reports", () => {
    const derived = derivedLadder("OUTER");
    // eslint-disable-next-line no-console
    console.log(`\n${renderLadder(committedLadder(), "OPPOSED", 0, "COMMITTED")}\n`);
    // eslint-disable-next-line no-console
    console.log(`\n${renderLadder(derived, "OPPOSED", 0, "DERIVED (OUTER naming, shift-0 scope)")}\n`);
    // eslint-disable-next-line no-console
    console.log(`\n${renderLadder(derived, "TARGET", -30, "DERIVED, TARGET at shift -30")}\n`);
    const targetShifts = engineShifts().find((f) => f.form === "TARGET")?.shifts ?? [];
    const ok = targetCompliantShifts(derived, targetShifts);
    // eslint-disable-next-line no-console
    console.log(
      `TARGET shifts NON-STRICTLY compliant: committed ${String(targetCompliantShifts(committedLadder(), targetShifts).length)}` +
        `/${String(targetShifts.length)}, derived ${String(ok.length)}/${String(targetShifts.length)}; ` +
        `still failing: ${targetShifts.filter((s) => !ok.includes(s)).join(",")}`,
    );
    expect(boundedSpan(derived)).toBe(149);
    // The committed ladder is compliant at ZERO of the engine's thirty target shifts; the derived
    // one at 26. The four that remain are the checks whose stack sits far ABOVE its target — a
    // rating quantity, which no ladder can reach.
    expect(targetCompliantShifts(committedLadder(), targetShifts)).toHaveLength(0);
    expect(ok.length).toBe(26);
    const bad = new Set(targetShifts.filter((s) => !ok.includes(s)));
    const blamed = ladderStructures()
      .filter((s) => s.form === "TARGET")
      .flatMap((s) => LEVELS.map((l) => ({ kind: s.kind, level: l, shift: shiftAt(s, l) })))
      .filter((x) => bad.has(x.shift));
    // eslint-disable-next-line no-console
    console.log(`  owed to: ${blamed.map((b) => `${b.kind}@R${String(b.level)}=${String(b.shift)}`).join(", ")}`);
  });
});
