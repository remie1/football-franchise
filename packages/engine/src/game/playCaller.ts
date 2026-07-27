/**
 * THE PLAY-CALLING SEAM, AND ONE MINIMAL DETERMINISTIC DEFAULT.
 *
 * `calibration.md` §3.1 gives the FROZEN BASELINE CALLER to calibration, and it
 * does not exist yet. The loop still needs somebody to call plays, so this file
 * supplies the interface's smallest honest implementation and nothing more.
 *
 * ⚠ THIS IS NOT A TENDENCY MODEL and must not become one. There is no game
 * script, no opponent scouting, no personnel matching, no clock management
 * beyond a two-minute pass rate, no field-position awareness beyond the
 * fourth-down policy, and no coach attributes (`COACH_ATTRIBUTE_REGISTRY_V1`
 * has `playCalling` and `situationalJudgment`; neither is read here, on purpose
 * — a play-caller that consumed coach ratings would be asserting how coaching
 * works, which is Spec #11's decision and not this dispatch's).
 *
 * Every number it consults is in `TUNABLES.game.caller`, so replacing it is a
 * substitution rather than an excavation.
 *
 * IT OWNS NO TUNABLES. Every request carries the tunables the game is being
 * played under (`DecisionRequestBase.tunables`), so this caller cannot be built
 * against one version and run under another — the silent-mixing failure ADR-012's
 * open item is about. That is also why `defaultPlayCaller` keeps its one-argument
 * signature: there is nothing version-shaped for a construction site to get wrong.
 */
import type { Rng } from "@ff/contracts";
import type { Tunables } from "../tunables.js";
import type { DefensivePlayCall, OffensiveCall } from "../types.js";
import { COVERAGE_CARDS, PASS_CARDS, RUN_CARDS } from "./playbook.js";
import type {
  CoinTossChoice,
  CoinTossRequest,
  DefensiveCallRequest,
  FourthDownChoice,
  FourthDownRequest,
  OffensiveCallRequest,
  PlayCaller,
} from "./types.js";

/** Pass probability for this down and distance, before any die is thrown. */
export function passRateFor(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly down: number;
  readonly distance: number;
  readonly twoMinute: boolean;
}): number {
  const caller = args.tunables.game.caller;
  if (args.twoMinute) return caller.twoMinutePassRate;
  if (args.distance <= caller.shortYardagePassMaxDistance) return caller.shortYardagePassRate;
  const byDown: Readonly<Record<number, number>> = caller.passRateByDown;
  return byDown[args.down] ?? caller.passRateByDown[1];
}

/**
 * The fourth-down policy, as a pure function of the situation. No die: a coach
 * who flips a coin on fourth down is noise in every metric that reads this.
 */
export function fourthDownPolicy(request: FourthDownRequest): FourthDownChoice {
  const s = request.situation;
  const game = request.tunables.game;
  const CALLER = game.caller;
  const inRange =
    request.fieldGoalDistanceYards <= game.specialTeams.fieldGoal.maxAttemptDistanceYards;

  const desperate =
    s.period >= game.periodsInRegulation &&
    s.clockSeconds <= CALLER.desperationClockSeconds &&
    s.offenseScore < s.defenseScore &&
    s.defenseScore - s.offenseScore > CALLER.desperationPointDeficit;

  if (desperate) {
    // Down by more than a score, late: the field goal does not help.
    return inRange && s.ballOn >= 95 ? "FIELD_GOAL" : "GO_FOR_IT";
  }
  if (s.distance <= CALLER.goForItMaxDistance && s.ballOn >= CALLER.goForItMinYardLine && !inRange) {
    return "GO_FOR_IT";
  }
  if (inRange) return "FIELD_GOAL";
  if (s.distance <= CALLER.goForItMaxDistance && s.ballOn >= CALLER.goForItMinYardLine) {
    return "GO_FOR_IT";
  }
  return "PUNT";
}

/**
 * The default caller. Pure: it owns no state and no `Rng`, it is handed one
 * addressed by the play's own coordinates, so two identical games call the same
 * plays in the same order.
 */
export function defaultPlayCaller(name = "baseline-v0"): PlayCaller {
  return {
    name,

    callOffense(request: OffensiveCallRequest, rng: Rng): OffensiveCall {
      const s = request.situation;
      const rate = passRateFor({
        tunables: request.tunables,
        down: s.down,
        distance: s.distance,
        twoMinute: s.twoMinute,
      });
      const pass = rng.fork("kind").next() < rate;
      const cardRng = rng.fork("card");
      const card = pass ? cardRng.pick(PASS_CARDS) : cardRng.pick(RUN_CARDS);
      return card.build(request.offense.offense, request.defense.defense);
    },

    callDefense(request: DefensiveCallRequest, rng: Rng): DefensivePlayCall {
      const card = rng.fork("card").pick(COVERAGE_CARDS);
      return card.build(request.offense.offense, request.defense.defense);
    },

    decideFourthDown(request: FourthDownRequest): FourthDownChoice {
      return fourthDownPolicy(request);
    },

    /**
     * Always take the ball. Deferring is the modern-NFL answer and it is a
     * TENDENCY, which this caller is explicitly not in the business of having.
     */
    decideCoinToss(_request: CoinTossRequest): CoinTossChoice {
      return "RECEIVE";
    },
  };
}
