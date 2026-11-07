/**
 * ADR-094 §8 (step 2): general managers are hired and fired.
 *
 * The pieces the carousel (`offseason.ts`) uses for the GM seat: the front-office ladder (a scouting
 * director and a cap manager on every team, the men most new GMs come from), the president's verdict
 * on his GM over the GM's whole tenure, the chance he fires him, the candidates' sources and the
 * president's blurry read of them.
 *
 * Provenance: the hire mix (about 78% front office, 14% former GMs, 5-6% coaches, the rest from
 * outside) and the target of about 4 new GMs a year are COUNTED (ADR-094 Appendix A, 36 new GMs over
 * 2018-2026). Every rate, weight and size below is CHOSEN and tuned against those counts with
 * `staff-check --gms`.
 */
import { createRng, staffId, type PersonalityType, type Rng, type StaffId, type StaffJob, type StaffRole, type StaffState, type Team } from "@ff/contracts";
import { makeRatings, rating, type CoachRatings } from "./ratings.js";
import { PERSONALITY_SHARES } from "./tables.js";
import { drawName } from "./makeCoach.js";
import { expectedShare } from "./evaluate.js";
import { clamp, currentJob, isRetired, logistic, normal, seasonsOutOfWork, weightedPick, winShare } from "./world.js";

/** The two front-office jobs under the GM, one of each on every team. */
export const LADDER_ROLES = ["SCOUTING_DIRECTOR", "CAP_MANAGER"] as const;
export type LadderRole = (typeof LADDER_ROLES)[number];

/** On the front-office track (never a coaching candidate): the GM, his ladder, the president. */
export const isFrontOfficeRole = (role: StaffRole): boolean =>
  role === "GM" || role === "PRESIDENT" || role === "SCOUTING_DIRECTOR" || role === "CAP_MANAGER";

/** Where a new GM came from (Appendix A's four kinds). */
export type GmSource = "FRONT_OFFICE" | "RETREAD" | "COACH" | "OUTSIDE";

export const GM_TUNING = {
  /** COUNTED shares of the 36 new GMs, 2018-2026: 28 front office, 5 former GMs, 2 head coaches, 1 from television. */
  sourceMix: [["FRONT_OFFICE", 28], ["RETREAD", 5], ["COACH", 2], ["OUTSIDE", 1]] as readonly (readonly [GmSource, number])[],
  /** The GM's skills for the job: the meeting's mix (ADR-081 Q4) plus the politics of the building. */
  weights: {
    talentEvaluation: 0.25, performanceAnalysis: 0.15, forecasting: 0.15, capManagement: 0.15,
    marketSense: 0.1, nuance: 0.1, politics: 0.1,
  } as Readonly<Record<string, number>>,
  ladderAges: [32, 50] as const,
  /** Ladder men are picked from the scouting and cap trades: a little above an ordinary new coach. */
  ladderTalent: 0.2,
  outsideAges: [40, 58] as const,

  // The president's verdict, over the whole tenure (§8: judged slower than a coach).
  /** Each season back counts this much less in his tenure's average. */
  tenureDecay: 0.75,
  fireBase: -2.1,
  fireShortfall: 10,
  playoffTrip: 1.2,
  perPlayoffWin: 0.5,
  /** Off the logit in his first, second, third and fourth seasons. */
  honeymoon: [3, 2, 1, 0.4] as readonly number[],
  politicsShield: 0.35,
  contractEndFactor: 1.2,

  // Hiring.
  /** A former GM is a candidate this many seasons out of work at most. */
  retreadYearsOut: 6,
  /** A former head coach is a GM candidate this many seasons out of work at most, and below this age. */
  coachYearsOut: 5,
  coachMaxAge: 64,
  /** The president's read of a candidate's GM skills: error (1 SD) = min + span x (1 - his talent evaluation / 100). */
  readErrorMin: 3,
  readErrorSpan: 12,
  /** Rating points per win-share point above what was expected, over a GM's earlier tenures. */
  resumeScale: 40,
  /** Rating points for a former head coach's record, a share of a GM's own. */
  coachResumeShare: 0.5,
  /** Rating points a year in the ladder, up to `experienceCap` years. */
  experiencePerYear: 0.5,
  experienceCap: 4,
  firedStigma: 2,
  ageFrom: 62,
  agePenaltyPerYear: 0.6,

  // Contracts (dollars); quality 0..1 from the judgement, as coaches' are.
  contractYears: [4, 5] as const,
  extensionYears: 3,
  salary: { floor: 1_500_000, span: 4_500_000 },
  /** A GM made before GMs were hired (ADR-081 G1) gets a contract with this many seasons left, drawn. */
  firstContractLeft: [1, 4] as const,
};

/** How good he is for the GM's chair. */
export function gmScore(r: CoachRatings): number {
  let s = 0;
  for (const [id, w] of Object.entries(GM_TUNING.weights)) s += w * rating(r, id);
  return s;
}

/** The ladder job he holds now, if any. */
export function ladderJob(s: StaffState): (StaffJob & { role: LadderRole }) | undefined {
  const job = currentJob(s);
  return job && job.level === "NFL" && (job.role === "SCOUTING_DIRECTOR" || job.role === "CAP_MANAGER")
    ? job as StaffJob & { role: LadderRole } : undefined;
}

/** The front-office ids, F00001 on, numbered apart from the coaches so a coach's id never moves. */
export const frontOfficeIdFor = (n: number): StaffId => staffId(`F${String(n + 1).padStart(5, "0")}`);
export const isFrontOfficeId = (id: StaffId): boolean => /^F\d+$/.test(String(id));
/** Coaches' ids are S00001 on (`staffIdFor`). */
export const isCoachId = (id: StaffId): boolean => /^S\d+$/.test(String(id));

/** A new ladder man on a team's front office. */
export function makeLadderMan(rng: Rng, n: number, role: LadderRole, team: Team, season: number, taken: Set<string>): StaffState {
  const t = GM_TUNING;
  const id = frontOfficeIdFor(n);
  return {
    id, displayName: drawName(rng, taken), role, age: rng.int(t.ladderAges[0], t.ladderAges[1]),
    attributes: makeRatings(rng, t.ladderTalent, String(id)), lineage: [],
    personalityType: weightedPick(rng, PERSONALITY_SHARES) as PersonalityType,
    career: [{ level: "NFL", role, team: team.id, employer: team.displayName, firstSeason: season, seasons: [] }],
  };
}

/** A man from outside the game (Appendix A: one came from television). No league job behind him. */
export function makeOutsider(rng: Rng, n: number, taken: Set<string>): StaffState {
  const t = GM_TUNING;
  const id = frontOfficeIdFor(n);
  return {
    id, displayName: drawName(rng, taken), role: "GM", age: rng.int(t.outsideAges[0], t.outsideAges[1]),
    attributes: makeRatings(rng, 0, String(id)), lineage: [],
    personalityType: weightedPick(rng, PERSONALITY_SHARES) as PersonalityType,
    career: [],
  };
}

export interface GmVerdict {
  /** His tenure's win share above what the president expected, recent seasons counting most. */
  perf: number;
  seasonsInJob: number;
  politics: number;
  playoffs?: { wins: number; champion: boolean };
}

/** The president's verdict on his GM from the seasons of the GM's tenure, the last one the season being judged. */
export function gmVerdict(
  seasons: readonly StaffJob["seasons"][number][],
  o: { played: number; teamCount: number; correction: number; politics: number; playoffs?: { wins: number; champion: boolean } },
): GmVerdict {
  const t = GM_TUNING;
  if (seasons.length === 0) throw new Error("staff: a GM's verdict needs at least one season");
  let wv = 0;
  let w = 0;
  for (const s of seasons) {
    const weight = Math.pow(t.tenureDecay, o.played - s.season);
    const value = winShare(s.record) - expectedShare(s.rosterRank, o.teamCount, o.correction)
      + 0.03 * (s.playoffs?.wins ?? 0) + (s.playoffs?.champion ? 0.1 : 0);
    wv += weight * value;
    w += weight;
  }
  return { perf: wv / w, seasonsInJob: seasons.length, politics: o.politics, ...(o.playoffs ? { playoffs: o.playoffs } : {}) };
}

/** The president's chance of firing his GM this offseason. A champion is never fired. */
export function gmFireChance(v: GmVerdict): number {
  const t = GM_TUNING;
  if (v.playoffs?.champion) return 0;
  const honeymoon = t.honeymoon[v.seasonsInJob - 1] ?? 0;
  const shield = t.politicsShield * (v.politics - 50) / 25;
  const playoffTerm = v.playoffs ? t.playoffTrip + t.perPlayoffWin * v.playoffs.wins : 0;
  return logistic(t.fireBase - t.fireShortfall * v.perf - honeymoon - shield - playoffTerm);
}

/** Which kind of candidate he is, as Appendix A counts them: any earlier GM job makes a retread. */
export function gmSourceOf(c: StaffState): GmSource {
  if (c.career.some((j) => j.level === "NFL" && j.role === "GM")) return "RETREAD";
  if (c.career.some((j) => j.level === "NFL" && (j.role === "SCOUTING_DIRECTOR" || j.role === "CAP_MANAGER"))) return "FRONT_OFFICE";
  if (c.career.some((j) => j.level === "NFL" && j.role === "HEAD_COACH")) return "COACH";
  return "OUTSIDE";
}

/** May he be offered a GM job this offseason? `played` is the season just finished. */
export function gmCandidate(s: StaffState, played: number): GmSource | undefined {
  const t = GM_TUNING;
  if (isRetired(s) || s.role === "PRESIDENT") return undefined;
  if (s.role === "GM" && s.teamId !== undefined) return undefined; // sitting GMs stay put
  if (ladderJob(s)) return "FRONT_OFFICE";
  if (currentJob(s)) return undefined; // a seated or college coach is not taken upstairs
  const source = gmSourceOf(s);
  const out = seasonsOutOfWork(s, played);
  if (source === "RETREAD") return out <= t.retreadYearsOut ? "RETREAD" : undefined;
  if (source === "COACH") return out <= t.coachYearsOut && s.age <= t.coachMaxAge ? "COACH" : undefined;
  return undefined;
}

export interface GmCandidateReport {
  staff: StaffId;
  name: string;
  age: number;
  personalityType: PersonalityType;
  source: GmSource;
  /** The president's read of his GM skills, and the size of its error (1 SD). */
  read: number;
  readError: number;
  /** His earlier GM (or head coach) tenures, as this president reads them, in rating points. */
  resume: number;
  experience: number;
  stigma: number;
  agePenalty: number;
  /** The total the president ranks by. */
  judgement: number;
}

/** What a president (or the user, on his team) makes of one GM candidate. */
export function gmCandidateReport(input: {
  candidate: StaffState; source: GmSource; evaluator: StaffState; team: Team; played: number; teamCount: number; seed: string;
}): GmCandidateReport {
  const t = GM_TUNING;
  const { candidate: c, played } = input;
  const skill = rating(input.evaluator.attributes, "talentEvaluation");
  const readError = t.readErrorMin + t.readErrorSpan * (1 - skill / 100);
  const rng = createRng(input.seed, `franchise:staff/gm-interview/${played}/${String(input.team.id)}/${String(c.id)}`);
  const read = gmScore(c.attributes) + readError * normal(rng);
  const correction = skill / 100;
  let resume = 0;
  for (const job of c.career) {
    if (job.level !== "NFL" || job.seasons.length === 0) continue;
    const share = job.role === "GM" ? 1 : job.role === "HEAD_COACH" ? t.coachResumeShare : 0;
    if (share === 0) continue;
    resume += share * t.resumeScale * gmVerdict(job.seasons, { played, teamCount: input.teamCount, correction, politics: 50 }).perf
      * Math.min(1, job.seasons.length / 3);
  }
  const ladderYears = c.career.filter((j) => j.role === "SCOUTING_DIRECTOR" || j.role === "CAP_MANAGER")
    .reduce((n, j) => n + j.seasons.length, 0);
  const experience = t.experiencePerYear * Math.min(t.experienceCap, ladderYears);
  const last = [...c.career].reverse().find((j) => j.role === "GM" && j.level === "NFL");
  const stigma = last?.ended === "FIRED" && last.lastSeason !== undefined && played - last.lastSeason <= 2 ? t.firedStigma : 0;
  const agePenalty = Math.max(0, c.age - t.ageFrom) * t.agePenaltyPerYear;
  return {
    staff: c.id, name: c.displayName, age: c.age, personalityType: c.personalityType, source: input.source,
    read: Math.round(read * 10) / 10, readError, resume, experience, stigma, agePenalty,
    judgement: read + resume + experience - stigma - agePenalty,
  };
}

/** Draw which kind of man a team hires this time, among the kinds it has candidates of (the counted mix). */
export function drawGmSource(rng: Rng, have: ReadonlySet<GmSource>): GmSource {
  const items = GM_TUNING.sourceMix.filter(([s]) => s === "OUTSIDE" || have.has(s));
  return weightedPick(rng, items);
}

/** A new GM's salary from the president's judgement (rating points), as coaches' are. */
export function gmSalary(judgement: number): number {
  const q = clamp((judgement - 45) / 30, 0, 1);
  return Math.round((GM_TUNING.salary.floor + GM_TUNING.salary.span * q) / 10_000) * 10_000;
}
