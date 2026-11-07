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
import { capNumber, liveIn, proration, prorate, withCapHits } from "./money.js";
import { TAG_GROUP, type TagGroup } from "./rules.js";

/** Deals the open market sets. Rookie, practice-squad, tag and tender deals are priced by rule instead. */
const MARKET_KINDS: ReadonlySet<ContractKind | undefined> = new Set([undefined, "VETERAN", "EXTENSION", "MINIMUM"]);

/** A contract's average a year: every cap dollar over its real (not void) years. */
export function apyOf(c: PlayerContract): number {
  const real = c.years.filter((y) => !y.voidYear).length;
  return real === 0 ? 0 : c.years.reduce((s, y) => s + capNumber(y), 0) / real;
}

/**
 * A deal's own pay a year: its pay over its real years and its own signing bonus, without bonus money
 * carried over from an older deal (step 14: an early extension takes over the old deal's later years
 * and their bonus proration). What OverTheCap counts as a deal's APY. Only an extension made here can
 * carry bonus money over, so any other deal is its `apyOf` (the league file's deals keep their bonus as
 * proration alone, with no bonus total to count from).
 */
export function newPayOf(c: PlayerContract): number {
  if (c.kind !== "EXTENSION" || c.signingBonus === undefined) return apyOf(c);
  const real = c.years.filter((y) => !y.voidYear);
  if (real.length === 0) return 0;
  return (real.reduce((s, y) => s + capNumber(y) - proration(y), 0) + c.signingBonus) / real.length;
}

export interface MarketCurve {
  /** Live market deals' APYs, lowest first. */
  apys: number[];
  /** The grades of the players on those deals, lowest first. */
  grades: number[];
}

export type MarketCurves = ReadonlyMap<TagGroup, MarketCurve>;

/**
 * The league's market at each tag group in a season, each deal at its own pay a year (`newPayOf`). With `cap`, each deal counts at its share of the
 * cap in its first season, in this season's dollars (as OverTheCap compares deals across years), so
 * prices keep pace with the cap. Each player counts once, on his latest market deal live this season
 * or last: last season's one-year deals (most of them cheap veterans' deals) stay on the list, so the
 * list holds the backups as well as the starters.
 */
export function marketCurves(
  contracts: readonly PlayerContract[], players: readonly PlayerState[], season: number, rate: (p: PlayerState) => number,
  cap?: (season: number) => number,
): MarketCurves {
  const byId = new Map(players.map((p) => [String(p.bio.id), p]));
  const latest = new Map<string, PlayerContract>();
  for (const c of contracts) {
    if (!MARKET_KINDS.has(c.kind) || !(liveIn(c, season) || liveIn(c, season - 1))) continue;
    const had = latest.get(String(c.player));
    if (!had || firstSeason(c, season) >= firstSeason(had, season)) latest.set(String(c.player), c);
  }
  const out = new Map<TagGroup, MarketCurve>();
  for (const c of latest.values()) {
    const p = byId.get(String(c.player));
    if (!p) continue;
    const g = TAG_GROUP[p.bio.position];
    const curve = out.get(g) ?? { apys: [], grades: [] };
    const first = firstSeason(c, season);
    const apy = newPayOf(c);
    curve.apys.push(cap ? apy * cap(season) / cap(first) : apy);
    curve.grades.push(rate(p));
    out.set(g, curve);
  }
  for (const c of out.values()) { c.apys.sort((a, b) => a - b); c.grades.sort((a, b) => a - b); }
  return out;
}

const firstSeason = (c: PlayerContract, fallback: number): number => c.years.find((y) => !y.voidYear)?.season ?? fallback;

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

/**
 * What a rating point costs on a market (ADR-085 step 14): the rise in a year's pay across the middle
 * half of the market (its 25th to 75th place), over the rise in grade across it. 0 for no market.
 */
export function pointPrice(curve: MarketCurve | undefined, span: readonly [number, number] = [0.25, 0.75]): number {
  if (!curve || curve.apys.length < 2) return 0;
  const grades = quantile(curve.grades, span[1]) - quantile(curve.grades, span[0]);
  const pay = quantile(curve.apys, span[1]) - quantile(curve.apys, span[0]);
  return grades > 0 && pay > 0 ? pay / grades : 0;
}

/** Positions whose players last longer: their age curve starts this many years later. */
const LATE_AGEING: ReadonlySet<Position> = new Set(["QB", "K", "P", "LS"]);
const AGE_SHIFT = 4;

/**
 * His age for the cap's age rules with growth off: his age, four years younger at QB, K, P and LS.
 * A man with a growth record is read by the age his expected change matches instead, with no
 * position in it (ADR-085 step 13, `AheadView.ruleAge`; owner, 2026-11-06: nothing is based on position).
 */
export function legacyRuleAge(age: number, position: Position): number {
  return age - (LATE_AGEING.has(position) ? AGE_SHIFT : 0);
}

/** What age takes off a price, at a rule age: nothing to 29, then a steady slide. */
export function ageFactorAt(a: number): number {
  if (a <= 29) return 1;
  return Math.max(0.45, 1 - 0.09 * (a - 29));
}

/** What age takes off a price: nothing to 29, then a steady slide (growth off). */
export function ageFactor(age: number, position: Position): number {
  return ageFactorAt(legacyRuleAge(age, position));
}

/**
 * The real average length of a new deal by its size as a share of the cap: deals signed 2021 to 2025
 * in OverTheCap's table (REPORTED; counted 2026-10-31): up to 0.5% 1.41 years, to 1% 1.80, to 2%
 * 1.85, to 4% 2.28, to 8% 2.78, above 8% 3.55.
 */
const REAL_TERM: readonly { upTo: number; years: number }[] = [
  { upTo: 0.005, years: 1.41 }, { upTo: 0.01, years: 1.8 }, { upTo: 0.02, years: 1.85 },
  { upTo: 0.04, years: 2.28 }, { upTo: 0.08, years: 2.78 }, { upTo: Infinity, years: 3.55 },
];
/** Years a younger player adds to the real length (an older one takes off), a year of age (CHOSEN). */
const TERM_PER_AGE = 0.2;

/**
 * How many years a deal runs. Old ones run one year, and the young and good run longest. With the
 * deal's share of the cap, the length starts from the real average for deals that size, longer for
 * a younger man and shorter for an older one, within the age limits.
 */
export function termFor(age: number, position: Position, percentile: number, capShare?: number): number {
  return termAt(legacyRuleAge(age, position), percentile, capShare);
}

/** `termFor` at a rule age (`legacyRuleAge`, or step 13's age by expected change). */
export function termAt(a: number, percentile: number, capShare?: number): number {
  let years = a <= 27 ? 4 : a <= 29 ? 3 : a <= 31 ? 2 : 1;
  if (percentile >= 0.9 && a <= 29) years += 1;
  if (capShare !== undefined) {
    const real = REAL_TERM.find((t) => capShare <= t.upTo)!.years;
    return Math.max(1, Math.min(years, Math.round(real + TERM_PER_AGE * (27 - a))));
  }
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

/**
 * ADR-085 step 13: how a man with a growth record is valued. The grade already looks ahead, so his
 * age takes nothing off the price; the deal's length comes from the age his expected change matches;
 * and the price is set on his expected rating across the deal's years.
 */
export interface ValueAhead {
  /** His age for the age rules (`AheadView.ruleAge`). */
  readonly ruleAge: number;
  /** What to add to the grade to read his expected rating across a deal of `years` (`AheadView.dealShift`). */
  readonly shift: (years: number) => number;
}

/**
 * A player's market price from a grade (the grader's own view of him). With `cap`, the deal's length
 * follows the real lengths for its size. With `ahead` (step 13), the length is read first, at the grade,
 * and the price then at his expected rating across that many years.
 */
export function valuePlayer(p: PlayerState, grade: number, curves: MarketCurves, minimum: number, cap?: number, ahead?: ValueAhead): Valuation {
  const curve = curves.get(TAG_GROUP[p.bio.position]);
  const placeOf = (g: number) => (curve ? percentileOf(curve.grades, g) : 0.5);
  const priceAt = (percentile: number, factor: number) =>
    Math.max(minimum, Math.round((curve ? quantile(curve.apys, percentile) : minimum) * factor / 1000) * 1000);
  if (ahead) {
    const first = placeOf(grade);
    const years = termAt(ahead.ruleAge, first, cap ? priceAt(first, 1) / cap : undefined);
    const percentile = placeOf(grade + ahead.shift(years));
    return { percentile, apy: priceAt(percentile, 1), years };
  }
  const percentile = placeOf(grade);
  const apy = priceAt(percentile, ageFactor(p.bio.age, p.bio.position));
  return { percentile, apy, years: termFor(p.bio.age, p.bio.position, percentile, cap ? apy / cap : undefined) };
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
  /**
   * The first year's cap number as a share of the deal's yearly value (step 11). Absent = base
   * salaries rise evenly. With it, the first year's base is set so its cap number comes to this share
   * (never under the minimum), and the rest of the base rises over the later years.
   */
  firstYearShare?: number;
}

/**
 * Step 11: a real multi-year deal's first-year cap number as a share of its yearly value, by its size
 * as a share of the cap (REPORTED, counted: OverTheCap's table, deals of $2M+ a year and 2+ years
 * signed 2021 to 2024, median; new-team and own-team deals agree within 0.02). Real deals put the
 * money in later years and spread signing bonuses, so a big deal costs about a third of its value now.
 */
export const REAL_FIRST_YEAR: readonly { upTo: number; share: number }[] = [
  { upTo: 0.01, share: 0.81 },
  { upTo: 0.02, share: 0.75 },
  { upTo: 0.04, share: 0.59 },
  { upTo: 0.08, share: 0.45 },
  { upTo: Infinity, share: 0.34 },
];

export function firstYearShareFor(capShare: number): number {
  return (REAL_FIRST_YEAR.find((b) => capShare <= b.upTo) ?? REAL_FIRST_YEAR[REAL_FIRST_YEAR.length - 1]!).share;
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
  const shares = prorate(bonus, d.years);
  // The first year's base, when the deal sets its first-year cap number; the later years share the rest.
  const first = d.firstYearShare !== undefined && d.years >= 2
    ? Math.min(total - bonus, Math.max(d.minimum(0), Math.round((d.firstYearShare * d.apy - (shares[0] ?? 0)) / 1000) * 1000))
    : undefined;
  const later = first === undefined ? weights : weights.slice(1);
  const sum = later.reduce((a, b) => a + b, 0);
  const left = total - bonus - (first ?? 0);
  const years: ContractYear[] = weights.map((w, i) => ({
    season: d.season + i,
    baseSalary: i === 0 && first !== undefined ? first : Math.max(d.minimum(i), Math.round(left * w / sum / 1000) * 1000),
    signingBonusProration: shares[i] ?? 0,
    guarantees: { fullyGuaranteed: i < d.guaranteedYears },
    capHit: 0,
  }));
  // A shaped deal guarantees as much base as the even deal would: its small first year is not all of it.
  if (first !== undefined && d.guaranteedYears > 0) {
    const target = d.guaranteedYears * (total - bonus) / d.years;
    let held = 0;
    for (const y of years) {
      y.guarantees = { fullyGuaranteed: held < target };
      if (held < target) held += y.baseSalary;
    }
  }
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
