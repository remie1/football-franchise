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
}): Promise<{ dir: string; manifest: SnapshotManifest }> {
  const download = opts.download ?? httpDownload;
  const date = opts.now.toISOString().slice(0, 10);
  const dir = join(opts.root, date);
  await mkdir(dir, { recursive: true });
  const files: Record<string, ManifestEntry> = {};
  for (const [key, path] of Object.entries(snapshotFiles(opts.season))) {
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
