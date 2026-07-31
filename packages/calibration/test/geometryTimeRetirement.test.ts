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
function scramble(): MatchEventEnvelope {
  return env({ type: "QB_DECISION", gameId: GAME_ID, playId: PLAY_ID, payload: { choice: "SCRAMBLE" } });
}
function hold(): MatchEventEnvelope {
  return env({ type: "QB_DECISION", gameId: GAME_ID, playId: PLAY_ID, payload: { choice: "HOLD" } });
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
function qbPursuit(sinceTick: number, deadlineTick: number): MatchEventEnvelope {
  return env({
    type: "QB_PURSUIT",
    gameId: GAME_ID,
    playId: PLAY_ID,
    payload: { sinceTick, deadlineTick, rollRef: "r1" },
  });
}
function endPlay(): MatchEventEnvelope {
  // A closing PLAY_START from a following, non-pass play flushes the buffer.
  return env({ type: "PLAY_START", gameId: GAME_ID, playId: "g1:play:1" as PlayId, payload: { kind: "RUN_PLAY_V1" } });
}

// The arrival-only-base classification `floorFromArrival` reads:
// immediateWithinSeconds 0.0, collapsingWithinSeconds 1.0, pressureWithinSeconds 2.0 (default,
// CALIBRATION-BACKLOG entry 76 — no longer POS_INF).
const T = DEFAULT_TUNABLES;

describe("geometryTimeRetirement — identity reproduction", () => {
  it("reproduces the real pocket-status stream when nothing is retired", () => {
    // CALIBRATION-BACKLOG entry 76 / ADR-033's `DERIVED MECHANIC` block bounded
    // `arrival.pressureWithinSeconds` from `POS_INF` to `2.0`. A single unmoving threat can no
    // longer be "far away and always PRESSURE" the way this fixture used to model it (etaTick
    // 100.0 is now CLEAN — exactly entry 76's point: a rusher seconds away is not pressure). So the
    // threat is instead re-published at each tick with a growing `etaTick`, holding
    // `minTta` pinned at 1.5s throughout — inside `pressureWithinSeconds` (2.0), outside
    // `collapsingWithinSeconds` (1.0), so the test still is not incidentally exercising those
    // boundaries. Re-publication itself is realistic: it is what the engine does whenever a
    // rusher keeps contesting the rep (a fresh `TRAVELLING`/`DELAYED` transition, §7.1).
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 2.0, state: "TRAVELLING" }), // minTta 1.5
      pocket("PRESSURE"),
      tick(1.0),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 2.5, state: "DELAYED" }), // minTta 1.5
      pocket("PRESSURE"),
      tick(1.5),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 3.0, state: "DELAYED" }), // minTta 1.5
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
    // CALIBRATION-BACKLOG entry 76 bounded `pressureWithinSeconds` to 2.0. Chosen so the STEP_UP
    // delay (`pocketMovement.stepUp.edgeThreatDelaySeconds`, 1.0s) still leaves the REAL stream
    // inside the horizon (minTta 1.5 <= 2.0) — this fixture isolates "does geometry retirement
    // clear an otherwise-dirty pocket" from "was it ever dirty at all"; the sibling case below
    // ("...pushes a live EDGE threat past the pressure horizon...") is where the delay itself
    // clears the REAL pocket, and the two are deliberately kept separate.
    //
    // The play runs to tick 4.0, well past every eta below, so TIME retirement cannot be what is
    // observed here — only GEOMETRY is live in this fixture. No POCKET_STATUS check is published
    // before the STEP_UP, so the ONLY check on the record post-dates the retirement.
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 1.5, state: "TRAVELLING" }),
      tick(1.0),
      stepUp(),
      // real engine would DELAY the edge threat here (+1.0s edgeThreatDelaySeconds: 1.5 -> 2.5);
      // the counterfactual instead drops him. minTta = 2.5 - 1.0 = 1.5, inside pressureWithinSeconds
      // (2.0), so the real pocket stays dirty — this delay alone does not clear it.
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 2.5, state: "DELAYED" }),
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

  it("pushes a live EDGE threat past the pressure horizon on STEP_UP — reads CLEAN with no RESET (entry 76, football not a bug)", () => {
    // ⚠ THE FOOTBALL CONSEQUENCE `docs/design/match-engine.md` §7.2's `DERIVED MECHANIC` block and
    // CALIBRATION-BACKLOG entry 76 name directly: `pocketMovement.stepUp.edgeThreatDelaySeconds`
    // (1.0s) can STACK, in the same tick, with §7.1's `BLOCKER_CONTAINS` recovery delay
    // (`recoverySecondsByBand.BLOCKER_CONTAINS`, 0.5s) — a rusher who was just contained AND is then
    // climbed past. The two delays are published as two separate `RUSH_THREAT{state:"DELAYED"}`
    // events on the SAME tick (the contain delay from the §7.1 line battle, then the STEP_UP delay
    // from the movement decision, which runs later in the same tick's resolution order), and
    // together they can push the threat's `etaTick` far enough out that `minTta` exceeds
    // `pressureWithinSeconds` (2.0). The pocket then LEGITIMATELY reads CLEAN — with no `RESET`
    // published, because the threat was never retired, only delayed twice past the horizon that
    // now bounds what counts as pressure. This is entry 76's own point applied to a moving target:
    // a rusher who is not close enough to affect the throw is not pressure, whether he is far away
    // from birth or delayed there mid-play. The reconstruction must reproduce this exactly — it is
    // not a case to dodge by picking numbers that avoid the horizon.
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 2.0, state: "TRAVELLING" }),
      tick(1.0),
      // §7.1's line battle resolves first in the tick: a BLOCKER_CONTAINS rep delays him +0.5s.
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 2.5, state: "DELAYED" }),
      stepUp(),
      // Then STEP_UP's own +1.0s edgeThreatDelaySeconds stacks on top: 2.5 -> 3.5.
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 3.5, state: "DELAYED" }),
      // minTta = 3.5 - 1.0 = 2.5, past pressureWithinSeconds (2.0). Real engine reads CLEAN here —
      // no RESET was published, the threat is still live, just too far out to dirty the pocket.
      pocket("CLEAN"),
      tick(4.0),
      endPlay(),
    ];
    const [play] = reclassifyGame(events, T).plays;
    // The falsifier: if the reconstruction still assumed an unbounded horizon it would predict
    // PRESSURE here and mismatch against the published CLEAN.
    expect(play?.identityMismatches).toBe(0);
    expect(play?.identityPressured).toBe(false); // the only published check is CLEAN
    expect(play?.counterfactualPressured).toBe(false); // geometry retirement agrees, redundantly
    expect(play?.geometryRetiredThreats).toBe(1); // Ruling 2 still retires him in the counterfactual
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
    // CALIBRATION-BACKLOG entry 76: etaTick must stay inside `pressureWithinSeconds` (2.0) at BOTH
    // check ticks for the real stream to still read PRESSURE (2.0s travel: eta 2.5, not the old
    // 3.0s/eta-3.5 which is now beyond the horizon at tick 0.5 — minTta 3.0 would read CLEAN, and
    // the fixture's own `identityMismatches` assertion below is the falsifier that would catch it).
    const events = [
      playStart(),
      tick(0.5),
      // Created at 0.5 with a 2.0s travel: eta 2.5. minTta = 2.0 at this tick, 1.5 at tick 1.0 —
      // both inside pressureWithinSeconds (2.0) and outside collapsingWithinSeconds (1.0).
      threat({ rusher: "late1", alignment: "EDGE", etaTick: 2.5, state: "TRAVELLING" }),
      pocket("PRESSURE"), // real: dirty from the moment he is created
      tick(1.0),
      pocket("PRESSURE"),
      endPlay(), // the play's own terminal tick is 1.0 — he could never have arrived by 2.5
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play?.identityMismatches).toBe(0);
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

describe("geometryTimeRetirement — the §8.8 pursuit clock (ADR-054)", () => {
  it("reconstructs pocket status from QB_PURSUIT once a scramble is live — no exclusion", () => {
    // Mirrors the engine's own tick order: the pocket status BEFORE the escape reads off the
    // §7.1 threat (RESET published the moment the escape succeeds), then QB_PURSUIT is published,
    // then every later POCKET_STATUS is the pursuit clock ALONE — `activeThreats` has discarded
    // the matchup entirely (module header). immediateWithinSeconds 0.0, collapsingWithinSeconds
    // 1.0, pressureWithinSeconds 2.0 (DEFAULT_TUNABLES, CALIBRATION-BACKLOG entry 76 — no longer
    // POS_INF, so the pre-scramble threat's etaTick must sit inside the horizon, not "far away").
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 2.0, state: "TRAVELLING" }),
      pocket("PRESSURE"), // pre-scramble: read off the §7.1 threat; minTta 1.5, inside the 2.0s horizon
      tick(1.0),
      scrambleCheck(),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 2.0, state: "RESET" }), // every threat resets
      qbPursuit(1.0, 2.5), // sinceTick 1.0, deadlineTick 2.5 (1.5s pursuit)
      scramble(),
      tick(1.5),
      pocket("COLLAPSING"), // minTta = 2.5 - 1.5 = 1.0 <= collapsingWithinSeconds(1.0), > 0.0
      hold(),
      tick(2.0),
      pocket("COLLAPSING"), // minTta = 2.5 - 2.0 = 0.5 <= collapsingWithinSeconds, > 0.0
      hold(),
      tick(2.5),
      pocket("IMMEDIATE"), // minTta = 2.5 - 2.5 = 0.0 <= immediateWithinSeconds(0.0)
      endPlay(),
    ];
    const result = reclassifyGame(events, T);
    expect(result.plays.length).toBe(1);
    const [play] = result.plays;
    // The identity check is the falsifier: the reconstruction must match the published stream
    // exactly, tick for tick, once QB_PURSUIT is on the record — no exclusion, no guess.
    expect(play?.identityChecks).toBe(4);
    expect(play?.identityMismatches).toBe(0);
    expect(play?.identityPressured).toBe(true);
  });

  it("agrees with the engine's own arrival floor at every pursuit tick (exact identity)", () => {
    // No RUSH_THREAT in this fixture, so pressureWithinSeconds never enters — only
    // immediateWithinSeconds (0.0) and collapsingWithinSeconds (1.0), unaffected by entry 76.
    const events = [
      playStart(),
      tick(1.0),
      qbPursuit(1.0, 2.5),
      scramble(),
      tick(1.5),
      pocket("COLLAPSING"), // minTta = 1.0 -> <= collapsingWithinSeconds(1.0), > immediateWithinSeconds(0.0)
      hold(),
      tick(2.0),
      pocket("COLLAPSING"), // minTta = 0.5 -> still <= collapsingWithinSeconds, > 0.0
      hold(),
      tick(2.5),
      pocket("IMMEDIATE"), // minTta = 0.0 -> <= immediateWithinSeconds
      endPlay(),
    ];
    const [play] = reclassifyGame(events, T).plays;
    expect(play?.identityChecks).toBe(3);
    expect(play?.identityMismatches).toBe(0);
    expect(play?.identityPressured).toBe(true);
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
