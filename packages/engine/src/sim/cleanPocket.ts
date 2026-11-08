/**
 * ADR-089 step 5a (§4.6; plan §2.1; AM-9): HIS COUNT, THE DROP FLOOR AND THE OWNER'S CLEAN-POCKET
 * CHECKLIST, as pure functions.
 *
 * Every function here is called by `sim/passPlay.ts` only behind `rules.cleanPocket !== undefined`
 * (the `pocket.cleanPocket` block, `sim/pocketRules.ts`), which only a `pocket-1` bundle of shape S
 * or L can carry. Under `legacy`, every `pocket-1.s1` to `.s4` bundle and kind T none of them is
 * called, so their plays run today's code path (P-18's spies, `test/pocketLegacyIsolation.test.ts`).
 *
 * What the block does, item by item (the design's letters, ADR-089 §4.6):
 *
 * - **The drop floor** (CHOSEN): no aimed pocket throw is decided and no checkdown look is taken
 *   before the earliest non-screen release, read from the depth class of the first read's route as
 *   run at the snap (after any hot conversion): QUICK 1.0 s, SHORT 1.5 s, INTERMEDIATE and DEEP
 *   2.0 s. A screen (that route's declared `airYards` below 0) has none.
 * - **D26, what starts it**: a spent count or a spent read list, at or past the floor
 *   (`mustDecideNow`, used wherever the pocket's `mustDecide` is computed).
 * - **The clean expiry** (`cleanExpiry`): that, while he is not forced, has not escaped, and the
 *   tick's PUBLISHED `POCKET_STATUS` is CLEAN on a tick that ran no arrival contest (item g;
 *   contracts-guardian C2).
 * - **a.** Anyone at the normal bar throws (today's code, untouched).
 * - **b. D23.** Today's checkdown look, then today's pool cut to men at 30 or more and today's
 *   decision roll; the desperation throw at 25 is not taken (in `passPlay.ts`).
 * - **c. The one ranked pick** (`resolveCleanPick`): MOVE and ESCAPE only, today's appeals at
 *   urgency 0 by definition (a tick whose published status is CLEAN is an unhurried tick, D27; the
 *   Orchestrator's ruling, pending the owner's card), today's band die and rank clamp, on
 *   `movement/t<tick>:clean`. From `pocket-1.s2` on a CLEAN tick can carry a threat 1.0 to 1.25 s
 *   out (`arrival.pressureWithinSeconds` 1.0 against `pocketMovement.urgencyHorizonSeconds` 1.5),
 *   whose own urgency would be 1; the pick does not read it. Calibration counts those picks
 *   (reported, never graded).
 * - **d. MOVE**: today's climb in full, then the read restart and the reset (`resetAfterMove`) and
 *   the window bump (`bumpFor`), openness only, never the contest position (D25).
 * - **e. ESCAPE**: today's escape roll and its three outcomes (in `passPlay.ts`).
 *
 * No die is drawn here but the pick's one d100; the floor, the restart, the reset and the bump
 * draw nothing.
 */
import type { PlayerState, Rng } from "@ff/contracts";
import type { PocketStatusRung } from "../resolve/pocket.js";
import { rankResponses, rollRankedResponse } from "../resolve/pocketMovement.js";
import type { ClimbLaneRule, ClimbLaneThreat, PocketMovementOutcome } from "../resolve/pocketMovement.js";
import type { DropFloorTunables, Tunables } from "../tunables.js";
import type { ContestPosition, RouteAssignment } from "../types.js";

/** A route as the floor reads it: the first read's depth class and declared air yards. */
export type FloorRoute = Pick<RouteAssignment, "depthClass" | "airYards">;

/**
 * A screen: a route whose declared air yards are below 0 (AM-9 `floor`). At 517002e two concepts
 * open on one: `BUBBLE_NOW` (SLOT2 Bubble, -1) and `RB_SLIP_SCREEN` (RB Screen, -3).
 */
export function isScreen(route: Pick<RouteAssignment, "airYards">): boolean {
  return route.airYards < 0;
}

/**
 * The drop floor for a first read of this depth class (§4.6, CHOSEN): the earliest tick at which a
 * non-screen aimed pocket throw may be decided. The caller asks `isScreen` first; a screen has no
 * floor.
 */
export function floorSecondsOf(floor: DropFloorTunables, depthClass: FloorRoute["depthClass"]): number {
  return floor[depthClass];
}

/** What `mustDecideNow` reads, every value the tick's own. */
export interface MustDecideFacts {
  /** What forces him (the status or must act's threat part), unchanged by the block. */
  readonly forced: boolean;
  readonly tick: number;
  readonly budgetSeconds: number;
  readonly readsUsed: number;
  readonly maxReads: number;
  /** The play's drop floor, 0 when there is none (no floor in the block, a screen). */
  readonly floorSeconds: number;
}

/**
 * D26 under the block: the pocket's `mustDecide`. `forced` is today's; the count part is today's
 * (`tick >= budgetSeconds || readsUsed >= maxReads`) and also at or past the floor, so a CONCEPT
 * read list spent on the first tick holds to the floor rather than expiring before it. With no
 * floor (0) it is today's expression.
 */
export function mustDecideNow(f: MustDecideFacts): boolean {
  return f.forced || ((f.tick >= f.budgetSeconds || f.readsUsed >= f.maxReads) && f.tick >= f.floorSeconds);
}

/** What `cleanExpiry` reads. */
export interface CleanExpiryFacts {
  /** `mustDecideNow` on the tick as it now stands. */
  readonly mustDecide: boolean;
  readonly forced: boolean;
  /** He has escaped (the play's scramble has begun). */
  readonly scrambling: boolean;
  /** The status the tick PUBLISHED (`POCKET_STATUS`), never a rebuilt one (contracts-guardian C2). */
  readonly publishedStatus: PocketStatusRung | undefined;
  /** An arrival contest ran on this tick. */
  readonly contested: boolean;
}

/**
 * The clean expiry (AM-9 `cleanExpiry`): his count or his reads spent at or past the floor, not
 * forced, still in the pocket, on a tick whose published status is CLEAN (item g) and which ran no
 * arrival contest. Never before the floor, since `mustDecide` without `forced` is the count part.
 */
export function cleanExpiry(f: CleanExpiryFacts): boolean {
  return f.mustDecide && !f.forced && !f.scrambling && !f.contested && f.publishedStatus === "CLEAN";
}

/**
 * Item b (D23): the pool a clean expiry's decision roll runs on, the tick's candidates (read men
 * and, when he liked it, the checkdown man) cut to those at the expiry bar (30) or more. Empty
 * means nobody at the bar: no throw, and the pick follows.
 */
export function d23Pool<C extends { readonly effectiveOpenness: number }>(candidates: readonly C[], expiryBar: number): C[] {
  return candidates.filter((c) => c.effectiveOpenness >= expiryBar);
}

export interface CleanPickArgs {
  readonly tunables: Tunables;
  readonly qb: PlayerState;
  readonly tick: number;
  /** The tick's live threats, as today's pick reads them. */
  readonly threats: readonly ClimbLaneThreat[];
  /** The climb lane rule the play runs (FRONT under the step-3 block). */
  readonly climbLane: ClimbLaneRule;
  readonly stepUpsUsed: number;
  /** `move` is on and no clean move has been made this play (MOVE once a play). */
  readonly moveOffered: boolean;
  /** `breakOut` is on. */
  readonly escapeOffered: boolean;
  /** The play's `movement` fork; the pick forks `t<tick>:clean` from it. */
  readonly movementRng: Rng;
}

/**
 * Item c (D27): the one ranked pick on a clean expiry, between MOVE (a climb, offered when
 * `moveOffered` and today's climb lane is open: no FRONT or INTERIOR threat by the play's rule and
 * step-ups under `stepUp.maxPerPlay`) and ESCAPE (offered when `escapeOffered`). The appeals are
 * today's (`rankResponses`, with no throwaway and STAND_IN left out), so ESCAPE carries
 * `noClimbLaneBonus` when the lane is shut and ties keep today's declaration order. The appeals are
 * computed at urgency 0 by definition, whatever the nearest threat's time to arrival: the tick
 * published CLEAN, and a CLEAN tick is an unhurried one (D27; the Orchestrator's ruling). From
 * `pocket-1.s2` on, a threat 1.0 to 1.25 s out publishes CLEAN although the forced pick's rule
 * (`resolvePocketMovement`, unchanged) would compute its urgency as 1. One d100 on
 * `movement/t<tick>:clean`, today's band die and rank clamp
 * (`rollRankedResponse`), published as a `pocket_movement` CHECK of today's form. With one option
 * the die is still drawn and the band decides nothing (contracts-guardian C4); with none,
 * `undefined` and no die (today's path runs).
 */
export function resolveCleanPick(args: CleanPickArgs): PocketMovementOutcome | undefined {
  const { ranked, urgency } = rankResponses({
    tunables: args.tunables,
    qb: args.qb,
    tick: args.tick,
    threats: args.threats,
    climbLane: args.climbLane,
    stepUpsUsed: args.stepUpsUsed,
    throwawayAvailable: false,
    urgency: 0,
  });
  const offered = ranked.filter((r) =>
    r.response === "STEP_UP" ? args.moveOffered : r.response === "ESCAPE" ? args.escapeOffered : false,
  );
  if (offered.length === 0) return undefined;
  return rollRankedResponse({
    tunables: args.tunables,
    qb: args.qb,
    ranked: offered,
    urgency,
    movementRng: args.movementRng.fork(`t${args.tick.toFixed(1)}:clean`),
  });
}

/** What a clean move restates. */
export interface AfterMove {
  /** His reads restart at the first read. */
  readonly readPointer: 0;
  readonly readsUsed: 0;
  /** The move tick, plus one tick step, plus the reset (D33), rounded to the tick as the clock is. */
  readonly budgetSeconds: number;
}

/**
 * Item d's restart and reset (D33): back to his first read, and his count restated as the move
 * tick plus one tick step plus `resetSeconds`, rounded as the tick clock rounds. Only the read
 * pointer and the progression's read count restart; the play-scoped label counters (`r<n>`,
 * `a<n>`) keep counting (contracts-guardian C8).
 */
export function resetAfterMove(tunables: Tunables, tick: number, resetSeconds: number): AfterMove {
  return {
    readPointer: 0,
    readsUsed: 0,
    budgetSeconds: Number((tick + tunables.clock.tickStepSeconds + resetSeconds).toFixed(1)),
  };
}

/** A receiver's track as the bump reads it (read only: the bump never writes the contest position). */
export interface BumpTrack {
  readonly baseOpenness: number | undefined;
  readonly readySeconds: number;
  readonly contestPosition: ContestPosition;
}

/**
 * Item d's window bump (D25), for one read-order receiver at the move tick: a man whose route has
 * reached its break (its rep resolved and the tick at or past his break) gains one burst step of
 * openness for his contest position, `route.opennessGainPerTick` times its burst multiple
 * (TRAILING 2 and EVEN 1, so +10 and +5; IN_FRONT 0). `undefined` when he gets none. The caller
 * adds it to the base inside the decayed openness, before the clamp, for the rest of the play.
 */
export function bumpFor(tunables: Tunables, track: BumpTrack, tick: number): number | undefined {
  if (track.baseOpenness === undefined || tick < track.readySeconds) return undefined;
  const bump = tunables.route.opennessGainPerTick * tunables.route.contestGain.byContest[track.contestPosition].burst;
  return bump > 0 ? bump : undefined;
}
