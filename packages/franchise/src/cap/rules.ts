/**
 * ADR-085 §2: the CBA's numbers. Provenance per constant; "COMPUTED" means read from the nflverse
 * contract file (OverTheCap) downloaded 2026-10-23, "REPORTED" means public reporting, unverified.
 */
import type { Position } from "@ff/contracts";

/** The season these tables describe, and its cap. REPORTED: NFL.com, $301.2M for 2026. */
export const BASE_SEASON = 2026;
export const BASE_CAP = 301_200_000;

/** The current CBA's last season. REPORTED (the 2020 CBA runs through 2030). */
export const CBA_LAST_SEASON = 2030;

/** A bonus spreads over the contract's years, at most five. REPORTED (CBA Art. 13). */
export const MAX_PRORATION_YEARS = 5;

/** A team may designate two releases before June 1 as post-June-1 cuts each league year. REPORTED (CBA Art. 13). */
export const POST_JUNE_1_DESIGNATIONS = 2;

/** From the new league year to the first game, only the 51 biggest cap numbers count. REPORTED. */
export const TOP_51 = 51;

/** A credited season needs this many games on full pay status. REPORTED (CBA Art. 8). */
export const CREDITED_SEASON_GAMES = 3;

/**
 * 2026 minimum base salary by credited seasons: 0, 1, 2, 3, 4-6, 7+. COMPUTED: the most common 2026
 * base salary by years since the draft in the contract file (885k, 1.005M, 1.075M, 1.145M, 1.215M, 1.3M).
 */
export const MINIMUM_2026: readonly number[] = [885_000, 1_005_000, 1_075_000, 1_145_000, 1_215_000, 1_215_000, 1_215_000, 1_300_000];

/** Each tier rises this much a year through the CBA's last season. REPORTED (2025 -> 2026 was +45k at every tier, COMPUTED). */
export const MINIMUM_STEP = 45_000;

/**
 * 2026 practice-squad pay per week. REPORTED: $13,750 for 0-2 credited seasons; veterans $18,350 to
 * $22,850. COMPUTED match: $247,500 and $330,300 / $411,300 are common 2026 base salaries in the file.
 */
export const PRACTICE_SQUAD_WEEKLY_2026 = { young: 13_750, veteranMin: 18_350, veteranMax: 22_850 } as const;
export const PRACTICE_SQUAD_WEEKS = 18;
/** Practice-squad players with more credited seasons than this are veterans. REPORTED. */
export const PRACTICE_SQUAD_YOUNG_MAX_SEASONS = 2;

/** The tag groups. Each position is tagged as one of these. REPORTED (CBA Art. 10). */
export type TagGroup = "QB" | "RB" | "WR" | "TE" | "OL" | "DE" | "DT" | "LB" | "CB" | "S" | "KP";

export const TAG_GROUP: Readonly<Record<Position, TagGroup>> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE",
  LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL",
  DE: "DE", DT: "DT", NT: "DT", OLB: "LB", MLB: "LB", ILB: "LB",
  CB: "CB", FS: "S", SS: "S", K: "KP", P: "KP", LS: "KP",
};

/**
 * 2026 tag prices in dollars: [non-exclusive franchise, transition]. REPORTED: released 2026-02-27
 * (Spotrac / HITC). Later seasons scale with the cap until the league has its own five-year history.
 */
export const TAG_PRICES_2026: Readonly<Record<TagGroup, readonly [number, number]>> = {
  QB: [43_895_000, 37_833_000], RB: [14_293_000, 11_323_000], WR: [27_298_000, 23_852_000],
  TE: [15_045_000, 12_687_000], OL: [25_773_000, 23_392_000], DE: [24_434_000, 21_512_000],
  DT: [27_127_000, 22_521_000], LB: [26_865_000, 21_925_000], CB: [21_161_000, 18_119_000],
  S: [20_149_000, 16_012_000], KP: [6_649_000, 6_005_000],
};

/** A tag pays at least this much of the player's previous salary. REPORTED (CBA Art. 10). */
export const TAG_PRIOR_SALARY_FACTOR = 1.2;

/** Restricted free agents have three credited seasons; fewer = exclusive rights. REPORTED. */
export const RFA_SEASONS = 3;

export type TenderLevel = "FIRST_ROUND" | "SECOND_ROUND" | "ORIGINAL_ROUND" | "RIGHT_OF_FIRST_REFUSAL";

/**
 * 2026 RFA tenders. REPORTED: NFL.com "2026 free agency questions answered". NFL Football Operations
 * lists slightly different numbers (8.107M / 5.811M / 3.674M / 3.547M); the two league pages disagree.
 * Tenders grow with the cap. The first-round tender is at least 110% of the prior salary.
 */
export const TENDERS_2026: Readonly<Record<TenderLevel, number>> = {
  FIRST_ROUND: 8_046_000, SECOND_ROUND: 5_767_000, ORIGINAL_ROUND: 3_674_000, RIGHT_OF_FIRST_REFUSAL: 3_520_000,
};
export const FIRST_ROUND_TENDER_PRIOR_FACTOR = 1.1;

/** Rookie deals run four years; undrafted rookies sign three. REPORTED (CBA Art. 7). */
export const ROOKIE_YEARS = 4;
export const UDFA_YEARS = 3;
export const FIRST_ROUND_PICKS = 32;
