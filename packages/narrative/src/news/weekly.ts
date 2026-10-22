/**
 * The weekly stories: what each regular-season week's games offer the paper (ADR-082, step 1).
 *
 * Every rule reads only results, the records before and after the week, and next week's
 * schedule. Nothing is invented: a comeback is a comeback because the period scores say the
 * winner was behind.
 */
import type { GameResult, SeasonSchedule, TeamId } from "@ff/contracts";
import type { LeagueIndex } from "./league.js";
import {
  gamesBehind, leadersOf, played, recordOf, recordText, winShare,
  type Records, type TeamRecord,
} from "./records.js";
import { LINES, type Candidate, type Importance } from "./stories.js";
import { numberWord, ordinalWord, type Facts } from "./words.js";

export interface WeekContext {
  /** The regular-season week, from 1. */
  readonly week: number;
  /** This week's regular-season games, in the order they finished. */
  readonly results: readonly GameResult[];
  readonly before: Records;
  readonly after: Records;
  readonly league: LeagueIndex;
  readonly schedule: SeasonSchedule;
}

/** "41-17": the higher score first, as a paper prints it. */
export function scoreText(g: GameResult): string {
  return `${Math.max(g.homeScore, g.awayScore)}-${Math.min(g.homeScore, g.awayScore)}`;
}

/**
 * The winner's worst deficit at the end of the first, second or third quarter; 0 when it never
 * trailed then, or when the result carries no period scores.
 */
export function winnersDeficit(g: GameResult): { worst: number; afterThree: number } {
  const periods = [...(g.periods ?? [])].sort((a, b) => a.period - b.period);
  const homeWon = g.homeScore > g.awayScore;
  let home = 0, away = 0, worst = 0, afterThree = 0;
  for (const p of periods) {
    if (p.period > 3) break;
    home += p.home;
    away += p.away;
    const behind = homeWon ? away - home : home - away;
    worst = Math.max(worst, behind);
    if (p.period === 3) afterThree = behind;
  }
  return { worst, afterThree };
}

/** The one story a game offers: the most important that applies, or none. */
export function gameStory(g: GameResult, ctx: WeekContext): Candidate | null {
  const { league, before, after } = ctx;
  if (g.homeScore === g.awayScore) {
    return { kind: "TIE", importance: 3, teams: [g.home, g.away], games: [g.gameId], facts: pairFacts(g.home, g, ctx) };
  }

  const homeWon = g.homeScore > g.awayScore;
  const winner = homeWon ? g.home : g.away;
  const loser = homeWon ? g.away : g.home;
  const won = Math.max(g.homeScore, g.awayScore);
  const lost = Math.min(g.homeScore, g.awayScore);
  const margin = won - lost;
  const { worst, afterThree } = winnersDeficit(g);
  const wBefore = recordOf(before, winner);
  const lBefore = recordOf(before, loser);
  const upset = played(wBefore) >= LINES.upsetMinGames && played(lBefore) >= LINES.upsetMinGames
    && winShare(lBefore) - winShare(wBefore) >= LINES.upsetGap;

  // Highest importance first; within one importance, the order of this list decides.
  const offers: [string, Importance, boolean][] = [
    ["SHUTOUT", 3, lost === 0],
    ["COMEBACK", worst >= LINES.bigComeback ? 4 : 3, worst >= LINES.comeback],
    ["UPSET", 3, upset],
    ["OVERTIME", 2, g.reason === "OVERTIME"],
    ["LATE_RALLY", 2, afterThree > 0],
    ["ROUT", 2, margin >= LINES.rout],
    ["NAIL_BITER", 1, margin <= LINES.close && g.reason === "REGULATION"],
    ["SHOOTOUT", 1, won + lost >= LINES.shootout],
  ];
  const fired = offers.filter(([, , fires]) => fires);
  if (fired.length === 0) return null;
  const [kind, importance] = fired.reduce((best, o) => (o[1] > best[1] ? o : best));

  const w = league.team(winner);
  const l = league.team(loser);
  const facts: Facts = {
    winner: w.nickname, loser: l.nickname, winnerCity: w.city, loserCity: l.city,
    score: scoreText(g), margin, total: won + lost, deficit: worst,
    winnerRecord: recordText(recordOf(after, winner)), loserRecord: recordText(recordOf(after, loser)),
    winnerRecordBefore: recordText(wBefore), loserRecordBefore: recordText(lBefore),
  };
  return { kind, importance, teams: [winner, loser], games: [g.gameId], facts };
}

/** Facts for a story about `team` whose game this week was `g`; records are after the game. */
function pairFacts(team: TeamId, g: GameResult, ctx: WeekContext): Facts {
  const opponent = g.home === team ? g.away : g.home;
  const t = ctx.league.team(team);
  const o = ctx.league.team(opponent);
  return {
    team: t.nickname, teamCity: t.city, record: recordText(recordOf(ctx.after, team)),
    opponent: o.nickname, opponentCity: o.city, opponentRecord: recordText(recordOf(ctx.after, opponent)),
    score: scoreText(g),
  };
}

function streakImportance(length: number): Importance {
  return length >= 9 ? 4 : length >= 6 ? 3 : 2;
}

const unbeaten = (r: Records, teams: readonly TeamId[]) => teams.filter((t) => played(recordOf(r, t)) > 0 && recordOf(r, t).losses === 0);
const winless = (r: Records, teams: readonly TeamId[]) => teams.filter((t) => played(recordOf(r, t)) > 0 && recordOf(r, t).wins === 0);

/** Stories about teams rather than single games: streaks, the unbeaten and winless, first place. */
export function teamStories(ctx: WeekContext): Candidate[] {
  const { week, results, before, after, league } = ctx;
  const out: Candidate[] = [];
  const gameOf = new Map<string, GameResult>();
  for (const g of results) { gameOf.set(String(g.home), g); gameOf.set(String(g.away), g); }
  const allTeams = [...league.teams.values()].map((t) => t.id);

  for (const team of results.flatMap((g) => [g.home, g.away])) {
    const g = gameOf.get(String(team))!;
    const now = recordOf(after, team);
    const was = recordOf(before, team);
    const streak = now.streak;
    if (streak !== null && streak.result !== "T" && streak.length >= LINES.streak) {
      out.push({
        kind: streak.result === "W" ? "WIN_STREAK" : "LOSING_STREAK",
        importance: streakImportance(streak.length),
        teams: [team], games: [g.gameId],
        facts: { ...pairFacts(team, g, ctx), count: streak.length, countWord: numberWord(streak.length), nth: ordinalWord(streak.length) },
      });
    }
    if (was.streak?.result === "W" && was.streak.length >= LINES.snapped && streak?.result !== "W") {
      const opponent = g.home === team ? g.away : g.home;
      out.push({
        kind: "STREAK_SNAPPED", importance: 3, teams: [team, opponent], games: [g.gameId],
        facts: { ...pairFacts(team, g, ctx), count: was.streak.length, countWord: numberWord(was.streak.length), nth: ordinalWord(was.streak.length) },
      });
    }
  }

  // The last unbeaten team, and its fall.
  const unbeatenBefore = unbeaten(before, allTeams);
  const unbeatenAfter = unbeaten(after, allTeams);
  if (week >= LINES.lastUnbeatenFromWeek && unbeatenAfter.length === 1 && unbeatenBefore.length > 1) {
    const team = unbeatenAfter[0]!;
    out.push({ kind: "LAST_UNBEATEN", importance: 3, teams: [team], games: gamesOf(team, gameOf), facts: soloFacts(team, ctx) });
  }
  if (unbeatenBefore.length > 0 && unbeatenAfter.length === 0) {
    for (const team of unbeatenBefore) {
      const g = gameOf.get(String(team));
      if (g === undefined) continue;
      const was = recordOf(before, team);
      out.push({
        kind: "UNBEATEN_FALLS", importance: was.wins >= 6 ? 4 : 3,
        teams: [team, g.home === team ? g.away : g.home], games: [g.gameId],
        facts: { ...pairFacts(team, g, ctx), recordBefore: recordText(was) },
      });
    }
  }

  // The last winless team, and its first win.
  const winlessBefore = winless(before, allTeams);
  const winlessAfter = winless(after, allTeams);
  if (week >= LINES.lastWinlessFromWeek && winlessAfter.length === 1 && winlessBefore.length > 1) {
    const team = winlessAfter[0]!;
    out.push({ kind: "LAST_WINLESS", importance: 2, teams: [team], games: gamesOf(team, gameOf), facts: soloFacts(team, ctx) });
  }
  if (winlessBefore.length > 0 && winlessAfter.length === 0) {
    for (const team of winlessBefore) {
      const g = gameOf.get(String(team));
      if (g === undefined || recordOf(after, team).wins === 0) continue;
      out.push({ kind: "FIRST_WIN", importance: 3, teams: [team], games: [g.gameId], facts: pairFacts(team, g, ctx) });
    }
  }

  // First place in each division.
  for (const teams of league.divisions.values()) {
    const leadersNow = leadersOf(after, teams);
    const leadersThen = leadersOf(before, teams);
    if (week >= LINES.newLeaderFromWeek && leadersNow.length === 1 && !leadersThen.includes(leadersNow[0]!)) {
      const team = leadersNow[0]!;
      out.push({
        kind: "NEW_LEADER", importance: 2, teams: [team], games: gamesOf(team, gameOf),
        facts: { ...soloFacts(team, ctx), division: league.team(team).divisionName },
      });
    }
    if (week >= LINES.showdownFromWeek) out.push(...showdowns(ctx, teams, leadersNow));
  }
  return out;
}

function gamesOf(team: TeamId, gameOf: ReadonlyMap<string, GameResult>) {
  const g = gameOf.get(String(team));
  return g === undefined ? [] : [g.gameId];
}

function soloFacts(team: TeamId, ctx: WeekContext): Facts {
  const t = ctx.league.team(team);
  return { team: t.nickname, teamCity: t.city, record: recordText(recordOf(ctx.after, team)) };
}

/** Next week's games between a division's leader and a rival within one game of it. */
function showdowns(ctx: WeekContext, teams: readonly TeamId[], leaders: readonly TeamId[]): Candidate[] {
  if (leaders.length === 0) return [];
  const lead: TeamRecord = recordOf(ctx.after, leaders[0]!);
  if (winShare(lead) < LINES.showdownMinShare) return [];
  const inDivision = new Set(teams.map(String));
  const isLeader = (t: TeamId) => leaders.includes(t);
  const close = (t: TeamId) => gamesBehind(lead, recordOf(ctx.after, t)) <= 1;
  const out: Candidate[] = [];
  for (const s of ctx.schedule.games) {
    if (s.kind !== "REGULAR" || s.at.week !== ctx.week + 1) continue;
    if (!inDivision.has(String(s.home)) || !inDivision.has(String(s.away))) continue;
    const bothLead = isLeader(s.home) && isLeader(s.away);
    if (!bothLead && !((isLeader(s.home) && close(s.away)) || (isLeader(s.away) && close(s.home)))) continue;
    const h = ctx.league.team(s.home);
    const a = ctx.league.team(s.away);
    out.push({
      kind: "SHOWDOWN", importance: 2, teams: [s.home, s.away], games: [s.gameId],
      ...(bothLead ? { flavor: "tied" } : {}),
      facts: {
        home: h.nickname, away: a.nickname, homeCity: h.city, awayCity: a.city,
        homeRecord: recordText(recordOf(ctx.after, s.home)), awayRecord: recordText(recordOf(ctx.after, s.away)),
        division: h.divisionName,
      },
    });
  }
  return out;
}

/** Everything this week's games offer: one story per game, then the team stories. */
export function weeklyCandidates(ctx: WeekContext): Candidate[] {
  const games = ctx.results.map((g) => gameStory(g, ctx)).filter((c): c is Candidate => c !== null);
  return [...games, ...teamStories(ctx)];
}
