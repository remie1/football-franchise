/**
 * THE DOC-CONFORMANCE REGISTER'S OWN GATE — free tier, runs on every push.
 *
 * It asserts COMPLETENESS and nothing else. Charter §4.1's eliminated-vs-bounded rule wants the
 * class stated rather than the outcome, so:
 *
 *   ELIMINATED — a numeric leaf of `Tunables` that no rule classifies, and a rule that no leaf
 *   matches. Both are structural: the walk is over the committed tree, so a cell added tomorrow
 *   fails here and a cell deleted tomorrow fails here too.
 *
 *   NOT ELIMINATED — whether any classification is CORRECT. Each rule is a hand-authored reading of
 *   `docs/design/match-engine.md`, and Charter §4.1 records that hand-enumerated lists in this repo
 *   have been wrong every single time they have been checked. Nothing here can catch a misread; the
 *   `docRef` on every rule exists so the next reader can falsify one in a single lookup.
 *
 * The census numbers are recorded rather than derived-and-asserted-loosely, deliberately: a bare
 * `expect(unclassified).toEqual([])` would stay green if the walk silently narrowed (the
 * implicit-coverage family, §4.1). Pinning the denominator means a walk that stops descending
 * reddens.
 */
import { describe, expect, it } from "vitest";
import {
  MISSING_CELLS,
  REGISTER,
  SCALE_AUDIT_FINDINGS,
  auditRegister,
  leafCensus,
  numericLeaves,
} from "../src/knownTruth/docConformance.js";

/**
 * The tree as committed at the audit. NOT a target — a denominator. If it moves, the register was
 * measured against a different tree and the reading needs re-doing, which is the whole point of
 * pinning it.
 */
const RECORDED_CENSUS = { numbers: 699, strings: 283, booleans: 126 } as const;

describe("doc-conformance register", () => {
  it("classifies every numeric leaf of the committed tunables tree", () => {
    const audit = auditRegister();
    expect(audit.unclassified).toEqual([]);
    expect(audit.classified).toBe(audit.census.numbers);
  });

  it("carries no stale rule — a deleted cell reddens the register, not just an added one", () => {
    expect(auditRegister().deadRules).toEqual([]);
  });

  it("pins the leaf census, so a walk that quietly narrows cannot pass", () => {
    expect(leafCensus()).toEqual(RECORDED_CENSUS);
    expect(numericLeaves()).toHaveLength(RECORDED_CENSUS.numbers);
  });

  it("names no finding that does not exist, and no cell that does not exist", () => {
    const audit = auditRegister();
    expect(audit.danglingFindings).toEqual([]);
    expect(audit.danglingCells).toEqual([]);
  });

  it("every finding is reachable from at least one register rule or is declared beside the tree", () => {
    // SA-15 is a KEY-SET finding: the defect is a key the table does not have, so it is anchored to
    // a sibling key rather than to the missing one. SA-R2's two cells are both registered.
    const named = new Set(
      REGISTER.map((r) => r.finding).filter((id): id is string => id !== undefined),
    );
    const unreferenced = SCALE_AUDIT_FINDINGS.filter((f) => !named.has(f.id)).map((f) => f.id);
    expect(unreferenced).toEqual([]);
  });

  it("records the TABLE_SHAPE population — RIDER 1's whole subject", () => {
    const audit = auditRegister();
    // Recorded, not asserted loosely: this list IS the finding, and it must move only on purpose.
    expect([...audit.tableShapeCells].sort()).toEqual(
      [
        "ballCarrier.catchTransition.byAccuracyBand.MISS",
        "ballCarrier.contests.secondLevel.bands.0.maxYards",
        "ballCarrier.contests.secondLevel.bands.0.minYards",
        "ballCarrier.contests.yac.bands.0.maxYards",
        "ballCarrier.contests.yac.bands.0.minYards",
        "ballCarrier.yacMultiplierByAccuracyBand.MISS",
        "ballCarrier.zones.3.widthYards",
        "pocket.readCapacityDelta.COLLAPSING",
        "pocket.readCapacityDelta.IMMEDIATE",
        "release.bands.6.delaySeconds",
        "throwExec.accuracy.bands.6.catchMod",
        "throwExec.accuracy.bands.6.defenderContestMod",
        "throwExec.accuracy.bands.6.difficulty",
        "throwExec.armRequirements.0.minAirYards",
        "throwExec.armRequirements.0.minArmStrength",
        "throwExec.armRequirements.1.minAirYards",
        "throwExec.armRequirements.1.minArmStrength",
        "tippedBall.qualityBands.5.speedCheckFromDistance",
      ].sort(),
    );
  });

  it("keeps the doc-side blind spot visible — rules the table never got a cell for", () => {
    // A walk of the tree cannot find these. The count is pinned so that deleting one requires
    // saying so, exactly as `retiredRed` does in the band gate.
    expect(MISSING_CELLS.map((m) => m.id)).toEqual([
      "MC-01",
      "MC-02",
      "MC-03",
      "MC-04",
      "MC-05",
      "MC-06",
      "MC-07",
    ]);
  });
});
