/**
 * ADR-089 step 0 — THE CLEAN BENCH (plan §6.3, §9 (b) and (c); P-6). Gated `FF_POCKET_BENCH=1`.
 *
 * pkB's tunables-only recipe (`cleanBenchTunables`: four `applyTunablePatch` leaves, in memory),
 * played on both base corpora's seed set 1: the flat league's 496 games through `runOneGame`'s
 * `tunables`, and the generated league's 2027 season through C1's `game.tunables` on the real
 * season path.
 *
 * **(c), code correctness, asserted:** release (the mean of `collect.ts`'s `throwTicks`) flat
 * 1.6634 s and gen 1.7992 s; throwaways (THROWAWAY per PASS PLAY_START) 20.625% and 11.127%; 52,882
 * and 28,588 dropbacks; pressured 0 and sacks 0 on both.
 *
 * **(b), the REPORTED figures of `rev/clean-pocket.md` §3.2 (:186-189), by `throwClass.ts`:** nobody
 * open gen 30.2% (8,631 of 28,588), desperation 10.1, checkdowns 8.9, throwaways 11.1; flat 43.6%
 * (23,064 of 52,882), 6.8, 16.2, 20.6; and the class guards, gen desperation INT 19.0% and
 * rank-pushed 16.3% of dropbacks at 20.9% INT. Beside the plan's list (additions, from the same
 * table, :190-192): flat desperation INT 5.7%, flat rank-pushed 14.1% at 12.4%, and open throws'
 * completion / INT, gen 48.0% / 2.66% and flat 46.8% / 0.38%. Each figure prints with "reproduced"
 * or "REPORTED-UNREPRODUCED" beside it, and is asserted as reproduced at the printed precision.
 */
import type { MatchEventEnvelope, PlayerId, Position } from "@ff/contracts";
import type { Tunables } from "@ff/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { emptyAccumulator, foldGame, type SimAccumulator } from "../src/metrics/collect.js";
import { flatBaseline, genSeason } from "../src/pocket/corpus.js";
import { cleanBenchTunables } from "../src/pocket/oneThreatBench.js";
import { emptyRowsFold, foldRowsDropback, type RowsFold } from "../src/pocket/rows.js";
import { dropbacksOf } from "../src/pocket/throwClass.js";

const GATED = process.env["FF_POCKET_BENCH"] !== "1";

interface BenchRun {
  acc: SimAccumulator;
  rows: RowsFold;
  passStarts: number;
  throwaways: number;
  games: number;
  ms: number;
}

function emptyRun(): BenchRun {
  return { acc: emptyAccumulator(), rows: emptyRowsFold(), passStarts: 0, throwaways: 0, games: 0, ms: 0 };
}

function foldBench(run: BenchRun, events: readonly MatchEventEnvelope[], tunables: Tunables, positions: ReadonlyMap<PlayerId, Position>): void {
  let pass = false;
  for (const { event } of events) {
    if (event.type === "PLAY_START") {
      pass = (event.payload as { readonly kind?: unknown } | undefined)?.kind === "PASS_PLAY_V1";
      if (pass) run.passStarts += 1;
    } else if (pass && event.type === "THROWAWAY") run.throwaways += 1;
  }
  for (const d of dropbacksOf(events)) foldRowsDropback(run.rows, d, tunables, (id) => positions.get(id as PlayerId));
}

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (n: number, d: number): number => (d === 0 ? 0 : (100 * n) / d);

function summary(run: BenchRun): Record<string, unknown> {
  const c = run.rows.byClass;
  const nobody = c.CHECKDOWN.dropbacks + c.DESPERATION.dropbacks + c.THROWAWAY.dropbacks + c.SACK.dropbacks;
  return {
    games: run.games,
    seconds: Number((run.ms / 1000).toFixed(1)),
    release: mean(run.acc.play.throwTicks).toFixed(4),
    throwawaysPct: pct(run.throwaways, run.passStarts).toFixed(3),
    passStarts: run.passStarts,
    accDropbacks: run.acc.play.dropbacks,
    rowsDropbacks: run.rows.dropbacks,
    pressured: run.acc.play.pressuredDropbacks,
    sacks: run.acc.play.sacks,
    nobodyOpen: { n: nobody, of: run.rows.dropbacks, pct: pct(nobody, run.rows.dropbacks).toFixed(1) },
    split: {
      desperation: pct(c.DESPERATION.dropbacks, run.rows.dropbacks).toFixed(1),
      checkdowns: pct(c.CHECKDOWN.dropbacks, run.rows.dropbacks).toFixed(1),
      throwaways: pct(c.THROWAWAY.dropbacks, run.rows.dropbacks).toFixed(1),
      sacks: c.SACK.dropbacks,
    },
    guards: {
      desperationInt: pct(c.DESPERATION.interceptions, c.DESPERATION.aimed).toFixed(1),
      rankPushedShare: pct(c.RANK_PUSHED.dropbacks, run.rows.dropbacks).toFixed(1),
      rankPushedInt: pct(c.RANK_PUSHED.interceptions, c.RANK_PUSHED.aimed).toFixed(1),
      openCompletion: pct(c.PROGRESSION.completions, c.PROGRESSION.aimed).toFixed(1),
      openInt: pct(c.PROGRESSION.interceptions, c.PROGRESSION.aimed).toFixed(2),
    },
    byClassDropbacks: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.dropbacks])),
  };
}

/** Prints a (b) figure as reproduced or REPORTED-UNREPRODUCED, then returns whether it reproduced. */
function reported(league: string, what: string, got: unknown, want: unknown): boolean {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  process.stdout.write(`ADR-089 clean bench (b) ${league} ${what}: ${JSON.stringify(got)} against ${JSON.stringify(want)}: ${ok ? "reproduced" : "REPORTED-UNREPRODUCED"}\n`);
  return ok;
}

describe.skipIf(GATED)("ADR-089 step 0: the clean bench (FF_POCKET_BENCH=1)", () => {
  const tunables = cleanBenchTunables();
  const flat = emptyRun();
  const gen = emptyRun();

  beforeAll(() => {
    let t0 = Date.now();
    flatBaseline(
      1,
      (o, snap) => {
        flat.acc = foldGame(flat.acc, o);
        foldBench(flat, o.events, tunables, positionsFromSnapshot(snap));
        flat.games += 1;
      },
      { tunables },
    );
    flat.ms = Date.now() - t0;
    t0 = Date.now();
    genSeason(
      1,
      (o, snap) => {
        gen.acc = foldGame(gen.acc, o);
        foldBench(gen, o.events, tunables, positionsFromSnapshot(snap));
        gen.games += 1;
      },
      { tunables },
    );
    gen.ms = Date.now() - t0;
    process.stdout.write(`ADR-089 clean bench:\n${JSON.stringify({ flat: summary(flat), gen: summary(gen) }, null, 1)}\n`);
  }, 1_800_000);

  it("(c) flat: release 1.6634 s, throwaways 20.625%, 52,882 dropbacks, no pressure and no sacks", () => {
    expect(flat.games).toBe(496);
    expect(mean(flat.acc.play.throwTicks).toFixed(4)).toBe("1.6634");
    expect(pct(flat.throwaways, flat.passStarts).toFixed(3)).toBe("20.625");
    expect(flat.passStarts).toBe(52_882);
    expect(flat.rows.dropbacks).toBe(52_882);
    expect(flat.acc.play.pressuredDropbacks).toBe(0);
    expect(flat.acc.play.sacks).toBe(0);
  });

  it("(c) gen: release 1.7992 s, throwaways 11.127%, 28,588 dropbacks, no pressure and no sacks", () => {
    expect(gen.games).toBe(272);
    expect(mean(gen.acc.play.throwTicks).toFixed(4)).toBe("1.7992");
    expect(pct(gen.throwaways, gen.passStarts).toFixed(3)).toBe("11.127");
    expect(gen.passStarts).toBe(28_588);
    expect(gen.rows.dropbacks).toBe(28_588);
    expect(gen.acc.play.pressuredDropbacks).toBe(0);
    expect(gen.acc.play.sacks).toBe(0);
  });

  it("(b) nobody open and its split: gen 30.2% (8,631 of 28,588), 10.1 / 8.9 / 11.1; flat 43.6% (23,064 of 52,882), 6.8 / 16.2 / 20.6", () => {
    const g = summary(gen) as { nobodyOpen: unknown; split: { desperation: string; checkdowns: string; throwaways: string } };
    const f = summary(flat) as typeof g;
    const results = [
      reported("gen", "nobody open", g.nobodyOpen, { n: 8631, of: 28588, pct: "30.2" }),
      reported("gen", "split desperation / checkdowns / throwaways", [g.split.desperation, g.split.checkdowns, g.split.throwaways], ["10.1", "8.9", "11.1"]),
      reported("flat", "nobody open", f.nobodyOpen, { n: 23064, of: 52882, pct: "43.6" }),
      reported("flat", "split desperation / checkdowns / throwaways", [f.split.desperation, f.split.checkdowns, f.split.throwaways], ["6.8", "16.2", "20.6"]),
    ];
    expect(results).toEqual([true, true, true, true]);
  });

  it("(b) the class guards on gen: desperation INT 19.0%; rank-pushed 16.3% of dropbacks at 20.9% INT", () => {
    const g = summary(gen) as { guards: Record<string, string> };
    const results = [
      reported("gen", "desperation INT per aimed", g.guards["desperationInt"], "19.0"),
      reported("gen", "rank-pushed share / INT per aimed", [g.guards["rankPushedShare"], g.guards["rankPushedInt"]], ["16.3", "20.9"]),
    ];
    expect(results).toEqual([true, true]);
  });

  it("(b, additions from the same table) flat desperation INT 5.7%, flat rank-pushed 14.1% at 12.4%, open throws 48.0% / 2.66% and 46.8% / 0.38%", () => {
    const g = summary(gen) as { guards: Record<string, string> };
    const f = summary(flat) as typeof g;
    const results = [
      reported("flat", "desperation INT per aimed", f.guards["desperationInt"], "5.7"),
      reported("flat", "rank-pushed share / INT per aimed", [f.guards["rankPushedShare"], f.guards["rankPushedInt"]], ["14.1", "12.4"]),
      reported("gen", "open throws completion / INT per aimed", [g.guards["openCompletion"], g.guards["openInt"]], ["48.0", "2.66"]),
      reported("flat", "open throws completion / INT per aimed", [f.guards["openCompletion"], f.guards["openInt"]], ["46.8", "0.38"]),
    ];
    expect(results).toEqual([true, true, true, true]);
  });
});
