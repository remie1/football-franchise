/**
 * THE PLAY-CALLING SEAM.
 *
 * Two things are worth testing here and the tendency model is not one of them
 * (there is not one, and there must not be one until calibration owns the frozen
 * baseline caller). What matters is:
 *
 *  1. the SEAM works — an injected caller is actually the one the loop asks, and
 *     a caller that hands back a coherent card gets a simulated play;
 *  2. the fourth-down policy is a pure function of the situation, with no die in
 *     it, so it is not a source of noise in every drive metric.
 */
import { describe, expect, it } from "vitest";
import { createRng, gameId } from "@ff/contracts";
import type { MatchGameState } from "../src/types.js";
import { defaultPlayCaller, fourthDownPolicy, passRateFor } from "../src/game/playCaller.js";
import { COVERAGE_CARDS, PASS_CARDS, RUN_CARDS } from "../src/game/playbook.js";
import { simulateGame } from "../src/game/simulateGame.js";
import { assertCoherentCall } from "../src/validate/playCall.js";
import { TUNABLES } from "../src/tunables.js";
import type {
  DecisionSituation,
  FourthDownRequest,
  OffensiveCallRequest,
  TeamSnapshot,
} from "../src/game/types.js";
import { GAME_STAMP, buildGameFixture, buildTeamSnapshot } from "./gameFixtures.js";

const offense: TeamSnapshot = buildTeamSnapshot("t-a", 0);
const defense: TeamSnapshot = buildTeamSnapshot("t-b", 0);

function situation(overrides: Partial<DecisionSituation> = {}): DecisionSituation {
  return {
    period: 1,
    clockSeconds: 700,
    down: 1,
    distance: 10,
    ballOn: 40,
    offense: offense.team,
    defense: defense.team,
    offenseScore: 0,
    defenseScore: 0,
    twoMinute: false,
    ...overrides,
  };
}

function fourthDown(overrides: Partial<DecisionSituation> & { fieldGoalDistanceYards?: number } = {}): FourthDownRequest {
  const { fieldGoalDistanceYards, ...rest } = overrides;
  const s = situation({ down: 4, ...rest });
  return {
    kind: "FOURTH_DOWN",
    authority: "COACH",
    situation: s,
    offense,
    fieldGoalDistanceYards: fieldGoalDistanceYards ?? 100 - s.ballOn + 17,
  };
}

const playState: MatchGameState = {
  gameId: gameId("g-corpus"),
  at: GAME_STAMP,
  playNumber: 1,
  nextEventSeq: 0,
  players: { ...defense.players, ...offense.players },
  offenseTeam: offense.team,
  defenseTeam: defense.team,
  quarterback: offense.offense.quarterback,
  down: 1,
  distance: 10,
  ballOn: 25,
  clockSeconds: 900,
};

describe("the fixture-grade corpus produces coherent cards", () => {
  it("every pass card passes ADR-006's coherence checks against every coverage", () => {
    for (const card of PASS_CARDS) {
      for (const coverage of COVERAGE_CARDS) {
        expect(() =>
          assertCoherentCall(playState, {
            offense: card.build(offense.offense, defense.defense),
            defense: coverage.build(offense.offense, defense.defense),
          }),
        ).not.toThrow();
      }
    }
  });

  it("every run card passes ADR-006's coherence checks against every coverage", () => {
    for (const card of RUN_CARDS) {
      for (const coverage of COVERAGE_CARDS) {
        expect(() =>
          assertCoherentCall(playState, {
            offense: card.build(offense.offense, defense.defense),
            defense: coverage.build(offense.offense, defense.defense),
          }),
        ).not.toThrow();
      }
    }
  });

  it("the corpus is small and says so — this is a fixture, not a playbook", () => {
    expect(PASS_CARDS.length + RUN_CARDS.length + COVERAGE_CARDS.length).toBeLessThan(15);
  });
});

describe("the fourth-down policy is a pure function of the situation", () => {
  it("kicks it from field-goal range", () => {
    expect(fourthDownPolicy(fourthDown({ ballOn: 70, distance: 8 }))).toBe("FIELD_GOAL");
  });

  it("punts from its own half on fourth and long", () => {
    expect(fourthDownPolicy(fourthDown({ ballOn: 30, distance: 9 }))).toBe("PUNT");
  });

  it("goes for it on fourth and short in no-man's land", () => {
    expect(fourthDownPolicy(fourthDown({ ballOn: 58, distance: 1 }))).toBe("GO_FOR_IT");
  });

  it("goes for it when trailing by more than a score late", () => {
    expect(
      fourthDownPolicy(
        fourthDown({ ballOn: 45, distance: 12, period: 4, clockSeconds: 120, offenseScore: 10, defenseScore: 24 }),
      ),
    ).toBe("GO_FOR_IT");
  });

  it("is deterministic — the same situation always gets the same answer", () => {
    const request = fourthDown({ ballOn: 52, distance: 3 });
    const answers = new Set(Array.from({ length: 50 }, () => fourthDownPolicy(request)));
    expect(answers.size).toBe(1);
  });
});

describe("the pass rate", () => {
  it("throws more on third down and less on third and one", () => {
    expect(passRateFor({ down: 3, distance: 8, twoMinute: false })).toBeGreaterThan(
      passRateFor({ down: 1, distance: 10, twoMinute: false }),
    );
    expect(passRateFor({ down: 3, distance: 1, twoMinute: false })).toBeLessThan(
      passRateFor({ down: 3, distance: 8, twoMinute: false }),
    );
  });

  it("throws in the two-minute drill", () => {
    expect(passRateFor({ down: 1, distance: 10, twoMinute: true })).toBe(
      TUNABLES.game.caller.twoMinutePassRate,
    );
  });
});

describe("the seam", () => {
  it("the caller is injected, and the loop uses the one it was given", () => {
    let asked = 0;
    const spy = defaultPlayCaller("spy");
    const wrapped = {
      ...spy,
      callOffense(request: OffensiveCallRequest, rng: ReturnType<typeof createRng>) {
        asked += 1;
        return spy.callOffense(request, rng);
      },
    };
    const fixture = buildGameFixture({ seed: "seam" });
    simulateGame(
      fixture.state,
      { ...fixture.inputs, callers: { home: wrapped, away: wrapped } },
      fixture.seed,
    );
    expect(asked).toBeGreaterThan(80);
  });

  it("two callers with the same policy give the same game as one", () => {
    const a = buildGameFixture({ seed: "seam-2" });
    const b = buildGameFixture({ seed: "seam-2" });
    const shared = defaultPlayCaller("baseline-home");
    const first = simulateGame(a.state, a.inputs, a.seed);
    const second = simulateGame(
      b.state,
      { ...b.inputs, callers: { home: shared, away: defaultPlayCaller("baseline-away") } },
      b.seed,
    );
    expect(JSON.stringify(second.events)).toBe(JSON.stringify(first.events));
  });
});
