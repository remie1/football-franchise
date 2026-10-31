/**
 * ADR-085 §2: the money rules. Pure functions over contracts; dollars throughout.
 *
 * League years: a contract's season S runs from the new league year (OFF_RESET_FA of calendar season
 * S-1) to the end of OFF_EVAL of season S. A release during OFF_EVAL is processed when the new league
 * year opens (as real February cuts are), so it saves the coming year's roster bonus.
 */
import type {
  CalendarStamp, CalendarPhase, ContractYear, PlayerContract, DeadMoneyCharge, DeadMoneyReason,
  TeamId, FranchiseEvent,
} from "@ff/contracts";
import { MAX_PRORATION_YEARS, TOP_51 } from "./rules.js";

/** Offseason phases that belong to the next season's league year. */
const NEXT_LEAGUE_YEAR: ReadonlySet<CalendarPhase> = new Set(["OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER"]);
/** Phases before June 1 of their league year (OFF_EVAL counts: it is processed at the new league year). */
const BEFORE_JUNE_1: ReadonlySet<CalendarPhase> = new Set(["OFF_EVAL", "OFF_RESET_FA", "OFF_DRAFT", "OFF_ROOKIES_OTAS"]);
/**
 * Phases whose base salary is being paid: the regular season's weekly cheques (and the playoffs).
 * A player cut in camp or preseason, including cut-down day, is owed only his guarantees and
 * bonuses, as in the offseason (ADR-086 §8, cut-down day).
 */
const IN_SEASON: ReadonlySet<CalendarPhase> = new Set(["REGULAR_SEASON", "PLAYOFFS"]);

/** The contract season a stamp falls in. */
export function leagueYear(at: CalendarStamp): number {
  return NEXT_LEAGUE_YEAR.has(at.phase) ? at.season + 1 : at.season;
}

/** The contract season a transaction at this stamp counts in (OFF_EVAL moves to the new league year). */
export function transactionYear(at: CalendarStamp): number {
  return at.phase === "OFF_EVAL" ? at.season + 1 : leagueYear(at);
}

export const isAfterJune1 = (at: CalendarStamp): boolean => !BEFORE_JUNE_1.has(at.phase);

/** A year's share of every bonus spread over the contract. */
export const proration = (y: ContractYear): number => y.signingBonusProration + (y.optionBonusProration ?? 0);

/** A year's cap number: salary, prorated bonuses, roster/workout/per-game bonuses, likely incentives. */
export function capNumber(y: ContractYear): number {
  return y.baseSalary + proration(y) + (y.rosterBonus ?? 0) + (y.workoutBonus ?? 0)
    + (y.perGameRosterBonus ?? 0) + (y.incentives?.likely ?? 0);
}

/** The part of a year's base salary owed even if he is cut. Injury-only guarantees count only for an injured player. */
export function guaranteedOf(y: ContractYear, injured = false): number {
  if (y.guarantees.fullyGuaranteed || (injured && y.guarantees.injuryOnly)) return y.baseSalary;
  return Math.min(y.baseSalary, y.guaranteedSalary ?? 0);
}

/** The contract with every year's stored `capHit` recomputed. */
export function withCapHits(c: PlayerContract): PlayerContract {
  return { ...c, years: c.years.map((y) => ({ ...y, capHit: capNumber(y) })) };
}

/**
 * Spread `amount` evenly over the first `count` of `seasons` (at most five), whole dollars; the
 * remainder goes to the first year so the shares add up exactly.
 */
export function prorate(amount: number, count: number): number[] {
  const n = Math.max(1, Math.min(MAX_PRORATION_YEARS, count));
  const share = Math.floor(amount / n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? amount - share * (n - 1) : share));
}

/** The contract season a contract stopped counting as a live deal, if it has ended. */
export function endedYear(c: PlayerContract): number | undefined {
  return c.ended ? transactionYear(c.ended.at) : undefined;
}

/** Is this contract a live deal in this season (on the team's cap as a player, not as dead money)? */
export function liveIn(c: PlayerContract, season: number): boolean {
  const end = endedYear(c);
  return (end === undefined || season < end) && c.years.some((y) => y.season === season);
}

export interface ReleaseOptions {
  /** A pre-June-1 release designated post-June-1 (two per team; the league year enforces the count). */
  designatedPostJune1?: boolean;
  /** An injured player's injury-only guarantees are owed. */
  injured?: boolean;
  reason?: Extract<DeadMoneyReason, "RELEASED" | "RETIRED">;
}

export interface ReleaseResult {
  contract: PlayerContract;
  charges: DeadMoneyCharge[];
  events: FranchiseEvent[];
}

/**
 * Cut a player (or record his retirement). Every proration not yet counted becomes dead money, plus
 * guaranteed salary still owed. Before June 1 it all lands in this league year; after June 1 (or with
 * the designation) this year keeps only its own share and the rest lands next year.
 *
 * Simplification (ADR-085 §2): a player cut in season costs his whole season's cap number; the real
 * league pays non-vested players only for weeks already played.
 */
export function releasePlayer(c: PlayerContract, at: CalendarStamp, opts: ReleaseOptions = {}): ReleaseResult {
  if (c.ended) throw new Error(`contract for ${c.player} already ended`);
  const year = transactionYear(at);
  const postJune1 = isAfterJune1(at) || !!opts.designatedPostJune1;
  const thisYear = c.years.find((y) => y.season === year);
  let now = 0;
  if (thisYear) {
    if (IN_SEASON.has(at.phase)) {
      now += capNumber(thisYear);
    } else {
      now += proration(thisYear) + guaranteedOf(thisYear, opts.injured);
      if (at.phase !== "OFF_EVAL") now += thisYear.rosterBonus ?? 0;
      if (at.phase === "OFF_SUMMER" || at.phase === "TRAINING_CAMP" || at.phase === "PRESEASON") now += thisYear.workoutBonus ?? 0;
    }
  }
  const later = c.years.filter((y) => y.season > year)
    .reduce((s, y) => s + proration(y) + (y.voidYear ? 0 : guaranteedOf(y, opts.injured)), 0);
  const reason = opts.reason ?? "RELEASED";
  const charges = [
    { season: year, amount: postJune1 ? now : now + later },
    { season: year + 1, amount: postJune1 ? later : 0 },
  ].filter((x) => x.amount > 0).map((x) => ({ team: c.team, player: c.player, reason, ...x }));
  const contract: PlayerContract = { ...c, ended: { at, reason, ...(postJune1 ? { postJune1: true } : {}) } };
  const events: FranchiseEvent[] = reason === "RELEASED"
    ? [{ type: "PLAYER_RELEASED", payload: { player: c.player, team: c.team, postJune1 } }]
    : [];
  return { contract, charges, events };
}

/**
 * At the opening of league year `season`: a contract whose real years are all past ends. If void years
 * remain, it voids and their prorations land as dead money now.
 */
export function expireContract(c: PlayerContract, season: number, at: CalendarStamp): ReleaseResult | null {
  if (c.ended) return null;
  const real = c.years.filter((y) => !y.voidYear);
  const lastReal = real.length ? Math.max(...real.map((y) => y.season)) : -Infinity;
  if (lastReal >= season) return null;
  const voids = c.years.filter((y) => y.voidYear && y.season >= season);
  const amount = voids.reduce((s, y) => s + proration(y), 0);
  const reason = voids.length ? "VOIDED" : "EXPIRED";
  return {
    contract: { ...c, ended: { at, reason } },
    charges: amount > 0 ? [{ team: c.team, player: c.player, season, amount, reason: "VOIDED" }] : [],
    events: [{ type: "CONTRACT_EXPIRED", payload: { player: c.player, team: c.team } }],
  };
}

export interface RestructureOptions {
  /** Void years to add so the new bonus spreads thinner. */
  addVoidYears?: number;
  /** The least base salary he must keep (his minimum). */
  floor?: number;
}

/**
 * Turn `amount` of this season's base salary into signing bonus, spread over the remaining years
 * (void years included, at most five). Saves `amount` minus this year's new share now.
 */
export function restructure(c: PlayerContract, season: number, amount: number, opts: RestructureOptions = {}): { contract: PlayerContract; events: FranchiseEvent[] } {
  const idx = c.years.findIndex((y) => y.season === season);
  if (idx < 0 || c.ended) throw new Error(`no live ${season} year to restructure for ${c.player}`);
  const room = c.years[idx]!.baseSalary - (opts.floor ?? 0);
  if (amount <= 0 || amount > room) throw new Error(`restructure of ${amount} exceeds the ${room} available`);
  const lastSeason = c.years[c.years.length - 1]!.season;
  const added: ContractYear[] = Array.from({ length: opts.addVoidYears ?? 0 }, (_, i) => ({
    season: lastSeason + 1 + i, baseSalary: 0, signingBonusProration: 0,
    guarantees: { fullyGuaranteed: false }, capHit: 0, voidYear: true,
  }));
  const years = [...c.years, ...added].map((y) => ({ ...y }));
  years[idx]!.baseSalary -= amount;
  const remaining = years.filter((y) => y.season >= season).length;
  const shares = prorate(amount, remaining);
  shares.forEach((s, i) => { years[idx + i]!.signingBonusProration += s; });
  return {
    contract: withCapHits({ ...c, years, signingBonus: (c.signingBonus ?? 0) + amount }),
    events: [{ type: "CONTRACT_RESTRUCTURED", payload: { player: c.player } }],
  };
}

export interface CapTotal {
  /** Live contracts' cap numbers counted (all, or the top 51). */
  contracts: number;
  dead: number;
  total: number;
  /** How many live contracts counted. */
  counted: number;
}

/** A team's cap total for a season. `top51` applies from the new league year to the first game. */
export function teamCapTotal(
  team: TeamId, season: number, contracts: readonly PlayerContract[], charges: readonly DeadMoneyCharge[],
  opts: { top51?: boolean } = {},
): CapTotal {
  let numbers = contracts.filter((c) => c.team === team && liveIn(c, season))
    .map((c) => capNumber(c.years.find((y) => y.season === season)!))
    .sort((a, b) => b - a);
  if (opts.top51) numbers = numbers.slice(0, TOP_51);
  const live = numbers.reduce((s, n) => s + n, 0);
  const dead = charges.filter((d) => d.team === team && d.season === season).reduce((s, d) => s + d.amount, 0);
  return { contracts: live, dead, total: live + dead, counted: numbers.length };
}

/** Is a stamp in the top-51 window (new league year until the regular season)? */
export const isTop51Window = (at: CalendarStamp): boolean =>
  NEXT_LEAGUE_YEAR.has(at.phase) || at.phase === "TRAINING_CAMP" || at.phase === "PRESEASON";
