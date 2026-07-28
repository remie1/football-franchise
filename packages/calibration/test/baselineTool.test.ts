/**
 * THE FIRST BASELINE COMPARISON, end to end against the real cache.
 *
 *   FF_BASELINE=1 pnpm --filter @ff/calibration test baselineTool
 *   FF_BASELINE=1 FF_BASELINE_OUT=reports/baseline-0001.md pnpm --filter @ff/calibration test baselineTool
 *
 * Skipped by default: it needs `data-cache/` populated (a ~300 MB read) and runs several hundred
 * games. `calibration.md` §10.3 puts the full baseline on a **nightly batch** and the known-truth
 * harness on every merge, which is exactly this split — `knownTruth.test.ts` is the CI gate and
 * this is the nightly.
 *
 * The report it produces is `calibration.md` §5.1's heartbeat document. It writes nothing unless
 * `FF_BASELINE_OUT` names a path, because a test that writes a file on every run turns
 * `git status` into noise.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runBatch } from "../src/harness/batch.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { fsCacheStore } from "../src/ingest/cache.js";
import { TUNING_SEASONS } from "../src/ingest/seasons.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { openRealForTuning } from "../src/metrics/realInput.js";
import { buildBaselineReport, renderBaselineReport } from "../src/report/baseline.js";
import "../src/metrics/index.js";

const enabled = process.env["FF_BASELINE"] === "1";

describe.skipIf(!enabled)("baseline comparison", () => {
  it("runs a full batch and compares every metric against the ingested seasons", async () => {
    const league = buildFlatLeague({ teams: 32 });
    const rounds = Number(process.env["FF_BASELINE_ROUNDS"] ?? "1");
    const schedule = { kind: "SYNTHETIC_ROUND_ROBIN", rounds, season: 2024 } as const;
    // 32 teams, one round-robin round = 496 games, inside `calibration.md` §3's
    // "league-level metrics stabilize around 200-500 simulated games".
    const seeds = generateSeeds(process.env["FF_BASELINE_SEED"] ?? "baseline-0001", 16 * 31 * rounds);

    const batch = await runBatch({
      league,
      schedule,
      seeds,
      playCalling: { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN },
    });

    const store = fsCacheStore(resolve(import.meta.dirname, "..", "data-cache"));
    const real = await openRealForTuning(store, TUNING_SEASONS, {
      withNgs: true,
      withParticipation: true,
    });

    const report = buildBaselineReport({
      id: process.env["FF_BASELINE_ID"] ?? "baseline-0001",
      accumulator: batch.accumulator,
      provenance: batch.provenance,
      caller: batch.caller,
      real,
    });

    const rendered = renderBaselineReport(report);
    const out = process.env["FF_BASELINE_OUT"];
    if (out !== undefined) {
      const path = resolve(import.meta.dirname, "..", out);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, rendered, "utf8");
    }

    // A compact tabular dump for the terminal; the markdown is the artefact.
    for (const e of report.evaluations) {
      // eslint-disable-next-line no-console
      console.log(
        [
          `T${e.tier}`,
          e.metricId.padEnd(38),
          e.verdict.padEnd(17),
          `sim=${e.sim === null ? "—" : e.sim.toFixed(4)}`.padEnd(16),
          `real=${e.real === null ? "—" : e.real.toFixed(4)}`.padEnd(17),
          `dev=${e.deviation === null ? "—" : e.deviation.toFixed(4)}`.padEnd(14),
          `n=${e.simN}/${e.realN}`,
        ].join(" "),
      );
    }
    // eslint-disable-next-line no-console
    console.log(
      `\ngames=${batch.provenance.games} wall=${batch.wallClockMs}ms seeds=${batch.provenance.seedDigest}\n` +
        `caller: pass=${batch.caller.passCalls} run=${batch.caller.runCalls} ` +
        `redraws=${batch.caller.conceptRedraws} ` +
        `4th: go=${batch.caller.fourthDownGo} punt=${batch.caller.fourthDownPunt} fg=${batch.caller.fourthDownFieldGoal}\n` +
        `new divergences (no backlog entry): ${report.newDivergences.join(", ") || "none"}`,
    );

    expect(report.evaluations.length).toBeGreaterThan(20);
    expect(report.eligibility).toBe("TUNING");
  }, 1_800_000);
});
