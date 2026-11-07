/**
 * ADR-094 §2 (owner's Q2 a): job pressure pushes a man toward win-now.
 *
 * His pressure (0..1) is his own chance of being fired as things stand. For a head coach, that is
 * the president's offseason formula (ADR-080 §6, `headCoachFireChance`) fed the season so far as if
 * it were the whole season: his win share to date, his roster's promise, the season before it and
 * the credit of earlier ones. In the last year of his contract it gains `CONTRACT_YEAR_PRESSURE`.
 * A GM's pressure comes with GM firing (ADR-094 §8, build step 2); until then the caller passes 0.
 *
 * His working lean is his lean pushed toward 100 by his pressure: two thirds of the way when he is
 * sure to be fired, next to nothing when his job is safe.
 *
 * Pure and dice-free. All numbers CHOSEN, tuned at ADR-094's many-season check.
 */
import type { StaffJob, StaffState, WinLossTie } from "@ff/contracts";
import { headCoachFireChance, headCoachVerdict } from "../staff/offseason.js";
import { rating } from "../staff/ratings.js";
import { currentJob } from "../staff/world.js";

/** Q2 a: how far toward all-in a man the president would surely fire goes. */
export const PRESSURE_PUSH = 2 / 3;

/** What the last year of his contract adds to his pressure. CHOSEN. */
export const CONTRACT_YEAR_PRESSURE = 0.15;

/** His working lean: his lean pushed toward 100 by his pressure (0..1). */
export function workingLean(lean: number, pressure: number): number {
  const p = Math.min(1, Math.max(0, pressure));
  return lean + (100 - lean) * PRESSURE_PUSH * p;
}

export interface SeasonSoFar {
  /** The season being played. */
  season: number;
  /** His team's record to date. */
  record: WinLossTie;
  /** His roster's rank this season (1 = best); absent when not known, read as average. */
  rosterRank?: number;
  teamCount: number;
  /** The president's talent evaluation, 0..100: how fully he adjusts for the roster. */
  presidentTalent: number;
  /** He is in the last year of his contract. */
  lastContractYear?: boolean;
}

/**
 * A head coach's pressure in midseason. Before his team has played, his pressure is the
 * offseason formula on an even record: nothing is known yet about this season, so it reads as average.
 */
export function headCoachPressure(coach: StaffState, now: SeasonSoFar): number {
  const job: StaffJob | undefined = currentJob(coach);
  if (!job) return 0;
  const games = now.record.wins + now.record.losses + now.record.ties;
  const record = games > 0 ? now.record : { wins: 1, losses: 1, ties: 0 };
  const done = job.seasons.filter((s) => s.season < now.season);
  const soFar = { season: now.season, record, ...(now.rosterRank !== undefined ? { rosterRank: now.rosterRank } : {}) };
  const verdict = headCoachVerdict([...done, soFar], {
    played: now.season, teamCount: now.teamCount, correction: now.presidentTalent / 100, politics: rating(coach.attributes, "politics"),
  });
  const chance = headCoachFireChance(verdict);
  return Math.min(1, chance + (now.lastContractYear ? CONTRACT_YEAR_PRESSURE : 0));
}
