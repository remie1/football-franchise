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
 * Only step 0 is built: any other `--step` is refused, as is any flag this command does not know.
 * The command runs only as the script's entry (vite-node); under the test runner (`VITEST` set) the
 * module only exports its functions, which `test/pocketMeasures.test.ts` checks.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { MatchEventEnvelope } from "@ff/contracts";
import { DEFAULT_TUNABLES, type GameSnapshot, type Tunables } from "@ff/engine";
import { DEFAULT_CACHE_DIR } from "../ingest/cache.js";
import { positionsFromSnapshot } from "../knownTruth/pocketChannelShares.js";
import { M_IDS, type MId } from "./constructs.js";
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

// --- the arguments -------------------------------------------------------------------------------

export interface PocketArgs {
  readonly step: 0;
  /** Absolute. */
  readonly writeFiled?: string;
  /** Absolute. */
  readonly out?: string;
}

/** Reads the command's arguments; paths resolve against `cwd`. Throws `SyntaxError` on anything else. */
export function parsePocketArgs(argv: readonly string[], cwd: string = process.cwd()): PocketArgs {
  let step: 0 | undefined;
  let writeFiled: string | undefined;
  let out: string | undefined;
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
        if (v !== "0") throw new SyntaxError(`ADR-089: only step 0 is built (its measurements, benches and filing); --step ${v} is not`);
        step = 0;
        break;
      }
      case "--write-filed":
        writeFiled = resolve(cwd, value());
        break;
      case "--out":
        out = resolve(cwd, value());
        break;
      default:
        throw new SyntaxError(`unknown argument ${arg} (pocket -- --step 0 [--write-filed <path>] [--out <path>])`);
    }
  }
  if (step === undefined) throw new SyntaxError("--step is required: pocket -- --step 0");
  return { step, ...(writeFiled === undefined ? {} : { writeFiled }), ...(out === undefined ? {} : { out }) };
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
}

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
  const tunables: Tunables = DEFAULT_TUNABLES;
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
          ? { m2: new Map(M2_ARMS.map((a) => [a.id, emptyM2Fold()])), rows: emptyRowsFold(), m4: emptyM4Fold(), m6: emptyM6Fold(), m7: emptyM7Fold(), m8: emptyM8Fold() }
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
  const cache = opts.realSackerCache === undefined ? resolve(DEFAULT_CACHE_DIR) : opts.realSackerCache;
  if (cache === null) real = { unavailable: "not asked for (realSackerCache: null)" };
  else {
    try {
      real = await loadRealSackerMix(cache);
    } catch (e: unknown) {
      real = { unavailable: `${cache}: ${e instanceof Error ? e.message : String(e)}` };
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
  return {
    format: "adr-089-step0-measures/v1",
    corpora: { played, flatFirst: opts.flatFirst ?? null, genThroughWeek: opts.genThroughWeek ?? null },
    M,
    rows: byLeague((f) => sanitize(pocketRows(f.rows))),
    m1Bound: {
      E: filedM1.all.E,
      SD: filedM1.all.SD,
      B1: filedM1.all.B1,
      H: filedM1.all.H,
      dropbacks: filedM1.dropbacks,
      margins1to4: sanitize(filedM1.margins1to4),
      margins5to14: sanitize(filedM1.margins5to14),
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
  const filing = args.writeFiled === undefined ? undefined : openFiling(args.writeFiled);
  const result = await runStep0({ log });
  process.stdout.write(`${brief(result)}\n`);
  if (args.out !== undefined) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, `${JSON.stringify(result, null, 2)}\n`);
    log(`pocket: wrote ${args.out}`);
  }
  if (filing !== undefined && args.writeFiled !== undefined) {
    const outcome = fillStep0(filing, result);
    saveFiled(args.writeFiled, outcome.file);
    log(`pocket: filled ${String(outcome.filled.length)} pending fields of ${args.writeFiled}: ${outcome.filled.join(", ")}`);
    if (outcome.left.length > 0) log(`pocket: left for C3: ${outcome.left.join(", ")}`);
  }
}

if (process.env["VITEST"] === undefined) {
  pocketCommand(process.argv.slice(2)).catch((e: unknown) => {
    process.stderr.write(`pocket: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 1;
  });
}
