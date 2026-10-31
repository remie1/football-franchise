/**
 * ADR-089 step 1 — under `legacy` no new branch runs (plan §4's proof, items 1, 2 and 5; S8).
 *
 * The block-clock and approach modules are wrapped in counting pass-throughs: a legacy play and a
 * legacy game call neither (no beat is drawn, no approach is computed, `withApproach` never adds a
 * key), and the same plays under `pocket-1` call both, so the spies are proven to be wired.
 *
 * ADR-089 step 2 (plan §1.1, §1.5): `resolve/pocket.js` is wrapped the same way, for must act's
 * `mustActThreat` and the narrower counter's `counterExcludes`. Neither is called under any rule
 * set without `pocket.forcing` (legacy, S, SW, L5, L8 and SWH, step 1's rule at step 2's
 * horizons); `mustActThreat` is called under S2 (`PER_RUSHER`) only and `counterExcludes` under
 * S2N (`COUNTER_LESS_SEEN`) only.
 *
 * ADR-089 step 3 (P-18): the free-run clock, the timing pass, the picture check, the late block's
 * entry points, `threatSideOf` and `fromOf` are wrapped the same way; no set before s3 calls any.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/resolve/beatClock.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/beatClock.js")>();
  return { ...real, drawBeat: vi.fn(real.drawBeat), resolveBeatTick: vi.fn(real.resolveBeatTick) };
});
vi.mock("../src/resolve/approach.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/approach.js")>();
  return {
    ...real,
    threatApproachOf: vi.fn(real.threatApproachOf),
    withApproach: vi.fn(real.withApproach),
    threatSideOf: vi.fn(real.threatSideOf),
    fromOf: vi.fn(real.fromOf),
  };
});
// ADR-089 step 3 (P-18): every new s3 entry point, counted.
vi.mock("../src/resolve/freeRun.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/freeRun.js")>();
  return { ...real, freeRunClock: vi.fn(real.freeRunClock) };
});
vi.mock("../src/sim/freeRunTiming.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/freeRunTiming.js")>();
  return { ...real, timeFreeRunners: vi.fn(real.timeFreeRunners), assertSnapPictureFor: vi.fn(real.assertSnapPictureFor) };
});
vi.mock("../src/resolve/lateBlock.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/lateBlock.js")>();
  return {
    ...real,
    drawLateBeat: vi.fn(real.drawLateBeat),
    resolveLateBeatTick: vi.fn(real.resolveLateBeatTick),
    resolveLateTickL: vi.fn(real.resolveLateTickL),
    lateThreatOf: vi.fn(real.lateThreatOf),
  };
});
vi.mock("../src/resolve/pocket.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/pocket.js")>();
  return { ...real, mustActThreat: vi.fn(real.mustActThreat), counterExcludes: vi.fn(real.counterExcludes) };
});

import { playerId } from "@ff/contracts";
import { simulateGame, simulatePassPlay } from "../src/index.js";
import { drawBeat, resolveBeatTick } from "../src/resolve/beatClock.js";
import { fromOf, threatApproachOf, threatSideOf, withApproach } from "../src/resolve/approach.js";
import { freeRunClock } from "../src/resolve/freeRun.js";
import { drawLateBeat, lateThreatOf, resolveLateBeatTick, resolveLateTickL } from "../src/resolve/lateBlock.js";
import { counterExcludes, mustActThreat } from "../src/resolve/pocket.js";
import { assertSnapPictureFor, timeFreeRunners } from "../src/sim/freeRunTiming.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";
import { buildFrontScenario, buildLopsidedRushScenario, buildScenario, buildScramblerScenario } from "./fixtures.js";
import { L5_TUNABLES, RULE_SETS, S2N_TUNABLES, S2_TUNABLES, S3L_TUNABLES, S3_TUNABLES, SW_TUNABLES, buildBullRushScenario, isStep3 } from "./pocketTunables.js";
import { frontWithPicture, withLineUp, withPicture } from "./snapFixtures.js";

const FIXTURES = [buildScenario, buildLopsidedRushScenario, buildScramblerScenario, () => buildFrontScenario({ extras: 2 })];

/** ADR-089 step 3 (P-18): the new entry points, by name. */
const STEP3_SPY_TABLE = [
  ["freeRunClock", freeRunClock],
  ["timeFreeRunners", timeFreeRunners],
  ["assertSnapPictureFor", assertSnapPictureFor],
  ["drawLateBeat", drawLateBeat],
  ["resolveLateBeatTick", resolveLateBeatTick],
  ["resolveLateTickL", resolveLateTickL],
  ["lateThreatOf", lateThreatOf],
  ["threatSideOf", threatSideOf],
  ["fromOf", fromOf],
] as const;
const STEP3_SPIES = STEP3_SPY_TABLE.map(([, f]) => vi.mocked(f as (...args: never[]) => unknown));

afterEach(() => {
  vi.mocked(drawBeat).mockClear();
  vi.mocked(resolveBeatTick).mockClear();
  vi.mocked(threatApproachOf).mockClear();
  vi.mocked(withApproach).mockClear();
  vi.mocked(mustActThreat).mockClear();
  vi.mocked(counterExcludes).mockClear();
  for (const spy of STEP3_SPIES) spy.mockClear();
});

describe("ADR-089 step 1 — legacy runs no new branch", () => {
  it("a legacy play draws no beat, resolves no dieless tick and labels no threat", () => {
    for (const build of FIXTURES) {
      for (let i = 0; i < 40; i++) {
        const { state, calls } = build();
        simulatePassPlay(state, calls, `isolation-${i}`);
        simulatePassPlay(state, calls, `isolation-${i}`, DEFAULT_TUNABLES);
      }
    }
    expect(vi.mocked(drawBeat)).not.toHaveBeenCalled();
    expect(vi.mocked(resolveBeatTick)).not.toHaveBeenCalled();
    expect(vi.mocked(threatApproachOf)).not.toHaveBeenCalled();
    // `withApproach` is the one writer of the key; under legacy every call passes no label and
    // so returns the threat it was given.
    for (const call of vi.mocked(withApproach).mock.calls) expect(call[1]).toBeUndefined();
    for (const result of vi.mocked(withApproach).mock.results) expect(result.type).toBe("return");
    vi.mocked(withApproach).mock.calls.forEach((call, n) => {
      expect(vi.mocked(withApproach).mock.results[n]?.value).toBe(call[0]);
    });
  });

  it("a legacy game does the same, on every pass play of it", () => {
    const fixture = buildGameFixture({ seed: "isolation-game" });
    simulateGame(fixture.state, fixture.inputs, fixture.seed);
    expect(vi.mocked(drawBeat)).not.toHaveBeenCalled();
    expect(vi.mocked(resolveBeatTick)).not.toHaveBeenCalled();
    expect(vi.mocked(threatApproachOf)).not.toHaveBeenCalled();
    for (const call of vi.mocked(withApproach).mock.calls) expect(call[1]).toBeUndefined();
  });

  it("the spies are wired: the same plays under pocket-1 call them", () => {
    for (const build of FIXTURES) {
      for (let i = 0; i < 40; i++) {
        const { state, calls } = build();
        simulatePassPlay(state, calls, `isolation-${i}`, SW_TUNABLES);
      }
    }
    expect(vi.mocked(drawBeat)).toHaveBeenCalled();
    expect(vi.mocked(resolveBeatTick)).toHaveBeenCalled();
    expect(vi.mocked(threatApproachOf)).toHaveBeenCalled();
    vi.mocked(drawBeat).mockClear();
    vi.mocked(resolveBeatTick).mockClear();
    vi.mocked(threatApproachOf).mockClear();
    for (const build of FIXTURES) {
      for (let i = 0; i < 40; i++) {
        const { state, calls } = build();
        simulatePassPlay(state, calls, `isolation-${i}`, L5_TUNABLES);
      }
    }
    // Shape L draws no beat and resolves no dieless tick; it labels its threats.
    expect(vi.mocked(drawBeat)).not.toHaveBeenCalled();
    expect(vi.mocked(resolveBeatTick)).not.toHaveBeenCalled();
    expect(vi.mocked(threatApproachOf)).toHaveBeenCalled();
  });
});

describe("ADR-089 step 2 — no rule set without pocket.forcing runs must act or the narrower counter", () => {
  const STEP2_FIXTURES = [...FIXTURES, buildBullRushScenario];

  it("legacy, S, SW, L5, L8 and SWH never call mustActThreat or counterExcludes, play or game", () => {
    const without = RULE_SETS.filter((r) => !("forcing" in r.tunables.pocket));
    expect(without.map((r) => r.name)).toEqual(["legacy", "S", "SW", "L5", "L8", "SWH"]);
    for (const { tunables } of without) {
      for (const build of STEP2_FIXTURES) {
        for (let i = 0; i < 40; i++) {
          const { state, calls } = build();
          simulatePassPlay(state, calls, `isolation-s2-${i}`, tunables);
        }
      }
    }
    const fixture = buildGameFixture({ seed: "isolation-s2-game" });
    simulateGame(fixture.state, fixture.inputs, fixture.seed);
    simulateGame(fixture.state, fixture.inputs, fixture.seed, SW_TUNABLES);
    expect(vi.mocked(mustActThreat)).not.toHaveBeenCalled();
    expect(vi.mocked(counterExcludes)).not.toHaveBeenCalled();
  });

  it("the spy is wired: S2 calls mustActThreat, once a pocket tick, with both minima equal (every threat registered)", () => {
    let pocketTicks = 0;
    for (const build of STEP2_FIXTURES) {
      for (let i = 0; i < 40; i++) {
        const { state, calls } = build();
        const { events } = simulatePassPlay(state, calls, `isolation-s2-${i}`, S2_TUNABLES);
        pocketTicks += events.filter((e) => e.event.type === "POCKET_STATUS").length;
      }
    }
    const spy = vi.mocked(mustActThreat);
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.length).toBe(pocketTicks);
    for (const [tunables, registered, all] of spy.mock.calls) {
      expect(tunables).toBe(S2_TUNABLES);
      expect(registered).toBe(all);
    }
    // S2 runs the old counter: the narrower rule is S2N's alone.
    expect(vi.mocked(counterExcludes)).not.toHaveBeenCalled();
  });

  it("the spy is wired: S2N calls counterExcludes, and never mustActThreat (its forcing is the status's)", () => {
    for (const build of STEP2_FIXTURES) {
      for (let i = 0; i < 40; i++) {
        const { state, calls } = build();
        simulatePassPlay(state, calls, `isolation-s2n-${i}`, S2N_TUNABLES);
      }
    }
    expect(vi.mocked(counterExcludes)).toHaveBeenCalled();
    expect(vi.mocked(mustActThreat)).not.toHaveBeenCalled();
  });
});

/**
 * ADR-089 step 3 — P-18 (plan §6.1, critique 3 S4): every new s3 entry point (the free-run clock,
 * the timing pass and the picture check, the late beat, the late ticks of both shapes and the
 * beaten late threat, D16's side and the FRONT climb lane's `fromOf`) is called by no rule set
 * before step 3, play or game, with or without a picture on the calls; and the spies are wired:
 * the s3 sets call them. `resolveLateTickL` stays at zero under s3 as well, because shape L's late
 * block is refused until petition P17 (`lateBlockL.test.ts` proves it wired behind that petition).
 */
describe("ADR-089 step 3 — no rule set before step 3 runs a step-3 entry point (P-18)", () => {
  const STEP3_FIXTURES = [
    ...FIXTURES,
    buildBullRushScenario,
    () => frontWithPicture({ extras: 2, stunts: [{ penetrator: playerId("dt1"), looper: playerId("de1"), complexity: "TRIPLE" }] }).scenario,
    () => frontWithPicture({ extras: 2, stunts: [{ penetrator: playerId("blz0"), looper: playerId("de1"), complexity: "T_E" }] }).scenario,
  ];
  const named = (): Record<string, number> => Object.fromEntries(STEP3_SPY_TABLE.map(([name, f]) => [name, vi.mocked(f as (...args: never[]) => unknown).mock.calls.length]));

  it("legacy, S, SW, L5, L8, SWH, S2 and S2N call none of them, play (with and without a picture) and game", () => {
    const before = RULE_SETS.filter((r) => !isStep3(r.name));
    expect(before.map((r) => r.name)).toEqual(["legacy", "S", "SW", "L5", "L8", "SWH", "S2", "S2N"]);
    for (const { tunables } of before) {
      for (const build of STEP3_FIXTURES) {
        for (let i = 0; i < 25; i++) {
          const { state, calls } = build();
          simulatePassPlay(state, calls, `isolation-s3-${i}`, tunables);
          simulatePassPlay(state, withPicture(state, calls), `isolation-s3-${i}`, tunables);
        }
      }
    }
    const fixture = buildGameFixture({ seed: "isolation-s3-game" });
    const pictured = { ...fixture.inputs, callers: { home: withLineUp(fixture.inputs.callers.home), away: withLineUp(fixture.inputs.callers.away) } };
    simulateGame(fixture.state, fixture.inputs, fixture.seed);
    simulateGame(fixture.state, pictured, fixture.seed, SW_TUNABLES);
    simulateGame(fixture.state, pictured, fixture.seed, S2_TUNABLES);
    expect(named()).toEqual(Object.fromEntries(STEP3_SPY_TABLE.map(([name]) => [name, 0])));
  });

  it("the spies are wired: the s3 sets call every one but shape L's late tick, play and game", () => {
    for (const tunables of [S3_TUNABLES, S3L_TUNABLES]) {
      for (const build of STEP3_FIXTURES) {
        for (let i = 0; i < 25; i++) {
          const { state, calls } = build();
          simulatePassPlay(state, withPicture(state, calls), `isolation-s3-on-${i}`, tunables);
        }
      }
    }
    // A late block breaks a median 0.8 s after t_e and many plays are over by then: play the
    // twisting front on until one is beaten inside the play.
    for (let i = 0; i < 400 && vi.mocked(lateThreatOf).mock.calls.length === 0; i++) {
      const f = frontWithPicture({ extras: 2, stunts: [{ penetrator: playerId("dt1"), looper: playerId("de1"), complexity: "TRIPLE" }] });
      simulatePassPlay(f.scenario.state, f.calls, `isolation-s3-beaten-${i}`, S3_TUNABLES);
    }
    const plays = named();
    for (const [name] of STEP3_SPY_TABLE) {
      if (name === "resolveLateTickL") expect(plays[name], name).toBe(0);
      else expect(plays[name], name).toBeGreaterThan(0);
    }
    for (const spy of STEP3_SPIES) spy.mockClear();
    const fixture = buildGameFixture({ seed: "isolation-s3-game" });
    const pictured = { ...fixture.inputs, callers: { home: withLineUp(fixture.inputs.callers.home), away: withLineUp(fixture.inputs.callers.away) } };
    simulateGame(fixture.state, pictured, fixture.seed, S3_TUNABLES);
    const game = named();
    for (const name of ["freeRunClock", "timeFreeRunners", "assertSnapPictureFor", "threatSideOf"]) expect(game[name], name).toBeGreaterThan(0);
    expect(game["resolveLateTickL"]).toBe(0);
  });
});
