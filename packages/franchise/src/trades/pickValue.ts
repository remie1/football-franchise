/**
 * ADR-095 §4 and §4b: what a draft pick is worth to a GM.
 *
 * Owner's rulings (2026-11-07 14:20Z, 14:37Z, 14:59Z):
 * - OBJECTIVE, the same for every GM: the Production curve (what the players taken in each slot turn
 *   into) and the Market curve (what teams pay each other for picks), half and half; the class grade
 *   of that draft; and the time preference (a pick in a later draft is worth less).
 * - SUBJECTIVE, his own: one permanent GM curve (one of `GM_CURVES`), the team's course (rebuilding
 *   values picks more, contending less), his future-pick dial, and (in the market, step 5) his error.
 *
 * Value is in "first-overall picks": the objective value of pick 1 this year is 1.
 *
 * Numbers and where they come from:
 * - MARKET: COUNTED. Fitted to the 338 two-team, picks-only trades of 2011-2025 whose every pick was in
 *   that year's draft with its number known (nflverse nfldata `trades.csv`), so each side's total
 *   value matches: v(n) = exp(-0.08 (n-1)^0.78); typical miss in a trade's balance about 10%.
 * - FUTURE_DISCOUNT: COUNTED. Fitted on the 106 such trades that carried a later draft's pick, its slot
 *   taken as the middle of its round: 0.43 a year. On the Market curve that makes next year's
 *   mid-first worth this year's 44th pick and next year's mid-second this year's 82nd: the reported
 *   rule of thumb, "about a round lower", holds.
 * - PRODUCTION: COUNTED for the real NFL, a STAND-IN until our own league's drafts are measured
 *   (ADR-095 §4: from our draft's many-draft runs). Fitted to the mean value to the drafting team
 *   (Pro Football Reference `dr_av`) by pick, drafts 2000-2016 (nflverse `draft_picks.csv`):
 *   v(n) = exp(-0.045 (n-1)^0.75).
 * - The 80/20 blend, the GM curves' shapes and how common each is, the course tilt and the dial:
 *   CHOSEN, to be tuned at the many-season check (ADR-095 §10 step 7).
 * - Class strength: COUNTED spread (whole classes sd 6.1% of the mean, first rounds 12.6%); the
 *   letter cutoffs are CHOSEN.
 */
import { createRng, type StaffState, type TeamDirection } from "@ff/contracts";
import { clamp, normal } from "../staff/world.js";

/** The picks of a seven-round draft with compensatory picks, at most (ADR-086). */
export const PICK_COUNT = 262;

const curve = (a: number, b: number) => (n: number): number => Math.exp(-a * Math.pow(Math.max(0, n - 1), b));

/** COUNTED (see the file's note): what teams pay each other for pick n, pick 1 = 1. */
export const marketValue = curve(0.08, 0.78);
/** COUNTED for the real NFL (a stand-in until our league is measured): what pick n turns into, pick 1 = 1. */
export const productionValue = curve(0.045, 0.75);
/** COUNTED: the market's markdown for each year a pick's draft is further away. */
export const FUTURE_DISCOUNT = 0.43;

/** The shares of the objective blend and of a GM's own curve. CHOSEN. */
export const BLEND = { market: 0.5, production: 0.5, objective: 0.8, gmCurve: 0.2 } as const;

/** The objective value of pick n in this year's draft (both curves, half and half). */
export const objectiveValue = (n: number): number =>
  BLEND.market * marketValue(n) + BLEND.production * productionValue(n);

const SLOTS = Array.from({ length: PICK_COUNT }, (_, i) => i + 1);
const OBJECTIVE_TOTAL = SLOTS.reduce((s, n) => s + objectiveValue(n), 0);
const bump = (center: number, width: number) => (n: number): number =>
  Math.exp(-((Math.log(n) - Math.log(center)) ** 2) / (2 * width * width));

/**
 * The GM curve variations (owner's 14:37Z ruling: each GM is permanently assigned one). Each is a raw
 * shape over the picks, scaled so the whole draft adds up to the objective's total: a curve moves value
 * between rounds, never adds to the draft. Shapes and shares are CHOSEN.
 */
export const GM_CURVES = {
  /** The owner's curve 1: early picks gold, late picks filler (steeper than the market). */
  TOP_HEAVY: { share: 0.25, raw: curve(0.12, 0.78) },
  /** The owner's curve 2: rounds 2-4 best, the top and the late rounds overrated (value per rookie dollar). */
  MIDDLE_ROUNDS: { share: 0.15, raw: bump(70, 0.75) },
  /** Only a top-ten pick changes a franchise. */
  TOP_TEN_OR_BUST: { share: 0.07, raw: curve(0.35, 0.7) },
  /** Rounds 2 and 3 are where starters are found. */
  DAY_TWO: { share: 0.15, raw: bump(64, 0.4) },
  /** His scouts find starters in rounds 5-7. */
  LATE_ROUND_FINDER: { share: 0.07, raw: (n: number) => 0.5 * objectiveValue(n) + bump(190, 0.3)(n) * 0.3 },
  /** More picks beat better picks. */
  VOLUME: { share: 0.06, raw: curve(0.004, 1) },
  /** No strong opinion: the objective numbers. */
  EVEN_HANDED: { share: 0.25, raw: objectiveValue },
} as const;

export type GmCurve = keyof typeof GM_CURVES;
export const GM_CURVE_NAMES = Object.keys(GM_CURVES) as GmCurve[];

const SCALE: Record<GmCurve, number> = Object.fromEntries(GM_CURVE_NAMES.map((k) => {
  const total = SLOTS.reduce((s, n) => s + GM_CURVES[k].raw(n), 0);
  return [k, OBJECTIVE_TOTAL / total];
})) as Record<GmCurve, number>;

/** A GM curve's value of pick n, scaled to the objective's whole-draft total. */
export const gmCurveValue = (k: GmCurve, n: number): number => GM_CURVES[k].raw(n) * SCALE[k];

/** The open rating key that holds a GM's curve (its index in `GM_CURVE_NAMES`) and his future-pick dial. */
export const PICK_CURVE = "pickCurve";
export const FUTURE_PICK_DIAL = "futurePickDiscount";
export const PICK_CURVE_STREAM = "franchise:pickCurve";
export const FUTURE_DIAL_STREAM = "franchise:futurePickDiscount";

/** His drawn curve. Pure: the same man and seed always give the same curve. */
export function drawPickCurve(s: Pick<StaffState, "id">, seed: string): GmCurve {
  const u = createRng(seed, PICK_CURVE_STREAM).fork(String(s.id)).next();
  let acc = 0;
  for (const k of GM_CURVE_NAMES) { acc += GM_CURVES[k].share; if (u < acc) return k; }
  return "EVEN_HANDED";
}

/** His curve: the one he holds, or the draw. */
export function pickCurveOf(s: Pick<StaffState, "id" | "attributes">, seed: string): GmCurve {
  const held = s.attributes[PICK_CURVE];
  return held !== undefined && GM_CURVE_NAMES[held] !== undefined ? GM_CURVE_NAMES[held]! : drawPickCurve(s, seed);
}

/**
 * His future-pick dial: the power on the objective discount (1 = the market's markdown; under 1
 * patient, over 1 in a hurry). Centered on 1, leaning with his win-now lean (0..100): each 10 points
 * of lean above 50 adds 0.04; spread 0.15; kept within 0.5..1.5. CHOSEN.
 */
export function drawFuturePickDial(s: Pick<StaffState, "id">, seed: string, winNowLean = 50): number {
  const rng = createRng(seed, FUTURE_DIAL_STREAM).fork(String(s.id));
  return Math.round(clamp(1 + (winNowLean - 50) * 0.004 + 0.15 * normal(rng), 0.5, 1.5) * 100) / 100;
}

export function futurePickDialOf(s: Pick<StaffState, "id" | "attributes">, seed: string, winNowLean = 50): number {
  const held = s.attributes[FUTURE_PICK_DIAL];
  return held !== undefined ? held : drawFuturePickDial(s, seed, winNowLean);
}

/** The team's course tilt on every pick's value (owner's ruling). CHOSEN size. */
export const COURSE_TILT: Readonly<Record<TeamDirection, number>> = { REBUILD: 1.1, RETOOL: 1, CONTEND: 0.9 };

/** COUNTED: one standard deviation of a whole class's value, and of a first round's, as a share of the mean. */
export const CLASS_SPREAD = { whole: 0.061, firstRound: 0.126 } as const;

export type ClassGrade = "A" | "B" | "C" | "D" | "F";

/** A class's letter from its true strength (its value over the average class, less 1). Cutoffs CHOSEN. */
export function classGrade(strength: number): ClassGrade {
  const z = strength / CLASS_SPREAD.whole;
  return z >= 1.5 ? "A" : z >= 0.5 ? "B" : z > -0.5 ? "C" : z > -1.5 ? "D" : "F";
}

/** A class's effect on pick n's objective value: first-round picks move about twice as much (counted). */
export function classMultiplier(strength: number, n: number): number {
  const k = n <= 32 ? CLASS_SPREAD.firstRound / CLASS_SPREAD.whole : 1;
  return Math.max(0.5, 1 + strength * k);
}

/** Where a pick may land: slots with their chances (adding to 1). */
export type Landing = readonly { slot: number; p: number }[];

/**
 * A GM's spread for where a team's pick will land in its round (1..32): around his guess, drawn
 * toward the middle the further away the draft (each year keeps 60% of his lean off the middle),
 * wider each year (3 slots, plus 4 a year). CHOSEN; the guess itself comes from his read of the
 * team (ADR-095 §4b, the market's step).
 */
export function landingSpread(guessSlot: number, yearsAhead: number, round = 1, perRound = 32): Landing {
  const mid = (perRound + 1) / 2;
  const center = mid + (guessSlot - mid) * Math.pow(0.6, yearsAhead);
  const sd = 3 + 4 * yearsAhead;
  const w = Array.from({ length: perRound }, (_, i) => Math.exp(-(((i + 1 - center) / sd) ** 2) / 2));
  const t = w.reduce((s, x) => s + x, 0);
  return w.map((x, i) => ({ slot: (round - 1) * perRound + i + 1, p: x / t }));
}

export interface PickValueInput {
  /** Where the pick lands: its known overall number, or a spread. */
  at: number | Landing;
  /** How many drafts away (0 = the upcoming draft). */
  yearsAhead: number;
  curve: GmCurve;
  /** His future-pick dial (1 = the market's). */
  dial?: number;
  direction?: TeamDirection;
  /** The class's true strength (value over the average class, less 1); absent = an average class. */
  classStrength?: number;
}

/** A GM's value of one pick, before his error (step 5), in first-overall picks. */
export function gmPickValue(x: PickValueInput): number {
  const one = (n: number) => (BLEND.objective * objectiveValue(n) + BLEND.gmCurve * gmCurveValue(x.curve, n))
    * (x.classStrength !== undefined ? classMultiplier(x.classStrength, n) : 1);
  const base = typeof x.at === "number" ? one(x.at) : x.at.reduce((s, l) => s + l.p * one(l.slot), 0);
  const time = Math.pow(FUTURE_DISCOUNT, x.yearsAhead * (x.dial ?? 1));
  return base * time * (x.direction ? COURSE_TILT[x.direction] : 1);
}
