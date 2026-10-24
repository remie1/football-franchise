/**
 * ADR-085 §5: how the cap grows each year. The real cap is the players' share of league revenue, so
 * the model grows revenue: an ordinary trend every year, scheduled steps when the national TV deals
 * are renegotiated, the labour negotiation when the CBA ends, and rare shocks (a pandemic or a
 * recession). Each season draws from its own fork of the seed, so a season's cap never depends on
 * how many other seasons were asked for.
 *
 * Every constant here is CHOSEN (provenance NONE) unless its comment says otherwise. The real history
 * it is checked against is `CAP_HISTORY`.
 */
import { createRng, type CapSeason, type Rng } from "@ff/contracts";
import { BASE_CAP, BASE_SEASON, CBA_LAST_SEASON } from "./rules.js";

/** The real cap, 2011-2026, in dollars. REPORTED (2025 and 2026 from NFL.com; earlier years from memory, unverified). */
export const CAP_HISTORY: readonly CapSeason[] = [
  [2011, 120_000_000], [2012, 120_600_000], [2013, 123_000_000], [2014, 133_000_000], [2015, 143_280_000],
  [2016, 155_270_000], [2017, 167_000_000], [2018, 177_200_000], [2019, 188_200_000], [2020, 198_200_000],
  [2021, 182_500_000], [2022, 208_200_000], [2023, 224_800_000], [2024, 255_400_000], [2025, 279_200_000],
  [2026, BASE_CAP],
].map(([season, cap]) => ({ season: season!, cap: cap! }));

export const CAP_GROWTH = {
  /** Ordinary yearly growth of counted revenue: mean and spread. */
  trendMean: 0.06,
  trendSd: 0.02,
  /** The league can opt out of the TV deals after 2029 (REPORTED); new money would start in 2030. */
  mediaOptOutSeason: 2030,
  mediaOptOutChance: 0.6,
  /** The TV deals run through 2033 (REPORTED); a renewal every ten years after. */
  mediaRenewalSeason: 2034,
  mediaRenewalEvery: 10,
  mediaBoost: [0.03, 0.12] as const,
  /** The first season after a CBA ends: the players' share may move, and rarely a lockout freezes growth. */
  labourEvery: 10,
  labourShareShift: [-0.02, 0.02] as const,
  lockoutChance: 0.1,
  lockoutGrowth: -0.05,
  /** A pandemic-style or recession year: 2021 fell 7.9% (REPORTED); the year after bounces back. */
  shockChance: 0.03,
  shockDrop: [-0.1, -0.03] as const,
  reboundBoost: 0.08,
  /** The range announced before the cap is set: the real cap lands inside it (2026: $301.2-305.7M, REPORTED). */
  projectionWidth: [0.01, 0.02] as const,
} as const;

/** What moved the cap one season, for the owners' meeting and the news. */
export interface CapDrivers {
  trend: number;
  media?: number;
  labour?: { shareShift: number; lockout: boolean };
  shock?: number;
  rebound?: number;
}

export interface CapForecast extends CapSeason {
  projectedLow: number;
  projectedHigh: number;
  growth: number;
  drivers: CapDrivers;
}

const uniform = (rng: Rng, [lo, hi]: readonly [number, number]): number => lo + (hi - lo) * rng.next();
function normal(rng: Rng, mean: number, sd: number): number {
  const u = Math.max(1e-12, rng.next());
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
}
const round100k = (n: number): number => Math.round(n / 100_000) * 100_000;

const isMediaRenewal = (s: number): boolean =>
  s >= CAP_GROWTH.mediaRenewalSeason && (s - CAP_GROWTH.mediaRenewalSeason) % CAP_GROWTH.mediaRenewalEvery === 0;
const isLabourYear = (s: number): boolean =>
  s > CBA_LAST_SEASON && (s - CBA_LAST_SEASON - 1) % CAP_GROWTH.labourEvery === 0;

/** One season's growth over the last, and why. `shockedLastYear` triggers the bounce-back. */
export function drawGrowth(seed: string, season: number, shockedLastYear: boolean): { growth: number; drivers: CapDrivers } {
  const rng = createRng(seed, `cap/${season}`);
  const drivers: CapDrivers = { trend: normal(rng, CAP_GROWTH.trendMean, CAP_GROWTH.trendSd) };
  let growth = drivers.trend;
  if ((season === CAP_GROWTH.mediaOptOutSeason && rng.next() < CAP_GROWTH.mediaOptOutChance) || isMediaRenewal(season)) {
    drivers.media = uniform(rng, CAP_GROWTH.mediaBoost);
    growth += drivers.media;
  }
  if (isLabourYear(season)) {
    const lockout = rng.next() < CAP_GROWTH.lockoutChance;
    drivers.labour = { shareShift: uniform(rng, CAP_GROWTH.labourShareShift), lockout };
    growth = lockout ? CAP_GROWTH.lockoutGrowth : growth + drivers.labour.shareShift;
  }
  if (shockedLastYear) {
    drivers.rebound = CAP_GROWTH.reboundBoost;
    growth += drivers.rebound;
  } else if (rng.next() < CAP_GROWTH.shockChance) {
    drivers.shock = uniform(rng, CAP_GROWTH.shockDrop);
    growth = drivers.shock;
  }
  return { growth, drivers };
}

/**
 * The cap for each season after `from` through `to`, from a known cap (default: the real 2026 cap).
 * Rounded to $100,000, with the range announced beforehand.
 */
export function projectCaps(seed: string, to: number, from: CapSeason = { season: BASE_SEASON, cap: BASE_CAP }): CapForecast[] {
  const out: CapForecast[] = [];
  let cap = from.cap;
  let shocked = false;
  for (let season = from.season + 1; season <= to; season++) {
    const { growth, drivers } = drawGrowth(seed, season, shocked);
    shocked = drivers.shock !== undefined;
    const next = round100k(cap * (1 + growth));
    const rng = createRng(seed, `cap/${season}/projection`);
    const width = next * uniform(rng, CAP_GROWTH.projectionWidth);
    const low = round100k(next - width * rng.next());
    out.push({ season, cap: next, projectedLow: Math.min(low, next), projectedHigh: Math.max(round100k(low + width), next), growth: next / cap - 1, drivers });
    cap = next;
  }
  return out;
}

/** The real cap history's yearly growth, for checks. */
export function historyGrowth(history: readonly CapSeason[] = CAP_HISTORY): number[] {
  return history.slice(1).map((h, i) => h.cap / history[i]!.cap - 1);
}
