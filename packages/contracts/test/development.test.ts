import { describe, it, expect } from "vitest";
import {
  attrId, gameId, isTruthLayerEvent, playerId, teamId, TRUTH_LAYER_EVENT_TYPES,
  type FranchiseEvent, type GameParticipation, type PlayerState, type SaveFile,
} from "../src/index.js";

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
