/**
 * ADR-089 step 6 (the outs; step-6 plan §2; AM-13's readings, filed before step 6's first arm): THE
 * OUTS, AS PURE FUNCTIONS.
 *
 * Every function here is called by `sim/passPlay.ts` only behind `rules.outs !== undefined` (the
 * `pocket.outs` block, `sim/pocketRules.ts`), and each only behind its own part's leaf. Only a
 * `pocket-1` bundle of shape S or L can carry the block, and while petitions P9 to P12 are not in
 * contracts every tree carrying it is refused before the first die (`step6Gate`), so tests reach
 * these through `pocketRulesUnder` and `simulatePassPlayWith` with their own petitions set. Under
 * `legacy`, every `pocket-1.s1` to `.s5a` bundle and kind T none of them is called, so their plays
 * run today's code path (P-18's spies, `test/pocketLegacyIsolation.test.ts`); nor is any called
 * under a block with every part off, which plays step 5a's outs (P-18b).
 *
 * Part by part (the plan's numbers):
 *
 * - **2.1 The real throwaway rule** (`throwawayLegalInPocket`; AM-13 `throwawayRule`, CHOSEN): in
 *   the pocket a throwaway is legal at or past the drop floor on a tick on which a route has reached
 *   its break, in place of the 2.0 s gate (`qb.throwawayEarliestSeconds`), at the forced pick and on
 *   the CLOCK_EXPIRED path. A throwaway with a hand on him is the contact choice, step 7's, so under
 *   the rule none comes on a tick that ran an arrival contest (the call site's clause, S-15). There
 *   is still no clean throwaway in the pocket (§4.6 c): the clean pick never offers one. Out of the
 *   pocket a throwaway is legal at the deadline pick by construction (2.11). Under the rule and
 *   under the deadline pick every throwaway carries `THROWAWAY.outsideTackleBox` (P10), false in the
 *   pocket (the call site).
 * - **2.2 The scramble start** (`scrambleStartYards`, `scrambleRunYards`; AM-13 `scrambleStart`, by
 *   the owner's answer, `ZERO_GAIN_ONLY` recommended and each bundle's default until then): under
 *   `ZERO_GAIN_ONLY` a scramble run that gains nothing ends where he is, at minus the card's
 *   `dropDepthYards` (5.0 shotgun, 7.0 under center, D22), its zone events the run as played; under
 *   `EVERY_RUN` every run starts there. The run's dice do not change.
 *
 * No die is drawn here.
 */
import type { ScrambleStart } from "../tunables.js";

// ---- 2.1 the real throwaway rule ---------------------------------------------------------------

/** A receiver's route as the throwaway rule reads it (read only). */
export interface BreakTrack {
  /** Set once his rep resolved (his break, or an anticipation that turned him loose early). */
  readonly baseOpenness: number | undefined;
  /**
   * His depth class's ready time with any jam delay: QUICK 1.0, SHORT 1.5, INTERMEDIATE 2.0 and
   * DEEP 2.5 s unjammed (MEASURED, `tunables.ts` `route.readySeconds`).
   */
  readonly readySeconds: number;
}

/** What `throwawayLegalInPocket` reads, every value the tick's own. */
export interface ThrowawayFacts {
  readonly tick: number;
  /** The play's drop floor, 0 when there is none (no floor in the bundle, no first read, or a screen). */
  readonly floorSeconds: number;
  /** Every route the play runs (the eligible receivers). */
  readonly tracks: readonly BreakTrack[];
}

/**
 * 2.1 (AM-13 `throwawayRule`, CHOSEN): a throwaway in the pocket is legal on a tick at or past his
 * drop floor (where the call has one) on which at least one eligible receiver's route has reached
 * its break: the window bump's own test (`sim/cleanPocket.ts`'s `bumpFor`), his rep resolved and the
 * tick at or past his ready time. It stands in for the NFL's receiver-in-the-area test; where the
 * ball lands is not checked. A man an anticipation turned loose before his ready time has not
 * reached his break. The floor binds the throwaway as it binds aimed throws. Exported for step 7's
 * contact choice, which reads it with a hand on him.
 */
export function throwawayLegalInPocket(f: ThrowawayFacts): boolean {
  return f.tick >= f.floorSeconds && f.tracks.some((t) => t.baseOpenness !== undefined && f.tick >= t.readySeconds);
}

// ---- 2.2 the scramble start --------------------------------------------------------------------

/**
 * 2.2 (AM-13 `scrambleStart`, by the owner's answer): where a scramble run starts, passed to
 * `advanceCarrier` as its start. Under `EVERY_RUN` (the design's words, "The run starts where he
 * is", ADR-089:727, :755) every run starts at minus the card's `dropDepthYards`, so its zone events
 * count from there and a tackle in the first zone can end behind the line. Under `ZERO_GAIN_ONLY`
 * the run starts at the line, as today: `undefined`, no start.
 */
export function scrambleStartYards(start: ScrambleStart, dropDepthYards: number): number | undefined {
  return start === "EVERY_RUN" ? -dropDepthYards : undefined;
}

/**
 * 2.2: a scramble run's yards as `RUN_RESOLUTION.yards` and the play's result carry them. Under
 * `ZERO_GAIN_ONLY` (the design's pricing of the clause it grades, "zero-yard scrambles rescored",
 * ADR-089:754, :774) a run that gains nothing (0 yards or fewer) ends where he is, at minus the
 * card's `dropDepthYards`, and every other run keeps its yards; its zone events stay the run as
 * played (zone 1, 0 yards), as a designed run's tackle for loss breaks the zone sum. Under
 * `EVERY_RUN` the run's own yards, already counted from his start.
 */
export function scrambleRunYards(start: ScrambleStart, dropDepthYards: number, runYards: number): number {
  return start === "ZERO_GAIN_ONLY" && runYards <= 0 ? -dropDepthYards : runYards;
}
