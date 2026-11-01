/**
 * ADR-089 step 3 — FREE RUNNERS TIMED FROM THE SNAP PICTURE; THE HAND-OFF FIX; THE LOOPER'S SIDE
 * (plan §2.3, E3; AM-2's `part1`, `untouchedExchange` and `toucher`; D16, D19, D22).
 *
 * ================== WHERE IT RUNS ==================
 * Once a play, in `simulatePassPlay`, after `resolveStunts` and before `buildMatchups`, and only
 * under a `pocket-1.s3` bundle that carries a free-run block or a late block
 * (`PocketRules.freeRun`, `.lateBlock`). It throws no die and changes no die, label or roll:
 * `resolvePickups` and `resolveStunts` run byte for byte as under every other rule set, and this
 * pass reads what they left (their plans and their CHECKs) and rewrites only the free records'
 * engine-internal timing. Under `legacy`, s1 and s2 it is never called, so their records keep
 * today's times, the hand-off defect included.
 *
 * ================== WHO HAD A HAND ON HIM, AND WHOSE RECORD HE CARRIES ==================
 * A free record is EARNED by one man (the pickup's rusher, or a failed twist's looper) and may be
 * CARRIED by another: a passed-off twist exchanges the two men's whole assignments
 * (`sim/preSnap.ts`'s `withAssignmentOf`), free record and all. To know both, this pass replays the
 * line games over the pickups' plans without a die: each stunt that names two played rushers made
 * exactly one `stunt_communication` CHECK, in order, and that CHECK's band says whether the two
 * swapped (`stunt.bands[].passedOff`) or the looper went free with a new record. The replay ends
 * where `resolveStunts` ended or this throws (an engine fault, never a chance event): every slot's
 * blocker and record must be the very object `resolveStunts` left there.
 *
 * The toucher (AM-2): RAN_THROUGH, the back the pickup assigned, the first actor of the
 * `blitz_pickup` CHECK the record names (actors are `[blocker, rusher]`); LATE_EXCHANGE, the
 * looper's blocker in the plans the stunt CHECK was rolled on (the CHECK's actors are compacted, so
 * the replay reads the plans, not the actors). A LATE_EXCHANGE whose looper had no blocker was
 * touched by nobody (D19): the untouched exchange, timed as LOOPER_FREE, with no delay.
 *
 * ================== WHO IS ON THE CLOCK (the arm's reading) ==================
 *  - B (the design, D19): the men nobody touched, UNBLOCKED, BLOWN_UP, LOOPER_FREE and the
 *    untouched exchange, narrowed by `origins` when an arm names some. A touched man is the late
 *    block's (`lateBlock`), or keeps today's time when the bundle has none.
 *  - C: every free runner; a touched man adds his band's `arrivalDelaySeconds` (0.5 s, today's
 *    RAN_THROUGH and LATE_EXCHANGE delay) before the tenth is taken. No late block.
 *  - A: only the men with nobody's hand on them: UNBLOCKED and a looper with no blocker. Every man
 *    with one (the back assigned, the looper's blocker), BLOWN_UP and LOOPER_FREE included, is a
 *    late block.
 *  - No free-run block (the late block alone): nobody is on the clock; touched men are late blocks
 *    and the rest keep today's times.
 *
 * ================== THE CLOCK'S INPUTS ==================
 * The CARRIER's own: his entry in `calls.snap.defense` (refused if absent: no spot is invented),
 * his Speed and Acceleration (`getAttr`), his alignment's bend; the call's `dropDepthYards`; the
 * DELAYED wait when the played `blitzDisguise` is DELAYED and he is a linebacker or a defensive
 * back. A looper record (STUNT_LOOPER) loops from his spot across his partner's: the twist's
 * penetrator, or, on a carried looper record, the man it was carried from. An arm that holds an
 * input (`freeRun.hold`) substitutes AM-2's reference for that input and nothing else; a held
 * spot is his group's (depth, width) on his own side of the ball, set, and a held looper crosses
 * only the filed 0.5 yard. No 0.5 to 4.0 s clamp: that belongs to the legacy table.
 */
import { POSITION_GROUP } from "@ff/contracts";
import type { BlitzDisguise, PlayerId, PlayerSnapSpot, PlayerState, Position, SnapPicture, StuntCall } from "@ff/contracts";
import type { CheckEmission } from "../events.js";
import { threatSideOf } from "../resolve/approach.js";
import { freeRunClock, freeRunRatingsOf, movingEntryProblem, roundFreeRunEta } from "../resolve/freeRun.js";
import type { FreeRunSpot } from "../resolve/freeRun.js";
import type { FreeRunHoldTunables, FreeRunOrigin, FreeRunTunables, Tunables } from "../tunables.js";
import type { PlayCalls, RunSide } from "../types.js";
import type { PocketRules } from "./pocketRules.js";
import type { FreeRunner, RushPlan, RushPlans } from "./preSnap.js";

/**
 * Thrown before any die when a step-3 pass play cannot be timed: no snap picture on its calls, a
 * rusher with no entry in it, or a moving entry other than the creeper's. A configuration fault,
 * never a chance event (plan §2.3; R8, R10).
 */
export class FreeRunTimingError extends Error {
  constructor(message: string) {
    super(`@ff/engine: ${message}`);
    this.name = "FreeRunTimingError";
  }
}

/** The step-3 blocks a bundle carries, by their tunables names (empty under `legacy`, s1 and s2). */
export function step3BlocksOf(rules: PocketRules): readonly string[] {
  if (rules.kind === "LEGACY") return [];
  return [
    ...(rules.freeRun === undefined ? [] : ["the free-run block (blitzPickup.freeRun)"]),
    ...(rules.lateBlock === undefined ? [] : ["the late block (blitzPickup.lateBlock)"]),
    ...(rules.climbLane === "INTERIOR" ? [] : ["the climb lane rule (pocket.climbLane)"]),
  ];
}

/**
 * The top-of-play refusals, before any die: under any step-3 block the calls carry the snap
 * picture (ADR-090 S5; every play the playbook's callers call carries one); under the free-run
 * block every played rusher has an entry in it (any of them may come free), and the only entry
 * that moves is the creeper's (straight at the line at the filed 3 yd/s).
 */
export function assertSnapPictureFor(rules: PocketRules, calls: PlayCalls): void {
  const blocks = step3BlocksOf(rules);
  if (blocks.length === 0) return;
  const snap = calls.snap;
  if (snap === undefined) {
    throw new FreeRunTimingError(
      `a pass play under ${blocks.join(", ")} needs the snap picture on its calls (PlayCalls.snap, ADR-090 S5); these carry none`,
    );
  }
  if (rules.kind === "LEGACY" || rules.freeRun === undefined) return;
  for (const { rusher } of calls.defense.rush) {
    const entry = entryOf(snap, rusher);
    if (entry.moving !== undefined) {
      const problem = movingEntryProblem(rules.freeRun, entry.moving);
      if (problem !== undefined) {
        throw new FreeRunTimingError(
          `the snap picture's entry for the rusher ${String(rusher)} ${problem}; under the free-run block (blitzPickup.freeRun) only the creeper's entry may move`,
        );
      }
    }
  }
}

function entryOf(snap: SnapPicture, id: PlayerId): PlayerSnapSpot {
  const entry = snap.defense.find((e) => e.player === id);
  if (entry === undefined) {
    throw new FreeRunTimingError(
      `the snap picture (PlayCalls.snap.defense) has no entry for the rusher ${String(id)}, whom the free-run clock may have to time; no spot is invented`,
    );
  }
  return entry;
}

/** The free-run clock's reference group for a position (AM-2's references), or `undefined`. */
function heldGroupOf(position: Position): keyof NonNullable<FreeRunHoldTunables["spot"]> | undefined {
  switch (POSITION_GROUP[position]) {
    case "DL":
      return "downLineman";
    case "LB":
      return "linebacker";
    case "DB":
      return "defensiveBack";
    default:
      return undefined;
  }
}

/** A DELAYED blitz waits for a linebacker or a defensive back; never for a down lineman. */
function waitsOnDelayed(position: Position): boolean {
  const group = POSITION_GROUP[position];
  return group === "LB" || group === "DB";
}

/** One free record, as the replay knows it: who earned it and whose hand, if any, was on him. */
interface Earned {
  readonly earner: PlayerId;
  /** A pickup-stage record (UNBLOCKED, PICKUP_LOST): the record itself, matched by identity. */
  readonly record?: FreeRunner;
  /** A looper record: the stunt CHECK that made it, and the twist's penetrator. */
  readonly stunt?: { readonly check: CheckEmission; readonly penetrator: PlayerId };
  /** The back the pickup assigned, or the looper's blocker at the stunt CHECK. */
  readonly hand: PlayerId | undefined;
  /** The touching CHECK's margin (blocker total − rusher total; roll total − target). */
  readonly margin: number | undefined;
}

type Slot =
  | { readonly rusher: PlayerId; readonly blocker: PlayerState; readonly earned?: undefined; readonly from?: undefined }
  | { readonly rusher: PlayerId; readonly blocker?: undefined; readonly earned: Earned; readonly from: PlayerId | undefined };

function internal(message: string): Error {
  return new Error(`@ff/engine: the free-run timing pass ${message}`);
}

function pickupEarned(plan: RushPlan, pickupChecks: readonly CheckEmission[]): Earned {
  const free = plan.free;
  if (free === undefined) throw internal("was handed a blocked plan as a free one");
  const earner = plan.rusher.bio.id;
  if (free.origin === "UNBLOCKED") return { earner, record: free, hand: undefined, margin: undefined };
  const check = pickupChecks.find((c) => c.roll.rngLabel === free.rollRef);
  if (check === undefined || check.checkKind !== "blitz_pickup") {
    throw internal(`found no blitz_pickup CHECK for ${String(earner)}'s ${free.origin} record (${free.rollRef})`);
  }
  return { earner, record: free, hand: check.actors[0], margin: check.margin };
}

/**
 * `resolveStunts` again, over the pickups' plans, with no die: which record each man carries at
 * the snap, who earned it, and whose hand was on him. Checked against what `resolveStunts` left.
 */
function replayLineGames(
  tunables: Tunables,
  stunts: readonly StuntCall[],
  pickups: RushPlans,
  lineGames: RushPlans,
): readonly Slot[] {
  const slots: Slot[] = pickups.plans.map((p): Slot =>
    p.blocker !== undefined
      ? { rusher: p.rusher.bio.id, blocker: p.blocker }
      : { rusher: p.rusher.bio.id, earned: pickupEarned(p, pickups.checks), from: undefined },
  );
  let next = 0;
  for (const stunt of stunts) {
    const pi = slots.findIndex((s) => s.rusher === stunt.penetrator);
    const li = slots.findIndex((s) => s.rusher === stunt.looper);
    const penetrator = pi < 0 ? undefined : slots[pi];
    const looper = li < 0 ? undefined : slots[li];
    if (penetrator === undefined || looper === undefined) continue;
    const check = lineGames.checks[next];
    next += 1;
    if (
      check === undefined ||
      check.checkKind !== "stunt_communication" ||
      check.actors.at(-1) !== stunt.looper ||
      check.actors.at(-2) !== stunt.penetrator
    ) {
      throw internal(`could not pair the stunt ${String(stunt.penetrator)}/${String(stunt.looper)} with its stunt_communication CHECK`);
    }
    const band = tunables.stunt.bands.find((b) => b.label === check.band);
    if (band === undefined) throw internal(`read a stunt band the table does not name: ${String(check.band)}`);
    if (band.passedOff) {
      slots[pi] = carried(penetrator.rusher, looper);
      slots[li] = carried(looper.rusher, penetrator);
      continue;
    }
    slots[li] = {
      rusher: looper.rusher,
      earned: {
        earner: stunt.looper,
        stunt: { check, penetrator: stunt.penetrator },
        hand: looper.blocker?.bio.id,
        margin: check.margin,
      },
      from: undefined,
    };
  }
  if (next !== lineGames.checks.length) throw internal(`replayed ${next} stunt CHECKs of ${lineGames.checks.length}`);

  // The replay must end where `resolveStunts` ended: the same blocker and the same record, slot by slot.
  slots.forEach((slot, i) => {
    const plan = lineGames.plans[i];
    if (plan === undefined || plan.rusher.bio.id !== slot.rusher) throw internal(`lost the rusher at slot ${i}`);
    if (slot.blocker !== undefined) {
      if (plan.blocker !== slot.blocker) throw internal(`disagrees with resolveStunts on ${String(slot.rusher)}'s blocker`);
      return;
    }
    const free = plan.free;
    const { record, stunt } = slot.earned;
    const same =
      free !== undefined &&
      (record !== undefined
        ? free === record
        : stunt !== undefined && free.origin === "STUNT_LOOPER" && free.rollRef === stunt.check.roll.rngLabel && free.band === stunt.check.band);
    if (!same) throw internal(`disagrees with resolveStunts on ${String(slot.rusher)}'s free record`);
  });
  return slots;
}

/** `from`'s assignment, handed to `to` by a passed-off twist; a free record remembers who handed it. */
function carried(to: PlayerId, from: Slot): Slot {
  return from.blocker !== undefined
    ? { rusher: to, blocker: from.blocker }
    : { rusher: to, earned: from.earned, from: from.rusher };
}

/** The origin a reading-B arm's `origins` names him by (the untouched exchange is LOOPER_FREE's). */
function clockOriginOf(free: FreeRunner): FreeRunOrigin {
  if (free.origin === "UNBLOCKED") return "UNBLOCKED";
  return free.origin === "PICKUP_LOST" ? "BLOWN_UP" : "LOOPER_FREE";
}

/** Today's delay for the body he got through: the band's `arrivalDelaySeconds` (0.5 s touched). */
function bandDelayOf(tunables: Tunables, free: FreeRunner): number {
  const bands: readonly { readonly label: string; readonly arrivalDelaySeconds: number }[] =
    free.origin === "STUNT_LOOPER" ? tunables.stunt.bands : tunables.blitzPickup.bands;
  const band = bands.find((b) => b.label === free.band);
  if (band === undefined) throw internal(`read a band the table does not name: ${String(free.band)}`);
  return band.arrivalDelaySeconds;
}

export interface FreeRunTimingInput {
  /** The band tables (`stunt.bands`, `blitzPickup.bands`). */
  readonly tunables: Tunables;
  /** `undefined` under the late block alone: nobody is on the clock. */
  readonly freeRun: FreeRunTunables | undefined;
  /** `calls.snap`; refused when absent. */
  readonly snap: SnapPicture | undefined;
  /** `calls.offense.dropDepthYards` (D22). */
  readonly dropYards: number;
  /** The played disguise (`PreSnapRead.disguise`). */
  readonly disguise: BlitzDisguise;
  readonly stunts: readonly StuntCall[];
  /** `resolvePickups`' answer: the plans the line games were rolled on, and the pickup CHECKs. */
  readonly pickups: RushPlans;
  /** `resolveStunts`' answer: the plans at the snap, and the stunt CHECKs in roll order. */
  readonly lineGames: RushPlans;
}

/**
 * The plans at the snap with every free record rewritten for step 3: who is on the clock and his
 * time, who touched him, his side. Blocked plans are returned as they came. No die. Whether a
 * touched man becomes a late block is the line battle's to say (`toucher` set, `onClock` false, and
 * a late block in the bundle); under reading C he is on the clock instead, his band's delay later.
 */
export function timeFreeRunners(a: FreeRunTimingInput): readonly RushPlan[] {
  const { tunables, freeRun, snap } = a;
  if (snap === undefined) {
    throw new FreeRunTimingError("the free-run timing pass needs the snap picture on the calls (PlayCalls.snap, ADR-090 S5)");
  }
  const slots = replayLineGames(tunables, a.stunts, a.pickups, a.lineGames);
  const plans = a.lineGames.plans;
  const sideOf = (id: PlayerId): RunSide | undefined => plans.find((p) => p.rusher.bio.id === id)?.side;
  const hold = freeRun?.hold;

  return plans.map((plan, i): RushPlan => {
    const free = plan.free;
    const slot = slots[i];
    if (free === undefined) return plan;
    if (slot === undefined || slot.earned === undefined) throw internal(`has no record for ${String(plan.rusher.bio.id)}`);
    const { earned } = slot;
    const carrier = plan.rusher;
    const carrierId = carrier.bio.id;

    // D19: touched means somebody laid a hand on him: RAN_THROUGH, or LATE_EXCHANGE with a looper blocker.
    const touched = (free.band === "RAN_THROUGH" || free.band === "LATE_EXCHANGE") && earned.hand !== undefined;
    let onClock: boolean;
    let toucher: PlayerId | undefined;
    if (freeRun === undefined) {
      onClock = false;
      toucher = touched ? earned.hand : undefined;
    } else if (freeRun.reading === "B") {
      onClock = !touched && (freeRun.origins === undefined || freeRun.origins.includes(clockOriginOf(free)));
      toucher = touched ? earned.hand : undefined;
    } else if (freeRun.reading === "C") {
      onClock = true;
      toucher = touched ? earned.hand : undefined;
    } else {
      toucher = earned.hand;
      onClock = toucher === undefined;
    }
    if (toucher !== undefined && earned.margin === undefined) throw internal(`has a toucher for ${String(carrierId)} and no margin`);

    // D16: a looper record comes from his partner's side: the penetrator, or the man it was carried from.
    const loops = free.origin === "STUNT_LOOPER";
    const isCarried = earned.earner !== carrierId;
    const partner = !loops ? undefined : isCarried ? slot.from : earned.stunt?.penetrator;
    if (loops && partner === undefined) throw internal(`lost ${String(carrierId)}'s loop partner`);
    const side = threatSideOf({
      side: plan.side,
      ...(partner === undefined ? {} : { loop: { partnerSide: sideOf(partner) } }),
    });

    let timed: Pick<FreeRunner, "etaTick" | "distanceYards" | "closingSpeed"> | undefined;
    if (onClock && freeRun !== undefined) {
      const entry = entryOf(snap, carrierId);
      const position = carrier.bio.position;
      let spot: FreeRunSpot;
      if (hold?.spot === undefined) {
        spot = entry.moving === undefined ? { x: entry.x, y: entry.y } : { x: entry.x, y: entry.y, moving: entry.moving };
      } else {
        const group = heldGroupOf(position);
        if (group === undefined) {
          throw new FreeRunTimingError(
            `a held spot (blitzPickup.freeRun.hold.spot) has no reference for the rusher ${String(carrierId)}, a ${position}`,
          );
        }
        const ref = hold.spot[group];
        spot = { x: snap.ballX + (entry.x < snap.ballX ? -ref.width : ref.width), y: ref.depth };
      }
      const partnerSpot =
        partner === undefined
          ? undefined
          : hold?.spot !== undefined
            ? { x: spot.x, y: spot.y }
            : (({ x, y }) => ({ x, y }))(entryOf(snap, partner));
      const clock = freeRunClock(freeRun, {
        spot,
        ballX: snap.ballX,
        dropYards: hold?.drop ?? a.dropYards,
        edge: plan.alignment === "EDGE",
        ...(partnerSpot === undefined ? {} : { loop: { partnerSpot } }),
        ratings: hold?.ratings ?? freeRunRatingsOf(carrier),
        delayed: a.disguise === "DELAYED" && waitsOnDelayed(position),
      });
      // Reading C: a touched man is a free runner his band's delay later, added before the tenth.
      const delay = toucher === undefined ? 0 : bandDelayOf(tunables, free);
      const seconds = clock.unroundedSeconds + delay;
      timed = {
        etaTick: delay === 0 ? clock.etaSeconds : roundFreeRunEta(seconds),
        distanceYards: clock.distanceYards,
        closingSpeed: clock.distanceYards === 0 ? 0 : clock.distanceYards / seconds,
      };
    }

    const next: FreeRunner = {
      ...free,
      ...(timed ?? {}),
      onClock: timed !== undefined,
      ...(toucher === undefined || earned.margin === undefined ? {} : { toucher, touchMargin: earned.margin }),
      ...(side === undefined ? {} : { side }),
    };
    return { ...plan, free: next };
  });
}
