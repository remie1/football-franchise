/**
 * ADR-089 step 1, S-9: THE pocket-1.s1 STREAM PINS (`src/pocket/s1Pins.ts`; plan §9.2).
 *
 * In the suite: the first 10 golden games a league under A1 to A4, their canonical and byte folds
 * against `first10`. Under `FF_POCKET_ON=1`: all 50 games a league, against the 50-game folds as
 * well. Also: the pins cover exactly S-1's arms and both leagues, and each pinned stamp is the arm
 * this build makes (so the pins and `POCKET_1_S1_DIGEST` name the same dials).
 *
 * A failure here means `pocket-1.s1` now plays a different game. The fix is a new rules name with
 * its own pins, never a re-record under `pocket-1.s1` after merge (plan §9.2 S-9, §16.4 K24).
 */
import { describe, expect, it } from "vitest";
import { armById } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES, type GoldenLeague } from "../src/pocket/golden.js";
import { POCKET_1_S1_DIGEST, POCKET_1_S1_RULES } from "../src/pocket/rules.js";
import { POCKET_1_S1_PINS, type S1PinArmId, type S1PinFolds } from "../src/pocket/s1Pins.js";
import { DIGEST_ARMS, STEP1_CALLER } from "../src/pocket/step1.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 10;
const ARMS = Object.keys(POCKET_1_S1_PINS.arms) as S1PinArmId[];
const DIGEST = /^fnv1a:[0-9a-f]{8}$/;

interface Played {
  readonly canonical: readonly string[];
  readonly bytes: readonly string[];
  readonly events: readonly number[];
}

function play(id: S1PinArmId, league: GoldenLeague, first: number): Played {
  const { tunables } = armById(id);
  const canonical: string[] = [];
  const bytes: string[] = [];
  const events: number[] = [];
  goldenGames(league, (o) => {
    canonical.push(gameDigest(o.events));
    bytes.push(gameBytesDigest(o.events));
    events.push(o.events.length);
  }, { tunables, callerVersion: STEP1_CALLER, first });
  return { canonical, bytes, events };
}

function foldsOf(p: Played, n: number): S1PinFolds {
  return {
    canonicalFold: foldDigests(p.canonical.slice(0, n)),
    byteFold: foldDigests(p.bytes.slice(0, n)),
    events: p.events.slice(0, n).reduce((s, x) => s + x, 0),
  };
}

const moved = (what: string, got: S1PinFolds, pin: S1PinFolds): string =>
  `ADR-089 S-9: the ${POCKET_1_S1_RULES} stream moved, ${what} (canonical ${got.canonicalFold} against ${pin.canonicalFold}; ` +
  `bytes ${got.byteFold} against ${pin.byteFold}; events ${String(got.events)} against ${String(pin.events)}). ` +
  `A change that moves these pins takes a new rules name with its own pins (plan §9.2 S-9, §16.4 K24).`;

describe("ADR-089 S-9: the pocket-1.s1 stream pins", () => {
  it("cover exactly S-1's arms (A1 to A4) and both leagues, every digest well formed", () => {
    expect(POCKET_1_S1_PINS.rules).toBe(POCKET_1_S1_RULES);
    expect(POCKET_1_S1_PINS.caller).toBe(STEP1_CALLER);
    expect(ARMS).toEqual([...DIGEST_ARMS]);
    for (const id of ARMS) {
      const arm = POCKET_1_S1_PINS.arms[id];
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
    // Every arm plays a different stream: no two arms share a fold.
    const all = ARMS.flatMap((id) => GOLDEN_LEAGUES.flatMap((l) => [POCKET_1_S1_PINS.arms[id].leagues[l].canonicalFold, POCKET_1_S1_PINS.arms[id].leagues[l].first10.canonicalFold]));
    expect(new Set(all).size).toBe(all.length);
  });

  it("each pinned stamp is the arm this build makes, and A1's overlay digest is POCKET_1_S1_DIGEST", () => {
    for (const id of ARMS) {
      const arm = armById(id);
      const pin = POCKET_1_S1_PINS.arms[id].stamp;
      expect(pin.arm).toBe(id);
      expect(arm.rules, id).toBe(pin.rules);
      expect(arm.overlayDigest, `${id}: a dial changed under the same name; see the rule in s1Pins.ts`).toBe(pin.overlayDigest);
      expect(arm.tunablesDigest, id).toBe(pin.tunablesDigest);
      expect(arm.patches.map((p) => `${p.tunableId}: ${String(p.currentValue)} -> ${String(p.proposedValue)}`), id).toEqual(pin.patches);
    }
    expect(POCKET_1_S1_PINS.arms.A1.stamp.overlayDigest).toBe(POCKET_1_S1_DIGEST);
  });

  const cases = ARMS.flatMap((id) => GOLDEN_LEAGUES.map((league) => [id, league] as const));
  it.each(cases)(
    `%s, %s league: the first ${String(FIRST)} golden games fold to the pins`,
    (id, league) => {
      const pin = POCKET_1_S1_PINS.arms[id].leagues[league];
      const got = play(id, league, FIRST);
      expect(got.canonical.length).toBe(FIRST);
      const first10 = foldsOf(got, 10);
      if (first10.canonicalFold !== pin.first10.canonicalFold || first10.byteFold !== pin.first10.byteFold || first10.events !== pin.first10.events) {
        expect.fail(moved(`${id} ${league}, first 10 games`, first10, pin.first10));
      }
      if (ON) {
        const all = foldsOf(got, 50);
        if (all.canonicalFold !== pin.canonicalFold || all.byteFold !== pin.byteFold || all.events !== pin.events) {
          expect.fail(moved(`${id} ${league}, 50 games`, all, pin));
        }
      }
      process.stdout.write(`pocketS1Pins ${id} ${league}: ${String(FIRST)} games, first 10 ${first10.canonicalFold} / ${first10.byteFold}${ON ? `, 50 ${foldsOf(got, 50).canonicalFold} / ${foldsOf(got, 50).byteFold}` : ""}\n`);
    },
    5 * 60_000,
  );
});
