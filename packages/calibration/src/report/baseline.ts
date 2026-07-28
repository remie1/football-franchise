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
 *    slot that appears later is a slot nobody builds tooling against. It has since grown a THIRD
 *    state: `**refused**`, when the predecessor is not a comparable baseline. See below.
 *
 * ================== THE TREND COLUMN IS ADJUDICATED, NOT ASSUMED ==================
 *
 * `reports/baseline-0002.carry-forward.json` recorded a full set of correct numbers and was
 * silently stale within days — the corpus and sack-credit dispatches moved the engine, and
 * nothing in the file could say so. The mechanism worked; the file simply had no provenance.
 *
 * So `carryForward` now stamps the identity of the run that produced it (`report/identity.ts`),
 * `buildBaselineReport` takes an ADJUDICATED `TrendDecision` rather than a raw `PreviousReport`,
 * and the three grades of predecessor differ in exactly what they may do:
 *
 *   ACCEPTED       arrow yes, streak yes
 *   RECONSTRUCTED  arrow yes, streak NO   — `previous.ts`'s rule, now structural
 *   REFUSED        arrow NO,  streak NO   — and the report says which field mismatched
 *
 * There is no way to reach the arrow or the streak except through that union, which is the
 * point: the failure it prevents is one where the wrong answer renders as a confident number.
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
import {
  CARRY_FORWARD_FORMAT,
  NO_TREND,
  baselineIdentity,
  isDirtyCommit,
  mayInformArrow,
  mayRatchet,
  previousOf,
  type BaselineIdentity,
  type CarryForward,
  type TrendDecision,
} from "./identity.js";

export interface BaselineReportInput<E extends Eligibility> {
  readonly id: string;
  /**
   * The engine tree these numbers were produced against — see `identity.ts`.
   *
   * REQUIRED, and required at the type level on purpose (ADR-012's precedent: *required
   * `tunables` parameters over an optional one*, which `tsc` used to find seven silent
   * module-load-time reads). An optional commit would default to "unknown" at every call site
   * that forgot it, and a carry-forward stamped "unknown" is the file this whole mechanism exists
   * to make impossible — `reports/baseline-0002.carry-forward.json`, which recorded nothing and
   * was stale within days.
   *
   * A pure function cannot know its own commit and this package does not shell out to `git`, so
   * the value comes from the caller. `assertEngineCommit` checks that it is at least SHAPED like
   * a git object name; the tool that supplies it is the one place `FF_ENGINE_COMMIT` is read.
   */
  readonly engineCommit: string;
  readonly accumulator: SimAccumulator;
  readonly provenance: BatchProvenance;
  readonly caller: FrozenCallerDiagnostics;
  readonly real: RealInput<E>;
  readonly bands?: BandTable;
  /**
   * An ADJUDICATED predecessor, never a raw one.
   *
   * The type is the enforcement. There is no `previous?: PreviousReport` parameter any more,
   * because a caller that has a `PreviousReport` in hand — parsed off disk, say — must pass it
   * through `decideTrend` to get one of these, and `decideTrend` is where a mismatched carry
   * forward becomes `REFUSED`. The arrow and the streak are both downstream of this union.
   */
  readonly trend?: TrendDecision;
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
  /** What a successor must match before it may trend against this report. */
  readonly identity: BaselineIdentity;
  /** Whether a predecessor informed this report, and on what terms. Rendered either way. */
  readonly trend: TrendDecision;
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
  const trend = input.trend ?? NO_TREND;
  const identity = baselineIdentity({
    provenance: input.provenance,
    engineCommit: input.engineCommit,
    eligibility: input.real.eligibility,
    realSeasons: input.real.seasons,
  });
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

  /**
   * ★ THE STREAK IS SEEDED ONLY BY AN ACCEPTED PREDECESSOR. ★
   *
   * A streak is one report away from a `ratchetBand` call, and a ratchet is permanent —
   * `ratchetBand` throws on any attempt to widen. Inheriting a streak from a REFUSED or
   * RECONSTRUCTED predecessor would let a band be tightened on the strength of numbers produced
   * by a tree that no longer exists, or by a paragraph, and there is no undo. `previous.ts`
   * already refused this by shipping an empty streak map; `mayRatchet` makes it structural, so
   * the guarantee survives somebody editing that literal.
   */
  const inheritedStreak = mayRatchet(trend) ? (previousOf(trend)?.comfortableStreak ?? {}) : {};
  const comfortableStreak = updateComfortStreaks(inheritedStreak, evaluations);

  return {
    id: input.id,
    eligibility: input.real.eligibility,
    seasons: [...input.real.seasons],
    identity,
    trend,
    provenance: input.provenance,
    caller: input.caller,
    bands,
    evaluations,
    ratchetProposals: proposeRatchets(evaluations, inheritedStreak, input.id),
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

  /**
   * THE TREND RULE, PRINTED BEFORE ANY TREND CELL IS SEEN.
   *
   * It used to live only in the Trend section, which a reader reaches after the provenance block
   * and long before the tables — but the question it answers ("why is this column refusing?") is
   * asked at the table. Stated here, at the top, so it is read before it is needed rather than
   * looked up after a column has already confused somebody.
   *
   * The rule itself is ADR-025's and is not negotiable by a report: a trend across an engine
   * change is unavailable BY CONSTRUCTION, because two different trees are not two measurements
   * of one thing. Nothing in this file can restore it, and a column that quietly rendered
   * arrows across a boundary would be manufacturing the comparison the ADR exists to refuse.
   */
  lines.push("## How to read the trend column");
  lines.push("");
  lines.push(
    "> **A trend across an engine change is unavailable by construction (ADR-025).** Two runs " +
      "against two different trees are not two measurements of one thing, so no arrow between " +
      "them means anything, and this report will not draw one. The honest comparison across an " +
      "engine change is **paired arms in one process on one tree** — the control arm and the " +
      "changed arm, same seeds, same fixtures, differing only in the thing under test.",
  );
  lines.push("");
  lines.push(
    "> **The trend column therefore means \"same tree, more games\" and nothing else.** It is a " +
      "sampling arrow, not a progress arrow. A `**refused**` cell is that rule firing, with the " +
      "mismatched field named in the Trend section below; an em dash is the different fact that " +
      "there was no predecessor at all.",
  );
  lines.push("");

  lines.push("## Provenance");
  lines.push("");
  lines.push(`| field | value |`);
  lines.push(`|---|---|`);
  lines.push(`| engine commit | \`${report.identity.engineCommit}\` |`);
  lines.push(`| tunables version | \`${p.tunablesVersion}\` (measured \`${p.tunablesDigest}\`) |`);
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
  if (isDirtyCommit(report.identity.engineCommit)) {
    lines.push(
      "> **PRODUCED FROM A DIRTY WORKING TREE.** The commit above is suffixed `-dirty`: this run " +
        "included uncommitted edits that nothing records. Its carry-forward will be REFUSED by " +
        "every successor, including another run stamped with the same hash, because two dirty " +
        "trees are not the same tree. Commit before producing a baseline anybody will trend " +
        "against.",
    );
    lines.push("");
  }

  lines.push(renderTrend(report));

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
  lines.push(renderDrawQuality(report));

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
          `${e.deviation === null ? "—" : e.deviation.toFixed(4)} | ${trendCell(report, e)} | ` +
          `${notesCell(e)} |`,
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

/**
 * The notes cell — and the reason it is a function rather than a join.
 *
 * `outsideDetail` in `bands.ts` already builds "outside band; already diagnosed: <entries>" out
 * of the SAME `knownDivergences` list, so appending the list again printed every backlog
 * reference twice in every failing row. Harmless to a machine and corrosive to a reader: the
 * report's whole layout argument is that "forty rows of 'still open, see entry 3' is a map", and
 * a map that says everything twice is one nobody reads. Fixed here rather than by thinning
 * `outsideDetail`, because a PASSING row still wants its known-divergence list visible — a metric
 * that passes while a backlog entry claims it is exactly the row the first baseline warned about
 * (`points_per_drive` passing "is arithmetic, not health").
 */
function notesCell(evaluation: MetricEvaluation): string {
  const detail = evaluation.detail;
  const parts =
    detail.includes("already diagnosed:") || detail.includes("NO backlog entry")
      ? [detail]
      : [detail, ...evaluation.knownDivergences];
  return parts.filter((s) => s.length > 0).join("; ");
}

/**
 * DRAW QUALITY — ADR-024's instrument, and the reason it was ratified rather than deferred.
 *
 * *"A caller that guesses badly is a confound you can measure; a branch that never executes is one
 * you cannot."* So the guess is graded, in the report, every time — not in a probe file and not as
 * a debug print. ADR-024's two open sub-questions are the ones these numbers are for, and the
 * section is laid out so that neither can be answered from a single headline:
 *
 *  - the exact-match rate is printed BESIDE the forced share that inflates it;
 *  - the axes are separate rows and are never summed into a score;
 *  - the two set differences are labelled by the mechanic they feed, not by their arithmetic.
 *
 * Under v1 there is no second draw, `draws` is zero and the section says so rather than printing a
 * table of zeroes that would read as "the caller guessed perfectly".
 */
function renderDrawQuality<E extends Eligibility>(report: BaselineReport<E>): string {
  const d = report.caller.draw;
  const lines: string[] = ["### Anticipated-front draw quality (ADR-024)", ""];
  if (d.draws === 0) {
    lines.push(
      "Not applicable — this batch ran a caller that does not anticipate " +
        `(\`${report.provenance.callerVersion}\`). The offence's protection was built against the ` +
        "ACTUAL defensive card, which is `CALIBRATION-BACKLOG.md` entry 21's perfectly-informed " +
        "protection. Expect `unaccounted_rusher_rate`, `hot_route_rate` and `PICKUP_LOST` to be " +
        "structurally near zero.",
    );
    lines.push("");
    return lines.join("\n");
  }

  const pct = (n: number, of: number): string => (of === 0 ? "—" : `${((n / of) * 100).toFixed(2)}%`);
  const per = (n: number, of: number): string => (of === 0 ? "—" : (n / of).toFixed(4));

  lines.push(
    `${d.draws} anticipated fronts (${d.passDraws} on dropbacks, ${d.runDraws} on runs). ` +
      `Mean candidate pool ${per(d.poolSizeSum, d.draws)} cards.`,
  );
  lines.push("");
  lines.push(
    d.forcedDraws === 0
      ? "**No draw was FORCED.** A forced draw is one where the corpus offered a single card for " +
          "that situation in that personnel grouping, so the caller was right because it had no " +
          "alternative. There were none, which is what makes the exact-card rate below an honest " +
          "measure of the guess rather than partly a measure of corpus thinness. It is reported " +
          "whether or not it fires, because a rate that is zero and a rate nobody looked at are " +
          "different facts."
      : `**${pct(d.forcedDraws, d.draws)} of draws were FORCED** — the corpus offered a single ` +
          "card for that situation in that grouping, so the caller was right because it had no " +
          "alternative. Every match rate below is inflated by exactly that share; read them " +
          "together.",
  );
  lines.push("");
  lines.push("| axis | matched | what it captures |");
  lines.push("|---|---|---|");
  lines.push(
    `| exact card | ${pct(d.exactCard, d.draws)} | strictest reading; read beside the forced share above |`,
  );
  lines.push(
    `| front label | ${pct(d.sameFrontLabel, d.draws)} | playbook's own \`front\` string — coarser than a card, finer than a grouping |`,
  );
  lines.push(
    `| personnel grouping | 100.00% | **by construction, not by measurement** — the anticipation is constrained to it (\`caller/anticipate.ts\`) |`,
  );
  lines.push(
    `| rusher count | ${pct(d.sameRusherCount, d.draws)} | how many were coming, exactly |`,
  );
  lines.push(
    `| blitz class (≥5) | ${pct(d.sameBlitzClass, d.draws)} | whether the offence had ENOUGH bodies; same threshold as \`blitz_rate\` |`,
  );
  lines.push(
    `| coverage family | ${pct(d.sameCoverageFamily, d.draws)} | MAN/ZONE/MIXED/NONE. **Descriptive only** — nothing downstream of the caller reads the anticipated coverage |`,
  );
  lines.push(
    `| exact rusher set | ${pct(d.exactRusherSet, d.draws)} | the same MEN, which is what protection pairs on |`,
  );
  lines.push(
    `| mean rusher Jaccard | ${per(d.jaccardSum, d.draws)} | \`|∩| ÷ |∪|\` over rusher ids |`,
  );
  lines.push("");
  lines.push("| consequence | value | mechanic it feeds |");
  lines.push("|---|---|---|");
  lines.push(
    `| rushers missed (real ∖ expected) | ${d.missedRusherSum} total, ${per(d.missedRusherSum, d.draws)}/draw | §5.3 recognition and §7.4 step 3 — the starved branch |`,
  );
  lines.push(
    `| men expected who dropped (expected ∖ real) | ${d.phantomRusherSum} total, ${per(d.phantomRusherSum, d.draws)}/draw | ADR-026 — a protector with nobody to block |`,
  );
  lines.push(
    `| protection entries naming a non-rusher | ${d.protectorsInCoverage} | ADR-026, counted from the CALL rather than the card diff |`,
  );
  lines.push(
    `| dropbacks with ≥1 missed rusher | ${pct(d.passDrawsWithMissed, d.passDraws)} | should track \`unaccounted_rusher_rate\` |`,
  );
  lines.push(
    `| dropbacks with ≥1 idle protector | ${pct(d.passDrawsWithPhantom, d.passDraws)} | ADR-026's population |`,
  );
  lines.push(
    `| **dropbacks with BOTH** | **${pct(d.passDrawsWithBoth, d.passDraws)}** | the snaps where ADR-026's answer CHANGES AN OUTCOME rather than wasting a body |`,
  );
  lines.push("");
  lines.push(
    `Missed-rusher histogram: ${histogram(d.missedHistogram)}. ` +
      `Idle-protector histogram: ${histogram(d.phantomHistogram)}.`,
  );
  lines.push("");
  lines.push("| defensive personnel | draws | exact-card match |");
  lines.push("|---|---|---|");
  for (const [grouping, draws] of Object.entries(d.byPersonnel).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${grouping} | ${draws} | ${pct(d.exactByPersonnel[grouping] ?? 0, draws)} |`);
  }
  lines.push("");
  lines.push(
    "**What these do NOT capture** (`caller/anticipate.ts` states it at length): rusher " +
      "TECHNIQUE — the same man from a different alignment or side pairs to a different " +
      "protector, so a matched rusher can still be mispaired; STUNTS, which protection never " +
      "reads and the engine takes from the real card, so `STUNT_LOOPER` movement is not draw " +
      "quality; and the run game's analogue, since `instantiateRun` pairs by GAP rather than by " +
      "rusher identity.",
  );
  lines.push("");
  return lines.join("\n");
}

function histogram(counts: Readonly<Record<string, number>>): string {
  const entries = Object.entries(counts).sort((a, b) => Number(a[0]) - Number(b[0]));
  return entries.length === 0 ? "—" : entries.map(([k, v]) => `${k}:${v}`).join(" ");
}

/**
 * THE TREND SECTION — printed unconditionally, in all four states.
 *
 * Charter §4.1: *prefer a loud failure to a silent default.* A report that met a mismatched
 * carry-forward and simply rendered em dashes would be indistinguishable from a report that had
 * no predecessor at all, and the reader's conclusion — "the trend column hasn't started yet" —
 * would be wrong in the one case where being wrong matters. So the refusal is a section with a
 * heading, and it names every field that mismatched with both sides printed.
 */
function renderTrend<E extends Eligibility>(report: BaselineReport<E>): string {
  const lines: string[] = ["## Trend", ""];
  const trend = report.trend;
  switch (trend.kind) {
    case "NONE":
      lines.push(`No predecessor. ${trend.reason}`);
      break;
    case "ACCEPTED":
      lines.push(
        `Trending against \`${trend.previous.id}\`, which matches this run on every field of ` +
          `baseline identity (engine commit \`${trend.identity.engineCommit}\`, tunables ` +
          `\`${trend.identity.tunablesVersion}\`/\`${trend.identity.tunablesDigest}\`, caller ` +
          `\`${trend.identity.callerVersion}\`, league \`${trend.identity.leagueId}\`). ` +
          `Arrows are shown and its comfort streaks are inherited, so a band may ratchet.`,
      );
      break;
    case "RECONSTRUCTED":
      lines.push(
        `Trending against **${trend.previous.id}** — a RECONSTRUCTION. ${trend.reason}`,
        "",
        "Arrows are shown. Its comfort streaks are **not** inherited and no band can ratchet on " +
          "its evidence: `ratchetBand` is one-way, and a tightening taken on the strength of a " +
          "figure quoted from prose could not be undone.",
      );
      break;
    case "REFUSED":
      lines.push("```");
      lines.push(trend.message);
      lines.push("```");
      lines.push("");
      if (trend.mismatches.length > 0) {
        lines.push("| field | previous | this run | why it matters |");
        lines.push("|---|---|---|---|");
        for (const m of trend.mismatches) {
          lines.push(`| \`${m.field}\` | \`${m.previous}\` | \`${m.current}\` | ${m.why} |`);
        }
        lines.push("");
      }
      lines.push(
        "Every trend cell below reads **refused** rather than an em dash: an em dash means " +
          "*there was no predecessor*, which is a different fact.",
      );
      break;
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * The trend cell.
 *
 * `REFUSED` prints the word rather than an em dash. An em dash means "there was no predecessor",
 * which is a different fact, and a report that renders a refusal as an absence is the silent
 * drop this mechanism exists to prevent — the reader would conclude the trend column simply had
 * not started yet.
 */
function trendCell(report: BaselineReport<Eligibility>, evaluation: MetricEvaluation): string {
  if (report.trend.kind === "REFUSED") return "**refused**";
  if (evaluation.previousSim === undefined || evaluation.sim === null) return "—";
  const delta = evaluation.sim - evaluation.previousSim;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(4)}`;
}

/**
 * The trend slot, applied. Kept as a separate pass so a report with no predecessor and a report
 * with one go through the same code — a trend column that only exists on the second report is a
 * column nobody builds tooling against.
 *
 * It now takes only the report and reads the decision off it. The old signature took a second
 * `previous` argument, which meant `withTrend` could be handed a DIFFERENT predecessor from the
 * one `buildBaselineReport` used for the streaks — the arrows and the ratchet counters could
 * disagree about which report they descended from, and nothing would say so.
 */
export function withTrend<E extends Eligibility>(report: BaselineReport<E>): BaselineReport<E> {
  if (!mayInformArrow(report.trend)) return report;
  const previous = previousOf(report.trend);
  if (previous === undefined) return report;
  return {
    ...report,
    evaluations: report.evaluations.map((e) => {
      const before = previous.sim[e.metricId];
      return before === undefined ? e : { ...e, previousSim: before };
    }),
  };
}

/**
 * What the next report needs from this one — the numbers AND the proof they are still comparable.
 *
 * The numbers alone were `reports/baseline-0002.carry-forward.json`, and they were silently stale
 * within days. `identity` is what a successor's `decideTrend` checks; `context` is recorded for
 * the reader and for reproduction and is deliberately not part of the check (`identity.ts` gives
 * the reasons per field).
 *
 * Deterministic: no timestamp, no hostname, no run counter. The file is a pure function of the
 * report, so two runs of the same batch produce byte-identical carry-forwards and a diff means
 * something moved.
 */
export function carryForward<E extends Eligibility>(report: BaselineReport<E>): CarryForward {
  const sim: Record<string, number> = {};
  for (const e of report.evaluations) {
    if (e.sim !== null && Number.isFinite(e.sim)) sim[e.metricId] = e.sim;
  }
  return {
    format: CARRY_FORWARD_FORMAT,
    id: report.id,
    identity: report.identity,
    context: {
      seedDigest: report.provenance.seedDigest,
      batchSeed: report.provenance.batchSeed,
      games: report.provenance.games,
    },
    sim,
    comfortableStreak: report.comfortableStreak,
  };
}
