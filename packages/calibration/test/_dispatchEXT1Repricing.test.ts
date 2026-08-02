/**
 * ============================================================================
 * DISPATCH EXT-1 — RE-PRICING THE LEDGER AGAINST qb_disruption_rate (exit)
 * ============================================================================
 *
 * ⛔ SCRATCH MEASUREMENT INSTRUMENT, WRITTEN FOR THIS DISPATCH ONLY. NOT A REGISTERED METRIC.
 * IT GRADES NOTHING (zero `expect()` calls). NOT COMMITTED — left for owner review per standing
 * instruction.
 *
 * `measure()` below is copied VERBATIM from `test/gapProbe.arms.test.ts` (the already-landed,
 * already-reproduced external probe) so that every lever in this file is priced by the SAME
 * entry/exit/sack/scramble/throwaway/ttt instrument entry 40's supply lever was priced by in that
 * file — not by a second, differently-shaped one. Only the ARMS (which tunable is patched, and to
 * what) are new.
 *
 * ⚠ NAMED PER ITEM C: none of the five original per-lever sweep harnesses
 * (`pressureSweep.test.ts`, `freeRunnerSweep.test.ts`, `pocketBandSweep.test.ts`,
 * `pressureHorizonSweep.test.ts`, `collapsingHorizonSweep.test.ts`) compute `qb_disruption_rate` or
 * any exit-shaped quantity — checked by grep, zero hits for `qb_disruption`/`forcesDecision`/
 * `disruption` in four of the five, one hit in the fifth that is unrelated prose. `qb_disruption_rate`
 * postdates all five files. So EVERY lever below except entry 40's supply (which already has an
 * exit-computing original instrument, `gapProbe.arms.test.ts`) is re-priced by a NEWLY WRITTEN
 * harness, not its original one. That is a DIFFERENT measurement from the original refusal, per
 * Item C's own instruction to say so.
 *
 * Gated behind FF_EXT1, matching the FF_GAP_ARMS / FF_FR_SWEEP / FF_PB_SWEEP / FF_TS_SWEEP /
 * FF_PH_SWEEP / FF_CHS convention. Does not run under `pnpm verify` by default.
 *
 *   FF_EXT1=1 PROBE_GAMES=150 npx vitest run test/_dispatchEXT1Repricing.test.ts
 *
 * NO ENGINE CODE, TUNABLE, CONTRACT, METRIC, BAND, OR VERDICT IS CHANGED BY THIS FILE. Every arm is
 * an in-memory `applyTunablePatch` tree (ADR-027); `packages/engine/src/tunables.ts` is untouched.
 * ============================================================================
 */
import { describe, it } from "vitest";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import { buildFixture, buildFixtures } from "../src/harness/schedule.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runOneGame } from "../src/harness/runGame.js";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { DEFAULT_TUNABLES, applyTunablePatch, type Tunables } from "@ff/engine";

const enabled = process.env["FF_EXT1"] === "1";
const GAMES = Number(process.env.PROBE_GAMES ?? "150");
const FORCING = new Set(DEFAULT_TUNABLES.pocket.forcesDecision as readonly string[]);

// ---------------------------------------------------------------------------
// measure() — copied verbatim from test/gapProbe.arms.test.ts (see header)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// PATCHES — dynamic currentValue throughout, so no arm can go stale silently
// ---------------------------------------------------------------------------
function patch(
  base: Tunables,
  tunableId: string,
  currentValue: string | number | boolean,
  proposedValue: string | number | boolean,
): Tunables {
  if (currentValue === proposedValue) return base;
  return applyTunablePatch(base, {
    tunableId,
    currentValue,
    proposedValue,
    evidence: "dispatch EXT-1 re-pricing — measurement only, in-memory (ADR-027)",
    expectedEffect: "re-price a historically-refused lever against qb_disruption_rate",
  });
}

const FRAS_COMMITTED = DEFAULT_TUNABLES.blitzPickup.freeRunnerArrivalSeconds;
function freeRunnerAt(seconds: number): Tunables {
  return patch(DEFAULT_TUNABLES, "blitzPickup.freeRunnerArrivalSeconds", FRAS_COMMITTED, seconds);
}

const GAINING_COMMITTED = DEFAULT_TUNABLES.pocket.minimumStatusByBand.RUSHER_GAINING;
function gainingAt(status: string): Tunables {
  return patch(DEFAULT_TUNABLES, "pocket.minimumStatusByBand.RUSHER_GAINING", GAINING_COMMITTED, status);
}

const PWS_COMMITTED = DEFAULT_TUNABLES.arrival.pressureWithinSeconds;
function pressureHorizonAt(seconds: number): Tunables {
  return patch(DEFAULT_TUNABLES, "arrival.pressureWithinSeconds", PWS_COMMITTED, seconds);
}

const CWS_COMMITTED = DEFAULT_TUNABLES.arrival.collapsingWithinSeconds;
function collapsingHorizonAt(seconds: number): Tunables {
  return patch(DEFAULT_TUNABLES, "arrival.collapsingWithinSeconds", CWS_COMMITTED, seconds);
}

const BSA_COMMITTED = DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage;
function bsaAt(value: number): Tunables {
  return patch(DEFAULT_TUNABLES, "passRush.blockerStructuralAdvantage", BSA_COMMITTED, value);
}

describe.skipIf(!enabled)("dispatch EXT-1: re-price the refused-lever ledger against exit", () => {
  it("freeRunnerArrivalSeconds (ADR-030, refused unchanged at 1.5)", () => {
    console.log(`COMMITTED blitzPickup.freeRunnerArrivalSeconds = ${FRAS_COMMITTED}`);
    const arms: Record<string, Tunables> = {
      committed: DEFAULT_TUNABLES,
      "fras_0.5": freeRunnerAt(0.5),
      "fras_4.0_clamp_ceiling": freeRunnerAt(4.0),
    };
    for (const [name, t] of Object.entries(arms)) {
      console.log("ARM freeRunner:" + name + " " + JSON.stringify(measure(t, GAMES)));
    }
  }, 2400000);

  it("RUSHER_GAINING band map (ADR-032 4.70pp precursor -> ADR-033 changed PRESSURE to CLEAN)", () => {
    console.log(`COMMITTED pocket.minimumStatusByBand.RUSHER_GAINING = ${GAINING_COMMITTED}`);
    const arms: Record<string, Tunables> = {
      committed_CLEAN: DEFAULT_TUNABLES,
      reverted_to_PRESSURE: gainingAt("PRESSURE"),
    };
    for (const [name, t] of Object.entries(arms)) {
      console.log("ARM gaining:" + name + " " + JSON.stringify(measure(t, GAMES)));
    }
  }, 2400000);

  it("arrival.pressureWithinSeconds (entry 76, refused as lever at committed 2.0; POS_INF was pre-ruling default)", () => {
    console.log(`COMMITTED arrival.pressureWithinSeconds = ${PWS_COMMITTED}`);
    const arms: Record<string, Tunables> = {
      committed_2_0: DEFAULT_TUNABLES,
      reverted_POS_INF: pressureHorizonAt(Number.POSITIVE_INFINITY),
      tighter_1_0: pressureHorizonAt(1.0),
    };
    for (const [name, t] of Object.entries(arms)) {
      console.log("ARM pressureHorizon:" + name + " " + JSON.stringify(measure(t, GAMES)));
    }
  }, 2400000);

  it("arrival.collapsingWithinSeconds (entry 81, refused unchanged at 1.0, structurally incapable per pure-transfer proof)", () => {
    console.log(`COMMITTED arrival.collapsingWithinSeconds = ${CWS_COMMITTED}`);
    const arms: Record<string, Tunables> = {
      committed_1_0: DEFAULT_TUNABLES,
      floor_0_0: collapsingHorizonAt(0.0),
      ceiling_2_0: collapsingHorizonAt(2.0),
    };
    for (const [name, t] of Object.entries(arms)) {
      console.log("ARM collapsingHorizon:" + name + " " + JSON.stringify(measure(t, GAMES)));
    }
  }, 2400000);

  it("passRush.blockerStructuralAdvantage (ADR-028 changed 15->0; NOT a re-price of a still-standing refusal, a new question)", () => {
    console.log(`COMMITTED passRush.blockerStructuralAdvantage = ${BSA_COMMITTED}`);
    const arms: Record<string, Tunables> = {
      committed_0: DEFAULT_TUNABLES,
      reverted_pre_ADR028_15: bsaAt(15),
    };
    for (const [name, t] of Object.entries(arms)) {
      console.log("ARM bsa:" + name + " " + JSON.stringify(measure(t, GAMES)));
    }
  }, 2400000);
});
