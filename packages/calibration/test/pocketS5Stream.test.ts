/**
 * ADR-089 step 5: THE STEP-5a PER-DROPBACK FOLDS (`s5Stream.ts`; plan §4's `s5Stream.ts` row).
 *
 * Real streams through the engine's seam (no fit, no pins): the first golden flat game on step 5's
 * clean bench with every part on (`pocket-1.s5a`) and on step 4's (`pocket-1.s4`, E0's tree, no
 * block). The readings are checked against the play the reader fixtures use (`...:play:61`: a clean
 * MOVE at 1.5 s, a reading HOLD at 2.5 s, D23's THROW at 3.0 s) and against the engine's own
 * structure: with MOVE and ESCAPE both on, every clean expiry ends in a THROW, a MOVE or an ESCAPE,
 * and every clean pick sits on one; without the block there is no pick, move, bump or clean escape.
 * Constructed dropbacks check the bump's two stream facts (past the break, the contest position).
 */
import type { MatchEventEnvelope } from "@ff/contracts";
import type { GameSnapshot, Tunables } from "@ff/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { goldenGames } from "../src/pocket/corpus.js";
import { CLEAN_BENCH_PARTS, cleanBenchTunablesS4, cleanBenchTunablesS5 } from "../src/pocket/oneThreatBench.js";
import {
  contestPositionAt,
  emptyS5Fold,
  foldS5Dropback,
  foldS5Game,
  pastBreakAt,
  readOrderOf,
  s5DropbacksOf,
  s5Summary,
  type S5Dropback,
} from "../src/pocket/s5Stream.js";
import { POCKET_1_S5A_RULES, readSystemDeltaLeaves, step5Bundle } from "../src/pocket/rules.js";
import { climbLaneOpenOn, todayUrgencyOf } from "../src/pocket/s5Stream.js";
import { s2ContextOf, type LiveThreat } from "../src/pocket/s2Stream.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import type { Dropback } from "../src/pocket/throwClass.js";

const S5 = cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS });
const S4 = cleanBenchTunablesS4();

interface Game {
  readonly events: readonly MatchEventEnvelope[];
  readonly snapshot: GameSnapshot;
}

function firstGame(tunables: Tunables): Game {
  let game: Game | undefined;
  goldenGames("flat", (o, snapshot) => (game = { events: [...o.events], snapshot }), { tunables, callerVersion: STEP1_CALLER, first: 1 });
  if (game === undefined) throw new Error("no golden game");
  return game;
}

let s5: Game;
let s4: Game;
let x5: readonly S5Dropback[] = [];
let x4: readonly S5Dropback[] = [];

beforeAll(() => {
  s5 = firstGame(S5);
  s4 = firstGame(S4);
  x5 = s5DropbacksOf(s5.events, s2ContextOf(S5, s5.snapshot));
  x4 = s5DropbacksOf(s4.events, s2ContextOf(S4, s4.snapshot));
}, 120_000);

describe("s5Stream on the fixture play (clean MOVE, reading HOLD at 2.5 s, THROW)", () => {
  it("reads its two clean expiries, the pick and its band, the move, the restart, the bump and the floor waits", () => {
    const p = x5.find((x) => x.playId.endsWith(":play:61"));
    expect(p).toBeDefined();
    expect(p).toMatchObject({ call: "Quick Outs", readSystem: "HALF_FIELD", screen: false, floorSeconds: 1.5, cleanMoves: [1.5], restarts: 1, escapes: [], coverageSack: false, sacked: false });
    // The first at the floor on the spent count (MOVE); the second on the restated budget, with his
    // reads spent, ends in D23's throw (best 31, at the expiry bar and below the normal bar).
    expect(p!.cleanExpiries).toEqual([
      { tick: 1.5, trigger: "count", outcome: "MOVE", best: 26, pool: 3, belowBar: 3 },
      { tick: 3, trigger: "reads", outcome: "THROW", best: 31, pool: 4, belowBar: 3 },
    ]);
    expect(p!.picks).toEqual([{ tick: 1.5, band: "SOUND", option: "MOVE", offered: ["MOVE", "ESCAPE"], todayUrgency: 0 }]);
    expect(p!.bumps).toEqual([{ tick: 1.5, receiver: "p:t:31:WR1", contest: "EVEN" }]);
    // HOLDs before the floor (0.5 and 1.0 s); the HOLDs at 2.0 and 2.5 s are after it.
    expect(p!.floorWaits).toEqual([
      { tick: 0.5, floorBound: false },
      { tick: 1, floorBound: false },
    ]);
  });
});

describe("s5Stream on the s5 bench game (every part on)", () => {
  it("every clean expiry ends in a THROW, a MOVE or an ESCAPE, and every clean pick sits on one with its option", () => {
    let expiries = 0;
    for (const x of x5) {
      for (const e of x.cleanExpiries) {
        expiries += 1;
        expect(["THROW", "MOVE", "ESCAPE"], `${x.playId} t${String(e.tick)}`).toContain(e.outcome);
        if (e.outcome === "THROW") expect(e.best ?? 0).toBeGreaterThanOrEqual(30);
        expect(e.tick).toBeGreaterThanOrEqual(x.floorSeconds);
      }
      for (const p of x.picks) {
        const e = x.cleanExpiries.find((c) => c.tick === p.tick);
        expect(e, `${x.playId} t${String(p.tick)}: a pick off a clean expiry`).toBeDefined();
        expect(e!.outcome).toBe(p.option);
      }
      expect(x.cleanMoves).toEqual(x.picks.filter((p) => p.option === "MOVE").map((p) => p.tick));
      expect(x.cleanMoves.length).toBeLessThanOrEqual(1);
      expect(x.escapes.every((e) => e.clean)).toBe(true);
      expect(x.escapes.map((e) => e.tick)).toEqual(x.picks.filter((p) => p.option === "ESCAPE").map((p) => p.tick));
      for (const b of x.bumps) expect(x.cleanMoves).toContain(b.tick);
      if (x.screen) expect(x.floorSeconds).toBe(0);
    }
    expect(expiries).toBeGreaterThan(20);
  });

  it("folds and summarises (printed beside, never pinned)", () => {
    const fold = emptyS5Fold();
    for (const x of x5) foldS5Dropback(fold, x);
    const again = emptyS5Fold();
    foldS5Game(again, s5.events, S5, s5.snapshot);
    expect(again).toEqual(fold);
    process.stdout.write(`s5Stream, s5 bench game 1: ${JSON.stringify(s5Summary(fold))}\n`);
    expect(fold.dropbacks).toBe(x5.length);
    // Guardian C4's split: every pick is in one of the two cells, its option in its offered set; the
    // bench has no threat, so today's urgency is 0 on every pick.
    expect(fold.picks.byOffered.one.n + fold.picks.byOffered.two.n).toBe(fold.picks.total);
    expect(fold.picks.byOffered.one.n).toBeGreaterThan(0);
    expect(fold.picks.byOffered.two.n).toBeGreaterThan(0);
    expect(fold.picks.offerFaults).toBe(0);
    expect(fold.picks.urgencyAbove0.n).toBe(0);
    expect(fold.picks.total).toBe(fold.cleanExpiries.byOutcome.MOVE + fold.cleanExpiries.byOutcome.ESCAPE);
    expect(fold.picks.byOption["MOVE"]).toBe(fold.cleanMoves);
    expect(fold.restarts).toBeLessThanOrEqual(fold.cleanMoves);
    expect(fold.escapes.attempts).toBe(fold.picks.byOption["ESCAPE"]);
    expect(Object.values(fold.escapes.forced).every((n) => n === 0)).toBe(true);
    expect(fold.cleanExpiries.byTrigger.reads + fold.cleanExpiries.byTrigger.count).toBe(fold.cleanExpiries.total);
    expect(fold.bumps.receivers).toBe(fold.bumps.byContest.TRAILING + fold.bumps.byContest.EVEN);
    expect(fold.coverageSacks.n).toBeLessThanOrEqual(fold.coverageSacks.sacks);
    expect(fold.screens).toBeGreaterThan(0);
    expect(fold.floorWaits.holds).toBeGreaterThan(0);
    expect(Object.values(fold.byCall).reduce((a, c) => a + c.dropbacks, 0)).toBe(fold.dropbacks);
  });
});

describe("s5Stream on the s4 bench game (no block: E0's reading)", () => {
  it("reads today's clean count expiries and no pick, move, bump, floor wait or clean escape", () => {
    const fold = emptyS5Fold();
    for (const x of x4) foldS5Dropback(fold, x);
    process.stdout.write(`s5Stream, s4 bench game 1: ${JSON.stringify(s5Summary(fold))}\n`);
    expect(fold.cleanExpiries.total).toBeGreaterThan(20);
    expect(fold.cleanExpiries.byOutcome.MOVE + fold.cleanExpiries.byOutcome.ESCAPE).toBe(0);
    // Today's path on a clean expiry: the desperation throw, the clock's throwaway, or a HOLD before
    // throwawayEarliestSeconds.
    for (const x of x4) for (const e of x.cleanExpiries) expect(["THROW", "THROWAWAY", "HOLD"]).toContain(e.outcome);
    expect(fold).toMatchObject({ picks: { total: 0 }, cleanMoves: 0, restarts: 0, bumps: { receivers: 0 }, escapes: { attempts: 0 }, floorWaits: { holds: 0 } });
    for (const x of x4) expect(x.floorSeconds).toBe(0);
  });
});

describe("the bump's stream facts, on constructed dropbacks", () => {
  const d = {
    playId: "p",
    checks: [
      { tick: 1, checkKind: "man_coverage", actors: ["wr1", "cb1"], band: S5.manCoverage.bands[0]!.label, margin: -30, rollRef: undefined, rngLabel: "x", rollTotal: 1, opposedTotal: 1 },
      { tick: 1, checkKind: "zone_coverage", actors: ["wr2", "lb1"], band: S5.zoneCoverage.bands[S5.zoneCoverage.bands.length - 1]!.label, margin: 30, rollRef: undefined, rngLabel: "y", rollTotal: 1, opposedTotal: 1 },
    ],
    routes: [
      { tick: 0.5, receiver: "wr1", phase: "STEM", openness: 0 },
      { tick: 1, receiver: "wr1", phase: "OPEN", openness: 40 },
      { tick: 1.5, receiver: "wr3", phase: "SETTLED", openness: 50 },
    ],
  } as unknown as Dropback;

  it("past the break: the latest ROUTE_STATUS phase by the tick is OPEN, SETTLED or DECAYING", () => {
    expect(pastBreakAt(d, "wr1", 0.5)).toBe(false);
    expect(pastBreakAt(d, "wr1", 1)).toBe(true);
    expect(pastBreakAt(d, "wr3", 1)).toBe(false);
    expect(pastBreakAt(d, "wr3", 2)).toBe(true);
    expect(pastBreakAt(d, "nobody", 2)).toBe(false);
  });

  it("the contest position: the coverage CHECK's band through the arm's table, else the uncovered cell's", () => {
    expect(contestPositionAt(d, S5, "wr1", 1)).toBe(S5.manCoverage.bands[0]!.contest);
    expect(contestPositionAt(d, S5, "wr2", 1)).toBe(S5.zoneCoverage.bands[S5.zoneCoverage.bands.length - 1]!.contest);
    expect(contestPositionAt(d, S5, "wr3", 2)).toBe(S5.zoneCoverage.uncoveredContestPosition);
    expect(contestPositionAt(d, S5, "wr1", 0.5)).toBe(S5.zoneCoverage.uncoveredContestPosition);
    const bad = { ...d, checks: [{ ...(d.checks[0] as object), band: "NO_SUCH_BAND" }] } as unknown as Dropback;
    expect(() => contestPositionAt(bad, S5, "wr1", 1)).toThrow(/not in the arm's band table/);
  });

  it("the read order comes off PLAY_START", () => {
    expect(readOrderOf({ offense: { readOrder: ["a", "b"] } })).toEqual(["a", "b"]);
    expect(readOrderOf({ offense: {} })).toEqual([]);
    expect(readOrderOf(undefined)).toEqual([]);
  });

  it("the fold refuses one call under two read systems", () => {
    const fold = emptyS5Fold();
    const x = { playId: "p", call: "Mesh", readSystem: "CONCEPT", screen: false, floorSeconds: 0, cleanExpiries: [], picks: [], cleanMoves: [], restarts: 0, bumps: [], escapes: [], floorWaits: [], coverageSack: false, sacked: false, sackTick: undefined };
    foldS5Dropback(fold, x);
    expect(() => foldS5Dropback(fold, { ...x, readSystem: "HALF_FIELD" })).toThrow(/reads CONCEPT and HALF_FIELD/);
  });
});

describe("the clean pick's offered set and today's urgency (guardian C4; the ruling on D27)", () => {
  const live = (alignment: "EDGE" | "INTERIOR", approach: LiveThreat["approach"], etaTick = 3): LiveThreat => ({ rusher: "r", origin: "WON_REP", alignment, etaTick, arrived: false, ...(approach === undefined ? {} : { approach }) }) as LiveThreat;

  it("today's urgency is the forced pick's rule: 0 with no threat, 1 for a threat 1.0 to 1.25 s out, 0 past 1.25 s", () => {
    expect(todayUrgencyOf(S5, undefined)).toBe(0);
    expect(todayUrgencyOf(S5, 1.1)).toBe(1);
    expect(todayUrgencyOf(S5, 1.2)).toBe(1);
    expect(todayUrgencyOf(S5, 1.3)).toBe(0);
    expect(todayUrgencyOf(S5, 0.5)).toBe(2);
  });

  it("the climb lane on the tick's live threats, by the arm's rule (FRONT: the approach's from-class; else INTERIOR)", () => {
    expect(S5.pocket.climbLane).toBe("FRONT");
    expect(climbLaneOpenOn(S5, [])).toBe(true);
    expect(climbLaneOpenOn(S5, [live("EDGE", "ARC")])).toBe(true);
    expect(climbLaneOpenOn(S5, [live("EDGE", "THROUGH")])).toBe(false);
    expect(climbLaneOpenOn(S5, [live("INTERIOR", "FREE")])).toBe(false);
    expect(climbLaneOpenOn(S5, [live("INTERIOR", "ARC")])).toBe(true);
    expect(() => climbLaneOpenOn(S5, [live("EDGE", undefined)])).toThrow(/no approach/);
    const interior = { ...S5, pocket: { ...S5.pocket, climbLane: undefined } } as unknown as Tunables;
    expect(climbLaneOpenOn(interior, [live("EDGE", "THROUGH")])).toBe(true);
    expect(climbLaneOpenOn(interior, [live("INTERIOR", "ARC")])).toBe(false);
  });

  it("the fold splits the picks one option from two, and counts those whose today's urgency is above 0 by option and offered set", () => {
    const fold = emptyS5Fold();
    const base = { playId: "p", call: "Mesh", readSystem: "CONCEPT", screen: false, floorSeconds: 1, cleanExpiries: [], cleanMoves: [], restarts: 0, bumps: [], escapes: [], floorWaits: [], coverageSack: false, sacked: false, sackTick: undefined };
    foldS5Dropback(fold, {
      ...base,
      picks: [
        { tick: 1, band: "SOUND", option: "MOVE", offered: ["MOVE", "ESCAPE"], todayUrgency: 1 },
        { tick: 2, band: "RUSHED", option: "ESCAPE", offered: ["ESCAPE"], todayUrgency: 1 },
        { tick: 3, band: "PANICKED", option: "ESCAPE", offered: ["MOVE", "ESCAPE"], todayUrgency: 0 },
        { tick: 4, band: "SOUND", option: "MOVE", offered: ["ESCAPE"], todayUrgency: 0 },
      ],
    });
    expect(fold.picks.byOffered.two).toEqual({ n: 2, byOption: { MOVE: 1, ESCAPE: 1 }, byBand: { SOUND: 1, PANICKED: 1 } });
    expect(fold.picks.byOffered.one).toEqual({ n: 2, byOption: { ESCAPE: 1, MOVE: 1 }, byBand: { RUSHED: 1, SOUND: 1 } });
    expect(fold.picks.offerFaults).toBe(1);
    expect(fold.picks.urgencyAbove0).toEqual({ n: 2, byOption: { MOVE: 1, ESCAPE: 1 }, byOffered: { one: 1, two: 1 } });
  });

  it("on the league (s5a's block at a fitted-like offset, gen golden game 36): a pick on a CLEAN tick with a threat 1.0 to 1.25 s out is read with today's urgency 1, and every option is in its offered set", () => {
    // The game the no-play-change review traced (gen 35, a BUBBLE_NOW screen, an INTERIOR FREE
    // blitzer 1.1 s out at 0.5 s): before the ruling the engine threw here.
    const t = step5Bundle(POCKET_1_S5A_RULES, readSystemDeltaLeaves({ HALF_FIELD: 0.5, FULL_FIELD: -0.25, CONCEPT: 1.0 }));
    const fold = emptyS5Fold();
    let picks = 0;
    goldenGames("gen", (o, snapshot) => {
      const ctx = s2ContextOf(t, snapshot);
      for (const x of s5DropbacksOf(o.events, ctx)) {
        foldS5Dropback(fold, x);
        picks += x.picks.length;
      }
    }, { tunables: t, callerVersion: STEP1_CALLER, first: 36 });
    process.stdout.write(`s5Stream, gen golden 36 at the offsets: picks ${JSON.stringify(fold.picks)}\n`);
    expect(picks).toBeGreaterThan(100);
    expect(fold.picks.offerFaults).toBe(0);
    expect(fold.picks.urgencyAbove0.n).toBeGreaterThan(0);
    expect(fold.picks.urgencyAbove0.byOffered.one + fold.picks.urgencyAbove0.byOffered.two).toBe(fold.picks.urgencyAbove0.n);
  }, 300_000);
});
