/**
 * THE pocket-1.s3 STREAM PINS (ADR-089 step 3, R-2; step-3 plan §6.2 and §9 commit 18).
 *
 * `POCKET_1_S3_DIGEST` pins the dials of `pocket-1.s3`, not the code that plays them. These pins
 * hold the code: the golden 50 games a league (`goldenGames`, caller v7) played under each of
 * step 3's arms, C1 to C16 (plan §5.1: C1 the design on B3, C2 the pricing arm on B6, C3 to C5 and
 * C7 to C10 the alone arms, C6 the Mug's other picture, C11 reading (c), C12 reading (a), C13 the
 * uniform delay, C14 the L basis on B5, C15 option A's information arm, C16 the climb lane alone),
 * folded as step 0 folds the legacy streams (`golden.ts`: `foldDigests` of each game's
 * `gameDigest`, the canonical form, and of its `gameBytesDigest`, which also holds key order), with
 * the same folds over the first 10 games.
 *
 * THE SNAP-PICTURE FOLD (plan §1.3 item 2 and §6.2 R-2; filing §2.7 items 6 and 9). The legacy,
 * s1 and s2 pins fold with `GOLDEN_STRIP`, which strips `PLAY_START.payload.snap`, where every man
 * stands at the snap (ADR-090). Under `pocket-1.s3` the free-run clock reads that picture, so a
 * change in where a man stands moves s3 games. These pins fold with `POCKET_1_S3_PIN_STRIP`, which
 * strips nothing: the picture, and every event, is in the fold, so a change of the picture fails
 * them even on a play whose physics it did not move. It cannot pass silently.
 *
 * Every arm is stamped `pocket-1.s3` with its own overlay digest but C13, which is revision 1's
 * uniform delay on B3 and is stamped `pocket-1.s2` (`S3_PIN_OTHER_RULES`). C1's overlay digest is
 * `POCKET_1_S3_DIGEST`. The bases step 3 re-plays are pinned elsewhere: A1 by S-9 (`s1Pins.ts`),
 * A5 and A11 by the base pins (`s1BasePins.ts`), B1 to B7 by the s2 pins (`s2Pins.ts`); R-1
 * checks them.
 *
 * The 50-game folds are exactly R-1's unstripped folds (`unstrippedCanonicalFold`,
 * `unstrippedByteFold`), and the events and stamps R-1's, as `pocket -- --step 3 --digests`
 * writes them for C1 to C16, each league.
 *
 * The suite (`test/pocketS3Pins.test.ts`) plays the first 10 games a league and checks their folds
 * (`first10`); under `FF_POCKET_ON=1` it plays all 50 and checks the 50-game folds too.
 *
 * THE RULE (the rule of `s1Pins.ts` and `s2Pins.ts`; step-3 plan §1.3 item 2). After merge,
 * these pins and `POCKET_1_S3_DIGEST` are never re-recorded under `pocket-1.s3`. A change that
 * moves any of them plays a different game, or stands a man elsewhere at the snap, under the same
 * name, so it must give the changed rules a new name with its own pins. Before merge only, a
 * review-round fix may re-record them in a named commit, and the PR then says that no
 * `pocket-1.s3` save made before it is carried on.
 *
 * MEASURED at 0fe4079 on Node v22.22.0 (source fingerprint `4f06dd3ec80adf28`), by R-1 (step-3 plan
 * §6.2): `pnpm --filter @ff/calibration pocket -- --step 3 --digests --out <file>` in two
 * processes at the same time, whose outputs are byte-identical (sha256
 * `216e27d6e01ed26e093aa6fdc0146a6e5586b5e18453836085e9f80788d6acba`) and whose A1, A5, A11 and B1
 * to B7 folds equal S-9's pins, the base pins and the s2 pins; and by a scratch run of the same
 * `goldenGames` folds, game by game, in a third process, whose 50-game folds (stripped and
 * unstripped) and events equal R-1's and which gives the first 10. The suite's 10-game run equals
 * the first 10 games of the 50-game run (`first10`).
 */
import type { CallerVersion } from "../caller/anticipate.js";
import type { Step3ArmId } from "./arms.js";
import type { StripEntry } from "./golden.js";
import type { S1PinArm, S1PinFolds, S1PinLeague, S1PinStamp } from "./s1Pins.js";

/** The tree the pins were measured at. A re-record (before merge only) changes it in the same named commit. */
export const POCKET_1_S3_PINS_MEASURED_AT = "0fe4079";

/**
 * What the s3 pins strip before digesting: nothing. The snap picture (`PLAY_START.payload.snap`),
 * which `GOLDEN_STRIP` strips for the legacy, s1 and s2 pins, is held (plan §6.2 R-2).
 */
export const POCKET_1_S3_PIN_STRIP: readonly StripEntry[] = Object.freeze([]);

/** Step 3's arms, C1 to C16: every one is pinned. */
export type S3PinArmId = Step3ArmId;

/** The arms stamped other than `pocket-1.s3`: C13, the uniform delay, is a `pocket-1.s2` bundle (plan §5.1). */
export const S3_PIN_OTHER_RULES: Readonly<Partial<Record<S3PinArmId, string>>> = Object.freeze({ C13: "pocket-1.s2" });

export interface S3Pins {
  readonly rules: "pocket-1.s3";
  readonly caller: CallerVersion;
  readonly measuredAt: string;
  readonly node: string;
  readonly arms: Readonly<Record<S3PinArmId, S1PinArm>>;
}

const folds = (canonicalFold: string, byteFold: string, events: number): S1PinFolds =>
  Object.freeze({ canonicalFold: `fnv1a:${canonicalFold}`, byteFold: `fnv1a:${byteFold}`, events });

const league = (canonicalFold: string, byteFold: string, events: number, first10: S1PinFolds): S1PinLeague =>
  Object.freeze({ games: 50, ...folds(canonicalFold, byteFold, events), first10 });

const stamp = (arm: S3PinArmId, overlayDigest: string, tunablesDigest: string, patches: readonly string[], rules: string = "pocket-1.s3"): S1PinStamp =>
  Object.freeze({ arm, rules, overlayDigest: `fnv1a:${overlayDigest}`, tunablesDigest: `fnv1a:${tunablesDigest}`, patches: Object.freeze([...patches]) });

const HALF = "arrival.collapsingWithinSeconds: 1 -> 0.5";
const FOLLOWS = "arrival.pressureWithinSeconds: 2 -> 1";

/** R-2's pins: C1 to C16, both leagues, 50 games and the first 10, the snap picture held (MEASURED at 0fe4079; see the header). */
export const POCKET_1_S3_PINS: S3Pins = Object.freeze({
  rules: "pocket-1.s3",
  caller: "v7",
  measuredAt: POCKET_1_S3_PINS_MEASURED_AT,
  node: "v22.22.0",
  arms: Object.freeze({
    C1: Object.freeze({
      stamp: stamp("C1", "c4462712", "96c5e20b", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("ccd918d5", "7cc640fb", 376_847, folds("68bdeb6f", "23f5638f", 74_393)),
        gen: league("9314aa8d", "eda206f1", 392_728, folds("851e9a53", "cbe7db42", 78_059)),
      }),
    }),
    C2: Object.freeze({
      stamp: stamp("C2", "113441e6", "0ad692d7", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("e7b494aa", "1fda6c7e", 433_780, folds("61e17711", "0ca6981f", 85_242)),
        gen: league("64bb258d", "36f305dc", 447_224, folds("d237fde6", "25bec57d", 88_765)),
      }),
    }),
    C3: Object.freeze({
      stamp: stamp("C3", "872d3e1c", "a5450153", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("d5e44cee", "e73c71da", 370_506, folds("82cce427", "498bda9d", 72_165)),
        gen: league("c633908c", "b7b99029", 393_225, folds("89d5dd9e", "81f832b3", 77_834)),
      }),
    }),
    C4: Object.freeze({
      stamp: stamp("C4", "22305c84", "74c5a65b", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("fc9f6583", "0d813bb2", 370_039, folds("0eb4cd88", "9503b67b", 71_268)),
        gen: league("3bb3ebd7", "cf9186bf", 392_784, folds("86326bef", "4c9cda98", 77_310)),
      }),
    }),
    C5: Object.freeze({
      stamp: stamp("C5", "1d05d747", "01a9db65", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("7fc6a028", "5517c323", 369_970, folds("d10b2b23", "1dbcec21", 71_247)),
        gen: league("a686cef4", "5c427806", 393_372, folds("5f920d26", "d5d3d64a", 77_748)),
      }),
    }),
    C6: Object.freeze({
      stamp: stamp("C6", "666bdc50", "4cdf2998", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("d821defc", "71f4682d", 378_321, folds("26b89d87", "7dfb2d54", 74_688)),
        gen: league("9710e05d", "6af70a38", 393_054, folds("0ce5c3a0", "9b2f724c", 77_754)),
      }),
    }),
    C7: Object.freeze({
      stamp: stamp("C7", "f1a1c6be", "7bf3f089", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("8691b297", "68fac080", 367_340, folds("baf528eb", "525189d2", 71_299)),
        gen: league("4f8d0182", "c8a91488", 395_092, folds("a8e4c20b", "56e037dd", 79_208)),
      }),
    }),
    C8: Object.freeze({
      stamp: stamp("C8", "fd25b531", "c281bda7", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("21b988b2", "e5681bd0", 374_645, folds("5e888c53", "fc0b492e", 74_939)),
        gen: league("afc8a670", "d086327b", 396_789, folds("1a36dfc3", "e09a700f", 77_378)),
      }),
    }),
    C9: Object.freeze({
      stamp: stamp("C9", "f8117e51", "9a86ab1b", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("161d4d3b", "ecc41a34", 367_750, folds("5d519d65", "613c96b5", 72_266)),
        gen: league("3ea3017c", "105459e7", 391_890, folds("5e0a69b4", "8e2518ac", 77_414)),
      }),
    }),
    C10: Object.freeze({
      stamp: stamp("C10", "2b32f412", "09ae2686", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("1d4633a0", "173baf42", 368_546, folds("20c4fd28", "55e31c49", 71_920)),
        gen: league("1d3af85d", "4a03e6e8", 398_777, folds("d623912e", "ce58edda", 78_707)),
      }),
    }),
    C11: Object.freeze({
      stamp: stamp("C11", "a8d97913", "e9b8a55d", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("c7f73540", "373fa7e9", 373_236, folds("5f4cfc6d", "f0554a84", 73_708)),
        gen: league("4242fd53", "89201aae", 393_671, folds("37644820", "7d645d2f", 76_957)),
      }),
    }),
    C12: Object.freeze({
      stamp: stamp("C12", "1415c66d", "f36e07ad", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("0991afdb", "43a80a9b", 382_922, folds("2c355203", "5a257199", 75_695)),
        gen: league("ff028b83", "2ee00902", 403_330, folds("c3f139a5", "5aadc9e8", 80_863)),
      }),
    }),
    C13: Object.freeze({
      stamp: stamp("C13", "f0df4c3f", "78f9ac02", [
        HALF,
        FOLLOWS,
        "blitzPickup.bands.2.arrivalDelaySeconds: 0.5 -> 3",
        "blitzPickup.bands.3.arrivalDelaySeconds: 0 -> 2.5",
        "stunt.bands.2.arrivalDelaySeconds: 0.5 -> 2.5",
        "stunt.bands.3.arrivalDelaySeconds: 0 -> 2",
      ], "pocket-1.s2"),
      leagues: Object.freeze({
        flat: league("54ee607f", "10845dd5", 376_959, folds("4f0c3d65", "c1a5015b", 75_736)),
        gen: league("6d251698", "a5ea9da5", 407_858, folds("a8ec205f", "44090720", 79_990)),
      }),
    }),
    C14: Object.freeze({
      stamp: stamp("C14", "fb5b8611", "0b042bac", [
        "pocket.minimumStatusByBand.BLOCKER_BEATEN: PRESSURE -> CLEAN",
        "passRush.pressureProgressByBand.RUSHER_GAINING.delta: 1 -> 0",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("706840fe", "b4f3e98e", 356_833, folds("e85f57b0", "bfb74970", 71_147)),
        gen: league("a233aab2", "5cd0ed80", 376_128, folds("8c471b76", "3b495696", 77_309)),
      }),
    }),
    C15: Object.freeze({
      stamp: stamp("C15", "d2e66f55", "e9e4f0a8", [
        HALF,
        FOLLOWS,
        "blitzPickup.bands.0.minMargin: 15 -> -15",
        "blitzPickup.bands.1.minMargin: 0 -> -30",
        "blitzPickup.bands.2.minMargin: -19 -> -49",
        "stunt.bands.0.minMargin: 20 -> -10",
        "stunt.bands.1.minMargin: 0 -> -30",
        "stunt.bands.2.minMargin: -19 -> -49",
      ]),
      leagues: Object.freeze({
        flat: league("e8388317", "c8bc73ed", 378_761, folds("8e74993e", "e4a1e896", 75_879)),
        gen: league("c2175f5b", "d9f618ad", 409_200, folds("afea4b53", "538c8ed5", 82_495)),
      }),
    }),
    C16: Object.freeze({
      stamp: stamp("C16", "180156aa", "b4c30335", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("6a4d7dec", "016066d8", 370_298, folds("847b96ff", "e68c8710", 73_952)),
        gen: league("ea6e9124", "cac7e974", 391_756, folds("67e5ac83", "3eef0b43", 76_920)),
      }),
    }),
  }),
});
