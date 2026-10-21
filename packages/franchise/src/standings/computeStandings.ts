/**
 * S4 — standings and the NFL tiebreak ladders (season shell plan; ADR-078 C5).
 *
 * Standings are a view of results + structure. Records are compared as win percentage
 * (a tie is half a win), so a cancelled game or a tied game counts the way the NFL counts it.
 *
 * Ladders follow the NFL's published tiebreaking procedures:
 *   division, 2 or more clubs: head-to-head, division record, common games, conference record,
 *     strength of victory, strength of schedule, conference points rank, league points rank,
 *     net points in common games, net points, net touchdowns, coin toss.
 *   wild card (and ordering division winners), 2 clubs: head-to-head (if they met), conference
 *     record, common games (min. 4), SOV, SOS, conference points rank, league points rank,
 *     net points in conference games, net points, net touchdowns, coin toss.
 *   wild card, 3 or more clubs: as above, but head-to-head only counts as a sweep (one club beat
 *     every other, or lost to every other); first keep only the best-placed club of each division.
 * Whenever a step removes some clubs but leaves more than one, the survivors restart at step 1
 * (two-club ladder if two remain). Once one club is placed, the rest restart from step 1.
 *
 * Pass regular-season results only. Results carry no touchdown counts, so the net-touchdowns step
 * separates no one unless `touchdowns` is given.
 */
import {
  createRng,
  type ConferenceId, type DivisionId, type GameId, type GameResult, type TeamId,
  type StandingsRow, type TiebreakStep, type WinLossTie,
} from "@ff/contracts";
import type { League } from "../league/buildLeague.js";

export interface StandingsOptions {
  /** Seed for the coin toss; defaults to the league's seed. */
  seed?: string;
  /** Touchdowns scored per game, for the net-touchdowns step. */
  touchdowns?: ReadonlyMap<GameId, { home: number; away: number }>;
}

/**
 * The wild-card ladder's net-points step counts conference games only. Contracts' TiebreakStep has
 * no word for it, so conference rankings (franchise-local) carry this one extra step name.
 */
export type ConferenceTiebreakStep = TiebreakStep | "CONFERENCE_NET_POINTS";

export interface ConferenceRankRow {
  team: TeamId;
  division: DivisionId;
  divisionWinner: boolean;
  /** Set when a tie decided this place: the clubs it was tied with and the step that settled it. */
  tiebreak?: { over: TeamId[]; step: ConferenceTiebreakStep };
}

// ---------------------------------------------------------------------------------------------
// The table: every team's games, built once.

interface TeamGame {
  gameId: GameId;
  opp: TeamId;
  home: boolean;
  pf: number;
  pa: number;
  /** 2 win, 1 tie, 0 loss — doubled so percentages are one exact integer division. */
  score2: 0 | 1 | 2;
}

interface Table {
  divisionOf: Map<TeamId, DivisionId>;
  conferenceOf: Map<TeamId, ConferenceId>;
  games: Map<TeamId, TeamGame[]>;
  confPointsRank: Map<TeamId, number>;
  leaguePointsRank: Map<TeamId, number>;
  coinSeed: string;
  touchdowns?: StandingsOptions["touchdowns"];
}

function buildTable(league: League, results: readonly GameResult[], opts: StandingsOptions): Table {
  const divisionOf = new Map<TeamId, DivisionId>();
  const conferenceOf = new Map<TeamId, ConferenceId>();
  const games = new Map<TeamId, TeamGame[]>();
  for (const d of league.structure.divisions) {
    for (const t of d.teams) {
      divisionOf.set(t, d.id);
      conferenceOf.set(t, d.conference);
      games.set(t, []);
    }
  }
  const seen = new Set<GameId>();
  for (const r of results) {
    if (seen.has(r.gameId)) throw new Error(`computeStandings: result ${r.gameId} given twice`);
    seen.add(r.gameId);
    for (const t of [r.home, r.away]) {
      if (!games.has(t)) throw new Error(`computeStandings: team ${t} in ${r.gameId} is not in the league`);
    }
    const homeScore2 = r.homeScore > r.awayScore ? 2 : r.homeScore === r.awayScore ? 1 : 0;
    games.get(r.home)!.push({ gameId: r.gameId, opp: r.away, home: true, pf: r.homeScore, pa: r.awayScore, score2: homeScore2 });
    games.get(r.away)!.push({ gameId: r.gameId, opp: r.home, home: false, pf: r.awayScore, pa: r.homeScore, score2: (2 - homeScore2) as 0 | 1 | 2 });
  }

  const all = [...games.keys()];
  const leaguePointsRank = pointsRank(all, games);
  const confPointsRank = new Map<TeamId, number>();
  for (const c of league.structure.conferences) {
    const members = all.filter((t) => conferenceOf.get(t) === c.id);
    for (const [t, v] of pointsRank(members, games)) confPointsRank.set(t, v);
  }
  return {
    divisionOf, conferenceOf, games, confPointsRank, leaguePointsRank,
    coinSeed: opts.seed ?? league.seed,
    ...(opts.touchdowns ? { touchdowns: opts.touchdowns } : {}),
  };
}

/** Rank in points scored (most = 1) plus rank in points allowed (fewest = 1); lower is better. */
function pointsRank(teams: TeamId[], games: Map<TeamId, TeamGame[]>): Map<TeamId, number> {
  const pf = new Map(teams.map((t) => [t, sum(games.get(t)!, (g) => g.pf)]));
  const pa = new Map(teams.map((t) => [t, sum(games.get(t)!, (g) => g.pa)]));
  const rank = (val: Map<TeamId, number>, better: (a: number, b: number) => boolean, t: TeamId) =>
    1 + teams.filter((o) => better(val.get(o)!, val.get(t)!)).length;
  return new Map(teams.map((t) => [t, rank(pf, (a, b) => a > b, t) + rank(pa, (a, b) => a < b, t)]));
}

const sum = <T>(xs: readonly T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

function record(games: readonly TeamGame[]): WinLossTie {
  let wins = 0, losses = 0, ties = 0;
  for (const g of games) {
    if (g.score2 === 2) wins++;
    else if (g.score2 === 1) ties++;
    else losses++;
  }
  return { wins, losses, ties };
}

/** Win percentage, ties as half; 0 for no games. One integer division, so equal records compare equal. */
function pct(games: readonly TeamGame[]): number {
  return games.length === 0 ? 0 : sum(games, (g) => g.score2) / (2 * games.length);
}

// ---------------------------------------------------------------------------------------------
// Steps. Each returns a value per team (higher is better), or null when it does not apply.

type Values = Map<TeamId, number> | null;
interface Step { id: ConferenceTiebreakStep; values(group: TeamId[], tb: Table): Values }

const per = (group: TeamId[], f: (t: TeamId) => number): Values => new Map(group.map((t) => [t, f(t)]));
const gamesOf = (tb: Table, t: TeamId) => tb.games.get(t)!;

function commonOpponents(group: TeamId[], tb: Table): Set<TeamId> {
  const sets = group.map((t) => new Set(gamesOf(tb, t).map((g) => g.opp)));
  return new Set([...sets[0]!].filter((o) => !group.includes(o) && sets.every((s) => s.has(o))));
}

const headToHead: Step = {
  id: "HEAD_TO_HEAD",
  values(group, tb) {
    const within = (t: TeamId) => gamesOf(tb, t).filter((g) => group.includes(g.opp));
    if (group.some((t) => within(t).length === 0)) return null;
    return per(group, (t) => pct(within(t)));
  },
};

/** Wild card, 3+ clubs: only a club that beat each of the others, or lost to each of the others. */
const headToHeadSweep: Step = {
  id: "HEAD_TO_HEAD",
  values(group, tb) {
    const vs = (t: TeamId, o: TeamId) => gamesOf(tb, t).filter((g) => g.opp === o);
    const all = (t: TeamId, score2: number) =>
      group.every((o) => o === t || (vs(t, o).length > 0 && vs(t, o).every((g) => g.score2 === score2)));
    const sweeper = group.find((t) => all(t, 2));
    if (sweeper) return per(group, (t) => (t === sweeper ? 1 : 0));
    const swept = group.find((t) => all(t, 0));
    if (swept) return per(group, (t) => (t === swept ? -1 : 0));
    return null;
  },
};

const divisionRecord: Step = {
  id: "DIVISION_RECORD",
  values: (group, tb) => per(group, (t) => pct(gamesOf(tb, t).filter((g) => tb.divisionOf.get(g.opp) === tb.divisionOf.get(t)))),
};

const conferenceRecord: Step = {
  id: "CONFERENCE_RECORD",
  values: (group, tb) => per(group, (t) => pct(gamesOf(tb, t).filter((g) => tb.conferenceOf.get(g.opp) === tb.conferenceOf.get(t)))),
};

function commonGames(minGames: number): Step {
  return {
    id: "COMMON_GAMES",
    values(group, tb) {
      const common = commonOpponents(group, tb);
      const vs = (t: TeamId) => gamesOf(tb, t).filter((g) => common.has(g.opp));
      if (common.size === 0 || group.some((t) => vs(t).length < minGames)) return null;
      return per(group, (t) => pct(vs(t)));
    },
  };
}

/** Combined percentage of the given opponents (one entry per game), as one integer division. */
function opponentsPct(opps: TeamId[], tb: Table): number {
  const n = sum(opps, (o) => sum(gamesOf(tb, o), (g) => g.score2));
  const d = sum(opps, (o) => 2 * gamesOf(tb, o).length);
  return d === 0 ? 0 : n / d;
}

const strengthOfVictory: Step = {
  id: "STRENGTH_OF_VICTORY",
  values: (group, tb) => per(group, (t) => opponentsPct(gamesOf(tb, t).filter((g) => g.score2 === 2).map((g) => g.opp), tb)),
};

const strengthOfSchedule: Step = {
  id: "STRENGTH_OF_SCHEDULE",
  values: (group, tb) => per(group, (t) => opponentsPct(gamesOf(tb, t).map((g) => g.opp), tb)),
};

const conferencePointsRank: Step = {
  id: "CONFERENCE_POINTS_RANK",
  values: (group, tb) => per(group, (t) => -tb.confPointsRank.get(t)!),
};

const leaguePointsRank: Step = {
  id: "LEAGUE_POINTS_RANK",
  values: (group, tb) => per(group, (t) => -tb.leaguePointsRank.get(t)!),
};

const net = (games: readonly TeamGame[]) => sum(games, (g) => g.pf - g.pa);

const commonNetPoints: Step = {
  id: "COMMON_NET_POINTS",
  values(group, tb) {
    const common = commonOpponents(group, tb);
    if (common.size === 0) return null;
    return per(group, (t) => net(gamesOf(tb, t).filter((g) => common.has(g.opp))));
  },
};

const conferenceNetPoints: Step = {
  id: "CONFERENCE_NET_POINTS",
  values: (group, tb) => per(group, (t) => net(gamesOf(tb, t).filter((g) => tb.conferenceOf.get(g.opp) === tb.conferenceOf.get(t)))),
};

const netPoints: Step = { id: "NET_POINTS", values: (group, tb) => per(group, (t) => net(gamesOf(tb, t))) };

const netTouchdowns: Step = {
  id: "NET_TOUCHDOWNS",
  values(group, tb) {
    const td = tb.touchdowns;
    if (!td || group.some((t) => gamesOf(tb, t).some((g) => !td.has(g.gameId)))) return null;
    return per(group, (t) => sum(gamesOf(tb, t), (g) => {
      const x = td.get(g.gameId)!;
      return g.home ? x.home - x.away : x.away - x.home;
    }));
  },
};

/** Seeded and keyed by the tied clubs, so the toss does not depend on input order. */
const coinToss: Step = {
  id: "COIN_TOSS",
  values(group, tb) {
    const sorted = [...group].sort();
    const winner = createRng(tb.coinSeed, `franchise:standings:coin/${sorted.join(",")}`).pick(sorted);
    return per(group, (t) => (t === winner ? 1 : 0));
  },
};

interface Ladder { two: Step[]; many: Step[] }

const DIVISION_STEPS = [
  divisionRecord, commonGames(1), conferenceRecord, strengthOfVictory, strengthOfSchedule,
  conferencePointsRank, leaguePointsRank, commonNetPoints, netPoints, netTouchdowns, coinToss,
];
const DIVISION_LADDER: Ladder = { two: [headToHead, ...DIVISION_STEPS], many: [headToHead, ...DIVISION_STEPS] };

const WILD_CARD_STEPS = [
  conferenceRecord, commonGames(4), strengthOfVictory, strengthOfSchedule,
  conferencePointsRank, leaguePointsRank, conferenceNetPoints, netPoints, netTouchdowns, coinToss,
];
const WILD_CARD_LADDER: Ladder = { two: [headToHead, ...WILD_CARD_STEPS], many: [headToHeadSweep, ...WILD_CARD_STEPS] };

// ---------------------------------------------------------------------------------------------
// Breaking a tie.

interface Pick { winner: TeamId; step?: ConferenceTiebreakStep }

/** The best club of a tied group. Survivors of a partial split restart at step 1. */
function pickBest(group: TeamId[], ladder: Ladder, tb: Table): Pick {
  if (group.length === 1) return { winner: group[0]! };
  for (const step of group.length === 2 ? ladder.two : ladder.many) {
    const vals = step.values(group, tb);
    if (!vals) continue;
    const best = Math.max(...group.map((t) => vals.get(t)!));
    const top = group.filter((t) => vals.get(t) === best);
    if (top.length === 1) return { winner: top[0]!, step: step.id };
    if (top.length < group.length) return pickBest(top, ladder, tb);
  }
  throw new Error("unreachable: the coin toss always separates");
}

/** Orders clubs with the same record, best first. */
function orderTied(group: TeamId[], ladder: Ladder, tb: Table): Pick[] {
  const out: Pick[] = [];
  let rest = [...group].sort();
  while (rest.length > 0) {
    const p = pickBest(rest, ladder, tb);
    out.push(p);
    rest = rest.filter((t) => t !== p.winner);
  }
  return out;
}

/** Splits teams into runs of equal win percentage, best record first (ids sorted within a run). */
function byRecord(teams: TeamId[], tb: Table): TeamId[][] {
  const p = (t: TeamId) => pct(gamesOf(tb, t));
  const sorted = [...teams].sort((a, b) => p(b) - p(a) || (a < b ? -1 : 1));
  const runs: TeamId[][] = [];
  for (const t of sorted) {
    const last = runs[runs.length - 1];
    if (last && p(last[0]!) === p(t)) last.push(t);
    else runs.push([t]);
  }
  return runs;
}

function divisionOrder(teams: TeamId[], tb: Table): Pick[] {
  return byRecord(teams, tb).flatMap((run) => orderTied(run, DIVISION_LADDER, tb));
}

// ---------------------------------------------------------------------------------------------
// Public entry points.

/** One row per team, grouped by division in structure order, each division ranked 1..n. */
export function computeStandings(league: League, results: readonly GameResult[], opts: StandingsOptions = {}): StandingsRow[] {
  const tb = buildTable(league, results, opts);
  const rows: StandingsRow[] = [];
  for (const d of league.structure.divisions) {
    const order = divisionOrder(d.teams, tb);
    order.forEach((p, i) => {
      const games = gamesOf(tb, p.winner);
      const row: StandingsRow = {
        team: p.winner,
        overall: record(games),
        division: record(games.filter((g) => tb.divisionOf.get(g.opp) === d.id)),
        conference: record(games.filter((g) => tb.conferenceOf.get(g.opp) === d.conference)),
        home: record(games.filter((g) => g.home)),
        away: record(games.filter((g) => !g.home)),
        pointsFor: sum(games, (g) => g.pf),
        pointsAgainst: sum(games, (g) => g.pa),
        divisionRank: i + 1,
      };
      const next = order[i + 1];
      // `step` is only set when this club was picked out of a tie; `over` is the club placed just below it.
      if (p.step && next) row.tiebreak = { over: next.winner, step: p.step as TiebreakStep };
      rows.push(row);
    });
  }
  return rows;
}

/**
 * The whole conference in seeding order: division winners first (ordered by record, ties by the
 * wild-card ladder), then every other club by record, each tie settled by the wild-card ladder after
 * keeping only the best-placed club of each division. The playoff field is the first N rows.
 */
export function rankConference(
  league: League, results: readonly GameResult[], conference: ConferenceId, opts: StandingsOptions = {},
): ConferenceRankRow[] {
  const tb = buildTable(league, results, opts);
  const divisions = league.structure.divisions.filter((d) => d.conference === conference);
  if (divisions.length === 0) throw new Error(`rankConference: no divisions in conference ${conference}`);
  const divRank = new Map<TeamId, number>();
  for (const d of divisions) divisionOrder(d.teams, tb).forEach((p, i) => divRank.set(p.winner, i));

  const winners = [...divRank].filter(([, r]) => r === 0).map(([t]) => t);
  const rows: ConferenceRankRow[] = [];
  const emit = (p: Pick, tiedWith: TeamId[], divisionWinner: boolean) => {
    const row: ConferenceRankRow = { team: p.winner, division: tb.divisionOf.get(p.winner)!, divisionWinner };
    const over = tiedWith.filter((t) => t !== p.winner);
    if (p.step && over.length > 0) row.tiebreak = { over, step: p.step };
    rows.push(row);
  };

  for (const run of byRecord(winners, tb)) {
    let rest = [...run].sort();
    while (rest.length > 0) {
      const p = pickBest(rest, WILD_CARD_LADDER, tb);
      emit(p, rest, true);
      rest = rest.filter((t) => t !== p.winner);
    }
  }

  let others = [...divRank].filter(([, r]) => r > 0).map(([t]) => t);
  while (others.length > 0) {
    const run = byRecord(others, tb)[0]!;
    // Only the best-placed club of each division may take part (division tiebreaks hold).
    const contenders = run.filter((t) => !run.some((o) => tb.divisionOf.get(o) === tb.divisionOf.get(t) && divRank.get(o)! < divRank.get(t)!));
    const p = pickBest(contenders.sort(), WILD_CARD_LADDER, tb);
    emit(p, contenders, false);
    others = others.filter((t) => t !== p.winner);
  }
  return rows;
}
