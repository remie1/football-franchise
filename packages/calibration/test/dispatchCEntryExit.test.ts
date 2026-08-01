/**
 * BACKLOG DISPATCH C — THE ENTRY:EXIT MEASUREMENT ON THE CANONICAL ARM.
 *
 *   FF_DISPATCH_C=1 pnpm --filter @ff/calibration test dispatchCEntryExit
 *
 * MEASUREMENT ONLY — registers nothing (the metrics themselves are registered in `tier1.ts`),
 * patches no tunable, changes no engine code. Re-runs the EXACT canonical corpus prior dispatches
 * measured on (496 games, `flat-60-32t`, `SYNTHETIC_ROUND_ROBIN` season 2024, batch seed
 * `"baseline-0001"`, frozen caller v2 + FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN, `DEFAULT_TUNABLES`)
 * and reports entry (`threat_creation_rate`), exit (`qb_disruption_rate`) and the declared
 * ratio (`threat_entry_exit_ratio`) together, with the arm named on every figure per the standing
 * report-discipline rule (backlog entry 90).
 */
import { describe, expect, it } from "vitest";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runBatch } from "../src/harness/batch.js";
import { buildFlatLeague } from "../src/league/flat.js";

const enabled = process.env["FF_DISPATCH_C"] === "1";

function say(line: string): void {
  // eslint-disable-next-line no-console
  console.log(line);
}

describe.skipIf(!enabled)("backlog dispatch C — entry:exit ratio, canonical arm", () => {
  it("measures the canonical baseline-0007-identical corpus", async () => {
    const league = buildFlatLeague({ teams: 32 });
    const schedule = { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 } as const;
    const seeds = generateSeeds("baseline-0001", 16 * 31 * 1); // 496 — identical to baseline-0007

    const batch = await runBatch({
      league,
      schedule,
      seeds,
      playCalling: {
        tendencies: FROZEN_TENDENCIES,
        fourthDown: FROZEN_FOURTH_DOWN,
        callerVersion: "v2",
      },
    });

    const p = batch.accumulator.play;
    const entry = p.dropbacks === 0 ? Number.NaN : p.pressuredDropbacks / p.dropbacks;
    const exit = p.dropbacks === 0 ? Number.NaN : p.disruptedDropbacks / p.dropbacks;
    const ratio = p.pressuredDropbacks === 0 ? Number.NaN : p.disruptedDropbacks / p.pressuredDropbacks;

    say("");
    say("=======================================================================");
    say("BACKLOG DISPATCH C — entry:exit ratio, canonical arm");
    say(
      `ARM: flat-60-32t · SYNTHETIC_ROUND_ROBIN 2024 · ${batch.provenance.games} games · ` +
        `seed digest ${batch.provenance.seedDigest} · caller v2 (FROZEN_TENDENCIES/FROZEN_FOURTH_DOWN) · DEFAULT_TUNABLES`,
    );
    say("=======================================================================");
    say(`dropbacks=${p.dropbacks}`);
    say(
      `ENTRY  threat_creation_rate = pressuredDropbacks/dropbacks = ${p.pressuredDropbacks}/${p.dropbacks} ` +
        `= ${(entry * 100).toFixed(3)}%`,
    );
    say(
      `EXIT   qb_disruption_rate   = disruptedDropbacks/dropbacks = ${p.disruptedDropbacks}/${p.dropbacks} ` +
        `= ${(exit * 100).toFixed(3)}%`,
    );
    say(
      `RATIO  threat_entry_exit_ratio = disruptedDropbacks/pressuredDropbacks = ${p.disruptedDropbacks}/${p.pressuredDropbacks} ` +
        `= ${(ratio * 100).toFixed(3)}%  (identity check: exit/entry = ${((exit / entry) * 100).toFixed(3)}%)`,
    );
    say("=======================================================================");
    say(
      "##DISPATCHC##" +
        JSON.stringify({
          arm: "flat-60-32t/SYNTHETIC_ROUND_ROBIN-2024/baseline-0001/496games/callerV2/DEFAULT_TUNABLES",
          games: batch.provenance.games,
          seedDigest: batch.provenance.seedDigest,
          dropbacks: p.dropbacks,
          pressuredDropbacks: p.pressuredDropbacks,
          disruptedDropbacks: p.disruptedDropbacks,
          sacks: p.sacks,
          entry,
          exit,
          ratio,
        }),
    );
    say("=======================================================================");

    // The subset relation, on THIS arm specifically (metrics.test.ts pins it on the fold's own
    // 30-game corpus; this is the same check on the canonical 496-game corpus every prior dispatch
    // measured on).
    expect(p.disruptedDropbacks).toBeLessThanOrEqual(p.pressuredDropbacks);
    expect(p.dropbacks).toBeGreaterThan(0);
    expect(p.pressuredDropbacks).toBeGreaterThan(0);
  }, 600_000);
});
