/**
 * THE GAME LOOP — opening kickoff to final whistle.
 *
 * `(MatchState, GameInputs, seed) → { events, newState, summary, statlines }`,
 * which is the play loop's shape one level up. Pure: no I/O, no globals, no wall
 * clock, no mutation of the arguments, no randomness outside the injected PRNG.
 *
 * ================== THE FIVE STRUCTURAL COMMITMENTS ==================
 * (`docs/decisions/FANTASY-GATE-PHASE1.md` §3, items marked ★.)
 *
 * 1. STATE IS A VALUE. Everything carried forward is in `MatchState` — flat,
 *    readonly, serializable, complete. The two locals that outlive an iteration
 *    (`periodScores`, `drivesCompleted`) are both re-derivable from the stream
 *    and are kept only to avoid a second pass over it. No instance fields, no
 *    closures over game facts, no suspended generator.
 *
 * 2. EVERY DRAW IS ADDRESSED BY FORK LABEL, NEVER BY STREAM POSITION. No `Rng`
 *    is threaded forward. Each draw is a fresh fork of `game:{id}` whose label
 *    names the thing being decided:
 *
 *      game:{id}/coin                       the toss
 *      game:{id}/kickoff:{n}/kick|return    the n-th kickoff
 *      game:{id}/drive:{k}/punt|return      the punt that ended drive k
 *      game:{id}/drive:{k}/fieldGoal        the field goal that ended drive k
 *      game:{id}/drive:{k}/pat              the extra point after it
 *      game:{id}/call:{n}/offense|defense   the n-th play's calls
 *      game:{id}/play:{n}/...               the n-th play itself (unchanged)
 *
 *    Change what happens on play 12 and play 13's dice do not move — that is a
 *    property of a hash-addressed fork tree, and it dies the instant one mutable
 *    generator is carried across plays.
 *
 * 3. `gameId` IS DERIVED FROM SCHEDULE COORDINATES (`deriveGameId`), never from
 *    a counter or a clock, and the seed string is written onto `GAME_END` and
 *    `GameSummary`.
 *
 * 4. POSSESSION, DRIVES, PERIODS AND SCORING ARE EVENTS, not just state deltas.
 *    Ratified as ADR-014; `game/events.ts` is now a log over contracts' own
 *    union rather than an engine-local one.
 *
 * 5. STATLINES ARE A REDUCER OVER THE RETURNED STREAM — literally
 *    `reduceStatlines(events)` on the array this function is about to return.
 *
 * ================== WHAT THE LOOP DOES NOT MODEL ==================
 * Out of dispatch scope, and every one of them shortens or lengthens a real
 * game measurably: penalties, out of bounds (so the clock over-runs late in a
 * half), timeouts, spikes, kneel-downs, two-point conversions, onside kicks,
 * fumbles (ADR-010 — §13/§14 specify none), the field being 53⅓ yards wide,
 * and NFL overtime possession rules.
 */
import { createRng } from "@ff/contracts";
import type {
  DriveResult,
  GameEndReason,
  MatchEventEnvelope,
  PlayerId,
  PlayerState,
  PossessionCause,
  TeamId,
} from "@ff/contracts";
import { rollD100 } from "../rolls.js";
import { simulatePlay } from "../sim/play.js";
import { reduceStatlines } from "../stats/statline.js";
import type { StatLine } from "../stats/statline.js";
import { TUNABLES } from "../tunables.js";
import type { Tunables } from "../tunables.js";
import type { AnyPlayCalls, MatchGameState, PlayCalls, RunPlayCalls } from "../types.js";
import { GameEventLog } from "./events.js";
import type { GameEventEnvelope } from "./events.js";
import {
  fieldGoalDistanceFrom,
  missedFieldGoalYardLine,
  resolveKickoff,
  resolvePlacekick,
  resolvePunt,
} from "./specialTeams.js";
import { deriveGameId } from "./types.js";
import type {
  DecisionSituation,
  GameCoordinates,
  GameInputs,
  GameSnapshot,
  GameSummary,
  MatchState,
  Scoreboard,
  TeamSnapshot,
} from "./types.js";

export interface GameResult {
  readonly events: readonly GameEventEnvelope[];
  readonly newState: MatchState;
  readonly summary: GameSummary;
  /** `reduceStatlines(events)`, and nothing else. Never a parallel accumulator. */
  readonly statlines: readonly StatLine[];
}

export class GameLoopError extends Error {
  constructor(message: string) {
    super(`@ff/engine: game loop — ${message}`);
    this.name = "GameLoopError";
  }
}

/**
 * The opening state, before the toss. Separate from `simulateGame` so the loop's
 * signature stays `(state, inputs, seed)` and the state stays something a caller
 * can construct, persist, diff and hand back.
 */
export function createMatchState(
  coordinates: GameCoordinates,
  snapshot: GameSnapshot,
  /**
   * Optional on the barrel's own surface, as `simulateGame` is. Its only two
   * tunable reads are pre-kickoff placeholders — the opening kickoff overwrites
   * both before a snap happens — so a caller that constructs the state with the
   * default and runs the game under a patch cannot observe the difference.
   */
  tunables: Tunables = TUNABLES,
): MatchState {
  const G = tunables.game;
  return {
    gameId: deriveGameId(coordinates),
    at: snapshot.at,
    home: coordinates.home,
    away: coordinates.away,
    phase: "PREGAME",
    period: 0,
    clockSeconds: 0,
    playNumber: 1,
    driveNumber: 0,
    kickoffNumber: 0,
    nextEventSeq: 0,
    possession: coordinates.home,
    down: 1,
    distance: G.field.firstDownYards,
    ballOn: G.specialTeams.kickoff.touchbackYardLine,
    score: { home: 0, away: 0 },
    drive: undefined,
    secondHalfKickoffBy: coordinates.away,
    pendingKickoff: undefined,
    clockStopped: true,
    finalReason: undefined,
  };
}

export function simulateGame(
  state: MatchState,
  inputs: GameInputs,
  seed: string,
  /**
   * ADR-012's open item, closed. OPTIONAL here — this is the barrel's surface —
   * and REQUIRED at every boundary beneath, including the decision requests the
   * play-caller receives, so no part of one game can run under a different
   * tunables version from any other part of it.
   */
  tunables: Tunables = TUNABLES,
): GameResult {
  const G = tunables.game;
  const ST = G.specialTeams;
  if (state.phase === "FINAL") {
    throw new GameLoopError("this game is already over; construct a new MatchState to re-run it");
  }

  const gameRng = createRng(seed, `game:${String(state.gameId)}`);
  const log = new GameEventLog(state.gameId, state.at, state.nextEventSeq);

  let s = state;
  const periodScores: Scoreboard[] = [];
  let scoreAtPeriodStart: Scoreboard = state.score;
  let drivesCompleted = 0;

  // --- lookups ------------------------------------------------------------

  const snapshotOf = (team: TeamId): TeamSnapshot => {
    if (team === inputs.snapshot.home.team) return inputs.snapshot.home;
    if (team === inputs.snapshot.away.team) return inputs.snapshot.away;
    throw new GameLoopError(`no team snapshot for ${String(team)}`);
  };
  const callerOf = (team: TeamId) => (team === s.home ? inputs.callers.home : inputs.callers.away);
  const other = (team: TeamId): TeamId => (team === s.home ? s.away : s.home);
  const scoreFor = (team: TeamId): number => (team === s.home ? s.score.home : s.score.away);

  const situationFor = (): DecisionSituation => ({
    period: s.period,
    clockSeconds: s.clockSeconds,
    down: s.down,
    distance: s.distance,
    ballOn: s.ballOn,
    offense: s.possession,
    defense: other(s.possession),
    offenseScore: scoreFor(s.possession),
    defenseScore: scoreFor(other(s.possession)),
    twoMinute: s.clockSeconds <= G.twoMinuteSeconds,
  });

  // --- clock --------------------------------------------------------------

  const periodLength = (period: number): number =>
    period > G.periodsInRegulation ? G.overtimeSeconds : G.periodSeconds;

  /** Seconds of game clock consumed since the opening kickoff. */
  const elapsedTotal = (): number => {
    const before =
      s.period > G.periodsInRegulation
        ? G.periodsInRegulation * G.periodSeconds +
          (s.period - G.periodsInRegulation - 1) * G.overtimeSeconds
        : (s.period - 1) * G.periodSeconds;
    return Math.max(0, before) + (periodLength(s.period) - s.clockSeconds);
  };

  const burn = (seconds: number): void => {
    s = { ...s, clockSeconds: Math.max(0, s.clockSeconds - seconds) };
  };

  // --- scoring ------------------------------------------------------------

  const addScore = (
    team: TeamId,
    kind: "TOUCHDOWN" | "FIELD_GOAL" | "EXTRA_POINT" | "SAFETY",
    points: number,
  ): void => {
    const score: Scoreboard =
      team === s.home
        ? { home: s.score.home + points, away: s.score.away }
        : { home: s.score.home, away: s.score.away + points };
    s = { ...s, score };
    log.score(team, kind, points, score.home, score.away);
  };

  /** Sudden death: any score in overtime ends it. */
  const endIfOvertimeScore = (): void => {
    if (s.period > G.periodsInRegulation && G.overtimeSuddenDeath) finish("OVERTIME");
  };

  // --- drives -------------------------------------------------------------

  const startDrive = (cause: PossessionCause): void => {
    const driveNumber = s.driveNumber + 1;
    s = {
      ...s,
      driveNumber,
      down: 1,
      distance: G.field.firstDownYards,
      phase: "SCRIMMAGE",
      drive: {
        driveNumber,
        offense: s.possession,
        defense: other(s.possession),
        startPeriod: s.period,
        startClockSeconds: s.clockSeconds,
        startElapsedSeconds: elapsedTotal(),
        startYardLine: s.ballOn,
        plays: 0,
      },
    };
    log.driveStart({
      driveNumber,
      offense: s.possession,
      defense: other(s.possession),
      period: s.period,
      clockSeconds: s.clockSeconds,
      startYardLine: s.ballOn,
      cause,
    });
  };

  /**
   * `endYardLine` is passed rather than read off `s.ballOn`, because on a
   * turnover the ball's coordinates have already flipped to the new offence by
   * the time a drive can be closed. Reading state here would have silently
   * recorded a 60-yard drive as a −40-yard one.
   */
  const endDrive = (result: DriveResult, points: number, endYardLine: number): void => {
    const drive = s.drive;
    if (drive === undefined) return;
    log.driveEnd({
      driveNumber: drive.driveNumber,
      offense: drive.offense,
      result,
      plays: drive.plays,
      yards: endYardLine - drive.startYardLine,
      elapsedSeconds: Math.max(0, elapsedTotal() - drive.startElapsedSeconds),
      endYardLine,
      points,
    });
    drivesCompleted += 1;
    s = { ...s, drive: undefined };
  };

  const changePossession = (to: TeamId, cause: PossessionCause, ballOn: number): void => {
    const from = s.possession;
    s = { ...s, possession: to, ballOn, down: 1, distance: G.field.firstDownYards };
    log.possessionChange(from, to, cause, ballOn);
  };

  // --- periods ------------------------------------------------------------

  const openPeriod = (period: number): void => {
    s = { ...s, period, clockSeconds: periodLength(period) };
    scoreAtPeriodStart = s.score;
    log.periodStart(period, s.clockSeconds);
  };

  const closePeriod = (): void => {
    log.periodEnd(s.period, s.score.home, s.score.away);
    periodScores.push({
      home: s.score.home - scoreAtPeriodStart.home,
      away: s.score.away - scoreAtPeriodStart.away,
    });
  };

  function finish(reason: GameEndReason): void {
    if (s.drive !== undefined) endDrive("END_OF_GAME", 0, s.ballOn);
    if (periodScores.length < s.period) closePeriod();
    s = { ...s, phase: "FINAL", finalReason: reason };
  }

  /**
   * Every period-boundary rule the engine has, in one place: halves end drives
   * and are followed by a kickoff, quarter breaks are not, regulation may end
   * the game, overtime may end it in a tie.
   */
  const periodExpired = (): void => {
    closePeriod();
    const period = s.period;

    if (period === G.periodsInRegulation / 2) {
      if (s.drive !== undefined) endDrive("END_OF_HALF", 0, s.ballOn);
      openPeriod(period + 1);
      s = {
        ...s,
        possession: s.secondHalfKickoffBy,
        phase: "KICKOFF",
        pendingKickoff: "SECOND_HALF_KICKOFF",
        clockStopped: true,
      };
      return;
    }

    if (period < G.periodsInRegulation) {
      // A quarter break. Same drive, same possession, ends swapped — which this
      // field model does not represent, because `ballOn` is already relative to
      // the offence's own goal line.
      openPeriod(period + 1);
      if (s.drive === undefined && s.phase === "SCRIMMAGE") startDrive("END_OF_PERIOD");
      return;
    }

    if (period === G.periodsInRegulation) {
      if (s.score.home !== s.score.away) {
        finish("REGULATION");
        return;
      }
      if (s.drive !== undefined) endDrive("END_OF_HALF", 0, s.ballOn);
      openPeriod(period + 1);
      // OVERTIME, THIN BY SCOPE: the team that kicked off to start the game
      // receives. Deterministic and symmetric. Real NFL possession rules are a
      // franchise-era concern and are explicitly out of this dispatch.
      s = {
        ...s,
        possession: s.secondHalfKickoffBy,
        phase: "KICKOFF",
        pendingKickoff: "OVERTIME_KICKOFF",
        clockStopped: true,
      };
      return;
    }

    finish(s.score.home === s.score.away ? "TIE" : "OVERTIME");
  };

  // --- kickoff ------------------------------------------------------------

  const doKickoff = (): void => {
    const cause = s.pendingKickoff ?? "KICKOFF_AFTER_SCORE";
    const kicking = s.possession;
    const receiving = other(kicking);
    const kickoffNumber = s.kickoffNumber + 1;
    const kickingSnapshot = snapshotOf(kicking);
    const receivingSnapshot = snapshotOf(receiving);
    const fromYardLine =
      cause === "FREE_KICK_AFTER_SAFETY"
        ? ST.kickoff.freeKickAfterSafetyYardLine
        : ST.kickoff.fromYardLine;

    const result = resolveKickoff({
      tunables,
      kicker: playerOf(kickingSnapshot, kickingSnapshot.specialTeams.kicker),
      returner: playerOf(receivingSnapshot, receivingSnapshot.specialTeams.returner),
      rng: gameRng.fork(`kickoff:${kickoffNumber}`),
    });
    // ADR-004: the rolls are recorded HERE, once, and the summary below names
    // them by rngLabel. The CHECKs come first so every reference points back.
    const playId = log.specialTeamsPlayId("kickoff", kickoffNumber);
    log.check(playId, result.check);
    if (result.returnCheck !== undefined) log.check(playId, result.returnCheck);
    log.kickoff({
      kicker: kickingSnapshot.specialTeams.kicker,
      team: kicking,
      fromYardLine,
      touchback: result.touchback,
      ...(result.touchback ? {} : { returner: receivingSnapshot.specialTeams.returner }),
      returnYards: result.returnYards,
      resultYardLine: result.resultYardLine,
      rollRef: result.check.roll.rngLabel,
      ...(result.returnCheck === undefined
        ? {}
        : { returnRollRef: result.returnCheck.roll.rngLabel }),
    });

    s = { ...s, kickoffNumber, pendingKickoff: undefined, clockStopped: true };
    burn(ST.elapsedSeconds.kickoff);
    changePossession(receiving, cause, result.resultYardLine);
    if (s.clockSeconds > 0) startDrive(cause);
    else s = { ...s, phase: "SCRIMMAGE" };
  };

  // --- fourth-down alternatives -------------------------------------------

  const doPunt = (): void => {
    const offense = snapshotOf(s.possession);
    const defense = snapshotOf(other(s.possession));
    const result = resolvePunt({
      tunables,
      punter: playerOf(offense, offense.specialTeams.punter),
      returner: playerOf(defense, defense.specialTeams.returner),
      fromYardLine: s.ballOn,
      rng: gameRng.fork(`drive:${s.driveNumber}`),
    });
    const playId = log.specialTeamsPlayId("punt", s.driveNumber);
    log.check(playId, result.check);
    if (result.returnCheck !== undefined) log.check(playId, result.returnCheck);
    log.punt({
      punter: offense.specialTeams.punter,
      team: s.possession,
      fromYardLine: s.ballOn,
      grossYards: result.grossYards,
      touchback: result.touchback,
      downed: result.downed,
      ...(result.touchback || result.downed ? {} : { returner: defense.specialTeams.returner }),
      returnYards: result.returnYards,
      resultYardLine: result.resultYardLine,
      rollRef: result.check.roll.rngLabel,
      ...(result.returnCheck === undefined
        ? {}
        : { returnRollRef: result.returnCheck.roll.rngLabel }),
    });
    burn(ST.elapsedSeconds.punt);
    endDrive("PUNT", 0, s.ballOn);
    changePossession(defense.team, "PUNT", result.resultYardLine);
    s = { ...s, clockStopped: true };
    if (s.clockSeconds > 0) startDrive("PUNT");
  };

  const doFieldGoal = (): void => {
    const offense = snapshotOf(s.possession);
    const kicking = s.possession;
    const distance = fieldGoalDistanceFrom(tunables, s.ballOn);
    const result = resolvePlacekick({
      tunables,
      kicker: playerOf(offense, offense.specialTeams.kicker),
      distanceYards: distance,
      rng: gameRng.fork(`drive:${s.driveNumber}`).fork("fieldGoal"),
    });
    log.check(log.specialTeamsPlayId("fieldGoal", s.driveNumber), result.check);
    log.placekick({
      kind: "FIELD_GOAL",
      kicker: offense.specialTeams.kicker,
      team: kicking,
      distanceYards: distance,
      made: result.made,
      band: result.band,
      rollRef: result.check.roll.rngLabel,
      target: result.target,
    });
    burn(ST.elapsedSeconds.fieldGoal);

    if (result.made) {
      addScore(kicking, "FIELD_GOAL", G.points.fieldGoal);
      endDrive("FIELD_GOAL", G.points.fieldGoal, s.ballOn);
      s = {
        ...s,
        clockStopped: true,
        possession: kicking,
        phase: "KICKOFF",
        pendingKickoff: "KICKOFF_AFTER_SCORE",
      };
      endIfOvertimeScore();
      return;
    }

    const spot = missedFieldGoalYardLine(tunables, s.ballOn);
    endDrive("MISSED_FIELD_GOAL", 0, s.ballOn);
    changePossession(other(kicking), "MISSED_FIELD_GOAL", spot);
    s = { ...s, clockStopped: true };
    if (s.clockSeconds > 0) startDrive("MISSED_FIELD_GOAL");
  };

  const doExtraPoint = (): void => {
    const offense = snapshotOf(s.possession);
    const result = resolvePlacekick({
      tunables,
      kicker: playerOf(offense, offense.specialTeams.kicker),
      distanceYards: ST.extraPoint.distanceYards,
      rng: gameRng.fork(`drive:${s.driveNumber}`).fork("pat"),
    });
    log.check(log.specialTeamsPlayId("pat", s.driveNumber), result.check);
    log.placekick({
      kind: "EXTRA_POINT",
      kicker: offense.specialTeams.kicker,
      team: s.possession,
      distanceYards: ST.extraPoint.distanceYards,
      made: result.made,
      band: result.band,
      rollRef: result.check.roll.rngLabel,
      target: result.target,
    });
    if (result.made) addScore(s.possession, "EXTRA_POINT", G.points.extraPoint);
    burn(ST.elapsedSeconds.extraPoint);
    s = { ...s, phase: "KICKOFF", pendingKickoff: "KICKOFF_AFTER_SCORE", clockStopped: true };
    endIfOvertimeScore();
  };

  // --- the snap -----------------------------------------------------------

  const doSnap = (): void => {
    const offenseSnapshot = snapshotOf(s.possession);
    const defenseSnapshot = snapshotOf(other(s.possession));
    const offenseTeam = s.possession;
    const defenseTeam = other(s.possession);
    const spotBeforeSnap = s.ballOn;

    // Fourth down is a tagged COACH decision, in the stream before the snap
    // that answers it.
    if (s.down >= G.field.downsInSeries) {
      const choice = callerOf(offenseTeam).decideFourthDown({
        kind: "FOURTH_DOWN",
        authority: "COACH",
        tunables,
        situation: situationFor(),
        offense: offenseSnapshot,
        fieldGoalDistanceYards: fieldGoalDistanceFrom(tunables, s.ballOn),
      });
      log.coachDecision("FOURTH_DOWN", offenseTeam, choice);
      if (choice === "PUNT") return doPunt();
      if (choice === "FIELD_GOAL") return doFieldGoal();
    }

    const callRng = gameRng.fork(`call:${s.playNumber}`);
    const situation = situationFor();
    const offenseCall = callerOf(offenseTeam).callOffense(
      {
        kind: "OFFENSIVE_PLAY_CALL",
        authority: "COACH",
        tunables,
        situation,
        offense: offenseSnapshot,
        defense: defenseSnapshot,
      },
      callRng.fork("offense"),
    );
    const defenseCall = callerOf(defenseTeam).callDefense(
      {
        kind: "DEFENSIVE_PLAY_CALL",
        authority: "COACH",
        tunables,
        situation,
        offense: offenseSnapshot,
        defense: defenseSnapshot,
        against: offenseCall,
      },
      callRng.fork("defense"),
    );

    const playState: MatchGameState = {
      gameId: s.gameId,
      at: s.at,
      playNumber: s.playNumber,
      nextEventSeq: log.nextSeq,
      players: { ...defenseSnapshot.players, ...offenseSnapshot.players },
      offenseTeam,
      defenseTeam,
      quarterback: offenseSnapshot.offense.quarterback,
      down: s.down,
      distance: s.distance,
      ballOn: s.ballOn,
      clockSeconds: s.clockSeconds,
      ...(offenseSnapshot.chemistry === undefined ? {} : { chemistry: offenseSnapshot.chemistry }),
    };
    const calls: AnyPlayCalls =
      offenseCall.kind === "RUN"
        ? ({ offense: offenseCall, defense: defenseCall } satisfies RunPlayCalls)
        : ({ offense: offenseCall, defense: defenseCall } satisfies PlayCalls);

    const played = simulatePlay(playState, calls, seed, tunables);
    log.append(played.events);

    const outcome = readPlayResult(played.events);
    if (outcome === undefined) {
      throw new GameLoopError(`play ${s.playNumber} produced no PLAY_RESULT`);
    }

    const drive = s.drive;
    s = {
      ...s,
      playNumber: played.newState.playNumber,
      drive: drive === undefined ? undefined : { ...drive, plays: drive.plays + 1 },
    };

    const scored = outcome.score !== undefined;
    const safety = !outcome.turnover && spotBeforeSnap + outcome.yards <= G.field.safetyAtOrBehind;

    burn(outcome.clockRunoff);
    s = {
      ...s,
      clockStopped:
        (G.clockStopsOnScore && (scored || safety)) ||
        (G.clockStopsOnPossessionChange && outcome.turnover) ||
        (G.clockStopsOnIncompletion && isIncompletion(played.events)),
    };

    if (scored) {
      addScore(offenseTeam, "TOUCHDOWN", G.points.touchdown);
      endDrive("TOUCHDOWN", G.points.touchdown, G.field.goalLine);
      s = { ...s, phase: "EXTRA_POINT" };
      endIfOvertimeScore();
      return;
    }

    if (safety) {
      addScore(defenseTeam, "SAFETY", G.points.safety);
      endDrive("SAFETY", -G.points.safety, 0);
      s = { ...s, phase: "KICKOFF", pendingKickoff: "FREE_KICK_AFTER_SAFETY" };
      endIfOvertimeScore();
      return;
    }

    // `sim/outcome.ts` — the ONE owner — has already moved the spot, the down
    // and the distance, and flipped possession on a turnover. What is left is
    // the SERIES rule, which is a game rule and lives here.
    s = {
      ...s,
      possession: played.newState.offenseTeam,
      ballOn: played.newState.ballOn,
      down: played.newState.down,
      distance: played.newState.distance,
    };

    if (outcome.turnover) {
      endDrive("INTERCEPTION", 0, spotBeforeSnap + outcome.yards);
      log.possessionChange(offenseTeam, s.possession, "INTERCEPTION", s.ballOn);
      if (s.clockSeconds > 0) startDrive("INTERCEPTION");
      return;
    }

    if (s.down > G.field.downsInSeries) {
      endDrive("TURNOVER_ON_DOWNS", 0, s.ballOn);
      changePossession(defenseTeam, "DOWNS", G.field.goalLine - s.ballOn);
      if (s.clockSeconds > 0) startDrive("DOWNS");
    }
  };

  // --- the loop -----------------------------------------------------------

  log.gameStart(s.home, s.away, seed);

  if (s.phase === "PREGAME") {
    const coinRoll = rollD100(gameRng.fork("coin"), []);
    const winner = coinRoll.raw % 2 === 1 ? s.home : s.away;
    const choice = callerOf(winner).decideCoinToss({
      kind: "COIN_TOSS",
      authority: "COACH",
      tunables,
      situation: situationFor(),
      winner,
    });
    const receivesFirst = choice === "RECEIVE" ? winner : other(winner);
    log.coinToss(winner, choice, receivesFirst, coinRoll);
    log.coachDecision("COIN_TOSS", winner, choice);
    // Whoever receives the opening kickoff kicks off to start the second half.
    s = { ...s, secondHalfKickoffBy: receivesFirst };
    openPeriod(1);
    s = {
      ...s,
      possession: other(receivesFirst),
      phase: "KICKOFF",
      pendingKickoff: "OPENING_KICKOFF",
    };
  }

  let iterations = 0;
  while (s.phase !== "FINAL") {
    if (++iterations > G.maxPlaysPerGame) {
      throw new GameLoopError(
        `exceeded ${G.maxPlaysPerGame} iterations without reaching FINAL — a drive that ` +
          "cannot end or a clock that cannot run out. Truncating here would produce clean " +
          "statistics about a game nobody played",
      );
    }

    // The clock expiring is checked once, here, rather than at each of the nine
    // places that can burn it. An extra point is an untimed down and is exempt.
    if (s.clockSeconds <= 0 && s.phase !== "EXTRA_POINT") {
      periodExpired();
      continue;
    }

    if (s.phase === "KICKOFF") {
      doKickoff();
      continue;
    }
    if (s.phase === "EXTRA_POINT") {
      doExtraPoint();
      continue;
    }

    // A scrimmage snap. Charge the huddle FIRST when the clock is running: the
    // play clock runs BEFORE the snap, and charging it afterwards steals half a
    // minute from the end of every half.
    if (!s.clockStopped) {
      burn(s.clockSeconds <= G.twoMinuteSeconds ? G.twoMinuteHuddleSeconds : G.huddleSeconds);
      if (s.clockSeconds <= 0) continue;
    }
    if (s.drive === undefined) {
      throw new GameLoopError(`snap at play ${s.playNumber} with no drive in progress`);
    }
    doSnap();
  }

  const reason = s.finalReason ?? "REGULATION";
  // ONE closing event (ADR-014 item 8). `GAME_SUMMARY` is gone: it existed only
  // because the narrow `GAME_END` could not carry provenance, and carrying the
  // same game's ending in two events meant two things to keep in agreement.
  log.gameEnd({
    home: s.score.home,
    away: s.score.away,
    periods: periodScores.map((p, i) => ({ period: i + 1, home: p.home, away: p.away })),
    plays: s.playNumber - state.playNumber,
    drives: drivesCompleted,
    reason,
    seed,
  });

  const events = log.drain();
  s = { ...s, nextEventSeq: log.nextSeq };

  return {
    events,
    newState: s,
    summary: {
      gameId: s.gameId,
      coordinates: inputs.coordinates,
      seed,
      home: s.home,
      away: s.away,
      score: s.score,
      periods: periodScores,
      plays: s.playNumber - state.playNumber,
      drives: drivesCompleted,
      finalReason: reason,
    },
    // ★5 — the box score is a reduction of the stream this call is returning,
    // not a second tally kept alongside it.
    statlines: reduceStatlines(events),
  };
}

// --- helpers ----------------------------------------------------------------

function playerOf(snapshot: TeamSnapshot, id: PlayerId): PlayerState {
  const player = snapshot.players[id as unknown as string];
  if (player === undefined) {
    throw new GameLoopError(`${String(id)} is not in ${String(snapshot.team)}'s player snapshot`);
  }
  return player;
}

interface PlayResultView {
  readonly yards: number;
  readonly turnover: boolean;
  readonly clockRunoff: number;
  readonly score: number | undefined;
}

/** The play's outcome, read from the STREAM rather than from `newState`. */
function readPlayResult(events: readonly MatchEventEnvelope[]): PlayResultView | undefined {
  for (const { event } of events) {
    if (event.type !== "PLAY_RESULT") continue;
    return {
      yards: event.payload.yards,
      turnover: event.payload.turnover,
      clockRunoff: event.payload.clockRunoff,
      score: event.payload.score,
    };
  }
  return undefined;
}

/**
 * Did the clock stop? A dropback that produced no completion, no carry and no
 * sack is an incompletion. Derived from the stream, not from a flag the
 * simulator could have set — the stream is the source of truth for this too.
 */
function isIncompletion(events: readonly MatchEventEnvelope[]): boolean {
  let isPass = false;
  let caught = false;
  let carried = false;
  let ballLeftHisHand = false;
  for (const { event } of events) {
    if (event.type === "PLAY_START") {
      const root = event.payload as { kind?: string } | null;
      isPass = root !== null && root.kind === "PASS_PLAY_V1";
    } else if (event.type === "THROW") {
      ballLeftHisHand = true;
    } else if (event.type === "QB_DECISION" && event.payload.choice === "THROWAWAY") {
      ballLeftHisHand = true;
    } else if (event.type === "CATCH_RESOLUTION" && event.payload.caught) {
      caught = true;
    } else if (event.type === "RUN_RESOLUTION") {
      carried = true;
    }
  }
  return isPass && ballLeftHisHand && !caught && !carried;
}
