/**
 * ONE GAME, HEADLESS — the unit a worker executes.
 *
 * Deliberately separate from `batch.ts` so that the function a worker thread calls is the same
 * function the in-process path calls. A worker that ran a slightly different code path from the
 * main thread would make "the same seeds produce the same numbers on one worker and on eight"
 * an aspiration rather than a property, and that property is the entire determinism claim.
 */
import type { Tunables } from "@ff/engine";
import { createMatchState, deriveGameId, simulateGame, DEFAULT_TUNABLES } from "@ff/engine";
import type { FittedFourthDown } from "../caller/fourthDown.js";
import { frozenCallerPair, type FrozenCallerDiagnostics } from "../caller/frozen.js";
import type { FittedTendencies } from "../caller/tendencies.js";
import type { SimGameObservation } from "../metrics/collect.js";
import type { BuiltFixture } from "./schedule.js";

export interface RunGameInput {
  readonly built: BuiltFixture;
  readonly seed: string;
  readonly tendencies: FittedTendencies;
  readonly fourthDown: FittedFourthDown;
  readonly tunables?: Tunables;
}

export interface RunGameOutput {
  readonly observation: SimGameObservation;
  readonly caller: FrozenCallerDiagnostics;
}

export function runOneGame(input: RunGameInput): RunGameOutput {
  const tunables = input.tunables ?? DEFAULT_TUNABLES;
  const { built, seed } = input;
  const pair = frozenCallerPair({
    tendencies: input.tendencies,
    fourthDown: input.fourthDown,
    homeDepthChart: built.homeDepthChart,
    awayDepthChart: built.awayDepthChart,
  });

  const coordinates = {
    season: built.fixture.season,
    week: built.fixture.week,
    home: built.fixture.home,
    away: built.fixture.away,
    ...(built.fixture.replay === 0 ? {} : { replay: built.fixture.replay }),
  };
  const state = createMatchState(coordinates, built.snapshot, tunables);
  const result = simulateGame(
    state,
    { coordinates, snapshot: built.snapshot, callers: { home: pair.home, away: pair.away } },
    seed,
    tunables,
  );

  return {
    observation: {
      seed,
      summary: result.summary,
      events: result.events,
      statlines: result.statlines,
    },
    caller: pair.diagnostics,
  };
}

/** Exported so a caller can address a game without running it (report cross-references). */
export { deriveGameId };
