/**
 * ADR-089 step 2 (plan §6, stream K2): K14 says every fold of a step-2 arm reads the arm's own
 * tunables, and `pocketStep1.test.ts`'s source scan (no `DEFAULT_TUNABLES` outside a default
 * parameter) covers `s2Stream.ts` too. The scan does not see a call that leaves the argument out and
 * so falls back to a default (`severityOf(status)`), so here, as `pocketStep1K14.test.ts` does for
 * step 1, every function `foldS2Game` reaches that takes tunables is wrapped to record what it was
 * handed: each check through the `s2Checks` table (its context's tunables), and across modules the
 * throw-class reader, the guard fold, M2 STREAM's game fold, the arrival floor and the ladder's
 * severity. Each wrapper calls the real function. One game each of B3 (PER_RUSHER), B4 (the narrower
 * counter) and B6 (PER_RUSHER on A11) is folded with the arm's tunables, and every recorded call must
 * have been handed that very object.
 */
import { describe, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({ calls: [] as { fn: string; tunables: unknown }[], on: false }));

vi.mock("../src/pocket/throwClass.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/pocket/throwClass.js")>();
  return {
    ...real,
    throwClassOf: (...args: Parameters<typeof real.throwClassOf>) => {
      if (seen.on) seen.calls.push({ fn: "throwClassOf", tunables: args[1] });
      return real.throwClassOf(...args);
    },
  };
});
vi.mock("../src/pocket/step0.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/pocket/step0.js")>();
  return {
    ...real,
    foldGuardGame: (...args: Parameters<typeof real.foldGuardGame>) => {
      if (seen.on) seen.calls.push({ fn: "foldGuardGame", tunables: args[2] });
      return real.foldGuardGame(...args);
    },
  };
});
vi.mock("../src/pocket/m2ForcingSource.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/pocket/m2ForcingSource.js")>();
  return {
    ...real,
    foldM2StreamGame: (...args: Parameters<typeof real.foldM2StreamGame>) => {
      if (seen.on) seen.calls.push({ fn: "foldM2StreamGame", tunables: args[2] });
      return real.foldM2StreamGame(...args);
    },
  };
});
vi.mock("../src/knownTruth/geometryTimeRetirement.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/knownTruth/geometryTimeRetirement.js")>();
  return {
    ...real,
    floorFromArrival: (...args: Parameters<typeof real.floorFromArrival>) => {
      if (seen.on) seen.calls.push({ fn: "floorFromArrival", tunables: args[0] });
      return real.floorFromArrival(...args);
    },
  };
});
vi.mock("../src/knownTruth/pocketLadder.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/knownTruth/pocketLadder.js")>();
  return {
    ...real,
    severityOf: (...args: Parameters<typeof real.severityOf>) => {
      if (seen.on) seen.calls.push({ fn: "severityOf", tunables: args[1] });
      return real.severityOf(...args);
    },
  };
});

const { armById } = await import("../src/pocket/arms.js");
const { goldenGames } = await import("../src/pocket/corpus.js");
const s2 = await import("../src/pocket/s2Stream.js");

// Each check through the table, recording its context's tunables (the third argument).
for (const name of Object.keys(s2.s2Checks) as (keyof typeof s2.s2Checks)[]) {
  const real = s2.s2Checks[name] as (...args: unknown[]) => void;
  (s2.s2Checks as Record<string, unknown>)[name] = (...args: unknown[]): void => {
    if (seen.on) seen.calls.push({ fn: `s2Checks.${name}`, tunables: (args[2] as { readonly tunables?: unknown } | undefined)?.tunables });
    real(...args);
  };
}

describe("K14 by the arguments: every step-2 fold is handed the arm's tunables", () => {
  it.each(["B3", "B4", "B6"] as const)("folds one %s game with its tunables, and no fold falls back to a default", (id) => {
    const arm = armById(id);
    let games = 0;
    seen.calls.length = 0;
    goldenGames(
      "flat",
      (o, snapshot) => {
        const folds = s2.emptyS2Folds();
        seen.on = true;
        try {
          s2.foldS2Game(folds, o.events, arm.tunables, snapshot);
        } finally {
          seen.on = false;
        }
        expect(s2.s2Problems(folds)).toEqual([]);
        games += 1;
      },
      { tunables: arm.tunables, callerVersion: "v7", first: 1 },
    );
    expect(games).toBe(1);
    const fns = [...new Set(seen.calls.map((c) => c.fn))].sort();
    expect(fns).toEqual([
      "floorFromArrival",
      "foldGuardGame",
      "foldM2StreamGame",
      "s2Checks.arrival",
      "s2Checks.checkdown",
      "s2Checks.desperation",
      "s2Checks.guardGame",
      "s2Checks.liveSet",
      "s2Checks.m2",
      "s2Checks.mustAct",
      "s2Checks.share",
      "s2Checks.warning",
      "severityOf",
      "throwClassOf",
    ]);
    for (const c of seen.calls) expect(c.tunables, c.fn).toBe(arm.tunables);
  }, 120_000);
});
