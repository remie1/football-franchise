/**
 * ADR-085 §4: what a player is worth on the open market, read from the league's own contracts.
 *
 * The market is the league's live veteran deals at his tag group, lowest to highest. A player's
 * price is the deal at the same place in that list as his grade holds among the players on those
 * deals, discounted for age. With the stand-in league these are the real contracts, so prices start
 * where the real market is and move as the league signs new deals.
 *
 * Constants are CHOSEN (provenance NONE) unless a comment says otherwise.
 */
import type { CalendarStamp, ContractKind, ContractYear, PlayerContract, PlayerId, PlayerState, Position, TeamId } from "@ff/contracts";
import { capNumber, liveIn, prorate, withCapHits } from "./money.js";
import { TAG_GROUP, type TagGroup } from "./rules.js";

/** Deals the open market sets. Rookie, practice-squad, tag and tender deals are priced by rule instead. */
const MARKET_KINDS: ReadonlySet<ContractKind | undefined> = new Set([undefined, "VETERAN", "EXTENSION", "MINIMUM"]);

/** A contract's average a year: every cap dollar over its real (not void) years. */
export function apyOf(c: PlayerContract): number {
  const real = c.years.filter((y) => !y.voidYear).length;
  return real === 0 ? 0 : c.years.reduce((s, y) => s + capNumber(y), 0) / real;
}

export interface MarketCurve {
  /** Live market deals' APYs, lowest first. */
  apys: number[];
  /** The grades of the players on those deals, lowest first. */
  grades: number[];
}

export type MarketCurves = ReadonlyMap<TagGroup, MarketCurve>;

/** The league's market at each tag group in a season. */
export function marketCurves(
  contracts: readonly PlayerContract[], players: readonly PlayerState[], season: number, rate: (p: PlayerState) => number,
): MarketCurves {
  const byId = new Map(players.map((p) => [String(p.bio.id), p]));
  const out = new Map<TagGroup, MarketCurve>();
  for (const c of contracts) {
    if (!MARKET_KINDS.has(c.kind) || !liveIn(c, season)) continue;
    const p = byId.get(String(c.player));
    if (!p) continue;
    const g = TAG_GROUP[p.bio.position];
    const curve = out.get(g) ?? { apys: [], grades: [] };
    curve.apys.push(apyOf(c));
    curve.grades.push(rate(p));
    out.set(g, curve);
  }
  for (const c of out.values()) { c.apys.sort((a, b) => a - b); c.grades.sort((a, b) => a - b); }
  return out;
}

/** Where `x` sits in an ascending list, 0..1, interpolated between neighbours (lowest = 0, highest = 1). */
export function percentileOf(sorted: readonly number[], x: number): number {
  const n = sorted.length;
  if (n === 0) return 0.5;
  if (n === 1 || x <= sorted[0]!) return n === 1 ? 0.5 : 0;
  if (x >= sorted[n - 1]!) return 1;
  let lo = 0;
  while (sorted[lo + 1]! < x) lo++;
  const span = sorted[lo + 1]! - sorted[lo]!;
  return (lo + (span === 0 ? 0 : (x - sorted[lo]!) / span)) / (n - 1);
}

/** The value at a place in an ascending list, interpolated. */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return 0;
  const i = Math.max(0, Math.min(sorted.length - 1, q * (sorted.length - 1)));
  const lo = Math.floor(i);
  const hi = Math.min(sorted.length - 1, lo + 1);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (i - lo);
}

/** Positions whose players last longer: their age curve starts this many years later. */
const LATE_AGEING: ReadonlySet<Position> = new Set(["QB", "K", "P", "LS"]);
const AGE_SHIFT = 4;

/** What age takes off a price: nothing to 29, then a steady slide. */
export function ageFactor(age: number, position: Position): number {
  const a = age - (LATE_AGEING.has(position) ? AGE_SHIFT : 0);
  if (a <= 29) return 1;
  return Math.max(0.45, 1 - 0.09 * (a - 29));
}

/** How many years a deal runs: young and good players get long deals, old ones one year. */
export function termFor(age: number, position: Position, percentile: number): number {
  const a = age - (LATE_AGEING.has(position) ? AGE_SHIFT : 0);
  let years = a <= 27 ? 4 : a <= 29 ? 3 : a <= 31 ? 2 : 1;
  if (percentile >= 0.9 && a <= 29) years += 1;
  if (percentile < 0.4) years = Math.min(years, 2);
  if (percentile < 0.15) years = 1;
  return years;
}

/** How a deal is built at a place in the market: signing-bonus share and fully guaranteed years. */
export function structureFor(percentile: number): { bonusShare: number; guaranteedYears: number } {
  if (percentile >= 0.9) return { bonusShare: 0.35, guaranteedYears: 2 };
  if (percentile >= 0.6) return { bonusShare: 0.2, guaranteedYears: 1 };
  if (percentile >= 0.3) return { bonusShare: 0.1, guaranteedYears: 0 };
  return { bonusShare: 0, guaranteedYears: 0 };
}

export interface Valuation {
  /** His place among the players on market deals at his tag group, 0..1. */
  percentile: number;
  /** His price a year. */
  apy: number;
  years: number;
}

/** A player's market price from a grade (the grader's own view of him). */
export function valuePlayer(p: PlayerState, grade: number, curves: MarketCurves, minimum: number): Valuation {
  const curve = curves.get(TAG_GROUP[p.bio.position]);
  const percentile = curve ? percentileOf(curve.grades, grade) : 0.5;
  const raw = curve ? quantile(curve.apys, percentile) : minimum;
  const apy = Math.max(minimum, Math.round(raw * ageFactor(p.bio.age, p.bio.position) / 1000) * 1000);
  return { percentile, apy, years: termFor(p.bio.age, p.bio.position, percentile) };
}

export interface VeteranDeal {
  player: PlayerId;
  team: TeamId;
  /** The first season of the deal. */
  season: number;
  signedAt: CalendarStamp;
  apy: number;
  years: number;
  bonusShare: number;
  guaranteedYears: number;
  /** Each year's minimum salary (index 0 = the first season). */
  minimum: (yearIndex: number) => number;
  kind?: Extract<ContractKind, "VETERAN" | "EXTENSION" | "MINIMUM">;
}

/** Raises a year in base salary over a deal (CHOSEN; real deals usually rise). */
const BASE_RAISE = 0.05;

/**
 * A veteran deal worth `apy × years`: part paid as a signing bonus spread over the years, the rest
 * as base salary rising 5% a year, never below the minimum. The first `guaranteedYears` are fully
 * guaranteed.
 */
export function veteranContract(d: VeteranDeal): PlayerContract {
  const total = Math.round(d.apy * d.years / 1000) * 1000;
  const bonus = Math.round(total * d.bonusShare / 1000) * 1000;
  const weights = Array.from({ length: d.years }, (_, i) => (1 + BASE_RAISE) ** i);
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = prorate(bonus, d.years);
  const years: ContractYear[] = weights.map((w, i) => ({
    season: d.season + i,
    baseSalary: Math.max(d.minimum(i), Math.round((total - bonus) * w / sum / 1000) * 1000),
    signingBonusProration: shares[i] ?? 0,
    guarantees: { fullyGuaranteed: i < d.guaranteedYears },
    capHit: 0,
  }));
  return withCapHits({
    player: d.player, team: d.team, signedAt: d.signedAt, kind: d.kind ?? (d.apy <= d.minimum(0) ? "MINIMUM" : "VETERAN"),
    ...(bonus > 0 ? { signingBonus: bonus } : {}), years,
  });
}

/** Share of a deal's money that is guaranteed at signing (bonus plus fully guaranteed base). */
export function guaranteedShare(c: PlayerContract): number {
  const total = (c.signingBonus ?? 0) + c.years.reduce((s, y) => s + y.baseSalary, 0);
  const g = (c.signingBonus ?? 0) + c.years.reduce((s, y) => s + (y.guarantees.fullyGuaranteed ? y.baseSalary : 0), 0);
  return total === 0 ? 0 : g / total;
}

/** Re-exported for the market: a year's cap number. */
export { capNumber };
export const contractYearOf = (c: PlayerContract, season: number): ContractYear | undefined => c.years.find((y) => y.season === season);
