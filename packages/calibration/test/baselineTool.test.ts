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
 *
 * ============================ FF_ENGINE_COMMIT IS REQUIRED ============================
 *
 *   FF_BASELINE=1 FF_ENGINE_COMMIT=$(git rev-parse HEAD) \
 *     FF_BASELINE_OUT=reports/baseline-0003.md pnpm --filter @ff/calibration test baselineTool
 *
 * A carry-forward has to record the tree it was produced against (`src/report/identity.ts`), and
 * a pure function cannot know its own commit. **This file is the only place in the package that
 * reads `FF_ENGINE_COMMIT`, and nothing anywhere shells out to `git`** — `test/carryForward.test.ts`
 * asserts both, by scanning `src/`. The boundary is deliberate: the harness stays a library that
 * a worker thread or another package can call, and the one impure fact enters at the top, from a
 * command the operator typed.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { runBatch } from "../src/harness/batch.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { fsCacheStore } from "../src/ingest/cache.js";
import { TUNING_SEASONS } from "../src/ingest/seasons.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { openRealForTuning } from "../src/metrics/realInput.js";
import {
  buildBaselineReport,
  carryForward,
  renderBaselineReport,
  withTrend,
} from "../src/report/baseline.js";
import {
  assertEngineCommit,
  baselineIdentity,
  decideTrend,
  type TrendDecision,
} from "../src/report/identity.js";
import { reconstructedTrend } from "../src/report/previous.js";
import "../src/metrics/index.js";

const enabled = process.env["FF_BASELINE"] === "1";

/**
 * The one env read, and the one place a human's assertion enters the pipeline.
 *
 * It refuses rather than defaults. A run that stamped "unknown" would produce a carry-forward
 * indistinguishable from `reports/baseline-0002.carry-forward.json`, which is the artefact this
 * whole mechanism exists to make impossible.
 */
function requireEngineCommit(): string {
  const raw = process.env["FF_ENGINE_COMMIT"];
  if (raw === undefined || raw.trim().length === 0) {
    throw new Error(
      "FF_ENGINE_COMMIT is required. A baseline's carry-forward records the engine tree its " +
        "numbers were produced against; without it a successor cannot tell whether that tree " +
        "still exists, which is exactly how reports/baseline-0002.carry-forward.json went " +
        "silently stale.\n\n" +
        "  FF_BASELINE=1 FF_ENGINE_COMMIT=$(git rev-parse HEAD) \\\n" +
        "    FF_BASELINE_OUT=reports/baseline-0003.md pnpm --filter @ff/calibration test baselineTool\n\n" +
        "If your working tree is dirty, append `-dirty`. A -dirty run is honest and its " +
        "carry-forward will be refused by every successor, including one with the same hash — " +
        "two dirty trees are not the same tree.",
    );
  }
  return assertEngineCommit(raw);
}

describe.skipIf(!enabled)("baseline comparison", () => {
  it("runs a full batch and compares every metric against the ingested seasons", async () => {
    // First, before several hundred games are spent: a batch that cannot stamp its output is a
    // batch whose output nobody may trend against.
    const engineCommit = requireEngineCommit();
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
      // ADR-022 made blitz measurable; FTN's `n_pass_rushers` is the real side of it.
      withFtn: true,
    });

    /**
     * THE TREND COLUMN, AND WHERE ITS PREDECESSOR COMES FROM.
     *
     * `FF_BASELINE_PREV` names a carry-forward JSON written by an earlier run of this tool. It is
     * ADJUDICATED by `decideTrend` against this run's identity before it may inform anything: a
     * file from a different engine commit, a different tunables version or a different league is
     * REFUSED, the report prints why, and every trend cell reads "refused". A file that predates
     * the provenance stamp — such as the deleted `baseline-0002.carry-forward.json` — is refused
     * on its missing `format` tag before its numbers are read at all.
     *
     * With no `FF_BASELINE_PREV`, `previous.ts` supplies the figures the backlog recorded in
     * prose, each cited to the line that recorded it. That is a RECONSTRUCTION: arrows yes,
     * ratchet never.
     */
    const identity = baselineIdentity({
      provenance: batch.provenance,
      engineCommit,
      eligibility: real.eligibility,
      realSeasons: real.seasons,
    });
    const prevPath = process.env["FF_BASELINE_PREV"];
    const prevFile =
      prevPath !== undefined && existsSync(resolve(import.meta.dirname, "..", prevPath))
        ? (JSON.parse(
            readFileSync(resolve(import.meta.dirname, "..", prevPath), "utf8"),
          ) as unknown)
        : undefined;
    const trend: TrendDecision =
      prevFile === undefined ? reconstructedTrend() : decideTrend(prevFile, identity);

    const report = withTrend(
      buildBaselineReport({
        id: process.env["FF_BASELINE_ID"] ?? "baseline-0001",
        engineCommit,
        accumulator: batch.accumulator,
        provenance: batch.provenance,
        caller: batch.caller,
        real,
        trend,
      }),
    );

    if (trend.kind === "REFUSED") {
      // eslint-disable-next-line no-console
      console.log(`\n${trend.message}\n`);
    }

    const rendered = renderBaselineReport(report);
    const out = process.env["FF_BASELINE_OUT"];
    if (out !== undefined) {
      const path = resolve(import.meta.dirname, "..", out);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, rendered, "utf8");
      // The half baseline-0001 did not write. A report whose successor cannot read it has no
      // trend column, and "what moved" then has to be reconstructed from prose — which is
      // exactly what `previous.ts` had to do.
      writeFileSync(
        path.replace(/\.md$/, "") + ".carry-forward.json",
        `${JSON.stringify(carryForward(report), null, 2)}\n`,
        "utf8",
      );
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
