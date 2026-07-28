/** The batch harness: seeds, schedules, determinism, and worker-count invariance. */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES, applyTunablePatch } from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { inProcessExecutor, runBatch, shardedExecutor } from "../src/harness/batch.js";
import { stableDigest } from "../src/harness/digest.js";
import { buildFixtures, ScheduleError } from "../src/harness/schedule.js";
import { assertSeedDigest, digestSeeds, generateSeeds, SeedMismatchError, seedListOf } from "../src/harness/seeds.js";
import { WorkerPoolUnavailableError } from "../src/harness/workerPool.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";
import type { PlayerWeekAvailability } from "../src/ingest/availability.js";
import type { ScheduleRow } from "../src/ingest/sources/schedules.js";

const league = buildFlatLeague({ teams: 4 });
const index = indexLeague(league);
const teams = index.teamIds();

describe("seeds", () => {
  it("generates a reproducible list from one batch seed", () => {
    const a = generateSeeds("batch-1", 20);
    const b = generateSeeds("batch-1", 20);
    expect(a.seeds).toEqual(b.seeds);
    expect(a.digest).toBe(b.digest);
    expect(generateSeeds("batch-2", 20).digest).not.toBe(a.digest);
  });

  it("produces distinct seeds — a batch that reuses one is not reproducible per game", () => {
    const list = generateSeeds("batch-3", 300);
    expect(new Set(list.seeds).size).toBe(300);
  });

  it("digests the list so a report can quote one line instead of three hundred", () => {
    const list = seedListOf(["a", "b", "c"]);
    expect(list.digest).toContain("#3");
    expect(digestSeeds(["a", "b", "c"])).toBe(list.digest);
    expect(() => assertSeedDigest(["a", "b"], list.digest)).toThrow(SeedMismatchError);
  });

  it("refuses an empty batch seed — it is quoted in the report", () => {
    expect(() => generateSeeds("  ", 4)).toThrow();
    expect(() => generateSeeds("x", 0)).toThrow(RangeError);
  });
});

describe("schedules", () => {
  it("builds a round-robin where every team plays every other once per round", () => {
    const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 });
    expect(fixtures).toHaveLength(6); // 4 teams choose 2
    const pairs = new Set(fixtures.map((f) => [String(f.home), String(f.away)].sort().join("|")));
    expect(pairs.size).toBe(6);
  });

  it("alternates home and away across rounds so home advantage does not accrue", () => {
    const fixtures = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 2, season: 2024 });
    const homeCounts = new Map<string, number>();
    for (const f of fixtures) homeCounts.set(String(f.home), (homeCounts.get(String(f.home)) ?? 0) + 1);
    const counts = [...homeCounts.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(2);
  });

  it("gives repeated pair fixtures distinct replay indices, so their dice differ", () => {
    const fixtures = buildFixtures(index, {
      kind: "SYNTHETIC_PAIR", home: teams[0]!, away: teams[1]!, games: 5, season: 2024,
    });
    expect(fixtures.map((f) => f.replay)).toEqual([0, 1, 2, 3, 4]);
  });

  it("runs a real replay at full strength when no availability is supplied, and says so", () => {
    const schedule: ScheduleRow[] = [
      {
        gameId: "2023_01_B_A", season: 2023, gameType: "REG", week: 1, gameday: null, weekday: null,
        gametime: null, awayTeam: "BBB", homeTeam: "AAA", awayScore: 17, homeScore: 24,
        location: null, result: 7, total: 41, overtime: false, awayRest: 7, homeRest: 7,
        awayMoneyline: null, homeMoneyline: null, spreadLine: 3, totalLine: 44, divGame: false,
        roof: null, surface: null, temp: null, wind: null, awayQbId: null, homeQbId: null,
        awayCoach: null, homeCoach: null, referee: null, stadiumId: null, oldGameId: null,
        pfrGameId: null,
      } as ScheduleRow,
    ];
    const fixtures = buildFixtures(index, {
      kind: "REAL_REPLAY", season: 2023, schedule,
      teamMap: { AAA: teams[0]!, BBB: teams[1]! },
    });
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0]?.homeRoster.source).toBe("FULL_STRENGTH");
  });

  it("refuses to silently skip a fixture whose team it cannot map", () => {
    const schedule = [{ season: 2023, gameType: "REG", week: 1, homeTeam: "ZZZ", awayTeam: "AAA", gameId: "x" }] as ScheduleRow[];
    expect(() =>
      buildFixtures(index, { kind: "REAL_REPLAY", season: 2023, schedule, teamMap: { AAA: teams[0]! } }),
    ).toThrow(ScheduleError);
  });

  it("refuses an availability-matched replay against a league with no real names to join on", () => {
    // §10.2 chose accuracy over convenience. A synthetic league matched to nobody would run
    // full-strength while claiming to be availability-matched, and nothing in the output shows it.
    const schedule = [
      { season: 2023, gameType: "REG", week: 1, homeTeam: "AAA", awayTeam: "BBB", gameId: "x" },
    ] as ScheduleRow[];
    const availability: PlayerWeekAvailability[] = [
      {
        season: 2023, week: 1, gameType: "REG", team: "AAA", gsisId: "00-1", pfrId: null,
        playerName: "Somebody Real", position: "QB", status: "ACT", statusDescriptionAbbr: null,
        availability: "AVAILABLE", unavailabilityReason: null, statusConfidence: "NONE",
        unmappedStatusCode: false, injury: null, snaps: null, activeForGame: true, played: true,
        snapJoin: "NONE", depthTeam: 1,
      },
    ];
    expect(() =>
      buildFixtures(index, {
        kind: "REAL_REPLAY", season: 2023, schedule, availability,
        teamMap: { AAA: teams[0]!, BBB: teams[1]! },
      }),
    ).toThrow(/not a thing that exists/);
  });
});

describe("runBatch", () => {
  const playCalling = { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN };
  const schedule = { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 } as const;

  it("runs a batch and records everything a report needs to reproduce it", async () => {
    const result = await runBatch({ league, schedule, seeds: { batchSeed: "b1" }, playCalling });
    expect(result.provenance.games).toBe(6);
    expect(result.provenance.leagueProvenance).toBe("FLAT_SYNTHETIC");
    expect(result.provenance.tunablesVersion).toBe("DEFAULT_TUNABLES");
    expect(result.provenance.callerVersion).toBe(FROZEN_TENDENCIES.version);
    expect(result.provenance.seedDigest).toBe(digestSeeds(result.seeds.seeds.slice(0, 6)));
    expect(result.provenance.availabilityMatched).toBe(false);
    expect(result.accumulator.games).toBe(6);
  }, 120_000);

  it("is reproducible from its seed list", async () => {
    const seeds = generateSeeds("repro", 6);
    const a = await runBatch({ league, schedule, seeds, playCalling });
    const b = await runBatch({ league, schedule, seeds, playCalling });
    expect(JSON.stringify(a.accumulator)).toBe(JSON.stringify(b.accumulator));
  }, 120_000);

  it("produces identical numbers on one shard and on five", async () => {
    // The property the worker pool depends on, tested without threads.
    const seeds = generateSeeds("shards", 6);
    const one = await runBatch({ league, schedule, seeds, playCalling, executor: inProcessExecutor() });
    const five = await runBatch({ league, schedule, seeds, playCalling, executor: shardedExecutor(5) });
    expect(JSON.stringify(five.accumulator)).toBe(JSON.stringify(one.accumulator));
    expect(five.provenance.workers).toBe(5);
    expect(five.provenance.executorName).toBe("sharded-5");
  }, 120_000);

  it("refuses to run on the unfitted placeholder caller", async () => {
    await expect(
      runBatch({
        league,
        schedule,
        seeds: { batchSeed: "x" },
        playCalling: {
          tendencies: { ...FROZEN_TENDENCIES, contentHash: "nope" },
          fourthDown: FROZEN_FOURTH_DOWN,
        },
      }),
    ).rejects.toThrow(/frozen caller that is not frozen/);
  });

  it("refuses patched tunables with no version name — §6's audit trail", async () => {
    const patched = applyTunablePatch(DEFAULT_TUNABLES, {
      tunableId: "passRush.blockerStructuralAdvantage",
      currentValue: DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage,
      proposedValue: 25,
      evidence: "test",
      expectedEffect: "fewer sacks",
    });
    await expect(
      runBatch({ league, schedule, seeds: { batchSeed: "x" }, playCalling, tunables: patched }),
    ).rejects.toThrow(/tuning amnesia/);
  });

  it("measures a stated tunables version, and the patch actually reaches the simulation", async () => {
    const seeds = generateSeeds("tunables", 6);
    const patched = applyTunablePatch(DEFAULT_TUNABLES, {
      tunableId: "passRush.blockerStructuralAdvantage",
      currentValue: DEFAULT_TUNABLES.passRush.blockerStructuralAdvantage,
      proposedValue: 40,
      evidence: "test",
      expectedEffect: "fewer sacks",
    });
    const base = await runBatch({ league, schedule, seeds, playCalling });
    const withPatch = await runBatch({
      league, schedule, seeds, playCalling,
      tunables: patched,
      tunablesVersion: "test-bsa-40",
    });
    expect(withPatch.provenance.tunablesVersion).toBe("test-bsa-40");
    // The MEASURED half of §6's audit trail. The version above is a label a caller asserts; the
    // digest is taken from the tunables the batch actually ran, so it cannot be misreported and
    // it catches the case a label cannot — `DEFAULT_TUNABLES` changing underneath two reports
    // that both call themselves `DEFAULT_TUNABLES`. Baseline identity compares both.
    expect(base.provenance.tunablesDigest).toBe(stableDigest(DEFAULT_TUNABLES));
    expect(withPatch.provenance.tunablesDigest).not.toBe(base.provenance.tunablesDigest);
    // A blocker advantage of 40 against the default 15 must move the sack rate. If it did not,
    // the tunables argument is not reaching the simulation and every sensitivity run is a lie.
    expect(withPatch.accumulator.play.sacks).not.toBe(base.accumulator.play.sacks);
    expect(withPatch.accumulator.play.sacks).toBeLessThan(base.accumulator.play.sacks);
  }, 240_000);

  it("refuses fewer seeds than fixtures", async () => {
    await expect(
      runBatch({ league, schedule, seeds: seedListOf(["only-one"]), playCalling }),
    ).rejects.toThrow(/one seed per game/);
  });
});

describe("the worker pool", () => {
  /**
   * The pool is written, compiles, and cannot run yet — `@ff/engine` and `@ff/playbook` declare
   * `main: src/index.ts`, so a compiled worker resolves them to TypeScript node cannot execute.
   * That is a packaging change in two packages this dispatch may not write to.
   *
   * Both halves are asserted, because both are ways the same mistake could be hidden: an
   * unbuilt package must say how to build, and a built package that still cannot load a
   * workspace dependency must say WHY rather than surfacing a bare module-resolution error.
   */
  it("says how to build, or why building was not enough — never falls back silently", async () => {
    const { existsSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const workerPath = resolve(import.meta.dirname, "..", "dist", "harness", "worker.js");
    const { workerPoolExecutor, WorkspaceNotBuiltError } = await import("../src/harness/workerPool.js");

    if (!existsSync(workerPath)) {
      expect(() =>
        workerPoolExecutor(2, { league, tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN }),
      ).toThrow(WorkerPoolUnavailableError);
      return;
    }

    const executor = workerPoolExecutor(2, {
      league,
      tendencies: FROZEN_TENDENCIES,
      fourthDown: FROZEN_FOURTH_DOWN,
    });
    expect(executor.workers).toBe(2);
    await expect(
      runBatch({
        league,
        schedule: { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 },
        seeds: generateSeeds("pool", 6),
        playCalling: { tendencies: FROZEN_TENDENCIES, fourthDown: FROZEN_FOURTH_DOWN },
        executor,
      }),
    ).rejects.toThrow(WorkspaceNotBuiltError);
  }, 120_000);
});
