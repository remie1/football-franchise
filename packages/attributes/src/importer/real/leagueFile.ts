/**
 * THE STAND-IN LEAGUE FILE (ADR-088 R5): its format, its one serializer, the starting development
 * step on a whole file (ADR-087 §2.5, `development.ts`), its officiating block (ADR-093 step 1b,
 * `officials.ts`) and its past injuries block (ADR-087 AB7, `pastInjuries.ts`).
 *
 * All five commands write through `serializeLeagueFile`: `import-real` (`main.ts`), which builds
 * the file, `standin-development` (`developMain.ts`), which refreshes the records on one already
 * built, `standin-contracts` (`contractsMain.ts`), which rebuilds its estimated deals in place,
 * `standin-officials` (`officialsMain.ts`), which puts in or refreshes the 17 copied crews, and
 * `standin-injuries` (`injuriesCommand.ts`), which puts in or refreshes the `pastInjuries` block and
 * reruns the records so each man's `condition.injuryHistory` is copied from it. So a file
 * `import-real` writes and the same file refreshed are the same bytes. The keys end
 * `…, picksSource, pastInjuries, officiating, startingDevelopment`: each block keeps its place
 * whichever command runs, so `standin-development`, `standin-officials` and `standin-injuries`
 * commute. `standin-contracts` changes only `contracts`, which keeps its place; none of the others
 * reads it, and it reads nothing they change, so it commutes with all three. Each changes nothing
 * run twice. `officiatingWrites`, `pastInjuriesWrites` and `importRealWrites` decide what the
 * commands write.
 */
import type { PlayerState, RatedLeague } from "@ff/contracts";
import type { Measurements } from "../../fictional/derive.js";
import { NO_PAST_INJURIES_VERSION, STARTING_DEVELOPMENT_VERSION, standInDevelopment, type StartingDevelopment } from "./development.js";
import type { CareerHistory } from "./history.js";
import type { StandInOfficiating } from "./officials.js";
import type { PastInjuriesBlock } from "./pastInjuries.js";
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
  /** The stand-ins' past injuries (ADR-087 AB7, `standin-injuries`); absent in a file without them. */
  readonly pastInjuries?: PastInjuriesBlock;
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
    ...(file.pastInjuries === undefined ? {} : { pastInjuries: file.pastInjuries }),
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
 * The file with its `pastInjuries` block (ADR-087 AB7) put in or replaced: just before `officiating` when
 * there is one, else just before `startingDevelopment`, else last. Nothing else changes; the records that
 * copy it (`condition.injuryHistory`) are `withStartingDevelopment`'s to write.
 */
export function withPastInjuries<F extends LeagueFileLike>(file: F, block: PastInjuriesBlock): F {
  if (file.format !== LEAGUE_FILE_FORMAT) throw new Error(`not a stand-in league file (format "${String(file.format)}", expected "${LEAGUE_FILE_FORMAT}")`);
  const { pastInjuries: _old, officiating, startingDevelopment, ...rest } = file;
  return {
    ...rest, pastInjuries: block,
    ...(officiating === undefined ? {} : { officiating }), ...(startingDevelopment === undefined ? {} : { startingDevelopment }),
  } as unknown as F;
}

/**
 * The file with AB7's additions taken off, and nothing else: the `pastInjuries` block, every man's
 * `condition.injuryHistory`, `startingDevelopment.basis.injuryHistory`, and the version back from `/3` to
 * `/2`. A file with no block is given back as it is. The pins on the committed file read it through this,
 * so they hold before and after the block is put in.
 */
export function withoutPastInjuries<F extends LeagueFileLike>(file: F): F {
  if (file.pastInjuries === undefined) return file;
  const { pastInjuries: _b, ...rest } = file;
  const players = (file.league.players as PlayerState[]).map((p) => {
    if (p.condition.injuryHistory === undefined) return p;
    const { injuryHistory: _h, ...condition } = p.condition;
    return { ...p, condition };
  });
  const sd = file.startingDevelopment;
  const startingDevelopment = sd === undefined ? undefined : (() => {
    const { injuryHistory: _x, ...basis } = sd.basis;
    return { ...sd, version: sd.version === STARTING_DEVELOPMENT_VERSION ? NO_PAST_INJURIES_VERSION : sd.version, basis };
  })();
  return { ...rest, league: { ...file.league, players }, ...(startingDevelopment === undefined ? {} : { startingDevelopment }) } as unknown as F;
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
 * standin-injuries' one write (ADR-087 AB7), decided before anything is written: the league file's text with
 * the `pastInjuries` block put in or replaced and the records made again from it (`withStartingDevelopment`),
 * or null when that is the text read. Refuses a file `readLeagueText` refuses, and one that would change
 * anywhere but AB7's paths (`withoutPastInjuries`): a key after `startingDevelopment`, say, or records made
 * with other constants than today's, which this would remake.
 */
export function pastInjuriesWrites(input: { readonly path: string; readonly text: string; readonly block: PastInjuriesBlock }): string | null {
  const file = readLeagueText(input.text, input.path);
  const next = withStartingDevelopment(withPastInjuries(file, input.block));
  if (serializeLeagueFile(withoutPastInjuries(next)) !== serializeLeagueFile(withoutPastInjuries(file))) {
    throw new Error(`${input.path} would change outside its past injuries; if its records are stale, run standin-development first; nothing written`);
  }
  const after = serializeLeagueFile(next);
  return after === input.text ? null : after;
}

/** What import-real builds a file from (critic 16: one pure step, so a test can build the file as `main.ts` does). */
export interface ImportRealParts {
  readonly season: number;
  readonly snapshotDate: string;
  readonly league: LeagueFileLike["league"];
  readonly contracts: unknown;
  readonly deadMoney: unknown;
  readonly picks: unknown;
  readonly picksSource: unknown;
  readonly startingDevelopment: StartingDevelopment;
}

/** import-real's file before its blocks, in the key order it writes; `startingDevelopment` last, as `standin-development` writes it. */
export function importRealFile(parts: ImportRealParts): LeagueFileLike {
  return {
    format: LEAGUE_FILE_FORMAT, season: parts.season, snapshotDate: parts.snapshotDate, league: parts.league, contracts: parts.contracts,
    deadMoney: parts.deadMoney, picks: parts.picks, picksSource: parts.picksSource, startingDevelopment: parts.startingDevelopment,
  };
}

/**
 * import-real's two writes (ADR-093 step 1b; ADR-087 AB7): the league file's text, with the `pastInjuries`
 * block when there is one (and the records made again from it, as `standin-injuries` makes them), then the
 * copied crews' block just before `startingDevelopment` when there are crews; and the referees' sealed
 * table's text, or null when there are no crews or it is the text there already.
 */
export function importRealWrites(
  file: LeagueFileLike,
  crews: { readonly officiating: StandInOfficiating; readonly sealed: SealedTable } | null,
  refereesText: string | undefined,
  pastInjuries: PastInjuriesBlock | null = null,
): { readonly league: string; readonly referees: string | null } {
  const injured = pastInjuries === null ? file : withStartingDevelopment(withPastInjuries(file, pastInjuries));
  return {
    league: serializeLeagueFile(crews === null ? injured : withOfficiating(injured, crews.officiating)),
    referees: crews === null ? null : sealedTableText(crews.sealed, refereesText),
  };
}
