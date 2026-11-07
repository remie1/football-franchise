/**
 * ADR-095 §1: what a trade does to both teams' caps. Pure functions over contracts; dollars throughout.
 *
 * - The receiving team takes the rest of his contract: this season's base salary for the weeks left
 *   (in the regular season, of the 18 weekly cheques; before it, the whole year), and every later
 *   year in full. It takes no bonus money: a signing or option bonus stays with the team that paid it.
 * - The sending team keeps what it has already paid this season (the roster bonus once the league
 *   year has opened, the workout bonus once the offseason program is done, the cheques already paid)
 *   and this season's bonus share; every later year's bonus share accelerates as dead money. Before
 *   June 1 it all lands now; after June 1 the later shares land next season. These are the same
 *   rules `releasePlayer` applies to a cut (ADR-085 §2).
 * - No salary retention (the NFL has none): money moves only as the contract says.
 *
 * Simplifications: a regular-season week counts as paid once it has begun (a trade in week w leaves
 * the cheques of weeks w..18 to the receiver, rounded to the dollar); likely incentives go with him.
 */
import type {
  CalendarStamp, ContractYear, DeadMoneyCharge, LeagueRules, PlayerContract, TeamId,
} from "@ff/contracts";
import { DEFAULT_LEAGUE_RULES } from "@ff/contracts";
import { capNumber, isAfterJune1, proration, transactionYear, withCapHits } from "../cap/money.js";

export interface TradeMoneyResult {
  /** His old contract, ended with reason TRADED. */
  sent: PlayerContract;
  /** The contract the receiving team now holds. */
  received: PlayerContract;
  /** The sending team's dead money (reason TRADED). */
  charges: DeadMoneyCharge[];
  /** Each team's cap change by season, in dollars (+ adds to its cap total), as `TRADE_EXECUTED` carries. */
  capMoves: { team: TeamId; season: number; change: number }[];
}

/** The share of a regular season's weekly cheques still to be paid at `at` (1 before the season). */
export function salaryLeft(at: CalendarStamp, rules: Pick<LeagueRules, "weeksPerSeason"> = DEFAULT_LEAGUE_RULES): number {
  if (at.phase === "PLAYOFFS") return 0;
  if (at.phase !== "REGULAR_SEASON") return 1;
  const weeks = rules.weeksPerSeason;
  return Math.max(0, Math.min(weeks, weeks - (at.week - 1))) / weeks;
}

const OFFSEASON_PROGRAM_DONE = new Set(["OFF_SUMMER", "TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON", "PLAYOFFS"]);

/** Trade a player's contract to `to` at `at`. Throws if the contract has ended or `to` already holds it. */
export function tradePlayer(
  c: PlayerContract, to: TeamId, at: CalendarStamp,
  rules: Pick<LeagueRules, "weeksPerSeason"> = DEFAULT_LEAGUE_RULES,
): TradeMoneyResult {
  if (c.ended) throw new Error(`contract for ${c.player} already ended`);
  if (c.team === to) throw new Error(`${c.player} is already on ${to}`);
  const year = transactionYear(at);
  const postJune1 = isAfterJune1(at);
  const left = salaryLeft(at, rules);
  const workoutDone = OFFSEASON_PROGRAM_DONE.has(at.phase);

  const years = c.years.filter((y) => y.season >= year);
  const thisYear = years.find((y) => y.season === year);

  // What the receiver holds: no bonus money; this year cut to what is still to be paid.
  const receivedYears: ContractYear[] = years.map((y) => {
    const next: ContractYear = { ...y, signingBonusProration: 0 };
    delete next.optionBonusProration;
    if (y.season !== year) return next;
    next.baseSalary = Math.round(y.baseSalary * left);
    if (y.guaranteedSalary !== undefined) next.guaranteedSalary = Math.min(next.baseSalary, Math.round(y.guaranteedSalary * left));
    if (y.perGameRosterBonus !== undefined) next.perGameRosterBonus = Math.round(y.perGameRosterBonus * left);
    delete next.rosterBonus;
    if (workoutDone) delete next.workoutBonus;
    return next;
  });

  // What the sender keeps of this year (paid, or its own bonus share), and the later shares.
  let now = 0;
  if (thisYear) {
    const r = receivedYears.find((y) => y.season === year)!;
    now = capNumber(thisYear) - capNumber(r);
  }
  const later = years.filter((y) => y.season > year).reduce((s, y) => s + proration(y), 0);
  const charges: DeadMoneyCharge[] = [
    { season: year, amount: postJune1 ? now : now + later },
    { season: year + 1, amount: postJune1 ? later : 0 },
  ].filter((x) => x.amount > 0).map((x) => ({ team: c.team, player: c.player, reason: "TRADED" as const, ...x }));

  const { signingBonus: _bonus, ended: _ended, ...rest } = c;
  const received = withCapHits({ ...rest, team: to, years: receivedYears });
  const sent: PlayerContract = { ...c, ended: { at, reason: "TRADED", ...(postJune1 ? { postJune1: true } : {}) } };

  const capMoves: TradeMoneyResult["capMoves"] = [];
  for (const y of years) {
    const dead = charges.filter((d) => d.season === y.season).reduce((s, d) => s + d.amount, 0);
    capMoves.push({ team: c.team, season: y.season, change: dead - capNumber(y) });
  }
  for (const d of charges) {
    if (!years.some((y) => y.season === d.season)) capMoves.push({ team: c.team, season: d.season, change: d.amount });
  }
  for (const y of received.years) capMoves.push({ team: to, season: y.season, change: capNumber(y) });
  return { sent, received, charges, capMoves: capMoves.filter((m) => m.change !== 0) };
}
