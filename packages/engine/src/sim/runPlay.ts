/**
 * §14 — THE DESIGNED RUN, snap through result.
 *
 * Pure and seeded like the dropback: `(MatchGameState, RunPlayCalls, seed) →
 * { events, newState }`. §14.2's four phases are the shape of the function, and
 * each one is on the tick the doc puts it on:
 *
 *   PHASE 1 (0.5)  §6.3 engagement in every gap, plus §6.2's gap-integrity roll
 *                  on a zone play — the roll that produces cutbacks.
 *   PHASE 2 (1.0)  §6.4 climb to the linebacker, wherever the first level was
 *                  won by 10+.
 *   PHASE 3 (1.5)  §14.2's vision check (zone only), the gap selection it
 *                  decides, and §14.3's point of attack.
 *   OPEN FIELD     §14.4, which is `advanceCarrier` — the SAME function the pass
 *                  play calls for YAC, because a man with the ball is a man with
 *                  the ball.
 *
 * WHAT IS NOT HERE. Fumbles: `CheckKind` has `fumble` and the registry has
 * `ballSecurity`, but §13 and §14 give no fumble trigger, no target number and
 * no modifier table. Inventing one would put a turnover in the stream that no
 * rule in the design doc produced, so there are none. §15.3 (short yardage),
 * §16 (weather/stamina) and penalties are out of scope here as they are for the
 * pass play.
 */
import { createRng, playId as makePlayId } from "@ff/contracts";
import type { PlayerId, PlayerState } from "@ff/contracts";
import { PlayEventLog } from "../events.js";
import type { CheckEmission } from "../events.js";
import { clamp } from "../rolls.js";
import { TUNABLES } from "../tunables.js";
import type { Tunables } from "../tunables.js";
import type {
  CoverageShell,
  GapId,
  MatchGameState,
  RunPlayCalls,
  RunPlayStartPayload,
  SimulationResult,
} from "../types.js";
import { assertCoherentRunCall } from "../validate/playCall.js";
import { applyPlayOutcome } from "./outcome.js";
import type { PlayOutcome } from "./outcome.js";
import type { Pursuer } from "../resolve/ballCarrier.js";
import {
  advanceCarrier,
  depthOfVerticalZone,
  resolveTackleContest,
  zoneOfDefender,
} from "../resolve/ballCarrier.js";
import {
  climbTriggered,
  resolveGapIntegrity,
  resolveRunBlock,
  resolveSecondLevelClimb,
} from "../resolve/runBlock.js";
import type { GapResult } from "../resolve/runGame.js";
import { gapKey, pointOfAttackFor, resolveRbVision, selectGap } from "../resolve/runGame.js";
import { rushAlignmentFor } from "../resolve/rushThreat.js";

interface GapEngagement extends GapResult {
  readonly blocker: PlayerState;
  readonly defender: PlayerState;
}

function requirePlayer(state: MatchGameState, id: PlayerId): PlayerState {
  const p = state.players[id as unknown as string];
  if (p === undefined) throw new Error(`@ff/engine: player ${String(id)} is not in GameState.players`);
  return p;
}

export function simulateRunPlay(
  state: MatchGameState,
  calls: RunPlayCalls,
  seed: string,
  /** Optional HERE and required beneath — see `simulatePassPlay`. */
  tunables: Tunables = TUNABLES,
): SimulationResult {
  // ADR-006 — internal coherence only, before a single die is thrown.
  assertCoherentRunCall(state, calls);

  const playId = makePlayId(`${String(state.gameId)}:play:${state.playNumber}`);
  const log = new PlayEventLog(state.gameId, playId, state.at, state.nextEventSeq, tunables);
  const carrier = requirePlayer(state, calls.offense.carrier);

  const playRng = createRng(seed, `game:${String(state.gameId)}`).fork(`play:${state.playNumber}`);
  const lineRng = playRng.fork("line");
  const climbRng = playRng.fork("climb");
  const decisionRng = playRng.fork("decision");
  const carrierRng = playRng.fork("carrier");

  const phases = tunables.runGame.phaseTicks;
  const designed: GapId = { gap: calls.offense.designedGap, side: calls.offense.designedSide };

  log.setTick(undefined);
  log.playStart(buildStartPayload(tunables, state, calls));

  // ---- PHASE 1 (§14.2 / §6.3 / §6.2) --------------------------------------
  log.tickStart(phases.lineBattle);
  const engagements: GapEngagement[] = [];
  const engagedDefenders = new Set<string>();
  for (const assignment of calls.offense.blocking) {
    const key = gapKey({ gap: assignment.gap, side: assignment.side });
    const blocker = requirePlayer(state, assignment.blocker);
    const defender = requirePlayer(state, assignment.defender);
    const gapRng = lineRng.fork(key);

    const block = resolveRunBlock({
      tunables,
      blocker,
      defender,
      doubleTeam: assignment.doubleTeamWith !== undefined,
      pulling: assignment.pulling === true,
      blockRng: gapRng.fork("engage"),
    });
    log.check(block.check);

    // §6.2 — the zone scheme's own resolution, and the only reader of
    // `gapDiscipline` anywhere in the engine.
    let overflowed = false;
    if (calls.offense.scheme === "ZONE") {
      const integrity = resolveGapIntegrity({ tunables, blocker, defender, gapRng: gapRng.fork("integrity") });
      log.check(integrity.check);
      overflowed = integrity.overflowed;
    }

    engagedDefenders.add(String(defender.bio.id));
    engagements.push({
      gap: assignment.gap,
      side: assignment.side,
      blockMargin: block.margin,
      overflowed,
      freeLinebacker: false,
      blocker,
      defender,
    });
  }

  // ---- PHASE 2 (§14.2 / §6.4) ---------------------------------------------
  log.tickStart(phases.secondLevel);
  const secondLevel = secondLevelDefenders(tunables, state, calls, engagedDefenders);
  const climbedOut = new Set<string>();
  let climbIndex = 0;
  for (const engagement of engagements) {
    if (!climbTriggered(tunables, engagement.blockMargin)) continue;
    const linebacker = secondLevel.find((d) => !climbedOut.has(String(d.player.bio.id)));
    if (linebacker === undefined) break;
    climbIndex += 1;
    const climb = resolveSecondLevelClimb({
      tunables,
      climber: engagement.blocker,
      linebacker: linebacker.player,
      climbRng: climbRng.fork(`c${climbIndex}:${gapKey(engagement)}`),
    });
    log.check(climb.check);
    // Whether the climb worked or not, this blocker has spent his second-level
    // attempt on this man; a failed climb leaves him free, which is exactly what
    // §14.4 then has to deal with.
    climbedOut.add(String(linebacker.player.bio.id));
    if (!climb.engaged) continue;
    linebacker.engaged = true;
  }

  // ---- PHASE 3 (§14.2 / §14.3) --------------------------------------------
  log.tickStart(phases.rbDecision);
  let foundBestLane = false;
  if (calls.offense.scheme === "ZONE") {
    const vision = resolveRbVision({ tunables, carrier, visionRng: decisionRng.fork("vision") });
    log.check(vision.check);
    foundBestLane = vision.foundBestLane;
  }
  const chosen = selectGap(engagements, designed, foundBestLane);
  if (chosen === undefined) throw new Error("@ff/engine: run call resolved to no gap");
  const running = engagements.find((e) => e.gap === chosen.gap && e.side === chosen.side);
  if (running === undefined) throw new Error("@ff/engine: chosen gap has no engagement");

  const poa = pointOfAttackFor(tunables, running.blockMargin);
  const yardsToGoalLine = 100 - state.ballOn;
  let yards = poa.yardsBeforeContact;
  let down = false;

  // §14.3's two contests at the line. Neither is a §14.4 second-level tackle:
  // the attribute pairings are the doc's own and they are different.
  if (poa.contact === "POWER" || poa.contact === "EVADE") {
    const contest = resolveTackleContest({
      tunables,
      carrier,
      tackler: running.defender,
      profile: poa.contact === "POWER" ? "atLosPower" : "atLosEvade",
      contestRng: decisionRng.fork(`poa:${gapKey(running)}`),
    });
    log.check(contest.check);
    yards += contest.yards;
    if (contest.tackled) {
      down = true;
      // §14.3 "Failure: TFL". The doc never says how far back; see
      // `TUNABLES.runGame.tflYardsLost`.
      if (poa.contact === "EVADE") yards = -tunables.runGame.tflYardsLost;
    }
  }

  // ---- §14.4 second level and beyond — the SHARED machinery ---------------
  if (!down) {
    log.tickStart(phases.openField);
    const pursuers = buildPursuers(tunables, state, calls, secondLevel, engagedDefenders);
    const advance = advanceCarrier({
      tunables,
      carrier,
      mode: "RUSH",
      pursuers,
      startYards: yards,
      yardsToGoalLine,
      carrierRng,
      emitCheck: (check: CheckEmission) => log.check(check),
      // ADR-010 item 1 — a carry's zone-by-zone advance, in its own event. Not
      // YAC_ZONE: rushing yards in a receiving aggregate is exactly the silent
      // corruption the schema exists to prevent.
      emitZone: (zone, yardsInZone) => log.rushZone(carrier.bio.id, zone, yardsInZone),
      onZoneEntered: (zone) => log.tickStart(zoneTick(tunables, zone)),
    });
    // §17.2's "broken tackles" is counted from the `break_tackle` CHECKs, not
    // carried here: the stream is the source of truth (Charter pillar 3).
    yards = advance.yards;
  }

  const gained = Math.round(clamp(yards, -state.ballOn, yardsToGoalLine));
  // §14.3's own number rides along, so "is the line good or is the back good?"
  // is a subtraction rather than an unanswerable question (ADR-010 item 2).
  log.runResolution(carrier.bio.id, "DESIGNED", gapKey(running), poa.yardsBeforeContact, gained);

  const outcome: PlayOutcome = {
    yards: gained,
    turnover: false,
    clockRunoff: tunables.result.clockRunoff.run,
    ...(state.ballOn + gained >= 100 ? { score: tunables.result.touchdownPoints } : {}),
  };
  log.playResult(outcome.yards, outcome.turnover, outcome.clockRunoff, outcome.score);

  return { events: log.drain(), newState: applyPlayOutcome(tunables, state, outcome, log.nextSeq) };
}

// ---------------------------------------------------------------------------

/** A defender who was not engaged at the line, and where he is standing. */
interface SecondLevelDefender {
  readonly player: PlayerState;
  readonly depthYards: number;
  /** A §6.4 climb got to him. */
  engaged: boolean;
}

/**
 * Everybody the run has still to get past, and how far downfield they are.
 *
 * Depth comes from the §3 grid where the grid knows: a zone defender is at the
 * depth of his own stated cell, a front defender is at the line. A MAN defender
 * on a run play is covering somebody who is not running a route, so the grid has
 * nothing to say and `TUNABLES.runGame.manDefenderDepthYards` does — that is a
 * fake, and it is the same class of fake as `zoneModel.defaultHorizontal`
 * (CALIBRATION-BACKLOG 8).
 *
 * Defenders engaged in a gap are NOT here: §6.3 resolved them and §14.3 resolved
 * the one in the ball's gap. A penetrating defender in a DIFFERENT gap therefore
 * does not chase, which is a real simplification.
 */
function secondLevelDefenders(
  tunables: Tunables,
  state: MatchGameState,
  calls: RunPlayCalls,
  engagedDefenders: ReadonlySet<string>,
): SecondLevelDefender[] {
  const out: SecondLevelDefender[] = [];
  const seen = new Set<string>(engagedDefenders);
  const add = (id: PlayerId, depthYards: number): void => {
    const key = String(id);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ player: requirePlayer(state, id), depthYards, engaged: false });
  };

  for (const assignment of calls.defense.assignments) {
    add(
      assignment.defender,
      assignment.kind === "ZONE"
        ? depthOfVerticalZone(tunables, assignment.zone.vertical)
        : tunables.runGame.manDefenderDepthYards,
    );
  }
  for (const rusher of calls.defense.rush) {
    add(rusher.rusher, depthOfVerticalZone(tunables, tunables.zoneModel.backfieldVertical));
  }
  // Deepest last: a back running downhill meets the linebackers before the
  // safeties. Ties break on id so the order is total and needs no die.
  return out.sort(
    (a, b) => a.depthYards - b.depthYards || String(a.player.bio.id).localeCompare(String(b.player.bio.id)),
  );
}

/** §14.4's pool, with §14.5's perimeter blocks attached to the men they target. */
function buildPursuers(
  tunables: Tunables,
  state: MatchGameState,
  calls: RunPlayCalls,
  secondLevel: readonly SecondLevelDefender[],
  engagedDefenders: ReadonlySet<string>,
): Pursuer[] {
  const perimeter = new Map<string, { blocker: PlayerState; blockType: "STALK" | "CRACK" | "LEAD" }>();
  for (const block of calls.offense.perimeter ?? []) {
    perimeter.set(String(block.defender), {
      blocker: requirePlayer(state, block.blocker),
      blockType: block.blockType,
    });
  }

  const out: Pursuer[] = [];
  for (const defender of secondLevel) {
    // A linebacker a lineman climbed to and engaged is out of the play (§6.4
    // "SUCCESS: LB engaged, clean lane for RB").
    if (defender.engaged) continue;
    if (engagedDefenders.has(String(defender.player.bio.id))) continue;
    const zone = zoneOfDefender(tunables, defender.depthYards, 0);
    if (zone === undefined) continue;
    const block = perimeter.get(String(defender.player.bio.id));
    out.push({
      defender: defender.player,
      zone,
      ...(block === undefined ? {} : { blocker: block.blocker, blockType: block.blockType }),
    });
  }
  return out;
}

/** Ticks for the open-field phase, half a second per §13.1 zone. */
function zoneTick(tunables: Tunables, zone: number): number {
  const phases = tunables.runGame.phaseTicks;
  return Number((phases.openField + (zone - 1) * tunables.clock.tickStepSeconds).toFixed(1));
}

function buildStartPayload(
  tunables: Tunables,
  state: MatchGameState,
  calls: RunPlayCalls,
): RunPlayStartPayload {
  return {
    kind: "RUN_PLAY_V1",
    offense: {
      team: state.offenseTeam,
      call: calls.offense.name,
      formation: calls.offense.formation,
      scheme: calls.offense.scheme,
      carrier: calls.offense.carrier,
      designedGap: gapKey({ gap: calls.offense.designedGap, side: calls.offense.designedSide }),
      blocking: calls.offense.blocking,
      perimeter: calls.offense.perimeter ?? [],
    },
    defense: {
      team: state.defenseTeam,
      call: calls.defense.name,
      front: calls.defense.front,
      coverage: coverageShellFor(calls.defense.assignments),
      assignments: calls.defense.assignments,
      rush: calls.defense.rush.map((r) => ({
        rusher: r.rusher,
        move: r.move,
        alignment: rushAlignmentFor(tunables, requirePlayer(state, r.rusher).bio.position, r.alignment),
      })),
    },
    situation: {
      down: state.down,
      distance: state.distance,
      ballOn: state.ballOn,
      clockSeconds: state.clockSeconds,
    },
  };
}

function coverageShellFor(
  assignments: RunPlayCalls["defense"]["assignments"],
): CoverageShell {
  const man = assignments.some((a) => a.kind === "MAN");
  const zone = assignments.some((a) => a.kind === "ZONE");
  if (man && zone) return "MIXED";
  if (man) return "MAN";
  if (zone) return "ZONE";
  return "NONE";
}

/*
 * `applyRunOutcome` used to live here — a SECOND copy of the pass play's
 * transition, and one that had already drifted (it had no turnover branch, which
 * was invisible only because §13/§14 specify no fumble). Both copies are gone;
 * `sim/outcome.ts` is the one owner (FANTASY-GATE-PHASE1 §3.11).
 */
