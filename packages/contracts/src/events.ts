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

export type ResultTier =
  | "CRITICAL_SUCCESS" | "STRONG_SUCCESS" | "SUCCESS" | "MARGINAL_SUCCESS"
  | "TIE" | "MARGINAL_FAILURE" | "FAILURE" | "STRONG_FAILURE" | "CRITICAL_FAILURE";

/** Closed union — extending it is a contract petition (lightweight, pre-approved category). */
export type CheckKind =
  | "coverage_read" | "blitz_recognition" | "audible"
  | "release_vs_press" | "route_break" | "man_coverage" | "zone_coverage" | "option_route"
  | "pass_rush_tick" | "run_block" | "second_level_climb" | "stunt_communication" | "blitz_pickup"
  | "qb_read" | "qb_decision" | "unseen_defender" | "hold_decision" | "scramble"
  | "passing_lane" | "accuracy" | "dline_tip"
  | "catch" | "contested_catch" | "deflection_quality" | "deflection_recovery"
  | "yac_tackle" | "downfield_block" | "breakaway"
  | "rb_vision" | "gap_battle" | "pursuit_angle" | "tackle" | "break_tackle"
  | "communication" | "snap_jump" | "fumble" | "penalty_check";

export interface MatchEventBase {
  gameId: GameId;
  playId: PlayId;
  tick?: number;
}

export type MatchEvent =
  | ({ type: "PLAY_START"; payload: unknown } & MatchEventBase)
  | ({ type: "PRESNAP_READ"; payload: { actor: PlayerId; kind: CheckKind; roll: RollDetail; target: number; tier: ResultTier } } & MatchEventBase)
  | ({ type: "TICK"; payload: { tick: number } } & MatchEventBase)
  | ({ type: "CHECK"; payload: {
        checkKind: CheckKind;
        actors: PlayerId[];
        roll: RollDetail;
        target?: number;
        opposedRoll?: RollDetail;
        tier: ResultTier;
        margin: number;
        testsAttrs: AttrId[];   // lets perception update from exposure (Spec #6 §3)
      } } & MatchEventBase)
  | ({ type: "POCKET_STATUS"; payload: { status: "CLEAN"|"PRESSURE"|"COLLAPSING"|"IMMEDIATE"|"SACK" } } & MatchEventBase)
  | ({ type: "ROUTE_STATUS"; payload: { receiver: PlayerId; route: string; phase: "JAMMED"|"DEVELOPING"|"OPEN"|"DECAYING"; openness: number } } & MatchEventBase)
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
        choice: "THROW"|"HOLD"|"SCRAMBLE"|"THROWAWAY"|"CHECKDOWN";
        target?: PlayerId;
        /**
         * Present ONLY when a decision-quality roll was actually made (ADR-005).
         * A hold forced by no route being available is correct QB behaviour, not a
         * failed check — absent tier means "no roll", never "bad decision".
         */
        tier?: ResultTier;
      } } & MatchEventBase)
  | ({ type: "THROW"; payload: { target: PlayerId; throwType: "BULLET"|"TOUCH"|"BACK_SHOULDER"|"THROWAWAY"; accuracyTier: ResultTier } } & MatchEventBase)
  | ({ type: "CATCH_RESOLUTION"; payload: {
        receiver: PlayerId;
        catchType: string;
        /** The catch CHECK's RollDetail.rngLabel — never a repeated RollDetail (ADR-004). */
        rollRef: string;
        caught: boolean;
      } } & MatchEventBase)
  | ({ type: "TIPPED_BALL"; payload: { deflector: PlayerId; qualityRoll: RollDetail; finalTargetNumber: number; eligible: PlayerId[]; attempts: { player: PlayerId; roll: RollDetail }[]; recoveredBy?: PlayerId } } & MatchEventBase)
  | ({ type: "YAC_ZONE"; payload: { carrier: PlayerId; zone: number; yardsInZone: number } } & MatchEventBase)
  | ({ type: "RUN_RESOLUTION"; payload: { carrier: PlayerId; gap: string; yards: number } } & MatchEventBase)
  | ({ type: "ENV_APPLIED"; payload: { weather?: RollModifier[]; stamina?: RollModifier[]; noise?: RollModifier[] } } & MatchEventBase)
  | ({ type: "STAMINA_DELTA"; payload: { player: PlayerId; delta: number }[] } & MatchEventBase)
  | ({ type: "PENALTY"; payload: { kind: string; player: PlayerId; accepted: boolean; yards: number } } & MatchEventBase)
  | ({ type: "PLAY_RESULT"; payload: { yards: number; turnover: boolean; score?: number; clockRunoff: number } } & MatchEventBase)
  | ({ type: "GAME_END"; payload: { home: number; away: number } } & MatchEventBase);

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
