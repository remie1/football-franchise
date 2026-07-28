/** Tolerance bands (loose-and-ratchet) and the baseline report. */
import { describe, expect, it } from "vitest";
import {
  BandWidenedError,
  COMFORT_FRACTION,
  RATCHET_AFTER_REPORTS,
  evaluateMetric,
  openingBandTable,
  proposeRatchets,
  ratchetBand,
  updateComfortStreaks,
  type MetricEvaluation,
} from "../src/report/bands.js";
import {
  HeldOutReportCitedError,
  assertTuningReport,
  buildBaselineReport,
  carryForward,
  renderBaselineReport,
  withTrend,
} from "../src/report/baseline.js";
import { PREVIOUS_BASELINE, PREVIOUS_BASELINE_CITATIONS } from "../src/report/previous.js";
import { allMetrics, getMetric, isRegistered } from "../src/metrics/registry.js";
import type { RealInput } from "../src/metrics/realInput.js";
import { makeEvidence } from "../src/ingest/eligibility.js";
import type { Season } from "../src/ingest/seasons.js";
import type { PbpRow } from "../src/ingest/sources/pbp.js";
import type { ScheduleRow } from "../src/ingest/sources/schedules.js";
import {
  correlationFloor,
  relativeBand,
  samples,
  shapeBand,
  rate,
  categorical,
  type Metric,
  type MetricOutcome,
} from "../src/metrics/types.js";
import { emptyAccumulator } from "../src/metrics/collect.js";
import type { BatchProvenance } from "../src/harness/batch.js";
import "../src/metrics/index.js";

const metric = (over: Partial<Metric> = {}): Metric => ({
  id: "test_metric",
  tier: 1,
  definition: "a test metric with a definition long enough to print",
  unit: "%",
  toleranceBand: relativeBand(0.15),
  computeFromEvents: (): MetricOutcome => rate(50, 100),
  computeFromReal: (): MetricOutcome => rate(50, 100),
  ...over,
});

describe("band evaluation", () => {
  it("passes inside the band and marks a comfortable pass separately", () => {
    const inside = evaluateMetric(metric(), rate(52, 100), rate(50, 100));
    expect(inside.verdict).toBe("PASS_COMFORTABLE");
    const edge = evaluateMetric(metric(), rate(57, 100), rate(50, 100));
    expect(edge.verdict).toBe("PASS");
    expect(edge.comfortable).toBe(false);
  });

  it("distinguishes a NEW failure from one a backlog entry already claims", () => {
    const news = evaluateMetric(metric(), rate(90, 100), rate(50, 100));
    expect(news.verdict).toBe("FAIL");
    expect(news.detail).toContain("NO backlog entry");

    const known = evaluateMetric(
      metric({ knownDivergences: ["backlog 3"] }),
      rate(90, 100),
      rate(50, 100),
    );
    expect(known.verdict).toBe("FAIL_KNOWN");
    expect(known.detail).toContain("backlog 3");
  });

  it("carries a 95% interval on both sides", () => {
    const result = evaluateMetric(metric(), rate(50, 400), rate(50, 100));
    expect(result.simInterval?.low).toBeGreaterThan(0);
    expect(result.simN).toBe(400);
    expect(result.realN).toBe(100);
    // More observations, tighter interval — the property a report reader relies on.
    const simWidth = (result.simInterval?.high ?? 0) - (result.simInterval?.low ?? 0);
    const realWidth = (result.realInterval?.high ?? 0) - (result.realInterval?.low ?? 0);
    expect(simWidth).toBeLessThan(realWidth);
  });

  it("runs KS for a SHAPE band over samples and chi-squared over categories", () => {
    const values = Array.from({ length: 300 }, (_, i) => i / 300);
    const ks = evaluateMetric(
      metric({ toleranceBand: shapeBand(0.01) }),
      samples(values),
      samples([...values]),
    );
    expect(ks.deviationLabel).toContain("KS p");
    expect(ks.verdict).toBe("PASS_COMFORTABLE");

    const chi = evaluateMetric(
      metric({ toleranceBand: shapeBand(0.01) }),
      categorical({ a: 100, b: 100 }),
      categorical({ a: 100, b: 100 }),
    );
    expect(chi.deviationLabel).toContain("chi²");
  });

  it("says so rather than silently comparing means when a SHAPE band gets the wrong sample kind", () => {
    const wrong = evaluateMetric(metric({ toleranceBand: shapeBand(0.01) }), rate(1, 2), rate(1, 2));
    expect(wrong.verdict).toBe("NO_DATA");
    expect(wrong.detail).toContain("metric-definition error");
  });

  it("reports a metric with no target as an observation rather than grading it", () => {
    const observation = evaluateMetric(
      metric({ toleranceBand: correlationFloor(Number.NEGATIVE_INFINITY) }),
      samples([1, 2, 3]),
      samples([1, 2, 3]),
    );
    expect(observation.verdict).toBe("OBSERVATION");
  });

  it("marks a provenance-gated metric NOT_APPLICABLE with the reason", () => {
    const gated = evaluateMetric(
      metric({
        computeFromEvents: (): MetricOutcome => ({ reason: "PROVENANCE", detail: "needs derived ratings" }),
      }),
      { reason: "PROVENANCE", detail: "needs derived ratings" },
      rate(1, 2),
    );
    expect(gated.verdict).toBe("NOT_APPLICABLE");
    expect(gated.detail).toContain("derived ratings");
  });
});

describe("the ratchet", () => {
  it("tightens a relative band and refuses to widen one", () => {
    const band = relativeBand(0.15);
    const tighter = ratchetBand("m", band, 0.075, "r1", "two comfortable reports");
    expect(tighter.width).toBe(0.075);
    expect(tighter.lockedBy).toBe("r1");
    expect(tighter.history).toHaveLength(1);
    expect(() => ratchetBand("m", tighter, 0.2, "r2", "nope")).toThrow(BandWidenedError);
  });

  it("knows that tighter means HIGHER for a floor band", () => {
    const floor = shapeBand(0.01);
    expect(ratchetBand("m", floor, 0.05, "r1", "x").width).toBe(0.05);
    expect(() => ratchetBand("m", floor, 0.001, "r1", "x")).toThrow(BandWidenedError);

    const rho = correlationFloor(0.5);
    expect(ratchetBand("m", rho, 0.7, "r1", "x").width).toBe(0.7);
    expect(() => ratchetBand("m", rho, 0.3, "r1", "x")).toThrow(BandWidenedError);
  });

  it("proposes a tightening only after consecutive comfortable reports", () => {
    const comfortable = evaluateMetric(metric(), rate(51, 100), rate(50, 100));
    expect(comfortable.comfortable).toBe(true);
    expect(proposeRatchets([comfortable], {}, "r1")).toHaveLength(0);
    const after = proposeRatchets([comfortable], { test_metric: RATCHET_AFTER_REPORTS - 1 }, "r2");
    expect(after).toHaveLength(1);
    expect(after[0]?.to).toBe(0.15 * COMFORT_FRACTION);
  });

  it("resets a streak the moment a metric leaves the comfortable zone", () => {
    const uncomfortable = evaluateMetric(metric(), rate(57, 100), rate(50, 100));
    expect(updateComfortStreaks({ test_metric: 5 }, [uncomfortable])["test_metric"]).toBe(0);
  });

  it("opens every metric at whatever band it declares", () => {
    const table = openingBandTable(allMetrics());
    expect(table.entries["completion_pct"]?.width).toBe(0.15);
    expect(Object.keys(table.entries).length).toBe(allMetrics().length);
  });
});

// --- the report -------------------------------------------------------------

function realInput<E extends "TUNING" | "HELD_OUT">(eligibility: E): RealInput<E> {
  const pbp: PbpRow[] = [];
  const schedules: ScheduleRow[] = [];
  const seasons = [(eligibility === "TUNING" ? 2023 : 2025) as Season];
  return {
    eligibility,
    seasons,
    pbp: makeEvidence<PbpRow, E>(eligibility, pbp, seasons, []),
    schedules: makeEvidence<ScheduleRow, E>(eligibility, schedules, seasons, []),
  };
}

const provenance: BatchProvenance = {
  leagueId: "flat-60-32t",
  leagueProvenance: "FLAT_SYNTHETIC",
  leagueDescription: "32 teams, every attribute at 60",
  tunablesVersion: "DEFAULT_TUNABLES",
  tunablesDigest: "fnv1a:00000001",
  callerVersion: "v1",
  callerFourthDownVersion: "v1",
  scheduleKind: "SYNTHETIC_ROUND_ROBIN",
  season: 2024,
  games: 6,
  seedDigest: "fnv1a:deadbeef#6",
  batchSeed: "b1",
  workers: 1,
  executorName: "in-process",
  availabilityMatched: false,
  teamWeeksWithAbsences: 0,
};

const caller = {
  offensiveCalls: 100, defensiveCalls: 100, passCalls: 57, runCalls: 43,
  conceptRedraws: 2, fourthDownGo: 3, fourthDownPunt: 8, fourthDownFieldGoal: 4,
  backoff: { FULL: 60, NO_SCORE: 30, DOWN_DISTANCE: 10 },
};

const COMMIT = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

describe("the baseline report", () => {
  const report = buildBaselineReport({
    id: "baseline-0001",
    engineCommit: COMMIT,
    accumulator: emptyAccumulator(),
    provenance,
    caller,
    real: realInput("TUNING"),
  });

  it("evaluates every registered metric", () => {
    expect(report.evaluations).toHaveLength(allMetrics().length);
  });

  it("carries the eligibility of the evidence it was computed from", () => {
    expect(report.eligibility).toBe("TUNING");
    expect(() => assertTuningReport(report)).not.toThrow();
  });

  it("refuses to let a held-out report be cited as justification", () => {
    const heldOut = buildBaselineReport({
      id: "checkpoint-2025",
      engineCommit: COMMIT,
      accumulator: emptyAccumulator(),
      provenance,
      caller,
      real: realInput("HELD_OUT"),
    });
    expect(heldOut.eligibility).toBe("HELD_OUT");
    expect(() => assertTuningReport(heldOut)).toThrow(HeldOutReportCitedError);
  });

  it("states the tunables version, the caller version, the seeds and the league provenance", () => {
    const rendered = renderBaselineReport(report);
    expect(rendered).toContain("DEFAULT_TUNABLES");
    expect(rendered).toContain("fnv1a:deadbeef#6");
    expect(rendered).toContain("FLAT_SYNTHETIC");
    expect(rendered).toContain("MECHANIC CLAIMS ONLY");
  });

  it("prints the full band table every time, with the ratchet rule stated", () => {
    const rendered = renderBaselineReport(report);
    expect(rendered).toContain("## Band table");
    expect(rendered).toContain("loose-and-ratchet");
    expect(rendered).toContain("only ever move tighter");
    for (const m of allMetrics()) expect(rendered).toContain(`\`${m.id}\``);
  });

  it("prints the declared absences unconditionally", () => {
    const rendered = renderBaselineReport(report);
    expect(rendered).toContain("Declared absences");
    expect(rendered).toContain("coverage_quality_separation_at_throw");
    expect(rendered).toContain("Do not substitute");
    expect(rendered).toContain("coverage reach");
  });

  it("has a trend slot from report one, showing an em dash until there is a predecessor", () => {
    expect(renderBaselineReport(report)).toContain("| trend |");
    const next = withTrend(
      buildBaselineReport({
        id: "baseline-0002",
        engineCommit: COMMIT,
        accumulator: emptyAccumulator(),
        provenance,
        caller,
        real: realInput("TUNING"),
        trend: {
          kind: "RECONSTRUCTED",
          previous: { id: "baseline-0001", sim: { completion_pct: 0.44 }, comfortableStreak: {} },
          reason: "quoted from prose",
        },
      }),
    );
    const row = next.evaluations.find((e) => e.metricId === "completion_pct");
    expect(row?.previousSim).toBe(0.44);
  });

  it("lists new divergences separately from known ones", () => {
    const rendered = renderBaselineReport(report);
    expect(rendered).toContain("## New divergences");
  });

  it("reports the frozen caller's own diagnostics, including concept re-draws", () => {
    const rendered = renderBaselineReport(report);
    expect(rendered).toContain("concept re-draws");
    expect(rendered).toContain("Fourth downs: 3 go, 8 punt, 4 field goal");
  });

  it("hands the next report what it needs for the trend column", () => {
    const carried = carryForward(report);
    expect(carried.id).toBe("baseline-0001");
    expect(carried.comfortableStreak).toBeDefined();
  });

  it("prints the definition of every metric it grades", () => {
    const rendered = renderBaselineReport(report);
    expect(rendered).toContain("## Metric definitions");
    expect(rendered).toContain(getMetric("sack_rate").definition);
  });

  /**
   * `outsideDetail` already builds "already diagnosed: <entries>" from `knownDivergences`, so
   * appending the same list printed every backlog reference twice in every failing row. The
   * report's layout argument is that forty rows of "still open, see entry 3" is a MAP; a map that
   * says everything twice is one nobody reads.
   */
  it("names each backlog entry once in a failing row, and still shows them on a passing one", () => {
    const failing = evaluateMetric(
      { ...metric(), knownDivergences: ["backlog 42 (the thing)"] },
      rate(90, 100),
      rate(10, 100),
    );
    const passing = evaluateMetric(
      { ...metric(), knownDivergences: ["backlog 42 (the thing)"] },
      rate(50, 100),
      rate(50, 100),
    );
    const rendered = renderBaselineReport({
      ...report,
      evaluations: [failing, passing],
    });
    const failingLine = rendered.split("\n").find((l) => l.includes("already diagnosed")) ?? "";
    expect(failingLine.split("backlog 42").length - 1).toBe(1);
    // The passing row keeps its list: a metric that passes while an entry claims it is exactly
    // the row the first baseline warned about ("the pass is arithmetic, not health").
    expect(rendered).toContain("| PASS+ |");
    expect(rendered.split("backlog 42").length - 1).toBe(2);
  });
});

describe("the reconstructed predecessor", () => {
  it("carries only figures the backlog actually recorded, each with a citation", () => {
    for (const id of Object.keys(PREVIOUS_BASELINE.sim)) {
      expect(PREVIOUS_BASELINE_CITATIONS[id], `no citation for ${id}`).toBeDefined();
      expect(isRegistered(id), `${id} is not a registered metric`).toBe(true);
    }
    expect(Object.keys(PREVIOUS_BASELINE.sim).length).toBe(
      Object.keys(PREVIOUS_BASELINE_CITATIONS).length,
    );
  });

  it("cannot ratchet a band, because a ratchet is permanent and prose is not a report", () => {
    // The load-bearing refusal. `ratchetBand` only ever tightens and never widens, so a band
    // tightened on the strength of a reconstructed predecessor could not be undone. An empty
    // streak map means the reconstruction can inform a trend arrow and can never move a gate.
    expect(PREVIOUS_BASELINE.comfortableStreak).toEqual({});
    const comfortable = evaluateMetric(metric(), rate(50, 100), rate(50, 100));
    expect(comfortable.comfortable).toBe(true);
    expect(proposeRatchets([comfortable], PREVIOUS_BASELINE.comfortableStreak, "r1")).toHaveLength(0);
  });
});

describe("evaluation shape", () => {
  it("keeps the fields a report renderer needs on the evaluation itself", () => {
    const e: MetricEvaluation = evaluateMetric(metric(), rate(50, 100), rate(50, 100));
    expect(e.metricId).toBe("test_metric");
    expect(e.tier).toBe(1);
    expect(e.definition.length).toBeGreaterThan(0);
    expect(e.band.kind).toBe("RELATIVE");
  });
});
