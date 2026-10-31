import { describe, expect, it } from "vitest";
import { BOOST, groupWeightsMarkdown, measureGroupWeights } from "../src/meeting/groupWeights.js";

// ADR-081 M1: the group-weight measure plays paired games and is the same from the same seed.
describe("group weights (ADR-081 M1)", () => {
  const run = () => measureGroupWeights({ games: 4, groups: ["QB"], seed: "gw-test" });
  const a = run();

  it("reports the control and each asked group", () => {
    expect(a.boost).toBe(BOOST);
    expect(a.groups.map((g) => g.group)).toEqual(["QB"]);
    expect(a.groups[0]!.games).toBe(4);
    expect(Number.isFinite(a.control.marginSd)).toBe(true);
    expect(groupWeightsMarkdown(a)).toMatch(/\| QB \|/);
  });

  it("is the same with the same seed", () => {
    expect(run()).toEqual(a);
  });
});
