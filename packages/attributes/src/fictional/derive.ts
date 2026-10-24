/**
 * MEASUREMENTS → PHYSICAL RATINGS (ADR-079 Q3; the scales are contracts' since ADR-087 P5).
 *
 * Physical ratings are pinned to a measurement on one scale for everyone, so a 4.45 forty is the
 * same speed rating at corner as at guard. The anchors are chosen so the league's fastest
 * corners touch 99 and its slowest linemen sit in the teens; the mapping is the same one the
 * real importer will use on real combine numbers, which is what lets it slot in later.
 */
import { agilityFromCone, clampRating, jumpingFromVertical, speedFromForty, strengthFrom } from "@ff/contracts";

export interface Measurements {
  readonly heightIn: number;
  readonly weightLb: number;
  readonly forty: number;
  readonly bench: number;
  readonly vertical: number;
  readonly cone: number;
}

/**
 * The physical ratings. `noise` supplies the two that are not a single measurement:
 * acceleration (mostly straight-line speed, partly change of direction) and a quarterback's
 * mobility (the same mix, weighted toward speed).
 */
export function physicalRatings(m: Measurements, noise: () => number): Record<string, number> {
  const speed = speedFromForty(m.forty);
  const agility = agilityFromCone(m.cone);
  return {
    speed,
    agility,
    jumping: jumpingFromVertical(m.vertical),
    strength: strengthFrom(m.bench, m.weightLb),
    acceleration: clampRating(0.7 * speed + 0.3 * agility + noise() * 4),
    mobility: clampRating(0.6 * speed + 0.4 * agility + noise() * 5),
  };
}
