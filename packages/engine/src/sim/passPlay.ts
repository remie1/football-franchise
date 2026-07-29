/**
 * The pass-play vertical slice: snap → tick loop → throw → catch → PLAY_RESULT.
 *
 * Pure: `(MatchGameState, PlayCalls, seed) → { events, newState }`. No I/O, no
 * globals, no mutation of the inputs, no randomness outside the injected PRNG.
 *
 * Out of slice by design (docs/design/match-engine.md sections not implemented
 * here): YAC (§13), the run game (§14), option routes (§9.5), §8.6's unseen
 * defender, penalties, weather/stamina/crowd noise (§16).
 *
 * §9.4 ZONE COVERAGE is live. Coverage is stated PER ASSIGNMENT rather than per
 * call, because a single `coverage: "MAN"` flag on the whole defence cannot
 * express what defences actually play — man underneath with a zone robber, three
 * deep and matched below, a fire zone with an end dropping. A receiver named by
 * no man assignment is played by whatever zone his route breaks into, and if
 * nobody is responsible for that cell he is uncovered, which is what a hole in a
 * zone is.
 *
 * §12 TIPPED BALLS is live. A deflection no longer terminates the play: the ball
 * is live, its recoverability is rolled, and every player near it gets an attempt
 * in Reaction order. A defensive recovery is an interception — a real source of
 * them the engine has never had.
 *
 * §7.2's "throw, move, or take hit" is complete as of the time-of-arrival patch:
 * a won rep starts a rusher TRAVELLING (`resolve/rushThreat.ts`), and the
 * quarterback answers with a stand-in, a climb, or an escape
 * (`resolve/pocketMovement.ts`, `resolve/scramble.ts`).
 *
 * §8.1's THREE READING SYSTEMS are live as of the progression patch. Before it,
 * the read pointer skipped past any receiver whose route had not developed, so
 * the quarterback's first look was whichever route happened to be ready — "throw
 * to whoever is open first" — and half-field, full-field and concept were the
 * same quarterback with different labels (CALIBRATION-BACKLOG 2b). He now works
 * his progression IN ORDER and does not skip; what differs between systems is
 * how well he can turn it loose BEFORE the break (`resolve/anticipation.ts`),
 * how long he will hold (§8.7's budget, which moves with anticipation rather
 * than separately from it), and how many reads he gets before the outlet.
 *
 * §5.3 / §7.3 / §7.4 ARE LIVE, and they retired the last `UnsupportedPlayCallError`
 * in the engine. A rusher no `ProtectionAssignment` names used to be refused;
 * `sim/preSnap.ts` now answers him — the slide takes him, the back who stayed in
 * contests him, or he is a FREE RUNNER with a time of arrival. That refusal was
 * what forced every caller to build blocking against the actual defensive card,
 * so protection was perfectly informed and pressure was biased downward
 * (`CALIBRATION-BACKLOG.md` entry 21).
 */
import { createRng, getAttr, playId as makePlayId } from "@ff/contracts";
import type { PlayerId, PlayerState, Rng, RushThreatState } from "@ff/contracts";
import { ATTR } from "../attrs.js";
import { chemistryLevel } from "../chemistry.js";
import { PlayEventLog } from "../events.js";
import { clamp, flatModifier } from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type { Tunables } from "../tunables.js";
import type {
  ContestPosition,
  CoverageShell,
  CoverageTechnique,
  FieldZone,
  MatchGameState,
  PassPlayStartPayload,
  PlayCalls,
  RouteAssignment,
  RunSide,
  RushAlignment,
  RushMove,
  SimulationResult,
  ThrowType,
} from "../types.js";
import { assertCoherentPlayCall } from "../validate/playCall.js";
import { applyPlayOutcome } from "./outcome.js";
import type { PlayOutcome } from "./outcome.js";
import { resolvePreSnap } from "./preSnap.js";
import type { PreSnapResult, RushPlan } from "./preSnap.js";
import type { Pursuer } from "../resolve/ballCarrier.js";
import {
  advanceCarrier,
  depthOfVerticalZone,
  zoneOfDefender,
} from "../resolve/ballCarrier.js";
import { anticipationAvailable, resolveAnticipation } from "../resolve/anticipation.js";
import type { CatchOutcome } from "../resolve/catchResolution.js";
import { catchTypeFor, resolveCatch } from "../resolve/catchResolution.js";
import { resolveManCoverage } from "../resolve/manCoverage.js";
import { backfieldZone, routeZone, zoneDefenderFor } from "../resolve/zone.js";
import {
  brokeOnBallContestModifier,
  resolveZoneCoverage,
  resolveZoneRead,
  settledOpennessAt,
} from "../resolve/zoneCoverage.js";
import type { DeflectionPoint, RecoveryCandidate } from "../resolve/tippedBall.js";
import {
  eligibleRecoverers,
  recoveryOrder,
  resolveDeflectionQuality,
  resolveRecoveryAttempt,
} from "../resolve/tippedBall.js";
import type { PocketStatusRung } from "../resolve/pocket.js";
import { advancePressure, forcesDecision, pocketStatusFor, sacksWithoutTarget } from "../resolve/pocket.js";
import { resolvePocketMovement } from "../resolve/pocketMovement.js";
import { resolvePassRushTick } from "../resolve/passRush.js";
import type { PassRushBandLabel } from "../resolve/passRush.js";
import {
  maxReadsFor,
  readCapacityPerTick,
  resolveQbRead,
  throwThresholdFor,
  timeBudgetSeconds,
} from "../resolve/qbRead.js";
import { resolveReleaseVsPress } from "../resolve/release.js";
import type { RoutePhase } from "../resolve/route.js";
import { opennessAt, routePhaseAt, routeReadySeconds } from "../resolve/route.js";
import type { ArrivalClock, RushThreat } from "../resolve/rushThreat.js";
import {
  arrivedAt,
  clearsThreat,
  delayThreat,
  hasArrived,
  minTimeToArrival,
  nearestThreat,
  recoverySecondsFor,
  resolvedRushAssignment,
  soonerThreat,
  startsThreat,
  threatFromWonRep,
} from "../resolve/rushThreat.js";
import {
  pursuitDeadline,
  resolveScramble,
  scrambleOpennessAt,
  visionConeRollModifier,
} from "../resolve/scramble.js";
import { selectTarget } from "../resolve/targetSelection.js";
import type { TargetCandidate } from "../resolve/targetSelection.js";
import {
  armStrengthShortfall,
  laneDefenderEligible,
  resolveAccuracy,
  resolvePassingLane,
  selectThrowType,
} from "../resolve/throwExecution.js";

interface RushMatchup {
  readonly rusher: PlayerState;
  /**
   * `undefined` is a FREE RUNNER (§7.3 / §7.4) — nobody is blocking him, so no
   * §7.1 rep runs, nothing can reset him, and his threat exists from the snap.
   *
   * This is what the engine used to reject with `UnsupportedPlayCallError`. An
   * unblocked rusher is football; refusing him forced every caller to build
   * protection against the actual defensive card, which is `CALIBRATION-BACKLOG`
   * entry 21's perfectly-informed protection.
   */
  readonly blocker: PlayerState | undefined;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
  /**
   * ADR-018 petition 2 — which side of the centre he came from, as the card
   * stated it. The engine does NOT pair protection by it: `ProtectionAssignment`
   * states the blocker↔rusher pairing and playbook is what forms it. It is
   * carried so that the geometry the play was simulated with reaches PLAY_START,
   * exactly as `alignment` does — a consumer that can see a resolved alignment
   * and cannot see which side it was on can still be looking at an impossible
   * matchup that resolved cleanly.
   *
   * `undefined` where the card said nothing, and never defaulted: unlike
   * `alignment` there is no tunable to default it from, and guessing a side is
   * the fabricated geometry the petition exists to remove.
   */
  readonly side: RunSide | undefined;
  pressure: number;
  previousBand: PassRushBandLabel | undefined;
  /** Set when he beats the block; cleared when the blocker resets him. */
  threat: RushThreat | undefined;
  /** Whether the CURRENT threat's arrival has already been published (ADR-007). */
  announcedArrival: boolean;
}

/**
 * A free runner's threat starts at the snap, before the first tick.
 *
 * `origin` and `rollRef` are the pre-snap phase's, carried through unchanged:
 * §7.4 step 4's `UNBLOCKED` naming the §5.3 recognition, §7.4 step 3's
 * `PICKUP_LOST` naming the pickup contest, §7.3's `STUNT_LOOPER` naming the
 * exchange. Nothing is decided here.
 */
function freeRunnerThreat(plan: RushPlan): RushThreat | undefined {
  if (plan.free === undefined) return undefined;
  return {
    rusher: plan.rusher.bio.id,
    alignment: plan.alignment,
    origin: plan.free.origin,
    wonAtTick: 0,
    etaTick: plan.free.etaTick,
    rollRef: plan.free.rollRef,
  };
}

/** The quarterback outside the pocket (§8.8), on pursuit's clock. */
interface ScrambleState {
  readonly sinceTick: number;
  readonly pursuitAtTick: number;
  /** §8.8 escape roll — what justifies the pursuit clock. Never a RUSH_THREAT. */
  readonly escapeRollRef: string;
}

/**
 * How this receiver is being played. Man is a person; zone is a CELL, which may
 * or may not have somebody standing in it — and "may not" is the whole point of
 * attacking a zone.
 */
type TrackCoverage =
  | { readonly kind: "MAN"; readonly defender: PlayerState; readonly technique: CoverageTechnique }
  | { readonly kind: "ZONE"; readonly defender: PlayerState | undefined };

interface ReceiverTrack {
  readonly assignment: RouteAssignment;
  readonly receiver: PlayerState;
  readonly coverage: TrackCoverage;
  /** §3 — the cell this route breaks into. Where the ball is if it is tipped. */
  readonly zone: FieldZone;
  readonly pressed: boolean;
  /** §9.4 — he found the hole and sat down in it, so coverage stops closing. */
  settled: boolean;
  jamDelaySeconds: number;
  readySeconds: number;
  releaseReceiverMod: number | undefined;
  releaseDefenderMod: number | undefined;
  baseOpenness: number | undefined;
  contestPosition: ContestPosition;
  lastPhase: RoutePhase | undefined;
  lastOpenness: number | undefined;
  lastRead: { perceived: number; effective: number } | undefined;
  /** §8.1 — whether the progression itself ever got to him (vs. the outlet look). */
  reachedInProgression: boolean;
  /** §8.8 scramble drill: openness the receiver had when the QB left the pocket. */
  scrambleBaseOpenness: number | undefined;
}

function requirePlayer(state: MatchGameState, id: PlayerId): PlayerState {
  const p = state.players[id as unknown as string];
  if (p === undefined) throw new Error(`@ff/engine: player ${String(id)} is not in GameState.players`);
  return p;
}

/** Whoever is close enough to this receiver to contest a ball, if anyone is. */
function coverageDefender(track: ReceiverTrack): PlayerState | undefined {
  return track.coverage.defender;
}

export function simulatePassPlay(
  state: MatchGameState,
  calls: PlayCalls,
  seed: string,
  /**
   * ADR-012's open item, closed. OPTIONAL here and REQUIRED everywhere beneath:
   * this is the barrel's own surface, which is where ergonomics belong, and the
   * default is safe precisely because nothing under it has one — a resolver that
   * forgot to take tunables is a compile error rather than a silent fallback.
   */
  tunables: Tunables = TUNABLES,
): SimulationResult {
  // ADR-006 — internal coherence only, before a single die is thrown. A card the
  // engine cannot resolve is rejected loudly; a card that is merely unrealistic
  // is franchise's problem, checked at authoring time, not here.
  assertCoherentPlayCall(state, calls);

  const playId = makePlayId(`${String(state.gameId)}:play:${state.playNumber}`);
  const log = new PlayEventLog(state.gameId, playId, state.at, state.nextEventSeq);
  const qb = requirePlayer(state, state.quarterback);

  const playRng = createRng(seed, `game:${String(state.gameId)}`).fork(`play:${state.playNumber}`);
  // §5 pre-snap gets its own subsystem fork, so a blitz that is recognised
  // cannot shift the stream of any check that follows it.
  const presnapRng = playRng.fork("presnap");
  const rushRng = playRng.fork("rush");
  const coverageRng = playRng.fork("coverage");
  const qbReadRng = playRng.fork("qbread");
  const movementRng = playRng.fork("movement");
  const throwRng = playRng.fork("throw");
  const catchRng = playRng.fork("catch");
  // §12's two rolls get their own subsystem fork so a tip cannot shift the
  // stream of any check that precedes it.
  const tipRng = playRng.fork("tip");
  // §13/§14 — everything that happens once somebody has the ball in his hands.
  const carrierRng = playRng.fork("carrier");

  // ---- §5 PRE-SNAP ---------------------------------------------------------
  // Resolved BEFORE PLAY_START is logged, because it decides what PLAY_START has
  // to say: which routes were actually run (§5.3's hot conversion), what order
  // he worked them in, and who was blocking whom at the snap. The EVENTS are
  // emitted after PLAY_START, which is the order they happened in relative to
  // the play's own header.
  const preSnap = resolvePreSnap({
    tunables,
    state,
    calls,
    quarterback: qb,
    presnapRng,
    player: (id) => requirePlayer(state, id),
  });

  const matchups = buildMatchups(preSnap);
  const tracks = buildReceiverTracks(tunables, state, calls, preSnap.routes);
  const recoverySpots = buildRecoverySpots(tunables, state, calls, tracks);

  const system = calls.offense.readSystem;
  const budgetSeconds = timeBudgetSeconds(tunables, qb, system);
  const maxReads = maxReadsFor(tunables, system);
  const throwThreshold = throwThresholdFor(tunables, system);
  const readOrder = preSnap.readOrder.filter((id) =>
    tracks.some((t) => t.assignment.receiver === id),
  );

  const startPayload: PassPlayStartPayload = {
    kind: "PASS_PLAY_V1",
    offense: {
      team: state.offenseTeam,
      call: calls.offense.name,
      formation: calls.offense.formation,
      quarterback: state.quarterback,
      readSystem: system,
      // The routes he RAN, which on a recognised blitz is not the routes the card
      // drew. `hotConversions` states the difference.
      routes: preSnap.routes,
      // Filtered, not echoed: this is the progression he actually worked.
      readOrder,
      protection: calls.offense.protection,
      availableBlockers: preSnap.availableBlockers,
      unblockedProtectors: preSnap.unblockedProtectors,
      hotConversions: preSnap.hotConversions,
    },
    defense: {
      team: state.defenseTeam,
      call: calls.defense.name,
      front: calls.defense.front,
      // Derived, not echoed: with per-assignment coverage, MIXED is the honest
      // answer for most real defences and no input field can state it.
      coverage: coverageShellFor(calls),
      assignments: calls.defense.assignments,
      // Alignment resolved, not echoed: it is the input the §7.2 arrival model
      // actually ran on, and the only place the stream states it. Side carried
      // through unresolved (ADR-018) — see `resolvedRushAssignment`.
      rush: matchups.map((m) =>
        resolvedRushAssignment({
          rusher: m.rusher.bio.id,
          move: m.move,
          alignment: m.alignment,
          side: m.side,
        }),
      ),
      unaccountedRushers: preSnap.unaccounted,
      blitzDisguise: preSnap.disguise,
      stunts: preSnap.stunts,
    },
    situation: {
      down: state.down,
      distance: state.distance,
      ballOn: state.ballOn,
      clockSeconds: state.clockSeconds,
    },
  };
  log.setTick(undefined);
  log.playStart(startPayload);

  // §5.3's recognition, then §7.4's pickups and §7.3's exchanges. Emitted after
  // PLAY_START and before the first TICK, which is where they belong: they
  // happened before the snap.
  if (preSnap.recognition !== undefined) log.presnapRead(preSnap.recognition);
  for (const check of preSnap.checks) log.check(check);

  /** §8.1 — where he is in the progression. Wraps; it does NOT skip. */
  let readPointer = 0;
  /** §8.1 "max reads before checkdown" — progression steps actually completed. */
  let readsUsed = 0;
  let readAccumulator = 0;
  /**
   * Monotonic across the whole play so no two reads can share a PRNG fork label
   * — a QB with reads to spare may look at the same (only readable) receiver
   * twice in one tick, and ADR-004 requires each roll to be its own roll.
   */
  let readIndex = 0;
  /** Same, for §8.1's anticipation rolls, which are not progression steps. */
  let anticipationIndex = 0;
  let outcome: PlayOutcome | undefined;
  let tick: number = tunables.clock.firstTick;
  let stepUpsUsed = 0;
  let scramble: ScrambleState | undefined;

  /**
   * ADR-007 — every threat transition is published, not inferred. ADR-022: the
   * threat states its own `origin`, so the publisher never has to work out why a
   * rusher is coming from where in the play it happens to be standing.
   */
  const publishThreat = (threat: RushThreat, state: RushThreatState): void => {
    log.rushThreat(threat.rusher, threat.alignment, threat.origin, threat.rollRef, threat.etaTick, state);
  };

  // §7.3 / §7.4 — a free runner is TRAVELLING from the snap. He is published
  // here, pre-snap, because that is when he started: no rep created him, so
  // there is no tick at which he "won". Which of the three snap-time origins he
  // is, and which roll justifies him, travels on the event.
  for (const m of matchups) {
    if (m.threat !== undefined) publishThreat(m.threat, "TRAVELLING");
  }

  /**
   * §9.3 / §9.4 — resolve the break point. Called from the route loop when the
   * route's time comes, and from the read loop when the quarterback ANTICIPATES
   * it: a ball thrown on timing arrives as the receiver comes out of his cut, so
   * the coverage rep that decides the window is the same rep, resolved at the
   * same point of the route, whether or not the QB waited to watch it.
   *
   * Which rep it is depends on how HE is being played, not on how the defence is
   * described — which is the entire reason coverage moved onto the assignment.
   */
  const resolveBreakPoint = (track: ReceiverTrack): void => {
    if (track.baseOpenness !== undefined) return;
    // Forked per receiver rather than drawn from a shared stream: a receiver's
    // rep must not depend on the order the QB happened to look at people.
    const rng = coverageRng.fork(String(track.assignment.receiver));

    if (track.coverage.kind === "MAN") {
      const coverage = resolveManCoverage({
        tunables,
        receiver: track.receiver,
        defender: track.coverage.defender,
        coverageRng: rng,
        ...(track.releaseReceiverMod === undefined ? {} : { receiverReleaseModifier: track.releaseReceiverMod }),
        ...(track.releaseDefenderMod === undefined ? {} : { defenderReleaseModifier: track.releaseDefenderMod }),
      });
      log.check(coverage.check);
      track.baseOpenness = coverage.openness;
      track.contestPosition = coverage.contestPosition;
      return;
    }

    const defender = track.coverage.defender;
    if (defender === undefined) {
      // §9.4 step 2 — nobody is responsible for this cell. There is no contest,
      // so there is no die and no CHECK (ADR-005: an absent check means no roll
      // was made, never a failed one). A hole in a zone is not a won rep.
      track.baseOpenness = tunables.zoneCoverage.uncoveredOpenness;
      track.contestPosition = tunables.zoneCoverage.uncoveredContestPosition;
      track.settled = true;
      return;
    }

    const zone = resolveZoneCoverage({ tunables, receiver: track.receiver, defender, coverageRng: rng });
    log.check(zone.check);
    track.baseOpenness = zone.openness;
    track.contestPosition = zone.contestPosition;
    track.settled = zone.settled;
  };

  /**
   * A SACK IS AN OUTCOME AND THE STREAM STATES IT AS ONE (ADR-033).
   *
   * This used to rewrite the tick's already-emitted `POCKET_STATUS` to `SACK`.
   * It no longer touches the status at all, because a pocket status describes
   * THE SPACE THE PASSER IS WORKING IN and a sack describes THE PLAY HAVING
   * ENDED — the tick keeps the space it actually had (IMMEDIATE at the arrival
   * site below, and whatever it was on a coverage sack, which is frequently
   * CLEAN and correctly so). Nothing is lost: §17's own rule reads a sack off
   * the stream as a dropback with no `THROW` and no `RUN_RESOLUTION` that lost
   * ground, `PLAY_RESULT` carries the yardage, and `RUSH_THREAT`/`ARRIVED` names
   * the man when there was one.
   */
  const sack = (at: number): PlayOutcome => {
    return {
      yards: -tunables.result.sackYardsLost,
      turnover: false,
      clockRunoff: at + tunables.result.clockRunoff.sack,
    };
  };

  while (outcome === undefined && tick <= tunables.clock.maxTick) {
    log.tickStart(tick);

    // §7.2 — every input is last tick's: the bands each rusher posted (the doc's
    // single-rep rule), how far the nearest travelling rusher still has to come,
    // and the pressure each has accumulated. `previousBand` is exactly tick−0.5.
    const threats = activeThreats(matchups, scramble);
    const minTta = minTimeToArrival(threats, tick);

    // ADR-007 — he is here. Published before the status it produces, because the
    // arrival is the CAUSE of the IMMEDIATE the next line reports.
    if (scramble === undefined) {
      for (const m of matchups) {
        if (m.threat === undefined || m.announcedArrival) continue;
        if (m.threat.etaTick > tick) continue;
        publishThreat(m.threat, "ARRIVED");
        m.announcedArrival = true;
      }
    }

    const highest = matchups.reduce((max, m) => Math.max(max, m.pressure), 0);
    const previousBands = matchups.flatMap((m) => (m.previousBand === undefined ? [] : [m.previousBand]));
    const pocket: PocketStatusRung = pocketStatusFor(tunables, highest, previousBands, minTta);
    log.pocketStatus(pocket);

    // ---- §7.1 line battle (feeds the NEXT tick's pocket status) -------------
    // Suspended once the QB is out of the pocket: the protection is broken and
    // what is left is pursuit, which runs on the scramble's own clock (§8.8).
    if (scramble === undefined) {
      const tickRng = rushRng.fork(`t${tick.toFixed(1)}`);
      for (const m of matchups) {
        // §7.3 / §7.4 — nobody is blocking him, so there is no rep to roll. His
        // threat was created at the snap and nothing at the line can reset it:
        // only the quarterback moving, or the clock, changes what happens next.
        if (m.blocker === undefined) continue;
        const blocker = m.blocker;
        const rush = resolvePassRushTick({
          tunables,
          rusher: m.rusher,
          blocker,
          move: m.move,
          tickRng,
          ...(m.previousBand === undefined ? {} : { previousBand: m.previousBand }),
        });
        log.check(rush.check);
        m.pressure = advancePressure(m.pressure, rush);
        m.previousBand = rush.band;
        // A won rep does not arrive; it departs. The threat outlives the rep
        // that created it until the blocker resets him or the QB moves.
        const before = m.threat;
        if (startsThreat(rush.band)) {
          const won = threatFromWonRep({
            tunables,
            rusher: m.rusher.bio.id,
            alignment: m.alignment,
            move: m.move,
            margin: rush.margin,
            tick,
            rollRef: rush.check.roll.rngLabel,
          });
          m.threat = soonerThreat(before, won);
          // Winning again does not slow him down, so an existing sooner arrival
          // survives untouched — and an unchanged threat is not an event.
          if (m.threat !== before) {
            publishThreat(m.threat, "TRAVELLING");
            m.announcedArrival = false;
          }
        } else if (clearsThreat(tunables, rush.band)) {
          if (before !== undefined) {
            publishThreat(before, "RESET");
            m.threat = undefined;
            m.announcedArrival = false;
          }
        } else if (before !== undefined) {
          // Still coming, but a blocker who recovered position costs him ground.
          const delayed = delayThreat(before, recoverySecondsFor(tunables, rush.band));
          if (delayed !== before) {
            m.threat = delayed;
            publishThreat(delayed, "DELAYED");
            m.announcedArrival = false;
          }
        }
      }
    }

    // ---- §9.1/§9.2/§9.3/§9.4 routes ----------------------------------------
    for (const track of tracks) {
      // `pressed` is only ever true on a MAN assignment, so the defender is
      // present by construction; the guard is the type system's, not football's.
      const presser = track.coverage.kind === "MAN" ? track.coverage.defender : undefined;
      if (tick === tunables.clock.firstTick && track.pressed && presser !== undefined) {
        const release = resolveReleaseVsPress({
          tunables,
          receiver: track.receiver,
          defender: presser,
          coverageRng: coverageRng.fork(String(track.assignment.receiver)),
        });
        log.check(release.check);
        track.jamDelaySeconds = release.delaySeconds;
        track.readySeconds = routeReadySeconds(tunables, track.assignment.depthClass, release.delaySeconds);
        track.releaseReceiverMod = release.receiverCoverageModifier;
        track.releaseDefenderMod = release.defenderCoverageModifier;
      }

      if (tick >= track.readySeconds) resolveBreakPoint(track);

      // §8.8 — a receiver who has abandoned the route to find open grass is not
      // at a point on his route's timeline; the play has changed shape (ADR-007).
      // ADR-009 — and one who beat a zone and SAT DOWN in the window is not on
      // that timeline either: he reports SETTLED rather than OPEN and then the
      // flatly false DECAYING.
      const phase: RoutePhase =
        scramble !== undefined && track.scrambleBaseOpenness !== undefined
          ? "SCRAMBLE_DRILL"
          : routePhaseAt(tunables, tick, track.readySeconds, track.jamDelaySeconds, track.settled);
      const openness = currentOpenness(tunables, track, tick, scramble);
      if (phase !== track.lastPhase || openness !== track.lastOpenness) {
        log.routeStatus(track.receiver.bio.id, track.assignment.routeName, phase, openness);
        track.lastPhase = phase;
        track.lastOpenness = openness;
      }
    }

    // ---- §8.2/§8.3 reads ----------------------------------------------------
    /** One §8.3 read of one receiver, emitted and recorded on his track. */
    const takeRead = (target: ReceiverTrack, labelPart: string): number => {
      // §8.8 — a scrambling QB does not see the whole field. The cone rides on
      // §8.3's awareness roll, which is the check the doc writes it against.
      const vision =
        scramble === undefined ? [] : [visionConeRollModifier(tunables, target.assignment.depthClass)];
      const read = resolveQbRead(
        tunables,
        qb,
        readOpenness(tunables, target, tick, scramble),
        qbReadRng.fork(`t${tick.toFixed(1)}:${labelPart}:${String(target.receiver.bio.id)}:read`),
        vision,
      );
      log.qbRead(
        target.receiver.bio.id,
        read.actualOpenness,
        read.perceivedOpenness,
        read.effectiveOpenness,
        read.varianceRoll,
        read.testsAttrs,
      );
      target.lastRead = { perceived: read.perceivedOpenness, effective: read.effectiveOpenness };
      return read.effectiveOpenness;
    };

    readAccumulator += readCapacityPerTick(tunables, qb, system, pocket);
    let reads = Math.floor(readAccumulator);
    readAccumulator -= reads;
    while (reads > 0 && readsUsed < maxReads) {
      // Out of structure the progression is off (§8.8's scramble drill): he is
      // not working a read list any more, he is looking for anyone.
      const step =
        scramble === undefined
          ? progressionStep(tracks, readOrder, readPointer)
          : nextReadable(tracks, readOrder, readPointer);
      if (step === undefined) break;
      const target = step.track;

      // §8.1 — he is ON this read and the route has not declared. He turns it
      // loose on timing or he waits; he does NOT jump to the next man because
      // the next man happens to be ready. That skip is what made every reading
      // system produce the same quarterback (CALIBRATION-BACKLOG 2b).
      if (target.baseOpenness === undefined) {
        const lead = Number((target.readySeconds - tick).toFixed(1));
        // Too early even to consider: no die, so no CHECK (ADR-005).
        if (!anticipationAvailable(tunables, lead)) break;
        anticipationIndex += 1;
        const antic = resolveAnticipation({
          tunables,
          qb,
          system,
          leadSeconds: lead,
          depthClass: target.assignment.depthClass,
          firstRead: step.progressionIndex === 0,
          // ADR-008 — the pair term. Absent table ⇒ neutral ⇒ unchanged.
          receiver: target.assignment.receiver,
          chemistry: state.chemistry,
          anticipationRng: qbReadRng.fork(
            `t${tick.toFixed(1)}:a${anticipationIndex}:${String(target.receiver.bio.id)}:anticipation`,
          ),
        });
        log.check(antic.check);
        if (!antic.anticipated) break;
        // He is throwing to the spot: the break resolves now, and the window he
        // reads is the window that will exist when the ball gets there.
        resolveBreakPoint(target);
      }

      readIndex += 1;
      takeRead(target, `r${readIndex}`);
      target.reachedInProgression = true;
      readPointer = step.nextPointer;
      readsUsed += 1;
      reads -= 1;
    }

    // ---- §8.5/§8.7 decision -------------------------------------------------
    const readCandidates = (): TargetCandidate[] =>
      tracks
        .filter((t) => t.lastRead !== undefined)
        .map((t) => ({ receiver: t.receiver.bio.id, effectiveOpenness: t.lastRead?.effective ?? 0 }));
    const bestOf = (list: readonly TargetCandidate[]): number =>
      list.reduce((max, c) => Math.max(max, c.effectiveOpenness), Number.NEGATIVE_INFINITY);

    let candidates = readCandidates();
    const mustDecide = forcesDecision(tunables, pocket) || tick >= budgetSeconds || readsUsed >= maxReads;

    const throwTo = (selection: ReturnType<typeof selectTarget>, outletId: PlayerId | undefined): PlayOutcome => {
      const track = tracks.find((t) => t.receiver.bio.id === selection.selected.receiver);
      if (track === undefined) throw new Error("@ff/engine: selected target has no route track");
      log.check(selection.check);
      // A §8.5 decision-quality roll ran, so these branches may carry a tier
      // (ADR-005). CHECKDOWN and THROW differ in WHICH receiver he took, not in
      // whether a decision was made — the outlet competes, it is not a fallback
      // that skips the decision.
      const isCheckdown = outletId !== undefined && selection.selected.receiver === outletId;
      log.qbDecision(isCheckdown ? "CHECKDOWN" : "THROW", {
        target: selection.selected.receiver,
        tier: selection.check.tier,
      });
      return resolveThrow({
        tunables,
        log,
        qb,
        track,
        tick,
        pocket,
        effectiveOpenness: selection.selected.effectiveOpenness,
        chemistry: chemistryLevel(tunables, state.chemistry, state.quarterback, track.assignment.receiver),
        coverageRng,
        throwRng,
        catchRng,
        tipRng,
        carrierRng,
        ballOn: state.ballOn,
        scramble,
        recoverySpots,
        airYardsOf: (id) => airYardsFor(tracks, id),
      });
    };

    if (candidates.length > 0 && bestOf(candidates) >= throwThreshold) {
      outcome = throwTo(
        selectTarget(tunables, qb, candidates, qbReadRng.fork(`t${tick.toFixed(1)}:decision`)),
        undefined,
      );
      break;
    }

    /**
     * §8.1's "max reads before CHECKDOWN". The outlet is not a progression read
     * and does not cost one — that is what an outlet IS: he can see the back in
     * the flat without leaving his read. So it is looked at whenever the moment
     * forces a decision, whether the pocket forced it or the clock did.
     *
     * It then COMPETES in §8.5's pool rather than pre-empting it. Giving the
     * outlet precedence made 40% of all attempts checkdowns and put half the
     * throws on a single tick; denying it under pressure took full-field sacks to
     * 24%, because a progression quarterback whose read has not broken had
     * nothing to do but wear the hit. Neither is football. He looks at it, and
     * the decision-quality roll ranks it against everything else he has seen —
     * with a floor of its own, so a covered outlet is not thrown to.
     */
    let outletId: PlayerId | undefined;
    if (mustDecide && scramble === undefined) {
      const outlet = checkdownTrack(tracks, readOrder);
      if (outlet !== undefined && !outlet.reachedInProgression) {
        const effective = takeRead(outlet, "checkdown");
        if (effective >= tunables.qb.checkdown.threshold) {
          outletId = outlet.receiver.bio.id;
          candidates = readCandidates();
        } else {
          // Looked and did not like it. He keeps the look (it is a real read)
          // but the outlet does not enter the pool at a bar it cannot clear.
          candidates = readCandidates().filter((c) => c.receiver !== outlet.receiver.bio.id);
        }
      }
    }

    if (mustDecide && candidates.length > 0 && bestOf(candidates) >= tunables.qb.desperationThreshold) {
      outcome = throwTo(
        selectTarget(tunables, qb, candidates, qbReadRng.fork(`t${tick.toFixed(1)}:decision`)),
        outletId,
      );
      break;
    }

    const throwawayAvailable = tick >= tunables.qb.throwawayEarliestSeconds;

    if (scramble !== undefined) {
      // Outside the pocket the clock is pursuit's, not the rush's. When it runs
      // out he tucks it — and a quarterback with the ball under his arm is a
      // ball carrier, so he goes through §14.4's machinery like any other one.
      // This replaced a flat five yards; it is not a tuned version of it.
      if (tick >= scramble.pursuitAtTick) {
        log.qbDecision("SCRAMBLE");
        const run = advanceCarrier({
          tunables,
          carrier: qb,
          mode: "RUSH",
          pursuers: buildCarrierPursuers(tunables, recoverySpots, state.quarterback, 0),
          yardsToGoalLine: 100 - state.ballOn,
          carrierRng: carrierRng.fork("scramble"),
          emitCheck: (check) => log.check(check),
          // A scramble is a carry, so it publishes RUSH_ZONE — never YAC_ZONE,
          // which would put quarterback rushing into a receiving aggregate.
          emitZone: (zone, yardsInZone) => log.rushZone(state.quarterback, zone, yardsInZone),
        });
        // `gap` is absent, because he did not run one; `yardsBeforeContact` is
        // zero, because nothing was blocked for him — §14.3's point of attack is
        // a designed-run mechanic and no part of it ran here (ADR-010 item 2).
        log.runResolution(state.quarterback, "SCRAMBLE", undefined, 0, run.yards);
        outcome = {
          yards: run.yards,
          turnover: false,
          clockRunoff: tick + tunables.result.clockRunoff.scrambleRun,
        };
        break;
      }
      log.qbDecision("HOLD");
      tick = Number((tick + tunables.clock.tickStepSeconds).toFixed(1));
      continue;
    }

    // §7.2 SACK — "rusher reaches QB before ball released". Arrival is now a
    // NECESSARY condition: the status list alone used to sack a quarterback one
    // second into his drop for a rep lost fifty feet away.
    if (hasArrived(tunables, threats, tick) && sacksWithoutTarget(tunables, pocket)) {
      outcome = sack(tick);
      break;
    }

    // §7.2's "move" branch. Reached only when he is not throwing and nobody has
    // arrived: stand in, climb, leave, or eat it — chosen on his own attributes.
    if (forcesDecision(tunables, pocket)) {
      const movement = resolvePocketMovement({
        tunables,
        qb,
        tick,
        threats,
        stepUpsUsed,
        throwawayAvailable,
        movementRng: movementRng.fork(`t${tick.toFixed(1)}:movement`),
      });
      log.check(movement.check);

      if (movement.response === "STEP_UP") {
        stepUpsUsed += 1;
        // The decision is published BEFORE its consequences, so the stream reads
        // as cause then effect: he climbed, and these arrivals moved because of it.
        log.qbDecision("STEP_UP");
        for (const m of matchups) {
          if (m.threat === undefined || m.threat.alignment !== "EDGE") continue;
          m.threat = delayThreat(m.threat, tunables.pocketMovement.stepUp.edgeThreatDelaySeconds);
          m.announcedArrival = false;
          // ADR-007 — the climb is exactly the adjustment the printout used to
          // have to disclaim. The arrival it publishes here is the real one.
          publishThreat(m.threat, "DELAYED");
          // A rusher run past by a climbing quarterback starts his rep over.
          if (tunables.pocketMovement.stepUp.resetsEdgePressure) m.pressure = 0;
        }
        tick = Number((tick + tunables.clock.tickStepSeconds).toFixed(1));
        continue;
      }

      if (movement.response === "ESCAPE") {
        const escape = resolveScramble({
          tunables,
          qb,
          tick,
          threats,
          scrambleRng: movementRng.fork(`t${tick.toFixed(1)}:scramble`),
        });
        log.check(escape.check);
        if (escape.sacked) {
          // ADR-007 — the man who got him is PUBLISHED, not left to be inferred.
          //
          // This site used to end a play in a sack having stated no threat
          // transition at all: the stream said a quarterback went down and never
          // said anybody reached him, so `reduceStatlines` had no
          // `lastArrivedRusher` and 89.7% of every uncredited sack in the
          // 496-game baseline came from these eight lines. The roll decided THAT
          // he was caught; the arrival clock decides BY WHOM, deterministically
          // and with no second die, and `arrivedAt` dates the meeting at this
          // tick because the quarterback closed the last of the distance himself.
          //
          // The pool is an intersection and both halves are load-bearing.
          // `threats` is what `resolveScramble` was handed, so every man in it is
          // an ACTOR of the check that just caught the quarterback — the
          // attribution is justified by a roll the stream already carries, never
          // by a name the roll did not mention, which is also why a rusher who
          // won his rep in THIS tick's line battle is not eligible (§7.2's inputs
          // are last tick's throughout; he starts travelling for the next one).
          // And a man that battle RESET is dropped, because the stream has
          // already said his threat is over and a RESET followed by an ARRIVED is
          // not a thing that happened.
          //
          // Nobody eligible means nobody named. An escape that fails with every
          // man it named already blocked out of the play is a coverage sack, and
          // a coverage sack has no sacker here for the same reason it has none in
          // the NFL.
          const named = new Set(threats.map((t) => String(t.rusher)));
          const caught = nearestThreat(
            liveThreats(matchups).filter((t) => named.has(String(t.rusher))),
            tunables.arrival.simultaneousArrivalPriority,
          );
          if (caught !== undefined) {
            const arrival = arrivedAt(caught, tick);
            publishThreat(arrival, "ARRIVED");
            for (const m of matchups) {
              if (m.threat !== caught) continue;
              m.threat = arrival;
              m.announcedArrival = true;
            }
          }
          outcome = sack(tick);
          break;
        }
        if (escape.escaped) {
          scramble = {
            sinceTick: tick,
            pursuitAtTick: pursuitDeadline(tunables, tick),
            escapeRollRef: escape.check.roll.rngLabel,
          };
          // The protection is broken and the rush becomes pursuit: every rep
          // and every threat in the pocket stops meaning anything.
          for (const m of matchups) {
            // RESET is the stream's word for "this threat is over" — published
            // whether it was the blocker or the quarterback that ended it, so a
            // threat never simply stops being mentioned (ADR-007).
            if (m.threat !== undefined) publishThreat(m.threat, "RESET");
            m.threat = undefined;
            m.announcedArrival = false;
            m.pressure = 0;
            m.previousBand = undefined;
          }
          // §8.8 — receivers stop running routes and find open grass from here.
          for (const track of tracks) {
            track.scrambleBaseOpenness = currentOpenness(tunables, track, tick, undefined);
          }
          log.qbDecision("SCRAMBLE");
          tick = Number((tick + tunables.clock.tickStepSeconds).toFixed(1));
          continue;
        }
        // CONTAINED: he tried to get out, got walled in, and lost the tick.
        log.qbDecision("HOLD");
        tick = Number((tick + tunables.clock.tickStepSeconds).toFixed(1));
        continue;
      }

      if (movement.response === "THROWAWAY") {
        // No §8.5 roll ran — there was nobody to pick between — so no tier
        // (ADR-005). The pocket_movement CHECK above carries the roll that
        // produced this choice.
        log.qbDecision("THROWAWAY");
        outcome = {
          yards: 0,
          turnover: false,
          clockRunoff: tick + tunables.result.clockRunoff.throwaway,
        };
        break;
      }

      // STAND_IN: he feels it, resets his feet, and keeps reading.
      log.qbDecision("HOLD");
      tick = Number((tick + tunables.clock.tickStepSeconds).toFixed(1));
      continue;
    }

    if (mustDecide && throwawayAvailable) {
      // The clock ran out rather than the pocket: no duress, so no movement
      // check. No decision-quality roll runs on a throwaway either — there was
      // nobody to pick between — so no tier (ADR-005), and no THROW event.
      log.qbDecision("THROWAWAY");
      outcome = {
        yards: 0,
        turnover: false,
        clockRunoff: tick + tunables.result.clockRunoff.throwaway,
      };
      break;
    }

    // A hold forced by nobody being open is correct QB behaviour, not a failed
    // check. No §8.5 roll ran, so there is no honest tier to report (ADR-005).
    log.qbDecision("HOLD");
    tick = Number((tick + tunables.clock.tickStepSeconds).toFixed(1));
  }

  if (outcome === undefined) {
    // Nobody got open and the pocket never broke: coverage sack at the horizon.
    // The last tick's status STANDS (ADR-033) — this is the case where the space
    // genuinely was clean and the quarterback went down anyway, which is what a
    // coverage sack IS. Restating it as a worse status would have the stream
    // assert pressure that no rusher produced.
    outcome = {
      yards: -tunables.result.sackYardsLost,
      turnover: false,
      clockRunoff: tunables.clock.maxTick + tunables.result.clockRunoff.sack,
    };
  }

  const scored =
    !outcome.turnover && state.ballOn + outcome.yards >= 100
      ? { ...outcome, score: tunables.result.touchdownPoints }
      : outcome;

  log.playResult(scored.yards, scored.turnover, scored.clockRunoff, scored.score);

  return {
    events: log.drain(),
    newState: applyPlayOutcome(tunables, state, scored, log.nextSeq),
  };
}

// ---------------------------------------------------------------------------

/** A player and where he is standing, for §12.3. Tracking is per tip, not static. */
interface RecoverySpot {
  readonly player: PlayerState;
  readonly side: "OFFENSE" | "DEFENSE";
  readonly zone: FieldZone;
  readonly engagedInBlock: boolean;
}

interface ThrowArgs {
  readonly tunables: Tunables;
  readonly log: PlayEventLog;
  readonly qb: PlayerState;
  readonly track: ReceiverTrack;
  readonly tick: number;
  readonly pocket: PocketStatusRung;
  readonly effectiveOpenness: number;
  /** ADR-008 — this pair's resolved 0-100 rapport. */
  readonly chemistry: number;
  readonly coverageRng: Rng;
  readonly throwRng: Rng;
  readonly catchRng: Rng;
  readonly tipRng: Rng;
  readonly scramble: ScrambleState | undefined;
  readonly recoverySpots: readonly RecoverySpot[];
  readonly airYardsOf: (id: PlayerId) => number;
  /** §13 — the ball carrier's own fork, so YAC cannot shift any earlier roll. */
  readonly carrierRng: Rng;
  /** Yards from the offence's own goal line; caps every advance at the field. */
  readonly ballOn: number;
}

function resolveThrow(args: ThrowArgs): PlayOutcome {
  const { log, qb, track, tick, pocket, effectiveOpenness, throwRng, catchRng, scramble, tunables } = args;
  // The window the ball actually arrives into. On an anticipation throw that is
  // the window at the BREAK, not at the release — the receiver is still running.
  const actualOpenness = readOpenness(tunables, track, tick, scramble);
  const throwType: ThrowType = selectThrowType(tunables, track.assignment.depthClass, effectiveOpenness);
  const shortfall = armStrengthShortfall(tunables, qb, track.assignment.airYards);
  const defender = coverageDefender(track);

  // §9.4 — the zone defender reads the release. Rolled here and not earlier
  // because the doc's own trigger is the release: he breaks on the BALL.
  let brokeOnBall = false;
  if (track.coverage.kind === "ZONE" && defender !== undefined) {
    const read = resolveZoneRead({
      tunables,
      defender,
      quarterback: qb,
      coverageRng: args.coverageRng.fork(`release:${String(track.assignment.receiver)}`),
    });
    log.check(read.check);
    brokeOnBall = read.brokeOnBall;
  }

  const accuracy = resolveAccuracy({
    tunables,
    qb,
    airYards: track.assignment.airYards,
    throwType,
    pocket,
    armShortfall: shortfall,
    chemistryLevel: args.chemistry,
    throwRng,
  });
  log.check(accuracy.check);
  // ADR-011 — the placement band is on the accuracy CHECK; THROW names the roll
  // rather than repeating the band (ADR-004's rule, applied to a derived fact).
  log.throwBall(track.receiver.bio.id, throwType, accuracy.check.tier, accuracy.roll.rngLabel);

  const incomplete = (): PlayOutcome => ({
    yards: 0,
    turnover: false,
    clockRunoff: tick + tunables.result.clockRunoff.incompletion,
  });

  // §10.4 MISS: not catchable. §12.1 is explicit that an uncatchable ball does
  // NOT trigger the tipped-ball system — nothing downstream fires.
  if (!accuracy.bandEffects.catchable) return incomplete();

  const tip = (deflector: PlayerState, point: DeflectionPoint): PlayOutcome =>
    resolveTippedBall({ ...args, deflector, point, throwType });

  // §10.3 — a defender who has undercut the route, or (§9.4) a zone defender who
  // read the release and left his area early, can get a hand on it.
  const laneEligible =
    defender !== undefined &&
    (laneDefenderEligible(tunables, track.contestPosition, actualOpenness) ||
      (brokeOnBall &&
        tunables.zoneCoverage.readQb.grantsLaneContest &&
        actualOpenness <= tunables.throwExec.lane.contestOpennessMax));

  if (laneEligible && defender !== undefined) {
    const lane = resolvePassingLane({ tunables, defender, quarterback: qb, throwType, throwRng });
    log.check(lane.check);
    // §12 — a deflection is a LIVE BALL, not an incompletion.
    if (lane.deflected) return tip(defender, "LANE");
  }

  const forcedContest = brokeOnBall && tunables.zoneCoverage.readQb.forcesContestedCatch;
  const catchType =
    defender === undefined ? "ROUTINE" : forcedContest ? "CONTESTED" : catchTypeFor(tunables, actualOpenness);
  const result = resolveCatch({
    tunables,
    receiver: track.receiver,
    defender,
    accuracy: accuracy.bandEffects,
    contestPosition: track.contestPosition,
    catchType,
    ...(brokeOnBall ? { defenderContestModifiers: [brokeOnBallContestModifier(tunables)] } : {}),
    catchRng,
  });
  // ADR-004: the CHECK carries the roll, the summary references it by rngLabel.
  log.check(result.check);
  log.catchResolution(track.receiver.bio.id, result.catchType, result.check.roll.rngLabel, result.caught);

  if (result.interception) {
    return { yards: 0, turnover: true, clockRunoff: tick + tunables.result.clockRunoff.interception };
  }

  // §12.1 — the catch-point triggers. A defender who got a hand on it at the
  // catch point, or a receiver who dropped a ball he had.
  const deflector = catchPointDeflector(tunables, result, track.receiver, defender);
  if (deflector !== undefined) return tip(deflector, "CATCH_POINT");

  if (!result.caught) return incomplete();

  // §13 — the catch is not the end of the play. The gain is air yards PLUS what
  // he does with it, resolved by the same machinery a handoff uses.
  const yac = resolveYac({
    ...args,
    accuracyBand: accuracy.bandEffects.label,
    throwType,
  });
  return {
    yards: track.assignment.airYards + yac,
    turnover: false,
    clockRunoff: tick + tunables.result.clockRunoff.completion,
  };
}

// --- §13 YAC ----------------------------------------------------------------

interface YacArgs extends ThrowArgs {
  readonly accuracyBand: string;
  readonly throwType: ThrowType;
}

/**
 * §13, driven by the shared ball-carrier advance.
 *
 * Two accuracy effects apply and the doc states both, in different places:
 * §13.2's ±15 roll modifier on the immediate defender ("catch in stride" /
 * "catching off-balance", plus the bullet/touch transition), and §10.5's "YAC
 * Mod" column as a reduction of the yardage itself. They stack, deliberately —
 * see the ⚠ note on `TUNABLES.ballCarrier.yacMultiplierByAccuracyBand`, which is
 * the knob that unstacks them.
 */
function resolveYac(args: YacArgs): number {
  const { log, track, carrierRng, recoverySpots, accuracyBand, throwType, tunables } = args;
  const t = tunables.ballCarrier;
  const carrierId = track.receiver.bio.id;
  const catchDepth = track.assignment.airYards;

  const transition = t.catchTransition;
  const zone1Modifiers = [
    flatModifier(
      `Catch transition, ${accuracyBand.toLowerCase()} placement (§13.2)`,
      transition.byAccuracyBand[accuracyBand as keyof typeof transition.byAccuracyBand] ?? 0,
    ),
    flatModifier(`${throwType} caught (§13.2)`, transition.byThrowType[throwType]),
  ];

  const advance = advanceCarrier({
    tunables,
    carrier: track.receiver,
    mode: "YAC",
    pursuers: buildCarrierPursuers(tunables, recoverySpots, carrierId, catchDepth),
    yardsToGoalLine: Math.max(0, 100 - args.ballOn - catchDepth),
    zone1CarrierModifiers: zone1Modifiers,
    carrierRng: carrierRng.fork(String(carrierId)),
    emitCheck: (check) => log.check(check),
    emitZone: (zone, yardsInZone) => log.yacZone(carrierId, zone, yardsInZone),
  });

  // §10.5's YAC Mod column, applied to the total.
  const multiplier =
    t.yacMultiplierByAccuracyBand[accuracyBand as keyof typeof t.yacMultiplierByAccuracyBand] ?? 1;
  return Math.round(advance.yards * multiplier);
}

/**
 * §13.3 step 1 — "count blockers vs. defenders in zone", built from the same
 * §3 placement `buildRecoverySpots` uses for §12.3.
 *
 * Defenders are placed in a §13.1 zone by the depth of their §3 cell relative to
 * the carrier; anyone further behind him than `behindReachYards` is out of the
 * doc's forward-only zone table and does not appear. Blockers are every other
 * offensive player who is not tied up in protection, paired to a defender in the
 * same zone — best blocker to the most dangerous man, which needs no die.
 *
 * Every block here is a STALK: §13.3's CRACK and LEAD are properties of a CALL,
 * and a dropback's play card does not state downfield blocking assignments. A
 * run call does (`RunPlayCall.perimeter`), and there they are honoured.
 */
function buildCarrierPursuers(
  tunables: Tunables,
  spots: readonly RecoverySpot[],
  carrierId: PlayerId,
  carrierDepth: number,
): Pursuer[] {
  const defenders: { player: PlayerState; zone: number }[] = [];
  const blockers: { player: PlayerState; zone: number }[] = [];
  for (const spot of spots) {
    if (String(spot.player.bio.id) === String(carrierId)) continue;
    // A man engaged at the line is not in the chase and is not blocking in
    // space; §13's zones are downfield and his fight was at the snap.
    if (spot.engagedInBlock) continue;
    const zone = zoneOfDefender(tunables, depthOfVerticalZone(tunables, spot.zone.vertical), carrierDepth);
    if (zone === undefined) continue;
    (spot.side === "DEFENSE" ? defenders : blockers).push({ player: spot.player, zone });
  }

  const rank = (p: PlayerState): number =>
    getAttr(p.attributes.values, ATTR.pursuit) + getAttr(p.attributes.values, ATTR.tackling);
  const blockRank = (p: PlayerState): number => getAttr(p.attributes.values, ATTR.runBlock);

  const out: Pursuer[] = [];
  for (const zoneSpec of tunables.ballCarrier.zones) {
    const zone = zoneSpec.zone;
    const inZone = defenders
      .filter((d) => d.zone === zone)
      .sort((a, b) => rank(b.player) - rank(a.player) ||
        String(a.player.bio.id).localeCompare(String(b.player.bio.id)));
    const available = blockers
      .filter((b) => b.zone === zone)
      .sort((a, b) => blockRank(b.player) - blockRank(a.player) ||
        String(a.player.bio.id).localeCompare(String(b.player.bio.id)));
    inZone.forEach((defender, i) => {
      const blocker = available[i];
      out.push({
        defender: defender.player,
        zone,
        ...(blocker === undefined ? {} : { blocker: blocker.player, blockType: "STALK" as const }),
      });
    });
  }
  return out;
}

/**
 * §12.1's catch-point triggers, read off the §11 result band. A ball the
 * receiver had and lost is live; a ball a defender got a hand on is live; a
 * clean pass breakup and a clean drop are not.
 */
function catchPointDeflector(
  tunables: Tunables,
  result: CatchOutcome,
  receiver: PlayerState,
  defender: PlayerState | undefined,
): PlayerState | undefined {
  const t = tunables.tippedBall;
  if (result.catchType === "CONTESTED") {
    const triggers: readonly string[] = t.triggerContestedBands;
    return defender !== undefined && triggers.includes(result.band) ? defender : undefined;
  }
  const triggers: readonly string[] = t.triggerRoutineBands;
  // The receiver tipped it himself. He is also, correctly, eligible to recover.
  return triggers.includes(result.band) ? receiver : undefined;
}

interface TippedBallArgs extends ThrowArgs {
  readonly deflector: PlayerState;
  readonly point: DeflectionPoint;
  readonly throwType: ThrowType;
}

/**
 * §12 — the ball is in the air and nobody owns it.
 *
 * Roll 1 sets how recoverable it is; §12.3 says who may reach it; Roll 2 is each
 * of them in Reaction order until somebody has it. A defensive recovery is an
 * interception, which is the point: this is a real source of turnovers the
 * engine has never had, and the INT rate is expected to move because of it.
 */
function resolveTippedBall(args: TippedBallArgs): PlayOutcome {
  const { log, track, tick, deflector, point, throwType, tipRng, recoverySpots, tunables } = args;

  const quality = resolveDeflectionQuality({
    tunables,
    deflector,
    point,
    depthClass: track.assignment.depthClass,
    throwType,
    tipRng,
  });
  log.check(quality.check);

  // Where the ball comes down: at the catch point, the route's own cell; in the
  // throwing lane, short of it, in the same lane (INTERPRETATION, tunable).
  const ballZone: FieldZone =
    point === "LANE"
      ? { horizontal: track.zone.horizontal, vertical: tunables.zoneModel.laneDeflectionVertical }
      : track.zone;

  // §12.4 "Already tracking ball": the intended receiver, whoever was covering
  // him, and whoever knocked it down were all playing the ball already.
  const trackingIds = new Set<string>([
    String(track.receiver.bio.id),
    String(deflector.bio.id),
    ...(coverageDefender(track) === undefined ? [] : [String(coverageDefender(track)?.bio.id)]),
  ]);
  const candidates: RecoveryCandidate[] = recoverySpots.map((spot) => ({
    player: spot.player,
    side: spot.side,
    zone: spot.zone,
    engagedInBlock: spot.engagedInBlock,
    trackingBall: trackingIds.has(String(spot.player.bio.id)),
  }));

  const ordered = recoveryOrder(eligibleRecoverers(tunables, quality.band, ballZone, candidates));

  const attempts: { player: PlayerId; rollRef: string }[] = [];
  let recovered: (typeof ordered)[number] | undefined;
  for (const candidate of ordered) {
    const attempt = resolveRecoveryAttempt({
      tunables,
      candidate,
      band: quality.band,
      finalTargetNumber: quality.finalTargetNumber,
      tipRng,
    });
    log.check(attempt.check);
    attempts.push({ player: attempt.player, rollRef: attempt.roll.rngLabel });
    // §12.4: "First success = recovery." Everyone behind him in Reaction order
    // never gets an attempt, which is why the order is total and deterministic.
    if (attempt.recovered) {
      recovered = candidate;
      break;
    }
  }

  log.tippedBall(
    deflector.bio.id,
    quality.roll.rngLabel,
    quality.finalTargetNumber,
    ordered.map((c) => c.player.bio.id),
    attempts,
    recovered?.player.bio.id,
  );

  if (recovered === undefined) {
    return { yards: 0, turnover: false, clockRunoff: tick + tunables.result.clockRunoff.incompletion };
  }
  if (recovered.side === "DEFENSE") {
    // §12.4 step 5.
    return { yards: 0, turnover: true, clockRunoff: tick + tunables.result.clockRunoff.interception };
  }
  // §12.4 step 4: "play continues" — and it now does. He is credited with the
  // air yards of wherever he came up with it (his own route's depth, or zero for
  // a lineman who fell on it) and is then a ball carrier from that spot like any
  // other. This replaced scoring the play as a completion and stopping there.
  const recoveredId = recovered.player.bio.id;
  const airYards = args.airYardsOf(recoveredId);
  const advance = advanceCarrier({
    tunables,
    carrier: recovered.player,
    mode: "YAC",
    pursuers: buildCarrierPursuers(tunables, recoverySpots, recoveredId, airYards),
    yardsToGoalLine: Math.max(0, 100 - args.ballOn - airYards),
    carrierRng: args.carrierRng.fork(`tip:${String(recoveredId)}`),
    emitCheck: (check) => log.check(check),
    emitZone: (zone, yardsInZone) => log.yacZone(recoveredId, zone, yardsInZone),
  });
  return {
    yards: airYards + advance.yards,
    turnover: false,
    clockRunoff: tick + tunables.result.clockRunoff.completion,
  };
}

/**
 * How open the receiver is RIGHT NOW. §8.7 while the play is in structure; §8.8
 * once the quarterback has left it — the receiver stops running his route where
 * he stood and works back to grass, so coverage stops closing on him.
 *
 * A route whose break point has been resolved early by an anticipation throw is
 * still not open yet: this reports zero until he actually gets there, which is
 * what keeps ROUTE_STATUS honest about a receiver the ball is already headed to.
 */
function currentOpenness(
  tunables: Tunables,
  track: ReceiverTrack,
  tick: number,
  scramble: ScrambleState | undefined,
): number {
  if (scramble !== undefined && track.scrambleBaseOpenness !== undefined) {
    return scrambleOpennessAt(tunables, track.scrambleBaseOpenness, scramble.sinceTick, tick);
  }
  if (track.baseOpenness === undefined) return 0;
  if (tick < track.readySeconds) return 0;
  return decayedOpenness(tunables, track, tick);
}

/**
 * §8.7's decay is "coverage closes on him", and zone coverage does not close the
 * same way: a receiver who has sat down in the soft spot is being watched by a
 * defender whose responsibility is the area, not the man. Which curve applies is
 * a property of the coverage rep, not of the receiver.
 */
function decayedOpenness(tunables: Tunables, track: ReceiverTrack, tick: number): number {
  const base = track.baseOpenness ?? 0;
  return track.settled
    ? settledOpennessAt(tunables, base, track.readySeconds, tick)
    : opennessAt(tunables, base, track.readySeconds, tick);
}

/**
 * The window the quarterback is throwing INTO — which for an anticipation throw
 * is the window at the break, not the (empty) one at the release. §8.1's whole
 * premise is that the throw and the break happen together, so the read and the
 * catch both resolve against the receiver's position when the ball gets there.
 *
 * Identical to `currentOpenness` for every route that has actually broken.
 */
function readOpenness(
  tunables: Tunables,
  track: ReceiverTrack,
  tick: number,
  scramble: ScrambleState | undefined,
): number {
  if (scramble !== undefined && track.scrambleBaseOpenness !== undefined) {
    return scrambleOpennessAt(tunables, track.scrambleBaseOpenness, scramble.sinceTick, tick);
  }
  if (track.baseOpenness === undefined) return 0;
  return decayedOpenness(tunables, track, Math.max(tick, track.readySeconds));
}

/**
 * Every rusher with a live clock, as the PUBLISHABLE thing — a `RushThreat`,
 * origin and all, rather than `activeThreats`' weaker `ArrivalClock`. Anything
 * that has to name a rusher in the stream needs this one; anything that only has
 * to know how long he needs can take the weaker one.
 */
function liveThreats(matchups: readonly RushMatchup[]): RushThreat[] {
  return matchups.flatMap((m) => (m.threat === undefined ? [] : [m.threat]));
}

/**
 * Every rusher currently on his way to the passer. Once he is out of the
 * pocket, the only clock that matters is pursuit's — modelled as a single
 * threat so status derivation and arrival stay one code path.
 */
function activeThreats(
  matchups: readonly RushMatchup[],
  scramble: ScrambleState | undefined,
): ArrivalClock[] {
  if (scramble !== undefined) {
    const chaser = matchups[0];
    if (chaser === undefined) return [];
    return [
      {
        rusher: chaser.rusher.bio.id,
        alignment: "EDGE",
        wonAtTick: scramble.sinceTick,
        etaTick: scramble.pursuitAtTick,
        // Not a pass-rush rep, so it is never published as a RUSH_THREAT and it
        // has no `ThreatOrigin` — which is why this function returns the weaker
        // `ArrivalClock`: the pursuit clock cannot reach a publisher that would
        // have to invent one for it. It still names the roll that put the
        // quarterback on this clock.
        rollRef: scramble.escapeRollRef,
      },
    ];
  }
  return liveThreats(matchups);
}

interface ProgressionStep {
  readonly track: ReceiverTrack;
  /** Where he is in the read list — index 0 is the primary / the concept key. */
  readonly progressionIndex: number;
  readonly nextPointer: number;
}

/**
 * §8.1 — the receiver the quarterback is ON. Note what this function does NOT
 * do: it does not look past him. A progression is an ORDER, and a pointer that
 * skips to whoever is ready is not running one — that single behaviour is what
 * made half-field, full-field and concept reads produce identical quarterbacks
 * (CALIBRATION-BACKLOG 2b).
 *
 * It wraps rather than ending, so a system whose `maxReads` exceeds the number
 * of routes comes back to the primary rather than going blind.
 */
function progressionStep(
  tracks: readonly ReceiverTrack[],
  readOrder: readonly PlayerId[],
  pointer: number,
): ProgressionStep | undefined {
  if (readOrder.length === 0) return undefined;
  const index = pointer % readOrder.length;
  const id = readOrder[index];
  const track = tracks.find((t) => t.assignment.receiver === id);
  if (track === undefined) return undefined;
  return { track, progressionIndex: index, nextPointer: (index + 1) % readOrder.length };
}

/**
 * §8.8 — out of structure there is no progression to run. Off-script, the
 * quarterback looks at whoever he can find, which is what this (the engine's
 * pre-progression behaviour) describes, and is correct ONLY here.
 */
function nextReadable(
  tracks: readonly ReceiverTrack[],
  readOrder: readonly PlayerId[],
  pointer: number,
): ProgressionStep | undefined {
  if (readOrder.length === 0) return undefined;
  for (let i = 0; i < readOrder.length; i++) {
    const index = (pointer + i) % readOrder.length;
    const id = readOrder[index];
    const track = tracks.find((t) => t.assignment.receiver === id);
    if (track !== undefined && track.baseOpenness !== undefined) {
      return { track, progressionIndex: index, nextPointer: (index + 1) % readOrder.length };
    }
  }
  return undefined;
}

/**
 * §8.1's checkdown: the shortest route on the field that has actually declared.
 * Ties break on read order so the choice is deterministic without a die.
 */
function checkdownTrack(
  tracks: readonly ReceiverTrack[],
  readOrder: readonly PlayerId[],
): ReceiverTrack | undefined {
  let best: ReceiverTrack | undefined;
  for (const id of readOrder) {
    const track = tracks.find((t) => t.assignment.receiver === id);
    if (track === undefined || track.baseOpenness === undefined) continue;
    if (best === undefined || track.assignment.airYards < best.assignment.airYards) best = track;
  }
  return best;
}

/**
 * The line battle as §5's pre-snap phase left it.
 *
 * THIS FUNCTION NO LONGER THROWS. It used to raise `UnsupportedPlayCallError`
 * for a rusher no `ProtectionAssignment` named — the honest refusal of a
 * mechanic that did not exist — and that refusal is what forced every caller to
 * build blocking against the actual defensive card (`CALIBRATION-BACKLOG.md`
 * entry 21). §7.4 now answers the question the exception was standing in for:
 * he is picked up, he is slid to, or he is a free runner with an ETA.
 */
function buildMatchups(preSnap: PreSnapResult): RushMatchup[] {
  return preSnap.plans.map((plan) => ({
    rusher: plan.rusher,
    blocker: plan.blocker,
    move: plan.move,
    alignment: plan.alignment,
    side: plan.side,
    pressure: 0,
    previousBand: undefined,
    threat: freeRunnerThreat(plan),
    announcedArrival: false,
  }));
}

/**
 * Each route, and how the defence is playing it.
 *
 * The precedence is what makes mixed coverage work: a man assignment naming this
 * receiver wins, because somebody is on him personally. Otherwise the route
 * breaks into a cell of the §3 grid, and whoever is responsible for that cell
 * plays it. Nobody responsible for the cell means nobody is there — which is a
 * hole in the zone, not a modelling gap.
 */
function buildReceiverTracks(
  tunables: Tunables,
  state: MatchGameState,
  calls: PlayCalls,
  /** The routes ACTUALLY RUN — §5.3 may have converted some of them. */
  routes: readonly RouteAssignment[],
): ReceiverTrack[] {
  return routes.map((assignment) => {
    const zone = routeZone(tunables, assignment);
    const manned = calls.defense.assignments.find(
      (a) => a.kind === "MAN" && a.covers === assignment.receiver,
    );

    let coverage: TrackCoverage;
    if (manned !== undefined && manned.kind === "MAN") {
      coverage = {
        kind: "MAN",
        defender: requirePlayer(state, manned.defender),
        technique: manned.technique,
      };
    } else {
      const zoned = zoneDefenderFor(tunables, calls.defense.assignments, zone);
      coverage = {
        kind: "ZONE",
        defender: zoned === undefined ? undefined : requirePlayer(state, zoned.defender),
      };
    }

    return {
      assignment,
      receiver: requirePlayer(state, assignment.receiver),
      coverage,
      zone,
      // §9.1's jam is a man-coverage technique; a zone defender is not standing
      // on the line waiting to put hands on somebody who may not come to him.
      pressed: coverage.kind === "MAN" && coverage.technique === "PRESS",
      settled: false,
      jamDelaySeconds: 0,
      readySeconds: routeReadySeconds(tunables, assignment.depthClass, 0),
      releaseReceiverMod: undefined,
      releaseDefenderMod: undefined,
      baseOpenness: undefined,
      contestPosition: "EVEN",
      lastPhase: undefined,
      lastOpenness: undefined,
      lastRead: undefined,
      reachedInProgression: false,
      scrambleBaseOpenness: undefined,
    };
  });
}

/**
 * Everyone on the field, and the §3 cell they are standing in, for §12.3's
 * eligibility. This is the point where the field model's limits are most
 * visible: receivers are at their break cell, man defenders wherever the man
 * they are covering is, zone defenders in their stated cell, and everyone in
 * protection in the backfield. Nobody moves and nobody has a path.
 *
 * The quarterback is deliberately absent. A passer recovering his own tipped
 * ball is legal in some circumstances and not in others, and that is a rules
 * question the engine has no business answering to spend one modifier.
 */
function buildRecoverySpots(
  tunables: Tunables,
  state: MatchGameState,
  calls: PlayCalls,
  tracks: readonly ReceiverTrack[],
): RecoverySpot[] {
  const spots: RecoverySpot[] = [];
  const seen = new Set<string>();
  const add = (spot: RecoverySpot): void => {
    const key = String(spot.player.bio.id);
    if (seen.has(key)) return;
    seen.add(key);
    spots.push(spot);
  };

  for (const track of tracks) {
    add({ player: track.receiver, side: "OFFENSE", zone: track.zone, engagedInBlock: false });
    const defender = coverageDefender(track);
    if (defender !== undefined) {
      add({ player: defender, side: "DEFENSE", zone: track.zone, engagedInBlock: false });
    }
  }
  for (const assignment of calls.defense.assignments) {
    if (assignment.kind !== "ZONE") continue;
    add({
      player: requirePlayer(state, assignment.defender),
      side: "DEFENSE",
      zone: assignment.zone,
      engagedInBlock: false,
    });
  }
  const backfield = backfieldZone(tunables);
  for (const protection of calls.offense.protection) {
    add({ player: requirePlayer(state, protection.blocker), side: "OFFENSE", zone: backfield, engagedInBlock: true });
  }
  // §7.4 — a back who stayed in to scan is in protection whether or not he ended
  // up with anybody to block. He is in the backfield and he is not in a route.
  for (const id of calls.offense.protectionScheme?.available ?? []) {
    add({ player: requirePlayer(state, id), side: "OFFENSE", zone: backfield, engagedInBlock: true });
  }
  for (const rush of calls.defense.rush) {
    add({ player: requirePlayer(state, rush.rusher), side: "DEFENSE", zone: backfield, engagedInBlock: true });
  }
  return spots;
}

/** Air yards credited to an offensive recovery: his own route, or none. */
function airYardsFor(tracks: readonly ReceiverTrack[], id: PlayerId): number {
  return tracks.find((t) => t.assignment.receiver === id)?.assignment.airYards ?? 0;
}

/** What the defence played, derived from the assignments (never declared). */
function coverageShellFor(calls: PlayCalls): CoverageShell {
  const man = calls.defense.assignments.some((a) => a.kind === "MAN");
  const zone = calls.defense.assignments.some((a) => a.kind === "ZONE");
  if (man && zone) return "MIXED";
  if (man) return "MAN";
  if (zone) return "ZONE";
  return "NONE";
}

/*
 * The possession / down / distance / spot transition used to live here as
 * `applyOutcome`, with a second copy in `runPlay.ts`. Both are gone: there is
 * exactly one owner, `sim/outcome.ts` (FANTASY-GATE-PHASE1 §3.11).
 */
