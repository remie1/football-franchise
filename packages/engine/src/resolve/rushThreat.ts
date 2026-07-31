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
import type { PlayerId, Position, ThreatOrigin } from "@ff/contracts";
import { clamp } from "../rolls.js";
import type { Tunables } from "../tunables.js";
import type {
  ResolvedRushAssignment,
  RunSide,
  RushAlignment,
  RushMove,
} from "../types.js";
import type { PassRushBandLabel } from "./passRush.js";
// Type-only, and therefore erased: `./pocket.ts` imports the FUNCTION below, so a
// value import in this direction would be a cycle. The ladder's rung type belongs
// with the ladder (ADR-033) and this file is one of its consumers.
import type { PocketStatusRung } from "./pocket.js";

/**
 * SOMETHING WITH A TIME OF ARRIVAL — whatever the §7.2 clock is counting down.
 *
 * Two things are, and neither is published as a `RUSH_THREAT`. A rusher who
 * beat his block is a `RushThreat` below and reaches the stream in that shape.
 * The pursuit clock a scrambling quarterback runs on (§8.8) is not a pass-rush
 * rep and has no `ThreatOrigin` that would be true of it — `origin` answers
 * "which player, and why", and the pursuit clock names no player at all
 * (ADR-054 §2: its would-be `rusher`/`alignment` are array order and a
 * hardcoded literal, never facts).
 *
 * ADR-054 gave it a publisher — `QB_PURSUIT` — but that event carries only
 * `sinceTick`/`deadlineTick`/`rollRef`, not `rusher`/`alignment`/`origin`, so
 * it is still typed as the weaker `ArrivalClock` here rather than the
 * `RushThreat` it is never handed as. The reasoning that kept it weaker did
 * not change with ADR-054; only "a publisher it never reaches" did — it now
 * reaches one, and that publisher was shaped to fit what this type actually
 * carries, not the other way around.
 */
export interface ArrivalClock {
  readonly rusher: PlayerId;
  readonly alignment: RushAlignment;
  /** Tick of the rep he won. */
  readonly wonAtTick: number;
  /** Tick at which he reaches the quarterback if nothing changes. */
  readonly etaTick: number;
  /**
   * `rngLabel` of the roll that justifies this clock. ADR-004: the ETA asserts
   * nothing the stream cannot already justify, and it points back at what
   * justified it. For the pursuit clock that is the §8.8 escape roll.
   */
  readonly rollRef: string;
}

/**
 * A rusher who is on his way to the quarterback, and therefore a thing the
 * stream states.
 *
 * `origin` is ADR-022 petition 5, ratified: four ways to become a threat, one of
 * which is a won rep, and `rollRef` names the roll the ADR's table says
 * justifies each — the `pass_rush_tick` CHECK for `WON_REP`, the
 * `blitz_recognition` PRESNAP_READ for `UNBLOCKED`, the `blitz_pickup` CHECK for
 * `PICKUP_LOST`, the `stunt_communication` CHECK for `STUNT_LOOPER`. It travels
 * ON the threat rather than being decided at the publication site, because a
 * threat is published up to four times — TRAVELLING, DELAYED, RESET, ARRIVED —
 * and every one of them has to say the same thing about why he is coming.
 */
export interface RushThreat extends ArrivalClock {
  readonly origin: ThreatOrigin;
}

/**
 * The band that starts a rusher travelling — §7.1's "rusher wins rep".
 *
 * `satisfies` rather than `: PassRushBandLabel`, deliberately: a type
 * annotation would widen the literal to the whole band union, and the
 * assertion below needs the literal `"RUSHER_WINS_REP"` back out of this
 * constant rather than a second hand-typed copy of the string
 * (Charter §4.1 — derive, don't restate).
 */
const WINNING_BAND = "RUSHER_WINS_REP" satisfies PassRushBandLabel;

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
 * The band a run of consecutive reps against a still-live threat can retire —
 * §7.1's "contained" row, CALIBRATION-BACKLOG entry 73. `satisfies` for the
 * same reason as `WINNING_BAND`: the literal is read back out here rather than
 * hand-typed a second time.
 */
const CONTAINED_BAND = "BLOCKER_CONTAINS" satisfies PassRushBandLabel;

/**
 * Whether this tick's band continues a run of consecutive containments —
 * the per-matchup counter `tunables.arrival.containRetiresAfterConsecutiveContains`
 * is compared against. Any other band — a win, a gain, a beaten blocker, or a
 * reset — breaks the run, matching the owner's "contained on one tick and free
 * on the next is a real football event" (entry 73): the streak does not
 * survive a tick that was not itself a contain.
 */
export function continuesContainStreak(band: PassRushBandLabel): boolean {
  return band === CONTAINED_BAND;
}

/**
 * §7.1's ONE reset row ("blocker wins by 15+") is not the only way a blocker
 * ends a rusher's threat any more — CALIBRATION-BACKLOG entry 73, ruled on the
 * football regardless of price. A blocker who has recovered position on
 * `containRetiresAfterConsecutiveContains` reps IN A ROW against the same live
 * threat has genuinely re-won the rep in aggregate, even though no single rep
 * crossed the 15-margin threshold that would have reset him outright. See
 * `tunables.ts`'s `arrival.containRetiresAfterConsecutiveContains` for the
 * derivation of the count and what this does and does not assert.
 *
 * `consecutiveContains` is the caller's own running count (`RushMatchup
 * .consecutiveContains` in `sim/passPlay.ts`), not recomputed here — this
 * function is the THRESHOLD TEST, not the counter, the same division of labour
 * `clearsThreat` already has with `advancePressure`.
 */
export function retiresBySustainedContainment(
  tunables: Tunables,
  band: PassRushBandLabel,
  consecutiveContains: number,
): boolean {
  return (
    band === CONTAINED_BAND &&
    consecutiveContains >= tunables.arrival.containRetiresAfterConsecutiveContains
  );
}

/**
 * ============ THE WINNING BAND CANNOT CLEAR ITS OWN THREAT — ASSERTED (CALIBRATION-BACKLOG entry 59) ============
 *
 * `sim/passPlay.ts`'s tick loop tests `startsThreat(rush.band)` BEFORE
 * `clearsThreat(tunables, rush.band)`, in an if/else-if chain. For a tick
 * whose band is `WINNING_BAND`, the first branch always matches, so the
 * second is never evaluated for that band — `clearsThreat(tunables,
 * "RUSHER_WINS_REP")` is dead code at that call site, for any config.
 *
 * Entry 59 asked which of two fixes that calls for: reorder the chain so the
 * branch is reachable (a behaviour change, needing a football argument), or
 * enforce that the branch cannot matter (a config fix, if the value it could
 * never deliver was never a coherent value in the first place).
 *
 * IT IS THE SECOND. `resolve/passRush.ts`'s `bandFor` assigns exactly ONE
 * band per tick from a SINGLE margin, and §7.1's own table (`match-engine.md`
 * §7.1) names only one row that resets a rusher — "blocker wins by 15+"
 * (`BLOCKER_RESETS`) — never the row that says he won. A tick cannot be both
 * `RUSHER_WINS_REP` and `BLOCKER_RESETS`: they are the two opposite ends of
 * the same margin. So `pressureProgressByBand.RUSHER_WINS_REP.reset === true`
 * has no football reading — it would assert that the SAME roll which just
 * started a rusher travelling also retired the threat it just created, off
 * the same die, on the same tick. §7.1's table has no such rep.
 *
 * The ordering is therefore CORRECT football and always was; identity-check
 * evidence for this is recorded in `docs/decisions/CALIBRATION-BACKLOG.md`'s
 * 59-RESULT entry — swapping the branch order changes nothing about today's
 * event stream, because `RUSHER_WINS_REP.reset` is already `false`, which is
 * the only value the football ever supported.
 *
 * That the value on file already happens to be the coherent one is not
 * something to leave to luck (see ADR-036's `tippedBall.qualityBands.DEAD
 * .finalTargetNumber = 0` — a table demanded a value per band and a value
 * appeared). This line is what makes it not luck: `TUNABLES` is `as const`,
 * so `Tunables["passRush"]["pressureProgressByBand"]["RUSHER_WINS_REP"]
 * ["reset"]` is the LITERAL `false`, not `boolean` — and `AssertFalse`
 * rejects anything that is not. `tsc -p tsconfig.test.json` runs before
 * `vitest` (`package.json`'s `test` script), so this is a build failure, not
 * a runtime one, exactly as `resolve/pocket.ts`'s `AssertEmptyUnion` pair is.
 *
 * RED TRIGGER, both directions, named per entry 60's rule:
 *   - FIRES (fails to compile) the instant `pressureProgressByBand
 *     .RUSHER_WINS_REP.reset` becomes anything but the literal `false` — for
 *     EITHER of its two readers, `advancePressure`'s pressure-counter reset
 *     or this file's `clearsThreat` — since one field feeds both and neither
 *     reading is coherent for this band. Proved to fire: `test/rushThreat
 *     .test.ts` instantiates the failing case under `@ts-expect-error`.
 *   - Does NOT fire, and is not meant to, for any of the other five bands.
 *     `startsThreat` is false for all of them, so `clearsThreat` is genuinely
 *     REACHABLE through the same if/else-if chain for `BLOCKER_BEATEN`,
 *     `RUSHER_GAINING`, `STALEMATE`, `BLOCKER_CONTAINS` and `BLOCKER_RESETS`
 *     — their `.reset` values are live tuning knobs today, not comments with
 *     a value's name, and this assertion does not and must not constrain
 *     them. (`BLOCKER_CONTAINS.reset` in particular is a real open question —
 *     CALIBRATION-BACKLOG entry 71-RESULT's "missing mechanic" — and nothing
 *     here stands in its way.)
 */
export type AssertFalse<T extends false> = T;

export type _WinningBandNeverClearsItsOwnThreat = AssertFalse<
  Tunables["passRush"]["pressureProgressByBand"][typeof WINNING_BAND]["reset"]
>;

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

/**
 * §7.4's THREE STARTING DEPTHS, keyed on the rusher's registry `Position`.
 *
 * The same shape as `rushAlignmentFor` above and for the same reason: a position
 * is not an attribute and this is not `getAttr`'s business, but it IS a registry
 * fact about where a man lines up, and the two lists that partition it are
 * tunables so calibration can move a position between classes without a code
 * change. Everything nobody classified is `BOX`, which is the class §7.4's own
 * sentence describes and the class at offset 0.0.
 */
export type FreeRunnerDepth = "LINE" | "BOX" | "DEEP";

export function freeRunnerDepthFor(tunables: Tunables, position: Position): FreeRunnerDepth {
  const t = tunables.blitzPickup.freeRunnerPath;
  const onLine: readonly string[] = t.onLinePositions;
  if (onLine.includes(position)) return "LINE";
  const deep: readonly string[] = t.deepPositions;
  if (deep.includes(position)) return "DEEP";
  return t.defaultDepthClass;
}

/**
 * §7.4's ARRIVAL CLOCK — how long a man nobody is blocking needs, given where he
 * started. ADR-030 petition 1, Option A, ratified; ADR-031 implements it.
 *
 * DELIBERATELY NOT `travelSecondsFor` ABOVE, and the two live in one file so the
 * difference cannot be missed. That function measures the ground between a
 * BEATEN BLOCKER and the launch point, from the instant the rep was won — a
 * rusher who is already past a body, roughly a second into the play. This one
 * measures the ground between a MAN'S PRE-SNAP ALIGNMENT and the launch point,
 * from the snap, for a rusher no one ever engaged. Same unit, different
 * quantity, different zero, and ADR-030 priced the confusion of the two at about
 * +0.6pp of sack.
 *
 * The base is §7.4's ratified constant and the table is a signed offset on it,
 * so the value 1.5 keeps its meaning: it is the ETA of the second-level box
 * blitzer coming inside, which is the man the doc's sentence is about.
 *
 * `pickupDelaySeconds` is §7.4 step 3's own band delay — the time it costs to
 * get THROUGH a body — and it is summed here rather than at the call site so
 * that one function owns "when does a free runner arrive" and the clamp sees the
 * whole number. `UNBLOCKED` passes 0: nobody touched him.
 *
 * No die (ADR-005). Every input is on the play call or the registry, and the
 * result is published on the `RUSH_THREAT` this produces.
 */
export function freeRunnerArrivalSecondsFor(
  tunables: Tunables,
  alignment: RushAlignment,
  position: Position,
  pickupDelaySeconds: number,
): number {
  const t = tunables.blitzPickup;
  const depth = freeRunnerDepthFor(tunables, position);
  const raw =
    t.freeRunnerArrivalSeconds +
    t.freeRunnerPath.offsetSecondsByAlignmentAndDepth[alignment][depth] +
    pickupDelaySeconds;
  const bounded = clamp(
    raw,
    t.freeRunnerPath.minArrivalSeconds,
    t.freeRunnerPath.maxArrivalSeconds,
  );
  return Number(bounded.toFixed(1));
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
    // §7.1's own rep, which is the one origin of the four that a tick produced.
    origin: "WON_REP",
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
 * THE ARRIVAL THE QUARTERBACK CAUSED — the mirror of `delayThreat`.
 *
 * An ETA is a projection about a passer who STAYS WHERE HE IS: `travelSecondsFor`
 * measures the ground between a beaten blocker and the launch point. §7.2 already
 * accepts that the quarterback's own movement rewrites it — a climb pushes an
 * edge rusher's arrival back, and ADR-007 ratified publishing the ADJUSTED number
 * rather than leaving a consumer to derive it.
 *
 * §8.8's failed escape is the same adjustment in the other direction. He did not
 * stay where he was: he bailed, and `CAUGHT_FROM_BEHIND` is the band that says
 * the bail did not work. The men in the pocket did not have to finish their trip
 * — the passer closed the last of it himself. So the meeting happened at THIS
 * tick, and that is what the arrival states.
 *
 * No die is involved (ADR-005), exactly as no die produces any other ETA. The
 * roll that justifies the change is the §8.8 escape check, which is emitted
 * immediately before it and names this rusher among its actors. `rollRef` is left
 * pointing at the roll that started him coming, per ADR-022 — a threat says the
 * same thing about WHY it exists at every one of its publications, and a step-up's
 * `DELAYED` keeps its `rollRef` for the same reason.
 *
 * A rusher whose ETA has already passed is returned untouched: he got there on
 * his own clock and nothing about him needs restating.
 */
export function arrivedAt(threat: RushThreat, tick: number): RushThreat {
  if (threat.etaTick <= tick) return threat;
  return { ...threat, etaTick: Number(tick.toFixed(1)) };
}

/**
 * The threat CLOSEST TO ARRIVING — the man a quarterback who moves runs into.
 *
 * Total and deterministic, with no die at any level (ADR-005): the identity of a
 * sacker is not a contest the design rolls for, and inventing one would put a
 * result in the stream that no table in the doc produces.
 *
 *   1. the smallest time to arrival, which is §7.2's own measure of "nearest" and
 *      the same quantity `hasArrived` and `pocketFloorFromArrival` read;
 *   2. ties to `priority` — the alignment the escape was already made harder by.
 *      §8.8's target number charges `edgeThreatPenalty` per EDGE threat because
 *      "edge rushers are the contain players", so when two men reach the passer
 *      together the contain player is the one the model has already said walls a
 *      bailing quarterback in. Passed in rather than hard-coded: which alignment
 *      wins a dead heat is a football claim no die settles, so it is a named
 *      tunable (`arrival.simultaneousArrivalPriority`) and calibration can flip it;
 *   3. ties to the lower `PlayerId`, so the answer never depends on the order the
 *      play call happened to list rushers in.
 */
export function nearestThreat<T extends ArrivalClock>(
  threats: readonly T[],
  priority: RushAlignment,
): T | undefined {
  let best: T | undefined;
  for (const threat of threats) {
    if (best === undefined) {
      best = threat;
      continue;
    }
    if (threat.etaTick !== best.etaTick) {
      if (threat.etaTick < best.etaTick) best = threat;
      continue;
    }
    if (threat.alignment !== best.alignment) {
      if (threat.alignment === priority) best = threat;
      continue;
    }
    if (String(threat.rusher).localeCompare(String(best.rusher)) < 0) best = threat;
  }
  return best;
}

/**
 * Ground the rusher loses on the following tick's rep. A threat is not frozen
 * at the moment it was created: a tackle who recovers position is not
 * un-beaten, but the man he beat is arriving later than he was.
 */
export function recoverySecondsFor(tunables: Tunables, band: PassRushBandLabel): number {
  return tunables.arrival.recoverySecondsByBand[band];
}

export function timeToArrival(threat: ArrivalClock, tick: number): number {
  return Number((threat.etaTick - tick).toFixed(1));
}

/** Seconds until the nearest threat arrives; `undefined` when nobody is coming. */
export function minTimeToArrival(
  threats: readonly ArrivalClock[],
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
  threats: readonly ArrivalClock[],
  tick: number,
): boolean {
  const min = minTimeToArrival(threats, tick);
  return min !== undefined && min <= tunables.arrival.immediateWithinSeconds;
}

export function threatsWithAlignment(
  threats: readonly ArrivalClock[],
  alignment: RushAlignment,
): ArrivalClock[] {
  return threats.filter((t) => t.alignment === alignment);
}

/**
 * Pocket-status floor implied by the nearest travelling threat. This is what
 * keeps a beaten tackle beaten: a rusher who won at 1.0 and stalemates at 1.5
 * has not un-beaten his block — he is still coming, and the pocket knows it.
 *
 * THREE HORIZONS, ALL NAMED (ADR-031 change 2). The last of them used to be the
 * absence of a branch: this function returned `PRESSURE` for any live threat at
 * any distance, so the horizon was infinite AS A FACT and unsweepable AS A
 * TUNABLE. `arrival.pressureWithinSeconds` defaults to `POS_INF`, which is that
 * same behaviour written down — the output is identical at the default and the
 * constant is now a value calibration can move.
 */
export function pocketFloorFromArrival(
  tunables: Tunables,
  minTta: number | undefined,
): PocketStatusRung {
  if (minTta === undefined) return "CLEAN";
  const t = tunables.arrival;
  if (minTta <= t.immediateWithinSeconds) return "IMMEDIATE";
  if (minTta <= t.collapsingWithinSeconds) return "COLLAPSING";
  if (minTta <= t.pressureWithinSeconds) return "PRESSURE";
  // Travelling, and still too far away to be dirtying the pocket. Unreachable at
  // the committed horizon and deliberately so: it is the state a sweep of that
  // horizon exists to reach.
  return "CLEAN";
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
