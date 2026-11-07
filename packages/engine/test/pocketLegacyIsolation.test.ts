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
 *
 * ADR-089 step 4 (P-18): the contest, the second arrival, the contact class and the tilt, D21's
 * contact time, the race and rho, the arrived list and the rebuild, the contact-time book and the
 * log's three new writers are wrapped the same way; no set of steps 1 to 3 calls any, and
 * `playsTodaysLine` is `playsLegacyRules` under every one of them.
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

// ADR-089 step 4 (P-18): every new s4 entry point, counted.
vi.mock("../src/resolve/contact.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/contact.js")>();
  return {
    ...real,
    arrivalContest: vi.fn(real.arrivalContest),
    secondArrival: vi.fn(real.secondArrival),
    contactFrom: vi.fn(real.contactFrom),
    tiltOf: vi.fn(real.tiltOf),
  };
});
vi.mock("../src/resolve/motion.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/motion.js")>();
  return { ...real, contactSecondsOf: vi.fn(real.contactSecondsOf), throwingHit: vi.fn(real.throwingHit), rho: vi.fn(real.rho) };
});
vi.mock("../src/sim/contactTick.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/contactTick.js")>();
  return {
    ...real,
    rebuiltTick: vi.fn(real.rebuiltTick),
    arrivedInGridOrder: vi.fn(real.arrivedInGridOrder),
    onFreeRunClockAtSnap: vi.fn(real.onFreeRunClockAtSnap),
  };
});
vi.mock("../src/sim/contactBook.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/sim/contactBook.js")>();
  const ContactBook = vi.fn((reading: import("../src/sim/contactBook.js").ContactReading) => new real.ContactBook(reading));
  return { ...real, ContactBook };
});

import { playerId } from "@ff/contracts";
import { simulateGame, simulatePassPlay } from "../src/index.js";
import { PlayEventLog } from "../src/events.js";
import { arrivalContest, contactFrom, secondArrival, tiltOf } from "../src/resolve/contact.js";
import { contactSecondsOf, rho, throwingHit } from "../src/resolve/motion.js";
import { ContactBook } from "../src/sim/contactBook.js";
import { arrivedInGridOrder, onFreeRunClockAtSnap, rebuiltTick } from "../src/sim/contactTick.js";
import { playsLegacyRules, playsTodaysLine } from "../src/sim/pocketRules.js";
import { PASS_FIXTURES } from "./pocketTunables.js";
import { S4C_TUNABLES, S4L_TUNABLES, S4M_TUNABLES, S4S_TUNABLES, S4_TUNABLES, T_TUNABLES, playStep4 } from "./step4Fixtures.js";
import { drawBeat, resolveBeatTick } from "../src/resolve/beatClock.js";
import { fromOf, threatApproachOf, threatSideOf, withApproach } from "../src/resolve/approach.js";
import { freeRunClock } from "../src/resolve/freeRun.js";
import { drawLateBeat, lateThreatOf, resolveLateBeatTick, resolveLateTickL } from "../src/resolve/lateBlock.js";
import { counterExcludes, mustActThreat } from "../src/resolve/pocket.js";
import { assertSnapPictureFor, timeFreeRunners } from "../src/sim/freeRunTiming.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";
import { buildFrontScenario, buildLopsidedRushScenario, buildScenario, buildScramblerScenario } from "./fixtures.js";
import { L5_TUNABLES, RULE_SETS, S2N_TUNABLES, S2_TUNABLES, S3L8_TUNABLES, S3L_TUNABLES, S3_TUNABLES, SW_TUNABLES, buildBullRushScenario, isStep3 } from "./pocketTunables.js";
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

/** ADR-089 step 4 (P-18): the new entry points, by name (the log's writers are spied per test). */
const STEP4_SPY_TABLE = [
  ["arrivalContest", arrivalContest],
  ["secondArrival", secondArrival],
  ["contactFrom", contactFrom],
  ["tiltOf", tiltOf],
  ["contactSecondsOf", contactSecondsOf],
  ["throwingHit", throwingHit],
  ["rho", rho],
  ["rebuiltTick", rebuiltTick],
  ["arrivedInGridOrder", arrivedInGridOrder],
  ["onFreeRunClockAtSnap", onFreeRunClockAtSnap],
  ["ContactBook", ContactBook],
] as const;
const STEP4_SPIES = STEP4_SPY_TABLE.map(([, f]) => vi.mocked(f as unknown as (...args: never[]) => unknown));

afterEach(() => {
  vi.mocked(drawBeat).mockClear();
  vi.mocked(resolveBeatTick).mockClear();
  vi.mocked(threatApproachOf).mockClear();
  vi.mocked(withApproach).mockClear();
  vi.mocked(mustActThreat).mockClear();
  vi.mocked(counterExcludes).mockClear();
  for (const spy of STEP3_SPIES) spy.mockClear();
  for (const spy of STEP4_SPIES) spy.mockClear();
  vi.restoreAllMocks();
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

  /**
   * ADR-089 step 4 (plan §1.1, critique 3 N3): DEFAULT_TUNABLES gains neither step-4 key, not even
   * as `undefined`, which the overlay digest's `canonicalise` would hide; and no rule set of steps 1
   * to 3 carries either.
   */
  it("no step-4 key: DEFAULT_TUNABLES has neither pocket.contact nor throwExec.motion, and no rule set carries one", () => {
    expect("contact" in DEFAULT_TUNABLES.pocket).toBe(false);
    expect("motion" in DEFAULT_TUNABLES.throwExec).toBe(false);
    for (const { tunables } of RULE_SETS) {
      expect("contact" in tunables.pocket).toBe(false);
      expect("motion" in tunables.throwExec).toBe(false);
    }
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
 * the s3 sets call them. `resolveLateTickL` stays at zero under `RULE_SETS`' s3 sets as well, since
 * neither runs a late block on shape L (S3 is shape S; S3L has no late block); C14's shape
 * (`S3L8_TUNABLES`, shape L with the late block, P17 in contracts since c340520 and lifted in
 * E4b) calls it.
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
    // C14's shape runs shape L's late block (P17, E4b), and only through resolveLateTickL.
    for (const spy of STEP3_SPIES) spy.mockClear();
    for (let i = 0; i < 400 && vi.mocked(resolveLateTickL).mock.calls.length === 0; i++) {
      const f = frontWithPicture({ extras: 2, stunts: [{ penetrator: playerId("dt1"), looper: playerId("de1"), complexity: "TRIPLE" }] });
      simulatePassPlay(f.scenario.state, f.calls, `isolation-s3l8-${i}`, S3L8_TUNABLES);
    }
    const onL = named();
    expect(onL["resolveLateTickL"]).toBeGreaterThan(0);
    expect(onL["drawLateBeat"]).toBe(0);
    expect(onL["resolveLateBeatTick"]).toBe(0);
  });
});

/**
 * ADR-089 step 4 — P-18 (plan §7): no rule set of steps 1 to 3 runs a step-4 entry point, play
 * (with and without a picture) or game: the contest, the second arrival, the contact class, the
 * tilt, D21's contact time, the race and rho, the arrived list, the rebuild, the free-run key, the
 * book, and the log's `QB_HIT`, `arrival_contest` and `releaseSeconds` writers. The spies are wired:
 * the step-4 sets (through the test seam, the petitions granted) call them; kind T and contact alone
 * never call the race or rho. `playsTodaysLine`'s T branch is reached only by a tree carrying the
 * contact block, so under every old set it answers what `playsLegacyRules` answers.
 */
describe("ADR-089 step 4 — no rule set before step 4 runs a step-4 entry point (P-18)", () => {
  const named = (): Record<string, number> =>
    Object.fromEntries(STEP4_SPY_TABLE.map(([name, f]) => [name, vi.mocked(f as unknown as (...args: never[]) => unknown).mock.calls.length]));
  const zero = Object.fromEntries(STEP4_SPY_TABLE.map(([name]) => [name, 0]));
  const logSpies = () => ({
    qbHit: vi.spyOn(PlayEventLog.prototype, "qbHit"),
    arrivalContest: vi.spyOn(PlayEventLog.prototype, "arrivalContest"),
    throwBall: vi.spyOn(PlayEventLog.prototype, "throwBall"),
  });

  it("legacy, S, SW, L5, L8, SWH, S2, S2N, S3 and S3L call none of them, play (with and without a picture) and game", () => {
    expect(RULE_SETS.map((r) => r.name)).toEqual(["legacy", "S", "SW", "L5", "L8", "SWH", "S2", "S2N", "S3", "S3L"]);
    const log = logSpies();
    for (const { name, tunables } of RULE_SETS) {
      for (const [, build] of PASS_FIXTURES) {
        for (let i = 0; i < 15; i++) {
          const { state, calls } = build();
          if (!isStep3(name)) simulatePassPlay(state, calls, `isolation-s4-${i}`, tunables);
          simulatePassPlay(state, withPicture(state, calls), `isolation-s4-${i}`, tunables);
        }
      }
    }
    const fixture = buildGameFixture({ seed: "isolation-s4-game" });
    const pictured = { ...fixture.inputs, callers: { home: withLineUp(fixture.inputs.callers.home), away: withLineUp(fixture.inputs.callers.away) } };
    simulateGame(fixture.state, fixture.inputs, fixture.seed);
    simulateGame(fixture.state, pictured, fixture.seed, S2_TUNABLES);
    simulateGame(fixture.state, pictured, fixture.seed, S3_TUNABLES);
    expect(named()).toEqual(zero);
    expect(log.qbHit).not.toHaveBeenCalled();
    expect(log.arrivalContest).not.toHaveBeenCalled();
    expect(log.throwBall).toHaveBeenCalled();
    for (const call of log.throwBall.mock.calls) expect(call[4]).toBeUndefined();
  });

  it("playsTodaysLine is playsLegacyRules under DEFAULT_TUNABLES and every old set; true for kind T alone of the step-4 sets", () => {
    for (const { name, tunables } of [{ name: "default", tunables: DEFAULT_TUNABLES }, ...RULE_SETS]) {
      expect(playsTodaysLine(tunables), name).toBe(playsLegacyRules(tunables));
      expect("contact" in tunables.pocket, name).toBe(false);
    }
    expect(playsTodaysLine(T_TUNABLES)).toBe(true);
    expect(playsLegacyRules(T_TUNABLES)).toBe(false);
    for (const t of [S4_TUNABLES, S4S_TUNABLES, S4L_TUNABLES, S4C_TUNABLES, S4M_TUNABLES]) expect(playsTodaysLine(t)).toBe(false);
  });

  it("the spies are wired: the step-4 sets call every one; kind T and contact alone never run the race or rho", () => {
    const log = logSpies();
    let shedTicks = 0;
    for (const [tunables, pictured] of [[S4_TUNABLES, true], [S4S_TUNABLES, false], [S4L_TUNABLES, false]] as const) {
      for (const [, build] of PASS_FIXTURES) {
        for (let i = 0; i < 30; i++) {
          const { state, calls } = build();
          const p = playStep4(state, pictured ? withPicture(state, calls) : calls, `isolation-s4-on-${i}`, tunables);
          // The rebuild runs once a tick in which a shed did not end in a sack (the design's order).
          const ticks = new Map<number, string[]>();
          for (const r of p.records) if (r.kind === "CONTEST") ticks.set(r.at.tick as number, [...(ticks.get(r.at.tick as number) ?? []), r.payload.band]);
          for (const bands of ticks.values()) if (!bands.includes("RUSHER_SACKS")) shedTicks += 1;
        }
      }
    }
    const on = named();
    for (const [name] of STEP4_SPY_TABLE) expect(on[name], name).toBeGreaterThan(0);
    expect(on["rebuiltTick"]).toBe(shedTicks);
    expect(log.qbHit).toHaveBeenCalled();
    expect(log.arrivalContest).toHaveBeenCalled();
    expect(log.throwBall.mock.calls.some((c) => c[4] !== undefined)).toBe(true);
    for (const spy of STEP4_SPIES) spy.mockClear();
    for (const tunables of [T_TUNABLES, S4C_TUNABLES]) {
      for (const [, build] of PASS_FIXTURES) {
        for (let i = 0; i < 30; i++) {
          const { state, calls } = build();
          playStep4(state, calls, `isolation-t-${i}`, tunables);
        }
      }
    }
    const t = named();
    for (const name of ["arrivalContest", "secondArrival", "contactFrom", "tiltOf", "contactSecondsOf", "rebuiltTick", "arrivedInGridOrder", "ContactBook"]) {
      expect(t[name], name).toBeGreaterThan(0);
    }
    expect(t["throwingHit"]).toBe(0);
    expect(t["rho"]).toBe(0);
  });
});
