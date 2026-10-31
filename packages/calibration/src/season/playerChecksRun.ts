/**
 * One season of ADR-087's D5a checks (`playerChecks.ts`): plays the season with an arm's switches on
 * generated squads and the caller default, and sums it up. The coaches are made from the world seed
 * with their depth-chart leanings (C1); the `off` arm plays today's season, coaches untouched.
 *
 * With a stand-in league file, the same on the real NFL's stand-ins (ADR-088), every arm on the file's
 * own season (ADR-087 §2.5), and the summary split by each player's roster group in the file, with
 * the starters the engine fields from the teams' real depth charts (`fieldedStarters`).
 */
import { buildLeague, buildStaff } from "@ff/franchise";
import { runRealSeason } from "./realSeason.js";
import { fieldedStarters, summariseSeason, type RosterGroup, type SeasonCheck } from "./playerChecks.js";
import type { readStandInFile } from "./standInLeague.js";

export const ARMS = {
  off: undefined,
  development: { development: true, injuries: false },
  injuries: { development: false, injuries: true },
  both: { development: true, injuries: true },
} as const;
export type Arm = keyof typeof ARMS;
export const isArm = (s: string): s is Arm => s in ARMS;

type StandInFile = ReturnType<typeof readStandInFile>;

/** Each stand-in's roster group, from the league file's `provenance.status` (active = the 53). */
export function rosterGroups(file: StandInFile): Map<string, Exclude<RosterGroup, "street">> {
  const status = (file.league.provenance as { status?: Record<string, string> } | null)?.status;
  if (status === undefined) throw new Error("the stand-in league file has no roster status (provenance.status)");
  const group = { active: "53", practice: "practice", reserve: "reserve" } as const;
  return new Map(Object.entries(status).map(([id, s]) => {
    const g = group[s as keyof typeof group];
    if (g === undefined) throw new Error(`stand-in ${id} has an unknown roster status "${s}"`);
    return [id, g];
  }));
}

export function checkSeason(seed: string, arm: Arm, season = 2027, standIn?: StandInFile): SeasonCheck {
  const players = ARMS[arm];
  // Stand-ins: every arm plays the file's season, the one the switched-on arms must play.
  const played = standIn?.season ?? season;
  const staff = players ? buildStaff(buildLeague(seed), { firstSeason: played, lineups: true }).world.staff : undefined;
  const { rated, run } = runRealSeason({
    seed, season: played,
    ...(standIn ? { rosters: "standin" as const, standIn } : {}),
    ...(players ? { players, ...(staff ? { staff } : {}) } : {}),
  });
  if (rated === undefined) throw new Error("the D5a checks need squads");
  return summariseSeason({
    seed, arm, state: run.state, events: run.events,
    startTeams: rated.league.teams, startPlayers: rated.league.players,
    ...(run.people ? { endPlayers: run.people.players } : {}),
    ...(standIn ? { groups: rosterGroups(standIn), starters: fieldedStarters(rated.league.teams) } : {}),
  });
}
