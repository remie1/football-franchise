import { describe, it, expect } from "vitest";
import {
  ATTRIBUTE_REGISTRY_V1, MEASUREMENT_SCALES, POSITION_PROFILES, agilityFromCone, clampRating, jumpingFromVertical,
  onScale, positionOverall, speedFromForty, strengthFrom, strengthOnScale, type Position,
} from "../src/index.js";

// ADR-087 P5: the measurement scales and position profiles are ADR-079's ruled anchors, one shared copy.
describe("measurement scales (ADR-079 Q3, ADR-087 P5)", () => {
  it("each scale's anchors read 0 and 99, and clamp beyond them", () => {
    expect(speedFromForty(4.22)).toBe(99);
    expect(speedFromForty(5.6)).toBe(0);
    expect(speedFromForty(4.1)).toBe(99);
    expect(agilityFromCone(6.5)).toBe(99);
    expect(agilityFromCone(8.1)).toBe(0);
    expect(jumpingFromVertical(44)).toBe(99);
    expect(jumpingFromVertical(22)).toBe(0);
    expect(jumpingFromVertical(18)).toBe(0);
  });

  it("a hundredth on the 40 is worth about 0.72 points", () => {
    expect(onScale(4.44, MEASUREMENT_SCALES.forty) - onScale(4.45, MEASUREMENT_SCALES.forty)).toBeCloseTo(99 / 138, 9);
  });

  it("strength is bench reps plus mass, as ADR-079 states it", () => {
    expect(strengthFrom(26, 315)).toBe(75);
    expect(strengthFrom(14, 200)).toBe(42);
    expect(strengthOnScale(14, 200)).toBeCloseTo(42.4, 9);
  });

  it("clampRating rounds and keeps 0..99", () => {
    expect(clampRating(82.4)).toBe(82);
    expect(clampRating(-3)).toBe(0);
    expect(clampRating(120)).toBe(99);
  });
});

describe("position profiles and overall (ADR-079 R2/Q5, ADR-087 P5)", () => {
  const active = new Set(Object.values(ATTRIBUTE_REGISTRY_V1.attributes).filter((a) => a.status === "active").map((a) => String(a.id)));

  it("every rating a profile names is an active registry rating", () => {
    for (const [pos, p] of Object.entries(POSITION_PROFILES)) {
      for (const id of [...p.core, ...p.secondary, ...p.keyPhysical]) expect(active.has(id), `${pos}: ${id}`).toBe(true);
    }
  });

  it("every position has a profile with a core", () => {
    const positions: Position[] = ["QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "DE", "DT", "NT", "OLB", "MLB", "ILB", "CB", "FS", "SS", "K", "P", "LS"];
    for (const pos of positions) expect(POSITION_PROFILES[pos].core.length).toBeGreaterThan(0);
  });

  it("the overall is the core mean, or 0.7 core plus 0.3 key physical; a missing rating reads 0", () => {
    const qb = Object.fromEntries(POSITION_PROFILES.QB.core.map((id) => [id, 70]));
    expect(positionOverall("QB", qb)).toBe(70);
    const cb = { ...Object.fromEntries(POSITION_PROFILES.CB.core.map((id) => [id, 60])), speed: 90, agility: 80 };
    expect(positionOverall("CB", cb)).toBeCloseTo(0.7 * 60 + 0.3 * 85, 9);
    expect(positionOverall("K", { kickPower: 80 })).toBe(40);
  });
});
