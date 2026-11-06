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
  QbDecisionChoice,
  ResultTier,
  RollDetail,
  RoutePhase,
  RushAlignment,
  RushApproach,
  RushThreatState,
  ThreatOrigin,
  ThrowawayCause,
  ThrowType,
} from "@ff/contracts";
import type { PocketStatusRung } from "./resolve/pocket.js";
import type { AtTheLineRecord, PassPlayStartPayload, RunPlayStartPayload } from "./types.js";

/**
 * ADR-036 — the recovery state of a deflected ball, as ONE value.
 *
 * The contracts payload spells this as a discriminated union so that a dead ball
 * cannot carry a threshold. This is the same union at the producer's end: it is
 * what `tippedBall` accepts, and spreading it into the payload is what makes the
 * absence structural. Nothing here restates a value — it restates a SHAPE, and
 * the restatement is load-bearing in one direction only: if contracts changes,
 * `tippedBall`'s `this.push` stops compiling, because the payload it assembles
 * from this union must satisfy `MatchEvent`'s.
 *
 * Deliberately not `Pick<>` off the contracts payload: the payload is an
 * intersection of a common half with the union, so `Pick` would flatten the
 * correlation between `recoverable` and `finalTargetNumber` back into
 * `boolean × (number | undefined)` — precisely the reading ADR-036 removed.
 */
export type TippedBallRecovery =
  | { readonly recoverable: true; readonly finalTargetNumber: number }
  | { readonly recoverable: false };

export interface CheckEmission {
  /**
   * Every kind but the officials' two (ADR-093 F4), whose CHECK always names the `penalty_check` it
   * judges and states its chance; they get an emission of their own with ADR-093 step 1's build.
   */
  readonly checkKind: Exclude<CheckKind, "official_sees" | "phantom_flag">;
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
  /**
   * ADR-059 — the `RollDetail.rngLabel` of a PRIOR roll in the SAME play this
   * check derives from. Under `legacy` the one producer is `pass_rush_tick`, pointing at the
   * `pass_rush_rep` CHECK whose latent margin it jitters around. ADR-089 step 1 (`pocket-1`
   * only) adds `pass_rush_beat`, pointing at the rep whose block it times; shape S's dieless
   * tick (`BeatTickEmission`) points at the beat instead. Mirrors the
   * contracts field of the same name (`events.ts`'s `CHECK.payload.rollRef`)
   * exactly, so `checkPayload` below is a pass-through, not a translation.
   */
  readonly rollRef?: string;
}

/**
 * ADR-089 P3 — a `pass_rush_tick` that draws no die: shape S of the block clock (`pocket-1`
 * only, never `legacy`). Its margin, tier and band are set by the block's breaking time, drawn
 * once on the `pass_rush_beat` CHECK its `rollRef` names, so it carries no `roll` and no
 * `opposedRoll` and its `rollRef` is required. An engine-internal shape of its own rather than a
 * `CheckEmission` union, so the resolvers that read `.check.roll` keep a required roll
 * (`resolve/beatClock.ts`'s `resolveBeatTick` is its one producer).
 */
export type BeatTickEmission = Omit<CheckEmission, "checkKind" | "roll" | "opposedRoll"> & {
  readonly checkKind: "pass_rush_tick";
  readonly rollRef: string;
};

/** ADR-089 P4 — the approach a `RUSH_THREAT` may carry: never BLOCKED, by type. */
export type ThreatApproach = Exclude<RushApproach, "BLOCKED">;

/**
 * ADR-089 P5: how far he had to come and how fast he came, as a `RUSH_THREAT` carries them: both
 * or neither, so the pair is one argument and a threat with half of it cannot be published.
 */
export interface ThreatGeometry {
  readonly distanceYards: number;
  readonly closingSpeed: number;
}

/**
 * A PRE-SNAP check (§5). Its own shape rather than a `CheckEmission`, because
 * `PRESNAP_READ`'s payload is genuinely different: ONE actor, a bare target, no
 * opposed roll.
 *
 * `band` is ADR-022 petition 6, ratified — the same field and the same meaning
 * ADR-011 gave `CHECK.band`, for the same reason: a band a consumer re-derives
 * desyncs silently the first time calibration moves a boundary. The pressure
 * read's six bands (`DIAGNOSED`, `IDENTIFIED`, `COUNTED`, `UNSURE`,
 * `MISIDENTIFIED`, `BUSTED`; ADR-073 §2.2) travel in the stream rather than
 * being reconstructed from `tier`, as the coverage read's and the leash's do. Absent means the read rolled against a bare
 * target with no band table behind it, never "the band was not worth carrying".
 */
export interface PresnapEmission {
  readonly actor: PlayerId;
  /**
   * Every kind but the foul roll and the officials' two (ADR-093 F4), which are always CHECKs and
   * never a pre-snap read: a `penalty_check` is the CHECK a foul and a flag name, and each
   * officials' roll names the `penalty_check` it judges.
   */
  readonly kind: Exclude<CheckKind, "penalty_check" | "official_sees" | "phantom_flag">;
  readonly roll: RollDetail;
  readonly target: number;
  readonly tier: ResultTier;
  readonly band?: string;
}

/**
 * A `CheckEmission` as the contract's CHECK payload. Shared by both logs
 * (`PlayEventLog` here, `GameEventLog` in `game/events.ts`) so a check emitted
 * for a field goal is byte-identical in shape to one emitted for a pass rush.
 *
 * ADR-089 P3: a `BeatTickEmission` (no `roll` key at all) takes the dieless branch, keyed on the
 * key's absence, and keeps today's key order less `roll` and `opposedRoll`. Every legacy emission
 * carries `roll`, so the branch below it is today's body, untouched.
 */
export function checkPayload(c: CheckEmission | BeatTickEmission): Extract<MatchEvent, { type: "CHECK" }>["payload"] {
  if (!("roll" in c)) {
    return {
      checkKind: c.checkKind,
      actors: [...c.actors],
      tier: c.tier,
      margin: c.margin,
      testsAttrs: [...c.testsAttrs],
      ...(c.target === undefined ? {} : { target: c.target }),
      ...(c.band === undefined ? {} : { band: c.band }),
      rollRef: c.rollRef,
    };
  }
  return {
    checkKind: c.checkKind,
    actors: [...c.actors],
    roll: c.roll,
    tier: c.tier,
    margin: c.margin,
    testsAttrs: [...c.testsAttrs],
    ...(c.target === undefined ? {} : { target: c.target }),
    ...(c.opposedRoll === undefined ? {} : { opposedRoll: c.opposedRoll }),
    ...(c.band === undefined ? {} : { band: c.band }),
    ...(c.rollRef === undefined ? {} : { rollRef: c.rollRef }),
  };
}

export class PlayEventLog {
  private seq: number;
  private readonly envelopes: MatchEventEnvelope[] = [];
  private tick: number | undefined;

  /**
   * NO `tunables` ARGUMENT ANY MORE (ADR-033). It was here for exactly one
   * method: `escalatePocketStatus` compared two statuses on `pocket.severity`,
   * which is a tunable, and taking it as an argument kept the ONE ordering the
   * pocket model rests on from being read off an ambient constant (ADR-012's
   * open item). That method is gone — both of its callers rewrote a tick's
   * status to `SACK`, and a sack is an OUTCOME, not a description of the space
   * the passer is working in — so the log ranks nothing and needs nothing to
   * rank it with.
   *
   * The log is now what it claims to be: a buffer that appends. A tick has
   * exactly one `POCKET_STATUS` because exactly one call site emits one, not
   * because a later call rewrites the first.
   *
   * If a mechanic ever needs to restate an already-emitted status, the
   * comparison it needs is `pocketSeverityOfEmitted` in `resolve/pocket.ts`,
   * which takes its tunables explicitly and throws on a status the ladder does
   * not rank.
   */
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

  /**
   * ADR-091 step S-a and ADR-092: what happened at the line before the snap (the game loop's
   * records, `MatchGameState.atTheLine`), written right after `PLAY_START` by both simulations, in
   * the order given. Nothing after the snap reads them.
   */
  atTheLine(records: readonly AtTheLineRecord[] | undefined): void {
    for (const r of records ?? []) {
      switch (r.type) {
        case "CHECK":
          this.push({ type: "CHECK", payload: r.payload, ...this.base() });
          break;
        case "SIDELINE_ADJUSTMENT":
          this.push({ type: "SIDELINE_ADJUSTMENT", payload: r.payload, ...this.base() });
          break;
        case "STEM":
          this.push({ type: "STEM", payload: r.payload, ...this.base() });
          break;
      }
    }
  }

  tickStart(tick: number): void {
    this.setTick(tick);
    this.push({ type: "TICK", payload: { tick }, ...this.base() });
  }

  check(c: CheckEmission | BeatTickEmission): void {
    this.push({ type: "CHECK", payload: checkPayload(c), ...this.base() });
  }

  /**
   * §5's pre-snap phase. `PRESNAP_READ` has had a `CheckKind` slot and no
   * producer since contracts v0; §5.3's blitz recognition is the first.
   *
   * ADR-004 counts rolls from CHECK **and PRESNAP_READ**, so a roll recorded
   * here is recorded exactly once and must not also appear as a CHECK.
   */
  presnapRead(p: PresnapEmission): void {
    this.push({
      type: "PRESNAP_READ",
      payload: {
        actor: p.actor,
        kind: p.kind,
        roll: p.roll,
        target: p.target,
        tier: p.tier,
        // `exactOptionalPropertyTypes` — an absent band is an ABSENT key, the
        // same treatment `checkPayload` gives ADR-011's.
        ...(p.band === undefined ? {} : { band: p.band }),
      },
      ...this.base(),
    });
  }

  /**
   * A tick has exactly ONE pocket status, and this is the only method that
   * emits one.
   *
   * `PocketStatusRung`, not contracts' `PocketStatus`: the engine publishes only
   * statuses its own ladder ranks (ADR-033). A rung widens to a `PocketStatus`
   * for the payload, so the event schema is unchanged and the narrowing is the
   * engine declining to emit a value it cannot rank.
   */
  pocketStatus(status: PocketStatusRung): void {
    this.push({ type: "POCKET_STATUS", payload: { status }, ...this.base() });
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
   *
   * `origin` is ADR-022 petition 5, ratified: there are four ways to become a
   * threat and only one of them is a won rep, so an unblocked blitzer and a
   * beaten left tackle used to arrive in the stream looking identical. It is a
   * REQUIRED argument — a publisher that does not know why a rusher is coming
   * has no business publishing him — and `rollRef` names the roll the ADR's
   * table says justifies that origin.
   *
   * ADR-089 P4: `approach` is how he got there (§4.0's card), present on every threat of a play
   * under `pocket-1` and spread in only when present; a legacy threat writes no key. Typed without
   * BLOCKED, as the contract field is.
   *
   * ADR-089 P5: `geometry` is his distance and closing speed, spread in after `approach` (the
   * contract's key order) only when given, both keys or neither. The caller passes it only when
   * the play's rules say so (`PocketRules.threatGeometry`, `sim/passPlay.ts`), never because the
   * threat happens to carry a pair.
   */
  rushThreat(
    rusher: PlayerId,
    alignment: RushAlignment,
    origin: ThreatOrigin,
    rollRef: string,
    etaTick: number,
    state: RushThreatState,
    approach?: ThreatApproach,
    geometry?: ThreatGeometry,
  ): void {
    this.push({
      type: "RUSH_THREAT",
      payload: {
        rusher,
        alignment,
        origin,
        rollRef,
        etaTick,
        state,
        ...(approach === undefined ? {} : { approach }),
        ...(geometry === undefined ? {} : { distanceYards: geometry.distanceYards, closingSpeed: geometry.closingSpeed }),
      },
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
   * ADR-056 Option C — THE ACT, not the decision. `QB_DECISION{choice:"THROWAWAY"}`
   * stays as the decision; this is the ball leaving his hand with no target.
   *
   * `cause` is required (both emit sites always know which of the two closed
   * paths they are on). `rollRef` is present only for `POCKET_DURESS`, which has
   * the `pocket_movement` CHECK behind it; `CLOCK_EXPIRED` has no roll at all
   * (ADR-005), so it must be omitted, never invented.
   */
  throwaway(cause: ThrowawayCause, rollRef?: string): void {
    this.push({
      type: "THROWAWAY",
      payload: { cause, ...(rollRef === undefined ? {} : { rollRef }) },
      ...this.base(),
    });
  }

  /**
   * ADR-054 — §8.8's pursuit clock, published as the thing it is rather than a
   * `RUSH_THREAT` with a fabricated `rusher`/`alignment`. One publication per
   * escape: the deadline never moves once set, so there is no
   * `DELAYED`/`RESET`/`ARRIVED` lifecycle to mirror here the way `rushThreat`
   * has one.
   *
   * Every argument is already computed at the call site — no new roll, no new
   * derivation. `rollRef` is `escape.check.roll.rngLabel`, whose CHECK is
   * already on the stream (ADR-004).
   */
  qbPursuit(sinceTick: number, deadlineTick: number, rollRef: string): void {
    this.push({
      type: "QB_PURSUIT",
      payload: { sinceTick, deadlineTick, rollRef },
      ...this.base(),
    });
  }

  /**
   * ADR-004: the outcome REFERENCES the roll that produced it. `rollRef` is the
   * `rngLabel` of the catch CHECK's RollDetail, which must already have been
   * emitted — a RollDetail appears exactly once in the stream.
   *
   * ADR-042 — `openness` is the QUANTITY THAT DECIDED `catchType`, and the caller
   * must hand over the very number it compared against
   * `catching.contestedMaxOpenness`. This method deliberately takes it as an
   * argument rather than deriving it: a second derivation would publish a number
   * that merely USUALLY agrees with the one that decided, which is worse than
   * publishing nothing, because it renders as a fact.
   *
   * ⚠ THE CONTRACT'S OWN DOC COMMENT NAMES A DIFFERENT QUANTITY, and the engine
   * publishes the deciding one. `MatchEvent.CATCH_RESOLUTION.openness` is
   * described as "the EFFECTIVE openness ... after §8.7's decay and §8.4's window
   * modifier". The engine classifies on ACTUAL openness — post-§8.7-decay, but
   * WITHOUT §8.3's perception variance and WITHOUT §8.4's window modifier —
   * because whether a defender is inside a yard is a fact about the defender, not
   * about what the quarterback believed or what his arm talent can compensate
   * for. Effective openness exists at this site (`ThrowArgs.effectiveOpenness`)
   * and is NOT what `catchTypeFor` reads. Publishing it would satisfy the comment
   * and break the field's entire purpose. Reported as a contracts doc-comment
   * defect; a petition, not an engine edit.
   */
  catchResolution(
    receiver: PlayerId,
    catchType: string,
    openness: number,
    rollRef: string,
    caught: boolean,
  ): void {
    this.push({
      type: "CATCH_RESOLUTION",
      payload: { receiver, catchType, openness, rollRef, caught },
      ...this.base(),
    });
  }

  /**
   * §12 summary. ADR-009 item 1 brought this payload in line with ADR-004: the
   * deflection-quality roll and every recovery attempt live exactly once, in
   * their own `deflection_quality` / `deflection_recovery` CHECKs, and are named
   * here by `rngLabel` — the same treatment `CATCH_RESOLUTION` already had.
   *
   * ADR-036: the recovery state arrives as ONE argument, not as a bare number,
   * so there is no call site at which a dead ball can be handed a target. The
   * old signature's third parameter was `finalTargetNumber: number` and `0` was
   * what a caller with nothing to say put there.
   */
  tippedBall(
    deflector: PlayerId,
    rollRef: string,
    recovery: TippedBallRecovery,
    eligible: readonly PlayerId[],
    attempts: readonly { readonly player: PlayerId; readonly rollRef: string }[],
    recoveredBy?: PlayerId,
  ): void {
    const payload = {
      deflector,
      rollRef,
      ...recovery,
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
