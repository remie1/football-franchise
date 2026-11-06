/**
 * ADR-089 step 3, E4b: AN ARM WHOSE PETITION IS OUT, WITH P17 WITHHELD IN THIS SUITE ONLY.
 *
 * P17's doc text is in contracts (E4b), so no arm of this build is refused and C14 plays
 * (`pocketArms.test.ts`, `pocketStep3.test.ts`). The refusal of an arm whose petition is out stays
 * in the code (`armRefusal`, `armById`, `step3Arms` and `everyArm`, the command line, the step-3
 * plan); this suite reaches it by mocking calibration's `P17_IN_CONTRACTS` to false, and nothing
 * else. `withOverlay`'s own refusal of a late block on shape L reads the constant inside `rules.ts`,
 * which a mock of the export does not reach; the engine's `pocketRules.test.ts` covers that refusal
 * through `pocketRulesUnder`.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/pocket/rules.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/pocket/rules.js")>()),
  P17_IN_CONTRACTS: false,
}));

import { ALL_ARM_IDS, armById, armRefusal, everyArm, step3Arms } from "../src/pocket/arms.js";
import { EngineRulesError } from "../src/pocket/rules.js";
import { parsePocketArgs } from "../src/pocket/step0.js";
import { planStep3, STEP3_PLAYABLE } from "../src/pocket/step3.js";

const REASON =
  "C14 waits on petition P17 (the late block's rolled tick on shape L): the late block on shape L is refused until its doc text is in contracts (ADR-089 step 3, plan §3.4, §5.1); dropped if P17 is declined";

describe("an arm whose petition is out (P17 withheld in this suite only)", () => {
  it("is defined, not built: armById refuses it by name and armRefusal says why", () => {
    expect(armRefusal("C14")).toBe(REASON);
    expect(() => armById("C14")).toThrow(EngineRulesError);
    expect(() => armById("C14")).toThrow(/^arms: C14 waits on petition P17 .*: nothing plays it$/);
    for (const id of ALL_ARM_IDS) if (id !== "C14") expect(armRefusal(id), id).toBeUndefined();
    expect(everyArm().some((a) => a.id === "C14")).toBe(false);
    expect(step3Arms().some((a) => a.id === "C14")).toBe(false);
    expect(STEP3_PLAYABLE).not.toContain("C14");
  });

  it("the command line and the step-3 plan refuse it by that reason", () => {
    expect(() => parsePocketArgs(["--step", "3", "--arms", "C1,C14"], "/")).toThrow(`--arms: C14 is not playable: ${REASON}`);
    expect(() => parsePocketArgs(["--arms", "C14", "--part1", "--step", "3"], "/")).toThrow(`--arms: C14 is not playable: ${REASON}`);
    expect(() => planStep3({ arms: ["C1", "C14"] })).toThrow(`--arms: C14 is not playable: ${REASON}`);
    expect(planStep3({}).targets.some((t) => t.id === "C14")).toBe(false);
  });
});
