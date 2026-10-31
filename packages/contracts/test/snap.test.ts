/**
 * ADR-090 S1, S2 and S5: where every man stands at the snap, what it allows and what it refuses.
 *
 * The `@ts-expect-error` lines fail `pnpm --filter @ff/contracts typecheck` (part of `pnpm verify`)
 * if an edit is loosened or lost; the runtime asserts only show the file ran. Contracts gain types
 * and comments only, so nothing here can change a stream.
 */
import { describe, expect, it } from "vitest";
import type {
  GameId,
  MatchEvent,
  PlayCalls,
  PlayId,
  PlayStartSnap,
  PlayerId,
  PlayerSnapSpot,
  RunPlayCalls,
  SnapPicture,
  SnapSpot,
} from "../src/index.js";

const p = (id: string) => id as PlayerId;
const set: PlayerSnapSpot = { player: p("lt"), x: -3, y: -1, stance: "DOWN" };
const creeping: PlayerSnapSpot = { player: p("ss"), x: 4.5, y: 9, stance: "UP", moving: { dx: 0, dy: -1, yardsPerSecond: 3 } };
const picture: SnapPicture = { ballX: 0, offense: [set], defense: [creeping] };

describe("ADR-090 S1: a snap spot and the picture", () => {
  it("a set man writes no movement; a moving one states his direction and speed", () => {
    expect("moving" in set).toBe(false);
    expect(creeping.moving?.yardsPerSecond).toBe(3);
    expect(picture.offense.length + picture.defense.length).toBe(2);
  });

  it("refuses a stance that is not DOWN or UP, and a movement key with no movement", () => {
    // @ts-expect-error a stance is DOWN or UP
    const kneeling: SnapSpot = { x: 0, y: -5, stance: "KNEEL" };
    // @ts-expect-error exactOptionalPropertyTypes: a set man has no `moving` key at all
    const undef: SnapSpot = { x: 0, y: -5, stance: "UP", moving: undefined };
    expect([kneeling, undef].length).toBe(2);
  });
});

describe("ADR-090 S5: the calls carry the picture into the simulation", () => {
  it("a pass and a run may each carry one or none; a carried key always holds a picture", () => {
    const pass: Pick<PlayCalls, "snap"> = { snap: picture };
    const run: Pick<RunPlayCalls, "snap"> = { snap: picture };
    const none: Pick<PlayCalls, "snap"> = {};
    // @ts-expect-error exactOptionalPropertyTypes: no `snap: undefined`
    const undef: Pick<RunPlayCalls, "snap"> = { snap: undefined };
    expect([pass.snap, run.snap]).toEqual([picture, picture]);
    expect("snap" in none).toBe(false);
    expect(undef).toBeDefined();
  });
});

describe("ADR-090 S2: PLAY_START publishes the picture the calls carried", () => {
  it("a reader narrows the engine's payload to PlayStartSnap to read it", () => {
    type PlayStart = Extract<MatchEvent, { type: "PLAY_START" }>;
    const event: PlayStart = {
      type: "PLAY_START",
      gameId: "g" as GameId,
      playId: "g:play:1" as PlayId,
      payload: { offense: {}, defense: {}, snap: picture },
    };
    const read = (e: PlayStart): SnapPicture | undefined => (e.payload as PlayStartSnap).snap;
    expect(read(event)).toBe(picture);
    expect(read({ ...event, payload: { offense: {}, defense: {} } })).toBeUndefined();
  });
});
