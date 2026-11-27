/**
 * ADR-089 step 5, P-18b (plan §7.1): `pocket-1.s4` plus a `pocket.cleanPocket` block with every part
 * off and no floor replays `POCKET_1_S4_PINS`' streams byte for byte, apart from `PLAY_START.rules`'
 * digest. The block is added to each arm's tunables and the tree restamped at its new overlay digest
 * (the stamp check refuses a dial changed after stamping) under `pocket-1.s5a`, the first name that
 * may carry the block (`assertBlocksUnderName` refuses it under `pocket-1.s4`), so `PLAY_START.rules`
 * differs in its name as well as its digest; every game is compared with the arm's own game, both
 * with `PLAY_START.payload.rules` stripped and nothing else, and the arm's own games against the
 * pinned folds whole: the all-off block draws no die, moves no man and changes no other byte. D3 and
 * D4 play today's line plus contact (kind T), which has no block clock, and the engine refuses the
 * block there (it is read on shapes S and L only), so they are checked to refuse it.
 *
 * In the suite: the first 10 golden games a league under D1 to D17, against `first10`. Under
 * `FF_POCKET_ON=1`: all 50 a league, against the 50-game folds (about 6 minutes, twice the games).
 */
import type { Tunables } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { armById } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { foldDigests, gameBytesDigest, gameDigest, GOLDEN_LEAGUES, type StripEntry } from "../src/pocket/golden.js";
import { cleanPocketBlockOf } from "../src/pocket/oneThreatBench.js";
import { overlayDigestOf, POCKET_1_S5A_RULES } from "../src/pocket/rules.js";
import { POCKET_1_S4_PIN_STRIP, POCKET_1_S4_PINS, type S4PinArmId } from "../src/pocket/s4Pins.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 10;
const ARMS = Object.keys(POCKET_1_S4_PINS.arms) as S4PinArmId[];
const ALL_OFF = cleanPocketBlockOf({ on: [] });

const RULES_DIGEST: readonly StripEntry[] = Object.freeze([...POCKET_1_S4_PIN_STRIP, Object.freeze({ adr: "ADR-089", path: "PLAY_START.payload.rules" })]);

function withAllOff(t: Tunables): Tunables {
  const added: Tunables = { ...t, pocket: { ...t.pocket, cleanPocket: ALL_OFF } };
  return { ...added, engineRules: { name: POCKET_1_S5A_RULES, overlayDigest: overlayDigestOf(added) } };
}

interface Played {
  readonly canonical: string[];
  readonly bytes: string[];
  readonly strippedBytes: string[];
  events: number;
}

function play(tunables: Tunables, league: (typeof GOLDEN_LEAGUES)[number]): Played {
  const p: Played = { canonical: [], bytes: [], strippedBytes: [], events: 0 };
  goldenGames(league, (o) => {
    p.canonical.push(gameDigest(o.events, POCKET_1_S4_PIN_STRIP));
    p.bytes.push(gameBytesDigest(o.events, POCKET_1_S4_PIN_STRIP));
    p.strippedBytes.push(gameBytesDigest(o.events, RULES_DIGEST));
    p.events += o.events.length;
  }, { tunables, callerVersion: STEP1_CALLER, first: FIRST });
  return p;
}

describe("ADR-089 step 5, P-18b: s4 with the all-off clean-pocket block replays POCKET_1_S4_PINS", () => {
  it("the block is every part off with no floor", () => {
    expect(ALL_OFF).toEqual({ d23: false, expiryBar: 30, move: false, resetSeconds: 1.0, bump: false, breakOut: false, d23OnRun: false });
    expect("dropFloor" in ALL_OFF).toBe(false);
    expect(ARMS).toHaveLength(17);
  });

  for (const id of ARMS) {
    const kindT = id === "D3" || id === "D4";
    it(`${id}: ${kindT ? "kind T refuses the block" : `the first ${String(FIRST)} golden games a league, byte for byte apart from PLAY_START.rules`}`, { timeout: 600_000 }, () => {
      const base = armById(id).tunables;
      const tunables = withAllOff(base);
      if (kindT) {
        expect(() => play(tunables, "flat")).toThrow(/the clean-pocket block \(pocket\.cleanPocket\) on today's line plus contact \(kind T\), which has no block clock/);
        return;
      }
      expect(tunables.engineRules!.overlayDigest).not.toBe(base.engineRules!.overlayDigest);
      for (const league of GOLDEN_LEAGUES) {
        const pin = POCKET_1_S4_PINS.arms[id].leagues[league];
        const want = ON ? pin : pin.first10;
        const own = play(base, league);
        expect({ canonicalFold: foldDigests(own.canonical), byteFold: foldDigests(own.bytes), events: own.events }, `${id} ${league}: the pinned stream`).toEqual({ canonicalFold: want.canonicalFold, byteFold: want.byteFold, events: want.events });
        const off = play(tunables, league);
        expect(off.events, `${id} ${league}: events`).toBe(own.events);
        expect(off.strippedBytes, `${id} ${league}: every game, the rules digest stripped`).toEqual(own.strippedBytes);
        expect(off.bytes, `${id} ${league}: the rules digest is in the bytes`).not.toEqual(own.bytes);
      }
    });
  }
});
