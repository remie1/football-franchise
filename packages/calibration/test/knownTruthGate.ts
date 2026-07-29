/**
 * ONE SCENARIO'S GATE, DECLARED ONCE AND INSTANTIATED PER FILE.
 *
 * ================== WHY THIS IS FIVE FILES AND NOT ONE describe.each ==================
 *
 * It was one file. The whole ladder set ran sequentially inside it, and that shape is what made
 * the power question look like a trade against CI time: the only way to buy a step SE small
 * enough to gate on was to add games, and every game added went straight onto the wall clock.
 *
 * Vitest parallelises TEST FILES and not tests within a file, and these scenarios are perfectly
 * independent — separate leagues, separate batch seeds, no shared state. Split one file per
 * scenario and the suite's cost stops being the SUM of the ladders and becomes the MAX. That is
 * what paid for the sample sizes in `scenarios.ts`: the set went from 1,040 games to 2,720, a
 * 2.6× increase, for about a third more wall clock rather than 160% more, because the longest
 * single ladder (`db-coverage`, then 1,200 games) now runs beside the other four rather than
 * after them. Measured on this repo: the package ran 43s before and ~57s after, and that 57s was
 * `db-coverage` alone — every other ladder finished inside it, so the next scenario added was
 * free until it exceeded 55s on its own. The set is now 4,120 games and `db-coverage` is 1,800
 * of them.
 *
 * **AND THAT BUDGET HAS SINCE BEEN SPENT, TWICE, AND THEN OVERRUN.**
 *
 *  1. `ol-passblock` went from 80 games a rung to 160 to buy its first step from 4.7σ to 7.0σ of
 *     noise margin, taking it from ~13s to ~38s. Free: `db-coverage` still ran longer.
 *  2. `rb-vision` did the same thing at the same trigger — 4.7σ, 80 → 160 games, ~19s to ~38s.
 *     Also free, for the same reason.
 *  3. **`db-coverage` itself went 400 → 600 games, and that one is NOT free.** Its first step
 *     measured 3.85σ at 400 over eight seed sets, so the increase was compulsory rather than
 *     prudent (§22a leaves no other lever: tolerances may not widen and `n` may not fall). The
 *     longest file in the package went from ~60s to ~90s, and because the package's cost IS the
 *     longest file, **the package went from ~63s to ~92s.**
 *
 * So the headroom the split bought is spent and the suite's cost now rises with `db-coverage`
 * one-for-one. The next increase on that scenario is a straight addition to every push. Past
 * here the answers are `exports`-map + worker threads (backlog §21a's trigger, now due) or
 * §22c's split — the fast four on every push, `db-coverage` on a schedule. **Never a smaller
 * `n`** (§22c), which is the one economy that would silently undo all of the above.
 *
 * The cost of the split is that a scenario could be added to the registry and silently never
 * gated, because nothing would import it. `knownTruth.test.ts` closes that hole by asserting the
 * file exists — see its `every scenario has a gate file` test, which is the reason this helper
 * takes an id and derives the filename from it rather than the other way round.
 */
import { describe, expect, it } from "vitest";
import { failuresOf, runLadder } from "../src/knownTruth/assertions.js";
import { scenarioById } from "../src/knownTruth/scenarios.js";

/** The filename a scenario's gate must live in. Mechanical, so the guard can check it. */
export function gateFileName(scenarioId: string): string {
  return `knownTruth.${scenarioId}.test.ts`;
}

export function gateFor(scenarioId: string): void {
  const scenario = scenarioById(scenarioId);

  describe(scenarioId, () => {
    it(
      "is monotone in the designed attribute and moves the outcome by at least the floor",
      async () => {
        const result = await runLadder(scenario);
        const failures = failuresOf(result);
        if (failures.length > 0) {
          throw new Error(failures.map((f) => f.report).join("\n\n"));
        }
        expect(result.monotone).toBe(true);
        expect(result.effectPasses).toBe(true);
      },
      600_000,
    );

    it(
      "is reproducible — the same ladder twice produces the same numbers",
      async () => {
        // SIX GAMES, NOT TWO, AND THE REASON IS THAT TWO MADE THIS TEST VACUOUS. Every
        // measurement in `scenarios.ts` returns `null` below a minimum sample — 50 attempts, 40
        // carries, 100 dropbacks — so at two games a rung most of these ladders measured
        // `[null, null, null]` twice and the equality held without the simulation being
        // consulted at all. Six clears every threshold, which is asserted below rather than
        // assumed, because a threshold moving would silently restore the vacuum.
        const a = await runLadder({ ...scenario, games: 6 });
        const b = await runLadder({ ...scenario, games: 6 });
        expect(
          a.rungs.every((r) => r.measured !== null),
          `at 6 games a rung, ${scenarioId} still measures nothing on some rung, so this test ` +
            `would compare nulls. Raise the games here to clear the measurement's minimum sample.`,
        ).toBe(true);
        expect(a.rungs.map((r) => r.measured)).toEqual(b.rungs.map((r) => r.measured));
        expect(a.rungs.map((r) => r.seedDigest)).toEqual(b.rungs.map((r) => r.seedDigest));
      },
      600_000,
    );
  });
}
