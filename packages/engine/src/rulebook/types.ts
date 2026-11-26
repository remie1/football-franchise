/**
 * THE RULEBOOK'S TYPES (ADR-093 step 0): the down as the officials ruled it, its flags, and what
 * the NFL's enforcement of those flags gives back. Names and shapes only: no table, no rule.
 *
 * Frames. Inside a down everything is in Team A's frame: A is the team that snapped this down and a
 * yard line is yards from A's goal line, so A's end zone is `y <= 0` and B's is `y >= 100` (3-11-3,
 * 3-35-2). A result's next snap is given in the frame of the team that snaps it (its `ballOn` is
 * 0 to 100 from its own goal line, as the engine's `MatchState.ballOn` is), so a caller can copy it.
 * Flipping a frame is `100 - y`. Fractions are allowed (half the distance makes them) and are kept
 * exactly, never rounded.
 *
 * Nothing here is on the engine's barrel: step 0 enters through `src/rulebook/index.ts` only.
 */
import type { FoulKind, FoulTiming, PenaltyDown, PenaltyOutcome } from "@ff/contracts";

/** The two sides of a down: A snaps it, B defends it. A's frame is the frame of the whole down. */
export type Team = "A" | "B";

/** Yards from Team A's goal line (3-35-2). The goal line is in the end zone: A's is `<= 0`, B's `>= 100`. */
export type YardLine = number;

/** The down as the officials ruled it, before any flag: where it was snapped, what is to gain, the clock. */
export interface RulebookDown {
  /** The previous spot (3-13-3): where this down was snapped, or was to be. A's frame, strictly inside (0, 100). */
  readonly snapSpot: YardLine;
  /** The down number, 1 to 4. */
  readonly down: 1 | 2 | 3 | 4;
  /** The line to gain (3-8-3). A's frame, `snapSpot < lineToGain <= 100`; 100 when it is goal to go. On the line is a first down (3-8-2). */
  readonly lineToGain: YardLine;
  /** The clock. Absent: no clock rule applies, no clock choice is offered and no `ClockResult` is given. (With a clock, a down with no flag also gets none.) */
  readonly clock?: RulebookClock;
}

/** The clock at the end of the down, read only when a `RulebookDown` carries it. */
export interface RulebookClock {
  /** The period: 1 to 4; 5 is regular-season overtime, which has the fourth period's timing (16-1). */
  readonly period: 1 | 2 | 3 | 4 | 5;
  /** Seconds left on the game clock when the down ended; for a down with no play, when its foul stopped the clock. Never negative. */
  readonly secondsLeft: number;
  /** This half's two-minute warning has passed (the second half's includes overtime's). */
  readonly afterTwoMinuteWarning: boolean;
  /** Time in the period ran out during this down (4-8-1). Never with a `NO_PLAY`. */
  readonly expiredDuringDown: boolean;
  /**
   * How the game clock would have started after this down had it had no flag. RUNNING: a runner or a
   * catch downed inbounds. ON_READY: out of bounds while 4-3-2 restarts the clock on the ready signal.
   * ON_SNAP: an incompletion, a change of possession, a score, out of bounds late in a half. For a
   * down with no play: RUNNING when the clock was running as the foul came, else ON_SNAP.
   */
  readonly withoutFlags: "RUNNING" | "ON_READY" | "ON_SNAP";
  /**
   * Each team's timeouts left this half, by team A and team B of this down. Read only by 4-7-3's
   * "unless the defense has timeouts remaining"; step 0 never offers spending one (gap TIMEOUT_CHOICES).
   */
  readonly timeoutsLeft: { readonly A: number; readonly B: number };
  /** A's points minus B's, at the start of the down. Read only by the computer's choice. */
  readonly scoreDifferenceA: number;
}

/** How a running play began: a handoff, a keeper, a scramble with no pass, or a sack. */
export type RunStart = "HANDOFF" | "KEEPER" | "SCRAMBLE" | "SACK";

/** What the play did, as the officials ruled it, apart from its flags. A's frame throughout. */
export type RulebookPlay =
  /** A foul before the snap killed the down (7-4-2: whether or not the ball was snapped). */
  | { readonly kind: "NO_PLAY" }
  /**
   * A running play from the snap with no forward pass (3-24-3). `deadBallSpot` is forward progress
   * (3-12-1), or the forward point of the ball at the sideline (3-20-4), never where the runner was
   * driven back to. A's frame.
   */
  | { readonly kind: "RUN"; readonly from: RunStart; readonly deadBallSpot: YardLine }
  /** A forward pass. A run before the throw is part of the pass play (14-4-2 Note). */
  | { readonly kind: "PASS"; readonly outcome: PassOutcome };

/** What a forward pass came to. */
export type PassOutcome =
  /** The pass fell incomplete: the ball is dead at the previous spot (8-1-4). */
  | { readonly result: "INCOMPLETE" }
  /** Caught by A; the run after the catch ends at `deadBallSpot` (forward progress, as for a RUN). A's frame. */
  | { readonly result: "COMPLETE"; readonly deadBallSpot: YardLine }
  /**
   * Caught by B and downed at `deadBallSpot` (A's frame; the engine today: the snap spot, no return).
   * At or beyond 100 it is a touchback (caught in B's end zone and downed there, by A's impetus); at
   * or below 0, B's touchdown. A catch in the field carried back into B's end zone is the returns
   * step's (a safety unless momentum, 11-5-1 Exc. 2) and is never passed in.
   */
  | { readonly result: "INTERCEPTED"; readonly deadBallSpot: YardLine };

/** Where in a pass play a flag fell: before the throw (a scramble included), the ball in the air, or the run after the catch (14-4-5: a pass play ends at the catch). */
export type PassPhase = "BEFORE_THROW" | "BALL_IN_AIR" | "AFTER_CATCH";

/** One flag thrown on the down. */
export interface RulebookFlag {
  /** The flag's `rollRef`, which the caller's PENALTY and COACH_DECISION events name. Unique within one call. */
  readonly ref: string;
  /** The foul. Each kind is legal only for the teams and timings its row allows; anything else is an input error. */
  readonly kind: FoulKind;
  /** The team that committed it. */
  readonly by: Team;
  /**
   * When it happened. BEFORE_SNAP: before this down's snap or between downs (14-4-9 par. 2), with a
   * `NO_PLAY` and never combined with another foul. AT_SNAP: a live-ball foul at the snap (14-4-1
   * Item 2). DURING_PLAY: after the snap, the ball live. AFTER_PLAY: a dead-ball foul of this down,
   * in its continuing action or at the instant the ball became dead (14-4-9 par. 1, 3-13-1); it
   * combines with the down's live-ball fouls into a multiple or a double foul (14-4-9 Item 3). A
   * taunt during the down is a dead-ball foul whenever it happens: TAUNTING passed AT_SNAP or
   * DURING_PLAY is administered as AFTER_PLAY of this down, and a taunt between downs is the next
   * down's BEFORE_SNAP.
   */
  readonly when: FoulTiming;
  /** Where it was committed, in A's frame; for a passer's foul (grounding, an illegal pass), where he threw. */
  readonly spot: YardLine;
  /**
   * Required exactly when `when` is DURING_PLAY on a PASS (a TAUNTING flag never takes one): before
   * the throw, the ball in the air, or the run after the catch. Absent on every other flag.
   */
  readonly phase?: PassPhase;
  /** For a personal foul that is also the defense's pass interference: the DPI flag's `ref` in this call (14-1-3 Exc. 2, 8-5). One act, so DURING_PLAY with phase BALL_IN_AIR, as the DPI is (8-5-1). Never a taunt, a dead-ball foul whenever it happens (14-4-9). */
  readonly sameActAs?: string;
}

/** Who snaps next and where, in that team's own frame, so a caller can copy it into the engine's state. */
export interface NextSnap {
  /** The team that snaps next (A's frame is the down's; this is the team's name, not a frame flip). */
  readonly team: Team;
  /** Where that team snaps, in its own frame: yards from its own goal line, strictly inside (0, 100). */
  readonly ballOn: number;
  /** The down it snaps, 1 to 4. */
  readonly down: 1 | 2 | 3 | 4;
  /** The line to gain, in that team's frame: `ballOn < lineToGain <= 100`. A new series is `min(100, ballOn + 10)`, except that the defense's dead-ball delay of game after A's first-down play keeps that series' line while its yards stop short of it (14-1-2 Item 5 Exceptions). */
  readonly lineToGain: number;
  /** `lineToGain - ballOn`. */
  readonly distance: number;
}

/** How A's series ended, for the caller's drive bookkeeping. */
export type DownEnd =
  /** A snaps again in this series: the next down, or the down replayed. */
  | { readonly kind: "SAME_SERIES" }
  /** A snaps the first down of a new series (a first down, an automatic first down): first-and-10, or first-and-less after such a delay. */
  | { readonly kind: "FIRST_DOWN" }
  | {
      readonly kind: "CHANGE_OF_POSSESSION";
      /** What gave B the ball: an interception, or a turnover on downs (a failed fourth down, an accepted loss of down on fourth down; 3-35-3). */
      readonly cause: "INTERCEPTION" | "DOWNS";
      /**
       * A's frame: where A's series ended, for the drive's end (the engine's endDrive takes the old
       * offense's yard line). The play's own dead-ball spot when the play changed possession (an
       * interception as the input gives it, a touchback's too; a failed fourth down), before any
       * penalty yards after the change; the spot the yards leave the ball when an accepted loss of
       * down gives B the ball on fourth down.
       */
      readonly endSpotA: YardLine;
    };

/**
 * How much of the play's own result counts (for step 2's "No Play"), read off the option's enforced
 * record. WHOLE: none enforced (all declined, or the flags all dead-ball and offset with the play
 * standing), or the record's spot is DEAD_BALL_SPOT, BASIC_SPOT, SUCCEEDING_SPOT or
 * TOUCHBACK_TWENTY. IN_PART (the play counts up to that spot): the record's spot is SPOT_OF_FOUL on
 * a run, GOAL_LINE, or an illegal pass's spot of the pass. NONE: the record's spot is PREVIOUS_SPOT
 * (a DPI and grounding included), a safety from A's foul, 15 against 5, or offsetting fouls with
 * the down replayed. With a DPI and its 15 both enforced, the DPI's: NONE.
 */
export type PlayCounts = "WHOLE" | "IN_PART" | "NONE";

/** The whole result of the down under one option: the next snap, or a score. */
export type DownResult =
  | {
      readonly kind: "NEXT_SNAP";
      /** The next snap, in the frame of the team that snaps it. */
      readonly next: NextSnap;
      /** How A's series ended; `end.kind` is CHANGE_OF_POSSESSION exactly when `next.team` is B. */
      readonly end: DownEnd;
      /** How much of the play's own result counts; see `PlayCounts` for the rule. */
      readonly playCounts: PlayCounts;
      /**
       * The clock after the down; present exactly when the input down carried a clock and had at
       * least one flag (a down with no flag has none: the engine's own clock runs a clean down). With
       * `periodOver` it is still given as the down left it: after periods 1 and 3, the next period's
       * first snap; after periods 2, 4 and 5, for the record only.
       */
      readonly clock?: ClockResult;
    }
  | {
      readonly kind: "SCORE";
      /** What was scored. */
      readonly score: "TOUCHDOWN" | "SAFETY";
      /** The team that scored it (A's frame names: A or B). For a safety, the team credited with the two points. */
      readonly by: Team;
      /** How much of the play's own result counts; see `PlayCounts` for the rule. */
      readonly playCounts: PlayCounts;
      /**
       * The clock after the down; present exactly when the input down carried a clock and had at
       * least one flag (a down with no flag has none). After a score `gameClockStarts` is ON_SNAP, as after any score, and `playClock` is 25, or 30 when
       * the offense's time-saving foul's runoff is taken (4-7-1 Item 1: "reset the play clock to 30
       * seconds"): standing in, the try or the kick that follows owns its timing.
       */
      readonly clock?: ClockResult;
    };

/**
 * The offended team's one decision on a flag, all its elections in one string (the contract's
 * PENALTY_OPTION `choice`): DECLINE, or ACCEPT, then the spot it elected where the rulebook gives a
 * choice (_SAFETY: 14-2-2 bullet 2, 14-3-6, 14-4-5 Exc. 3, a reading that the safety is a third
 * option beside the general rule's spot and declining; _DEAD_BALL_SPOT: 14-2-4), then its clock pick
 * away from the default (_NO_RUNOFF: B declines the runoff, 4-7-1 Item 1; _CLOCK_ON_SNAP: A has the
 * clock start on the snap after B's time-saving foul, 4-7-1 Item 2). With no suffix: the rule's own
 * spot, the runoff taken where one applies, the clock on the ready signal (on the snap after a score).
 * Accepting B's live-ball foul on a period's last down also takes the untimed down (a design choice,
 * not the rulebook), as does B's accepting A's personal foul before B gains the ball (4-8-2 bullet 2).
 */
export type PenaltyChoice =
  | "DECLINE"
  | `ACCEPT${"" | "_SAFETY" | "_DEAD_BALL_SPOT"}${"" | "_NO_RUNOFF" | "_CLOCK_ON_SNAP"}`;

/** Where a flag was marked off from: the engine's own list, wider than the contract's (it names the goal line and B's 20). */
export type MarkedOffSpot =
  | "PREVIOUS_SPOT"
  | "SPOT_OF_FOUL"
  | "BASIC_SPOT"
  | "DEAD_BALL_SPOT"
  | "SUCCEEDING_SPOT"
  | "GOAL_LINE"
  | "TOUCHBACK_TWENTY";

/**
 * One accepted flag marked off.
 *
 * `spot` is the spot of enforcement as the rule names it:
 *  - PREVIOUS_SPOT: a foul before the snap, at the snap, or on a pass play before it ends; 15 against
 *    5's 15; an illegal pass from behind the line; and the spot fouls (DPI and grounding are written
 *    from the previous spot, by the yards to the new spot, as the contract says).
 *  - SPOT_OF_FOUL: a run's spot of the foul under the three-and-one (14-3-6); an illegal pass from
 *    beyond the line (the spot of the pass); the 15 added to a DPI (from the DPI's new spot); and a
 *    safety (as the contract writes one).
 *  - BASIC_SPOT: a run's basic spot (14-3-5).
 *  - DEAD_BALL_SPOT: 14-4-5 Exc. 4 and 5 and 14-2-4 when they mark from the dead-ball spot.
 *  - SUCCEEDING_SPOT: a dead-ball flag (B's 20 after a touchback included).
 *  - GOAL_LINE: A's foul in B's end zone before A's touchdown (14-2-2 bullet 3, 14-3-6 bullet 4).
 *  - TOUCHBACK_TWENTY: A's personal foul before an end-zone interception (14-2-2 bullet 1).
 */
export interface MarkedOff {
  /** The spot of enforcement the rule names; the list is on the type. */
  readonly spot: MarkedOffSpot;
  /** The yard line of that spot, A's frame. */
  readonly from: YardLine;
  /** Where the ball stands after the marking, A's frame. */
  readonly to: YardLine;
  /**
   * What the flag cost the flagged team: always `|to - from|`, so never signed by frame. A safety's
   * record has `from` the previous spot, `to` 0 (A's goal line) and `yards` the previous spot's
   * distance to the goal line (the contract's figure).
   */
  readonly yards: number;
  /** True exactly when 14-2-1 cut the yards to half the distance, and in DPI's halfway case (8-5). False on a safety's record. */
  readonly halfTheDistance: boolean;
  /**
   * The row's effect on the down: AUTOMATIC_FIRST_DOWN for B's fouls the table marks as giving one,
   * LOSS_OF_DOWN for grounding and the illegal forward pass, else YARDS_ONLY; a foul of B's enforced when B snaps next (its dead-ball foul after it gained the ball) is YARDS_ONLY, since that first-and-10 is B's own by 14-1-2 Item 6, not a first down the penalty gives A. A safety's record too:
   * YARDS_ONLY unless the row carries a loss of down (the contract mapping drops it).
   */
  readonly down: PenaltyDown;
  /** True exactly for the safety a foul of A's gives (the `_SAFETY` election, grounding from A's end zone). */
  readonly safety: boolean;
  /** The rulebook citation (rule-section-article, such as "14-4-5 Exc. 5") for the spot and the yards. */
  readonly rule: string;
}

/** What became of one input flag under one option. */
export interface FlagRecord {
  /** The input flag's `ref`. */
  readonly ref: string;
  /** What became of the flag: ENFORCED, DECLINED, OFFSET or SUPERSEDED (the contract's). */
  readonly outcome: PenaltyOutcome;
  /** True for B's AT_SNAP flags, TAUNTING excepted (a taunt is a dead-ball foul whenever it happens, so it never makes a free play): the play ran (the contract's `freePlay`). */
  readonly freePlay: boolean;
  /** How the flag was marked off; present exactly when `outcome` is ENFORCED. */
  readonly marked?: MarkedOff;
  /** The offended team's choice; absent for OFFSET, SUPERSEDED and a flag the rulebook enforces by rule (15 against 5's major foul, clean hands' B foul). */
  readonly decision?: { readonly team: Team; readonly choice: PenaltyChoice };
}

/** One whole way the down can come out. */
export interface RulebookOption {
  /** Deterministic: "rule" when the rulebook decides; "decline" for declining every flag; else each flag's `ref=CHOICE` in input order joined by ",". */
  readonly id: string;
  /** One record per input flag, in input order. */
  readonly flags: readonly FlagRecord[];
  /** The full result of the down under this option. */
  readonly result: DownResult;
}

/** The options a down's flags give, and who picks among them. */
export interface Administration {
  /**
   * Who picks among `options`: the offended team whenever the flags are one team's, even when one
   * option is left (the others merged into the decline, or a touchdown that is offered alone); null
   * exactly when there is no flag or the flags are both teams' (a double foul: one option, "rule").
   */
  readonly chooser: Team | null;
  /** The options, decline first, then by `id` in code-unit order. */
  readonly options: readonly RulebookOption[];
}

/**
 * The clock after the down under one option. An option carries one exactly when the input down has a
 * clock and at least one flag (a down with no flag has none: the engine's own clock runs a clean
 * down). With `periodOver` a NEXT_SNAP result still gives it as the down left it: after periods 1
 * and 3, the next period's first snap; after periods 2, 4 and 5, for the record only. After a score, `gameClockStarts` is ON_SNAP, as after any score, and `playClock` is 25, or 30
 * when the runoff is taken (4-7-1 Item 1: "reset the play clock to 30 seconds"): standing in, the
 * try or the kick that follows owns its timing.
 */
export interface ClockResult {
  /** Seconds left after any runoff, never below 0. */
  readonly secondsLeft: number;
  /** Seconds run off by a time-saving foul by A (4-7-1, 4-7-2): 0 or 10. */
  readonly runoff: 0 | 10;
  /** No timed snap follows in this period. */
  readonly periodOver: boolean;
  /** The next snap is an untimed down of this period (4-8-2). */
  readonly untimedDown: boolean;
  /** How the game clock starts for the next snap: on the ready signal or on the snap (4-3-2). */
  readonly gameClockStarts: "ON_READY" | "ON_SNAP";
  /** The play clock the next snap runs on, in seconds (4-6-2, 4-6-3): 25, 30 or 40; 30 exactly with a runoff (also after a score). */
  readonly playClock: 25 | 30 | 40;
}

/** Why a down was refused. Each code names the step that builds the case. */
export type RefusalCode =
  /** A personal foul on a scoring down, a dead-ball flag after a score, the end of a half, or A's personal foul before a safety on the last play: the yards go to a try or a kickoff. */
  | "CARRIED_TO_TRY_OR_KICKOFF"
  /** A live-ball flag after a change of possession during the down (an interception's run after the catch). */
  | "AFTER_CHANGE_OF_POSSESSION"
  /** Before-the-snap flags by both teams for one snap. */
  | "BEFORE_SNAP_BOTH_TEAMS"
  /** UNSPORTSMANLIKE_CONDUCT at the snap or during the play. */
  | "LIVE_BALL_UNSPORTSMANLIKE"
  /** A case the rulebook's text leaves open. */
  | "OPEN_TEXT"
  /** Another flag during the play with an illegal pass thrown from beyond the line. */
  | "BEYOND_LINE_PASS"
  /** A's delay of game after the down with B's live-ball foul (14-5-1 Exc. 3). */
  | "DELAY_AFTER_DOWN_DOUBLE_FOUL"
  /** B's time-saving foul in the last 40 seconds with B out of timeouts (4-7-3). */
  | "LAST_40_SECONDS";

/** A down the rulebook does not enforce yet, returned as a value (never thrown). */
export interface RulebookRefusal {
  /** The code of the case. */
  readonly refused: RefusalCode;
  /** The citation (rule-section-article) the case turns on. */
  readonly rule: string;
  /** Which later step builds the case, and what it must do. */
  readonly step: string;
}

/** What the contract cannot say about a flag record, each a petition for the step that first emits such a flag. */
export type ContractGap =
  /** Marked from the goal line (14-2-2 bullet 3, 14-3-6 bullet 4): no EnforcementSpot for it. `toPenalty` returns it when the record's spot is GOAL_LINE. */
  | "GOAL_LINE"
  /** A's personal foul before an end-zone interception, marked from B's 20 (14-2-2 bullet 1). `toPenalty` returns it when the record's spot is TOUCHBACK_TWENTY. */
  | "TOUCHBACK_TWENTY"
  /** Enforced with no decision by the offended team (15 against 5's major foul, clean hands' B foul), which the contract's doc does not say. `toPenalty` returns it when the record is ENFORCED with no decision. */
  | "ENFORCED_BY_RULE"
  /** The play does not count (or counts in part) and PLAY_RESULT has no field for it. Concerns the events around a flag: `toPenalty` never returns it. */
  | "NO_PLAY_RESULT"
  /** A foul before the snap has no play for PLAY_START and PLAY_RESULT to wrap. Concerns the events around a flag: `toPenalty` never returns it. */
  | "NO_SNAP"
  /** Timeouts in lieu of the runoff or the clock start. Concerns the events around a flag: `toPenalty` never returns it. */
  | "TIMEOUT_CHOICES";
