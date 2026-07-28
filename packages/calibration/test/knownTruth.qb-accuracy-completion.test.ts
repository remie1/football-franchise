/**
 * KNOWN-TRUTH GATE — qb-accuracy-completion.
 *
 * One scenario per file so Vitest runs the five ladders in parallel; `knownTruthGate.ts` holds
 * the two assertions and the reasoning. The ladder's rungs, sample size, tolerance and the
 * measured evidence they were set from are in `src/knownTruth/scenarios.ts`.
 */
import { gateFor } from "./knownTruthGate.js";

gateFor("qb-accuracy-completion");
