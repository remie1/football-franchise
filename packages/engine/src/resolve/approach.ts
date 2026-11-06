/**
 * ADR-089 step 1 — §4.0'S APPROACH CARD (`pocket-1` only; published as `RUSH_THREAT.approach`, P4).
 *
 * How a rusher got to the quarterback: FREE (nobody laid a hand on him), ARC (round the corner),
 * THROUGH (straight through), PUSH (a bull rush, still engaged), or BLOCKED (still in his block,
 * never a threat). CHOSEN rules over facts the engine already holds, applied in the card's own
 * row order, the first row that fits (ADR-089 §4.0; the same table, row for row, as calibration's
 * step-0 derivation, `packages/calibration/src/pocket/approach.ts`):
 *
 *  1. completely unblocked and not a looper: origin UNBLOCKED, or a pickup BLOWN_UP → FREE;
 *  2. a looper the line never touched (LOOPER_FREE), and a twist's penetrator → THROUGH; a
 *     penetrator whatever his own threat's origin once row 1 does not fit, so row 3 never reaches
 *     him;
 *  3. a man somebody got a hand on (RAN_THROUGH, LATE_EXCHANGE) → ARC if EDGE, THROUGH if INTERIOR
 *     (at step 1 with today's time: step 3 changes his timing, not his label, ADR-089:397);
 *  4. a won rep, move SPEED or FINESSE, EDGE → ARC;
 *  5. a won rep, move POWER, latent margin in the card's PUSH range (1 to 14) → PUSH: under shape S
 *     the range alone; under shape L the range AND a rep that reported BLOCKER_BEATEN before it
 *     reported RUSHER_WINS_REP (ADR-089 Appendix F, F1 option (b): §4.0's row, the L sentence at
 *     ADR-089:393 and :1003, and the owner note that a dominant bull rusher, 15 or more, is THROUGH);
 *  6. any other won rep (under L, also a POWER rep of 15 or more, or one with no BEATEN tick before
 *     its win) → THROUGH, or ARC if EDGE;
 *  7. a matchup not beaten → BLOCKED (never on a threat: the threat field excludes it by type).
 *
 * Computed ONCE, when a threat is built, and only when the approach card is present
 * (`sim/pocketRules.ts`): under `legacy` this file is never called and no threat has the key.
 */
import type { RushApproach, ThreatOrigin } from "@ff/contracts";
import type { ThreatApproach } from "../events.js";
import type { ApproachTunables } from "../tunables.js";
import type { RunSide, RushAlignment, RushMove } from "../types.js";
import type { RushThreat } from "./rushThreat.js";

/** The pickup and stunt bands §4.0 names (`blitzPickup.bands`, `stunt.bands`). */
export const PICKUP_FREE_BAND = "BLOWN_UP";
export const PICKUP_TOUCHED_BAND = "RAN_THROUGH";
export const LOOPER_FREE_BAND = "LOOPER_FREE";
export const LOOPER_TOUCHED_BAND = "LATE_EXCHANGE";

/** Which block clock the play runs: the PUSH row reads the margin under S, the margin and the BEATEN tick under L. */
export type BlockClockShape = "S" | "L";

export interface ApproachFacts {
  /** False for a matchup the play has not beaten (no threat for him). */
  readonly threat: boolean;
  readonly origin?: ThreatOrigin;
  /** For PICKUP_LOST and STUNT_LOOPER: the band of the CHECK the threat's `rollRef` names. */
  readonly band?: string;
  /** The rusher's own alignment, as `PLAY_START.defense.rush` publishes it. */
  readonly alignment: RushAlignment;
  readonly move: RushMove;
  /** For WON_REP: the `pass_rush_rep` margin (rusher total − blocker total). */
  readonly repMargin?: number;
  /** For WON_REP under shape L: whether the matchup reported BLOCKER_BEATEN before its win (with the range, row 5). */
  readonly beatenSeen?: boolean;
  /** Named as a penetrator by one of the play's stunts (`PLAY_START.defense.stunts`). */
  readonly penetrator: boolean;
}

const byAlignment = (alignment: RushAlignment): ThreatApproach => (alignment === "EDGE" ? "ARC" : "THROUGH");

/** §4.0's card on one rusher's facts. Throws on a fact the card cannot read (a band it does not name). */
export function approachOf(facts: ApproachFacts, shape: BlockClockShape, card: ApproachTunables): RushApproach {
  if (!facts.threat) return "BLOCKED";
  const { origin, band, alignment, move } = facts;
  switch (origin) {
    case "UNBLOCKED":
      return "FREE";
    case "PICKUP_LOST":
      if (band === PICKUP_FREE_BAND) return "FREE";
      if (band !== PICKUP_TOUCHED_BAND) {
        throw new Error(`@ff/engine: a PICKUP_LOST threat with band ${String(band)}; §4.0 reads ${PICKUP_FREE_BAND} or ${PICKUP_TOUCHED_BAND}`);
      }
      // Row 2 before row 3: a touched man who is also a twist's penetrator is the penetrator.
      return facts.penetrator ? "THROUGH" : byAlignment(alignment);
    case "STUNT_LOOPER":
      if (band === LOOPER_FREE_BAND) return "THROUGH";
      if (band !== LOOPER_TOUCHED_BAND) {
        throw new Error(`@ff/engine: a STUNT_LOOPER threat with band ${String(band)}; §4.0 reads ${LOOPER_FREE_BAND} or ${LOOPER_TOUCHED_BAND}`);
      }
      return facts.penetrator ? "THROUGH" : byAlignment(alignment);
    case "WON_REP": {
      if (facts.penetrator) return "THROUGH";
      if (alignment === "EDGE" && (move === "SPEED" || move === "FINESSE")) return "ARC";
      if (move === "POWER") {
        const m = facts.repMargin;
        if (m === undefined) throw new Error("@ff/engine: a POWER won rep needs its pass_rush_rep margin");
        const inRange = m >= card.pushMinMargin && m <= card.pushMaxMargin;
        // Shape S: the range alone. Shape L: the range and BLOCKER_BEATEN before the win (ADR-089
        // Appendix F, F1 option (b)); a POWER rep of 15 or more, or one never BEATEN first, is row 6.
        if (inRange && (shape === "S" || facts.beatenSeen === true)) return "PUSH";
      }
      return byAlignment(alignment);
    }
    case undefined:
      throw new Error("@ff/engine: a threat needs its origin for the approach card");
  }
  throw new Error(`@ff/engine: an origin §4.0 does not name: ${String(origin)}`);
}

/**
 * The approach a THREAT carries: §4.0's card on facts that are a threat's, narrowed to the
 * published type. BLOCKED here would be a threat labelled "still in his block", which the card
 * cannot give for `threat: true`, so it throws rather than storing it.
 */
export function threatApproachOf(
  facts: Omit<ApproachFacts, "threat">,
  shape: BlockClockShape,
  card: ApproachTunables,
): ThreatApproach {
  const label = approachOf({ ...facts, threat: true }, shape, card);
  if (label === "BLOCKED") throw new Error("@ff/engine: the approach card labelled a threat BLOCKED");
  return label;
}

/**
 * `threat` carrying `approach`, or `threat` itself (the same reference) when there is none, so a
 * legacy threat never has the key.
 */
export function withApproach(threat: RushThreat, approach: ThreatApproach | undefined): RushThreat {
  return approach === undefined ? threat : { ...threat, approach };
}

/**
 * ADR-089 step 3, D16 (`pocket-1.s3` only; plan §2.3): the side a free runner's threat comes from.
 * His own card side; a looper's is his partner's, because he crosses to the partner's spot and runs
 * from it (`resolve/freeRun.ts`). The partner is the twist's penetrator, or, on a looper record a
 * passed-off twist carried to another man, the man it was carried from.
 *
 * Never defaulted: a side the card did not state stays `undefined`, and a looper whose partner has
 * none has none, whatever his own (the guessed geometry ADR-018's petition 2 removed). Engine-internal:
 * it rides on the threat (`RushThreat.side`) and nothing reads it at step 3.
 */
export function threatSideOf(a: {
  readonly side: RunSide | undefined;
  readonly loop?: { readonly partnerSide: RunSide | undefined };
}): RunSide | undefined {
  return a.loop === undefined ? a.side : a.loop.partnerSide;
}

/** ADR-089 step 3 (E5): where a threat comes at the passer from, §4.0's from-class. */
export type FromClass = "FRONT" | "SIDE";

/**
 * ADR-089 step 3 (E5; plan §2.5): the from-class of a published approach on the rusher's
 * alignment, the one every row of §4.0's card gives with that approach: ARC from the SIDE; THROUGH
 * from the FRONT; FREE and PUSH from the FRONT if INTERIOR and the SIDE if EDGE (calibration's
 * `fromOfApproach`, `packages/calibration/src/pocket/approach.ts`, value for value). It differs
 * from the alignment only for an EDGE man coming THROUGH (a looper the line never touched, a twist's
 * penetrator). Read only by the climb lane rule FRONT
 * (`pocket.climbLane`, `resolve/pocketMovement.ts`); never called under `legacy`, s1 or s2.
 */
export function fromOf(approach: ThreatApproach, alignment: RushAlignment): FromClass {
  switch (approach) {
    case "ARC":
      return "SIDE";
    case "THROUGH":
      return "FRONT";
    case "FREE":
    case "PUSH":
      return alignment === "EDGE" ? "SIDE" : "FRONT";
  }
}
