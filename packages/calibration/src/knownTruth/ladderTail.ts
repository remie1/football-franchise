/**
 * THE LADDER'S TAIL — where "critical" starts, DERIVED from the two roll forms rather than chosen
 * to hit a rate.
 *
 * ================== THE QUESTION, AND THE ONE THING IT IS NOT ==================
 *
 * ADR-050 measured the ladder and found its only genuine mis-scaling: `CRITICAL_SUCCESS` and
 * `CRITICAL_FAILURE` are the MODAL outcomes of every symmetric opposed check, at **24.850% each**,
 * because the two extreme rungs are OPEN and absorb everything past ±30. The owner ruled that the
 * fix is the ladder's top rung and not §7.1's floor:
 *
 *   > *"'Critical' is the ladder's MODAL vocabulary. That is a naming error with a distributional
 *   > consequence, and moving §7.1's floor to 30 would paper over it while leaving every other check
 *   > reading the same open rungs."* … *"the committed 15 stays exactly where it is."*
 *
 * and stated the target as a PROPERTY:
 *
 *   > **the extreme rungs must be RARER than the ones beneath them.**
 *
 * ⛔ **THIS MODULE MAY NOT PICK A BOUNDARY TO HIT A RATE.** Every rejected rule is recorded in
 * `REJECTED_RULES` with the reason, because "chose the number that produced the number we wanted"
 * is the compensation pattern this package refuses everywhere else. What is allowed is:
 *
 *   1. the PROPERTY, which is an inequality and therefore defines an ADMISSIBLE SET, not a point;
 *   2. the SHAPE of the two margin distributions, which selects within that set;
 *   3. the ladder's OWN committed geometry (its outermost bounded width), which is data, not taste.
 *
 * ================== ⛔ THE TWO INSTRUCTIONS ARE ONE OPERATION ==================
 *
 * `rolls.ts`'s `bandFor` walks DESCENDING FLOORS and a row has no ceiling: **the top rung is open
 * because nothing is above it.** So "bound the extreme rungs" and "add a rung above and below" are
 * not two steps — bounding IS adding, and a ladder cannot be bounded without a new label to own the
 * mass that leaves. This module never models them separately.
 *
 * ================== WHAT IS DERIVED AND WHAT IS DECLARED ==================
 *
 * DERIVED, exactly, no sampling and no seeds:
 *   - both survival functions (d100 uniform on 1..100; the difference of two d100s triangular on
 *     [−99, 99] with mass (100 − |d|)/10000);
 *   - the occupancy of every rung of every CANDIDATE ladder at every integer shift;
 *   - the admissible set, by exhaustive integer search over boundary tuples;
 *   - the impossibility results in `IMPOSSIBILITY`, which are closed-form and are the load-bearing
 *     findings.
 *
 * DECLARED, and falsifiable:
 *   - `PASS_RUSH_MIXTURE` — §7.1's four shift buckets and their weights, which ADR-050's census
 *     DISCOVERED from the stream by an identity rather than being told. Re-stated here so the §7.1
 *     column can be recomputed under a candidate ladder; `ladderTail.test.ts` checks it reproduces
 *     ADR-050's committed 21.055 / 10.816 before any candidate is priced with it.
 *
 * ================== WHAT WOULD MAKE THIS INSTRUMENT GO RED (backlog entry 55) ==================
 *
 * | claim | what reddens it |
 * |---|---|
 * | the survival functions are the same arithmetic ADR-050 gated | either one disagreeing with `ladderOccupancy.ts` on the committed ladder, at any shift |
 * | the committed ladder is the one being fixed | `COMMITTED_TAIL` disagreeing with `DEFAULT_TUNABLES.resultTierLadder` — it is derived, so this throws rather than drifts |
 * | §7.1's mixture is ADR-050's | the mixture reproducing anything but 21.055 / 10.816 on the committed ladder |
 * | the +1 impossibility | any (r = 1) ladder passing `tailMonotone` at shift 0 |
 * | the span theorem | a ladder that is both opposed-monotone and has a non-empty target exact-width window |
 * | the derived ladder | its monotone shift band narrowing, which means a boundary moved |
 */
import type { CheckKind } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { LEVELS, ladderStructures, shiftAt, type LadderForm } from "./ladderOccupancy.js";

// ---------------------------------------------------------------------------
// THE TWO MARGIN DISTRIBUTIONS, EXACTLY
// ---------------------------------------------------------------------------

/**
 * OPPOSED. `P(d100_a − d100_b ≥ k)`.
 *
 * Closed form on the triangular: for `k ≥ 0` the tail is the sum of `(100 − d)/10000` over
 * `d = k..99`, which telescopes to `u(u+1)/20000` with `u = 100 − k`. Below zero it is the
 * complement of the mirrored tail, because the distribution is symmetric about 0 and integer-valued:
 * `P(D ≥ k) = 1 − P(D ≤ k − 1) = 1 − P(D ≥ 1 − k)`.
 *
 * ⚠ The `+1` matters and is the reason `ladderOccupancy.ts` sums rather than using a closed form:
 * `T(0) = 100·101/20000 = 0.50500`, NOT 0.5, because the apex `D = 0` carries 1.000% of the mass and
 * belongs to the upper tail. `ladderTail.test.ts` checks this function against that one at every
 * integer shift in [−200, 200] rather than trusting the algebra.
 */
export function opposedAtOrAbove(k: number): number {
  if (k > 99) return 0;
  if (k >= 0) {
    const u = 100 - k;
    return (u * (u + 1)) / 20000;
  }
  return 1 - opposedAtOrAbove(1 - k);
}

/**
 * TARGET. `P(d100 + shift ≥ k)` — d100 uniform on 1..100, so the margin is uniform on a 100-wide
 * window and the survival function is a straight line clipped at both ends.
 */
export function targetAtOrAbove(k: number, shift: number): number {
  const need = k - shift; // the raw roll required
  if (need <= 1) return 1;
  if (need > 100) return 0;
  return (101 - need) / 100;
}

export function atOrAboveFor(form: LadderForm, k: number, shift: number): number {
  return form === "OPPOSED" ? opposedAtOrAbove(k - shift) : targetAtOrAbove(k, shift);
}

// ---------------------------------------------------------------------------
// CANDIDATE LADDERS
// ---------------------------------------------------------------------------

/**
 * A candidate rung. The label is a plain `string` and NOT `ResultTier` on purpose: `ResultTier` is a
 * closed union in `packages/contracts` and the whole point of this module is to price labels that do
 * not exist there yet. Nothing here is a petition; the petition is the Orchestrator's.
 */
export interface TailRung {
  readonly label: string;
  /** Inclusive lower bound. `-Infinity` on the bottom rung. */
  readonly floor: number;
}

/** Descending by floor, exactly as `bandFor` walks it. */
export type CandidateLadder = readonly TailRung[];

/**
 * The committed ladder's SUCCESS-side floors, derived from the tunables tree.
 *
 * Everything at or below 15 is FROZEN for this exercise and the freeze is a ruling, not a
 * convenience: §7.1's `minMargin = 15` stays (owner, ADR-050), and ADR-050's blessed
 * `STRONG_SUCCESS` occupancy of 11.700% / 10.816% is a statement about the interval **[15, 29]**,
 * so 30 is `STRONG_SUCCESS`'s ceiling+1 and is frozen with it. Only floors ABOVE 30 are searched.
 */
export function committedSuccessFloors(tunables: Tunables = DEFAULT_TUNABLES): readonly number[] {
  return tunables.resultTierLadder
    .map((r) => r.minMargin)
    .filter((m) => Number.isFinite(m) && m > 0)
    .sort((a, b) => a - b);
}

/**
 * Build a full, mirror-symmetric candidate ladder from the SUCCESS-side floors above 30.
 *
 * ⚠ **THE MIRROR IS THE COMMITTED ONE AND IS NOT SYMMETRIC IN THE FLOORS.** On the committed
 * ladder a success rung `[a, b]` mirrors to `[−b, −a]`, so a failure FLOOR is minus a success
 * CEILING: floors 1/5/15/30 give ceilings 4/14/29/∞ and the failure floors are −4/−14/−29/−∞. `TIE`
 * owns 0 alone, which is the single point of asymmetry and the reason `TIE` is the only rung whose
 * occupancy is the same on both roll forms.
 */
export function mirroredLadder(
  successFloorsAboveThirty: readonly number[],
  names: { readonly success: readonly string[]; readonly failure: readonly string[] },
  tunables: Tunables = DEFAULT_TUNABLES,
): CandidateLadder {
  const base = committedSuccessFloors(tunables); // [1, 5, 15, 30]
  const successFloors = [...base, ...successFloorsAboveThirty].sort((a, b) => a - b);
  const committedLabels = tunables.resultTierLadder.map((r) => r.label);
  const tie = committedLabels[4] ?? "TIE";

  // Names: the committed success labels bottom-up, then the caller's additions outward.
  const committedSuccess = [...committedLabels.slice(0, 4)].reverse(); // MARGINAL, SUCCESS, STRONG, CRITICAL
  const successNames = [...committedSuccess.slice(0, base.length), ...names.success];
  const committedFailure = committedLabels.slice(5); // MARGINAL_F, FAILURE, STRONG_F, CRITICAL_F
  const failureNames = [...committedFailure.slice(0, base.length), ...names.failure];

  const rungs: TailRung[] = [];
  for (let i = successFloors.length - 1; i >= 0; i--) {
    const floor = successFloors[i];
    const label = successNames[i];
    if (floor === undefined || label === undefined) throw new Error("ladderTail: success rung underspecified");
    rungs.push({ label, floor });
  }
  rungs.push({ label: tie, floor: 0 });
  for (let i = 0; i < successFloors.length; i++) {
    // failure floor = −(success ceiling) = −(next success floor − 1); the top one is open.
    const next = successFloors[i + 1];
    const floor = next === undefined ? Number.NEGATIVE_INFINITY : -(next - 1);
    const label = failureNames[i];
    if (label === undefined) throw new Error("ladderTail: failure rung underspecified");
    rungs.push({ label, floor });
  }
  return rungs;
}

/** The committed nine-rung ladder as a `CandidateLadder`, for the cross-check against ADR-050. */
export function committedLadder(tunables: Tunables = DEFAULT_TUNABLES): CandidateLadder {
  return tunables.resultTierLadder.map((r) => ({ label: r.label, floor: r.minMargin }));
}

// ---------------------------------------------------------------------------
// OCCUPANCY OF A CANDIDATE LADDER
// ---------------------------------------------------------------------------

export interface RungOccupancy {
  readonly label: string;
  readonly floor: number;
  /** Inclusive upper bound; `+Infinity` on the top rung. */
  readonly ceiling: number;
  /** `ceiling − floor + 1`, `Infinity` on an open rung. */
  readonly width: number;
  /** P(margin lands IN this rung). */
  readonly occupancy: number;
  /** P(margin ≥ this rung's floor) — what a `minMargin` band row selects. */
  readonly atOrAbove: number;
}

export function occupancy(
  ladder: CandidateLadder,
  form: LadderForm,
  shift: number,
): readonly RungOccupancy[] {
  const out: RungOccupancy[] = [];
  for (let i = 0; i < ladder.length; i++) {
    const rung = ladder[i];
    if (rung === undefined) continue;
    const above = ladder[i - 1];
    const ceiling = above === undefined ? Number.POSITIVE_INFINITY : above.floor - 1;
    const cum = atOrAboveFor(form, rung.floor, shift);
    const cumAbove = above === undefined ? 0 : atOrAboveFor(form, above.floor, shift);
    out.push({
      label: rung.label,
      floor: rung.floor,
      ceiling,
      width:
        Number.isFinite(rung.floor) && Number.isFinite(ceiling) ? ceiling - rung.floor + 1 : Number.POSITIVE_INFINITY,
      occupancy: cum - cumAbove,
      atOrAbove: cum,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE PROPERTY
// ---------------------------------------------------------------------------

/**
 * ⛔ **THE OWNER'S PROPERTY, STATED AS AN INEQUALITY AND NOT A NUMBER.**
 *
 * *"the extreme rungs must be RARER than the ones beneath them."* Formalised as **TAIL
 * MONOTONICITY**: reading OUTWARD from the pivot rung (the committed `STRONG_SUCCESS` /
 * `STRONG_FAILURE`), every rung must be strictly rarer than the one before it. That is stronger than
 * "the two extremes are rarer than their neighbours" and it is the right strength, because a ladder
 * that satisfies only the weak form can still have a 20% rung named `CRITICAL` sitting in the
 * middle of the tail — which is the defect, moved rather than fixed.
 *
 * ⚠ **THE PROPERTY IS NOT A PROPERTY OF THE LADDER ALONE.** It is evaluated at a (form, shift), and
 * the answer differs. That is why `monotoneShiftBand` exists and why the derivation is selected on
 * the WIDTH of that band rather than on any single shift's numbers.
 */
export interface MonotoneVerdict {
  readonly holds: boolean;
  /** Pairs (outer, inner) where occupancy failed to decrease, outward from the pivot. */
  readonly violations: readonly { readonly outer: string; readonly inner: string; readonly outerPct: number; readonly innerPct: number }[];
  /** The smallest strict decrease anywhere in the chain, in probability. 0 or less means a violation. */
  readonly minGap: number;
}

export function tailMonotone(
  ladder: CandidateLadder,
  form: LadderForm,
  shift: number,
  pivots: { readonly success: string; readonly failure: string },
  strict = true,
): MonotoneVerdict {
  const rows = occupancy(ladder, form, shift);
  const violations: MonotoneVerdict["violations"] = [];
  const mutable = violations as { outer: string; inner: string; outerPct: number; innerPct: number }[];
  let minGap = Number.POSITIVE_INFINITY;

  const walk = (chain: readonly RungOccupancy[]): void => {
    for (let i = 1; i < chain.length; i++) {
      const outer = chain[i];
      const inner = chain[i - 1];
      if (outer === undefined || inner === undefined) continue;
      const gap = inner.occupancy - outer.occupancy;
      minGap = Math.min(minGap, gap);
      if (strict ? gap <= 0 : gap < -1e-12) {
        mutable.push({ outer: outer.label, inner: inner.label, outerPct: outer.occupancy, innerPct: inner.occupancy });
      }
    }
  };

  // Success side: from the pivot upward (towards index 0), so the chain reads inner → outer.
  const sIdx = rows.findIndex((r) => r.label === pivots.success);
  if (sIdx < 0) throw new Error(`ladderTail: no success pivot ${pivots.success}`);
  walk(rows.slice(0, sIdx + 1).reverse());
  // Failure side: from the pivot downward.
  const fIdx = rows.findIndex((r) => r.label === pivots.failure);
  if (fIdx < 0) throw new Error(`ladderTail: no failure pivot ${pivots.failure}`);
  walk(rows.slice(fIdx));

  return { holds: mutable.length === 0, violations, minGap: Number.isFinite(minGap) ? minGap : 0 };
}

export const PIVOTS = { success: "STRONG_SUCCESS", failure: "STRONG_FAILURE" } as const;

/**
 * The contiguous band of SHIFTS over which tail monotonicity holds, searched outward from 0.
 *
 * **This is the selection statistic and it is the direct analogue of ADR-050's TARGET window
 * [−71, −30].** A ladder that satisfies the property at shift 0 and nowhere else has not fixed
 * anything: §7.1 alone is played at shifts 0, −12, +3 and +15, and nineteen of thirty-one structures
 * are level-variant. Breadth here is not a preference — it is the difference between a property of
 * the LADDER and a coincidence at one fixture.
 */
export function monotoneShiftBand(
  ladder: CandidateLadder,
  form: LadderForm,
  limit = 120,
): { readonly lo: number; readonly hi: number; readonly width: number } {
  if (!tailMonotone(ladder, form, 0, PIVOTS).holds) return { lo: 0, hi: -1, width: 0 };
  let lo = 0;
  while (lo > -limit && tailMonotone(ladder, form, lo - 1, PIVOTS).holds) lo--;
  let hi = 0;
  while (hi < limit && tailMonotone(ladder, form, hi + 1, PIVOTS).holds) hi++;
  return { lo, hi, width: hi - lo + 1 };
}

// ---------------------------------------------------------------------------
// THE ADMISSIBLE SET — exhaustive integer search, which IS the derivation
// ---------------------------------------------------------------------------

const PLACEHOLDER_SUCCESS = ["S+1", "S+2", "S+3", "S+4"] as const;
const PLACEHOLDER_FAILURE = ["F+1", "F+2", "F+3", "F+4"] as const;

function candidate(extra: readonly number[], tunables: Tunables = DEFAULT_TUNABLES): CandidateLadder {
  return mirroredLadder(
    extra,
    { success: PLACEHOLDER_SUCCESS.slice(0, extra.length), failure: PLACEHOLDER_FAILURE.slice(0, extra.length) },
    tunables,
  );
}

export interface Admissible {
  /** The new SUCCESS-side floors above 30, ascending. The failure side is their mirror. */
  readonly floors: readonly number[];
  /** Occupancy of every rung above the pivot, outward, on an even OPPOSED contest (%). */
  readonly tailPct: readonly number[];
  /** Width of the shift band over which the property holds, OPPOSED. */
  readonly bandWidth: number;
  readonly bandLo: number;
  readonly bandHi: number;
  /** Smallest strict decrease in the chain at shift 0, in pp. */
  readonly minGapPp: number;
  /** Span of the BOUNDED rungs, in margin points. The TARGET form's window is 100. */
  readonly boundedSpan: number;
}

/**
 * Every ladder with `r` new floors above 30 that satisfies tail monotonicity on an even OPPOSED
 * contest. Exhaustive over integer floors in (30, 99]; a floor above 99 is unreachable on the
 * opposed support and would make its rung dead rather than rare.
 */
export function admissibleSet(r: number, tunables: Tunables = DEFAULT_TUNABLES): readonly Admissible[] {
  const out: Admissible[] = [];
  const search = (prefix: readonly number[]): void => {
    if (prefix.length === r) {
      const ladder = candidate(prefix, tunables);
      if (!tailMonotone(ladder, "OPPOSED", 0, PIVOTS).holds) return;
      const rows = occupancy(ladder, "OPPOSED", 0);
      const pivot = rows.findIndex((x) => x.label === PIVOTS.success);
      const band = monotoneShiftBand(ladder, "OPPOSED");
      out.push({
        floors: [...prefix],
        tailPct: rows.slice(0, pivot).map((x) => 100 * x.occupancy).reverse(),
        bandWidth: band.width,
        bandLo: band.lo,
        bandHi: band.hi,
        minGapPp: 100 * tailMonotone(ladder, "OPPOSED", 0, PIVOTS).minGap,
        boundedSpan: boundedSpan(ladder),
      });
      return;
    }
    const last = prefix[prefix.length - 1] ?? 30;
    for (let f = last + 1; f <= 99; f++) search([...prefix, f]);
  };
  search([]);
  return out;
}

/**
 * The span of the BOUNDED rungs, in margin points, from the lowest bounded floor to the highest
 * bounded ceiling inclusive. **The committed ladder's is 59 and the TARGET window is 100** — that
 * 41-point slack is exactly ADR-050's [−71, −30] interval (42 shifts = 101 − 59).
 */
export function boundedSpan(ladder: CandidateLadder): number {
  const rows = occupancy(ladder, "OPPOSED", 0);
  const bounded = rows.filter((r) => Number.isFinite(r.floor) && Number.isFinite(r.ceiling));
  const lo = Math.min(...bounded.map((r) => r.floor));
  const hi = Math.max(...bounded.map((r) => r.ceiling));
  return hi - lo + 1;
}

/**
 * The interval of TARGET shifts over which EVERY bounded rung reads its width exactly in percent.
 * Empty (`width = 0`) as soon as `boundedSpan > 100`, because a 100-wide uniform window cannot cover
 * a wider bounded span. ADR-050 pinned this at [−71, −30] for the committed ladder.
 */
export function targetExactWidthWindow(ladder: CandidateLadder): { readonly lo: number; readonly hi: number; readonly width: number } {
  const rows = occupancy(ladder, "OPPOSED", 0);
  const bounded = rows.filter((r) => Number.isFinite(r.floor) && Number.isFinite(r.ceiling));
  const lo = Math.min(...bounded.map((r) => r.floor));
  const hi = Math.max(...bounded.map((r) => r.ceiling));
  // window is [1 + shift, 100 + shift]; needs 1 + shift ≤ lo and 100 + shift ≥ hi
  const shiftLo = hi - 100;
  const shiftHi = lo - 1;
  return { lo: shiftLo, hi: shiftHi, width: Math.max(0, shiftHi - shiftLo + 1) };
}

// ---------------------------------------------------------------------------
// THE CLOSED-FORM IMPOSSIBILITIES — the load-bearing findings
// ---------------------------------------------------------------------------

/**
 * ⛔ **WHY ONE NEW RUNG PER SIDE CANNOT WORK, AS ARITHMETIC RATHER THAN AS A SEARCH RESULT.**
 *
 * With `STRONG_SUCCESS = [15, 29]` ratified, the mass above 30 is fixed at `T(30) = 24.850%`.
 * Splitting it into two rungs `[30, B−1]` and `[B, ∞)` that are BOTH rarer than `STRONG_SUCCESS`
 * requires their sum to be under `2 × 11.700 = 23.400%`. It is 24.850%. **The deficit is 1.450pp and
 * no choice of B touches it.**
 *
 * The best a one-rung split can do is the minimax at `B = 51`: `12.600% / 12.250%`, both still above
 * `STRONG_SUCCESS`. So the owner's *"add a rung above and below"* is, at one rung, not a boundary
 * that has not been found yet — it is a structure that does not exist.
 *
 * The same argument gives the MINIMUM RUNG COUNT: `k` strictly decreasing positive numbers each
 * under 11.700% have supremum `k × 11.700%`, so `k ≥ 24.850 / 11.700 = 2.124` → **k ≥ 3 rungs above
 * `STRONG_SUCCESS`, i.e. at least TWO new rungs per side.**
 */
export const IMPOSSIBILITY = {
  massAboveThirty: 0.2485,
  pivotOccupancy: 0.117,
  /** Sup of a strictly decreasing k-term split with every term under the pivot. */
  supOfDecreasingSplit: (k: number): number => k * 0.117,
  minimumRungsAbovePivot: 3,
  /** The best one-rung split, and it still violates. */
  bestSingleSplit: { boundary: 51, criticalPct: 12.6, topPct: 12.25 },
} as const;

/**
 * ⛔ **THE TWO ROLL FORMS CANNOT BOTH BE SERVED, AND THE GAP IS EXACT.**
 *
 * - OPPOSED tail monotonicity needs the outermost BOUNDED ceiling far enough out that the open top
 *   rung is rarer than the rung beneath it. The search finds the minimum top floor is **61**.
 * - TARGET's exact-width property needs `boundedSpan ≤ 100`. With a mirrored ladder the span is
 *   `2·(topFloor − 1) + 1`, so `topFloor ≤ 50`.
 *
 * **61 > 50.** There is no ladder that is monotone on the opposed form AND has a single shift at
 * which every bounded rung reads its width on the target form. The two forms are not reconcilable by
 * a boundary and this is not something to average over: **ADR-050's clean TARGET row dies the moment
 * the ladder is made monotone, and it dies for every candidate, not for the one chosen here.**
 */
export const FORM_CONFLICT = {
  minTopFloorForOpposedMonotonicity: 61,
  maxTopFloorForTargetExactWidth: 50,
  gapInFloorPoints: 11,
  committedBoundedSpan: 59,
  targetWindowWidth: 100,
  /**
   * ⛔ **AND THE SHARPER HALF, WHICH IS NOT ABOUT SPAN AT ALL.** On the TARGET form a bounded rung's
   * occupancy IS ITS WIDTH (ADR-050 §3). So two rungs of the same width are EQUALLY likely, and
   * STRICT monotonicity is unsatisfiable on the uniform form by any constant-step ladder — not
   * narrowly, but identically. The strongest statement available on TARGET is the NON-STRICT one
   * ("no rung is more common than the one beneath it"), and even that is a property of the check's
   * SHIFT rather than of the ladder, because the shift is what clips the open rung.
   *
   * **A ladder cannot fix a target check whose stack sits 40 points off its target.** That is a
   * rating/authoring quantity, and this is the disambiguation: the modal-CRITICAL defect is a
   * MECHANIC error on opposed checks and a RATING error on target checks, and one ladder cannot
   * answer both.
   */
  strictMonotonicityOnTarget: "UNSATISFIABLE — equal widths give equal occupancy",
} as const;

/**
 * The margin shifts an EVENLY RATED contest produces on OPPOSED checks, across ADR-050's six league
 * levels, flats and traits excluded (same abstention as ADR-050 §7).
 *
 * ⚠ **THIS IS THE SCOPE QUESTION AND IT IS THE ONLY THING THE DERIVATION LEAVES OPEN.** ADR-050
 * established that *evenly rated* and *evenly matched* are different conditions: a term-asymmetric
 * check has a non-zero shift at equal ratings, and §7.1's SPEED/FINESSE branch — **half of all
 * pass-rush reps** — sits at −12 on the flat league and −20 at rating 99. So "the ladder is monotone
 * on an even contest" is a claim about a SET of shifts, not about zero, and which set is a ruling.
 */
export const ENGINE_OPPOSED_SHIFTS: readonly number[] = [-20, -16, -12, -8, -4, 0, 4, 8, 12, 16, 20];

/**
 * The rules that were tried and REFUSED, with the reason each is a compensation rather than a
 * derivation. Recorded because "state what you rejected" is the constraint, and because the next
 * reader will otherwise re-derive the same dead ends.
 */
export const REJECTED_RULES: readonly { readonly rule: string; readonly why: string }[] = [
  {
    rule: "Pick B so that CRITICAL_SUCCESS lands at a target rate (e.g. 'low single digits').",
    why: "This is choosing the number that produces the number wanted. It also over-determines: the target rate fixes both boundaries and leaves the shape with nothing to say.",
  },
  {
    rule: "Constant HAZARD — each rung takes a fixed fraction of the remaining tail.",
    why: "INFEASIBLE, not merely unprincipled. A constant retention r makes the open top rung's mass r/(1−r) of the rung below it, so r < 0.5 is needed; but the first rung's mass 0.2485(1−r) < 0.117 needs r > 0.529. The two are contradictory, so no constant-hazard ladder exists at any rung count.",
  },
  {
    rule: "Constant DENSITY RATIO across rungs, continued from STRONG_SUCCESS's own 85/71.",
    why: "Generates 42, 52, 60, 67 … and never terminates: each step retains ~69% of the tail, so the open top rung is ALWAYS the modal rung of the tail. It reproduces the defect at every truncation.",
  },
  {
    rule: "Extrapolate the committed width sequence 1, 4, 10, 15 by its increments (3, 6, 5) or ratios (4, 2.5, 1.5).",
    why: "Numerology. The sequence has no recoverable generator — second differences are 3, −1 — and any continuation is a number chosen and then justified. Rejected explicitly rather than silently.",
  },
  {
    rule: "Quantiles of the triangular (upper decile, upper 5%, ±1σ, E|D|).",
    why: "A quantile IS a target rate wearing a shape's clothes. Noted for the diagnosis only: the committed floor of 30 is the distribution's upper QUARTILE (exactly 29.79), which is the one-line statement of why CRITICAL is modal, and E|D| = 33.33 means the committed ladder calls a below-average margin 'critical'.",
  },
  {
    rule: "Minimum-departure width — take the smallest integer width above the committed 15 that passes (w = 16).",
    why: "Passes at shift 0 by 0.030pp and FAILS at every other shift: its monotone shift band is a single point. A property that holds at one fixture is the flat-league trap, not a fix.",
  },
];

// ---------------------------------------------------------------------------
// THE DERIVED LADDER
// ---------------------------------------------------------------------------

/**
 * ⛔ **THE DERIVATION, IN THREE STEPS, WITH NO FREE CONSTANT.**
 *
 * **Step 1 — the property is equivalent to a statement about WIDTHS.** On a density that is
 * decreasing in |margin| — which both roll forms are, outward from their mode — a partition into
 * rungs whose widths do not GROW outward has strictly decreasing occupancy automatically. The
 * committed ladder's widths are 1, 4, 10, 15, **∞**. It violates monotonicity for exactly one
 * reason: the last width is infinite. **Bounding the extremes is therefore not a tuning act; it is
 * restoring the ladder to the class of partitions on which the property is free.**
 *
 * **Step 2 — the STEP comes from the ladder, not from taste.** The largest width that does not
 * continue the ladder's growth is its own outermost bounded width, **15**. Any larger width invents
 * a constant the ladder does not contain (and w = 16..19 are exactly the ones that do — see
 * `REJECTED_RULES`); any smaller width invents one too, and adds rungs nobody asked for. Holding the
 * step at 15 is the unique choice that neither continues the growth nor introduces a new number, and
 * it makes the whole success side above the tie a single lattice: **15, 30, 45, 60, 75.**
 *
 * **Step 3 — the STOP comes from the property.** The open top rung `[B, ∞)` is rarer than the
 * 15-wide rung beneath it iff `2·T(B) < T(B−15)`, i.e. `u² − 29u − 240 < 0` with `u = 100 − B`,
 * i.e. **`B ≥ 65`**. The first lattice point at or past 65 is **75**. The lattice therefore stops
 * itself; nothing was chosen.
 *
 * **Step 4 — the SCOPE is the owner's, and it is the only open parameter.** Steps 1-3 are the same
 * arithmetic whatever shift the stop is evaluated at; only the answer moves. Evaluated at the
 * canonical even roll (shift 0) the lattice stops at **75**. Evaluated across every evenly-rated
 * contest the engine produces (`ENGINE_OPPOSED_SHIFTS`, worst case ±20) it stops at **90**. Both are
 * derived; neither is chosen. **The owner rules the scope, not the number.**
 *
 * Result — three new floors per side at shift-0 scope (9 → 15 rungs), four at engine scope
 * (9 → 17 rungs), mirrored in both cases.
 */
export const DERIVED_SUCCESS_FLOORS: readonly number[] = [45, 60, 75];

/** The same derivation with the stop evaluated at the worst shift in `ENGINE_OPPOSED_SHIFTS`. */
export const DERIVED_SUCCESS_FLOORS_ENGINE_SCOPE: readonly number[] = [45, 60, 75, 90];

/**
 * The minimum boundary at which an open top rung is rarer than a 15-wide rung beneath it. Derived,
 * not asserted: at shift 0, `2·u(u+1) < (u+15)(u+16)` ⟺ `u² − 29u − 240 < 0` ⟺ `u ≤ 35` ⟺ `B ≥ 65`;
 * the first 15-lattice point at or past 65 is 75. At shift +20 the same inequality reads
 * `u = 120 − B`, giving `B ≥ 85` and the first lattice point 90.
 */
export const OPEN_RUNG_STOP = {
  step: 15,
  atShiftZero: { minBoundary: 65, firstLatticePoint: 75 },
  atEngineScope: { minBoundary: 85, firstLatticePoint: 90 },
} as const;

/**
 * ⛔ **TWO LABEL ASSIGNMENTS OVER THE SAME BOUNDARIES, AND THE CHOICE IS NOT A CALIBRATION ONE.**
 *
 * The boundaries are derived and identical in both. What differs is WHERE THE WORD `CRITICAL` SITS,
 * and it matters for two reasons that point the same way:
 *
 * - **`ADJACENT`** keeps `CRITICAL` immediately outside `STRONG`, which is the owner's *"CRITICAL …
 *   now merely uncommon"* reading. It lands `CRITICAL` at **9.450%** — an order of magnitude better
 *   than 24.850%, but NOT the *"low single digits"* the same ruling asks for, and its
 *   `CRITICAL_FAILURE` floor of **−44** sits SHORT of the −60 at which `tippedBall.test.ts`'s
 *   `accuracyTier === "CRITICAL_FAILURE"` filter stops moving.
 * - **`OUTER`** puts `CRITICAL` on the third tail rung at **4.950%** — low single digits — and its
 *   `CRITICAL_FAILURE` floor of **−74** is beyond −60, so the live consumer moves by zero.
 *
 * ⚠ **This is NOT a boundary shaded to dodge a consumer.** No boundary moves between the two; the
 * label does. The constraint binds on the NAME, and that is reported rather than resolved here.
 */
export const NAMING = {
  ADJACENT: {
    success: ["DOMINANT_SUCCESS", "OVERWHELMING_SUCCESS", "TOTAL_SUCCESS"],
    failure: ["DOMINANT_FAILURE", "OVERWHELMING_FAILURE", "TOTAL_FAILURE"],
    criticalAt: "[30, 44] / [-44, -30]",
  },
  OUTER: {
    success: ["DOMINANT_SUCCESS", "CRITICAL_SUCCESS", "TOTAL_SUCCESS"],
    failure: ["DOMINANT_FAILURE", "CRITICAL_FAILURE", "TOTAL_FAILURE"],
    criticalAt: "[60, 74] / [-74, -60]",
    /** `DECISIVE_` takes the rung `CRITICAL_` vacates. */
    renamesCommittedRung: { from: "CRITICAL_SUCCESS", to: "DECISIVE_SUCCESS" },
  },
} as const;

/**
 * ⛔ **`RUSHER_WINS_REP` DOES NOT MOVE, AND THE RULING PREDICTS THAT IT WILL.**
 *
 * The owner's ruling says *"`RUSHER_WINS_REP` at 'STRONG_SUCCESS or better' lands near 10–15% per
 * rep once the tail above it is a tail."* **It does not.** `passRush.bands` is a separate
 * `minMargin` table; `P(margin ≥ 15)` is fixed by the roll and is INVARIANT under every
 * re-partition of the ladder above 15. It is **31.871%** on §7.1's played mixture before this change
 * and **31.871%** after it, to every decimal.
 *
 * What DOES sit in the owner's 10–15% window is the TIER `STRONG_SUCCESS`, at **10.816%** — and it
 * sat there before the change too, because `[15, 29]` is untouched. **This is ADR-050's tier/
 * cumulative conflation recurring inside the ruling that accepted ADR-050**, and it is flagged here
 * rather than quietly satisfied.
 */
export const RUSHER_WINS_REP_INVARIANT = { pctBefore: 31.871, pctAfter: 31.871 } as const;

/** The derived ladder under a chosen naming and scope. */
export function derivedLadder(
  naming: keyof typeof NAMING = "OUTER",
  floors: readonly number[] = DERIVED_SUCCESS_FLOORS,
  tunables: Tunables = DEFAULT_TUNABLES,
): CandidateLadder {
  const n = NAMING[naming];
  const extra = floors.length - n.success.length;
  const success = [...n.success, ...Array.from({ length: Math.max(0, extra) }, (_, i) => `ABSOLUTE_SUCCESS_${String(i + 1)}`)];
  const failure = [...n.failure, ...Array.from({ length: Math.max(0, extra) }, (_, i) => `ABSOLUTE_FAILURE_${String(i + 1)}`)];
  // ⚠ Renamed BY FLOOR, never by label: under OUTER the word `CRITICAL_SUCCESS` appears twice during
  // construction — once as the committed rung at 30 and once as the new rung at 60 — and a
  // label-keyed rename would rewrite both. That is the same class of defect as a status-keyed
  // lookup with `?? 0` (ADR-034), and it is avoided structurally rather than by ordering.
  const vacated = new Map<number, string>(
    naming === "OUTER"
      ? [
          [30, "DECISIVE_SUCCESS"],
          [-((floors[0] ?? 45) - 1), "DECISIVE_FAILURE"],
        ]
      : [],
  );
  const built = mirroredLadder(floors, { success: success.map((_, i) => `__S${String(i)}`), failure: failure.map((_, i) => `__F${String(i)}`) }, tunables);
  let si = 0;
  let fi = 0;
  return built.map((r) => {
    const renamed = vacated.get(r.floor);
    if (renamed !== undefined) return { ...r, label: renamed };
    if (r.label.startsWith("__S")) {
      const label = success[success.length - 1 - si];
      si += 1;
      return { ...r, label: label ?? r.label };
    }
    if (r.label.startsWith("__F")) {
      const label = failure[fi];
      fi += 1;
      return { ...r, label: label ?? r.label };
    }
    return r;
  });
}

/**
 * The TARGET shifts at which a ladder is NON-STRICTLY tail-monotone. Strict is unsatisfiable on the
 * uniform form (see `FORM_CONFLICT`), so this is the strongest statement the form admits, and it is
 * reported against the thirty TARGET shifts the engine actually produces.
 */
export function targetCompliantShifts(ladder: CandidateLadder, probe: readonly number[]): readonly number[] {
  return probe.filter((s) => tailMonotone(ladder, "TARGET", s, PIVOTS, false).holds);
}

// ---------------------------------------------------------------------------
// §7.1 AS PLAYED — ADR-050's discovered mixture, re-priced under a candidate
// ---------------------------------------------------------------------------

/**
 * DECLARED, from ADR-050 §4a, which DISCOVERED these four buckets from the stream by the identity
 * `shift = margin − raw + opposedRaw` rather than being told to look for them. Re-stated here so a
 * candidate ladder can be priced against §7.1 as it is actually rolled rather than against an even
 * contest that only half its reps are.
 *
 * ⚠ Falsified before use: `ladderTail.test.ts` requires this mixture to reproduce ADR-050's
 * committed 21.055% `CRITICAL_SUCCESS` and 10.816% `STRONG_SUCCESS` on the COMMITTED ladder, to
 * three decimals, before any candidate is priced with it.
 */
export const PASS_RUSH_MIXTURE: readonly { readonly shift: number; readonly weight: number; readonly branch: string }[] = [
  { shift: 0, weight: 0.49923, branch: "POWER" },
  { shift: -12, weight: 0.49534, branch: "SPEED/FINESSE" },
  { shift: 15, weight: 0.00289, branch: "POWER after stalemate" },
  { shift: 3, weight: 0.00254, branch: "SPEED/FINESSE after stalemate" },
];

export function mixtureOccupancy(ladder: CandidateLadder): readonly RungOccupancy[] {
  const base = occupancy(ladder, "OPPOSED", 0);
  return base.map((row, i) => {
    let occ = 0;
    let cum = 0;
    for (const m of PASS_RUSH_MIXTURE) {
      const rows = occupancy(ladder, "OPPOSED", m.shift);
      const r = rows[i];
      if (r === undefined) continue;
      occ += m.weight * r.occupancy;
      cum += m.weight * r.atOrAbove;
    }
    return { ...row, occupancy: occ, atOrAbove: cum };
  });
}

// ---------------------------------------------------------------------------
// THE ENGINE'S ACTUAL SHIFTS — what the monotone band has to cover
// ---------------------------------------------------------------------------

export interface FormShifts {
  readonly form: LadderForm;
  readonly shifts: readonly number[];
  readonly min: number;
  readonly max: number;
  readonly kinds: readonly CheckKind[];
}

/**
 * Every margin shift the engine's described structures produce, across ADR-050's six league levels,
 * per roll form. **The monotone shift band has to cover the OPPOSED set or the property is a
 * statement about one fixture** — which is backlog entry 49's hazard in its exact original shape.
 */
export function engineShifts(tunables: Tunables = DEFAULT_TUNABLES): readonly FormShifts[] {
  const byForm = new Map<LadderForm, { shifts: Set<number>; kinds: Set<CheckKind> }>();
  for (const s of ladderStructures(tunables)) {
    const entry = byForm.get(s.form) ?? { shifts: new Set<number>(), kinds: new Set<CheckKind>() };
    for (const level of LEVELS) entry.shifts.add(shiftAt(s, level));
    entry.kinds.add(s.kind);
    byForm.set(s.form, entry);
  }
  const out: FormShifts[] = [];
  for (const [form, entry] of byForm) {
    const shifts = [...entry.shifts].sort((a, b) => a - b);
    out.push({
      form,
      shifts,
      min: Math.min(...shifts),
      max: Math.max(...shifts),
      kinds: [...entry.kinds].sort(),
    });
  }
  return out.sort((a, b) => a.form.localeCompare(b.form));
}

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------

function pct(p: number): string {
  return (100 * p).toFixed(3).padStart(8);
}

export function renderLadder(ladder: CandidateLadder, form: LadderForm, shift: number, title: string): string {
  const rows = occupancy(ladder, form, shift);
  const lines: string[] = [`${title} — ${form}, shift ${String(shift)}`];
  lines.push(`  ${"rung".padEnd(22)}${"interval".padEnd(16)}${"width".padStart(6)}${"occ %".padStart(10)}${"at-or-above %".padStart(15)}`);
  for (const r of rows) {
    const lo = Number.isFinite(r.floor) ? String(r.floor) : "-inf";
    const hi = Number.isFinite(r.ceiling) ? String(r.ceiling) : "+inf";
    lines.push(
      `  ${r.label.padEnd(22)}${`[${lo}, ${hi}]`.padEnd(16)}${(Number.isFinite(r.width) ? String(r.width) : "open").padStart(6)}` +
        `${pct(r.occupancy)}${pct(r.atOrAbove).padStart(15)}`,
    );
  }
  return lines.join("\n");
}

export function renderAdmissible(rows: readonly Admissible[], head = 12): string {
  const lines: string[] = [
    `ADMISSIBLE LADDERS — ${String(rows.length)} pass tail monotonicity at shift 0 (OPPOSED)`,
    `  ${"new floors".padEnd(18)}${"tail occupancies, outward %".padEnd(42)}${"band".padStart(12)}${"minGap".padStart(9)}${"span".padStart(7)}`,
  ];
  const ranked = [...rows].sort((a, b) => b.bandWidth - a.bandWidth || b.minGapPp - a.minGapPp);
  for (const r of ranked.slice(0, head)) {
    lines.push(
      `  ${r.floors.join(",").padEnd(18)}${r.tailPct.map((p) => p.toFixed(3)).join(" > ").padEnd(42)}` +
        `${`[${String(r.bandLo)},${String(r.bandHi)}]`.padStart(12)}${r.minGapPp.toFixed(3).padStart(9)}${String(r.boundedSpan).padStart(7)}`,
    );
  }
  if (ranked.length > head) lines.push(`  … ${String(ranked.length - head)} more`);
  return lines.join("\n");
}
