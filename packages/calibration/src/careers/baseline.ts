/**
 * The career baselines put together (ADR-087 D5b): the ledger, the week-8 53s, the snap seasons, the
 * player table's ids and the results fixture in; one report of aggregates out.
 *
 * Pure. Every number leaving here is a count, a mean, a share or a correlation, with its standard
 * error: across seasons for the week-8 cross-section, win carry-over and win spread; a deterministic
 * bootstrap over players (`stats.ts`) for careers, peak usage, comebacks and (2026-11-06) the
 * retired-list and exit rates by age. Rookies' ages at week 8 carry their SD and counts, no SE.
 */

import type { AssetManifest } from "../injuries/data.js";
import { CAREER_GROUPS, USAGE_GROUPS, foldSnapPosition, type CareerGroup } from "./groups.js";
import {
  CAREER_HORIZON, CROSS_MEASURES, ageOn, backOnA53Units, careerValues, cohortEntrants, cohortExclusions, comebackUnits, crossByGroup,
  retiredListPlacements, retiredListUnits, rookieAges, startersGoneUnits,
  type CohortWindow, type CrossValues, type Entrant, type RateCase, type RosterLedger, type WeekEight,
} from "./measure.js";
import {
  CAREER_FAMILIES, CAREER_FAMILY_KEYS, EXIT_AGE_BANDS, RETIRED_LIST_NOTE, SIGNING_AGE_BANDS, STARTER_MIN_SHARE, YEARS_IN_LEAGUE_BANDS, bandOf,
  type AgeBand, type CareerFamily, type ExitAgeBand, type NflExitsByAge, type NflRateRow, type NflRatesByAge, type NflRetiredList,
  type NflRookieAge, type YearsInLeagueBand,
} from "./nflCareers.js";
import type { PlayerIdRow } from "./rows.js";
import { BOOTSTRAP_REPLICATES, BOOTSTRAP_SEED, acrossSeasons, bootstrapOverPlayers, bootstrapRng, round, type Estimate } from "./stats.js";
import { MIN_PAIRS_PER_AGE, deltaCurve, peakAge, usagePairs, type AgePoint, type SnapSeason, type UsagePair } from "./usage.js";
import { winSpread, winsBySeason, yearOverYearR, type ResultsFixture, type WinCarry, type WinSpread } from "./wins.js";

export type UsageGroup = Exclude<CareerGroup, "K" | "P" | "LS">;

/** The week-8 measures pooled over seasons (mean of the season values; SE across seasons). */
export type CrossRow = Readonly<Record<(typeof CROSS_MEASURES)[number], Estimate>>;

export interface WeekEightSeason {
  readonly season: number;
  readonly byeFilled: number;
  readonly league: CrossValues;
  readonly byGroup: Readonly<Record<CareerGroup, CrossValues>>;
}

export interface PeakRow {
  /** Within-player pairs and the players they come from. */
  readonly pairs: number;
  readonly playerCount: number;
  /** Null when the curve never rises then falls. SE from the bootstrap replicates that found a peak. */
  readonly peakAge: Estimate | null;
  /** Share of bootstrap replicates that found a peak. */
  readonly resolved: number;
  readonly curve: readonly AgePoint[];
}

export interface CareerRow {
  readonly entrants: number;
  readonly censored: number;
  readonly expectedCareer: Estimate;
  readonly reach5: Estimate;
  readonly reach10: Estimate;
  /** P(career ≥ k), k = 1..15. */
  readonly curve: readonly number[];
}

export interface ComebackRow {
  /** Cases: credited in Y, on no list in Y+1. */
  readonly cases: number;
  readonly back: number;
  /** back / cases; SE from the bootstrap over players; n = cases. */
  readonly share: Estimate;
}

export interface Coverage {
  readonly rosterRows: number;
  readonly snapRows: number;
  readonly snapPlayerSeasons: number;
  /** Snap player-seasons joined to a roster id through the roster's own PFR id, through the player table, or not at all. */
  readonly linkedByRoster: number;
  readonly linkedByPlayerTable: number;
  readonly unlinked: number;
  /** Snap player-seasons whose group had to come from the snap-count position (no roster row that season). */
  readonly groupFromSnapPosition: number;
  /** Snap player-seasons with no birth date. */
  readonly noBirthDate: number;
  /** Career entrants whose entry row has no readable position. */
  readonly entrantsNoGroup: number;
  /** Men first credited inside the entry window but left out: entered the league before it, or no entry year. */
  readonly enteredBeforeWindow: number;
  readonly noEntryYear: number;
}

export interface NflCareersReport {
  /** The day the numbers were measured (`YYYY-MM-DD`). */
  readonly measuredOn: string;
  readonly seasons: {
    readonly read: readonly [number, number];
    readonly weekEight: readonly number[];
    readonly careerEntry: readonly [number, number];
    readonly lastObserved: number;
    readonly usage: readonly [number, number];
    readonly comebacks: readonly [number, number];
    readonly winCarry: readonly [number, number];
    readonly winSpread: readonly [number, number];
  };
  readonly weekEight: {
    readonly pooled: { readonly league: CrossRow; readonly byGroup: Readonly<Record<CareerGroup, CrossRow>> };
    /** The written definition's reading of the 53 (status ACT alone), league only. */
    readonly actOnly: CrossRow;
    readonly perSeason: readonly WeekEightSeason[];
    /** Rookies' ages on the 53s, pooled over the seasons' men (2026-11-06). */
    readonly rookieAge: NflRookieAge;
  };
  readonly peakUsage: {
    readonly minPairsPerAge: number;
    readonly byGroup: Readonly<Record<UsageGroup, { readonly stayers: PeakRow; readonly withExits: PeakRow }>>;
  };
  readonly careers: {
    readonly horizon: number;
    readonly league: CareerRow;
    readonly byGroup: Readonly<Record<CareerGroup, CareerRow>>;
    /** The member groups' entrants pooled (`CAREER_FAMILIES`), one Kaplan-Meier each. */
    readonly byFamily: Readonly<Record<CareerFamily, CareerRow>>;
  };
  readonly comebacks: { readonly league: ComebackRow; readonly byGroup: Readonly<Record<CareerGroup, ComebackRow>> };
  readonly wins: { readonly yearOverYear: WinCarry; readonly spread: WinSpread };
  /** The reserve/retired list by age (2026-11-06). */
  readonly retiredList: NflRetiredList;
  /** Back on a 53, and starters gone, by age (2026-11-06). */
  readonly exitsByAge: NflExitsByAge;
  readonly coverage: Coverage;
  readonly bootstrap: { readonly seed: string; readonly replicates: number };
  readonly sources: readonly AssetManifest[];
}

export interface BaselineInput {
  readonly measuredOn: string;
  readonly ledger: RosterLedger;
  readonly weekEight: readonly WeekEight[];
  readonly weekEightActOnly: readonly WeekEight[];
  readonly snaps: ReadonlyMap<number, ReadonlyMap<string, SnapSeason>>;
  readonly playerIds: readonly PlayerIdRow[];
  readonly fixture: ResultsFixture;
  readonly cohort: CohortWindow;
  readonly comebackYears: readonly number[];
  readonly winCarrySeasons: readonly number[];
  readonly winSpreadSeasons: readonly number[];
  /** Y for the retired list: credited in Y-1, on the list in Y. Every Y-1 and Y must be read. */
  readonly retiredListYears: readonly number[];
  /** Y for the exits by age: credited in Y, followed through Y+2. Every Y+2 must be read. */
  readonly exitYears: readonly number[];
  readonly counts: { readonly rosterRows: number; readonly snapRows: number };
  readonly sources: readonly AssetManifest[];
  readonly replicates?: number;
}

const est = (value: number, se: number, n: number, places = 4): Estimate => ({ value: round(value, places), se: round(se, places), n });

const roundCross = (v: CrossValues): CrossValues => ({
  n: v.n, meanAge: round(v.meanAge), age22OrUnder: round(v.age22OrUnder), age31Plus: round(v.age31Plus),
  age34Plus: round(v.age34Plus), rookie: round(v.rookie), undrafted: round(v.undrafted),
});

function pool(values: readonly CrossValues[]): CrossRow {
  const n = values.reduce((a, v) => a + v.n, 0);
  const row = {} as Record<(typeof CROSS_MEASURES)[number], Estimate>;
  for (const m of CROSS_MEASURES) {
    const e = acrossSeasons(values.map((v) => v[m]), n);
    row[m] = est(e.value, e.se, n);
  }
  return row;
}

function byPlayer<T extends { readonly player: string }>(pairs: readonly T[]): T[][] {
  const m = new Map<string, T[]>();
  for (const p of pairs) {
    let list = m.get(p.player);
    if (list === undefined) m.set(p.player, (list = []));
    list.push(p);
  }
  return [...m.keys()].sort().map((k) => m.get(k)!);
}

function peakRow(pairs: readonly UsagePair[], label: string, replicates: number): PeakRow {
  const units = byPlayer(pairs);
  const curve = deltaCurve(pairs);
  const peak = peakAge(curve);
  const boot = bootstrapOverPlayers(units, (s) => peakAge(deltaCurve(s)), bootstrapRng(label), replicates);
  return {
    pairs: pairs.length,
    playerCount: units.length,
    peakAge: peak === null ? null : est(peak, boot.se, pairs.length),
    resolved: round(boot.resolved),
    curve: curve.map((p) => ({ age: p.age, n: p.n, meanDelta: round(p.meanDelta), smoothed: round(p.smoothed) })),
  };
}

function careerRow(entrants: readonly Entrant[], label: string, replicates: number): CareerRow {
  const v = careerValues(entrants);
  const units = entrants.map((e) => [e]);
  const se = (pick: (c: ReturnType<typeof careerValues>) => number, what: string) =>
    bootstrapOverPlayers(units, (s) => pick(careerValues(s)), bootstrapRng(`${label}/${what}`), replicates).se;
  return {
    entrants: v.entrants,
    censored: v.censored,
    expectedCareer: est(v.expected, se((c) => c.expected, "expected"), v.entrants),
    reach5: est(v.reach5, se((c) => c.reach5, "reach5"), v.entrants),
    reach10: est(v.reach10, se((c) => c.reach10, "reach10"), v.entrants),
    curve: v.curve.map((x) => round(x)),
  };
}

function comebackRow(input: BaselineInput, group: CareerGroup | null, label: string, replicates: number): ComebackRow {
  const units = comebackUnits(input.ledger, input.comebackYears, group);
  const cases = units.flat();
  const back = cases.filter((c) => c.back).length;
  const share = (s: readonly { back: boolean }[]) => (s.length === 0 ? null : s.filter((c) => c.back).length / s.length);
  const boot = bootstrapOverPlayers(units, share, bootstrapRng(label), replicates);
  return { cases: cases.length, back, share: est(cases.length === 0 ? 0 : back / cases.length, boot.se, cases.length) };
}

/**
 * A rate over the cases `keep` picks: n, the hits and their share, SE by the bootstrap over players
 * (each player's kept cases are one unit, as for comebacks), n = cases.
 */
export function rateRow(units: readonly (readonly RateCase[])[], keep: (c: RateCase) => boolean, label: string, replicates: number): NflRateRow {
  const kept = units.map((u) => u.filter(keep)).filter((u) => u.length > 0);
  const cases = kept.flat();
  const count = cases.filter((c) => c.hit).length;
  const share = (s: readonly RateCase[]) => (s.length === 0 ? null : s.filter((c) => c.hit).length / s.length);
  const boot = bootstrapOverPlayers(kept, share, bootstrapRng(label), replicates);
  return { n: cases.length, count, share: est(cases.length === 0 ? 0 : count / cases.length, boot.se, cases.length) };
}

/** A rate in each age band (age as the case carries it), over every case, and the cases with no age. */
export function ratesByAge<K extends string>(units: readonly (readonly RateCase[])[], bands: readonly AgeBand<K>[], label: string, replicates: number): NflRatesByAge<K> {
  const byAge = {} as Record<K, NflRateRow>;
  for (const b of bands) byAge[b.key] = rateRow(units, (c) => bandOf(bands, c.age) === b.key, `${label}/${b.key}`, replicates);
  return { byAge, all: rateRow(units, () => true, `${label}/all`, replicates), noBirthDate: units.flat().filter((c) => c.age === null).length };
}

function retiredListBlock(input: BaselineInput, replicates: number): NflRetiredList {
  const units = retiredListUnits(input.ledger, input.retiredListYears);
  const rates = ratesByAge(units, EXIT_AGE_BANDS, "retiredList", replicates);
  const byYearsInLeague = {} as Record<YearsInLeagueBand, NflRateRow>;
  for (const b of YEARS_IN_LEAGUE_BANDS) {
    byYearsInLeague[b.key] = rateRow(units, (c) => bandOf(YEARS_IN_LEAGUE_BANDS, c.yearsExp) === b.key, `retiredList/years/${b.key}`, replicates);
  }
  const placed = retiredListPlacements(input.ledger, input.retiredListYears);
  const placedByAge = {} as Record<ExitAgeBand, number>;
  for (const b of EXIT_AGE_BANDS) placedByAge[b.key] = placed.filter((p) => bandOf(EXIT_AGE_BANDS, p.age) === b.key).length;
  const placedByYears = {} as Record<YearsInLeagueBand, number>;
  for (const b of YEARS_IN_LEAGUE_BANDS) placedByYears[b.key] = placed.filter((p) => bandOf(YEARS_IN_LEAGUE_BANDS, p.yearsExp) === b.key).length;
  return {
    seasons: span(input.retiredListYears),
    byAge: rates.byAge,
    byYearsInLeague,
    all: rates.all,
    noBirthDate: rates.noBirthDate,
    noYearsInLeague: units.flat().filter((c) => c.yearsExp === null).length,
    placements: {
      total: placed.length,
      byAge: placedByAge,
      noBirthDate: placed.filter((p) => p.age === null).length,
      byYearsInLeague: placedByYears,
      noYearsInLeague: placed.filter((p) => p.yearsExp === null).length,
    },
    note: RETIRED_LIST_NOTE,
  };
}

function exitsBlock(input: BaselineInput, starters: ReadonlyMap<number, ReadonlySet<string>>, replicates: number): NflExitsByAge {
  return {
    seasons: span(input.exitYears),
    backOnA53: ratesByAge(backOnA53Units(input.ledger, input.exitYears), SIGNING_AGE_BANDS, "exits/backOnA53", replicates),
    startersGone: {
      minShare: STARTER_MIN_SHARE,
      ...ratesByAge(startersGoneUnits(input.ledger, input.exitYears, starters), EXIT_AGE_BANDS, "exits/startersGone", replicates),
    },
  };
}

const span = (xs: readonly number[]): readonly [number, number] => [Math.min(...xs), Math.max(...xs)];

/** Every season a measure reads must be in the ledger: a season not read would look like a man on no list. */
function assertReadable(input: BaselineInput): void {
  const read = new Set(input.ledger.finalWeek.keys());
  const need = (season: number, what: string) => {
    if (!read.has(season)) throw new Error(`${what} needs season ${season}, which was not read (read: ${[...read].sort().join(", ")})`);
  };
  if (input.retiredListYears.length === 0 || input.exitYears.length === 0) throw new Error("the retired list and the exits by age need at least one season each");
  for (const y of input.retiredListYears) {
    need(y - 1, `the retired list's Y = ${y}`);
    need(y, `the retired list's Y = ${y}`);
  }
  for (const y of input.exitYears) for (const s of [y, y + 1, y + 2]) need(s, `the exits' Y = ${y}`);
}

export function buildBaseline(input: BaselineInput): NflCareersReport {
  const replicates = input.replicates ?? BOOTSTRAP_REPLICATES;
  assertReadable(input);

  // ---- week 8
  const rawSeasons = input.weekEight.map((w) => crossByGroup(w.rows, w.season));
  const perSeason: WeekEightSeason[] = input.weekEight.map((w, i) => {
    const c = rawSeasons[i]!;
    const byGroup = {} as Record<CareerGroup, CrossValues>;
    for (const g of CAREER_GROUPS) byGroup[g] = roundCross(c.byGroup[g]);
    return { season: w.season, byeFilled: w.byeFilled, league: roundCross(c.league), byGroup };
  });
  const pooledByGroup = {} as Record<CareerGroup, CrossRow>;
  for (const g of CAREER_GROUPS) pooledByGroup[g] = pool(rawSeasons.map((c) => c.byGroup[g]));
  const actOnly = pool(input.weekEightActOnly.map((w) => crossByGroup(w.rows, w.season).league));

  // ---- snap players: join to the roster ledger, then group and age each season
  const table = new Map<string, PlayerIdRow>();
  for (const p of input.playerIds) if (!table.has(p.pfrId)) table.set(p.pfrId, p);
  const gsisOf = (pfr: string): { id: string | null; via: "roster" | "table" | null } => {
    const r = input.ledger.pfrToGsis.get(pfr);
    if (r !== undefined) return { id: r, via: "roster" };
    const t = table.get(pfr)?.gsisId ?? null;
    return t !== null ? { id: t, via: "table" } : { id: null, via: null };
  };
  const infoOf = (pfr: string, season: number, snap: SnapSeason) => {
    const g = gsisOf(pfr);
    const facts = g.id === null ? undefined : input.ledger.players.get(g.id);
    const rosterGroup = facts?.groupBySeason.get(season) ?? null;
    const group = rosterGroup ?? foldSnapPosition(snap.position);
    const birth = facts?.birthDate ?? table.get(pfr)?.birthDate ?? null;
    return { group, age: ageOn(birth, season), via: g.via, fromSnapPosition: rosterGroup === null };
  };
  let snapPlayerSeasons = 0;
  let linkedByRoster = 0;
  let linkedByPlayerTable = 0;
  let unlinked = 0;
  let groupFromSnapPosition = 0;
  let noBirthDate = 0;
  for (const [season, players] of input.snaps) {
    for (const [pfr, snap] of players) {
      snapPlayerSeasons++;
      const i = infoOf(pfr, season, snap);
      if (i.via === "roster") linkedByRoster++;
      else if (i.via === "table") linkedByPlayerTable++;
      else unlinked++;
      if (i.fromSnapPosition) groupFromSnapPosition++;
      if (i.age === null) noBirthDate++;
    }
  }
  // starters each exit season, by roster id: at least STARTER_MIN_SHARE of his main team's snaps on his side
  const starters = new Map<number, Set<string>>();
  for (const y of input.exitYears) {
    const ids = new Set<string>();
    for (const [pfr, snap] of input.snaps.get(y) ?? new Map<string, SnapSeason>()) {
      const id = snap.share >= STARTER_MIN_SHARE ? gsisOf(pfr).id : null;
      if (id !== null) ids.add(id);
    }
    starters.set(y, ids);
  }
  const stayers = usagePairs(input.snaps, infoOf, false);
  const exits = usagePairs(input.snaps, infoOf, true);
  const usageByGroup = {} as Record<UsageGroup, { stayers: PeakRow; withExits: PeakRow }>;
  for (const g of USAGE_GROUPS as readonly UsageGroup[]) {
    usageByGroup[g] = {
      stayers: peakRow(stayers.filter((p) => p.group === g), `usage/${g}/stayers`, replicates),
      withExits: peakRow(exits.filter((p) => p.group === g), `usage/${g}/exits`, replicates),
    };
  }

  // ---- careers
  const entrants = cohortEntrants(input.ledger, input.cohort);
  const excluded = cohortExclusions(input.ledger, input.cohort);
  const careersByGroup = {} as Record<CareerGroup, CareerRow>;
  for (const g of CAREER_GROUPS) careersByGroup[g] = careerRow(entrants.filter((e) => e.group === g), `careers/${g}`, replicates);
  const careersByFamily = {} as Record<CareerFamily, CareerRow>;
  for (const f of CAREER_FAMILY_KEYS) {
    // A family of one group (QB) is that group's row, its standard errors included.
    const groups = CAREER_FAMILIES[f];
    const members = new Set<CareerGroup | null>(groups);
    careersByFamily[f] = groups.length === 1 ? careersByGroup[groups[0]!] : careerRow(entrants.filter((e) => members.has(e.group)), `careers/family/${f}`, replicates);
  }

  // ---- comebacks
  const comebacksByGroup = {} as Record<CareerGroup, ComebackRow>;
  for (const g of CAREER_GROUPS) comebacksByGroup[g] = comebackRow(input, g, `comebacks/${g}`, replicates);

  // ---- wins
  const wins = winsBySeason(input.fixture);
  const carry = yearOverYearR(wins, input.winCarrySeasons);
  const spread = winSpread(wins, input.winSpreadSeasons);
  const snapSeasonsRead = [...input.snaps.keys()].filter((s) => input.snaps.get(s)!.size > 0);

  return {
    measuredOn: input.measuredOn,
    seasons: {
      read: span([...input.ledger.finalWeek.keys()]),
      weekEight: input.weekEight.map((w) => w.season),
      careerEntry: [input.cohort.firstEntry, input.cohort.lastEntry],
      lastObserved: input.cohort.lastSeason,
      usage: span(snapSeasonsRead),
      comebacks: span(input.comebackYears),
      winCarry: span(input.winCarrySeasons),
      winSpread: span(input.winSpreadSeasons),
    },
    weekEight: { pooled: { league: pool(rawSeasons.map((c) => c.league)), byGroup: pooledByGroup }, actOnly, perSeason, rookieAge: rookieAges(input.weekEight) },
    peakUsage: { minPairsPerAge: MIN_PAIRS_PER_AGE, byGroup: usageByGroup },
    careers: { horizon: CAREER_HORIZON, league: careerRow(entrants, "careers/league", replicates), byGroup: careersByGroup, byFamily: careersByFamily },
    comebacks: { league: comebackRow(input, null, "comebacks/league", replicates), byGroup: comebacksByGroup },
    wins: {
      yearOverYear: {
        transitions: carry.transitions.map((t) => ({ from: t.from, r: round(t.r) })),
        r: est(carry.r.value, carry.r.se, carry.r.n),
        pooledR: round(carry.pooledR),
      },
      spread: { bySeason: spread.bySeason.map((s) => ({ season: s.season, sd: round(s.sd) })), spread: est(spread.spread.value, spread.spread.se, spread.spread.n) },
    },
    retiredList: retiredListBlock(input, replicates),
    exitsByAge: exitsBlock(input, starters, replicates),
    coverage: {
      rosterRows: input.counts.rosterRows,
      snapRows: input.counts.snapRows,
      snapPlayerSeasons, linkedByRoster, linkedByPlayerTable, unlinked, groupFromSnapPosition, noBirthDate,
      entrantsNoGroup: entrants.filter((e) => e.group === null).length,
      enteredBeforeWindow: excluded.enteredBefore,
      noEntryYear: excluded.noEntryYear,
    },
    bootstrap: { seed: BOOTSTRAP_SEED, replicates },
    sources: input.sources,
  };
}
