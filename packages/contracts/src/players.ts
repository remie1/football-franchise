/** Player, staff, team, and contract shapes. Cap math lives in franchise. */
import type { PlayerId, TeamId, StaffId, Position, AttrId, CoachAttrId } from "./ids.js";
import type { AttributeMap, TraitSet } from "./registry.js";
import type { CalendarStamp } from "./calendar.js";

/** Ground truth. Only engine, attributes pipeline, and calibration consume this. */
export interface TrueAttributes {
  readonly kind: "true";
  values: AttributeMap;
  traits: TraitSet;
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
  draft: { year: number; round: number; pick: number } | "UDFA";
  appearance?: Appearance;
}

export interface Injury {
  kind: string;
  weeksRemaining: number;
  playable: boolean;
  inGamePenalty?: AttributeMap;
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
  teamId?: TeamId;
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
  deadMoney: number;
}

export interface Team {
  id: TeamId;
  displayName: string;
  city: string;
  roster: PlayerId[];
  staff: StaffId[];
  depthChart: Partial<Record<Position, PlayerId[]>>;
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
}

export interface PlayerContract {
  player: PlayerId;
  team: TeamId;
  years: ContractYear[];
  signedAt: CalendarStamp;
}

export type { AttrId, CoachAttrId };
