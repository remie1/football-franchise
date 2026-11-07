/**
 * `pnpm --filter @ff/calibration standin-recount [-- --league <file>] [--season 2024] [--out reports/standin-recount] [--refresh]`
 *
 * ADR-087 (owner's ruling 2026-11-06): counts the stand-in league file's 53s the way the real
 * week-8 53s are counted, applies the stand-in importer's roster rules (copied, `rules.ts`) to one
 * real season's weekly rosters at 23 October, week 8 and the season's latest week, and writes
 * `<out>.md` and `<out>.json` (aggregates only). `--league` is read from where the command is run
 * (default: the committed stand-in file); `--out` is relative to the package. The nflverse files
 * are the ones the injury and career measurements keep in `data-cache/injury-rates/raw/`
 * (downloaded once; `--refresh` downloads again). 2025 is never read (held out, calibration.md §7).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PLAYERS_ASSET, rosterAsset } from "../careers/data.js";
import { httpFetcher } from "../ingest/fetcher.js";
import { GAMES_ASSET, loadAsset, type AssetManifest } from "../injuries/data.js";
import { readStandInFile } from "../season/standInLeague.js";
import { realReading, recountFile, regularRows, studyRealSeason } from "./recount.js";
import { buildRecountReport, renderJson, renderMarkdown, type RealSeason } from "./report.js";
import { parsePlayerTable, parseRecountRosters, parseScheduleWeeks } from "./rows.js";

const DEFAULT_LEAGUE = fileURLToPath(new URL("../../../attributes/leagues/standin-2026-10-23.json", import.meta.url));
/** The study season: the importer's rules are tried on its rows. */
const DEFAULT_SEASON = 2024;
/** The real week-8 counts shown beside the file (the study season among them). */
const REFERENCE_SEASONS = [2022, 2023, 2024] as const;

function argValue(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv: readonly string[]): Promise<void> {
  const fromCaller = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path);
  const leaguePath = argValue(argv, "--league") === undefined ? DEFAULT_LEAGUE : fromCaller(argValue(argv, "--league")!);
  const season = Number(argValue(argv, "--season") ?? DEFAULT_SEASON);
  const out = resolve(argValue(argv, "--out") ?? "reports/standin-recount");
  const log = (line: string) => process.stderr.write(line + "\n");
  const opts = { fetcher: httpFetcher(), refresh: argv.includes("--refresh"), log };
  const sources: AssetManifest[] = [];

  const leagueBytes = readFileSync(leaguePath);
  const file = readStandInFile(leagueBytes.toString("utf8"));
  log(`standin-recount: ${basename(leaguePath)} (${file.season}, snapshot ${file.snapshotDate}); study season ${season}`);
  const recount = recountFile(file);

  const players = await loadAsset(PLAYERS_ASSET, opts);
  sources.push(players.manifest);
  const table = parsePlayerTable(players.text);
  const games = await loadAsset(GAMES_ASSET, opts);
  sources.push(games.manifest);
  const schedule = parseScheduleWeeks(games.text, season);

  const realBySeason: RealSeason[] = [];
  let study: ReturnType<typeof studyRealSeason> | undefined;
  const seasons = [...new Set<number>([...REFERENCE_SEASONS, season])].sort((a, b) => a - b);
  for (const y of seasons) {
    const a = await loadAsset(rosterAsset(y), opts);
    sources.push(a.manifest);
    const rows = parseRecountRosters(a.text, y);
    const real = realReading(regularRows(rows), y);
    realBySeason.push({ season: y, week: real.week, byeFilled: real.byeFilled, the53: real.the53 });
    if (y === season) study = studyRealSeason(rows, table, schedule, y);
    log(`  rosters ${y}: ${rows.length} rows`);
  }
  if (study === undefined) throw new Error(`no study of ${season}`);

  const report = buildRecountReport({
    measuredOn: new Date().toISOString().slice(0, 10),
    league: { file: basename(leaguePath), sha256: createHash("sha256").update(leagueBytes).digest("hex"), season: file.season, snapshotDate: file.snapshotDate },
    file: recount,
    realBySeason,
    study,
    sources,
  });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(`${out}.json`, renderJson(report), "utf8");
  await writeFile(`${out}.md`, renderMarkdown(report), "utf8");
  log(`wrote ${out}.md and ${out}.json`);
}

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`standin-recount: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
