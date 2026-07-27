/**
 * ONE OWNER FOR THE BALL TRANSITION (FANTASY-GATE-PHASE1 §3.11).
 *
 * There used to be two copies of these rules, `applyOutcome` in `passPlay.ts`
 * and `applyRunOutcome` in `runPlay.ts`, and they had already drifted — the run
 * copy had no turnover branch. This file tests the single owner directly, and
 * then asserts the property that made unifying it worth doing: the SAME
 * transition produces the SAME state whichever simulator produced the outcome.
 */
import { describe, expect, it } from "vitest";
import { applyPlayOutcome } from "../src/sim/outcome.js";
import { simulatePassPlay } from "../src/sim/passPlay.js";
import { simulateRunPlay } from "../src/sim/runPlay.js";
import { TUNABLES } from "../src/tunables.js";
import { buildRunScenario, buildScenario } from "./fixtures.js";

const base = buildScenario().state;

describe("the down and distance", () => {
  it("a gain short of the sticks advances the down and shortens the distance", () => {
    const next = applyPlayOutcome({ ...base, down: 1, distance: 10, ballOn: 40 }, {
      yards: 4, turnover: false, clockRunoff: 6,
    }, 0);
    expect(next.down).toBe(2);
    expect(next.distance).toBe(6);
    expect(next.ballOn).toBe(44);
  });

  it("a gain that reaches the sticks resets to first and ten", () => {
    const next = applyPlayOutcome({ ...base, down: 3, distance: 7, ballOn: 40 }, {
      yards: 7, turnover: false, clockRunoff: 6,
    }, 0);
    expect(next.down).toBe(1);
    expect(next.distance).toBe(TUNABLES.result.firstDownResetsDistance);
  });

  it("a loss lengthens the distance", () => {
    const next = applyPlayOutcome({ ...base, down: 2, distance: 8, ballOn: 40 }, {
      yards: -7, turnover: false, clockRunoff: 11,
    }, 0);
    expect(next.down).toBe(3);
    expect(next.distance).toBe(15);
    expect(next.ballOn).toBe(33);
  });

  it("hands back down 5, because a series is a GAME rule and not this function's", () => {
    const next = applyPlayOutcome({ ...base, down: 4, distance: 9, ballOn: 40 }, {
      yards: 2, turnover: false, clockRunoff: 6,
    }, 0);
    expect(next.down).toBe(5);
  });
});

describe("possession", () => {
  it("a turnover flips the teams and mirrors the spot", () => {
    const next = applyPlayOutcome({ ...base, ballOn: 35, down: 2, distance: 6 }, {
      yards: 20, turnover: true, clockRunoff: 4,
    }, 0);
    expect(next.offenseTeam).toBe(base.defenseTeam);
    expect(next.defenseTeam).toBe(base.offenseTeam);
    expect(next.ballOn).toBe(100 - 55);
    expect(next.down).toBe(1);
    expect(next.distance).toBe(TUNABLES.result.firstDownResetsDistance);
  });

  it("the spot is clamped to the field at both ends", () => {
    expect(applyPlayOutcome({ ...base, ballOn: 3 }, { yards: -20, turnover: false, clockRunoff: 6 }, 0).ballOn).toBe(0);
    expect(applyPlayOutcome({ ...base, ballOn: 95 }, { yards: 40, turnover: false, clockRunoff: 6 }, 0).ballOn).toBe(100);
  });
});

describe("the clock and the bookkeeping", () => {
  it("runoff is subtracted and never goes negative", () => {
    expect(applyPlayOutcome({ ...base, clockSeconds: 4 }, { yards: 1, turnover: false, clockRunoff: 11 }, 0).clockSeconds).toBe(0);
  });

  it("the play number advances and the sequence number is taken from the log", () => {
    const next = applyPlayOutcome({ ...base, playNumber: 12 }, { yards: 1, turnover: false, clockRunoff: 6 }, 987);
    expect(next.playNumber).toBe(13);
    expect(next.nextEventSeq).toBe(987);
  });

  it("the input state is not mutated", () => {
    const before = JSON.stringify({ ...base, players: undefined });
    applyPlayOutcome(base, { yards: 12, turnover: true, clockRunoff: 6 }, 5);
    expect(JSON.stringify({ ...base, players: undefined })).toBe(before);
  });
});

describe("both simulators go through the same owner", () => {
  it("a pass play's newState is what applyPlayOutcome would produce from its PLAY_RESULT", () => {
    const scenario = buildScenario();
    const played = simulatePassPlay(scenario.state, scenario.calls, "one-owner-pass");
    const result = played.events
      .map((e) => e.event)
      .find((e) => e.type === "PLAY_RESULT");
    expect(result?.type).toBe("PLAY_RESULT");
    if (result?.type !== "PLAY_RESULT") return;
    const rebuilt = applyPlayOutcome(
      scenario.state,
      {
        yards: result.payload.yards,
        turnover: result.payload.turnover,
        clockRunoff: result.payload.clockRunoff,
        ...(result.payload.score === undefined ? {} : { score: result.payload.score }),
      },
      played.newState.nextEventSeq,
    );
    expect(rebuilt).toEqual(played.newState);
  });

  it("a run play's newState is what applyPlayOutcome would produce from its PLAY_RESULT", () => {
    const scenario = buildRunScenario();
    const played = simulateRunPlay(scenario.state, scenario.calls, "one-owner-run");
    const result = played.events
      .map((e) => e.event)
      .find((e) => e.type === "PLAY_RESULT");
    if (result?.type !== "PLAY_RESULT") throw new Error("no PLAY_RESULT");
    const rebuilt = applyPlayOutcome(
      scenario.state,
      {
        yards: result.payload.yards,
        turnover: result.payload.turnover,
        clockRunoff: result.payload.clockRunoff,
        ...(result.payload.score === undefined ? {} : { score: result.payload.score }),
      },
      played.newState.nextEventSeq,
    );
    expect(rebuilt).toEqual(played.newState);
  });
});
