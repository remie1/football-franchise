/**
 * ADR-081 "how good is this team?": the truth side of points 2, 3, 6 and 9.
 *
 * 1. Each position's starters (the depth chart's top `STARTERS[position]`, filled from the rest of
 *    the roster by overall when the chart is short) are rated by their position overall.
 * 2. Each group's level is its starters' mean overall. Its value is that level above replacement
 *    times the group's weight: points of margin a game per rating point, measured through the engine
 *    (calibration `group-weights`: one team's group raised 10 points against flat opponents).
 * 3. Unit strength is the sum of its groups' values; team strength is the sum of the units, in
 *    points of margin a game over a team of replacement players.
 * 4. Two teams' strength gap is the margin one should win by; the win chance is that gap over the
 *    spread of single-game margins (the same measure's control games), through the normal curve.
 */
import { positionOverall, type PlayerState, type Position, type Team, type TeamId } from "@ff/contracts";
import { REPLACEMENT_GRADE, STARTERS } from "../draft/board.js";

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

/** Points of margin a game per rating point of the group's starters. MEASURED: see GROUP_WEIGHTS_SOURCE. */
export const GROUP_WEIGHTS: Readonly<Record<MeetingGroup, number>> = {
  QB: 0.3, RB: 0.1, WR: 0.2, TE: 0.05, OL: 0.25, DL: 0.25, LB: 0.1, CB: 0.15, S: 0.1, ST: 0.05,
};
export const GROUP_WEIGHTS_SOURCE = "PLACEHOLDER";

export const STRENGTH = {
  /** The spread (SD) of single-game margins between even teams, in points. MEASURED with the weights. */
  marginSd: 14,
} as const;

export interface Starter { player: PlayerState; position: Position; overall: number }

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

export function teamStrength(team: Team, players: ReadonlyMap<string, PlayerState>, weights: Readonly<Record<MeetingGroup, number>> = GROUP_WEIGHTS): TeamStrength {
  const units: Record<Unit, number> = { OFFENSE: 0, DEFENSE: 0, SPECIAL_TEAMS: 0 };
  const sums = new Map<MeetingGroup, { total: number; n: number }>();
  const starters: Starter[] = [];
  for (const { player, position } of startersOf(team, players)) {
    const overall = positionOverall(position, player.attributes.values);
    starters.push({ player, position, overall });
    const g = GROUP_OF[position];
    const s = sums.get(g) ?? { total: 0, n: 0 };
    s.total += overall; s.n++;
    sums.set(g, s);
  }
  const groups: Partial<Record<MeetingGroup, number>> = {};
  for (const [g, s] of sums) {
    groups[g] = s.total / s.n;
    units[UNIT_OF[g]] += (s.total / s.n - REPLACEMENT_GRADE) * weights[g];
  }
  return { team: team.id, total: units.OFFENSE + units.DEFENSE + units.SPECIAL_TEAMS, units, groups, starters };
}

/** Every team's strength. */
export function leagueStrength(teams: readonly Team[], players: readonly PlayerState[], weights?: Readonly<Record<MeetingGroup, number>>): TeamStrength[] {
  const byId = new Map(players.map((p) => [String(p.bio.id), p]));
  return teams.map((t) => teamStrength(t, byId, weights));
}

/** The standard normal curve's cumulative share (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
export function normalShare(z: number): number {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/** The chance a team of `strength` beats a team of `opponent` strength (a tie counts as half), neutral field. */
export function strengthWinShare(strength: number, opponent: number, marginSd: number = STRENGTH.marginSd): number {
  return normalShare((strength - opponent) / marginSd);
}
