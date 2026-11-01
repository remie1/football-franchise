/**
 * Players nobody signs (ADR-087 §6.1, F2): an unsigned player waits up to two seasons for a call,
 * then retires; how long he waits is his patience.
 *
 * - Every day, each free agent not yet remembered is recorded with the day he was first seen
 *   unsigned (`memory.unsignedSince`; ADR-085's free-agent record replaces this once it exists), and a
 *   player who has left the free agents (signed, or gone) is forgotten.
 * - He may decide at two moments a year only: when camps open (training camp week 1, day 1, the
 *   calendar's late-retirement window, timing "LATE") and when the regular season ends (its last
 *   week's day 7, timing "SEASON_END").
 * - He retires at the first moment after his patience has run out, counted from the day he became
 *   unsigned, and in any case at the end of the second regular season that began after that day.
 * - Patience is `personality.patience`, in seasons. Until Spec #14's needs set it, it is a hidden
 *   draw between none and two seasons (P6), stored on his sheet the first day he is seen without it.
 *
 * Retiring takes him out of the league: out of `freeAgents`, out of `players` and out of the steps'
 * memory; `PLAYER_RETIRED { reason: "UNSIGNED" }` is the record. Prospects are never free agents
 * here and are ignored. This step reads only the personality sheet, never ratings (ADR-087 §7).
 *
 * Pure: same inputs, same output. The patience draw is forked by player id, so adding a free agent
 * never changes another's.
 */
import {
  CALENDAR_PHASE_ORDER, createRng, type CalendarStamp, type FranchiseEvent, type LeagueRules, type PlayerId, type PlayerState,
} from "@ff/contracts";
import { DAYS_PER_WEEK, phaseWeeks } from "../calendar/clock.js";
import type { PlayerMemory } from "./types.js";

export interface UnsignedInput {
  /** Today: the step runs every day. */
  readonly at: CalendarStamp;
  readonly rules: LeagueRules;
  readonly seed: string;
  readonly players: readonly PlayerState[];
  readonly freeAgents: readonly PlayerId[];
  readonly memory: PlayerMemory;
}

export interface UnsignedResult {
  /** Same order; retired players removed; patience filled where a free agent had none. Unchanged players are the same objects. */
  readonly players: PlayerState[];
  readonly freeAgents: PlayerId[];
  readonly events: FranchiseEvent[];
  readonly memory: PlayerMemory;
}

/** The patience placeholder (P6) and the two-season cap (ADR-087 §6.1). */
export const PATIENCE = {
  /** The longest he waits, in seasons. RULED (F2: "up to 2 seasons"). */
  maxSeasons: 2,
  /** Regular seasons that began after he became unsigned; when this many have ended he retires whatever his patience. RULED (F2, §6.1). */
  capRegularSeasons: 2,
  /**
   * The draw's shape: uniform on [0, maxSeasons). CHOSEN (placeholder until Spec #14's needs set
   * patience; checked in D5b against how often unsigned players retire after one season or two).
   */
  shape: "uniform",
  /** Decimal places the drawn patience keeps, so saves stay tidy. */
  decimals: 2,
} as const;

/** The random stream patience is drawn from, forked by player id. */
export const PATIENCE_STREAM = "franchise:patience";

/** P6's placeholder: a hidden draw of 0..2 seasons, from `createRng(seed, "franchise:patience").fork(playerId)`. */
export function drawPatience(seed: string, player: PlayerId): number {
  const x = createRng(seed, PATIENCE_STREAM).fork(String(player)).next() * PATIENCE.maxSeasons;
  const scale = 10 ** PATIENCE.decimals;
  return Math.round(x * scale) / scale;
}

/** Which retirement moment today is, if either (§6.1). */
export function retirementMoment(at: CalendarStamp, rules: LeagueRules): "LATE" | "SEASON_END" | undefined {
  if (at.phase === "TRAINING_CAMP" && at.week === 1 && at.day === 1) return "LATE";
  if (at.phase === "REGULAR_SEASON" && at.week === rules.weeksPerSeason && at.day === DAYS_PER_WEEK) return "SEASON_END";
  return undefined;
}

/** Calendar weeks in one league year under these rules (52 with the default calendar). */
function yearWeeks(rules: LeagueRules): number {
  return CALENDAR_PHASE_ORDER.reduce((n, phase) => n + phaseWeeks(phase, rules), 0);
}

/** Days since a fixed origin, so the distance between two stamps can be read in days. */
function dayNumber(s: CalendarStamp, rules: LeagueRules): number {
  const at = CALENDAR_PHASE_ORDER.indexOf(s.phase);
  const before = CALENDAR_PHASE_ORDER.slice(0, at).reduce((n, phase) => n + phaseWeeks(phase, rules), 0);
  return ((s.season * yearWeeks(rules) + before + s.week - 1) * DAYS_PER_WEEK) + s.day - 1;
}

/**
 * Regular seasons that began after `since` and have ended by `at` (a SEASON_END moment counts the
 * season ending that day). A regular season begins on its week 1, day 1.
 */
function regularSeasonsEnded(since: CalendarStamp, at: CalendarStamp, rules: LeagueRules): number {
  const startOf = (season: number): CalendarStamp => ({ season, phase: "REGULAR_SEASON", week: 1, day: 1 });
  const first = dayNumber(startOf(since.season), rules) > dayNumber(since, rules) ? since.season : since.season + 1;
  const endOf = (season: number) => dayNumber({ season, phase: "REGULAR_SEASON", week: rules.weeksPerSeason, day: DAYS_PER_WEEK }, rules);
  let n = 0;
  for (let season = first; endOf(season) <= dayNumber(at, rules); season++) n++;
  return n;
}

/** Has he waited his patience out by `at`? Patience is in league years, counted from the day he became unsigned. */
function patienceRunOut(since: CalendarStamp, at: CalendarStamp, patience: number, rules: LeagueRules): boolean {
  const waited = dayNumber(at, rules) - dayNumber(since, rules);
  return waited >= patience * yearWeeks(rules) * DAYS_PER_WEEK;
}

/** One day of unsigned players' patience (§6.1). */
export function unsignedDay(input: UnsignedInput): UnsignedResult {
  const { at, rules, seed } = input;
  const byId = new Map(input.players.map((p) => [String(p.bio.id), p]));
  // A man on a team is not waiting to be signed, even if a free-agent list still names him: he never
  // retires unsigned (so a roster can never be left naming a retired man).
  const isFree = (id: PlayerId) => {
    const p = byId.get(String(id));
    return p !== undefined && p.bio.draft !== "PROSPECT" && p.teamId === undefined;
  };
  const free = input.freeAgents.filter(isFree);
  const freeIds = new Set(free.map(String));

  // Forget anyone who is no longer a free agent; remember each new one from today.
  const since: Record<string, CalendarStamp> = {};
  for (const [id, stamp] of Object.entries(input.memory.unsignedSince)) if (freeIds.has(id)) since[id] = stamp;
  for (const id of free) if (since[String(id)] === undefined) since[String(id)] = at;

  // Fill a missing patience the first day he is seen.
  const filled = new Map<string, PlayerState>();
  for (const id of free) {
    const p = byId.get(String(id))!;
    if (p.personality.patience === undefined) {
      filled.set(String(id), { ...p, personality: { ...p.personality, patience: drawPatience(seed, id) } });
    }
  }
  const current = (id: string) => filled.get(id) ?? byId.get(id)!;

  // The two moments.
  const timing = retirementMoment(at, rules);
  const retired = new Set<string>();
  const events: FranchiseEvent[] = [];
  if (timing !== undefined) {
    for (const id of free) {
      const key = String(id);
      if (retired.has(key)) continue; // listed twice: one retirement
      const from = since[key]!;
      const patience = current(key).personality.patience!;
      const capped = timing === "SEASON_END" && regularSeasonsEnded(from, at, rules) >= PATIENCE.capRegularSeasons;
      if (!capped && !patienceRunOut(from, at, patience, rules)) continue;
      retired.add(key);
      events.push({ type: "PLAYER_RETIRED", payload: { player: id, timing, reason: "UNSIGNED" } });
    }
  }

  const players: PlayerState[] = [];
  for (const p of input.players) {
    const key = String(p.bio.id);
    if (retired.has(key)) continue;
    players.push(filled.get(key) ?? p);
  }
  const freeAgents = input.freeAgents.filter((id) => !retired.has(String(id)));

  for (const key of retired) delete since[key];
  let memory: PlayerMemory = { ...input.memory, unsignedSince: since };
  if (retired.size > 0) memory = forget(memory, retired);
  return { players, freeAgents, events, memory };
}

/**
 * Take retired players out of the steps' memory: their injury history and grades, any position battle's
 * list, any injured-starter record of theirs and any weeks-in-job count (key `team/position/player`).
 */
function forget(memory: PlayerMemory, gone: ReadonlySet<string>): PlayerMemory {
  const drop = <T>(record: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(record).filter(([id]) => !gone.has(id)));
  return {
    ...memory,
    injuries: drop(memory.injuries),
    grades: drop(memory.grades),
    battles: memory.battles.map((b) => (b.players.some((id) => gone.has(String(id))) ? { ...b, players: b.players.filter((id) => !gone.has(String(id))) } : b)),
    injuredStarters: memory.injuredStarters.filter((s) => !gone.has(String(s.player))),
    weeksInJob: Object.fromEntries(Object.entries(memory.weeksInJob).filter(([k]) => !gone.has(k.split("/").slice(2).join("/")))),
  };
}
