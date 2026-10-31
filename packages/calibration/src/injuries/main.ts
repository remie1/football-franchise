/**
 * `pnpm --filter @ff/calibration injury-rates [-- --seasons 2019-2024] [--out reports/injury-rates] [--refresh]`
 *
 * Measures real NFL injury numbers from nflverse's public tables (ADR-087 §5.1, build step E) and
 * writes `<out>.md` and `<out>.json`. The files are downloaded once into
 * `data-cache/injury-rates/raw/` (git-ignored) and read from there afterwards; `--refresh`
 * downloads them again. The season before the first one is loaded too, only to tell a week-1
 * absence carried over from last season from a new one.
 *
 * 2025 and later are refused: 2025 is the held-out season (`calibration.md` §7).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { httpFetcher } from "../ingest/fetcher.js";
import { GAMES_ASSET, loadAsset, seasonAssets, type AssetManifest } from "./data.js";
import { derive, summarise } from "./measure.js";
import { renderJson, renderMarkdown, type InjuryRatesReport } from "./report.js";
import { parseGames, parseReports, parseRosters, parseSnaps, type ReportRow, type RosterRow, type SnapRow } from "./rows.js";
import { buildTimelines } from "./timeline.js";

/** Snap counts start in 2012, so 2013 is the first season with a lookback season. */
const FIRST_SEASON = 2013;
/** calibration.md §7: 2025 is held out; this measurement never reads it. */
const HELD_OUT_FROM = 2025;
/** The seasons the build brief asks for. */
const DEFAULT_SEASONS = "2019-2024";
/** A second pooled view: the seasons with today's rules (17 games, 4-game IR returns) and no COVID lists. */
const RECENT = [2022, 2023, 2024] as const;

export function parseSeasons(spec: string): number[] {
  const out = new Set<number>();
  for (const part of spec.split(",").map((p) => p.trim()).filter((p) => p.length > 0)) {
    const m = /^(\d{4})(?:-(\d{4}))?$/.exec(part);
    if (m === null) throw new Error(`cannot read season spec "${part}"`);
    const lo = Number(m[1]);
    const hi = m[2] === undefined ? lo : Number(m[2]);
    for (let s = lo; s <= hi; s++) out.add(s);
  }
  const seasons = [...out].sort((a, b) => a - b);
  if (seasons.length === 0) throw new Error("no seasons given");
  const bad = seasons.filter((s) => s < FIRST_SEASON || s >= HELD_OUT_FROM);
  if (bad.length > 0) {
    throw new Error(`seasons ${bad.join(", ")} are out of range: ${FIRST_SEASON}-${HELD_OUT_FROM - 1} (2025 is held out, calibration.md §7)`);
  }
  return seasons;
}

function argValue(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv: readonly string[]): Promise<void> {
  const seasons = parseSeasons(argValue(argv, "--seasons") ?? DEFAULT_SEASONS);
  const out = resolve(argValue(argv, "--out") ?? "reports/injury-rates");
  const refresh = argv.includes("--refresh");
  const lookback = seasons[0]! - 1;
  const loadSeasons = lookback >= FIRST_SEASON - 1 ? [lookback, ...seasons] : seasons;
  const fetcher = httpFetcher();
  const log = (line: string) => process.stderr.write(line + "\n");
  const sources: AssetManifest[] = [];

  log(`injury-rates: seasons ${seasons.join(", ")} (lookback ${lookback})`);
  const games = await loadAsset(GAMES_ASSET, { fetcher, refresh, log });
  sources.push(games.manifest);
  const rosters: RosterRow[] = [];
  const reports: ReportRow[] = [];
  const snaps: SnapRow[] = [];
  for (const season of loadSeasons) {
    const [inj, ros, snp] = seasonAssets(season);
    const a = await loadAsset(inj!, { fetcher, refresh, log });
    const b = await loadAsset(ros!, { fetcher, refresh, log });
    const c = await loadAsset(snp!, { fetcher, refresh, log });
    sources.push(a.manifest, b.manifest, c.manifest);
    for (const r of parseReports(a.text, season)) reports.push(r);
    for (const r of parseRosters(b.text, season)) rosters.push(r);
    for (const r of parseSnaps(c.text, season)) snaps.push(r);
    log(`  ${season}: parsed`);
  }

  const timelines = buildTimelines({ games: parseGames(games.text, loadSeasons), rosters, reports, snaps });
  const d = derive(timelines);
  const recent = RECENT.filter((s) => seasons.includes(s));
  const report: InjuryRatesReport = {
    seasons,
    lookbackSeason: loadSeasons[0] === lookback ? lookback : null,
    sources,
    coverage: timelines.coverage.filter((c) => seasons.includes(c.season)),
    pooled: summarise(d, seasons),
    recent: recent.length > 0 ? summarise(d, recent) : null,
    perSeason: seasons.map((s) => summarise(d, [s])),
  };
  await mkdir(dirname(out), { recursive: true });
  await writeFile(`${out}.json`, renderJson(report), "utf8");
  await writeFile(`${out}.md`, renderMarkdown(report), "utf8");
  log(`wrote ${out}.md and ${out}.json`);
}

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`injury-rates: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
