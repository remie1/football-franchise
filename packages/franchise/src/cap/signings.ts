/**
 * ADR-085 §2: deals whose price the CBA sets — minimums, practice squad, rookie scale, tags, tenders.
 *
 * Later seasons: CBA tables grow as the CBA says through its last season; beyond it, and for the
 * tables the CBA ties to the cap, they grow with the cap (`cap / BASE_CAP`).
 */
import type { CalendarStamp, ContractYear, PlayerContract, PlayerId, Position, TeamId } from "@ff/contracts";
import {
  BASE_CAP, BASE_SEASON, CBA_LAST_SEASON, CREDITED_SEASON_GAMES, FIRST_ROUND_PICKS, FIRST_ROUND_TENDER_PRIOR_FACTOR,
  MINIMUM_2026, MINIMUM_STEP, PRACTICE_SQUAD_WEEKLY_2026, PRACTICE_SQUAD_WEEKS, PRACTICE_SQUAD_YOUNG_MAX_SEASONS,
  ROOKIE_YEARS, TAG_GROUP, TAG_PRICES_2026, TAG_PRIOR_SALARY_FACTOR, TENDERS_2026, UDFA_YEARS, type TenderLevel,
} from "./rules.js";
import { ROOKIE_SCALE_2026 } from "./rookieScale2026.js";
import { prorate, withCapHits } from "./money.js";

/** A credited season: 3+ games on full pay status (active, inactive or injured reserve). */
export const earnsCreditedSeason = (gamesOnFullPayStatus: number): boolean => gamesOnFullPayStatus >= CREDITED_SEASON_GAMES;

const round1000 = (n: number): number => Math.round(n / 1000) * 1000;

/**
 * The minimum base salary. `capForSeason` is needed only past the CBA's last season, where the
 * 2030 table grows with the cap.
 */
export function minimumSalary(season: number, creditedSeasons: number, capForSeason?: (s: number) => number): number {
  const tier = MINIMUM_2026[Math.max(0, Math.min(MINIMUM_2026.length - 1, creditedSeasons))]!;
  const within = Math.min(season, CBA_LAST_SEASON);
  const base = tier + MINIMUM_STEP * (within - BASE_SEASON);
  if (season <= CBA_LAST_SEASON) return base;
  if (!capForSeason) throw new Error(`minimum for ${season} needs the cap (past the CBA's ${CBA_LAST_SEASON})`);
  return round1000(base * capForSeason(season) / capForSeason(CBA_LAST_SEASON));
}

const oneYear = (season: number, baseSalary: number, fullyGuaranteed = false): ContractYear => ({
  season, baseSalary, signingBonusProration: 0, guarantees: { fullyGuaranteed }, capHit: baseSalary,
});

export interface SigningBase {
  player: PlayerId;
  team: TeamId;
  season: number;
  signedAt: CalendarStamp;
}

/** A minimum deal: each year at the minimum for the credited seasons he will have then. */
export function minimumContract(s: SigningBase & { creditedSeasons: number; years: number; capForSeason?: (s: number) => number }): PlayerContract {
  const years = Array.from({ length: s.years }, (_, i) =>
    oneYear(s.season + i, minimumSalary(s.season + i, s.creditedSeasons + i, s.capForSeason)));
  return { player: s.player, team: s.team, signedAt: s.signedAt, kind: "MINIMUM", years };
}

/** A practice-squad deal for one season. A veteran is paid `veteranWeekly` (default the minimum). */
export function signPracticeSquad(s: SigningBase & { creditedSeasons: number; veteranWeekly?: number; capForSeason?: (s: number) => number }): PlayerContract {
  const young = s.creditedSeasons <= PRACTICE_SQUAD_YOUNG_MAX_SEASONS;
  const weekly2026 = young ? PRACTICE_SQUAD_WEEKLY_2026.young
    : Math.min(PRACTICE_SQUAD_WEEKLY_2026.veteranMax, Math.max(PRACTICE_SQUAD_WEEKLY_2026.veteranMin, s.veteranWeekly ?? 0));
  // Practice-squad pay moves with the rookie minimum.
  const scale = minimumSalary(s.season, 0, s.capForSeason) / minimumSalary(BASE_SEASON, 0);
  const pay = Math.round(weekly2026 * scale) * PRACTICE_SQUAD_WEEKS;
  return { player: s.player, team: s.team, signedAt: s.signedAt, kind: "PRACTICE_SQUAD", years: [oneYear(s.season, pay)] };
}

export interface RookieSigning extends SigningBase {
  /** Overall pick, or "UDFA". */
  pick: number | "UDFA";
  /** This season's cap; the rookie pool grows with it. */
  cap: number;
  capForSeason?: (s: number) => number;
}

/**
 * A rookie deal (Q4 a). Drafted: four years worth the slot's 2026 value grown with the cap. Each base
 * salary is the minimum for that year; the rest is signing bonus spread over the four years.
 * First-rounders are fully guaranteed and carry a fifth-year option (price 0 until fixed in year three).
 * Undrafted: three minimum years.
 *
 * Simplification: the real scale lets top picks' base salaries rise up to 25% of year one each year;
 * here the extra is all signing bonus, so the total and guarantee match but the yearly split differs.
 */
export function rookieContract(s: RookieSigning): PlayerContract {
  const mins = (n: number) => Array.from({ length: n }, (_, i) => minimumSalary(s.season + i, i, s.capForSeason));
  if (s.pick === "UDFA") {
    return { ...minimumContract({ ...s, creditedSeasons: 0, years: UDFA_YEARS }), kind: "ROOKIE" };
  }
  const slot = ROOKIE_SCALE_2026[Math.min(ROOKIE_SCALE_2026.length, Math.max(1, s.pick)) - 1]!;
  const grow = s.cap / BASE_CAP;
  const bases = mins(ROOKIE_YEARS);
  const value = Math.max(round1000(slot[0] * grow), bases.reduce((a, b) => a + b, 0));
  const bonus = value - bases.reduce((a, b) => a + b, 0);
  const firstRound = s.pick <= FIRST_ROUND_PICKS;
  let guaranteeLeft = Math.max(0, round1000(slot[1] * grow) - bonus);
  const shares = prorate(bonus, ROOKIE_YEARS);
  const years: ContractYear[] = bases.map((base, i) => {
    const g = firstRound ? base : Math.min(base, guaranteeLeft);
    guaranteeLeft -= g;
    return {
      season: s.season + i, baseSalary: base, signingBonusProration: shares[i] ?? 0,
      guarantees: { fullyGuaranteed: firstRound }, capHit: 0, ...(g > 0 && !firstRound ? { guaranteedSalary: g } : {}),
    };
  });
  return withCapHits({
    player: s.player, team: s.team, signedAt: s.signedAt, kind: "ROOKIE", signingBonus: bonus, years,
    ...(firstRound ? { fifthYearOption: { season: s.season + ROOKIE_YEARS, price: 0 } } : {}),
  });
}

/**
 * A tag's price (Q6 a): the 2026 price for his position grown with the cap, and at least 120% of his
 * previous salary. Until the league has five seasons of its own, the cap-share stands in for the
 * CBA's five-year average of the top five.
 */
export function tagPrice(position: Position, kind: "FRANCHISE_TAG" | "TRANSITION_TAG", cap: number, priorSalary = 0): number {
  const [franchise, transition] = TAG_PRICES_2026[TAG_GROUP[position]];
  const base = round1000((kind === "FRANCHISE_TAG" ? franchise : transition) * cap / BASE_CAP);
  return Math.max(base, round1000(priorSalary * TAG_PRIOR_SALARY_FACTOR));
}

/** A one-year, fully guaranteed tag contract. */
export function tagContract(s: SigningBase & { position: Position; kind: "FRANCHISE_TAG" | "TRANSITION_TAG"; cap: number; priorSalary?: number }): PlayerContract {
  const price = tagPrice(s.position, s.kind, s.cap, s.priorSalary);
  return { player: s.player, team: s.team, signedAt: s.signedAt, kind: s.kind, years: [oneYear(s.season, price, true)] };
}

/** A restricted free agent's tender price; grows with the cap; first-round at least 110% of prior salary. */
export function tenderPrice(level: TenderLevel, cap: number, priorSalary = 0): number {
  const base = round1000(TENDERS_2026[level] * cap / BASE_CAP);
  return level === "FIRST_ROUND" ? Math.max(base, round1000(priorSalary * FIRST_ROUND_TENDER_PRIOR_FACTOR)) : base;
}
