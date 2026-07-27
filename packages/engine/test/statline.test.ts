/**
 * ★5 — THE STATLINE REDUCER, AND THE EQUALITY THAT MAKES IT ONE.
 *
 * The first test in this file is the whole point of the design: what the game
 * loop RETURNS as `statlines` must equal what the reducer produces over the
 * events the same call returned. If those two can ever disagree, one of them is
 * a side channel and Charter pillar 3 has been quietly broken
 * (FANTASY-GATE-PHASE1 F1).
 *
 * The rest of the file checks that each column is actually derived — that a
 * completion in the stream turns into a reception, that a sack turns into a
 * sack, that nothing is double-counted — because a reducer that returns zeroes
 * would also pass the equality test.
 */
import { describe, expect, it } from "vitest";
import { reduceStatlines } from "../src/stats/statline.js";
import { simulateGame } from "../src/game/simulateGame.js";
import type { GameEvent, GameEventEnvelope } from "../src/game/events.js";
import { buildGameFixture } from "./gameFixtures.js";

function eventsOf<T extends GameEvent["type"]>(
  events: readonly GameEventEnvelope[],
  type: T,
): Extract<GameEvent, { type: T }>[] {
  return events
    .map((e) => e.event)
    .filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

const fixture = buildGameFixture({ seed: "statlines" });
const result = simulateGame(fixture.state, fixture.inputs, fixture.seed);

describe("★5 — the loop's statlines ARE the reducer's output", () => {
  it("simulateGame().statlines === reduceStatlines(simulateGame().events)", () => {
    expect(result.statlines).toEqual(reduceStatlines(result.events));
  });

  it("the reducer is pure: same stream in, same statlines out", () => {
    expect(reduceStatlines(result.events)).toEqual(reduceStatlines(result.events));
  });

  it("the reducer needs nothing but the stream — no state, no snapshot, no roster", () => {
    // Round-tripping through JSON strips every identity the reducer might have
    // been leaning on; the answer must not change.
    const roundTripped = JSON.parse(JSON.stringify(result.events)) as GameEventEnvelope[];
    expect(reduceStatlines(roundTripped)).toEqual(result.statlines);
  });

  it("an empty stream reduces to an empty box score", () => {
    expect(reduceStatlines([])).toEqual([]);
  });
});

describe("the columns are derived, not zero", () => {
  it("somebody threw, caught, ran and tackled", () => {
    const totals = result.statlines.reduce(
      (a, line) => ({
        attempts: a.attempts + line.passing.attempts,
        completions: a.completions + line.passing.completions,
        carries: a.carries + line.rushing.attempts,
        receptions: a.receptions + line.receiving.receptions,
        tackles: a.tackles + line.defense.tackles,
        sacks: a.sacks + line.passing.sacked,
      }),
      { attempts: 0, completions: 0, carries: 0, receptions: 0, tackles: 0, sacks: 0 },
    );
    expect(totals.attempts).toBeGreaterThan(20);
    expect(totals.completions).toBeGreaterThan(5);
    expect(totals.carries).toBeGreaterThan(20);
    expect(totals.receptions).toBe(totals.completions);
    expect(totals.tackles).toBeGreaterThan(20);
    expect(totals.sacks).toBeGreaterThan(0);
  });

  it("passing yards equal receiving yards, because they are the same yards", () => {
    const passing = result.statlines.reduce((a, l) => a + l.passing.yards, 0);
    const receiving = result.statlines.reduce((a, l) => a + l.receiving.yards, 0);
    expect(passing).toBe(receiving);
  });

  it("passing touchdowns equal receiving touchdowns", () => {
    const passing = result.statlines.reduce((a, l) => a + l.passing.touchdowns, 0);
    const receiving = result.statlines.reduce((a, l) => a + l.receiving.touchdowns, 0);
    expect(passing).toBe(receiving);
  });

  it("interceptions thrown equal interceptions caught, or are credited to nobody", () => {
    const thrown = result.statlines.reduce((a, l) => a + l.passing.interceptions, 0);
    const caught = result.statlines.reduce((a, l) => a + l.defense.interceptions, 0);
    expect(caught).toBeLessThanOrEqual(thrown);
    expect(caught).toBeGreaterThan(0);
  });

  it("every scoring event has a matching touchdown in somebody's line", () => {
    const touchdowns = eventsOf(result.events, "SCORE").filter(
      (e) => e.payload.kind === "TOUCHDOWN",
    ).length;
    const scored = result.statlines.reduce(
      (a, l) => a + l.passing.touchdowns + l.rushing.touchdowns,
      0,
    );
    expect(scored).toBe(touchdowns);
  });

  it("the kicking ledger matches the PLACEKICK events one for one", () => {
    const kicks = eventsOf(result.events, "PLACEKICK");
    const fgAttempts = kicks.filter((k) => k.payload.kind === "FIELD_GOAL").length;
    const fgMade = kicks.filter((k) => k.payload.kind === "FIELD_GOAL" && k.payload.made).length;
    const totals = result.statlines.reduce(
      (a, l) => ({
        attempts: a.attempts + l.kicking.fieldGoalAttempts,
        made: a.made + l.kicking.fieldGoalsMade,
      }),
      { attempts: 0, made: 0 },
    );
    expect(totals.attempts).toBe(fgAttempts);
    expect(totals.made).toBe(fgMade);
  });

  it("punts in the box score match PUNT events one for one", () => {
    const punts = eventsOf(result.events, "PUNT").length;
    const counted = result.statlines.reduce((a, l) => a + l.kicking.punts, 0);
    expect(counted).toBe(punts);
  });

  it("every player is on exactly one team, and it is one of the two playing", () => {
    const teams = new Set(result.statlines.map((l) => String(l.team)));
    expect([...teams].sort()).toEqual(
      [String(result.newState.away), String(result.newState.home)].sort(),
    );
    const ids = result.statlines.map((l) => String(l.player));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("statline order is deterministic, so a diff of two games is a diff", () => {
    const again = simulateGame(
      buildGameFixture({ seed: "statlines" }).state,
      buildGameFixture({ seed: "statlines" }).inputs,
      "statlines",
    );
    expect(again.statlines.map((l) => String(l.player))).toEqual(
      result.statlines.map((l) => String(l.player)),
    );
  });
});

describe("the documented gaps are gaps, not silent wrongness", () => {
  it("a throwaway is not counted as a pass attempt (the engine emits no THROW)", () => {
    const throwaways = result.events
      .map((e) => e.event)
      .filter((e) => e.type === "QB_DECISION" && e.payload.choice === "THROWAWAY").length;
    const throws = result.events.map((e) => e.event).filter((e) => e.type === "THROW").length;
    const attempts = result.statlines.reduce((a, l) => a + l.passing.attempts, 0);
    expect(attempts).toBe(throws);
    // Documented divergence from real scoring, asserted so it cannot drift
    // silently into being "fixed" in the reducer instead of at the producer.
    expect(throwaways).toBeGreaterThanOrEqual(0);
  });

  it("team sacks may exceed credited individual sacks — a coverage sack has no sacker", () => {
    const taken = result.statlines.reduce((a, l) => a + l.passing.sacked, 0);
    const credited = result.statlines.reduce((a, l) => a + l.defense.sacks, 0);
    expect(credited).toBeLessThanOrEqual(taken);
  });
});
