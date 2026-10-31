/**
 * `pnpm --filter @ff/calibration cap-check -- --league <file> [--seed <seed>] [--seasons 5] [--out <file>]`
 *
 * Plays the stand-in league for several seasons with the league year and the draft in the walk
 * (ADR-085 §7) and prints each year's money: how full teams are against the cap, dead money, each
 * position group's share, the biggest deals, and how much moved (signings, cuts, free agents,
 * compensatory picks). `--out` saves the numbers as JSON.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readStandInFile } from "./standInLeague.js";
import { runCapCheck, type CapYear } from "./capCheck.js";

function parse(argv: readonly string[]) {
  let seed = "cap-check";
  let seasons = 5;
  let league: string | undefined;
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
    else if (arg === "--out") out = next();
    else throw new SyntaxError(`unknown argument ${arg}`);
  }
  if (league === undefined) throw new SyntaxError("--league <file> is required (the stand-in league)");
  if (!Number.isInteger(seasons) || seasons < 1) throw new SyntaxError("--seasons must be a whole number, 1 or more");
  return { seed, seasons, league, out };
}

const fromCaller = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path);
const m = (x: number) => `$${(x / 1e6).toFixed(1)}M`;
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const mid = (xs: readonly number[]) => xs[Math.floor(xs.length / 2)] ?? 0;
const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);

function print(y: CapYear): void {
  console.log(`\nLeague year ${y.leagueYear}: cap ${m(y.cap)} (${y.seconds.toFixed(0)}s)`);
  console.log(`  cap used (top 51 + dead): lowest ${pct(y.capUse[0]!)}, median ${pct(mid(y.capUse))}, highest ${pct(y.capUse[y.capUse.length - 1]!)}`);
  console.log(`  carried over a team: mean ${m(mean(y.carryover))}, median ${m(mid(y.carryover))}, most ${m(y.carryover[y.carryover.length - 1]!)}`);
  console.log(`  dead money a team: mean ${m(mean(y.deadMoney))}, median ${m(mid(y.deadMoney))}, most ${m(y.deadMoney[y.deadMoney.length - 1]!)}`);
  console.log(`  share by group: ${Object.entries(y.groupShare).map(([g, s]) => `${g} ${pct(s)}`).join(", ")}`);
  console.log(`  biggest deals: ${y.topDeals.map((d) => `${d.position} ${m(d.apy)}`).join(", ")}`);
  const c = y.counts;
  console.log(`  signed: ${Object.entries(c.signed).map(([k, n]) => `${k} ${n}`).join(", ")}`);
  console.log(`  expired ${c.expired}, released ${c.released}, restructured ${c.restructured}, free agents to new teams ${c.freeAgentMoves}, comp picks ${c.compPicks}`);
  console.log(`  veteran deals with a new team: ${c.newTeam2M} at $2M+ a year, ${c.newTeam5M} at $5M+; own team, 2+ years: ${c.ownTeamMultiYear}`);
  console.log(`  players on teams: ${y.rosterSizes[0]}-${y.rosterSizes[y.rosterSizes.length - 1]}`);
}

const args = parse(process.argv.slice(2));
const file = readStandInFile(readFileSync(fromCaller(args.league), "utf8"));
const years = runCapCheck({ seed: args.seed, file, seasons: args.seasons, onYear: print });
if (args.out) {
  writeFileSync(fromCaller(args.out), JSON.stringify({ seed: args.seed, league: args.league, years }, null, 2));
  console.log(`Saved ${fromCaller(args.out)}`);
}
