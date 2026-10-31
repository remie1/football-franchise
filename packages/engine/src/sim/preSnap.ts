/**
 * THE PRE-SNAP PHASE OF A DROPBACK — §5.3, §7.3 and §7.4, resolved together
 * because they are one decision tree and not three.
 *
 * ================== WHAT THIS MODULE DECIDES ==================
 * Who is blocking whom when the ball is snapped, who is not blocked at all, and
 * whether the receivers are running the routes the card drew or the hot ones,
 * and which check-release men the line wants kept in to block (ADR-073).
 *
 * The order is the doc's own:
 *
 *  1. §7.4 step 1 — RECOGNITION, and no die is thrown for it. A rusher is
 *     ACCOUNTED FOR only when a `ProtectionAssignment` names him. Everything
 *     else is UNACCOUNTED, a slide-side rusher no pairing names included: he is
 *     in `unaccounted` (and so in PLAY_START's `unaccountedRushers`) and he
 *     triggers step 2's roll. The slide answers him at step 4, not here.
 *  1b. §7.4 step 1 READ FROM THE PROTECTION'S SIDE (ADR-026) — a
 *     `ProtectionAssignment` whose named rusher is not in `defense.rush` is a
 *     blocker with nobody to block. He joins the pickup pool at the BACK.
 *  2. §5.3 — the quarterback and the centre roll to SEE the front: when an
 *     unnamed rusher exists, or when a front look shows or moves a man and the
 *     pictures would decide differently (ADR-073 §2.2, `sim/pressureRead.ts`).
 *     A pressure the protection already names, shown as it is played, has
 *     nothing to recognise, so nothing is rolled (ADR-005). The band makes a
 *     PICTURE of the front: who he treats as coming free, and where.
 *  3. §5.3 / §7.4 step 2 — when the picture answers somebody, hot routes
 *     convert and move to the front of the progression. Then what the line
 *     wants done to the protection, if the card gives it the options
 *     (`decideProtection`); the leash decides whether it is done.
 *  4. §7.4 step 3 — each unaccounted rusher is offered to the next available
 *     blocker, in the card's stated priority. Contest per rusher. The one
 *     exception is the SLIDE: on a slide card, a rusher who comes from the slide
 *     side at the snap (the called side, or the one the line checked it to)
 *     takes the first man left in the pickup pool (declared `available`, then
 *     any check-release men the line kept in, then ADR-026's unblocked
 *     protectors) WITHOUT a contest, when `blitzPickup.slideIsUncontested`
 *     holds. He was still unaccounted at step 1.
 *  5. §7.4 step 4 — anybody left, or anybody who beat his pickup, is a FREE
 *     RUNNER with an ETA. Not a teleport: a rusher with a short clock, and since
 *     ADR-031 a clock that reads WHERE HE STARTED — his alignment and the depth
 *     his position lines up at — rather than one constant for every rusher on
 *     the field (`freeRunnerArrivalSecondsFor`).
 *  6. §7.3 — stunts resolve last, because a twist is an exchange between two
 *     men whose blockers step 4 may just have decided.
 *
 * ================== THREE STAGES, CALLED APART (ADR-073 3.2a) ==================
 * One decision tree, but not one call. `simulatePassPlay` calls it in three
 * stages, around the coverage read and the leash (ADR-073 §2.4):
 *
 *  - `readPreSnap` — steps 1 to 3: who the call accounts for, whether he saw
 *    what it did not, and the routes he will run.
 *  - `resolvePickups` — steps 4 and 5: who picks up whom, and who runs free.
 *  - `resolveStunts` — step 6.
 *
 * Between the first and the second, the quarterback reads the coverage on the
 * routes he will run and the leash decides what he may change, so that a
 * decision the pressure read wants (ADR-073 §2.3: keep a back in, check the
 * slide) reaches the protection before anybody is picked up, if the leash lets
 * it. `simulatePassPlay` hands `resolvePickups` the pool and the slide side as
 * run: what `readPreSnap` read off the card when nothing was made. Moving the
 * work moved no die: a fork is a pure function of its parent's seed and its own
 * label, not of what the parent has drawn (`createRng`), and every die in this
 * file is forked by its own label. So a pickup's dice are the same dice whether
 * the coverage read and the leash were rolled before it or not.
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
import { freeRunnerArrivalSecondsFor, rushAlignmentFor } from "../resolve/rushThreat.js";
import type { Tunables } from "../tunables.js";
import type {
  HotConversion,
  PlayCalls,
  PressurePicture,
  RouteAssignment,
  RunGap,
  RunSide,
  RushAlignment,
  RushMove,
} from "../types.js";
import {
  accountFront,
  decideProtection,
  pictureSets,
  picturesDecideAlike,
  type ProtectionWant,
} from "./pressureRead.js";

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
  /**
   * ADR-089 step 1 — the band of the pickup or stunt CHECK `rollRef` names (`RAN_THROUGH` or
   * `BLOWN_UP`; `LATE_EXCHANGE` or `LOOPER_FREE`), absent for UNBLOCKED, which no contest decided.
   * §4.0's approach card reads it (`resolve/approach.ts`). Engine-internal: no event carries a
   * `FreeRunner`, and §7.3's swap moves it whole with the rest of the record (`withAssignmentOf`).
   */
  readonly band?: string;
}

/** What every rusher has in common, whoever is or is not blocking him. */
interface RushPlanCommon {
  readonly rusher: PlayerState;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
  readonly side: RunSide | undefined;
  /**
   * ADR-065's gap, carried only for the PLAY_START echo (ADR-073 step 3.1).
   * Nothing in the pass sim reads it. A REQUIRED key, `undefined` when the card
   * said nothing, so every plan rebuild (the stunt code's two) fails to compile
   * until it carries it, instead of dropping it on every stunt snap.
   */
  readonly gap: RunGap | undefined;
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

/** A rusher and the blocker the CARD paired him with, if it paired one (step 1). */
export interface AccountedRusher {
  readonly common: RushPlanCommon;
  readonly blocker: PlayerState | undefined;
}

/**
 * STAGE ONE'S ANSWER: steps 1, 1b, 2 and 3. Who the call accounts for, whether
 * he saw what it did not, the routes as called after the hot conversions, and
 * what the line wants done to the protection. Nobody has been picked up yet and
 * no line game has run, so nothing here says who is blocking whom at the snap;
 * that is `resolvePickups` and then `resolveStunts`. Nor is anything here the
 * protection AS RUN: when the leash makes the adjustment, `simulatePassPlay`
 * runs its own pool, routes and progression (ADR-073 §2.4 step 9).
 */
export interface PreSnapRead {
  /** Every played rusher, in `defense.rush` order, with his card pairing if any. */
  readonly accounted: readonly AccountedRusher[];
  /** Rushers no `ProtectionAssignment` named — a fact about the CALL. */
  readonly unaccounted: readonly PlayerId[];
  /**
   * THE POOL AS THE CARD OFFERS IT, in pickup priority: the card's own `available`
   * list first, then ADR-026's unblocked protectors at the back. Snapshotted
   * before anybody is taken out of it, so it states who COULD have been used and
   * never who was — whether a body ended up on somebody is the `blitz_pickup`
   * CHECK's business, and there is no die here (ADR-004/ADR-005). It is the pool
   * at the snap only when no adjustment is made; a made one puts the kept-in men
   * between the two parts (`simulatePassPlay`'s pool as run).
   */
  readonly availableBlockers: readonly PlayerId[];
  /**
   * ADR-026 — the tail of `availableBlockers`: protectors the card paired with a
   * man who is not in `defense.rush`. Stated separately so a consumer can tell
   * "the card kept him in to scan" from "his man did not come", and so the two
   * lists are not added together by anybody counting bodies.
   */
  readonly unblockedProtectors: readonly PlayerId[];
  /** The head of `availableBlockers`: the card's own `available` list, in its order. */
  readonly declaredAvailable: readonly PlayerId[];
  /** The side a SLIDE card slides to, as called; `undefined` on any other card. */
  readonly slideSide: RunSide | undefined;
  /** The centre the card names, if it names one. §5.3 and §7.3 both read him. */
  readonly center: PlayerState | undefined;
  readonly disguise: BlitzDisguise;
  readonly stunts: readonly StuntCall[];
  /** §5.3. Absent when the read did not roll (ADR-073 §2.2's trigger). */
  readonly recognition: PresnapEmission | undefined;
  /**
   * The band is one of the top three, the TRUE and COUNT pictures: §5.3's success, and what the
   * centre's point-out reads on every contested pickup (`blitzPickup.recognitionModifier`).
   */
  readonly recognized: boolean;
  /** ADR-073 §2.2 — the picture the band made of the front. Present iff the read rolled. */
  readonly pressurePicture: PressurePicture | undefined;
  /**
   * ADR-073 §2.3 — what the line wants done to the protection on that picture, if anything.
   * `undefined` when it wants nothing, and always when the read did not roll: with no picture
   * there is nothing to decide from.
   */
  readonly protectionWanted: ProtectionWant | undefined;
  /**
   * `rngLabel` of §5.3's roll, which an UNBLOCKED free runner points at
   * (ADR-004). Empty when no roll was thrown, and then nobody is unaccounted, so
   * nobody can end up UNBLOCKED and nothing reads it.
   */
  readonly recognitionRollRef: string;
  /**
   * The routes as called, after any hot conversion. A man kept in by a made adjustment gives
   * his up at the snap, so these are the routes he will run only when none is made.
   */
  readonly routes: readonly RouteAssignment[];
  /** The progression, after hot receivers move to the front; a man kept in leaves it at the snap. */
  readonly readOrder: readonly PlayerId[];
  readonly hotConversions: readonly HotConversion[];
}

/** Stages two and three: every played rusher, blocked or free, and the CHECKs rolled to decide it. */
export interface RushPlans {
  /** One plan per played rusher, in `defense.rush` order. */
  readonly plans: readonly RushPlan[];
  /** The CHECKs this stage rolled, in the order it rolled them. */
  readonly checks: readonly CheckEmission[];
}

/**
 * STAGE ONE: steps 1, 1b, 2 and 3 — accounting, §5.3's roll and its picture, the hot routes,
 * and what the line wants done to the protection.
 *
 * Its one die is `presnap/blitzRecognition`, thrown iff ADR-073 §2.2's trigger fires.
 */
export function readPreSnap(args: {
  /** Required, never defaulted: a missed call site must be a compile error. */
  readonly tunables: Tunables;
  readonly calls: PlayCalls;
  readonly quarterback: PlayerState;
  readonly presnapRng: Rng;
  readonly player: (id: PlayerId) => PlayerState;
}): PreSnapRead {
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
  // R, S and N, and what they give (ADR-073 §2.2): the extras, the ghosts and the moved men,
  // the card's declared pool and ADR-026's windfalls. No die.
  const front = accountFront(tunables, calls, player);
  const declaredAvailable = front.declaredAvailable;

  // ---- 1b. ADR-026: A PROTECTOR WITH NOBODY TO BLOCK ----------------------
  //
  // The loop below looks protection up BY RUSHER, so a `ProtectionAssignment`
  // naming a man who is not in `defense.rush` is never consulted at all: the
  // blocker it names was paired to nobody and appeared in no list. He was on the
  // field doing nothing, and nothing in the stream said so — the engine making a
  // football claim ("a lineman whose man dropped out is idle") by omission,
  // which is the ADR-022 TRIPLE class of defect and not a resolution.
  //
  // THE CHECK IS ARITHMETIC ABOUT THE CALL'S OWN ARGUMENTS, and deliberately
  // nothing more: does this protection entry name a man who is in `rush`? Two
  // lists that are both already on `PlayCalls` and already validated. WHY his
  // man is not rushing — the offence guessed the front wrong, the defence
  // dropped him into coverage — is the caller's business and the engine reads
  // none of it. Nor does it read his `Position`: "a tackle holds his edge, a
  // guard scans" is football (ADR-026's option 3), and it would need
  // `ProtectionCall` to say so before the engine could act on it.
  //
  // AT THE BACK, and the order is the decision. A card that named a man in
  // `available` stated an intention for him; a protector whose man did not come
  // is a windfall, not a plan, so he is offered only after the men the card
  // nominated. He becomes AVAILABLE and not assigned: whether he picks anybody
  // up is `resolveBlitzPickup`'s roll on its own stated terms, and if nobody
  // needs him he stays in the pool unused, which `availableBlockers` says.
  //
  // NOT A DUPLICATE OF ANYTHING: `assertCoherentPlayCall` already rejects a man
  // who is both assigned a block and listed as available, and rejects the same
  // blocker twice in `protection`, so the concatenation cannot repeat a name. It
  // is not defended against here, because absorbing an incoherent card quietly
  // is the failure this whole module is written against.
  // (`accountFront` does the arithmetic: the protection entries whose man is not in R.)
  const unblockedProtectors = front.unblockedProtectors;

  /** Pickup priority, snapshotted before step 4 starts taking men out of it. */
  const pickupPool: readonly PlayerId[] = [...declaredAvailable, ...unblockedProtectors];

  const accounted: AccountedRusher[] = [];
  // The extras, which `accountFront` counts on the same rule: no pairing names him.
  const unaccounted: readonly PlayerId[] = front.extras.map((e) => e.rusher);

  for (const assignment of defense.rush) {
    const rusher = player(assignment.rusher);
    const named = offense.protection.find((p) => p.rusher === assignment.rusher);
    accounted.push({
      common: {
        rusher,
        move: assignment.move,
        alignment: rushAlignmentFor(tunables, rusher.bio.position, assignment.alignment),
        side: assignment.side,
        gap: assignment.gap,
      },
      blocker: named === undefined ? undefined : player(named.blocker),
    });
  }

  // ---- 2. §5.3: does he see it? -------------------------------------------
  // ADR-073 §2.2's trigger: (a) an unnamed rusher exists, today's trigger and
  // the one that keeps every UNBLOCKED `rollRef` pointing at a real read; or
  // (b) a front look shows a ghost or moves a man AND the four pictures would
  // not all decide alike. With no look there is no picture work at all. A die
  // nothing would turn on is not thrown, and an absent check means "no die was
  // thrown" (ADR-005).
  const looked = front.ghosts.length > 0 || front.moved.length > 0;
  const rolls = unaccounted.length > 0 || (looked && !picturesDecideAlike({ tunables, calls, front }));
  let recognition: PresnapEmission | undefined;
  let recognized = false;
  let recognitionRollRef = "";
  let pressurePicture: PressurePicture | undefined;
  if (rolls) {
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
    pressurePicture = { picture: outcome.picture, ...pictureSets(outcome.picture, front) };
  }

  // ---- 3. §5.3 / §7.4 step 2: hot routes, on the answer set ---------------
  // Every hot route converts iff the picture answers somebody (ADR-073 §2.3):
  // on an honest front that is exactly the top three bands.
  const answered = pressurePicture !== undefined && pressurePicture.answers.length > 0;
  const hot = resolveHotRoutes(tunables, offense.routes, offense.readOrder, answered);

  // ---- and what the line wants done to the protection (ADR-073 §2.3) -----
  // Decided on the picture, after the hot routes (§2.4 steps 3 and 4). Wanted
  // is not made: the leash decides that, after the coverage read.
  const protectionWanted =
    pressurePicture === undefined
      ? undefined
      : decideProtection({
          tunables,
          scheme,
          front,
          picture: pressurePicture.picture,
          sets: pressurePicture,
          routes: hot.routes,
          readOrder: hot.readOrder,
          hotConverted: new Set(hot.conversions.map((c) => String(c.receiver))),
        });

  return {
    accounted,
    unaccounted,
    availableBlockers: pickupPool,
    unblockedProtectors,
    declaredAvailable,
    slideSide,
    center: centerPlayer,
    disguise,
    stunts,
    recognition,
    recognized,
    pressurePicture,
    protectionWanted,
    recognitionRollRef,
    routes: hot.routes,
    readOrder: hot.readOrder,
    hotConversions: hot.conversions,
  };
}

/**
 * STAGE TWO: steps 4 and 5 — the slide, the pickup contests, and the free
 * runners. Its dice are `presnap/pickup` then `${blocker}:pickup` and
 * `${rusher}:blitz`, one pair per contested pickup.
 *
 * It reads the pool and the slide side as arguments rather than off the card,
 * because they are the protection AS RUN: the bodies offered, in the order
 * offered, and the side slid to: the card's own protection as `readPreSnap` read
 * it, or, when the leash let the line adjust it, the effective call's (ADR-073
 * §2.3: the kept-in men after the declared ones, and the checked slide side).
 */
export function resolvePickups(args: {
  readonly tunables: Tunables;
  readonly accounted: readonly AccountedRusher[];
  /** The pickup pool in priority order. Copied, never consumed. */
  readonly pool: readonly PlayerId[];
  readonly slideSide: RunSide | undefined;
  /** The read's band was one of the top three: the centre's point-out, on every pickup as a modifier. */
  readonly recognized: boolean;
  /** What an UNBLOCKED free runner points at (`PreSnapRead.recognitionRollRef`). */
  readonly recognitionRollRef: string;
  readonly presnapRng: Rng;
  readonly player: (id: PlayerId) => PlayerState;
}): RushPlans {
  const { tunables, accounted, slideSide, recognized, recognitionRollRef, presnapRng, player } = args;
  const available: PlayerId[] = [...args.pool];

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
    // "covered", and a covered rusher is an ordinary §7.1 rep from there. He
    // was still counted unaccounted above, so he has already triggered the
    // §5.3 roll and is in `unaccountedRushers`; the slide is applied here.
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
          // ADR-030 petition 1, ratified: the clock reads WHERE HE STARTED —
          // his alignment and the depth his position lines up at — instead of
          // being the same number for a nose tackle and a blitzing safety.
          // Nobody laid a hand on him, so there is no pickup delay to add.
          etaTick: freeRunnerArrivalSecondsFor(
            tunables,
            common.alignment,
            common.rusher.bio.position,
            0,
          ),
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
        // The same path, plus §7.4 step 3's own delay for the body he had to get
        // through. Two terms, both stated: where he started, and what it cost him
        // to beat the back.
        etaTick: freeRunnerArrivalSecondsFor(
          tunables,
          common.alignment,
          common.rusher.bio.position,
          pickup.arrivalDelaySeconds,
        ),
        rollRef: pickup.check.roll.rngLabel,
        band: pickup.band,
      },
    };
  });

  return { plans, checks };
}

/**
 * STAGE THREE: step 6 — §7.3's line games, last, on the plans stage two left.
 * Its die is `presnap/stunt` then `${looper}:stunt`, one per line game that
 * names two played rushers.
 */
export function resolveStunts(args: {
  readonly tunables: Tunables;
  /** `PreSnapRead.center`: §7.3's second term. */
  readonly center: PlayerState | undefined;
  readonly stunts: readonly StuntCall[];
  /** Stage two's plans. Copied, never mutated. */
  readonly plans: readonly RushPlan[];
  readonly presnapRng: Rng;
}): RushPlans {
  const { tunables, center, stunts, presnapRng } = args;
  const plans: RushPlan[] = [...args.plans];
  const checks: CheckEmission[] = [];

  // ---- 6. §7.3: the twist -------------------------------------------------
  for (const stunt of stunts) {
    const penetratorIndex = plans.findIndex((p) => p.rusher.bio.id === stunt.penetrator);
    const looperIndex = plans.findIndex((p) => p.rusher.bio.id === stunt.looper);
    const penetrator = penetratorIndex < 0 ? undefined : plans[penetratorIndex];
    const looper = looperIndex < 0 ? undefined : plans[looperIndex];
    if (penetrator === undefined || looper === undefined) continue;

    const outcome = resolveStuntCommunication({
      tunables,
      center,
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
      gap: looper.gap,
      free: {
        origin: "STUNT_LOOPER",
        etaTick: Number((tunables.stunt.looperArrivalSeconds + outcome.arrivalDelaySeconds).toFixed(1)),
        rollRef: outcome.check.roll.rngLabel,
        band: outcome.band,
      },
    };
  }

  return { plans, checks };
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
    gap: plan.gap,
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
  /** The pressure read's picture answers somebody (ADR-073 §2.3). */
  answered: boolean,
): HotResult {
  if (!answered) return { routes, readOrder, conversions: [] };

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
