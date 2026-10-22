/**
 * A small made-up league for the news tests: 2 conferences × 2 divisions × 2 teams.
 * Narrative may import only contracts, so these are built by hand rather than by franchise.
 */
import {
  conferenceId, createRng, divisionId, gameId, teamId,
  type CalendarStamp, type FranchiseEventEnvelope, type GameResult, type LeagueStructure,
  type ScheduledGame, type SeasonSchedule, type TeamId,
} from "@ff/contracts";
import type { NewsInput } from "../src/news/desk.js";
import { indexLeague, type TeamNames } from "../src/news/league.js";
import { emptyRecords } from "../src/news/records.js";

export const NAMES: TeamNames[] = [
  ["A1", "Ashford", "Anchors"], ["A2", "Bayport", "Bison"], ["A3", "Cedar Point", "Comets"], ["A4", "Dunmore", "Foundry"],
  ["B1", "Easton", "Hawks"], ["B2", "Fairhaven", "Lynx"], ["B3", "Granite Falls", "Owls"], ["B4", "Highland", "Rams"],
].map(([id, city, nick]) => ({ id: teamId(id!), city: city!, displayName: `${city} ${nick}` }));

export const T = Object.fromEntries(NAMES.map((t) => [String(t.id), t.id])) as Record<string, TeamId>;

export const STRUCTURE: LeagueStructure = {
  conferences: [
    { id: conferenceId("ATL"), name: "Atlantic Conference", divisions: [divisionId("ATL-N"), divisionId("ATL-S")] },
    { id: conferenceId("PAC"), name: "Pacific Conference", divisions: [divisionId("PAC-N"), divisionId("PAC-S")] },
  ],
  divisions: [
    { id: divisionId("ATL-N"), name: "Atlantic North", conference: conferenceId("ATL"), teams: [T.A1!, T.A2!] },
    { id: divisionId("ATL-S"), name: "Atlantic South", conference: conferenceId("ATL"), teams: [T.A3!, T.A4!] },
    { id: divisionId("PAC-N"), name: "Pacific North", conference: conferenceId("PAC"), teams: [T.B1!, T.B2!] },
    { id: divisionId("PAC-S"), name: "Pacific South", conference: conferenceId("PAC"), teams: [T.B3!, T.B4!] },
  ],
};

export const LEAGUE = indexLeague(STRUCTURE, NAMES);
export const ALL = NAMES.map((t) => t.id);
export const EMPTY = emptyRecords(ALL);

export const day = (week: number, d: number, phase: CalendarStamp["phase"] = "REGULAR_SEASON"): CalendarStamp =>
  ({ season: 2027, phase, week, day: d });

/** A result: `game("A1", 31, "A2", 10)` is A1 at home beating A2 31-10. */
export function game(
  home: string, homeScore: number, away: string, awayScore: number,
  extra: Partial<GameResult> = {}, id = `${away}@${home}`,
): GameResult {
  return {
    gameId: gameId(id), home: T[home]!, away: T[away]!, homeScore, awayScore,
    reason: homeScore === awayScore ? "TIE" : "REGULATION", seed: "test", ...extra,
  };
}

/** Period scores for a home team and an away team, quarter by quarter. */
export function quarters(home: number[], away: number[]): NonNullable<GameResult["periods"]> {
  return home.map((h, i) => ({ period: i + 1, home: h, away: away[i]! }));
}

/** Every team plays every week: the eight teams paired off by a fixed rotation. */
export function schedule(weeks: number): SeasonSchedule {
  const games: ScheduledGame[] = [];
  const ids = ALL.map(String);
  for (let w = 1; w <= weeks; w++) {
    const order = [ids[0]!, ...ids.slice(1).map((_, i, rest) => rest[(i + w) % rest.length]!)];
    for (let k = 0; k < order.length / 2; k++) {
      const home = order[k]!;
      const away = order[order.length - 1 - k]!;
      games.push({
        gameId: gameId(`W${w}-${away}@${home}`), season: 2027, kind: "REGULAR", at: day(w, 7),
        home: T[home]!, away: T[away]!, neutralSite: false,
      });
    }
  }
  return { season: 2027, games, byes: [] };
}

/** A season's franchise stream: a WEEK_ADVANCED each Monday, every game on day 7, scores from the seed. */
export function seasonEvents(sched: SeasonSchedule, seed: string): FranchiseEventEnvelope[] {
  const rng = createRng(seed, "test:scores");
  const out: FranchiseEventEnvelope[] = [];
  const weeks = [...new Set(sched.games.map((g) => g.at.week))].sort((a, b) => a - b);
  for (const w of weeks) {
    out.push({ seq: out.length, at: day(w, 1), event: { type: "WEEK_ADVANCED", payload: { stamp: day(w, 1) } } });
    for (const g of sched.games.filter((x) => x.at.week === w)) {
      const q = () => [rng.int(0, 14), rng.int(0, 14), rng.int(0, 14), rng.int(0, 14)];
      const hq = q();
      const aq = q();
      const sum = (a: number[]) => a.reduce((n, x) => n + x, 0);
      if (sum(hq) === sum(aq)) hq[3] = hq[3]! + 3;
      const result: GameResult = {
        gameId: g.gameId, home: g.home, away: g.away, homeScore: sum(hq), awayScore: sum(aq),
        reason: "REGULATION", seed: `${seed}/${String(g.gameId)}`, periods: quarters(hq, aq),
      };
      out.push({ seq: out.length, at: g.at, event: { type: "GAME_COMPLETED", payload: { result, kind: "REGULAR" } } });
    }
  }
  return out;
}

/** Three playoff teams a conference: its two division winners and one wild card. */
export function input(sched: SeasonSchedule, seed = "news-test"): NewsInput {
  return { seed, structure: STRUCTURE, teams: NAMES, schedule: sched, playoffTeams: 3 };
}
