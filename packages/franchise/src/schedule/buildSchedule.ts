/**
 * S3 — the schedule maker (season shell plan; ADR-078 C3).
 *
 * The NFL formula (2021-): every team plays
 *   6 division games (each rival home and away),
 *   4 against one other division in its conference (rotates on a 3-year cycle),
 *   4 against one division in the other conference (rotates on a 4-year cycle),
 *   2 "same-place" games against the two remaining divisions in its conference,
 *   1 "same-place" game against a division in the other conference it does not play in full.
 * "Same place" means the team that finished in the same spot in its division last season.
 *
 * Home and away: 3+2+2+1 = 8 home games from the first sixteen, and the 17th game is hosted by
 * one conference in odd seasons and the other in even seasons, so every team has 8 or 9.
 *
 * Weeks: 17 games over 18 weeks, one bye per team in weeks 5-14, and week 18 is all division
 * games (as the NFL does). A team never meets the same opponent in back-to-back weeks.
 * The matchups follow from (league, season, previous finish); the seed only decides the weeks.
 */
import {
  createRng, gameId, DEFAULT_LEAGUE_RULES,
  type Rng, type LeagueRules, type TeamId, type Division,
  type ScheduledGame, type SeasonSchedule,
} from "@ff/contracts";
import type { League } from "../league/buildLeague.js";

/** Weeks a bye may fall in (inclusive). */
export const BYE_WINDOW = { first: 5, last: 14 } as const;
/** Day of the week games are played (1 = Monday, as the Tuesday trade deadline is day 2). */
export const GAME_DAY = 7;

export interface ScheduleOptions {
  /**
   * Last season's finish, best first, per division. Decides the same-place games.
   * Missing divisions (or a first season) use the division's listed order.
   */
  previousFinish?: Readonly<Record<string, readonly TeamId[]>>;
  rules?: LeagueRules;
}

interface Matchup { home: TeamId; away: TeamId; division: boolean }

const MAX_ATTEMPTS = 200;
const WEEK_NODE_BUDGET = 20_000;

export function buildSchedule(
  league: League, season: number, seed: string, options: ScheduleOptions = {},
): SeasonSchedule {
  const rules = options.rules ?? DEFAULT_LEAGUE_RULES;
  checkShape(league, rules);
  const matchups = formulaMatchups(league, season, options.previousFinish ?? {});
  const teams = league.structure.divisions.flatMap((d) => d.teams);
  const rng = createRng(seed, `franchise:schedule:${season}`);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const weeks = assignWeeks(matchups, teams, league.structure.divisions, rules, rng.fork(`attempt-${attempt}`));
    if (weeks) return toSchedule(season, weeks.games, weeks.byes);
  }
  throw new Error(`buildSchedule: no valid week layout found for season ${season} after ${MAX_ATTEMPTS} attempts`);
}

// ---------------------------------------------------------------------------------------------
// The formula: who plays whom, and where.

function checkShape(league: League, rules: LeagueRules): void {
  const { conferences, divisions } = league.structure;
  const ok = conferences.length === 2
    && conferences.every((c) => c.divisions.length === 4)
    && divisions.length === 8
    && divisions.every((d) => d.teams.length === 4);
  if (!ok) throw new Error("buildSchedule: the NFL formula needs 2 conferences x 4 divisions x 4 teams");
  if (rules.gamesPerSeason !== 17 || rules.byeWeeksPerTeam !== 1 || rules.weeksPerSeason !== 18) {
    throw new Error("buildSchedule: the NFL formula needs 17 games, 18 weeks and 1 bye per team");
  }
}

function formulaMatchups(
  league: League, season: number, previousFinish: Readonly<Record<string, readonly TeamId[]>>,
): Matchup[] {
  const byId = new Map(league.structure.divisions.map((d) => [d.id, d] as const));
  // conf[c][d] = that division's teams ordered by last season's finish (index = place).
  const conf: TeamId[][][] = league.structure.conferences.map((c) =>
    c.divisions.map((did) => finishOrder(byId.get(did)!, previousFinish)));
  const out: Matchup[] = [];
  const add = (home: TeamId, away: TeamId, division = false) => out.push({ home, away, division });

  const intraOffset = (mod(season, 3)) + 1; // division d meets division d XOR offset in full
  const interShift = mod(season, 4);       // conference-0 division d meets conference-1 division d + shift
  const flip = mod(Math.floor(season / 3), 2) === 1;

  for (let c = 0; c < 2; c++) {
    const divs = conf[c]!;
    // 6 division games: each pair home and away.
    for (const div of divs) {
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
        add(div[i]!, div[j]!, true);
        add(div[j]!, div[i]!, true);
      }
    }
    // 4 against the paired division in the conference: 2 home, 2 away each.
    for (let d = 0; d < 4; d++) {
      const e = d ^ intraOffset;
      if (e < d) continue;
      crossDivisions(divs[d]!, divs[e]!, season, add);
    }
    // 2 same-place games against the two remaining divisions. Those four divisions form a
    // cycle a1 - b1 - a2 - b2 - a1; hosting runs one way round it, so each team is 1 home, 1 away.
    const a1 = 0, a2 = intraOffset;
    const others = [1, 2, 3].filter((x) => x !== a2);
    const [b1, b2] = others as [number, number];
    const cycle = flip ? [a1, b2, a2, b1] : [a1, b1, a2, b2];
    for (let place = 0; place < 4; place++) {
      for (let k = 0; k < 4; k++) {
        const host = divs[cycle[k]!]![place]!;
        const guest = divs[cycle[(k + 1) % 4]!]![place]!;
        add(host, guest);
      }
    }
  }

  // 4 against a division in the other conference.
  for (let d = 0; d < 4; d++) crossDivisions(conf[0]![d]!, conf[1]![mod(d + interShift, 4)]!, season, add);

  // The 17th game: same place, a cross-conference division not played in full.
  // Conference 0 hosts in odd seasons, conference 1 in even ones.
  const hostConf = mod(season, 2) === 1 ? 0 : 1;
  for (let d = 0; d < 4; d++) {
    const other = mod(d + interShift + 2, 4);
    for (let place = 0; place < 4; place++) {
      const t0 = conf[0]![d]![place]!;
      const t1 = conf[1]![other]![place]!;
      if (hostConf === 0) add(t0, t1); else add(t1, t0);
    }
  }
  return out;
}

/** A full 4x4 meeting where every team hosts 2 and visits 2. */
function crossDivisions(
  a: readonly TeamId[], b: readonly TeamId[], season: number,
  add: (home: TeamId, away: TeamId) => void,
): void {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    if ((i + j + season) % 2 === 0) add(a[i]!, b[j]!); else add(b[j]!, a[i]!);
  }
}

function finishOrder(div: Division, previousFinish: Readonly<Record<string, readonly TeamId[]>>): TeamId[] {
  const given = previousFinish[div.id as string];
  if (!given) return [...div.teams];
  const same = given.length === div.teams.length && new Set(given).size === given.length
    && given.every((t) => div.teams.includes(t));
  if (!same) throw new Error(`buildSchedule: previousFinish for ${div.id} must list exactly that division's teams`);
  return [...given];
}

// ---------------------------------------------------------------------------------------------
// The weeks: place every matchup in a week so each team plays once a week except its bye.

interface Layout { games: { week: number; m: Matchup }[]; byes: { team: TeamId; week: number }[] }

function assignWeeks(
  matchups: readonly Matchup[], teams: readonly TeamId[], divisions: readonly Division[],
  rules: LeagueRules, rng: Rng,
): Layout | null {
  const weeks = rules.weeksPerSeason;
  // Byes: an even number per week (so the rest pair up), 32 spread over weeks 5-14.
  const byeWeek = new Map<TeamId, number>();
  const window = BYE_WINDOW.last - BYE_WINDOW.first + 1;
  const counts = new Array<number>(window).fill(0);
  for (let left = teams.length; left > 0; left -= 2) counts[(teams.length - left) / 2 % window]! += 2;
  const slots = shuffled(counts.flatMap((n, i) => new Array<number>(n).fill(BYE_WINDOW.first + i)), rng);
  shuffled(teams, rng).forEach((t, i) => byeWeek.set(t, slots[i]!));

  const remaining = matchups.map((m, i) => ({ ...m, i }));
  const used = new Array<boolean>(matchups.length).fill(false);
  const placed: { week: number; m: Matchup }[] = [];
  const lastWeekPairs = new Map<number, Set<string>>();

  // Week 18 first: all division games. Each division picks one of its three pairings.
  const finalWeek = new Set<string>();
  for (const div of divisions) {
    const [a, b, c, d] = div.teams as [TeamId, TeamId, TeamId, TeamId];
    const pairing = rng.pick([[[a, b], [c, d]], [[a, c], [b, d]], [[a, d], [b, c]]] as const);
    for (const [x, y] of pairing) {
      const options = remaining.filter((m) => !used[m.i] && m.division && samePair(m, x, y));
      const pick = rng.pick(options);
      used[pick.i] = true;
      placed.push({ week: weeks, m: pick });
      finalWeek.add(pairKey(x, y));
    }
  }
  lastWeekPairs.set(weeks, finalWeek);

  for (let week = 1; week < weeks; week++) {
    const active = teams.filter((t) => byeWeek.get(t) !== week);
    const blocked = new Set<string>([...(lastWeekPairs.get(week - 1) ?? []), ...(week === weeks - 1 ? finalWeek : [])]);
    const open = remaining.filter((m) => !used[m.i] && !blocked.has(pairKey(m.home, m.away))
      && byeWeek.get(m.home) !== week && byeWeek.get(m.away) !== week);
    const chosen = perfectMatching(active, open, rng);
    if (!chosen) return null;
    const pairs = new Set<string>();
    for (const m of chosen) {
      used[m.i] = true;
      placed.push({ week, m });
      pairs.add(pairKey(m.home, m.away));
    }
    lastWeekPairs.set(week, pairs);
  }
  if (used.some((u) => !u)) return null;
  return { games: placed, byes: teams.map((team) => ({ team, week: byeWeek.get(team)! })) };
}

/**
 * Pick one game for every active team this week. Depth-first, always expanding the team with
 * the fewest options; among options, pairs with two games still to play go first so division
 * rematches are not left to pile up at the end.
 */
function perfectMatching<M extends Matchup & { i: number }>(
  active: readonly TeamId[], open: readonly M[], rng: Rng,
): M[] | null {
  const byTeam = new Map<TeamId, M[]>(active.map((t) => [t, []]));
  const pairCount = new Map<string, number>();
  for (const m of open) {
    byTeam.get(m.home)?.push(m);
    byTeam.get(m.away)?.push(m);
    const k = pairKey(m.home, m.away);
    pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
  }
  for (const [t, list] of byTeam) byTeam.set(t, shuffled(list, rng));
  const matched = new Set<TeamId>();
  const chosen: M[] = [];
  let nodes = 0;

  const solve = (): boolean => {
    if (matched.size === active.length) return true;
    if (++nodes > WEEK_NODE_BUDGET) return false;
    let best: TeamId | null = null;
    let bestOptions: M[] = [];
    for (const t of active) {
      if (matched.has(t)) continue;
      const opts = byTeam.get(t)!.filter((m) => !matched.has(other(m, t)));
      if (opts.length === 0) return false;
      if (best === null || opts.length < bestOptions.length) { best = t; bestOptions = opts; }
    }
    const t = best!;
    const ordered = [...bestOptions].sort((x, y) =>
      (pairCount.get(pairKey(y.home, y.away))! - pairCount.get(pairKey(x.home, x.away))!));
    const tried = new Set<string>();
    for (const m of ordered) {
      const o = other(m, t);
      if (tried.has(o)) continue; // both games of a pair are interchangeable here
      tried.add(o);
      matched.add(t); matched.add(o); chosen.push(m);
      if (solve()) return true;
      matched.delete(t); matched.delete(o); chosen.pop();
      if (nodes > WEEK_NODE_BUDGET) return false;
    }
    return false;
  };
  return solve() ? chosen : null;
}

// ---------------------------------------------------------------------------------------------

function toSchedule(season: number, placed: Layout["games"], byes: Layout["byes"]): SeasonSchedule {
  const games: ScheduledGame[] = placed
    .map(({ week, m }) => ({
      gameId: gameId(`S${season}-W${String(week).padStart(2, "0")}-${m.away}@${m.home}`),
      season,
      kind: "REGULAR" as const,
      at: { season, phase: "REGULAR_SEASON" as const, week, day: GAME_DAY },
      home: m.home,
      away: m.away,
      neutralSite: false,
    }))
    .sort((a, b) => a.at.week - b.at.week || (a.gameId < b.gameId ? -1 : a.gameId > b.gameId ? 1 : 0));
  const sortedByes = [...byes].sort((a, b) => a.week - b.week || (a.team < b.team ? -1 : 1));
  return { season, games, byes: sortedByes };
}

function other(m: Matchup, t: TeamId): TeamId { return m.home === t ? m.away : m.home; }
function samePair(m: Matchup, x: TeamId, y: TeamId): boolean {
  return (m.home === x && m.away === y) || (m.home === y && m.away === x);
}
function pairKey(x: TeamId, y: TeamId): string { return x < y ? `${x}|${y}` : `${y}|${x}`; }
function mod(n: number, m: number): number { return ((n % m) + m) % m; }

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
