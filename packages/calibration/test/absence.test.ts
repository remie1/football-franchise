/**
 * THE DECLARED-ABSENCE GUARD.
 *
 * These tests are the enforcement half of `metrics/absence.ts`. The failure mode being prevented
 * is specific: somebody finds coverage reach sitting in the event stream, notices the metric
 * library has no coverage metric, and fills the gap with the available-but-wrong number.
 *
 * Three layers are asserted:
 *   1. `registerMetric` refuses a candidate that names a forbidden substitute, with ADR-019's
 *      evidence in the message;
 *   2. `getMetric` on an absent id throws the whole entry rather than returning undefined;
 *   3. the metric SOURCE TREE contains none of the forbidden spellings — so the guard cannot be
 *      routed around by registering under an innocuous id and computing the wrong thing inside.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AbsentMetricError,
  COVERAGE_QUALITY_ABSENCE,
  ForbiddenSubstituteError,
  METRIC_ABSENCES,
  absenceById,
  assertNotForbiddenSubstitute,
  forbiddenSpellings,
  renderAbsences,
} from "../src/metrics/absence.js";
import { getMetric, registerMetric, unregisterMetricForTest } from "../src/metrics/registry.js";
import { rate, relativeBand, type Metric, type MetricOutcome } from "../src/metrics/types.js";
import "../src/metrics/index.js";

const stub = (id: string, definition: string): Metric => ({
  id,
  tier: 1,
  definition,
  unit: "%",
  toleranceBand: relativeBand(),
  computeFromEvents: (): MetricOutcome => rate(1, 2),
  computeFromReal: (): MetricOutcome => rate(1, 2),
});

describe("declared absences", () => {
  it("names coverage quality as separation at the throw, not as anything grid-shaped", () => {
    expect(COVERAGE_QUALITY_ABSENCE.definition).toContain("separation");
    expect(COVERAGE_QUALITY_ABSENCE.definition).toContain("CONTESTED");
    expect(COVERAGE_QUALITY_ABSENCE.engineMustEmit.length).toBeGreaterThan(0);
    // The real side EXISTS. That is the sharp form of the statement: there is a target and
    // nothing to compare to it.
    expect(COVERAGE_QUALITY_ABSENCE.realSideStatus.available).toBe(true);
    expect(COVERAGE_QUALITY_ABSENCE.forbiddenSubstitutes.map((f) => f.name)).toEqual([
      "coverage reach",
      "coverage percentage",
      "grid ownership",
      "openness",
    ]);
  });

  it("carries ADR-019's decisive evidence on the reach substitute", () => {
    const reach = COVERAGE_QUALITY_ABSENCE.forbiddenSubstitutes[0];
    expect(reach?.evidence).toContain("97.6%");
    expect(reach?.evidence).toContain("92.7%");
    expect(reach?.whyItIsWrong).toContain("stretched thinner");
  });

  it("every absence states a reason, an emission requirement or a real-side gap, and a reference", () => {
    for (const absence of METRIC_ABSENCES) {
      expect(absence.whyAbsent.length).toBeGreaterThan(20);
      expect(absence.references.length).toBeGreaterThan(0);
      expect(absence.forbiddenSubstitutes.length).toBeGreaterThan(0);
      expect(
        absence.engineMustEmit.length > 0 || !absence.realSideStatus.available,
      ).toBe(true);
    }
  });
});

describe("the registration guard", () => {
  it("refuses a metric whose id names coverage reach", () => {
    expect(() => registerMetric(stub("coverage_reach", "fraction of the grid a coverage owns")))
      .toThrow(ForbiddenSubstituteError);
  });

  it("refuses camelCase and snake_case spellings alike", () => {
    for (const id of ["coverageReach", "zone_coverage_percentage", "gridOwnership", "mean_openness"]) {
      expect(() => registerMetric(stub(id, "a number about coverage"))).toThrow(
        ForbiddenSubstituteError,
      );
    }
  });

  it("refuses a metric whose DEFINITION names one, even if the id is innocuous", () => {
    expect(() =>
      registerMetric(
        stub("defensive_quality", "the share of the field the coverage reaches, per snap"),
      ),
    ).toThrow(ForbiddenSubstituteError);
  });

  it("puts the evidence in the error, so the reader does not have to go looking", () => {
    let message = "";
    try {
      registerMetric(stub("coverage_reach", "x"));
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("97.6%");
    expect(message).toContain("separation");
    expect(message).toContain("ADR-019");
  });

  it("allows a STRUCTURAL description through the stated escape hatch, and only then", () => {
    const id = "structural_test_reach_description";
    expect(() =>
      registerMetric(
        stub(id, "structural: what the cards say the coverage reaches. Not a quality measure."),
        { allowStructural: true },
      ),
    ).not.toThrow();
    unregisterMetricForTest(id);

    // The flag alone is not enough: the id has to say `structural` too, because the id is all a
    // report table shows.
    expect(() =>
      registerMetric(stub("sneaky_coverage_reach", "coverage reach"), { allowStructural: true }),
    ).toThrow();
  });

  it("refuses to register a metric under an absence's own id", () => {
    expect(() => registerMetric(stub(COVERAGE_QUALITY_ABSENCE.id, "anything"))).toThrow(
      AbsentMetricError,
    );
  });
});

describe("lookup", () => {
  it("throws the whole absence entry when an absent metric is requested", () => {
    let error: AbsentMetricError | null = null;
    try {
      getMetric(COVERAGE_QUALITY_ABSENCE.id);
    } catch (e) {
      error = e as AbsentMetricError;
    }
    expect(error).toBeInstanceOf(AbsentMetricError);
    expect(error?.message).toContain("DECLARED ABSENCE");
    expect(error?.message).toContain("DO NOT substitute");
    expect(error?.message).toContain("coverage reach");
  });

  it("resolves absences by id", () => {
    expect(absenceById("coverage_quality_separation_at_throw")).toBe(COVERAGE_QUALITY_ABSENCE);
    expect(absenceById("nope")).toBeUndefined();
  });

  it("renders an absences section that names every forbidden substitute", () => {
    const rendered = renderAbsences().toLowerCase();
    for (const absence of METRIC_ABSENCES) {
      expect(rendered).toContain(absence.definition.slice(0, 40).toLowerCase());
      for (const substitute of absence.forbiddenSubstitutes) {
        expect(rendered).toContain(substitute.name.toLowerCase());
        expect(rendered).toContain(substitute.evidence.slice(0, 30).toLowerCase());
      }
    }
    expect(renderAbsences()).toContain("Declared absences");
  });
});

describe("the metric source tree", () => {
  /**
   * The registration guard checks a metric's id and definition. This checks the CODE, because a
   * metric registered under an honest id can still compute the wrong number inside — and that is
   * the version of this mistake nobody would catch in review.
   *
   * `absence.ts` is excluded: it is where the forbidden names are defined.
   */
  it("contains no forbidden spelling outside absence.ts", () => {
    const dir = resolve(import.meta.dirname, "..", "src", "metrics");
    const offenders: string[] = [];
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".ts") || file === "absence.ts") continue;
      const text = readFileSync(join(dir, file), "utf8");
      for (const spelling of forbiddenSpellings()) {
        // The narrative sections legitimately DISCUSS these names; what must not appear is one
        // being computed. So the check is on identifier-shaped occurrences only.
        const identifier = spelling.replace(/[^A-Za-z0-9_]/g, "");
        if (identifier.length < 6) continue;
        const pattern = new RegExp(`\\b${identifier}\\s*[=(:]`, "i");
        if (pattern.test(text)) offenders.push(`${file}: ${spelling}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("assertNotForbiddenSubstitute is exported and usable by anything registering a number", () => {
    expect(() => assertNotForbiddenSubstitute("route openness index", "test")).toThrow(
      ForbiddenSubstituteError,
    );
    expect(() => assertNotForbiddenSubstitute("completion percentage", "test")).not.toThrow();
  });
});
