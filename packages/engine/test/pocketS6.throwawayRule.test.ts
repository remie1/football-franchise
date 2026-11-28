/**
 * ADR-089 step 6, PART 2.1 (step-6 plan §2.1; AM-13 `throwawayRule`): THE REAL THROWAWAY RULE.
 *
 * 1. The helper's table (`throwawayLegalInPocket`, exported for step 7): legal at or past the drop
 *    floor on a tick on which a route has reached its break. A QUICK route at 1.0 s, a DEEP one only
 *    from 2.5 s, nothing before the floor, a screen's play (no floor) from its first break, a jammed
 *    route from its later ready time, an anticipated route not before its ready time.
 * 2. In play under the rule (s5a with the throwaway rule alone, on D1's shape, S and L): every
 *    in-pocket throwaway comes on a tick at or past the floor on which the rule held, and none on a
 *    tick that ran an arrival contest (a throwaway with a hand on him is step 7's contact choice;
 *    S-15). Some come before 2.0 s, and some ticks at or past 2.0 s refuse one.
 * 3. The rule never reads the old gate: moving `qb.throwawayEarliestSeconds` moves no stream under
 *    the rule, and moves some under s5a.
 * 4. The old gate stands without the rule: under legacy and s5a no throwaway comes before 2.0 s, and
 *    s5a with the all-off block plays the s5a stream.
 * 5. P10 before the lift: under the rule, and under the deadline pick alone, every in-pocket
 *    throwaway records `outsideTackleBox` false at its THROWAWAY's seq, which the stream does not
 *    carry; under a block with neither, none is recorded. On every one the flag equals
 *    `cause === "OUT_OF_POCKET"` (S-15, contracts-guardian's condition on P10). Under the deadline
 *    pick (2.11) a throwaway after an escape is a whole OUT_OF_POCKET record, its flag true in its
 *    payload, never on the stream; under the rule alone there is no other record.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sim/outs.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/outs.js")>();
  return { ...real, throwawayLegalInPocket: vi.fn(real.throwawayLegalInPocket) };
});

import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { throwawayLegalInPocket } from "../src/sim/outs.js";
import type { BreakTrack } from "../src/sim/outs.js";
import { DEFAULT_TUNABLES, applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, checkOf, floorOfPlay, tickOfEvent } from "./step5Fixtures.js";
import { OUTS_OFF, outsParts, playS6, withOuts } from "./step6Fixtures.js";

const ruleSpy = vi.mocked(throwawayLegalInPocket);
afterEach(() => ruleSpy.mockClear());

/** The three s5a shapes, each with the picture it needs. */
const SHAPES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
];

const RULE = outsParts({ throwawayRule: true });
const SEEDS = 40;

const throwawaysOf = (events: readonly MatchEventEnvelope[]) =>
  events.flatMap((e) => (e.event.type === "THROWAWAY" ? [{ seq: e.seq, tick: tickOfEvent(e) ?? -1, cause: e.event.payload.cause, payload: e.event.payload }] : []));

const contestTicksOf = (events: readonly MatchEventEnvelope[]): Set<number> =>
  new Set(events.filter((e) => checkOf(e)?.checkKind === "arrival_contest").map((e) => tickOfEvent(e) ?? -1));

function each(fn: (name: string, base: Tunables, picture: boolean, fixture: string, i: number, scenario: ReturnType<(typeof PASS_FIXTURES)[number][1]>) => void): void {
  for (const { name, base, picture } of SHAPES) {
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < SEEDS; i++) fn(name, base, picture, fixture, i, build());
    }
  }
}

const routeAt = (readySeconds: number, resolved: boolean): BreakTrack => ({ baseOpenness: resolved ? 40 : undefined, readySeconds });

describe("ADR-089 step 6, 2.1: the helper's table", () => {
  const ready = S5_TUNABLES.route.readySeconds;
  it("reads today's ready times: QUICK 1.0, SHORT 1.5, INTERMEDIATE 2.0, DEEP 2.5 s", () => {
    expect(ready).toEqual({ QUICK: 1.0, SHORT: 1.5, INTERMEDIATE: 2.0, DEEP: 2.5 });
  });

  it("legal and illegal by position and time", () => {
    const quick = routeAt(ready.QUICK, true);
    const deep = routeAt(ready.DEEP, true);
    const cases: readonly [string, number, number, readonly BreakTrack[], boolean][] = [
      ["a QUICK route at its break at 1.0 s, floor 1.0", 1.0, 1.0, [quick], true],
      ["a QUICK route before its ready time", 0.5, 0, [routeAt(ready.QUICK, false)], false],
      ["a DEEP route alone at 2.0 s", 2.0, 2.0, [routeAt(ready.DEEP, false)], false],
      ["a DEEP route at 2.5 s", 2.5, 2.0, [deep], true],
      ["a QUICK route at its break, before the floor (2.0)", 1.5, 2.0, [quick], false],
      ["the same route at the floor", 2.0, 2.0, [quick], true],
      ["a screen's play (no floor) at its first break", 1.0, 0, [quick], true],
      ["a jammed QUICK route (ready 1.5) at 1.0 s", 1.0, 0, [routeAt(1.5, false)], false],
      ["an anticipated route (resolved, before its ready time)", 1.5, 0, [routeAt(ready.INTERMEDIATE, true)], false],
      ["one route at its break among routes still running", 2.0, 1.0, [routeAt(ready.DEEP, false), routeAt(ready.SHORT, true)], true],
      ["no routes", 3.0, 0, [], false],
    ];
    for (const [what, tick, floorSeconds, tracks, legal] of cases) {
      expect(throwawayLegalInPocket({ tick, floorSeconds, tracks }), what).toBe(legal);
    }
  });
});

describe("ADR-089 step 6, 2.1: the rule in play", () => {
  it("every in-pocket throwaway is at or past the floor on a tick the rule held, and none on a contest's tick", () => {
    const n = { throwaways: 0, early: 0, refusedLate: 0, contestTicksRead: 0 };
    each((name, base, picture, fixture, i, { state, calls }) => {
      ruleSpy.mockClear();
      const seed = `s6-rule-${fixture}-${i}`;
      const { events } = playS6(state, picture ? withPicture(state, calls) : calls, seed, withOuts(base, RULE));
      const held = new Map<number, boolean>();
      ruleSpy.mock.calls.forEach(([facts], k) => {
        const result = ruleSpy.mock.results[k];
        if (result?.type !== "return") throw new Error("the rule threw");
        held.set(facts.tick, (held.get(facts.tick) ?? false) || result.value);
        if (facts.tick >= 2.0 && !result.value) n.refusedLate += 1;
      });
      const floor = floorOfPlay(events);
      const contested = contestTicksOf(events);
      for (const t of contested) if (held.has(t)) n.contestTicksRead += 1;
      for (const t of throwawaysOf(events)) {
        n.throwaways += 1;
        if (t.tick < 2.0) n.early += 1;
        expect(t.tick, `${name} ${seed}`).toBeGreaterThanOrEqual(floor);
        expect(held.get(t.tick), `${name} ${seed} at ${t.tick}`).toBe(true);
        expect(contested.has(t.tick), `${name} ${seed} at ${t.tick}`).toBe(false);
      }
    });
    expect(n.throwaways).toBeGreaterThan(40);
    // QUICK routes are ready at 1.0 s, so the rule allows some throwaways earlier than the old gate,
    expect(n.early).toBeGreaterThan(0);
    // and refuses others later (no route at its break at or past 2.0 s).
    expect(n.refusedLate).toBeGreaterThan(0);
    // The contest's tick was read by the rule and still refused (the hand on him).
    expect(n.contestTicksRead).toBeGreaterThan(0);
  });

  it("without the rule a throwaway can follow a shed on its tick (what the rule's contest clause withholds)", () => {
    let afterContest = 0;
    each((_name, base, picture, fixture, i, { state, calls }) => {
      const { events } = simulatePassPlay(state, picture ? withPicture(state, calls) : calls, `s6-rule-${fixture}-${i}`, base);
      const contested = contestTicksOf(events);
      for (const t of throwawaysOf(events)) if (contested.has(t.tick)) afterContest += 1;
    });
    expect(afterContest).toBeGreaterThan(0);
  });

  it("never reads the old gate: moving throwawayEarliestSeconds moves no stream under the rule and some under s5a", () => {
    const gate = (t: Tunables, seconds: number): Tunables =>
      applyTunablePatch(t, {
        tunableId: "qb.throwawayEarliestSeconds",
        currentValue: t.qb.throwawayEarliestSeconds,
        proposedValue: seconds,
        evidence: "2.1 test",
        expectedEffect: "none under the rule",
      });
    let s5aMoved = 0;
    for (const { name, base, picture } of SHAPES) {
      for (const [fixture, build] of PASS_FIXTURES) {
        for (let i = 0; i < 15; i++) {
          const seed = `s6-gate-${fixture}-${i}`;
          const play = (t: Tunables) => {
            const { state, calls } = build();
            return JSON.stringify(playS6(state, picture ? withPicture(state, calls) : calls, seed, t).events);
          };
          const ruled = play(withOuts(base, RULE));
          expect(play(withOuts(gate(base, 0.5), RULE)), `${name} ${seed}`).toBe(ruled);
          expect(play(withOuts(gate(base, 5.0), RULE)), `${name} ${seed}`).toBe(ruled);
          const { state, calls } = build();
          const c = picture ? withPicture(state, calls) : calls;
          if (JSON.stringify(simulatePassPlay(state, c, seed, gate(base, 5.0)).events) !== JSON.stringify(simulatePassPlay(state, c, seed, base).events)) s5aMoved += 1;
        }
      }
    }
    expect(s5aMoved).toBeGreaterThan(0);
  });
});

describe("ADR-089 step 6, 2.1: the old gate stands without the rule", () => {
  it("under legacy and s5a no throwaway comes before 2.0 s, and none reads the rule", () => {
    let throwaways = 0;
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < SEEDS; i++) {
        const { state, calls } = build();
        for (const t of throwawaysOf(simulatePassPlay(state, calls, `s6-old-${fixture}-${i}`, DEFAULT_TUNABLES).events)) {
          throwaways += 1;
          expect(t.tick).toBeGreaterThanOrEqual(DEFAULT_TUNABLES.qb.throwawayEarliestSeconds);
        }
      }
    }
    each((name, base, picture, fixture, i, { state, calls }) => {
      for (const t of throwawaysOf(simulatePassPlay(state, picture ? withPicture(state, calls) : calls, `s6-old-${fixture}-${i}`, base).events)) {
        throwaways += 1;
        expect(t.tick, name).toBeGreaterThanOrEqual(base.qb.throwawayEarliestSeconds);
      }
    });
    expect(throwaways).toBeGreaterThan(100);
    expect(ruleSpy).not.toHaveBeenCalled();
  });

  it("s5a with the all-off block (same stamp) plays the s5a stream, and reads no rule", () => {
    each((name, base, picture, fixture, i, { state, calls }) => {
      const c = picture ? withPicture(state, calls) : calls;
      const seed = `s6-off-${fixture}-${i}`;
      const off = playS6(state, c, seed, withOuts(base, OUTS_OFF));
      expect(JSON.stringify(off.events), `${name} ${seed}`).toBe(JSON.stringify(simulatePassPlay(state, c, seed, base).events));
      expect(off.records, `${name} ${seed}`).toEqual([]);
    });
    expect(ruleSpy).not.toHaveBeenCalled();
  });
});

describe("ADR-089 step 6, 2.1: THROWAWAY.outsideTackleBox before the lift (P10)", () => {
  it("false at every in-pocket throwaway's seq under the rule and under the deadline pick alone; the stream carries no flag", () => {
    const counted: Record<string, number> = {};
    for (const [arm, block] of [["the rule", RULE], ["the deadline pick alone", outsParts({ deadlinePick: { runMargin: 1 } })]] as const) {
      each((name, base, picture, fixture, i, { state, calls }) => {
        const seed = `s6-p10-${fixture}-${i}`;
        const { events, records } = playS6(state, picture ? withPicture(state, calls) : calls, seed, withOuts(base, block));
        const flags = records.flatMap((r) => (r.kind === "outsideTackleBox" ? [r] : []));
        const thrown = throwawaysOf(events);
        expect(flags.map((f) => f.at.seq), `${arm} ${name} ${seed}`).toEqual(thrown.map((t) => t.seq));
        for (const [k, f] of flags.entries()) {
          const t = thrown[k];
          if (t === undefined) throw new Error("a flag with no throwaway");
          // S-15: the flag equals cause === OUT_OF_POCKET on every throwaway of the play.
          expect(f.value, `${arm} ${seed}`).toBe(String(t.cause) === "OUT_OF_POCKET");
          expect(f.at.tick).toBe(t.tick);
          expect("outsideTackleBox" in t.payload, `${arm} ${seed}`).toBe(false);
          counted[arm] = (counted[arm] ?? 0) + 1;
        }
        // No other record but 2.11's: under the deadline pick a throwaway after an escape is a whole
        // OUT_OF_POCKET record (P9), its flag true in its payload (P10), and the stream carries none.
        const others = records.filter((r) => r.kind !== "outsideTackleBox");
        for (const r of others) {
          if (r.kind !== "outOfPocketThrowaway") throw new Error(`${arm} ${seed}: a ${r.kind} record`);
          expect(r.payload.cause, `${arm} ${seed}`).toBe("OUT_OF_POCKET");
          expect(r.payload.outsideTackleBox, `${arm} ${seed}`).toBe(true);
          counted[`${arm}, out of the pocket`] = (counted[`${arm}, out of the pocket`] ?? 0) + 1;
        }
        if (arm === "the rule") expect(others, `${arm} ${seed}`).toEqual([]);
        expect(thrown.filter((t) => String(t.cause) === "OUT_OF_POCKET"), `${arm} ${seed}`).toEqual([]);
      });
    }
    expect(counted["the rule"]).toBeGreaterThan(30);
    expect(counted["the deadline pick alone"]).toBeGreaterThan(30);
    expect(counted["the deadline pick alone, out of the pocket"]).toBeGreaterThan(0);
  });

  it("a block with neither part writes no flag", () => {
    for (const block of [OUTS_OFF, outsParts({ noLateHorizonSack: true, failedScrambleSack: true })]) {
      each((name, base, picture, fixture, i, { state, calls }) => {
        if (i >= 10) return;
        const { records } = playS6(state, picture ? withPicture(state, calls) : calls, `s6-noflag-${fixture}-${i}`, withOuts(base, block));
        expect(records.filter((r) => r.kind === "outsideTackleBox"), name).toEqual([]);
      });
    }
  });
});
