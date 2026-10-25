/**
 * ADR-089 step 0 — TODAY'S FREE-RUNNER TIME, RESTATED, AGAINST THE STREAM (plan §6.1; C2-S11).
 *
 * `legacyFreeRun.ts` restates `freeRunnerArrivalSecondsFor` (and the looper's time) off the public
 * tunables. On the gen golden games every free runner's restated time must equal his published
 * `etaTick`, exactly: 5 games always, all 50 under `FF_POCKET_BASE=1`. This is a real check of the
 * restatement (it can fail), not an identity.
 */
import { DEFAULT_TUNABLES, applyTunablePatch } from "@ff/engine";
import { describe, expect, it } from "vitest";
import { positionsFromSnapshot } from "../src/knownTruth/pocketChannelShares.js";
import { goldenGames } from "../src/pocket/corpus.js";
import {
  legacyDepthFor,
  legacyFreeRunSeconds,
  legacyLooperSeconds,
  legacyPathSeconds,
  pickupDelaySeconds,
  restateFreeRunners,
  stuntDelaySeconds,
} from "../src/pocket/legacyFreeRun.js";
import { dropbacksOf } from "../src/pocket/throwClass.js";

const T = DEFAULT_TUNABLES;

describe("the legacy free-run time, closed form", () => {
  it("reads the depth class off the tunables' own lists", () => {
    expect(legacyDepthFor(T, "DT")).toBe("LINE");
    expect(legacyDepthFor(T, "NT")).toBe("LINE");
    expect(legacyDepthFor(T, "MLB")).toBe("BOX");
    expect(legacyDepthFor(T, "OLB")).toBe("BOX");
    expect(legacyDepthFor(T, "CB")).toBe("DEEP");
    expect(legacyDepthFor(T, "SS")).toBe("DEEP");
  });

  it("is 1.5 + the offset + the pickup delay, clamped and rounded", () => {
    expect(legacyPathSeconds(T, "INTERIOR", "MLB", 0)).toBe(1.5);
    expect(legacyPathSeconds(T, "INTERIOR", "DT", 0)).toBe(1.0);
    expect(legacyPathSeconds(T, "EDGE", "CB", 0)).toBe(2.5);
    expect(legacyPathSeconds(T, "EDGE", "OLB", pickupDelaySeconds(T, "RAN_THROUGH"))).toBe(2.5);
    expect(legacyFreeRunSeconds(T, { origin: "PICKUP_LOST", alignment: "INTERIOR", position: "MLB", band: "BLOWN_UP" })).toBe(1.5);
    expect(legacyFreeRunSeconds(T, { origin: "UNBLOCKED", alignment: "EDGE", position: "DE" })).toBe(1.5);
  });

  it("clamps to the tunables' bounds", () => {
    const patched = applyTunablePatch(T, {
      tunableId: "blitzPickup.freeRunnerArrivalSeconds",
      currentValue: 1.5,
      proposedValue: 50,
      evidence: "ADR-089 step 0 test: the clamp",
      expectedEffect: "every path time clamps to the maximum",
    });
    expect(legacyPathSeconds(patched, "INTERIOR", "MLB", 0)).toBe(T.blitzPickup.freeRunnerPath.maxArrivalSeconds);
  });

  it("restates the looper's time as the stunt base plus the band's delay, unclamped", () => {
    expect(legacyLooperSeconds(T, "LOOPER_FREE")).toBe(2.0);
    expect(legacyLooperSeconds(T, "LATE_EXCHANGE")).toBe(2.5);
    expect(stuntDelaySeconds(T, "LATE_EXCHANGE")).toBe(0.5);
    expect(() => stuntDelaySeconds(T, "NOT_A_BAND")).toThrow(/not a stunt_communication band/);
  });

  it("refuses a won rep", () => {
    expect(() => legacyFreeRunSeconds(T, { origin: "WON_REP", alignment: "EDGE", position: "DE" })).toThrow(/not a free runner/);
  });
});

function checkGames(first: number): { runners: number; byOrigin: Record<string, number>; swapped: number; mismatches: string[] } {
  const byOrigin: Record<string, number> = {};
  const mismatches: string[] = [];
  let runners = 0;
  let swapped = 0;
  goldenGames(
    "gen",
    (observation, snapshot, meta) => {
      const positions = positionsFromSnapshot(snapshot);
      for (const d of dropbacksOf(observation.events)) {
        for (const r of restateFreeRunners(d, positions, T)) {
          runners += 1;
          byOrigin[r.origin] = (byOrigin[r.origin] ?? 0) + 1;
          if (r.timedFor !== r.rusher) swapped += 1;
          if (r.restated !== r.published) mismatches.push(`game ${String(meta.index)} ${d.playId} ${r.rusher} ${r.origin} ${String(r.band)}: restated ${String(r.restated)}, published ${String(r.published)}`);
        }
      }
    },
    { first },
  );
  return { runners, byOrigin, swapped, mismatches };
}

describe("the restatement against the stream (gen golden games)", () => {
  it("equals every free runner's published etaTick on 5 games", () => {
    const r = checkGames(5);
    console.log(`##POCKET_LEGACY_FREE_RUN## ${JSON.stringify({ games: 5, ...r, mismatches: r.mismatches.length })}`);
    expect(r.runners).toBeGreaterThan(100);
    expect(Object.keys(r.byOrigin).sort()).toEqual(["PICKUP_LOST", "STUNT_LOOPER", "UNBLOCKED"]);
    expect(r.mismatches).toEqual([]);
  }, 120_000);

  it.skipIf(process.env["FF_POCKET_BASE"] !== "1")("equals every free runner's published etaTick on all 50 (FF_POCKET_BASE=1)", () => {
    const r = checkGames(50);
    console.log(`##POCKET_LEGACY_FREE_RUN## ${JSON.stringify({ games: 50, ...r, mismatches: r.mismatches.length })}`);
    expect(r.mismatches).toEqual([]);
  }, 600_000);
});
