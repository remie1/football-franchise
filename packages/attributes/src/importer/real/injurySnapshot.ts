/**
 * THE INJURIES SNAPSHOT, READ (ADR-087 AB7, §12.3.7): the one I/O step `standin-injuries` (`injuriesMain.ts`)
 * and `import-real` (`main.ts`) share. It checks the folder against its manifest (`verifySnapshot`), that it
 * is of the file's season, holds every file and was fetched on or after the file's cut, and that every file
 * has every column read (hyparquet skips a column a file lacks without a word, so `columnsOf` looks first).
 * Then it reads the schedules once and one season of rosters, reports and snap counts at a time, keeping
 * only the file's men's weeks and spells (`injurySpells.ts` `seasonSpells`), so it holds no more than one
 * season's rows at once. `pastInjuriesOfSnapshot` is the one build both commands run, and `copiedPastInjuries`
 * is import-real's step on top of it. `injuriesSnapshotDir` picks the folder `standin-injuries` reads, and
 * `fetchInjuriesSnapshot` is its `--fetch`.
 *
 * The rows hold real ids and names; they stay inside this folder. What `pastInjuriesOfSnapshot` returns is
 * the block (stand-in ids, kinds, numbers and stamps) and counts, and, for the command's last check only,
 * the real values the printout and the block must not hold (`held`, and the join's `realOf`).
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parquetMetadata, parquetSchema } from "hyparquet";
import type { PlayerState } from "@ff/contracts";
import { copiedSince } from "./development.js";
import {
  blankGameType, gameRows, INJURY_REPORT_COLUMNS, INJURY_ROSTER_COLUMNS, INJURY_SCHEDULE_COLUMNS, INJURY_SNAP_COLUMNS,
  loadInjuryScheduleRows, loadInjurySeasonRows, reportRows, rosterRows, snapRows,
} from "./injuryRows.js";
import { buildPastInjuries, seasonSpells, standInJoin, type PastInjuriesReport, type SeasonSpells, type StandInJoin } from "./injurySpells.js";
import type { LeagueFileLike } from "./leagueFile.js";
import { pastInjuriesProblem, type PastInjuriesBlock } from "./pastInjuries.js";
import type { ReadRows } from "./rows.js";
import {
  fetchStagedSnapshot, injuryHistoryFiles, INJURY_HISTORY_FIRST_SEASON, latestSnapshot, readManifest, readRows, verifySnapshot,
  type Download, type SnapshotManifest,
} from "./snapshot.js";
import type { SealedTable } from "./standins.js";

/** A date as the schedules write it, and as the cut is compared with it. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The schema seam: a file's top-level column names. Tests pass a stand-in. */
export type ColumnsOf = (dir: string, key: string) => Promise<readonly string[]>;

/** A parquet file's top-level column names, from its footer (hyparquet's `parquetMetadata`). */
export const parquetColumns: ColumnsOf = async (dir, key) => {
  const buf = await readFile(join(dir, `${key}.parquet`));
  const file = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return parquetSchema(parquetMetadata(file)).children.map((c) => c.element.name);
};

/** The columns each file must have. */
function columnsFor(key: string): readonly string[] {
  if (key === "schedules") return INJURY_SCHEDULE_COLUMNS;
  if (key.startsWith("rosters")) return INJURY_ROSTER_COLUMNS;
  if (key.startsWith("injuries")) return INJURY_REPORT_COLUMNS;
  return INJURY_SNAP_COLUMNS;
}

export interface InjurySnapshot {
  readonly dir: string;
  readonly manifest: SnapshotManifest;
  /** sha256 of `manifest.json`'s text. */
  readonly manifestSha256: string;
  /** Each season's spells and weeks for the file's men, `INJURY_HISTORY_FIRST_SEASON` to the file's season. */
  readonly seasons: readonly SeasonSpells[];
  /** Rows with a blank or missing `game_type`, read as the regular season (as calibration reads them). */
  readonly blankGameType: number;
  /**
   * What the rows held that no printout or block may show (review finding 2), kept in memory only for the
   * command's last check (`printoutLeaks`): every team code in the schedules and rosters read, and every
   * roster and snap name of two words or more, as `nameWords` writes it.
   */
  readonly held: { readonly teams: ReadonlySet<string>; readonly names: ReadonlySet<string> };
}

/** A text's words for the name check: lower case, accents and every mark but letters and digits taken off. */
export const nameWords = (text: string): string[] =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 0);

/**
 * The injuries snapshot in `dir`, read for the file's men (`keep`, real ids). Refuses a folder that is not
 * what its manifest says, of another season, missing a file, fetched before the cut, missing a column, or
 * with a season before the file's that has no regular-season games, rosters, reports or snap counts, or no
 * spell among the file's men (each a misread). The file's own season is cut by date, so it is refused when
 * any of its regular-season games has no `gameday` written YYYY-MM-DD, or when none is before the cut
 * (review finding 9: either would cut the season without a word, and a spell running at the last season's
 * end would then be written as healed). Messages name a path, a file key, a column, a season or a count.
 */
export async function readInjurySnapshot(opts: {
  readonly dir: string;
  readonly season: number;
  readonly snapshotDate: string;
  readonly keep: ReadonlySet<string>;
  readonly read?: ReadRows;
  readonly columnsOf?: ColumnsOf;
}): Promise<InjurySnapshot> {
  const { dir, season } = opts;
  const read = opts.read ?? readRows;
  const columnsOf = opts.columnsOf ?? parquetColumns;
  const manifest = await verifySnapshot(dir);
  const manifestSha256 = createHash("sha256").update(await readFile(join(dir, "manifest.json"))).digest("hex");
  if (manifest.season !== season) throw new Error(`the injuries snapshot ${dir} is of ${manifest.season}, not the file's season ${season}`);
  const keys = Object.keys(injuryHistoryFiles(season));
  for (const key of keys) if (manifest.files[key] === undefined) throw new Error(`the injuries snapshot ${dir} has no ${key} in its manifest`);
  if (manifest.date < opts.snapshotDate) {
    throw new Error(`the injuries snapshot ${dir} was fetched on ${manifest.date}, before the file's cut ${opts.snapshotDate}, so it cannot cover it`);
  }
  for (const key of keys) {
    const have = new Set(await columnsOf(dir, key));
    for (const c of columnsFor(key)) if (!have.has(c)) throw new Error(`${key}.parquet has no column ${c}`);
  }

  const seasons: number[] = [];
  for (let y = INJURY_HISTORY_FIRST_SEASON; y <= season; y++) seasons.push(y);
  const schedules = await loadInjuryScheduleRows(dir, read);
  let blank = blankGameType(schedules);
  const games = gameRows(schedules, seasons);
  const teams = new Set<string>(games.flatMap((g) => [g.home, g.away]));
  const names = new Set<string>();
  const holdName = (name: string) => {
    const w = nameWords(name);
    if (w.length >= 2) names.add(w.join(" "));
  };
  const undated = games.filter((g) => g.season === season && (g.gameday === null || !ISO_DATE.test(g.gameday))).length;
  if (undated > 0) throw new Error(`schedules.parquet: ${undated} regular-season games of ${season} have no gameday written YYYY-MM-DD: a misread`);
  const out: SeasonSpells[] = [];
  for (const y of seasons) {
    // One season's rows at a time: read, kept down to the file's men's weeks and spells, then let go.
    const raw = await loadInjurySeasonRows(dir, y, read);
    blank += blankGameType(raw.rosters) + blankGameType(raw.reports) + blankGameType(raw.snaps);
    const rosters = rosterRows(raw.rosters, y, `rosters${y}`);
    const reports = reportRows(raw.reports, y, `injuries${y}`);
    const snaps = snapRows(raw.snaps, y, `snaps${y}`);
    for (const r of rosters) { teams.add(r.team); holdName(r.name); }
    for (const r of snaps) { teams.add(r.team); holdName(r.name); }
    const built = seasonSpells({
      season: y, games, rosters, reports, snaps, keep: opts.keep, ...(y === season ? { cutBefore: opts.snapshotDate } : {}),
    });
    if (y < season) {
      const c = built.counts;
      if (c.teamGames === 0) throw new Error(`the injuries snapshot has no regular-season game of ${y}: a misread`);
      for (const [n, what] of [[rosters.length, "weekly roster"], [reports.length, "injury report"], [snaps.length, "snap count"]] as const) {
        if (n === 0) throw new Error(`the injuries snapshot has no regular-season ${what} row of ${y}: a misread`);
      }
      if (c.spells === 0) throw new Error(`the injuries snapshot gives the file's men no spell in ${y}: a misread`);
    } else if (built.counts.teamGames === 0) {
      throw new Error(`the injuries snapshot has no regular-season game of ${y} before the cut ${opts.snapshotDate}: a misread`);
    }
    out.push(built);
  }
  return { dir, manifest, manifestSha256, seasons: out, blankGameType: blank, held: { teams, names } };
}

export interface PastInjuriesBuilt {
  readonly snapshot: InjurySnapshot;
  readonly join: StandInJoin;
  readonly block: PastInjuriesBlock;
  readonly report: PastInjuriesReport;
}

/**
 * The block both commands write: the file's men joined through the players' sealed table (read only), the
 * snapshot read for them, the records built, and the block checked as `standin-development` will check it
 * (`pastInjuriesProblem`) before anything is written.
 */
export async function pastInjuriesOfSnapshot(
  dir: string, file: LeagueFileLike, sealed: SealedTable, read?: ReadRows, columnsOf?: ColumnsOf,
): Promise<PastInjuriesBuilt> {
  const players = file.league.players as readonly PlayerState[];
  const men = players.map((p) => ({ id: String(p.bio.id), displayName: p.bio.displayName }));
  const join = standInJoin(men, sealed);
  const snapshot = await readInjurySnapshot({
    dir, season: file.season, snapshotDate: file.snapshotDate, keep: new Set(join.realOf.values()),
    ...(read === undefined ? {} : { read }), ...(columnsOf === undefined ? {} : { columnsOf }),
  });
  const { block, report } = buildPastInjuries({
    season: file.season, snapshotDate: file.snapshotDate,
    players: players.map((p) => ({ id: String(p.bio.id), copiedInjury: p.condition.injury !== undefined })),
    realOf: join.realOf, seasons: snapshot.seasons, manifest: snapshot.manifest, manifestSha256: snapshot.manifestSha256,
  });
  const problem = pastInjuriesProblem(block, {
    season: file.season, snapshotDate: file.snapshotDate, ids: new Set(men.map((m) => m.id)), copiedSince: copiedSince(file.season),
  });
  if (problem !== null) throw new Error(`the built block fails its own check (${problem}): nothing written`);
  return { snapshot, join, block, report };
}

export type CopiedPastInjuries =
  | { readonly kind: "copied"; readonly built: PastInjuriesBuilt }
  | { readonly kind: "none"; readonly why: string };

/**
 * import-real's `pastInjuries` block: built (`pastInjuriesOfSnapshot`) from the newest injuries snapshot
 * under `<cache>/injuries/`, when it is of the file's season and fetched on or after its cut. Else none,
 * and why. `sealed` is the players' sealed table after the run.
 */
export async function copiedPastInjuries(
  cache: string, file: LeagueFileLike, sealed: SealedTable, read?: ReadRows, columnsOf?: ColumnsOf,
): Promise<CopiedPastInjuries> {
  const dir = await latestSnapshot(join(cache, "injuries"));
  const none = "this file has no pastInjuries block; run standin-injuries --";
  if (dir === null) return { kind: "none", why: `no injuries snapshot for ${file.season}: ${none} --fetch` };
  const manifest = await readManifest(dir);
  if (manifest.season !== file.season || manifest.date < file.snapshotDate) {
    return {
      kind: "none",
      why: `the newest injuries snapshot (${manifest.date}) is of ${manifest.season}, and must be of ${file.season} and on or after ${file.snapshotDate}: ` +
        `${none} --snapshot <such a folder> or --fetch`,
    };
  }
  return { kind: "copied", built: await pastInjuriesOfSnapshot(dir, file, sealed, read, columnsOf) };
}

/** standin-injuries' `--fetch`: today's injuries snapshot, fetched staged into `<root>/<today>` (`fetchStagedSnapshot`). */
export async function fetchInjuriesSnapshot(opts: {
  readonly root: string;
  readonly season: number;
  readonly now: Date;
  readonly download?: Download;
}): Promise<{ dir: string; manifest: SnapshotManifest }> {
  return fetchStagedSnapshot({ ...opts, files: injuryHistoryFiles(opts.season), what: "injuries" });
}

/**
 * The injuries snapshot folder standin-injuries reads: `--snapshot`'s when given, even with `--fetch`; else,
 * with `--fetch`, today's, fetched; else the newest kept under `root` (`<cache>/injuries`, never `<cache>`
 * itself, whose dated folders are import-real's), or null when there is none.
 */
export async function injuriesSnapshotDir(opts: {
  readonly root: string;
  readonly given: string | undefined;
  readonly fetch: boolean;
  readonly season: number;
  readonly now: Date;
  readonly download?: Download;
}): Promise<string | null> {
  if (opts.given !== undefined) return opts.given;
  if (!opts.fetch) return latestSnapshot(opts.root);
  const { root, season, now, download } = opts;
  return (await fetchInjuriesSnapshot({ root, season, now, ...(download === undefined ? {} : { download }) })).dir;
}
