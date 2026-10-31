/**
 * ADR-084: the relationship ledger's fixed numbers, and every move of §5 as one table. Every number
 * here is CHOSEN (provenance NONE), a starting value to tune.
 */

/** The knobs, by the ADR-084 section that uses them. */
export const RELATIONSHIP_TUNING = {
  /** §4: a rest point is this × ADR-080's fit, the judged man as the coach and the feeler as the player... */
  restScale: 40,
  /** ... plus this when the two share a coaching tree (ADR-080's `inTree`). */
  treeBonus: 8,
  /** §4: each calendar week a view closes this share of the gap to its rest point. */
  weeklyDrift: 0.02,
  /** §6: a rift costs this at once... */
  riftHit: -25,
  /** ... and lowers the holder's rest point by this while it stands. */
  riftRest: -30,
  /** §5.1: everyday moves on one view of the user add up to at most this, either way, in a week. */
  everydayWeeklyCap: 3,
  /** §5.2: a sit-down works with 50% + half the mean of the views of the user, inside these odds. */
  sitDownOdds: [0.1, 0.9] as readonly [number, number],

  // §7.1 stay or go (L2b, ruled 2026-10-31). Read only when the carousel carries the views.
  /** Q1 (b): a coordinator whose contract is up refuses a new one with this chance, by his view of his boss. */
  walkChance: { strained: 0.1, broken: 0.4 } as Readonly<Record<string, number>>,
  /**
   * Q2 (a): a head coach's view of a coordinator, per point, in the logit of firing him (lower is
   * safer). 1.6 per 100 makes -30 worth about 5 places of unit rank and -60 about 10, at
   * ADR-080's 3 logit units across the league's 31 places.
   */
  fireOpinionPerPoint: 1.6 / 100,
  /**
   * Q3 (a): a new head coach keeps an inherited coordinator with this much more chance per unit of
   * ADR-080's fit (his type as the feeler, the coordinator's as the judged), ±0.4 → about ±10 points.
   */
  keepFitPerUnit: 0.25,
} as const;

/** What a move does to a rift (§6): "CAN_OPEN" opens one if the view ends strained or worse. */
export type RiftRule = "CAN_OPEN" | "REPAIRS";

export interface RelationshipMove {
  /** §5.1 everyday choices (capped on views of the user), §5.2 big moments, §5.4 results. */
  kind: "EVERYDAY" | "MOMENT" | "RESULT";
  /** The move's size. A move with a `range` takes its size from the caller, inside the range. */
  delta: number;
  range?: readonly [number, number];
  /** Siding in a clash counts double in the open (§5.2). */
  openFactor?: number;
  /**
   * "How sure are you?" stings more when his view of you rests below `coldBelow` and less when it
   * rests at `warmFrom` or above (§5.1).
   */
  byRest?: { coldBelow: number; cold: number; warmFrom: number; warm: number };
  rift?: RiftRule;
}

/**
 * ADR-084 §5, one line per move. "Of the user" moves land, on a computer team, on the view of the
 * head coach, who hires, fires and extends there.
 */
export const RELATIONSHIP_MOVES = {
  // §5.1 everyday choices: his view of the user unless noted. Doing it his way moves nothing.
  PLAN_TWEAKED: { kind: "EVERYDAY", delta: -1 },
  PLAN_THROWN_OUT: { kind: "EVERYDAY", delta: -2 },
  GAME_CALLS_TAKEN: { kind: "EVERYDAY", delta: -2 },
  STARTED_OVER_HIS_PICK: { kind: "EVERYDAY", delta: -1 },
  STARTED_OVER_HIS_QB_PICK: { kind: "EVERYDAY", delta: -2 },
  PRACTICE_GRANTED: { kind: "EVERYDAY", delta: 1 },
  PRACTICE_REFUSED: { kind: "EVERYDAY", delta: -1 },
  SIGNED_HIS_PLAYER: { kind: "EVERYDAY", delta: 2 },
  WENT_AGAINST_HIS_ROSTER_CALL: { kind: "EVERYDAY", delta: -2 },
  ASKED_HIS_VIEW: { kind: "EVERYDAY", delta: 1 },
  /** The GM's view of the user. */
  OVERRULED_GM: { kind: "EVERYDAY", delta: -1 },
  OVERRULED_GM_HARD: { kind: "EVERYDAY", delta: -2 },
  CREDITED_IN_PRESS: { kind: "EVERYDAY", delta: 1 },
  LOSS_PUT_ON_HIS_UNIT: { kind: "EVERYDAY", delta: -2 },
  ASKED_HOW_SURE: { kind: "EVERYDAY", delta: -2, byRest: { coldBelow: 0, cold: -3, warmFrom: 10, warm: -1 } },
  /** The meeting writes each answer's size (ADR-081). */
  MEETING_ANSWER: { kind: "EVERYDAY", delta: 0, range: [-3, 3] },
  /** Each staff member's view of the other. */
  POLITE_DISAGREEMENT: { kind: "EVERYDAY", delta: -2 },

  // §5.2 big moments: his view of the user unless noted.
  /** A new man's view of the one who hired him starts at his rest point plus this. */
  HIRED: { kind: "MOMENT", delta: 10 },
  PROMOTED: { kind: "MOMENT", delta: 12, rift: "REPAIRS" },
  EXTENDED: { kind: "MOMENT", delta: 10, rift: "REPAIRS" },
  PROMISE_KEPT: { kind: "MOMENT", delta: 8, rift: "REPAIRS" },
  DEFENDED_IN_PUBLIC: { kind: "MOMENT", delta: 12, rift: "REPAIRS" },
  KEPT_OVER_PRESIDENT: { kind: "MOMENT", delta: 15, rift: "REPAIRS" },
  LOWBALLED: { kind: "MOMENT", delta: -5 },
  PLAY_CALLS_TAKEN: { kind: "MOMENT", delta: -15, rift: "CAN_OPEN" },
  BLAMED_IN_PUBLIC: { kind: "MOMENT", delta: -12, rift: "CAN_OPEN" },
  PROMISE_BROKEN: { kind: "MOMENT", delta: -15, rift: "CAN_OPEN" },
  /** Of the user, by each man whose view of the fired man is good... */
  FRIEND_FIRED: { kind: "MOMENT", delta: -8, rift: "CAN_OPEN" },
  /** ... or close. */
  CLOSE_FRIEND_FIRED: { kind: "MOMENT", delta: -12, rift: "CAN_OPEN" },
  /** A clash: the backed man's view of the user... */
  BACKED_IN_CLASH: { kind: "MOMENT", delta: 5, openFactor: 2 },
  /** ... the other's view of the user... */
  NOT_BACKED_IN_CLASH: { kind: "MOMENT", delta: -8, openFactor: 2, rift: "CAN_OPEN" },
  /** ... and the other's view of the backed man (not doubled). */
  LOST_CLASH_TO: { kind: "MOMENT", delta: -5 },
  /** Each of the other; a rift if the clash boils over (the meeting's F4 mix decides). */
  OPEN_ARGUMENT: { kind: "MOMENT", delta: -10 },
  /** Each of the other, or his of the user. */
  SIT_DOWN_WORKED: { kind: "MOMENT", delta: 15, rift: "REPAIRS" },
  SIT_DOWN_FAILED: { kind: "MOMENT", delta: -5 },

  // §5.4 results, at season end: every view on the staff, views of the user included.
  WINNING_SEASON: { kind: "RESULT", delta: 5 },
  LOSING_SEASON: { kind: "RESULT", delta: -5 },
  /** Also repairs a rift between two staff members, unless the view is broken. */
  PLAYOFF_WIN: { kind: "RESULT", delta: 5 },
} as const satisfies Record<string, RelationshipMove>;

export type RelationshipMoveId = keyof typeof RELATIONSHIP_MOVES;

/** §5.2: the chance a sit-down works, from the mean of the views of the user (or his view alone). */
export function sitDownChance(meanViewOfUser: number): number {
  const [lo, hi] = RELATIONSHIP_TUNING.sitDownOdds;
  return Math.min(hi, Math.max(lo, 0.5 + meanViewOfUser / 200));
}
