/**
 * `pnpm --filter @ff/calibration pocket -- --step 4 [--arms D1,D6] [--shard i/n] [--cache <dir>] [--seed-set 1|2] [--report <file.md>] [--out <file.json>]`
 * `pnpm --filter @ff/calibration pocket -- --step 4 --digests --out <file.json>`
 * `pnpm --filter @ff/calibration pocket -- --step 4 [--arms A0,C1] [--cache <dir>] [--seed-set 1|2] --part1`
 *
 * ADR-089 STEP 4's HARNESS (step-4 plan §5, §8, §9 commit 8): plays the re-played bases (A0, A14,
 * A1, A11, C1, C2, C14) and step 4's arms (D1 to D17) on both seed sets, and grades them against the
 * step-0 filing as AM-6 maps the guard and AM-7 reads the clauses.
 *
 *  - **The refusals first.** Nothing plays unless the filing loads, digests to `STEP0_FILED_DIGEST`
 *    and holds no pending s4 field, and the amendments file loads and validates whole, its step-3
 *    view still digesting to `STEP3_AMENDMENTS_DIGEST` (step 3's records keep grading). A run that
 *    grades (every run but `--part1`) then needs, in this order: AM-6 (the guard's step-4 map, which
 *    must read `s4.motion.int` as D6 against C2, `s4MotionIntEntryOf`), AM-7 (step 4's readings,
 *    superseding the three tilt clauses), step 4's view pinned (`STEP4_AMENDMENTS_PIN`, null until
 *    AM-6 and AM-7 are filed), and P6, P7 and P8 in contracts. Each refusal is named; none of them
 *    has played anything or made a cache. In this build AM-6 and AM-7 are not filed and the gates
 *    are false, so every graded run is refused.
 *  - **Each arm** is step 3's play (`playStep3Arm`, every step-1 to step-3 fold handed the arm's own
 *    tunables, defaults unchanged on the bases), with step 4's visit beside on every game: the s4
 *    stream (`s4Stream.ts`), M3's sacker mix (the man at contact on an s4 play) and M6 at step 4.
 *    A D arm runs step 3's folds when it reads step-3 facts and times free runners from the
 *    picture, never M2 STREAM, never C1's mirror.
 *  - **The stamp** is step 3's with `amendments` the digest of the amendments file's step-4 view.
 *  - **The cache** is `data-cache/pocket-step4/<fingerprint>/<arm>.set<n>.json`, made only from a
 *    clean tree (a dirty tree's fingerprint names no commit a record could be re-made from).
 *  - **The re-played bases** are checked against step 3's committed records
 *    (`reports/adr-089-step3.json`) on a stamp-free projection (`q4Projection`: the record less its
 *    format, its stamp, the s4 folds and C1's mirror); a difference is a structural failure.
 *  - **`--digests`** (R-1) is refused while P6, P7 or P8 is out: it plays the D arms.
 *  - **`--part1`** (a preview, never graded; AM-6 and AM-7 not needed) plays or reads the asked arms
 *    (default every playable arm) and fails on any build fault: C-1 on every s4 arm, the s4 stream's
 *    problems and the bases' replay. T_L's clamp and m(0) on D17 wait for the lift.
 *  - **No wall-clock, host or path field** in any record or file, and no clock is read here.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalise } from "../harness/digest.js";
import { positionsFromSnapshot } from "../knownTruth/pocketChannelShares.js";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, entryOf, guardFor, loadAmendments, STEP3_AMENDMENTS_DIGEST, type AmendmentsFile, type BaseMap } from "./amendments.js";
import { armById, armRefusal, STEP4_ARM_BASES, STEP4_ARM_IDS, STEP4_RUN_IDS, type ArmId, type Step4ArmId } from "./arms.js";
import { FILED_PATH, intGuardOwnClock, type GuardClock, type IntMix } from "./bands.js";
import { goldenGames, type SeedSet } from "./corpus.js";
import { filedDigest, pendingPaths, STEP0_FILED_DIGEST, type BandClause, type FiledFile, type JsonValue } from "./filed.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES } from "./golden.js";
import { am1ArmReading, s4MotionIntEntryOf, s4MotionIntReading, SEED_SETS, type Am1Lines, type GuardSide } from "./guardAm1.js";
import { emptyM3Fold, foldM3Game, sharesPct, type M3Fold } from "./m3SackerMix.js";
import { emptyM6Step4Fold, foldM6Step4Game, m6Step4Summary, type M6Step4Fold } from "./m6Contact.js";
import { LEAGUES, renderStep4Sections, type League, type Step2ClauseResult, type Step2Outcome, type Step2Proof, type Step4ArmRow, type Step4GuardRow, type Step4ReplayRow, type Step4Sections, type Step4TiltRow } from "./report.js";
import { readsStep3Facts, step4PetitionsIn, type Step4Petitions } from "./rules.js";
import { emptyS4Fold, foldS4Game, hitCurveSlope, mergeS4Folds, per100, s4Problems, sackShareOf, secondArrivalRateOf, type S4Fold, type TiltClass } from "./s4Stream.js";
import { openFiling, PR33_STATE, sanitize, type Step4Args } from "./step0.js";
import { armFileOf, FULL_CORPUS, isUnder, jsonText, realOf, STEP1_CALLER, STEP1_CLOSED_RECORDS, step1Env, stampProblems, writeAtomic, type Step1Corpus, type Step1Env } from "./step1.js";
import { playStep3Arm, rowValueOf, STEP2_CLOSED_RECORDS, STEP3_RECORDS, step3StampOf, timesFromPicture, unmadeChoicesOf, type PlayStep3Options, type Step3Record, type Step3Stamp } from "./step3.js";

export const STEP4_ARM_FORMAT = "adr-089-step4-arm/v1";
export const STEP4_MEASURES_FORMAT = "adr-089-step4-measures/v1";
export const STEP4_RECORDS_FORMAT = "adr-089-step4-records/v1";
export const STEP4_DIGESTS_FORMAT = "adr-089-step4-digests/v1";

const PKG_ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** Step 3's committed records, the re-played bases' reference (relative to the package). */
export const STEP3_RECORDS_JSON = "reports/adr-089-step3.json";
/** Step 4's committed records, never written over once `STEP4_RECORDS_FINAL`. */
export const STEP4_RECORDS = ["reports/adr-089-step4.md", "reports/adr-089-step4.json"] as const;
export const STEP4_RECORDS_FINAL: boolean = false;

/**
 * The digest step 4's view of the amendments file must equal before any graded run (AM-1 to AM-7).
 * Null while AM-6 and AM-7 are not filed: a graded run is then refused by name. It is set in the
 * commit that files them.
 */
export const STEP4_AMENDMENTS_PIN: string | null = null;

/** AM-7's superseded clauses: the three tilts, each gaining a population, a count floor and a noise line. */
export const AM7_TILTS = ["s4.tilt.pushBlocked", "s4.tilt.freeRun", "s4.tilt.behindNever"] as const;

/** The seed set the bands are graded on (set 2 beside, AM-7 `seedSets`). */
export const GRADED_SEED_SET: SeedSet = 1;

/** The fewest first contacts in a class, on either side, AM-7 reads a tilt on. */
export const TILT_MIN_CONTACTS = 30;

export const STEP4_PLAYABLE_RUN_IDS: readonly ArmId[] = Object.freeze(STEP4_RUN_IDS.filter((id) => armRefusal(id) === undefined));
export const STEP4_BASE_IDS: readonly ArmId[] = Object.freeze(STEP4_RUN_IDS.filter((id) => !(STEP4_ARM_IDS as readonly string[]).includes(id)));
export const isStep4ArmId = (id: ArmId): id is Step4ArmId => (STEP4_ARM_IDS as readonly string[]).includes(id);

// --- the refusals ----------------------------------------------------------------------------------------

/** Refuses a filing that leaves an s4 field pending, then one that is not the committed filing. */
export function checkFilingForStep4(file: FiledFile): void {
  const ours = new Set(file.bands.clauses.flatMap((c, i) => (c.step === "4" ? [String(i)] : [])));
  const pending = pendingPaths(file).filter(({ path }) => {
    const p = path.split(".");
    return p[0] === "bands" && p[1] === "clauses" && ours.has(p[2] ?? "");
  });
  if (pending.length > 0) throw new Error(`ADR-089 step 4: the filing leaves ${pending.map((p) => p.path).join(", ")} pending; every s4 field must be filed first`);
  const digest = filedDigest(file);
  if (digest !== STEP0_FILED_DIGEST) {
    throw new Error(`ADR-089 step 4: the step-0 filing digests to ${digest}, not ${STEP0_FILED_DIGEST}; step 4 grades only against the committed filing, amended only by a named entry`);
  }
}

export interface Step4View {
  readonly file: FiledFile;
  readonly view: AmendmentsFile;
  readonly digest: string;
}

/**
 * The refusals every step-4 run makes before anything plays, `--part1` included: the filing; the
 * amendments file loads and validates whole; its step-3 view still digests to
 * `STEP3_AMENDMENTS_DIGEST` (an entry filed before step 4 never moves step 3's records). Returns
 * step 4's view (entries filed before step 4 or an earlier step) and its digest, which every
 * step-4 record stamps.
 */
export function preflightStep4Previews(filedPath: string, amendmentsPath: string): Step4View {
  const refuse = (why: string): never => {
    throw new Error(`ADR-089 step 4: refused before anything plays: ${why}`);
  };
  const file = openFiling(filedPath);
  checkFilingForStep4(file);
  if (!existsSync(amendmentsPath)) refuse(`the amendments file ${amendmentsPath} does not exist`);
  let whole: AmendmentsFile;
  try {
    whole = loadAmendments(amendmentsPath, file);
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
  const at3 = amendmentsDigest(amendmentsAtStep(whole, "3"));
  if (at3 !== STEP3_AMENDMENTS_DIGEST) refuse(`the amendments file's step-3 view digests to ${at3}, not ${STEP3_AMENDMENTS_DIGEST}: step 3's view never changes once its arms have run`);
  const view = amendmentsAtStep(whole, "4");
  return { file, view, digest: amendmentsDigest(view) };
}

/** The named refusal while AM-7 (step 4's readings) is not filed in the step-4 view. */
export function am7Refusal(why: string): string {
  return (
    "ADR-089 step 4: refused to grade: AM-7 (step 4's readings, ADR-089 Appendix H, H.9; step-4 filing §3) is not filed in the amendments file's step-4 view: " +
    `${why}. ` +
    "Nothing has played and no cache was made; --part1 plays without it (a preview, never graded)"
  );
}

/** The named refusal while step 4's view is not pinned. */
export function step4PinRefusal(digest: string, pin: string | null): string {
  return pin === null
    ? `ADR-089 step 4: refused to grade: step 4's view of the amendments file (${digest}) is not pinned (STEP4_AMENDMENTS_PIN is null until the commit that files AM-6 and AM-7). Nothing has played and no cache was made`
    : `ADR-089 step 4: refused to grade: step 4's view of the amendments file digests to ${digest}, not the pin ${pin}: an amendment is append-only, and a step's view never changes once its arms have run`;
}

/** The named refusal while P6, P7 or P8 is not in contracts. */
export const STEP4_GATES_REFUSAL =
  "ADR-089 step 4: refused to grade: petitions P6, P7 and P8 (arrival_contest, QB_HIT, THROW.releaseSeconds) are not all in contracts (P6_IN_CONTRACTS, P7_IN_CONTRACTS, P8_IN_CONTRACTS in src/pocket/rules.ts and the engine), " +
  "so no D arm can play: the owner's typed yes to each and contracts-guardian's review land their text first. Nothing has played and no cache was made";

/** What the grading reads of AM-6 and AM-7. */
export interface Step4Guard {
  readonly digest: string;
  readonly view: AmendmentsFile;
  readonly am6: string;
  readonly am6Record: string;
  readonly am7: string;
  readonly am7Record: string;
  readonly bases: BaseMap;
  readonly lines: Am1Lines;
  readonly readings: Readonly<Record<string, JsonValue>>;
}

export interface PreflightStep4Options {
  /** Tests only: the pin step 4's view must equal (default `STEP4_AMENDMENTS_PIN`). */
  readonly pin?: string | null;
  /** Tests only: stands in for the P6, P7 and P8 constants. */
  readonly petitions?: Step4Petitions;
}

/**
 * Every refusal a grading run makes before anything plays, in order: the previews' refusals; AM-6
 * (`s4MotionIntEntryOf`: a step-4 guard map superseding `s4.motion.int` and reading D6 against C2),
 * whose map names only D arms, each against the base this build's arm reads (`STEP4_ARM_BASES`);
 * AM-7, superseding the three tilt clauses with `rule.readings`; no choice left unmade in the view;
 * the view's pin; and P6, P7 and P8 in contracts.
 */
export function preflightStep4(filedPath: string, amendmentsPath: string, opts: PreflightStep4Options = {}): Step4View & { readonly guard: Step4Guard } {
  const v = preflightStep4Previews(filedPath, amendmentsPath);
  const am6 = s4MotionIntEntryOf(v.view);
  const { rule, bases } = guardFor(v.view, "4");
  const refuse = (why: string): never => {
    throw new Error(`ADR-089 step 4: refused before anything plays: ${am6.entry}'s step-4 base map ${why}`);
  };
  const ids = Object.keys(bases) as ArmId[];
  const foreign = ids.filter((id) => !isStep4ArmId(id));
  if (foreign.length > 0) refuse(`names ${foreign.join(", ")}, which step 4 does not grade (its arms are D1 to D17)`);
  const differ = ids.filter((id) => bases[id] !== STEP4_ARM_BASES[id as Step4ArmId]);
  if (differ.length > 0) refuse(`reads ${differ.map((id) => `${id} against ${String(bases[id])}, and this build's arm against ${STEP4_ARM_BASES[id as Step4ArmId]}`).join("; ")}`);
  let am7;
  try {
    am7 = entryOf(v.view, "AM-7");
  } catch (e) {
    throw new Error(am7Refusal(e instanceof Error ? e.message : String(e)));
  }
  const missing = AM7_TILTS.filter((c) => !am7.supersedes.includes(c));
  if (missing.length > 0) throw new Error(am7Refusal(`AM-7 does not supersede ${missing.join(", ")}`));
  const readings = am7.rule["readings"];
  if (typeof readings !== "object" || readings === null || Array.isArray(readings)) throw new Error(am7Refusal("AM-7's rule holds no readings"));
  const choices = unmadeChoicesOf(v.view);
  if (choices.length > 0) throw new Error(`ADR-089 step 4: refused before anything plays: the amendments file's step-4 view holds a choice not yet made: ${choices.join("; ")}`);
  const pin = opts.pin === undefined ? STEP4_AMENDMENTS_PIN : opts.pin;
  if (pin === null || v.digest !== pin) throw new Error(step4PinRefusal(v.digest, pin));
  if (!step4PetitionsIn(opts.petitions)) throw new Error(STEP4_GATES_REFUSAL);
  return {
    ...v,
    guard: {
      digest: v.digest,
      view: v.view,
      am6: am6.entry,
      am6Record: am6.record,
      am7: am7.id,
      am7Record: am7.record,
      bases,
      lines: { zLeague: rule.zLeague, zClass: rule.zClass, zSetSE0: rule.zSetSE0 },
      readings: readings as Readonly<Record<string, JsonValue>>,
    },
  };
}

// --- the record ------------------------------------------------------------------------------------------

/** Step 4's folds on one league: the s4 stream, M3 (the man at contact on an s4 play) and M6 at step 4. */
export interface Step4LeagueFolds {
  readonly s4: S4Fold;
  readonly m3: M3Fold;
  readonly m6: M6Step4Fold;
}

export interface Step4Record extends Omit<Step3Record, "format" | "stamp"> {
  readonly format: typeof STEP4_ARM_FORMAT;
  readonly stamp: Step3Stamp;
  readonly s4: Readonly<Record<League, Step4LeagueFolds>>;
}

/** The fields step 4 adds to a record (and C1's mirror, which step 4 does not play); `q4Projection` leaves them out with the format and the stamp. */
export const Q4_LEFT_OUT = ["format", "stamp", "s4", "m5"] as const;

export interface PlayStep4Options {
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
  /** The step-4 view's digest the record stamps. */
  readonly amendments: string;
  /** Tests only: plays the step-3 part (default `playStep3Arm`). */
  readonly playStep3?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep3Options) => Step3Record;
}

/** Step 3's folds and M2 STREAM as step 4 runs them on `id`: a base exactly as step 3 played it; a D arm with step 3's folds when it reads step-3 facts from a free-run block, never M2. */
export function step4FoldsOf(id: ArmId): Pick<PlayStep3Options, "s3Folds" | "m2" | "m5"> {
  if (!isStep4ArmId(id)) return { m5: false };
  const s3 = readsStep3Facts(armById(id).rules) && timesFromPicture(id);
  return { s3Folds: s3, m2: false, m5: false };
}

/** Plays one arm on both leagues at one seed set: step 3's record, re-stamped, with step 4's folds. */
export function playStep4Arm(id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep4Options): Step4Record {
  const corpus = opts.corpus ?? FULL_CORPUS;
  const fresh = (): Step4LeagueFolds => ({ s4: emptyS4Fold(), m3: emptyM3Fold(), m6: emptyM6Step4Fold() });
  const state: Record<League, Step4LeagueFolds> = { flat: fresh(), gen: fresh() };
  const play = opts.playStep3 ?? playStep3Arm;
  const r = play(id, seedSet, env, {
    corpus,
    amendments: opts.amendments,
    label: "pocket step 4",
    ...(opts.log === undefined ? {} : { log: opts.log }),
    ...step4FoldsOf(id),
    visit: (league, o, snapshot, tunables) => {
      const L = state[league];
      foldS4Game(L.s4, o.events, tunables);
      foldM3Game(L.m3, o.events, positionsFromSnapshot(snapshot));
      foldM6Step4Game(L.m6, o.events);
    },
  });
  const { format: _format, stamp, ...rest } = r;
  void _format;
  return sanitize({ format: STEP4_ARM_FORMAT, stamp, ...rest, s4: state }) as unknown as Step4Record;
}

// --- the re-played bases against step 3's records ------------------------------------------------------------

/** The stamp-free projection: the record less its format, its stamp, step 4's folds and C1's mirror. */
export function q4Projection(r: object): Readonly<Record<string, JsonValue>> {
  const out: Record<string, unknown> = { ...(r as Record<string, unknown>) };
  for (const k of Q4_LEFT_OUT) delete out[k];
  return sanitize(out) as Record<string, JsonValue>;
}

/** The projected top-level fields on which a re-play and step 3's record differ; empty when equal. */
export function q4Problems(replay: object, step3: object): readonly string[] {
  const a = q4Projection(replay);
  const b = q4Projection(step3);
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => canonicalise(a[k] ?? null) !== canonicalise(b[k] ?? null));
}

export type Step3References = ReadonlyMap<string, object>;

/** Both seed sets of each re-played base from step 3's committed records. */
export function loadStep3References(pkgRoot: string = PKG_ROOT): Step3References {
  const out = new Map<string, object>();
  const path = join(pkgRoot, STEP3_RECORDS_JSON);
  if (!existsSync(path)) return out;
  const arms = (JSON.parse(readFileSync(path, "utf8")) as { readonly arms?: Readonly<Record<string, object>> }).arms ?? {};
  for (const id of STEP4_BASE_IDS) for (const s of SEED_SETS) {
    const r = arms[`${id}.set${String(s)}`];
    if (r !== undefined) out.set(`${id}.set${String(s)}`, r);
  }
  return out;
}

// --- the plan ----------------------------------------------------------------------------------------------

export interface Step4Target {
  readonly id: ArmId;
  readonly seedSet: SeedSet;
}

export interface Step4Plan {
  readonly targets: readonly Step4Target[];
  readonly complete: readonly Step4Target[];
  readonly mine: readonly Step4Target[];
  readonly oneSet?: SeedSet;
}

export const targetName = (t: Step4Target): string => `${t.id}.set${String(t.seedSet)}`;

/** Every asked arm on each asked set, in `STEP4_RUN_IDS` order; shards take every n-th from the i-th; a refused arm (every D arm before the lift) is refused by name. */
export function planStep4(opts: { readonly arms?: readonly ArmId[]; readonly shard?: { readonly index: number; readonly count: number }; readonly seedSet?: SeedSet; readonly runIds?: readonly ArmId[] }): Step4Plan {
  const shard = opts.shard ?? { index: 1, count: 1 };
  if (!Number.isInteger(shard.count) || shard.count < 1 || !Number.isInteger(shard.index) || shard.index < 1 || shard.index > shard.count) {
    throw new RangeError(`--shard takes i/n with 1 <= i <= n (got ${String(shard.index)}/${String(shard.count)})`);
  }
  const ids = opts.arms ?? opts.runIds ?? STEP4_PLAYABLE_RUN_IDS;
  if (new Set(ids).size !== ids.length) throw new RangeError(`--arms names an arm twice: ${ids.join(",")}`);
  const refused = ids.filter((id) => armRefusal(id) !== undefined);
  if (refused.length > 0) throw new RangeError(`--arms: ${refused.map((id) => `${id} is not playable: ${armRefusal(id) ?? ""}`).join("; ")}`);
  const runIds = opts.runIds ?? STEP4_PLAYABLE_RUN_IDS;
  const foreign = ids.filter((id) => !runIds.includes(id));
  if (foreign.length > 0) throw new RangeError(`--arms: ${foreign.join(", ")} ${foreign.length === 1 ? "is" : "are"} not in this run (${runIds.join(", ")})`);
  const sets: readonly SeedSet[] = opts.seedSet === undefined ? SEED_SETS : [opts.seedSet];
  const targets = runIds.filter((id) => ids.includes(id)).flatMap((id) => sets.map((seedSet) => ({ id, seedSet })));
  const complete = opts.seedSet === undefined ? runIds.flatMap((id) => SEED_SETS.map((seedSet) => ({ id, seedSet }))) : targets;
  return { targets, complete, mine: targets.filter((_, i) => i % shard.count === shard.index - 1), ...(opts.seedSet === undefined ? {} : { oneSet: opts.seedSet }) };
}

// --- the grading (pure) -------------------------------------------------------------------------------------

export type Step4Records = ReadonlyMap<ArmId, Readonly<Partial<Record<SeedSet, Step4Record>>>>;

export interface Step4Grade {
  readonly sections: Step4Sections;
}

const num = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(dp));
const diffOf = (a: number | null, b: number | null): number | null => (a === null || b === null ? null : a - b);
const inBand = (v: number | null, c: Pick<BandClause, "lo" | "hi">): boolean => v !== null && Number.isFinite(v) && (typeof c.lo !== "number" || v >= c.lo) && (typeof c.hi !== "number" || v <= c.hi);
const bandText = (c: BandClause): string =>
  typeof c.lo === "number" && typeof c.hi === "number" ? `${String(c.lo)} to ${String(c.hi)}` : typeof c.lo === "number" ? `at least ${String(c.lo)}` : typeof c.hi === "number" ? `at most ${String(c.hi)}` : c.direction !== undefined ? `direction ${c.direction}` : "structural";

/** The curve's slope, or null when the bins from 2.0 s on hold no throw (`attemptWeightedSlope` throws then). */
export function slopeOrNull(f: S4Fold, weights: "AIMED" | "ATTEMPTS"): number | null {
  try {
    const v = hitCurveSlope(f, weights);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** One s4 stream fold over both leagues of a record (or one league). */
function s4Of(r: Step4Record | undefined, league?: League): S4Fold | undefined {
  if (r === undefined) return undefined;
  return league === undefined ? mergeS4Folds(r.s4.flat.s4, r.s4.gen.s4) : r.s4[league].s4;
}

/** AM-7's tilt reading (pure): the tilted arm's first contests of `cls` against the untilted arm's, summed over the given folds. */
export function tiltReading(tilted: readonly S4Fold[], untilted: readonly S4Fold[], cls: Exclude<TiltClass, "NONE">, direction: "UP" | "DOWN"): Pick<Step4TiltRow, "tilted" | "untilted" | "diff" | "se" | "verdict"> {
  const sum = (fs: readonly S4Fold[]): { contacts: number; sacks: number } => fs.reduce((a, f) => ({ contacts: a.contacts + f.byClass[cls].contacts, sacks: a.sacks + f.byClass[cls].sacks }), { contacts: 0, sacks: 0 });
  const t = sum(tilted);
  const u = sum(untilted);
  if (t.contacts === 0 || u.contacts === 0) return { tilted: t, untilted: u, diff: null, se: null, verdict: "UNREADABLE" };
  const p1 = t.sacks / t.contacts;
  const p2 = u.sacks / u.contacts;
  const diff = 100 * (p1 - p2);
  const se = 100 * Math.sqrt((p1 * (1 - p1)) / t.contacts + (p2 * (1 - p2)) / u.contacts);
  if (t.contacts < TILT_MIN_CONTACTS || u.contacts < TILT_MIN_CONTACTS) return { tilted: t, untilted: u, diff, se, verdict: "UNREADABLE" };
  const wrong = direction === "UP" ? diff < -2 * se : diff > 2 * se;
  return { tilted: t, untilted: u, diff, se, verdict: wrong ? "FAIL" : "PASS" };
}

const TILT_ARMS: Readonly<Record<(typeof AM7_TILTS)[number], { readonly arm: ArmId; readonly cls: Exclude<TiltClass, "NONE"> }>> = Object.freeze({
  "s4.tilt.pushBlocked": { arm: "D9", cls: "PUSH_BLOCKED" },
  "s4.tilt.freeRun": { arm: "D10", cls: "FREE_RUN" },
  "s4.tilt.behindNever": { arm: "D11", cls: "BEHIND_NEVER" },
});
const TILT_BASE: ArmId = "D8";

/**
 * Grades step 4's records (pure): the twenty s4 clauses (bands on set 1, set 2 beside; the tilts
 * under AM-7; s4.motion.int under AM-6), the guard as AM-6 maps it with the own-clock reading beside,
 * the bases' replay against step 3's records, and the s4 stream's build checks.
 */
export function gradeStep4(records: Step4Records, file: FiledFile, guard: Step4Guard, references: Step3References, oneSet?: SeedSet): Step4Grade {
  const at = (id: ArmId, s: SeedSet): Step4Record | undefined => records.get(id)?.[s];
  const sets: readonly SeedSet[] = oneSet === undefined ? SEED_SETS : [oneSet];
  const graded = oneSet === undefined ? GRADED_SEED_SET : oneSet;
  const structuralFailures: string[] = [];
  const foldFaults: string[] = [];
  const gradedFailures: string[] = [];
  const guardBreaches: string[] = [];
  const next: string[] = [];
  const clauses: Step2ClauseResult[] = [];
  const s4Clauses = file.bands.clauses.filter((c) => c.step === "4");
  const clauseOf = (id: string): BandClause | undefined => s4Clauses.find((c) => c.id === id);
  const played = (ids: readonly ArmId[]): boolean => ids.every((id) => at(id, graded) !== undefined);
  const beside = (f: (s: SeedSet) => number | null): string => sets.filter((s) => s !== graded).map((s) => `set ${String(s)} ${num(f(s))}`).join(", ");
  const push = (c: BandClause, arms: readonly ArmId[], values: readonly string[], pass: boolean | null, note?: string): void => {
    const verdict = !played(arms) ? "NOT PLAYED" : c.kind !== "graded" || oneSet !== undefined ? "REPORTED" : pass === null ? "NOT JUDGED" : pass ? "PASS" : "FAIL";
    if (verdict === "FAIL") gradedFailures.push(`${c.id}: ${values.join("; ")}`);
    if (verdict === "NOT JUDGED") next.push(`${c.id} is not judged: ${note ?? ""}`);
    clauses.push({ id: c.id, kind: c.kind, arms, filed: bandText(c), values: played(arms) ? values : [`not played: ${arms.filter((id) => at(id, graded) === undefined).join(", ")}`], verdict, ...(note === undefined ? {} : { note }) });
  };

  // The bands on one arm's row, or a difference of two arms' rows.
  const rowClause = (id: string, arm: ArmId, base: ArmId | null, row: string, leagues: readonly League[]): void => {
    const c = clauseOf(id);
    if (c === undefined) return;
    const value = (s: SeedSet, l: League): number | null => (base === null ? rowValueOf(at(arm, s), row, l) : diffOf(rowValueOf(at(arm, s), row, l), rowValueOf(at(base, s), row, l)));
    const values = leagues.map((l) => `${l} set ${String(graded)} ${num(value(graded, l))}${sets.length > 1 ? ` (${beside((s) => value(s, l))})` : ""}`);
    const reads = leagues.map((l) => value(graded, l));
    const split = leagues.some((l) => sets.length > 1 && inBand(value(graded, l), c) !== inBand(value(sets.find((s) => s !== graded)!, l), c));
    push(c, base === null ? [arm] : [arm, base], values, reads.some((v) => v === null) ? null : reads.every((v) => inBand(v, c)), split ? "split: in its band on one seed set and out on the other (reported, AM-7 seedSets)" : undefined);
  };
  rowClause("s4.contact.flat.sack", "D3", null, "sack_rate", ["flat"]);
  rowClause("s4.contact.gen.sack", "D3", null, "sack_rate", ["gen"]);
  rowClause("s4.contact.pressure", "D3", "A0", "threat_creation_rate", LEAGUES);
  rowClause("s4.contact.hitOrSack", "D3", "A0", "hit_or_sack_rate", LEAGUES);
  rowClause("s4.contact.gen.share", "D3", null, "sack_share_of_hit_or_sack", ["gen"]);
  rowClause("s4.contact.flat.share", "D3", null, "sack_share_of_hit_or_sack", ["flat"]);
  rowClause("s4.motion.hits", "D6", "C2", "hits_on_aimed_throws_per_dropback", LEAGUES);

  // s4.motion.curveRises: D6's slope over the bins from 2.0 s on, aimed-weighted (AM-7), attempt-weighted beside.
  {
    const c = clauseOf("s4.motion.curveRises");
    if (c !== undefined) {
      const slope = (s: SeedSet, l: League, w: "AIMED" | "ATTEMPTS"): number | null => {
        const f = s4Of(at("D6", s), l);
        return f === undefined ? null : slopeOrNull(f, w);
      };
      const values = LEAGUES.map((l) => `${l} set ${String(graded)} aimed-weighted ${num(slope(graded, l, "AIMED"), 4)} (attempt-weighted ${num(slope(graded, l, "ATTEMPTS"), 4)})${sets.length > 1 ? `; ${beside((s) => slope(s, l, "AIMED"))}` : ""}`);
      const reads = LEAGUES.map((l) => slope(graded, l, "AIMED"));
      push(c, ["D6"], values, reads.some((v) => v === null) ? null : reads.every((v) => v! > 0), "a falling curve records default D1's fallback at step 4 for step 5b's selection (AM-7 missRule)");
    }
  }

  // s4.motion.int under AM-6: D6 against C2, league-wide, AM-1's statistic.
  {
    const c = clauseOf("s4.motion.int");
    if (c !== undefined) {
      const values: string[] = [];
      let pass: boolean | null = true;
      if (played(["D6", "C2"])) {
        for (const l of LEAGUES) {
          const mix = (id: ArmId): Partial<Record<SeedSet, IntMix>> => Object.fromEntries(sets.flatMap((s) => (at(id, s) === undefined ? [] : [[s, at(id, s)!.report.intGuard[l].all]])));
          const clock = at("D6", graded)!.report.clock as GuardClock;
          try {
            const r = s4MotionIntReading(guard.view, mix("C2"), mix("D6"), clock);
            values.push(`${l}: ${r.reading.verdict}, Z ${num(r.reading.Z)}; filed reading beside: ${r.filedPasses ? "passes" : "fails"}`);
            if (r.reading.verdict === "BREACH") pass = false;
          } catch (e) {
            values.push(`${l}: not read (${e instanceof Error ? e.message : String(e)})`);
            pass = null;
          }
        }
      }
      push(c, ["D6", "C2"], values, pass, `under ${guard.am6} (AM-1's statistic, the arm's own clock)`);
    }
  }

  // The reported sacker mix (D1) and b's reachable range (D15, D16).
  for (const [id, cls] of [["s4.sackerMix.edge", "edge"], ["s4.sackerMix.interior", "interior"]] as const) {
    const c = clauseOf(id);
    if (c === undefined) continue;
    const share = (s: SeedSet, l: League): number | null => {
      const r = at("D1", s);
      if (r === undefined || r.s4[l].m3.sacks === 0) return null;
      return sharesPct(r.s4[l].m3.unsplit)[cls] ?? 0;
    };
    push(c, ["D1"], LEAGUES.map((l) => `${l} set ${String(graded)} ${num(share(graded, l))}% of credited sacks${sets.length > 1 ? ` (${beside((s) => share(s, l))})` : ""}`), null, "reported; the man at contact is credited (s4.sackCredit)");
  }
  {
    const c = clauseOf("s4.bRange");
    if (c !== undefined) {
      const values = (["D15", "D16"] as const).flatMap((arm) => LEAGUES.map((l) => `${arm} ${l} set ${String(graded)} ${num(rowValueOf(at(arm, graded), "sack_share_of_hit_or_sack", l))}`));
      push(c, ["D15", "D16"], values, null, "reported: the grid's ends against the stand-in ceiling");
    }
  }

  // The tilts under AM-7.
  const tilts: Step4TiltRow[] = [];
  for (const id of AM7_TILTS) {
    const c = clauseOf(id);
    if (c === undefined) continue;
    const { arm, cls } = TILT_ARMS[id];
    const direction = c.direction === "DOWN" ? "DOWN" : "UP";
    const foldsOf = (a: ArmId, ss: readonly SeedSet[], ls: readonly League[]): S4Fold[] => ss.flatMap((s) => ls.flatMap((l) => (s4Of(at(a, s), l) === undefined ? [] : [s4Of(at(a, s), l)!])));
    const isPlayed = sets.every((s) => at(arm, s) !== undefined && at(TILT_BASE, s) !== undefined);
    if (!isPlayed) {
      tilts.push({ clause: id, arm, against: TILT_BASE, direction, tilted: { contacts: 0, sacks: 0 }, untilted: { contacts: 0, sacks: 0 }, diff: null, se: null, verdict: "NOT PLAYED", beside: [] });
      clauses.push({ id, kind: c.kind, arms: [arm, TILT_BASE], filed: bandText(c), values: [`not played: ${[arm, TILT_BASE].filter((a) => sets.some((s) => at(a, s) === undefined)).join(", ")}`], verdict: "NOT PLAYED", note: `under ${guard.am7}` });
      continue;
    }
    const whole = tiltReading(foldsOf(arm, sets, LEAGUES), foldsOf(TILT_BASE, sets, LEAGUES), cls, direction);
    const besideLines = sets.flatMap((s) => LEAGUES.map((l) => {
      const r = tiltReading(foldsOf(arm, [s], [l]), foldsOf(TILT_BASE, [s], [l]), cls, direction);
      return `${l} set ${String(s)}: ${String(r.tilted.sacks)}/${String(r.tilted.contacts)} against ${String(r.untilted.sacks)}/${String(r.untilted.contacts)}, ${num(r.diff)} points (SE ${num(r.se)})`;
    }));
    const verdict = oneSet !== undefined ? "REPORTED" : whole.verdict;
    tilts.push({ clause: id, arm, against: TILT_BASE, direction, ...whole, verdict, beside: besideLines });
    const text = `${String(whole.tilted.sacks)}/${String(whole.tilted.contacts)} against ${String(whole.untilted.sacks)}/${String(whole.untilted.contacts)}: ${num(whole.diff)} points (SE ${num(whole.se)})`;
    if (verdict === "FAIL") gradedFailures.push(`${id}: ${text}, beyond 2 SE against direction ${direction}`);
    if (verdict === "UNREADABLE") next.push(`${id} is unreadable: fewer than ${String(TILT_MIN_CONTACTS)} first contacts of the class on a side (${text}); reported, never passed`);
    clauses.push({ id, kind: c.kind, arms: [arm, TILT_BASE], filed: bandText(c), values: [text], verdict: verdict === "UNREADABLE" ? "NOT JUDGED" : verdict, note: `under ${guard.am7}: both leagues and sets summed` });
  }

  // The structural clauses and the folds' build checks.
  const proofs: Step2Proof[] = [];
  const s4Arms = [...records.keys()].filter((id) => isStep4ArmId(id));
  const every = (f: (r: Step4Record, s: SeedSet, l: League) => string | undefined): string[] =>
    [...records.entries()].flatMap(([id, bySet]) => sets.flatMap((s) => (bySet[s] === undefined ? [] : LEAGUES.flatMap((l) => {
      const p = f(bySet[s]!, s, l);
      return p === undefined ? [] : [`${id} set ${String(s)} ${l}: ${p}`];
    }))));
  const proof = (id: string, what: string, problems: readonly string[], kind: "structural" | "fold" = "structural"): void => {
    proofs.push({ id, what, kind, verdict: problems.length === 0 ? "PASS" : "FAIL", detail: problems.length === 0 ? "clean" : problems.slice(0, 5).join("; ") });
    if (problems.length > 0) (kind === "fold" ? foldFaults : structuralFailures).push(`${id}: ${String(problems.length)} failing, first: ${problems[0] ?? ""}`);
  };
  proof("s4.stream", "every s4 stream check: bands, one tilt, a first contest's tilt equal to its class, :contest2 only after a shed, known phases, SHED roll references, C-1", every((r, _s, l) => (r.s4[l].s4.problemCount > 0 ? `${String(r.s4[l].s4.problemCount)} problem(s), first: ${s4Problems(r.s4[l].s4)[0] ?? ""}` : undefined)));
  proof("C-1", "on every s4 arm the stand-in's dropbacks equal those with a QB_HIT ARRIVAL or SHED or a sack (AM-7 hitConstruct)", every((r, _s, l) => (r.s4[l].s4.c1Mismatch > 0 ? `${String(r.s4[l].s4.c1Mismatch)} dropback(s) disagree` : undefined)));
  const sackCredit = every((r, _s, l) => (r.s4[l].s4.uncreditedSacks > 0 ? `${String(r.s4[l].s4.uncreditedSacks)} s4 sack(s) in the pocket under the contact block with no RUSHER_SACKS contest` : undefined));
  const qbHitFields = every((r, _s, l) => (r.s4[l].s4.qbHitsMissingFields > 0 ? `${String(r.s4[l].s4.qbHitsMissingFields)} QB_HIT(s) missing approach, from or seen` : undefined));
  const m6 = every((r, _s, l) => (r.s4[l].m6.fight !== r.s4[l].m6.contacts ? "a contact not FIGHT" : r.s4[l].m6.throwawayAtContact > 0 ? `${String(r.s4[l].m6.throwawayAtContact)} contact(s) on a THROWAWAY tick` : undefined));
  proof("m6.step4", "every contact is FIGHT and none shares its tick with a THROWAWAY (reported only at step 4)", m6, "fold");
  const tiltAgainst = tilts.filter((t) => t.verdict === "FAIL").map((t) => `${t.clause} moves the margin against ${t.direction}`);
  const structural = (id: string, problems: readonly string[], note: string): void => {
    const c = clauseOf(id);
    if (c === undefined) return;
    const verdict = s4Arms.length === 0 ? "NOT PLAYED" : problems.length === 0 ? "PASS" : "FAIL";
    if (verdict === "FAIL") structuralFailures.push(`${id}: ${problems[0] ?? ""}`);
    clauses.push({ id, kind: c.kind, arms: s4Arms, filed: "structural", values: problems.slice(0, 3), verdict, note });
  };
  structural("s4.sackCredit", sackCredit, "every s4 sack in the pocket under the contact block credited to the man at contact (one RUSHER_SACKS contest); a sack on a motion-alone arm and an escape run down keep today's rule and are counted apart");
  structural("s4.qbHitFields", [...qbHitFields, ...tiltAgainst], "every QB_HIT carries approach, from and seen; no tilt against its direction");
  for (const [id, note] of [
    ["s4.reading", "a proof outside the run: the arrival reading is fixed by the stamp's bundle and never switched (engine and rules tests)"],
    ["s4.falsifier.ratingProbes", "a unit proof (exact at the contest for every b and tilt; the engine's tests), not read from the arms"],
    ["s4.falsifier.release", "waits for the lift: the release probe (release 40 against 80 on D6's bundle) is not built in this build"],
  ] as const) {
    const c = clauseOf(id);
    if (c !== undefined) clauses.push({ id, kind: c.kind, arms: [], filed: "structural", values: [], verdict: "NOT CHECKED", note });
  }

  // The guard under AM-6.
  const guardRows: Step4GuardRow[] = [];
  for (const [arm, base] of Object.entries(guard.bases) as [ArmId, ArmId][]) {
    for (const l of LEAGUES) {
      const sideOf = (r: Step4Record): GuardSide => ({ all: r.report.intGuard[l].all, byClass: r.report.intGuard[l].byClass });
      const bySet = (id: ArmId): Partial<Record<SeedSet, GuardSide>> => Object.fromEntries(sets.flatMap((s) => (at(id, s) === undefined ? [] : [[s, sideOf(at(id, s)!)]])));
      const armRecord = sets.map((s) => at(arm, s)).find((r) => r !== undefined);
      if (armRecord === undefined || !sets.some((s) => at(base, s) !== undefined)) {
        guardRows.push({ arm, against: base, league: l, verdict: "NOT PLAYED", graded: false, Z: null, breaches: [], filedBreaches: [], ownClock: [] });
        continue;
      }
      const clock = armRecord.report.clock as GuardClock;
      const reading = am1ArmReading(bySet(base), bySet(arm), clock, guard.lines);
      const ownClock = sets.flatMap((s) => {
        const a = at(arm, s);
        const b = at(base, s);
        if (a === undefined || b === undefined) return [];
        const v = intGuardOwnClock(b.report.intGuard[l].all, a.report.intGuard[l].all, b.report.clock as GuardClock, a.report.clock as GuardClock);
        return [`set ${String(s)}: rise ${num(v.rise)} against the own-clock allowance ${num(v.allowed)} (${String(b.report.clock)} base, ${String(a.report.clock)} arm)`];
      });
      const verdict = reading.graded && oneSet === undefined ? (reading.breaches.length > 0 ? "BREACH" : "PASS") : "REPORTED";
      if (verdict === "BREACH") guardBreaches.push(`${arm} against ${base}, ${l}: ${reading.breaches.join(", ")}`);
      guardRows.push({ arm, against: base, league: l, verdict, graded: reading.graded, Z: reading.league.Z, breaches: reading.breaches, filedBreaches: reading.filedBreaches, ownClock });
    }
  }

  // The re-played bases against step 3's records.
  const replay: Step4ReplayRow[] = [];
  for (const id of STEP4_BASE_IDS) for (const s of sets) {
    const r = at(id, s);
    if (r === undefined) continue;
    const ref = references.get(`${id}.set${String(s)}`);
    const cut = r.stamp.corpus.flatFirst !== null || r.stamp.corpus.genThroughWeek !== null;
    if (ref === undefined || cut) {
      replay.push({ arm: id, seedSet: s, verdict: "NOT CHECKED", detail: cut ? "a cut corpus is not checked" : "step 3's record is not in reports/adr-089-step3.json" });
      continue;
    }
    const differ = q4Problems(r, ref);
    replay.push({ arm: id, seedSet: s, verdict: differ.length === 0 ? "PASS" : "FAIL", detail: differ.length === 0 ? "equal to step 3's record on the stamp-free projection" : `differs on ${differ.join(", ")}` });
    if (differ.length > 0) structuralFailures.push(`the re-played ${id} set ${String(s)} differs from step 3's record on ${differ.join(", ")}`);
  }

  // Each arm's s4 folds.
  const arms: Step4ArmRow[] = [];
  for (const [id, bySet] of records) for (const s of sets) {
    const r = bySet[s];
    if (r === undefined) continue;
    for (const l of LEAGUES) {
      const f = r.s4[l].s4;
      if (f.s4Plays === 0) continue;
      const phases = Object.entries(f.hitsByPhase).map(([k, v]) => `${k} ${String(v)}`).join(", ") || "none";
      arms.push({
        arm: id,
        league: l,
        seedSet: s,
        s4Plays: f.s4Plays,
        problemCount: f.problemCount,
        ...(f.problems[0] === undefined ? {} : { firstProblem: f.problems[0] }),
        lines: [
          `contacts per 100 dropbacks ${num(per100(f.contest.contacts, f))}; sacks per first contact ${num(100 * (sackShareOf(f.first) ?? NaN))}%; second-arrival sack rate ${num(100 * (secondArrivalRateOf(f) ?? NaN))}% over ${String(f.contest2.contacts)} :contest2`,
          `by class (first contests): ${Object.entries(f.byClass).map(([k, t]) => `${k} ${String(t.sacks)}/${String(t.contacts)}`).join(", ")}; unclassed ${String(f.unclassed)}; label-only free run ${String(f.labelFree.sacks)}/${String(f.labelFree.contacts)}`,
          `QB_HIT by phase: ${phases}; on scrambles ${String(f.hitsOnScramble)} (reported, not counted); hit-or-sack per 100 ${num(per100(f.hitOrSack, f))}`,
          `hit curve slope from 2.0 s: aimed-weighted ${num(slopeOrNull(f, "AIMED"), 4)}, attempt-weighted ${num(slopeOrNull(f, "ATTEMPTS"), 4)}`,
          `M6 at step 4: ${JSON.stringify(m6Step4Summary(r.s4[l].m6))}`,
        ],
      });
    }
  }

  const waits = [
    "s4.falsifier.release: the release probe waits for the lift (release 40 against 80 on D6's bundle needs the D arms to play)",
    "R-1 (--digests on D1 to D17) and the s4 pins wait for the lift",
    "T_L's clamp and m(0) on D17 (--part1) wait for the lift",
    ...(oneSet === undefined ? [] : [`a one-set run (set ${String(oneSet)}): nothing graded`]),
  ];
  const outcome: Step2Outcome = {
    structuralFailures,
    foldFaults,
    gradedFailures,
    guardBreaches,
    mergeCard: oneSet === undefined && structuralFailures.length === 0 && foldFaults.length === 0 && guardBreaches.length === 0,
    next,
  };
  return {
    sections: {
      amendments: { digest: guard.digest, am6: `${guard.am6} (${guard.am6Record})`, am7: `${guard.am7} (${guard.am7Record})` },
      ...(oneSet === undefined ? {} : { oneSet }),
      outcome,
      clauses,
      proofs,
      guard: guardRows,
      tilts,
      replay,
      arms,
      waits,
    },
  };
}

export function renderStep4Report(grade: Step4Grade, records: Step4Records): string {
  const stamps = [...records.values()].flatMap((bySet) => SEED_SETS.flatMap((s) => (bySet[s] === undefined ? [] : [bySet[s]!.stamp])));
  const commits = [...new Set(stamps.map((s) => `${s.commit}${s.dirty ? " (dirty)" : ""}`))].sort();
  const first = stamps[0];
  const s = grade.sections;
  const lines: string[] = [];
  lines.push(`# ADR-089 step 4: the arms${s.oneSet === undefined ? "" : `, seed set ${String(s.oneSet)} only (reported, never graded)`}`);
  lines.push("");
  lines.push("Contact by approach and the throwing motion, built behind the rules name pocket-1.s4, which nothing plays by default; these arms turn it on for measurement only.");
  lines.push("");
  lines.push(`- filing: ${first?.filedDigest ?? STEP0_FILED_DIGEST}; amendments at step 4: ${s.amendments.digest} (the guard ${s.amendments.am6}; the readings ${s.amendments.am7})`);
  lines.push(`- fingerprint: ${first?.fingerprint ?? "n/a"}; commit: ${commits.join(", ")}; node ${first?.node ?? "n/a"}; caller ${STEP1_CALLER}`);
  lines.push(`- PR #33: ${PR33_STATE}`);
  lines.push("");
  lines.push(...renderStep4Sections(s));
  return `${lines.join("\n")}\n`;
}

export function step4MeasuresOf(records: Step4Records, grade: Step4Grade, guard: Step4Guard, fingerprint: string, targets: readonly Step4Target[], oneSet?: SeedSet): JsonValue {
  return sanitize({
    format: STEP4_MEASURES_FORMAT,
    filedDigest: STEP0_FILED_DIGEST,
    amendments: guard.digest,
    fingerprint,
    ...(oneSet === undefined ? {} : { oneSet }),
    arms: Object.fromEntries(targets.map((t) => [targetName(t), records.get(t.id)![t.seedSet]!])),
    grade: grade.sections,
  });
}

export function step4SummaryLines(s: Step4Sections): readonly string[] {
  const o = s.outcome;
  return [
    `ADR-089 step 4: ${String(o.structuralFailures.length)} structural failure(s), ${String(o.foldFaults.length)} fold fault(s), ${s.oneSet === undefined ? `${String(o.gradedFailures.length)} graded failure(s)` : "nothing graded (one seed set)"}, ` +
      `${String(o.guardBreaches.length)} guard breach(es); merge card ${o.mergeCard ? "may be posted" : "not to be posted"}`,
    ...[...o.structuralFailures, ...o.foldFaults, ...o.guardBreaches, ...o.gradedFailures, ...o.next].map((line) => `  ${line}`),
  ];
}

// --- the run -----------------------------------------------------------------------------------------------

export interface Step4Options {
  readonly arms?: readonly ArmId[];
  readonly shard?: { readonly index: number; readonly count: number };
  readonly cacheParent: string;
  readonly seedSet?: SeedSet;
  readonly report?: string;
  readonly out?: string;
  readonly filedPath: string;
  readonly amendmentsPath: string;
  readonly env: Step1Env;
  readonly committedDir?: string;
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
  /** Tests only: plays an arm (default `playStep4Arm`). */
  readonly play?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep4Options) => Step4Record;
  readonly references?: Step3References;
  /** Tests only: the pin and the petitions (`preflightStep4`). */
  readonly preflight?: PreflightStep4Options;
}

export interface Step4RunResult {
  readonly cacheDir: string;
  readonly played: readonly string[];
  readonly cached: readonly string[];
  readonly remaining: readonly string[];
  readonly graded: boolean;
  readonly wrote: readonly string[];
  readonly grade?: Step4Grade;
}

/** The named refusal of a cache from a dirty tree. */
export const STEP4_DIRTY_REFUSAL =
  "ADR-089 step 4: refused before anything plays: this tree is dirty, and step 4's cache is made only from a clean tree (its fingerprint must name a commit the records can be re-made from): commit first. Nothing has played and no cache was made";

function readStep4Record(path: string): Step4Record {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Step4Record;
  if (parsed.format !== STEP4_ARM_FORMAT) throw new Error(`${path}: not a step-4 arm record (format ${String((parsed as { format?: unknown }).format)})`);
  return parsed;
}

function cachedStampProblems(record: Step4Record, want: Step3Stamp): readonly string[] {
  const amend = record.stamp?.amendments;
  const lead = amend !== want.amendments ? [`stamped with amendments ${String(amend)}, not this build's step-4 view ${want.amendments}`] : [];
  return [...lead, ...stampProblems(record.stamp, want).filter((p) => !p.startsWith("amendments:"))];
}

/** The cache directory for this tree, refused (before it is made) from a dirty tree. */
export function step4CacheDir(cacheParent: string, env: Step1Env): string {
  if (env.dirty) throw new Error(STEP4_DIRTY_REFUSAL);
  const dir = join(cacheParent, env.fingerprint);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function playTargets(targets: readonly Step4Target[], cacheDir: string, opts: Step4Options, amendments: string, corpus: Step1Corpus, log: (line: string) => void): { played: string[]; cached: string[] } {
  const play = opts.play ?? playStep4Arm;
  const played: string[] = [];
  const cached: string[] = [];
  for (const t of targets) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const want = step3StampOf(t.id, t.seedSet, opts.env, amendments, corpus);
    if (existsSync(path)) {
      const problems = cachedStampProblems(readStep4Record(path), want);
      if (problems.length > 0) throw new Error(`ADR-089 step 4: the cached ${targetName(t)} at ${path} is not this build's arm: ${problems.join("; ")}. Delete it, or use another --cache`);
      cached.push(targetName(t));
      log(`pocket step 4: ${targetName(t)} is cached`);
      continue;
    }
    log(`pocket step 4: playing ${targetName(t)}`);
    writeAtomic(path, jsonText(play(t.id, t.seedSet, opts.env, { corpus, log, amendments })));
    played.push(targetName(t));
  }
  return { played, cached };
}

function readTargets(targets: readonly Step4Target[], cacheDir: string, opts: Step4Options, amendments: string, corpus: Step1Corpus): Map<ArmId, Partial<Record<SeedSet, Step4Record>>> {
  const records = new Map<ArmId, Partial<Record<SeedSet, Step4Record>>>();
  for (const t of targets) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const record = readStep4Record(path);
    const problems = cachedStampProblems(record, step3StampOf(t.id, t.seedSet, opts.env, amendments, corpus));
    if (problems.length > 0) throw new Error(`ADR-089 step 4: refused to grade: the cached ${targetName(t)} at ${path} is not this build's arm: ${problems.join("; ")}`);
    records.set(t.id, { ...(records.get(t.id) ?? {}), [t.seedSet]: record });
  }
  return records;
}

/** Plays this shard's targets, then grades once every target is cached. Refused, before anything plays, while AM-6 or AM-7 is not filed, the view is not pinned, or the gates are false. */
export function runStep4(opts: Step4Options): Step4RunResult {
  const log = opts.log ?? ((): void => undefined);
  const { file, guard } = preflightStep4(opts.filedPath, opts.amendmentsPath, opts.preflight);
  const plan = planStep4({ ...(opts.arms === undefined ? {} : { arms: opts.arms }), ...(opts.shard === undefined ? {} : { shard: opts.shard }), ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }) });
  const corpus = opts.corpus ?? FULL_CORPUS;
  const committed = opts.committedDir !== undefined && [opts.report, opts.out].some((p) => p !== undefined && isUnder(p, opts.committedDir!));
  const cacheDir = step4CacheDir(opts.cacheParent, opts.env);
  log(`pocket step 4: fingerprint ${opts.env.fingerprint}; amendments at step 4 ${guard.digest} (${guard.am6}, ${guard.am7}); arms cached in ${cacheDir}`);
  const { played, cached } = playTargets(plan.mine, cacheDir, opts, guard.digest, corpus, log);
  const remaining = plan.complete.filter((t) => !existsSync(armFileOf(cacheDir, t.id, t.seedSet))).map(targetName);
  const wrote: string[] = [];
  if (remaining.length > 0) {
    log(`pocket step 4: ${String(remaining.length)} target(s) still to play (${remaining.join(", ")}); the report is written once every target is in the cache`);
    return { cacheDir, played, cached, remaining, graded: false, wrote };
  }
  const records = readTargets(plan.complete, cacheDir, opts, guard.digest, corpus);
  if (committed && [...records.values()].some((b) => SEED_SETS.some((s) => b[s]?.stamp.dirty === true))) throw new Error("ADR-089 step 4: refused to grade a committed report: a record was played on a dirty tree");
  const grade = gradeStep4(records, file, guard, opts.references ?? loadStep3References(), plan.oneSet);
  if (opts.report !== undefined) {
    writeAtomic(opts.report, renderStep4Report(grade, records));
    wrote.push(opts.report);
  }
  if (opts.out !== undefined) {
    writeAtomic(opts.out, jsonText(step4MeasuresOf(records, grade, guard, opts.env.fingerprint, plan.complete, plan.oneSet)));
    wrote.push(opts.out);
  }
  return { cacheDir, played, cached, remaining, graded: true, wrote, grade };
}

export interface Step4Part1Result {
  readonly cacheDir: string;
  readonly played: readonly string[];
  readonly cached: readonly string[];
  readonly lines: readonly string[];
  readonly problems: readonly string[];
}

/**
 * `--part1` (a preview; AM-6 and AM-7 not needed): plays or reads the asked arms (default every
 * playable one) and returns every build fault: the s4 stream's checks and C-1 on every s4 play, and
 * each re-played base against step 3's record. T_L's clamp and m(0) on D17 wait for the lift.
 */
export function runStep4Part1(opts: Omit<Step4Options, "shard" | "report" | "out" | "committedDir" | "preflight">): Step4Part1Result {
  const log = opts.log ?? ((): void => undefined);
  const v = preflightStep4Previews(opts.filedPath, opts.amendmentsPath);
  const plan = planStep4({ ...(opts.arms === undefined ? {} : { arms: opts.arms }), ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }) });
  const corpus = opts.corpus ?? FULL_CORPUS;
  const cacheDir = step4CacheDir(opts.cacheParent, opts.env);
  log(`pocket step 4 --part1 (a preview, never graded): fingerprint ${opts.env.fingerprint}; amendments at step 4 ${v.digest}; arms cached in ${cacheDir}`);
  const { played, cached } = playTargets(plan.targets, cacheDir, opts, v.digest, corpus, log);
  const records = readTargets(plan.targets, cacheDir, opts, v.digest, corpus);
  return { cacheDir, played, cached, ...part1Findings(records, opts.references ?? loadStep3References()) };
}

/** `--part1`'s findings on read records (pure): the s4 stream's problems, C-1, and the bases' replay. */
export function part1Findings(records: Step4Records, references: Step3References): { readonly lines: readonly string[]; readonly problems: readonly string[] } {
  const lines: string[] = [];
  const problems: string[] = [];
  for (const [id, bySet] of records) for (const s of SEED_SETS) {
    const r = bySet[s];
    if (r === undefined) continue;
    for (const l of LEAGUES) {
      const f = r.s4[l].s4;
      lines.push(`${id} set ${String(s)} ${l}: ${String(f.s4Plays)} pocket-1.s4 dropbacks of ${String(f.plays)}; C-1 ${String(f.standIn)} stand-in against ${String(f.arrivalShedOrSack)} ARRIVAL, SHED or sack (${String(f.c1Mismatch)} disagree); ${String(f.problemCount)} stream problem(s)`);
      if (f.problemCount > 0) problems.push(`${id} set ${String(s)} ${l}: the s4 stream, ${String(f.problemCount)} problem(s), first: ${f.problems[0] ?? ""}`);
    }
    if (STEP4_BASE_IDS.includes(id)) {
      const ref = references.get(`${id}.set${String(s)}`);
      const cut = r.stamp.corpus.flatFirst !== null || r.stamp.corpus.genThroughWeek !== null;
      if (ref === undefined || cut) lines.push(`${id} set ${String(s)}: the replay against step 3's record is not checked (${cut ? "a cut corpus" : "no record"})`);
      else {
        const differ = q4Problems(r, ref);
        lines.push(`${id} set ${String(s)}: the replay ${differ.length === 0 ? "equals" : "differs from"} step 3's record${differ.length === 0 ? "" : ` on ${differ.join(", ")}`}`);
        if (differ.length > 0) problems.push(`${id} set ${String(s)}: the re-play differs from step 3's record on ${differ.join(", ")}`);
      }
    }
  }
  lines.push("T_L's clamp and m(0) on D17: waits for the lift (D17 does not play in this build)");
  return { lines, problems };
}

// --- R-1: the digests ------------------------------------------------------------------------------------------

/** The named refusal of `--digests` while the D arms cannot play. */
export const STEP4_DIGESTS_REFUSAL =
  "ADR-089 step 4: refused: --digests (R-1) plays the golden 50 a league under D1 to D17, and no D arm plays while petitions P6, P7 and P8 are not all in contracts; R-1 and the s4 pins come after the lift. Nothing has played";

export interface Step4DigestsResult {
  readonly format: typeof STEP4_DIGESTS_FORMAT;
  readonly amendments: string;
  readonly node: string;
  readonly caller: string;
  readonly gamesPerLeague: number;
  readonly arms: Readonly<Record<string, Readonly<Record<string, { readonly games: number; readonly events: number; readonly canonicalFold: string; readonly byteFold: string }>>>>;
}

/** R-1: the golden 50 a league under every D arm and the re-played bases; refused while the gates are false. */
export function runStep4Digests(opts: { readonly filedPath: string; readonly amendmentsPath: string; readonly node: string; readonly first?: number; readonly arms?: readonly ArmId[]; readonly log?: (line: string) => void; readonly petitions?: Step4Petitions }): Step4DigestsResult {
  if (!step4PetitionsIn(opts.petitions)) throw new Error(STEP4_DIGESTS_REFUSAL);
  const v = preflightStep4Previews(opts.filedPath, opts.amendmentsPath);
  const arms: Record<string, Record<string, { games: number; events: number; canonicalFold: string; byteFold: string }>> = {};
  for (const id of opts.arms ?? [...STEP4_ARM_IDS, ...STEP4_BASE_IDS]) {
    const refusal = armRefusal(id);
    if (refusal !== undefined) throw new RangeError(`${id} is not playable: ${refusal}`);
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
      opts.log?.(`pocket step 4 digests: ${id} ${league}, ${String(canonical.length)} games`);
    }
    arms[id] = leagues;
  }
  return { format: STEP4_DIGESTS_FORMAT, amendments: v.digest, node: opts.node, caller: STEP1_CALLER, gamesPerLeague: opts.first ?? 50, arms };
}

// --- the command -----------------------------------------------------------------------------------------

/** The `--report` and `--out` that would write over a closed step's committed records (steps 1 to 3, and step 4's once `STEP4_RECORDS_FINAL`); empty when none does. */
export function closedStep4Writes(args: Pick<Step4Args, "report" | "out">, cwd: string, pkgRoot: string = PKG_ROOT, final: boolean = STEP4_RECORDS_FINAL): readonly string[] {
  const closed = new Set([...STEP1_CLOSED_RECORDS, ...STEP2_CLOSED_RECORDS, ...STEP3_RECORDS, ...(final ? STEP4_RECORDS : [])].map((r) => realOf(join(pkgRoot, r))));
  return (["report", "out"] as const).flatMap((flag) => {
    const value = args[flag];
    return value !== undefined && closed.has(realOf(resolve(cwd, value))) ? [`--${flag} ${value}`] : [];
  });
}

export async function step4Command(args: Step4Args, log: (line: string) => void): Promise<void> {
  const repoRoot = resolve(PKG_ROOT, "..", "..");
  const filedPath = join(PKG_ROOT, FILED_PATH);
  const amendmentsPath = join(PKG_ROOT, AMENDMENTS_PATH);
  const closed = closedStep4Writes(args, process.cwd());
  if (closed.length > 0) throw new Error(`ADR-089 step 4: ${closed.join(" and ")} would write over a closed step's committed records, which are never edited. Write elsewhere`);
  if (args.digests === true) {
    if (args.out === undefined) throw new SyntaxError("--digests writes its folds to --out <file>");
    if (!step4PetitionsIn()) throw new Error(STEP4_DIGESTS_REFUSAL);
  }
  const full = step1Env(repoRoot, filedPath);
  const env: Step1Env = { fingerprint: full.fingerprint, commit: full.commit, dirty: full.dirty, node: full.node };
  log(`pocket step 4: fingerprint ${env.fingerprint}; commit ${env.commit}${env.dirty ? ` (dirty: ${full.reason ?? "?"})` : ""}; node ${env.node}`);
  if (args.digests === true) {
    const result = runStep4Digests({ filedPath, amendmentsPath, node: process.version, log });
    writeAtomic(args.out!, jsonText(result));
    log(`pocket step 4: wrote the digests to ${args.out!}`);
    return;
  }
  const common = {
    ...(args.arms === undefined ? {} : { arms: args.arms }),
    ...(args.seedSet === undefined ? {} : { seedSet: args.seedSet }),
    cacheParent: args.cache ?? join(PKG_ROOT, "data-cache", "pocket-step4"),
    filedPath,
    amendmentsPath,
    env,
    log,
  };
  if (args.part1 === true) {
    const r = runStep4Part1(common);
    process.stdout.write(`${r.lines.join("\n")}\n`);
    if (r.problems.length > 0) throw new Error(`ADR-089 step 4 --part1: ${String(r.problems.length)} build fault(s): ${r.problems.join("; ")}`);
    process.stdout.write("ADR-089 step 4 --part1: no build fault (a preview: nothing here is graded)\n");
    return;
  }
  const result = runStep4({
    ...common,
    ...(args.shard === undefined ? {} : { shard: args.shard }),
    ...(args.report === undefined ? {} : { report: args.report }),
    ...(args.out === undefined ? {} : { out: args.out }),
    committedDir: join(PKG_ROOT, "reports"),
  });
  if (result.graded && result.grade !== undefined) process.stdout.write(`${step4SummaryLines(result.grade.sections).join("\n")}\n`);
}
