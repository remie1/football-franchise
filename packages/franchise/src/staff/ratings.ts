/**
 * ADR-080 §4: coach ratings. Every coach skill, 1-99, one ruler for every coach (owner, Q2).
 * ADR-081 G5 added five meeting skills; they are drawn from their own dice, so every coach keeps the
 * 19 ratings he had before them, and everything ADR-080 reads (seat scores, the average anchored at
 * 50, interview reads) still reads those 19.
 */
import { COACH_ATTRIBUTE_REGISTRY_V1, type Rng } from "@ff/contracts";
import { SEAT_WEIGHTS, STAFF_TUNING, type Seat } from "./tables.js";
import { clamp, normal } from "./world.js";

/** ADR-081 G5's meeting skills. */
export const MEETING_SKILLS: readonly string[] = ["performanceAnalysis", "forecasting", "capManagement", "marketSense", "nuance"];
/** ADR-080's 19 coach skills, in registry order (the meeting's five left out). */
export const COACH_SKILLS: readonly string[] = Object.keys(COACH_ATTRIBUTE_REGISTRY_V1).filter((id) => !MEETING_SKILLS.includes(id));

export type CoachRatings = Partial<Record<string, number>>;

/**
 * A new coach's sheet: a shared talent level and a skill-by-skill spread, so most coaches are strong
 * in a few skills and plain in the rest. `talent` shifts a cohort in standard deviations (0 = an
 * ordinary new coach).
 */
export function makeRatings(rng: Rng, talent = 0, key = ""): CoachRatings {
  const t = STAFF_TUNING;
  const g = talent + normal(rng);
  const out: CoachRatings = {};
  for (const id of COACH_SKILLS) {
    out[id] = clamp(Math.round(t.ratingBase + t.ratingTalentSd * g + t.ratingSpreadSd * normal(rng)), 1, 99);
  }
  // G5: the same talent level, the spread from the coach's own fork (`key` names him), so drawing
  // these takes nothing from the stream the rest of the league is made from.
  const own = rng.fork(`meeting-skills/${key}`);
  for (const id of MEETING_SKILLS) {
    out[id] = clamp(Math.round(t.ratingBase + t.ratingTalentSd * g + t.ratingSpreadSd * normal(own)), 1, 99);
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
