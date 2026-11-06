/**
 * `pnpm --filter @ff/calibration export-game -- --seed <seed> [--caller v5] [--engine-rules <name>] [--out <dir>]`
 *
 * `--engine-rules` names the rules bundle to play (ADR-089 §9): `legacy` (the default) or one of this
 * build's design bundles, `pocket-1.s1` (step 1), `pocket-1.s2` (step 2: must act per rusher, the
 * forcing point at 0.5 s and the warning at 1.0 s) or `pocket-1.s3` (step 3: men nobody blocked run
 * on their own clock from their snap spots, a touched man is a late, weak block, and any FRONT threat
 * closes the climb lane), never an arm (O26). A non-legacy file is named after its rules too, so it
 * never overwrites the legacy file of the same seed.
 *
 * Plays one game and saves it where the viewer looks: `apps/game/public/games/` by default,
 * with an `index.json` listing every file there so the page can offer them. That folder is
 * git-ignored; a saved game is a re-makeable output, not source.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CALLER_VERSIONS, type CallerVersion } from "../caller/anticipate.js";
import { ENGINE_RULES, isEngineRules, LEGACY_RULES, type EngineRules } from "../pocket/rules.js";
import { exportGame } from "./gameFile.js";

export const DEFAULT_OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../apps/game/public/games");

export interface ExportCliArgs {
  readonly seed: string;
  readonly callerVersion?: CallerVersion;
  /** ADR-089 §9: absent plays `DEFAULT_ENGINE_RULES`. */
  readonly engineRules?: EngineRules;
  readonly outDir: string;
}

export function parseExportArgs(argv: readonly string[]): ExportCliArgs {
  let seed: string | undefined;
  let callerVersion: CallerVersion | undefined;
  let engineRules: EngineRules | undefined;
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
      case "--engine-rules": {
        const v = next();
        if (!isEngineRules(v)) throw new SyntaxError(`--engine-rules must be one of ${ENGINE_RULES.join(", ")}`);
        engineRules = v;
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
  return {
    seed,
    outDir,
    ...(callerVersion === undefined ? {} : { callerVersion }),
    ...(engineRules === undefined ? {} : { engineRules }),
  };
}

/**
 * A file name a seed can always make, whatever characters the seed has. Rules other than `legacy`
 * add their name, so a legacy file's name is what it always was.
 */
export function gameFileName(seed: string, callerVersion?: CallerVersion, engineRules?: EngineRules): string {
  const safe = seed.replace(/[^A-Za-z0-9_-]+/g, "_");
  const rules = engineRules === undefined || engineRules === LEGACY_RULES ? "" : `.${engineRules}`;
  return `${safe}${callerVersion === undefined ? "" : `.${callerVersion}`}${rules}.json`;
}

export function runExport(args: ExportCliArgs): string {
  const file = exportGame({
    seed: args.seed,
    ...(args.callerVersion === undefined ? {} : { callerVersion: args.callerVersion }),
    ...(args.engineRules === undefined ? {} : { engineRules: args.engineRules }),
  });
  mkdirSync(args.outDir, { recursive: true });
  const path = join(args.outDir, gameFileName(args.seed, args.callerVersion, args.engineRules));
  writeFileSync(path, JSON.stringify(file) + "\n");
  const listed = readdirSync(args.outDir)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .sort();
  writeFileSync(join(args.outDir, "index.json"), JSON.stringify({ games: listed }, null, 2) + "\n");
  return path;
}

