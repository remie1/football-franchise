/**
 * THE pocket-1.s4 STREAM PINS (ADR-089 step 4, R-2; step-4 plan §7.2).
 *
 * `POCKET_1_S4_DIGEST` pins the dials of `pocket-1.s4`, not the code that plays them. These pins
 * hold the code: the golden 50 games a league (`goldenGames`, caller v7) played under each of step
 * 4's arms, D1 to D17 (plan §4: D1 the design on C1, D2 the pricing build on C2, D3 and D4 contact
 * alone on today's line, D5 and D6 the motion alone, D7 and D8 contact alone, D9 to D11 one tilt
 * each, D12 to D16 the design's variations, D17 shape L), folded as step 3's pins fold them
 * (`golden.ts`: `foldDigests` of each game's `gameDigest`, the canonical form, and of its
 * `gameBytesDigest`, which also holds key order), with the same folds over the first 10 games.
 *
 * THE SNAP-PICTURE FOLD (as `s3Pins.ts`). Every D arm plays on step 3's build or on today's line
 * with contact, and the s3 free-run clock reads `PLAY_START.payload.snap`, so these pins fold with
 * `POCKET_1_S4_PIN_STRIP`, which strips nothing: the picture, `QB_HIT`, the `arrival_contest` CHECK
 * and `releaseSeconds` (petitions P6, P7 and P8, with P8a's wording) are all in the fold. A change of
 * the picture fails them even on a play whose physics it did not move.
 *
 * Every arm is stamped `pocket-1.s4` with its own overlay digest; D1's is `POCKET_1_S4_DIGEST`. The
 * bases step 4 re-plays (A0, A14, A1, A11, C1, C2 and C14) are pinned elsewhere or not at all: A1 by
 * S-9 (`s1Pins.ts`), A11 by the base pins (`s1BasePins.ts`), C1, C2 and C14 by the s3 pins
 * (`s3Pins.ts`), and A0 is the legacy golden fixture.
 *
 * `pocket -- --step 4 --digests` (R-1) writes each arm's folds with the picture stripped only, so
 * the 50-game folds here, and the first-10 folds, come from a scratch run of the same
 * `goldenGames` folds, game by game, in a third process beside R-1's two, whose stripped 50-game
 * folds and events equal R-1's for every arm and league.
 *
 * The suite (`test/pocketS4Pins.test.ts`) plays the first 10 games a league and checks their folds
 * (`first10`); under `FF_POCKET_ON=1` it plays all 50 and checks the 50-game folds too.
 *
 * THE RULE (the rule of `s1Pins.ts`, `s2Pins.ts` and `s3Pins.ts`). After merge, these pins and
 * `POCKET_1_S4_DIGEST` are never re-recorded under `pocket-1.s4`. A change that moves any of them
 * plays a different game, or stands a man elsewhere at the snap, under the same name, so it must
 * give the changed rules a new name with its own pins. Before merge only, a review-round fix may
 * re-record them in a named commit, and the PR then says that no `pocket-1.s4` save made before it
 * is carried on.
 *
 * MEASURED at 0f078a1 on Node v22.22.0 (source fingerprint `95cdf2b765670354`), by R-1:
 * `pnpm --filter @ff/calibration pocket -- --step 4 --digests --out <file>` in two processes at the
 * same time, whose outputs are byte-identical (sha256
 * `1f3b248b6fb01753d6d099f4dd3e8812f41331b25be0e653ee0be02976403e2e`), and by the scratch per-game
 * run in a third process described above.
 */
import type { CallerVersion } from "../caller/anticipate.js";
import type { Step4ArmId } from "./arms.js";
import type { StripEntry } from "./golden.js";
import type { S1PinArm, S1PinFolds, S1PinLeague, S1PinStamp } from "./s1Pins.js";

/** The tree the pins were measured at. A re-record (before merge only) changes it in the same named commit. */
export const POCKET_1_S4_PINS_MEASURED_AT = "0f078a1";

/**
 * What the s4 pins strip before digesting: nothing. The snap picture (`PLAY_START.payload.snap`),
 * which `GOLDEN_STRIP` strips for the legacy, s1 and s2 pins, is held, as in the s3 pins.
 */
export const POCKET_1_S4_PIN_STRIP: readonly StripEntry[] = Object.freeze([]);

/** Step 4's arms, D1 to D17: every one is pinned. */
export type S4PinArmId = Step4ArmId;

export interface S4Pins {
  readonly rules: "pocket-1.s4";
  readonly caller: CallerVersion;
  readonly measuredAt: string;
  readonly node: string;
  readonly arms: Readonly<Record<S4PinArmId, S1PinArm>>;
}

const folds = (canonicalFold: string, byteFold: string, events: number): S1PinFolds =>
  Object.freeze({ canonicalFold: `fnv1a:${canonicalFold}`, byteFold: `fnv1a:${byteFold}`, events });

const league = (canonicalFold: string, byteFold: string, events: number, first10: S1PinFolds): S1PinLeague =>
  Object.freeze({ games: 50, ...folds(canonicalFold, byteFold, events), first10 });

const stamp = (arm: S4PinArmId, overlayDigest: string, tunablesDigest: string, patches: readonly string[], rules: string = "pocket-1.s4"): S1PinStamp =>
  Object.freeze({ arm, rules, overlayDigest: `fnv1a:${overlayDigest}`, tunablesDigest: `fnv1a:${tunablesDigest}`, patches: Object.freeze([...patches]) });

const HALF = "arrival.collapsingWithinSeconds: 1 -> 0.5";
const FOLLOWS = "arrival.pressureWithinSeconds: 2 -> 1";

/** R-2's pins: D1 to D17, both leagues, 50 games and the first 10, the snap picture held (MEASURED at 0f078a1; see the header). */
export const POCKET_1_S4_PINS: S4Pins = Object.freeze({
  rules: "pocket-1.s4",
  caller: "v7",
  measuredAt: POCKET_1_S4_PINS_MEASURED_AT,
  node: "v22.22.0",
  arms: Object.freeze({
    D1: Object.freeze({
      stamp: stamp("D1", "8edb4bad", "d272d22a", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("8132b8bc", "817c88f8", 376_265, folds("414f6216", "f09f8596", 76_155)),
        gen: league("81224c78", "1ab92b0e", 402_784, folds("a904b83d", "f2153af3", 80_861)),
      }),
    }),
    D2: Object.freeze({
      stamp: stamp("D2", "77078ccd", "4e5c3437", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("0954cb1b", "ac04f2d0", 444_366, folds("b69175d2", "29b526b0", 87_102)),
        gen: league("cba1d1bf", "5045f69e", 458_587, folds("9a09049d", "a2440e36", 93_056)),
      }),
    }),
    D3: Object.freeze({
      stamp: stamp("D3", "bd826c92", "62f37b5b", []),
      leagues: Object.freeze({
        flat: league("bc32a5e7", "9af4805a", 295_874, folds("2c1381f3", "240fb4b4", 58_993)),
        gen: league("8d8019f5", "9c95614d", 322_155, folds("70412da0", "2e090248", 62_677)),
      }),
    }),
    D4: Object.freeze({
      stamp: stamp("D4", "0a708766", "f3f2cb9c", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
      ]),
      leagues: Object.freeze({
        flat: league("9425d039", "a0d9b73f", 278_997, folds("e5631487", "b4e2c226", 55_623)),
        gen: league("a88dcd47", "fceb9292", 297_910, folds("89cc98b4", "d2d3dc0e", 59_634)),
      }),
    }),
    D5: Object.freeze({
      stamp: stamp("D5", "0cdfdf16", "e397e517", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("68dadd21", "8806f7ad", 377_893, folds("e12bf76b", "dd5ac3f3", 75_084)),
        gen: league("84bd60ca", "0695cf72", 399_749, folds("51881681", "bcdbafcf", 79_111)),
      }),
    }),
    D6: Object.freeze({
      stamp: stamp("D6", "51a43512", "221027b1", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("0623f6b5", "88ecdd03", 431_201, folds("efca14e5", "5d5e62c0", 84_753)),
        gen: league("8d22c5ff", "3ed2b8a8", 446_455, folds("7964ec61", "23ccb53d", 89_560)),
      }),
    }),
    D7: Object.freeze({
      stamp: stamp("D7", "28ae3f19", "220ae569", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("aa0294e5", "3f83eb23", 373_868, folds("46cb40f1", "cfa4a603", 74_837)),
        gen: league("a24acc0a", "86b07c7e", 398_431, folds("2cc82a1a", "13ac16d2", 80_304)),
      }),
    }),
    D8: Object.freeze({
      stamp: stamp("D8", "f3a1dd6c", "02379efd", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("758a6256", "db66084d", 444_528, folds("d0945cdc", "8efcbb51", 87_233)),
        gen: league("e8b464f6", "b4178c0a", 452_036, folds("9a5cfcf2", "22a9ba13", 88_874)),
      }),
    }),
    D9: Object.freeze({
      stamp: stamp("D9", "49f90143", "3b62480e", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("51e9f2dd", "83947d5a", 444_528, folds("2b490339", "3a14ecc1", 87_233)),
        gen: league("a24c1129", "bb6d0128", 452_502, folds("fb57b430", "b2b5d502", 88_874)),
      }),
    }),
    D10: Object.freeze({
      stamp: stamp("D10", "aec6d541", "8ac24d35", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("3af9807f", "2c8600e1", 442_572, folds("deed0083", "d7cf4a72", 87_202)),
        gen: league("22053ddd", "631d09ad", 452_071, folds("9b334451", "00094207", 88_426)),
      }),
    }),
    D11: Object.freeze({
      stamp: stamp("D11", "7ac9f439", "d44985ce", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("69531cab", "899d7a85", 444_528, folds("e8e63636", "533d14f4", 87_233)),
        gen: league("637dcfe3", "c935d5b9", 452_036, folds("6067244e", "5f3115b2", 88_874)),
      }),
    }),
    D12: Object.freeze({
      stamp: stamp("D12", "8379d2ba", "fbfaee79", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("59aa2feb", "24c8c0f8", 376_428, folds("1a6aa0a2", "a724ddb5", 76_155)),
        gen: league("f2859674", "ad3f6c5e", 401_707, folds("a73b07ef", "14934504", 80_861)),
      }),
    }),
    D13: Object.freeze({
      stamp: stamp("D13", "651da064", "0272bf88", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("5b4d6cfd", "80554c66", 376_641, folds("a123d674", "ca5e7693", 76_157)),
        gen: league("61f2db9e", "49746025", 400_855, folds("41250a11", "02310da9", 79_394)),
      }),
    }),
    D14: Object.freeze({
      stamp: stamp("D14", "e2a8022e", "c6932910", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("e8626e68", "244c2271", 375_299, folds("6a54405f", "80d70b34", 75_794)),
        gen: league("e91f1815", "c266280c", 400_111, folds("6534672a", "eca1b9ed", 79_107)),
      }),
    }),
    D15: Object.freeze({
      stamp: stamp("D15", "ab8f1fd3", "cfb65d53", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("36e04136", "0685e158", 440_276, folds("9d5cf6b0", "cebfde79", 85_226)),
        gen: league("00ae6544", "c772f361", 455_198, folds("1fb3972c", "a90cbda7", 90_437)),
      }),
    }),
    D16: Object.freeze({
      stamp: stamp("D16", "198bf08e", "b1ebed10", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("225c396f", "e341860a", 445_063, folds("a463cc83", "3449b7bf", 87_476)),
        gen: league("fa8b8937", "3515825b", 460_646, folds("4287ed5c", "3c7d4dc3", 92_745)),
      }),
    }),
    D17: Object.freeze({
      stamp: stamp("D17", "cc466bb8", "e97710d9", [
        "pocket.minimumStatusByBand.BLOCKER_BEATEN: PRESSURE -> CLEAN",
        "passRush.pressureProgressByBand.RUSHER_GAINING.delta: 1 -> 0",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("911eee2c", "20d31395", 358_214, folds("d0764e7d", "768b76a4", 71_619)),
        gen: league("3a060d33", "ec723526", 380_718, folds("51dd7bdc", "4bd7de9d", 76_594)),
      }),
    }),
  }),
});
