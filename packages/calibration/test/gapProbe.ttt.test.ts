/**
 * ============================================================================
 * EXTERNAL PROBE — gapProbe.ttt.test.ts
 * ============================================================================
 *
 * ⛔ EXTERNAL. Authored by an outside reviewer, NOT this project's calibration agent, as part of
 * a four-file bundle (`gapProbe.dropback.test.ts`, `gapProbe.arms.test.ts`, `gapProbe.corr.test.ts`,
 * `gapProbe.ttt.test.ts`) plus `corr-rig.engine.patch` and `PRESSURE-GAP-COLD-READ.md`. Authored
 * against commit `a7b2a6b` (pinned in the bundle's own provenance table). HEAD has since advanced;
 * see the intake dispatch's findings for whether reproduction holds.
 *
 * ⛔ THIS IS A MEASUREMENT INSTRUMENT. IT GRADES NOTHING. Confirmed by inspection: this file
 * contains zero `expect()` calls. It runs the canonical corpus through `@ff/engine`'s PUBLIC event
 * stream only (no engine-internal read, no engine modification) and prints three `TTT_*` lines to
 * console: THROW-only mean time-to-throw (the report-era population), THROW+THROWAWAY mean (the
 * current registered `time_to_throw` population per `collect.ts`'s entry-94 fix), and the
 * throwaway-tick-only mean. It is gated behind `FF_GAP_TTT` so it cannot execute, pass, or fail as
 * part of this project's own suite (`pnpm verify`, `pnpm -r test`, bare `vitest run`) by default —
 * matching the convention set by `backlog87Numerator.test.ts` (`FF_B87`),
 * `dispatchCEntryExit.test.ts` (`FF_DISPATCH_C`), and `gapProbe.dropback.test.ts`
 * (`FF_GAP_DROPBACK`).
 *
 * Run explicitly (from `packages/calibration`):
 *
 *   FF_GAP_TTT=1 npx vitest run test/gapProbe.ttt.test.ts
 *
 * This file has no `PROBE_GAMES` override — it always folds every fixture the 496-game canonical
 * corpus (`flat-60-32t`, `SYNTHETIC_ROUND_ROBIN` season 2024, batch seed `baseline-0001`) produces,
 * per its own `fixtures.length` loop bound.
 *
 * No metric, band, verdict, engine code, tunable, or contract is changed by landing this file.
 * ============================================================================
 */
import { describe, it } from "vitest";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";

const enabled = process.env["FF_GAP_TTT"] === "1";

describe.skipIf(!enabled)("gap probe: ttt definitions", () => {
  it("measures both populations at a7b2a6b", () => {
    const league = buildFlatLeague({ teams: 32 });
    const index = indexLeague(league);
    const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
    const seeds = generateSeeds("baseline-0001", fixtures.length);
    const throwOnly: number[] = [];
    const withThrowaways: number[] = [];
    const throwawayTicks: number[] = [];
    for (let i = 0; i < fixtures.length; i++) {
      const built = buildFixture(index, fixtures[i]!);
      const { observation } = runOneGame({
        built, seed: seeds.seeds[i]!, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN,
      });
      let isPass = false, tick = 0, curPlayId: string | null = null;
      let threwAt: number | null = null, threwAwayAt: number | null = null;
      const flush = () => {
        if (!isPass) return;
        // repo collect.ts order: releaseTick = threw ? throwTick : throwawayTick, pushed in play order
        if (threwAt !== null) { throwOnly.push(threwAt); withThrowaways.push(threwAt); }
        else if (threwAwayAt !== null) { withThrowaways.push(threwAwayAt); throwawayTicks.push(threwAwayAt); }
      };
      for (const env of observation.events) {
        const e = env.event as { type: string; playId?: unknown; payload?: any };
        const pid = e.playId === undefined ? null : String(e.playId);
        if (pid !== null && pid !== curPlayId) {
          flush();
          curPlayId = pid;
          isPass = false; tick = 0; threwAt = null; threwAwayAt = null;
        }
        switch (e.type) {
          case "PLAY_START": isPass = e.payload?.kind === "PASS_PLAY_V1"; break;
          case "TICK": tick = Number(e.payload?.tick ?? 0); break;
          case "THROW": threwAt = tick; break;
          case "THROWAWAY": threwAwayAt = tick; break;
        }
      }
      flush();
    }
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log("TTT_THROW_ONLY n=" + throwOnly.length + " mean=" + String(mean(throwOnly)));
    console.log("TTT_WITH_THROWAWAYS n=" + withThrowaways.length + " mean=" + String(mean(withThrowaways)));
    console.log("THROWAWAY_TICKS n=" + throwawayTicks.length + " mean=" + String(mean(throwawayTicks)));
  }, 1200000);
});
