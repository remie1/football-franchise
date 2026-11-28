/**
 * ADR-089 step 6 (the outs; step-6 plan §2; the readings AM-13 is to file before step 6's first arm,
 * not filed yet): THE OUTS, AS PURE FUNCTIONS.
 *
 * Every function here is called by `sim/passPlay.ts` only behind `rules.outs !== undefined` (the
 * `pocket.outs` block, `sim/pocketRules.ts`), and each only behind its own part's leaf. Only a
 * `pocket-1` bundle of shape S or L can carry the block, and while petitions P9 to P12 are not in
 * contracts every tree carrying it is refused before the first die (`step6Gate`), so tests reach
 * these through `pocketRulesUnder` and `simulatePassPlayWith` with their own petitions set. Under
 * `legacy`, every `pocket-1.s1` to `.s5a` bundle and kind T none of them is called, so their plays
 * run today's code path (P-18's spies, `test/pocketLegacyIsolation.test.ts`); nor is any called
 * under a block with every part off, which plays step 5a's outs (P-18b).
 *
 * Part by part (the plan's numbers):
 *
 * - **2.1 The real throwaway rule** (`throwawayLegalInPocket`; AM-13 `throwawayRule`, CHOSEN): in
 *   the pocket a throwaway is legal at or past the drop floor on a tick on which a route has reached
 *   its break, in place of the 2.0 s gate (`qb.throwawayEarliestSeconds`), at the forced pick and on
 *   the CLOCK_EXPIRED path. A throwaway with a hand on him is the contact choice, step 7's, so under
 *   the rule none comes on a tick that ran an arrival contest (the call site's clause, S-15). There
 *   is still no clean throwaway in the pocket (§4.6 c): the clean pick never offers one. Out of the
 *   pocket a throwaway is legal at the deadline pick by construction (2.11). Under the rule and
 *   under the deadline pick every throwaway carries `THROWAWAY.outsideTackleBox` (P10), false in the
 *   pocket (the call site).
 * - **2.2 The scramble start** (`scrambleStartYards`, `scrambleRunYards`; AM-13 `scrambleStart`, by
 *   the owner's answer, `ZERO_GAIN_ONLY` recommended and each bundle's default until then): under
 *   `ZERO_GAIN_ONLY` a scramble run that gains nothing ends where he is, at minus the card's
 *   `dropDepthYards` (5.0 shotgun, 7.0 under center, D22), its zone events the run as played; under
 *   `EVERY_RUN` every run starts there. The run's dice do not change.
 * - **2.3 The escape cap and the spent case** (`escapeRollSpends`, `escapeLeft`, `spentBranch`;
 *   AM-13 `escapeCap`, CHOSEN, and `spentChecklist`, by the owner's answer, `HOLD` recommended and
 *   each bundle's default until then): one escape roll a play, forced or clean, so once a `scramble`
 *   CHECK is drawn ESCAPE is offered at no later pick (`rankResponses`' `escapeAvailable` at the
 *   forced pick, the clean pick's `escapeOffered` at the call site). On a clean expiry with his move
 *   used or not offered and his escape spent, the clean pick offers nothing, and the call site runs
 *   the answer's branch.
 * - **2.4 Pursuer speed and Mobility's weight** (`cardSidesAtSnap`, `breakSide`, `escapeTermsOf`;
 *   AM-13 `pursuit`, CHOSEN): the escape target gains `round((S - 70) / 5)`, S the highest Speed
 *   among the card rushers on the side he breaks to, live or blocked (0, and nobody read, when that
 *   side holds none), and that man joins the `scramble` CHECK's actors with Speed in its
 *   `testsAttrs`; the roll's Mobility term becomes `round(Mobility / 10)` plus a flat 7 named
 *   "Mobility centering", so a 70 quarterback's roll is where it was. The side is D15's (2.6),
 *   computed when no part publishes it.
 * - **2.5 No late horizon sack** (`horizonDeadline`, `runsPastLastTick`; AM-13 `horizon`, CHOSEN):
 *   the pursuit deadline is the later of the escape tick plus one tick step and the earlier of the
 *   escape tick plus `pursuitSeconds` and the last tick, and the play runs one tick past the last
 *   only for a live scramble whose deadline is past it, so no escape runs off the clock into the
 *   horizon coverage sack.
 * - **2.6 Escape direction** (`breakSide`, `cardSidesAtSnap`; D15, D16; P11): the side he breaks
 *   to, by the first of D15's four rules that decides it, each man's side his matchup's card side
 *   and a looper's his partner's (D16, read once at the snap). No die. Published as
 *   `QB_DECISION.direction` (P11, the engine's stand-in until the lift) on the SCRAMBLE of an escape
 *   he won and on the HOLD of one he was contained on, nowhere else: a caught escape publishes no
 *   decision (its contact names the man, 2.8), and the deadline's SCRAMBLE carries none, because he
 *   is already running that way. Alone nothing reads the side, so the stream is step 5a's apart from
 *   the direction.
 * - **2.7 The side-aware catch** (`sideCatchOf`, `sideCatcherOf`; AM-13 `sideCatch`, the 10 and 15
 *   CHOSEN in the design; it needs 2.6's direction): the escape target's EDGE term gives way to 10
 *   for each live threat on the side he breaks to and 15 for each unregistered man there, a card
 *   rusher on that side still in his block whom he had not checked by the band of the pick that
 *   offered the escape (SOUND none, RUSHED the EDGE men, PANICKED all); the blocked men there join the
 *   roll's actors; and a caught escape's catcher is the first unregistered man there, else the
 *   nearest live threat there, else today's man. Without the caught escape as contact (2.8) a blocked
 *   man's catch is a sack that names nobody.
 * - **2.8 The caught escape as contact** (`caughtFactsOf`, `caughtContestForm`, `caughtEscapeContest`,
 *   `caughtHitOf`, `caughtShedDelaySeconds`; AM-13 `caughtAsContact`, P20; `caughtSeen` by the owner's answer, `SEEN`
 *   recommended and each bundle's default until then, `UNSEEN_IF_UNREGISTERED` behind P21): a caught
 *   escape that names a man is step 4's contest with him on P6's labels, the rated contest before
 *   the play's first shed and the second arrival after it, with step 4's tilt for the catch's tilt
 *   class; its `QB_HIT` (P7) has phase SACK or SHED, approach BLOCKED only for a blocked catcher, from
 *   his approach (a blocked man's from his alignment), `contactSeconds` the catch tick and `seen` by
 *   the answer. The facts are built at the escape site, never from step 4's `contactFactsOf` or the
 *   contact book, which throw for a man with no approach or no entry. The call site draws the faces
 *   and keeps the label rule (no die when that man's label was drawn on that tick: the catch is his
 *   sack). On a shed a live man's threat goes back by his approach, as step 4's, and a blocked man
 *   stays in his block. A catch that names nobody stays today's sack with no sacker.
 * - **2.12 The failed scramble scored as a sack** (AM-13 `rescoring`) has no function here: the
 *   call site writes `PLAY_START.scoring` under `failedScrambleSack`, and every reader keys the rule
 *   on that marker (`stats/statline.ts` in the engine).
 *
 * No die is drawn here: where a part rolls (2.8's contest), the call site draws the faces on the
 * play's labels and hands them in.
 */
import { getAttr } from "@ff/contracts";
import type { PlayerId, PlayerState } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import { ARRIVAL_CONTEST_KIND } from "../events.js";
import type { ArrivalContestEmission, QbHitRecord } from "../events.js";
import { threatSideOf } from "../resolve/approach.js";
import { arrivalContest, contactFrom, secondArrival, tiltOf } from "../resolve/contact.js";
import type { ContactFacts } from "../resolve/contact.js";
import { nearestThreat, timeToArrival } from "../resolve/rushThreat.js";
import type { ArrivalClock, RushThreat } from "../resolve/rushThreat.js";
import type { ScrambleTerms } from "../resolve/scramble.js";
import type { PocketMovementBandLabel } from "../resolve/pocketMovement.js";
import { tierFor } from "../rolls.js";
import type { CaughtSeen, ContactTunables, EscapeCapTunables, OutsTunables, ScrambleStart, SideCatchTunables, Tunables } from "../tunables.js";
import type { RunSide, RushAlignment } from "../types.js";
import { onFreeRunClockAtContact, shedDelaySecondsOf } from "./contactTick.js";
import { loopPartnersAtSnap } from "./freeRunTiming.js";
import type { LineGamesReplayInput } from "./freeRunTiming.js";

// ---- 2.1 the real throwaway rule ---------------------------------------------------------------

/** A receiver's route as the throwaway rule reads it (read only). */
export interface BreakTrack {
  /** Set once his rep resolved (his break, or an anticipation that turned him loose early). */
  readonly baseOpenness: number | undefined;
  /**
   * His depth class's ready time with any jam delay: QUICK 1.0, SHORT 1.5, INTERMEDIATE 2.0 and
   * DEEP 2.5 s unjammed (MEASURED, `tunables.ts` `route.readySeconds`).
   */
  readonly readySeconds: number;
}

/** What `throwawayLegalInPocket` reads, every value the tick's own. */
export interface ThrowawayFacts {
  readonly tick: number;
  /** The play's drop floor, 0 when there is none (no floor in the bundle, no first read, or a screen). */
  readonly floorSeconds: number;
  /** Every route the play runs (the eligible receivers). */
  readonly tracks: readonly BreakTrack[];
}

/**
 * 2.1 (AM-13 `throwawayRule`, CHOSEN): a throwaway in the pocket is legal on a tick at or past his
 * drop floor (where the call has one) on which at least one eligible receiver's route has reached
 * its break: the window bump's own test (`sim/cleanPocket.ts`'s `bumpFor`), his rep resolved and the
 * tick at or past his ready time. It stands in for the NFL's receiver-in-the-area test; where the
 * ball lands is not checked. A man an anticipation turned loose before his ready time has not
 * reached his break. The floor binds the throwaway as it binds aimed throws. Exported for step 7's
 * contact choice, which reads it with a hand on him.
 */
export function throwawayLegalInPocket(f: ThrowawayFacts): boolean {
  return f.tick >= f.floorSeconds && f.tracks.some((t) => t.baseOpenness !== undefined && f.tick >= t.readySeconds);
}

// ---- 2.2 the scramble start --------------------------------------------------------------------

/**
 * 2.2 (AM-13 `scrambleStart`, by the owner's answer): where a scramble run starts, passed to
 * `advanceCarrier` as its start. Under `EVERY_RUN` (the design's words, "The run starts where he
 * is", ADR-089:727, :755) every run starts at minus the card's `dropDepthYards`, so its zone events
 * count from there and a tackle in the first zone can end behind the line. Under `ZERO_GAIN_ONLY`
 * the run starts at the line, as today: `undefined`, no start.
 */
export function scrambleStartYards(start: ScrambleStart, dropDepthYards: number): number | undefined {
  return start === "EVERY_RUN" ? -dropDepthYards : undefined;
}

/**
 * 2.2: a scramble run's yards as `RUN_RESOLUTION.yards` and the play's result carry them. Under
 * `ZERO_GAIN_ONLY` (the design's pricing of the clause it grades, "zero-yard scrambles rescored",
 * ADR-089:754, :774) a run that gains nothing (0 yards or fewer) ends where he is, at minus the
 * card's `dropDepthYards`, and every other run keeps its yards; its zone events stay the run as
 * played (zone 1, 0 yards), as a designed run's tackle for loss breaks the zone sum. Under
 * `EVERY_RUN` the run's own yards, already counted from his start.
 */
export function scrambleRunYards(start: ScrambleStart, dropDepthYards: number, runYards: number): number {
  return start === "ZERO_GAIN_ONLY" && runYards <= 0 ? -dropDepthYards : runYards;
}

// ---- 2.3 the escape cap and the spent case -----------------------------------------------------

/**
 * 2.3 (AM-13 `escapeCap`): whether an escape roll of this band spends the play's escape. Every roll
 * does, but under `CONTAINED_DOES_NOT_SPEND`, where a CONTAINED roll does not (CLEAN_ESCAPE, ESCAPED
 * and CAUGHT_FROM_BEHIND do), so ESCAPE is offered again at a later pick.
 */
export function escapeRollSpends(cap: EscapeCapTunables, band: string): boolean {
  return cap.whenSpent !== "CONTAINED_DOES_NOT_SPEND" || band !== "CONTAINED";
}

/**
 * 2.3: whether ESCAPE may be offered at a pick, forced or clean, after `spent` escape rolls that
 * spent the escape: fewer than the cap's one a play (`maxPerPlay`).
 */
export function escapeLeft(cap: EscapeCapTunables, spent: number): boolean {
  return spent < cap.maxPerPlay;
}

/**
 * 2.3: what the call site does in the spent case. `HOLD`: no die, no throwaway, no CLOCK_EXPIRED, and
 * he keeps reading. `TODAYS_PATH`: no die, and the path after the pick runs as today (a
 * CLOCK_EXPIRED throwaway where the throwaway rule, or without it the 2.0 s gate, allows one, else a
 * hold). `SECOND_ESCAPE`: the clean pick offers ESCAPE once more. `BELOW_30`: no movement die, and
 * today's decision roll on the tick's candidates with no floor, in place of D23's at 30.
 */
export type SpentBranch = "HOLD" | "TODAYS_PATH" | "SECOND_ESCAPE" | "BELOW_30";

/**
 * 2.3 (AM-13 `spentChecklist`, by the owner's answer, the five options of the step-6 filing §4.4):
 * the spent case's branch, after `rolls` escape rolls on the play. Under `SECOND_ESCAPE` the one
 * second escape roll a play may have is offered while the play has drawn no more than the cap's
 * one, and once it is drawn the case holds (CHOSEN: the option names no branch past it, and HOLD
 * keeps the clean pocket's throwaway out as the recommended answer does). Under
 * `CONTAINED_DOES_NOT_SPEND` the one spent case left, a quarterback shed on a caught escape (2.8),
 * holds, as the option states.
 */
export function spentBranch(cap: EscapeCapTunables, rolls: number): SpentBranch {
  switch (cap.whenSpent) {
    case "HOLD":
    case "CONTAINED_DOES_NOT_SPEND":
      return "HOLD";
    case "TODAYS_PATH":
      return "TODAYS_PATH";
    case "SECOND_ESCAPE":
      return rolls <= cap.maxPerPlay ? "SECOND_ESCAPE" : "HOLD";
    case "BELOW_30":
      return "BELOW_30";
  }
}

// ---- 2.4, with 2.6 and 2.7: the side he breaks to -----------------------------------------------

/** One card rusher as `cardSidesAtSnap` reads him: who, and the side his card states. */
export interface CardRusherSide {
  readonly rusher: PlayerId;
  /** `PLAY_START.defense.rush[].side`: `undefined` where the card states none (never defaulted). */
  readonly side: RunSide | undefined;
}

/**
 * 2.4, 2.6, 2.7 (D16; step-6 plan §2.6): every card rusher's side as the side-reading parts read it,
 * keyed by his id: his matchup's card side, and for a man who carries a looper record (STUNT_LOOPER)
 * at the snap his loop partner's (`threatSideOf`, as the timing pass reads it; the partner from
 * `loopPartnersAtSnap`). Read once a play, at the snap, so a looper keeps his partner's side when a
 * later win builds his threat; never from `RushThreat.side` (written for free runners and late
 * blocks only) and never defaulted: a side the card does not state is `undefined`, a looper whose
 * partner has none has none, and such a man never sets a direction or counts on a side.
 */
export function cardSidesAtSnap(a: LineGamesReplayInput & { readonly card: readonly CardRusherSide[] }): ReadonlyMap<string, RunSide | undefined> {
  const partners = loopPartnersAtSnap(a);
  const own = new Map(a.card.map((c) => [String(c.rusher), c.side] as const));
  return new Map(
    a.card.map((c) => {
      const partner = partners.get(String(c.rusher));
      const side = threatSideOf({ side: c.side, ...(partner === undefined ? {} : { loop: { partnerSide: own.get(String(partner)) } }) });
      return [String(c.rusher), side] as const;
    }),
  );
}

/** Which of D15's rules set the side (step-6 plan §2.6). */
export type BreakRule = "SET_OFF" | "NEAREST" | "FEWER" | "PARITY";

/** What `breakSide` reads at an escape roll, every value the tick's own. */
export interface BreakSideFacts {
  readonly tick: number;
  /** The pick that offered ESCAPE was forced (`:movement`); false for a clean break-out (`:clean`). */
  readonly forced: boolean;
  /** The tick's live threats, the list the escape roll is handed. */
  readonly threats: readonly ArrivalClock[];
  /** Every card rusher's side (`cardSidesAtSnap`). */
  readonly sides: ReadonlyMap<string, RunSide | undefined>;
  /** The d100 face of the pick that offered ESCAPE (its `pocket_movement` CHECK's `raw`). */
  readonly pickFace: number;
}

const AWAY: Readonly<Record<RunSide, RunSide>> = { LEFT: "RIGHT", RIGHT: "LEFT" };

/**
 * 2.6 (D15; step-6 plan §2.6): the side he breaks to, by the first rule that decides it:
 *  1. SET_OFF, on a forced pick only: away from the live threats inside must act's half second (D32,
 *     `arrival.collapsingWithinSeconds`) that set the reaction off, when every one of them with a
 *     side is on one side;
 *  2. NEAREST: away from the nearest live threat with a side (`nearestThreat`, its ties by
 *     `arrival.simultaneousArrivalPriority`, then the lower id);
 *  3. FEWER: toward the side with fewer card rushers;
 *  4. PARITY: by the parity of the pick's own d100 face, odd LEFT and even RIGHT (no new die; mirror
 *     balanced in distribution, CHOSEN in the design).
 * A clean break-out has nothing that set it off and starts at rule 2. Sides are `sides`' (D16).
 */
export function breakSide(tunables: Tunables, f: BreakSideFacts): { readonly side: RunSide; readonly rule: BreakRule } {
  const sideOf = (t: ArrivalClock): RunSide | undefined => f.sides.get(String(t.rusher));
  const sided = f.threats.filter((t) => sideOf(t) !== undefined);
  if (f.forced) {
    const setOff = new Set(sided.filter((t) => timeToArrival(t, f.tick) <= tunables.arrival.collapsingWithinSeconds).map(sideOf));
    const [only] = [...setOff];
    if (setOff.size === 1 && only !== undefined) return { side: AWAY[only], rule: "SET_OFF" };
  }
  const nearest = nearestThreat(sided, tunables.arrival.simultaneousArrivalPriority);
  const nearestSide = nearest === undefined ? undefined : sideOf(nearest);
  if (nearestSide !== undefined) return { side: AWAY[nearestSide], rule: "NEAREST" };
  let left = 0;
  let right = 0;
  for (const side of f.sides.values()) {
    if (side === "LEFT") left += 1;
    else if (side === "RIGHT") right += 1;
  }
  if (left !== right) return { side: left < right ? "LEFT" : "RIGHT", rule: "FEWER" };
  return { side: f.pickFace % 2 === 1 ? "LEFT" : "RIGHT", rule: "PARITY" };
}

/** One card rusher as the escape's terms read him at the escape roll. */
export interface CardMan {
  readonly rusher: PlayerState;
  /** His side at the snap (`cardSidesAtSnap`). */
  readonly side: RunSide | undefined;
}

/**
 * 2.4 (AM-13 `pursuit`, CHOSEN) at an escape roll: the terms `resolveScramble` takes (`ScrambleTerms`),
 * or `undefined` when no part that changes the roll is on (so the roll is today's). Under `pursuit`:
 * Mobility's divisor and centering, and the pursuer, the card rusher on `side` (live or blocked)
 * with the highest Speed, ties to card order, with `round((Speed - speedBaseline) / speedDivisor)`
 * on the target; no pursuer when `side` holds no card rusher. `card` is in card order.
 */
export function escapeTermsOf(outs: OutsTunables, side: RunSide, card: readonly CardMan[]): ScrambleTerms | undefined {
  const pursuit = outs.pursuit;
  if (pursuit === undefined) return undefined;
  let pursuer: PlayerState | undefined;
  let speed = Number.NEGATIVE_INFINITY;
  for (const man of card) {
    if (man.side !== side) continue;
    const s = getAttr(man.rusher.attributes.values, ATTR.speed);
    if (s > speed) {
      pursuer = man.rusher;
      speed = s;
    }
  }
  return {
    mobility: { divisor: pursuit.mobilityDivisor, centering: pursuit.mobilityCentering },
    ...(pursuer === undefined
      ? {}
      : { pursuit: { pursuer: pursuer.bio.id, term: Math.round((speed - pursuit.speedBaseline) / pursuit.speedDivisor) } }),
  };
}

// ---- 2.5 no late horizon sack ------------------------------------------------------------------

/**
 * 2.5 (AM-13 `horizon`, CHOSEN): the pursuit deadline under the rule, the later of the escape tick
 * plus one tick step and the earlier of the escape tick plus `scramble.pursuitSeconds` (1.5 s) and
 * the last tick (`clock.maxTick`, 6.0 s), rounded as the tick clock rounds: an escape at 5.0 or
 * 5.5 s reaches it at 6.0 s, and one at 6.0 s at 6.5 s. Without the rule it is `pursuitDeadline`'s,
 * the escape tick plus `pursuitSeconds` whatever the clock, so an escape after 4.5 s runs off the
 * loop's end into the horizon coverage sack. The desperation bar (`pursuitForcesDecision`) reads
 * the same deadline, so it moves with it.
 */
export function horizonDeadline(tunables: Tunables, escapeTick: number): number {
  const nextTick = Number((escapeTick + tunables.clock.tickStepSeconds).toFixed(1));
  const pursuit = Number((escapeTick + tunables.scramble.pursuitSeconds).toFixed(1));
  return Math.max(nextTick, Math.min(pursuit, tunables.clock.maxTick));
}

/**
 * 2.5: whether the play runs `tick`, a tick past the last (`clock.maxTick`): only while a scramble
 * is live (`pursuitAtTick` set) and only up to its deadline. Out of the pocket a tick runs no line
 * battle, no status and no arrival, so that tick runs the scramble's own logic only: his reads, a
 * throw on the run, and the tuck at the deadline.
 */
export function runsPastLastTick(tunables: Tunables, tick: number, pursuitAtTick: number | undefined): boolean {
  return pursuitAtTick !== undefined && tick > tunables.clock.maxTick && tick <= pursuitAtTick;
}

// ---- 2.7 the side-aware catch -------------------------------------------------------------------

/** One card rusher as the side-aware catch reads him at the escape roll. */
export interface CatchMan {
  readonly rusher: PlayerId;
  /** His side at the snap (`cardSidesAtSnap`). */
  readonly side: RunSide | undefined;
  /** The card's alignment, for a man without an arc: INTERIOR is in front of him (FRONT), EDGE beside him (SIDE). */
  readonly alignment: RushAlignment;
  /**
   * Still in his block at the roll: no threat, not named by the roll, and a blocker or a late block on
   * him (the call site's reading). A live threat is never blocked.
   */
  readonly blocked: boolean;
}

/** What `sideCatchOf` reads at an escape roll, every value the tick's own. */
export interface SideCatchFacts {
  /** Every card rusher, in card order. */
  readonly card: readonly CatchMan[];
  /** The tick's live threats, the list the escape roll is handed. */
  readonly threats: readonly ArrivalClock[];
  /** Every card rusher's side (`cardSidesAtSnap`). */
  readonly sides: ReadonlyMap<string, RunSide | undefined>;
  /** The band of the movement roll that offered ESCAPE (the forced `:movement` pick or the `:clean` pick). */
  readonly band: PocketMovementBandLabel;
}

/** The side-aware catch at one escape roll: the roll's side term and actors, and who can catch him unseen. */
export interface SideCatchTerms {
  /** `perLiveThreat` for each live threat on the side, plus `perUnregistered` for each unregistered man there. */
  readonly term: number;
  /** The card rushers on the side still in their blocks, in card order (the CHECK's actors after the threats). */
  readonly blocked: readonly PlayerId[];
  /** Of them, the men he had not checked, in card order (the catcher's first pick, `sideCatcherOf`). */
  readonly unregistered: readonly PlayerId[];
}

/**
 * 2.7 (ADR-089 §4.7, ADR:764-771; the 10 and 15 CHOSEN in the design): the side-aware catch at an
 * escape to `side`. Every live threat is registered until step 7, so the unregistered men are the
 * card rushers on the side still in their blocks whom he had not checked, by the band of the
 * movement roll that offered the escape: SOUND checked them all, RUSHED only the men in front
 * (INTERIOR, the card's rule for a man without an arc; INFERRED, AM-13), so the EDGE men are
 * unregistered, and PANICKED none, so every one is. The term takes the place of the EDGE term on
 * the target. A man whose card states no side is on neither side. No die.
 */
export function sideCatchOf(sideCatch: SideCatchTunables, side: RunSide, f: SideCatchFacts): SideCatchTerms {
  const onSide = (rusher: PlayerId): boolean => f.sides.get(String(rusher)) === side;
  const live = f.threats.filter((t) => onSide(t.rusher)).length;
  const blocked = f.card.filter((m) => m.blocked && onSide(m.rusher));
  const unregistered = blocked.filter((m) => unregisteredUnder(f.band, m.alignment));
  return {
    term: sideCatch.perLiveThreat * live + sideCatch.perUnregistered * unregistered.length,
    blocked: blocked.map((m) => m.rusher),
    unregistered: unregistered.map((m) => m.rusher),
  };
}

/** Whether he had not checked a blocked man of this alignment, by the band of the pick that offered the escape. */
function unregisteredUnder(band: PocketMovementBandLabel, alignment: RushAlignment): boolean {
  switch (band) {
    case "SOUND":
      return false;
    case "RUSHED":
      return alignment === "EDGE";
    case "PANICKED":
      return true;
    default:
      throw new Error(`@ff/engine: the side-aware catch has no reading for the movement band ${String(band satisfies never)}`);
  }
}

/** Who catches him at a CAUGHT_FROM_BEHIND roll under the side-aware catch. */
export type SideCatcher<T extends ArrivalClock> =
  | { readonly kind: "UNREGISTERED"; readonly rusher: PlayerId }
  | { readonly kind: "LIVE"; readonly threat: T }
  | { readonly kind: "NONE" };

/**
 * 2.7 (ADR-089 §4.7): the catcher of a caught escape to `side`, in order: the first unregistered man
 * on the side (card order among the blocked men); else the nearest live threat on the side; else
 * today's rule, the nearest live threat the roll named on either side (`nearestThreat`, its ties by
 * `arrival.simultaneousArrivalPriority`); else nobody (a coverage sack). `live` is the call site's
 * pool, the roll's named threats still live (a man the tick's battle RESET is not in it). No die.
 */
export function sideCatcherOf<T extends ArrivalClock>(
  tunables: Tunables,
  side: RunSide,
  terms: SideCatchTerms,
  live: readonly T[],
  sides: ReadonlyMap<string, RunSide | undefined>,
): SideCatcher<T> {
  const first = terms.unregistered[0];
  if (first !== undefined) return { kind: "UNREGISTERED", rusher: first };
  const priority = tunables.arrival.simultaneousArrivalPriority;
  const threat = nearestThreat(live.filter((t) => sides.get(String(t.rusher)) === side), priority) ?? nearestThreat(live, priority);
  return threat === undefined ? { kind: "NONE" } : { kind: "LIVE", threat };
}

// ---- 2.8 the caught escape as contact ----------------------------------------------------------

/** Who a caught escape's contact is with: a man still in his block (2.7's catcher), or a live threat. */
export type CaughtCatcher =
  | {
      readonly kind: "BLOCKED";
      readonly rusher: PlayerId;
      /** The card's alignment: INTERIOR comes from the FRONT, EDGE from the SIDE. */
      readonly alignment: RushAlignment;
      /** He had not checked this man (2.7): the only catch that can be unseen. */
      readonly unregistered: boolean;
    }
  | {
      readonly kind: "LIVE";
      /** His threat as it stands at the catch (after its ARRIVED). */
      readonly threat: RushThreat;
      /** He was live (not ARRIVED) when the quarterback stepped up on this play (an ARC man is then BEHIND). */
      readonly liveAtStepUp: boolean;
      /** His record at the snap put him on the free-run clock under the arm's reading (AM-2's key). */
      readonly onFreeRunClockAtSnap: boolean;
    };

/**
 * 2.8 (ADR:772; plan §2.8): the contact facts of a caught escape, built at the escape site and never
 * from step 4's (`contactFactsOf` throws for a man with no approach, and a blocked man has no
 * threat). A blocked man: approach BLOCKED, from his alignment (INTERIOR FRONT, EDGE SIDE), never
 * on the free-run clock. A live man: his threat's approach, `contactFrom`'s from, and his clock by
 * `onFreeRunClockAtContact`. `seen` is the owner's answer (`caughtSeen`): SEEN, the recommended,
 * keeps every contact seen, as `QB_HIT.seen` reads before step 7; UNSEEN_IF_UNREGISTERED (P21)
 * makes an unregistered blocked man's catch unseen, so his tilt class is BEHIND_NEVER. No die.
 */
export function caughtFactsOf(caughtSeen: CaughtSeen, catcher: CaughtCatcher): ContactFacts {
  if (catcher.kind === "BLOCKED") {
    return {
      approach: "BLOCKED",
      from: catcher.alignment === "EDGE" ? "SIDE" : "FRONT",
      seen: caughtSeen === "SEEN" || !catcher.unregistered,
      onFreeRunClock: false,
    };
  }
  const { threat } = catcher;
  if (threat.approach === undefined) throw new Error(`@ff/engine: a caught escape by ${String(threat.rusher)} whose threat carries no approach`);
  return {
    approach: threat.approach,
    from: contactFrom({ approach: threat.approach, alignment: threat.alignment, liveAtStepUp: catcher.liveAtStepUp }),
    seen: true,
    onFreeRunClock: onFreeRunClockAtContact(catcher.onFreeRunClockAtSnap, threat.origin),
  };
}

/**
 * 2.8: the caught escape's contest is step 4's by rule (§4.5 items 4 to 6): the rated
 * `arrival_contest` while no shed has happened on the play, the second arrival after the play's
 * first shed (each rated when the second arrival is off, D12).
 */
export function caughtContestForm(contact: ContactTunables, shedInPlay: boolean): "RATED" | "SECOND" {
  return !shedInPlay || contact.secondArrival === "RATED" ? "RATED" : "SECOND";
}

/**
 * The faces of a caught escape's contest, drawn by the caller on step 4's labels (P6): the rated
 * contest's rusher face on `.../rush/t<tick>/<rusherId>:contest` and the quarterback's on
 * `.../rush/t<tick>/<quarterbackId>:contest:<rusherId>`; the second arrival's one face on
 * `.../rush/t<tick>/<rusherId>:contest2`.
 */
export type CaughtFaces =
  | { readonly form: "RATED"; readonly rusher: number; readonly quarterback: number; readonly rngLabel: string; readonly quarterbackRngLabel: string }
  | { readonly form: "SECOND"; readonly rusher: number; readonly rngLabel: string };

/**
 * 2.8: the caught escape's `arrival_contest` CHECK from its faces, as step 4 states one: actors the
 * rusher then the quarterback; the rated contest with step 4's tilt for the catch's tilt class
 * (AM-7; `tiltOf` on `facts`) and the bundle's boundary; the second arrival against its target, no
 * rating read. No die is drawn here.
 */
export function caughtEscapeContest(a: {
  readonly tunables: Tunables;
  readonly contact: ContactTunables;
  readonly rusher: PlayerState;
  readonly qb: PlayerState;
  readonly facts: ContactFacts;
  readonly faces: CaughtFaces;
}): ArrivalContestEmission {
  const actors = [a.rusher.bio.id, a.qb.bio.id] as const;
  if (a.faces.form === "RATED") {
    const r = arrivalContest(
      a.rusher,
      a.qb,
      tiltOf(a.facts, a.contact.tilts),
      { rusher: a.faces.rusher, quarterback: a.faces.quarterback, rngLabel: a.faces.rngLabel, quarterbackRngLabel: a.faces.quarterbackRngLabel },
      a.contact.boundary,
    );
    return {
      checkKind: ARRIVAL_CONTEST_KIND,
      actors,
      roll: r.rusherRoll,
      opposedRoll: r.quarterbackRoll,
      target: r.boundary,
      tier: tierFor(a.tunables, r.margin),
      band: r.band,
      margin: r.margin,
      testsAttrs: r.testsAttrs,
    };
  }
  if (a.contact.secondArrival === "RATED") throw new Error("@ff/engine: a second arrival's face under a rated second arrival");
  const r = secondArrival(a.faces.rusher, a.contact.secondArrival.target, a.faces.rngLabel);
  const margin = r.roll.total - r.target;
  return {
    checkKind: ARRIVAL_CONTEST_KIND,
    actors,
    roll: r.roll,
    target: r.target,
    tier: tierFor(a.tunables, margin),
    band: r.band,
    margin,
    testsAttrs: r.testsAttrs,
  };
}

/**
 * 2.8: the shed path, how far a caught escape's shed puts the catcher back: a live man's threat by
 * his approach, as step 4's shed (`shedDelaySecondsOf`: a PUSH man the bundle's
 * `pushShedDelaySeconds`, every other approach its `shedDelaySeconds`), published DELAYED by the
 * call site; a blocked man not at all (`undefined`): he has no threat, and he stays in his block.
 * No die.
 */
export function caughtShedDelaySeconds(catcher: CaughtCatcher, contact: ContactTunables): number | undefined {
  if (catcher.kind === "BLOCKED") return undefined;
  const { approach } = catcher.threat;
  if (approach === undefined) throw new Error(`@ff/engine: a caught escape by ${String(catcher.threat.rusher)} whose threat carries no approach`);
  return shedDelaySecondsOf(approach, contact);
}

/**
 * 2.8 (P7, P20): the caught escape's `QB_HIT`, in P7's key order: phase SACK or SHED, `rollRef` the
 * contest's CHECK, approach, from and seen from the catch's facts (BLOCKED only for a blocked
 * catcher). `contactSeconds` is the tick of the escape roll that caught him, in seconds from the snap:
 * ticks are seconds here (`clock.tickStepSeconds` 0.5 and `clock.maxTick` 6.0, `tunables.ts`, "Times
 * are expressed in seconds"), so the tick is written as it stands, with no conversion. It is never
 * the contact book's time, which for a live catcher is his future arrival (D21), and which a blocked
 * man does not have.
 */
export function caughtHitOf(a: {
  readonly qb: PlayerId;
  readonly rusher: PlayerId;
  readonly phase: "SACK" | "SHED";
  readonly tick: number;
  readonly rollRef: string;
  readonly facts: ContactFacts;
}): QbHitRecord {
  return {
    qb: a.qb,
    rusher: a.rusher,
    phase: a.phase,
    contactSeconds: a.tick,
    rollRef: a.rollRef,
    approach: a.facts.approach,
    from: a.facts.from,
    seen: a.facts.seen,
  };
}
