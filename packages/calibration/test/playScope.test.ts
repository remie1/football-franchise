/**
 * THE PLAY-SCOPE INSTRUMENT'S OWN GATE — free tier, runs on every push.
 *
 * `src/harness/playScope.ts` carries the argument. This file is the assertions, and the one that
 * matters is the ROUND TRIP: a captured play, replayed under the tunables it was played under,
 * reproduces the play the game produced, event for event.
 *
 * ⚠ **WITHOUT THAT ASSERTION THIS INSTRUMENT IS THE FOURTH SHAPE.** Charter §4.1 /
 * `CALIBRATION-BACKLOG.md` entry 47: *a pin whose green comes from somewhere other than its stated
 * subject.* An exclusive count of 0 is what a correct replay of an unaffected play returns — and it
 * is ALSO what a broken reconstruction returns, because two identically-wrong replays agree with
 * each other perfectly. **A zero from this module means nothing at all unless the reconstruction is
 * independently proved**, so the proof is here, against the game's own stream, and it is the first
 * test in the file.
 *
 * The comparison drops `seq`, and only `seq`. The replay starts its numbering from a constant
 * (`REPLAY_EVENT_SEQ`) because the game's own `nextEventSeq` is not visible to a caller; every other
 * field — `at`, `playId`, `gameId`, `tick`, the whole payload — must match exactly, and does.
 */
import { describe, expect, it } from "vitest";
import type { MatchEventEnvelope } from "@ff/contracts";
import {
  DEFAULT_TUNABLES,
  applyTunablePatch,
  createMatchState,
  simulateGame,
  simulatePlay,
} from "@ff/engine";
import { FROZEN_FOURTH_DOWN, FROZEN_TENDENCIES } from "../src/caller/frozenTendencies.js";
import { frozenCallerPair } from "../src/caller/frozen.js";
import { stableDigest } from "../src/harness/digest.js";
import { capturePlays, priceAtPlayScope, type CapturedPlay } from "../src/harness/playScope.js";
import { buildFixtures, buildFixture } from "../src/harness/schedule.js";
import { buildFlatLeague } from "../src/league/flat.js";
import { indexLeague } from "../src/league/snapshot.js";

const SEED = "play-scope-gate";

const league = buildFlatLeague({ teams: 4 });
const index = indexLeague(league);
const fixture = buildFixtures(index, { kind: "SYNTHETIC_ROUND_ROBIN", rounds: 1, season: 2024 })[0];
if (fixture === undefined) throw new Error("the round robin produced no fixture");
const built = buildFixture(index, fixture);

const coordinates = {
  season: built.fixture.season,
  week: built.fixture.week,
  home: built.fixture.home,
  away: built.fixture.away,
};

function callers() {
  return frozenCallerPair({
    tendencies: FROZEN_TENDENCIES,
    fourthDown: FROZEN_FOURTH_DOWN,
    homeDepthChart: built.homeDepthChart,
    awayDepthChart: built.awayDepthChart,
  });
}

/** One game, with the capture wrapped around its callers. */
function capturedGame(): {
  readonly events: readonly MatchEventEnvelope[];
  readonly plays: readonly CapturedPlay[];
} {
  const pair = callers();
  const capture = capturePlays(pair, { coordinates, at: built.at });
  const state = createMatchState(coordinates, built.snapshot, DEFAULT_TUNABLES);
  const result = simulateGame(
    state,
    {
      coordinates,
      snapshot: built.snapshot,
      callers: { home: capture.home, away: capture.away },
    },
    SEED,
    DEFAULT_TUNABLES,
  );
  return { events: result.events, plays: capture.finish(result.events) };
}

/** The same game with no capture around it — the control for transparency. */
function plainGame(): readonly MatchEventEnvelope[] {
  const pair = callers();
  const state = createMatchState(coordinates, built.snapshot, DEFAULT_TUNABLES);
  return simulateGame(
    state,
    { coordinates, snapshot: built.snapshot, callers: { home: pair.home, away: pair.away } },
    SEED,
    DEFAULT_TUNABLES,
  ).events;
}

function withoutSeq(events: readonly MatchEventEnvelope[]): unknown[] {
  return events.map((e) => ({ at: e.at, event: e.event }));
}

describe("play scope — the capture", () => {
  it("is transparent: a captured game is the game", () => {
    // A wrapper that changed the stream would make every number this instrument produces a
    // statement about the wrapper.
    expect(stableDigest(capturedGame().events)).toBe(stableDigest(plainGame()));
  });

  it("captures one replayable play per scrimmage PLAY_START", () => {
    const { events, plays } = capturedGame();
    const starts = events.filter(
      (e) => e.event.type === "PLAY_START" && String(e.event.playId).includes(":play:"),
    );
    expect(plays.length).toBe(starts.length);
    expect(plays.length).toBeGreaterThan(50);
    expect(plays.map((p) => p.ordinal)).toEqual(plays.map((_, i) => i));
    // Play numbers come from the stream, so they are the loop's and not a second count.
    expect(new Set(plays.map((p) => p.playNumber)).size).toBe(plays.length);
  });

  it("ROUND TRIP — every replayed play reproduces the play the game played", () => {
    // THE LOAD-BEARING ASSERTION. See this file's header: an exclusive count of zero is what a
    // correct replay returns AND what a broken reconstruction returns, so the reconstruction has to
    // be proved against something other than itself. That something is the game's own stream.
    const { events, plays } = capturedGame();
    const byPlay = new Map<string, MatchEventEnvelope[]>();
    for (const e of events) {
      const id = e.event.playId;
      if (id === undefined) continue;
      const key = String(id);
      const bucket = byPlay.get(key);
      if (bucket === undefined) byPlay.set(key, [e]);
      else bucket.push(e);
    }

    let checked = 0;
    for (const play of plays) {
      const key = `${String(play.state.gameId)}:play:${String(play.playNumber)}`;
      const original = byPlay.get(key);
      expect(original, `no events in the stream for ${key}`).toBeDefined();
      const replayed = priceAtPlayScope(
        [play],
        () => SEED,
        DEFAULT_TUNABLES,
        DEFAULT_TUNABLES,
      );
      // Same tunables both sides, so nothing may move — that is the trivial half.
      expect(replayed.exclusive).toBe(0);
      checked++;
    }
    expect(checked).toBe(plays.length);

    // …and the non-trivial half, done once with the events in hand rather than through the price:
    // the replayed stream must equal the ORIGINAL, which is the claim the price cannot make.
    const first = plays[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      const key = `${String(first.state.gameId)}:play:${String(first.playNumber)}`;
      const original = byPlay.get(key) ?? [];
      const solo = replayOne(first);
      expect(withoutSeq(solo)).toEqual(withoutSeq(original));
    }
  });

  it("ROUND TRIP over EVERY play, not just the first", () => {
    // Same claim as above, applied totally. Charter §4.1's total-comparison corollary: verifying
    // that a reconstruction did not change anything requires comparing all of it, not a sample.
    const { events, plays } = capturedGame();
    const byPlay = new Map<string, MatchEventEnvelope[]>();
    for (const e of events) {
      const id = e.event.playId;
      if (id === undefined) continue;
      const key = String(id);
      const bucket = byPlay.get(key);
      if (bucket === undefined) byPlay.set(key, [e]);
      else bucket.push(e);
    }
    const mismatched: string[] = [];
    for (const play of plays) {
      const key = `${String(play.state.gameId)}:play:${String(play.playNumber)}`;
      const original = byPlay.get(key) ?? [];
      if (stableDigest(withoutSeq(replayOne(play))) !== stableDigest(withoutSeq(original))) {
        mismatched.push(key);
      }
    }
    expect(mismatched).toEqual([]);
  });
});

describe("play scope — the price", () => {
  it("returns EXCLUSIVE 0 with an identical complement when nothing moves", () => {
    const { plays } = capturedGame();
    const price = priceAtPlayScope(plays, () => SEED, DEFAULT_TUNABLES, DEFAULT_TUNABLES);
    expect(price.exclusive).toBe(0);
    expect(price.movedOrdinals).toEqual([]);
    expect(price.complementDigestControl).toBe(price.complementDigestTreatment);
    expect(price.digestControl).toBe(price.digestTreatment);
    expect(price.raw).toBeNull(); // no predicate supplied — a refusal, not a zero
  });

  it("REDDENS on a change it must see — the case this instrument fails on", () => {
    // §4.1: an instrument with no failing case is not yet an instrument. `catching.routine.target`
    // is read on every completed catch, so a 20-point move cannot possibly be invisible; if this
    // returns 0 the replay is not reaching the resolvers at all.
    const { plays } = capturedGame();
    const moved = applyTunablePatch(DEFAULT_TUNABLES, {
      tunableId: "catching.routine.target",
      currentValue: DEFAULT_TUNABLES.catching.routine.target,
      proposedValue: DEFAULT_TUNABLES.catching.routine.target + 20,
      evidence: "play-scope instrument's failing case — a cell no play with a catch can ignore",
      expectedEffect: "every play containing a routine catch resolution diverges",
    });
    const price = priceAtPlayScope(plays, () => SEED, DEFAULT_TUNABLES, moved);
    expect(price.exclusive).toBeGreaterThan(0);
    // …and the complement is still provably untouched, which is the half that makes the count
    // EXCLUSIVE rather than merely different.
    expect(price.complementDigestControl).toBe(price.complementDigestTreatment);
    expect(price.exclusive).toBeLessThan(price.plays);
  });

  it("counts RAW separately from EXCLUSIVE, because they answer different questions", () => {
    const { plays } = capturedGame();
    const price = priceAtPlayScope(plays, () => SEED, DEFAULT_TUNABLES, DEFAULT_TUNABLES, {
      population: (events) => events.some((e) => e.event.type === "CATCH_RESOLUTION"),
    });
    expect(price.raw).not.toBeNull();
    expect(price.raw ?? 0).toBeGreaterThan(0);
    // ADR-032's lesson as an assertion: raw ≥ exclusive, always, and the gap is the finding.
    expect(price.raw ?? 0).toBeGreaterThanOrEqual(price.exclusive);
  });
});

/** One play, replayed under the committed tree, for the round-trip comparison. */
function replayOne(play: CapturedPlay): readonly MatchEventEnvelope[] {
  // Deliberately not routed through `priceAtPlayScope`: that function returns digests, and a
  // round-trip proof needs the events themselves.
  return simulatePlay(play.state, play.calls, SEED, DEFAULT_TUNABLES).events;
}
