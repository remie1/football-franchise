/**
 * Aging by ability, with no positions (ADR-087 §12.2; step AB3): the rules the development week
 * runs with `aging: "ability"`.
 *
 * - **The owner's rule (R1).** Nothing here reads a man's listed position, his position group or
 *   the side his listed position plays on. His curves and his growth inputs come from his age, his
 *   own record (growth rate, fade shifts) and what he did this week (the chart key his team listed
 *   him at, his snaps). Judging him (his overall at a position) is the callers' business, never this
 *   module's. A test greps this file for the listed-position field and the position-group table.
 * - **The 12 ability groups** (`ABILITY_GROUP_MEMBERS`, contracts' `ABILITY_GROUPS`): each rating in
 *   one group, each group with its own fade. The four body groups (SPEED, QUICKNESS, SPRING, STRENGTH)
 *   fade in the body's measurements; TECHNIQUE, PASSING, KICKING and SMARTS in rating points; ARM,
 *   LEG, STAMINA and DURABILITY keep main's own curves (`OWN_CURVES`), shifted on the loss side only.
 * - **The loss in a year** (§12.2.1): `per × min(cap, max(0, age − start − shift + wear))`. Gains are
 *   scaled by growth as on the position path and are never shifted. `wear` (§12.3.6) adds years to the
 *   body groups and DURABILITY: the development week passes each man's (`wear.ts`, AB6: 0 unless the
 *   spot path's `perContact` is above 0); the expected walk passes 0.
 * - **One fitted set** (Q2): variant D's curves with its learning floor, workouts, smarts and passing
 *   snaps and slow smarts, as the toy fitted them together (`ABILITY_CURVES.D`). Variant B's whole set
 *   (`ABILITY_CURVES.B`, no slow smarts) is kept for tuning arm AB9-T2. The steeper technique fade from
 *   31 (`techniqueKnee`, §12.2.5) and a smarts-snaps override (AB9-T4, O2) are tuning options.
 *
 * Labels: the curves, caps and fitted rules are CHOSEN (fitted in the toy, ADR-087 §12.2.1; the caps
 * are the plan's guesses, which the fit did not move); the knee's age is CHOSEN (the owner's), its
 * second slope a GUESS.
 */
import {
  type AbilityGroup, type CalendarPhase, type GameParticipation, type LeagueRules, type PlayerDevelopment, type Position, type Team,
} from "@ff/contracts";
import { bodyScale, FOLLOWS, type BodyChange, type BodyRating } from "./body.js";
import { curveAt, weeklyShare, workoutShare } from "./curves.js";
import { AGING_SHARES, GROUP_MEMBERS, LEARNING_RATE, OWN_CURVES, SKILL_INPUTS, WORKOUTS, type AgeCurve } from "./developmentTables.js";

// ---------------------------------------------------------------------------------------------
// The options (§12.1).
// ---------------------------------------------------------------------------------------------

/** How the players age (§12.1): main's profiles by position, or the ability curves. */
export type AgingRule = "position" | "ability";
/** The fitted curve sets: D, the base (AB3, AB9-T1), or B, the set fitted without slow smarts (AB9-T2). */
export type AbilityCurveName = "D" | "B";

/**
 * The aging options the development week, `expectedOverallChange` / `expectedOverallPath` and the
 * players' steps take. Each acts only with development on and `aging: "ability"`; absent, each is its
 * default, and the default path is main's to the byte.
 */
export interface AgingOptions {
  /** §12.1. Default `"position"` (§2.4's profiles by position); `"ability"` runs this module's rules. */
  readonly aging?: AgingRule;
  /** The fitted set on the ability path. Default `"D"`; `"B"` swaps in variant B's whole set (AB9-T2). */
  readonly abilityCurves?: AbilityCurveName;
  /** §12.2.5: TECHNIQUE's second, steeper slope from 31 (`TECHNIQUE_KNEE`). Default off (AB9-T3 turns it on). */
  readonly techniqueKnee?: boolean;
  /** Smarts from snaps, points per 1,000 snaps, in place of the set's own (AB9-T4, O2: 0.225). Default the set's. */
  readonly smartsSnaps?: number;
}

/** A fade (§12.2.1): `per` a year for each year past `start`, the years past capped at `cap`. */
export interface Fade {
  /** Age (CHOSEN). */
  readonly start: number;
  /** Per year past: seconds on the 40 (SPEED), on the 3-cone (QUICKNESS), inches on the vertical (SPRING), bench reps (STRENGTH), else rating points. */
  readonly per: number;
  /** Years. */
  readonly cap: number;
}

type FadeGroup = "SPEED" | "QUICKNESS" | "SPRING" | "STRENGTH" | "TECHNIQUE" | "PASSING" | "KICKING" | "SMARTS";

/** One fitted set: the eight fades and the growth rules fitted with them (§12.2.1). */
export interface AbilityCurves extends Readonly<Record<FadeGroup, Fade>> {
  /** The learning rate's floor, in place of main's `LEARNING_RATE.floor` (0.15); the rest of `LEARNING_RATE` is unchanged. */
  readonly learningFloor: number;
  /** Workouts by age, a share of `WORKOUTS`, in place of main's `WORKOUT_AGE`. */
  readonly workoutAge: AgeCurve;
  /** Smarts from snaps, points per 1,000 snaps (× growth), in place of main's `SMARTS_SNAPS` (0.6). */
  readonly smartsSnaps: number;
  /** Passing from snaps: accuracy, touch, release and improvisation, points per 1,000 snaps (× growth). */
  readonly passingSnaps: number;
  /** Slow smarts' c (§12.2.4): smarts points per point of speed and agility lost a year, at a starter's share. 0 = off. */
  readonly slowSmarts: number;
}

/**
 * The fitted sets (ADR-087 §12.2.1; CHOSEN, fitted in the toy, `model/fit.ts`, coordinate descent, 3
 * sweeps, against REAL targets read through the toy's own bias; the caps 8, and 10 for SMARTS, CHOSEN,
 * the plan's guesses). The fit's loss, fit seed / check seed (MEASURED, toy): D 49.0 / 54.5, B 59.6 / 65.1.
 */
export const ABILITY_CURVES: Readonly<Record<AbilityCurveName, AbilityCurves>> = {
  /** Variant D, the base on the ability path (AB3's default, AB9-T1): slow smarts on, part of the fit. */
  D: {
    SPEED: { start: 25, per: 0.00731, cap: 8 },
    QUICKNESS: { start: 23, per: 0.012, cap: 8 },
    SPRING: { start: 28, per: 0.1582, cap: 8 },
    STRENGTH: { start: 28, per: 0.206, cap: 8 },
    TECHNIQUE: { start: 29, per: 0.19775, cap: 8 },
    PASSING: { start: 33, per: 0.625, cap: 8 },
    KICKING: { start: 30, per: 0.58594, cap: 8 },
    SMARTS: { start: 26, per: 0.35156, cap: 10 },
    learningFloor: 0.08,
    workoutAge: [[22, 1], [25, 0.1], [28, 0]],
    smartsSnaps: 0.45,
    passingSnaps: 0.15,
    slowSmarts: 0.2,
  },
  /** Variant B, the set fitted without slow smarts (AB9-T2 only): never D's rows with c = 0 (§12.2.4). */
  B: {
    SPEED: { start: 27, per: 0.00731, cap: 8 },
    QUICKNESS: { start: 22, per: 0.009, cap: 8 },
    SPRING: { start: 31, per: 0.09492, cap: 8 },
    STRENGTH: { start: 31, per: 0.17578, cap: 8 },
    TECHNIQUE: { start: 29, per: 0.35156, cap: 8 },
    PASSING: { start: 29, per: 0.5, cap: 8 },
    KICKING: { start: 30, per: 0.58594, cap: 8 },
    SMARTS: { start: 31, per: 0.3, cap: 10 },
    learningFloor: 0.06,
    workoutAge: [[22, 1], [25, 0.3], [28, 0]],
    smartsSnaps: 0.45,
    passingSnaps: 0.3,
    slowSmarts: 0,
  },
};

/**
 * §12.2.5: the steeper technique fade, as an option (`techniqueKnee`). From effective age `age` (31,
 * CHOSEN, the owner's) TECHNIQUE's loss climbs by `perAfterKnee` a year past instead of the fitted
 * `per` (0.19775). `perAfterKnee` 0.6 is a GUESS; tuning (AB9-T3) sets it.
 */
export const TECHNIQUE_KNEE = { age: 31, perAfterKnee: 0.6 } as const;

/** The smarts-snaps override for AB9-T4 (O2): half of D's 0.45 (CHOSEN, §12.6, "D+O2"). A named value for the flags' help and the tests; any number ≥ 0 is taken. */
export const SMARTS_SNAPS_HALVED = 0.225;

/** The ability path's rules, read once from the options. */
export interface AbilityRules {
  readonly curves: AbilityCurves;
  /** The knee when `techniqueKnee` is on. */
  readonly knee?: typeof TECHNIQUE_KNEE;
  /** Points per 1,000 snaps the smarts take: the override, else the set's. */
  readonly smartsSnaps: number;
}

const AGING_RULES: readonly AgingRule[] = ["position", "ability"];
const CURVE_NAMES: readonly AbilityCurveName[] = ["D", "B"];

/**
 * The ability path's rules for these options, or undefined on the position path. Throws on a value
 * the options do not take (a misspelling must never play the position path, or the wrong set,
 * silently). The tuning options are checked whatever `aging` says, but act only with `"ability"`.
 */
export function abilityRules(o: AgingOptions): AbilityRules | undefined {
  if (o.aging !== undefined && !AGING_RULES.includes(o.aging)) throw new RangeError(`aging is "position" or "ability", not ${JSON.stringify(o.aging)}`);
  if (o.abilityCurves !== undefined && !CURVE_NAMES.includes(o.abilityCurves)) throw new RangeError(`abilityCurves is "D" or "B", not ${JSON.stringify(o.abilityCurves)}`);
  if (o.techniqueKnee !== undefined && typeof o.techniqueKnee !== "boolean") throw new RangeError(`techniqueKnee is true or false, not ${JSON.stringify(o.techniqueKnee)}`);
  if (o.smartsSnaps !== undefined && !(typeof o.smartsSnaps === "number" && Number.isFinite(o.smartsSnaps) && o.smartsSnaps >= 0)) {
    throw new RangeError(`smartsSnaps is a number of points per 1,000 snaps, 0 or more, not ${JSON.stringify(o.smartsSnaps)}`);
  }
  if (o.aging !== "ability") return undefined;
  const curves = ABILITY_CURVES[o.abilityCurves ?? "D"];
  return { curves, ...(o.techniqueKnee === true ? { knee: TECHNIQUE_KNEE } : {}), smartsSnaps: o.smartsSnaps ?? curves.smartsSnaps };
}

/**
 * The options as the players' steps record them in `PlayerMemory.switches` (§12.1, "Records"): only
 * what is not the default, and only on the ability path with development on, where they act. Empty at
 * the defaults, so a save made at the defaults is main's to the byte. A smarts-snaps override equal
 * to the chosen set's own value is the set's rules, so it is dropped too (D and B both take 0.45).
 */
export function agingSwitches(o: AgingOptions, development: boolean): Pick<AgingOptions, "aging" | "abilityCurves" | "techniqueKnee" | "smartsSnaps"> {
  const rules = abilityRules(o);
  if (rules === undefined || !development) return {};
  return {
    aging: "ability",
    ...(o.abilityCurves === "B" ? { abilityCurves: "B" as const } : {}),
    ...(o.techniqueKnee === true ? { techniqueKnee: true } : {}),
    ...(o.smartsSnaps !== undefined && o.smartsSnaps !== rules.curves.smartsSnaps ? { smartsSnaps: o.smartsSnaps } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// The groups (§12.2.1).
// ---------------------------------------------------------------------------------------------

/**
 * Each rating's ability group, plus FIXED (volatility and discipline: personality, Spec #14, never
 * moved). The same table as calibration's `ABILITY_GROUP_COPY` (careerAging.ts), key for key and in
 * the same order, so the two give the same sha256 (`ABILITY_GROUP_DIGEST`); a test pins it here. The
 * four follow ratings (acceleration, mobility, firstStep, pursuit) sit in SPEED, their larger share;
 * they take both shares through `ABILITY_FOLLOWS`. elusiveness and yac sit in QUICKNESS ("Leaving
 * SKILL"). `disguise` is listed in TECHNIQUE as §12.2.1 lists it; no player carries it.
 */
export const ABILITY_GROUP_MEMBERS: Readonly<Record<AbilityGroup | "FIXED", readonly string[]>> = {
  SPEED: ["speed", "acceleration", "mobility", "firstStep", "pursuit"],
  QUICKNESS: ["agility", "elusiveness", "yac"],
  SPRING: ["jumping"],
  STRENGTH: ["strength", "power", "anchor"],
  ARM: ["armStrength"],
  LEG: ["kickPower", "puntPower"],
  STAMINA: ["stamina"],
  DURABILITY: ["durability"],
  TECHNIQUE: [
    "passBlock", "runBlock", "footwork", "sustain", "pullSkill",
    "passRush", "runStuff", "powerMove", "finesseMove", "blockShed",
    "tackling", "zoneCoverage", "manCoverage", "press", "ballSkills",
    "routeRunning", "releaseWR", "catching", "catchInTraffic", "spectacularCatch",
    "ballSecurity", "disguise",
  ],
  PASSING: ["accuracy", "touch", "release", "improvisation"],
  KICKING: ["kickAccuracy", "puntHangTime"],
  SMARTS: [
    "awareness", "reaction", "decisionMaking", "pocketPatience", "poise",
    "playRecognition", "instincts", "vision", "patience", "footballIQ", "gapDiscipline",
  ],
  FIXED: ["volatility", "discipline"],
};

/** Each rating's ability group, read from `ABILITY_GROUP_MEMBERS`. */
export const ABILITY_GROUP_OF: Readonly<Record<string, AbilityGroup | "FIXED">> = Object.fromEntries(
  (Object.entries(ABILITY_GROUP_MEMBERS) as [AbilityGroup | "FIXED", readonly string[]][]).flatMap(([g, ids]) => ids.map((id) => [id, g])),
);

/**
 * What follows the body on the ability path: body.ts `FOLLOWS`, plus elusiveness (quickness .6, speed
 * .3) and yac (.4 / .4), which leave SKILL for QUICKNESS (§12.2.1, "Leaving SKILL"; the toy's
 * `PROPOSED_RATINGS`; the weights CHOSEN). They keep full learning and take no technique fade. Every
 * body change on the ability path moves them: the development week's, and an injury's lasting mark
 * (`healWeek`'s `follows`, passed by the players' steps on the ability path).
 */
export const ABILITY_FOLLOWS: Readonly<Record<string, Readonly<Partial<Record<BodyRating, number>>>>> = {
  ...FOLLOWS,
  elusiveness: { speed: 0.3, agility: 0.6 },
  yac: { speed: 0.4, agility: 0.4 },
};

/** His shift for a group, in years: missing (the record, or the group) or not a finite number reads 0, typical (P7). */
export function shiftOf(shift: PlayerDevelopment["fadeShift"], group: AbilityGroup): number {
  const s = shift?.[group];
  return typeof s === "number" && Number.isFinite(s) ? s : 0;
}

// ---------------------------------------------------------------------------------------------
// The curves.
// ---------------------------------------------------------------------------------------------

/** Years past a fade's start at `age`, for a man `shift` years late, worn `wear` years: capped at the fade's cap. */
export function yearsPast(fade: Fade, age: number, shift: number, wear = 0): number {
  return Math.min(fade.cap, Math.max(0, age - fade.start - shift + wear));
}

/**
 * A group's loss in the year at `age` (positive; the fade's units): `per × yearsPast`, or with the
 * knee, `per` for the years past up to the knee and `perAfterKnee` for those beyond it. Two choices
 * (CHOSEN, §12.2.5 says neither; the AB3 note lists them): the knee is read at the same effective age
 * as the start (age − shift), so a man two years late reaches it two years later; and the years past
 * the knee share the fade's cap, so at the cap TECHNIQUE's yearly loss is 0.19775 × 2 + 0.6 × 6 ≈ 4.0
 * points with the knee on, against 0.19775 × 8 ≈ 1.58 off.
 */
export function fadeLoss(fade: Fade, age: number, shift: number, wear = 0, knee?: { readonly age: number; readonly perAfterKnee: number }): number {
  const past = yearsPast(fade, age, shift, wear);
  if (knee === undefined) return fade.per * past;
  const toKnee = Math.max(0, knee.age - fade.start);
  return fade.per * Math.min(past, toKnee) + knee.perAfterKnee * Math.max(0, past - toKnee);
}

/**
 * §12.2.6: what a year at `age` takes from his body, in the measurements' units, by his own fade
 * shifts (missing reads 0) and `wear` (years, §12.3.6; `wear.ts`). The ability path's
 * `yearOfAging`, with no position: the 40 and 3-cone slower, the vertical and bench lower.
 */
export function abilityYear(age: number, shift: PlayerDevelopment["fadeShift"], wear = 0, curves: AbilityCurves = ABILITY_CURVES.D): BodyChange {
  const loss = (g: "SPEED" | "QUICKNESS" | "SPRING" | "STRENGTH") => fadeLoss(curves[g], age, shiftOf(shift, g), wear);
  return { forty: loss("SPEED"), cone: loss("QUICKNESS"), vertical: -loss("SPRING"), bench: -loss("STRENGTH") };
}

/** §4.2 on the ability path: what a year of workouts adds at `age` and growth `growth`, by the set's workout ages. */
export function abilityWorkoutsYear(age: number, growth: number, curves: AbilityCurves = ABILITY_CURVES.D): BodyChange {
  const scale = curveAt(curves.workoutAge, age) * growth;
  return {
    forty: WORKOUTS.forty * scale, cone: WORKOUTS.cone * scale, vertical: WORKOUTS.vertical * scale,
    bench: WORKOUTS.bench * scale, weightLb: WORKOUTS.weightLb * scale,
  };
}

const MEASURES = ["forty", "cone", "vertical", "bench", "weightLb"] as const;

/**
 * §12.2.6: this week's body change on the ability path: the calendar's share of a year's aging
 * (`abilityYear`), plus this week's workouts. The position path's `bodyWeek`, with no position;
 * `growth` is his growth rate as the week reads it (`growthOf`).
 */
export function abilityBodyWeek(
  age: number, development: Pick<PlayerDevelopment, "fadeShift">, growth: number, withTeam: boolean, phase: CalendarPhase, rules: LeagueRules,
  ability: AbilityRules, wear = 0,
): BodyChange {
  const aging = abilityYear(age, development.fadeShift, wear, ability.curves);
  const workouts = abilityWorkoutsYear(age, growth, ability.curves);
  const ageShare = weeklyShare(AGING_SHARES, phase, rules);
  const workShare = workoutShare(phase, withTeam, rules);
  const out: BodyChange = {};
  for (const m of MEASURES) {
    const d = (aging[m] ?? 0) * ageShare + (workouts[m] ?? 0) * workShare;
    if (d !== 0) out[m] = d;
  }
  return out;
}

/**
 * §12.2.1: the learning rate on the ability path: main's form (`learningRate`, §2.2) with the set's
 * floor in place of `LEARNING_RATE.floor`; the ages and half-lives are main's.
 */
export function abilityLearningRate(age: number, creditedSeasons: number, floor: number): number {
  const { fullUntilAge, ageHalfLife, seasonHalfLife } = LEARNING_RATE;
  const byAge = 0.5 ** (Math.max(0, age - fullUntilAge) / ageHalfLife);
  const bySeasons = 0.5 ** (Math.max(0, creditedSeasons) / seasonHalfLife);
  return floor + (1 - floor) * byAge * bySeasons;
}

/**
 * §12.2.4: the speed and agility rating points a year at `age` takes from him, net of the year's
 * workouts (`abilityYear` plus `abilityWorkoutsYear`, turned into points by body.ts `bodyScale` on his
 * own body); 0 when he gains. The yearly loss slow smarts reads. Draws nothing.
 */
export function legLossYear(age: number, development: Pick<PlayerDevelopment, "fadeShift" | "body">, weightLb: number, growth: number, ability: AbilityRules, wear = 0): number {
  const aging = abilityYear(age, development.fadeShift, wear, ability.curves);
  const workouts = abilityWorkoutsYear(age, growth, ability.curves);
  const body = development.body;
  const before = bodyScale(body, weightLb);
  const after = bodyScale({
    ...body,
    forty: body.forty + (aging.forty ?? 0) + (workouts.forty ?? 0),
    cone: body.cone + (aging.cone ?? 0) + (workouts.cone ?? 0),
  }, weightLb);
  const moved = (after.speed - before.speed) + (after.agility - before.agility);
  return Number.isFinite(moved) ? Math.max(0, -moved) : 0;
}

/**
 * §12.2.4, "smarts from playing slow": what each SMARTS rating gains in a game week,
 * `c × yearly leg loss × share / gamesPerSeason`, `share` capped at 0..1. The development week's
 * share is his snaps over a starter's 65 a game (development.ts `slowSmartsShare`). 0 with c = 0, and
 * for a man who did not play.
 */
export function slowSmartsWeek(c: number, legLoss: number, share: number, rules: Pick<LeagueRules, "gamesPerSeason">): number {
  if (c === 0) return 0;
  const s = Math.max(0, Math.min(1, share));
  if (s === 0) return 0;
  return c * legLoss * s / Math.max(1, rules.gamesPerSeason);
}

// ---------------------------------------------------------------------------------------------
// A week's rating points (§12.2.1).
// ---------------------------------------------------------------------------------------------

/** What a week holds for one player on the ability path, as the development week works it out. Points, already × learning rate × growth where they learn. */
export interface AbilityWeekInputs {
  /** Practice, play and coaching (× the ability learning rate × growth): the same for every rating that learns. */
  readonly common: number;
  /** `disguise`'s own practice and coaching. */
  readonly disguise: number;
  readonly practising: boolean;
  /** Performance by rating. */
  readonly performance: ReadonlyMap<string, number>;
  /** His snaps' straight gain to smarts (× growth only), at the rules' smarts snaps. */
  readonly smartsSnaps: number;
  /** His snaps' straight gain to accuracy, touch, release and improvisation (× growth only). */
  readonly passingSnaps: number;
  /** Slow smarts this week (§12.2.4), added to each SMARTS rating. */
  readonly slowSmarts: number;
  /** This week's share of a year's aging. */
  readonly ageShare: number;
}

const OWN = Object.keys(OWN_CURVES) as (keyof typeof OWN_CURVES)[];

/**
 * This week's points for every rating the development week moves itself, in its fixed order
 * (`GROUP_MEMBERS.BODY_PRACTICE`, `.SKILL`, `.SMARTS`, then the own curves; development.ts `MOVED`),
 * one wobble step per body-plus-practice, skill-list and smarts rating, in that order, as on the
 * position path. Each rating takes its ability group's rule:
 * - acceleration, mobility, firstStep, pursuit, power, anchor: a share of the learning, as today;
 * - TECHNIQUE (disguise its own way, as today): learning less the TECHNIQUE fade (with the knee if on);
 * - PASSING: learning plus passing snaps less the PASSING fade; KICKING: learning less the KICKING fade;
 * - elusiveness, yac (QUICKNESS): learning only; the body moves them (`ABILITY_FOLLOWS`);
 * - SMARTS: learning plus smarts snaps plus slow smarts less the SMARTS fade;
 * - ARM, LEG, STAMINA, DURABILITY: main's own curve, a gain at his age × growth, a loss read at his
 *   shifted age (DURABILITY's also worn).
 * Fades read his age less his shift for the group (missing reads 0).
 */
export function abilityRatingDeltas(
  age: number, development: Pick<PlayerDevelopment, "fadeShift">, inputs: AbilityWeekInputs, wobble: () => number, growth: number,
  ability: AbilityRules, wear = 0,
): number[] {
  const shift = development.fadeShift;
  const out: number[] = [];
  const perf = (attr: string) => (inputs.performance.size === 0 ? 0 : inputs.performance.get(attr) ?? 0);
  const fade = (g: "TECHNIQUE" | "PASSING" | "KICKING" | "SMARTS") =>
    fadeLoss(ability.curves[g], age, shiftOf(shift, g), 0, g === "TECHNIQUE" ? ability.knee : undefined) * inputs.ageShare;
  const technique = fade("TECHNIQUE"), passing = fade("PASSING"), kicking = fade("KICKING"), smarts = fade("SMARTS");
  for (const attr of GROUP_MEMBERS.BODY_PRACTICE) out.push(SKILL_INPUTS.bodyPracticeShare * (inputs.common + perf(attr) + wobble()));
  for (const attr of GROUP_MEMBERS.SKILL) {
    const step = wobble();
    const group = ABILITY_GROUP_OF[attr];
    if (attr === "disguise") out.push((inputs.practising ? inputs.disguise + perf(attr) + step : 0) - technique);
    else if (group === "PASSING") out.push(inputs.common + perf(attr) + step + inputs.passingSnaps - passing);
    else if (group === "KICKING") out.push(inputs.common + perf(attr) + step - kicking);
    else if (group === "TECHNIQUE") out.push(inputs.common + perf(attr) + step - technique);
    else out.push(inputs.common + perf(attr) + step);
  }
  for (const attr of GROUP_MEMBERS.SMARTS) out.push(inputs.common + perf(attr) + wobble() + inputs.smartsSnaps + inputs.slowSmarts - smarts);
  for (const attr of OWN) {
    const curve = OWN_CURVES[attr];
    const group = ABILITY_GROUP_OF[attr] as AbilityGroup;
    const now = curveAt(curve, age);
    const at = age - shiftOf(shift, group) + (group === "DURABILITY" ? wear : 0);
    out.push((now > 0 ? now * growth : Math.min(0, curveAt(curve, at))) * inputs.ageShare);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The weekly inputs' side (§12.2.6): from the chart key, not the listed position.
// ---------------------------------------------------------------------------------------------

/** A side of the ball, and its coordinator's seat. */
export type Side = "offense" | "defense" | "special";

/** Contracts' `Position` order: a man on two chart keys takes the first (CHOSEN; AB1's `SPOT_ORDER`, §12.3.1). */
export const SPOT_ORDER: readonly Position[] = [
  "QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT",
  "DE", "DT", "NT", "OLB", "MLB", "ILB", "CB", "FS", "SS", "K", "P", "LS",
];

/** Each chart key's side: K, P and LS special teams, the offense's eleven spots offense, the rest defense. */
export const SPOT_SIDE: Readonly<Record<Position, Side>> = {
  QB: "offense", RB: "offense", FB: "offense", WR: "offense", TE: "offense",
  LT: "offense", LG: "offense", C: "offense", RG: "offense", RT: "offense",
  DE: "defense", DT: "defense", NT: "defense", OLB: "defense", MLB: "defense", ILB: "defense",
  CB: "defense", FS: "defense", SS: "defense",
  K: "special", P: "special", LS: "special",
};

/** Each man on a team's chart and his spot: the first key in `SPOT_ORDER` that lists him (§12.3.1). */
export function chartSpots(team: Pick<Team, "depthChart">): Map<string, Position> {
  const out = new Map<string, Position>();
  for (const pos of SPOT_ORDER) for (const id of team.depthChart[pos] ?? []) if (!out.has(String(id))) out.set(String(id), pos);
  return out;
}

/**
 * §12.2.6: the side whose coordinator coaches him this week and whose snaps make his share, on the
 * ability path: the side of the chart key that lists him; on no key, the side where most of his snaps
 * came this week (ties: offense, then defense, then special; CHOSEN); on no key with no snaps, none
 * (no coordinator, a share of 0).
 */
export function weekSide(spot: Position | undefined, reports: readonly Pick<GameParticipation, "snaps">[]): Side | undefined {
  if (spot !== undefined) return SPOT_SIDE[spot];
  let offense = 0, defense = 0, special = 0;
  for (const r of reports) { offense += r.snaps.offense; defense += r.snaps.defense; special += r.snaps.special; }
  const most = Math.max(offense, defense, special);
  if (!(most > 0)) return undefined;
  return offense === most ? "offense" : defense === most ? "defense" : "special";
}
