/**
 * ADR-089 step 5a, ITEM d (D25, D33; plan §2.1 row d): THE CLEAN MOVE.
 *
 * 1. MOVE is today's climb in full: after its CHECK, a clean climb publishes what a forced one
 *    does (`QB_DECISION` STEP_UP, then a DELAYED `RUSH_THREAT` for each live EDGE threat).
 * 2. His reads restart at the first read; the play-scoped `r<n>` counter keeps counting
 *    (contracts-guardian C8).
 * 3. His count restarts: the next expiry on the count is 1.5 s after the move tick (one tick step
 *    and the 1.0 s reset); a CONCEPT play's second clean expiry comes by its reads one tick later.
 * 4. MOVE is offered once a play: a second clean expiry offers ESCAPE only.
 * 5. The bump (`bumpFor`): TRAILING +10, EVEN +5, IN_FRONT none, nothing before the break; in play
 *    it moves a read's openness by 0, 5 or 10 (the clamp), and it never writes `contestPosition`
 *    (a setter spy on every bumped track counts 0 writes); the coverage CHECKs are the same with the
 *    bump on and off.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

/** Writes to `contestPosition` on a bumped track, counted by a setter the bump spy installs. */
const contestWrites = { count: 0 };

vi.mock("../src/sim/cleanPocket.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/cleanPocket.js")>();
  return {
    ...real,
    mustDecideNow: vi.fn(real.mustDecideNow),
    cleanExpiry: vi.fn(real.cleanExpiry),
    resolveCleanPick: vi.fn(real.resolveCleanPick),
    bumpFor: vi.fn((tunables: Parameters<typeof real.bumpFor>[0], track: Parameters<typeof real.bumpFor>[1], tick: number) => {
      const bump = real.bumpFor(tunables, track, tick);
      if (bump !== undefined) {
        let value = track.contestPosition;
        Object.defineProperty(track, "contestPosition", {
          configurable: true,
          enumerable: true,
          get: () => value,
          set: (v: typeof value) => {
            contestWrites.count += 1;
            value = v;
          },
        });
      }
      return bump;
    }),
  };
});

import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { bumpFor, mustDecideNow, resolveCleanPick } from "../src/sim/cleanPocket.js";
import { TUNABLES } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { buildCleanPocketScenario, baseReceivers } from "./fixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5S_TUNABLES, S5_TUNABLES, checkOf, cleanParts, cleanPicksOf, onCleanBench, tickOfEvent, withCleanPocket } from "./step5Fixtures.js";

const mustSpy = vi.mocked(mustDecideNow);
const pickSpy = vi.mocked(resolveCleanPick);
const bumpSpy = vi.mocked(bumpFor);

function clearSpies(): void {
  mustSpy.mockClear();
  pickSpy.mockClear();
  bumpSpy.mockClear();
  contestWrites.count = 0;
}
afterEach(clearSpies);

type Run = { readonly tunables: Tunables; readonly picture: boolean };
const RUNS: readonly Run[] = [
  { tunables: S5_TUNABLES, picture: true },
  { tunables: S5S_TUNABLES, picture: false },
  { tunables: onCleanBench(S5S_TUNABLES), picture: false },
];

function play(run: Run, build: () => { state: Parameters<typeof simulatePassPlay>[0]; calls: Parameters<typeof simulatePassPlay>[1] }, seed: string): readonly MatchEventEnvelope[] {
  const { state, calls } = build();
  return simulatePassPlay(state, run.picture ? withPicture(state, calls) : calls, seed, run.tunables).events;
}

/** The ticks of a stream's clean MOVEs (a `:clean` CHECK followed on its tick by QB_DECISION STEP_UP). */
function cleanMoveTicks(events: readonly MatchEventEnvelope[]): number[] {
  return cleanPicksOf(events)
    .map((e) => tickOfEvent(e) ?? -1)
    .filter((t) => events.some((e) => tickOfEvent(e) === t && e.event.type === "QB_DECISION" && (e.event.payload as { choice: string }).choice === "STEP_UP"));
}

/** The events a STEP_UP's movement CHECK is followed by on its own tick, as type:detail strings. */
function afterCheck(events: readonly MatchEventEnvelope[], n: number): string[] {
  const tick = tickOfEvent(events[n] as MatchEventEnvelope);
  return events
    .slice(n + 1)
    .filter((e) => tickOfEvent(e) === tick)
    .map((e) => {
      if (e.event.type === "QB_DECISION") return `QB_DECISION:${(e.event.payload as { choice: string }).choice}`;
      if (e.event.type === "RUSH_THREAT") {
        const p = e.event.payload as { alignment: string; state: string };
        return `RUSH_THREAT:${p.alignment}:${p.state}`;
      }
      return e.event.type;
    });
}

const SHAPE = /^QB_DECISION:STEP_UP( RUSH_THREAT:EDGE:DELAYED( RUSH_THREAT:EDGE:\w+)?)*$/;

describe("ADR-089 step 5a: the clean move is today's climb", () => {
  it("after its CHECK a clean climb publishes what a forced one does", () => {
    const seen = { clean: 0, cleanDelayed: 0, forced: 0 };
    for (const run of RUNS) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 40; i++) {
          const events = play(run, build, `climb-${fixture}-${i}`);
          events.forEach((e, n) => {
            const c = checkOf(e);
            if (c?.checkKind !== "pocket_movement") return;
            const after = afterCheck(events, n);
            if (after[0] !== "QB_DECISION:STEP_UP") return;
            expect(after.join(" "), `climb-${fixture}-${i}`).toMatch(SHAPE);
            if ((c.roll?.rngLabel ?? "").endsWith(":clean")) {
              seen.clean += 1;
              if (after.length > 1) seen.cleanDelayed += 1;
            } else seen.forced += 1;
          });
        }
      }
    }
    expect(seen.clean).toBeGreaterThan(100);
    expect(seen.cleanDelayed).toBeGreaterThan(0);
    expect(seen.forced).toBeGreaterThan(0);
  });
});

describe("ADR-089 step 5a: the restart and the reset (D33, C8)", () => {
  it("after a clean move his next progression read is the first read, the r<n> counter keeps counting, and his count is the move tick plus 1.5 s", () => {
    let moves = 0;
    let byCount = 0;
    for (const run of RUNS) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 40; i++) {
          clearSpies();
          const events = play(run, build, `restart-${fixture}-${i}`);
          const [move] = cleanMoveTicks(events);
          if (move === undefined) continue;
          moves += 1;
          const start = events.find((e) => e.event.type === "PLAY_START");
          const first = (start?.event.payload as { offense: { readOrder: string[] } }).offense.readOrder[0];
          const reads = events
            .filter((e) => e.event.type === "QB_READ")
            .map((e) => ({ tick: tickOfEvent(e) ?? -1, label: (e.event.payload as { varianceRoll: { rngLabel: string } }).varianceRoll.rngLabel, target: String((e.event.payload as { target: string }).target) }))
            .map((r) => ({ ...r, n: Number(/:r(\d+):/.exec(r.label)?.[1] ?? Number.NaN) }))
            .filter((r) => !Number.isNaN(r.n));
          const before = reads.filter((r) => r.tick <= move);
          const next = reads.find((r) => r.tick > move);
          if (next !== undefined) {
            expect(next.target, `restart-${fixture}-${i}`).toBe(first);
            expect(next.n).toBe((before[before.length - 1]?.n ?? 0) + 1);
          }
          const reset = Number((move + 1.5).toFixed(1));
          const after = mustSpy.mock.calls.map((c) => c[0]).filter((f) => f.tick > move);
          for (const f of after) expect(f.budgetSeconds).toBe(reset);
          // The next clean pick, when it comes by the count, comes at the reset.
          const second = cleanPicksOf(events).map((e) => tickOfEvent(e) ?? -1).find((t) => t > move);
          const facts = after.find((f) => f.tick === second);
          if (second !== undefined && facts !== undefined && facts.readsUsed < facts.maxReads) {
            byCount += 1;
            expect(second).toBe(reset);
          }
        }
      }
    }
    expect(moves).toBeGreaterThan(100);
    expect(byCount).toBeGreaterThan(10);
  });

  it("a CONCEPT play's second clean expiry comes by its reads one tick after the move, and offers ESCAPE only", () => {
    let seen = 0;
    for (let i = 0; i < 400; i++) {
      clearSpies();
      const base = buildCleanPocketScenario();
      const { quick, intermediate } = baseReceivers(base);
      const order = [quick, intermediate, ...base.calls.offense.readOrder.filter((r) => r !== quick && r !== intermediate)];
      const calls = { ...base.calls, offense: { ...base.calls.offense, readSystem: "CONCEPT" as const, readOrder: order } };
      const { events } = simulatePassPlay(base.state, calls, `concept-move-${i}`, onCleanBench(S5S_TUNABLES));
      const [move] = cleanMoveTicks(events);
      if (move === undefined) continue;
      const picks = cleanPicksOf(events).map((e) => tickOfEvent(e) ?? -1);
      const second = picks.find((t) => t > move);
      if (second === undefined) continue;
      const facts = mustSpy.mock.calls.map((c) => c[0]).find((f) => f.tick === second);
      if (facts === undefined || facts.readsUsed < facts.maxReads) continue;
      seen += 1;
      expect(second).toBe(Number((move + 0.5).toFixed(1)));
      // The second pick's arguments: MOVE no longer offered.
      const args = pickSpy.mock.calls.map((c) => c[0]).filter((a) => a.tick === second);
      expect(args.map((a) => a.moveOffered)).toEqual([false]);
    }
    expect(seen).toBeGreaterThan(20);
  });

  it("MOVE is offered once a play: never two clean STEP_UPs, and every pick after a clean move offers ESCAPE only", () => {
    let after = 0;
    for (const run of RUNS) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 40; i++) {
          clearSpies();
          const events = play(run, build, `once-${fixture}-${i}`);
          const moves = cleanMoveTicks(events);
          expect(moves.length).toBeLessThanOrEqual(1);
          const [move] = moves;
          if (move === undefined) continue;
          for (const a of pickSpy.mock.calls.map((c) => c[0]).filter((x) => x.tick > move)) {
            after += 1;
            expect(a.moveOffered).toBe(false);
            expect(a.escapeOffered).toBe(true);
          }
        }
      }
    }
    expect(after).toBeGreaterThan(50);
  });
});

describe("ADR-089 step 5a: the window bump (D25)", () => {
  const track = (contestPosition: "TRAILING" | "EVEN" | "IN_FRONT", baseOpenness: number | undefined, readySeconds: number) => ({
    contestPosition,
    baseOpenness,
    readySeconds,
  });

  it("TRAILING +10, EVEN +5, IN_FRONT none; nothing before the break or before the route's rep resolved", () => {
    expect(bumpFor(TUNABLES, track("TRAILING", 40, 1.5), 2.0)).toBe(10);
    expect(bumpFor(TUNABLES, track("EVEN", 40, 1.5), 2.0)).toBe(5);
    expect(bumpFor(TUNABLES, track("IN_FRONT", 40, 1.5), 2.0)).toBeUndefined();
    expect(bumpFor(TUNABLES, track("TRAILING", 40, 2.5), 2.0)).toBeUndefined();
    expect(bumpFor(TUNABLES, track("TRAILING", undefined, 1.5), 2.0)).toBeUndefined();
    expect(bumpFor(TUNABLES, track("TRAILING", 40, 2.0), 2.0)).toBe(10);
  });

  it("in play the bump moves a read by 0, 5 or 10 and never writes contestPosition; coverage CHECKs are unchanged", () => {
    const noBump = (t: Tunables): Tunables => withCleanPocket(t, cleanParts({ bump: false }));
    let compared = 0;
    let moved = 0;
    let bumped = 0;
    for (const run of RUNS) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 100; i++) {
          clearSpies();
          const on = play(run, build, `bump-${fixture}-${i}`);
          // Each bumped receiver and his bump (the spy is handed the play's own track).
          const given = new Map<string, number>();
          bumpSpy.mock.results.forEach((r, n) => {
            if (r.type !== "return" || r.value === undefined) return;
            const t = bumpSpy.mock.calls[n]?.[1] as unknown as { assignment: { receiver: string } };
            given.set(String(t.assignment.receiver), r.value as number);
          });
          bumped += given.size;
          expect(contestWrites.count, `bump-${fixture}-${i}`).toBe(0);
          const [move] = cleanMoveTicks(on);
          if (move === undefined) continue;
          clearSpies();
          const off = play({ ...run, tunables: noBump(run.tunables) }, build, `bump-${fixture}-${i}`);
          expect(bumpSpy).not.toHaveBeenCalled();
          // The first read after the move: the same die, so the openness differs by the bump alone.
          const firstAfter = (events: readonly MatchEventEnvelope[]) =>
            events.find((e) => e.event.type === "QB_READ" && (tickOfEvent(e) ?? -1) > move);
          const a = firstAfter(on);
          const b = firstAfter(off);
          if (a !== undefined && b !== undefined) {
            const pa = a.event.payload as { target: string; actualOpenness: number; varianceRoll: { rngLabel: string } };
            const pb = b.event.payload as { target: string; actualOpenness: number; varianceRoll: { rngLabel: string } };
            expect(pa.varianceRoll.rngLabel).toBe(pb.varianceRoll.rngLabel);
            expect(pa.target).toBe(pb.target);
            // The bump, or less when the clamp takes some of it; nothing for a man not bumped.
            const diff = pa.actualOpenness - pb.actualOpenness;
            expect(diff, `bump-${fixture}-${i}`).toBeGreaterThanOrEqual(0);
            expect(diff, `bump-${fixture}-${i}`).toBeLessThanOrEqual(given.get(pa.target) ?? 0);
            compared += 1;
            if (diff > 0) moved += 1;
          }
          // Coverage CHECKs on ticks both plays reached are the same: the bump writes openness only.
          const last = Math.min(tickOfEvent(on[on.length - 1] as MatchEventEnvelope) ?? 0, tickOfEvent(off[off.length - 1] as MatchEventEnvelope) ?? 0);
          const coverage = (events: readonly MatchEventEnvelope[]) =>
            events
              .filter((e) => (tickOfEvent(e) ?? 0) < last && /coverage|release/.test(checkOf(e)?.checkKind ?? ""))
              .map((e) => JSON.stringify(e.event));
          expect(coverage(on)).toEqual(coverage(off));
        }
      }
    }
    expect(bumped).toBeGreaterThan(10);
    expect(compared).toBeGreaterThan(100);
    expect(moved).toBeGreaterThan(3);
  });
});
