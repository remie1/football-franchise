/**
 * `pnpm --filter @ff/calibration pocket -- --step 0 [--write-filed reports/adr-089-step0.filed.json] [--out <file.json>]`
 *
 * ADR-089 step 0's measurements, M1 to M9 (plan §6, §6.2), and S3's pocket report rows (§6.4), on
 * the corpora of `corpus.ts`, engine-free (every M reads today's stream; no engine arm runs):
 *
 *  - flat and gen, seed set 1, unmirrored: every fold (M1, M2's four arms, M3 and the report rows,
 *    M4, M5's counts, M6, M7, M8, M9);
 *  - flat and gen, seed set 2, unmirrored: M1, M5's counts and M9 (the rows filed on both sets);
 *  - flat and gen, both seed sets, mirrored (`mirror: true`, C1's seam): M5's counts only.
 *
 * M3's real side is play-by-play 2022-24 from the data cache (`data-cache/`, the package folder's,
 * as every calibration command reads it); without it the real side is reported as unavailable.
 *
 * `--write-filed <path>` loads the step-0 filing (S4's `reports/adr-089-step0.filed.json`) through
 * `filed.ts`, refuses a file that is missing or invalid BEFORE anything is played, and fills ONLY
 * its pending `M.<id>` markers (each with its own M table, keyed by `constructs.ts`'s M ids) and its
 * pending `m1Bound.*` markers (M1 on gen seed set 1: E, SD, B1, H, the dropbacks and the two margin
 * classes). Every other pending marker (a base row's value, a band clause's bound) is left for C3
 * and listed. A filed value is never overwritten (`fillPending` refuses). `--out <path>` writes the
 * whole result as JSON. Paths resolve from the working directory, the package folder when pnpm runs
 * the script (as `injuries/main.ts` resolves its `--out`).
 *
 * Steps 0 and 1 are built: any other `--step` is refused, as is any flag this command does not know
 * and any flag of the other step. `--step 1` (its flags parsed here, `Step1Args`) runs `step1.ts`'s
 * `step1Command`, loaded only then. This module only exports; the script's entry is `main.ts`, which calls `pocketCommand` and does
 * nothing else (review finding CT-N6, as `export/main.ts` runs `export/cli.ts`), so importing this
 * module never runs the command.
 *
 * C3 (plan §7.3 items 1 and 5). The seed-set-1 passes also fold S2's accumulator (one game at a
 * time, merged exactly as `runBatch`'s in-process executor merges them) and the guard's class-by-bin
 * counts, so the command (a) fills the filing's remaining markers through `fillC3`: every new row's
 * base value on both leagues (`base.rows.*`) and the twelve clause edges an M table sets (the B1
 * edges, M2's S share, M9's tolerance; `C3_CLAUSE_RULES`), and (b) prints S4's step report
 * (`report.ts`) for the base arm, every row on both leagues. `--out` carries both.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { DEFAULT_CACHE_DIR, fsCacheStore } from "../ingest/cache.js";
import { TUNING_SEASONS } from "../ingest/seasons.js";
import { positionsFromSnapshot } from "../knownTruth/pocketChannelShares.js";
import type { LeagueProvenance } from "../league/provenance.js";
import { emptyAccumulator, foldGame, mergeAccumulators, RELEASE_BINS, releaseBinOf, type SimAccumulator } from "../metrics/collect.js";
import "../metrics/index.js";
import { openRealForTuning, type TuningRealInput } from "../metrics/realInput.js";
import { getMetric } from "../metrics/registry.js";
import { isInapplicable, pointEstimate, type MetricOutcome } from "../metrics/types.js";
import { isArmId, type ArmId } from "./arms.js";
import { BASE_ROW_IDS } from "./bands.js";
import { constructById, M_IDS, NOBODY_OPEN_CLASSES, THROW_CLASSES, type MId, type ThrowClass } from "./constructs.js";
import { ARM_S } from "./m2ForcingSource.js";
import { renderStepReport, type ArmReport, type ClassIntRows, type IntGuardRows, type ReportRow, type StepReportInput } from "./report.js";
import { dropbacksOf, isAimed, throwClassOf } from "./throwClass.js";
import { flatBaseline, genSeason, type CorpusVisitor, type SeedSet } from "./corpus.js";
import { fillPending, loadFiled, pendingPaths, saveFiled, type FiledFile, type JsonValue } from "./filed.js";
import { emptyM1Fold, foldM1Game, m1Result, type M1Fold, type M1Result } from "./m1PushWindow.js";
import { emptyM2Fold, foldM2Game, M2_ARMS, M2_FAR_SECONDS, m2Summary, type M2Fold } from "./m2ForcingSource.js";
import { D34_BAND, loadRealSackerMix, m3Summary, REAL_SACKER_SEASONS, sharesPct, type RealSackerMix } from "./m3SackerMix.js";
import { emptyM4Fold, foldM4Game, m4Summary, type M4Fold } from "./m4AlarmMix.js";
import { m5Compare, m5GameOf, type M5Game, type M5Run } from "./m5Mirror.js";
import { emptyM6Fold, foldM6Game, m6Summary, type M6Fold } from "./m6Contact.js";
import { emptyM7Fold, foldM7Game, m7Summary, type M7Fold } from "./m7Sight.js";
import { emptyM8Fold, foldM8Game, m8Summary, type M8Fold } from "./m8FreeRunClock.js";
import { m9GameOf, m9Table, type M9Game } from "./m9Situation.js";
import { emptyRowsFold, foldRowsGame, pocketRows, type RowsFold } from "./rows.js";
import { LEGACY_RULES, rulesTunables } from "./rules.js";

// --- the arguments -------------------------------------------------------------------------------

export interface PocketArgs {
  readonly step: 0;
  /** Absolute. */
  readonly writeFiled?: string;
  /** Absolute. */
  readonly out?: string;
}

/** Step 1's arguments (`step1.ts`; plan §7.2 item 9). Paths are absolute. */
export interface Step1Args {
  readonly step: 1;
  /** The arms to play, in the order given (`arms.ts`'s ids). Default every arm. */
  readonly arms?: readonly ArmId[];
  /** `--shard i/n`: every n-th arm of the list from the i-th, 1 <= i <= n. */
  readonly shard?: { readonly index: number; readonly count: number };
  /** The cache's parent directory; the source fingerprint is appended. */
  readonly cache?: string;
  /** S-1: only the golden 50 a league under A1 to A4, written to `--out`. */
  readonly digests?: true;
  /** Re-play the named arms on this seed set (the guard-breach rule). */
  readonly seedSet?: SeedSet;
  readonly report?: string;
  readonly out?: string;
}

const STEP0_USAGE = "pocket -- --step 0 [--write-filed <path>] [--out <path>]";
const STEP1_USAGE = "pocket -- --step 1 [--arms A1,A2] [--shard i/n] [--cache <dir>] [--seed-set 1|2] [--report <file.md>] [--out <file.json>], or pocket -- --step 1 --digests --out <file.json>";

/**
 * Reads the command's arguments; paths resolve against `cwd` (the package folder under pnpm).
 * Throws `SyntaxError` on anything else: an unknown flag, a step other than 0 and 1, or a flag of
 * the other step.
 */
export function parsePocketArgs(argv: readonly string[], cwd: string = process.cwd()): PocketArgs | Step1Args {
  let step: 0 | 1 | undefined;
  let writeFiled: string | undefined;
  let out: string | undefined;
  let arms: ArmId[] | undefined;
  let shard: { index: number; count: number } | undefined;
  let cache: string | undefined;
  let digests = false;
  let seedSet: SeedSet | undefined;
  let report: string | undefined;
  const step1Only: string[] = [];
  const step0Only: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] as string;
    const value = (): string => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new SyntaxError(`${arg} requires a value`);
      i += 1;
      return v;
    };
    switch (arg) {
      case "--":
        break;
      case "--step": {
        const v = value();
        if (v !== "0" && v !== "1") throw new SyntaxError(`ADR-089: steps 0 and 1 are built (step 0's measurements and filing, step 1's arms); --step ${v} is not`);
        step = v === "0" ? 0 : 1;
        break;
      }
      case "--write-filed":
        writeFiled = resolve(cwd, value());
        step0Only.push(arg);
        break;
      case "--out":
        out = resolve(cwd, value());
        break;
      case "--arms": {
        const list = value().split(",").map((a) => a.trim());
        for (const a of list) if (!isArmId(a)) throw new SyntaxError(`--arms: ${a === "" ? "an empty arm" : a} is not an arm (A0 to A15, A0b)`);
        if (new Set(list).size !== list.length) throw new SyntaxError(`--arms names an arm twice: ${list.join(",")}`);
        arms = list as ArmId[];
        step1Only.push(arg);
        break;
      }
      case "--shard": {
        const v = value();
        const m = /^([1-9][0-9]*)\/([1-9][0-9]*)$/.exec(v);
        const index = m === null ? Number.NaN : Number(m[1]);
        const count = m === null ? Number.NaN : Number(m[2]);
        if (m === null || index > count) throw new SyntaxError(`--shard takes i/n with 1 <= i <= n; ${v} is not`);
        shard = { index, count };
        step1Only.push(arg);
        break;
      }
      case "--cache":
        cache = resolve(cwd, value());
        step1Only.push(arg);
        break;
      case "--digests":
        digests = true;
        step1Only.push(arg);
        break;
      case "--seed-set": {
        const v = value();
        if (v !== "1" && v !== "2") throw new SyntaxError(`--seed-set takes 1 or 2; ${v} is not`);
        seedSet = v === "1" ? 1 : 2;
        step1Only.push(arg);
        break;
      }
      case "--report":
        report = resolve(cwd, value());
        step1Only.push(arg);
        break;
      default:
        throw new SyntaxError(`unknown argument ${arg} (${step === 1 ? STEP1_USAGE : STEP0_USAGE})`);
    }
  }
  if (step === undefined) throw new SyntaxError(`--step is required: ${STEP0_USAGE}; ${STEP1_USAGE}`);
  if (step === 0) {
    if (step1Only.length > 0) throw new SyntaxError(`${step1Only.join(", ")}: step 1's flags, not step 0's (${STEP0_USAGE})`);
    return { step, ...(writeFiled === undefined ? {} : { writeFiled }), ...(out === undefined ? {} : { out }) };
  }
  if (step0Only.length > 0) throw new SyntaxError(`${step0Only.join(", ")}: step 0's flag, not step 1's (${STEP1_USAGE})`);
  if (digests) {
    const others = [arms && "--arms", shard && "--shard", cache && "--cache", seedSet && "--seed-set", report && "--report"].filter((x): x is string => typeof x === "string");
    if (others.length > 0) throw new SyntaxError(`--digests plays only the golden 50 a league under A1 to A4; it takes --out and nothing else (not ${others.join(", ")})`);
    if (out === undefined) throw new SyntaxError("--digests writes its folds to --out <file>");
    return { step, digests: true, out };
  }
  if (seedSet !== undefined && arms === undefined) throw new SyntaxError("--seed-set re-plays named arms: give --arms <arm>,<base>");
  return {
    step,
    ...(arms === undefined ? {} : { arms }),
    ...(shard === undefined ? {} : { shard }),
    ...(cache === undefined ? {} : { cache }),
    ...(seedSet === undefined ? {} : { seedSet }),
    ...(report === undefined ? {} : { report }),
    ...(out === undefined ? {} : { out }),
  };
}

// --- the run ---------------------------------------------------------------------------------------

export type Step0League = "flat" | "gen";
export const STEP0_LEAGUES: readonly Step0League[] = ["flat", "gen"];

export interface Step0Options {
  /** Tests only: play the first n flat games of each pass. */
  readonly flatFirst?: number;
  /** Tests only: stop the generated season after this week. */
  readonly genThroughWeek?: number;
  /** M3's real side: the data cache, or null to skip it. Default `data-cache` under the working directory. */
  readonly realSackerCache?: string | null;
  readonly log?: (line: string) => void;
}

/** The folds of one league's seed-set-1 unmirrored pass. */
interface FullFolds {
  m2: Map<string, M2Fold>;
  rows: RowsFold;
  m4: M4Fold;
  m6: M6Fold;
  m7: M7Fold;
  m8: M8Fold;
  /** C3: S2's accumulator, each game folded alone and merged, as `runBatch`'s in-process executor does. */
  accumulator: SimAccumulator;
  guard: GuardFold;
}

export interface Step0Result {
  readonly format: "adr-089-step0-measures/v1";
  readonly corpora: Readonly<Record<string, unknown>>;
  /** M1 to M9, keyed by `constructs.ts`'s M ids. */
  readonly M: Readonly<Record<MId, JsonValue>>;
  /** S3's pocket report rows (plan §6.4), by league, seed set 1. */
  readonly rows: Readonly<Record<Step0League, JsonValue>>;
  /** The m1Bound block's values: M1 on gen seed set 1 (deviation O1). */
  readonly m1Bound: {
    readonly E: number;
    readonly SD: number;
    readonly B1: number;
    readonly H: number;
    readonly dropbacks: number;
    readonly margins1to4: JsonValue;
    readonly margins5to14: JsonValue;
  };
  /** C3: every new row's base value on both leagues, seed set 1 (`base.rows`), and the base arm's step report input. */
  readonly base: {
    readonly rows: Readonly<Record<string, { readonly flat: JsonValue; readonly gen: JsonValue }>>;
    readonly report: StepReportInput;
  };
}

// --- C3: the base rows, the guard's class-by-bin counts and the base arm's report ----------------------

/** The provenance each base league's metric context carries (no new row reads it; tier 3 and 4 rows do). */
export const BASE_PROVENANCE: Readonly<Record<Step0League, LeagueProvenance>> = Object.freeze({ flat: "FLAT_SYNTHETIC", gen: "GENERATED_FICTIONAL" });

/**
 * A metric outcome as the filing records it: the counts behind the value, and the value
 * (`pointEstimate`, the number the baseline report and its carry-forward print). A shape keeps its
 * size and mean only (its vector is the fold's); a categorical row keeps its counts.
 */
export function baseRowValue(outcome: MetricOutcome): JsonValue {
  if (isInapplicable(outcome)) return { reason: outcome.reason, detail: outcome.detail };
  const value = pointEstimate(outcome);
  switch (outcome.kind) {
    case "RATE":
      return { kind: "RATE", successes: outcome.successes, trials: outcome.trials, value };
    case "MEAN":
      return { kind: "MEAN", total: outcome.total, n: outcome.n, value };
    case "SAMPLES":
      return { kind: "SAMPLES", n: outcome.values.length, value };
    case "CATEGORICAL":
      return { kind: "CATEGORICAL", counts: Object.fromEntries(Object.entries(outcome.counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
  }
}

/** One league's metric outcome for a registered row, on the league's accumulator. */
export function outcomeOn(id: string, accumulator: SimAccumulator, league: Step0League): MetricOutcome {
  return getMetric(id).computeFromEvents({ accumulator, provenance: BASE_PROVENANCE[league] });
}

/** The registry rows' base values (S2's rows: `constructs.ts` home "registry") on one league. */
export function registryBaseRows(accumulator: SimAccumulator, league: Step0League): Record<string, JsonValue> {
  const out: Record<string, JsonValue> = {};
  for (const id of BASE_ROW_IDS) if (constructById(id)?.home === "registry") out[id] = baseRowValue(outcomeOn(id, accumulator, league));
  return out;
}

/** D28's classes that are aimed throws (THROWAWAY, SCRAMBLE and SACK are not). */
export const AIMED_CLASSES: readonly ThrowClass[] = ["PROGRESSION", "RANK_PUSHED", "CHECKDOWN", "CLEAN_EXPIRY", "DESPERATION", "ON_THE_RUN"];

/** The guard's population by class: aimed throws by release bin (the decision tick, `RELEASE_BINS` order), interceptions, completions. */
export type GuardFold = Record<ThrowClass, { aimedByBin: number[]; interceptions: number; completions: number }>;

export function emptyGuardFold(): GuardFold {
  return Object.fromEntries(THROW_CLASSES.map((c) => [c, { aimedByBin: RELEASE_BINS.map(() => 0), interceptions: 0, completions: 0 }])) as GuardFold;
}

export function foldGuardGame(fold: GuardFold, events: readonly MatchEventEnvelope[], tunables: Tunables): void {
  for (const d of dropbacksOf(events)) {
    if (!isAimed(d) || d.throwTick === undefined) continue;
    const cell = fold[throwClassOf(d, tunables).cls];
    const label = releaseBinOf(d.throwTick);
    const i = RELEASE_BINS.findIndex((b) => b.label === label);
    cell.aimedByBin[i] = (cell.aimedByBin[i] ?? 0) + 1;
    if (d.intercepted) cell.interceptions += 1;
    if (d.caught) cell.completions += 1;
  }
}

const pctOf = (n: number, d: number): number | null => (d === 0 ? null : (100 * n) / d);

/** A registered row's report value: a rate in percent, a mean as it is, a shape's mean; a categorical row has none (its shares go in the note). */
export function reportValue(outcome: MetricOutcome | undefined): number | null {
  if (outcome === undefined || isInapplicable(outcome)) return null;
  const v = pointEstimate(outcome);
  if (v === null || !Number.isFinite(v)) return null;
  return outcome.kind === "RATE" ? 100 * v : v;
}

function categoricalShares(outcome: MetricOutcome): string | undefined {
  if (isInapplicable(outcome) || outcome.kind !== "CATEGORICAL") return undefined;
  const total = Object.values(outcome.counts).reduce((a, b) => a + b, 0);
  if (total === 0) return undefined;
  return Object.entries(outcome.counts)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k} ${((100 * v) / total).toFixed(2)}%`)
    .join(", ");
}

/** The rows the base report prints beside the sacks, P2S and the guard: the four headline rows, then every new row. */
export const REPORT_HEADLINE_ROWS: readonly string[] = ["threat_creation_rate", "hit_or_sack_rate", "sack_rate", "time_to_throw"];

export interface BaseArmInput {
  readonly accumulators: Readonly<Record<Step0League, SimAccumulator>>;
  readonly rows: Readonly<Record<Step0League, Readonly<Record<string, unknown>>>>;
  readonly guard: Readonly<Record<Step0League, GuardFold>>;
  readonly real?: TuningRealInput;
}

/** The base arm of the step-0 report (`report.ts`'s input), from the base corpora's folds. Plain data. */
export function baseArm(input: BaseArmInput): ArmReport {
  const lg = (f: (league: Step0League) => number | null): Record<Step0League, number | null> => ({ flat: f("flat"), gen: f("gen") });
  // No catch (review finding CT-N7): a row without a real figure says so through its outcome (a sim-only
  // row returns NO_OBSERVATIONS, which reportValue prints as nothing); a throw is a bug and fails the run.
  const realOf = (id: string): number | null | undefined =>
    input.real === undefined ? undefined : reportValue(getMetric(id).computeFromReal(input.real));
  const rows: ReportRow[] = [];
  const registryIds = [...REPORT_HEADLINE_ROWS, ...BASE_ROW_IDS.filter((id) => constructById(id)?.home === "registry" && !REPORT_HEADLINE_ROWS.includes(id))];
  for (const id of registryIds) {
    const metric = getMetric(id);
    const outcomes = { flat: outcomeOn(id, input.accumulators.flat, "flat"), gen: outcomeOn(id, input.accumulators.gen, "gen") };
    const shares = [categoricalShares(outcomes.flat), categoricalShares(outcomes.gen)];
    const real = realOf(id);
    rows.push({
      id,
      values: lg((l) => reportValue(outcomes[l])),
      ...(real === undefined ? {} : { real }),
      unit: outcomes.flat !== undefined && !isInapplicable(outcomes.flat) && outcomes.flat.kind === "RATE" ? "%" : metric.unit,
      dp: metric.unit === "seconds" || id === "time_to_throw" ? 3 : 2,
      ...(shares[0] === undefined && shares[1] === undefined ? {} : { note: `flat ${shares[0] ?? "n/a"}; gen ${shares[1] ?? "n/a"}` }),
    });
  }
  const pocket = <T>(league: Step0League, id: string): T => input.rows[league][id] as T;
  type Share = { pct: number };
  type ByClass = Record<string, { aimed: number; value: number }>;
  type Sacker = { splitPct: Record<string, number>; unsplitPct: Record<string, number> };
  for (const part of ["interior", "edge", "offball", "db"]) {
    rows.push({ id: `sacker_mix.split.${part}`, values: lg((l) => pocket<Sacker>(l, "sacker_mix").splitPct[part] ?? null), unit: "%", note: "same-tick arrivals split 0.5 (M3)" });
  }
  rows.push({ id: "sacker_mix.unsplit.interior", values: lg((l) => pocket<Sacker>(l, "sacker_mix").unsplitPct["interior"] ?? null), unit: "%", note: "last ARRIVED rusher, unsplit" });
  rows.push({ id: "multi_channel_share", values: lg((l) => pocket<Share>(l, "multi_channel_share").pct), unit: "%" });
  for (const cls of AIMED_CLASSES) {
    rows.push({ id: `int_per_aimed_by_throw_class.${cls}`, values: lg((l) => (pocket<ByClass>(l, "int_per_aimed_by_throw_class")[cls]?.aimed ? pocket<ByClass>(l, "int_per_aimed_by_throw_class")[cls]!.value : null)), unit: "%" });
  }
  for (const cls of AIMED_CLASSES) {
    rows.push({ id: `completion_per_aimed_by_throw_class.${cls}`, values: lg((l) => (pocket<ByClass>(l, "completion_per_aimed_by_throw_class")[cls]?.aimed ? pocket<ByClass>(l, "completion_per_aimed_by_throw_class")[cls]!.value : null)), unit: "%" });
  }
  rows.push({ id: "nobody_open_share", values: lg((l) => pocket<Share>(l, "nobody_open_share").pct), unit: "% of dropbacks" });
  for (const cls of NOBODY_OPEN_CLASSES) {
    rows.push({
      id: `nobody_open_share.split.${cls}`,
      values: lg((l) => pocket<{ split: Record<string, number> }>(l, "nobody_open_share").split[cls] ?? null),
      unit: "% of dropbacks",
      ...(cls === "SACK" ? { hitOrSack: true } : {}),
    });
  }
  rows.push({ id: "clean_checkdown_share", values: lg((l) => pocket<Share>(l, "clean_checkdown_share").pct), unit: "% of clean aimed throws" });
  rows.push({ id: "clean_later_read_share", values: lg((l) => pocket<Share>(l, "clean_later_read_share").pct), unit: "% of clean aimed throws" });

  const num = (id: string, league: Step0League): number => {
    const v = reportValue(outcomeOn(id, input.accumulators[league], league));
    return v === null ? Number.NaN : v;
  };
  const per = <T>(f: (league: Step0League) => T): Record<Step0League, T> => ({ flat: f("flat"), gen: f("gen") });
  const intGuard = per((league): IntGuardRows => {
    const acc = input.accumulators[league];
    const p = acc.play.pocket;
    const mix = outcomeOn("int_source_mix", acc, league);
    const mixTotal = !isInapplicable(mix) && mix.kind === "CATEGORICAL" ? Object.values(mix.counts).reduce((a, b) => a + b, 0) : 0;
    const byClass: Partial<Record<ThrowClass, ClassIntRows>> = {};
    for (const cls of AIMED_CLASSES) {
      const c = input.guard[league][cls];
      byClass[cls] = { aimedByBin: [...c.aimedByBin], interceptions: c.interceptions, completions: c.completions };
    }
    return {
      intPerAttempt: num("int_rate", league),
      intPerAimed: pctOf(p.aimedInterceptions, p.aimedThrows) ?? Number.NaN,
      forcedThrowShare: pctOf(p.forcedAimedThrows, p.aimedThrows) ?? Number.NaN,
      completionPerAttempt: num("completion_pct", league),
      completionPerAimed: pctOf(p.aimedCompletions, p.aimedThrows) ?? Number.NaN,
      intSourceMix: !isInapplicable(mix) && mix.kind === "CATEGORICAL" && mixTotal > 0 ? Object.fromEntries(Object.entries(mix.counts).map(([k, v]) => [k, (100 * v) / mixTotal])) : {},
      all: { aimedByBin: RELEASE_BINS.map((b) => p.releaseBins[b.label]?.aimed ?? 0), interceptions: p.aimedInterceptions },
      byClass,
    };
  });
  return {
    arm: "base",
    isBase: true,
    clock: "TICK",
    rows,
    timeToThrow: per((l) => num("time_to_throw", l)),
    sacks: per((l) => {
      const play = input.accumulators[l].play;
      return { dropbacks: play.dropbacks, sacks: play.sacks, pressuredSacks: play.pressuredSacks, pressuredDropbacks: play.pressuredDropbacks };
    }),
    p2s: per((l) => num("pressure_to_sack", l)),
    intGuard,
  };
}

/** PR #33 is held open by the owner (2026-10-24 00:18Z), so P2S prints against both references (ADR-089:159, :987). */
export const PR33_STATE = "OPEN" as const;

/** A JSON round trip: plain data only (a Map or an undefined field cannot reach the filing). */
export function sanitize(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function playLeague(league: Step0League, set: SeedSet, mirror: boolean, visit: CorpusVisitor, opts: Step0Options): number {
  const corpus = { ...(mirror ? { mirror: true } : {}) };
  const run =
    league === "flat"
      ? flatBaseline(set, visit, { ...corpus, ...(opts.flatFirst === undefined ? {} : { first: opts.flatFirst }) })
      : genSeason(set, visit, { ...corpus, ...(opts.genThroughWeek === undefined ? {} : { throughWeek: opts.genThroughWeek }) });
  return run.games;
}

function realSackerSide(real: RealSackerMix | { readonly unavailable: string }): JsonValue {
  if ("unavailable" in real) return sanitize({ seasons: REAL_SACKER_SEASONS, ...real });
  return sanitize({
    seasons: REAL_SACKER_SEASONS,
    source: "play-by-play regular-season dropbacks: sack_player_id 1.0, else half_sack_1/2 0.5 each, joined to the season's most common depth-chart position",
    sacks: real.sacks,
    credits: real.credits,
    unknownCredits: real.unknownCredits,
    sharesPct: sharesPct(real.credits),
  });
}

/** Plays every pass and assembles M1-M9 and the rows. */
export async function runStep0(opts: Step0Options = {}): Promise<Step0Result> {
  // K14: the base arm's tunables are what the legacy rules name (the engine's default object itself,
  // the same reference), passed to every fold; no fold file reads the default outside a parameter.
  const tunables: Tunables = rulesTunables(LEGACY_RULES);
  const log = opts.log ?? ((): void => undefined);
  const m1 = new Map<string, M1Result>();
  const m5Runs: M5Run[] = [];
  const m9 = new Map<Step0League, Map<number, M9Game[]>>(STEP0_LEAGUES.map((l) => [l, new Map()]));
  const full = new Map<Step0League, FullFolds>();
  const played: Record<string, number> = {};

  for (const league of STEP0_LEAGUES) {
    for (const set of [1, 2] as const) {
      const started = Date.now();
      const m1Fold: M1Fold = emptyM1Fold();
      const m5Games: M5Game[] = [];
      const m9Games: M9Game[] = [];
      const folds: FullFolds | undefined =
        set === 1
          ? {
              m2: new Map(M2_ARMS.map((a) => [a.id, emptyM2Fold()])),
              rows: emptyRowsFold(),
              m4: emptyM4Fold(),
              m6: emptyM6Fold(),
              m7: emptyM7Fold(),
              m8: emptyM8Fold(),
              accumulator: emptyAccumulator(),
              guard: emptyGuardFold(),
            }
          : undefined;
      const games = playLeague(
        league,
        set,
        false,
        (o, snapshot: GameSnapshot, meta) => {
          const events: readonly MatchEventEnvelope[] = o.events;
          foldM1Game(m1Fold, events);
          m5Games.push(m5GameOf(events, tunables));
          m9Games.push(m9GameOf(events));
          if (folds === undefined) return;
          const positions = positionsFromSnapshot(snapshot);
          foldM2Game(folds.m2, events, { tunables, positions, gameSeed: meta.seed });
          foldRowsGame(folds.rows, events, tunables, positions);
          foldM4Game(folds.m4, events, tunables, positions, meta.seed);
          foldM6Game(folds.m6, events, snapshot, positions, tunables, meta.seed);
          foldM7Game(folds.m7, events, snapshot);
          foldM8Game(folds.m8, events, snapshot, positions, tunables);
          folds.accumulator = mergeAccumulators(folds.accumulator, foldGame(emptyAccumulator(), o));
          foldGuardGame(folds.guard, events, tunables);
        },
        opts,
      );
      played[`${league}/set${String(set)}/unmirrored`] = games;
      m1.set(`${league}/set${String(set)}`, m1Result(m1Fold));
      m5Runs.push({ league, set, mirrored: false, games: m5Games });
      m9.get(league)?.set(set, m9Games);
      if (folds !== undefined) full.set(league, folds);
      log(`pocket: ${league} set ${String(set)} unmirrored, ${String(games)} games, ${String(Math.round((Date.now() - started) / 1000))} s`);

      const mirroredStarted = Date.now();
      const mirroredGames: M5Game[] = [];
      const n = playLeague(league, set, true, (o) => mirroredGames.push(m5GameOf(o.events, tunables)), opts);
      played[`${league}/set${String(set)}/mirrored`] = n;
      m5Runs.push({ league, set, mirrored: true, games: mirroredGames });
      log(`pocket: ${league} set ${String(set)} mirrored, ${String(n)} games, ${String(Math.round((Date.now() - mirroredStarted) / 1000))} s`);
    }
  }

  let real: RealSackerMix | { readonly unavailable: string };
  let realInput: TuningRealInput | undefined;
  const cache = opts.realSackerCache === undefined ? resolve(DEFAULT_CACHE_DIR) : opts.realSackerCache;
  if (cache === null) real = { unavailable: "not asked for (realSackerCache: null)" };
  else {
    try {
      real = await loadRealSackerMix(cache);
    } catch (e: unknown) {
      real = { unavailable: `${cache}: ${e instanceof Error ? e.message : String(e)}` };
    }
    try {
      realInput = await openRealForTuning(fsCacheStore(cache), TUNING_SEASONS, { withParticipation: true, withFtn: true });
    } catch (e: unknown) {
      log(`pocket: the report's real sides are unavailable (${cache}: ${e instanceof Error ? e.message : String(e)})`);
    }
  }

  const byLeague = <T>(f: (folds: FullFolds, league: Step0League) => T): Record<Step0League, T> => {
    const out = {} as Record<Step0League, T>;
    for (const league of STEP0_LEAGUES) {
      const folds = full.get(league);
      if (folds === undefined) throw new Error(`pocket: no seed-set-1 folds for ${league}`);
      out[league] = f(folds, league);
    }
    return out;
  };
  const m1Of = (key: string): M1Result => {
    const r = m1.get(key);
    if (r === undefined) throw new Error(`pocket: no M1 for ${key}`);
    return r;
  };
  const m1PerLeague = (league: Step0League): Record<string, M1Result> => ({ set1: m1Of(`${league}/set1`), set2: m1Of(`${league}/set2`) });

  const M: Record<MId, JsonValue> = {
    M1: sanitize({ definition: "B1 = E + 3 SD over POWER reps of latent margin 1-14 on dropbacks released at 1.0 s or later (deviation O1)", filedFrom: "gen/set1", flat: m1PerLeague("flat"), gen: m1PerLeague("gen") }),
    M2: sanitize({ farSeconds: M2_FAR_SECONDS, firstOrder: "counted at or before today's release; censored share printed (K1)", ...byLeague((f) => Object.fromEntries([...f.m2].map(([arm, fold]) => [arm, m2Summary(fold)]))) }),
    M3: sanitize({ band: D34_BAND, verdict: "reported against D34's band, never pass or fail", sim: byLeague((f) => m3Summary(f.rows.m3)), real: realSackerSide(real) }),
    M4: sanitize(byLeague((f) => m4Summary(f.m4))),
    M5: sanitize({ flat: m5Compare("flat", m5Runs), gen: m5Compare("gen", m5Runs) }),
    M6: sanitize(byLeague((f) => m6Summary(f.m6))),
    M7: sanitize(byLeague((f) => m7Summary(f.m7))),
    M8: sanitize(byLeague((f) => m8Summary(f.m8))),
    M9: sanitize({ flat: m9Table(m9.get("flat") ?? new Map()), gen: m9Table(m9.get("gen") ?? new Map()) }),
  };
  for (const id of M_IDS) if (M[id] === undefined) throw new Error(`pocket: no ${id}`);

  const filedM1 = m1Of("gen/set1");
  const rows = byLeague((f) => sanitize(pocketRows(f.rows)));
  const registry = byLeague((f, league) => registryBaseRows(f.accumulator, league));
  const baseRows: Record<string, { flat: JsonValue; gen: JsonValue }> = {};
  for (const id of BASE_ROW_IDS) {
    const of = (league: Step0League): JsonValue => {
      const v = constructById(id)?.home === "registry" ? registry[league][id] : (rows[league] as Record<string, JsonValue>)[id];
      if (v === undefined) throw new Error(`pocket: no base value for ${id} on ${league}`);
      return v;
    };
    baseRows[id] = { flat: of("flat"), gen: of("gen") };
  }
  const arm = baseArm({
    accumulators: byLeague((f) => f.accumulator),
    rows: rows as Record<Step0League, Record<string, unknown>>,
    guard: byLeague((f) => f.guard),
    ...(realInput === undefined ? {} : { real: realInput }),
  });
  return {
    format: "adr-089-step0-measures/v1",
    corpora: { played, flatFirst: opts.flatFirst ?? null, genThroughWeek: opts.genThroughWeek ?? null },
    M,
    rows,
    m1Bound: {
      E: filedM1.all.E,
      SD: filedM1.all.SD,
      B1: filedM1.all.B1,
      H: filedM1.all.H,
      dropbacks: filedM1.dropbacks,
      margins1to4: sanitize(filedM1.margins1to4),
      margins5to14: sanitize(filedM1.margins5to14),
    },
    base: {
      rows: sanitize(baseRows) as Record<string, { flat: JsonValue; gen: JsonValue }>,
      report: sanitize({ step: "0", pr33: PR33_STATE, arms: [arm] }) as unknown as StepReportInput,
    },
  };
}

// --- the filing -----------------------------------------------------------------------------------

const M1_BOUND_FIELDS = ["E", "SD", "B1", "H", "dropbacks", "margins1to4", "margins5to14"] as const;

export interface FillOutcome {
  readonly file: FiledFile;
  readonly filled: readonly string[];
  /** Pending markers this command does not fill (C3's), with their sources. */
  readonly left: readonly string[];
}

/** Fills the filing's pending `M.<id>` and `m1Bound.*` markers from a step-0 result; nothing else. */
export function fillStep0(file: FiledFile, result: Pick<Step0Result, "M" | "m1Bound">): FillOutcome {
  let out = file;
  const filled: string[] = [];
  const left: string[] = [];
  for (const { path, source } of pendingPaths(file)) {
    const parts = path.split(".");
    if (parts.length === 2 && parts[0] === "M" && (M_IDS as readonly string[]).includes(parts[1] as string)) {
      const id = parts[1] as MId;
      if (source !== id) throw new Error(`pocket: ${path} is pending ${source}, not ${id}`);
      out = fillPending(out, path, result.M[id]);
      filled.push(path);
    } else if (parts.length === 2 && parts[0] === "m1Bound" && (M1_BOUND_FIELDS as readonly string[]).includes(parts[1] as string)) {
      if (source !== "M1") throw new Error(`pocket: ${path} is pending ${source}, not M1`);
      out = fillPending(out, path, sanitize(result.m1Bound[parts[1] as (typeof M1_BOUND_FIELDS)[number]]));
      filled.push(path);
    } else left.push(`${path} (pending ${source})`);
  }
  return { file: out, filled, left };
}

// --- C3: the base rows and the clause edges (plan §7.3 item 1) ---------------------------------------

/**
 * The value each M-set clause edge is filed at, by clause id and field. The filing's `lo`, `hi`
 * and `tolerance` hold ONE number (`filed.ts`), while M1, M2 and M9 measure each league (and M9
 * each row) apart, so each rule says which single number it files; the per-league (and per-row)
 * figures stay in the M block beside it, filed in the same commit:
 *
 *  - **the B1 edges** (s1.S.pressure, s1.window.pressure, s5b.pressure): B1 in points =
 *    100 x `m1Bound.B1` / `m1Bound.dropbacks`, the one filed quantity (deviation O1: one B1 in all
 *    three uses; `m1Bound` is M1 on gen seed set 1). It is the largest of the four league-and-set
 *    figures in `M.M1`, so on flat it is the looser bound;
 *  - **s2.m2** (reported, never graded): `lo` and `hi` are the smaller and the larger of the two
 *    leagues' counter-forced shares under shape S (`M.M2.<league>["S-theta11-window"]`), so the one
 *    interval holds both leagues' figure;
 *  - **M9's tolerances** (s8a.q1q3, acc.q1q3 and their `.passRate` and `.timeToThrow` clauses):
 *    one clause per row, each filed with its own row's Q1/Q3 tolerance in its own unit (review F3):
 *    the throwaway clauses (comparator `situation_q1q3_last_two`, a throwaway row in percent) and
 *    the pass-rate clauses in points (100 x `M.M9.<league>.rows.<row>.Q1Q3_END.tolerance`), the
 *    time-to-throw clauses in seconds; each M9 figure is already the larger of the two seed sets
 *    (deviation O10), and the clause files the larger of the two leagues.
 */
export type ClauseEdge = "lo" | "hi" | "tolerance";

export interface C3Inputs {
  readonly m1Bound: { readonly B1: number; readonly dropbacks: number };
  readonly M2: JsonValue;
  readonly M9: JsonValue;
}

export function b1Points(m1: C3Inputs["m1Bound"]): number {
  if (!(m1.dropbacks > 0)) throw new Error("C3: the M1 bound has no dropbacks");
  return (100 * m1.B1) / m1.dropbacks;
}

function m2SShare(M2: JsonValue, league: Step0League): number {
  const v = (M2 as Record<string, Record<string, { counterFarSharePct?: unknown }>> | null)?.[league]?.[ARM_S.id]?.counterFarSharePct;
  if (typeof v !== "number") throw new Error(`C3: M.M2.${league}["${ARM_S.id}"].counterFarSharePct is not filed`);
  return v;
}

/** M9's Q1/Q3 tolerance for one row on one league, as M9 files it (a fraction for the rates, seconds for time to throw). */
function m9Q1Q3Tolerance(M9: JsonValue, league: Step0League, row: "pass_rate" | "throwaway_rate" | "time_to_throw"): number {
  const v = (M9 as Record<string, { rows?: Record<string, Record<string, { tolerance?: unknown }>> }> | null)?.[league]?.rows?.[row]?.["Q1Q3_END"]?.tolerance;
  if (typeof v !== "number") throw new Error(`C3: M.M9.${league}.rows.${row}.Q1Q3_END.tolerance is not filed`);
  return v;
}

/** The larger league's M9 Q1/Q3 tolerance for one row, in the clause's unit: points for a rate, seconds for time to throw (review F3). */
function m9Q1Q3Clause(row: "pass_rate" | "throwaway_rate" | "time_to_throw"): (x: C3Inputs) => number {
  const scale = row === "time_to_throw" ? 1 : 100;
  return (x) => Math.max(scale * m9Q1Q3Tolerance(x.M9, "flat", row), scale * m9Q1Q3Tolerance(x.M9, "gen", row));
}

export const C3_CLAUSE_RULES: Readonly<Record<string, Readonly<Partial<Record<ClauseEdge, (x: C3Inputs) => number>>>>> = Object.freeze({
  "s1.S.pressure": { hi: (x) => 40 + b1Points(x.m1Bound) },
  "s1.window.pressure": { lo: (x) => -b1Points(x.m1Bound), hi: (x) => b1Points(x.m1Bound) },
  "s5b.pressure": { hi: (x) => 42 + b1Points(x.m1Bound) },
  "s2.m2": { lo: (x) => Math.min(m2SShare(x.M2, "flat"), m2SShare(x.M2, "gen")), hi: (x) => Math.max(m2SShare(x.M2, "flat"), m2SShare(x.M2, "gen")) },
  "s8a.q1q3": { tolerance: m9Q1Q3Clause("throwaway_rate") },
  "s8a.q1q3.passRate": { tolerance: m9Q1Q3Clause("pass_rate") },
  "s8a.q1q3.timeToThrow": { tolerance: m9Q1Q3Clause("time_to_throw") },
  "acc.q1q3": { tolerance: m9Q1Q3Clause("throwaway_rate") },
  "acc.q1q3.passRate": { tolerance: m9Q1Q3Clause("pass_rate") },
  "acc.q1q3.timeToThrow": { tolerance: m9Q1Q3Clause("time_to_throw") },
});

/** The M-set inputs the clause rules read, from a filing whose `m1Bound`, `M.M2` and `M.M9` are filed. */
export function c3InputsOf(file: FiledFile): C3Inputs {
  const { B1, dropbacks } = file.m1Bound;
  if (typeof B1 !== "number" || typeof dropbacks !== "number") throw new Error("C3: m1Bound.B1 and m1Bound.dropbacks must be filed before the clause edges");
  for (const id of ["M2", "M9"] as const) if (isPendingValue(file.M[id])) throw new Error(`C3: M.${id} must be filed before the clause edges`);
  return { m1Bound: { B1, dropbacks }, M2: file.M.M2 as JsonValue, M9: file.M.M9 as JsonValue };
}

const isPendingValue = (v: unknown): boolean => typeof v === "object" && v !== null && !Array.isArray(v) && "pending" in v;

/**
 * C3's fill: every pending `base.rows.<id>` from the base run, then every pending clause edge by
 * `C3_CLAUSE_RULES`. Run after `fillStep0` (the clause edges read the filed `m1Bound`, `M.M2` and
 * `M.M9`). A pending marker no rule names is refused, never guessed; a filed value is never
 * overwritten (`fillPending`).
 */
export function fillC3(file: FiledFile, base: Pick<Step0Result["base"], "rows">): FillOutcome {
  let out = file;
  const filled: string[] = [];
  const left: string[] = [];
  let inputs: C3Inputs | undefined;
  for (const { path, source } of pendingPaths(file)) {
    const parts = path.split(".");
    if (parts.length === 3 && parts[0] === "base" && parts[1] === "rows") {
      if (source !== "BASE") throw new Error(`C3: ${path} is pending ${source}, not BASE`);
      const v = base.rows[parts[2] as string];
      if (v === undefined) throw new Error(`C3: the base run has no value for ${path}`);
      out = fillPending(out, path, sanitize(v));
      filled.push(path);
    } else if (parts.length === 4 && parts[0] === "bands" && parts[1] === "clauses") {
      const clause = out.bands.clauses[Number(parts[2])];
      const edge = parts[3] as ClauseEdge;
      const rule = clause === undefined ? undefined : C3_CLAUSE_RULES[clause.id]?.[edge];
      if (rule === undefined) throw new Error(`C3: ${path} (${clause?.id ?? "no clause"}, pending ${source}) has no filed rule in C3_CLAUSE_RULES`);
      inputs ??= c3InputsOf(out);
      out = fillPending(out, path, rule(inputs));
      filled.push(`${path} (${clause!.id}.${edge})`);
    } else left.push(`${path} (pending ${source})`);
  }
  return { file: out, filled, left };
}

/**
 * The whole fill the command writes: `fillStep0`, then `fillC3`. Pure: it returns the filled filing
 * and writes nothing, and it refuses (throws, naming every field) when any pending field would be
 * left, so a partly filled filing is never saved (review finding CT-N5; plan §7.3: C3 fills every
 * one).
 */
export function completeFiling(
  file: FiledFile,
  result: Pick<Step0Result, "M" | "m1Bound"> & { readonly base: Pick<Step0Result["base"], "rows"> },
): { readonly file: FiledFile; readonly filled: readonly string[] } {
  const measured = fillStep0(file, result);
  const integrated = fillC3(measured.file, result.base);
  const left = pendingPaths(integrated.file).map(({ path, source }) => `${path} (pending ${source})`);
  if (left.length > 0) throw new Error(`the step-0 filing would still have ${String(left.length)} pending fields (plan §7.3: C3 fills every one): ${left.join(", ")}`);
  return { file: integrated.file, filled: [...measured.filled, ...integrated.filled] };
}

/** Loads the filing first, so a missing or invalid file is refused before anything is played. */
export function openFiling(path: string): FiledFile {
  if (!existsSync(path)) throw new Error(`the step-0 filing ${path} does not exist (S4 writes reports/adr-089-step0.filed.json)`);
  return loadFiled(path);
}

// --- the command ----------------------------------------------------------------------------------

function brief(result: Step0Result): string {
  const lines: string[] = [];
  const b = result.m1Bound;
  lines.push(`M1 (gen set 1): E ${b.E.toFixed(2)}, SD ${b.SD.toFixed(2)}, B1 ${b.B1.toFixed(2)}, H ${String(b.H)} of ${String(b.dropbacks)} dropbacks`);
  for (const league of STEP0_LEAGUES) {
    const m3 = (result.M.M3 as { sim: Record<string, { splitPct: unknown; unsplitPct: unknown; sacks: number }> }).sim[league];
    const m4 = (result.M.M4 as Record<string, { multiCause: number; firstNonClean: number; multiCauseSharePct: number }>)[league];
    lines.push(`${league}: M3 split ${JSON.stringify(m3?.splitPct)} unsplit ${JSON.stringify(m3?.unsplitPct)} over ${String(m3?.sacks)} sacks; M4 ${String(m4?.multiCause)} of ${String(m4?.firstNonClean)} (${String(m4?.multiCauseSharePct)}%)`);
  }
  return lines.join("\n");
}

export async function pocketCommand(argv: readonly string[]): Promise<void> {
  const args = parsePocketArgs(argv);
  const log = (line: string): void => {
    process.stderr.write(`${line}\n`);
  };
  if (args.step === 1) {
    // Step 1's harness (step1.ts) is loaded only for step 1. Step 0 does load arms.ts (isArmId, for
    // --arms), but the arm table and the design bundle are built only on first use (review NPC-5).
    const { step1Command } = await import("./step1.js");
    await step1Command(args, log);
    return;
  }
  const filing = args.writeFiled === undefined ? undefined : openFiling(args.writeFiled);
  const result = await runStep0({ log });
  process.stdout.write(`${brief(result)}\n\n`);
  process.stdout.write(`${renderStepReport(result.base.report).join("\n")}\n`);
  if (args.out !== undefined) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`);
    log(`pocket: wrote ${args.out}`);
  }
  if (filing !== undefined && args.writeFiled !== undefined) {
    // Complete or nothing: completeFiling refuses before anything is written (review CT-N5).
    const { file, filled } = completeFiling(filing, result);
    saveFiled(args.writeFiled, file);
    log(`pocket: filled ${String(filled.length)} pending fields of ${args.writeFiled}: ${filled.join(", ")}`);
  }
}
