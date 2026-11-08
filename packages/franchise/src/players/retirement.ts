/**
 * Retiring by his own choice (ADR-087 §12.4; step AB8), played with `retirement: "choice"` on top of
 * the unsigned rule (§6.1, `unsigned.ts`, unchanged). The default, `"unsigned"`, is today's rule, and
 * nothing here runs on it. It acts with either players' switch on (§12.1): its injury input reads
 * neutral with injuries off (no injuries), and its rating-fall input with development off (ratings
 * do not move).
 *
 * - **The owner's rule (R1).** Nothing here reads a man's listed position, its group or its side.
 *   Every input is his own record: his age, his public injury report, his true ratings judged at the
 *   profile his team charted him at (or his best), his credited seasons, his starts by the chart key
 *   that listed him, and his deals. A test greps this file.
 * - **The three moments** (§12.4.2, `OWN_MOMENTS`): IMMEDIATE (OFF_EVAL week 1 day 7, after the
 *   season is credited and before the cap is set and teams re-sign), SLOW (OFF_RESET_FA week 1 day 2,
 *   the day after the new league year, before the first free-agent signing: the players' steps run
 *   before the league year's) and LATE (training camp week 1 day 1, before the unsigned rule's own
 *   LATE moment). Their shares (0.5 / 0.25 / 0.25, CHOSEN) split one yearly chance `p`: at moment k
 *   the chance is 1 - (1 - p)^share_k, so the three together give `p`.
 * - **The yearly chance** (§12.4.3, `retirementChance`): logit p = a(age) + the terms, with a floor;
 *   the start values are `RETIREMENT_CHANCE` (GUESS, but a(age), REAL). The year a moment belongs to
 *   (`reviewSeason`) is the regular season that ended before it: IMMEDIATE and SLOW in its own
 *   calendar season, LATE the season before.
 * - **The review** (`reviewOf`), at each IMMEDIATE moment: his overall at the profile his team charted
 *   him at most that regular season (`PlayerMemory.starts`), else his best profile, kept in
 *   `PlayerMemory.lastReview` with the fall since the review before, judged at that review's profile
 *   (the same profile both years). It reads TRUE ratings (`overallWithCarryAt`): this is NEW-1's term
 *   (§12.10), whose reader line in contracts `players.ts` (`TrueAttributes`) is still pending the
 *   owner's typed yes and lands before AB8 merges.
 * - **The draws** come from `createRng(seed, "franchise:retirement").fork("retire/<season>/<timing>")`
 *   and then a fork by player id, so they do not depend on the order men are listed in.
 * - **Who goes, and how** (`ownRetirements`): a signed man (on a team: its 53, practice squad or
 *   reserve) has his money booked through `draft/money.ts` `retire()` and is taken off his team's
 *   roster, depth chart, practice squad and reserve; a free agent leaves `freeAgents`. Either way he
 *   leaves `players` and the steps' memory (`forget`), and `PLAYER_RETIRED { reason: "OWN_CHOICE",
 *   timing, team }` is the record (`team` absent for a free agent). Prospects never retire here.
 *
 * Pure: same inputs, same output.
 */
import {
  compareStamps, createRng,
  type CalendarStamp, type DeadMoneyCharge, type FranchiseEvent, type GameParticipation, type InjuryBand, type LeagueRules,
  type PlayerContract, type PlayerId, type PlayerState, type Position, type Team, type TeamId,
} from "@ff/contracts";
import { transactionYear } from "../cap/money.js";
import { seasonsIn } from "../draft/cutdown.js";
import { retire, type CapForSeason } from "../draft/money.js";
import type { LeaguePeople } from "../season/people.js";
import { SPOT_ORDER, chartSpots, weekSide } from "./aging.js";
import { overallWithCarryAt } from "./development.js";
import { emptyMemory, type PastInjury, type PlayerMemory, type RetirementReview, type SeasonStarts } from "./types.js";
import { forget } from "./unsigned.js";

// ---------------------------------------------------------------------------------------------
// The option.
// ---------------------------------------------------------------------------------------------

/** ADR-087 §12.1: how players retire. `"unsigned"` (the default) is today's rule; `"choice"` adds §12.4. */
export type RetirementRule = "unsigned" | "choice";
const RETIREMENT_RULES: readonly RetirementRule[] = ["unsigned", "choice"];

/** The rule an option names: absent is `"unsigned"`; a value the option does not take throws. */
export function retirementRule(value: RetirementRule | undefined): RetirementRule {
  if (value !== undefined && !RETIREMENT_RULES.includes(value)) throw new RangeError(`retirement is "unsigned" or "choice", not ${JSON.stringify(value)}`);
  return value ?? "unsigned";
}

// ---------------------------------------------------------------------------------------------
// The three moments (§12.4.2).
// ---------------------------------------------------------------------------------------------

export type OwnTiming = "IMMEDIATE" | "SLOW" | "LATE";

/** When each moment falls in the franchise calendar, and its share of the year's chance (CHOSEN). */
export const OWN_MOMENTS: Readonly<Record<OwnTiming, { readonly phase: CalendarStamp["phase"]; readonly week: number; readonly day: number; readonly share: number }>> = {
  IMMEDIATE: { phase: "OFF_EVAL", week: 1, day: 7, share: 0.5 },
  SLOW: { phase: "OFF_RESET_FA", week: 1, day: 2, share: 0.25 },
  LATE: { phase: "TRAINING_CAMP", week: 1, day: 1, share: 0.25 },
};
const TIMINGS: readonly OwnTiming[] = ["IMMEDIATE", "SLOW", "LATE"];

/** Which own-choice moment today is, if any. */
export function ownMoment(at: CalendarStamp): OwnTiming | undefined {
  return TIMINGS.find((t) => {
    const m = OWN_MOMENTS[t];
    return at.phase === m.phase && at.week === m.week && at.day === m.day;
  });
}

/**
 * The year a moment decides on: the regular season that ended before it (IMMEDIATE and SLOW fall in
 * that season's own calendar year, LATE in the next one's camp).
 */
export function reviewSeason(at: CalendarStamp, timing: OwnTiming): number {
  return timing === "LATE" ? at.season - 1 : at.season;
}

/** One moment's chance from the yearly chance: 1 - (1 - p)^share. */
export function momentChance(yearly: number, timing: OwnTiming): number {
  return 1 - (1 - yearly) ** OWN_MOMENTS[timing].share;
}

// ---------------------------------------------------------------------------------------------
// The chance model (§12.4.3).
// ---------------------------------------------------------------------------------------------

/** The chance model's values (§12.4.3): its age table, its terms and its floor. */
export interface RetirementChanceModel {
  /** a(age): yearly rates by age band, youngest first (`upTo` the band's oldest age; `null` the oldest band). */
  readonly byAge: readonly { readonly label: string; readonly upTo: number | null; readonly rate: number }[];
  readonly longInjury: number;
  readonly ratingFall: number;
  readonly yearsFrom: number;
  readonly years: number;
  readonly lostJob: number;
  readonly moneyAhead: number;
  readonly floor: number;
}

/**
 * The start values. Tuning sets them (GUESS), on `retired-signed` alone (§12.4.5; the owner's Q6:
 * the real retired-list rates as they are, no allowance above the list).
 */
export const RETIREMENT_CHANCE: RetirementChanceModel = {
  /**
   * a(age): the logit of these yearly rates by age band (`upTo` the band's oldest age; `null` the
   * oldest band). REAL, a lower bound: men placed on the NFL's reserve/retired list within a year of
   * a final-week 53, 2021-24 (25 and under 0.20%, 26-28 0.50%, 29-30 1.28%, 31-32 2.32%, 33 and over 2.95%).
   */
  byAge: [
    { label: "25 and under", upTo: 25, rate: 0.002 },
    { label: "26-28", upTo: 28, rate: 0.005 },
    { label: "29-30", upTo: 30, rate: 0.0128 },
    { label: "31-32", upTo: 32, rate: 0.0232 },
    { label: "33 and over", upTo: null, rate: 0.0295 },
  ],
  /** + this with a LONG or MAJOR injury this league year (public, as on his injury report). GUESS. */
  longInjury: 0.7,
  /** + this a point of overall lost since his last review, at the same profile (true ratings: NEW-1). GUESS. */
  ratingFall: 0.15,
  /** + `years` a credited season past `yearsFrom`. GUESS. */
  yearsFrom: 6,
  years: 0.15,
  /** + this when he started the season before and did not this season. GUESS. */
  lostJob: 0.6,
  /** − this × the cash still owed on his deals ÷ the cap (signed men only). GUESS. */
  moneyAhead: 4,
  /** The yearly chance never falls below this: a young man may leave out of nowhere. GUESS. */
  floor: 0.0005,
};

/** A starter: half his side's snaps or more over the season (CHOSEN, as the career check's reader reads one). */
export const STARTER_SHARE = 0.5;

/** One man's inputs to the yearly chance, each from his own record (never his listed position). */
export interface RetirementInputs {
  /** His age (`bio.age`). */
  readonly age: number;
  /** He had a LONG or MAJOR injury this league year (his public injury report and history). */
  readonly longInjury: boolean;
  /** Points of overall lost since his last review, at that review's profile (true ratings: NEW-1); 0 or more. */
  readonly ratingFall: number;
  /** His credited seasons. */
  readonly credited: number;
  /** He started the season before the year reviewed and did not start it. */
  readonly lostJob: boolean;
  /** The cash still owed on his deals with his team ÷ the cap; 0 for a free agent. */
  readonly owed: number;
}

/** The yearly rate a(age) is the logit of: his age band's. */
export function ageRate(age: number, c: RetirementChanceModel = RETIREMENT_CHANCE): number {
  return (c.byAge.find((b) => b.upTo === null || age <= b.upTo) ?? c.byAge[c.byAge.length - 1]!).rate;
}

const logit = (p: number) => Math.log(p / (1 - p));

/** The yearly chance he retires by his own choice (§12.4.3): logit p = a(age) + Σ terms, at least the floor. */
export function retirementChance(x: RetirementInputs, c: RetirementChanceModel = RETIREMENT_CHANCE): number {
  const z = logit(ageRate(x.age, c))
    + (x.longInjury ? c.longInjury : 0)
    + c.ratingFall * Math.max(0, x.ratingFall)
    + c.years * Math.max(0, x.credited - c.yearsFrom)
    + (x.lostJob ? c.lostJob : 0)
    - c.moneyAhead * Math.max(0, x.owed);
  return Math.max(c.floor, 1 / (1 + Math.exp(-z)));
}

/**
 * The tuning helper (§12.4.6 test 7): the mean yearly chance of a roster's men by age band
 * (`RETIREMENT_CHANCE.byAge`'s labels; a band with nobody in it is left out).
 */
export function chanceByAgeBand(men: readonly RetirementInputs[], c: RetirementChanceModel = RETIREMENT_CHANCE): Record<string, { n: number; mean: number }> {
  const sums = new Map<string, { n: number; sum: number }>();
  for (const m of men) {
    const band = (c.byAge.find((b) => b.upTo === null || m.age <= b.upTo) ?? c.byAge[c.byAge.length - 1]!).label;
    const s = sums.get(band) ?? { n: 0, sum: 0 };
    s.n++; s.sum += retirementChance(m, c);
    sums.set(band, s);
  }
  const out: Record<string, { n: number; mean: number }> = {};
  for (const b of c.byAge) { const s = sums.get(b.label); if (s) out[b.label] = { n: s.n, mean: s.sum / s.n }; }
  return out;
}

// ---------------------------------------------------------------------------------------------
// His record: starts, the review, injuries, money.
// ---------------------------------------------------------------------------------------------

/** Did he start (`STARTER_SHARE`) in this regular season, by his starts record? */
export function startedIn(rec: SeasonStarts | undefined, season: number): boolean {
  if (rec === undefined) return false;
  if (rec.season === season) return rec.sideSnaps > 0 && rec.snaps / rec.sideSnaps >= STARTER_SHARE;
  return rec.started.includes(season);
}

/** His record carried into `season`: the season before closed into `started` (the one before `season` kept). */
function rolled(rec: SeasonStarts | undefined, season: number): SeasonStarts {
  if (rec === undefined) return { season, snaps: 0, sideSnaps: 0, charted: {}, started: [] };
  if (rec.season >= season) return rec;
  const started = [...rec.started, ...(startedIn(rec, rec.season) ? [rec.season] : [])].filter((s) => s >= season - 1);
  return { season, snaps: 0, sideSnaps: 0, charted: {}, started };
}

/** The games a players' week step sees, as `DayStepContext.games` holds them. */
type DayGames = readonly { readonly game: { readonly home: TeamId; readonly away: TeamId }; readonly extras?: unknown }[];

/**
 * Count one regular-season day's games into the starts records (§12.4.3, "lost his job"): for each
 * team in a game, each man on its 53 takes his side from the chart key that lists him at the game
 * (the team's chart as it stands, before the week's rebuild), else from where most of his snaps came
 * (`aging.ts` `weekSide`), never his listed position; his snaps on that side, and that side's busiest
 * man's snaps for the team in the game, are added, and the key is counted for his review's profile. A
 * man on no key with no snap (out hurt, off the chart) counts nothing that game. Other days: unchanged.
 */
export function countStarts(memory: PlayerMemory, at: CalendarStamp, teams: readonly Team[], games: DayGames): PlayerMemory {
  if (at.phase !== "REGULAR_SEASON" || games.length === 0) return memory;
  const starts: Record<string, SeasonStarts> = { ...(memory.starts ?? {}) };
  const byTeam = new Map(teams.map((t) => [String(t.id), t]));
  for (const g of games) {
    const reports = ((g.extras as { participation?: readonly GameParticipation[] } | undefined)?.participation) ?? [];
    for (const teamId of [g.game.home, g.game.away]) {
      const team = byTeam.get(String(teamId));
      if (team === undefined) continue;
      const own = reports.filter((r) => String(r.team) === String(teamId));
      const busiest = { offense: 0, defense: 0, special: 0 };
      const mine = new Map<string, GameParticipation[]>();
      for (const r of own) {
        for (const side of ["offense", "defense", "special"] as const) busiest[side] = Math.max(busiest[side], r.snaps[side]);
        const list = mine.get(String(r.player));
        if (list === undefined) mine.set(String(r.player), [r]); else list.push(r);
      }
      const spots = chartSpots(team);
      for (const id of team.roster) {
        const key = spots.get(String(id));
        const his = mine.get(String(id)) ?? [];
        const side = weekSide(key, his);
        if (side === undefined) continue;
        const rec = rolled(starts[String(id)], at.season);
        const charted: Partial<Record<Position, number>> = {};
        for (const pos of SPOT_ORDER) {
          const n = (rec.charted[pos] ?? 0) + (pos === key ? 1 : 0);
          if (n > 0) charted[pos] = n;
        }
        starts[String(id)] = {
          season: rec.season,
          snaps: rec.snaps + his.reduce((n, r) => n + r.snaps[side], 0),
          sideSnaps: rec.sideSnaps + busiest[side],
          charted,
          started: rec.started,
        };
      }
    }
  }
  return { ...memory, starts };
}

/** The key his team charted him at most in this regular season (ties: the first in `SPOT_ORDER`), if any. */
export function mostCharted(rec: SeasonStarts | undefined, season: number): Position | undefined {
  if (rec === undefined || rec.season !== season) return undefined;
  let best: Position | undefined, most = 0;
  for (const pos of SPOT_ORDER) {
    const n = rec.charted[pos] ?? 0;
    if (n > most) { best = pos; most = n; }
  }
  return best;
}

/** His best profile: where his overall (carry counted) is highest (ties: the first in `SPOT_ORDER`). */
export function bestProfile(player: PlayerState): Position {
  let best: Position = SPOT_ORDER[0]!, top = -Infinity;
  for (const pos of SPOT_ORDER) {
    const v = overallWithCarryAt(player, pos);
    if (v > top) { best = pos; top = v; }
  }
  return best;
}

/**
 * His review for the year `season` (§12.4.3), taken at the IMMEDIATE moment: the profile his team
 * charted him at most that regular season, else his best; his overall there; and the fall since the
 * review before (`last`, of the season before), judged at that review's profile, so the same profile
 * is used both years; 0 with no review the season before. TRUE ratings (NEW-1, pending).
 */
export function reviewOf(player: PlayerState, season: number, starts: SeasonStarts | undefined, last: RetirementReview | undefined): RetirementReview {
  const profile = mostCharted(starts, season) ?? bestProfile(player);
  const fall = last !== undefined && last.season === season - 1 ? Math.max(0, last.overall - overallWithCarryAt(player, last.profile)) : 0;
  return { season, profile, overall: overallWithCarryAt(player, profile), fall };
}

/** A LONG or MAJOR injury dated in [from, to] (public: his injury report and history). */
function longInjurySince(history: readonly PastInjury[] | undefined, current: PlayerState["condition"]["injury"], from: CalendarStamp, to: CalendarStamp): boolean {
  const long = (band: InjuryBand) => band === "LONG" || band === "MAJOR";
  const inside = (s: CalendarStamp) => compareStamps(s, from) >= 0 && compareStamps(s, to) <= 0;
  if (current !== undefined && long(current.band) && inside(current.since)) return true;
  return (history ?? []).some((h) => long(h.band) && inside(h.at));
}

/**
 * The cash still owed on his deals with `team` from the league year `at` counts in (`transactionYear`):
 * each open deal's real years from then on, base salary and roster, workout and per-game bonuses
 * (CHOSEN: the whole year's; the signing bonus was paid when he signed).
 */
export function cashOwed(contracts: readonly PlayerContract[] | undefined, player: PlayerId, team: TeamId, at: CalendarStamp): number {
  const year = transactionYear(at);
  let owed = 0;
  for (const c of contracts ?? []) {
    if (c.ended || String(c.player) !== String(player) || String(c.team) !== String(team)) continue;
    for (const y of c.years) {
      if (y.season < year || y.voidYear) continue;
      owed += y.baseSalary + (y.rosterBonus ?? 0) + (y.workoutBonus ?? 0) + (y.perGameRosterBonus ?? 0);
    }
  }
  return owed;
}

/** One man's inputs at a moment, every one from his own record (§12.4.3). */
export function retirementInputs(o: {
  readonly player: PlayerState; readonly memory: PlayerMemory; readonly at: CalendarStamp; readonly season: number;
  readonly contracts?: readonly PlayerContract[]; readonly cap: CapForSeason;
}): RetirementInputs {
  const { player: p, memory, at, season } = o;
  const id = String(p.bio.id);
  // "This league year": from the opening of the league year of the season reviewed, up to today (CHOSEN).
  const from: CalendarStamp = { season: season - 1, phase: "OFF_RESET_FA", week: 1, day: 1 };
  const review = memory.lastReview?.[id];
  const starts = memory.starts?.[id];
  const owed = p.teamId === undefined ? 0 : cashOwed(o.contracts, p.bio.id, p.teamId, at) / o.cap(transactionYear(at));
  return {
    age: p.bio.age,
    longInjury: longInjurySince(memory.injuries[id], p.condition.injury, from, at),
    ratingFall: review !== undefined && review.season === season ? review.fall : 0,
    credited: seasonsIn(p, season),
    lostJob: startedIn(starts, season - 1) && !startedIn(starts, season),
    owed,
  };
}

// ---------------------------------------------------------------------------------------------
// The moments' step.
// ---------------------------------------------------------------------------------------------

/** The random stream the moments draw from (then `retire/<season>/<timing>`, then the player's id). */
export const RETIREMENT_STREAM = "franchise:retirement";

export interface OwnRetirementInput {
  readonly people: LeaguePeople;
  /** Today: one of the three moments (`ownMoment`). */
  readonly at: CalendarStamp;
  readonly timing: OwnTiming;
  readonly seed: string;
  readonly rules: LeagueRules;
  /** The cap by season, for money ahead (the league year's; `flatCap(rules)` when the walk has none). */
  readonly cap: CapForSeason;
  /** Test hook: the chance model's values. */
  readonly chance?: RetirementChanceModel;
}

export interface OwnRetirementResult {
  readonly people: LeaguePeople;
  readonly events: FranchiseEvent[];
  /** The dead money booked today (also in `people.deadMoney`). */
  readonly charges: DeadMoneyCharge[];
}

/**
 * One own-choice moment (§12.4.2-12.4.4). At IMMEDIATE every man is reviewed first (`reviewOf`, kept
 * in `PlayerMemory.lastReview`). Then each man not a prospect, on a team or a free agent, retires
 * with this moment's share of his yearly chance, drawn on his own fork. A signed man's money goes
 * through `retire()`; he leaves his team's lists; a free agent leaves `freeAgents`; everyone who goes
 * leaves `players` and the memory (`forget`). Events go in player-id order.
 */
export function ownRetirements(input: OwnRetirementInput): OwnRetirementResult {
  const { people, at, timing } = input;
  const season = reviewSeason(at, timing);
  const free = new Set(people.freeAgents.map(String));
  const candidates = people.players
    .filter((p) => p.bio.draft !== "PROSPECT" && (p.teamId !== undefined || free.has(String(p.bio.id))))
    .sort((a, b) => (String(a.bio.id) < String(b.bio.id) ? -1 : String(a.bio.id) > String(b.bio.id) ? 1 : 0));
  let memory: PlayerMemory = people.playerMemory ?? emptyMemory();
  if (timing === "IMMEDIATE") {
    const lastReview: Record<string, RetirementReview> = { ...(memory.lastReview ?? {}) };
    for (const p of candidates) {
      const id = String(p.bio.id);
      lastReview[id] = reviewOf(p, season, memory.starts?.[id], memory.lastReview?.[id]);
    }
    memory = { ...memory, lastReview };
  }
  const root = createRng(input.seed, RETIREMENT_STREAM).fork(`retire/${at.season}/${timing}`);
  const gone: PlayerState[] = [];
  for (const p of candidates) {
    const yearly = retirementChance(retirementInputs({
      player: p, memory, at, season, ...(people.contracts ? { contracts: people.contracts } : {}), cap: input.cap,
    }), input.chance);
    if (root.fork(String(p.bio.id)).next() < momentChance(yearly, timing)) gone.push(p);
  }
  if (gone.length === 0) {
    return { people: memory === people.playerMemory ? people : { ...people, playerMemory: memory }, events: [], charges: [] };
  }

  const ids = new Set(gone.map((p) => String(p.bio.id)));
  const book = people.contracts ? [...people.contracts] : undefined;
  const dead = people.contracts ? [...(people.deadMoney ?? [])] : undefined;
  const charges: DeadMoneyCharge[] = [];
  const events: FranchiseEvent[] = [];
  for (const p of gone) {
    const team = p.teamId;
    if (team !== undefined && book && dead) charges.push(...retire(book, dead, p.bio.id, team, at).charges);
    events.push({ type: "PLAYER_RETIRED", payload: { player: p.bio.id, timing, reason: "OWN_CHOICE", ...(team === undefined ? {} : { team }) } });
  }
  const keep = (list: readonly PlayerId[]) => list.filter((id) => !ids.has(String(id)));
  const touches = (list: readonly PlayerId[] | undefined) => list !== undefined && list.some((id) => ids.has(String(id)));
  const teams = people.teams.map((t) => {
    const chart = Object.values(t.depthChart).some((list) => touches(list));
    if (!touches(t.roster) && !touches(t.practiceSquad) && !touches(t.reserve) && !chart) return t;
    const depthChart: Team["depthChart"] = {};
    for (const [pos, list] of Object.entries(t.depthChart) as [Position, PlayerId[]][]) depthChart[pos] = keep(list);
    return {
      ...t, roster: keep(t.roster), depthChart,
      ...(t.practiceSquad ? { practiceSquad: keep(t.practiceSquad) } : {}),
      ...(t.reserve ? { reserve: keep(t.reserve) } : {}),
    };
  });
  return {
    people: {
      ...people,
      teams,
      players: people.players.filter((p) => !ids.has(String(p.bio.id))),
      freeAgents: keep(people.freeAgents),
      ...(book ? { contracts: book } : {}),
      ...(dead ? { deadMoney: dead } : {}),
      playerMemory: forget(memory, ids),
    },
    events,
    charges,
  };
}
