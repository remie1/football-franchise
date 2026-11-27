/**
 * ADR-089 step 5a, D26 AND THE CLEAN EXPIRY (plan §2.1 rows "D26" and "g"; AM-9 `cleanExpiry`).
 *
 * 1. `mustDecideNow`: today's `forced`; the count part (count or reads spent) only at or past the
 *    drop floor; with no floor, today's expression.
 * 2. `cleanExpiry`: fires on the count and on the reads; never when forced, never out of the pocket,
 *    never before the floor, never at PRESSURE or worse (item g), never on a tick that ran an arrival
 *    contest (contracts-guardian C2: the published status, not a rebuilt one).
 * 3. In play: every `:clean` die falls on a tick the predicate held, whose published status is
 *    CLEAN, with no `:movement` CHECK and no arrival contest on it, at or past the floor; expiries
 *    by the count and by the reads both occur.
 * 4. A CONCEPT play whose two reads are spent before its 1.0 s floor holds to the floor, drawing no
 *    checkdown die and no `:clean` die before it.
 * 5. No clean HOLD and no in-pocket clean throwaway (R-3's S-3 at the engine's reach): on a held
 *    tick there is no THROWAWAY, and a HOLD is a CONTAINED escape's own.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/cleanPocket.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/cleanPocket.js")>();
  return { ...real, mustDecideNow: vi.fn(real.mustDecideNow), cleanExpiry: vi.fn(real.cleanExpiry) };
});

import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { cleanExpiry, mustDecideNow } from "../src/sim/cleanPocket.js";
import type { CleanExpiryFacts, MustDecideFacts } from "../src/sim/cleanPocket.js";
import { buildCleanPocketScenario, baseReceivers } from "./fixtures.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5S_TUNABLES, S5_TUNABLES, checkOf, cleanPicksOf, floorOfPlay, onCleanBench, tickOfEvent } from "./step5Fixtures.js";

const mustSpy = vi.mocked(mustDecideNow);
const cleanSpy = vi.mocked(cleanExpiry);

afterEach(() => {
  mustSpy.mockClear();
  cleanSpy.mockClear();
});

const facts = (over: Partial<MustDecideFacts>): MustDecideFacts => ({
  forced: false, tick: 2.0, budgetSeconds: 3.0, readsUsed: 1, maxReads: 3, floorSeconds: 1.0, ...over,
});
const clean = (over: Partial<CleanExpiryFacts>): CleanExpiryFacts => ({
  mustDecide: true, forced: false, scrambling: false, publishedStatus: "CLEAN", contested: false, ...over,
});

describe("ADR-089 step 5a: mustDecideNow (D26)", () => {
  it("forced is today's, at any tick", () => {
    expect(mustDecideNow(facts({ forced: true, tick: 0.5 }))).toBe(true);
  });
  it("the count part: a spent count or a spent read list, at or past the floor", () => {
    expect(mustDecideNow(facts({ tick: 3.0 }))).toBe(true);
    expect(mustDecideNow(facts({ readsUsed: 3 }))).toBe(true);
    expect(mustDecideNow(facts({}))).toBe(false);
    expect(mustDecideNow(facts({ tick: 0.5, budgetSeconds: 0.5, readsUsed: 3 }))).toBe(false);
    expect(mustDecideNow(facts({ tick: 1.0, budgetSeconds: 0.5, readsUsed: 3 }))).toBe(true);
  });
  it("with no floor (0) it is today's expression", () => {
    for (const tick of [0.5, 1.0, 2.5]) {
      for (const readsUsed of [0, 2, 3]) {
        for (const forced of [false, true]) {
          const f = facts({ tick, readsUsed, forced, floorSeconds: 0 });
          expect(mustDecideNow(f)).toBe(f.forced || f.tick >= f.budgetSeconds || f.readsUsed >= f.maxReads);
        }
      }
    }
  });
});

describe("ADR-089 step 5a: cleanExpiry (item g; contracts-guardian C2)", () => {
  it("fires when he must decide by the count part on a CLEAN tick", () => {
    expect(cleanExpiry(clean({}))).toBe(true);
  });
  it("never when forced, out of the pocket, without must-decide, contested, or at PRESSURE or worse", () => {
    expect(cleanExpiry(clean({ forced: true }))).toBe(false);
    expect(cleanExpiry(clean({ scrambling: true }))).toBe(false);
    expect(cleanExpiry(clean({ mustDecide: false }))).toBe(false);
    expect(cleanExpiry(clean({ contested: true }))).toBe(false);
    expect(cleanExpiry(clean({ publishedStatus: undefined }))).toBe(false);
    for (const status of ["PRESSURE", "COLLAPSING", "IMMEDIATE"] as const) expect(cleanExpiry(clean({ publishedStatus: status }))).toBe(false);
  });
});

/** Every tick at which `cleanExpiry` answered true in the plays just run, with that tick's `mustDecideNow` facts. */
function expiriesSinceClear(): { readonly tick: number; readonly facts: MustDecideFacts }[] {
  const out: { tick: number; facts: MustDecideFacts }[] = [];
  const must = mustSpy.mock.calls.map((c, n) => ({ facts: c[0], order: mustSpy.mock.invocationCallOrder[n] ?? 0 }));
  cleanSpy.mock.results.forEach((r, n) => {
    if (r.type !== "return" || r.value !== true) return;
    const order = cleanSpy.mock.invocationCallOrder[n] ?? 0;
    const last = [...must].reverse().find((m) => m.order < order);
    if (last === undefined) throw new Error("a clean expiry with no mustDecideNow before it");
    out.push({ tick: last.facts.tick, facts: last.facts });
  });
  return out;
}

describe("ADR-089 step 5a: the clean expiry in play", () => {
  it("every :clean die falls on a held tick: published CLEAN, no :movement, no contest, at or past the floor; count and reads both start it", () => {
    let picks = 0;
    let byCount = 0;
    let byReads = 0;
    for (const [tunables, picture] of [[S5_TUNABLES, true], [S5S_TUNABLES, false], [onCleanBench(S5S_TUNABLES), false]] as const) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 50; i++) {
          mustSpy.mockClear();
          cleanSpy.mockClear();
          const { state, calls } = build();
          const { events } = simulatePassPlay(state, picture ? withPicture(state, calls) : calls, `expiry-${fixture}-${i}`, tunables);
          const held = expiriesSinceClear();
          const heldTicks = new Set(held.map((h) => h.tick));
          const floor = floorOfPlay(events);
          for (const h of held) {
            expect(h.tick).toBeGreaterThanOrEqual(floor);
            expect(h.facts.forced).toBe(false);
            // No clean HOLD and no in-pocket clean throwaway (S-3): a HOLD on a held tick is a
            // CONTAINED escape's own.
            const onTick = events.filter((e) => tickOfEvent(e) === h.tick);
            expect(onTick.filter((e) => e.event.type === "THROWAWAY"), `expiry-${fixture}-${i} t${h.tick}`).toEqual([]);
            if (onTick.some((e) => e.event.type === "QB_DECISION" && (e.event.payload as { choice: string }).choice === "HOLD")) {
              expect(onTick.some((e) => checkOf(e)?.checkKind === "scramble" && checkOf(e)?.band === "CONTAINED"), `expiry-${fixture}-${i} t${h.tick}`).toBe(true);
            }
            if (h.facts.readsUsed >= h.facts.maxReads && h.tick < h.facts.budgetSeconds) byReads += 1;
            if (h.facts.readsUsed < h.facts.maxReads && h.tick >= h.facts.budgetSeconds) byCount += 1;
          }
          for (const p of cleanPicksOf(events)) {
            picks += 1;
            const tick = tickOfEvent(p) ?? -1;
            expect(heldTicks.has(tick), `expiry-${fixture}-${i} t${tick}`).toBe(true);
            const sameTick = events.filter((e) => tickOfEvent(e) === tick);
            const status = sameTick.find((e) => e.event.type === "POCKET_STATUS");
            expect((status?.event.payload as { status: string } | undefined)?.status).toBe("CLEAN");
            expect(sameTick.filter((e) => (checkOf(e)?.roll?.rngLabel ?? "").endsWith(":movement"))).toEqual([]);
            expect(sameTick.filter((e) => checkOf(e)?.checkKind === "arrival_contest")).toEqual([]);
            expect(sameTick.filter((e) => (checkOf(e)?.roll?.rngLabel ?? "").endsWith(":clean")).length).toBe(1);
          }
        }
      }
    }
    expect(picks).toBeGreaterThan(300);
    expect(byCount).toBeGreaterThan(20);
    expect(byReads).toBeGreaterThan(20);
  });

  it("a CONCEPT play whose reads are spent before its 1.0 s floor holds to the floor: no checkdown die and no :clean die before it", () => {
    let early = 0;
    for (let i = 0; i < 120; i++) {
      mustSpy.mockClear();
      cleanSpy.mockClear();
      const base = buildCleanPocketScenario();
      // Two QUICK reads (the second turned into a 4-yard QUICK route), so both can be read on the
      // first tick: the concept's whole list is spent at 0.5 s, before its 1.0 s floor.
      const { quick, intermediate } = baseReceivers(base);
      const order = [quick, intermediate, ...base.calls.offense.readOrder.filter((r) => r !== quick && r !== intermediate)];
      const routes = base.calls.offense.routes.map((r) => (r.receiver === intermediate ? { ...r, depthClass: "QUICK" as const, airYards: 4 } : r));
      const calls = { ...base.calls, offense: { ...base.calls.offense, readSystem: "CONCEPT" as const, readOrder: order, routes } };
      const { events } = simulatePassPlay(base.state, calls, `concept-floor-${i}`, onCleanBench(S5S_TUNABLES));
      expect(floorOfPlay(events)).toBe(1.0);
      const spentEarly = mustSpy.mock.calls.map((c) => c[0]).filter((f) => f.tick < 1.0 && f.readsUsed >= f.maxReads);
      if (spentEarly.length === 0) continue;
      early += 1;
      for (const f of spentEarly) expect(mustDecideNow(f)).toBe(false);
      const before = (e: MatchEventEnvelope): boolean => (tickOfEvent(e) ?? 0) < 1.0;
      const labels = events.filter(before).flatMap((e) => {
        const c = checkOf(e);
        if (c?.roll !== undefined) return [c.roll.rngLabel];
        if (e.event.type === "QB_READ") return [(e.event.payload as { varianceRoll: { rngLabel: string } }).varianceRoll.rngLabel];
        return [];
      });
      expect(labels.filter((l) => /:checkdown:|:clean$|:decision\//.test(l))).toEqual([]);
      // The tick his reads ran out on is a floor wait: a HOLD.
      const firstSpent = spentEarly[0]?.tick ?? 0;
      const decisions = events.filter((e) => e.event.type === "QB_DECISION" && tickOfEvent(e) === firstSpent);
      expect(decisions.map((e) => (e.event.payload as { choice: string }).choice)).toEqual(["HOLD"]);
    }
    expect(early).toBeGreaterThan(20);
  });
});
