/**
 * Each man's own hidden growth curve (ADR-087 §12.13; AB9's growth rounds; contracts edits G1 and G2):
 * an option of the ability path, `growth: "curve"` (`aging.ts` `AgingOptions`). The default,
 * `"standard"`, is today's growth, to the byte. The owner's rulings it carries out (2026-11-27):
 *
 * - **A hidden curve for each man, most of them lower.** His level is his stored growth draw (P1,
 *   lognormal, median 1, sdLog 0.25) read wider (`curveGrowthOf`, to the power 1.5: median 1, sdLog
 *   0.375), and his timing (G1, `timingOf`) says when he learns most: early (today's timetable),
 *   steady or late (a late developer keeps learning into his fifth and sixth seasons). No hard age
 *   rule ends any growth. A top player is a high level, a good start, the snaps and a young age.
 * - **Playing time over workouts.** Practice 1.6 and snaps 2.4 points a year (today 2.8 and 1.2),
 *   with workouts at a third (the curve's set, `aging.ts` `GROWTH_CURVE_SET`).
 * - **Snap growth follows the ratings he used** (G2): with the who-played report's count of every
 *   rating he rolled, each rating's snap points follow how often he rolled it per snap, against the
 *   median man who rolls it (`USE_YARDSTICK`); practice stays general. A position with few snaps
 *   (a kicker) is measured per snap, so he is not short-changed. No position is read.
 * - **GMs, coaches and fans never see the curve.** Every read of the year ahead (`expectedOverallChange`,
 *   `expectedOverallPath`) is blind to his level and timing, unless a measuring caller asks for the
 *   truth (`truth: true`); it reads the typical man's (`BLIND_GROWTH`, the timing mix's mean).
 *
 * Labels: practice and snap points and the timing mix are CHOSEN (the owner's, 2026-11-27); the
 * level's power, the technique floor and the curve's set are CHOSEN (tuned in AB9's rounds 3-12,
 * 20-season runs on the joint tree); the timetables for steady and late developers are GUESSES; the
 * yardstick is MEASURED (median rates, 20 flat-league games), its 0.1 top CHOSEN.
 */
import { LEARNING_RATE } from "./developmentTables.js";

/** §12.13: today's growth (the default), or each man's own hidden curve. */
export type GrowthRule = "standard" | "curve";

/** When in his career a man learns most (G1). */
export type GrowthTiming = "early" | "steady" | "late";

/** The curve's numbers (§12.13). */
export const GROWTH_CURVE = {
  /** Points a year from a full year's practice, in place of `SKILL_INPUTS.practicePointsPerYear` (2.8). CHOSEN (owner). */
  practicePointsPerYear: 1.6,
  /** Points a year from every snap of every regular-season game, in place of `SKILL_INPUTS.playPointsPerYear` (1.2). CHOSEN (owner). */
  playPointsPerYear: 2.4,
  /** The skill gains' share that acceleration, mobility, firstStep, pursuit, power and anchor take, in place of 0.4. GUESS. */
  bodyPracticeShare: 0.2,
  /** His level is his stored growth draw to this power (median 1 stays 1; sdLog 0.25 becomes 0.375). CHOSEN (AB9 g8m). */
  levelPower: 1.5,
  /** The stored draw's sdLog (attributes `GROWTH.sdLog`, copied: franchise may not import attributes). */
  storedSdLog: 0.25,
  /** TECHNIQUE's snap points learn at this floor in place of the set's, so playing time keeps technique growing into the late 20s. CHOSEN (AB9 g12). */
  techniqueFloor: 0.25,
  /** Shares of early, steady and late developers. CHOSEN (owner, Q2: 40/40/20 to start). */
  timingMix: { early: 0.4, steady: 0.4, late: 0.2 },
} as const;

/**
 * The seasons factor of the learning rate by credited season (0 = his rookie year) for steady and late
 * developers; early developers keep today's (`½^(seasons / LEARNING_RATE.seasonHalfLife)`). Past the
 * table, 0 (the floor alone). About the same total as an early developer's at 22. GUESS.
 */
export const TIMING_SEASONS: Readonly<Record<"steady" | "late", readonly number[]>> = {
  steady: [0.34, 0.4, 0.48, 0.57, 0.16, 0.05],
  late: [0.12, 0.19, 0.4, 0.54, 0.6, 0.48, 0.22, 0.05],
};

/**
 * G2: a rating's snap points this week are his snap points × min(1, (his rolls of it / all his snaps) /
 * this yardstick): full when he rolls it, per snap, as often as the median man who rolls it at all (20
 * flat-league games, men with 20 or more snaps), up to one roll in ten snaps. A rating no play rolls is
 * absent here and takes his full share, as today (touch, release, pullSkill, spectacularCatch,
 * ballSecurity, puntHangTime and pocketPatience are never rolled yet). MEASURED, the 0.1 top CHOSEN.
 */
export const USE_YARDSTICK: Readonly<Record<string, number>> = {
  acceleration: 0.029, mobility: 0.1, firstStep: 0.063, pursuit: 0.07, power: 0.1, anchor: 0.1,
  accuracy: 0.1, improvisation: 0.1, passBlock: 0.1, runBlock: 0.1, footwork: 0.1, sustain: 0.1,
  passRush: 0.1, runStuff: 0.1, powerMove: 0.1, finesseMove: 0.1, blockShed: 0.063, tackling: 0.1,
  zoneCoverage: 0.03, manCoverage: 0.046, press: 0.1, ballSkills: 0.024, routeRunning: 0.1, releaseWR: 0.1,
  catching: 0.065, catchInTraffic: 0.015, yac: 0.05, elusiveness: 0.092, kickAccuracy: 0.1,
  awareness: 0.098, reaction: 0.022, decisionMaking: 0.1, poise: 0.1, playRecognition: 0.034, instincts: 0.035,
  vision: 0.1, patience: 0.1, footballIQ: 0.1, gapDiscipline: 0.1,
};

/**
 * His level as the curve reads it: the stored draw to `levelPower`, never below 0; a malformed draw
 * (not a finite number) reads as typical, 1, as `growthOf` does.
 */
export function curveGrowthOf(stored: number): number {
  return Number.isFinite(stored) ? Math.max(0, stored) ** GROWTH_CURVE.levelPower : 1;
}

/** The level a reader who cannot see it expects: the mean of `curveGrowthOf` over the stored draw, e^((1.5 × 0.25)² / 2), about 1.0728. */
export const BLIND_GROWTH = Math.exp((GROWTH_CURVE.levelPower ** 2 * GROWTH_CURVE.storedSdLog ** 2) / 2);

/** FNV-1a of his id, as a number in [0, 1): the timing draw a record without G1's number reads. */
export function idTiming(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 2 ** 32;
}

/**
 * His timing (G1): his record's draw (`PlayerDevelopment.timing`, kept to [0, 1)), else one from his id
 * (`idTiming`), cut by the mix: below 0.4 early, below 0.8 steady, else late.
 */
export function timingOf(development: { readonly timing?: number }, id: string): GrowthTiming {
  const stored = development.timing;
  const u = typeof stored === "number" && Number.isFinite(stored) ? Math.min(Math.max(stored, 0), 1 - Number.EPSILON) : idTiming(id);
  const { early, steady } = GROWTH_CURVE.timingMix;
  return u < early ? "early" : u < early + steady ? "steady" : "late";
}

/**
 * The learning rate under the curve: main's form (`LEARNING_RATE`) at `floor`, with the seasons factor
 * by his timing (`TIMING_SEASONS`; early is today's). Draws nothing.
 */
export function curveLearningRate(age: number, creditedSeasons: number, floor: number, timing: GrowthTiming): number {
  const { fullUntilAge, ageHalfLife, seasonHalfLife } = LEARNING_RATE;
  const byAge = 0.5 ** (Math.max(0, age - fullUntilAge) / ageHalfLife);
  const n = Math.max(0, creditedSeasons);
  const bySeasons = timing === "early" ? 0.5 ** (n / seasonHalfLife) : (TIMING_SEASONS[timing][Math.floor(n)] ?? 0);
  return floor + (1 - floor) * byAge * bySeasons;
}

/** The learning rate a reader who cannot see his timing expects: the mix's mean of `curveLearningRate`. */
export function blindLearningRate(age: number, creditedSeasons: number, floor: number): number {
  const { early, steady, late } = GROWTH_CURVE.timingMix;
  return early * curveLearningRate(age, creditedSeasons, floor, "early")
    + steady * curveLearningRate(age, creditedSeasons, floor, "steady")
    + late * curveLearningRate(age, creditedSeasons, floor, "late");
}

/**
 * G2: a rating's share of his snap points this week, from his rolls by rating and his snaps: 1 for a
 * rating no play rolls (absent from `USE_YARDSTICK`), 0 when he took no snap, else min(1, his rolls of
 * it per snap / its yardstick).
 */
export function useShare(attr: string, used: ReadonlyMap<string, number>, snaps: number): number {
  const yard = USE_YARDSTICK[attr];
  if (yard === undefined) return 1;
  if (!(snaps > 0)) return 0;
  return Math.min(1, ((used.get(attr) ?? 0) / snaps) / yard);
}
