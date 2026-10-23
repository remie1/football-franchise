/**
 * `pnpm --filter @ff/attributes import-real -- [--fetch] [--season 2026] [--seed <seed>]`
 *   `[--cache <dir>] [--snapshot <dir>] [--out <file>]`
 *
 * Builds the stand-in league (ADR-088) from the newest snapshot in the cache, or from a fresh one
 * with `--fetch`, and writes it as one JSON file with made-up names only (Q7: that file is the
 * one that is committed). The sealed table (real id -> stand-in) is read from and written back to
 * `<cache>/sealed.json`, so a refresh keeps every returning player's stand-in name. The cache is
 * gitignored; keep a copy of `sealed.json` somewhere safe, or a refresh on another computer gives
 * everyone new names.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { teamId, type Team } from "@ff/contracts";
import { buildRealLeague } from "./league.js";
import { PICKS_SOURCE, tradedPicks } from "./picks.js";
import { REAL_CITY, REAL_TEAM_SLOTS, STANDIN_NICKNAME } from "./positions.js";
import { loadSnapshotRows, loadTrackingRows } from "./rows.js";
import { fetchSnapshot, latestSnapshot, readManifest } from "./snapshot.js";
import type { SealedTable } from "./standins.js";

export const LEAGUE_FILE_FORMAT = "ff-standin-league/1";

export function standInTeams(): Team[] {
  return REAL_TEAM_SLOTS.map((_, i) => ({
    id: teamId(`T${String(i + 1).padStart(2, "0")}`),
    city: REAL_CITY[i]!,
    displayName: `${REAL_CITY[i]!} ${STANDIN_NICKNAME[i]!}`,
    roster: [], staff: [], depthChart: {},
    capState: { capLimit: 0, committed: 0, deadMoney: 0 },
    staffBudget: { limit: 0, committed: 0 },
  }));
}

async function main(argv: readonly string[]) {
  const opt = (name: string) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
  const season = Number(opt("--season") ?? 2026);
  const cache = opt("--cache") ?? "data-cache/real";
  const seed = opt("--seed") ?? `standin-${season}`;
  let dir = opt("--snapshot") ?? null;
  if (argv.includes("--fetch")) dir = (await fetchSnapshot({ root: cache, season, now: new Date() })).dir;
  dir ??= await latestSnapshot(cache);
  if (dir === null) throw new Error(`no snapshot under ${cache}; run with --fetch`);
  const manifest = await readManifest(dir);
  const sealedPath = join(cache, "sealed.json");
  const sealed: SealedTable = existsSync(sealedPath) ? JSON.parse(readFileSync(sealedPath, "utf8")) : {};

  const rows = await loadSnapshotRows(dir, season);
  const tracking = await loadTrackingRows(dir, [season - 1, season]);
  const built = buildRealLeague({ seed, season, date: manifest.date, teams: standInTeams(), ...rows, tracking, sealed });

  const out = opt("--out") ?? `leagues/standin-${manifest.date}.json`;
  mkdirSync(dirname(out), { recursive: true });
  const file = { format: LEAGUE_FILE_FORMAT, season, snapshotDate: manifest.date, league: built.league, contracts: built.contracts,
    picks: tradedPicks(built.league.teams), picksSource: PICKS_SOURCE };
  writeFileSync(out, JSON.stringify(file, (_k, v) => (v instanceof Set ? [...v] : v)) + "\n");
  writeFileSync(sealedPath, JSON.stringify(built.sealed, null, 1) + "\n");

  const r = Object.values(built.league.provenance.ratings);
  const per = built.league.teams.map((t) => t.roster.length);
  console.log(`stand-in league ${manifest.date}: ${built.league.players.length} players, ${Math.min(...per)}-${Math.max(...per)} active per team`);
  console.log(`  ratings: ${r.filter((x) => x.measures.length > 0).length} with tracking data, ${r.filter((x) => x.skill === "guess").length} guesses; ${r.filter((x) => x.imputed.length > 0).length} missing a combine drill`);
  const est = Object.values(built.league.provenance.contractSource).filter((x) => x === "estimated").length;
  console.log(`  contracts: ${built.contracts.length} (${est} estimated at their yearly average), ${built.league.provenance.noContract.length} players without one`);
  console.log(`  traded picks: ${file.picks.length} (rounds 1-3, as of ${PICKS_SOURCE.published})`);
  console.log(`  wrote ${out}; sealed table ${sealedPath}`);
}

main(process.argv.slice(2)).catch((e: unknown) => { console.error(e); process.exit(1); });
