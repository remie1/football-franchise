/**
 * §7.2 — RUSHER TIME OF ARRIVAL.
 *
 * The conceptual correction this module exists for: **pocket status describes
 * space, not a countdown to a sack.** Winning a rep does not put a rusher on
 * the quarterback. It starts him TRAVELLING. A won rep produces a threat with
 * an ETA, and the passer has the intervening ticks to throw, climb, or leave.
 *
 * Travel time is a physical quantity — alignment plus path — so the interior /
 * edge asymmetry is emergent rather than asserted:
 *
 *   INTERIOR  a defeated guard leaves ~4-5 yards of straight line to a shotgun
 *             launch point. He arrives almost at once, AND he arrives in the
 *             exact space a step-up would have used. That is why interior
 *             pressure is worth more than edge pressure.
 *   EDGE      a defeated tackle leaves an ARC of 10-12 yards around a corner,
 *             to a spot the quarterback has already vacated by dropping.
 *
 * ADR-005 compliance: no die is thrown in this file. Every value here is a
 * deterministic function of the §7.1 `pass_rush_tick` CHECK that created the
 * threat — its actors, its move, and its margin — all of which are already in
 * the event stream. Nothing is asserted that no roll produced.
 */
import type { PlayerId, Position } from "@ff/contracts";
import { clamp } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type {
  PocketStatus,
  ResolvedRushAssignment,
  RunSide,
  RushAlignment,
  RushMove,
} from "../types.js";
import type { PassRushBandLabel } from "./passRush.js";

/** A rusher who has beaten his block and is on his way. */
export interface RushThreat {
  readonly rusher: PlayerId;
  readonly alignment: RushAlignment;
  /** Tick of the rep he won. */
  readonly wonAtTick: number;
  /** Tick at which he reaches the quarterback if nothing changes. */
  readonly etaTick: number;
  /**
   * `rngLabel` of the roll that justifies this threat's existence — the
   * `pass_rush_tick` CHECK that created it. ADR-004: the ETA asserts nothing the
   * stream cannot already justify, and it points back at what justified it.
   * (The pursuit clock a scrambling QB runs on is not a pass-rush rep and is
   * never published as a RUSH_THREAT; it references the §8.8 escape roll.)
   */
  readonly rollRef: string;
}

/** The band that starts a rusher travelling — §7.1's "rusher wins rep". */
const WINNING_BAND: PassRushBandLabel = "RUSHER_WINS_REP";

/** §7.1's own threshold, read from the table rather than restated. */
function winMinMargin(tunables: Tunables): number {
  return tunables.passRush.bands.find((b) => b.label === WINNING_BAND)?.minMargin ?? 15;
}

export function startsThreat(band: PassRushBandLabel): boolean {
  return band === WINNING_BAND;
}

/** A blocker win by 15+ resets the rusher — the threat he was is gone. */
export function clearsThreat(tunables: Tunables, band: PassRushBandLabel): boolean {
  return tunables.passRush.pressureProgressByBand[band].reset;
}

/**
 * Alignment for a rush assignment. The play call states it; when it does not,
 * the rusher's registry `Position` supplies a base-front default.
 */
export function rushAlignmentFor(
  tunables: Tunables,
  position: Position,
  declared?: RushAlignment,
): RushAlignment {
  if (declared !== undefined) return declared;
  const interior: readonly string[] = tunables.arrival.interiorPositions;
  return interior.includes(position) ? "INTERIOR" : tunables.arrival.defaultAlignment;
}

/**
 * The rush assignment as PLAY_START states it: the alignment RESOLVED, and the
 * side carried through unchanged (ADR-018 petition 2).
 *
 * The asymmetry between the two fields is the whole content of this function and
 * is deliberate. `alignment` is resolved because §7.2's time-of-arrival model
 * cannot run without one, so an absent alignment becomes a tunable default and
 * the stream must state which value was actually used. `side` has no such
 * consumer and therefore no default: nothing in the engine reads it, so there is
 * nothing to substitute for it and substituting anything would be inventing the
 * geometry the petition exists to stop being invented. Absent stays absent, and
 * a consumer can tell "the card did not say" from "the card said LEFT".
 *
 * One owner, called from both `sim/passPlay.ts` and `sim/runPlay.ts`, because
 * two copies of "what PLAY_START says about a rusher" is how the pass and run
 * payloads drift apart.
 */
export function resolvedRushAssignment(args: {
  readonly rusher: PlayerId;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
  readonly side: RunSide | undefined;
}): ResolvedRushAssignment {
  const { rusher, move, alignment, side } = args;
  // `exactOptionalPropertyTypes` — an omitted side is an ABSENT key, not a key
  // whose value is `undefined`, so a consumer's `in` test and its `?.` test agree.
  return side === undefined ? { rusher, move, alignment } : { rusher, move, alignment, side };
}

/**
 * How long this rusher needs to cover the ground, given where he started, the
 * path his move takes, and how decisively he won. A rusher who wins by 60 is
 * cleanly past the blocker; one who scrapes a 15 is still fighting through.
 */
export function travelSecondsFor(
  tunables: Tunables,
  alignment: RushAlignment,
  move: RushMove,
  margin: number,
): number {
  const t = tunables.arrival;
  const base = t.travelSecondsByAlignmentAndMove[alignment][move];
  const dominanceSteps = Math.floor(
    Math.max(0, margin - winMinMargin(tunables)) / t.dominanceMarginPerHalfTick,
  );
  const raw = base - dominanceSteps * t.quantizeSeconds;
  const quantized = Math.round(raw / t.quantizeSeconds) * t.quantizeSeconds;
  return Number(clamp(quantized, t.minTravelSeconds, t.maxTravelSeconds).toFixed(1));
}

/** The threat a won rep creates. */
export function threatFromWonRep(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly rusher: PlayerId;
  readonly alignment: RushAlignment;
  readonly move: RushMove;
  readonly margin: number;
  readonly tick: number;
  /** The `pass_rush_tick` roll that produced this win (ADR-004/007). */
  readonly rollRef: string;
}): RushThreat {
  const travel = travelSecondsFor(args.tunables, args.alignment, args.move, args.margin);
  return {
    rusher: args.rusher,
    alignment: args.alignment,
    wonAtTick: args.tick,
    etaTick: Number((args.tick + travel).toFixed(1)),
    rollRef: args.rollRef,
  };
}

/**
 * Winning again does not slow a rusher down: keep whichever arrival is sooner.
 * (It does not speed him up either — he is already past the block.)
 */
export function soonerThreat(existing: RushThreat | undefined, next: RushThreat): RushThreat {
  if (existing === undefined) return next;
  return existing.etaTick <= next.etaTick ? existing : next;
}

/** Push a threat back — what a step-up, or a recovered blocker, does to a rusher. */
export function delayThreat(threat: RushThreat, seconds: number): RushThreat {
  if (seconds === 0) return threat;
  return { ...threat, etaTick: Number((threat.etaTick + seconds).toFixed(1)) };
}

/**
 * Ground the rusher loses on the following tick's rep. A threat is not frozen
 * at the moment it was created: a tackle who recovers position is not
 * un-beaten, but the man he beat is arriving later than he was.
 */
export function recoverySecondsFor(tunables: Tunables, band: PassRushBandLabel): number {
  return tunables.arrival.recoverySecondsByBand[band];
}

export function timeToArrival(threat: RushThreat, tick: number): number {
  return Number((threat.etaTick - tick).toFixed(1));
}

/** Seconds until the nearest threat arrives; `undefined` when nobody is coming. */
export function minTimeToArrival(
  threats: readonly RushThreat[],
  tick: number,
): number | undefined {
  let min: number | undefined;
  for (const threat of threats) {
    const tta = timeToArrival(threat, tick);
    if (min === undefined || tta < min) min = tta;
  }
  return min;
}

export function hasArrived(
  tunables: Tunables,
  threats: readonly RushThreat[],
  tick: number,
): boolean {
  const min = minTimeToArrival(threats, tick);
  return min !== undefined && min <= tunables.arrival.immediateWithinSeconds;
}

export function threatsWithAlignment(
  threats: readonly RushThreat[],
  alignment: RushAlignment,
): RushThreat[] {
  return threats.filter((t) => t.alignment === alignment);
}

/**
 * Pocket-status floor implied by the nearest travelling threat. This is what
 * keeps a beaten tackle beaten: a rusher who won at 1.0 and stalemates at 1.5
 * has not un-beaten his block — he is still coming, and the pocket knows it.
 */
export function pocketFloorFromArrival(
  tunables: Tunables,
  minTta: number | undefined,
): PocketStatus {
  if (minTta === undefined) return "CLEAN";
  const t = tunables.arrival;
  if (minTta <= t.immediateWithinSeconds) return "IMMEDIATE";
  if (minTta <= t.collapsingWithinSeconds) return "COLLAPSING";
  return "PRESSURE";
}

/**
 * §7.2's response window, expressed in half-ticks of urgency: 0 when nothing is
 * travelling, rising as the nearest arrival closes. Both the movement decision
 * and the scramble check are scaled by it.
 */
export function urgencySteps(tunables: Tunables, minTta: number | undefined): number {
  if (minTta === undefined) return 0;
  const t = tunables;
  const horizon = t.pocketMovement.urgencyHorizonSeconds;
  return Math.max(0, Math.round((horizon - Math.max(0, minTta)) / t.clock.tickStepSeconds));
}
