/**
 * §5.3 blitz recognition, §7.3 stunts and twists, §7.4 blitz pickup.
 *
 * Three rolls, each stated literally from the design doc's own formula, and each
 * producing exactly one fact:
 *
 *   §5.3  did the quarterback and the centre SEE it?      → hot routes, +/- pickup
 *   §7.3  did the line pass the twist off?                → a swap, or a free looper
 *   §7.4  did the back pick the blitzer up?               → a block, or a free runner
 *
 * ADR-004: every one of them is recorded exactly once, in the emission it
 * returns. ADR-005: none of them is rolled unless something turns on it — a
 * defence whose every rusher is named by the protection produces no recognition
 * roll at all, because there is nothing to recognise and an absent check must
 * mean "no die", never "failed".
 */
import type { PlayerId, PlayerState, Rng, RollDetail } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import type { CheckEmission, PresnapEmission } from "../events.js";
import { actorAttrModifier, bandFor, compact, flatModifier, rollD100, tierFor } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type { BlitzDisguise, StuntComplexity } from "../interim/adr022.js";

export type BlitzRecognitionBandLabel =
  Tunables["presnap"]["blitzRecognition"]["bands"][number]["label"];
export type BlitzPickupBandLabel = Tunables["blitzPickup"]["bands"][number]["label"];
export type StuntBandLabel = Tunables["stunt"]["bands"][number]["label"];

// --- §5.3 -------------------------------------------------------------------

export interface BlitzRecognitionOutcome {
  readonly band: BlitzRecognitionBandLabel;
  readonly recognized: boolean;
  readonly margin: number;
  readonly roll: RollDetail;
  readonly presnap: PresnapEmission;
}

/**
 * §5.3 verbatim: `d100 + (QB Awareness ÷ 5) + (Centre Awareness ÷ 5)` against
 * `50 + Blitz Disguise Rating`.
 *
 * The centre's term is present ONLY when the card names a centre. There is no
 * substitute: the engine cannot work out who the centre is from a list of
 * blocker↔rusher pairings, and picking a stand-in would put a fabricated actor
 * on a real roll. The modifier list in the stream therefore says exactly which
 * terms were rolled.
 */
export function resolveBlitzRecognition(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly quarterback: PlayerState;
  readonly center: PlayerState | undefined;
  readonly disguise: BlitzDisguise;
  readonly presnapRng: Rng;
}): BlitzRecognitionOutcome {
  const t = args.tunables.presnap.blitzRecognition;
  const target = t.target + t.disguise[args.disguise];

  const modifiers = compact([
    actorAttrModifier(args.quarterback, "Awareness (blitz read)", ATTR.awareness, t.attrDivisor),
    args.center === undefined
      ? undefined
      : actorAttrModifier(args.center, "Awareness (protection call)", ATTR.awareness, t.attrDivisor),
  ]);

  const roll = rollD100(args.presnapRng.fork("blitzRecognition"), modifiers);
  const margin = roll.total - target;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    recognized: band.recognized,
    margin,
    roll,
    presnap: {
      actor: args.quarterback.bio.id,
      kind: "blitz_recognition",
      roll,
      target,
      tier: tierFor(args.tunables, margin),
    },
  };
}

// --- §7.4 step 3 ------------------------------------------------------------

export interface BlitzPickupOutcome {
  readonly band: BlitzPickupBandLabel;
  readonly blocked: boolean;
  /** Seconds added to a beaten pickup's arrival — getting through a body costs time. */
  readonly arrivalDelaySeconds: number;
  readonly margin: number;
  readonly check: CheckEmission;
}

/**
 * §7.4 step 3 verbatim: "RB/TE Pass Block vs Blitzer Pass Rush."
 *
 * Margin reads from the PROTECTION's side (blocker total − rusher total),
 * matching the doc's own framing, so a positive margin is a pickup.
 *
 * §5.3's "protection adjusted" rides here as a named modifier rather than as a
 * gate: the doc's failure text is "free rusher POTENTIAL", so a missed blitz
 * makes the pickup harder and does not skip it.
 */
export function resolveBlitzPickup(args: {
  readonly tunables: Tunables;
  readonly blocker: PlayerState;
  readonly rusher: PlayerState;
  readonly recognized: boolean;
  readonly pickupRng: Rng;
}): BlitzPickupOutcome {
  const t = args.tunables.blitzPickup;

  const blockerRoll = rollD100(
    args.pickupRng.fork(`${String(args.blocker.bio.id)}:pickup`),
    compact([
      actorAttrModifier(args.blocker, "Pass Block (pickup)", ATTR.passBlock, t.blockerAttrDivisor),
      flatModifier(
        args.recognized ? "Blitz recognised, protection adjusted (§5.3)" : "Blitz missed pre-snap (§5.3)",
        args.recognized ? t.recognitionModifier.RECOGNIZED : t.recognitionModifier.MISSED,
      ),
    ]),
  );
  const rusherRoll = rollD100(
    args.pickupRng.fork(`${String(args.rusher.bio.id)}:blitz`),
    compact([actorAttrModifier(args.rusher, "Pass Rush (blitz)", ATTR.passRush, t.rusherAttrDivisor)]),
  );

  const margin = blockerRoll.total - rusherRoll.total;
  const band = bandFor(t.bands, margin);

  return {
    band: band.label,
    blocked: band.blocked,
    arrivalDelaySeconds: band.arrivalDelaySeconds,
    margin,
    check: {
      checkKind: "blitz_pickup",
      actors: [args.blocker.bio.id, args.rusher.bio.id],
      roll: blockerRoll,
      opposedRoll: rusherRoll,
      tier: tierFor(args.tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [ATTR.passBlock, ATTR.passRush],
    },
  };
}

// --- §7.3 -------------------------------------------------------------------

export interface StuntOutcome {
  readonly band: StuntBandLabel;
  readonly passedOff: boolean;
  readonly arrivalDelaySeconds: number;
  readonly margin: number;
  readonly check: CheckEmission;
}

/**
 * §7.3 step 1 verbatim: `d100 + (Centre Awareness ÷ 5) + (Adjacent OL Awareness
 * ÷ 5)` against `60 + Stunt Complexity`.
 *
 * "Adjacent OL" is the LOOPER'S blocker — the man who has to take the exchange,
 * and the man who is beaten when it fails. The centre's term appears only when
 * the card names one, for the same reason as in §5.3.
 *
 * A stunt whose looper is unblocked to begin with has no adjacent blocker; the
 * roll still happens (the line is still communicating) with whatever terms exist.
 */
export function resolveStuntCommunication(args: {
  readonly tunables: Tunables;
  readonly center: PlayerState | undefined;
  readonly adjacentBlocker: PlayerState | undefined;
  readonly complexity: StuntComplexity;
  readonly penetrator: PlayerId;
  readonly looper: PlayerId;
  readonly stuntRng: Rng;
}): StuntOutcome {
  const t = args.tunables.stunt;
  const target = t.target + t.complexity[args.complexity];

  const modifiers = compact([
    args.center === undefined
      ? undefined
      : actorAttrModifier(args.center, "Awareness (stunt call)", ATTR.awareness, t.attrDivisor),
    args.adjacentBlocker === undefined
      ? undefined
      : actorAttrModifier(args.adjacentBlocker, "Awareness (exchange)", ATTR.awareness, t.attrDivisor),
  ]);

  const roll = rollD100(args.stuntRng.fork(`${String(args.looper)}:stunt`), modifiers);
  const margin = roll.total - target;
  const band = bandFor(t.bands, margin);

  const actors: PlayerId[] = compactIds([
    args.center?.bio.id,
    args.adjacentBlocker?.bio.id,
    args.penetrator,
    args.looper,
  ]);

  return {
    band: band.label,
    passedOff: band.passedOff,
    arrivalDelaySeconds: band.arrivalDelaySeconds,
    margin,
    check: {
      checkKind: "stunt_communication",
      actors,
      roll,
      target,
      tier: tierFor(args.tunables, margin),
      band: band.label,
      margin,
      testsAttrs: [ATTR.awareness],
    },
  };
}

function compactIds(ids: readonly (PlayerId | undefined)[]): PlayerId[] {
  return ids.filter((id): id is PlayerId => id !== undefined);
}
