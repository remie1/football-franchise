/**
 * ADR-089 step 1 — under `legacy` no new branch runs (plan §4's proof, items 1, 2 and 5; S8).
 *
 * The block-clock and approach modules are wrapped in counting pass-throughs: a legacy play and a
 * legacy game call neither (no beat is drawn, no approach is computed, `withApproach` never adds a
 * key), and the same plays under `pocket-1` call both, so the spies are proven to be wired.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/resolve/beatClock.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/beatClock.js")>();
  return { ...real, drawBeat: vi.fn(real.drawBeat), resolveBeatTick: vi.fn(real.resolveBeatTick) };
});
vi.mock("../src/resolve/approach.js", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/resolve/approach.js")>();
  return { ...real, threatApproachOf: vi.fn(real.threatApproachOf), withApproach: vi.fn(real.withApproach) };
});

import { simulateGame, simulatePassPlay } from "../src/index.js";
import { drawBeat, resolveBeatTick } from "../src/resolve/beatClock.js";
import { threatApproachOf, withApproach } from "../src/resolve/approach.js";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import { buildGameFixture } from "./gameFixtures.js";
import { buildFrontScenario, buildLopsidedRushScenario, buildScenario, buildScramblerScenario } from "./fixtures.js";
import { L5_TUNABLES, SW_TUNABLES } from "./pocketTunables.js";

const FIXTURES = [buildScenario, buildLopsidedRushScenario, buildScramblerScenario, () => buildFrontScenario({ extras: 2 })];

afterEach(() => {
  vi.mocked(drawBeat).mockClear();
  vi.mocked(resolveBeatTick).mockClear();
  vi.mocked(threatApproachOf).mockClear();
  vi.mocked(withApproach).mockClear();
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
