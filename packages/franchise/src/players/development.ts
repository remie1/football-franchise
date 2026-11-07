/**
 * The development week (ADR-087 §2, §3, §4; D2): one calendar week of growth and aging for every
 * player, run on each week's last day.
 *
 * - **No ceiling** (Q1, F1). Every point costs the same wherever a rating stands; 99 is the only cap.
 *   The natural curve comes from the learning rate (§2.2: high while he is young and new, low but never
 *   zero later) and from aging.
 * - **The groups** (§2.3, `developmentTables.ts`): the body ratings move only with his body; the
 *   body-plus-practice ratings with his body and a share of the skill gains; the own-curve ratings by
 *   their age curves; skills by the weekly inputs; smarts by the inputs plus his snaps; volatility and
 *   discipline never.
 * - **The inputs** (§2.3): practice by phase × how much he practised (only with his team), playing
 *   time, performance in his one-on-one checks, coaching, and a seeded wobble. Every gain is × learning
 *   rate × his growth rate; the wobble is not.
 * - **Aging** (§4) follows the calendar for everyone, a free agent and a champion alike, with about
 *   three quarters of a year's aging in the 23 offseason weeks. Each phase's share is divided by its
 *   length, so a longer or shorter phase moves when aging lands, not how much. Workouts (§3's table)
 *   add to the body at any age, less as he gets older. Body changes go through `changeBody`, which moves
 *   the ratings that follow the body by what the change is worth.
 *
 * Pure: players in, new players and RATINGS_CHANGED events (truth layer, E1) out. Each player's week
 * draws from its own stream, forked by the week and his id, so a resumed run draws what a straight run
 * draws and adding one player never reshuffles another. Players without a development record and
 * prospects come back as the same objects.
 */
import {
  CALENDAR_PHASE_ORDER, DEFAULT_LEAGUE_RULES, attrId, createRng, getAttr, positionOverall, stampToString,
  type AttributeMap, type BodyMeasure, type CalendarPhase, type CalendarStamp, type FranchiseEvent, type LeagueRules,
  type PlayerState, type Position, type Rng, type TeamId,
} from "@ff/contracts";
import { phaseWeeks } from "../calendar/clock.js";
import { seasonsIn } from "../draft/cutdown.js";
import {
  ABILITY_FOLLOWS, abilityBodyWeek, abilityLearningRate, abilityRatingDeltas, abilityRules, legLossYear, slowSmartsWeek,
  type AbilityRules, type AbilityWeekInputs, type AgingOptions,
} from "./aging.js";
import { addPoints, changeBody, type Body, type BodyChange } from "./body.js";
import { curveAt, weeklyShare, workoutShare } from "./curves.js";
import {
  AGING_PROFILES, AGING_SHARES, COACHING, DISGUISE_WINDOWS, GROUP_MEMBERS, LEARNING_RATE, MAX_YEARS_PAST_PEAK,
  OWN_CURVES, PERFORMANCE, PRACTICE_SHARES, REPORTING_STEPS_PER_UNIT, SKILL_FADE, SKILL_INPUTS,
  SMARTS_FADE, SMARTS_SNAPS, WOBBLE, WORKOUTS, WORKOUT_AGE,
} from "./developmentTables.js";
import type { PlayerWeek } from "./types.js";

export { RATING_GROUPS } from "./developmentTables.js";
export { curveAt, weeklyShare } from "./curves.js";

/**
 * The week's input. ADR-087 §12.1: the aging options (`aging`, and the ability path's tuning options)
 * act only with `aging: "ability"`; absent, the week is main's to the byte.
 */
export interface DevelopmentWeekInput extends AgingOptions {
  readonly players: readonly PlayerState[];
  /** The week's last day; its phase and week say what the week holds (ADR-087 §3). */
  readonly at: CalendarStamp;
  readonly rules: LeagueRules;
  readonly seed: string;
  /** Each player's week, by player id. Missing = a free agent's week: workouts only. */
  readonly weeks: ReadonlyMap<string, PlayerWeek>;
}

export interface DevelopmentWeekResult {
  readonly players: PlayerState[];
  readonly events: FranchiseEvent[];
}

type RatingsChanged = Extract<FranchiseEvent, { type: "RATINGS_CHANGED" }>["payload"];
type RatingChange = RatingsChanged["changes"][number];
type BodyEntry = NonNullable<RatingsChanged["body"]>[number];
type Measure = BodyMeasure | "weightLb";

/** Phases in which a team still in its year practises (§3's table). */
export const PRACTICE_PHASES: ReadonlySet<CalendarPhase> = new Set(["TRAINING_CAMP", "PRESEASON", "REGULAR_SEASON", "PLAYOFFS", "OFF_ROOKIES_OTAS"]);

/** A week with no team: no practice, no snaps, no coach. A free agent's, all year. */
const ON_HIS_OWN: PlayerWeek = { withTeam: false, practiced: 0, playShare: 0, snaps: 0, contests: [] };

const MEASURES: readonly Measure[] = ["forty", "cone", "vertical", "bench", "weightLb"];

/** Plain code-unit order, the same on every machine. */
const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const OWN = Object.keys(OWN_CURVES) as (keyof typeof OWN_CURVES)[];

/**
 * The ratings the week moves itself, in the fixed order their points are worked out and their wobble
 * drawn: body-plus-practice, skills, smarts (one wobble step each, whatever ratings he carries), then
 * the own curves.
 */
const MOVED: readonly string[] = [...GROUP_MEMBERS.BODY_PRACTICE, ...GROUP_MEMBERS.SKILL, ...GROUP_MEMBERS.SMARTS, ...OWN];

/** Every rating a week can change (the above and the body's), in rating id order, for the event's list. */
const CHANGEABLE: readonly string[] = [...new Set([...MOVED, ...GROUP_MEMBERS.BODY])].sort(byString);

/** §2.2: highest for a young player in his first seasons, falls through the mid-20s, low but never zero. */
export function learningRate(age: number, creditedSeasons: number): number {
  const { floor, fullUntilAge, ageHalfLife, seasonHalfLife } = LEARNING_RATE;
  const byAge = 0.5 ** (Math.max(0, age - fullUntilAge) / ageHalfLife);
  const bySeasons = 0.5 ** (Math.max(0, creditedSeasons) / seasonHalfLife);
  return floor + (1 - floor) * byAge * bySeasons;
}

/** Weeks in this calendar's year (52 with the default rules). */
export function yearWeeks(rules: LeagueRules): number {
  return CALENDAR_PHASE_ORDER.reduce((n, phase) => n + phaseWeeks(phase, rules), 0);
}

/** §4.2: what a year at `age` takes from a body at `position`, in the measurements' units. */
export function yearOfAging(position: Position, age: number): BodyChange {
  const profile = AGING_PROFILES[position];
  const past = Math.min(MAX_YEARS_PAST_PEAK, Math.max(0, age - profile.peak));
  const strengthPast = Math.min(MAX_YEARS_PAST_PEAK, Math.max(0, age - profile.strengthPeak));
  const per = profile.perYearPast;
  return { forty: per.forty * past, cone: per.cone * past, vertical: -per.vertical * past, bench: -per.bench * strengthPast };
}

/** §4.2: what a year of workouts adds at `age` and growth rate `growth`. */
export function yearOfWorkouts(age: number, growth: number): BodyChange {
  const scale = curveAt(WORKOUT_AGE, age) * growth;
  return {
    forty: WORKOUTS.forty * scale, cone: WORKOUTS.cone * scale, vertical: WORKOUTS.vertical * scale,
    bench: WORKOUTS.bench * scale, weightLb: WORKOUTS.weightLb * scale,
  };
}

/** This week's body change: the calendar's share of a year's aging, plus this week's workouts. */
export function bodyWeek(position: Position, age: number, growth: number, withTeam: boolean, phase: CalendarPhase, rules: LeagueRules): BodyChange {
  const aging = yearOfAging(position, age);
  const workouts = yearOfWorkouts(age, growth);
  const ageShare = weeklyShare(AGING_SHARES, phase, rules);
  const workShare = workoutShare(phase, withTeam, rules);
  const out: BodyChange = {};
  for (const m of MEASURES) {
    const d = (aging[m] ?? 0) * ageShare + (workouts[m] ?? 0) * workShare;
    if (d !== 0) out[m] = d;
  }
  return out;
}

/** Points a year a coach of `skill` adds (absent = neutral; read on the coach scale, so a stray value cannot run away). */
function coachPointsPerYear(skill: number | undefined): number {
  const { pointsPerYearBestVsWorst, best, worst, neutral, scale } = COACHING;
  const read = skill === undefined || !Number.isFinite(skill) ? neutral : Math.max(scale.min, Math.min(scale.max, skill));
  return (read - neutral) * (pointsPerYearBestVsWorst / (best - worst));
}

/**
 * His growth rate as the week uses it: never below 0 (no input makes him worse), and a malformed one
 * (not a finite number, e.g. a record that lost its field) reads as typical, 1, so a bad record can
 * never write NaN ratings into the league or a save.
 */
export function growthOf(growth: number): number {
  return Number.isFinite(growth) ? Math.max(0, growth) : 1;
}

/** What one week holds for one player, before the per-rating parts. Points, already × learning rate × growth. */
interface WeekInputs {
  /** Practice, play and coaching: the same for every skill and smart. */
  readonly common: number;
  /** `disguise`'s own practice and coaching, in ADR-075's windows. */
  readonly disguise: number;
  /** Did he practise this week (gates disguise's wobble and checks: no growth in a week he does not practise). */
  readonly practising: boolean;
  /** Performance by rating. */
  readonly performance: ReadonlyMap<string, number>;
  /** His snaps' straight gain to smarts (× growth only). */
  readonly snaps: number;
  /** This week's share of a year's aging. */
  readonly ageShare: number;
}

/**
 * The week's inputs. `ability` (ADR-087 §12.2.1): the ability path's learning floor and smarts snaps
 * in place of main's; absent, main's, exactly as before.
 */
function weekInputs(player: PlayerState, week: PlayerWeek, at: CalendarStamp, rules: LeagueRules, growth: number, ability?: AbilityRules): WeekInputs {
  const phase = at.phase;
  const seasons = seasonsIn(player, at.season);
  const rate = (ability === undefined ? learningRate(player.bio.age, seasons) : abilityLearningRate(player.bio.age, seasons, ability.curves.learningFloor)) * growth;
  const practised = week.withTeam ? Math.max(0, Math.min(1, week.practiced)) : 0;
  const rookieOtas = phase === "OFF_ROOKIES_OTAS" && seasons === 0 ? SKILL_INPUTS.rookieOtaFactor : 1;
  const practiceLoad = weeklyShare(PRACTICE_SHARES, phase, rules) * rookieOtas * practised;
  const games = Math.max(1, rules.gamesPerSeason);
  const play = SKILL_INPUTS.playPointsPerYear * Math.max(0, Math.min(1, week.playShare)) / games;
  const practice = SKILL_INPUTS.practicePointsPerYear * practiceLoad;
  const coaching = coachPointsPerYear(week.coachDevelopment) * practiceLoad;

  const disguiseLoad = weeklyShare(DISGUISE_WINDOWS, phase, rules) * practised;
  const disguiseYear = SKILL_INPUTS.practicePointsPerYear + SKILL_INPUTS.playPointsPerYear;
  const disguise = (disguiseYear + coachPointsPerYear(week.dcTeaching)) * disguiseLoad;

  const checks = new Map<string, { won: number; lost: number }>();
  for (const c of week.contests) {
    const was = checks.get(String(c.attr)) ?? { won: 0, lost: 0 };
    checks.set(String(c.attr), { won: was.won + Math.max(0, c.won), lost: was.lost + Math.max(0, c.lost) });
  }
  const performance = new Map<string, number>();
  for (const [attr, { won, lost }] of checks) {
    const n = won + lost;
    if (n === 0) continue;
    const weight = Math.min(1, n / PERFORMANCE.contestsForFullWeight);
    performance.set(attr, rate * PERFORMANCE.pointsPerWeekAtFullMargin * ((won - lost) / n) * weight);
  }

  return {
    common: rate * (practice + play + coaching),
    disguise: rate * disguise,
    practising: practised > 0,
    performance,
    snaps: growth * (ability === undefined ? SMARTS_SNAPS.pointsPerThousandSnaps : ability.smartsSnaps) * Math.max(0, week.snaps) / 1000,
    ageShare: weeklyShare(AGING_SHARES, phase, rules),
  };
}

/**
 * Wear from contact taken (ADR-087 §12.3.6), in years added to the body groups' and DURABILITY's years
 * past. Nothing counts contact before AB6 (`PlayerMemory.contact`), so it is 0 for everyone.
 */
const NO_WEAR = 0;

/**
 * The ability path's week inputs (ADR-087 §12.2.1, §12.2.4): `weekInputs` at the set's learning floor
 * and smarts snaps, plus passing from snaps (× growth) and slow smarts (his yearly leg loss × c × his
 * share of his side's snaps this week / the season's games; none when c is 0). No position is read.
 */
function abilityWeekInputs(player: PlayerState, week: PlayerWeek, at: CalendarStamp, rules: LeagueRules, growth: number, ability: AbilityRules): AbilityWeekInputs {
  const base = weekInputs(player, week, at, rules, growth, ability);
  const dev = player.attributes.development!;
  const c = ability.curves.slowSmarts;
  return {
    common: base.common,
    disguise: base.disguise,
    practising: base.practising,
    performance: base.performance,
    smartsSnaps: base.snaps,
    passingSnaps: growth * ability.curves.passingSnaps * Math.max(0, week.snaps) / 1000,
    slowSmarts: c === 0 ? 0 : slowSmartsWeek(c, legLossYear(player.bio.age, dev, player.bio.weightLb, growth, ability, NO_WEAR), week.playShare, rules),
    ageShare: base.ageShare,
  };
}

/** Half the width of a week's wobble step: a year of them spreads by `WOBBLE.yearlySd`. */
function wobbleHalfWidth(rules: LeagueRules): number {
  return WOBBLE.yearlySd * Math.sqrt(3) / Math.sqrt(yearWeeks(rules));
}

/**
 * This week's points for every rating in `MOVED`, in its order (§2.3). `wobble` is called here, one
 * step per body-plus-practice, skill and smarts rating, in that fixed order, so the stream never depends
 * on which ratings he carries (`developOne` draws it; `expectedOverallChange` passes its mean, 0).
 */
function ratingDeltas(player: PlayerState, inputs: WeekInputs, wobble: () => number, growth: number): number[] {
  const age = player.bio.age;
  const out: number[] = [];
  const perf = (attr: string) => (inputs.performance.size === 0 ? 0 : inputs.performance.get(attr) ?? 0);
  for (const attr of GROUP_MEMBERS.BODY_PRACTICE) out.push(SKILL_INPUTS.bodyPracticeShare * (inputs.common + perf(attr) + wobble()));
  const skillFade = curveAt(SKILL_FADE, age) * inputs.ageShare;
  for (const attr of GROUP_MEMBERS.SKILL) {
    const step = wobble();
    if (attr === "disguise") out.push((inputs.practising ? inputs.disguise + perf(attr) + step : 0) - skillFade);
    else out.push(inputs.common + perf(attr) + step - skillFade);
  }
  const smartsFade = curveAt(SMARTS_FADE, age) * inputs.ageShare;
  for (const attr of GROUP_MEMBERS.SMARTS) out.push(inputs.common + perf(attr) + wobble() + inputs.snaps - smartsFade);
  for (const attr of OWN) {
    const yearly = curveAt(OWN_CURVES[attr], age);
    out.push((yearly > 0 ? yearly * growth : yearly) * inputs.ageShare);
  }
  return out;
}

/** A measure at its reporting precision (0.01 s, 0.5 in, 1 rep, 1 lb). */
function reported(measure: Measure, value: number): number {
  const steps = REPORTING_STEPS_PER_UNIT[measure];
  return Math.round(value * steps) / steps;
}

function measureOf(body: Body, weightLb: number, m: Measure): number {
  return m === "weightLb" ? weightLb : body[m];
}

interface Grown {
  readonly player: PlayerState;
  readonly changes: RatingChange[];
  readonly body: BodyEntry[];
}

/**
 * One player's week. `root` is `createRng(seed, "franchise:development")`; his stream is its fork by the
 * week and his id (contracts' `fork` reads only the labels, so this is the same stream however many
 * players come before him).
 */
function developOne(player: PlayerState, week: PlayerWeek | undefined, at: CalendarStamp, rules: LeagueRules, root: Rng, half: number, ability?: AbilityRules): Grown {
  const dev = player.attributes.development;
  if (!dev || player.bio.draft === "PROSPECT") return { player, changes: [], body: [] };
  const w = week ?? ON_HIS_OWN;
  const id = String(player.bio.id);
  const rng = root.fork(`${stampToString(at)}/${id}`);
  const growth = growthOf(dev.growth);

  // ADR-087 §12.2: the ability path (`aging: "ability"`) reads his age and his own record, never his
  // position; the same wobble stream, in the same order.
  const delta = ability === undefined
    ? bodyWeek(player.bio.position, player.bio.age, growth, w.withTeam, at.phase, rules)
    : abilityBodyWeek(player.bio.age, dev, growth, w.withTeam, at.phase, rules, ability, NO_WEAR);
  const wobble = () => (rng.next() * 2 - 1) * half;
  const deltas = ability === undefined
    ? ratingDeltas(player, weekInputs(player, w, at, rules, growth), wobble, growth)
    : abilityRatingDeltas(player.bio.age, dev, abilityWeekInputs(player, w, at, rules, growth, ability), wobble, growth, ability, NO_WEAR);
  if (Object.keys(delta).length === 0 && deltas.every((d) => d === 0) && w.snaps <= 0) return { player, changes: [], body: [] };

  const moved = (ability === undefined ? changeBody(player, delta) : changeBody(player, delta, ABILITY_FOLLOWS)).player;
  const movedDev = moved.attributes.development ?? dev;
  const values = { ...moved.attributes.values };
  const carry: Record<string, number> = { ...(movedDev.carry as Record<string, number>) };
  MOVED.forEach((attr, i) => addPoints(values, carry, attr, deltas[i]!));

  const before = player.attributes.values;
  const changes: RatingChange[] = [];
  for (const attr of CHANGEABLE) {
    if (typeof before[attr] !== "number") continue; // a rating he does not carry never moves
    const from = getAttr(before, attrId(attr));
    const to = getAttr(values, attrId(attr));
    if (from !== to) changes.push({ player: player.bio.id, attr: attrId(attr), from, to });
  }
  const body: BodyEntry[] = [];
  for (const m of MEASURES) {
    const from = reported(m, measureOf(dev.body, player.bio.weightLb, m));
    const to = reported(m, measureOf(movedDev.body, moved.bio.weightLb, m));
    if (from !== to) body.push({ player: player.bio.id, measure: m, from, to });
  }

  const next: PlayerState = {
    ...moved,
    attributes: {
      ...moved.attributes,
      values,
      development: { ...movedDev, carry, snaps: dev.snaps + Math.max(0, w.snaps) },
    },
  };
  return { player: next, changes, body };
}

/**
 * One calendar week of development for every player (§3). `players` come back in the same order; a
 * player with nothing to change is the same object. `events`: at most one RATINGS_CHANGED per team, by
 * team id, plus one with no `team` for players on no team, last; within each, changes by player order,
 * then rating id. Rating changes are whole points; body entries are measures whose reported value moved
 * this week, at the reporting precision (the full-precision body stays in `development.body`).
 */
export function developmentWeek(input: DevelopmentWeekInput): DevelopmentWeekResult {
  const { at, rules, seed, weeks } = input;
  const players: PlayerState[] = [];
  const byTeam = new Map<string, { team?: TeamId; changes: RatingChange[]; body: BodyEntry[] }>();
  const NO_TEAM = "";
  const half = wobbleHalfWidth(rules);
  const root = createRng(seed, "franchise:development");
  const ability = abilityRules(input);
  for (const p of input.players) {
    const grown = developOne(p, weeks.get(String(p.bio.id)), at, rules, root, half, ability);
    players.push(grown.player);
    if (grown.changes.length === 0 && grown.body.length === 0) continue;
    const key = p.teamId === undefined ? NO_TEAM : String(p.teamId);
    let group = byTeam.get(key);
    if (!group) {
      group = p.teamId === undefined ? { changes: [], body: [] } : { team: p.teamId, changes: [], body: [] };
      byTeam.set(key, group);
    }
    group.changes.push(...grown.changes);
    group.body.push(...grown.body);
  }
  const keys = [...byTeam.keys()].filter((k) => k !== NO_TEAM).sort(byString);
  if (byTeam.has(NO_TEAM)) keys.push(NO_TEAM);
  const events: FranchiseEvent[] = keys.map((k) => {
    const g = byTeam.get(k)!;
    return {
      type: "RATINGS_CHANGED",
      payload: {
        ...(g.team === undefined ? {} : { team: g.team }),
        changes: g.changes,
        ...(g.body.length === 0 ? {} : { body: g.body }),
      },
    };
  });
  return { players, events };
}


// ---------------------------------------------------------------------------------------------
// The year ahead, expected (D5b; the cap's veteran decisions).
// ---------------------------------------------------------------------------------------------

/**
 * A starter's snaps in a game, for `expectedOverallChange`: about 1,100 a season over 17 games, the
 * figure `SMARTS_SNAPS` is written around. CHOSEN.
 */
export const EXPECTED_STARTER_SNAPS_PER_GAME = 65;

export interface ExpectedChangeOptions extends AgingOptions {
  /** Where the year starts: its phase and week (the day is ignored; a week's growth lands on its last day). */
  readonly at: CalendarStamp;
  /**
   * A starter plays every snap of every regular-season game; anyone else practises with his team and
   * plays none (his special-teams snaps left out).
   */
  readonly starter: boolean;
  /** How many weeks ahead (default: a year of this calendar's weeks). */
  readonly weeks?: number;
  readonly rules?: LeagueRules;
  // ADR-087 §12.1, §12.11 M2: the aging options (`aging`, `abilityCurves`, `techniqueKnee`,
  // `smartsSnaps`), as the development week takes them; absent, main's position path.
}

/** His overall at his own position with each rating's unshown fraction counted (contracts' `positionOverall`). */
export function overallWithCarry(player: PlayerState): number {
  const carry = (player.attributes.development?.carry ?? {}) as Readonly<Record<string, number>>;
  const values: AttributeMap = { ...player.attributes.values };
  for (const [attr, rest] of Object.entries(carry)) {
    const v = values[attr];
    if (typeof v === "number") values[attr] = v + rest;
  }
  return positionOverall(player.bio.position, values);
}

/**
 * How much his overall at his own position is expected to change over the weeks ahead (default a year),
 * by the development week's own numbers with every chance part at its mean: no wobble, one-on-ones
 * even, healthy, with his team for every practice week but the playoffs, under a coach who adds nothing.
 * He turns a year older when the calendar passes from the summer into camp (`turnYear`) and earns a
 * credited season when it passes into the evaluation phase, as a man on a 53 does (`creditSeason`).
 * Points of overall, fractions kept (`overallWithCarry`); the 99 cap and the body's bounds apply as
 * they do in the real week. Pure: the player is not changed. 0 for a man with no development record or
 * a prospect, whom the week leaves alone.
 */
export function expectedOverallChange(player: PlayerState, options: ExpectedChangeOptions): number {
  return expectedWalk(player, options, [options.weeks ?? yearWeeks(options.rules ?? DEFAULT_LEAGUE_RULES)])[0]!;
}

/**
 * ADR-085 step 13: `expectedOverallChange` at the end of each of the next `years` years, from one walk
 * (a year is this calendar's weeks): element 0 is a year ahead, element 1 two years ahead, and so on.
 * Each element equals `expectedOverallChange` with `weeks` set to that many years of weeks.
 */
export function expectedOverallPath(player: PlayerState, options: Omit<ExpectedChangeOptions, "weeks"> & { readonly years: number }): number[] {
  const year = yearWeeks(options.rules ?? DEFAULT_LEAGUE_RULES);
  return expectedWalk(player, options, Array.from({ length: Math.max(0, Math.floor(options.years)) }, (_, i) => (i + 1) * year));
}

/** The walk behind both: the expected change after each count of weeks in `marks` (ascending). */
function expectedWalk(player: PlayerState, options: Omit<ExpectedChangeOptions, "weeks">, marks: readonly number[]): number[] {
  const out = marks.map(() => 0);
  const dev = player.attributes.development;
  if (!dev || player.bio.draft === "PROSPECT") return out;
  const rules = options.rules ?? DEFAULT_LEAGUE_RULES;
  const total = marks.reduce((m, x) => Math.max(m, x), 0);
  const base = overallWithCarry(player);
  let mark = 0;
  while (mark < marks.length && marks[mark]! <= 0) mark++;
  const growth = growthOf(dev.growth);
  const games = Math.max(0, rules.gamesPerSeason);
  const seasonWeeks = Math.max(1, phaseWeeks("REGULAR_SEASON", rules));
  // A bye spread over the season: a share of a game each week.
  const gameShare = Math.min(1, games / seasonWeeks);
  const start = { ...options.at };
  const ability = abilityRules(options);
  let p: PlayerState = { ...player, bio: { ...player.bio, creditedSeasons: seasonsIn(player, start.season) } };
  let phaseIndex = CALENDAR_PHASE_ORDER.indexOf(start.phase);
  let week = Math.max(1, Math.min(start.week, phaseWeeks(start.phase, rules)));
  let season = start.season;
  for (let i = 0; i < total; i++) {
    const phase = CALENDAR_PHASE_ORDER[phaseIndex]!;
    const withTeam = PRACTICE_PHASES.has(phase) && phase !== "PLAYOFFS";
    const playing = options.starter && phase === "REGULAR_SEASON";
    const w: PlayerWeek = {
      withTeam,
      practiced: withTeam ? 1 : 0,
      playShare: playing ? gameShare : 0,
      snaps: playing ? EXPECTED_STARTER_SNAPS_PER_GAME * gameShare : 0,
      contests: [],
    };
    const at: CalendarStamp = { season, phase, week, day: 7 };
    let deltas: number[];
    let moved: PlayerState;
    if (ability === undefined) {
      deltas = ratingDeltas(p, weekInputs(p, w, at, rules, growth), () => 0, growth);
      moved = changeBody(p, bodyWeek(p.bio.position, p.bio.age, growth, w.withTeam, phase, rules)).player;
    } else {
      // The ability path, as `developOne` runs it (§12.2.6): his age and record, no position.
      const now = p.attributes.development ?? dev;
      deltas = abilityRatingDeltas(p.bio.age, now, abilityWeekInputs(p, w, at, rules, growth, ability), () => 0, growth, ability, NO_WEAR);
      moved = changeBody(p, abilityBodyWeek(p.bio.age, now, growth, w.withTeam, phase, rules, ability, NO_WEAR), ABILITY_FOLLOWS).player;
    }
    const movedDev = moved.attributes.development ?? dev;
    const values = { ...moved.attributes.values };
    const carry: Record<string, number> = { ...(movedDev.carry as Record<string, number>) };
    MOVED.forEach((attr, k) => addPoints(values, carry, attr, deltas[k]!));
    p = { ...moved, attributes: { ...moved.attributes, values, development: { ...movedDev, carry } } };
    // The calendar moves on a week.
    week++;
    if (week > phaseWeeks(phase, rules)) {
      week = 1;
      do phaseIndex = (phaseIndex + 1) % CALENDAR_PHASE_ORDER.length;
      while (phaseWeeks(CALENDAR_PHASE_ORDER[phaseIndex]!, rules) === 0);
      const next = CALENDAR_PHASE_ORDER[phaseIndex]!;
      if (next === CALENDAR_PHASE_ORDER[0]) {
        season++;
        p = { ...p, bio: { ...p.bio, age: p.bio.age + 1 } };
      }
      if (next === "OFF_EVAL") p = { ...p, bio: { ...p.bio, creditedSeasons: (p.bio.creditedSeasons ?? 0) + 1 } };
    }
    while (mark < marks.length && marks[mark] === i + 1) out[mark++] = overallWithCarry(p) - base;
  }
  return out;
}
