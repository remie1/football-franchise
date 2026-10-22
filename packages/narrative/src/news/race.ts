/**
 * THE PLAYOFF RACE, THE SIMPLE WAY (ADR-082 step 2; owner's Q5).
 *
 * "Certain on wins alone": a team's worst case is losing every game it has left, a rival's best
 * case is winning every game it has left, and a rival who could finish level or ahead is a threat
 * (a tie might break either way). Every rival is treated as able to win out, even rivals who
 * still play each other, so the check can only ever be late, never wrong. The real NFL, with its
 * full tiebreaks, sometimes announces a clinch a week sooner.
 */
import type { SeasonSchedule, TeamId } from "@ff/contracts";
import type { LeagueIndex } from "./league.js";
import { played, recordOf, recordText, type Records, type TeamRecord } from "./records.js";
import type { Candidate } from "./stories.js";

export interface RaceStatus {
  readonly clinchedDivision: boolean;
  readonly clinchedPlayoffs: boolean;
  readonly eliminated: boolean;
}

/** What has already been reported, so each team's clinch or elimination runs once. */
export type RaceMarks = Map<string, Set<"DIVISION" | "PLAYOFFS" | "OUT">>;

/** Regular-season games each team still has to play after `week`. */
export function gamesLeft(schedule: SeasonSchedule, week: number): Map<string, number> {
  const left = new Map<string, number>();
  for (const g of schedule.games) {
    if (g.kind !== "REGULAR" || g.at.week <= week) continue;
    for (const t of [g.home, g.away]) left.set(String(t), (left.get(String(t)) ?? 0) + 1);
  }
  return left;
}

const share = (wins: number, r: TeamRecord, left: number) => {
  const games = played(r) + left;
  return games === 0 ? 0 : wins / games;
};
/** Lose every game left. */
const worst = (r: TeamRecord, left: number) => share(r.wins + r.ties / 2, r, left);
/** Win every game left. */
const best = (r: TeamRecord, left: number) => share(r.wins + r.ties / 2 + left, r, left);

export interface RaceInput {
  readonly records: Records;
  readonly left: ReadonlyMap<string, number>;
  readonly league: LeagueIndex;
  /** Playoff teams per conference (LeagueRules; 7 by default). */
  readonly playoffTeams: number;
}

export function raceStatus(team: TeamId, input: RaceInput): RaceStatus {
  const { records, left, league } = input;
  const me = league.team(team);
  const rec = (t: TeamId) => recordOf(records, t);
  const lft = (t: TeamId) => left.get(String(t)) ?? 0;
  const divisions = [...league.divisions.entries()]
    .filter(([, teams]) => teams.length > 0 && league.team(teams[0]!).conference === me.conference);
  const wildCards = input.playoffTeams - divisions.length;
  const rivals = (league.divisions.get(String(me.division)) ?? []).filter((t) => String(t) !== String(team));

  // Clinching: could the threats fill every place above this team?
  const myWorst = worst(rec(team), lft(team));
  const threat = (u: TeamId) => best(rec(u), lft(u)) >= myWorst;
  const rivalThreats = rivals.filter(threat).length;
  const clinchedDivision = rivalThreats === 0;
  // Each wild card above this team needs its own division's winner above it too, so a division
  // with k threats can put at most k - 1 wild cards above it (this team's own: one rival wins it).
  let wildCardThreats = Math.max(0, rivalThreats - 1);
  for (const [key, teams] of divisions) {
    if (key === String(me.division)) continue;
    wildCardThreats += Math.max(0, teams.filter(threat).length - 1);
  }
  const clinchedPlayoffs = clinchedDivision || wildCardThreats < wildCards;

  // Elimination, the mirror image: teams certain to finish ahead even if this team wins out.
  const myBest = best(rec(team), lft(team));
  const ahead = (u: TeamId) => worst(rec(u), lft(u)) > myBest;
  const lostDivision = rivals.some(ahead);
  let wildCardsAhead = 0;
  for (const [key, teams] of divisions) {
    const pool = key === String(me.division) ? rivals : teams;
    wildCardsAhead += Math.max(0, pool.filter(ahead).length - 1);
  }
  const eliminated = lostDivision && wildCardsAhead >= wildCards;

  return { clinchedDivision, clinchedPlayoffs, eliminated };
}

/** This week's clinches and eliminations, each reported once a season. Marks what it reports. */
export function raceStories(input: RaceInput, marks: RaceMarks): Candidate[] {
  const out: Candidate[] = [];
  for (const t of input.league.teams.values()) {
    const status = raceStatus(t.id, input);
    const seen = marks.get(String(t.id)) ?? new Set();
    marks.set(String(t.id), seen);
    const facts = {
      team: t.nickname, teamCity: t.city, record: recordText(recordOf(input.records, t.id)),
      division: t.divisionName, conference: input.league.conferenceName(t.id),
    };
    if (status.clinchedDivision && !seen.has("DIVISION")) {
      seen.add("DIVISION").add("PLAYOFFS");
      out.push({ kind: "CLINCHED_DIVISION", importance: 3, teams: [t.id], games: [], facts });
    } else if (status.clinchedPlayoffs && !seen.has("PLAYOFFS")) {
      seen.add("PLAYOFFS");
      out.push({ kind: "CLINCHED_PLAYOFFS", importance: 3, teams: [t.id], games: [], facts });
    }
    if (status.eliminated && !seen.has("OUT")) {
      seen.add("OUT");
      out.push({ kind: "ELIMINATED", importance: 2, teams: [t.id], games: [], facts });
    }
  }
  return out;
}
