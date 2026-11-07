/**
 * ADR-089 step 5: THE TWO CLEAN-POCKET ROWS (plan §4's rows row; `bands.ts`'s FUTURE_ROWS
 * `row:scramble_rate_by_pocket` and `row:clean_throwaway_in_pocket`, `mustExistBy: "5a"`), on
 * constructed dropbacks: the pocket test (worst status up to the escape, or to the end, CLEAN; escapes
 * allowed, unlike CP's `isCleanDropback`), scrambles and throwaways in and out of the pocket per 100
 * dropbacks of each pocket, the clause construct (clean outs) and the build check (no clean scramble
 * without the block). The bench and league readings are the same fold on a game's events
 * (`foldCleanPocketRowsGame`); the s4 and s5 bench smokes below play one golden game each.
 */
import { describe, expect, it } from "vitest";
import { goldenGames } from "../src/pocket/corpus.js";
import { CLEAN_BENCH_PARTS, cleanBenchTunablesS4, cleanBenchTunablesS5 } from "../src/pocket/oneThreatBench.js";
import {
  cleanPocketRowProblems,
  cleanPocketRows,
  emptyCleanPocketRowsFold,
  foldCleanPocketRowsDropback,
  foldCleanPocketRowsGame,
  isThrowawayInPocket,
  rowPocketOf,
} from "../src/pocket/rows.js";
import { STEP1_CALLER } from "../src/pocket/step1.js";
import { isCleanDropback, type Dropback } from "../src/pocket/throwClass.js";
import { FUTURE_ROWS } from "../src/pocket/bands.js";

type Status = Dropback["statuses"][number]["status"];

/** A constructed dropback: only the facts the rows read. */
function dropback(x: { statuses?: readonly [number, Status][]; pursuitTick?: number; scramble?: boolean; throwawayTick?: number; throwTick?: number }): Dropback {
  const throwTick = x.throwTick;
  const scramble = x.scramble ?? false;
  return {
    playId: "p",
    start: {} as Dropback["start"],
    statuses: (x.statuses ?? []).map(([tick, status]) => ({ tick, status })),
    threats: [],
    checks: [],
    reads: [],
    decisions: [],
    routes: [],
    throwTick,
    throwTarget: throwTick === undefined ? undefined : "r",
    throwawayTick: x.throwawayTick,
    throwawayCause: x.throwawayTick === undefined ? undefined : "CLOCK_EXPIRED",
    pursuitTick: x.pursuitTick,
    scramble,
    scrambleYards: scramble ? 4 : undefined,
    caught: false,
    intercepted: false,
    resultYards: 0,
    clockRunoff: 0,
    sacked: throwTick === undefined && x.throwawayTick === undefined && !scramble,
    endTick: 5,
  };
}

describe("the pocket the two rows read", () => {
  it("is the worst status up to the escape, or to the end, with escapes allowed", () => {
    expect(rowPocketOf(dropback({}))).toBe("CLEAN");
    expect(rowPocketOf(dropback({ statuses: [[0.5, "CLEAN"], [1, "CLEAN"]] }))).toBe("CLEAN");
    expect(rowPocketOf(dropback({ statuses: [[0.5, "CLEAN"], [1, "PRESSURE"], [1.5, "CLEAN"]] }))).toBe("PRESSURED");
    // A clean escape: CLEAN up to the pursuit tick; what follows the escape is not the pocket's.
    const cleanEscape = dropback({ statuses: [[0.5, "CLEAN"], [3, "CLEAN"], [3.5, "COLLAPSING"]], pursuitTick: 3, scramble: true });
    expect(rowPocketOf(cleanEscape)).toBe("CLEAN");
    expect(isCleanDropback(cleanEscape)).toBe(false);
    expect(rowPocketOf(dropback({ statuses: [[0.5, "CLEAN"], [3, "IMMEDIATE"]], pursuitTick: 3, scramble: true }))).toBe("PRESSURED");
  });

  it("a throwaway is in the pocket only before any escape", () => {
    expect(isThrowawayInPocket(dropback({ throwawayTick: 2.5 }))).toBe(true);
    expect(isThrowawayInPocket(dropback({ throwawayTick: 2.5, pursuitTick: 3 }))).toBe(true);
    expect(isThrowawayInPocket(dropback({ throwawayTick: 4, pursuitTick: 3 }))).toBe(false);
    expect(isThrowawayInPocket(dropback({ throwawayTick: 3, pursuitTick: 3 }))).toBe(false);
    expect(isThrowawayInPocket(dropback({ throwTick: 2 }))).toBe(false);
  });
});

describe("row:scramble_rate_by_pocket and row:clean_throwaway_in_pocket", () => {
  it("are the two FUTURE_ROWS ids", () => {
    const rows = cleanPocketRows(emptyCleanPocketRowsFold());
    expect(Object.keys(rows).sort()).toEqual(["row:clean_throwaway_in_pocket", "row:scramble_rate_by_pocket"]);
    for (const id of Object.keys(rows)) expect(FUTURE_ROWS[id]?.mustExistBy, id).toBe("5a");
  });

  it("count per 100 dropbacks of each pocket, with clean outs and clean escapes beside", () => {
    const fold = emptyCleanPocketRowsFold();
    const plays: Dropback[] = [
      dropback({ statuses: [[0.5, "CLEAN"]], throwTick: 2 }), // clean, aimed
      dropback({ statuses: [[0.5, "CLEAN"]], pursuitTick: 3, scramble: true }), // clean scramble
      dropback({ statuses: [[0.5, "CLEAN"]], pursuitTick: 3, throwawayTick: 4 }), // clean escape, throwaway out of the pocket
      dropback({ statuses: [[0.5, "CLEAN"]], throwawayTick: 2.5 }), // clean throwaway in the pocket
      dropback({ statuses: [[0.5, "PRESSURE"]], pursuitTick: 1, scramble: true }), // pressured scramble
      dropback({ statuses: [[0.5, "COLLAPSING"]], throwawayTick: 1 }), // pressured throwaway in the pocket
      dropback({ statuses: [[0.5, "CLEAN"]], pursuitTick: 2, throwTick: 3 }), // clean escape, thrown on the run
      dropback({ statuses: [[0.5, "IMMEDIATE"]] }), // pressured sack
    ];
    for (const d of plays) foldCleanPocketRowsDropback(fold, d);
    expect(fold.CLEAN).toEqual({ dropbacks: 5, escapes: 3, scrambles: 1, throwawaysInPocket: 1, throwawaysOutOfPocket: 1 });
    expect(fold.PRESSURED).toEqual({ dropbacks: 3, escapes: 1, scrambles: 1, throwawaysInPocket: 1, throwawaysOutOfPocket: 0 });
    const rows = cleanPocketRows(fold) as Record<string, Record<string, Record<string, unknown>>>;
    expect(rows["row:scramble_rate_by_pocket"]).toEqual({ clean: { per100: 20, n: 1, dropbacks: 5 }, pressured: { per100: 100 / 3, n: 1, dropbacks: 3 } });
    const t = rows["row:clean_throwaway_in_pocket"]!;
    expect(t["clean"]).toEqual({ inPocketPer100: 20, outOfPocketPer100: 20, per100: 40, inPocket: 1, outOfPocket: 1, dropbacks: 5 });
    expect(t["pressured"]).toMatchObject({ inPocket: 1, outOfPocket: 0, dropbacks: 3 });
    // AM-9's clause construct: clean scrambles plus clean throwaways, in and out, per 100 clean dropbacks.
    expect(t["cleanOuts"]).toEqual({ per100: 60, n: 3, dropbacks: 5 });
    expect(t["cleanEscapes"]).toEqual({ per100: 60, n: 3, dropbacks: 5 });
  });

  it("read null with no dropback of a pocket", () => {
    const rows = cleanPocketRows(emptyCleanPocketRowsFold()) as Record<string, Record<string, Record<string, unknown>>>;
    expect(rows["row:scramble_rate_by_pocket"]!["clean"]).toEqual({ per100: null, n: 0, dropbacks: 0 });
  });

  it("the build check: a clean scramble with no block is a problem; with the block it is not", () => {
    const off = emptyCleanPocketRowsFold();
    off.block = false;
    expect(cleanPocketRowProblems(off)).toEqual([]);
    foldCleanPocketRowsDropback(off, dropback({ statuses: [[0.5, "CLEAN"]], pursuitTick: 3, scramble: true }));
    expect(cleanPocketRowProblems(off)).toEqual(["rows: 1 clean scrambles on games with no clean-pocket block, which can have none"]);
    const on = { ...off, block: true };
    expect(cleanPocketRowProblems(on)).toEqual([]);
  });

  it("one fold refuses games with and without the block", () => {
    const fold = emptyCleanPocketRowsFold();
    foldCleanPocketRowsGame(fold, [], cleanBenchTunablesS4());
    expect(fold.block).toBe(false);
    expect(() => foldCleanPocketRowsGame(fold, [], cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS }))).toThrow(/with and without/);
  });
});

describe("the bench smokes (one golden flat game each; printed beside, never pinned)", () => {
  it("step 4's bench (no block, E0's tree) has no clean scramble; step 5's (every part) has some", () => {
    const run = (tunables: ReturnType<typeof cleanBenchTunablesS4>) => {
      const fold = emptyCleanPocketRowsFold();
      goldenGames("flat", (o) => foldCleanPocketRowsGame(fold, o.events, tunables), { tunables, callerVersion: STEP1_CALLER, first: 1 });
      return fold;
    };
    const s4 = run(cleanBenchTunablesS4());
    const s5 = run(cleanBenchTunablesS5({ on: CLEAN_BENCH_PARTS }));
    process.stdout.write(`clean-pocket rows, s4 bench: ${JSON.stringify(cleanPocketRows(s4))}\nclean-pocket rows, s5 bench: ${JSON.stringify(cleanPocketRows(s5))}\n`);
    expect(s4.block).toBe(false);
    expect(s4.CLEAN.dropbacks).toBeGreaterThan(50);
    expect(s4.CLEAN.scrambles).toBe(0);
    expect(cleanPocketRowProblems(s4)).toEqual([]);
    expect(s5.block).toBe(true);
    expect(s5.CLEAN.scrambles).toBeGreaterThan(0);
  }, 120_000);
});
