/**
 * ADR-089 step 1 — THE SWITCH, READ ONCE A PLAY (plan §4).
 *
 * "A bundle is a tunables overlay plus the switch set; the engine entry point takes it"
 * (ADR-089 §9). So the switch rides in the `Tunables` value the entry points already take, and
 * no entry point, parameter or barrel name is added: `simulatePassPlay` calls `pocketRulesOf`
 * once, before a single die is thrown, and every new branch of the play reads the answer.
 *
 * Only closed sets are accepted:
 *  - no `pocket-1` block and no stamp: `LEGACY`, today's game, byte for byte;
 *  - `passRush.beatClock` (with or without its `pushWindow`) with `passRush.approach`, and a
 *    stamp: shape S, the breaking time (ADR-089 §4.1, §4.1.1);
 *  - `passRush.repClock` with `passRush.approach`, and a stamp: shape L, the gradual clock.
 * Anything else is refused with a `PocketRulesError`: both clocks; a clock without the approach
 * card or the card without a clock; a block without a stamp or a stamp without a block; a stamp
 * whose name is not a `pocket-1` name (`legacy` is never stamped); a stamp without its overlay
 * digest; a dial no clock can run on (among them a push window that is not a whole number of tick
 * steps, two or more).
 *
 * The push window's margin range (`beatClock.pushWindow`) and the approach card's PUSH range
 * (`approach`) are separate dials here (review CT-3): shape S without the window still has a
 * card, and the engine reads each where it acts (the window's ticks, the threat's label). They
 * name the same reps by design (ADR-089 §4.0's PUSH row and §4.1.1 are both "POWER, 1 to 14"),
 * and calibration, the only maker of a stamped bundle, refuses one whose two ranges differ.
 *
 * The stamp is COPIED onto `PLAY_START` as `{ name, overlayDigest }` (`rules` below), so no
 * extra run-time key of the caller's object can ride into the stream. The engine computes no
 * digest: the caller (calibration) stamps the bundle with the digest of the dials it built, and
 * the engine publishes what it was given.
 */
import type { ApproachTunables, BeatClockTunables, RepClockTunables, Tunables } from "../tunables.js";

/** Thrown before any die when the tunables carry a `pocket-1` overlay outside the closed sets. */
export class PocketRulesError extends Error {
  constructor(message: string) {
    super(`@ff/engine: ${message}`);
    this.name = "PocketRulesError";
  }
}

/** The stamp as `PLAY_START` publishes it: a fresh object with exactly these two keys. */
export interface PublishedRules {
  readonly name: string;
  readonly overlayDigest: string;
}

/** Which rules a play runs under. `S` and `L` are the two candidate block clocks of §4.1. */
export type PocketRules =
  | { readonly kind: "LEGACY" }
  | {
      readonly kind: "S";
      readonly beatClock: BeatClockTunables;
      readonly approach: ApproachTunables;
      readonly rules: PublishedRules;
    }
  | {
      readonly kind: "L";
      readonly repClock: RepClockTunables;
      readonly approach: ApproachTunables;
      readonly rules: PublishedRules;
    };

const LEGACY: PocketRules = Object.freeze({ kind: "LEGACY" });

/**
 * A `pocket-1` rules name: `pocket-1` itself (frozen at step 11) or a mid-build name such as
 * `pocket-1.s1` (ADR-089 §9: "Mid-build arms are `pocket-1.s<step>`").
 */
const POCKET_1_NAME = /^pocket-1(\.[a-z0-9][a-z0-9.-]*)?$/;

function positive(value: unknown, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || !(value > 0)) {
    throw new PocketRulesError(`${what} must be a finite number above 0, got ${String(value)}`);
  }
}

function finite(value: unknown, what: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PocketRulesError(`${what} must be a finite number, got ${String(value)}`);
  }
}

function range(min: unknown, max: unknown, what: string): void {
  finite(min, `${what}'s minimum`);
  finite(max, `${what}'s maximum`);
  if ((min as number) > (max as number)) {
    throw new PocketRulesError(`${what} runs from ${String(min)} to ${String(max)}: its minimum is above its maximum`);
  }
}

/**
 * The push window's gaining tick is `t_b - lengthSeconds` and its beaten tick `t_b - tickStep`
 * (§4.1.1), and the beat tick is on the play's grid. So the length must be a whole number of tick
 * steps, or the gaining tick is never a played tick, and at least two, or it is the beaten tick
 * itself and the BLOCKER_BEATEN tick the window files is never played (review CT-2).
 */
function onTheGrid(lengthSeconds: number, tickStepSeconds: number, what: string): void {
  const steps = lengthSeconds / tickStepSeconds;
  if (!(Math.abs(steps - Math.round(steps)) < 1e-9 && Math.round(steps) >= 2)) {
    throw new PocketRulesError(
      `${what} must be a whole number of tick steps (${String(tickStepSeconds)} s), at least 2, so its gaining tick is a played tick before its beaten tick; got ${String(lengthSeconds)}`,
    );
  }
}

/**
 * The rules this play runs under, from the tunables it was handed. Pure, and called once a play
 * at the top of `simulatePassPlay`, before any die: a refusal throws before the stream begins.
 */
export function pocketRulesOf(tunables: Tunables): PocketRules {
  const stamp = tunables.engineRules;
  const { beatClock, repClock, approach } = tunables.passRush;
  const clocks = (beatClock === undefined ? 0 : 1) + (repClock === undefined ? 0 : 1);
  if (stamp === undefined && clocks === 0 && approach === undefined) return LEGACY;

  if (clocks === 2) {
    throw new PocketRulesError("the tunables carry both block clocks (passRush.beatClock and passRush.repClock); a bundle runs one");
  }
  if (clocks === 1 && approach === undefined) {
    throw new PocketRulesError("a block clock without the approach card (passRush.approach); pocket-1 publishes the approach on every threat");
  }
  if (clocks === 0 && approach !== undefined) {
    throw new PocketRulesError("the approach card (passRush.approach) without a block clock (passRush.beatClock or passRush.repClock)");
  }
  if (stamp === undefined) {
    throw new PocketRulesError("a pocket-1 overlay without its rules stamp (engineRules { name, overlayDigest })");
  }
  if (clocks === 0) {
    throw new PocketRulesError(`a rules stamp (${String(stamp.name)}) without a pocket-1 block; legacy carries no stamp`);
  }
  if (typeof stamp.name !== "string" || !POCKET_1_NAME.test(stamp.name)) {
    throw new PocketRulesError(`the rules stamp names ${String(stamp.name)}, which is not a pocket-1 rules name`);
  }
  if (typeof stamp.overlayDigest !== "string" || stamp.overlayDigest.length === 0) {
    throw new PocketRulesError(`the rules stamp ${stamp.name} carries no overlay digest`);
  }
  if (approach === undefined) throw new PocketRulesError("unreachable: a block clock without the approach card");
  range(approach.pushMinMargin, approach.pushMaxMargin, "the approach card's PUSH range");
  const rules: PublishedRules = Object.freeze({ name: stamp.name, overlayDigest: stamp.overlayDigest });

  if (beatClock !== undefined) {
    positive(beatClock.thetaSeconds, "passRush.beatClock.thetaSeconds");
    positive(beatClock.shape, "passRush.beatClock.shape");
    finite(beatClock.ratingWeight, "passRush.beatClock.ratingWeight");
    const w = beatClock.pushWindow;
    if (w !== undefined) {
      range(w.minMargin, w.maxMargin, "passRush.beatClock.pushWindow");
      positive(w.lengthSeconds, "passRush.beatClock.pushWindow.lengthSeconds");
      onTheGrid(w.lengthSeconds, tunables.clock.tickStepSeconds, "passRush.beatClock.pushWindow.lengthSeconds");
    }
    return Object.freeze({ kind: "S", beatClock, approach, rules });
  }
  if (repClock === undefined) throw new PocketRulesError("unreachable: no block clock");
  positive(repClock.fullExpressionSeconds, "passRush.repClock.fullExpressionSeconds");
  return Object.freeze({ kind: "L", repClock, approach, rules });
}
