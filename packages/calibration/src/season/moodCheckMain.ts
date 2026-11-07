/**
 * `pnpm --filter @ff/calibration mood-check -- --league <file> [--seed <seed>] [--seasons 10] [--report <file>] [--out <file>]`
 *
 * ADR-096 step 2's many-season look: plays the stand-in league through the cap check's walk with
 * growth, injuries and the fans' and media's mood on, and prints how the moods sit and how often each
 * hot take's mood side is live (`moodCheck.ts`). `--report` writes the report as Markdown, `--out`
 * the season tallies as JSON (rewritten after every season, so a stopped run keeps what it played).
 * About two and a half minutes a season.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readStandInFile } from "./standInLeague.js";
import { runCapCheck } from "./capCheck.js";
import { moodReport, tallyMoodSeason, type MoodSeasonTally } from "./moodCheck.js";

function parse(argv: readonly string[]) {
  let seed = "mood-check";
  let seasons = 10;
  let league: string | undefined;
  let report: string | undefined;
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
    else if (arg === "--seasons") seasons = Number(next());
    else if (arg === "--league") league = next();
    else if (arg === "--report") report = next();
    else if (arg === "--out") out = next();
    else throw new SyntaxError(`unknown argument ${arg}`);
  }
  if (league === undefined) throw new SyntaxError("--league <file> is required (the stand-in league)");
  if (!Number.isInteger(seasons) || seasons < 1) throw new SyntaxError("--seasons must be a whole number, 1 or more");
  return { seed, seasons, league, report, out };
}

const fromCaller = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path);
const args = parse(process.argv.slice(2));
const file = readStandInFile(readFileSync(fromCaller(args.league), "utf8"));
const tallies: MoodSeasonTally[] = [];
const started = Date.now();
runCapCheck({
  seed: args.seed, file, seasons: args.seasons, players: { development: true, injuries: true }, mood: true,
  onRun: (season, _events, _people, more) => {
    const t = tallyMoodSeason(season, more.run.events, more.run.state);
    tallies.push(t);
    console.log(`season ${season} done (${((Date.now() - started) / 1000).toFixed(0)}s): fans furious ${(100 * t.levels.FANS["-60"]! / Math.max(1, t.teamWeeks)).toFixed(1)}% of team-weeks`);
    if (args.out) writeFileSync(fromCaller(args.out), JSON.stringify({ seed: args.seed, league: args.league, tallies }, null, 2));
  },
});
const text = moodReport(tallies, { league: args.league, seed: args.seed, build: process.env.GIT_COMMIT ?? "working tree" });
console.log(`\n${text}`);
if (args.report) { writeFileSync(fromCaller(args.report), text); console.log(`Saved ${fromCaller(args.report)}`); }
