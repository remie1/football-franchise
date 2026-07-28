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
import { gameId as gameIdOf, playId, playerId, teamId } from "@ff/contracts";
import type { CalendarStamp } from "@ff/contracts";
import { reduceStatlines } from "../src/stats/statline.js";
import type { PassPlayStartPayload } from "../src/types.js";
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

/**
 * EVERY MAN THE STREAM PUTS ON THE FIELD HAS A SIDE — and the day one of them
 * did not, a whole play left the box score without anything looking wrong.
 *
 * `PLAY_START.offense.availableBlockers` (ADR-022, §7.4's men kept in who are
 * not pre-paired to a rusher) was published by the producer and never read by
 * this reducer. `buildRecoverySpots` puts exactly those men in §12.4's recovery
 * pool, so when one of them fell on a tipped ball the reducer could not resolve
 * his team, and dropped the reception AND the quarterback's completion. It was
 * found as a one-completion disagreement with calibration's independent fold —
 * which is the only reason it was found at all.
 */
describe("the men in protection are on the field too", () => {
  const gameId = gameIdOf("g:test");
  const play = playId("g:test:play:1");
  const at: CalendarStamp = { season: 2026, phase: "REGULAR_SEASON", week: 1, day: 1 };
  const offenseTeam = teamId("t:home");
  const defenseTeam = teamId("t:away");
  const qb = playerId("p:home:QB0");
  const wr = playerId("p:home:WR0");
  const centre = playerId("p:home:C0");
  const cb = playerId("p:away:CB0");

  /**
   * The minimum stream that reproduces it: the centre is ON THE FIELD only as an
   * available blocker, and he is the man who comes up with the tipped ball.
   *
   * The PLAY_START payload is built as a `PassPlayStartPayload` rather than as a
   * cast object literal, so this fixture cannot drift away from what the producer
   * actually emits — which is the whole hazard, since contracts types the payload
   * as `unknown` and a hand-written shape would compile whatever it said.
   */
  function stream(): GameEventEnvelope[] {
    const base = { gameId, playId: play };
    const start: PassPlayStartPayload = {
      kind: "PASS_PLAY_V1",
      offense: {
        team: offenseTeam,
        call: "Mesh",
        formation: "Shotgun Doubles Right",
        quarterback: qb,
        readSystem: "FULL_FIELD",
        routes: [{ receiver: wr, routeName: "Dig", depthClass: "INTERMEDIATE", airYards: 14 }],
        readOrder: [wr],
        protection: [],
        availableBlockers: [centre],
        // ADR-026's tail is empty here on purpose: the centre is a man the CARD
        // kept in, not a protector whose rusher failed to rush. The reducer has
        // to find him from `availableBlockers` either way.
        unblockedProtectors: [],
        hotConversions: [],
      },
      defense: {
        team: defenseTeam,
        call: "Cover 3",
        front: "4-3",
        coverage: "ZONE",
        assignments: [],
        rush: [],
        unaccountedRushers: [],
        blitzDisguise: "STANDARD",
        stunts: [],
      },
      situation: { down: 1, distance: 10, ballOn: 24, clockSeconds: 500 },
    };
    const events: GameEvent[] = [
      { type: "PLAY_START", ...base, payload: start },
      {
        type: "THROW",
        ...base,
        payload: { target: wr, throwType: "BULLET", accuracyTier: "SUCCESS" },
      },
      {
        type: "TIPPED_BALL",
        ...base,
        payload: {
          deflector: cb,
          rollRef: "r:quality",
          finalTargetNumber: 55,
          eligible: [centre],
          attempts: [{ player: centre, rollRef: "r:recover" }],
          recoveredBy: centre,
        },
      },
      { type: "PLAY_RESULT", ...base, payload: { yards: 6, turnover: false, clockRunoff: 5.5 } },
    ];
    return events.map((event, seq) => ({ seq, at, event }));
  }

  it("a tipped ball an AVAILABLE blocker recovers is a completion and a reception", () => {
    const lines = reduceStatlines(stream());
    const passer = lines.find((l) => String(l.player) === String(qb));
    const recoverer = lines.find((l) => String(l.player) === String(centre));
    expect(passer?.passing.attempts).toBe(1);
    expect(passer?.passing.completions).toBe(1);
    expect(passer?.passing.yards).toBe(6);
    expect(recoverer?.team).toBe(offenseTeam);
    expect(recoverer?.receiving.receptions).toBe(1);
    expect(recoverer?.receiving.yards).toBe(6);
  });

  it("an available blocker is on the field, so he has a line and a team", () => {
    const lines = reduceStatlines(stream());
    expect(lines.map((l) => String(l.player))).toContain(String(centre));
  });

  /**
   * The invariant behind the fix, asserted over a whole real game rather than a
   * hand-built stream: nobody the producer says is on the field is unknown to
   * the reducer. This is what would have caught it the first time.
   */
  it("every man named in a PLAY_START has a statline, over a whole game", () => {
    const known = new Set(result.statlines.map((l) => String(l.player)));
    for (const start of eventsOf(result.events, "PLAY_START")) {
      const root = start.payload as unknown as Record<string, unknown>;
      const offense = (root["offense"] ?? {}) as Record<string, unknown>;
      const available = Array.isArray(offense["availableBlockers"])
        ? (offense["availableBlockers"] as readonly unknown[])
        : [];
      for (const id of available) expect(known).toContain(String(id));
    }
  });
});
