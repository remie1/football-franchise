/**
 * `pnpm --filter @ff/narrative news -- --season <file> [--out <file>]`
 *
 * Reads a season saved by `pnpm --filter @ff/calibration season -- --seed <seed> --out <file>`,
 * prints each week's headlines, and saves them where the game viewer's News page looks:
 * `apps/game/public/news/`, under the season file's name, with an `index.json` listing every
 * file there, as `export-game` does for games (ADR-082 step 3). `--out <file>` saves there
 * instead. That folder is git-ignored; saved news is a re-makeable output, not source.
 *
 * A relative path is read from the folder the command was typed in (pnpm's `INIT_CWD`), not from
 * this package's folder, where pnpm runs the script.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FranchiseEventEnvelope, LeagueStructure, SeasonState } from "@ff/contracts";
import { createNewsDesk, type Edition } from "../news/desk.js";
import { newsFile } from "../news/file.js";
import { formatEdition } from "../news/format.js";
import { indexLeague, type TeamNames } from "../news/league.js";

export const VIEWER_NEWS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../apps/game/public/news");

const fromCaller = (path: string) => resolve(process.env.INIT_CWD ?? process.cwd(), path);

export interface NewsCliArgs {
  readonly season: string;
  readonly out?: string;
}

/** What the season command saves with `--out`; the news reads only these parts of it. */
export interface SavedSeason {
  readonly seed: string;
  readonly league: { readonly structure: LeagueStructure; readonly teams: readonly TeamNames[] };
  readonly season: Pick<SeasonState, "season" | "schedule">;
  readonly events?: readonly FranchiseEventEnvelope[];
}

export function parseNewsArgs(argv: readonly string[]): NewsCliArgs {
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
  return { season, ...(out === undefined ? {} : { out }) };
}

/** Prints the season's news, saves it, and returns where it was saved. */
export function runNews(args: NewsCliArgs, viewerDir = VIEWER_NEWS_DIR, log: (line: string) => void = console.log): string {
  const saved = JSON.parse(readFileSync(fromCaller(args.season), "utf8")) as SavedSeason;
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
      log(`\n${formatEdition(e, desk.scoreLine)}`);
    }
  };
  for (const envelope of saved.events) print(desk.take(envelope));
  print(desk.finish());
  log(`\n${editions.reduce((n, e) => n + e.stories.length, 0)} headlines in ${editions.length} editions`);

  const file = newsFile({
    seed: saved.seed,
    season: saved.season.season,
    league: indexLeague(saved.league.structure, saved.league.teams),
    events: saved.events,
    editions,
  });
  const path = args.out === undefined ? join(viewerDir, basename(args.season)) : fromCaller(args.out);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(file) + "\n");
  if (args.out === undefined) {
    const listed = readdirSync(viewerDir).filter((f) => f.endsWith(".json") && f !== "index.json").sort();
    writeFileSync(join(viewerDir, "index.json"), JSON.stringify({ news: listed }, null, 2) + "\n");
  }
  return path;
}
