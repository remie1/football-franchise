/**
 * ROLES — the reason this package exists.
 *
 * Contracts' play-call types name concrete `PlayerId`s. A CORPUS CANNOT. "Y Cross"
 * is not a play involving `p:hou:14`; it is a play involving whoever is the Z
 * receiver this snap. A card that names players is a fixture, and a corpus of
 * fixtures is exactly what `CALIBRATION-BACKLOG.md` entry 8 was caused by.
 *
 * So every card in this package is keyed by ROLE, and instantiation binds roles to
 * players against a real depth chart. The role vocabulary here is the whole seam.
 *
 * THE COHERENCE CHAIN ADR-006 ASKS FOR, EXPRESSED IN TYPES RATHER THAN COMMENTS:
 *
 *     personnel grouping  →  the exact five skill roles on the field
 *     formation           →  where each of those five aligns
 *     alignment           →  who is ELIGIBLE (the end-man-on-the-line rule)
 *     concept             →  routes, but only for eligible roles
 *
 * The first arrow is a mapped type, so `SkillRoleOf<"11">` is a closed union and a
 * 12-personnel card that names a `SLOT` is a COMPILE ERROR rather than a validator
 * finding (Charter §4.1: prefer a compile error to a convention). The second and
 * third arrows are runtime rules in `validate.ts`, because they are numeric.
 */
import type { PlayerId, Position } from "@ff/contracts";

// --- offence ----------------------------------------------------------------

/** The five up front. Always on the line, never eligible; tackle-eligible is not modelled. */
export type OffenseLineRole = "LT" | "LG" | "C" | "RG" | "RT";

export const OFFENSE_LINE_ROLES: readonly OffenseLineRole[] = ["LT", "LG", "C", "RG", "RT"];

/**
 * The five who are not the quarterback and not on the line.
 *
 * Named by JOB, not by position, because that is what a playbook says. `X` is the
 * split end, `Z` the flanker, `SLOT`/`SLOT2`/`SLOT3` inside receivers, `TE_Y` the
 * attached end, `TE_U`/`TE_H` the second and third tight ends, `RB`/`FB` the backs.
 */
export type OffenseSkillRole =
  | "RB"
  | "FB"
  | "X"
  | "Z"
  | "SLOT"
  | "SLOT2"
  | "SLOT3"
  | "TE_Y"
  | "TE_U"
  | "TE_H";

export type OffenseRole = "QB" | OffenseLineRole | OffenseSkillRole;

/**
 * NFL personnel notation: first digit backs, second digit tight ends, receivers
 * make up the rest. Every grouping below is exactly five skill roles, so with the
 * quarterback and five linemen it is eleven men by construction.
 *
 * These eight cover ~99% of real offensive snaps. `docs/decisions` distribution
 * note in `distribution.ts` states the frequencies and where they come from.
 */
export type OffensePersonnel = "00" | "10" | "11" | "12" | "13" | "20" | "21" | "22";

export const OFFENSE_PERSONNEL: readonly OffensePersonnel[] = [
  "00",
  "10",
  "11",
  "12",
  "13",
  "20",
  "21",
  "22",
];

/**
 * THE FIRST ARROW OF THE COHERENCE CHAIN, as a type.
 *
 * A personnel grouping does not *suggest* a set of roles, it IS one. Written as an
 * interface keyed by the grouping literal so `SkillRoleOf<P>` resolves to a closed
 * union at every call site.
 */
interface SkillRolesByPersonnel {
  /** Empty: five receivers, no back, no tight end. */
  "00": "X" | "Z" | "SLOT" | "SLOT2" | "SLOT3";
  /** One back, four receivers. */
  "10": "RB" | "X" | "Z" | "SLOT" | "SLOT2";
  /** One back, one tight end, three receivers. The league's default. */
  "11": "RB" | "X" | "Z" | "SLOT" | "TE_Y";
  /** One back, two tight ends, two receivers. */
  "12": "RB" | "X" | "Z" | "TE_Y" | "TE_U";
  /** One back, three tight ends, one receiver. */
  "13": "RB" | "X" | "TE_Y" | "TE_U" | "TE_H";
  /** Two backs, three receivers, no tight end. */
  "20": "RB" | "FB" | "X" | "Z" | "SLOT";
  /** Two backs, one tight end, two receivers. */
  "21": "RB" | "FB" | "X" | "Z" | "TE_Y";
  /** Two backs, two tight ends, one receiver. */
  "22": "RB" | "FB" | "X" | "TE_Y" | "TE_U";
}

export type SkillRoleOf<P extends OffensePersonnel> = SkillRolesByPersonnel[P];

export type OffenseRoleOf<P extends OffensePersonnel> = "QB" | OffenseLineRole | SkillRoleOf<P>;

/**
 * The runtime mirror of `SkillRolesByPersonnel`. Both exist because the type drives
 * authoring and the table drives instantiation, validation and any card that ever
 * arrives as JSON. The mapped type on the left makes them impossible to disagree:
 * add a grouping to the union and this object stops compiling.
 */
export const SKILL_ROLES: { readonly [P in OffensePersonnel]: readonly SkillRoleOf<P>[] } = {
  "00": ["X", "Z", "SLOT", "SLOT2", "SLOT3"],
  "10": ["RB", "X", "Z", "SLOT", "SLOT2"],
  "11": ["RB", "X", "Z", "SLOT", "TE_Y"],
  "12": ["RB", "X", "Z", "TE_Y", "TE_U"],
  "13": ["RB", "X", "TE_Y", "TE_U", "TE_H"],
  "20": ["RB", "FB", "X", "Z", "SLOT"],
  "21": ["RB", "FB", "X", "Z", "TE_Y"],
  "22": ["RB", "FB", "X", "TE_Y", "TE_U"],
};

/** Which depth-chart position fills a role. The only place role→position is decided. */
export const OFFENSE_ROLE_POSITION: Readonly<Record<OffenseRole, Position>> = {
  QB: "QB",
  LT: "LT",
  LG: "LG",
  C: "C",
  RG: "RG",
  RT: "RT",
  RB: "RB",
  FB: "FB",
  X: "WR",
  Z: "WR",
  SLOT: "WR",
  SLOT2: "WR",
  SLOT3: "WR",
  TE_Y: "TE",
  TE_U: "TE",
  TE_H: "TE",
};

/** Roles that live in the backfield by job description, whatever the formation says. */
export const BACK_ROLES: readonly OffenseSkillRole[] = ["RB", "FB"];

export const TIGHT_END_ROLES: readonly OffenseSkillRole[] = ["TE_Y", "TE_U", "TE_H"];

/**
 * A bound offensive personnel package: every role of grouping `P` mapped to a real
 * player. Total, so a missing role is a compile error at the construction site and
 * a loud throw at the depth-chart boundary — never an `undefined` that surfaces
 * three layers down as a play with ten men on it.
 */
export type OffensiveUnit<P extends OffensePersonnel> = {
  readonly [R in OffenseRoleOf<P>]: PlayerId;
};

/** Erased form, for code that handles any grouping. */
export type AnyOffensiveUnit = Readonly<Partial<Record<OffenseRole, PlayerId>>>;

// --- defence ----------------------------------------------------------------

export type DefenseLineRole = "DE_L" | "DT_L" | "NT" | "DT_R" | "DE_R";
export type DefenseBackerRole = "LB_W" | "LB_M" | "LB_S";
export type DefenseBackRole = "CB_L" | "CB_R" | "CB_N" | "CB_D" | "S_F" | "S_S";
export type DefenseRole = DefenseLineRole | DefenseBackerRole | DefenseBackRole;

/**
 * Defensive personnel by defensive-back count, which is how defensive coordinators
 * actually name it. Each is exactly eleven roles.
 */
export type DefensePersonnel = "BASE" | "NICKEL" | "DIME" | "GOAL_LINE";

export const DEFENSE_PERSONNEL: readonly DefensePersonnel[] = [
  "BASE",
  "NICKEL",
  "DIME",
  "GOAL_LINE",
];

interface DefenseRolesByPersonnel {
  /** 4-3: four down, three backers, four defensive backs. */
  BASE: "DE_L" | "DT_L" | "DT_R" | "DE_R" | "LB_W" | "LB_M" | "LB_S" | "CB_L" | "CB_R" | "S_F" | "S_S";
  /** 4-2-5. The league's default. */
  NICKEL: "DE_L" | "DT_L" | "DT_R" | "DE_R" | "LB_W" | "LB_M" | "CB_L" | "CB_R" | "CB_N" | "S_F" | "S_S";
  /** 4-1-6. */
  DIME: "DE_L" | "DT_L" | "DT_R" | "DE_R" | "LB_M" | "CB_L" | "CB_R" | "CB_N" | "CB_D" | "S_F" | "S_S";
  /** 5-3-3, for the two-yard line and fourth-and-one. */
  GOAL_LINE: "DE_L" | "DT_L" | "NT" | "DT_R" | "DE_R" | "LB_W" | "LB_M" | "LB_S" | "CB_L" | "CB_R" | "S_S";
}

export type DefenseRoleOf<G extends DefensePersonnel> = DefenseRolesByPersonnel[G];

export const DEFENSE_ROLES: { readonly [G in DefensePersonnel]: readonly DefenseRoleOf<G>[] } = {
  BASE: ["DE_L", "DT_L", "DT_R", "DE_R", "LB_W", "LB_M", "LB_S", "CB_L", "CB_R", "S_F", "S_S"],
  NICKEL: ["DE_L", "DT_L", "DT_R", "DE_R", "LB_W", "LB_M", "CB_L", "CB_R", "CB_N", "S_F", "S_S"],
  DIME: ["DE_L", "DT_L", "DT_R", "DE_R", "LB_M", "CB_L", "CB_R", "CB_N", "CB_D", "S_F", "S_S"],
  GOAL_LINE: ["DE_L", "DT_L", "NT", "DT_R", "DE_R", "LB_W", "LB_M", "LB_S", "CB_L", "CB_R", "S_S"],
};

export const DEFENSE_ROLE_POSITION: Readonly<Record<DefenseRole, Position>> = {
  DE_L: "DE",
  DT_L: "DT",
  NT: "NT",
  DT_R: "DT",
  DE_R: "DE",
  LB_W: "OLB",
  LB_M: "MLB",
  LB_S: "OLB",
  CB_L: "CB",
  CB_R: "CB",
  CB_N: "CB",
  CB_D: "CB",
  S_F: "FS",
  S_S: "SS",
};

export type DefensiveUnit<G extends DefensePersonnel> = {
  readonly [R in DefenseRoleOf<G>]: PlayerId;
};

export type AnyDefensiveUnit = Readonly<Partial<Record<DefenseRole, PlayerId>>>;

// --- the eleven-men invariant, checked once, here ---------------------------

export const PLAYERS_ON_THE_FIELD = 11;

/** Skill roles + five linemen + the quarterback. */
export const SKILL_ROLES_PER_PERSONNEL = PLAYERS_ON_THE_FIELD - OFFENSE_LINE_ROLES.length - 1;
