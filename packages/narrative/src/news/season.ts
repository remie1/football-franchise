/**
 * THE SEASON STORIES (ADR-082 step 2): the playoff field, every playoff game, and the review of
 * the season once a champion is crowned. All of them always run (owner's Q4: in a playoff week
 * every game gets its headline).
 */
import type { ConferenceId, GameKind, GameResult, TeamId } from "@ff/contracts";
import type { LeagueIndex } from "./league.js";
import { recordOf, recordText, winShare, type Records, type TeamRecord } from "./records.js";
import { LINES, type Candidate, type Importance } from "./stories.js";
import { scoreText, winnersDeficit } from "./weekly.js";
import type { Facts } from "./words.js";

/** Seed of each playoff team, from PLAYOFF_FIELD_SET (index 0 is the 1 seed). */
export type Seeds = ReadonlyMap<string, number>;

export function seedsOf(field: readonly { conference: ConferenceId; teams: readonly TeamId[] }[]): Map<string, number> {
  return new Map(field.flatMap((c) => c.teams.map((t, i): [string, number] => [String(t), i + 1])));
}

/** "Bison", "Bison and Lynx", "Bison, Lynx and Owls". */
export function listOf(names: readonly string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]!}`;
}

/** One story per conference: the field is set, and here is the top seed. It leads its edition. */
export function fieldStories(
  field: readonly { conference: ConferenceId; teams: readonly TeamId[] }[], records: Records, league: LeagueIndex,
): Candidate[] {
  return field.filter((c) => c.teams.length > 0).map((c) => {
    const top = league.team(c.teams[0]!);
    return {
      kind: "PLAYOFF_FIELD", importance: 4, always: true, teams: [top.id], games: [],
      facts: {
        team: top.nickname, teamCity: top.city, record: recordText(recordOf(records, top.id)),
        conference: top.conferenceName, count: c.teams.length,
      },
    };
  });
}

const ROUND: Partial<Record<GameKind, { kind: string; importance: Importance; round: string }>> = {
  WILD_CARD: { kind: "PLAYOFF_WIN", importance: 3, round: "wild-card" },
  DIVISIONAL: { kind: "PLAYOFF_WIN", importance: 3, round: "divisional" },
  CONFERENCE_FINAL: { kind: "CONFERENCE_TITLE", importance: 4, round: "conference final" },
  CHAMPIONSHIP: { kind: "CHAMPIONSHIP", importance: 5, round: "championship" },
};

/** A playoff game's headline, flavored by how it went: overtime, a comeback, an upset, a rout. */
export function playoffStory(g: GameResult, kind: GameKind, seeds: Seeds, league: LeagueIndex): Candidate | null {
  const round = ROUND[kind];
  if (round === undefined || g.homeScore === g.awayScore) return null;
  const homeWon = g.homeScore > g.awayScore;
  const winner = league.team(homeWon ? g.home : g.away);
  const loser = league.team(homeWon ? g.away : g.home);
  const margin = Math.abs(g.homeScore - g.awayScore);
  const { worst } = winnersDeficit(g);
  const winnerSeed = seeds.get(String(winner.id));
  const loserSeed = seeds.get(String(loser.id));
  const upset = kind !== "CHAMPIONSHIP" && winnerSeed !== undefined && loserSeed !== undefined && winnerSeed > loserSeed;
  const flavor = g.reason === "OVERTIME" ? "overtime"
    : worst >= LINES.comeback ? "comeback"
    : upset ? "upset"
    : margin >= LINES.rout ? "rout"
    : undefined;
  const facts: Facts = {
    winner: winner.nickname, loser: loser.nickname, winnerCity: winner.city, loserCity: loser.city,
    score: scoreText(g), margin, deficit: worst, round: round.round, conference: winner.conferenceName,
    winnerSeed: winnerSeed ?? "", loserSeed: loserSeed ?? "",
  };
  return {
    kind: round.kind, importance: round.importance, always: true,
    teams: [winner.id, loser.id], games: [g.gameId], facts,
    ...(flavor === undefined ? {} : { flavor }),
  };
}

/** Edition labels for playoff weeks, by the round played. */
export const ROUND_LABEL: Partial<Record<GameKind, string>> = {
  WILD_CARD: "Wild-card round", DIVISIONAL: "Divisional round",
  CONFERENCE_FINAL: "Conference finals", CHAMPIONSHIP: "Championship",
};

/** Every team sharing the top value of `score` (highest first). */
function leaders(records: Records, league: LeagueIndex, score: (r: TeamRecord) => number): TeamId[] {
  const teams = [...league.teams.values()].map((t) => t.id);
  const top = Math.max(...teams.map((t) => score(recordOf(records, t))));
  return teams.filter((t) => score(recordOf(records, t)) === top);
}

/** A review story about whoever shares a record: the `many` lines once more than two do. */
function review(
  kind: string, importance: Importance, teams: TeamId[], league: LeagueIndex, facts: Facts,
): Candidate {
  return {
    kind, importance, always: true, teams, games: [],
    ...(teams.length > 2 ? { flavor: "many" } : {}),
    facts: { teams: listOf(teams.map((t) => league.team(t).nickname)), count: teams.length, ...facts },
  };
}

/**
 * The season in review: best and worst records, the longest streaks, the most points and the
 * fewest allowed, and the champion's path through the playoffs.
 */
export function reviewStories(
  records: Records, league: LeagueIndex, champion: TeamId | null,
  playoffs: readonly GameResult[],
): Candidate[] {
  const out: Candidate[] = [];
  const best = leaders(records, league, winShare);
  out.push(review("BEST_RECORD", 3, best, league, { record: recordText(recordOf(records, best[0]!)) }));
  const worst = leaders(records, league, (r) => -winShare(r));
  out.push(review("WORST_RECORD", 2, worst, league, { record: recordText(recordOf(records, worst[0]!)) }));
  const hot = leaders(records, league, (r) => r.longestWinStreak);
  out.push(review("LONGEST_WIN_STREAK", 2, hot, league, { length: recordOf(records, hot[0]!).longestWinStreak }));
  const cold = leaders(records, league, (r) => r.longestLosingStreak);
  out.push(review("LONGEST_LOSING_STREAK", 2, cold, league, { length: recordOf(records, cold[0]!).longestLosingStreak }));
  const offense = leaders(records, league, (r) => r.pointsFor);
  out.push(review("TOP_OFFENSE", 2, offense, league, { points: recordOf(records, offense[0]!).pointsFor }));
  const defense = leaders(records, league, (r) => -r.pointsAgainst);
  out.push(review("TOP_DEFENSE", 2, defense, league, { points: recordOf(records, defense[0]!).pointsAgainst }));

  if (champion !== null) {
    const beaten = playoffs
      .filter((g) => g.home === champion || g.away === champion)
      .map((g) => league.team(g.home === champion ? g.away : g.home).nickname);
    const c = league.team(champion);
    out.push({
      kind: "CHAMPION_PATH", importance: 4, always: true, teams: [champion],
      games: playoffs.filter((g) => g.home === champion || g.away === champion).map((g) => g.gameId),
      facts: { team: c.nickname, teamCity: c.city, record: recordText(recordOf(records, champion)), path: listOf(beaten), wins: beaten.length },
    });
  }
  return out;
}
