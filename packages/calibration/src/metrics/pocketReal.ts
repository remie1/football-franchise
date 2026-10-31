/**
 * THE POCKET ROWS' REAL SIDES (ADR-089 step 0; plan §5; ADR-089 §2).
 *
 * Every real side of `pocketRows.ts` reads one per-dropback table built here from the cached
 * evidence already ingested (no ingest change, plan §5): pbp's `qb_hit`, `sack`, scramble and
 * situation columns (`ingest/sources/pbp.ts`), participation's `time_to_throw` and `was_pressure`
 * (`participation.ts`), and FTN's `is_throw_away`, `is_qb_out_of_pocket` and `read_thrown`
 * (`ftn.ts`), joined on `gameId|playId` to the repo's dropback filter (`isDropback`,
 * `realInput.ts`).
 *
 * ================== THE FTN CLOCK: 2023-24 ONLY ==================
 *
 * Participation's `time_to_throw` and `was_pressure` are FTN's in 2023-24 and NGS's before (ADR-089
 * §2.1, Orchestrator default D3; the repo's 2.682 s pools the two clocks). Every row whose design
 * figure is FTN's (the release, the release bins, the pressure splits, the situation windows, the
 * clean pocket, the spreads) is restricted here to `FTN_CLOCK_SEASONS`, written in this file and
 * nowhere else (plan §7.2: "without editing `participation.ts`"). The pbp-only rows (hit-or-sack
 * and its sack share) read every season the input carries (2022-24 in a tuning report, `ADR:155`).
 *
 * ================== THE POPULATIONS ==================
 *
 * - **flagged dropback**: an FTN-season dropback whose participation row carries `was_pressure`
 *   (true or false): ADR-089 §2.4's 40,982 (28,619 clean, 12,363 pressured).
 * - **attempt**: `passAttempt && !sack` (`isPassAttempt`'s population), throwaways included.
 * - **aimed throw**: an attempt FTN did not chart as a throwaway (`is_throw_away` not true).
 * - **tick-aligned**: a real release x stands for the sim's tick t when x is in (t - 0.25, t + 0.25]
 *   (ADR-089 §2.2): the comparator while the sim's release is the decision tick (steps 0 to 3).
 *   **Raw seconds** is the comparator once release is `THROW.releaseSeconds` (step 4 on). The rule is
 *   filed with the rows (`RELEASE_GRID_RULE`).
 */
import type { Eligibility } from "../ingest/seasons.js";
import type { FtnChartingRow } from "../ingest/sources/ftn.js";
import type { ParticipationRow } from "../ingest/sources/participation.js";
import { BY_DOWN_DISTANCE, downGroupOf, QUICK_PRESSURE_SECONDS, RELEASE_BINS, releaseBinOf, SITUATION_WINDOW_SECONDS } from "./collect.js";
import type { SituationWindow } from "./collect.js";
import { isDropback, type RealInput } from "./realInput.js";
import { rate, ratioMean, samples, type MetricOutcome } from "./types.js";

/** The seasons on FTN's clock (ADR-089 §2.1, D3). */
export const FTN_CLOCK_SEASONS: readonly number[] = [2023, 2024];

/** Filed with the release rows (ADR-089 §2.2): which real grid a comparison uses. */
export const RELEASE_GRID_RULE =
  "tick-aligned while the sim's release is the decision tick (steps 0 to 3); raw seconds once release is THROW.releaseSeconds (step 4 on)";

export type ReleaseGrid = "TICK" | "RAW";

/** The tick a real release time stands for: x in (t - 0.25, t + 0.25] is tick t. */
export function tickAligned(seconds: number): number {
  const steps = Math.ceil(Math.round(((seconds - 0.25) / 0.5) * 1e9) / 1e9);
  return Math.max(0, steps * 0.5);
}

export interface RealDropback {
  readonly season: number;
  readonly gameId: string;
  readonly playId: number;
  readonly offense: string | null;
  readonly defence: string | null;
  /** pbp's passer; the rusher on a scramble (`realdata/spread.py`'s key). */
  readonly quarterback: string | null;
  readonly down: number | null;
  readonly ydstogo: number | null;
  readonly goalToGo: boolean | null;
  readonly qtr: number | null;
  readonly halfSecondsRemaining: number | null;
  readonly scoreDifferential: number | null;
  readonly sack: boolean;
  readonly scramble: boolean;
  readonly attempt: boolean;
  readonly complete: boolean;
  readonly interception: boolean;
  readonly qbHit: boolean;
  readonly yards: number | null;
  readonly inParticipation: boolean;
  readonly timeToThrow: number | null;
  readonly wasPressure: boolean | null;
  readonly inFtn: boolean;
  readonly throwaway: boolean | null;
  readonly outOfPocket: boolean | null;
  readonly readThrown: string | null;
}

const TABLES = new WeakMap<object, readonly RealDropback[]>();

/** The per-dropback table every pocket real side reads, built once per input. */
export function realDropbacks<E extends Eligibility>(input: RealInput<E>): readonly RealDropback[] {
  const cached = TABLES.get(input);
  if (cached !== undefined) return cached;
  const participation = new Map<string, ParticipationRow>();
  for (const row of input.participation?.rows ?? []) participation.set(`${row.gameId}|${row.playId}`, row);
  const ftn = new Map<string, FtnChartingRow>();
  for (const row of input.ftn?.rows ?? []) ftn.set(`${row.gameId}|${row.playId}`, row);
  const out: RealDropback[] = [];
  for (const row of input.pbp.rows) {
    if (!isDropback(row)) continue;
    const key = `${row.gameId}|${row.playId}`;
    const p = participation.get(key);
    const f = ftn.get(key);
    const sack = row.sack === true;
    const scramble = row.qbScramble === true;
    out.push({
      season: row.season,
      gameId: row.gameId,
      playId: row.playId,
      offense: row.posteam,
      defence: row.defteam,
      quarterback: row.passerPlayerId ?? (scramble ? row.rusherPlayerId : null),
      down: row.down,
      ydstogo: row.ydstogo,
      goalToGo: row.goalToGo,
      qtr: row.qtr,
      halfSecondsRemaining: row.halfSecondsRemaining,
      scoreDifferential: row.scoreDifferential,
      sack,
      scramble,
      attempt: row.passAttempt === true && !sack,
      complete: row.completePass === true,
      interception: row.interception === true,
      qbHit: row.qbHit === true,
      yards: row.yardsGained,
      inParticipation: p !== undefined,
      timeToThrow: p?.timeToThrow ?? null,
      wasPressure: p?.wasPressure ?? null,
      inFtn: f !== undefined,
      throwaway: f?.isThrowAway ?? null,
      outOfPocket: f?.isQbOutOfPocket ?? null,
      readThrown: f?.readThrown ?? null,
    });
  }
  TABLES.set(input, out);
  return out;
}

function noObservations(detail: string): MetricOutcome {
  return { reason: "NO_OBSERVATIONS", detail };
}

const onFtnClock = (d: RealDropback): boolean => FTN_CLOCK_SEASONS.includes(d.season);
/** ADR-089 §2.4's population: an FTN-season dropback carrying the pressure flag. */
export const isFlagged = (d: RealDropback): boolean => onFtnClock(d) && d.wasPressure !== null;
export const isAimed = (d: RealDropback): boolean => d.attempt && d.throwaway !== true;
const isThrowaway = (d: RealDropback): boolean => d.throwaway === true;

function rateOver(rows: readonly RealDropback[], keep: (d: RealDropback) => boolean, hit: (d: RealDropback) => boolean, empty: string): MetricOutcome {
  let n = 0;
  let k = 0;
  for (const d of rows) {
    if (!keep(d)) continue;
    n++;
    if (hit(d)) k++;
  }
  return n === 0 ? noObservations(empty) : rate(k, n);
}

const needsFtnSources = <E extends Eligibility>(input: RealInput<E>, ftn: boolean): string | null => {
  if (input.participation === undefined) return "participation not loaded (open the real input with withParticipation)";
  if (ftn && input.ftn === undefined) return "FTN charting not loaded (open the real input with withFtn)";
  return null;
};

// --- hit-or-sack (pbp, every season in the input) -----------------------------

/**
 * The sim side's construct (`ADR:692`): a sack, or a hit on a play that does not end in a scramble.
 * The scorer never sets `qb_hit` on a scramble (0 of 3,002 in 2022-24, ADR-089 §2.1), so leaving
 * the scramble's hit out moves no real figure; it keeps the two sides one definition.
 */
export const isRealHitOrSack = (d: RealDropback): boolean => d.sack || (d.qbHit && !d.scramble);

export function realHitOrSack<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
  return rateOver(realDropbacks(input), () => true, isRealHitOrSack, "no dropbacks");
}

export function realSackShareOfHitOrSack<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
  return rateOver(realDropbacks(input), isRealHitOrSack, (d) => d.sack, "no hit-or-sack dropbacks");
}

export function realHitOnScramble<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
  return rateOver(realDropbacks(input), (d) => d.scramble, (d) => d.qbHit, "no scrambles");
}

// --- release -------------------------------------------------------------------

/** FTN-season attempts with a release time, on the grid named. */
export function realReleaseTimes<E extends Eligibility>(input: RealInput<E>, grid: ReleaseGrid): readonly number[] {
  const out: number[] = [];
  for (const d of realDropbacks(input)) {
    if (!onFtnClock(d) || !d.attempt || d.timeToThrow === null) continue;
    out.push(grid === "TICK" ? tickAligned(d.timeToThrow) : d.timeToThrow);
  }
  return out;
}

export function realReleaseDistribution<E extends Eligibility>(input: RealInput<E>, grid: ReleaseGrid = "TICK"): MetricOutcome {
  const missing = needsFtnSources(input, false);
  if (missing !== null) return noObservations(missing);
  const times = realReleaseTimes(input, grid);
  return times.length === 0 ? noObservations("no FTN-season attempt with a release time") : samples(times);
}

export interface RealReleaseBin {
  attempts: number;
  pressured: number;
  aimed: number;
  aimedHits: number;
}

/**
 * The real curves by release bin, on the grid named: the pressured share counts throwaways as
 * throws (both sides, ADR-089 §2.2) over attempts carrying `was_pressure`; the hit rate is pbp's
 * `qb_hit` on aimed throws.
 */
export function realReleaseBins<E extends Eligibility>(input: RealInput<E>, grid: ReleaseGrid): Record<string, RealReleaseBin> {
  const out: Record<string, RealReleaseBin> = {};
  for (const bin of RELEASE_BINS) out[bin.label] = { attempts: 0, pressured: 0, aimed: 0, aimedHits: 0 };
  for (const d of realDropbacks(input)) {
    if (!onFtnClock(d) || !d.attempt || d.timeToThrow === null) continue;
    const row = out[releaseBinOf(grid === "TICK" ? tickAligned(d.timeToThrow) : d.timeToThrow)]!;
    if (d.wasPressure !== null) {
      row.attempts++;
      if (d.wasPressure) row.pressured++;
    }
    if (isAimed(d)) {
      row.aimed++;
      if (d.qbHit) row.aimedHits++;
    }
  }
  return out;
}

export function realPressuredShareInBin<E extends Eligibility>(input: RealInput<E>, bin: string, grid: ReleaseGrid = "TICK"): MetricOutcome {
  const missing = needsFtnSources(input, false);
  if (missing !== null) return noObservations(missing);
  const row = realReleaseBins(input, grid)[bin];
  return row === undefined || row.attempts === 0 ? noObservations(`no flagged attempt released in ${bin}`) : rate(row.pressured, row.attempts);
}

export function realHitRateInBin<E extends Eligibility>(input: RealInput<E>, bin: string, grid: ReleaseGrid = "TICK"): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  const row = realReleaseBins(input, grid)[bin];
  return row === undefined || row.aimed === 0 ? noObservations(`no aimed throw released in ${bin}`) : rate(row.aimedHits, row.aimed);
}

/**
 * Hits on aimed throws per dropback, every release bin together (ADR-089:206, the level :88 and
 * :1140 grade; review finding F2): pbp `qb_hit` on an FTN-season attempt FTN did not chart as a
 * throwaway, per FTN-charted FTN-season dropback. On the TUNING cache, 2,907 of 40,982 (7.09, the
 * design's 7.1); `WITH_THROWAWAYS` counts every attempt's hit, 3,311 (8.08, its 8.1).
 */
export function realHitsOnAimedPerDropback<E extends Eligibility>(input: RealInput<E>, counting: "AIMED" | "WITH_THROWAWAYS" = "AIMED"): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  return rateOver(
    realDropbacks(input),
    (d) => onFtnClock(d) && d.inFtn,
    (d) => d.qbHit && (counting === "AIMED" ? isAimed(d) : d.attempt),
    "no FTN-season dropback",
  );
}

/**
 * ADR-089 §2.4's floor under the quick-pressure share: a charted pressure comes before the
 * release, so a pressured attempt released before 2.5 s was first pressured before 2.5 s. Its
 * share of pressured flagged dropbacks (19.6% raw, 13.6% on the tick grid, where "before 2.5" is
 * a tick at or below 2.0, a real time at or below 2.25). A bound, never a comparator.
 */
export function realQuickShareFloor<E extends Eligibility>(input: RealInput<E>, grid: ReleaseGrid): MetricOutcome {
  return rateOver(
    realDropbacks(input),
    (d) => isFlagged(d) && d.wasPressure === true,
    (d) => d.attempt && d.timeToThrow !== null && (grid === "TICK" ? tickAligned(d.timeToThrow) : d.timeToThrow) < QUICK_PRESSURE_SECONDS,
    "no pressured flagged dropback",
  );
}

// --- throwaways and scrambles (flagged dropbacks) --------------------------------

export function realThrowawayRate<E extends Eligibility>(input: RealInput<E>, pressure: "ALL" | "PRESSURED" | "CLEAN"): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  const keep = (d: RealDropback): boolean =>
    isFlagged(d) && (pressure === "ALL" || (pressure === "PRESSURED" ? d.wasPressure === true : d.wasPressure === false));
  return rateOver(realDropbacks(input), keep, isThrowaway, `no ${pressure.toLowerCase()} flagged dropback`);
}

export function realScrambleRate<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
  const missing = needsFtnSources(input, false);
  if (missing !== null) return noObservations(missing);
  return rateOver(realDropbacks(input), isFlagged, (d) => d.scramble, "no flagged dropback");
}

export function realScrambleYards<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
  const missing = needsFtnSources(input, false);
  if (missing !== null) return noObservations(missing);
  const yards: number[] = [];
  for (const d of realDropbacks(input)) if (isFlagged(d) && d.scramble && d.yards !== null) yards.push(d.yards);
  return yards.length === 0 ? noObservations("no flagged scramble") : samples(yards);
}

// --- by down at 7-10 to go ------------------------------------------------------

export interface RealDownRow {
  dropbacks: number;
  pressured: number;
  pressuredSacks: number;
  pressuredThrowaways: number;
}

/** Flagged dropbacks at 7-10 to go, goal-to-go excluded, by down group (ADR-089 §2.3, `:211`). */
export function realByDown<E extends Eligibility>(input: RealInput<E>): Record<string, RealDownRow> {
  const out: Record<string, RealDownRow> = {};
  for (const d of realDropbacks(input)) {
    if (!isFlagged(d) || d.down === null || d.ydstogo === null || d.goalToGo === true) continue;
    if (d.ydstogo < BY_DOWN_DISTANCE.min || d.ydstogo > BY_DOWN_DISTANCE.max) continue;
    const group = downGroupOf(d.down);
    if (group === null) continue;
    const row = (out[group] ??= { dropbacks: 0, pressured: 0, pressuredSacks: 0, pressuredThrowaways: 0 });
    row.dropbacks++;
    if (d.wasPressure === true) {
      row.pressured++;
      if (d.sack) row.pressuredSacks++;
      if (isThrowaway(d)) row.pressuredThrowaways++;
    }
  }
  return out;
}

// --- the guards (aimed throws, FTN seasons) ------------------------------------------

export function realPerAimedThrow<E extends Eligibility>(input: RealInput<E>, what: "INTERCEPTION" | "COMPLETION"): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  return rateOver(
    realDropbacks(input),
    (d) => onFtnClock(d) && d.inFtn && isAimed(d),
    (d) => (what === "INTERCEPTION" ? d.interception : d.complete),
    "no FTN-season aimed throw",
  );
}

/** Completion per attempt on flagged dropbacks, by the pressure flag (the real side of `completion_by_pocket_status`). */
export function realCompletionByPressure<E extends Eligibility>(input: RealInput<E>, pressured: boolean): MetricOutcome {
  const missing = needsFtnSources(input, false);
  if (missing !== null) return noObservations(missing);
  return rateOver(realDropbacks(input), (d) => isFlagged(d) && d.wasPressure === pressured && d.attempt, (d) => d.complete, "no flagged attempt");
}

// --- season spreads -----------------------------------------------------------------

/** The season-spread units' floor (ADR-089 §2.3; `realdata/spread.py`): 300 dropbacks. */
export const SEASON_SPREAD_MIN_DROPBACKS = 300;

export interface BinomialUnit {
  readonly k: number;
  readonly n: number;
}

/**
 * The spread after sampling noise, by the method of moments (`realdata/spread.py`'s
 * `mom_binomial`): the observed variance of the unit rates (n - 1) less the mean binomial noise
 * p(1 - p)/n_i at the pooled rate, floored at 0, square-rooted. Units with no trials are dropped;
 * fewer than two units give `null`.
 */
export function trueBinomialSpread(units: readonly BinomialUnit[]): number | null {
  const kept = units.filter((u) => u.n > 0);
  if (kept.length < 2) return null;
  const rates = kept.map((u) => u.k / u.n);
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const observed = rates.reduce((a, r) => a + (r - mean) * (r - mean), 0) / (rates.length - 1);
  const pooled = kept.reduce((a, u) => a + u.k, 0) / kept.reduce((a, u) => a + u.n, 0);
  const noise = kept.reduce((a, u) => a + (pooled * (1 - pooled)) / u.n, 0) / kept.length;
  return Math.sqrt(Math.max(0, observed - noise));
}

/** A spread as a sample: its value in points, n = the units it spans (a ratio mean, no variance). */
export function spreadSample(units: readonly BinomialUnit[], what: string): MetricOutcome {
  const spread = trueBinomialSpread(units);
  if (spread === null) return noObservations(`fewer than two ${what} with ${SEASON_SPREAD_MIN_DROPBACKS}+ dropbacks`);
  const n = units.filter((u) => u.n > 0).length;
  return ratioMean(100 * spread * n, n);
}

/** P2S units, one per (quarterback or defence, season) with 300+ FTN-season dropbacks. */
export function realSpreadUnits<E extends Eligibility>(input: RealInput<E>, by: "QB" | "DEFENCE"): readonly BinomialUnit[] {
  const units = new Map<string, { dropbacks: number; k: number; n: number }>();
  for (const d of realDropbacks(input)) {
    if (!onFtnClock(d)) continue;
    const who = by === "QB" ? d.quarterback : d.defence;
    if (who === null) continue;
    const key = `${who}|${d.season}`;
    const u = units.get(key) ?? { dropbacks: 0, k: 0, n: 0 };
    u.dropbacks++;
    if (d.wasPressure === true) {
      u.n++;
      if (d.sack) u.k++;
    }
    units.set(key, u);
  }
  return [...units.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([, u]) => u.dropbacks >= SEASON_SPREAD_MIN_DROPBACKS)
    .map(([, u]) => ({ k: u.k, n: u.n }));
}

export function realSeasonSpread<E extends Eligibility>(input: RealInput<E>, by: "QB" | "DEFENCE"): MetricOutcome {
  const missing = needsFtnSources(input, false);
  if (missing !== null) return noObservations(missing);
  return spreadSample(realSpreadUnits(input, by), by === "QB" ? "quarterback-seasons" : "defence-seasons");
}

// --- the clean pocket (§2.4) ------------------------------------------------------------

const cleanFlagged = (d: RealDropback): boolean => isFlagged(d) && d.wasPressure === false;

/** Clean flagged dropbacks FTN charts out of the pocket (`ADR:246`: 10.63 per 100). */
export function realCleanOuts<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  return rateOver(realDropbacks(input), (d) => cleanFlagged(d) && d.inFtn, (d) => d.outOfPocket === true, "no clean flagged dropback");
}

/** Of those, the ones that ended in an aimed throw (ADR-089 §2.4: 62.3%). */
export function realOutOfPocketThrows<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  return rateOver(realDropbacks(input), (d) => cleanFlagged(d) && d.outOfPocket === true, isAimed, "no clean dropback out of the pocket");
}

/** Scramble-drill throws (`read_thrown` SD) per clean aimed throw (ADR-089 §2.4: 3.0%). */
export function realCleanDrillShare<E extends Eligibility>(input: RealInput<E>): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  return rateOver(realDropbacks(input), (d) => cleanFlagged(d) && d.inFtn && isAimed(d), (d) => d.readThrown === "SD", "no clean aimed throw");
}

// --- situation (§2.4) -----------------------------------------------------------------

/**
 * The real window of a snap, from pbp's quarter and half clock: the last 120 s of the second or
 * fourth quarter (split by the offence trailing), of the first or third, every other regulation
 * snap, or overtime. In the first and third quarters the quarter's clock is the half's less 900 s.
 */
export function realWindowOf(d: RealDropback): SituationWindow | null {
  if (d.qtr === null || d.halfSecondsRemaining === null) return null;
  if (d.qtr > 4) return "OVERTIME";
  const quarterClock = d.qtr === 1 || d.qtr === 3 ? d.halfSecondsRemaining - 900 : d.halfSecondsRemaining;
  const late = quarterClock <= SITUATION_WINDOW_SECONDS;
  if (late && (d.qtr === 2 || d.qtr === 4)) return (d.scoreDifferential ?? 0) < 0 ? "HALF_END_TRAILING" : "HALF_END_LEVEL_OR_LEADING";
  if (late) return "Q1Q3_END";
  return "REST";
}

export interface RealSituationRow {
  dropbacks: number;
  pressured: number;
  pressuredSacks: number;
  pressuredThrowaways: number;
  clean: number;
  cleanThrowaways: number;
  attempts: number;
  releaseTotal: number;
}

/** Flagged dropbacks by window (ADR-089 §2.4's situation table). */
export function realSituation<E extends Eligibility>(input: RealInput<E>): Record<string, RealSituationRow> {
  const out: Record<string, RealSituationRow> = {};
  for (const d of realDropbacks(input)) {
    if (!isFlagged(d)) continue;
    const window = realWindowOf(d);
    if (window === null) continue;
    const row = (out[window] ??= { dropbacks: 0, pressured: 0, pressuredSacks: 0, pressuredThrowaways: 0, clean: 0, cleanThrowaways: 0, attempts: 0, releaseTotal: 0 });
    row.dropbacks++;
    if (d.wasPressure === true) {
      row.pressured++;
      if (d.sack) row.pressuredSacks++;
      if (isThrowaway(d)) row.pressuredThrowaways++;
    } else {
      row.clean++;
      if (isThrowaway(d)) row.cleanThrowaways++;
    }
    if (d.attempt && d.timeToThrow !== null) {
      row.attempts++;
      row.releaseTotal += d.timeToThrow;
    }
  }
  return out;
}

/** Pressured throwaways per pressured flagged dropback in the windows named. */
export function realPressuredThrowawaysIn<E extends Eligibility>(input: RealInput<E>, windows: readonly SituationWindow[]): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  const table = realSituation(input);
  let k = 0;
  let n = 0;
  for (const w of windows) {
    k += table[w]?.pressuredThrowaways ?? 0;
    n += table[w]?.pressured ?? 0;
  }
  return n === 0 ? noObservations("no pressured flagged dropback in the window") : rate(k, n);
}

// --- contacts in and out of the pocket (`ADR:290`) ----------------------------------------

/** Sacks per contact (pbp `qb_hit` or sack) on FTN-season dropbacks FTN charts in, or out of, the pocket. */
export function realSackShareOfContacts<E extends Eligibility>(input: RealInput<E>, where: "IN" | "OUT"): MetricOutcome {
  const missing = needsFtnSources(input, true);
  if (missing !== null) return noObservations(missing);
  return rateOver(
    realDropbacks(input),
    (d) => onFtnClock(d) && d.outOfPocket !== null && d.outOfPocket === (where === "OUT") && (d.qbHit || d.sack),
    (d) => d.sack,
    `no contact ${where === "IN" ? "in" : "out of"} the pocket`,
  );
}
