/**
 * ADR-085 step 10: a front office's cap leaning, held by the team's president (owner's Q1, 2026-10-31).
 *
 * 0 is "win now": spend to the ceiling, restructure freely, push money into later years. 100 is
 * "flexible": keep a bigger cushion, roll over room to cover next year, restructure less. Drawn evenly
 * from 0 to 100 when a president is made, so about a third of teams fall each way and a third between
 * (owner's Q2: a drawn spread; the shares are judgment, as no real count of teams by approach exists).
 * For the human's team the leaning steers nothing: the human's own choices stand.
 */
import { createRng, type DeadMoneyCharge, type PlayerContract, type StaffState, type TeamId } from "@ff/contracts";
import { teamCapTotal } from "./money.js";
import { CASH_FLOOR } from "./rules.js";

/** The president's rating that holds it (an open key on his ratings, so no contracts edit). */
export const CAP_LEANING = "capLeaning";

/** A president's leaning: his rating, or (a president made before step 10) a draw from who he is. */
export function capLeaning(president: Pick<StaffState, "id" | "displayName" | "attributes">): number {
  const held = president.attributes[CAP_LEANING];
  if (held !== undefined) return held;
  return Math.round(100 * createRng(`${String(president.id)}/${president.displayName}`, CAP_LEANING).next());
}

/** The team's president, if the people carry their staff. */
export function presidentOf(team: TeamId, staff: readonly StaffState[] | undefined): StaffState | undefined {
  return staff?.find((s) => s.role === "PRESIDENT" && s.teamId === team && s.retiredAfter === undefined);
}

/** What a leaning sets. With no president known, the middle (50). */
export interface CapPlan {
  /** Kept free for in-season moves: $5M (win now) to $10M (flexible), the real range (reported). */
  cushion: number;
  /** Share of next season's shortfall kept unspent now to roll over: 25% (win now) to 100% (flexible). CHOSEN. */
  lookAhead: number;
  /** Share of the free-agency room it restructures and cuts for in March: 100% (win now) to 50% (flexible). CHOSEN. */
  marchRoom: number;
  /** Does it add void years to make room? Win-now teams (33 and under) do; the rest do not (step 11: with real deal shapes, void years for two thirds of teams left $30-40M a team of dead money a year). CHOSEN. */
  voidYears: boolean;
}

export function capPlan(leaning: number = 50): CapPlan {
  const l = Math.max(0, Math.min(100, leaning)) / 100;
  return {
    cushion: Math.round(5_000_000 + 5_000_000 * l),
    lookAhead: 0.25 + 0.75 * l,
    marchRoom: 1 - 0.5 * l,
    voidYears: leaning <= 33,
  };
}

export function teamCapPlan(team: TeamId, staff: readonly StaffState[] | undefined): CapPlan {
  const p = presidentOf(team, staff);
  return capPlan(p ? capLeaning(p) : 50);
}

/**
 * The spending floor (CBA Art. 12; owner's Q3): a club must spend 89% of the cap in cash over four
 * league years. A team's spending here is its cap total, live deals and dead money (simplification:
 * real cash pays a signing bonus when it is signed, the cap spreads it). Its shortfall going into
 * `season`: what the three seasons before it and this one must reach, less what the three spent.
 * Positive = this season must spend more than the cap's 89% to catch up.
 */
export function floorShortfall(
  team: TeamId, season: number, contracts: readonly PlayerContract[], dead: readonly DeadMoneyCharge[], cap: (s: number) => number,
  firstSeason: number,
): number {
  let need = 0;
  let spent = 0;
  for (let y = Math.max(firstSeason, season - CASH_FLOOR.seasons + 1); y <= season; y++) {
    need += CASH_FLOOR.share * cap(y);
    if (y < season) spent += teamCapTotal(team, y, contracts, dead).total;
  }
  return need - spent - CASH_FLOOR.share * cap(season);
}

/** A team behind the floor spends like a win-now team until it catches up. */
export function planWithFloor(plan: CapPlan, shortfall: number): CapPlan {
  return shortfall > 0 ? { ...capPlan(0), cushion: plan.cushion } : plan;
}
