/**
 * THE pocket-1.s6 STREAM PINS (ADR-089 step 6, R-1 and R-2; step-6 plan §8.2, §10.1 item 7): AN EMPTY
 * SCAFFOLD in this build.
 *
 * `POCKET_1_S6_DIGEST` will pin the dials of `pocket-1.s6`; these pins will hold the code: the golden
 * 50 games a league (`goldenGames`, caller v7) played under the arms R-1 names (`S6_PIN_ARM_IDS`: H0,
 * the parts alone H1 to H12, the probes H13 to H15, H2L, H0M, the bench's HB0 and HB2L), folded as
 * the step-5 pins fold them (`golden.ts`: `foldDigests` of each game's `gameDigest` and of its
 * `gameBytesDigest`, with the same folds over the first 10 games), each arm's stamp carrying its
 * rating overrides' digest and its mirror beside its overlay digest (plan §8.2 R-1: two arms with one
 * overlay digest differ there). Like the s3 to s5a pins they strip nothing (`POCKET_1_S6_PIN_STRIP`).
 *
 * Nothing in this build plays a step-6 arm: each waits on the owner's typed yes for P9 to P12 and
 * P20 (P21 on the unseen answer), contracts-guardian's review and the lift, which sets the petition
 * flags, records `POCKET_1_S6_DIGEST` and adds `pocket-1.s6` to `ENGINE_RULES` (plan §10.1 items 3
 * to 7). So `POCKET_1_S6_PINS` is `null` and nothing is MEASURED: the pins are filled only after the
 * lift, by R-1 (`pnpm --filter @ff/calibration pocket -- --step 6 --digests --out <file>`, in two
 * processes whose outputs are byte-identical; `step6.ts`'s `runStep6Digests` writes the 50-game folds
 * and the first-10 folds the suite reads, with each arm's stamp), in one named commit that sets
 * `POCKET_1_S6_PINS_MEASURED_AT` too. A test ties the scaffold to the flags: the pins stay `null`
 * while `POCKET_1_S6_DIGEST` is unset and no step-6 petition is in.
 *
 * THE RULE (as `s1Pins.ts` to `s5Pins.ts`). Once filled and merged, these pins and
 * `POCKET_1_S6_DIGEST` are never re-recorded under `pocket-1.s6`: a change that moves any of them
 * plays a different game under the same name, so it gives the changed rules a new name with its own
 * pins. Before merge only, a review-round fix may re-record them in a named commit.
 */
import type { CallerVersion } from "../caller/anticipate.js";
import type { StripEntry } from "./golden.js";
import type { S1PinArm, S1PinStamp } from "./s1Pins.js";

/** The tree the pins were measured at: none in this build (they are filled after the lift). */
export const POCKET_1_S6_PINS_MEASURED_AT: string | null = null;

/** What the s6 pins strip before digesting: nothing (the snap picture held, as in the s3 to s5a pins). */
export const POCKET_1_S6_PIN_STRIP: readonly StripEntry[] = Object.freeze([]);

/**
 * The arms R-1 plays on the golden 50 a league and R-2 pins (plan §8.2): H0, each part alone, the
 * probes, H2L and H0M on the league, and the bench's HB0 and HB2L.
 */
export const S6_PIN_ARM_IDS = Object.freeze([
  "H0", "H1", "H2", "H3", "H4", "H5", "H6", "H7", "H8", "H9", "H10", "H11", "H12", "H13", "H14", "H15", "H2L", "H0M", "HB0", "HB2L",
] as const);
export type S6PinArmId = (typeof S6_PIN_ARM_IDS)[number];

/** One arm's stamp as R-1 writes it: step 1's, with the rating overrides' digest and the mirror (two arms with one overlay digest differ there). */
export interface S6PinStamp extends S1PinStamp {
  readonly ratingOverridesDigest: string;
  readonly mirror: boolean;
}

export interface S6PinArm extends Omit<S1PinArm, "stamp"> {
  readonly stamp: S6PinStamp;
}

export interface S6Pins {
  readonly rules: "pocket-1.s6";
  readonly caller: CallerVersion;
  readonly measuredAt: string;
  readonly node: string;
  readonly arms: Readonly<Record<S6PinArmId, S6PinArm>>;
}

/** R-2's pins: `null` until the lift (see the header); filled in one named commit, MEASURED by R-1. */
export const POCKET_1_S6_PINS: S6Pins | null = null;
