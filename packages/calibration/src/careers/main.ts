/**
 * `pnpm --filter @ff/calibration nfl-careers [-- --out reports/nfl-careers] [--refresh]`
 *
 * Measures the real NFL side of the 20-season career check (ADR-087 D5b) from nflverse's public
 * tables and writes `<out>.md` and `<out>.json` (aggregates only). The files are downloaded once
 * into `data-cache/injury-rates/raw/` (git-ignored, shared with the injury measurement) and read
 * from there afterwards; `--refresh` downloads them again. 2025 is never read (held out,
 * `calibration.md` §7). The committed numbers are copied into `nflCareers.ts` (`NFL_CAREERS`).
 */

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { httpFetcher } from "../ingest/fetcher.js";
import { loadAsset, type AssetManifest } from "../injuries/data.js";
import { buildBaseline } from "./baseline.js";
import { LAST_SEASON, PLAYERS_ASSET, SEASONS, rosterAsset, snapAsset } from "./data.js";
import { actOnly, addRosterSeason, newLedger, onA53, weekEightRows, type WeekEight } from "./measure.js";
import { renderJson, renderMarkdown } from "./report.js";
import { parseCareerRosters, parseCareerSnaps, parsePlayerIds } from "./rows.js";
import { snapSeasons, type SnapSeason } from "./usage.js";
import type { ResultsFixture } from "./wins.js";

/** The week-8 cross-section's seasons. */
const WEEK_EIGHT_SEASONS = [2018, 2019, 2020, 2021, 2022, 2023, 2024] as const;
/** Comebacks: Y with Y+1 in a season whose weekly rosters list practice squads (2017 on). */
const COMEBACK_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022] as const;
const WIN_CARRY_SEASONS = [2020, 2021, 2022, 2023, 2024] as const;
/** As `NFL_SPREAD` (playerChecks.ts): 2021-2024. */
const WIN_SPREAD_SEASONS = [2021, 2022, 2023, 2024] as const;

const FIXTURE = fileURLToPath(new URL("../../../franchise/test/fixtures/nfl-seasons.json", import.meta.url));

function argValue(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main(argv: readonly string[]): Promise<void> {
  const out = resolve(argValue(argv, "--out") ?? "reports/nfl-careers");
  const refresh = argv.includes("--refresh");
  const fetcher = httpFetcher();
  const log = (line: string) => process.stderr.write(line + "\n");
  const sources: AssetManifest[] = [];
  const opts = { fetcher, refresh, log };

  log(`nfl-careers: seasons ${SEASONS[0]}-${LAST_SEASON}`);
  const ledger = newLedger();
  const weekEight: WeekEight[] = [];
  const weekEightActOnly: WeekEight[] = [];
  let rosterRows = 0;
  for (const season of SEASONS) {
    const a = await loadAsset(rosterAsset(season), opts);
    sources.push(a.manifest);
    const rows = parseCareerRosters(a.text, season);
    rosterRows += rows.length;
    addRosterSeason(ledger, rows, season);
    if ((WEEK_EIGHT_SEASONS as readonly number[]).includes(season)) {
      weekEight.push(weekEightRows(rows, season, 8, onA53));
      weekEightActOnly.push(weekEightRows(rows, season, 8, actOnly));
    }
    log(`  rosters ${season}: ${rows.length} rows`);
  }
  const snaps = new Map<number, Map<string, SnapSeason>>();
  let snapRows = 0;
  for (const season of SEASONS) {
    const a = await loadAsset(snapAsset(season), opts);
    sources.push(a.manifest);
    const rows = parseCareerSnaps(a.text, season);
    snapRows += rows.length;
    if (rows.length > 0) snaps.set(season, snapSeasons(rows, season));
    log(`  snaps ${season}: ${rows.length} rows`);
  }
  const p = await loadAsset(PLAYERS_ASSET, opts);
  sources.push(p.manifest);
  const playerIds = parsePlayerIds(p.text);
  const fixture = JSON.parse(await readFile(FIXTURE, "utf8")) as ResultsFixture;

  log("  measuring (bootstrap)");
  const report = buildBaseline({
    measuredOn: new Date().toISOString().slice(0, 10),
    ledger, weekEight, weekEightActOnly, snaps, playerIds, fixture,
    cohort: { firstEntry: 2012, lastEntry: 2022, lastSeason: LAST_SEASON },
    comebackYears: COMEBACK_YEARS,
    winCarrySeasons: WIN_CARRY_SEASONS,
    winSpreadSeasons: WIN_SPREAD_SEASONS,
    counts: { rosterRows, snapRows },
    sources,
  });
  await mkdir(dirname(out), { recursive: true });
  await writeFile(`${out}.json`, renderJson(report), "utf8");
  await writeFile(`${out}.md`, renderMarkdown(report), "utf8");
  log(`wrote ${out}.md and ${out}.json`);
}

main(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`nfl-careers: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
