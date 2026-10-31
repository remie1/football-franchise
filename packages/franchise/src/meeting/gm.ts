/**
 * ADR-081 M2: the GM and his report.
 *
 * Every team has a GM (G1), made once from the team's own dice and kept (hiring and firing GMs comes
 * later). On each of the nine points he rolls once: his skill for that point (the point's mix of his
 * skills, owner's Q4 table), the dice and the point's difficulty give a grade (Q5: sharp, close, off,
 * miss), and his claim is the truth pushed off by that grade. His personality type is his leaning
 * (Q4): it tilts which way his wrong reads go. His nuance sets how well his certainty matches being
 * right and how often he says it unasked (Q6, F5: a poor reader is usually too sure).
 *
 * All rates and sizes are CHOSEN (provenance NONE) and tuned at M5.
 */
import {
  createRng, staffId,
  type AccuracyGrade, type MeetingClaim, type MeetingPoint, type MeetingTake, type PersonalityType, type PlayerId,
  type Rng, type StaffState, type Team, type TeamDirection,
} from "@ff/contracts";
import { makeRatings, rating } from "../staff/ratings.js";
import { PERSONALITY_SHARES } from "../staff/tables.js";
import { clamp, normal, weightedPick } from "../staff/world.js";
import type { MeetingGroup } from "./strength.js";
import { weakestGroups } from "./projection.js";
import type { MeetingTruth } from "./truth.js";

export const GRADES: readonly AccuracyGrade[] = ["SHARP", "CLOSE", "OFF", "MISS"];

/** The nine points in meeting order. */
export const POINTS: readonly MeetingPoint[] = ["LUCK", "GOOD_AND_BAD", "HOLES", "DECLINE", "LOSSES", "NEXT_WINS", "GROWTH", "MONEY_CLIFF", "WINDOW"];

/** Owner's Q4 table: each point's mix of skills (talentEvaluation is "player judging"). */
export const POINT_MIX: Readonly<Record<MeetingPoint, Readonly<Record<string, number>>>> = {
  LUCK: { performanceAnalysis: 0.8, forecasting: 0.2 },
  GOOD_AND_BAD: { performanceAnalysis: 0.6, talentEvaluation: 0.4 },
  HOLES: { performanceAnalysis: 0.2, forecasting: 0.3, talentEvaluation: 0.5 },
  DECLINE: { forecasting: 0.6, talentEvaluation: 0.4 },
  LOSSES: { forecasting: 0.2, capManagement: 0.4, marketSense: 0.3, talentEvaluation: 0.1 },
  NEXT_WINS: { performanceAnalysis: 0.2, forecasting: 0.6, talentEvaluation: 0.2 },
  GROWTH: { forecasting: 0.5, talentEvaluation: 0.5 },
  MONEY_CLIFF: { forecasting: 0.2, capManagement: 0.5, marketSense: 0.3 },
  WINDOW: { performanceAnalysis: 0.2, forecasting: 0.4, capManagement: 0.2, marketSense: 0.2 },
};

/** ADR-081's difficulty column: easy 0, medium 0.5, hard 1, hardest 1.25. */
export const DIFFICULTY: Readonly<Record<MeetingPoint, number>> = {
  LUCK: 0, GOOD_AND_BAD: 0, HOLES: 0.5, DECLINE: 0.5, LOSSES: 0, NEXT_WINS: 1, GROWTH: 1, MONEY_CLIFF: 0.5, WINDOW: 1.25,
};

/** ADR-081's target rates (sharp, close, off, miss) at skill 25, 50 and 85, on an easy and a hard point. */
const ANCHORS: readonly { skill: number; easy: readonly number[]; hard: readonly number[] }[] = [
  { skill: 25, easy: [35, 30, 22, 13], hard: [12, 25, 33, 30] },
  { skill: 50, easy: [55, 28, 12, 5], hard: [25, 30, 28, 17] },
  { skill: 85, easy: [80, 15, 4, 1], hard: [45, 30, 17, 8] },
];

/** The four grade chances for a skill and difficulty: straight lines between the anchors, carried past them, floored at 1%. */
export function gradeOdds(skill: number, difficulty: number): number[] {
  const [lo, hi] = skill <= 50 ? [ANCHORS[0]!, ANCHORS[1]!] : [ANCHORS[1]!, ANCHORS[2]!];
  const f = (skill - lo.skill) / (hi.skill - lo.skill);
  const at = (a: (typeof ANCHORS)[number]) => a.easy.map((e, i) => e + difficulty * (a.hard[i]! - e));
  const a = at(lo), b = at(hi);
  const raw = a.map((x, i) => Math.max(1, x + f * (b[i]! - x)));
  const total = raw.reduce((s, x) => s + x, 0);
  return raw.map((x) => x / total);
}

export function rollGrade(skill: number, difficulty: number, rng: Rng): AccuracyGrade {
  const odds = gradeOdds(skill, difficulty);
  let x = rng.next();
  for (let i = 0; i < 4; i++) { x -= odds[i]!; if (x < 0) return GRADES[i]!; }
  return "MISS";
}

/** His skill for a point: the point's mix of his ratings. */
export function pointSkill(s: StaffState, point: MeetingPoint): number {
  return Object.entries(POINT_MIX[point]).reduce((t, [id, w]) => t + w * rating(s.attributes, id), 0);
}

/**
 * Q4 leanings, by personality type (CHOSEN): which way his wrong reads tilt.
 *  - demanding: hard grader; reads the team worse than it is.
 *  - playersCoach: trusts veterans; sees decline late.
 *  - cerebral: trusts the numbers; sees luck where there was none.
 *  - fiery: chases last season; takes a lucky year for skill and expects more of it.
 *  - quiet: loves youth; expects young players to grow faster than they do.
 */
export const LEANINGS: Readonly<Record<PersonalityType, string>> = {
  demanding: "HARD_GRADER", playersCoach: "TRUSTS_VETERANS", cerebral: "TRUSTS_NUMBERS", fiery: "CHASES_LAST_SEASON", quiet: "LOVES_YOUTH",
};

/** A team's GM, made from the team's own dice: average talent, the five personality types in the coaches' shares. */
export function makeGm(team: Team, seed: string): StaffState {
  const rng = createRng(seed, `franchise:meeting/gm/${String(team.id)}`);
  const id = staffId(`GM-${String(team.id)}`);
  return {
    id, displayName: `${team.city} GM`, role: "GM", age: 40 + rng.int(0, 20),
    attributes: makeRatings(rng, 0, String(id)),
    lineage: [], personalityType: weightedPick(rng, PERSONALITY_SHARES),
    teamId: team.id, career: [{ level: "NFL", role: "GM", team: team.id, employer: team.displayName, firstSeason: 0, seasons: [] }],
  };
}

/** How wrong a number may be at each grade, in the number's own units per `unit`. */
const BAND: Readonly<Record<AccuracyGrade, readonly [number, number]>> = {
  SHARP: [0, 0.5], CLOSE: [0.5, 1.5], OFF: [1.5, 3], MISS: [3, 5],
};
function pushed(truth: number, grade: AccuracyGrade, unit: number, rng: Rng, lean = 0): number {
  const [a, b] = BAND[grade];
  const size = (a + (b - a) * rng.next()) * unit;
  // A leaning sets the direction of a wrong read two times in three; otherwise a coin.
  const sign = grade !== "SHARP" && lean !== 0 && rng.next() < 2 / 3 ? Math.sign(lean) : rng.next() < 0.5 ? -1 : 1;
  return truth + sign * size;
}

/**
 * A ranked list read at a grade: sharp keeps it, close swaps one name for the next in line, off
 * keeps about half, a miss keeps at most one. `pool` is everyone the list could have named, truth first.
 */
function pushedList<T>(truth: readonly T[], pool: readonly T[], grade: AccuracyGrade, rng: Rng, size: number): T[] {
  const top = truth.slice(0, size);
  const keep = grade === "SHARP" ? top.length : grade === "CLOSE" ? Math.max(0, top.length - 1) : grade === "OFF" ? Math.floor(top.length / 2) : Math.min(1, Math.floor(top.length / 3));
  const others = pool.filter((x) => !top.includes(x));
  const kept = top.slice(0, keep);
  const want = Math.max(top.length, grade === "SHARP" ? 0 : 1);
  while (kept.length < want && others.length > 0) kept.push(others.splice(rng.int(0, Math.min(others.length, 4) - 1), 1)[0]!);
  return kept;
}

const ORDERED: readonly TeamDirection[] = ["REBUILD", "RETOOL", "CONTEND"];
const LUCK_ORDER: readonly string[] = ["UNLUCKY", "EVEN", "LUCKY"];
/** A three-step answer read at a grade: sharp and close keep it, off moves one step, a miss two where it can. */
function pushedOrdered<T>(order: readonly T[], truth: T, grade: AccuracyGrade, rng: Rng, lean: number): T {
  if (grade === "SHARP" || grade === "CLOSE") return truth;
  const i = order.indexOf(truth);
  const step = grade === "OFF" ? 1 : 2;
  const dir = lean !== 0 ? Math.sign(lean) : rng.next() < 0.5 ? -1 : 1;
  for (const d of [dir, -dir]) for (const k of [step, 1]) {
    const j = i + d * k;
    if (j >= 0 && j < order.length) return order[j]!;
  }
  return truth;
}

/** Q6/F5: how sure he says he is, 0-100. Nuance blends a fair certainty with the poor reader's habit of being too sure. */
export function certaintyOf(grade: AccuracyGrade, nuance: number, rng: Rng): number {
  const fair = { SHARP: 85, CLOSE: 70, OFF: 40, MISS: 25 }[grade] + 6 * normal(rng);
  const tooSure = 85 + 8 * normal(rng);
  const n = nuance / 100;
  return Math.round(clamp(n * fair + (1 - n) * tooSure, 5, 99));
}

/** Q6: the chance he states it unasked. */
export const volunteerChance = (nuance: number): number => 0.1 + 0.8 * (nuance / 100);

export interface GmReportInput {
  gm: StaffState;
  truth: MeetingTruth;
  seed: string;
}

/** The GM's nine takes. Every roll comes from the GM, team, season and point, so the meeting replays exactly. */
export function gmReport({ gm, truth, seed }: GmReportInput): MeetingTake[] {
  const lean = LEANINGS[gm.personalityType];
  const nuance = rating(gm.attributes, "nuance");
  const groupsNow = weakestGroups({ groups: truth.groupsNow }).reverse(); // strongest first
  const holesTruth = weakestGroups({ groups: truth.groupsNext });
  const starters = truth.projection.now.starters.map((s) => s.player.bio.id);
  return POINTS.map((point) => {
    const rng = createRng(seed, `franchise:meeting/${truth.season}/${String(truth.team)}/${String(gm.id)}/${point}`);
    const grade = rollGrade(pointSkill(gm, point), DIFFICULTY[point], rng);
    let claim: MeetingClaim;
    switch (point) {
      case "LUCK": {
        // Gap in wins; "chases last season" reads a lucky year as skill, "trusts the numbers" sees luck.
        const l = lean === "CHASES_LAST_SEASON" ? -Math.sign(truth.luck.gap || 1) : lean === "TRUSTS_NUMBERS" ? Math.sign(truth.luck.gap || 1) : 0;
        // Sharp and close keep the verdict; off moves it one step, a miss two (or one, from even).
        const verdict = pushedOrdered(LUCK_ORDER, truth.luck.verdict, grade, rng, l);
        const [lo, hi] = verdict === "LUCKY" ? [1.5, 6] : verdict === "UNLUCKY" ? [-6, -1.5] : [-1, 1];
        const gap = clamp(pushed(truth.luck.gap, grade, 1, rng, l), lo, hi);
        claim = { point, verdict, wins: Math.round(gap * 2) / 2 };
        break;
      }
      case "GOOD_AND_BAD": {
        const best = pushedList(groupsNow, groupsNow, grade, rng, 1);
        const worst = pushedList([...groupsNow].reverse(), [...groupsNow].reverse(), grade, rng, 1);
        claim = { point, groups: [...best, ...worst] as string[] };
        break;
      }
      case "HOLES":
        claim = { point, groups: pushedList<MeetingGroup>(holesTruth, holesTruth, grade, rng, 3) as string[] };
        break;
      case "DECLINE": {
        const pool = lean === "TRUSTS_VETERANS" ? starters.filter((id) => !truth.decline.includes(id)) : starters;
        claim = { point, players: pushedList<PlayerId>(truth.decline, [...truth.decline, ...pool], grade, rng, 3) };
        break;
      }
      case "LOSSES":
        claim = { point, players: pushedList<PlayerId>(truth.losses, truth.projection.expiring.map((p) => p.bio.id), grade, rng, 3) };
        break;
      case "NEXT_WINS": {
        const l = lean === "HARD_GRADER" ? -1 : lean === "CHASES_LAST_SEASON" ? Math.sign(truth.luck.gap) : 0;
        claim = { point, wins: Math.round(clamp(pushed(truth.winsNext, grade, 1.5, rng, l), 0, 17)) };
        break;
      }
      case "GROWTH": {
        const young = truth.projection.change.filter((c) => c.player.bio.age <= 25).map((c) => c.player.bio.id);
        const pool = lean === "LOVES_YOUTH" ? young : [...young, ...starters];
        claim = { point, players: pushedList<PlayerId>(truth.growth, [...truth.growth, ...pool], grade, rng, 3) };
        break;
      }
      case "MONEY_CLIFF":
        claim = { point, players: pushedList<PlayerId>(truth.cliff, truth.projection.expiringNext.map((p) => p.bio.id), grade, rng, 3) };
        break;
      case "WINDOW": {
        const l = lean === "HARD_GRADER" ? -1 : lean === "CHASES_LAST_SEASON" ? 1 : 0;
        claim = { point, direction: pushedOrdered(ORDERED, truth.window, grade, rng, l) };
        break;
      }
    }
    const certainty = certaintyOf(grade, nuance, rng);
    return { speaker: gm.id, claim, grade, certainty, volunteered: rng.next() < volunteerChance(nuance) };
  });
}
