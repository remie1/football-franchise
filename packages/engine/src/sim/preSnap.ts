/**
 * THE PRE-SNAP PHASE OF A DROPBACK — §5.3, §7.3 and §7.4, resolved together
 * because they are one decision tree and not three.
 *
 * ================== WHAT THIS MODULE DECIDES ==================
 * Who is blocking whom when the ball is snapped, who is not blocked at all, and
 * whether the receivers are running the routes the card drew or the hot ones.
 *
 * The order is the doc's own:
 *
 *  1. §7.4 step 1 — RECOGNITION, and no die is thrown for it. A rusher is
 *     ACCOUNTED FOR when a `ProtectionAssignment` names him, or when the card
 *     declares a slide, he comes from the slide side, and a slide blocker is
 *     still free. Everything else is UNACCOUNTED.
 *  2. §5.3 — if anything is unaccounted, the quarterback and the centre roll to
 *     SEE it. This is the only trigger; a pressure the protection already names
 *     has nothing to recognise, so nothing is rolled (ADR-005).
 *  3. §5.3 / §7.4 step 2 — on recognition, hot routes convert and move to the
 *     front of the progression.
 *  4. §7.4 step 3 — each unaccounted rusher is offered to the next available
 *     blocker, in the card's stated priority. Contest per rusher.
 *  5. §7.4 step 4 — anybody left, or anybody who beat his pickup, is a FREE
 *     RUNNER with an ETA. Not a teleport: a rusher with a short clock.
 *  6. §7.3 — stunts resolve last, because a twist is an exchange between two
 *     men whose blockers step 4 may just have decided.
 *
 * ================== WHAT IT REFUSES TO DECIDE ==================
 *  - WHO the centre is. Absent from the card ⇒ his term is not rolled.
 *  - WHICH lineman is uncommitted on a slide. Absent from the card ⇒ there is no
 *    slide, and the protection is the man protection its pairings already are.
 *  - Whether an unblocked rusher "should" have been blocked. That is franchise's
 *    authoring question (ADR-006); a free runner is legal football and is now
 *    resolved rather than refused.
 *
 * ================== ADR-004 / ADR-005 ==================
 * Every free runner points at a REAL roll. `UNBLOCKED` names the §5.3 roll that
 * decided whether protection adjusted; `PICKUP_LOST` names its own contest;
 * `STUNT_LOOPER` names the communication check. No sentinel, no fabricated
 * label, and no threat that the stream cannot justify.
 */
import type { PlayerId, PlayerState, Rng } from "@ff/contracts";
import type { CheckEmission, PresnapEmission } from "../events.js";
import {
  resolveBlitzPickup,
  resolveBlitzRecognition,
  resolveStuntCommunication,
} from "../resolve/blitz.js";
import { rushAlignmentFor } from "../resolve/rushThreat.js";
import type { Tunables } from "../tunables.js";
import type {
  HotConversion,
  MatchGameState,
  PlayCalls,
  RouteAssignment,
  RunSide,
  RushAlignment,
  RushMove,
} from "../types.js";
import {
  availableBlockersOf,
  blitzDisguiseOf,
  centerOf,
  hotRouteOf,
  protectionSchemeOf,
  stuntsOf,
} from "../interim/adr022.js";
import type { BlitzDisguise, StuntCall } from "../interim/adr022.js";

/** Why a rusher is running free. Every value names a roll that produced it. */
export type FreeRunnerOrigin = "UNBLOCKED" | "PICKUP_LOST" | "STUNT_LOOPER";

export interface FreeRunner {
  readonly origin: FreeRunnerOrigin;
  /** Tick at which he reaches the quarterback if nothing changes. */
  readonly etaTick: number;
  /** `rngLabel` of the roll that justifies him (ADR-004). Never synthetic. */
  readonly rollRef: string;
}

/** One rusher, as the snap finds him. */
export interface RushPlan {
  readonly rusher: PlayerState;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
  readonly side: RunSide | undefined;
  /** `undefined` is the whole point of this dispatch: nobody is blocking him. */
  readonly blocker: PlayerState | undefined;
  /** Set exactly when `blocker` is undefined. */
  readonly free: FreeRunner | undefined;
}

export interface PreSnapResult {
  readonly plans: readonly RushPlan[];
  /** Rushers no `ProtectionAssignment` named — a fact about the CALL. */
  readonly unaccounted: readonly PlayerId[];
  readonly availableBlockers: readonly PlayerId[];
  readonly disguise: BlitzDisguise;
  readonly stunts: readonly StuntCall[];
  /** §5.3. Absent when nothing was unaccounted and therefore nothing was rolled. */
  readonly recognition: PresnapEmission | undefined;
  readonly recognized: boolean;
  /** In emission order: pickups, then stunts. */
  readonly checks: readonly CheckEmission[];
  /** The routes actually run, after any §5.3 conversion. */
  readonly routes: readonly RouteAssignment[];
  /** The progression actually worked, after hot receivers move to the front. */
  readonly readOrder: readonly PlayerId[];
  readonly hotConversions: readonly HotConversion[];
}

export function resolvePreSnap(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly state: MatchGameState;
  readonly calls: PlayCalls;
  readonly quarterback: PlayerState;
  readonly presnapRng: Rng;
  readonly player: (id: PlayerId) => PlayerState;
}): PreSnapResult {
  const { tunables, calls, quarterback, presnapRng, player } = args;
  const { offense, defense } = calls;

  const scheme = protectionSchemeOf(offense);
  const center = centerOf(offense);
  const centerPlayer = center === undefined ? undefined : player(center);
  const disguise = blitzDisguiseOf(defense);
  const stunts = stuntsOf(defense);

  // ---- 1. §7.4 step 1: recognition, deterministic -------------------------
  const slideSide = scheme?.kind === "SLIDE" ? scheme.slideSide : undefined;
  const available: PlayerId[] = [...availableBlockersOf(offense)];

  interface Draft {
    readonly rusher: PlayerState;
    readonly move: RushMove;
    readonly alignment: RushAlignment;
    readonly side: RunSide | undefined;
    blocker: PlayerState | undefined;
    free: FreeRunner | undefined;
  }

  const drafts: Draft[] = [];
  const unaccounted: PlayerId[] = [];

  for (const assignment of defense.rush) {
    const rusher = player(assignment.rusher);
    const named = offense.protection.find((p) => p.rusher === assignment.rusher);
    const draft: Draft = {
      rusher,
      move: assignment.move,
      alignment: rushAlignmentFor(tunables, rusher.bio.position, assignment.alignment),
      side: assignment.side,
      blocker: named === undefined ? undefined : player(named.blocker),
      free: undefined,
    };
    if (named === undefined) unaccounted.push(assignment.rusher);
    drafts.push(draft);
  }

  // ---- 2. §5.3: does he see it? -------------------------------------------
  // Rolled if and only if something is unaccounted. Nothing else turns on it,
  // and an absent check must mean "no die was thrown" (ADR-005).
  let recognition: PresnapEmission | undefined;
  let recognized = false;
  let recognitionRollRef = "";
  if (unaccounted.length > 0) {
    const outcome = resolveBlitzRecognition({
      tunables,
      quarterback,
      center: centerPlayer,
      disguise,
      presnapRng,
    });
    recognition = outcome.presnap;
    recognized = outcome.recognized;
    recognitionRollRef = outcome.roll.rngLabel;
  }

  // ---- 3. §5.3 / §7.4 step 2: hot routes ----------------------------------
  const hot = resolveHotRoutes(tunables, offense.routes, offense.readOrder, recognized);

  // ---- 4/5. §7.4 steps 3 and 4: pickup, then the free runner --------------
  const checks: CheckEmission[] = [];
  for (const draft of drafts) {
    if (draft.blocker !== undefined) continue;

    // The slide answers its own side without a contest: §7.4 step 1 says
    // "covered", and a covered rusher is an ordinary §7.1 rep from there.
    if (
      slideSide !== undefined &&
      draft.side === slideSide &&
      available.length > 0 &&
      tunables.blitzPickup.slideIsUncontested
    ) {
      const slid = available.shift();
      if (slid !== undefined) {
        draft.blocker = player(slid);
        continue;
      }
    }

    const bodyId = available.shift();
    if (bodyId === undefined) {
      // §7.4 step 4, the pure case: nobody left to block him. No contest, so no
      // die and no CHECK. The threat points at the §5.3 roll, which is the roll
      // that decided whether the protection adjusted to him.
      draft.free = {
        origin: "UNBLOCKED",
        etaTick: tunables.blitzPickup.freeRunnerArrivalSeconds,
        rollRef: recognitionRollRef,
      };
      continue;
    }

    const body = player(bodyId);
    const pickup = resolveBlitzPickup({
      tunables,
      blocker: body,
      rusher: draft.rusher,
      recognized,
      pickupRng: presnapRng.fork("pickup"),
    });
    checks.push(pickup.check);
    if (pickup.blocked) {
      draft.blocker = body;
      continue;
    }
    // He beat the back. The back is still on him in the sense that he had to get
    // through a body — which is what `arrivalDelaySeconds` is — but nobody is
    // blocking him any more, so no §7.1 rep runs.
    draft.free = {
      origin: "PICKUP_LOST",
      etaTick: Number(
        (tunables.blitzPickup.freeRunnerArrivalSeconds + pickup.arrivalDelaySeconds).toFixed(1),
      ),
      rollRef: pickup.check.roll.rngLabel,
    };
  }

  // ---- 6. §7.3: the twist -------------------------------------------------
  for (const stunt of stunts) {
    const penetrator = drafts.find((d) => d.rusher.bio.id === stunt.penetrator);
    const looper = drafts.find((d) => d.rusher.bio.id === stunt.looper);
    if (penetrator === undefined || looper === undefined) continue;

    const outcome = resolveStuntCommunication({
      tunables,
      center: centerPlayer,
      adjacentBlocker: looper.blocker,
      complexity: stunt.complexity,
      penetrator: stunt.penetrator,
      looper: stunt.looper,
      stuntRng: presnapRng.fork("stunt"),
    });
    checks.push(outcome.check);

    if (outcome.passedOff) {
      // "Normal matchups resume" — and they resume SWAPPED, which is what a
      // twist is. A stunt the line handles still changes who blocks whom.
      //
      // The FREE RECORD travels with the blocker, and it has to: a stunt can be
      // run by a blitzer nobody blocked, and exchanging only the blockers would
      // leave the other man unblocked with nothing saying when he arrives — a
      // rusher who is on the field, is not blocked, and never gets there.
      const blocker = penetrator.blocker;
      const free = penetrator.free;
      penetrator.blocker = looper.blocker;
      penetrator.free = looper.free;
      looper.blocker = blocker;
      looper.free = free;
      continue;
    }

    // "Free rusher created (the looper). Looper gets unblocked rush at QB."
    looper.blocker = undefined;
    looper.free = {
      origin: "STUNT_LOOPER",
      etaTick: Number((tunables.stunt.looperArrivalSeconds + outcome.arrivalDelaySeconds).toFixed(1)),
      rollRef: outcome.check.roll.rngLabel,
    };
  }

  /**
   * THE INVARIANT, checked rather than assumed: a rusher is blocked or he is
   * free, never neither. "Neither" is a man on the field who is not blocked and
   * never arrives — he would resolve cleanly, produce plausible numbers, and be
   * invisible, which is the failure class Charter §4.1 names. It cannot be
   * expressed in the type today because the two fields are independent; the
   * shape that would fix it is a discriminated union on `blocker`, and that is
   * worth taking the next time this file is touched.
   */
  const plans: RushPlan[] = drafts.map((d) => {
    if (d.blocker === undefined && d.free === undefined) {
      throw new Error(
        `@ff/engine: rusher ${String(d.rusher.bio.id)} is neither blocked nor free after the pre-snap phase`,
      );
    }
    return {
      rusher: d.rusher,
      move: d.move,
      alignment: d.alignment,
      side: d.side,
      blocker: d.blocker,
      free: d.blocker === undefined ? d.free : undefined,
    };
  });

  return {
    plans,
    unaccounted,
    availableBlockers: availableBlockersOf(offense),
    disguise,
    stunts,
    recognition,
    recognized,
    checks,
    routes: hot.routes,
    readOrder: hot.readOrder,
    hotConversions: hot.conversions,
  };
}

interface HotResult {
  readonly routes: readonly RouteAssignment[];
  readonly readOrder: readonly PlayerId[];
  readonly conversions: readonly HotConversion[];
}

/**
 * §5.3's "hot route available", applied.
 *
 * The receiver breaks his route off into the area the card says the pressure
 * vacated, and the quarterback's progression changes to look there first. Both
 * are stated on the card; the engine reads no football out of a formation.
 *
 * The relative order of the hot receivers, and of everybody else, is preserved —
 * a hot conversion changes WHERE he looks first, not the coaching underneath it.
 */
function resolveHotRoutes(
  tunables: Tunables,
  routes: readonly RouteAssignment[],
  readOrder: readonly PlayerId[],
  recognized: boolean,
): HotResult {
  if (!recognized) return { routes, readOrder, conversions: [] };

  const conversions: HotConversion[] = [];
  const converted = routes.map((route): RouteAssignment => {
    const spec = hotRouteOf(route);
    if (spec === undefined) return route;
    conversions.push({
      receiver: route.receiver,
      from: route.routeName,
      to: spec.routeName,
      airYards: spec.airYards,
    });
    return {
      receiver: route.receiver,
      routeName: spec.routeName,
      depthClass: spec.depthClass,
      airYards: spec.airYards,
      // `exactOptionalPropertyTypes` — an omitted break zone is an ABSENT key.
      // A hot spec that does not state one keeps the route's original cell,
      // which is the honest reading: the card said where he goes or it did not.
      ...(spec.breakZone === undefined
        ? route.breakZone === undefined
          ? {}
          : { breakZone: route.breakZone }
        : { breakZone: spec.breakZone }),
    };
  });

  if (conversions.length === 0 || !tunables.presnap.hotRoute.movesToFrontOfProgression) {
    return { routes: converted, readOrder, conversions };
  }

  const isHot = new Set(conversions.map((c) => String(c.receiver)));
  const reordered = [
    ...readOrder.filter((id) => isHot.has(String(id))),
    ...readOrder.filter((id) => !isHot.has(String(id))),
  ];
  return { routes: converted, readOrder: reordered, conversions };
}
