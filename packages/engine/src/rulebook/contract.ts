/**
 * The mapping from the rulebook's records onto the contract's PENALTY and PENALTY_OPTION payloads.
 * Where the contract cannot say a record, the mapping returns a named gap instead.
 */
import type { EnforcementSpot, PenaltyEnforcement, PenaltyOutcome } from "@ff/contracts";
import { RulebookInputError } from "./errors.js";
import type { ContractGap, FlagRecord, PenaltyChoice, Team } from "./types.js";

/**
 * The rulebook fields of a PENALTY payload, shaped to spread into it under exactOptionalPropertyTypes:
 * `enforcement` is present exactly when `outcome` is ENFORCED, and absent otherwise, as the
 * contract's payload requires.
 */
export type PenaltyFields =
  | { readonly outcome: "ENFORCED"; readonly freePlay: boolean; readonly enforcement: PenaltyEnforcement }
  | {
      readonly outcome: Exclude<PenaltyOutcome, "ENFORCED">;
      readonly freePlay: boolean;
      readonly enforcement?: never;
    };

/**
 * Maps one flag record onto the PENALTY payload's rulebook fields.
 *
 * The spot mapping: before the snap, at the snap and on pass plays PREVIOUS_SPOT; DPI and
 * grounding PREVIOUS_SPOT with the yards to the new spot (the contract's convention for spot
 * fouls); a basic spot or a dead-ball spot END_OF_RUN; three-and-one's spot of the foul and an
 * illegal pass's spot of the pass SPOT_OF_FOUL; dead-ball flags SUCCEEDING_SPOT; a safety is
 * `safety: true`, SPOT_OF_FOUL, the yards from the previous spot to the goal line.
 *
 * @returns the fields; or `{ gap }` for exactly three gaps, checked in this order, the spot gaps
 *   first: GOAL_LINE (the record's spot is GOAL_LINE), TOUCHBACK_TWENTY (its spot is
 *   TOUCHBACK_TWENTY) and ENFORCED_BY_RULE (ENFORCED with no decision). It never returns
 *   NO_PLAY_RESULT, NO_SNAP or TIMEOUT_CHOICES, which concern the events around a flag (PLAY_RESULT,
 *   PLAY_START, a timeout's decision), not the record.
 * @throws RulebookInputError when the record is not whole (ENFORCED with no `marked`, or `marked`
 *   on a flag that is not ENFORCED).
 */
export function toPenalty(record: FlagRecord): PenaltyFields | { readonly gap: ContractGap } {
  const m = record.marked;
  if (record.outcome === "ENFORCED") {
    if (m === undefined) throw new RulebookInputError(`flag "${record.ref}" is ENFORCED but has no marked record`);
    if (m.spot === "GOAL_LINE") return { gap: "GOAL_LINE" };
    if (m.spot === "TOUCHBACK_TWENTY") return { gap: "TOUCHBACK_TWENTY" };
    if (record.decision === undefined) return { gap: "ENFORCED_BY_RULE" };
    if (m.safety) {
      return { outcome: "ENFORCED", freePlay: record.freePlay, enforcement: { safety: true, spot: "SPOT_OF_FOUL", yards: m.yards } };
    }
    const spot: EnforcementSpot =
      m.spot === "BASIC_SPOT" || m.spot === "DEAD_BALL_SPOT" ? "END_OF_RUN" : (m.spot as EnforcementSpot);
    return {
      outcome: "ENFORCED",
      freePlay: record.freePlay,
      enforcement: { safety: false, spot, yards: m.yards, halfTheDistance: m.halfTheDistance, down: m.down },
    };
  }
  if (m !== undefined) throw new RulebookInputError(`flag "${record.ref}" is ${record.outcome} but carries a marked record`);
  return { outcome: record.outcome, freePlay: record.freePlay };
}

/**
 * Maps one flag record onto the PENALTY_OPTION decision's `{ team, choice }`.
 *
 * @returns the offended team and its choice, or null when the record has no `decision` (OFFSET,
 *   SUPERSEDED, or enforced by rule).
 */
export function toDecision(record: FlagRecord): { readonly team: Team; readonly choice: PenaltyChoice } | null {
  return record.decision === undefined ? null : { team: record.decision.team, choice: record.decision.choice };
}
