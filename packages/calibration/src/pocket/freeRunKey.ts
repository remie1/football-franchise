/**
 * AM-2'S KEY: WHO IS ON THE FREE-RUN CLOCK UNDER AN ARM'S OWN READING (ADR-089 step 3, plan §2.7;
 * AM-2's `freeRunKey`, `toucher` and `untouchedExchange`; D19).
 *
 * At step 3 "free runner" in the miss rule's split (n, f, the quick split, the quick share's origin)
 * means a man on the free-run clock under the arm's own reading: D19 on the design (reading B, the
 * men nobody touched, narrowed by an arm's `origins`); every free runner under reading C; UNBLOCKED
 * and a looper with no blocker under reading A. An arm with no free-run block (legacy, s1, s2, and
 * the step-3 arms without one) is read by D19, reading B over all three origins. The origin-keyed
 * figures (step 0's: any threat of an origin other than WON_REP) are printed beside, unchanged.
 *
 * Read from the stream only, as the engine's `sim/freeRunTiming.ts` decides it from its plans:
 *  - **Touched** (D19): a record whose band is RAN_THROUGH or LATE_EXCHANGE, and somebody's hand
 *    was on him. The hand on a pickup is the `blitz_pickup` CHECK's first actor (actors are
 *    `[blocker, rusher]`; a pickup always names its back). The hand on a stunt is the looper's
 *    blocker, read from the `stunt_communication` CHECK's actors alone (`resolve/blitz.ts`: they
 *    are compacted, `[center?, adjacent blocker?, penetrator, looper]`, the center named exactly
 *    when the call's protection scheme names one, which `PLAY_START.offense.protectionScheme.center`
 *    echoes): with two men before the pair the second is the hand; with one, he is the hand unless
 *    he is that center; with none there is no hand. The roll's modifiers are never read for it:
 *    `compact` drops a modifier whose value is 0, so a blocker whose Awareness rounds to 0 at the
 *    divisor (Awareness 0 to 2) is named in the actors and carries no "Awareness (exchange)"
 *    modifier (review CT-F1). A LATE_EXCHANGE with no hand is AM-2's untouched exchange.
 *  - **The origin an arm's `origins` names him by**: UNBLOCKED; PICKUP_LOST is BLOWN_UP's;
 *    STUNT_LOOPER is LOOPER_FREE's (the untouched exchange with it, AM-2).
 *
 * A record carried by a passed-off twist keeps its CHECK, so its touch is the CHECK's, whoever
 * carries it. Nothing here plays a game or reads a die.
 */
import type { FreeRunOrigin, FreeRunReading } from "./rules.js";
import type { Tunables } from "@ff/engine";

/** Whom the free-run clock times on an arm: its reading, and the origins a reading-B arm narrows it to. */
export interface ClockKey {
  readonly reading: FreeRunReading;
  /** Reading B's origins; absent is all three. */
  readonly origins?: readonly FreeRunOrigin[];
  /** The arm carries no free-run block: D19 reads it (reading B, all three origins). */
  readonly d19: boolean;
}

/** D19's key: reading B over all three origins (an arm with no free-run block). */
export const D19_KEY: ClockKey = Object.freeze({ reading: "B", d19: true });

/** The key of an arm's tunables: its free-run block's reading and origins, else D19's. */
export function clockKeyOf(tunables: Tunables): ClockKey {
  const f = tunables.blitzPickup.freeRun;
  if (f === undefined) return D19_KEY;
  return Object.freeze({ reading: f.reading, ...(f.origins === undefined ? {} : { origins: Object.freeze([...f.origins]) }), d19: false });
}

/** A pickup or stunt CHECK as the key reads it. */
export interface TouchingCheck {
  readonly checkKind: string;
  readonly actors: readonly unknown[];
  readonly band?: string | undefined;
  readonly roll?: { readonly modifiers: readonly unknown[] } | undefined;
}

/** What a pickup or stunt CHECK says of the man its record frees: his band, and whose hand, if any, was on him. */
export interface Touch {
  readonly checkKind: "blitz_pickup" | "stunt_communication";
  readonly band: string | undefined;
  /** The back the pickup assigned, or the looper's blocker; absent when nobody's hand was on him. */
  readonly hand: string | undefined;
}

/**
 * The center a stunt CHECK names first: `PLAY_START.offense.protectionScheme.center`, the call's
 * scheme echoed (ADR-073 §2.8), which is the `PreSnapRead.center` the engine hands
 * `resolveStuntCommunication`; `undefined` when the call states no scheme or no center (and for any
 * payload that is not a pass play's start).
 */
export function centerOfPlayStart(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const offense = (payload as { readonly offense?: unknown }).offense;
  if (typeof offense !== "object" || offense === null) return undefined;
  const scheme = (offense as { readonly protectionScheme?: unknown }).protectionScheme;
  if (typeof scheme !== "object" || scheme === null) return undefined;
  const center = (scheme as { readonly center?: unknown }).center;
  return center === undefined || center === null ? undefined : String(center);
}

/** `centerOfPlayStart` on the first `PLAY_START` among a play's events (`undefined` when there is none). */
export function centerOfEvents(events: readonly { readonly event: { readonly type: string; readonly payload?: unknown } }[]): string | undefined {
  const start = events.find((e) => e.event.type === "PLAY_START");
  return start === undefined ? undefined : centerOfPlayStart(start.event.payload);
}

/**
 * The touch a pickup or stunt CHECK records; `undefined` for any other CHECK. `center` is the play's
 * `centerOfPlayStart` (required, never defaulted: a stunt's hand cannot be read without it).
 */
export function touchOfCheck(c: TouchingCheck, center: string | undefined): Touch | undefined {
  if (c.checkKind === "blitz_pickup") {
    const hand = c.actors[0];
    return { checkKind: c.checkKind, band: c.band, hand: hand === undefined ? undefined : String(hand) };
  }
  if (c.checkKind === "stunt_communication") {
    // [center?, adjacent blocker?, penetrator, looper]: the men before the pair are the center (when
    // the call names one) and the looper's blocker (when he had one), in that order.
    const lead = c.actors.slice(0, -2).map(String);
    let hand: string | undefined;
    if (lead.length >= 2) hand = lead[1];
    else if (lead.length === 1 && lead[0] !== center) hand = lead[0];
    return { checkKind: c.checkKind, band: c.band, hand };
  }
  return undefined;
}

/** The bands a touched man got through (D19): a pickup's RAN_THROUGH, a stunt's LATE_EXCHANGE. */
export const TOUCHED_BANDS: ReadonlySet<string> = new Set(["RAN_THROUGH", "LATE_EXCHANGE"]);

/** Somebody laid a hand on him (D19; AM-2's untouched exchange is not touched). */
export function isTouched(touch: Touch | undefined): boolean {
  return touch !== undefined && touch.hand !== undefined && touch.band !== undefined && TOUCHED_BANDS.has(touch.band);
}

/** The origin a reading-B arm's `origins` names a threat by, or `undefined` for WON_REP (never on the clock). */
export function clockOriginOf(origin: string): FreeRunOrigin | undefined {
  switch (origin) {
    case "UNBLOCKED":
      return "UNBLOCKED";
    case "PICKUP_LOST":
      return "BLOWN_UP";
    case "STUNT_LOOPER":
      return "LOOPER_FREE";
    default:
      return undefined;
  }
}

/**
 * Whether a threat of `origin`, whose record the CHECK `touch` made (none for UNBLOCKED), is on the
 * free-run clock under `key`: the engine's `timeFreeRunners` rule, from the stream.
 */
export function onClockUnder(key: ClockKey, origin: string, touch: Touch | undefined): boolean {
  const named = clockOriginOf(origin);
  if (named === undefined) return false;
  switch (key.reading) {
    case "B":
      return !isTouched(touch) && (key.origins === undefined || key.origins.includes(named));
    case "C":
      return true;
    case "A":
      return touch?.hand === undefined;
    default: {
      const unhandled: never = key.reading;
      throw new Error(`freeRunKey: no reading ${String(unhandled)}`);
    }
  }
}
