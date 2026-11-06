/**
 * THE REAL NFL SIDE OF THE CAREER CHECK (ADR-087 D5b).
 *
 * MEASURED 2026-10-31 by `pnpm --filter @ff/calibration nfl-careers` from nflverse's public weekly
 * rosters (2012-2024), PFR snap counts (2013-2024; 2012's file has no rows) and the player table
 * (players.csv, read for pfr_id, gsis_id and birth_date only), and the franchise package's real
 * results fixture (team wins 2020-2024). 2025 is held out and never read (calibration.md §7).
 * Aggregates only. Copied from `reports/nfl-careers.json`, whose Markdown twin
 * (`reports/nfl-careers.md`) defines each number; a test keeps the constant and the JSON equal.
 *
 * Every share is 0-1; ages and careers are in years and seasons. Each number carries its standard
 * error and the count it rests on: across seasons for the week-8 rows and the team-win rows (sample
 * SD of the season values / √seasons); a bootstrap over players (200 replicates, seeded PRNG, seed
 * string `nfl-careers/bootstrap/v1`) for careers, peak usage and comebacks. The sim's own standard
 * error (seed-to-seed SD / √seeds) is the grader's.
 *
 * Careers by position family (`careers.byFamily`, ADR-087 §11) were added 2026-10-31 by a re-run on
 * the same downloaded files (the same sha256 as `reports/nfl-careers.json` lists); every other
 * number came out unchanged.
 *
 * Added 2026-11-06 by a re-run on the same downloaded files (the same sha256 as
 * `reports/nfl-careers.json` lists, the report's date kept with `--measured-on 2026-10-31`), for the
 * owner's aging rulings of that day; every earlier number came out unchanged. All REAL (counted):
 * - `weekEight.rookieAge`: rookies' ages on the week-8 53s, 2018-24 pooled over the men.
 * - `weekEight.byGroupBySeason`: the by-group 22-or-under, 31+ and 34+ shares of 2022-24, copied
 *   from the report's `weekEight.perSeason[].byGroup` (the JSON holds them there, not twice).
 * - `retiredList`: the reserve/retired list (code R02) by age and years in the league, 2021-24. A
 *   lower bound: only men under contract are placed on it (`RETIRED_LIST_NOTE`).
 * - `exitsByAge`: back on a 53 within two seasons, and starters on no list for two seasons, by age,
 *   2016-22. Survivors: the men still playing at 33 are the durable and the wanted.
 * `OTC_SIGNED_AGAIN` (below) is REPORTED by another thread, not measured, and is not in the JSON.
 *
 * Two readings differ from the written shared definitions, both forced by the data: the 53 is ACT
 * or INA (from 2019 the file splits the 53 into dressed and game-day inactive), and the cohorts are
 * men first credited 2012-2022 who entered the league in 2012 or later.
 */
import type { CareerGroup } from "./groups.js";
import type { Estimate } from "./stats.js";

export type NflUsageGroup = Exclude<CareerGroup, "K" | "P" | "LS">;

/**
 * The position families careers are also graded by (ADR-087 §11, 2026-10-31): single small groups
 * (kickers, punters, snappers, quarterbacks) can catch only a gross miss, so careers are read on
 * the member groups' entrants pooled as well. Both sides pool the same way: the real side runs its
 * Kaplan-Meier on the members' entrants together (`baseline.ts`), the grader the sim's
 * (`careerGrade.ts`).
 */
export type CareerFamily = "QB" | "SKILL" | "LINE" | "BACK_SEVEN" | "SPECIALISTS";

export const CAREER_FAMILIES: Readonly<Record<CareerFamily, readonly CareerGroup[]>> = {
  QB: ["QB"],
  SKILL: ["RB", "WR", "TE"],
  LINE: ["OL", "IDL", "EDGE"],
  BACK_SEVEN: ["LB", "CB", "S"],
  SPECIALISTS: ["K", "P", "LS"],
};

export const CAREER_FAMILY_KEYS: readonly CareerFamily[] = ["QB", "SKILL", "LINE", "BACK_SEVEN", "SPECIALISTS"];

/** The 53s at week 8, pooled over seasons: the mean of the season values (n = men over all seasons). */
export interface NflWeekEightRow {
  readonly meanAge: Estimate;
  readonly age22OrUnder: Estimate;
  readonly age31Plus: Estimate;
  readonly age34Plus: Estimate;
  /**
   * `years_exp` 0. In the rosters `years_exp` is the season less `entry_year`: seasons since he
   * came into the league, not credited seasons. So a rookie is a man in his first season in the
   * league, and the sim reads its rookies the same way (`careerCheck.ts` `rosterPicture`).
   */
  readonly rookie: Estimate;
  /** No draft pick. */
  readonly undrafted: Estimate;
}

/** Peak usage age (n = within-player pairs); null when no peak was found. `resolved`: share of bootstrap replicates that found one. */
export interface NflPeakUsageRow {
  readonly peakAge: Estimate | null;
  readonly resolved: number;
  /** The variant that also counts a season with no snaps (an exit) as share 0. */
  readonly peakAgeWithExits: Estimate | null;
  readonly resolvedWithExits: number;
}

/** Careers by entry group, Kaplan-Meier over credited seasons (n = entrants). */
export interface NflCareerRow {
  readonly entrants: number;
  readonly censored: number;
  /** Restricted mean to 15 seasons. */
  readonly expectedCareer: Estimate;
  readonly reach5: Estimate;
  readonly reach10: Estimate;
}

/** One season's league values at week 8 (n = men on the 53s that week). */
export interface NflWeekEightSeason {
  readonly season: number;
  readonly n: number;
  readonly meanAge: number;
  readonly age22OrUnder: number;
  readonly age31Plus: number;
  readonly age34Plus: number;
  readonly rookie: number;
  readonly undrafted: number;
}

// ---------------------------------------------------------------- 2026-11-06 additions: types and bands

/**
 * Whole-year bins of a rookie's age on 23 October (`weekEight.rookieAge.shareByWholeYear`):
 * `upTo20` is 20 or younger, `from26` is 26 or older, the rest one whole year each.
 */
export const ROOKIE_AGE_BINS = ["upTo20", "age21", "age22", "age23", "age24", "age25", "from26"] as const;
export type RookieAgeBin = (typeof ROOKIE_AGE_BINS)[number];

/** The bin of a whole-year age. */
export function rookieAgeBin(age: number): RookieAgeBin {
  if (age <= 20) return "upTo20";
  if (age >= 26) return "from26";
  return `age${age}` as RookieAgeBin;
}

/** One season's rookies on the week-8 53s (n = rookies with a birth date). */
export interface NflRookieAgeSeason {
  readonly season: number;
  readonly n: number;
  readonly meanWhole: number;
  readonly meanFractional: number;
}

/**
 * Rookies (`years_exp` 0, the reading of the rookie share) on the week-8 53s, pooled over the
 * seasons' men (not the mean of season values): n = rookies with a birth date. Ages on 23 October:
 * whole years as everywhere else in this report, and with the fraction kept (days / 365.2425).
 * `sd` is the sample SD of the fractional ages. Drafted = a draft pick on his row.
 */
export interface NflRookieAge {
  readonly n: number;
  /** Rookies on the 53s with no readable birth date (left out of every age here). */
  readonly noBirthDate: number;
  readonly meanWhole: number;
  readonly meanFractional: number;
  readonly sd: number;
  /** Share of the n in each whole-year bin; the bins sum to 1. */
  readonly shareByWholeYear: Readonly<Record<RookieAgeBin, number>>;
  readonly draftedN: number;
  readonly draftedMeanFractional: number;
  readonly undraftedN: number;
  readonly undraftedMeanFractional: number;
  readonly perSeason: readonly NflRookieAgeSeason[];
}

/** One group's age shares on one season's week-8 53s (n = men; shares over men with a birth date). */
export interface NflGroupAgeShares {
  readonly n: number;
  /** 22 or under (the report's `age22OrUnder`). */
  readonly upTo22: number;
  readonly age31Plus: number;
  readonly age34Plus: number;
}

/** One season's week-8 age shares by group: the report's `weekEight.perSeason[].byGroup`, copied. */
export interface NflWeekEightGroupSeason {
  readonly season: number;
  readonly byGroup: Readonly<Record<CareerGroup, NflGroupAgeShares>>;
}

/** The seasons `weekEight.byGroupBySeason` copies (the grader's latest three). */
export const BY_GROUP_BY_SEASON_SEASONS: readonly number[] = [2022, 2023, 2024];

/** An age band: its key and the oldest whole-year age in it (the last band takes every age above). */
export interface AgeBand<K extends string> {
  readonly key: K;
  readonly last: number;
}

/** The band of an age, or null for no age. */
export function bandOf<K extends string>(bands: readonly AgeBand<K>[], age: number | null): K | null {
  if (age === null) return null;
  for (const b of bands) if (age <= b.last) return b.key;
  return bands[bands.length - 1]!.key;
}

/** Bands of the retired list and of starters gone: 25 and under, 26-28, 29-30, 31-32, 33 and over. */
export type ExitAgeBand = "upTo25" | "age26To28" | "age29To30" | "age31To32" | "from33";
export const EXIT_AGE_BANDS: readonly AgeBand<ExitAgeBand>[] = [
  { key: "upTo25", last: 25 }, { key: "age26To28", last: 28 }, { key: "age29To30", last: 30 }, { key: "age31To32", last: 32 }, { key: "from33", last: Infinity },
];

/** Bands of "back on a 53" and of the OverTheCap signed-again rates: 26 and under, 27-28, 29-30, 31-32, 33 and over. */
export type SigningAgeBand = "upTo26" | "age27To28" | "age29To30" | "age31To32" | "from33";
export const SIGNING_AGE_BANDS: readonly AgeBand<SigningAgeBand>[] = [
  { key: "upTo26", last: 26 }, { key: "age27To28", last: 28 }, { key: "age29To30", last: 30 }, { key: "age31To32", last: 32 }, { key: "from33", last: Infinity },
];

/** Bands of years in the league (`years_exp`): 0, 1-2, 3-5, 6-9, 10 and more. */
export type YearsInLeagueBand = "exp0" | "exp1To2" | "exp3To5" | "exp6To9" | "exp10Plus";
export const YEARS_IN_LEAGUE_BANDS: readonly AgeBand<YearsInLeagueBand>[] = [
  { key: "exp0", last: 0 }, { key: "exp1To2", last: 2 }, { key: "exp3To5", last: 5 }, { key: "exp6To9", last: 9 }, { key: "exp10Plus", last: Infinity },
];

/** A rate over cases: n cases, `count` of them with the event, share = count / n (SE: bootstrap over players; n = cases). */
export interface NflRateRow {
  readonly n: number;
  readonly count: number;
  readonly share: Estimate;
}

/** The words that go with the retired list wherever it is shown. */
export const RETIRED_LIST_NOTE =
  "Most retirements are invisible in these files: only a man under contract is placed on the reserve/retired list (code R02), so a man who retires unsigned, or after his release, gets no code. These are lower bounds on retirement by age, not retirement rates.";

/**
 * The reserve/retired list (`onRetiredList`: code R02 with status RET, or RES in 2020), 2021-24.
 * The code exists only from 2020, so Y starts in 2021, the first season whose year before has it.
 */
export interface NflRetiredList {
  /** Y, the season he is on the list (in some regular-season week); his credited season is Y-1. */
  readonly seasons: readonly [number, number];
  /** Of men credited in Y-1 (on a final-week 53), the share on the retired list in Y, by age in Y-1. */
  readonly byAge: Readonly<Record<ExitAgeBand, NflRateRow>>;
  /** The same cases by years in the league in Y-1 (`years_exp` on his rows that season). */
  readonly byYearsInLeague: Readonly<Record<YearsInLeagueBand, NflRateRow>>;
  /** Every case, ages and years unknown included. */
  readonly all: NflRateRow;
  /** Cases with no birth date (in `all`, in no age band) and with no `years_exp` in Y-1. */
  readonly noBirthDate: number;
  readonly noYearsInLeague: number;
  /** Every man on the retired list in some Y (credited the year before or not), one per man and season: age and years in the league in Y. */
  readonly placements: {
    readonly total: number;
    readonly byAge: Readonly<Record<ExitAgeBand, number>>;
    readonly noBirthDate: number;
    readonly byYearsInLeague: Readonly<Record<YearsInLeagueBand, number>>;
    readonly noYearsInLeague: number;
  };
  /** `RETIRED_LIST_NOTE`. */
  readonly note: string;
}

/** A rate by age band, every case, and the cases with no birth date (in `all`, in no band). */
export interface NflRatesByAge<K extends string> {
  readonly byAge: Readonly<Record<K, NflRateRow>>;
  readonly all: NflRateRow;
  readonly noBirthDate: number;
}

/**
 * A starter: at least this share of his main team's snaps on his side that season (`usage.ts` snap
 * share). CHOSEN: 50%, the definition this measure was asked with.
 */
export const STARTER_MIN_SHARE = 0.5;

/**
 * Exits by age, Y = 2016-22, so both following seasons are seen and 2025 is never read. Ages in Y.
 */
export interface NflExitsByAge {
  readonly seasons: readonly [number, number];
  /**
   * Of men credited in Y (on a final-week 53), the share on a 53 in some regular-season week of
   * Y+1 or Y+2. This counts men still under contract, so it is looser than "signed again": compare
   * `OTC_SIGNED_AGAIN`, which follows only deals that ran out.
   */
  readonly backOnA53: NflRatesByAge<SigningAgeBand>;
  /**
   * Of starters (`STARTER_MIN_SHARE`, his main team, `usage.ts`) credited in Y, the share on no
   * team's list in any regular-season week of Y+1 and of Y+2: a proxy for leaving while still
   * wanted, which also holds injuries, suspensions and men cut in camp.
   */
  readonly startersGone: NflRatesByAge<ExitAgeBand> & { readonly minShare: number };
}

export interface NflCareers {
  readonly measuredOn: string;
  readonly weekEight: {
    readonly seasons: readonly number[];
    /**
     * The league's values season by season, so a reader can see a row's trend beside the pooled mean
     * (the undrafted and 22-or-under shares fall across 2018-24).
     */
    readonly leagueBySeason: readonly NflWeekEightSeason[];
    readonly league: NflWeekEightRow;
    readonly byGroup: Readonly<Record<CareerGroup, NflWeekEightRow>>;
    /** Rookies' ages at week 8, 2018-24 pooled (added 2026-11-06). */
    readonly rookieAge: NflRookieAge;
    /** The by-group 31+, 34+ and 22-or-under shares of 2022, 2023 and 2024 (added 2026-11-06). */
    readonly byGroupBySeason: readonly NflWeekEightGroupSeason[];
  };
  readonly peakUsage: {
    readonly seasons: readonly [number, number];
    readonly minPairsPerAge: number;
    readonly byGroup: Readonly<Record<NflUsageGroup, NflPeakUsageRow>>;
  };
  readonly careers: {
    readonly entrySeasons: readonly [number, number];
    readonly lastObserved: number;
    readonly horizon: number;
    readonly league: NflCareerRow;
    readonly byGroup: Readonly<Record<CareerGroup, NflCareerRow>>;
    /** The member groups' entrants pooled (`CAREER_FAMILIES`), one Kaplan-Meier each. */
    readonly byFamily: Readonly<Record<CareerFamily, NflCareerRow>>;
  };
  /** P(credited in Y+2 | credited in Y, on no list in Y+1), league (n = cases). Reported only. */
  readonly comebacks: { readonly seasons: readonly [number, number]; readonly share: Estimate };
  /** Mean of the year-over-year Pearson r of team wins (n = transitions), and each transition's r. */
  readonly winYearOverYearR: { readonly seasons: readonly [number, number]; readonly r: Estimate; readonly transitions: readonly number[] };
  /** Mean per-season SD of team wins (n = seasons); its value is `NFL_SPREAD.winSpread`'s. */
  readonly winSpread: { readonly seasons: readonly [number, number]; readonly spread: Estimate };
  /** The reserve/retired list by age, 2021-24 (added 2026-11-06). */
  readonly retiredList: NflRetiredList;
  /** Back on a 53, and starters gone, by age, 2016-22 (added 2026-11-06). */
  readonly exitsByAge: NflExitsByAge;
}

export const NFL_CAREERS: NflCareers = {
  measuredOn: "2026-10-31",
  weekEight: {
    seasons: [2018, 2019, 2020, 2021, 2022, 2023, 2024],
    leagueBySeason: [
      { season: 2018, n: 1696, meanAge: 26.1291, age22OrUnder: 0.1014, age31Plus: 0.0973, age34Plus: 0.0354, rookie: 0.1686, undrafted: 0.2983 },
      { season: 2019, n: 1694, meanAge: 26.1192, age22OrUnder: 0.1033, age31Plus: 0.0986, age34Plus: 0.0354, rookie: 0.16, undrafted: 0.2893 },
      { season: 2020, n: 1729, meanAge: 26.0492, age22OrUnder: 0.107, age31Plus: 0.0977, age34Plus: 0.0312, rookie: 0.1567, undrafted: 0.2903 },
      { season: 2021, n: 1729, meanAge: 26.1596, age22OrUnder: 0.0949, age31Plus: 0.1076, age34Plus: 0.0272, rookie: 0.1377, undrafted: 0.2707 },
      { season: 2022, n: 1735, meanAge: 26.2086, age22OrUnder: 0.0738, age31Plus: 0.1026, age34Plus: 0.0294, rookie: 0.1597, undrafted: 0.2686 },
      { season: 2023, n: 1730, meanAge: 26.2618, age22OrUnder: 0.0734, age31Plus: 0.0977, age34Plus: 0.0266, rookie: 0.1595, undrafted: 0.2538 },
      { season: 2024, n: 1735, meanAge: 26.3429, age22OrUnder: 0.0657, age31Plus: 0.102, age34Plus: 0.03, rookie: 0.1568, undrafted: 0.2478 },
    ],
    league: { meanAge: { value: 26.1815, se: 0.0371, n: 12048 }, age22OrUnder: { value: 0.0885, se: 0.0064, n: 12048 }, age31Plus: { value: 0.1005, se: 0.0014, n: 12048 }, age34Plus: { value: 0.0307, se: 0.0013, n: 12048 }, rookie: { value: 0.157, se: 0.0036, n: 12048 }, undrafted: { value: 0.2741, se: 0.0073, n: 12048 } },
    byGroup: {
      QB: { meanAge: { value: 27.8487, se: 0.0946, n: 565 }, age22OrUnder: { value: 0.0566, se: 0.0089, n: 565 }, age31Plus: { value: 0.2405, se: 0.0121, n: 565 }, age34Plus: { value: 0.1436, se: 0.0096, n: 565 }, rookie: { value: 0.1292, se: 0.0094, n: 565 }, undrafted: { value: 0.1647, se: 0.009, n: 565 } },
      RB: { meanAge: { value: 25.3731, se: 0.0811, n: 913 }, age22OrUnder: { value: 0.133, se: 0.0143, n: 913 }, age31Plus: { value: 0.0473, se: 0.005, n: 913 }, age34Plus: { value: 0.0085, se: 0.0034, n: 913 }, rookie: { value: 0.1791, se: 0.0112, n: 913 }, undrafted: { value: 0.2927, se: 0.008, n: 913 } },
      WR: { meanAge: { value: 25.5413, se: 0.0779, n: 1319 }, age22OrUnder: { value: 0.128, se: 0.0069, n: 1319 }, age31Plus: { value: 0.0624, se: 0.0067, n: 1319 }, age34Plus: { value: 0.0128, se: 0.0027, n: 1319 }, rookie: { value: 0.1829, se: 0.0105, n: 1319 }, undrafted: { value: 0.2716, se: 0.0161, n: 1319 } },
      TE: { meanAge: { value: 26.2789, se: 0.0634, n: 767 }, age22OrUnder: { value: 0.0653, se: 0.0073, n: 767 }, age31Plus: { value: 0.0981, se: 0.0079, n: 767 }, age34Plus: { value: 0.0317, se: 0.0056, n: 767 }, rookie: { value: 0.1408, se: 0.0073, n: 767 }, undrafted: { value: 0.3091, se: 0.0174, n: 767 } },
      OL: { meanAge: { value: 26.4287, se: 0.049, n: 2025 }, age22OrUnder: { value: 0.0688, se: 0.0072, n: 2025 }, age31Plus: { value: 0.108, se: 0.0062, n: 2025 }, age34Plus: { value: 0.0223, se: 0.0025, n: 2025 }, rookie: { value: 0.1481, se: 0.0055, n: 2025 }, undrafted: { value: 0.2457, se: 0.0115, n: 2025 } },
      EDGE: { meanAge: { value: 25.8919, se: 0.1146, n: 1794 }, age22OrUnder: { value: 0.0946, se: 0.0116, n: 1794 }, age31Plus: { value: 0.0856, se: 0.0065, n: 1794 }, age34Plus: { value: 0.0169, se: 0.0024, n: 1794 }, rookie: { value: 0.1762, se: 0.0132, n: 1794 }, undrafted: { value: 0.1993, se: 0.0091, n: 1794 } },
      IDL: { meanAge: { value: 26.3302, se: 0.1457, n: 932 }, age22OrUnder: { value: 0.0668, se: 0.0054, n: 932 }, age31Plus: { value: 0.0965, se: 0.0061, n: 932 }, age34Plus: { value: 0.0193, se: 0.0032, n: 932 }, rookie: { value: 0.1487, se: 0.0108, n: 932 }, undrafted: { value: 0.2127, se: 0.0104, n: 932 } },
      LB: { meanAge: { value: 25.9635, se: 0.1332, n: 723 }, age22OrUnder: { value: 0.0604, se: 0.0133, n: 723 }, age31Plus: { value: 0.0468, se: 0.0086, n: 723 }, age34Plus: { value: 0.0064, se: 0.0044, n: 723 }, rookie: { value: 0.1038, se: 0.0228, n: 723 }, undrafted: { value: 0.2747, se: 0.0078, n: 723 } },
      CB: { meanAge: { value: 25.4037, se: 0.0437, n: 1393 }, age22OrUnder: { value: 0.1294, se: 0.0143, n: 1393 }, age31Plus: { value: 0.0516, se: 0.0054, n: 1393 }, age34Plus: { value: 0.007, se: 0.0025, n: 1393 }, rookie: { value: 0.2051, se: 0.0077, n: 1393 }, undrafted: { value: 0.2942, se: 0.0124, n: 1393 } },
      S: { meanAge: { value: 26.1026, se: 0.1271, n: 933 }, age22OrUnder: { value: 0.077, se: 0.006, n: 933 }, age31Plus: { value: 0.0903, se: 0.0074, n: 933 }, age34Plus: { value: 0.017, se: 0.0038, n: 933 }, rookie: { value: 0.1166, se: 0.0192, n: 933 }, undrafted: { value: 0.2558, se: 0.0059, n: 933 } },
      K: { meanAge: { value: 28.8704, se: 0.1672, n: 234 }, age22OrUnder: { value: 0.0343, se: 0.0102, n: 234 }, age31Plus: { value: 0.3024, se: 0.0189, n: 234 }, age34Plus: { value: 0.1747, se: 0.0167, n: 234 }, rookie: { value: 0.0944, se: 0.0105, n: 234 }, undrafted: { value: 0.5848, se: 0.0219, n: 234 } },
      P: { meanAge: { value: 28.1469, se: 0.1912, n: 226 }, age22OrUnder: { value: 0.0356, se: 0.0126, n: 226 }, age31Plus: { value: 0.2569, se: 0.012, n: 226 }, age34Plus: { value: 0.1419, se: 0.0166, n: 226 }, rookie: { value: 0.1241, se: 0.0217, n: 226 }, undrafted: { value: 0.4736, se: 0.0119, n: 226 } },
      LS: { meanAge: { value: 29.7902, se: 0.2587, n: 224 }, age22OrUnder: { value: 0.0045, se: 0.0045, n: 224 }, age31Plus: { value: 0.4107, se: 0.0209, n: 224 }, age34Plus: { value: 0.192, se: 0.0186, n: 224 }, rookie: { value: 0.0625, se: 0.0096, n: 224 }, undrafted: { value: 0.8839, se: 0.0177, n: 224 } },
    },
    rookieAge: {
      n: 1891,
      noBirthDate: 0,
      meanWhole: 22.6705,
      meanFractional: 23.1577,
      sd: 1.018,
      shareByWholeYear: { upTo20: 0.0016, age21: 0.128, age22: 0.3152, age23: 0.3543, age24: 0.166, age25: 0.0286, from26: 0.0063 },
      draftedN: 1442,
      draftedMeanFractional: 23.0099,
      undraftedN: 449,
      undraftedMeanFractional: 23.6325,
      perSeason: [
        { season: 2018, n: 286, meanWhole: 22.493, meanFractional: 22.9777 },
        { season: 2019, n: 271, meanWhole: 22.5646, meanFractional: 23.0295 },
        { season: 2020, n: 271, meanWhole: 22.4096, meanFractional: 22.9026 },
        { season: 2021, n: 238, meanWhole: 22.4496, meanFractional: 22.935 },
        { season: 2022, n: 277, meanWhole: 22.8953, meanFractional: 23.3922 },
        { season: 2023, n: 276, meanWhole: 22.9058, meanFractional: 23.3971 },
        { season: 2024, n: 272, meanWhole: 22.9485, meanFractional: 23.442 },
      ],
    },
    byGroupBySeason: [
      { season: 2022, byGroup: {
        QB: { n: 78, upTo22: 0.0256, age31Plus: 0.2308, age34Plus: 0.1538 },
        RB: { n: 131, upTo22: 0.0763, age31Plus: 0.0458, age34Plus: 0.0076 },
        WR: { n: 191, upTo22: 0.1204, age31Plus: 0.0314, age34Plus: 0.0105 },
        TE: { n: 114, upTo22: 0.0789, age31Plus: 0.0702, age34Plus: 0.0088 },
        OL: { n: 289, upTo22: 0.0554, age31Plus: 0.1246, age34Plus: 0.0242 },
        EDGE: { n: 246, upTo22: 0.0691, age31Plus: 0.1098, age34Plus: 0.0244 },
        IDL: { n: 141, upTo22: 0.0496, age31Plus: 0.0922, age34Plus: 0.0213 },
        LB: { n: 111, upTo22: 0.0901, age31Plus: 0.0541, age34Plus: 0 },
        CB: { n: 190, upTo22: 0.0947, age31Plus: 0.0474, age34Plus: 0 },
        S: { n: 145, upTo22: 0.0897, age31Plus: 0.0966, age34Plus: 0.0138 },
        K: { n: 35, upTo22: 0.0571, age31Plus: 0.4, age34Plus: 0.2 },
        P: { n: 32, upTo22: 0.0313, age31Plus: 0.25, age34Plus: 0.125 },
        LS: { n: 32, upTo22: 0, age31Plus: 0.4063, age34Plus: 0.1875 },
      } },
      { season: 2023, byGroup: {
        QB: { n: 80, upTo22: 0.0375, age31Plus: 0.1875, age34Plus: 0.125 },
        RB: { n: 124, upTo22: 0.1129, age31Plus: 0.0726, age34Plus: 0 },
        WR: { n: 189, upTo22: 0.1111, age31Plus: 0.0529, age34Plus: 0.0106 },
        TE: { n: 107, upTo22: 0.0654, age31Plus: 0.0935, age34Plus: 0.028 },
        OL: { n: 298, upTo22: 0.0503, age31Plus: 0.1309, age34Plus: 0.0168 },
        EDGE: { n: 239, upTo22: 0.0837, age31Plus: 0.0753, age34Plus: 0.0251 },
        IDL: { n: 131, upTo22: 0.0611, age31Plus: 0.0763, age34Plus: 0.0153 },
        LB: { n: 129, upTo22: 0.0698, age31Plus: 0.0543, age34Plus: 0.0155 },
        CB: { n: 189, upTo22: 0.0952, age31Plus: 0.037, age34Plus: 0.0053 },
        S: { n: 146, upTo22: 0.0753, age31Plus: 0.0822, age34Plus: 0.0137 },
        K: { n: 33, upTo22: 0, age31Plus: 0.303, age34Plus: 0.1212 },
        P: { n: 33, upTo22: 0.0303, age31Plus: 0.2424, age34Plus: 0.0606 },
        LS: { n: 32, upTo22: 0, age31Plus: 0.4375, age34Plus: 0.2188 },
      } },
      { season: 2024, byGroup: {
        QB: { n: 83, upTo22: 0.0361, age31Plus: 0.2169, age34Plus: 0.1084 },
        RB: { n: 125, upTo22: 0.128, age31Plus: 0.048, age34Plus: 0 },
        WR: { n: 183, upTo22: 0.1038, age31Plus: 0.0765, age34Plus: 0 },
        TE: { n: 115, upTo22: 0.0348, age31Plus: 0.113, age34Plus: 0.0261 },
        OL: { n: 294, upTo22: 0.0544, age31Plus: 0.102, age34Plus: 0.0204 },
        EDGE: { n: 225, upTo22: 0.0578, age31Plus: 0.08, age34Plus: 0.0178 },
        IDL: { n: 137, upTo22: 0.0584, age31Plus: 0.1241, age34Plus: 0.0292 },
        LB: { n: 138, upTo22: 0.0507, age31Plus: 0.087, age34Plus: 0.029 },
        CB: { n: 191, upTo22: 0.0995, age31Plus: 0.0366, age34Plus: 0.0105 },
        S: { n: 146, upTo22: 0.0479, age31Plus: 0.0753, age34Plus: 0.0137 },
        K: { n: 33, upTo22: 0.0606, age31Plus: 0.2424, age34Plus: 0.1212 },
        P: { n: 33, upTo22: 0, age31Plus: 0.2121, age34Plus: 0.1515 },
        LS: { n: 32, upTo22: 0, age31Plus: 0.5, age34Plus: 0.2813 },
      } },
    ],
  },
  peakUsage: {
    seasons: [2013, 2024],
    minPairsPerAge: 20,
    byGroup: {
      QB: { peakAge: { value: 24, se: 1.2598, n: 658 }, resolved: 0.975, peakAgeWithExits: { value: 23, se: 0.8413, n: 848 }, resolvedWithExits: 0.65 },
      RB: { peakAge: { value: 24, se: 0.2641, n: 1393 }, resolved: 1, peakAgeWithExits: { value: 22, se: 0.7436, n: 1904 }, resolvedWithExits: 0.665 },
      WR: { peakAge: { value: 24, se: 0.1227, n: 1907 }, resolved: 1, peakAgeWithExits: { value: 23, se: 0.3882, n: 2578 }, resolvedWithExits: 0.985 },
      TE: { peakAge: { value: 25, se: 0.5012, n: 1100 }, resolved: 1, peakAgeWithExits: { value: 25, se: 0.5052, n: 1477 }, resolvedWithExits: 0.995 },
      OL: { peakAge: { value: 26, se: 0.4219, n: 2797 }, resolved: 1, peakAgeWithExits: { value: 25, se: 0.5498, n: 3593 }, resolvedWithExits: 0.98 },
      EDGE: { peakAge: { value: 25, se: 0.5197, n: 2789 }, resolved: 1, peakAgeWithExits: { value: 24, se: 0.5228, n: 3628 }, resolvedWithExits: 1 },
      IDL: { peakAge: { value: 26, se: 0.4055, n: 1331 }, resolved: 1, peakAgeWithExits: { value: 24, se: 0.3783, n: 1718 }, resolvedWithExits: 0.995 },
      LB: { peakAge: { value: 24, se: 0.4886, n: 1011 }, resolved: 1, peakAgeWithExits: { value: 24, se: 0.3867, n: 1271 }, resolvedWithExits: 0.99 },
      CB: { peakAge: { value: 24, se: 0.6865, n: 2052 }, resolved: 1, peakAgeWithExits: { value: 24, se: 0.4572, n: 2699 }, resolvedWithExits: 1 },
      S: { peakAge: { value: 26, se: 0.5809, n: 1388 }, resolved: 1, peakAgeWithExits: { value: 24, se: 0.5213, n: 1749 }, resolvedWithExits: 1 },
    },
  },
  careers: {
    entrySeasons: [2012, 2022],
    lastObserved: 2024,
    horizon: 15,
    league: { entrants: 4250, censored: 1598, expectedCareer: { value: 4.9509, se: 0.0821, n: 4250 }, reach5: { value: 0.4477, se: 0.0091, n: 4250 }, reach10: { value: 0.1185, se: 0.0091, n: 4250 } },
    byGroup: {
      QB: { entrants: 156, censored: 73, expectedCareer: { value: 6.5081, se: 0.5255, n: 156 }, reach5: { value: 0.5638, se: 0.0474, n: 156 }, reach10: { value: 0.2617, se: 0.0594, n: 156 } },
      RB: { entrants: 386, censored: 111, expectedCareer: { value: 3.9434, se: 0.1956, n: 386 }, reach5: { value: 0.3463, se: 0.0262, n: 386 }, reach10: { value: 0.0352, se: 0.0221, n: 386 } },
      WR: { entrants: 547, censored: 193, expectedCareer: { value: 4.4671, se: 0.238, n: 547 }, reach5: { value: 0.3688, se: 0.0235, n: 547 }, reach10: { value: 0.1211, se: 0.0242, n: 547 } },
      TE: { entrants: 275, censored: 99, expectedCareer: { value: 4.7715, se: 0.3341, n: 275 }, reach5: { value: 0.4089, se: 0.0345, n: 275 }, reach10: { value: 0.096, se: 0.0319, n: 275 } },
      OL: { entrants: 685, censored: 275, expectedCareer: { value: 5.2314, se: 0.211, n: 685 }, reach5: { value: 0.4999, se: 0.0215, n: 685 }, reach10: { value: 0.1076, se: 0.0203, n: 685 } },
      EDGE: { entrants: 735, censored: 271, expectedCareer: { value: 4.8913, se: 0.1763, n: 735 }, reach5: { value: 0.4674, se: 0.0204, n: 735 }, reach10: { value: 0.1075, se: 0.0192, n: 735 } },
      IDL: { entrants: 312, censored: 136, expectedCareer: { value: 5.2055, se: 0.2563, n: 312 }, reach5: { value: 0.5074, se: 0.0316, n: 312 }, reach10: { value: 0.1651, se: 0.0432, n: 312 } },
      LB: { entrants: 165, censored: 56, expectedCareer: { value: 4.7193, se: 0.4068, n: 165 }, reach5: { value: 0.4234, se: 0.0452, n: 165 }, reach10: { value: 0.0751, se: 0.0384, n: 165 } },
      CB: { entrants: 611, censored: 212, expectedCareer: { value: 4.4247, se: 0.1927, n: 611 }, reach5: { value: 0.4037, se: 0.022, n: 611 }, reach10: { value: 0.0864, se: 0.0252, n: 611 } },
      S: { entrants: 232, censored: 89, expectedCareer: { value: 5.1765, se: 0.2781, n: 232 }, reach5: { value: 0.4899, se: 0.0379, n: 232 }, reach10: { value: 0.0819, se: 0.0347, n: 232 } },
      K: { entrants: 50, censored: 28, expectedCareer: { value: 8.5173, se: 1.0478, n: 50 }, reach5: { value: 0.6168, se: 0.0756, n: 50 }, reach10: { value: 0.5327, se: 0.0811, n: 50 } },
      P: { entrants: 57, censored: 30, expectedCareer: { value: 7.8459, se: 0.9448, n: 57 }, reach5: { value: 0.5767, se: 0.0774, n: 57 }, reach10: { value: 0.3746, se: 0.0963, n: 57 } },
      LS: { entrants: 39, censored: 25, expectedCareer: { value: 9.7678, se: 1.1752, n: 39 }, reach5: { value: 0.6611, se: 0.081, n: 39 }, reach10: { value: 0.5399, se: 0.1118, n: 39 } },
    },
    byFamily: {
      QB: { entrants: 156, censored: 73, expectedCareer: { value: 6.5081, se: 0.5255, n: 156 }, reach5: { value: 0.5638, se: 0.0474, n: 156 }, reach10: { value: 0.2617, se: 0.0594, n: 156 } },
      SKILL: { entrants: 1208, censored: 403, expectedCareer: { value: 4.3117, se: 0.1465, n: 1208 }, reach5: { value: 0.37, se: 0.0144, n: 1208 }, reach10: { value: 0.0853, se: 0.0157, n: 1208 } },
      LINE: { entrants: 1732, censored: 682, expectedCareer: { value: 5.0754, se: 0.1271, n: 1732 }, reach5: { value: 0.4871, se: 0.0124, n: 1732 }, reach10: { value: 0.1158, se: 0.0145, n: 1732 } },
      BACK_SEVEN: { entrants: 1008, censored: 357, expectedCareer: { value: 4.6638, se: 0.1346, n: 1008 }, reach5: { value: 0.4271, se: 0.0168, n: 1008 }, reach10: { value: 0.0816, se: 0.0156, n: 1008 } },
      SPECIALISTS: { entrants: 146, censored: 83, expectedCareer: { value: 8.6501, se: 0.5824, n: 146 }, reach5: { value: 0.6147, se: 0.0432, n: 146 }, reach10: { value: 0.4816, se: 0.0507, n: 146 } },
    },
  },
  comebacks: { seasons: [2016, 2022], share: { value: 0.0254, se: 0.0046, n: 1182 } },
  winYearOverYearR: { seasons: [2020, 2024], r: { value: 0.396, se: 0.0875, n: 4 }, transitions: [0.6402, 0.2255, 0.373, 0.3452] },
  winSpread: { seasons: [2021, 2024], spread: { value: 3.0486, se: 0.2093, n: 4 } },
  retiredList: {
    seasons: [2021, 2024],
    byAge: {
      upTo25: { n: 3532, count: 7, share: { value: 0.002, se: 0.0007, n: 3532 } },
      age26To28: { n: 2011, count: 10, share: { value: 0.005, se: 0.0015, n: 2011 } },
      age29To30: { n: 702, count: 9, share: { value: 0.0128, se: 0.0041, n: 702 } },
      age31To32: { n: 388, count: 9, share: { value: 0.0232, se: 0.0067, n: 388 } },
      from33: { n: 305, count: 9, share: { value: 0.0295, se: 0.0093, n: 305 } },
    },
    byYearsInLeague: {
      exp0: { n: 1152, count: 1, share: { value: 0.0009, se: 0.0009, n: 1152 } },
      exp1To2: { n: 1993, count: 4, share: { value: 0.002, se: 0.0011, n: 1993 } },
      exp3To5: { n: 2189, count: 9, share: { value: 0.0041, se: 0.0013, n: 2189 } },
      exp6To9: { n: 1237, count: 17, share: { value: 0.0137, se: 0.0031, n: 1237 } },
      exp10Plus: { n: 367, count: 13, share: { value: 0.0354, se: 0.0086, n: 367 } },
    },
    all: { n: 6938, count: 44, share: { value: 0.0063, se: 0.001, n: 6938 } },
    noBirthDate: 0,
    noYearsInLeague: 0,
    placements: { total: 102, byAge: { upTo25: 14, age26To28: 25, age29To30: 13, age31To32: 14, from33: 28 }, noBirthDate: 8, byYearsInLeague: { exp0: 8, exp1To2: 16, exp3To5: 17, exp6To9: 32, exp10Plus: 29 }, noYearsInLeague: 0 },
    note: RETIRED_LIST_NOTE,
  },
  exitsByAge: {
    seasons: [2016, 2022],
    backOnA53: {
      byAge: {
        upTo26: { n: 7635, count: 6728, share: { value: 0.8812, se: 0.0039, n: 7635 } },
        age27To28: { n: 2026, count: 1729, share: { value: 0.8534, se: 0.0078, n: 2026 } },
        age29To30: { n: 1201, count: 965, share: { value: 0.8035, se: 0.012, n: 1201 } },
        age31To32: { n: 625, count: 463, share: { value: 0.7408, se: 0.0176, n: 625 } },
        from33: { n: 536, count: 388, share: { value: 0.7239, se: 0.0191, n: 536 } },
      },
      all: { n: 12023, count: 10273, share: { value: 0.8544, se: 0.0032, n: 12023 } },
      noBirthDate: 0,
    },
    startersGone: {
      minShare: 0.5,
      byAge: {
        upTo25: { n: 1766, count: 12, share: { value: 0.0068, se: 0.002, n: 1766 } },
        age26To28: { n: 1319, count: 23, share: { value: 0.0174, se: 0.0036, n: 1319 } },
        age29To30: { n: 532, count: 43, share: { value: 0.0808, se: 0.0121, n: 532 } },
        age31To32: { n: 250, count: 29, share: { value: 0.116, se: 0.0207, n: 250 } },
        from33: { n: 203, count: 43, share: { value: 0.2118, se: 0.0267, n: 203 } },
      },
      all: { n: 4070, count: 150, share: { value: 0.0369, se: 0.0028, n: 4070 } },
      noBirthDate: 0,
    },
  },
};

/** A rate reported by another thread and copied here as words gave it: no SE, no count by age. */
export interface ReportedSignedAgain {
  readonly status: "REPORTED";
  readonly source: string;
  /** The seasons the deals ran out in. */
  readonly seasons: readonly [number, number];
  /** Deals of at least this share of the cap (1.5%). */
  readonly minCapShare: number;
  /** Signed again within this many years. */
  readonly withinYears: number;
  /** Deals in all; no count by age was reported. */
  readonly n: number;
  /** Share signed again, by age (the reported convention for age is not stated). */
  readonly byAge: Readonly<Record<SigningAgeBand, number>>;
  /** "About half" of the next deals were for one year: 0.5 stands for those words. */
  readonly nextDealOneYearShare: number;
}

/**
 * REPORTED, NOT MEASURED HERE: signed again within two years, by age, for deals of at least 1.5% of
 * the cap that ran out in 2016-2022 (n = 1,799 deals): 94% at 26 and under, 89% at 27-28, 86% at
 * 29-30, 71% at 31-32 and 58% at 33 and over; about half of the next deals were for one year.
 * Counted by the salary-cap thread from OverTheCap data via nflverse (`historical_contracts`), and
 * reported in ADR-085 step 12 (`docs/decisions/ADR-085-the-salary-cap-and-player-contracts.md`,
 * near line 359) and `reports/cap-check.md` (Real, line 187). The counting code is not committed
 * and the contract file is not in calibration's cache, so the nfl-careers command cannot recount
 * it: this constant is not in `reports/nfl-careers.json`, and has no SE, no count by age and no
 * stated cap basis or age convention. It is the real comparison for the sim's signed-again rate by
 * age (the owner's ruling of 2026-11-06); `exitsByAge.backOnA53` is the looser rate this command
 * can count (men still under contract count too).
 */
export const OTC_SIGNED_AGAIN: ReportedSignedAgain = {
  status: "REPORTED",
  source: "ADR-085 step 12: OverTheCap data via nflverse, counted by the salary-cap thread",
  seasons: [2016, 2022],
  minCapShare: 0.015,
  withinYears: 2,
  n: 1799,
  byAge: { upTo26: 0.94, age27To28: 0.89, age29To30: 0.86, age31To32: 0.71, from33: 0.58 },
  nextDealOneYearShare: 0.5,
};
