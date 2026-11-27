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
 *
 * No die is drawn here.
 */

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
