/**
 * ============================================================================
 * EXTERNAL PROBE — gapProbe.arms.test.ts
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
 * stream only (no engine-internal read, no engine modification), replicates ADR-049's decisive
 * threat-supply arms via `threatSupplyPatches.ts`'s in-memory `applyTunablePatch` helpers (never
 * writing `packages/engine/src/tunables.ts` — ADR-027), and prints one `ARM <name> {...}` line per
 * arm to console. It is gated behind `FF_GAP_ARMS` so it cannot execute, pass, or fail as part of
 * this project's own suite (`pnpm verify`, `pnpm -r test`, bare `vitest run`) by default — matching
 * the convention set by `backlog87Numerator.test.ts` (`FF_B87`), `dispatchCEntryExit.test.ts`
 * (`FF_DISPATCH_C`), and `gapProbe.dropback.test.ts` (`FF_GAP_DROPBACK`).
 *
 * Run explicitly (from `packages/calibration`):
 *
 *   FF_GAP_ARMS=1 PROBE_GAMES=150 npx vitest run test/gapProbe.arms.test.ts
 *
 * The file's own default (`GAMES = 150`) is the same smoke-test slice ADR-049's original arms were
 * measured at; it is not the 496-game canonical corpus.
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
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { arrivalOnlyBase, supplyAt } from "./threatSupplyPatches.js";

const enabled = process.env["FF_GAP_ARMS"] === "1";

const GAMES = Number(process.env.PROBE_GAMES ?? "150");
const FORCING = new Set(DEFAULT_TUNABLES.pocket.forcesDecision as readonly string[]);

function measure(tunables: Tunables, games: number) {
  const league = buildFlatLeague({ teams: 32 });
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds("baseline-0001", fixtures.length);
  let dropbacks = 0, pressured = 0, disrupted = 0, sacks = 0, scrambles = 0, throwaways = 0;
  let throwTicks: number[] = [];
  for (let i = 0; i < Math.min(games, fixtures.length); i++) {
    const built = buildFixture(index, fixtures[i]!);
    const { observation } = runOneGame({
      built, seed: seeds.seeds[i]!, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, tunables,
    });
    let isPass = false, worstNonClean = false, forced = false, arrived = false, scrambled = false;
    let threw = false, threwAway = false, tick = 0, releaseTick: number | null = null;
    let curPlayId: string | null = null;
    const flush = () => {
      if (!isPass) return;
      dropbacks++;
      if (worstNonClean) pressured++;
      const sacked = !threw && !threwAway && !scrambled;
      if (sacked) sacks++;
      if (scrambled) scrambles++;
      if (threwAway) throwaways++;
      if (arrived || forced || sacked) disrupted++;
      if (threw && releaseTick !== null) throwTicks.push(releaseTick);
    };
    for (const env of observation.events) {
      const e = env.event as { type: string; playId?: unknown; payload?: any };
      const pid = e.playId === undefined ? null : String(e.playId);
      if (pid !== null && pid !== curPlayId) {
        flush();
        curPlayId = pid;
        isPass = false; worstNonClean = false; forced = false; arrived = false; scrambled = false;
        threw = false; threwAway = false; releaseTick = null; tick = 0;
      }
      switch (e.type) {
        case "PLAY_START": isPass = e.payload?.kind === "PASS_PLAY_V1"; break;
        case "TICK": tick = Number(e.payload?.tick ?? 0); break;
        case "POCKET_STATUS": {
          const s = String(e.payload?.status ?? "");
          if (s !== "CLEAN") worstNonClean = true;
          if (FORCING.has(s)) forced = true;
          break;
        }
        case "RUSH_THREAT": if (String(e.payload?.state) === "ARRIVED") arrived = true; break;
        case "QB_DECISION": if (String(e.payload?.choice) === "SCRAMBLE") scrambled = true; break;
        case "THROW": threw = true; releaseTick = tick; break;
        case "THROWAWAY": threwAway = true; releaseTick = tick; break;
      }
    }
    flush();
  }
  const pct = (x: number) => ((100 * x) / dropbacks).toFixed(2);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  return {
    dropbacks,
    entry_pressured: pct(pressured),
    exit_disrupted: pct(disrupted),
    sack_rate: pct(sacks),
    scramble_rate: pct(scrambles),
    throwaway_rate: pct(throwaways),
    mean_ttt: mean(throwTicks).toFixed(3),
    throws: throwTicks.length,
  };
}

describe.skipIf(!enabled)("gap probe: arms", () => {
  it("replicates ADR-049 and extends to exit", () => {
    const arms: Record<string, Tunables> = {
      committed: DEFAULT_TUNABLES,
      committed_supply_off: supplyAt(999, DEFAULT_TUNABLES),
      arrival_only_supply_off: supplyAt(999, arrivalOnlyBase()),
      committed_supply_40: supplyAt(40, DEFAULT_TUNABLES),
    };
    for (const [name, t] of Object.entries(arms)) {
      console.log("ARM " + name + " " + JSON.stringify(measure(t, GAMES)));
    }
  }, 2400000);
});
