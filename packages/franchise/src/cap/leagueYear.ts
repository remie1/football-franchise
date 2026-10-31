/**
 * ADR-085 §4: the league year as day steps in the season's walk (ADR-086 §2).
 *
 *   OFF_EVAL week 2 day 1       the cap for next season is set (CAP_SET)
 *   OFF_EVAL week 3 day 1       teams re-sign their own players, tender restricted free agents, tag one
 *   OFF_RESET_FA week 1 day 1   the new league year: deals run out, every team gets under the cap
 *   OFF_RESET_FA week 1 day 2   free agency opens (premium window), then the value window from week 2,
 *   to cut-down day             then the bargain basement from the draft on, the asking prices falling
 *
 * Computer teams decide everything here. A human team's choices arrive with the screens for them
 * (Iron Rule 6: re-signing, tags, cuts and signings are GM decisions).
 *
 * Constants are CHOSEN (provenance NONE) unless a comment says otherwise.
 */
import {
  compareStamps, createRng, DEFAULT_LEAGUE_RULES,
  type CalendarStamp, type DeadMoneyCharge, type FranchiseEvent, type LeagueRules, type PlayerContract, type PlayerState, type Position,
  type SeasonState, type Team, type TeamId,
} from "@ff/contracts";
import { isDay, type DayStep, type DayStepContext, type LeaguePeople } from "../season/people.js";
import { BOARD_ERROR, POSITION_VALUE, STARTERS, WANTED, needAt, type Rate } from "../draft/board.js";
import { seasonsIn } from "../draft/cutdown.js";
import { DRAFT_DAYS } from "../draft/steps.js";
import { capNumber, expireContract, liveIn, releasePlayer, restructure, teamCapTotal } from "./money.js";
import { BASE_CAP, RFA_SEASONS, type TenderLevel } from "./rules.js";
import { ROOKIE_SCALE_2026 } from "./rookieScale2026.js";
import { minimumContract, minimumSalary, tagContract, tagPrice, tenderPrice } from "./signings.js";
import { ageFactor, apyOf, guaranteedShare, marketCurves, structureFor, valuePlayer, veteranContract, type MarketCurves } from "./value.js";
import { askingPrice, offerWorth, type MarketWindow } from "./negotiation.js";

export type CapForSeason = (season: number) => number;

export const LEAGUE_YEAR_DAYS = {
  capSet: { phase: "OFF_EVAL", week: 2, day: 1 },
  reSign: { phase: "OFF_EVAL", week: 3, day: 1 },
  newYear: { phase: "OFF_RESET_FA", week: 1, day: 1 },
  postDraft: { phase: "OFF_DRAFT", week: 4, day: 1 },
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
  rounds: 3,
  /** Kept free for in-season moves (dollars). The draft class's room is estimated from the picks held. */
  inSeasonBuffer: 3_000_000,
  /** Seats kept on the 90 for the draft's picks before it is made. */
  draftSeats: 9,
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
   * The new league year: teams restructure to have room for their draft class, the in-season buffer
   * and this much for free agency (real teams clear space in February and March).
   */
  freeAgencyRoom: 15_000_000,
  /** A cap casualty: a veteran worth less than this share of his cap number this year, when cutting him saves money. */
  casualtyShare: 0.5,
  /** ...and saves at least this much (dollars). */
  casualtySaving: 2_000_000,
} as const;

export interface LeagueYearConfig {
  rate: Rate;
  cap: CapForSeason;
  /** A team's evaluator skill, 0..100 (default 50). */
  scouting?: (team: TeamId, people: LeaguePeople) => number;
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

/** The cap room a team has for a season, keeping `reserve` free. `carry` is what it brings into that season. */
function roomFor(team: TeamId, season: number, book: Book, cap: CapForSeason, reserve: number, carry: number): number {
  return cap(season) + carry - teamCapTotal(team, season, book.contracts, book.dead, { top51: true }).total - reserve;
}

/**
 * Room to keep for a team's coming draft class: its picks' first-year cap numbers, estimated at each
 * round's average slot of the rookie scale (a quarter of the deal, grown with the cap). Untraded
 * picks are not listed in `people.picks`, so a team holds its own unless someone else does.
 */
export function rookieReserve(team: TeamId, draft: number, people: LeaguePeople, rules: LeagueRules, cap: CapForSeason): number {
  const rounds = rules.draft?.rounds ?? DEFAULT_LEAGUE_RULES.draft?.rounds ?? 7;
  const listed = people.picks.filter((p) => p.draft === draft);
  let total = 0;
  for (let r = 1; r <= rounds; r++) {
    const tradedAway = listed.some((p) => p.round === r && p.originalTeam === team && p.owner !== team);
    const held = (tradedAway ? 0 : 1) + listed.filter((p) => p.round === r && p.owner === team && p.originalTeam !== team).length;
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

export function leagueYearSteps(config: LeagueYearConfig): DayStep[] {
  const skillOf = (t: TeamId, people: LeaguePeople) => config.scouting?.(t, people) ?? 50;
  return [
    {
      id: "cap-set",
      run: (people, ctx) => {
        if (!isDay(ctx.day, LEAGUE_YEAR_DAYS.capSet)) return undefined;
        return { people, events: [{ type: "CAP_SET", payload: { season: ctx.season + 1, cap: config.cap(ctx.season + 1) } }] };
      },
    },
    {
      id: "re-sign",
      run: (people, ctx) => (isDay(ctx.day, LEAGUE_YEAR_DAYS.reSign) ? reSign(people, ctx, config, skillOf) : undefined),
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
  ];
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

// ---------- re-signing, tenders and tags (OFF_EVAL) ----------

function reSign(
  people: LeaguePeople, ctx: DayStepContext, config: LeagueYearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number,
): { people: LeaguePeople; events: FranchiseEvent[] } {
  const next = ctx.season + 1;
  const book: Book = { contracts: [...(people.contracts ?? [])], dead: [...(people.deadMoney ?? [])], events: [] };
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const curves = marketCurves(book.contracts, people.players, next, config.rate);
  const at = ctx.day;
  const reserveFor = (t: TeamId) => rookieReserve(t, next, people, ctx.rules, config.cap) + MARKET.inSeasonBuffer;
  for (const team of people.teams) {
    // Before the new league year the carryover is not set: the team counts on the room it has now.
    const carry = unusedRoom(team.id, ctx.season, people, book, config.cap);
    const skill = skillOf(team.id, people);
    const roster = playersOf(team, byId);
    const grade = (p: PlayerState) => teamGrade(team.id, p, skill, config.rate, ctx.seed, ctx.season);
    const kept = roster.filter((p) => !book.contracts.some((c) => String(c.player) === String(p.bio.id) && endsAfter(c, ctx.season)));
    const expiring = roster.filter((p) => !kept.includes(p) && !hasDealIn(book.contracts, String(p.bio.id), next))
      .map((p) => ({ p, g: grade(p) })).sort((a, b) => b.g * POSITION_VALUE[b.p.bio.position] - a.g * POSITION_VALUE[a.p.bio.position]);
    const gradesAt = (pos: Position) => kept.filter((k) => k.bio.position === pos).map(grade);
    const declined: { p: PlayerState; g: number; percentile: number; prior: number }[] = [];
    for (const { p, g } of expiring) {
      const pos = p.bio.position;
      if (!makesTheRoster(g, pos, gradesAt(pos))) continue;
      const cs = seasonsIn(p, next);
      const room = roomFor(team.id, next, book, config.cap, reserveFor(team.id), carry);
      let contract: PlayerContract | undefined;
      if (cs < RFA_SEASONS) {
        // Exclusive-rights: a one-year minimum tender he must take.
        contract = { ...minimumContract({ player: p.bio.id, team: team.id, season: next, signedAt: at, creditedSeasons: cs, years: 1, capForSeason: config.cap }), kind: "ERFA_TENDER" };
      } else if (cs === RFA_SEASONS) {
        const v = valuePlayer(p, g, curves, minimumSalary(next, cs, config.cap));
        const prior = capNumber(book.contracts.find((c) => String(c.player) === String(p.bio.id) && endsAfter(c, ctx.season))!.years.find((y) => y.season === ctx.season) ?? { season: 0, baseSalary: 0, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: 0 });
        const levels: TenderLevel[] = ["FIRST_ROUND", "SECOND_ROUND", "ORIGINAL_ROUND", "RIGHT_OF_FIRST_REFUSAL"];
        const level = levels.find((l) => tenderPrice(l, config.cap(next), prior) <= v.apy) ?? "RIGHT_OF_FIRST_REFUSAL";
        const price = tenderPrice(level, config.cap(next), prior);
        if (price <= room) contract = oneYear(p, team.id, next, at, price, "RFA_TENDER");
      } else {
        const v = valuePlayer(p, g, curves, minimumSalary(next, cs, config.cap));
        const offer = buildOffer(p, team.id, next, at, v.apy, v.years, v.percentile, cs, config.cap, "EXTENSION");
        if (capNumber(offer.years[0]!) <= room) {
          const ask = askingPrice(p, valuePlayer(p, config.rate(p), curves, minimumSalary(next, cs, config.cap)).apy, "PREMIUM", 0, minimumSalary(next, cs, config.cap), ctx.seed, ctx.season);
          const worth = offerWorth(p, {
            apy: v.apy, guaranteed: guaranteedShare(offer), winShare: winShareOf(team.id, ctx.state),
            starts: wouldStart(g, pos, gradesAt(pos)), ownTeam: true,
          }, ask);
          if (worth >= 1) contract = offer;
        }
        if (!contract) {
          const prior = book.contracts.find((c) => String(c.player) === String(p.bio.id) && endsAfter(c, ctx.season));
          declined.push({ p, g, percentile: v.percentile, prior: prior ? capNumber(prior.years.find((y) => y.season === ctx.season) ?? prior.years.at(-1)!) : 0 });
        }
      }
      if (contract) {
        book.contracts.push(contract);
        book.events.push(signedEvent(contract));
        kept.push(p);
      }
    }
    // One franchise tag: the best player who said no, if he is a star and it fits.
    if (ctx.rules.franchiseTagEnabled) {
      const star = declined.find((d) => d.percentile >= MARKET.tagPercentile);
      if (star) {
        const price = tagPrice(star.p.bio.position, "FRANCHISE_TAG", config.cap(next), star.prior);
        if (price <= roomFor(team.id, next, book, config.cap, reserveFor(team.id), carry)) {
          const c = tagContract({ player: star.p.bio.id, team: team.id, season: next, signedAt: at, position: star.p.bio.position, kind: "FRANCHISE_TAG", cap: config.cap(next), priorSalary: star.prior });
          book.contracts.push(c);
          book.events.push({ type: "TAG_APPLIED", payload: { player: star.p.bio.id, tagType: "FRANCHISE_TAG" } }, signedEvent(c));
        }
      }
    }
  }
  return { people: { ...people, contracts: book.contracts, deadMoney: book.dead }, events: book.events };
}

function oneYear(p: PlayerState, team: TeamId, season: number, at: CalendarStamp, price: number, kind: PlayerContract["kind"]): PlayerContract {
  return {
    player: p.bio.id, team, signedAt: at, ...(kind ? { kind } : {}),
    years: [{ season, baseSalary: price, signingBonusProration: 0, guarantees: { fullyGuaranteed: false }, capHit: price }],
  };
}

function buildOffer(
  p: PlayerState, team: TeamId, season: number, at: CalendarStamp, apy: number, years: number, percentile: number,
  cs: number, cap: CapForSeason, kind: "VETERAN" | "EXTENSION",
): PlayerContract {
  const s = structureFor(percentile);
  return veteranContract({
    player: p.bio.id, team, season, signedAt: at, apy, years, bonusShare: s.bonusShare, guaranteedYears: s.guaranteedYears,
    minimum: (i) => minimumSalary(season + i, cs + i, cap), kind,
  });
}

// ---------- the new league year (OFF_RESET_FA week 1 day 1) ----------

function newLeagueYear(
  people: LeaguePeople, ctx: DayStepContext, config: LeagueYearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number,
): { people: LeaguePeople; events: FranchiseEvent[] } {
  const year = ctx.season + 1;
  const book: Book = { contracts: [...(people.contracts ?? [])], dead: [...(people.deadMoney ?? [])], events: [] };
  // Each team carries the room it did not use last league year into this one.
  const capCarryover = [
    ...(people.capCarryover ?? []).filter((c) => c.season === ctx.season),
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
  const curves = marketCurves(book.contracts, people.players, year, config.rate);
  teams = teams.map((t) => getUnderCap(t, year, ctx, book, byId, freeAgents, config, skillOf(t.id, people), true, carried, {
    want: rookieReserve(t.id, year, people, ctx.rules, config.cap) + MARKET.inSeasonBuffer + MARKET.freeAgencyRoom, curves,
  }));
  return {
    people: { ...people, capCarryover, teams, players: placePlayers(people.players, teams), freeAgents: freeAgents.filter((id, i) => freeAgents.findIndex((x) => String(x) === String(id)) === i), contracts: book.contracts, deadMoney: book.dead },
    events: book.events,
  };
}

const yearBase = (c: PlayerContract, season: number): number => c.years.find((y) => y.season === season)?.baseSalary ?? 0;

/**
 * Get one team under the cap for `year` (Q7 a, a hard cap): restructure the biggest deals first
 * (base salary above his minimum turned into bonus), then cut whoever saves the most per point of
 * value. Cut players go to `freeAgents`. `top51`: the offseason count.
 */
function getUnderCap(
  t: Team, year: number, ctx: DayStepContext, book: Book, byId: ReadonlyMap<string, PlayerState>, freeAgents: PlayerState["bio"]["id"][],
  config: LeagueYearConfig, skill: number, top51: boolean, carried: Pick<LeaguePeople, "capCarryover">,
  /** The new league year: room wanted beyond the cap, and the market to judge who is overpaid. */
  newYear?: { want: number; curves: MarketCurves },
): Team {
  const grade = (p: PlayerState) => teamGrade(t.id, p, skill, config.rate, ctx.seed, ctx.season);
  const capNow = adjustedCap(t.id, year, carried, config.cap);
  const room = () => capNow - teamCapTotal(t.id, year, book.contracts, book.dead, { top51 }).total;
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
  if (newYear) {
    // Cap casualties: veterans past their prime paid far more than the market would pay them now.
    for (const { c, i } of live()) {
      const p = byId.get(String(c.player));
      if (!p || ageFactor(p.bio.age, p.bio.position) >= 1 || !spare(p, countAt())) continue;
      const hit = capNumber(c.years.find((y) => y.season === year)!);
      const worth = valuePlayer(p, grade(p), newYear.curves, minimumSalary(year, seasonsIn(p, year), config.cap)).apy;
      if (worth >= MARKET.casualtyShare * hit) continue;
      const r = releasePlayer(c, ctx.day);
      if (saving(c, r) < MARKET.casualtySaving) continue;
      release(i, p, r);
    }
  }
  const want = newYear?.want ?? 0;
  let over = want - room();
  for (const { c, i } of live().sort((a, b) => yearBase(b.c, year) - yearBase(a.c, year))) {
    if (over <= 0) break;
    const p = byId.get(String(c.player));
    const left = c.years.filter((y) => y.season >= year && !y.voidYear).length;
    if (!p || left < 2) continue;
    const floor = minimumSalary(year, seasonsIn(p, year), config.cap);
    const amount = Math.min(yearBase(c, year) - floor, Math.ceil(over * left / (left - 1) / 1000) * 1000);
    if (amount < 1_000_000) continue;
    const r = restructure(c, year, amount, { floor });
    book.contracts[i] = r.contract;
    book.events.push(...r.events);
    over = want - room();
  }
  // Then cuts, only as far as the cap itself: any deal on the books may go, but never a position's last men.
  over = -room();
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
  people: LeaguePeople, ctx: DayStepContext, config: LeagueYearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number,
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
      let roster = [...t.roster];
      const pool = freeAgents.map((id) => byId.get(String(id))).filter((p): p is PlayerState => !!p && !taken.has(String(p.bio.id)));
      // First every hole: a position with fewer than its starters (at least one) gets the best free
      // agent there on a minimum deal; a full roster lets its most spare man go to make the seat.
      for (const pos of Object.keys(STARTERS) as Position[]) {
        const here = () => playersOf({ ...t, roster }, byId).filter((p) => p.bio.position === pos).length;
        while (here() < Math.max(1, STARTERS[pos])) {
          const pick = pool.filter((p) => p.bio.position === pos && !taken.has(String(p.bio.id))).sort((a, b) => config.rate(b) - config.rate(a))[0];
          if (!pick) break;
          if (roster.length >= fillTo) {
            const spare = mostSpare({ ...t, roster }, byId, config.rate, year, book);
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
          .sort((a, b) => (config.rate(b) + 10 * needAt(b.bio.position, here, config.rate)) - (config.rate(a) + 10 * needAt(a.bio.position, here, config.rate)))[0];
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

function freeAgency(
  people: LeaguePeople, ctx: DayStepContext, config: LeagueYearConfig, skillOf: (t: TeamId, p: LeaguePeople) => number,
  market: { window: MarketWindow; weeksIntoBargain: number },
): { people: LeaguePeople; events: FranchiseEvent[] } | undefined {
  if (people.freeAgents.length === 0) return undefined;
  // The deals being signed are for the league year the day falls in.
  const season = ctx.day.phase.startsWith("OFF_") ? ctx.season + 1 : ctx.season;
  const lastSeason = season - 1;
  const book: Book = { contracts: [...(people.contracts ?? [])], dead: [...(people.deadMoney ?? [])], events: [] };
  const byId = new Map(people.players.map((p) => [String(p.bio.id), p]));
  const curves: MarketCurves = marketCurves(book.contracts, people.players, season, config.rate);
  const limit = ctx.rules.offseasonRosterLimit ?? DEFAULT_LEAGUE_RULES.offseasonRosterLimit ?? 90;
  // Until the draft is made, a team keeps room and seats for its class.
  const beforeDraft = ctx.day.phase.startsWith("OFF_") && compareStamps(ctx.day, { ...DRAFT_DAYS.draft, season: ctx.day.season }) < 0;
  const reserve = (t: TeamId) => (beforeDraft ? rookieReserve(t, season, people, ctx.rules, config.cap) : 0) + MARKET.inSeasonBuffer;
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
  const asks = new Map(pool.map((p) => {
    const cs = seasonsIn(p, season);
    const floor = minimumSalary(season, cs, config.cap);
    return [String(p.bio.id), askingPrice(p, valuePlayer(p, config.rate(p), curves, floor).apy, market.window, market.weeksIntoBargain, floor, ctx.seed, season)];
  }));
  const signed = new Set<string>();
  for (let round = 0; round < MARKET.rounds && pool.length > 0; round++) {
    const offers = new Map<string, { team: TeamId; contract: PlayerContract; worth: number }[]>();
    const order = shuffled(teams.map((t) => t.id), ctx.seed, `fa/${String(ctx.day.phase)}/${ctx.day.week}/${ctx.day.day}/${round}`);
    for (const teamId of order) {
      const t = teams.find((x) => x.id === teamId)!;
      const seats = limit - t.roster.length - (beforeDraft ? MARKET.draftSeats : 0);
      if (seats <= 0) continue;
      const room = roomFor(t.id, season, book, config.cap, reserve(t.id), adjustedCap(t.id, season, people, config.cap) - config.cap(season));
      if (room <= 0) continue;
      const skill = skillOf(t.id, people);
      const grade = (p: PlayerState) => teamGrade(t.id, p, skill, config.rate, ctx.seed, season);
      const roster = playersOf(t, byId);
      const gradesHere = new Map<Position, number[]>();
      for (const r of roster) (gradesHere.get(r.bio.position) ?? gradesHere.set(r.bio.position, []).get(r.bio.position)!).push(grade(r));
      const needs = new Map<Position, number>();
      // His best target: the most valuable free agent he needs and can afford.
      let best: { p: PlayerState; contract: PlayerContract; score: number; starts: boolean } | undefined;
      for (const p of pool) {
        if (signed.has(String(p.bio.id))) continue;
        const pos = p.bio.position;
        const here = gradesHere.get(pos) ?? [];
        if (!needs.has(pos)) needs.set(pos, needAt(pos, roster, config.rate));
        const need = needs.get(pos)!;
        const g = grade(p);
        const upgrade = here.length < WANTED[pos] || wouldStart(g - MARKET.upgradeMargin, pos, here);
        if (!upgrade && need < 0.2) continue;
        const cs = seasonsIn(p, season);
        const floor = minimumSalary(season, cs, config.cap);
        const v = valuePlayer(p, g, curves, floor);
        const apy = Math.max(floor, Math.round(v.apy * (MARKET.offerBase + MARKET.offerNeed * need) / 1000) * 1000);
        const contract = buildOffer(p, t.id, season, ctx.day, apy, v.years, v.percentile, cs, config.cap, "VETERAN");
        if (capNumber(contract.years[0]!) > room) continue;
        // A hole (fewer than the position's starters, at least one) comes before any upgrade.
        const hole = here.length < Math.max(1, STARTERS[pos]) ? HOLE_FIRST : 0;
        const score = hole + (g - 50) * POSITION_VALUE[pos] * (1 + need);
        if (!best || score > best.score) best = { p, contract, score, starts: wouldStart(g, pos, here) };
      }
      if (!best) continue;
      const worth = offerWorth(best.p, {
        apy: apyOf(best.contract), guaranteed: guaranteedShare(best.contract), winShare: winShareOf(t.id, ctx.state),
        starts: best.starts,
        ownTeam: lastTeam.get(String(best.p.bio.id)) === t.id,
      }, asks.get(String(best.p.bio.id))!);
      const list = offers.get(String(best.p.bio.id)) ?? [];
      list.push({ team: t.id, contract: best.contract, worth });
      offers.set(String(best.p.bio.id), list);
    }
    if (offers.size === 0) break;
    // Each player takes his best offer if it is worth his ask.
    for (const [id, list] of offers) {
      const top = [...list].sort((a, b) => b.worth - a.worth)[0]!;
      if (top.worth < 1) continue;
      const p = byId.get(id)!;
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
  if (signed.size === 0) return undefined;
  return {
    people: {
      ...people, teams, players: placePlayers(people.players, teams), freeAgents: people.freeAgents.filter((id) => !signed.has(String(id))),
      contracts: book.contracts, deadMoney: book.dead, ...(moves.length > 0 ? { freeAgentMoves: moves } : {}),
    },
    events: book.events,
  };
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
