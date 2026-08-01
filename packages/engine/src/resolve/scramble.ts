/**
 * §8.8 — the scramble, and the drill it triggers.
 *
 * Escaping is not the same mechanic as climbing. A step-up buys ticks and keeps
 * the quarterback a passer inside structure; a scramble leaves the pocket and
 * changes the whole play:
 *
 *   - receivers stop running routes, find open grass and work back toward the
 *     QB's vision (`scrambleOpennessAt`);
 *   - the QB's vision cone narrows (`visionConeModifier`) — forward is full,
 *     the direction of the run is −20, back toward the line is −40;
 *   - the rush becomes pursuit, on its own clock.
 *
 * Ball-carrier resolution is not here, and no longer needs to be: a quarterback
 * who tucks it is a ball carrier, and `resolve/ballCarrier.ts` runs him through
 * §14.4's machinery like any other one. This module answers only "did he get
 * out?"; what he does once he is out belongs to §13/§14.
 */
import type { PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, clamp, compact, flatModifier, rollD100, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { RouteDepthClass } from "../types.js";
import type { ArrivalClock } from "./rushThreat.js";
import { minTimeToArrival, threatsWithAlignment, urgencySteps } from "./rushThreat.js";

export type ScrambleBandLabel = (Tunables["scramble"]["bands"])[number]["label"];

export interface ScrambleArgs {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly qb: PlayerState;
  readonly tick: number;
  readonly threats: readonly ArrivalClock[];
  readonly scrambleRng: Rng;
}

export interface ScrambleOutcome {
  readonly band: ScrambleBandLabel;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly escaped: boolean;
  /** Caught trying to get out — the bail that ends worse than standing in. */
  readonly sacked: boolean;
  readonly check: CheckEmission;
}

/**
 * §8.8 "QB Improvisation + Mobility vs. Pursuit". Pursuit here is the target
 * number: harder the closer the rush is, and harder still when an EDGE rusher
 * is already outside him — those are the contain players, and getting out past
 * one is the difficult version of this. A purely interior collapse is the easy
 * one, which is also why interior penetration pushes mobile QBs out of the
 * pocket rather than trapping them in it.
 */
export function resolveScramble(args: ScrambleArgs): ScrambleOutcome {
  const { tunables } = args;
  const t = tunables.scramble;
  const urgency = urgencySteps(tunables, minTimeToArrival(args.threats, args.tick));
  const edgeThreats = threatsWithAlignment(args.threats, "EDGE").length;

  const roll = rollD100(
    args.scrambleRng,
    compact([
      actorAttrModifier(args.qb, "Mobility (scramble)", ATTR.mobility, t.attrDivisor),
      actorAttrModifier(args.qb, "Improvisation (scramble)", ATTR.improvisation, t.attrDivisor),
    ]),
  );
  const target =
    t.target + edgeThreats * t.edgeThreatPenalty + urgency * t.perUrgencyStepPenalty;
  const margin = roll.total - target;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    margin,
    roll,
    escaped: band.escaped,
    sacked: band.sacked,
    check: {
      checkKind: "scramble",
      actors: [args.qb.bio.id, ...args.threats.map((threat) => threat.rusher)],
      roll,
      target,
      tier: tierFor(tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [ATTR.mobility, ATTR.improvisation],
    },
  };
}

/**
 * §8.8's vision cone, read as DEPTH relative to the scrambling passer. The doc's
 * cone is spatial and this slice has no horizontal field model, so depth class
 * stands in: deep and intermediate routes are in the forward cone, the short
 * game is where he is running, and the quick game is behind him — the throw a
 * scrambling quarterback genuinely cannot see.
 *
 * Emitted as a NAMED MODIFIER on §8.3's awareness roll, which is the check the
 * doc's "−20 / −40" is written against, so it stays auditable in the stream.
 */
export function visionConeModifier(tunables: Tunables, depthClass: RouteDepthClass): number {
  return tunables.scramble.visionConeByDepthClass[depthClass];
}

export function visionConeRollModifier(
  tunables: Tunables,
  depthClass: RouteDepthClass,
): ReturnType<typeof flatModifier> {
  return flatModifier(`Scramble vision cone (${depthClass.toLowerCase()})`, visionConeModifier(tunables, depthClass));
}

/**
 * §8.8 "receivers stop running routes, find open grass". Coverage stops closing
 * and the receiver works back into vision — openness climbs from wherever it
 * stood when the QB left, up to a ceiling short of wide-open.
 */
export function scrambleOpennessAt(
  tunables: Tunables,
  opennessAtEscape: number,
  escapeTick: number,
  tick: number,
): number {
  const t = tunables.scramble;
  const steps = Math.max(0, (tick - escapeTick) / tunables.clock.tickStepSeconds);
  return Math.round(
    clamp(opennessAtEscape + t.opennessGainPerTick * steps, tunables.route.minOpenness, t.maxOpenness),
  );
}

/** When pursuit runs the scrambling quarterback down and the ball must come out. */
export function pursuitDeadline(tunables: Tunables, escapeTick: number): number {
  return Number((escapeTick + tunables.scramble.pursuitSeconds).toFixed(1));
}

/**
 * ADR-055 §6 point 4 — pursuit's OWN condition for forcing a decision, not
 * `pocket.forcesDecision`'s list membership borrowed through a rung pursuit
 * no longer has (backlog entry 84).
 *
 * TRUE ON EXACTLY THE LAST TICK BEFORE `pursuitDeadline` FORCES THE TUCK
 * ANYWAY (`sim/passPlay.ts`'s own `tick >= scramble.pursuitAtTick` branch) —
 * the one tick left in which taking a mediocre-but-live target (§8.5's
 * DESPERATION threshold, below the ordinary `throwThreshold`) is worth more
 * than running mechanically out of the chance to throw at all. Every EARLIER
 * pursuit tick still reaches a genuinely open target through the ordinary
 * `throwThreshold` check unconditionally — that check never reads
 * `mustDecide` — so this narrows WHEN the bar drops, not whether the
 * quarterback can throw.
 *
 * ZERO NEW MAGNITUDE. `pursuitSeconds` and `clock.tickStepSeconds` are both
 * already ratified elsewhere; this reads them, it adds no third number.
 *
 * ⚠ AN EARLIER DRAFT READ THIS UNCONDITIONALLY TRUE for every pursuit tick,
 * derived from "`nextReadable` already replaces `progressionStep` the instant
 * `scramble` is defined — there is no held read order left to protect, so
 * there is no tick on which holding is the answer." That derivation is not
 * wrong on its own terms, but it proved too strong: `test/pressureMetrics
 * .test.ts`'s protected ordering ("a MISSED blitz is more dangerous than a
 * seen one, and than no blitz at all") caught it. Forcing the desperation bar
 * from the FIRST pursuit tick measurably let missed-blitz scrambles complete,
 * or check down to a mediocre target, instead of eventually being run down —
 * moving that bucket's sack rate BELOW the no-blitz baseline and inverting a
 * relationship the corpus is supposed to preserve. Recorded rather than
 * silently narrowed to the version below, per this dispatch's own standing
 * instruction to report a premise that turned out wrong rather than erase it.
 */
export function pursuitForcesDecision(tunables: Tunables, tick: number, deadlineTick: number): boolean {
  return tick + tunables.clock.tickStepSeconds >= deadlineTick;
}
