/**
 * THE LADDER-TAIL DERIVATION GATE — free tier, runs on every push.
 *
 * Everything here is arithmetic over `DEFAULT_TUNABLES` and over ladders `ladderTail.ts` builds.
 * There is no corpus and there are no seeds, for the same reason `ladderOccupancy.test.ts` has none:
 * a firing probability on a d100 is derivable exactly, and a derivation beats a sample.
 *
 * ⛔ **RE-POINTED (July 2026, ADR-052/053 ratified the seventeen-rung ladder).** This file used to
 * gate a CANDIDATE against a nine-rung committed ladder that failed the owner's property everywhere.
 * That candidate is now what `DEFAULT_TUNABLES.resultTierLadder` holds. So the assertions that
 * used to read "the committed ladder violates the property at every shift" are now FALSE — they
 * described the ladder this module argued against, not the one that replaced it. Per Charter §4.1's
 * retirement-disposal corollary they are CONVERTED into frozen historical regressions against
 * `preRatificationLadder()` rather than deleted, and the live gates now assert `committedLadder()` —
 * the tree as it actually stands — at the ENGINE'S OWN SHIFT SET (`ENGINE_OPPOSED_SHIFTS`), never
 * shift 0 alone.
 *
 * ⚠ **THE ONE THING A DERIVATION CANNOT CHECK IS ITSELF.** This file's survival functions are a
 * SECOND implementation of arithmetic `ladderOccupancy.ts` already publishes — closed-form here,
 * summed there. A second source of truth is checked rather than trusted: the first test compares
 * them on the committed ladder at every integer shift in [−200, 200], on all seventeen rungs, and one
 * disagreement is red.
 *
 * The six claims from `ladderTail.ts`'s red table are asserted below, in its order, re-pointed at
 * the ratified tree.
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
  REJECTED_NAMING,
  REJECTED_RULES,
  RUSHER_WINS_REP_INVARIANT,
  admissibleSet,
  boundedSpan,
  committedLadder,
  derivedLadder,
  engineShifts,
  mirroredLadder,
  mixtureOccupancy,
  monotoneShiftBand,
  occupancy,
  preRatificationLadder,
  preRatificationSuccessFloors,
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

  /**
   * RED CLAIM 2, RE-POINTED: the committed ladder is the one that was DERIVED, not merely quoted.
   * `derivedLadder` reconstructs it from the frozen pre-ratification base and the derivation's own
   * floors, entirely independent of the live tunables tree; if the two disagree on even one rung,
   * this throws (a bad `floors`/`naming` pairing) or fails (a mismatched label or floor) rather than
   * drifting quietly. This is the direct replacement for the old "derives the frozen floors" claim.
   */
  it("derives the pre-ratification floors, and the committed ladder is the one that was derived from them", () => {
    expect(preRatificationSuccessFloors()).toEqual([1, 5, 15, 30]);
    expect(preRatificationLadder().map((r) => r.floor)).toEqual([30, 15, 5, 1, 0, -4, -14, -29, Number.NEGATIVE_INFINITY]);

    expect(DEFAULT_TUNABLES.resultTierLadder).toHaveLength(17);
    expect(committedLadder().map((r) => [r.label, r.floor])).toEqual([
      ["TOTAL_SUCCESS", 90],
      ["OVERWHELMING_SUCCESS", 75],
      ["CRITICAL_SUCCESS", 60],
      ["DOMINANT_SUCCESS", 45],
      ["DECISIVE_SUCCESS", 30],
      ["STRONG_SUCCESS", 15],
      ["SUCCESS", 5],
      ["MARGINAL_SUCCESS", 1],
      ["TIE", 0],
      ["MARGINAL_FAILURE", -4],
      ["FAILURE", -14],
      ["STRONG_FAILURE", -29],
      ["DECISIVE_FAILURE", -44],
      ["DOMINANT_FAILURE", -59],
      ["CRITICAL_FAILURE", -74],
      ["OVERWHELMING_FAILURE", -89],
      ["TOTAL_FAILURE", Number.NEGATIVE_INFINITY],
    ]);

    // The independent reconstruction — frozen base + derivation, no read of DEFAULT_TUNABLES at all
    // — agrees with the live tree rung for rung. This is the module's actual "did not drift" gate.
    expect(derivedLadder("OUTER", DERIVED_SUCCESS_FLOORS_ENGINE_SCOPE)).toEqual(committedLadder());
    expect(derivedLadder("OUTER")).toEqual(committedLadder()); // engine scope is now the default
  });

  /**
   * RED CLAIM 3, RE-POINTED: §7.1's mixture is ADR-050's. The historical numbers (21.055 /
   * 10.816 / 8.458 / 29.365) were measured against the PRE-ratification ladder and are falsified
   * against it, unchanged, as a regression. The ratified tree carries the same facts under the
   * renamed/re-partitioned rungs — `STRONG_SUCCESS` and everything at or inside ±29 is untouched by
   * the re-banding, so its 10.816%/8.458% are identical; the mass that used to be the open
   * `CRITICAL_SUCCESS`/`CRITICAL_FAILURE` rungs is now `DECISIVE_SUCCESS`'s/`STRONG_FAILURE`'s
   * CUMULATIVE (`atOrAbove`), because bounding the rung above floor 30 cannot move how much mass
   * clears floor 30 — the same invariance `RUSHER_WINS_REP_INVARIANT` states for floor 15.
   */
  it("reproduces ADR-050's §7.1 mixture on the pre-ratification ladder, and the same facts on the committed one", () => {
    const histMix = mixtureOccupancy(preRatificationLadder());
    const histBy = (label: string): string => p3(histMix.find((r) => r.label === label)?.occupancy ?? 0);
    expect(histBy("CRITICAL_SUCCESS")).toBe("21.055");
    expect(histBy("STRONG_SUCCESS")).toBe("10.816");
    expect(histBy("SUCCESS")).toBe("8.458");
    expect(histBy("CRITICAL_FAILURE")).toBe("29.365");
    expect(PASS_RUSH_MIXTURE.reduce((a, b) => a + b.weight, 0)).toBeCloseTo(1, 12);

    const mix = mixtureOccupancy(committedLadder());
    const cum = (label: string): string => p3(mix.find((r) => r.label === label)?.atOrAbove ?? 0);
    const occ = (label: string): string => p3(mix.find((r) => r.label === label)?.occupancy ?? 0);
    expect(cum("DECISIVE_SUCCESS")).toBe("21.055"); // P(margin >= 30), same mass, renamed rung
    expect(occ("STRONG_SUCCESS")).toBe("10.816"); // [15, 29] untouched
    expect(occ("SUCCESS")).toBe("8.458"); // [5, 14] untouched
    // P(margin <= -30): the tail below STRONG_FAILURE that the old open CRITICAL_FAILURE absorbed.
    const strongFailureCum = mix.find((r) => r.label === "STRONG_FAILURE")?.atOrAbove ?? 0;
    expect(p3(1 - strongFailureCum)).toBe("29.365");
  });

  /**
   * ⛔ THE DEFECT AS IT STOOD, RESTATED AS A FROZEN HISTORICAL REGRESSION.
   *
   * The PRE-ratification ladder was not monotone at ANY shift — its band was empty, which is
   * stronger than "not monotone on an even contest": there was no fixture anywhere at which its
   * extreme rungs were rarer than the ones beneath them. This is exactly what ADR-050/052 argued
   * against and it is kept, unchanged, as the regression that justified the re-banding — it is a
   * claim about `preRatificationLadder()`, not about `committedLadder()`, and the two must not be
   * confused (see the next test).
   */
  it("shows the PRE-ratification ladder violated the property at every shift", () => {
    expect(tailMonotone(preRatificationLadder(), "OPPOSED", 0, PIVOTS).holds).toBe(false);
    expect(monotoneShiftBand(preRatificationLadder(), "OPPOSED").width).toBe(0);
    expect(tail(preRatificationLadder())).toMatchInlineSnapshot(`
      [
        "STRONG_SUCCESS 11.700",
        "CRITICAL_SUCCESS 24.850",
      ]
    `);
  });

  /**
   * ⛔ RED CLAIM 4: THE +1 IMPOSSIBILITY. Any (r = 1) ladder passing would redden this. Unchanged by
   * ratification — this is a fact about the frozen pre-ratification base, not about what shipped.
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
   * target exact-width window would redden this — and none exists, on the frozen base's exhaustive
   * search OR on the ladder that actually shipped.
   */
  it("proves no ladder serves both roll forms", () => {
    // Historical: ADR-050's measured window, on the ladder it was measured against.
    expect(targetExactWidthWindow(preRatificationLadder())).toEqual({ lo: -71, hi: -30, width: 42 });
    expect(boundedSpan(preRatificationLadder())).toBe(FORM_CONFLICT.preRatificationBoundedSpan);
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
    // Live: the ladder that shipped is opposed-monotone (see below) and its window IS empty, exactly
    // as the theorem predicts — this is not a defect, it is the property the owner asked for.
    expect(boundedSpan(committedLadder())).toBe(FORM_CONFLICT.ratifiedBoundedSpan);
    expect(targetExactWidthWindow(committedLadder()).width).toBe(0);
  });

  /** STRICT monotonicity on TARGET is unsatisfiable, not merely hard — equal widths, equal mass. */
  it("shows strict monotonicity is unsatisfiable on the TARGET form", () => {
    const derived = derivedLadder("OUTER"); // engine scope, the ratified ladder
    // Two 15-wide rungs inside the window read 15.000 each — equal, so no strict decrease exists.
    const rows = occupancy(derived, "TARGET", -30);
    expect(p3(rows.find((r) => r.label === "DECISIVE_SUCCESS")?.occupancy ?? 0)).toBe("15.000");
    expect(p3(rows.find((r) => r.label === "DOMINANT_SUCCESS")?.occupancy ?? 0)).toBe("15.000");
    expect(tailMonotone(derived, "TARGET", -30, PIVOTS, true).holds).toBe(false);
    expect(tailMonotone(derived, "TARGET", -30, PIVOTS, false).holds).toBe(true);
    expect(FORM_CONFLICT.strictMonotonicityOnTarget).toContain("UNSATISFIABLE");
  });

  /** The engine's own even-contest shift set — the scope the property has to be gated over. Unaffected by the re-banding: it is a fact about check structures, not about the ladder. */
  it("pins the shifts an evenly rated contest actually produces", () => {
    const opposed = engineShifts().find((f) => f.form === "OPPOSED");
    expect(opposed?.shifts).toEqual(ENGINE_OPPOSED_SHIFTS);
    const target = engineShifts().find((f) => f.form === "TARGET");
    expect(target?.min).toBe(-90);
    expect(target?.max).toBe(30);
  });

  /**
   * ⛔ RED CLAIM 6, RE-POINTED: THE COMMITTED LADDER HOLDS AT ENGINE SCOPE.
   *
   * Step 15 comes from the ladder's own outermost bounded width; the stop comes from the property;
   * the scope is the owner's (ADR-053 ruling 1, engine scope not shift 0). This is now a claim about
   * `committedLadder()` itself, computed independently via `derivedLadder`: **strictly monotone at
   * all eleven of `ENGINE_OPPOSED_SHIFTS`.** A narrowing shift band, or a single failing shift, means
   * a boundary moved from what shipped.
   */
  it("the ratified ladder is strictly tail-monotone at every one of the engine's eleven opposed shifts", () => {
    expect(OPEN_RUNG_STOP.step).toBe(15);
    expect(DERIVED_SUCCESS_FLOORS).toEqual([45, 60, 75]);
    expect(DERIVED_SUCCESS_FLOORS_ENGINE_SCOPE).toEqual([45, 60, 75, 90]);

    const derived = committedLadder(); // == derivedLadder("OUTER"), asserted above
    expect(tailMonotone(derived, "OPPOSED", 0, PIVOTS).holds).toBe(true);
    expect(monotoneShiftBand(derived, "OPPOSED")).toEqual({ lo: -24, hi: 24, width: 49 });
    expect(tail(derived)).toMatchInlineSnapshot(`
      [
        "STRONG_SUCCESS 11.700",
        "DECISIVE_SUCCESS 9.450",
        "DOMINANT_SUCCESS 7.200",
        "CRITICAL_SUCCESS 4.950",
        "OVERWHELMING_SUCCESS 2.700",
        "TOTAL_SUCCESS 0.550",
      ]
    `);
    for (const s of ENGINE_OPPOSED_SHIFTS) {
      const v = tailMonotone(derived, "OPPOSED", s, PIVOTS);
      expect(v.holds, `shift ${String(s)}`).toBe(true);
      expect(v.minGap, `shift ${String(s)} minGap`).toBeGreaterThan(0);
    }

    // ⛔ …and the REJECTED shift-0-scope candidate (three new floors, not four) does NOT survive the
    // engine's own shift set — this is WHY scope was escalated past shift 0. It fails at SIX of
    // eleven, and **±12 is §7.1's SPEED/FINESSE branch — half of every pass-rush rep played.**
    const shift0Scope = mirroredLadder(DERIVED_SUCCESS_FLOORS, { success: ["S+1", "S+2", "S+3"], failure: ["F+1", "F+2", "F+3"] });
    expect(monotoneShiftBand(shift0Scope, "OPPOSED")).toEqual({ lo: -10, hi: 10, width: 21 });
    expect(ENGINE_OPPOSED_SHIFTS.filter((s) => !tailMonotone(shift0Scope, "OPPOSED", s, PIVOTS).holds)).toEqual([
      -20, -16, -12, 12, 16, 20,
    ]);
  });

  /**
   * ⛔ `RUSHER_WINS_REP` IS INVARIANT, AND THE RULING PREDICTED IT WOULD MOVE.
   *
   * `passRush.bands` is a separate `minMargin` table. `P(margin ≥ 15)` cannot be changed by
   * re-partitioning the ladder above 15, and this asserts it to the decimal on the played mixture,
   * before and after ratification, and under the REJECTED `ADJACENT` naming too (via `mirroredLadder`
   * directly, since `ADJACENT` is no longer selectable through `derivedLadder`).
   */
  it("shows the §7.1 band rate does not move under any re-partitioning of the ladder above 15", () => {
    const cum = (l: readonly { readonly label: string }[]): string =>
      p3(mixtureOccupancy(l as never).find((r) => r.label === PIVOTS.success)?.atOrAbove ?? 0);
    expect(cum(preRatificationLadder())).toBe(RUSHER_WINS_REP_INVARIANT.pctBefore.toFixed(3));
    expect(cum(committedLadder())).toBe(RUSHER_WINS_REP_INVARIANT.pctAfter.toFixed(3));
    expect(cum(mirroredLadder(DERIVED_SUCCESS_FLOORS, REJECTED_NAMING.ADJACENT))).toBe(RUSHER_WINS_REP_INVARIANT.pctAfter.toFixed(3));
    // The TIER the owner's 10–15% window names is likewise untouched: [15, 29] never moved.
    const mix = mixtureOccupancy(committedLadder());
    expect(p3(mix.find((r) => r.label === PIVOTS.success)?.occupancy ?? 0)).toBe("10.816");
  });

  /** §7.1 as played, under the ratified ladder — the column the ruling has to be read against. */
  it("pins §7.1's played occupancy under the ratified ladder", () => {
    const mix = mixtureOccupancy(committedLadder());
    expect(mix.map((r) => `${r.label} ${p3(r.occupancy)} / cum ${p3(r.atOrAbove)}`)).toMatchInlineSnapshot(`
      [
        "TOTAL_SUCCESS 0.286 / cum 0.286",
        "OVERWHELMING_SUCCESS 1.821 / cum 2.107",
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
        "OVERWHELMING_FAILURE 3.584 / cum 98.472",
        "TOTAL_FAILURE 1.528 / cum 100.000",
      ]
    `);
  });

  /**
   * ⛔ THE LIVE CONSUMER, AND THE CONSTRAINT BINDS ON THE NAME RATHER THAN THE BOUNDARY.
   *
   * `packages/engine/test/tippedBall.test.ts` filters §12.1's "uncatchable" on
   * `accuracyTier === "CRITICAL_FAILURE"`. `match-engine` measured that a `CRITICAL_FAILURE` floor
   * at −60 moves 0 of them, at −50 moves 6, at −40 moves 22.
   *
   * No boundary moved between `OUTER` and the rejected `ADJACENT`. Only the label did, and `OUTER` —
   * the one that shipped — is the assignment whose `CRITICAL_FAILURE` floor is beyond −60.
   */
  it("records where CRITICAL_FAILURE's floor lands under each naming", () => {
    const floorOf = (l: readonly { readonly label: string; readonly floor: number }[]): number =>
      l.find((r) => r.label === "CRITICAL_FAILURE")?.floor ?? 0;
    // Historical: on the pre-ratification ladder CRITICAL_FAILURE was the open bottom rung.
    expect(floorOf(preRatificationLadder())).toBe(Number.NEGATIVE_INFINITY);
    // The rejected naming, reachable only through mirroredLadder directly — never through derivedLadder.
    expect(floorOf(mirroredLadder(DERIVED_SUCCESS_FLOORS, REJECTED_NAMING.ADJACENT))).toBe(-44); // SHORT of -60 — the conflict, unshaded.
    // What shipped.
    expect(floorOf(derivedLadder("OUTER"))).toBe(-74); // beyond -60 — moves zero live consumers.
    expect(floorOf(committedLadder())).toBe(-74);
    expect(NAMING.OUTER.criticalAt).toBe("[60, 74] / [-74, -60]");
    expect(REJECTED_NAMING.ADJACENT.criticalAt).toBe("[30, 44] / [-44, -30]");
  });

  /**
   * `derivedLadder` no longer accepts `ADJACENT` — Task 2's owner ruling: a naming a caller could
   * reach for by habit must not be selectable by passing a string that happens to match. This is a
   * COMPILE-TIME guarantee (`keyof typeof NAMING` is the literal `"OUTER"`), asserted here as a
   * runtime backstop in case a future edit widens the type without meaning to.
   */
  it("does not expose ADJACENT as a selectable naming", () => {
    expect(Object.keys(NAMING)).toEqual(["OUTER"]);
    expect("ADJACENT" in NAMING).toBe(false);
    expect(REJECTED_NAMING.ADJACENT).toBeDefined();
  });

  /**
   * `derivedLadder` throws rather than invent a rung name — the retired `ABSOLUTE_SUCCESS_N`
   * generator does not survive under a smaller alias. A ladder short of names is a loud failure, not
   * a placeholder that looks like a decision.
   */
  it("throws rather than pad a name when floors and naming disagree in length", () => {
    expect(() => derivedLadder("OUTER", DERIVED_SUCCESS_FLOORS)).toThrow(/no rung is padded with an invented name/);
    expect(() => derivedLadder("OUTER", [45, 60, 75, 90, 105])).toThrow(/no rung is padded with an invented name/);
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
    const derived = committedLadder();
    // eslint-disable-next-line no-console
    console.log(`\n${renderLadder(preRatificationLadder(), "OPPOSED", 0, "PRE-RATIFICATION")}\n`);
    // eslint-disable-next-line no-console
    console.log(`\n${renderLadder(derived, "OPPOSED", 0, "RATIFIED (OUTER naming, engine scope)")}\n`);
    // eslint-disable-next-line no-console
    console.log(`\n${renderLadder(derived, "TARGET", -30, "RATIFIED, TARGET at shift -30")}\n`);
    const targetShifts = engineShifts().find((f) => f.form === "TARGET")?.shifts ?? [];
    const ok = targetCompliantShifts(derived, targetShifts);
    // eslint-disable-next-line no-console
    console.log(
      `TARGET shifts NON-STRICTLY compliant: pre-ratification ${String(targetCompliantShifts(preRatificationLadder(), targetShifts).length)}` +
        `/${String(targetShifts.length)}, ratified ${String(ok.length)}/${String(targetShifts.length)}; ` +
        `still failing: ${targetShifts.filter((s) => !ok.includes(s)).join(",")}`,
    );
    expect(boundedSpan(derived)).toBe(179);
    // The pre-ratification ladder was compliant at ZERO of the engine's thirty target shifts; the
    // ratified one at 28. The two that remain are checks whose stack sits far ABOVE its target — a
    // rating quantity, which no ladder can reach.
    expect(targetCompliantShifts(preRatificationLadder(), targetShifts)).toHaveLength(0);
    expect(ok.length).toBe(28);
    const bad = new Set(targetShifts.filter((s) => !ok.includes(s)));
    const blamed = ladderStructures()
      .filter((s) => s.form === "TARGET")
      .flatMap((s) => LEVELS.map((l) => ({ kind: s.kind, level: l, shift: shiftAt(s, l) })))
      .filter((x) => bad.has(x.shift));
    // eslint-disable-next-line no-console
    console.log(`  owed to: ${blamed.map((b) => `${b.kind}@R${String(b.level)}=${String(b.shift)}`).join(", ")}`);
  });
});
