/**
 * THE pocket-1.s2 STREAM PINS (ADR-089 step 2, Q-4; step-2 plan §4.5, §4.6 item 3 and §7 commit 12; C3-15).
 *
 * `POCKET_1_S2_DIGEST` pins the dials of `pocket-1.s2`, not the code that plays them. These pins
 * hold the code: the golden 50 games a league (`goldenGames`, caller v7) played under each of
 * step 2's arms, B1 to B7 (the forcing point alone, the warning alone, both with must act per
 * rusher, the narrower counter rule, L8 with Heels and the horizons, B3 with the stand-in hold, and
 * the horizons under step 1's forcing rule), folded as step 0 folds the legacy streams (`golden.ts`:
 * `foldDigests` of each game's `gameDigest`, the canonical form, and of its `gameBytesDigest`,
 * which also holds key order), with the same folds over the first 10 games. Every arm is stamped
 * `pocket-1.s2` with its own overlay digest; B3's is `POCKET_1_S2_DIGEST`. The bases step 2 re-plays
 * are pinned elsewhere: A1 by S-9 (`s1Pins.ts`), A5 and A11 by the base pins (`s1BasePins.ts`).
 *
 * The 50-game folds, events and stamps are exactly what `pocket -- --step 2 --digests` writes for
 * B1 to B7, each league.
 *
 * The suite (`test/pocketS2Pins.test.ts`) plays the first 10 games a league and checks their folds
 * (`first10`); under `FF_POCKET_ON=1` it plays all 50 and checks the 50-game folds too.
 *
 * THE RULE (step-2 plan §1.8, C3-17; the rule of `s1Pins.ts` for s1). After merge, these pins and
 * `POCKET_1_S2_DIGEST` are never re-recorded under `pocket-1.s2`. A change that moves any of them
 * plays a different game under the same name, so it must give the changed rules a new name
 * (`pocket-1.s3`, say), with its own pins. Before merge only, a review-round fix may re-record them
 * in a named commit, and the PR then says that no `pocket-1.s2` save made before it is carried on.
 *
 * MEASURED at 9b41da2 on Node v22.22.0 (source fingerprint `369bcdb6ab2bfd21`), by
 * `pnpm --filter @ff/calibration pocket -- --step 2 --digests --out <file>` (the 50-game folds,
 * events and stamps; its A1, A5 and A11 folds equal S-9's pins and the base pins), and by a scratch
 * run of the same `goldenGames` folds in a second process, whose 50-game folds and stamps equal the
 * command's and which gives the first 10; a separate 10-game run equals the first 10 games of the
 * 50-game run on every arm and league (`first10`).
 */
import type { CallerVersion } from "../caller/anticipate.js";
import type { Step2ArmId } from "./arms.js";
import type { S1PinArm, S1PinFolds, S1PinLeague, S1PinStamp } from "./s1Pins.js";

/** The tree the pins were measured at. A re-record (before merge only) changes it in the same named commit. */
export const POCKET_1_S2_PINS_MEASURED_AT = "9b41da2";

/** Step 2's arms, B1 to B7: every one is pinned. */
export type S2PinArmId = Step2ArmId;

export interface S2Pins {
  readonly rules: "pocket-1.s2";
  readonly caller: CallerVersion;
  readonly measuredAt: string;
  readonly node: string;
  readonly arms: Readonly<Record<S2PinArmId, S1PinArm>>;
}

const folds = (canonicalFold: string, byteFold: string, events: number): S1PinFolds =>
  Object.freeze({ canonicalFold: `fnv1a:${canonicalFold}`, byteFold: `fnv1a:${byteFold}`, events });

const league = (canonicalFold: string, byteFold: string, events: number, first10: S1PinFolds): S1PinLeague =>
  Object.freeze({ games: 50, ...folds(canonicalFold, byteFold, events), first10 });

const stamp = (arm: S2PinArmId, overlayDigest: string, tunablesDigest: string, patches: readonly string[]): S1PinStamp =>
  Object.freeze({ arm, rules: "pocket-1.s2", overlayDigest: `fnv1a:${overlayDigest}`, tunablesDigest: `fnv1a:${tunablesDigest}`, patches: Object.freeze([...patches]) });

const HALF = "arrival.collapsingWithinSeconds: 1 -> 0.5";
const FOLLOWS = "arrival.pressureWithinSeconds: 2 -> 1";

/** Q-4's pins: B1 to B7, both leagues, 50 games and the first 10 (MEASURED at 9b41da2; see the header). */
export const POCKET_1_S2_PINS: S2Pins = Object.freeze({
  rules: "pocket-1.s2",
  caller: "v7",
  measuredAt: POCKET_1_S2_PINS_MEASURED_AT,
  node: "v22.22.0",
  arms: Object.freeze({
    B1: Object.freeze({
      stamp: stamp("B1", "82b7c72f", "ee300df1", [HALF]),
      leagues: Object.freeze({
        flat: league("f48f42ca", "0722b66e", 369_932, folds("1b08c734", "8fd040ce", 72_736)),
        gen: league("d3246cbe", "5dd46e63", 393_325, folds("5173cb7a", "8aa29f2c", 78_991)),
      }),
    }),
    B2: Object.freeze({
      stamp: stamp("B2", "9978e7c3", "25dca491", [FOLLOWS]),
      leagues: Object.freeze({
        flat: league("2be003d6", "0361d417", 368_114, folds("942ab924", "6b973d3b", 72_183)),
        gen: league("f0c62538", "405d569f", 389_323, folds("a38d9f67", "a0b3fdaa", 75_650)),
      }),
    }),
    B3: Object.freeze({
      stamp: stamp("B3", "03754f60", "2aefaf2c", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("89aea71f", "5eb3955a", 368_640, folds("6fe44adf", "00cd63a3", 72_266)),
        gen: league("163e8e63", "0efea950", 393_176, folds("b5ff5e16", "4dfa4472", 77_933)),
      }),
    }),
    B4: Object.freeze({
      stamp: stamp("B4", "299ef915", "eb9102be", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("ecfd6151", "5f735a5f", 368_640, folds("900008dd", "4b8465f8", 72_266)),
        gen: league("a332db1d", "70bd7e68", 393_178, folds("44ba33de", "840eb4d7", 77_933)),
      }),
    }),
    B5: Object.freeze({
      stamp: stamp("B5", "20c724a7", "c4d3519a", [
        "pocket.minimumStatusByBand.BLOCKER_BEATEN: PRESSURE -> CLEAN",
        "passRush.pressureProgressByBand.RUSHER_GAINING.delta: 1 -> 0",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("7a5cf4eb", "836e4f95", 352_980, folds("3eca47cf", "d312955f", 69_615)),
        gen: league("8b5088fa", "e498b5ce", 371_894, folds("ae9c8f97", "b3b9f0c1", 74_060)),
      }),
    }),
    B6: Object.freeze({
      stamp: stamp("B6", "88bca450", "dd7c3a5a", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
        HALF,
        FOLLOWS,
      ]),
      leagues: Object.freeze({
        flat: league("d7fde38d", "277dec3f", 423_061, folds("1e1fdaac", "93ca137d", 83_619)),
        gen: league("fecdea7a", "31fb2815", 429_309, folds("918c8916", "35ca11fe", 84_668)),
      }),
    }),
    B7: Object.freeze({
      stamp: stamp("B7", "ebe7b4c1", "808c55fd", [HALF, FOLLOWS]),
      leagues: Object.freeze({
        flat: league("4a0ed1ee", "32770b68", 368_640, folds("77a65c0f", "69ceb178", 72_266)),
        gen: league("e2144cf9", "d9e7f73e", 393_176, folds("3e0c7327", "1a721a48", 77_933)),
      }),
    }),
  }),
});
