/**
 * THE CONTEST'S BOUNDARY b AND RUN'S MARGIN AT THE DEADLINE, FILED (ADR-089 step 0; plan §7.2 `rules`).
 *
 * Two of the rules ADR-089 §6.0 files before any engine arm runs (ADR-089:991):
 *
 *  - **b's grid and its reachable range** (§4.5 item 5, ADR-089:669-671; deviation O6). The hit is
 *    `d100 + rusher terms` against `d100 + quarterback terms`, a sack when the margin is at least b
 *    (ADR-089:663-665). b starts at 5, `resultTierLadder`'s SUCCESS boundary, and is fitted at step 10
 *    to the league sack share of 44.6%. Its unit test is the closed form, both signs:
 *
 *        P(d100 - d100 >= b) = (100 - b)(101 - b) / 20000          for b >= 1  (0.456 at b = 5)
 *                            = 1 - (99 + b)(100 + b) / 20000       for b <= 0  (0.505 at b = 0)
 *
 *    The grid is the integers -15 to 15 (O6: its lower edge effectively sets step 10's sack level,
 *    since a lower b means more sacks and 44.6 sits above the stand-ins' ceiling). The reachable
 *    range is filed as the REPORTED stand-ins (ADR-089:671), measured at the grid's ends at steps 4
 *    and 10, and the grid is never widened to reach the target (ADR-089:1123).
 *
 *  - **RUN's margin over the throwaway base at the pursuit deadline** (§4.6 f, ADR-089:727;
 *    deviation O7). At the deadline the quarterback ranks RUN (today's escape terms) against
 *    THROWAWAY (today's throwaway terms). RUN's base is filed as a margin Δ above the throwaway
 *    appeal's base, "so a quarterback at the 70 baseline ranks RUN first at the provisional 25 and
 *    after step 10 fits that base". Δ is the smallest integer at which a 70-baseline quarterback
 *    ranks RUN strictly first at every urgency the engine can give (0 to 3): RUN gains
 *    `escape.perUrgencyStep` (5) a step and THROWAWAY `throwaway.perUrgencyStep` (8), so the gap
 *    closes by 3 a step and Δ = 3·3 + 1 = 10.
 *
 *    "Strictly first": a tie is not counted as RUN ranking first. Today's in-pocket ranking breaks a
 *    tie on the declaration order of `pocketMovement.appeal`, where escape is declared before
 *    throwaway (`engine/src/resolve/pocketMovement.ts`, the sort in `rankResponses`), which would let
 *    Δ = 9 tie into first; the deadline pick does not exist until step 6, so its tie order is not
 *    known, and the strict reading is the one that holds under either order.
 *
 * Every number the arithmetic reads comes from `DEFAULT_TUNABLES` (a permitted import): the
 * throwaway base 25, both per-urgency steps, the appeal baseline 70, and the urgency range, which is
 * `round(urgencyHorizonSeconds / tickStepSeconds)` = round(1.5 / 0.5) = 3 (the engine's
 * `urgencySteps`, `resolve/rushThreat.ts`). The in-pocket ESCAPE's `noClimbLaneBonus` is not part of
 * RUN at the deadline: the deadline comes after a break-out, outside the pocket.
 */
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import type { FiledRules } from "./filed.js";

// --- b -------------------------------------------------------------------------------------------

/** b's provisional value: `resultTierLadder`'s SUCCESS boundary (ADR-089:669). */
export const B_START = 5;

/** b's grid (deviation O6): the integers -15 to 15. */
export const B_GRID: readonly number[] = Object.freeze(Array.from({ length: 31 }, (_, i) => i - 15));

/** The closed forms hold for these b (outside them the chance is 0 or 1 and the forms do not apply). */
export const B_DOMAIN: readonly [number, number] = [-99, 100];

/**
 * P(d100 - d100 >= b) for two independent d100s, b a whole number in [-99, 100]: the chance the hit
 * is a sack at boundary b when the two sides' terms are equal (ADR-089:669).
 */
export function pSackAtBoundary(b: number): number {
  if (!Number.isInteger(b) || b < B_DOMAIN[0] || b > B_DOMAIN[1]) {
    throw new Error(`pSackAtBoundary: b must be a whole number in [${String(B_DOMAIN[0])}, ${String(B_DOMAIN[1])}] (got ${String(b)})`);
  }
  return b >= 1 ? ((100 - b) * (101 - b)) / 20000 : 1 - ((99 + b) * (100 + b)) / 20000;
}

/** b's reachable range, filed as the REPORTED stand-ins (ADR-089:671), never as a fit target. */
export const B_REACHABLE_RANGE = Object.freeze({
  adrLine: 671,
  continuousReading: Object.freeze([24, 36] as const),
  gridReading: Object.freeze([37, 57] as const),
  unit: "sack share of hit-or-sack, %, with every contact a sack (the stand-in ceiling; REPORTED, TOT §8.3)",
  measuredAt: Object.freeze(["4", "10"] as const),
  how: "measured at the grid's ends (b = -15 and b = 15) on the step's build, reported beside the fit",
  neverWidened: "the grid is never widened to reach 44.6 (ADR-089:1123)",
});

// --- RUN's margin at the deadline ----------------------------------------------------------------

/** The four ratings the two deadline appeals read; a 70 is the appeal baseline (no term). */
export interface DeadlineRatings {
  readonly mobility: number;
  readonly improvisation: number;
  readonly decisionMaking: number;
  readonly awareness: number;
}

export const BASELINE_RATINGS: DeadlineRatings = Object.freeze({ mobility: 70, improvisation: 70, decisionMaking: 70, awareness: 70 });

export interface DeadlineOptions {
  readonly tunables?: Tunables;
  readonly ratings?: DeadlineRatings;
}

/** The urgencies the engine can give: 0 to round(urgencyHorizonSeconds / tickStepSeconds). */
export function urgencyRange(tunables: Tunables = DEFAULT_TUNABLES): readonly [number, number] {
  return [0, Math.round(tunables.pocketMovement.urgencyHorizonSeconds / tunables.clock.tickStepSeconds)];
}

type Term = { readonly attr: string; readonly divisor: number };

/** The engine's `appealFrom` attribute total: each term rounded on its own, against the baseline. */
function termsTotal(terms: readonly Term[], ratings: DeadlineRatings, baseline: number): number {
  return terms.reduce((sum, term) => {
    const rating = (ratings as unknown as Readonly<Record<string, number>>)[term.attr];
    if (rating === undefined) throw new Error(`deadline appeal reads "${term.attr}", which DeadlineRatings does not carry`);
    return sum + Math.round((rating - baseline) / term.divisor);
  }, 0);
}

/** RUN (base `runBase`, today's escape terms) and THROWAWAY (today's throwaway appeal) at one urgency. */
export function deadlineAppeals(runBase: number, urgency: number, opts: DeadlineOptions = {}): { readonly run: number; readonly throwaway: number } {
  const t = opts.tunables ?? DEFAULT_TUNABLES;
  const ratings = opts.ratings ?? BASELINE_RATINGS;
  const pm = t.pocketMovement;
  const escape = pm.appeal.escape;
  const throwaway = pm.appeal.throwaway;
  return {
    run: runBase + termsTotal(escape.terms, ratings, pm.appealBaseline) + escape.perUrgencyStep * urgency,
    throwaway: throwaway.base + termsTotal(throwaway.terms, ratings, pm.appealBaseline) + throwaway.perUrgencyStep * urgency,
  };
}

/** Does RUN rank strictly above THROWAWAY at every urgency in the engine's range? */
export function runRanksFirstAtEveryUrgency(runBase: number, opts: DeadlineOptions = {}): boolean {
  const [lo, hi] = urgencyRange(opts.tunables);
  for (let u = lo; u <= hi; u++) {
    const a = deadlineAppeals(runBase, u, opts);
    if (!(a.run > a.throwaway)) return false;
  }
  return true;
}

/** The smallest whole Δ for which RUN's base = throwaway base + Δ ranks RUN first at every urgency. */
export function smallestRunMargin(opts: DeadlineOptions = {}): number {
  const t = opts.tunables ?? DEFAULT_TUNABLES;
  const base = t.pocketMovement.appeal.throwaway.base;
  for (let delta = -100; delta <= 200; delta++) {
    if (runRanksFirstAtEveryUrgency(base + delta, opts)) return delta;
  }
  throw new Error("smallestRunMargin: no margin in [-100, 200] ranks RUN first at every urgency");
}

/** RUN's filed margin (deviation O7). */
export const RUN_MARGIN = 10;

// --- the filed blocks ----------------------------------------------------------------------------

export const FILED_B_GRID: FiledRules["bGrid"] = {
  adrLine: 669,
  text:
    "The contest's sack boundary b starts at 5 (resultTierLadder's SUCCESS boundary) and is fitted at step 10 to the league " +
    "sack share of 44.6%, on the grid of the whole numbers -15 to 15 (deviation O6: the lower edge effectively sets step " +
    "10's sack level, because a lower b means more sacks). Its unit test is the closed form P(d100 - d100 >= b) = " +
    "(100 - b)(101 - b)/20000 for b >= 1 (0.456 at b = 5) and 1 - (99 + b)(100 + b)/20000 for b <= 0 (0.505 at b = 0). " +
    "Its reachable range is filed as REPORTED stand-ins (ADR-089:671), measured at the grid's ends at steps 4 and 10, " +
    "reported beside the fit, and the grid is never widened to reach 44.6 (ADR-089:1123).",
  values: B_GRID,
  params: {
    start: B_START,
    target: 44.6,
    fittedAt: "10",
    closedFormPositive: "(100 - b)(101 - b) / 20000, b >= 1",
    closedFormNonPositive: "1 - (99 + b)(100 + b) / 20000, b <= 0",
    domain: [...B_DOMAIN],
    reachableRange: {
      adrLine: B_REACHABLE_RANGE.adrLine,
      continuousReading: [...B_REACHABLE_RANGE.continuousReading],
      gridReading: [...B_REACHABLE_RANGE.gridReading],
      unit: B_REACHABLE_RANGE.unit,
      measuredAt: [...B_REACHABLE_RANGE.measuredAt],
      how: B_REACHABLE_RANGE.how,
      neverWidened: B_REACHABLE_RANGE.neverWidened,
    },
  },
};

export const FILED_RUN_MARGIN: FiledRules["runMargin"] = {
  adrLine: 727,
  text:
    "At the pursuit deadline RUN (today's escape terms, Mobility/1.5 + Improvisation/1.5, +5 an urgency step) is ranked " +
    "against THROWAWAY (today's throwaway appeal, 25 + Decision Making/3 + Awareness/4, +8 an urgency step). RUN's base is " +
    "the throwaway appeal's base plus Δ = 10, which moves with that base when step 10 fits it: the smallest whole margin at " +
    "which a quarterback at the 70 baseline ranks RUN strictly first at every urgency 0 to 3 (deviation O7). Step 10 " +
    "re-checks it as a structural row, a baseline quarterback in a neutral situation ranking RUN first at the deadline, and " +
    "a failure comes back to the owner. If step 6's deadline pick reads a different urgency range, Δ is re-derived by the " +
    "same inequality as a named amendment (risk K9).",
  delta: RUN_MARGIN,
  urgency: [0, 3],
  params: {
    throwawayBase: 25,
    runPerUrgencyStep: 5,
    throwawayPerUrgencyStep: 8,
    appealBaseline: 70,
    inequality: "Δ + 5u > 8u for every u in 0..3, so Δ > 9",
    ties: "strict: a tie is not RUN first (the deadline pick's tie order is not built until step 6)",
    noClimbLaneBonus: "not applied: the deadline follows a break-out, outside the pocket",
    recheckedAt: "10",
  },
};
