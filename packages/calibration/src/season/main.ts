/**
 * `pnpm --filter @ff/calibration season -- --seed <seed> [--season 2027] [--caller v5] [--out <file>]`
 *
 * Plays a whole season (272 games plus the playoffs) through the real sim, prints the final
 * standings and the champion, and with `--out` saves the season (schedule, results, standings,
 * bracket, and the season's event stream) as JSON.
 */
import { writeFileSync } from "node:fs";
import { CALLER_VERSIONS, type CallerVersion } from "../caller/anticipate.js";
import { runRealSeason } from "./realSeason.js";

function parse(argv: readonly string[]) {
  let seed: string | undefined;
  let season = 2027;
  let callerVersion: CallerVersion | undefined;
  let out: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new SyntaxError(`${arg} requires a value`);
      return v;
    };
    if (arg === "--") continue;
    else if (arg === "--seed") seed = next();
    else if (arg === "--season") season = Number(next());
    else if (arg === "--out") out = next();
    else if (arg === "--caller") {
      const v = next();
      if (!(CALLER_VERSIONS as readonly string[]).includes(v)) throw new SyntaxError(`--caller must be one of ${CALLER_VERSIONS.join(", ")}`);
      callerVersion = v as CallerVersion;
    } else throw new SyntaxError(`unknown argument ${arg}`);
  }
  if (seed === undefined || seed.trim() === "") throw new SyntaxError("--seed is required");
  if (!Number.isInteger(season)) throw new SyntaxError("--season must be a whole number");
  return { seed, season, callerVersion, out };
}

const args = parse(process.argv.slice(2));
const started = Date.now();
const { league, run } = runRealSeason({ seed: args.seed, season: args.season, ...(args.callerVersion ? { callerVersion: args.callerVersion } : {}) });
const name = new Map(league.teams.map((t) => [String(t.id), t.displayName]));

for (const d of league.structure.divisions) {
  console.log(`\n${d.name}`);
  for (const r of run.state.standings.filter((row) => d.teams.includes(row.team)).sort((a, b) => a.divisionRank - b.divisionRank)) {
    const o = r.overall;
    console.log(`  ${name.get(String(r.team))!.padEnd(28)} ${o.wins}-${o.losses}${o.ties ? `-${o.ties}` : ""}  PF ${r.pointsFor}  PA ${r.pointsAgainst}`);
  }
}
console.log(`\nChampion: ${name.get(String(run.state.bracket!.champion))} (${run.state.results.length} games in ${((Date.now() - started) / 1000).toFixed(0)}s)`);
if (args.out) {
  // The event stream rides along so the news desk (ADR-082) can read the season the way it happened.
  writeFileSync(args.out, JSON.stringify({ seed: args.seed, league, season: run.state, events: run.events }, null, 2));
  console.log(`Saved ${args.out}`);
}
