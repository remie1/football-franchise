/**
 * ADR-080 §7.2-§7.4: how a team judges a coaching candidate.
 *
 * Two stages. Reputation (the résumé read at face value, plus what insiders hear) decides who gets
 * an interview. The interview gives the evaluator a blurry read of every skill, the error shrinking
 * as his `talentEvaluation` rises; he reads the résumé correcting for the roster as far as that skill
 * allows; experience, roster fit and (for a coordinator) the head coach's tree add on top.
 *
 * The same report is what a human hiring screen would show (§7.6).
 */
import {
  createRng,
  type CoachingLevel, type PersonalityType, type PlayerState, type StaffId, type StaffRole, type StaffState,
  type Team, type WinLossTie,
} from "@ff/contracts";
import { SCHEMES, STAFF_TUNING, type Seat } from "./tables.js";
import { COACH_SKILLS, rating, seatScore, type CoachRatings } from "./ratings.js";
import { rosterFit } from "./style.js";
import { normal, winShare } from "./world.js";

/** Who is judging: a president (head coach jobs) or a head coach (coordinator jobs). */
export interface Evaluator {
  staff: StaffState;
  team: Team;
}

/** One season of the résumé as this evaluator reads it. */
export interface ResumeLine {
  season: number;
  level: CoachingLevel;
  role: StaffRole;
  employer: string;
  record: WinLossTie;
  rosterRank?: number;
  unitRank?: number;
  playoffs?: { wins: number; champion: boolean };
  /** How much the season counts for this seat: recency × level × relevance. */
  weight: number;
  /** Performance above what was expected, in win-share points, as this evaluator reads it. */
  value: number;
}

export interface CandidateReport {
  staff: StaffId;
  seat: Seat;
  name: string;
  age: number;
  personalityType: PersonalityType;
  schemeFamily?: string;
  /** The interview's read of each skill, and the size of its error (1 SD). */
  read: Record<string, number>;
  readError: number;
  /** The seat's skills, from the read. */
  seatRead: number;
  resume: { lines: ResumeLine[]; points: number };
  experience: number;
  /** Style match with the team's roster, -1..1 (0 with no roster). */
  fit: number;
  /** Worked under this head coach, or under the same mentor. */
  tree: boolean;
  agePenalty: number;
  /** Let go as an NFL head coach (head coach jobs only). */
  stigma: number;
  /** Head coach jobs: the lean toward offensive minds (and away from special teams), and the cost of never having run a unit. */
  sideLean: number;
  unproven: number;
  /** The total the evaluator ranks by, in rating points. */
  judgement: number;
}

/** The win share a roster of this rank should give, 1 = best (.700) to last (.300). */
export const rosterExpectation = (rank: number, teamCount: number): number =>
  0.7 - 0.4 * (rank - 1) / Math.max(1, teamCount - 1);

/** What the evaluator expected of a season: .500, moved toward the roster's level as far as he corrects. */
export function expectedShare(rosterRank: number | undefined, teamCount: number, correction: number): number {
  return rosterRank === undefined ? 0.5 : 0.5 + correction * (rosterExpectation(rosterRank, teamCount) - 0.5);
}

const RELEVANCE: Readonly<Record<Seat, Partial<Record<StaffRole, number>>>> = {
  HEAD_COACH: { HEAD_COACH: 1, OC: 0.8, DC: 0.8, STC: 0.3, POSITION_COACH: 0.1 },
  OC: { OC: 1, HEAD_COACH: 0.6, DC: 0.2, STC: 0.2, POSITION_COACH: 0.3 },
  DC: { DC: 1, HEAD_COACH: 0.6, OC: 0.2, STC: 0.2, POSITION_COACH: 0.3 },
  STC: { STC: 1, HEAD_COACH: 0.3, OC: 0.2, DC: 0.2, POSITION_COACH: 0.3 },
};

/**
 * Read a coach's résumé for a seat. `played` is the last season completed, `correction` (0..1) how
 * fully the reader adjusts for the roster. Returns the lines and their total in rating points,
 * shrunk toward average when the record is short.
 */
export function readResume(
  coach: StaffState, seat: Seat, played: number, correction: number, teamCount: number,
): { lines: ResumeLine[]; points: number } {
  const t = STAFF_TUNING;
  const lines: ResumeLine[] = [];
  let wv = 0;
  let w = 0;
  for (const job of coach.career) {
    const relevance = RELEVANCE[seat][job.role] ?? 0;
    if (relevance === 0) continue;
    const level = job.level === "NFL" ? 1 : t.resumeCollegeWeight;
    for (const s of job.seasons) {
      const ws = winShare(s.record);
      const pct = (r: number) => (r - 1) / Math.max(1, teamCount - 1);
      let value: number;
      if (job.role === "HEAD_COACH") {
        value = job.level === "NFL"
          ? ws - expectedShare(s.rosterRank, teamCount, correction)
            + 0.03 * (s.playoffs?.wins ?? 0) + (s.playoffs?.champion ? 0.05 : 0)
          : (ws - 0.5) * t.resumeCollegeValueScale;
      } else if (job.role === "OC" || job.role === "DC") {
        if (job.level === "NFL" && s.unitRank !== undefined) {
          const rosterTerm = s.rosterRank === undefined ? 0 : correction * (pct(s.rosterRank) - 0.5) * t.unitValueScale;
          value = (0.5 - pct(s.unitRank)) * t.unitValueScale + rosterTerm;
        } else {
          value = (ws - 0.5) * 0.5 * (job.level === "COLLEGE" ? t.resumeCollegeValueScale : 1);
        }
      } else if (job.role === "STC") {
        value = (ws - expectedShare(s.rosterRank, teamCount, correction)) * 0.3;
      } else {
        value = (ws - 0.5) * 0.2;
      }
      const weight = Math.pow(t.resumeRecency, Math.max(0, played - s.season)) * level * relevance;
      const line: ResumeLine = {
        season: s.season, level: job.level, role: job.role, employer: job.employer, record: s.record, weight, value,
      };
      if (s.rosterRank !== undefined) line.rosterRank = s.rosterRank;
      if (s.unitRank !== undefined) line.unitRank = s.unitRank;
      if (s.playoffs !== undefined) line.playoffs = s.playoffs;
      lines.push(line);
      wv += weight * value;
      w += weight;
    }
  }
  return { lines, points: t.resumeScale * wv / (w + t.resumeShrink) };
}

/** Rating points for years in the jobs that prepare a man for this seat (§7.3). */
export function experiencePoints(coach: StaffState, seat: Seat): number {
  const e = STAFF_TUNING.experience;
  let nflHc = 0, nflCoord = 0, collegeHc = 0, collegeCoord = 0, position = 0;
  for (const job of coach.career) {
    const n = job.seasons.length;
    if (job.level === "NFL") {
      if (job.role === "HEAD_COACH") nflHc += n;
      else if (job.role === "OC" || job.role === "DC" || job.role === "STC") nflCoord += n;
      else if (job.role === "POSITION_COACH") position += n;
    } else if (job.role === "HEAD_COACH") collegeHc += n;
    else collegeCoord += n;
  }
  const capped = (years: number, per: number, cap: number) => Math.min(cap, years * per);
  if (seat === "HEAD_COACH") {
    return capped(nflHc, e.hcPerYear, e.hcCap) + capped(nflCoord, e.nflCoordPerYear, e.nflCoordCap)
      + capped(collegeHc, e.collegeHcPerYear, e.collegeHcCap) + capped(position, e.positionPerYear, e.positionCap);
  }
  return capped(nflCoord + nflHc, e.nflCoordPerYear, e.nflCoordCap)
    + capped(collegeHc + collegeCoord, e.collegeHcPerYear, e.collegeHcCap)
    + capped(position, e.positionPerYear, e.positionCap);
}

/** Has held an NFL head or coordinator job, or run a college programme. */
export function hasRunSomething(c: StaffState): boolean {
  return c.career.some((j) => j.seasons.length > 0
    && (j.role === "HEAD_COACH" || (j.level === "NFL" && (j.role === "OC" || j.role === "DC" || j.role === "STC"))));
}

/** Worked under this head coach, under the same mentor, or was his mentor. */
export function inTree(candidate: StaffState, headCoach: StaffState): boolean {
  if (candidate.id === headCoach.id) return false;
  if (candidate.lineage.includes(headCoach.id) || headCoach.lineage.includes(candidate.id)) return true;
  return candidate.lineage.some((m) => headCoach.lineage.includes(m));
}

/**
 * The stigma of having been let go as an NFL head coach, in head coach searches: heavier for a few
 * seasons after, lighter later. 0 for other seats and for coaches never let go.
 */
export function firedStigma(coach: StaffState, seat: Seat, played: number): number {
  if (seat !== "HEAD_COACH") return 0;
  const t = STAFF_TUNING;
  const last = [...coach.career].reverse().find((j) => j.level === "NFL" && j.role === "HEAD_COACH");
  if (!last || last.lastSeason === undefined || (last.ended !== "FIRED" && last.ended !== "CONTRACT_EXPIRED")) return 0;
  return played - last.lastSeason < t.firedHcStigmaYears ? t.firedHcStigmaRecent : t.firedHcStigmaLater;
}

/** Head coach searches: the lean toward offensive minds and away from special teams coaches (§7.4). */
export function sideLean(coach: StaffState, seat: Seat): number {
  const side = coach.schemeFamily === undefined ? undefined : SCHEMES[coach.schemeFamily]?.side;
  return seat === "HEAD_COACH" && side !== undefined ? STAFF_TUNING.hcSideLean[side] : 0;
}

/**
 * Head coach searches: the cost of never having run a unit or a programme, and a smaller one for
 * having run them only in college, where it is hard to tell what carries over (§7.4).
 */
export function unprovenPenalty(coach: StaffState, seat: Seat): number {
  if (seat !== "HEAD_COACH") return 0;
  if (!hasRunSomething(coach)) return STAFF_TUNING.hcUnprovenPenalty;
  const ranNflUnit = coach.career.some((j) => j.level === "NFL" && j.seasons.length > 0
    && (j.role === "HEAD_COACH" || j.role === "OC" || j.role === "DC" || j.role === "STC"));
  return ranNflUnit ? 0 : STAFF_TUNING.hcCollegeOnlyPenalty;
}

/**
 * Public standing for a seat: the résumé at face value, experience, what insiders hear, and the
 * same leanings and stigma the evaluators hold.
 */
export function reputation(coach: StaffState, seat: Seat, played: number, teamCount: number, seed: string): number {
  const t = STAFF_TUNING;
  const buzz = t.buzzWeight * (seatScore(coach.attributes, seat) - 50)
    + t.buzzNoiseSd * normal(createRng(seed, `franchise:staff/buzz/${played}/${String(coach.id)}`));
  return readResume(coach, seat, played, t.publicRosterCorrection, teamCount).points + experiencePoints(coach, seat)
    + buzz + sideLean(coach, seat) - unprovenPenalty(coach, seat) - firedStigma(coach, seat, played);
}

export interface ReportInput {
  candidate: StaffState;
  seat: Seat;
  evaluator: Evaluator;
  /** The team's head coach, for the tree (coordinator jobs). */
  headCoach?: StaffState;
  played: number;
  teamCount: number;
  players: ReadonlyMap<string, PlayerState>;
  seed: string;
}

/** What the evaluator makes of one candidate for one seat. */
export function candidateReport(input: ReportInput): CandidateReport {
  const t = STAFF_TUNING;
  const { candidate: c, seat, evaluator, played } = input;
  const skill = rating(evaluator.staff.attributes, "talentEvaluation");
  const readError = t.interviewErrorMin + t.interviewErrorSpan * (1 - skill / 100);
  const read: CoachRatings = {};
  const out: Record<string, number> = {};
  for (const id of COACH_SKILLS) {
    const rng = createRng(input.seed, `franchise:staff/interview/${played}/${String(evaluator.team.id)}/${String(c.id)}/${id}`);
    const v = Math.round(rating(c.attributes, id) + readError * normal(rng));
    read[id] = v;
    out[id] = v;
  }
  const seatRead = seatScore(read, seat);
  const resume = readResume(c, seat, played, skill / 100, input.teamCount);
  const experience = experiencePoints(c, seat);
  const fit = rosterFit(c.personalityType, evaluator.team, input.players);
  const tree = seat !== "HEAD_COACH" && input.headCoach !== undefined && inTree(c, input.headCoach);
  const ageFrom = seat === "HEAD_COACH" ? t.hcAgeFrom : t.coordAgeFrom;
  const agePenalty = Math.max(0, c.age - ageFrom) * t.agePenaltyPerYear;
  const stigma = firedStigma(c, seat, played);
  const lean = sideLean(c, seat);
  const unproven = unprovenPenalty(c, seat);
  const judgement = seatRead + resume.points + experience + t.fitPoints * fit + (tree ? t.treeBonus : 0) + lean
    - agePenalty - stigma - unproven;
  const report: CandidateReport = {
    staff: c.id, seat, name: c.displayName, age: c.age, personalityType: c.personalityType,
    read: out, readError, seatRead, resume, experience, fit, tree, agePenalty, stigma, sideLean: lean, unproven, judgement,
  };
  if (c.schemeFamily !== undefined) report.schemeFamily = c.schemeFamily;
  return report;
}
