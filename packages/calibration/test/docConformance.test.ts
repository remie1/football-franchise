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
 * ============ ⛔ ADR-048: THE PAIR ABOVE EARNED ITSELF, AND THE CLASSIFICATION DID NOT ============
 *
 * Seven `route.contestGain.*` cells landed. The catch-all `route.*` — `STRUCTURAL`, §8.4, *"Openness
 * clamps at §8.4's 0-100 scale"* — matched all seven and reported them **classified**;
 * `unclassified` was empty, `deadRules` was empty, and the note was false of every one of them.
 * **The count and the path digest went red. Nothing else did.**
 *
 * > **OWNER, July 2026:** *"The classification rule failed and the guard that exists BECAUSE
 * > classification fails caught it. That's defense-in-depth working exactly as intended — and it is
 * > the FIRST TIME IN THIS PROJECT A SECOND LAYER HAS CAUGHT WHAT THE FIRST MISSED rather than the
 * > first layer catching everything."*
 *
 * ADR-041's argument for keeping a restated number was that it *"cannot go stale silently: any
 * change to its subject reddens it."* That was written as a defence of a denominator. It turned out
 * to be a defence of the whole register, on a failure mode ADR-041 did not anticipate — and the
 * reason it worked is that **its subject is the TREE, not the reading**, so it is independent of
 * every judgement the register makes. Two layers that fail for the same reason are one layer.
 *
 * **AND THE RULING THAT FOLLOWED, which is why `classified === census.numbers` is gone from this
 * file:** *a prefix rule is a classification that cannot be wrong, which means it classifies
 * nothing.* Prefix-matched cells are now a distinct reported population — see the three tests below
 * the totality identity, and `UNIFORM_REGIONS` for the 32 catch-alls that argued their way out.
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
  UNIFORM_REGIONS,
  absorbedBy,
  absorbedCellDigest,
  absorbingBlockRules,
  auditFindingRulings,
  auditRegister,
  blockRuleAbsorption,
  blockRuleAbsorptionPins,
  classify,
  leafCensus,
  numericLeafPathDigest,
  numericLeafPaths,
  numericLeaves,
  type RegisterRule,
  type ScaleAuditFinding,
} from "../src/knownTruth/docConformance.js";

/**
 * The tree as committed at the audit. NOT a target — a denominator. If it moves, the register was
 * measured against a different tree and the reading needs re-doing, which is the whole point of
 * pinning it.
 *
 * **699 → 706 at ADR-048** (roadmap 2a, contest-conditioned openness gain). Re-recorded as the RULED
 * state: the owner ruled the shape on ADR-046, the engine derived the ladder in ADR-048 §2.2/§2.3,
 * and §8.7 of `docs/design/match-engine.md` carries the amendment. Not a transcription — the seven
 * cells are named as a SET below and each is classified by a rule written about it.
 *
 * **706 → 714 at ADR-052/053.** `resultTierLadder` widened from nine rungs to seventeen (the
 * engine-scope-derived ladder, ADR-053); each rung is one numeric leaf (`minMargin`) under the
 * SAME `resultTierLadder.*` rule as before, so the eight new rungs are eight new numeric leaves
 * with nowhere new to be classified — `resultTierLadder.*` is a `UNIFORM_REGIONS` entry (below)
 * whose `why` already reads "True of any rung added later", so no rule text changed either.
 *
 * **714 → 715 at CALIBRATION-BACKLOG entry 73.** One new leaf,
 * `arrival.containRetiresAfterConsecutiveContains`. Named individually below (`ENTRY_73_ADDED_PATH`)
 * and classified by a rule written about it — see that rule's comment and the new `DERIVED_MECHANIC`
 * provenance value for why neither `arrival.*`'s catch-all nor any of the other seven categories fit.
 */
const RECORDED_NUMERIC_CENSUS = 715;

/**
 * The same subject as a SET rather than a size. Re-cut at ADR-040 (`d20Offset` → `baseHalfWidth`),
 * again at ADR-048 (`route.contestGain.*`, +7), again at ADR-052/053 (`resultTierLadder`, +8 new
 * rung indices), again at CALIBRATION-BACKLOG entry 73 (`arrival.containRetiresAfterConsecutiveContains`, +1).
 * When this reddens and the count does not, a cell was SWAPPED: diff `numericLeafPaths()` against
 * `git diff packages/engine/src/tunables.ts` and re-read the affected rule against the doc.
 */
const RECORDED_NUMERIC_PATH_DIGEST = "fnv1a:66543cf7";

/**
 * ⚠ **THE RE-RECORD, AS A SET AND NOT AS A COUNT** — §4.1's count-blindness corollary applied to the
 * act of re-recording, which is where the previous one went wrong.
 *
 * ADR-041 added the census/digest pair, and at ADR-048 the pair **worked**: both went red. What did
 * NOT work is the CLASSIFICATION — the catch-all `route.*` (`STRUCTURAL`, *"Openness clamps at
 * §8.4's 0-100 scale"*) matched all seven of these and reported them classified, so `unclassified`
 * and `deadRules` stayed empty and the totality gate stayed green while carrying a note that is
 * false of every one of them.
 *
 * So the delta is recorded by NAME. A `+7` next to a re-typed digest is a transcription; a named set
 * with a rule per member is a reading, and the difference is the whole finding.
 */
const ADR_048_ADDED_PATHS: readonly string[] = [
  "route.contestGain.burstSteps",
  "route.contestGain.byContest.EVEN.burst",
  "route.contestGain.byContest.EVEN.steady",
  "route.contestGain.byContest.IN_FRONT.burst",
  "route.contestGain.byContest.IN_FRONT.steady",
  "route.contestGain.byContest.TRAILING.burst",
  "route.contestGain.byContest.TRAILING.steady",
];

/**
 * CALIBRATION-BACKLOG entry 73's single cell, named the same way ADR-048's seven were — a `+1` next
 * to a re-typed digest would be a transcription; a named path with a rule written about it is a
 * reading. See `docs/design/match-engine.md` §7.1's `DERIVED MECHANIC` note and this cell's rule in
 * `REGISTER` for the classification argument.
 */
const ENTRY_73_ADDED_PATH = "arrival.containRetiresAfterConsecutiveContains";

describe("doc-conformance register", () => {
  it("accounts for every numeric leaf — and no longer calls a PREFIX MATCH a classification", () => {
    // ⛔ OWNER RULING, July 2026: "a prefix rule is a classification that cannot be wrong, which
    // means it classifies nothing. Treat every catch-all as an UNCLASSIFIED REGION WEARING A
    // CLASSIFICATION'S NAME." So the old `classified === census.numbers` is GONE — it was true on
    // the day seven `route.contestGain.*` cells entered wearing a note about a clamp.
    const audit = auditRegister();
    expect(audit.unclassified).toEqual([]);
    // The identity, which is what totality actually means now. Four populations, one denominator.
    expect(
      audit.classifiedNarrow +
        audit.classifiedUniform +
        audit.absorbed.length +
        audit.unclassified.length,
    ).toBe(audit.census.numbers);
    expect(audit.classified).toBe(audit.classifiedNarrow + audit.classifiedUniform);
    // A `UNIFORM` claim about a rule that does not exist is a claim about nothing.
    expect(audit.danglingUniformRegions).toEqual([]);
  });

  it("REPORTS the absorbed population as its own number, because that is the honest state", () => {
    // ⚠ THIS IS NOT A TARGET OF ZERO AND MUST NOT BECOME ONE BY TRANSCRIPTION. 206 of 706 cells —
    // NEARLY THREE IN TEN — are matched only by a prefix rule that has not argued its note
    // generalises. Folding them into `classified` is precisely what made ADR-048's seven cells
    // invisible. The number goes DOWN when a rule earns `UNIFORM` with a written argument, or when
    // its cells are named individually. It goes UP when a new catch-all is written, and it should.
    const audit = auditRegister();
    // 227 → 228 at CALIBRATION-BACKLOG entry 73: one narrow rule added for
    // `arrival.containRetiresAfterConsecutiveContains`, named ABOVE the `arrival.*` catch-all so it
    // does not fall into `classifiedUniform` instead (see that rule's comment). `classifiedUniform`
    // below is UNCHANGED by this cell for exactly that reason.
    expect(audit.classifiedNarrow).toBe(228);
    // 273 → 281 at ADR-052/053: `resultTierLadder.*` is a `UNIFORM_REGIONS` entry (its `why` already
    // covers "any rung added later"), so the eight new rungs from the seventeen-rung ladder land
    // here rather than in `classifiedNarrow` or `absorbed`. `classifiedNarrow` and `absorbed` are
    // untouched — neither population's membership depends on `resultTierLadder`'s arity.
    expect(audit.classifiedUniform).toBe(281);
    expect(audit.absorbed).toHaveLength(206);
    // The SET, not the size — a swap inside the absorbed region holds the count and moves this.
    expect(absorbedCellDigest()).toBe("fnv1a:f159870b");
  });

  it("pins WHICH rules are absorbing — the register's own to-do list", () => {
    // ⚠ THE SHAPE OF THIS LIST IS THE FINDING, and it is the opposite of the intuition: it is
    // dominated by `DOC_VERBATIM`. A transcription is inherently a claim about the rows that were
    // there to transcribe, so it cannot generalise to a row added tomorrow — whereas "the doc
    // specifies nothing in this block" covers cells nobody has written yet. THE REGISTER IS ON
    // FIRMEST GROUND EXACTLY WHERE THE DOC IS EMPTIEST.
    expect(absorbingBlockRules()).toEqual([
      "traitBonuses.*",
      "clock.*",
      "zoneModel.verticalUpperYards.*",
      "presnap.blitzRecognition.disguise.*",
      "passRush.bands.*",
      "passRush.*",
      "stunt.complexity.*",
      "blitzPickup.*",
      "pocket.accuracyModifier.*",
      "pocket.readCapacityDelta.*",
      "release.bands.*",
      "route.readySeconds.*",
      "qb.extraReads.*",
      // ⚠ ADR-040's OWN CELL IS STILL IN AN ABSORBING REGION. `qb.awarenessVariance.*` is where
      // `d20Offset` left and `baseHalfWidth` arrived at net zero — the swap that bought the path
      // digest. Its note now NAMES both cells, which is why it is accurate; it is still a prefix
      // rule, so a third cell would inherit that note in silence. The digest would catch it; the
      // classification still would not.
      "qb.awarenessVariance.*",
      "qb.window.*",
      "qb.timeBudget.*",
      "qb.decision.*",
      "qb.pressureSensing.*",
      "throwExec.lane.velocityModifier.*",
      "throwExec.accuracy.depthModifier.*",
      "throwExec.accuracy.throwTypeModifier.*",
      "throwExec.accuracy.*",
      "catching.routine.*",
      "catching.contested.positionModifier.*",
      "catching.contested.*",
      "tippedBall.baseTargetByHeight.*",
      "tippedBall.velocityModifier.*",
      "tippedBall.recovery.proximityModifier.*",
      "tippedBall.recovery.attrTerms.*",
      "tippedBall.recovery.situational.*",
      "tippedBall.recovery.traits.*",
      "ballCarrier.catchTransition.byThrowType.*",
      "ballCarrier.contests.atLosEvade.bands.*",
      "ballCarrier.contests.*",
      "ballCarrier.carrierTraits.*",
      "ballCarrier.tacklerTraits.*",
      "ballCarrier.pursuitAngle.*",
      "ballCarrier.breakaway.traits.*",
      "ballCarrier.breakaway.bands.*",
      "ballCarrier.breakaway.*",
      "ballCarrier.blockInSpace.bands.*",
      "ballCarrier.blockInSpace.traits.*",
      "ballCarrier.blockInSpace.*",
      "runBlock.traits.*",
      "runBlock.bands.*",
      "runBlock.secondLevelClimb.*",
      "runBlock.*",
      "runGame.vision.*",
      "runGame.pointOfAttack.bands.0.*",
      "runGame.pointOfAttack.bands.1.*",
      "runGame.pointOfAttack.bands.*",
    ]);
    // 51 absorbing, 32 uniform, 83 block rules. Stated so a rule that quietly stops being either is
    // visible as an arithmetic failure and not only as a list diff.
    expect(absorbingBlockRules().length + UNIFORM_REGIONS.length).toBe(
      REGISTER.filter((r) => r.pattern.split(".").at(-1) === "*").length,
    );
  });

  it("cannot claim UNIFORM without stating why it generalises", () => {
    // The `why` is the whole content of a UNIFORM claim: it is an argument that the note survives a
    // member added tomorrow. An empty one is the fourth-shape failure — a field that looks like a
    // justification and is not.
    const silent = UNIFORM_REGIONS.filter((r) => r.why.trim().length < 40).map((r) => r.pattern);
    expect(silent).toEqual([]);
    // And every UNIFORM pattern must be a rule that could actually absorb. A narrow rule declared
    // UNIFORM would be a claim with no subject.
    const notBlockRules = UNIFORM_REGIONS.filter(
      (r) => r.pattern.split(".").at(-1) !== "*",
    ).map((r) => r.pattern);
    expect(notBlockRules).toEqual([]);
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

  it("names ADR-048's seven cells as a SET, each under a rule written about it", () => {
    // The re-record, in the shape §4.1 asks for. `+7` is a count; this is the subject.
    const paths = new Set(numericLeafPaths());
    expect(ADR_048_ADDED_PATHS.filter((p) => !paths.has(p))).toEqual([]);
    // ⛔ AND THE HALF THAT WAS ACTUALLY BROKEN. Every one of the seven must be classified by a rule
    // whose pattern is ABOUT `contestGain` — not by whatever catch-all happens to sit above it.
    // Under the pre-ADR-048 register all seven answered `route.*`, and nothing in this file noticed.
    const wrongOwner = ADR_048_ADDED_PATHS.filter(
      (p) => !(classify(p)?.pattern ?? "").startsWith("route.contestGain"),
    );
    expect(wrongOwner).toEqual([]);
    // The seven are `INTERPRETATION`: §8.7's amendment says in terms that the rate mapping is the
    // engine's to DERIVE. They are NOT `STRUCTURAL`, which is what the catch-all called them.
    expect([...new Set(ADR_048_ADDED_PATHS.map((p) => classify(p)?.provenance))]).toEqual([
      "INTERPRETATION",
    ]);
  });

  it("names entry 73's cell individually, not left to the arrival.* catch-all", () => {
    // Left unnamed, this cell would fall to `arrival.*` — a `UNIFORM_REGIONS` member whose note reads
    // "the doc has no arrival model … every number in this block is engine structure filling that
    // gap." That is false of THIS cell: §7.1 carries a dedicated, ratified derivation naming it.
    const paths = new Set(numericLeafPaths());
    expect(paths.has(ENTRY_73_ADDED_PATH)).toBe(true);
    const rule = classify(ENTRY_73_ADDED_PATH);
    expect(rule?.pattern).toBe(ENTRY_73_ADDED_PATH);
    expect(rule?.pattern).not.toBe("arrival.*");
    // A brand-new provenance value, PROPOSED and first-used here — see its own comment in
    // `docConformance.ts` for the eight-category survey that justifies adding rather than stretching.
    expect(rule?.provenance).toBe("DERIVED_MECHANIC");
    // And the catch-all it was pulled out of still owns exactly what it owned before this cell
    // existed — the absorption pin below is the structural proof of that, not this line.
    const uniformArrival = UNIFORM_REGIONS.find((r) => r.pattern === "arrival.*");
    expect(uniformArrival).toBeDefined();
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

  // -------------------------------------------------------------------------------------------
  // BLOCK-RULE ABSORPTION — ADR-048's finding, made structural
  // -------------------------------------------------------------------------------------------

  it("pins what each BLOCK rule absorbs, because a catch-all goes stale by absorbing", () => {
    // ⛔ WHAT WOULD MAKE THIS GO RED (backlog entry 55, recorded beside the instrument):
    //   a numeric leaf entering or leaving the INTERIOR of a named block rule — including a
    //   net-zero swap inside one rule, and including a REGISTER edit that re-points a cell from one
    //   block rule to another WITHOUT the tunables tree moving at all. That last case is invisible
    //   to every other pin in this file: the census, the path digest, `unclassified` and
    //   `deadRules` are all functions of the TREE, and it does not move.
    //
    //   WHAT WOULD NOT: a note that is wrong about cells it has owned all along. That is a reading
    //   and it has no instrument; this pin makes ABSORPTION loud, not misreading.
    //
    // ⚠ THE REMEDY ON RED IS NOT "RE-TYPE THE DIGEST". The failing line names the pattern. Call
    //   `absorbedBy(pattern)`, diff the cell set, and RE-READ THAT RULE'S NOTE against what it now
    //   owns. Re-recording without re-reading reproduces ADR-048's defect one dispatch later.
    expect(blockRuleAbsorptionPins()).toEqual([
      // 9 → 17 at ADR-052/053: `resultTierLadder`'s ratified widening. The pattern, provenance and
      // note are unchanged (the note already reads "True of any rung added later" — see
      // `UNIFORM_REGIONS`); only the population of leaf paths this rule owns grew, and the digest
      // moved with it because the count "rides along for legibility ONLY" per this function's own
      // doc comment — the digest is the claim.
      "resultTierLadder.* :: STRUCTURAL :: 17 :: fnv1a:c885dfa3",
      "traitBonuses.* :: DOC_VERBATIM :: 8 :: fnv1a:b1d1df0e",
      "clock.* :: DOC_VERBATIM :: 2 :: fnv1a:8c0b642c",
      "zoneModel.verticalUpperYards.* :: DOC_VERBATIM :: 4 :: fnv1a:fe98a685",
      "presnap.blitzRecognition.disguise.* :: DOC_VERBATIM :: 4 :: fnv1a:89fabc1a",
      "passRush.bands.* :: DOC_DERIVED :: 6 :: fnv1a:becac752",
      "passRush.pressureProgressByBand.* :: INTERPRETATION :: 6 :: fnv1a:0f5eebe6",
      "passRush.* :: DOC_VERBATIM :: 2 :: fnv1a:c6fc134e",
      "stunt.complexity.* :: DOC_VERBATIM :: 4 :: fnv1a:76a0ded0",
      "blitzPickup.recognitionModifier.* :: INTERPRETATION :: 2 :: fnv1a:234a5112",
      "blitzPickup.freeRunnerPath.* :: INTERPRETATION :: 8 :: fnv1a:5cd36578",
      "blitzPickup.bands.* :: INTERPRETATION :: 6 :: fnv1a:678eeb63",
      "blitzPickup.* :: DOC_VERBATIM :: 2 :: fnv1a:b994fb1e",
      "arrival.* :: INTERPRETATION :: 18 :: fnv1a:924db233",
      "pocket.accuracyModifier.* :: DOC_VERBATIM :: 4 :: fnv1a:2edef696",
      "pocket.readCapacityDelta.* :: TABLE_SHAPE :: 2 :: fnv1a:ae9bbb70",
      "pocket.severity.* :: STRUCTURAL :: 4 :: fnv1a:384a330e",
      "pocket.thresholds.* :: INTERPRETATION :: 4 :: fnv1a:454a6419",
      "pocketMovement.* :: INTERPRETATION :: 30 :: fnv1a:84811268",
      "scramble.visionConeByDepthClass.* :: INTERPRETATION :: 4 :: fnv1a:f1d62faf",
      "scramble.* :: INTERPRETATION :: 9 :: fnv1a:86b2c9cb",
      "release.bands.* :: INTERPRETATION :: 14 :: fnv1a:8d89f331",
      "route.readySeconds.* :: DOC_UNIT_RESOLVED :: 3 :: fnv1a:0e43f0bc",
      "route.contestGain.byContest.* :: INTERPRETATION :: 6 :: fnv1a:3e1462a7",
      "zoneCoverage.readQb.disguise.* :: INTERPRETATION :: 3 :: fnv1a:693abc51",
      "qb.readSystem.* :: INTERPRETATION :: 11 :: fnv1a:1a129a3a",
      "qb.extraReads.* :: DOC_VERBATIM :: 2 :: fnv1a:00c03f48",
      "qb.awarenessVariance.* :: DOC_VERBATIM :: 2 :: fnv1a:ef94d2e6",
      "qb.window.* :: DOC_VERBATIM :: 5 :: fnv1a:3159403b",
      "qb.timeBudget.* :: DOC_UNIT_RESOLVED :: 3 :: fnv1a:8df83fb3",
      "qb.anticipation.* :: INTERPRETATION :: 13 :: fnv1a:78fbc5a3",
      "qb.decision.* :: DOC_VERBATIM :: 2 :: fnv1a:9d375887",
      "qb.poise.* :: INTERPRETATION :: 2 :: fnv1a:449d7872",
      "qb.pressureSensing.* :: INTERPRETATION :: 1 :: fnv1a:cfb77e89",
      "throwExec.armRequirements.* :: TABLE_SHAPE :: 4 :: fnv1a:88cc2405",
      "throwExec.lane.velocityModifier.* :: DOC_VERBATIM :: 3 :: fnv1a:46146911",
      "throwExec.lane.angleModifier.* :: DOC_VERBATIM :: 3 :: fnv1a:5a783ac6",
      "throwExec.accuracy.depthModifier.* :: DOC_VERBATIM :: 5 :: fnv1a:1734bfca",
      "throwExec.accuracy.throwTypeModifier.* :: DOC_VERBATIM :: 4 :: fnv1a:1e19130c",
      "throwExec.accuracy.* :: DOC_VERBATIM :: 2 :: fnv1a:4243d445",
      "catching.routine.* :: DOC_VERBATIM :: 2 :: fnv1a:022b45c3",
      "catching.contested.positionModifier.* :: DOC_VERBATIM :: 3 :: fnv1a:2293932a",
      "catching.contested.* :: DOC_VERBATIM :: 6 :: fnv1a:c8cf99fe",
      "tippedBall.baseTargetByHeight.* :: DOC_VERBATIM :: 8 :: fnv1a:e25a7b4c",
      "tippedBall.heightStepsByThrowType.* :: INTERPRETATION :: 4 :: fnv1a:6931f528",
      "tippedBall.velocityModifier.* :: DOC_VERBATIM :: 4 :: fnv1a:1d304f3c",
      "tippedBall.weatherModifier.* :: DOC_GAP :: 6 :: fnv1a:45c32b0f",
      "tippedBall.recovery.proximityModifier.* :: DOC_VERBATIM :: 3 :: fnv1a:f2b78244",
      "tippedBall.recovery.attrTerms.* :: DOC_VERBATIM :: 5 :: fnv1a:fd76d73d",
      "tippedBall.recovery.situational.* :: DOC_VERBATIM :: 5 :: fnv1a:0bb6c300",
      "tippedBall.recovery.traits.* :: DOC_VERBATIM :: 3 :: fnv1a:d5a4170a",
      "ballCarrier.verticalDepthYards.* :: INTERPRETATION :: 5 :: fnv1a:ebc84859",
      "ballCarrier.catchTransition.byAccuracyBand.* :: DOC_VERBATIM :: 6 :: fnv1a:c35d9dc0",
      "ballCarrier.catchTransition.byThrowType.* :: DOC_VERBATIM :: 4 :: fnv1a:8d9d6820",
      "ballCarrier.yacMultiplierByAccuracyBand.* :: INTERPRETATION :: 6 :: fnv1a:a73dea42",
      "ballCarrier.contests.yac.bands.4.* :: DOC_DERIVED :: 3 :: fnv1a:1866aa6a",
      "ballCarrier.contests.secondLevel.bands.2.* :: DOC_DERIVED :: 3 :: fnv1a:5491a235",
      "ballCarrier.contests.atLosPower.bands.* :: INTERPRETATION :: 6 :: fnv1a:4945cd8c",
      "ballCarrier.contests.atLosEvade.bands.* :: DOC_DERIVED :: 6 :: fnv1a:5149f42c",
      "ballCarrier.contests.* :: DOC_VERBATIM :: 12 :: fnv1a:3f40f575",
      "ballCarrier.carrierTraits.* :: DOC_VERBATIM :: 1 :: fnv1a:f743dd2c",
      "ballCarrier.tacklerTraits.* :: DOC_VERBATIM :: 1 :: fnv1a:7865a482",
      "ballCarrier.pursuitAngle.* :: DOC_VERBATIM :: 3 :: fnv1a:ba967785",
      "ballCarrier.pursuitGateZones.* :: DOC_DERIVED :: 4 :: fnv1a:68cb9e2d",
      "ballCarrier.breakaway.traits.* :: DOC_VERBATIM :: 1 :: fnv1a:35d38856",
      "ballCarrier.breakaway.bands.* :: DOC_DERIVED :: 3 :: fnv1a:2c4b8608",
      "ballCarrier.breakaway.* :: DOC_VERBATIM :: 4 :: fnv1a:430b2045",
      "ballCarrier.blockInSpace.bands.* :: DOC_DERIVED :: 3 :: fnv1a:47ab7cff",
      "ballCarrier.blockInSpace.traits.* :: DOC_VERBATIM :: 1 :: fnv1a:cf9b20ca",
      "ballCarrier.blockInSpace.* :: DOC_VERBATIM :: 11 :: fnv1a:18dfab43",
      "runBlock.traits.* :: DOC_VERBATIM :: 2 :: fnv1a:54c3ea30",
      "runBlock.bands.* :: DOC_VERBATIM :: 5 :: fnv1a:2d2be48f",
      "runBlock.gapIntegrity.bands.* :: INTERPRETATION :: 2 :: fnv1a:dc541238",
      "runBlock.secondLevelClimb.* :: DOC_VERBATIM :: 5 :: fnv1a:336f3da2",
      "runBlock.* :: DOC_VERBATIM :: 6 :: fnv1a:509e84dc",
      "runGame.phaseTicks.* :: INTERPRETATION :: 3 :: fnv1a:57186773",
      "runGame.vision.* :: DOC_VERBATIM :: 3 :: fnv1a:09d7aaac",
      "runGame.pointOfAttack.bands.0.* :: DOC_VERBATIM :: 3 :: fnv1a:fdb5eab1",
      "runGame.pointOfAttack.bands.1.* :: DOC_VERBATIM :: 3 :: fnv1a:179b7c50",
      "runGame.pointOfAttack.bands.* :: DOC_DERIVED :: 6 :: fnv1a:b54cd0d4",
      "result.* :: DOC_GAP :: 8 :: fnv1a:86dc06e6",
      "chemistry.* :: INTERPRETATION :: 4 :: fnv1a:12e843ac",
      "game.* :: OUT_OF_SCOPE :: 71 :: fnv1a:d1c07bc6",
    ]);
  });

  it("REDDENS on the case it exists for — THE ADR-048 REGISTER, replayed", () => {
    // Not a description of the defect: the defect. This is `REGISTER` as it stood when ADR-048
    // landed — the two `route.contestGain` rules removed, the catch-all `route.*` restored — run
    // against the SAME committed tree. Every other pin in this file is green on it, because the
    // tree is byte-identical; only the classification differs.
    const asItStood: readonly RegisterRule[] = [
      ...REGISTER.filter((r) => !r.pattern.startsWith("route.contestGain") && r.pattern !== "route.maxOpenness" && r.pattern !== "route.minOpenness"),
      {
        pattern: "route.*",
        provenance: "STRUCTURAL",
        docRef: "§8.4",
        note: "Openness clamps at §8.4's 0-100 scale.",
      },
    ];
    const pins = blockRuleAbsorptionPins(undefined, asItStood);
    const routeStar = pins.find((p) => p.startsWith("route.* ::"));
    // NINE cells under a note about a clamp: `maxOpenness`, `minOpenness`, and ADR-048's seven.
    expect(routeStar).toBe("route.* :: STRUCTURAL :: 9 :: fnv1a:73ec85a6");
    expect(pins).not.toEqual(blockRuleAbsorptionPins());
    // ⚠ AND THIS IS THE POINT. On that register the totality gate is still GREEN — every cell
    // classified, no dead rule — which is why the defect survived a dispatch.
    const stale = blockRuleAbsorption(undefined, asItStood);
    expect(stale.some((a) => a.pattern === "route.*" && a.cells.length === 9)).toBe(true);
  });

  it("`absorbedBy` is the diff tool the failing pin sends you to", () => {
    expect([...absorbedBy("route.contestGain.byContest.*")]).toEqual([
      "route.contestGain.byContest.EVEN.burst",
      "route.contestGain.byContest.EVEN.steady",
      "route.contestGain.byContest.IN_FRONT.burst",
      "route.contestGain.byContest.IN_FRONT.steady",
      "route.contestGain.byContest.TRAILING.burst",
      "route.contestGain.byContest.TRAILING.steady",
    ]);
    // A NARROW rule owns cells too; `absorbedBy` answers for any pattern, which is what makes the
    // route.* → named-cells repair checkable rather than merely asserted in a comment.
    expect([...absorbedBy("route.maxOpenness")]).toEqual(["route.maxOpenness"]);
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
