/**
 * ADR-089 step 5: Q-2f, THE RE-FOLD PROOF (plan §4's readers row, §7.1 Q-2f; critique 2 B4, critique
 * 3 B2).
 *
 * Step 5 teaches four readers the clean pick (`s2Stream.ts`, `m6Contact.ts`, `s1Stream.ts`,
 * `m2ForcingSource.ts`), each only when the play's bundle carries `pocket.cleanPocket`. Q-2b to Q-2e
 * re-grade committed JSON and cannot see a reader that moved, so this proof re-folds: every arm of
 * `POCKET_1_S2_PINS`, `POCKET_1_S3_PINS` and `POCKET_1_S4_PINS` (B1 to B7, C1 to C16, D1 to D17) plays
 * its golden games (the first 10 a league in the suite; all 50 under `FF_POCKET_ON=1`), and the new
 * readers fold them with the arm's own tunables. The fold JSON (every check of `foldS1Game`,
 * `foldAffectedGame` on every mechanism, step 2's seven per-play checks and its guard vector,
 * `foldM6Step4Game`, and, on an arm whose stream carries no step-3 fact, M2 STREAM, `foldM6Game` with
 * its cross-check and `foldM2Game` on TODAY), by its `stableDigest` per arm and league, must equal
 * `BEFORE`: the same folds by the old readers, measured by this same file run in a worktree at
 * 89a4c31 (the engine's part 2 in, every reader as at 54b8b5b) before any reader was taught, 10 games
 * a league (`fnv1a:7f4cdeb3`) and 50 under `FF_POCKET_ON=1` (`fnv1a:3d2a9142`). The replay folds are
 * left out on s3 and s4 arms as the step-3 and step-4 harnesses leave them out (`playStep3Arm`'s
 * `m2 = !s3`, `step4FoldsOf`'s `m2: false`): TODAY's replay cannot read a late block.
 */
import { describe, expect, it } from "vitest";
import { stableDigest } from "../src/harness/digest.js";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { armById, MECHANISMS, type ArmId } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES, type GoldenLeague } from "../src/pocket/golden.js";
import { ARM_TODAY, emptyM2Fold, foldM2Game } from "../src/pocket/m2ForcingSource.js";
import { emptyM6Fold, emptyM6Step4Fold, foldM6Game, foldM6Step4Game } from "../src/pocket/m6Contact.js";
import { emptyAffectedFold, emptyS1Folds, foldAffectedGame, foldS1Game } from "../src/pocket/s1Stream.js";
import { POCKET_1_S2_PINS } from "../src/pocket/s2Pins.js";
import { readsStep3Facts } from "../src/pocket/rules.js";
import { emptyS2Folds, s2Checks, s2ContextOf, s2PlaysOf } from "../src/pocket/s2Stream.js";
import { POCKET_1_S3_PINS } from "../src/pocket/s3Pins.js";
import { POCKET_1_S4_PINS } from "../src/pocket/s4Pins.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";

const ON = process.env["FF_POCKET_ON"] === "1";
const FIRST = ON ? 50 : 10;

type PinSet = "S2" | "S3" | "S4";
type Table = Record<PinSet, Record<string, Record<GoldenLeague, string>>>;

/**
 * The old readers' folds, `stableDigest` per pin set, arm and league, and the whole table's, measured
 * on 89a4c31 before any reader was taught the clean pick.
 */
const BEFORE: Readonly<Partial<Record<10 | 50, { readonly digest: string; readonly table: Table }>>> = {
  10: {
    digest: "fnv1a:7f4cdeb3",
    table: {
      S2: {
        B1: { flat: "fnv1a:97e5c178", gen: "fnv1a:cfab101d" },
        B2: { flat: "fnv1a:cdc06084", gen: "fnv1a:33ec05d7" },
        B3: { flat: "fnv1a:2a37e10a", gen: "fnv1a:c608b5f8" },
        B4: { flat: "fnv1a:e322ae0f", gen: "fnv1a:8b670e9d" },
        B5: { flat: "fnv1a:f50fd6d1", gen: "fnv1a:142207f8" },
        B6: { flat: "fnv1a:72e6f24a", gen: "fnv1a:c292fd60" },
        B7: { flat: "fnv1a:e85877fc", gen: "fnv1a:eabe0bb8" },
      },
      S3: {
        C1: { flat: "fnv1a:4b726838", gen: "fnv1a:75c5ac9d" },
        C2: { flat: "fnv1a:a5470853", gen: "fnv1a:96483134" },
        C3: { flat: "fnv1a:b9ed60f3", gen: "fnv1a:f4493023" },
        C4: { flat: "fnv1a:cf3cbef0", gen: "fnv1a:91898410" },
        C5: { flat: "fnv1a:e8e03353", gen: "fnv1a:21e95914" },
        C6: { flat: "fnv1a:a0c1da4d", gen: "fnv1a:c41ef67d" },
        C7: { flat: "fnv1a:e9e357ad", gen: "fnv1a:2eb9fb5b" },
        C8: { flat: "fnv1a:08459156", gen: "fnv1a:b0cc2e85" },
        C9: { flat: "fnv1a:22d1dba0", gen: "fnv1a:f78608e2" },
        C10: { flat: "fnv1a:2392f5aa", gen: "fnv1a:8b7f915d" },
        C11: { flat: "fnv1a:e996fa17", gen: "fnv1a:960c27f7" },
        C12: { flat: "fnv1a:eec60278", gen: "fnv1a:727e79fe" },
        C13: { flat: "fnv1a:5c72192a", gen: "fnv1a:c9ecef02" },
        C14: { flat: "fnv1a:b0fee75c", gen: "fnv1a:101367fd" },
        C15: { flat: "fnv1a:2aaac9b4", gen: "fnv1a:7c21d4a7" },
        C16: { flat: "fnv1a:75c75686", gen: "fnv1a:a598feeb" },
      },
      S4: {
        D1: { flat: "fnv1a:c8e6cfb6", gen: "fnv1a:76871878" },
        D2: { flat: "fnv1a:00cb456c", gen: "fnv1a:055d19cc" },
        D3: { flat: "fnv1a:47c1a745", gen: "fnv1a:fb563a7f" },
        D4: { flat: "fnv1a:526808f4", gen: "fnv1a:51572573" },
        D5: { flat: "fnv1a:fcbfc347", gen: "fnv1a:60b4f472" },
        D6: { flat: "fnv1a:6bfa4aaf", gen: "fnv1a:95d47a97" },
        D7: { flat: "fnv1a:32996049", gen: "fnv1a:736ae20d" },
        D8: { flat: "fnv1a:b11b07a1", gen: "fnv1a:ee09d409" },
        D9: { flat: "fnv1a:b85035db", gen: "fnv1a:854b56ef" },
        D10: { flat: "fnv1a:b90fc856", gen: "fnv1a:3bc32717" },
        D11: { flat: "fnv1a:cd204a75", gen: "fnv1a:601b5765" },
        D12: { flat: "fnv1a:141736de", gen: "fnv1a:06896570" },
        D13: { flat: "fnv1a:85e3b987", gen: "fnv1a:168519a7" },
        D14: { flat: "fnv1a:2d34bda5", gen: "fnv1a:769d6b56" },
        D15: { flat: "fnv1a:21b070ab", gen: "fnv1a:4a7d3283" },
        D16: { flat: "fnv1a:8094e47e", gen: "fnv1a:ba933c89" },
        D17: { flat: "fnv1a:e10ca7fa", gen: "fnv1a:c7eda7f3" },
      },
    },
  },
  50: {
    digest: "fnv1a:3d2a9142",
    table: {
      S2: {
        B1: { flat: "fnv1a:cb93c08b", gen: "fnv1a:288a6c91" },
        B2: { flat: "fnv1a:6ea2c6ce", gen: "fnv1a:ca513832" },
        B3: { flat: "fnv1a:44b1b496", gen: "fnv1a:7e7602ce" },
        B4: { flat: "fnv1a:21d14fdc", gen: "fnv1a:0849aa7c" },
        B5: { flat: "fnv1a:4365473d", gen: "fnv1a:8281d207" },
        B6: { flat: "fnv1a:da139b4a", gen: "fnv1a:338ef793" },
        B7: { flat: "fnv1a:9e7a0ad2", gen: "fnv1a:b74e4b8f" },
      },
      S3: {
        C1: { flat: "fnv1a:723ba119", gen: "fnv1a:90ffc2c4" },
        C2: { flat: "fnv1a:19296415", gen: "fnv1a:3956f984" },
        C3: { flat: "fnv1a:6927323d", gen: "fnv1a:d0964a31" },
        C4: { flat: "fnv1a:585e7e71", gen: "fnv1a:68b34d0e" },
        C5: { flat: "fnv1a:93fbf776", gen: "fnv1a:2f2a1766" },
        C6: { flat: "fnv1a:67f3fdd0", gen: "fnv1a:0b40a6e6" },
        C7: { flat: "fnv1a:1c6f7eb2", gen: "fnv1a:58726343" },
        C8: { flat: "fnv1a:a32177ba", gen: "fnv1a:5c2166d4" },
        C9: { flat: "fnv1a:51aeed52", gen: "fnv1a:f9dbc092" },
        C10: { flat: "fnv1a:e04d3993", gen: "fnv1a:875e1b5a" },
        C11: { flat: "fnv1a:e5e25bd6", gen: "fnv1a:60a45ed5" },
        C12: { flat: "fnv1a:f61178fa", gen: "fnv1a:c6d89a52" },
        C13: { flat: "fnv1a:6e1fb17f", gen: "fnv1a:3ad1c4a8" },
        C14: { flat: "fnv1a:170aef7e", gen: "fnv1a:36bb1d85" },
        C15: { flat: "fnv1a:eb62f947", gen: "fnv1a:fd83252e" },
        C16: { flat: "fnv1a:afdd7071", gen: "fnv1a:c474b48b" },
      },
      S4: {
        D1: { flat: "fnv1a:199e34b4", gen: "fnv1a:98a77e49" },
        D2: { flat: "fnv1a:3b585904", gen: "fnv1a:c00a155d" },
        D3: { flat: "fnv1a:c4e66af6", gen: "fnv1a:8f577163" },
        D4: { flat: "fnv1a:5294ede8", gen: "fnv1a:8066745f" },
        D5: { flat: "fnv1a:671191fb", gen: "fnv1a:0cdf11c4" },
        D6: { flat: "fnv1a:4f96e085", gen: "fnv1a:9b13157f" },
        D7: { flat: "fnv1a:de934255", gen: "fnv1a:5adf6222" },
        D8: { flat: "fnv1a:cc0d2b91", gen: "fnv1a:b12492e1" },
        D9: { flat: "fnv1a:b3cc2487", gen: "fnv1a:a493c5ae" },
        D10: { flat: "fnv1a:2071eb2e", gen: "fnv1a:057dac1f" },
        D11: { flat: "fnv1a:8c51b84d", gen: "fnv1a:feae247d" },
        D12: { flat: "fnv1a:641dc989", gen: "fnv1a:c91f4983" },
        D13: { flat: "fnv1a:11f9ac62", gen: "fnv1a:a5eee622" },
        D14: { flat: "fnv1a:a7c9ae80", gen: "fnv1a:b50d2db7" },
        D15: { flat: "fnv1a:e1831a83", gen: "fnv1a:f530beab" },
        D16: { flat: "fnv1a:29bb72cf", gen: "fnv1a:38f99a7e" },
        D17: { flat: "fnv1a:ba2073d5", gen: "fnv1a:84ebe224" },
      },
    },
  },
};

const PIN_SETS: readonly (readonly [PinSet, readonly ArmId[]])[] = [
  ["S2", Object.keys(POCKET_1_S2_PINS.arms) as ArmId[]],
  ["S3", Object.keys(POCKET_1_S3_PINS.arms) as ArmId[]],
  ["S4", Object.keys(POCKET_1_S4_PINS.arms) as ArmId[]],
];

const NOW = Object.fromEntries(PIN_SETS.map(([set]) => [set, {}])) as Table;

/**
 * One arm's folds on one league's golden games, by the readers as they now stand. As in the step-3
 * and step-4 harnesses (`playStep3Arm`'s `m2 = !s3`, `step4FoldsOf`'s `m2: false`), the folds that
 * replay a play by TODAY's rules (M2 STREAM, step 0's M2 and M6) are read only on an arm whose stream
 * carries no step-3 fact: the replay cannot read a late block.
 */
function foldsOf(id: ArmId, league: GoldenLeague): unknown {
  const arm = armById(id);
  const { tunables } = arm;
  const replays = !readsStep3Facts(arm.rules);
  const s1 = emptyS1Folds();
  const affected = emptyAffectedFold(MECHANISMS);
  const s2 = emptyS2Folds();
  const m6 = emptyM6Fold();
  const m6s4 = emptyM6Step4Fold();
  const m2 = new Map([[ARM_TODAY.id, emptyM2Fold()]]);
  goldenGames(
    league,
    (o, snapshot, meta) => {
      const positions = positionsFromSnapshot(snapshot);
      foldS1Game(s1, o.events, tunables);
      foldAffectedGame(affected, o.events, tunables, MECHANISMS);
      const ctx = s2ContextOf(tunables, snapshot);
      for (const play of s2PlaysOf(o.events)) {
        s2Checks.liveSet(s2.liveSet, play, ctx);
        s2Checks.mustAct(s2.mustAct, play, ctx);
        s2Checks.arrival(s2.arrival, play, ctx);
        s2Checks.warning(s2.warning, play, ctx);
        s2Checks.share(s2.share, play, ctx);
        s2Checks.desperation(s2.desperation, play, ctx);
        s2Checks.checkdown(s2.checkdown, play, ctx);
      }
      s2Checks.guardGame(s2.guardGames, o.events, ctx);
      foldM6Step4Game(m6s4, o.events);
      if (replays) {
        s2Checks.m2(s2.m2, o.events, ctx);
        foldM6Game(m6, o.events, snapshot, positions, tunables, meta.seed);
        foldM2Game(m2, o.events, { tunables, positions, gameSeed: meta.seed }, [ARM_TODAY]);
      }
    },
    { tunables, callerVersion: STEP1_CALLER, first: FIRST },
  );
  return { s1, affected, s2, m6, m6s4, m2: Object.fromEntries(m2) };
}

describe(`Q-2f: the taught readers re-fold the golden games of the s2, s3 and s4 pins as before (first ${String(FIRST)} a league)`, () => {
  const cases = PIN_SETS.flatMap(([set, arms]) => arms.map((id) => [set, id] as const));
  it.each(cases)(
    "%s %s: every fold's JSON equals the old readers'",
    (set, id) => {
      NOW[set][id] = { flat: "", gen: "" };
      for (const league of GOLDEN_LEAGUES) {
        const folds = foldsOf(id, league);
        const digest = stableDigest(folds);
        NOW[set][id]![league] = digest;
        // A key the teaching adds under the block only must never appear on a stream without it.
        expect(JSON.stringify(folds), `${league}: a clean-pick key on a stream with no clean-pocket block`).not.toMatch(/cleanPick/);
        process.stdout.write(`pocketRefold ${set} ${id} ${league}: ${String(FIRST)} games, folds ${digest}\n`);
        const before = BEFORE[FIRST];
        if (before !== undefined) expect(digest, `${league}: the old readers gave ${String(before.table[set][id]?.[league])}`).toBe(before.table[set][id]?.[league]);
      }
    },
    10 * 60_000,
  );

  it("the whole table equals the old readers' (run the whole file)", () => {
    for (const [set, arms] of PIN_SETS) expect(Object.keys(NOW[set]).sort(), `${set}: every arm was played`).toEqual([...arms].sort());
    const before = BEFORE[FIRST];
    if (before === undefined) {
      process.stdout.write(`pocketRefold MEASURED ${String(FIRST)} ${stableDigest(NOW)} ${JSON.stringify(NOW)}\n`);
      throw new Error(`pocketRefold: no BEFORE literal for the first ${String(FIRST)} games a league`);
    }
    expect(NOW).toEqual(before.table);
    expect(stableDigest(NOW)).toBe(before.digest);
  });
});
