/**
 * CAN THIS TEAM FIELD A SIDE? (ADR-087 §5.3, §10) The season runner owns the lineup rules, so it
 * answers for franchise's emergency signings: the position a team cannot fill from the players it
 * has fit this week, or undefined when it can play.
 *
 * A team can play when the engine's eleven a side and its kicking jobs can be filled
 * (`buildTeamSnapshot`'s chains) and the play corpus can field every personnel group it may call
 * (`@ff/playbook`'s units, with their stated fallbacks). When a group cannot be fielded, some
 * position has fewer fit players than the group asks for at that position (were every position
 * covered, each role would find one of its own): the first such role, in the playbook's allocation
 * order, names the position to sign. The kicker and the punter are asked for first and by name: the
 * snapshot would let the punter kick (and the kicker punt), but a team with its kicker out signs a
 * kicker (§5.3), not a second punter.
 */
import type { PlayerState, Position, Team } from "@ff/contracts";
import {
  buildDefensiveUnit, buildOffensiveUnit, DEFENSE_PERSONNEL, DEFENSE_ROLE_POSITION, DEFENSE_ROLES, OFFENSE_LINE_ROLES,
  OFFENSE_PERSONNEL, OFFENSE_ROLE_POSITION, PersonnelUnavailableError, SKILL_ROLES,
  type DepthChart, type OffenseRole, type DefenseRole,
} from "@ff/playbook";
import type { AnyProvenancedLeague } from "../league/provenance.js";
import { buildTeamSnapshot, RosterUnavailableError, weekDepthChart, type LeagueIndex, type WeekRoster } from "../league/snapshot.js";

/** The kicking jobs, each wanted by its own specialist. */
const SPECIALISTS: readonly Position[] = ["K", "P"];

/** The first position in `roles` with fewer fit players in the chart than the roles ask for. */
function shortOf(roles: readonly Position[], chart: DepthChart): Position | undefined {
  const asked = new Map<Position, number>();
  for (const p of roles) asked.set(p, (asked.get(p) ?? 0) + 1);
  return roles.find((p) => (chart[p]?.length ?? 0) < asked.get(p)!);
}

export function unfilledPosition(
  league: AnyProvenancedLeague, team: Team, available: ReadonlySet<string>, players: ReadonlyMap<string, PlayerState>,
): Position | undefined {
  const index: LeagueIndex = { league, teams: new Map([[String(team.id), team]]), players, teamIds: () => [team.id] };
  const roster: WeekRoster = { team: team.id, season: 0, week: 0, available, source: "SEASON_AVAILABILITY", unavailableCount: 0 };
  const chart = weekDepthChart(team, roster);
  for (const specialist of SPECIALISTS) if ((chart[specialist]?.length ?? 0) === 0) return specialist;
  try {
    buildTeamSnapshot(index, roster);
  } catch (e) {
    if (e instanceof RosterUnavailableError && e.position !== undefined) return e.position;
    throw e;
  }
  for (const group of OFFENSE_PERSONNEL) {
    try {
      buildOffensiveUnit(group, chart);
    } catch (e) {
      if (!(e instanceof PersonnelUnavailableError)) throw e;
      const roles: OffenseRole[] = [...SKILL_ROLES[group], ...OFFENSE_LINE_ROLES, "QB"];
      const short = shortOf(roles.map((r) => OFFENSE_ROLE_POSITION[r]), chart);
      if (short !== undefined) return short;
      throw e;
    }
  }
  for (const group of DEFENSE_PERSONNEL) {
    try {
      buildDefensiveUnit(group, chart);
    } catch (e) {
      if (!(e instanceof PersonnelUnavailableError)) throw e;
      const short = shortOf((DEFENSE_ROLES[group] as readonly DefenseRole[]).map((r) => DEFENSE_ROLE_POSITION[r]), chart);
      if (short !== undefined) return short;
      throw e;
    }
  }
  return undefined;
}
