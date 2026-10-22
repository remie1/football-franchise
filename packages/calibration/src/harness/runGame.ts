/**
 * ONE GAME, HEADLESS — the unit a worker executes.
 *
 * Deliberately separate from `batch.ts` so that the function a worker thread calls is the same
 * function the in-process path calls. A worker that ran a slightly different code path from the
 * main thread would make "the same seeds produce the same numbers on one worker and on eight"
 * an aspiration rather than a property, and that property is the entire determinism claim.
 */
import type { Tunables } from "@ff/engine";
import type { CoverageMask, FrontLookId } from "@ff/playbook";
import { createMatchState, deriveGameId, simulateGame, DEFAULT_TUNABLES } from "@ff/engine";
import type { CallerVersion } from "../caller/anticipate.js";
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
  /**
   * ADR-024 / ADR-069 / ADR-071 / ADR-073. Defaults to v4 (anticipating, wearing every look)
   * inside `frozenCallerPair`; v5 also states the line's slide check (and the keep-in, on request);
   * v6 also draws the defence's call in parts, and the creeper; v7 also wears the front looks.
   */
  readonly callerVersion?: CallerVersion;
  /** ADR-069 measurement arms only — see `FrozenCallerSpec.coverageMasks`. */
  readonly coverageMasks?: readonly CoverageMask[];
  /** ADR-072 measurement arms only — see `FrozenCallerSpec.leash`. */
  readonly leash?: number;
  /** ADR-073 measurement arms only, v5 to v7 — see `FrozenCallerSpec.slideCheck` (stated unless `false`). */
  readonly slideCheck?: boolean;
  /** ADR-073 measurement arms only, v5 to v7 — see `FrozenCallerSpec.keepIn` (stated only if `true`). */
  readonly keepIn?: boolean;
  /** ADR-073 step 3.4 measurement arms only, v6 and v7 — see `FrozenCallerSpec.creeper` (drawn unless `false`). */
  readonly creeper?: boolean;
  /** ADR-073 step 3.4 measurement arms only, v6 and v7 — see `FrozenCallerSpec.drawPressures` (drawn unless `false`). */
  readonly drawPressures?: boolean;
  /** ADR-073 step 3.4 measurement arms only, v6 and v7 — see `FrozenCallerSpec.drawLines` (drawn unless `false`). */
  readonly drawLines?: boolean;
  /** ADR-073 step 3.5 measurement arms only, v7 — see `FrozenCallerSpec.frontLooks` (the full catalogue unless narrowed). */
  readonly frontLooks?: readonly FrontLookId[];
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
    ...(input.callerVersion === undefined ? {} : { callerVersion: input.callerVersion }),
    ...(input.coverageMasks === undefined ? {} : { coverageMasks: input.coverageMasks }),
    ...(input.leash === undefined ? {} : { leash: input.leash }),
    ...(input.slideCheck === undefined ? {} : { slideCheck: input.slideCheck }),
    ...(input.keepIn === undefined ? {} : { keepIn: input.keepIn }),
    ...(input.creeper === undefined ? {} : { creeper: input.creeper }),
    ...(input.drawPressures === undefined ? {} : { drawPressures: input.drawPressures }),
    ...(input.drawLines === undefined ? {} : { drawLines: input.drawLines }),
    ...(input.frontLooks === undefined ? {} : { frontLooks: input.frontLooks }),
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
