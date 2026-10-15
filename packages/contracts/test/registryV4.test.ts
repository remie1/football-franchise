import { describe, it, expect } from "vitest";
import { ATTRIBUTE_REGISTRY_V1, MIGRATION_V3_TO_V4, applyMigration, getAttr, setAttr } from "../src/registry.js";
import { attrId } from "../src/ids.js";

/** ADR-072 (ADR-068 step 2): registry v3 -> v4 adds `discipline`. */
describe("registry v4: discipline", () => {
  it("the registry is schema version 4, and the migration lands on it", () => {
    expect(ATTRIBUTE_REGISTRY_V1.schemaVersion).toBe(4);
    expect(MIGRATION_V3_TO_V4.fromVersion).toBe(3);
    expect(MIGRATION_V3_TO_V4.toVersion).toBe(ATTRIBUTE_REGISTRY_V1.schemaVersion);
  });

  it("discipline is every position's, mental, active, and introduced in version 4", () => {
    const d = ATTRIBUTE_REGISTRY_V1.attributes["discipline"];
    expect(d).toBeDefined();
    expect(d!.id).toBe(attrId("discipline"));
    expect(d!.category).toBe("mental");
    expect(d!.status).toBe("active");
    expect(d!.introducedIn).toBe(4);
    expect([...d!.positionGroups].sort()).toEqual(["DB", "DL", "FB", "LB", "OL", "QB", "RB", "ST", "TE", "WR"]);
  });

  it("the migration is one add with no default: a v3 map comes through unchanged and reads 50", () => {
    expect(MIGRATION_V3_TO_V4.ops).toHaveLength(1);
    const op = MIGRATION_V3_TO_V4.ops[0]!;
    expect(op.op).toBe("add");
    if (op.op !== "add") return;
    expect(op.attr).toBe(ATTRIBUTE_REGISTRY_V1.attributes["discipline"]);
    expect(op.defaultFrom).toBeUndefined();
    const v3 = setAttr(setAttr({}, attrId("awareness"), 88), attrId("footballIQ"), 71);
    const v4 = applyMigration(v3, MIGRATION_V3_TO_V4);
    expect(v4).toEqual(v3);
    expect(getAttr(v4, attrId("discipline"))).toBe(50);
  });
});
