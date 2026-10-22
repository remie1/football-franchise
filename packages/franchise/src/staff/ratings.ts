/**
 * ADR-080 §4: coach ratings. All 19 coach skills, 1-99, one ruler for every coach (owner, Q2).
 */
import { COACH_ATTRIBUTE_REGISTRY_V1, type Rng } from "@ff/contracts";
import { SEAT_WEIGHTS, STAFF_TUNING, type Seat } from "./tables.js";
import { clamp, normal } from "./world.js";

/** The coach skill ids, in registry order. */
export const COACH_SKILLS: readonly string[] = Object.keys(COACH_ATTRIBUTE_REGISTRY_V1);

export type CoachRatings = Partial<Record<string, number>>;

/**
 * A new coach's sheet: a shared talent level and a skill-by-skill spread, so most coaches are strong
 * in a few skills and plain in the rest. `talent` shifts a cohort in standard deviations (0 = an
 * ordinary new coach).
 */
export function makeRatings(rng: Rng, talent = 0): CoachRatings {
  const t = STAFF_TUNING;
  const g = talent + normal(rng);
  const out: CoachRatings = {};
  for (const id of COACH_SKILLS) {
    out[id] = clamp(Math.round(t.ratingBase + t.ratingTalentSd * g + t.ratingSpreadSd * normal(rng)), 1, 99);
  }
  return out;
}

export const rating = (r: CoachRatings, id: string): number => r[id] ?? 50;

/** How good he is for a seat: the seat's weighted skills (ADR-080 §4 table). */
export function seatScore(r: CoachRatings, seat: Seat): number {
  let s = 0;
  for (const [id, w] of Object.entries(SEAT_WEIGHTS[seat])) s += w * rating(r, id);
  return s;
}

/** The average of all his skills: the anchor ADR-080 §4 holds at 50 for sitting coordinators. */
export function averageSkill(r: CoachRatings): number {
  return COACH_SKILLS.reduce((s, id) => s + rating(r, id), 0) / COACH_SKILLS.length;
}
