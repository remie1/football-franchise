/**
 * The play's event log. The engine says nothing except through this object:
 * no console output, no side channels. Debug text, calibration and the UI all
 * read the same envelopes.
 */
import type {
  AttrId,
  CalendarStamp,
  CheckKind,
  GameId,
  MatchEvent,
  MatchEventEnvelope,
  PlayId,
  PlayerId,
  ResultTier,
  RollDetail,
} from "@ff/contracts";
import type { PassPlayStartPayload, PocketStatus, ThrowType } from "./types.js";

export interface CheckEmission {
  readonly checkKind: CheckKind;
  readonly actors: readonly PlayerId[];
  readonly roll: RollDetail;
  readonly target?: number;
  readonly opposedRoll?: RollDetail;
  readonly tier: ResultTier;
  readonly margin: number;
  readonly testsAttrs: readonly AttrId[];
}

export class PlayEventLog {
  private seq: number;
  private readonly envelopes: MatchEventEnvelope[] = [];
  private tick: number | undefined;

  constructor(
    private readonly gameId: GameId,
    private readonly playId: PlayId,
    private readonly at: CalendarStamp,
    startSeq: number,
  ) {
    this.seq = startSeq;
  }

  /** Every event emitted after this call carries the given tick. */
  setTick(tick: number | undefined): void {
    this.tick = tick;
  }

  get nextSeq(): number {
    return this.seq;
  }

  drain(): readonly MatchEventEnvelope[] {
    return this.envelopes;
  }

  private push(event: MatchEvent): void {
    this.envelopes.push({ seq: this.seq++, at: this.at, event });
  }

  private base(): { gameId: GameId; playId: PlayId; tick?: number } {
    return this.tick === undefined
      ? { gameId: this.gameId, playId: this.playId }
      : { gameId: this.gameId, playId: this.playId, tick: this.tick };
  }

  playStart(payload: PassPlayStartPayload): void {
    this.push({ type: "PLAY_START", payload, ...this.base() });
  }

  tickStart(tick: number): void {
    this.setTick(tick);
    this.push({ type: "TICK", payload: { tick }, ...this.base() });
  }

  check(c: CheckEmission): void {
    const payload: Extract<MatchEvent, { type: "CHECK" }>["payload"] = {
      checkKind: c.checkKind,
      actors: [...c.actors],
      roll: c.roll,
      tier: c.tier,
      margin: c.margin,
      testsAttrs: [...c.testsAttrs],
      ...(c.target === undefined ? {} : { target: c.target }),
      ...(c.opposedRoll === undefined ? {} : { opposedRoll: c.opposedRoll }),
    };
    this.push({ type: "CHECK", payload, ...this.base() });
  }

  pocketStatus(status: PocketStatus): void {
    this.push({ type: "POCKET_STATUS", payload: { status }, ...this.base() });
  }

  routeStatus(
    receiver: PlayerId,
    route: string,
    phase: "JAMMED" | "DEVELOPING" | "OPEN" | "DECAYING",
    openness: number,
  ): void {
    this.push({ type: "ROUTE_STATUS", payload: { receiver, route, phase, openness }, ...this.base() });
  }

  /**
   * ADR-004: `varianceRoll` is the one roll in the stream that lives outside a
   * CHECK — it is a perception roll with no contested counterpart. It pays for
   * that exception by carrying `testsAttrs` like every other roll does.
   */
  qbRead(
    target: PlayerId,
    actualOpenness: number,
    perceivedOpenness: number,
    effectiveOpenness: number,
    varianceRoll: RollDetail,
    testsAttrs: readonly AttrId[],
  ): void {
    this.push({
      type: "QB_READ",
      payload: {
        target,
        actualOpenness,
        perceivedOpenness,
        effectiveOpenness,
        varianceRoll,
        testsAttrs: [...testsAttrs],
      },
      ...this.base(),
    });
  }

  /**
   * ADR-005: `tier` is emitted when and only when §8.5's decision-quality roll
   * actually ran. A hold with no available target had no roll behind it, so it
   * carries no tier — absent means "no roll", never "bad decision".
   */
  qbDecision(
    choice: "THROW" | "HOLD" | "SCRAMBLE" | "THROWAWAY" | "CHECKDOWN",
    options: { readonly target?: PlayerId; readonly tier?: ResultTier } = {},
  ): void {
    const payload = {
      choice,
      ...(options.target === undefined ? {} : { target: options.target }),
      ...(options.tier === undefined ? {} : { tier: options.tier }),
    };
    this.push({ type: "QB_DECISION", payload, ...this.base() });
  }

  throwBall(target: PlayerId, throwType: ThrowType, accuracyTier: ResultTier): void {
    this.push({ type: "THROW", payload: { target, throwType, accuracyTier }, ...this.base() });
  }

  /**
   * ADR-004: the outcome REFERENCES the roll that produced it. `rollRef` is the
   * `rngLabel` of the catch CHECK's RollDetail, which must already have been
   * emitted — a RollDetail appears exactly once in the stream.
   */
  catchResolution(receiver: PlayerId, catchType: string, rollRef: string, caught: boolean): void {
    this.push({ type: "CATCH_RESOLUTION", payload: { receiver, catchType, rollRef, caught }, ...this.base() });
  }

  playResult(yards: number, turnover: boolean, clockRunoff: number, score?: number): void {
    const payload = score === undefined
      ? { yards, turnover, clockRunoff }
      : { yards, turnover, score, clockRunoff };
    this.push({ type: "PLAY_RESULT", payload, ...this.base() });
  }
}
