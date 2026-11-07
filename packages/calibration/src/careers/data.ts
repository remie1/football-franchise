/**
 * The nflverse files the career baselines read (ADR-087 D5b), and the seasons they cover.
 *
 * Downloaded once through the injury measurement's `loadAsset` (the ingest layer's `httpFetcher`,
 * the package's one network seam) into the same git-ignored folder, `data-cache/injury-rates/raw/`:
 * the weekly rosters and snap counts are the same upstream files the injury measurement reads, so
 * they are kept once.
 *
 * 2025 is never read: it is the held-out season (`calibration.md` §7).
 */

import type { AssetRef } from "../injuries/data.js";

/** The first season the rosters are read for (careers enter from 2012). */
export const FIRST_SEASON = 2012;
/** The last season read: the last observed season for careers. */
export const LAST_SEASON = 2024;
/** calibration.md §7: 2025 and later are held out; nothing here reads them. */
export const HELD_OUT_FROM = 2025;

/** The seasons read, 2012-2024. */
export const SEASONS: readonly number[] = Array.from({ length: LAST_SEASON - FIRST_SEASON + 1 }, (_, i) => FIRST_SEASON + i);

function guard(season: number): number {
  if (!Number.isInteger(season) || season < FIRST_SEASON || season >= HELD_OUT_FROM) {
    throw new Error(`season ${season} is out of range: ${FIRST_SEASON}-${HELD_OUT_FROM - 1} (2025 is held out, calibration.md §7)`);
  }
  return season;
}

/** One season's weekly rosters. */
export function rosterAsset(season: number): AssetRef {
  return { tag: "weekly_rosters", asset: `roster_weekly_${guard(season)}.csv` };
}

/** One season's PFR snap counts (2012's file is published with a header and no rows; counts start in 2013). */
export function snapAsset(season: number): AssetRef {
  return { tag: "snap_counts", asset: `snap_counts_${guard(season)}.csv` };
}

/**
 * nflverse's player table: read only for its ids and birth date (`rows.ts` `parsePlayerIds`), to
 * join a snap-count player (a PFR id) to his weekly-roster rows (a GSIS id) and his age.
 */
export const PLAYERS_ASSET: AssetRef = { tag: "players", asset: "players.csv" };

/** Every asset the command reads, in the order it reads them. */
export function careerAssets(): AssetRef[] {
  return [PLAYERS_ASSET, ...SEASONS.map(rosterAsset), ...SEASONS.map(snapAsset)];
}
