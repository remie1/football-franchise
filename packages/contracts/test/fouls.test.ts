/**
 * ADR-093 F2 (step 1): `FOUL`, what a player did, flagged or not.
 *
 * Type-level, as the other ADR-093 files are: the `@ts-expect-error` lines and the pins
 * (`typePins.ts`) fail `pnpm --filter @ff/contracts typecheck` if the edit is loosened or lost, and
 * the runtime asserts show the shape survives JSON. Nothing produces a foul at step 1, so nothing
 * here can change a stream.
 */
import { describe, expect, it } from "vitest";
import type { FoulTiming, GameId, MatchEvent, PlayId, PlayerId, TeamId } from "../src/index.js";
import type { Is, OptionalKeys, UndefinedKeys } from "./typePins.js";

type FoulEvent = Extract<MatchEvent, { type: "FOUL" }>;
type FoulPayload = FoulEvent["payload"];

const p = "p1" as PlayerId;
const team = "T1" as TeamId;
const game = "g1" as GameId;
const ref = "g1/play:12/penalty:p1";

describe("ADR-093 F2: FOUL, what a player did, flagged or not", () => {
  const hold: FoulPayload = {
    kind: "OFFENSIVE_HOLDING", player: p, team, when: "DURING_PLAY", yardLine: 27, rollRef: ref, flagged: false,
  };

  it("happens at one of F1's four moments: before the snap, at it, during the play or after it", () => {
    // A defensive offside: a live ball at the snap, so the play ran.
    const offside: FoulPayload = { ...hold, kind: "DEFENSIVE_OFFSIDE", when: "AT_SNAP", yardLine: 45, flagged: true };
    // A false start: a dead ball before the snap, so none was made.
    const falseStart: FoulPayload = { ...hold, kind: "FALSE_START", when: "BEFORE_SNAP", yardLine: 45, flagged: true };
    const pin: true = true as Is<FoulPayload["when"], FoulTiming>;
    expect([offside.when, falseStart.when]).toEqual(["AT_SNAP", "BEFORE_SNAP"]);
    expect(pin).toBe(true);
  });

  it("a foul nobody flagged and a foul in a team's own end zone are both facts", () => {
    const inEndZone: FoulPayload = { ...hold, yardLine: -2, flagged: true };
    const event: FoulEvent = { type: "FOUL", payload: inEndZone, gameId: game, playId: "g1:12" as PlayId, tick: 4 };
    expect(JSON.parse(JSON.stringify(event))).toEqual(event);
    expect(hold.flagged).toBe(false);
  });

  it("names its kind, its yard line, the roll that made it and whether it was flagged, and carries no ruling", () => {
    // @ts-expect-error the kind is a FoulKind, not a free string
    const free: FoulPayload = { ...hold, kind: "holding" };
    // @ts-expect-error a foul names the penalty_check CHECK that made it (ADR-004)
    const noRoll: FoulPayload = { kind: "OFFENSIVE_HOLDING", player: p, team, when: "DURING_PLAY", yardLine: 27, flagged: false };
    // @ts-expect-error and says whether the officials flagged it
    const unsaid: FoulPayload = { kind: "OFFENSIVE_HOLDING", player: p, team, when: "DURING_PLAY", yardLine: 27, rollRef: ref };
    // @ts-expect-error a ruling is the PENALTY's, never the fact's
    const ruled: FoulPayload = { ...hold, outcome: "DECLINED" };
    // @ts-expect-error its place is a yard line, named as the record's other yard lines are; a spot is a kind of spot
    const spot: FoulPayload = { kind: "OFFENSIVE_HOLDING", player: p, team, when: "DURING_PLAY", spot: 27, rollRef: ref, flagged: false };
    expect([free, noRoll, unsaid, ruled, spot]).toHaveLength(5);
  });

  it("is about a play, so it names the play, and every key is stated", () => {
    // @ts-expect-error a play event without its playId does not compile
    const orphan: FoulEvent = { type: "FOUL", payload: hold, gameId: game };
    const pins: true[] = [
      true as Is<FoulEvent["playId"], PlayId>,
      true as Is<OptionalKeys<FoulPayload>, never>,
      true as Is<UndefinedKeys<FoulPayload>, never>,
    ];
    expect(orphan.type).toBe("FOUL");
    expect(pins).toHaveLength(3);
  });
});
