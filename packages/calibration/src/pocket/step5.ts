/**
 * `pnpm --filter @ff/calibration pocket -- --step 5a --fit [--shard i/3] --out reports/adr-089-step5a.fit.json`
 * `pnpm --filter @ff/calibration pocket -- --step 5a [--shard i/3] --report reports/adr-089-step5a.md --out reports/adr-089-step5a.json`
 * `pnpm --filter @ff/calibration pocket -- --step 5b [--shard i/3] [--after-owner <ts>] --report reports/adr-089-step5b.md --out reports/adr-089-step5b.json`
 * `pnpm --filter @ff/calibration pocket -- --step 5b --reselect --from reports/adr-089-step5b.json`
 * `pnpm --filter @ff/calibration pocket -- --step 5b --digests --out <file>`
 *
 * ADR-089 STEP 5's HARNESS (step-5 plan §4's `step5.ts` row, §5, §7, §9): the 5a arms (E0 to E10 on
 * the clean bench) and the 5b arms (D1 replayed, the grid F1 to F14, then F0, G1 and G2), each on
 * both leagues and both seed sets, graded against the step-0 filing as AM-8 maps the guard and AM-9
 * and AM-10 read the clauses.
 *
 *  - **The refusals first.** Nothing plays unless the filing loads and digests to
 *    `STEP0_FILED_DIGEST`; the amendments file loads whole, its step-3 and step-4 views unchanged
 *    (`STEP3_AMENDMENTS_DIGEST`, `STEP4_AMENDMENTS_PIN`) and its view at the half pinned
 *    (`STEP5A_AMENDMENTS_PIN`, `STEP5B_AMENDMENTS_PIN`); AM-8 maps the half's guard on the S5 class
 *    view with every base this build's arm reads; AM-9 (5a) or AM-10 (5b) is filed; no choice is left
 *    unmade.
 *  - **The gate (plan §9 item 10), refusing:** 5a needs the fit record committed and equal to
 *    `POCKET_1_S5A_FIT_DIGEST` and `POCKET_1_S5A_DIGEST` recorded; 5b needs all that, the 5a records
 *    final (`STEP5A_RECORDS_FINAL`) with no build fault, and no AM-8 breach and no graded 5a miss
 *    unless `--after-owner <ts>` names the owner's word to go on (a build fault is never lifted). In
 *    this build none of them is recorded, so both halves are refused by name before anything plays.
 *  - **Each arm** is step 4's play (`playStep4Arm` through `playStep3Arm`, so every step-1 to step-4
 *    fold runs on every arm), with step 5's visit beside on every game: the s5 stream, the two
 *    clean-pocket rows, the guard's population on the S5 class view, the pressured curve by raw
 *    release bin, the fit windows and each game's stream digest. D1 runs step 4's folds exactly.
 *  - **The cache** is `data-cache/pocket-step5/<fingerprint>/<arm>.set<n>.json`, made only from a
 *    clean tree; E0's second fresh play is `E0.set<n>.fresh.json`, written by a second process the
 *    operator runs when the harness prints its command (library code never starts a process).
 *  - **The replays (S-7):** D1 equals step 4's records on a stamp-free projection; E0's two fresh
 *    plays have identical stream digests and records.
 *  - **No wall-clock, host or path field** in any record or file, and no clock is read here.
 */
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { MatchEventEnvelope } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { canonicalise } from "../harness/digest.js";
import { releaseBinOf } from "../metrics/collect.js";
import { AMENDMENTS_PATH, amendmentsAtStep, amendmentsDigest, entryOf, loadAmendments, STEP3_AMENDMENTS_DIGEST, type AmendmentsFile, type BaseMap } from "./amendments.js";
import { armById, recordedStep5, step5ArmDef, step5ArmRefusal, STEP5A_RUN_IDS, STEP5B_RUN_IDS, STEP5_GRID, type ArmId, type Step5Records } from "./arms.js";
import { FILED_PATH, type GuardClock, type IntMix } from "./bands.js";
import { goldenGames, type SeedSet } from "./corpus.js";
import { emptyFitFold, FIT5A_RECORD, fitRecordDigest, fitReplay, foldFitGame, readFitRecord, releaseSecondsOf, runFit5a, type FitFold } from "./fit5a.js";
import { filedDigest, STEP0_FILED_DIGEST, type BandClause, type FiledFile, type JsonValue } from "./filed.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES } from "./golden.js";
import { am1ArmReading, guardWithView, skipsEqualDials, SEED_SETS, type Am1Lines, type GuardSide } from "./guardAm1.js";
import { classifyMiss, MISS_RULE_COVERS, type MissSplit } from "./missRule.js";
import { CLEAN_BENCH_PARTS } from "./oneThreatBench.js";
import { LEAGUES, renderStep5Sections, type League, type Step2ClauseResult, type Step2Proof, type Step4GuardRow, type Step5Sections } from "./report.js";
import { cleanPocketRowProblems, cleanPocketRows, emptyCleanPocketRowsFold, foldCleanPocketRowsGame, type CleanPocketRowsFold } from "./rows.js";
import type { RePoint, Reselection } from "./reselect.js";
import { cleanPocketOf } from "./cleanPick.js";
import { POCKET_1_S5A_DIGEST, POCKET_1_S5A_FIT_DIGEST, readsStep3Facts } from "./rules.js";
import { s2ContextOf } from "./s2Stream.js";
import { emptyS5Fold, foldS5Dropback, s5DropbacksOf, s5Summary, type S5Fold } from "./s5Stream.js";
import { gridPointId, REAL, RELEASE_BINS, selectWith, type Am10Verdict, type BinCount, type GridArm } from "./selection.js";
import { emptyGuardFold, foldGuardGame, openFiling, PR33_STATE, sanitize, type GuardFold, type Step5Args } from "./step0.js";
import { armFileOf, FULL_CORPUS, isUnder, jsonText, realOf, STEP1_CALLER, STEP1_CLOSED_RECORDS, step1Env, stampProblems, writeAtomic, type Step1Corpus, type Step1Env } from "./step1.js";
import { rowValueOf, STEP2_CLOSED_RECORDS, STEP3_RECORDS, step3StampOf, timesFromPicture, unmadeChoicesOf, type Step3Stamp } from "./step3.js";
import { playStep4Arm, STEP4_AMENDMENTS_PIN, STEP4_RECORDS, step4FoldsOf, type PlayStep4Options, type Step4Record } from "./step4.js";
import { playsOf, readDropback, throwBarFor, worstStatus } from "./throwClass.js";
import type { ThrowClassifier } from "./throwClass.js";

export const STEP5_ARM_FORMAT = "adr-089-step5-arm/v1";
export const STEP5_MEASURES_FORMAT = "adr-089-step5-measures/v1";
export const STEP5_DIGESTS_FORMAT = "adr-089-step5-digests/v1";

const PKG_ROOT = fileURLToPath(new URL("../..", import.meta.url));

export type Step5Half = "5a" | "5b";

/** The committed records of each half, written once by the graded run; `--report`/`--out` never write over them once final. */
export const STEP5A_RECORDS = ["reports/adr-089-step5a.md", "reports/adr-089-step5a.json"] as const;
export const STEP5B_RECORDS = ["reports/adr-089-step5b.md", "reports/adr-089-step5b.json"] as const;
/** False until each half's records are committed (plan §9 items 9 and 13). */
export const STEP5A_RECORDS_FINAL: boolean = false;
export const STEP5B_RECORDS_FINAL: boolean = false;

/**
 * Each half's view of the amendments file, pinned: AM-8, AM-9 and AM-10 are filed together before any
 * step-5 arm (commit 554f81e), so both views hold the same entries and digest alike.
 */
export const STEP5A_AMENDMENTS_PIN: string | null = "fnv1a:3f9478eb";
export const STEP5B_AMENDMENTS_PIN: string | null = "fnv1a:3f9478eb";

export const STEP5_RUN_IDS: Readonly<Record<Step5Half, readonly ArmId[]>> = Object.freeze({ "5a": STEP5A_RUN_IDS, "5b": STEP5B_RUN_IDS });
/** The grid's arms (the selection's points, in the filed order). */
export const STEP5_GRID_IDS: readonly ArmId[] = Object.freeze(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14"] as const);

const GRADED_SET: SeedSet = 1;

// --- the preflight ------------------------------------------------------------------------------------

/** What the grading reads of AM-8 and the half's readings (AM-9 or AM-10). */
export interface Step5Guard {
  readonly half: Step5Half;
  readonly digest: string;
  readonly view: AmendmentsFile;
  readonly am8: string;
  readonly readings: string;
  readonly bases: BaseMap;
  readonly lines: Am1Lines;
  readonly classify: ThrowClassifier;
  readonly freshBases: readonly string[];
  readonly skipEqualDials: boolean;
}

export interface PreflightStep5Options {
  /** Tests only: the pin the half's view must equal. */
  readonly pin?: string | null;
}

export function step5PinRefusal(half: Step5Half, digest: string, pin: string | null): string {
  return pin === null
    ? `ADR-089 step ${half}: refused before anything plays: the half's view of the amendments file (${digest}) is not pinned`
    : `ADR-089 step ${half}: refused before anything plays: the half's view of the amendments file digests to ${digest}, not the pin ${pin}: an amendment is append-only, and a step's view never changes once its arms have run`;
}

/**
 * Every refusal a step-5 run makes before anything plays (the gate aside), in order: the filing; the
 * amendments file whole; the step-3 and step-4 views unchanged; the half's view pinned; AM-8 maps the
 * half's guard on the S5 class view, every arm against the base this build's arm reads; AM-9 (5a) or
 * AM-10 (5b) filed; no choice left unmade.
 */
export function preflightStep5(half: Step5Half, filedPath: string, amendmentsPath: string, opts: PreflightStep5Options = {}): { readonly file: FiledFile; readonly guard: Step5Guard } {
  const refuse = (why: string): never => {
    throw new Error(`ADR-089 step ${half}: refused before anything plays: ${why}`);
  };
  const file = openFiling(filedPath);
  const fd = filedDigest(file);
  if (fd !== STEP0_FILED_DIGEST) refuse(`the step-0 filing digests to ${fd}, not ${STEP0_FILED_DIGEST}`);
  if (!existsSync(amendmentsPath)) refuse(`the amendments file ${amendmentsPath} does not exist`);
  let whole: AmendmentsFile;
  try {
    whole = loadAmendments(amendmentsPath, file);
  } catch (e) {
    return refuse(e instanceof Error ? e.message : String(e));
  }
  const at3 = amendmentsDigest(amendmentsAtStep(whole, "3"));
  if (at3 !== STEP3_AMENDMENTS_DIGEST) refuse(`the step-3 view digests to ${at3}, not ${STEP3_AMENDMENTS_DIGEST}`);
  const at4 = amendmentsDigest(amendmentsAtStep(whole, "4"));
  if (at4 !== STEP4_AMENDMENTS_PIN) refuse(`the step-4 view digests to ${at4}, not ${String(STEP4_AMENDMENTS_PIN)}`);
  const view = amendmentsAtStep(whole, half);
  const digest = amendmentsDigest(view);
  const pin = opts.pin === undefined ? (half === "5a" ? STEP5A_AMENDMENTS_PIN : STEP5B_AMENDMENTS_PIN) : opts.pin;
  if (pin === null || digest !== pin) throw new Error(step5PinRefusal(half, digest, pin));
  let g: ReturnType<typeof guardWithView>;
  try {
    g = guardWithView(view, half);
  } catch (e) {
    return refuse(`AM-8 (the guard at step 5) is not filed in the view: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (g.rule.classView !== "S5") refuse(`${g.entry.id} maps step ${half}'s guard on the class view ${String(g.rule.classView)}, not S5`);
  const differ = (Object.entries(g.bases) as [ArmId, ArmId][]).filter(([arm, base]) => step5ArmDef(arm)?.base !== base);
  if (differ.length > 0) refuse(`${g.entry.id}'s step-${half} base map reads ${differ.map(([a, b]) => `${a} against ${b}, and this build's arm against ${String(step5ArmDef(a)?.base)}`).join("; ")}`);
  const readingsId = half === "5a" ? "AM-9" : "AM-10";
  let readings: string;
  try {
    readings = entryOf(view, readingsId).id;
  } catch (e) {
    return refuse(`${readingsId} (step ${half}'s readings) is not filed in the view: ${e instanceof Error ? e.message : String(e)}`);
  }
  const choices = unmadeChoicesOf(view);
  if (choices.length > 0) refuse(`the view holds a choice not yet made: ${choices.join("; ")}`);
  return {
    file,
    guard: {
      half,
      digest,
      view,
      am8: g.entry.id,
      readings,
      bases: g.bases,
      lines: { zLeague: g.rule.zLeague, zClass: g.rule.zClass, zSetSE0: g.rule.zSetSE0 },
      classify: g.classify,
      freshBases: Object.keys(g.rule.freshBases ?? {}),
      skipEqualDials: g.rule.skipEqualDials === true,
    },
  };
}

// --- the gate (plan §9 item 10) -------------------------------------------------------------------------

/** What the gate reads: the fit's record and digests, and the 5a records' outcome. */
export interface Step5GateState {
  /** `POCKET_1_S5A_FIT_DIGEST`. */
  readonly fitPin: string | undefined;
  /** The committed fit record's digest, or undefined when no record is committed. */
  readonly fitRecord: string | undefined;
  /** `POCKET_1_S5A_DIGEST`. */
  readonly s5aDigest: string | undefined;
  /** `STEP5A_RECORDS_FINAL`. */
  readonly s5aFinal: boolean;
  /** The committed 5a records' outcome (`reports/adr-089-step5a.json`), when they exist. */
  readonly s5aOutcome?: { readonly faults: readonly string[]; readonly breaches: readonly string[]; readonly misses: readonly string[] };
}

/** The gate state of this build, read from the package. */
export function step5GateState(pkgRoot: string = PKG_ROOT): Step5GateState {
  const fitPath = join(pkgRoot, FIT5A_RECORD);
  const fitRecord = existsSync(fitPath) ? fitRecordDigest(readFitRecord(fitPath)) : undefined;
  const aPath = join(pkgRoot, STEP5A_RECORDS[1]);
  let s5aOutcome: Step5GateState["s5aOutcome"];
  if (existsSync(aPath)) {
    const o = (JSON.parse(readFileSync(aPath, "utf8")) as { readonly outcome?: Step5GateState["s5aOutcome"] }).outcome;
    if (o !== undefined) s5aOutcome = o;
  }
  return { fitPin: POCKET_1_S5A_FIT_DIGEST, fitRecord, s5aDigest: POCKET_1_S5A_DIGEST, s5aFinal: STEP5A_RECORDS_FINAL, ...(s5aOutcome === undefined ? {} : { s5aOutcome }) };
}

/** The gate's refusal for `half`, or undefined when the half may play. `afterOwner` lifts a 5a breach or graded miss, never a build fault. */
export function step5GateRefusal(half: Step5Half, st: Step5GateState, afterOwner?: string): string | undefined {
  const refused = (why: string): string => `ADR-089 step ${half}: refused before anything plays (the gate, plan §9 item 10): ${why}. Nothing has played and no cache was made`;
  if (st.fitPin === undefined) return refused("the 5a fit is not recorded (POCKET_1_S5A_FIT_DIGEST is unset): run `--step 5a --fit` and commit its record, the literal leaves and the digests first");
  if (st.fitRecord === undefined) return refused(`the fit record ${FIT5A_RECORD} is not committed`);
  if (st.fitRecord !== st.fitPin) return refused(`the committed fit record digests to ${st.fitRecord}, not POCKET_1_S5A_FIT_DIGEST ${st.fitPin}`);
  if (st.s5aDigest === undefined) return refused("pocket-1.s5a's literal is not recorded (POCKET_1_S5A_DIGEST is unset)");
  if (half === "5a") return undefined;
  if (!st.s5aFinal || st.s5aOutcome === undefined) return refused("the 5a records are not final (STEP5A_RECORDS_FINAL, reports/adr-089-step5a.json): 5b's grids are built on the fitted count and the checklist and wait for them");
  const o = st.s5aOutcome;
  if (o.faults.length > 0) return refused(`the 5a records hold a build fault (${o.faults[0] ?? ""}); a build fault is fixed, never waived`);
  if (afterOwner === undefined && o.breaches.length > 0) return refused(`the 5a records hold an AM-8 breach (${o.breaches[0] ?? ""}); it goes to the owner, and --after-owner <ts> names the owner's word to go on`);
  if (afterOwner === undefined && o.misses.length > 0) return refused(`the 5a records hold a graded miss (${o.misses[0] ?? ""}); it goes to the owner (accept it as a named miss, or stop for a design change), and --after-owner <ts> names the word to go on`);
  return undefined;
}

// --- the record -----------------------------------------------------------------------------------------

/** Counts the step-5 visit takes from each dropback beside the s5 stream (§7.2's structural proofs, S-10, the clock-expired row). */
export interface Step5Extra {
  dropbacks: number;
  /** Dropbacks whose worst status is not CLEAN (S-6: none on the bench). */
  nonClean: number;
  /** CLOCK_EXPIRED throwaways (s5b.clockExpired), and of them those on a dropback CLEAN through the throwaway (S-10). */
  clockExpired: number;
  cleanClockExpired: number;
  /** S-1: a THROW on a clean expiry with nobody at the expiry bar in the pool. */
  emptyPoolThrows: number;
  /** S-1: a THROW on a clean expiry whose target's last read is below the expiry bar. */
  belowBarTargetThrows: number;
  /** Printed beside S-1: clean-expiry THROWs to a man below the best read (rank-pushed inside the cut pool). */
  rankPushedExpiryThrows: number;
  /** S-1's second half: THROWs after a clean break-out, and of them those with best below the normal bar (desperation). */
  breakOutThrows: number;
  onRunDesperation: number;
  /** S-2: dropbacks with more than one clean move. */
  twoCleanMoves: number;
  /** S-3: a HOLD, or a throwaway, on a clean-expiry tick. */
  expiryHolds: number;
  expiryThrowaways: number;
}

/** Step 5's folds on one league. `curve` is the pressured curve by raw release bin (attempts, throwaways on their tick). */
export interface Step5LeagueFolds {
  readonly s5: S5Fold;
  readonly rows: CleanPocketRowsFold;
  readonly guard: GuardFold;
  readonly curve: Record<string, { attempts: number; pressured: number }>;
  readonly extra: Step5Extra;
  readonly fit: FitFold;
}

export interface Step5Record extends Omit<Step4Record, "format"> {
  readonly format: typeof STEP5_ARM_FORMAT;
  readonly s5: Readonly<Record<League, Step5LeagueFolds>>;
}

export function emptyStep5LeagueFolds(): Step5LeagueFolds {
  return {
    s5: emptyS5Fold(),
    rows: emptyCleanPocketRowsFold(),
    guard: emptyGuardFold(),
    curve: Object.fromEntries(RELEASE_BINS.map((b) => [b, { attempts: 0, pressured: 0 }])),
    extra: { dropbacks: 0, nonClean: 0, clockExpired: 0, cleanClockExpired: 0, emptyPoolThrows: 0, belowBarTargetThrows: 0, rankPushedExpiryThrows: 0, breakOutThrows: 0, onRunDesperation: 0, twoCleanMoves: 0, expiryHolds: 0, expiryThrowaways: 0 },
    fit: emptyFitFold(),
  };
}

/** One game into step 5's folds, read under the arm's own tunables and the guard's class view. */
export function foldStep5Game(L: Step5LeagueFolds, events: readonly MatchEventEnvelope[], tunables: Tunables, snapshot: GameSnapshot, classify: ThrowClassifier): void {
  const ctx = s2ContextOf(tunables, snapshot);
  const expiryBar = cleanPocketOf(tunables)?.expiryBar ?? 30;
  for (const x of s5DropbacksOf(events, ctx)) {
    foldS5Dropback(L.s5, x);
    if (x.cleanMoves.length > 1) L.extra.twoCleanMoves += 1;
    if (x.breakOutThrow !== undefined) {
      L.extra.breakOutThrows += 1;
      const bar = throwBarFor(tunables, x.readSystem);
      if (x.breakOutThrow.best === undefined || x.breakOutThrow.best < bar) L.extra.onRunDesperation += 1;
    }
    for (const e of x.cleanExpiries) {
      if (e.outcome === "THROW" && e.pool === e.belowBar) L.extra.emptyPoolThrows += 1;
      if (e.outcome === "THROW" && (e.targetOpenness === undefined || e.targetOpenness < expiryBar)) L.extra.belowBarTargetThrows += 1;
      if (e.outcome === "THROW" && e.targetOpenness !== undefined && e.best !== undefined && e.targetOpenness < e.best) L.extra.rankPushedExpiryThrows += 1;
      if (e.outcome === "HOLD") L.extra.expiryHolds += 1;
      if (e.outcome === "THROWAWAY") L.extra.expiryThrowaways += 1;
    }
  }
  foldCleanPocketRowsGame(L.rows, events, tunables);
  foldGuardGame(L.guard, events, tunables, classify);
  foldFitGame(L.fit, events);
  for (const slice of playsOf(events)) {
    const d = readDropback(slice);
    if (d === undefined) continue;
    L.extra.dropbacks += 1;
    const clean = worstStatus(d) === "CLEAN";
    if (!clean) L.extra.nonClean += 1;
    if (d.throwawayTick !== undefined && d.throwawayCause === "CLOCK_EXPIRED") {
      L.extra.clockExpired += 1;
      if (clean) L.extra.cleanClockExpired += 1;
    }
    const release = d.throwTick !== undefined ? (releaseSecondsOf(slice.events) ?? d.throwTick) : d.throwawayTick;
    if (release === undefined) continue;
    const bin = L.curve[releaseBinOf(release)];
    if (bin === undefined) continue;
    bin.attempts += 1;
    if (!clean) bin.pressured += 1;
  }
}

export interface PlayStep5Options {
  readonly corpus?: Step1Corpus;
  readonly log?: (line: string) => void;
  /** The half's view digest the record stamps. */
  readonly amendments: string;
  /** The guard's class view (AM-8: S5). */
  readonly classify: ThrowClassifier;
  /** Tests only: plays the step-4 part (default `playStep4Arm`). */
  readonly playStep4?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep4Options) => Step4Record;
}

/** Step 3's folds and M2 as step 5 runs them: D1 exactly as step 4 played it; a step-5 arm with step 3's folds when it reads step-3 facts and times free runners from the picture, never M2, never C1's mirror. */
export function step5FoldsOf(id: ArmId): NonNullable<PlayStep4Options["folds"]> {
  if (id === "D1") return step4FoldsOf("D1");
  return { s3Folds: readsStep3Facts(armById(id).rules) && timesFromPicture(id), m2: false, m5: false };
}

/** Plays one arm on both leagues at one seed set: step 4's record, re-stamped, with step 5's folds. */
export function playStep5Arm(id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep5Options): Step5Record {
  const state: Record<League, Step5LeagueFolds> = { flat: emptyStep5LeagueFolds(), gen: emptyStep5LeagueFolds() };
  const play = opts.playStep4 ?? playStep4Arm;
  const r = play(id, seedSet, env, {
    ...(opts.corpus === undefined ? {} : { corpus: opts.corpus }),
    ...(opts.log === undefined ? {} : { log: opts.log }),
    amendments: opts.amendments,
    label: "pocket step 5",
    folds: step5FoldsOf(id),
    visit: (league, o, snapshot, tunables) => foldStep5Game(state[league], o.events, tunables, snapshot, opts.classify),
  });
  const { format: _format, ...rest } = r;
  void _format;
  return sanitize({ format: STEP5_ARM_FORMAT, ...rest, s5: state }) as unknown as Step5Record;
}

// --- the replays (S-7) ----------------------------------------------------------------------------------

/** The fields a replay leaves out: the format, the stamp and step 5's folds. */
export const Q5_LEFT_OUT = ["format", "stamp", "s5"] as const;

export function q5Projection(r: object): Readonly<Record<string, JsonValue>> {
  const out: Record<string, unknown> = { ...(r as Record<string, unknown>) };
  for (const k of Q5_LEFT_OUT) delete out[k];
  return sanitize(out) as Record<string, JsonValue>;
}

/** The projected top-level fields on which two records differ; empty when equal. */
export function q5Problems(a: object, b: object): readonly string[] {
  const x = q5Projection(a);
  const y = q5Projection(b);
  return [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => canonicalise(x[k] ?? null) !== canonicalise(y[k] ?? null));
}

export type Step4References = ReadonlyMap<string, object>;

/** D1's two sets from step 4's committed records. */
export function loadStep4References(pkgRoot: string = PKG_ROOT): Step4References {
  const out = new Map<string, object>();
  const path = join(pkgRoot, STEP4_RECORDS[1]);
  if (!existsSync(path)) return out;
  const arms = (JSON.parse(readFileSync(path, "utf8")) as { readonly arms?: Readonly<Record<string, object>> }).arms ?? {};
  for (const s of SEED_SETS) {
    const r = arms[`D1.set${String(s)}`];
    if (r !== undefined) out.set(`D1.set${String(s)}`, r);
  }
  return out;
}

/** E0's two fresh plays (S-7): equal stream digests on both leagues and equal records. */
export function freshBaseProblems(first: Step5Record, second: Step5Record): readonly string[] {
  const out: string[] = [];
  for (const l of LEAGUES) {
    if (canonicalise(first.s5[l].fit.games) !== canonicalise(second.s5[l].fit.games)) out.push(`${l}: the stream digests differ`);
  }
  const fields = [...new Set([...Object.keys(first), ...Object.keys(second)])].filter((k) => k !== "stamp" && canonicalise((first as unknown as Record<string, JsonValue>)[k] ?? null) !== canonicalise((second as unknown as Record<string, JsonValue>)[k] ?? null));
  if (fields.length > 0) out.push(`the records differ in ${fields.join(", ")}`);
  return out;
}

// --- the plan -------------------------------------------------------------------------------------------

export interface Step5Target {
  readonly id: ArmId;
  readonly seedSet: SeedSet;
}

export const targetName = (t: Step5Target): string => `${t.id}.set${String(t.seedSet)}`;

export interface Step5Plan {
  readonly targets: readonly Step5Target[];
  readonly complete: readonly Step5Target[];
  readonly mine: readonly Step5Target[];
  readonly oneSet?: SeedSet;
}

/** The half's playable arms (a step-5 arm is refused by name until its record exists; D1 always plays). */
export function playableStep5Ids(half: Step5Half, records: Step5Records = recordedStep5()): readonly ArmId[] {
  return STEP5_RUN_IDS[half].filter((id) => step5ArmRefusal(id, records) === undefined);
}

export function planStep5(half: Step5Half, opts: { readonly arms?: readonly ArmId[]; readonly shard?: { readonly index: number; readonly count: number }; readonly seedSet?: SeedSet; readonly records?: Step5Records }): Step5Plan {
  const shard = opts.shard ?? { index: 1, count: 1 };
  if (!Number.isInteger(shard.count) || shard.count < 1 || !Number.isInteger(shard.index) || shard.index < 1 || shard.index > shard.count) {
    throw new RangeError(`--shard takes i/n with 1 <= i <= n (got ${String(shard.index)}/${String(shard.count)})`);
  }
  const runIds = playableStep5Ids(half, opts.records);
  const ids = opts.arms ?? runIds;
  if (new Set(ids).size !== ids.length) throw new RangeError(`--arms names an arm twice: ${ids.join(",")}`);
  const refused = ids.filter((id) => step5ArmRefusal(id, opts.records) !== undefined);
  if (refused.length > 0) throw new RangeError(`--arms: ${refused.map((id) => `${id} is not playable: ${step5ArmRefusal(id, opts.records) ?? ""}`).join("; ")}`);
  const foreign = ids.filter((id) => !runIds.includes(id));
  if (foreign.length > 0) throw new RangeError(`--arms: ${foreign.join(", ")} ${foreign.length === 1 ? "is" : "are"} not in step ${half}'s run (${runIds.join(", ")})`);
  const sets: readonly SeedSet[] = opts.seedSet === undefined ? SEED_SETS : [opts.seedSet];
  const targets = runIds.filter((id) => ids.includes(id)).flatMap((id) => sets.map((seedSet) => ({ id, seedSet })));
  const complete = opts.seedSet === undefined ? runIds.flatMap((id) => SEED_SETS.map((seedSet) => ({ id, seedSet }))) : targets;
  return { targets, complete, mine: targets.filter((_, i) => i % shard.count === shard.index - 1), ...(opts.seedSet === undefined ? {} : { oneSet: opts.seedSet }) };
}

// --- the grading (pure) ---------------------------------------------------------------------------------

export type Step5RecordsBySet = ReadonlyMap<ArmId, Readonly<Partial<Record<SeedSet, Step5Record>>>>;

export interface Step5Grade {
  readonly sections: Step5Sections;
  /** 5b: the selection on gen (AM-10), when every grid point is played on both sets. */
  readonly selection?: Am10Verdict;
}

const num = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(dp));
const inBand = (v: number | null, c: Pick<BandClause, "lo" | "hi">): boolean => v !== null && Number.isFinite(v) && (typeof c.lo !== "number" || v >= c.lo) && (typeof c.hi !== "number" || v <= c.hi);
const bandText = (c: BandClause): string => {
  const lo = typeof c.lo === "number" ? c.lo : undefined;
  const hi = typeof c.hi === "number" ? c.hi : undefined;
  if (lo !== undefined && hi !== undefined) return lo === hi ? String(lo) : `${String(lo)} to ${String(hi)}`;
  if (hi !== undefined) return `at most ${String(hi)}`;
  if (lo !== undefined) return `at least ${String(lo)}`;
  return "reported";
};
const per100 = (n: number, d: number): number | null => (d === 0 ? null : (100 * n) / d);

/** Clean scrambles per 100 clean dropbacks (`row:scramble_rate_by_pocket`'s clean cell). */
export function cleanScrambleOf(f: Step5LeagueFolds): number | null {
  const row = cleanPocketRows(f.rows)["row:scramble_rate_by_pocket"] as { readonly clean: { readonly per100: number | null } };
  return row.clean.per100;
}

/** Share of aimed throws (all systems) in the fit's windows at or under 1.25 s and over 3.25 s, raw. */
export function releaseSharesOf(f: FitFold): { readonly under1: number | null; readonly over35: number | null } {
  const counts = [f.bySystem.HALF_FIELD, f.bySystem.FULL_FIELD, f.bySystem.CONCEPT].reduce((acc, s) => acc.map((v, i) => v + (s.counts[i] ?? 0)), f.bySystem.HALF_FIELD.counts.map(() => 0));
  const total = counts.reduce((a, b) => a + b, 0);
  return { under1: per100((counts[0] ?? 0) + (counts[1] ?? 0), total), over35: per100(counts.slice(6).reduce((a, b) => a + b, 0), total) };
}

/** The pressured share in the 2.0 s bin on the raw clock (mr.bin20.raw). */
export const bin20RawOf = (f: Step5LeagueFolds): number | null => per100(f.curve["2.0-2.5"]?.pressured ?? 0, f.curve["2.0-2.5"]?.attempts ?? 0);

/** Bins from 2.0 s on whose pressured share is above twice FTN's raw share (s5b.binsTwiceFtn). */
export function binsAboveTwiceFtn(f: Step5LeagueFolds): number {
  return RELEASE_BINS.slice(1).filter((b, i) => {
    const c = f.curve[b];
    const v = c === undefined ? null : per100(c.pressured, c.attempts);
    return v !== null && v > 2 * REAL.pressuredRaw[i + 1]!;
  }).length;
}

/** One grid arm's curves on a league for the selection: hit (aimed hits of aimed throws, from step 4's curve) and pressured (pressured attempts of attempts). */
export function gridArmOf(id: ArmId, bySet: Readonly<Partial<Record<SeedSet, Step5Record>>>, league: League): GridArm | undefined {
  const at = STEP5_GRID[id];
  if (at === undefined || bySet[1] === undefined || bySet[2] === undefined) return undefined;
  const hit = (r: Step5Record): BinCount[] => RELEASE_BINS.map((b) => ({ events: r.s4[league].s4.curve[b]?.hit ?? 0, attempts: r.s4[league].s4.curve[b]?.aimed ?? 0 }));
  const pr = (r: Step5Record): BinCount[] => RELEASE_BINS.map((b) => ({ events: r.s5[league].curve[b]?.pressured ?? 0, attempts: r.s5[league].curve[b]?.attempts ?? 0 }));
  return {
    point: at.shape === "S" ? { shape: "S", value: at.theta } : { shape: "L", value: at.R },
    hit: { 1: hit(bySet[1]), 2: hit(bySet[2]) },
    pressured: { 1: pr(bySet[1]), 2: pr(bySet[2]) },
  };
}

/** The arms whose parts a structural proof reads (plan §7.2 R-3). */
export function partsOfArm(id: ArmId): readonly string[] {
  const def = step5ArmDef(id);
  if (def === undefined) return [];
  const r = def.step5;
  return r.kind === "bench" ? (r.parts?.on ?? []) : CLEAN_BENCH_PARTS;
}
const FULL_CHECKLIST = ["d23", "move", "bump", "breakOut", "d23OnRun"] as const;

export interface GradeStep5Inputs {
  readonly half: Step5Half;
  readonly records: Step5RecordsBySet;
  readonly file: FiledFile;
  readonly guard: Step5Guard;
  /** E0's second fresh play by set (5a). */
  readonly fresh?: Readonly<Partial<Record<SeedSet, Step5Record>>>;
  /** D1 from step 4's records (5b). */
  readonly step4?: Step4References;
  readonly oneSet?: SeedSet;
}

export function gradeStep5(x: GradeStep5Inputs): Step5Grade {
  const { half, records, file, guard, oneSet } = x;
  const sets: readonly SeedSet[] = oneSet === undefined ? SEED_SETS : [oneSet];
  const graded: SeedSet = oneSet ?? GRADED_SET;
  const at = (id: ArmId, s: SeedSet): Step5Record | undefined => records.get(id)?.[s];
  const clauseOf = (id: string): BandClause | undefined => file.bands.clauses.find((c) => c.id === id);
  const clauses: Step2ClauseResult[] = [];
  const proofs: Step2Proof[] = [];
  const structuralFailures: string[] = [];
  const foldFaults: string[] = [];
  const gradedFailures: string[] = [];
  const guardBreaches: string[] = [];
  const next: string[] = [];
  const waits: string[] = [];
  const replay: string[] = [];
  const affected: string[] = [];
  const beside = (f: (s: SeedSet) => number | null): string => sets.filter((s) => s !== graded).map((s) => `set ${String(s)} ${num(f(s))}`).join(", ");
  const notPlayed = (id: string, kind: Step2ClauseResult["kind"], arms: readonly ArmId[], filed: string): void => {
    clauses.push({ id, kind, arms, filed, values: [`not played: ${arms.filter((a) => sets.some((s) => at(a, s) === undefined)).join(", ")}`], verdict: "NOT PLAYED" });
  };
  /** A banded clause on `arm` (minus `base` when given), graded on the listed leagues and reported on the others. */
  const banded = (id: string, arm: ArmId, base: ArmId | undefined, value: (r: Step5Record, l: League) => number | null, gradedOn: readonly League[], note?: string): void => {
    const c = clauseOf(id);
    if (c === undefined) return;
    const arms = base === undefined ? [arm] : [arm, base];
    if (arms.some((a) => sets.some((s) => at(a, s) === undefined))) return notPlayed(id, c.kind, arms, bandText(c));
    const v = (s: SeedSet, l: League): number | null => {
      const a = value(at(arm, s)!, l);
      if (base === undefined) return a;
      const b = value(at(base, s)!, l);
      return a === null || b === null ? null : a - b;
    };
    const values = LEAGUES.map((l) => `${l} set ${String(graded)} ${num(v(graded, l))}${sets.length > 1 ? ` (${beside((s) => v(s, l))})` : ""}`);
    const isGraded = c.kind === "graded" && oneSet === undefined;
    const fails = gradedOn.filter((l) => !inBand(v(graded, l), c));
    const verdict = !isGraded ? "REPORTED" : fails.length === 0 ? "PASS" : "FAIL";
    if (verdict === "FAIL") gradedFailures.push(`${id}: ${fails.map((l) => `${l} ${num(v(graded, l))}`).join(", ")} against ${bandText(c)}`);
    clauses.push({ id, kind: c.kind, arms, filed: bandText(c), values, verdict, ...(note === undefined ? {} : { note }) });
  };
  const reported = (id: string, arms: readonly ArmId[], values: (s: SeedSet, l: League) => string, note?: string): void => {
    const c = clauseOf(id);
    if (c === undefined) return;
    if (arms.some((a) => sets.some((s) => at(a, s) === undefined))) return notPlayed(id, c.kind, arms, bandText(c));
    clauses.push({ id, kind: c.kind, arms, filed: bandText(c), values: sets.flatMap((s) => LEAGUES.map((l) => `${l} set ${String(s)} ${values(s, l)}`)), verdict: "REPORTED", ...(note === undefined ? {} : { note }) });
  };
  const every = (pred: (id: ArmId) => boolean, f: (r: Step5Record, l: League) => string | undefined): string[] =>
    [...records.entries()].filter(([id]) => pred(id)).flatMap(([id, bySet]) => sets.flatMap((s) => (bySet[s] === undefined ? [] : LEAGUES.flatMap((l) => {
      const p = f(bySet[s]!, l);
      return p === undefined ? [] : [`${id} set ${String(s)} ${l}: ${p}`];
    }))));
  const proof = (id: string, what: string, problems: readonly string[], kind: "structural" | "fold" = "structural"): void => {
    proofs.push({ id, what, kind, verdict: problems.length === 0 ? "PASS" : "FAIL", detail: problems.length === 0 ? "clean" : problems.slice(0, 5).join("; ") });
    if (problems.length > 0) (kind === "fold" ? foldFaults : structuralFailures).push(`${id}: ${String(problems.length)} failing, first: ${problems[0] ?? ""}`);
  };
  const has = (id: ArmId, parts: readonly string[]): boolean => parts.every((p) => partsOfArm(id).includes(p));

  // The structural proofs and fold checks (plan §7.2 R-3), each bound to the arms whose parts it reads.
  proof("S-1 proof:clean-expiry-bar", "on arms with d23, every THROW on a clean expiry goes to a man at the expiry bar (30) or more, and none comes from an empty pool; on arms with d23OnRun, no desperation THROW (best below the normal bar) after a clean break-out", [
    ...every((id) => has(id, ["d23"]), (r, l) => {
      const e = r.s5[l].extra;
      return e.emptyPoolThrows + e.belowBarTargetThrows > 0 ? `${String(e.emptyPoolThrows)} throw(s) from an empty pool, ${String(e.belowBarTargetThrows)} to a man below the expiry bar` : undefined;
    }),
    ...every((id) => has(id, ["breakOut", "d23OnRun"]), (r, l) => (r.s5[l].extra.onRunDesperation > 0 ? `${String(r.s5[l].extra.onRunDesperation)} desperation throw(s) after a clean break-out` : undefined)),
  ]);
  proof("S-2 proof:one-clean-move", "on arms with move, at most one clean move a play", every((id) => has(id, ["move"]), (r, l) => (r.s5[l].extra.twoCleanMoves > 0 ? `${String(r.s5[l].extra.twoCleanMoves)} play(s) with two clean moves` : undefined)));
  proof("S-3", "on the full checklist, no HOLD and no throwaway on a clean-expiry tick", every((id) => has(id, FULL_CHECKLIST), (r, l) => (r.s5[l].extra.expiryHolds + r.s5[l].extra.expiryThrowaways > 0 ? `${String(r.s5[l].extra.expiryHolds)} HOLD(s), ${String(r.s5[l].extra.expiryThrowaways)} throwaway(s) on a clean-expiry tick` : undefined)));
  if (half === "5a") proof("S-6", "the bench is clean: no dropback's worst status above CLEAN", every((id) => step5ArmDef(id)?.step5.kind === "bench", (r, l) => (r.s5[l].extra.nonClean > 0 ? `${String(r.s5[l].extra.nonClean)} dropback(s) above CLEAN` : undefined)));
  if (half === "5b") proof("S-10", "no CLOCK_EXPIRED throwaway on an F arm comes from a dropback CLEAN through the throwaway", every((id) => STEP5_GRID[id] !== undefined || id === "F0", (r, l) => (r.s5[l].extra.cleanClockExpired > 0 ? `${String(r.s5[l].extra.cleanClockExpired)} clean CLOCK_EXPIRED throwaway(s)` : undefined)));
  proof("rows", "the clean-pocket rows' build check (no clean scramble without the block)", every(() => true, (r, l) => cleanPocketRowProblems(r.s5[l].rows)[0]), "fold");
  proof("picks:offered", "every clean pick's option is in the offered set the stream and the arm's rules give (guardian C4)", every(() => true, (r, l) => (r.s5[l].s5.picks.offerFaults > 0 ? `${String(r.s5[l].s5.picks.offerFaults)} pick(s) outside their offered set` : undefined)), "fold");
  waits.push("S-4 (no aimed pocket THROW decided before its first read's floor), S-5 (the bump never writes contestPosition) and S-9 (the release mean equals the mean of THROW.releaseSeconds) are the engine's and the readers' unit proofs in this build; the harness does not re-read them");

  // The guard under AM-8 (S5 class view; equal dials skipped).
  const guardRows: Step4GuardRow[] = [];
  for (const [arm, base] of Object.entries(guard.bases).filter((e): e is [ArmId, ArmId] => e[1] !== undefined)) {
    for (const l of LEAGUES) {
      const sideOf = (r: Step5Record): GuardSide => ({
        all: r.report.intGuard[l].all,
        byClass: Object.fromEntries(Object.entries(r.s5[l].guard).map(([cls, cell]) => [cls, { aimedByBin: cell.aimedByBin, interceptions: cell.interceptions } satisfies IntMix])),
      });
      const bySet = (id: ArmId): Partial<Record<SeedSet, GuardSide>> => Object.fromEntries(sets.flatMap((s) => (at(id, s) === undefined ? [] : [[s, sideOf(at(id, s)!)]])));
      const armRecord = sets.map((s) => at(arm, s)).find((r) => r !== undefined);
      if (armRecord === undefined || !sets.some((s) => at(base, s) !== undefined)) {
        guardRows.push({ arm, against: base, league: l, role: "graded", verdict: "NOT PLAYED", graded: false, Z: null, breaches: [], filedBreaches: [], ownClock: [] });
        continue;
      }
      const baseRecord = sets.map((s) => at(base, s)).find((r) => r !== undefined);
      const dials = (r: Step5Record | undefined): string | undefined => r?.stamp.overlayDigest;
      if (guard.skipEqualDials && dials(armRecord) !== undefined && skipsEqualDials({ skipEqualDials: true }, dials(armRecord)!, dials(baseRecord) ?? "")) {
        guardRows.push({ arm, against: base, league: l, role: "graded", verdict: "SKIPPED (equal dials, AM-8 skipEqualDials)", graded: false, Z: null, breaches: [], filedBreaches: [], ownClock: [] });
        continue;
      }
      const reading = am1ArmReading(bySet(base), bySet(arm), armRecord.report.clock as GuardClock, guard.lines);
      const isGraded = reading.graded;
      const verdict = isGraded && oneSet === undefined ? (reading.breaches.length > 0 ? "BREACH" : "PASS") : "REPORTED";
      if (verdict === "BREACH") guardBreaches.push(`${arm} against ${base}, ${l}: ${reading.breaches.join(", ")}`);
      const fresh = guard.freshBases.includes(base) ? [`${base} is played fresh (AM-8 freshBases)`] : [];
      guardRows.push({ arm, against: base, league: l, role: "graded", verdict, graded: isGraded, Z: reading.league.Z, breaches: reading.breaches, filedBreaches: reading.filedBreaches, ownClock: fresh });
    }
  }
  const guardClause = (id: string, arm: ArmId): void => {
    const c = clauseOf(id);
    if (c === undefined) return;
    const rows = guardRows.filter((g) => g.arm === arm);
    const verdict = rows.length === 0 || rows.every((g) => g.verdict === "NOT PLAYED") ? "NOT PLAYED" : oneSet !== undefined ? "REPORTED" : rows.some((g) => g.verdict === "BREACH") ? "FAIL" : "PASS";
    clauses.push({ id, kind: c.kind, arms: [arm, guard.bases[arm] ?? "?"], filed: "AM-8", values: rows.map((g) => `${g.league} ${g.verdict}`), verdict, note: `under ${guard.am8}, the S5 class view` });
  };

  if (half === "5a") {
    banded("s5a.cleanScramble", "E9", undefined, (r, l) => cleanScrambleOf(r.s5[l]), LEAGUES, "flat and gen each graded");
    banded("s5a.completion", "E9", "E0", (r, l) => rowValueOf(r, "completion_per_aimed_throw", l), LEAGUES, "E9 minus E0, flat and gen each graded");
    guardClause("s5a.int", "E9");
    banded("s5a.release", "E9", undefined, (r, l) => rowValueOf(r, "release_distribution", l), [], "the raw mean");
    banded("s5a.under1", "E9", undefined, (r, l) => releaseSharesOf(r.s5[l].fit).under1, [], "at or under 1.25 s raw, on the fit's windows");
    banded("s5a.over35", "E9", undefined, (r, l) => releaseSharesOf(r.s5[l].fit).over35, [], "over 3.25 s raw, on the fit's windows");
    reported("s5a.cleanOuts", ["E9"], (s, l) => {
      const row = cleanPocketRows(at("E9", s)!.s5[l].rows)["row:clean_throwaway_in_pocket"] as { readonly cleanOuts: { readonly per100: number | null } };
      return `${num(row.cleanOuts.per100)} (clean_outs_rate beside ${num(rowValueOf(at("E9", s), "clean_outs_rate", l))} against 10.63)`;
    }, "the clause construct: clean scrambles plus clean throwaways per 100 clean dropbacks, against 5.17");
    for (const [id, row] of [["s5a.checkdown", "clean_checkdown_share"], ["s5a.laterRead", "clean_later_read_share"], ["s5a.nobodyOpen", "nobody_open_share"]] as const) {
      banded(id, "E9", undefined, (r, l) => rowValueOf(r, row, l), []);
    }
    reported("s5a.cleanThrowaway", ["E9"], (s, l) => {
      const row = cleanPocketRows(at("E9", s)!.s5[l].rows)["row:clean_throwaway_in_pocket"] as { readonly clean: { readonly inPocketPer100: number | null; readonly outOfPocketPer100: number | null } };
      return `in the pocket ${num(row.clean.inPocketPer100)}, outside ${num(row.clean.outOfPocketPer100)}`;
    });
    reported("s5a.removedClass", ["E0"], (s, l) => {
      const cell = at("E0", s)!.s5[l].guard.DESPERATION;
      const n = cell.aimedByBin.reduce((a, b) => a + b, 0);
      return `E0's desperation throws ${String(n)} (${num(per100(n, at("E0", s)!.s5[l].extra.dropbacks))} per 100 dropbacks), ${String(cell.interceptions)} INT`;
    });
    banded("s5a.intLeague", "E9", "E0", (r, l) => rowValueOf(r, "int_per_aimed_throw", l), [], "INT per aimed throw, E9 minus E0 (the filed int_rate's reading on aimed throws)");
    reported("s5a.reset", ["E10", "E9"], (s, l) => `clean moves ${String(at("E10", s)!.s5[l].s5.cleanMoves)} against ${String(at("E9", s)!.s5[l].s5.cleanMoves)}, picks ${String(at("E10", s)!.s5[l].s5.picks.total)} against ${String(at("E9", s)!.s5[l].s5.picks.total)}`, "E10 (no reset) against E9");
    for (const [id, p] of [["s5a.cleanExpiryBar", "S-1 proof:clean-expiry-bar"], ["s5a.oneCleanMove", "S-2 proof:one-clean-move"]] as const) {
      const c = clauseOf(id);
      const pr = proofs.find((q) => q.id === p);
      if (c !== undefined && pr !== undefined) clauses.push({ id, kind: c.kind, arms: [], filed: "structural", values: pr.verdict === "PASS" ? [] : [pr.detail], verdict: pr.verdict === "PASS" ? "PASS" : "FAIL", note: p });
    }
    // E0 twice (S-7).
    for (const s of sets) {
      const a = at("E0", s);
      const b = x.fresh?.[s];
      if (a === undefined || b === undefined) {
        replay.push(`E0 set ${String(s)}: ${a === undefined ? "not played" : "the second fresh play is not there"}`);
        if (a !== undefined) structuralFailures.push(`S-7: E0 set ${String(s)}'s second fresh play is missing`);
        continue;
      }
      const problems = freshBaseProblems(a, b);
      replay.push(`E0 set ${String(s)}, played fresh twice: ${problems.length === 0 ? "identical (stream digests and records)" : problems.join("; ")}`);
      if (problems.length > 0) structuralFailures.push(`S-7: E0 set ${String(s)}'s two fresh plays differ: ${problems.join("; ")}`);
    }
  }

  let selection: Am10Verdict | undefined;
  let selectionLines: string[] | undefined;
  let missLines: string[] | undefined;
  if (half === "5b") {
    // D1 against step 4's records (S-7).
    for (const s of sets) {
      const r = at("D1", s);
      const ref = x.step4?.get(`D1.set${String(s)}`);
      if (r === undefined || ref === undefined) {
        replay.push(`D1 set ${String(s)}: ${r === undefined ? "not played" : "step 4's record is not there"}`);
        if (r !== undefined) structuralFailures.push(`S-7: step 4's D1 set ${String(s)} record is not there to replay against`);
        continue;
      }
      const problems = q5Problems(r, ref);
      replay.push(`D1 set ${String(s)} against step 4's record: ${problems.length === 0 ? "equal" : `differs in ${problems.join(", ")}`}`);
      if (problems.length > 0) structuralFailures.push(`S-7: D1 set ${String(s)} differs from step 4's record in ${problems.join(", ")}`);
    }
    // S-8.
    const f5 = sets.map((s) => at("F5", s)).find((r) => r !== undefined);
    if (f5 !== undefined) {
      const d = f5.stamp.overlayDigest;
      proof("S-8", "F5's overlay digest equals POCKET_1_S5A_DIGEST", d === POCKET_1_S5A_DIGEST ? [] : [`F5 digests to ${d}, not ${String(POCKET_1_S5A_DIGEST)}`]);
    }
    // The selection (AM-10), once every grid point is played on both sets.
    if (oneSet === undefined) {
      const arms = (l: League): GridArm[] | undefined => {
        const out = STEP5_GRID_IDS.map((id) => gridArmOf(id, records.get(id) ?? {}, l));
        return out.every((g) => g !== undefined) ? (out as GridArm[]) : undefined;
      };
      const gen = arms("gen");
      if (gen === undefined) waits.push("the selection waits until F1 to F14 are played on both seed sets");
      else {
        selection = selectWith(gen, { curve: "pressured" });
        const flat = arms("flat");
        const flatVerdict = flat === undefined ? undefined : selectWith(flat, { curve: "pressured" });
        selectionLines = [
          `gen: winner ${selection.winner ?? "none"}${selection.stop === undefined ? "" : `; the step stops: ${selection.stop}`}`,
          ...selection.says.map((l) => `  ${l}`),
          ...selection.pressured.points.map((p) => `  pressured ${p.point}: ${p.scorable ? `set 1 ${num(p.set1, 4)}, set 2 ${num(p.set2, 4)}` : "unscorable"}; attempts set 1 ${p.attempts[1].join("/")}`),
          ...selection.hit.points.map((p) => `  hit ${p.point}: ${p.scorable ? `set 1 ${num(p.set1, 4)}, set 2 ${num(p.set2, 4)}` : "unscorable"}`),
          `flat (beside, deciding nothing): ${flatVerdict === undefined ? "not played" : `pressured winner ${flatVerdict.winner ?? "none"}; unscorable ${flatVerdict.pressured.unscorable.join(", ") || "none"}`}`,
        ];
        if (selection.stop !== undefined) next.push(`the selection stops the step (${selection.stop}): F0, G1 and G2 do not run; questions 1, 3 and 16 go to the owner`);
        else if (selection.winner !== undefined) next.push(`record the winner ${selection.winner} as pocket-1.s5b (the selection commit), then the second pass`);
      }
    }
    // F0's clauses on gen (graded), flat beside.
    const ext = (r: Step5Record, l: League): number | null => per100(r.s5[l].extra.clockExpired, r.s5[l].extra.dropbacks);
    banded("s5b.sack", "F0", undefined, (r, l) => rowValueOf(r, "sack_rate", l), ["gen"], "gen graded, flat beside");
    banded("s5b.hitOrSack", "F0", undefined, (r, l) => rowValueOf(r, "hit_or_sack_rate", l), ["gen"]);
    banded("s5b.release", "F0", undefined, (r, l) => rowValueOf(r, "release_distribution", l), ["gen"]);
    banded("s5b.clockExpired", "F0", undefined, ext, ["gen"], "CLOCK_EXPIRED throwaways per 100 dropbacks");
    banded("s5b.pressure", "F0", undefined, (r, l) => rowValueOf(r, "threat_creation_rate", l), ["gen"]);
    banded("mr.bin20.raw", "F0", undefined, (r, l) => bin20RawOf(r.s5[l]), ["gen"]);
    banded("mr.unblockedPressures", "F0", undefined, (r, l) => rowValueOf(r, "unblocked_pressures_per_100", l), ["gen"]);
    banded("mr.unblockedShare", "F0", undefined, (r, l) => rowValueOf(r, "unblocked_share_of_hit_or_sack", l), ["gen"]);
    banded("s5b.binsTwiceFtn", "F0", undefined, (r, l) => binsAboveTwiceFtn(r.s5[l]), [], "reported under the fallback");
    banded("s5b.quick", "F0", undefined, (r, l) => rowValueOf(r, "quick_pressure_share_by_origin", l), []);
    banded("s5b.standIn", "F0", undefined, (r, l) => rowValueOf(r, "sack_rate", l), []);
    banded("mr.unblockedMen", "F0", undefined, (r, l) => rowValueOf(r, "unblocked_men_per_100", l), []);
    guardClause("s5b.guard", "F0");
    // The miss rule on F0 (AM-10's split), when a covered row missed.
    const f0 = at("F0", graded);
    const covered = clauses.filter((c) => MISS_RULE_COVERS.includes(c.id) && c.arms[0] === "F0" && (c.verdict === "PASS" || c.verdict === "FAIL"));
    if (f0 !== undefined && covered.some((c) => c.verdict === "FAIL")) {
      const ms = (f0 as unknown as { readonly s3: Readonly<Record<League, { readonly missSplit: { readonly byClock: Readonly<Record<string, number | null>>; readonly quick: number | null } }>> }).s3.gen.missSplit;
      const rowOn = (id: string): number => rowValueOf(f0, id, "gen") ?? Number.NaN;
      const hitOrSack = clauseOf("s5b.hitOrSack");
      const split: MissSplit = {
        grid: "RAW",
        bin20NoFreeRunner: ms.byClock["bin20NoFreeRunner"] ?? Number.NaN,
        freeRunnerShareOf20: ms.byClock["freeRunnerShareOf20"] ?? Number.NaN,
        quick: rowOn("quick_pressure_share_by_origin"),
        quickNoFreeRunner: ms.byClock["quickNoFreeRunner"] ?? Number.NaN,
        unblockedPressuresPer100: rowOn("unblocked_pressures_per_100"),
        unblockedShareOfHitOrSack: rowOn("unblocked_share_of_hit_or_sack"),
        freeRunnersEarlierThanM8: 0,
        hitOrSackInBand: hitOrSack !== undefined && inBand(rowValueOf(f0, "hit_or_sack_rate", "gen"), hitOrSack),
        sacksShort: (rowValueOf(f0, "sack_rate", "gen") ?? Number.POSITIVE_INFINITY) < 3.9,
        shareShort: false,
        rows: covered.map((c) => ({ clause: c.id, value: Number.NaN, passed: c.verdict === "PASS" })),
      };
      const k = classifyMiss(split);
      missLines = [
        `missed: ${k.missed.join(", ")}`,
        ...k.classes.map((c) => `class ${c.class}: ${c.because.join("; ")}`),
        ...k.options.map((o) => `option: ${JSON.stringify(o)}`),
        ...(k.suppliers.length === 0 ? [] : [`class (iii)'s next suppliers: ${k.suppliers.join(", ")}`]),
        `decided by ${k.decidedBy}; the free-run clock and the throw bars are never on the list`,
      ];
      next.push("a covered row missed on F0: options A (G1), B (accept and report) and C (G2), each on both sets, go to the owner");
    }
  }

  // Affected plays per arm.
  for (const [id, bySet] of records) for (const s of sets) {
    const r = bySet[s];
    if (r === undefined) continue;
    for (const l of LEAGUES) {
      const f = r.s5[l].s5;
      const sum = s5Summary(f) as { readonly cleanExpiryPer100Dropbacks: number | null; readonly restartPer100Dropbacks: number | null };
      affected.push(
        `${id} set ${String(s)} ${l}: dropbacks ${String(f.dropbacks)}; clean expiries ${String(f.cleanExpiries.total)} (reads ${String(f.cleanExpiries.byTrigger.reads)}, count ${String(f.cleanExpiries.byTrigger.count)}; ${num(sum.cleanExpiryPer100Dropbacks)} per 100); ` +
          `picks ${String(f.picks.total)} ${canonicalise(f.picks.byOption)}; clean moves ${String(f.cleanMoves)}; restarts ${String(f.restarts)} (${num(sum.restartPer100Dropbacks)} per 100); bump receivers ${String(f.bumps.receivers)}; ` +
          `floor waits ${String(f.floorWaits.holds)}; escapes ${String(f.escapes.attempts)} (repeated ${String(f.escapes.repeatedPlays)}); coverage sacks ${String(f.coverageSacks.n)} of ${String(f.coverageSacks.sacks)}`,
      );
      const ex = r.s5[l].extra;
      affected.push(
        `${id} set ${String(s)} ${l}: beside S-1: clean-expiry throws rank-pushed inside the cut pool ${String(ex.rankPushedExpiryThrows)}, to a man below 30 ${String(ex.belowBarTargetThrows)}; ` +
          `throws after a clean break-out ${String(ex.breakOutThrows)}, of them desperation ${String(ex.onRunDesperation)}`,
      );
      if (f.picks.total > 0) {
        const cell = (c: S5Fold["picks"]["byOffered"]["one"]): string => `${String(c.n)} (by option ${canonicalise(c.byOption)}; by band ${canonicalise(c.byBand)})`;
        const u = f.picks.urgencyAbove0;
        affected.push(
          `${id} set ${String(s)} ${l}: the picks by offered set (guardian C4; with one option the band decides nothing): one option ${cell(f.picks.byOffered.one)}, two options ${cell(f.picks.byOffered.two)}; ` +
            `picks on a tick where today's urgency would be above 0 (ranked at 0 by definition; reported, never graded, for step 7's sight work): ${String(u.n)} (by option ${canonicalise(u.byOption)}; one option ${String(u.byOffered.one)}, two options ${String(u.byOffered.two)})`,
        );
      }
    }
  }

  const outcome = { structuralFailures, foldFaults, gradedFailures, guardBreaches, mergeCard: oneSet === undefined && structuralFailures.length === 0 && foldFaults.length === 0 && guardBreaches.length === 0, next };
  if (half === "5a" && gradedFailures.length > 0) next.push("a graded 5a miss goes to the owner (accept it as a named miss and go on, or stop for a design change); 5b's grids wait for the owner's word (--after-owner <ts>)");
  return {
    sections: {
      half,
      amendments: { digest: guard.digest, guard: guard.am8, readings: guard.readings },
      ...(oneSet === undefined ? {} : { oneSet }),
      outcome,
      clauses,
      proofs,
      guard: guardRows,
      replay,
      affected,
      ...(selectionLines === undefined ? {} : { selection: selectionLines }),
      ...(missLines === undefined ? {} : { miss: missLines }),
      waits,
    },
    ...(selection === undefined ? {} : { selection }),
  };
}

/** The grid's bin counts on a league as R-7's second process reads them (`reselect.ts`'s `RePoint`), or undefined while a point is missing. */
export function rePointsOf(records: Step5RecordsBySet, league: League): RePoint[] | undefined {
  const out: RePoint[] = [];
  for (const id of STEP5_GRID_IDS) {
    const g = gridArmOf(id, records.get(id) ?? {}, league);
    if (g === undefined) return undefined;
    out.push({ point: gridPointId(g.point), hit: { "1": g.hit[1], "2": g.hit[2] }, pressured: { "1": g.pressured[1], "2": g.pressured[2] } });
  }
  return out;
}

/** The recorded selection in R-7's shape. */
export function reselectionOf(v: Am10Verdict): Reselection {
  const curve = (c: Am10Verdict["pressured"]): Reselection["pressured"] => ({
    losses: c.points.map((p) => ({ point: p.point, scorable: p.scorable, set1: p.set1 ?? null, set2: p.set2 ?? null })),
    winner: c.winner ?? null,
    separated: c.separated ?? null,
  });
  return { curve: v.curve, winner: v.winner ?? null, stopped: v.stop !== undefined, pressured: curve(v.pressured), hit: curve(v.hit) };
}

export function renderStep5Report(grade: Step5Grade, records: Step5RecordsBySet): string {
  const stamps = [...records.values()].flatMap((bySet) => SEED_SETS.flatMap((s) => (bySet[s] === undefined ? [] : [bySet[s]!.stamp])));
  const commits = [...new Set(stamps.map((s) => `${s.commit}${s.dirty ? " (dirty)" : ""}`))].sort();
  const first = stamps[0];
  const s = grade.sections;
  const lines: string[] = [];
  lines.push(`# ADR-089 step ${s.half}: the arms${s.oneSet === undefined ? "" : `, seed set ${String(s.oneSet)} only (reported, never graded)`}`);
  lines.push("");
  lines.push(s.half === "5a" ? "His count, the drop floor and the clean-pocket checklist on the clean bench, behind pocket-1.s5a, which nothing plays by default." : "The block clock's grid on the league and its winner, behind pocket-1.s5b, which nothing plays by default.");
  lines.push("");
  lines.push(`- filing: ${first?.filedDigest ?? STEP0_FILED_DIGEST}; amendments at step ${s.half}: ${s.amendments.digest} (the guard ${s.amendments.guard}; the readings ${s.amendments.readings})`);
  lines.push(`- fingerprint: ${first?.fingerprint ?? "n/a"}; commit: ${commits.join(", ")}; node ${first?.node ?? "n/a"}; caller ${STEP1_CALLER}`);
  lines.push(`- PR #33: ${PR33_STATE}`);
  lines.push("");
  lines.push(...renderStep5Sections(s));
  return `${lines.join("\n")}\n`;
}

/** The measures file; `outcome` is what the 5b gate reads of the 5a records. */
export function step5MeasuresOf(records: Step5RecordsBySet, grade: Step5Grade, guard: Step5Guard, fingerprint: string, targets: readonly Step5Target[], afterOwner?: string): JsonValue {
  const o = grade.sections.outcome;
  const points = grade.selection === undefined ? undefined : rePointsOf(records, "gen");
  return sanitize({
    format: STEP5_MEASURES_FORMAT,
    half: guard.half,
    filedDigest: STEP0_FILED_DIGEST,
    amendments: guard.digest,
    fingerprint,
    ...(grade.sections.oneSet === undefined ? {} : { oneSet: grade.sections.oneSet }),
    ...(afterOwner === undefined ? {} : { afterOwner }),
    outcome: { faults: [...o.structuralFailures, ...o.foldFaults], breaches: o.guardBreaches, misses: o.gradedFailures },
    ...(grade.selection === undefined || points === undefined ? {} : { selection: { points, recorded: reselectionOf(grade.selection) } }),
    arms: Object.fromEntries(targets.map((t) => [targetName(t), records.get(t.id)![t.seedSet]!])),
    grade: grade.sections,
  });
}

export function step5SummaryLines(s: Step5Sections): readonly string[] {
  const o = s.outcome;
  return [
    `ADR-089 step ${s.half}: ${String(o.structuralFailures.length)} structural failure(s), ${String(o.foldFaults.length)} fold fault(s), ${s.oneSet === undefined ? `${String(o.gradedFailures.length)} graded failure(s)` : "nothing graded (one seed set)"}, ${String(o.guardBreaches.length)} guard breach(es)`,
    ...[...o.structuralFailures, ...o.foldFaults, ...o.guardBreaches, ...o.gradedFailures, ...o.next].map((line) => `  ${line}`),
  ];
}

// --- the run --------------------------------------------------------------------------------------------

export const STEP5_DIRTY_REFUSAL =
  "ADR-089 step 5: refused before anything plays: this tree is dirty, and step 5's cache is made only from a clean tree (its fingerprint must name a commit the records can be re-made from): commit first. Nothing has played and no cache was made";

export function step5CacheDir(cacheParent: string, env: Step1Env): string {
  if (env.dirty) throw new Error(STEP5_DIRTY_REFUSAL);
  const dir = join(cacheParent, env.fingerprint);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const freshFileOf = (dir: string, seedSet: SeedSet): string => join(dir, `E0.set${String(seedSet)}.fresh.json`);

function readStep5Record(path: string): Step5Record {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Step5Record;
  if (parsed.format !== STEP5_ARM_FORMAT) throw new Error(`${path}: not a step-5 arm record (format ${String((parsed as { format?: unknown }).format)})`);
  return parsed;
}

function cachedStampProblems(record: Step5Record, want: Step3Stamp): readonly string[] {
  const amend = record.stamp?.amendments;
  const lead = amend !== want.amendments ? [`stamped with amendments ${String(amend)}, not this build's view ${want.amendments}`] : [];
  return [...lead, ...stampProblems(record.stamp, want).filter((p) => !p.startsWith("amendments:"))];
}

export interface Step5Options {
  readonly half: Step5Half;
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
  readonly afterOwner?: string;
  /** Tests only: the gate's state (default `step5GateState()`), the arms' records, the pin, the player and E0's fresh play. */
  readonly gate?: Step5GateState;
  readonly step5Records?: Step5Records;
  readonly preflight?: PreflightStep5Options;
  readonly play?: (id: ArmId, seedSet: SeedSet, env: Step1Env, opts: PlayStep5Options) => Step5Record;
  /** Tests only: E0's second fresh play, written beside E0's record when E0 plays (default: none; the operator's second process writes it, `freshBaseCommandOf`). */
  readonly fresh?: (seedSet: SeedSet) => Step5Record;
  readonly step4?: Step4References;
}

export interface Step5RunResult {
  readonly cacheDir: string;
  readonly played: readonly string[];
  readonly cached: readonly string[];
  readonly remaining: readonly string[];
  readonly graded: boolean;
  readonly wrote: readonly string[];
  readonly grade?: Step5Grade;
  /** Commands the operator runs in another shell before the half grades (E0's second fresh plays, AM-8 `freshBases`). */
  readonly awaitingFresh?: readonly string[];
}

/** The command the operator runs in another shell for E0's second fresh play (S-7; library code never starts a process). */
export function freshBaseCommandOf(seedSet: SeedSet, corpus: Step1Corpus, file: string): string {
  return `pnpm --filter @ff/calibration pocket -- --step 5a --fresh-base ${String(seedSet)}${corpus.genThroughWeek === null ? "" : ` --gen-through-week ${String(corpus.genThroughWeek)}`} --out ${file}`;
}

/** Plays this shard's targets, then grades once every target is cached. Refused, before anything plays, by the preflight and the gate. */
export function runStep5(opts: Step5Options): Step5RunResult {
  const log = opts.log ?? ((): void => undefined);
  const { half } = opts;
  const { file, guard } = preflightStep5(half, opts.filedPath, opts.amendmentsPath, opts.preflight);
  const gate = step5GateRefusal(half, opts.gate ?? step5GateState(), opts.afterOwner);
  if (gate !== undefined) throw new Error(gate);
  const plan = planStep5(half, { ...(opts.arms === undefined ? {} : { arms: opts.arms }), ...(opts.shard === undefined ? {} : { shard: opts.shard }), ...(opts.seedSet === undefined ? {} : { seedSet: opts.seedSet }), ...(opts.step5Records === undefined ? {} : { records: opts.step5Records }) });
  const corpus = opts.corpus ?? FULL_CORPUS;
  const committed = opts.committedDir !== undefined && [opts.report, opts.out].some((p) => p !== undefined && isUnder(p, opts.committedDir!));
  const cacheDir = step5CacheDir(opts.cacheParent, opts.env);
  log(`pocket step ${half}: fingerprint ${opts.env.fingerprint}; amendments at step ${half} ${guard.digest} (${guard.am8}, ${guard.readings}); arms cached in ${cacheDir}`);
  const play = opts.play ?? playStep5Arm;
  const played: string[] = [];
  const cached: string[] = [];
  for (const t of plan.mine) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const want = step3StampOf(t.id, t.seedSet, opts.env, guard.digest, corpus);
    if (existsSync(path)) {
      const problems = cachedStampProblems(readStep5Record(path), want);
      if (problems.length > 0) throw new Error(`ADR-089 step ${half}: the cached ${targetName(t)} at ${path} is not this build's arm: ${problems.join("; ")}. Delete it, or use another --cache`);
      cached.push(targetName(t));
      continue;
    }
    log(`pocket step ${half}: playing ${targetName(t)}`);
    writeAtomic(path, jsonText(play(t.id, t.seedSet, opts.env, { corpus, log, amendments: guard.digest, classify: guard.classify })));
    played.push(targetName(t));
    if (opts.fresh !== undefined && t.id === "E0" && guard.freshBases.includes("E0") && !existsSync(freshFileOf(cacheDir, t.seedSet))) {
      writeAtomic(freshFileOf(cacheDir, t.seedSet), jsonText(opts.fresh(t.seedSet)));
    }
  }
  const remaining = plan.complete.filter((t) => !existsSync(armFileOf(cacheDir, t.id, t.seedSet))).map(targetName);
  const wrote: string[] = [];
  if (remaining.length > 0) {
    log(`pocket step ${half}: ${String(remaining.length)} target(s) still to play (${remaining.join(", ")}); the report is written once every target is in the cache`);
    return { cacheDir, played, cached, remaining, graded: false, wrote };
  }
  // E0's second fresh plays (AM-8 freshBases, S-7) come from a second process the operator runs.
  const freshSets = guard.freshBases.includes("E0") ? plan.complete.filter((t) => t.id === "E0").map((t) => t.seedSet) : [];
  const awaitingFresh = freshSets.filter((s) => !existsSync(freshFileOf(cacheDir, s))).map((s) => freshBaseCommandOf(s, corpus, freshFileOf(cacheDir, s)));
  if (awaitingFresh.length > 0) {
    log(`pocket step ${half}: every target is cached; E0's second fresh play is not there yet (AM-8, S-7). In another shell run\n${awaitingFresh.map((c) => `  ${c}`).join("\n")}\nthen run this command again to grade`);
    return { cacheDir, played, cached, remaining, graded: false, wrote, awaitingFresh };
  }
  const records = new Map<ArmId, Partial<Record<SeedSet, Step5Record>>>();
  for (const t of plan.complete) {
    const path = armFileOf(cacheDir, t.id, t.seedSet);
    const record = readStep5Record(path);
    const problems = cachedStampProblems(record, step3StampOf(t.id, t.seedSet, opts.env, guard.digest, corpus));
    if (problems.length > 0) throw new Error(`ADR-089 step ${half}: refused to grade: the cached ${targetName(t)} at ${path} is not this build's arm: ${problems.join("; ")}`);
    records.set(t.id, { ...(records.get(t.id) ?? {}), [t.seedSet]: record });
  }
  if (committed && [...records.values()].some((b) => SEED_SETS.some((s) => b[s]?.stamp.dirty === true))) throw new Error(`ADR-089 step ${half}: refused to grade a committed report: a record was played on a dirty tree`);
  const fresh: Partial<Record<SeedSet, Step5Record>> = {};
  for (const s of freshSets) {
    const path = freshFileOf(cacheDir, s);
    const record = readStep5Record(path);
    const problems = cachedStampProblems(record, step3StampOf("E0", s, opts.env, guard.digest, corpus));
    if (problems.length > 0) throw new Error(`ADR-089 step ${half}: refused to grade: E0 set ${String(s)}'s second fresh play at ${path} is not this build's: ${problems.join("; ")}. Delete it and run the fresh process again`);
    fresh[s] = record;
  }
  const grade = gradeStep5({ half, records, file, guard, fresh, step4: opts.step4 ?? loadStep4References(), ...(plan.oneSet === undefined ? {} : { oneSet: plan.oneSet }) });
  if (opts.report !== undefined) {
    writeAtomic(opts.report, renderStep5Report(grade, records));
    wrote.push(opts.report);
  }
  if (opts.out !== undefined) {
    writeAtomic(opts.out, jsonText(step5MeasuresOf(records, grade, guard, opts.env.fingerprint, plan.complete, opts.afterOwner)));
    wrote.push(opts.out);
  }
  return { cacheDir, played, cached, remaining, graded: true, wrote, grade };
}

// --- R-1 and R-7 ----------------------------------------------------------------------------------------

export interface Step5DigestsResult {
  readonly format: typeof STEP5_DIGESTS_FORMAT;
  readonly amendments: string;
  readonly node: string;
  readonly caller: string;
  readonly gamesPerLeague: number;
  readonly arms: Readonly<Record<string, Readonly<Record<string, { readonly games: number; readonly events: number; readonly canonicalFold: string; readonly byteFold: string }>>>>;
}

/** R-1: the golden 50 a league under F5, every F grid point and F0, and E0 and E9's bench tunables; refused by the gate until the 5b literal exists. */
export function runStep5Digests(opts: { readonly filedPath: string; readonly amendmentsPath: string; readonly node: string; readonly first?: number; readonly arms?: readonly ArmId[]; readonly log?: (line: string) => void; readonly gate?: Step5GateState; readonly records?: Step5Records }): Step5DigestsResult {
  const { guard } = preflightStep5("5b", opts.filedPath, opts.amendmentsPath);
  const gate = step5GateRefusal("5a", opts.gate ?? step5GateState());
  if (gate !== undefined) throw new Error(gate);
  const ids: readonly ArmId[] = opts.arms ?? ([...STEP5_GRID_IDS, "F0", "E0", "E9"] as ArmId[]).filter((id) => step5ArmRefusal(id, opts.records) === undefined);
  const arms: Record<string, Record<string, { games: number; events: number; canonicalFold: string; byteFold: string }>> = {};
  for (const id of ids) {
    const refusal = step5ArmRefusal(id, opts.records);
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
      opts.log?.(`pocket step 5 digests: ${id} ${league}, ${String(canonical.length)} games`);
    }
    arms[id] = leagues;
  }
  return { format: STEP5_DIGESTS_FORMAT, amendments: guard.digest, node: opts.node, caller: STEP1_CALLER, gamesPerLeague: opts.first ?? 50, arms };
}

// --- the command ----------------------------------------------------------------------------------------

/** The `--report` and `--out` that would write over a closed step's committed records (steps 1 to 4, and each half's once final). */
export function closedStep5Writes(args: Pick<Step5Args, "report" | "out">, cwd: string, pkgRoot: string = PKG_ROOT, final: { readonly a: boolean; readonly b: boolean } = { a: STEP5A_RECORDS_FINAL, b: STEP5B_RECORDS_FINAL }): readonly string[] {
  const closed = new Set(
    [...STEP1_CLOSED_RECORDS, ...STEP2_CLOSED_RECORDS, ...STEP3_RECORDS, ...STEP4_RECORDS, FIT5A_RECORD, ...(final.a ? STEP5A_RECORDS : []), ...(final.b ? STEP5B_RECORDS : [])].map((r) => realOf(join(pkgRoot, r))),
  );
  return (["report", "out"] as const).flatMap((flag) => {
    const value = args[flag];
    return value !== undefined && closed.has(realOf(resolve(cwd, value))) ? [`--${flag} ${value}`] : [];
  });
}

export async function step5Command(args: Step5Args, log: (line: string) => void): Promise<void> {
  const repoRoot = resolve(PKG_ROOT, "..", "..");
  const filedPath = join(PKG_ROOT, FILED_PATH);
  const amendmentsPath = join(PKG_ROOT, AMENDMENTS_PATH);
  const half = args.step;
  const corpus: Step1Corpus = args.genThroughWeek === undefined ? FULL_CORPUS : { flatFirst: null, genThroughWeek: args.genThroughWeek };
  const closed = closedStep5Writes(args, process.cwd());
  if (closed.length > 0 && args.fit !== true) throw new Error(`ADR-089 step ${half}: ${closed.join(" and ")} would write over committed records, which are never edited. Write elsewhere`);
  const full = step1Env(repoRoot, filedPath);
  const env: Step1Env = { fingerprint: full.fingerprint, commit: full.commit, dirty: full.dirty, node: full.node };
  log(`pocket step ${half}: fingerprint ${env.fingerprint}; commit ${env.commit}${env.dirty ? ` (dirty: ${full.reason ?? "?"})` : ""}; node ${env.node}`);
  if (args.fitReplay !== undefined) {
    // The fit's fresh process (R-6), run by the operator in another shell: re-plays the given offsets with no cache and writes their histograms.
    writeAtomic(args.out!, jsonText(fitReplay(args.fitReplay, corpus, env.fingerprint)));
    log(`pocket step 5a fit: the fresh replay of offsets ${args.fitReplay.join(", ")} is written to ${args.out!}; run --fit again`);
    return;
  }
  if (args.fit === true) {
    const { guard } = preflightStep5("5a", filedPath, amendmentsPath);
    const cacheParent = args.cache ?? join(PKG_ROOT, "data-cache", "pocket-step5a-fit");
    const r = runFit5a({
      env,
      amendments: guard.digest,
      cacheParent,
      corpus,
      log,
      ...(args.shard === undefined ? {} : { shard: args.shard }),
      ...(args.out === undefined ? {} : { out: args.out }),
    });
    if (r.record !== undefined) log(`pocket step 5a fit: winner ${canonicalise(r.record.winner)}`);
    return;
  }
  if (args.freshBase !== undefined) {
    // E0's second fresh play (hidden): no cache, written to --out.
    const { guard } = preflightStep5("5a", filedPath, amendmentsPath);
    writeAtomic(args.out!, jsonText(playStep5Arm("E0", args.freshBase, env, { corpus, log, amendments: guard.digest, classify: guard.classify })));
    log(`pocket step 5a: E0 set ${String(args.freshBase)}'s fresh play is written to ${args.out!}`);
    return;
  }
  if (args.digests === true) {
    const result = runStep5Digests({ filedPath, amendmentsPath, node: process.version, log });
    writeAtomic(args.out!, jsonText(result));
    log(`pocket step ${half}: wrote the digests to ${args.out!}`);
    return;
  }
  const result = runStep5({
    half,
    ...(args.arms === undefined ? {} : { arms: args.arms }),
    ...(args.shard === undefined ? {} : { shard: args.shard }),
    ...(args.seedSet === undefined ? {} : { seedSet: args.seedSet }),
    ...(args.report === undefined ? {} : { report: args.report }),
    ...(args.out === undefined ? {} : { out: args.out }),
    ...(args.afterOwner === undefined ? {} : { afterOwner: args.afterOwner }),
    cacheParent: args.cache ?? join(PKG_ROOT, "data-cache", "pocket-step5"),
    filedPath,
    amendmentsPath,
    env,
    corpus,
    log,
    committedDir: join(PKG_ROOT, "reports"),
  });
  if (result.graded && result.grade !== undefined) process.stdout.write(`${step5SummaryLines(result.grade.sections).join("\n")}\n`);
}
