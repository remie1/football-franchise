/**
 * GAME-STRUCTURE EVENTS — INTERIM, PENDING ADR-014.
 *
 * ============================ READ THIS FIRST ============================
 * Every type in this file is a CONTRACT PETITION that has not been ratified
 * yet. `@ff/contracts`'s `MatchEvent` union describes a PLAY and nothing above
 * one: it has no possession, no drive, no period, no scoreboard, no kick, and
 * its `GAME_END` payload is `{ home, away }`. The game loop cannot satisfy
 * FANTASY-GATE-PHASE1 §3.4 — "possession changes, drive start/end, period
 * boundaries and scoring are EVENTS, not just state deltas" — with that union.
 *
 * Three ways to bridge that were available and two are forbidden:
 *
 *  ✗ Put the facts only in `newState`. Forbidden by §3.4, and it is the exact
 *    hole `FANTASY-GATE-PHASE1` F3 was commissioned about: a consumer holding
 *    the stream could not say who had the ball or what the score was.
 *  ✗ Carry them on an existing event — `PLAY_START`'s open `unknown` payload is
 *    the obvious temptation. Forbidden by ADR-010's standing rule: *widen or
 *    add, never overload*. A `PLAY_START` that is not a play makes the §17
 *    renderer, the calibration play counter and the UI play log all SILENTLY
 *    wrong rather than loudly incomplete.
 *  ✓ Declare the proposed events here, in the engine, in exactly the shape
 *    ADR-014 petitions for, and interleave them into the ONE returned stream as
 *    a union member. On ratification the members move into `MatchEvent`
 *    verbatim, `GameEvent` collapses to `MatchEvent`, and this file is deleted.
 *    No producer changes, no consumer changes, no re-sequencing.
 *
 * There is exactly one stream, one `seq` space and one ordering. The statline
 * reducer, the debug renderer and `GameResult.events` all read that one stream.
 * ======================================================================== */
import { playId as makePlayId } from "@ff/contracts";
import type {
  CalendarStamp,
  GameId,
  MatchEvent,
  MatchEventEnvelope,
  PlayId,
  PlayerId,
  RollDetail,
  TeamId,
} from "@ff/contracts";

/**
 * INTERIM DEVIATION FROM `MatchEventBase`, and it is deliberate: `playId` is
 * OPTIONAL here. A drive boundary, a period boundary and a coin toss are not
 * plays, and minting a `PlayId` for them would be a lie in a branded type.
 * ADR-014 petitions for `MatchEventBase.playId` to become optional — a widening
 * no existing producer or consumer notices, since every existing event carries
 * one.
 */
export interface GameEventBase {
  readonly gameId: GameId;
  readonly playId?: PlayId;
}

/** Why the ball changed hands. Named, not inline (ADR-013's lesson). */
export type PossessionCause =
  | "OPENING_KICKOFF"
  | "SECOND_HALF_KICKOFF"
  | "OVERTIME_KICKOFF"
  | "KICKOFF_AFTER_SCORE"
  | "FREE_KICK_AFTER_SAFETY"
  | "PUNT"
  | "INTERCEPTION"
  | "DOWNS"
  | "MISSED_FIELD_GOAL"
  | "END_OF_PERIOD";

/** How a drive ended. One value per way the engine can actually end one. */
export type DriveResult =
  | "TOUCHDOWN"
  | "FIELD_GOAL"
  | "MISSED_FIELD_GOAL"
  | "PUNT"
  | "INTERCEPTION"
  | "TURNOVER_ON_DOWNS"
  | "SAFETY"
  | "END_OF_HALF"
  | "END_OF_GAME";

export type ScoreKind = "TOUCHDOWN" | "FIELD_GOAL" | "EXTRA_POINT" | "TWO_POINT" | "SAFETY";

export type PlacekickKind = "FIELD_GOAL" | "EXTRA_POINT";

export type CoachDecisionKind = "FOURTH_DOWN" | "COIN_TOSS";

/**
 * The proposed additions to `MatchEvent`, verbatim.
 *
 * ⚠ ROLL ACCOUNTING (ADR-004) — INTERIM EXCEPTION, NARROW AND DOCUMENTED.
 * `COIN_TOSS`, `PLACEKICK`, `PUNT` and `KICKOFF` carry `RollDetail` INLINE
 * rather than referencing a `CHECK` by `rollRef`, because `CheckKind` is a
 * closed union in contracts and contains no `coin_toss`, `field_goal`, `punt`
 * or `kick_return`. ADR-014 petitions for those four members; on ratification
 * each roll moves to its own `CHECK` and these payloads keep only a `rollRef`,
 * exactly as `CATCH_RESOLUTION` and `TIPPED_BALL` already do. Until then,
 * calibration's "count rolls from CHECK/PRESNAP_READ only" rule UNDERCOUNTS
 * special teams rather than double-counting anything, which is the safe
 * direction to be wrong in.
 */
export type InterimGameEvent =
  | ({ type: "GAME_START"; payload: { home: TeamId; away: TeamId; seed: string } } & GameEventBase)
  | ({
      type: "COIN_TOSS";
      payload: { winner: TeamId; choice: "RECEIVE" | "DEFER"; receivesFirst: TeamId; roll: RollDetail };
    } & GameEventBase)
  | ({ type: "PERIOD_START"; payload: { period: number; clockSeconds: number } } & GameEventBase)
  | ({ type: "PERIOD_END"; payload: { period: number; home: number; away: number } } & GameEventBase)
  | ({
      type: "POSSESSION_CHANGE";
      payload: { from: TeamId; to: TeamId; cause: PossessionCause; ballOn: number };
    } & GameEventBase)
  | ({
      type: "DRIVE_START";
      payload: {
        driveNumber: number;
        offense: TeamId;
        defense: TeamId;
        period: number;
        clockSeconds: number;
        startYardLine: number;
        cause: PossessionCause;
      };
    } & GameEventBase)
  | ({
      type: "DRIVE_END";
      payload: {
        driveNumber: number;
        offense: TeamId;
        result: DriveResult;
        plays: number;
        yards: number;
        elapsedSeconds: number;
        endYardLine: number;
        points: number;
      };
    } & GameEventBase)
  | ({
      type: "SCORE";
      payload: { team: TeamId; kind: ScoreKind; points: number; home: number; away: number };
    } & GameEventBase)
  | ({
      type: "PLACEKICK";
      payload: {
        kind: PlacekickKind;
        kicker: PlayerId;
        team: TeamId;
        distanceYards: number;
        made: boolean;
        band: string;
        roll: RollDetail;
        target: number;
      };
    } & GameEventBase)
  | ({
      type: "PUNT";
      payload: {
        punter: PlayerId;
        team: TeamId;
        fromYardLine: number;
        grossYards: number;
        touchback: boolean;
        downed: boolean;
        returner?: PlayerId;
        returnYards: number;
        resultYardLine: number;
        roll: RollDetail;
        returnRoll?: RollDetail;
      };
    } & GameEventBase)
  | ({
      type: "KICKOFF";
      payload: {
        kicker: PlayerId;
        team: TeamId;
        fromYardLine: number;
        touchback: boolean;
        returner?: PlayerId;
        returnYards: number;
        resultYardLine: number;
        roll: RollDetail;
        returnRoll?: RollDetail;
      };
    } & GameEventBase)
  | ({
      type: "COACH_DECISION";
      payload: { kind: CoachDecisionKind; authority: "COACH"; team: TeamId; choice: string };
    } & GameEventBase)
  /**
   * The provenance half of the widened `GAME_END` ADR-014 petitions for.
   *
   * Contracts' `GAME_END { home, away }` is still emitted, immediately before
   * this, and it is still CORRECT — it is merely not enough. Splitting rather
   * than replacing keeps every existing `GAME_END` consumer right today; the
   * petition merges the two payloads and deletes this event.
   *
   * Every field except `seed` is derivable from the preceding stream, which is
   * the discipline `GAME_END` inherits from `PLAY_RESULT`. `seed` is not
   * derivable and is not a game fact — it is the provenance that makes the game
   * re-runnable at all, and FANTASY-GATE-PHASE1 §3.3 requires it be written down.
   */
  | ({
      type: "GAME_SUMMARY";
      payload: {
        seed: string;
        home: TeamId;
        away: TeamId;
        homeScore: number;
        awayScore: number;
        periods: readonly { period: number; home: number; away: number }[];
        plays: number;
        drives: number;
        reason: "REGULATION" | "OVERTIME" | "TIE";
      };
    } & GameEventBase);

/** The one stream. Collapses to `MatchEvent` when ADR-014 lands. */
export type GameEvent = MatchEvent | InterimGameEvent;

export interface GameEventEnvelope {
  readonly seq: number;
  readonly at: CalendarStamp;
  readonly event: GameEvent;
}

/**
 * The game loop's log. Deliberately the same shape as `PlayEventLog`: a
 * monotonic `seq`, no I/O, nothing said except through `drain()`.
 *
 * Play-level envelopes produced by `simulatePlay` are appended verbatim by
 * `append` — they are already `MatchEventEnvelope`s and `MatchEvent` is a member
 * of `GameEvent`, so nothing is rewritten and no sequence number is reassigned.
 */
export class GameEventLog {
  private seq: number;
  private readonly envelopes: GameEventEnvelope[] = [];

  constructor(
    private readonly gameId: GameId,
    private readonly at: CalendarStamp,
    startSeq: number,
  ) {
    this.seq = startSeq;
  }

  get nextSeq(): number {
    return this.seq;
  }

  drain(): readonly GameEventEnvelope[] {
    return this.envelopes;
  }

  /** Splice a completed play's stream in. Its seq numbers continue this one's. */
  append(played: readonly MatchEventEnvelope[]): void {
    for (const envelope of played) {
      this.envelopes.push(envelope);
      this.seq = Math.max(this.seq, envelope.seq + 1);
    }
  }

  emit(event: InterimGameEvent | MatchEvent): void {
    this.envelopes.push({ seq: this.seq++, at: this.at, event });
  }

  gameStart(home: TeamId, away: TeamId, seed: string): void {
    this.emit({ type: "GAME_START", payload: { home, away, seed }, gameId: this.gameId });
  }

  coinToss(winner: TeamId, choice: "RECEIVE" | "DEFER", receivesFirst: TeamId, roll: RollDetail): void {
    this.emit({
      type: "COIN_TOSS",
      payload: { winner, choice, receivesFirst, roll },
      gameId: this.gameId,
    });
  }

  periodStart(period: number, clockSeconds: number): void {
    this.emit({ type: "PERIOD_START", payload: { period, clockSeconds }, gameId: this.gameId });
  }

  periodEnd(period: number, home: number, away: number): void {
    this.emit({ type: "PERIOD_END", payload: { period, home, away }, gameId: this.gameId });
  }

  possessionChange(from: TeamId, to: TeamId, cause: PossessionCause, ballOn: number): void {
    this.emit({
      type: "POSSESSION_CHANGE",
      payload: { from, to, cause, ballOn },
      gameId: this.gameId,
    });
  }

  driveStart(payload: Extract<InterimGameEvent, { type: "DRIVE_START" }>["payload"]): void {
    this.emit({ type: "DRIVE_START", payload, gameId: this.gameId });
  }

  driveEnd(payload: Extract<InterimGameEvent, { type: "DRIVE_END" }>["payload"]): void {
    this.emit({ type: "DRIVE_END", payload, gameId: this.gameId });
  }

  score(team: TeamId, kind: ScoreKind, points: number, home: number, away: number): void {
    this.emit({ type: "SCORE", payload: { team, kind, points, home, away }, gameId: this.gameId });
  }

  placekick(payload: Extract<InterimGameEvent, { type: "PLACEKICK" }>["payload"]): void {
    this.emit({ type: "PLACEKICK", payload, gameId: this.gameId });
  }

  punt(payload: Extract<InterimGameEvent, { type: "PUNT" }>["payload"]): void {
    this.emit({ type: "PUNT", payload, gameId: this.gameId });
  }

  kickoff(payload: Extract<InterimGameEvent, { type: "KICKOFF" }>["payload"]): void {
    this.emit({ type: "KICKOFF", payload, gameId: this.gameId });
  }

  coachDecision(kind: CoachDecisionKind, team: TeamId, choice: string): void {
    this.emit({
      type: "COACH_DECISION",
      payload: { kind, authority: "COACH", team, choice },
      gameId: this.gameId,
    });
  }

  /**
   * Contracts' own event, unchanged and still correct.
   *
   * `MatchEventBase.playId` is REQUIRED, and the final whistle is not a play, so
   * this mints `{gameId}:final`. That is the concrete cost of the required field
   * and the reason ADR-014 petitions to make it optional — a branded `PlayId`
   * that names no play is exactly the kind of quiet fiction the schema exists to
   * prevent.
   */
  gameEnd(home: number, away: number): void {
    this.emit({
      type: "GAME_END",
      payload: { home, away },
      gameId: this.gameId,
      playId: makePlayId(`${String(this.gameId)}:final`),
    });
  }

  gameSummary(payload: Extract<InterimGameEvent, { type: "GAME_SUMMARY" }>["payload"]): void {
    this.emit({ type: "GAME_SUMMARY", payload, gameId: this.gameId });
  }
}
