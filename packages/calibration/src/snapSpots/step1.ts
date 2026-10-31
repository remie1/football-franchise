/**
 * ADR-090 step 1's measure (§7): the golden games (ADR-089 plan §0; 50 a league, the default
 * caller), played with the snap picture on every play, read back off their streams.
 *
 *  - INERT: each league's folds, with the picture stripped (`GOLDEN_STRIP`, K11), against the pins
 *    measured before any picture existed. The suite checks every caller (`goldenDigests.*.test.ts`);
 *    this re-checks the default caller's on the games it reads anyway.
 *  - WHOLE: every PLAY_START carries a picture of eleven and eleven, each on his side, naming every
 *    man the call names.
 *  - CELLS: where each man's snap spot falls on the engine's grid against the cell the engine plays
 *    him in (`cells.ts`).
 */
import { goldenGames } from "../pocket/corpus.js";
import {
  foldDigests,
  gameBytesDigest,
  gameDigest,
  GOLDEN_LEAGUES,
  GOLDEN_PINS,
  type GoldenLeague,
  type GoldenPin,
} from "../pocket/golden.js";
import { snapCellCheck, type SnapCellCheck } from "./cells.js";

/** The caller the golden games are pinned under and the game plays by default (ADR-073 step 3.5). */
export const STEP1_CALLER = "v7";

export interface Step1League {
  readonly league: GoldenLeague;
  readonly games: number;
  /** `{at, event}` entries over the games played. */
  readonly events: number;
  readonly canonicalFold: string;
  readonly byteFold: string;
  /** The pin, when every game of the league was played; `undefined` for a part (`first`). */
  readonly pinned: GoldenPin | undefined;
  /** The per-game digests, stripped, in fixture order. */
  readonly canonical: readonly string[];
  readonly bytes: readonly string[];
}

export interface Step1Measure {
  readonly leagues: readonly Step1League[];
  readonly cells: SnapCellCheck;
}

/** Plays the golden games (the first `first` of each league, or all 50) and measures them. */
export function measureStep1(opts: { readonly first?: number } = {}): Step1Measure {
  const check = snapCellCheck();
  const leagues = GOLDEN_LEAGUES.map((league): Step1League => {
    const canonical: string[] = [];
    const bytes: string[] = [];
    let events = 0;
    const run = goldenGames(
      league,
      (observation, snapshot) => {
        check.add(observation.events, snapshot);
        canonical.push(gameDigest(observation.events));
        bytes.push(gameBytesDigest(observation.events));
        events += observation.events.length;
      },
      { callerVersion: STEP1_CALLER, ...(opts.first === undefined ? {} : { first: opts.first }) },
    );
    return {
      league,
      games: run.games,
      events,
      canonicalFold: foldDigests(canonical),
      byteFold: foldDigests(bytes),
      pinned: opts.first === undefined ? GOLDEN_PINS[league][STEP1_CALLER] : undefined,
      canonical,
      bytes,
    };
  });
  return { leagues, cells: check.result() };
}
