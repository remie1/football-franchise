import { describe, it, expect } from "vitest";
import { generateDraftClass, DRAFT_CLASS_SIZE } from "../src/index.js";

describe("draft class maker (ADR-086 D2)", () => {
  const c = generateDraftClass({ seed: "w", draft: 2027 });

  it("makes a class of prospects, the same every time for the same seed and year", () => {
    expect(c.players).toHaveLength(DRAFT_CLASS_SIZE);
    expect(c.draftClass).toEqual({ draft: 2027, prospects: c.players.map((p) => p.bio.id) });
    expect(JSON.stringify(generateDraftClass({ seed: "w", draft: 2027 }).players.map((p) => p.attributes.values)))
      .toBe(JSON.stringify(c.players.map((p) => p.attributes.values)));
    expect(generateDraftClass({ seed: "w", draft: 2028 }).players[0]!.attributes.values).not.toEqual(c.players[0]!.attributes.values);
  });

  it("gives every prospect a unique id and name, draft status PROSPECT, no team, age 21-23, combine numbers and an overall", () => {
    expect(new Set(c.players.map((p) => p.bio.id)).size).toBe(c.players.length);
    expect(new Set(c.players.map((p) => p.bio.displayName)).size).toBe(c.players.length);
    for (const p of c.players) {
      expect(p.bio.draft).toBe("PROSPECT");
      expect(p.teamId).toBeUndefined();
      expect(p.bio.age).toBeGreaterThanOrEqual(21);
      expect(p.bio.age).toBeLessThanOrEqual(23);
      expect(c.combine[String(p.bio.id)]!.forty).toBeGreaterThan(4);
      expect(c.overall[String(p.bio.id)]).toBeGreaterThan(0);
    }
  });

  it("never reuses a name already in the league", () => {
    const taken = new Set(c.players.slice(0, 50).map((p) => p.bio.displayName));
    const next = generateDraftClass({ seed: "w", draft: 2027, usedNames: taken, size: 200 });
    expect(next.players.filter((p) => taken.has(p.bio.displayName))).toHaveLength(0);
  });

  it("has every position, roughly in a roster's proportions", () => {
    const n = (pos: string) => c.players.filter((p) => p.bio.position === pos).length;
    expect(n("WR")).toBeGreaterThan(n("FB"));
    expect(n("CB")).toBeGreaterThan(50);
    expect(n("LS")).toBeGreaterThan(0);
  });
});
