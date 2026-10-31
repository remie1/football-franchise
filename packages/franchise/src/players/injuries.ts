/**
 * Injuries, at any time (ADR-087 §5, D3).
 *
 * Three settings (§5.1): games, drawn at the final whistle from who played and how much until the
 * engine can take a player off mid-game (§5.2); practice, every week a team practises, heaviest in
 * camp; and away from football, any of the 52 weeks, for everyone, free agents too.
 *
 * An injury is public (`PlayerCondition.injury`, INJURY_OCCURRED): its kind, how many calendar weeks
 * it costs and its band (§5.3). `weeksRemaining` counts calendar weeks lost: a game injury on week
 * 4's day 7 that costs 2 weeks misses weeks 5 and 6 and is back for week 7, and offseason weeks
 * count too, so an ACL torn in February can keep him out in November. A day-to-day injury costs no
 * week: he plays hurt (`playable`) with the ratings that body part uses lowered (`inGamePenalty`),
 * and is healed at the next week's end.
 *
 * What it costs him for good (§5.4) is hidden, applied when he is healthy again and recorded only
 * in INJURY_HEALED (truth layer): each kind's lasting mark, larger for an older body, through his
 * body (`changeBody`) so his ratings and his 40 agree; and a repeat of the same kind lowers his
 * durability.
 *
 * Risk reads true `durability` and age (§7: the injury draws are one of franchise's four readers of
 * truth) and his history: a player back within the last few weeks is at higher risk. A player who is
 * out cannot be hurt again; one playing hurt can, and the new injury takes the old one's place (the
 * old one, at most day to day, stays open in his history until he is healthy).
 *
 * Every draw is forked from the season seed by the day and the player (and the game), so a resumed
 * run draws exactly what a straight run draws and adding one player never reshuffles another.
 * Pure: inputs in, new objects out; players keep their order and unchanged players come back as the
 * same objects. Prospects are skipped by every step. Every number lives in `injuryTables.ts`.
 */
import {
  CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, POSITION_GROUP, attrId, compareStamps, createRng, getAttr, stampToString,
  type AttrId, type BodyMeasure, type AttributeMap, type CalendarStamp, type FranchiseEvent, type GameId,
  type GameParticipation, type Injury, type InjuryBand, type InjurySetting, type LeagueRules, type PlayerState,
  type PositionGroup, type Rng,
} from "@ff/contracts";
import { phaseWeeks } from "../calendar/clock.js";
import { addPoints, changeBody, type BodyChange, type RatingMove } from "./body.js";
import {
  BAND_MIN_WEEKS, BAND_ORDER, BODY_REPORT_STEPS, INJURY_KINDS, INJURY_RATES, MARK_AGE, REPEAT_DURABILITY,
  type WeeksBucket,
} from "./injuryTables.js";
import type { PastInjury, PlayerWeek } from "./types.js";

export interface InjuryResult {
  /** The same order as the input; unchanged players are the same objects. */
  readonly players: PlayerState[];
  readonly events: FranchiseEvent[];
  /** The full updated history: a copy of the input plus this step's changes. */
  readonly history: Record<string, PastInjury[]>;
}

export interface GameInjuryInput {
  readonly game: GameId;
  /** The game day: the injury's `since`. */
  readonly at: CalendarStamp;
  /** Who played, from the who-played report (P4). Only these players can be hurt in this game. */
  readonly reports: readonly GameParticipation[];
  readonly players: readonly PlayerState[];
  readonly history: Readonly<Record<string, readonly PastInjury[]>>;
  readonly seed: string;
  /**
   * The calendar's lengths, to count the weeks since a player came back (the recent-return
   * factor). Absent = the default rules; only a return in the regular season read from a playoff
   * game depends on them.
   */
  readonly rules?: LeagueRules;
}

export interface WeekInjuryInput {
  /** The week's last day. */
  readonly at: CalendarStamp;
  readonly rules: LeagueRules;
  readonly players: readonly PlayerState[];
  /** Practice exposure comes from `practiced` (with `withTeam`); missing = a free agent: away-from-football only. */
  readonly weeks: ReadonlyMap<string, PlayerWeek>;
  readonly history: Readonly<Record<string, readonly PastInjury[]>>;
  readonly seed: string;
}

export interface HealInput {
  readonly at: CalendarStamp;
  readonly players: readonly PlayerState[];
  readonly history: Readonly<Record<string, readonly PastInjury[]>>;
}

/** The root of every injury draw. */
const STREAM = "franchise:injuries";

// ─── Records and bands ─────────────────────────────────────────────────────────────────────────

/** §5.3: the band a length falls in: DAY_TO_DAY 0 weeks, SHORT 1-3, LONG 4-8, MAJOR 9+. */
export function bandFor(weeks: number): InjuryBand {
  if (weeks >= BAND_MIN_WEEKS.MAJOR) return "MAJOR";
  if (weeks >= BAND_MIN_WEEKS.LONG) return "LONG";
  if (weeks >= BAND_MIN_WEEKS.SHORT) return "SHORT";
  return "DAY_TO_DAY";
}

/** Can he play this week: no injury, or one he plays through (`playable`). */
export function isAvailable(player: PlayerState): boolean {
  const injury = player.condition.injury;
  return injury === undefined || injury.playable;
}

/** Does he carry this rating? Read through the registry reader: an absent rating reads as the NaN fallback. */
const carries = (values: AttributeMap, attr: string) => !Number.isNaN(getAttr(values, attrId(attr), Number.NaN));

/** What playing hurt costs him: the kind's penalty, for the ratings he carries. Undefined when nothing. */
function playingHurt(player: PlayerState, kind: string): AttributeMap | undefined {
  const out: AttributeMap = {};
  for (const [attr, points] of Object.entries(INJURY_KINDS[kind]?.playingHurt ?? {})) {
    if (carries(player.attributes.values, attr)) out[attr] = points;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * The public injury record for a kind and a length (§5.3). Only a day-to-day injury is playable, and
 * only it carries the playing-hurt penalty.
 */
export function makeInjury(player: PlayerState, kind: string, weeks: number, setting: InjurySetting, since: CalendarStamp): Injury {
  const band = bandFor(weeks);
  const playable = band === "DAY_TO_DAY";
  const penalty = playable ? playingHurt(player, kind) : undefined;
  return { kind, weeksRemaining: weeks, playable, ...(penalty ? { inGamePenalty: penalty } : {}), setting, band, since };
}

// ─── Risk ──────────────────────────────────────────────────────────────────────────────────────

/** Calendar weeks since a fixed origin under these rules, so the distance between two days can be read in weeks. */
export function weekNumber(s: CalendarStamp, rules: LeagueRules): number {
  const at = CALENDAR_PHASE_ORDER.indexOf(s.phase);
  let year = 0;
  let before = 0;
  CALENDAR_PHASE_ORDER.forEach((phase, i) => {
    const n = phaseWeeks(phase, rules);
    year += n;
    if (i < at) before += n;
  });
  return s.season * year + before + s.week - 1;
}

/** Back from an injury within the last `recentReturn.weeks` calendar weeks. */
function recentlyBack(history: readonly PastInjury[] | undefined, at: CalendarStamp, rules: LeagueRules): boolean {
  const now = weekNumber(at, rules);
  return (history ?? []).some((h) => {
    if (h.healed === undefined) return false;
    const since = now - weekNumber(h.healed, rules);
    return since >= 0 && since <= INJURY_RATES.recentReturn.weeks;
  });
}

/**
 * The game and practice risk factors beyond his position and exposure: true durability (65 is
 * typical), age, and a recent return from injury.
 */
export function riskFactor(player: PlayerState, history: readonly PastInjury[] | undefined, at: CalendarStamp, rules: LeagueRules): number {
  const r = INJURY_RATES;
  const durability = getAttr(player.attributes.values, attrId("durability"), r.durability.typical);
  const body = Math.exp(-r.durability.perPoint * (durability - r.durability.typical));
  const age = 1 + r.age.perYear * Math.max(0, player.bio.age - r.age.from);
  const recent = recentlyBack(history, at, rules) ? r.recentReturn.factor : 1;
  return body * age * recent;
}

/** A game's exposure in snaps: offence and defence, and special teams weighted. */
export function gameExposure(snaps: GameParticipation["snaps"]): number {
  return snaps.offense + snaps.defense + INJURY_RATES.game.specialSnapWeight * snaps.special;
}

// ─── Draws ─────────────────────────────────────────────────────────────────────────────────────

interface Drawn {
  readonly kind: string;
  readonly weeks: number;
}

/** Each (setting, group)'s kind weights, worked out once: the table is fixed. */
const KIND_WEIGHTS = new Map<string, readonly (readonly [string, number])[]>();

function kindWeights(setting: InjurySetting, group: PositionGroup): readonly (readonly [string, number])[] {
  const key = `${setting}/${group}`;
  let weights = KIND_WEIGHTS.get(key);
  if (!weights) {
    weights = Object.entries(INJURY_KINDS)
      .map(([id, k]) => [id, (k.share[setting] ?? 0) * (k.byGroup?.[group] ?? 1)] as const)
      .filter(([, w]) => w > 0);
    KIND_WEIGHTS.set(key, weights);
  }
  return weights;
}

/** A weighted pick: walk the items in order until the draw is spent. */
function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T | undefined {
  const total = items.reduce((n, item) => n + weight(item), 0);
  if (!(total > 0)) return undefined;
  let u = rng.next() * total;
  for (const item of items) {
    u -= weight(item);
    if (u < 0) return item;
  }
  return items[items.length - 1];
}

function drawWeeks(rng: Rng, buckets: readonly WeeksBucket[]): number {
  const bucket = pickWeighted(rng, buckets, (b) => b[2]);
  return bucket ? rng.int(bucket[0], bucket[1]) : 0;
}

/** One draw: hurt with chance 1 - exp(-rate); then which kind, for this setting and position; then how long. */
function drawInjury(rng: Rng, rate: number, setting: InjurySetting, group: PositionGroup): Drawn | undefined {
  if (!(rate > 0) || rng.next() >= 1 - Math.exp(-rate)) return undefined;
  const pick = pickWeighted(rng, kindWeights(setting, group), (w) => w[1]);
  if (!pick) return undefined;
  return { kind: pick[0], weeks: drawWeeks(rng, INJURY_KINDS[pick[0]]!.weeks) };
}

/** A prospect is skipped; a player who is out cannot be hurt again. */
const canBeHurt = (p: PlayerState) => p.bio.draft !== "PROSPECT" && isAvailable(p);

function copyHistory(history: Readonly<Record<string, readonly PastInjury[]>>): Record<string, PastInjury[]> {
  const out: Record<string, PastInjury[]> = {};
  for (const [id, list] of Object.entries(history)) out[id] = [...list];
  return out;
}

/** Give him the injury: his condition, his history and the public event. */
function hurt(
  p: PlayerState, drawn: Drawn, setting: InjurySetting, at: CalendarStamp,
  history: Record<string, PastInjury[]>, events: FranchiseEvent[], game?: GameId,
): PlayerState {
  const injury = makeInjury(p, drawn.kind, drawn.weeks, setting, at);
  const id = String(p.bio.id);
  history[id] = [...(history[id] ?? []), { kind: drawn.kind, band: injury.band, at }];
  events.push({
    type: "INJURY_OCCURRED",
    payload: { player: p.bio.id, kind: drawn.kind, weeks: drawn.weeks, setting, band: injury.band, ...(game !== undefined ? { game } : {}) },
  });
  return { ...p, condition: { ...p.condition, injury } };
}

/**
 * One game's injuries, at the final whistle (§5.2): for every player in the who-played report, a
 * chance per snap by his position group, × his durability, age and recent-return factors.
 */
export function gameInjuries(input: GameInjuryInput): InjuryResult {
  const rules = input.rules ?? DEFAULT_LEAGUE_RULES;
  const exposure = new Map<string, number>();
  for (const r of input.reports) exposure.set(String(r.player), (exposure.get(String(r.player)) ?? 0) + gameExposure(r.snaps));
  const root = createRng(input.seed, STREAM).fork(`game/${stampToString(input.at)}/${String(input.game)}`);
  const history = copyHistory(input.history);
  const events: FranchiseEvent[] = [];
  const g = INJURY_RATES.game;
  const players = input.players.map((p) => {
    const id = String(p.bio.id);
    const snaps = exposure.get(id) ?? 0;
    if (snaps <= 0 || !canBeHurt(p)) return p;
    const group = POSITION_GROUP[p.bio.position];
    const rate = g.perSnap * snaps * g.byGroup[group] * riskFactor(p, history[id], input.at, rules);
    const drawn = drawInjury(root.fork(id), rate, "GAME", group);
    return drawn ? hurt(p, drawn, "GAME", input.at, history, events, input.game) : p;
  });
  return { players, events, history };
}

/**
 * One week's practice and away-from-football injuries, for every player (prospects skipped).
 * Practice: the phase's load × how much of the week he practised with his team, × his position's,
 * durability, age and recent-return factors. Away: the same small chance for everyone, every week.
 */
export function weekInjuries(input: WeekInjuryInput): InjuryResult {
  const { at, rules } = input;
  const root = createRng(input.seed, STREAM).fork(stampToString(at));
  const pr = INJURY_RATES.practice;
  const load = pr.phaseLoad[at.phase];
  const history = copyHistory(input.history);
  const events: FranchiseEvent[] = [];
  const players = input.players.map((player) => {
    if (!canBeHurt(player)) return player;
    const id = String(player.bio.id);
    const group = POSITION_GROUP[player.bio.position];
    const week = input.weeks.get(id);
    const practised = week?.withTeam ? load * Math.max(0, Math.min(1, week.practiced)) : 0;
    let p = player;
    if (practised > 0) {
      const rate = pr.perWeek * practised * pr.byGroup[group] * riskFactor(p, history[id], at, rules);
      const drawn = drawInjury(root.fork(`${id}/practice`), rate, "PRACTICE", group);
      if (drawn) p = hurt(p, drawn, "PRACTICE", at, history, events);
    }
    if (isAvailable(p)) {
      const drawn = drawInjury(root.fork(`${id}/away`), INJURY_RATES.away.perWeek, "AWAY", group);
      if (drawn) p = hurt(p, drawn, "AWAY", at, history, events);
    }
    return p;
  });
  return { players, events, history };
}

// ─── Healing and lasting marks ─────────────────────────────────────────────────────────────────

const sameWeek = (a: CalendarStamp, b: CalendarStamp) => a.season === b.season && a.phase === b.phase && a.week === b.week;
const atLeast = (band: InjuryBand, min: InjuryBand) => BAND_ORDER.indexOf(band) >= BAND_ORDER.indexOf(min);

/** §5.4: how much more a lasting mark costs at this age (written for a 25-year-old). */
export function markScale(age: number): number {
  return Math.max(MARK_AGE.min, Math.min(MARK_AGE.max, 1 + MARK_AGE.perYear * (age - MARK_AGE.refAge)));
}

/** A measure at the precision INJURY_HEALED reports it. */
function reported(measure: keyof typeof BODY_REPORT_STEPS, value: number): number {
  const steps = BODY_REPORT_STEPS[measure];
  return Math.round(value * steps) / steps;
}

export interface LastingResult {
  readonly player: PlayerState;
  /** Each rating the mark moved, before and after (whole points), in the order they first moved. */
  readonly lasting: { attr: AttrId; from: number; to: number }[];
  /** Each body measure whose reported value moved (empty for a player with no development record). */
  readonly body: { measure: BodyMeasure; from: number; to: number }[];
}

/**
 * What an injury costs him for good, applied as he comes back (§5.4): the kind's mark when the injury
 * was bad enough, scaled by his age, through his body and then any ratings beyond it; and, when he
 * has had this kind before, durability lower (not for illness and accidents: `InjuryKind.repeats`).
 * With no development record his ratings move by the same amounts, rounded, and no body is touched.
 */
export function lastingMark(player: PlayerState, injury: Pick<Injury, "kind" | "band">, priorOfKind: number): LastingResult {
  const kind = INJURY_KINDS[injury.kind];
  const mark = kind?.lasting && atLeast(injury.band, kind.lasting.minBand) ? kind.lasting : undefined;
  const scale = markScale(player.bio.age);
  const moved = new Map<string, { from: number; to: number }>();
  const note = (m: RatingMove) => moved.set(m.attr, { from: moved.get(m.attr)?.from ?? m.from, to: m.to });

  let next = player;
  let bodyMoves: readonly { measure: BodyMeasure | "weightLb"; from: number; to: number }[] = [];
  if (mark?.body) {
    const delta: BodyChange = {};
    for (const [m, d] of Object.entries(mark.body) as [keyof BodyChange, number][]) delta[m] = d * scale;
    const r = changeBody(next, delta);
    next = r.player;
    bodyMoves = r.body;
    r.changes.forEach(note);
  }

  const points: [string, number][] = Object.entries(mark?.ratings ?? {}).map(([attr, d]) => [attr, d * scale]);
  const repeat = priorOfKind > 0 && kind?.repeats !== false ? REPEAT_DURABILITY[injury.band] : 0;
  if (repeat > 0) points.push(["durability", -repeat]);
  if (points.length > 0) {
    const dev = next.attributes.development;
    const values: AttributeMap = { ...next.attributes.values };
    const carry: Record<string, number> = dev ? { ...(dev.carry as Record<string, number>) } : {};
    for (const [attr, d] of points) {
      const m = dev ? addPoints(values, carry, attr, d) : addPoints(values, {}, attr, Math.round(d));
      if (m) note(m);
    }
    next = { ...next, attributes: { ...next.attributes, values, ...(dev ? { development: { ...dev, carry } } : {}) } };
  }

  const lasting = [...moved].filter(([, m]) => m.from !== m.to).map(([attr, m]) => ({ attr: attrId(attr), from: m.from, to: m.to }));
  const body = bodyMoves
    .filter((m): m is { measure: BodyMeasure; from: number; to: number } => m.measure !== "weightLb")
    .map((m) => ({ measure: m.measure, from: reported(m.measure, m.from), to: reported(m.measure, m.to) }))
    .filter((m) => m.from !== m.to);
  return { player: next, lasting, body };
}

/** He is healthy: the lasting mark, his history closed, and the truth-layer record. */
function heal(p: PlayerState, injury: Injury, at: CalendarStamp, history: Record<string, PastInjury[]>, events: FranchiseEvent[]): PlayerState {
  const id = String(p.bio.id);
  const past = history[id] ?? [];
  const isThis = (h: PastInjury) => h.kind === injury.kind && compareStamps(h.at, injury.since) === 0;
  const prior = past.filter((h) => h.kind === injury.kind && !isThis(h)).length;
  const mark = lastingMark(p, injury, prior);
  // Every entry still open closes now: this injury, and a day-to-day knock it took the place of.
  const closed = past.map((h) => (h.healed === undefined ? { ...h, healed: at } : h));
  // An injury he came with (a stand-in's, set without a history) is recorded as he comes back.
  history[id] = past.some(isThis) ? closed : [...closed, { kind: injury.kind, band: injury.band, at: injury.since, healed: at }];
  events.push({
    type: "INJURY_HEALED",
    payload: { player: p.bio.id, lasting: mark.lasting, ...(mark.body.length > 0 ? { body: mark.body } : {}) },
  });
  const { injury: _healed, ...condition } = mark.player.condition;
  return { ...mark.player, condition };
}

/**
 * A week of healing: each injury not drawn this week counts down one calendar week; at 0 he is
 * healthy, his lasting marks are applied (INJURY_HEALED, truth layer) and his history entry gets
 * `healed`. A day-to-day injury (0 weeks) heals at the first week's end after the one it was drawn in.
 */
export function healWeek(input: HealInput): InjuryResult {
  const history = copyHistory(input.history);
  const events: FranchiseEvent[] = [];
  const players = input.players.map((p) => {
    const injury = p.condition.injury;
    if (!injury || p.bio.draft === "PROSPECT" || sameWeek(injury.since, input.at)) return p;
    const left = injury.weeksRemaining - 1;
    if (left > 0) return { ...p, condition: { ...p.condition, injury: { ...injury, weeksRemaining: left } } };
    return heal(p, injury, input.at, history, events);
  });
  return { players, events, history };
}
