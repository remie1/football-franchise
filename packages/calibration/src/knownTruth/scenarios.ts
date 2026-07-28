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
 * works *because* it makes no claim about realism. `CALIBRATION-BACKLOG.md`'s Tier 1 baseline
 * has completion near 45% against a real 65% and yards per carry far above a real 4.3 — so an
 * absolute assertion would fail today for reasons that have nothing to do with the property being
 * tested. (Those two figures are the BASELINE's, cited, and they move as the engine moves; the
 * numbers this file itself relies on are re-recorded per scenario below with the seed digest that
 * produced them, and are the only numbers here anybody should treat as current.)
 *
 * The property being tested is **ordering**: a 95-accuracy quarterback must complete more passes
 * than a 40-accuracy one, at any absolute level. That holds under every open backlog entry, and
 * the day it stops holding, an attribute has stopped mattering — which is exactly the signal
 * §5.3's sensitivity report is built to find, arriving early and as a red test.
 *
 * ================== AND WHY IT NEARLY DID NOT WORK ==================
 *
 * The ordering claim is only as good as the LADDER it is asserted over, and that is the lesson
 * of this file's own CI failure. `qb-accuracy-completion` went red on a 40/60/80/95 ladder whose
 * top three rungs were, statistically, one rung: accuracy saturates above 60, so the gate was
 * asserting that noise was monotone and passing on luck. Re-measuring found the same fault
 * hiding in `db-coverage`, which was 1.4σ from a false red and had never gone off.
 *
 * Every scenario below therefore records a RESPONSE CURVE, not only a ladder — the measured
 * shape of outcome against attribute across the whole 0-99 scale — because the rungs are only
 * defensible with respect to where the effect actually lives, and a saturating attribute is a
 * finding in its own right. Two of the five families saturate. One flattens at the BOTTOM
 * instead. None of that is visible from a four-rung ladder someone picked by eye.
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
 *
 * And before treating either as an engine regression, check the third possibility: that the
 * ladder is under-powered. `monotonicityTolerance` below carries the rule that decides, and
 * `test/knownTruth.test.ts` asserts it, so a red gate here is now a red gate about the ENGINE
 * unless somebody has edited a field marked "measured" without measuring it.
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
   * zero: these are sampled quantities and a strict ordering over four rungs would flake.
   *
   * ============ THE RULE THIS IS SET BY, AND WHY IT IS NOT "ONE STANDARD ERROR" ============
   *
   * It used to say "roughly one standard error at the scenario's sample size", and that rule is
   * what put this file's own gate at a coin flip. A tolerance of one SE means a step trips on
   * noise something like one time in six; four rungs is three steps; the gate flaked, and it
   * flaked on `qb-accuracy-completion` in CI. The rule that replaced it has two halves and BOTH
   * must hold, because either half alone is satisfied by a gate that asserts nothing:
   *
   *   1. **NOISE MARGIN — `(true step + tolerance) / step SE` ≥ 4 for every step.** How far a
   *      step must travel before the gate reddens. Four sigma is about one false red in thirty
   *      thousand runs, per step, which is what "runs on every push" costs.
   *   2. **SIGNAL MARGIN — `tolerance ≤ ½ × the smallest true step`.** So a step that genuinely
   *      inverts is still caught. This is the half that stops (1) from being satisfied by simply
   *      widening the tolerance until nothing can fail, and it is the half that dictates the
   *      RUNGS rather than the games: a rung spacing whose true step is smaller than ~8 × the
   *      step SE cannot satisfy both at any affordable sample size, and the answer then is to
   *      move the rungs to where the effect lives, never to widen the tolerance.
   *
   * Both halves are computed from a MEASURED step SE — the same ladder run under three
   * independent batch seeds, taking the spread of each step — never from a binomial formula,
   * which would ignore that a completion changes the next down and distance and therefore the
   * whole rest of the drive. Every scenario below records its measured steps, their SE and the
   * margin it achieves, and those numbers are what a future reader should re-measure rather than
   * trust after the engine moves again.
   *
   * NOTE WHAT THIS MEANS FOR A "WIDENED" TOLERANCE. `db-coverage`'s tolerance went UP, 0.06 to
   * 0.10, and the gate got STRICTER: on its old rungs the smallest true step was 0.096, so the
   * tolerance was 0.63 of the signal; on its new ones the smallest true step is 0.258 and the
   * tolerance is 0.39 of it. The absolute number is not the thing to read. The ratio is, and
   * across all five scenarios it is now 0.26 to 0.39 where it used to reach 0.63 — and, on the
   * ladder that actually went red, an unmeasurable ~10 (a tolerance of 0.01 policing a step that
   * turned out to be 0.001).
   *
   * Neither half is left as prose. `recordedSteps` and `recordedStepSE` carry the measurement,
   * and `test/knownTruth.test.ts` asserts both halves against them on every run.
   */
  readonly monotonicityTolerance: number;
  /**
   * THE MEASUREMENT THE TOLERANCE AND THE FLOOR ARE SET FROM — mean of each consecutive step,
   * in `direction`'s sign, across several INDEPENDENT batch seeds.
   *
   * This exists so the tolerance rule is checkable instead of merely stated. Without it,
   * "tolerance ≤ ½ the smallest true step" is a sentence in a comment that a future green-making
   * edit can raise `monotonicityTolerance` straight past. With it, that edit has to also edit a
   * field labelled "measured", next to a hypothesis quoting the seeds and sample size — which is
   * a visible falsification rather than a plausible tweak.
   *
   * One entry per step, so `recordedSteps.length === rungs.length - 1`.
   */
  readonly recordedSteps: readonly number[];
  /**
   * Standard error of each step, AT THIS SCENARIO'S `games`. Where the replicates were run at a
   * different sample size the number is scaled by √(replicateGames / games) and the scenario's
   * hypothesis says so — never silently.
   *
   * Measured, never derived from a binomial formula: a completion changes the next down and
   * distance and therefore the rest of the drive, so the per-rung observations are not
   * independent Bernoulli trials and a formula would understate this by a factor that varies by
   * scenario. Estimates from three replicates proved optimistic — `db-coverage`'s second step
   * read SE 0.028 over three seeds and 0.091 over six — so treat a small replicate count as a
   * lower bound and buy headroom in `games` rather than trusting it.
   */
  readonly recordedStepSE: readonly number[];
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
 * selection. Measured: completion rate allowed read 0.3787 / 0.3720 / 0.4011 / 0.3971 across a
 * 40 / 60 / 80 / 95 ladder, and completions per dropback read 0.3233 / 0.3134 / 0.3217 / 0.3201
 * — both flat or inverted. Net yards per dropback puts the sacks in the denominator and their
 * yardage in the numerator, which closes the selection channel.
 *
 * Those four-figure ladders are from the rejection experiment and PRE-DATE the play-card corpus
 * and the blitz dispatches; they are kept because what they establish is the SELECTION EFFECT,
 * which is structural and does not expire, and not a level. Every number this file still relies
 * on is re-recorded per scenario below, with the seed digest that produced it.
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
      "RECORDED 2026-07 (seed known-truth:qb-accuracy-completion, digest fnv1a:8fea204c#100, " +
      "100 games a rung): 0 → 0.3057, 20 → 0.3364, 40 → 0.3728, 95 → 0.4055, effect 0.0998. " +
      "Steps across four independent seed sets: 0.0296 ± 0.0053, 0.0317 ± 0.0071, 0.0380 ± " +
      "0.0086 — noise margins 7.4σ / 5.9σ / 5.6σ, floor margin 4.6σ. " +
      "WHY THE RUNGS ARE 0/20/40/95 AND NOT 40/60/80/95. A 200-game-a-rung sweep at 0, 10, 20, " +
      "30, 40, 50, 60, 70, 80, 95 reads 0.3023 / 0.3226 / 0.3338 / 0.3515 / 0.3682 / 0.3751 / " +
      "0.3965 / 0.4020 / 0.3985 / 0.4063: near-linear at 0.00157 completion per accuracy point " +
      "from 0 to 60, then 0.00028 per point from 60 to 95 — a fifth of the slope. Above 60 the " +
      "attribute is real but nearly flat (the 60→95 step measures 0.0104 ± 0.0045 over three " +
      "seeds, positive at t≈4 but smaller than the tolerance), so a ladder of 40/60/80/95 spends " +
      "three of its four rungs inside the saturated shelf and asserts monotonicity over noise. " +
      "It failed in CI for exactly that reason. The 40→95 rung skips the shelf, keeping the top " +
      "of the scale in the ladder while making every step 3–4× the tolerance. " +
      "THIS CORRECTS CALIBRATION-BACKLOG ENTRY 22, which recorded the saturation as 'the entire " +
      "4.3-point effect sits in 40→60, 60→95 is worth 0.2 points'. That reading came from a " +
      "ladder starting at 40 with 40 games a rung, where the step SE is ~0.011 and three of the " +
      "four rungs are one rung. Measured properly the span is 9.9 points over 0→95, the " +
      "saturation point is ~60 rather than ~50, and 60→95 is worth 1.0 point, not 0.2. The " +
      "FINDING survives — accuracy's scale is compressed above 60 and that is a §5.3 sensitivity " +
      "signal about the SCALE, not a kill candidate — but its numbers were wrong.",
    attributes: ["accuracy", "touch"],
    positions: ["QB"],
    rungs: [0, 20, 40, 95],
    designedTeam: 0,
    measuredTeam: 0,
    measurement: COMPLETION_RATE,
    direction: "INCREASES",
    games: 100,
    minEffect: 0.05,
    monotonicityTolerance: 0.01,
    recordedSteps: [0.0296, 0.0317, 0.038],
    recordedStepSE: [0.0053, 0.0071, 0.0086],
  },
  {
    id: "ol-passblock-sack-rate",
    hypothesis:
      "A better pass-blocking offensive line gives up fewer sacks. §7.1's rep is the mechanism, " +
      "and backlog entry 3 records that the blocker carries two terms against the rusher's " +
      "three, absorbed by a +15 structural constant — so the ordering must survive that. " +
      "RECORDED 2026-07 (seed known-truth:ol-passblock-sack-rate, digest fnv1a:e52f06b6#80, 80 " +
      "games a rung): 20 → 0.2629, 45 → 0.2175, 70 → 0.1716, 95 → 0.1353, effect 0.1276. Steps " +
      "across four independent seed sets: 0.0435 ± 0.0070, 0.0390 ± 0.0065, 0.0393 ± 0.0083 — " +
      "noise margins 7.6σ / 7.6σ / 5.9σ, floor margin 5.4σ. " +
      "THE FINDING THAT MADE THE RUNGS EVEN: pass block is the ONLY family in this file with no " +
      "saturation anywhere on the scale. An 80-game sweep at 0/20/40/60/80/95 reads 0.2615 / " +
      "0.2235 / 0.1979 / 0.1656 / 0.1400 / 0.1181 — straight, ~0.0015 sack rate per point, end " +
      "to end. Accuracy flattens above 60 and pass rush flattens below 20; this one does not " +
      "flatten, so its rungs can be evenly spaced and every step is worth the same.",
    attributes: ["passBlock", "footwork", "anchor", "sustain"],
    positions: ["LT", "LG", "C", "RG", "RT"],
    rungs: [20, 45, 70, 95],
    designedTeam: 0,
    measuredTeam: 0,
    measurement: SACK_RATE_TAKEN,
    direction: "DECREASES",
    games: 80,
    minEffect: 0.06,
    monotonicityTolerance: 0.01,
    recordedSteps: [0.0435, 0.039, 0.0393],
    recordedStepSE: [0.007, 0.0065, 0.0083],
  },
  {
    id: "dl-passrush-sack-rate",
    hypothesis:
      "A better pass rush produces more sacks against a fixed line. The mirror of the previous " +
      "scenario, and the pair is what separates 'the rep works' from 'one side of the rep works'. " +
      "RECORDED 2026-07 (seed known-truth:dl-passrush-sack-rate, digest fnv1a:e1fb93bc#120, 120 " +
      "games a rung): 20 → 0.1251, 45 → 0.1607, 70 → 0.2017, 95 → 0.2444, effect 0.1193. Steps " +
      "across four independent seed sets: 0.0298 ± 0.0091, 0.0436 ± 0.0035, 0.0435 ± 0.0072 — " +
      "noise margins 4.4σ / 15.2σ / 7.4σ, floor margin 4.7σ. Three of those four seed sets ran " +
      "at 80 games rather than 120, so the SE quoted is a CONSERVATIVE estimate for this " +
      "scenario's sample size, not a scaled one; the true margins are wider. " +
      "WHY THE LADDER STARTS AT 20. An 80-game sweep at 0/20/40/60/80/95 reads 0.0909 / 0.1031 " +
      "/ 0.1411 / 0.1764 / 0.2044 / 0.2280: the 0→20 span is worth 0.012 against 0.038 for " +
      "20→40, so the bottom of the pass-rush scale is a shelf the way the TOP of the accuracy " +
      "scale is. Worth stating as a finding rather than only as a rung choice — the pass RUSH " +
      "flattens at the bottom while the pass BLOCK it is contested against is linear to zero, " +
      "and that asymmetry of SHAPE, not merely of level, is what backlog entry 3's asymmetric " +
      "term count predicts. The two scenarios measure the same rep from both sides, so a shape " +
      "difference between them is a property of the formula and cannot be a property of the die.",
    attributes: ["passRush", "powerMove", "finesseMove", "firstStep"],
    positions: ["DE", "DT", "NT"],
    rungs: [20, 45, 70, 95],
    designedTeam: 1,
    measuredTeam: 0,
    measurement: SACK_RATE_TAKEN,
    direction: "INCREASES",
    games: 120,
    minEffect: 0.075,
    monotonicityTolerance: 0.01,
    recordedSteps: [0.0298, 0.0436, 0.0435],
    recordedStepSE: [0.0091, 0.0035, 0.0072],
  },
  {
    id: "rb-vision-ypc",
    hypothesis:
      "A better back gains more per carry behind a fixed line. §6.2's 'RB Vision Dependency' " +
      "makes vision mechanically live on zone schemes; backlog entry 11's quantisation means " +
      "the ABSOLUTE number is wrong, which is precisely why only the ordering is asserted. " +
      "RECORDED 2026-07 (seed known-truth:rb-vision-ypc, digest fnv1a:3d483a27#80, 80 games a " +
      "rung): 20 → 10.157, 45 → 12.000, 70 → 14.193, 95 → 17.139, effect 6.98. Steps across " +
      "four independent seed sets: 1.408 ± 0.301, 2.168 ± 0.293, 2.666 ± 0.330 — noise margins " +
      "6.3σ / 9.1σ / 9.6σ. " +
      "THE FLOOR IS DELIBERATELY SLACK AT 1.5 AGAINST A MEASURED SPAN OF 6.24 ± 0.50, WHICH IS " +
      "9.5σ OF SLACK, and that is not an oversight. Yards per carry runs 10–17 against a real " +
      "4.3 (backlog entries 11–14: the receiver-zone quantisation adds yardage that has nowhere " +
      "to go). Every step on this ladder is inflated by the same defect. When it is fixed the " +
      "span will shrink roughly in proportion, and a floor set tight against today's inflated " +
      "span would then fail — reporting a REGRESSION on the day the engine got more correct. " +
      "A floor pinned to a known-wrong magnitude is a floor that punishes the fix. Re-tighten " +
      "this one only after entries 11–14 close. " +
      "The convexity is a separate finding and is real: the 70→95 step is 1.9× the 20→45 step, " +
      "so the back's attributes compound rather than add — plausibly vision opening a gap that " +
      "elusiveness then exploits, which would be a genuine interaction and is the first thing " +
      "§5.3's correlation sweep should look at on this family.",
    attributes: ["vision", "elusiveness", "power", "patience"],
    positions: ["RB"],
    rungs: [20, 45, 70, 95],
    designedTeam: 0,
    measuredTeam: 0,
    measurement: YARDS_PER_CARRY,
    direction: "INCREASES",
    games: 80,
    minEffect: 1.5,
    monotonicityTolerance: 0.5,
    recordedSteps: [1.408, 2.168, 2.666],
    recordedStepSE: [0.301, 0.293, 0.33],
  },
  {
    id: "db-coverage-net-yards-per-dropback",
    hypothesis:
      "Better coverage defenders concede fewer net yards per dropback. Note what this is NOT: " +
      "it measures the OUTCOME of coverage, not how CONTESTED the route was. Separation at the " +
      "throw is a declared absence (metrics/absence.ts) and no scenario in this file should be " +
      "read as covering it. " +
      "RECORDED 2026-07 (seed known-truth:db-coverage-net-yards-per-dropback, digest " +
      "fnv1a:0c9d7f1f#400, 400 games a rung): 0 → 2.3975, 50 → 2.1168, 95 → 1.8398, effect " +
      "0.5576. Steps across SIX independent seed sets at 350 games: 0.371 ± 0.087 and 0.258 ± " +
      "0.091; the SE recorded on the scenario is those scaled to 400 games by √(350/400). Noise " +
      "margins 5.8σ and 4.2σ, floor margin 4.6σ. " +
      "THIS IS THE MOST EXPENSIVE LADDER IN THE FILE, 1,200 GAMES, AND THE COST IS THE FINDING. " +
      "Net yards per dropback has a fat tail — a beaten corner concedes a 40-yard play, not a " +
      "6-yard one — so its per-rung SE is ~0.12 yards at 350 games where completion rate's is " +
      "~0.006 share. Coverage needs roughly five times the sample of any other family in this " +
      "file to say anything at all, and that IS §5.3's signal: coverage attributes have the " +
      "worst signal-to-noise ratio of anything measured. Recorded loudly because the obvious " +
      "economy — trim the games until the suite is fast — silently converts this gate back into " +
      "the coin flip it was. " +
      "THE PREVIOUS RUNGS WERE 40/60/80/95 AND THEY WERE THE WORST GATE IN THE SUITE, worse " +
      "than the accuracy ladder that actually went red. Measured across three seed sets, its " +
      "smallest step sat 1.4σ from its tolerance — call it an 8% chance of a false red on that " +
      "step alone, per run, on a suite that runs on every push. It was green on the day it was " +
      "written and that was luck. The cause is the same as the accuracy ladder's: COVERAGE ALSO " +
      "SATURATES ABOVE 60. An 80-game sweep at 0/20/40/60/80/95 reads 2.256 / 1.943 / 1.878 / " +
      "1.599 / 1.663 / 1.624 — monotone to 60, then flat-to-inverted, so 60→80→95 was two rungs " +
      "of noise. Two of the five families measured here flatten at the top of the scale; that " +
      "the SECOND one was found only by re-rungeing the first is the reason this file now " +
      "records a response curve for every scenario rather than only a ladder. " +
      "The 0/50/95 ladder keeps the whole scale and puts both steps above a quarter of a yard.",
    attributes: ["manCoverage", "zoneCoverage", "press", "ballSkills", "playRecognition"],
    positions: ["CB", "FS", "SS"],
    rungs: [0, 50, 95],
    designedTeam: 1,
    measuredTeam: 0,
    measurement: NET_YARDS_PER_DROPBACK,
    direction: "DECREASES",
    games: 400,
    minEffect: 0.25,
    monotonicityTolerance: 0.1,
    recordedSteps: [0.3711, 0.258],
    recordedStepSE: [0.0816, 0.0849],
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
