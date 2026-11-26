/** ADR-093 step 0, the builder's table and field-constant checks (the field constants against the engine's own, in this file only). */
import { describe, expect, it } from "vitest";
import { DEFAULT_TUNABLES } from "../src/tunables.js";
import { FIELD_LENGTH, YARDS_TO_GAIN, GOAL_LINE_A } from "../src/rulebook/field.js";
import { FOUL_TABLE } from "../src/rulebook/fouls.js";

describe("impl: field constants", () => {
  it("match the engine's field", () => {
    expect(FIELD_LENGTH).toBe(100);
    expect(YARDS_TO_GAIN).toBe(10);
    expect(FIELD_LENGTH).toBe(DEFAULT_TUNABLES.game.field.goalLine);
    expect(YARDS_TO_GAIN).toBe(DEFAULT_TUNABLES.game.field.firstDownYards);
    expect(GOAL_LINE_A).toBe(DEFAULT_TUNABLES.game.field.safetyAtOrBehind);
  });
});

describe("impl: the foul table", () => {
  const expected: Record<string, [string, string, string, boolean]> = {
    FALSE_START: ["A", "BEFORE_SNAP", "5", false],
    DEFENSIVE_OFFSIDE: ["B", "AT_SNAP", "B5", false],
    NEUTRAL_ZONE_INFRACTION: ["B", "BEFORE_SNAP", "B5", false],
    ENCROACHMENT: ["B", "BEFORE_SNAP", "B5", false],
    OFFENSIVE_OFFSIDE: ["A", "AT_SNAP", "A5", false],
    ILLEGAL_USE_OF_HANDS: ["A,B", "DURING_PLAY", "A10B5", true],
    DEFENSIVE_HOLDING: ["B", "DURING_PLAY", "B5", true],
    OFFENSIVE_HOLDING: ["A", "DURING_PLAY", "A10", false],
    ROUGHING_THE_PASSER: ["B", "DURING_PLAY", "B15", true],
    TRIPPING: ["A,B", "DURING_PLAY", "A15B15", true],
    ILLEGAL_BLOCK_ABOVE_THE_WAIST: ["A", "DURING_PLAY", "A10", false],
    OFFENSIVE_PASS_INTERFERENCE: ["A", "DURING_PLAY", "A10", false],
    INTENTIONAL_GROUNDING: ["A", "DURING_PLAY", "A10", false],
  };
  it("has the rows plan section 4 lists", () => {
    for (const [kind, [by, when, yards, afd]] of Object.entries(expected)) {
      const r = FOUL_TABLE[kind as keyof typeof FOUL_TABLE];
      expect(r.by.join(","), kind).toBe(by);
      expect(r.when.join(","), kind).toBe(when);
      const y = `${r.yards.A !== undefined ? "A" + r.yards.A : ""}${r.yards.B !== undefined ? "B" + r.yards.B : ""}`;
      expect(y, kind).toBe(yards === "5" ? "A5" : yards);
      expect(r.afd, kind).toBe(afd);
    }
  });
  it("has 31 rows, frozen, and the loss-of-down kinds", () => {
    expect(Object.keys(FOUL_TABLE)).toHaveLength(31);
    expect(Object.isFrozen(FOUL_TABLE)).toBe(true);
    expect(Object.keys(FOUL_TABLE).filter((k) => FOUL_TABLE[k as keyof typeof FOUL_TABLE].lossOfDown).sort()).toEqual(["ILLEGAL_FORWARD_PASS", "INTENTIONAL_GROUNDING"]);
  });
});
