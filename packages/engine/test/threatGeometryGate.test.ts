/**
 * ADR-089 step 3, E6 — P5'S PUBLICATION GATE (plan §2.6, critique 3 S1).
 *
 *  1. No `RUSH_THREAT` payload has `distanceYards` or `closingSpeed` under any rule set, legacy,
 *     S, SW, L5, L8, SWH, S2, S2N, S3 and S3L, play and game: while P5 is not in contracts nothing
 *     publishes the pair, though `threatFromWonRep` fills it on every won rep under every set.
 *  2. Under s3 the pair is on the threat inside the engine: a free runner the clock timed carries
 *     the clock's distance and closing speed, read off the threats the pocket movement is handed.
 *  3. A play that reaches the gate open (P5 granted in this suite only) is refused before the
 *     stream begins; a bundle without the free-run block never opens it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const petitions = vi.hoisted(() => ({ granted: false }));
vi.mock("../src/sim/pocketRules.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/pocketRules.js")>();
  return {
    ...real,
    pocketRulesOf: (tunables: Parameters<typeof real.pocketRulesOf>[0]) =>
      petitions.granted ? real.pocketRulesUnder(tunables, { P5: true, P17: false }) : real.pocketRulesOf(tunables),
  };
});
vi.mock("../src/sim/freeRunTiming.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/freeRunTiming.js")>();
  return { ...real, timeFreeRunners: vi.fn(real.timeFreeRunners) };
});
vi.mock("../src/resolve/pocketMovement.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/pocketMovement.js")>();
  return { ...real, resolvePocketMovement: vi.fn(real.resolvePocketMovement) };
});

import { playerId } from "@ff/contracts";
import type { MatchEventEnvelope } from "@ff/contracts";
import { simulateGame, simulatePassPlay } from "../src/index.js";
import { resolvePocketMovement } from "../src/resolve/pocketMovement.js";
import type { RushThreat } from "../src/resolve/rushThreat.js";
import { timeFreeRunners } from "../src/sim/freeRunTiming.js";
import { PocketRulesError } from "../src/sim/pocketRules.js";
import { buildGameFixture } from "./gameFixtures.js";
import { PASS_FIXTURES, RULE_SETS, S2_TUNABLES, S3_TUNABLES } from "./pocketTunables.js";
import { callsUnder, frontWithPicture, needsPicture, withLineUp } from "./snapFixtures.js";

afterEach(() => {
  petitions.granted = false;
  vi.mocked(timeFreeRunners).mockClear();
  vi.mocked(resolvePocketMovement).mockClear();
});

const twist = () => frontWithPicture({ extras: 2, stunts: [{ penetrator: playerId("dt1"), looper: playerId("de1"), complexity: "TRIPLE" }] });

function geometryKeys(events: readonly MatchEventEnvelope[]): string[] {
  return events.flatMap(({ event }) =>
    event.type === "RUSH_THREAT" ? Object.keys(event.payload).filter((k) => k === "distanceYards" || k === "closingSpeed") : [],
  );
}

describe("ADR-089 step 3, E6: no RUSH_THREAT publishes the pair while P5 is not in contracts", () => {
  for (const { name, tunables } of RULE_SETS) {
    it(`under ${name}, play and game`, () => {
      let threats = 0;
      for (const [fixture, build] of [...PASS_FIXTURES, ["twist", () => twist().scenario] as const]) {
        for (let i = 0; i < 20; i++) {
          const { state, calls } = build();
          const { events } = simulatePassPlay(state, callsUnder(tunables, state, calls), `gate-${fixture}-${i}`, tunables);
          threats += events.filter((e) => e.event.type === "RUSH_THREAT").length;
          expect(geometryKeys(events), `${fixture} ${i}`).toEqual([]);
        }
      }
      expect(threats).toBeGreaterThan(50);
      const fixture = buildGameFixture({ seed: `gate-game-${name}` });
      const inputs = needsPicture(tunables)
        ? { ...fixture.inputs, callers: { home: withLineUp(fixture.inputs.callers.home), away: withLineUp(fixture.inputs.callers.away) } }
        : fixture.inputs;
      const { events } = simulateGame(fixture.state, inputs, fixture.seed, tunables);
      expect(geometryKeys(events)).toEqual([]);
    });
  }
});

describe("ADR-089 step 3, E6: under s3 the pair is on the threat inside the engine", () => {
  it("a free runner the clock timed carries the clock's distance and closing speed; a beaten late block, both or neither", () => {
    let timed = 0;
    for (let i = 0; i < 200 && timed < 10; i++) {
      vi.mocked(timeFreeRunners).mockClear();
      vi.mocked(resolvePocketMovement).mockClear();
      const f = twist();
      simulatePassPlay(f.scenario.state, f.calls, `gate-internal-${i}`, S3_TUNABLES);
      const result = vi.mocked(timeFreeRunners).mock.results[0];
      if (result?.type !== "return") throw new Error("the timing pass did not run");
      const plans = result.value;
      for (const call of vi.mocked(resolvePocketMovement).mock.calls) {
        for (const t of call[0].threats as readonly RushThreat[]) {
          if (t.origin === "WON_REP") continue;
          const free = plans.find((p) => p.rusher.bio.id === t.rusher)?.free;
          if (free === undefined) continue;
          if (free.onClock === true) {
            expect(t.distanceYards).toBe(free.distanceYards);
            expect(t.closingSpeed).toBe(free.closingSpeed);
            expect(typeof t.distanceYards).toBe("number");
            timed += 1;
          } else if (t.origin === "PICKUP_LOST" || t.origin === "STUNT_LOOPER") {
            // A beaten late block: the won rep's nominal pair, both or neither.
            expect(t.distanceYards === undefined).toBe(t.closingSpeed === undefined);
          }
        }
      }
    }
    expect(timed).toBeGreaterThanOrEqual(10);
  });
});

describe("ADR-089 step 3, E6: the gate, opened (P5 granted in this suite only)", () => {
  it("refuses an s3 play with the free-run block before the stream begins", () => {
    petitions.granted = true;
    const f = twist();
    expect(() => simulatePassPlay(f.scenario.state, f.calls, "gate-open", S3_TUNABLES)).toThrow(PocketRulesError);
    expect(() => simulatePassPlay(f.scenario.state, f.calls, "gate-open", S3_TUNABLES)).toThrow(/petition P5/);
  });

  it("never opens for a bundle without the free-run block", () => {
    petitions.granted = true;
    const f = twist();
    const { snap: _snap, ...plain } = f.calls;
    expect(() => simulatePassPlay(f.scenario.state, plain, "gate-s2", S2_TUNABLES)).not.toThrow();
  });
});
