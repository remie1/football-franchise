/**
 * One season of ADR-087's D5a checks (`playerChecks.ts`): plays the season with an arm's switches on
 * generated squads and the caller default, and sums it up. The coaches are made from the world seed
 * with their depth-chart leanings (C1); the `off` arm plays today's season, coaches untouched.
 */
import { buildLeague, buildStaff } from "@ff/franchise";
import { runRealSeason } from "./realSeason.js";
import { summariseSeason, type SeasonCheck } from "./playerChecks.js";

export const ARMS = {
  off: undefined,
  development: { development: true, injuries: false },
  injuries: { development: false, injuries: true },
  both: { development: true, injuries: true },
} as const;
export type Arm = keyof typeof ARMS;
export const isArm = (s: string): s is Arm => s in ARMS;

export function checkSeason(seed: string, arm: Arm, season = 2027): SeasonCheck {
  const players = ARMS[arm];
  const staff = players ? buildStaff(buildLeague(seed), { firstSeason: season, lineups: true }).world.staff : undefined;
  const { rated, run } = runRealSeason({ seed, season, ...(players ? { players, ...(staff ? { staff } : {}) } : {}) });
  if (rated === undefined) throw new Error("the D5a checks need squads");
  return summariseSeason({
    seed, arm, state: run.state, events: run.events,
    startTeams: rated.league.teams, startPlayers: rated.league.players,
    ...(run.people ? { endPlayers: run.people.players } : {}),
  });
}
