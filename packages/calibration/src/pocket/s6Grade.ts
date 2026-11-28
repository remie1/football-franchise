/**
 * ADR-089 step 6: THE GRADING AND THE REPORT (step-6 plan §6.1, §6.2, §7, §8.2, §8.3; AM-12; AM-13 as
 * drafted in `filing.md`). Pure: it reads the arms' records (`step6.ts`'s `playStep6Arm`) and plays
 * nothing.
 *
 *  - **Every s6 clause** as filed (`bands.ts`), on its arm (plan §6.1's "arm read"), both leagues and
 *    both seed sets, graded on gen seed set 1 with set 2 beside: PASS, FAIL, PASS (split) or FAIL
 *    (split), split when set 2 reads on the other side of the band (`verdictWord`); the binomial SE
 *    (and M5's game-clustered bootstrap SE where M5 reads) beside; flat beside with its direction
 *    against F5 (or the clause's base); a D6 miss (flat and gen moving opposite ways, each against
 *    the base) recorded beside and sent to the owner, never changing gen's verdict; every
 *    pressure-keyed row labeled "rusher got close" (AM-11's row rule); the ledger of falsifiers.
 *  - **The proofs**: S-11 to S-20 from the folds (each over the arms that carry its part), S-14 with
 *    the contacts at the escape site read three ways, the replays (S-7': D1 and E9 against their
 *    records, AM-12's exception for D1 on gen seed set 2 and the plan's for E9; F5's two fresh
 *    plays), S-8' (the overlay digests) and the stream equalities (H12 and H6 against F5, HBN
 *    against E9), M5 (`s6.mirror`, H0M against H0).
 *  - **The guard** under AM-12: H0 against F5 and F5 against D1, on the S5 class view, AM-1's
 *    statistic, every split printed; every other arm "unguarded" with its Z.
 *  - **The 5a revisit** in both counts, scoring alone and play alone, part by part, the funnel rung by
 *    rung and the interaction (plan §8.3), never graded.
 *
 * REAL figures are the filing's and the plan's (each labeled where printed); every sim figure is
 * MEASURED by the arms' records; SEs are binomial on the counts the records carry (INFERRED).
 */
import { canonicalise } from "../harness/digest.js";
import type { AmendmentsFile, BaseMap, GuardRule } from "./amendments.js";
import { STEP6_ARM_DEFS, STEP6_ARM_IDS, STEP6_FUNNEL, step6ArmDef, type ArmId } from "./arms.js";
import type { IntMix } from "./bands.js";
import type { SeedSet } from "./corpus.js";
import type { BandClause, FiledFile, JsonValue } from "./filed.js";
import { am1ArmReading, replayExceptionOf, SEED_SETS, skipsEqualDials, type Am1Lines, type GuardSide } from "./guardAm1.js";
import { sharesPct } from "./m3SackerMix.js";
import { m5Compare, m5RowZ, M5_S6_ROWS, type M5Run } from "./m5Mirror.js";
import { LEAGUES, type League } from "./report.js";
import type { OutsOptions, OutsPart } from "./rules.js";
import { S6_PROOFS, S6_PROOF_IDS, type S6ProofId, type Step6LeagueFolds } from "./s6Checks.js";
import { S6_REAL_BESIDE, s6Rows } from "./s6Rows.js";
import { rowValueOf, shareSE } from "./step3.js";
import { cleanScrambleOf, guardAllOf, STEP5_GUARD_CLOCK, type Step5Record } from "./step5.js";
import type { ThrowClassifier } from "./throwClass.js";

export const STEP6_ARM_FORMAT = "adr-089-step6-arm/v1";
export const STEP6_MEASURES_FORMAT = "adr-089-step6-measures/v1";
export const STEP6_DIGESTS_FORMAT = "adr-089-step6-digests/v1";

/** AM-11 `interimClock`: printed beside the stamp of every record, report and save of steps 6 and 7. */
export const STEP6_CLOCK_LABEL = "interim clock S theta 11 (F5), not selected";
/** AM-11 `rowRule`: every row reading pressure on the sim's side reads the physical count, printed so. */
export const ROW_RULE_LABEL = "rusher got close";

/** The graded seed set (plan §6.1): gen seed set 1, set 2 beside. */
export const STEP6_GRADED_SET: SeedSet = 1;

/** The recipe a step-6 arm's record carries (absent on D1, F5 and E9). */
export interface Step6RecordRecipe {
  readonly kind: "league" | "bench";
  readonly parts: readonly OutsPart[];
  readonly outsOptions: OutsOptions;
  readonly ratingOverridesDigest: string;
  readonly mirror: boolean;
}

/** One arm on both leagues at one seed set: step 5's record with the clock label, the recipe and step 6's folds. */
export interface Step6Record extends Omit<Step5Record, "format"> {
  readonly format: typeof STEP6_ARM_FORMAT;
  readonly clock: typeof STEP6_CLOCK_LABEL;
  readonly step6?: Step6RecordRecipe;
  readonly s6: Readonly<Record<League, Step6LeagueFolds>>;
}

export type Step6RecordsBySet = ReadonlyMap<string, Readonly<Partial<Record<SeedSet, Step6Record>>>>;

/** What the grading reads of AM-12 and AM-13 (`step6.ts`'s preflight). */
export interface Step6Guard {
  readonly digest: string;
  readonly view: AmendmentsFile;
  readonly guardEntry: string;
  readonly readingsEntry: string;
  readonly rule: GuardRule;
  readonly bases: BaseMap;
  readonly lines: Am1Lines;
  readonly classify: ThrowClassifier;
  readonly freshBases: readonly string[];
  readonly skipEqualDials: boolean;
  /** The owner's three answers as AM-13 files them. */
  readonly answers: OutsOptions;
}

export type Step6Verdict = "PASS" | "FAIL" | "PASS (split)" | "FAIL (split)" | "REPORTED" | "NOT PLAYED";

/** Plan §6.1's verdict word: gen set 1's, "(split)" when set 2 reads on the other side of the band. */
export function verdictWord(set1Passes: boolean, set2Passes: boolean | undefined): Step6Verdict {
  const word = set1Passes ? "PASS" : "FAIL";
  return set2Passes === undefined || set2Passes === set1Passes ? word : set1Passes ? "PASS (split)" : "FAIL (split)";
}

export const isFail = (v: Step6Verdict): boolean => v === "FAIL" || v === "FAIL (split)";

/** The SE of a difference of two independent readings (plan §6.1). */
export function diffSE(a: number | null, b: number | null): number | null {
  return a === null || b === null ? null : Math.sqrt(a * a + b * b);
}

export interface Step6ClauseRow {
  readonly id: string;
  readonly kind: BandClause["kind"];
  readonly arms: readonly string[];
  readonly filed: string;
  readonly values: readonly string[];
  readonly verdict: Step6Verdict;
  readonly note?: string;
}

export interface Step6ProofRow {
  readonly id: string;
  readonly what: string;
  readonly arms: readonly string[];
  readonly verdict: "PASS" | "FAIL" | "NOT READ";
  readonly detail: string;
}

export interface Step6GuardRow {
  readonly arm: string;
  readonly against: string;
  readonly league: League;
  readonly role: "graded" | "unguarded";
  readonly verdict: string;
  readonly Z: number | null;
  readonly breaches: readonly string[];
  readonly lines: readonly string[];
}

export interface Step6Outcome {
  /** Build faults: structural proofs and fold checks that failed (fixed, never waived). */
  readonly faults: readonly string[];
  /** AM-12 breaches on a graded pair. */
  readonly breaches: readonly string[];
  /** Graded misses on gen seed set 1 (FAIL and FAIL (split)). */
  readonly misses: readonly string[];
  /** D6's misses (flat against gen), sent to the owner with the graded misses; never a verdict. */
  readonly d6Misses: readonly string[];
  /** Splits that appear (PASS (split)), told. */
  readonly splits: readonly string[];
}

export interface Step6Sections {
  readonly oneSet?: SeedSet;
  readonly amendments: { readonly digest: string; readonly guard: string; readonly readings: string; readonly answers: OutsOptions };
  readonly clauses: readonly Step6ClauseRow[];
  readonly proofs: readonly Step6ProofRow[];
  readonly guard: readonly Step6GuardRow[];
  readonly replays: readonly string[];
  readonly revisit: readonly string[];
  readonly funnel: readonly string[];
  readonly interaction: readonly string[];
  readonly counts: readonly string[];
  readonly waits: readonly string[];
  readonly outcome: Step6Outcome;
}

export interface GradeStep6Inputs {
  readonly records: Step6RecordsBySet;
  readonly file: FiledFile;
  readonly guard: Step6Guard;
  /** F5's second fresh play by set. */
  readonly fresh?: Readonly<Partial<Record<SeedSet, Step6Record>>>;
  /** D1 from step 4's committed records, E9 from step 5a's, keyed `<arm>.set<n>`. */
  readonly references?: ReadonlyMap<string, object>;
  readonly oneSet?: SeedSet;
  /** `POCKET_1_S5A_DIGEST` and `POCKET_1_S6_DIGEST` (S-8'). */
  readonly s5aDigest: string | undefined;
  readonly s6Digest: string | undefined;
}

export interface Step6Grade {
  readonly sections: Step6Sections;
}

// --- small readers -----------------------------------------------------------------------------------

const num = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(dp));
const per100 = (n: number, d: number): number | null => (d > 0 ? (100 * n) / d : null);
const sign = (v: number | null): number => (v === null || !Number.isFinite(v) || v === 0 ? 0 : v > 0 ? 1 : -1);
const dirWord = (v: number | null): string => (sign(v) > 0 ? "up" : sign(v) < 0 ? "down" : "flat");

export function bandTextOf(c: Pick<BandClause, "lo" | "hi" | "direction">): string {
  const lo = typeof c.lo === "number" ? c.lo : undefined;
  const hi = typeof c.hi === "number" ? c.hi : undefined;
  if (lo !== undefined && hi !== undefined) return lo === hi ? `against ${String(lo)}` : `${String(lo)} to ${String(hi)}`;
  if (hi !== undefined) return `at most ${String(hi)}`;
  if (lo !== undefined) return `at least ${String(lo)}`;
  return c.direction === undefined ? "reported" : `direction ${c.direction}`;
}

/** Whether a reading passes its clause: inside its band, or moving its filed direction. */
export function passesClause(v: number | null, c: Pick<BandClause, "lo" | "hi" | "direction">): boolean {
  if (v === null || !Number.isFinite(v)) return false;
  if (typeof c.lo === "number" && v < c.lo - 1e-12) return false;
  if (typeof c.hi === "number" && v > c.hi + 1e-12) return false;
  if (c.direction === "UP" && !(v > 0)) return false;
  if (c.direction === "DOWN" && !(v < 0)) return false;
  return true;
}

/** One reading of a clause on one league and seed set. */
export interface Reading {
  readonly value: number | null;
  readonly se: number | null;
  readonly n?: number;
  readonly beside?: string;
}

/** A row's value and its binomial SE on `n`. */
const rated = (value: number | null, n: number, beside?: string): Reading => ({ value, se: shareSE(value, n), n, ...(beside === undefined ? {} : { beside }) });

/** The rows a record's step-6 folds give on one league. */
const rowsOf = (r: Step6Record, l: League): Readonly<Record<string, unknown>> => s6Rows(r.s6[l].rows);

const pocketOf = (r: Step6Record, l: League): NonNullable<Step6LeagueFolds["pocket"]> | undefined => r.s6[l].pocket ?? undefined;

/** The box-score scramble count in the clean pocket per 100 clean dropbacks (AM-13 `scrambleCount`). */
export function boxScoreCleanScrambleOf(r: Step6Record, l: League): number | null {
  const b = rowsOf(r, l)["boxScoreScrambles"] as { readonly byPocket: { readonly clean: { readonly boxScore: { readonly per100: number | null } } } };
  return b.byPocket.clean.boxScore.per100;
}

/** Throwaways per 100 dropbacks, from the metrics fold's counts (`throwaway_rate` is not a record row). */
export function throwawayRateOf(r: Step6Record, l: League): Reading {
  const p = pocketOf(r, l);
  return p === undefined ? { value: null, se: null } : rated(per100(p.throwaways, p.dropbacks), p.dropbacks);
}

/** The sack share of contacts in the pocket minus out of it, in points, with its SE. */
export function contactsInOutOf(r: Step6Record, l: League): Reading & { readonly inShare: number | null } {
  const p = pocketOf(r, l);
  if (p === undefined) return { value: null, se: null, inShare: null };
  const a = per100(p.sacksIn, p.contactsIn);
  const b = per100(p.sacksOut, p.contactsOut);
  const v = a === null || b === null ? null : a - b;
  return { value: v, se: diffSE(shareSE(a, p.contactsIn), shareSE(b, p.contactsOut)), n: p.contactsIn + p.contactsOut, inShare: a, beside: `in ${num(a)} of ${String(p.contactsIn)} contacts, out ${num(b)} of ${String(p.contactsOut)} (REAL 45.5 against 43.9)` };
}

/** A league's sack_rate reading. */
const sackRate = (r: Step6Record, l: League): Reading => rated(rowValueOf(r, "sack_rate", l), r.report.sacks[l].dropbacks);
/** A league's scramble_rate reading. */
const scrambleRate = (r: Step6Record, l: League): Reading => rated(rowValueOf(r, "scramble_rate", l), r.report.sacks[l].dropbacks);
/** P2S on the record's report, on the pressured dropbacks ("rusher got close"). */
const p2sOf = (r: Step6Record, l: League): Reading => rated(r.report.p2s[l], r.report.sacks[l].pressuredDropbacks, ROW_RULE_LABEL);

/** The failed-escape rate (`row:failed_escape_rate`), with its rolls. */
export function failedEscapeOf(r: Step6Record, l: League): Reading {
  const row = rowsOf(r, l)["row:failed_escape_rate"] as { readonly pct: number | null; readonly rolls: number; readonly byPocket: Readonly<Record<string, { readonly pct: number | null }>> };
  return rated(row.pct, row.rolls, `by pocket: clean ${num(row.byPocket["clean"]?.pct)}, pressured ${num(row.byPocket["pressured"]?.pct)}`);
}

/** The difference of two readings (arm minus base), its SE the root of the sum of squares. */
const minus = (a: Reading, b: Reading): Reading => ({ value: a.value === null || b.value === null ? null : a.value - b.value, se: diffSE(a.se, b.se) });

/** The rows' sacker mix by pocket: each class's share out of the pocket minus in it, in points. */
export function sackerShiftOf(r: Step6Record, l: League, cls: string): { readonly value: number | null; readonly inPct: number | null; readonly outPct: number | null } {
  const by = r.s6[l].rows.m3.byPocket;
  if (by === undefined) return { value: null, inPct: null, outPct: null };
  const sum = (m: Readonly<Record<string, number>>): number => Object.values(m).reduce((a, b) => a + b, 0);
  const inPct = sum(by.in) === 0 ? null : (sharesPct(by.in)[cls] ?? 0);
  const outPct = sum(by.out) === 0 ? null : (sharesPct(by.out)[cls] ?? 0);
  return { value: inPct === null || outPct === null ? null : outPct - inPct, inPct, outPct };
}

// --- the replays (S-7') -----------------------------------------------------------------------------

/** The fields a replay leaves out: the format, the stamp, the clock label, the recipe and step 6's folds (and step 5's, against step 4's record). */
export const S6_REPLAY_LEFT_OUT = ["format", "stamp", "clock", "step6", "s6"] as const;

/** A record's projection on one league: every object holding both a `flat` and a `gen` key keeps only `league`'s. */
export function leagueProjection(value: unknown, league: League): unknown {
  if (Array.isArray(value)) return value.map((v) => leagueProjection(v, league));
  if (typeof value !== "object" || value === null) return value;
  const o = value as Readonly<Record<string, unknown>>;
  if ("flat" in o && "gen" in o) return leagueProjection(o[league], league);
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, leagueProjection(v, league)]));
}

/** The top-level fields on which a replay and its record differ on one league, `leftOut` aside. */
export function replayFieldsDiffering(replay: object, record: object, league: League, leftOut: readonly string[]): readonly string[] {
  const a = replay as Readonly<Record<string, unknown>>;
  const b = record as Readonly<Record<string, unknown>>;
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !leftOut.includes(k)).sort();
  return keys.filter((k) => canonicalise((leagueProjection(a[k] ?? null, league) ?? null) as JsonValue) !== canonicalise((leagueProjection(b[k] ?? null, league) ?? null) as JsonValue));
}

/** F5's two fresh plays (AM-12 `freshBases`): equal stream digests on both leagues and equal records, the stamp aside. */
export function freshF5Problems(first: Step6Record, second: Step6Record): readonly string[] {
  const out: string[] = [];
  for (const l of LEAGUES) if (canonicalise(first.s5[l].fit.games) !== canonicalise(second.s5[l].fit.games)) out.push(`${l}: the stream digests differ`);
  const a = first as unknown as Readonly<Record<string, JsonValue>>;
  const b = second as unknown as Readonly<Record<string, JsonValue>>;
  const fields = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => k !== "stamp" && canonicalise(a[k] ?? null) !== canonicalise(b[k] ?? null));
  if (fields.length > 0) out.push(`the records differ in ${fields.join(", ")}`);
  return out;
}

/** The plan's E9 exception (plan §7.2: "E9 replays 5a's records with the same exception"), not in AM-12's list. */
export const E9_REPLAY_EXCEPTION = Object.freeze({ arm: "E9", league: "gen" as League, seedSet: 2 as SeedSet, record: "step-6 plan §7.2", how: "re-played, its move from step 5a's record printed beside, never a fault" });

// --- the grading ------------------------------------------------------------------------------------

/** The interaction's partitions of the parts (CHOSEN, plan §5.3): the part-alone arms whose parts cover the joint build once each, direction aside (alone it moves no die). */
export const S6_INTERACTION = Object.freeze({
  bench: { joint: "HB0", base: "E9", parts: ["HB2", "HB3", "HB4", "HB5", "HB7", "HB10", "HB11", "HB12", "HBN"] },
  league: { joint: "H0", base: "F5", parts: ["H1", "H2", "H3", "H4", "H5", "H7", "H8", "H10", "H11", "H12"] },
} as const);

/** The arms the 5a revisit prints (plan §8.3), in order. */
export const S6_REVISIT_ARMS = Object.freeze(["E9", "HB0", "HB2", "HB3", "HB4", "HB5", "HB7", "HB9", "HB10", "HB11", "HB12", "HBN", "HB2L", "HF1", "HF2", "HF3", "HF4", "HF5", "F5", "H0", "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10", "H11", "H12", "H2L"] as const);

/** The arms whose clauses read S-14 (`s6.readersAgree`). */
export const S6_AGREE_ARMS: readonly string[] = Object.freeze(STEP6_ARM_DEFS.filter((d) => d.graded.includes("s6.readersAgree")).map((d) => d.id));

/** The arms whose folds keep each game's stripped digest: the stream equalities (H12 and H6 against F5, HBN against E9) and F5's fresh plays. */
export const S6_DIGEST_ARMS: readonly string[] = Object.freeze(["F5", "E9", "H6", "H12", "HBN"]);
/** M5's arms (`s6.mirror`): H0 and its mirror, H0M. */
export const S6_M5_ARMS: readonly string[] = Object.freeze(["H0", "H0M"]);
/**
 * The arms whose folds read the movement cross-check's deadline picks (`m6Contact.ts`; cal-2's
 * handoff: printed, against the step-6 reading's): the joint builds, H0 on the league and HB0 on the
 * bench (CHOSEN: the two trees that carry every part).
 */
export const S6_CROSS_CHECK_ARMS: readonly string[] = Object.freeze(["H0", "HB0"]);

/** The arms whose parts bind a proof (R-3), or S-14's arms. */
export function armsOfProof(proof: S6ProofId): readonly string[] {
  if (proof === "S-14") return S6_AGREE_ARMS;
  const parts: readonly OutsPart[] = S6_PROOFS[proof].parts;
  return STEP6_ARM_DEFS.filter((d) => parts.some((p) => d.step6.parts.includes(p))).map((d) => d.id);
}

/** Every arm's record at a set, or undefined. */
type At = (id: string, s: SeedSet) => Step6Record | undefined;

export function gradeStep6(x: GradeStep6Inputs): Step6Grade {
  const { records, file, guard, oneSet } = x;
  const sets: readonly SeedSet[] = oneSet === undefined ? SEED_SETS : [oneSet];
  const graded: SeedSet = oneSet ?? STEP6_GRADED_SET;
  const at: At = (id, s) => records.get(id)?.[s];
  const played = (ids: readonly string[]): boolean => ids.every((id) => sets.every((s) => at(id, s) !== undefined));
  const clauseOf = (id: string): BandClause | undefined => file.bands.clauses.find((c) => c.id === id);
  const clauses: Step6ClauseRow[] = [];
  const proofs: Step6ProofRow[] = [];
  const faults: string[] = [];
  const misses: string[] = [];
  const d6Misses: string[] = [];
  const splits: string[] = [];
  const breaches: string[] = [];
  const waits: string[] = [];
  const replays: string[] = [];
  const counts: string[] = [];

  const notPlayed = (id: string, arms: readonly string[]): void => {
    const c = clauseOf(id);
    clauses.push({ id, kind: c?.kind ?? "reported", arms, filed: c === undefined ? "not filed" : bandTextOf(c), values: [`not played: ${arms.filter((a) => sets.some((s) => at(a, s) === undefined)).join(", ")}`], verdict: "NOT PLAYED" });
  };

  /**
   * A banded clause read by `read` on `arms` (the first the arm read), graded on gen at the graded set
   * when the filing grades it; `change` is the reading's change against the base for D6 (the value
   * itself on a difference clause).
   */
  const banded = (id: string, arms: readonly string[], read: (s: SeedSet, l: League) => Reading, change: (s: SeedSet, l: League) => number | null, note?: string): void => {
    const c = clauseOf(id);
    if (c === undefined) throw new Error(`ADR-089 step 6: the clause ${id} is not in the filing`);
    if (!played(arms)) return notPlayed(id, arms);
    const values = sets.flatMap((s) =>
      LEAGUES.map((l) => {
        const r = read(s, l);
        return `${l} set ${String(s)} ${num(r.value)} (SE ${num(r.se)}${r.n === undefined ? "" : `, n ${String(r.n)}`})${r.beside === undefined ? "" : `; ${r.beside}`}`;
      }),
    );
    const flat = change(graded, "flat");
    const gen = change(graded, "gen");
    values.push(`flat moves ${dirWord(flat)} (${num(flat)}), gen ${dirWord(gen)} (${num(gen)}), each against the base`);
    const isGraded = c.kind === "graded" && oneSet === undefined;
    let verdict: Step6Verdict = "REPORTED";
    if (isGraded) {
      const p1 = passesClause(read(graded, "gen").value, c);
      const p2 = sets.includes(2) && graded !== 2 ? passesClause(read(2, "gen").value, c) : undefined;
      verdict = verdictWord(p1, p2);
      if (isFail(verdict)) misses.push(`${id}: gen set ${String(graded)} ${num(read(graded, "gen").value)} against ${bandTextOf(c)}${verdict === "FAIL (split)" ? " (set 2 passes)" : ""}`);
      if (verdict === "PASS (split)") splits.push(`${id}: gen set 2 ${num(read(2, "gen").value)} lies outside ${bandTextOf(c)}`);
      if (sign(flat) !== 0 && sign(gen) !== 0 && sign(flat) !== sign(gen)) {
        d6Misses.push(`${id}: flat ${dirWord(flat)} (${num(flat)}) against gen ${dirWord(gen)} (${num(gen)}), each against the base (D6; sent to the owner, the verdict stands)`);
        values.push("D6 miss: flat moves against gen (sent to the owner with the graded misses; gen's verdict stands)");
      }
    }
    clauses.push({ id, kind: c.kind, arms, filed: bandTextOf(c), values, verdict, ...(note === undefined ? {} : { note }) });
  };
  /** A clause printed only (reported, or structural "proof:report"). */
  const printed = (id: string, arms: readonly string[], lines: (s: SeedSet, l: League) => string, note?: string): void => {
    const c = clauseOf(id);
    if (c === undefined) throw new Error(`ADR-089 step 6: the clause ${id} is not in the filing`);
    if (!played(arms)) return notPlayed(id, arms);
    clauses.push({ id, kind: c.kind, arms, filed: bandTextOf(c), values: sets.flatMap((s) => LEAGUES.map((l) => `${l} set ${String(s)} ${lines(s, l)}`)), verdict: "REPORTED", ...(note === undefined ? {} : { note }) });
  };
  /**
   * A structural clause read from the proofs (its verdict the proofs'), over the arms of `arms` that
   * played; NOT PLAYED when none did (a proof over no arm passes nothing).
   */
  const structural = (id: string, arms: readonly string[], problems: readonly string[] | undefined, detail: string): void => {
    const c = clauseOf(id);
    if (c === undefined) throw new Error(`ADR-089 step 6: the clause ${id} is not in the filing`);
    const on = arms.filter((a) => records.has(a));
    if (problems === undefined || on.length === 0 || !played(on)) return notPlayed(id, arms);
    const verdict: Step6Verdict = problems.length === 0 ? "PASS" : "FAIL";
    if (verdict === "FAIL") faults.push(`${id}: ${String(problems.length)} failing, first: ${problems[0] ?? ""}`);
    clauses.push({ id, kind: c.kind, arms: on, filed: c.text, values: [detail, ...problems.slice(0, 5)], verdict });
  };
  const levelChange = (arm: string, base: string, f: (r: Step6Record, l: League) => Reading) => (s: SeedSet, l: League): number | null => minus(f(at(arm, s)!, l), f(at(base, s)!, l)).value;
  const onArm = (arm: string, f: (r: Step6Record, l: League) => Reading) => (s: SeedSet, l: League): Reading => f(at(arm, s)!, l);
  const between = (arm: string, base: string, f: (r: Step6Record, l: League) => Reading) => (s: SeedSet, l: League): Reading => minus(f(at(arm, s)!, l), f(at(base, s)!, l));
  const valueOf = (read: (s: SeedSet, l: League) => Reading) => (s: SeedSet, l: League): number | null => read(s, l).value;
  /** Every played record of `ids` on every league: `f`'s problems, prefixed. */
  const every = (ids: readonly string[], f: (r: Step6Record, l: League) => readonly string[]): string[] =>
    ids.flatMap((id) => sets.flatMap((s) => (at(id, s) === undefined ? [] : LEAGUES.flatMap((l) => f(at(id, s)!, l).map((p) => `${id} set ${String(s)} ${l}: ${p}`)))));

  // --- the fold-time proofs (R-3) ---------------------------------------------------------------------
  const proofProblems = new Map<S6ProofId, string[]>();
  for (const p of S6_PROOF_IDS) {
    const arms = armsOfProof(p);
    let checked = 0;
    const problems: string[] = [];
    for (const [id, bySet] of records) {
      for (const s of sets) {
        const r = bySet[s];
        if (r === undefined) continue;
        for (const l of LEAGUES) {
          checked += r.s6[l].checked[p] ?? 0;
          const f = r.s6[l].faults[p];
          if (f !== undefined && f.n > 0) problems.push(`${id} set ${String(s)} ${l}: ${String(f.n)} fault(s), first ${f.first.join("; ")}`);
        }
      }
    }
    if (p === "S-14") {
      // The contacts at the escape site, read three ways on every agreement arm: the s4 fold's, the step-4 contact fold's and the step-6 reading's.
      problems.push(...every(S6_AGREE_ARMS, (r, l) => {
        const a = r.s4[l].s4.s6?.atEscape ?? 0;
        const b = r.s4[l].m6.atEscape ?? 0;
        const c = r.s6[l].counts["contestsAtEscape"] ?? 0;
        return a === b && b === c ? [] : [`the contacts at the escape site: the s4 fold ${String(a)}, the contact fold ${String(b)}, the step-6 reading ${String(c)}`];
      }));
    }
    if (p === "S-18") problems.push(...every(armsOfProof("S-18"), (r, l) => (r.s5[l].extra.onRunDesperation > 0 ? [`${String(r.s5[l].extra.onRunDesperation)} desperation throw(s) after a clean break-out`] : [])));
    proofProblems.set(p, problems);
    const verdict = problems.length > 0 ? "FAIL" : checked > 0 ? "PASS" : "NOT READ";
    if (problems.length > 0) faults.push(`${p}: ${String(problems.length)} failing, first: ${problems[0] ?? ""}`);
    proofs.push({ id: p, what: S6_PROOFS[p].what, arms, verdict, detail: problems.length === 0 ? `${String(checked)} play(s) read` : problems.slice(0, 5).join("; ") });
  }
  // The fold checks: the rows' two pockets agree on every dropback; the in-pocket contact share equals the registered row.
  // Each reads the records of `arms` (shown as `shown`), and reads nothing when none played.
  const foldCheck = (id: string, what: string, problems: readonly string[], arms: readonly string[], shown: readonly string[] = arms): void => {
    const read = arms.length > 0;
    proofs.push({ id, what, arms: shown, verdict: !read ? "NOT READ" : problems.length === 0 ? "PASS" : "FAIL", detail: !read ? "no arm played" : problems.length === 0 ? "clean" : problems.slice(0, 5).join("; ") });
    if (problems.length > 0) faults.push(`${id}: ${String(problems.length)} failing, first: ${problems[0] ?? ""}`);
  };
  const allIds = [...records.keys()];
  foldCheck("rows:pocket", "the whole-play pocket and the rows' pocket agree on every dropback (pressure variants)", every(allIds, (r, l) => (r.s6[l].rows.wholePlayPocketDisagreements > 0 ? [`${String(r.s6[l].rows.wholePlayPocketDisagreements)} dropback(s) in two pockets`] : [])), allIds, ["every arm"]);
  foldCheck("rows:contacts", "the in-pocket sack share of contacts from the metrics fold's counts equals the registered sack_share_of_contacts_in_out", every(allIds, (r, l) => {
    const a = contactsInOutOf(r, l).inShare;
    const b = rowValueOf(r, "sack_share_of_contacts_in_out", l);
    return a === b || (a !== null && b !== null && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b))) ? [] : [`the fold's ${num(a, 6)} against the row's ${num(b, 6)}`];
  }), allIds, ["every arm"]);
  const crossArms = S6_CROSS_CHECK_ARMS.filter((a) => records.has(a));
  foldCheck(
    "rows:crossCheck",
    "the movement cross-check counts the deadline picks the step-6 reading reads, every one apart (cal-2's handoff)",
    every(crossArms, (r, l) => {
      const m = r.s6[l].crossCheck;
      if (m === null) return ["the cross-check did not run"];
      return m.deadlinePicks === m.readerDeadlinePicks ? [] : [`the cross-check counts ${String(m.deadlinePicks)} deadline pick(s) apart, the step-6 reading ${String(m.readerDeadlinePicks)}`];
    }),
    crossArms,
  );

  // --- the replays (S-7'), S-8' and the stream equalities ---------------------------------------------
  const refs = x.references ?? new Map<string, object>();
  for (const [arm, leftOut, exception] of [
    ["D1", [...S6_REPLAY_LEFT_OUT, "s5"], (l: League, s: SeedSet) => replayExceptionOf(guard.rule, "D1", l, s)],
    ["E9", S6_REPLAY_LEFT_OUT, (l: League, s: SeedSet) => (l === E9_REPLAY_EXCEPTION.league && s === E9_REPLAY_EXCEPTION.seedSet ? E9_REPLAY_EXCEPTION : undefined)],
  ] as const) {
    for (const s of sets) {
      const r = at(arm, s);
      const ref = refs.get(`${arm}.set${String(s)}`);
      if (r === undefined) continue;
      if (ref === undefined) {
        replays.push(`${arm} set ${String(s)}: no committed record to replay against`);
        faults.push(`S-7': ${arm} set ${String(s)} has no committed record to replay against`);
        continue;
      }
      for (const l of LEAGUES) {
        const differ = replayFieldsDiffering(r, ref, l, leftOut);
        const ex = exception(l, s);
        if (differ.length === 0) replays.push(`${arm} set ${String(s)} ${l}: equals its record`);
        else if (ex !== undefined) replays.push(`${arm} set ${String(s)} ${l}: re-played (${ex.record}: ${ex.how}); it moved in ${differ.join(", ")}; sack rate ${num(rowValueOf(r, "sack_rate", l))} against the record's ${num(rowValueOf(ref as Step6Record, "sack_rate", l))}`);
        else {
          replays.push(`${arm} set ${String(s)} ${l}: differs from its record in ${differ.join(", ")}`);
          faults.push(`S-7': ${arm} set ${String(s)} ${l} differs from its record in ${differ.join(", ")}`);
        }
      }
    }
  }
  for (const s of sets) {
    const r = at("F5", s);
    if (r === undefined) continue;
    const second = x.fresh?.[s];
    if (second === undefined) {
      waits.push(`F5 set ${String(s)}'s second fresh play (AM-12 freshBases) is not there: the run prints its command`);
      continue;
    }
    const p = freshF5Problems(r, second);
    replays.push(`F5 set ${String(s)}: two fresh plays in separate processes ${p.length === 0 ? "identical" : `differ: ${p.join("; ")}`}`);
    if (p.length > 0) faults.push(`S-7': F5 set ${String(s)}'s two fresh plays differ: ${p.join("; ")}`);
  }
  const overlay = (id: string): string | undefined => sets.map((s) => at(id, s)?.stamp.overlayDigest).find((d) => d !== undefined);
  if (records.has("F5")) {
    const ok = overlay("F5") !== undefined && overlay("F5") === x.s5aDigest;
    replays.push(`S-8': F5's overlay digest ${String(overlay("F5"))} ${ok ? "equals" : "is not"} POCKET_1_S5A_DIGEST ${String(x.s5aDigest)}`);
    if (!ok) faults.push(`S-8': F5's overlay digest ${String(overlay("F5"))} is not POCKET_1_S5A_DIGEST ${String(x.s5aDigest)}`);
  }
  if (records.has("H0")) {
    const ok = x.s6Digest !== undefined && overlay("H0") === x.s6Digest;
    replays.push(`S-8': H0's overlay digest ${String(overlay("H0"))} ${ok ? "equals" : "is not"} POCKET_1_S6_DIGEST ${String(x.s6Digest)}`);
    if (!ok) faults.push(`S-8': H0's overlay digest ${String(overlay("H0"))} is not POCKET_1_S6_DIGEST ${String(x.s6Digest)}`);
  }
  for (const [arm, base, what] of [["H12", "F5", "but for PLAY_START"], ["H6", "F5", "but for PLAY_START and direction"], ["HBN", "E9", "but for PLAY_START, direction and P10's flag"]] as const) {
    for (const s of sets) {
      const a = at(arm, s);
      const b = at(base, s);
      if (a === undefined || b === undefined) continue;
      for (const l of LEAGUES) {
        const da = a.s6[l].digests;
        const db = b.s6[l].digests;
        const ok = da !== null && db !== null && canonicalise(da) === canonicalise(db);
        replays.push(`stream equality ${arm} against ${base} (${what}) set ${String(s)} ${l}: ${ok ? "equal" : "differs"}`);
        if (!ok) faults.push(`stream equality: ${arm} against ${base} set ${String(s)} ${l} differs (${what})`);
      }
    }
  }

  // --- M5 (s6.mirror): H0M against H0 ----------------------------------------------------------------
  let mirrorProblems: string[] | undefined;
  const mirrorLines: string[] = [];
  if (played(["H0", "H0M"])) {
    mirrorProblems = [];
    for (const l of LEAGUES) {
      const runs: M5Run[] = sets.flatMap((s) => [
        { league: l, set: s, mirrored: false, games: at("H0", s)!.s6[l].m5 ?? [] },
        { league: l, set: s, mirrored: true, games: at("H0M", s)!.s6[l].m5 ?? [] },
      ]);
      const table = m5Compare(l, runs);
      const rows = table["rows"] as Readonly<Record<string, { readonly withinNoiseOnEverySet: boolean; readonly tolerance: number }>>;
      const z = m5RowZ(table);
      for (const row of Object.keys(M5_S6_ROWS)) {
        const cell = rows[row];
        const zs = (z[row] ?? []).map((v) => `set ${String(v.set)} difference ${num(v.difference, 4)} (bootstrap SE ${num(v.seDifference, 4)}, z ${num(v.z)})`).join("; ");
        mirrorLines.push(`${l} ${row}: ${cell?.withinNoiseOnEverySet === true ? "within noise on every set" : "outside noise"} (tolerance ${num(cell?.tolerance, 4)}); ${zs}`);
        if (cell?.withinNoiseOnEverySet !== true) mirrorProblems.push(`${l} ${row} is outside M5's noise`);
      }
    }
  }

  // --- the clauses ---------------------------------------------------------------------------------------
  const H0 = ["H0"];
  banded("s6.pressuredThrowaway", H0, onArm("H0", (r, l) => rated(rowValueOf(r, "throwaway_rate_pressured", l), r.report.sacks[l].pressuredDropbacks, ROW_RULE_LABEL)), levelChange("H0", "F5", (r, l) => rated(rowValueOf(r, "throwaway_rate_pressured", l), 1)), `per 100 pressured dropbacks, ${ROW_RULE_LABEL} (real 8.84%)`);
  banded("s6.falsifier.pressuredThrowaway", H0, onArm("H0", (r, l) => rated(rowValueOf(r, "throwaway_rate_pressured", l), r.report.sacks[l].pressuredDropbacks, ROW_RULE_LABEL)), levelChange("H0", "F5", (r, l) => rated(rowValueOf(r, "throwaway_rate_pressured", l), 1)), ROW_RULE_LABEL);
  banded("s6.throwaways", H0, onArm("H0", throwawayRateOf), levelChange("H0", "F5", throwawayRateOf), "per 100 dropbacks, from the metrics fold's counts");
  const rescoring = between("H12", "F5", sackRate);
  const rescoringNote = (): string =>
    `H12 minus F5, sacks per 100 dropbacks; beside, H0's own failed-scramble sacks per 100 dropbacks: ${sets.map((s) => (at("H0", s) === undefined ? `set ${String(s)} n/a` : `set ${String(s)} ${LEAGUES.map((l) => `${l} ${num(per100(at("H0", s)!.s6[l].pocket?.failedScrambleSacks ?? 0, at("H0", s)!.s6[l].pocket?.dropbacks ?? 0))}`).join(", ")}`)).join("; ")}`;
  if (played(["H12", "F5"])) {
    banded("s6.rescoring", ["H12", "F5"], rescoring, valueOf(rescoring), rescoringNote());
    banded("s6.falsifier.rescoring", ["H12", "F5"], rescoring, valueOf(rescoring), "passes by construction when S-14 holds, so a fail is a reader fault");
  } else {
    notPlayed("s6.rescoring", ["H12", "F5"]);
    notPlayed("s6.falsifier.rescoring", ["H12", "F5"]);
  }
  const failedShare = (r: Step6Record, l: League): Reading => {
    const row = rowsOf(r, l)["row:failed_scramble_share_of_sacks"] as { readonly pct: number | null; readonly sacks: number };
    return rated(row.pct, row.sacks, "SIS charts failed scrambles at 10% of sacks (REAL)");
  };
  banded("s6.failedScrambles", H0, onArm("H0", failedShare), levelChange("H0", "F5", failedShare), "share of sacks the rescoring scores");
  structural("s6.horizonSacks", ["H0", "H5", "HB0", "HB5", "HF2", "HF3", "HF4", "HF5"], proofProblems.get("S-12"), "S-12 on every arm with the part");
  structural("s6.oneEscape", ["H0", "H3", "HB0", "HB3", "HF1", "HF2", "HF3", "HF4", "HF5"], proofProblems.get("S-11"), "S-11 on every arm with the cap");
  if (played(["H13", "H14"])) {
    const p2s = between("H14", "H13", p2sOf);
    banded("s6.mobilityProbe.p2s", ["H14", "H13"], p2s, valueOf(p2s), `H14 minus H13, P2S points, ${ROW_RULE_LABEL}`);
    const scr = between("H14", "H13", scrambleRate);
    banded("s6.mobilityProbe.scrambles", ["H14", "H13"], scr, valueOf(scr), "H14 against H13, the registered scramble_rate");
  } else {
    notPlayed("s6.mobilityProbe.p2s", ["H14", "H13"]);
    notPlayed("s6.mobilityProbe.scrambles", ["H14", "H13"]);
  }
  if (played(["H15", "H0"])) {
    const pursuer = between("H15", "H0", failedEscapeOf);
    const speed = (s: SeedSet, l: League): string => {
      const r = at("H15", s)!.s6[l].ratings;
      const c = r?.byAttr["speed"];
      return c === undefined || c.men === 0 ? "n/a" : `${num(c.sumChange / c.men)} over ${String(c.men)} men`;
    };
    banded("s6.pursuerProbe", ["H15", "H0"], (s, l) => ({ ...pursuer(s, l), beside: `${failedEscapeOf(at("H15", s)!, l).beside ?? ""}; mean Speed change ${speed(s, l)} (MEASURED)` }), valueOf(pursuer), "H15 minus H0, failed escape rolls per 100 rolls");
  } else notPlayed("s6.pursuerProbe", ["H15", "H0"]);
  const behind = (ids: readonly string[]): string[] | undefined =>
    played(ids) ? ids.flatMap((id) => (sets.reduce((a, s) => a + LEAGUES.reduce((b, l) => b + (at(id, s)!.s6[l].counts["behindLine"] ?? 0), 0), 0) > 0 ? [] : [`${id}: no scramble run ends behind the line`])) : undefined;
  structural("s6.behindLine", ["H0", "H2", "HB0", "HB2"], behind(["H0", "H2", "HB0", "HB2"].filter((a) => records.has(a))), "some scramble run ends behind the line on each arm (and S-13 holds)");
  const cleanOuts = (r: Step6Record, l: League): Reading =>
    rated(rowValueOf(r, "clean_outs_rate", l), r.report.sacks[l].dropbacks - r.report.sacks[l].pressuredDropbacks, `REAL 10.63, and ${String(S6_REAL_BESIDE.cleanOutOfPocketNoPlayAction.per100)} without play action (${S6_REAL_BESIDE.cleanOutOfPocketNoPlayAction.label})`);
  banded("s6.cleanOutOfPocket", H0, onArm("H0", cleanOuts), levelChange("H0", "F5", cleanOuts), "per 100 clean dropbacks, a falsifier");
  banded("s6.contactsInOut", H0, onArm("H0", contactsInOutOf), levelChange("H0", "F5", contactsInOutOf), "in the pocket minus out of it, points, a falsifier");
  const sideAware = between("H7", "F5", sackRate);
  if (played(["H7", "F5"])) banded("s6.sideAwareCatch", ["H7", "F5"], sideAware, valueOf(sideAware), "H7 minus F5, sacks per 100 dropbacks, direction UP");
  else notPlayed("s6.sideAwareCatch", ["H7", "F5"]);
  const caughtContact = between("H8", "F5", sackRate);
  if (played(["H8", "F5"])) banded("s6.caughtAsContact", ["H8", "F5"], caughtContact, valueOf(caughtContact), "H8 minus F5, direction DOWN; the re-escapes after a shed are counted apart and will be few");
  else notPlayed("s6.caughtAsContact", ["H8", "F5"]);
  printed("s6.drillArms", ["H9", "H10", "H11", "F5"], (s, l) =>
    (["H9", "H10", "H11"] as const)
      .map((id) => {
        const r = at(id, s)!;
        const f = at("F5", s)!;
        return `${id} minus F5: sacks ${num(minus(sackRate(r, l), sackRate(f, l)).value)}, clean_drill_share ${num((rowValueOf(r, "clean_drill_share", l) ?? NaN) - (rowValueOf(f, "clean_drill_share", l) ?? NaN))}, completion on the run ${num((rowValueOf(r, "completion_per_aimed_by_throw_class.ON_THE_RUN", l) ?? NaN) - (rowValueOf(f, "completion_per_aimed_by_throw_class.ON_THE_RUN", l) ?? NaN))}, throwaways ${num(minus(throwawayRateOf(r, l), throwawayRateOf(f, l)).value)}`;
      })
      .join("; "), "printed, nothing predicted");
  printed("s6.drillShare", H0, (s, l) => `${num(rowValueOf(at("H0", s)!, "clean_drill_share", l))} against 3.0 (${S6_REAL_BESIDE.cleanDrillShare.label})`);
  const onRun = (s: SeedSet, l: League, pocket: "CLEAN" | "PRESSURED", what: "completion" | "int"): string => {
    const r = at("H0", s)!;
    const c = r.s6[l].onTheRun[pocket];
    const v = per100(what === "completion" ? c.completions : c.interceptions, c.aimed);
    const split = r.s5[l].splits[pocket === "CLEAN" ? "ON_THE_RUN/CLEAN_BREAKOUT" : "ON_THE_RUN/PRESSURED"];
    return `${num(v)} (SE ${num(shareSE(v, c.aimed))}, ${String(c.aimed)} aimed${pocket === "PRESSURED" ? `, ${ROW_RULE_LABEL}` : ""}); beside, the registered ON_THE_RUN row ${num(rowValueOf(r, `${what === "completion" ? "completion" : "int"}_per_aimed_by_throw_class.ON_THE_RUN`, l))} and step 5's ${pocket === "CLEAN" ? "CLEAN_BREAKOUT" : "PRESSURED"} split ${split === undefined ? "n/a" : `${String(split.interceptions)} INT of ${String(split.aimed)}`}`;
  };
  printed("s6.onTheRun.cleanCompletion", H0, (s, l) => onRun(s, l, "CLEAN", "completion"));
  printed("s6.onTheRun.cleanInt", H0, (s, l) => onRun(s, l, "CLEAN", "int"));
  printed("s6.onTheRun.pressuredCompletion", H0, (s, l) => onRun(s, l, "PRESSURED", "completion"));
  printed("s6.onTheRun.pressuredInt", H0, (s, l) => onRun(s, l, "PRESSURED", "int"));
  printed("s6.mobilityThirds", H0, (s, l) => {
    const t = rowsOf(at("H0", s)!, l)["mobilityThirds"] as Readonly<Record<string, { readonly cleanScrambles: { readonly registered: { readonly per100: number | null }; readonly boxScore: { readonly per100: number | null }; readonly cleanDropbacks: number }; readonly deadlineThrowaways: { readonly per100: number | null } }>>;
    const cells = Object.entries(t).map(([third, c]) => `${third}: clean scrambles ${num(c.cleanScrambles.registered.per100)} registered, ${num(c.cleanScrambles.boxScore.per100)} box score of ${String(c.cleanScrambles.cleanDropbacks)}; deadline throwaways ${num(c.deadlineThrowaways.per100)}`);
    return `${l === "flat" ? "one third (every flat quarterback has the same Mobility): " : ""}${cells.join("; ")} (REAL 2.44 to 5.18 by designed runs per dropback, a behavior and not a rating; fewer deadline throwaways with more Mobility is expected and reported)`;
  });
  for (const [id, cls] of [["s6.sackerShift.offBall", "offball"], ["s6.sackerShift.interior", "interior"]] as const) {
    printed(id, H0, (s, l) => {
      const v = sackerShiftOf(at("H0", s)!, l, cls);
      return `out of the pocket ${num(v.outPct)} minus in it ${num(v.inPct)}: ${num(v.value)} (${S6_REAL_BESIDE.sackerShift.label})`;
    });
  }
  structural("s6.readersAgree", S6_AGREE_ARMS, proofProblems.get("S-14"), "S-14 on every agreement arm, both leagues and sets; the play log's side is added after the lift (ui-layout)");
  structural("s6.oneEscapeClean", ["H0", "H3", "HB0", "HB3", "HF1", "HF2", "HF3", "HF4", "HF5"], proofProblems.get("S-11c"), "S-11c on every arm with the cap");
  structural("s6.mirror", ["H0", "H0M"], mirrorProblems, mirrorLines.join("; ") || "M5 on direction and catches, H0M against H0");
  // The guard pair H0 against F5 (guard.mix, guard.byClass), from the rows below.
  const guardRows = guardRowsOf(at, guard, sets, oneSet);
  for (const g of guardRows) if (g.role === "graded" && g.verdict === "BREACH") breaches.push(`${g.arm} against ${g.against}, ${g.league}: ${g.breaches.join(", ")}`);
  for (const [id, what] of [["guard.mix", "league-wide"], ["guard.byClass", "class"]] as const) {
    const c = clauseOf(id);
    if (c === undefined) throw new Error(`ADR-089 step 6: the guard clause ${id} is not in the filing`);
    const rows = guardRows.filter((g) => g.arm === "H0" && g.against === "F5");
    const hit = rows.filter((g) => g.breaches.some((b) => (what === "league-wide" ? b === "league-wide" : b !== "league-wide")));
    const verdict: Step6Verdict = rows.length === 0 || rows.every((g) => g.verdict === "NOT PLAYED") ? "NOT PLAYED" : oneSet !== undefined ? "REPORTED" : hit.length > 0 ? "FAIL" : "PASS";
    clauses.push({ id, kind: c.kind, arms: ["H0", "F5"], filed: guard.guardEntry, values: rows.map((g) => `${g.league} ${g.verdict} (Z ${num(g.Z)})`), verdict, note: `under ${guard.guardEntry}, the S5 class view` });
  }
  // The ledger.
  const ledger = ["s6.falsifier.pressuredThrowaway", "s6.falsifier.rescoring", "s6.cleanOutOfPocket", "s6.contactsInOut", "s6.readersAgree", "s6.oneEscapeClean", "s6.mirror"];
  const rowsOfLedger = ledger.map((id) => clauses.find((c) => c.id === id));
  const ledgerC = clauseOf("s6.falsifiers");
  if (ledgerC === undefined) throw new Error("ADR-089 step 6: the clause s6.falsifiers is not in the filing");
  const anyNotPlayed = rowsOfLedger.some((c) => c === undefined || c.verdict === "NOT PLAYED");
  const failed = rowsOfLedger.filter((c): c is Step6ClauseRow => c !== undefined && isFail(c.verdict));
  clauses.push({
    id: "s6.falsifiers",
    kind: ledgerC.kind,
    arms: ["H0"],
    filed: ledgerC.text,
    values: rowsOfLedger.map((c, i) => `${ledger[i]!}: ${c?.verdict ?? "NOT PLAYED"}`),
    verdict: anyNotPlayed ? "NOT PLAYED" : oneSet !== undefined ? "REPORTED" : failed.length > 0 ? "FAIL" : "PASS",
    note: "the ledger: a FAIL of any is step 6 falsified",
  });
  if (!anyNotPlayed && oneSet === undefined && failed.length > 0) misses.push(`s6.falsifiers: ${failed.map((c) => c.id).join(", ")}`);

  // --- the revisit, the funnel and the interaction (plan §8.3; never graded) ---------------------------
  const both = (r: Step6Record, l: League): readonly [number | null, number | null] => [cleanScrambleOf(r.s5[l]), boxScoreCleanScrambleOf(r, l)];
  const twoCounts = (id: string, s: SeedSet, l: League): string => {
    const r = at(id, s);
    if (r === undefined) return "not played";
    const [a, b] = both(r, l);
    return `${num(a)} (5a's construct) and ${num(b)} (box score)`;
  };
  const revisit: string[] = ["s5a.cleanScramble in both counts, per 100 clean dropbacks, against the filed 2 to 6 and REAL 3.92 (never graded): step 5a's construct (every SCRAMBLE run from a clean pocket), then the box-score count"];
  for (const id of S6_REVISIT_ARMS) {
    if (!records.has(id)) continue;
    revisit.push(`  ${id}: ${sets.map((s) => LEAGUES.map((l) => `${l} set ${String(s)} ${twoCounts(id, s, l)}`).join("; ")).join("; ")}`);
  }
  const deltaLine = (label: string, arm: string, base: string): string | undefined => {
    if (!played([arm, base])) return undefined;
    return `  ${label} (${arm} minus ${base}): ${sets.map((s) => LEAGUES.map((l) => {
      const [a1, b1] = both(at(arm, s)!, l);
      const [a0, b0] = both(at(base, s)!, l);
      return `${l} set ${String(s)} ${num(a1 === null || a0 === null ? null : a1 - a0)} and ${num(b1 === null || b0 === null ? null : b1 - b0)}`;
    }).join("; ")).join("; ")}`;
  };
  for (const line of [
    deltaLine("scoring alone", "HB12", "E9"),
    deltaLine("scoring alone", "H12", "F5"),
    deltaLine("play alone, the joint bench build", "HB0", "E9"),
    deltaLine("play alone, the joint league build", "H0", "F5"),
    ...STEP6_ARM_DEFS.filter((d) => d.id.startsWith("H") && !d.id.startsWith("HF") && d.step6.ratings === undefined && d.step6.mirror !== true && d.step6.otherStart !== true && !["H0", "HB0"].includes(d.id)).map((d) => deltaLine(`part by part, ${d.step6.parts.join(" + ")}`, d.id, d.base)),
  ]) {
    if (line !== undefined) revisit.push(line);
  }
  const funnel: string[] = ["the funnel, rung by rung on the clean bench (each rung's two counts, then its change from the rung before; sacks per 100 dropbacks beside)"];
  STEP6_FUNNEL.forEach((rung, i) => {
    if (!records.has(rung.id)) return;
    const before = i === 0 ? undefined : STEP6_FUNNEL[i - 1]!.id;
    funnel.push(`  ${rung.id}${rung.adds.length === 0 ? "" : ` (+ ${rung.adds.join(", ")})`}: ${sets.map((s) => LEAGUES.map((l) => `${l} set ${String(s)} ${twoCounts(rung.id, s, l)}, sacks ${num(at(rung.id, s) === undefined ? null : rowValueOf(at(rung.id, s)!, "sack_rate", l))}`).join("; ")).join("; ")}`);
    if (before !== undefined) {
      const d = deltaLine(`change from ${before}`, rung.id, before);
      if (d !== undefined) funnel.push(`  ${d.trim()}`);
    }
  });
  const interaction: string[] = ["the interaction: the joint change minus the sum of the part-alone changes (CHOSEN partitions, plan §5.3), in both counts and in sacks per 100 dropbacks"];
  for (const [where, p] of Object.entries(S6_INTERACTION)) {
    const ids = [p.joint, p.base, ...p.parts];
    if (!played(ids)) {
      interaction.push(`  ${where}: not played (${ids.filter((id) => !records.has(id)).join(", ")})`);
      continue;
    }
    for (const s of sets) {
      for (const l of LEAGUES) {
        const readOf = (id: string): readonly [number | null, number | null, number | null] => [...both(at(id, s)!, l), rowValueOf(at(id, s)!, "sack_rate", l)];
        const base = readOf(p.base);
        const baseAt = (k: number): number | null => base[k] ?? null;
        const joint = readOf(p.joint).map((v, k) => {
          const b = baseAt(k);
          return v === null || b === null ? null : v - b;
        });
        const sum = [0, 1, 2].map((k) => p.parts.reduce<number | null>((acc, id) => {
          const v = readOf(id)[k] ?? null;
          const b = baseAt(k);
          return acc === null || v === null || b === null ? null : acc + (v - b);
        }, 0));
        const inter = joint.map((v, k) => (v === null || sum[k] === null ? null : v - sum[k]!));
        interaction.push(`  ${where} (${p.joint} against ${p.base}; parts ${p.parts.join(", ")}) ${l} set ${String(s)}: joint ${joint.map((v) => num(v)).join(" / ")}, sum of parts ${sum.map((v) => num(v)).join(" / ")}, interaction ${inter.map((v) => num(v)).join(" / ")}`);
      }
    }
  }

  // --- the counts beside the clauses (plan §5.4) ---------------------------------------------------------
  for (const [id, bySet] of records) {
    for (const s of sets) {
      const r = bySet[s];
      if (r === undefined) continue;
      for (const l of LEAGUES) {
        const c = r.s6[l].counts;
        const pick = (prefix: string): string => Object.entries(c).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => `${k.slice(prefix.length)} ${String(v)}`).join(", ") || "none";
        const p = r.s6[l].pocket;
        const pv = rowsOf(r, l)["pressureVariants"] as { readonly pressuredOrSacked: { readonly sackPct: number | null }; readonly cleanSacks: { readonly per100: number | null }; readonly physicalPressured: { readonly pct: number | null } };
        const coverage = p === null ? "n/a" : `${num(per100(p.sacksCleanAtSack, p.sacks))}% of sacks against SIS's 13% (REAL), mean time to sack ${num(p.sackSecondsN === 0 ? null : p.sackSecondsSum / p.sackSecondsN)} s against PFF's 3.8 s (REAL)`;
        const exclusive = step6ArmDef(id)?.step6.ratings === undefined ? pick("exclusive.") : "not printed on a probe (every play can differ)";
        counts.push(
          `${id} set ${String(s)} ${l}: escape rolls by band ${pick("rolls.band.")}; by outcome ${pick("rolls.outcome.")}; step 5a's event reading ${pick("rolls.event.")}; repeats ${String(c["rolls.repeat"] ?? 0)}, after a shed ${String(c["rolls.afterShed"] ?? 0)} (escapes ${String(c["escapes.afterShed"] ?? 0)}); ` +
            `sacks by origin ${pick("sacks.")}; horizon sacks after an escape ${String(c["horizonSacks"] ?? 0)}; label-rule sacks ${String(c["labelRuleSacks"] ?? 0)}, catches naming nobody ${String(c["nobodyCatches"] ?? 0)}; throwaways ${pick("throwaways.")}; deadline picks ${pick("deadline.")}; drill ${pick("drill.")}; spent case ${pick("spent.")}; ` +
            `coverage sacks ${coverage}; pressure variants (${ROW_RULE_LABEL}): pressured-or-sacked sack share ${num(pv.pressuredOrSacked.sackPct)}, clean-dropback sacks ${num(pv.cleanSacks.per100)} per 100 (REAL 0.007), physical pressured share ${num(pv.physicalPressured.pct)} (REAL 30.17); exclusive affected plays ${exclusive}`,
        );
      }
    }
  }
  for (const id of crossArms) {
    for (const s of sets) {
      const r = at(id, s);
      if (r === undefined) continue;
      for (const l of LEAGUES) {
        const m = r.s6[l].crossCheck;
        if (m !== null) counts.push(`${id} set ${String(s)} ${l}: the movement cross-check counted ${String(m.deadlinePicks)} deadline pick(s) apart (the step-6 reading ${String(m.readerDeadlinePicks)}) and ${String(m.cleanPicks)} clean pick(s); its ${String(m.movementChecks)} other pocket_movement CHECK(s) read unread with no replay (${String(m.unread)}), since the M2 replay refuses a stream with step 3's blocks (MEASURED)`);
      }
    }
  }
  if (records.has("H8")) counts.push("H8: the re-escapes after a shed are counted apart (rolls after a shed); they will be few, since a shed puts the escape's man DELAYED and he holds in the pocket");
  if (guard.answers.spentChecklist === "CONTAINED_DOES_NOT_SPEND") counts.push("CONTAINED_DOES_NOT_SPEND: a contained roll does not spend the escape; if the spent-case counts show no difference from HOLD, the report says so here");
  if (records.has("HB0")) counts.push("HB0: on the clean bench contacts come only on RUSHED and PANICKED break-outs (the caught escape's contest), so its contact rows are few by construction");

  waits.push(
    "the cumulative (A0, A14) and accepted-state (A1, A11, from step 3) lines AM-12 carries are reported, never graded, and are not played by this harness",
    "S-14's play-log side is ui-layout's test, added after the lift on the same corpus",
    "S-16's spy count (the drill never writes contestPosition) is the engine's unit proof; the stream does not carry the position",
    "R-1 and R-2 (the golden digests and POCKET_1_S6_PINS) are played and filled only after the lift",
    "the second grading at the winning clock (AM-11 checkTwice) runs after the relocated 5b",
  );

  return {
    sections: {
      ...(oneSet === undefined ? {} : { oneSet }),
      amendments: { digest: guard.digest, guard: guard.guardEntry, readings: guard.readingsEntry, answers: guard.answers },
      clauses,
      proofs,
      guard: guardRows,
      replays,
      revisit,
      funnel,
      interaction,
      counts,
      waits,
      outcome: { faults, breaches, misses, d6Misses, splits },
    },
  };
}

/** The guard's side of a record on one league: the S5 class view's raw-release mix and its classes. */
function sideOf(r: Step6Record, l: League): GuardSide {
  return { all: guardAllOf(r.s5[l].guard), byClass: Object.fromEntries(Object.entries(r.s5[l].guard).map(([cls, cell]) => [cls, { aimedByBin: cell.aimedByBin, interceptions: cell.interceptions } satisfies IntMix])) };
}

/**
 * AM-12's guard: the graded pairs of its map (H0 against F5, F5 against D1), then every other step-6
 * arm against its base, unguarded, with its Z; equal dials skipped by rule; the splits printed.
 */
export function guardRowsOf(at: At, guard: Step6Guard, sets: readonly SeedSet[], oneSet?: SeedSet): Step6GuardRow[] {
  const out: Step6GuardRow[] = [];
  const pairs: { arm: string; base: string; role: Step6GuardRow["role"] }[] = [
    ...Object.entries(guard.bases).flatMap(([arm, base]) => (base === undefined ? [] : [{ arm, base: String(base), role: "graded" as const }])),
    ...STEP6_ARM_IDS.filter((id) => !(id in guard.bases)).map((id) => ({ arm: id as string, base: String(step6ArmDef(id)!.base), role: "unguarded" as const })),
  ];
  for (const { arm, base, role } of pairs) {
    for (const l of LEAGUES) {
      const bySet = (id: string): Partial<Record<SeedSet, GuardSide>> => Object.fromEntries(sets.flatMap((s) => (at(id, s) === undefined ? [] : [[s, sideOf(at(id, s)!, l)]])));
      if (!sets.some((s) => at(arm, s) !== undefined) || !sets.some((s) => at(base, s) !== undefined)) {
        if (role === "graded") out.push({ arm, against: base, league: l, role, verdict: "NOT PLAYED", Z: null, breaches: [], lines: [] });
        continue;
      }
      const dial = (id: string): string | undefined => sets.map((s) => at(id, s)?.stamp.overlayDigest).find((d) => d !== undefined);
      const a = dial(arm);
      if (guard.skipEqualDials && a !== undefined && skipsEqualDials({ skipEqualDials: true }, a, dial(base) ?? "") && step6ArmDef(arm)?.step6.ratings === undefined && step6ArmDef(arm)?.step6.mirror !== true) {
        out.push({ arm, against: base, league: l, role, verdict: "SKIPPED (equal dials, AM-12 skipEqualDials)", Z: null, breaches: [], lines: [] });
        continue;
      }
      const reading = am1ArmReading(bySet(base), bySet(arm), STEP5_GUARD_CLOCK, guard.lines);
      const verdict = role === "unguarded" ? "unguarded" : reading.graded && oneSet === undefined ? (reading.breaches.length > 0 ? "BREACH" : "PASS") : "REPORTED";
      const line = (name: string, rd: (typeof reading)["league"]): string =>
        `${name}: Z ${num(rd.Z)}, minimum breaching mean excess ${num(rd.eStar, 3)}, mean excess ${num(rd.meanExcess, 3)}; ${rd.sets.map((st) => `set ${String(st.seedSet)} rise ${num(st.rise, 3)} allowed ${num(st.allowed, 3)} SE ${num(st.se, 3)}`).join(", ")}`;
      const splits = Object.entries(guard.rule.reportedSplits ?? {}).map(([cls, names]) =>
        `${cls}: ${(names ?? []).map((n) => sets.map((s) => {
          const c = at(arm, s)?.s5[l].splits[`${cls}/${n}`];
          return c === undefined ? `${n} set ${String(s)} n/a` : `${n} set ${String(s)} ${String(c.interceptions)} INT of ${String(c.aimed)}`;
        }).join(", ")).join("; ")}`,
      );
      const notes = [
        ...(guard.freshBases.includes(base) ? [`${base} is played fresh, twice (AM-12 freshBases)`] : []),
        ...sets.flatMap((s) => {
          const ex = replayExceptionOf(guard.rule, base as ArmId, l, s);
          return ex === undefined ? [] : [`${base} on ${l} set ${String(s)} is the re-played ${base} (${ex.record})`];
        }),
        "the release clock: raw seconds on both sides (AM-8, restated by AM-12)",
      ];
      out.push({ arm, against: base, league: l, role, verdict, Z: reading.league.Z, breaches: role === "graded" ? reading.breaches : [], lines: [...notes, line("league-wide", reading.league), ...reading.classes.flatMap((c) => (c.reading === undefined ? [] : [line(c.cls, c.reading)])), ...splits] });
    }
  }
  return out;
}

// --- the report and the measures ------------------------------------------------------------------------

export interface Step6ReportHeader {
  readonly filedDigest: string;
  readonly fingerprint: string;
  readonly commits: readonly string[];
  readonly node: string;
  readonly caller: string;
  readonly pr33: string;
}

/** What failed first: the first build fault, else the first breach, else the first graded miss. */
export function firstFailureOf(o: Step6Outcome): string {
  return o.faults[0] ?? o.breaches[0] ?? o.misses[0] ?? "nothing";
}

export function renderStep6Report(grade: Step6Grade, header: Step6ReportHeader): string {
  const s = grade.sections;
  const o = s.outcome;
  const lines: string[] = [];
  lines.push(`# ADR-089 step 6: the outs${s.oneSet === undefined ? "" : `, seed set ${String(s.oneSet)} only (reported, never graded)`}`);
  lines.push("");
  lines.push(`pocket-1.s6 on the league and its parts on the clean bench, behind their switch, which nothing plays by default. Stamped beside every record: ${STEP6_CLOCK_LABEL}. Every pressure-keyed row reads the physical count: ${ROW_RULE_LABEL}.`);
  lines.push("");
  lines.push(`- filing: ${header.filedDigest}; amendments at step 6: ${s.amendments.digest} (the guard ${s.amendments.guard}; the readings ${s.amendments.readings})`);
  lines.push(`- the owner's answers (as ${s.amendments.readings} files them): spent checklist ${s.amendments.answers.spentChecklist}; scramble start ${s.amendments.answers.scrambleStart}; a caught catch's seen ${s.amendments.answers.seen}`);
  lines.push(`- fingerprint: ${header.fingerprint}; commit: ${header.commits.join(", ")}; node ${header.node}; caller ${header.caller}; ${STEP6_CLOCK_LABEL}`);
  lines.push(`- PR #33: ${header.pr33}`);
  lines.push(`- what failed first: ${firstFailureOf(o)}`);
  lines.push(`- outcome: ${String(o.faults.length)} build fault(s), ${String(o.breaches.length)} guard breach(es), ${String(o.misses.length)} graded miss(es), ${String(o.d6Misses.length)} D6 miss(es), ${String(o.splits.length)} split(s)`);
  lines.push("");
  const section = (title: string, body: readonly string[]): void => {
    lines.push(`## ${title}`, "", ...(body.length === 0 ? ["none"] : body), "");
  };
  section("The clauses", s.clauses.map((c) => `- **${c.id}** (${c.kind}; ${c.arms.join(", ")}; filed ${c.filed}): **${c.verdict}**${c.note === undefined ? "" : `. ${c.note}`}\n${c.values.map((v) => `  - ${v}`).join("\n")}`));
  section("The proofs and fold checks (R-3; a failure is a build fault)", s.proofs.map((p) => `- **${p.id}** ${p.verdict}: ${p.what} (arms ${p.arms.join(", ") || "none"}); ${p.detail}`));
  section("The replays, S-8' and the stream equalities", s.replays.map((r) => `- ${r}`));
  section("The guard (AM-12)", s.guard.map((g) => `- ${g.arm} against ${g.against}, ${g.league}: ${g.verdict}${g.Z === null ? "" : ` (Z ${num(g.Z)})`}${g.lines.length === 0 ? "" : `\n${g.lines.map((x) => `  - ${x}`).join("\n")}`}`));
  section("The 5a revisit (never graded)", s.revisit);
  section("The funnel", s.funnel);
  section("The interaction", s.interaction);
  section("Counts beside the clauses", s.counts.map((c) => `- ${c}`));
  section("Misses, D6 and splits (to the owner)", [...o.misses.map((m) => `- graded miss: ${m}`), ...o.d6Misses.map((m) => `- D6: ${m}`), ...o.splits.map((m) => `- split: ${m}`), ...o.breaches.map((b) => `- breach: ${b}`), ...o.faults.map((f) => `- build fault: ${f}`)]);
  section("What this harness does not read (waits)", s.waits.map((w) => `- ${w}`));
  return `${lines.join("\n")}\n`;
}

export function step6SummaryLines(s: Step6Sections): readonly string[] {
  const o = s.outcome;
  return [
    `ADR-089 step 6: ${String(o.faults.length)} build fault(s), ${String(o.breaches.length)} guard breach(es), ${s.oneSet === undefined ? `${String(o.misses.length)} graded miss(es)` : "nothing graded (one seed set)"}, ${String(o.d6Misses.length)} D6 miss(es); first: ${firstFailureOf(o)}`,
    ...[...o.faults, ...o.breaches, ...o.misses, ...o.d6Misses].map((line) => `  ${line}`),
  ];
}
