/**
 * ADR-089 step 0 — ENTRY 107'S DECIDING-INSTANT MULTI-CHANNEL SHARE, RESTATED (plan §6.1).
 *
 * Constructed ticks for the necessity test and its classes; the PASS-play buffering on a constructed
 * stream; two flat golden games always on (identity holds, nothing ambiguous, the counts add up);
 * and, gated `FF_POCKET_BASE=1`, the 496-game flat corpus set 1.
 *
 * **The plan's (b) check, 79.94%, does not reproduce, and cannot:** entry 107 measured it before
 * ADR-058 (`653d425`) narrowed the band floor. On this tree the in-tree algorithm itself
 * (`FF_FDI=1 FF_FDI_GAMES=496 vitest run test/forcingDecidingInstant.test.ts`, its baseline arm
 * `T=15 · m=1 · C=1`, run for S3 in 5m15s) prints: forced 34,549; deciding instant sole counter 54,
 * band floor 0, arrival 34,394, multi 101 (0.29%); whole duration multi 624 (1.81%); the pre-ADR-058
 * reading forced 35,211 = counter 13 + band floor 2,597 + arrival 5,647 + multi 26,954 (76.55%). So
 * the gated case asserts THOSE numbers, exactly: that is the reproduction of the restated algorithm,
 * and 79.94% is printed beside them as REPORTED-UNREPRODUCED.
 */
import type { MatchEventEnvelope, PocketStatus } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { positionsFromSnapshot, type TickChannels } from "../src/knownTruth/pocketChannelShares.js";
import { flatBaseline, goldenGames } from "../src/pocket/corpus.js";
import {
  classifySole,
  decidingInstantOf,
  emptyDecidingInstantFold,
  foldDecidingInstantGame,
  foldDropbackTicks,
  forcedOnTheStream,
  forcingSetOf,
  multiChannelShare,
  oldMultiChannelShare,
  oldStyleTicks,
  passPlayBuffers,
  soleChannelsOverRange,
  wholeDurationMultiShare,
  type DecidingInstantFold,
} from "../src/pocket/decidingInstant.js";

const T = DEFAULT_TUNABLES;
const forcing = forcingSetOf(T);

const tick = (counter: PocketStatus, bandFloor: PocketStatus, arrival: PocketStatus, published: PocketStatus, alignment?: "EDGE" | "INTERIOR"): TickChannels => ({
  published,
  counter,
  bandFloor,
  arrival,
  arrivalAlignment: alignment,
  arrivalWonMargin: undefined,
  arrivalWonTravelSeconds: undefined,
  arrivalDepth: undefined,
  bandFloorUnnarrowed: bandFloor,
});

describe("the necessity test on constructed ticks", () => {
  it("forces at COLLAPSING and IMMEDIATE today", () => {
    expect([...forcing].sort()).toEqual(["COLLAPSING", "IMMEDIATE"]);
  });

  it("calls a tick where two channels force multi, and one where one forces sole", () => {
    expect(classifySole(soleChannelsOverRange([tick("CLEAN", "COLLAPSING", "COLLAPSING", "COLLAPSING")], forcing, T))).toEqual({ kind: "multi", sole: undefined });
    expect(classifySole(soleChannelsOverRange([tick("COLLAPSING", "CLEAN", "PRESSURE", "COLLAPSING")], forcing, T))).toEqual({ kind: "sole", sole: "counter" });
    expect(classifySole(soleChannelsOverRange([tick("PRESSURE", "IMMEDIATE", "PRESSURE", "IMMEDIATE")], forcing, T))).toEqual({ kind: "sole", sole: "bandFloor" });
    expect(classifySole(soleChannelsOverRange([tick("PRESSURE", "PRESSURE", "COLLAPSING", "COLLAPSING")], forcing, T))).toEqual({ kind: "sole", sole: "arrival" });
  });

  it("calls a range with no forcing tick ambiguous (every channel 'sole'), which a forced play never is", () => {
    expect(soleChannelsOverRange([tick("PRESSURE", "PRESSURE", "CLEAN", "PRESSURE")], forcing, T)).toEqual(["counter", "bandFloor", "arrival"]);
    expect(classifySole(["counter", "arrival"]).kind).toBe("ambiguous");
  });

  it("separates the whole duration (two channels at different ticks: multi) from the deciding instant (the first: sole)", () => {
    const ticks = [tick("CLEAN", "CLEAN", "CLEAN", "CLEAN"), tick("PRESSURE", "COLLAPSING", "CLEAN", "COLLAPSING"), tick("PRESSURE", "CLEAN", "IMMEDIATE", "IMMEDIATE")];
    expect(classifySole(soleChannelsOverRange(ticks, forcing, T)).kind).toBe("multi");
    const di = decidingInstantOf(ticks, forcing, T);
    expect(di?.index).toBe(1);
    expect(di?.classification).toEqual({ kind: "sole", sole: "bandFloor" });
    expect(di?.bandArrivalTie).toBe(false);
  });

  it("splits the band-floor and arrival tie by the argmin rusher's alignment, and folds the counts", () => {
    const fold: DecidingInstantFold = emptyDecidingInstantFold();
    foldDropbackTicks(fold, [tick("CLEAN", "COLLAPSING", "COLLAPSING", "COLLAPSING", "INTERIOR")], true, forcing, T);
    foldDropbackTicks(fold, [tick("CLEAN", "COLLAPSING", "COLLAPSING", "COLLAPSING", "EDGE")], true, forcing, T);
    foldDropbackTicks(fold, [tick("COLLAPSING", "COLLAPSING", "CLEAN", "COLLAPSING")], true, forcing, T);
    foldDropbackTicks(fold, [tick("COLLAPSING", "CLEAN", "CLEAN", "COLLAPSING")], true, forcing, T);
    foldDropbackTicks(fold, [tick("CLEAN", "CLEAN", "CLEAN", "CLEAN")], false, forcing, T);
    foldDropbackTicks(fold, [tick("CLEAN", "CLEAN", "CLEAN", "CLEAN")], true, forcing, T);
    expect(fold.dropbacks).toBe(6);
    expect(fold.forced).toBe(5);
    expect(fold.diMulti).toBe(3);
    expect(fold.diMultiBandArrivalInterior).toBe(1);
    expect(fold.diMultiBandArrivalEdge).toBe(1);
    expect(fold.diMultiOther).toBe(1);
    expect(fold.diSole.counter).toBe(1);
    expect(fold.forcedWithoutInstant).toBe(1);
    expect(multiChannelShare(fold)).toBeCloseTo(3 / 5, 12);
  });
});

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
const env = (playId: string | undefined, event: Record<string, unknown>): MatchEventEnvelope => ({ seq: 0, at: AT, event: { gameId: "g", ...(playId === undefined ? {} : { playId }), ...event } as never });

describe("the pre-ADR-058 reading (entry 110's oldStyleTicks)", () => {
  it("puts the unnarrowed band floor back and recomputes the published status as the worst of three", () => {
    const narrowed = { ...tick("PRESSURE", "PRESSURE", "PRESSURE", "PRESSURE"), bandFloorUnnarrowed: "COLLAPSING" as const };
    const [old] = oldStyleTicks([narrowed], T);
    expect(old?.bandFloor).toBe("COLLAPSING");
    expect(old?.published).toBe("COLLAPSING");
    const fold = emptyDecidingInstantFold();
    foldDropbackTicks(fold, [{ ...tick("CLEAN", "CLEAN", "COLLAPSING", "COLLAPSING", "INTERIOR"), bandFloorUnnarrowed: "COLLAPSING" }], true, forcing, T);
    expect(fold.diSole.arrival).toBe(1);
    expect(fold.oldDiMulti).toBe(1);
    expect(fold.oldDiMultiBandArrivalInterior).toBe(1);
    expect(oldMultiChannelShare(fold)).toBe(1);
  });
});

describe("the PASS-play buffers", () => {
  it("keeps each PASS play from its PLAY_START to the next, game-scoped events included, and drops other plays", () => {
    const events = [
      env("p1", { type: "PLAY_START", payload: { kind: "RUN_PLAY_V1" } }),
      env("p1", { type: "TICK", payload: { tick: 0.5 } }),
      env("p2", { type: "PLAY_START", payload: { kind: "PASS_PLAY_V1" } }),
      env("p2", { type: "POCKET_STATUS", payload: { status: "PRESSURE" } }),
      env(undefined, { type: "QUARTER_END", payload: {} }),
      env("p3", { type: "PLAY_START", payload: { kind: "PASS_PLAY_V1" } }),
      env("p3", { type: "POCKET_STATUS", payload: { status: "COLLAPSING" } }),
    ];
    const bufs = passPlayBuffers(events);
    expect(bufs.map((b) => b.length)).toEqual([3, 2]);
    expect(forcedOnTheStream(bufs[0] ?? [], forcing)).toBe(false);
    expect(forcedOnTheStream(bufs[1] ?? [], forcing)).toBe(true);
  });
});

function checkSums(fold: DecidingInstantFold): void {
  expect(fold.identityMismatches).toBe(0);
  expect(fold.identityChecks).toBeGreaterThan(0);
  expect(fold.forcedWithoutInstant).toBe(0);
  expect(fold.wdAmbiguous).toBe(0);
  expect(fold.diAmbiguous).toBe(0);
  const di = fold.diSole.counter + fold.diSole.bandFloor + fold.diSole.arrival;
  const wd = fold.wdSole.counter + fold.wdSole.bandFloor + fold.wdSole.arrival;
  expect(di + fold.diMulti).toBe(fold.forced);
  expect(wd + fold.wdMulti).toBe(fold.forced);
  expect(fold.diMultiBandArrivalInterior + fold.diMultiBandArrivalEdge + fold.diMultiOther).toBe(fold.diMulti);
  expect(fold.oldDiAmbiguous).toBe(0);
  expect(fold.oldDiSole.counter + fold.oldDiSole.bandFloor + fold.oldDiSole.arrival + fold.oldDiMulti).toBe(fold.oldForced);
  expect(fold.oldForced).toBeGreaterThanOrEqual(fold.forced);
}

const line = (corpus: string, fold: DecidingInstantFold): string =>
  `##POCKET_DECIDING_INSTANT## ${JSON.stringify({
    corpus,
    dropbacks: fold.dropbacks,
    forced: fold.forced,
    diMulti: fold.diMulti,
    diSharePct: Number((100 * multiChannelShare(fold)).toFixed(2)),
    wdSharePct: Number((100 * wholeDurationMultiShare(fold)).toFixed(2)),
    diSole: fold.diSole,
    tieInterior: fold.diMultiBandArrivalInterior,
    tieEdge: fold.diMultiBandArrivalEdge,
    other: fold.diMultiOther,
    oldForced: fold.oldForced,
    oldDiMulti: fold.oldDiMulti,
    oldDiSharePct: Number((100 * oldMultiChannelShare(fold)).toFixed(2)),
    oldDiSole: fold.oldDiSole,
    oldTieInterior: fold.oldDiMultiBandArrivalInterior,
    oldTieEdge: fold.oldDiMultiBandArrivalEdge,
    oldOther: fold.oldDiMultiOther,
    entry107: { diSharePct: 79.94, wdSharePct: 90.41 },
  })}`;

describe("on real games", () => {
  it("two flat golden games: the identity holds, nothing is ambiguous, the counts add up", () => {
    const fold = emptyDecidingInstantFold();
    goldenGames("flat", (observation, snapshot) => foldDecidingInstantGame(fold, observation.events, T, positionsFromSnapshot(snapshot)), { first: 2 });
    console.log(line("flat golden, 2 games", fold));
    expect(fold.forced).toBeGreaterThan(0);
    checkSums(fold);
  }, 120_000);

  it.skipIf(process.env["FF_POCKET_BASE"] !== "1")("the 496-game flat corpus, set 1, against entry 107's 79.94% (FF_POCKET_BASE=1)", () => {
    const fold = emptyDecidingInstantFold();
    flatBaseline(1, (observation, snapshot) => foldDecidingInstantGame(fold, observation.events, T, positionsFromSnapshot(snapshot)));
    console.log(line("flat baseline set 1, 496 games", fold));
    checkSums(fold);
    // The in-tree algorithm's own baseline-arm figures on this tree (see the header).
    expect(fold.dropbacks).toBe(43_837);
    expect(fold.forced).toBe(34_549);
    expect(fold.diSole).toEqual({ counter: 54, bandFloor: 0, arrival: 34_394 });
    expect(fold.diMulti).toBe(101);
    expect(fold.diMultiOther).toBe(101);
    expect(fold.wdSole).toEqual({ counter: 45, bandFloor: 0, arrival: 33_880 });
    expect(fold.wdMulti).toBe(624);
    expect(fold.oldForced).toBe(35_211);
    expect(fold.oldDiSole).toEqual({ counter: 13, bandFloor: 2_597, arrival: 5_647 });
    expect(fold.oldDiMulti).toBe(26_954);
    expect(fold.oldDiMultiBandArrivalInterior + fold.oldDiMultiBandArrivalEdge).toBe(26_944);
    expect(fold.oldDiMultiOther).toBe(10);
  }, 1_800_000);
});
