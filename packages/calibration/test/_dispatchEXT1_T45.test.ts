import { describe, it } from "vitest";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import { supplyAt } from "./threatSupplyPatches.js";
const enabled = process.env["FF_EXT1_T45"] === "1";
const GAMES = Number(process.env.PROBE_GAMES ?? "150");
const FORCING = new Set(DEFAULT_TUNABLES.pocket.forcesDecision as readonly string[]);
function measure(tunables: Tunables, games: number) {
  const league = buildFlatLeague({ teams: 32 });
  const index = indexLeague(league);
  const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
  const seeds = generateSeeds("baseline-0001", fixtures.length);
  let dropbacks = 0, pressured = 0, disrupted = 0, sacks = 0, scrambles = 0, throwaways = 0;
  for (let i = 0; i < Math.min(games, fixtures.length); i++) {
    const built = buildFixture(index, fixtures[i]!);
    const { observation } = runOneGame({ built, seed: seeds.seeds[i]!, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN, tunables });
    let isPass = false, worstNonClean = false, forced = false, arrived = false, scrambled = false, threw = false, threwAway = false;
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
    };
    for (const env of observation.events) {
      const e = env.event as { type: string; playId?: unknown; payload?: any };
      const pid = e.playId === undefined ? null : String(e.playId);
      if (pid !== null && pid !== curPlayId) {
        flush();
        curPlayId = pid;
        isPass = false; worstNonClean = false; forced = false; arrived = false; scrambled = false; threw = false; threwAway = false;
      }
      switch (e.type) {
        case "PLAY_START": isPass = e.payload?.kind === "PASS_PLAY_V1"; break;
        case "POCKET_STATUS": { const s = String(e.payload?.status ?? ""); if (s !== "CLEAN") worstNonClean = true; if (FORCING.has(s)) forced = true; break; }
        case "RUSH_THREAT": if (String(e.payload?.state) === "ARRIVED") arrived = true; break;
        case "QB_DECISION": if (String(e.payload?.choice) === "SCRAMBLE") scrambled = true; break;
        case "THROW": threw = true; break;
        case "THROWAWAY": threwAway = true; break;
      }
    }
    flush();
  }
  const pct = (x: number) => ((100 * x) / dropbacks).toFixed(2);
  return { dropbacks, entry_pressured: pct(pressured), exit_disrupted: pct(disrupted), sack_rate: pct(sacks) };
}
describe.skipIf(!enabled)("EXT-1: T=45 exact backlog re-test point", () => {
  it("supplyAt(45)", () => {
    console.log("ARM T=45 " + JSON.stringify(measure(supplyAt(45), GAMES)));
  }, 2400000);
});
