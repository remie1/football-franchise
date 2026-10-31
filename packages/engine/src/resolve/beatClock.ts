/**
 * ADR-089 step 1 — SHAPE S OF THE BLOCK CLOCK, THE BREAKING TIME (§4.1, §4.1.1; `pocket-1` only).
 *
 * Under `legacy` nothing in this file runs: `sim/pocketRules.ts` returns `LEGACY` for tunables
 * without a `pocket-1` block, and `sim/passPlay.ts` reaches this file only under shape S.
 *
 * A blocked rep is still drawn once (`resolve/passRush.ts`'s `resolvePassRushRep`, ADR-059), and
 * its latent margin m is what the block is beaten BY. Shape S adds ONE die per rep, the breaking
 * time, drawn right after the rep on the fork `beat/<rep label>` of the play's rush bucket:
 *
 *     U = 1 - next()                (in (0, 1], so -ln U is finite)
 *     T = t0 + theta * exp(-beta * m / 41) * (-ln U)^(1/k)        t0 = 0 for a block engaged at the snap
 *
 * the same expression, operation for operation, as calibration's step-0 closed form
 * (`packages/calibration/src/pocket/clocks.ts`'s `shapeSBreakingTime`, ADR-089:405-414), so an
 * engine T and a calibration T are the same double. The block is beaten on the first tick at or
 * after T (`beatTickOf`), or never in the play when T is past the last tick (O21).
 *
 * After that no die is thrown on the matchup: each tick reports a margin set by the beat
 * (`reportedMarginS`): `min(0, m)` before the beat, `max(win, m)` from the beat tick on, and with
 * the push window (§4.1.1, a POWER rep with m in the window's range) `min(m, gaining cap)` one
 * window length before the beat tick and `max(m, beaten floor)` on the tick just before it, each
 * only at or after the play's first tick. The win margin, the beaten floor and the gaining cap
 * are not leaves: they are read from `passRush.bands` (RUSHER_WINS_REP's `minMargin`,
 * BLOCKER_BEATEN's, and that minus 1), so a band patch moves them together (plan §4).
 *
 * `reportedMarginS` and `resolveBeatTick` take no `Rng` (S6): the tick is a function of the beat.
 */
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import type { BeatTickEmission, CheckEmission } from "../events.js";
import { bandFor, tierFor } from "../rolls.js";
import type { BeatClockTunables, Tunables } from "../tunables.js";
import type { RushMove } from "../types.js";
import type { PassRushBandLabel } from "./passRush.js";

/** The play clock's grid, from `tunables.clock`. */
export interface ClockGrid {
  readonly firstTick: number;
  readonly tickStepSeconds: number;
  readonly maxTick: number;
}

/** The push window's dials (§4.1.1): its margin range, both ends included, and its length. */
export interface PushWindow {
  readonly minMargin: number;
  readonly maxMargin: number;
  readonly lengthSeconds: number;
}

/** The three margins shape S reports with, read from `passRush.bands` (plan §4). */
export interface BeatBands {
  /** RUSHER_WINS_REP's `minMargin` (15): the floor from the beat tick on. */
  readonly winMargin: number;
  /** BLOCKER_BEATEN's `minMargin` (5): the floor on the window's second tick. */
  readonly beatenFloor: number;
  /** BLOCKER_BEATEN's `minMargin` minus 1 (4): the cap on the window's first tick. */
  readonly gainingCap: number;
}

/** The move the push window applies to (§4.1.1: a bull rush). */
const PUSH_MOVE: RushMove = "POWER";

/** Ticks compare to within this, as calibration's `beatTickOf` does. */
const TICK_TOLERANCE = 1e-9;

function roundTick(t: number): number {
  return Number(t.toFixed(6));
}

export function clockGridOf(tunables: Tunables): ClockGrid {
  const c = tunables.clock;
  return { firstTick: c.firstTick, tickStepSeconds: c.tickStepSeconds, maxTick: c.maxTick };
}

/** The win margin, the beaten floor and the gaining cap, from the tunables' own band table. */
export function beatBandsOf(tunables: Tunables): BeatBands {
  const bands = tunables.passRush.bands;
  const won = bands.find((b) => b.label === "RUSHER_WINS_REP");
  const beaten = bands.find((b) => b.label === "BLOCKER_BEATEN");
  if (won === undefined || beaten === undefined) {
    throw new Error("@ff/engine: passRush.bands has no RUSHER_WINS_REP or BLOCKER_BEATEN band for the block clock to read");
  }
  return { winMargin: won.minMargin, beatenFloor: beaten.minMargin, gainingCap: beaten.minMargin - 1 };
}

/** S's time scale for a rep of latent margin m: `theta * exp(-beta * m / 41)`, in seconds. */
export function beatScaleSeconds(beat: BeatClockTunables, m: number): number {
  return beat.thetaSeconds * Math.exp((-beat.ratingWeight * m) / 41);
}

/**
 * S's breaking time for latent margin m and one uniform U in (0, 1]:
 * `0 + theta * exp(-beta * m / 41) * (-ln U + 0)^(1/k)`. The `+ 0` turns `-ln 1`'s `-0` into 0,
 * as calibration's `exponentialOf` does; the order of operations is calibration's, so the result
 * is bit for bit the same double.
 */
export function breakingTimeSeconds(beat: BeatClockTunables, m: number, u: number): number {
  if (!(u > 0 && u <= 1)) throw new RangeError(`@ff/engine: a breaking-time uniform must be in (0, 1], got ${String(u)}`);
  return 0 + beatScaleSeconds(beat, m) * (-Math.log(u) + 0) ** (1 / beat.shape);
}

/**
 * The first tick at or after T (1e-9 tolerance), or `undefined` when T is past the last tick of
 * the play: the block holds the whole play (O21). The same arithmetic as calibration's
 * `beatTickOf`.
 */
export function beatTickOf(tunables: Tunables, T: number): number | undefined {
  if (!Number.isFinite(T)) throw new RangeError(`@ff/engine: a breaking time must be finite, got ${String(T)}`);
  const clock = clockGridOf(tunables);
  const n = Math.max(0, Math.ceil((T - clock.firstTick) / clock.tickStepSeconds - TICK_TOLERANCE));
  const tick = roundTick(clock.firstTick + n * clock.tickStepSeconds);
  return tick > clock.maxTick + TICK_TOLERANCE ? undefined : tick;
}

/** The push window of this shape-S overlay, or `undefined` for shape S without it. */
export function pushWindowOf(beat: BeatClockTunables): PushWindow | undefined {
  return beat.pushWindow;
}

/** Whether the push window applies to a rep: a POWER rep with latent margin in the window's range. */
export function pushWindowApplies(window: PushWindow, rep: { readonly margin: number; readonly move: RushMove }): boolean {
  return rep.move === PUSH_MOVE && rep.margin >= window.minMargin && rep.margin <= window.maxMargin;
}

/**
 * The window's ticks for a rep beaten on `beatTick`, in calibration's order (the gaining tick,
 * then the beaten tick), each dropped when it falls before the play's first tick.
 */
export function pushWindowTicks(
  beatTick: number,
  repMargin: number,
  window: PushWindow,
  bands: BeatBands,
  clock: ClockGrid,
): readonly { readonly tick: number; readonly margin: number }[] {
  const out: { tick: number; margin: number }[] = [];
  const gaining = roundTick(beatTick - window.lengthSeconds);
  const beaten = roundTick(beatTick - clock.tickStepSeconds);
  if (gaining >= clock.firstTick - TICK_TOLERANCE) out.push({ tick: gaining, margin: Math.min(repMargin, bands.gainingCap) });
  if (beaten >= clock.firstTick - TICK_TOLERANCE) out.push({ tick: beaten, margin: Math.max(repMargin, bands.beatenFloor) });
  return out;
}

/**
 * The margin a shape-S matchup reports on `tick`. `rep.margin` is the `pass_rush_rep`'s latent m;
 * `beatTick` undefined means the block holds the whole play. No die: a pure function of the beat.
 */
export function reportedMarginS(
  tick: number,
  rep: { readonly margin: number; readonly move: RushMove },
  beatTick: number | undefined,
  window: PushWindow | undefined,
  bands: BeatBands,
  clock: ClockGrid,
): number {
  if (beatTick !== undefined && tick >= beatTick - TICK_TOLERANCE) return Math.max(bands.winMargin, rep.margin);
  if (window !== undefined && beatTick !== undefined && pushWindowApplies(window, rep)) {
    for (const w of pushWindowTicks(beatTick, rep.margin, window, bands, clock)) {
      if (Math.abs(w.tick - tick) < TICK_TOLERANCE) return w.margin;
    }
  }
  return Math.min(0, rep.margin);
}

// --- the draw, once per rep ---------------------------------------------------

export interface DrawBeatArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly beat: BeatClockTunables;
  readonly rusher: PlayerState;
  readonly blocker: PlayerState;
  /** The `pass_rush_rep` CHECK's margin, the m the breaking time reads. */
  readonly repMargin: number;
  /** The `pass_rush_rep` CHECK's `roll.rngLabel`: the beat CHECK's `rollRef`. */
  readonly repRollRef: string;
  /** `rush/beat/<rep label>`: one fork per rep, of which exactly one number is drawn. */
  readonly beatRng: Rng;
}

export interface BeatOutcome {
  /** The breaking time, in seconds from the snap. */
  readonly T: number;
  /** The first tick at or after T, or `undefined` when the block holds the whole play. */
  readonly tick: number | undefined;
  /** The beat roll's `rngLabel`: what every tick of the matchup and its threat name. */
  readonly label: string;
  /** The `pass_rush_beat` CHECK (ADR-089 P2), written right after the rep's. */
  readonly check: CheckEmission;
}

/** Shape S's one draw per rep, and its CHECK. */
export function drawBeat(args: DrawBeatArgs): BeatOutcome {
  const { tunables, beat, rusher, blocker, repMargin, repRollRef, beatRng } = args;
  const u = 1 - beatRng.next();
  const T = breakingTimeSeconds(beat, repMargin, u);
  const roll: RollDetail = { die: "uniform", raw: u, modifiers: [], total: u, rngLabel: beatRng.label };
  return {
    T,
    tick: beatTickOf(tunables, T),
    label: beatRng.label,
    check: {
      checkKind: "pass_rush_beat",
      actors: [rusher.bio.id, blocker.bio.id],
      roll,
      // A copy of the margin the breaking time reads, and its tier: not a result of U (P2).
      tier: tierFor(tunables, repMargin),
      margin: repMargin,
      // The rep the `rollRef` names tested the ratings (P2).
      testsAttrs: [],
      rollRef: repRollRef,
    },
  };
}

// --- each tick, without a die ---------------------------------------------------

export interface BeatTickArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly beat: BeatClockTunables;
  readonly rusher: PlayerState;
  readonly blocker: PlayerState;
  readonly move: RushMove;
  /** The `pass_rush_rep` CHECK's margin. */
  readonly repMargin: number;
  /** The matchup's beat: its tick and its label (the tick CHECK's `rollRef`). */
  readonly beatTick: number | undefined;
  readonly beatLabel: string;
  /** The play clock's tick this tick resolves at. */
  readonly tick: number;
}

export interface BeatTickOutcome {
  readonly band: PassRushBandLabel;
  readonly margin: number;
  readonly pressureDelta: number;
  readonly resetsPressure: boolean;
  /** A `pass_rush_tick` with no `roll` and no `opposedRoll` (ADR-089 P3). */
  readonly check: BeatTickEmission;
}

/** One shape-S tick of a blocked matchup: the beat's margin through today's band and counter tables. */
export function resolveBeatTick(args: BeatTickArgs): BeatTickOutcome {
  const { tunables, beat, rusher, blocker, move, repMargin, beatTick, beatLabel, tick } = args;
  const t = tunables.passRush;
  const margin = reportedMarginS(
    tick,
    { margin: repMargin, move },
    beatTick,
    pushWindowOf(beat),
    beatBandsOf(tunables),
    clockGridOf(tunables),
  );
  const band = bandFor(t.bands, margin);
  const progress = t.pressureProgressByBand[band.label];
  return {
    band: band.label,
    margin,
    pressureDelta: progress.delta,
    resetsPressure: progress.reset,
    check: {
      checkKind: "pass_rush_tick",
      actors: [rusher.bio.id, blocker.bio.id],
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [],
      rollRef: beatLabel,
    },
  };
}
