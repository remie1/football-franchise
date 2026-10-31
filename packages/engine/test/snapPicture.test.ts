/**
 * ADR-090 step 1 (petitions S2 and S5) — THE SNAP PICTURE COMES IN ON THE CALLS AND GOES OUT ON
 * PLAY_START.
 *
 * The engine builds no picture. A caller with the playbook draws one (`PlayCaller.lineUp`), the
 * loop puts it on the calls (`PlayCalls.snap`) and the simulation copies it onto PLAY_START as the
 * payload's last key. Nothing else reads it at step 1, so this file pins three things:
 *
 *  1. THE COPY. A pass and a run handed a picture publish it, as it came, as the last key (after
 *     `rules` when the play states its rules); a play handed none writes no key.
 *  2. INERT. The same play with and without a picture is the same stream once `snap` is taken off
 *     PLAY_START: no die moves, no field moves.
 *  3. THE LOOP. The defense's caller is asked once per scrimmage play, with the two calls the play
 *     ran, on a fork of its own; the engine's own caller draws none; and a game with a line-up is
 *     the game without one, `snap` aside.
 */
import type { MatchEventEnvelope, SnapPicture, TeamId } from "@ff/contracts";
import { describe, expect, it } from "vitest";
import { defaultPlayCaller, simulatePassPlay, simulateRunPlay } from "../src/index.js";
import { simulateGame } from "../src/game/simulateGame.js";
import type { LineUpRequest, PlayCaller } from "../src/game/types.js";
import type { MatchGameState, PassPlayStartPayload, RunPlayStartPayload } from "../src/types.js";
import { buildRunScenario, buildScenario } from "./fixtures.js";
import { buildGameFixture } from "./gameFixtures.js";
import { S_TUNABLES } from "./pocketTunables.js";

type AnyStart = PassPlayStartPayload | RunPlayStartPayload;

/** A hand-made picture: the engine copies whatever it is handed, so any picture will do. */
function pictureFor(quarterback: MatchGameState["quarterback"], x = 0): SnapPicture {
  return {
    ballX: 0,
    offense: [{ player: quarterback, x, y: -1, stance: "UP" }],
    defense: [{ player: quarterback, x: x + 4.5, y: 7, stance: "UP", moving: { dx: 0, dy: -1, yardsPerSecond: 3 } }],
  };
}

function starts(events: readonly MatchEventEnvelope[]): AnyStart[] {
  return events.flatMap(({ event }) => (event.type === "PLAY_START" ? [event.payload as AnyStart] : []));
}

/** The stream with `snap` taken off every PLAY_START, and nothing else touched. */
function withoutSnap(events: readonly MatchEventEnvelope[]): unknown[] {
  return events.map((e) => {
    if (e.event.type !== "PLAY_START") return e;
    const { snap: _snap, ...payload } = e.event.payload as AnyStart;
    return { ...e, event: { ...e.event, payload } };
  });
}

describe("ADR-090 S2: the simulation copies the calls' picture onto PLAY_START", () => {
  it("a pass publishes it as it came, as the last key; with none, no key", () => {
    const s = buildScenario();
    const snap = pictureFor(s.state.quarterback);
    const [carried] = starts(simulatePassPlay(s.state, { ...s.calls, snap }, "snap-copy").events);
    const [plain] = starts(simulatePassPlay(s.state, s.calls, "snap-copy").events);
    expect(carried?.snap).toEqual(snap);
    expect(Object.keys(carried ?? {}).at(-1)).toBe("snap");
    expect(plain === undefined ? true : "snap" in plain).toBe(false);
  });

  it("a run publishes it the same way", () => {
    const s = buildRunScenario();
    const snap = pictureFor(s.state.quarterback, -2.5);
    const [carried] = starts(simulateRunPlay(s.state, { ...s.calls, snap }, "snap-run").events);
    const [plain] = starts(simulateRunPlay(s.state, s.calls, "snap-run").events);
    expect(carried?.kind).toBe("RUN_PLAY_V1");
    expect(carried?.snap).toEqual(snap);
    expect(Object.keys(carried ?? {}).at(-1)).toBe("snap");
    expect(plain === undefined ? true : "snap" in plain).toBe(false);
  });

  it("comes after the rules a pocket-1 play states, so every other key keeps its place", () => {
    const s = buildScenario();
    const snap = pictureFor(s.state.quarterback);
    const [carried] = starts(simulatePassPlay(s.state, { ...s.calls, snap }, "snap-rules", S_TUNABLES).events);
    const [plain] = starts(simulatePassPlay(s.state, s.calls, "snap-rules", S_TUNABLES).events);
    expect(Object.keys(carried ?? {})).toEqual([...Object.keys(plain ?? {}), "snap"]);
    expect(Object.keys(plain ?? {}).at(-1)).toBe("rules");
  });
});

describe("ADR-090 step 1: the picture is inert", () => {
  it("the same pass and the same run, with and without one, are the same stream but for snap", () => {
    for (const seed of ["inert-1", "inert-2", "inert-3"]) {
      const pass = buildScenario();
      const snap = pictureFor(pass.state.quarterback);
      expect(withoutSnap(simulatePassPlay(pass.state, { ...pass.calls, snap }, seed).events)).toEqual(
        simulatePassPlay(pass.state, pass.calls, seed).events,
      );
      const run = buildRunScenario("GAP");
      expect(withoutSnap(simulateRunPlay(run.state, { ...run.calls, snap }, seed).events)).toEqual(
        simulateRunPlay(run.state, run.calls, seed).events,
      );
    }
  });
});

describe("ADR-090 S5: the loop asks the defense's caller and carries the picture on the calls", () => {
  interface Asked {
    readonly caller: TeamId;
    readonly request: LineUpRequest;
    readonly label: string;
    readonly picture: SnapPicture;
  }

  /** The engine's own caller, with a line-up that draws a picture naming the play's quarterback. */
  function lining(caller: PlayCaller, team: TeamId, asked: Asked[]): PlayCaller {
    return {
      ...caller,
      lineUp(request, rng) {
        const picture = pictureFor(request.offense.offense.quarterback, asked.length % 7);
        asked.push({ caller: team, request, label: rng.label, picture });
        return picture;
      },
    };
  }

  it("asks once a scrimmage play, the defense's caller, with the calls the play ran, and publishes what it drew", () => {
    const fixture = buildGameFixture({ seed: "snap-loop" });
    const { home, away } = fixture.inputs.coordinates;
    const asked: Asked[] = [];
    const callers = {
      home: lining(fixture.inputs.callers.home, home, asked),
      away: lining(fixture.inputs.callers.away, away, asked),
    };
    const { events } = simulateGame(fixture.state, { ...fixture.inputs, callers }, fixture.seed);
    const played = starts(events);
    expect(played.length).toBeGreaterThan(100);
    expect(asked.length).toBe(played.length);
    played.forEach((start, i) => {
      const a = asked[i]!;
      expect(a.caller).toBe(start.defense.team);
      expect(a.request.kind).toBe("LINE_UP");
      expect(a.request.defense.team).toBe(start.defense.team);
      expect(a.request.offense.team).toBe(start.offense.team);
      expect(a.request.offenseCall.name).toBe(start.offense.call);
      expect(a.request.defenseCall.concept).toBe(start.defense.call);
      expect(a.label).toMatch(/\/call:\d+\/line-up$/);
      expect(start.snap).toEqual(a.picture);
    });
    expect(new Set(asked.map((a) => a.label)).size).toBe(asked.length);
  });

  it("is the same game with the line-up and without it, snap aside", () => {
    const fixture = buildGameFixture({ seed: "snap-inert-game" });
    const { home, away } = fixture.inputs.coordinates;
    const asked: Asked[] = [];
    const lined = simulateGame(
      fixture.state,
      {
        ...fixture.inputs,
        callers: {
          home: lining(fixture.inputs.callers.home, home, asked),
          away: lining(fixture.inputs.callers.away, away, asked),
        },
      },
      fixture.seed,
    );
    const plain = simulateGame(fixture.state, fixture.inputs, fixture.seed);
    expect(asked.length).toBeGreaterThan(100);
    expect(withoutSnap(lined.events)).toEqual(plain.events);
    expect(lined.summary).toEqual(plain.summary);
  });

  it("the engine's own caller draws no picture, and its plays carry none; nor does a line-up that draws none", () => {
    expect(defaultPlayCaller().lineUp).toBeUndefined();
    const fixture = buildGameFixture({ seed: "snap-none" });
    const plain = starts(simulateGame(fixture.state, fixture.inputs, fixture.seed).events);
    expect(plain.length).toBeGreaterThan(100);
    expect(plain.every((s) => !("snap" in s))).toBe(true);
    const blank = (caller: PlayCaller): PlayCaller => ({ ...caller, lineUp: () => undefined });
    const callers = { home: blank(fixture.inputs.callers.home), away: blank(fixture.inputs.callers.away) };
    const none = starts(simulateGame(fixture.state, { ...fixture.inputs, callers }, fixture.seed).events);
    expect(none).toEqual(plain);
  });
});
