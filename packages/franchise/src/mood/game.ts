/**
 * ADR-096 §3.1 (1)-(4): what one game says about a team. Pure.
 *
 * Expected points come from the two teams' strengths (ADR-081's `teamStrength`: points of margin a
 * game, MEASURED through the engine) and the league's scoring so far: a team is expected to score
 * the league's points a game, plus its offense's edge over the league's average offense, less the
 * other side's defense's edge over the league's average defense. The two expectations' gap is the
 * expected margin.
 */
import type { GameResult, TeamId } from "@ff/contracts";
import type { TeamStrength } from "../meeting/strength.js";
import { MOOD } from "./rates.js";

export interface LeagueBase {
  /** Points a team scores in a game, the league's mean so far this season. */
  points: number;
  /** The league's mean offense and defense strength (points of margin). */
  offense: number;
  defense: number;
}

export interface GameRead {
  team: TeamId;
  opponent: TeamId;
  pointsFor: number;
  pointsAgainst: number;
  expectedFor: number;
  expectedAgainst: number;
  /** §3.1 (1)-(3), -1..1: the team's surprise with how it happened and the streak. */
  s: number;
  /** §3.1 (4): the offense's and the defense's shares, -1..1. */
  offense: number;
  defense: number;
  causes: string[];
}

const sign = (x: number): number => (x > 0 ? 1 : x < 0 ? -1 : 0);
const clamp1 = (x: number): number => Math.max(-1, Math.min(1, x));

/** Points a side is expected to score against the other. */
export function expectedPoints(side: TeamStrength, other: TeamStrength, base: LeagueBase, home: boolean): number {
  return base.points + (side.units.OFFENSE - base.offense) - (other.units.DEFENSE - base.defense) + (home ? MOOD.homeEdge / 2 : -MOOD.homeEdge / 2);
}

/**
 * One team's read of a game. `streak` is its streak after the game, counting this one: positive for
 * wins, negative for losses, 0 after a tie.
 */
export function readGame(
  result: GameResult, team: TeamId, strengths: { own: TeamStrength; other: TeamStrength }, base: LeagueBase, streak: number,
): GameRead {
  const home = String(result.home) === String(team);
  const opponent = home ? result.away : result.home;
  const pointsFor = home ? result.homeScore : result.awayScore;
  const pointsAgainst = home ? result.awayScore : result.homeScore;
  const expectedFor = expectedPoints(strengths.own, strengths.other, base, home);
  const expectedAgainst = expectedPoints(strengths.other, strengths.own, base, !home);
  const margin = pointsFor - pointsAgainst;
  const expectedMargin = expectedFor - expectedAgainst;
  const causes: string[] = [];
  let s = Math.tanh((margin - expectedMargin) / MOOD.surpriseScale);
  const side = sign(margin);
  const favored = expectedMargin >= 0;
  if (side === 0) causes.push("TIE");
  else if (side < 0) causes.push(favored ? "LOSS_TO_WORSE_TEAM" : "LOSS_TO_BETTER_TEAM");
  else causes.push(favored ? "WIN_OVER_WORSE_TEAM" : "WIN_OVER_BETTER_TEAM");

  // §3.1 (2): how it happened, each toward the result's side.
  let how = 0;
  const bump = (cause: string, toward: number) => { how += MOOD.howStep * toward; causes.push(cause); };
  if (Math.abs(margin) >= MOOD.blowout) bump(side > 0 ? "BLOWOUT_WIN" : "BLOWOUT_LOSS", side);
  const periods = result.periods ?? [];
  let ownRun = 0, otherRun = 0, bestLead = 0, worstLead = 0, afterThree: number | undefined;
  periods.forEach((p, i) => {
    ownRun += home ? p.home : p.away;
    otherRun += home ? p.away : p.home;
    if (i < periods.length - 1) { bestLead = Math.max(bestLead, ownRun - otherRun); worstLead = Math.min(worstLead, ownRun - otherRun); }
    if (p.period === 3) afterThree = ownRun - otherRun;
  });
  if (side < 0 && bestLead >= MOOD.blownLead) bump("BLOWN_LEAD", -1);
  if (side > 0 && -worstLead >= MOOD.blownLead) bump("COMEBACK", 1);
  const overtime = periods.some((p) => p.period > 4);
  const late = side !== 0 && (overtime || (afterThree !== undefined && Math.abs(margin) <= MOOD.lateMargin && sign(afterThree) !== side));
  if (late) bump(side > 0 ? "WON_LATE" : "LOST_LATE", side);
  if (home && side < 0) bump("HOME_LOSS", -1);
  s += sign(how) * Math.min(MOOD.howCap, Math.abs(how));

  // §3.1 (3): streaks.
  const length = Math.abs(streak);
  if (length >= MOOD.streakFrom) {
    s += sign(streak) * MOOD.streakStep * (length - MOOD.streakFrom + 1);
    causes.push(`${streak > 0 ? "WINNING" : "LOSING"}_STREAK_${length}`);
  }

  // §3.1 (4): the units' shares.
  const offense = Math.tanh((pointsFor - expectedFor) / MOOD.unitScale);
  const defense = Math.tanh((expectedAgainst - pointsAgainst) / MOOD.unitScale);
  return { team, opponent, pointsFor, pointsAgainst, expectedFor, expectedAgainst, s: clamp1(s), offense, defense, causes };
}
