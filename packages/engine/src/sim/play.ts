/**
 * The one entry point, dispatching on the call's own discriminant.
 *
 * `simulatePassPlay` and `simulateRunPlay` stay exported and unchanged in
 * signature — calibration harnesses and tests that already name one of them keep
 * working, and a caller that has a play card in hand and does not want to know
 * which kind it is calls this instead.
 */
import { TUNABLES } from "../tunables.js";
import type { Tunables } from "../tunables.js";
import type { AnyPlayCalls, MatchGameState, RunPlayCalls, PlayCalls, SimulationResult } from "../types.js";
import { simulatePassPlay } from "./passPlay.js";
import { simulateRunPlay } from "./runPlay.js";

export function simulatePlay(
  state: MatchGameState,
  calls: AnyPlayCalls,
  seed: string,
  /** Optional HERE and required beneath — see `simulatePassPlay`. */
  tunables: Tunables = TUNABLES,
): SimulationResult {
  return calls.offense.kind === "RUN"
    ? simulateRunPlay(state, calls as RunPlayCalls, seed, tunables)
    : simulatePassPlay(state, calls as PlayCalls, seed, tunables);
}
