/**
 * ============================================================================
 * DECLARED ABSENCES — metrics this library SHOULD have and deliberately does not.
 * ============================================================================
 *
 * An absent metric is not a TODO. It is a first-class entry in the metric library with an id, a
 * tier, a definition, a reason, and a list of the numbers somebody will be tempted to put in its
 * place. Every baseline report prints this section. `getMetric` on an absent id throws with the
 * whole entry rather than returning `undefined`.
 *
 * ================== THE FAILURE MODE THIS PREVENTS ==================
 *
 * It is specific, it has already happened once in this project's history at one level down, and
 * it is worth stating in full because the shape recurs:
 *
 *   1. A metric library has no coverage-quality metric.
 *   2. The event stream contains a number that is *about coverage* and is *available*.
 *   3. Somebody notices the gap, notices the number, and closes the gap with the number.
 *   4. The resulting report is clean, converges, has tight confidence intervals, and is wrong
 *      in a direction nothing in its own output can reveal.
 *
 * Step 3 is the whole problem, and it is not prevented by a comment. It is prevented by making
 * the wrong number *fail to register*: `registerMetric` scans a candidate's id and definition
 * against every forbidden substitute declared here and throws `ForbiddenSubstituteError`. A test
 * scans the metric source tree for the same names. Filling the gap with the wrong number is
 * therefore not something you can do by accident — it is something you have to delete this file
 * to do.
 *
 * ================== ENTRY 1: COVERAGE QUALITY ==================
 *
 * `CALIBRATION-BACKLOG.md` entry 8 has been amended three times, and every intermediate version
 * looked like a closeable gate — "until cards carry horizontal placement" (satisfied by the
 * corpus), "until zones are REGIONS" (satisfied by ADR-018). Both were symptoms.
 * [ADR-019](../../../../docs/decisions/ADR-019-coverage-reach-measures-responsibility-not-contest.md)
 * settled it:
 *
 *   > **coverage reach measures responsibility, not contest.**
 *
 * The decisive evidence: the three-under fire zone is responsible for **97.6%** of the field
 * against four-under Cover 3's **92.7%** — while being the easier of the two to throw against.
 * Fewer droppers means wider regions means higher reach. **A metric that rewards thin coverage
 * is a coverage inventory, not a coverage grade.**
 *
 * So reach, coverage percentage and grid ownership are all STRUCTURAL DESCRIPTIONS. They are
 * genuinely useful — they validate that a card means what it says, and `@ff/playbook`'s own
 * tests hold the corpus to family spread, football ordering and an anti-padding area ceiling
 * using exactly them. They are actively misleading as measures of how well coverage *worked*.
 *
 * Coverage quality is **separation at the throw**: how contested the route actually was. The
 * engine cannot report it. What is striking, and is the reason this entry is stated with a
 * populated real side rather than as a blank, is that **the real side already exists in the
 * cache** — NGS `avg_separation` and FTN `is_contested_ball` are both ingested. The gap is
 * one-sided. There is a target and nothing to compare to it.
 */
import type { MetricTier } from "./types.js";

/** A number somebody will reach for, and why it is the wrong one. */
export interface ForbiddenSubstitute {
  /** The name it travels under. Matched case-insensitively against candidate metric ids and definitions. */
  readonly name: string;
  /** Extra spellings of the same idea. Same matching. */
  readonly aliases: readonly string[];
  /** Where a reader will find it, so "I couldn't find it" is not the reason this gets ignored. */
  readonly whereItLives: string;
  readonly whyItIsWrong: string;
  readonly evidence: string;
}

export interface MetricAbsence {
  readonly id: string;
  readonly tier: MetricTier;
  readonly title: string;
  /** What the metric SHOULD be. Written as though it were going to be implemented tomorrow. */
  readonly definition: string;
  readonly whyAbsent: string;
  /**
   * The concrete change that would let this be implemented. Phrased as an emission requirement
   * rather than as "the engine should be better", because a petition needs a payload.
   */
  readonly engineMustEmit: readonly string[];
  /**
   * The real-side half, if it exists. A populated entry here means the absence is one-sided —
   * there is a target and nothing to compare to it — which is a much sharper statement than
   * "we can't measure this".
   */
  readonly realSideStatus:
    | { readonly available: true; readonly from: string; readonly note: string }
    | { readonly available: false; readonly note: string };
  readonly forbiddenSubstitutes: readonly ForbiddenSubstitute[];
  readonly references: readonly string[];
}

export const COVERAGE_QUALITY_ABSENCE: MetricAbsence = {
  id: "coverage_quality_separation_at_throw",
  tier: 1,
  title: "Coverage quality — separation at the throw",
  definition:
    "Mean separation, in yards, between the targeted receiver and his nearest covering " +
    "defender at the instant the ball is released; and the share of targets thrown into a " +
    "contested window. Split by coverage family (man / zone / pressure) and by route depth " +
    "class. This is a measure of how CONTESTED a route was — the only thing that deserves the " +
    "name 'coverage quality'.",
  whyAbsent:
    "The engine cannot say how contested a route was. `ROUTE_STATUS.openness` is the closest " +
    "thing in the stream and it is an ABSTRACT 0-100 index produced by the coverage resolution " +
    "itself, not a distance — it has no unit, no scale anchored in yards, and no correspondence " +
    "to what NGS measures, so comparing it to `avg_separation` would be comparing a number to a " +
    "different number that happens to move the same way. There is no spatial model of where the " +
    "defender actually is at release.",
  engineMustEmit: [
    "A separation figure IN YARDS on the THROW event (or on a companion event addressed by its " +
      "rollRef), for the targeted receiver against his nearest covering defender, at release.",
    "A contested/uncontested classification for that target, with the threshold stated as a " +
      "named tunable rather than inferred by a consumer — so the sim and NGS's ~1 yard " +
      "convention can be reconciled explicitly rather than by a magic number in this package.",
    "The coverage family actually responsible for the targeted receiver at release, so the " +
      "split is a fact from the stream rather than an inference from the defensive call.",
  ],
  realSideStatus: {
    available: true,
    from: "ngs_receiving.avg_separation (per player-week) and ftn_charting.is_contested_ball (per play)",
    note:
      "The absence is ONE-SIDED. Both real-side sources are already in the cache and both are " +
      "computable today; `realSideCoverageSeparation` in `tier1.ts` computes them and is " +
      "registered as a real-side-only observation so the target is standing and dated when the " +
      "engine can finally answer it. What is missing is the sim side, and only the sim side.",
  },
  forbiddenSubstitutes: [
    {
      name: "coverage reach",
      aliases: ["coverageReach", "reach_percentage", "responsibility_reach"],
      whereItLives:
        "@ff/playbook's coverage-region model and the corpus validation tests; conceptually " +
        "derivable from ZoneAssignment.laneSpan/depthSpan on any CoverageAssignment in the stream.",
      whyItIsWrong:
        "It measures RESPONSIBILITY, not CONTEST. It rises when defenders are stretched thinner, " +
        "so a defence that is easier to throw against scores higher. Fitting a zone tunable to it " +
        "would drive the engine toward thinner coverage in the name of better coverage.",
      evidence:
        "Three-under fire zone reaches 97.6% of the field; four-under Cover 3 reaches 92.7%. The " +
        "fire zone is the easier of the two to throw against. (ADR-019; CALIBRATION-BACKLOG 8.)",
    },
    {
      name: "coverage percentage",
      aliases: ["coveragePct", "field_coverage_percent", "percent_of_field_covered"],
      whereItLives: "The same region model, expressed as a percentage of field area.",
      whyItIsWrong:
        "Identical objection to reach, in different units. Area covered is an inventory of " +
        "assignments; it says nothing about whether anybody was near the ball.",
      evidence: "ADR-019: 85.8% is a real measurement of the cards and is not a coverage-quality metric.",
    },
    {
      name: "grid ownership",
      aliases: ["gridOwnership", "cells_owned", "cellsOwned", "zone_cells", "owned_cells"],
      whereItLives: "Cells of the §3 grid a coverage is responsible for (11 → 33 with spans applied).",
      whyItIsWrong:
        "The grid-level figure is the honest one to QUOTE about a corpus — ADR-019 says so — and " +
        "it is still an inventory. Quoting it as coverage quality launders a structural " +
        "description into a performance grade.",
      evidence:
        "Applying spans moved the engine fixture corpus's route-level reach by exactly zero, " +
        "because its offensive and defensive cards were written by the same hand. A number that " +
        "cannot move under a real change is not measuring performance. (ADR-019.)",
    },
    {
      name: "openness",
      aliases: ["route_openness", "routeOpenness", "mean_openness", "avgOpenness"],
      whereItLives: "ROUTE_STATUS.payload.openness, on every route, every tick.",
      whyItIsWrong:
        "It is the coverage resolution's own intermediate variable, on an abstract 0-100 scale " +
        "with no yardage meaning. Using it as the sim side of a separation metric would compare " +
        "an index to a distance and then tune the index until the two matched — which would fit " +
        "the engine to a unit conversion.",
      evidence:
        "openness is produced BY the man/zone coverage checks whose weights this metric would be " +
        "used to tune. Fitting a term to its own output is circular by construction.",
    },
  ],
  references: [
    "docs/decisions/ADR-019-coverage-reach-measures-responsibility-not-contest.md",
    "docs/decisions/CALIBRATION-BACKLOG.md entry 8",
    "docs/design/calibration.md §4 (Tier 1)",
  ],
};

/**
 * ENTRY 2 — the unseen-defender interception source.
 *
 * `calibration.md` §4 Tier 1 asks for INTs "attributed by event cause — lane deflections vs
 * contested catches vs unseen defenders vs tipped recoveries — each with its own band". Three of
 * those four are in the stream. The fourth is §8.6, which is unimplemented, and
 * `CALIBRATION-BACKLOG.md` 4a records the consequence: a passed anticipation check currently
 * carries no additional interception risk at all.
 *
 * So the decomposition is registered as three components and a declared hole, rather than as
 * three components summing to 100% — which would silently redistribute the missing source across
 * the other three and make each of their bands wrong in a way no report could show.
 */
export const UNSEEN_DEFENDER_INT_ABSENCE: MetricAbsence = {
  id: "int_source_unseen_defender",
  tier: 1,
  title: "Interception source — the unseen defender",
  definition:
    "Share of interceptions caused by a defender the quarterback did not see: the §8.6 check " +
    "failing on a throw that was otherwise well decided. Denominator: all interceptions.",
  whyAbsent:
    "§8.6 is not implemented. `CheckKind` reserves `unseen_defender` and nothing emits it, so " +
    "the source is structurally absent rather than measured at zero.",
  engineMustEmit: [
    "An `unseen_defender` CHECK on throws where the read did not account for a defender, per §8.6.",
    "Its outcome linked to the resulting interception, so the attribution is a fact rather than " +
      "a coincidence of ordering.",
  ],
  realSideStatus: {
    available: false,
    note:
      "nflverse does not attribute interception cause. FTN's `is_interception_worthy` is the " +
      "nearest real-side signal and it is a judgement about the throw, not about the cause. The " +
      "real side of this decomposition needs charting the project does not have.",
  },
  forbiddenSubstitutes: [
    {
      name: "residual interceptions",
      aliases: ["unattributed_int", "other_int", "remainder_int"],
      whereItLives: "Whatever is left after tipped, contested and lane-deflection INTs are counted.",
      whyItIsWrong:
        "A residual is not a cause. Attributing the remainder to the unseen defender would make " +
        "an unimplemented mechanic appear to be working, and its band would then be satisfied by " +
        "errors in the other three attributions.",
      evidence: "CALIBRATION-BACKLOG 4a: anticipation is pure upside until §8.6 lands.",
    },
  ],
  references: [
    "docs/decisions/CALIBRATION-BACKLOG.md entry 4a",
    "docs/design/match-engine.md §8.6",
    "docs/design/calibration.md §4 (Tier 1, INT-source decomposition)",
  ],
};

/**
 * ENTRY 3 — penalties and fumbles.
 *
 * Both are named Tier 1 metrics (`penalty rate`, `fumble rate per touch`) and the engine models
 * neither: `simulateGame`'s header lists penalties among what it does not model, and ADR-010
 * declined a fumble event because §13/§14 specify no fumble mechanic.
 *
 * They are one entry because they share a trap: both have a defensible-looking zero. A metric
 * that returns 0.0 and fails its band looks like a tuning problem and is not one — there is
 * nothing to tune. Declaring them absent keeps them out of the pass/fail table entirely, where a
 * red row would be indistinguishable from a red row that means something.
 */
export const PENALTY_AND_FUMBLE_ABSENCE: MetricAbsence = {
  id: "penalty_rate_and_fumble_rate",
  tier: 1,
  title: "Penalty rate and fumble rate per touch",
  definition:
    "Penalties per play (accepted), and fumbles per offensive touch with the recovery split. " +
    "Both computable from the real side today.",
  whyAbsent:
    "The engine models neither. A `PENALTY` event exists in the contract and nothing emits it; " +
    "ADR-010 considered and declined a fumble event because the design document specifies no " +
    "fumble mechanic to emit one from.",
  engineMustEmit: [
    "A penalty mechanic, and `PENALTY` events from it — the event shape already exists.",
    "A fumble mechanic (a design-doc amendment first: §13/§14 contain no fumble rule), and the " +
      "ADR-010 event petition that would follow it.",
  ],
  realSideStatus: {
    available: true,
    from: "pbp.penalty / penalty_yards / penalty_type, and pbp.fumble / fumble_lost",
    note:
      "Real side computed and reported as an OBSERVATION so the target is standing. Not compared " +
      "to a sim value, because the sim value is structurally zero and a 100%-relative failure " +
      "against a zero denominator is noise in a report, not information.",
  },
  forbiddenSubstitutes: [
    {
      name: "structural zero as a passing value",
      aliases: ["zero_penalties", "assume_no_penalties"],
      whereItLives: "The absence of PENALTY events in any stream.",
      whyItIsWrong:
        "Reporting 0.0 against a real 0.11/play as a -100% band failure buries a real failure " +
        "list under a row nobody can act on. Reporting it as PASS would be worse.",
      evidence: "simulateGame's own 'what the loop does not model' list.",
    },
  ],
  references: [
    "docs/decisions/ADR-010-ball-carrier-event-vocabulary.md",
    "packages/engine/src/game/simulateGame.ts — 'WHAT THE LOOP DOES NOT MODEL'",
  ],
};

/**
 * ENTRY 4 — the Tier 4 pass-rush/pass-block win rates.
 *
 * The sim side is available: `pass_rush_tick` CHECKs name their actors and carry ADR-011's band,
 * so per-player win rate is a straight reduction over the stream and `tier4.ts` implements it.
 * The REAL side is not: ESPN's PBWR/PRWR tables are not among the eleven ingested sources.
 *
 * This is the mirror image of entry 1 and is recorded for that reason — the two together are the
 * honest statement of where the project stands. One metric has a target and no measurement; the
 * other has a measurement and no target.
 */
export const ESPN_WIN_RATE_ABSENCE: MetricAbsence = {
  id: "pbwr_prwr_real_target",
  tier: 4,
  title: "Pass-block / pass-rush win rate — the real-side target",
  definition:
    "Per-player pass-rush win rate and pass-block win rate as published by ESPN, joined to " +
    "simulated per-player win rates from `pass_rush_tick` CHECK bands. `Spec #4` calls this a " +
    "near-1:1 mapping and it is the strongest per-player convergence check available.",
  whyAbsent:
    "ESPN win-rate tables are not an ingested source. `calibration.md` §2 names them and the " +
    "scrape-with-CSV-fallback decision covers them; the ingestion layer shipped eleven sources " +
    "and this was not one of them.",
  engineMustEmit: [],
  realSideStatus: {
    available: false,
    note:
      "Needs an ingestion source, not an engine change. Until then the SIM side is computed and " +
      "reported as an observation with no target — which is the honest shape, and is why " +
      "`pbwr_sim_only` exists as a real metric with a distribution report and no band.",
  },
  forbiddenSubstitutes: [
    {
      name: "sack rate as a win-rate proxy",
      aliases: ["sack_rate_as_pbwr", "pressure_rate_as_prwr"],
      whereItLives: "Tier 1's sack and pressure rates, which are computed and available.",
      whyItIsWrong:
        "A win rate is per-REP; a sack rate is per-DROPBACK and is mediated by the quarterback, " +
        "the concept and the protection scheme. Substituting one for the other would attribute " +
        "quarterback behaviour to linemen, which is exactly the confound Tier 4 exists to avoid " +
        "(§4: 'volume stats excluded — usage is a coaching artefact').",
      evidence:
        "CALIBRATION-BACKLOG 2: sack rate moved 56.1% → 39.7% under a blocker-advantage sweep " +
        "while the driver was tick-1.0 timing, not the won-rep rate. The two numbers are not " +
        "even monotonically linked.",
    },
  ],
  references: ["docs/design/calibration.md §2, §4 (Tier 4)", "docs/design/attributes.md (Spec #4)"],
};

export const METRIC_ABSENCES: readonly MetricAbsence[] = [
  COVERAGE_QUALITY_ABSENCE,
  UNSEEN_DEFENDER_INT_ABSENCE,
  PENALTY_AND_FUMBLE_ABSENCE,
  ESPN_WIN_RATE_ABSENCE,
];

export function absenceById(id: string): MetricAbsence | undefined {
  return METRIC_ABSENCES.find((a) => a.id === id);
}

/** Raised by `getMetric` when the requested id is a declared absence rather than a metric. */
export class AbsentMetricError extends Error {
  readonly absence: MetricAbsence;
  constructor(absence: MetricAbsence) {
    super(
      `metric "${absence.id}" is a DECLARED ABSENCE, not a missing implementation.\n\n` +
        `  ${absence.title}\n` +
        `  Should be: ${absence.definition}\n` +
        `  Absent because: ${absence.whyAbsent}\n` +
        `  Engine must emit:\n${absence.engineMustEmit.map((e) => `    - ${e}`).join("\n")}\n` +
        `  Real side: ${absence.realSideStatus.available ? `AVAILABLE from ${absence.realSideStatus.from}` : "NOT AVAILABLE"} — ${absence.realSideStatus.note}\n` +
        `  DO NOT substitute: ${absence.forbiddenSubstitutes.map((f) => f.name).join(", ")}\n` +
        `  See: ${absence.references.join("; ")}`,
    );
    this.name = "AbsentMetricError";
    this.absence = absence;
  }
}

/** Raised when a candidate metric looks like one of the forbidden substitutes. */
export class ForbiddenSubstituteError extends Error {
  readonly absence: MetricAbsence;
  readonly substitute: ForbiddenSubstitute;
  constructor(absence: MetricAbsence, substitute: ForbiddenSubstitute, where: string, matched: string) {
    super(
      `${where} matched "${matched}", which is a FORBIDDEN SUBSTITUTE for the declared absence ` +
        `"${absence.id}".\n\n` +
        `  ${substitute.name} — ${substitute.whyItIsWrong}\n` +
        `  Evidence: ${substitute.evidence}\n` +
        `  It lives in: ${substitute.whereItLives}\n\n` +
        `  The metric that belongs here is: ${absence.definition}\n` +
        `  It is absent because: ${absence.whyAbsent}\n` +
        `  See: ${absence.references.join("; ")}\n\n` +
        `  If you are deliberately registering a STRUCTURAL metric (validating that a card means ` +
        `what it says, which is a legitimate use of these figures), name it so — put "structural" ` +
        `in the id — and state in its definition that it is not a quality measure.`,
    );
    this.name = "ForbiddenSubstituteError";
    this.absence = absence;
    this.substitute = substitute;
  }
}

/** Loose normalisation so `coverageReach`, `coverage_reach` and `Coverage Reach` all match. */
function normalise(text: string): string {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * The guard. Throws if `text` names a forbidden substitute.
 *
 * `structural` is the sanctioned escape hatch, and it is narrow on purpose: a metric whose id
 * contains `structural` is asserting that it describes the CARDS rather than grading the
 * COVERAGE, which is the one legitimate use ADR-019 explicitly preserves ("genuinely useful for
 * validating that a card means what it says"). It still has to say so in its definition.
 */
export function assertNotForbiddenSubstitute(
  text: string,
  where: string,
  options: { readonly allowStructural?: boolean } = {},
): void {
  const haystack = normalise(text);
  for (const absence of METRIC_ABSENCES) {
    for (const substitute of absence.forbiddenSubstitutes) {
      for (const candidate of [substitute.name, ...substitute.aliases]) {
        const needle = normalise(candidate);
        if (needle.length === 0 || !haystack.includes(needle)) continue;
        if (options.allowStructural === true && haystack.includes("structural")) continue;
        throw new ForbiddenSubstituteError(absence, substitute, where, candidate);
      }
    }
  }
}

/** Every forbidden spelling, flattened — for the source-scanning test. */
export function forbiddenSpellings(): readonly string[] {
  const out: string[] = [];
  for (const absence of METRIC_ABSENCES) {
    for (const substitute of absence.forbiddenSubstitutes) {
      out.push(substitute.name, ...substitute.aliases);
    }
  }
  return out;
}

/** The absences section every baseline report prints. Never optional. */
export function renderAbsences(): string {
  const lines: string[] = [
    "## Declared absences",
    "",
    "Metrics this library **should** have and deliberately does not. Each states what the metric",
    "would be, why it is not implemented, and the numbers that must not be substituted for it.",
    "",
  ];
  for (const a of METRIC_ABSENCES) {
    lines.push(`### ${a.title} \`${a.id}\` — Tier ${a.tier}`);
    lines.push("");
    lines.push(`**Should be:** ${a.definition}`);
    lines.push("");
    lines.push(`**Absent because:** ${a.whyAbsent}`);
    lines.push("");
    if (a.engineMustEmit.length > 0) {
      lines.push("**The engine must emit:**");
      for (const e of a.engineMustEmit) lines.push(`- ${e}`);
      lines.push("");
    }
    lines.push(
      `**Real side:** ${
        a.realSideStatus.available
          ? `available from \`${a.realSideStatus.from}\`. ${a.realSideStatus.note}`
          : `not available. ${a.realSideStatus.note}`
      }`,
    );
    lines.push("");
    lines.push("**Do not substitute:**");
    for (const f of a.forbiddenSubstitutes) {
      lines.push(`- **${f.name}** (${f.whereItLives}) — ${f.whyItIsWrong} *Evidence:* ${f.evidence}`);
    }
    lines.push("");
    lines.push(`*References:* ${a.references.join("; ")}`);
    lines.push("");
  }
  return lines.join("\n");
}
