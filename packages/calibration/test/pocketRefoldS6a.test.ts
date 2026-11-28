/**
 * ADR-089 step 6: Q-2g, the re-fold proof, on the s1, s1-base and s2 pins (A1 to A4, A5, A11, B1 to B7) (step-6 plan §3.2 K2, §8.1 Q-2g). The folds,
 * the old readers' digests and the rule are in `pocketRefoldS6Shared.ts`; the proof is split in four
 * files so that the four run side by side.
 */
import { describe, it } from "vitest";
import { FIRST, refoldSets } from "./pocketRefoldS6Shared.js";

describe(`Q-2g: step 6's readers re-fold the s1, s1-base and s2 pins (A1 to A4, A5, A11, B1 to B7) as before (first ${String(FIRST)} a league)`, () => {
  refoldSets(["S1", "S1BASE", "S2"], (name, fn, timeout) => it(name, fn, timeout));
});
