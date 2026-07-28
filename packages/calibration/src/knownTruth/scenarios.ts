/**
 * THE SYNTHETIC KNOWN-TRUTH HARNESS — `calibration.md` §5.2 instrument 2, Phase 1 deliverable 4.
 *
 *   > *"hand-built archetype players with DESIGNED attributes run through controlled
 *   > micro-scenarios (elite OL vs poor rush; 95-accuracy QB vs 70; press CB vs release WR),
 *   > asserting **monotonicity** (better attribute → better outcome, always) and **effect-size
 *   > sanity** (the design doc's ±modifier tables produce their intended tiers at intended
 *   > frequencies). These double as the engine's statistical regression suite — run in CI on
 *   > every engine change."*
 *
 * ================== WHY THIS DOES NOT COMPARE ANYTHING TO THE NFL ==================
 *
 * It is the one calibration instrument that works while every Tier 1 metric is failing, and it
 * works *because* it makes no claim about realism. `CALIBRATION-BACKLOG.md` says completion sits
 * near 45% against a real 65% and yards per carry near 9.3 against 4.3 — so an absolute
 * assertion would fail today for reasons that have nothing to do with the property being tested.
 *
 * The property being tested is **ordering**: a 95-accuracy quarterback must complete more passes
 * than a 40-accuracy one, at any absolute level. That holds under every open backlog entry, and
 * the day it stops holding, an attribute has stopped mattering — which is exactly the signal
 * §5.3's sensitivity report is built to find, arriving early and as a red test.
 *
 * ================== WHAT A FAILURE MEANS ==================
 *
 *  - **Monotonicity broken** — the attribute's contribution has been inverted, saturated, or
 *    swamped. Backlog entry 4 is the live example: Poise refunds `(poise − 70)/10` of a −20
 *    penalty, so a 99-Poise quarterback claws back 3 points of 20. An attribute that weak is one
 *    a sensitivity sweep would recommend killing *for the wrong reason*.
 *  - **Effect size below floor** — the attribute moves the outcome, but by less than the design
 *    intends. Backlog entry 5 is the standing suspect: modifier stacks reach ~+42 on a d100, so
 *    the die is the primary term in every contest and the lever is the ÷5 divisor rather than
 *    any target number.
 *
 * Both are reported with the ladder's measured values attached, because "monotonicity failed" is
 * not actionable and "60 → 0.41, 75 → 0.44, 90 → 0.43" is.
 */
import type { Position } from "@ff/contracts";
import type { StatLine } from "@ff/engine";
import type { SimAccumulator } from "../metrics/collect.js";

/** What a scenario measures, restricted to the designed team so the effect is not diluted. */
export interface LadderMeasurement {
  readonly label: string;
  readonly unit: string;
  /** `null` when there were not enough observations to say anything. */
  measure(statlines: readonly StatLine[], accumulator: SimAccumulator): number | null;
}

export interface KnownTruthScenario {
  readonly id: string;
  /** Stated as a sentence, printed on failure. "Higher X produces higher Y." */
  readonly hypothesis: string;
  /** Registry attribute ids set to each rung's value. */
  readonly attributes: readonly string[];
  readonly positions: readonly Position[];
  /** The ladder, ascending. At least three rungs so "monotone" means something. */
  readonly rungs: readonly number[];
  /** Which team gets the design: 0 is home, 1 is away. */
  readonly designedTeam: 0 | 1;
  /** Whose statlines are measured. Usually the designed team; `1 - designedTeam` for defence. */
  readonly measuredTeam: 0 | 1;
  readonly measurement: LadderMeasurement;
  readonly direction: "INCREASES" | "DECREASES";
  /** Games per rung. The whole scenario costs `rungs.length × games`. */
  readonly games: number;
  /**
   * The minimum |top rung − bottom rung| the design is asserted to produce. Set from what the
   * engine currently does rather than from what it should do — this is a REGRESSION floor, and a
   * floor set above the current value would be red on day one and ignored by day three.
   */
  readonly minEffect: number;
  /**
   * How much a rung may dip below its predecessor before monotonicity is called broken. Not
   * zero: these are sampled quantities and a strict ordering over four rungs would flake. Set
   * to roughly one standard error at the scenario's sample size.
   */
  readonly monotonicityTolerance: number;
  readonly baseRating?: number;
}

// --- measurements -----------------------------------------------------------

function totals(statlines: readonly StatLine[]) {
  let attempts = 0;
  let completions = 0;
  let sacked = 0;
  let sackYards = 0;
  let passYards = 0;
  let interceptions = 0;
  let rushes = 0;
  let rushYards = 0;
  let defensiveSacks = 0;
  for (const line of statlines) {
    attempts += line.passing.attempts;
    completions += line.passing.completions;
    sacked += line.passing.sacked;
    sackYards += line.passing.sackYards;
    passYards += line.passing.yards;
    interceptions += line.passing.interceptions;
    rushes += line.rushing.attempts;
    rushYards += line.rushing.yards;
    defensiveSacks += line.defense.sacks;
  }
  return {
    attempts, completions, sacked, sackYards, passYards, interceptions, rushes, rushYards,
    defensiveSacks,
  };
}

export const COMPLETION_RATE: LadderMeasurement = {
  label: "completion rate",
  unit: "share",
  measure(statlines) {
    const t = totals(statlines);
    return t.attempts < 50 ? null : t.completions / t.attempts;
  },
};

export const SACK_RATE_TAKEN: LadderMeasurement = {
  label: "sack rate taken",
  unit: "share",
  measure(statlines) {
    const t = totals(statlines);
    const dropbacks = t.attempts + t.sacked;
    return dropbacks < 50 ? null : t.sacked / dropbacks;
  },
};

export const YARDS_PER_CARRY: LadderMeasurement = {
  label: "yards per carry",
  unit: "yards",
  measure(statlines) {
    const t = totals(statlines);
    return t.rushes < 40 ? null : t.rushYards / t.rushes;
  },
};

export const YARDS_PER_ATTEMPT: LadderMeasurement = {
  label: "yards per attempt",
  unit: "yards",
  measure(statlines) {
    const t = totals(statlines);
    return t.attempts < 50 ? null : t.passYards / t.attempts;
  },
};

/**
 * NET YARDS PER DROPBACK — sack yardage subtracted, sacks in the denominator.
 *
 * The only coverage measure that survived measurement, and the reason the other two did not is
 * worth keeping: **better coverage changes WHICH throws happen, not just how they end.** A
 * quarterback facing tighter coverage holds the ball, takes a sack, or throws only when somebody
 * finally comes open — so completion rate ALLOWED can go UP as coverage improves, purely through
 * selection. Measured: completion rate allowed reads 0.3787 / 0.3720 / 0.4011 / 0.3971 across the
 * 40 / 60 / 80 / 95 ladder, and completions per dropback reads 0.3233 / 0.3134 / 0.3217 / 0.3201
 * — both flat or inverted. Net yards per dropback puts the sacks in the denominator and their
 * yardage in the numerator, which closes the selection channel.
 */
export const NET_YARDS_PER_DROPBACK: LadderMeasurement = {
  label: "net yards per dropback",
  unit: "yards",
  measure(statlines) {
    const t = totals(statlines);
    const dropbacks = t.attempts + t.sacked;
    return dropbacks < 100 ? null : (t.passYards - t.sackYards) / dropbacks;
  },
};

export const INTERCEPTION_RATE: LadderMeasurement = {
  label: "interception rate",
  unit: "share",
  measure(statlines) {
    const t = totals(statlines);
    return t.attempts < 100 ? null : t.interceptions / t.attempts;
  },
};

// --- the v0 scenario set ----------------------------------------------------

/**
 * Five scenarios, chosen so that between them they exercise the four checks the design document
 * puts the most weight on — accuracy (§10.4), the pass-rush/pass-block rep (§7.1), the run
 * block (§6.3) and coverage (§9) — and so that each has an obvious inversion failure mode.
 *
 * The set is v0 and is meant to grow **check-kind by check-kind alongside the engine**
 * (`calibration.md` §9 deliverable 4). The shape to copy is: one attribute family, one team
 * designed, one rate measured on one team's statlines, ordering asserted, effect size floored.
 */
export const KNOWN_TRUTH_SCENARIOS: readonly KnownTruthScenario[] = [
  {
    id: "qb-accuracy-completion",
    hypothesis:
      "A more accurate quarterback completes a higher share of his attempts. §10.4's accuracy " +
      "bands are the mechanism; the target number is 60 against Accuracy ÷ 5. " +
      "MEASURED, AND WORTH RECORDING: the effect SATURATES almost completely above 60. At 40 " +
      "games a rung, completion runs 0.3704 / 0.4109 / 0.4091 / 0.4132 across 40 / 60 / 80 / 95 " +
      "— the whole 4.3-point effect is in the 40→60 step and 60→95 is worth 0.2 points. That is " +
      "consistent with §10.4's target of 60 against Accuracy ÷ 5 (a 95-accuracy quarterback " +
      "brings +19 to a target of 60, and the pressure penalty of −10/−20 is a larger term than " +
      "his entire advantage over a 60), and it is why the effect floor is set at 0.03 rather " +
      "than at something an accuracy ladder ought to produce. The floor is a regression gate; " +
      "the saturation is a finding for the backlog.",
    attributes: ["accuracy", "touch"],
    positions: ["QB"],
    rungs: [40, 60, 80, 95],
    designedTeam: 0,
    measuredTeam: 0,
    measurement: COMPLETION_RATE,
    direction: "INCREASES",
    games: 40,
    minEffect: 0.03,
    monotonicityTolerance: 0.01,
  },
  {
    id: "ol-passblock-sack-rate",
    hypothesis:
      "A better pass-blocking offensive line gives up fewer sacks. §7.1's rep is the mechanism, " +
      "and backlog entry 3 records that the blocker carries two terms against the rusher's " +
      "three, absorbed by a +15 structural constant — so the ordering must survive that.",
    attributes: ["passBlock", "footwork", "anchor", "sustain"],
    positions: ["LT", "LG", "C", "RG", "RT"],
    rungs: [40, 60, 80, 95],
    designedTeam: 0,
    measuredTeam: 0,
    measurement: SACK_RATE_TAKEN,
    direction: "DECREASES",
    games: 40,
    minEffect: 0.06,
    monotonicityTolerance: 0.01,
  },
  {
    id: "dl-passrush-sack-rate",
    hypothesis:
      "A better pass rush produces more sacks against a fixed line. The mirror of the previous " +
      "scenario, and the pair is what separates 'the rep works' from 'one side of the rep works'.",
    attributes: ["passRush", "powerMove", "finesseMove", "firstStep"],
    positions: ["DE", "DT", "NT"],
    rungs: [40, 60, 80, 95],
    designedTeam: 1,
    measuredTeam: 0,
    measurement: SACK_RATE_TAKEN,
    direction: "INCREASES",
    games: 40,
    minEffect: 0.05,
    monotonicityTolerance: 0.01,
  },
  {
    id: "rb-vision-ypc",
    hypothesis:
      "A better back gains more per carry behind a fixed line. §6.2's 'RB Vision Dependency' " +
      "makes vision mechanically live on zone schemes; backlog entry 11's quantisation means " +
      "the ABSOLUTE number is wrong, which is precisely why only the ordering is asserted.",
    attributes: ["vision", "elusiveness", "power", "patience"],
    positions: ["RB"],
    rungs: [40, 60, 80, 95],
    designedTeam: 0,
    measuredTeam: 0,
    measurement: YARDS_PER_CARRY,
    direction: "INCREASES",
    games: 40,
    minEffect: 1.5,
    monotonicityTolerance: 0.5,
  },
  {
    id: "db-coverage-net-yards-per-dropback",
    hypothesis:
      "Better coverage defenders concede fewer net yards per dropback. Note what this is NOT: " +
      "it measures the OUTCOME of coverage, not how CONTESTED the route was. Separation at the " +
      "throw is a declared absence (metrics/absence.ts) and no scenario in this file should be " +
      "read as covering it. " +
      "THE FLOOR HERE IS TINY, AND THAT IS THE FINDING RATHER THAN A CONCESSION. Across a " +
      "40→95 span on five coverage attributes at once, net yards per dropback moves 1.976 → " +
      "1.886 → 1.732 → 1.769: about a fifth of a yard, over a hundred games a rung, under " +
      "common random numbers. For comparison the same 40→95 span moves sack rate by 9.7 points " +
      "on the offensive line and 8.6 on the defensive line, and yards per carry by 3.2. " +
      "Coverage attributes are the weakest family measured, which is exactly the signal " +
      "§5.3's sensitivity report exists to find — arriving early, as a regression floor pinned " +
      "to what the engine currently does.",
    attributes: ["manCoverage", "zoneCoverage", "press", "ballSkills", "playRecognition"],
    positions: ["CB", "FS", "SS"],
    rungs: [40, 60, 80, 95],
    designedTeam: 1,
    measuredTeam: 0,
    measurement: NET_YARDS_PER_DROPBACK,
    direction: "DECREASES",
    games: 100,
    minEffect: 0.12,
    monotonicityTolerance: 0.06,
  },
];

export function scenarioById(id: string): KnownTruthScenario {
  const found = KNOWN_TRUTH_SCENARIOS.find((s) => s.id === id);
  if (found === undefined) {
    throw new RangeError(
      `no known-truth scenario "${id}"; have ${KNOWN_TRUTH_SCENARIOS.map((s) => s.id).join(", ")}`,
    );
  }
  return found;
}
