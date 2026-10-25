/**
 * The `pocket` script's entry point (ADR-089 step 0):
 * `pnpm --filter @ff/calibration pocket -- --step 0 [--write-filed <filing.json>] [--out <file.json>]`.
 * Everything it does lives in `step0.ts`, where it is tested.
 */
import { pocketCommand } from "./step0.js";

pocketCommand(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`pocket: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
