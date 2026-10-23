import { describe, it, expect } from "vitest";
import {
  teamId, storylineId, DEFAULT_LEAGUE_RULES, SAVE_FORMAT_VERSION,
  type FranchiseEvent, type NarrativeEffect, type RelationshipView, type SaveFile, type StaffId,
} from "../src/index.js";

// ADR-084 V1-V3: relationship views are plain data and survive a save round-trip unchanged.
const at = { season: 2027, phase: "OFF_EVAL" as const, week: 1, day: 1 };
const dc = "S00010" as StaffId;
const gm = "S00011" as StaffId;

const views: RelationshipView[] = [
  { from: dc, of: { staff: gm }, score: -31.5, rift: { since: at, cause: "OPEN_ARGUMENT" } },
  { from: gm, of: { staff: dc }, score: -18 },
  { from: dc, of: { user: teamId("T1") }, score: 8 },
];

describe("relationship shapes (ADR-084)", () => {
  it("V1: views one way each, a rift and a view of the user, survive JSON unchanged", () => {
    expect(JSON.parse(JSON.stringify(views))).toEqual(views);
  });

  it("V1: a save carries the views, and a save without them still type-checks", () => {
    const save: SaveFile = {
      formatVersion: SAVE_FORMAT_VERSION, createdBy: "test", registrySchemaVersion: 1, worldSeed: "s", calendar: at,
      leagueRules: DEFAULT_LEAGUE_RULES,
      world: {
        teams: [], players: [], staff: [], relationships: views, contracts: [], perceptions: [],
        league: { conferences: [], divisions: [] }, season: null, narrativeState: null, fashion: null,
      },
      history: { seasons: [], transactions: [] },
    };
    expect(JSON.parse(JSON.stringify(save))).toEqual(save);
    const { relationships: _omit, ...older } = save.world;
    const before: SaveFile = { ...save, world: older };
    expect(before.world.relationships).toBeUndefined();
  });

  it("V2: the event names whose view moved, of whom, why, and the words before and after", () => {
    const moved: FranchiseEvent = {
      type: "RELATIONSHIP_CHANGED",
      payload: { from: dc, of: { staff: gm }, delta: -25, cause: "OPEN_ARGUMENT", before: "strained", after: "broken", rift: "OPENED" },
    };
    expect(JSON.parse(JSON.stringify(moved))).toEqual(moved);
  });

  it("V3: a story effect moves one view and may repair a grudge", () => {
    const effect: NarrativeEffect = {
      kind: "RELATIONSHIP_DELTA", from: dc, of: { staff: gm }, delta: 15, rift: "REPAIR", reason: storylineId("bad-blood-1"),
    };
    expect(effect.kind).toBe("RELATIONSHIP_DELTA");
  });
});
