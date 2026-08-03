/**
 * THE RELATIONAL-CONSTANT CENSUS — every numeric leaf of `DEFAULT_TUNABLES`, grouped by UNIT, compared
 * PAIRWISE within each group. Read-only; changes no tunable, no engine code, no contract, no metric, no
 * band, no verdict. Proposes no ruling.
 *
 * ================== WHY THIS EXISTS (CALIBRATION-BACKLOG entries 83, 109, 110, 111) ==================
 *
 * Entry 83 named a CLASS of defect no existing instrument catches: two ratified constants, each
 * individually derived and each individually defensible, whose RELATIONSHIP nobody examined. Four
 * instances are now on record, and every one was found as a byproduct of unrelated work:
 *
 *   1. `travelSecondsByAlignmentAndMove.INTERIOR.*` (1.0) = `arrival.collapsingWithinSeconds` (1.0)
 *   2. `travelSecondsByAlignmentAndMove.EDGE.SPEED` (2.0) = `arrival.pressureWithinSeconds` (2.0)
 *   3. `scramble.pursuitSeconds` (1.5) vs `arrival.pressureWithinSeconds` (2.0) — an ORDERING, not an
 *      equality: every pursuit tick is arrival-dirty by arithmetic (backlog entry 82-RESULT).
 *   4. `arrival.maxTravelSeconds` (3.0) vs `arrival.pressureWithinSeconds` (2.0) — also an ORDERING.
 *
 * `docConformance.ts`'s own header names the class this file misses on purpose: it checks CELLS
 * against the DOC, one cell at a time. It has never compared two cells to EACH OTHER, and doing so is
 * this file's entire job. `bandCensus`/`bandTables` check ORDERING *within one table* (a column of
 * `minMargin`s); they have never compared a cell in one table against a cell in a different table.
 *
 * ================== SCOPE, DECIDED AND JUSTIFIED (per the dispatch brief) ==================
 *
 * COVERAGE: this census reports RAW-VALUE relations only — equality, integer multiples, sums of two
 * other same-unit leaves, and (for boundary-role leaves) proximity to every other same-unit leaf. It
 * does **not** attempt a general pairwise ORDERING census (`A < B` for every pair in a unit group):
 * for continuous real numbers that relation holds for almost every pair and reporting it universally
 * would not be a finding, it would be arithmetic noise with no informational content. What entries 82/
 * 109/110 actually needed from an ordering check was narrower — "does a BOUNDARY-role constant
 * (`min*`, `max*`, `*Within*Seconds`, `*Horizon*`) sit CLOSE to some other same-unit constant" — and
 * that is what `boundaryProximity` computes, exhaustively, over every (boundary leaf × other leaf)
 * pair in the same unit group. This is how instances 3 and 4 — both ORDERING relations, not equalities
 * — are rediscovered by the same instrument that finds 1 and 2 by equality, without degenerating into
 * "everything is either less than or greater than everything else."
 *
 * WHAT IS THEREFORE EXCLUDED, STATED RATHER THAN GLOSSED: a fully general ordering relation between
 * two arbitrary NON-boundary-named leaves (e.g. "is `qb.throwThreshold` less than
 * `scramble.opennessGainPerTick`?"). Charter §4.1's own standard — an instrument with a failing case is
 * not yet an instrument — argues against building that: it has no failing case that is not also true
 * of thousands of unrelated pairs, so it could not distinguish a defect from noise. The four known
 * instances are the positive control for what IS built; none of them requires the excluded relation.
 *
 * ================== CAVEAT FROM ENTRY 109: RAW EQUALITY IS A STARTING POINT, NOT THE ANSWER ==========
 *
 * `minTta` at the deciding tick is `travel − 0.5`, not `travel` (entry 109). So a pair equal in the
 * RAW tree can be UNEQUAL live, and a pair unequal in the raw tree can TIE live. This file reports the
 * RAW relation only and labels it as such; it does not re-derive every mechanic's live-tick quantity
 * (that would require re-implementing each resolver, which is exactly the kind of reimplementation risk
 * entry 109 flagged and cleared for ONE channel by reading the engine source directly — a generalisation
 * to all ~700 leaves is out of scope for a single detector pass). Each reported pair in the write-up
 * states, where known from the ratified record, whether the raw tie also holds live.
 */
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { numericLeaves, leafCensus, type NumericLeaf } from "./docConformance.js";

// ---------------------------------------------------------------------------
// UNIT CLASSIFICATION — derived from the leaf's own field name, never hand-listed.
// ---------------------------------------------------------------------------

export interface ClassifiedLeaf extends NumericLeaf {
  /** The path segment the classifier actually matched on (may be several levels above the leaf itself — see `classifyLeaf`). */
  readonly fieldName: string;
  readonly unit: string;
  /** True if this leaf's NAME marks it as a bound/horizon on some other quantity (`min*`, `max*`, `*Within*`, `*Horizon*`). */
  readonly isBoundaryRole: boolean;
}

/**
 * Split a camelCase / PascalCase / SNAKE_CASE identifier into its component WORDS, case-preserved.
 * `"travelSecondsByAlignmentAndMove"` → `["travel","Seconds","By","Alignment","And","Move"]`.
 * `"baseline"` (no internal capital) → `["baseline"]` — ONE token, deliberately: this is what stops
 * `"Line"` (a real unit word, `goalLine` → `["goal","Line"]`) from falsely matching *inside*
 * `"baseline"`, which a plain `/Line$/i` suffix regex does (verified: it did, in the first version of
 * this file, and silently merged every `baseline: 70` into the `yards` bucket). Tokenizing first and
 * matching whole TOKENS is what a suffix regex over the raw string cannot do safely once compound
 * names are involved, and this tree is full of compound names.
 */
function tokenize(name: string): string[] {
  return name.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])/g) ?? [name];
}

/**
 * ONE unit-word, matched as a WHOLE TOKEN (case-insensitive) against `tokenize(fieldName)`. Every
 * family below is named for the physical/game quantity it denotes, derived from reading
 * `packages/engine/src/tunables.ts`'s own comments (§ references cited there, not here, to avoid a
 * second copy of a citation that can drift).
 */
interface UnitRule {
  /** A CONSECUTIVE run of lowercase tokens that must appear somewhere in `tokenize(fieldName)`. Multi-word entries (e.g. `["urgency","step"]`) exist because the tokenizer splits on every capital-letter boundary, so a compound unit word is itself several tokens — matching them as an adjacent SEQUENCE (not a substring of the raw string) is what avoids `"baseline"` re-triggering `"line"` while still recognising `"perUrgencyStep"` as one concept. */
  readonly sequence: readonly string[];
  readonly unit: string;
}

/** Does `tokens` contain `sequence` as a consecutive, case-already-lowered run? */
function containsSequence(tokens: readonly string[], sequence: readonly string[]): boolean {
  for (let start = 0; start + sequence.length <= tokens.length; start++) {
    let ok = true;
    for (let k = 0; k < sequence.length; k++) {
      if (tokens[start + k] !== sequence[k]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

const UNIT_RULES: readonly UnitRule[] = [
  // ---- compound RATES first (most specific — a "Per*" token changes the unit of what precedes it) ----
  { sequence: ["half", "tick"], unit: "rate:perHalfTick" },
  { sequence: ["speed", "point"], unit: "rate:yardsPerAttributePoint" },
  { sequence: ["urgency", "step"], unit: "rate:perUrgencyStep" },
  { sequence: ["extra", "yard"], unit: "rate:marginPerYard" },
  { sequence: ["yard", "over"], unit: "rate:targetPerYard" },
  { sequence: ["tick"], unit: "rate:perTick" }, // openness gain/decay AND read-rate share this bucket — flagged as mixed in the write-up
  { sequence: ["point"], unit: "rate:yardsPerAttributePoint" },
  { sequence: ["rate"], unit: "rate:probability" },
  { sequence: ["multiplier"], unit: "multiplier" },
  // ---- plain physical units ----
  { sequence: ["seconds"], unit: "seconds" },
  { sequence: ["margin"], unit: "margin" },
  { sequence: ["divisor"], unit: "divisor" },
  { sequence: ["yards"], unit: "yards" },
  { sequence: ["yard"], unit: "yards" },
  { sequence: ["line"], unit: "yards" }, // goalLine, touchbackYardLine (already Yards too), fromYardLine
  { sequence: ["distance"], unit: "yards" },
  { sequence: ["target"], unit: "rollTarget" },
  { sequence: ["baseline"], unit: "ratingBaseline" },
  { sequence: ["threshold"], unit: "threshold" },
  { sequence: ["openness"], unit: "openness" },
  { sequence: ["modifier"], unit: "modifierPoints" },
  { sequence: ["mod"], unit: "modifierPoints" },
  { sequence: ["bonus"], unit: "modifierPoints" },
  { sequence: ["bonuses"], unit: "modifierPoints" },
  { sequence: ["penalty"], unit: "modifierPoints" },
  { sequence: ["delta"], unit: "modifierPoints" },
  { sequence: ["traits"], unit: "modifierPoints" },
];

/**
 * Exact-field overrides for leaves whose OWN name (at every level the walk in `classifyLeaf` tries)
 * carries no recognizable unit word at all. Each was resolved by direct read of `tunables.ts`, not
 * guessed, and is named individually so the override is itself auditable — the same discipline
 * `docConformance.ts`'s per-cell rules use for a cell a block rule would otherwise misfile.
 */
const FIELD_OVERRIDES: Readonly<Record<string, string>> = {
  // ---- yards / field position with no unit word in the name ----
  safetyAtOrBehind: "yards",
  // ---- game score points, keyed by score type under `game.points`, or named without "points" ----
  touchdown: "gamePoints",
  fieldGoal: "gamePoints",
  extraPoint: "gamePoints",
  twoPoint: "gamePoints",
  safety: "gamePoints",
  desperationPointDeficit: "gamePoints",
  touchdownPoints: "gamePoints",
  // ---- rating-scale attribute gates (0-99 player rating, compared directly, no ÷5) ----
  minArmStrength: "ratingGate",
  speedCheckMinSpeed: "ratingGate",
  neutralLevel: "ratingGate",
  // ---- the engine's own tick clock, named "Tick" rather than "Seconds" ----
  firstTick: "seconds",
  maxTick: "seconds",
  phaseTicks: "seconds", // runGame.phaseTicks.* — VALUES are seconds (0.5/1.0/1.5/2.0) despite the field's own name
  // ---- dimensionless small counts ----
  maxReads: "count",
  downsInSeries: "count",
  periodsInRegulation: "count",
  overtimePeriods: "count",
  maxPerPlay: "count",
  containRetiresAfterConsecutiveContains: "count",
  poolFrom: "count",
  poolTo: "count",
  takeRank: "count",
  zone: "count",
  breakawayAfterZone: "count",
  maxZoneDistance: "count",
  speedCheckFromDistance: "count",
  burstSteps: "count",
  maxPlaysPerGame: "count",
  heightStepsByThrowType: "count", // ladder-step counts, -1/0/1
  pursuitGateZones: "count", // zone indices
  // ---- game clock, in seconds, but a different SCALE from tick-level mechanics (flagged in the write-up) ----
  periodSeconds: "gameClockSeconds",
  overtimeSeconds: "gameClockSeconds",
  twoMinuteSeconds: "gameClockSeconds",
  twoMinuteHuddleSeconds: "gameClockSeconds",
  huddleSeconds: "gameClockSeconds",
  desperationClockSeconds: "gameClockSeconds",
  elapsedSeconds: "seconds", // matches the `seconds` word-rule too; explicit for the ancestor-walk
  clockRunoff: "seconds", // no unit word in the name; values are seconds burned
  // ---- die-recentering constants ("d20 − 10" style), a raw-roll-points unit distinct from yards ----
  varianceDieOffset: "dieOffset",
  returnVarianceDieOffset: "dieOffset",
  // ---- pocket-severity ordinal ranks (0..3), not a margin and not a count of anything physical ----
  severity: "severityRank",
  // ---- accumulated-pressure counter's own progress units (distinct from a margin or a count of ticks) ----
  minProgress: "pressureProgress",
  // ---- pocketMovement.appeal.* base scores, a home-grown 0-100-ish appeal scale ----
  base: "appealBase",
  // ---- perception half-width (own scale, not a plain margin or a rating) ----
  baseHalfWidth: "perceptionHalfWidth",
  // ---- route.contestGain.byContest.*: integer MULTIPLES of opennessGainPerTick, per the doc comment ----
  burst: "rateMultiplier:opennessGain",
  steady: "rateMultiplier:opennessGain",
  // ---- flat per-band bonus tables with no unit word in the field name ----
  backShoulderWithoutChemistry: "modifierPoints",
  blockerStructuralAdvantage: "modifierPoints",
  counterMoveAfterStalemate: "modifierPoints",
  disguise: "modifierPoints",
  complexity: "modifierPoints",
  situational: "modifierPoints",
  catchTransition: "modifierPoints",
  visionConeByDepthClass: "modifierPoints",
  difficulty: "difficulty",
  // ---- a rate this tree names uniquely; no other leaf shares its denominator ----
  targetPerYardOver: "rate:targetPerYard",
};

const BOUNDARY_ROLE = /^(min|max)[A-Z]|Within|Horizon/;

/**
 * Classify a leaf by trying, in order: its own terminal segment, then each ANCESTOR segment moving
 * outward — skipping array indices always, and skipping enum-like constants (`PRESSURE`, `SPEED`) only
 * when nothing more specific already matched. The first segment (at any depth) that resolves via
 * `FIELD_OVERRIDES` or a whole-token `UNIT_RULES` match wins; this is what lets
 * `arrival.travelSecondsByAlignmentAndMove.EDGE.SPEED` resolve off its GRANDPARENT field name
 * (`travelSecondsByAlignmentAndMove`, containing the token `Seconds`) and what lets
 * `tippedBall.recovery.proximityModifier.sameZone` resolve off its PARENT (`proximityModifier`,
 * containing `Modifier`) when the leaf's own key (`sameZone`) carries no unit word at all.
 */
export function classifyLeaf(leaf: NumericLeaf): ClassifiedLeaf {
  const segments = leaf.path.split(".");
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg === undefined || /^\d+$/.test(seg)) continue; // array indices never carry unit info
    const override = FIELD_OVERRIDES[seg];
    if (override !== undefined) {
      return { ...leaf, fieldName: seg, unit: override, isBoundaryRole: BOUNDARY_ROLE.test(seg) };
    }
    const tokens = tokenize(seg).map((t) => t.toLowerCase());
    const rule = UNIT_RULES.find((r) => containsSequence(tokens, r.sequence));
    if (rule !== undefined) {
      return { ...leaf, fieldName: seg, unit: rule.unit, isBoundaryRole: BOUNDARY_ROLE.test(seg) };
    }
  }
  const lastSegment = segments[segments.length - 1] ?? leaf.path;
  return { ...leaf, fieldName: lastSegment, unit: "UNCLASSIFIED", isBoundaryRole: BOUNDARY_ROLE.test(lastSegment) };
}

export function classifyAll(tunables: Tunables = DEFAULT_TUNABLES): readonly ClassifiedLeaf[] {
  return numericLeaves(tunables).map(classifyLeaf);
}

export interface UnitGroup {
  readonly unit: string;
  readonly leaves: readonly ClassifiedLeaf[];
}

export function groupByUnit(tunables: Tunables = DEFAULT_TUNABLES): readonly UnitGroup[] {
  const classified = classifyAll(tunables);
  const byUnit = new Map<string, ClassifiedLeaf[]>();
  for (const leaf of classified) {
    const bucket = byUnit.get(leaf.unit);
    if (bucket) bucket.push(leaf);
    else byUnit.set(leaf.unit, [leaf]);
  }
  return [...byUnit.entries()]
    .map(([unit, leaves]) => ({ unit, leaves }))
    .sort((a, b) => b.leaves.length - a.leaves.length);
}

// ---------------------------------------------------------------------------
// PAIRWISE RELATIONS WITHIN A UNIT GROUP
// ---------------------------------------------------------------------------

export interface EqualPair {
  readonly unit: string;
  readonly a: ClassifiedLeaf;
  readonly b: ClassifiedLeaf;
}

/** Every DISTINCT unordered pair of leaves in the same unit group with IDENTICAL raw values. Excludes value 0 (near-universal "off" sentinel, not a relation) and self-pairs. */
export function equalPairs(groups: readonly UnitGroup[]): readonly EqualPair[] {
  const out: EqualPair[] = [];
  for (const group of groups) {
    const leaves = group.leaves;
    for (let i = 0; i < leaves.length; i++) {
      for (let j = i + 1; j < leaves.length; j++) {
        const a = leaves[i];
        const b = leaves[j];
        if (a === undefined || b === undefined) continue;
        if (a.value === b.value && a.value !== 0) {
          out.push({ unit: group.unit, a, b });
        }
      }
    }
  }
  return out;
}

export interface ValueHistogramRow {
  readonly value: number;
  readonly count: number;
  readonly paths: readonly string[];
}

/**
 * Per unit group, every DISTINCT value and how many leaves carry it, most-common first. This is what
 * separates a "convention cluster" (one value shared by a large fraction of a group — e.g. `÷5` across
 * `divisor`, `70` across `ratingBaseline`, the `resultTierLadder`'s own rungs across `margin`) from a
 * genuine cross-mechanic coincidence: a value carried by 2-3 leaves out of a group of 80+ is not the
 * group's convention, and is exactly the population `equalPairs` reports individually for by-hand
 * disposition.
 */
export function valueHistogram(group: UnitGroup): readonly ValueHistogramRow[] {
  const byValue = new Map<number, string[]>();
  for (const leaf of group.leaves) {
    const bucket = byValue.get(leaf.value);
    if (bucket) bucket.push(leaf.path);
    else byValue.set(leaf.value, [leaf.path]);
  }
  return [...byValue.entries()]
    .map(([value, paths]) => ({ value, count: paths.length, paths }))
    .sort((a, b) => b.count - a.count);
}

export interface MultiplePair {
  readonly unit: string;
  readonly larger: ClassifiedLeaf;
  readonly smaller: ClassifiedLeaf;
  readonly k: number;
}

/** `larger.value === k * smaller.value` for a small positive integer k (2..8), both values non-zero, not already an exact-equality pair (k=1 excluded). */
export function integerMultiplePairs(groups: readonly UnitGroup[]): readonly MultiplePair[] {
  const out: MultiplePair[] = [];
  for (const group of groups) {
    const leaves = group.leaves;
    for (let i = 0; i < leaves.length; i++) {
      for (let j = 0; j < leaves.length; j++) {
        if (i === j) continue;
        const a = leaves[i];
        const b = leaves[j];
        if (a === undefined || b === undefined) continue;
        if (a.value === 0 || b.value === 0) continue;
        if (Math.abs(a.value) <= Math.abs(b.value)) continue; // report each pair once, larger first
        const ratio = a.value / b.value;
        const k = Math.round(ratio);
        if (k >= 2 && k <= 8 && Math.abs(ratio - k) < 1e-9) {
          out.push({ unit: group.unit, larger: a, smaller: b, k });
        }
      }
    }
  }
  return out;
}

export interface SumTriple {
  readonly unit: string;
  readonly sum: ClassifiedLeaf;
  readonly addendA: ClassifiedLeaf;
  readonly addendB: ClassifiedLeaf;
}

/** `sum.value === addendA.value + addendB.value` for two OTHER distinct leaves in the same group (addends unordered, sum distinct from both). Capped to groups of <=60 leaves (C(60,2)~1,770 addend pairs per candidate) so the O(n^3) scan stays bounded; larger groups are reported as SKIPPED rather than silently truncated. */
export interface SumScanCoverage {
  readonly unit: string;
  readonly size: number;
  readonly scanned: boolean;
}

/**
 * Raised from an initial `60` after a first run SKIPPED the `seconds` group (70 leaves) — the single
 * unit where the sum relation matters most (entry 76 derived `pressureWithinSeconds` as
 * `collapsingWithinSeconds + (collapsingWithinSeconds − immediateWithinSeconds)`, a sum in substance).
 * `200³ = 8,000,000` comparisons is sub-second in practice; this cap exists so a future leaf explosion
 * fails LOUD (as a reported `SKIPPED` line) rather than silently degrading into a multi-minute run.
 */
const SUM_SCAN_MAX_GROUP_SIZE = 200;

export function sumTriples(groups: readonly UnitGroup[]): {
  readonly triples: readonly SumTriple[];
  readonly coverage: readonly SumScanCoverage[];
} {
  const triples: SumTriple[] = [];
  const coverage: SumScanCoverage[] = [];
  for (const group of groups) {
    const leaves = group.leaves;
    const scanned = leaves.length <= SUM_SCAN_MAX_GROUP_SIZE;
    coverage.push({ unit: group.unit, size: leaves.length, scanned });
    if (!scanned) continue;
    for (let s = 0; s < leaves.length; s++) {
      const sum = leaves[s];
      if (sum === undefined || sum.value === 0) continue;
      for (let i = 0; i < leaves.length; i++) {
        for (let j = i + 1; j < leaves.length; j++) {
          if (i === s || j === s) continue;
          const a = leaves[i];
          const b = leaves[j];
          if (a === undefined || b === undefined) continue;
          if (a.value === 0 || b.value === 0) continue;
          if (Math.abs(a.value + b.value - sum.value) < 1e-9) {
            triples.push({ unit: group.unit, sum, addendA: a, addendB: b });
          }
        }
      }
    }
  }
  return { triples, coverage };
}

export interface BoundaryProximity {
  readonly unit: string;
  readonly boundary: ClassifiedLeaf;
  readonly other: ClassifiedLeaf;
  /** other.value - boundary.value, signed. */
  readonly gap: number;
}

/**
 * Every (boundary-role leaf × other leaf in the same unit group, other != boundary and not the same
 * path) pair, with the signed gap. Exhaustive — no threshold is applied here; the threshold used to
 * decide what counts as "close enough to matter" is a REPORTING choice made by the caller (this
 * function does not silently drop anything), because Charter §4.1's own lesson (ADR-048, an absorbing
 * catch-all) is that a filter baked into the instrument is exactly the kind of thing that goes stale
 * without anyone noticing.
 */
export function boundaryProximities(groups: readonly UnitGroup[]): readonly BoundaryProximity[] {
  const out: BoundaryProximity[] = [];
  for (const group of groups) {
    const leaves = group.leaves;
    for (const boundary of leaves) {
      if (!boundary.isBoundaryRole) continue;
      for (const other of leaves) {
        if (other.path === boundary.path) continue;
        out.push({ unit: group.unit, boundary, other, gap: other.value - boundary.value });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// COVERAGE REPORTING (Item A's own requirement: what was covered, what was not)
// ---------------------------------------------------------------------------

export interface CensusCoverage {
  readonly totalNumericLeaves: number;
  readonly classifiedLeaves: number;
  readonly unclassifiedLeaves: readonly string[];
  readonly unitGroupSizes: ReadonlyArray<{ readonly unit: string; readonly count: number }>;
  readonly nonNumericLeaves: { readonly strings: number; readonly booleans: number; readonly untyped: readonly string[] };
}

export function censusCoverage(tunables: Tunables = DEFAULT_TUNABLES): CensusCoverage {
  const classified = classifyAll(tunables);
  const unclassified = classified.filter((l) => l.unit === "UNCLASSIFIED").map((l) => l.path);
  const groups = groupByUnit(tunables);
  const leaf = leafCensus(tunables);
  return {
    totalNumericLeaves: classified.length,
    classifiedLeaves: classified.length - unclassified.length,
    unclassifiedLeaves: unclassified,
    unitGroupSizes: groups.map((g) => ({ unit: g.unit, count: g.leaves.length })),
    nonNumericLeaves: { strings: leaf.strings, booleans: leaf.booleans, untyped: leaf.untyped },
  };
}
