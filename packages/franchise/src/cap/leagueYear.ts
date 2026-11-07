/**
 * ADR-085 §4: the league year as day steps in the season's walk (ADR-086 §2).
 *
 *   OFF_EVAL week 1 day 7       re-signing opens (late winter), the season's credited seasons in: cap
 *                               casualties are cut and a team over next season's cap gets under it;
 *                               teams re-sign their own players, making room as they go, and tender
 *                               restricted free agents
 *   OFF_EVAL week 2 day 1       the cap for next season is set (CAP_SET)
 *   OFF_EVAL week 3 day 1       the tag deadline: a last round of re-signing, then one franchise tag
 *   OFF_RESET_FA week 1 day 1   the new league year: deals run out, every team gets under the cap
 *   OFF_RESET_FA week 1 day 2   free agency opens (premium window), then the value window from week 2,
 *   to cut-down day             then the bargain basement from the draft on, the asking prices falling
 *   TRAINING_CAMP week 1 day 1  camp opens (late summer): teams extend men in the last year of their deals
 *
 * The windows are the real ones (owner, 2026-11-07): real teams negotiate with their own free agents
 * from the season's end to the new league year, clearing room as they need it in February and March,
 * tag by a deadline about a week before it, and extend their stars in camp.
 *
 * Computer teams decide everything here. A human team's choices arrive with the screens for them
 * (Iron Rule 6: re-signing, tags, cuts and signings are GM decisions).
 *
 * Constants are CHOSEN (provenance NONE) unless a comment says otherwise.
 */
import {
  compareStamps, createRng, DEFAULT_LEAGUE_RULES,
  type CalendarStamp, type ContractYear, type DeadMoneyCharge, type FranchiseEvent, type LeagueRules, type PlayerContract, type PlayerId, type PlayerState, type Position,
  type SeasonState, type StaffState, type Team, type TeamId,
} from "@ff/contracts";
import { isDay, type DayStep, type DayStepContext, type LeaguePeople } from "../season/people.js";
import { BOARD_ERROR, POSITION_VALUE, STARTERS, WANTED, needAt, type Rate } from "../draft/board.js";
import { seasonsIn } from "../draft/cutdown.js";
import { DRAFT_DAYS } from "../draft/steps.js";
import { aheadView, gmEvaluation, type AheadView } from "./ahead.js";
import { capNumber, designatedIn, expireContract, isAfterJune1, liveIn, prorate, proration, releasePlayer, restructure, teamCapTotal, withCapHits } from "./money.js";
import { BASE_CAP, CASH_FLOOR, MAX_PRORATION_YEARS, POST_JUNE_1_DESIGNATIONS, RFA_SEASONS, TAG_GROUP, type TenderLevel } from "./rules.js";
import { ROOKIE_SCALE_2026 } from "./rookieScale2026.js";
import { minimumContract, minimumSalary, tagContract, tagPrice, tenderPrice } from "./signings.js";
import { REAL_STRUCTURE, ageFactorAt, apyOf, firstYearShareFor, guaranteedShare, marketCurves, realStructure, valuePlayer, veteranContract, type MarketCurves } from "./value.js";
import { helpOf, pushedOut, valueForMoney } from "./valueForMoney.js";
import { askingPrice, offerWorth, type MarketWindow } from "./negotiation.js";
import { floorShortfall, planWithFloor, teamCapPlan, type CapPlan } from "./leaning.js";

export type CapForSeason = (season: number) => number;

export const LEAGUE_YEAR_DAYS = {
  /**
   * Re-signing opens a week after the season: February's cap cuts, then the first round. It comes after
   * the season's credited seasons are in (the draft order's day, `DRAFT_DAYS.order`), so a man who has
   * just played out his fourth season is judged as the unrestricted free agent he is about to be.
   */
  reSignOpens: { phase: "OFF_EVAL", week: 1, day: 7 },
  capSet: { phase: "OFF_EVAL", week: 2, day: 1 },
  /** The franchise tag's deadline, about a week before the new league year, after re-signing's last round. */
  reSign: { phase: "OFF_EVAL", week: 3, day: 1 },
  newYear: { phase: "OFF_RESET_FA", week: 1, day: 1 },
  postDraft: { phase: "OFF_DRAFT", week: 4, day: 1 },
  /** Camp opens: teams extend the men in the last year of their deals. */
  campExtensions: { phase: "TRAINING_CAMP", week: 1, day: 1 },
} as const;

/**
 * Signings that count toward compensatory picks (ADR-086 §5): before the post-draft day. The real
 * cutoff is a date in early May, just after the draft.
 */
export function countsForComp(day: CalendarStamp): boolean {
  return day.phase.startsWith("OFF_") && compareStamps(day, { ...LEAGUE_YEAR_DAYS.postDraft, season: day.season }) < 0;
}

export const MARKET = {
  /** Days the market runs in the premium window (OFF_RESET_FA week 1). */
  premiumDays: [2, 3, 5] as readonly number[],
  /** Rounds of offers each market day. */
  rounds: 8,
  /** Seats kept on the 90 for the draft's picks before it is made. */
  draftSeats: 9,
  /**
   * Step 14, §3.3 (owner's okay, 2026-11-06): seats also kept before the draft for the undrafted rookies
   * signed after it. COUNTED: about 16 undrafted rookie deals a team a year, 2022-25 (OverTheCap's
   * contract histories, nflverse).
   */
  undraftedSeats: 16,
  /** A player a team wants back: he makes its 53 by its own grade. */
  keepIfOnWanted: true,
  /** Percentile at or above which a declined star is franchise-tagged, if the team can afford it. */
  tagPercentile: 0.85,
  /** Is an upgrade worth chasing: grade over the team's starter by this much. */
  upgradeMargin: 3,
  /** A team pays up to its own value times this, more when the need is great. */
  offerBase: 0.95,
  offerNeed: 0.15,
  /**
   * Step 12: a team short of room may let a lesser man at the position go to sign a better one, if
   * cutting him leaves at most this share of the cap in dead money (all seasons). CHOSEN: 2% (about
   * $6M in 2026) brought dead money to about $29M a team over five years (real about $34M).
   */
  swapDeadMost: 0.02,
  /**
   * The new league year: teams restructure and cut to have room for their draft class, the in-season
   * cushion and this share of the cap for free agency (real teams clear space in February and March).
   * Step 11: real teams' new-team deals of $2M+ add up to about 20% of the cap a team a year, in
   * yearly value (counted, OverTheCap 2021-2025: 17.9 to 24.0%). Step 9's $35M was 11% (judgment).
   */
  freeAgencyShare: 0.2,
  /**
   * The most of next season's overage a team holds back now (share of next season's cap): about the
   * 49ers' $31.5M over 2027 against a $301M cap, the largest case in the owner's note (REPORTED case,
   * its use as the bound is judgment).
   */
  lookAheadMost: 0.1,
  /** Camp extensions: the lowest place in his position's market a player is extended at. */
  extendPercentile: 0.4,
  /** ...while his age leaves at least this much of his price in the new deal's first year (`ageFactorAt`, read at his age for the rules: `AheadView.ruleAge`). */
  extendAgeFactor: 0.9,
  /** A drafted player may sign a new deal once this many seasons are done (the real CBA rule). */
  rookieExtensionSeasons: 3,
  /** A cap casualty: a veteran worth less than this share of his cap number this year, when cutting him saves money. */
  casualtyShare: 0.5,
  /** ...and saves at least this much (dollars). */
  casualtySaving: 2_000_000,
  /** A cap casualty is designated post-June-1 only when that moves at least this much dead money to next year. */
  designateLater: 2_000_000,
  /** Void years a restructure may add (the bonus never spreads past five years). */
  maxVoidYears: 4,
} as const;

export interface LeagueYearConfig {
  /** Today's rating: the market's curves and the depth charts. Decisions judge a man ahead (`ahead`). */
  rate: Rate;
  cap: CapForSeason;
  /**
   * A team's evaluator skill, 0..100. Default (step 13, owner's answer 1a): its GM's talent evaluation;
   * with no GM seated, its head coach's (as the draft reads it); 50 without a staff.
   */
  scouting?: (team: TeamId, people: LeaguePeople) => number;
  /** Step 13: the view ahead, shared with the draft's cut-down in a season's walk (default: one of the year's own over `rate`). */
  ahead?: AheadView;
  /**
   * The first season whose camp extends anyone (default: every season). A league read from a file
   * taken after camp (the stand-in league's contracts are as of 23 October) starts the season after,
   * since that camp's extensions are already in its deals.
   */
  campExtensionsFrom?: number;
  /**
   * Step 14, how free agency sets prices (design "Free agency: prices from the offers", 2026-11-07).
   * "calendar", the default: the date sets a free agent's ask (`WINDOW_ASK`, `BARGAIN_WEEKLY`), each
   * team calls its biggest bargain first, offers stop at the ask, and from the draft a man no team can
   * fit drops his ask to the roomiest team's room between a day's rounds. "offers": the four rules of
   * `freeAgency` (no price by the date; a team calls first the man who would help it most; teams that
   * want the same man bid; a man no offer met comes down overnight to the most a team that wanted him
   * would pay). Built switched off while the middle class is looked at.
   */
  marketPrices?: "calendar" | "offers";
}

/** The year's config with its view ahead. */
interface YearConfig extends LeagueYearConfig {
  readonly ahead: AheadView;
}

// ---------- shared helpers ----------

function normal(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2);
}

/** A team's grade of a player this offseason: the truth plus its evaluator's error (as the draft board). */
export function teamGrade(team: TeamId, p: PlayerState, skill: number, rate: Rate, seed: string, season: number): number {
  const sd = BOARD_ERROR.min + BOARD_ERROR.span * (1 - Math.max(0, Math.min(100, skill)) / 100);
  const rng = createRng(seed, `market/${season}/${String(team)}/${String(p.bio.id)}`);
  return rate(p) + sd * normal(rng.next(), rng.next());
}

/** A team's win share in a finished season, 0..1 (0.5 when unknown). */
export function winShareOf(team: TeamId, state: SeasonState | undefined): number {
  const row = state?.standings.find((r) => r.team === team);
  if (!row) return 0.5;
  const { wins, losses, ties } = row.overall;
  const games = wins + losses + ties;
  return games === 0 ? 0.5 : (wins + ties / 2) / games;
}

interface Book {
  contracts: PlayerContract[];
  dead: DeadMoneyCharge[];
  events: FranchiseEvent[];
}

const signedEvent = (c: PlayerContract): FranchiseEvent => ({
  type: "CONTRACT_SIGNED",
  payload: {
    player: c.player, team: c.team, ...(c.kind ? { kind: c.kind } : {}), years: c.years.filter((y) => !y.voidYear).length,
    value: (c.signingBonus ?? 0) + c.years.reduce((s, y) => s + y.baseSalary, 0),
    guaranteed: Math.round(guaranteedShare(c) * ((c.signingBonus ?? 0) + c.years.reduce((s, y) => s + y.baseSalary, 0))),
  },
});

/** A team's cap for a league year: the league's cap plus the room it carried over (ADR-085, the real carryover rule). */
export function adjustedCap(team: TeamId, season: number, people: Pick<LeaguePeople, "capCarryover">, cap: CapForSeason): number {
  return cap(season) + (people.capCarryover?.find((c) => c.team === team && c.season === season)?.amount ?? 0);
}

/** Room left at the end of a league year, every deal counted: what a team carries into the next. */
function unusedRoom(team: TeamId, season: number, people: Pick<LeaguePeople, "capCarryover">, book: Book, cap: CapForSeason): number {
  return Math.max(0, adjustedCap(team, season, people, cap) - teamCapTotal(team, season, book.contracts, book.dead).total);
}

/**
 * Step 11: a back-loaded deal's second year must fit the season after's room, as a front office checks
 * before it signs: that season's top 51, less the team's cushion and the free-agency room it will want
 * that March (it does not spend next year's free-agency money now). A one-year deal always passes.
 * `own`: a deal with one of the team's own men (a re-signing or an extension) keeps only the cushion.
 * Next March's free-agency room is money to replace men like him, so a team keeping him does not hold
 * it back from him, as real teams keep their own before they shop.
 */
function secondYearFits(team: TeamId, c: PlayerContract, book: Book, cap: CapForSeason, plan: CapPlan, totals?: Map<number, number>, own = false): boolean {
  const y = c.years.filter((x) => !x.voidYear)[1];
  if (!y) return true;
  const keep = plan.cushion + (own ? 0 : plan.marchRoom * MARKET.freeAgencyShare * cap(y.season));
  // `totals` keeps a team's top-51 totals by season while its book does not change (one team's pass in a round).
  let total = totals?.get(y.season);
  if (total === undefined) { total = teamCapTotal(team, y.season, book.contracts, book.dead, { top51: true }).total; totals?.set(y.season, total); }
  return capNumber(y) <= cap(y.season) - total - keep;
}

/**
 * The cap room a team has for a season, keeping `reserve` free. `carry` is what it brings into that
 * season. A team looks a year ahead: when its deals for the next season already add up to more than
 * that season's cap, it keeps part of the gap unspent now, to roll it over (`lookAhead`, from the
 * president's leaning).
 */
function roomFor(team: TeamId, season: number, book: Book, cap: CapForSeason, reserve: number, carry: number, lookAhead: number, at?: CalendarStamp): number {
  // Next season as it will count next March: the top 51. A team holds back at most the size of the
  // largest real case reported (step 11); more than that, it clears next March as real teams do.
  const over = teamCapTotal(team, season + 1, book.contracts, book.dead, { top51: true }).total - cap(season + 1);
  const ahead = Math.min(Math.max(0, over), MARKET.lookAheadMost * cap(season + 1));
  return cap(season) + carry - teamCapTotal(team, season, book.contracts, book.dead, { top51: true, ...(at ? { at } : {}) }).total - reserve
    - lookAhead * ahead;
}

/**
 * Room to keep for a team's coming draft class: its picks' first-year cap numbers, estimated at each
 * round's average slot of the rookie scale (a quarter of the deal, grown with the cap). Untraded
 * picks are not listed in `people.picks`, so a team holds its own unless someone else does.
 */
export function rookieReserve(team: TeamId, draft: number, people: LeaguePeople, rules: LeagueRules, cap: CapForSeason): number {
  const byRound = picksHeld(team, draft, people, rules);
  let total = 0;
  for (let r = 1; r <= byRound.length; r++) {
    const held = byRound[r - 1]!;
    const slots = ROOKIE_SCALE_2026.slice((r - 1) * 32, r * 32);
    const avg = slots.length ? slots.reduce((a, s) => a + s[0], 0) / slots.length : ROOKIE_SCALE_2026.at(-1)![0];
    total += held * avg / 4 * cap(draft) / BASE_CAP;
  }
  return Math.round(total);
}

const playersOf = (t: Team, byId: ReadonlyMap<string, PlayerState>): PlayerState[] =>
  t.roster.map((id) => byId.get(String(id))).filter((p): p is PlayerState => p !== undefined);

/** Depth charts rebuilt from the roster, best first by `rate` (cut-down day reorders again). */
function withDepth(t: Team, byId: ReadonlyMap<string, PlayerState>, rate: Rate): Team {
  const depthChart: Partial<Record<Position, PlayerState["bio"]["id"][]>> = {};
  for (const p of playersOf(t, byId).sort((a, b) => rate(b) - rate(a))) (depthChart[p.bio.position] ??= []).push(p.bio.id);
  return { ...t, depthChart };
}

/** Does `grade` make the team's wanted count at his position, by the team's own grades? */
/** How many picks a team holds in each round of a draft (index 0 = round 1): its own unless traded away, plus those it got. */
function picksHeld(team: TeamId, draft: number, people: Pick<LeaguePeople, "picks">, rules: LeagueRules): number[] {
  const rounds = rules.draft?.rounds ?? DEFAULT_LEAGUE_RULES.draft?.rounds ?? 7;
  const listed = people.picks.filter((p) => p.draft === draft);
  return Array.from({ length: rounds }, (_, i) => {
    const r = i + 1;
    const tradedAway = listed.some((p) => p.round === r && p.originalTeam === team && p.owner !== team);
    return (tradedAway ? 0 : 1) + listed.filter((p) => p.round === r && p.owner === team && p.originalTeam !== team).length;
  });
}

/** Step 14, §3.4: the classes a typical pick of each round is read from, the last this many. CHOSEN. */
export const PICK_SEAT_CLASSES = 3;

/**
 * Step 14, §3.4 (owner's yes, 2026-11-06): what a pick of each round has become in this league, the
 * mean rating today of the picks of that round in the last `PICK_SEAT_CLASSES` classes before `draft`.
 * A round with no such pick is left out.
 */
export function typicalPicks(players: readonly PlayerState[], draft: number, rate: Rate): Map<number, number> {
  const sum = new Map<number, { s: number; n: number }>();
  for (const p of players) {
    const d = p.bio.draft;
    if (typeof d !== "object" || d.year < draft - PICK_SEAT_CLASSES || d.year >= draft) continue;
    const o = sum.get(d.round) ?? { s: 0, n: 0 };
    o.s += rate(p);
    o.n += 1;
    sum.set(d.round, o);
  }
  return new Map([...sum].map(([r, o]) => [r, o.s / o.n]));
}

/**
 * Step 14, §3.4: the seats a team holds on re-signing day for its own coming picks. Each pick is a
 * stand-in man rated what a pick of its round has become here (`typicalPicks`), seated at the position
 * the team needs most that no earlier pick took, rounds in order. Its own free agents are judged with
 * them in the room: whether they make the 53, and what they add for the money.
 */
function pickSeats(
  team: TeamId, kept: readonly PlayerState[], grade: Rate, people: Pick<LeaguePeople, "picks">, draft: number, rules: LeagueRules,
  typical: ReadonlyMap<number, number>,
): Map<Position, number[]> {
  const seats = new Map<Position, number[]>();
  if (typical.size === 0) return seats;
  const need = new Map((Object.keys(WANTED) as Position[]).map((pos) => [pos, needAt(pos, kept, grade)]));
  picksHeld(team, draft, people, rules).forEach((n, i) => {
    const g = typical.get(i + 1);
    for (let k = 0; k < n && g !== undefined; k++) {
      let at: Position | undefined;
      for (const [pos, x] of need) if (!seats.has(pos) && (at === undefined || x > need.get(at)!)) at = pos;
      if (at === undefined) return;
      seats.set(at, [g]);
    }
  });
  return seats;
}

function makesTheRoster(grade: number, position: Position, others: readonly number[]): boolean {
  return others.filter((g) => g > grade).length < WANTED[position];
}

/** Would he start? */
function wouldStart(grade: number, position: Position, others: readonly number[]): boolean {
  return others.filter((g) => g > grade).length < Math.max(1, STARTERS[position]);
}

/** Players' `teamId` set from the rosters: on a roster or practice squad = that team, else none. */
function placePlayers(players: readonly PlayerState[], teams: readonly Team[]): PlayerState[] {
  const where = new Map<string, TeamId>();
  for (const t of teams) for (const id of [...t.roster, ...(t.practiceSquad ?? [])]) where.set(String(id), t.id);
  return players.map((p) => {
    const team = where.get(String(p.bio.id));
    if (team !== undefined) return p.teamId === team ? p : { ...p, teamId: team };
    if (p.teamId === undefined) return p;
    const { teamId: _gone, ...rest } = p;
    return rest as PlayerState;
  });
}

// ---------- the steps ----------


export function leagueYearSteps(base: LeagueYearConfig): DayStep[] {
  // Step 13 (owner's rulings, 2026-10-31 and 2026-11-06): every keep, cut, re-sign and signing judges a
  // man ahead, over the years his team's direction sets, through its GM's eyes, and prices a deal on
  // his expected rating across its years (`aheadView`). A man with no growth record reads as today,
  // under today's rules.
  const config: YearConfig = { ...base, ahead: base.ahead ?? aheadView(base.rate) };
  const skillOf = (t: TeamId, people: LeaguePeople) => (config.scouting ?? gmEvaluation)(t, people);
  const steps: DayStep[] = [
    {
      id: "cap-set",
      run: (people, ctx) => {
        if (!isDay(ctx.day, LEAGUE_YEAR_DAYS.capSet)) return undefined;
        return { people, events: [{ type: "CAP_SET", payload: { season: ctx.season + 1, cap: config.cap(ctx.season + 1) } }] };
      },
    },
    {
      id: "re-sign",
      run: (people, ctx) => (isDay(ctx.day, LEAGUE_YEAR_DAYS.reSignOpens) ? reSign(people, ctx, config, skillOf, "opens")
        : isDay(ctx.day, LEAGUE_YEAR_DAYS.reSign) ? reSign(people, ctx, config, skillOf, "deadline") : undefined),
    },
    {
      id: "new-league-year",
      run: (people, ctx) => (isDay(ctx.day, LEAGUE_YEAR_DAYS.newYear) ? newLeagueYear(people, ctx, config, skillOf) : undefined),
    },
    {
      id: "post-draft-compliance",
      run: (people, ctx) => (isDay(ctx.day, LEAGUE_YEAR_DAYS.postDraft) ? complianceCheck(people, ctx, config, skillOf, ctx.season + 1, true) : undefined),
    },
    {
      id: "season-compliance",
      run: (people, ctx) => {
        const cut = ctx.rules.cutdown ?? DEFAULT_LEAGUE_RULES.cutdown!;
        const dayAfter = { phase: cut.phase, week: cut.week, day: cut.day + 1 };
        return isDay(ctx.day, dayAfter) ? complianceCheck(people, ctx, config, skillOf, ctx.season, false, ctx.rules.rosterLimit) : undefined;
      },
    },
    {
      id: "free-agency",
      run: (people, ctx) => {
        const w = marketWindow(ctx.day, ctx.rules.cutdown ?? DEFAULT_LEAGUE_RULES.cutdown!);
        return w ? freeAgency(people, ctx, config, skillOf, w) : undefined;
      },
    },
    {
      id: "camp-extensions",
      run: (people, ctx) => (isDay(ctx.day, LEAGUE_YEAR_DAYS.campExtensions) && ctx.season >= (config.campExtensionsFrom ?? -Infinity)
        ? campExtensions(people, ctx, config, skillOf) : undefined),
    },
  ];
  return steps.map((step) => ({ ...step, run: (people, ctx) => { config.ahead.setToday({ at: ctx.day, people, rules: ctx.rules }); return step.run(people, ctx); } }));
}

/** Which market window a day is in, if the market runs that day (it runs on the first day of each week after the first). */
export function marketWindow(day: CalendarStamp, cutdown: { phase: string; week: number; day: number }): { window: MarketWindow; weeksIntoBargain: number } | undefined {
  if (day.phase === "OFF_RESET_FA" && day.week === 1) return MARKET.premiumDays.includes(day.day) ? { window: "PREMIUM", weeksIntoBargain: 0 } : undefined;
  if (day.day !== 1) return undefined;
  if (day.phase === "OFF_RESET_FA") return { window: "VALUE", weeksIntoBargain: 0 };
  const bargain: CalendarStamp["phase"][] = ["OFF_DRAFT", "OFF_ROOKIES_OTAS", "OFF_SUMMER", "TRAINING_CAMP", "PRESEASON"];
  const i = bargain.indexOf(day.phase);
  if (i < 0) return undefined;
  if (day.phase === cutdown.phase && day.week >= cutdown.week) return undefined;
  // Weeks since the draft opened the bargain basement (phases' lengths are close enough here).
  return { window: "BARGAIN", weeksIntoBargain: i * 4 + (day.week - 1) };
}

/** Is this contract's last real year `season` (it runs out at the next league year)? */
const endsAfter = (c: PlayerContract, season: number): boolean =>
  !c.ended && Math.max(...c.years.filter((y) => !y.voidYear).map((y) => y.season)) === season;

const hasDealIn = (book: readonly PlayerContract[], player: string, season: number): boolean =>
  book.some((c) => String(c.player) === player && liveIn(c, season));

/** A deal he plays under in `season`. A void year only spreads a bonus: nobody plays it, so it is no deal. */
const playsUnderIn = (book: readonly PlayerContract[], player: string, season: number): boolean =>
  book.some((c) => String(c.player) === player && liveIn(c, season) && c.years.some((y) => y.season === season && !y.voidYear));

// ---------- re-signing, tenders and tags (OFF_EVAL) ----------

/**
 * Late winter's re-signing (owner, 2026-11-07: the real windows). On the day it opens, the men the new
 * league year would cut as cap casualties are cut (real teams clear space in February and March;
 * money.ts processes an OFF_EVAL release at the new league year) and a team over next season's cap
 * gets under it. On that day and again at the tag deadline, each team takes its own free agents in
 * value-for-money order: a man it wants who would sign, but who does not fit, gets the room the team
 * can make by restructuring, tried on a copy of the book and kept only when he then fits. At the
 * deadline it tags the best star still unsigned, making room the same way.
 */
function reSign(
  people: LeaguePeople, ctx: DayStepContext, config: YearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number, round: "opens" | "deadline",
): { people: LeaguePeople; events: FranchiseEvent[] } {
  const next = ctx.season + 1;
  const book: Book = { contracts: [...(people.contracts ?? [])], dead: [...(people.deadMoney ?? [])], events: [] };
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const freeAgents = [...people.freeAgents];
  const curves = marketCurves(book.contracts, people.players, next, config.rate, config.cap);
  const at = ctx.day;
  const plan = (t: TeamId) => teamCapPlan(t, people.staff);
  const reserveFor = (t: TeamId) => rookieReserve(t, next, people, ctx.rules, config.cap) + plan(t).cushion;
  const typical = typicalPicks(people.players, next, config.rate);
  // Before the new league year the carryover is not set: the team counts on the room it has now.
  const carries = new Map(people.teams.map((t) => [String(t.id), unusedRoom(t.id, ctx.season, people, book, config.cap)]));
  let teams = people.teams;
  if (round === "opens") {
    const carried: Pick<LeaguePeople, "capCarryover"> = {
      capCarryover: [...(people.capCarryover ?? []), ...people.teams.map((t) => ({ team: t.id, season: next, amount: carries.get(String(t.id))! }))],
    };
    teams = teams.map((t) => {
      const fp = floorPlan(t.id, next, people.staff, carried, book, config.cap);
      return getUnderCap(t, next, ctx, book, byId, freeAgents, config, skillOf(t.id, people), true, carried, {
        want: rookieReserve(t.id, next, people, ctx.rules, config.cap) + fp.cushion + fp.marchRoom * MARKET.freeAgencyShare * config.cap(next),
        curves, plan: fp, restructureTo: 0,
      });
    });
  }
  for (const team of teams) {
    const carry = carries.get(String(team.id))!;
    const p0 = plan(team.id);
    const roomIn = (b: Book) => roomFor(team.id, next, b, config.cap, reserveFor(team.id), carry, p0.lookAhead);
    /**
     * Sign `c` if its first year fits, making room by restructuring when it does not (on a copy of the
     * book, kept only when he then fits); `fits` checks the rest (the second year).
     */
    const signWithRoom = (c: PlayerContract, fits: (b: Book) => boolean): boolean => {
      const need = capNumber(c.years[0]!);
      let b = book;
      if (need > roomIn(book)) {
        b = { contracts: [...book.contracts], dead: book.dead, events: [] };
        const trial = b;
        restructureFor(team.id, next, () => need - roomIn(trial), trial, byId, config.cap, p0.voidYears);
        if (need > roomIn(trial)) return false;
      }
      if (!fits(b)) return false;
      if (b !== book) {
        book.contracts = b.contracts;
        book.events.push(...b.events);
      }
      book.contracts.push(c);
      book.events.push(signedEvent(c));
      return true;
    };
    const skill = skillOf(team.id, people);
    const roster = playersOf(team, byId);
    const grade = (p: PlayerState) => teamGrade(team.id, p, skill, config.ahead.forTeam(team.id), ctx.seed, ctx.season);
    // Kept: every man with a deal for next season (one re-signed when re-signing opened among them)
    // or whose deal does not end now; the rest are its own free agents to be. A deal whose bonus runs
    // on into void years still ends now: the void years are played by nobody, so he is a free agent to be.
    const kept = roster.filter((p) => playsUnderIn(book.contracts, String(p.bio.id), next)
      || !book.contracts.some((c) => String(c.player) === String(p.bio.id) && endsAfter(c, ctx.season)));
    const expiring = roster.filter((p) => !kept.includes(p)).map((p) => ({ p, g: grade(p) }));
    // Step 14, §3.4: seats held for the team's own coming picks count as men at their positions.
    const picks = pickSeats(team.id, kept, grade, people, next, ctx.rules, typical);
    const gradesAt = (pos: Position) => [...kept.filter((k) => k.bio.position === pos).map(grade), ...(picks.get(pos) ?? [])];
    // Step 14, §3.1: the team takes its own free agents in value-for-money order, every man it keeps at
    // his position counted, so the room goes first to the men worth most over their price.
    const worthFirst = new Map(expiring.map((e) => {
      const floor = minimumSalary(next, seasonsIn(e.p, next), config.cap);
      const v = valuePlayer(e.p, e.g, curves, floor, config.cap(next), config.ahead.value(team.id, e.p));
      return [e, valueForMoney({ position: e.p.bio.position, here: gradesAt(e.p.bio.position), grade: e.g, apy: v.apy, floor, curve: curves.get(TAG_GROUP[e.p.bio.position]) })] as const;
    }));
    expiring.sort((a, b) => worthFirst.get(b)! - worthFirst.get(a)!);
    const declined: { p: PlayerState; g: number; percentile: number; prior: number }[] = [];
    for (const { p, g } of expiring) {
      const pos = p.bio.position;
      if (!makesTheRoster(g, pos, gradesAt(pos))) continue;
      const cs = seasonsIn(p, next);
      // A team does not let its last man at a starting seat walk over next year's room.
      const lastMan = gradesAt(pos).length < Math.max(1, STARTERS[pos]);
      let signed = false;
      if (cs < RFA_SEASONS) {
        // Exclusive-rights: a one-year minimum tender he must take.
        const c = { ...minimumContract({ player: p.bio.id, team: team.id, season: next, signedAt: at, creditedSeasons: cs, years: 1, capForSeason: config.cap }), kind: "ERFA_TENDER" as const };
        book.contracts.push(c);
        book.events.push(signedEvent(c));
        signed = true;
      }
      if (cs === RFA_SEASONS) {
        // A restricted free agent is tendered at the highest level his value covers, when the tender is
        // worth its price to the team (§3.1). One worth less than the lowest tender is not tendered, as
        // real teams let such a man become an unrestricted free agent; it may still re-sign him for
        // less, as any of its own free agents (below).
        const v = valuePlayer(p, g, curves, minimumSalary(next, cs, config.cap), undefined, config.ahead.value(team.id, p));
        const prior = capNumber(book.contracts.find((c) => String(c.player) === String(p.bio.id) && endsAfter(c, ctx.season))!.years.find((y) => y.season === ctx.season) ?? { season: 0, baseSalary: 0, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: 0 });
        const levels: TenderLevel[] = ["FIRST_ROUND", "SECOND_ROUND", "ORIGINAL_ROUND", "RIGHT_OF_FIRST_REFUSAL"];
        const level = levels.find((l) => tenderPrice(l, config.cap(next), prior) <= v.apy);
        if (level) {
          const price = tenderPrice(level, config.cap(next), prior);
          const floor = minimumSalary(next, cs, config.cap);
          if (lastMan || valueForMoney({ position: pos, here: gradesAt(pos), grade: g, apy: price, floor, curve: curves.get(TAG_GROUP[pos]) }) >= 0) {
            signed = signWithRoom(oneYear(p, team.id, next, at, price, "RFA_TENDER"), () => true);
          }
        }
      }
      if (!signed && cs >= RFA_SEASONS) {
        const v = valuePlayer(p, g, curves, minimumSalary(next, cs, config.cap), config.cap(next), config.ahead.value(team.id, p));
        const offer = buildOffer(p, team.id, next, at, v.apy, v.years, cs, config.cap, "EXTENSION");
        // A team does not keep a man worth less to it than his price (step 14, §3.1), unless he is its last
        // man at a starting seat: he goes to the market.
        if (!lastMan && valueForMoney({ position: pos, here: gradesAt(pos), grade: g, apy: apyOf(offer), floor: dealFloor(offer, cs, config.cap), curve: curves.get(TAG_GROUP[pos]) }) < 0) continue;
        const ask = askingPrice(p, askValue(p, config, curves, minimumSalary(next, cs, config.cap), config.cap(next)), "VALUE", 0, minimumSalary(next, cs, config.cap), ctx.seed, ctx.season);
        const worth = offerWorth(p, {
          apy: v.apy, guaranteed: guaranteedShare(offer), winShare: winShareOf(team.id, ctx.state),
          starts: wouldStart(g, pos, gradesAt(pos)), ownTeam: true,
        }, ask);
        if (worth >= 1) signed = signWithRoom(offer, (b) => lastMan || secondYearFits(team.id, offer, b, config.cap, p0, undefined, true));
        // A star who said no may be tagged at the deadline (a restricted free agent has his tenders instead).
        if (!signed && cs > RFA_SEASONS) {
          const prior = book.contracts.find((c) => String(c.player) === String(p.bio.id) && endsAfter(c, ctx.season));
          declined.push({ p, g, percentile: v.percentile, prior: prior ? capNumber(prior.years.find((y) => y.season === ctx.season) ?? prior.years.at(-1)!) : 0 });
        }
      }
      if (signed) kept.push(p);
    }
    // At the deadline, one franchise tag: the best player who said no, if he is a star and it fits.
    if (round === "deadline" && ctx.rules.franchiseTagEnabled) {
      const star = declined.find((d) => d.percentile >= MARKET.tagPercentile);
      if (star) {
        const price = tagPrice(star.p.bio.position, "FRANCHISE_TAG", config.cap(next), star.prior);
        const c = tagContract({ player: star.p.bio.id, team: team.id, season: next, signedAt: at, position: star.p.bio.position, kind: "FRANCHISE_TAG", cap: config.cap(next), priorSalary: star.prior });
        // The tag comes just before its signing in the stream, after any restructure that made its room.
        if (capNumber(c.years[0]!) <= price && signWithRoom(c, () => true)) {
          book.events.splice(book.events.length - 1, 0, { type: "TAG_APPLIED", payload: { player: star.p.bio.id, tagType: "FRANCHISE_TAG" } });
        }
      }
    }
  }
  return {
    people: {
      ...people, contracts: book.contracts, deadMoney: book.dead,
      // Only the day re-signing opens cuts anyone.
      ...(round === "opens" ? { teams, players: placePlayers(people.players, teams), freeAgents: freeAgents.filter((id, i) => freeAgents.findIndex((x) => String(x) === String(id)) === i) } : {}),
    },
    events: book.events,
  };
}

// ---------- camp extensions (TRAINING_CAMP week 1 day 1) ----------

/**
 * Late summer (owner, 2026-11-07: the real windows): camp is when real teams extend the men in the
 * last year of their deals, their stars above all, before the season starts. A player the team rates
 * highly and who is still in his prime is extended now. The new deal takes over this season from the
 * old deal's last year, as a real extension tears it up (step 14): what that year has already paid
 * (its roster and workout bonuses) stays in it, and the old deal's bonus money still to count moves
 * into the new deal's real years, so the new bonus spreads from this season (a star whose last year
 * was dear counts less this season). The team takes its stars first and, short of room, restructures
 * other deals as at re-signing.
 */
function campExtensions(
  people: LeaguePeople, ctx: DayStepContext, config: YearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number,
): { people: LeaguePeople; events: FranchiseEvent[] } | undefined {
  const season = ctx.season;
  const book: Book = { contracts: [...(people.contracts ?? [])], dead: [...(people.deadMoney ?? [])], events: [] };
  if (book.contracts.length === 0) return undefined;
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const curves = marketCurves(book.contracts, people.players, season, config.rate, config.cap);
  const at = ctx.day;
  for (const team of people.teams) {
    const plan = floorPlan(team.id, season, people.staff, people, book, config.cap);
    const carry = adjustedCap(team.id, season, people, config.cap) - config.cap(season);
    const skill = skillOf(team.id, people);
    const roster = playersOf(team, byId);
    const grade = (p: PlayerState) => teamGrade(team.id, p, skill, config.ahead.forTeam(team.id), ctx.seed, ctx.season);
    const gradesAt = (pos: Position) => roster.filter((k) => k.bio.position === pos).map(grade);
    const oldDeal = (p: PlayerState) => book.contracts.findIndex((c) => String(c.player) === String(p.bio.id) && c.team === team.id && endsAfter(c, season));
    // The men it would extend, its stars first: the room goes to them before the rest.
    const candidates = roster.flatMap((p) => {
      const oi = oldDeal(p);
      const old = oi >= 0 ? book.contracts[oi] : undefined;
      if (!old) return [];
      // Not a deal that started this season (nothing of it to keep), nor a man with another deal for it.
      if (!old.years.some((y) => y.season < season && !y.voidYear)) return [];
      if (book.contracts.some((c, j) => j !== oi && String(c.player) === String(p.bio.id) && liveIn(c, season))) return [];
      const cs = seasonsIn(p, season);
      // A drafted player cannot sign a new deal until his third season is over (the real rookie rule).
      if (old.kind === "ROOKIE" && cs < MARKET.rookieExtensionSeasons) return [];
      if (ageFactorAt(config.ahead.ruleAge(team.id, p) + 2) < MARKET.extendAgeFactor) return [];
      const g = grade(p);
      const floor = minimumSalary(season, cs, config.cap);
      const v = valuePlayer(p, g, curves, floor, config.cap(season), config.ahead.value(team.id, p));
      return v.percentile < MARKET.extendPercentile ? [] : [{ p, g, cs, floor, v }];
    }).sort((a, b) => b.v.percentile - a.v.percentile);
    const roomIn = (b: Book) => roomFor(team.id, season, b, config.cap, plan.cushion, carry, plan.lookAhead, at);
    for (const { p, g, cs, floor, v } of candidates) {
      const oi = oldDeal(p);
      const old = book.contracts[oi]!;
      const fresh = buildOffer(p, team.id, season, at, v.apy, v.years, cs, config.cap, "EXTENSION");
      const left = old.years.filter((y) => y.season >= season).reduce((a, y) => a + proration(y), 0);
      const each = prorate(left, fresh.years.filter((y) => !y.voidYear).length);
      const lastYear = old.years.find((y) => y.season === season);
      // What the old deal's last year has paid by camp stays in this season.
      const paid = (y: ContractYear): ContractYear => ({
        ...y,
        ...(lastYear?.rosterBonus ? { rosterBonus: (y.rosterBonus ?? 0) + lastYear.rosterBonus } : {}),
        ...(lastYear?.workoutBonus ? { workoutBonus: (y.workoutBonus ?? 0) + lastYear.workoutBonus } : {}),
      });
      const offer = withCapHits({
        ...fresh,
        years: fresh.years.map((y, i) => (y.voidYear || i >= each.length ? y : { ...(i === 0 ? paid(y) : y), signingBonusProration: y.signingBonusProration + each[i]! })),
      });
      const shortened: PlayerContract = { ...old, years: old.years.filter((y) => y.season < season) };
      // The old deal's last year leaves the books as the new deal's first comes on. A team short of the
      // room for the difference restructures other deals, as at re-signing: tried on a copy of the
      // book, kept only when he signs.
      const extra = capNumber(offer.years[0]!) - (lastYear ? capNumber(lastYear) : 0);
      let b = book;
      if (extra > roomIn(book)) {
        const trial: Book = { contracts: [...book.contracts], dead: book.dead, events: [] };
        restructureFor(team.id, season, () => extra - roomIn(trial), trial, byId, config.cap, plan.voidYears, (c) => String(c.player) === String(p.bio.id));
        if (extra > roomIn(trial)) continue;
        b = trial;
      }
      if (!secondYearFits(team.id, offer, { ...b, contracts: b.contracts.map((c, j) => (j === oi ? shortened : c)) }, config.cap, plan, undefined, true)) continue;
      const ask = askingPrice(p, askValue(p, config, curves, floor, config.cap(season)), "VALUE", 0, floor, ctx.seed, ctx.season);
      const worth = offerWorth(p, {
        // He weighs the new deal's own pay, not the bonus money it carries over from his old one.
        apy: apyOf(fresh), guaranteed: guaranteedShare(offer), winShare: winShareOf(team.id, ctx.state),
        starts: wouldStart(g, p.bio.position, gradesAt(p.bio.position)), ownTeam: true,
      }, ask);
      if (worth < 1) continue;
      if (b !== book) {
        book.contracts = b.contracts;
        book.events.push(...b.events);
      }
      book.contracts[oi] = shortened;
      book.contracts.push(offer);
      book.events.push(signedEvent(offer));
    }
  }
  if (book.events.length === 0) return undefined;
  return { people: { ...people, contracts: book.contracts }, events: book.events };
}

function oneYear(p: PlayerState, team: TeamId, season: number, at: CalendarStamp, price: number, kind: PlayerContract["kind"]): PlayerContract {
  return {
    player: p.bio.id, team, signedAt: at, ...(kind ? { kind } : {}),
    years: [{ season, baseSalary: price, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: price }],
  };
}

/** A deal built as real deals at its pay and length are (step 14, `realStructure`), whoever he is. */
function buildOffer(
  p: PlayerState, team: TeamId, season: number, at: CalendarStamp, apy: number, years: number,
  cs: number, cap: CapForSeason, kind: "VETERAN" | "EXTENSION",
): PlayerContract {
  const s = realStructure(apy / cap(season), years, apy <= REAL_STRUCTURE.minimumUpTo * minimumSalary(season, cs, cap));
  return veteranContract({
    player: p.bio.id, team, season, signedAt: at, apy, years, bonusShare: s.bonusShare, guaranteedYears: 0, guaranteedShare: s.guaranteedShare,
    minimum: (i) => minimumSalary(season + i, cs + i, cap), kind, firstYearShare: firstYearShareFor(apy / cap(season)),
  });
}

/**
 * The least a team could pay a man a year over a deal's real years: each year's minimum salary, by his
 * credited seasons then, averaged. Value for money weighs his pay over this, so a deal at the minimum
 * every year costs nothing over it, however long it runs.
 */
function dealFloor(c: PlayerContract, cs: number, cap: CapForSeason): number {
  const real = c.years.filter((y) => !y.voidYear);
  if (real.length === 0) return 0;
  const first = real[0]!.season;
  return real.reduce((a, y) => a + minimumSalary(y.season, cs + (y.season - first), cap), 0) / real.length;
}

/**
 * What a man thinks he is worth a year, the base of his asking price: the market's price for his
 * rating, judged ahead with no team's error over the middle years (step 13; today's with no growth
 * record, at his age's discount).
 */
function askValue(p: PlayerState, config: YearConfig, curves: MarketCurves, floor: number, cap: number): number {
  return valuePlayer(p, config.ahead.rate(undefined, p), curves, floor, cap, config.ahead.value(undefined, p)).apy;
}

// ---------- the new league year (OFF_RESET_FA week 1 day 1) ----------

/**
 * A team's plan for a league year, with the spending floor (step 10, owner's Q3): behind it, the team
 * spends like a win-now team. The window runs from the first league year the sim holds a carryover
 * for, so seasons before the league began (their deals only partly in the book) never count.
 */
function floorPlan(
  team: TeamId, season: number, staff: readonly StaffState[] | undefined, people: Pick<LeaguePeople, "capCarryover">, book: Book, cap: CapForSeason,
): CapPlan {
  const seasons = (people.capCarryover ?? []).filter((c) => c.team === team).map((c) => c.season);
  const first = seasons.length > 0 ? Math.min(...seasons) : season;
  return planWithFloor(teamCapPlan(team, staff), floorShortfall(team, season, book.contracts, book.dead, cap, first));
}

function newLeagueYear(
  people: LeaguePeople, ctx: DayStepContext, config: YearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number,
): { people: LeaguePeople; events: FranchiseEvent[] } {
  const year = ctx.season + 1;
  const book: Book = { contracts: [...(people.contracts ?? [])], dead: [...(people.deadMoney ?? [])], events: [] };
  // Each team carries the room it did not use last league year into this one.
  const capCarryover = [
    // Kept for the spending floor's four-year window (step 10); a lookup reads one season.
    ...(people.capCarryover ?? []).filter((c) => c.season > year - CASH_FLOOR.seasons),
    ...people.teams.map((t) => ({ team: t.id, season: year, amount: unusedRoom(t.id, ctx.season, people, book, config.cap) })),
  ];
  const carried = { capCarryover };
  // Deals run out (void years land as dead money).
  for (let i = 0; i < book.contracts.length; i++) {
    const r = expireContract(book.contracts[i]!, year, ctx.day);
    if (!r) continue;
    book.contracts[i] = r.contract;
    book.dead.push(...r.charges);
    book.events.push(...r.events);
  }
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const freeAgents = [...people.freeAgents];
  const hadDeal = new Set(book.contracts.map((c) => String(c.player)));
  let teams = people.teams.map((t) => {
    // A player whose deal ran out and who has no new one leaves. Players the book never knew stay.
    const gone = t.roster.filter((id) => hadDeal.has(String(id)) && !hasDealIn(book.contracts, String(id), year));
    freeAgents.push(...gone);
    const goneSet = new Set(gone.map(String));
    return withDepth({ ...t, roster: t.roster.filter((id) => !goneSet.has(String(id))) }, byId, config.rate);
  });
  const curves = marketCurves(book.contracts, people.players, year, config.rate, config.cap);
  teams = teams.map((t) => {
    const plan = floorPlan(t.id, year, people.staff, carried, book, config.cap);
    return getUnderCap(t, year, ctx, book, byId, freeAgents, config, skillOf(t.id, people), true, carried, {
      want: rookieReserve(t.id, year, people, ctx.rules, config.cap) + plan.cushion + plan.marchRoom * MARKET.freeAgencyShare * config.cap(year), curves, plan,
    });
  });
  return {
    people: { ...people, capCarryover, teams, players: placePlayers(people.players, teams), freeAgents: freeAgents.filter((id, i) => freeAgents.findIndex((x) => String(x) === String(id)) === i), contracts: book.contracts, deadMoney: book.dead },
    events: book.events,
  };
}

const yearBase = (c: PlayerContract, season: number): number => c.years.find((y) => y.season === season)?.baseSalary ?? 0;

/**
 * Restructure a team's deals for `year` while `short()` (room still wanted, dollars) is above zero:
 * the biggest base salaries first, base above his minimum turned into bonus over the deal's own
 * years; then, still short and if `voidYears`, with void years added so the bonus spreads over the
 * real limit of five. `skip`: deals left alone (the man a camp extension is for).
 */
function restructureFor(
  team: TeamId, year: number, short: () => number, book: Book, byId: ReadonlyMap<string, PlayerState>, cap: CapForSeason, voidYears: boolean,
  skip?: (c: PlayerContract) => boolean,
): void {
  let over = short();
  const live = () => book.contracts.map((c, i) => ({ c, i })).filter(({ c }) => c.team === team && liveIn(c, year) && !skip?.(c));
  for (const voids of voidYears ? [false, true] : [false]) {
    for (const { c, i } of live().sort((a, b) => yearBase(b.c, year) - yearBase(a.c, year))) {
      if (over <= 0) return;
      const p = byId.get(String(c.player));
      const left = c.years.filter((y) => y.season >= year && !y.voidYear).length;
      const spread = c.years.filter((y) => y.season >= year).length;
      const addVoidYears = voids ? Math.max(0, Math.min(MARKET.maxVoidYears, MAX_PRORATION_YEARS - spread)) : 0;
      const n = Math.min(MAX_PRORATION_YEARS, (voids ? spread : left) + addVoidYears);
      if (!p || left < 1 || n < 2 || (voids && addVoidYears === 0)) continue;
      const floor = minimumSalary(year, seasonsIn(p, year), cap);
      const amount = Math.min(yearBase(c, year) - floor, Math.ceil(over * n / (n - 1) / 1000) * 1000);
      if (amount < 1_000_000) continue;
      const r = restructure(c, year, amount, { floor, addVoidYears });
      book.contracts[i] = r.contract;
      book.events.push(...r.events);
      over = short();
    }
  }
}

/**
 * Get one team under the cap for `year` (Q7 a, a hard cap): restructure the biggest deals first
 * (base salary above his minimum turned into bonus), then cut whoever saves the most per point of
 * value. Cut players go to `freeAgents`. `top51`: the offseason count.
 */
function getUnderCap(
  t: Team, year: number, ctx: DayStepContext, book: Book, byId: ReadonlyMap<string, PlayerState>, freeAgents: PlayerState["bio"]["id"][],
  config: YearConfig, skill: number, top51: boolean, carried: Pick<LeaguePeople, "capCarryover">,
  /**
   * The new league year: room wanted beyond the cap, and the market to judge who is overpaid.
   * `restructureTo`, when set, is the room restructures aim for instead of `want` (re-signing's
   * opening day restructures only to get under the cap: room for its own men is made as they sign).
   */
  newYear?: { want: number; curves: MarketCurves; plan: CapPlan; restructureTo?: number },
): Team {
  const grade = (p: PlayerState) => teamGrade(t.id, p, skill, config.ahead.forTeam(t.id), ctx.seed, ctx.season);
  const capNow = adjustedCap(t.id, year, carried, config.cap);
  const room = () => capNow - teamCapTotal(t.id, year, book.contracts, book.dead, { top51, at: ctx.day }).total;
  const live = () => book.contracts.map((c, i) => ({ c, i })).filter(({ c }) => c.team === t.id && liveIn(c, year));
  let roster = [...t.roster];
  let squad = [...(t.practiceSquad ?? [])];
  const countAt = () => {
    const at = new Map<Position, number>();
    for (const id of roster) { const pos = byId.get(String(id))?.bio.position; if (pos) at.set(pos, (at.get(pos) ?? 0) + 1); }
    return at;
  };
  // Never a roster's last men at a position (its starters, at least one).
  const spare = (p: PlayerState, at: ReadonlyMap<Position, number>) =>
    !roster.some((id) => String(id) === String(p.bio.id)) || (at.get(p.bio.position) ?? 0) > Math.max(1, STARTERS[p.bio.position]);
  const release = (i: number, p: PlayerState, r: ReturnType<typeof releasePlayer>) => {
    book.contracts[i] = r.contract;
    book.dead.push(...r.charges);
    book.events.push(...r.events);
    roster = roster.filter((id) => String(id) !== String(p.bio.id));
    squad = squad.filter((id) => String(id) !== String(p.bio.id));
    freeAgents.push(p.bio.id);
  };
  const saving = (c: PlayerContract, r: ReturnType<typeof releasePlayer>) =>
    capNumber(c.years.find((y) => y.season === year)!) - r.charges.filter((x) => x.season === year).reduce((s, x) => s + x.amount, 0);
  const want = newYear?.want ?? 0;
  if (newYear) {
    // Cap casualties: veterans past their prime paid far more than the market would pay them now. A
    // team with room for its rookies and its buffer without the saving may designate the cut
    // post-June-1 (two a year), giving up the free-agency room it would free in March: he counts in
    // full until June 2, and the rest of his bonus lands next year instead of now.
    let designations = POST_JUNE_1_DESIGNATIONS - book.contracts.filter((c) => c.team === t.id && designatedIn(c, year)).length;
    for (const { c, i } of live()) {
      const p = byId.get(String(c.player));
      if (!p || ageFactorAt(config.ahead.ruleAge(t.id, p)) >= 1 || !spare(p, countAt())) continue;
      const hit = capNumber(c.years.find((y) => y.season === year)!);
      const worth = valuePlayer(p, grade(p), newYear.curves, minimumSalary(year, seasonsIn(p, year), config.cap), config.cap(year), config.ahead.value(t.id, p)).apy;
      if (worth >= MARKET.casualtyShare * hit) continue;
      const r = releasePlayer(c, ctx.day);
      if (saving(c, r) < MARKET.casualtySaving) continue;
      const designated = designations > 0 && !isAfterJune1(ctx.day) && room() >= want - newYear.plan.marchRoom * MARKET.freeAgencyShare * config.cap(year) ? releasePlayer(c, ctx.day, { designatedPostJune1: true }) : undefined;
      if (designated && (designated.charges.find((x) => x.season === year + 1)?.amount ?? 0) >= MARKET.designateLater) {
        designations--;
        release(i, p, designated);
      } else {
        release(i, p, r);
      }
    }
  }
  // Restructures toward the room wanted.
  const target = newYear?.restructureTo ?? want;
  restructureFor(t.id, year, () => target - room(), book, byId, config.cap, newYear?.plan.voidYears !== false);
  // Then cuts, only as far as the cap itself: any deal on the books may go, but never a position's last men.
  let over = -room();
  while (over > 0) {
    const at = countAt();
    const candidates = live().map(({ c, i }) => ({ c, i, p: byId.get(String(c.player)) }))
      .filter((x): x is { c: PlayerContract; i: number; p: PlayerState } => x.p !== undefined && spare(x.p, at))
      .map(({ c, i, p }) => {
        const r = releasePlayer(c, ctx.day);
        return { i, p, r, saves: saving(c, r), worth: Math.max(1, grade(p) - 40) * POSITION_VALUE[p.bio.position] };
      }).filter((x) => x.saves > 0).sort((a, b) => b.saves / b.worth - a.saves / a.worth);
    const cut = candidates[0];
    if (!cut) break;
    release(cut.i, cut.p, cut.r);
    over = -room();
  }
  return withDepth({ ...t, roster, ...(t.practiceSquad ? { practiceSquad: squad } : {}) }, byId, config.rate);
}

/**
 * The roster's most spare man: at a position with more than its wanted number, the lowest graded
 * there whose release costs the least this year. Undefined when no position has a spare.
 */
function mostSpare(
  t: Team, byId: ReadonlyMap<string, PlayerState>, rate: Rate, year: number, book: Book,
): { i: number; p: PlayerState } | undefined {
  const roster = playersOf(t, byId);
  let best: { i: number; p: PlayerState; score: number } | undefined;
  for (const p of roster) {
    const n = roster.filter((r) => r.bio.position === p.bio.position).length;
    if (n <= Math.max(1, WANTED[p.bio.position])) continue;
    const i = book.contracts.findIndex((c) => String(c.player) === String(p.bio.id) && c.team === t.id && liveIn(c, year));
    if (i < 0) continue;
    const dead = releasePlayer(book.contracts[i]!, { season: year, phase: "PRESEASON", week: 1, day: 1 }).charges.reduce((s, x) => s + x.amount, 0);
    const score = rate(p) + dead / 1e6;
    if (!best || score < best.score) best = { i, p, score };
  }
  return best && { i: best.i, p: best.p };
}

/**
 * A compliance check after the draft (still the top-51 count) and the day after cut-down day (every
 * deal counts from the regular season on). After cut-down, a team left short of its 53 fills up with
 * the best free agents on one-year minimum deals.
 */
function complianceCheck(
  people: LeaguePeople, ctx: DayStepContext, config: YearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number,
  year: number, top51: boolean, fillTo?: number,
): { people: LeaguePeople; events: FranchiseEvent[] } | undefined {
  const book: Book = { contracts: [...(people.contracts ?? [])], dead: [...(people.deadMoney ?? [])], events: [] };
  if (book.contracts.length === 0) return undefined;
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const freeAgents = [...people.freeAgents];
  let teams = people.teams.map((t) => getUnderCap(t, year, ctx, book, byId, freeAgents, config, skillOf(t.id, people), top51, people));
  if (fillTo !== undefined) {
    const taken = new Set<string>();
    teams = teams.map((t) => {
      const judge = config.ahead.forTeam(t.id);
      let roster = [...t.roster];
      const pool = freeAgents.map((id) => byId.get(String(id))).filter((p): p is PlayerState => !!p && !taken.has(String(p.bio.id)));
      // First every hole: a position with fewer than its starters (at least one) gets the best free
      // agent there on a minimum deal. Then the roster's shape (ADR-079's wanted number at each
      // position), so that every personnel group can be fielded. A full roster lets its most spare
      // man go to make the seat. The league must play, so these minimum deals do not wait on room.
      const shape = [(pos: Position) => Math.max(1, STARTERS[pos]), (pos: Position) => Math.max(1, WANTED[pos])];
      for (const [pass, want] of shape.entries()) for (const pos of Object.keys(STARTERS) as Position[]) {
        const here = () => playersOf({ ...t, roster }, byId).filter((p) => p.bio.position === pos).length;
        while (here() < want(pos)) {
          const pick = pool.filter((p) => p.bio.position === pos && !taken.has(String(p.bio.id))).sort((a, b) => judge(b) - judge(a))[0];
          if (!pick) break;
          if (roster.length >= fillTo) {
            // The shape never costs a man the roster wants: only a starter hole may release.
            if (pass > 0) break;
            const spare = mostSpare({ ...t, roster }, byId, judge, year, book);
            if (!spare) break;
            const r = releasePlayer(book.contracts[spare.i]!, ctx.day);
            book.contracts[spare.i] = r.contract;
            book.dead.push(...r.charges);
            book.events.push(...r.events);
            roster = roster.filter((id) => String(id) !== String(spare.p.bio.id));
            freeAgents.push(spare.p.bio.id);
          }
          const c = minimumContract({ player: pick.bio.id, team: t.id, season: year, signedAt: ctx.day, creditedSeasons: seasonsIn(pick, year), years: 1, capForSeason: config.cap });
          book.contracts.push(c);
          book.events.push(signedEvent(c));
          taken.add(String(pick.bio.id));
          roster.push(pick.bio.id);
        }
      }
      while (roster.length < fillTo) {
        const room = adjustedCap(t.id, year, people, config.cap) - teamCapTotal(t.id, year, book.contracts, book.dead).total;
        const here = playersOf({ ...t, roster }, byId);
        const pick = pool.filter((p) => !taken.has(String(p.bio.id)) && minimumSalary(year, seasonsIn(p, year), config.cap) <= room)
          .sort((a, b) => (judge(b) + 10 * needAt(b.bio.position, here, judge)) - (judge(a) + 10 * needAt(a.bio.position, here, judge)))[0];
        if (!pick) break;
        const c = minimumContract({ player: pick.bio.id, team: t.id, season: year, signedAt: ctx.day, creditedSeasons: seasonsIn(pick, year), years: 1, capForSeason: config.cap });
        book.contracts.push(c);
        book.events.push(signedEvent(c));
        taken.add(String(pick.bio.id));
        roster.push(pick.bio.id);
      }
      return withDepth({ ...t, roster }, byId, config.rate);
    });
    const left = freeAgents.filter((id) => !taken.has(String(id)));
    freeAgents.length = 0;
    freeAgents.push(...left);
  }
  if (book.events.length === 0) return undefined;
  return {
    people: { ...people, teams, players: placePlayers(people.players, teams), freeAgents: freeAgents.filter((id, i) => freeAgents.findIndex((x) => String(x) === String(id)) === i), contracts: book.contracts, deadMoney: book.dead },
    events: book.events,
  };
}

// ---------- free agency (OFF_RESET_FA week 1 day 2 to cut-down day) ----------

/** Puts a hole at a position ahead of every upgrade in a team's market list. */
const HOLE_FIRST = 1e6;

/** The asks carried into this league year's next market day (`LeaguePeople.freeAgentAsks`), by player. */
function carriedAsks(people: LeaguePeople, season: number): Map<string, number> {
  return new Map((people.freeAgentAsks ?? []).filter((a) => a.season === season).map((a) => [String(a.player), a.ask]));
}

/**
 * A market day: rounds of offers until nobody signs. Each round every team with a seat and room makes
 * one offer, to the target at the top of its list, and each man takes the offer worth most to him if it
 * is worth his ask. How prices are set depends on `config.marketPrices` (step 14):
 *
 *   - "calendar" (default): his ask is set by the day's window (`marketWindow`, `askingPrice`); a team's
 *     list puts its biggest bargain (value for money) first; an offer stops at his ask; and from the
 *     draft, a man no team could fit drops his ask, between rounds, to the room of the roomiest team
 *     that wanted him (step 12).
 *   - "offers" (design "Free agency: prices from the offers", 2026-11-07), four rules:
 *     1. no price by the date: his ask is his value times his agent's optimism on every market day,
 *        or the ask he carried from his last market day when that is lower;
 *     2. among the men worth their price to it (value for money), a team calls first the man who would
 *        help it most (`helpOf`); a hole still has its head start (`HOLE_FIRST`);
 *     3. teams that want the same man bid: he goes to the offer worth most to him at its team's limit
 *        (what the team thinks he is worth, need counted), for the money that beats the next team's
 *        best at its limit, never above the winner's limit; a team alone raises its offer up to its
 *        limit when the rest of the offer leaves him short of his ask. A raise that would not fit the
 *        team's room, or that needs a swap, is not made;
 *     4. a man still unsigned at the day's end carries into his next market day the most any team that
 *        wanted him that day would have paid (its offer, or its room when it could not fit him), when
 *        that is less than his ask. His ask never drops inside a day.
 */
function freeAgency(
  people: LeaguePeople, ctx: DayStepContext, config: YearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number,
  market: { window: MarketWindow; weeksIntoBargain: number },
): { people: LeaguePeople; events: FranchiseEvent[] } | undefined {
  if (people.freeAgents.length === 0) return undefined;
  // The deals being signed are for the league year the day falls in.
  const season = ctx.day.phase.startsWith("OFF_") ? ctx.season + 1 : ctx.season;
  const lastSeason = season - 1;
  const book: Book = { contracts: [...(people.contracts ?? [])], dead: [...(people.deadMoney ?? [])], events: [] };
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const curves: MarketCurves = marketCurves(book.contracts, people.players, season, config.rate, config.cap);
  const limit = ctx.rules.offseasonRosterLimit ?? DEFAULT_LEAGUE_RULES.offseasonRosterLimit ?? 90;
  // Until the draft is made, a team keeps room and seats for its class.
  const beforeDraft = ctx.day.phase.startsWith("OFF_") && compareStamps(ctx.day, { ...DRAFT_DAYS.draft, season: ctx.day.season }) < 0;
  const plans = new Map(people.teams.map((t) => [String(t.id), floorPlan(t.id, season, people.staff, people, book, config.cap)]));
  const plan = (t: TeamId) => plans.get(String(t)) ?? teamCapPlan(t, people.staff);
  const reserve = (t: TeamId) => (beforeDraft ? rookieReserve(t, season, people, ctx.rules, config.cap) : 0) + plan(t).cushion;
  let teams = [...people.teams];
  let pool = people.freeAgents.map((id) => byId.get(String(id))).filter((p): p is PlayerState => p !== undefined);
  const lastTeam = new Map<string, TeamId>();
  // Unrestricted free agents: their deal ran out (not a release). Their moves count for comp picks.
  const ranOut = new Map<string, TeamId>();
  for (const c of book.contracts) {
    if (!c.ended || !c.years.some((y) => y.season === lastSeason)) continue;
    lastTeam.set(String(c.player), c.team);
    if (c.ended.reason === "EXPIRED") ranOut.set(String(c.player), c.team);
  }
  const moves = [...(people.freeAgentMoves ?? [])];
  const offersPrice = config.marketPrices === "offers";
  const carried = offersPrice ? carriedAsks(people, season) : new Map<string, number>();
  const asks = new Map(pool.map((p) => {
    const cs = seasonsIn(p, season);
    const floor = minimumSalary(season, cs, config.cap);
    const value = askValue(p, config, curves, floor, config.cap(season));
    if (!offersPrice) return [String(p.bio.id), askingPrice(p, value, market.window, market.weeksIntoBargain, floor, ctx.seed, season)];
    // "offers", rule 1: no price by the date; rule 4: the ask he carried, when it is lower.
    const fresh = askingPrice(p, value, "VALUE", 0, floor, ctx.seed, season);
    const kept = carried.get(String(p.bio.id));
    return [String(p.bio.id), kept === undefined ? fresh : Math.max(floor, Math.min(fresh, kept))];
  }));
  const signed = new Set<string>();
  // Men let go to make room (step 12): they join the free agents after today's market.
  const released: PlayerId[] = [];
  // A player who turned a team down today is not asked again today: the team moves to its next target.
  const turnedDown = new Set<string>();
  const graded = new Map<string, number>();
  // "offers", rule 4: the most any team that wanted a man today would pay him, and, of the teams that
  // could not fit him, the most such a team could (the lesser of its room and its limit).
  const wantedAt = new Map<string, number>();
  const shortToday = new Map<string, number>();
  for (let round = 0; round < MARKET.rounds && pool.length > 0; round++) {
    const offers = new Map<string, MarketOffer[]>();
    // The most room any team that wanted him had, when none could fit him (step 12).
    const shortOf = new Map<string, number>();
    const order = shuffled(teams.map((t) => t.id), ctx.seed, `fa/${String(ctx.day.phase)}/${ctx.day.week}/${ctx.day.day}/${round}`);
    for (const teamId of order) {
      const t = teams.find((x) => x.id === teamId)!;
      const seats = limit - t.roster.length - (beforeDraft ? MARKET.draftSeats + MARKET.undraftedSeats : 0);
      if (seats <= 0) continue;
      const room = roomFor(t.id, season, book, config.cap, reserve(t.id), adjustedCap(t.id, season, people, config.cap) - config.cap(season), plan(t.id).lookAhead, ctx.day);
      if (room <= 0) continue;
      const skill = skillOf(t.id, people);
      const judge = config.ahead.forTeam(t.id);
      // A team's grade of a man is fixed for the day, so it is drawn once and kept across rounds.
      const grade = (p: PlayerState) => {
        const k = `${String(t.id)}|${String(p.bio.id)}`;
        let g = graded.get(k);
        if (g === undefined) { g = teamGrade(t.id, p, skill, judge, ctx.seed, season); graded.set(k, g); }
        return g;
      };
      const roster = playersOf(t, byId);
      const gradesHere = new Map<Position, number[]>();
      const menAt = new Map<Position, { r: PlayerState; g: number }[]>();
      for (const r of roster) {
        const g = grade(r);
        (gradesHere.get(r.bio.position) ?? gradesHere.set(r.bio.position, []).get(r.bio.position)!).push(g);
        (menAt.get(r.bio.position) ?? menAt.set(r.bio.position, []).get(r.bio.position)!).push({ r, g });
      }
      const needs = new Map<Position, number>();
      // His best target: the most valuable free agent he needs and can afford.
      let best: { p: PlayerState; contract: PlayerContract; score: number; starts: boolean; limit: number; cut?: { i: number; p: PlayerState } } | undefined;
      // Step 12: a team short of room may let go a lesser man at the position to make it (a swap).
      const liveAt = new Map<string, number>();
      book.contracts.forEach((c, i) => { if (c.team === t.id && !c.ended && c.years.some((y) => y.season === season && !y.voidYear)) liveAt.set(String(c.player), i); });
      const cutCost = new Map<number, { dead: number; saving: number }>();
      // What letting the man on deal `i` go today would cost: dead money in all seasons, and this season's saving.
      const costOfCut = (i: number) => cutCost.get(i) ?? (() => {
        const c = book.contracts[i]!;
        const charges = releasePlayer(c, ctx.day).charges;
        const now = charges.filter((x) => x.season === season).reduce((a, x) => a + x.amount, 0);
        const v = { dead: charges.reduce((a, x) => a + x.amount, 0), saving: capNumber(c.years.find((y) => y.season === season)!) - now };
        cutCost.set(i, v);
        return v;
      })();
      const totals = new Map<number, number>();
      const cutFor = (pos: Position, g: number, short: number) => {
        let pick: { i: number; p: PlayerState; saving: number } | undefined;
        for (const { r, g: gr } of menAt.get(pos) ?? []) {
          if (gr > g - MARKET.upgradeMargin) continue;
          const i = liveAt.get(String(r.bio.id));
          if (i === undefined) continue;
          const k = costOfCut(i);
          if (k.dead > MARKET.swapDeadMost * config.cap(season)) continue;
          const saving = k.saving;
          if (saving >= short && (!pick || saving > pick.saving)) pick = { i, p: r, saving };
        }
        return pick;
      };
      for (const p of pool) {
        if (signed.has(String(p.bio.id)) || turnedDown.has(`${String(t.id)}|${String(p.bio.id)}`)) continue;
        const pos = p.bio.position;
        const here = gradesHere.get(pos) ?? [];
        if (!needs.has(pos)) needs.set(pos, needAt(pos, roster, judge));
        const need = needs.get(pos)!;
        const g = grade(p);
        // Step 11: a man who would make the 53 by a clear margin is worth a call, not only a starter.
        const upgrade = here.filter((x) => x > g - MARKET.upgradeMargin).length < WANTED[pos];
        if (!upgrade && need < 0.2) continue;
        const cs = seasonsIn(p, season);
        const floor = minimumSalary(season, cs, config.cap);
        const v = valuePlayer(p, g, curves, floor, config.cap(season), config.ahead.value(t.id, p));
        // Step 12: a team pays what it thinks he is worth (its limit), but never more than he asks.
        const limit = Math.max(floor, Math.round(v.apy * (MARKET.offerBase + MARKET.offerNeed * need) / 1000) * 1000);
        const apy = Math.max(floor, Math.min(asks.get(String(p.bio.id))!, limit));
        let contract = buildOffer(p, t.id, season, ctx.day, apy, v.years, cs, config.cap, "VETERAN");
        // Step 12: when next year has no room for a longer deal, the team offers one year ("prove it").
        if (v.years > 1 && !secondYearFits(t.id, contract, book, config.cap, plan(t.id), totals)) {
          contract = buildOffer(p, t.id, season, ctx.day, apy, 1, cs, config.cap, "VETERAN");
        }
        let cut: { i: number; p: PlayerState } | undefined;
        if (capNumber(contract.years[0]!) > room) {
          cut = cutFor(pos, g, capNumber(contract.years[0]!) - room);
          if (!cut) {
            const id = String(p.bio.id);
            // "offers": a team that cannot fit him would still pay no more than its limit.
            shortOf.set(id, Math.max(shortOf.get(id) ?? 0, offersPrice ? Math.min(room, limit) : room));
            continue;
          }
        }
        // A hole (fewer than the position's starters, at least one) comes before any upgrade.
        const hole = here.length < Math.max(1, STARTERS[pos]) ? HOLE_FIRST : 0;
        // Step 14, §3.1: then value for money, every man at the position counted (`valueForMoney.ts`).
        // A signing that would push a teammate off the 53 counts that man's dead money, spread over the
        // new deal, and is passed over when the cut would leave more than a swap may (`swapDeadMost`).
        let seat = 0;
        const out = pushedOut(menAt.get(pos) ?? [], pos, g);
        const outAt = out ? liveAt.get(String(out.r.bio.id)) : undefined;
        if (outAt !== undefined) {
          const k = costOfCut(outAt);
          if (k.dead > MARKET.swapDeadMost * config.cap(season)) continue;
          seat = k.dead / Math.max(1, contract.years.filter((y) => !y.voidYear).length);
        }
        const value = valueForMoney({ position: pos, here, grade: g, apy: apyOf(contract), floor: dealFloor(contract, cs, config.cap), curve: curves.get(TAG_GROUP[pos]), extraCost: seat });
        if (!hole && value < 0) continue;
        if (offersPrice) wantedAt.set(String(p.bio.id), Math.max(wantedAt.get(String(p.bio.id)) ?? 0, apy));
        // "calendar": the biggest bargain first. "offers", rule 2: of the men worth their price, the one
        // who would help most first.
        const score = hole + (offersPrice && value >= 0 ? helpOf({ position: pos, here, grade: g, curve: curves.get(TAG_GROUP[pos]) }) : value);
        if (!best || score > best.score) best = { p, contract, score, starts: wouldStart(g, pos, here), limit, ...(cut ? { cut: { i: cut.i, p: cut.p } } : {}) };
      }
      if (!best) continue;
      const terms = { winShare: winShareOf(t.id, ctx.state), starts: best.starts, ownTeam: lastTeam.get(String(best.p.bio.id)) === t.id };
      const worth = offerWorth(best.p, { ...terms, apy: apyOf(best.contract), guaranteed: guaranteedShare(best.contract) }, asks.get(String(best.p.bio.id))!);
      const list = offers.get(String(best.p.bio.id)) ?? [];
      list.push({ team: t.id, contract: best.contract, worth, terms, limit: best.limit, room, ...(best.cut ? { cut: best.cut } : {}) });
      offers.set(String(best.p.bio.id), list);
    }
    // "offers", rule 4: no drop inside the day; what the teams that could not fit him would pay is kept for tonight.
    if (offersPrice) for (const [id, most] of shortOf) shortToday.set(id, Math.max(shortToday.get(id) ?? 0, most));
    // Step 12: in the bargain basement, a man nobody could fit comes down to what the best of them can pay.
    let lowered = 0;
    if (!offersPrice && market.window === "BARGAIN") {
      for (const [id, most] of shortOf) {
        if (offers.has(id) || signed.has(id)) continue;
        const p = byId.get(id)!;
        const floor = minimumSalary(season, seasonsIn(p, season), config.cap);
        const ask = asks.get(id)!;
        const next = Math.max(floor, Math.floor(most / 1000) * 1000);
        if (next < ask) { asks.set(id, next); lowered++; }
      }
    }
    if (offers.size === 0 && lowered === 0) break;
    // Each player takes his best offer if it is worth his ask ("offers": once the teams have bid).
    for (const [id, list] of offers) {
      const asMade = [...list].sort((a, b) => b.worth - a.worth)[0]!;
      const top = offersPrice ? winningBid(byId.get(id)!, list, asks.get(id)!) ?? asMade : asMade;
      for (const o of list) if (o.team !== top.team || top.worth < 1) turnedDown.add(`${String(o.team)}|${id}`);
      if (top.worth < 1) continue;
      const p = byId.get(id)!;
      if (top.cut) {
        const r = releasePlayer(book.contracts[top.cut.i]!, ctx.day);
        book.contracts[top.cut.i] = r.contract;
        book.dead.push(...r.charges);
        book.events.push(...r.events);
        released.push(top.cut.p.bio.id);
        const gone = String(top.cut.p.bio.id);
        teams = teams.map((t) => (t.id === top.team ? { ...t, roster: t.roster.filter((x) => String(x) !== gone) } : t));
      }
      book.contracts.push(top.contract);
      book.events.push(signedEvent(top.contract));
      signed.add(id);
      const from = ranOut.get(id);
      if (from !== undefined && from !== top.team && countsForComp(ctx.day)) {
        moves.push({ player: p.bio.id, from, to: top.team, apy: apyOf(top.contract), signedAt: ctx.day });
      }
      teams = teams.map((t) => (t.id === top.team ? withDepth({ ...t, roster: [...t.roster, p.bio.id] }, byId, config.rate) : t));
    }
    pool = pool.filter((p) => !signed.has(String(p.bio.id)));
  }
  // "offers", rule 4: a man still unsigned carries into his next market day the most a team that wanted
  // him today would have paid, when that is less than his ask. Only this league year's unsigned men keep one.
  const freeAgentAsks: NonNullable<LeaguePeople["freeAgentAsks"]> = [];
  if (offersPrice) {
    const next = new Map(carried);
    for (const id of new Set([...wantedAt.keys(), ...shortToday.keys()])) {
      if (signed.has(id)) continue;
      const most = Math.max(wantedAt.get(id) ?? 0, shortToday.get(id) ?? 0);
      if (most > 0 && most < asks.get(id)!) next.set(id, Math.floor(most / 1000) * 1000);
    }
    for (const p of pool) {
      const ask = next.get(String(p.bio.id));
      if (ask !== undefined) freeAgentAsks.push({ player: p.bio.id, season, ask });
    }
  }
  const asksMoved = offersPrice && JSON.stringify(freeAgentAsks) !== JSON.stringify(people.freeAgentAsks ?? []);
  if (signed.size === 0) return asksMoved ? { people: { ...people, freeAgentAsks }, events: [] } : undefined;
  return {
    people: {
      ...people, teams, players: placePlayers(people.players, teams), freeAgents: [...people.freeAgents.filter((id) => !signed.has(String(id))), ...released],
      contracts: book.contracts, deadMoney: book.dead, ...(moves.length > 0 ? { freeAgentMoves: moves } : {}),
      ...(offersPrice ? { freeAgentAsks } : {}),
    },
    events: book.events,
  };

  /**
   * "offers", rule 3: the teams that want the same man bid. An offer's worth to him is its money over
   * his ask times what the rest of it does for him (`rest`: winning, playing time, home, guarantees), so
   * at its team's limit an offer is worth `limit × rest / ask`. He goes to the offer worth most at its
   * limit, for the money that makes it worth as much as the next team's at that team's limit (and at
   * least his ask), never above the winner's limit: a team alone pays his ask, or raises toward its
   * limit when the rest of its offer leaves him short. Undefined when no raise is made (none is needed,
   * the leader cannot meet his ask even at its limit, needs a swap, or the raise would not fit its
   * room): then he weighs the offers as made.
   */
  function winningBid(p: PlayerState, list: readonly MarketOffer[], ask: number): MarketOffer | undefined {
    const rest = (o: MarketOffer) => o.worth * ask / Math.max(1, apyOf(o.contract));
    const atLimit = (o: MarketOffer) => o.limit * rest(o) / Math.max(1, ask);
    const ranked = [...list].sort((a, b) => atLimit(b) - atLimit(a) || b.worth - a.worth);
    const lead = ranked[0]!;
    if (atLimit(lead) < 1 || lead.cut) return undefined;
    const next = ranked.length >= 2 ? atLimit(ranked[1]!) : 0;
    const price = Math.min(lead.limit, Math.ceil(ask * Math.max(1, next) / Math.max(1e-9, rest(lead)) / 1000) * 1000);
    if (price <= apyOf(lead.contract)) return undefined;
    const raised = buildOffer(p, lead.team, season, ctx.day, price, lead.contract.years.filter((y) => !y.voidYear).length, seasonsIn(p, season), config.cap, "VETERAN");
    if (capNumber(raised.years[0]!) > lead.room) return undefined;
    return { ...lead, contract: raised, worth: offerWorth(p, { ...lead.terms, apy: apyOf(raised), guaranteed: guaranteedShare(raised) }, ask) };
  }
}

/** A team's offer to a man in a round of a market day, with what "offers" prices need to bid with. */
interface MarketOffer {
  team: TeamId;
  contract: PlayerContract;
  /** Its worth to him, in units of his ask (`offerWorth`). */
  worth: number;
  /** The rest of the offer, beside the money and guarantees. */
  terms: { winShare: number; starts: boolean; ownTeam: boolean };
  /** The most the team would pay him a year: its value of him, need counted. */
  limit: number;
  /** The team's cap room for him this year. */
  room: number;
  /** The teammate a swap lets go to make room. */
  cut?: { i: number; p: PlayerState };
}

function shuffled<T>(xs: readonly T[], seed: string, label: string): T[] {
  const rng = createRng(seed, label);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
