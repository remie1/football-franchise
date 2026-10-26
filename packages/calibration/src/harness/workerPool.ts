/**
 * THE THREAD-BACKED EXECUTOR — `calibration.md` §3's "parallel across worker threads".
 *
 * ================== WHY IT IS OPT-IN AND FAILS LOUDLY ==================
 *
 * `node:worker_threads` runs JavaScript. This package's `main` is `src/index.ts` and its tests
 * run through Vitest's transform pipeline, so there is no `.js` for a worker to load until
 * `pnpm --filter @ff/calibration build` has run. Two options existed:
 *
 *  - register a TypeScript loader inside the worker, which couples the harness to a transform
 *    toolchain and makes "does the batch run" depend on how it was invoked; or
 *  - require the build, and say so.
 *
 * The second. `workerPoolExecutor` checks for the compiled worker up front and throws with the
 * command to run. A pool that silently fell back to in-process would report `workers: 8` in a
 * provenance block while running on one, and the only symptom would be a slow batch.
 *
 * ================== WHY PARALLELISM IS SAFE HERE ==================
 *
 * Spec #1 §8's fork discipline: every draw is addressed by a hash of `(seed, label)` and no
 * generator is carried across plays, so a game's dice do not depend on what any other game did.
 * Games are therefore independent, and `mergeAccumulators` is associative and commutative with
 * sorted sample vectors, so the merge order a scheduler happens to produce cannot move a number.
 * The shard-and-merge executor in `batch.ts` exists to test that property without threads.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import type { CallerVersion } from "../caller/anticipate.js";
import type { FrozenCallerDiagnostics } from "../caller/frozen.js";
import type { FittedFourthDown } from "../caller/fourthDown.js";
import type { FittedTendencies } from "../caller/tendencies.js";
import { emptyAccumulator, mergeAccumulators, type SimAccumulator } from "../metrics/collect.js";
import type { AnyProvenancedLeague } from "../league/provenance.js";
import { EngineRulesError } from "../pocket/rules.js";
import {
  blankCallerDiagnostics,
  mergeCallerDiagnostics,
  type BatchExecutor,
  type BatchJob,
} from "./batch.js";

export class WorkerPoolUnavailableError extends Error {
  constructor(path: string) {
    super(
      `worker pool needs compiled output and ${path} does not exist. Run:\n` +
        `  pnpm --filter @ff/calibration build\n` +
        `Or pass \`executor: inProcessExecutor()\` (identical numbers, one thread).`,
    );
    this.name = "WorkerPoolUnavailableError";
  }
}

/**
 * THE POOL IS BUILT AND NOT YET RUNNABLE, and this error is where that is said out loud.
 *
 * `packages/calibration` compiles to `dist/`, so `dist/harness/worker.js` exists. It then does
 * `import { simulateGame } from "@ff/engine"`, Node resolves `@ff/engine` through its
 * `package.json` `main`, and that `main` is **`src/index.ts`** — which Node cannot load, and
 * which re-exports `./sim/play.js`, a file that only exists as `.ts`.
 *
 * So the blocker is not in this package. It is that `@ff/engine` and `@ff/playbook` publish
 * TypeScript as their entry point, which is exactly right for a workspace consumed by a
 * transform pipeline and exactly wrong for one consumed by `node`. Fixing it is a `main` /
 * `exports` change in two packages this dispatch may not write to, so it is reported rather
 * than worked around: a loader shim inside the worker would couple the harness to a transform
 * toolchain and make "does the batch run" depend on how it was invoked.
 *
 * Until then `inProcessExecutor` runs every batch and `shardedExecutor` proves the property the
 * pool depends on (merge order cannot move a number). Neither is a fallback the pool takes
 * silently — a pool that quietly ran on one thread would report `workers: 8` in a provenance
 * block and nothing would show it.
 */
export class WorkspaceNotBuiltError extends Error {
  constructor(cause: Error) {
    super(
      `the worker thread could not load a workspace dependency:\n  ${cause.message}\n\n` +
        `\`@ff/engine\` and \`@ff/playbook\` declare \`main: src/index.ts\`, so a compiled ` +
        `worker resolves them to TypeScript that node cannot execute. This is a packaging ` +
        `change in those packages (a \`main\`/\`exports\` pointing at built JS), not something ` +
        `the harness can fix from this side.\n\n` +
        `Use \`executor: inProcessExecutor()\` — identical numbers — or \`shardedExecutor(n)\` ` +
        `to exercise the merge across n partitions in one thread.`,
    );
    this.name = "WorkspaceNotBuiltError";
    this.cause = cause;
  }
}

/** What a worker is handed once, before any job. Everything constant across the batch. */
export interface WorkerBootstrap {
  readonly league: AnyProvenancedLeague;
  readonly tendencies: FittedTendencies;
  readonly fourthDown: FittedFourthDown;
  /** Serialised tunables. `undefined` means the worker uses `DEFAULT_TUNABLES`.
   *  Legacy only (ADR-089 review NPC-2, CT-5): the worker folds with `DEFAULT_TUNABLES`' tables
   *  (`worker.ts`) and plays these apart from the tunables `runBatch` checks and records, so
   *  `workerPoolExecutor` refuses a `pocket-1` stamp or block here, and a `pocket-1` batch runs in
   *  process, where it folds with the tunables it played (K14). When the pool becomes runnable,
   *  `runBatch` should hand it the tunables it checked and the worker fold with them. */
  readonly tunables?: unknown;
  /** ADR-024. `undefined` means the worker uses `DEFAULT_CALLER_VERSION` (v7), the same default
   *  the in-process path takes. No knobs (not v5's options, not v6's parts), as
   *  `BatchConfig.playCalling` carries none.
   *  ⚠ THE TWO EXECUTORS CAN STILL RUN DIFFERENT CALLERS, in two ways. (1) The worker is the
   *  compiled `dist/harness/worker.js` and reads the default it was built with, so a `dist/` built
   *  before ADR-073 step 3.5 moved the default would play v4 while `runBatch` records the source's
   *  default in provenance. (2) The pool is handed this bootstrap apart from the batch's config:
   *  the worker plays the bootstrap's caller, while `runBatch` records
   *  `BatchConfig.playCalling.callerVersion` (or the default), so a bootstrap whose caller (named,
   *  or the default when it names none) differs from the one `runBatch` resolves plays one caller
   *  and records another. The
   *  pool cannot run a game today (`WorkerPoolUnavailableError` unbuilt, `WorkspaceNotBuiltError`
   *  built), so this is a comment and not a guard; when the pool becomes runnable, `runBatch`
   *  should refuse a pool whose bootstrap caller differs from the one it resolves. */
  readonly callerVersion?: CallerVersion;
}

export interface WorkerJobResult {
  readonly accumulator: SimAccumulator;
  readonly caller: FrozenCallerDiagnostics;
}

/**
 * ADR-089 review NPC-2 and CT-5: a bootstrap whose tunables carry a rules stamp or any `pocket-1`
 * block is refused before the compiled-worker check, whatever the build state, since the worker
 * would fold it with the default tables and play it unchecked. Reads only; legacy passes.
 */
function refusePocketBootstrap(tunables: unknown): void {
  if (tunables === null || typeof tunables !== "object") return;
  const t = tunables as { readonly engineRules?: unknown; readonly passRush?: unknown };
  const pr = (t.passRush !== null && typeof t.passRush === "object" ? t.passRush : {}) as {
    readonly beatClock?: unknown;
    readonly repClock?: unknown;
    readonly approach?: unknown;
  };
  if (t.engineRules === undefined && pr.beatClock === undefined && pr.repClock === undefined && pr.approach === undefined) return;
  throw new EngineRulesError(
    "workerPoolExecutor: a pocket-1 bootstrap (a rules stamp, or a passRush.beatClock, repClock or approach block) is refused: " +
      "the worker folds with DEFAULT_TUNABLES' tables and plays its bootstrap apart from the tunables runBatch checks and records, " +
      "so a pocket-1 batch runs on inProcessExecutor() (K14)",
  );
}

function compiledWorkerPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // Two layouts: running from `dist/harness` (built) or `src/harness` (source).
  const sibling = join(here, "worker.js");
  if (existsSync(sibling)) return sibling;
  return resolve(here, "..", "..", "dist", "harness", "worker.js");
}

/**
 * A fixed-size pool. Jobs are handed out on completion rather than partitioned up front, so one
 * slow game does not idle a thread — and because the merge is order-independent, dynamic
 * scheduling costs nothing in reproducibility.
 */
export function workerPoolExecutor(workers: number, bootstrap: WorkerBootstrap): BatchExecutor {
  if (workers < 1) throw new RangeError("workers must be at least 1");
  refusePocketBootstrap(bootstrap.tunables);
  const workerPath = compiledWorkerPath();
  if (!existsSync(workerPath)) throw new WorkerPoolUnavailableError(workerPath);

  return {
    name: `worker-threads-${workers}`,
    workers,
    async run(jobs: readonly BatchJob[]) {
      let accumulator = emptyAccumulator();
      let caller: FrozenCallerDiagnostics | null = null;
      let next = 0;
      let failure: Error | null = null;

      await Promise.all(
        Array.from({ length: Math.min(workers, jobs.length) }, () =>
          new Promise<void>((resolvePromise, rejectPromise) => {
            const worker = new Worker(workerPath, { workerData: bootstrap });
            const submit = (): void => {
              if (failure !== null || next >= jobs.length) {
                void worker.terminate();
                resolvePromise();
                return;
              }
              const job = jobs[next++];
              worker.postMessage(job);
            };
            worker.on("message", (message: WorkerJobResult | { error: string }) => {
              if ("error" in message) {
                failure = new Error(`worker: ${message.error}`);
                void worker.terminate();
                rejectPromise(failure);
                return;
              }
              accumulator = mergeAccumulators(accumulator, message.accumulator);
              caller = caller === null ? message.caller : mergeCallerDiagnostics(caller, message.caller);
              submit();
            });
            worker.on("error", (error: Error) => {
              const wrapped = /Cannot find module|ERR_MODULE_NOT_FOUND|Unknown file extension/.test(
                error.message,
              )
                ? new WorkspaceNotBuiltError(error)
                : error;
              failure = wrapped;
              rejectPromise(wrapped);
            });
            submit();
          }),
        ),
      );

      if (failure !== null) throw failure;
      return { accumulator, caller: caller ?? blankCallerDiagnostics() };
    },
  };
}
