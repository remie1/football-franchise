/**
 * MEASUREMENT SCALES AND POSITION PROFILES (ADR-087 P5; contracts.md §10, amendment 1).
 *
 * ADR-079 pins every body rating to a measurement on one scale for everyone (Q3), so a 4.45 forty
 * is the same speed rating at corner as at guard, and gives each position the ratings it is built
 * around (R2). The made-up league's generator, the draft's class maker, the stand-in importer and
 * franchise (aging, the weekly depth chart, the draft's boards and cut-down day) all need the same
 * numbers, and a domain may import only contracts, so this is the one copy.
 *
 * This bends §10's rule that formulas stay out of contracts, on purpose and narrowly: these are the
 * owner's ruled anchors, they rarely change, and a change to any number here comes back to the owner
 * as a contracts edit. The tunable curves that use them (aging, injuries, growth) stay in franchise.
 * Data, plus small readers beside `getAttr`.
 */
import type { Position } from "./ids.js";
import { attrId } from "./ids.js";
import { ATTR_SCALE, getAttr, type AttributeMap } from "./registry.js";

/** A straight-line map from a measurement onto the rating scale: `at0` reads 0, `at99` reads 99. */
export interface MeasurementScale {
  readonly at0: number;
  readonly at99: number;
}

/**
 * The anchors (ADR-079 Q3). Speed from the 40 (4.22 s is a 99, 5.60 s a 0: about 0.72 points per
 * hundredth), agility from the 3-cone, jumping from the vertical. Strength is reps on the bench plus
 * mass: a 315 lb lineman with 26 reps is about 75, a 200 lb receiver with 14 about 42.
 */
export const MEASUREMENT_SCALES = {
  /** Seconds. */
  forty: { at0: 5.6, at99: 4.22 },
  /** Seconds. */
  cone: { at0: 8.1, at99: 6.5 },
  /** Inches. */
  vertical: { at0: 22, at99: 44 },
  /** `base + perRep * bench + perLb * (weightLb - refLb)`. */
  strength: { base: 20, perRep: 1.6, perLb: 0.12, refLb: 200 },
} as const;

/** Round and clamp onto the rating scale (0..99). */
export function clampRating(v: number): number {
  return Math.max(ATTR_SCALE.min, Math.min(ATTR_SCALE.max, Math.round(v)));
}

/** Where `x` falls on a scale, unrounded and unclamped: what a change in a measurement is worth. */
export function onScale(x: number, s: MeasurementScale): number {
  return ((x - s.at0) / (s.at99 - s.at0)) * 99;
}

/** Strength before rounding and clamping. */
export function strengthOnScale(bench: number, weightLb: number): number {
  const s = MEASUREMENT_SCALES.strength;
  return s.base + bench * s.perRep + (weightLb - s.refLb) * s.perLb;
}

export const speedFromForty = (forty: number): number => clampRating(onScale(forty, MEASUREMENT_SCALES.forty));
export const agilityFromCone = (cone: number): number => clampRating(onScale(cone, MEASUREMENT_SCALES.cone));
export const jumpingFromVertical = (vertical: number): number => clampRating(onScale(vertical, MEASUREMENT_SCALES.vertical));
export const strengthFrom = (bench: number, weightLb: number): number => clampRating(strengthOnScale(bench, weightLb));

/**
 * What a position is built around (ADR-079 R2). `core`: most of a player's talent shows here.
 * `secondary`: what the position does some of the time. Every other skill is rarely asked for.
 * `keyPhysical`: the body ratings the position's overall leans on. Rating ids are registry ids.
 */
export interface PositionProfile {
  readonly core: readonly string[];
  readonly secondary: readonly string[];
  readonly keyPhysical: readonly string[];
}

const QB: PositionProfile = {
  core: ["accuracy", "decisionMaking", "footballIQ", "armStrength", "touch", "pocketPatience", "poise", "release"],
  secondary: ["improvisation", "ballSecurity", "elusiveness"],
  keyPhysical: [],
};
const RB: PositionProfile = {
  core: ["vision", "elusiveness", "ballSecurity", "patience", "power", "yac"],
  secondary: ["catching", "routeRunning", "passBlock", "catchInTraffic", "runBlock"],
  keyPhysical: ["speed", "acceleration", "agility"],
};
const FB: PositionProfile = {
  core: ["runBlock", "passBlock", "sustain", "power"],
  secondary: ["catching", "vision", "ballSecurity", "yac", "routeRunning"],
  keyPhysical: ["strength"],
};
const WR: PositionProfile = {
  core: ["routeRunning", "releaseWR", "catching", "catchInTraffic", "spectacularCatch", "yac"],
  secondary: ["elusiveness", "ballSecurity", "ballSkills", "runBlock"],
  keyPhysical: ["speed", "acceleration", "jumping"],
};
const TE: PositionProfile = {
  core: ["catching", "routeRunning", "runBlock", "passBlock", "sustain"],
  secondary: ["releaseWR", "catchInTraffic", "spectacularCatch", "yac", "ballSkills", "ballSecurity", "elusiveness"],
  keyPhysical: ["speed", "strength"],
};
const OL: PositionProfile = {
  core: ["passBlock", "runBlock", "anchor", "footwork", "sustain"],
  secondary: ["pullSkill", "gapDiscipline"],
  keyPhysical: ["strength"],
};
const GUARD: PositionProfile = { ...OL, core: [...OL.core, "pullSkill"], secondary: ["gapDiscipline"] };
const EDGE: PositionProfile = {
  core: ["passRush", "powerMove", "finesseMove", "firstStep", "blockShed", "runStuff"],
  secondary: ["tackling", "pursuit", "gapDiscipline", "playRecognition"],
  keyPhysical: ["speed", "strength"],
};
const INTERIOR: PositionProfile = {
  core: ["runStuff", "blockShed", "powerMove", "passRush", "gapDiscipline"],
  secondary: ["firstStep", "finesseMove", "tackling", "pursuit"],
  keyPhysical: ["strength"],
};
const OUTSIDE_LB: PositionProfile = {
  core: ["passRush", "tackling", "pursuit", "playRecognition", "blockShed"],
  secondary: ["zoneCoverage", "manCoverage", "instincts", "firstStep", "finesseMove", "powerMove", "runStuff", "gapDiscipline"],
  keyPhysical: ["speed"],
};
const INSIDE_LB: PositionProfile = {
  core: ["tackling", "playRecognition", "instincts", "pursuit", "zoneCoverage", "runStuff", "blockShed", "gapDiscipline"],
  secondary: ["manCoverage", "passRush", "ballSkills"],
  keyPhysical: ["speed"],
};
const CB: PositionProfile = {
  core: ["manCoverage", "zoneCoverage", "press", "ballSkills", "playRecognition"],
  secondary: ["instincts", "tackling", "pursuit", "catching"],
  keyPhysical: ["speed", "agility"],
};
const FS: PositionProfile = {
  core: ["zoneCoverage", "playRecognition", "instincts", "ballSkills", "pursuit", "tackling"],
  secondary: ["manCoverage", "press", "catching"],
  keyPhysical: ["speed"],
};
const SS: PositionProfile = {
  core: ["tackling", "zoneCoverage", "playRecognition", "instincts", "pursuit", "runStuff"],
  secondary: ["manCoverage", "ballSkills", "press", "blockShed"],
  keyPhysical: ["speed", "strength"],
};
const K: PositionProfile = { core: ["kickPower", "kickAccuracy"], secondary: ["puntPower", "puntHangTime"], keyPhysical: [] };
const P: PositionProfile = { core: ["puntPower", "puntHangTime"], secondary: ["kickPower", "kickAccuracy"], keyPhysical: [] };
// There is no snapping rating; a long snapper is a blocker who covers punts.
const LS: PositionProfile = { core: ["passBlock", "sustain"], secondary: ["tackling", "pursuit", "runBlock"], keyPhysical: [] };

export const POSITION_PROFILES: Readonly<Record<Position, PositionProfile>> = {
  QB, RB, FB, WR, TE,
  LT: OL, LG: GUARD, C: OL, RG: GUARD, RT: OL,
  DE: EDGE, DT: INTERIOR, NT: INTERIOR,
  OLB: OUTSIDE_LB, MLB: INSIDE_LB, ILB: INSIDE_LB,
  CB, FS, SS, K, P, LS,
};

/**
 * How good a player is AT A POSITION (ADR-079 Q5): the mean of his core ratings, or, where the
 * position leans on its body, 0.7 of that plus 0.3 of the mean of its key physical ratings. For the
 * depth chart, draft boards and cut-down day; not a rating the sim reads. A missing rating reads 0.
 */
export function positionOverall(position: Position, ratings: AttributeMap): number {
  const profile = POSITION_PROFILES[position];
  const mean = (ids: readonly string[]) => ids.reduce((s, id) => s + getAttr(ratings, attrId(id), 0), 0) / ids.length;
  const core = mean(profile.core);
  return profile.keyPhysical.length === 0 ? core : 0.7 * core + 0.3 * mean(profile.keyPhysical);
}
