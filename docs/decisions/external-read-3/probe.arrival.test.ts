import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { generateSeeds } from "../src/harness/seeds.js";
import { runBatch } from "../src/harness/batch.js";
import { buildFlatLeague } from "../src/league/flat.js";

const TEAMS = Number(process.env["TEAMS"] ?? 12);
const g = globalThis as { __FF_PHYS_SACK?: boolean; __FF_SACK_PATHS?: Record<string, number> };

function patchArrival(overrides: Record<string, number>): typeof DEFAULT_TUNABLES {
  const t = structuredClone(DEFAULT_TUNABLES) as unknown as { arrival: Record<string, unknown> };
  Object.assign(t.arrival, overrides);
  return t as unknown as typeof DEFAULT_TUNABLES;
}

interface ArmSpec {
  readonly name: string;
  readonly phys: boolean;
  readonly overrides: Record<string, number> | undefined;
  readonly version: string | undefined;
}

const ARMS: readonly ArmSpec[] = [
  { name: "A1 committed / label-anchored", phys: false, overrides: undefined, version: undefined },
  { name: "A2 committed / PHYS-anchored ", phys: true, overrides: undefined, version: undefined },
  { name: "B1 I=0.5    / label-anchored", phys: false, overrides: { immediateWithinSeconds: 0.5 }, version: "PROBE_I05" },
  { name: "B2 I=0.5    / PHYS-anchored ", phys: true, overrides: { immediateWithinSeconds: 0.5 }, version: "PROBE_I05" },
  { name: "C1 I=-10    / label-anchored", phys: false, overrides: { immediateWithinSeconds: -10 }, version: "PROBE_IX" },
  { name: "C2 I=-10    / PHYS-anchored ", phys: true, overrides: { immediateWithinSeconds: -10 }, version: "PROBE_IX" },
  { name: "D1 all=-10  / label-anchored", phys: false, overrides: { immediateWithinSeconds: -10, collapsingWithinSeconds: -10, pressureWithinSeconds: -10 }, version: "PROBE_ALLX" },
  { name: "D2 all=-10  / PHYS-anchored ", phys: true, overrides: { immediateWithinSeconds: -10, collapsingWithinSeconds: -10, pressureWithinSeconds: -10 }, version: "PROBE_ALLX" },
];

describe("probe: sack-anchor decomposition", () => {
  it("runs eight arms", { timeout: 3_600_000 }, async () => {
    const league = buildFlatLeague({ teams: TEAMS });
    const schedule = { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 } as const;
    const games = (TEAMS * (TEAMS - 1)) / 2;
    const seeds = generateSeeds("baseline-0001", games);
    const plays: Record<string, unknown>[] = [];

    for (const arm of ARMS) {
      g.__FF_PHYS_SACK = arm.phys;
      g.__FF_SACK_PATHS = {};
      const batch = await runBatch({
        league,
        schedule,
        seeds,
        ...(arm.overrides === undefined
          ? {}
          : { tunables: patchArrival(arm.overrides), tunablesVersion: arm.version }),
        playCalling: { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN },
      });
      const p = batch.accumulator.play as unknown as Record<string, number> & {
        pocketStatusTicks?: Record<string, number>;
      };
      plays.push(p);
      const paths = { ...g.__FF_SACK_PATHS };
      const pct = (n: number, d: number) => ((100 * n) / d).toFixed(3) + "%";
      const sumPaths = Object.values(paths).reduce((a, b) => a + b, 0);
      console.log(`\n=== ${arm.name} ===`);
      console.log(
        `dropbacks=${p["dropbacks"]} sacks=${p["sacks"]} (${pct(p["sacks"] ?? 0, p["dropbacks"] ?? 1)})` +
          ` pathSum=${sumPaths} paths=${JSON.stringify(paths)}`,
      );
      console.log(
        `disrupted=${p["disruptedDropbacks"]} scrambles=${p["scrambles"]} ticks=${JSON.stringify(p.pocketStatusTicks)}`,
      );
    }

    // Intake invariants: flag-unset committed reproduces the pristine run; flag-set
    // committed is accumulator-identical to it (the predicates coincide at I=0.0).
    const a1 = plays[0];
    const a2 = plays[1];
    expect(a1?.["dropbacks"]).toBe(5840);
    expect(a1?.["sacks"]).toBe(987);
    expect(a1?.["disruptedDropbacks"]).toBe(4623);
    expect(JSON.stringify(a2)).toBe(JSON.stringify(a1));
  });
});
