/**
 * `pnpm --filter @ff/calibration pocket -- --step 1 [--arms A1,A2] [--shard i/n] [--cache <dir>] [--seed-set 1|2] [--report <file.md>] [--out <file.json>]`
 * `pnpm --filter @ff/calibration pocket -- --step 1 --digests --out <file.json>`
 *
 * ADR-089 STEP 1's HARNESS (plan §7.2 item 8, §9.2 to §9.5): plays the arms of `arms.ts` and grades
 * them against the step-0 filing.
 *
 *  - **The filing first.** Nothing is played unless the filing loads, digests to
 *    `STEP0_FILED_DIGEST` (`fnv1a:9a1c90e9`) and holds no pending field on a step-1 clause or on the
 *    M1 bound those clauses read.
 *  - **Each arm** plays the flat league's 496 games (`flatBaseline`) and the generated league's 272
 *    (`genSeason`) on its seed set, at caller v7, through step 0's folds (the registry accumulator
 *    by `foldGame`, the pocket rows, the guard's class-by-bin fold) and the step-1 stream folds
 *    (`s1Stream.ts`), **with the arm's own tunables passed to every fold** (K14; `pocketStep1.test.ts`
 *    asserts no fold file reads `DEFAULT_TUNABLES` outside a default parameter). It also counts
 *    its exclusive affected plays against its base, M1 again on A2's streams (K7), and the throws
 *    on the run split clean and pressured.
 *  - **The cache.** Each arm's record is written under `<cache>/<fingerprint>/`, where the
 *    fingerprint is a sha256 of every package's source, the lockfile and the manifests, and the
 *    filing, each file framed by its path and length (`player-checks`' rule; review CT-9), to
 *    a temporary file of this writer's own (`<arm>.set<n>.json.<pid>.<thread>.<n>.tmp`) and renamed,
 *    so a reader never sees half a file and two writers never share one. A record carries its
 *    stamp; a cached record whose stamp differs from the one this build computes for that arm is
 *    refused (delete it, or use another cache), never re-used.
 *  - **No wall-clock, host or path field** in any record, the measures JSON or the digests JSON:
 *    timings go to stderr only (critique-2 F14, N4, S10), so two runs' files compare with `cmp`.
 *  - **Shards.** `--shard i/n` plays every n-th arm of the list from the i-th; any invocation that
 *    then finds every arm in the cache grades, deterministically, and writes `--report` and `--out`
 *    (each through a temporary file and a rename), so two shards that both finish write the same
 *    bytes. One that does not prints what remains, and writes nothing. With `--arms` naming
 *    exactly one arm, `--out` always receives that arm's record, byte for byte its cache file,
 *    whether or not every arm is cached (S-1b: a cached arm against a fresh process; review CT-4).
 *  - **`--seed-set <n>`** re-plays the named arms on that seed set (§9.4's guard-breach rule:
 *    `--arms <arm>,<base> --seed-set 2`); the re-play grades the guard and prints its own report.
 *  - **`--digests`** plays only the golden 50 a league under A1 to A4 and writes their canonical
 *    and byte folds, counts, stamps and the Node version (S-1: two processes, `cmp`).
 *  - **Grading** (§9.4, K22's three kinds): a structural failure is a build fault; a graded clause
 *    failure is reported as filed (no band moves); a guard breach stops the step and names the
 *    re-play. A committed report (`--report` or `--out` under the package's `reports/`) is refused
 *    from any arm stamped on a dirty tree.
 *
 * Real comparators are not read here (step 0's report carries them): a step-1 record holds only
 * what its own games made, so a cached arm is the same bytes on any machine.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { threadId } from "node:worker_threads";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import type { CallerVersion } from "../caller/anticipate.js";
import { canonicalise, stableDigest } from "../harness/digest.js";
import { positionsFromSnapshot } from "../knownTruth/pocketChannelShares.js";
import { emptyAccumulator, foldGame, mergeAccumulators, type SimAccumulator, type SimGameObservation } from "../metrics/collect.js";
import "../metrics/index.js";
import { isInapplicable } from "../metrics/types.js";
import { ARM_DEFS, ARM_IDS, armById, exclusiveMechanisms, type Arm, type ArmId, type Mechanism } from "./arms.js";
import { FILED_PATH, intGuard, intGuardByClass } from "./bands.js";
import { constructById } from "./constructs.js";
import { flatBaseline, genSeason, goldenGames, type CorpusVisitor, type SeedSet } from "./corpus.js";
import { filedDigest, pendingPaths, STEP0_FILED_DIGEST, type BandClause, type FiledFile, type JsonValue } from "./filed.js";
import { treeState } from "./gitTree.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES } from "./golden.js";
import { emptyM1Fold, foldM1Game, m1Result, type M1Result } from "./m1PushWindow.js";
import {
  LEAGUES,
  renderStep1Sections,
  renderStepReport,
  type ArmReport,
  type League,
  type Step1ArmCounts,
  type Step1ClauseResult,
  type Step1Figures,
  type Step1GuardRow,
  type Step1HeadlineRow,
  type Step1Interaction,
  type Step1Outcome,
  type Step1PricingRow,
  type Step1Sections,
  type Step1Structural,
  type Step1WindowPrice,
  type StepReportInput,
} from "./report.js";
import { emptyRowsFold, foldRowsGame, pocketRows, type RowsFold } from "./rows.js";
import { emptyAffectedFold, emptyS1Folds, foldAffectedGame, foldS1Game, type AffectedFold, type S1Folds } from "./s1Stream.js";
import { baseArm, emptyGuardFold, foldGuardGame, openFiling, outcomeOn, PR33_STATE, registryBaseRows, reportValue, sanitize, type GuardFold, type Step1Args } from "./step0.js";
import { dropbacksOf, isAimed, isCleanDropback, throwClassOf } from "./throwClass.js";

export const STEP1_ARM_FORMAT = "adr-089-step1-arm/v1";
export const STEP1_MEASURES_FORMAT = "adr-089-step1-measures/v1";
export const STEP1_DIGESTS_FORMAT = "adr-089-step1-digests/v1";
/** Every step-1 arm plays caller v7 (ADR-089:941, plan §6.1). */
export const STEP1_CALLER: CallerVersion = "v7";
/** S-1's arms: the golden 50 a league under these. */
export const DIGEST_ARMS: readonly ArmId[] = ["A1", "A2", "A3", "A4"];
/** pkA's flat interaction on pressure, REPORTED (ADR-089:1333). */
export const PKA_INTERACTION = -25.3;
/** Appendix B's gen "Later", the S late arm's context (ADR-089:535, :1971): pressure, hit-or-sack, sacks. */
export const APPENDIX_B_GEN_LATER: Step1Figures = Object.freeze({ pressure: 33.85, hitOrSack: 5.69, sack: 2.47, release: null });

const PKG_ROOT = fileURLToPath(new URL("../..", import.meta.url));

// --- the filing --------------------------------------------------------------------------------------

/**
 * Refuses a filing that leaves a step-1 clause or the M1 bound pending (named first, being the more
 * specific refusal), then one that is not the committed filing (its digest is not `STEP0_FILED_DIGEST`).
 */
export function checkFilingForStep1(file: FiledFile): void {
  const s1 = new Set(file.bands.clauses.flatMap((c, i) => (c.id.startsWith("s1.") ? [String(i)] : [])));
  const pending = pendingPaths(file).filter(({ path }) => {
    const p = path.split(".");
    return (p[0] === "bands" && p[1] === "clauses" && s1.has(p[2] ?? "")) || p[0] === "m1Bound";
  });
  if (pending.length > 0) throw new Error(`ADR-089 step 1: the filing leaves ${pending.map((p) => p.path).join(", ")} pending; every s1.* field must be filed first`);
  const digest = filedDigest(file);
  if (digest !== STEP0_FILED_DIGEST) {
    throw new Error(`ADR-089 step 1: the step-0 filing digests to ${digest}, not ${STEP0_FILED_DIGEST}; step 1 grades only against the committed filing (append-only, amend by a named entry)`);
  }
}

// --- the fingerprint and the stamp ---------------------------------------------------------------------

/** The packages whose source a step-1 arm depends on, every one (player-checks' rule). */
export const FINGERPRINT_PACKAGES: readonly string[] = ["contracts", "engine", "playbook", "attributes", "franchise", "narrative", "calibration"];

/** The files outside the packages' `src` an arm's build also reads: the lockfile and the manifests (review CT-9). */
export const FINGERPRINT_MANIFESTS: readonly string[] = ["pnpm-lock.yaml", "package.json", ...FINGERPRINT_PACKAGES.map((p) => `packages/${p}/package.json`)];

export interface Fingerprint {
  readonly fingerprint: string;
  /** Every file read, repo-relative with `/`, in the order hashed. */
  readonly files: readonly string[];
  /** The directories they were read from, repo-relative. */
  readonly dirs: readonly string[];
}

/**
 * A sha256 over every package's `src/**\/*.ts`, the lockfile and the manifests, and the filing; the
 * first 16 hex digits. Each file is framed as `path NUL length NUL bytes` (review CT-9), so bytes
 * moved from one file into the next, or a file split in two, is a different fingerprint.
 */
export function sourceFingerprint(repoRoot: string, filedPath: string): Fingerprint {
  const hash = createHash("sha256");
  const files: string[] = [];
  const dirs: string[] = [];
  const add = (label: string, bytes: Buffer): void => {
    hash.update(label).update("\0").update(String(bytes.length)).update("\0").update(bytes);
  };
  for (const pkg of FINGERPRINT_PACKAGES) {
    const src = join(repoRoot, "packages", pkg, "src");
    if (!existsSync(src)) throw new Error(`step 1's fingerprint: no ${src}`);
    dirs.push(`packages/${pkg}/src`);
    const list = (readdirSync(src, { recursive: true }) as string[]).filter((f) => f.endsWith(".ts")).map((f) => f.split(sep).join("/")).sort();
    for (const f of list) {
      add(`${pkg}/${f}`, readFileSync(join(src, f)));
      files.push(`packages/${pkg}/src/${f}`);
    }
  }
  for (const m of FINGERPRINT_MANIFESTS) {
    const path = join(repoRoot, m);
    if (!existsSync(path)) throw new Error(`step 1's fingerprint: no ${path}`);
    add(m, readFileSync(path));
    files.push(m);
  }
  add("filing", readFileSync(filedPath));
  files.push(relative(repoRoot, filedPath).split(sep).join("/"));
  return { fingerprint: hash.digest("hex").slice(0, 16), files, dirs };
}

/** The corpus an arm played: the full corpora (null, null) or, in tests only, a cut. */
export interface Step1Corpus {
  readonly flatFirst: number | null;
  readonly genThroughWeek: number | null;
}

export const FULL_CORPUS: Step1Corpus = Object.freeze({ flatFirst: null, genThroughWeek: null });

/** Where and from what a record was made: the build's, not the host's. */
export interface Step1Env {
  readonly fingerprint: string;
  /** HEAD's commit, from the repository's files; "unknown" when they do not say. */
  readonly commit: string;
  readonly dirty: boolean;
  readonly node: string;
}

export interface Step1Stamp {
  readonly arm: ArmId;
  readonly filedDigest: string;
  readonly amendments: "none";
  readonly rules: Arm["rules"];
  readonly overlayDigest?: string;
  readonly tunablesDigest: string;
  readonly patches: readonly string[];
  readonly seedSet: SeedSet;
  readonly caller: CallerVersion;
  readonly corpus: Step1Corpus;
  readonly fingerprint: string;
  readonly commit: string;
  readonly dirty: boolean;
  readonly node: string;
}

export function stampOf(id: ArmId, seedSet: SeedSet, env: Step1Env, corpus: Step1Corpus = FULL_CORPUS): Step1Stamp {
  const arm = armById(id);
  return {
    arm: id,
    filedDigest: STEP0_FILED_DIGEST,
    amendments: "none",
    rules: arm.rules,
    ...(arm.overlayDigest === undefined ? {} : { overlayDigest: arm.overlayDigest }),
    tunablesDigest: arm.tunablesDigest,
    patches: arm.patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`),
    seedSet,
    caller: STEP1_CALLER,
    corpus: { flatFirst: corpus.flatFirst, genThroughWeek: corpus.genThroughWeek },
    fingerprint: env.fingerprint,
    commit: env.commit,
    dirty: env.dirty,
    node: env.node,
  };
}

/** The stamp fields that must agree for a cached record to stand for this build's arm: all but commit and dirty. */
export function stampProblems(got: unknown, want: Step1Stamp): readonly string[] {
  if (typeof got !== "object" || got === null) return ["the record carries no stamp"];
  const g = got as Record<string, unknown>;
  const out: string[] = [];
  for (const [key, value] of Object.entries(want)) {
    if (key === "commit" || key === "dirty") continue;
    // Whole canonical text, not a 32-bit digest of it (review CT-9).
    if (canonicalise(g[key] ?? null) !== canonicalise(value)) out.push(`${key}: cached ${JSON.stringify(g[key] ?? null)}, this build ${JSON.stringify(value)}`);
  }
  for (const key of Object.keys(g)) if (!(key in want) && key !== "overlayDigest") out.push(`${key}: a field this build does not stamp`);
  if ("overlayDigest" in g && !("overlayDigest" in want)) out.push("overlayDigest: cached on an arm this build does not stamp");
  return out;
}

// --- one arm ---------------------------------------------------------------------------------------------

/** One league's figures for the step-1 sections and the grading. */
export interface ArmMeasures {
  readonly games: number;
  readonly dropbacks: number;
  readonly pressure: number | null;
  readonly hitOrSack: number | null;
  readonly sack: number | null;
  readonly release: number | null;
  readonly timeToThrow: number | null;
  readonly p2s: number | null;
  readonly quickPressure: number | null;
  /** The band floor plus the counter (`first_pressure_origin`'s COUNTER), percent of first dirt. */
  readonly floorCounter: number | null;
  readonly firstPressureOrigin: Readonly<Record<string, number>>;
  readonly cleanWithLiveWonRep: { readonly ticks: number | null; readonly dropbacks: number | null; readonly pushTicks: number | null };
  readonly passRushWin: number | null;
  readonly missRuleN: number | null;
}

export interface OnTheRun {
  clean: { aimed: number; interceptions: number };
  pressured: { aimed: number; interceptions: number };
}

export interface ArmRecord {
  readonly format: typeof STEP1_ARM_FORMAT;
  readonly stamp: Step1Stamp;
  /** Step 0's report input for this arm (`baseArm`, the arm's name, not yet placed in a group). */
  readonly report: ArmReport;
  readonly measures: Readonly<Record<League, ArmMeasures>>;
  readonly s1: Readonly<Record<League, S1Folds>>;
  readonly affected?: { readonly against: ArmId; readonly mechanisms: readonly Mechanism[]; readonly flat: AffectedFold; readonly gen: AffectedFold };
  /** M1 on A2's streams (K7). */
  readonly m1?: Readonly<Record<League, M1Result>>;
  /** A0 only: every base row as the filing records it (`base.rows`), for the OFF arm's check. */
  readonly baseRows?: Readonly<Record<string, { readonly flat: JsonValue; readonly gen: JsonValue }>>;
}

/** The arm an arm's affected plays and pricing rows read against: its base, or A0 for A14 (the hold's own rows). */
export function referenceOf(id: ArmId): ArmId | undefined {
  const def = ARM_DEFS.find((d) => d.id === id);
  return def?.base ?? (id === "A14" ? "A0" : undefined);
}

export function emptyOnTheRun(): OnTheRun {
  return { clean: { aimed: 0, interceptions: 0 }, pressured: { aimed: 0, interceptions: 0 } };
}

/** Aimed throws on the run, split by whether the dropback stayed clean (ADR-089:1308). */
export function foldOnTheRun(fold: OnTheRun, events: readonly MatchEventEnvelope[], tunables: Tunables): void {
  for (const d of dropbacksOf(events)) {
    if (!isAimed(d) || d.throwTick === undefined || throwClassOf(d, tunables).cls !== "ON_THE_RUN") continue;
    const cell = isCleanDropback(d) ? fold.clean : fold.pressured;
    cell.aimed += 1;
    if (d.intercepted) cell.interceptions += 1;
  }
}

interface LeagueFolds {
  accumulator: SimAccumulator;
  rows: RowsFold;
  guard: GuardFold;
  s1: S1Folds;
  affected: AffectedFold | undefined;
  m1: ReturnType<typeof emptyM1Fold> | undefined;
  onTheRun: OnTheRun;
  games: number;
}

/** Folds one game of the arm into every fold, with the arm's tunables (K14). */
export function foldStep1Game(f: LeagueFolds, o: SimGameObservation, snapshot: GameSnapshot, tunables: Tunables, mechanisms: readonly Mechanism[]): void {
  const events = o.events;
  const positions = positionsFromSnapshot(snapshot);
  f.games += 1;
  foldRowsGame(f.rows, events, tunables, positions);
  f.accumulator = mergeAccumulators(f.accumulator, foldGame(emptyAccumulator(), o, tunables));
  foldGuardGame(f.guard, events, tunables);
  foldS1Game(f.s1, events, tunables);
  if (f.affected !== undefined) foldAffectedGame(f.affected, events, tunables, mechanisms);
  if (f.m1 !== undefined) foldM1Game(f.m1, events);
  foldOnTheRun(f.onTheRun, events, tunables);
}

export function emptyLeagueFolds(id: ArmId, mechanisms: readonly Mechanism[] | undefined): LeagueFolds {
  return {
    accumulator: emptyAccumulator(),
    rows: emptyRowsFold(),
    guard: emptyGuardFold(),
    s1: emptyS1Folds(),
    affected: mechanisms === undefined ? undefined : emptyAffectedFold(mechanisms),
    m1: id === "A2" ? emptyM1Fold() : undefined,
    onTheRun: emptyOnTheRun(),
    games: 0,
  };
}

function measuresOf(f: LeagueFolds, league: League): ArmMeasures {
  const v = (id: string): number | null => reportValue(outcomeOn(id, f.accumulator, league));
  const origin = outcomeOn("first_pressure_origin", f.accumulator, league);
  const counts = !isInapplicable(origin) && origin.kind === "CATEGORICAL" ? origin.counts : {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    games: f.games,
    dropbacks: f.accumulator.play.dropbacks,
    pressure: v("threat_creation_rate"),
    hitOrSack: v("hit_or_sack_rate"),
    sack: v("sack_rate"),
    release: v("release_distribution"),
    timeToThrow: v("time_to_throw"),
    p2s: v("pressure_to_sack"),
    quickPressure: v("quick_pressure_share_by_origin"),
    floorCounter: total > 0 ? (100 * (counts["COUNTER"] ?? 0)) / total : null,
    firstPressureOrigin: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))),
    cleanWithLiveWonRep: { ticks: v("clean_with_live_won_rep_ticks"), dropbacks: v("clean_with_live_won_rep_dropbacks"), pushTicks: v("clean_with_live_won_rep_push_ticks") },
    passRushWin: v("pbwr_sim_only"),
    missRuleN: v("pressured_share_2s_no_free_runner"),
  };
}

export interface PlayArmOptions {
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
}

/** Plays one arm on both leagues at its seed set and returns its record (plain data). */
export function playArm(id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayArmOptions = {}): ArmRecord {
  const arm = armById(id);
  const corpus = opts.corpus ?? FULL_CORPUS;
  const tunables = arm.tunables;
  const reference = referenceOf(id);
  const mechanisms = reference === undefined ? undefined : id === "A14" ? exclusiveMechanisms({ ...arm, base: "A0" }) : exclusiveMechanisms(arm);
  const folds = {} as Record<League, LeagueFolds>;
  for (const league of LEAGUES) {
    const f = emptyLeagueFolds(id, mechanisms);
    const visit: CorpusVisitor = (o, snapshot) => foldStep1Game(f, o, snapshot, tunables, mechanisms ?? []);
    const game = { tunables, callerVersion: STEP1_CALLER };
    if (league === "flat") flatBaseline(seedSet, visit, { ...game, ...(corpus.flatFirst === null ? {} : { first: corpus.flatFirst }) });
    else genSeason(seedSet, visit, { ...game, ...(corpus.genThroughWeek === null ? {} : { throughWeek: corpus.genThroughWeek }) });
    folds[league] = f;
    opts.log?.(`pocket step 1: ${id} ${league} seed set ${String(seedSet)}, ${String(f.games)} games`);
  }
  const rows = { flat: sanitize(pocketRows(folds.flat.rows)) as Record<string, unknown>, gen: sanitize(pocketRows(folds.gen.rows)) as Record<string, unknown> };
  const base = baseArm({ accumulators: { flat: folds.flat.accumulator, gen: folds.gen.accumulator }, rows, guard: { flat: folds.flat.guard, gen: folds.gen.guard } });
  const report: ArmReport = {
    ...base,
    arm: id,
    isBase: false,
    intGuard: { flat: { ...base.intGuard.flat, onTheRun: folds.flat.onTheRun }, gen: { ...base.intGuard.gen, onTheRun: folds.gen.onTheRun } },
    ...(folds.flat.affected === undefined || folds.gen.affected === undefined ? {} : { affectedPlays: { flat: folds.flat.affected.union, gen: folds.gen.affected.union } }),
  };
  let baseRows: Record<string, { flat: JsonValue; gen: JsonValue }> | undefined;
  if (id === "A0") {
    const registry = { flat: registryBaseRows(folds.flat.accumulator, "flat"), gen: registryBaseRows(folds.gen.accumulator, "gen") };
    baseRows = {};
    for (const rowId of Object.keys(registry.flat)) baseRows[rowId] = { flat: registry.flat[rowId] as JsonValue, gen: registry.gen[rowId] as JsonValue };
    for (const rowId of Object.keys(rows.flat)) {
      if (constructById(rowId)?.home !== "pocket-row") continue;
      baseRows[rowId] = { flat: rows.flat[rowId] as JsonValue, gen: rows.gen[rowId] as JsonValue };
    }
  }
  const record = {
    format: STEP1_ARM_FORMAT,
    stamp: stampOf(id, seedSet, env, corpus),
    report,
    measures: { flat: measuresOf(folds.flat, "flat"), gen: measuresOf(folds.gen, "gen") },
    s1: { flat: folds.flat.s1, gen: folds.gen.s1 },
    ...(reference === undefined || mechanisms === undefined ? {} : { affected: { against: reference, mechanisms, flat: folds.flat.affected!, gen: folds.gen.affected! } }),
    ...(folds.flat.m1 === undefined || folds.gen.m1 === undefined ? {} : { m1: { flat: m1Result(folds.flat.m1), gen: m1Result(folds.gen.m1) } }),
    ...(baseRows === undefined ? {} : { baseRows }),
  };
  return sanitize(record) as unknown as ArmRecord;
}

// --- files ---------------------------------------------------------------------------------------------

/** Plain data as the files hold it: two-space JSON and a final newline. */
export const jsonText = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

let tmpCount = 0;

/**
 * Writes a temporary file beside `path` and renames it over `path`, so no reader sees half a file.
 * The temporary name is this writer's own, `<path>.<pid>.<thread>.<n>.tmp` (review CT-1): two
 * writers of one path (two shards that finish together and share `--report` or `--out`, or two
 * overlapping runs of one arm into one cache) never share one, so neither replaces the file the
 * other is about to rename, and the last rename wins whole. A temporary file whose write or rename
 * failed is removed. The name never reaches a record.
 */
export function writeAtomic(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  tmpCount += 1;
  const tmp = `${path}.${String(process.pid)}.${String(threadId)}.${String(tmpCount)}.tmp`;
  let renamed = false;
  try {
    writeFileSync(tmp, text);
    renameSync(tmp, path);
    renamed = true;
  } finally {
    if (!renamed) rmSync(tmp, { force: true });
  }
}

export const armFileOf = (dir: string, id: ArmId, seedSet: SeedSet): string => join(dir, `${id}.set${String(seedSet)}.json`);

/** The arms an invocation is asked for, and the set whose completion it grades. */
export interface Step1Plan {
  readonly targets: readonly { readonly id: ArmId; readonly seedSet: SeedSet }[];
  readonly complete: readonly { readonly id: ArmId; readonly seedSet: SeedSet }[];
  readonly mine: readonly { readonly id: ArmId; readonly seedSet: SeedSet }[];
  readonly replaySeedSet?: SeedSet;
}

/** Shards take every n-th arm of the asked-for list from the i-th (`--shard i/n`), so any n works. */
export function planStep1(opts: { readonly arms?: readonly ArmId[]; readonly shard?: { readonly index: number; readonly count: number }; readonly seedSet?: SeedSet }): Step1Plan {
  const shard = opts.shard ?? { index: 1, count: 1 };
  if (!Number.isInteger(shard.count) || shard.count < 1 || !Number.isInteger(shard.index) || shard.index < 1 || shard.index > shard.count) {
    throw new RangeError(`--shard takes i/n with 1 <= i <= n (got ${String(shard.index)}/${String(shard.count)})`);
  }
  const ids = opts.arms ?? ARM_IDS;
  if (new Set(ids).size !== ids.length) throw new RangeError(`--arms names an arm twice: ${ids.join(",")}`);
  if (opts.seedSet !== undefined && opts.arms === undefined) throw new RangeError("--seed-set re-plays named arms: give --arms <arm>,<base>");
  const at = (id: ArmId): SeedSet => opts.seedSet ?? armById(id).seedSet;
  const ordered = ARM_IDS.filter((id) => ids.includes(id));
  const targets = ordered.map((id) => ({ id, seedSet: at(id) }));
  const complete = opts.seedSet === undefined ? ARM_IDS.map((id) => ({ id, seedSet: armById(id).seedSet })) : targets;
  return {
    targets,
    complete,
    mine: targets.filter((_, i) => i % shard.count === shard.index - 1),
    ...(opts.seedSet === undefined ? {} : { replaySeedSet: opts.seedSet }),
  };
}

// --- grading ---------------------------------------------------------------------------------------------

export type ArmRecords = ReadonlyMap<ArmId, ArmRecord>;

const LABEL_OF = (id: ArmId): string => {
  const def = armById(id);
  if (id === "A15") return "A15 (context only; pricing arm, never a design value)";
  return def.pricing ? `${id} (pricing arm, never a design value)` : id;
};

/** The three base groups `renderStepReport` is run on, each with exactly one base (report.ts's rule). */
export const BASE_GROUPS: readonly { readonly base: ArmId; readonly arms: readonly ArmId[] }[] = Object.freeze([
  { base: "A0", arms: ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"] },
  { base: "A14", arms: ["A11", "A12", "A13"] },
  { base: "A0b", arms: ["A15"] },
] as const);

/** One base group's step report input, from the records present (the base must be). */
export function groupReport(group: (typeof BASE_GROUPS)[number], records: ArmRecords): StepReportInput | undefined {
  const base = records.get(group.base);
  if (base === undefined) return undefined;
  const { affectedPlays: _drop, ...baseReport } = base.report;
  void _drop;
  const arms: ArmReport[] = [{ ...baseReport, arm: LABEL_OF(group.base), isBase: true }];
  for (const id of group.arms) {
    const r = records.get(id);
    if (r !== undefined) arms.push({ ...r.report, arm: LABEL_OF(id), isBase: false });
  }
  return { step: "1", pr33: PR33_STATE, arms };
}

const figuresOf = (r: ArmRecord | undefined, league: League): Step1Figures => {
  const m = r?.measures[league];
  return { pressure: m?.pressure ?? null, hitOrSack: m?.hitOrSack ?? null, sack: m?.sack ?? null, release: m?.release ?? null };
};

const num = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(dp));

function bandText(c: BandClause): string {
  if (c.direction !== undefined) return `direction ${c.direction}`;
  const lo = typeof c.lo === "number" ? c.lo : undefined;
  const hi = typeof c.hi === "number" ? c.hi : undefined;
  if (c.kind === "reported" && lo !== undefined && lo === hi) return `basis ${String(lo)}`;
  if (lo !== undefined && hi !== undefined) return `${String(lo)} to ${String(hi)}`;
  if (hi !== undefined) return `at most ${String(hi)}`;
  if (lo !== undefined) return `at least ${String(lo)}`;
  return c.kind === "structural" ? "its proof" : "filed";
}

const inBand = (v: number | null, c: BandClause): boolean =>
  v !== null && Number.isFinite(v) && (typeof c.lo !== "number" || v >= c.lo) && (typeof c.hi !== "number" || v <= c.hi);

type FigureKey = keyof Step1Figures;

/** What each graded or reported step-1 clause reads: arm, leagues and figure (or a difference). */
interface ClauseRead {
  readonly arms: readonly ArmId[];
  readonly leagues: readonly League[];
  readonly value: (records: ArmRecords, arm: ArmId, league: League) => number | null;
  readonly unit: string;
}

const fig = (key: FigureKey) => (records: ArmRecords, arm: ArmId, league: League): number | null => figuresOf(records.get(arm), league)[key];
const both: readonly League[] = LEAGUES;

function clauseRead(id: string): ClauseRead | undefined {
  const l8 = /^s1\.L8\.(flat|gen)\.(pressure|sack|release|hitOrSack)$/.exec(id);
  if (l8 !== null) return { arms: ["A4"], leagues: [l8[1] as League], value: fig(l8[2] as FigureKey), unit: l8[2] === "release" ? "s" : "%" };
  const s = /^s1\.S\.(pressure|sack|release)$/.exec(id);
  if (s !== null) return { arms: ["A1"], leagues: both, value: fig(s[1] as FigureKey), unit: s[1] === "release" ? "s" : "%" };
  const w = /^s1\.window\.(pressure|sack)$/.exec(id);
  if (w !== null) {
    const key = w[1] as FigureKey;
    return {
      arms: ["A1"],
      leagues: both,
      value: (records, _arm, league) => {
        const a = figuresOf(records.get("A1"), league)[key];
        const b = figuresOf(records.get("A2"), league)[key];
        return a === null || b === null || !records.has("A1") || !records.has("A2") ? null : a - b;
      },
      unit: "points (A1 - A2)",
    };
  }
  switch (id) {
    case "s1.falsifier.pressure45":
      return { arms: ["A1", "A2", "A3", "A4"], leagues: both, value: fig("pressure"), unit: "%" };
    case "s1.falsifier.floorCounter":
      return { arms: ["A3", "A4"], leagues: both, value: (records, arm, league) => records.get(arm)?.measures[league].floorCounter ?? null, unit: "% of first dirt" };
    case "s1.expected.sack":
      return { arms: ["A1"], leagues: both, value: fig("sack"), unit: "%" };
    case "s1.L5.pressure":
      return { arms: ["A3"], leagues: both, value: fig("pressure"), unit: "%" };
    default:
      return undefined;
  }
}

/** The structural proofs the arms' folds carry, and the OFF arm's check (§9.2). */
export function structuralProofs(records: ArmRecords, file: FiledFile): readonly Step1Structural[] {
  const out: Step1Structural[] = [];
  const present = ARM_IDS.filter((id) => records.has(id));
  const sum = (ids: readonly ArmId[], f: (s: S1Folds) => number): number => ids.reduce((acc, id) => acc + LEAGUES.reduce((a, l) => a + f(records.get(id)!.s1[l]), 0), 0);
  const failures = (ids: readonly ArmId[], f: (s: S1Folds) => number): string[] =>
    ids.flatMap((id) => LEAGUES.flatMap((l) => (f(records.get(id)!.s1[l]) > 0 ? [`${id} ${l}`] : [])));
  const kind = (id: ArmId): string => armById(id).clock.kind;

  const windowOn = present.filter((id) => { const c = armById(id).clock; return c.kind === "S" && c.window; });
  const windowOff = present.filter((id) => { const c = armById(id).clock; return c.kind === "S" && !c.window; });
  const wFail = failures([...windowOn, ...windowOff], (s) => s.windowTicks.problemCount);
  const offPlayed = sum(windowOff, (s) => s.windowTicks.played.gaining + s.windowTicks.played.beaten);
  const reps = sum(windowOn, (s) => s.windowTicks.reps);
  const cases = (k: "two" | "one" | "none"): number => sum(windowOn, (s) => s.windowTicks.cases[k]);
  out.push({
    id: "s1.window.ticks",
    what: "S-2, the window's ticks on every 1-14 POWER rep",
    passes: windowOn.length > 0 && wFail.length === 0 && offPlayed === 0 && reps > 0,
    detail:
      `${windowOn.join(", ") || "no arm with the window"}: ${String(reps)} reps, cases two ${String(cases("two"))}, one ${String(cases("one"))}, none ${String(cases("none"))}, ` +
      `window ticks played ${String(sum(windowOn, (s) => s.windowTicks.played.gaining))} gaining and ${String(sum(windowOn, (s) => s.windowTicks.played.beaten))} beaten; ` +
      `${windowOff.join(", ") || "no arm without it"}: ${String(offPlayed)} window ticks (none allowed); failures ${wFail.length === 0 ? "none" : wFail.join(", ")}`,
  });

  const sArms = present.filter((id) => kind(id) === "S");
  const noDie = failures(present, (s) => s.beats.windowLabels) .concat(failures(sArms, (s) => s.beats.jitterRolls));
  out.push({
    id: "s1.window.noDie",
    what: "S-3, the window draws no die (the stream half; the paired-run test is the engine's rollAccounting)",
    passes: noDie.length === 0,
    detail: `rolls naming the window: ${String(sum(present, (s) => s.beats.windowLabels))} in every arm; jitter rolls under S: ${String(sum(sArms, (s) => s.beats.jitterRolls))}; uniform rolls ${String(sum(sArms, (s) => s.beats.uniformRolls))} = beats ${String(sum(sArms, (s) => s.beats.beats))}`,
  });

  const lArms = present.filter((id) => { const c = armById(id).clock; return c.kind === "L" && c.R <= 6; });
  const lFail = failures(lArms, (s) => s.lToday.problemCount);
  out.push({
    id: "s1.falsifier.lToday",
    what: "S-5, L equals today from t >= R (here R = 5, in every L5 arm; R = 4, 5, 6 on the golden 50 is FF_POCKET_ON=1 pocketStep1Stream)",
    passes: lArms.length > 0 && lFail.length === 0 && sum(lArms, (s) => s.lToday.ticksAtOrAfterR) > 0,
    detail: `${lArms.join(", ") || "no L arm with R <= 6"}: ${String(sum(lArms, (s) => s.lToday.ticksAtOrAfterR))} ticks at t >= R checked field for field; failures ${lFail.length === 0 ? "none" : lFail.join(", ")}`,
  });

  for (const [id, what, f, n] of [
    ["S-4", "every pass_rush_tick margin, band and tier rebuilt from the stream and its stamp's dials", (s: S1Folds) => s.margins.problemCount, (s: S1Folds) => s.margins.ticks.LEGACY + s.margins.ticks.S + s.margins.ticks.L],
    ["S-7", "roll accounting: one beat per rep under S, dieless ticks naming beats; no beat or uniform die under legacy and L", (s: S1Folds) => s.beats.problemCount, (s: S1Folds) => s.beats.reps],
    ["S-8", "the published approach equals the derivation on every threat", (s: S1Folds) => s.approach.problemCount, (s: S1Folds) => s.approach.threats],
  ] as const) {
    const fl = failures(present, f);
    out.push({ id, what, passes: fl.length === 0, detail: `${String(sum(present, n))} cases over ${String(present.length)} arms and both leagues; failures ${fl.length === 0 ? "none" : fl.join(", ")}` });
  }

  const a0 = records.get("A0");
  if (a0 !== undefined) {
    const limited = a0.stamp.corpus.flatFirst !== null || a0.stamp.corpus.genThroughWeek !== null;
    const filed = file.base.rows as unknown as Record<string, JsonValue>;
    const got = a0.baseRows ?? {};
    const differ = Object.keys(filed).filter((k) => stableDigest(filed[k] ?? null) !== stableDigest((got as Record<string, JsonValue>)[k] ?? null));
    out.push({
      id: "s1.falsifier.offBytes",
      what: "the OFF arm A0 reproduces step 0's filed base rows (the OFF proof proper is P-1 to P-15, outside this run)",
      passes: limited || differ.length === 0,
      detail: limited ? "NOT CHECKED: A0 played a cut corpus (tests only)" : `${String(Object.keys(filed).length - differ.length)} of ${String(Object.keys(filed).length)} filed base rows equal on both leagues${differ.length === 0 ? "" : `; differing: ${differ.join(", ")}`}`,
    });
  }
  return out;
}

/** The guard against each arm's base, per league (§9.4). */
export function guardRows(records: ArmRecords): readonly Step1GuardRow[] {
  const out: Step1GuardRow[] = [];
  for (const def of ARM_DEFS) {
    if (def.base === undefined) continue;
    const arm = records.get(def.id);
    const base = records.get(def.base);
    if (arm === undefined || base === undefined) continue;
    if (arm.stamp.seedSet !== base.stamp.seedSet) throw new Error(`the guard reads ${def.id} against ${def.base} on the same seeds; they were played on sets ${String(arm.stamp.seedSet)} and ${String(base.stamp.seedSet)}`);
    for (const league of LEAGUES) {
      const mix = intGuard(base.report.intGuard[league].all, arm.report.intGuard[league].all, "TICK");
      const byClass = intGuardByClass(base.report.intGuard[league].byClass, arm.report.intGuard[league].byClass, "TICK");
      const breaches = Object.entries(byClass.byClass).flatMap(([cls, v]) => (v !== undefined && v.status === "SCORED" && !v.passes ? [cls] : []));
      out.push({ arm: def.id, base: def.base, league, mix, byClass: { passes: byClass.passes, breaches } });
    }
  }
  return out;
}

export interface Step1Grade {
  readonly sections: Step1Sections;
  readonly groups: readonly StepReportInput[];
}

/** Grades the records present against the filing (pure; the same records give the same grade). */
export function gradeStep1(records: ArmRecords, file: FiledFile, replaySeedSet?: SeedSet): Step1Grade {
  const structural = structuralProofs(records, file);
  const guard = guardRows(records);
  const proofById = new Map(structural.map((p) => [p.id, p]));
  const clauses: Step1ClauseResult[] = [];
  const verdictAt = new Map<string, string[]>();
  const note = (arm: ArmId, league: League, key: FigureKey, text: string): void => {
    const k = `${arm}/${league}/${key}`;
    verdictAt.set(k, [...(verdictAt.get(k) ?? []), text]);
  };
  const figureOf = (id: string): FigureKey | undefined => (/pressure/.test(id) ? "pressure" : /sack$/.test(id) && !/hitOrSack/.test(id) ? "sack" : /release/.test(id) ? "release" : /hitOrSack/.test(id) ? "hitOrSack" : undefined);

  for (const c of file.bands.clauses) {
    if (c.step !== "1" && c.step !== "guard") continue;
    if (replaySeedSet !== undefined && c.step === "1") continue;
    const filed = bandText(c);
    if (c.id === "guard.mix" || c.id === "guard.byClass") {
      const breaches = guard.filter((g) => (c.id === "guard.mix" ? !g.mix.passes : !g.byClass.passes));
      const arms = [...new Set(guard.map((g) => g.arm))];
      clauses.push({
        id: c.id, kind: c.kind, arms, filed: `rise over the mix-predicted rise ${filed}`,
        values: breaches.length === 0 ? [`${String(guard.length)} arm-league verdicts, every one passing`] : breaches.map((g) => `${g.arm} ${g.league} breaches`),
        verdict: arms.length === 0 ? "NOT PLAYED" : breaches.length === 0 ? "PASS" : "FAIL",
      });
      continue;
    }
    if (c.id === "guard.onTheRun.clean" || c.id === "guard.onTheRun.pressured") {
      const part = c.id.endsWith("clean") ? "clean" : "pressured";
      const values = ARM_IDS.filter((id) => records.has(id)).flatMap((id) => LEAGUES.map((l) => {
        const r = records.get(id)!.report.intGuard[l].onTheRun?.[part];
        return `${id} ${l} ${r === undefined || r.aimed === 0 ? "n/a" : ((100 * r.interceptions) / r.aimed).toFixed(2)} (${String(r?.aimed ?? 0)} aimed)`;
      }));
      clauses.push({ id: c.id, kind: c.kind, arms: ARM_IDS.filter((id) => records.has(id)), filed, values, verdict: "REPORTED" });
      continue;
    }
    if (c.kind === "structural") {
      const p = proofById.get(c.id);
      if (p !== undefined) {
        clauses.push({ id: c.id, kind: c.kind, arms: [], filed, values: [p.detail], verdict: p.passes ? "PASS" : "FAIL" });
      } else if (c.step === "guard") {
        const every = ARM_IDS.filter((id) => records.has(id));
        clauses.push({ id: c.id, kind: c.kind, arms: every, filed, values: [c.id === "guard.removedClass" ? "printed with its count and interceptions in each group report (REMOVED lines)" : "printed for every arm on both leagues in the group reports"], verdict: every.length > 0 ? "PASS" : "NOT PLAYED" });
      } else {
        clauses.push({ id: c.id, kind: c.kind, arms: [], filed, values: ["proved outside the arms (P-1 to P-15)"], verdict: "REPORTED", note: "not a fold of this run" });
      }
      continue;
    }
    const read = clauseRead(c.id);
    if (read === undefined) continue;
    const values: string[] = [];
    let missing = false;
    let ok = true;
    for (const arm of read.arms) {
      for (const league of read.leagues) {
        if (!records.has(arm)) {
          missing = true;
          continue;
        }
        const v = read.value(records, arm, league);
        values.push(`${arm} ${league} ${num(v, read.unit === "s" ? 3 : 2)} ${read.unit}`);
        if (c.kind === "graded" && !inBand(v, c)) ok = false;
      }
    }
    let verdict: Step1ClauseResult["verdict"] = missing ? "NOT PLAYED" : c.kind === "graded" ? (ok ? "PASS" : "FAIL") : "REPORTED";
    let extra: string | undefined;
    if (c.id === "s1.L5.pressure" && !missing && records.has("A4")) {
      const dir = LEAGUES.map((l) => {
        const a3 = figuresOf(records.get("A3"), l).pressure;
        const a4 = figuresOf(records.get("A4"), l).pressure;
        return `${l}: A3 ${a3 !== null && a4 !== null && a3 > a4 ? "above" : "not above"} A4 (${num(a4)})`;
      });
      extra = dir.join("; ");
    }
    if (c.id.startsWith("s1.window.")) extra = `B1 is gen seed set 1's (deviation O1); flat's own is printed with the window's price`;
    if (missing && verdict !== "NOT PLAYED") verdict = "NOT PLAYED";
    clauses.push({ id: c.id, kind: c.kind, arms: [...read.arms], filed, values, verdict, ...(extra === undefined ? {} : { note: extra }) });
    const key = figureOf(c.id);
    if (key !== undefined && !c.id.startsWith("s1.window.")) {
      for (const arm of read.arms) for (const league of read.leagues) {
        const short = c.id.replace(/^s1\./, "");
        note(arm, league, key, `${short} ${filed}: ${c.kind === "graded" ? (inBand(read.value(records, arm, league), c) ? "PASS" : "FAIL") : "reported"}`);
      }
    }
  }

  const headline: Step1HeadlineRow[] = [];
  for (const id of ["A1", "A2", "A3", "A4"] as const) {
    const r = records.get(id);
    if (r === undefined) continue;
    for (const league of LEAGUES) {
      const m = r.measures[league];
      const v = (key: FigureKey): string => (verdictAt.get(`${id}/${league}/${key}`) ?? []).join("; ");
      headline.push({
        arm: id, what: armById(id).what, league, figures: figuresOf(r, league), timeToThrow: m.timeToThrow ?? Number.NaN, p2s: m.p2s,
        verdicts: { pressure: v("pressure"), hitOrSack: v("hitOrSack"), sack: v("sack"), release: v("release") },
      });
    }
  }

  const interaction: Step1Interaction[] = [];
  for (const [joint, clock, beaten] of [["A5", "A4", "A9"], ["A6", "A4", "A10"], ["A7", "A3", "A9"], ["A8", "A3", "A10"]] as const) {
    for (const league of LEAGUES) {
      const at = (id: ArmId, key: "pressure" | "sack"): number | null => figuresOf(records.get(id), league)[key];
      const of = (key: "pressure" | "sack"): number | null => {
        const vs = [at(joint, key), at(clock, key), at(beaten, key), at("A0", key)];
        if (vs.some((x) => x === null) || ![joint, clock, beaten, "A0"].every((x) => records.has(x as ArmId))) return null;
        const [j, c, b, z] = vs as number[];
        return j! - (c! + b! - z!);
      };
      interaction.push({ formula: `${joint} - (${clock} + ${beaten} - A0)`, league, pressure: of("pressure"), sack: of("sack"), timeToThrow: records.get(joint)?.measures[league].timeToThrow ?? null });
    }
  }

  const s1Pressure = file.bands.clauses.find((c) => c.id === "s1.window.pressure");
  const s1Sack = file.bands.clauses.find((c) => c.id === "s1.window.sack");
  const b1Filed = typeof s1Pressure?.hi === "number" ? s1Pressure.hi : Number.NaN;
  const sackTolerance = typeof s1Sack?.hi === "number" ? s1Sack.hi : Number.NaN;
  const m1 = file.M.M1 as unknown as Record<League, { set1?: { all?: { B1Points?: number } } }>;
  const windowPrice: Step1WindowPrice[] = LEAGUES.map((league) => {
    const a1 = figuresOf(records.get("A1"), league);
    const a2 = figuresOf(records.get("A2"), league);
    const have = records.has("A1") && records.has("A2");
    const diff = (k: "pressure" | "sack"): number | null => (have && a1[k] !== null && a2[k] !== null ? a1[k]! - a2[k]! : null);
    return {
      league, pressure: diff("pressure"), sack: diff("sack"), timeToThrow: records.get("A1")?.measures[league].timeToThrow ?? null,
      b1Filed, b1OwnLeague: m1?.[league]?.set1?.all?.B1Points ?? null, m1OnA2: records.get("A2")?.m1?.[league].all.B1Points ?? null, sackTolerance,
    };
  });

  const pricing: Step1PricingRow[] = [];
  const priced = (arm: ArmId, against: ArmId, label: string): void => {
    if (!records.has(arm) || !records.has(against)) return;
    for (const league of LEAGUES) {
      pricing.push({ arm, label, against, league, figures: figuresOf(records.get(arm), league), againstFigures: figuresOf(records.get(against), league), timeToThrow: records.get(arm)!.measures[league].timeToThrow });
    }
  };
  priced("A14", "A0", "the stand-in hold's own rows; pricing arm, never a design value");
  priced("A11", "A1", "A1 with the stand-in hold; pricing arm, never a design value");
  priced("A12", "A4", "A4 with the stand-in hold; pricing arm, never a design value");
  priced("A13", "A3", "A3 with the stand-in hold; pricing arm, never a design value");
  priced("A15", "A0b", "context only (sLateArm, O27); pricing arm, never a design value");
  if (records.has("A15")) {
    pricing.push({
      arm: "A15", label: "context only (sLateArm, O27), against revision 1's figures", against: "Appendix B, gen Later (33.85 / 5.69 / 2.47)", league: "gen",
      figures: figuresOf(records.get("A15"), "gen"), againstFigures: APPENDIX_B_GEN_LATER, timeToThrow: records.get("A15")!.measures.gen.timeToThrow,
    });
  }

  const armCounts: Step1ArmCounts[] = [];
  for (const id of ARM_IDS) {
    const r = records.get(id);
    if (r === undefined) continue;
    for (const league of LEAGUES) {
      const m = r.measures[league];
      const s = r.s1[league];
      const aff = r.affected;
      const byLabel = Object.entries(s.approach.byLabel).map(([k, v]) => `${k} ${String(v.agree)}/${String(v.agree + v.disagree)}`).join(", ");
      armCounts.push({
        arm: LABEL_OF(id), role: armById(id).role, league, dropbacks: m.dropbacks, timeToThrow: m.timeToThrow,
        ...(aff === undefined ? {} : { affected: { against: aff.against, byMechanism: aff[league].byMechanism as Record<string, number>, windowOnlyDirt: aff[league].windowOnlyDirt, union: aff[league].union } }),
        folds: [
          `window: ${s.windowTicks.windowOn === null ? "not S" : s.windowTicks.windowOn ? "on" : "off"}, ${String(s.windowTicks.reps)} 1-14 POWER reps (${String(s.windowTicks.noBeat)} with no beat), cases two ${String(s.windowTicks.cases.two)} / one ${String(s.windowTicks.cases.one)} / none ${String(s.windowTicks.cases.none)}, played gaining ${String(s.windowTicks.played.gaining)} / beaten ${String(s.windowTicks.played.beaten)}, ${String(s.windowTicks.ticksChecked)} ticks checked, failures ${String(s.windowTicks.problemCount)}`,
          `L equals today: R ${s.lToday.R.length === 0 ? "none" : s.lToday.R.join(", ")}, ${String(s.lToday.ticksAtOrAfterR)} ticks at t >= R (${String(s.lToday.ticksBeforeR)} before), failures ${String(s.lToday.problemCount)}`,
          `margins rebuilt: legacy ${String(s.margins.ticks.LEGACY)}, S ${String(s.margins.ticks.S)}, L ${String(s.margins.ticks.L)}, failures ${String(s.margins.problemCount)}`,
          `dice: ${String(s.beats.reps)} reps, ${String(s.beats.beats)} beats, ${String(s.beats.dielessTicks)} dieless ticks, ${String(s.beats.rolledTicks)} rolled ticks, ${String(s.beats.jitterRolls)} jitter rolls, ${String(s.beats.uniformRolls)} uniform rolls, ${String(s.beats.windowLabels)} window labels, failures ${String(s.beats.problemCount)}`,
          `approach (published agreeing / threatened rushers): ${byLabel === "" ? "legacy plays only" : byLabel}; ${String(s.approach.threats)} threats checked, ${String(s.approach.blocked)} blocked, ${String(s.approach.legacyPlays)} legacy plays, failures ${String(s.approach.problemCount)}`,
        ],
        quickPressure: m.quickPressure, floorCounter: m.floorCounter, cleanWithLiveWonRep: m.cleanWithLiveWonRep,
        ...(armById(id).clock.kind === "S" ? { passRushWin: m.passRushWin } : {}),
        missRuleN: m.missRuleN,
      });
    }
  }

  const structuralFailures = [
    ...structural.filter((p) => !p.passes).map((p) => `${p.id}: ${p.detail}`),
    ...clauses.filter((c) => c.kind === "structural" && c.verdict === "FAIL" && !proofById.has(c.id)).map((c) => c.id),
  ];
  const gradedFailures = clauses.filter((c) => c.kind === "graded" && c.verdict === "FAIL" && !c.id.startsWith("guard.")).map((c) => `${c.id} (${c.filed}): ${c.values.join("; ")}`);
  const breaches = guard.filter((g) => !g.mix.passes || !g.byClass.passes);
  const guardBreaches = breaches.map((g) => `${g.arm} against ${g.base}, ${g.league}: ${g.mix.passes ? "" : `league-wide rise ${g.mix.rise.toFixed(2)} > allowed ${g.mix.allowed.toFixed(2)}`}${!g.mix.passes && !g.byClass.passes ? "; " : ""}${g.byClass.passes ? "" : `by class ${g.byClass.breaches.join(", ")}`}`);
  const next: string[] = [];
  for (const arm of [...new Set(breaches.map((g) => g.arm))]) {
    const base = armById(arm as ArmId).base!;
    const other = armById(arm as ArmId).seedSet === 1 ? 2 : 1;
    next.push(`re-play the breaching arm and its base on seed set ${String(other)}: pnpm --filter @ff/calibration pocket -- --step 1 --arms ${arm},${base} --seed-set ${String(other)}; both sets' numbers go to the owner before any merge card`);
  }
  if (replaySeedSet !== undefined) next.push(`this is a re-play on seed set ${String(replaySeedSet)}: its numbers go to the owner beside the first set's`);
  const outcome: Step1Outcome = {
    structuralFailures,
    gradedFailures,
    guardBreaches,
    mergeCard: structuralFailures.length === 0 && guardBreaches.length === 0 && replaySeedSet === undefined,
    next,
  };

  const groups = BASE_GROUPS.flatMap((g) => {
    const r = groupReport(g, records);
    return r === undefined ? [] : [r];
  });
  return {
    sections: {
      pr33: PR33_STATE,
      ...(replaySeedSet === undefined ? {} : { replaySeedSet }),
      headline, clauses, guard, structural, interaction, pkAInteraction: PKA_INTERACTION, windowPrice, pricing, arms: armCounts, outcome,
    },
    groups,
  };
}

/** The step report as Markdown: the step-1 sections, then `renderStepReport` once per base group. */
export function renderStep1Report(grade: Step1Grade, records: ArmRecords): string {
  const stamps = [...records.values()].map((r) => r.stamp);
  const commits = [...new Set(stamps.map((s) => `${s.commit}${s.dirty ? " (dirty)" : ""}`))].sort();
  const first = stamps[0];
  const lines: string[] = [];
  lines.push(`# ADR-089 step 1: the arms${grade.sections.replaySeedSet === undefined ? "" : `, re-played on seed set ${String(grade.sections.replaySeedSet)}`}`);
  lines.push("");
  lines.push("Both block clocks, the push window and the approach card are built behind a switch that is OFF; these arms turn it on for measurement only. No graded NFL row is scored here (O31); the step-1 clauses are the filing's predictions about the arms.");
  lines.push("");
  lines.push(`- filing: ${first?.filedDigest ?? STEP0_FILED_DIGEST}, amendments: none`);
  lines.push(`- fingerprint (every package's source and the filing): ${first?.fingerprint ?? "n/a"}`);
  lines.push(`- commit: ${commits.join(", ")} (read from the repository's files; a change staged and not committed is not seen)`);
  lines.push(`- node: ${first?.node ?? "n/a"}; caller ${STEP1_CALLER}; corpora: flat 496 games, gen 272 games${first !== undefined && (first.corpus.flatFirst !== null || first.corpus.genThroughWeek !== null) ? ` (CUT: flat first ${String(first.corpus.flatFirst)}, gen through week ${String(first.corpus.genThroughWeek)}; tests only)` : ""}`);
  lines.push(`- arms: ${[...records.keys()].map((id) => `${id} (set ${String(records.get(id)!.stamp.seedSet)}, ${records.get(id)!.stamp.overlayDigest ?? records.get(id)!.stamp.rules})`).join(", ")}`);
  lines.push(`- PR #33: ${PR33_STATE}, so P2S prints against both 22.02 and 15.46`);
  lines.push("");
  lines.push(...renderStep1Sections(grade.sections));
  lines.push("## The step reports, one per base group");
  for (const g of grade.groups) {
    lines.push("");
    lines.push(`### ${g.arms.find((a) => a.isBase)?.arm ?? "?"} with ${g.arms.filter((a) => !a.isBase).map((a) => a.arm).join(", ")}`);
    lines.push("");
    lines.push("```text");
    lines.push(...renderStepReport(g));
    lines.push("```");
  }
  return `${lines.join("\n")}\n`;
}

// --- the run ---------------------------------------------------------------------------------------------

export interface Step1Options {
  readonly arms?: readonly ArmId[];
  readonly shard?: { readonly index: number; readonly count: number };
  /** The cache's parent; the fingerprint is appended. */
  readonly cacheParent: string;
  readonly seedSet?: SeedSet;
  readonly report?: string;
  readonly out?: string;
  readonly filedPath: string;
  readonly env: Step1Env;
  /** A report or measures file under this directory is a committed report (refused from a dirty tree). */
  readonly committedDir?: string;
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
  /** Tests only: plays an arm (default `playArm`). */
  readonly play?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayArmOptions) => ArmRecord;
}

export interface Step1RunResult {
  readonly cacheDir: string;
  readonly played: readonly string[];
  readonly cached: readonly string[];
  readonly remaining: readonly string[];
  readonly graded: boolean;
  readonly wrote: readonly string[];
  readonly grade?: Step1Grade;
}

const isUnder = (path: string, dir: string): boolean => {
  const rel = relative(resolve(dir), resolve(path));
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith(sep) && !/^[A-Za-z]:/.test(rel);
};

function readRecord(path: string): ArmRecord {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as ArmRecord;
  if (parsed.format !== STEP1_ARM_FORMAT) throw new Error(`${path}: not a step-1 arm record (format ${String((parsed as { format?: unknown }).format)})`);
  return parsed;
}

/** Plays this shard's arms, then grades if every arm is in the cache. */
export function runStep1(opts: Step1Options): Step1RunResult {
  const log = opts.log ?? ((): void => undefined);
  const file = openFiling(opts.filedPath);
  checkFilingForStep1(file);
  const plan = planStep1({ ...(opts.arms === undefined ? {} : { arms: opts.arms }), ...(opts.shard === undefined ? {} : { shard: opts.shard }), ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }) });
  const corpus = opts.corpus ?? FULL_CORPUS;
  const committed = opts.committedDir !== undefined && [opts.report, opts.out].some((p) => p !== undefined && isUnder(p, opts.committedDir!));
  if (committed && opts.env.dirty) throw new Error("ADR-089 step 1: a committed report (under reports/) is made from a clean tree, and this tree is dirty: commit first, or write the report elsewhere");
  const cacheDir = join(opts.cacheParent, opts.env.fingerprint);
  mkdirSync(cacheDir, { recursive: true });
  log(`pocket step 1: fingerprint ${opts.env.fingerprint}; arms cached in ${cacheDir}`);
  const play = opts.play ?? playArm;
  const played: string[] = [];
  const cached: string[] = [];
  for (const { id, seedSet } of plan.mine) {
    const path = armFileOf(cacheDir, id, seedSet);
    const want = stampOf(id, seedSet, opts.env, corpus);
    if (existsSync(path)) {
      const problems = stampProblems(readRecord(path).stamp, want);
      if (problems.length > 0) throw new Error(`ADR-089 step 1: the cached ${id} (set ${String(seedSet)}) at ${path} is not this build's arm: ${problems.join("; ")}. Delete it, or use another --cache`);
      cached.push(`${id}.set${String(seedSet)}`);
      log(`pocket step 1: ${id} set ${String(seedSet)} is cached`);
      continue;
    }
    const started = Date.now();
    const record = play(id, seedSet, opts.env, { corpus, log });
    writeAtomic(path, jsonText(record));
    played.push(`${id}.set${String(seedSet)}`);
    log(`pocket step 1: ${id} set ${String(seedSet)} played in ${String(Math.round((Date.now() - started) / 1000))} s`);
  }

  const remaining = plan.complete.filter(({ id, seedSet }) => !existsSync(armFileOf(cacheDir, id, seedSet))).map(({ id, seedSet }) => `${id}.set${String(seedSet)}`);
  const wrote: string[] = [];
  // S-1b: with --arms naming exactly one arm, --out is that arm's record, byte for byte its cache
  // file, whether or not every arm is cached, so the same command writes the same kind of file on
  // any cache (review CT-4). --report is still graded once every arm is cached.
  const recordOut = opts.arms !== undefined && opts.arms.length === 1 ? opts.out : undefined;
  if (recordOut !== undefined) {
    const only = plan.targets[0]!;
    writeAtomic(recordOut, readFileSync(armFileOf(cacheDir, only.id, only.seedSet), "utf8"));
    wrote.push(recordOut);
    log(`pocket step 1: wrote ${only.id}'s record to ${recordOut}`);
  }
  if (remaining.length > 0) {
    log(`pocket step 1: ${String(remaining.length)} arm(s) still to play (${remaining.join(", ")}); the report is written once every arm is in the cache`);
    return { cacheDir, played, cached, remaining, graded: false, wrote };
  }

  const records = new Map<ArmId, ArmRecord>();
  for (const { id, seedSet } of plan.complete) {
    const path = armFileOf(cacheDir, id, seedSet);
    const record = readRecord(path);
    const problems = stampProblems(record.stamp, stampOf(id, seedSet, opts.env, corpus));
    if (problems.length > 0) throw new Error(`ADR-089 step 1: refused to grade: the cached ${id} at ${path} is not this build's arm: ${problems.join("; ")}`);
    if (committed && record.stamp.dirty) throw new Error(`ADR-089 step 1: refused to grade a committed report: ${id} was played on a dirty tree (${record.stamp.commit})`);
    records.set(id, record);
  }
  const grade = gradeStep1(records, file, plan.replaySeedSet);
  if (opts.report !== undefined) {
    writeAtomic(opts.report, renderStep1Report(grade, records));
    wrote.push(opts.report);
  }
  if (opts.out !== undefined && recordOut === undefined) {
    const measures = {
      format: STEP1_MEASURES_FORMAT,
      filedDigest: STEP0_FILED_DIGEST,
      fingerprint: opts.env.fingerprint,
      ...(plan.replaySeedSet === undefined ? {} : { replaySeedSet: plan.replaySeedSet }),
      arms: Object.fromEntries([...records].map(([id, r]) => [id, r])),
      grade: grade.sections,
      groups: grade.groups,
    };
    writeAtomic(opts.out, jsonText(sanitize(measures)));
    wrote.push(opts.out);
  }
  log(`pocket step 1: graded ${String(records.size)} arms${wrote.length === 0 ? "" : `; wrote ${wrote.join(", ")}`}`);
  return { cacheDir, played, cached, remaining, graded: true, wrote, grade };
}

// --- S-1: the digests ------------------------------------------------------------------------------------

export interface DigestsResult {
  readonly format: typeof STEP1_DIGESTS_FORMAT;
  readonly node: string;
  readonly caller: CallerVersion;
  readonly gamesPerLeague: number;
  readonly arms: Readonly<Record<string, {
    readonly stamp: { readonly arm: ArmId; readonly rules: string; readonly overlayDigest?: string; readonly tunablesDigest: string; readonly patches: readonly string[] };
    readonly leagues: Readonly<Record<string, { readonly games: number; readonly events: number; readonly canonicalFold: string; readonly byteFold: string }>>;
  }>>;
}

/** The golden 50 a league under A1 to A4: canonical and byte folds, counts, stamps and the Node version. */
export function runDigests(opts: { readonly node: string; readonly first?: number; readonly log?: (line: string) => void }): DigestsResult {
  const arms: Record<string, DigestsResult["arms"][string]> = {};
  for (const id of DIGEST_ARMS) {
    const arm = armById(id);
    const leagues: Record<string, { games: number; events: number; canonicalFold: string; byteFold: string }> = {};
    for (const league of GOLDEN_LEAGUES) {
      const canonical: string[] = [];
      const bytes: string[] = [];
      let events = 0;
      const started = Date.now();
      goldenGames(league, (o) => {
        canonical.push(gameDigest(o.events));
        bytes.push(gameBytesDigest(o.events));
        events += o.events.length;
      }, { tunables: arm.tunables, callerVersion: STEP1_CALLER, ...(opts.first === undefined ? {} : { first: opts.first }) });
      leagues[league] = { games: canonical.length, events, canonicalFold: foldDigests(canonical), byteFold: foldDigests(bytes) };
      opts.log?.(`pocket step 1 digests: ${id} ${league}, ${String(canonical.length)} games in ${String(Math.round((Date.now() - started) / 1000))} s`);
    }
    arms[id] = {
      stamp: {
        arm: id, rules: arm.rules, ...(arm.overlayDigest === undefined ? {} : { overlayDigest: arm.overlayDigest }), tunablesDigest: arm.tunablesDigest,
        patches: arm.patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`),
      },
      leagues,
    };
  }
  return { format: STEP1_DIGESTS_FORMAT, node: opts.node, caller: STEP1_CALLER, gamesPerLeague: opts.first ?? 50, arms };
}

// --- the command -----------------------------------------------------------------------------------------

/** The build's environment for the stamp: the fingerprint, HEAD's commit and the tree's state, Node's version. */
export function step1Env(repoRoot: string, filedPath: string): Step1Env & { readonly reason?: string } {
  const fp = sourceFingerprint(repoRoot, filedPath);
  const tree = treeState(repoRoot, fp.files, fp.dirs);
  return { fingerprint: fp.fingerprint, commit: tree.commit ?? "unknown", dirty: tree.dirty, node: process.version, ...(tree.reason === undefined ? {} : { reason: tree.reason }) };
}

export async function step1Command(args: Step1Args, log: (line: string) => void): Promise<void> {
  const repoRoot = resolve(PKG_ROOT, "..", "..");
  const filedPath = join(PKG_ROOT, FILED_PATH);
  if (args.digests === true) {
    const out = args.out;
    if (out === undefined) throw new SyntaxError("--digests writes its folds to --out <file>");
    const result = runDigests({ node: process.version, log });
    writeAtomic(out, jsonText(result));
    log(`pocket step 1: wrote the digests to ${out}`);
    return;
  }
  const env = step1Env(repoRoot, filedPath);
  log(`pocket step 1: commit ${env.commit}${env.dirty ? ` (dirty: ${env.reason ?? "?"})` : ""}, node ${env.node}`);
  const result = runStep1({
    ...(args.arms === undefined ? {} : { arms: args.arms }),
    ...(args.shard === undefined ? {} : { shard: args.shard }),
    ...(args.seedSet === undefined ? {} : { seedSet: args.seedSet }),
    ...(args.report === undefined ? {} : { report: args.report }),
    ...(args.out === undefined ? {} : { out: args.out }),
    cacheParent: args.cache ?? join(PKG_ROOT, "data-cache", "pocket-step1"),
    filedPath,
    env: { fingerprint: env.fingerprint, commit: env.commit, dirty: env.dirty, node: env.node },
    committedDir: join(PKG_ROOT, "reports"),
    log,
  });
  if (result.graded && result.grade !== undefined) {
    const o = result.grade.sections.outcome;
    process.stdout.write(
      `ADR-089 step 1: ${String(o.structuralFailures.length)} structural failure(s), ${String(o.gradedFailures.length)} graded clause failure(s), ${String(o.guardBreaches.length)} guard breach(es); ` +
        `merge card ${o.mergeCard ? "may be posted" : "not to be posted"}\n`,
    );
    for (const line of [...o.structuralFailures, ...o.guardBreaches, ...o.gradedFailures, ...o.next]) process.stdout.write(`  ${line}\n`);
  }
}
