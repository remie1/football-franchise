import { describe, it, expect } from "vitest";
import { createRng } from "../src/rng.js";
import { ATTRIBUTE_REGISTRY_V1, getAttr, setAttr, attrMod, applyMigration } from "../src/registry.js";
import { attrId } from "../src/ids.js";
import { compareStamps } from "../src/calendar.js";

describe("PRNG determinism (Charter pillar 5)", () => {
  it("same seed produces an identical sequence", () => {
    const a = createRng("world-1");
    const b = createRng("world-1");
    const sa = Array.from({ length: 500 }, () => a.d100());
    const sb = Array.from({ length: 500 }, () => b.d100());
    expect(sa).toEqual(sb);
  });

  it("different seeds diverge", () => {
    const a = Array.from({ length: 100 }, (_, i) => createRng("world-1").int(1, 1000));
    const b = Array.from({ length: 100 }, (_, i) => createRng("world-2").int(1, 1000));
    expect(a).not.toEqual(b);
  });

  it("forks are deterministic and independent", () => {
    const p1 = createRng("w").fork("game:1/play:3");
    const p2 = createRng("w").fork("game:1/play:3");
    const other = createRng("w").fork("game:1/play:4");
    const s1 = Array.from({ length: 50 }, () => p1.d100());
    const s2 = Array.from({ length: 50 }, () => p2.d100());
    const s3 = Array.from({ length: 50 }, () => other.d100());
    expect(s1).toEqual(s2);
    expect(s1).not.toEqual(s3);
  });

  it("consuming a parent does not disturb its forks", () => {
    const parent = createRng("w");
    parent.d100(); parent.d100();
    const forkAfter = parent.fork("x");
    const forkFresh = createRng("w").fork("x");
    expect(forkAfter.d100()).toEqual(forkFresh.d100());
  });

  it("d100 stays in range and covers the space", () => {
    const r = createRng("range");
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i++) {
      const v = r.d100();
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(100);
      seen.add(v);
    }
    expect(seen.size).toBe(100);
  });

  it("d100 mean is near 50.5", () => {
    const r = createRng("mean");
    let total = 0;
    const n = 100000;
    for (let i = 0; i < n; i++) total += r.d100();
    expect(Math.abs(total / n - 50.5)).toBeLessThan(0.5);
  });
});

describe("attribute registry", () => {
  it("reads through getAttr with fallback, never hard-coded fields", () => {
    const map = setAttr({}, attrId("speed"), 88);
    expect(getAttr(map, attrId("speed"))).toBe(88);
    expect(getAttr(map, attrId("accuracy"), 50)).toBe(50);
  });

  it("clamps to the 0-99 scale", () => {
    expect(getAttr(setAttr({}, attrId("speed"), 140), attrId("speed"))).toBe(99);
    expect(getAttr(setAttr({}, attrId("speed"), -20), attrId("speed"))).toBe(0);
  });

  it("attrMod contributes rating/5 per the design doc", () => {
    expect(attrMod(setAttr({}, attrId("speed"), 85), attrId("speed"))).toBe(17);
  });

  it("v1 registry is populated and internally consistent", () => {
    const defs = Object.values(ATTRIBUTE_REGISTRY_V1.attributes);
    expect(defs.length).toBeGreaterThan(40);
    for (const d of defs) {
      expect(d.positionGroups.length).toBeGreaterThan(0);
      expect(d.status).toBe("active");
    }
  });

  it("migration merges attributes (the calibration kill/merge path)", () => {
    const before = setAttr(setAttr({}, attrId("routeShort"), 80), attrId("routeDeep"), 60);
    const after = applyMigration(before, {
      fromVersion: 1, toVersion: 2,
      ops: [
        { op: "add", attr: { ...ATTRIBUTE_REGISTRY_V1.attributes["routeRunning"]! },
          defaultFrom: { sources: [attrId("routeShort"), attrId("routeDeep")], method: "mean" } },
        { op: "deprecate", id: attrId("routeShort") },
        { op: "deprecate", id: attrId("routeDeep") },
      ],
    });
    expect(getAttr(after, attrId("routeRunning"))).toBe(70);
    expect(after["routeShort"]).toBeUndefined();
  });
});

describe("calendar ordering", () => {
  it("orders phases within a season and across seasons", () => {
    const a = { season: 2026, phase: "REGULAR_SEASON" as const, week: 3, day: 1 };
    const b = { season: 2026, phase: "PLAYOFFS" as const, week: 1, day: 1 };
    const c = { season: 2027, phase: "OFF_EVAL" as const, week: 1, day: 1 };
    expect(compareStamps(a, b)).toBeLessThan(0);
    expect(compareStamps(b, c)).toBeLessThan(0);
    expect(compareStamps(a, a)).toBe(0);
  });
});
