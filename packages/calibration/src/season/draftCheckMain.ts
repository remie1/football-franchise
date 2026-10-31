/**
 * `pnpm --filter @ff/calibration draft-check -- --league <file> [--seed <seed>] [--seasons 20] [--out <file>]`
 *
 * Plays the stand-in league for several seasons (the cap check's walk) and sets what the draft did
 * against the real league (ADR-086 D7): positions in round 1, how often each round's picks start,
 * compensatory picks and waiver claims a year. `--out` saves the numbers as JSON.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readStandInFile } from "./standInLeague.js";
import { NFL_DRAFT, runDraftCheck } from "./draftCheck.js";

function parse(argv: readonly string[]) {
  let seed = "draft-check";
  let seasons = 20;
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
const pct = (x: number | undefined) => `${(100 * (x ?? 0)).toFixed(1)}%`;

const args = parse(process.argv.slice(2));
const file = readStandInFile(readFileSync(fromCaller(args.league), "utf8"));
const r = runDraftCheck({
  seed: args.seed, file, seasons: args.seasons,
  onYear: (y) => console.log(`league year ${y.leagueYear} done (${y.seconds.toFixed(0)}s)`),
});
console.log(`\n${r.drafts} drafts`);
console.log("\nRound 1 by position group: ours vs NFL 2011-2024");
for (const g of Object.keys(r.roundOneShare)) console.log(`  ${g.padEnd(5)} ${pct(r.roundOneShare[g]).padStart(6)}  ${pct(NFL_DRAFT.roundOneShare[g]).padStart(6)}`);
console.log("\nStarter seasons over seasons on a 53, by round: ours vs NFL drafts 2011-2018");
for (const b of ["1", "2", "3", "4-7"]) console.log(`  round ${b.padEnd(4)} ${pct(r.starterRate[b]).padStart(6)}  ${pct(NFL_DRAFT.starterRate[b]).padStart(6)}`);
console.log("\nEver a starter (drafts with 3+ seasons played): ours vs NFL");
for (const b of ["1", "2", "3", "4-7"]) console.log(`  round ${b.padEnd(4)} ${pct(r.everStarter[b]).padStart(6)}  ${pct(NFL_DRAFT.everStarter[b]).padStart(6)}`);
console.log("\nEach draft: compensatory picks (clubs), waiver claims on the cut-down day before it");
for (const y of r.perYear) console.log(`  ${y.draft}: ${y.compPicks} (${y.compClubs} clubs), ${y.waiverClaims} claims`);
if (args.out) {
  writeFileSync(fromCaller(args.out), JSON.stringify({ seed: args.seed, league: args.league, nfl: NFL_DRAFT, ...r }, null, 2));
  console.log(`Saved ${fromCaller(args.out)}`);
}
