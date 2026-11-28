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
 * - **2.3 The escape cap and the spent case** (`escapeRollSpends`, `escapeLeft`, `spentBranch`;
 *   AM-13 `escapeCap`, CHOSEN, and `spentChecklist`, by the owner's answer, `HOLD` recommended and
 *   each bundle's default until then): one escape roll a play, forced or clean, so once a `scramble`
 *   CHECK is drawn ESCAPE is offered at no later pick (`rankResponses`' `escapeAvailable` at the
 *   forced pick, the clean pick's `escapeOffered` at the call site). On a clean expiry with his move
 *   used or not offered and his escape spent, the clean pick offers nothing, and the call site runs
 *   the answer's branch.
 * - **2.5 No late horizon sack** (`horizonDeadline`, `runsPastLastTick`; AM-13 `horizon`, CHOSEN):
 *   the pursuit deadline is the later of the escape tick plus one tick step and the earlier of the
 *   escape tick plus `pursuitSeconds` and the last tick, and the play runs one tick past the last
 *   only for a live scramble whose deadline is past it, so no escape runs off the clock into the
 *   horizon coverage sack.
 * - **2.12 The failed scramble scored as a sack** (AM-13 `rescoring`) has no function here: the
 *   call site writes `PLAY_START.scoring` under `failedScrambleSack`, and every reader keys the rule
 *   on that marker (`stats/statline.ts` in the engine).
 *
 * No die is drawn here.
 */
import type { EscapeCapTunables, ScrambleStart, Tunables } from "../tunables.js";

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

// ---- 2.3 the escape cap and the spent case -----------------------------------------------------

/**
 * 2.3 (AM-13 `escapeCap`): whether an escape roll of this band spends the play's escape. Every roll
 * does, but under `CONTAINED_DOES_NOT_SPEND`, where a CONTAINED roll does not (CLEAN_ESCAPE, ESCAPED
 * and CAUGHT_FROM_BEHIND do), so ESCAPE is offered again at a later pick.
 */
export function escapeRollSpends(cap: EscapeCapTunables, band: string): boolean {
  return cap.whenSpent !== "CONTAINED_DOES_NOT_SPEND" || band !== "CONTAINED";
}

/**
 * 2.3: whether ESCAPE may be offered at a pick, forced or clean, after `spent` escape rolls that
 * spent the escape: fewer than the cap's one a play (`maxPerPlay`).
 */
export function escapeLeft(cap: EscapeCapTunables, spent: number): boolean {
  return spent < cap.maxPerPlay;
}

/**
 * 2.3: what the call site does in the spent case. `HOLD`: no die, no throwaway, no CLOCK_EXPIRED, and
 * he keeps reading. `TODAYS_PATH`: no die, and the path after the pick runs as today (a
 * CLOCK_EXPIRED throwaway where the throwaway rule, or without it the 2.0 s gate, allows one, else a
 * hold). `SECOND_ESCAPE`: the clean pick offers ESCAPE once more. `BELOW_30`: no movement die, and
 * today's decision roll on the tick's candidates with no floor, in place of D23's at 30.
 */
export type SpentBranch = "HOLD" | "TODAYS_PATH" | "SECOND_ESCAPE" | "BELOW_30";

/**
 * 2.3 (AM-13 `spentChecklist`, by the owner's answer, the five options of the step-6 filing §4.4):
 * the spent case's branch, after `rolls` escape rolls on the play. Under `SECOND_ESCAPE` the one
 * second escape roll a play may have is offered while the play has drawn no more than the cap's
 * one, and once it is drawn the case holds (CHOSEN: the option names no branch past it, and HOLD
 * keeps the clean pocket's throwaway out as the recommended answer does). Under
 * `CONTAINED_DOES_NOT_SPEND` the one spent case left, a quarterback shed on a caught escape (2.8),
 * holds, as the option states.
 */
export function spentBranch(cap: EscapeCapTunables, rolls: number): SpentBranch {
  switch (cap.whenSpent) {
    case "HOLD":
    case "CONTAINED_DOES_NOT_SPEND":
      return "HOLD";
    case "TODAYS_PATH":
      return "TODAYS_PATH";
    case "SECOND_ESCAPE":
      return rolls <= cap.maxPerPlay ? "SECOND_ESCAPE" : "HOLD";
    case "BELOW_30":
      return "BELOW_30";
  }
}

// ---- 2.5 no late horizon sack ------------------------------------------------------------------

/**
 * 2.5 (AM-13 `horizon`, CHOSEN): the pursuit deadline under the rule, the later of the escape tick
 * plus one tick step and the earlier of the escape tick plus `scramble.pursuitSeconds` (1.5 s) and
 * the last tick (`clock.maxTick`, 6.0 s), rounded as the tick clock rounds: an escape at 5.0 or
 * 5.5 s reaches it at 6.0 s, and one at 6.0 s at 6.5 s. Without the rule it is `pursuitDeadline`'s,
 * the escape tick plus `pursuitSeconds` whatever the clock, so an escape after 4.5 s runs off the
 * loop's end into the horizon coverage sack. The desperation bar (`pursuitForcesDecision`) reads
 * the same deadline, so it moves with it.
 */
export function horizonDeadline(tunables: Tunables, escapeTick: number): number {
  const nextTick = Number((escapeTick + tunables.clock.tickStepSeconds).toFixed(1));
  const pursuit = Number((escapeTick + tunables.scramble.pursuitSeconds).toFixed(1));
  return Math.max(nextTick, Math.min(pursuit, tunables.clock.maxTick));
}

/**
 * 2.5: whether the play runs `tick`, a tick past the last (`clock.maxTick`): only while a scramble
 * is live (`pursuitAtTick` set) and only up to its deadline. Out of the pocket a tick runs no line
 * battle, no status and no arrival, so that tick runs the scramble's own logic only: his reads, a
 * throw on the run, and the tuck at the deadline.
 */
export function runsPastLastTick(tunables: Tunables, tick: number, pursuitAtTick: number | undefined): boolean {
  return pursuitAtTick !== undefined && tick > tunables.clock.maxTick && tick <= pursuitAtTick;
}
