/**
 * ADR-089 step 1 — shape S of the block clock, the breaking time (`resolve/beatClock.ts`).
 *
 * The closed forms against hand values and, bit for bit, against calibration's step-0 formula
 * (`packages/calibration/src/pocket/clocks.ts:89-112`, `:121-145`). The engine cannot import
 * calibration (Iron Rule 1), so the reference below is a COPY of those expressions, operation for
 * operation; if either side changes its arithmetic, this file fails.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import type { Rng } from "@ff/contracts";
import {
  beatBandsOf,
  beatScaleSeconds,
  beatTickOf,
  breakingTimeSeconds,
  clockGridOf,
  drawBeat,
  pushWindowTicks,
  reportedMarginS,
  resolveBeatTick,
} from "../src/resolve/beatClock.js";
import type { BeatTickArgs, ClockGrid, PushWindow } from "../src/resolve/beatClock.js";
import { checkPayload } from "../src/events.js";
import { bandFor } from "../src/rolls.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";
import { BEAT_CLOCK, BEAT_CLOCK_WITH_WINDOW, PUSH_WINDOW } from "./pocketTunables.js";

// --- calibration's step-0 closed forms, copied (clocks.ts) ---------------------------------
interface ShapeS { readonly theta: number; readonly k: number; readonly beta: number }
const CAL_S: ShapeS = { theta: 11, k: 2, beta: 0.5 };
const CAL_WIN_MARGIN = 15;
const CAL_PUSH_WINDOW = { move: "POWER", minMargin: 1, maxMargin: 14, lengthSeconds: 1.0, gainingCap: 4, beatenFloor: 5 } as const;
function calRoundTick(t: number): number {
  return Number(t.toFixed(6));
}
function calShapeSScale(m: number, s: ShapeS = CAL_S): number {
  return s.theta * Math.exp((-s.beta * m) / 41);
}
function calExponentialOf(u: number): number {
  return -Math.log(u) + 0;
}
function calShapeSBreakingTime(m: number, u: number, s: ShapeS = CAL_S, t0 = 0): number {
  return t0 + calShapeSScale(m, s) * calExponentialOf(u) ** (1 / s.k);
}
function calBeatTickOf(T: number, clock: ClockGrid): number | undefined {
  const n = Math.max(0, Math.ceil((T - clock.firstTick) / clock.tickStepSeconds - 1e-9));
  const tick = calRoundTick(clock.firstTick + n * clock.tickStepSeconds);
  return tick > clock.maxTick + 1e-9 ? undefined : tick;
}
function calPushWindowApplies(move: string, m: number): boolean {
  return move === CAL_PUSH_WINDOW.move && m >= CAL_PUSH_WINDOW.minMargin && m <= CAL_PUSH_WINDOW.maxMargin;
}
function calPushWindowTicks(beatTick: number, m: number, clock: ClockGrid): { tick: number; margin: number }[] {
  const out: { tick: number; margin: number }[] = [];
  const gaining = calRoundTick(beatTick - CAL_PUSH_WINDOW.lengthSeconds);
  const beaten = calRoundTick(beatTick - clock.tickStepSeconds);
  if (gaining >= clock.firstTick - 1e-9) out.push({ tick: gaining, margin: Math.min(m, CAL_PUSH_WINDOW.gainingCap) });
  if (beaten >= clock.firstTick - 1e-9) out.push({ tick: beaten, margin: Math.max(m, CAL_PUSH_WINDOW.beatenFloor) });
  return out;
}
function calShapeSReportedMargin(
  tick: number,
  rep: { readonly m: number; readonly move: string; readonly beatTick: number | undefined },
  clock: ClockGrid,
  pushWindow: boolean,
): number {
  if (rep.beatTick !== undefined && tick >= rep.beatTick - 1e-9) return Math.max(CAL_WIN_MARGIN, rep.m);
  if (pushWindow && rep.beatTick !== undefined && calPushWindowApplies(rep.move, rep.m)) {
    for (const w of calPushWindowTicks(rep.beatTick, rep.m, clock)) if (Math.abs(w.tick - tick) < 1e-9) return w.margin;
  }
  return Math.min(0, rep.m);
}
// -------------------------------------------------------------------------------------------

const CLOCK = clockGridOf(DEFAULT_TUNABLES);
const BANDS = beatBandsOf(DEFAULT_TUNABLES);
const TICKS: number[] = [];
for (let t = CLOCK.firstTick; t <= CLOCK.maxTick + 1e-9; t = Number((t + CLOCK.tickStepSeconds).toFixed(1))) TICKS.push(t);

/** U on a grid: both ends, the middle, tiny values, and 200 seeded draws. */
const U_GRID: number[] = (() => {
  const rng = createRng("beat-clock-grid", "u");
  const out = [1, 0.999999, 0.75, 0.5, 0.25, 0.1, 0.01, 1e-6, 1e-12, Number.MIN_VALUE];
  for (let i = 0; i < 200; i++) out.push(1 - rng.next());
  return out;
})();

const rusher = makePlayer("bc-r", "Bull Rusher", "DT", { passRush: 80, powerMove: 80, strength: 80 });
const blocker = makePlayer("bc-b", "Guard", "LG", { passBlock: 70, footwork: 70, anchor: 70 });

describe("ADR-089 shape S — the breaking time", () => {
  it("matches hand values", () => {
    expect(beatScaleSeconds(BEAT_CLOCK, 0)).toBe(11);
    expect(beatScaleSeconds(BEAT_CLOCK, 41)).toBeCloseTo(11 * Math.exp(-0.5), 12);
    expect(beatScaleSeconds(BEAT_CLOCK, -41)).toBeCloseTo(11 * Math.exp(0.5), 12);
    // -ln(e^-1) = 1, so T is the scale itself at m = 0.
    expect(breakingTimeSeconds(BEAT_CLOCK, 0, Math.exp(-1))).toBeCloseTo(11, 12);
    // -ln(e^-4) = 4, the square root is 2: T = 22 exp(-0.5) at m = 41.
    expect(breakingTimeSeconds(BEAT_CLOCK, 41, Math.exp(-4))).toBeCloseTo(22 * Math.exp(-0.5), 12);
    // U = 1 breaks at the snap: +0, never -0.
    expect(Object.is(breakingTimeSeconds(BEAT_CLOCK, 14, 1), 0)).toBe(true);
    expect(() => breakingTimeSeconds(BEAT_CLOCK, 0, 0)).toThrow(RangeError);
    expect(() => breakingTimeSeconds(BEAT_CLOCK, 0, 1.0000001)).toThrow(RangeError);
  });

  it("is calibration's step-0 formula bit for bit, on a grid of margins and uniforms", () => {
    let compared = 0;
    for (let m = -99; m <= 99; m += 1) {
      for (const u of U_GRID) {
        const engine = breakingTimeSeconds(BEAT_CLOCK, m, u);
        const calibration = calShapeSBreakingTime(m, u);
        expect(Object.is(engine, calibration), `m ${m}, U ${u}: ${engine} vs ${calibration}`).toBe(true);
        expect(beatTickOf(DEFAULT_TUNABLES, engine)).toBe(calBeatTickOf(calibration, CLOCK));
        compared += 1;
      }
    }
    expect(compared).toBe(199 * U_GRID.length);
  });

  it("falls as the rep's margin rises, for every U below 1", () => {
    for (const u of U_GRID) {
      for (let m = -40; m < 40; m += 1) {
        const here = breakingTimeSeconds(BEAT_CLOCK, m, u);
        const next = breakingTimeSeconds(BEAT_CLOCK, m + 1, u);
        if (u === 1) expect(next).toBe(here);
        else expect(next).toBeLessThan(here);
      }
    }
  });

  it("beats on the first tick at or after T, and never when T is past the last tick (O21)", () => {
    expect(beatTickOf(DEFAULT_TUNABLES, 0)).toBe(0.5);
    expect(beatTickOf(DEFAULT_TUNABLES, 0.5)).toBe(0.5);
    expect(beatTickOf(DEFAULT_TUNABLES, 0.5 + 1e-12)).toBe(0.5);
    expect(beatTickOf(DEFAULT_TUNABLES, 0.50001)).toBe(1.0);
    expect(beatTickOf(DEFAULT_TUNABLES, 2.2)).toBe(2.5);
    expect(beatTickOf(DEFAULT_TUNABLES, 6.0)).toBe(6.0);
    expect(beatTickOf(DEFAULT_TUNABLES, 6.0001)).toBeUndefined();
    expect(beatTickOf(DEFAULT_TUNABLES, 40)).toBeUndefined();
    expect(() => beatTickOf(DEFAULT_TUNABLES, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("ADR-089 shape S — what each tick reports", () => {
  const reported = (m: number, move: "POWER" | "SPEED" | "FINESSE", beatTick: number | undefined, window: PushWindow | undefined): number[] =>
    TICKS.map((t) => reportedMarginS(t, { margin: m, move }, beatTick, window, BANDS, CLOCK));

  it("is calibration's reported margin on every tick, window on and off", () => {
    for (let m = -40; m <= 40; m += 1) {
      for (const move of ["POWER", "SPEED", "FINESSE"] as const) {
        for (const beatTick of [undefined, ...TICKS]) {
          for (const window of [undefined, PUSH_WINDOW]) {
            for (const t of TICKS) {
              expect(reportedMarginS(t, { margin: m, move }, beatTick, window, BANDS, CLOCK)).toBe(
                calShapeSReportedMargin(t, { m, move, beatTick }, CLOCK, window !== undefined),
              );
            }
          }
        }
      }
    }
  });

  it("never falls as the play goes on, for every margin from -40 to 40 and U on a grid", () => {
    const falls: string[] = [];
    let checked = 0;
    for (let m = -40; m <= 40; m += 1) {
      for (const u of U_GRID) {
        const beatTick = beatTickOf(DEFAULT_TUNABLES, breakingTimeSeconds(BEAT_CLOCK, m, u));
        for (const window of [undefined, PUSH_WINDOW]) {
          for (const move of ["POWER", "SPEED"] as const) {
            const series = reported(m, move, beatTick, window);
            checked += 1;
            for (let i = 1; i < series.length; i++) {
              if (!((series[i] ?? NaN) >= (series[i - 1] ?? NaN))) falls.push(`m ${m} U ${u} ${move} window ${String(window !== undefined)}: ${series.join(",")}`);
            }
          }
        }
      }
    }
    expect(falls).toEqual([]);
    expect(checked).toBe(81 * U_GRID.length * 4);
  });

  it("once won, is never blocked again: RUSHER_WINS_REP on the beat tick and on every tick after it", () => {
    for (let m = -40; m <= 40; m += 1) {
      for (const beatTick of TICKS) {
        for (const window of [undefined, PUSH_WINDOW]) {
          const series = reported(m, "POWER", beatTick, window);
          TICKS.forEach((t, i) => {
            const band = bandFor(DEFAULT_TUNABLES.passRush.bands, series[i] ?? NaN).label;
            if (t >= beatTick) {
              expect(band).toBe("RUSHER_WINS_REP");
              expect(series[i]).toBe(Math.max(15, m));
            } else {
              expect(band).not.toBe("RUSHER_WINS_REP");
            }
          });
        }
      }
    }
  });

  it("before the beat reports min(0, m); a block that holds the whole play never wins", () => {
    for (let m = -40; m <= 40; m += 1) {
      for (const window of [undefined, PUSH_WINDOW]) {
        expect(reported(m, "POWER", undefined, window)).toEqual(TICKS.map(() => Math.min(0, m) + 0));
      }
      expect(reported(m, "SPEED", 6.0, PUSH_WINDOW).slice(0, -1)).toEqual(TICKS.slice(0, -1).map(() => Math.min(0, m) + 0));
    }
  });

  it("the push window's two ticks, for a beat at 0.5, 1.0, 1.5 and 6.0 s", () => {
    // Margin 3 shows the beaten floor; margin 10 the gaining cap.
    expect(pushWindowTicks(0.5, 3, PUSH_WINDOW, BANDS, CLOCK)).toEqual([]);
    expect(pushWindowTicks(1.0, 3, PUSH_WINDOW, BANDS, CLOCK)).toEqual([{ tick: 0.5, margin: 5 }]);
    expect(pushWindowTicks(1.5, 3, PUSH_WINDOW, BANDS, CLOCK)).toEqual([
      { tick: 0.5, margin: 3 },
      { tick: 1.0, margin: 5 },
    ]);
    expect(pushWindowTicks(1.5, 10, PUSH_WINDOW, BANDS, CLOCK)).toEqual([
      { tick: 0.5, margin: 4 },
      { tick: 1.0, margin: 10 },
    ]);
    expect(pushWindowTicks(6.0, 10, PUSH_WINDOW, BANDS, CLOCK)).toEqual([
      { tick: 5.0, margin: 4 },
      { tick: 5.5, margin: 10 },
    ]);
    for (const [beatTick, m] of [[1.0, 3], [1.5, 3], [1.5, 10], [6.0, 10]] as const) {
      for (const w of pushWindowTicks(beatTick, m, PUSH_WINDOW, BANDS, CLOCK)) {
        expect(reportedMarginS(w.tick, { margin: m, move: "POWER" }, beatTick, PUSH_WINDOW, BANDS, CLOCK)).toBe(w.margin);
      }
    }
    // The bands those ticks land in: GAINING one second before, BEATEN on the tick before.
    const bands = reported(10, "POWER", 6.0, PUSH_WINDOW).map((m) => bandFor(DEFAULT_TUNABLES.passRush.bands, m).label);
    expect(TICKS.slice(-4)).toEqual([4.5, 5.0, 5.5, 6.0]);
    expect(bands.slice(-4)).toEqual(["STALEMATE", "RUSHER_GAINING", "BLOCKER_BEATEN", "RUSHER_WINS_REP"]);
  });

  it("the window applies to POWER at 1 to 14 only, and only when the beat is in the play", () => {
    for (const m of [0, 15, 30, -5]) {
      expect(reported(m, "POWER", 3.0, PUSH_WINDOW)).toEqual(reported(m, "POWER", 3.0, undefined));
    }
    for (const move of ["SPEED", "FINESSE"] as const) {
      for (let m = 1; m <= 14; m++) expect(reported(m, move, 3.0, PUSH_WINDOW)).toEqual(reported(m, move, 3.0, undefined));
    }
    for (let m = 1; m <= 14; m++) {
      const on = reported(m, "POWER", 3.0, PUSH_WINDOW);
      expect(on[TICKS.indexOf(2.0)]).toBe(Math.min(m, 4));
      expect(on[TICKS.indexOf(2.5)]).toBe(Math.max(m, 5));
      // No beat in the play, no window (O21).
      expect(reported(m, "POWER", undefined, PUSH_WINDOW)).toEqual(TICKS.map(() => 0));
    }
  });

  it("the 4, 5 and 15 are read from passRush.bands and equal calibration's constants at DEFAULT_TUNABLES", () => {
    expect(BANDS).toEqual({
      winMargin: CAL_WIN_MARGIN,
      beatenFloor: CAL_PUSH_WINDOW.beatenFloor,
      gainingCap: CAL_PUSH_WINDOW.gainingCap,
    });
    // A band patch moves them together (they are not leaves of their own).
    const moved: Tunables = {
      ...DEFAULT_TUNABLES,
      passRush: {
        ...DEFAULT_TUNABLES.passRush,
        bands: DEFAULT_TUNABLES.passRush.bands.map((b) =>
          b.label === "BLOCKER_BEATEN" ? { ...b, minMargin: 7 } : b.label === "RUSHER_WINS_REP" ? { ...b, minMargin: 18 } : b,
        ) as unknown as Tunables["passRush"]["bands"],
      },
    };
    expect(beatBandsOf(moved)).toEqual({ winMargin: 18, beatenFloor: 7, gainingCap: 6 });
  });
});

describe("ADR-089 shape S — the draw and the dieless tick", () => {
  const countingRng = (seed: string, label: string): { rng: Rng; draws: () => number } => {
    const inner = createRng(seed, label);
    let n = 0;
    const rng: Rng = {
      ...inner,
      next: () => {
        n += 1;
        return inner.next();
      },
      fork: (child: string) => inner.fork(child),
    };
    return { rng, draws: () => n };
  };

  it("draws exactly one number, U = 1 - next(), and writes the pass_rush_beat CHECK (P2)", () => {
    const repLabel = "game:g/play:1/rush/bc-r:rep/bc-r:rush";
    const beatLabel = `game:g/play:1/rush/beat/${repLabel}`;
    const { rng, draws } = countingRng("seed-beat", beatLabel);
    const out = drawBeat({ tunables: DEFAULT_TUNABLES, beat: BEAT_CLOCK, rusher, blocker, repMargin: 7, repRollRef: repLabel, beatRng: rng });
    expect(draws()).toBe(1);
    const u = 1 - createRng("seed-beat", beatLabel).next();
    expect(out.T).toBe(calShapeSBreakingTime(7, u));
    expect(out.tick).toBe(calBeatTickOf(out.T, CLOCK));
    expect(out.label).toBe(beatLabel);
    expect(out.check).toEqual({
      checkKind: "pass_rush_beat",
      actors: [rusher.bio.id, blocker.bio.id],
      roll: { die: "uniform", raw: u, modifiers: [], total: u, rngLabel: beatLabel },
      tier: bandFor(DEFAULT_TUNABLES.resultTierLadder, 7).label,
      margin: 7,
      testsAttrs: [],
      rollRef: repLabel,
    });
    // As the stream carries it: no band, no target, no opposedRoll.
    expect(Object.keys(checkPayload(out.check))).toEqual(["checkKind", "actors", "roll", "tier", "margin", "testsAttrs", "rollRef"]);
  });

  it("a dieless tick: the beat's margin through today's band and counter tables, naming the beat (P3)", () => {
    const base: BeatTickArgs = {
      tunables: DEFAULT_TUNABLES,
      beat: BEAT_CLOCK_WITH_WINDOW,
      rusher,
      blocker,
      move: "POWER",
      repMargin: 10,
      beatTick: 3.0,
      beatLabel: "game:g/play:1/rush/beat/x",
      tick: 0.5,
    };
    const cases: [number, number, string][] = [
      [0.5, 0, "STALEMATE"],
      [2.0, 4, "RUSHER_GAINING"],
      [2.5, 10, "BLOCKER_BEATEN"],
      [3.0, 15, "RUSHER_WINS_REP"],
      [5.5, 15, "RUSHER_WINS_REP"],
    ];
    for (const [tick, margin, band] of cases) {
      const out = resolveBeatTick({ ...base, tick });
      expect(out.margin).toBe(margin);
      expect(out.band).toBe(band);
      const progress = DEFAULT_TUNABLES.passRush.pressureProgressByBand[out.band];
      expect(out.pressureDelta).toBe(progress.delta);
      expect(out.resetsPressure).toBe(progress.reset);
      expect(out.check).toEqual({
        checkKind: "pass_rush_tick",
        actors: [rusher.bio.id, blocker.bio.id],
        tier: bandFor(DEFAULT_TUNABLES.resultTierLadder, margin).label,
        band,
        margin,
        testsAttrs: [],
        rollRef: "game:g/play:1/rush/beat/x",
      });
      expect("roll" in out.check).toBe(false);
      expect("opposedRoll" in out.check).toBe(false);
    }
    // A latent margin of -20 is reset before the beat, as today's table says.
    expect(resolveBeatTick({ ...base, repMargin: -20, tick: 1.0 }).band).toBe("BLOCKER_RESETS");
    expect(resolveBeatTick({ ...base, repMargin: -20, tick: 1.0 }).resetsPressure).toBe(true);
    expect(resolveBeatTick({ ...base, repMargin: -20, tick: 3.0 }).margin).toBe(15);
  });

  it("reportedMarginS and resolveBeatTick take no Rng, by their signatures (S6)", () => {
    type NoRng<T> = Extract<T, Rng> extends never ? true : false;
    const reportedHasNoRng: NoRng<Parameters<typeof reportedMarginS>[number]> = true;
    type ArgValues = BeatTickArgs[keyof BeatTickArgs];
    const tickHasNoRng: NoRng<ArgValues> = true;
    expect(reportedHasNoRng && tickHasNoRng).toBe(true);
    expect(reportedMarginS.length).toBe(6);
    expect(resolveBeatTick.length).toBe(1);
    // And a tick draws nothing: the same arguments give the same answer however often asked.
    const args: BeatTickArgs = {
      tunables: DEFAULT_TUNABLES, beat: BEAT_CLOCK, rusher, blocker, move: "SPEED",
      repMargin: 20, beatTick: 1.5, beatLabel: "x", tick: 2.0,
    };
    expect(resolveBeatTick(args)).toEqual(resolveBeatTick(args));
  });
});
