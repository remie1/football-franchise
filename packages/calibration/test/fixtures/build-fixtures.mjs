/**
 * Rebuild the committed fixture samples in `test/fixtures/nflverse/` from the live nflverse
 * assets. This is the only thing in the test tree that touches the network, and it is never run
 * by the test suite — it exists so the fixtures are reproducible rather than mysterious.
 *
 *   pnpm --filter @ff/calibration exec tsc -p tsconfig.json
 *   node test/fixtures/build-fixtures.mjs
 *
 * Samples are chosen around one focus game (2023 week 5, JAX @ BUF) so the rows interlock: the
 * roster, injury, snap-count and depth-chart samples cover the same team-week, which is what
 * makes the availability-join test exercise a join that actually matches.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { scanCsv, toCsv } from "../../dist/ingest/csv.js";
import { decodeText, httpFetcher } from "../../dist/ingest/fetcher.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "nflverse");
const BASE = "https://github.com/nflverse/nflverse-data/releases/download";
const FOCUS_GAME = "2023_05_JAX_BUF";
const FOCUS_TEAMS = new Set(["BUF", "JAX"]);

mkdirSync(OUT, { recursive: true });
const fetcher = httpFetcher();
const provenance = [];

async function sample(name, url, select, limit) {
  const res = await fetcher.fetch(url);
  const text = decodeText(res.body);
  const picked = [];
  let columns = [];
  const index = new Map();
  let scanned = 0;
  scanCsv(text, {
    onColumns: (kept) => {
      columns = [...kept];
      kept.forEach((c, i) => index.set(c, i));
    },
    onRow: (values) => {
      scanned++;
      if (picked.length >= limit) return;
      const get = (c) => (index.has(c) ? values[index.get(c)] : "");
      if (select(get)) picked.push([...values]);
    },
  });
  writeFileSync(join(OUT, name), toCsv(columns, picked), "utf8");
  provenance.push({ file: name, url, upstreamRows: scanned, sampledRows: picked.length, columns: columns.length });
  console.log(`${name}: ${picked.length}/${scanned} rows, ${columns.length} cols`);
}

await sample("games_sample.csv", `${BASE}/schedules/games.csv`,
  (g) => (g("season") === "2023" && g("week") === "5") || (g("season") === "2025" && g("week") === "1"), 24);

await sample("roster_weekly_sample.csv", `${BASE}/weekly_rosters/roster_weekly_2023.csv`,
  (g) => g("week") === "5" && FOCUS_TEAMS.has(g("team")), 200);

await sample("roster_weekly_status_sample.csv", `${BASE}/weekly_rosters/roster_weekly_2023.csv`,
  (g) => ["R40", "R30", "R48", "R01", "R02", "R33", "P01", "W03", "I01", "E02", "R23"]
    .includes(g("status_description_abbr")) && g("week") === "5", 60);

await sample("injuries_sample.csv", `${BASE}/injuries/injuries_2023.csv`,
  (g) => g("week") === "5" && FOCUS_TEAMS.has(g("team")), 60);

await sample("snap_counts_sample.csv", `${BASE}/snap_counts/snap_counts_2023.csv`,
  (g) => g("game_id") === FOCUS_GAME, 120);

await sample("depth_charts_weekly_sample.csv", `${BASE}/depth_charts/depth_charts_2023.csv`,
  (g) => g("week") === "5" && FOCUS_TEAMS.has(g("club_code")), 80);

await sample("depth_charts_daily_sample.csv", `${BASE}/depth_charts/depth_charts_2025.csv`,
  (g) => g("team") === "BUF", 30);

await sample("play_by_play_sample.csv", `${BASE}/pbp/play_by_play_2023.csv.gz`,
  (g) => g("game_id") === FOCUS_GAME, 30);

await sample("pbp_participation_sample.csv", `${BASE}/pbp_participation/pbp_participation_2023.csv`,
  (g) => g("nflverse_game_id") === FOCUS_GAME, 12);

await sample("ftn_charting_sample.csv", `${BASE}/ftn_charting/ftn_charting_2023.csv`,
  (g) => g("nflverse_game_id") === FOCUS_GAME, 20);

// Deliberately spans a tuning season and the held-out one, so the season filter is exercised
// against a file that genuinely contains both — which is the real shape of the all-seasons asset.
const ngsQuota = { 2023: 0, 2025: 0 };
await sample("ngs_passing_sample.csv", `${BASE}/nextgen_stats/ngs_passing.csv.gz`,
  (g) => {
    const season = Number(g("season"));
    if (season !== 2023 && season !== 2025) return false;
    if (g("week") !== "0" && g("week") !== "5") return false;
    if (ngsQuota[season] >= 15) return false;
    ngsQuota[season]++;
    return true;
  }, 30);

await sample("ngs_rushing_sample.csv", `${BASE}/nextgen_stats/ngs_rushing.csv.gz`,
  (g) => g("season") === "2023" && (g("week") === "0" || g("week") === "5"), 20);

await sample("ngs_receiving_sample.csv", `${BASE}/nextgen_stats/ngs_receiving.csv.gz`,
  (g) => g("season") === "2023" && (g("week") === "0" || g("week") === "5"), 20);

writeFileSync(
  join(OUT, "provenance.json"),
  JSON.stringify(
    {
      note: "Committed samples of real nflverse release assets. Used to exercise the parsers, " +
        "manifest and availability join with no network access.",
      builtBy: "packages/calibration/test/fixtures/build-fixtures.mjs",
      focusGame: FOCUS_GAME,
      files: provenance,
    },
    null,
    2,
  ) + "\n",
  "utf8",
);
console.log("done");
