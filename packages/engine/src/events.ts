/**
 * The play's event log. The engine says nothing except through this object:
 * no console output, no side channels. Debug text, calibration and the UI all
 * read the same envelopes.
 */
import type {
  AttrId,
  CalendarStamp,
  CarryType,
  CheckKind,
  GameId,
  MatchEvent,
  MatchEventEnvelope,
  PlayId,
  PlayerId,
  PocketStatus,
  QbDecisionChoice,
  ResultTier,
  RollDetail,
  RoutePhase,
  RushAlignment,
  RushThreatState,
  ThrowType,
} from "@ff/contracts";
import { TUNABLES } from "./tunables.js";
import type { PassPlayStartPayload, RunPlayStartPayload } from "./types.js";

export interface CheckEmission {
  readonly checkKind: CheckKind;
  readonly actors: readonly PlayerId[];
  readonly roll: RollDetail;
  readonly target?: number;
  readonly opposedRoll?: RollDetail;
  readonly tier: ResultTier;
  /**
   * ADR-011 — the design doc's own result-band label, present whenever the
   * resolution HAS a band table ("RUSHER_WINS_REP", "HOLE_OPEN", "GOOD").
   *
   * `tier` is the generic 9-tier ladder; the band is the vocabulary §6-§14, the
   * §17 printout and every calibration metric actually speak, and it is the
   * thing four downstream modifiers key on. Absent means the resolution rolled
   * against a bare target with no band table behind it (`pursuit_angle`,
   * `rb_vision`, `passing_lane`, `second_level_climb`, `zone_read_qb`,
   * `deflection_recovery`) — never "the band was not worth carrying".
   */
  readonly band?: string;
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

  playStart(payload: PassPlayStartPayload | RunPlayStartPayload): void {
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
      ...(c.band === undefined ? {} : { band: c.band }),
    };
    this.push({ type: "CHECK", payload, ...this.base() });
  }

  pocketStatus(status: PocketStatus): void {
    this.push({ type: "POCKET_STATUS", payload: { status }, ...this.base() });
  }

  /**
   * A tick has exactly ONE pocket status. The status is emitted at the top of
   * the tick from last tick's inputs, but a tick that ends in a sack ends in
   * SACK — and emitting a second POCKET_STATUS for the same tick double-counts
   * for anything that tallies status-ticks (harmless for rendering, wrong for
   * calibration). This rewrites the tick's status in the buffer BEFORE `drain()`
   * publishes it, rather than appending a contradictory second one.
   *
   * Escalation only: a status may get worse within a tick, never better.
   */
  escalatePocketStatus(status: PocketStatus): void {
    for (let i = this.envelopes.length - 1; i >= 0; i--) {
      const envelope = this.envelopes[i];
      if (envelope === undefined) continue;
      const event = envelope.event;
      if (event.type !== "POCKET_STATUS") continue;
      if (event.tick !== this.tick) break;
      const severity = TUNABLES.pocket.severity;
      if (severity[status] <= severity[event.payload.status]) return;
      this.envelopes[i] = { ...envelope, event: { ...event, payload: { status } } };
      return;
    }
    this.pocketStatus(status);
  }

  routeStatus(
    receiver: PlayerId,
    route: string,
    phase: RoutePhase,
    openness: number,
  ): void {
    this.push({ type: "ROUTE_STATUS", payload: { receiver, route, phase, openness }, ...this.base() });
  }

  /**
   * ADR-007 — a won rep starts a rusher TRAVELLING, and his time of arrival is
   * what separates COLLAPSING from SACK. No die produces the ETA: it is a
   * deterministic function of the `pass_rush_tick` rep named by `rollRef`, so
   * this event carries neither a RollDetail nor a tier (ADR-004/005).
   *
   * `DELAYED` is the honest reason the printout no longer says "projected": a
   * step-up or a blocker who recovered position pushes the arrival back, and the
   * adjusted number is stated here rather than recomputed by every consumer.
   */
  rushThreat(
    rusher: PlayerId,
    alignment: RushAlignment,
    rollRef: string,
    etaTick: number,
    state: RushThreatState,
  ): void {
    this.push({
      type: "RUSH_THREAT",
      payload: { rusher, alignment, rollRef, etaTick, state },
      ...this.base(),
    });
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
    choice: QbDecisionChoice,
    options: { readonly target?: PlayerId; readonly tier?: ResultTier } = {},
  ): void {
    const payload = {
      choice,
      ...(options.target === undefined ? {} : { target: options.target }),
      ...(options.tier === undefined ? {} : { tier: options.tier }),
    };
    this.push({ type: "QB_DECISION", payload, ...this.base() });
  }

  /**
   * ADR-011 item 2 — `rollRef` names the accuracy CHECK's `rngLabel`, and
   * §10.4's PLACEMENT BAND lives there. A reference rather than a copy, exactly
   * as `CATCH_RESOLUTION` and `TIPPED_BALL` do it (ADR-004): the band drives the
   * catch modifier, the defender's contest modifier, the catch difficulty and
   * §10.5's YAC multiplier, and it is carried ONCE, on the roll that produced it.
   */
  throwBall(
    target: PlayerId,
    throwType: ThrowType,
    accuracyTier: ResultTier,
    rollRef: string,
  ): void {
    this.push({
      type: "THROW",
      payload: { target, throwType, accuracyTier, rollRef },
      ...this.base(),
    });
  }

  /**
   * ADR-004: the outcome REFERENCES the roll that produced it. `rollRef` is the
   * `rngLabel` of the catch CHECK's RollDetail, which must already have been
   * emitted — a RollDetail appears exactly once in the stream.
   */
  catchResolution(receiver: PlayerId, catchType: string, rollRef: string, caught: boolean): void {
    this.push({ type: "CATCH_RESOLUTION", payload: { receiver, catchType, rollRef, caught }, ...this.base() });
  }

  /**
   * §12 summary. ADR-009 item 1 brought this payload in line with ADR-004: the
   * deflection-quality roll and every recovery attempt live exactly once, in
   * their own `deflection_quality` / `deflection_recovery` CHECKs, and are named
   * here by `rngLabel` — the same treatment `CATCH_RESOLUTION` already had.
   */
  tippedBall(
    deflector: PlayerId,
    rollRef: string,
    finalTargetNumber: number,
    eligible: readonly PlayerId[],
    attempts: readonly { readonly player: PlayerId; readonly rollRef: string }[],
    recoveredBy?: PlayerId,
  ): void {
    const payload = {
      deflector,
      rollRef,
      finalTargetNumber,
      eligible: [...eligible],
      attempts: attempts.map((a) => ({ player: a.player, rollRef: a.rollRef })),
      ...(recoveredBy === undefined ? {} : { recoveredBy }),
    };
    this.push({ type: "TIPPED_BALL", payload, ...this.base() });
  }

  /**
   * §13.1 — one per zone the ball carrier enters AFTER A CATCH, with the yards
   * he made inside it. A carry emits `RUSH_ZONE` instead.
   *
   * The two are separate events rather than one with a `phase` discriminator
   * because a consumer tallying yards after catch must be able to exclude a
   * handoff and a consumer tallying rushing must be able to exclude a reception
   * — ADR-010's standing rule: widen or add, never overload.
   */
  yacZone(carrier: PlayerId, zone: number, yardsInZone: number): void {
    this.push({ type: "YAC_ZONE", payload: { carrier, zone, yardsInZone }, ...this.base() });
  }

  /**
   * §13.1's zone table read onto a CARRY — a handoff or a scrambling
   * quarterback. Identical shape to `yacZone`, deliberately different name.
   *
   * This is what makes "yards before contact" separable from "yards after
   * contact" for a run, which is the single question a run game exists to
   * answer (ADR-010 item 1).
   */
  rushZone(carrier: PlayerId, zone: number, yardsInZone: number): void {
    this.push({ type: "RUSH_ZONE", payload: { carrier, zone, yardsInZone }, ...this.base() });
  }

  /**
   * §14 summary.
   *
   * `gap` is the gap the ball ACTUALLY went through, which on a zone play is
   * §14.2's vision check speaking; the gap it was DRAWN to is in `PLAY_START`,
   * so "did he find the cutback?" is a join rather than an inference. It is
   * ABSENT on a scramble: a quarterback who tucked it is a ball carrier running
   * the same §14.4 machinery, and he has no designed gap at all (ADR-010 item 2
   * — this replaced a literal `"SCRAMBLE"` sentinel in the free-text field).
   *
   * `yardsBeforeContact` is §14.3's own number, the line's half of the run.
   */
  runResolution(
    carrier: PlayerId,
    carryType: CarryType,
    gap: string | undefined,
    yardsBeforeContact: number,
    yards: number,
  ): void {
    this.push({
      type: "RUN_RESOLUTION",
      payload: {
        carrier,
        carryType,
        ...(gap === undefined ? {} : { gap }),
        yardsBeforeContact,
        yards,
      },
      ...this.base(),
    });
  }

  playResult(yards: number, turnover: boolean, clockRunoff: number, score?: number): void {
    const payload = score === undefined
      ? { yards, turnover, clockRunoff }
      : { yards, turnover, score, clockRunoff };
    this.push({ type: "PLAY_RESULT", payload, ...this.base() });
  }
}
