/**
 * ADR-089 step 5: ONE FIXTURE PER TAUGHT READER (plan §4's readers row: "a fixture per reader (a
 * clean MOVE, a reading HOLD at 2.5 s, a THROW) gives zero exceptions under s5 and today's folds
 * under s4").
 *
 * The fixture is a real stream through the engine's seam: the first golden flat game on step 5's clean
 * bench with every part on (`cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS })`, stamped `pocket-1.s5a`;
 * no status above CLEAN, so every movement CHECK on it is a clean pick). Its play `...:play:61` is the
 * plan's play: a clean pick answered by STEP_UP at 1.5 s, his reads restarted, a closing HOLD at
 * 2.0 s and a reading HOLD at 2.5 s, and a THROW at 3.0 s. Each reader reads the stream twice:
 * with the bundle that played it (the block present: zero exceptions, the clean picks counted apart)
 * and with step 4's bench (`cleanBenchTunablesS4()`, the same tree without the block: today's reading,
 * which takes a clean pick for a gated MOVEMENT and bites). The re-fold proof (`pocketRefold.test.ts`)
 * shows the s2 to s4 pins' golden games fold as before.
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { GameSnapshot } from "@ff/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { CLEAN_PICK_SUFFIX, cleanCountAt, cleanPocketOf, firstReadRouteOf, isCleanPickLabel, restatedFloorSeconds } from "../src/pocket/cleanPick.js";
import { goldenGames } from "../src/pocket/corpus.js";
import { emptyM2StreamFold, foldM2StreamGame } from "../src/pocket/m2ForcingSource.js";
import { crossCheckMovement, emptyM6Fold, m6Summary, playersOfSnapshot } from "../src/pocket/m6Contact.js";
import { CLEAN_BENCH_PARTS, cleanBenchTunablesS4, cleanBenchTunablesS5 } from "../src/pocket/oneThreatBench.js";
import { emptyAffectedFold, foldAffectedGame } from "../src/pocket/s1Stream.js";
import { closingHoldsOf, emptyMustActFold, forcedActsOf, mustActCheck, readS2Play, s2ContextOf, selfCheckOf, type S2Play } from "../src/pocket/s2Stream.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { playsOf, readDropback } from "../src/pocket/throwClass.js";

const S5 = cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS });
const S4 = cleanBenchTunablesS4();
const PLAY = "g:2024:w1:t:31@t:00:r0:play:61";

let events: readonly MatchEventEnvelope[] = [];
let snapshot: GameSnapshot | undefined;
let play: S2Play | undefined;

beforeAll(() => {
  goldenGames(
    "flat",
    (o, snap) => {
      events = [...o.events];
      snapshot = snap;
    },
    { tunables: S5, callerVersion: STEP1_CALLER, first: 1 },
  );
  const slice = playsOf(events).find((p) => p.playId === PLAY);
  if (slice === undefined) throw new Error(`no play ${PLAY} on the fixture game`);
  play = readS2Play(slice.playId, slice.events);
}, 120_000);

const snap = (): GameSnapshot => {
  if (snapshot === undefined) throw new Error("no fixture game");
  return snapshot;
};
const thePlay = (): S2Play => {
  if (play === undefined) throw new Error("no fixture play");
  return play;
};

describe("the clean-pick helpers (cleanPick.ts)", () => {
  it("the block is read off the play's own bundle; the label family is `:clean`", () => {
    expect(cleanPocketOf(S5)).toBeDefined();
    expect(cleanPocketOf(S4)).toBeUndefined();
    expect(CLEAN_PICK_SUFFIX).toBe(":clean");
    expect(isCleanPickLabel("a/movement/t1.5:clean")).toBe(true);
    expect(isCleanPickLabel("a/movement/t1.5:movement")).toBe(false);
  });

  it("the floor: the first read's route as run, 0 for a screen or with no floor", () => {
    const block = cleanPocketOf(S5)!;
    const start = (routes: unknown[], order: unknown[]) => ({ offense: { readOrder: order, routes } });
    const deep = firstReadRouteOf(start([{ receiver: "a", depthClass: "DEEP", airYards: 20 }, { receiver: "b", depthClass: "QUICK", airYards: 3 }], ["a", "b"]));
    expect(deep).toEqual({ receiver: "a", depthClass: "DEEP", airYards: 20 });
    expect(restatedFloorSeconds(block, deep)).toBe(2);
    expect(restatedFloorSeconds(block, firstReadRouteOf(start([{ receiver: "b", depthClass: "QUICK", airYards: 3 }], ["b"])))).toBe(1);
    expect(restatedFloorSeconds(block, firstReadRouteOf(start([{ receiver: "s", depthClass: "QUICK", airYards: -1 }], ["s"])))).toBe(0);
    expect(restatedFloorSeconds(block, firstReadRouteOf(start([], [])))).toBe(0);
    const { dropFloor: _floor, ...noFloor } = block;
    expect(restatedFloorSeconds(noFloor, deep)).toBe(0);
    expect(() => firstReadRouteOf(start([{ receiver: "a" }], ["a"]))).toThrow(/depth class/);
  });

  it("the count after a clean move: move tick + tick step + reset, reads since the restart, at or past the floor", () => {
    const block = cleanPocketOf(S5)!;
    const x = { tunables: S5, block, baseBudget: 2.4, maxReads: 3, floorSeconds: 1.5, moveTicks: [1.5], readTicks: [0.5, 1, 1.5, 2, 2.5] };
    expect(cleanCountAt(x, 1)).toMatchObject({ budget: 2.4, reads: 2, spent: false, pastFloor: false, count: false });
    // At the move tick the base budget is in force (the move is strictly before the tick it restates).
    expect(cleanCountAt(x, 1.5)).toMatchObject({ budget: 2.4, restartedAt: undefined, reads: 3, spent: true, count: true, trigger: "reads" });
    expect(cleanCountAt(x, 2)).toMatchObject({ budget: 1.5 + S5.clock.tickStepSeconds + block.resetSeconds, restartedAt: 1.5, reads: 1, spent: false, count: false });
    expect(cleanCountAt(x, 3)).toMatchObject({ reads: 2, spent: true, count: true, trigger: "count" });
    expect(cleanCountAt({ ...x, floorSeconds: 4 }, 3)).toMatchObject({ spent: true, pastFloor: false, count: false });
  });
});

describe("the fixture play: a clean MOVE, a reading HOLD at 2.5 s, a THROW", () => {
  it("is what the plan names", () => {
    const p = thePlay();
    expect(p.movements.map((m) => [m.tick, m.clean])).toEqual([[1.5, true]]);
    expect(p.stepUps.map((u) => u.tick)).toEqual([1.5]);
    expect(p.holds.map((h) => h.tick)).toEqual([0.5, 1, 2, 2.5]);
    expect(p.throws.map((t) => t.tick)).toEqual([3]);
    expect(p.statuses.every((s) => s.status === "CLEAN")).toBe(true);
    // His reads restart after the move.
    expect(p.reads.some((r) => r.kind === "PROGRESSION" && r.tick > 1.5)).toBe(true);
  });
});

describe("s2Stream: must act and its witness", () => {
  it("under the play's own bundle: zero exceptions on the play and on the whole game, the clean picks counted apart", () => {
    const ctx = s2ContextOf(S5, snap());
    const one = emptyMustActFold();
    mustActCheck(one, thePlay(), ctx);
    expect(one.problems).toEqual([]);
    expect(one.witness.problems).toEqual([]);
    expect(one.witness.cleanPicks).toBe(1);
    // The clean pick is its own act, never a MOVEMENT: the checkdown looks and the throw (best below
    // the normal bar, so DESPERATION by today's class) stay, each on a spent count.
    expect(forcedActsOf(thePlay(), S5).map((a) => [a.kind, a.tick])).toEqual([["CHECKDOWN_LOOK", 1.5], ["CHECKDOWN_LOOK", 3], ["DESPERATION", 3]]);
    expect(closingHoldsOf(thePlay()).map((h) => h.tick)).toEqual([0.5, 1, 2, 2.5]);
    expect(selfCheckOf(one)).toHaveProperty("cleanPicks", 1);
    const game = emptyMustActFold();
    for (const slice of playsOf(events)) {
      const p = readS2Play(slice.playId, slice.events);
      if (p !== undefined) mustActCheck(game, p, ctx);
    }
    expect(game.problemCount).toBe(0);
    expect(game.witness.problemCount).toBe(0);
    expect(game.witness.cleanPicks).toBeGreaterThan(10);
  });

  it("read with step 4's bench (no block): today's reading, which takes the clean pick for a gated MOVEMENT and bites", () => {
    const ctx = s2ContextOf(S4, snap());
    const fold = emptyMustActFold();
    mustActCheck(fold, thePlay(), ctx);
    expect(forcedActsOf(thePlay(), S4).map((a) => [a.kind, a.tick])).toEqual([["CHECKDOWN_LOOK", 1.5], ["MOVEMENT", 1.5], ["CHECKDOWN_LOOK", 3], ["DESPERATION", 3]]);
    expect(fold.problems.some((p) => p.includes("must act fired on the counter alone: a MOVEMENT"))).toBe(true);
    expect(fold.witness.problems.some((p) => p.includes("tick 2.5: witness: a closing HOLD at or past throwawayEarliestSeconds"))).toBe(true);
    expect(fold.witness).not.toHaveProperty("cleanPicks");
    expect(selfCheckOf(fold)).not.toHaveProperty("cleanPicks");
  });
});

describe("m6Contact: the movement cross-check", () => {
  it("under the play's own bundle the clean picks are skipped and counted; with no block today's cross-check reads them", () => {
    const players = playersOfSnapshot(snap());
    const s5 = emptyM6Fold();
    const s4 = emptyM6Fold();
    let picks = 0;
    for (const slice of playsOf(events)) {
      const d = readDropback(slice);
      if (d === undefined) continue;
      picks += d.checks.filter((c) => c.checkKind === "pocket_movement").length;
      crossCheckMovement(s5, d, [], players, S5);
      crossCheckMovement(s4, d, [], players, S4);
    }
    expect(picks).toBeGreaterThan(10);
    expect(s5).toMatchObject({ cleanPicks: picks, movementChecks: 0, unreadChecks: 0, bandMismatches: 0, pickMismatches: 0 });
    expect((m6Summary(s5)["crossCheck"] as Record<string, unknown>)["cleanPicksSkipped"]).toBe(picks);
    // Today's reading: every clean pick is a movement check, and with no replayed tick it is unread.
    expect(s4).toMatchObject({ movementChecks: picks, unreadChecks: picks });
    expect(s4).not.toHaveProperty("cleanPicks");
    expect(m6Summary(s4)["crossCheck"]).not.toHaveProperty("cleanPicksSkipped");
  });
});

describe("s1Stream: CLIMB_FRONT counts today's picks only", () => {
  it("a clean pick with an INTERIOR threat live (the lane rules part ways) is not CLIMB_FRONT under the block, and is with none", () => {
    const slice = playsOf(events).find((p) => p.playId === PLAY)!;
    const at = slice.events.findIndex((e) => e.event.type === "CHECK" && e.event.payload.checkKind === "pocket_movement");
    expect(at).toBeGreaterThan(0);
    const model = slice.events[at]!;
    // A blocked INTERIOR threat: INTERIOR closes the lane under today's rule and not under FRONT's.
    const threat = { ...model, event: { ...model.event, type: "RUSH_THREAT", payload: { rusher: "p:fixture", alignment: "INTERIOR", approach: "BLOCKED", origin: "WON_REP", state: "TRAVELLING", etaTick: 9, rollRef: "fixture" } } } as unknown as MatchEventEnvelope;
    const withThreat = [...slice.events.slice(0, at), threat, ...slice.events.slice(at)];
    const s5 = emptyAffectedFold(["CLIMB_FRONT"]);
    const s4 = emptyAffectedFold(["CLIMB_FRONT"]);
    foldAffectedGame(s5, withThreat, S5, ["CLIMB_FRONT"]);
    foldAffectedGame(s4, withThreat, S4, ["CLIMB_FRONT"]);
    expect(s5.byMechanism).toEqual({ CLIMB_FRONT: 0 });
    expect(s4.byMechanism).toEqual({ CLIMB_FRONT: 1 });
    // The stream as played (no threat on the clean bench): neither reading finds one.
    const plain4 = emptyAffectedFold(["CLIMB_FRONT"]);
    foldAffectedGame(plain4, slice.events, S4, ["CLIMB_FRONT"]);
    expect(plain4.byMechanism).toEqual({ CLIMB_FRONT: 0 });
  });
});

describe("m2ForcingSource: M2 STREAM replays a clean climb as the engine plays it", () => {
  it("on the fixture game every rebuilt status equals the published one (a clean STEP_UP delays EDGE threats as a forced one does)", () => {
    const fold = emptyM2StreamFold();
    foldM2StreamGame(fold, events, S5, positionsFromSnapshot(snap()));
    expect(fold.statusChecks).toBeGreaterThan(100);
    expect(fold.statusMismatches).toBe(0);
    expect(fold.threatMismatches).toBe(0);
    expect(fold.jitterMismatches).toBe(0);
  });
});
