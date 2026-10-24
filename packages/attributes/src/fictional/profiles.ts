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
import { POSITION_PROFILES, type Position, type PositionProfile } from "@ff/contracts";

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

/**
 * Each position's core, secondary and key physical ratings are shared vocabulary since ADR-087 P5
 * (contracts' `POSITION_PROFILES`): the depth chart, draft boards and cut-down day read the same
 * profiles through `positionOverall`. Re-exported here under the generator's names.
 */
export type Profile = PositionProfile;
export const PROFILES: Readonly<Record<Position, Profile>> = POSITION_PROFILES;

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
