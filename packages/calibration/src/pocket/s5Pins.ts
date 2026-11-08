/**
 * THE pocket-1.s5a STREAM PINS (ADR-089 step 5, R-2; step-5 plan §1.1, §7.2, §9 item 8).
 *
 * `POCKET_1_S5A_DIGEST` pins the dials of `pocket-1.s5a`, not the code that plays them. These pins
 * hold the code: the golden 50 games a league (`goldenGames`, caller v7) played under every arm
 * stamped `pocket-1.s5a` on the league, the 5b grid F1 to F14 (plan §5.2: F1 to F9 shape S at theta
 * 7 to 15, F5 being `pocket-1.s5a` itself at theta 11; F10 to F14 shape L), folded as the step-4
 * pins fold them (`golden.ts`: `foldDigests` of each game's `gameDigest`, the canonical form, and of
 * its `gameBytesDigest`, which also holds key order), with the same folds over the first 10 games.
 * Every grid point carries the 5a fit's three read-system deltas (`POCKET_1_S5A_LEAVES`) and the
 * clean-pocket checklist with the drop floor; they differ only in the block clock.
 *
 * THE SNAP-PICTURE FOLD (as `s3Pins.ts` and `s4Pins.ts`). Every F arm plays on step 4's build, whose
 * free-run clock reads `PLAY_START.payload.snap`, so these pins fold with `POCKET_1_S5A_PIN_STRIP`,
 * which strips nothing: the picture, the clean pick's `:clean` CHECKs and every other event are in
 * the fold. A change of the picture fails them even on a play whose physics it did not move.
 *
 * Every arm is stamped `pocket-1.s5a` with its own overlay digest; F5's is `POCKET_1_S5A_DIGEST`,
 * and its tunables are the named bundle's (`rulesTunables("pocket-1.s5a")`), the build a season or
 * an export plays under `--engine-rules pocket-1.s5a`. The bench arms (E0 to E10) are not pinned
 * here: they are the 5a records' arms, and R-1 plays E0 and E9 only as a determinism check. The 5b
 * build (`pocket-1.s5b`, F0, G1 and G2) is pinned in the selection commit (`POCKET_1_S5B_PINS`).
 *
 * `pocket -- --step 5b --digests` (R-1) writes each arm's folds with the picture stripped only, so
 * the 50-game folds here, and the first-10 folds, come from a scratch run of the same
 * `goldenGames` folds, game by game, in a third process beside R-1's two, whose stripped 50-game
 * folds and events equal R-1's for every arm and league.
 *
 * The suite (`test/pocketS5Pins.test.ts`) plays the first 10 games a league and checks their folds
 * (`first10`); under `FF_POCKET_ON=1` it plays all 50 and checks the 50-game folds too.
 *
 * THE RULE (the rule of `s1Pins.ts` to `s4Pins.ts`). After merge, these pins and
 * `POCKET_1_S5A_DIGEST` are never re-recorded under `pocket-1.s5a`. A change that moves any of them
 * plays a different game, or stands a man elsewhere at the snap, under the same name, so it must
 * give the changed rules a new name with its own pins. Before merge only, a review-round fix may
 * re-record them in a named commit, and the PR then says that no `pocket-1.s5a` save made before it
 * is carried on.
 *
 * MEASURED at dd79f2c (the 5a fit commit) on Node v22.22.0 (source fingerprint `41ecb2d591ad3c8d`),
 * by R-1: `pnpm --filter @ff/calibration pocket -- --step 5b --digests --out <file>` in two
 * processes at the same time, whose outputs are byte-identical (sha256
 * `055d9c9c868deaa3f5adb04d4852e6130afa81ba6e17f8415c4a347037cbfbb6`), and by the scratch per-game
 * run in a third process described above.
 */
import type { CallerVersion } from "../caller/anticipate.js";
import type { StripEntry } from "./golden.js";
import type { S1PinArm, S1PinFolds, S1PinLeague, S1PinStamp } from "./s1Pins.js";

/** The tree the pins were measured at. A re-record (before merge only) changes it in the same named commit. */
export const POCKET_1_S5A_PINS_MEASURED_AT = "dd79f2c";

/**
 * What the s5a pins strip before digesting: nothing. The snap picture (`PLAY_START.payload.snap`),
 * which `GOLDEN_STRIP` strips for the legacy, s1 and s2 pins, is held, as in the s3 and s4 pins.
 */
export const POCKET_1_S5A_PIN_STRIP: readonly StripEntry[] = Object.freeze([]);

/** The arms stamped `pocket-1.s5a` on the league: the 5b grid, F1 to F14 (`STEP5_GRID_IDS`). Every one is pinned. */
export const S5A_PIN_ARM_IDS = Object.freeze(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12", "F13", "F14"] as const);
export type S5aPinArmId = (typeof S5A_PIN_ARM_IDS)[number];

export interface S5aPins {
  readonly rules: "pocket-1.s5a";
  readonly caller: CallerVersion;
  readonly measuredAt: string;
  readonly node: string;
  readonly arms: Readonly<Record<S5aPinArmId, S1PinArm>>;
}

const folds = (canonicalFold: string, byteFold: string, events: number): S1PinFolds =>
  Object.freeze({ canonicalFold: `fnv1a:${canonicalFold}`, byteFold: `fnv1a:${byteFold}`, events });

const league = (canonicalFold: string, byteFold: string, events: number, first10: S1PinFolds): S1PinLeague =>
  Object.freeze({ games: 50, ...folds(canonicalFold, byteFold, events), first10 });

const stamp = (arm: S5aPinArmId, overlayDigest: string, tunablesDigest: string, patches: readonly string[], rules: string = "pocket-1.s5a"): S1PinStamp =>
  Object.freeze({ arm, rules, overlayDigest: `fnv1a:${overlayDigest}`, tunablesDigest: `fnv1a:${tunablesDigest}`, patches: Object.freeze([...patches]) });

/** The 5a fit's three deltas as the arms list them (`POCKET_1_S5A_LEAVES`): every grid point carries them. */
const LEAVES = [
  "qb.readSystem.HALF_FIELD.budgetDeltaSeconds: -0.5 -> 0.5",
  "qb.readSystem.FULL_FIELD.budgetDeltaSeconds: 1 -> 0",
  "qb.readSystem.CONCEPT.budgetDeltaSeconds: -1 -> -1.25",
];

/** R-2's pins: F1 to F14, both leagues, 50 games and the first 10, the snap picture held (MEASURED at dd79f2c; see the header). */
export const POCKET_1_S5A_PINS: S5aPins = Object.freeze({
  rules: "pocket-1.s5a",
  caller: "v7",
  measuredAt: POCKET_1_S5A_PINS_MEASURED_AT,
  node: "v22.22.0",
  arms: Object.freeze({
    F1: Object.freeze({
      stamp: stamp("F1", "1360e738", "37737158", LEAVES),
      leagues: Object.freeze({
        flat: league("333b613b", "c38e55e0", 382_386, folds("bab7f005", "0b3f8295", 78_384)),
        gen: league("a0af7939", "7e5ed646", 409_158, folds("954ecc21", "9e80cb1e", 82_296)),
      }),
    }),
    F2: Object.freeze({
      stamp: stamp("F2", "71dc048b", "7a8d11f1", LEAVES),
      leagues: Object.freeze({
        flat: league("65953887", "425457ff", 386_087, folds("a531c8ee", "89a0cedb", 78_478)),
        gen: league("9c68a74d", "88dbccd5", 410_305, folds("96a17e8b", "a36d3831", 82_083)),
      }),
    }),
    F3: Object.freeze({
      stamp: stamp("F3", "483764f2", "5b58b481", LEAVES),
      leagues: Object.freeze({
        flat: league("a12faefc", "798ae9ea", 381_734, folds("e2e76b39", "db6c6aee", 77_403)),
        gen: league("fe78fce1", "6d61def5", 408_771, folds("66820e85", "19f78f61", 83_824)),
      }),
    }),
    F4: Object.freeze({
      stamp: stamp("F4", "332f2222", "a05a8fb5", LEAVES),
      leagues: Object.freeze({
        flat: league("e0f0820d", "41bfbc02", 384_021, folds("95b641da", "cfce3317", 78_246)),
        gen: league("375908d3", "a69d2a7f", 410_173, folds("28fbfe1d", "04244fdf", 82_395)),
      }),
    }),
    F5: Object.freeze({
      stamp: stamp("F5", "972b8b3b", "2739baa5", LEAVES),
      leagues: Object.freeze({
        flat: league("c96ce876", "f81c6350", 383_457, folds("44bb5465", "58063c99", 76_497)),
        gen: league("579aa42f", "01ad6a16", 404_564, folds("d18fc645", "fe501d17", 81_454)),
      }),
    }),
    F6: Object.freeze({
      stamp: stamp("F6", "665f21fc", "824a3c38", LEAVES),
      leagues: Object.freeze({
        flat: league("ad8d191b", "bf4ed54d", 382_990, folds("250dae04", "5309452f", 76_534)),
        gen: league("cb1fb3cf", "2bcd24e3", 401_924, folds("48f3b661", "fa6786e6", 80_221)),
      }),
    }),
    F7: Object.freeze({
      stamp: stamp("F7", "f1b2e6e5", "42eb8050", LEAVES),
      leagues: Object.freeze({
        flat: league("fa81929a", "455ab7ef", 383_410, folds("8f9d24db", "adbaf84c", 78_518)),
        gen: league("a9a7ec47", "8ff78bde", 406_743, folds("e518df9f", "c2b57a47", 80_850)),
      }),
    }),
    F8: Object.freeze({
      stamp: stamp("F8", "678fbd66", "86262ed8", LEAVES),
      leagues: Object.freeze({
        flat: league("b3e110b6", "9a68a37d", 383_072, folds("0d909aa2", "6febbf90", 77_759)),
        gen: league("51e58cca", "c706c056", 408_877, folds("03ffb9bb", "74e1c3b0", 80_450)),
      }),
    }),
    F9: Object.freeze({
      stamp: stamp("F9", "41a5ceff", "390a0eab", LEAVES),
      leagues: Object.freeze({
        flat: league("b78ba556", "ca8de6a8", 380_726, folds("58b54a8d", "a60b6fab", 76_960)),
        gen: league("09808706", "2ec579da", 409_807, folds("f8ad12b4", "865e8af8", 81_085)),
      }),
    }),
    F10: Object.freeze({
      stamp: stamp("F10", "43c8c074", "a863e233", LEAVES),
      leagues: Object.freeze({
        flat: league("e658dd6d", "733a3d97", 369_345, folds("8da61a7b", "96de3c73", 73_897)),
        gen: league("d9a5b880", "27a6aa8c", 399_431, folds("d6280a55", "5bb552ef", 79_537)),
      }),
    }),
    F11: Object.freeze({
      stamp: stamp("F11", "a14a0e99", "a7da4cf0", LEAVES),
      leagues: Object.freeze({
        flat: league("24ff7fd9", "d744e50d", 374_745, folds("0214793f", "120321c3", 75_116)),
        gen: league("2de11f5c", "cb968b4c", 399_426, folds("75d35118", "e5baccab", 81_356)),
      }),
    }),
    F12: Object.freeze({
      stamp: stamp("F12", "79cf8bf6", "5e4ae010", LEAVES),
      leagues: Object.freeze({
        flat: league("5affddbd", "660f3b01", 376_565, folds("9e18dace", "3a73d61b", 75_627)),
        gen: league("dfc7ddaa", "ee9e490f", 399_858, folds("96202c70", "4a0381da", 80_015)),
      }),
    }),
    F13: Object.freeze({
      stamp: stamp("F13", "2f966b33", "dc385c23", LEAVES),
      leagues: Object.freeze({
        flat: league("1db86de7", "989d0a31", 375_504, folds("db265a83", "d0bdd5e4", 76_491)),
        gen: league("3238fca4", "b43ed78d", 400_317, folds("6a00f618", "e7c67f35", 80_250)),
      }),
    }),
    F14: Object.freeze({
      stamp: stamp("F14", "49fe7c18", "f3b75c04", LEAVES),
      leagues: Object.freeze({
        flat: league("412e5100", "6276c73b", 374_949, folds("3084c10e", "371035f9", 75_090)),
        gen: league("95427abf", "b94f8e43", 401_612, folds("f5c17a21", "6e9d7ce0", 80_895)),
      }),
    }),
  }),
});
