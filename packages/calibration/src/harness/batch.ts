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
import {
  DEFAULT_CALLER_VERSION,
  blankDrawQuality,
  mergeDrawQuality,
  type CallerVersion,
} from "../caller/anticipate.js";
import type { FittedFourthDown } from "../caller/fourthDown.js";
import { callerIdentity, type FrozenCallerDiagnostics } from "../caller/frozen.js";
import { assertTendencyIntegrity, type FittedTendencies } from "../caller/tendencies.js";
import type { LeagueProvenance } from "../league/provenance.js";
import type { AnyProvenancedLeague } from "../league/provenance.js";
import { indexLeague } from "../league/snapshot.js";
import { checkStamp, engineRulesNamed, LEGACY_RULES, rulesStampUnlessLegacy, rulesTunables } from "../pocket/rules.js";
import {
  emptyAccumulator,
  foldGame,
  mergeAccumulators,
  type SimAccumulator,
} from "../metrics/collect.js";
import { stableDigest } from "./digest.js";
import { runOneGame } from "./runGame.js";
import { buildFixture, buildFixtures, type GameFixture, type ScheduleSpec } from "./schedule.js";
import { digestSeeds, generateSeeds, type SeedList } from "./seeds.js";

export interface BatchConfig {
  readonly league: AnyProvenancedLeague;
  readonly schedule: ScheduleSpec;
  /** Either an explicit list or a batch seed plus a count. Recorded either way. */
  readonly seeds: SeedList | { readonly batchSeed: string };
  readonly playCalling: {
    readonly tendencies: FittedTendencies;
    readonly fourthDown: FittedFourthDown;
    /**
     * ADR-024. Defaults to `DEFAULT_CALLER_VERSION` (v7); `v1` is the informed caller every batch
     * before ADR-024 ran, and each later version is listed at `CallerVersion`. Recorded into
     * `callerVersion`, which is part of `BaselineIdentity`, so reports from two versions are
     * refused as trend partners rather than compared. A batch carries no knobs (v5's and v6's
     * `slideCheck`, `keepIn`, `creeper`, `drawPressures`, `drawLines`, and v7's `frontLooks`): those
     * are for measurement arms, which run games one by one, so a batch's caller is always its
     * version as it ships.
     */
    readonly callerVersion?: CallerVersion;
  };
  /**
   * The tunables version this batch measured. §6: *"every baseline report states which
   * tunables-version it measured — the audit trail that prevents tuning amnesia."* Defaulted to
   * the named rules' tunables (`rulesTunables(engineRules)`: `DEFAULT_TUNABLES` itself under
   * `legacy`) and the default is RECORDED as such rather than left implicit. A legacy caller leaves
   * this undefined; a caller that passes it must pass tunables whose rules stamp agrees with
   * `engineRules` (ADR-089 step 1, `checkStamp`).
   */
  readonly tunables?: Tunables;
  /** A label for the tunables version, e.g. "DEFAULT_TUNABLES" or "ADR-021-patch-1". */
  readonly tunablesVersion?: string;
  /**
   * ADR-089 §9: the engine rules bundle to play, by name; absent is `legacy`. A name this build does
   * not have is refused before a game is played. With no `tunables`, the batch plays the name's own
   * bundle (`rulesTunables`); with `tunables`, they must carry that name's stamp, at a digest they
   * still have (`checkStamp`). Recorded into the provenance only when it is not `legacy`, with the
   * overlay digest of the stamp the games were played under.
   */
  readonly engineRules?: string;
  readonly workers?: number;
  readonly executor?: BatchExecutor;
}

export interface BatchProvenance {
  readonly leagueId: string;
  readonly leagueProvenance: LeagueProvenance;
  readonly leagueDescription: string;
  readonly tunablesVersion: string;
  /**
   * A digest of the tunables the batch ACTUALLY RAN, not of the label above it.
   *
   * §6's audit trail rests on a version string a caller asserts, and `runBatch` refuses an
   * unnamed patch. Neither catches the opposite failure: two reports both labelled
   * `DEFAULT_TUNABLES` while `DEFAULT_TUNABLES` itself changed underneath them. A label cannot
   * detect a change to the thing it labels, so the values are measured as well as named. This is
   * the one field of a baseline's identity that no caller can misreport.
   */
  readonly tunablesDigest: string;
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
  /**
   * ADR-089 §9 (plan O11): the engine rules bundle the batch played, and its overlay digest. Written
   * only when the rules are not `legacy`, so a legacy batch's provenance is today's, key for key;
   * absent means `legacy`. `BaselineIdentity` lifts both.
   */
  readonly engineRules?: string;
  readonly engineRulesDigest?: string;
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

/**
 * EXPORTED, and it was not before — `workerPool.ts` carried a private second copy of this
 * function and of `blankCaller`, so `FrozenCallerDiagnostics` gaining ADR-024's `draw` fold made
 * two of the three merge sites correct and one silently short. Two merges over one type is the
 * drift ADR-014 item 15 put `reduceStatlines` on the engine's barrel to prevent, one level down.
 */
export function mergeCallerDiagnostics(
  a: FrozenCallerDiagnostics,
  b: FrozenCallerDiagnostics,
): FrozenCallerDiagnostics {
  const backoff: Record<string, number> = { ...a.backoff };
  for (const [k, v] of Object.entries(b.backoff)) backoff[k] = (backoff[k] ?? 0) + v;
  // ADR-073 step 3.5: the front looks drawn, summed with a sorted key order, as `mergeDrawQuality`'s
  // counters are, so the order the worker pool's results arrive in cannot change the OUTPUT.
  const drawn: Record<string, number> = {};
  const looks = [...new Set([...Object.keys(a.frontLooks.drawn), ...Object.keys(b.frontLooks.drawn)])];
  for (const k of looks.sort((x, y) => x.localeCompare(y))) {
    drawn[k] = (a.frontLooks.drawn[k] ?? 0) + (b.frontLooks.drawn[k] ?? 0);
  }
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
    draw: mergeDrawQuality(a.draw, b.draw),
    frontLooks: { drawn, formationDropped: a.frontLooks.formationDropped + b.frontLooks.formationDropped },
  };
}

export function blankCallerDiagnostics(): FrozenCallerDiagnostics {
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
    draw: blankDrawQuality(),
    frontLooks: { drawn: {}, formationDropped: 0 },
  };
}

/** The always-available executor. Sequential; identical output to any parallel one. */
export function inProcessExecutor(): BatchExecutor {
  return {
    name: "in-process",
    workers: 1,
    async run(jobs, runJob) {
      let accumulator = emptyAccumulator();
      let caller = blankCallerDiagnostics();
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
        let caller = blankCallerDiagnostics();
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
      let caller = blankCallerDiagnostics();
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
  // ADR-089 §9: the rules are named, and checked, before any game is played.
  const engineRules = engineRulesNamed(config.engineRules, "runBatch");
  // N8: a legacy caller leaves `config.tunables` undefined and plays `DEFAULT_TUNABLES` itself (the
  // same reference `rulesTunables("legacy")` returns), so its provenance and stream are today's.
  const tunables = config.tunables ?? rulesTunables(engineRules);
  const tunablesVersion =
    config.tunablesVersion ?? (config.tunables === undefined ? "DEFAULT_TUNABLES" : "UNNAMED_PATCH");
  if (config.tunables !== undefined && config.tunablesVersion === undefined) {
    throw new Error(
      "runBatch was given patched tunables and no tunablesVersion. calibration.md §6: every " +
        "report states which tunables-version it measured. An unnamed patch is tuning amnesia " +
        "with extra steps.",
    );
  }
  // S1: the stamp agrees with the name and with the dials actually passed, or nothing is played.
  checkStamp(tunables, engineRules, "runBatch");

  const callerVersion = config.playCalling.callerVersion ?? DEFAULT_CALLER_VERSION;

  const started = Date.now();
  const { accumulator, caller } = await executor.run(jobs, (job) => {
    const built = buildFixture(index, job.fixture);
    const output = runOneGame({
      built,
      seed: job.seed,
      tendencies: config.playCalling.tendencies,
      fourthDown: config.playCalling.fourthDown,
      tunables,
      callerVersion,
    });
    // K14: a pocket-1 batch folds with the tunables it played; a legacy one folds as it always has.
    return {
      accumulator:
        engineRules === LEGACY_RULES
          ? foldGame(emptyAccumulator(), output.observation)
          : foldGame(emptyAccumulator(), output.observation, tunables),
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
      tunablesDigest: stableDigest(tunables),
      callerVersion: callerIdentity(callerVersion, config.playCalling.tendencies.version),
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
      // The digest of the stamp the games were played under (an arm's own, for an arm bundle).
      ...rulesStampUnlessLegacy(engineRules, tunables.engineRules?.overlayDigest),
    },
  };
}
