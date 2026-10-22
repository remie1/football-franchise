/**
 * ADR-080 §5: how a coach's personality fits a roster (Spec #11 §5 style match).
 */
import type { PersonalityType, PlayerState, Team } from "@ff/contracts";
import { STYLE_MATCH } from "./tables.js";

/**
 * The style-match row of `type`, averaged over the team's players: each player weighted by how much
 * he cares about coaching style (his `coachingStyle` need, 1 when absent) and doubled for a starter
 * (first on the depth chart at a position). 0 when the team has no players we can see.
 */
export function rosterFit(type: PersonalityType, team: Team, players: ReadonlyMap<string, PlayerState>): number {
  const starters = new Set<string>();
  for (const ids of Object.values(team.depthChart)) {
    const first = ids?.[0];
    if (first !== undefined) starters.add(String(first));
  }
  let sum = 0;
  let weight = 0;
  for (const pid of team.roster) {
    const p = players.get(String(pid));
    if (!p) continue;
    const w = (p.personality.needs.coachingStyle ?? 1) * (starters.has(String(pid)) ? 2 : 1);
    sum += w * STYLE_MATCH[type][p.personality.type];
    weight += w;
  }
  return weight > 0 ? sum / weight : 0;
}
