/**
 * THE POCKET STEP REPORT (ADR-089 step 0; plan §7.2 `report.ts`).
 *
 * A renderer: it reads plain, already-measured inputs and prints them, and computes nothing that is
 * a game fact (Iron Rule 3). S3's rows and benches and S2's registry rows are its inputs; it imports
 * neither (S3 never imports S4 and S4 never imports S3, C2-B3), and C3 wires it into `step0.ts` so
 * that `pocket -- --step 0` prints the full base report (plan §7.3 item 5).
 *
 * What it must print (ADR-089:927, :935, :987, :1166; plan §7.2):
 *  - **every row on both leagues**: a row carries a value (or null, printed "n/a") for flat and gen;
 *  - **`pressuredSacks` and the pressured count separately** (`metrics/collect.ts`, the
 *    `pressuredSacks` field; ADR-089:927), never only as their ratio;
 *  - **every hit and sack figure with its time to throw beside it** (ADR-089:935, :1166), because a
 *    stand-in hold about 0.35 to 0.4 s too long inflates sacks. A report that has a hit or sack
 *    figure and no time to throw for that league is REFUSED, not printed without it;
 *  - **the interception guard rows of §8** on both leagues (INT per attempt and per aimed throw,
 *    the forced-throw share, the INT-source mix, completion per attempt and per aimed throw, and the
 *    same by throw class, D28), and on every arm but the base the guard itself, league-wide (D9)
 *    and by class (D28), against the base arm of the same report;
 *  - **P2S against both 22.02% (PR #33, FTN only, held) and 15.46% (main), each named**, or 15.46
 *    only once PR #33 is declined (ADR-089:159, :987). P2S is reported, never graded (D5);
 *  - **exclusive affected-play counts per arm** (ADR-089:927), from step 1; step 0 has the base arm
 *    only, which affects no play by definition, and says so.
 */
import { THROW_CLASSES, type ThrowClass } from "./constructs.js";
import { intGuard, intGuardByClass, type ClassGuardVerdict, type GuardClock, type GuardVerdict, type IntMix } from "./bands.js";
import type { Am1ArmReading, Am1Reading, Am1SetReading, PairedReading, Reweighted, ReweightedOf } from "./guardAm1.js";

export const LEAGUES = ["flat", "gen"] as const;
export type League = (typeof LEAGUES)[number];
export type PerLeague<T> = Readonly<Record<League, T>>;

// --- P2S's two references (ADR-089:159, :987) ------------------------------------------------------

/** PR #33's state: OPEN (held, the owner's word of 2026-10-24 00:18Z) or DECLINED. */
export type Pr33State = "OPEN" | "DECLINED";

export interface P2sReference {
  readonly name: string;
  readonly value: number;
  readonly adrLine: number;
}

export const P2S_PR33: P2sReference = Object.freeze({ name: "PR #33, FTN only (held)", value: 22.02, adrLine: 159 });
export const P2S_MAIN: P2sReference = Object.freeze({ name: "main", value: 15.46, adrLine: 159 });

/** The references P2S is printed against: both, named, while PR #33 is open; main's only once it is declined. */
export function p2sReferences(pr33: Pr33State): readonly P2sReference[] {
  return pr33 === "OPEN" ? [P2S_PR33, P2S_MAIN] : [P2S_MAIN];
}

// --- the inputs ------------------------------------------------------------------------------------

export interface ReportRow {
  /** A metric id (`allMetrics()`) or a `constructs.ts` id. */
  readonly id: string;
  /** The sim's value on each league; null when the row has no value on that league (printed "n/a"). */
  readonly values: PerLeague<number | null>;
  /** The real comparator, when the row has one. */
  readonly real?: number | null;
  readonly unit?: string;
  /** Decimal places (default 2). */
  readonly dp?: number;
  /** Marks a hit or sack figure whose id the name rule below does not catch. */
  readonly hitOrSack?: boolean;
  readonly note?: string;
}

/** The sack counts EXT-4 prints separately (ADR-089:927). */
export interface SackCounts {
  readonly dropbacks: number;
  readonly sacks: number;
  /** Sacks on dropbacks whose worst POCKET_STATUS was not CLEAN (`collect.ts`'s `pressuredSacks`). */
  readonly pressuredSacks: number;
  /** Dropbacks whose worst POCKET_STATUS was not CLEAN. */
  readonly pressuredDropbacks: number;
}

/** One throw class's aimed throws by release bin, interceptions and completions. */
export interface ClassIntRows extends IntMix {
  readonly completions: number;
}

/** §8's interception rows on one league (ADR-089:1291, :1308). */
export interface IntGuardRows {
  readonly intPerAttempt: number;
  readonly intPerAimed: number;
  readonly forcedThrowShare: number;
  readonly completionPerAttempt: number;
  readonly completionPerAimed: number;
  /** `int_source_mix`, share by source. */
  readonly intSourceMix: Readonly<Record<string, number>>;
  /** The league's aimed throws by release bin and its interceptions (the guard's population). */
  readonly all: IntMix;
  /** The same by D28's throw class. */
  readonly byClass: Readonly<Partial<Record<ThrowClass, ClassIntRows>>>;
  /** Throws on the run, split clean and pressured, against the real out-of-pocket rates (ADR-089:1308). */
  readonly onTheRun?: { readonly clean: { readonly aimed: number; readonly interceptions: number }; readonly pressured: { readonly aimed: number; readonly interceptions: number } };
}

export interface ArmReport {
  /** "base", or the arm's name (`pocket-1.s<step>`, ADR-089:929). */
  readonly arm: string;
  readonly isBase: boolean;
  /** The arm's release clock: the decision tick (TICK) until THROW.releaseSeconds exists, then RAW (ADR-089:1291). */
  readonly clock: GuardClock;
  readonly rows: readonly ReportRow[];
  /** Mean time to throw, seconds, on each league: printed beside every hit and sack figure. */
  readonly timeToThrow: PerLeague<number>;
  readonly sacks: PerLeague<SackCounts>;
  /** Pressure to sack, percent (`pressure_to_sack` as `tier1.ts` has it). */
  readonly p2s: PerLeague<number>;
  readonly intGuard: PerLeague<IntGuardRows>;
  /** Exclusive affected-play counts against base (from step 1); the base arm has none. */
  readonly affectedPlays?: PerLeague<number>;
}

export interface StepReportInput {
  readonly step: string;
  readonly pr33: Pr33State;
  readonly arms: readonly ArmReport[];
  /**
   * Set from step 2 on, where a named amendment (AM-1, F.11) supersedes the filed guard: the filed
   * reading is still printed against the group's base, as context, and the lines say so instead of
   * "BREACH: the step stops". Step 1 never sets it, so its reports are as they were.
   */
  readonly filedGuardSuperseded?: string;
}

// --- the rules -------------------------------------------------------------------------------------

/** A hit or sack figure by its id: a word `sack`, `sacks`, `sacker` or `hit` in the snake-case id. */
const HIT_OR_SACK_WORD = /(^|_)(sack|sacks|sacker|hit|hits)(_|$)/;

export function isHitOrSackFigure(row: Pick<ReportRow, "id" | "hitOrSack">): boolean {
  return row.hitOrSack === true || HIT_OR_SACK_WORD.test(row.id);
}

/** The out-of-pocket real INT rates the throws on the run are printed against (ADR-089:1308, §2.4). */
export const ON_THE_RUN_REAL = Object.freeze({ clean: 2.11, pressured: 3.25, adrLine: 1308 });

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * What would make the report break one of its rules; empty when it may be printed. The rules are
 * checked on the plain inputs, which may come from JSON, so a missing field is caught here too.
 */
export function reportProblems(input: StepReportInput): readonly string[] {
  const problems: string[] = [];
  if (input.pr33 !== "OPEN" && input.pr33 !== "DECLINED") problems.push(`pr33 must be OPEN or DECLINED (got ${String(input.pr33)})`);
  if (input.arms.length === 0) problems.push("a step report has at least one arm");
  const bases = input.arms.filter((a) => a.isBase);
  if (bases.length !== 1) problems.push(`a step report has exactly one base arm (got ${String(bases.length)})`);
  const names = new Set<string>();
  for (const arm of input.arms) {
    const at = `arm ${arm.arm}`;
    if (names.has(arm.arm)) problems.push(`${at}: the arm's name appears twice`);
    names.add(arm.arm);
    for (const league of LEAGUES) {
      // Every arm prints its sack counts and P2S, which are sack figures, so every arm on every league needs one.
      if (!isNum(arm.timeToThrow?.[league])) {
        problems.push(`${at}, ${league}: ADR-089:935 every hit and sack figure carries its time to throw beside it, and this arm has no time to throw on ${league}`);
      }
      const s = arm.sacks?.[league];
      if (s === undefined || !isNum(s.sacks) || !isNum(s.pressuredSacks) || !isNum(s.pressuredDropbacks) || !isNum(s.dropbacks)) {
        problems.push(`${at}, ${league}: ADR-089:927 pressuredSacks and the pressured count are printed separately, and one is missing`);
      } else if (s.pressuredSacks > s.sacks || s.pressuredDropbacks > s.dropbacks) {
        problems.push(`${at}, ${league}: pressuredSacks <= sacks and pressured dropbacks <= dropbacks`);
      }
      if (!isNum(arm.p2s?.[league])) problems.push(`${at}, ${league}: P2S is reported in every arm (ADR-089:987)`);
      if (arm.intGuard?.[league] === undefined) problems.push(`${at}, ${league}: the interception guard is reported on both leagues (ADR-089:927)`);
      for (const row of arm.rows) {
        if (!(league in row.values)) problems.push(`${at}, row ${row.id}: every row on both leagues, and ${league} is missing`);
      }
    }
    if (!arm.isBase && !LEAGUES.every((league) => isNum(arm.affectedPlays?.[league]))) {
      problems.push(`${at}: exclusive affected-play counts are reported per arm, on both leagues (ADR-089:927)`);
    }
  }
  return problems;
}

// --- the renderer ----------------------------------------------------------------------------------

const fmt = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : v.toFixed(dp));
const pct = (n: number, d: number, dp = 2): string => (d > 0 ? ((100 * n) / d).toFixed(dp) : "n/a");

/** The time-to-throw tag printed beside a hit or sack figure. */
export const tttBeside = (seconds: number): string => `[time to throw ${seconds.toFixed(3)} s]`;

function rowLine(row: ReportRow, arm: ArmReport): string {
  const hs = isHitOrSackFigure(row);
  const unit = row.unit === undefined ? "" : ` ${row.unit}`;
  const parts = LEAGUES.map((league) => {
    const v = `${league} ${fmt(row.values[league], row.dp)}${unit}`;
    return hs ? `${v} ${tttBeside(arm.timeToThrow[league])}` : v;
  });
  const real = row.real === undefined ? "" : ` | real ${fmt(row.real, row.dp)}${unit}`;
  const note = row.note === undefined ? "" : ` (${row.note})`;
  return `  ${row.id}: ${parts.join(" | ")}${real}${note}`;
}

function guardLine(league: League, label: string, v: GuardVerdict, superseded?: string): string {
  const breach = superseded === undefined ? "BREACH: the step stops and comes back to the owner with a second seed set" : `above the allowance (the filed reading; ${superseded} grades)`;
  return `    ${league} ${label}: base ${v.baseRate.toFixed(2)} -> arm ${v.armRate.toFixed(2)}, rise ${v.rise.toFixed(2)} against an allowed ${v.allowed.toFixed(2)}: ${v.passes ? "PASSES" : breach}`;
}

function classGuardLine(league: League, cls: ThrowClass, v: ClassGuardVerdict, superseded?: string): string {
  if (v.status === "SCORED") return guardLine(league, cls, v, superseded);
  if (v.status === "REMOVED") return `    ${league} ${cls}: REMOVED: ${String(v.baseThrows)} base aimed throws carried ${String(v.baseInterceptions)} interceptions`;
  return `    ${league} ${cls}: NO BASE: ${String(v.armThrows)} arm aimed throws, ${String(v.armInterceptions)} interceptions (reported, not scored)`;
}

/**
 * The step report as lines. Throws, naming every problem, when `reportProblems` is not empty: a
 * report that would print a hit or sack figure without its time to throw is refused.
 */
export function renderStepReport(input: StepReportInput): readonly string[] {
  const problems = reportProblems(input);
  if (problems.length > 0) throw new Error(`the ADR-089 step report is refused:\n  - ${problems.join("\n  - ")}`);
  const base = input.arms.find((a) => a.isBase)!;
  const out: string[] = [];
  out.push(`ADR-089 step ${input.step}: the pocket report (${String(input.arms.length)} arm${input.arms.length === 1 ? "" : "s"}; both leagues; every hit and sack figure with its time to throw beside it)`);
  for (const arm of input.arms) {
    out.push("");
    out.push(`== ${arm.arm}${arm.isBase && arm.arm !== "base" ? " (the base arm)" : ""}: release clock ${arm.clock === "TICK" ? "the decision tick" : "THROW.releaseSeconds"} ==`);
    out.push(`  time to throw: ${LEAGUES.map((l) => `${l} ${arm.timeToThrow[l].toFixed(3)} s`).join(" | ")}`);

    out.push("  sacks and the pressured count (separately, ADR-089:927):");
    for (const league of LEAGUES) {
      const s = arm.sacks[league];
      out.push(
        `    ${league}: sacks ${String(s.sacks)} of ${String(s.dropbacks)} dropbacks (${pct(s.sacks, s.dropbacks)} per 100); ` +
          `pressuredSacks ${String(s.pressuredSacks)}; pressured dropbacks ${String(s.pressuredDropbacks)} (${pct(s.pressuredDropbacks, s.dropbacks)} per 100) ` +
          tttBeside(arm.timeToThrow[league]),
      );
    }

    const refs = p2sReferences(input.pr33);
    out.push(`  P2S (reported, never graded; against ${refs.map((r) => `${r.value.toFixed(2)}% ${r.name}`).join(" and ")}):`);
    for (const league of LEAGUES) {
      const v = arm.p2s[league];
      out.push(`    ${league}: ${v.toFixed(2)}% ${refs.map((r) => `| ${(v - r.value).toFixed(2)} against ${r.value.toFixed(2)}% (${r.name})`).join(" ")} ${tttBeside(arm.timeToThrow[league])}`);
    }

    out.push(`  rows (${String(arm.rows.length)}, both leagues):`);
    for (const row of arm.rows) out.push(rowLine(row, arm));

    out.push("  the interception guard rows (§8; per 100):");
    for (const league of LEAGUES) {
      const g = arm.intGuard[league];
      const mix = Object.entries(g.intSourceMix)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${k} ${v.toFixed(2)}`)
        .join(", ");
      out.push(
        `    ${league}: INT per attempt ${g.intPerAttempt.toFixed(2)}, per aimed throw ${g.intPerAimed.toFixed(2)}; forced-throw share ${g.forcedThrowShare.toFixed(2)}; ` +
          `completion per attempt ${g.completionPerAttempt.toFixed(2)}, per aimed throw ${g.completionPerAimed.toFixed(2)}; INT-source mix ${mix === "" ? "n/a" : mix}`,
      );
      for (const cls of THROW_CLASSES) {
        const c = g.byClass[cls];
        if (c === undefined) continue;
        const aimed = c.aimedByBin.reduce((a, b) => a + b, 0);
        out.push(`      ${league} ${cls}: ${String(aimed)} aimed, INT ${pct(c.interceptions, aimed)}, completion ${pct(c.completions, aimed)}`);
      }
      if (g.onTheRun !== undefined) {
        const r = g.onTheRun;
        out.push(
          `      ${league} on the run: clean INT ${pct(r.clean.interceptions, r.clean.aimed)} against a real ${ON_THE_RUN_REAL.clean.toFixed(2)}; ` +
            `pressured INT ${pct(r.pressured.interceptions, r.pressured.aimed)} against a real ${ON_THE_RUN_REAL.pressured.toFixed(2)}`,
        );
      }
    }
    const superseded = input.filedGuardSuperseded;
    if (arm.isBase) {
      out.push("    the guard: this is the base every other arm's rise is read against");
    } else {
      out.push(
        superseded === undefined
          ? `    the guard against ${base.arm} (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):`
          : `    the filed guard against ${base.arm} (D9's additive mix rule, then by class, D28), printed as context: at this step ${superseded} grades the guard, so a line above its allowance is the filed reading, not the verdict:`,
      );
      for (const league of LEAGUES) {
        out.push(guardLine(league, "league-wide", intGuard(base.intGuard[league].all, arm.intGuard[league].all, arm.clock), superseded));
        const byClass = intGuardByClass(base.intGuard[league].byClass, arm.intGuard[league].byClass, arm.clock);
        for (const cls of THROW_CLASSES) {
          const v = byClass.byClass[cls];
          if (v !== undefined) out.push(classGuardLine(league, cls, v, superseded));
        }
        out.push(`    ${league} by class: ${byClass.passes ? "PASSES" : superseded === undefined ? "BREACH: the step stops and comes back to the owner with a second seed set" : `above the allowance in a class (the filed reading; ${superseded} grades)`}`);
      }
    }

    out.push(
      arm.isBase
        ? "  exclusive affected plays: none (the base arm; counts start at step 1)"
        : `  exclusive affected plays against ${base.arm}: ${LEAGUES.map((l) => `${l} ${String(arm.affectedPlays![l])}`).join(" | ")}`,
    );
  }
  return out;
}

// --- step 1's sections (ADR-089 step 1; plan §7.2 item 10, §9.3 to §9.5) -------------------------------
//
// Step 1 reuses `renderStepReport` unchanged, once per base group (A0 with A1-A10; A14 with A11-A13;
// A0b with A15), since it requires exactly one base and reads the guard against it. These sections
// add what the step-0 report has no place for: the headline (§9.5), the clause table (graded clauses
// with pass or fail, reported ones with their basis or direction, structural ones with their proof),
// the guard verdicts, the stream folds' structural proofs, the interaction table (§9.3), the window's
// price, the pricing arms, and each arm's counts. Every figure arrives measured; nothing here is a
// game fact. Every hit and sack figure carries its time to throw beside it, and P2S prints against
// both references while PR #33 is open.

/** A structural proof's verdict: NOT APPLICABLE when no arm present carries it, NOT CHECKED when its arm did not play what it compares with (review M1, M5). */
export type Step1ProofVerdict = "PASS" | "FAIL" | "NOT APPLICABLE" | "NOT CHECKED";

export type Step1Verdict = "PASS" | "FAIL" | "REPORTED" | "NOT PLAYED" | "NOT APPLICABLE" | "NOT CHECKED";

/** The four figures the headline and the pricing rows print. */
export interface Step1Figures {
  readonly pressure: number | null;
  readonly hitOrSack: number | null;
  readonly sack: number | null;
  /** Mean release, seconds (`release_distribution`). */
  readonly release: number | null;
}

export interface Step1HeadlineRow {
  readonly arm: string;
  readonly what: string;
  readonly league: League;
  readonly figures: Step1Figures;
  readonly timeToThrow: number;
  readonly p2s: number | null;
  /** Per figure, the filed band and its verdict ("28 to 40.26: PASS"), the basis or direction of a reported clause, or "" when no clause names it. */
  readonly verdicts: Readonly<Record<keyof Step1Figures, string>>;
}

export interface Step1ClauseResult {
  readonly id: string;
  readonly kind: "graded" | "reported" | "structural";
  readonly arms: readonly string[];
  /** The filed band, basis or direction, as the filing states it. */
  readonly filed: string;
  /** The figures it reads, each labelled ("A1 flat 33.21 %"). */
  readonly values: readonly string[];
  readonly verdict: Step1Verdict;
  readonly note?: string;
}

/** A guard rise's binomial SE in points per 100 aimed throws, and z = (rise - allowed) / SE (null when SE is 0); context, never the verdict (review M2). */
export interface Step1GuardNoise {
  readonly se: number;
  readonly z: number | null;
}

export interface Step1GuardRow {
  readonly arm: string;
  readonly base: string;
  readonly league: League;
  readonly mix: GuardVerdict;
  readonly mixNoise: Step1GuardNoise;
  readonly byClass: {
    readonly passes: boolean;
    readonly breaches: readonly string[];
    /** Every scored class, with its rise, allowance, verdict and noise. */
    readonly scored: readonly ({ readonly cls: string; readonly rise: number; readonly allowed: number; readonly passes: boolean } & Step1GuardNoise)[];
  };
}

export interface Step1Structural {
  readonly id: string;
  readonly what: string;
  /** Only FAIL is a build fault (a structural failure). */
  readonly verdict: Step1ProofVerdict;
  readonly detail: string;
}

export interface Step1Interaction {
  /** "A5 - (A4 + A9 - A0)". */
  readonly formula: string;
  readonly league: League;
  /** Points of pressure, and sacks per 100 dropbacks; null when an arm is missing. */
  readonly pressure: number | null;
  readonly sack: number | null;
  /** The joint arm's time to throw, beside its sack figure. */
  readonly timeToThrow: number | null;
}

export interface Step1WindowPrice {
  readonly league: League;
  /** A1 minus A2. */
  readonly pressure: number | null;
  readonly sack: number | null;
  /** A1's time to throw, beside the sack figure. */
  readonly timeToThrow: number | null;
  /** The one filed B1 in points (gen seed set 1, deviation O1), the band's half-width. */
  readonly b1Filed: number;
  /** This league's own B1 in points from step 0's M1 (seed set 1), printed beside it. */
  readonly b1OwnLeague: number | null;
  /** M1 recomputed on A2's streams (K7), B1 in points. */
  readonly m1OnA2: number | null;
  readonly sackTolerance: number;
  /** A1's dropbacks whose only dirt follows a played window tick, in points with its Poisson SE (review M4); null without A1. */
  readonly windowOnlyDirt: Step1WindowOnlyDirt | null;
}

export interface Step1WindowOnlyDirt {
  readonly count: number;
  readonly dropbacks: number;
  readonly points: number;
  readonly se: number;
}

export interface Step1PricingRow {
  readonly arm: string;
  readonly label: string;
  /** What the row is read against ("A0", "A1", "Appendix B, gen Later"). */
  readonly against: string;
  readonly league: League;
  readonly figures: Step1Figures;
  readonly againstFigures: Step1Figures;
  readonly timeToThrow: number | null;
}

export interface Step1ArmCounts {
  readonly arm: string;
  readonly role: string;
  readonly league: League;
  readonly dropbacks: number;
  /** Exclusive affected plays against the arm's base (or A0 for A14), by mechanism; absent for A0 and A0b. */
  readonly affected?: { readonly against: string; readonly byMechanism: Readonly<Record<string, number>>; readonly windowOnlyDirt: number; readonly union: number; readonly dropbacks: number };
  /** The stream folds' counts, one line each. */
  readonly folds: readonly string[];
  readonly quickPressure: number | null;
  readonly floorCounter: number | null;
  readonly cleanWithLiveWonRep: { readonly ticks: number | null; readonly dropbacks: number | null; readonly pushTicks: number | null };
  /** Under S only: the pass-block win rows, printed with O30's label. */
  readonly passRushWin?: number | null;
  /** The miss rule's n (`pressured_share_2s_no_free_runner`), which classes nothing at step 1 (O31). */
  readonly missRuleN: number | null;
  readonly timeToThrow: number | null;
}

export interface Step1Outcome {
  readonly structuralFailures: readonly string[];
  readonly gradedFailures: readonly string[];
  readonly guardBreaches: readonly string[];
  /** Posted only when every structural clause passes and no guard breach is open (§9.4). */
  readonly mergeCard: boolean;
  readonly next: readonly string[];
}

export interface Step1Sections {
  readonly pr33: Pr33State;
  /** Set on a re-play of named arms on the other seed set (§9.4's guard-breach rule). */
  readonly replaySeedSet?: number;
  readonly headline: readonly Step1HeadlineRow[];
  readonly clauses: readonly Step1ClauseResult[];
  readonly guard: readonly Step1GuardRow[];
  readonly structural: readonly Step1Structural[];
  readonly interaction: readonly Step1Interaction[];
  /** pkA's flat interaction on pressure, REPORTED (ADR-089:1333). */
  readonly pkAInteraction: number;
  readonly windowPrice: readonly Step1WindowPrice[];
  readonly pricing: readonly Step1PricingRow[];
  readonly arms: readonly Step1ArmCounts[];
  readonly outcome: Step1Outcome;
}

/** A sack or hit-or-sack figure with its time to throw beside it (ADR-089:935). */
const withTtt = (v: string, ttt: number | null | undefined): string => (ttt === null || ttt === undefined || !Number.isFinite(ttt) ? `${v} [time to throw n/a]` : `${v} ${tttBeside(ttt)}`);
const signed = (v: number | null | undefined, dp = 2): string => (v === null || v === undefined || !Number.isFinite(v) ? "n/a" : `${v >= 0 ? "+" : ""}${v.toFixed(dp)}`);

function figuresLine(f: Step1Figures, ttt: number | null): string {
  return `pressure ${fmt(f.pressure)} | ${withTtt(`hit-or-sack ${fmt(f.hitOrSack)}`, ttt)} | ${withTtt(`sacks ${fmt(f.sack)}`, ttt)} | release ${fmt(f.release, 3)} s`;
}

/**
 * What each mechanism's affected count counts (`s1Stream.ts` foldAffectedGame), printed with it, since
 * the notions differ and the counts do not compare across arms (review M7).
 */
const MECHANISM_TOUCH: Readonly<Record<string, string>> = {
  S: "S (a beat played)",
  WINDOW: "WINDOW (a window tick played)",
  L: "L (a band changed before R)",
  HEELS: "HEELS (a beaten or gaining tick)",
  PAST_ONLY: "PAST_ONLY (a beaten or gaining tick)",
  HOLD: "HOLD (every dropback)",
  HORIZONS: "HORIZONS (every dropback)",
  LATE: "LATE (every dropback)",
  MUST_ACT: "MUST_ACT (a status-forcing tick with neither a threat within C nor one arrived)",
  HALF: "HALF (a status tick with the nearest live threat in (0.5, 1.0] s)",
  FOLLOWS: "FOLLOWS (a status tick with the nearest live threat in (1.0, 2.0] s)",
  COUNTER_LESS_SEEN: "COUNTER_LESS_SEEN (a live WON_REP threat at a status tick)",
};

/** Step 1's own sections, as Markdown lines. */
export function renderStep1Sections(s: Step1Sections): readonly string[] {
  const out: string[] = [];
  const refs = p2sReferences(s.pr33);
  const o = s.outcome;

  out.push("## What failed, first");
  out.push("");
  if (o.structuralFailures.length === 0 && o.gradedFailures.length === 0 && o.guardBreaches.length === 0) out.push("Nothing: every structural clause passes, every graded clause is inside its filed band, and no guard breach is open.");
  for (const f of o.structuralFailures) out.push(`- STRUCTURAL (a build fault, fixed before the PR, never put to a merge card): ${f}`);
  for (const f of o.guardBreaches) out.push(`- GUARD BREACH (the step stops; the arm and its base are re-played on the other seed set): ${f}`);
  for (const f of o.gradedFailures) out.push(`- GRADED, reported as filed (no band moves, nothing is retuned; the design question goes to the owner): ${f}`);
  out.push("");
  out.push(`Merge card: ${o.mergeCard ? "may be posted (every structural clause passes and no guard breach is open)" : "NOT to be posted until the items above are settled"}.`);
  for (const n of o.next) out.push(`- next: ${n}`);
  out.push("");

  out.push(`## The headline (§9.5)${s.replaySeedSet === undefined ? "" : ` (re-play on seed set ${String(s.replaySeedSet)})`}`);
  out.push("");
  out.push("Pass or fail is printed for graded clauses only; a reported clause shows its basis or direction. Every hit and sack figure has its time to throw beside it.");
  out.push("");
  out.push("| arm | league | pressure % | hit-or-sack % | sacks % | release s | time to throw s |");
  out.push("|---|---|---|---|---|---|---|");
  // A time to throw that was not measured prints n/a, never NaN (review M5).
  const ttt = (seconds: number): string => (Number.isFinite(seconds) ? tttBeside(seconds) : "[time to throw n/a]");
  for (const h of s.headline) {
    const cell = (v: string, verdict: string): string => (verdict === "" ? v : `${v} (${verdict})`);
    out.push(
      `| ${h.arm} | ${h.league} | ${cell(fmt(h.figures.pressure), h.verdicts.pressure)} | ${cell(fmt(h.figures.hitOrSack), h.verdicts.hitOrSack)} ${ttt(h.timeToThrow)} | ` +
        `${cell(fmt(h.figures.sack), h.verdicts.sack)} ${ttt(h.timeToThrow)} | ${cell(fmt(h.figures.release, 3), h.verdicts.release)} | ${fmt(h.timeToThrow, 3)} |`,
    );
  }
  out.push("");
  out.push(`P2S (reported, never graded; against ${refs.map((r) => `${r.value.toFixed(2)}% ${r.name}`).join(" and ")}):`);
  for (const h of s.headline) {
    const v = h.p2s;
    out.push(`- ${h.arm} ${h.league}: ${fmt(v)}% ${refs.map((r) => `| ${signed(v === null ? null : v - r.value)} against ${r.value.toFixed(2)}% (${r.name})`).join(" ")} ${ttt(h.timeToThrow)}`);
  }
  out.push("");

  out.push("## The clause table");
  out.push("");
  out.push("| clause | kind | arms | filed | measured | verdict |");
  out.push("|---|---|---|---|---|---|");
  for (const c of s.clauses) out.push(`| ${c.id} | ${c.kind} | ${c.arms.join(", ")} | ${c.filed} | ${c.values.join("; ")} | ${c.verdict}${c.note === undefined ? "" : ` (${c.note})`} |`);
  out.push("");

  out.push("## The interception guard (graded in every arm with a base, on the decision tick)");
  out.push("");
  out.push(
    "Each verdict is the filed rule, the rise at most the mix-predicted rise. Beside it, as context for the owner and never as the verdict: SE is binomial, the two arms read as independent (they share seeds; for an arm that changes the game a lot, as every block clock does, the games part ways and this SE is about the right size; for an arm that changes little it reads high), in points per 100 aimed throws, and z = (rise - allowed) / SE.",
  );
  out.push("");
  const noise = (n: Step1GuardNoise): string => `SE ${n.se.toFixed(2)}, z ${signed(n.z)}`;
  for (const g of s.guard) {
    out.push(
      `- ${g.arm} against ${g.base}, ${g.league}: league-wide rise ${g.mix.rise.toFixed(2)} against an allowed ${g.mix.allowed.toFixed(2)} (${noise(g.mixNoise)}): ${g.mix.passes ? "PASSES" : "BREACH"}; ` +
        `by class: ${g.byClass.passes ? "PASSES" : `BREACH (${g.byClass.breaches.join(", ")})`}`,
    );
    if (g.byClass.scored.length > 0) {
      out.push(
        `  - by class (rise / allowed / SE / z): ${g.byClass.scored.map((c) => `${c.cls} ${c.rise.toFixed(2)} / ${c.allowed.toFixed(2)} / ${c.se.toFixed(2)} / ${signed(c.z)} ${c.passes ? "PASSES" : "BREACH"}`).join("; ")}`,
      );
    }
  }
  out.push("");

  out.push("## The structural proofs inside the arms (§9.2)");
  out.push("");
  for (const p of s.structural) out.push(`- ${p.id} (${p.what}): ${p.verdict === "PASS" ? "PASSES" : p.verdict === "FAIL" ? "FAILS" : p.verdict}. ${p.detail}`);
  out.push("");

  out.push(
    `## The interaction (§9.3): joint minus (clock alone + beaten alone - base), beside pkA's ${s.pkAInteraction.toFixed(1)} points (REPORTED, ADR-089:1333; ` +
      "pkA is flat only, beaten plus horizon on its own clock: clock alone -20.4, beaten plus horizon alone -8.0, joint -53.7. Step 1's formulas take Heels or Past only alone, under shape L at R = 8 and 5, on both leagues, so the two are not like for like)",
  );
  out.push("");
  for (const i of s.interaction) out.push(`- ${i.formula}, ${i.league}: pressure ${signed(i.pressure)} points; ${withTtt(`sacks ${signed(i.sack)}`, i.timeToThrow)}`);
  out.push("");

  out.push("## The window's price: A1 minus A2 (the window cannot run alone)");
  out.push("");
  for (const w of s.windowPrice) {
    out.push(
      `- ${w.league}: pressure ${signed(w.pressure, 3)} points against the filed +-${w.b1Filed.toFixed(4)} (B1, gen seed set 1; this league's own B1 ${fmt(w.b1OwnLeague, 4)}); ` +
        `${withTtt(`sacks ${signed(w.sack, 3)} against +-${w.sackTolerance.toFixed(1)}`, w.timeToThrow)}; M1 recomputed on A2's streams: B1 ${fmt(w.m1OnA2, 4)} points (K7); ` +
        `window-only dirt ${w.windowOnlyDirt === null ? "n/a" : `${w.windowOnlyDirt.points.toFixed(3)} points (${String(w.windowOnlyDirt.count)} of ${String(w.windowOnlyDirt.dropbacks)}, Poisson SE ${w.windowOnlyDirt.se.toFixed(3)})`}`,
    );
  }
  out.push("");

  out.push("## The pricing arms (each a pricing arm, never a design value) and the context arm");
  out.push("");
  for (const p of s.pricing) {
    out.push(`- ${p.arm} (${p.label}) against ${p.against}, ${p.league}: ${figuresLine(p.figures, p.timeToThrow)}; against ${figuresLine(p.againstFigures, null).replace(/ \[time to throw n\/a\]/g, "")}`);
  }
  out.push("");

  out.push("## Each arm: exclusive affected plays, the stream folds' counts and the rows printed apart");
  out.push("");
  for (const a of s.arms) {
    out.push(`### ${a.arm}, ${a.league} (${a.role})`);
    out.push("");
    out.push(`- dropbacks ${String(a.dropbacks)}; time to throw ${fmt(a.timeToThrow, 3)} s`);
    if (a.affected === undefined) out.push("- exclusive affected plays: none (no base)");
    else {
      const by = Object.entries(a.affected.byMechanism).map(([k, v]) => `${MECHANISM_TOUCH[k] ?? k} ${String(v)}`).join(", ");
      const d = a.affected.dropbacks;
      const dirt = d > 0 ? ` (${((100 * a.affected.windowOnlyDirt) / d).toFixed(3)} points, Poisson SE ${((100 * Math.sqrt(a.affected.windowOnlyDirt)) / d).toFixed(3)})` : "";
      out.push(`- exclusive affected plays against ${a.affected.against}: ${String(a.affected.union)} (${by === "" ? "no exclusive mechanism" : by}; window-only dirt ${String(a.affected.windowOnlyDirt)}${dirt})`);
    }
    out.push(`- quick-pressure share ${fmt(a.quickPressure)} %; band floor plus counter ${fmt(a.floorCounter)} % of first dirt`);
    out.push(`- clean_with_live_won_rep: ticks ${fmt(a.cleanWithLiveWonRep.ticks, 3)} %, dropbacks ${fmt(a.cleanWithLiveWonRep.dropbacks, 3)} %, PUSH ticks apart ${fmt(a.cleanWithLiveWonRep.pushTicks, 3)} %`);
    if (a.passRushWin !== undefined) out.push(`- pass-rush win rate (pbwr_sim_only, mean over rushers) ${fmt(a.passRushWin)} %: a pre-beat tick is a capped margin, not a rep outcome (O30)`);
    out.push(`- the miss rule's n (pressured_share_2s_no_free_runner) ${fmt(a.missRuleN)} %: the miss rule classes nothing at step 1 (O31)`);
    for (const f of a.folds) out.push(`- ${f}`);
    out.push("");
  }
  return out;
}

// --- step 2's sections (ADR-089 step 2; step-2 plan §4.2, §4.3, §4.7; AM-1 §4.4 to §4.6, F.11) -------------
//
// Step 2 reuses `renderStepReport` once per AM-1 base group and seed set (A1 with B1, B2, B3, B4 and
// B7; A5 with B5; A11 with B6; A0 and A14 alone), with `filedGuardSuperseded` set, since AM-1 grades
// the guard from step 2 on. These sections add the step's own: what failed, the headline (B3 against
// A1), the clause table, the three-arm decomposition, the world and the rule, the information arms,
// the pricing arm, M2, the guard under AM-1 (per-set z, pooled Z, e*, the filed reading and the
// paired SE beside, the cumulative line, DESPERATION's halves and the checkdown triggers), the
// structural proofs and fold checks, and each arm's counts. Every figure arrives measured; nothing
// here is a game fact. Every hit and sack figure carries its time to throw beside it.

/** A step-2 clause's verdict. NOT JUDGED: a fold fault stands under it (plan §4.7, kind 2). */
export type Step2Verdict = "PASS" | "FAIL" | "REPORTED" | "NOT PLAYED" | "NOT JUDGED" | "NOT CHECKED" | "NOT APPLICABLE";

export interface Step2ClauseResult {
  readonly id: string;
  readonly kind: "graded" | "reported" | "structural";
  readonly arms: readonly string[];
  readonly filed: string;
  readonly values: readonly string[];
  readonly verdict: Step2Verdict;
  readonly note?: string;
}

/** One arm against another on one league and seed set, the four figures each, time to throw beside. */
export interface Step2Comparison {
  readonly arm: string;
  readonly against: string;
  readonly league: League;
  readonly seedSet: number;
  readonly figures: Step1Figures;
  readonly againstFigures: Step1Figures;
  readonly timeToThrow: number | null;
  readonly againstTimeToThrow: number | null;
  /** "reported, direction only" on an arm with no band (O47), or another label. */
  readonly label?: string;
}

/** A contrast of differences ("B3 - (B1 + B2 - A1)", "the world"), in points and seconds. */
export interface Step2Contrast {
  readonly formula: string;
  readonly league: League;
  readonly seedSet: number;
  readonly figures: Step1Figures;
  /** The first arm's time to throw, beside the hit and sack figures. */
  readonly timeToThrow: number | null;
  readonly note?: string;
}

/** A structural proof (a build fault when it fails) or a fold check (a fold fault, plan §4.7 kind 2). */
export interface Step2Proof {
  readonly id: string;
  readonly what: string;
  readonly kind: "structural" | "fold";
  readonly verdict: Step1ProofVerdict | "NOT JUDGED";
  readonly detail: string;
}

/** M2 STREAM on one arm, league and seed sets (`m2StreamSummary`, as printed). */
export interface Step2M2Row {
  readonly arm: string;
  readonly league: League;
  /** "1", "2", or "1 and 2" (the two folds merged). */
  readonly sets: string;
  readonly rule: string | null;
  readonly dropbacks: number;
  readonly forced: number;
  readonly counterFar: number;
  readonly sharePct: number | null;
  readonly intervalPct: { readonly lo: number; readonly hi: number } | null;
  readonly zeroByTheRule: boolean | null;
  readonly unforcedSharePct: number | null;
  readonly byAlignment: Readonly<Record<string, number>>;
  readonly byPosition: Readonly<Record<string, number>>;
  readonly identity: { readonly statusChecks: number; readonly statusMismatches: number; readonly threatChecks: number; readonly threatMismatches: number };
  readonly jitter: { readonly checks: number; readonly mismatches: number; readonly skippedDieless: number };
  readonly tm399: { readonly edge: number; readonly far: number; readonly farCB: number; readonly farSharePct: number | null };
}

/** The filed first-order M2 (step 0's engine-free replay, the filing's `M.M2`), reprinted unchanged. */
export interface Step2M2Filed {
  readonly league: League;
  readonly arm: string;
  readonly forced: number;
  readonly counterFar: number;
  readonly sharePct: number | null;
  /** Poisson 95% interval on the count, as a percent of forced decisions. */
  readonly intervalPct: { readonly lo: number; readonly hi: number } | null;
}

export interface Step2M2Section {
  /** `s2.m2`'s reported range, percent. */
  readonly band: { readonly lo: number; readonly hi: number };
  readonly filed: readonly Step2M2Filed[];
  readonly rows: readonly Step2M2Row[];
  readonly notes: readonly string[];
}

/** One DESPERATION half of one guard row (reported, never graded; F.9 item 4, O50). */
export interface Step2GuardHalf {
  readonly half: string;
  readonly bySet: readonly { readonly seedSet: number; readonly baseAimed: number; readonly baseInterceptions: number; readonly armAimed: number; readonly armInterceptions: number }[];
  /** The half's own AM-1-style reading, where both sides threw in it on some set. */
  readonly reading: Am1Reading | null;
  readonly paired: PairedReading;
}

/** The checkdown looks by trigger on one side and set (the must-act fold's CHECKDOWN_LOOK row). */
export interface Step2Checkdown {
  readonly seedSet: number;
  readonly rule: string | null;
  readonly acts: number;
  readonly threatPart: number;
  readonly statusPart: number;
  readonly countPart: number;
  readonly ruleOnly: number;
  readonly countOnly: number;
  readonly both: number;
  readonly neither: number;
}

/** AM-1's readings of one arm against its base on one league, with what is printed beside them. */
export interface Step2GuardRow {
  readonly arm: string;
  readonly base: string;
  readonly league: League;
  /** The cumulative line (B3 against A0, B6 against A14): reported, never graded before step 10. */
  readonly cumulative: boolean;
  readonly reading: Am1ArmReading;
  readonly pairedLeague: PairedReading;
  readonly pairedClasses: Readonly<Record<string, PairedReading>>;
  readonly desperation: readonly Step2GuardHalf[];
  readonly reweighted: readonly Reweighted[];
  readonly checkdown: { readonly base: readonly Step2Checkdown[]; readonly arm: readonly Step2Checkdown[] };
  /** CHECKDOWN's aimed throws by trigger (THREAT, COUNT, STATUS, NONE; `s2Stream.ts`'s `checkdownSplit`) and its rise re-weighted to the base's (AM-1 §4.5). */
  readonly checkdownReweighted: readonly ReweightedOf<string>[];
}

/** One arm's counts on one league and seed set. */
export interface Step2ArmSetCounts {
  readonly seedSet: number;
  readonly dropbacks: number;
  readonly timeToThrow: number | null;
  readonly affected?: { readonly against: string; readonly byMechanism: Readonly<Record<string, number>>; readonly union: number; readonly dropbacks: number };
  readonly mustActShare: Readonly<Record<string, number | null>>;
  /** Forced acts by kind: acts (threat part / status part / count part). */
  readonly forcedActs: Readonly<Record<string, { readonly acts: number; readonly threatPart: number; readonly statusPart: number; readonly countPart: number }>>;
  readonly arrival: { readonly cases: number; readonly throws: number; readonly sacks: number; readonly failures: number };
  readonly warning: { readonly statusTicks: number; readonly warningTicks: number; readonly cleanWithWarning: number; readonly failures: number };
  /** `s2Stream.ts`'s `MustActSelfCheck`: the off-rule half on a step-1-rule arm (null under PER_RUSHER), the witnesses on every arm. */
  readonly selfCheck: {
    readonly offRule: { readonly acts: number; readonly counted: number; readonly exceptions: number } | null;
    readonly witness: { readonly holds: number; readonly countHolds: number; readonly clockExpired: number; readonly exceptions: number };
    readonly passed: boolean;
  };
  readonly quickPressure: number | null;
  readonly floorCounter: number | null;
  readonly cleanWithLiveWonRep: { readonly ticks: number | null; readonly dropbacks: number | null; readonly pushTicks: number | null };
  readonly passRushWin?: number | null;
  readonly missRuleN: number | null;
  readonly s1Problems: number;
  readonly s2Problems: readonly string[];
}

export interface Step2ArmCounts {
  readonly arm: string;
  readonly role: string;
  readonly league: League;
  readonly label?: string;
  readonly bySet: readonly Step2ArmSetCounts[];
}

export interface Step2Outcome {
  readonly structuralFailures: readonly string[];
  /** A self-check or identity rebuild that fails: the clause is not judged and the step cannot close (plan §4.7 kind 2). */
  readonly foldFaults: readonly string[];
  readonly gradedFailures: readonly string[];
  readonly guardBreaches: readonly string[];
  /** Posted only when no structural failure, fold fault or AM-1 breach stands, on a full two-set run. */
  readonly mergeCard: boolean;
  readonly next: readonly string[];
}

export interface Step2Sections {
  readonly pr33: Pr33State;
  /** Set on a one-set run: reported, never graded (plan §4.6). */
  readonly oneSet?: number;
  readonly amendments: { readonly digest: string; readonly entry: string; readonly record: string; readonly zLeague: number; readonly zClass: number; readonly zSetSE0: number };
  readonly headline: readonly Step2Comparison[];
  readonly clauses: readonly Step2ClauseResult[];
  readonly decomposition: readonly Step2Comparison[];
  readonly interaction: readonly Step2Contrast[];
  readonly worldAndRule: readonly Step2Contrast[];
  readonly information: readonly Step2Comparison[];
  readonly pricing: readonly Step2Comparison[];
  readonly m2: Step2M2Section;
  readonly guard: readonly Step2GuardRow[];
  readonly proofs: readonly Step2Proof[];
  readonly arms: readonly Step2ArmCounts[];
  readonly outcome: Step2Outcome;
}

const diffOf = (a: number | null, b: number | null): number | null => (a === null || b === null ? null : a - b);
const tttPair = (a: number | null, b: number | null): string => `[time to throw ${fmt(a, 3)} s against ${fmt(b, 3)} s]`;

function comparisonLine(c: Step2Comparison): string {
  const f = c.figures;
  const g = c.againstFigures;
  const part = (name: string, a: number | null, b: number | null, dp = 2): string => `${name} ${fmt(a, dp)} - ${fmt(b, dp)} = ${signed(diffOf(a, b), dp)}`;
  const t = tttPair(c.timeToThrow, c.againstTimeToThrow);
  return (
    `- ${c.arm} against ${c.against}, ${c.league}, set ${String(c.seedSet)}${c.label === undefined ? "" : ` (${c.label})`}: ` +
    `${part("pressure", f.pressure, g.pressure)} | ${part("hit-or-sack", f.hitOrSack, g.hitOrSack)} ${t} | ${part("sacks", f.sack, g.sack)} ${t} | ${part("release", f.release, g.release, 3)} s`
  );
}

function contrastLine(c: Step2Contrast): string {
  const f = c.figures;
  return (
    `- ${c.formula}, ${c.league}, set ${String(c.seedSet)}: pressure ${signed(f.pressure)} points | ${withTtt(`hit-or-sack ${signed(f.hitOrSack)}`, c.timeToThrow)} | ` +
    `${withTtt(`sacks ${signed(f.sack)}`, c.timeToThrow)} | release ${signed(f.release, 3)} s${c.note === undefined ? "" : ` (${c.note})`}`
  );
}

const setReadingText = (s: Am1SetReading): string =>
  `set ${String(s.seedSet)} ${s.baseRate.toFixed(2)} -> ${s.armRate.toFixed(2)}, rise ${signed(s.rise)} / allowed ${signed(s.allowed)} / SE ${s.se.toFixed(2)} / z ${signed(s.z)}${s.seZero ? " (SE 0, scored 0)" : ""} (filed: ${s.filedPasses ? "within" : "above"} the allowance; ${String(s.armAimed)} aimed)`;

const readingText = (r: Am1Reading): string =>
  `${r.sets.map(setReadingText).join("; ")}; Z ${signed(r.Z)} against ${r.line.toFixed(1)}, e* ${fmt(r.eStar)}, mean excess ${signed(r.meanExcess)}: ${r.verdict}${r.graded ? "" : " (not graded: one seed set)"}`;

const pairedText = (p: PairedReading): string =>
  p.sets.length === 0 ? "paired: n/a" : `paired SE ${p.sets.map((x) => `${x.se.toFixed(2)} (set ${String(x.seedSet)}, ${String(x.games)} games, z ${signed(x.z)})`).join(", ")}; paired Z ${signed(p.Z)} (reported, never graded)`;

/**
 * The looks by trigger. The threat, status and count parts are separate counts and overlap (on
 * step 1's clock a threat inside C floors the status, so the first two often hold together), so
 * they are printed apart and never summed; the rule-part trigger count is `ruleOnly + both`
 * (review MEAS-M-2).
 */
function checkdownText(cs: readonly Step2Checkdown[]): string {
  return (
    cs
      .map(
        (c) =>
          `set ${String(c.seedSet)} ${String(c.acts)} looks (threat part ${String(c.threatPart)}, status part ${String(c.statusPart)}, count part ${String(c.countPart)}; ` +
          `rule part ${String(c.ruleOnly + c.both)} under ${c.rule ?? "n/a"}: rule only ${String(c.ruleOnly)}, count only ${String(c.countOnly)}, both ${String(c.both)}, neither ${String(c.neither)})`,
      )
      .join("; ") || "none"
  );
}

const shareText = (o: Readonly<Record<string, number | null>>): string => Object.entries(o).map(([k, v]) => `${k.toLowerCase()} ${fmt(v)}%`).join(" / ");

const m2Text = (r: Step2M2Row, band: { lo: number; hi: number }): string => {
  const range = r.sharePct === null ? "no forced decision" : r.sharePct > band.hi ? "outside the reported range, information" : "inside the reported range";
  const zero = r.zeroByTheRule === null ? "" : `; 0 by the rule (PER_RUSHER, C within 0.5 s): ${r.zeroByTheRule ? "holds" : "DOES NOT HOLD"}`;
  const entries = (o: Readonly<Record<string, number>>): string => Object.entries(o).map(([k, v]) => `${k} ${String(v)}`).join(", ") || "none";
  return (
    `- M2 STREAM on ${r.arm}'s streams, ${r.league}, set${r.sets.includes("and") ? "s" : ""} ${r.sets} (rule ${r.rule ?? "n/a"}): ${String(r.counterFar)} of ${String(r.forced)} forced decisions (${fmt(r.sharePct)}%), ` +
    `Poisson 95% interval ${r.intervalPct === null ? "n/a" : `${r.intervalPct.lo.toFixed(4)}% to ${r.intervalPct.hi.toFixed(4)}%`}: ${range}${zero}; by alignment ${entries(r.byAlignment)}; by position ${entries(r.byPosition)}; ` +
    `unforced (never forced before the release, not censored) ${fmt(r.unforcedSharePct)}% of ${String(r.dropbacks)} dropbacks; identity ${String(r.identity.statusMismatches)} of ${String(r.identity.statusChecks)} rebuilt statuses and ` +
    `${String(r.identity.threatMismatches)} of ${String(r.identity.threatChecks)} won-rep threats differ; jitter ${String(r.jitter.mismatches)} of ${String(r.jitter.checks)} rolled ticks differ, ${String(r.jitter.skippedDieless)} dieless ticks skipped ` +
    `(TODAY's jitter check is vacuous on shape S); b.tm-399 ${String(r.tm399.far)} of ${String(r.tm399.edge)} edge won-rep threats travel 2.5 s or more (${fmt(r.tm399.farSharePct)}%), ${String(r.tm399.farCB)} cornerbacks`
  );
};

/** M2's section alone (`--m2` prints it and stops; the report prints it in place). */
export function renderStep2M2(m: Step2M2Section): readonly string[] {
  const out: string[] = [];
  out.push(`## M2: the counter-forced share of forced decisions (s2.m2, reported, ${String(m.band.lo)} to ${String(m.band.hi)} percent; nothing graded)`);
  out.push("");
  for (const f of m.filed) {
    out.push(
      `- filed first-order M2 (step 0's engine-free replay, the filing's M.M2, unchanged), ${f.league} ${f.arm}: ${String(f.counterFar)} of ${String(f.forced)} forced (${fmt(f.sharePct)}%), ` +
        `Poisson 95% interval ${f.intervalPct === null ? "n/a" : `${f.intervalPct.lo.toFixed(4)}% to ${f.intervalPct.hi.toFixed(4)}%`}`,
    );
  }
  for (const r of m.rows) out.push(m2Text(r, m.band));
  for (const n of m.notes) out.push(`- ${n}`);
  out.push("");
  return out;
}

/** Step 2's own sections, as Markdown lines. */
export function renderStep2Sections(s: Step2Sections): readonly string[] {
  const out: string[] = [];
  const o = s.outcome;
  out.push("## What failed, first");
  out.push("");
  if (s.oneSet !== undefined) out.push(`A one-set run (seed set ${String(s.oneSet)}): every reading here is reported, never graded, and the step cannot close on it (plan §4.6).`);
  if (o.structuralFailures.length === 0 && o.foldFaults.length === 0 && o.gradedFailures.length === 0 && o.guardBreaches.length === 0) {
    out.push("Nothing: every structural proof and fold check passes, every graded clause is inside its filed band, and AM-1 finds no breach.");
  }
  for (const f of o.structuralFailures) out.push(`- STRUCTURAL (a build fault, fixed before the PR, never put to a merge card): ${f}`);
  for (const f of o.foldFaults) out.push(`- FOLD FAULT (the clause is not judged and the step cannot close until the fold is fixed): ${f}`);
  for (const f of o.guardBreaches) out.push(`- GUARD BREACH under AM-1 (the step stops, ADR-089:1306: the arms finish playing, the step does not close, nothing merges, step 3 does not start): ${f}`);
  for (const f of o.gradedFailures) out.push(`- GRADED, reported as filed (no band moves, nothing re-files, nothing is tuned to pass or re-run to try again): ${f}`);
  out.push("");
  out.push(`Merge card: ${o.mergeCard ? "may be posted (no structural failure, fold fault or AM-1 breach stands)" : "NOT to be posted until the items above are settled"}.`);
  for (const n of o.next) out.push(`- next: ${n}`);
  out.push("");

  out.push("## The headline: B3 (pocket-1.s2) against A1 (step 1's design), re-played on the same seeds");
  out.push("");
  out.push("Set 1 is graded; set 2 is printed beside it. Every hit and sack figure has both arms' times to throw beside it.");
  out.push("");
  for (const c of s.headline) out.push(comparisonLine(c));
  out.push("");

  out.push("## The clause table");
  out.push("");
  out.push("| clause | kind | arms | filed | measured | verdict |");
  out.push("|---|---|---|---|---|---|");
  for (const c of s.clauses) out.push(`| ${c.id} | ${c.kind} | ${c.arms.join(", ")} | ${c.filed} | ${c.values.join("; ")} | ${c.verdict}${c.note === undefined ? "" : ` (${c.note})`} |`);
  out.push("");

  out.push("## The three-arm decomposition: B1 (the forcing point alone), B2 (the warning alone) and B3 (both) against A1");
  out.push("");
  out.push("B1 and B2 break the July derivation (P = C + (C - I)) and are information, never design values (O37).");
  out.push("");
  for (const c of s.decomposition) out.push(comparisonLine(c));
  for (const c of s.interaction) out.push(contrastLine(c));
  out.push("");

  out.push("## The world and the rule (F.9 item 6; C1-F9)");
  out.push("");
  out.push("B7 minus A1 is the basis mechanism (the half second with the warning, under step 1's forcing rule) on S; B5 minus A5 is the same on L8 with Heels, pkA's A123. Their difference is the world. B3 minus B7 is the rule, per rusher at the same horizons, which M2 STREAM on B7's own stream sizes (printed beside each row, set by set; A1's merged figure is the filed reading, at C 1.0 s).");
  out.push("");
  for (const c of s.worldAndRule) out.push(contrastLine(c));
  out.push("");

  out.push("## The information arms (reported, direction only; O47)");
  out.push("");
  for (const c of s.information) out.push(comparisonLine(c));
  out.push("");

  out.push("## The pricing arm: B6 against A11, the bands' measured basis at the stand-in hold (no band graded; never a design value)");
  out.push("");
  for (const c of s.pricing) out.push(comparisonLine(c));
  out.push("");

  out.push(...renderStep2M2(s.m2));

  const a = s.amendments;
  out.push(`## The interception guard under AM-1 (${a.record}; entry ${a.entry}, amendments ${a.digest})`);
  out.push("");
  out.push(
    `AM-1 supersedes guard.mix and guard.byClass from step 2: each arm is read against its base in the filed step-2 map, on the same seeds, on both seed sets. On each set z = (rise - allowed) / SE, ` +
      `SE binomial with the two arms read as independent (a set whose SE is 0 scores ${String(a.zSetSE0)}); Z = (z1 + z2) / sqrt 2; a reading breaches when Z is above ${a.zLeague.toFixed(1)} league-wide or ${a.zClass.toFixed(1)} in a class (strict). ` +
      "e* is the mean excess over the allowance at which the reading would breach. Beside every reading: the filed reading (the rise at most the allowance, per set) and the paired, game-clustered SE and Z, both reported, never graded. " +
      "DESPERATION is also split dirty and clean by the last status at or before the release (reported), with the rise re-weighted to the base's composition; the checkdown looks are counted by trigger. The cumulative line (B3 against A0, B6 against A14) is reported, never graded before step 10.",
  );
  out.push("");
  for (const g of s.guard) {
    out.push(`### ${g.arm} against ${g.base}, ${g.league}${g.cumulative ? " (the cumulative line: reported, never graded)" : ""}`);
    out.push("");
    out.push(`- league-wide: ${readingText(g.reading.league)}; ${pairedText(g.pairedLeague)}`);
    for (const c of g.reading.classes) {
      const statuses = c.bySet.filter((x) => x.status !== "SCORED").map((x) =>
        x.status === "REMOVED" ? `set ${String(x.seedSet)} REMOVED (${String(x.baseThrows)} base aimed, ${String(x.baseInterceptions)} interceptions)` : `set ${String(x.seedSet)} NO BASE (${String(x.armThrows)} arm aimed, ${String(x.armInterceptions)} interceptions)`,
      );
      const paired = g.pairedClasses[c.cls];
      const reading = c.reading === undefined ? "scored on no set" : readingText(c.reading);
      out.push(`- ${c.cls}: ${reading}${statuses.length === 0 ? "" : `; ${statuses.join("; ")}`}${c.graded ? "" : " (not graded)"}${paired === undefined ? "" : `; ${pairedText(paired)}`}`);
    }
    for (const h of g.desperation) {
      const sets = h.bySet.map((x) => `set ${String(x.seedSet)} base ${String(x.baseAimed)} aimed / ${String(x.baseInterceptions)} INT -> arm ${String(x.armAimed)} / ${String(x.armInterceptions)}`).join("; ");
      out.push(`- DESPERATION ${h.half} (reported, never graded): ${sets}${h.reading === null ? "" : `; ${readingText(h.reading).replace(/: (PASS|BREACH|REPORTED)( \(not graded: one seed set\))?$/, " (reported)")}`}; ${pairedText(h.paired)}`);
    }
    for (const w of g.reweighted) {
      out.push(
        `- DESPERATION composition, set ${String(w.seedSet)}: base dirty ${fmt(w.baseShare.DIRTY)}% / clean ${fmt(w.baseShare.CLEAN)}% -> arm dirty ${fmt(w.armShare.DIRTY)}% / clean ${fmt(w.armShare.CLEAN)}%; ` +
          `the class's rise ${signed(w.rise)}, re-weighted to the base's composition ${signed(w.reweightedRise)} (reported)`,
      );
    }
    out.push(`- checkdown looks by trigger: base ${checkdownText(g.checkdown.base)}; arm ${checkdownText(g.checkdown.arm)}`);
    for (const w of g.checkdownReweighted) {
      out.push(
        `- CHECKDOWN composition by trigger on the release tick, set ${String(w.seedSet)}: base ${shareText(w.baseShare)} -> arm ${shareText(w.armShare)}; ` +
          `the class's rise ${signed(w.rise)}, re-weighted to the base's composition ${signed(w.reweightedRise)} (reported)`,
      );
    }
    out.push("");
  }

  out.push("## The structural proofs and fold checks inside the arms");
  out.push("");
  for (const p of s.proofs) out.push(`- ${p.id} (${p.kind === "fold" ? "fold check" : "structural"}; ${p.what}): ${p.verdict === "PASS" ? "PASSES" : p.verdict === "FAIL" ? "FAILS" : p.verdict}. ${p.detail}`);
  out.push("");

  out.push("## Each arm: exclusive affected plays, must act, the step-2 folds' counts and the rows printed apart");
  out.push("");
  for (const arm of s.arms) {
    out.push(`### ${arm.arm}, ${arm.league} (${arm.role})${arm.label === undefined ? "" : `: ${arm.label}`}`);
    out.push("");
    for (const c of arm.bySet) {
      const at = `set ${String(c.seedSet)}`;
      out.push(`- ${at}: dropbacks ${String(c.dropbacks)}; time to throw ${fmt(c.timeToThrow, 3)} s`);
      if (c.affected === undefined) out.push(`- ${at}: exclusive affected plays: none (no base)`);
      else {
        const by = Object.entries(c.affected.byMechanism).map(([k, v]) => `${MECHANISM_TOUCH[k] ?? k} ${String(v)}`).join(", ");
        out.push(`- ${at}: exclusive affected plays against ${c.affected.against}: ${String(c.affected.union)} of ${String(c.affected.dropbacks)} (${by === "" ? "no exclusive mechanism" : by})`);
      }
      const m = c.mustActShare;
      out.push(
        `- ${at}: must-act share of aimed throws (released on a tick with a threat within C) ${fmt(m["mustActSharePct"] ?? null)}%, beside forced_throw_share's status-forced ${fmt(m["statusForcedSharePct"] ?? null)}% (R5); ` +
          `first must-act tick ${fmt(m["firstMustActSeconds"] ?? null, 3)} s on ${String(m["firstMustActDropbacks"] ?? 0)} dropbacks, beside first_forcing_seconds' ${fmt(m["firstStatusForcingSeconds"] ?? null, 3)} s on ${String(m["firstStatusForcingDropbacks"] ?? 0)}`,
      );
      const acts = Object.entries(c.forcedActs).map(([k, v]) => `${k} ${String(v.acts)} (threat ${String(v.threatPart)}, status ${String(v.statusPart)}, count ${String(v.countPart)})`).join(", ");
      out.push(`- ${at}: forced acts by kind (the part that held): ${acts === "" ? "none" : acts}; the count part's self-check: ${c.selfCheck.offRule === null ? "" : `${String(c.selfCheck.offRule.counted)} of ${String(c.selfCheck.offRule.acts)} off-rule acts counted, ${String(c.selfCheck.offRule.exceptions)} exceptions; `}witnesses ${String(c.selfCheck.witness.holds)} closing HOLDs (${String(c.selfCheck.witness.countHolds)} at or past throwawayEarliestSeconds) and ${String(c.selfCheck.witness.clockExpired)} CLOCK_EXPIRED, ${String(c.selfCheck.witness.exceptions)} exceptions; ${c.selfCheck.passed ? "passed" : "FAILED"}`);
      out.push(`- ${at}: arrivals ${String(c.arrival.cases)} (THROW ${String(c.arrival.throws)}, SACK ${String(c.arrival.sacks)}), failures ${String(c.arrival.failures)}; status ticks ${String(c.warning.statusTicks)}, ticks with a threat inside the warning ${String(c.warning.warningTicks)}, of them CLEAN ${String(c.warning.cleanWithWarning)}, failures ${String(c.warning.failures)}`);
      out.push(`- ${at}: quick-pressure share ${fmt(c.quickPressure)} %; band floor plus counter ${fmt(c.floorCounter)} % of first dirt; clean_with_live_won_rep ticks ${fmt(c.cleanWithLiveWonRep.ticks, 3)} %, dropbacks ${fmt(c.cleanWithLiveWonRep.dropbacks, 3)} %, PUSH ticks apart ${fmt(c.cleanWithLiveWonRep.pushTicks, 3)} % (these rise under the warning, expected, not a failure: R8)`);
      if (c.passRushWin !== undefined) out.push(`- ${at}: pass-rush win rate (pbwr_sim_only) ${fmt(c.passRushWin)} %: a pre-beat tick is a capped margin, not a rep outcome (O30)`);
      out.push(`- ${at}: the miss rule's n (pressured_share_2s_no_free_runner) ${fmt(c.missRuleN)} %: no step-2 row is under the miss rule (O48); step-1 stream checks ${String(c.s1Problems)} failing; step-2 folds ${c.s2Problems.length === 0 ? "clean" : c.s2Problems.join("; ")}`);
    }
    out.push("");
  }
  return out;
}
