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
 * finding in its own right. Two of the five families saturate at the TOP; two now flatten at the
 * BOTTOM. None of that is visible from a four-rung ladder someone picked by eye.
 *
 * ================== AND WHY A CURVE IS NOT ENOUGH EITHER ==================
 *
 * A curve is still ONE DRAW. `ol-passblock`'s canonical seed list measures its second rung high,
 * which makes the step below it small and the step above it large, and that single artefact was
 * read — in a backlog entry, by careful people — as the ladder having developed a shelf. Across
 * eight seed sets the three steps are 0.0509 / 0.0546 / 0.0537: flat. So the rule is not "map the
 * curve", it is **map the curve and then replicate the ladder**, and `test/ladderRerung.test.ts`
 * is the instrument that does both. A shape seen once is a hypothesis; `recordedStepSE` is the
 * only thing in this file that can promote it.
 *
 * ================== WHAT THE `attributes` LIST IS ==================
 *
 * A CHECKED CLAIM. `mechanismCheckKinds` names the engine check kinds a scenario means to test
 * and `test/attributeClaims.test.ts` folds the engine's own `testsAttrs` out of the
 * scenario's own games, so "this ladder moves four attributes" is established rather than
 * asserted. It is asserted-rather-than-established prose that made `ol-passblock`'s hypothesis
 * wrong three times in a row, and prose is the only part of a scenario nothing was checking.
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
  /**
   * Registry attribute ids set to each rung's value.
   *
   * **THIS LIST IS A CHECKED CLAIM, not a description.** `mechanismCheckKinds` below and
   * `attributeUsage.ts` turn it into an assertion: every id here must be read by the mechanic this
   * scenario measures, established from the engine's own `testsAttrs` on the stream. An id that
   * is set and never read is a rung that moves a number nothing consults, and it used to be
   * discoverable only by reading the engine — which is how this file's hypothesis strings came to
   * over-claim three times running.
   */
  readonly attributes: readonly string[];
  /**
   * The engine check kinds whose term lists ARE this scenario's mechanism.
   *
   * Written from the DESIGN — "this ladder is about §7.1's rep, whose check kind is
   * `pass_rush_tick`" — and it is the one part of the attribute claim that stays declared, because
   * nothing else can say which mechanic a scenario means to test. What it buys is that the
   * ATTRIBUTE list stops being declared: `test/attributeClaims.test.ts` runs the
   * scenario and fails if any laddered attribute is not read here. Widening this list to make a
   * failure go away is a visible falsification — declaring `second_level_climb` part of a scenario
   * that measures sack rate is not a plausible tweak.
   */
  readonly mechanismCheckKinds: readonly string[];
  /**
   * The attributes this scenario SETS that its mechanism does NOT read — asserted to be EXACTLY
   * the derived set, in both directions.
   *
   * The empty list is the healthy state and four of the five scenarios do not have it. It exists
   * because the alternative to declaring a known inertness is DROPPING the attribute, and
   * dropping one changes what the ladder measures and therefore forces a full re-record — which
   * is a real cost that should be paid deliberately rather than smuggled into whichever dispatch
   * happened to notice.
   *
   * It cannot rot in either direction. If a listed attribute becomes live the set no longer
   * matches and the check reddens; if an unlisted one goes dead, likewise. That is the whole
   * difference between this and the sentence it replaced.
   */
  readonly attributesNotReadByMechanism: readonly string[];
  /**
   * Set when this scenario's recorded numbers PREDATE an engine change and have not been
   * re-derived — `CALIBRATION-BACKLOG.md` §22d's *"every sensitivity figure measured before the
   * re-runging is PROVISIONAL"*, attached to the scenario instead of left in a backlog entry.
   *
   * A stale record does not make a gate wrong: `recordedSteps` and `recordedStepSE` are
   * internally consistent, so the two margin rules still hold and the ladder still asserts an
   * ordering. What it makes wrong is every number a reader QUOTES from here. Absent this field
   * that difference is invisible, which is how four of five records drifted through ADR-024, 026
   * and 028 without anyone noticing.
   *
   * Re-recording clears it. Nothing else does — and re-recording means the whole §22a procedure:
   * re-map the curve, re-choose the rungs, re-derive the SE across independent seed sets.
   */
  readonly provisional?: {
    /** What moved underneath the record. An ADR id, normally. */
    readonly invalidatedBy: string;
    /** The canonical ladder as re-measured on the date in `note`. One entry per rung. */
    readonly measuredLadder: readonly number[];
    readonly note: string;
  };
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
    mechanismCheckKinds: ["accuracy"],
    /**
     * `touch` is read by the §8.4 tight-window modifier (`QB_READ`), never by §10.4's `accuracy`
     * check — so this ladder moves completion through TWO channels and its hypothesis names one.
     * Found by the derivation, not by reading the engine, which is the point of the derivation.
     */
    attributesNotReadByMechanism: ["touch"],
    provisional: {
      invalidatedBy: "ADR-024/026/028",
      measuredLadder: [0.3029, 0.3349, 0.3645, 0.406],
      note:
        "2026-07, re-measured read-only on the canonical seeds (digest fnv1a:8fea204c#100). The " +
        "record above reads 0.3057 / 0.3364 / 0.3728 / 0.4055; the drift is inside the recorded " +
        "step SEs and the effect grew 0.0998 → 0.1031. Least stale of the four. Steps and SE " +
        "NOT re-derived, so every margin quoted above is the pre-ADR-024 one.",
    },
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
      "A better pass-blocking offensive line gives up fewer sacks. §7.1's rep is the mechanism. " +
      "WHICH attributes it reads is NOT stated here — `attributes` below is the claim and " +
      "`test/attributeClaims.test.ts` checks it against the engine's own `testsAttrs`. " +
      "This sentence used to name them, and it was wrong three times running (four, then two, " +
      "then three), every time because the engine moved and the prose sat still. " +
      "RE-RECORDED 2026-07 AFTER ADR-028 (seed known-truth:ol-passblock-sack-rate, digest " +
      "fnv1a:6343f7ee#160, 160 games a rung): 20 → 0.2707, 45 → 0.2351, 70 → 0.1723, 95 → " +
      "0.1156, effect 0.1551. Steps across EIGHT independent seed sets at 160 games: 0.0509 ± " +
      "0.0087, 0.0546 ± 0.0057, 0.0537 ± 0.0040 — noise margins 7.0σ / 11.3σ / 16.1σ, span " +
      "0.1592 ± 0.0066 against a floor of 0.06, floor margin 15σ. Every ± is the SD of ONE " +
      "ladder's step, never the SE of the mean of eight: the gate runs one ladder, so what " +
      "threatens it is a single draw, and dividing by √K would shrink the recorded margin every " +
      "time somebody measured harder. " +
      "ADR-028 GREW THE EFFECT 25%, from 0.1276 to 0.1592, which is this gate doing the job it " +
      "was built for — the §7.1 slope change surfaced here without anyone pointing the " +
      "instrument at it. Three attribute terms respond to a rating point where two terms plus a " +
      "flat +15 did not. " +
      "GAMES WENT 80 → 160 AND THE REASON IS THE MEASURED SE, NOT THE VALUES. At 80 games and " +
      "six seed sets the steps read 0.0522 ± 0.0132 / 0.0545 ± 0.0116 / 0.0541 ± 0.0060, so the " +
      "first step sat at 4.7σ — over the 4σ rule and close enough that a moderate engine change " +
      "would redden it for no reason. SE falls as 1/√games; 160 buys 7.0σ. The ladder went from " +
      "~13s to ~38s and db-coverage still runs ~60s beside it, so the PACKAGE's wall clock did " +
      "not move at all — that is what the one-file-per-scenario split was for (knownTruthGate.ts). " +
      "WHY THE RUNGS DID NOT MOVE — AND THE CLAIM THAT NEARLY MOVED THEM. " +
      "CALIBRATION-BACKLOG entry 33 recorded the canonical steps as 0.0375 / 0.0716 / 0.0510 and " +
      "concluded that 'every step worth the same' was FALSE, the middle step being nearly twice " +
      "the outer ones — a ladder sitting partly on a shelf. IT IS NOT. Across eight seed sets " +
      "the mean steps are 0.0509 / 0.0546 / 0.0537, flat to within their SDs. The canonical seed " +
      "list happens to measure rung 45 high (0.2351 against 0.2146–0.2240 on the other seven), " +
      "which lowers the step below it and raises the step above it, and that single high rung is " +
      "the entire 'shelf'. The tell is that ONE run holds both extremes: across the eight seed " +
      "sets the canonical 20→45 step is the smallest of the eight (0.0356 against a spread to " +
      "0.0647) and its 45→70 step is the largest (0.0628 against a spread down to 0.0463). A " +
      "genuine shelf does not move when the seeds do. " +
      "A one-draw shape read as a slope change is exactly the error §22a's 'one run cannot " +
      "produce an SE' exists to prevent, arriving this time in a BACKLOG ENTRY rather than in a " +
      "scenario record. " +
      "THE RESPONSE CURVE, RE-MAPPED (§22d, map before you choose rungs), 80 games a rung at " +
      "0/10/20/30/40/50/60/70/80/95: 0.2928 / 0.2817 / 0.2750 / 0.2608 / 0.2510 / 0.2173 / " +
      "0.1977 / 0.1728 / 0.1557 / 0.1209. There IS a new shelf and it is at the BOTTOM: " +
      "0.00089 sack rate per point from 0 to 20, against 0.00205 from 20 to 95 — the bottom " +
      "fifth of the scale is worth 43% of the slope above it. ADR-028 created it, and it is the " +
      "predictable price of removing a floor: a 0-rated line used to collect +15 points it had " +
      "not earned and now collects nothing, so the rep saturates against the rusher. The ladder " +
      "already starts at 20, at the top of that shelf, so the rungs stand — but they stand " +
      "because the curve was re-mapped, not because they were the recorded ones. " +
      "THIS FALSIFIES THE OLD RECORD'S HEADLINE, which read 'pass block is the ONLY family in " +
      "this file with no saturation anywhere on the scale ... straight, ~0.0015 per point, end " +
      "to end'. Post-ADR-028 it flattens at the bottom exactly as pass RUSH does, so the " +
      "SHAPE ASYMMETRY between the two sides of the §7.1 rep — which dl-passrush's hypothesis " +
      "cited as evidence for backlog entry 3's term-count argument — is gone. That asymmetry " +
      "was the term-count asymmetry, and ADR-028 removed the term-count asymmetry. " +
      "DROPPING `sustain` CHANGED NOTHING MEASURABLE, and it was measured rather than assumed. " +
      "It is read by `second_level_climb` and by no §7.1 check, so setting it on the rung was " +
      "varying the line's RUN blocking underneath a sack-rate ladder. Same curve with and " +
      "without it, 80 games a rung: no rung moved by more than 0.0070, the sign of the " +
      "difference alternates, and the endpoints moved 0.0042 and 0.0001 (span 0.1762 → 0.1719). " +
      "The confound was real and small; it is now zero.",
    attributes: ["passBlock", "footwork", "anchor"],
    mechanismCheckKinds: ["pass_rush_tick"],
    attributesNotReadByMechanism: [],
    positions: ["LT", "LG", "C", "RG", "RT"],
    rungs: [20, 45, 70, 95],
    designedTeam: 0,
    measuredTeam: 0,
    measurement: SACK_RATE_TAKEN,
    direction: "DECREASES",
    games: 160,
    minEffect: 0.06,
    monotonicityTolerance: 0.01,
    recordedSteps: [0.0509, 0.0546, 0.0537],
    recordedStepSE: [0.0087, 0.0057, 0.004],
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
      "scale is. " +
      "⚠ THE SHAPE-ASYMMETRY FINDING THAT USED TO SIT HERE IS DEAD, AND ADR-028 KILLED IT. It " +
      "read: 'the pass RUSH flattens at the bottom while the pass BLOCK it is contested against " +
      "is linear to zero, and that asymmetry of SHAPE, not merely of level, is what backlog " +
      "entry 3's asymmetric term count predicts.' Entry 3's asymmetry WAS the term count — two " +
      "blocker terms plus a flat +15 against three rusher terms — and ADR-028 made the blocker " +
      "carry three real terms and set the constant to 0. Re-mapped after it, pass BLOCK flattens " +
      "at the bottom too (0.00089 sack rate per point below 20 against 0.00205 above it; see " +
      "ol-passblock's hypothesis for the curve). The prediction was right and the thing it " +
      "predicted has been removed, so the shape difference is gone. What survives is the method " +
      "note: the two scenarios measure the same rep from both sides, so a shape difference " +
      "between them is a property of the formula and cannot be a property of the die.",
    attributes: ["passRush", "powerMove", "finesseMove", "firstStep"],
    mechanismCheckKinds: ["pass_rush_tick"],
    attributesNotReadByMechanism: [],
    provisional: {
      invalidatedBy: "ADR-028",
      measuredLadder: [0.1365, 0.1703, 0.2114, 0.2451],
      note:
        "2026-07, re-measured read-only on the canonical seeds (digest fnv1a:e1fb93bc#120). The " +
        "record above reads 0.1251 / 0.1607 / 0.2017 / 0.2444 and the effect SHRANK, 0.1193 → " +
        "0.1086, which is ADR-028 seen from the other side of the same rep: a 60-rated blocker " +
        "went from 2×round(60/5)+15 = 39 points to 3×round(60/5) = 36, so a fixed line is three " +
        "points weaker and every rung of the rush ladder sits higher. Steps and SE NOT " +
        "re-derived; the margins quoted above are the pre-ADR-028 ones.",
    },
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
    /**
     * FOUR CHECK KINDS AND NOT JUST `rb_vision`, and this is the one mechanism list in the file
     * that deserves an argument rather than a line.
     *
     * The outcome measured is YARDS PER CARRY, which the engine produces in two stages: the
     * vision read that finds the hole (`rb_vision`, reading `vision` and `patience`) and the
     * contact contests that decide what happens after it (`break_tackle`, `tackle`, `yac_tackle`,
     * reading `elusiveness` and `power`). Naming only `rb_vision` would have reported the other
     * two attributes inert — which they are not; they are read by the second half of the same
     * measurement. Naming the contact checks is not widening to go green: a ladder that measures
     * yards per carry and excluded tackle-breaking from its mechanism would be describing a
     * different statistic from the one it computes.
     */
    mechanismCheckKinds: ["rb_vision", "break_tackle", "tackle", "yac_tackle"],
    attributesNotReadByMechanism: [],
    provisional: {
      invalidatedBy: "ADR-024/026/028",
      measuredLadder: [9.9228, 11.3406, 13.2879, 16.7055],
      note:
        "2026-07, re-measured read-only on the canonical seeds (digest fnv1a:3d483a27#80). The " +
        "record above reads 10.157 / 12.000 / 14.193 / 17.139 and the effect shrank 6.98 → 6.78. " +
        "The convexity finding STRENGTHENED rather than weakening — the 70→95 step now measures " +
        "3.418 against a recorded 2.666, which is 2.3× the 20→45 step where the record said " +
        "1.9×. It is a single draw and the recorded step SE is 0.330, so 2.3σ: suggestive, not " +
        "established, and it is what §5.3's correlation sweep on this family should be sized " +
        "for. Steps and SE NOT re-derived.",
    },
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
    /**
     * Every check kind on the path from a snap to a net yard conceded on a dropback: the two
     * coverage reps, the press rep at the line (§9's release), and the two ball-in-the-air
     * contests. `second_level_climb` is deliberately NOT here — it is a RUN-BLOCK check, and a
     * ladder whose measurement puts sacks in the denominator of a passing rate cannot claim it.
     */
    mechanismCheckKinds: [
      "man_coverage",
      "zone_coverage",
      "release_vs_press",
      "contested_catch",
      "passing_lane",
    ],
    /**
     * ⚠ A §5.3 KILL/MERGE CANDIDATE, ARRIVING AS A GATE FACT RATHER THAN AS A SWEEP RESULT.
     *
     * This ladder sets `playRecognition` on CB/FS/SS and NOTHING in the pass game reads it. The
     * only check that reads it at all is `second_level_climb` — the OL climbing to a second-level
     * defender, a run play — and it reaches a designed safety often enough to show up, which is
     * exactly why the naive "is it read anywhere" test would have called it live. It is live on
     * the RUN and dead in this scenario's mechanism.
     *
     * NOT dropped here, and the reason is the cost, stated so the deferral is auditable: this is
     * the most expensive ladder in the file at 1,200 games, dropping an attribute changes what it
     * measures, and re-recording it means re-mapping the curve and re-deriving the SE across
     * independent seed sets — §22a's full procedure at ~10,000 games. That is its own dispatch.
     */
    attributesNotReadByMechanism: ["playRecognition"],
    provisional: {
      invalidatedBy: "ADR-024/026/028",
      measuredLadder: [2.3228, 2.006, 1.6425],
      note:
        "2026-07, re-measured read-only on the canonical seeds (digest fnv1a:0c9d7f1f#400). THE " +
        "MOST STALE RECORD IN THE FILE. The record above reads 2.3975 / 2.1168 / 1.8398 with an " +
        "effect of 0.5576; it now measures an effect of 0.6803, up 22%, and the SECOND step moved " +
        "0.258 → 0.3635 while the first moved 0.371 → 0.3168 — the two steps have swapped which " +
        "is larger. The recorded claim that 'the 0/50/95 ladder puts both steps above a quarter " +
        "of a yard' still holds and is now the only part of the numbers a reader should trust. " +
        "Steps and SE NOT re-derived. Re-recording this one is a dispatch of its own; see " +
        "`attributesNotReadByMechanism` above, which should be settled in the same pass.",
    },
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
