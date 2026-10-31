/**
 * ADR-080 §3-§5, §8.1: making a coach. Every draw comes from the `rng` passed in, so a coach is a
 * pure function of his seed label.
 */
import type { DefensiveDisguiseTendency, Rng, StaffJob, StaffRole, StaffState, Team } from "@ff/contracts";
import {
  FIRST_NAMES, LAST_NAMES, PERSONALITY_SHARES, SCHEMES_BY_SIDE, STAFF_TUNING, type Seat, type Side,
} from "./tables.js";
import { makeRatings } from "./ratings.js";
import { clamp, normal, staffIdFor, weightedPick } from "./world.js";

/** Where a new coach starts. */
export type Cohort =
  /** A seat holder when the made-up history begins. */
  | { kind: "SEAT"; seat: Seat; team: Team; season: number }
  | { kind: "PRESIDENT"; team: Team; season: number }
  /** A young NFL position coach (a seat not modelled in v1) on a league team's staff. */
  | { kind: "NFL_POSITION"; side: Side; team: Team; season: number; mentor?: StaffState }
  | { kind: "COLLEGE"; role: "HEAD_COACH" | "OC" | "DC"; side: Side; program: string; season: number };

const AGES: Readonly<Record<string, readonly [number, number]>> = {
  HEAD_COACH: [42, 60], OC: [36, 55], DC: [36, 55], STC: [36, 55],
  PRESIDENT: [48, 66], NFL_POSITION: [28, 40], COLLEGE_HEAD_COACH: [36, 56], COLLEGE_COORD: [30, 45],
};

/** A talent nudge by cohort (0 = an ordinary new coach). */
const TALENT: Readonly<Record<string, number>> = {
  HEAD_COACH: 0.5, OC: 0.3, DC: 0.3, STC: 0.3, PRESIDENT: 0, NFL_POSITION: 0,
  COLLEGE_HEAD_COACH: 0.2, COLLEGE_COORD: 0,
};

export function drawDisguise(rng: Rng): DefensiveDisguiseTendency {
  const t = STAFF_TUNING;
  let x = t.disguiseMean + t.disguiseSd * normal(rng);
  for (let i = 0; i < 20 && (x < t.disguiseMin || x > t.disguiseMax); i++) {
    x = t.disguiseMean + t.disguiseSd * normal(rng);
  }
  return { passSnapMaskShare: clamp(x, t.disguiseMin, t.disguiseMax) };
}

export function drawName(rng: Rng, taken: Set<string>): string {
  for (let i = 0; i < 50; i++) {
    const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
    if (!taken.has(name)) { taken.add(name); return name; }
  }
  // 115 × 134 names; reaching here means a very old league. Keep names unique anyway.
  let k = 2;
  const base = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  while (taken.has(`${base} ${k}`)) k++;
  taken.add(`${base} ${k}`);
  return `${base} ${k}`;
}

function headCoachSide(rng: Rng): Side {
  return weightedPick(rng, [["OFFENSE", 0.55], ["DEFENSE", 0.4], ["SPECIAL_TEAMS", 0.05]] as const);
}

/** Make coach number `n` (his id is `staffIdFor(n)`). */
export function makeCoach(rng: Rng, n: number, cohort: Cohort, taken: Set<string>): StaffState {
  const key = cohort.kind === "SEAT" ? cohort.seat
    : cohort.kind === "COLLEGE" ? (cohort.role === "HEAD_COACH" ? "COLLEGE_HEAD_COACH" : "COLLEGE_COORD")
    : cohort.kind;
  const [lo, hi] = AGES[key]!;
  const age = rng.int(lo, hi);
  // A president has no side and no scheme.
  const side: Side | undefined = cohort.kind === "SEAT"
    ? (cohort.seat === "HEAD_COACH" ? headCoachSide(rng) : cohort.seat === "OC" ? "OFFENSE" : cohort.seat === "DC" ? "DEFENSE" : "SPECIAL_TEAMS")
    : cohort.kind === "PRESIDENT" ? undefined
    : cohort.side;

  let role: StaffRole;
  let job: StaffJob;
  let teamId: Team["id"] | undefined;
  switch (cohort.kind) {
    case "SEAT":
      role = cohort.seat; teamId = cohort.team.id;
      job = { level: "NFL", role, team: cohort.team.id, employer: cohort.team.displayName, firstSeason: cohort.season, seasons: [] };
      break;
    case "PRESIDENT":
      role = "PRESIDENT"; teamId = cohort.team.id;
      job = { level: "NFL", role, team: cohort.team.id, employer: cohort.team.displayName, firstSeason: cohort.season, seasons: [] };
      break;
    case "NFL_POSITION":
      role = "POSITION_COACH";
      job = { level: "NFL", role, team: cohort.team.id, employer: cohort.team.displayName, firstSeason: cohort.season, seasons: [] };
      break;
    case "COLLEGE":
      role = cohort.role;
      job = { level: "COLLEGE", role, employer: cohort.program, firstSeason: cohort.season, seasons: [] };
      break;
  }

  const coach: StaffState = {
    id: staffIdFor(n),
    displayName: drawName(rng, taken),
    role,
    age,
    attributes: makeRatings(rng, TALENT[key]!, String(staffIdFor(n))),
    lineage: cohort.kind === "NFL_POSITION" && cohort.mentor ? [cohort.mentor.id] : [],
    personalityType: weightedPick(rng, PERSONALITY_SHARES),
    career: [job],
  };
  if (side !== undefined) coach.schemeFamily = rng.pick(SCHEMES_BY_SIDE[side]);
  if (teamId !== undefined) coach.teamId = teamId;
  if (side === "DEFENSE") coach.disguise = drawDisguise(rng);
  return coach;
}
