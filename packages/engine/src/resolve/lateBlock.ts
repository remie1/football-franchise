/**
 * ADR-089 step 3, E4 — THE LATE, WEAK BLOCK FOR TOUCHED MEN (plan §2.4; AM-2's `lateBlock`; D19,
 * D21; `pocket-1.s3` with `blitzPickup.lateBlock` only).
 *
 * A man somebody got a hand on (RAN_THROUGH, LATE_EXCHANGE with a looper blocker; under reading A
 * also BLOWN_UP and LOOPER_FREE) is not a free runner under the design: he is blocked LATE, from
 * `t_e` (`engageSeconds`, 1.0 s), and WEAKLY, `w` (`weakMultiplier`, 0.1), by the man who touched
 * him. His block's margin is the touching CHECK's turned round, `m = -(margin) + 0` (1 to 19 for
 * RAN_THROUGH and LATE_EXCHANGE). Nothing is written for him before `t_e` and no push window ever
 * applies to him.
 *
 * SHAPE S. One die, drawn at the snap on the fork `beat/<the touching CHECK's rngLabel>` of the
 * play's rush bucket, after every pickup and stunt CHECK is written:
 *
 *     U = 1 - next()
 *     T = t_e + w * theta * exp(-beta * m / 41) * (-ln U + 0)^(1/k)
 *
 * the same expression, operation for operation, as calibration's `lateBreakingTimeS`
 * (`packages/calibration/src/pocket/clocks.ts`), so the two give the same double. It is published
 * as a `pass_rush_beat` CHECK (actors `[rusher, toucher]`, margin m, tier of m, `rollRef` the
 * touching CHECK, `testsAttrs` empty; the "Step 3" bullet of `contracts/src/events.ts`). From the
 * first tick at or after `t_e` each tick is a dieless `pass_rush_tick` naming the late beat, its
 * margin `reportedMarginS` with the window undefined: `min(0, m)` before the beat tick and
 * `max(RUSHER_WINS_REP's floor, m)` from it.
 *
 * SHAPE L (petition P17, in contracts since c340520 and lifted in E4b; `sim/pocketRules.ts`
 * refuses it only when a test withholds P17). From `t_e` each tick draws two d100s,
 * `rush/t<tick>/<rusherId>:late` and `rush/t<tick>/<toucherId>:late:<rusherId>` (the toucher's
 * die names the man he blocks, so a man on two late blocks draws two dice a tick and no label
 * repeats in a play; the Orchestrator's CT-F7 ruling), jitter
 * `round((rusher - toucher) / repJitter.divisor)` as today's tick, and margin
 * `Math.round(Math.min(t - t_e, w * R) * (m + jitter) / (w * R)) + 0`, the form of today's L
 * margin (AM-2 binds this form; calibration's fold uses the same). A rolled
 * `pass_rush_tick` with `roll` and `opposedRoll`, `rollRef` the touching CHECK.
 *
 * BEATEN (S: the beat tick; L: a RUSHER_WINS_REP tick). His threat keeps his origin (PICKUP_LOST
 * or STUNT_LOOPER) and band, names the touching CHECK, and travels as a won rep does from his
 * alignment, his plan's move, his tick margin and his position (`threatFromWonRep`), so its ETA
 * is the beat tick plus that travel (D21). Its approach is §4.0's row 3 through the play's labeller.
 */
import type { PlayerId, PlayerState, Position, Rng, RollDetail } from "@ff/contracts";
import type { BeatTickEmission, CheckEmission } from "../events.js";
import { bandFor, rollD100, tierFor } from "../rolls.js";
import type { BeatClockTunables, LateBlockTunables, RepClockTunables, Tunables } from "../tunables.js";
import type { RunSide, RushAlignment, RushMove } from "../types.js";
import { beatBandsOf, beatScaleSeconds, beatTickOf, clockGridOf, reportedMarginS } from "./beatClock.js";
import type { PassRushBandLabel } from "./passRush.js";
import { threatFromWonRep } from "./rushThreat.js";
import type { RushThreat } from "./rushThreat.js";

/** The late block's m: the touching CHECK's margin turned round (`+ 0` keeps -0 out, as calibration's `lateRepMargin`). */
export function lateRepMargin(touchingCheckMargin: number): number {
  return -touchingCheckMargin + 0;
}

/** The first tick at or after `t_e`, or `undefined` when `t_e` is past the play's last tick (the clean bench's 50). */
export function lateEngageTickOf(tunables: Tunables, late: LateBlockTunables): number | undefined {
  return beatTickOf(tunables, late.engageSeconds);
}

/** Shape S's late breaking time for m and one uniform U in (0, 1]. */
export function lateBreakingTimeSeconds(beat: BeatClockTunables, late: LateBlockTunables, m: number, u: number): number {
  if (!(u > 0 && u <= 1)) throw new RangeError(`@ff/engine: a breaking-time uniform must be in (0, 1], got ${String(u)}`);
  return late.engageSeconds + late.weakMultiplier * beatScaleSeconds(beat, m) * (-Math.log(u) + 0) ** (1 / beat.shape);
}

export interface LateBeat {
  /** The breaking time, seconds from the snap. */
  readonly T: number;
  /** The first tick at or after T, or `undefined` when the late block holds the whole play. */
  readonly tick: number | undefined;
  /** The late beat roll's `rngLabel`, which every tick of the late block names. */
  readonly label: string;
  /** The `pass_rush_beat` CHECK, published after every pickup and stunt CHECK. */
  readonly check: CheckEmission;
}

/** Shape S's one die per late block, and its CHECK. */
export function drawLateBeat(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly beat: BeatClockTunables;
  readonly late: LateBlockTunables;
  /** The man carrying the record at the snap (on a carried record, not the CHECK's rusher). */
  readonly rusher: PlayerId;
  readonly toucher: PlayerId;
  readonly m: number;
  /** The touching CHECK's `roll.rngLabel`. */
  readonly touchRollRef: string;
  /** `rush/beat/<touchRollRef>`: one number is drawn from it. */
  readonly beatRng: Rng;
}): LateBeat {
  const { tunables, beat, late, m, beatRng } = args;
  const u = 1 - beatRng.next();
  const T = lateBreakingTimeSeconds(beat, late, m, u);
  const roll: RollDetail = { die: "uniform", raw: u, modifiers: [], total: u, rngLabel: beatRng.label };
  return {
    T,
    tick: beatTickOf(tunables, T),
    label: beatRng.label,
    check: {
      checkKind: "pass_rush_beat",
      actors: [args.rusher, args.toucher],
      roll,
      tier: tierFor(tunables, m),
      margin: m,
      testsAttrs: [],
      rollRef: args.touchRollRef,
    },
  };
}

export interface LateTickOutcome {
  readonly band: PassRushBandLabel;
  readonly margin: number;
  readonly pressureDelta: number;
  readonly resetsPressure: boolean;
}

/** Shape S: one dieless tick of a late block, from `t_e` on. No push window, whatever his move. */
export function resolveLateBeatTick(args: {
  readonly tunables: Tunables;
  readonly rusher: PlayerId;
  readonly toucher: PlayerId;
  readonly m: number;
  readonly move: RushMove;
  readonly beatTick: number | undefined;
  readonly beatLabel: string;
  readonly tick: number;
}): LateTickOutcome & { readonly check: BeatTickEmission } {
  const { tunables, m, tick } = args;
  const t = tunables.passRush;
  const margin = reportedMarginS(tick, { margin: m, move: args.move }, args.beatTick, undefined, beatBandsOf(tunables), clockGridOf(tunables));
  const band = bandFor(t.bands, margin);
  const progress = t.pressureProgressByBand[band.label];
  return {
    band: band.label,
    margin,
    pressureDelta: progress.delta,
    resetsPressure: progress.reset,
    check: {
      checkKind: "pass_rush_tick",
      actors: [args.rusher, args.toucher],
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [],
      rollRef: args.beatLabel,
    },
  };
}

/** Shape L (P17): one rolled tick of a late block, from `t_e` on. */
export function resolveLateTickL(args: {
  readonly tunables: Tunables;
  readonly repClock: RepClockTunables;
  readonly late: LateBlockTunables;
  readonly rusher: PlayerId;
  readonly toucher: PlayerId;
  readonly m: number;
  readonly touchRollRef: string;
  /** `rush/t<tick>`, the tick's own fork, as today's jitter tick reads. */
  readonly tickRng: Rng;
  readonly tick: number;
}): LateTickOutcome & { readonly check: CheckEmission } {
  const { tunables, late, m, tick, tickRng } = args;
  const t = tunables.passRush;
  const rusherRoll = rollD100(tickRng.fork(`${String(args.rusher)}:late`), []);
  // CT-F7: the toucher's die names the man he blocks, so one toucher on two late blocks draws two.
  const toucherRoll = rollD100(tickRng.fork(`${String(args.toucher)}:late:${String(args.rusher)}`), []);
  const jitter = Math.round((rusherRoll.total - toucherRoll.total) / t.repJitter.divisor);
  const wR = late.weakMultiplier * args.repClock.fullExpressionSeconds;
  const margin = Math.round((Math.min(tick - late.engageSeconds, wR) * (m + jitter)) / wR) + 0;
  const band = bandFor(t.bands, margin);
  const progress = t.pressureProgressByBand[band.label];
  return {
    band: band.label,
    margin,
    pressureDelta: progress.delta,
    resetsPressure: progress.reset,
    check: {
      checkKind: "pass_rush_tick",
      actors: [args.rusher, args.toucher],
      roll: rusherRoll,
      opposedRoll: toucherRoll,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [],
      rollRef: args.touchRollRef,
    },
  };
}

/**
 * A beaten late block's threat: a won rep's travel from this tick (his alignment, his plan's move,
 * the tick's margin, his position), keeping his own origin and naming the touching CHECK.
 */
export function lateThreatOf(args: {
  readonly tunables: Tunables;
  readonly rusher: PlayerState;
  readonly alignment: RushAlignment;
  readonly move: RushMove;
  readonly margin: number;
  readonly tick: number;
  readonly origin: "PICKUP_LOST" | "STUNT_LOOPER";
  readonly touchRollRef: string;
  readonly side: RunSide | undefined;
}): RushThreat {
  const position: Position = args.rusher.bio.position;
  const won = threatFromWonRep({
    tunables: args.tunables,
    rusher: args.rusher.bio.id,
    alignment: args.alignment,
    move: args.move,
    margin: args.margin,
    tick: args.tick,
    rollRef: args.touchRollRef,
    position,
  });
  return { ...won, origin: args.origin, ...(args.side === undefined ? {} : { side: args.side }) };
}
