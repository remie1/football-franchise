/**
 * THE BATCH HARNESS — `calibration.md` §3.
 *
 * ```
 * runBatch(config: {
 *   league: RatedLeague;            // from @ff/attributes
 *   schedule: ScheduleSpec;         // real season replays or synthetic round-robins
 *   seeds: string[];                // one per game/season run — recorded in every report
 *   playCalling: PlayCallerProfile; // baseline AI caller (see §3.1)
 *   collectors: MetricCollector[];  // which stats to aggregate from event streams
 *   workers?: number;
 * }): Promise<BatchResult>
 * ```
 *
 * Implemented as specified, with three deliberate divergences, each stated:
 *
 *  1. **`league` is a `ProvenancedLeague`, not a bare `RatedLeague`.** ADR-020. `@ff/attributes`
 *     does not exist and nothing produces a real one, so the harness has to be handed a league
 *     it built itself — and a report that cannot say WHERE its ratings came from is the exact
 *     failure `CALIBRATION-BACKLOG.md` 3a describes at one level up. The provenance rides with
 *     the league, into the report header, and into every Tier 3/4 metric's applicability check.
 *  2. **`collectors` is not a parameter.** The fold in `metrics/collect.ts` is fixed for v0 and
 *     every metric reads from it. A per-batch collector list would let two reports be computed
 *     over different reductions of the same stream, which is the drift ADR-014 item 15 put the
 *     statline reducer on the barrel to prevent.
 *  3. **`workers` selects an EXECUTOR, and the default is in-process.** Worker threads need
 *     compiled output; the in-process path is always available and produces identical numbers.
 *     `mergeAccumulators` is associative and commutative and its sample vectors are sorted, so
 *     worker count cannot move a result — `test/harness.test.ts` asserts exactly that.
 */
import type { Tunables } from "@ff/engine";
import { DEFAULT_TUNABLES } from "@ff/engine";
import type { FittedFourthDown } from "../caller/fourthDown.js";
import type { FrozenCallerDiagnostics } from "../caller/frozen.js";
import { assertTendencyIntegrity, type FittedTendencies } from "../caller/tendencies.js";
import type { LeagueProvenance } from "../league/provenance.js";
import type { AnyProvenancedLeague } from "../league/provenance.js";
import { indexLeague } from "../league/snapshot.js";
import {
  emptyAccumulator,
  foldGame,
  mergeAccumulators,
  type SimAccumulator,
} from "../metrics/collect.js";
import { runOneGame } from "./runGame.js";
import { buildFixture, buildFixtures, type GameFixture, type ScheduleSpec } from "./schedule.js";
import { digestSeeds, generateSeeds, type SeedList } from "./seeds.js";

export interface BatchConfig {
  readonly league: AnyProvenancedLeague;
  readonly schedule: ScheduleSpec;
  /** Either an explicit list or a batch seed plus a count. Recorded either way. */
  readonly seeds: SeedList | { readonly batchSeed: string };
  readonly playCalling: { readonly tendencies: FittedTendencies; readonly fourthDown: FittedFourthDown };
  /**
   * The tunables version this batch measured. §6: *"every baseline report states which
   * tunables-version it measured — the audit trail that prevents tuning amnesia."* Defaulted to
   * `DEFAULT_TUNABLES` and the default is RECORDED as such rather than left implicit.
   */
  readonly tunables?: Tunables;
  /** A label for the tunables version, e.g. "DEFAULT_TUNABLES" or "ADR-021-patch-1". */
  readonly tunablesVersion?: string;
  readonly workers?: number;
  readonly executor?: BatchExecutor;
}

export interface BatchProvenance {
  readonly leagueId: string;
  readonly leagueProvenance: LeagueProvenance;
  readonly leagueDescription: string;
  readonly tunablesVersion: string;
  readonly callerVersion: string;
  readonly callerFourthDownVersion: string;
  readonly scheduleKind: ScheduleSpec["kind"];
  readonly season: number;
  readonly games: number;
  readonly seedDigest: string;
  readonly batchSeed: string;
  readonly workers: number;
  readonly executorName: string;
  /** Whether the replay imposed real weekly availability, and for how many team-weeks. */
  readonly availabilityMatched: boolean;
  readonly teamWeeksWithAbsences: number;
}

export interface BatchResult {
  readonly accumulator: SimAccumulator;
  readonly provenance: BatchProvenance;
  readonly seeds: SeedList;
  readonly caller: FrozenCallerDiagnostics;
  readonly wallClockMs: number;
}

/** One unit of work. Serialisable: a worker receives exactly this. */
export interface BatchJob {
  readonly index: number;
  readonly seed: string;
  readonly fixture: GameFixture;
}

/**
 * How jobs are executed. Two implementations ship: in-process (always available) and worker
 * threads (needs `pnpm --filter @ff/calibration build`). Both must produce identical
 * accumulators for identical inputs; `test/harness.test.ts` asserts it.
 */
export interface BatchExecutor {
  readonly name: string;
  readonly workers: number;
  run(
    jobs: readonly BatchJob[],
    runJob: (job: BatchJob) => { accumulator: SimAccumulator; caller: FrozenCallerDiagnostics },
  ): Promise<{ accumulator: SimAccumulator; caller: FrozenCallerDiagnostics }>;
}

function mergeCallerDiagnostics(
  a: FrozenCallerDiagnostics,
  b: FrozenCallerDiagnostics,
): FrozenCallerDiagnostics {
  const backoff: Record<string, number> = { ...a.backoff };
  for (const [k, v] of Object.entries(b.backoff)) backoff[k] = (backoff[k] ?? 0) + v;
  return {
    offensiveCalls: a.offensiveCalls + b.offensiveCalls,
    defensiveCalls: a.defensiveCalls + b.defensiveCalls,
    passCalls: a.passCalls + b.passCalls,
    runCalls: a.runCalls + b.runCalls,
    conceptRedraws: a.conceptRedraws + b.conceptRedraws,
    fourthDownGo: a.fourthDownGo + b.fourthDownGo,
    fourthDownPunt: a.fourthDownPunt + b.fourthDownPunt,
    fourthDownFieldGoal: a.fourthDownFieldGoal + b.fourthDownFieldGoal,
    backoff,
  };
}

function blankCaller(): FrozenCallerDiagnostics {
  return {
    offensiveCalls: 0,
    defensiveCalls: 0,
    passCalls: 0,
    runCalls: 0,
    conceptRedraws: 0,
    fourthDownGo: 0,
    fourthDownPunt: 0,
    fourthDownFieldGoal: 0,
    backoff: {},
  };
}

/** The always-available executor. Sequential; identical output to any parallel one. */
export function inProcessExecutor(): BatchExecutor {
  return {
    name: "in-process",
    workers: 1,
    async run(jobs, runJob) {
      let accumulator = emptyAccumulator();
      let caller = blankCaller();
      for (const job of jobs) {
        const result = runJob(job);
        accumulator = mergeAccumulators(accumulator, result.accumulator);
        caller = mergeCallerDiagnostics(caller, result.caller);
      }
      return { accumulator, caller };
    },
  };
}

/**
 * A shard-and-merge executor that runs `workers` independent partitions and merges them. It
 * still executes in one thread — it exists to PROVE the merge is order-independent, which is the
 * property a real worker pool depends on. `harness/workerPool.ts` is the thread-backed one.
 */
export function shardedExecutor(workers: number): BatchExecutor {
  if (workers < 1) throw new RangeError("workers must be at least 1");
  return {
    name: `sharded-${workers}`,
    workers,
    async run(jobs, runJob) {
      const shards: SimAccumulator[] = [];
      const callers: FrozenCallerDiagnostics[] = [];
      for (let w = 0; w < workers; w++) {
        let accumulator = emptyAccumulator();
        let caller = blankCaller();
        for (const job of jobs) {
          if (job.index % workers !== w) continue;
          const result = runJob(job);
          accumulator = mergeAccumulators(accumulator, result.accumulator);
          caller = mergeCallerDiagnostics(caller, result.caller);
        }
        shards.push(accumulator);
        callers.push(caller);
      }
      let accumulator = emptyAccumulator();
      for (const shard of shards) accumulator = mergeAccumulators(accumulator, shard);
      let caller = blankCaller();
      for (const c of callers) caller = mergeCallerDiagnostics(caller, c);
      return { accumulator, caller };
    },
  };
}

export async function runBatch(config: BatchConfig): Promise<BatchResult> {
  assertTendencyIntegrity(config.playCalling.tendencies);

  const index = indexLeague(config.league);
  const fixtures = buildFixtures(index, config.schedule);
  const seeds =
    "seeds" in config.seeds
      ? config.seeds
      : generateSeeds(config.seeds.batchSeed, fixtures.length);
  if (seeds.seeds.length < fixtures.length) {
    throw new RangeError(
      `${fixtures.length} fixtures but only ${seeds.seeds.length} seeds. ` +
        `calibration.md §3: one seed per game, recorded in every report — a batch that reuses ` +
        `a seed across two games is not reproducible per game.`,
    );
  }

  const jobs: BatchJob[] = fixtures.map((fixture, i) => ({
    index: i,
    seed: seeds.seeds[i] ?? "",
    fixture,
  }));

  const executor = config.executor ?? inProcessExecutor();
  const tunables = config.tunables ?? DEFAULT_TUNABLES;
  const tunablesVersion =
    config.tunablesVersion ?? (config.tunables === undefined ? "DEFAULT_TUNABLES" : "UNNAMED_PATCH");
  if (config.tunables !== undefined && config.tunablesVersion === undefined) {
    throw new Error(
      "runBatch was given patched tunables and no tunablesVersion. calibration.md §6: every " +
        "report states which tunables-version it measured. An unnamed patch is tuning amnesia " +
        "with extra steps.",
    );
  }

  const started = Date.now();
  const { accumulator, caller } = await executor.run(jobs, (job) => {
    const built = buildFixture(index, job.fixture);
    const output = runOneGame({
      built,
      seed: job.seed,
      tendencies: config.playCalling.tendencies,
      fourthDown: config.playCalling.fourthDown,
      tunables,
    });
    return {
      accumulator: foldGame(emptyAccumulator(), output.observation),
      caller: output.caller,
    };
  });
  const wallClockMs = Date.now() - started;

  const availabilityMatched = fixtures.some(
    (f) => f.homeRoster.source === "REAL_AVAILABILITY" || f.awayRoster.source === "REAL_AVAILABILITY",
  );
  const teamWeeksWithAbsences = fixtures.reduce(
    (n, f) => n + (f.homeRoster.unavailableCount > 0 ? 1 : 0) + (f.awayRoster.unavailableCount > 0 ? 1 : 0),
    0,
  );

  return {
    accumulator,
    seeds: { ...seeds, digest: digestSeeds(seeds.seeds.slice(0, fixtures.length)) },
    caller,
    wallClockMs,
    provenance: {
      leagueId: config.league.id,
      leagueProvenance: config.league.provenance,
      leagueDescription: config.league.description,
      tunablesVersion,
      callerVersion: config.playCalling.tendencies.version,
      callerFourthDownVersion: config.playCalling.fourthDown.version,
      scheduleKind: config.schedule.kind,
      season: config.schedule.season,
      games: fixtures.length,
      seedDigest: digestSeeds(seeds.seeds.slice(0, fixtures.length)),
      batchSeed: seeds.batchSeed,
      workers: executor.workers,
      executorName: executor.name,
      availabilityMatched,
      teamWeeksWithAbsences,
    },
  };
}
