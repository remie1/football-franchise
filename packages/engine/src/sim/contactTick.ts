/**
 * ADR-089 step 4 — THE PIECES OF A CONTACT TICK THAT NEED NO DIE (plan §2.2 items 2, 5 and 6; §4.5;
 * `pocket-1` from `pocket-1.s4` only).
 *
 * `simulatePassPlay` calls these only when the play's rules carry a step-4 block, so under `legacy`,
 * s1, s2 and s3 none of them runs (P-18 counts them). Each is pure:
 *  - `arrivedInGridOrder`: the threats ARRIVED on the half-second grid at a tick, in the order
 *    contacts on a held ball resolve (`nearestThreat`'s: `etaTick`, the priority alignment, the lower
 *    PlayerId; AM-7 item 8);
 *  - `shedDelaySecondsOf`: how far a shed puts him back (§4.5 item 4 and "after a shed"): a PUSH
 *    `pushShedDelaySeconds` (1.0 s, his threat kept, still engaged), every other approach
 *    `shedDelaySeconds` (0.5 s); BLOCKED makes no contact before step 6;
 *  - `onFreeRunClockAtSnap`: AM-2's key for the free-run tilt, from the man's own timing record,
 *    never from his label;
 *  - `rebuiltTick`: §4.5 item 6's rebuild, after any shed in the tick: the threat list, its minimum
 *    time to arrival, the pocket status on it and what forces him (the move branch's gate), so the
 *    move branch reads the threats as they now stand (fixing the stale list of today's tick).
 */
import type { PlayerId } from "@ff/contracts";
import { forcesDecision, mustActThreat, pocketStatusFor } from "../resolve/pocket.js";
import type { PocketStatusRung } from "../resolve/pocket.js";
import { inGridOrder } from "../resolve/contact.js";
import type { ArrivalClock } from "../resolve/rushThreat.js";
import { minTimeToArrival } from "../resolve/rushThreat.js";
import type { ThreatApproach } from "../events.js";
import type { ContactTunables, Tunables } from "../tunables.js";
import type { PassRushBandLabel } from "../resolve/passRush.js";
import type { PocketForcing } from "./pocketRules.js";
import type { FreeRunner } from "./preSnap.js";

/** The threats ARRIVED at `tick` (`etaTick <= tick`), in the grid's order. A new array. */
export function arrivedInGridOrder<T extends ArrivalClock>(threats: readonly T[], tick: number, tunables: Tunables): T[] {
  return inGridOrder(
    threats.filter((t) => t.etaTick <= tick),
    tunables.arrival.simultaneousArrivalPriority,
  );
}

/** The DELAYED wait a shed puts on his existing threat, by his approach. */
export function shedDelaySecondsOf(approach: ThreatApproach, contact: ContactTunables): number {
  return approach === "PUSH" ? contact.pushShedDelaySeconds : contact.shedDelaySeconds;
}

/** The bands a touched man got through (D19): a pickup's RAN_THROUGH, a stunt's LATE_EXCHANGE. */
const TOUCHED_BANDS: ReadonlySet<string> = new Set(["RAN_THROUGH", "LATE_EXCHANGE"]);

/**
 * Whether a free runner's record at the snap puts him on the free-run clock under the arm's reading
 * (AM-2's `freeRunKey`, AM-7 item 6):
 *  - with a free-run block, the timing pass's own answer (`FreeRunner.onClock`, the arm's reading B,
 *    C or A and its origins);
 *  - with none, D19 (reading B over all three origins): UNBLOCKED; a BLOWN_UP pickup; a LOOPER_FREE
 *    stunt; and a LATE_EXCHANGE nobody touched (the untouched exchange), which only the timing pass
 *    can tell (`FreeRunner.toucher`): without it (a bundle with no step-3 block, kind T) a
 *    LATE_EXCHANGE reads as touched.
 */
export function onFreeRunClockAtSnap(free: FreeRunner, hasFreeRunBlock: boolean): boolean {
  if (hasFreeRunBlock) return free.onClock === true;
  if (free.band === undefined) return free.origin === "UNBLOCKED";
  if (!TOUCHED_BANDS.has(free.band)) return true;
  return free.band === "LATE_EXCHANGE" && free.onClock !== undefined && free.toucher === undefined;
}

/** What the pocket status was set from at the top of the tick, besides the threat list. */
export interface TickStatusInputs {
  /** The highest counter pressure, as the tick's `POCKET_STATUS` read it. */
  readonly highest: number;
  /** The band-floor inputs, as the tick's `POCKET_STATUS` read them. */
  readonly previousBands: readonly PassRushBandLabel[];
}

export interface RebuiltTick<T extends ArrivalClock> {
  readonly threats: T[];
  readonly minTta: number | undefined;
  readonly pocket: PocketStatusRung;
  readonly forced: boolean;
}

/**
 * The tick after a shed (§4.5 item 6): the live threats as they now stand, and the status and
 * forcing they give. The counter and band-floor inputs stay the tick's own (the shed moved threats,
 * not pressure); the status is the one the move branch reads and is not published again (a tick has
 * one `POCKET_STATUS`).
 */
export function rebuiltTick<T extends ArrivalClock>(args: {
  readonly tunables: Tunables;
  readonly live: readonly T[];
  readonly tick: number;
  readonly status: TickStatusInputs;
  readonly forcing: PocketForcing;
}): RebuiltTick<T> {
  const threats = [...args.live];
  const minTta = minTimeToArrival(threats, args.tick);
  const pocket = pocketStatusFor(args.tunables, args.status.highest, args.status.previousBands, minTta);
  const forced = args.forcing === "PER_RUSHER" ? mustActThreat(args.tunables, minTta, minTta) : forcesDecision(args.tunables, pocket);
  return { threats, minTta, pocket, forced };
}

/** A rusher's id as the book and the sets key it. */
export const keyOf = (id: PlayerId): string => String(id);
