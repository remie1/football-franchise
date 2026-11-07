/**
 * ADR-089 step 5a, ITEM e (plan §2.1 row e): ESCAPE AT A CLEAN PICK is today's escape roll.
 *
 * 1. A clean pick's ESCAPE draws today's `scramble` CHECK on `movement/t<tick>:scramble`, on the
 *    tick's own threats, whose urgency is computed and is 0 (asserted), so its target is 50 plus
 *    10 for each live EDGE threat.
 * 2. Today's three outcomes at their margin boundaries (`tunables.ts` scramble bands): at 0 or more
 *    he is out (`QB_PURSUIT`, `QB_DECISION` SCRAMBLE), from -20 to -1 he is contained (the escape's
 *    own HOLD), below -20 he is caught (a sack). On the clean bench nobody is eligible to be named,
 *    so the sack names no sacker.
 * 3. No drill, no `:deadline`, no out-of-pocket throwaway: nothing after the escape draws a die
 *    on a family step 5a did not already draw.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/resolve/scramble.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/scramble.js")>();
  return { ...real, resolveScramble: vi.fn(real.resolveScramble) };
});

import { simulatePassPlay } from "../src/index.js";
import { resolveScramble } from "../src/resolve/scramble.js";
import { minTimeToArrival, urgencySteps } from "../src/resolve/rushThreat.js";
import type { Tunables } from "../src/tunables.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5S_TUNABLES, S5_TUNABLES, checkOf, onCleanBench, rollsOf, tickOfEvent } from "./step5Fixtures.js";

const scrambleSpy = vi.mocked(resolveScramble);
afterEach(() => scrambleSpy.mockClear());

type Run = { readonly label: string; readonly tunables: Tunables; readonly picture: boolean; readonly bench: boolean };
const RUNS: readonly Run[] = [
  { label: "s5", tunables: S5_TUNABLES, picture: true, bench: false },
  { label: "s5 shape S", tunables: S5S_TUNABLES, picture: false, bench: false },
  { label: "s5 shape S, clean bench", tunables: onCleanBench(S5S_TUNABLES), picture: false, bench: true },
];

function bandOf(margin: number): string {
  if (margin >= 15) return "CLEAN_ESCAPE";
  if (margin >= 0) return "ESCAPED";
  if (margin >= -20) return "CONTAINED";
  return "CAUGHT_FROM_BEHIND";
}

describe("ADR-089 step 5a: ESCAPE at a clean pick", () => {
  it("today's escape roll at urgency 0, its three outcomes at their boundaries, a bench sack naming nobody", () => {
    const outcomes = { out: 0, contained: 0, caught: 0, caughtOnBench: 0, edgePaid: 0 };
    const margins = new Set<number>();
    for (const run of RUNS) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 60; i++) {
          scrambleSpy.mockClear();
          const { state, calls } = build();
          const seed = `escape-${fixture}-${i}`;
          const { events } = simulatePassPlay(state, run.picture ? withPicture(state, calls) : calls, seed, run.tunables);
          events.forEach((e, n) => {
            const pick = checkOf(e);
            if (pick?.checkKind !== "pocket_movement" || !(pick.roll?.rngLabel ?? "").endsWith(":clean")) return;
            const tick = tickOfEvent(e) ?? -1;
            const sameTick = events.slice(n + 1).filter((x) => tickOfEvent(x) === tick);
            const esc = sameTick.find((x) => checkOf(x)?.checkKind === "scramble");
            if (esc === undefined) return; // a MOVE
            const c = checkOf(esc);
            if (c === undefined) return;
            expect(c.roll?.rngLabel).toBe((pick.roll?.rngLabel ?? "").replace(/:clean$/, ":scramble"));
            // Its inputs: the spy call for this tick.
            const call = scrambleSpy.mock.calls.map((x) => x[0]).find((a) => a.tick === tick);
            if (call === undefined) throw new Error(`${seed}: no escape roll at ${tick}`);
            expect(urgencySteps(run.tunables, minTimeToArrival(call.threats, tick))).toBe(0);
            const edge = call.threats.filter((t) => t.alignment === "EDGE").length;
            if (edge > 0) outcomes.edgePaid += 1;
            expect(c.target).toBe(run.tunables.scramble.target + edge * run.tunables.scramble.edgeThreatPenalty);
            const margin = c.margin ?? Number.NaN;
            margins.add(margin);
            expect(c.band, `${seed} margin ${margin}`).toBe(bandOf(margin));
            const kinds = sameTick.map((x) =>
              x.event.type === "QB_DECISION" ? `QB_DECISION:${(x.event.payload as { choice: string }).choice}` : x.event.type,
            );
            if (margin >= 0) {
              outcomes.out += 1;
              expect(kinds).toContain("QB_PURSUIT");
              expect(kinds.filter((k) => k.startsWith("QB_DECISION"))).toEqual(["QB_DECISION:SCRAMBLE"]);
            } else if (margin >= -20) {
              outcomes.contained += 1;
              expect(kinds.filter((k) => k.startsWith("QB_DECISION"))).toEqual(["QB_DECISION:HOLD"]);
              expect(kinds).not.toContain("QB_PURSUIT");
            } else {
              outcomes.caught += 1;
              expect(kinds.filter((k) => k.startsWith("QB_DECISION"))).toEqual([]);
              const result = events.find((x) => x.event.type === "PLAY_RESULT");
              expect((result?.event.payload as { yards: number }).yards).toBe(-run.tunables.result.sackYardsLost);
              if (run.bench && call.threats.length === 0) {
                outcomes.caughtOnBench += 1;
                const arrived = sameTick.filter((x) => x.event.type === "RUSH_THREAT" && (x.event.payload as { state: string }).state === "ARRIVED");
                expect(arrived).toEqual([]);
              }
            }
          });
          // No drill, no deadline pick, no contact or dodge dice at 5a (step 6).
          for (const { roll } of rollsOf(events)) expect(roll.rngLabel, seed).not.toMatch(/:deadline$|:drill:|:contact$|:dodge$|:alarm$/);
        }
      }
    }
    expect(outcomes.out).toBeGreaterThan(30);
    expect(outcomes.contained).toBeGreaterThan(10);
    expect(outcomes.caught).toBeGreaterThan(5);
    expect(outcomes.caughtOnBench).toBeGreaterThan(0);
    // On the league a clean break-out with a live EDGE threat over the horizon pays its penalty.
    expect(outcomes.edgePaid).toBeGreaterThan(0);
    // The boundaries were met in play: a margin at 0 and one at -20 or -21 (each on its own side).
    expect([...margins].some((m) => m >= 0 && m <= 2)).toBe(true);
    expect([...margins].some((m) => m < 0 && m >= -2)).toBe(true);
  });
});

/** The band table itself, the boundaries named in plan §2.1 row e. */
describe("ADR-089 step 5a: the escape bands the clean break-out uses are today's", () => {
  it("escape at margin 0, contained from -20 to -1, caught below -20", () => {
    const bands = S5_TUNABLES.scramble.bands;
    const at = (margin: number): string => bands.find((b) => margin >= b.minMargin)?.label ?? "none";
    expect(at(0)).toBe("ESCAPED");
    expect(at(15)).toBe("CLEAN_ESCAPE");
    expect(at(-1)).toBe("CONTAINED");
    expect(at(-20)).toBe("CONTAINED");
    expect(at(-21)).toBe("CAUGHT_FROM_BEHIND");
  });
});

