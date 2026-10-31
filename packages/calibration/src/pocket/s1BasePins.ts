/**
 * THE pocket-1.s1 BASE PINS (ADR-089 step 2, Q-1; step-2 plan §1.8, §4.5 and §6's K1 row; C3-1).
 *
 * Step 2 re-plays five step-1 arms as the bases its new arms read against (plan §4.1): A0 and A14
 * on the legacy clock, and A1, A5 and A11 under `pocket-1.s1`. S-9's pins (`s1Pins.ts`) hold A1 to
 * A4; nothing pinned the stream of A5 (L at R = 8 with Heels, the base of B5) or of A11 (A1 with the
 * stand-in hold, the base of B6). These pins hold them, in the form of S-9's: the golden 50 games a
 * league (`goldenGames`, caller v7) played under each arm, folded as step 0 folds the legacy
 * streams (`golden.ts`: `foldDigests` of each game's `gameDigest`, the canonical form, and of its
 * `gameBytesDigest`, which also holds key order), with the same folds over the first 10 games.
 *
 * They were measured before any step-2 engine edit, so a step-2 change that moves either base is
 * caught here: the step-2 build must leave every `pocket-1.s1` arm playing the game it played at
 * step 1 (plan §1.8, "why `pocket-1.s1` replays byte for byte").
 *
 * The suite (`test/pocketS1BasePins.test.ts`) plays the first 10 games a league and checks their
 * folds (`first10`); under `FF_POCKET_ON=1` it plays all 50 and checks the 50-game folds too.
 *
 * THE RULE is S-9's (`s1Pins.ts`; plan §9.2 S-9, §16.4 K24 of step 1, and §1.8 of step 2). A later
 * change that moves any of these pins plays a different game under the same name, so it must give
 * the changed rules a new name with its own pins; these are never re-recorded under `pocket-1.s1`.
 *
 * MEASURED on Node v22.22.0 at 200b18b, whose every package source, manifest and lockfile equal
 * b98ecd1's (`git diff b98ecd1 200b18b -- packages pnpm-lock.yaml package.json` names only
 * `calibration/reports/adr-089-amendments.filed.json`, which nothing in `src` reads; step 1's source
 * fingerprint of that tree is `7689307642ed08e0`, the step-1 cache's), by a scratch run of the
 * `goldenGames` folds of `s1Pins.ts`'s method, in two processes with byte-identical output. The same
 * run reproduced S-9's A1 pins exactly, and showed the first 10 games of each 50-game run equal to a
 * 10-game run (`first10`).
 */
import type { CallerVersion } from "../caller/anticipate.js";
import type { S1PinArm, S1PinFolds, S1PinLeague, S1PinStamp } from "./s1Pins.js";

/** The tree whose step-1 code the pins hold (plan §4.5 Q-1: "measured at a `b98ecd1` worktree before any engine edit"). */
export const POCKET_1_S1_BASE_PINS_MEASURED_AT = "b98ecd1";

/** The two step-1 arms step 2 re-plays as bases that S-9 does not pin. */
export type S1BasePinArmId = "A5" | "A11";

export interface S1BasePins {
  readonly rules: "pocket-1.s1";
  readonly caller: CallerVersion;
  readonly measuredAt: string;
  readonly node: string;
  readonly arms: Readonly<Record<S1BasePinArmId, S1PinArm>>;
}

const folds = (canonicalFold: string, byteFold: string, events: number): S1PinFolds =>
  Object.freeze({ canonicalFold: `fnv1a:${canonicalFold}`, byteFold: `fnv1a:${byteFold}`, events });

const league = (canonicalFold: string, byteFold: string, events: number, first10: S1PinFolds): S1PinLeague =>
  Object.freeze({ games: 50, ...folds(canonicalFold, byteFold, events), first10 });

const stamp = (arm: S1BasePinArmId, overlayDigest: string, tunablesDigest: string, patches: readonly string[]): S1PinStamp =>
  Object.freeze({ arm, rules: "pocket-1.s1", overlayDigest: `fnv1a:${overlayDigest}`, tunablesDigest: `fnv1a:${tunablesDigest}`, patches: Object.freeze([...patches]) });

/** Q-1's base pins: A5 and A11, both leagues, 50 games and the first 10 (MEASURED; see the header). */
export const POCKET_1_S1_BASE_PINS: S1BasePins = Object.freeze({
  rules: "pocket-1.s1",
  caller: "v7",
  measuredAt: POCKET_1_S1_BASE_PINS_MEASURED_AT,
  node: "v22.22.0",
  arms: Object.freeze({
    A5: Object.freeze({
      stamp: stamp("A5", "fb652498", "be1ef0f4", [
        "pocket.minimumStatusByBand.BLOCKER_BEATEN: PRESSURE -> CLEAN",
        "passRush.pressureProgressByBand.RUSHER_GAINING.delta: 1 -> 0",
      ]),
      leagues: Object.freeze({
        flat: league("9bb5b1f6", "ceede899", 351_944, folds("32043927", "924091e1", 70_253)),
        gen: league("41b642bd", "6744372e", 375_031, folds("e9abea15", "d53b7ae2", 74_322)),
      }),
    }),
    A11: Object.freeze({
      stamp: stamp("A11", "3cfc4af8", "9d70527e", [
        "qb.timeBudget.baseSeconds: 2.5 -> 4.5",
        "route.readySeconds.QUICK: 1 -> 2",
        "route.readySeconds.SHORT: 1.5 -> 2.5",
        "route.readySeconds.INTERMEDIATE: 2 -> 3",
        "route.readySeconds.DEEP: 2.5 -> 3.5",
      ]),
      leagues: Object.freeze({
        flat: league("2c92bc07", "08791074", 423_635, folds("d14535b3", "5a439a59", 83_912)),
        gen: league("ecaab51e", "5651e4cd", 433_492, folds("d8a05409", "14df0aa9", 84_578)),
      }),
    }),
  }),
});
