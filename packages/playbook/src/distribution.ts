/**
 * DISTRIBUTIONS — how often each card is called, and where the numbers come from.
 *
 * ================== READ THIS BEFORE TRUSTING A WEIGHT ==================
 *
 * ADR-017: "**Realistic distributions, not merely valid cards.** A corpus of
 * technically-legal plays at unrealistic frequencies produces clean statistics
 * about football nobody plays, and nothing in the output would reveal it."
 *
 * So here is the honest provenance, stated plainly because a weight with no
 * provenance is a guess wearing a decimal point:
 *
 *  - **These are PRIORS, not fits.** They are the author's recollection of
 *    published league-wide aggregates for the 2022-2024 seasons (personnel-usage
 *    and coverage-rate charting of the kind PFF, Sports Info Solutions and NGS
 *    publish; pass-rate-by-down splits of the kind nflverse play-by-play yields
 *    directly). They are round numbers, and they are round because they are
 *    remembered rather than computed.
 *  - **Nothing here has been ingested.** No file in this package reads
 *    `data-cache/`, and it must not: playbook imports contracts and nothing else
 *    (ADR-017 §Decision 3).
 *  - **Calibration owns the real answer and should replace these.**
 *    `calibration.md` §3.1 fits a tendency model from real play-by-play; that model
 *    is the authority on frequency. `PlaybookDistribution` is deliberately a plain
 *    data structure so a fitted table can be substituted wholesale without touching
 *    a card. The right end state is that the frozen caller supplies the weights and
 *    these become the fallback for a franchise-mode coordinator with no data.
 *  - **Accuracy claim, stated as a range rather than a number:** the coarse splits
 *    (pass rate by down, 11-personnel share, nickel share, blitz rate) I would
 *    defend to within a few points. The per-CONCEPT weights are much weaker —
 *    nobody publishes "how often is Y-Cross called" — and those are ordering
 *    judgements: quick game more than shot plays, inside zone more than counter,
 *    with magnitudes chosen to make the resulting depth-of-target and run-scheme
 *    mixes land near their published aggregates. Treat concept weights as a shape,
 *    not a measurement, and see `test/distribution.test.ts` for the aggregate
 *    properties they were tuned to satisfy.
 * ========================================================================
 */
import type { Rng } from "@ff/contracts";

export type Down = 1 | 2 | 3 | 4;

/** Coarse field position, the granularity real tendency splits are published at. */
export type FieldRegion = "BACKED_UP" | "OWN" | "MIDFIELD" | "FRINGE" | "RED_ZONE" | "GOAL_LINE";

/** `ballOn` is yards from the offence's own goal line, matching the engine's convention. */
export function fieldRegion(ballOn: number): FieldRegion {
  if (ballOn <= 10) return "BACKED_UP";
  if (ballOn <= 40) return "OWN";
  if (ballOn <= 60) return "MIDFIELD";
  if (ballOn <= 79) return "FRINGE";
  if (ballOn <= 94) return "RED_ZONE";
  return "GOAL_LINE";
}

export interface PlaySituation {
  readonly down: Down;
  readonly distance: number;
  readonly ballOn: number;
  readonly twoMinute: boolean;
}

/**
 * A card's frequency and the situations it belongs in.
 *
 * `weight` is RELATIVE WITHIN ITS FAMILY (pass concepts against pass concepts, run
 * concepts against run concepts, defensive cards against defensive cards). It is
 * not a probability and it does not need to sum to anything — the run/pass split
 * itself is the caller's decision, not the card's, because it depends on score and
 * clock which a card cannot see.
 */
export interface SituationalUsage {
  readonly weight: number;
  /** Omitted means every down. */
  readonly downs?: readonly Down[];
  readonly minDistance?: number;
  readonly maxDistance?: number;
  /** Omitted means anywhere on the field. */
  readonly regions?: readonly FieldRegion[];
  /** The card is only sound with the clock running out. */
  readonly twoMinuteOnly?: true;
}

export function usageApplies(usage: SituationalUsage, situation: PlaySituation): boolean {
  if (usage.downs !== undefined && !usage.downs.includes(situation.down)) return false;
  if (usage.minDistance !== undefined && situation.distance < usage.minDistance) return false;
  if (usage.maxDistance !== undefined && situation.distance > usage.maxDistance) return false;
  if (usage.regions !== undefined && !usage.regions.includes(fieldRegion(situation.ballOn))) {
    return false;
  }
  if (usage.twoMinuteOnly === true && !situation.twoMinute) return false;
  return true;
}

/**
 * Weighted selection through the contracts PRNG. `Math.random` is banned repo-wide
 * and this is the only place in the package that consumes randomness at all.
 */
export function weightedPick<T>(
  rng: Rng,
  items: readonly T[],
  weightOf: (item: T) => number,
): T {
  if (items.length === 0) throw new Error("@ff/playbook: weightedPick on an empty set");
  let total = 0;
  for (const item of items) {
    const w = weightOf(item);
    if (w < 0) throw new Error("@ff/playbook: negative usage weight");
    total += w;
  }
  if (total <= 0) throw new Error("@ff/playbook: every candidate has zero weight");
  let roll = rng.next() * total;
  for (const item of items) {
    roll -= weightOf(item);
    if (roll < 0) return item;
  }
  // Floating-point tail; the last positively-weighted item is the correct answer.
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item !== undefined && weightOf(item) > 0) return item;
  }
  /* istanbul ignore next — unreachable given total > 0. */
  throw new Error("@ff/playbook: weightedPick fell through");
}

// --- published league priors, as data --------------------------------------

/**
 * Offensive personnel usage, league-wide, all situations. Sums to 1.
 *
 * Source class: personnel charting for 2022-2024. 11 personnel has sat around 59-62%
 * for several seasons, 12 around 19-21%, and everything else is a long tail.
 */
export const PERSONNEL_USAGE: Readonly<Record<string, number>> = {
  "11": 0.6,
  "12": 0.2,
  "21": 0.07,
  "13": 0.03,
  "10": 0.04,
  "22": 0.025,
  "20": 0.02,
  "00": 0.015,
};

/**
 * Defensive personnel usage. Nickel is the modern base defence; true base 4-3/3-4
 * personnel is now the exception, and dime rises steeply with distance.
 */
export const DEFENSE_PERSONNEL_USAGE: Readonly<Record<string, number>> = {
  NICKEL: 0.6,
  BASE: 0.22,
  DIME: 0.15,
  GOAL_LINE: 0.03,
};

/**
 * Coverage shell rates. Cover 3 remains the single most-played shell; single-high
 * man (Cover 1) is the most-played man coverage; Cover 0 is rare and situational.
 * `FIRE_ZONE` is listed as its own family because charting services report
 * three-deep/three-under pressure separately from spot-drop Cover 3.
 *
 * These are the aggregate the defensive card weights are shaped to reproduce, and
 * `test/distribution.test.ts` asserts they do — which is the only honest way to
 * claim a per-card weight means anything.
 *
 * NOTE THE ORTHOGONALITY, because getting it wrong is an easy way to build a corpus
 * that reproduces one distribution by breaking another: **the shell and the rusher
 * count are independent axes.** A five-man pressure can be played from Cover 1,
 * Cover 3 or Cover 0. A corpus whose only pressure cards were "blitz shells" would
 * hit `BLITZ_RATE_PRIOR` only by inflating Cover 0 to four times its real rate.
 */
export const COVERAGE_SHELL_USAGE: Readonly<Record<string, number>> = {
  COVER_3: 0.29,
  COVER_1: 0.2,
  QUARTERS: 0.16,
  COVER_2: 0.11,
  COVER_6: 0.08,
  COVER_2_MAN: 0.05,
  FIRE_ZONE: 0.07,
  COVER_0: 0.03,
  PREVENT: 0.01,
};

/**
 * Pass rate by down and distance bucket. The single most-cited tendency split and
 * the easiest to get from play-by-play, which is why it is the one stated with the
 * most confidence. Used by nothing in this package — the run/pass decision belongs
 * to the caller — but recorded here so the caller has a documented starting point
 * instead of inventing one.
 */
export const PASS_RATE_PRIOR: readonly {
  readonly down: Down;
  readonly minDistance: number;
  readonly maxDistance: number;
  readonly passRate: number;
}[] = [
  { down: 1, minDistance: 1, maxDistance: 3, passRate: 0.42 },
  { down: 1, minDistance: 4, maxDistance: 99, passRate: 0.53 },
  { down: 2, minDistance: 1, maxDistance: 3, passRate: 0.44 },
  { down: 2, minDistance: 4, maxDistance: 7, passRate: 0.6 },
  { down: 2, minDistance: 8, maxDistance: 99, passRate: 0.72 },
  { down: 3, minDistance: 1, maxDistance: 2, passRate: 0.51 },
  { down: 3, minDistance: 3, maxDistance: 6, passRate: 0.85 },
  { down: 3, minDistance: 7, maxDistance: 99, passRate: 0.93 },
  { down: 4, minDistance: 1, maxDistance: 2, passRate: 0.44 },
  { down: 4, minDistance: 3, maxDistance: 99, passRate: 0.92 },
];

export function passRatePrior(situation: PlaySituation): number {
  for (const row of PASS_RATE_PRIOR) {
    if (
      row.down === situation.down &&
      situation.distance >= row.minDistance &&
      situation.distance <= row.maxDistance
    ) {
      return row.passRate;
    }
  }
  return 0.57;
}

/**
 * Run-scheme split. Zone concepts (inside/outside/split zone) outnumber gap
 * concepts (power, counter, trap, pin-and-pull) roughly 55/45 league-wide, with
 * inside zone the single most-called run in football.
 */
export const RUN_SCHEME_USAGE: Readonly<Record<"ZONE" | "GAP", number>> = {
  ZONE: 0.56,
  GAP: 0.44,
};

/** Share of dropbacks with five or more rushers. 6+ is roughly a third of that. */
export const BLITZ_RATE_PRIOR = 0.26;

/**
 * =================== THE FOUR PRESSURE AXES, AND WHICH ARE WORTH ANYTHING ==========
 *
 * ADR-022 gave the corpus three things it could not say and one it could only imply, so
 * pressure is now FOUR marginals rather than one: how often five come, how well it is
 * hidden, how often four exchange, and how often the offence has an answer. §8b's
 * orthogonality rule is the whole reason they are listed separately — **a corpus that
 * hit `BLITZ_RATE_PRIOR` by making every blitz a zero blitz would pass the marginal
 * check while describing football nobody plays.**
 *
 * Read the provenance banner at the top of this file first, then this, because these
 * four are NOT of equal quality and pretending otherwise is the failure mode:
 *
 *  - **Blitz rate.** Unchanged, and the best of the four. Five-plus rushers on ~25% of
 *    dropbacks is a number charting services publish and agree on to within a few points.
 *  - **Stunt rate.** Defensible as a range. Line games on roughly a quarter to a third of
 *    pass rushes is a published figure, though the definition of "stunt" varies enough
 *    between charters that the spread between sources is wider than for blitz rate.
 *  - **Disguise mix.** Half-defensible and only where it is anchored. The ZONE_BLITZ and
 *    ZERO shares are not independent guesses — they fall out of `COVERAGE_SHELL_USAGE`'s
 *    already-stated FIRE_ZONE and COVER_0 rates divided by the blitz rate, so they are
 *    exactly as good as those are. The STANDARD/DELAYED split is a judgement with no
 *    source behind it at all.
 *  - **Hot-route availability.** SHAPE ONLY, and it is the weakest number in this file.
 *    Nobody publishes how often a concept carries a sight adjustment, and the honest
 *    answer for the real NFL is probably "nearly always" — every dropback has a hot rule
 *    written somewhere. What the corpus states is narrower and is the only thing it can
 *    be responsible for: how often the answer is NOT already the first read, which is the
 *    only case where stating it changes anything (`C_HOT_IS_A_NO_OP`). Do not read a
 *    league rate off it.
 *
 * **AND NONE OF THESE IS A SACK RATE.** Availability sets a ceiling; §5.3's recognition
 * roll decides how much of it is realised, and the engine measured that gap directly —
 * a blitz the quarterback missed sacks him on 13.99% of dropbacks and one he answered on
 * 4.29%. A corpus that stated a hot on every concept would not remove pressure from the
 * game; it would move the whole question onto a die the engine rolls.
 */

/** Share of pass rushes with a line game. Published range is roughly 0.25-0.32. */
export const STUNT_RATE_PRIOR = 0.28;

/**
 * Complexity mix WITHIN the stunting share. T-E is the game everyone runs; the other
 * three are progressively rarer calls.
 *
 * **This is the least-sourced table in the file and it is here so that it is legible
 * rather than smeared across six cards.** Nothing publishes a T-E/T-T split. The
 * ordering is confident, the magnitudes are not, and the corpus's granularity is coarser
 * than the table anyway: twenty-two defensive cards on a weight vector fixed by
 * `COVERAGE_SHELL_USAGE` means the smallest expressible share of the stunting pool is
 * about one part in fourteen. `test/pressure.test.ts` asserts the ORDER and a loose band,
 * not these numbers.
 */
export const STUNT_COMPLEXITY_MIX: Readonly<Record<string, number>> = {
  T_E: 0.68,
  T_T: 0.2,
  DELAYED: 0.07,
  TRIPLE: 0.05,
};

/**
 * Disguise mix WITHIN the blitzing share, i.e. among cards that rush five or more.
 *
 * ZONE_BLITZ ≈ FIRE_ZONE's shell share ÷ the blitz rate, and ZERO ≈ COVER_0's the same
 * way, so two of the four rows are arithmetic on numbers this file already committed to
 * rather than fresh guesses. The other two are a judgement: most pressure is shown,
 * because most pressure is a linebacker walked up and everyone can see him.
 */
export const BLITZ_DISGUISE_MIX: Readonly<Record<string, number>> = {
  STANDARD: 0.5,
  ZONE_BLITZ: 0.27,
  DELAYED: 0.12,
  ZERO: 0.11,
};

/**
 * Share of dropback weight whose answer to pressure is not already the first read.
 *
 * Deliberately not called a league rate. See the banner above: this is a property of how
 * the corpus is BUILT — quick-game concepts state nothing because their first read is the
 * answer, max protect states nothing because it paid in bodies, the screen states nothing
 * because a blitz is what it wants — and the number that falls out is a fact about that
 * construction and not about football. It is recorded so a future edit that quietly puts
 * a hot on everything shows up as a moved number rather than as nothing.
 */
export const HOT_ROUTE_SHARE_SHAPE = 0.48;

/**
 * Slide-side split among the corpus's slide protections.
 *
 * **THIS IS AN ARTEFACT AND IT IS RECORDED AS ONE.** Every formation in `formations.ts`
 * is right-strength — mirrors are produced on demand and never stored — so most
 * check-release backs release right, so most lines slide left. The 70/30 skew is a
 * property of a right-handed formation set, not of football, and it will move the day
 * the corpus stores a left-strength look or the caller starts drawing mirrored ones. A
 * consumer measuring anything against slide direction should mirror first.
 */
export const SLIDE_SIDE_SKEW_IS_A_FORMATION_ARTEFACT = true;

/**
 * Depth-of-target distribution, as shares of attempts. The property the pass-concept
 * weights are shaped to reproduce; asserted in `test/distribution.test.ts`.
 * Behind the line ~13%, 0-9 ~50%, 10-19 ~25%, 20+ ~12%, mean air yards ~7.8.
 */
export const AIR_YARDS_SHARE_PRIOR: readonly {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly share: number;
}[] = [
  { label: "behind", min: -99, max: -1, share: 0.13 },
  { label: "short", min: 0, max: 9, share: 0.5 },
  { label: "intermediate", min: 10, max: 19, share: 0.25 },
  { label: "deep", min: 20, max: 99, share: 0.12 },
];
