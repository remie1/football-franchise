/**
 * FREE, UNGATED unit coverage for `src/knownTruth/ruling2CommittedRetirement.ts` — RULING 2's
 * geometry+time reclassification on the COMMITTED tree (channels 1/2 live, `containRetiresAfterConsecutiveContains`
 * live). Synthetic streams, hand-built, so DEMOTE vs CLEAR and the three-arm isolation are checked
 * against a known-by-construction answer, the same discipline `geometryTimeRetirement.test.ts` uses
 * for the arrival-only base.
 */
import { describe, expect, it } from "vitest";
import type { GameId, MatchEventEnvelope, PlayerId, PlayId } from "@ff/contracts";
import { DEFAULT_TUNABLES, type Tunables } from "@ff/engine";
import {
  emptyRuling2Fold,
  foldGameRuling2,
  mergeRuling2Fold,
  RETIREMENT_ARMS,
  type Ruling2Fold,
} from "../src/knownTruth/ruling2CommittedRetirement.js";

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
function check(band: string, rusher: string): MatchEventEnvelope {
  return env({
    type: "CHECK",
    gameId: GAME_ID,
    playId: PLAY_ID,
    payload: {
      checkKind: "pass_rush_tick",
      actors: [rusher as PlayerId, "blocker-1" as PlayerId],
      roll: { die: "d100", raw: 50, modifiers: [], total: 50, rngLabel: "r1" },
      tier: "SUCCESS",
      band,
      margin: 5,
      testsAttrs: [],
    },
  });
}
function stepUp(): MatchEventEnvelope {
  return env({ type: "QB_DECISION", gameId: GAME_ID, playId: PLAY_ID, payload: { choice: "STEP_UP" } });
}
function endPlay(): MatchEventEnvelope {
  return env({ type: "PLAY_START", gameId: GAME_ID, playId: "g1:play:1" as PlayId, payload: { kind: "RUN_PLAY_V1" } });
}

const T: Tunables = DEFAULT_TUNABLES;

function fold(events: readonly MatchEventEnvelope[]): Ruling2Fold {
  const f = emptyRuling2Fold();
  // Synthetic streams publish `etaTick` directly (never via `travelSecondsFor`), so no rusher's
  // `Position` is needed here — `arrivalDepth` (the only field it would feed) is not read by
  // anything this unit test asserts. An empty map is honest, not a shortcut: every id below simply
  // resolves to `arrivalDepth: undefined`, the same "cannot attribute" convention `wonMargin`
  // already uses elsewhere in this reconstruction.
  foldGameRuling2(f, events, T, new Map());
  return f;
}

describe("ruling2CommittedRetirement — identity, channels 1/2/3 unmodified", () => {
  it("reproduces the published stream with 0 mismatches on a mixed-channel play", () => {
    // BLOCKER_BEATEN bandFloors PRESSURE (severity 1) at DEFAULT_TUNABLES; the rusher also carries a
    // live arrival threat. Neither rule fires (no STEP_UP, etaTick well inside the play).
    const events = [
      playStart(),
      tick(0.5),
      check("BLOCKER_BEATEN", "p1"),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 2.0, state: "TRAVELLING" }), // minTta 1.5, PRESSURE
      pocket("PRESSURE"), // worstOf(CLEAN counter, PRESSURE bandFloor, PRESSURE arrival) = PRESSURE
      tick(4.0),
      endPlay(),
    ];
    const f = fold(events);
    expect(f.identityMismatches).toBe(0);
    expect(f.identityChecks).toBe(1);
    expect(f.dropbacks).toBe(1);
    expect(f.published).toEqual({ CLEAN: 0, PRESSURE: 1, COLLAPSING: 0, IMMEDIATE: 0 });
  });
});

describe("ruling2CommittedRetirement — DEMOTE: channel 2 (bandFloor) survives an arrival retirement", () => {
  it("geometryOnly demotes PRESSURE→CLEAN's neighbour: COLLAPSING (arrival) down to PRESSURE (bandFloor), not CLEAN", () => {
    // BLOCKER_BEATEN bandFloors PRESSURE (severity 1). The SAME rusher's arrival ETA is close enough
    // to read COLLAPSING (severity 2) — published is COLLAPSING, arrival is the argmax. Geometry
    // retirement (EDGE, STEP_UP) clears the ARRIVAL channel only; bandFloor is untouched (channel 2
    // reads the rusher's LAST published band, independent of whether his threat instance survives),
    // so the counterfactual severity is PRESSURE, not CLEAN — a DEMOTE, not a CLEAR.
    const events = [
      playStart(),
      tick(0.5),
      check("BLOCKER_BEATEN", "p1"), // bandFloor -> PRESSURE, persists for the rest of the play
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 1.4, state: "TRAVELLING" }), // minTta 0.9 -> COLLAPSING
      pocket("COLLAPSING"), // pre-STEP_UP: nothing retired yet in any arm, so this tick is UNTOUCHED
      tick(1.0),
      stepUp(), // geometry-retires p1's EDGE threat in geometryOnly/joint arms only (resetsEdgePressure also zeroes the counter, which was CLEAN already — BLOCKER_BEATEN's delta 1 never reaches PRESSURE's threshold 3)
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 1.9, state: "DELAYED" }), // real engine still delays it; minTta 0.9 -> COLLAPSING again
      pocket("COLLAPSING"), // real: identity unaffected by STEP_UP's geometry rule (channel 3 unfiltered)
      tick(4.0),
      endPlay(),
    ];
    const f = fold(events);
    expect(f.identityMismatches).toBe(0);
    expect(f.published).toEqual({ CLEAN: 0, PRESSURE: 0, COLLAPSING: 2, IMMEDIATE: 0 });
    // geometryOnly: tick 1 (pre-STEP_UP) untouched (nothing retired yet); tick 2 (post-STEP_UP) demoted.
    expect(f.arm.geometryOnly).toEqual({ CLEAN: 0, PRESSURE: 1, COLLAPSING: 1, IMMEDIATE: 0 });
    expect(f.armDemoteClear.geometryOnly).toEqual({ touched: 1, demoted: 1, cleared: 0 });
    expect(f.geometryRetiredThreats.geometryOnly).toBe(1);
    // timeOnly never fires here (no tick ever exceeds finalTick before the play ends at 4.0).
    expect(f.arm.timeOnly).toEqual({ CLEAN: 0, PRESSURE: 0, COLLAPSING: 2, IMMEDIATE: 0 });
    expect(f.armDemoteClear.timeOnly).toEqual({ touched: 0, demoted: 0, cleared: 0 });
    expect(f.timeRetiredThreats.timeOnly).toBe(0);
    // joint reproduces geometryOnly exactly, since time never fires in this fixture.
    expect(f.arm.joint).toEqual(f.arm.geometryOnly);
    expect(f.armDemoteClear.joint).toEqual(f.armDemoteClear.geometryOnly);
  });
});

describe("ruling2CommittedRetirement — CLEAR: a CLEAN-floor band lets retirement clear the tick fully", () => {
  it("timeOnly clears a BLOCKER_CONTAINS-banded rusher's dirty arrival tick to CLEAN", () => {
    // BLOCKER_CONTAINS bandFloors CLEAN and contributes delta 0 to the counter (DEFAULT_TUNABLES), so
    // the ONLY dirty channel is arrival. A threat whose etaTick exceeds the play's actual terminal
    // tick is TIME-retired for its whole life (geometryTimeRetirement.ts's rule, restated here on the
    // committed tree) — the counterfactual reads CLEAN outright, a genuine CLEAR.
    const events = [
      playStart(),
      tick(0.5),
      check("BLOCKER_CONTAINS", "p2"), // bandFloor stays CLEAN, counter delta 0
      threat({ rusher: "p2", alignment: "INTERIOR", etaTick: 2.5, state: "TRAVELLING" }), // minTta 2.0 -> PRESSURE
      pocket("PRESSURE"),
      tick(1.0),
      pocket("PRESSURE"), // minTta 1.5 -> PRESSURE still
      endPlay(), // terminal tick 1.0 — p2 could never have arrived by 2.5
    ];
    const f = fold(events);
    expect(f.identityMismatches).toBe(0);
    expect(f.published).toEqual({ CLEAN: 0, PRESSURE: 2, COLLAPSING: 0, IMMEDIATE: 0 });
    expect(f.arm.timeOnly).toEqual({ CLEAN: 2, PRESSURE: 0, COLLAPSING: 0, IMMEDIATE: 0 });
    expect(f.armDemoteClear.timeOnly).toEqual({ touched: 2, demoted: 0, cleared: 2 });
    expect(f.timeRetiredThreats.timeOnly).toBe(1);
    // geometryOnly cannot touch an INTERIOR threat and there is no STEP_UP in this fixture at all.
    expect(f.arm.geometryOnly).toEqual(f.published);
    expect(f.armDemoteClear.geometryOnly).toEqual({ touched: 0, demoted: 0, cleared: 0 });
    expect(f.geometryRetiredThreats.geometryOnly).toBe(0);
  });
});

describe("ruling2CommittedRetirement — arm isolation, structural", () => {
  it("timeOnly never geometry-retires and geometryOnly never time-retires, across every arm", () => {
    for (const arm of RETIREMENT_ARMS) {
      expect(RETIREMENT_ARMS).toContain(arm);
    }
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 1.5, state: "TRAVELLING" }),
      tick(1.0),
      stepUp(),
      threat({ rusher: "edge1", alignment: "EDGE", etaTick: 2.5, state: "DELAYED" }),
      pocket("PRESSURE"), // real: minTta = 2.5 - 1.0 = 1.5, inside pressureWithinSeconds(2.0), outside collapsingWithinSeconds(1.0) -> PRESSURE
      tick(4.0),
      endPlay(),
    ];
    const f = fold(events);
    expect(f.identityMismatches).toBe(0);
    expect(f.geometryRetiredThreats.timeOnly).toBe(0);
    expect(f.timeRetiredThreats.geometryOnly).toBe(0);
    expect(f.geometryRetiredThreats.geometryOnly).toBe(1);
    expect(f.geometryRetiredThreats.joint).toBe(1);
  });
});

describe("ruling2CommittedRetirement — mergeRuling2Fold", () => {
  it("sums two folds field for field", () => {
    const events = [
      playStart(),
      tick(0.5),
      threat({ rusher: "p1", alignment: "EDGE", etaTick: 5.0, state: "TRAVELLING" }), // TIME-retirable
      tick(1.0),
      pocket("PRESSURE"),
      endPlay(),
    ];
    const a = fold(events);
    const b = fold(events);
    const merged = emptyRuling2Fold();
    mergeRuling2Fold(merged, a);
    mergeRuling2Fold(merged, b);
    expect(merged.dropbacks).toBe(a.dropbacks + b.dropbacks);
    expect(merged.published.PRESSURE).toBe(a.published.PRESSURE + b.published.PRESSURE);
    expect(merged.arm.timeOnly.CLEAN).toBe(a.arm.timeOnly.CLEAN + b.arm.timeOnly.CLEAN);
    expect(merged.timeRetiredThreats.timeOnly).toBe(a.timeRetiredThreats.timeOnly + b.timeRetiredThreats.timeOnly);
  });
});

describe("ruling2CommittedRetirement — non-pass plays are skipped", () => {
  it("folds nothing for a run play", () => {
    const events = [
      env({ type: "PLAY_START", gameId: GAME_ID, playId: PLAY_ID, payload: { kind: "RUN_PLAY_V1" } }),
      tick(0.5),
      endPlay(),
    ];
    const f = fold(events);
    expect(f.dropbacks).toBe(0);
    expect(f.identityChecks).toBe(0);
  });
});
