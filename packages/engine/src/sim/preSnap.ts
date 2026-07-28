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
import type {
  BlitzDisguise,
  PlayerId,
  PlayerState,
  Rng,
  StuntCall,
  ThreatOrigin,
} from "@ff/contracts";
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

/**
 * Why a rusher is running free — every `ThreatOrigin` except the won rep, which
 * is §7.1's and belongs to a tick rather than to the snap.
 *
 * Stated as an exclusion rather than as its own three-member union so that the
 * day contracts adds a fifth origin, this list is not quietly a subset: each of
 * these values names a roll made in THIS file, and `RUSH_THREAT.origin` is
 * exactly this value carried through unchanged.
 */
export type FreeRunnerOrigin = Exclude<ThreatOrigin, "WON_REP">;

export interface FreeRunner {
  readonly origin: FreeRunnerOrigin;
  /** Tick at which he reaches the quarterback if nothing changes. */
  readonly etaTick: number;
  /** `rngLabel` of the roll that justifies him (ADR-004). Never synthetic. */
  readonly rollRef: string;
}

/** What every rusher has in common, whoever is or is not blocking him. */
interface RushPlanCommon {
  readonly rusher: PlayerState;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
  readonly side: RunSide | undefined;
}

/**
 * ONE RUSHER, AS THE SNAP FINDS HIM — BLOCKED OR FREE, AND STRUCTURALLY NEITHER
 * BOTH NOR NEITHER (ADR-022's Decision, applying Charter §4.1).
 *
 * This was two independent fields and a runtime invariant that threw. The thing
 * the invariant caught was real — a stunt swap that exchanged blockers without
 * exchanging the free records left a man on the field, unblocked, with no
 * arrival: he would have resolved cleanly, produced plausible numbers, and been
 * invisible. A discriminated union makes that state unsayable instead of
 * detectable, so the check and its test are gone rather than kept as belt and
 * braces that make the shape look optional.
 *
 * The discriminant is `blocker` itself rather than an added `kind`, because
 * "somebody is blocking him" is the fact, and a second field restating it is a
 * second source of truth for it.
 */
export type RushPlan = BlockedRush | FreeRush;

/** Somebody is blocking him: an ordinary §7.1 matchup, rep by rep. */
export interface BlockedRush extends RushPlanCommon {
  readonly blocker: PlayerState;
  readonly free?: undefined;
}

/** Nobody is blocking him: §7.3 / §7.4's free runner, travelling from the snap. */
export interface FreeRush extends RushPlanCommon {
  readonly blocker?: undefined;
  readonly free: FreeRunner;
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

  const scheme = offense.protectionScheme;
  const center = scheme?.center;
  const centerPlayer = center === undefined ? undefined : player(center);
  // §5.3's own +0 row. A card that says nothing is describing the least
  // disguised pressure in the doc's table, which is not a silent default.
  const disguise: BlitzDisguise = defense.blitzDisguise ?? "STANDARD";
  const stunts: readonly StuntCall[] = defense.stunts ?? [];

  // ---- 1. §7.4 step 1: recognition, deterministic -------------------------
  // `slideSide` is reachable only on the SLIDE arm, and the union makes a slide
  // that does not say which way it goes unrepresentable — there is no runtime
  // check here for it any more, because there is no such card (ADR-022).
  const slideSide = scheme?.kind === "SLIDE" ? scheme.slideSide : undefined;
  const declaredAvailable: readonly PlayerId[] = scheme?.available ?? [];
  const available: PlayerId[] = [...declaredAvailable];

  /** A rusher and the blocker the CARD paired him with, if it paired one. */
  interface Accounting {
    readonly common: RushPlanCommon;
    readonly blocker: PlayerState | undefined;
  }

  const accounted: Accounting[] = [];
  const unaccounted: PlayerId[] = [];

  for (const assignment of defense.rush) {
    const rusher = player(assignment.rusher);
    const named = offense.protection.find((p) => p.rusher === assignment.rusher);
    accounted.push({
      common: {
        rusher,
        move: assignment.move,
        alignment: rushAlignmentFor(tunables, rusher.bio.position, assignment.alignment),
        side: assignment.side,
      },
      blocker: named === undefined ? undefined : player(named.blocker),
    });
    if (named === undefined) unaccounted.push(assignment.rusher);
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
  //
  // EVERY BRANCH BELOW RETURNS A `RushPlan`, which is what replaced the old
  // post-hoc "blocked or free, never neither" invariant: the compiler now
  // requires each path to end in one of the two states, so there is no path that
  // can end in neither and nothing left to assert afterwards.
  const checks: CheckEmission[] = [];
  const plans: RushPlan[] = accounted.map(({ common, blocker }): RushPlan => {
    if (blocker !== undefined) return { ...common, blocker };

    // The slide answers its own side without a contest: §7.4 step 1 says
    // "covered", and a covered rusher is an ordinary §7.1 rep from there.
    if (
      slideSide !== undefined &&
      common.side === slideSide &&
      available.length > 0 &&
      tunables.blitzPickup.slideIsUncontested
    ) {
      const slid = available.shift();
      if (slid !== undefined) return { ...common, blocker: player(slid) };
    }

    const bodyId = available.shift();
    if (bodyId === undefined) {
      // §7.4 step 4, the pure case: nobody left to block him. No contest, so no
      // die and no CHECK. The threat points at the §5.3 roll, which is the roll
      // that decided whether the protection adjusted to him.
      return {
        ...common,
        free: {
          origin: "UNBLOCKED",
          etaTick: tunables.blitzPickup.freeRunnerArrivalSeconds,
          rollRef: recognitionRollRef,
        },
      };
    }

    const body = player(bodyId);
    const pickup = resolveBlitzPickup({
      tunables,
      blocker: body,
      rusher: common.rusher,
      recognized,
      pickupRng: presnapRng.fork("pickup"),
    });
    checks.push(pickup.check);
    if (pickup.blocked) return { ...common, blocker: body };

    // He beat the back. The back is still on him in the sense that he had to get
    // through a body — which is what `arrivalDelaySeconds` is — but nobody is
    // blocking him any more, so no §7.1 rep runs.
    return {
      ...common,
      free: {
        origin: "PICKUP_LOST",
        etaTick: Number(
          (tunables.blitzPickup.freeRunnerArrivalSeconds + pickup.arrivalDelaySeconds).toFixed(1),
        ),
        rollRef: pickup.check.roll.rngLabel,
      },
    };
  });

  // ---- 6. §7.3: the twist -------------------------------------------------
  for (const stunt of stunts) {
    const penetratorIndex = plans.findIndex((p) => p.rusher.bio.id === stunt.penetrator);
    const looperIndex = plans.findIndex((p) => p.rusher.bio.id === stunt.looper);
    const penetrator = penetratorIndex < 0 ? undefined : plans[penetratorIndex];
    const looper = looperIndex < 0 ? undefined : plans[looperIndex];
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
      // The two men exchange the WHOLE assignment, blocker or free record
      // together, and the union is what makes that the only expressible swap: a
      // stunt can be run by a blitzer nobody blocked, and exchanging the
      // blockers alone would have left the other man unblocked with nothing
      // saying when he arrives — on the field, not blocked, never getting there.
      plans[penetratorIndex] = withAssignmentOf(penetrator, looper);
      plans[looperIndex] = withAssignmentOf(looper, penetrator);
      continue;
    }

    // "Free rusher created (the looper). Looper gets unblocked rush at QB."
    plans[looperIndex] = {
      rusher: looper.rusher,
      move: looper.move,
      alignment: looper.alignment,
      side: looper.side,
      free: {
        origin: "STUNT_LOOPER",
        etaTick: Number((tunables.stunt.looperArrivalSeconds + outcome.arrivalDelaySeconds).toFixed(1)),
        rollRef: outcome.check.roll.rngLabel,
      },
    };
  }

  return {
    plans,
    unaccounted,
    availableBlockers: declaredAvailable,
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

/**
 * `plan`, with the assignment `from` is carrying — blocker or free record,
 * whichever it is, and never a mixture of the two. §7.3's exchange is two of
 * these, which is why a swap cannot strand anybody: each side is handed a
 * complete assignment, and there is no state in which it is half done.
 */
function withAssignmentOf(plan: RushPlan, from: RushPlan): RushPlan {
  const common: RushPlanCommon = {
    rusher: plan.rusher,
    move: plan.move,
    alignment: plan.alignment,
    side: plan.side,
  };
  return from.blocker === undefined
    ? { ...common, free: from.free }
    : { ...common, blocker: from.blocker };
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
    const spec = route.hot;
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
