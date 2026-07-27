/**
 * GAME-STRUCTURE EVENTS — RATIFIED (ADR-014).
 *
 * This file used to declare an `InterimGameEvent` union: eleven proposed members
 * of `MatchEvent`, plus a `GAME_SUMMARY` sibling carrying the fields the narrow
 * `GAME_END` could not, plus an engine-local `GameEventBase` whose `playId` was
 * optional. All of it is gone. `@ff/contracts` now declares the eleven members,
 * the widened `GAME_END` and the six named payload unions, so what is left here
 * is a LOG — the thing that emits them — and two type aliases.
 *
 * ================== WHAT RATIFICATION CHANGED, EXACTLY ==================
 *
 *  1. `GameEvent` is an alias of `MatchEvent`. One stream, one `seq` space, one
 *     ordering, as it always was; the union it is typed against is now the
 *     contract's rather than the engine's.
 *
 *  2. `MatchEventBase.playId` stayed REQUIRED and a second base was added
 *     (ADR-014 item 13, amended). `GameEventBase` has `playId?: never`, so
 *     "this is not a play" is structural rather than a missing value, and
 *     setting one on a drive boundary is a compile error.
 *
 *  3. `{gameId}:final` is gone. It was the one dishonest identifier in the
 *     stream — a branded `PlayId` naming no play — and it existed solely because
 *     the final whistle had to ride on a base that demanded one. `GAME_END` is
 *     game-scoped now and mints nothing.
 *
 *  4. The special-teams rolls moved onto `CHECK`s (`field_goal`, `punt`,
 *     `kick_return`) and the summary events keep only `rollRef`s, exactly as
 *     `CATCH_RESOLUTION` and `TIPPED_BALL` do (ADR-004). Calibration's "count
 *     rolls from CHECK/PRESNAP_READ only" now counts every kick in the league.
 *
 * ================== THE ONE THING RATIFICATION DID NOT SETTLE ==================
 *
 * A `CHECK` is PLAY-scoped, so a field goal's roll needs a `PlayId` — and a
 * field-goal attempt IS a play (a fourth down), as a punt is and as a kickoff is
 * a free-kick down. So this log mints one, from the same coordinates the PRNG
 * fork label already uses (`{gameId}:fieldGoal:{drive}`, `{gameId}:punt:{drive}`,
 * `{gameId}:kickoff:{n}`). That is not a `{gameId}:final`-style fiction: it names
 * a real play that really happened, and nobody parses it (`contracts.md` §1).
 *
 * It does leave an asymmetry: the CHECK can name the play and the `PLACEKICK` /
 * `PUNT` / `KICKOFF` summary that references it cannot, because those three are
 * declared GAME-scoped. The join goes through `rollRef` instead, which is what
 * ADR-004 asks for everywhere else, so nothing is unreconstructible — but the
 * classification is worth revisiting. Filed as ADR-016.
 *
 * The COIN TOSS is different and is correctly game-scoped: it is not a play, it
 * is not a down, and it keeps its `RollDetail` INLINE on its own payload (the
 * ratified `COIN_TOSS` payload has `roll`, not `rollRef`). It is therefore the
 * second ADR-004 exception after `QB_READ.varianceRoll`, and `CheckKind`'s
 * `coin_toss` member has no producer — the same standing as `fumble`,
 * `dline_tip` and `penalty_check`, which are waiting for mechanics rather than
 * for types.
 */
import { playId as makePlayId } from "@ff/contracts";
import type {
  CalendarStamp,
  CoachDecisionKind,
  GameEndReason,
  GameId,
  MatchEvent,
  MatchEventEnvelope,
  PlayId,
  PossessionCause,
  RollDetail,
  ScoreKind,
  TeamId,
} from "@ff/contracts";
import { checkPayload } from "../events.js";
import type { CheckEmission } from "../events.js";

/** The one stream. An alias since ADR-014 landed; kept as a name, not a union. */
export type GameEvent = MatchEvent;
export type GameEventEnvelope = MatchEventEnvelope;

/**
 * The GAME-scoped half of `MatchEvent`, derived from the base rather than
 * listed. `GameEventBase.playId` is `?: never` and `MatchEventBase.playId` is
 * `PlayId`, so this partition is exactly ADR-014 item 13's and cannot drift out
 * of date when a twelfth game-structure event lands.
 */
export type GameScopedEvent = Extract<MatchEvent, { playId?: never }>;
export type PlayScopedEvent = Exclude<MatchEvent, GameScopedEvent>;

/** Structural, not a list of type names: absence of `playId` IS the predicate. */
export function isGameScoped(event: MatchEvent): event is GameScopedEvent {
  return event.playId === undefined;
}

type PayloadOf<T extends MatchEvent["type"]> = Extract<MatchEvent, { type: T }>["payload"];

/**
 * The game loop's log. Deliberately the same shape as `PlayEventLog`: a
 * monotonic `seq`, no I/O, nothing said except through `drain()`.
 *
 * Play-level envelopes produced by `simulatePlay` are appended verbatim by
 * `append` — nothing is rewritten and no sequence number is reassigned.
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

  emit(event: GameEvent): void {
    this.envelopes.push({ seq: this.seq++, at: this.at, event });
  }

  // --- the id a special-teams play is known by ------------------------------

  /**
   * A real `PlayId` for a real play. Mirrors the PRNG fork label of the same
   * draw, so "which play was this" and "which fork produced it" are the same
   * two coordinates rather than two independent schemes.
   */
  specialTeamsPlayId(kind: "kickoff" | "punt" | "fieldGoal" | "pat", ordinal: number): PlayId {
    return makePlayId(`${String(this.gameId)}:${kind}:${ordinal}`);
  }

  /**
   * A CHECK, on the play it belongs to. ADR-004: the roll is recorded HERE, once,
   * and the summary event that follows names it by `RollDetail.rngLabel`.
   */
  check(playId: PlayId, c: CheckEmission): void {
    this.emit({ type: "CHECK", payload: checkPayload(c), gameId: this.gameId, playId });
  }

  // --- game structure -------------------------------------------------------

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

  driveStart(payload: PayloadOf<"DRIVE_START">): void {
    this.emit({ type: "DRIVE_START", payload, gameId: this.gameId });
  }

  driveEnd(payload: PayloadOf<"DRIVE_END">): void {
    this.emit({ type: "DRIVE_END", payload, gameId: this.gameId });
  }

  score(team: TeamId, kind: ScoreKind, points: number, home: number, away: number): void {
    this.emit({ type: "SCORE", payload: { team, kind, points, home, away }, gameId: this.gameId });
  }

  placekick(payload: PayloadOf<"PLACEKICK">): void {
    this.emit({ type: "PLACEKICK", payload, gameId: this.gameId });
  }

  punt(payload: PayloadOf<"PUNT">): void {
    this.emit({ type: "PUNT", payload, gameId: this.gameId });
  }

  kickoff(payload: PayloadOf<"KICKOFF">): void {
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
   * The widened `GAME_END` (ADR-014 item 8). `{ home, away }` keeps its exact
   * meaning; everything added except `seed` is derivable from the preceding
   * stream, which is the discipline `GAME_END` inherits from `PLAY_RESULT`.
   *
   * `seed` is the deliberate exception and it is not a game fact:
   * `RollDetail.rngLabel` carries the fork PATH but never the seed, so without
   * it a completed game is not re-runnable from its own stream
   * (FANTASY-GATE-PHASE1 §3.3).
   */
  gameEnd(payload: {
    readonly home: number;
    readonly away: number;
    readonly periods: readonly { period: number; home: number; away: number }[];
    readonly plays: number;
    readonly drives: number;
    readonly reason: GameEndReason;
    readonly seed: string;
  }): void {
    this.emit({ type: "GAME_END", payload, gameId: this.gameId });
  }
}
