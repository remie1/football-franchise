/**
 * FREE, UNGATED unit coverage for `src/knownTruth/geometryTimeRetirement.ts` — the RULING 2
 * reclassifier. Synthetic streams, hand-built, so the GEOMETRY and TIME rules are checked against a
 * known-by-construction answer rather than only against the corpus self-check in
 * `test/ruling2Dispatch.test.ts` (which proves reproduction, not correctness of the counterfactual).
 */
import { describe, expect, it } from "vitest";
import type { GameId, MatchEventEnvelope, PlayerId, PlayId } from "@ff/contracts";
import { DEFAULT_TUNABLES } from "@ff/engine";
import { reclassifyGame } from "../src/knownTruth/geometryTimeRetirement.js";

const AT = { season: 2024, phase: "REGULAR_SEASON", week: 1, day: 1 } as const;
const GAME_ID = "g1" as GameId;
const PLAY_ID = "g1:play:0" as PlayId;

let seq = 0;
function env(event: MatchEventEnvelope["event"]): MatchEventEnvelope {
  seq += 1;
  return { seq, at: AT, event };
}

function playStart(): MatchEventEnvelope {
  return env({ type: "PLAY_START", gameId: GAME_ID, playId: PLAY_ID, payload: { kind: "PASS_PLAY_V1" } });
}
function tick(t: number): MatchEventEnvelope {
  return env({ type: "TICK", gameId: GAME_ID, playId: PLAY_ID, payload: { tick: t } });
}
function pocket(status: "CLEAN" | "PRESSURE" | "COLLAPSING" | "IMMEDIATE"): MatchEventEnvelope {
  return env({ type: "POCKET_STATUS", gameId: GAME_ID, playId: PLAY_ID, payload: { status } });
}
function threat(args: {
  rusher: string;
  alignment: "EDGE" | "INTERIOR";
  etaTick: number;
  state: "TRAVELLING" | "DELAYED" | "RESET" | "ARRIVED";
}): MatchEventEnvelope {
  return env({
    type: "RUSH_THREAT",
    gameId: GAME_ID,
    playId: PLAY_ID,
    payload: {
      rusher: args.rusher as PlayerId,
      alignment: args.alignment,
      origin: "WON_REP",
      rollRef: "r1",
      etaTick: args.etaTick,
      state: args.state,
    },
  });
}
function stepUp(): MatchEventEnvelope {
  return env({ type: "QB_DECISION", gameId: GAME_ID, playId: PLAY_ID, payload: { choice: "STEP_UP" } });
}
function scrambleCheck(): MatchEventEnvelope {
  return env({
    type: "CHECK",
    gameId: GAME_ID,
    playId: PLAY_ID,
    payload: {
      checkKind: "scramble",
      actors: [],
      roll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: "r1" },
      tier: "SUCCESS",
      margin: 0,
      testsAttrs: [],
    },
  });
}
function endPlay(): MatchEventEnvelope {
  // A closing PLAY_START from a following, non-pass play flushes the buffer.
  return env({ type: "PLAY_START", gameId: GAME_ID, playId: "g1:play:1" as PlayId, payload: { kind: "RUN_PLAY_V1" } });
}

// The arrival-only-base classification `floorFromArrival` reads:
// immediateWithinSeconds 0.0, collapsingWithinSeconds 1.0, pressureWithinSeconds POS_INF (default).
const T = DEFAULT_TUNABLES;

describe("geometryTimeRetirement — identity reproduction", () => {
  it("reproduces the real pocket-status stream when nothing is retired", () => {
    // eta far beyond every check tick, so `pressureWithinSeconds` (POS_INF) keeps every check at
    // PRESSURE and the test is not incidentally exercising the COLLAPSING/IMMEDIATE boundaries.
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 100.0, state: "TRAVELLING" }),
      pocket("PRESSURE"),
      tick(1.0),
      pocket("PRESSURE"),
      tick(1.5),
      pocket("PRESSURE"),
      endPlay(),
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play).toBeDefined();
    expect(play?.identityMismatches).toBe(0);
    expect(play?.identityChecks).toBe(3);
    expect(play?.identityPressured).toBe(true);
  });
});

describe("geometryTimeRetirement — GEOMETRY", () => {
  it("retires an EDGE threat on STEP_UP, but leaves the identity stream (and INTERIOR threats) alone", () => {
    // The play runs to tick 4.0, well past every eta below, so TIME retirement cannot be what is
    // observed here — only GEOMETRY is live in this fixture. No POCKET_STATUS check is published
    // before the STEP_UP, so the ONLY check on the record post-dates the retirement: this isolates
    // "does geometry retirement clear an otherwise-dirty pocket" from "was it ever dirty at all".
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 2.5, state: "TRAVELLING" }),
      tick(1.0),
      stepUp(),
      // real engine would DELAY the edge threat here; the counterfactual instead drops him
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 3.5, state: "DELAYED" }),
      pocket("PRESSURE"), // real stream still dirty — identity must say so
      tick(4.0),
      endPlay(),
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play?.identityMismatches).toBe(0); // identity still tracks the real (undelayed-by-us) stream
    expect(play?.identityPressured).toBe(true);
    expect(play?.counterfactualPressured).toBe(false); // the only threat was geometry-retired
    expect(play?.geometryRetiredThreats).toBe(1);
  });

  it("does not retire an INTERIOR threat on STEP_UP", () => {
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "int1", alignment: "INTERIOR", etaTick: 1.5, state: "TRAVELLING" }),
      tick(1.0),
      stepUp(),
      tick(1.5),
      pocket("PRESSURE"),
      endPlay(),
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play?.counterfactualPressured).toBe(true);
    expect(play?.geometryRetiredThreats).toBe(0);
  });

  it("a fresh win (TRAVELLING) after a geometry retirement re-establishes the threat", () => {
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 2.0, state: "TRAVELLING" }),
      pocket("PRESSURE"),
      tick(1.0),
      stepUp(), // geometry-retires edge1 in the counterfactual
      pocket("CLEAN"), // (real stream would still be dirty in practice; not asserted here)
      tick(1.5),
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 2.5, state: "TRAVELLING" }), // beats his man again
      pocket("PRESSURE"),
      tick(4.0),
      endPlay(),
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play?.geometryRetiredThreats).toBe(1);
    expect(play?.counterfactualPressured).toBe(true); // the fresh win re-dirties the counterfactual pocket
  });
});

describe("geometryTimeRetirement — TIME", () => {
  it("retires a threat whose etaTick exceeds the play's actual terminal tick, from birth", () => {
    const events = [
      playStart(),
      tick(0.5),
      // Created at 0.5 with a 3.0s travel (the engine's own clamp ceiling): eta 3.5.
      threat({ rusher: "late1", alignment: "EDGE", etaTick: 3.5, state: "TRAVELLING" }),
      pocket("PRESSURE"), // real: dirty from the moment he is created
      tick(1.0),
      pocket("PRESSURE"),
      endPlay(), // the play's own terminal tick is 1.0 — he could never have arrived by 3.5
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play?.identityPressured).toBe(true); // the real stream is unaffected
    expect(play?.counterfactualPressured).toBe(false); // TIME retires him for his whole life
    expect(play?.timeRetiredThreats).toBe(1);
  });

  it("does not retire a threat whose etaTick lands at or before the terminal tick", () => {
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "ontime1", alignment: "EDGE", etaTick: 1.0, state: "TRAVELLING" }),
      pocket("PRESSURE"),
      tick(1.0),
      pocket("IMMEDIATE"),
      endPlay(),
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play?.counterfactualPressured).toBe(true);
    expect(play?.timeRetiredThreats).toBe(0);
  });
});

describe("geometryTimeRetirement — RESET clears both mirrors", () => {
  it("a RESET removes the threat from identity and counterfactual alike", () => {
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 5.0, state: "TRAVELLING" }), // TIME-retirable
      tick(1.0),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 5.0, state: "RESET" }),
      pocket("CLEAN"),
      endPlay(),
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play?.identityMismatches).toBe(0);
    expect(play?.identityPressured).toBe(false);
    expect(play?.counterfactualPressured).toBe(false);
  });
});

describe("geometryTimeRetirement — the §8.8 pursuit-clock boundary", () => {
  it("excludes (does not silently classify) a play carrying a scramble CHECK, and counts it", () => {
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 1.5, state: "TRAVELLING" }),
      pocket("PRESSURE"),
      tick(1.0),
      scrambleCheck(),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 1.5, state: "RESET" }),
      // pursuit-governed ticks follow, unreconstructable — not modelled here
      endPlay(),
    ];
    const result = reclassifyGame(events, T);
    expect(result.plays.length).toBe(0);
    expect(result.excludedForScramble).toBe(1);
  });
});

describe("geometryTimeRetirement — non-pass plays are skipped", () => {
  it("produces no dropback record for a run play", () => {
    const events = [
      env({ type: "PLAY_START", gameId: GAME_ID, playId: PLAY_ID, payload: { kind: "RUN_PLAY_V1" } }),
      tick(0.5),
      endPlay(),
    ];
    const plays = reclassifyGame(events, T).plays;
    expect(plays.length).toBe(0);
  });
});
