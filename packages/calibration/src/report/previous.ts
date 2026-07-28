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
import { refusalMessage, type BaselineIdentity, type PreviousReport, type TrendDecision } from "./identity.js";

/**
 * The caller baseline-0001 ran, and the reason this constant exists rather than being implied.
 *
 * Every batch before ADR-024 ran the informed caller, whose protection was built against the
 * ACTUAL defensive card. `BatchProvenance.callerVersion` did not record that at the time — it
 * recorded the tendency TABLE's version only — so the fact survives in exactly one place, which
 * is here. A v2 report trending against these figures would be comparing a caller that guesses
 * against a caller that cannot be wrong, which is the identical incomparability
 * `identity.ts` refuses on every other axis.
 */
const RECONSTRUCTED_CALLER_VERSION = "v1";

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

/**
 * The reconstruction, as an adjudicated trend decision.
 *
 * ★ THE REFUSAL IS NOW STRUCTURAL. ★ The empty `comfortableStreak` above used to be the only
 * thing stopping a reconstructed predecessor from ratcheting a band — a convention held up by an
 * object literal that anybody could fill in. `buildBaselineReport` now inherits streaks only from
 * an `ACCEPTED` decision (`mayRatchet`), so `RECONSTRUCTED` cannot move a gate even if this map
 * were populated. The empty literal stays as belt and braces, and because it is also honest:
 * nobody wrote down which of baseline-0001's rows sat comfortably inside their bands.
 *
 * baseline-0001 ran at engine commit `e42ee36` (CALIBRATION-BACKLOG.md entry 23, which records it
 * beside the seed list). That is why this cannot be an `ACCEPTED` decision and never could be:
 * the tree is three phases behind, and a carry-forward with that identity would be refused on
 * `engineCommit` before anything else was checked.
 *
 * ★ AND IT IS NOW REFUSED OUTRIGHT FOR AN ADR-024 RUN. ★ The `current` argument is not
 * decoration. A reconstruction is allowed to inform an arrow precisely because it is an estimate
 * of the same quantity under the same system; a v1 figure is not an estimate of a v2 quantity,
 * because the caller sets the play mix every rate in the library is measured over. Without this
 * check a v2 baseline run with no `FF_BASELINE_PREV` — the DEFAULT invocation — would print a
 * confident column of arrows measuring the distance between a caller that guesses and a caller
 * that could not be wrong, and `sack_rate +0.7pp` would render exactly like progress. That is the
 * failure `identity.ts` was written for, arriving through the one door it did not cover.
 */
export function reconstructedTrend(current: BaselineIdentity): TrendDecision {
  if (!current.callerVersion.startsWith(`${RECONSTRUCTED_CALLER_VERSION}/`)) {
    const mismatches = [
      {
        field: "callerVersion",
        previous: RECONSTRUCTED_CALLER_VERSION,
        current: current.callerVersion,
        why:
          "the reconstructed figures were produced by the caller whose protection was built " +
          "against the ACTUAL defensive card (CALIBRATION-BACKLOG.md entry 21). A caller that " +
          "anticipates the front is a different denominator, and ADR-024 changed every pressure " +
          "number in the library",
      },
    ];
    return {
      kind: "REFUSED",
      previousId: PREVIOUS_BASELINE.id,
      mismatches,
      message: refusalMessage(PREVIOUS_BASELINE.id, mismatches),
    };
  }
  return {
    kind: "RECONSTRUCTED",
    previous: PREVIOUS_BASELINE,
    reason:
      "every figure is quoted from a named line of CALIBRATION-BACKLOG.md (see " +
      "PREVIOUS_BASELINE_CITATIONS); baseline-0001 wrote a markdown artefact and no " +
      "machine-readable carry-forward. It ran at engine commit e42ee36, so it could not be an " +
      "accepted predecessor for any current tree in any case.",
  };
}
