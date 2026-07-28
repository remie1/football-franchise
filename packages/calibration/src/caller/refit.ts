/**
 * REGENERATE THE FROZEN CALLER.
 *
 *   pnpm --filter @ff/calibration build
 *   node packages/calibration/dist/caller/refit.js [--version v1] [--out src/caller/frozenTendencies.ts]
 *
 * ⚠ THIS PATH IS BLOCKED TODAY, and the blocker is the same one `harness/workerPool.ts`
 * documents: a compiled `refit.js` imports `@ff/playbook` for `fieldRegion`, node resolves that
 * through the playbook package's `main`, and that `main` is `src/index.ts`. Until those packages
 * publish built JS, use the toolchain-resolved path instead:
 *
 *   FF_REFIT=1 pnpm --filter @ff/calibration test refitTool
 *
 * which runs exactly these three calls through Vitest's resolver. This file stays because it is
 * the correct shape of the tool and becomes runnable the moment the packaging changes.
 *
 * Reads the tuning seasons out of the cache, fits both tables, and writes the generated module.
 * Refitting is a deliberate act with a version bump attached, because the caller being FROZEN is
 * what makes two batches comparable (`calibration.md` §3.1) — a caller that quietly refitted on
 * every run would make every cross-report delta ambiguous between "the engine changed" and "the
 * coach changed", which is the one thing §3.1 exists to prevent.
 *
 * It refuses 2025 by construction: `openForTuning` throws on a held-out season, and
 * `fitPlayCaller` asserts the brand again at runtime.
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fsCacheStore } from "../ingest/cache.js";
import { openForTuning } from "../ingest/load.js";
import { pbpSource, type PbpRow } from "../ingest/sources/pbp.js";
import { TUNING_SEASONS } from "../ingest/seasons.js";
import { fitFourthDown } from "./fourthDown.js";
import { fitPlayCaller, renderTendenciesModule } from "./fit.js";
import { renderFourthDownModule } from "./renderFourthDown.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const version = valueOf(args, "--version") ?? "v1";
  const out = valueOf(args, "--out") ?? "src/caller/frozenTendencies.ts";
  const cacheDir = valueOf(args, "--cache") ?? "data-cache";

  const store = fsCacheStore(cacheDir);
  process.stdout.write(`reading pbp for ${TUNING_SEASONS.join(", ")} from ${store.root}\n`);
  const pbp = await openForTuning<PbpRow>(store, pbpSource, TUNING_SEASONS);
  process.stdout.write(`${pbp.rows.length} rows\n`);

  const tendencies = fitPlayCaller(pbp, { version });
  const fourthDown = fitFourthDown(pbp, { version });

  process.stdout.write(
    `run/pass: ${tendencies.diagnostics.rowsUsed} plays, global pass rate ` +
      `${tendencies.diagnostics.globalPassRate.toFixed(4)}, ` +
      `${tendencies.diagnostics.fullCellsQualified}/${tendencies.diagnostics.fullCellsObserved} full cells qualified\n`,
  );
  process.stdout.write(
    `fourth down: ${fourthDown.diagnostics.decisions} decisions — ` +
      `go ${(fourthDown.diagnostics.goRate * 100).toFixed(1)}%, ` +
      `punt ${(fourthDown.diagnostics.puntRate * 100).toFixed(1)}%, ` +
      `fg ${(fourthDown.diagnostics.fieldGoalRate * 100).toFixed(1)}%\n`,
  );

  const module =
    renderTendenciesModule(tendencies) + "\n" + renderFourthDownModule(fourthDown);
  const path = resolve(process.cwd(), out);
  await writeFile(path, module, "utf8");
  process.stdout.write(`wrote ${path}\n`);
}

function valueOf(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

await main();
