/**
 * The `pocket` script's entry point (ADR-089 steps 0, 1 and 2):
 * `pnpm --filter @ff/calibration pocket -- --step 0 [--write-filed <filing.json>] [--out <file.json>]`;
 * `pnpm --filter @ff/calibration pocket -- --step 1 [--arms A1,A2] [--shard i/n] [--cache <dir>] [--seed-set 1|2] [--report <file.md>] [--out <file.json>]`;
 * `pnpm --filter @ff/calibration pocket -- --step 1 --digests --out <file.json>`;
 * `pnpm --filter @ff/calibration pocket -- --step 2 [--arms A1,B3] [--shard i/n] [--cache <dir>] [--seed-set 1|2] [--report <file.md>] [--out <file.json>]`;
 * `pnpm --filter @ff/calibration pocket -- --step 2 --digests --out <file.json>`;
 * `pnpm --filter @ff/calibration pocket -- --step 2 [--arms A1] [--cache <dir>] [--seed-set 1|2] --m2`.
 * The arguments and step 0 live in `step0.ts`, step 1 in `step1.ts`, step 2 in `step2.ts`, where
 * they are tested.
 */
import { pocketCommand } from "./step0.js";

pocketCommand(process.argv.slice(2)).catch((e: unknown) => {
  process.stderr.write(`pocket: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exitCode = 1;
});
