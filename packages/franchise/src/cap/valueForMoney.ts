/**
 * ADR-085 step 14, §3.1 (the owner's yes on the aging doc, 2026-11-06, with "the formula should take
 * into account each player on the roster at any specific position, not just the cheapest"): value for
 * money.
 *
 * A man is worth to a team what he lifts its men at his position, times the market's price of a rating
 * point at his level, less what he costs over the minimum. The lift counts every seat of the position's
 * 53-man shape (`WANTED`): starters fully, backups at `backupWeight`, and an empty seat, or a man below
 * the replacement grade, as a street free agent at `REPLACEMENT_GRADE`. So a man who is nearly as good as
 * the starter he would replace lifts the team little, however good he is, and a cheap man who fills a
 * hole lifts it a lot.
 *
 * Constants are CHOSEN (provenance NONE), tuned on the stand-in league with growth and injuries on
 * (the step-14 write-up, "Step 14: the missing middle class").
 */
import type { Position } from "@ff/contracts";
import { REPLACEMENT_GRADE, STARTERS, WANTED } from "../draft/board.js";
import { percentileOf, pointPrice, type MarketCurve } from "./value.js";

export const VALUE_FOR_MONEY = {
  /** What a backup's rating counts for against a starter's. At a quarter, teams overbuy depth. */
  backupWeight: 0.1,
  /**
   * A rating point's price is the rise in pay over the rise in rating across this share of the market
   * on each side of the man's own place, so a point costs more at the top than in the middle.
   */
  priceSpan: 0.1,
} as const;

/** What a position's men are worth together, in rating points: each seat of its 53-man shape, best man first. */
export function depthValue(position: Position, grades: readonly number[], backupWeight: number = VALUE_FOR_MONEY.backupWeight): number {
  const sorted = [...grades].sort((a, b) => b - a);
  // A position with no set starter (fullback, inside linebacker) counts its first man as half a starter.
  const starters = Math.max(1, STARTERS[position]);
  const firstWeight = STARTERS[position] === 0 ? 0.5 : 1;
  const seats = Math.max(starters, WANTED[position]);
  let value = 0;
  for (let i = 0; i < seats; i++) value += (i < starters ? firstWeight : backupWeight) * Math.max(REPLACEMENT_GRADE, sorted[i] ?? REPLACEMENT_GRADE);
  return value;
}

/** How much a man of `grade` would lift a position whose men are rated `here`, in rating points. */
export function liftAt(position: Position, here: readonly number[], grade: number, backupWeight?: number): number {
  return depthValue(position, [...here, grade], backupWeight) - depthValue(position, here, backupWeight);
}

/** The market's price of a rating point at `grade`: read around his own place in the market (`priceSpan` each side). */
export function pointPriceAt(curve: MarketCurve | undefined, grade: number, span: number = VALUE_FOR_MONEY.priceSpan): number {
  if (!curve || curve.grades.length < 2) return 0;
  const lo = Math.max(0, Math.min(1 - 2 * span, percentileOf(curve.grades, grade) - span));
  return pointPrice(curve, [lo, lo + 2 * span]);
}

export interface ValueForMoneyInput {
  position: Position;
  /** The ratings of the team's men at his position now (through the team's own eyes). */
  here: readonly number[];
  /** His rating, the same way. */
  grade: number;
  /** What he would cost a year. */
  apy: number;
  /** The least the team could pay him a year over the same years (each year's minimum salary, averaged). */
  floor: number;
  /** The market at his position group. */
  curve: MarketCurve | undefined;
  /** Anything else the deal costs a year (the seat it takes: a teammate's cut, spread over the deal). */
  extraCost?: number;
}

/**
 * Value for money, in dollars a year: his lift times a point's price, less what he costs over the minimum.
 * A market with no price for a rating point yet (no deals at his group, or every one at the same pay)
 * cannot weigh his pay, so there he is worth his lift alone, in rating points.
 */
export function valueForMoney(input: ValueForMoneyInput): number {
  const lift = liftAt(input.position, input.here, input.grade);
  const price = pointPriceAt(input.curve, input.grade);
  if (price <= 0) return lift;
  return lift * price - (input.apy - input.floor) - (input.extraCost ?? 0);
}

/**
 * The man a signing would push off the 53 at his position: the last man inside the position's shape,
 * when the newcomer would rank above him. Undefined when there is a seat to spare or he would not make it.
 */
export function pushedOut<T extends { g: number }>(men: readonly T[], position: Position, grade: number): T | undefined {
  const wanted = WANTED[position];
  if (men.length < wanted) return undefined;
  const last = [...men].sort((a, b) => b.g - a.g)[wanted - 1]!;
  return grade > last.g ? last : undefined;
}
