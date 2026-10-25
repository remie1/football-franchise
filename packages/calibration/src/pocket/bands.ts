/**
 * EVERY BAND, FILED AT STEP 0 (ADR-089 §6.0, ADR-089:989-991; plan §7.2 `bands`, `fiveB`, `m1Bound`,
 * `step3Check`, `prediction`; C1-S7).
 *
 * "Predictions filed before the arm runs (entry 125)" (ADR-089:926). Every prediction and falsifier
 * clause of §6.1 to §6.10, plus §8's guard, is one `BandClause`:
 * `{id, step, row, comparator, kind, adrLine, text, lo?, hi?, direction?, tolerance?}`.
 *
 *  - `kind` is one of three:
 *    - `graded`: the step's arm is scored against the band; outside it is a failed prediction,
 *      recorded as such, or, where the design says "falsified if", a falsifier. (The design's "no
 *      graded row is scored before step 5b", ADR-089:14, :1009, speaks of rows graded against real
 *      football; steps 1 to 4 still score their own predictions against their filed tolerances.)
 *    - `reported`: printed against its band, value or direction; never pass or fail.
 *    - `structural`: a test of the build, or a rule of the step's ledger or report, with no
 *      measured band.
 *  - `comparator` answers entry 125's question, "for each clause, WHAT WILL IT BE COMPARED AGAINST,
 *    and does that quantity EXIST IN THIS REGISTRY TODAY?" (`CALIBRATION-BACKLOG.md`, entry 125). It
 *    is one of:
 *    - an `allMetrics()` id or a `constructs.ts` id: the quantity exists at step 0;
 *    - `row:<name>`: a quantity no row computes at step 0, listed in `FUTURE_ROWS` with the step by
 *      which it must be registered, before that step's arm runs (flagged now, while it is free);
 *    - `proof:<name>`: a structural clause's test or ledger rule, listed in `PROOFS` with the step
 *      that builds it. Allowed on structural clauses only.
 *    `comparatorProblems` is the check (C3's `adr089Comparators` calls it). Pressure is
 *    `threat_creation_rate`'s sim side (the design's 86.85, baseline-0009's 0.86847), whose real
 *    side is retired (entry 93; `tier1.ts:227-237`), so a clause on it must be marked "sim side
 *    only" in its row and never compares with a real pressure figure.
 *  - `lo`, `hi` and `tolerance` may be `pending` where an M table fills them at C3: the M1 bound
 *    (B1 in points) raises three pressure edges (deviation O1), and M9's tolerance is step 8a's.
 *  - A delta clause ("pressure -3.4 +-1.5") bounds the arm minus its predecessor build, same
 *    league, same seeds; its row says so.
 *
 * `CLAUSE_LINES` is the completeness list (plan §7.2): every line of the C0 bytes in the plan's
 * ranges that holds a clause. The plan's ranges (`CLAUSE_LINE_RANGES`) also take in blank lines,
 * table headers and separators, and paragraph headings that state no clause; those are left out,
 * and `pocketBands.test.ts` reads the C0 file to prove each one left out is one of those.
 *
 * This file also derives 5b's bands (`derive5b`, ADR-089:1061-1063), holds §8's additive mix rule
 * (`intGuard`, `intGuardByClass`, ADR-089:1306-1308), and assembles the step-0 filing
 * (`step0Filing()`), which `reports/adr-089-step0.filed.json` must equal wherever it is not pending.
 */
import { CONSTRUCT_IDS, CONSTRUCTS, M_IDS, THROW_CLASSES, type MId, type ThrowClass } from "./constructs.js";
import { CORPORA } from "./corpus.js";
import { FILED_B_GRID, FILED_RUN_MARGIN } from "./contest.js";
import {
  FILED_FORMAT,
  type BandClause,
  type ClauseDirection,
  type ClauseKind,
  type Filed,
  type FiledConstant,
  type FiledFile,
  type FiledFiveB,
  type FiledM1Bound,
  type FiledPrediction,
  type FiledStep3Check,
  type FiveBRow,
  type Interval,
  type JsonValue,
  type Pending,
  type PendingSource,
} from "./filed.js";
import { GOLDEN_PINS, SEASON_PATH_PINS } from "./golden.js";
import { FILED_MISS_RULE, FILED_UNBLOCKED_BANDS } from "./missRule.js";
import {
  FILED_ARRIVAL_READING,
  FILED_FITTING_ORDER,
  FILED_LATE_BLOCK,
  FILED_L_CROSSING_TIME,
  FILED_SELECTION_RULE,
  REAL,
  RELEASE_BINS,
} from "./selection.js";

// --- the comparators that are not registry or construct ids ---------------------------------------

/** Structural tests and ledger rules, by the step that builds or applies them. */
export const PROOFS: Readonly<Record<string, { readonly what: string; readonly builtAt: string }>> = Object.freeze({
  "proof:off-bytes": { what: "the by-name OFF proof: every stream byte-identical to the step-0 golden digests, v1 to v7, both leagues (goldenDigests.*)", builtAt: "0" },
  "proof:determinism": { what: "the same seed gives the same stream; two processes give the same digest", builtAt: "0" },
  "proof:window-ticks": { what: "every 1-14 POWER rep reports exactly its window ticks at or after 0.5 s, min(m, 4) then max(m, 5)", builtAt: "1" },
  "proof:window-no-die": { what: "the push window draws no die (roll accounting)", builtAt: "1" },
  "proof:l-equals-today": { what: "under L at R <= 6 every tick at t >= R equals today's", builtAt: "1" },
  "proof:must-act-counter": { what: "must act never fires on the counter alone", builtAt: "2" },
  "proof:must-act-arrival": { what: "every arrival makes him act", builtAt: "2" },
  "proof:free-run-monotone": { what: "a faster or quicker-accelerating man is never later; a deeper drop never brings him sooner", builtAt: "3" },
  "proof:contact-rating-probes": { what: "contact is monotone in each of its four ratings: more agility or strength never raises sacks", builtAt: "4" },
  "proof:release-effect": { what: "release is monotone on hits and has a measurable effect on them", builtAt: "4" },
  "proof:arrival-reading-fixed": { what: "D21's reading is the one scored; the half-second reading is information only and never switched to pass a row", builtAt: "4" },
  "proof:qb-hit-fields": { what: "every QB_HIT under pocket-1 carries approach, from and seen", builtAt: "4" },
  "proof:sack-credit": { what: "the sack is credited to the man at contact", builtAt: "4" },
  "proof:clean-expiry-bar": { what: "on a clean expiry no ball goes to a man below 30 (D23)", builtAt: "5a" },
  "proof:one-clean-move": { what: "at most one clean move a play", builtAt: "5a" },
  "proof:no-horizon-sack-after-escape": { what: "zero horizon sacks after an escape", builtAt: "6" },
  "proof:one-escape": { what: "at most one escape a play, clean break-outs included", builtAt: "6" },
  "proof:scramble-behind-line": { what: "some scramble run ends behind the line on the stream (under the Sack answer)", builtAt: "6" },
  "proof:sack-readers-agree": { what: "the three sack readers agree on every play and on who is credited", builtAt: "6" },
  "proof:no-sack-after-step-up": { what: "no horizon or CLOCK_EXPIRED sack follows a step-up", builtAt: "7" },
  "proof:x3-permutation": { what: "the X3 permutation guard", builtAt: "7" },
  "proof:one-slide": { what: "one slide a play in all", builtAt: "7" },
  "proof:sidestep-eligibility": { what: "SIDESTEP only inside its eligibility", builtAt: "7" },
  "proof:two-minute-flag": { what: "no two-minute flag outside the last two minutes of a half", builtAt: "8a" },
  "proof:goal-to-go-distance": { what: "no distance above the yards to the goal line, after a first down, a turnover or a change of possession", builtAt: "8a" },
  "proof:centring": { what: "the situation term averages 0 over the league's situation mix", builtAt: "8b" },
  "proof:never-reads-patience": { what: "the situation term never reads patience; the patience probe runs at fixed situations", builtAt: "8b" },
  "proof:max-protect": { what: "max protect never raises the free-rusher count", builtAt: "9" },
  "proof:run-first-at-deadline": { what: "a baseline quarterback in a neutral situation ranks RUN first at the deadline (contest.ts)", builtAt: "10" },
  "proof:fitting-order": { what: "the filed fitting order, two passes at most (selection.ts)", builtAt: "0" },
  "proof:never-fitted": { what: "the free-run constants, D21 and L's crossing time are filed at step 0 and never fitted; n is measured, never chosen", builtAt: "0" },
  "proof:miss-rule": { what: "the miss rule's class split, options and stop rule (missRule.ts)", builtAt: "0" },
  "proof:ledger": { what: "a rule of the step's ledger: which clauses fail the step, and how a failure is taken to the owner", builtAt: "0" },
  "proof:report": { what: "a row or arm the step's report must print; nothing is predicted", builtAt: "0" },
  "proof:monotonicity-probes": { what: "the monotonicity probes, with question 11's exception for patience", builtAt: "10" },
  "proof:known-truth-ladders": { what: "the knownTruth ladders, direction only until re-recorded (D8)", builtAt: "10" },
  "proof:doc-conformance": { what: "docConformance's census", builtAt: "0" },
});

/** Quantities no row computes at step 0, by the step whose arm first needs them (entry 125). */
export const FUTURE_ROWS: Readonly<Record<string, { readonly what: string; readonly mustExistBy: string }>> = Object.freeze({
  "row:failed_scramble_share_of_sacks": { what: "scrambles tackled at or behind the line, as a share of sacks (scored as sacks from step 6)", mustExistBy: "6" },
  "row:failed_escape_rate": { what: "failed escapes per escape, for the pursuer-speed probe", mustExistBy: "6" },
  "row:clean_throwaway_in_pocket": { what: "clean throwaways in the pocket and outside it, per 100 clean dropbacks", mustExistBy: "5a" },
  "row:scramble_rate_by_pocket": { what: "scrambles per pressured and per clean dropback", mustExistBy: "5a" },
  "row:never_finds_receiver_bench": { what: "revision 1's never-finds-a-receiver bench (TECH:113): interior and edge sack rates", mustExistBy: "7" },
  "row:pressured_reaching_hit_or_sack": { what: "the share of pressured dropbacks reaching a hit-or-sack (real 48.8%)", mustExistBy: "7" },
  "row:sidestep_won_share": { what: "SIDESTEP's won share", mustExistBy: "7" },
  "row:beat_time_by_lane": { what: "the beat time by lane (a chip delays the edge beat)", mustExistBy: "9" },
  "row:p2s_by_blitz": { what: "P2S and pressure with at least one blitzer against none", mustExistBy: "9" },
  "row:p2s_by_deep_routes": { what: "P2S by the count of deep routes (0 / 1 / 2 / 3+)", mustExistBy: "9" },
  "row:target_share_by_position": { what: "target share by receiver position (WR, RB)", mustExistBy: "10" },
  "row:read_thrown": { what: "the read thrown on aimed throws (first read, later read, checkdown)", mustExistBy: "10" },
  "row:entry_170_keepable_ordering": { what: "entry 170's keepable ordering (keep against no-outlet)", mustExistBy: "10" },
  "row:adr_077_rows": { what: "ADR-077's rows (a) to (c)", mustExistBy: "10" },
});

/** Comparators whose real side is retired: a clause on one compares sim with sim only. */
export const RETIRED_REAL_SIDES: Readonly<Record<string, string>> = Object.freeze({
  threat_creation_rate: "its real side (was_pressure) is retired, UNESTABLISHED (entry 93; tier1.ts:227-237)",
});
const SIM_ONLY = "sim side only";

// --- the clauses ----------------------------------------------------------------------------------

interface Bound {
  readonly lo?: Filed<number>;
  readonly hi?: Filed<number>;
  readonly direction?: ClauseDirection;
  readonly tolerance?: Filed<number>;
}

function clause(id: string, step: string, row: string, comparator: string, kind: ClauseKind, adrLine: number, text: string, b: Bound = {}): BandClause {
  return {
    id, step, row, comparator, kind, adrLine, text,
    ...(b.lo === undefined ? {} : { lo: b.lo }),
    ...(b.hi === undefined ? {} : { hi: b.hi }),
    ...(b.direction === undefined ? {} : { direction: b.direction }),
    ...(b.tolerance === undefined ? {} : { tolerance: b.tolerance }),
  };
}

const pend = (pending: PendingSource, note: string): Pending => ({ pending, note });
const round = (x: number, dp: number): number => Math.round(x * 10 ** dp) / 10 ** dp;
/** centre +- tol as a band. */
const around = (centre: number, tol: number, dp: number): Bound => ({ lo: round(centre - tol, dp), hi: round(centre + tol, dp), tolerance: tol });

const B1 = (note: string): Pending => pend("M1", note);

const STEP1: readonly BandClause[] = [
  // ADR-089:1005, shape L at R = 8 (REPORTED basis, pkA A12, re-run by J1)
  clause("s1.L8.flat.pressure", "1", `pressure (${SIM_ONLY}), shape L at R = 8, flat`, "threat_creation_rate", "graded", 1005, "Shape L at R = 8, flat: pressure 36.50, tolerance +-3.", around(36.5, 3, 2)),
  clause("s1.L8.flat.hitOrSack", "1", "hit-or-sack, shape L at R = 8, flat", "hit_or_sack_rate", "reported", 1005, "Shape L at R = 8, flat: hit-or-sack 2.86, the REPORTED basis; no tolerance is filed for it.", { lo: 2.86, hi: 2.86 }),
  clause("s1.L8.flat.sack", "1", "sacks, shape L at R = 8, flat", "sack_rate", "graded", 1005, "Shape L at R = 8, flat: sacks 2.41, tolerance +-0.5.", around(2.41, 0.5, 2)),
  clause("s1.L8.flat.release", "1", "release, shape L at R = 8, flat", "release_distribution", "graded", 1005, "Shape L at R = 8, flat: release 1.590 s, tolerance +-0.05.", around(1.59, 0.05, 3)),
  clause("s1.L8.gen.pressure", "1", `pressure (${SIM_ONLY}), shape L at R = 8, gen`, "threat_creation_rate", "graded", 1005, "Shape L at R = 8, gen: pressure 39.71, tolerance +-3.", around(39.71, 3, 2)),
  clause("s1.L8.gen.hitOrSack", "1", "hit-or-sack, shape L at R = 8, gen", "hit_or_sack_rate", "reported", 1005, "Shape L at R = 8, gen: hit-or-sack 3.40, the REPORTED basis; no tolerance is filed for it.", { lo: 3.4, hi: 3.4 }),
  clause("s1.L8.gen.sack", "1", "sacks, shape L at R = 8, gen", "sack_rate", "graded", 1005, "Shape L at R = 8, gen: sacks 2.44, tolerance +-0.5.", around(2.44, 0.5, 2)),
  clause("s1.L8.gen.release", "1", "release, shape L at R = 8, gen", "release_distribution", "graded", 1005, "Shape L at R = 8, gen: release 1.651 s, tolerance +-0.05.", around(1.651, 0.05, 3)),
  clause("s1.L5.pressure", "1", `pressure (${SIM_ONLY}), shape L at R = 5 against R = 8`, "threat_creation_rate", "reported", 1005, "Shape L at R = 5: reported, direction only (pressure above the R = 8 arm).", { direction: "UP" }),
  clause("s1.S.pressure", "1", `pressure (${SIM_ONLY}), shape S with the window, both leagues`, "threat_creation_rate", "graded", 1005,
    "Shape S at the provisional values: pressure 28 to 40, its upper edge raised by M1's window count (ADR-089:1007; deviation O1). INFERRED from pkC arm H's hazard form at a different point.",
    { lo: 28, hi: B1("40 + B1 in points (100 * B1 / dropbacks on the arm's league)") }),
  clause("s1.S.sack", "1", "sacks, shape S, both leagues", "sack_rate", "graded", 1005, "Shape S at the provisional values: sacks 2 to 4.", { lo: 2, hi: 4 }),
  clause("s1.S.release", "1", "release, shape S, both leagues", "release_distribution", "graded", 1005, "Shape S at the provisional values: release 1.5 to 1.7 s.", { lo: 1.5, hi: 1.7 }),
  clause("s1.falsifier.pressure45", "1", `pressure (${SIM_ONLY}), either shape, either league`, "threat_creation_rate", "graded", 1005, "Falsified if pressure is above 45 on either league for either shape.", { hi: 45 }),
  clause("s1.falsifier.floorCounter", "1", "band floor plus counter, share of first dirt, shape L", "first_pressure_origin", "graded", 1005, "Falsified if, for L, the band floor plus counter is above 10% of first dirt.", { hi: 10 }),
  clause("s1.falsifier.lToday", "1", "L at R <= 6 from t >= R", "proof:l-equals-today", "structural", 1005, "Falsified if, at R <= 6, any tick at t >= R differs from today's."),
  clause("s1.falsifier.offBytes", "1", "the OFF proof", "proof:off-bytes", "structural", 1005, "Falsified if one byte differs in the OFF proof."),
  // ADR-089:1007
  clause("s1.window.pressure", "1", `pressure (${SIM_ONLY}), S with the window minus S without it`, "threat_creation_rate", "graded", 1007,
    "The window alone moves pressure by at most M1's count (B1, deviation O1).",
    { lo: B1("-(B1 in points)"), hi: B1("B1 in points (100 * B1 / dropbacks on the arm's league)") }),
  clause("s1.window.sack", "1", "sacks, S with the window minus S without it", "sack_rate", "graded", 1007, "The window alone moves sacks by at most 0.3.", { lo: -0.3, hi: 0.3 }),
  clause("s1.window.ticks", "1", "window ticks of every 1-14 POWER rep", "proof:window-ticks", "structural", 1007,
    "Falsified also if any 1-14 POWER rep reports other than its window ticks at or after 0.5 s (two when t_b is 1.5 s or later, one when it is 1.0 s, none when it is 0.5 s), min(m, 4) then max(m, 5)."),
  clause("s1.window.noDie", "1", "the window's dice", "proof:window-no-die", "structural", 1007, "Falsified also if the window draws a die."),
  // ADR-089:1009
  clause("s1.expected.sack", "1", "sacks, expected", "sack_rate", "reported", 1009, "Expected and not a result: sacks around 2.4 in 100. No graded row is scored here.", { lo: 2.4, hi: 2.4 }),
];

const STEP2: readonly BandClause[] = [
  // ADR-089:1015 (REPORTED basis, pkA A12 -> A123)
  clause("s2.pressure.flat", "2", `pressure (${SIM_ONLY}), the step-2 build minus step 1's, flat`, "threat_creation_rate", "graded", 1015, "Pressure -3.4 flat (+-1.5).", around(-3.4, 1.5, 2)),
  clause("s2.pressure.gen", "2", `pressure (${SIM_ONLY}), the step-2 build minus step 1's, gen`, "threat_creation_rate", "graded", 1015, "Pressure -2.8 gen (+-1.5).", around(-2.8, 1.5, 2)),
  clause("s2.hitOrSack", "2", "hit-or-sack, the step-2 build minus step 1's", "hit_or_sack_rate", "graded", 1015, "Hit-or-sack +0.3 to +1.3.", { lo: 0.3, hi: 1.3 }),
  clause("s2.sack", "2", "sacks, the step-2 build minus step 1's", "sack_rate", "graded", 1015, "Sacks +0.1 to +0.9 (measured +0.53 / +0.39).", { lo: 0.1, hi: 0.9 }),
  clause("s2.falsifier.sacksDown", "2", "sacks, the forcing point's effect", "sack_rate", "graded", 1015, "Falsified if the forcing point lowers sacks.", { lo: 0 }),
  // ADR-089:1017
  clause("s2.m2", "2", "counter-forced share of forced decisions, by alignment and position", "M2", "reported", 1017,
    "Must act is per rusher with every threat registered until step 7, so its basis differs from A123's by the forcing the counter alone supplied; M2 sizes it before the arm runs (TM's 399 of 14,627 edge won-rep threats under S is a (b) check).",
    { lo: pend("M2", "M2's counter-forced share under S, reported beside the arm"), hi: pend("M2", "the same figure") }),
  clause("s2.falsifier.counterAlone", "2", "must act on the counter", "proof:must-act-counter", "structural", 1017, "Falsified also if must act ever fires on the counter alone."),
  clause("s2.falsifier.everyArrival", "2", "must act on an arrival", "proof:must-act-arrival", "structural", 1017, "Falsified also if any arrival fails to make him act."),
];

const STEP3: readonly BandClause[] = [
  // ADR-089:1027, part 1 (this step's falsifier; deviation O2)
  clause("s3.part1.m8", "3", "every free runner's etaTick", "M8", "structural", 1027,
    "Every free runner's published etaTick equals M8's function for his snap row, ratings and drop, applied to that play's own PLAY_START and snapshot, to the tenth, under Wait, with the Mug arm off (deviation O2). A failure is a build fault."),
  clause("s3.part1.monotone", "3", "the free-run clock's monotonicity", "proof:free-run-monotone", "structural", 1027, "A faster or quicker-accelerating man is never later; a deeper drop never brings him sooner."),
  clause("s3.part1.determinism", "3", "the stream", "proof:determinism", "structural", 1027, "The same seed gives the same stream."),
  clause("s3.part1.mirror", "3", "the mirror guard", "M5", "structural", 1027, "The mirror guard holds."),
  // ADR-089:1028, part 2 (reported against their bands; a miss goes to the owner under the miss rule), on the pricing arm and the design build
  clause("s3.bin20.tick", "3", "pressured share of 2.0 s throws, tick grid", "pressured_share_by_release_bin", "graded", 1028, "The 2.0 s tick bin, limit 29.4 (twice FTN). A miss goes to the owner under the miss rule.", { hi: 29.4 }),
  clause("s3.hitOrSack", "3", "hit-or-sack", "hit_or_sack_rate", "reported", 1028, "Hit-or-sack, reported; expected from the stand-ins 9.1 to 9.3 (REPORTED, TOT §4.1, reading (b)).", { lo: 9.1, hi: 9.3 }),
  clause("s3.quick", "3", "quick-pressure share of pressured dropbacks", "quick_pressure_share_by_origin", "graded", 1028, "The quick-pressure share 30 to 55. A miss goes to the owner under the miss rule.", { lo: 30, hi: 55 }),
  clause("s3.quickOrigin", "3", "quick-pressure origin: free rushers' share of quick pressures against their share of all pressures", "quick_pressure_share_by_origin", "reported", 1028, "The quick-pressure share's origin, reported (acceptance grades its direction, ADR-089:1144).", { direction: "UP" }),
  clause("s3.unblockedPressures", "3", "completely unblocked pressures per 100 dropbacks", "unblocked_pressures_per_100", "graded", 1028, "At most 14 (twice PFF's about 7, INFERRED real). A miss goes to the owner under the miss rule.", { hi: 14 }),
  clause("s3.unblockedShare", "3", "their share of hit-or-sack", "unblocked_share_of_hit_or_sack", "graded", 1028, "At most 40 in 100 (twice PFF's about 20, INFERRED real). A miss goes to the owner under the miss rule.", { hi: 40 }),
  clause("s3.unblockedMen", "3", "completely unblocked men per 100 dropbacks", "unblocked_men_per_100", "reported", 1028, "Reported beside them: 16.3 to 16.8 in the stand-ins, 18.1 on base gen.", { lo: 16.3, hi: 16.8 }),
  clause("s3.expected.pressure", "3", `pressure (${SIM_ONLY}), expected`, "threat_creation_rate", "reported", 1028, "Expected from the stand-ins (REPORTED, TOT §4.1, reading (b)): pressure 39.0.", { lo: 39.0, hi: 39.0 }),
  clause("s3.expected.sack", "3", "sacks, expected", "sack_rate", "reported", 1028, "Expected from the stand-ins: sacks 3.55.", { lo: 3.55, hi: 3.55 }),
  clause("s3.expected.bin20", "3", "the 2.0 s tick bin, expected", "pressured_share_by_release_bin", "reported", 1028, "Expected from the stand-ins: the 2.0 s tick bin 47.0, so WARNING 2 expects the bin to miss.", { lo: 47.0, hi: 47.0 }),
  clause("s3.expected.quick", "3", "quick-pressure share, expected", "quick_pressure_share_by_origin", "reported", 1028, "Expected from the stand-ins: the quick share 60.3, so WARNING 2 expects it to miss.", { lo: 60.3, hi: 60.3 }),
  clause("s3.neverOffered", "3", "what is offered for a man nobody touched", "proof:miss-rule", "structural", 1028, "A late block, a uniform delay or a refit of the free-run constants is never offered for a man nobody touched."),
];

const STEP4: readonly BandClause[] = [
  // ADR-089:1036 (on the pricing arm)
  clause("s4.contact.flat.sack", "4", "sacks, contact alone on today's line, untilted, flat", "sack_rate", "graded", 1036, "Contact alone on today's line (the named arm), untilted: sacks 10 to 14 flat (INFERRED from pkA's per-tick coin).", { lo: 10, hi: 14 }),
  clause("s4.contact.gen.sack", "4", "sacks, contact alone on today's line, untilted, gen", "sack_rate", "graded", 1036, "Contact alone, untilted: sacks 9 to 13 gen.", { lo: 9, hi: 13 }),
  clause("s4.contact.pressure", "4", `pressure (${SIM_ONLY}), contact alone minus its base`, "threat_creation_rate", "graded", 1036, "Pressure within 1 point; falsified if the contest moves pressure more than 1 point.", { lo: -1, hi: 1 }),
  clause("s4.contact.hitOrSack", "4", "hit-or-sack, contact alone minus its base", "hit_or_sack_rate", "graded", 1036, "Hit-or-sack within 1 point.", { lo: -1, hi: 1 }),
  clause("s4.contact.gen.share", "4", "sack share of hit-or-sack, gen", "sack_share_of_hit_or_sack", "graded", 1036, "Sack share of hit-or-sack 40 to 55 on gen.", { lo: 40, hi: 55 }),
  clause("s4.contact.flat.share", "4", "sack share of hit-or-sack, flat", "sack_share_of_hit_or_sack", "graded", 1036, "Sack share of hit-or-sack 50 to 65 flat.", { lo: 50, hi: 65 }),
  clause("s4.motion.hits", "4", "hits on aimed throws per 100 dropbacks, the motion against the step-3 build", "hit_rate_by_release_bin", "graded", 1036, "The motion adds at least 3 hits on thrown balls in 100 dropbacks to the step-3 build; falsified if fewer.", { lo: 3 }),
  clause("s4.motion.curveRises", "4", "attempt-weighted least-squares slope of the hit rate on bin midpoint, bins from 2.0 s on, D21's reading", "hit_rate_by_release_bin", "graded", 1036,
    "On default D21's reading the hit-by-release curve must rise with the bin from 2.0 s on: a positive attempt-weighted least-squares slope over the bins from 2.0 s on (ADR-089:1040; the open last bin read at 5.5 s, selection.ts). Falsified if it still falls, in which case the §4.1 selection cannot run and default D1's fallback applies.",
    { direction: "UP" }),
  clause("s4.motion.int", "4", "INT per aimed throw, the motion alone: its rise over base minus the rise its release mix predicts", "int_per_aimed_throw", "graded", 1036, "The motion alone is priced on interceptions under the guard of §8 (the additive mix rule, intGuard).", { hi: 0 }),
  clause("s4.falsifier.ratingProbes", "4", "contact's ratings", "proof:contact-rating-probes", "structural", 1036, "Falsified if more agility or strength ever raises sacks."),
  clause("s4.falsifier.release", "4", "release on hits", "proof:release-effect", "structural", 1036, "Falsified if release has no measurable effect on hits."),
  // ADR-089:1040
  clause("s4.reading", "4", "the arrival reading scored", "proof:arrival-reading-fixed", "structural", 1040, "The half-second reading runs as information only, and switching readings to pass a row is never allowed."),
  // ADR-089:1041 (the tilts alone; falsifiers by ADR-089:1043)
  clause("s4.tilt.pushBlocked", "4", "sacks per contact, a seen PUSH or BLOCKED man, tilt alone against untilted", "sack_share_of_contacts_in_out", "graded", 1041, "The tilt moves the margin only in its stated direction: a seen PUSH or BLOCKED man, fewer sacks.", { direction: "DOWN" }),
  clause("s4.tilt.freeRun", "4", "sacks per contact, a man on the free-run clock (FREE, and LOOPER_FREE labelled THROUGH), tilt alone against untilted", "sack_share_of_contacts_in_out", "graded", 1041, "A man on the free-run clock, more sacks.", { direction: "UP" }),
  clause("s4.tilt.behindNever", "4", "sacks per contact, from BEHIND or NEVER seen, tilt alone against untilted", "sack_share_of_contacts_in_out", "graded", 1041, "BEHIND or NEVER, more sacks.", { direction: "UP" }),
  // ADR-089:1042 (reported)
  clause("s4.sackerMix.edge", "4", "sacker mix: edge (DE, OLB) share of credited sacks", "sacker_mix", "reported", 1042, "Reported: the sacker mix against its band (M3, default D34): edge 45 to 70.", { lo: 45, hi: 70 }),
  clause("s4.sackerMix.interior", "4", "sacker mix: interior share of credited sacks", "sacker_mix", "reported", 1042, "Reported: interior 12 to 32.", { lo: 12, hi: 32 }),
  clause("s4.bRange", "4", "b's reachable range: sack share of hit-or-sack at the grid's ends", "sack_share_of_hit_or_sack", "reported", 1042, "Reported: b's reachable range on this build (§4.5), against the stand-in ceiling of 24 to 36 on the continuous reading (ADR-089:671).", { lo: 24, hi: 36 }),
  clause("s4.sackCredit", "4", "who is credited with the sack", "proof:sack-credit", "structural", 1042, "The sack is credited to the man at contact."),
  // ADR-089:1043
  clause("s4.qbHitFields", "4", "QB_HIT's approach, from and seen", "proof:qb-hit-fields", "structural", 1043, "Falsified also if a tilt moves the margin against its stated direction (s4.tilt.*), or a QB_HIT is missing approach, from or seen under pocket-1."),
];

const STEP5A: readonly BandClause[] = [
  // ADR-089:1049, on the clean bench (restated for pocket-1)
  clause("s5a.release", "5a", "release on the clean bench", "release_distribution", "reported", 1049, "Release 2.41 +- 0.15 s: a check of the fit, not of the mechanism.", around(2.41, 0.15, 2)),
  clause("s5a.under1", "5a", "share of releases at or under 1.0 s on the clean bench", "release_distribution", "reported", 1049, "Share at or under 1.0 s at most 8% (real clean 6.3%): a check of the fit.", { hi: 8 }),
  clause("s5a.over35", "5a", "share of releases at or over 3.5 s on the clean bench", "release_distribution", "reported", 1049, "Share at or over 3.5 s 8 to 18% (real clean 14.1%): a check of the fit.", { lo: 8, hi: 18 }),
  clause("s5a.cleanScramble", "5a", "clean scrambles per clean dropback on the clean bench", "row:scramble_rate_by_pocket", "graded", 1049, "Clean scramble 2 to 6% (real 3.92%), on either league: one of the rows the deltas do not touch, a falsifier.", { lo: 2, hi: 6 }),
  clause("s5a.completion", "5a", "completion per aimed throw on the clean bench, minus the bench base", "completion_per_aimed_throw", "graded", 1049, "Completion per aimed throw at least bench base - 2 pp, on either league: a falsifier.", { lo: -2 }),
  // ADR-089:1051
  clause("s5a.cleanOuts", "5a", "clean outs (scramble plus throwaway) per 100 clean dropbacks", "clean_outs_rate", "reported", 1051, "Report row: clean outs, real 5.17 in 100.", { lo: 5.17, hi: 5.17 }),
  clause("s5a.checkdown", "5a", "clean checkdown share of aimed throws", "clean_checkdown_share", "reported", 1051, "Report row: the clean checkdown share of aimed throws, real 14.7%.", { lo: 14.7, hi: 14.7 }),
  clause("s5a.laterRead", "5a", "clean later-read share of aimed throws", "clean_later_read_share", "reported", 1051, "Report row: the later-read share, real 10.0%.", { lo: 10.0, hi: 10.0 }),
  clause("s5a.nobodyOpen", "5a", "the bench's nobody-open share, with its split", "nobody_open_share", "reported", 1051, "Report row: the bench's nobody-open share with its split (CP: 30.2 gen dropbacks in 100).", { lo: 30.2, hi: 30.2 }),
  clause("s5a.cleanExpiryBar", "5a", "the bar on a clean expiry", "proof:clean-expiry-bar", "structural", 1051, "A direction falsifier: on a clean expiry no ball goes to a man below 30 (default D23)."),
  clause("s5a.oneCleanMove", "5a", "clean moves a play", "proof:one-clean-move", "structural", 1051, "A structural test: at most one clean move a play."),
  clause("s5a.removedClass", "5a", "the changed class (desperation throws) per 100 dropbacks, with its count and interceptions", "int_per_aimed_by_throw_class", "reported", 1051, "The changed class's count and interceptions; today's desperation throws on the gen bench are 10.1% of dropbacks and carry 549 of 1,987 interceptions, an upper bound on what D23 removes.", { hi: 10.1 }),
  // ADR-089:1053 (the settle changes two of the four falsifiers)
  clause("s5a.cleanThrowaway", "5a", "clean throwaways per 100 clean dropbacks, in the pocket and outside it", "row:clean_throwaway_in_pocket", "reported", 1053, "Reported at 5a, as 0 in the pocket against a real 0.76 per 100 clean dropbacks and 0 outside against 0.50; graded from step 6 (ADR-089:1146).", { lo: 0, hi: 0 }),
  clause("s5a.int", "5a", "INT per aimed throw by throw class, each class's rise over base minus its mix-predicted rise", "int_per_aimed_by_throw_class", "graded", 1053, "The interception falsifier at 5a is D28's guard read by throw class (§8, intGuardByClass).", { hi: 0 }),
  clause("s5a.intLeague", "5a", "INT per attempt on the clean bench, minus the bench base", "int_rate", "reported", 1053, "The league-wide 'bench base + 0.3 pp' cannot fire once D23 can lower the bench's INT by up to about 1.4, so it is reported.", { hi: 0.3 }),
];

const STEP5B: readonly BandClause[] = [
  // ADR-089:1063 (the re-derivation; graded on the generated league first, default D6)
  clause("s5b.sack", "5b", "sacks", "sack_rate", "graded", 1063, "Sacks 3.9 to 5.9 (acceptance's 5.58 to 7.54 shifted by the later steps' midpoints, derive5b; full interval 2.34 to 7.50 printed beside it).", { lo: 3.9, hi: 5.9 }),
  clause("s5b.hitOrSack", "5b", "hit-or-sack", "hit_or_sack_rate", "graded", 1063, "Hit-or-sack 13.8 to 18.2 (derive5b; full interval 10.68 to 21.28 printed beside it).", { lo: 13.8, hi: 18.2 }),
  clause("s5b.release", "5b", "release", "release_distribution", "graded", 1063, "Release 2.45 to 2.85 s.", { lo: 2.45, hi: 2.85 }),
  clause("s5b.clockExpired", "5b", "CLOCK_EXPIRED per dropback", "throwaway_rate_clock_expired", "graded", 1063, "CLOCK_EXPIRED at most 1.5% of dropbacks (a spent count in a pressured pocket; no checklist play counts).", { hi: 1.5 }),
  clause("s5b.binsTwiceFtn", "5b", "release bins from 2.0 s on above twice FTN, raw seconds (binsAboveTwiceFtn)", "pressured_share_by_release_bin", "graded", 1063, "No release bin from 2.0 s on above twice FTN (raw seconds).", { hi: 0 }),
  clause("s5b.pressure", "5b", `pressure (${SIM_ONLY})`, "threat_creation_rate", "graded", 1063, "Pressure 25 to 42, its upper edge raised by M1's window count (deviation O1).", { lo: 25, hi: B1("42 + B1 in points (100 * B1 / dropbacks on the arm's league)") }),
  clause("s5b.quick", "5b", "quick-pressure share", "quick_pressure_share_by_origin", "reported", 1063, "The quick-pressure share reported (against acceptance's 30 to 55).", { lo: 30, hi: 55 }),
  clause("s5b.standIn", "5b", "sacks, the stand-in nearest 5b", "sack_rate", "reported", 1063, "The stand-in nearest 5b (REPORTED, TOT §4.3) gives sacks 1.95 and hit-or-sack 17.46: sacks would miss low and hit-or-sack would pass near its top (WARNING 2).", { lo: 1.95, hi: 1.95 }),
];

const STEP6: readonly BandClause[] = [
  // ADR-089:1075
  clause("s6.pressuredThrowaway", "6", "throwaways per pressured dropback", "throwaway_rate_pressured", "graded", 1075, "Pressured throwaways fall from about 20% of pressured dropbacks to 7 to 11% (real 8.84%).", { lo: 7, hi: 11 }),
  clause("s6.falsifier.pressuredThrowaway", "6", "throwaways per pressured dropback", "throwaway_rate_pressured", "graded", 1075, "Falsified if pressured throwaways stay above 15%.", { hi: 15 }),
  clause("s6.throwaways", "6", "throwaways per dropback", "throwaway_rate", "graded", 1075, "Throwaways at most 5% of dropbacks.", { hi: 5 }),
  clause("s6.rescoring", "6", "sacks, the failed-scramble rescoring alone on the rebuilt pocket", "sack_rate", "graded", 1075, "The failed-scramble rescoring, priced alone, adds 0.3 to 1.0 points of sacks.", { lo: 0.3, hi: 1.0 }),
  clause("s6.falsifier.rescoring", "6", "sacks, the rescoring alone", "sack_rate", "graded", 1075, "Falsified if the rescoring alone lowers sacks (the joint step may lower them).", { lo: 0 }),
  clause("s6.failedScrambles", "6", "scrambles tackled behind the line, share of sacks", "row:failed_scramble_share_of_sacks", "graded", 1075, "Scrambles tackled behind the line are 5 to 15% of sacks (SIS charts failed scrambles at 10%).", { lo: 5, hi: 15 }),
  clause("s6.horizonSacks", "6", "horizon sacks after an escape", "proof:no-horizon-sack-after-escape", "structural", 1075, "Zero horizon sacks after an escape."),
  clause("s6.oneEscape", "6", "escapes a play", "proof:one-escape", "structural", 1075, "At most one escape per play."),
  clause("s6.mobilityProbe.p2s", "6", "P2S, Mobility 40 -> 90 probe", "pressure_to_sack", "graded", 1075, "A Mobility 40 -> 90 probe moves P2S by at most 2 points.", { lo: -2, hi: 2 }),
  clause("s6.mobilityProbe.scrambles", "6", "scramble rate, Mobility 40 -> 90 probe", "scramble_rate", "graded", 1075, "The Mobility probe raises the scramble rate.", { direction: "UP" }),
  clause("s6.pursuerProbe", "6", "failed-escape rate, a faster pursuer", "row:failed_escape_rate", "graded", 1075, "A faster pursuer never lowers the failed-escape rate.", { lo: 0 }),
  clause("s6.behindLine", "6", "scramble runs ending behind the line", "proof:scramble-behind-line", "structural", 1075, "Falsified if no scramble run ever ends behind the line on the stream (under the Sack answer)."),
  // ADR-089:1079-1084
  clause("s6.cleanOutOfPocket", "6", "clean out-of-pocket per 100 clean dropbacks", "clean_outs_rate", "graded", 1079, "Clean out-of-pocket, 6 to 16 per 100 clean dropbacks (real 10.63; width CHOSEN), a falsifier.", { lo: 6, hi: 16 }),
  clause("s6.contactsInOut", "6", "sack share of contacts, in the pocket minus out of it", "sack_share_of_contacts_in_out", "graded", 1080, "Sack share of contacts, in and out of the pocket, within 5 points of each other (real 45.5 against 43.9), a falsifier.", { lo: -5, hi: 5 }),
  clause("s6.sideAwareCatch", "6", "sacks, the side-aware catch alone", "sack_rate", "reported", 1081, "Side-aware catch alone: direction more sacks (the stand-in added +0.32 hits and +0.24 sacks in 100).", { direction: "UP" }),
  clause("s6.caughtAsContact", "6", "sacks, the caught escape as contact alone", "sack_rate", "reported", 1081, "Caught escape as contact alone: fewer sacks (direction), because some catches become sheds.", { direction: "DOWN" }),
  clause("s6.drillArms", "6", "the drill alone, the side-aware drill alone, the deadline pick alone", "proof:report", "structural", 1081, "The drill alone, the side-aware drill alone and the deadline pick alone: reported; no band or direction is filed."),
  clause("s6.drillShare", "6", "the drill's share of clean aimed throws", "clean_drill_share", "reported", 1082, "Reported: the drill's share of clean aimed throws (real 3.0%).", { lo: 3.0, hi: 3.0 }),
  clause("s6.onTheRun.cleanCompletion", "6", "completion per aimed throw on the run, clean", "completion_per_aimed_by_throw_class", "reported", 1082, "Reported: throws on the run against the real 69.3% complete clean.", { lo: 69.3, hi: 69.3 }),
  clause("s6.onTheRun.cleanInt", "6", "INT per aimed throw on the run, clean", "int_per_aimed_by_throw_class", "reported", 1082, "Reported: throws on the run against the real 2.11% intercepted clean.", { lo: 2.11, hi: 2.11 }),
  clause("s6.onTheRun.pressuredCompletion", "6", "completion per aimed throw on the run, pressured", "completion_per_aimed_by_throw_class", "reported", 1082, "Reported: against the real 53.4% pressured.", { lo: 53.4, hi: 53.4 }),
  clause("s6.onTheRun.pressuredInt", "6", "INT per aimed throw on the run, pressured", "int_per_aimed_by_throw_class", "reported", 1082, "Reported: against the real 3.25% pressured.", { lo: 3.25, hi: 3.25 }),
  clause("s6.mobilityThirds", "6", "clean scrambles by mobility third", "row:scramble_rate_by_pocket", "reported", 1082, "Reported: the mobility thirds against the data (more Mobility raises clean scrambles, real 2.44 to 5.18; it also lowers throwaways at the deadline, which is expected and reported, not failed).", { direction: "UP" }),
  clause("s6.sackerShift.offBall", "6", "sacker mix: off-ball linebackers, out of the pocket minus in it", "sacker_mix", "reported", 1082, "Reported: the out-of-pocket sacker shift by sign, off-ball linebackers up (real 16.0 against 9.0).", { direction: "UP" }),
  clause("s6.sackerShift.interior", "6", "sacker mix: interior, out of the pocket minus in it", "sacker_mix", "reported", 1082, "Reported: interior down (real 16.5 against 23.2).", { direction: "DOWN" }),
  clause("s6.readersAgree", "6", "the three sack readers", "proof:sack-readers-agree", "structural", 1083, "The three sack readers agree on every play and on who is credited."),
  clause("s6.oneEscapeClean", "6", "escapes a play, clean break-outs included", "proof:one-escape", "structural", 1083, "At most one escape a play, clean break-outs included."),
  clause("s6.mirror", "6", "the mirror guard on direction and catches", "M5", "structural", 1083, "The mirror guard on escape direction and catches."),
  clause("s6.falsifiers", "6", "step 6's falsifiers", "proof:ledger", "structural", 1084, "Falsified also if clean out-of-pocket is outside 6 to 16 (s6.cleanOutOfPocket), the contacts' sack share in and out of the pocket differs by more than 5 points (s6.contactsInOut), or any agreement or mirror test fails (s6.readersAgree, s6.oneEscapeClean, s6.mirror)."),
];

const STEP7: readonly BandClause[] = [
  // ADR-089:1092 (revision 1's step-7 prediction, kept for its benches, probes and structural rows; its pressure and hit-or-sack bands are replaced, ADR-089:1088)
  clause("s7.bench.gap", "7", "interior against edge sack rate on the never-finds-a-receiver bench (ratio)", "row:never_finds_receiver_bench", "graded", 1092, "On the never-finds-a-receiver bench (TECH:113), the interior-versus-edge sack gap comes within 2x.", { hi: 2 }),
  clause("s7.bench.interior", "7", "a poised quarterback's interior sack rate on that bench", "row:never_finds_receiver_bench", "graded", 1092, "Interior stays above 40%.", { lo: 40 }),
  clause("s7.bench.edgeFree", "7", "a poised quarterback's edge free-runner sack rate on that bench", "row:never_finds_receiver_bench", "reported", 1092, "A poised quarterback's edge free-runner sack rate is no longer near 1%.", { direction: "UP" }),
  clause("s7.awarenessProbe.p2s", "7", "P2S, Awareness 50 -> 90 probe", "pressure_to_sack", "graded", 1092, "Awareness 50 -> 90 moves P2S by at most 2 points.", { lo: -2, hi: 2 }),
  clause("s7.awarenessProbe.clean", "7", `pressure (${SIM_ONLY}), Awareness 50 -> 90 probe (the clean share is its complement)`, "threat_creation_rate", "graded", 1092, "Awareness 50 -> 90 raises the clean share.", { direction: "DOWN" }),
  clause("s7.patienceProbe.pressure", "7", `pressure (${SIM_ONLY}), Patience 50 -> 90 probe`, "threat_creation_rate", "graded", 1092, "A patience 50 -> 90 probe raises pressure; falsified if it does not.", { direction: "UP" }),
  clause("s7.patienceProbe.p2s", "7", "P2S, Patience 50 -> 90 probe", "pressure_to_sack", "graded", 1092, "The patience probe keeps P2S within about 2 points; falsified if it moves P2S by more than 2 points.", { lo: -2, hi: 2 }),
  // ADR-089:1094 (revision 2's bands, CHOSEN widths around the stand-in basis)
  clause("s7.pressure", "7", `pressure (${SIM_ONLY}), the step-7 build minus step 6's`, "threat_creation_rate", "graded", 1094, "Pressure within -3 to +3 points.", { lo: -3, hi: 3 }),
  clause("s7.sack", "7", "sacks, the step-7 build minus step 6's", "sack_rate", "graded", 1094, "Sacks +0.5 to +2.5.", { lo: 0.5, hi: 2.5 }),
  clause("s7.hitOrSack", "7", "hit-or-sack, the step-7 build minus step 6's", "hit_or_sack_rate", "graded", 1094, "Hit-or-sack -4 to +1.", { lo: -4, hi: 1 }),
  clause("s7.pressuredReachingHit", "7", "share of pressured dropbacks reaching a hit-or-sack", "row:pressured_reaching_hit_or_sack", "reported", 1094, "Reported against the real 48.8%, direction only.", { direction: "UP" }),
  clause("s7.agilityProbe.sacks", "7", "sacks per dropback, Agility 50 -> 90 probe", "sack_rate", "graded", 1094, "Agility 50 -> 90 never raises sacks per dropback.", { hi: 0 }),
  clause("s7.agilityProbe.sidestep", "7", "SIDESTEP's won share, Agility 50 -> 90 probe", "row:sidestep_won_share", "graded", 1094, "Agility 50 -> 90 raises SIDESTEP's won share.", { direction: "UP" }),
  clause("s7.strengthProbe", "7", "sacks per dropback, Strength probe", "sack_rate", "graded", 1094, "Strength never raises sacks.", { hi: 0 }),
  clause("s7.earlyShare", "7", "the EARLY share of FRONT and SIDE threats", "M7", "graded", 1094, "The EARLY share of FRONT and SIDE threats lands in 0.85 to 0.95 (a check of the setting, not the mechanism).", { lo: 0.85, hi: 0.95 }),
  clause("s7.sidestepWon", "7", "SIDESTEP's won share", "row:sidestep_won_share", "reported", 1094, "Reported: SIDESTEP's won share (stand-in 65.2%).", { lo: 65.2, hi: 65.2 }),
  clause("s7.alarmMix", "7", "the alarm mix", "M4", "structural", 1094, "Reported: the alarm mix (M4); no band is filed."),
  clause("s7.contactBranches", "7", "contact's branches", "M6", "structural", 1094, "Reported: the contact branches (M6); no band is filed."),
  clause("s7.intByClass", "7", "interceptions by throw class", "int_per_aimed_by_throw_class", "structural", 1094, "Reported: interceptions by throw class (D28), under §8's guard (guard.byClass)."),
  clause("s7.oneSlide", "7", "slides a play", "proof:one-slide", "structural", 1094, "Structural: one slide a play in all."),
  clause("s7.sidestepEligibility", "7", "SIDESTEP's eligibility", "proof:sidestep-eligibility", "structural", 1094, "Structural: SIDESTEP only inside its eligibility."),
  clause("s7.mirror", "7", "the mirror guard on the slide direction and slide-sooner", "M5", "structural", 1094, "Structural: the mirror guard M5 on the slide direction and the slide-sooner rule."),
  clause("s7.informationArms", "7", "the literal 'no choice' and the registered-only read penalty", "proof:report", "structural", 1094, "The literal 'no choice' and the registered-only read penalty run as information arms."),
  // ADR-089:1096
  clause("s7.ratingProbes", "7", "sacks per dropback, any poise, awareness, agility or strength probe", "sack_rate", "graded", 1096, "Falsified if any poise or awareness probe (and now any agility or strength probe) raises sacks per dropback.", { hi: 0 }),
  clause("s7.stepUpSack", "7", "sacks after a step-up", "proof:no-sack-after-step-up", "structural", 1096, "Falsified if a sack follows a step-up on the horizon or the clock."),
  clause("s7.x3", "7", "the X3 permutation guard", "proof:x3-permutation", "structural", 1096, "Falsified if the X3 permutation guard fails."),
  clause("s7.falsifiers", "7", "step 7's falsifiers", "proof:ledger", "structural", 1096, "Withdrawn: 'sensing moves P2S without moving pressure'. Falsified also if pressure, sacks or hit-or-sack fall outside the bands above (s7.pressure, s7.sack, s7.hitOrSack)."),
];

const STEP8: readonly BandClause[] = [
  // ADR-089:1100 (8a)
  clause("s8a.flag", "8a", "the two-minute flag", "proof:two-minute-flag", "structural", 1100, "No two-minute flag outside the last two minutes of a half; falsified if one fires there."),
  clause("s8a.distance", "8a", "the goal-to-go distance", "proof:goal-to-go-distance", "structural", 1100, "No distance above the yards to the goal line, after a first down, a turnover or a change of possession; falsified if one exceeds it."),
  clause("s8a.q1q3", "8a", "the last two minutes of Q1 and Q3 against the rest: pass rate, throwaways and time to throw", "situation_q1q3_last_two", "graded", 1100,
    "The sim's last two minutes of the first and third quarters come within M9's filed tolerance of the rest of the game (real: pressured throwaways 8.94 against 8.51 in 100, time to throw 2.616 against 2.622 s); falsified if they stay outside it.",
    { direction: "UNCHANGED", tolerance: pend("M9", "M9's tolerance: 2 x the game-clustered bootstrap SE, the larger of the two seed sets (deviation O10)") }),
  clause("s8a.off", "8a", "every caller's stream under legacy", "proof:off-bytes", "structural", 1100, "Every caller's stream moves under pocket-1, as expected, and stays byte-identical under legacy (the OFF proof)."),
  // ADR-089:1104 (8b)
  clause("s8b.thirdDown", "8b", "third-down P2S minus early-down P2S, at 7-10 to go, goal-to-go excluded", "by_down_fixed_calls", "graded", 1104, "At a fixed 7-10 to go, goal-to-go excluded, third-down P2S at least 3 points above early downs (real 26.5 against 19.6). A miss is recorded and taken to the owner; it is not routed through the miss rule.", { lo: 3 }),
  clause("s8b.pressuredThrowawayByDown", "8b", "pressured throwaways, third down minus early downs, at 7-10 to go", "by_down_fixed_calls", "graded", 1104, "Pressured throwaways falling by down (real 9.7 / 6.0 / 2.7); only early against third is graded.", { direction: "DOWN" }),
  // ADR-089:1106
  clause("s8b.halfEnd.clean", "8b", "clean throwaways at the end of a half against the rest", "situation_end_of_half", "reported", 1106, "Reported by direction: clean throwaways above the rest (real about 2.5 times).", { direction: "UP" }),
  clause("s8b.halfEnd.pressured", "8b", "pressured throwaways at the end of a half against the rest", "situation_end_of_half", "reported", 1106, "Reported by direction: pressured throwaways higher (real 1.6 to 2.9 points).", { direction: "UP" }),
  clause("s8b.p2sBySituation", "8b", "each situation's P2S minus the rest's", "situation_end_of_half", "graded", 1106, "Falsifier: no situation's P2S more than 3 points from the rest (real within 1.2).", { lo: -3, hi: 3 }),
  clause("s8b.tttTrailing", "8b", "time to throw at the end of a half: (trailing minus the rest) minus (level or leading minus the rest)", "situation_end_of_half", "graded", 1106, "Falsifier: time to throw at the end of a half when trailing exceeds the rest by more than when level or leading (real +0.10 s against 0.00 s).", { direction: "UP" }),
  clause("s8b.centring", "8b", "the situation term over the league's mix", "proof:centring", "structural", 1106, "Structural: the term averages 0 over the league's situation mix (the centring)."),
  clause("s8b.patience", "8b", "what the situation term reads", "proof:never-reads-patience", "structural", 1106, "Structural: it never reads patience; the patience probe runs at fixed situations."),
];

const STEP9: readonly BandClause[] = [
  // ADR-089:1112
  clause("s9.blitz.p2s", "9", "P2S with at least one blitzer minus without", "row:p2s_by_blitz", "graded", 1112, "With at least one blitzer, P2S within 3 points of no blitz (real 21.3 against 22.4).", { lo: -3, hi: 3 }),
  clause("s9.blitz.pressure", "9", `pressure (${SIM_ONLY}) with at least one blitzer minus without`, "row:p2s_by_blitz", "graded", 1112, "Pressure 8 to 16 points higher with a blitzer (real +12.4).", { lo: 8, hi: 16 }),
  clause("s9.deep", "9", "P2S with three or more deep routes over P2S with none (ratio)", "row:p2s_by_deep_routes", "graded", 1112, "P2S with three or more deep routes at most twice the 0-deep figure (today 52.0 against 11.7).", { hi: 2 }),
  clause("s9.maxProtect", "9", "free rushers under max protect", "proof:max-protect", "structural", 1112, "Max protect never raises the free-rusher count."),
  clause("s9.doubleTeam", "9", "that lane's beat rate under a double team", "pbwr_sim_only", "reported", 1112, "Reported, direction only: a double team lowers that lane's beat rate.", { direction: "DOWN" }),
  clause("s9.chip", "9", "the edge beat time under a chip", "row:beat_time_by_lane", "reported", 1112, "Reported, direction only: a chip delays the edge beat.", { direction: "UP" }),
  clause("s9.drop", "9", `pressure (${SIM_ONLY}) under a deeper drop`, "threat_creation_rate", "reported", 1112, "Reported, direction only: a deeper drop raises pressure.", { direction: "UP" }),
];

const STEP10: readonly BandClause[] = [
  // ADR-089:1122-1126, the five fitted dials, declared (nothing else is fitted)
  clause("s10.dial.blockClock", "10", "the block clock's shape and scale", "hit_rate_by_release_bin", "structural", 1122, "Fitted to the shape of the hit-by-release curve (each curve divided by its own mean; aimed throws; raw seconds; D21's reading), fallback the pressured-by-release curve (D1), at 5b and re-run once at 10; blind to every sack row, the hit level, and the pressure rows unless the fallback is used (selectionRule)."),
  clause("s10.dial.b", "10", "the contest's sack boundary b", "sack_share_of_hit_or_sack", "structural", 1123, "Fitted to the league sack share of hit-or-sack, 44.6%, at step 10, on the whole contact population; blind to the hit-or-sack level; its reachable range is reported beside the fit and its grid is never widened to reach 44.6 (rules.bGrid)."),
  clause("s10.dial.b.range", "10", "b's reachable range", "sack_share_of_hit_or_sack", "reported", 1123, "On the continuous reading the stand-in ceiling, with every contact a sack, is a share of 24 to 36 (REPORTED, TOT §8.3).", { lo: 24, hi: 36 }),
  clause("s10.dial.deltas", "10", "the three read-system budget deltas", "release_distribution", "structural", 1124, "Fitted to the clean release shape (§2.2) at step 5a, blind to the league triple, with the owner's checklist running on the bench; the reset held at 1.0 s and reported alone (D33)."),
  clause("s10.dial.throwaway", "10", "the throwaway appeal", "throwaway_rate", "structural", 1125, "Fitted to 3.54% overall and 8.84% pressured at step 10, blind to the by-down rows; one appeal at four places; clean throwaways (1.25%) are its falsifier (acc.cleanThrowaways)."),
  clause("s10.dial.runFirst", "10", "RUN at the deadline, a baseline quarterback in a neutral situation", "proof:run-first-at-deadline", "structural", 1125, "RUN's base at the deadline moves with the fitted throwaway base by its filed margin (rules.runMargin), and a baseline quarterback must still rank RUN first there; a failure comes back to the owner."),
  clause("s10.dial.situation", "10", "the situation weights", "by_down_fixed_calls", "structural", 1126, "Fitted to pressured throwaways by down at 7-10 to go and the end-of-half throwaway rows (§2.4) at step 10; blind to P2S by down and by situation and time to throw by situation; one set at four places; centred (D35)."),
  // ADR-089:1128
  clause("s10.fittingOrder", "10", "the fitting order", "proof:fitting-order", "structural", 1128, "The fitting order filed at step 0 (fittingOrder): two passes at most; if the second pass would change the selection again, the design comes back to the owner."),
  // ADR-089:1130
  clause("s10.overlaps", "10", "hit-or-sack beside hits on thrown balls", "hit_or_sack_rate", "structural", 1130, "Fitting the sack share ties the sack rate and hit-or-sack into one prediction; the level of hits on thrown balls is a second, overlapping one, so the two are reported side by side."),
  // ADR-089:1132
  clause("s10.neverFitted", "10", "the free-run constants, D21 and L's crossing time", "proof:never-fitted", "structural", 1132, "Filed at step 0 and never fitted: the free-run constants (the snap rule under question 19's answer, the DELAYED wait of 0.5 s, the creeper's 3 yd/s; D18's conversion, get-off 0.35 s, reach 1.0 yd, edge bend 1.1, loop +0.5 yd) and the arrival reading (D21), with L's crossing time. The miss rule's n is measured on each arm, never chosen."),
];

const ACCEPTANCE: readonly BandClause[] = [
  // ADR-089:1134, graded at acceptance on the generated league (default D6)
  clause("acc.sack", "acceptance", "sacks, generated league", "sack_rate", "graded", 1134, "Sack rate 5.58 to 7.54.", { lo: 5.58, hi: 7.54 }),
  clause("acc.hitOrSack", "acceptance", "hit-or-sack, generated league", "hit_or_sack_rate", "graded", 1134, "Hit-or-sack 12.5 to 16.9.", { lo: 12.5, hi: 16.9 }),
  clause("acc.timeToThrow", "acceptance", "time to throw on FTN's clock (release_distribution), generated league", "release_distribution", "graded", 1134, "Time to throw 2.24 to 3.03 s (0.15 relative of 2.631, as the existing gates).", { lo: 2.24, hi: 3.03 }),
  clause("acc.timeToThrow.pooled", "acceptance", "time to throw against the pooled 2.682", "time_to_throw", "reported", 1134, "2.682's band, 2.28 to 3.08, is reported beside it.", { lo: 2.28, hi: 3.08 }),
  // ADR-089:1136-1162, the unfitted falsifiers (raw-second bins from releaseSeconds)
  clause("acc.ledger.widths", "acceptance", "the unfitted falsifiers' widths", "proof:ledger", "structural", 1136, "Each unfitted falsifier's band is INFERRED, filed at step 0, and may be tightened but never widened before the arm runs."),
  clause("acc.hitsOnThrown", "acceptance", "hits on aimed throws per dropback", "hit_rate_by_release_bin", "graded", 1140, "Hits on thrown balls per dropback (aimed) 5.0 to 9.5 (real 7.1).", { lo: 5.0, hi: 9.5 }),
  clause("acc.under2", "acceptance", "share of attempts released under 2.0 s", "release_distribution", "graded", 1141, "Time-to-throw shape: share of attempts under 2.0 s 18 to 34% (real 26.1%).", { lo: 18, hi: 34 }),
  clause("acc.over35", "acceptance", "share of attempts released at or over 3.5 s", "release_distribution", "graded", 1141, "Share at or over 3.5 s 10 to 22% (real 16.1%).", { lo: 10, hi: 22 }),
  clause("acc.pressuredCurve.bins", "acceptance", "pressured-by-release bins from 2.0 s on above twice FTN, raw seconds (binsAboveTwiceFtn)", "pressured_share_by_release_bin", "graded", 1142, "No bin from 2.0 s on above twice FTN (unless the curve is fitted by the fallback, when it is reported).", { hi: 0 }),
  clause("acc.pressuredCurve.rms", "acceptance", "pressured-by-release attempt-weighted RMS over the first five bins, raw seconds (curveRms)", "pressured_share_by_release_bin", "graded", 1142, "RMS over the first five bins at most 12 (real 9.0 to 72.6), unless fitted by the fallback.", { hi: 12 }),
  clause("acc.quick", "acceptance", "quick-pressure share of pressured dropbacks", "quick_pressure_share_by_origin", "graded", 1143, "30 to 55%: the direct check of question 4's clock, which WARNING 2 expects to miss.", { lo: 30, hi: 55 }),
  clause("acc.quickOrigin", "acceptance", "free rushers' share of quick pressures minus their share of all pressures", "quick_pressure_share_by_origin", "graded", 1144, "Free rushers' share of quick pressures above their share of all pressures (SIS direction).", { direction: "UP" }),
  clause("acc.scrambles", "acceptance", "scrambles per dropback", "scramble_rate", "graded", 1145, "Scrambles overall 3.5 to 7.0% (real 5.12).", { lo: 3.5, hi: 7.0 }),
  clause("acc.scrambles.pressured", "acceptance", "scrambles per pressured dropback", "row:scramble_rate_by_pocket", "graded", 1145, "Pressured 5 to 11% (real 7.89).", { lo: 5, hi: 11 }),
  clause("acc.scrambles.clean", "acceptance", "scrambles per clean dropback", "row:scramble_rate_by_pocket", "graded", 1145, "Clean 2.5 to 5.5% (real 3.92); the clean band now exercised by clean break-outs.", { lo: 2.5, hi: 5.5 }),
  clause("acc.cleanThrowaways", "acceptance", "throwaways per clean dropback", "throwaway_rate_clean", "graded", 1146, "Clean throwaways at most 2.5% (0 in the pocket by construction; real 1.25%).", { hi: 2.5 }),
  clause("acc.cleanOutOfPocket", "acceptance", "clean out-of-pocket per 100 clean dropbacks", "clean_outs_rate", "graded", 1147, "6 to 16 (real 10.63).", { lo: 6, hi: 16 }),
  clause("acc.contactsInOut", "acceptance", "sack share of contacts, in the pocket minus out of it", "sack_share_of_contacts_in_out", "graded", 1148, "Within 5 points of each other (real 45.5 / 43.9).", { lo: -5, hi: 5 }),
  clause("acc.failedScrambles", "acceptance", "failed scrambles as a share of sacks", "row:failed_scramble_share_of_sacks", "graded", 1149, "5 to 15% (real 10%, SIS).", { lo: 5, hi: 15 }),
  clause("acc.thirdDown", "acceptance", "third-down P2S minus early-down P2S, 7-10 to go", "by_down_fixed_calls", "graded", 1150, "Third-down P2S at least 3 points above early downs (real 26.5 against 19.6).", { lo: 3 }),
  clause("acc.p2sBySituation", "acceptance", "each situation's P2S minus the rest's", "situation_end_of_half", "graded", 1151, "No situation more than 3 points from the rest (real within 1.2).", { lo: -3, hi: 3 }),
  clause("acc.tttTrailing", "acceptance", "time to throw at the end of a half: (trailing minus the rest) minus (level or leading minus the rest)", "situation_end_of_half", "graded", 1152, "Trailing exceeds the rest by more than level or leading does (real +0.10 s against 0.00 s).", { direction: "UP" }),
  clause("acc.q1q3", "acceptance", "the last two minutes of Q1 and Q3 against the rest", "situation_q1q3_last_two", "graded", 1153, "Within M9's filed tolerance of the rest (step 8a); real: indistinguishable from the rest.",
    { direction: "UNCHANGED", tolerance: pend("M9", "M9's tolerance, as s8a.q1q3") }),
  clause("acc.blitz.p2s", "acceptance", "P2S with at least one blitzer minus without", "row:p2s_by_blitz", "graded", 1154, "Blitz against no blitz: P2S within 3 points (real 21.3 / 22.4).", { lo: -3, hi: 3 }),
  clause("acc.blitz.pressure", "acceptance", `pressure (${SIM_ONLY}) with at least one blitzer minus without`, "row:p2s_by_blitz", "graded", 1154, "Pressure 8 to 16 higher (real +12.4).", { lo: 8, hi: 16 }),
  clause("acc.deep", "acceptance", "P2S with 3+ deep routes over P2S with none (ratio)", "row:p2s_by_deep_routes", "graded", 1155, "3+ deep P2S at most twice 0-deep.", { hi: 2 }),
  clause("acc.qbSpread", "acceptance", "QB-season P2S true spread, pp", "qb_season_spread", "graded", 1156, "QB-season P2S spread 2.5 to 4.5 pp, pass or fail (default D4; real 3.56).", { lo: 2.5, hi: 4.5 }),
  clause("acc.defenceSpread", "acceptance", "defence-season P2S spread, pp", "defence_season_spread", "graded", 1156, "Defence spread at most 1 pp (real 0).", { hi: 1 }),
  clause("acc.targetShare.rb", "acceptance", "RB target share", "row:target_share_by_position", "graded", 1157, "RB target share at most 20.6%; watched closely, because more checkdowns may push the back's share up.", { hi: 20.6 }),
  clause("acc.targetShare.wr", "acceptance", "WR target share", "row:target_share_by_position", "reported", 1157, "WR rising toward 50.8 to 68.7%.", { direction: "UP" }),
  clause("acc.completion", "acceptance", "completion per aimed throw minus base", "completion_per_aimed_throw", "graded", 1158, "A fall of more than 2 points fails (real 67.5%).", { lo: -2 }),
  clause("acc.intGuard", "acceptance", "INT per aimed throw by throw class, each class's rise over base minus its mix-predicted rise", "int_per_aimed_by_throw_class", "graded", 1159, "The interception guard, §8, read by throw class (default D28).", { hi: 0 }),
  clause("acc.liveWonRep.S", "acceptance", "share of the dropbacks with a live-WON_REP CLEAN tick that have exactly one (the beat tick), shape S under Follows", "clean_with_live_won_rep_dropbacks", "graded", 1160, "Under Follows with shape S: at least 99% of the dropbacks that have one have exactly one (the beat tick), the count reported, with PUSH reps counted apart because the window fills that tick for them.", { lo: 99 }),
  clause("acc.liveWonRep.push", "acceptance", "live-WON_REP CLEAN ticks of PUSH reps", "clean_with_live_won_rep_push_ticks", "structural", 1160, "PUSH reps counted apart; with shape L a band is filed from step 1's count before step 5b, by a named amendment."),
  clause("acc.entry104", "acceptance", "P2S when pressure is 25 to 35, against both real figures (22.02 and 15.46)", "pressure_to_sack", "reported", 1161, "P1(c), the entry-104 pattern: reported; pressure 25 to 35 with P2S under 12 against both real figures sends the design back to the owner before the flip (S theta 13 today shows it: 29.77 / 7.98).", { lo: 12 }),
  clause("acc.mirror", "acceptance", "the mirror guard", "M5", "structural", 1162, "Escape direction, slide direction and catches mirror within noise (deviation O10's rule)."),
  // ADR-089:1164, also scored
  clause("acc.also.entry170", "acceptance", "entry 170's keepable ordering", "row:entry_170_keepable_ordering", "structural", 1164, "Also scored: entry 170's keepable ordering (keep must beat no-outlet by most of the free-rusher share and must not sack more than base)."),
  clause("acc.also.adr077", "acceptance", "ADR-077's rows (a) to (c)", "row:adr_077_rows", "structural", 1164, "Also scored: ADR-077's rows (a) to (c)."),
  clause("acc.also.hotRoutes", "acceptance", "today's pre-snap hot routes, re-measured", "hot_route_rate", "structural", 1164, "Also scored: today's pre-snap hot routes re-measured (F3.5, reported)."),
  clause("acc.also.ladders", "acceptance", "the knownTruth ladders", "proof:known-truth-ladders", "structural", 1164, "Also scored: the knownTruth ladders (direction only until re-recorded, default D8)."),
  clause("acc.also.docConformance", "acceptance", "docConformance", "proof:doc-conformance", "structural", 1164, "Also scored: docConformance."),
  clause("acc.also.monotonicity", "acceptance", "the monotonicity probes", "proof:monotonicity-probes", "structural", 1164, "Also scored: the monotonicity probes, with question 11's exception for patience."),
  // ADR-089:1166, report rows that never pass or fail
  clause("acc.report.sackerEdge", "acceptance", "sacker mix: edge share of credited sacks", "sacker_mix", "reported", 1166, "The sacker mix against its CHOSEN band, edge 45 to 70 (D34); expected to miss on today's travel table; a finding, not a tuning target.", { lo: 45, hi: 70 }),
  clause("acc.report.sackerInterior", "acceptance", "sacker mix: interior share of credited sacks", "sacker_mix", "reported", 1166, "Interior 12 to 32 (today interior 82.5 to 91.2 depending on credit).", { lo: 12, hi: 32 }),
  clause("acc.report.sackerShift", "acceptance", "the out-of-pocket sacker shift by sign", "sacker_mix", "structural", 1166, "Reported: the out-of-pocket sacker shift by sign."),
  clause("acc.report.unblockedMen", "acceptance", "completely unblocked men per 100 dropbacks", "unblocked_men_per_100", "structural", 1166, "Reported: completely unblocked men per 100 dropbacks (the graded rows are the unblocked pressures and their share, under the miss rule)."),
  clause("acc.report.cleanInPocketThrowaways", "acceptance", "clean in-pocket throwaways per 100 clean dropbacks", "row:clean_throwaway_in_pocket", "reported", 1166, "Clean in-pocket throwaways, 0 by construction against a real 0.76 per 100 clean dropbacks.", { lo: 0, hi: 0 }),
  clause("acc.report.coverageSacks", "acceptance", "sacks after a clean expiry as a share of all sacks", "coverage_sack_rows", "reported", 1166, "The coverage-sack rows: sacks after a clean expiry as a share of sacks, against SIS's 13% coverage sacks plus part of its 10% failed scrambles.", { lo: 13, hi: 23 }),
  clause("acc.report.timeToSack", "acceptance", "mean time to sack", "coverage_sack_rows", "reported", 1166, "Mean time to sack against PFF's 3.8 s.", { lo: 3.8, hi: 3.8 }),
  clause("acc.report.cleanShares", "acceptance", "the clean checkdown, later-read and drill shares", "clean_checkdown_share", "structural", 1166, "Reported: the clean checkdown, later-read and drill shares (clean_checkdown_share, clean_later_read_share, clean_drill_share)."),
  clause("acc.report.readThrown", "acceptance", "read thrown", "row:read_thrown", "structural", 1166, "Reported: read thrown."),
  clause("acc.report.alarmContact", "acceptance", "the alarm mix and contact's branches", "M4", "structural", 1166, "Reported: the alarm mix (M4) and contact's branches (M6)."),
  clause("acc.report.bRange", "acceptance", "b's reachable range", "sack_share_of_hit_or_sack", "structural", 1166, "Reported: b's reachable range."),
  clause("acc.report.tttBeside", "acceptance", "time to throw beside every hit and sack figure", "proof:report", "structural", 1166, "Reported: the time to throw beside every hit and sack figure (report.ts refuses a report without it)."),
  // ADR-089:1168
  clause("acc.whatFailsMeans", "acceptance", "what fails means", "proof:ledger", "structural", 1168,
    "Acceptance fails if any graded row is outside its band on the generated league, or any falsifier is outside its filed band, or the interception guard is broken. Nothing is retuned to make a failed row pass without a new filed prediction. A miss is classed and taken to the owner by the miss rule. An accepted miss is still a miss: under option B the row stays failed in the ledger unless the owner rules by name that it passes."),
];

const MISS_RULE_CLAUSES: readonly BandClause[] = [
  // ADR-089:1172, the four free-run rows (the raw 2.0 s bin once the motion exists; unblocked at 5b and acceptance)
  clause("mr.bin20.raw", "acceptance", "pressured share of 2.0 s throws, raw seconds", "pressured_share_by_release_bin", "graded", 1172, "The 2.0 s bin at most twice FTN on the grid the step uses: raw seconds, limit 36.2, once the motion exists (5b and acceptance).", { hi: 36.2 }),
  clause("mr.unblockedPressures", "acceptance", "completely unblocked pressures per 100 dropbacks, at 5b and acceptance", "unblocked_pressures_per_100", "graded", 1172, "Completely unblocked pressures at most 14 per 100 dropbacks (a man on the free-run clock whose own arrival floor reached PRESSURE or worse while the ball was in his hand, each man counted once a play).", { hi: 14 }),
  clause("mr.unblockedShare", "acceptance", "their share of hit-or-sack, at 5b and acceptance", "unblocked_share_of_hit_or_sack", "graded", 1172, "Their share of hit-or-sack at most 40 in 100.", { hi: 40 }),
  clause("mr.unblockedMen", "acceptance", "completely unblocked men per 100 dropbacks", "unblocked_men_per_100", "structural", 1172, "Completely unblocked men per 100 dropbacks are reported beside them."),
  clause("mr.neverMoves", "acceptance", "what never moves on a miss", "proof:miss-rule", "structural", 1173, "What never moves on a miss (rules.missRule.neverMoves). No completely unblocked man is ever timed as a late block or by a uniform delay, whatever the row."),
  clause("mr.class", "acceptance", "the class split", "proof:miss-rule", "structural", 1174, "The class, by a split filed in advance and measured on the arm that missed (missRule.ts classifyMiss)."),
  clause("mr.class.supply", "acceptance", "class (i), supply", "pressured_share_2s_no_free_runner", "structural", 1175, "(i) Supply: the bin passes without a free runner but free runners are on more than (L - n)/(100 - n) of the 2.0 s throws (n from pressured_share_2s_no_free_runner, printed beside each arm); or the unblocked bands are exceeded; or the quick share fails while it passes with no free runner."),
  clause("mr.class.timing", "acceptance", "class (ii), timing", "quick_share_no_free_runner", "structural", 1176, "(ii) Timing: the bin fails without a free runner, the quick share fails with no free runner, or free runners arrive earlier than M8's table."),
  clause("mr.class.conversion", "acceptance", "class (iii), conversion", "hit_or_sack_rate", "structural", 1177, "(iii) Conversion: hit-or-sack in its band but sacks or the share short."),
  clause("mr.class.unclassed", "acceptance", "class (iv), unclassed", "proof:miss-rule", "structural", 1178, "(iv) Unclassed: a covered row misses with none of (i) to (iii) holding; where two classes hold on different rows, both are named."),
  clause("mr.options", "acceptance", "what happens next", "proof:miss-rule", "structural", 1179, "What happens next goes to the owner, never automatically, with the class and the options, each priced on two seed sets."),
  clause("mr.option.A", "acceptance", "option A", "proof:miss-rule", "structural", 1180, "A. A protection design, first as an information arm, then as its own design with its own petitions."),
  clause("mr.option.B", "acceptance", "option B", "proof:miss-rule", "structural", 1181, "B. Accept and report: a named, accepted miss; acceptance has not passed while it stands, unless the owner rules by name that it passes."),
  clause("mr.option.C", "acceptance", "option C", "proof:miss-rule", "structural", 1182, "C. The owner revisits who counts as completely unblocked (D19, reading (b), against reading (c)); reading (a) is never offered."),
  clause("mr.suppliers", "acceptance", "class (iii)'s next suppliers", "proof:miss-rule", "structural", 1184, "For a class (iii) miss the named next suppliers are, in order: question 8's rescoring (step 6); question 7's checklist at the deadline (step 6); the won-rep half of the alarm (step 7); step 8b's situation term."),
  clause("mr.stop", "acceptance", "the stop rule", "proof:miss-rule", "structural", 1185, "One pass of the options per step. If the chosen option misses again, the step stops and the design comes back to the owner."),
];

const GUARD: readonly BandClause[] = [
  // ADR-089:1289
  clause("guard.reported.intPerAttempt", "guard", "INT per attempt", "int_rate", "structural", 1289, "Reported in every arm, both leagues: INT per attempt."),
  clause("guard.reported.intPerAimed", "guard", "INT per aimed throw", "int_per_aimed_throw", "structural", 1289, "Reported in every arm, both leagues: INT per aimed throw."),
  clause("guard.reported.forced", "guard", "the forced-throw share", "forced_throw_share", "structural", 1289, "Reported in every arm, both leagues: the forced-throw share."),
  clause("guard.reported.intSource", "guard", "the INT-source mix", "int_source_mix", "structural", 1289, "Reported in every arm, both leagues: the INT-source mix."),
  clause("guard.reported.completion", "guard", "completion per attempt", "completion_pct", "structural", 1289, "Reported in every arm, both leagues: completion per attempt."),
  clause("guard.reported.completionAimed", "guard", "completion per aimed throw", "completion_per_aimed_throw", "structural", 1289, "Reported in every arm, both leagues: completion per aimed throw."),
  clause("guard.reported.intByClass", "guard", "INT per aimed throw by throw class", "int_per_aimed_by_throw_class", "structural", 1289, "Revision 2 adds: the same rows by throw class."),
  clause("guard.reported.completionByClass", "guard", "completion per aimed throw by throw class", "completion_per_aimed_by_throw_class", "structural", 1289, "Revision 2 adds: the same rows by throw class."),
  // ADR-089:1306, the additive mix rule (default D9)
  clause("guard.mix", "guard", "INT per aimed throw: the arm's rise over base minus the rise its release mix predicts (intGuard)", "int_per_aimed_throw", "graded", 1306,
    "In each arm, the rise in INT per aimed throw over base (same league, same seeds) may not exceed the rise the real per-aimed-throw INT rates predict for that arm's change in release mix, on the arm's own release clock. A rise beyond it stops the step and comes back to the owner with the numbers, including a second seed set.",
    { hi: 0 }),
  // ADR-089:1308, by throw class (default D28)
  clause("guard.byClass", "guard", "INT per aimed throw by throw class: each class's rise minus its own mix-predicted rise (intGuardByClass)", "int_per_aimed_by_throw_class", "graded", 1308,
    "The additive mix rule applied to each class separately (normal-bar pocket throws, rank-pushed, checkdowns, clean-expiry throws at 30, must-act desperation in a dirty pocket, throws on the run); a fall in one class never offsets a rise in another. A breach stops the step and goes to the owner with a second seed set.",
    { hi: 0 }),
  clause("guard.removedClass", "guard", "the removed class's count and the interceptions it carried", "int_per_aimed_by_throw_class", "structural", 1308, "The removed class is reported with its count and the interceptions it carried."),
  clause("guard.onTheRun.clean", "guard", "INT per aimed throw on the run, clean", "int_per_aimed_by_throw_class", "reported", 1308, "Throws on the run are also reported against the real out-of-pocket rate, 2.11% clean.", { lo: 2.11, hi: 2.11 }),
  clause("guard.onTheRun.pressured", "guard", "INT per aimed throw on the run, pressured", "int_per_aimed_by_throw_class", "reported", 1308, "Against the real 3.25% pressured.", { lo: 3.25, hi: 3.25 }),
];

/** Every filed clause, step by step. */
export const CLAUSES: readonly BandClause[] = Object.freeze([
  ...STEP1, ...STEP2, ...STEP3, ...STEP4, ...STEP5A, ...STEP5B, ...STEP6, ...STEP7, ...STEP8, ...STEP9, ...STEP10,
  ...ACCEPTANCE, ...MISS_RULE_CLAUSES, ...GUARD,
]);

/** The plan's completeness ranges (plan §7.2), in the C0 bytes. */
export const CLAUSE_LINE_RANGES: readonly (number | readonly [number, number])[] = Object.freeze([
  1005, 1007, 1009, 1015, 1017, 1027, 1028, [1036, 1043], 1049, 1051, 1053, 1063, 1075, [1077, 1084], 1092, 1094, 1096,
  1100, 1104, 1106, 1112, [1120, 1134], [1136, 1164], 1166, 1168, [1172, 1186], 1289, 1306, 1308,
]);

export function expandRanges(ranges: readonly (number | readonly [number, number])[]): readonly number[] {
  const out: number[] = [];
  for (const r of ranges) {
    if (typeof r === "number") out.push(r);
    else for (let l = r[0]; l <= r[1]; l++) out.push(l);
  }
  return out;
}

/** The completeness list: every line in the plan's ranges that holds a clause (ascending). */
export const CLAUSE_LINES: readonly number[] = Object.freeze([...new Set(CLAUSES.map((c) => c.adrLine))].sort((a, b) => a - b));

/** The lines in the plan's ranges that hold no clause, with why (pocketBands.test.ts checks each against the C0 bytes). */
export const LINES_WITHOUT_CLAUSE: Readonly<Record<number, "blank" | "table header" | "table separator" | "heading">> = Object.freeze({
  1037: "blank", 1038: "heading", 1039: "blank",
  1077: "heading", 1078: "blank",
  1120: "table header", 1121: "table separator", 1127: "blank", 1129: "blank", 1131: "blank", 1133: "blank",
  1137: "blank", 1138: "table header", 1139: "table separator", 1163: "blank",
  1183: "blank", 1186: "blank",
});

// --- the comparator check (entry 125; C3's adr089Comparators) --------------------------------------

/** Every problem with the clauses' comparators, given the registry's ids (`allMetrics().map(m => m.id)`). */
export function comparatorProblems(clauses: readonly BandClause[], metricIds: ReadonlySet<string>): readonly string[] {
  const constructs = new Set<string>(CONSTRUCT_IDS);
  const problems: string[] = [];
  for (const c of clauses) {
    const id = c.comparator;
    if (id.startsWith("proof:")) {
      if (PROOFS[id] === undefined) problems.push(`${c.id}: ${id} is not a filed proof`);
      if (c.kind !== "structural") problems.push(`${c.id}: a proof comparator (${id}) is allowed on a structural clause only`);
    } else if (id.startsWith("row:")) {
      if (FUTURE_ROWS[id] === undefined) problems.push(`${c.id}: ${id} is not a filed future row`);
    } else if (!metricIds.has(id) && !constructs.has(id)) {
      problems.push(`${c.id}: ${id} is neither an allMetrics() id nor a constructs.ts id (entry 125)`);
    }
    const retired = RETIRED_REAL_SIDES[id];
    if (retired !== undefined && !c.row.includes(SIM_ONLY)) problems.push(`${c.id}: ${id}'s ${retired}, so the clause must compare sim with sim ("${SIM_ONLY}")`);
  }
  return problems;
}

// --- step 5b's bands, re-derived (ADR-089:1061-1063; CM T20) ----------------------------------------

/** One later step's filed contribution to a 5b row: a range (a point where lo = hi). */
export interface Contribution {
  readonly step: string;
  readonly what: string;
  readonly lo: number;
  readonly hi: number;
  readonly adrLine: number;
}

export const midpoint = (c: Contribution): number => (c.lo + c.hi) / 2;

/** The contributions after 5b (ADR-089:1063). Step 6's side-aware drill is unpriced (risk R30) and taken at 0; step 8b is centred. */
export const FIVE_B_CONTRIBUTIONS: Readonly<Record<"sack_rate" | "hit_or_sack_rate", readonly Contribution[]>> = Object.freeze({
  sack_rate: [
    { step: "6", what: "the rescoring", lo: 0.3, hi: 1.0, adrLine: 1063 },
    { step: "6", what: "the side-aware catch", lo: 0.24, hi: 0.24, adrLine: 1063 },
    { step: "6", what: "the caught escape as contact", lo: -1.0, hi: -0.5, adrLine: 1063 },
    { step: "7", what: "the alarm, sight and the slide", lo: 0.5, hi: 2.5, adrLine: 1094 },
    { step: "8b", what: "the situation term, centred", lo: 0, hi: 0, adrLine: 1063 },
  ],
  hit_or_sack_rate: [
    { step: "6", what: "the rescoring (each also a hit-or-sack)", lo: 0.3, hi: 1.0, adrLine: 1063 },
    { step: "6", what: "the side-aware catch", lo: 0.32, hi: 0.32, adrLine: 1063 },
    { step: "6", what: "the caught escape as contact", lo: -1.0, hi: -0.5, adrLine: 1063 },
    { step: "7", what: "the alarm, sight and the slide", lo: -4, hi: 1, adrLine: 1094 },
    { step: "8b", what: "the situation term, centred", lo: 0, hi: 0, adrLine: 1063 },
  ],
});

/** Acceptance's graded bands (ADR-089:1134). */
export const ACCEPTANCE_BANDS: Readonly<Record<"sack_rate" | "hit_or_sack_rate", Interval>> = Object.freeze({ sack_rate: [5.58, 7.54], hit_or_sack_rate: [12.5, 16.9] });

/**
 * Revision 1's method (ADR-089:1061): acceptance's band shifted down by the sum of the later steps'
 * midpoints, so it keeps acceptance's width; beside it the full interval, acceptance minus every
 * combination of the contributions. `filed` rounds the shifted band to 0.1.
 */
export function derive5b(acceptance: Interval, contributions: readonly Contribution[]): { readonly shift: number; readonly derived: Interval; readonly filed: Interval; readonly fullInterval: Interval } {
  const shift = round(contributions.reduce((s, c) => s + midpoint(c), 0), 6);
  const sumLo = contributions.reduce((s, c) => s + c.lo, 0);
  const sumHi = contributions.reduce((s, c) => s + c.hi, 0);
  const derived: Interval = [round(acceptance[0] - shift, 6), round(acceptance[1] - shift, 6)];
  return {
    shift,
    derived,
    filed: [round(derived[0], 1), round(derived[1], 1)],
    fullInterval: [round(acceptance[0] - sumHi, 6), round(acceptance[1] - sumLo, 6)],
  };
}

function fiveBRow(row: "sack_rate" | "hit_or_sack_rate"): FiveBRow {
  const contributions = FIVE_B_CONTRIBUTIONS[row];
  const d = derive5b(ACCEPTANCE_BANDS[row], contributions);
  return {
    acceptance: ACCEPTANCE_BANDS[row],
    contributions: contributions.map((c) => ({ step: `${c.step}: ${c.what} (${String(c.lo)} to ${String(c.hi)}; midpoint ${String(round(midpoint(c), 6))})`, value: round(midpoint(c), 6), adrLine: c.adrLine })),
    derived: d.derived,
    filed: d.filed,
    fullInterval: d.fullInterval,
  };
}

export const FIVE_B: FiledFiveB = { adrLine: 1063, rows: { sack_rate: fiveBRow("sack_rate"), hit_or_sack_rate: fiveBRow("hit_or_sack_rate") } };

// --- §8's guard: the additive mix rule (default D9, D28) ---------------------------------------------

export type GuardClock = "TICK" | "RAW";

/** A class's (or the league's) aimed throws by release bin, and its interceptions. */
export interface IntMix {
  /** Aimed throws by release bin (RELEASE_BINS order). */
  readonly aimedByBin: readonly number[];
  readonly interceptions: number;
}

const total = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

/**
 * The rise in INT per aimed throw (points) that the real per-aimed-throw rates predict for a change
 * of release mix from `base` to `arm`: sum_i (arm share_i - base share_i) * real rate_i, on the
 * arm's own release clock (tick-aligned rates while release is the decision tick, raw after).
 */
export function mixPredictedRise(baseAimedByBin: readonly number[], armAimedByBin: readonly number[], clock: GuardClock): number {
  const rates = clock === "TICK" ? REAL.intPerAimedTick : REAL.intPerAimedRaw;
  if (baseAimedByBin.length !== RELEASE_BINS.length || armAimedByBin.length !== RELEASE_BINS.length) throw new Error("mixPredictedRise: a mix has one count per release bin");
  const nb = total(baseAimedByBin);
  const na = total(armAimedByBin);
  if (!(nb > 0) || !(na > 0)) throw new Error("mixPredictedRise: each mix needs at least one aimed throw");
  let rise = 0;
  for (let i = 0; i < RELEASE_BINS.length; i++) rise += (armAimedByBin[i]! / na - baseAimedByBin[i]! / nb) * rates[i]!;
  return rise;
}

export interface GuardVerdict {
  readonly baseRate: number;
  readonly armRate: number;
  readonly rise: number;
  readonly allowed: number;
  readonly passes: boolean;
}

/** D9's additive mix rule on one population: the rise over base may not exceed the mix-predicted rise. */
export function intGuard(base: IntMix, arm: IntMix, clock: GuardClock): GuardVerdict {
  const baseRate = (100 * base.interceptions) / total(base.aimedByBin);
  const armRate = (100 * arm.interceptions) / total(arm.aimedByBin);
  const rise = armRate - baseRate;
  const allowed = mixPredictedRise(base.aimedByBin, arm.aimedByBin, clock);
  return { baseRate, armRate, rise, allowed, passes: rise <= allowed };
}

/** D28's aimed throw classes (ADR-089:1308): THROW_CLASSES without THROWAWAY, SCRAMBLE and SACK. */
export const GUARD_CLASSES: readonly ThrowClass[] = THROW_CLASSES.filter((c) => c !== "THROWAWAY" && c !== "SCRAMBLE" && c !== "SACK");

export type ClassGuardVerdict =
  | ({ readonly status: "SCORED" } & GuardVerdict)
  | { readonly status: "REMOVED"; readonly baseThrows: number; readonly baseInterceptions: number }
  | { readonly status: "NO_BASE"; readonly armThrows: number; readonly armInterceptions: number };

/**
 * D28: the additive mix rule applied to each class separately; a fall in one class never offsets a
 * rise in another, so the arm passes only if every scored class passes. A class with base throws and
 * none in the arm is REMOVED (reported with its count and the interceptions it carried). A class
 * with arm throws and no base throws (clean-expiry throws are empty until 5a) is NO_BASE: the
 * design gives no base to rise over, so it is reported, not scored.
 */
export function intGuardByClass(
  base: Readonly<Partial<Record<ThrowClass, IntMix>>>,
  arm: Readonly<Partial<Record<ThrowClass, IntMix>>>,
  clock: GuardClock,
): { readonly byClass: Readonly<Partial<Record<ThrowClass, ClassGuardVerdict>>>; readonly passes: boolean } {
  const byClass: Partial<Record<ThrowClass, ClassGuardVerdict>> = {};
  let passes = true;
  for (const cls of GUARD_CLASSES) {
    const b = base[cls];
    const a = arm[cls];
    const nb = b === undefined ? 0 : total(b.aimedByBin);
    const na = a === undefined ? 0 : total(a.aimedByBin);
    if (nb > 0 && na > 0) {
      const v = intGuard(b!, a!, clock);
      byClass[cls] = { status: "SCORED", ...v };
      if (!v.passes) passes = false;
    } else if (nb > 0) {
      byClass[cls] = { status: "REMOVED", baseThrows: nb, baseInterceptions: b!.interceptions };
    } else if (na > 0) {
      byClass[cls] = { status: "NO_BASE", armThrows: na, armInterceptions: a!.interceptions };
    }
  }
  return { byClass, passes };
}

// --- the M1 bound and step 3's check -----------------------------------------------------------------

export const M1_BOUND: FiledM1Bound = {
  definition: "B1 = E + 3 * SD, with E = sum P and SD = sqrt(sum P(1 - P)) over dropbacks (deviation O1); the hard bound H = the number of such dropbacks; B1 in points = 100 * B1 / dropbacks",
  E: pend("M1", "the expected count of dropbacks the window adds"),
  SD: pend("M1", "its standard deviation"),
  B1: pend("M1", "E + 3 * SD"),
  H: pend("M1", "dropbacks with a 1-14 POWER rep released at 1.0 s or later"),
  dropbacks: pend("M1", "the corpus's dropbacks, the denominator of B1 in points"),
  margins1to4: pend("M1", "E, SD, B1 and H for margins 1 to 4, counted apart"),
  margins5to14: pend("M1", "E, SD, B1 and H for margins 5 to 14"),
  uses: [
    { step: "1", adrLine: 1007, text: "Step 1's falsifier: the window alone moves pressure by at most B1 (in points), and sacks by at most 0.3 (s1.window.pressure, s1.window.sack)." },
    { step: "1", adrLine: 1007, text: "The S band's upper pressure edge, raised by B1 in points: 40 + B1 (s1.S.pressure)." },
    { step: "5b", adrLine: 1063, text: "5b's upper pressure edge, raised by B1 in points: 42 + B1 (s5b.pressure)." },
  ],
};

export const STEP3_CHECK: FiledStep3Check = {
  adrLines: [1025, 1027, 1028],
  part1:
    "The build does what the design says (this step's falsifier; a failure is a build fault): every free runner's published etaTick " +
    "equals M8's function (deviation O2) for his snap row, ratings and drop, applied to that play's own PLAY_START and snapshot, to " +
    "the tenth, by origin and snap row, under question 19's answer (Wait) and with the Mug arm off; a faster or quicker-accelerating " +
    "man is never later; a deeper drop never brings him sooner; the same seed gives the same stream; the mirror guard holds " +
    "(s3.part1.*). The base table is not the check: games diverge from step 1, so the step-3 stream's free runners are not the base seasons' men.",
  part2:
    "The real rows, on the pricing arm and the design build, reported against their bands, a miss going to the owner under the " +
    "miss rule: the 2.0 s tick bin (limit 29.4), hit-or-sack, the quick-pressure share (30 to 55) and its origin, completely " +
    "unblocked pressures per 100 dropbacks (at most 14) and their share of hit-or-sack (at most 40 in 100), with completely " +
    "unblocked men per 100 dropbacks reported beside them (s3.*). A late block, a uniform delay or a refit of the free-run " +
    "constants is never offered for a man nobody touched.",
};

// --- the prediction (plan §9) ------------------------------------------------------------------------

export const PREDICTION: FiledPrediction = {
  a: [
    { id: "a.digests", adrLine: 995, text: "Every stream digest is unchanged: the 28 golden folds (canonical and byte, v1 to v7, two leagues), the per-game lists behind them (test/fixtures/adr089-golden.json), and the existing callerV* stream tests still pass.", value: { folds: 28, perGameHashes: 1400 } },
    { id: "a.season-path", adrLine: 995, text: "The season path's pins are unchanged: per-game folds 4575469e / 7122fc33, first-50 folds 20964c10 / 33c89b04, run 4d13549c.", value: { canonicalFold: "fnv1a:4575469e", byteFold: "fnv1a:7122fc33", first50CanonicalFold: "fnv1a:20964c10", first50ByteFold: "fnv1a:33c89b04", run: "fnv1a:4d13549c" } },
    { id: "a.census", adrLine: 995, text: "docConformance is still fnv1a:365da48d, and tunablesDigest is still fnv1a:395a9ae2.", value: { pathDigest: "fnv1a:365da48d", tunablesDigest: "fnv1a:395a9ae2" } },
    { id: "a.baseline-0009", adrLine: 995, construct: "threat_creation_rate", text: "baseline-0009 reproduces on its 496 games: 86.85 / 20.05 / 16.43 / 1.242 (pressure / hit-or-sack / sack / release), all 35 old sim values identical, the identity identical except engineCommit, with no engineRules key.", value: { pressure: 86.85, hitOrSack: 20.05, sack: 16.43, release: 1.242, simValues: 35 } },
    { id: "a.gen-base", adrLine: 995, text: "The gen base is 85.26 / 24.04 / 16.72 / 1.235.", value: { pressure: 85.26, hitOrSack: 24.04, sack: 16.72, release: 1.235 } },
    { id: "a.ladders", adrLine: 1389, text: "The knownTruth ladders pass unchanged (they run in pnpm verify)." },
  ],
  b: [
    { id: "b.m4", construct: "M4", adrLine: 978, text: "M4's two-rushers share: 6,395 of 21,962 first non-clean ticks (29.1%) on gen, by TM's cause rule (the naive construct's 36.3% printed beside it).", value: { numerator: 6395, denominator: 21962, percent: 29.1 } },
    { id: "b.clean-bench-nobody-open", construct: "nobody_open_share", adrLine: 964, text: "The clean bench's nobody-open share and split: gen 30.2% (8,631 of 28,588): desperation 10.1, checkdowns 8.9, throwaways 11.1; flat 43.6% (23,064 of 52,882): 6.8, 16.2, 20.6.", value: { gen: { share: 30.2, desperation: 10.1, checkdowns: 8.9, throwaways: 11.1 }, flat: { share: 43.6, desperation: 6.8, checkdowns: 16.2, throwaways: 20.6 } } },
    { id: "b.m3", construct: "M3", adrLine: 977, text: "M3 on gen: same-tick arrivals split 0.5 gives interior 86.9 / edge 8.6 / off-ball 4.4; unsplit interior 82.5; 1,110 sacks with same-tick arrivals (MEASURED at e23bf69: reproduce).", value: { split: { interior: 86.9, edge: 8.6, offBall: 4.4 }, unsplitInterior: 82.5, splitSacks: 1110 } },
    { id: "b.first-pressure", construct: "first_pressure_seconds", adrLine: 91, text: "First PRESSURE-or-worse means 0.877 s flat and 0.883 s gen (MEASURED at e23bf69: reproduce).", value: { flat: 0.877, gen: 0.883 } },
    { id: "b.live-won-rep", construct: "clean_with_live_won_rep_ticks", adrLine: 962, text: "Ticks with a live WON_REP threat and a CLEAN pocket: 60 on 57 dropbacks flat, 30 on 29 gen (MEASURED at e23bf69: reproduce).", value: { flat: { ticks: 60, dropbacks: 57 }, gen: { ticks: 30, dropbacks: 29 } } },
    { id: "b.unblocked-men", construct: "unblocked_men_per_100", adrLine: 1028, text: "18.1 completely unblocked men per 100 dropbacks on base gen.", value: 18.1 },
    { id: "b.won-rep-origin", construct: "first_pressure_origin", adrLine: 98, text: "Won reps start 62% of first-pressure ticks on gen (TM).", value: 62 },
    { id: "b.entry-107", construct: "multi_channel_share", adrLine: 962, text: "Entry 107's deciding-instant multi-channel share, 79.94% on the 496-game flat corpus.", value: 79.94 },
    { id: "b.cp-classes", construct: "int_per_aimed_by_throw_class", adrLine: 1304, text: "CP's class figures on the gen clean bench: desperation throws intercepted 19.0%; rank-pushed throws 16.3% of throws at 20.9% INT; throws after an escape on gen base intercepted 17.1%.", value: { desperationInt: 19.0, rankPushedShare: 16.3, rankPushedInt: 20.9, afterEscapeInt: 17.1 } },
    { id: "b.tm-399", construct: "M2", adrLine: 1017, text: "TM's 399 of 14,627 edge won-rep threats whose travel is 2.5 s or more under S, if M2's S construct matches.", value: { numerator: 399, denominator: 14627 } },
  ],
  c: [
    { id: "c.legacy-free-run", text: "The legacy free-run restatement equals every free runner's published etaTick (5 gen golden games always; all 50 gated).", construct: "M8" },
    { id: "c.free-run-tables", adrLine: 588, text: "§4.4.4 and §4.4.5 reproduced: top speeds 9.17 / 10.05 / 10.80 and 40s 5.15 / 4.76 / 4.48; all nine rated rows to 0.01 s; the loop 1.87 / 2.10 (the creeper reported; inputs not filed).", construct: "M8" },
    { id: "c.jitter", text: "The jitter formula reproduces every published pass_rush_tick margin on 5 golden games, exactly.", construct: "M2" },
    { id: "c.clean-bench", adrLine: 969, text: "The clean bench's four decimals: flat 1.6634 s and 20.625% throwaways, gen 1.7992 s and 11.127%, with no pressure and no sacks.", construct: "clean_bench", value: { flat: { release: 1.6634, throwaways: 20.625 }, gen: { release: 1.7992, throwaways: 11.127 }, pressured: 0, sacks: 0 } },
    { id: "c.closed-forms", text: "The closed forms: L's crossing time; b (0.456 at b = 5, 0.505 at b = 0); 5b (3.94-5.90 and 13.78-18.18, full intervals 2.34-7.50 and 10.68-21.28); the miss rule ((L - n)/(100 - n) = 5.87, 14.93, 23.4); Δ = 10.", value: { b5: 0.456, b0: 0.505, delta: 10 } },
    { id: "c.selection-loss", adrLine: 173, text: "The selection loss between §2.2's two real hit curves on their printed bins is 0.0034, against K1's REPORTED 0.0035.", value: 0.0034 },
  ],
};

// --- the constants (plan §7.2 `constants`; C3's adr089Comparators checks the code's equal these) ---------

const k = (value: JsonValue, adrLine: number, unit?: string): FiledConstant => (unit === undefined ? { value, adrLine } : { value, adrLine, unit });

export const CONSTANTS: Readonly<Record<string, FiledConstant>> = Object.freeze({
  "freeRun.fortyYards": k(40, 584, "yards"),
  "freeRun.fortyIntercept": k(5.6, 582, "seconds"),
  "freeRun.fortySpeedSlope": k(1.38, 582, "seconds per 99 points of Speed"),
  "freeRun.fortySpeedScale": k(99, 582, "points"),
  "freeRun.tauIntercept": k(0.77, 583, "seconds"),
  "freeRun.tauSlope": k(0.007, 583, "seconds per point of Acceleration - Speed"),
  "freeRun.tauMin": k(0.63, 583, "seconds"),
  "freeRun.tauMax": k(0.91, 583, "seconds"),
  "freeRun.pathShortenYards": k(1.0, 595, "yards (the reach)"),
  "freeRun.edgePathFactor": k(1.1, 595),
  "freeRun.loopExtraYards": k(0.5, 595, "yards"),
  "freeRun.getOffSeconds": k(0.35, 586, "seconds (0 for a man already moving)"),
  "freeRun.delayedSeconds": k(0.5, 596, "seconds"),
  "freeRun.etaRoundingSeconds": k(0.1, 596, "seconds"),
  "freeRun.creeperYardsPerSecond": k(3.0, 574, "yards per second"),
  "snap.answer": k("WAIT", 5),
  "snap.downLinemanDepthYards": k(1.0, 569, "yards"),
  "snap.gapWidthYards": k({ A: 0.75, B: 2.25, C: 3.75, D: 5.25 }, 565, "yards from the centre"),
  "snap.edgeExtraWidthYards": k(0.75, 565, "yards"),
  "snap.tableNow": k({
    informationOnly: "question 19 was answered Wait: only the down lineman's row is built (M8); the rest is information",
    downLineman: { depth: 1.0, width: "his gap", edgeExtra: 0.75, start: "reacts to the snap", adrLine: 569 },
    linebackerWalkedUp: { depth: 2.5, width: "his gap", disguises: ["STANDARD", "ZERO"], start: "reacts", adrLine: 570 },
    linebackerDisguised: { depth: 4.5, width: "his gap", disguises: ["ZONE_BLITZ", "DELAYED", "the creeper"], start: "reacts; DELAYED waits +0.5 s", adrLine: 571 },
    linebackerOnTheEdge: { depth: 1.5, width: "D + 0.75", start: "reacts", adrLine: 572 },
    slotCorner: { depth: 5.0, width: 7.0, start: "reacts; DELAYED +0.5 s", adrLine: 573 },
    safetyCreeping: { depth: 7.0, width: 3.0, start: "already moving at 3 yd/s, no reaction", adrLine: 574 },
    mugArm: { depth: 1.5, width: "his gap (the A gap's 0.75 in §4.4.5)", start: "reacts", informationArmOnly: true, adrLine: 606 },
  }, 567, "yards; depth off the ball, width from the centre"),
});

// --- the base block, the M block, the census, the context ---------------------------------------------

const json = <T>(x: T): JsonValue => JSON.parse(JSON.stringify(x)) as JsonValue;

/** The new rows whose base values C3 fills: S2's registry rows and S3's pocket report rows. */
export const BASE_ROW_IDS: readonly string[] = CONSTRUCTS.filter((c) => c.home === "registry" || c.home === "pocket-row").map((c) => c.id);

export const M_NOTES: Readonly<Record<MId, string>> = Object.freeze({
  M1: "E, SD, B1 = E + 3 SD and H, margins 1-4 and 5-14 apart, per league (fills m1Bound and the clauses' B1 edges)",
  M2: "the counter-forced share of forced decisions by alignment and position: today's, under S and under L at R = 5 and R = 8 (engine-free, first-order), with the censored share",
  M3: "the credited sacker by position and origin, same-tick arrivals split 0.5, against D34's band (reported), sim and real",
  M4: "first registrations by approach, and the multi-cause share by TM's cause rule (the naive rule beside it)",
  M5: "mirrored against unmirrored runs, both seed sets and both leagues: the escape CAUGHT rate, the no-side share and how often the looper rule moves a side",
  M6: "the upper bound (no-target arrivals with a broken receiver), then FIGHT against THROWAWAY by approach and down at today's appeals",
  M7: "the pocket_sense margin by from-class over the league's quarterbacks, the target and the NEVER share",
  M8: "every free runner on both base seasons (set 1) by origin, snap row and position: Wait built, Table now beside it as information with and without the Mug arm; the down-lineman key's disagreements with the personnel family and the depth class",
  M9: "pass rate, throwaways and time to throw in the last two minutes of Q1 and Q3 against Q2/Q4 and the rest, both seed sets; the tolerance: 2 x the game-clustered bootstrap SE (1,000 resamples, seeded adr-089:m9), the larger of the two sets",
});

/** The step-0 filing, as S4 writes it: every M-derived field pending, everything else filed. */
export function step0Filing(): FiledFile {
  return json({
    format: FILED_FORMAT,
    adr: "ADR-089",
    step: 0,
    base: {
      commit: "e23bf69",
      caller: "v7",
      corpora: CORPORA,
      golden: {
        definitions: {
          canonicalPerGame: "stableDigest of the game's {at, event} list (harness/digest.ts), as callerV7Stream.test.ts digests a stream",
          bytePerGame: "FNV-1a over the UTF-16 code units of JSON.stringify of the same list (deviation O15)",
          fold: "stableDigest of the 50 per-game digests, in fixture order",
          wholeCanonical: "stableDigest of all 50 streams at once: recorded, not built in the suite",
          strip: "GOLDEN_STRIP is empty at step 0; an entry is added only by a named ADR's own commit (risk K11)",
          perGameLists: "test/fixtures/adr089-golden.json",
        },
        pins: GOLDEN_PINS,
        seasonPath: SEASON_PATH_PINS,
      },
      rows: Object.fromEntries(BASE_ROW_IDS.map((id) => [id, { pending: "BASE", note: "the flat and gen base values on seed set 1 at e23bf69" }])),
    },
    prediction: PREDICTION,
    selectionRule: FILED_SELECTION_RULE,
    fittingOrder: FILED_FITTING_ORDER,
    bands: { clauses: CLAUSES, clauseLines: CLAUSE_LINES },
    fiveB: FIVE_B,
    m1Bound: M1_BOUND,
    step3Check: STEP3_CHECK,
    constants: CONSTANTS,
    rules: {
      arrivalReading: FILED_ARRIVAL_READING,
      lCrossingTime: FILED_L_CROSSING_TIME,
      lateBlock: FILED_LATE_BLOCK,
      missRule: FILED_MISS_RULE,
      bGrid: FILED_B_GRID,
      runMargin: FILED_RUN_MARGIN,
      unblockedBands: FILED_UNBLOCKED_BANDS,
    },
    M: Object.fromEntries(M_IDS.map((m) => [m, { pending: m, note: M_NOTES[m] }])),
    census: { pathDigest: "fnv1a:365da48d", tunablesDigest: "fnv1a:395a9ae2" },
    context: {
      sLateArm: {
        adrLine: 991,
        text: "The S late arm re-measured on a second seed set, context only: no longer a gate, because that arm is the uniform delay the owner's words replaced. It runs at step 1, once shape S exists (deviation O19).",
        seedSet: 2,
        runAtStep: "1",
      },
    },
  }) as unknown as FiledFile;
}

/** Where the committed filing lives, relative to the calibration package. */
export const FILED_PATH = "reports/adr-089-step0.filed.json";
