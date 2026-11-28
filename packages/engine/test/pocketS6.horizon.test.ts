/**
 * ADR-089 step 6, PART 2.5 (step-6 plan §2.5; AM-13 `horizon`, CHOSEN): NO LATE HORIZON SACK.
 *
 * 1. The helpers' table: the filed deadline (an escape at 1.0 s keeps today's 2.5 s and one at 4.5 s
 *    its 6.0 s; one at 5.0 or 5.5 s reaches it at 6.0 s, not at 6.5 or 7.0 s; one at 6.0 s at 6.5 s),
 *    and the tick past the last runs only for a live scramble, only to its deadline.
 * 2. In play on D1's shape, S, L and the clean bench, with his count lengthened (CHOSEN for the test:
 *    `qb.timeBudget.baseSeconds` 2.5, today's, then 3.5 and 4.5 s) so escapes come at 5.0, 5.5 and
 *    6.0 s in number: s5a ends some of them in the horizon coverage sack; under the rule every
 *    QB_PURSUIT states the filed deadline, no play ends in the horizon sack after an escape (S-12,
 *    `proof:no-horizon-sack-after-escape`), the tuck comes at the deadline when he has not thrown,
 *    an escape at 6.0 s plays the tick 6.5 s, and no other play runs past 6.0 s.
 * 3. Without an escape after 4.5 s the rule moves nothing: such a play is the s5a stream byte for
 *    byte.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulatePassPlay } from "../src/index.js";
import { horizonDeadline, runsPastLastTick } from "../src/sim/outs.js";
import { pursuitDeadline } from "../src/resolve/scramble.js";
import { applyTunablePatch } from "../src/tunables.js";
import type { Tunables } from "../src/tunables.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { withPicture } from "./snapFixtures.js";
import { S5L_TUNABLES, S5S_TUNABLES, S5_TUNABLES, onCleanBench } from "./step5Fixtures.js";
import { outsParts, playS6, withOuts } from "./step6Fixtures.js";

const RULE = outsParts({ noLateHorizonSack: true });
const SEEDS = 40;
const MAX_TICK = S5_TUNABLES.clock.maxTick;

/** His count lengthened to `seconds` (the test's bench; nothing else moves). */
const counted = (t: Tunables, seconds: number): Tunables =>
  applyTunablePatch(t, {
    tunableId: "qb.timeBudget.baseSeconds",
    currentValue: t.qb.timeBudget.baseSeconds,
    proposedValue: seconds,
    evidence: "2.5 test bench",
    expectedEffect: "later escapes",
  });

/** The s5a shapes, each at today's count and two longer ones, with the picture each needs. */
const BENCHES: readonly { readonly name: string; readonly base: Tunables; readonly picture: boolean }[] = [
  { name: "s5a", base: S5_TUNABLES, picture: true },
  { name: "s5a shape S", base: S5S_TUNABLES, picture: false },
  { name: "s5a shape L", base: S5L_TUNABLES, picture: false },
  { name: "s5a shape S, clean bench", base: onCleanBench(S5S_TUNABLES), picture: false },
].flatMap((b) => [2.5, 3.5, 4.5].map((s) => ({ ...b, name: `${b.name}, count ${s}`, base: counted(b.base, s) })));

function each(fn: (name: string, base: Tunables, seed: string, play: (tunables: Tunables, outs: boolean) => readonly MatchEventEnvelope[]) => void): void {
  for (const { name, base, picture } of BENCHES) {
    for (const [fixture, build] of PASS_FIXTURES) {
      for (let i = 0; i < SEEDS; i++) {
        const seed = `s6-horizon-${fixture}-${i}`;
        fn(name, base, seed, (tunables, outs) => {
          const { state, calls } = build();
          const c = picture ? withPicture(state, calls) : calls;
          return outs ? playS6(state, c, seed, tunables).events : simulatePassPlay(state, c, seed, tunables).events;
        });
      }
    }
  }
}

/** The play's escape, if he won one (its QB_PURSUIT), and how the play ended after it. */
function afterEscape(events: readonly MatchEventEnvelope[]) {
  const at = events.findIndex((e) => e.event.type === "QB_PURSUIT");
  const pursuit = events[at]?.event;
  if (pursuit?.type !== "QB_PURSUIT") return undefined;
  const after = events.slice(at + 1);
  const run = after.find((e) => e.event.type === "RUN_RESOLUTION");
  const thrown = after.some((e) => e.event.type === "THROW" || e.event.type === "THROWAWAY");
  return {
    since: pursuit.payload.sinceTick,
    deadline: pursuit.payload.deadlineTick,
    end: run !== undefined ? "RUN" : thrown ? "THROW" : "HORIZON",
    runTick: (run?.event as { tick?: number } | undefined)?.tick,
  };
}

const lastTick = (events: readonly MatchEventEnvelope[]): number =>
  events.reduce((t, e) => (e.event.type === "TICK" ? Math.max(t, e.event.payload.tick) : t), 0);

describe("ADR-089 step 6, 2.5: the helpers", () => {
  it("the filed deadline: today's up to an escape at 4.5 s, 6.0 s for one at 5.0 or 5.5 s, 6.5 s for one at 6.0 s", () => {
    const cases: readonly [number, number, number][] = [
      [1.0, 2.5, 2.5],
      [3.0, 4.5, 4.5],
      [4.5, 6.0, 6.0],
      [5.0, 6.0, 6.5],
      [5.5, 6.0, 7.0],
      [6.0, 6.5, 7.5],
    ];
    for (const [escape, filed, today] of cases) {
      expect(horizonDeadline(S5_TUNABLES, escape), `${escape}`).toBe(filed);
      expect(pursuitDeadline(S5_TUNABLES, escape), `${escape}`).toBe(today);
    }
  });

  it("the tick past the last runs only for a live scramble, only to its deadline", () => {
    expect(runsPastLastTick(S5_TUNABLES, 6.5, 6.5)).toBe(true);
    expect(runsPastLastTick(S5_TUNABLES, 6.5, undefined)).toBe(false);
    expect(runsPastLastTick(S5_TUNABLES, 6.5, 6.0)).toBe(false);
    expect(runsPastLastTick(S5_TUNABLES, 7.0, 6.5)).toBe(false);
    // Up to the last tick the loop's own bound runs it; the helper is asked only past it.
    expect(runsPastLastTick(S5_TUNABLES, 6.0, 6.5)).toBe(false);
  });
});

describe("ADR-089 step 6, 2.5: no late horizon sack in play", () => {
  it("s5a ends late escapes in the horizon sack; under the rule none, the tuck at the filed deadline, 6.5 s only after an escape at 6.0 s", () => {
    const n = { todayHorizon: 0, at50: 0, at55: 0, at60: 0, runs: 0 };
    each((name, base, seed, play) => {
      const today = afterEscape(play(base, false));
      if (today?.end === "HORIZON") n.todayHorizon += 1;
      const events = play(withOuts(base, RULE), true);
      const escape = afterEscape(events);
      if (escape === undefined) {
        expect(lastTick(events), `${name} ${seed}`).toBeLessThanOrEqual(MAX_TICK);
        return;
      }
      expect(escape.deadline, `${name} ${seed}`).toBe(horizonDeadline(base, escape.since));
      expect(escape.end, `${name} ${seed}`).not.toBe("HORIZON");
      if (escape.end === "RUN") {
        n.runs += 1;
        expect(escape.runTick, `${name} ${seed}`).toBe(escape.deadline);
      }
      if (escape.since === 5.0) n.at50 += 1;
      if (escape.since === 5.5) n.at55 += 1;
      if (escape.since === MAX_TICK) {
        n.at60 += 1;
        expect(lastTick(events), `${name} ${seed}`).toBe(MAX_TICK + base.clock.tickStepSeconds);
      } else {
        expect(lastTick(events), `${name} ${seed}`).toBeLessThanOrEqual(MAX_TICK);
      }
    });
    expect(n.todayHorizon).toBeGreaterThan(100);
    expect(n.at50).toBeGreaterThan(20);
    expect(n.at55).toBeGreaterThan(20);
    expect(n.at60).toBeGreaterThan(20);
    expect(n.runs).toBeGreaterThan(100);
  });

  it("without an escape after 4.5 s the rule moves nothing: the s5a stream byte for byte", () => {
    let same = 0;
    each((name, base, seed, play) => {
      const today = play(base, false);
      const escape = afterEscape(today);
      if (escape !== undefined && escape.since + base.scramble.pursuitSeconds > MAX_TICK) return;
      same += 1;
      expect(JSON.stringify(play(withOuts(base, RULE), true)), `${name} ${seed}`).toBe(JSON.stringify(today));
    });
    expect(same).toBeGreaterThan(1000);
  });
});
