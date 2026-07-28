/**
 * REGENERATING THE FROZEN CALLER, without a build step.
 *
 * `src/caller/refit.ts` is the documented entry point and needs `pnpm --filter @ff/calibration
 * build` plus built workspace dependencies, because a compiled `.js` cannot import a workspace
 * package whose `main` is a `.ts` file. This is the same fit, run through the test toolchain,
 * which already resolves the workspace:
 *
 *   FF_REFIT=1 pnpm --filter @ff/calibration test refitTool
 *
 * Skipped otherwise. It writes a source file, and a test that rewrites source on every run is a
 * test that turns a `git status` into noise.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fitPlayCaller, renderTendenciesModule } from "../src/caller/fit.js";
import { fitFourthDown } from "../src/caller/fourthDown.js";
import { renderFourthDownModule } from "../src/caller/renderFourthDown.js";
import { fsCacheStore } from "../src/ingest/cache.js";
import { openForTuning } from "../src/ingest/load.js";
import { TUNING_SEASONS } from "../src/ingest/seasons.js";
import { pbpSource, type PbpRow } from "../src/ingest/sources/pbp.js";

const enabled = process.env["FF_REFIT"] === "1";

describe.skipIf(!enabled)("frozen caller refit", () => {
  it("fits both tables from the tuning seasons and writes the artefact", async () => {
    const store = fsCacheStore(resolve(import.meta.dirname, "..", "data-cache"));
    const pbp = await openForTuning<PbpRow>(store, pbpSource, TUNING_SEASONS);
    const version = process.env["FF_REFIT_VERSION"] ?? "v1";

    const tendencies = fitPlayCaller(pbp, { version });
    const fourthDown = fitFourthDown(pbp, { version });

    // Sanity floors, so a fit against a truncated cache cannot silently become the frozen caller.
    expect(tendencies.tendencies.plays).toBeGreaterThan(90_000);
    expect(tendencies.diagnostics.globalPassRate).toBeGreaterThan(0.5);
    expect(tendencies.diagnostics.globalPassRate).toBeLessThan(0.65);
    expect(fourthDown.fitted.decisions).toBeGreaterThan(8_000);

    writeFileSync(
      resolve(import.meta.dirname, "..", "src", "caller", "frozenTendencies.ts"),
      `${renderTendenciesModule(tendencies)}\n${renderFourthDownModule(fourthDown)}`,
      "utf8",
    );
  }, 600_000);
});
