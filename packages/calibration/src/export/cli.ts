/**
 * `pnpm --filter @ff/calibration export-game -- --seed <seed> [--caller v5] [--out <dir>]`
 *
 * Plays one game and saves it where the viewer looks: `apps/game/public/games/` by default,
 * with an `index.json` listing every file there so the page can offer them. That folder is
 * git-ignored; a saved game is a re-makeable output, not source.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CALLER_VERSIONS, type CallerVersion } from "../caller/anticipate.js";
import { exportGame } from "./gameFile.js";

export const DEFAULT_OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../apps/game/public/games");

export interface ExportCliArgs {
  readonly seed: string;
  readonly callerVersion?: CallerVersion;
  readonly outDir: string;
}

export function parseExportArgs(argv: readonly string[]): ExportCliArgs {
  let seed: string | undefined;
  let callerVersion: CallerVersion | undefined;
  let outDir = DEFAULT_OUT_DIR;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = (): string => {
      const v = argv[++i];
      if (v === undefined) throw new SyntaxError(`${arg} requires a value`);
      return v;
    };
    switch (arg) {
      case "--":
        break;
      case "--seed":
        seed = next();
        break;
      case "--caller": {
        const v = next();
        if (!(CALLER_VERSIONS as readonly string[]).includes(v)) {
          throw new SyntaxError(`--caller must be one of ${CALLER_VERSIONS.join(", ")}`);
        }
        callerVersion = v as CallerVersion;
        break;
      }
      case "--out":
        outDir = resolve(next());
        break;
      default:
        throw new SyntaxError(`unknown argument ${arg}`);
    }
  }
  if (seed === undefined) throw new SyntaxError("--seed is required: the same seed always makes the same game");
  return { seed, outDir, ...(callerVersion === undefined ? {} : { callerVersion }) };
}

/** A file name a seed can always make, whatever characters the seed has. */
export function gameFileName(seed: string, callerVersion?: CallerVersion): string {
  const safe = seed.replace(/[^A-Za-z0-9_-]+/g, "_");
  return `${safe}${callerVersion === undefined ? "" : `.${callerVersion}`}.json`;
}

export function runExport(args: ExportCliArgs): string {
  const file = exportGame({ seed: args.seed, ...(args.callerVersion === undefined ? {} : { callerVersion: args.callerVersion }) });
  mkdirSync(args.outDir, { recursive: true });
  const path = join(args.outDir, gameFileName(args.seed, args.callerVersion));
  writeFileSync(path, JSON.stringify(file) + "\n");
  const listed = readdirSync(args.outDir)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .sort();
  writeFileSync(join(args.outDir, "index.json"), JSON.stringify({ games: listed }, null, 2) + "\n");
  return path;
}

