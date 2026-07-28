/**
 * THE TENDENCY MODEL — what the frozen baseline caller knows, as data.
 *
 * `calibration.md` §3.1: *"Our baseline `PlayCallerProfile` is a simple tendency model fit from
 * real PBP (pass rate by down/distance/score/field position). This deliberately
 * mediocre-but-realistic caller is held CONSTANT across all calibration experiments so observed
 * deltas attribute to mechanics/ratings, not to caller drift."*
 *
 * The whole file is a shape plus a bucketing. The FIT lives in `fit.ts`, the frozen ARTEFACT in
 * `frozenTendencies.ts`, and the caller that consumes it in `frozen.ts`. Keeping the four apart
 * is what lets the artefact be committed and diffed while the fit stays re-runnable.
 *
 * ================== THE BUCKETING, AND WHY IT STOPS WHERE IT DOES ==================
 *
 * Four axes: down, distance band, field region, score state — plus a two-minute flag. That is
 * the split real play-calling tendencies are published at, and it is where nflverse's structured
 * columns stop being unambiguous.
 *
 * Everything past that point is deliberately NOT modelled, and the list is in `frozen.ts`
 * because a caller's omissions are properties of the caller, not of its table.
 *
 * **Cells are sparse by construction.** 4 downs x 4 distance bands x 6 regions x 5 score states
 * x 2 = 960 cells against roughly 100k tuning-season plays, and the distribution is nothing like
 * uniform: 4th-and-15 backed up while trailing by four scores happens a handful of times a
 * decade. So every cell carries its own `n`, and a cell that has not earned its own estimate
 * falls back along a STATED backoff chain rather than being smoothed by a magic constant.
 */

import type { Down, FieldRegion } from "@ff/playbook";

/** Distance bands. The boundaries are the ones `PASS_RATE_PRIOR` already uses, plus a long tail. */
export type DistanceBand = "SHORT" | "MEDIUM" | "LONG" | "VERY_LONG";

export const DISTANCE_BANDS = ["SHORT", "MEDIUM", "LONG", "VERY_LONG"] as const;

export function distanceBand(distance: number): DistanceBand {
  if (distance <= 2) return "SHORT";
  if (distance <= 6) return "MEDIUM";
  if (distance <= 10) return "LONG";
  return "VERY_LONG";
}

/**
 * Score state from the offence's point of view, in scores rather than points. Eight is two
 * scores; four is one score plus a two-point conversion, which is the boundary real game-script
 * analysis uses.
 */
export type ScoreState = "TRAILING_BIG" | "TRAILING" | "NEUTRAL" | "LEADING" | "LEADING_BIG";

export const SCORE_STATES = [
  "TRAILING_BIG",
  "TRAILING",
  "NEUTRAL",
  "LEADING",
  "LEADING_BIG",
] as const;

export function scoreState(differential: number): ScoreState {
  if (differential <= -17) return "TRAILING_BIG";
  if (differential <= -4) return "TRAILING";
  if (differential < 4) return "NEUTRAL";
  if (differential < 17) return "LEADING";
  return "LEADING_BIG";
}

export const FIELD_REGIONS = [
  "BACKED_UP",
  "OWN",
  "MIDFIELD",
  "FRINGE",
  "RED_ZONE",
  "GOAL_LINE",
] as const satisfies readonly FieldRegion[];

export interface TendencyKey {
  readonly down: Down;
  readonly distance: DistanceBand;
  readonly region: FieldRegion;
  readonly score: ScoreState;
  readonly twoMinute: boolean;
}

/** A flat, sortable, diffable cell id. Nothing parses it back apart from the tests. */
export function tendencyKeyId(key: TendencyKey): string {
  return `${key.down}|${key.distance}|${key.region}|${key.score}|${key.twoMinute ? "2M" : "--"}`;
}

/**
 * One fitted cell. `passRate` is the RAW rate over `plays`; the caller applies the backoff.
 * Both are kept because a report that quotes a rate without its sample size is exactly the
 * "naked point estimate" `calibration.md` §3 forbids.
 */
export interface TendencyCell {
  readonly key: string;
  readonly plays: number;
  readonly passes: number;
  readonly passRate: number;
}

/**
 * The four backoff levels, most specific first. A cell with fewer than `minPlays` observations
 * defers to the next level down; the last level is the global pass rate, which by construction
 * always has enough.
 *
 * Stated as data rather than as an `if` chain so a report can print which level each decision
 * came from — "the caller is running on level 3 in the red zone" is a finding.
 */
export type BackoffLevel = "FULL" | "NO_SCORE" | "DOWN_DISTANCE" | "GLOBAL";

export const BACKOFF_LEVELS = ["FULL", "NO_SCORE", "DOWN_DISTANCE", "GLOBAL"] as const;

export function backoffKeys(key: TendencyKey): Readonly<Record<BackoffLevel, string>> {
  return {
    FULL: tendencyKeyId(key),
    NO_SCORE: `${key.down}|${key.distance}|${key.region}|*|${key.twoMinute ? "2M" : "--"}`,
    DOWN_DISTANCE: `${key.down}|${key.distance}|*|*|${key.twoMinute ? "2M" : "--"}`,
    GLOBAL: "*|*|*|*|--",
  };
}

/**
 * The frozen artefact. Everything a report needs to state *which* caller it measured, and
 * everything a reader needs to reproduce it.
 */
export interface FittedTendencies {
  /** Bumped whenever the fit is re-run. A report states this; two reports at different versions are not comparable. */
  readonly version: string;
  /** Seasons the fit consumed. Must be tuning seasons — `fit.ts` enforces it. */
  readonly seasons: readonly number[];
  /** `source@season schema=… fetched=…` lines, straight from `citeManifests`. */
  readonly manifests: readonly string[];
  /** Below this many observations a cell defers to the next backoff level. */
  readonly minPlays: number;
  /** Total plays the fit ran over, after filtering. */
  readonly plays: number;
  /** Cells at every backoff level, keyed by their level-appropriate id. */
  readonly cells: Readonly<Record<string, TendencyCell>>;
  /** Content hash of `cells` + `minPlays` + `seasons`. Detects a hand-edited artefact. */
  readonly contentHash: string;
}

export interface TendencyLookup {
  readonly passRate: number;
  readonly level: BackoffLevel;
  readonly plays: number;
}

export function lookupPassRate(
  tendencies: FittedTendencies,
  key: TendencyKey,
): TendencyLookup {
  const keys = backoffKeys(key);
  for (const level of BACKOFF_LEVELS) {
    const cell = tendencies.cells[keys[level]];
    if (cell !== undefined && cell.plays >= tendencies.minPlays) {
      return { passRate: cell.passRate, level, plays: cell.plays };
    }
  }
  throw new Error(
    `frozen caller: no tendency cell for ${tendencyKeyId(key)} at any backoff level, ` +
      `not even GLOBAL. The artefact (${tendencies.version}) is incomplete.`,
  );
}

/**
 * FNV-1a over the artefact's meaningful content. Not cryptographic and not trying to be — it
 * detects an artefact that was hand-edited without re-running the fit, which is the realistic
 * accident.
 */
export function hashTendencies(input: {
  readonly seasons: readonly number[];
  readonly minPlays: number;
  readonly cells: Readonly<Record<string, TendencyCell>>;
}): string {
  const canonical = JSON.stringify({
    seasons: [...input.seasons].sort((a, b) => a - b),
    minPlays: input.minPlays,
    cells: Object.keys(input.cells)
      .sort()
      .map((k) => {
        const c = input.cells[k];
        return c === undefined ? null : [k, c.plays, c.passes];
      }),
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `fnv1a:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export function assertTendencyIntegrity(tendencies: FittedTendencies): void {
  const expected = hashTendencies(tendencies);
  if (expected !== tendencies.contentHash) {
    throw new Error(
      `frozen caller artefact ${tendencies.version}: contentHash is ${tendencies.contentHash} ` +
        `but its cells hash to ${expected}. The artefact was edited without re-running the fit. ` +
        `A frozen caller that is not frozen makes every batch comparison meaningless ` +
        `(calibration.md §3.1).`,
    );
  }
}
