/**
 * WHICH RATINGS A POSITION IS GOOD AT (ADR-079 R2).
 *
 * Ratings are ABSOLUTE (ADR-079 Q3): one scale for every position, so a guard's catching and a
 * corner's run blocking are as poor as they would be on a field, and a lineman lined up as a
 * goal-line tight end keeps his own hands and feet. Every player therefore carries every active
 * rating; a rating a position does not use is generated low, never left absent (an absent rating
 * reads as `getAttr`'s fallback 50, an average player at everything).
 *
 * Each position sorts the skill ratings into three tiers:
 *   - core: what the position is built around. Most of the player's talent shows here.
 *   - secondary: what the position does some of the time.
 *   - everything else: rarely asked for, generated low.
 * Physical ratings (speed, strength, agility, jumping, acceleration) are not in a tier: they come
 * from the player's measurements (`derive.ts`), which already differ by position.
 */
import type { Position } from "@ff/contracts";

export interface Tier {
  /** League-wide mean of the rating among players for whom it is in this tier. */
  readonly mean: number;
  readonly sd: number;
  /** How strongly the player's overall talent shows in the rating, 0..1. */
  readonly load: number;
}

/**
 * Calibrated so that a typical starter sits in the mid 60s at his core ratings (close to the
 * flat 60 the simulator is tuned on) and a 90 is roughly a top-five player league-wide at that
 * rating (ADR-079 Q4; match-engine.md Appendix A).
 */
export const TIERS = {
  core: { mean: 60, sd: 13, load: 0.8 },
  secondary: { mean: 45, sd: 12, load: 0.5 },
  rest: { mean: 22, sd: 8, load: 0.2 },
} as const satisfies Record<string, Tier>;

export interface Profile {
  readonly core: readonly string[];
  readonly secondary: readonly string[];
  /** The physical ratings the position's overall leans on, for the depth chart. */
  readonly keyPhysical: readonly string[];
}

const QB: Profile = {
  core: ["accuracy", "decisionMaking", "footballIQ", "armStrength", "touch", "pocketPatience", "poise", "release"],
  secondary: ["improvisation", "ballSecurity", "elusiveness"],
  keyPhysical: [],
};
const RB: Profile = {
  core: ["vision", "elusiveness", "ballSecurity", "patience", "power", "yac"],
  secondary: ["catching", "routeRunning", "passBlock", "catchInTraffic", "runBlock"],
  keyPhysical: ["speed", "acceleration", "agility"],
};
const FB: Profile = {
  core: ["runBlock", "passBlock", "sustain", "power"],
  secondary: ["catching", "vision", "ballSecurity", "yac", "routeRunning"],
  keyPhysical: ["strength"],
};
const WR: Profile = {
  core: ["routeRunning", "releaseWR", "catching", "catchInTraffic", "spectacularCatch", "yac"],
  secondary: ["elusiveness", "ballSecurity", "ballSkills", "runBlock"],
  keyPhysical: ["speed", "acceleration", "jumping"],
};
const TE: Profile = {
  core: ["catching", "routeRunning", "runBlock", "passBlock", "sustain"],
  secondary: ["releaseWR", "catchInTraffic", "spectacularCatch", "yac", "ballSkills", "ballSecurity", "elusiveness"],
  keyPhysical: ["speed", "strength"],
};
const OL: Profile = {
  core: ["passBlock", "runBlock", "anchor", "footwork", "sustain"],
  secondary: ["pullSkill", "gapDiscipline"],
  keyPhysical: ["strength"],
};
const GUARD: Profile = { ...OL, core: [...OL.core, "pullSkill"], secondary: ["gapDiscipline"] };
const EDGE: Profile = {
  core: ["passRush", "powerMove", "finesseMove", "firstStep", "blockShed", "runStuff"],
  secondary: ["tackling", "pursuit", "gapDiscipline", "playRecognition"],
  keyPhysical: ["speed", "strength"],
};
const INTERIOR: Profile = {
  core: ["runStuff", "blockShed", "powerMove", "passRush", "gapDiscipline"],
  secondary: ["firstStep", "finesseMove", "tackling", "pursuit"],
  keyPhysical: ["strength"],
};
const OUTSIDE_LB: Profile = {
  core: ["passRush", "tackling", "pursuit", "playRecognition", "blockShed"],
  secondary: ["zoneCoverage", "manCoverage", "instincts", "firstStep", "finesseMove", "powerMove", "runStuff", "gapDiscipline"],
  keyPhysical: ["speed"],
};
const INSIDE_LB: Profile = {
  core: ["tackling", "playRecognition", "instincts", "pursuit", "zoneCoverage", "runStuff", "blockShed", "gapDiscipline"],
  secondary: ["manCoverage", "passRush", "ballSkills"],
  keyPhysical: ["speed"],
};
const CB: Profile = {
  core: ["manCoverage", "zoneCoverage", "press", "ballSkills", "playRecognition"],
  secondary: ["instincts", "tackling", "pursuit", "catching"],
  keyPhysical: ["speed", "agility"],
};
const FS: Profile = {
  core: ["zoneCoverage", "playRecognition", "instincts", "ballSkills", "pursuit", "tackling"],
  secondary: ["manCoverage", "press", "catching"],
  keyPhysical: ["speed"],
};
const SS: Profile = {
  core: ["tackling", "zoneCoverage", "playRecognition", "instincts", "pursuit", "runStuff"],
  secondary: ["manCoverage", "ballSkills", "press", "blockShed"],
  keyPhysical: ["speed", "strength"],
};
const K: Profile = { core: ["kickPower", "kickAccuracy"], secondary: ["puntPower", "puntHangTime"], keyPhysical: [] };
const P: Profile = { core: ["puntPower", "puntHangTime"], secondary: ["kickPower", "kickAccuracy"], keyPhysical: [] };
// There is no snapping rating; a long snapper is a blocker who covers punts.
const LS: Profile = { core: ["passBlock", "sustain"], secondary: ["tackling", "pursuit", "runBlock"], keyPhysical: [] };

export const PROFILES: Readonly<Record<Position, Profile>> = {
  QB, RB, FB, WR, TE,
  LT: OL, LG: GUARD, C: OL, RG: GUARD, RT: OL,
  DE: EDGE, DT: INTERIOR, NT: INTERIOR,
  OLB: OUTSIDE_LB, MLB: INSIDE_LB, ILB: INSIDE_LB,
  CB, FS, SS, K, P, LS,
};

/**
 * Ratings every player carries whatever his position, each with its own spread and its own
 * link to talent. `mobility` is the quarterback's running, derived from his feet in `derive.ts`.
 */
export const UNIVERSAL: Readonly<Record<string, Tier>> = {
  awareness: { mean: 55, sd: 12, load: 0.6 },
  reaction: { mean: 55, sd: 12, load: 0.5 },
  stamina: { mean: 65, sd: 10, load: 0.2 },
  durability: { mean: 65, sd: 12, load: 0 },
  discipline: { mean: 60, sd: 12, load: 0.3 },
  volatility: { mean: 50, sd: 15, load: 0 },
};

/** Physical ratings, derived from measurements rather than drawn from a tier. */
export const PHYSICAL = ["speed", "acceleration", "agility", "strength", "jumping", "mobility"] as const;
