/**
 * THE STAND-IN LEAGUE FILE (ADR-088 R5): its format, its one serializer, and the starting
 * development step on a whole file (ADR-087 §2.5, `development.ts`).
 *
 * Both commands write through `serializeLeagueFile`: `import-real` (`main.ts`), which builds the file,
 * and `standin-development` (`developMain.ts`), which refreshes the records on one already built.
 * So a file `import-real` writes and the same file refreshed are the same bytes.
 */
import type { PlayerState, RatedLeague } from "@ff/contracts";
import type { Measurements } from "../../fictional/derive.js";
import { standInDevelopment, type StartingDevelopment } from "./development.js";
import type { CareerHistory } from "./history.js";
import type { RosterStatus } from "./standins.js";

export const LEAGUE_FILE_FORMAT = "ff-standin-league/1";

/** The file as written (Sets as lists), one line, ending in a newline. */
export function serializeLeagueFile(file: unknown): string {
  return JSON.stringify(file, (_k, v) => (v instanceof Set ? [...v] : v)) + "\n";
}

/** The parts of a league file this step reads; everything else passes through untouched. */
export interface LeagueFileLike {
  readonly format: string;
  readonly season: number;
  readonly snapshotDate: string;
  readonly league: RatedLeague & {
    readonly provenance: {
      readonly status: Readonly<Record<string, RosterStatus>>;
      readonly measurements: Readonly<Record<string, Partial<Measurements>>>;
      readonly history: Readonly<Record<string, CareerHistory>>;
    };
  };
  readonly startingDevelopment?: StartingDevelopment;
  readonly [key: string]: unknown;
}

/**
 * The file with every stand-in's starting development made afresh (any earlier records taken off
 * first) and the `startingDevelopment` key last. Nothing else in it changes: running it on its own
 * output gives the same file.
 */
export function withStartingDevelopment<F extends LeagueFileLike>(file: F): F {
  if (file.format !== LEAGUE_FILE_FORMAT) throw new Error(`not a stand-in league file (format "${String(file.format)}", expected "${LEAGUE_FILE_FORMAT}")`);
  const p = file.league.provenance;
  const made = standInDevelopment({
    season: file.season, snapshotDate: file.snapshotDate, players: file.league.players as PlayerState[],
    status: p.status, measurements: p.measurements, history: p.history,
  });
  const { startingDevelopment: _old, ...rest } = file;
  return { ...rest, league: { ...file.league, players: made.players }, startingDevelopment: made.startingDevelopment } as unknown as F;
}
