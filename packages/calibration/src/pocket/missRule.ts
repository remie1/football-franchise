/**
 * THE MISS RULE, FILED AT STEP 0 (ADR-089 default D31, §6.10, ADR-089:1170-1185; plan §7.2 `rules`).
 *
 * "A miss is classed and taken to the owner by the miss rule; nothing in it is automatic"
 * (ADR-089:1168). This file holds the rule exactly as filed, and the one piece of it that is
 * arithmetic: the class split, measured on the arm that missed.
 *
 * 1. THE ROWS IT COVERS (ADR-089:1172): step 3's real rows; step 5b's and acceptance's graded rows;
 *    and the four rows that belong to the free-run clock: the 2.0 s bin (at most twice FTN, on the
 *    grid the step uses: the tick grid, limit 29.4, at step 3; raw seconds, limit 36.2, once the
 *    motion exists), the quick-pressure share (30 to 55), completely unblocked pressures per 100
 *    dropbacks (at most 14) and their share of hit-or-sack (at most 40 in 100). Completely
 *    unblocked men per 100 dropbacks are reported beside them. `MISS_RULE_COVERS` names the filed
 *    clauses (`bands.ts`) these are.
 * 2. WHAT NEVER MOVES ON A MISS (ADR-089:1173): `NEVER_MOVES`.
 * 3. THE CLASS (ADR-089:1174-1178), by a split filed in advance and measured on the arm that missed:
 *    - (i) Supply: the 2.0 s bin passes on dropbacks without a free runner (n <= L), but free runners
 *      are on more than (L - n)/(100 - n) of the 2.0 s throws; or unblocked pressures exceed 14 per
 *      100 dropbacks; or their share of hit-or-sack exceeds 40 in 100; or the quick-pressure share
 *      fails while it passes on pressured dropbacks with no free runner.
 *    - (ii) Timing: the bin fails on dropbacks without a free runner (n > L); the quick-pressure
 *      share fails on pressured dropbacks with no free runner; or free runners arrive earlier than
 *      M8's table.
 *    - (iii) Conversion: hit-or-sack is in its band but sacks or the share are short.
 *    - (iv) Unclassed: a covered row misses with none of (i) to (iii) holding.
 *    Where two classes hold on different rows, both are named.
 * 4. THE OPTIONS (ADR-089:1179-1184), each priced on two seed sets, brought to the owner, never
 *    applied automatically: A (a protection design), B (accept and report), C (the owner revisits
 *    who counts as completely unblocked). For a class (iii) miss, the named next suppliers in order.
 * 5. THE STOP RULE (ADR-089:1185): one pass of the options per step; if the chosen option misses
 *    again, the step stops and the design comes back to the owner.
 *
 * L is the 2.0 s bin's limit on the grid in use and n the arm's measured pressured share of 2.0 s
 * throws with no free runner (`pressured_share_2s_no_free_runner`), printed beside each arm. The
 * threshold (L - n)/(100 - n) is the share of 2.0 s throws free runners may be on before the bin
 * fails, because a 2.0 s throw with a free runner on the play is pressured 99.4 to 100 times in 100
 * (ADR-089:620): about 6 in 100 on the tick grid and 15 on raw seconds at n = 25, and 23 on raw
 * seconds at n = 16.7.
 */
import type { FiledRules } from "./filed.js";

/** The 2.0 s bin's limit, twice FTN, by grid (ADR-089:188): tick-aligned until the motion exists (step 4), raw after. */
export const BIN_20_LIMIT = Object.freeze({ TICK: 29.4, RAW: 36.2 } as const);
export type ReleaseGrid = keyof typeof BIN_20_LIMIT;

/** The quick-pressure share's band (ADR-089:1143). */
export const QUICK_SHARE_BAND: readonly [number, number] = [30, 55];

/** The unblocked bands (ADR-089:279, CHOSEN): pressures per 100 dropbacks, and their share of hit-or-sack. */
export const UNBLOCKED_PRESSURES_PER_100_MAX = 14;
export const UNBLOCKED_SHARE_OF_HIT_OR_SACK_MAX = 40;

/**
 * The class (i) threshold, in percent of the 2.0 s throws: free runners may be on at most
 * (L - n)/(100 - n) of them before the bin fails. L and n in percent.
 */
export function supplyThreshold(L: number, n: number): number {
  if (!(n < 100)) throw new Error(`supplyThreshold: n must be below 100 (got ${String(n)})`);
  return (100 * (L - n)) / (100 - n);
}

/** Item 2: what never moves on a miss (ADR-089:1173). */
export const NEVER_MOVES: readonly string[] = Object.freeze([
  "the free-run constants (D18, D22; and the snap-spot table if question 19 is answered Table now)",
  "the reading of 'completely unblocked' (D19), unless the owner changes it under option C",
  "the arrival reading (D21)",
  "the warning rule (question 3, Follows)",
  "the throw bars (tunables.ts:2248-2249)",
  "the interception rules",
  "no completely unblocked man is ever timed as a late block or by a uniform delay, whatever the row",
]);

export const MISS_CLASSES = ["SUPPLY", "TIMING", "CONVERSION", "UNCLASSED"] as const;
export type MissClass = (typeof MISS_CLASSES)[number];

export const MISS_CLASS_TEXT: Readonly<Record<MissClass, string>> = Object.freeze({
  SUPPLY:
    "(i) Supply: the 2.0 s bin passes on dropbacks without a free runner, but free runners are on more than (L - n)/(100 - n) " +
    "of the 2.0 s throws; or completely unblocked pressures exceed 14 per 100 dropbacks; or their share of hit-or-sack exceeds " +
    "40 in 100; or the quick-pressure share fails while it passes on pressured dropbacks with no free runner. That points to protection.",
  TIMING:
    "(ii) Timing: the bin fails on dropbacks without a free runner, the quick-pressure share fails on pressured dropbacks with " +
    "no free runner, or free runners arrive earlier than M8's table. That points to the block clock or the count, or to a build fault.",
  CONVERSION:
    "(iii) Conversion: hit-or-sack is in its band but sacks or the share are short. That points to contact, the hold and the outs.",
  UNCLASSED:
    "(iv) Unclassed: a covered row that misses with none of (i) to (iii) holding goes to the owner labelled unclassed, with its " +
    "numbers, the same options and the same stop rule.",
});

export const MISS_OPTIONS = Object.freeze({
  A: "A protection design: fewer blown pickups and missed stunt exchanges, first as an information arm, then as its own design with its own petitions.",
  B: "Accept and report: the row is recorded in the ledger as a named, accepted miss and the build goes on; acceptance has not passed while it stands, unless the owner rules by name that it passes.",
  C: "The owner revisits who counts as 'completely unblocked' (D19, reading (b), against reading (c)); reading (a) is never offered.",
} as const);
export type MissOption = keyof typeof MISS_OPTIONS;

/** For a class (iii) miss, the named next suppliers, in order (ADR-089:1184). Neither the free-run clock nor the throw bars are on it. */
export const CONVERSION_SUPPLIERS: readonly string[] = Object.freeze([
  "question 8's rescoring (step 6)",
  "question 7's checklist at the deadline (step 6)",
  "the won-rep half of the alarm (step 7)",
  "step 8b's situation term",
]);

/**
 * The filed clauses (`bands.ts` ids) the miss rule covers (item 1): step 3's real rows, 5b's and
 * acceptance's graded rows, and the four free-run rows at 5b and acceptance.
 */
export const MISS_RULE_COVERS: readonly string[] = Object.freeze([
  // step 3's real rows that carry a band (ADR-089:1028); its hit-or-sack and the quick share's origin carry none, so cannot miss
  "s3.bin20.tick", "s3.quick", "s3.unblockedPressures", "s3.unblockedShare",
  // step 5b's graded rows (ADR-089:1063)
  "s5b.sack", "s5b.hitOrSack", "s5b.release", "s5b.clockExpired", "s5b.binsTwiceFtn", "s5b.pressure",
  // acceptance's graded rows (ADR-089:1134)
  "acc.sack", "acc.hitOrSack", "acc.timeToThrow",
  // the four free-run rows (ADR-089:1172), once the motion exists
  "mr.bin20.raw", "acc.quick", "mr.unblockedPressures", "mr.unblockedShare",
]);

// --- the class split -----------------------------------------------------------------------------

/** A covered row's result on the arm that missed. */
export interface CoveredRowResult {
  readonly clause: string;
  readonly value: number;
  readonly passed: boolean;
}

/** The split, measured on the arm that missed (ADR-089:1174). Every share is in percent. */
export interface MissSplit {
  /** The grid the step uses: TICK until the motion exists, RAW after. */
  readonly grid: ReleaseGrid;
  /** n: the pressured share of 2.0 s throws with no free runner. */
  readonly bin20NoFreeRunner: number;
  /** The share of 2.0 s throws with a free runner on the play. */
  readonly freeRunnerShareOf20: number;
  /** The quick-pressure share on all pressured dropbacks, and on pressured dropbacks with no free runner. */
  readonly quick: number;
  readonly quickNoFreeRunner: number;
  readonly unblockedPressuresPer100: number;
  readonly unblockedShareOfHitOrSack: number;
  /** Free runners whose published arrival is earlier than M8's function gives for them (a count). */
  readonly freeRunnersEarlierThanM8: number;
  /** Hit-or-sack against its band on this step, sacks against theirs, and the share against its target. */
  readonly hitOrSackInBand: boolean;
  readonly sacksShort: boolean;
  readonly shareShort: boolean;
  /** Every covered row's result on this arm (MISS_RULE_COVERS ids that apply at this step). */
  readonly rows: readonly CoveredRowResult[];
}

export interface MissClassification {
  /** The covered rows that missed. Empty: nothing to class. */
  readonly missed: readonly string[];
  /** Every class that holds, each with the conditions that make it hold. */
  readonly classes: readonly { readonly class: MissClass; readonly because: readonly string[] }[];
  /** The options the Orchestrator brings, each priced on two seed sets. Never applied here. */
  readonly options: readonly MissOption[];
  /** For a conversion miss, the named next suppliers, in order. */
  readonly suppliers: readonly string[];
  readonly decidedBy: "the owner";
}

const fmt = (x: number): string => (Math.round(x * 100) / 100).toString();

/**
 * Classes a miss by the filed split. Pure; decides nothing: what happens next goes to the owner
 * (ADR-089:1179). Throws on a row id the miss rule does not cover.
 */
export function classifyMiss(split: MissSplit): MissClassification {
  for (const r of split.rows) {
    if (!MISS_RULE_COVERS.includes(r.clause)) throw new Error(`classifyMiss: ${r.clause} is not a row the miss rule covers`);
  }
  const missed = split.rows.filter((r) => !r.passed).map((r) => r.clause);
  if (missed.length === 0) return { missed, classes: [], options: [], suppliers: [], decidedBy: "the owner" };

  const L = BIN_20_LIMIT[split.grid];
  const n = split.bin20NoFreeRunner;
  const quickPasses = (q: number): boolean => q >= QUICK_SHARE_BAND[0] && q <= QUICK_SHARE_BAND[1];

  const supply: string[] = [];
  if (n <= L) {
    const threshold = supplyThreshold(L, n);
    if (split.freeRunnerShareOf20 > threshold) {
      supply.push(`the 2.0 s bin passes without a free runner (n ${fmt(n)} <= L ${fmt(L)}), but free runners are on ${fmt(split.freeRunnerShareOf20)} of the 2.0 s throws, above (L - n)/(100 - n) = ${fmt(threshold)}`);
    }
  }
  if (split.unblockedPressuresPer100 > UNBLOCKED_PRESSURES_PER_100_MAX) {
    supply.push(`completely unblocked pressures ${fmt(split.unblockedPressuresPer100)} per 100 dropbacks, above ${String(UNBLOCKED_PRESSURES_PER_100_MAX)}`);
  }
  if (split.unblockedShareOfHitOrSack > UNBLOCKED_SHARE_OF_HIT_OR_SACK_MAX) {
    supply.push(`their share of hit-or-sack ${fmt(split.unblockedShareOfHitOrSack)} in 100, above ${String(UNBLOCKED_SHARE_OF_HIT_OR_SACK_MAX)}`);
  }
  if (!quickPasses(split.quick) && quickPasses(split.quickNoFreeRunner)) {
    supply.push(`the quick-pressure share fails (${fmt(split.quick)}) while it passes with no free runner (${fmt(split.quickNoFreeRunner)})`);
  }

  const timing: string[] = [];
  if (n > L) timing.push(`the 2.0 s bin fails without a free runner (n ${fmt(n)} > L ${fmt(L)})`);
  if (!quickPasses(split.quickNoFreeRunner)) timing.push(`the quick-pressure share fails with no free runner (${fmt(split.quickNoFreeRunner)})`);
  if (split.freeRunnersEarlierThanM8 > 0) timing.push(`${String(split.freeRunnersEarlierThanM8)} free runner(s) arrive earlier than M8's table`);

  const conversion: string[] = [];
  if (split.hitOrSackInBand && (split.sacksShort || split.shareShort)) {
    conversion.push(`hit-or-sack is in its band but ${[split.sacksShort ? "sacks" : "", split.shareShort ? "the share" : ""].filter(Boolean).join(" and ")} short`);
  }

  const classes: { class: MissClass; because: string[] }[] = [];
  if (supply.length > 0) classes.push({ class: "SUPPLY", because: supply });
  if (timing.length > 0) classes.push({ class: "TIMING", because: timing });
  if (conversion.length > 0) classes.push({ class: "CONVERSION", because: conversion });
  if (classes.length === 0) classes.push({ class: "UNCLASSED", because: [`${missed.join(", ")} missed with none of (i) to (iii) holding`] });

  return {
    missed,
    classes,
    options: ["A", "B", "C"],
    suppliers: classes.some((c) => c.class === "CONVERSION") ? CONVERSION_SUPPLIERS : [],
    decidedBy: "the owner",
  };
}

/** The stop rule (ADR-089:1185): one pass of the options per step. */
export function afterChosenOption(missedAgain: boolean): "CONTINUE" | "STOP_AND_RETURN_TO_OWNER" {
  return missedAgain ? "STOP_AND_RETURN_TO_OWNER" : "CONTINUE";
}

// --- the filed blocks ----------------------------------------------------------------------------

export const FILED_MISS_RULE: FiledRules["missRule"] = {
  adrLine: 1170,
  text:
    "The miss rule (default D31), filed at step 0, before step 3 runs, respecting the owner's question-4 words in every branch " +
    "(ADR-089:1170-1185). It covers step 3's real rows, step 5b's and acceptance's graded rows, and the free-run clock's four rows. " +
    "A miss is classed by the split filed here, measured on the arm that missed, and taken to the owner with its class and the " +
    "options, each priced on two seed sets; nothing in it is automatic. One pass of the options per step; if the chosen option " +
    "misses again, the step stops and the design comes back to the owner.",
  classes: MISS_CLASSES.map((c) => MISS_CLASS_TEXT[c]),
  options: (Object.keys(MISS_OPTIONS) as MissOption[]).map((k) => `${k}. ${MISS_OPTIONS[k]}`),
  neverMoves: NEVER_MOVES,
  params: {
    coveredRowsLine: 1172,
    neverMovesLine: 1173,
    classLines: [1174, 1175, 1176, 1177, 1178],
    optionLines: [1179, 1180, 1181, 1182, 1184],
    stopRuleLine: 1185,
    classIFormula: "(L - n) / (100 - n), in percent of the 2.0 s throws",
    L: { TICK: BIN_20_LIMIT.TICK, RAW: BIN_20_LIMIT.RAW, rule: "the tick grid at step 3; raw seconds once the motion exists (step 4 on)" },
    n: "pressured_share_2s_no_free_runner, measured on each arm, never chosen (ADR-089:1132), printed beside each arm",
    quickShareBand: [...QUICK_SHARE_BAND],
    quickSplit: "quick_share_no_free_runner",
    unblockedPressuresPer100Max: UNBLOCKED_PRESSURES_PER_100_MAX,
    unblockedShareOfHitOrSackMax: UNBLOCKED_SHARE_OF_HIT_OR_SACK_MAX,
    timingAgainst: "M8's function (deviation O2)",
    covers: [...MISS_RULE_COVERS],
    pricedOn: "two seed sets (base.corpora, seed sets 1 and 2)",
    conversionSuppliers: [...CONVERSION_SUPPLIERS],
    bothNamed: "where two classes hold on different rows, both are named",
    stop: "one pass of the options per step; a second miss stops the step and returns the design to the owner",
    decidedBy: "the owner; never automatic",
  },
};

export const FILED_UNBLOCKED_BANDS: FiledRules["unblockedBands"] = {
  adrLine: 279,
  text:
    "Completely unblocked pressures at most 14 per 100 dropbacks (twice PFF's about 7) and their share of hit-or-sack at most 40 " +
    "in 100 (twice PFF's about 20), CHOSEN at an assumed 22,000 dropbacks; the real figures are INFERRED (ADR-089:279). A man " +
    "counts when he is on the free-run clock (D19's three origins) and his own arrival floor reached PRESSURE or worse while the " +
    "ball was in his hand, once a play (ADR-089:1172). Completely unblocked men per 100 dropbacks are reported beside them.",
  per100DropbacksMax: UNBLOCKED_PRESSURES_PER_100_MAX,
  shareOfHitOrSackMax: UNBLOCKED_SHARE_OF_HIT_OR_SACK_MAX,
  params: {
    rows: ["unblocked_pressures_per_100", "unblocked_share_of_hit_or_sack"],
    reportedBeside: "unblocked_men_per_100",
    gradedAt: ["3", "5b", "acceptance"],
  },
};
