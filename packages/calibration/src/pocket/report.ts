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

function guardLine(league: League, label: string, v: GuardVerdict): string {
  return `    ${league} ${label}: base ${v.baseRate.toFixed(2)} -> arm ${v.armRate.toFixed(2)}, rise ${v.rise.toFixed(2)} against an allowed ${v.allowed.toFixed(2)}: ${v.passes ? "PASSES" : "BREACH: the step stops and comes back to the owner with a second seed set"}`;
}

function classGuardLine(league: League, cls: ThrowClass, v: ClassGuardVerdict): string {
  if (v.status === "SCORED") return guardLine(league, cls, v);
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
    if (arm.isBase) {
      out.push("    the guard: this is the base every other arm's rise is read against");
    } else {
      out.push(`    the guard against ${base.arm} (D9's additive mix rule, then by class, D28; a fall in one class never offsets a rise in another):`);
      for (const league of LEAGUES) {
        out.push(guardLine(league, "league-wide", intGuard(base.intGuard[league].all, arm.intGuard[league].all, arm.clock)));
        const byClass = intGuardByClass(base.intGuard[league].byClass, arm.intGuard[league].byClass, arm.clock);
        for (const cls of THROW_CLASSES) {
          const v = byClass.byClass[cls];
          if (v !== undefined) out.push(classGuardLine(league, cls, v));
        }
        out.push(`    ${league} by class: ${byClass.passes ? "PASSES" : "BREACH: the step stops and comes back to the owner with a second seed set"}`);
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

export interface Step1GuardRow {
  readonly arm: string;
  readonly base: string;
  readonly league: League;
  readonly mix: GuardVerdict;
  readonly byClass: { readonly passes: boolean; readonly breaches: readonly string[] };
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
  readonly affected?: { readonly against: string; readonly byMechanism: Readonly<Record<string, number>>; readonly windowOnlyDirt: number; readonly union: number };
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
  for (const g of s.guard) {
    out.push(
      `- ${g.arm} against ${g.base}, ${g.league}: league-wide rise ${g.mix.rise.toFixed(2)} against an allowed ${g.mix.allowed.toFixed(2)}: ${g.mix.passes ? "PASSES" : "BREACH"}; ` +
        `by class: ${g.byClass.passes ? "PASSES" : `BREACH (${g.byClass.breaches.join(", ")})`}`,
    );
  }
  out.push("");

  out.push("## The structural proofs inside the arms (§9.2)");
  out.push("");
  for (const p of s.structural) out.push(`- ${p.id} (${p.what}): ${p.verdict === "PASS" ? "PASSES" : p.verdict === "FAIL" ? "FAILS" : p.verdict}. ${p.detail}`);
  out.push("");

  out.push(`## The interaction (§9.3): joint minus (clock alone + beaten alone - base), beside pkA's ${s.pkAInteraction.toFixed(1)} points (REPORTED, ADR-089:1333)`);
  out.push("");
  for (const i of s.interaction) out.push(`- ${i.formula}, ${i.league}: pressure ${signed(i.pressure)} points; ${withTtt(`sacks ${signed(i.sack)}`, i.timeToThrow)}`);
  out.push("");

  out.push("## The window's price: A1 minus A2 (the window cannot run alone)");
  out.push("");
  for (const w of s.windowPrice) {
    out.push(
      `- ${w.league}: pressure ${signed(w.pressure, 3)} points against the filed +-${w.b1Filed.toFixed(4)} (B1, gen seed set 1; this league's own B1 ${fmt(w.b1OwnLeague, 4)}); ` +
        `${withTtt(`sacks ${signed(w.sack, 3)} against +-${w.sackTolerance.toFixed(1)}`, w.timeToThrow)}; M1 recomputed on A2's streams: B1 ${fmt(w.m1OnA2, 4)} points (K7)`,
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
      const by = Object.entries(a.affected.byMechanism).map(([k, v]) => `${k} ${String(v)}`).join(", ");
      out.push(`- exclusive affected plays against ${a.affected.against}: ${String(a.affected.union)} (${by === "" ? "no exclusive mechanism" : by}; window-only dirt ${String(a.affected.windowOnlyDirt)})`);
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
