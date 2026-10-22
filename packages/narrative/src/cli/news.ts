/**
 * `pnpm --filter @ff/narrative news -- --season <file> [--out <file>]`
 *
 * Reads a season saved by `pnpm --filter @ff/calibration season -- --seed <seed> --out <file>`,
 * prints each week's headlines, and with `--out` saves them as JSON for the game viewer (ADR-082).
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { FranchiseEventEnvelope, LeagueStructure, SeasonState } from "@ff/contracts";
import { createNewsDesk, type Edition } from "../news/desk.js";
import { formatEdition } from "../news/format.js";
import type { TeamNames } from "../news/league.js";

interface SavedSeason {
  seed: string;
  league: { structure: LeagueStructure; teams: TeamNames[] };
  season: SeasonState;
  events?: FranchiseEventEnvelope[];
}

function parse(argv: readonly string[]) {
  let season: string | undefined;
  let out: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new SyntaxError(`${arg} requires a value`);
      return v;
    };
    if (arg === "--") continue;
    else if (arg === "--season") season = next();
    else if (arg === "--out") out = next();
    else throw new SyntaxError(`unknown argument ${arg}`);
  }
  if (season === undefined) throw new SyntaxError("--season <file> is required");
  return { season, out };
}

const args = parse(process.argv.slice(2));
const saved = JSON.parse(readFileSync(args.season, "utf8")) as SavedSeason;
if (!Array.isArray(saved.events)) {
  throw new Error(
    `${args.season} has no event list. Seasons saved before the news desk don't; play it again with ` +
      "`pnpm --filter @ff/calibration season -- --seed <seed> --out <file>`.",
  );
}

const desk = createNewsDesk({
  seed: saved.seed,
  structure: saved.league.structure,
  teams: saved.league.teams,
  schedule: saved.season.schedule,
});
const editions: Edition[] = [];
const print = (list: Edition[]) => {
  for (const e of list) {
    editions.push(e);
    console.log(`\n${formatEdition(e, desk.scoreLine)}`);
  }
};
for (const envelope of saved.events) print(desk.take(envelope));
print(desk.finish());

const stories = editions.reduce((n, e) => n + e.stories.length, 0);
console.log(`\n${stories} headlines in ${editions.length} editions`);
if (args.out) {
  writeFileSync(args.out, JSON.stringify({ seed: saved.seed, season: saved.season.season, editions }, null, 2));
  console.log(`Saved ${args.out}`);
}
