/**
 * ADR-089 step 6: Q-2g, THE RE-FOLD PROOF's shared folds (step-6 plan §3.2 K2, §8.1 Q-2g).
 *
 * Step 6 teaches the stream readers its facts (the OUT_OF_POCKET throwaway, the `:deadline` pick,
 * the escape cap and the escape roll's band, the shed, the failed-scramble marker, the real throwaway
 * rule's restatements, the direction and the drill), each only on a play stamped `pocket-1.s6` or
 * later (`readsStep6Facts`) or under a tree carrying `pocket.outs` (K14: the arm's own tunables). No
 * s1 to s5a stream carries either, so every reader must fold them exactly as before. Q-2f re-folds
 * the readers step 5 taught on the s2, s3 and s4 pins; this proof re-folds every reader step 6
 * touches on every pinned arm from `POCKET_1_S1_PINS` to `POCKET_1_S5A_PINS` (A1 to A4, A5 and A11,
 * B1 to B7, C1 to C16, D1 to D17, F1 to F14: 60 arms), both golden leagues, the first 10 games a
 * league in the suite and all 50 under `FF_POCKET_ON=1`.
 *
 * The folds, by their `stableDigest` per arm and league (`foldsOfS6`): step 1's (`foldS1Game`,
 * `foldAffectedGame` on every mechanism); step 2's seven per-play checks and its guard vector; step
 * 4's (`foldS4Game`, `foldM6Step4Game`); step 5a's (`foldS5Game`); the metrics fold
 * (`collect.ts`'s `foldGame` with the arm's tunables) and its pocket tables (`pocketTables`); the
 * sacker mix (`foldM3Game`); the pocket rows (`foldRowsGame`, `foldCleanPocketRowsGame`); M5's game
 * reading (`m5GameOf`); every dropback as the reader reads it (`dropbacksOf`, a digest a game) and
 * its throw classes (`throwClassOf`, `throwClassOfS5`, and `desperationPocketOf` on a release); and, on an arm whose
 * stream carries no step-3 fact, M2 STREAM, `foldM6Game` with its cross-check and `foldM2Game` on
 * TODAY, as the step-3 and later harnesses leave the replays out (`playStep3Arm`'s `m2 = !s3`).
 *
 * `BEFORE_S6` holds the same folds by the old readers: this module and the four test files, copied
 * unchanged into a pristine copy of the package at b975ec7 (the readers as step 5a and engine-3 left
 * them, before any was taught step 6), run there, their printed digests pinned below. Every function
 * called here exists at b975ec7 with the same signature, so the same file measures both sides.
 */
import { expect } from "vitest";
import { stableDigest } from "../src/harness/digest.js";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { emptyAccumulator, foldGame } from "../src/metrics/collect.js";
import { pocketTables } from "../src/metrics/pocketRows.js";
import { armById, MECHANISMS, type ArmId } from "../src/pocket/arms.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { GOLDEN_LEAGUES, type GoldenLeague } from "../src/pocket/golden.js";
import { ARM_TODAY, emptyM2Fold, foldM2Game } from "../src/pocket/m2ForcingSource.js";
import { emptyM3Fold, foldM3Game } from "../src/pocket/m3SackerMix.js";
import { m5GameOf } from "../src/pocket/m5Mirror.js";
import { emptyM6Fold, emptyM6Step4Fold, foldM6Game, foldM6Step4Game } from "../src/pocket/m6Contact.js";
import { emptyCleanPocketRowsFold, emptyRowsFold, foldCleanPocketRowsGame, foldRowsGame } from "../src/pocket/rows.js";
import { readsStep3Facts } from "../src/pocket/rules.js";
import { emptyAffectedFold, emptyS1Folds, foldAffectedGame, foldS1Game } from "../src/pocket/s1Stream.js";
import { POCKET_1_S1_BASE_PINS } from "../src/pocket/s1BasePins.js";
import { POCKET_1_S1_PINS } from "../src/pocket/s1Pins.js";
import { emptyS2Folds, s2Checks, s2ContextOf, s2PlaysOf } from "../src/pocket/s2Stream.js";
import { POCKET_1_S2_PINS } from "../src/pocket/s2Pins.js";
import { POCKET_1_S3_PINS } from "../src/pocket/s3Pins.js";
import { emptyS4Fold, foldS4Game } from "../src/pocket/s4Stream.js";
import { POCKET_1_S4_PINS } from "../src/pocket/s4Pins.js";
import { emptyS5Fold, foldS5Game } from "../src/pocket/s5Stream.js";
import { POCKET_1_S5A_PINS } from "../src/pocket/s5Pins.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { desperationPocketOf, dropbacksOf, releaseTickOf, throwClassOf, throwClassOfS5 } from "../src/pocket/throwClass.js";

export const ON = process.env["FF_POCKET_ON"] === "1";
export const FIRST: 10 | 50 = ON ? 50 : 10;

export type PinSetS6 = "S1" | "S1BASE" | "S2" | "S3" | "S4" | "S5A";
export type TableS6 = Partial<Record<PinSetS6, Record<string, Record<GoldenLeague, string>>>>;

/** Every pinned arm from `POCKET_1_S1_PINS` to `POCKET_1_S5A_PINS`, by its pin set, in each set's order. */
export const PIN_SETS_S6: Readonly<Record<PinSetS6, readonly ArmId[]>> = {
  S1: Object.keys(POCKET_1_S1_PINS.arms) as ArmId[],
  S1BASE: Object.keys(POCKET_1_S1_BASE_PINS.arms) as ArmId[],
  S2: Object.keys(POCKET_1_S2_PINS.arms) as ArmId[],
  S3: Object.keys(POCKET_1_S3_PINS.arms) as ArmId[],
  S4: Object.keys(POCKET_1_S4_PINS.arms) as ArmId[],
  S5A: Object.keys(POCKET_1_S5A_PINS.arms) as ArmId[],
};

/**
 * The keys step 6's readers add, each only on a stream that carries step 6's facts: none may appear
 * in a fold of an s1 to s5a stream.
 */
export const S6_ONLY_KEYS: readonly string[] = [
  "deadlinePicks",
  "outOfPocketThrowaways",
  "spentHolds",
  "ruleThrowaways",
  "s6Escapes",
  "s6",
  "failedScrambleSacks",
  "boxScoreScrambles",
  "catchesSacked",
  "catchesShed",
  "labelRuleSacks",
  "atEscape",
  "contactsAtEscape",
  "noSacker",
  "statlineFallbacks",
  "byPocket",
  "directions",
  "drills",
];

/**
 * One arm's folds on one league's golden games (the first `FIRST`), by the readers as they stand,
 * with the arm's own tunables (K14).
 */
export function foldsOfS6(id: ArmId, league: GoldenLeague): unknown {
  const arm = armById(id);
  const { tunables } = arm;
  const replays = !readsStep3Facts(arm.rules);
  const s1 = emptyS1Folds();
  const affected = emptyAffectedFold(MECHANISMS);
  const s2 = emptyS2Folds();
  const s4 = emptyS4Fold();
  const s5 = emptyS5Fold();
  const m3 = emptyM3Fold();
  const m6 = emptyM6Fold();
  const m6s4 = emptyM6Step4Fold();
  const m2 = new Map([[ARM_TODAY.id, emptyM2Fold()]]);
  const rows = emptyRowsFold();
  const cleanRows = emptyCleanPocketRowsFold();
  const m5: unknown[] = [];
  const dropbacks: string[] = [];
  const classes: Record<string, number> = {};
  const bump = (key: string): void => {
    classes[key] = (classes[key] ?? 0) + 1;
  };
  let acc = emptyAccumulator();
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
      foldS4Game(s4, o.events, tunables);
      foldS5Game(s5, o.events, tunables, snapshot);
      foldM6Step4Game(m6s4, o.events);
      foldM3Game(m3, o.events, positions);
      foldRowsGame(rows, o.events, tunables, positions);
      foldCleanPocketRowsGame(cleanRows, o.events, tunables);
      m5.push(m5GameOf(o.events, tunables));
      const read = dropbacksOf(o.events);
      dropbacks.push(stableDigest(read));
      for (const d of read) {
        bump(`class:${throwClassOf(d, tunables).cls}`);
        bump(`classS5:${throwClassOfS5(d, tunables).cls}`);
        if (releaseTickOf(d) !== undefined) bump(`desperationPocket:${String(desperationPocketOf(d))}`);
      }
      acc = foldGame(acc, o, tunables);
      if (replays) {
        s2Checks.m2(s2.m2, o.events, ctx);
        foldM6Game(m6, o.events, snapshot, positions, tunables, meta.seed);
        foldM2Game(m2, o.events, { tunables, positions, gameSeed: meta.seed }, [ARM_TODAY]);
      }
    },
    { tunables, callerVersion: STEP1_CALLER, first: FIRST },
  );
  return {
    s1,
    affected,
    s2,
    s4,
    s5,
    m3,
    m6,
    m6s4,
    m2: Object.fromEntries(m2),
    rows,
    cleanRows,
    m5,
    dropbacks,
    classes,
    acc,
    pocketTables: pocketTables(acc.play.pocket),
  };
}

/**
 * The old readers' folds, `stableDigest` per pin set, arm and league, and each set's table digest,
 * measured by this module in a pristine copy of the package at b975ec7 (MEASURED: 10 games a league
 * in 176 s, 50 under `FF_POCKET_ON=1` in 816 s, 2026-11-28, 4 vCPU).
 */
export const BEFORE_S6: Readonly<Partial<Record<10 | 50, { readonly sets: Partial<Record<PinSetS6, string>>; readonly table: TableS6 }>>> = {
  10: {
    sets: { S1: "fnv1a:7748609a", S1BASE: "fnv1a:7059c5aa", S2: "fnv1a:5b5569aa", S3: "fnv1a:8c7d06cc", S4: "fnv1a:639eec89", S5A: "fnv1a:101817d7" },
    table: {
      S1: {
        A1: { flat: "fnv1a:7f725b46", gen: "fnv1a:7adebca2" },
        A2: { flat: "fnv1a:6e3a10bf", gen: "fnv1a:5c520316" },
        A3: { flat: "fnv1a:27384335", gen: "fnv1a:cb91c104" },
        A4: { flat: "fnv1a:8ebd0de7", gen: "fnv1a:bb9b7900" },
      },
      S1BASE: {
        A5: { flat: "fnv1a:c02b1cd8", gen: "fnv1a:fbe38ee5" },
        A11: { flat: "fnv1a:12d13098", gen: "fnv1a:2559cb0b" },
      },
      S2: {
        B1: { flat: "fnv1a:bba4e42d", gen: "fnv1a:5ec38109" },
        B2: { flat: "fnv1a:d6b1d770", gen: "fnv1a:ddce8552" },
        B3: { flat: "fnv1a:ce0a9165", gen: "fnv1a:13fb225a" },
        B4: { flat: "fnv1a:a4998196", gen: "fnv1a:264e4e2b" },
        B5: { flat: "fnv1a:1c0fdcb5", gen: "fnv1a:ad63e31f" },
        B6: { flat: "fnv1a:68b05a8a", gen: "fnv1a:3c67d7ad" },
        B7: { flat: "fnv1a:33374563", gen: "fnv1a:3a14e1ca" },
      },
      S3: {
        C1: { flat: "fnv1a:7b4342ee", gen: "fnv1a:a670aba9" },
        C2: { flat: "fnv1a:a17cffc5", gen: "fnv1a:4440a933" },
        C3: { flat: "fnv1a:9316be8b", gen: "fnv1a:60494402" },
        C4: { flat: "fnv1a:5590c4c0", gen: "fnv1a:e929f15c" },
        C5: { flat: "fnv1a:2e06bb1a", gen: "fnv1a:f57ca8a2" },
        C6: { flat: "fnv1a:5e7a9b4a", gen: "fnv1a:5ba0287f" },
        C7: { flat: "fnv1a:f420422d", gen: "fnv1a:6c7b7773" },
        C8: { flat: "fnv1a:af26a845", gen: "fnv1a:8d7b6bdf" },
        C9: { flat: "fnv1a:9102c642", gen: "fnv1a:94f76f9b" },
        C10: { flat: "fnv1a:f3c69c0e", gen: "fnv1a:dca5e560" },
        C11: { flat: "fnv1a:c4376ab3", gen: "fnv1a:1ea2b6d9" },
        C12: { flat: "fnv1a:dfceddb2", gen: "fnv1a:e5a79e69" },
        C13: { flat: "fnv1a:0f93e9cd", gen: "fnv1a:c5eea779" },
        C14: { flat: "fnv1a:69cd21d6", gen: "fnv1a:9f797d5b" },
        C15: { flat: "fnv1a:6023ea61", gen: "fnv1a:0dc6644c" },
        C16: { flat: "fnv1a:63d87c34", gen: "fnv1a:3a06b616" },
      },
      S4: {
        D1: { flat: "fnv1a:04170fbb", gen: "fnv1a:e209e577" },
        D2: { flat: "fnv1a:fb3e5e7e", gen: "fnv1a:291b39fb" },
        D3: { flat: "fnv1a:d89a047f", gen: "fnv1a:94553762" },
        D4: { flat: "fnv1a:15c793e3", gen: "fnv1a:99ed813c" },
        D5: { flat: "fnv1a:81ff2ea5", gen: "fnv1a:dc6bbcc0" },
        D6: { flat: "fnv1a:1e7dfd6c", gen: "fnv1a:c4c73b37" },
        D7: { flat: "fnv1a:10c0a906", gen: "fnv1a:da917879" },
        D8: { flat: "fnv1a:60c97fed", gen: "fnv1a:2592a65a" },
        D9: { flat: "fnv1a:51470253", gen: "fnv1a:a0b19154" },
        D10: { flat: "fnv1a:a921956e", gen: "fnv1a:161d593d" },
        D11: { flat: "fnv1a:8aa18a21", gen: "fnv1a:b5dd95dc" },
        D12: { flat: "fnv1a:cb456290", gen: "fnv1a:064e113f" },
        D13: { flat: "fnv1a:6007271f", gen: "fnv1a:38f5d004" },
        D14: { flat: "fnv1a:c8a96c14", gen: "fnv1a:2bf76889" },
        D15: { flat: "fnv1a:28949189", gen: "fnv1a:5f575ead" },
        D16: { flat: "fnv1a:175896ee", gen: "fnv1a:0a28a8f9" },
        D17: { flat: "fnv1a:859899bc", gen: "fnv1a:1bc4e1ad" },
      },
      S5A: {
        F1: { flat: "fnv1a:77345750", gen: "fnv1a:422a53b3" },
        F2: { flat: "fnv1a:0c9ec289", gen: "fnv1a:4a3726dd" },
        F3: { flat: "fnv1a:a2dda53a", gen: "fnv1a:5a8ccbfb" },
        F4: { flat: "fnv1a:1eb51986", gen: "fnv1a:0b913178" },
        F5: { flat: "fnv1a:da60b09c", gen: "fnv1a:45f8c5d4" },
        F6: { flat: "fnv1a:f0829561", gen: "fnv1a:1efa228b" },
        F7: { flat: "fnv1a:1fed7475", gen: "fnv1a:c281be6f" },
        F8: { flat: "fnv1a:9bd2534d", gen: "fnv1a:db8a929f" },
        F9: { flat: "fnv1a:9444300c", gen: "fnv1a:f4d5fd9a" },
        F10: { flat: "fnv1a:b4d8cf8b", gen: "fnv1a:20c0bd4f" },
        F11: { flat: "fnv1a:42d3076a", gen: "fnv1a:9e88e889" },
        F12: { flat: "fnv1a:8f96f81e", gen: "fnv1a:6b82716f" },
        F13: { flat: "fnv1a:ca9cd353", gen: "fnv1a:38e8767c" },
        F14: { flat: "fnv1a:9ad84997", gen: "fnv1a:17164edb" },
      },
    },
  },
  50: {
    sets: { S1: "fnv1a:21697be2", S1BASE: "fnv1a:204a1661", S2: "fnv1a:4f1eadf8", S3: "fnv1a:bf8acc6a", S4: "fnv1a:bad7ba6d", S5A: "fnv1a:deb25327" },
    table: {
      S1: {
        A1: { flat: "fnv1a:59c941de", gen: "fnv1a:af0861a6" },
        A2: { flat: "fnv1a:9640488e", gen: "fnv1a:0b841163" },
        A3: { flat: "fnv1a:45675da0", gen: "fnv1a:b5ab07ad" },
        A4: { flat: "fnv1a:da2a1210", gen: "fnv1a:177cfc9e" },
      },
      S1BASE: {
        A5: { flat: "fnv1a:466eda0d", gen: "fnv1a:d147edd0" },
        A11: { flat: "fnv1a:0b1eab00", gen: "fnv1a:0b446832" },
      },
      S2: {
        B1: { flat: "fnv1a:344b5d19", gen: "fnv1a:4c34a800" },
        B2: { flat: "fnv1a:e6dc235d", gen: "fnv1a:ddcc7d42" },
        B3: { flat: "fnv1a:bace2754", gen: "fnv1a:54776057" },
        B4: { flat: "fnv1a:5e939ae3", gen: "fnv1a:b8c6eaa4" },
        B5: { flat: "fnv1a:82902f44", gen: "fnv1a:04e43c39" },
        B6: { flat: "fnv1a:68b3eb95", gen: "fnv1a:6bff7b4a" },
        B7: { flat: "fnv1a:84fd90f0", gen: "fnv1a:ac799200" },
      },
      S3: {
        C1: { flat: "fnv1a:031663d1", gen: "fnv1a:f68cd915" },
        C2: { flat: "fnv1a:89378ab2", gen: "fnv1a:2f8f338e" },
        C3: { flat: "fnv1a:6b55c11b", gen: "fnv1a:054bad19" },
        C4: { flat: "fnv1a:ed98d084", gen: "fnv1a:9b778f51" },
        C5: { flat: "fnv1a:a15a1a17", gen: "fnv1a:550482ff" },
        C6: { flat: "fnv1a:70d49272", gen: "fnv1a:25d32b08" },
        C7: { flat: "fnv1a:0bc6af3f", gen: "fnv1a:3fad1595" },
        C8: { flat: "fnv1a:80f8f741", gen: "fnv1a:9bd28db2" },
        C9: { flat: "fnv1a:158f1404", gen: "fnv1a:8a923857" },
        C10: { flat: "fnv1a:8db7b8a0", gen: "fnv1a:3a39e5d5" },
        C11: { flat: "fnv1a:84ba64ec", gen: "fnv1a:a74fce8a" },
        C12: { flat: "fnv1a:ed580f58", gen: "fnv1a:56e7ef0c" },
        C13: { flat: "fnv1a:3beb0056", gen: "fnv1a:035c9282" },
        C14: { flat: "fnv1a:5ca0a6f4", gen: "fnv1a:ca320548" },
        C15: { flat: "fnv1a:183cf0f2", gen: "fnv1a:94953309" },
        C16: { flat: "fnv1a:d64f1a87", gen: "fnv1a:527af11a" },
      },
      S4: {
        D1: { flat: "fnv1a:c65ce596", gen: "fnv1a:8f534c21" },
        D2: { flat: "fnv1a:8a7d2665", gen: "fnv1a:589e56df" },
        D3: { flat: "fnv1a:2ca21bf7", gen: "fnv1a:4ff89fff" },
        D4: { flat: "fnv1a:4bd85a5b", gen: "fnv1a:88e36901" },
        D5: { flat: "fnv1a:70318b5d", gen: "fnv1a:d0701853" },
        D6: { flat: "fnv1a:4aa3a97a", gen: "fnv1a:e308b330" },
        D7: { flat: "fnv1a:f80f986b", gen: "fnv1a:ac727803" },
        D8: { flat: "fnv1a:2fd77774", gen: "fnv1a:40c57127" },
        D9: { flat: "fnv1a:4590c0cb", gen: "fnv1a:04f9cd1d" },
        D10: { flat: "fnv1a:afe9bcc8", gen: "fnv1a:4b222ffa" },
        D11: { flat: "fnv1a:03f2564c", gen: "fnv1a:ef78c6b8" },
        D12: { flat: "fnv1a:c39160ab", gen: "fnv1a:8965eb65" },
        D13: { flat: "fnv1a:cf9d9b81", gen: "fnv1a:2ace7535" },
        D14: { flat: "fnv1a:06170918", gen: "fnv1a:4b78a6de" },
        D15: { flat: "fnv1a:66bdb6a9", gen: "fnv1a:29aeeb59" },
        D16: { flat: "fnv1a:2f1d7d07", gen: "fnv1a:0b0fdeee" },
        D17: { flat: "fnv1a:07fb2442", gen: "fnv1a:3757da8e" },
      },
      S5A: {
        F1: { flat: "fnv1a:8d79ce43", gen: "fnv1a:a5eda015" },
        F2: { flat: "fnv1a:89e80774", gen: "fnv1a:49ab1b3f" },
        F3: { flat: "fnv1a:8d785278", gen: "fnv1a:a8bc151d" },
        F4: { flat: "fnv1a:4b0a34c0", gen: "fnv1a:7a13d46a" },
        F5: { flat: "fnv1a:27062643", gen: "fnv1a:acae9c8b" },
        F6: { flat: "fnv1a:1320d9b2", gen: "fnv1a:6dc9e817" },
        F7: { flat: "fnv1a:c6b6464e", gen: "fnv1a:a4bfcdd5" },
        F8: { flat: "fnv1a:7d8de06d", gen: "fnv1a:31f0cacb" },
        F9: { flat: "fnv1a:e4baa29b", gen: "fnv1a:88bb3d5c" },
        F10: { flat: "fnv1a:15cd8c10", gen: "fnv1a:76ff7994" },
        F11: { flat: "fnv1a:7a94ae61", gen: "fnv1a:23fb23a5" },
        F12: { flat: "fnv1a:171615a9", gen: "fnv1a:7595464d" },
        F13: { flat: "fnv1a:14f98273", gen: "fnv1a:3bc3d42e" },
        F14: { flat: "fnv1a:c8323a34", gen: "fnv1a:55d5ff55" },
      },
    },
  },
};

/** Re-fold every arm of `sets` on both leagues and hold each digest to the old readers'. */
export function refoldSets(sets: readonly PinSetS6[], it: (name: string, fn: () => void, timeout: number) => void): void {
  const now: TableS6 = {};
  for (const set of sets) {
    for (const id of PIN_SETS_S6[set]) {
      it(
        `${set} ${id}: every fold's JSON equals the old readers' (first ${String(FIRST)} a league)`,
        () => {
          const row: Record<GoldenLeague, string> = { flat: "", gen: "" };
          for (const league of GOLDEN_LEAGUES) {
            const folds = foldsOfS6(id, league);
            const text = JSON.stringify(folds);
            for (const key of S6_ONLY_KEYS) expect(text, `${league}: a step-6 key (${key}) on an s1 to s5a stream`).not.toContain(`"${key}"`);
            const digest = stableDigest(folds);
            row[league] = digest;
            process.stdout.write(`pocketRefoldS6 ${set} ${id} ${league}: ${String(FIRST)} games, folds ${digest}\n`);
            const before = BEFORE_S6[FIRST]?.table[set]?.[id]?.[league];
            if (before !== undefined) expect(digest, `${set} ${id} ${league}: the old readers gave ${before}`).toBe(before);
          }
          (now[set] ??= {})[id] = row;
        },
        1_800_000,
      );
    }
    it(
      `${set}: the set's table digest equals the old readers'`,
      () => {
        const table = now[set];
        expect(table, `${set}: every arm of the set ran`).toBeDefined();
        expect(Object.keys(table ?? {}).sort()).toEqual([...PIN_SETS_S6[set]].sort());
        const digest = stableDigest(table);
        process.stdout.write(`pocketRefoldS6 ${set}: table ${digest}\n`);
        const before = BEFORE_S6[FIRST]?.sets[set];
        if (before !== undefined) expect(digest).toBe(before);
        else process.stdout.write(`pocketRefoldS6 ${set}: no BEFORE for ${String(FIRST)} games: digests printed, not compared\n`);
      },
      60_000,
    );
  }
}
