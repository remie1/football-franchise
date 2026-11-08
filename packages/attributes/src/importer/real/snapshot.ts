/**
 * THE REAL IMPORTER'S DOWNLOADS (ADR-088 R1; attributes.md §5, Charter rule 7).
 *
 * Fetches a pinned list of nflverse release files into a dated folder of the local cache:
 *
 *   data-cache/real/<YYYY-MM-DD>/<file>.parquet
 *   data-cache/real/<YYYY-MM-DD>/manifest.json   (url, bytes, sha256, fetched-at per file)
 *
 * The cache is gitignored (ADR-088 Q7): raw real data never enters the repository. Only
 * `importer/real/` reads it, and what leaves the importer carries made-up names only.
 *
 * Parquet, not CSV: the contracts file's CSV twin is stale (no player ids, empty season
 * history; ADR-088 provenance), so the parquet is the only current copy.
 *
 * The officials snapshot (ADR-093 step 1b, `officialsFiles`) is a second kind, fetched into its own
 * root, `data-cache/real/officials/<YYYY-MM-DD>/`, with the same manifest; `verifySnapshot` checks a
 * kept folder against that manifest before anything reads it.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parquetReadObjects } from "hyparquet";

export const NFLVERSE = "https://github.com/nflverse/nflverse-data/releases/download";

/** The first season nflverse has snap counts for. */
export const FIRST_SNAP_SEASON = 2012;

/** The files one snapshot holds. `season` is the season being copied; stats come from the one before. */
export function snapshotFiles(season: number): Readonly<Record<string, string>> {
  // Every season's snap counts, for career snaps and games played (ADR-087 reads them).
  const snaps: Record<string, string> = {};
  for (let y = FIRST_SNAP_SEASON; y <= season; y++) snaps[`snaps${y}`] = `snap_counts/snap_counts_${y}.parquet`;
  return {
    contracts: "contracts/historical_contracts.parquet",
    rosters: `weekly_rosters/roster_weekly_${season}.parquet`,
    players: "players/players.parquet",
    combine: "combine/combine.parquet",
    depth: `depth_charts/depth_charts_${season}.parquet`,
    ...snaps,
    injuries: `injuries/injuries_${season}.parquet`,
    stats: `stats_player/stats_player_reg_${season - 1}.parquet`,
    // Tracking and charting: every season in one file; the importer pools last season and this one.
    ngsPass: "nextgen_stats/ngs_passing.parquet",
    ngsRec: "nextgen_stats/ngs_receiving.parquet",
    ngsRush: "nextgen_stats/ngs_rushing.parquet",
    pfrPass: "pfr_advstats/advstats_season_pass.parquet",
    pfrRec: "pfr_advstats/advstats_season_rec.parquet",
    pfrRush: "pfr_advstats/advstats_season_rush.parquet",
    pfrDef: "pfr_advstats/advstats_season_def.parquet",
  };
}

/**
 * Seasons of play-by-play the officials snapshot holds (ADR-093 step 1b): the spread window's three
 * complete seasons and this one, which the lean window shares with the last of them.
 */
export const OFFICIALS_SEASONS = 4;

/**
 * The files one officials snapshot holds (ADR-093 step 1b): the schedules (who refereed each game,
 * and the coaches), the officials table and the players list (every name a made-up referee avoids),
 * and the play-by-play, whose descriptions hold every flag, for `season - 3` to `season`. The columns
 * read are `ScheduleRow`'s, `OfficialRow`'s and `PlayRow`'s (`rows.ts`) and the players' `display_name`;
 * never `official_id`. Cadence: fetched on demand (`standin-officials -- --fetch`) when a league file's
 * crews are made or refreshed, never on a schedule; a kept folder is read again with `--snapshot`.
 */
export function officialsFiles(season: number): Readonly<Record<string, string>> {
  const pbp: Record<string, string> = {};
  for (let y = season - OFFICIALS_SEASONS + 1; y <= season; y++) pbp[`pbp${y}`] = `pbp/play_by_play_${y}.parquet`;
  return {
    schedules: "schedules/games.parquet",
    officials: "officials/officials.parquet",
    players: "players/players.parquet",
    ...pbp,
  };
}

export interface ManifestEntry {
  readonly url: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface SnapshotManifest {
  readonly season: number;
  /** The day the files were fetched (UTC), which is also the folder's name. */
  readonly date: string;
  readonly fetchedAt: string;
  readonly files: Readonly<Record<string, ManifestEntry>>;
}

/** The network seam: tests pass a stand-in, the command passes the real `fetch`. */
export type Download = (url: string) => Promise<Uint8Array>;

export const httpDownload: Download = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
};

export async function fetchSnapshot(opts: {
  readonly root: string;
  readonly season: number;
  readonly now: Date;
  readonly download?: Download;
  /** The files to fetch, key to release path: `snapshotFiles(season)` when left out, `officialsFiles(season)` for the officials. */
  readonly files?: Readonly<Record<string, string>>;
}): Promise<{ dir: string; manifest: SnapshotManifest }> {
  const download = opts.download ?? httpDownload;
  const date = opts.now.toISOString().slice(0, 10);
  const dir = join(opts.root, date);
  await mkdir(dir, { recursive: true });
  const files: Record<string, ManifestEntry> = {};
  for (const [key, path] of Object.entries(opts.files ?? snapshotFiles(opts.season))) {
    const url = `${NFLVERSE}/${path}`;
    const body = await download(url);
    await writeFile(join(dir, `${key}.parquet`), body);
    files[key] = { url, bytes: body.byteLength, sha256: createHash("sha256").update(body).digest("hex") };
  }
  const manifest: SnapshotManifest = { season: opts.season, date, fetchedAt: opts.now.toISOString(), files };
  await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { dir, manifest };
}

/** The newest dated snapshot folder under `root`, or null. */
export async function latestSnapshot(root: string): Promise<string | null> {
  if (!existsSync(root)) return null;
  const dated = (await readdir(root)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const last = dated[dated.length - 1];
  return last === undefined ? null : join(root, last);
}

/**
 * The folder's manifest, once every file it names has been hashed again and found to be the bytes
 * that were fetched. Throws on a missing file or a different sha256, so a run on a kept folder is
 * known to read what the first run read (ADR-093 step 1b).
 */
export async function verifySnapshot(dir: string): Promise<SnapshotManifest> {
  const manifest = await readManifest(dir);
  for (const [key, entry] of Object.entries(manifest.files)) {
    const path = join(dir, `${key}.parquet`);
    if (!existsSync(path)) throw new Error(`snapshot ${dir}: ${key}.parquet is missing, and the manifest names it`);
    const sha256 = createHash("sha256").update(await readFile(path)).digest("hex");
    if (sha256 !== entry.sha256) {
      throw new Error(`snapshot ${dir}: ${key}.parquet is not the file that was fetched (sha256 ${sha256}, the manifest says ${entry.sha256})`);
    }
  }
  return manifest;
}

export async function readManifest(dir: string): Promise<SnapshotManifest> {
  return JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")) as SnapshotManifest;
}

/** Plain JSON values: 64-bit integers as numbers, dates as `YYYY-MM-DD`. */
function plain(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(plain);
  if (v !== null && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, plain(x)]));
  }
  return v;
}

/**
 * Read the named columns of one snapshot file. Name the columns: the contracts file's nested
 * `contract_history` alone does not fit in a default Node heap.
 */
export async function readRows<T>(dir: string, key: string, columns: readonly string[]): Promise<T[]> {
  const buf = await readFile(join(dir, `${key}.parquet`));
  const file = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const rows = await parquetReadObjects({ file, columns: [...columns] });
  return rows.map((r) => plain(r) as T);
}
