/**
 * Getting the nflverse files the injury measurement reads (ADR-087 §5, build step E), once.
 *
 * Each asset is downloaded through the ingest layer's `httpFetcher` (the package's one network
 * seam) and kept verbatim under `data-cache/injury-rates/raw/<release tag>/<asset>` with a small
 * manifest beside it (URL, bytes, sha256, when fetched). `data-cache/` is git-ignored. A cached
 * file whose bytes still match its manifest is used without the network; `refresh` fetches again.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { DEFAULT_CACHE_DIR } from "../ingest/cache.js";
import { decodeText, type Fetcher } from "../ingest/fetcher.js";
import { sha256, systemClock, type Clock } from "../ingest/manifest.js";
import { nflverseAsset } from "../ingest/sources/types.js";

/** The measurement's own folder inside the calibration cache. */
export const INJURY_CACHE_DIR = join(DEFAULT_CACHE_DIR, "injury-rates", "raw");

export interface AssetRef {
  /** nflverse release tag. */
  readonly tag: string;
  readonly asset: string;
}

export interface AssetManifest {
  readonly url: string;
  readonly tag: string;
  readonly asset: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly fetchedAt: string;
}

/** The four tables, for one season (`games.csv` covers every season in one file). */
export function seasonAssets(season: number): AssetRef[] {
  return [
    { tag: "injuries", asset: `injuries_${season}.csv` },
    { tag: "weekly_rosters", asset: `roster_weekly_${season}.csv` },
    { tag: "snap_counts", asset: `snap_counts_${season}.csv` },
  ];
}

export const GAMES_ASSET: AssetRef = { tag: "schedules", asset: "games.csv" };

const SAFE = /^[a-z0-9][a-z0-9_.-]*$/i;

function pathsFor(root: string, ref: AssetRef): { file: string; manifest: string } {
  if (!SAFE.test(ref.tag) || !SAFE.test(ref.asset) || ref.asset.includes("..")) {
    throw new Error(`unsafe asset name ${ref.tag}/${ref.asset}`);
  }
  const rootAbs = resolve(root);
  const file = resolve(rootAbs, ref.tag, ref.asset);
  if (!file.startsWith(rootAbs + sep)) throw new Error(`refusing I/O outside ${rootAbs}: ${file}`);
  return { file, manifest: `${file}.manifest.json` };
}

export interface LoadedAsset {
  readonly text: string;
  readonly manifest: AssetManifest;
  readonly fromCache: boolean;
}

/** The asset's text: from the cache when its bytes match the manifest, else downloaded and cached. */
export async function loadAsset(
  ref: AssetRef,
  options: { readonly fetcher: Fetcher; readonly root?: string; readonly refresh?: boolean; readonly clock?: Clock; readonly log?: (line: string) => void },
): Promise<LoadedAsset> {
  const root = options.root ?? INJURY_CACHE_DIR;
  const { file, manifest: manifestPath } = pathsFor(root, ref);
  const log = options.log ?? (() => {});
  if (!options.refresh && existsSync(file) && existsSync(manifestPath)) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as AssetManifest;
    const body = await readFile(file);
    if (sha256(body) === manifest.sha256) return { text: decodeText(body), manifest, fromCache: true };
    log(`  ${ref.tag}/${ref.asset}: cached bytes do not match the manifest; fetching again`);
  }
  const url = nflverseAsset(ref.tag, ref.asset);
  log(`  fetching ${url}`);
  const res = await options.fetcher.fetch(url);
  const manifest: AssetManifest = {
    url, tag: ref.tag, asset: ref.asset, bytes: res.body.length, sha256: sha256(res.body),
    fetchedAt: (options.clock ?? systemClock).nowIso(),
  };
  await mkdir(resolve(file, ".."), { recursive: true });
  await writeFile(`${file}.tmp`, res.body);
  await rename(`${file}.tmp`, file);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return { text: decodeText(res.body), manifest, fromCache: false };
}
