import { describe, it, expect } from "vitest";
import {
  ABILITY_GROUPS, attrId, gameId, isTruthLayerEvent, playerId, teamId, TRUTH_LAYER_EVENT_TYPES,
  type AbilityGroup, type CalendarStamp, type FranchiseEvent, type GameParticipation, type InjuryRecord,
  type PlayerCondition, type PlayerDevelopment, type PlayerState, type SaveFile, type TeamId,
} from "../src/index.js";
import type { Is, OptionalKeys, UndefinedKeys } from "./typePins.js";

// ADR-087 P1-P4, P6, S1, E1-E5: plain data that survives a save round-trip unchanged.
const since = { season: 2027, phase: "REGULAR_SEASON" as const, week: 4, day: 7 };

const player: Omit<PlayerState, "attributes"> & { attributes: Omit<PlayerState["attributes"], "traits"> } = {
  bio: { id: playerId("p1"), displayName: "A Back", position: "RB", age: 24, heightIn: 70, weightLb: 210, draft: "UDFA",
    creditedSeasons: 2, combine: { forty: 4.45, cone: 7.0, vertical: 36 } },
  attributes: { kind: "true", values: { speed: 83 },
    development: { growth: 1.1, snaps: 1450, carry: { vision: 0.4 }, body: { forty: 4.46, cone: 7.02, vertical: 35.5, bench: 18 } } },
  condition: { stamina: 100, morale: 0,
    injury: { kind: "ANKLE_SPRAIN", weeksRemaining: 2, playable: false, setting: "GAME", band: "SHORT", since } },
  personality: { needs: {}, type: "quiet", patience: 1.4 },
};

describe("players age, grow and get hurt (ADR-087)", () => {
  it("a developing, injured player survives JSON unchanged", () => {
    expect(JSON.parse(JSON.stringify(player))).toEqual(player);
  });

  it("a who-played report survives JSON unchanged", () => {
    const report: GameParticipation = {
      player: playerId("p1"), team: teamId("T1"), snaps: { offense: 41, defense: 0, special: 6 },
      contests: [{ attr: attrId("passBlock"), won: 3, lost: 1 }],
    };
    expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  });

  it("only the rating and lasting-mark events are truth layer", () => {
    const events: FranchiseEvent[] = [
      { type: "RATINGS_CHANGED", payload: { team: teamId("T1"), changes: [{ player: playerId("p1"), attr: attrId("vision"), from: 61, to: 62 }],
        body: [{ player: playerId("p1"), measure: "forty", from: 4.46, to: 4.47 }] } },
      { type: "INJURY_HEALED", payload: { player: playerId("p1"), lasting: [] } },
      { type: "INJURY_OCCURRED", payload: { player: playerId("p1"), kind: "ACL", weeks: 40, setting: "PRACTICE", band: "MAJOR" } },
      { type: "INJURY_OCCURRED", payload: { player: playerId("p1"), kind: "HAND", weeks: 3, setting: "GAME", band: "SHORT", game: gameId("g1") } },
      { type: "PLAYER_RETIRED", payload: { player: playerId("p1"), timing: "SEASON_END", reason: "UNSIGNED" } },
      { type: "DEPTH_CHART_CHANGED", payload: { team: teamId("T1"), position: "RB", up: playerId("p2"), down: playerId("p1"),
        situation: "INJURY_COVER", authority: "COACH", decidedBy: "NPC" } },
      { type: "POSITION_BATTLE_DECLARED", payload: { team: teamId("T1"), position: "CB", players: [playerId("p3"), playerId("p4")], authority: "COACH", decidedBy: "NPC" } },
      { type: "POSITION_BATTLE_ENDED", payload: { team: teamId("T1"), position: "CB", starter: playerId("p4"), authority: "COACH", decidedBy: "NPC" } },
    ];
    expect(events.filter(isTruthLayerEvent).map((e) => e.type)).toEqual(["RATINGS_CHANGED", "INJURY_HEALED"]);
    expect([...TRUTH_LAYER_EVENT_TYPES].sort()).toEqual(["INJURY_HEALED", "RATINGS_CHANGED"]);
    expect(JSON.parse(JSON.stringify(events))).toEqual(events);
  });

  it("a save's development slot holds envelopes and the steps' memory", () => {
    const slot: NonNullable<SaveFile["world"]["development"]> = {
      events: [{ seq: 0, at: since, event: { type: "INJURY_HEALED", payload: { player: playerId("p1"), lasting: [{ attr: attrId("speed"), from: 83, to: 81 }] } } }],
      depthMemory: { battles: [] },
    };
    expect(JSON.parse(JSON.stringify(slot))).toEqual(slot);
  });
});

/**
 * ADR-087 §12 (AB0): P7, P8 and E6. Optional fields only, and nothing sends or reads them yet, so
 * nothing here can change a stream. The pins (`typePins.ts`) fail `pnpm --filter @ff/contracts
 * typecheck` if an edit is loosened or lost; the runtime asserts show the shapes survive JSON.
 */
type RetiredPayload = Extract<FranchiseEvent, { type: "PLAYER_RETIRED" }>["payload"];

const development: PlayerDevelopment = { growth: 1, snaps: 0, carry: {}, body: { forty: 4.6, cone: 7.1, vertical: 33, bench: 20 } };
const healed: CalendarStamp = { season: 2027, phase: "REGULAR_SEASON", week: 10, day: 1 };

describe("aging by ability: the AB0 edits (ADR-087 §12)", () => {
  it("P7: the 12 ability groups in order, and a shift for any of them, fixed for life", () => {
    expect([...ABILITY_GROUPS]).toEqual([
      "SPEED", "QUICKNESS", "SPRING", "STRENGTH", "ARM", "LEG",
      "STAMINA", "DURABILITY", "TECHNIQUE", "PASSING", "KICKING", "SMARTS",
    ]);
    const shifted: PlayerDevelopment = { ...development, fadeShift: { SPEED: -1.25, QUICKNESS: -0.4, SMARTS: 2 } };
    // @ts-expect-error a shift is kept only for one of the 12 groups
    const notAGroup: PlayerDevelopment = { ...development, fadeShift: { VISION: 1 } };
    // @ts-expect-error exactOptionalPropertyTypes: fadeShift: undefined is refused, so a record with no shifts writes no key
    const undef: PlayerDevelopment = { ...development, fadeShift: undefined };
    // The order is pinned on the tuple, since a union has none: the same names swapped are a different tuple.
    const swapped: false = false as Is<typeof ABILITY_GROUPS, readonly [
      "QUICKNESS", "SPEED", "SPRING", "STRENGTH", "ARM", "LEG",
      "STAMINA", "DURABILITY", "TECHNIQUE", "PASSING", "KICKING", "SMARTS",
    ]>;
    const pins: true[] = [
      true as Is<typeof ABILITY_GROUPS, readonly [
        "SPEED", "QUICKNESS", "SPRING", "STRENGTH", "ARM", "LEG",
        "STAMINA", "DURABILITY", "TECHNIQUE", "PASSING", "KICKING", "SMARTS",
      ]>,
      true as Is<AbilityGroup, (typeof ABILITY_GROUPS)[number]>,
      true as Is<OptionalKeys<PlayerDevelopment>, "fadeShift">,
      true as Is<UndefinedKeys<PlayerDevelopment>, never>,
      true as Is<NonNullable<PlayerDevelopment["fadeShift"]>, Partial<Record<AbilityGroup, number>>>,
      // Two all-optional records are each assignable to the other whatever their keys, so the keys are pinned on their own.
      true as Is<keyof NonNullable<PlayerDevelopment["fadeShift"]>, AbilityGroup>,
    ];
    expect(Object.keys(development)).not.toContain("fadeShift");
    expect(JSON.parse(JSON.stringify(shifted))).toEqual(shifted);
    expect([notAGroup, undef, swapped]).toHaveLength(3);
    expect(pins).toHaveLength(6);
  });

  it("P8: a past injury has exactly its four keys, and the history before the first day is optional", () => {
    const history: InjuryRecord[] = [
      { kind: "real:knee", weeks: 6, since, healed },
      { kind: "real:concussion", weeks: 1, since: { season: 2028, phase: "REGULAR_SEASON", week: 2, day: 7 }, healed: { season: 2028, phase: "REGULAR_SEASON", week: 4, day: 1 } },
    ];
    const withHistory: PlayerCondition = { stamina: 100, morale: 0, injuryHistory: history };
    const noneKnown: PlayerCondition = { stamina: 100, morale: 0 };
    // @ts-expect-error a past injury carries no free text beyond its kind
    const note: InjuryRecord = { ...history[0]!, note: "x" };
    // @ts-expect-error every one of the four is stated
    const noHealed: InjuryRecord = { kind: "real:knee", weeks: 6, since };
    // @ts-expect-error exactOptionalPropertyTypes: injuryHistory: undefined is refused, so none known writes no key
    const undef: PlayerCondition = { ...noneKnown, injuryHistory: undefined };
    const pins: true[] = [
      true as Is<keyof InjuryRecord, "kind" | "weeks" | "since" | "healed">,
      true as Is<OptionalKeys<InjuryRecord>, never>,
      true as Is<UndefinedKeys<InjuryRecord>, never>,
      true as Is<InjuryRecord["kind"], string>,
      true as Is<InjuryRecord["weeks"], number>,
      true as Is<InjuryRecord["since"], CalendarStamp>,
      true as Is<InjuryRecord["healed"], CalendarStamp>,
      true as Is<OptionalKeys<PlayerCondition>, "injury" | "injuryHistory">,
      true as Is<UndefinedKeys<PlayerCondition>, never>,
      true as Is<NonNullable<PlayerCondition["injuryHistory"]>, InjuryRecord[]>,
    ];
    expect(JSON.parse(JSON.stringify(withHistory))).toEqual(withHistory);
    expect(Object.keys(noneKnown)).not.toContain("injuryHistory");
    expect([note, noHealed, undef]).toHaveLength(3);
    expect(pins).toHaveLength(10);
  });

  it("E6: a retirement says whether he chose it, and the team he left; old retirements still read", () => {
    const own: FranchiseEvent = { type: "PLAYER_RETIRED", payload: { player: playerId("p1"), timing: "IMMEDIATE", reason: "OWN_CHOICE", team: teamId("T1") } };
    const freeAgent: RetiredPayload = { player: playerId("p2"), timing: "LATE", reason: "OWN_CHOICE" };
    const beforeE6: RetiredPayload = { player: playerId("p3"), timing: "SEASON_END" };
    // @ts-expect-error only the two reasons
    const released: RetiredPayload = { player: playerId("p1"), timing: "SLOW", reason: "RELEASED" };
    // @ts-expect-error exactOptionalPropertyTypes: team: undefined is refused, so a free agent writes no key
    const undef: RetiredPayload = { ...freeAgent, team: undefined };
    const pins: true[] = [
      true as Is<RetiredPayload["reason"], "UNSIGNED" | "OWN_CHOICE" | undefined>,
      true as Is<keyof RetiredPayload, "player" | "timing" | "reason" | "team">,
      true as Is<OptionalKeys<RetiredPayload>, "reason" | "team">,
      true as Is<UndefinedKeys<RetiredPayload>, never>,
      true as Is<NonNullable<RetiredPayload["team"]>, TeamId>,
    ];
    expect(isTruthLayerEvent(own)).toBe(false);
    expect(JSON.parse(JSON.stringify([own, freeAgent, beforeE6]))).toEqual([own, freeAgent, beforeE6]);
    expect(Object.keys(freeAgent)).not.toContain("team");
    expect([released, undef]).toHaveLength(2);
    expect(pins).toHaveLength(5);
  });
});
