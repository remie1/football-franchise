/**
 * ADR-094 §9 (build step 6): how a head coach sizes up his team's hopes, for his lineup.
 *
 * After each regular-season week's games, every computer head coach has his own guess of the team's
 * playoff chance (§3's read: the true chance pushed by his own miss, the same guess the weekly stance
 * reads) and his pressure (how short his leash is, `headCoachPressure`). From them, for next week's
 * depth chart:
 *
 * - **A look at the young men.** His guess is under the give-up line and he is not on the hot seat:
 *   his veteran leaning falls for the week, by up to `maxVeteranDrop` points, more the lower his guess,
 *   and a younger challenger who is close gets the spot (the depth chart's `YOUTH_LOOK`). On the hot
 *   seat he plays his best chance to win, whatever his guess.
 * - **A desperate shake-up.** On the hot seat after `streak` straight losses, he benches one starter
 *   whose recent play is worst against a challenger who is close, regardless of age (`SHAKE_UP`), and
 *   his incumbent leaning is cut for the week. Only the week the streak reaches its length, so at most
 *   once a streak, with nothing to remember.
 *
 * Nothing here reads a position. The owner's team is left out. Behind its own switch (the players'
 * steps' `lineupHopes`), off by default. Rates CHOSEN.
 */
import type { SeasonState, StaffState, TeamId } from "@ff/contracts";
import { rating } from "../staff/ratings.js";
import { seatOf, type StaffWorld } from "../staff/world.js";
import { headCoachPressure } from "./pressure.js";
import { guessChance, playoffChance, recordsAfter } from "./stance.js";

export const LINEUP_HOPES = {
  /** His playoff guess under this: the season looks lost. */
  giveUp: 0.15,
  /** §9: the most his veteran leaning falls, at a guess of nothing. */
  maxVeteranDrop: 40,
  /** §9: over this pressure he is on the hot seat. */
  hotSeat: 0.5,
  /** Games played before he reads the season as lost (a guess after two games is noise). */
  minGames: 4,
  /** Straight losses that make a streak. */
  streak: 3,
  /** A shake-up's challenger is close: his coach's view at most this many rating points below the starter's. */
  shakeClose: 2,
  /** The share of his incumbent leaning left the week of a shake-up. */
  shakeIncumbent: 0.5,
} as const;

/** One coach's lineup mood for next week. */
export interface LineupHope {
  /** Points off his veteran leaning (0 when he is playing to win). */
  readonly veteranDrop: number;
  /** A younger close challenger gets the spot (`YOUTH_LOOK`). */
  readonly youthLook: boolean;
  /** Bench his worst-playing starter for a close challenger (`SHAKE_UP`). */
  readonly shakeUp: boolean;
  /** For checks: his guess, his pressure and the losing streak. */
  readonly guess: number;
  readonly pressure: number;
  readonly losses: number;
}

/** Each team's straight losses at the end of a week, from the season's results. */
export function losingStreaks(state: SeasonState, week: number): Map<string, number> {
  const weekOf = new Map(state.schedule.games.filter((g) => g.kind === "REGULAR").map((g) => [String(g.gameId), g.at.week]));
  const games = new Map<string, { week: number; lost: boolean }[]>();
  for (const r of state.results) {
    const w = weekOf.get(String(r.gameId));
    if (w === undefined || w > week) continue;
    for (const [team, us, them] of [[r.home, r.homeScore, r.awayScore], [r.away, r.awayScore, r.homeScore]] as const) {
      const list = games.get(String(team)) ?? [];
      list.push({ week: w, lost: us < them });
      games.set(String(team), list);
    }
  }
  const out = new Map<string, number>();
  for (const [team, list] of games) {
    list.sort((a, b) => b.week - a.week);
    let n = 0;
    for (const g of list) { if (!g.lost) break; n++; }
    out.set(team, n);
  }
  return out;
}

/** Every computer head coach's mood for next week's lineup, after this week's games. */
export function lineupHopes(input: {
  world: StaffWorld; state: SeasonState; season: number; week: number; seed: string; teamCount: number; ownerTeam?: TeamId;
}): Map<string, LineupHope> {
  const { world, state, season, week, seed } = input;
  const records = recordsAfter(state, week);
  const streaks = losingStreaks(state, week);
  const byId = new Map(world.staff.map((s) => [String(s.id), s]));
  const contractEnds = (s: StaffState) => world.contracts.some((c) => c.staff === s.id && c.terminated === undefined && c.lastSeason === season);
  const out = new Map<string, LineupHope>();
  for (const team of world.teams) {
    if (team.id === input.ownerTeam) continue;
    const members = team.staff.map((id) => byId.get(String(id))).filter((s): s is StaffState => s !== undefined);
    const hc = members.find((s) => seatOf(s) === "HEAD_COACH");
    const president = members.find((s) => s.role === "PRESIDENT");
    const rec = records.get(String(team.id));
    if (!hc || !president || !rec) continue;
    const played = rec.record.wins + rec.record.losses + rec.record.ties;
    const guess = guessChance(hc, playoffChance(rec.record, rec.left), seed, season, week, team.id);
    const pressure = headCoachPressure(hc, {
      season, record: rec.record, teamCount: input.teamCount,
      presidentTalent: rating(president.attributes, "talentEvaluation"), lastContractYear: contractEnds(hc),
    });
    const losses = streaks.get(String(team.id)) ?? 0;
    const hot = pressure > LINEUP_HOPES.hotSeat;
    const youthLook = !hot && played >= LINEUP_HOPES.minGames && guess < LINEUP_HOPES.giveUp;
    const veteranDrop = youthLook ? LINEUP_HOPES.maxVeteranDrop * Math.min(1, (LINEUP_HOPES.giveUp - guess) / LINEUP_HOPES.giveUp) : 0;
    const shakeUp = hot && losses === LINEUP_HOPES.streak;
    out.set(String(team.id), { veteranDrop, youthLook, shakeUp, guess, pressure, losses });
  }
  return out;
}
