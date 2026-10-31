/**
 * ADR-089 step 1, review CT-8: K14 says every fold of a step-1 arm reads the arm's own tunables.
 *
 * `pocketStep1.test.ts` checks it two ways: a scan of the source for `DEFAULT_TUNABLES` outside a
 * default parameter, and a whole-fold digest that differs under Heels. Neither sees a call that
 * leaves the argument out and so falls back to a default (`foldGame(acc, game)`), when another
 * sub-fold still makes the digest differ. Here every fold `foldStep1Game` calls, and the
 * throw-class reader the on-the-run split and the rows call, is wrapped to record the tunables it
 * was handed; each wrapper calls the real function. One game of A2 is folded with A2's tunables,
 * and every recorded call must have been handed that very object (M1 its shape-S dials).
 */
import { describe, expect, it, vi } from "vitest";

const seen = vi.hoisted(() => ({ calls: [] as { fn: string; tunables: unknown }[], on: false }));

vi.mock("../src/metrics/collect.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/metrics/collect.js")>();
  return {
    ...real,
    foldGame: (...args: Parameters<typeof real.foldGame>) => {
      if (seen.on) seen.calls.push({ fn: "foldGame", tunables: args[2] });
      return real.foldGame(...args);
    },
  };
});
vi.mock("../src/pocket/rows.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/pocket/rows.js")>();
  return {
    ...real,
    foldRowsGame: (...args: Parameters<typeof real.foldRowsGame>) => {
      if (seen.on) seen.calls.push({ fn: "foldRowsGame", tunables: args[2] });
      return real.foldRowsGame(...args);
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
vi.mock("../src/pocket/s1Stream.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/pocket/s1Stream.js")>();
  return {
    ...real,
    foldS1Game: (...args: Parameters<typeof real.foldS1Game>) => {
      if (seen.on) seen.calls.push({ fn: "foldS1Game", tunables: args[2] });
      return real.foldS1Game(...args);
    },
    foldAffectedGame: (...args: Parameters<typeof real.foldAffectedGame>) => {
      if (seen.on) seen.calls.push({ fn: "foldAffectedGame", tunables: args[2] });
      return real.foldAffectedGame(...args);
    },
  };
});
vi.mock("../src/pocket/m1PushWindow.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/pocket/m1PushWindow.js")>();
  return {
    ...real,
    foldM1Game: (...args: Parameters<typeof real.foldM1Game>) => {
      if (seen.on) seen.calls.push({ fn: "foldM1Game", tunables: args[2] });
      return real.foldM1Game(...args);
    },
  };
});
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

const { armById, mechanismsOf } = await import("../src/pocket/arms.js");
const { flatBaseline } = await import("../src/pocket/corpus.js");
const { emptyLeagueFolds, foldStep1Game } = await import("../src/pocket/step1.js");

describe("K14 by the arguments: every fold of a step-1 arm is handed the arm's tunables (review CT-8)", () => {
  it("folds one A2 game with A2's tunables, and no fold falls back to a default", () => {
    const a2 = armById("A2");
    const mechanisms = mechanismsOf(a2);
    let games = 0;
    flatBaseline(1, (o, snapshot) => {
      const f = emptyLeagueFolds("A2", mechanisms);
      seen.calls.length = 0;
      seen.on = true;
      try {
        foldStep1Game(f, o, snapshot, a2.tunables, mechanisms);
      } finally {
        seen.on = false;
      }
      games += 1;
    }, { tunables: a2.tunables, callerVersion: "v7", first: 1 });
    expect(games).toBe(1);

    const fns = [...new Set(seen.calls.map((c) => c.fn))].sort();
    expect(fns).toEqual(["foldAffectedGame", "foldGame", "foldGuardGame", "foldM1Game", "foldRowsGame", "foldS1Game", "throwClassOf"]);
    const beat = a2.tunables.passRush.beatClock!;
    for (const c of seen.calls) {
      if (c.fn === "foldM1Game") expect(c.tunables, c.fn).toEqual({ theta: beat.thetaSeconds, k: beat.shape, beta: beat.ratingWeight });
      else expect(c.tunables, c.fn).toBe(a2.tunables);
    }
  }, 120_000);
});
