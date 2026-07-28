/**
 * THE WORKER ENTRY POINT. Compiled to `dist/harness/worker.js` and loaded by `workerPool.ts`.
 *
 * It calls `runOneGame` — the same function the in-process executor calls — folds the result,
 * and posts the fold back. A worker that re-implemented any part of the game loop would make
 * "worker count does not change the numbers" a claim rather than a consequence.
 *
 * The league is rebuilt on this side from the bootstrap payload rather than a fixture being
 * shipped per job, because a `BuiltFixture` carries every `PlayerState` of both teams and
 * structured-cloning that once per game is most of the cost of running one.
 */
import { parentPort, workerData } from "node:worker_threads";
import type { Tunables } from "@ff/engine";
import { indexLeague } from "../league/snapshot.js";
import { emptyAccumulator, foldGame } from "../metrics/collect.js";
import type { BatchJob } from "./batch.js";
import { runOneGame } from "./runGame.js";
import { buildFixture } from "./schedule.js";
import type { WorkerBootstrap, WorkerJobResult } from "./workerPool.js";

const port = parentPort;
if (port === null) {
  throw new Error("@ff/calibration: harness/worker.js was loaded outside a worker thread");
}

const bootstrap = workerData as WorkerBootstrap;
const index = indexLeague(bootstrap.league);

port.on("message", (job: BatchJob) => {
  try {
    const built = buildFixture(index, job.fixture);
    const output = runOneGame({
      built,
      seed: job.seed,
      tendencies: bootstrap.tendencies,
      fourthDown: bootstrap.fourthDown,
      ...(bootstrap.tunables === undefined ? {} : { tunables: bootstrap.tunables as Tunables }),
    });
    const result: WorkerJobResult = {
      accumulator: foldGame(emptyAccumulator(), output.observation),
      caller: output.caller,
    };
    port.postMessage(result);
  } catch (error) {
    port.postMessage({ error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) });
  }
});
