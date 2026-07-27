/**
 * SPECIAL TEAMS — the three placeholder resolvers, unit-tested.
 *
 * These tests deliberately assert SHAPE and RANGE rather than precise values:
 * every number behind them is an invention (the design doc specifies no kicking
 * game at all), so a test that pinned an exact make rate would be pinning a
 * guess. What they do assert is that the resolvers are monotone in the things
 * they should be monotone in, that they never produce an illegal field position,
 * and that they are pure functions of their seed.
 */
import { describe, expect, it } from "vitest";
import { createRng } from "@ff/contracts";
import type { PlayerState } from "@ff/contracts";
import {
  fieldGoalDistanceFrom,
  missedFieldGoalYardLine,
  resolveKickoff,
  resolvePlacekick,
  resolvePunt,
} from "../src/game/specialTeams.js";
import { TUNABLES } from "../src/tunables.js";
import { makePlayer } from "./fixtures.js";

const ST = TUNABLES.game.specialTeams;

function kicker(leg: number, placement: number): PlayerState {
  return makePlayer("k", "Kicker", "K", { strength: leg, accuracy: placement });
}
function punter(leg: number): PlayerState {
  return makePlayer("p", "Punter", "P", { strength: leg, accuracy: 70 });
}
function returner(speed: number): PlayerState {
  return makePlayer("r", "Returner", "WR", { speed });
}

function makeRate(distance: number, samples = 2000, leg = 78, placement = 80): number {
  let made = 0;
  for (let i = 0; i < samples; i++) {
    const result = resolvePlacekick({ tunables: TUNABLES,
      kicker: kicker(leg, placement),
      distanceYards: distance,
      rng: createRng("st", `fg:${distance}:${i}`),
    });
    if (result.made) made += 1;
  }
  return made / samples;
}

describe("the placekick", () => {
  it("distance is the distance to the goal line plus the snap and the hold", () => {
    expect(fieldGoalDistanceFrom(TUNABLES, 80)).toBe(20 + ST.fieldGoal.snapAndHoldYards);
    expect(fieldGoalDistanceFrom(TUNABLES, 50)).toBe(50 + ST.fieldGoal.snapAndHoldYards);
  });

  it("is monotone in distance — a longer kick is never easier", () => {
    const rates = [25, 35, 45, 55].map((d) => makeRate(d));
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThanOrEqual((rates[i - 1] ?? 1) + 0.01);
    }
  });

  it("lands in the neighbourhood of real NFL make rates for an average leg", () => {
    // Wide bands on purpose: this is an invented curve calibrated by eye against
    // ~95% / ~80% / ~65%, and the point of the test is that it has not drifted
    // into "always" or "never", not that the numbers are right.
    expect(makeRate(30)).toBeGreaterThan(0.85);
    expect(makeRate(40)).toBeGreaterThan(0.6);
    expect(makeRate(40)).toBeLessThan(0.95);
    expect(makeRate(52)).toBeGreaterThan(0.35);
    expect(makeRate(52)).toBeLessThan(0.85);
  });

  it("a better kicker makes more of them", () => {
    expect(makeRate(45, 2000, 95, 95)).toBeGreaterThan(makeRate(45, 2000, 55, 55));
  });

  it("is a pure function of its seed", () => {
    const a = resolvePlacekick({ tunables: TUNABLES, kicker: kicker(78, 80), distanceYards: 44, rng: createRng("s", "l") });
    const b = resolvePlacekick({ tunables: TUNABLES, kicker: kicker(78, 80), distanceYards: 44, rng: createRng("s", "l") });
    expect(b).toEqual(a);
  });

  it("a miss gives the ball to the defence at the spot of the kick, never inside its own 20", () => {
    expect(missedFieldGoalYardLine(TUNABLES, 60)).toBe(100 - (60 - ST.fieldGoal.missSpotYardsBehindLos));
    // Deep in the red zone, the touchback-equivalent floor applies.
    expect(missedFieldGoalYardLine(TUNABLES, 95)).toBe(ST.fieldGoal.missMinimumYardLine);
  });
});

describe("the punt", () => {
  it("never leaves the ball outside the field of play", () => {
    for (let from = 1; from < 100; from += 3) {
      for (let i = 0; i < 25; i++) {
        const result = resolvePunt({ tunables: TUNABLES,
          punter: punter(76),
          returner: returner(88),
          fromYardLine: from,
          rng: createRng("punt", `${from}:${i}`),
        });
        expect(result.resultYardLine).toBeGreaterThan(0);
        expect(result.resultYardLine).toBeLessThan(100);
        expect(result.grossYards).toBeGreaterThanOrEqual(ST.punt.minGrossYards);
        expect(result.grossYards).toBeLessThanOrEqual(ST.punt.maxGrossYards);
      }
    }
  });

  it("a punt from deep in the opponent's half is a touchback rather than a 46-yard gain", () => {
    let touchbacks = 0;
    for (let i = 0; i < 200; i++) {
      const result = resolvePunt({ tunables: TUNABLES,
        punter: punter(76),
        returner: returner(88),
        fromYardLine: 60,
        rng: createRng("punt", `tb:${i}`),
      });
      if (result.touchback) {
        touchbacks += 1;
        expect(result.resultYardLine).toBe(ST.punt.touchbackYardLine);
      }
    }
    expect(touchbacks).toBeGreaterThan(0);
  });

  it("gross distance averages near the league's", () => {
    let total = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      total += resolvePunt({ tunables: TUNABLES,
        punter: punter(76),
        returner: returner(88),
        fromYardLine: 30,
        rng: createRng("punt", `avg:${i}`),
      }).grossYards;
    }
    expect(total / n).toBeGreaterThan(42);
    expect(total / n).toBeLessThan(52);
  });

  it("a stronger leg punts it further", () => {
    const mean = (leg: number): number => {
      let total = 0;
      for (let i = 0; i < 500; i++) {
        total += resolvePunt({ tunables: TUNABLES,
          punter: punter(leg),
          returner: returner(80),
          fromYardLine: 25,
          rng: createRng("punt", `leg:${leg}:${i}`),
        }).grossYards;
      }
      return total / 500;
    };
    expect(mean(95)).toBeGreaterThan(mean(50));
  });

  it("a ball fielded inside the receiving team's own 10 is downed, not returned", () => {
    let downed = 0;
    for (let i = 0; i < 400; i++) {
      const result = resolvePunt({ tunables: TUNABLES,
        punter: punter(90),
        returner: returner(88),
        fromYardLine: 48,
        rng: createRng("punt", `downed:${i}`),
      });
      if (result.downed) {
        downed += 1;
        expect(result.returnYards).toBe(0);
        expect(result.resultYardLine).toBeLessThan(ST.punt.downedInsideYardLine);
      }
    }
    expect(downed).toBeGreaterThan(0);
  });
});

describe("the kickoff", () => {
  it("a touchback puts the ball on the tunable yard line", () => {
    let touchbacks = 0;
    let returns = 0;
    for (let i = 0; i < 500; i++) {
      const result = resolveKickoff({ tunables: TUNABLES,
        kicker: kicker(78, 80),
        returner: returner(88),
        rng: createRng("ko", `${i}`),
      });
      if (result.touchback) {
        touchbacks += 1;
        expect(result.resultYardLine).toBe(ST.kickoff.touchbackYardLine);
        expect(result.returnCheck).toBeUndefined();
      } else {
        returns += 1;
        expect(result.returnCheck).toBeDefined();
        expect(result.resultYardLine).toBeGreaterThan(0);
        expect(result.resultYardLine).toBeLessThan(100);
      }
    }
    expect(touchbacks).toBeGreaterThan(50);
    expect(returns).toBeGreaterThan(50);
  });

  it("average starting field position is in the NFL's neighbourhood", () => {
    let total = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      total += resolveKickoff({ tunables: TUNABLES,
        kicker: kicker(78, 80),
        returner: returner(85),
        rng: createRng("ko", `avg:${i}`),
      }).resultYardLine;
    }
    expect(total / n).toBeGreaterThan(24);
    expect(total / n).toBeLessThan(32);
  });

  it("PLACEHOLDER DEPTH, ASSERTED: no kickoff return can reach the end zone", () => {
    // Not an oversight — `maxReturnYards` from `returnStartYardLine` tops out
    // short of the goal line by construction. The test exists so that the day a
    // real return model lands, this assertion fails and somebody notices.
    const ceiling = ST.kickoff.returnStartYardLine + ST.kickoff.maxReturnYards;
    expect(ceiling).toBeLessThan(100);
  });
});
