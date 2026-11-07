/**
 * Expected availability (ADR-087 §5; for the salary-cap thread's keep, cut and re-sign calls): how
 * many of the regular-season games ahead a player is expected to be fit for, worked out without a
 * single draw.
 *
 * It walks a Markov chain over "weeks still out", one calendar week at a time from `at` to the end
 * of the regular season ahead, with the injury step's own numbers in the injury step's own order
 * (`steps.ts`: on each week's last day, the game, then healing, then practice and away from
 * football):
 * - **The start** is his injury today (`condition.injury`): out for `weeksRemaining` weeks, or, when
 *   it is `playable`, fit (he plays hurt) but practicing half, as the real week reads him.
 * - **A game** (when his team has one and he is fit): the chance `gameInjuries` draws, 1 - exp(-rate),
 *   with rate = perSnap × `gameExposure` of a starter's or a backup's snaps × his group's game rate ×
 *   `riskFactor`.
 * - **Healing**, as `healWeek` counts it down: an injury drawn this week is not counted, and one at
 *   its last week heals at the week's end.
 * - **Practice** (with his team, in the phases it practices, playoffs left out as for a team that
 *   misses them): the chance `weekInjuries` draws at the phase's load × how much he practiced (1
 *   healthy, 0.5 playing hurt, 0 out, read at the week's start) × his group's practice rate ×
 *   `riskFactor`; **away from football**, every week, the flat chance (it reads no risk factor).
 * - **How long** a new injury lasts is the same mix the draw makes: each kind's weight for the
 *   setting and his group (`kindWeights`), then its weeks-lost buckets, each week in a bucket equally
 *   likely. 0 weeks is a day-to-day knock he plays through.
 * - **His risk factor** is `riskFactor` itself, with his true durability, his age (a year older when
 *   the walk enters camp) and a recent return: the chain carries the weeks since he was last healthy
 *   again (from `history`, then from its own heals, a day-to-day knock's included), as the real
 *   history does.
 *
 * Risk is read by his listed position's group (`POSITION_GROUP`), as `injuries.ts` reads it today.
 * The owner ruled on 2026-11-06 that injury risk will follow the depth-chart spot his team plays him
 * at; that is a later change, to both files together.
 *
 * Left out, as second order: a repeat injury's lasting cost to his durability (`lastingMark`), which
 * would raise his risk a few percent after a second injury of the same kind.
 *
 * His bye: the regular season's weeks without his game (`weeksPerSeason - gamesPerSeason`). With
 * one, as the schedule makes it, it falls in any week of `BYE_WINDOW` with the same chance (CHOSEN:
 * his team's bye is not an input), so `gamesLeft` is an expected count while his bye may still be
 * ahead; with none, every week has his game; any other shape spreads the games evenly over the
 * weeks, as `expectedOverallChange` does. The season is walked once, split by whether his bye is
 * still ahead, which gives the same answer as averaging over every bye week.
 *
 * He is walked as a man with a team all the way: a free agent or a prospect too, whom the real steps
 * leave alone (no practice, no games, a prospect not even healed) until he signs or is drafted.
 *
 * Pure and draw-free: no PRNG, the player and his history untouched; about a millisecond a call.
 * Nothing calls it in the game yet.
 */
import {
  CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, POSITION_GROUP,
  type CalendarStamp, type InjurySetting, type LeagueRules, type PlayerState, type PositionGroup,
} from "@ff/contracts";
import { phaseWeeks } from "../calendar/clock.js";
import { BYE_WINDOW } from "../schedule/buildSchedule.js";
import { EXPECTED_STARTER_SNAPS_PER_GAME, PRACTICE_PHASES } from "./development.js";
import { gameExposure, kindWeights, riskFactor, sameWeek, weekNumber } from "./injuries.js";
import { INJURY_KINDS, INJURY_RATES } from "./injuryTables.js";
import type { PastInjury } from "./types.js";

/**
 * A backup's snaps in a game he is fit for, for `expectedAvailability`'s game risk. CHOSEN: a
 * starter's `EXPECTED_STARTER_SNAPS_PER_GAME` (65) × 300 / 800, the made-up league's career snaps a
 * season for a team's second man at a position against its first (attributes' `CAREER_SNAPS
 * .perSeasonBySlot`, 800, 300 and 100): about 24. Counted as snaps from scrimmage, as a starter's
 * are (no special-teams weighting). `expectedOverallChange`'s backup plays none: there a backup's
 * snaps would only add to his smarts, here they are what can hurt him.
 */
export const EXPECTED_BACKUP_SNAPS_PER_GAME = 24;

export interface AvailabilityOptions {
  /**
   * Where the walk starts: its phase and week. The day is ignored: a week's game and injuries land on
   * its last day, so the week `at` falls in is walked whole, its game included.
   */
  readonly at: CalendarStamp;
  /**
   * A starter plays `EXPECTED_STARTER_SNAPS_PER_GAME` snaps in every game he is fit for; anyone else
   * `EXPECTED_BACKUP_SNAPS_PER_GAME`. Absent = a starter.
   */
  readonly starter?: boolean;
  readonly rules?: LeagueRules;
  /** His past injuries (his `PlayerMemory.injuries` entry), for the recent-return factor. Absent = none. */
  readonly history?: readonly PastInjury[];
}

export interface Availability {
  /**
   * The regular-season games left from `at`: the rest of this regular season, or, from the playoffs
   * on, all of the next one. An expected count while his bye may still be ahead.
   */
  readonly gamesLeft: number;
  /** How many of those games he is expected to be fit for (healthy, or playing hurt). */
  readonly expectedGames: number;
  /** `expectedGames / gamesLeft`; 1 when no game is left. */
  readonly shareAvailable: number;
  /** The chance he is fit for every one of them. */
  readonly chanceMissesNone: number;
}

const REGULAR = CALENDAR_PHASE_ORDER.indexOf("REGULAR_SEASON");
const RECENT_WEEKS = INJURY_RATES.recentReturn.weeks;
/** Recency slots: 0..RECENT_WEEKS weeks since he was last healthy again, and one for "not recent". */
const NOT_RECENT = RECENT_WEEKS + 1;
const SLOTS = RECENT_WEEKS + 2;

/** The most weeks any new injury can cost (the longest bucket of any kind). */
const LONGEST = Math.max(...Object.values(INJURY_KINDS).flatMap((k) => k.weeks.map((b) => b[1])));

/** P(a new injury costs k weeks), k = 0..LONGEST, for a setting and group: the draw's own mix. Undefined when nothing can be drawn. */
function weeksLost(setting: InjurySetting, group: PositionGroup): Float64Array | undefined {
  const kinds = kindWeights(setting, group);
  const total = kinds.reduce((n, [, w]) => n + w, 0);
  if (!(total > 0)) return undefined;
  const out = new Float64Array(LONGEST + 1);
  for (const [id, weight] of kinds) {
    const share = weight / total;
    const buckets = INJURY_KINDS[id]!.weeks;
    const bucketTotal = buckets.reduce((n, b) => n + b[2], 0);
    // `drawWeeks` gives 0 weeks when no bucket can be picked.
    if (!(bucketTotal > 0)) { out[0]! += share; continue; }
    for (const [min, max, w] of buckets) {
      const each = (share * w) / bucketTotal / (max - min + 1);
      for (let k = min; k <= max; k++) out[k]! += each;
    }
  }
  return out;
}

const WEEKS_LOST = new Map<string, Float64Array | undefined>();
function weeksLostCached(setting: InjurySetting, group: PositionGroup): Float64Array | undefined {
  const key = `${setting}/${group}`;
  if (!WEEKS_LOST.has(key)) WEEKS_LOST.set(key, weeksLost(setting, group));
  return WEEKS_LOST.get(key);
}

/** The draw's chance of an injury at this rate: 1 - exp(-rate), and none when no kind can be drawn. */
const chance = (rate: number, lost: Float64Array | undefined) => (lost && rate > 0 ? 1 - Math.exp(-rate) : 0);

/** One walked week: its last day and his age then. */
interface WalkWeek {
  readonly at: CalendarStamp;
  readonly age: number;
}

/** One week's chances, by recency (index 0 = not recent, 1 = recent) and, for practice, by how much he practiced. */
interface WeekRisk {
  readonly qGame: readonly [number, number];
  /** [healthy (practiced 1), playing hurt (0.5)][recency]. */
  readonly qPractice: readonly [readonly [number, number], readonly [number, number]];
  readonly qAway: number;
}

interface Lost {
  readonly game: Float64Array | undefined;
  readonly practice: Float64Array | undefined;
  readonly away: Float64Array | undefined;
}

/**
 * The chain's states: status × recency slot. Status 0 = healthy; 1..maxOut = playing hurt with that
 * many weeks still to count down; maxOut + r = out with r weeks still out. Recency slot = weeks since
 * he was last healthy again (0..RECENT_WEEKS), or NOT_RECENT.
 */
class Chain {
  readonly maxOut: number;
  readonly size: number;
  constructor(maxOut: number) {
    this.maxOut = maxOut;
    this.size = (2 * maxOut + 1) * SLOTS;
  }
  index(status: number, slot: number): number { return status * SLOTS + slot; }
  out(r: number): number { return this.maxOut + r; }
}

/**
 * One week of the chain into `into`, the chance of each state at the next week's start. `run` walks
 * one distribution through the week (several may run into the same `into`); `spread` then gives the
 * week's new injuries of a week or more their weeks out, summed by setting and recency slot so that a
 * week costs about the states plus three spreads.
 */
class WeekStep {
  private readonly fresh = { game: new Float64Array(SLOTS), practice: new Float64Array(SLOTS), away: new Float64Array(SLOTS) };
  private readonly knockGame: number;
  private readonly knockPractice: number;
  private readonly knockAway: number;
  constructor(
    private readonly chain: Chain, private readonly risk: WeekRisk, private readonly lost: Lost, private readonly into: Float64Array,
  ) {
    // The share of each setting's injuries that is a day-to-day knock he plays through.
    this.knockGame = lost.game?.[0] ?? 0;
    this.knockPractice = lost.practice?.[0] ?? 0;
    this.knockAway = lost.away?.[0] ?? 0;
  }

  private add(status: number, slot: number, p: number): void {
    if (p > 0) this.into[this.chain.index(status, slot)]! += p;
  }

  /**
   * Practice, then away from football, for a fit man (healthy or playing hurt after the heal), who
   * carries status `then` into next week if nothing new happens. `practice`: 0 full, 1 half, 2 none,
   * as read at the week's start; `back`: healthy again this week.
   */
  private practiceAndAway(p: number, then: number, back: boolean, practice: number, slot: number): void {
    if (!(p > 0)) return;
    const slotNext = back ? Math.min(1, NOT_RECENT) : Math.min(slot + 1, NOT_RECENT);
    const recent = back || slot <= RECENT_WEEKS ? 1 : 0;
    // Practice: a new injury takes the place of any knock he is playing through.
    let stay = p;
    let knocked = 0; // a new day-to-day knock from practice: still fit for away
    if (practice < 2 && this.lost.practice) {
      const hurt = stay * this.risk.qPractice[practice as 0 | 1][recent];
      stay -= hurt;
      knocked = hurt * this.knockPractice;
      this.fresh.practice[slotNext]! += hurt;
    }
    this.away(stay, then, slotNext);
    this.away(knocked, 1, slotNext);
  }

  /** Away from football: the same flat chance for whoever is fit. */
  private away(p: number, then: number, slotNext: number): void {
    if (!(p > 0)) return;
    const hurt = this.lost.away ? p * this.risk.qAway : 0;
    this.add(then, slotNext, p - hurt);
    this.add(1, slotNext, hurt * this.knockAway);
    this.fresh.away[slotNext]! += hurt;
  }

  /**
   * Walks `dist` × `scale` (the chance of each state at the week's start) through the week. `game` is
   * the chance his team plays this week. With `dropMissed`, a game he is out for removes that path (the
   * chance he has missed nothing so far). Returns its chance of being fit at the game, and its whole chance.
   */
  run(dist: Float64Array, scale: number, game: number, dropMissed: boolean): { fit: number; mass: number } {
    const { chain, risk, lost } = this;
    const { maxOut } = chain;
    let fit = 0;
    let total = 0;
    for (let i = 0; i < dist.length; i++) {
      let mass = dist[i]! * scale;
      if (!(mass > 0)) continue;
      total += mass;
      const status = Math.floor(i / SLOTS);
      const slot = i % SLOTS;
      const able = status <= maxOut;
      if (able) fit += mass;
      else if (dropMissed) mass *= 1 - game;
      if (!(mass > 0)) continue;
      // `practiced`, read at the week's start (steps.ts `playerWeeks`): 1 healthy, 0.5 playing hurt, 0 out.
      const practice = status === 0 ? 0 : able ? 1 : 2;
      const slotOn = Math.min(slot + 1, NOT_RECENT);

      // The game: only a fit man plays, and only in a week his team has one.
      const qG = able ? game * risk.qGame[slot <= RECENT_WEEKS ? 1 : 0] : 0;
      const kept = mass * (1 - qG);
      const hit = mass - kept;

      // Healing (`healWeek`) for the branch with no game injury; this week's new injury is not counted down.
      if (status === 0) this.practiceAndAway(kept, 0, false, practice, slot);
      else if (able) {
        if (status <= 1) this.practiceAndAway(kept, 0, true, practice, slot);
        else this.practiceAndAway(kept, status - 1, false, practice, slot);
      } else {
        const r = status - maxOut;
        if (r <= 1) this.practiceAndAway(kept, 0, true, practice, slot);
        else this.add(chain.out(r - 1), slotOn, kept);
      }
      if (hit > 0 && lost.game) {
        this.fresh.game[slotOn]! += hit;
        // A day-to-day knock in the game: he still practices (as read at the week's start) and can be hurt again.
        this.practiceAndAway(hit * this.knockGame, 1, false, practice, slot);
      }
    }
    return { fit, mass: total };
  }

  /** The week's new injuries of k >= 1 weeks: out k weeks from next week. Call once, after the week's runs. */
  spread(): void {
    const { fresh, lost } = this;
    for (const [sums, weeks] of [[fresh.game, lost.game], [fresh.practice, lost.practice], [fresh.away, lost.away]] as const) {
      if (!weeks) continue;
      for (let slot = 0; slot < SLOTS; slot++) {
        const m = sums[slot]!;
        if (!(m > 0)) continue;
        sums[slot] = 0;
        for (let k = 1; k < weeks.length; k++) this.add(this.chain.out(k), slot, m * weeks[k]!);
      }
    }
  }
}

/** The weeks before the regular season ahead (none from inside it), its season, his age then, and its first week to walk. */
function weeksBefore(at: CalendarStamp, age: number, rules: LeagueRules): { before: WalkWeek[]; season: number; age: number; firstWeek: number } {
  const startPhase = CALENDAR_PHASE_ORDER.indexOf(at.phase);
  const startWeek = Math.max(1, Math.min(at.week, phaseWeeks(at.phase, rules)));
  if (startPhase === REGULAR) return { before: [], season: at.season, age, firstWeek: startWeek };
  const target = startPhase < REGULAR ? at.season : at.season + 1;
  const before: WalkWeek[] = [];
  let season = at.season;
  let phaseIndex = startPhase;
  let week = startWeek;
  let now = age;
  while (!(season === target && phaseIndex === REGULAR)) {
    const phase = CALENDAR_PHASE_ORDER[phaseIndex]!;
    if (week <= phaseWeeks(phase, rules)) before.push({ at: { season, phase, week, day: 7 }, age: now });
    week++;
    if (week > phaseWeeks(phase, rules)) {
      week = 1;
      phaseIndex = (phaseIndex + 1) % CALENDAR_PHASE_ORDER.length;
      // A year older entering camp, as `turnYear` makes him.
      if (phaseIndex === 0) { season++; now++; }
    }
  }
  return { before, season: target, age: now, firstWeek: 1 };
}

/**
 * His team's weeks off, walked from `firstWeek`: `game` = the chance a week that is not his bye holds
 * his game; `pending` = the chance his bye is still ahead; `hazard(w)` = the chance it is week w,
 * given it is still ahead then. One week off falls in any `BYE_WINDOW` week with the same chance, so a
 * bye still ahead in week w is that week once in (window weeks left).
 */
function byeShape(firstWeek: number, rules: LeagueRules): { game: number; pending: number; hazard: (week: number) => number } {
  const weeks = phaseWeeks("REGULAR_SEASON", rules);
  const games = Math.max(0, Math.min(rules.gamesPerSeason, weeks));
  const off = weeks - games;
  const none = () => 0;
  if (off === 0) return { game: 1, pending: 0, hazard: none };
  const first = Math.max(1, BYE_WINDOW.first);
  const last = Math.min(weeks, BYE_WINDOW.last);
  if (off === 1 && first <= last) {
    const from = Math.max(first, firstWeek);
    return {
      game: 1,
      pending: Math.max(0, last - from + 1) / (last - first + 1),
      hazard: (w) => (w >= from && w <= last ? 1 / (last - w + 1) : 0),
    };
  }
  return { game: weeks > 0 ? games / weeks : 0, pending: 0, hazard: none };
}

/**
 * His expected availability for the regular-season games left from `at` (see the file's head):
 * how many there are, how many of them he is expected to be fit for, that share, and the chance he
 * misses none. Pure: the player and his history are not changed, and nothing is drawn.
 */
export function expectedAvailability(player: PlayerState, options: AvailabilityOptions): Availability {
  const rules = options.rules ?? DEFAULT_LEAGUE_RULES;
  const at = options.at;
  const group = POSITION_GROUP[player.bio.position];
  const snaps = (options.starter ?? true) ? EXPECTED_STARTER_SNAPS_PER_GAME : EXPECTED_BACKUP_SNAPS_PER_GAME;
  const exposure = gameExposure({ offense: snaps, defense: 0, special: 0 });
  const lost: Lost = {
    game: weeksLostCached("GAME", group), practice: weeksLostCached("PRACTICE", group), away: weeksLostCached("AWAY", group),
  };

  // The start: his injury today. One drawn in `at`'s own week is not counted down that week
  // (`healWeek`), which is the same as one more week to count; a playable one with no weeks left
  // heals at this week's end, as one with a week left does.
  const injury = player.condition.injury;
  const toCount = injury ? Math.max(1, Math.ceil(injury.weeksRemaining)) + (sameWeek(injury.since, at) ? 1 : 0) : 0;
  const chain = new Chain(Math.max(LONGEST, toCount));
  const startStatus = !injury ? 0 : injury.playable ? toCount : chain.out(toCount);
  // Weeks since he was last healthy again, from his history (`riskFactor`'s recent return).
  const now = weekNumber(at, rules);
  let since = Number.POSITIVE_INFINITY;
  for (const h of options.history ?? []) {
    if (h.healed === undefined) continue;
    const s = now - weekNumber(h.healed, rules);
    if (s >= 0 && s < since) since = s;
  }
  let dist: Float64Array = new Float64Array(chain.size);
  dist[chain.index(startStatus, since <= RECENT_WEEKS ? since : NOT_RECENT)] = 1;

  // His risk factor by age, recent return or not: `riskFactor` itself, with a history that is or is not recent.
  const factors = new Map<number, readonly [number, number]>();
  const g = INJURY_RATES.game;
  const pr = INJURY_RATES.practice;
  const riskOf = (week: WalkWeek): WeekRisk => {
    let f = factors.get(week.age);
    if (!f) {
      const aged: PlayerState = { ...player, bio: { ...player.bio, age: week.age } };
      const back: PastInjury[] = [{ kind: "recent", band: "SHORT", at: week.at, healed: week.at }];
      f = [riskFactor(aged, undefined, week.at, rules), riskFactor(aged, back, week.at, rules)];
      factors.set(week.age, f);
    }
    const [plain, recent] = f;
    const phase = week.at.phase;
    // With his team in every phase it practices, the playoffs aside (a team that misses them).
    const load = PRACTICE_PHASES.has(phase) && phase !== "PLAYOFFS" ? pr.phaseLoad[phase] : 0;
    const gameRate = (k: number) => g.perSnap * exposure * g.byGroup[group] * k;
    const practiceRate = (practiced: number, k: number) => pr.perWeek * load * practiced * pr.byGroup[group] * k;
    return {
      qGame: [chance(gameRate(plain), lost.game), chance(gameRate(recent), lost.game)],
      qPractice: [
        [chance(practiceRate(1, plain), lost.practice), chance(practiceRate(1, recent), lost.practice)],
        [chance(practiceRate(0.5, plain), lost.practice), chance(practiceRate(0.5, recent), lost.practice)],
      ],
      qAway: chance(INJURY_RATES.away.perWeek, lost.away),
    };
  };

  // The weeks before the regular season: no game, so no path has missed one yet.
  const start = weeksBefore(at, player.bio.age, rules);
  for (const week of start.before) {
    const next = new Float64Array(chain.size);
    const step = new WeekStep(chain, riskOf(week), lost, next);
    step.run(dist, 1, 0, false);
    step.spread();
    dist = next;
  }

  // The regular season, split by whether his bye is still ahead (`ahead`) or behind him (`behind`),
  // each as the whole chance (`full`) and the paths that have missed no game (`clean`), × `scale`.
  const bye = byeShape(start.firstWeek, rules);
  let ahead = { full: dist, clean: dist, scale: bye.pending };
  let behind = { full: dist, clean: dist, scale: 1 - bye.pending };
  let gamesLeft = 0;
  let expectedGames = 0;
  const lastWeek = phaseWeeks("REGULAR_SEASON", rules);
  for (let w = start.firstWeek; w <= lastWeek; w++) {
    const risk = riskOf({ at: { season: start.season, phase: "REGULAR_SEASON", week: w, day: 7 }, age: start.age });
    const hazard = bye.hazard(w);
    const nextAhead = { full: new Float64Array(chain.size), clean: new Float64Array(chain.size), scale: 1 };
    const nextBehind = { full: new Float64Array(chain.size), clean: new Float64Array(chain.size), scale: 1 };
    const steps = [
      new WeekStep(chain, risk, lost, nextAhead.full), new WeekStep(chain, risk, lost, nextAhead.clean),
      new WeekStep(chain, risk, lost, nextBehind.full), new WeekStep(chain, risk, lost, nextBehind.clean),
    ] as const;
    const [fullAhead, cleanAhead, fullBehind, cleanBehind] = steps;
    // Still ahead, his bye is this week `hazard` of the time (no game), which puts it behind him.
    const playsAhead = fullAhead.run(ahead.full, ahead.scale * (1 - hazard), bye.game, false);
    cleanAhead.run(ahead.clean, ahead.scale * (1 - hazard), bye.game, true);
    if (hazard > 0) {
      fullBehind.run(ahead.full, ahead.scale * hazard, 0, false);
      cleanBehind.run(ahead.clean, ahead.scale * hazard, 0, true);
    }
    const playsBehind = fullBehind.run(behind.full, behind.scale, bye.game, false);
    cleanBehind.run(behind.clean, behind.scale, bye.game, true);
    for (const step of steps) step.spread();
    gamesLeft += bye.game * (playsAhead.mass + playsBehind.mass);
    expectedGames += bye.game * (playsAhead.fit + playsBehind.fit);
    ahead = nextAhead;
    behind = nextBehind;
  }
  const total = (d: Float64Array, scale: number) => scale * d.reduce((n, p) => n + p, 0);
  const chanceMissesNone = total(ahead.clean, ahead.scale) + total(behind.clean, behind.scale);
  return {
    gamesLeft,
    expectedGames,
    shareAvailable: gamesLeft > 0 ? expectedGames / gamesLeft : 1,
    chanceMissesNone: gamesLeft > 0 ? chanceMissesNone : 1,
  };
}
