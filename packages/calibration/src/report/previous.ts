/**
 * THE PREDECESSOR baseline-0002 DID NOT HAVE, RECONSTRUCTED — AND THE GAP THAT MADE IT NECESSARY.
 *
 * `baselineTool.test.ts` writes a markdown artefact when `FF_BASELINE_OUT` names one, and the
 * first baseline run wrote nothing else. So the numbers baseline-0001 produced survive only in
 * `docs/decisions/CALIBRATION-BACKLOG.md`, in prose, and only for the rows somebody happened to
 * argue about. **A report whose successor cannot read it has no trend column**, which is precisely
 * the slot `baseline.ts` says it created "from report one" so that nobody would build tooling
 * against a column that appears late.
 *
 * This module is that gap, closed in the only honest way available after the fact: every figure
 * below is quoted from a line of the backlog, with the line named. It is a RECONSTRUCTION and it
 * behaves like one:
 *
 *  - Only rows the backlog actually recorded are present. There is no interpolation and no
 *    "roughly". A metric baseline-0001 measured and nobody wrote down simply has no predecessor,
 *    and its trend cell prints `—`, which is true.
 *  - `comfortableStreak` is EMPTY, deliberately, and this is the load-bearing refusal. A ratchet
 *    is a permanent one-way tightening of a band (`ratchetBand` cannot widen), and §10.1's
 *    rising floor should rest on two serialised reports rather than on one serialised report and
 *    one paragraph. A reconstructed predecessor may inform a trend arrow; it may not tighten a
 *    gate.
 *
 * The recurrence is prevented rather than only regretted: the tool now writes
 * `<out>.carry-forward.json` beside the markdown, and `FF_BASELINE_PREV` reads it. The next
 * report will not need this file.
 */
import type { PreviousReport } from "./baseline.js";

/** Where each figure came from, printed nowhere and read by whoever doubts one of them. */
export const PREVIOUS_BASELINE_CITATIONS: Readonly<Record<string, string>> = {
  yards_per_carry:
    "CALIBRATION-BACKLOG.md, FIRST BASELINE REPORT table ('16.28') and entry 23, which states " +
    "the same run to three decimals: '16.277 y/c', 25,947 carries, e42ee36, seeds baseline-0001.",
  time_to_throw:
    "FIRST BASELINE REPORT table ('1.147s') and entry 24 ('corpus time-to-throw 1.147s vs real " +
    "2.682s').",
  drives_per_team_game:
    "FIRST BASELINE REPORT table: '19.34 per team (38.7/game)'.",
  points_per_drive:
    "FIRST BASELINE REPORT, third bullet: 'points_per_drive passes comfortably (2.011 vs 1.936)'.",
  int_rate: "FIRST BASELINE REPORT, third bullet: 'int_rate passing at 2.25%'.",
  sack_rate:
    "Entry 21: 'they are still 13.0% and 87.0% against real 6.9% and 29.2%'. The first of the pair.",
  pressure_rate: "Entry 21, the second of the same pair.",
};

/**
 * baseline-0001's sim side, for every row it recorded.
 *
 * Units match `MetricEvaluation.sim` exactly — a `%` metric is a fraction here, not a percentage,
 * because that is what `carryForward` writes and a trend column that silently mixes the two would
 * be worse than no trend column at all.
 */
export const PREVIOUS_BASELINE: PreviousReport = {
  id: "baseline-0001 (reconstructed from CALIBRATION-BACKLOG.md — see PREVIOUS_BASELINE_CITATIONS)",
  sim: {
    yards_per_carry: 16.277,
    time_to_throw: 1.147,
    drives_per_team_game: 19.34,
    points_per_drive: 2.011,
    int_rate: 0.0225,
    sack_rate: 0.13,
    pressure_rate: 0.87,
  },
  comfortableStreak: {},
};
