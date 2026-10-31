/**
 * THE pocket-1.s1 STREAM PINS (ADR-089 step 1, S-9; plan §9.2 and §15's S9).
 *
 * `POCKET_1_S1_DIGEST` pins the dials of `pocket-1.s1`, not the code that plays them. These pins
 * hold the code: the golden 50 games a league (`goldenGames`, caller v7) played under each of S-1's
 * arms, A1 to A4 (S with the window, S without it, L at R = 5, L at R = 8), folded as step 0 folds
 * the legacy streams (`golden.ts`: `foldDigests` of each game's `gameDigest`, the canonical form,
 * and of its `gameBytesDigest`, which also holds key order). They are exactly what
 * `pocket -- --step 1 --digests` prints for each arm and league, with the arm's stamp beside them.
 *
 * The suite (`test/pocketS1Pins.test.ts`) plays the first 10 games a league and checks their folds
 * (`first10`); under `FF_POCKET_ON=1` it plays all 50 and checks the 50-game folds too.
 *
 * THE RULE (plan §9.2 S-9, §16.4 K24). A later change that moves any of these pins plays a
 * different game under the same name, so it must give the changed rules a new name
 * (`pocket-1.s2`, say), with its own pins; these are never re-recorded under `pocket-1.s1` after
 * merge. A change of `DEFAULT_TUNABLES` that moves `POCKET_1_S1_DIGEST` but none of these pins may
 * re-record the digest under the same name (K24). Before merge only, a review-round fix may
 * re-record these pins in a named commit, and the PR then says that no `pocket-1.s1` save made
 * before it is carried on (plan §15, S9).
 *
 * MEASURED at 7b27840 on Node v22.22.0, by
 * `pnpm --filter @ff/calibration pocket -- --step 1 --digests --out <file>` (the 50-game folds,
 * events and stamps), and by a scratch run of the same `goldenGames` folds with `first: 10`, which
 * also showed the first 10 games of the 50-game run equal to a 10-game run (`first10`).
 */
import type { CallerVersion } from "../caller/anticipate.js";
import type { ArmId } from "./arms.js";
import type { GoldenLeague } from "./golden.js";

/** The tree the pins were measured at. A re-record (before merge only) changes it in the same named commit. */
export const POCKET_1_S1_PINS_MEASURED_AT = "7b27840";

/** One arm's stamp, as `runDigests` writes it. */
export interface S1PinStamp {
  readonly arm: ArmId;
  readonly rules: string;
  readonly overlayDigest: string;
  readonly tunablesDigest: string;
  /** `<tunableId>: <current> -> <proposed>` for every patch applied, in order. */
  readonly patches: readonly string[];
}

export interface S1PinFolds {
  /** `foldDigests` of the games' `gameDigest`s. */
  readonly canonicalFold: string;
  /** `foldDigests` of the games' `gameBytesDigest`s. */
  readonly byteFold: string;
  /** `{at, event}` entries over the games. */
  readonly events: number;
}

export interface S1PinLeague extends S1PinFolds {
  /** The golden games a league the 50-game folds cover. */
  readonly games: number;
  /** The same folds over the first 10 of those games, which the suite plays. */
  readonly first10: S1PinFolds;
}

export interface S1PinArm {
  readonly stamp: S1PinStamp;
  readonly leagues: Readonly<Record<GoldenLeague, S1PinLeague>>;
}

export type S1PinArmId = "A1" | "A2" | "A3" | "A4";

export interface S1Pins {
  readonly rules: "pocket-1.s1";
  readonly caller: CallerVersion;
  readonly measuredAt: string;
  readonly node: string;
  readonly arms: Readonly<Record<S1PinArmId, S1PinArm>>;
}

const folds = (canonicalFold: string, byteFold: string, events: number): S1PinFolds =>
  Object.freeze({ canonicalFold: `fnv1a:${canonicalFold}`, byteFold: `fnv1a:${byteFold}`, events });

const league = (canonicalFold: string, byteFold: string, events: number, first10: S1PinFolds): S1PinLeague =>
  Object.freeze({ games: 50, ...folds(canonicalFold, byteFold, events), first10 });

const stamp = (arm: S1PinArmId, overlayDigest: string, tunablesDigest: string): S1PinStamp =>
  Object.freeze({ arm, rules: "pocket-1.s1", overlayDigest: `fnv1a:${overlayDigest}`, tunablesDigest: `fnv1a:${tunablesDigest}`, patches: Object.freeze([]) });

/** S-9's pins: A1 to A4, both leagues, 50 games and the first 10 (MEASURED at 7b27840). */
export const POCKET_1_S1_PINS: S1Pins = Object.freeze({
  rules: "pocket-1.s1",
  caller: "v7",
  measuredAt: POCKET_1_S1_PINS_MEASURED_AT,
  node: "v22.22.0",
  arms: Object.freeze({
    A1: Object.freeze({
      stamp: stamp("A1", "69a7cc48", "ea6bc6e9"),
      leagues: Object.freeze({
        flat: league("f9534bb2", "ce8a0012", 369_433, folds("2964b9d0", "3ff5b0ab", 72_739)),
        gen: league("6274222b", "39f74544", 392_746, folds("2c65012c", "f889232e", 76_362)),
      }),
    }),
    A2: Object.freeze({
      stamp: stamp("A2", "1eb35444", "7edc0416"),
      leagues: Object.freeze({
        flat: league("59c5b645", "9390a685", 369_422, folds("236b2cc7", "3a8fd605", 72_724)),
        gen: league("c055c525", "11341439", 392_391, folds("14c6c5f5", "a1900f51", 76_367)),
      }),
    }),
    A3: Object.freeze({
      stamp: stamp("A3", "de2eb56e", "2b973a1e"),
      leagues: Object.freeze({
        flat: league("d71babbe", "5a02428f", 348_975, folds("e27ee1e8", "5b883f07", 69_025)),
        gen: league("8d05126d", "6f41b594", 369_988, folds("06e347a7", "d3e400b6", 74_896)),
      }),
    }),
    A4: Object.freeze({
      stamp: stamp("A4", "8aea8d2f", "8732d61c"),
      leagues: Object.freeze({
        flat: league("dff1c0ba", "4c6df371", 354_981, folds("6b0cf65a", "344102ed", 70_042)),
        gen: league("60bebaa6", "27401226", 376_987, folds("f4527a64", "94c9ffea", 75_200)),
      }),
    }),
  }),
});
