/**
 * S5 — the calendar clock (Spec #5 §2, §13; season shell plan).
 *
 * `advance` steps the calendar one day at a time and emits, for each day it enters,
 * CALENDAR_PHASE_ENTERED, then WEEK_ADVANCED, then DEADLINE_REACHED, in that order.
 * The clock schedules; it never does the work. Owning systems react to the events.
 *
 * Conventions: a phase's weeks count from 1, and day 1 is Monday, so the trade deadline
 * (week 10, day 2) is Tuesday of week 10 (Spec #5 §4). A season runs TRAINING_CAMP
 * through OFF_SUMMER (the contracts' phase order); the day after OFF_SUMMER ends is
 * day 1 of the next season's camp.
 *
 * No randomness is used: the same world and target always give the same events.
 */
import {
  CALENDAR_PHASE_ORDER, compareStamps, stampToString,
  type Authority, type CalendarPhase, type CalendarStamp, type FranchiseEvent,
  type FranchiseEventEnvelope, type LeagueRules, type SeasonState,
} from "@ff/contracts";

export const DAYS_PER_WEEK = 7;

/** The slice of the world the clock reads. Anything else on `W` passes through untouched. */
export interface ClockWorld {
  calendar: CalendarStamp;
  leagueRules: LeagueRules;
  /** Days with a scheduled game halt an open-ended advance. Absent or null before a schedule exists. */
  season?: SeasonState | null;
}

/**
 * Weeks per phase. The regular season comes from `LeagueRules.weeksPerSeason`; the rest are
 * placeholder lengths that roughly fit the real year (camp late July, playoffs January into
 * early February with the week off before the final, offseason February to July).
 */
export const PHASE_WEEKS: Readonly<Record<Exclude<CalendarPhase, "REGULAR_SEASON">, number>> = {
  TRAINING_CAMP: 3,
  PRESEASON: 3,
  PLAYOFFS: 5,
  OFF_EVAL: 4,
  OFF_RESET_FA: 5,
  OFF_DRAFT: 4,
  OFF_ROOKIES_OTAS: 4,
  OFF_SUMMER: 6,
};

export function phaseWeeks(phase: CalendarPhase, rules: LeagueRules): number {
  return phase === "REGULAR_SEASON" ? rules.weeksPerSeason : PHASE_WEEKS[phase];
}

/** A deadline is data (Spec #5 §2). The `autoResolve` delegation path arrives with the systems that own decisions. */
export interface CalendarDeadline {
  id: string;
  phase: CalendarPhase;
  week: number;
  day: number;
  authority: Authority;
  /** Must the user resolve it? Almost nothing is (Spec #5 §2, blocking rule). */
  blocking: boolean;
}

/** The deadlines that land every season, read from the rules. v1: the trade deadline only. */
export function seasonDeadlines(rules: LeagueRules): CalendarDeadline[] {
  const td = rules.tradeDeadline;
  return [{
    id: "TRADE_DEADLINE",
    phase: td.phase as CalendarPhase,
    week: td.week,
    day: td.day,
    authority: "GM",
    blocking: false,
  }];
}

/** Day 1 of a season: the first day of training camp. */
export function seasonStart(season: number): CalendarStamp {
  return { season, phase: "TRAINING_CAMP", week: 1, day: 1 };
}

/** The day after `s`. */
export function nextDay(s: CalendarStamp, rules: LeagueRules): CalendarStamp {
  if (s.day < DAYS_PER_WEEK) return { ...s, day: s.day + 1 };
  if (s.week < phaseWeeks(s.phase, rules)) return { ...s, week: s.week + 1, day: 1 };
  const i = CALENDAR_PHASE_ORDER.indexOf(s.phase);
  if (i < CALENDAR_PHASE_ORDER.length - 1) {
    return { season: s.season, phase: CALENDAR_PHASE_ORDER[i + 1]!, week: 1, day: 1 };
  }
  return seasonStart(s.season + 1);
}

export function assertValidStamp(s: CalendarStamp, rules: LeagueRules): void {
  const ok = CALENDAR_PHASE_ORDER.includes(s.phase)
    && Number.isInteger(s.season)
    && Number.isInteger(s.week) && s.week >= 1 && s.week <= phaseWeeks(s.phase, rules)
    && Number.isInteger(s.day) && s.day >= 1 && s.day <= DAYS_PER_WEEK;
  if (!ok) throw new Error(`calendar: ${stampToString(s)} is not a day on this calendar`);
}

const sameDay = (a: { phase: CalendarPhase; week: number; day: number }, b: CalendarStamp) =>
  a.phase === b.phase && a.week === b.week && a.day === b.day;

/** The events of entering day `to` from the day before it, in emit order. */
function eventsOnEntering(from: CalendarStamp, to: CalendarStamp, deadlines: CalendarDeadline[]): FranchiseEvent[] {
  const out: FranchiseEvent[] = [];
  if (to.phase !== from.phase || to.season !== from.season) {
    out.push({ type: "CALENDAR_PHASE_ENTERED", payload: { phase: to.phase } });
  }
  if (to.day === 1) out.push({ type: "WEEK_ADVANCED", payload: { stamp: to } });
  for (const d of deadlines) {
    if (sameDay(d, to)) out.push({ type: "DEADLINE_REACHED", payload: { deadlineId: d.id, autoResolved: !d.blocking } });
  }
  return out;
}

/** Weeks the user works week by week (Spec #5 §3); their first day always halts an open-ended advance. */
const WEEKLY_PHASES: ReadonlySet<CalendarPhase> = new Set(["REGULAR_SEASON", "PLAYOFFS"]);

function hasGame(world: ClockWorld, s: CalendarStamp): boolean {
  const games = world.season?.schedule.games ?? [];
  return games.some((g) => g.at.season === s.season && sameDay(g.at, s));
}

function worthStopping(world: ClockWorld, s: CalendarStamp, events: FranchiseEvent[]): boolean {
  if (events.some((e) => e.type === "CALENDAR_PHASE_ENTERED" || e.type === "DEADLINE_REACHED")) return true;
  if (s.day === 1 && WEEKLY_PHASES.has(s.phase)) return true;
  return hasGame(world, s);
}

export interface AdvanceOptions {
  /** `seq` of the first event emitted; the caller keeps the stream's numbering. Default 0. */
  firstSeq?: number;
}

export interface AdvanceResult<W extends ClockWorld> {
  world: W;
  events: FranchiseEventEnvelope[];
}

/**
 * Move the clock forward (Spec #5 §2).
 *
 * With `to`: step day by day up to and including `to`. If the world is already at or past
 * `to`, nothing happens (so a repeated call is a no-op).
 *
 * Without `to` (the advance button, §13): step until the first day worth stopping for, which
 * is a phase opening, a deadline, the first day of a regular-season or playoff week, or a
 * day with a scheduled game. The clock always moves at least one day.
 */
export function advance<W extends ClockWorld>(world: W, to?: CalendarStamp, opts: AdvanceOptions = {}): AdvanceResult<W> {
  const rules = world.leagueRules;
  assertValidStamp(world.calendar, rules);
  if (to) assertValidStamp(to, rules);

  let seq = opts.firstSeq ?? 0;
  const events: FranchiseEventEnvelope[] = [];
  let at = world.calendar;
  const deadlines = seasonDeadlines(rules);

  while (!to || compareStamps(at, to) < 0) {
    const next = nextDay(at, rules);
    const today = eventsOnEntering(at, next, deadlines);
    for (const event of today) events.push({ seq: seq++, at: next, event });
    at = next;
    if (!to && worthStopping(world, at, today)) break;
  }

  if (at === world.calendar) return { world, events };
  return { world: { ...world, calendar: at }, events };
}
