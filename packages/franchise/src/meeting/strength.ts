/**
 * ADR-081 "how good is this team?": the truth side of points 2, 3, 6 and 9.
 *
 * 1. Each position's starters (the depth chart's top `STARTERS[position]`, filled from the rest of
 *    the roster by overall when the chart is short) are rated by their position overall.
 * 2. A starter's value is his overall above replacement times his position's weight. The weights are
 *    an input: `STRENGTH_WEIGHTS` starts from the draft's position values (ADR-086, CHOSEN) until the
 *    calibration measure (group boosts played through the engine) replaces them.
 * 3. Unit strength is the sum of its starters' values; team strength is the sum of the units.
 * 4. Strength becomes a win share through a logistic on the gap to the league's mean strength.
 *    `STRENGTH.winScale` is fitted to played seasons by calibration; CHOSEN until then.
 *
 * Groups are for the meeting's talk ("our secondary"): each group's mean starter overall.
 */
import { positionOverall, type PlayerState, type Position, type Team, type TeamId } from "@ff/contracts";
import { POSITION_VALUE, REPLACEMENT_GRADE, STARTERS } from "../draft/board.js";

export type Unit = "OFFENSE" | "DEFENSE" | "SPECIAL_TEAMS";
export type MeetingGroup = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "CB" | "S" | "ST";

export const GROUP_OF: Readonly<Record<Position, MeetingGroup>> = {
  QB: "QB", RB: "RB", FB: "RB", WR: "WR", TE: "TE", LT: "OL", LG: "OL", C: "OL", RG: "OL", RT: "OL",
  DE: "DL", DT: "DL", NT: "DL", OLB: "LB", MLB: "LB", ILB: "LB", CB: "CB", FS: "S", SS: "S", K: "ST", P: "ST", LS: "ST",
};
export const UNIT_OF: Readonly<Record<MeetingGroup, Unit>> = {
  QB: "OFFENSE", RB: "OFFENSE", WR: "OFFENSE", TE: "OFFENSE", OL: "OFFENSE",
  DL: "DEFENSE", LB: "DEFENSE", CB: "DEFENSE", S: "DEFENSE", ST: "SPECIAL_TEAMS",
};

/** Weight of a starter's overall above replacement, by position. Draft values until measured (CHOSEN). */
export const STRENGTH_WEIGHTS: Readonly<Record<Position, number>> = POSITION_VALUE;

export const STRENGTH = {
  /** Strength points above the league mean that make a 73% team (e = 1 in the logistic). CHOSEN. */
  winScale: 40,
} as const;

export interface Starter { player: PlayerState; position: Position; overall: number; value: number }

export interface TeamStrength {
  team: TeamId;
  total: number;
  units: Record<Unit, number>;
  /** Each group's mean starter overall (groups with no starters are absent). */
  groups: Partial<Record<MeetingGroup, number>>;
  starters: Starter[];
}

const POSITIONS = Object.keys(STARTERS) as Position[];
const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** A team's starters: the depth chart's top men at each position, filled by overall from the rest of the roster. */
export function startersOf(team: Team, players: ReadonlyMap<string, PlayerState>): { player: PlayerState; position: Position }[] {
  const used = new Set<string>();
  const out: { player: PlayerState; position: Position }[] = [];
  const roster = team.roster.map((id) => players.get(String(id))).filter((p): p is PlayerState => p !== undefined);
  for (const position of POSITIONS) {
    const want = STARTERS[position];
    if (want === 0) continue;
    const picked: PlayerState[] = [];
    for (const id of team.depthChart[position] ?? []) {
      if (picked.length >= want) break;
      const p = players.get(String(id));
      if (p && !used.has(String(id)) && team.roster.some((r) => String(r) === String(id))) { picked.push(p); used.add(String(id)); }
    }
    if (picked.length < want) {
      const rest = roster
        .filter((p) => p.bio.position === position && !used.has(String(p.bio.id)))
        .sort((a, b) => positionOverall(position, b.attributes.values) - positionOverall(position, a.attributes.values) || byString(String(a.bio.id), String(b.bio.id)));
      for (const p of rest) {
        if (picked.length >= want) break;
        picked.push(p);
        used.add(String(p.bio.id));
      }
    }
    for (const player of picked) out.push({ player, position });
  }
  return out;
}

export function teamStrength(team: Team, players: ReadonlyMap<string, PlayerState>, weights: Readonly<Record<Position, number>> = STRENGTH_WEIGHTS): TeamStrength {
  const units: Record<Unit, number> = { OFFENSE: 0, DEFENSE: 0, SPECIAL_TEAMS: 0 };
  const sums = new Map<MeetingGroup, { total: number; n: number }>();
  const starters: Starter[] = [];
  for (const { player, position } of startersOf(team, players)) {
    const overall = positionOverall(position, player.attributes.values);
    const value = (overall - REPLACEMENT_GRADE) * weights[position];
    starters.push({ player, position, overall, value });
    const g = GROUP_OF[position];
    units[UNIT_OF[g]] += value;
    const s = sums.get(g) ?? { total: 0, n: 0 };
    s.total += overall; s.n++;
    sums.set(g, s);
  }
  const groups: Partial<Record<MeetingGroup, number>> = {};
  for (const [g, s] of sums) groups[g] = s.total / s.n;
  return { team: team.id, total: units.OFFENSE + units.DEFENSE + units.SPECIAL_TEAMS, units, groups, starters };
}

/** Every team's strength. */
export function leagueStrength(teams: readonly Team[], players: readonly PlayerState[], weights?: Readonly<Record<Position, number>>): TeamStrength[] {
  const byId = new Map(players.map((p) => [String(p.bio.id), p]));
  return teams.map((t) => teamStrength(t, byId, weights));
}

/** The share of games a team of `strength` should win in a league whose mean strength is `mean`. */
export function strengthWinShare(strength: number, mean: number, scale: number = STRENGTH.winScale): number {
  return 1 / (1 + Math.exp(-(strength - mean) / scale));
}
