/**
 * §8.1 ANTICIPATION — throwing to a window that does not exist yet.
 *
 * This is the mechanic §8.1's three reading systems were missing. The doc gives
 * each system a read rate and a progression depth and stops there; with only
 * those two numbers the only implementable quarterback is one who waits until he
 * can SEE a receiver open, which is a full-field progression wearing three
 * different hats. That is exactly what the engine shipped
 * (CALIBRATION-BACKLOG 2b): every QB threw to whoever came open first, and the
 * reading system was decorative.
 *
 * Half-field football does not work that way. The throw and the break happen
 * together: the quarterback turns it loose on timing, before the receiver has
 * declared, and the ball arrives as the man comes out of his cut. A QB who can
 * do that beats the rush by releasing early. A QB who cannot must wait for
 * separation he can see, and pays for the wait in pressure — which is the whole
 * trade the three systems are supposed to express.
 *
 * WHAT THE CHECK IS FOR, precisely: it is asked ONLY about the receiver the
 * quarterback is currently on in his progression, and ONLY while that route has
 * not yet broken. Passing it declares the break early — the coverage rep
 * resolves and the QB reads the window he is throwing into. Failing it costs him
 * the tick: he stays on his primary, exactly as a real quarterback does, and
 * does not skip to the next man because the next man happens to be ready.
 *
 * ADR-004/005: one die, recorded once, in a CHECK that carries a tier because a
 * die was actually thrown. Outside `maxLeadSeconds` NO check is emitted at all —
 * being three seconds early is not a failed anticipation, it is not a decision.
 *
 * INTERIM VOCABULARY (ADR-008): `CheckKind` has no `anticipation`. `qb_read` is
 * the closest true statement — this IS the quarterback's read of an undeclared
 * route, and no other producer emits `qb_read` today (§8.3's per-read perception
 * roll is the documented non-CHECK exception, ADR-004). It is still
 * under-descriptive in exactly ADR-007's sense: a consumer counting `qb_read`
 * CHECKs is counting anticipation attempts, not reads. Petitioned in ADR-008.
 */
import type { AttrId, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import type { CheckEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, flatModifier, rollD100, tierFor } from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type { ReadSystem, RouteDepthClass } from "../types.js";

export type AnticipationBandLabel = (typeof TUNABLES.qb.anticipation.bands)[number]["label"];

export interface AnticipationArgs {
  readonly qb: PlayerState;
  readonly system: ReadSystem;
  /** Seconds between the release and the break. Must be > 0 and ≤ maxLeadSeconds. */
  readonly leadSeconds: number;
  readonly depthClass: RouteDepthClass;
  /** True on progression index 0 — the concept read's pre-snap key. */
  readonly firstRead: boolean;
  readonly anticipationRng: Rng;
}

export interface AnticipationOutcome {
  readonly anticipated: boolean;
  readonly band: AnticipationBandLabel;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly leadSeconds: number;
  readonly check: CheckEmission;
}

const ANTICIPATION_ATTRS: readonly AttrId[] = [ATTR.awareness, ATTR.footballIQ];

/**
 * Can the quarterback even consider it? A half-tick early is a rhythm throw; a
 * second and a half early is a ball on the ground before the receiver turns.
 * `false` means NO ROLL IS MADE (ADR-005) — he is simply not there yet.
 */
export function anticipationAvailable(leadSeconds: number): boolean {
  return leadSeconds > 0 && leadSeconds <= TUNABLES.qb.anticipation.maxLeadSeconds;
}

/** How far ahead of the break he is, in half-ticks. */
export function leadSteps(leadSeconds: number): number {
  return Math.max(0, Math.round(leadSeconds / TUNABLES.clock.tickStepSeconds));
}

export function resolveAnticipation(args: AnticipationArgs): AnticipationOutcome {
  const t = TUNABLES.qb.anticipation;
  const system = TUNABLES.qb.readSystem[args.system];

  const modifiers = compact([
    actorAttrModifier(args.qb, "Awareness (anticipation)", ATTR.awareness, t.terms[0]?.divisor ?? 5),
    actorAttrModifier(args.qb, "Football IQ (anticipation)", ATTR.footballIQ, t.terms[1]?.divisor ?? 5),
    flatModifier(
      `Throwing ${args.leadSeconds.toFixed(1)}s before the break`,
      t.perHalfTickAheadPenalty * leadSteps(args.leadSeconds),
    ),
    flatModifier(`${args.depthClass} route declares`, t.depthModifier[args.depthClass]),
    flatModifier(`${args.system} timing`, system.anticipationModifier),
    args.firstRead
      ? flatModifier(`${args.system} first read (key)`, system.firstReadAnticipationModifier)
      : undefined,
    // Neutral until chemistry has an owner (ADR-008). `compact` drops it at 0,
    // so the printout gains a line the day the input becomes real and not before.
    flatModifier("QB/receiver chemistry", TUNABLES.chemistry.pairModifier),
  ]);

  const roll = rollD100(args.anticipationRng, modifiers);
  const margin = roll.total - t.target;
  const band = bandFor(t.bands, margin);

  return {
    anticipated: band.anticipated,
    band: band.label,
    margin,
    roll,
    leadSeconds: args.leadSeconds,
    check: {
      checkKind: "qb_read",
      actors: [args.qb.bio.id],
      roll,
      target: t.target,
      tier: tierFor(margin),
      margin,
      testsAttrs: ANTICIPATION_ATTRS,
    },
  };
}

/** Exposed so the §17 renderer can name the branch a margin selected. */
export function anticipationBandFor(margin: number): AnticipationBandLabel {
  return bandFor(TUNABLES.qb.anticipation.bands, margin).label;
}
