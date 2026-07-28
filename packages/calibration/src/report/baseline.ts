/**
 * THE BASELINE COMPARISON REPORT — `calibration.md` §5.1, "the heartbeat document".
 *
 * *"Full metric library, sim vs real, per season and pooled, with CIs, pass/fail per band, trend
 * vs previous report."*
 *
 * ================== DESIGNED FOR A WIDE FIRST FAILURE ==================
 *
 * The first baseline will fail most of its Tier 1 rows, and that is the expected state rather
 * than a crisis: backlog entry 3's §7.1 term asymmetry is frozen, and entries 1, 2, 6, 7 and
 * 9-15 are all open with named levers. A report that renders forty red rows and nothing else
 * would be unreadable and would invite the wrong reaction — quietly widening bands, which §10.1
 * forbids, or tuning against a fixture that entries 1, 2a and 11 all say not to tune against.
 *
 * So the layout is diagnostic, not evaluative:
 *
 *  - `FAIL_KNOWN` is a distinct verdict from `FAIL`, and the backlog entries print in the row.
 *    Forty rows of "still open, see entry 3" is a map. One row of `FAIL` with no entry beside it
 *    is the finding, and it is listed separately at the top under **NEW DIVERGENCES**.
 *  - The band table prints in full, every time, per §10.1's "every report states the current
 *    band table" — with the ratchet history, so a tightened band shows what tightened it.
 *  - The trend column is present from report one, showing `—` until there is a predecessor. A
 *    slot that appears later is a slot nobody builds tooling against.
 *  - The **declared absences** section prints unconditionally. A metric the library deliberately
 *    lacks is more likely to be filled in wrongly when nobody is reminded it is missing.
 */
import type { Eligibility } from "../ingest/seasons.js";
import { renderAbsences } from "../metrics/absence.js";
import type { SimAccumulator } from "../metrics/collect.js";
import { allMetrics } from "../metrics/registry.js";
import { citeRealInput, type RealInput } from "../metrics/realInput.js";
import type { Metric } from "../metrics/types.js";
import type { BatchProvenance } from "../harness/batch.js";
import type { FrozenCallerDiagnostics } from "../caller/frozen.js";
import { claimScopeOf, type LeagueProvenance } from "../league/provenance.js";
import {
  evaluateMetric,
  openingBandTable,
  proposeRatchets,
  updateComfortStreaks,
  type BandTable,
  type MetricEvaluation,
  type RatchetProposal,
} from "./bands.js";

export interface PreviousReport {
  readonly id: string;
  /** Metric id → the scalar the previous report recorded, for the trend column. */
  readonly sim: Readonly<Record<string, number>>;
  readonly comfortableStreak: Readonly<Record<string, number>>;
}

export interface BaselineReportInput<E extends Eligibility> {
  readonly id: string;
  readonly accumulator: SimAccumulator;
  readonly provenance: BatchProvenance;
  readonly caller: FrozenCallerDiagnostics;
  readonly real: RealInput<E>;
  readonly bands?: BandTable;
  readonly previous?: PreviousReport;
  readonly metrics?: readonly Metric[];
}

/**
 * The report, branded with the eligibility of the evidence it was computed from.
 *
 * This is the sacred-season rule at the report layer. §7: *"No tunable patch and no rating patch
 * may cite 2025 evidence. The 2025 baseline report runs only at declared checkpoints and its
 * result is reported as-is."* A `BaselineReport<"HELD_OUT">` is a perfectly good report; it is
 * simply not assignable where a patch proposal wants one.
 */
export interface BaselineReport<E extends Eligibility> {
  readonly id: string;
  readonly eligibility: E;
  readonly seasons: readonly number[];
  readonly provenance: BatchProvenance;
  readonly caller: FrozenCallerDiagnostics;
  readonly bands: BandTable;
  readonly evaluations: readonly MetricEvaluation[];
  readonly ratchetProposals: readonly RatchetProposal[];
  readonly comfortableStreak: Readonly<Record<string, number>>;
  readonly manifests: readonly string[];
  /** Rows that failed with no backlog entry claiming them. The ones to read twice. */
  readonly newDivergences: readonly string[];
}

export type TuningBaselineReport = BaselineReport<"TUNING">;

export class HeldOutReportCitedError extends Error {
  constructor(reportId: string, seasons: readonly number[]) {
    super(
      `report ${reportId} was computed on held-out season(s) ${seasons.join(", ")} and cannot be ` +
        `cited as justification. calibration.md §7: the 2025 baseline is reported as-is and ` +
        `never used as evidence for a tunable or rating patch.`,
    );
    this.name = "HeldOutReportCitedError";
  }
}

/** Runtime backstop for the brand, mirroring `assertTuningEvidence` one layer down. */
export function assertTuningReport<E extends Eligibility>(
  report: BaselineReport<E>,
): asserts report is BaselineReport<E> & BaselineReport<"TUNING"> {
  if (report.eligibility !== "TUNING") {
    throw new HeldOutReportCitedError(report.id, report.seasons);
  }
}

export function buildBaselineReport<E extends Eligibility>(
  input: BaselineReportInput<E>,
): BaselineReport<E> {
  const metrics = input.metrics ?? allMetrics();
  const bands = input.bands ?? openingBandTable(metrics);
  const context = {
    accumulator: input.accumulator,
    provenance: input.provenance.leagueProvenance as LeagueProvenance,
  };

  const evaluations = metrics.map((metric) => {
    const band = bands.entries[metric.id];
    const effective: Metric = band === undefined ? metric : { ...metric, toleranceBand: band };
    return evaluateMetric(
      effective,
      effective.computeFromEvents(context),
      effective.computeFromReal(input.real),
    );
  });

  const comfortableStreak = updateComfortStreaks(
    input.previous?.comfortableStreak ?? {},
    evaluations,
  );

  return {
    id: input.id,
    eligibility: input.real.eligibility,
    seasons: [...input.real.seasons],
    provenance: input.provenance,
    caller: input.caller,
    bands,
    evaluations,
    ratchetProposals: proposeRatchets(
      evaluations,
      input.previous?.comfortableStreak ?? {},
      input.id,
    ),
    comfortableStreak,
    manifests: citeRealInput(input.real),
    newDivergences: evaluations.filter((e) => e.verdict === "FAIL").map((e) => e.metricId),
  };
}

// --- rendering --------------------------------------------------------------

const VERDICT_MARK: Readonly<Record<string, string>> = {
  PASS: "PASS",
  PASS_COMFORTABLE: "PASS+",
  FAIL: "**FAIL (NEW)**",
  FAIL_KNOWN: "FAIL (known)",
  NO_DATA: "no data",
  NOT_APPLICABLE: "n/a",
  OBSERVATION: "obs",
};

function fmt(value: number | null, unit: string): string {
  if (value === null || !Number.isFinite(value)) return "—";
  if (unit === "%" || unit === "share") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(3);
}

function fmtInterval(interval: { low: number; high: number } | null, unit: string): string {
  if (interval === null || !Number.isFinite(interval.low)) return "—";
  return `[${fmt(interval.low, unit)}, ${fmt(interval.high, unit)}]`;
}

export function renderBaselineReport<E extends Eligibility>(report: BaselineReport<E>): string {
  const p = report.provenance;
  const lines: string[] = [];

  lines.push(`# Baseline comparison — ${report.id}`);
  lines.push("");
  if (report.eligibility === "HELD_OUT") {
    lines.push(
      "> **HELD-OUT SEASON REPORT.** Computed on sacred evidence and reported as-is " +
        "(`calibration.md` §7). It may not be cited as justification for any tunable or rating " +
        "patch, and `assertTuningReport` will refuse it.",
    );
    lines.push("");
  }

  lines.push("## Provenance");
  lines.push("");
  lines.push(`| field | value |`);
  lines.push(`|---|---|`);
  lines.push(`| tunables version | \`${p.tunablesVersion}\` |`);
  lines.push(`| frozen caller | \`${p.callerVersion}\` + 4th-down \`${p.callerFourthDownVersion}\` |`);
  lines.push(`| league | \`${p.leagueId}\` — **${p.leagueProvenance}** |`);
  lines.push(`| league detail | ${p.leagueDescription} |`);
  lines.push(`| schedule | ${p.scheduleKind}, season ${p.season}, ${p.games} games |`);
  lines.push(`| availability-matched | ${p.availabilityMatched ? `yes (${p.teamWeeksWithAbsences} team-weeks with absences)` : "**no — full strength**"} |`);
  lines.push(`| batch seed | \`${p.batchSeed}\` |`);
  lines.push(`| seed digest | \`${p.seedDigest}\` |`);
  lines.push(`| executor | ${p.executorName} (${p.workers} worker${p.workers === 1 ? "" : "s"}) |`);
  lines.push(`| real seasons | ${report.seasons.join(", ")} (${report.eligibility}) |`);
  lines.push("");
  lines.push(`**What this report may claim:** ${claimScopeOf(p.leagueProvenance)}`);
  lines.push("");

  lines.push("## Frozen caller diagnostics");
  lines.push("");
  const c = report.caller;
  const totalCalls = c.passCalls + c.runCalls;
  lines.push(
    `${totalCalls} offensive calls: ${c.passCalls} pass (${totalCalls === 0 ? "—" : ((c.passCalls / totalCalls) * 100).toFixed(1)}%), ` +
      `${c.runCalls} run. ${c.conceptRedraws} concept re-draws against unprotectable pressures ` +
      `(${totalCalls === 0 ? "—" : ((c.conceptRedraws / totalCalls) * 100).toFixed(2)}% of calls — ` +
      `the offensive-concept mix carries this distortion; see \`caller/frozen.ts\`).`,
  );
  lines.push(
    `Fourth downs: ${c.fourthDownGo} go, ${c.fourthDownPunt} punt, ${c.fourthDownFieldGoal} field goal.`,
  );
  lines.push(
    `Tendency backoff levels used: ${Object.entries(c.backoff)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(", ") || "—"}`,
  );
  lines.push("");

  const newDivergences = report.evaluations.filter((e) => e.verdict === "FAIL");
  lines.push("## New divergences");
  lines.push("");
  if (newDivergences.length === 0) {
    lines.push(
      "None. Every failing row below is claimed by a `CALIBRATION-BACKLOG.md` entry — the " +
        "failures are a map of known-open work, not news.",
    );
  } else {
    lines.push("**Rows that failed their band and are claimed by NO backlog entry.** Read these twice.");
    lines.push("");
    for (const e of newDivergences) {
      lines.push(`- \`${e.metricId}\` — sim ${fmt(e.sim, e.unit)} vs real ${fmt(e.real, e.unit)} (${e.deviationLabel})`);
    }
  }
  lines.push("");

  for (const tier of [1, 2, 3, 4]) {
    const rows = report.evaluations.filter((e) => e.tier === tier);
    if (rows.length === 0) continue;
    lines.push(`## Tier ${tier}`);
    lines.push("");
    lines.push("| metric | verdict | sim | 95% CI | real | 95% CI | n (sim/real) | deviation | trend | notes |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|");
    for (const e of rows) {
      lines.push(
        `| \`${e.metricId}\` | ${VERDICT_MARK[e.verdict] ?? e.verdict} | ${fmt(e.sim, e.unit)} | ` +
          `${fmtInterval(e.simInterval, e.unit)} | ${fmt(e.real, e.unit)} | ` +
          `${fmtInterval(e.realInterval, e.unit)} | ${e.simN}/${e.realN} | ` +
          `${e.deviation === null ? "—" : e.deviation.toFixed(4)} | ${trendCell(e)} | ` +
          `${[e.detail, ...e.knownDivergences].filter((s) => s.length > 0).join("; ")} |`,
      );
    }
    lines.push("");
  }

  lines.push("## Band table");
  lines.push("");
  lines.push(
    "`calibration.md` §10.1 — **loose-and-ratchet**. Tier 1 opens at ±15% relative. A metric " +
      "comfortably inside its band (|deviation| ≤ ½ band) across consecutive reports gets its " +
      "band tightened and locked. **Bands only ever move tighter — a rising floor.** " +
      "`ratchetBand` throws on any attempt to widen one.",
  );
  lines.push("");
  lines.push(`Table version: \`${report.bands.version}\``);
  lines.push("");
  lines.push("| metric | kind | width | locked by | history |");
  lines.push("|---|---|---|---|---|");
  for (const [id, band] of Object.entries(report.bands.entries).sort((a, b) => a[0].localeCompare(b[0]))) {
    const width = Number.isFinite(band.width) ? String(band.width) : "— (observation, never graded)";
    lines.push(
      `| \`${id}\` | ${band.kind} | ${width} | ${band.lockedBy ?? "—"} | ` +
        `${band.history.map((h) => `${h.from}→${h.to} (${h.reportId})`).join(", ") || "—"} |`,
    );
  }
  lines.push("");

  lines.push("## Ratchet proposals");
  lines.push("");
  if (report.ratchetProposals.length === 0) {
    lines.push("None. A band tightens only after consecutive comfortable reports.");
  } else {
    lines.push("| metric | from | to | streak | reason |");
    lines.push("|---|---|---|---|---|");
    for (const proposal of report.ratchetProposals) {
      lines.push(
        `| \`${proposal.metricId}\` | ${proposal.from} | ${proposal.to} | ` +
          `${proposal.consecutiveComfortableReports} | ${proposal.reason} |`,
      );
    }
  }
  lines.push("");

  lines.push(renderAbsences());

  lines.push("## Metric definitions");
  lines.push("");
  for (const e of report.evaluations) {
    lines.push(`- \`${e.metricId}\` (Tier ${e.tier}, ${e.unit}) — ${e.definition}`);
  }
  lines.push("");

  lines.push("## Manifests");
  lines.push("");
  lines.push("Every source this report's real side was computed from (`calibration.md` §2).");
  lines.push("");
  for (const manifest of report.manifests) lines.push(`- \`${manifest}\``);
  lines.push("");

  return lines.join("\n");
}

function trendCell(evaluation: MetricEvaluation): string {
  if (evaluation.previousSim === undefined || evaluation.sim === null) return "—";
  const delta = evaluation.sim - evaluation.previousSim;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}`;
}

/**
 * The trend slot, applied. Kept as a separate pass so a report with no predecessor and a report
 * with one go through the same code — a trend column that only exists on the second report is a
 * column nobody builds tooling against.
 */
export function withTrend<E extends Eligibility>(
  report: BaselineReport<E>,
  previous: PreviousReport | undefined,
): BaselineReport<E> {
  if (previous === undefined) return report;
  return {
    ...report,
    evaluations: report.evaluations.map((e) => {
      const before = previous.sim[e.metricId];
      return before === undefined ? e : { ...e, previousSim: before };
    }),
  };
}

/** What the next report needs from this one. */
export function carryForward<E extends Eligibility>(report: BaselineReport<E>): PreviousReport {
  const sim: Record<string, number> = {};
  for (const e of report.evaluations) {
    if (e.sim !== null && Number.isFinite(e.sim)) sim[e.metricId] = e.sim;
  }
  return { id: report.id, sim, comfortableStreak: report.comfortableStreak };
}
