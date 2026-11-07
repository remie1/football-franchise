/**
 * ADR-089 step 5a: THE STEP-5 TEST BLOCKS (plan §1.2), built by hand for the engine's tests.
 *
 * `CLEAN_POCKET_FILED` is the design's block, every part on with the drop floor and the reset
 * 1.0 s (D33); `CLEAN_POCKET_OFF` is every part off with no floor (the all-off proof's block, which
 * plays today's count). `withCleanPocket` adds the key to `pocket` only when given, never as
 * `undefined`, as `withStep4` does.
 */
import type { CleanPocketTunables, DropFloorTunables, Tunables } from "../src/tunables.js";

/** The drop floor by first-read depth (§4.6, CHOSEN): 1.0, 1.5, 2.0, 2.0 s. */
export const DROP_FLOOR_FILED: DropFloorTunables = Object.freeze({ QUICK: 1.0, SHORT: 1.5, INTERMEDIATE: 2.0, DEEP: 2.0 });

/** The design's block (`pocket-1.s5a`'s checklist): every part on, the reset 1.0 s, the floor. */
export const CLEAN_POCKET_FILED: CleanPocketTunables = Object.freeze({
  d23: true,
  expiryBar: 30,
  move: true,
  resetSeconds: 1.0,
  bump: true,
  breakOut: true,
  d23OnRun: true,
  dropFloor: DROP_FLOOR_FILED,
});

/** Every part off and no floor: the block present, today's count played. */
export const CLEAN_POCKET_OFF: CleanPocketTunables = Object.freeze({
  d23: false,
  expiryBar: 30,
  move: false,
  resetSeconds: 1.0,
  bump: false,
  breakOut: false,
  d23OnRun: false,
});

/** `base` with `pocket.cleanPocket` set to `block`. Nothing is checked here (refusal tests cast at the call site). */
export function withCleanPocket(base: Tunables, block: unknown): Tunables {
  return { ...base, pocket: { ...base.pocket, cleanPocket: block as CleanPocketTunables } };
}
