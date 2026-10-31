/**
 * ADR-089 step 3, R-2: THE pocket-1.s3 STREAM PINS (`src/pocket/s3Pins.ts`; step-3 plan §6.2).
 *
 * In the suite: the first 10 golden games a league under C1 to C16, their canonical and byte folds
 * against `first10`, folded with `POCKET_1_S3_PIN_STRIP` (nothing stripped: the snap picture is held).
 * Under `FF_POCKET_ON=1`: all 50 games a league, against the 50-game folds as well. Also: the pins
 * cover exactly step 3's arms and both leagues; no fold is shared between them, or with S-9's pins,
 * the base pins or the s2 pins; each pinned stamp is the arm this build makes, every one stamped
 * `pocket-1.s3` but C13 (`pocket-1.s2`), and C1's overlay digest is `POCKET_1_S3_DIGEST`; and on
 * every arm the picture is in the folded stream (stripping it changes the first-10 fold).
 *
 * A failure here means `pocket-1.s3` (or C13's `pocket-1.s2` arm) now plays a different game, or
 * stands a man somewhere else at the snap. Before merge, the fix is a named re-record commit; after
 * merge, a new rules name with its own pins, never a re-record under `pocket-1.s3` (the rule in
 * `s3Pins.ts`).
 */
import { describe, expect, it } from "vitest";
import { armById, STEP3_ARM_IDS } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES, GOLDEN_STRIP, type GoldenLeague } from "../src/pocket/golden.js";
import { POCKET_1_S2_RULES, POCKET_1_S3_DIGEST, POCKET_1_S3_RULES } from "../src/pocket/rules.js";
import { POCKET_1_S1_BASE_PINS } from "../src/pocket/s1BasePins.js";
import { POCKET_1_S1_PINS, type S1PinArm, type S1PinFolds } from "../src/pocket/s1Pins.js";
import { POCKET_1_S2_PINS } from "../src/pocket/s2Pins.js";
import { POCKET_1_S3_PIN_STRIP, POCKET_1_S3_PINS, S3_PIN_OTHER_RULES, type S3PinArmId } from "../src/pocket/s3Pins.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { STEP3_DESIGN_ARM } from "../src/pocket/step3.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 10;
const ARMS = Object.keys(POCKET_1_S3_PINS.arms) as S3PinArmId[];
const DIGEST = /^fnv1a:[0-9a-f]{8}$/;

interface Played {
  readonly canonical: readonly string[];
  readonly bytes: readonly string[];
  readonly events: readonly number[];
  /** The same games folded as the s1 and s2 pins fold (`GOLDEN_STRIP`: the picture stripped). */
  readonly strippedCanonical: readonly string[];
}

function play(id: S3PinArmId, league: GoldenLeague, first: number): Played {
  const { tunables } = armById(id);
  const canonical: string[] = [];
  const bytes: string[] = [];
  const events: number[] = [];
  const strippedCanonical: string[] = [];
  goldenGames(league, (o) => {
    canonical.push(gameDigest(o.events, POCKET_1_S3_PIN_STRIP));
    bytes.push(gameBytesDigest(o.events, POCKET_1_S3_PIN_STRIP));
    events.push(o.events.length);
    strippedCanonical.push(gameDigest(o.events));
  }, { tunables, callerVersion: STEP1_CALLER, first });
  return { canonical, bytes, events, strippedCanonical };
}

function foldsOf(p: Played, n: number): S1PinFolds {
  return {
    canonicalFold: foldDigests(p.canonical.slice(0, n)),
    byteFold: foldDigests(p.bytes.slice(0, n)),
    events: p.events.slice(0, n).reduce((s, x) => s + x, 0),
  };
}

const moved = (what: string, got: S1PinFolds, pin: S1PinFolds): string =>
  `ADR-089 step 3, R-2: the ${POCKET_1_S3_RULES} stream moved, ${what} (canonical ${got.canonicalFold} against ${pin.canonicalFold}; ` +
  `bytes ${got.byteFold} against ${pin.byteFold}; events ${String(got.events)} against ${String(pin.events)}). ` +
  `The folds hold the snap picture, so a man standing elsewhere at the snap moves them too. ` +
  `After merge, a change that moves these pins takes a new rules name with its own pins (s3Pins.ts's rule).`;

const foldsOfPins = (arms: Readonly<Record<string, S1PinArm>>): string[] =>
  Object.values(arms).flatMap((a) => GOLDEN_LEAGUES.flatMap((l) => [a.leagues[l].canonicalFold, a.leagues[l].first10.canonicalFold, a.leagues[l].byteFold, a.leagues[l].first10.byteFold]));

describe("ADR-089 step 3, R-2: the pocket-1.s3 stream pins (C1 to C16)", () => {
  it("fold with nothing stripped: the snap picture and every event are held", () => {
    expect(POCKET_1_S3_PIN_STRIP).toEqual([]);
    expect(Object.isFrozen(POCKET_1_S3_PIN_STRIP)).toBe(true);
    // The s1 and s2 pins fold with GOLDEN_STRIP, which strips the picture; these do not.
    expect(GOLDEN_STRIP.some((s) => "path" in s && s.path === "PLAY_START.payload.snap")).toBe(true);
  });

  it("cover exactly C1 to C16 and both leagues, every digest well formed, none shared with each other or with the s1, base or s2 pins", () => {
    expect(POCKET_1_S3_PINS.rules).toBe(POCKET_1_S3_RULES);
    expect(POCKET_1_S3_PINS.caller).toBe(STEP1_CALLER);
    expect(ARMS).toEqual([...STEP3_ARM_IDS]);
    for (const id of ARMS) {
      const arm = POCKET_1_S3_PINS.arms[id];
      expect(Object.keys(arm.leagues).sort(), id).toEqual([...GOLDEN_LEAGUES].sort());
      for (const league of GOLDEN_LEAGUES) {
        const pin = arm.leagues[league];
        expect(pin.games, `${id} ${league}`).toBe(50);
        for (const f of [pin, pin.first10]) {
          expect(f.canonicalFold, `${id} ${league}`).toMatch(DIGEST);
          expect(f.byteFold, `${id} ${league}`).toMatch(DIGEST);
          expect(Number.isInteger(f.events) && f.events > 0, `${id} ${league}`).toBe(true);
        }
        expect(pin.first10.events, `${id} ${league}: the first 10 games are fewer events than the 50`).toBeLessThan(pin.events);
      }
    }
    // Every arm's stream is its own, if only by its PLAY_START stamp: no fold is shared within the
    // step-3 pins, or with S-9's pins (A1 to A4), the base pins (A5, A11) or the s2 pins (B1 to B7).
    const all = [
      ...foldsOfPins(POCKET_1_S3_PINS.arms),
      ...foldsOfPins(POCKET_1_S2_PINS.arms),
      ...foldsOfPins(POCKET_1_S1_PINS.arms),
      ...foldsOfPins(POCKET_1_S1_BASE_PINS.arms),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it("each pinned stamp is the arm this build makes, every one pocket-1.s3 but C13 (pocket-1.s2), and C1's overlay digest is POCKET_1_S3_DIGEST", () => {
    for (const id of ARMS) {
      const arm = armById(id);
      const pin = POCKET_1_S3_PINS.arms[id].stamp;
      expect(pin.arm).toBe(id);
      expect(pin.rules, id).toBe(S3_PIN_OTHER_RULES[id] ?? POCKET_1_S3_RULES);
      expect(arm.rules, id).toBe(pin.rules);
      expect(arm.overlayDigest, `${id}: a dial changed under the same name; see the rule in s3Pins.ts`).toBe(pin.overlayDigest);
      expect(arm.tunablesDigest, id).toBe(pin.tunablesDigest);
      expect(arm.patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`), id).toEqual(pin.patches);
    }
    expect(S3_PIN_OTHER_RULES).toEqual({ C13: POCKET_1_S2_RULES });
    expect(STEP3_DESIGN_ARM).toBe("C1");
    expect(POCKET_1_S3_PINS.arms.C1.stamp.overlayDigest).toBe(POCKET_1_S3_DIGEST);
    const overlays = ARMS.map((id) => POCKET_1_S3_PINS.arms[id].stamp.overlayDigest);
    expect(new Set(overlays).size).toBe(ARMS.length);
    // No step-3 arm carries a step-2 arm's dials (C13 is B3 with revision 1's uniform delay, not B3).
    const s2Overlays = new Set(Object.values(POCKET_1_S2_PINS.arms).map((a) => a.stamp.overlayDigest));
    for (const o of overlays) expect(s2Overlays.has(o), o).toBe(false);
  });

  const cases = ARMS.flatMap((id) => GOLDEN_LEAGUES.map((league) => [id, league] as const));
  it.each(cases)(
    `%s, %s league: the first ${String(FIRST)} golden games fold to the pins, the picture held`,
    (id, league) => {
      const pin = POCKET_1_S3_PINS.arms[id].leagues[league];
      const got = play(id, league, FIRST);
      expect(got.canonical.length).toBe(FIRST);
      const first10 = foldsOf(got, 10);
      if (first10.canonicalFold !== pin.first10.canonicalFold || first10.byteFold !== pin.first10.byteFold || first10.events !== pin.first10.events) {
        expect.fail(moved(`${id} ${league}, first 10 games`, first10, pin.first10));
      }
      // The picture is in what these pins fold: stripping it, as the s1 and s2 pins do, gives another fold.
      expect(foldDigests(got.strippedCanonical.slice(0, 10)), `${id} ${league}: no snap picture in the first 10 games`).not.toBe(first10.canonicalFold);
      if (ON) {
        const all = foldsOf(got, 50);
        if (all.canonicalFold !== pin.canonicalFold || all.byteFold !== pin.byteFold || all.events !== pin.events) {
          expect.fail(moved(`${id} ${league}, 50 games`, all, pin));
        }
      }
      process.stdout.write(`pocketS3Pins ${id} ${league}: ${String(FIRST)} games, first 10 ${first10.canonicalFold} / ${first10.byteFold}${ON ? `, 50 ${foldsOf(got, 50).canonicalFold} / ${foldsOf(got, 50).byteFold}` : ""}\n`);
    },
    5 * 60_000,
  );
});
