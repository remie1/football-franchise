/**
 * The pass-play vertical slice: snap → tick loop → throw → catch → PLAY_RESULT.
 *
 * Pure: `(MatchGameState, PlayCalls, seed) → { events, newState }`. No I/O, no
 * globals, no mutation of the inputs, no randomness outside the injected PRNG.
 *
 * Out of slice by design (docs/design/match-engine.md sections not implemented
 * here): tipped balls (§12), YAC (§13), the run game (§14), zone coverage
 * (§9.4), scrambles (§8.8), penalties, weather/stamina/crowd noise (§16).
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
  RushMove,
  SimulationResult,
  ThrowType,
} from "../types.js";
import { catchTypeFor, resolveCatch } from "../resolve/catchResolution.js";
import { resolveManCoverage } from "../resolve/manCoverage.js";
import { advancePressure, forcesDecision, pocketStatusFor, sacksWithoutTarget } from "../resolve/pocket.js";
import { resolvePassRushTick } from "../resolve/passRush.js";
import type { PassRushBandLabel } from "../resolve/passRush.js";
import { maxReadsFor, readCapacityPerTick, resolveQbRead, timeBudgetSeconds } from "../resolve/qbRead.js";
import { resolveReleaseVsPress } from "../resolve/release.js";
import type { RoutePhase } from "../resolve/route.js";
import { opennessAt, routePhaseAt, routeReadySeconds } from "../resolve/route.js";
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
  pressure: number;
  previousBand: PassRushBandLabel | undefined;
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
  const throwRng = playRng.fork("throw");
  const catchRng = playRng.fork("catch");

  const matchups = buildMatchups(state, calls);
  const tracks = buildReceiverTracks(state, calls);

  const startPayload: PassPlayStartPayload = {
    kind: "PASS_PLAY_V1",
    offense: {
      team: state.offenseTeam,
      call: calls.offense.name,
      formation: calls.offense.formation,
      quarterback: state.quarterback,
      readSystem: calls.offense.readSystem,
      routes: calls.offense.routes,
      protection: calls.offense.protection,
    },
    defense: {
      team: state.defenseTeam,
      call: calls.defense.name,
      front: calls.defense.front,
      coverage: calls.defense.coverage,
      assignments: calls.defense.assignments,
      rush: calls.defense.rush,
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

  const budgetSeconds = timeBudgetSeconds(qb);
  const maxReads = maxReadsFor(calls.offense.readSystem);
  const readOrder = calls.offense.readOrder.filter((id) =>
    tracks.some((t) => t.assignment.receiver === id),
  );
  const readSet = new Set<string>();
  let readPointer = 0;
  let readAccumulator = 0;
  /**
   * Monotonic across the whole play so no two reads can share a PRNG fork label
   * — a QB with reads to spare may look at the same (only readable) receiver
   * twice in one tick, and ADR-004 requires each roll to be its own roll.
   */
  let readIndex = 0;
  let outcome: PlayOutcome | undefined;
  let tick: number = TUNABLES.clock.firstTick;

  while (outcome === undefined && tick <= TUNABLES.clock.maxTick) {
    log.tickStart(tick);

    // §7.2 — both inputs are last tick's: the bands each rusher posted (the
    // doc's single-rep rule) and the pressure each has accumulated (escalation
    // to IMMEDIATE/SACK). `previousBand` is exactly tick−0.5's result.
    const highest = matchups.reduce((max, m) => Math.max(max, m.pressure), 0);
    const previousBands = matchups.flatMap((m) => (m.previousBand === undefined ? [] : [m.previousBand]));
    const pocket: PocketStatus = pocketStatusFor(highest, previousBands);
    log.pocketStatus(pocket);

    if (pocket === "SACK") {
      outcome = {
        yards: -TUNABLES.result.sackYardsLost,
        turnover: false,
        clockRunoff: tick + TUNABLES.result.clockRunoff.sack,
      };
      break;
    }

    // ---- §7.1 line battle (feeds the NEXT tick's pocket status) -------------
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
    }

    // ---- §9.1/§9.2/§9.3 routes ---------------------------------------------
    for (const track of tracks) {
      if (tick === TUNABLES.clock.firstTick && track.pressed) {
        const release = resolveReleaseVsPress({
          receiver: track.receiver,
          defender: track.defender,
          coverageRng,
        });
        log.check(release.check);
        track.jamDelaySeconds = release.delaySeconds;
        track.readySeconds = routeReadySeconds(track.assignment.depthClass, release.delaySeconds);
        track.releaseReceiverMod = release.receiverCoverageModifier;
        track.releaseDefenderMod = release.defenderCoverageModifier;
      }

      if (track.baseOpenness === undefined && tick >= track.readySeconds) {
        const coverage = resolveManCoverage({
          receiver: track.receiver,
          defender: track.defender,
          coverageRng,
          ...(track.releaseReceiverMod === undefined ? {} : { receiverReleaseModifier: track.releaseReceiverMod }),
          ...(track.releaseDefenderMod === undefined ? {} : { defenderReleaseModifier: track.releaseDefenderMod }),
        });
        log.check(coverage.check);
        track.baseOpenness = coverage.openness;
        track.contestPosition = coverage.contestPosition;
      }

      const phase = routePhaseAt(tick, track.readySeconds, track.jamDelaySeconds);
      const openness = currentOpenness(track, tick);
      if (phase !== track.lastPhase || openness !== track.lastOpenness) {
        log.routeStatus(track.receiver.bio.id, track.assignment.routeName, phase, openness);
        track.lastPhase = phase;
        track.lastOpenness = openness;
      }
    }

    // ---- §8.2/§8.3 reads ----------------------------------------------------
    readAccumulator += readCapacityPerTick(qb, calls.offense.readSystem, pocket);
    let reads = Math.floor(readAccumulator);
    readAccumulator -= reads;
    while (reads > 0) {
      const next = nextReadable(tracks, readOrder, readPointer);
      if (next === undefined) break;
      readPointer = next.pointer;
      const target = next.track;
      readIndex += 1;
      const read = resolveQbRead(
        qb,
        currentOpenness(target, tick),
        qbReadRng.fork(`t${tick.toFixed(1)}:r${readIndex}:${String(target.receiver.bio.id)}:read`),
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
      readSet.add(String(target.receiver.bio.id));
      reads -= 1;
    }

    // ---- §8.5/§8.7 decision -------------------------------------------------
    const candidates: TargetCandidate[] = tracks
      .filter((t) => t.lastRead !== undefined)
      .map((t) => ({ receiver: t.receiver.bio.id, effectiveOpenness: t.lastRead?.effective ?? 0 }));
    const best = candidates.reduce((max, c) => Math.max(max, c.effectiveOpenness), Number.NEGATIVE_INFINITY);
    const mustDecide =
      forcesDecision(pocket) || tick >= budgetSeconds || readSet.size >= maxReads;

    const willThrow =
      candidates.length > 0 &&
      (best >= TUNABLES.qb.throwThreshold || (mustDecide && best >= TUNABLES.qb.desperationThreshold));

    if (willThrow) {
      const selection = selectTarget(qb, candidates, qbReadRng.fork(`t${tick.toFixed(1)}:decision`));
      log.check(selection.check);
      // The only branch with a §8.5 decision-quality roll behind it, and so the
      // only branch that may carry a tier (ADR-005).
      log.qbDecision("THROW", { target: selection.selected.receiver, tier: selection.check.tier });
      const track = tracks.find((t) => t.receiver.bio.id === selection.selected.receiver);
      if (track === undefined) throw new Error("@ff/engine: selected target has no route track");
      outcome = resolveThrow({
        log,
        qb,
        track,
        tick,
        pocket,
        effectiveOpenness: selection.selected.effectiveOpenness,
        throwRng,
        catchRng,
      });
      break;
    }

    if (sacksWithoutTarget(pocket)) {
      log.pocketStatus("SACK");
      outcome = {
        yards: -TUNABLES.result.sackYardsLost,
        turnover: false,
        clockRunoff: tick + TUNABLES.result.clockRunoff.sack,
      };
      break;
    }

    if (mustDecide && tick >= TUNABLES.qb.throwawayEarliestSeconds) {
      // No decision-quality roll runs on a throwaway — there was nobody to pick
      // between — so no tier (ADR-005). Same reason there is no THROW event.
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
    log.pocketStatus("SACK");
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
}

function resolveThrow(args: ThrowArgs): PlayOutcome {
  const { log, qb, track, tick, pocket, effectiveOpenness, throwRng, catchRng } = args;
  const actualOpenness = currentOpenness(track, tick);
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

function currentOpenness(track: ReceiverTrack, tick: number): number {
  if (track.baseOpenness === undefined) return 0;
  return opennessAt(track.baseOpenness, track.readySeconds, tick);
}

function nextReadable(
  tracks: readonly ReceiverTrack[],
  readOrder: readonly PlayerId[],
  pointer: number,
): { track: ReceiverTrack; pointer: number } | undefined {
  if (readOrder.length === 0) return undefined;
  for (let i = 0; i < readOrder.length; i++) {
    const index = (pointer + i) % readOrder.length;
    const id = readOrder[index];
    const track = tracks.find((t) => t.assignment.receiver === id);
    if (track !== undefined && track.baseOpenness !== undefined) {
      return { track, pointer: (index + 1) % readOrder.length };
    }
  }
  return undefined;
}

function buildMatchups(state: MatchGameState, calls: PlayCalls): RushMatchup[] {
  return calls.defense.rush.map((assignment) => {
    const protection = calls.offense.protection.find((p) => p.rusher === assignment.rusher);
    if (protection === undefined) {
      throw new Error(
        `@ff/engine: rusher ${String(assignment.rusher)} is unblocked — free-rusher/blitz-pickup (§7.4) is out of the pass-play slice`,
      );
    }
    return {
      rusher: requirePlayer(state, assignment.rusher),
      blocker: requirePlayer(state, protection.blocker),
      move: assignment.move,
      pressure: 0,
      previousBand: undefined,
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
