/**
 * THE STAND-IN LEAGUE FILE (ADR-088 R5): its format, its one serializer, the starting development
 * step on a whole file (ADR-087 §2.5, `development.ts`), and its officiating block (ADR-093 step 1b,
 * `officials.ts`).
 *
 * All three commands write through `serializeLeagueFile`: `import-real` (`main.ts`), which builds the
 * file, `standin-development` (`developMain.ts`), which refreshes the records on one already built, and
 * `standin-officials` (`officialsMain.ts`), which puts in or refreshes the 17 copied crews. So a file
 * `import-real` writes and the same file refreshed are the same bytes. The block sits just before
 * `startingDevelopment`, so the two refreshing steps commute and each changes nothing run twice.
 * `officiatingWrites` and `importRealWrites` decide what the two officials commands write.
 */
import type { PlayerState, RatedLeague } from "@ff/contracts";
import type { Measurements } from "../../fictional/derive.js";
import { standInDevelopment, type StartingDevelopment } from "./development.js";
import type { CareerHistory } from "./history.js";
import type { StandInOfficiating } from "./officials.js";
import { sealedTableText, type RosterStatus, type SealedTable } from "./standins.js";

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
  /** The 17 copied crews (ADR-093 step 1b); absent in a file from before them. */
  readonly officiating?: StandInOfficiating;
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

/** The file with its `officiating` block (ADR-093 step 1b) put in or replaced, just before `startingDevelopment`; nothing else changes. */
export function withOfficiating<F extends LeagueFileLike>(file: F, officiating: StandInOfficiating): F {
  if (file.format !== LEAGUE_FILE_FORMAT) throw new Error(`not a stand-in league file (format "${String(file.format)}", expected "${LEAGUE_FILE_FORMAT}")`);
  const { officiating: _old, startingDevelopment, ...rest } = file;
  return { ...rest, officiating, ...(startingDevelopment === undefined ? {} : { startingDevelopment }) } as unknown as F;
}

/**
 * A stand-in league file's text, read (ADR-093 step 1b): refused when it is no stand-in league file, or when
 * it does not read back as `serializeLeagueFile` writes it, since a rewrite would then move other bytes.
 */
export function readLeagueText(text: string, path: string): LeagueFileLike {
  const file = JSON.parse(text) as LeagueFileLike;
  if (file.format !== LEAGUE_FILE_FORMAT) throw new Error(`not a stand-in league file (format "${String(file.format)}", expected "${LEAGUE_FILE_FORMAT}")`);
  if (serializeLeagueFile(file) !== text) {
    throw new Error(`${path} is not as the league file's serializer writes it, so a rewrite would move other bytes: nothing written`);
  }
  return file;
}

/**
 * standin-officials' two writes (ADR-093 step 1b), decided before anything is written: the league file's
 * text with the block put in or replaced, or null when that is the text read; and the referees' sealed
 * table's text, or null when that is the text there (`sealedTableText`). Refuses a file `readLeagueText`
 * refuses, and one whose bytes outside the block would move (a key after `startingDevelopment`, say,
 * which `withOfficiating` would leave before the block).
 */
export function officiatingWrites(input: {
  readonly path: string;
  /** The league file as read. */
  readonly text: string;
  readonly officiating: StandInOfficiating;
  /** The referees' sealed table after the run. */
  readonly sealed: SealedTable;
  /** Its text before the run; undefined when there was none. */
  readonly sealedText: string | undefined;
}): { readonly league: string | null; readonly sealed: string | null } {
  const file = readLeagueText(input.text, input.path);
  const next = withOfficiating(file, input.officiating);
  const outside = (f: LeagueFileLike) => {
    const { officiating: _o, ...rest } = f;
    return serializeLeagueFile(rest);
  };
  if (outside(next) !== outside(file)) throw new Error(`${input.path} would change outside its officiating block; nothing written`);
  const after = serializeLeagueFile(next);
  return { league: after === input.text ? null : after, sealed: sealedTableText(input.sealed, input.sealedText) };
}

/**
 * import-real's two writes (ADR-093 step 1b): the league file's text, with the copied crews' block just
 * before `startingDevelopment` when there are crews; and the referees' sealed table's text, or null when
 * there are no crews or it is the text there already.
 */
export function importRealWrites(
  file: LeagueFileLike,
  crews: { readonly officiating: StandInOfficiating; readonly sealed: SealedTable } | null,
  refereesText: string | undefined,
): { readonly league: string; readonly referees: string | null } {
  return {
    league: serializeLeagueFile(crews === null ? file : withOfficiating(file, crews.officiating)),
    referees: crews === null ? null : sealedTableText(crews.sealed, refereesText),
  };
}
