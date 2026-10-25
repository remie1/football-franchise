/**
 * ADR-089 step 0 — THE UNCENSORED LINE BENCH (ADR-089 §6.0, "Benches, and the ADR-012 fix";
 * plan §6.3; deviation O9).
 *
 * Today's line battle with no quarterback in it: for one rusher against one blocker, the rep's
 * attribute contest is drawn once (`resolvePassRushRep`) and every tick from `clock.firstTick` to
 * `clock.maxTick` jitters around it (`resolvePassRushTick`), banded by `bandFor` and tiered by
 * `tierFor`, exactly as `sim/passPlay.ts`'s line battle calls them. No throw ever ends the rep, so
 * the curve is uncensored: **S(t) = P(the rep has not been won by tick t)**, a rep being won on the
 * first tick whose band starts a threat (`startsThreat`, RUSHER_WINS_REP). Step 1 checks "L equals
 * today from t >= R" against it.
 *
 * It lives here, in the engine's own tests, because driving these resolvers from calibration is
 * what ADR-012 removed (ADR-012:75-77; J2-1).
 *
 * **The grid (O9):** rusher and blocker ratings 40 to 90 by 10 (every rush attribute of the rusher
 * at his rating: Pass Rush, First Step, Power Move, Finesse Move, Strength; every block attribute
 * of the blocker at his: Pass Block, Footwork, Anchor, Strength), x alignment EDGE and INTERIOR,
 * x move SPEED, POWER and FINESSE, 200 reps a cell, each rep on `createRng("adr-089:line-bench",
 * "lineBench/<cell>/<i>")`, its rep on `.fork("rep")` and its tick t on `.fork("t<t>")` (the
 * engine's own label shape). No traits.
 *
 * **Finding (stated in the S3 report):** neither resolver reads the alignment at e23bf69 (it enters
 * only the won rep's travel, `threatFromWonRep`), so an EDGE cell and its INTERIOR twin are two
 * draws of one distribution; the grid keeps both as O9 names them.
 *
 * The full grid prints only under `FF_LINE_BENCH=1`. Always on: one small cell, deterministic,
 * with a non-increasing curve, and the bench's tick loop checked against the resolvers' own checks.
 */
import { createRng, type PlayerState } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { bandFor, tierFor } from "../src/rolls.js";
import { resolvePassRushRep, resolvePassRushTick } from "../src/resolve/passRush.js";
import { startsThreat } from "../src/resolve/rushThreat.js";
import { TUNABLES, type Tunables } from "../src/tunables.js";
import type { RushMove } from "../src/types.js";
import { RUSH_MOVES, makePlayer } from "./fixtures.js";

const BENCH_SEED = "adr-089:line-bench";
const REPS_PER_CELL = 200;
const RATINGS = [40, 50, 60, 70, 80, 90] as const;
const ALIGNMENTS = ["EDGE", "INTERIOR"] as const;
type Alignment = (typeof ALIGNMENTS)[number];

interface Cell {
  readonly rusher: number;
  readonly blocker: number;
  readonly alignment: Alignment;
  readonly move: RushMove;
}

const cellLabel = (c: Cell): string => `r${String(c.rusher)}-b${String(c.blocker)}-${c.alignment}-${c.move}`;

function rusherAt(rating: number): PlayerState {
  return makePlayer("bench-rusher", "Bench Rusher", "DE", { passRush: rating, firstStep: rating, powerMove: rating, finesseMove: rating, strength: rating });
}

function blockerAt(rating: number): PlayerState {
  return makePlayer("bench-blocker", "Bench Blocker", "LT", { passBlock: rating, footwork: rating, anchor: rating, strength: rating });
}

/** The ticks the line battle plays, first to last. */
function ticksOf(tunables: Tunables): readonly number[] {
  const out: number[] = [];
  const { firstTick, tickStepSeconds, maxTick } = tunables.clock;
  for (let i = 0; ; i += 1) {
    const t = Number((firstTick + i * tickStepSeconds).toFixed(1));
    if (t > maxTick + 1e-9) break;
    out.push(t);
  }
  return out;
}

interface RepTrace {
  readonly repMargin: number;
  /** The first tick a winning band came up, or undefined (never won by `clock.maxTick`). */
  readonly wonAt: number | undefined;
  readonly bands: readonly string[];
  /** Ticks whose CHECK band or tier differs from `bandFor` / `tierFor` on its own margin. */
  readonly checkMismatches: number;
}

/** One rep, uncensored: the attribute contest once, then every tick to `clock.maxTick`. */
function runRep(tunables: Tunables, cell: Cell, i: number): RepTrace {
  const rng = createRng(BENCH_SEED, `lineBench/${cellLabel(cell)}/${String(i)}`);
  const rusher = rusherAt(cell.rusher);
  const blocker = blockerAt(cell.blocker);
  const rep = resolvePassRushRep({ tunables, rusher, blocker, move: cell.move, repRng: rng.fork("rep") });
  let wonAt: number | undefined;
  let checkMismatches = 0;
  const bands: string[] = [];
  for (const t of ticksOf(tunables)) {
    const tick = resolvePassRushTick({ tunables, rusher, blocker, repMargin: rep.margin, rollRef: rep.check.roll.rngLabel, tickRng: rng.fork(`t${t.toFixed(1)}`) });
    bands.push(tick.band);
    if (bandFor(tunables.passRush.bands, tick.margin).label !== tick.check.band || tierFor(tunables, tick.margin) !== tick.check.tier) checkMismatches += 1;
    if (wonAt === undefined && startsThreat(tick.band)) wonAt = t;
  }
  return { repMargin: rep.margin, wonAt, bands, checkMismatches };
}

interface CellCurve {
  readonly cell: string;
  readonly reps: number;
  readonly meanRepMargin: number;
  /** S(t) at each tick: the share of reps not won by t. */
  readonly survival: readonly { readonly t: number; readonly notWon: number }[];
  readonly neverWon: number;
  readonly checkMismatches: number;
}

function cellCurve(tunables: Tunables, cell: Cell, reps = REPS_PER_CELL): CellCurve {
  const traces = Array.from({ length: reps }, (_, i) => runRep(tunables, cell, i));
  const ticks = ticksOf(tunables);
  return {
    cell: cellLabel(cell),
    reps,
    meanRepMargin: traces.reduce((a, r) => a + r.repMargin, 0) / reps,
    survival: ticks.map((t) => ({ t, notWon: traces.filter((r) => r.wonAt === undefined || r.wonAt > t).length / reps })),
    neverWon: traces.filter((r) => r.wonAt === undefined).length,
    checkMismatches: traces.reduce((a, r) => a + r.checkMismatches, 0),
  };
}

function grid(): readonly Cell[] {
  const out: Cell[] = [];
  for (const rusher of RATINGS) for (const blocker of RATINGS) for (const alignment of ALIGNMENTS) for (const move of RUSH_MOVES) out.push({ rusher, blocker, alignment, move });
  return out;
}

describe("ADR-089 step 0: the uncensored line bench", () => {
  const SMALL: Cell = { rusher: 70, blocker: 60, alignment: "EDGE", move: "POWER" };

  it("plays every tick from clock.firstTick to clock.maxTick", () => {
    expect(ticksOf(TUNABLES)).toEqual([0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]);
  });

  it("one small cell: deterministic; plus structural sanity checks (the curve's shape, the resolvers' own bands)", () => {
    const a = cellCurve(TUNABLES, SMALL, 40);
    const b = cellCurve(TUNABLES, SMALL, 40);
    expect(b).toEqual(a);
    // Structural sanity checks, not evidence (review finding CT-N2): each holds by construction.
    // `checkMismatches` compares a tick's CHECK with bandFor/tierFor on its own margin, the functions
    // the resolver itself calls, so it catches only the wrong tunables passed through; S(t) is the
    // share not won by t over increasing t, so it cannot rise; and the last tick is clock.maxTick,
    // so S there is the never-won share. What discriminates is the dating case and the ordering case
    // below.
    expect(a.checkMismatches).toBe(0);
    for (let k = 1; k < a.survival.length; k += 1) expect(a.survival[k]!.notWon).toBeLessThanOrEqual(a.survival[k - 1]!.notWon);
    expect(a.survival[0]!.notWon).toBeLessThanOrEqual(1);
    expect(a.survival.at(-1)!.notWon).toBe(a.neverWon / a.reps);
    // A different rep draws differently (the labels are per rep).
    expect(runRep(TUNABLES, SMALL, 0)).not.toEqual(runRep(TUNABLES, SMALL, 1));
  });

  it("dates a won rep by its first RUSHER_WINS_REP tick", () => {
    const traces = Array.from({ length: 40 }, (_, i) => runRep(TUNABLES, SMALL, i));
    const won = traces.filter((r) => r.wonAt !== undefined);
    expect(won.length).toBeGreaterThan(0);
    for (const r of won) expect(r.bands[ticksOf(TUNABLES).indexOf(r.wonAt as number)]).toBe("RUSHER_WINS_REP");
  });

  it("orders by rating at the ends: a 90 rusher on a 40 blocker is won sooner than a 40 on a 90", () => {
    const strong = cellCurve(TUNABLES, { rusher: 90, blocker: 40, alignment: "INTERIOR", move: "SPEED" }, 40);
    const weak = cellCurve(TUNABLES, { rusher: 40, blocker: 90, alignment: "INTERIOR", move: "SPEED" }, 40);
    expect(strong.meanRepMargin).toBeGreaterThan(weak.meanRepMargin);
    expect(strong.survival.at(-1)!.notWon).toBeLessThan(weak.survival.at(-1)!.notWon);
  });

  it.skipIf(process.env["FF_LINE_BENCH"] !== "1")(
    "the full O9 grid: 6 x 6 ratings x 2 alignments x 3 moves, 200 reps a cell (FF_LINE_BENCH=1)",
    () => {
      const cells = grid();
      expect(cells.length).toBe(216);
      const curves = cells.map((c) => cellCurve(TUNABLES, c));
      // The same structural sanity checks on every cell (by construction, see the small cell); the
      // bench's output is the table it prints.
      for (const c of curves) {
        expect(c.checkMismatches).toBe(0);
        for (let k = 1; k < c.survival.length; k += 1) expect(c.survival[k]!.notWon).toBeLessThanOrEqual(c.survival[k - 1]!.notWon);
      }
      const ticks = ticksOf(TUNABLES);
      const lines = [`cell\tmeanRepMargin\t${ticks.map((t) => `S(${t.toFixed(1)})`).join("\t")}`];
      for (const c of curves) lines.push(`${c.cell}\t${c.meanRepMargin.toFixed(2)}\t${c.survival.map((s) => s.notWon.toFixed(3)).join("\t")}`);
      process.stdout.write(`ADR-089 line bench (today's survival curve, P(rep not yet won at t)):\n${lines.join("\n")}\n`);
    },
    600_000,
  );
});
