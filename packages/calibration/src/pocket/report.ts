/**
 * THE POCKET STEP REPORT (ADR-089 step 0; plan §7.2 `report.ts`).
 *
 * A renderer: it reads plain, already-measured inputs and prints them, and computes nothing that is
 * a game fact (Iron Rule 3). S3's rows and benches and S2's registry rows are its inputs; it imports
 * neither (S3 never imports S4 and S4 never imports S3, C2-B3), and C3 wires it into `main.ts` so
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
