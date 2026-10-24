/**
 * The draft's side of the money (ADR-086 §8 with ADR-085): rookie deals for picks and undrafted
 * rookies, the release and waiver claim on cut-down day, practice-squad deals, and the reserve/future
 * deals that bring practice squads back at the year turn. The prices are the cap thread's
 * (`cap/signings.ts`); this file only decides who signs what, when.
 */
import type { CalendarStamp, DeadMoneyCharge, FranchiseEvent, LeagueRules, PlayerContract, PlayerId, PlayerState, TeamId } from "@ff/contracts";
import { isAfterJune1, releasePlayer, transactionYear, withCapHits } from "../cap/money.js";
import { minimumContract, rookieContract, signPracticeSquad } from "../cap/signings.js";

/** The cap in a season. Default: flat at the rules' cap (pass ADR-085's forecast to grow it). */
export type CapForSeason = (season: number) => number;
export const flatCap = (rules: LeagueRules): CapForSeason => () => rules.salaryCap;

export const creditedSeasons = (p: PlayerState): number => p.bio.creditedSeasons ?? 0;

/** A drafted or undrafted rookie's deal, and the event that says so. */
export function signRookie(
  player: PlayerId, team: TeamId, pick: number | "UDFA", season: number, at: CalendarStamp, cap: CapForSeason,
): { contract: PlayerContract; event: FranchiseEvent } {
  const contract = rookieContract({ player, team, season, signedAt: at, pick, cap: cap(season), capForSeason: cap });
  return { contract, event: signedEvent(contract) };
}

/** A practice-squad deal for the season. */
export function signSquad(p: PlayerState, team: TeamId, season: number, at: CalendarStamp, cap: CapForSeason): { contract: PlayerContract; event: FranchiseEvent } {
  const contract = signPracticeSquad({ player: p.bio.id, team, season, signedAt: at, creditedSeasons: creditedSeasons(p), capForSeason: cap });
  return { contract, event: signedEvent(contract) };
}

/** A reserve/future deal: one minimum year, signed when a practice-squad player rejoins the offseason roster. */
export function signFuture(p: PlayerState, team: TeamId, season: number, at: CalendarStamp, cap: CapForSeason): { contract: PlayerContract; event: FranchiseEvent } {
  const contract = minimumContract({ player: p.bio.id, team, season, signedAt: at, creditedSeasons: creditedSeasons(p), years: 1, capForSeason: cap });
  return { contract, event: signedEvent(contract) };
}

const signedEvent = (c: PlayerContract): FranchiseEvent => ({
  type: "CONTRACT_SIGNED",
  payload: {
    player: c.player, team: c.team, ...(c.kind ? { kind: c.kind } : {}), years: c.years.length,
    value: (c.signingBonus ?? 0) + c.years.reduce((s, y) => s + y.baseSalary, 0),
  },
});

/** The live deal a player is on, if any. */
export const liveContract = (book: readonly PlayerContract[], player: PlayerId): PlayerContract | undefined =>
  book.find((c) => String(c.player) === String(player) && !c.ended);

/**
 * Cut a player: his deal ends and its unpaid bonus and guarantees become the team's dead money
 * (ADR-085 K3). A player with no deal on the book costs nothing.
 */
export function release(book: PlayerContract[], dead: DeadMoneyCharge[], player: PlayerId, team: TeamId, at: CalendarStamp): FranchiseEvent[] {
  const i = book.findIndex((c) => String(c.player) === String(player) && !c.ended);
  if (i < 0) return [{ type: "PLAYER_RELEASED", payload: { player, team, postJune1: isAfterJune1(at) } }];
  const r = releasePlayer(book[i]!, at);
  book[i] = r.contract;
  dead.push(...r.charges);
  return r.events;
}

/**
 * A waiver claim: the claiming team takes on what is left of the deal's salaries (the old team kept
 * the bonus as dead money when it let him go), from this league year on.
 */
export function claimedDeal(old: PlayerContract | undefined, team: TeamId, at: CalendarStamp): PlayerContract | undefined {
  if (!old) return undefined;
  const year = transactionYear(at);
  const years = old.years.filter((y) => y.season >= year && !y.voidYear).map((y) => ({ ...y, signingBonusProration: 0, optionBonusProration: 0 }));
  if (years.length === 0) return undefined;
  const { signingBonus: _bonus, ended: _ended, ...rest } = old;
  return withCapHits({ ...rest, team, signedAt: at, years });
}
