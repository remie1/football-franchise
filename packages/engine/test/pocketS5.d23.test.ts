/**
 * ADR-089 step 5a, ITEM b (D23) AND D23 ON THE RUN (plan §2.1 rows "b" and "D23 on the run").
 *
 * 1. `d23Pool`: the tick's candidates cut to men at the expiry bar (30) or more. A best read man at
 *    28 and a checkdown at 27 make no pool (no throw); a read man at 31 and a checkdown at 33 are
 *    both in it.
 * 2. In play: every throw a clean expiry decides runs today's decision roll on the cut pool, every
 *    man in it at 30 or more; a clean expiry with nobody at 30 goes to the pick (a `:clean` CHECK
 *    on the same tick). The base (s4) throws below 30 on the same plays (the part bites).
 * 3. At most one `:decision` die a tick, and never a `:clean` and a `:decision` on one tick
 *    (contracts-guardian C3, C7).
 * 4. D23 on the run: after a clean break-out no throw below the normal bar is decided (the
 *    desperation throw at 25 is not taken); after a pressured break-out it still is.
 * 5. With `d23` alone (no `move`, no `breakOut`) there is never a `:clean` die, and a clean expiry
 *    with nobody at 30 goes on to today's end of tick.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/cleanPocket.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/cleanPocket.js")>();
  return { ...real, mustDecideNow: vi.fn(real.mustDecideNow), cleanExpiry: vi.fn(real.cleanExpiry), d23Pool: vi.fn(real.d23Pool) };
});
vi.mock("../src/resolve/targetSelection.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/targetSelection.js")>();
  return { ...real, selectTarget: vi.fn(real.selectTarget) };
});

import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { d23Pool, mustDecideNow } from "../src/sim/cleanPocket.js";
import { selectTarget } from "../src/resolve/targetSelection.js";
import type { TargetCandidate } from "../src/resolve/targetSelection.js";
import { throwThresholdFor } from "../src/resolve/qbRead.js";
import type { Tunables } from "../src/tunables.js";
import type { PlayCalls } from "../src/types.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S4S_TUNABLES } from "./step4Fixtures.js";
import {
  S5S_TUNABLES,
  S5_TUNABLES,
  checkOf,
  cleanParts,
  cleanPicksOf,
  onCleanBench,
  restampS5,
  rollsOf,
  tickOfEvent,
  withCleanPocket,
} from "./step5Fixtures.js";

const poolSpy = vi.mocked(d23Pool);
const mustSpy = vi.mocked(mustDecideNow);
const selectSpy = vi.mocked(selectTarget);

function clearSpies(): void {
  poolSpy.mockClear();
  mustSpy.mockClear();
  selectSpy.mockClear();
}
afterEach(clearSpies);

const man = (receiver: string, effectiveOpenness: number): { receiver: string; effectiveOpenness: number } => ({ receiver, effectiveOpenness });

describe("ADR-089 step 5a: d23Pool (item b)", () => {
  it("a best read man at 28 and a checkdown at 27: no pool, so no throw", () => {
    expect(d23Pool([man("read", 28), man("checkdown", 27)], 30)).toEqual([]);
  });
  it("a read man at 31 and a checkdown at 33 are both in the pool; 29 is not; 30 is", () => {
    expect(d23Pool([man("read", 31), man("checkdown", 33), man("other", 29), man("bar", 30)], 30)).toEqual([
      man("read", 31),
      man("checkdown", 33),
      man("bar", 30),
    ]);
  });
});

/** The tick of the `mustDecideNow` call last made before invocation `order`. */
function tickBefore(order: number): number {
  let tick = -1;
  mustSpy.mock.calls.forEach((c, n) => {
    if ((mustSpy.mock.invocationCallOrder[n] ?? 0) < order) tick = c[0].tick;
  });
  return tick;
}

type Run = { readonly label: string; readonly tunables: Tunables; readonly picture: boolean };
const S5_RUNS: readonly Run[] = [
  { label: "s5 (picture)", tunables: S5_TUNABLES, picture: true },
  { label: "s5 shape S", tunables: S5S_TUNABLES, picture: false },
  { label: "s5 shape S, clean bench", tunables: onCleanBench(S5S_TUNABLES), picture: false },
];

function play(run: Run, calls: (c: PlayCalls) => PlayCalls, build: () => { state: Parameters<typeof simulatePassPlay>[0]; calls: PlayCalls }, seed: string): readonly MatchEventEnvelope[] {
  const { state, calls: base } = build();
  const c = calls(base);
  return simulatePassPlay(state, run.picture ? withPicture(state, c) : c, seed, run.tunables).events;
}

describe("ADR-089 step 5a: D23 in play", () => {
  it("a clean expiry throws only on the cut pool (every man at 30 or more); nobody at 30 gives the pick's CHECK on the same tick", () => {
    let throws = 0;
    let toPick = 0;
    for (const run of S5_RUNS) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 40; i++) {
          clearSpies();
          const events = play(run, (c) => c, build, `d23-${fixture}-${i}`);
          poolSpy.mock.results.forEach((r, n) => {
            if (r.type !== "return") return;
            const pool = r.value as unknown as readonly TargetCandidate[];
            const order = poolSpy.mock.invocationCallOrder[n] ?? 0;
            const tick = tickBefore(order);
            if (pool.length > 0) {
              throws += 1;
              for (const c of pool) expect(c.effectiveOpenness).toBeGreaterThanOrEqual(30);
              // The decision roll that follows runs on that very pool.
              const next = selectSpy.mock.calls.findIndex((_, k) => (selectSpy.mock.invocationCallOrder[k] ?? 0) > order);
              expect(next).toBeGreaterThanOrEqual(0);
              expect(selectSpy.mock.calls[next]?.[2]).toBe(pool);
              const decided = events.filter((e) => e.event.type === "QB_DECISION" && tickOfEvent(e) === tick);
              expect(decided.map((e) => (e.event.payload as { choice: string }).choice)).toEqual([expect.stringMatching(/^(THROW|CHECKDOWN)$/)]);
            } else {
              toPick += 1;
              expect(cleanPicksOf(events).filter((e) => tickOfEvent(e) === tick), `d23-${fixture}-${i} t${tick}`).toHaveLength(1);
            }
          });
        }
      }
    }
    expect(throws).toBeGreaterThan(100);
    expect(toPick).toBeGreaterThan(100);
  });

  it("the part bites: on a clean bench's unpressured plays the s4 base throws below 30, where s5 never does", () => {
    let below = 0;
    let belowS5 = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 100; i++) {
        for (const [tunables, isBase] of [[onCleanBench(S4S_TUNABLES), true], [onCleanBench(S5S_TUNABLES), false]] as const) {
          clearSpies();
          const { state, calls } = build();
          const { events } = simulatePassPlay(state, calls, `d23-bite-${fixture}-${i}`, tunables);
          // Only plays never under pressure (no `:movement` die: a blitzer's free run on the bench forces him).
          if (rollsOf(events).some((r) => r.roll.rngLabel.endsWith(":movement"))) continue;
          for (const c of selectSpy.mock.calls) {
            if (Math.max(...c[2].map((x) => x.effectiveOpenness)) >= 30) continue;
            if (isBase) below += 1;
            else belowS5 += 1;
          }
        }
      }
    }
    expect(below).toBeGreaterThan(20);
    expect(belowS5).toBe(0);
  });

  it("at most one :decision die a tick, and never a :clean and a :decision on one tick (C3, C7)", () => {
    let plays = 0;
    for (const run of S5_RUNS) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 25; i++) {
          const events = play(run, (c) => c, build, `c7-${fixture}-${i}`);
          plays += 1;
          const decisionTicks = new Map<string, number>();
          const cleanTicks = new Set<string>();
          for (const { roll } of rollsOf(events)) {
            const d = /\/t(\d+\.\d):decision\/quality$/.exec(roll.rngLabel);
            if (d?.[1] !== undefined) decisionTicks.set(d[1], (decisionTicks.get(d[1]) ?? 0) + 1);
            const c = /\/movement\/t(\d+\.\d):clean$/.exec(roll.rngLabel);
            if (c?.[1] !== undefined) cleanTicks.add(c[1]);
          }
          for (const [t, n] of decisionTicks) {
            expect(n, `c7-${fixture}-${i} t${t}`).toBe(1);
            expect(cleanTicks.has(t), `c7-${fixture}-${i} t${t}`).toBe(false);
          }
        }
      }
    }
    expect(plays).toBe(3 * PASS_FIXTURES.length * 25);
  });
});

/** Whether the stream's escape was at a clean pick (a `:clean` CHECK before its QB_PURSUIT) or a forced one. */
function breakOutKind(events: readonly MatchEventEnvelope[]): "clean" | "pressured" | undefined {
  const pursuit = events.findIndex((e) => e.event.type === "QB_PURSUIT");
  if (pursuit < 0) return undefined;
  const picks = events.slice(0, pursuit).filter((e) => checkOf(e)?.checkKind === "pocket_movement");
  const last = picks[picks.length - 1];
  if (last === undefined) return undefined;
  return (checkOf(last)?.roll?.rngLabel ?? "").endsWith(":clean") ? "clean" : "pressured";
}

describe("ADR-089 step 5a: D23 on the run", () => {
  it("after a clean break-out no throw below the normal bar is decided; after a pressured break-out it still is", () => {
    let cleanOuts = 0;
    let cleanThrows = 0;
    let pressuredBelow = 0;
    for (const run of S5_RUNS) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 150; i++) {
          clearSpies();
          const { calls } = build();
          const events = play(run, (c) => c, build, `run-${fixture}-${i}`);
          const kind = breakOutKind(events);
          if (kind === undefined) continue;
          const bar = throwThresholdFor(run.tunables, calls.offense.readSystem);
          // A play throws at most once: the one decision roll is the throw's.
          expect(selectSpy.mock.calls.length).toBeLessThanOrEqual(1);
          const pool = selectSpy.mock.calls[0]?.[2];
          const best = pool === undefined ? undefined : Math.max(...pool.map((c) => c.effectiveOpenness));
          if (kind === "clean") {
            cleanOuts += 1;
            if (best !== undefined) {
              cleanThrows += 1;
              expect(best, `run-${fixture}-${i}`).toBeGreaterThanOrEqual(bar);
            }
          } else if (best !== undefined && best < bar) {
            pressuredBelow += 1;
          }
        }
      }
    }
    expect(cleanOuts).toBeGreaterThan(50);
    expect(cleanThrows).toBeGreaterThan(5);
    expect(pressuredBelow).toBeGreaterThan(0);
  });

  it("with d23 alone there is no :clean die; a clean expiry with nobody at 30 goes on to today's end of tick", () => {
    const d23Only = withCleanPocket(restampS5(S4S_TUNABLES, "fnv1a:7f5a00e3"), cleanParts({ move: false, breakOut: false, bump: false, d23OnRun: false }));
    let empty = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < 30; i++) {
        clearSpies();
        const { state, calls } = build();
        const { events } = simulatePassPlay(state, calls, `d23only-${fixture}-${i}`, onCleanBench(d23Only));
        expect(cleanPicksOf(events)).toEqual([]);
        poolSpy.mock.results.forEach((r, n) => {
          if (r.type !== "return" || (r.value as readonly unknown[]).length > 0) return;
          empty += 1;
          const tick = tickBefore(poolSpy.mock.invocationCallOrder[n] ?? 0);
          const decided = events.filter((e) => e.event.type === "QB_DECISION" && tickOfEvent(e) === tick);
          expect(decided.map((e) => (e.event.payload as { choice: string }).choice), `d23only-${fixture}-${i} t${tick}`).toEqual([
            expect.stringMatching(/^(HOLD|THROWAWAY)$/),
          ]);
        });
      }
    }
    expect(empty).toBeGreaterThan(20);
  });
});
