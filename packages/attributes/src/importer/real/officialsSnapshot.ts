/**
 * THE OFFICIALS SNAPSHOT, READ (ADR-093 step 1b): the one I/O step `standin-officials`
 * (`officialsMain.ts`) and `import-real` (`main.ts`) share. It checks the folder against its manifest
 * (`verifySnapshot`), loads the schedules and the officials' and players' names, then reads and counts
 * one season of plays at a time (`countSeason`), so it holds no more than one season's rows at once.
 * `crewsOfSnapshot` is the one build both commands run on what it reads, and `copiedCrews` is
 * import-real's whole block step on top of the two. `officialsSnapshotDir` picks the folder standin-officials
 * reads, and `fetchOfficialsSnapshot` is its `--fetch`.
 *
 * What it returns holds real names (the counts' referee keys, the taken set's names, the port check's
 * spellings), so it stays inside `importer/real/`: only `standInCrews` and `table6Check` read it, and
 * what they give back carries made-up names and counts only.
 */
import { existsSync } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { LeagueFileLike } from "./leagueFile.js";
import {
  bookReferees, countSeason, crewsProblem, officialsTaken, refereePairs, scheduledGames, snapshotNames, SPREAD_WINDOW,
  STANDIN_SPREAD, standInCrews,
  type NamesBySource, type SeasonCounts, type Table6Input,
} from "./officials.js";
import { loadOfficialRows, loadPlayerNames, loadPlayRows, loadScheduleRows, type ReadRows } from "./rows.js";
import {
  fetchSnapshot, latestSnapshot, officialsFiles, OFFICIALS_SEASONS, readManifest, readRows, verifySnapshot,
  type Download, type SnapshotManifest,
} from "./snapshot.js";
import type { SealedTable } from "./standins.js";

export interface OfficialsSnapshot {
  readonly dir: string;
  readonly manifest: SnapshotManifest;
  /** Each season's counts, `season - 3` to `season`. */
  readonly counts: readonly SeasonCounts[];
  /** Every name in the snapshot a made-up referee must not take (`snapshotNames`). */
  readonly names: readonly string[];
  /** How many distinct names each source gives, for the printout. */
  readonly namesBySource: NamesBySource;
  /** The port check's input (`table6Check`): the spread window's officials-table counts and both sources' referee per game. */
  readonly check: Table6Input;
}

/**
 * Read and count an officials snapshot folder for a league file of `season`; refuses a folder of another season or one that
 * fails its manifest. `read` is the loaders' parquet reader (`ReadRows`): a test passes a stand-in.
 */
export async function readOfficialsSnapshot(dir: string, season: number, read: ReadRows = readRows): Promise<OfficialsSnapshot> {
  const manifest = await verifySnapshot(dir);
  if (manifest.season !== season) {
    throw new Error(`the officials snapshot ${dir} is of ${manifest.season}, not the league file's season ${season}`);
  }
  const seasons = Array.from({ length: OFFICIALS_SEASONS }, (_, i) => season - OFFICIALS_SEASONS + 1 + i);
  for (const key of ["schedules", "officials", "players", ...seasons.map((y) => `pbp${y}`)]) {
    if (manifest.files[key] === undefined) throw new Error(`the officials snapshot ${dir} has no ${key} file: is it an officials snapshot?`);
  }
  const schedules = await loadScheduleRows(dir, read);
  const officials = await loadOfficialRows(dir, read);
  const players = await loadPlayerNames(dir, read);
  const games = scheduledGames(schedules, seasons);
  const book = bookReferees(officials);
  const counts: SeasonCounts[] = [];
  for (const y of seasons) counts.push(countSeason(y, await loadPlayRows(dir, y, read), games, book));
  const spread = SPREAD_WINDOW.map((d) => season + d);
  const named = snapshotNames({ schedules, officials, players });
  return {
    dir,
    manifest,
    counts,
    names: named.names,
    namesBySource: named.bySource,
    check: {
      seasons: counts.filter((c) => spread.includes(c.season)).map((c) => ({ season: c.season, book: c.book })),
      pairs: refereePairs(schedules, officials, spread),
    },
  };
}

/** The two sealed tables a build reads: the players' (`sealed.json`) and the referees' (`sealed-officials.json`). */
export interface SealedTables {
  readonly players: SealedTable;
  readonly referees: SealedTable;
}

/** What `crewsOfSnapshot` builds: the block, the referees' sealed table after the run, and the report (counts only). */
export type CopiedCrewsBuilt = ReturnType<typeof standInCrews>;

/**
 * The referees' taken set for a league file (`officialsTaken`, one rule for both commands): the snapshot's
 * names, every stand-in player's name in the file, and every name in both sealed tables.
 */
export function snapshotTaken(snap: Pick<OfficialsSnapshot, "names">, file: Pick<LeagueFileLike, "league">, sealed: SealedTables): Set<string> {
  return officialsTaken({
    snapshotNames: snap.names,
    standInNames: file.league.players.map((p) => p.bio.displayName),
    playersSealed: sealed.players,
    officialsSealed: sealed.referees,
  });
}

/**
 * A league file's 17 copied crews from a read snapshot: the one build `standin-officials` and `import-real`
 * both run (ADR-093 step 1b). `standInCrews` on the snapshot's counts, the taken set (`snapshotTaken`), the
 * referees' sealed table, STANDIN_SPREAD and the file's block before this run (it feeds the report's kept
 * count only); then the local `crewsProblem`, or the run stops with nothing written. So the two commands
 * on the same snapshot, file and sealed tables build the same block.
 */
export function crewsOfSnapshot(
  snap: Pick<OfficialsSnapshot, "manifest" | "counts" | "names">,
  file: Pick<LeagueFileLike, "season" | "league" | "officiating">,
  sealed: SealedTables,
): CopiedCrewsBuilt {
  const built = standInCrews({
    season: file.season, asOf: snap.manifest.date, counts: snap.counts, taken: snapshotTaken(snap, file, sealed),
    sealed: sealed.referees, spread: STANDIN_SPREAD, before: file.officiating,
  });
  const problem = crewsProblem(built.officiating.crews, { block: built.officiating.season, file: file.season });
  if (problem !== undefined) throw new Error(`the copied crews are not a league's (${problem}); nothing written`);
  return built;
}

/** What `copiedCrews` gives import-real: the crews, or why the file has none, as its printout says it. */
export type CopiedCrews =
  | { readonly kind: "copied"; readonly crews: CopiedCrewsBuilt }
  | { readonly kind: "none"; readonly why: string };

/**
 * import-real's officiating block (ADR-093 step 1b): the 17 copied crews (`crewsOfSnapshot`) from the newest
 * officials snapshot under `<cache>/officials/`, when it is of the file's season. Else none, and why: there is
 * no officials snapshot, or the newest is of another season (an older folder of this season is not looked
 * for; `standin-officials -- --snapshot` reads one). `read` is the loaders' parquet reader: a test passes a stand-in.
 */
export async function copiedCrews(cache: string, file: LeagueFileLike, sealed: SealedTables, read: ReadRows = readRows): Promise<CopiedCrews> {
  const dir = await latestSnapshot(join(cache, "officials"));
  const none = "this file has no officiating block; run standin-officials --";
  if (dir === null) return { kind: "none", why: `no officials snapshot for ${file.season}: ${none} --fetch` };
  const manifest = await readManifest(dir);
  if (manifest.season !== file.season) {
    return {
      kind: "none",
      why: `the newest officials snapshot (${manifest.date}) is of ${manifest.season}, not ${file.season}: ${none} --snapshot <a folder of ${file.season}> or --fetch`,
    };
  }
  return { kind: "copied", crews: crewsOfSnapshot(await readOfficialsSnapshot(dir, file.season, read), file, sealed) };
}

/** Where `fetchOfficialsSnapshot` fetches before the files are whole: its name is no date, so `latestSnapshot` never picks it. */
const FETCHING = ".fetching";

/**
 * standin-officials' `--fetch` (ADR-093 step 1b): today's officials snapshot (the UTC date), fetched into
 * `<root>/.fetching` and moved to `<root>/<today>` only once every file and the manifest are written, so a
 * failed fetch leaves no dated folder for `latestSnapshot` or `copiedCrews` to find. Refuses when
 * `<root>/<today>` is there already, before any download: a kept folder is never written over, and a
 * re-run on it names it with `--snapshot`. import-real's own `--fetch` is `fetchSnapshot`, as before.
 */
export async function fetchOfficialsSnapshot(opts: {
  readonly root: string;
  readonly season: number;
  readonly now: Date;
  readonly download?: Download;
}): Promise<{ dir: string; manifest: SnapshotManifest }> {
  const dir = join(opts.root, opts.now.toISOString().slice(0, 10));
  if (existsSync(dir)) {
    throw new Error(`the officials snapshot ${dir} is there already, and a fetch today would write over it: ` +
      `to read it again, run with --snapshot ${dir}; to fetch afresh, move it out of ${opts.root} first`);
  }
  const staging = join(opts.root, FETCHING);
  await rm(staging, { recursive: true, force: true });
  try {
    const fetched = await fetchSnapshot({
      root: staging, season: opts.season, now: opts.now, files: officialsFiles(opts.season),
      ...(opts.download === undefined ? {} : { download: opts.download }),
    });
    await rename(fetched.dir, dir);
    return { dir, manifest: fetched.manifest };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

/**
 * The officials snapshot folder standin-officials reads (ADR-093 step 1b): `--snapshot`'s folder when one is
 * given, even with `--fetch`; else, with `--fetch`, today's, fetched (`fetchOfficialsSnapshot`); else the
 * newest kept under `root`, or null when there is none.
 */
export async function officialsSnapshotDir(opts: {
  readonly root: string;
  /** `--snapshot`'s folder, resolved; undefined when it is not given. */
  readonly given: string | undefined;
  /** `--fetch`. */
  readonly fetch: boolean;
  readonly season: number;
  /** Read only to fetch: the fetched folder's date. */
  readonly now: Date;
  readonly download?: Download;
}): Promise<string | null> {
  if (opts.given !== undefined) return opts.given;
  if (!opts.fetch) return latestSnapshot(opts.root);
  const { root, season, now, download } = opts;
  return (await fetchOfficialsSnapshot({ root, season, now, ...(download === undefined ? {} : { download }) })).dir;
}
