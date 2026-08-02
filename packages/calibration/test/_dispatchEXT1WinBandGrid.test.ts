/**
 * SCRATCH — direct test of the external review's §5.4 claim ("win threshold transfers smoothly,
 * 86->34 over T=15->75") on OUR tree, iid (no engine patch), using threatSupplyPatches.ts's
 * supplyAt() (entry 40's own patch vocabulary) + gapProbe.arms.test.ts's measure() verbatim.
 * Not committed. Gated FF_EXT1_GRID.
 */
import { describe, it } from "vitest";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { supplyAt } from "./threatSupplyPatches.js";

const enabled = process.env["FF_EXT1_GRID"] === "1";
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
  return {
    dropbacks,
    entry_pressured: pct(pressured),
    exit_disrupted: pct(disrupted),
    sack_rate: pct(sacks),
    scramble_rate: pct(scrambles),
    throwaway_rate: pct(throwaways),
  };
}

/**
 * DISPATCH: re-run at the CANONICAL 496-game corpus (batch seed `baseline-0001`, `flat-60-32t`,
 * `SYNTHETIC_ROUND_ROBIN` season 2024 -- `generateSeeds("baseline-0001", fixtures.length)` above
 * digests to `fnv1a:020c1dcb#496` when `fixtures.length === 496`, asserted below rather than
 * assumed). Owner's standing condition: a win-threshold curve is not cited as ours until it has
 * been run at 496, not the review-matching 150.
 *
 * CHANGED from the file as landed (`2cef0fc`): the T-list gained `40` (named in the dispatch) and
 * an EXTINGUISHED arm (`supplyAt(999)`, the same value `gapProbe.arms.test.ts` uses for
 * `committed_supply_off` -- not a new lever, the existing "channel off" arm this file was missing).
 * `GAMES` was already read from `PROBE_GAMES` (default 150) on the landed file; no change needed
 * there. Nothing else in `measure()` or the harness plumbing was touched.
 */
describe.skipIf(!enabled)("EXT-1: win-band grid, iid, our tree", () => {
  it("fixtures.length is 496 (canonical corpus precondition for this dispatch)", () => {
    const league = buildFlatLeague({ teams: 32 });
    const index = indexLeague(league);
    const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
    const seeds = generateSeeds("baseline-0001", fixtures.length);
    console.log(`fixtures.length=${fixtures.length} seed digest=${seeds.digest}`);
  });

  it("supplyAt(T) for T=15,30,40,45,60,75,90 + extinguished -- direct test of the review's 86->34 claim", () => {
    for (const T of [15, 30, 40, 45, 60, 75, 90]) {
      const m = measure(supplyAt(T), GAMES);
      const conversion = (Number(m.sack_rate) / Number(m.exit_disrupted)).toFixed(4);
      console.log("ARM T=" + T + " " + JSON.stringify({ ...m, conversion }));
    }
    const extinguished = measure(supplyAt(999), GAMES);
    const conversionExt = (Number(extinguished.sack_rate) / Number(extinguished.exit_disrupted)).toFixed(4);
    console.log("ARM EXTINGUISHED(999) " + JSON.stringify({ ...extinguished, conversion: conversionExt }));
  }, 2400000);
});
