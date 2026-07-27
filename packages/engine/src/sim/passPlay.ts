/**
 * The pass-play vertical slice: snap → tick loop → throw → catch → PLAY_RESULT.
 *
 * Pure: `(MatchGameState, PlayCalls, seed) → { events, newState }`. No I/O, no
 * globals, no mutation of the inputs, no randomness outside the injected PRNG.
 *
 * Out of slice by design (docs/design/match-engine.md sections not implemented
 * here): tipped balls (§12), YAC (§13), the run game (§14), zone coverage
 * (§9.4), penalties, weather/stamina/crowd noise (§16).
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
 */
import { createRng, playId as makePlayId } from "@ff/contracts";
import type { PlayerId, PlayerState, Rng } from "@ff/contracts";
import { PlayEventLog } from "../events.js";
import { clamp } from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type {
  ContestPosition,
  MatchGameState,
  PassPlayStartPayload,
  PlayCalls,
  PocketStatus,
  RouteAssignment,
  RushAlignment,
  RushMove,
  SimulationResult,
  ThrowType,
} from "../types.js";
import { anticipationAvailable, resolveAnticipation } from "../resolve/anticipation.js";
import { catchTypeFor, resolveCatch } from "../resolve/catchResolution.js";
import { resolveManCoverage } from "../resolve/manCoverage.js";
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
import type { RushThreat } from "../resolve/rushThreat.js";
import {
  clearsThreat,
  delayThreat,
  hasArrived,
  minTimeToArrival,
  recoverySecondsFor,
  rushAlignmentFor,
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
  readonly blocker: PlayerState;
  readonly move: RushMove;
  readonly alignment: RushAlignment;
  pressure: number;
  previousBand: PassRushBandLabel | undefined;
  /** Set when he beats the block; cleared when the blocker resets him. */
  threat: RushThreat | undefined;
  /** Whether the CURRENT threat's arrival has already been published (ADR-007). */
  announcedArrival: boolean;
}

/** The quarterback outside the pocket (§8.8), on pursuit's clock. */
interface ScrambleState {
  readonly sinceTick: number;
  readonly pursuitAtTick: number;
  /** §8.8 escape roll — what justifies the pursuit clock. Never a RUSH_THREAT. */
  readonly escapeRollRef: string;
}

interface ReceiverTrack {
  readonly assignment: RouteAssignment;
  readonly receiver: PlayerState;
  readonly defender: PlayerState;
  readonly pressed: boolean;
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

interface PlayOutcome {
  readonly yards: number;
  readonly turnover: boolean;
  readonly clockRunoff: number;
  readonly score?: number;
}

function requirePlayer(state: MatchGameState, id: PlayerId): PlayerState {
  const p = state.players[id as unknown as string];
  if (p === undefined) throw new Error(`@ff/engine: player ${String(id)} is not in GameState.players`);
  return p;
}

export function simulatePassPlay(
  state: MatchGameState,
  calls: PlayCalls,
  seed: string,
): SimulationResult {
  const playId = makePlayId(`${String(state.gameId)}:play:${state.playNumber}`);
  const log = new PlayEventLog(state.gameId, playId, state.at, state.nextEventSeq);
  const qb = requirePlayer(state, state.quarterback);

  const playRng = createRng(seed, `game:${String(state.gameId)}`).fork(`play:${state.playNumber}`);
  const rushRng = playRng.fork("rush");
  const coverageRng = playRng.fork("coverage");
  const qbReadRng = playRng.fork("qbread");
  const movementRng = playRng.fork("movement");
  const throwRng = playRng.fork("throw");
  const catchRng = playRng.fork("catch");

  const matchups = buildMatchups(state, calls);
  const tracks = buildReceiverTracks(state, calls);

  const system = calls.offense.readSystem;
  const budgetSeconds = timeBudgetSeconds(qb, system);
  const maxReads = maxReadsFor(system);
  const throwThreshold = throwThresholdFor(system);
  const readOrder = calls.offense.readOrder.filter((id) =>
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
      routes: calls.offense.routes,
      // Filtered, not echoed: this is the progression he actually worked.
      readOrder,
      protection: calls.offense.protection,
    },
    defense: {
      team: state.defenseTeam,
      call: calls.defense.name,
      front: calls.defense.front,
      coverage: calls.defense.coverage,
      assignments: calls.defense.assignments,
      // Alignment resolved, not echoed: it is the input the §7.2 arrival model
      // actually ran on, and the only place the stream states it.
      rush: matchups.map((m) => ({
        rusher: m.rusher.bio.id,
        move: m.move,
        alignment: m.alignment,
      })),
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
  let tick: number = TUNABLES.clock.firstTick;
  let stepUpsUsed = 0;
  let scramble: ScrambleState | undefined;

  /** ADR-007 — every threat transition is published, not inferred. */
  const publishThreat = (
    threat: RushThreat,
    state: "TRAVELLING" | "DELAYED" | "RESET" | "ARRIVED",
  ): void => {
    log.rushThreat(threat.rusher, threat.alignment, threat.rollRef, threat.etaTick, state);
  };

  /**
   * §9.3 — resolve the break point. Called from the route loop when the route's
   * time comes, and from the read loop when the quarterback ANTICIPATES it: a
   * ball thrown on timing arrives as the receiver comes out of his cut, so the
   * coverage rep that decides the window is the same rep, resolved at the same
   * point of the route, whether or not the QB waited to watch it.
   */
  const resolveBreakPoint = (track: ReceiverTrack): void => {
    if (track.baseOpenness !== undefined) return;
    const coverage = resolveManCoverage({
      receiver: track.receiver,
      defender: track.defender,
      // Forked per receiver rather than drawn from a shared stream: a receiver's
      // rep against his man must not depend on the order the QB looked at people.
      coverageRng: coverageRng.fork(String(track.assignment.receiver)),
      ...(track.releaseReceiverMod === undefined ? {} : { receiverReleaseModifier: track.releaseReceiverMod }),
      ...(track.releaseDefenderMod === undefined ? {} : { defenderReleaseModifier: track.releaseDefenderMod }),
    });
    log.check(coverage.check);
    track.baseOpenness = coverage.openness;
    track.contestPosition = coverage.contestPosition;
  };

  const sack = (at: number): PlayOutcome => {
    // A tick has ONE status, and a tick that ends in a sack ends in SACK. This
    // rewrites the status already emitted for this tick rather than appending a
    // second POCKET_STATUS, which double-counted for status-tick consumers.
    log.escalatePocketStatus("SACK");
    return {
      yards: -TUNABLES.result.sackYardsLost,
      turnover: false,
      clockRunoff: at + TUNABLES.result.clockRunoff.sack,
    };
  };

  while (outcome === undefined && tick <= TUNABLES.clock.maxTick) {
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
    const pocket: PocketStatus = pocketStatusFor(highest, previousBands, minTta);
    log.pocketStatus(pocket);

    // ---- §7.1 line battle (feeds the NEXT tick's pocket status) -------------
    // Suspended once the QB is out of the pocket: the protection is broken and
    // what is left is pursuit, which runs on the scramble's own clock (§8.8).
    if (scramble === undefined) {
      const tickRng = rushRng.fork(`t${tick.toFixed(1)}`);
      for (const m of matchups) {
        const rush = resolvePassRushTick({
          rusher: m.rusher,
          blocker: m.blocker,
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
        } else if (clearsThreat(rush.band)) {
          if (before !== undefined) {
            publishThreat(before, "RESET");
            m.threat = undefined;
            m.announcedArrival = false;
          }
        } else if (before !== undefined) {
          // Still coming, but a blocker who recovered position costs him ground.
          const delayed = delayThreat(before, recoverySecondsFor(rush.band));
          if (delayed !== before) {
            m.threat = delayed;
            publishThreat(delayed, "DELAYED");
            m.announcedArrival = false;
          }
        }
      }
    }

    // ---- §9.1/§9.2/§9.3 routes ---------------------------------------------
    for (const track of tracks) {
      if (tick === TUNABLES.clock.firstTick && track.pressed) {
        const release = resolveReleaseVsPress({
          receiver: track.receiver,
          defender: track.defender,
          coverageRng: coverageRng.fork(String(track.assignment.receiver)),
        });
        log.check(release.check);
        track.jamDelaySeconds = release.delaySeconds;
        track.readySeconds = routeReadySeconds(track.assignment.depthClass, release.delaySeconds);
        track.releaseReceiverMod = release.receiverCoverageModifier;
        track.releaseDefenderMod = release.defenderCoverageModifier;
      }

      if (tick >= track.readySeconds) resolveBreakPoint(track);

      // §8.8 — a receiver who has abandoned the route to find open grass is not
      // at a point on his route's timeline; the play has changed shape (ADR-007).
      const phase: RoutePhase =
        scramble !== undefined && track.scrambleBaseOpenness !== undefined
          ? "SCRAMBLE_DRILL"
          : routePhaseAt(tick, track.readySeconds, track.jamDelaySeconds);
      const openness = currentOpenness(track, tick, scramble);
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
        scramble === undefined ? [] : [visionConeRollModifier(target.assignment.depthClass)];
      const read = resolveQbRead(
        qb,
        readOpenness(target, tick, scramble),
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

    readAccumulator += readCapacityPerTick(qb, system, pocket);
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
        if (!anticipationAvailable(lead)) break;
        anticipationIndex += 1;
        const antic = resolveAnticipation({
          qb,
          system,
          leadSeconds: lead,
          depthClass: target.assignment.depthClass,
          firstRead: step.progressionIndex === 0,
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
    const mustDecide = forcesDecision(pocket) || tick >= budgetSeconds || readsUsed >= maxReads;

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
        log,
        qb,
        track,
        tick,
        pocket,
        effectiveOpenness: selection.selected.effectiveOpenness,
        throwRng,
        catchRng,
        scramble,
      });
    };

    if (candidates.length > 0 && bestOf(candidates) >= throwThreshold) {
      outcome = throwTo(
        selectTarget(qb, candidates, qbReadRng.fork(`t${tick.toFixed(1)}:decision`)),
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
        if (effective >= TUNABLES.qb.checkdown.threshold) {
          outletId = outlet.receiver.bio.id;
          candidates = readCandidates();
        } else {
          // Looked and did not like it. He keeps the look (it is a real read)
          // but the outlet does not enter the pool at a bar it cannot clear.
          candidates = readCandidates().filter((c) => c.receiver !== outlet.receiver.bio.id);
        }
      }
    }

    if (mustDecide && candidates.length > 0 && bestOf(candidates) >= TUNABLES.qb.desperationThreshold) {
      outcome = throwTo(
        selectTarget(qb, candidates, qbReadRng.fork(`t${tick.toFixed(1)}:decision`)),
        outletId,
      );
      break;
    }

    const throwawayAvailable = tick >= TUNABLES.qb.throwawayEarliestSeconds;

    if (scramble !== undefined) {
      // Outside the pocket the clock is pursuit's, not the rush's. When it runs
      // out he tucks it. PLACEHOLDER: flat yardage — §14 owns ball-carrier
      // resolution and is the next dispatch. This is not a rushing model.
      if (tick >= scramble.pursuitAtTick) {
        log.qbDecision("SCRAMBLE");
        outcome = {
          yards: TUNABLES.result.scrambleRunYards,
          turnover: false,
          clockRunoff: tick + TUNABLES.result.clockRunoff.scrambleRun,
        };
        break;
      }
      log.qbDecision("HOLD");
      tick = Number((tick + TUNABLES.clock.tickStepSeconds).toFixed(1));
      continue;
    }

    // §7.2 SACK — "rusher reaches QB before ball released". Arrival is now a
    // NECESSARY condition: the status list alone used to sack a quarterback one
    // second into his drop for a rep lost fifty feet away.
    if (hasArrived(threats, tick) && sacksWithoutTarget(pocket)) {
      outcome = sack(tick);
      break;
    }

    // §7.2's "move" branch. Reached only when he is not throwing and nobody has
    // arrived: stand in, climb, leave, or eat it — chosen on his own attributes.
    if (forcesDecision(pocket)) {
      const movement = resolvePocketMovement({
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
          m.threat = delayThreat(m.threat, TUNABLES.pocketMovement.stepUp.edgeThreatDelaySeconds);
          m.announcedArrival = false;
          // ADR-007 — the climb is exactly the adjustment the printout used to
          // have to disclaim. The arrival it publishes here is the real one.
          publishThreat(m.threat, "DELAYED");
          // A rusher run past by a climbing quarterback starts his rep over.
          if (TUNABLES.pocketMovement.stepUp.resetsEdgePressure) m.pressure = 0;
        }
        tick = Number((tick + TUNABLES.clock.tickStepSeconds).toFixed(1));
        continue;
      }

      if (movement.response === "ESCAPE") {
        const escape = resolveScramble({
          qb,
          tick,
          threats,
          scrambleRng: movementRng.fork(`t${tick.toFixed(1)}:scramble`),
        });
        log.check(escape.check);
        if (escape.sacked) {
          outcome = sack(tick);
          break;
        }
        if (escape.escaped) {
          scramble = {
            sinceTick: tick,
            pursuitAtTick: pursuitDeadline(tick),
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
            track.scrambleBaseOpenness = currentOpenness(track, tick, undefined);
          }
          log.qbDecision("SCRAMBLE");
          tick = Number((tick + TUNABLES.clock.tickStepSeconds).toFixed(1));
          continue;
        }
        // CONTAINED: he tried to get out, got walled in, and lost the tick.
        log.qbDecision("HOLD");
        tick = Number((tick + TUNABLES.clock.tickStepSeconds).toFixed(1));
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
          clockRunoff: tick + TUNABLES.result.clockRunoff.throwaway,
        };
        break;
      }

      // STAND_IN: he feels it, resets his feet, and keeps reading.
      log.qbDecision("HOLD");
      tick = Number((tick + TUNABLES.clock.tickStepSeconds).toFixed(1));
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
        clockRunoff: tick + TUNABLES.result.clockRunoff.throwaway,
      };
      break;
    }

    // A hold forced by nobody being open is correct QB behaviour, not a failed
    // check. No §8.5 roll ran, so there is no honest tier to report (ADR-005).
    log.qbDecision("HOLD");
    tick = Number((tick + TUNABLES.clock.tickStepSeconds).toFixed(1));
  }

  if (outcome === undefined) {
    // Nobody got open and the pocket never broke: coverage sack at the horizon.
    // Escalate rather than append — the last tick already reported a status, and
    // two POCKET_STATUS events for one tick double-count for calibration.
    log.escalatePocketStatus("SACK");
    outcome = {
      yards: -TUNABLES.result.sackYardsLost,
      turnover: false,
      clockRunoff: TUNABLES.clock.maxTick + TUNABLES.result.clockRunoff.sack,
    };
  }

  const scored =
    !outcome.turnover && state.ballOn + outcome.yards >= 100
      ? { ...outcome, score: TUNABLES.result.touchdownPoints }
      : outcome;

  log.playResult(scored.yards, scored.turnover, scored.clockRunoff, scored.score);

  return {
    events: log.drain(),
    newState: applyOutcome(state, scored, log.nextSeq),
  };
}

// ---------------------------------------------------------------------------

interface ThrowArgs {
  readonly log: PlayEventLog;
  readonly qb: PlayerState;
  readonly track: ReceiverTrack;
  readonly tick: number;
  readonly pocket: PocketStatus;
  readonly effectiveOpenness: number;
  readonly throwRng: Rng;
  readonly catchRng: Rng;
  readonly scramble: ScrambleState | undefined;
}

function resolveThrow(args: ThrowArgs): PlayOutcome {
  const { log, qb, track, tick, pocket, effectiveOpenness, throwRng, catchRng, scramble } = args;
  // The window the ball actually arrives into. On an anticipation throw that is
  // the window at the BREAK, not at the release — the receiver is still running.
  const actualOpenness = readOpenness(track, tick, scramble);
  const throwType: ThrowType = selectThrowType(track.assignment.depthClass, effectiveOpenness);
  const shortfall = armStrengthShortfall(qb, track.assignment.airYards);

  const accuracy = resolveAccuracy({
    qb,
    airYards: track.assignment.airYards,
    throwType,
    pocket,
    armShortfall: shortfall,
    throwRng,
  });
  log.check(accuracy.check);
  log.throwBall(track.receiver.bio.id, throwType, accuracy.check.tier);

  // §10.4 MISS: not catchable. Nothing downstream fires.
  if (!accuracy.bandEffects.catchable) {
    return { yards: 0, turnover: false, clockRunoff: tick + TUNABLES.result.clockRunoff.incompletion };
  }

  if (laneDefenderEligible(track.contestPosition, actualOpenness)) {
    const lane = resolvePassingLane({
      defender: track.defender,
      quarterback: qb,
      throwType,
      throwRng,
    });
    log.check(lane.check);
    if (lane.deflected) {
      return { yards: 0, turnover: false, clockRunoff: tick + TUNABLES.result.clockRunoff.incompletion };
    }
  }

  const catchType = catchTypeFor(actualOpenness);
  const result = resolveCatch({
    receiver: track.receiver,
    defender: track.defender,
    accuracy: accuracy.bandEffects,
    contestPosition: track.contestPosition,
    catchType,
    catchRng,
  });
  // ADR-004: the CHECK carries the roll, the summary references it by rngLabel.
  log.check(result.check);
  log.catchResolution(track.receiver.bio.id, result.catchType, result.check.roll.rngLabel, result.caught);

  if (result.interception) {
    return { yards: 0, turnover: true, clockRunoff: tick + TUNABLES.result.clockRunoff.interception };
  }
  if (!result.caught) {
    return { yards: 0, turnover: false, clockRunoff: tick + TUNABLES.result.clockRunoff.incompletion };
  }
  // YAC is out of this slice: the gain is the air yards.
  return {
    yards: track.assignment.airYards,
    turnover: false,
    clockRunoff: tick + TUNABLES.result.clockRunoff.completion,
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
  track: ReceiverTrack,
  tick: number,
  scramble: ScrambleState | undefined,
): number {
  if (scramble !== undefined && track.scrambleBaseOpenness !== undefined) {
    return scrambleOpennessAt(track.scrambleBaseOpenness, scramble.sinceTick, tick);
  }
  if (track.baseOpenness === undefined) return 0;
  if (tick < track.readySeconds) return 0;
  return opennessAt(track.baseOpenness, track.readySeconds, tick);
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
  track: ReceiverTrack,
  tick: number,
  scramble: ScrambleState | undefined,
): number {
  if (scramble !== undefined && track.scrambleBaseOpenness !== undefined) {
    return scrambleOpennessAt(track.scrambleBaseOpenness, scramble.sinceTick, tick);
  }
  if (track.baseOpenness === undefined) return 0;
  return opennessAt(track.baseOpenness, track.readySeconds, Math.max(tick, track.readySeconds));
}

/**
 * Every rusher currently on his way to the passer. Once he is out of the
 * pocket, the only clock that matters is pursuit's — modelled as a single
 * threat so status derivation and arrival stay one code path.
 */
function activeThreats(
  matchups: readonly RushMatchup[],
  scramble: ScrambleState | undefined,
): RushThreat[] {
  if (scramble !== undefined) {
    const chaser = matchups[0];
    if (chaser === undefined) return [];
    return [
      {
        rusher: chaser.rusher.bio.id,
        alignment: "EDGE",
        wonAtTick: scramble.sinceTick,
        etaTick: scramble.pursuitAtTick,
        // Not a pass-rush rep, so it is never published as a RUSH_THREAT; it
        // still names the roll that put the quarterback on this clock.
        rollRef: scramble.escapeRollRef,
      },
    ];
  }
  return matchups.flatMap((m) => (m.threat === undefined ? [] : [m.threat]));
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

function buildMatchups(state: MatchGameState, calls: PlayCalls): RushMatchup[] {
  return calls.defense.rush.map((assignment) => {
    const protection = calls.offense.protection.find((p) => p.rusher === assignment.rusher);
    if (protection === undefined) {
      throw new Error(
        `@ff/engine: rusher ${String(assignment.rusher)} is unblocked — free-rusher/blitz-pickup (§7.4) is out of the pass-play slice`,
      );
    }
    const rusher = requirePlayer(state, assignment.rusher);
    return {
      rusher,
      blocker: requirePlayer(state, protection.blocker),
      move: assignment.move,
      alignment: rushAlignmentFor(rusher.bio.position, assignment.alignment),
      pressure: 0,
      previousBand: undefined,
      threat: undefined,
      announcedArrival: false,
    };
  });
}

function buildReceiverTracks(state: MatchGameState, calls: PlayCalls): ReceiverTrack[] {
  return calls.offense.routes.map((assignment) => {
    const cover = calls.defense.assignments.find((a) => a.covers === assignment.receiver);
    if (cover === undefined) {
      throw new Error(
        `@ff/engine: receiver ${String(assignment.receiver)} has no man defender — zone coverage (§9.4) is out of the pass-play slice`,
      );
    }
    return {
      assignment,
      receiver: requirePlayer(state, assignment.receiver),
      defender: requirePlayer(state, cover.defender),
      pressed: cover.technique === "PRESS",
      jamDelaySeconds: 0,
      readySeconds: routeReadySeconds(assignment.depthClass, 0),
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

function applyOutcome(state: MatchGameState, outcome: PlayOutcome, nextSeq: number): MatchGameState {
  const ballOn = clamp(state.ballOn + outcome.yards, 0, 100);
  const clockSeconds = Math.max(0, state.clockSeconds - outcome.clockRunoff);
  const base = {
    ...state,
    nextEventSeq: nextSeq,
    playNumber: state.playNumber + 1,
    clockSeconds,
  };

  if (outcome.turnover) {
    return {
      ...base,
      offenseTeam: state.defenseTeam,
      defenseTeam: state.offenseTeam,
      ballOn: 100 - ballOn,
      down: 1,
      distance: TUNABLES.result.firstDownResetsDistance,
    };
  }

  const gotFirstDown = outcome.yards >= state.distance;
  return {
    ...base,
    ballOn,
    down: gotFirstDown ? 1 : state.down + 1,
    distance: gotFirstDown
      ? TUNABLES.result.firstDownResetsDistance
      : Math.max(1, state.distance - outcome.yards),
  };
}
