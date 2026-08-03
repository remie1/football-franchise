/**
 * The event schema — the single source of truth.
 * Debug text, calibration stats, UI replay, and narrative triggers are all
 * consumers of this stream. Streams are append-only and read-only to consumers.
 */
import type { GameId, PlayId, PlayerId, TeamId, StaffId, StorylineId, AttrId, TraitId } from "./ids.js";
import type { CalendarStamp } from "./calendar.js";

export interface RollModifier {
  source: string;
  attr?: AttrId;
  trait?: TraitId;
  value: number;
}

export interface RollDetail {
  die: "d100" | "d20";
  raw: number;
  modifiers: RollModifier[];
  total: number;
  rngLabel: string; // PRNG fork label — every roll auditable and replayable
}

/**
 * The severity ladder, ordered. **The order carries meaning**, so it carries a monotonicity gate
 * (ADR-032): occupancy must strictly decrease outward from `TIE`.
 *
 * ⛔ SEVENTEEN RUNGS, FOUR PER SIDE ADDED BY ADR-053. The nine-rung ladder's outermost rung was
 * OPEN, and an open rung on a density decreasing in |margin| accumulates the whole tail: on an even
 * opposed check `CRITICAL_SUCCESS` and `CRITICAL_FAILURE` were **the two most likely outcomes of
 * every contest, at 24.850% each**. A critical outcome that fires on one snap in four is not a
 * critical outcome. `CRITICAL` now sits at `[60, 74]` — **4.950%** at shift 0, a factor of 5.02.
 *
 * The widths are `1, 4, 10, 15, 15, 15, 15, 15, open`. The property is a statement about WIDTHS: on
 * a density decreasing in |margin|, a partition whose widths do not grow outward has strictly
 * decreasing occupancy *automatically*. The old ladder violated it for exactly one reason — the
 * last width was infinite. **Bounding the extremes is not tuning; it restores the ladder to the
 * class where the property is free.**
 *
 * Every boundary is DERIVED, none chosen to hit a rate (ADR-052 records the rejected rules by name
 * and with their reasons, target-rate picking among them):
 * - the **step, 15**, is the ladder's own outermost bounded width;
 * - the **stop, 90**, is the first lattice point past `2·T(B) < T(B−15)` evaluated at the engine's
 *   actual shift set — `u = 120 − B`, `B ≥ 85`. Gated at shift ±20, **not** at shift 0: the
 *   15-rung candidate passes a shift-0 gate and fails at shift −12, which is §7.1's SPEED/FINESSE
 *   branch — half of every pass-rush rep played.
 *
 * ⚠ RATIFIED FOR THE OPPOSED FORM ONLY. Target checks (`d100 + shift ≥ k`) read these same names
 * under a UNIFORM margin, where a bounded rung's occupancy IS its width — so equal widths are
 * equally likely and **strict monotonicity is unsatisfiable there by any ladder whatsoever**. That
 * conflict is accepted rather than reconciled (ADR-053 §4); whether target checks should read a
 * separate ladder is an open design question with its own evidence (backlog entry 57), deliberately
 * not answered by a compromise boundary in neither window.
 *
 * ⚠ `CRITICAL_SUCCESS` MOVES FROM FLOOR 30 TO FLOOR 60, and `DECISIVE_SUCCESS` takes the rung it
 * vacates. Any code that re-points the ladder must rename **by floor, never by label** — the word
 * appears twice during construction and a label-keyed rename rewrites both.
 */
export type ResultTier =
  | "TOTAL_SUCCESS" | "OVERWHELMING_SUCCESS" | "CRITICAL_SUCCESS" | "DOMINANT_SUCCESS"
  | "DECISIVE_SUCCESS" | "STRONG_SUCCESS" | "SUCCESS" | "MARGINAL_SUCCESS"
  | "TIE"
  | "MARGINAL_FAILURE" | "FAILURE" | "STRONG_FAILURE" | "DECISIVE_FAILURE"
  | "DOMINANT_FAILURE" | "CRITICAL_FAILURE" | "OVERWHELMING_FAILURE" | "TOTAL_FAILURE";

/**
 * A total map from the severity ladder to `T` — **every rung, no optionals, no index signature.**
 *
 * ⛔ WHAT THIS EXISTS TO PREVENT. Adding four rungs per side to `ResultTier` compiled clean across
 * the whole workspace with **zero errors**, because every tier-keyed structure in the repo is a
 * runtime `Map` that gains a key in silence. Nothing anywhere demanded a football value for a new
 * rung. That is a choice which has to be REMEMBERED rather than enforced, and Charter §4.1 exists
 * to refuse exactly that: a convention is a rule that holds until someone is in a hurry. This is
 * the second ladder change in a month.
 *
 * It is a MAPPED TYPE OVER THE UNION, never a hand-written record of rung names — so it is derived
 * from the ladder rather than restating it, and the next ladder change edits one place, not two.
 *
 * ⚠ NOTHING INSTANTIATES THIS TODAY, AND THAT IS DELIBERATE (ADR-053 §6). `ResultTier` appears
 * repo-wide only as a payload field type and `tierFor`'s return: **no structure is keyed by tier
 * anywhere**, because ADR-029 holds — every football meaning lives on a per-check BAND table, never
 * on a tier. A mapped type instantiated somewhere it does not belong, purely to force a compile
 * error, would be a guard with no subject. The subjects are SCHEDULED, not invented: the UI outcome
 * badge and the narrative trigger table must each supply a meaning per tier by construction when
 * those phases open, and they use this.
 *
 * Use it the moment such a site exists. Do not manufacture one.
 */
export type ByTier<T> = { [K in ResultTier]: T };

/** Closed union — extending it is a contract petition (lightweight, pre-approved category). */
export type CheckKind =
  | "coverage_read" | "blitz_recognition" | "audible"
  | "release_vs_press" | "route_break" | "man_coverage" | "zone_coverage" | "zone_read_qb" | "option_route"
  /**
   * ADR-059. The per-play, per-matchup pass-rush contest, drawn ONCE and lived with —
   * `pass_rush_tick` becomes unmodded jitter around it and references it by `rollRef`.
   *
   * The attribute contest lives HERE, not on the tick (ADR-059 claim 11, owner ruling):
   * rusher `passRush`/`powerMove`/`finesseMove`/`firstStep`, blocker
   * `passBlock`/`footwork`/`anchor`. So `testsAttrs` on a `pass_rush_tick` is legitimately
   * EMPTY — the tick tests nothing, by design, and that is the honest answer rather than
   * an omission.
   *
   * Shape follows `resolveBreakPoint`'s coverage draw, which has always done this: draw the
   * persistent contest once, lazily, on the tick it is first needed, and memoize it.
   */
  | "pass_rush_rep"
  | "pass_rush_tick" | "run_block" | "second_level_climb" | "stunt_communication" | "blitz_pickup"
  | "qb_read" | "anticipation" | "qb_decision" | "unseen_defender" | "hold_decision" | "pocket_movement" | "scramble"
  | "passing_lane" | "accuracy" | "dline_tip"
  | "catch" | "contested_catch" | "deflection_quality" | "deflection_recovery"
  | "yac_tackle" | "downfield_block" | "breakaway"
  | "rb_vision" | "gap_battle" | "pursuit_angle" | "tackle" | "break_tackle"
  | "communication" | "snap_jump" | "fumble" | "penalty_check"
  /** Special teams (ADR-014 item 12) — so ADR-004's roll accounting has no exception it did not choose. */
  | "coin_toss" | "field_goal" | "punt" | "kick_return";

/**
 * Named aliases for the closed unions that ride inside match-event payloads (ADR-013).
 *
 * These were spelled inline, which forced every producer to re-declare them locally — and a
 * local copy silently becomes a subset the moment a member is added here. That is the wrong
 * side of ADR-010's rule: widen or add, never leave a consumer quietly wrong. Naming them
 * makes the payload the single authority and lets domains import rather than restate.
 */
/**
 * A pocket status describes THE SPACE THE PASSER IS WORKING IN.
 *
 * `SACK` was removed by ADR-034 (owner ruling, ADR-032): a sack is an OUTCOME — the play having
 * ended — and is not a description of that space. It is read off the stream, not published as a
 * status (a dropback with no `THROW` and no `RUN_RESOLUTION` that lost ground).
 *
 * The narrowing is deliberate load-bearing typing, not tidiness. While the union was wider than
 * the engine's severity ladder it produced two defects of one shape — a status-keyed lookup with
 * `?? 0` — and `0` is the BEST rung, so an unranked status reported as the cleanest possible
 * pocket and every `worst()` silently agreed. That is how `SACK: 4` outranked `IMMEDIATE`
 * unnoticed. Narrowing removes the conditions for that class rather than its instances.
 *
 * Consumers should nonetheless still THROW on an unranked status rather than defaulting one:
 * this crosses a package boundary, and the type cannot bind a caller arriving from JavaScript.
 */
export type PocketStatus = "CLEAN" | "PRESSURE" | "COLLAPSING" | "IMMEDIATE";
export type ThrowType = "BULLET" | "TOUCH" | "BACK_SHOULDER";

/**
 * WHY A THROWAWAY HAS A CAUSE (ADR-056).
 *
 * Two paths reach a throwaway and they are DIFFERENT FOOTBALL. `POCKET_DURESS` is §7.2's
 * pocket forcing him out of the play, and it carries the `pocket_movement` CHECK that
 * produced the choice. `CLOCK_EXPIRED` is the clock or the read budget running out with
 * nobody open — "the clock ran out rather than the pocket: no duress, so no movement
 * check" (`sim/passPlay.ts`) — and therefore has no roll behind it at all.
 *
 * REQUIRED, not optional: both emit sites know which they are, so an optional field would
 * make "not published" and "not applicable" arrive identically — the same ambiguity
 * `playId?: never` was introduced to prevent (ADR-014 item 13).
 *
 * CLOSED at two. A third throwaway path is a widening petition, not a default.
 */
export type ThrowawayCause = "POCKET_DURESS" | "CLOCK_EXPIRED";
export type RushAlignment = "EDGE" | "INTERIOR";
export type RushThreatState = "TRAVELLING" | "DELAYED" | "RESET" | "ARRIVED";

/**
 * Why a rusher is a threat (ADR-022 petition 5). There are four ways and only one is a won
 * rep, so without this an unblocked blitzer and a beaten left tackle arrive in the stream
 * looking identical and "how much pressure came from blitzing?" is unanswerable.
 *
 * Every origin points at a real roll — `rollRef` names the `pass_rush_tick` CHECK, the
 * `blitz_recognition` PRESNAP_READ, the `blitz_pickup` CHECK or the `stunt_communication`
 * CHECK respectively. Nothing here is justified by an absence.
 */
export type ThreatOrigin = "WON_REP" | "UNBLOCKED" | "PICKUP_LOST" | "STUNT_LOOPER";
export type RoutePhase = "JAMMED" | "DEVELOPING" | "OPEN" | "SETTLED" | "DECAYING" | "SCRAMBLE_DRILL";
export type QbDecisionChoice = "THROW" | "HOLD" | "STEP_UP" | "SCRAMBLE" | "THROWAWAY" | "CHECKDOWN";
export type CarryType = "DESIGNED" | "SCRAMBLE";

/** Game-structure vocabulary (ADR-014). Named rather than inline, per ADR-013. */
export type PossessionCause =
  | "OPENING_KICKOFF" | "SECOND_HALF_KICKOFF" | "OVERTIME_KICKOFF"
  | "KICKOFF_AFTER_SCORE" | "FREE_KICK_AFTER_SAFETY"
  | "PUNT" | "INTERCEPTION" | "DOWNS" | "MISSED_FIELD_GOAL" | "END_OF_PERIOD";

export type DriveResult =
  | "TOUCHDOWN" | "FIELD_GOAL" | "MISSED_FIELD_GOAL" | "PUNT"
  | "INTERCEPTION" | "TURNOVER_ON_DOWNS" | "SAFETY" | "END_OF_HALF" | "END_OF_GAME";

export type ScoreKind = "TOUCHDOWN" | "FIELD_GOAL" | "EXTRA_POINT" | "TWO_POINT" | "SAFETY";
export type PlacekickKind = "FIELD_GOAL" | "EXTRA_POINT";
export type CoachDecisionKind = "FOURTH_DOWN" | "COIN_TOSS";
export type GameEndReason = "REGULATION" | "OVERTIME" | "TIE";

/**
 * A PLAY-scoped event. `playId` is required: an event about a play that cannot name
 * the play is a bug, and the compiler should say so.
 */
export interface MatchEventBase {
  gameId: GameId;
  playId: PlayId;
  tick?: number;
}

/**
 * A GAME-scoped event — a coin toss, a period or drive boundary, a scoreboard change,
 * a kick. These are not plays and carry no `playId`.
 *
 * `playId?: never` rather than `playId?: PlayId` is the whole point (ADR-014 item 13).
 * Making the field optional on one shared base would have made "this is not a play" and
 * "somebody forgot to set it" both arrive as `undefined` — a narrowing of a guarantee
 * every existing consumer relies on, and the opposite direction from every other change
 * ratified here. This way absence is structural: a play event that omits its id fails to
 * compile, and a game event cannot claim one.
 *
 * An event that genuinely relates to a play states the link in its own payload, as a
 * named field with a documented meaning — never as an ambiguous base field.
 */
export interface GameEventBase {
  gameId: GameId;
  playId?: never;
}

export type MatchEvent =
  | ({ type: "PLAY_START"; payload: unknown } & MatchEventBase)
  | ({ type: "PRESNAP_READ"; payload: {
        actor: PlayerId; kind: CheckKind; roll: RollDetail; target: number; tier: ResultTier;
        /** §5.3's four-row result table, same reasoning as ADR-011 gave `CHECK.band`: a
         *  re-derived band desyncs silently the first time calibration moves a boundary. */
        band?: string;
      } } & MatchEventBase)
  | ({ type: "TICK"; payload: { tick: number } } & MatchEventBase)
  | ({ type: "CHECK"; payload: {
        checkKind: CheckKind;
        actors: PlayerId[];
        roll: RollDetail;
        target?: number;
        opposedRoll?: RollDetail;
        tier: ResultTier;
        /**
         * The design doc's own result-band label for this check, when the resolution
         * produced one ("RUSHER_WINS_REP", "HOLE_OPEN", "SEPARATION_3_4"…). ADR-011.
         * A free string, not a union: the band vocabulary is per-check-kind and is
         * exactly what calibration proposes changes to.
         */
        band?: string;
        margin: number;
        testsAttrs: AttrId[];   // lets perception update from exposure (Spec #6 §3)
        /**
         * ADR-059. The `RollDetail.rngLabel` of a PRIOR roll in the same play that this
         * check derives from — for `pass_rush_tick`, the `pass_rush_rep` whose latent it
         * jitters around.
         *
         * Present so the deciding quantity is REPRODUCIBLE FROM THE STREAM. Without it the
         * margin that selects a band exists only in engine memory, and Iron Rule 3 is not
         * satisfied by a latent nothing else can read: calibration, UI replay and narrative
         * would each see a band whose margin they cannot derive.
         *
         * Not a naming convention on `rngLabel` — Charter §4.1 prefers a compile error to a
         * convention, and a parseable label survives exactly until someone renames a fork.
         */
        rollRef?: string;
      } } & MatchEventBase)
  | ({ type: "POCKET_STATUS"; payload: { status: PocketStatus } } & MatchEventBase)
  /**
   * A won rep starts a rusher travelling rather than arriving him (ADR-007).
   * The ETA is what separates COLLAPSING from SACK and what makes interior
   * pressure outweigh edge pressure, so it belongs in the stream.
   * No die produces it — it is a deterministic function of the pass_rush_tick
   * roll named by `rollRef` — so it carries no RollDetail and no tier (ADR-004/005).
   */
  | ({ type: "RUSH_THREAT"; payload: {
        rusher: PlayerId;
        alignment: RushAlignment;
        origin: ThreatOrigin;
        /** The roll that JUSTIFIES this threat — widened from "the pass_rush_tick roll that
         *  created it", since three of the four origins are justified by a different roll. */
        rollRef: string;
        etaTick: number;
        state: RushThreatState;
      } } & MatchEventBase)
  /**
   * §8.8's PURSUIT CLOCK — the quarterback has left structure and pursuit is running him down.
   *
   * ⛔ THIS IS NOT A `RUSH_THREAT`, AND ADR-054 IS THE ARGUMENT FOR WHY IT MUST NOT BE ONE. It was
   * added rather than folded into the threat vocabulary because the engine's pursuit clock has
   * **three real fields and two placeholders**: `activeThreats` synthesises it with
   * `rusher: matchups[0]` — **arbitrary array order, not the man chasing him** — and a hardcoded
   * `alignment: "EDGE"`, both documented in the engine as a structural convenience so status
   * derivation and arrival stay one code path, and neither ever read for its content.
   *
   * So publishing it as a `RUSH_THREAT` — **even with a perfectly honest fifth `ThreatOrigin`** —
   * would not have avoided the defect ADR-022 and ADR-036 exist to prevent. **It would have RELOCATED
   * it**, from `origin` where those ADRs were watching, to `rusher`/`alignment` where nobody was —
   * and it would be *harder* to see there, because on every other `RUSH_THREAT` in the stream those
   * fields are honest. **A placeholder in an honest neighbourhood inherits the neighbourhood's
   * credibility** (Charter §4.1).
   *
   * ⇒ Two kinds of object sharing a shape, so the answer is ADD rather than WIDEN. This event carries
   * **only what the engine actually knows**: he left structure at `sinceTick`, pursuit forces the
   * ball down at `deadlineTick`, and §8.8's escape roll put him there. **No `rusher`. No `alignment`.
   * No `origin`.** If a future mechanism ever computes a genuine chasing-defender identity, THAT is
   * when a threat-shaped event with a real fifth origin becomes honest — a different, larger
   * petition (ADR-054 §4).
   *
   * WHY IT MATTERS FOR MEASUREMENT, and it is not a small population: on scramble ticks the §7.1 line
   * battle is SUSPENDED — every matchup's pressure resets to 0 — so two of `pocketStatusFor`'s three
   * channels are pinned at `CLEAN` **by construction** and this clock is the **SOLE determinant of
   * `POCKET_STATUS`**. It governs **19.013% of dropbacks** at the committed supply. Before this event
   * existed, every stream-based reconstruction of pocket status had to **exclude those plays
   * entirely** — Charter §3's single-source-of-truth rule with a hole in exactly the population that
   * studies it.
   *
   * ⚠ ONE PUBLICATION PER ESCAPE, unlike a threat's `TRAVELLING`/`DELAYED`/`RESET`/`ARRIVED`
   * lifecycle: the deadline never moves once set, because nothing runs step-up logic while a scramble
   * is live.
   */
  | ({ type: "QB_PURSUIT"; payload: {
        /** Tick the quarterback left structure — §8.8's escape succeeding. */
        sinceTick: number;
        /** Tick pursuit forces the ball down. Fixed at emission; it never moves. */
        deadlineTick: number;
        /** `rngLabel` of §8.8's escape roll — already on the stream as its own CHECK (ADR-004). */
        rollRef: string;
      } } & MatchEventBase)
  | ({ type: "ROUTE_STATUS"; payload: { receiver: PlayerId; route: string; phase: RoutePhase; openness: number } } & MatchEventBase)
  | ({ type: "QB_READ"; payload: {
        target: PlayerId;
        actualOpenness: number;
        perceivedOpenness: number;
        effectiveOpenness: number;
        /** Perception roll, not a contested check — has no CHECK counterpart (ADR-004). */
        varianceRoll: RollDetail;
        testsAttrs: AttrId[];   // exposure channel for perception (Spec #6 §3)
      } } & MatchEventBase)
  | ({ type: "QB_DECISION"; payload: {
        /** STEP_UP is climbing the pocket (ADR-007) — HOLD means stood in and kept reading. */
        choice: QbDecisionChoice;
        target?: PlayerId;
        /**
         * Present ONLY when a decision-quality roll was actually made (ADR-005).
         * A hold forced by no route being available is correct QB behaviour, not a
         * failed check — absent tier means "no roll", never "bad decision".
         */
        tier?: ResultTier;
      } } & MatchEventBase)
  | ({ type: "THROW"; payload: {
        target: PlayerId;
        throwType: ThrowType;
        accuracyTier: ResultTier;
        /** The accuracy CHECK's rngLabel — §10.4's placement band lives there (ADR-011). */
        rollRef?: string;
      } } & MatchEventBase)
  /**
   * THE ACT, not the decision (ADR-056 Option C). `QB_DECISION{choice:"THROWAWAY"}` stays as
   * the DECISION; this is the ball leaving his hand.
   *
   * It is its own event rather than a `ThrowType` member because a throwaway HAS NO TARGET
   * and `THROW.target` is a required `PlayerId`. Carrying it on `THROW` would have forced
   * `target?: PlayerId` — weakening an invariant for every `THROW` consumer forever, to
   * represent one case this event represents exactly.
   */
  | ({ type: "THROWAWAY"; payload: {
        cause: ThrowawayCause;
        /**
         * The `pocket_movement` CHECK behind a `POCKET_DURESS` throwaway. ABSENT on
         * `CLOCK_EXPIRED`, where no roll ran at all — ADR-005 forbids reporting a tier
         * where nothing was rolled, and the same reasoning governs a roll reference.
         */
        rollRef?: string;
      } } & MatchEventBase)
  | ({ type: "CATCH_RESOLUTION"; payload: {
        receiver: PlayerId;
        catchType: string;
        /**
         * The ACTUAL openness that DECIDED `catchType` — §8.4's 0-100 scale, after §8.7's decay,
         * and carrying NEITHER §8.3's perception variance NOR §8.4's window modifier. The
         * quantity, not the classification.
         *
         * ⚠ NOT `effectiveOpenness`, and do not "correct" it to that. ADR-044 fixed this comment,
         * which originally said EFFECTIVE and was wrong — the engine had it right. Two reasons,
         * either of which is sufficient:
         *   1. §11.1 is a statement about GEOMETRY AT THE CATCH POINT. Whether a defender is
         *      inside a yard is a fact about the DEFENDER — not about what the passer believed,
         *      nor what his arm talent can compensate for. Perception and arm talent belong to
         *      the READ, and are already published there as QB_READ.actual/perceived/effective.
         *   2. Publishing effective openness would satisfy this sentence and DESTROY the field's
         *      only purpose: a reach counted against it would be a count against a threshold
         *      nothing compares to.
         *
         * ADR-042. `catchType` is `contested` or `routine` BECAUSE this number fell on one side
         * of `contestedMaxOpenness`. Publishing the label without the quantity made the label's
         * own reach uncomputable from the stream — and uncomputable for a reason
         * `docs/design/calibration.md` §5.3's propagation LIMIT does not cover.
         *
         * THE DISTINCTION WORTH REMEMBERING: every other refusal in the backlog is uncomputable
         * because a change PROPAGATES — the obstacle is causal, and no field repairs it. This one
         * was only LEXICAL. Every catch already knew its own answer; the stream did not say it.
         * That is the test for future petitions of this shape: does the information exist at the
         * emission site, or would we be inventing it?
         *
         * REQUIRED, never optional. An optional field re-creates the defect for every producer
         * that omits it, and a consumer cannot tell "not published" from "not applicable" —
         * §4.1's sorting-default corollary, which is how the whole `?? 0` family got established.
         */
        openness: number;
        /** The catch CHECK's RollDetail.rngLabel — never a repeated RollDetail (ADR-004). */
        rollRef: string;
        caught: boolean;
      } } & MatchEventBase)
  /**
   * Summary of a deflection. The rolls themselves live in the
   * `deflection_quality` and `deflection_recovery` CHECKs and are referenced
   * here by rngLabel — this payload predated ADR-004 and repeated them (ADR-009).
   */
  | ({ type: "TIPPED_BALL"; payload: {
        deflector: PlayerId;
        rollRef: string;
        eligible: PlayerId[];
        attempts: { player: PlayerId; rollRef: string }[];
        recoveredBy?: PlayerId;
      } & (
        /**
         * ADR-036 — AN ABSENCE MUST LOOK LIKE AN ABSENCE.
         *
         * A deflection graded DEAD has no recovery target. It previously published
         * `finalTargetNumber: 0` on every such play — a value a future consumer can read,
         * believe and aggregate, by which point it is indistinguishable from a real target.
         * `0` is a legal point on the target scale, which is exactly what made it dangerous
         * (Charter §4.1, the sorting-default corollary).
         *
         * Deliberately NOT `finalTargetNumber?: number`: an optional still hands the consumer
         * `number | undefined`, and they may write `?? 0` — putting back the precise value at
         * issue. The `false` arm makes the key's PRESENCE a producer-side type error under
         * `exactOptionalPropertyTypes`, and forces consumer-side narrowing. Same move as
         * ADR-016's `playId?: never`: "not applicable" is structural, never a value.
         *
         * `recoverable` is NOT a discriminant invented for this union. `eligible: []` does not
         * imply it — measured, 2 of 39 DIFFICULT deflections carry an empty eligible list with
         * a REAL target of 90 (nobody in the throwing zone). Two distinct facts, one observable.
         */
        | { recoverable: true; finalTargetNumber: number }
        | { recoverable: false; finalTargetNumber?: never }
      ) } & MatchEventBase)
  | ({ type: "YAC_ZONE"; payload: { carrier: PlayerId; zone: number; yardsInZone: number } } & MatchEventBase)
  /** A designed run's zone-by-zone advance. Separate from YAC_ZONE so rushing yards
   *  never land in a receiving aggregate — widen or add, never overload (ADR-010). */
  | ({ type: "RUSH_ZONE"; payload: { carrier: PlayerId; zone: number; yardsInZone: number } } & MatchEventBase)
  | ({ type: "RUN_RESOLUTION"; payload: {
        carrier: PlayerId;
        carryType: CarryType;
        /** Absent on a scramble — a quarterback leaving the pocket has no designed gap. */
        gap?: string;
        yardsBeforeContact: number;
        yards: number;
      } } & MatchEventBase)
  | ({ type: "ENV_APPLIED"; payload: { weather?: RollModifier[]; stamina?: RollModifier[]; noise?: RollModifier[] } } & MatchEventBase)
  | ({ type: "STAMINA_DELTA"; payload: { player: PlayerId; delta: number }[] } & MatchEventBase)
  | ({ type: "PENALTY"; payload: { kind: string; player: PlayerId; accepted: boolean; yards: number } } & MatchEventBase)
  | ({ type: "PLAY_RESULT"; payload: { yards: number; turnover: boolean; score?: number; clockRunoff: number } } & MatchEventBase)
  // ---- Game structure (ADR-014). All GAME-scoped: none of these is a play. ----
  | ({ type: "GAME_START"; payload: { home: TeamId; away: TeamId; seed: string } } & GameEventBase)
  | ({ type: "COIN_TOSS"; payload: {
        winner: TeamId; choice: "RECEIVE" | "DEFER"; receivesFirst: TeamId; roll: RollDetail;
      } } & GameEventBase)
  | ({ type: "PERIOD_START"; payload: { period: number; clockSeconds: number } } & GameEventBase)
  | ({ type: "PERIOD_END"; payload: { period: number; home: number; away: number } } & GameEventBase)
  | ({ type: "POSSESSION_CHANGE"; payload: {
        from: TeamId; to: TeamId; cause: PossessionCause; ballOn: number;
      } } & GameEventBase)
  | ({ type: "DRIVE_START"; payload: {
        driveNumber: number; offense: TeamId; defense: TeamId; period: number;
        clockSeconds: number; startYardLine: number; cause: PossessionCause;
      } } & GameEventBase)
  | ({ type: "DRIVE_END"; payload: {
        driveNumber: number; offense: TeamId; result: DriveResult; plays: number;
        yards: number; elapsedSeconds: number; endYardLine: number; points: number;
      } } & GameEventBase)
  /**
   * An ADDITION, never a widening of PLAY_RESULT.score (ADR-010's rule). That field keeps
   * its exact meaning — points scored on this play by whoever had the ball — and cannot
   * express a safety (points to the DEFENCE), a placekick (no scrimmage play), or a
   * running total. Teaching it to would make every existing consumer silently wrong.
   */
  | ({ type: "SCORE"; payload: {
        team: TeamId; kind: ScoreKind; points: number; home: number; away: number;
      } } & GameEventBase)
  | ({ type: "COACH_DECISION"; payload: {
        kind: CoachDecisionKind; authority: "COACH"; team: TeamId; choice: string;
      } } & GameEventBase)
  /**
   * The three kicking events are PLAY-scoped, not game-scoped (ADR-016). A field-goal
   * attempt is a fourth down, a punt is a play, a kickoff is a free-kick down — and once
   * ADR-014 item 12 moved their rolls onto CHECKs, those CHECKs had to name a real PlayId
   * anyway. A summary event that cannot name the play its own CHECK identifies is the exact
   * inverse of the fiction item 13 removed.
   */
  | ({ type: "PLACEKICK"; payload: {
        kind: PlacekickKind; kicker: PlayerId; team: TeamId; distanceYards: number;
        made: boolean; band: string; rollRef: string; target: number;
      } } & MatchEventBase)
  | ({ type: "PUNT"; payload: {
        punter: PlayerId; team: TeamId; fromYardLine: number; grossYards: number;
        touchback: boolean; downed: boolean; returner?: PlayerId; returnYards: number;
        resultYardLine: number; rollRef: string; returnRollRef?: string;
      } } & MatchEventBase)
  | ({ type: "KICKOFF"; payload: {
        kicker: PlayerId; team: TeamId; fromYardLine: number; touchback: boolean;
        returner?: PlayerId; returnYards: number; resultYardLine: number;
        rollRef: string; returnRollRef?: string;
      } } & MatchEventBase)
  /**
   * Summarises; introduces nothing. Every field except `seed` is derivable from the
   * preceding stream. `seed` is provenance, not a game fact — RollDetail.rngLabel carries
   * the fork path but never the seed, so without it a completed game is not re-runnable
   * from its own stream (FANTASY-GATE-PHASE1 §3.3).
   */
  | ({ type: "GAME_END"; payload: {
        home: number; away: number;
        periods: readonly { period: number; home: number; away: number }[];
        plays: number; drives: number;
        reason: GameEndReason;
        seed: string;
      } } & GameEventBase);

export type FranchiseEvent =
  | { type: "CALENDAR_PHASE_ENTERED"; payload: { phase: string } }
  | { type: "WEEK_ADVANCED"; payload: { stamp: CalendarStamp } }
  | { type: "DEADLINE_REACHED"; payload: { deadlineId: string; autoResolved: boolean } }
  | { type: "CONTRACT_SIGNED"; payload: { player: PlayerId; team: TeamId } }
  | { type: "CONTRACT_RESTRUCTURED"; payload: { player: PlayerId } }
  | { type: "PLAYER_RELEASED"; payload: { player: PlayerId; team: TeamId; postJune1: boolean } }
  | { type: "PLAYER_RETIRED"; payload: { player: PlayerId; timing: "IMMEDIATE"|"SLOW"|"LATE" } }
  | { type: "TAG_APPLIED"; payload: { player: PlayerId; tagType: string } }
  | { type: "TRADE_EXECUTED"; payload: { teams: TeamId[] } }
  | { type: "DRAFT_PICK_MADE"; payload: { team: TeamId; player: PlayerId; round: number; pick: number } }
  | { type: "SCOUT_REPORT_FILED"; payload: { observer: TeamId; subject: PlayerId; scout: StaffId } }
  | { type: "PERCEPTION_UPDATED"; payload: { observer: TeamId | "PUBLIC"; subject: PlayerId | StaffId; attrs: AttrId[]; cause: string } }
  | { type: "TRAIT_REVEALED"; payload: { observer: TeamId | "PUBLIC"; subject: PlayerId; trait: TraitId; cause: string } }
  | { type: "COMPARISON_FILED"; payload: { observer: TeamId; a: PlayerId; b: PlayerId; verdict: "A"|"B"|"EVEN"; confidence: number } }
  | { type: "MEDIA_RANKING_PUBLISHED"; payload: { scope: string; entries: { subject: PlayerId; rank: number }[] } }
  | { type: "INJURY_OCCURRED"; payload: { player: PlayerId; kind: string; weeks: number } }
  | { type: "MORALE_CHANGED"; payload: { player: PlayerId; delta: number; reason: string } }
  | { type: "PRESSURE_EVENT"; payload: { source: "OWNER"|"PRESIDENT"|"MEDIA"; delta: number } }
  | { type: "PRESS_STORY_PUBLISHED"; payload: { headline: string; subjects: (PlayerId | StaffId)[] } }
  | { type: "STAFF_HIRED"; payload: { staff: StaffId; team: TeamId; role: string } }
  | { type: "STAFF_DEPARTED"; payload: { staff: StaffId; team: TeamId; reason: string } }
  | { type: "AWARD_GIVEN"; payload: { award: string; subject: PlayerId | StaffId } }
  | { type: "GAME_COMPLETED"; payload: { gameId: GameId; home: number; away: number } };

/**
 * ROLL ACCOUNTING RULE (ADR-004).
 * A roll is recorded exactly once, in a CHECK or PRESNAP_READ event.
 * Summary events (CATCH_RESOLUTION, THROW, etc.) reference it by `rollRef`
 * (the RollDetail.rngLabel), never by repeating RollDetail.
 * Calibration counts rolls ONLY from CHECK/PRESNAP_READ — no double-counting.
 * Exception: QB_READ.varianceRoll is a perception roll, not a contested check,
 * and has no CHECK counterpart.
 *
 * GENERALIZED BY ADR-059 (owner ruling):
 *   A `rollRef` MAY POINT AT ANY PRIOR ROLL IN THE SAME PLAY — not only from a
 *   summary event to its own CHECK. A CHECK may reference another CHECK
 *   (`pass_rush_tick` -> `pass_rush_rep`).
 *
 * This is the rule's SUBSTANCE, not an extension of it: the rule is "recorded
 * exactly once, referenced thereafter," and the DIRECTION of the reference was
 * never the point. A tick recording its own roll and pointing at the rep it
 * derives from is the rule working as intended.
 *
 * Stated here rather than left implicit so the next author does not have to
 * re-derive whether it is allowed. An implicit generalization gets re-litigated
 * at every new site, and the re-derivation is what introduces the divergence —
 * the same failure this codebase keeps recording as a restated constant.
 */
export interface EventEnvelope<E> {
  seq: number;
  at: CalendarStamp;
  event: E;
}

export type MatchEventEnvelope = EventEnvelope<MatchEvent>;
export type FranchiseEventEnvelope = EventEnvelope<FranchiseEvent>;

/** The ENTIRE surface through which narrative touches the game (Spec #7 §1). */
export type NarrativeEffect =
  | { kind: "MORALE_DELTA"; player: PlayerId; delta: number; reason: StorylineId }
  | { kind: "AVAILABILITY"; player: PlayerId; status: "suspended" | "excused" | "returned"; weeks?: number; reason: StorylineId }
  | { kind: "REPUTATION_DELTA"; scope: "coach" | "franchise"; axis: string; delta: number; reason: StorylineId }
  | { kind: "PRESSURE_DELTA"; delta: number; reason: StorylineId };

/** Interrupts feed the advance button (Spec #5 §13). */
export interface Interrupt {
  id: string;
  arcId: StorylineId;
  severity: 1 | 2 | 3 | 4 | 5;
  authority: "COACH" | "GM" | "PRESIDENT";
  delegable: boolean;
  at: CalendarStamp;
  digestText: string;
  sceneId?: string;
}
