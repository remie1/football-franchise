/** Player, staff, team, and contract shapes. Cap math lives in franchise. */
import type { PlayerId, TeamId, StaffId, Position, AttrId, CoachAttrId } from "./ids.js";
import type { AttributeMap, TraitSet } from "./registry.js";
import type { CalendarStamp } from "./calendar.js";
import type { DefensiveDisguiseTendency, StaffJob } from "./staff.js";

/**
 * Ground truth. Only engine, attributes pipeline, and calibration consume this, plus four franchise
 * steps until perception exists (ADR-087 §7): the development week, the injury draws (true
 * `durability`), the coordinators' read for the weekly depth chart (through their own blur) and the
 * morale step (true `volatility`).
 */
export interface TrueAttributes {
  readonly kind: "true";
  values: AttributeMap;
  traits: TraitSet;
  /** ADR-087 P1: how he grows and ages. Absent = he never changes (the behaviour before it). */
  development?: PlayerDevelopment;
}

/**
 * ADR-087 P1: a player's hidden development record. `growth`: his own rate, fixed for life (1 = typical).
 * `snaps`: career snaps, which feed his football smarts. `carry`: the fraction of a point each rating
 * has earned but not yet shown, by registry id (ratings move in whole points). `body`: his 40 and
 * 3-cone (seconds), vertical (inches) and bench (reps) as they are now; his weight is the bio's.
 */
export interface PlayerDevelopment {
  growth: number;
  snaps: number;
  carry: Partial<Record<string, number>>;
  body: { forty: number; cone: number; vertical: number; bench: number };
}

/** One observer's belief about one player. All the UI and AI teams ever see. */
export interface PerceivedAttribute {
  estimate: number;
  low: number;
  high: number;
  confidence: number; // 0..1
  lastUpdated: CalendarStamp;
}

export interface PerceivedAttributes {
  readonly kind: "perceived";
  observer: TeamId | "PUBLIC";
  subject: PlayerId | StaffId;
  values: Partial<Record<string, PerceivedAttribute>>;
  knownTraits: TraitSet;
}

/**
 * Rapport between a passer and a receiver (ADR-008). Franchise-owned, engine reads only.
 *
 * NOT an attribute: it belongs to a pair rather than a player, it is not symmetric with
 * performance (a 95-rated receiver has no chemistry with a QB he met in August), and it
 * moves on the franchise clock rather than the game clock. Same shape and owner as
 * perception, deliberately a separate table — perception is *belief*, chemistry is
 * *capability*, and a scout's opinion must never change how a pass is thrown.
 */
export interface ChemistryPair {
  quarterback: PlayerId;
  receiver: PlayerId;
  /** 0-100; 50 = neutral, a competent pairing with no particular history. */
  level: number;
}

/**
 * Resolved chemistry for the players on the field, keyed passer -> receiver.
 * A snapshot computed by franchise, not a system the engine calls into.
 * Absent table => every pair reads 50 => neutral modifier => unchanged behaviour.
 */
export type ChemistryTable = Readonly<Record<string, Readonly<Record<string, number>>>>;

/** Generated appearance — deterministic from PlayerId + world seed (Portrait System §2). */
export interface Appearance {
  skinTone: number;      // 1..10
  faceShape: "round" | "square" | "long" | "oval" | "heart" | "diamond";
  featureWeight: "fine" | "average" | "heavy";
  build: "lean" | "athletic" | "thick" | "massive";
  hair: { style: string; length: string; color: string; recession: number };
  facialHair: "none" | "stubble" | "mustache" | "goatee" | "full" | "chinstrap";
  eyeColor: string;
  distinguishing: string[];
  era: number;
}

export interface PlayerBio {
  id: PlayerId;
  displayName: string;
  position: Position;
  age: number;
  heightIn: number;
  weightLb: number;
  birthRegion?: string;
  /** ADR-086 C2: "PROSPECT" while he is in a draft class and not yet picked. */
  draft: { year: number; round: number; pick: number } | "UDFA" | "PROSPECT";
  appearance?: Appearance;
  /**
   * ADR-085 K5: credited seasons under the CBA (a season with 3+ games on full pay status). Public.
   * Sets minimum salary, RFA/ERFA status and the veteran benefit; development reads it too (ADR-087).
   * Raised at the year turn. Absent reads as 0.
   */
  creditedSeasons?: number;
  /**
   * ADR-087 P2: his combine numbers, public (40 and 3-cone in seconds, vertical in inches, bench in
   * reps). Frozen on draft day: aging moves the hidden `TrueAttributes.development.body`, never this.
   * A drill he did not run is absent.
   */
  combine?: { forty?: number; cone?: number; vertical?: number; bench?: number };
}

/** ADR-087 P3: where an injury happened. */
export type InjurySetting = "GAME" | "PRACTICE" | "AWAY";
/** ADR-087 P3: how long, in weeks lost: 0, 1-3, 4-8, 9 or more. */
export type InjuryBand = "DAY_TO_DAY" | "SHORT" | "LONG" | "MAJOR";

/** Public, as on an NFL injury report. What it will cost him for good is hidden (ADR-087 §7). */
export interface Injury {
  kind: string;
  weeksRemaining: number;
  playable: boolean;
  inGamePenalty?: AttributeMap;
  /** ADR-087 P3. */
  setting: InjurySetting;
  /** ADR-087 P3. */
  band: InjuryBand;
  /** ADR-087 P3: when it happened. */
  since: CalendarStamp;
}

export interface PlayerCondition {
  stamina: number;  // 0..100 current
  morale: number;   // -100..100
  injury?: Injury;
}

/** Weighted need dimensions (Spec #14 §2). Hidden information. */
export type NeedId =
  | "winning" | "playingTime" | "production" | "schemeFit" | "money" | "market"
  | "loyalty" | "coachingStyle" | "roleClarity" | "lockerRoom" | "geography"
  | "championshipWindow" | "coStars" | "orgCompetence" | "influence"
  | "businessMarket" | "reunion" | "facilities" | "contractStructure"
  | "positionalCompetition" | "spite";

export type PersonalityType = "demanding" | "playersCoach" | "cerebral" | "fiery" | "quiet";

export interface PersonalitySheet {
  needs: Partial<Record<NeedId, number>>; // weights
  type: PersonalityType;
  /**
   * ADR-087 P6: how many seasons (0..2) he waits for a team after becoming unsigned before he
   * retires. A placeholder drawn when he is made, until Spec #14's needs set it. Hidden.
   */
  patience?: number;
}

export interface PlayerState {
  bio: PlayerBio;
  attributes: TrueAttributes;
  condition: PlayerCondition;
  personality: PersonalitySheet;
  teamId?: TeamId;
}

export type StaffRole =
  | "HEAD_COACH" | "OC" | "DC" | "STC" | "POSITION_COACH"
  | "SCOUTING_DIRECTOR" | "SCOUT" | "PLAYER_ENGAGEMENT" | "STRENGTH"
  | "CAP_MANAGER" | "PRESIDENT";

export interface StaffState {
  id: StaffId;
  displayName: string;
  role: StaffRole;
  age: number;
  attributes: Partial<Record<string, number>>; // CoachAttrId-keyed
  schemeFamily?: string;
  lineage: StaffId[];
  personalityType: PersonalityType;
  /** Set only for a seat holder or a president, matching `Team.staff` (ADR-080 P2). */
  teamId?: TeamId;
  /** ADR-080 P2: his résumé, oldest job first. */
  career: StaffJob[];
  /** ADR-080 P2: the last season he coached, once he has retired; absent while he is in the game. */
  retiredAfter?: number;
  /** ADR-080 P4: read only in the DC seat. Absent = the league default. */
  disguise?: DefensiveDisguiseTendency;
  /**
   * ADR-087 C1: a head coach's depth-chart leanings, 0..100 each: sticks with the incumbent, leans to
   * veterans, plays who looks best this week. Drawn from his personality type. Absent = even leanings.
   */
  lineup?: { incumbent: number; veteran: number; form: number };
}

/**
 * A rated league — the output of the attributes pipeline and the input to a calibration
 * batch (ADR-015).
 *
 * It lives here, rather than in `attributes`, because two domains both need it and a type
 * two domains both need is by definition shared vocabulary. The dependency cycle pnpm
 * reported (attributes → calibration for ingestion, calibration → attributes for this type)
 * was not a packaging inconvenience to work around — it was the tooling correctly reporting
 * an architecture error. Same reasoning that put the event schema in the constitution.
 *
 * It passes `contracts.md` §10's test cleanly: this is a data shape, not logic. The harness
 * needs the *shape* of a rated league, not the pipeline that produced one.
 *
 * `provenance` and `coverage` are deliberate `unknown` slots, claimed by `attributes.md` via
 * a later petition — the same treatment `SaveFile`'s open slots get (§9), and for the same
 * reason: it keeps v0 shippable without guessing another domain's internals.
 */
export interface RatedLeague {
  teams: Team[];
  players: PlayerState[];
  provenance: unknown;
  coverage: unknown;
}

export interface CapState {
  capLimit: number;
  committed: number;
  /** The sum of this season's `DeadMoneyCharge`s for the team (ADR-085 K3). */
  deadMoney: number;
}

/** ADR-085 K3: why money stays on a team's cap for a player who is gone. */
export type DeadMoneyReason = "RELEASED" | "TRADED" | "VOIDED" | "RETIRED";

/** ADR-085 K3: one season's dead money for one player on one team. Dollars. */
export interface DeadMoneyCharge {
  team: TeamId;
  player: PlayerId;
  season: number;
  amount: number;
  reason: DeadMoneyReason;
}

export interface Team {
  id: TeamId;
  displayName: string;
  city: string;
  roster: PlayerId[];
  /**
   * ADR-088 S3: players on a reserve list (injured reserve, PUP, non-football injury and the
   * rest). They belong to the team but are not in `roster` and do not count toward its 53.
   */
  reserve?: PlayerId[];
  staff: StaffId[];
  depthChart: Partial<Record<Position, PlayerId[]>>;
  /** ADR-086 C4: the practice squad, filled on cut-down day. Absent = none. */
  practiceSquad?: PlayerId[];
  capState: CapState;
  staffBudget: { limit: number; committed: number };
}

export interface ContractYear {
  season: number;
  baseSalary: number;
  signingBonusProration: number;
  springBonus?: { amount: number; dueAt: CalendarStamp; clawbackOnRetirement: boolean };
  guarantees: { fullyGuaranteed: boolean; injuryOnly?: boolean };
  capHit: number;
  /** ADR-085 K1: paid if on the roster on a set day early in the league year. */
  rosterBonus?: number;
  /** ADR-085 K1: paid for attending the offseason programme. */
  workoutBonus?: number;
  /** ADR-085 K1: this year's share of an option bonus, spread like a signing bonus. */
  optionBonusProration?: number;
  /** ADR-085 K1: the season's total if active for every game; earned per game on the 53. */
  perGameRosterBonus?: number;
  /** ADR-085 K1: likely-to-be-earned incentives count on this year's cap; unlikely ones the next, if earned. */
  incentives?: { likely: number; unlikely: number };
  /** ADR-085 K1: the guaranteed part of this year's base salary, in dollars. */
  guaranteedSalary?: number;
  /** ADR-085 K1: a year that exists only to spread a bonus; it voids before it is played. */
  voidYear?: boolean;
}

/** ADR-085 K2: what kind of deal a contract is. */
export type ContractKind =
  | "ROOKIE" | "VETERAN" | "EXTENSION" | "MINIMUM" | "FRANCHISE_TAG" | "TRANSITION_TAG"
  | "RFA_TENDER" | "ERFA_TENDER" | "PRACTICE_SQUAD";

/** ADR-085 K2: how a contract ended before it ran out, or that it ran out. */
export type ContractEndReason = "RELEASED" | "TRADED" | "EXPIRED" | "VOIDED" | "RETIRED";

export interface PlayerContract {
  player: PlayerId;
  team: TeamId;
  years: ContractYear[];
  signedAt: CalendarStamp;
  /** ADR-085 K2. Absent in contracts written before it. */
  kind?: ContractKind;
  /** ADR-085 K2: the whole signing bonus, paid at signing, spread on the cap over at most five years. */
  signingBonus?: number;
  /** ADR-085 K2: a first-round rookie's fifth-year team option. */
  fifthYearOption?: { season: number; price: number; exercised?: boolean };
  /** ADR-085 K2: set once the contract is over. A post-June-1 release splits its dead money over two seasons. */
  ended?: { at: CalendarStamp; reason: ContractEndReason; postJune1?: boolean };
}

export type { AttrId, CoachAttrId };
