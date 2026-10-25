/**
 * ADR-089 STEP 0: THE POCKET FIX'S REGISTRY ROWS (plan §5; ADR-089 §6.0).
 *
 * One `registerMetric` per `registry` construct of `pocket/constructs.ts`, under exactly that id.
 * Every sim side is a pure fold of the events (`PlayFold.pocket`, `collect.ts`); every real side is
 * in `pocketReal.ts`. Step 0 changes no play, so these rows only measure.
 *
 * ================== EVERY ROW IS AN OBSERVATION ==================
 *
 * Each row carries an infinite band, so the report prints it with verdict OBSERVATION and never
 * grades it (entry 93; K5). The bands that grade them are filed in the step-0 filing
 * (`reports/adr-089-step0.filed.json`, plan §7.2) and read by the steps that follow; a registry
 * band would grade them a second time, under a rule nobody filed.
 *
 * ================== ONE NUMBER PER ROW, THE TABLES BESIDE IT ==================
 *
 * A registry row prints one sample. Where the design's row is a table (a curve by release bin, a
 * row per down, a window per situation, a split by origin) the registered sample is the cell the
 * design grades or predicts on, named in the definition, and the whole table is exported here
 * (`pocketTables`) and in `pocketReal.ts` for the pocket report (S3) and the filing (S4).
 *
 * ================== THE WORD GUARD ==================
 *
 * No id or definition here may name the forbidden substitutes of `absence.ts`, and no file in
 * `src/metrics` reads the route's own index (`test/absence.test.ts`). The rows that need the
 * quarterback's decision bar live in `src/pocket` (S3, deviation O18).
 */
import type { Eligibility } from "../ingest/seasons.js";
import {
  CAUSE_SPLIT_UNITS,
  RELEASE_BINS,
  TWO_SECOND_BIN,
  type PocketFold,
  type SituationWindow,
  type UnitFold,
} from "./collect.js";
import {
  realByDown,
  realCleanDrillShare,
  realCleanOuts,
  realCompletionByPressure,
  realHitOnScramble,
  realHitOrSack,
  realHitRateInBin,
  realHitsOnAimedPerDropback,
  realOutOfPocketThrows,
  realPerAimedThrow,
  realPressuredShareInBin,
  realPressuredThrowawaysIn,
  realReleaseDistribution,
  realSackShareOfContacts,
  realScrambleRate,
  realScrambleYards,
  realSeasonSpread,
  realSackShareOfHitOrSack,
  realThrowawayRate,
  RELEASE_GRID_RULE,
  SEASON_SPREAD_MIN_DROPBACKS,
  spreadSample,
  type BinomialUnit,
} from "./pocketReal.js";
import type { RealInput } from "./realInput.js";
import { registerMetric } from "./registry.js";
import {
  absoluteBand,
  categorical,
  rate,
  ratioMean,
  samples,
  type Metric,
  type MetricOutcome,
  type SimContext,
} from "./types.js";

const OBSERVATION = (): ReturnType<typeof absoluteBand> => absoluteBand(Number.POSITIVE_INFINITY);

function noObservations(detail: string): MetricOutcome {
  return { reason: "NO_OBSERVATIONS", detail };
}

const pocketOf = ({ accumulator }: SimContext): PocketFold => accumulator.play.pocket;

function rateOrNone(successes: number, trials: number, empty: string): MetricOutcome {
  return trials === 0 ? noObservations(empty) : rate(successes, trials);
}

function samplesOrNone(values: readonly number[], empty: string): MetricOutcome {
  return values.length === 0 ? noObservations(empty) : samples(values);
}

const HALF_END: readonly SituationWindow[] = ["HALF_END_TRAILING", "HALF_END_LEVEL_OR_LEADING"];
const Q1Q3_END: readonly SituationWindow[] = ["Q1Q3_END"];

function pressuredThrowawaysIn(pf: PocketFold, windows: readonly SituationWindow[]): MetricOutcome {
  let k = 0;
  let n = 0;
  for (const w of windows) {
    k += pf.situation[w]?.pressuredThrowaways ?? 0;
    n += pf.situation[w]?.pressured ?? 0;
  }
  return rateOrNone(k, n, "no pressured dropback in the window");
}

/** P2S units of the sim's quarterbacks or defences with 300+ dropbacks, sorted by key. */
export function simSpreadUnits(units: Readonly<Record<string, UnitFold>>): readonly BinomialUnit[] {
  return Object.entries(units)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .filter(([, u]) => u.dropbacks >= SEASON_SPREAD_MIN_DROPBACKS)
    .map(([, u]) => ({ k: u.pressuredSacks, n: u.pressured }));
}

/** The first-pressure split, in ticks (the fold keeps integer units of 1/`CAUSE_SPLIT_UNITS`). */
export function inTicks(units: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(units)) out[k] = v / CAUSE_SPLIT_UNITS;
  return out;
}

/** The sim side's tables, for the pocket report and the filing. */
export function pocketTables(pf: PocketFold): {
  readonly releaseBins: Record<string, { attempts: number; pressuredShare: number | null; aimed: number; hitRate: number | null; pressuredShareNoFreeRunner: number | null }>;
  readonly firstPressureOrigin: Record<string, number>;
  readonly firstPressureCause: Record<string, number>;
  readonly quickShareByOrigin: Record<string, number | null>;
} {
  const ratio = (k: number, n: number): number | null => (n === 0 ? null : k / n);
  const releaseBins: Record<string, { attempts: number; pressuredShare: number | null; aimed: number; hitRate: number | null; pressuredShareNoFreeRunner: number | null }> = {};
  for (const bin of RELEASE_BINS) {
    const b = pf.releaseBins[bin.label];
    releaseBins[bin.label] = {
      attempts: b?.attempts ?? 0,
      pressuredShare: ratio(b?.pressuredAttempts ?? 0, b?.attempts ?? 0),
      aimed: b?.aimed ?? 0,
      hitRate: ratio(b?.aimedHits ?? 0, b?.aimed ?? 0),
      pressuredShareNoFreeRunner: ratio(b?.pressuredNoFreeRunner ?? 0, b?.attemptsNoFreeRunner ?? 0),
    };
  }
  const quickShareByOrigin: Record<string, number | null> = {};
  for (const [origin, units] of Object.entries(pf.firstPressureOrigin)) {
    quickShareByOrigin[origin] = ratio(pf.quickFirstPressureByOrigin[origin] ?? 0, units);
  }
  return {
    releaseBins,
    firstPressureOrigin: inTicks(pf.firstPressureOrigin),
    firstPressureCause: inTicks(pf.firstPressureCause),
    quickShareByOrigin,
  };
}

const STAND_IN =
  "Under legacy the stream has no QB_HIT event: a threat published ARRIVED with the ball still in his hand stands in for it (plan §5; measured equal to the strict reading, plan §0).";

// --- hit-or-sack ----------------------------------------------------------------

export const hitOrSackRate: Metric = registerMetric({
  id: "hit_or_sack_rate",
  tier: 1,
  definition:
    "Per dropback: a sack, or a hit on a play that ends in a pass attempt, throwaways included " +
    "(ADR-089 §4.5). A hit on a play that ends in a scramble is not counted (`qb_hit_on_scramble`). " +
    STAND_IN + " Real side: pbp `sack`, or `qb_hit` on a dropback that is not a scramble, per dropback, every season the input carries.",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.hitOrSackDropbacks, context.accumulator.play.dropbacks, "no dropbacks");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realHitOrSack(input),
});

export const sackShareOfHitOrSack: Metric = registerMetric({
  id: "sack_share_of_hit_or_sack",
  tier: 1,
  definition:
    "Sacks as a share of hit-or-sack dropbacks (the row above). Real side: pbp sacks among the real " +
    "hit-or-sack dropbacks of the row above. The target of a fitted dial at step 10, so never an independent grade.",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return rateOrNone(context.accumulator.play.sacks, pocketOf(context).hitOrSackDropbacks, "no hit-or-sack dropbacks");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realSackShareOfHitOrSack(input),
});

export const qbHitOnScramble: Metric = registerMetric({
  id: "qb_hit_on_scramble",
  tier: 1,
  definition:
    "Hits on plays that end in a scramble, per scramble: reported, never counted in hit-or-sack, " +
    "because the scorer's flag is never set on a scramble (0 of 3,002, ADR-089 §2.1). " + STAND_IN,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return rateOrNone(pocketOf(context).hitOnScrambleDropbacks, context.accumulator.play.scrambles, "no scrambles");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realHitOnScramble(input),
});

// --- release ----------------------------------------------------------------------

export const releaseDistribution: Metric = registerMetric({
  id: "release_distribution",
  tier: 2,
  definition:
    "Release time of every pass attempt (throwaways included) on the named clock: " +
    "`THROW.releaseSeconds` when the stream carries it (P8, step 4), else the release tick, which " +
    "under legacy is the decision tick on the 0.5 s grid. Real side: participation " +
    "`time_to_throw` on FTN-season (2023-24) attempts, " + RELEASE_GRID_RULE + ".",
  unit: "seconds",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return samplesOrNone(pocketOf(context).releaseSeconds, "no releases");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realReleaseDistribution(input, "TICK"),
});

export const pressuredShareByReleaseBin: Metric = registerMetric({
  id: "pressured_share_by_release_bin",
  tier: 2,
  definition:
    "Pressured share of pass attempts (throwaways counted as throws on both sides) by release bin " +
    "(<2.0, 2.0-2.5, ... , >=5). The registered cell is the 2.0-2.5 s bin, the miss rule's bin " +
    "(ADR-089 §6.10); the whole curve is in `pocketTables`. Sim side: the dropback's worst " +
    "POCKET_STATUS not CLEAN. Real side: participation `was_pressure` on FTN-season attempts, with " +
    "two comparators, tick-aligned and raw seconds; the rule filed with them: " + RELEASE_GRID_RULE + ".",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const bin = pocketOf(context).releaseBins[TWO_SECOND_BIN];
    return rateOrNone(bin?.pressuredAttempts ?? 0, bin?.attempts ?? 0, `no attempt released in ${TWO_SECOND_BIN}`);
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realPressuredShareInBin(input, TWO_SECOND_BIN, "TICK"),
});

export const hitRateByReleaseBin: Metric = registerMetric({
  id: "hit_rate_by_release_bin",
  tier: 2,
  definition:
    "Hit rate on aimed throws (throwaways excluded) by release bin; the registered cell is the " +
    "2.0-2.5 s bin, the whole curve is in `pocketTables`. " + STAND_IN + " Real side: pbp `qb_hit` " +
    "on FTN-season attempts FTN did not chart as throwaways, with both comparators (" + RELEASE_GRID_RULE + ").",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const bin = pocketOf(context).releaseBins[TWO_SECOND_BIN];
    return rateOrNone(bin?.aimedHits ?? 0, bin?.aimed ?? 0, `no aimed throw released in ${TWO_SECOND_BIN}`);
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realHitRateInBin(input, TWO_SECOND_BIN, "TICK"),
});

export const hitsOnAimedThrowsPerDropback: Metric = registerMetric({
  id: "hits_on_aimed_throws_per_dropback",
  tier: 2,
  definition:
    "Per dropback: a hit on an aimed throw (throwaways excluded), every release bin together: the " +
    "level the motion clause and the acceptance row grade (ADR-089:1036, :1140; today 3.62 flat and " +
    "7.31 gen, ADR-089:88), where `hit_rate_by_release_bin` is the per-throw curve. " + STAND_IN +
    " Real side: pbp `qb_hit` on FTN-season attempts FTN did not chart as throwaways, per FTN-season " +
    "dropback (real 7.1, 8.1 counting throwaways, ADR-089:206).",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const hits = Object.values(pocketOf(context).releaseBins).reduce((a, bin) => a + bin.aimedHits, 0);
    return rateOrNone(hits, context.accumulator.play.dropbacks, "no dropbacks");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realHitsOnAimedPerDropback(input, "AIMED"),
});

// --- the first-pressure clocks ------------------------------------------------------

const NAMED_CLOCK =
  "NGS's 'average pressure occurs in 2.9 seconds' is REPORTED (not in the cache) and is compared with this clock only, never graded here (ADR-089 §2.3)";

export const firstPressureSeconds: Metric = registerMetric({
  id: "first_pressure_seconds",
  tier: 2,
  definition:
    "The tick of each dropback's first POCKET_STATUS at PRESSURE or worse (on the CLEAN < PRESSURE " +
    "< COLLAPSING < IMMEDIATE ladder, its first non-CLEAN tick): the clock named against NGS's 2.9 s. " +
    "Every report restates the construct difference: NGS's is a model, FTN's is hand charting, ours is a status rung.",
  unit: "seconds",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return samplesOrNone(pocketOf(context).firstPressureSeconds, "no pressured dropbacks");
  },
  computeFromReal: () => noObservations(NAMED_CLOCK),
});

export const firstForcingSeconds: Metric = registerMetric({
  id: "first_forcing_seconds",
  tier: 2,
  definition:
    "The tick of each dropback's first COLLAPSING or IMMEDIATE status, the statuses that force his " +
    "decision (`DEFAULT_TUNABLES.pocket.forcesDecision`; deviation O13). Reported, never compared with 2.9 s.",
  unit: "seconds",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return samplesOrNone(pocketOf(context).firstForcingSeconds, "no forced dropbacks");
  },
  computeFromReal: () => noObservations("no real counterpart: a status rung of the sim's own ladder"),
});

export const firstArrivalSeconds: Metric = registerMetric({
  id: "first_arrival_seconds",
  tier: 2,
  definition:
    "The tick of each dropback's first threat published ARRIVED. Reported, never compared with 2.9 s.",
  unit: "seconds",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return samplesOrNone(pocketOf(context).firstArrivalSeconds, "no arrivals");
  },
  computeFromReal: () => noObservations("no real counterpart in the cache"),
});

export const firstPressureOrigin: Metric = registerMetric({
  id: "first_pressure_origin",
  tier: 2,
  definition:
    "What starts each first non-CLEAN tick, by TM's cause rule: every rusher whose own channel reaches " +
    "the published status is a cause, the tick split evenly among them. An arrival names its threat's " +
    "origin (WON_REP, or FREE_RUNNER for UNBLOCKED, PICKUP_LOST and STUNT_LOOPER); otherwise the band " +
    "floor or the counter (COUNTER, TM's 'no real state'; a status no arrival or band reaches is the " +
    "counter's whole). Counts are in ticks; the split by each threat origin and the band is in `pocketTables`.",
  unit: "ticks",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const counts = inTicks(pocketOf(context).firstPressureOrigin);
    return Object.keys(counts).length === 0 ? noObservations("no pressured dropbacks") : categorical(counts);
  },
  computeFromReal: () => noObservations("no real counterpart: FTN charts that a pressure happened, not what started it"),
});

export const quickPressureShareByOrigin: Metric = registerMetric({
  id: "quick_pressure_share_by_origin",
  tier: 1,
  definition:
    "The share of pressured dropbacks whose first PRESSURE-or-worse came before 2.5 s (NGS's 'quick'); " +
    "the split by origin is in `pocketTables`. The real 41-45% is INFERRED from two REPORTED team figures " +
    "and no league figure is published; ADR-089 §2.4's floor under it (19.6% raw, 13.6% on the tick " +
    "grid) is `realQuickShareFloor`, a bound and never a comparator.",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.quickFirstPressures, pf.firstPressureSeconds.length, "no pressured dropbacks");
  },
  computeFromReal: () => noObservations("INFERRED only (41-45% from KC and SF figures); no league figure in the cache"),
});

// --- a live won rep in a clean pocket -----------------------------------------------------

const LIVE_WON_REP =
  "a POCKET_STATUS CLEAN at which some WON_REP threat's latest state is TRAVELLING or DELAYED";

export const cleanWithLiveWonRepTicks: Metric = registerMetric({
  id: "clean_with_live_won_rep_ticks",
  tier: 1,
  definition: `Ticks with ${LIVE_WON_REP}, as a share of CLEAN statuses (the count is the numerator; ADR-089:962, R1-02).`,
  unit: "% of CLEAN statuses",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return rateOrNone(pocketOf(context).cleanLiveWonRepTicks, context.accumulator.play.pocketStatusTicks["CLEAN"] ?? 0, "no CLEAN statuses");
  },
  computeFromReal: () => noObservations("no real counterpart: a count of the sim's own mechanism"),
});

export const cleanWithLiveWonRepDropbacks: Metric = registerMetric({
  id: "clean_with_live_won_rep_dropbacks",
  tier: 1,
  definition: `Dropbacks with at least one tick with ${LIVE_WON_REP}, per dropback.`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return rateOrNone(pocketOf(context).cleanLiveWonRepDropbacks, context.accumulator.play.dropbacks, "no dropbacks");
  },
  computeFromReal: () => noObservations("no real counterpart: a count of the sim's own mechanism"),
});

export const cleanWithLiveWonRepPushTicks: Metric = registerMetric({
  id: "clean_with_live_won_rep_push_ticks",
  tier: 1,
  definition:
    `Of the ticks with ${LIVE_WON_REP}, those where such a threat is a PUSH rep by \`pocket/approach.ts\` ` +
    "(a POWER rep won from a latent margin of 1 to 14), counted apart because shape S's window fills that tick for them (ADR-089:1160).",
  unit: "% of those ticks",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.cleanLiveWonRepPushTicks, pf.cleanLiveWonRepTicks, "no tick with a live won rep in a CLEAN pocket");
  },
  computeFromReal: () => noObservations("no real counterpart: a count of the sim's own mechanism"),
});

// --- throwaways and scrambles --------------------------------------------------------------

export const throwawayRatePressured: Metric = registerMetric({
  id: "throwaway_rate_pressured",
  tier: 1,
  definition:
    "Throwaways per pressured dropback (worst POCKET_STATUS not CLEAN), beside the existing " +
    "`throwaway_rate`. Real side: FTN `is_throw_away` per FTN-season dropback with participation's `was_pressure` true.",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return rateOrNone(pocketOf(context).pressuredThrowaways, context.accumulator.play.pressuredDropbacks, "no pressured dropbacks");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realThrowawayRate(input, "PRESSURED"),
});

export const throwawayRateClean: Metric = registerMetric({
  id: "throwaway_rate_clean",
  tier: 1,
  definition:
    "Throwaways per clean dropback (every POCKET_STATUS CLEAN). Real side: FTN `is_throw_away` per " +
    "FTN-season dropback with `was_pressure` false (the overall 3.54% is `realThrowawayRate(input, \"ALL\")`).",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const play = context.accumulator.play;
    return rateOrNone(pocketOf(context).cleanThrowaways, play.dropbacks - play.pressuredDropbacks, "no clean dropbacks");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realThrowawayRate(input, "CLEAN"),
});

export const scrambleRate: Metric = registerMetric({
  id: "scramble_rate",
  tier: 1,
  definition:
    "Scrambles (RUN_RESOLUTION carryType SCRAMBLE) per dropback. Real side: pbp `qb_scramble` per " +
    "FTN-season dropback carrying the pressure flag (ADR-089 §2.3: 2,097 of 40,982).",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const play = context.accumulator.play;
    return rateOrNone(play.scrambles, play.dropbacks, "no dropbacks");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realScrambleRate(input),
});

export const scrambleYards: Metric = registerMetric({
  id: "scramble_yards",
  tier: 2,
  definition: "Yards per scramble (RUN_RESOLUTION.yards). Real side: pbp `yards_gained` on the scrambles of the row above.",
  unit: "yards",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return samplesOrNone(pocketOf(context).scrambleYards, "no scrambles");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realScrambleYards(input),
});

export const byDownFixedCalls: Metric = registerMetric({
  id: "by_down_fixed_calls",
  tier: 1,
  definition:
    "Dropbacks at 7-10 to go, goal-to-go excluded, by down (early, third, fourth), on the corpus's " +
    "frozen caller (deviation O12): pressure, P2S and pressured throwaways. The registered cell is " +
    "third-down P2S, the cell step 8b predicts on (at least 3 points above early downs; real 26.5 " +
    "against 19.6); every cell is in `PocketFold.byDown` and `realByDown`. Real side: FTN-season " +
    "dropbacks carrying the pressure flag.",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const third = pocketOf(context).byDown["THIRD"];
    return rateOrNone(third?.pressuredSacks ?? 0, third?.pressured ?? 0, "no pressured third down at 7-10 to go");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => {
    if (input.participation === undefined) return noObservations("participation not loaded (open the real input with withParticipation)");
    const third = realByDown(input)["THIRD"];
    return rateOrNone(third?.pressuredSacks ?? 0, third?.pressured ?? 0, "no pressured third down at 7-10 to go");
  },
});

// --- the guards ------------------------------------------------------------------------------

const AIMED = "Aimed throws are THROW events (throwaways excluded); the real side is FTN-season pass attempts FTN did not chart as throwaways";

export const intPerAimedThrow: Metric = registerMetric({
  id: "int_per_aimed_throw",
  tier: 1,
  definition: `Interceptions per aimed throw, a guard printed beside \`int_rate\`, \`int_source_mix\` and \`completion_pct\` (ADR-089:1289). ${AIMED}.`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.aimedInterceptions, pf.aimedThrows, "no aimed throws");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realPerAimedThrow(input, "INTERCEPTION"),
});

export const completionPerAimedThrow: Metric = registerMetric({
  id: "completion_per_aimed_throw",
  tier: 1,
  definition: `Completions per aimed throw, a guard (a fall of more than 2 points fails at acceptance). ${AIMED}.`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.aimedCompletions, pf.aimedThrows, "no aimed throws");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realPerAimedThrow(input, "COMPLETION"),
});

export const forcedThrowShare: Metric = registerMetric({
  id: "forced_throw_share",
  tier: 1,
  definition:
    "The share of aimed throws the pocket forced: released on a tick whose own POCKET_STATUS is in " +
    "`DEFAULT_TUNABLES.pocket.forcesDecision` (COLLAPSING or IMMEDIATE). A throw forced only by his " +
    "count or his spent reads needs the decision bar and is S3's (`pocket/throwClass.ts`).",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.forcedAimedThrows, pf.aimedThrows, "no aimed throws");
  },
  computeFromReal: () => noObservations("no real counterpart: the forcing statuses are the sim's own ladder"),
});

export const completionByPocketStatus: Metric = registerMetric({
  id: "completion_by_pocket_status",
  tier: 1,
  definition:
    "Completion per pass attempt joined to each dropback's worst POCKET_STATUS. The registered cell " +
    "is every pressured status together (worst not CLEAN); each status's cell is in " +
    "`PocketFold.attemptsByWorstStatus`. Real side: completion per FTN-season attempt with `was_pressure` true.",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    let attempts = 0;
    let completions = 0;
    for (const [status, row] of Object.entries(pocketOf(context).attemptsByWorstStatus)) {
      if (status === "CLEAN" || status === "NONE") continue;
      attempts += row.attempts;
      completions += row.completions;
    }
    return rateOrNone(completions, attempts, "no pressured attempts");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realCompletionByPressure(input, true),
});

// --- season spreads --------------------------------------------------------------------------

const SPREAD =
  "The spread of P2S across units with 300+ dropbacks after sampling noise, in points: the method of " +
  "moments of `realdata/spread.py` (observed variance of the unit rates less the mean binomial noise " +
  "at the pooled rate). The sim's unit spans the folded corpus (one season of games)";

export const qbSeasonSpread: Metric = registerMetric({
  id: "qb_season_spread",
  tier: 3,
  definition: `${SPREAD}, keyed by PLAY_START's quarterback. Real side: FTN-season quarterback-seasons (passer; rusher on a scramble): 3.56 pp over 61.`,
  unit: "pp",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return spreadSample(simSpreadUnits(pocketOf(context).qbUnits), "quarterbacks");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realSeasonSpread(input, "QB"),
});

export const defenceSeasonSpread: Metric = registerMetric({
  id: "defence_season_spread",
  tier: 3,
  definition: `${SPREAD}, keyed by PLAY_START's defence. Real side: FTN-season defence team-seasons.`,
  unit: "pp",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return spreadSample(simSpreadUnits(pocketOf(context).defenceUnits), "defences");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realSeasonSpread(input, "DEFENCE"),
});

// --- completely unblocked men (D19) -------------------------------------------------------------

const FREE_RUN =
  "A man on the free-run clock is one of D19's three origins: UNBLOCKED, PICKUP_LOST whose blitz_pickup " +
  "band is BLOWN_UP, or STUNT_LOOPER whose stunt_communication band is LOOPER_FREE";
const PFF = "PFF's and SIS's figures are INFERRED and not in the cache (ADR-089 §2.4)";

export const unblockedPressuresPer100: Metric = registerMetric({
  id: "unblocked_pressures_per_100",
  tier: 1,
  definition:
    `${FREE_RUN}. Counted once per play when his own arrival floor (\`DEFAULT_TUNABLES.arrival\`'s ` +
    "horizons on his tenth-rounded time to arrival) reached PRESSURE or worse at a POCKET_STATUS with the ball in his hand, per 100 dropbacks.",
  unit: "per 100 dropbacks",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const dropbacks = context.accumulator.play.dropbacks;
    return dropbacks === 0 ? noObservations("no dropbacks") : ratioMean(100 * pocketOf(context).freeRunPressures, dropbacks);
  },
  computeFromReal: () => noObservations(PFF),
});

export const unblockedShareOfHitOrSack: Metric = registerMetric({
  id: "unblocked_share_of_hit_or_sack",
  tier: 1,
  definition:
    `Hit-or-sack dropbacks whose contact man, the last threat published ARRIVED with the ball in his hand, was on the free-run clock, as a share of hit-or-sack. ${FREE_RUN}.`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.unblockedHitOrSack, pf.hitOrSackDropbacks, "no hit-or-sack dropbacks");
  },
  computeFromReal: () => noObservations(PFF),
});

export const unblockedMenPer100: Metric = registerMetric({
  id: "unblocked_men_per_100",
  tier: 1,
  definition: `Men on the free-run clock per 100 dropbacks, each counted once a play (reported). ${FREE_RUN}.`,
  unit: "per 100 dropbacks",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const dropbacks = context.accumulator.play.dropbacks;
    return dropbacks === 0 ? noObservations("no dropbacks") : ratioMean(100 * pocketOf(context).freeRunMen, dropbacks);
  },
  computeFromReal: () => noObservations(PFF),
});

const NO_FREE_RUNNER =
  "A dropback with no free runner has no threat of an origin other than WON_REP (ADR-089 §1.1's free runner: unblocked, a lost pickup or a looper)";

export const pressuredShare2sNoFreeRunner: Metric = registerMetric({
  id: "pressured_share_2s_no_free_runner",
  tier: 1,
  definition: `The pressured share of pass attempts released at 2.0-2.5 s on dropbacks with no free runner: the miss rule's n (ADR-089:1175). ${NO_FREE_RUNNER}.`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const bin = pocketOf(context).releaseBins[TWO_SECOND_BIN];
    return rateOrNone(bin?.pressuredNoFreeRunner ?? 0, bin?.attemptsNoFreeRunner ?? 0, "no 2.0-2.5 s attempt without a free runner");
  },
  computeFromReal: () => noObservations("no real counterpart: no source charts free runners"),
});

export const quickShareNoFreeRunner: Metric = registerMetric({
  id: "quick_share_no_free_runner",
  tier: 1,
  definition: `The quick-pressure share (first PRESSURE-or-worse before 2.5 s) on pressured dropbacks with no free runner: the miss rule's quick split. ${NO_FREE_RUNNER}.`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.noFreeRunnerQuick, pf.noFreeRunnerPressured, "no pressured dropback without a free runner");
  },
  computeFromReal: () => noObservations("no real counterpart: no source charts free runners"),
});

// --- the clean pocket (§2.4) -------------------------------------------------------------------

const CLEAN_POCKET =
  "A clean dropback's every POCKET_STATUS is CLEAN; a break-out is an escape (QB_PURSUIT). Under legacy an escape needs a forcing status, so these are 0 by construction until the clean-pocket checklist (step 5a)";

export const cleanOutsRate: Metric = registerMetric({
  id: "clean_outs_rate",
  tier: 1,
  definition: `Clean dropbacks with a break-out, per clean dropback. ${CLEAN_POCKET}. Real side: FTN \`is_qb_out_of_pocket\` per clean FTN-season dropback (10.63 per 100).`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const play = context.accumulator.play;
    return rateOrNone(pocketOf(context).cleanEscapes, play.dropbacks - play.pressuredDropbacks, "no clean dropbacks");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realCleanOuts(input),
});

export const outOfPocketRate: Metric = registerMetric({
  id: "out_of_pocket_rate",
  tier: 1,
  definition: `Aimed throws after a clean break-out, per clean break-out. ${CLEAN_POCKET}. Real side: aimed throws among clean FTN-season dropbacks FTN charts out of the pocket (62.3%).`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.cleanBreakoutAimedThrows, pf.cleanEscapes, "no clean break-out");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realOutOfPocketThrows(input),
});

export const cleanDrillShare: Metric = registerMetric({
  id: "clean_drill_share",
  tier: 1,
  definition:
    `Scramble-drill throws per clean aimed throw: aimed throws after a clean break-out the drill ran on (under legacy §8.8's drill runs on every escape). ${CLEAN_POCKET}. ` +
    "Real side: FTN `read_thrown` SD per clean FTN-season aimed throw (3.0%).",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.cleanDrillThrows, pf.cleanAimedThrows, "no clean aimed throws");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realCleanDrillShare(input),
});

// --- situation (§2.4) ---------------------------------------------------------------------------

const WINDOWS =
  "Windows by the snap's period (PERIOD_START) and clock (PLAY_START.situation.clockSeconds): the last 120 s " +
  "of the second or fourth quarter (split by the offence trailing), of the first or third, and the rest of " +
  "regulation. Every window's pass rate, throwaways, P2S and release are in `PocketFold.situation` and `realSituation`";

export const situationEndOfHalf: Metric = registerMetric({
  id: "situation_end_of_half",
  tier: 1,
  definition: `Pressured throwaways per pressured dropback in the last 120 s of each half (step 8b's fitting row). ${WINDOWS}. Real side: FTN-season dropbacks carrying the pressure flag.`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return pressuredThrowawaysIn(pocketOf(context), HALF_END);
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realPressuredThrowawaysIn(input, HALF_END),
});

export const situationQ1Q3LastTwo: Metric = registerMetric({
  id: "situation_q1q3_last_two",
  tier: 1,
  definition: `Pressured throwaways per pressured dropback in the last 120 s of the first and third quarters (step 8a's check against the rest: real 8.94 against 8.51). ${WINDOWS}. Real side: FTN-season dropbacks carrying the pressure flag.`,
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    return pressuredThrowawaysIn(pocketOf(context), Q1Q3_END);
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realPressuredThrowawaysIn(input, Q1Q3_END),
});

// --- contacts and the coverage sack -----------------------------------------------------------------

export const sackShareOfContactsInOut: Metric = registerMetric({
  id: "sack_share_of_contacts_in_out",
  tier: 1,
  definition:
    "Sacks per contact in the pocket; out of the pocket is `PocketFold.sacksOut / contactsOut`. A contact is " +
    "a threat ARRIVED, or the escape roll's CAUGHT, with the ball in his hand, once per dropback and side, " +
    "and every sack is a contact; 'out' if an escape (QB_PURSUIT) began earlier in the play (ADR-089:649). " +
    "Real side: pbp sacks per `qb_hit` or sack on FTN-season dropbacks, by FTN `is_qb_out_of_pocket`.",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.sacksIn, pf.contactsIn, "no contact in the pocket");
  },
  computeFromReal: <E extends Eligibility>(input: RealInput<E>) => realSackShareOfContacts(input, "IN"),
});

export const coverageSackRows: Metric = registerMetric({
  id: "coverage_sack_rows",
  tier: 1,
  definition:
    "Sacks whose last POCKET_STATUS before the sack was CLEAN, as a share of sacks (report only, ADR-089 " +
    "§4.6); the mean time to sack is `PocketFold.sackSeconds`. Under legacy there is no count to run out, so " +
    "the pocket at the sack stands in for the pocket when his count ran out.",
  unit: "%",
  toleranceBand: OBSERVATION(),
  computeFromEvents(context: SimContext): MetricOutcome {
    const pf = pocketOf(context);
    return rateOrNone(pf.sacksCleanAtSack, pf.sackSeconds.length, "no sacks");
  },
  computeFromReal: () =>
    noObservations("SIS's 13% and PFF's 3.8 s are REPORTED and not in the cache; FTN marks 2,722 of 2,724 sacks pressured"),
});
