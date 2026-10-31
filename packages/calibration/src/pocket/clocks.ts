/**
 * THE TWO BLOCK CLOCKS, ENGINE-FREE (ADR-089 step 0; plan §6.1; ADR-089 §4.1, §4.1.1, §4.4.2).
 *
 * Nothing here plays. These are the closed forms M1 and M2 price, at the provisional values the
 * design declares as provisional (never candidates, ADR-061):
 *
 *  - **Shape S, the breaking time** (ADR-089:405-411): `T = t0 + theta * exp(-beta * m/41) * E^(1/k)`,
 *    `E = -ln U`, one U per rep; beaten on the first tick at or after T. Provisional theta 11, k 2,
 *    beta 0.5 (`:414`). Before the beat a matchup reports `min(0, m)`; on the beat tick and every
 *    later tick it reports `max(15, m)`, RUSHER_WINS_REP (`:418`; M2's plan text, "then
 *    RUSHER_WINS_REP"). The beat tick reporting the won band is this file's reading of "beaten on
 *    the first tick t >= T_j" (the threat is built there, as a won rep's is today).
 *  - **The push window** (§4.1.1, ADR-089:451-462): a POWER rep with latent margin 1 to 14 reports
 *    `min(m, 4)` (RUSHER_GAINING) on `t_b - 1.0` and `max(m, 5)` (BLOCKER_BEATEN) on `t_b - 0.5`; a
 *    window tick before the first tick (0.5 s) is dropped.
 *  - **Shape L, the gradual clock** (ADR-089:422): `round(min(1, t/R) * (repMargin + jitter_t))`, so
 *    `m(0) = 0` (C1-N2).
 *  - **L's crossing time** (ADR-089:432): `T_L = (t - 0.5) + 0.5 * (15 - m(t - 0.5)) / (m(t) - m(t - 0.5))`,
 *    clamped to `(t - 0.5, t]`, t the first tick whose margin reaches 15.
 *  - **The late block, on both shapes** (ADR-089:546): `m = -(margin)` of the touching CHECK; S:
 *    `T = t_e + w * theta * exp(-beta * m/41) * E^(1/k)`; L: `round(min(1, (t - t_e)/(w * R)) * (m + jitter_t))`.
 *    `t_e` and `w` stay CHOSEN dials with no value at step 0, so they are arguments here.
 *
 * Rounding is `Math.round`, as the engine rounds the tick jitter (`resolve/passRush.ts:168`).
 * Bands are re-read through the tunables' own `passRush.bands` (first band whose `minMargin` the
 * margin reaches; the engine's `bandFor`, `rolls.ts:31-38`, is engine-internal, ADR-012).
 */
import type { Tunables } from "@ff/engine";

/** Shape S's three numbers. */
export interface ShapeS {
  readonly theta: number;
  readonly k: number;
  readonly beta: number;
}

/** The provisional values (ADR-089:414), declared as provisional; not candidates (ADR-061). */
export const SHAPE_S_PROVISIONAL: ShapeS = Object.freeze({ theta: 11, k: 2, beta: 0.5 });

/** Shape L's provisional R and its priced point (ADR-089:424). */
export const SHAPE_L_PROVISIONAL_R = 5;
export const SHAPE_L_PRICED_R = 8;

/** The won band's threshold the crossing time reads (RUSHER_WINS_REP's `minMargin`). */
export const WIN_MARGIN = 15;

/** The push window (§4.1.1): its move, its margin range and its length. */
export const PUSH_WINDOW = Object.freeze({
  move: "POWER",
  minMargin: 1,
  maxMargin: 14,
  lengthSeconds: 1.0,
  gainingCap: 4,
  beatenFloor: 5,
} as const);

/** The clock grid, from the tunables (`clock.firstTick`, `tickStepSeconds`, `maxTick`). */
export interface ClockGrid {
  readonly firstTick: number;
  readonly tickStepSeconds: number;
  readonly maxTick: number;
}

export function clockOf(tunables: Tunables): ClockGrid {
  const c = tunables.clock;
  return { firstTick: c.firstTick, tickStepSeconds: c.tickStepSeconds, maxTick: c.maxTick };
}

/** Every tick of a play, 0.5 to 6.0 at today's clock. */
export function ticksOf(clock: ClockGrid): readonly number[] {
  const out: number[] = [];
  for (let n = 0; ; n += 1) {
    const t = roundTick(clock.firstTick + n * clock.tickStepSeconds);
    if (t > clock.maxTick + 1e-9) break;
    out.push(t);
  }
  return out;
}

function roundTick(t: number): number {
  return Number(t.toFixed(6));
}

/** S's scale for a rep of margin m: `theta * exp(-beta * m/41)`, uncentred (K2-01). */
export function shapeSScale(m: number, s: ShapeS = SHAPE_S_PROVISIONAL): number {
  return s.theta * Math.exp((-s.beta * m) / 41);
}

/** `E = -ln U` for one uniform in (0, 1]. */
export function exponentialOf(u: number): number {
  if (!(u > 0 && u <= 1)) throw new RangeError(`clocks: a uniform must be in (0, 1], got ${String(u)}`);
  return -Math.log(u) + 0; // + 0: -ln 1 is -0
}

/** S's breaking time: `t0 + theta * exp(-beta * m/41) * E^(1/k)`. */
export function shapeSBreakingTime(m: number, u: number, s: ShapeS = SHAPE_S_PROVISIONAL, t0 = 0): number {
  return t0 + shapeSScale(m, s) * exponentialOf(u) ** (1 / s.k);
}

/** S's chance the block has broken by t: `F(t) = 1 - exp(-((t - t0)/scale)^k)`, 0 before t0. */
export function shapeSBrokenBy(t: number, m: number, s: ShapeS = SHAPE_S_PROVISIONAL, t0 = 0): number {
  if (t <= t0) return 0;
  return 1 - Math.exp(-(((t - t0) / shapeSScale(m, s)) ** s.k));
}

/** The first tick at or after T, or undefined when T is past the last tick (no beat in the play). */
export function beatTickOf(T: number, clock: ClockGrid): number | undefined {
  if (!Number.isFinite(T)) throw new RangeError(`clocks: a breaking time must be finite, got ${String(T)}`);
  const n = Math.max(0, Math.ceil((T - clock.firstTick) / clock.tickStepSeconds - 1e-9));
  const tick = roundTick(clock.firstTick + n * clock.tickStepSeconds);
  return tick > clock.maxTick + 1e-9 ? undefined : tick;
}

/** Whether the push window applies to a rep (POWER, latent margin 1 to 14). */
export function pushWindowApplies(move: string, m: number): boolean {
  return move === PUSH_WINDOW.move && m >= PUSH_WINDOW.minMargin && m <= PUSH_WINDOW.maxMargin;
}

/** The window's ticks for a rep beaten at `beatTick`, the ones before the first tick dropped. */
export function pushWindowTicks(beatTick: number, m: number, clock: ClockGrid): readonly { readonly tick: number; readonly margin: number }[] {
  const out: { tick: number; margin: number }[] = [];
  const gaining = roundTick(beatTick - PUSH_WINDOW.lengthSeconds);
  const beaten = roundTick(beatTick - clock.tickStepSeconds);
  if (gaining >= clock.firstTick - 1e-9) out.push({ tick: gaining, margin: Math.min(m, PUSH_WINDOW.gainingCap) });
  if (beaten >= clock.firstTick - 1e-9) out.push({ tick: beaten, margin: Math.max(m, PUSH_WINDOW.beatenFloor) });
  return out;
}

/**
 * The margin a shape-S matchup reports on `tick`: `min(0, m)` before the beat (the window's two
 * ticks excepted when `pushWindow` is on and the rep qualifies), `max(15, m)` from the beat on.
 * `beatTick` undefined means the block holds the whole play.
 */
export function shapeSReportedMargin(
  tick: number,
  rep: { readonly m: number; readonly move: string; readonly beatTick: number | undefined },
  clock: ClockGrid,
  pushWindow: boolean,
): number {
  if (rep.beatTick !== undefined && tick >= rep.beatTick - 1e-9) return Math.max(WIN_MARGIN, rep.m);
  if (pushWindow && rep.beatTick !== undefined && pushWindowApplies(rep.move, rep.m)) {
    for (const w of pushWindowTicks(rep.beatTick, rep.m, clock)) if (Math.abs(w.tick - tick) < 1e-9) return w.margin;
  }
  return Math.min(0, rep.m);
}

/** Shape L's margin on a tick: `round(min(1, t/R) * (repMargin + jitter))`; `m(0) = 0`. */
export function shapeLMargin(t: number, R: number, repMargin: number, jitter: number): number {
  if (!(R > 0)) throw new RangeError(`clocks: R must be positive, got ${String(R)}`);
  if (t < 0) throw new RangeError(`clocks: a tick cannot be before the snap, got ${String(t)}`);
  return Math.round(Math.min(1, t / R) * (repMargin + jitter)) + 0;
}

/**
 * L's crossing time: `(t - step) + step * (15 - m_prev) / (m_t - m_prev)`, clamped to `(t - step, t]`.
 * `t` must be the first tick whose margin reaches 15, so `m_prev < 15 <= m_t`.
 */
export function shapeLCrossingTime(t: number, mPrev: number, mT: number, step = 0.5): number {
  if (!(mPrev < WIN_MARGIN && mT >= WIN_MARGIN)) {
    throw new RangeError(`clocks: a crossing needs m(t - ${String(step)}) < 15 <= m(t), got ${String(mPrev)} and ${String(mT)}`);
  }
  const raw = t - step + (step * (WIN_MARGIN - mPrev)) / (mT - mPrev);
  // m_prev < 15 makes the fraction positive, so raw > t - step; m_t >= 15 makes it at most 1.
  if (!(raw > t - step)) throw new RangeError(`clocks: a crossing time fell out of (t - step, t]: ${String(raw)}`);
  return Math.min(t, raw);
}

/** The first tick of a margin series (one value per tick of `ticks`) at which it reaches 15, with L's crossing time. */
export function shapeLFirstWin(ticks: readonly number[], margins: readonly number[], step = 0.5): { readonly tick: number; readonly crossing: number } | undefined {
  if (ticks.length !== margins.length) throw new RangeError("clocks: one margin per tick");
  let prev = 0; // m(0) = 0 (C1-N2)
  for (let i = 0; i < ticks.length; i += 1) {
    const m = margins[i] as number;
    const t = ticks[i] as number;
    if (m >= WIN_MARGIN) return { tick: t, crossing: shapeLCrossingTime(t, prev, m, step) };
    prev = m;
  }
  return undefined;
}

/** The late block's rep margin: the touching CHECK's margin turned round (1 to 19 for RAN_THROUGH and LATE_EXCHANGE). */
export function lateRepMargin(touchingCheckMargin: number): number {
  return -touchingCheckMargin + 0;
}

/** The late block's breaking time on S: `t_e + w * theta * exp(-beta * m/41) * E^(1/k)`. */
export function lateBreakingTimeS(m: number, u: number, te: number, w: number, s: ShapeS = SHAPE_S_PROVISIONAL): number {
  if (!(w > 0)) throw new RangeError(`clocks: the weak-block multiplier must be positive, got ${String(w)}`);
  return te + w * shapeSScale(m, s) * exponentialOf(u) ** (1 / s.k);
}

/**
 * The late block's margin on L, from `t_e` on, in AM-2's float form (the engine's
 * `resolve/lateBlock.ts` and `s1Stream.ts`'s `lateLMarginExact`):
 * `round(min(t - t_e, w R) * (m + jitter) / (w R))`. The algebraically equal
 * `round(min(1, (t - t_e)/(w R)) * (m + jitter))` is a different double at a .5 tie
 * (t 0.8, t_e 0.5, w 0.1, R 4, m + jitter -34: -26 against -25), so it is not used (review CT-F5).
 */
export function lateMarginL(t: number, te: number, w: number, R: number, m: number, jitter: number): number {
  if (!(w > 0) || !(R > 0)) throw new RangeError("clocks: w and R must be positive");
  if (t < te) throw new RangeError(`clocks: the late block is not on before t_e (${String(t)} < ${String(te)})`);
  const wR = w * R;
  return Math.round((Math.min(t - te, wR) * (m + jitter)) / wR) + 0;
}

/** A margin's band through the tunables' `passRush.bands` (first `minMargin` reached, else the last). */
export function passRushBandOf(tunables: Tunables, margin: number): string {
  const bands = tunables.passRush.bands;
  for (const b of bands) if (margin >= b.minMargin) return b.label;
  const last = bands[bands.length - 1];
  if (last === undefined) throw new Error("clocks: empty passRush.bands");
  return last.label;
}

/** Today's per-tick jitter from a tick's two published rolls (`resolve/passRush.ts:166-168`). */
export function tickJitter(tunables: Tunables, rusherTotal: number, blockerTotal: number): number {
  return Math.round((rusherTotal - blockerTotal) / tunables.passRush.repJitter.divisor);
}
