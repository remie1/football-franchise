/**
 * THE ONE OWNER OF THE BALL TRANSITION.
 *
 * Until this file existed there were two copies of these rules —
 * `applyOutcome` in `sim/passPlay.ts` and `applyRunOutcome` in `sim/runPlay.ts`
 * — and they had already drifted: the run copy had no turnover branch at all,
 * which was invisible only because §13/§14 specify no fumble (ADR-010) so a
 * carry could not turn the ball over. The day one does, the two copies produce
 * two different `newState`s from the same event stream.
 *
 * That is not a tidiness argument. Replay verification is "re-run the stream and
 * check you land in the same state"; two transition functions make the answer
 * depend on which one ran (FANTASY-GATE-PHASE1 §3.11).
 *
 * WHAT THIS FUNCTION OWNS: the spot, the clock, the down, the distance, and the
 * possession flip on a turnover.
 *
 * WHAT IT DOES NOT OWN, because they are GAME rules rather than PLAY rules and
 * live in `game/simulateGame.ts`: the end of a series (this function will hand
 * you `down: 5`; turning that into a turnover on downs needs to know a series is
 * four downs), the scoreboard, a safety, and everything about drives, periods
 * and kickoffs. Splitting it there keeps one owner per rule rather than one
 * owner per layer.
 */
import type { Tunables } from "../tunables.js";
import { clamp } from "../rolls.js";
import type { MatchGameState } from "../types.js";

/** What one play did to the ball. Produced by both simulators. */
export interface PlayOutcome {
  readonly yards: number;
  readonly turnover: boolean;
  readonly clockRunoff: number;
  /** Points scored ON THE PLAY, by whoever had the ball. Absent means none. */
  readonly score?: number;
}

export function applyPlayOutcome(
  tunables: Tunables,
  state: MatchGameState,
  outcome: PlayOutcome,
  nextSeq: number,
): MatchGameState {
  const ballOn = clamp(state.ballOn + outcome.yards, 0, 100);
  const clockSeconds = Math.max(0, state.clockSeconds - outcome.clockRunoff);
  const base = {
    ...state,
    nextEventSeq: nextSeq,
    playNumber: state.playNumber + 1,
    clockSeconds,
  };

  if (outcome.turnover) {
    return {
      ...base,
      offenseTeam: state.defenseTeam,
      defenseTeam: state.offenseTeam,
      ballOn: 100 - ballOn,
      down: 1,
      distance: tunables.result.firstDownResetsDistance,
    };
  }

  const gotFirstDown = outcome.yards >= state.distance;
  return {
    ...base,
    ballOn,
    down: gotFirstDown ? 1 : state.down + 1,
    distance: gotFirstDown
      ? tunables.result.firstDownResetsDistance
      : Math.max(1, state.distance - outcome.yards),
  };
}
