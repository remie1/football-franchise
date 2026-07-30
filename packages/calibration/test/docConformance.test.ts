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
 *
 * ============ WHAT THIS GATE PINS, AND WHAT IT DELIBERATELY DOES NOT (ADR-041) ============
 *
 * The census used to pin all three leaf types as one object — `{ numbers, strings, booleans }`.
 * ADR-040's SA-13 re-keyed `angleByThrowType` (four `ThrowType` leaves) to `angleByContestPosition`
 * (three `ContestPosition` leaves) and this gate went RED at `strings: 283 → 282`, with **`numbers`
 * unchanged**. Applying Charter §4.1's own falsifiable test — *does a change to the SUBJECT
 * automatically invalidate the check?* — to each pin separately is what decides the shape:
 *
 *   `numbers` — **PINNED, and restating is the right shape.** It is the DENOMINATOR of the totality
 *   claim one test above. Without it, `classified === census.numbers` says "N of N", which is true
 *   of every N including a walk that found six cells. `unclassified` and `deadRules` between them
 *   already catch a cell entering or leaving a NARROW rule; what neither can catch is a cell
 *   entering or leaving the interior of a BLOCK rule (`game.*` is 84 cells), and that is exactly the
 *   population this number defends. It cannot go stale silently: any change to its subject reddens
 *   it. That is the opposite of the drifting copy §4.1's derivation corollary is about.
 *
 *   `strings` / `booleans` — **NOT PINNED. The gate was asserting an invariant the register does not
 *   hold.** This file classifies no string and no boolean; they are a DECLARED EXCLUSION. Pinning
 *   the cardinality of an excluded population asserts that its shape never changes, which is not a
 *   claim the register makes and cannot defend — and the cost is not merely a false red. **The red
 *   could not distinguish its own two causes.** `282` is what you get from a legitimate re-key AND
 *   from a walk that stopped descending into a string-only subtree, and the only repair available
 *   for either is to type a different number. A check whose sole remedy is transcription is how
 *   stale copies are manufactured.
 *
 * TWO THINGS REPLACE IT, and both are derived rather than restated:
 *
 *   1. **`census.untyped` must be empty.** This is what "the walk did not quietly narrow" actually
 *      means, and it fails at a PATH rather than as an integer discrepancy. The old walk's `else if`
 *      chain dropped `null`, `undefined`, functions and non-plain objects with no trace.
 *   2. **`numericLeafPathDigest` is pinned beside the count**, because ⚠ **the count was proved
 *      blind by the very dispatch that reddened it.** ADR-040 removed `qb.awarenessVariance.d20Offset`
 *      and added `qb.awarenessVariance.baseHalfWidth` — a NET ZERO change under one block rule. The
 *      cardinality held at 699, `unclassified` stayed empty, `deadRules` stayed empty, and a cell
 *      that did not exist the day before entered the tree wearing a `DOC_VERBATIM` note written
 *      about a different cell. Nothing reddened. A cardinality cannot see a swap.
 *
 * WHAT IS STILL NOT COVERED, said out loud: string-valued MAPPING tables. SA-13's worse half — the
 * one that made a touch pass harder to deflect than a bullet — lived entirely in one, and this
 * register's whole contact with it was a unit of a string count. Backlog 51 owns closing that, by
 * READING the tables against the doc; manufacturing ninety-odd hand-written rules to satisfy a
 * count would be the artefact §4.1 says has been wrong every time it has been checked.
 */
import { describe, expect, it } from "vitest";
import {
  MISSING_CELLS,
  REGISTER,
  SCALE_AUDIT_FINDINGS,
  auditFindingRulings,
  auditRegister,
  leafCensus,
  numericLeafPathDigest,
  numericLeaves,
  type ScaleAuditFinding,
} from "../src/knownTruth/docConformance.js";

/**
 * The tree as committed at the audit. NOT a target — a denominator. If it moves, the register was
 * measured against a different tree and the reading needs re-doing, which is the whole point of
 * pinning it.
 */
const RECORDED_NUMERIC_CENSUS = 699;

/**
 * The same subject as a SET rather than a size. Re-cut at ADR-040 (`d20Offset` → `baseHalfWidth`).
 * When this reddens and the count does not, a cell was SWAPPED: diff `numericLeafPaths()` against
 * `git diff packages/engine/src/tunables.ts` and re-read the affected rule against the doc.
 */
const RECORDED_NUMERIC_PATH_DIGEST = "fnv1a:cedf4eb9";

describe("doc-conformance register", () => {
  it("classifies every numeric leaf of the committed tunables tree", () => {
    const audit = auditRegister();
    expect(audit.unclassified).toEqual([]);
    expect(audit.classified).toBe(audit.census.numbers);
  });

  it("carries no stale rule — a deleted cell reddens the register, not just an added one", () => {
    expect(auditRegister().deadRules).toEqual([]);
  });

  it("pins the numeric denominator, so `N of N` cannot pass for a walk that found six cells", () => {
    expect(leafCensus().numbers).toBe(RECORDED_NUMERIC_CENSUS);
    expect(numericLeaves()).toHaveLength(RECORDED_NUMERIC_CENSUS);
  });

  it("pins the numeric leaf PATH SET, because a cardinality cannot see a swap", () => {
    // ADR-040: `d20Offset` out, `baseHalfWidth` in, both under `qb.awarenessVariance.*`, net zero.
    // The count held and a new cell inherited a stale classification in silence.
    expect(numericLeafPathDigest()).toBe(RECORDED_NUMERIC_PATH_DIGEST);
  });

  it("declares its exclusion TOTALLY — every leaf lands in one of the three buckets", () => {
    const census = leafCensus();
    // The derived form of "the walk did not narrow": a leaf the typology cannot place is named at
    // its path instead of vanishing from a count. `null`, `undefined`, a function, a `Map`.
    expect(census.untyped).toEqual([]);
    // The exclusion is REAL, and reported rather than pinned — see this file's header for why
    // pinning the cardinality of a population the register does not classify was the wrong gate.
    expect(census.strings).toBeGreaterThan(0);
    expect(census.booleans).toBeGreaterThan(0);
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

  it("cannot mark a finding RULED without naming the ruling", () => {
    // Structural, per Charter §4.1: "this was decided" must never become a thing somebody
    // remembered. A finding is retired WITH its provenance or it is not retired.
    const uncited = SCALE_AUDIT_FINDINGS.filter(
      (f) => f.status !== "OPEN" && (f.ruling === undefined || f.ruling.trim() === ""),
    ).map((f) => f.id);
    expect(uncited).toEqual([]);
    // And the converse: an OPEN finding citing a ruling is a status that went stale.
    const overCited = SCALE_AUDIT_FINDINGS.filter(
      (f) => f.status === "OPEN" && f.ruling !== undefined,
    ).map((f) => f.id);
    expect(overCited).toEqual([]);
  });

  it("cannot mark a finding RULED without pinning the values it was ruled about", () => {
    // ADR-047. The complement of the test above: naming WHO ruled is not the same as naming WHAT
    // was ruled, and the second is the half that goes stale. `ruledValues` is required on every
    // non-OPEN finding and forbidden on an OPEN one.
    const audit = auditFindingRulings();
    expect(audit.unpinned).toEqual([]);
    expect(audit.overPinned).toEqual([]);
    // Pin the SET, not the size: a ruling whose scope grew may not go on quoting the old list.
    // SA-08's did — four cells in one table became thirteen across two.
    expect(audit.cellSetMismatch).toEqual([]);
    expect(audit.danglingRuledPaths).toEqual([]);
  });

  it("every ruled cell still holds the value its ruling was made about", () => {
    // The staleness check is `applyTunablePatch`'s, not a comparison restated here — the same trick
    // `bandTables.ts` uses for the adjudicated inversions, so both registers fail the same way.
    expect(auditFindingRulings().drifted).toEqual([]);
  });

  it("no finding still calls itself OWED after its cells have landed", () => {
    // ⚠ THIS IS THE ARM THAT WOULD HAVE FIRED. SA-08 sat at RULED_OWED — "the cells still hold
    // their pre-ruling values" — for a dispatch after every one of its cells had moved, and every
    // test in this package stayed green, because nothing compiles against a register.
    expect(auditFindingRulings().owedButLanded).toEqual([]);
  });

  it("REDDENS on the case it exists for — a stale OWED status over a landed tree", () => {
    // Charter §4.1: an instrument with no failing case is not yet an instrument, and reading one
    // tells you what it CLAIMS to check. There is no live RULED_OWED finding, so the assertion
    // above is vacuous today; this is the case that makes it real. The synthetic finding is SA-08
    // exactly as it stood before this dispatch: OWED, over cells the engine has already moved.
    const stale: ScaleAuditFinding = {
      id: "SYNTHETIC-OWED",
      status: "RULED_OWED",
      ruling: "synthetic — the failing case for auditFindingRulings",
      klass: "DOC_CONTRADICTION",
      docRef: "§9.3 vs §8.4",
      cells: ["manCoverage.bands.3.openness"],
      ruledValues: [{ path: "manCoverage.bands.3.openness", value: 30 }],
      headline: "the shape of SA-08 before ADR-045 landed: ruled, owed, and already implemented.",
    };
    expect(auditFindingRulings([stale]).owedButLanded).toEqual(["SYNTHETIC-OWED"]);

    // …and the other three arms, each on its own case, so a green report cannot mean "the checker
    // returned empty arrays for a reason unrelated to the finding".
    const drifted: ScaleAuditFinding = {
      ...stale,
      id: "SYNTHETIC-DRIFTED",
      status: "RULED_IMPLEMENTED",
      ruledValues: [{ path: "manCoverage.bands.3.openness", value: 40 }],
    };
    expect(auditFindingRulings([drifted]).drifted).toHaveLength(1);
    expect(auditFindingRulings([drifted]).drifted[0]).toContain("manCoverage.bands.3.openness");

    const { ruledValues: _dropped, ...withoutValues } = stale;
    const unpinned: ScaleAuditFinding = { ...withoutValues, id: "SYNTHETIC-UNPINNED" };
    expect(auditFindingRulings([unpinned]).unpinned).toEqual(["SYNTHETIC-UNPINNED"]);

    const mismatched: ScaleAuditFinding = {
      ...stale,
      id: "SYNTHETIC-MISMATCH",
      status: "RULED_IMPLEMENTED",
      cells: ["manCoverage.bands.3.openness", "manCoverage.bands.4.openness"],
    };
    expect(auditFindingRulings([mismatched]).cellSetMismatch).toEqual([
      "SYNTHETIC-MISMATCH manCoverage.bands.4.openness",
    ]);

    const dangling: ScaleAuditFinding = {
      ...stale,
      id: "SYNTHETIC-DANGLING",
      status: "RULED_IMPLEMENTED",
      cells: ["manCoverage.bands.99.openness"],
      ruledValues: [{ path: "manCoverage.bands.99.openness", value: 30 }],
    };
    expect(auditFindingRulings([dangling]).danglingRuledPaths).toEqual([
      "SYNTHETIC-DANGLING manCoverage.bands.99.openness",
    ]);
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
