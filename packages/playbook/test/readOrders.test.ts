/**
 * WHO THE PROGRESSION LOOKS AT — the target-share rewrite (calibration backlog 171).
 *
 * The engine throws only to men named in a card's read order, so the read orders decide
 * target share by position. With every tight end in every progression and on the front
 * of a quarter of the corpus, tight ends drew 40% of targets (real 22%) and wide
 * receivers 41% (real 60%); with Flood's fullback as its designed hot, fullbacks drew 6%
 * (real 0.6%). These pin the rewrite's two decisions so they cannot drift back quietly.
 */
import { describe, expect, it } from "vitest";
import { FLOOD, PASS_CONCEPTS } from "../src/passConcepts.js";

const weightedFirstReadShare = (role: string): number => {
  let total = 0;
  let first = 0;
  for (const concept of PASS_CONCEPTS) {
    total += concept.usage.weight;
    if (concept.readOrder[0] === role) first += concept.usage.weight;
  }
  return first / total;
};

describe("read orders put the receivers first", () => {
  it("Flood throws its flat to the tailback; the fullback stays in to block", () => {
    expect(Object.keys(FLOOD.routes)).not.toContain("FB");
    expect(FLOOD.routes.RB?.routeName).toBe("Flat");
    expect(FLOOD.protection.protectors.map((p) => p.role)).toContain("FB");
    expect(FLOOD.readOrder).toEqual(["Z", "TE_Y", "RB"]);
  });

  it("the fullback is a designed read on Split Backs Texas only", () => {
    expect(PASS_CONCEPTS.filter((c) => (c.readOrder as readonly string[]).includes("FB")).map((c) => c.id)).toEqual([
      "PASS_SPLIT_BACKS_TEXAS",
    ]);
  });

  it("the Y tight end is the first read on at most a sixth of the weighted corpus", () => {
    // 15.3% after the rewrite; 24.6% before it.
    expect(weightedFirstReadShare("TE_Y")).toBeLessThanOrEqual(1 / 6);
  });

  it("a wide receiver is the first read on most of the weighted corpus", () => {
    const wr = ["X", "Z", "SLOT", "SLOT2", "SLOT3"].reduce((s, r) => s + weightedFirstReadShare(r), 0);
    expect(wr).toBeGreaterThan(0.75);
  });
});
