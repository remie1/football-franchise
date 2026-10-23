/**
 * MEASUREMENTS → PHYSICAL RATINGS (ADR-079 Q3).
 *
 * Physical ratings are pinned to a measurement on one scale for everyone, so a 4.45 forty is the
 * same speed rating at corner as at guard. The anchors are chosen so the league's fastest
 * corners touch 99 and its slowest linemen sit in the teens; the mapping is the same one the
 * real importer will use on real combine numbers, which is what lets it slot in later.
 */
export interface Measurements {
  readonly heightIn: number;
  readonly weightLb: number;
  readonly forty: number;
  readonly bench: number;
  readonly vertical: number;
  readonly cone: number;
}

/** Linear map of `x` from [`at0`, `at99`] onto the 0-99 scale (either direction), clamped. */
export function scale(x: number, at0: number, at99: number): number {
  return clampRating(((x - at0) / (at99 - at0)) * 99);
}

export function clampRating(v: number): number {
  return Math.max(0, Math.min(99, Math.round(v)));
}

/** 4.22 s is a 99; 5.60 s is a 0. */
export const speedFromForty = (forty: number): number => scale(forty, 5.6, 4.22);
/** 6.50 s is a 99; 8.10 s is a 0. */
export const agilityFromCone = (cone: number): number => scale(cone, 8.1, 6.5);
/** 44 in is a 99; 22 in is a 0. */
export const jumpingFromVertical = (vertical: number): number => scale(vertical, 22, 44);
/** Reps on the bench plus mass: a 315 lb lineman with 26 reps is ~75, a 200 lb receiver with 14 is ~42. */
export const strengthFrom = (bench: number, weightLb: number): number =>
  clampRating(20 + bench * 1.6 + (weightLb - 200) * 0.12);

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
