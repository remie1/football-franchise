/**
 * ADR-081: the game's own correct answer to each of the nine points, for one team. The user never
 * sees it; the staff's claims are graded against it.
 */
import type { PlayerContract, PlayerId, PlayerState, SeasonState, Team, TeamDirection, TeamId } from "@ff/contracts";
import { seasonLuck, type TeamLuck } from "./luck.js";
import { projectTeam, weakestGroups, type TeamProjection } from "./projection.js";
import { STRENGTH, strengthWinShare, UNIT_OF, type MeetingGroup, type Unit } from "./strength.js";

/** Regular-season games a team plays (the meeting's win counts). */
export const SEASON_GAMES = 17;

/** WINDOW (point 9): the course the numbers say. CHOSEN thresholds on projected win share. */
export const WINDOW = { contend: 0.6, rebuild: 0.45 } as const;

/** A player's expected change, for DECLINE and GROWTH: this many points either way to count. CHOSEN. */
export const CHANGE_MARK = 1.5;

export interface MeetingTruth {
  team: TeamId;
  season: number;
  luck: TeamLuck;
  projection: TeamProjection;
  /** Group levels now (GOOD_AND_BAD) and next season (HOLES). */
  groupsNow: Partial<Record<MeetingGroup, number>>;
  groupsNext: Partial<Record<MeetingGroup, number>>;
  /** Units' strength now, and each unit's rank in the league (1 = best). */
  units: Record<Unit, { strength: number; rank: number }>;
  /** Projected wins next season and the season after, against the league's mean projected team. */
  winsNext: number;
  winsAfter: number;
  /** Starters projected to drop or grow by at least CHANGE_MARK next season, biggest move first. */
  decline: PlayerId[];
  growth: PlayerId[];
  /** Expiring now (LOSSES) and after next season (MONEY_CLIFF), best player first. */
  losses: PlayerId[];
  cliff: PlayerId[];
  window: TeamDirection;
}

export function windowOf(next: number, after: number): TeamDirection {
  if (next >= WINDOW.contend) return "CONTEND";
  if (next < 0.5 && after < WINDOW.rebuild) return "REBUILD";
  return "RETOOL";
}

export interface LeagueTruthInput {
  teams: readonly Team[];
  players: readonly PlayerState[];
  contracts: readonly PlayerContract[];
  state: SeasonState;
}

/** Every team's truth for the season just played. */
export function leagueTruth(input: LeagueTruthInput): MeetingTruth[] {
  const luck = new Map(seasonLuck(input.state).map((l) => [String(l.team), l]));
  const projections = input.teams.map((t) => projectTeam(t, input.players, input.contracts, input.state.season));
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const meanNext = mean(projections.map((p) => p.next.total));
  const meanAfter = mean(projections.map((p) => p.after.total));
  const unitRank = (u: Unit) => {
    const order = projections.map((p, i) => ({ i, s: p.now.units[u] })).sort((a, b) => b.s - a.s || a.i - b.i);
    const rank = new Map(order.map((o, r) => [o.i, r + 1]));
    return (i: number) => rank.get(i)!;
  };
  const ranks = { OFFENSE: unitRank("OFFENSE"), DEFENSE: unitRank("DEFENSE"), SPECIAL_TEAMS: unitRank("SPECIAL_TEAMS") };

  return input.teams.map((team, i) => {
    const p = projections[i]!;
    const startersNow = new Set(p.now.starters.map((s) => String(s.player.bio.id)));
    const moves = p.change.filter((c) => startersNow.has(String(c.player.bio.id))).map((c) => ({ id: c.player.bio.id, d: c.next - c.now }));
    const byOverall = (ps: PlayerState[]) => {
      const ov = new Map(p.change.map((c) => [String(c.player.bio.id), c.now]));
      return [...ps].sort((a, b) => ov.get(String(b.bio.id))! - ov.get(String(a.bio.id))! || (String(a.bio.id) < String(b.bio.id) ? -1 : 1)).map((x) => x.bio.id);
    };
    const shareNext = strengthWinShare(p.next.total, meanNext, STRENGTH.marginSd);
    const shareAfter = strengthWinShare(p.after.total, meanAfter, STRENGTH.marginSd);
    const units = {} as Record<Unit, { strength: number; rank: number }>;
    for (const u of ["OFFENSE", "DEFENSE", "SPECIAL_TEAMS"] as const) units[u] = { strength: p.now.units[u], rank: ranks[u](i) };
    return {
      team: team.id, season: input.state.season,
      luck: luck.get(String(team.id))!,
      projection: p,
      groupsNow: p.now.groups, groupsNext: p.next.groups,
      units,
      winsNext: shareNext * SEASON_GAMES, winsAfter: shareAfter * SEASON_GAMES,
      decline: moves.filter((m) => m.d <= -CHANGE_MARK).sort((a, b) => a.d - b.d).map((m) => m.id),
      growth: moves.filter((m) => m.d >= CHANGE_MARK).sort((a, b) => b.d - a.d).map((m) => m.id),
      losses: byOverall(p.expiring), cliff: byOverall(p.expiringNext),
      window: windowOf(shareNext, shareAfter),
    };
  });
}

export { UNIT_OF, weakestGroups };
