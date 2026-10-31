/**
 * ADR-089 step 3, E6b — P5'S PUBLICATION GATE, OPEN (plan §2.6, critique 3 S1; contracts petition
 * P5, the owner's typed yes of 2026-10-31; the Orchestrator's FID-F-9 ruling).
 *
 *  1. Under legacy, `pocket-1.s1` (S, SW, L5, L8) and `pocket-1.s2` (SWH, S2, S2N) no `RUSH_THREAT`
 *     payload has `distanceYards` or `closingSpeed` (`"distanceYards" in payload` is false), play and
 *     game, though `threatFromWonRep` fills the pair on every won rep under every set.
 *  2. Under `pocket-1.s3` with the free-run block (S3, S3L) every `RUSH_THREAT` has both keys or
 *     neither, play and game, and threats with both are published.
 *  3. What the pair is: a free runner the clock timed publishes the clock's pair (his path from his
 *     snap spot, and that path over his whole time from the snap); a won rep and a beaten late block
 *     publish the nominal pair; a free runner on today's set time (S3L's touched men) publishes
 *     neither.
 *  4. The gate reads the rules, never the threat: a step-3 bundle without the free-run block (C10's
 *     late block alone, C16's climb lane alone) publishes nothing, and an s3 bundle with the
 *     free-run block publishes nothing when P5 is withheld (in this suite only).
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const petitions = vi.hoisted(() => ({ withheld: false }));
vi.mock("../src/sim/pocketRules.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/pocketRules.js")>();
  return {
    ...real,
    pocketRulesOf: (tunables: Parameters<typeof real.pocketRulesOf>[0]) =>
      petitions.withheld ? real.pocketRulesUnder(tunables, { P5: false, P17: real.P17_IN_CONTRACTS }) : real.pocketRulesOf(tunables),
  };
});
vi.mock("../src/sim/freeRunTiming.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/freeRunTiming.js")>();
  return { ...real, timeFreeRunners: vi.fn(real.timeFreeRunners) };
});

import { playerId } from "@ff/contracts";
import type { MatchEvent, MatchEventEnvelope } from "@ff/contracts";
import { simulateGame, simulatePassPlay } from "../src/index.js";
import { timeFreeRunners } from "../src/sim/freeRunTiming.js";
import type { RushPlan } from "../src/sim/preSnap.js";
import type { Tunables } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";
import { LATE_BLOCK_FILED, PASS_FIXTURES, RULE_SETS, S2_TUNABLES, S3_TUNABLES, S3L_TUNABLES, isStep3, tickOf, withStep3 } from "./pocketTunables.js";
import { callsUnder, frontWithPicture, needsPicture, withLineUp } from "./snapFixtures.js";

const timing = vi.mocked(timeFreeRunners);

afterEach(() => {
  petitions.withheld = false;
  timing.mockClear();
});

type ThreatPayload = Extract<MatchEvent, { type: "RUSH_THREAT" }>["payload"];

const twist = () => frontWithPicture({ extras: 2, stunts: [{ penetrator: playerId("dt1"), looper: playerId("de1"), complexity: "TRIPLE" }] });

function threats(events: readonly MatchEventEnvelope[]): { readonly payload: ThreatPayload; readonly tick: number | undefined }[] {
  return events.flatMap((e) => (e.event.type === "RUSH_THREAT" ? [{ payload: e.event.payload, tick: tickOf(e) }] : []));
}

/** "distanceYards" in payload, "closingSpeed" in payload: [both, neither, one alone]. */
function census(events: readonly MatchEventEnvelope[]): { both: number; neither: number; half: number } {
  const out = { both: 0, neither: 0, half: 0 };
  for (const { payload } of threats(events)) {
    const d = "distanceYards" in payload;
    const s = "closingSpeed" in payload;
    if (d && s) out.both += 1;
    else if (!d && !s) out.neither += 1;
    else out.half += 1;
  }
  return out;
}

function playsUnder(name: string, tunables: Tunables): readonly (readonly MatchEventEnvelope[])[] {
  const out: (readonly MatchEventEnvelope[])[] = [];
  for (const [fixture, build] of [...PASS_FIXTURES, ["twist", () => twist().scenario] as const]) {
    for (let i = 0; i < 20; i++) {
      const { state, calls } = build();
      out.push(simulatePassPlay(state, callsUnder(tunables, state, calls), `gate-${name}-${fixture}-${i}`, tunables).events);
    }
  }
  return out;
}

function gameUnder(name: string, tunables: Tunables): readonly MatchEventEnvelope[] {
  const fixture = buildGameFixture({ seed: `gate-game-${name}` });
  const inputs = needsPicture(tunables)
    ? { ...fixture.inputs, callers: { home: withLineUp(fixture.inputs.callers.home), away: withLineUp(fixture.inputs.callers.away) } }
    : fixture.inputs;
  return simulateGame(fixture.state, inputs, fixture.seed, tunables).events;
}

describe("ADR-089 step 3, E6b: legacy, pocket-1.s1 and pocket-1.s2 publish no pair", () => {
  for (const { name, tunables } of RULE_SETS.filter((r) => !isStep3(r.name))) {
    it(`under ${name}, play and game: no RUSH_THREAT has either key`, () => {
      let published = 0;
      for (const events of [...playsUnder(name, tunables), gameUnder(name, tunables)]) {
        for (const { payload } of threats(events)) {
          published += 1;
          expect("distanceYards" in payload).toBe(false);
          expect("closingSpeed" in payload).toBe(false);
        }
      }
      expect(published).toBeGreaterThan(50);
    });
  }
});

describe("ADR-089 step 3, E6b: pocket-1.s3 with the free-run block publishes the pair, both or neither", () => {
  for (const { name, tunables } of RULE_SETS.filter((r) => isStep3(r.name))) {
    it(`under ${name}, play and game: every RUSH_THREAT has both keys or neither, and some have both`, () => {
      const plays = census(playsUnder(name, tunables).flat());
      const game = census(gameUnder(name, tunables));
      expect(plays.half).toBe(0);
      expect(game.half).toBe(0);
      expect(plays.both).toBeGreaterThan(50);
      expect(game.both).toBeGreaterThan(20);
    });
  }
});

describe("ADR-089 step 3, E6b: what the published pair is", () => {
  const NOMINAL = S3_TUNABLES.arrival.nominalClosingSpeedYardsPerSecond;

  /** Each play's plans at the snap beside its stream. */
  function played(tunables: Tunables, seed: string): { events: readonly MatchEventEnvelope[]; plans: readonly RushPlan[] } {
    timing.mockClear();
    const f = twist();
    const { events } = simulatePassPlay(f.scenario.state, f.calls, seed, tunables);
    const result = timing.mock.results.at(-1);
    if (result?.type !== "return") throw new Error("the timing pass did not run");
    return { events, plans: result.value as readonly RushPlan[] };
  }

  it("under S3: a timed free runner carries the clock's pair; a won rep and a beaten late block the nominal pair (FID-F-9)", () => {
    let timed = 0;
    let wonReps = 0;
    let beatenLate = 0;
    for (let i = 0; i < 200; i++) {
      const { events, plans } = played(S3_TUNABLES, `gate-what-${i}`);
      for (const { payload, tick } of threats(events)) {
        expect("distanceYards" in payload).toBe("closingSpeed" in payload);
        if (payload.origin === "WON_REP") {
          expect(payload.closingSpeed).toBe(NOMINAL);
          expect(payload.distanceYards).toBeGreaterThan(0);
          wonReps += 1;
          continue;
        }
        const free = plans.find((p) => String(p.rusher.bio.id) === String(payload.rusher))?.free;
        if (free === undefined) continue;
        if (free.onClock === true) {
          // A free runner the clock timed, from his snap spot: the clock's own pair, the same on
          // each of his threat's publications (`freeRunTiming.test.ts` checks it against the clock).
          expect(payload.distanceYards).toBe(free.distanceYards);
          expect(payload.closingSpeed).toBe(free.closingSpeed);
          expect(typeof payload.distanceYards).toBe("number");
          timed += 1;
        } else if (free.toucher !== undefined && tick !== undefined) {
          // A touched man under reading B is a late block; beaten, his threat is built as a won rep's.
          expect(payload.closingSpeed).toBe(NOMINAL);
          expect(payload.distanceYards).toBeGreaterThan(0);
          beatenLate += 1;
        }
      }
    }
    expect(timed).toBeGreaterThan(100);
    expect(wonReps).toBeGreaterThan(10);
    expect(beatenLate).toBeGreaterThan(0);
  });

  it("under S3L (no late block): a touched man keeps today's set time and publishes neither key", () => {
    let setTime = 0;
    for (let i = 0; i < 200; i++) {
      const { events, plans } = played(S3L_TUNABLES, `gate-set-${i}`);
      for (const { payload, tick } of threats(events)) {
        if (payload.origin === "WON_REP" || tick !== undefined) continue;
        const free = plans.find((p) => String(p.rusher.bio.id) === String(payload.rusher))?.free;
        if (free === undefined || free.onClock === true) continue;
        expect(free.toucher).toBeDefined();
        expect("distanceYards" in payload).toBe(false);
        expect("closingSpeed" in payload).toBe(false);
        setTime += 1;
      }
    }
    expect(setTime).toBeGreaterThan(10);
  });
});

describe("ADR-089 step 3, E6b: the gate reads the rules, never the threat", () => {
  it("a step-3 bundle without the free-run block publishes nothing, though its won reps carry the nominal pair (C10, C16)", () => {
    for (const [name, tunables] of [
      ["late block alone", withStep3(S2_TUNABLES, { lateBlock: LATE_BLOCK_FILED })],
      ["climb lane alone", withStep3(S2_TUNABLES, { climbLane: "FRONT" })],
    ] as const) {
      const all = playsUnder(name, tunables).flat();
      const c = census(all);
      expect(c.both + c.half, name).toBe(0);
      expect(threats(all).some((t) => t.payload.origin === "WON_REP"), name).toBe(true);
    }
  });

  it("an s3 bundle with the free-run block publishes nothing while P5 is withheld (this suite only)", () => {
    petitions.withheld = true;
    const c = census(playsUnder("withheld", S3_TUNABLES).flat());
    expect(c.both + c.half).toBe(0);
    expect(c.neither).toBeGreaterThan(50);
  });
});
