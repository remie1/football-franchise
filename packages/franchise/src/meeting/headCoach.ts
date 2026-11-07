/**
 * ADR-094 §7 (build step 4): the head coach in the end-of-season meeting.
 *
 * He speaks to next season's wins and the team's window, rolling with his own meeting skills as the
 * coordinators do (ADR-081's point mixes, difficulties and grades; his personality type tilts which
 * way a wrong read goes, as the GM's does). Each man's WINDOW read is then tilted by his working lean
 * (his win-now lean pushed by how short his leash is for next season): at 70 and up a borderline read
 * moves one step toward contend, at 30 and under one step toward rebuild. A read is borderline when one
 * win more (or fewer) next season and the season after would move the team's true window that way.
 * All numbers CHOSEN.
 */
import { createRng, type MeetingClaim, type MeetingPoint, type MeetingTake, type StaffState, type TeamDirection } from "@ff/contracts";
import { rating } from "../staff/ratings.js";
import { clamp } from "../staff/world.js";
import { certaintyOf, DIFFICULTY, LEANINGS, ORDERED, pointSkill, pushed, pushedOrdered, rollGrade, volunteerChance } from "./gm.js";
import { SEASON_GAMES, windowOf, type MeetingTruth } from "./truth.js";

export const MEETING_LEAN = {
  /** At or above this working lean a borderline WINDOW read moves one step toward contend. */
  contendFrom: 70,
  /** At or below this, one step toward rebuild. */
  rebuildTo: 30,
  /** How many wins away from the line a read counts as borderline. */
  borderlineWins: 1,
};

/** The points the head coach speaks to, in meeting order. */
export const HEAD_COACH_POINTS: readonly MeetingPoint[] = ["NEXT_WINS", "WINDOW"];

/** One step from `from` toward `to` on rebuild-retool-contend. */
function stepToward(from: TeamDirection, to: TeamDirection): TeamDirection {
  const i = ORDERED.indexOf(from), j = ORDERED.indexOf(to);
  return ORDERED[i + Math.sign(j - i)]!;
}

/** §7: a WINDOW read tilted by the man's working lean, where the team sits near a line. */
export function tiltWindow(read: TeamDirection, lean: number, truth: Pick<MeetingTruth, "winsNext" | "winsAfter">): TeamDirection {
  const t = MEETING_LEAN;
  const shifted = (d: number) => windowOf((truth.winsNext + d) / SEASON_GAMES, (truth.winsAfter + d) / SEASON_GAMES);
  const now = shifted(0);
  if (lean >= t.contendFrom && read !== "CONTEND" && ORDERED.indexOf(shifted(t.borderlineWins)) > ORDERED.indexOf(now)) return stepToward(read, "CONTEND");
  if (lean <= t.rebuildTo && read !== "REBUILD" && ORDERED.indexOf(shifted(-t.borderlineWins)) < ORDERED.indexOf(now)) return stepToward(read, "REBUILD");
  return read;
}

export interface HeadCoachReportInput {
  coach: StaffState;
  truth: MeetingTruth;
  seed: string;
  /** His working lean (ADR-094 §2). */
  lean: number;
}

/** The head coach's two takes. Every roll comes from him, the team, the season and the point. */
export function headCoachReport({ coach, truth, seed, lean }: HeadCoachReportInput): MeetingTake[] {
  const leaning = LEANINGS[coach.personalityType];
  const nuance = rating(coach.attributes, "nuance");
  return HEAD_COACH_POINTS.map((point) => {
    const rng = createRng(seed, `franchise:meeting/${truth.season}/${String(truth.team)}/${String(coach.id)}/${point}`);
    const grade = rollGrade(pointSkill(coach, point), DIFFICULTY[point], rng);
    let claim: MeetingClaim;
    if (point === "NEXT_WINS") {
      const l = leaning === "HARD_GRADER" ? -1 : leaning === "CHASES_LAST_SEASON" ? Math.sign(truth.luck.gap) : 0;
      claim = { point, wins: Math.round(clamp(pushed(truth.winsNext, grade, 1.5, rng, l), 0, SEASON_GAMES)) };
    } else {
      const l = leaning === "HARD_GRADER" ? -1 : leaning === "CHASES_LAST_SEASON" ? 1 : 0;
      claim = { point, direction: tiltWindow(pushedOrdered(ORDERED, truth.window, grade, rng, l), lean, truth) };
    }
    return { speaker: coach.id, claim, grade, certainty: certaintyOf(grade, nuance, rng), volunteered: rng.next() < volunteerChance(nuance) };
  });
}
