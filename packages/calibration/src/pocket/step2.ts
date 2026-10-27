/**
 * `pnpm --filter @ff/calibration pocket -- --step 2 [--arms A1,B3] [--shard i/n] [--cache <dir>] [--seed-set 1|2] [--report <file.md>] [--out <file.json>]`
 * `pnpm --filter @ff/calibration pocket -- --step 2 --digests --out <file.json>`
 * `pnpm --filter @ff/calibration pocket -- --step 2 [--arms A1] [--cache <dir>] [--seed-set 1|2] --m2`
 *
 * ADR-089 STEP 2's HARNESS (step-2 plan §4.1 to §4.7, §6's K3 row; AM-1, Appendix F, F.11): plays
 * the re-played bases (A0, A14, A1, A5, A11) and the step's arms (B1 to B7) on both seed sets and
 * grades them against the step-0 filing as AM-1 amends it.
 *
 *  - **The refusals first** (plan §4.6, C1-F1, C2-F9). Nothing is played, `--digests` and `--m2`
 *    included, unless the filing loads, digests to `STEP0_FILED_DIGEST` and holds no pending s2 or
 *    guard field, and the amendments file (`reports/adr-089-amendments.filed.json`) loads,
 *    validates, equals the pin `AMENDMENTS_DIGEST`, holds AM-1, and holds a step-2 base map that
 *    names every graded arm (B1 to B7) and reads each against the base this build's arm reads
 *    (`arms.ts`'s `STEP2_ARM_DEFS`). The command prints the source fingerprint before anything else.
 *  - **Each arm** plays the flat league's 496 games and the generated league's 272 on each seed set
 *    at caller v7, through step 1's folds (`playArm`, so its record is step 1's in every field step
 *    1 has) and the step-2 stream folds (`s2Stream.ts`'s `foldS2Game`), each handed the arm's own
 *    tunables (K14). Its record is stamped with step 1's stamp plus `amendments:
 *    <AMENDMENTS_DIGEST>`; the per-game guard vectors (AM-1's paired SE) are packed one line a game.
 *  - **The cache** is `data-cache/pocket-step2/<fingerprint>/<arm>.set<n>.json`, with step 1's
 *    fingerprint rule (every package's source, the lockfile, the manifests and the filing). The
 *    amendments file is not hashed, but its pin is a literal in `amendments.ts`, so a changed file is
 *    refused unless the pin changes, and a changed pin moves the fingerprint (C2-F20). A cached
 *    record whose stamp differs from the one this build computes is refused, never re-used; one
 *    stamped with another amendments digest is refused by name.
 *  - **Shards and sets.** The targets are every asked arm on each seed set (default both), in
 *    `STEP2_RUN_IDS` order; `--shard i/n` plays every n-th from the i-th. An invocation that then
 *    finds every target of the step in the cache grades, deterministically, and writes `--report`
 *    and `--out` (each through a temporary file and a rename), so two shards that both finish write
 *    the same bytes. `--seed-set <n>` plays one set; such a run is reported, never graded. With
 *    `--arms` naming one arm, `--out` receives that arm's records (`adr-089-step2-records/v1`), the
 *    cache files' records, whether or not every target is cached (Q-3b).
 *  - **The re-played bases** are checked against step 1's records on Q-2's projection (plan §4.5):
 *    seed set 1 against `reports/adr-089-step1.json`, seed set 2 against the committed fixture
 *    `test/fixtures/adr089-step1-set2/`. A difference is a structural failure.
 *  - **Grading is always fresh from the records** (`gradeStep2`, pure): the s2 bands and
 *    `sacksDown` on set 1 with set 2, the two-set mean and the binomial SE beside; M2 reported; the
 *    structural proofs (`counterAlone`, `everyArrival`, the warning, the live set, `s1Problems`, Q-2)
 *    and the fold checks (the count part's self-check, M2 STREAM's identity rebuild); the guard
 *    under AM-1 with the filed reading, e* and the paired SE beside, the cumulative line, the
 *    DESPERATION halves and the checkdown triggers. Four kinds of failure (plan §4.7): structural,
 *    fold fault, graded (reported as filed) and an AM-1 breach (the step stops).
 *  - **`--digests`** plays only the golden 50 a league under A1, A5, A11 and B1 to B7 (no cache)
 *    and writes their canonical and byte folds, counts and stamps (Q-3: two processes, `cmp`); the
 *    bases' folds must equal S-9's and the base pins, or the command fails after writing.
 *  - **`--m2`** plays or reads the asked arms (default A1, both sets), prints M2's section, and stops.
 *  - **No wall-clock, host or path field** in any record or file, and no clock is read here at all:
 *    the shell times a run. A committed report (`--report` or `--out` under the package's
 *    `reports/`) is refused from a dirty tree, or from any record stamped dirty.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalise } from "../harness/digest.js";
import { AMENDMENTS_DIGEST, AMENDMENTS_PATH, entryOf, guardFor, openAmendments, type BaseMap } from "./amendments.js";
import { armById, STEP2_ARM_DEFS, STEP2_ARM_IDS, STEP2_BASES, STEP2_RUN_IDS, type ArmId } from "./arms.js";
import { FILED_PATH, type GuardClock, type IntMix } from "./bands.js";
import type { ThrowClass } from "./constructs.js";
import { goldenGames, type SeedSet } from "./corpus.js";
import { filedDigest, pendingPaths, STEP0_FILED_DIGEST, type BandClause, type FiledFile, type JsonValue } from "./filed.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES } from "./golden.js";
import { am1ArmReading, am1Reading, DESPERATION_HALVES, pairedReading, reweightedDesperation, SEED_SETS, type Am1Lines, type GuardSide, type PairedReading } from "./guardAm1.js";
import { m2StreamSummary, mergeM2StreamFolds, poissonInterval95, type M2StreamFold } from "./m2ForcingSource.js";
import {
  LEAGUES,
  renderStep2M2,
  renderStep2Sections,
  renderStepReport,
  type ArmReport,
  type League,
  type Step1Figures,
  type Step2ArmCounts,
  type Step2ArmSetCounts,
  type Step2Checkdown,
  type Step2ClauseResult,
  type Step2Comparison,
  type Step2Contrast,
  type Step2GuardHalf,
  type Step2GuardRow,
  type Step2M2Filed,
  type Step2M2Row,
  type Step2M2Section,
  type Step2Outcome,
  type Step2Proof,
  type Step2Sections,
  type Step2Verdict,
  type StepReportInput,
} from "./report.js";
import { POCKET_1_S1_BASE_PINS } from "./s1BasePins.js";
import { POCKET_1_S1_PINS } from "./s1Pins.js";
import { s1Problems } from "./s1Stream.js";
import { checkdownTriggersOf, emptyS2Folds, FORCED_ACT_KINDS, foldS2Game, mustActShareSummary, s2Problems, selfCheckOf, type GuardCell, type GuardGameVector, type MustActSelfCheck, type S2Folds } from "./s2Stream.js";
import { openFiling, PR33_STATE, sanitize, type Step2Args } from "./step0.js";
import {
  armFileOf,
  FULL_CORPUS,
  isUnder,
  jsonText,
  playArm,
  stampOf,
  stampProblems,
  STEP1_CALLER,
  step1Env,
  writeAtomic,
  type ArmRecord,
  type Step1Corpus,
  type Step1Env,
  type Step1Stamp,
} from "./step1.js";
import type { DesperationPocket } from "./throwClass.js";

export const STEP2_ARM_FORMAT = "adr-089-step2-arm/v1";
export const STEP2_MEASURES_FORMAT = "adr-089-step2-measures/v1";
export const STEP2_RECORDS_FORMAT = "adr-089-step2-records/v1";
export const STEP2_DIGESTS_FORMAT = "adr-089-step2-digests/v1";

/** Q-3's arms: the golden 50 a league under the bases with a block clock and every step-2 arm. */
export const STEP2_DIGEST_ARMS: readonly ArmId[] = Object.freeze(["A1", "A5", "A11", ...STEP2_ARM_IDS]);
/** `--m2` reads A1's streams unless `--arms` names others (plan §4.6 item 4). */
export const STEP2_M2_ARMS: readonly ArmId[] = Object.freeze(["A1"]);
/** Where step 1's records are: set 1 in the committed report, set 2 in the committed fixture (plan §4.5, Q-2). */
export const STEP1_RECORDS_JSON = "reports/adr-089-step1.json";
export const STEP1_SET2_FIXTURE = "test/fixtures/adr089-step1-set2";
/** The set graded clauses read (set 1, as step 1 graded); set 2 is printed beside. */
export const GRADED_SEED_SET: SeedSet = 1;
/** The arms with no band: "reported, direction only" (O47). */
export const DIRECTION_ONLY: ReadonlySet<ArmId> = new Set<ArmId>(["B2", "B4", "B5", "B6", "B7"]);
/** pkA's A123 (`design-wip/round1/designA.json`, REPORTED; plan §4.3): pressure, hit-or-sack, sacks, release. */
export const PKA_A123: Readonly<Record<League, Step1Figures>> = Object.freeze({
  flat: Object.freeze({ pressure: 33.14, hitOrSack: 3.67, sack: 2.94, release: 1.589 }),
  gen: Object.freeze({ pressure: 36.87, hitOrSack: 4.01, sack: 2.83, release: 1.663 }),
});

const PKG_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** How the step-2 report names each arm (plan §4.1's roles; O37, O47). */
const LABELS: Readonly<Record<string, string>> = {
  A0: "A0 (today's game, re-played)",
  A14: "A14 (today's clock with the hold, re-played; pricing arm, never a design value)",
  A1: "A1 (step 1's design, re-played)",
  A5: "A5 (L8 with Heels, re-played)",
  A11: "A11 (A1 with the stand-in hold, re-played; pricing arm, never a design value)",
  B1: "B1 (the forcing point alone; information, not a design value)",
  B2: "B2 (the warning alone; information, reported, direction only)",
  B3: "B3 (pocket-1.s2, the design)",
  B4: "B4 (the narrower counter rule; information, reported, direction only)",
  B5: "B5 (A5 with the horizons, pkA's A123; information, reported, direction only)",
  B6: "B6 (B3 with the stand-in hold; pricing arm, never a design value, reported, direction only)",
  B7: "B7 (A1 with the horizons under step 1's rule; information, reported, direction only)",
};
const labelOf = (id: ArmId): string => LABELS[id] ?? id;

// --- the refusals ----------------------------------------------------------------------------------------

/** Refuses a filing that leaves an s2 or guard field pending, then one that is not the committed filing. */
export function checkFilingForStep2(file: FiledFile): void {
  const ours = new Set(file.bands.clauses.flatMap((c, i) => (c.step === "2" || c.step === "guard" ? [String(i)] : [])));
  const pending = pendingPaths(file).filter(({ path }) => {
    const p = path.split(".");
    return p[0] === "bands" && p[1] === "clauses" && ours.has(p[2] ?? "");
  });
  if (pending.length > 0) throw new Error(`ADR-089 step 2: the filing leaves ${pending.map((p) => p.path).join(", ")} pending; every s2 and guard field must be filed first`);
  const digest = filedDigest(file);
  if (digest !== STEP0_FILED_DIGEST) {
    throw new Error(`ADR-089 step 2: the step-0 filing digests to ${digest}, not ${STEP0_FILED_DIGEST}; step 2 grades only against the committed filing, amended only by a named entry`);
  }
}

/** What the grading reads of the amendments: the entry, its step-2 base map and AM-1's lines. */
export interface Step2Guard {
  readonly digest: string;
  readonly entry: string;
  readonly record: string;
  readonly bases: BaseMap;
  readonly lines: Am1Lines;
  /** The cumulative line: the design arm against `design`, the pricing arm against `pricing` (reported). */
  readonly cumulative: { readonly design: ArmId; readonly pricing: ArmId };
}

/** The design arm and the pricing arm of step 2, by their roles in `STEP2_ARM_DEFS`. */
export const STEP2_DESIGN_ARM: ArmId = STEP2_ARM_DEFS.find((d) => d.role === "design")!.id;
export const STEP2_PRICING_ARM: ArmId = STEP2_ARM_DEFS.find((d) => d.pricing)!.id;

/**
 * Every refusal before anything plays (plan §4.6): the filing, then the amendments file (loads,
 * validates, equals the pin, holds AM-1), then a step-2 base map naming every graded arm, each
 * against the base this build's arm reads. Returns what the grading reads.
 */
export function preflightStep2(filedPath: string, amendmentsPath: string, pin: string = AMENDMENTS_DIGEST): { readonly file: FiledFile; readonly guard: Step2Guard } {
  const refuse = (why: string): never => {
    throw new Error(`ADR-089 step 2: refused before anything plays: ${why}`);
  };
  const file = openFiling(filedPath);
  checkFilingForStep2(file);
  if (!existsSync(amendmentsPath)) refuse(`the amendments file ${amendmentsPath} does not exist (AM-1 is filed in ${AMENDMENTS_PATH} before step 2's arms run)`);
  let amendments;
  try {
    amendments = openAmendments(amendmentsPath, file, pin);
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
  try {
    entryOf(amendments, "AM-1");
  } catch {
    refuse("the amendments file holds no AM-1");
  }
  let found;
  try {
    found = guardFor(amendments, "2");
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
  const { entry, rule, bases } = found;
  const missing = STEP2_ARM_IDS.filter((id) => bases[id] === undefined);
  if (missing.length > 0) refuse(`${entry.id}'s step-2 base map names no base for ${missing.join(", ")}: every graded arm needs one`);
  const extra = Object.keys(bases).filter((id) => !(STEP2_ARM_IDS as readonly string[]).includes(id));
  if (extra.length > 0) refuse(`${entry.id}'s step-2 base map names ${extra.join(", ")}, which step 2 does not grade (B1 to B7)`);
  const differ = STEP2_ARM_IDS.filter((id) => bases[id] !== armById(id).base);
  if (differ.length > 0) refuse(`${entry.id}'s step-2 base map reads ${differ.map((id) => `${id} against ${String(bases[id])}, and this build's arm against ${String(armById(id).base)}`).join("; ")}`);
  return {
    file,
    guard: {
      digest: pin,
      entry: entry.id,
      record: entry.record,
      bases,
      lines: { zLeague: rule.zLeague, zClass: rule.zClass, zSetSE0: rule.zSetSE0 },
      cumulative: { design: rule.cumulative.design, pricing: rule.cumulative.pricing },
    },
  };
}

// --- the stamp and the record ------------------------------------------------------------------------------

/** Step 1's stamp with the amendments digest every step-2 record carries. */
export type Step2Stamp = Omit<Step1Stamp, "amendments"> & { readonly amendments: string };

/** Step 1's stamp of the arm, its `amendments` field the pinned digest (the key keeps its place). */
export function step2StampOf(id: ArmId, seedSet: SeedSet, env: Step1Env, corpus: Step1Corpus = FULL_CORPUS): Step2Stamp {
  return { ...stampOf(id, seedSet, env, corpus), amendments: AMENDMENTS_DIGEST };
}

/** The step-2 folds as a record holds them: the per-game guard vectors packed one line a game. */
export interface PackedS2Folds extends Omit<S2Folds, "guardGames"> {
  readonly guardGames: readonly string[];
}

export interface Step2Record extends Omit<ArmRecord, "format" | "stamp"> {
  readonly format: typeof STEP2_ARM_FORMAT;
  readonly stamp: Step2Stamp;
  readonly s2: Readonly<Record<League, PackedS2Folds>>;
}

const cellText = (name: string, c: GuardCell): string => `${name}=${c.aimedByBin.join(",")}/${String(c.interceptions)}/${String(c.completions)}`;
const CELL = /^([A-Z_]+)=([0-9]+(?:,[0-9]+)*)\/([0-9]+)\/([0-9]+)$/;

/**
 * One game's guard vector as one line: `<game> <id> <CLASS>=<aimed by bin>/<interceptions>/<completions> ... | <HALF>=...`,
 * the id URI-encoded, so a committed file holds every game in one line and not forty (plan §4.3, S4-2).
 */
export function packGuardGame(v: GuardGameVector): string {
  const classes = Object.entries(v.classes).map(([k, c]) => cellText(k, c!));
  const halves = Object.entries(v.desperation).map(([k, c]) => cellText(k, c!));
  return [String(v.game), encodeURIComponent(v.gameId), ...classes, "|", ...halves].join(" ");
}

export function unpackGuardGame(line: string): GuardGameVector {
  const parts = line.split(" ");
  const bar = parts.indexOf("|");
  if (bar < 2 || !/^[0-9]+$/.test(parts[0] ?? "")) throw new Error(`step 2: not a packed guard vector: ${line}`);
  const cell = (t: string): [string, GuardCell] => {
    const m = CELL.exec(t);
    if (m === null) throw new Error(`step 2: not a packed guard cell: ${t} (in ${line})`);
    return [m[1]!, { aimedByBin: m[2]!.split(",").map(Number), interceptions: Number(m[3]), completions: Number(m[4]) }];
  };
  return {
    game: Number(parts[0]),
    gameId: decodeURIComponent(parts[1] ?? ""),
    classes: Object.fromEntries(parts.slice(2, bar).map(cell)) as Partial<Record<ThrowClass, GuardCell>>,
    desperation: Object.fromEntries(parts.slice(bar + 1).filter((t) => t !== "").map(cell)) as Partial<Record<DesperationPocket, GuardCell>>,
  };
}

export const packS2Folds = (f: S2Folds): PackedS2Folds => ({ ...f, guardGames: f.guardGames.map(packGuardGame) });
export const unpackS2Folds = (p: PackedS2Folds): S2Folds => ({ ...structuredClone(p), guardGames: p.guardGames.map(unpackGuardGame) }) as S2Folds;

export interface PlayStep2Options {
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
}

/** Plays one arm on both leagues at one seed set: step 1's record, re-stamped, with the step-2 folds. */
export function playStep2Arm(id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep2Options = {}): Step2Record {
  const corpus = opts.corpus ?? FULL_CORPUS;
  const s2: Record<League, S2Folds> = { flat: emptyS2Folds(), gen: emptyS2Folds() };
  const base = playArm(id, seedSet, env, {
    corpus,
    label: "pocket step 2",
    ...(opts.log === undefined ? {} : { log: opts.log }),
    visit: (league, o, snapshot, tunables) => foldS2Game(s2[league], o.events, tunables, snapshot),
  });
  const { format: _format, stamp: _stamp, ...rest } = base;
  void _format;
  void _stamp;
  return sanitize({ format: STEP2_ARM_FORMAT, stamp: step2StampOf(id, seedSet, env, corpus), ...rest, s2: { flat: packS2Folds(s2.flat), gen: packS2Folds(s2.gen) } }) as unknown as Step2Record;
}

// --- Q-2: the re-played bases against step 1's records -----------------------------------------------------

/** `report.intGuard.<league>`'s step-1 keys, the only ones Q-2 compares (plan §4.5). */
export const Q2_INT_GUARD_KEYS = ["intPerAttempt", "intPerAimed", "forcedThrowShare", "completionPerAttempt", "completionPerAimed", "intSourceMix", "all", "byClass", "onTheRun"] as const;

/**
 * Q-2's projection of a record (plan §4.5, C2-F6): `measures`, `s1`, `report.clock`, `rows`,
 * `timeToThrow`, `sacks`, `p2s`, and `report.intGuard.<league>` with step 1's keys only. Left out by
 * name: the stamp, `report.isBase`, `report.affectedPlays`, and every field step 2 adds.
 */
export function q2Projection(r: Pick<ArmRecord, "measures" | "s1" | "report">): Readonly<Record<string, JsonValue>> {
  const guard = (league: League): Record<string, unknown> => {
    const g = r.report.intGuard[league] as unknown as Record<string, unknown>;
    return Object.fromEntries(Q2_INT_GUARD_KEYS.flatMap((k) => (k in g ? [[k, g[k]]] : [])));
  };
  return sanitize({
    measures: r.measures,
    s1: r.s1,
    "report.clock": r.report.clock,
    "report.rows": r.report.rows,
    "report.timeToThrow": r.report.timeToThrow,
    "report.sacks": r.report.sacks,
    "report.p2s": r.report.p2s,
    "report.intGuard.flat": guard("flat"),
    "report.intGuard.gen": guard("gen"),
  }) as Record<string, JsonValue>;
}

/** The projected fields on which a re-play and step 1's record differ (whole canonical text); empty when equal. */
export function q2Problems(replay: Pick<ArmRecord, "measures" | "s1" | "report">, step1: Pick<ArmRecord, "measures" | "s1" | "report">): readonly string[] {
  const a = q2Projection(replay);
  const b = q2Projection(step1);
  return Object.keys(b).filter((k) => canonicalise(a[k] ?? null) !== canonicalise(b[k] ?? null));
}

/** Step 1's records of the re-played bases, by `<arm>.set<n>`. */
export type Step1References = ReadonlyMap<string, ArmRecord>;

/** Set 1 from the committed step-1 report, set 2 from the committed fixture (plan §4.5's set-2 fixture). */
export function loadStep1References(pkgRoot: string = PKG_ROOT): Step1References {
  const out = new Map<string, ArmRecord>();
  const reportPath = join(pkgRoot, STEP1_RECORDS_JSON);
  const committed = existsSync(reportPath) ? (JSON.parse(readFileSync(reportPath, "utf8")) as { readonly arms?: Readonly<Record<string, ArmRecord>> }).arms ?? {} : {};
  for (const { id } of STEP2_BASES) {
    const one = committed[id];
    if (one !== undefined && one.stamp.seedSet === 1) out.set(`${id}.set1`, one);
    const two = join(pkgRoot, STEP1_SET2_FIXTURE, `${id}.set2.json`);
    if (existsSync(two)) out.set(`${id}.set2`, JSON.parse(readFileSync(two, "utf8")) as ArmRecord);
  }
  return out;
}

// --- the plan ----------------------------------------------------------------------------------------------

export interface Step2Target {
  readonly id: ArmId;
  readonly seedSet: SeedSet;
}

export interface Step2Plan {
  readonly targets: readonly Step2Target[];
  readonly complete: readonly Step2Target[];
  readonly mine: readonly Step2Target[];
  /** Set when the run plays one seed set: reported, never graded. */
  readonly oneSet?: SeedSet;
}

export const targetName = (t: Step2Target): string => `${t.id}.set${String(t.seedSet)}`;

/** Every asked arm on each asked set, in `STEP2_RUN_IDS` order; shards take every n-th from the i-th. */
export function planStep2(opts: { readonly arms?: readonly ArmId[]; readonly shard?: { readonly index: number; readonly count: number }; readonly seedSet?: SeedSet }): Step2Plan {
  const shard = opts.shard ?? { index: 1, count: 1 };
  if (!Number.isInteger(shard.count) || shard.count < 1 || !Number.isInteger(shard.index) || shard.index < 1 || shard.index > shard.count) {
    throw new RangeError(`--shard takes i/n with 1 <= i <= n (got ${String(shard.index)}/${String(shard.count)})`);
  }
  const ids = opts.arms ?? STEP2_RUN_IDS;
  if (new Set(ids).size !== ids.length) throw new RangeError(`--arms names an arm twice: ${ids.join(",")}`);
  const foreign = ids.filter((id) => !(STEP2_RUN_IDS as readonly string[]).includes(id));
  if (foreign.length > 0) throw new RangeError(`--arms: ${foreign.join(", ")} ${foreign.length === 1 ? "is" : "are"} not step 2's (${STEP2_RUN_IDS.join(", ")})`);
  const sets: readonly SeedSet[] = opts.seedSet === undefined ? SEED_SETS : [opts.seedSet];
  const targets = STEP2_RUN_IDS.filter((id) => ids.includes(id)).flatMap((id) => sets.map((seedSet) => ({ id, seedSet })));
  const complete = opts.seedSet === undefined ? STEP2_RUN_IDS.flatMap((id) => SEED_SETS.map((seedSet) => ({ id, seedSet }))) : targets;
  return { targets, complete, mine: targets.filter((_, i) => i % shard.count === shard.index - 1), ...(opts.seedSet === undefined ? {} : { oneSet: opts.seedSet }) };
}

// --- grading -----------------------------------------------------------------------------------------------

/** The records present, by arm and seed set. */
export type Step2Records = ReadonlyMap<ArmId, Readonly<Partial<Record<SeedSet, Step2Record>>>>;

export interface Step2Grade {
  readonly sections: Step2Sections;
  readonly groups: readonly { readonly seedSet: SeedSet; readonly input: StepReportInput }[];
}

const num = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(dp));
const sgn = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(dp)}`);
const diffOf = (a: number | null | undefined, b: number | null | undefined): number | null => (a === null || a === undefined || b === null || b === undefined ? null : a - b);
const meanOf = (xs: readonly (number | null)[]): number | null => (xs.length === 0 || xs.some((x) => x === null) ? null : (xs as number[]).reduce((a, b) => a + b, 0) / xs.length);
const sumOf = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const aimedOf = (m: IntMix): number => sumOf(m.aimedByBin);

function figuresOf(r: Step2Record | undefined, league: League): Step1Figures {
  const m = r?.measures[league];
  return { pressure: m?.pressure ?? null, hitOrSack: m?.hitOrSack ?? null, sack: m?.sack ?? null, release: m?.release ?? null };
}

/** The binomial SE of a difference of two per-dropback rates in percent, the arms read as independent. */
export function rateDiffSE(a: number | null, na: number, b: number | null, nb: number): number | null {
  if (a === null || b === null || !(na > 0) || !(nb > 0)) return null;
  const pa = a / 100;
  const pb = b / 100;
  return 100 * Math.sqrt((pa * (1 - pa)) / na + (pb * (1 - pb)) / nb);
}

function bandText(c: BandClause): string {
  const lo = typeof c.lo === "number" ? c.lo : undefined;
  const hi = typeof c.hi === "number" ? c.hi : undefined;
  if (c.direction !== undefined) return `direction ${c.direction}`;
  if (lo !== undefined && hi !== undefined) return `${String(lo)} to ${String(hi)}`;
  if (hi !== undefined) return `at most ${String(hi)}`;
  if (lo !== undefined) return `at least ${String(lo)}`;
  return c.kind === "structural" ? "its proof" : "filed";
}

const inBand = (v: number | null, c: BandClause): boolean => v !== null && Number.isFinite(v) && (typeof c.lo !== "number" || v >= c.lo) && (typeof c.hi !== "number" || v <= c.hi);

/** The step's groups for `renderStepReport`: each B arm with its base (the filed map), then A0 and A14 alone. */
export const STEP2_GROUPS: readonly { readonly base: ArmId; readonly arms: readonly ArmId[] }[] = Object.freeze([
  ...[...new Set(STEP2_ARM_DEFS.map((d) => d.base!))].map((base) => ({ base, arms: STEP2_ARM_DEFS.filter((d) => d.base === base).map((d) => d.id) })),
  ...STEP2_BASES.map((b) => b.id).filter((id) => !STEP2_ARM_DEFS.some((d) => d.base === id)).map((base) => ({ base, arms: [] as ArmId[] })),
]);

/** Grades the records present against the filing as AM-1 amends it (pure: the same records give the same grade). */
export function gradeStep2(records: Step2Records, file: FiledFile, guard: Step2Guard, references: Step1References, oneSet?: SeedSet): Step2Grade {
  const sets: readonly SeedSet[] = oneSet === undefined ? SEED_SETS : [oneSet];
  const gradedSet: SeedSet = oneSet ?? GRADED_SEED_SET;
  const at = (id: ArmId, s: SeedSet): Step2Record | undefined => records.get(id)?.[s];
  for (const [id, bySet] of records) {
    for (const s of SEED_SETS) {
      const r = bySet[s];
      if (r === undefined) continue;
      if (r.stamp.amendments !== guard.digest) throw new Error(`ADR-089 step 2: refused to grade: ${id} (set ${String(s)}) is stamped with amendments ${String(r.stamp.amendments)}, not ${guard.digest}`);
      if (r.stamp.arm !== id || r.stamp.seedSet !== s) throw new Error(`ADR-089 step 2: refused to grade: the record filed as ${id} set ${String(s)} is ${r.stamp.arm} set ${String(r.stamp.seedSet)}`);
    }
  }
  const present = STEP2_RUN_IDS.flatMap((id) => sets.flatMap((s) => (at(id, s) === undefined ? [] : [{ id, s, r: at(id, s)! }])));
  const where = (x: { id: ArmId; s: SeedSet }): string => `${x.id} set ${String(x.s)}`;
  const unpacked = new Map<string, S2Folds>();
  const s2Of = (r: Step2Record, league: League): S2Folds => {
    const key = `${r.stamp.arm}.${String(r.stamp.seedSet)}.${league}`;
    let f = unpacked.get(key);
    if (f === undefined) {
      f = unpackS2Folds(r.s2[league]);
      unpacked.set(key, f);
    }
    return f;
  };
  const cut = (r: Step2Record): boolean => r.stamp.corpus.flatFirst !== null || r.stamp.corpus.genThroughWeek !== null;

  // --- the structural proofs and the fold checks ---
  const proofs: Step2Proof[] = [];
  const isPerRusher = (id: ArmId): boolean => armById(id).forcing === "PER_RUSHER";

  const selfRule = present.filter((x) => !isPerRusher(x.id));
  const selfExceptions = present.flatMap((x) => LEAGUES.flatMap((l) => {
    const f = x.r.s2[l].mustAct;
    const c = selfCheckOf(f);
    return [
      ...(c.offRule !== null && c.offRule.exceptions > 0 ? [`${where(x)} ${l}: ${String(c.offRule.exceptions)} of ${String(c.offRule.acts)} off-rule acts (first: ${f.problems[0] ?? ""})`] : []),
      ...(c.witness.exceptions > 0 ? [`${where(x)} ${l}: ${String(c.witness.exceptions)} witness exceptions over ${String(c.witness.holds)} closing HOLDs and ${String(c.witness.clockExpired)} CLOCK_EXPIRED (first: ${f.witness.problems[0] ?? ""})`] : []),
    ];
  }));
  const selfCounted = sumOf(selfRule.flatMap((x) => LEAGUES.map((l) => selfCheckOf(x.r.s2[l].mustAct).offRule?.counted ?? 0)));
  const witnessOf = (x: { r: Step2Record }, l: League): MustActSelfCheck["witness"] => selfCheckOf(x.r.s2[l].mustAct).witness;
  const countHolds = sumOf(present.flatMap((x) => LEAGUES.map((l) => witnessOf(x, l).countHolds)));
  const a1Self = present.filter((x) => x.id === "A1");
  proofs.push({
    id: "s2.selfCheck",
    what:
      "the count part's restatement, both ways (plan §1.7 (ii); review F-1, F-6): not too strict, on every arm under step 1's forcing rule or the narrower counter (every forced act on a tick whose status does not force satisfies the restated count part); " +
      "not too generous, on every arm (on a closing HOLD the rule part does not hold, and at or past qb.throwawayEarliestSeconds the count part does not either; on a CLOCK_EXPIRED the rule part does not hold)",
    kind: "fold",
    verdict: present.length === 0 ? "NOT APPLICABLE" : selfExceptions.length > 0 || (selfRule.length > 0 && selfCounted === 0) || countHolds === 0 ? "FAIL" : "PASS",
    detail:
      `${String(selfCounted)} off-rule forced acts counted on ${selfRule.map(where).join(", ") || "no step-1-rule arm"}; A1's own: ${a1Self.map((x) => LEAGUES.map((l) => { const c = selfCheckOf(x.r.s2[l].mustAct).offRule; return `${where(x)} ${l} ${String(c?.counted ?? 0)} of ${String(c?.acts ?? 0)}`; }).join(", ")).join(", ") || "not in this run"}; ` +
      `witnesses on ${String(present.length)} arm-sets: ${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => witnessOf(x, l).holds))))} closing HOLDs (${String(countHolds)} at or past throwawayEarliestSeconds), ${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => witnessOf(x, l).clockExpired))))} CLOCK_EXPIRED; ` +
      `exceptions ${selfExceptions.length === 0 ? "none" : selfExceptions.join("; ")}${countHolds === 0 ? "; no closing HOLD at or past throwawayEarliestSeconds: the generous direction saw no case" : ""}`,
  });
  const selfFault = selfExceptions.length > 0;

  const perRusher = present.filter((x) => isPerRusher(x.id));
  const counterFails = perRusher.flatMap((x) => LEAGUES.flatMap((l) => (x.r.s2[l].mustAct.problemCount > 0 ? [`${where(x)} ${l} (${String(x.r.s2[l].mustAct.problemCount)}; first: ${x.r.s2[l].mustAct.problems[0] ?? ""})`] : [])));
  const counterNoCase = perRusher.filter((x) => LEAGUES.every((l) => x.r.s2[l].mustAct.acts === 0)).map(where);
  const a1Present = a1Self.length > 0;
  proofs.push({
    id: "s2.falsifier.counterAlone",
    what: "must act never fires on the counter alone (proof:must-act-counter; O40), on every PER_RUSHER arm's full corpora",
    kind: "structural",
    verdict: perRusher.length === 0 ? "NOT APPLICABLE" : selfFault ? "NOT JUDGED" : !a1Present ? "NOT CHECKED" : counterFails.length > 0 || counterNoCase.length > 0 ? "FAIL" : "PASS",
    detail:
      `${perRusher.map(where).join(", ") || "no PER_RUSHER arm"}: ${String(sumOf(perRusher.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].mustAct.acts))))} forced acts; failures ${counterFails.length === 0 ? "none" : counterFails.join("; ")}` +
      `${counterNoCase.length === 0 ? "" : `; no case on ${counterNoCase.join(", ")}`}${selfFault ? "; NOT JUDGED: the count part's self-check (either direction) failed (a fold fault)" : !a1Present ? "; NOT CHECKED: A1's self-check is not in this run" : ""}; the golden 50 under pocket-1.s2 is Q-4 (pocketS2Pins) and the engine's cases mustAct.test.ts, outside this run`,
  });

  const arrivalFails = present.flatMap((x) => LEAGUES.flatMap((l) => (x.r.s2[l].arrival.problemCount > 0 ? [`${where(x)} ${l} (${String(x.r.s2[l].arrival.problemCount)}; first: ${x.r.s2[l].arrival.problems[0] ?? ""})`] : [])));
  const arrivalNoCase = present.filter((x) => LEAGUES.every((l) => x.r.s2[l].arrival.cases === 0)).map(where);
  const arrivals = sumOf(present.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].arrival.cases)));
  proofs.push({
    id: "s2.falsifier.everyArrival",
    what: "every arrival makes him act: the play ends on the arrival tick in a THROW or a SACK (proof:must-act-arrival; O41), on every arm, the bases included",
    kind: "structural",
    verdict: present.length === 0 ? "NOT APPLICABLE" : arrivalFails.length > 0 || arrivalNoCase.length > 0 ? "FAIL" : "PASS",
    detail:
      `${String(arrivals)} arrivals over ${String(present.length)} arm-sets and both leagues (THROW ${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].arrival.throws))))}, ` +
      `SACK ${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].arrival.sacks))))}); failures ${arrivalFails.length === 0 ? "none" : arrivalFails.join("; ")}${arrivalNoCase.length === 0 ? "" : `; no case on ${arrivalNoCase.join(", ")}`}`,
  });

  const warnFails = present.flatMap((x) => LEAGUES.flatMap((l) => (x.r.s2[l].warning.problemCount > 0 ? [`${where(x)} ${l} (${String(x.r.s2[l].warning.problemCount)}; first: ${x.r.s2[l].warning.problems[0] ?? ""})`] : [])));
  const warnNoCase = present.filter((x) => LEAGUES.every((l) => x.r.s2[l].warning.statusTicks === 0)).map(where);
  proofs.push({
    id: "s2.warning.clean",
    what: "no threat inside the warning coexists with CLEAN, and the arrival floor rebuilt with the arm's own horizons is never above the status (the §6 row's proof, not filed; O42), on every arm",
    kind: "structural",
    verdict: present.length === 0 ? "NOT APPLICABLE" : warnFails.length > 0 || warnNoCase.length > 0 ? "FAIL" : "PASS",
    detail: `${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].warning.statusTicks))))} status ticks, ${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].warning.warningTicks))))} with a threat inside the warning; failures ${warnFails.length === 0 ? "none" : warnFails.join("; ")}${warnNoCase.length === 0 ? "" : `; no status tick on ${warnNoCase.join(", ")}`}`,
  });

  const liveFails = present.flatMap((x) => LEAGUES.flatMap((l) => (x.r.s2[l].liveSet.problemCount > 0 ? [`${where(x)} ${l} (${String(x.r.s2[l].liveSet.problemCount)}; first: ${x.r.s2[l].liveSet.problems[0] ?? ""})`] : [])));
  proofs.push({
    id: "s2.liveSet",
    what: "the live threat set rebuilt from the published RUSH_THREATs: no ARRIVED dated after its tick, every live threat past its ETA published ARRIVED",
    kind: "structural",
    verdict: present.length === 0 ? "NOT APPLICABLE" : liveFails.length > 0 ? "FAIL" : "PASS",
    detail: `${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].liveSet.statusTicks))))} status ticks read; failures ${liveFails.length === 0 ? "none" : liveFails.join("; ")}`,
  });

  const s1Fails = present.flatMap((x) => LEAGUES.flatMap((l) => s1Problems(x.r.s1[l]).map((p) => `${where(x)} ${l}: ${p}`)));
  proofs.push({
    id: "s1.streamChecks",
    what: "step 1's stream checks (window ticks, beat accounting, margins, approach) on every arm of the run (Q-6)",
    kind: "structural",
    verdict: present.length === 0 ? "NOT APPLICABLE" : s1Fails.length > 0 ? "FAIL" : "PASS",
    detail: `${String(present.length)} arm-sets, both leagues; failures ${s1Fails.length === 0 ? "none" : s1Fails.join("; ")}`,
  });

  const m2Fails = present.flatMap((x) => LEAGUES.flatMap((l) => s2Problems(s2Of(x.r, l)).filter((p) => p.startsWith("m2 STREAM")).map((p) => `${where(x)} ${l}: ${p}`)));
  proofs.push({
    id: "s2.m2.identity",
    what: "M2 STREAM's rebuild: its statuses and won-rep threats equal the stream's, its rolled ticks their margins, and 0 by the rule under PER_RUSHER (plan §1.6)",
    kind: "fold",
    verdict: present.length === 0 ? "NOT APPLICABLE" : m2Fails.length > 0 ? "FAIL" : "PASS",
    detail: `${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].m2.statusChecks))))} statuses and ${String(sumOf(present.flatMap((x) => LEAGUES.map((l) => x.r.s2[l].m2.threatChecks))))} won-rep threats rebuilt; failures ${m2Fails.length === 0 ? "none" : m2Fails.join("; ")}`,
  });
  const m2FaultOnA1 = m2Fails.some((f) => f.startsWith("A1 "));

  const q2: string[] = [];
  const q2Fails: string[] = [];
  let q2Checked = 0;
  for (const { id } of STEP2_BASES) {
    for (const s of sets) {
      const r = at(id, s);
      if (r === undefined) continue;
      const ref = references.get(`${id}.set${String(s)}`);
      if (cut(r)) q2.push(`${id} set ${String(s)} NOT CHECKED (a cut corpus, tests only)`);
      else if (ref === undefined) q2.push(`${id} set ${String(s)} NOT CHECKED (no step-1 record)`);
      else {
        q2Checked += 1;
        const differ = q2Problems(r, ref);
        if (differ.length > 0) q2Fails.push(`${id} set ${String(s)} differs on ${differ.join(", ")}`);
        else q2.push(`${id} set ${String(s)} equal`);
      }
    }
  }
  proofs.push({
    id: "q2.replay",
    what: "the re-played bases equal step 1's records on Q-2's projection (set 1: reports/adr-089-step1.json; set 2: the committed fixture)",
    kind: "structural",
    verdict: q2Fails.length > 0 ? "FAIL" : q2Checked === 0 ? (q2.length === 0 ? "NOT APPLICABLE" : "NOT CHECKED") : "PASS",
    detail: `${[...q2, ...q2Fails].join("; ") || "no re-played base in this run"}`,
  });
  const proofById = new Map(proofs.map((p) => [p.id, p]));

  // --- the guard under AM-1 ---
  const sideOf = (r: Step2Record, league: League): GuardSide => ({ all: r.report.intGuard[league].all, byClass: r.report.intGuard[league].byClass });
  const bySetOf = <T>(id: ArmId, f: (r: Step2Record) => T): Partial<Record<SeedSet, T>> => Object.fromEntries(sets.flatMap((s) => (at(id, s) === undefined ? [] : [[s, f(at(id, s)!)]]))) as Partial<Record<SeedSet, T>>;
  const bothPresent = (a: ArmId, b: ArmId): boolean => sets.some((s) => at(a, s) !== undefined && at(b, s) !== undefined);
  const checkdownOf = (id: ArmId, league: League): Step2Checkdown[] =>
    sets.flatMap((s) => {
      const r = at(id, s);
      if (r === undefined) return [];
      const c = checkdownTriggersOf(r.s2[league].mustAct);
      return [{ seedSet: s, rule: c.rule, acts: c.acts, threatPart: c.threatPart, statusPart: c.statusPart, countPart: c.countPart, ruleOnly: c.ruleOnly, countOnly: c.countOnly, both: c.both, neither: c.neither }];
    });
  const guardRow = (arm: ArmId, base: ArmId, league: League, cumulative: boolean): Step2GuardRow => {
    const clock: GuardClock = (sets.map((s) => at(arm, s)).find((r) => r !== undefined) as Step2Record).report.clock;
    const reading = am1ArmReading(bySetOf(base, (r) => sideOf(r, league)), bySetOf(arm, (r) => sideOf(r, league)), clock, guard.lines);
    const gamesOf = (id: ArmId): Partial<Record<SeedSet, readonly GuardGameVector[]>> => bySetOf(id, (r) => s2Of(r, league).guardGames);
    const baseGames = gamesOf(base);
    const armGames = gamesOf(arm);
    const pairedClasses: Record<string, PairedReading> = {};
    for (const c of reading.classes) pairedClasses[c.cls] = pairedReading(baseGames, armGames, { of: "CLASS", cls: c.cls }, clock);
    const desperation: Step2GuardHalf[] = DESPERATION_HALVES.map((half) => {
      const cellsOf = (id: ArmId): Partial<Record<SeedSet, IntMix>> => bySetOf(id, (r) => r.s2[league].desperation[half]);
      const b = cellsOf(base);
      const a = cellsOf(arm);
      const both = Object.fromEntries(sets.flatMap((s) => (b[s] !== undefined && a[s] !== undefined && aimedOf(b[s]!) > 0 && aimedOf(a[s]!) > 0 ? [[s, true]] : [])));
      const pick = (m: Partial<Record<SeedSet, IntMix>>): Partial<Record<SeedSet, IntMix>> => Object.fromEntries(Object.entries(m).filter(([s]) => s in both));
      return {
        half,
        bySet: sets.flatMap((s) => (b[s] === undefined || a[s] === undefined ? [] : [{ seedSet: s, baseAimed: aimedOf(b[s]!), baseInterceptions: b[s]!.interceptions, armAimed: aimedOf(a[s]!), armInterceptions: a[s]!.interceptions }])),
        reading: Object.keys(both).length === 0 ? null : am1Reading(pick(b), pick(a), clock, "CLASS", guard.lines),
        paired: pairedReading(baseGames, armGames, { of: "HALF", half }, clock),
      };
    });
    const reweighted = sets.flatMap((s) => {
      const b = at(base, s);
      const a = at(arm, s);
      return b === undefined || a === undefined ? [] : [reweightedDesperation(s, b.s2[league].desperation, a.s2[league].desperation)];
    });
    return {
      arm, base, league, cumulative, reading,
      pairedLeague: pairedReading(baseGames, armGames, { of: "LEAGUE" }, clock),
      pairedClasses, desperation, reweighted,
      checkdown: { base: checkdownOf(base, league), arm: checkdownOf(arm, league) },
    };
  };
  const guardRows: Step2GuardRow[] = [];
  for (const id of STEP2_ARM_IDS) {
    const base = guard.bases[id]!;
    if (!bothPresent(id, base)) continue;
    for (const league of LEAGUES) guardRows.push(guardRow(id, base, league, false));
  }
  for (const [arm, base] of [[STEP2_DESIGN_ARM, guard.cumulative.design], [STEP2_PRICING_ARM, guard.cumulative.pricing]] as const) {
    if (!bothPresent(arm, base)) continue;
    for (const league of LEAGUES) guardRows.push(guardRow(arm, base, league, true));
  }
  const graded = guardRows.filter((g) => !g.cumulative);

  // --- the clauses ---
  const clauses: Step2ClauseResult[] = [];
  const fig = (id: ArmId, s: SeedSet, league: League): Step1Figures => figuresOf(at(id, s), league);
  const ttt = (id: ArmId, s: SeedSet, league: League): number | null => at(id, s)?.measures[league].timeToThrow ?? null;
  type RateKey = "pressure" | "hitOrSack" | "sack";
  const diffAt = (arm: ArmId, base: ArmId, s: SeedSet, league: League, key: RateKey): number | null => (at(arm, s) === undefined || at(base, s) === undefined ? null : diffOf(fig(arm, s, league)[key], fig(base, s, league)[key]));
  const seAt = (arm: ArmId, base: ArmId, s: SeedSet, league: League, key: RateKey): number | null => {
    const a = at(arm, s)?.measures[league];
    const b = at(base, s)?.measures[league];
    return a === undefined || b === undefined ? null : rateDiffSE(a[key], a.dropbacks, b[key], b.dropbacks);
  };
  const pair = (arm: ArmId, base: ArmId, league: League, key: RateKey, unit: string): { text: string; value: number | null; se: number | null } => {
    const value = diffAt(arm, base, gradedSet, league, key);
    const se = seAt(arm, base, gradedSet, league, key);
    const others = sets.filter((s) => s !== gradedSet).map((s) => `set ${String(s)} ${sgn(diffAt(arm, base, s, league, key))}`);
    const mean = sets.length === 2 ? `; two-set mean ${sgn(meanOf(sets.map((s) => diffAt(arm, base, s, league, key))))}` : "";
    const t = key === "pressure" ? "" : ` [time to throw ${arm} ${num(ttt(arm, gradedSet, league), 3)} s, ${base} ${num(ttt(base, gradedSet, league), 3)} s]`;
    return { text: `${arm} - ${base} ${league} set ${String(gradedSet)} ${sgn(value)} ${unit} (binomial SE ${num(se)})${others.length === 0 ? "" : `; ${others.join("; ")}`}${mean}${t}`, value, se };
  };
  const missingOf = (ids: readonly ArmId[]): ArmId[] => ids.filter((id) => at(id, gradedSet) === undefined);

  for (const c of file.bands.clauses) {
    if (c.step !== "2" && c.step !== "guard") continue;
    const filed = bandText(c);
    const fromProof = (p: Step2Proof | undefined): Step2Verdict => (p === undefined ? "NOT PLAYED" : p.verdict);
    const pressure = /^s2\.pressure\.(flat|gen)$/.exec(c.id);
    if (pressure !== null || c.id === "s2.hitOrSack" || c.id === "s2.sack") {
      const key: RateKey = pressure !== null ? "pressure" : c.id === "s2.sack" ? "sack" : "hitOrSack";
      const leagues: readonly League[] = pressure !== null ? [pressure[1] as League] : LEAGUES;
      const missing = missingOf([STEP2_DESIGN_ARM, "A1"]);
      const reads = leagues.map((l) => pair(STEP2_DESIGN_ARM, "A1", l, key, "points"));
      const ok = reads.every((r) => inBand(r.value, c));
      clauses.push({
        id: c.id, kind: c.kind, arms: [STEP2_DESIGN_ARM, "A1"], filed, values: missing.length > 0 ? [`not played: ${missing.join(", ")}`] : reads.map((r) => r.text),
        verdict: missing.length > 0 ? "NOT PLAYED" : oneSet !== undefined ? "REPORTED" : ok ? "PASS" : "FAIL",
        note: "the step-2 build minus step 1's, set 1 graded; set 2 and the two-set mean beside (on gen, set 2 is a second league, so the sets may disagree more than the binomial SE says; S4-6)",
      });
      continue;
    }
    if (c.id === "s2.falsifier.sacksDown") {
      const missing = missingOf(["B1", "A1"]);
      const reads = LEAGUES.map((l) => ({ l, ...pair("B1", "A1", l, "sack", "per 100 dropbacks") }));
      const ok = reads.every((r) => inBand(r.value, c));
      const beside = LEAGUES.map((l) => `${l}: B7 - A1 ${sgn(diffAt("B7", "A1", gradedSet, l, "sack"))}, B3 - B2 ${sgn(diffAt("B3", "B2", gradedSet, l, "sack"))}`);
      const notes = ["the forcing point lowers sacks: B1 minus A1 at or above 0 on each league, set 1 (O38)"];
      for (const r of reads) {
        if (r.value !== null && r.se !== null && !inBand(r.value, c) && Math.abs(r.value) <= 2 * r.se) notes.push(`${r.l}: a filed failure within noise of its line (within 2 SE of 0), both sets beside, not re-run (S4-8)`);
        const b7 = diffAt("B7", "A1", gradedSet, r.l, "sack");
        if (r.value !== null && b7 !== null && Math.sign(r.value) * Math.sign(b7) < 0) notes.push(`${r.l}: B1 and B7 disagree in sign, so both go to the owner (R12)`);
      }
      clauses.push({
        id: c.id, kind: c.kind, arms: ["B1", "A1"], filed, values: missing.length > 0 ? [`not played: ${missing.join(", ")}`] : [...reads.map((r) => r.text), `beside, set ${String(gradedSet)}: ${beside.join("; ")}`],
        verdict: missing.length > 0 ? "NOT PLAYED" : oneSet !== undefined ? "REPORTED" : ok ? "PASS" : "FAIL",
        note: notes.join("; "),
      });
      continue;
    }
    if (c.id === "s2.m2") {
      const a1 = sets.flatMap((s) => (at("A1", s) === undefined ? [] : [at("A1", s)!]));
      const hi = typeof c.hi === "number" ? c.hi : Number.POSITIVE_INFINITY;
      const values = LEAGUES.map((l) => {
        const merged = a1.map((r) => r.s2[l].m2).reduce<M2StreamFold | undefined>((acc, f) => (acc === undefined ? f : mergeM2StreamFolds(acc, f)), undefined);
        if (merged === undefined) return `${l} n/a`;
        const share = merged.forced === 0 ? null : (100 * merged.counterFar) / merged.forced;
        const i = poissonInterval95(merged.counterFar);
        return `A1 ${l} sets ${a1.map((r) => String(r.stamp.seedSet)).join(" and ")}: ${String(merged.counterFar)} of ${String(merged.forced)} forced (${num(share)}%, interval ${merged.forced === 0 ? "n/a" : `${((100 * i.lo) / merged.forced).toFixed(4)}% to ${((100 * i.hi) / merged.forced).toFixed(4)}%`})${share !== null && share > hi ? ": outside the reported range, information" : ""}`;
      });
      clauses.push({
        id: c.id, kind: c.kind, arms: ["A1"], filed: `${filed} percent`, values: a1.length === 0 ? ["not played: A1"] : values,
        verdict: a1.length === 0 ? "NOT PLAYED" : m2FaultOnA1 ? "NOT JUDGED" : "REPORTED",
        note: "M2 STREAM on A1's streams; the filed first-order figure, the per-set counts and b.tm-399 are in the M2 section",
      });
      continue;
    }
    if (c.id === "s2.falsifier.counterAlone" || c.id === "s2.falsifier.everyArrival") {
      const p = proofById.get(c.id);
      clauses.push({ id: c.id, kind: c.kind, arms: c.id.endsWith("counterAlone") ? perRusher.map((x) => x.id).filter((v, i, xs) => xs.indexOf(v) === i) : [...new Set(present.map((x) => x.id))], filed, values: [p?.detail ?? "not played"], verdict: fromProof(p) });
      continue;
    }
    if (c.id === "guard.mix" || c.id === "guard.byClass") {
      const arms = [...new Set(graded.map((g) => g.arm))];
      const missingArms = STEP2_ARM_IDS.filter((id) => !arms.includes(id));
      const breaching = graded.filter((g) => (c.id === "guard.mix" ? g.reading.league.verdict === "BREACH" : g.reading.classes.some((k) => k.reading?.verdict === "BREACH")));
      const zs = graded.map((g) => (c.id === "guard.mix" ? g.reading.league.Z : Math.max(...g.reading.classes.map((k) => (k.reading?.Z ?? Number.NEGATIVE_INFINITY))))).filter((z): z is number => z !== null && Number.isFinite(z));
      const values = breaching.length === 0
        ? [`${String(graded.length)} arm-league readings, none breaching${zs.length === 0 ? "" : ` (largest Z ${sgn(Math.max(...zs))})`}`]
        : breaching.map((g) => `${g.arm} against ${g.base} ${g.league} breaches: ${c.id === "guard.mix" ? `league-wide Z ${sgn(g.reading.league.Z)}` : g.reading.classes.filter((k) => k.reading?.verdict === "BREACH").map((k) => `${k.cls} Z ${sgn(k.reading!.Z)}`).join(", ")}`);
      clauses.push({
        id: c.id, kind: c.kind, arms, filed: `as amended by ${guard.entry} (${guard.record}): pooled Z over both seed sets above ${String(c.id === "guard.mix" ? guard.lines.zLeague : guard.lines.zClass)} breaches (filed: rise over the mix-predicted rise ${filed})`,
        values: [...values, ...(missingArms.length === 0 ? [] : [`not played: ${missingArms.join(", ")}`])],
        verdict: arms.length === 0 ? "NOT PLAYED" : oneSet !== undefined ? "REPORTED" : breaching.length > 0 ? "FAIL" : "PASS",
        note: "the filed reading, e* and the paired SE are printed beside every reading in the guard section",
      });
      continue;
    }
    if (c.id === "guard.onTheRun.clean" || c.id === "guard.onTheRun.pressured") {
      const part = c.id.endsWith("clean") ? "clean" : "pressured";
      const values = present.flatMap((x) => LEAGUES.map((l) => {
        const r = x.r.report.intGuard[l].onTheRun?.[part];
        return `${where(x)} ${l} ${r === undefined || r.aimed === 0 ? "n/a" : ((100 * r.interceptions) / r.aimed).toFixed(2)} (${String(r?.aimed ?? 0)} aimed)`;
      }));
      const notZero = part === "clean" ? present.filter((x) => LEAGUES.some((l) => (x.r.report.intGuard[l].onTheRun?.clean.aimed ?? 0) > 0)).map(where) : [];
      clauses.push({
        id: c.id, kind: c.kind, arms: [...new Set(present.map((x) => x.id))], filed, values, verdict: present.length === 0 ? "NOT PLAYED" : "REPORTED",
        ...(part === "clean"
          ? {
              note:
                "0 by construction at step 2 (F.8 item 5): under PER_RUSHER, ESCAPE runs only on the threat part, a threat within C, so the arrival floor is COLLAPSING or worse at that tick and the pocket he leaves is never CLEAN; " +
                `under step 1's rule (B2, B4, B5, B7 and the bases) the same holds through forcesDecision; it opens at step 5a${notZero.length === 0 ? "" : `; NOT 0 on ${notZero.join(", ")}`}`,
            }
          : {}),
      });
      continue;
    }
    if (c.kind === "structural") {
      const every = [...new Set(present.map((x) => x.id))];
      clauses.push({
        id: c.id, kind: c.kind, arms: every, filed,
        values: [c.id === "guard.removedClass" ? "printed with its count and interceptions in each group report (REMOVED lines) and in the AM-1 readings" : "printed for every arm on both leagues and both seed sets in the group reports"],
        verdict: every.length > 0 ? "PASS" : "NOT PLAYED",
      });
    }
  }

  // --- the comparisons ---
  const comparison = (arm: ArmId, against: ArmId, league: League, s: SeedSet, label?: string): Step2Comparison[] =>
    at(arm, s) === undefined || at(against, s) === undefined
      ? []
      : [{ arm, against, league, seedSet: s, figures: fig(arm, s, league), againstFigures: fig(against, s, league), timeToThrow: ttt(arm, s, league), againstTimeToThrow: ttt(against, s, league), ...(label === undefined ? {} : { label }) }];
  const dirOnly = (id: ArmId): string | undefined => (DIRECTION_ONLY.has(id) ? "reported, direction only" : undefined);
  const each = <T>(f: (league: League, s: SeedSet) => T[]): T[] => LEAGUES.flatMap((l) => sets.flatMap((s) => f(l, s)));
  const sub = (a: Step1Figures, b: Step1Figures): Step1Figures => ({ pressure: diffOf(a.pressure, b.pressure), hitOrSack: diffOf(a.hitOrSack, b.hitOrSack), sack: diffOf(a.sack, b.sack), release: diffOf(a.release, b.release) });
  const add = (a: Step1Figures, b: Step1Figures): Step1Figures => sub(a, { pressure: b.pressure === null ? null : -b.pressure, hitOrSack: b.hitOrSack === null ? null : -b.hitOrSack, sack: b.sack === null ? null : -b.sack, release: b.release === null ? null : -b.release });
  const contrast = (formula: string, ids: readonly ArmId[], league: League, s: SeedSet, f: (g: (id: ArmId) => Step1Figures) => Step1Figures, first: ArmId, note?: string): Step2Contrast[] =>
    ids.every((id) => at(id, s) !== undefined) ? [{ formula, league, seedSet: s, figures: f((id) => fig(id, s, league)), timeToThrow: ttt(first, s, league), ...(note === undefined ? {} : { note }) }] : [];

  const headline = each((l, s) => comparison(STEP2_DESIGN_ARM, "A1", l, s));
  const decomposition = each((l, s) => [...comparison("B1", "A1", l, s, "information"), ...comparison("B2", "A1", l, s, "reported, direction only"), ...comparison("B3", "A1", l, s, "the design")]);
  const interaction = each((l, s) => contrast("B3 - (B1 + B2 - A1)", ["B1", "B2", "B3", "A1"], l, s, (g) => sub(g("B3"), sub(add(g("B1"), g("B2")), g("A1"))), "B3", "the interaction of the forcing point and the warning"));
  const m2ShareOf = (id: ArmId, league: League): string => {
    const folds = sets.flatMap((s) => (at(id, s) === undefined ? [] : [at(id, s)!.s2[league].m2]));
    if (folds.length === 0) return "n/a";
    const m = folds.reduce((a, b) => mergeM2StreamFolds(a, b));
    return m.forced === 0 ? "n/a" : `${((100 * m.counterFar) / m.forced).toFixed(2)}% (${String(m.counterFar)} of ${String(m.forced)})`;
  };
  const worldAndRule = each((l, s) => [
    ...contrast("B7 - A1", ["B7", "A1"], l, s, (g) => sub(g("B7"), g("A1")), "B7", "the basis mechanism on S"),
    ...contrast("B5 - A5", ["B5", "A5"], l, s, (g) => sub(g("B5"), g("A5")), "B5", "the same on L8 with Heels, pkA's A123"),
    ...contrast("(B7 - A1) - (B5 - A5)", ["B7", "A1", "B5", "A5"], l, s, (g) => sub(sub(g("B7"), g("A1")), sub(g("B5"), g("A5"))), "B7", "the world (F.9 item 6)"),
    ...contrast("B3 - B7", ["B3", "B7"], l, s, (g) => sub(g("B3"), g("B7")), "B3", `the rule, per rusher at the same horizons; M2 STREAM on A1 ${m2ShareOf("A1", l)} beside it`),
  ]);
  const filedBands = file.bands.clauses.filter((c) => c.step === "2" && c.kind === "graded" && c.id !== "s2.falsifier.sacksDown").map((c) => `${c.id} ${bandText(c)}`).join(", ");
  const information = each((l, s) => [
    ...comparison("B4", "A1", l, s, `reported, direction only; M2's counter-far share beside: A1 ${m2ShareOf("A1", l)}, B4's own stream ${m2ShareOf("B4", l)}`),
    ...comparison("B5", "A5", l, s, `reported, direction only; beside the filed s2 bands, not graded on B5: ${filedBands}`),
    ...comparison("B7", "A1", l, s, "reported, direction only"),
    ...(at("B5", s) === undefined
      ? []
      : [{ arm: "B5", against: "pkA's A123 (designA.json, REPORTED)", league: l, seedSet: s, figures: fig("B5", s, l), againstFigures: PKA_A123[l], timeToThrow: ttt("B5", s, l), againstTimeToThrow: null, label: "reported, direction only; F.9 item 6's basis" }]),
  ]);
  const pricing = each((l, s) => comparison(STEP2_PRICING_ARM, "A11", l, s, "pricing arm, never a design value; reported, direction only"));

  // --- M2 ---
  const m2 = m2Section(file, (id, s) => at(id, s), sets);

  // --- each arm ---
  const arms: Step2ArmCounts[] = [];
  for (const id of STEP2_RUN_IDS) {
    if (!sets.some((s) => at(id, s) !== undefined)) continue;
    for (const league of LEAGUES) {
      const bySet: Step2ArmSetCounts[] = sets.flatMap((s) => {
        const r = at(id, s);
        if (r === undefined) return [];
        const m = r.measures[league];
        const f = r.s2[league];
        const aff = r.affected;
        const forcedActs = Object.fromEntries(FORCED_ACT_KINDS.filter((k) => f.mustAct.byKind[k].acts > 0).map((k) => [k, { acts: f.mustAct.byKind[k].acts, threatPart: f.mustAct.byKind[k].threatPart, statusPart: f.mustAct.byKind[k].statusPart, countPart: f.mustAct.byKind[k].countPart }]));
        return [{
          seedSet: s, dropbacks: m.dropbacks, timeToThrow: m.timeToThrow,
          ...(aff === undefined ? {} : { affected: { against: aff.against, byMechanism: aff[league].byMechanism as Record<string, number>, union: aff[league].union, dropbacks: aff[league].dropbacks } }),
          mustActShare: mustActShareSummary(f.share), forcedActs,
          arrival: { cases: f.arrival.cases, throws: f.arrival.throws, sacks: f.arrival.sacks, failures: f.arrival.problemCount },
          warning: { statusTicks: f.warning.statusTicks, warningTicks: f.warning.warningTicks, cleanWithWarning: f.warning.cleanWithWarning, failures: f.warning.problemCount },
          selfCheck: selfCheckOf(f.mustAct),
          quickPressure: m.quickPressure, floorCounter: m.floorCounter, cleanWithLiveWonRep: m.cleanWithLiveWonRep,
          ...(armById(id).clock.kind === "S" ? { passRushWin: m.passRushWin } : {}),
          missRuleN: m.missRuleN, s1Problems: s1Problems(r.s1[league]).length, s2Problems: s2Problems(s2Of(r, league)),
        }];
      });
      const label = dirOnly(id);
      arms.push({ arm: labelOf(id), role: STEP2_BASES.find((b) => b.id === id)?.role ?? armById(id).role, league, ...(label === undefined ? {} : { label }), bySet });
    }
  }

  // --- the outcome ---
  const structuralFailures = proofs.filter((p) => p.kind === "structural" && p.verdict === "FAIL").map((p) => `${p.id}: ${p.detail}`);
  const foldFaults = proofs.filter((p) => p.kind === "fold" && p.verdict === "FAIL").map((p) => `${p.id}: ${p.detail}`);
  const gradedFailures = clauses.filter((c) => c.kind === "graded" && c.verdict === "FAIL" && !c.id.startsWith("guard.")).map((c) => `${c.id} (${c.filed}): ${c.values.join("; ")}`);
  const breachRows = oneSet === undefined ? graded.filter((g) => g.reading.breaches.length > 0) : [];
  const guardBreaches = breachRows.map((g) => `${g.arm} against ${g.base}, ${g.league}: ${g.reading.breaches.map((b) => (b === "league-wide" ? `league-wide Z ${sgn(g.reading.league.Z)}` : `${b} Z ${sgn(g.reading.classes.find((k) => k.cls === b)?.reading?.Z ?? null)}`)).join(", ")}`);
  const missingTargets = STEP2_RUN_IDS.flatMap((id) => SEED_SETS.filter((s) => at(id, s) === undefined).map((s) => `${id}.set${String(s)}`));
  const complete = oneSet === undefined && missingTargets.length === 0;
  const next: string[] = [];
  if (guardBreaches.length > 0) {
    next.push(
      `${guard.entry} breaches: the step stops (ADR-089:1306). The arms have finished playing; the step does not close, nothing merges and step 3 does not start. The owner gets both seed sets' numbers, the AM-1 and the filed readings with e* and the paired SE, ` +
        "the cumulative line, the INT-source mix and the class rows (DESPERATION's split, and on a DESPERATION or CHECKDOWN breach the composition and the re-weighted rise); the card asks what to do with them (D9), and the merge card waits",
    );
    if (breachRows.some((g) => g.reading.breaches.includes("DESPERATION") || g.reading.breaches.includes("CHECKDOWN"))) {
      next.push("a DESPERATION or CHECKDOWN breach goes to the owner with the class's composition (AM-1 §4.5): the guard section prints DESPERATION's halves with the rise re-weighted to the base's composition, and the checkdown looks by trigger");
    }
  }
  if (foldFaults.length > 0) next.push("fix the fold (plan §4.7, kind 2): the clauses it feeds print NOT JUDGED until then, and the step cannot close");
  if (oneSet !== undefined) next.push(`this run played seed set ${String(oneSet)} only: it is reported, never graded; the step's verdict needs both seed sets (pocket -- --step 2)`);
  else if (missingTargets.length > 0) next.push(`not every target of the step is in this run (missing ${missingTargets.join(", ")}): the merge card waits for the full run`);
  if (gradedFailures.length > 0) next.push("the graded failures go to the owner as filed: no band moves, nothing re-files, nothing is tuned to pass or re-run to try again");
  const outcome: Step2Outcome = {
    structuralFailures, foldFaults, gradedFailures, guardBreaches,
    mergeCard: complete && structuralFailures.length === 0 && foldFaults.length === 0 && guardBreaches.length === 0,
    next,
  };

  // --- the group reports, one per base group and seed set ---
  const groups: { seedSet: SeedSet; input: StepReportInput }[] = [];
  for (const s of sets) {
    for (const g of STEP2_GROUPS) {
      const base = at(g.base, s);
      if (base === undefined) continue;
      const { affectedPlays: _drop, ...baseReport } = base.report;
      void _drop;
      const reports: ArmReport[] = [{ ...baseReport, arm: labelOf(g.base), isBase: true }];
      for (const id of g.arms) {
        const r = at(id, s);
        if (r !== undefined) reports.push({ ...r.report, arm: labelOf(id), isBase: false });
      }
      groups.push({ seedSet: s, input: { step: "2", pr33: PR33_STATE, arms: reports, filedGuardSuperseded: `${guard.entry} (${guard.record})` } });
    }
  }

  return {
    sections: {
      pr33: PR33_STATE,
      ...(oneSet === undefined ? {} : { oneSet }),
      amendments: { digest: guard.digest, entry: guard.entry, record: guard.record, zLeague: guard.lines.zLeague, zClass: guard.lines.zClass, zSetSE0: guard.lines.zSetSE0 },
      headline, clauses, decomposition, interaction, worldAndRule, information, pricing, m2, guard: guardRows, proofs, arms, outcome,
    },
    groups,
  };
}

/** The filed first-order M2 rows the report reprints (plan §1.6 item 1): S with the window, and L at R = 8 and 5. */
const FILED_M2_ARMS = ["S-theta11-window", "L-R8", "L-R5"] as const;

const m2Row = (arm: string, league: League, sets: string, f: M2StreamFold): Step2M2Row => {
  const s = m2StreamSummary(f) as Record<string, unknown> & {
    rule: string | null; dropbacks: number; forced: number; counterFar: number; counterFarSharePct: number | null; counterFarIntervalPct: { lo: number; hi: number } | null;
    zeroByTheRule: boolean | null; unforcedSharePct: number | null; byAlignment: Record<string, number>; byPosition: Record<string, number>;
    identity: Step2M2Row["identity"]; jitter: Step2M2Row["jitter"]; tm399: Step2M2Row["tm399"];
  };
  return {
    arm, league, sets, rule: s.rule, dropbacks: s.dropbacks, forced: s.forced, counterFar: s.counterFar, sharePct: s.counterFarSharePct, intervalPct: s.counterFarIntervalPct,
    zeroByTheRule: s.zeroByTheRule, unforcedSharePct: s.unforcedSharePct, byAlignment: s.byAlignment, byPosition: s.byPosition, identity: s.identity, jitter: s.jitter, tm399: s.tm399,
  };
};

/** M2's section: the filed first-order figures, then M2 STREAM on A1, A5 and B4 (each set, then both), and the PER_RUSHER arms' zero by the rule. */
export function m2Section(file: FiledFile, at: (id: ArmId, s: SeedSet) => Step2Record | undefined, sets: readonly SeedSet[]): Step2M2Section {
  const clause = file.bands.clauses.find((c) => c.id === "s2.m2");
  const band = { lo: typeof clause?.lo === "number" ? clause.lo : 0, hi: typeof clause?.hi === "number" ? clause.hi : Number.POSITIVE_INFINITY };
  const M2 = (file.M as unknown as Record<string, unknown>)["M2"] as Record<string, Record<string, { forced: number; counterFar: number; counterFarSharePct: number | null } | undefined> | undefined> | undefined;
  const filed: Step2M2Filed[] = [];
  for (const league of LEAGUES) {
    for (const arm of FILED_M2_ARMS) {
      const f = M2?.[league]?.[arm];
      if (f === undefined) continue;
      const i = poissonInterval95(f.counterFar);
      filed.push({ league, arm, forced: f.forced, counterFar: f.counterFar, sharePct: f.counterFarSharePct, intervalPct: f.forced === 0 ? null : { lo: Number(((100 * i.lo) / f.forced).toFixed(4)), hi: Number(((100 * i.hi) / f.forced).toFixed(4)) } });
    }
  }
  const rows: Step2M2Row[] = [];
  for (const id of ["A1", "A5", "B4", "B1", "B3", "B6"] as const) {
    for (const league of LEAGUES) {
      const present = sets.flatMap((s) => (at(id, s) === undefined ? [] : [{ s, f: at(id, s)!.s2[league].m2 }]));
      if (present.length === 0) continue;
      const perRusher = armById(id).forcing === "PER_RUSHER";
      if (!perRusher && present.length > 1) for (const p of present) rows.push(m2Row(id, league, String(p.s), p.f));
      rows.push(m2Row(id, league, present.map((p) => String(p.s)).join(" and "), present.map((p) => p.f).reduce((a, b) => mergeM2StreamFolds(a, b))));
    }
  }
  return {
    band,
    filed,
    rows,
    notes: [
      "the unit is percent of forced decisions; a value above the reported range prints \"outside the reported range, information\" (C2-F18); nothing is graded",
      "b.tm-399 references: TM's 399 of 14,627 edge won-rep threats under S, and step 0's own 398 of 14,447 on the gen base (392 of them cornerbacks; REPORTED-UNREPRODUCED)",
      "A5's rows are the L return package's (O46); B4's rebuild uses B4's own counter rule, so its identity check stays meaningful (C2-F21); on B1, B3 and B6 the construct is 0 by the rule (PER_RUSHER with C at 0.5 s), and that is checked",
    ],
  };
}

/** The step report as Markdown: the step-2 sections, then `renderStepReport` once per base group and seed set. */
export function renderStep2Report(grade: Step2Grade, records: Step2Records): string {
  const stamps = [...records.values()].flatMap((bySet) => SEED_SETS.flatMap((s) => (bySet[s] === undefined ? [] : [bySet[s]!.stamp])));
  const commits = [...new Set(stamps.map((s) => `${s.commit}${s.dirty ? " (dirty)" : ""}`))].sort();
  const first = stamps[0];
  const lines: string[] = [];
  const s = grade.sections;
  lines.push(`# ADR-089 step 2: the arms${s.oneSet === undefined ? "" : `, seed set ${String(s.oneSet)} only (reported, never graded)`}`);
  lines.push("");
  lines.push(
    "Must act per rusher and the one-second warning are built behind the switch that is OFF; these arms turn it on for measurement only. The step-2 clauses are the filing's predictions about B3 against A1, " +
      "read on set 1 with set 2 beside; the guard is read under AM-1 on both seed sets.",
  );
  lines.push("");
  lines.push(`- filing: ${first?.filedDigest ?? STEP0_FILED_DIGEST}; amendments: ${s.amendments.digest} (${s.amendments.entry}, ${s.amendments.record})`);
  lines.push(`- fingerprint (every package's source, the lockfile, the manifests and the filing): ${first?.fingerprint ?? "n/a"}`);
  lines.push(`- commit: ${commits.join(", ")} (read from the repository's files; a change staged and not committed is not seen)`);
  lines.push(`- node: ${first?.node ?? "n/a"}; caller ${STEP1_CALLER}; corpora: flat 496 games, gen 272 games, on each seed set (on gen, set 2 is a second league)${first !== undefined && (first.corpus.flatFirst !== null || first.corpus.genThroughWeek !== null) ? ` (CUT: flat first ${String(first.corpus.flatFirst)}, gen through week ${String(first.corpus.genThroughWeek)}; tests only)` : ""}`);
  lines.push(`- arms: ${[...records.keys()].map((id) => `${id} (sets ${SEED_SETS.filter((x) => records.get(id)?.[x] !== undefined).join(", ")}; ${(SEED_SETS.map((x) => records.get(id)?.[x]).find((r) => r !== undefined)?.stamp.overlayDigest) ?? (SEED_SETS.map((x) => records.get(id)?.[x]).find((r) => r !== undefined)?.stamp.rules ?? "?")})`).join(", ")}`);
  lines.push(`- PR #33: ${PR33_STATE}, so P2S prints against both 22.02 and 15.46`);
  lines.push("- the guard's SE: AM-1's statistic is the binomial SE with the two arms read as independent, pooled over the seed sets; e* and the paired, game-clustered SE are printed beside every reading (F.9 item 3)");
  lines.push("");
  lines.push(...renderStep2Sections(s));
  lines.push("## The step reports, one per base group and seed set");
  for (const g of grade.groups) {
    lines.push("");
    lines.push(`### ${g.input.arms.find((a) => a.isBase)?.arm ?? "?"}${g.input.arms.length > 1 ? ` with ${g.input.arms.filter((a) => !a.isBase).map((a) => a.arm).join(", ")}` : " alone"}, seed set ${String(g.seedSet)}`);
    lines.push("");
    lines.push("```text");
    lines.push(...renderStepReport(g.input));
    lines.push("```");
  }
  return `${lines.join("\n")}\n`;
}

/** The measures file (`--out` on a graded run): every target's record, the grade and the group inputs. */
export function step2MeasuresOf(records: Step2Records, grade: Step2Grade, guard: Step2Guard, fingerprint: string, targets: readonly Step2Target[], oneSet?: SeedSet): JsonValue {
  return sanitize({
    format: STEP2_MEASURES_FORMAT,
    filedDigest: STEP0_FILED_DIGEST,
    amendments: guard.digest,
    fingerprint,
    ...(oneSet === undefined ? {} : { oneSet }),
    arms: Object.fromEntries(targets.map((t) => [targetName(t), records.get(t.id)![t.seedSet]!])),
    grade: grade.sections,
    groups: grade.groups,
  });
}

/** A measures file's records, in its order (Q-3c: the committed file is re-graded from these, never from its grade). */
export function recordsOfMeasures(json: unknown): { readonly records: Step2Records; readonly targets: readonly Step2Target[]; readonly fingerprint: string; readonly oneSet?: SeedSet } {
  const m = json as { format?: unknown; fingerprint?: unknown; oneSet?: unknown; arms?: Readonly<Record<string, Step2Record>> };
  if (m.format !== STEP2_MEASURES_FORMAT || typeof m.fingerprint !== "string" || m.arms === undefined) throw new Error(`not a step-2 measures file (format ${String(m.format)})`);
  const records = new Map<ArmId, Partial<Record<SeedSet, Step2Record>>>();
  const targets: Step2Target[] = [];
  for (const [name, r] of Object.entries(m.arms)) {
    if (name !== `${r.stamp.arm}.set${String(r.stamp.seedSet)}`) throw new Error(`the measures file holds ${r.stamp.arm} set ${String(r.stamp.seedSet)} under ${name}`);
    targets.push({ id: r.stamp.arm, seedSet: r.stamp.seedSet });
    records.set(r.stamp.arm, { ...(records.get(r.stamp.arm) ?? {}), [r.stamp.seedSet]: r });
  }
  return { records, targets, fingerprint: m.fingerprint, ...(m.oneSet === 1 || m.oneSet === 2 ? { oneSet: m.oneSet } : {}) };
}

// --- the run -----------------------------------------------------------------------------------------------

export interface Step2Options {
  readonly arms?: readonly ArmId[];
  readonly shard?: { readonly index: number; readonly count: number };
  /** The cache's parent; the fingerprint is appended. */
  readonly cacheParent: string;
  readonly seedSet?: SeedSet;
  readonly report?: string;
  readonly out?: string;
  readonly filedPath: string;
  readonly amendmentsPath: string;
  /** Tests only: the pin the amendments file must equal (default `AMENDMENTS_DIGEST`). */
  readonly amendmentsPin?: string;
  readonly env: Step1Env;
  /** A report or measures file under this directory is a committed report (refused from a dirty tree). */
  readonly committedDir?: string;
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
  /** Tests only: plays an arm (default `playStep2Arm`). */
  readonly play?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep2Options) => Step2Record;
  /** Step 1's records the re-played bases are checked against (default `loadStep1References`). */
  readonly references?: Step1References;
}

export interface Step2RunResult {
  readonly cacheDir: string;
  readonly played: readonly string[];
  readonly cached: readonly string[];
  readonly remaining: readonly string[];
  readonly graded: boolean;
  readonly wrote: readonly string[];
  readonly grade?: Step2Grade;
}

function readStep2Record(path: string): Step2Record {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Step2Record;
  if (parsed.format !== STEP2_ARM_FORMAT) throw new Error(`${path}: not a step-2 arm record (format ${String((parsed as { format?: unknown }).format)})`);
  return parsed;
}

/** The cached record's stamp problems against this build's, the amendments digest named first. */
function cachedStampProblems(record: Step2Record, want: Step2Stamp): readonly string[] {
  const amend = record.stamp?.amendments;
  const lead = amend !== want.amendments ? [`stamped with amendments ${String(amend)}, not this build's ${want.amendments}`] : [];
  return [...lead, ...stampProblems(record.stamp, want).filter((p) => !p.startsWith("amendments:"))];
}

/** Plays the targets not yet cached; refuses a cached record that is not this build's. */
function playTargets(targets: readonly Step2Target[], cacheDir: string, opts: Step2Options, corpus: Step1Corpus, log: (line: string) => void): { played: string[]; cached: string[] } {
  const play = opts.play ?? playStep2Arm;
  const played: string[] = [];
  const cached: string[] = [];
  for (const t of targets) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const want = step2StampOf(t.id, t.seedSet, opts.env, corpus);
    if (existsSync(path)) {
      const problems = cachedStampProblems(readStep2Record(path), want);
      if (problems.length > 0) throw new Error(`ADR-089 step 2: the cached ${t.id} (set ${String(t.seedSet)}) at ${path} is not this build's arm: ${problems.join("; ")}. Delete it, or use another --cache`);
      cached.push(targetName(t));
      log(`pocket step 2: ${targetName(t)} is cached`);
      continue;
    }
    log(`pocket step 2: playing ${targetName(t)}`);
    writeAtomic(path, jsonText(play(t.id, t.seedSet, opts.env, { corpus, log })));
    played.push(targetName(t));
    log(`pocket step 2: ${targetName(t)} played`);
  }
  return { played, cached };
}

/** Reads every target's record from the cache, each checked against this build's stamp. */
function readTargets(targets: readonly Step2Target[], cacheDir: string, opts: Step2Options, corpus: Step1Corpus, committed: boolean): Map<ArmId, Partial<Record<SeedSet, Step2Record>>> {
  const records = new Map<ArmId, Partial<Record<SeedSet, Step2Record>>>();
  for (const t of targets) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const record = readStep2Record(path);
    const problems = cachedStampProblems(record, step2StampOf(t.id, t.seedSet, opts.env, corpus));
    if (problems.length > 0) throw new Error(`ADR-089 step 2: refused to grade: the cached ${targetName(t)} at ${path} is not this build's arm: ${problems.join("; ")}`);
    if (committed && record.stamp.dirty) throw new Error(`ADR-089 step 2: refused to grade a committed report: ${targetName(t)} was played on a dirty tree (${record.stamp.commit})`);
    records.set(t.id, { ...(records.get(t.id) ?? {}), [t.seedSet]: record });
  }
  return records;
}

/** Plays this shard's targets, then grades if every target of the step is in the cache. */
export function runStep2(opts: Step2Options): Step2RunResult {
  const log = opts.log ?? ((): void => undefined);
  const { file, guard } = preflightStep2(opts.filedPath, opts.amendmentsPath, opts.amendmentsPin);
  const plan = planStep2({ ...(opts.arms === undefined ? {} : { arms: opts.arms }), ...(opts.shard === undefined ? {} : { shard: opts.shard }), ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }) });
  const corpus = opts.corpus ?? FULL_CORPUS;
  const committed = opts.committedDir !== undefined && [opts.report, opts.out].some((p) => p !== undefined && isUnder(p, opts.committedDir!));
  if (committed && opts.env.dirty) throw new Error("ADR-089 step 2: a committed report (under reports/) is made from a clean tree, and this tree is dirty: commit first, or write the report elsewhere");
  const cacheDir = join(opts.cacheParent, opts.env.fingerprint);
  mkdirSync(cacheDir, { recursive: true });
  log(`pocket step 2: fingerprint ${opts.env.fingerprint}; amendments ${guard.digest} (${guard.entry}); arms cached in ${cacheDir}`);
  const { played, cached } = playTargets(plan.mine, cacheDir, opts, corpus, log);

  const remaining = plan.complete.filter((t) => !existsSync(armFileOf(cacheDir, t.id, t.seedSet))).map(targetName);
  const wrote: string[] = [];
  // Q-3b: with --arms naming one arm, --out is that arm's records, whether or not every target is cached.
  const recordsOut = opts.arms !== undefined && opts.arms.length === 1 ? opts.out : undefined;
  if (recordsOut !== undefined) {
    const own = plan.targets.filter((t) => existsSync(armFileOf(cacheDir, t.id, t.seedSet)));
    const body = { format: STEP2_RECORDS_FORMAT, amendments: guard.digest, fingerprint: opts.env.fingerprint, records: Object.fromEntries(own.map((t) => [targetName(t), JSON.parse(readFileSync(armFileOf(cacheDir, t.id, t.seedSet), "utf8")) as unknown])) };
    writeAtomic(recordsOut, jsonText(body));
    wrote.push(recordsOut);
    log(`pocket step 2: wrote ${own.map(targetName).join(", ")} to ${recordsOut}`);
  }
  if (remaining.length > 0) {
    log(`pocket step 2: ${String(remaining.length)} target(s) still to play (${remaining.join(", ")}); the report is written once every target is in the cache`);
    return { cacheDir, played, cached, remaining, graded: false, wrote };
  }

  const records = readTargets(plan.complete, cacheDir, opts, corpus, committed);
  const grade = gradeStep2(records, file, guard, opts.references ?? loadStep1References(), plan.oneSet);
  if (opts.report !== undefined) {
    writeAtomic(opts.report, renderStep2Report(grade, records));
    wrote.push(opts.report);
  }
  if (opts.out !== undefined && recordsOut === undefined) {
    writeAtomic(opts.out, jsonText(step2MeasuresOf(records, grade, guard, opts.env.fingerprint, plan.complete, plan.oneSet)));
    wrote.push(opts.out);
  }
  log(`pocket step 2: graded ${String(plan.complete.length)} arm-sets${wrote.length === 0 ? "" : `; wrote ${wrote.join(", ")}`}`);
  return { cacheDir, played, cached, remaining, graded: true, wrote, grade };
}

/** `--m2`: plays or reads the asked arms (default A1, both sets) and returns M2's section, with Q-2's check of a re-played base beside. */
export function runStep2M2(opts: Step2Options): { readonly cacheDir: string; readonly played: readonly string[]; readonly cached: readonly string[]; readonly m2: Step2M2Section } {
  const log = opts.log ?? ((): void => undefined);
  const { file } = preflightStep2(opts.filedPath, opts.amendmentsPath, opts.amendmentsPin);
  const plan = planStep2({ arms: opts.arms ?? STEP2_M2_ARMS, ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }) });
  const corpus = opts.corpus ?? FULL_CORPUS;
  const cacheDir = join(opts.cacheParent, opts.env.fingerprint);
  mkdirSync(cacheDir, { recursive: true });
  log(`pocket step 2 --m2: fingerprint ${opts.env.fingerprint}; arms cached in ${cacheDir}`);
  const { played, cached } = playTargets(plan.targets, cacheDir, opts, corpus, log);
  const records = readTargets(plan.targets, cacheDir, opts, corpus, false);
  const sets = [...new Set(plan.targets.map((t) => t.seedSet))];
  const section = m2Section(file, (id, s) => records.get(id)?.[s], sets);
  const references = opts.references ?? loadStep1References();
  const q2 = plan.targets.filter((t) => STEP2_BASES.some((b) => b.id === t.id)).map((t) => {
    const r = records.get(t.id)![t.seedSet]!;
    const ref = references.get(targetName(t));
    if (r.stamp.corpus.flatFirst !== null || r.stamp.corpus.genThroughWeek !== null) return `${targetName(t)} not checked (a cut corpus)`;
    if (ref === undefined) return `${targetName(t)} not checked (no step-1 record)`;
    const differ = q2Problems(r, ref);
    return differ.length === 0 ? `${targetName(t)} equals step 1's record` : `${targetName(t)} DIFFERS from step 1's record on ${differ.join(", ")}`;
  });
  return { cacheDir, played, cached, m2: { ...section, notes: [...section.notes, `source fingerprint ${opts.env.fingerprint}`, ...(q2.length === 0 ? [] : [`Q-2's projection: ${q2.join("; ")}`])] } };
}

// --- Q-3: the digests ----------------------------------------------------------------------------------------

export interface Step2DigestsResult {
  readonly format: typeof STEP2_DIGESTS_FORMAT;
  readonly amendments: string;
  readonly node: string;
  readonly caller: string;
  readonly gamesPerLeague: number;
  readonly arms: Readonly<Record<string, {
    readonly stamp: { readonly arm: ArmId; readonly rules: string; readonly overlayDigest?: string; readonly tunablesDigest: string; readonly patches: readonly string[] };
    readonly leagues: Readonly<Record<string, { readonly games: number; readonly events: number; readonly canonicalFold: string; readonly byteFold: string }>>;
  }>>;
}

/** The golden 50 a league under `STEP2_DIGEST_ARMS` (or the named ones): folds, counts and stamps; refused like every step-2 run. */
export function runStep2Digests(opts: { readonly filedPath: string; readonly amendmentsPath: string; readonly amendmentsPin?: string; readonly node: string; readonly first?: number; readonly arms?: readonly ArmId[]; readonly log?: (line: string) => void }): Step2DigestsResult {
  preflightStep2(opts.filedPath, opts.amendmentsPath, opts.amendmentsPin);
  const arms: Record<string, Step2DigestsResult["arms"][string]> = {};
  for (const id of opts.arms ?? STEP2_DIGEST_ARMS) {
    const arm = armById(id);
    const leagues: Record<string, { games: number; events: number; canonicalFold: string; byteFold: string }> = {};
    for (const league of GOLDEN_LEAGUES) {
      const canonical: string[] = [];
      const bytes: string[] = [];
      let events = 0;
      goldenGames(league, (o) => {
        canonical.push(gameDigest(o.events));
        bytes.push(gameBytesDigest(o.events));
        events += o.events.length;
      }, { tunables: arm.tunables, callerVersion: STEP1_CALLER, ...(opts.first === undefined ? {} : { first: opts.first }) });
      leagues[league] = { games: canonical.length, events, canonicalFold: foldDigests(canonical), byteFold: foldDigests(bytes) };
      opts.log?.(`pocket step 2 digests: ${id} ${league}, ${String(canonical.length)} games`);
    }
    arms[id] = {
      stamp: { arm: id, rules: arm.rules, ...(arm.overlayDigest === undefined ? {} : { overlayDigest: arm.overlayDigest }), tunablesDigest: arm.tunablesDigest, patches: arm.patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`) },
      leagues,
    };
  }
  return { format: STEP2_DIGESTS_FORMAT, amendments: AMENDMENTS_DIGEST, node: opts.node, caller: STEP1_CALLER, gamesPerLeague: opts.first ?? 50, arms };
}

/**
 * Q-3's base check: A1's folds equal S-9's (`POCKET_1_S1_PINS`) and A5's and A11's the base pins
 * (`POCKET_1_S1_BASE_PINS`), with their stamps, on 50 games a league (or the first 10, on a 10-game
 * run). Empty when they hold, or when the run played neither 50 nor 10 games a league.
 */
export function digestPinProblems(d: Step2DigestsResult): readonly string[] {
  const pins = { A1: POCKET_1_S1_PINS.arms.A1, A5: POCKET_1_S1_BASE_PINS.arms.A5, A11: POCKET_1_S1_BASE_PINS.arms.A11 } as const;
  if (d.gamesPerLeague !== 50 && d.gamesPerLeague !== 10) return [];
  const out: string[] = [];
  for (const [id, pin] of Object.entries(pins)) {
    const got = d.arms[id];
    if (got === undefined) continue;
    if (canonicalise(got.stamp as unknown as JsonValue) !== canonicalise(pin.stamp as unknown as JsonValue)) out.push(`${id}: stamp ${JSON.stringify(got.stamp)}, pinned ${JSON.stringify(pin.stamp)}`);
    for (const league of GOLDEN_LEAGUES) {
      const g = got.leagues[league];
      const p = d.gamesPerLeague === 50 ? pin.leagues[league] : pin.leagues[league].first10;
      if (g === undefined) continue;
      for (const k of ["canonicalFold", "byteFold", "events"] as const) if (g[k] !== p[k]) out.push(`${id} ${league} ${k}: ${String(g[k])}, pinned ${String(p[k])}`);
    }
  }
  return out;
}

// --- the command -----------------------------------------------------------------------------------------

export async function step2Command(args: Step2Args, log: (line: string) => void): Promise<void> {
  const repoRoot = resolve(PKG_ROOT, "..", "..");
  const filedPath = join(PKG_ROOT, FILED_PATH);
  const amendmentsPath = join(PKG_ROOT, AMENDMENTS_PATH);
  const full = step1Env(repoRoot, filedPath);
  const env: Step1Env = { fingerprint: full.fingerprint, commit: full.commit, dirty: full.dirty, node: full.node };
  log(`pocket step 2: fingerprint ${env.fingerprint}; commit ${env.commit}${env.dirty ? ` (dirty: ${full.reason ?? "?"})` : ""}; node ${env.node}`);
  if (args.digests === true) {
    const out = args.out;
    if (out === undefined) throw new SyntaxError("--digests writes its folds to --out <file>");
    const result = runStep2Digests({ filedPath, amendmentsPath, node: process.version, log });
    writeAtomic(out, jsonText(result));
    log(`pocket step 2: wrote the digests to ${out}`);
    const problems = digestPinProblems(result);
    if (problems.length > 0) throw new Error(`ADR-089 step 2 (Q-3): the bases' folds are not S-9's and the base pins: ${problems.join("; ")}`);
    log("pocket step 2: A1's folds equal S-9's pins, and A5's and A11's the base pins");
    return;
  }
  const common = {
    ...(args.arms === undefined ? {} : { arms: args.arms }),
    ...(args.seedSet === undefined ? {} : { seedSet: args.seedSet }),
    cacheParent: args.cache ?? join(PKG_ROOT, "data-cache", "pocket-step2"),
    filedPath,
    amendmentsPath,
    env,
    log,
  };
  if (args.m2 === true) {
    const r = runStep2M2(common);
    process.stdout.write(`${renderStep2M2(r.m2).join("\n")}\n`);
    return;
  }
  const result = runStep2({
    ...common,
    ...(args.shard === undefined ? {} : { shard: args.shard }),
    ...(args.report === undefined ? {} : { report: args.report }),
    ...(args.out === undefined ? {} : { out: args.out }),
    committedDir: join(PKG_ROOT, "reports"),
  });
  if (result.graded && result.grade !== undefined) {
    const o = result.grade.sections.outcome;
    process.stdout.write(
      `ADR-089 step 2: ${String(o.structuralFailures.length)} structural failure(s), ${String(o.foldFaults.length)} fold fault(s), ${String(o.gradedFailures.length)} graded clause failure(s), ` +
        `${String(o.guardBreaches.length)} AM-1 breach(es); merge card ${o.mergeCard ? "may be posted" : "not to be posted"}\n`,
    );
    for (const line of [...o.structuralFailures, ...o.foldFaults, ...o.guardBreaches, ...o.gradedFailures, ...o.next]) process.stdout.write(`  ${line}\n`);
  }
}
