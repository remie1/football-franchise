/**
 * THE STAND-IN LEAGUE FOR THE SEASON (ADR-088 R5): the real NFL's players with made-up names,
 * read from the league file `@ff/attributes`' real importer writes
 * (`pnpm --filter @ff/attributes import-real`).
 *
 * A FILE, not an import: calibration's permitted surface in attributes stays
 * `generateLeagueRosters` alone (ADR-079 R1), so no Charter rule changes. The file carries a
 * `RatedLeague` whose teams use the franchise league's ids (`T01`..`T32`, real divisions in
 * `buildLeague` order); each franchise team takes its stand-in's name, roster and depth chart.
 */
import type { PlayerState, RatedLeague, Team } from "@ff/contracts";
import type { League } from "@ff/franchise";
import { makeProvenancedLeague, type ProvenancedLeague } from "../league/provenance.js";

export type StandInLeague = ProvenancedLeague<"REAL_STAND_IN">;

export const STANDIN_FILE_FORMAT = "ff-standin-league/1";

interface StandInFile {
  readonly format: string;
  readonly season: number;
  readonly snapshotDate: string;
  readonly league: RatedLeague;
}

/** Parse a league file: traits come back from JSON as lists and go back into Sets. */
export function readStandInFile(text: string): StandInFile {
  const file = JSON.parse(text) as StandInFile;
  if (file.format !== STANDIN_FILE_FORMAT) throw new Error(`not a stand-in league file (format "${String(file.format)}", expected "${STANDIN_FILE_FORMAT}")`);
  const players: PlayerState[] = file.league.players.map((p) => ({
    ...p,
    attributes: { ...p.attributes, traits: new Set<string>(p.attributes.traits as unknown as string[]) },
  }));
  return { ...file, league: { ...file.league, players } };
}

/** The franchise league with each team's stand-in identity and squad, and the rated league that plays. */
export function buildStandInLeague(base: League, file: StandInFile): { league: League; rated: StandInLeague } {
  const byId = new Map(file.league.teams.map((t) => [String(t.id), t]));
  const teams: Team[] = base.teams.map((t) => {
    const s = byId.get(String(t.id));
    if (s === undefined) throw new Error(`stand-in league file has no team ${String(t.id)}`);
    return { ...t, displayName: s.displayName, city: s.city, roster: s.roster, depthChart: s.depthChart };
  });
  const rated = makeProvenancedLeague(
    "REAL_STAND_IN",
    `standin-${file.snapshotDate}`,
    `${teams.length} teams of stand-ins for the real NFL players as of ${file.snapshotDate} (ADR-088): ` +
      `real teams, ages, sizes, depth charts; made-up names; first-version ratings.`,
    { ...file.league, teams },
  );
  return { league: { ...base, teams }, rated };
}
