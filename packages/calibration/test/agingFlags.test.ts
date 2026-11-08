/**
 * ADR-087 §12.1 (step AB3): the aging options on the command line (`agingFlags.ts`), and how they
 * travel: into the players' switches (`PlayerSwitches`) and from there to the stand-in loader, the
 * generator and franchise's players' steps, so a run with `aging: "ability"` reaches the steps with
 * every man's 12 fade shifts (the AB2 trap: the loader drops them unless the switches carry the
 * aging). Also the calibration copy of the ability groups against franchise's own table (§12.2.7,
 * test 11: one digest, pinned on both sides).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ABILITY_GROUPS, type CalendarStamp, type PlayerState } from "@ff/contracts";
import { generateDraftClass } from "@ff/attributes";
import {
  SET_SMARTS_SNAPS, actingRules, agingFromRecord, agingLabel, assertRulesAct, readAgingFlag, sameAging, seasonAging, seasonPlayers, settleAging,
  type AgingFlags,
} from "../src/season/agingFlags.js";
import { draftClassOptions, runCapCheck, type CapCheckInput } from "../src/season/capCheck.js";
import { ABILITY_GROUP_COPY, ABILITY_GROUP_DIGEST, CONTACT_ROLL_SETS, CONTACT_ROLL_SETS_DIGEST, contactOf } from "../src/season/careerAging.js";
import { ARMS, agingActsOn, agingForArms, armRules, armSwitches, injuryRiskActsOn } from "../src/season/playerChecksRun.js";
import { agingOf, runRealSeason } from "../src/season/realSeason.js";
import { participationFrom } from "../src/season/participation.js";
import { readStandInFile } from "../src/season/standInLeague.js";
import type { SeasonPeople } from "../src/season/realSeason.js";

const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
const text = readFileSync(FILE, "utf8");
const file = readStandInFile(text);

/** The flags of one command line, read and settled as the commands read them. */
function flags(...argv: string[]) {
  const into: AgingFlags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!readAgingFlag(arg, () => { const v = argv[++i]; if (v === undefined) throw new SyntaxError(`${arg} requires a value`); return v; }, into)) {
      throw new SyntaxError(`not an aging flag: ${arg}`);
    }
  }
  return settleAging(into);
}

describe("the aging flags (§12.1)", () => {
  it("reads --aging, the tuning flags and --ability-rules, and drops the defaults", () => {
    expect(flags()).toEqual({});
    expect(flags("--aging", "position")).toEqual({});
    expect(flags("--aging", "ability")).toEqual({ aging: "ability" });
    // AB5: --ability-rules sets --injury-risk spot beside --aging ability.
    expect(flags("--ability-rules")).toStrictEqual({ aging: "ability", injuryRisk: "spot" });
    expect(flags("--aging", "ability", "--ability-rules")).toStrictEqual({ aging: "ability", injuryRisk: "spot" });
    expect(flags("--aging", "ability", "--ability-curves", "D")).toEqual({ aging: "ability" });
    expect(flags("--aging", "ability", "--ability-curves", "B", "--technique-knee", "--smarts-snaps", "0.225"))
      .toEqual({ aging: "ability", abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 });
    expect(flags("--ability-rules", "--smarts-snaps", "0")).toStrictEqual({ aging: "ability", smartsSnaps: 0, injuryRisk: "spot" });
    // A smarts-snaps value equal to the chosen set's own is that set's rules: dropped, one name for one set of rules.
    expect(flags("--aging", "ability", "--smarts-snaps", "0.45")).toStrictEqual({ aging: "ability" });
    expect(flags("--aging", "ability", "--ability-curves", "B", "--smarts-snaps", "0.45")).toStrictEqual({ aging: "ability", abilityCurves: "B" });
    expect(agingLabel({ aging: "ability", smartsSnaps: 0.45 })).toBe("ability");
    expect(agingFromRecord({ development: true, injuries: true, aging: "ability", smartsSnaps: 0.45 })).toStrictEqual({ aging: "ability" });
  });

  it("holds each set's own smarts snaps as franchise's table does (ABILITY_CURVES, read from its source)", () => {
    const source = readFileSync(join(__dirname, "..", "..", "franchise", "src", "players", "aging.ts"), "utf8");
    const own = (set: "D" | "B") => Number(new RegExp(`\\n  ${set}: \\{[\\s\\S]*?\\n    smartsSnaps: ([0-9.]+),`).exec(source)?.[1]);
    expect(own("D")).toBe(SET_SMARTS_SNAPS.D);
    expect(own("B")).toBe(SET_SMARTS_SNAPS.B);
    expect(SET_SMARTS_SNAPS).toEqual({ D: 0.45, B: 0.45 });
  });

  it("refuses the season command's aging flags with --load and --aging ability without --development, and carries a save's own on", () => {
    const typed = (...argv: string[]) => { const into: AgingFlags = {}; for (let i = 0; i < argv.length; i++) readAgingFlag(argv[i]!, () => argv[++i]!, into); return into; };
    expect(seasonAging({}, { load: true, development: false })).toEqual({});
    expect(seasonAging(typed("--aging", "ability"), { load: false, development: true })).toEqual({ aging: "ability" });
    expect(() => seasonAging(typed("--aging", "ability"), { load: true, development: false })).toThrow(/--load carries on with the save's own aging options/);
    expect(() => seasonAging(typed("--aging", "position"), { load: true, development: false })).toThrow(/--load carries on/);
    expect(() => seasonAging(typed("--aging", "ability"), { load: false, development: false })).toThrow(/add --development/);
    expect(() => seasonAging(typed("--ability-rules"), { load: false, development: false })).toThrow(/add --development/);
    expect(seasonAging(typed("--aging", "position"), { load: false, development: false })).toEqual({});
    // A new league: the flags' switches, only with a switch on; the aging options only when not the default.
    expect(seasonPlayers({ loaded: false, development: false, injuries: false, aging: {} })).toBeUndefined();
    expect(seasonPlayers({ loaded: false, development: true, injuries: false, aging: {} })).toStrictEqual({ development: true, injuries: false });
    expect(seasonPlayers({ loaded: false, development: true, injuries: true, aging: { aging: "ability", techniqueKnee: true } }))
      .toStrictEqual({ development: true, injuries: true, aging: "ability", techniqueKnee: true });
    // Carrying on: the save's own, aging options restored, whatever the command line held.
    expect(seasonPlayers({ loaded: true, development: false, injuries: false, aging: {} })).toBeUndefined();
    expect(seasonPlayers({ loaded: true, saved: { development: true, injuries: false }, development: false, injuries: false, aging: {} }))
      .toStrictEqual({ development: true, injuries: false });
    expect(seasonPlayers({ loaded: true, saved: { development: true, injuries: true, aging: "ability", abilityCurves: "B" }, development: false, injuries: false, aging: {} }))
      .toStrictEqual({ development: true, injuries: true, aging: "ability", abilityCurves: "B" });
    expect(() => seasonPlayers({ loaded: true, saved: { development: true, injuries: true, aging: "abilty" }, development: false, injuries: false, aging: {} }))
      .toThrow(/does not know/);
  });

  it("refuses a value it does not take, a tuning flag off the ability path, and --ability-rules beside --aging position", () => {
    expect(() => flags("--aging", "Ability")).toThrow(/position or ability/);
    expect(() => flags("--aging")).toThrow(/requires a value/);
    expect(() => flags("--ability-curves", "C", "--aging", "ability")).toThrow(/D or B/);
    for (const bad of ["-1", "", " ", "x", "NaN", "Infinity"]) expect(() => flags("--aging", "ability", "--smarts-snaps", bad), bad).toThrow(/0 or more/);
    expect(() => flags("--ability-curves", "B")).toThrow(/act only on the ability path/);
    expect(() => flags("--aging", "position", "--technique-knee")).toThrow(/act only on the ability path/);
    expect(() => flags("--smarts-snaps", "0.225")).toThrow(/act only on the ability path/);
    expect(() => flags("--aging", "position", "--ability-rules")).toThrow(/drop --aging position/);
  });

  it("names the options for cache keys and file names, and nothing at the defaults", () => {
    expect(agingLabel({})).toBeUndefined();
    expect(agingLabel({ aging: "position" })).toBeUndefined();
    expect(agingLabel({ aging: "ability" })).toBe("ability");
    expect(agingLabel({ aging: "ability", abilityCurves: "B" })).toBe("ability-B");
    expect(agingLabel({ aging: "ability", techniqueKnee: true, smartsSnaps: 0.225 })).toBe("ability-knee-smarts0.225");
    expect(sameAging({}, { aging: "position" })).toBe(true);
    expect(sameAging({ aging: "ability" }, { aging: "ability", abilityCurves: "D" })).toBe(true);
    expect(sameAging({ aging: "ability" }, {})).toBe(false);
    expect(sameAging({ aging: "ability" }, { aging: "ability", smartsSnaps: 0.225 })).toBe(false);
  });

  it("carries on with what a save recorded, at the defaults when it recorded nothing, and refuses what it does not know", () => {
    expect(agingFromRecord(undefined)).toEqual({});
    expect(agingFromRecord({ development: true, injuries: true })).toEqual({});
    expect(agingFromRecord({ development: true, injuries: false, aging: "ability" })).toEqual({ aging: "ability" });
    expect(agingFromRecord({ development: true, injuries: false, aging: "ability", abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 }))
      .toEqual({ aging: "ability", abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 });
    expect(() => agingFromRecord({ aging: "abilty" })).toThrow(/does not know/);
    expect(() => agingFromRecord({ aging: "ability", abilityCurves: "Z" })).toThrow(/does not know/);
    expect(() => agingFromRecord({ aging: "ability", techniqueKnee: "yes" })).toThrow(/true or false/);
    expect(() => agingFromRecord({ aging: "ability", smartsSnaps: -1 })).toThrow(/0 or more/);
  });

  it("hands on the options a set of switches carries, and nothing at the defaults (so a default run passes what it did)", () => {
    expect(agingOf(undefined)).toEqual({});
    expect(Object.keys(agingOf({ development: true, injuries: true }))).toEqual([]);
    expect(agingOf({ development: true, aging: "ability", abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 }))
      .toEqual({ aging: "ability", abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 });
  });
});

describe("player-checks with the aging flags", () => {
  it("plays them in the arms with development on only, so the others are a default run's seasons", () => {
    expect(agingActsOn("development")).toBe(true);
    expect(agingActsOn("both")).toBe(true);
    expect(agingActsOn("off")).toBe(false);
    expect(agingActsOn("injuries")).toBe(false);
    const ability = { aging: "ability", abilityCurves: "B", smartsSnaps: 0.225 } as const;
    expect(armSwitches("development", ability)).toStrictEqual({ development: true, injuries: false, ...ability });
    expect(armSwitches("both", ability)).toStrictEqual({ development: true, injuries: true, ...ability });
    expect(armSwitches("injuries", ability)).toBe(ARMS.injuries);
    expect(armSwitches("off", ability)).toBeUndefined();
    // At the defaults every arm is its own switches, the same objects as before.
    for (const arm of ["off", "development", "injuries", "both"] as const) {
      expect(armSwitches(arm, {})).toBe(ARMS[arm]);
      expect(armSwitches(arm)).toBe(ARMS[arm]);
    }
  });

  it("refuses them when no chosen arm has development on", () => {
    const ability = { aging: "ability" } as const;
    expect(() => agingForArms(["off", "injuries"], ability)).toThrow(/act only on the arms with development on/);
    expect(agingForArms(["off", "both"], ability)).toBe(ability);
    expect(agingForArms(["off", "injuries"], {})).toEqual({});
  });
});

describe("--injury-risk (§12.1, AB5)", () => {
  const typed = (...argv: string[]) => { const into: AgingFlags = {}; for (let i = 0; i < argv.length; i++) readAgingFlag(argv[i]!, () => argv[++i]!, into); return into; };

  it("reads group or spot, drops the default, and is set by --ability-rules beside --aging ability", () => {
    expect(flags("--injury-risk", "group")).toStrictEqual({});
    expect(flags("--injury-risk", "spot")).toStrictEqual({ injuryRisk: "spot" });
    expect(flags("--aging", "ability", "--injury-risk", "spot")).toStrictEqual({ aging: "ability", injuryRisk: "spot" });
    expect(flags("--aging", "ability", "--injury-risk", "group")).toStrictEqual({ aging: "ability" });
    expect(flags("--ability-rules", "--injury-risk", "spot")).toStrictEqual({ aging: "ability", injuryRisk: "spot" });
    expect(flags("--ability-rules", "--ability-curves", "B")).toStrictEqual({ aging: "ability", abilityCurves: "B", injuryRisk: "spot" });
    expect(() => flags("--injury-risk", "Spot")).toThrow(/group or spot/);
    expect(() => flags("--injury-risk", "")).toThrow(/group or spot/);
    expect(() => flags("--injury-risk")).toThrow(/requires a value/);
    expect(() => flags("--ability-rules", "--injury-risk", "group")).toThrow(/drop --injury-risk group/);
    // The spot path is not the ability path: the tuning flags still need --aging ability.
    expect(() => flags("--injury-risk", "spot", "--technique-knee")).toThrow(/act only on the ability path/);
  });

  it("is refused by the season command without --injuries and with --load; --ability-rules needs both switches", () => {
    expect(seasonAging(typed("--injury-risk", "spot"), { load: false, development: false, injuries: true })).toStrictEqual({ injuryRisk: "spot" });
    expect(seasonAging(typed("--injury-risk", "group"), { load: false, development: false, injuries: false })).toStrictEqual({});
    expect(() => seasonAging(typed("--injury-risk", "spot"), { load: false, development: true, injuries: false })).toThrow(/--injury-risk spot acts on injuries; add --injuries/);
    expect(() => seasonAging(typed("--injury-risk", "spot"), { load: false, development: true })).toThrow(/add --injuries/);
    expect(() => seasonAging(typed("--injury-risk", "spot"), { load: true, development: false, injuries: true })).toThrow(/--load carries on/);
    expect(() => seasonAging(typed("--injury-risk", "group"), { load: true, development: false, injuries: false })).toThrow(/--load carries on/);
    expect(seasonAging(typed("--ability-rules"), { load: false, development: true, injuries: true })).toStrictEqual({ aging: "ability", injuryRisk: "spot" });
    expect(() => seasonAging(typed("--ability-rules"), { load: false, development: true, injuries: false })).toThrow(/--ability-rules sets --injury-risk spot too/);
    expect(() => seasonAging(typed("--ability-rules"), { load: false, development: false, injuries: true })).toThrow(/add --development/);
    // --aging ability alone still needs development only.
    expect(seasonAging(typed("--aging", "ability"), { load: false, development: true, injuries: false })).toStrictEqual({ aging: "ability" });
  });

  it("joins a new league's switches, and a save's own carries on", () => {
    expect(seasonPlayers({ loaded: false, development: false, injuries: true, aging: { injuryRisk: "spot" } }))
      .toStrictEqual({ development: false, injuries: true, injuryRisk: "spot" });
    expect(seasonPlayers({ loaded: false, development: true, injuries: true, aging: { aging: "ability", injuryRisk: "spot" } }))
      .toStrictEqual({ development: true, injuries: true, aging: "ability", injuryRisk: "spot" });
    expect(seasonPlayers({ loaded: true, saved: { development: false, injuries: true, injuryRisk: "spot" }, development: false, injuries: false, aging: {} }))
      .toStrictEqual({ development: false, injuries: true, injuryRisk: "spot" });
    expect(seasonPlayers({ loaded: true, saved: { development: true, injuries: true, aging: "ability", injuryRisk: "spot" }, development: false, injuries: false, aging: {} }))
      .toStrictEqual({ development: true, injuries: true, aging: "ability", injuryRisk: "spot" });
    expect(() => seasonPlayers({ loaded: true, saved: { development: false, injuries: true, injuryRisk: "spots" }, development: false, injuries: false, aging: {} }))
      .toThrow(/injuryRisk is "spots", which this version does not know/);
  });

  it("names the spot path (spot, ability-spot, ability-B-spot), and nothing at the default", () => {
    expect(agingLabel({ injuryRisk: "group" })).toBeUndefined();
    expect(agingLabel({ aging: "position", injuryRisk: "group" })).toBeUndefined();
    expect(agingLabel({ injuryRisk: "spot" })).toBe("spot");
    expect(agingLabel({ aging: "position", injuryRisk: "spot" })).toBe("spot");
    expect(agingLabel({ aging: "ability", injuryRisk: "spot" })).toBe("ability-spot");
    expect(agingLabel({ aging: "ability", abilityCurves: "B", injuryRisk: "spot" })).toBe("ability-B-spot");
    expect(agingLabel({ aging: "ability", techniqueKnee: true, smartsSnaps: 0.225, injuryRisk: "spot" })).toBe("ability-knee-smarts0.225-spot");
    expect(sameAging({ injuryRisk: "spot" }, {})).toBe(false);
    expect(sameAging({ injuryRisk: "group" }, {})).toBe(true);
    expect(sameAging({ aging: "ability", injuryRisk: "spot" }, { aging: "ability" })).toBe(false);
    expect(sameAging({ aging: "ability", injuryRisk: "spot" }, { aging: "ability", abilityCurves: "D", injuryRisk: "spot" })).toBe(true);
  });

  it("is read back from a record, dropped at the default, refused when unknown, and handed on by agingOf", () => {
    expect(agingFromRecord({ development: false, injuries: true, injuryRisk: "spot" })).toStrictEqual({ injuryRisk: "spot" });
    expect(agingFromRecord({ development: false, injuries: true, injuryRisk: "group" })).toStrictEqual({});
    expect(agingFromRecord({ development: true, injuries: true, aging: "ability", abilityCurves: "B", injuryRisk: "spot" }))
      .toStrictEqual({ aging: "ability", abilityCurves: "B", injuryRisk: "spot" });
    expect(() => agingFromRecord({ injuryRisk: "position" })).toThrow(/does not know/);
    expect(() => agingFromRecord({ injuryRisk: 1 })).toThrow(/does not know/);
    expect(agingOf({ development: false, injuries: true, injuryRisk: "spot" })).toStrictEqual({ injuryRisk: "spot" });
    expect(agingOf({ development: true, injuries: true, aging: "ability", injuryRisk: "spot" })).toStrictEqual({ aging: "ability", injuryRisk: "spot" });
  });

  it("acts only where its switch is on (actingRules), and is refused where it would not (assertRulesAct)", () => {
    const rules = { aging: "ability", abilityCurves: "B", injuryRisk: "spot" } as const;
    expect(actingRules(rules, { development: true, injuries: true })).toStrictEqual(rules);
    expect(actingRules(rules, { development: true, injuries: false })).toStrictEqual({ aging: "ability", abilityCurves: "B" });
    expect(actingRules(rules, { development: false, injuries: true })).toStrictEqual({ injuryRisk: "spot" });
    expect(actingRules(rules, { development: false, injuries: false })).toStrictEqual({});
    expect(actingRules({}, { development: true, injuries: true })).toStrictEqual({});
    expect(() => assertRulesAct(rules, { development: true, injuries: true }, "this run")).not.toThrow();
    expect(() => assertRulesAct(rules, { development: true, injuries: false }, "the development arm")).toThrow(/--injury-risk spot acts on injuries, which the development arm has off/);
    expect(() => assertRulesAct(rules, { development: false, injuries: true }, "this run")).toThrow(/--aging ability acts on the players' growth and aging, which this run has off/);
    expect(() => assertRulesAct({ injuryRisk: "spot" }, { development: true, injuries: false }, "x")).toThrow(/add --injuries/);
    expect(() => assertRulesAct({}, { development: false, injuries: false }, "x")).not.toThrow();
  });

  it("plays in player-checks' arms with injuries on, cached under the name of what acts on each arm", () => {
    expect(injuryRiskActsOn("injuries")).toBe(true);
    expect(injuryRiskActsOn("both")).toBe(true);
    expect(injuryRiskActsOn("development")).toBe(false);
    expect(injuryRiskActsOn("off")).toBe(false);
    const spot = { injuryRisk: "spot" } as const;
    expect(armSwitches("injuries", spot)).toStrictEqual({ development: false, injuries: true, injuryRisk: "spot" });
    expect(armSwitches("both", spot)).toStrictEqual({ development: true, injuries: true, injuryRisk: "spot" });
    expect(armSwitches("development", spot)).toBe(ARMS.development);
    expect(armSwitches("off", spot)).toBeUndefined();
    const all = { aging: "ability", injuryRisk: "spot" } as const;
    expect(armSwitches("both", all)).toStrictEqual({ development: true, injuries: true, aging: "ability", injuryRisk: "spot" });
    expect(armSwitches("development", all)).toStrictEqual({ development: true, injuries: false, aging: "ability" });
    expect(armSwitches("injuries", all)).toStrictEqual({ development: false, injuries: true, injuryRisk: "spot" });
    expect(armSwitches("off", all)).toBeUndefined();
    expect(agingLabel(armRules("both", all))).toBe("ability-spot");
    expect(agingLabel(armRules("development", all))).toBe("ability");
    expect(agingLabel(armRules("injuries", all))).toBe("spot");
    expect(agingLabel(armRules("off", all))).toBeUndefined();
    for (const arm of ["off", "development", "injuries", "both"] as const) expect(agingLabel(armRules(arm, {}))).toBeUndefined();
    // Refused when no chosen arm has injuries on; the aging part as before.
    expect(() => agingForArms(["off", "development"], spot)).toThrow(/--injury-risk spot acts only on the arms with injuries on/);
    expect(() => agingForArms(["development"], all)).toThrow(/--injury-risk spot acts only on the arms with injuries on/);
    expect(() => agingForArms(["injuries"], all)).toThrow(/act only on the arms with development on/);
    expect(agingForArms(["injuries"], spot)).toBe(spot);
    expect(agingForArms(["off", "both"], all)).toBe(all);
  });
});

describe("the spot path's two tuning flags (§12.3.3, §12.3.6; AB6, AB9-T5 and -T6)", () => {
  const typed = (...argv: string[]) => { const into: AgingFlags = {}; for (let i = 0; i < argv.length; i++) readAgingFlag(argv[i]!, () => argv[++i]!, into); return into; };
  const SPOT = { aging: "ability", injuryRisk: "spot" } as const;
  const KNOBS = { ...SPOT, healingByAge: false, perContact: 0.002 } as const;

  it("reads --no-healing-by-age and --per-contact <n> on the spot path, and drops the defaults", () => {
    expect(flags("--ability-rules", "--no-healing-by-age")).toStrictEqual({ ...SPOT, healingByAge: false });
    expect(flags("--injury-risk", "spot", "--no-healing-by-age")).toStrictEqual({ injuryRisk: "spot", healingByAge: false });
    expect(flags("--ability-rules", "--per-contact", "0.002")).toStrictEqual({ ...SPOT, perContact: 0.002 });
    expect(flags("--aging", "ability", "--injury-risk", "spot", "--per-contact", "1e-3")).toStrictEqual({ ...SPOT, perContact: 0.001 });
    expect(flags("--ability-rules", "--per-contact", "0.002", "--no-healing-by-age")).toStrictEqual(KNOBS);
    // --per-contact 0 is the default: dropped, one name for one set of rules.
    expect(flags("--ability-rules", "--per-contact", "0")).toStrictEqual(SPOT);
    expect(flags("--ability-rules", "--ability-curves", "B", "--per-contact", "0.01")).toStrictEqual({ ...SPOT, abilityCurves: "B", perContact: 0.01 });
  });

  it("refuses a value --per-contact does not take, and either flag off the spot path (--per-contact off the ability path too)", () => {
    // A plain decimal only (the AB6 review): no hex, binary or octal form, no sign, no padding.
    for (const bad of ["-1", "", " ", "x", "NaN", "Infinity", "0x10", "0b1", "0o7", "+0.002", " 0.002", "0.002 ", "1e", ".", "1_000", "-0"]) {
      expect(() => flags("--ability-rules", "--per-contact", bad), bad).toThrow(/--per-contact is years of wear per contest, a plain decimal 0 or more/);
    }
    for (const [good, v] of [["2e-3", 0.002], [".5", 0.5], ["5.", 5], ["0.0020", 0.002], ["1E-3", 0.001]] as const) {
      expect(flags("--ability-rules", "--per-contact", good), good).toStrictEqual({ ...SPOT, perContact: v });
    }
    expect(() => flags("--ability-rules", "--per-contact")).toThrow(/requires a value/);
    expect(() => flags("--no-healing-by-age")).toThrow(/--no-healing-by-age act only on the spot path; add --injury-risk spot/);
    expect(() => flags("--aging", "ability", "--per-contact", "0.002")).toThrow(/--per-contact act only on the spot path/);
    expect(() => flags("--aging", "ability", "--injury-risk", "group", "--no-healing-by-age", "--per-contact", "0")).toThrow(/--no-healing-by-age, --per-contact act only on the spot path/);
    expect(() => flags("--injury-risk", "spot", "--per-contact", "0.002")).toThrow(/--per-contact wears the ability path's curves.*add --aging ability/);
  });

  it("is refused by the season command without --injuries and with --load, and a save's own carries on", () => {
    expect(seasonAging(typed("--ability-rules", "--no-healing-by-age", "--per-contact", "0.002"), { load: false, development: true, injuries: true })).toStrictEqual(KNOBS);
    expect(() => seasonAging(typed("--ability-rules", "--per-contact", "0.002"), { load: false, development: true, injuries: false })).toThrow(/add --injuries/);
    expect(() => seasonAging(typed("--ability-rules", "--no-healing-by-age"), { load: false, development: true })).toThrow(/add --injuries/);
    expect(() => seasonAging(typed("--injury-risk", "spot", "--no-healing-by-age"), { load: false, development: false, injuries: false })).toThrow(/--injury-risk spot acts on injuries; add --injuries/);
    expect(() => seasonAging(typed("--no-healing-by-age"), { load: false, development: true, injuries: false })).toThrow(/act only on the spot path/);
    expect(() => seasonAging(typed("--ability-rules", "--per-contact", "0.002"), { load: true, development: false, injuries: false })).toThrow(/--load carries on/);
    expect(() => seasonAging(typed("--no-healing-by-age"), { load: true, development: false, injuries: false })).toThrow(/act only on the spot path/);
    // A new league's switches, and a save's own carried on, knobs and all.
    expect(seasonPlayers({ loaded: false, development: true, injuries: true, aging: KNOBS })).toStrictEqual({ development: true, injuries: true, ...KNOBS });
    const saved = { development: true, injuries: true, ...KNOBS };
    expect(seasonPlayers({ loaded: true, saved, development: false, injuries: false, aging: {} })).toStrictEqual(saved);
    expect(seasonPlayers({ loaded: true, saved: { development: false, injuries: true, injuryRisk: "spot", healingByAge: false }, development: false, injuries: false, aging: {} }))
      .toStrictEqual({ development: false, injuries: true, injuryRisk: "spot", healingByAge: false });
  });

  it("names them on the spot path (healflat, wear<n>) for cache keys and file names, and nothing at their defaults", () => {
    expect(agingLabel({ injuryRisk: "spot", healingByAge: false })).toBe("spot-healflat");
    expect(agingLabel({ ...SPOT, perContact: 0.002 })).toBe("ability-spot-wear0.002");
    expect(agingLabel(KNOBS)).toBe("ability-spot-healflat-wear0.002");
    expect(agingLabel({ ...KNOBS, abilityCurves: "B", techniqueKnee: true })).toBe("ability-B-knee-spot-healflat-wear0.002");
    expect(agingLabel({ ...SPOT, healingByAge: true, perContact: 0 })).toBe("ability-spot");
    expect(agingLabel({ injuryRisk: "spot", healingByAge: true })).toBe("spot");
    expect(sameAging({ ...SPOT, perContact: 0.002 }, SPOT)).toBe(false);
    expect(sameAging({ ...SPOT, perContact: 0.002 }, { ...SPOT, perContact: 0.003 })).toBe(false);
    expect(sameAging({ ...SPOT, healingByAge: false }, SPOT)).toBe(false);
    expect(sameAging({ ...SPOT, healingByAge: true, perContact: 0 }, SPOT)).toBe(true);
  });

  it("is read back from a record, dropped at the defaults, refused when it is not a value it takes, and handed on by agingOf", () => {
    expect(agingFromRecord({ development: true, injuries: true, ...KNOBS })).toStrictEqual(KNOBS);
    expect(agingFromRecord({ development: true, injuries: true, ...SPOT, healingByAge: true, perContact: 0 })).toStrictEqual(SPOT);
    expect(agingFromRecord({ development: false, injuries: true, injuryRisk: "spot", healingByAge: false })).toStrictEqual({ injuryRisk: "spot", healingByAge: false });
    expect(() => agingFromRecord({ ...SPOT, healingByAge: "no" })).toThrow(/healingByAge is "no", not true or false/);
    expect(() => agingFromRecord({ ...SPOT, perContact: -0.1 })).toThrow(/perContact is -0.1, not a number of years 0 or more/);
    expect(() => agingFromRecord({ ...SPOT, perContact: "0.1" })).toThrow(/not a number of years/);
    expect(agingOf({ development: true, injuries: true, ...KNOBS })).toStrictEqual(KNOBS);
    expect(Object.keys(agingOf({ development: true, injuries: true, ...SPOT }))).toStrictEqual(["aging", "injuryRisk"]);
  });

  it("acts where its switches are on (actingRules: healing with injuries, wear with both), and is refused where it would not (assertRulesAct)", () => {
    expect(actingRules(KNOBS, { development: true, injuries: true })).toStrictEqual(KNOBS);
    expect(actingRules(KNOBS, { development: true, injuries: false })).toStrictEqual({ aging: "ability" });
    expect(actingRules(KNOBS, { development: false, injuries: true })).toStrictEqual({ injuryRisk: "spot", healingByAge: false });
    expect(actingRules(KNOBS, { development: false, injuries: false })).toStrictEqual({});
    expect(() => assertRulesAct(KNOBS, { development: true, injuries: true }, "this run")).not.toThrow();
    expect(() => assertRulesAct({ healingByAge: false }, { development: true, injuries: false }, "the development arm")).toThrow(/--no-healing-by-age acts on injuries, which the development arm has off/);
    expect(() => assertRulesAct({ perContact: 0.002 }, { development: false, injuries: true }, "this run")).toThrow(/--per-contact acts with growth and injuries both on, which this run does not have/);
    expect(() => assertRulesAct({ perContact: 0.002 }, { development: true, injuries: false }, "this run")).toThrow(/--per-contact acts with growth and injuries both on/);
  });

  it("plays in player-checks' arms where they act, cached under the name of what acts on each arm", () => {
    expect(armSwitches("both", KNOBS)).toStrictEqual({ development: true, injuries: true, ...KNOBS });
    expect(armSwitches("injuries", KNOBS)).toStrictEqual({ development: false, injuries: true, injuryRisk: "spot", healingByAge: false });
    expect(armSwitches("development", KNOBS)).toStrictEqual({ development: true, injuries: false, aging: "ability" });
    expect(armSwitches("off", KNOBS)).toBeUndefined();
    expect(agingLabel(armRules("both", KNOBS))).toBe("ability-spot-healflat-wear0.002");
    expect(agingLabel(armRules("injuries", KNOBS))).toBe("spot-healflat");
    expect(agingLabel(armRules("development", KNOBS))).toBe("ability");
    // Refused when no chosen arm plays them.
    expect(() => agingForArms(["development", "injuries"], KNOBS)).toThrow(/--per-contact acts only on the arm with growth and injuries both on \(both\)/);
    expect(() => agingForArms(["off", "development"], { ...SPOT, healingByAge: false })).toThrow(/--injury-risk spot acts only on the arms with injuries on/);
    expect(agingForArms(["injuries"], { injuryRisk: "spot", healingByAge: false })).toStrictEqual({ injuryRisk: "spot", healingByAge: false });
    expect(agingForArms(["off", "both"], KNOBS)).toBe(KNOBS);
  });
});

describe("the calibration copy of the contact roll sets (§12.3.6, AB1 and AB6)", () => {
  it("is franchise's own table: the digest franchise's wear test pins is calibration's", () => {
    // Franchise's wear.ts copies the reader's table (calibration may not import it, nor franchise this
    // one); franchise's test pins sha256(JSON.stringify(CONTACT_ROLL_SETS)) to a literal, and this reads that literal.
    const pinned = readFileSync(join(__dirname, "..", "..", "franchise", "test", "players.wear.test.ts"), "utf8");
    const m = /JSON\.stringify\(CONTACT_ROLL_SETS\)\)\.digest\("hex"\)\)\s*\.toBe\("([0-9a-f]{64})"\)/.exec(pinned);
    expect(m, "franchise's pin of CONTACT_ROLL_SETS").not.toBeNull();
    expect(m![1]).toBe(CONTACT_ROLL_SETS_DIGEST);
    expect(createHash("sha256").update(JSON.stringify(CONTACT_ROLL_SETS)).digest("hex")).toBe(CONTACT_ROLL_SETS_DIGEST);
    // And franchise's counter is the reader's count: the same function body, roll sets and all.
    const wear = readFileSync(join(__dirname, "..", "..", "franchise", "src", "players", "wear.ts"), "utf8");
    const body = (text: string) => /export function contactOf\([^)]*\): number \{([\s\S]*?)\n\}/.exec(text)?.[1]?.replace("contests ?? []", "contests");
    const own = readFileSync(join(__dirname, "..", "src", "season", "careerAging.ts"), "utf8");
    expect(body(wear)).toBeDefined();
    expect(body(wear)).toBe(body(own));
  });
});

describe("the walk's draft classes with aging \"ability\" (runCapCheck's makeClass)", () => {
  it("asks the generator for every prospect's fade shifts with development on and aging ability, and for none at the default", () => {
    const used = new Set<string>();
    const ability = draftClassOptions({ seed: "aging-class", players: { development: true, injuries: true, aging: "ability", techniqueKnee: true } }, 2027, used);
    expect(ability).toStrictEqual({ seed: "aging-class", draft: 2027, usedNames: used, development: true, aging: "ability" });
    expect(draftClassOptions({ seed: "aging-class", players: { development: true, injuries: true } }, 2027, used))
      .toStrictEqual({ seed: "aging-class", draft: 2027, usedNames: used, development: true });
    expect(draftClassOptions({ seed: "aging-class", players: { development: false, injuries: true, aging: "ability" } }, 2027, used))
      .toStrictEqual({ seed: "aging-class", draft: 2027, usedNames: used });
    expect(draftClassOptions({ seed: "aging-class" }, 2027, used)).toStrictEqual({ seed: "aging-class", draft: 2027, usedNames: used });
    // And the class those options make: every prospect with all 12 shifts, and none at the default.
    const made = generateDraftClass(ability);
    expect(made.players.length).toBeGreaterThan(200);
    expect(made.players.filter((p) => !allShifts(p)).length).toBe(0);
    const plain = generateDraftClass(draftClassOptions({ seed: "aging-class", players: { development: true, injuries: true } }, 2027, used));
    expect(plain.players.filter(anyShift).length).toBe(0);
  });
});

describe("the calibration copy of the ability groups (§12.2.7, test 11)", () => {
  it("is franchise's own table: the digest franchise's test pins is the copy's", () => {
    // Calibration may not import franchise's table (ADR-078 R1), so the two are held to one digest:
    // franchise's test pins sha256(JSON.stringify(ABILITY_GROUP_MEMBERS)) to a literal, and this reads that literal.
    const pinned = readFileSync(join(__dirname, "..", "..", "franchise", "test", "players.aging.test.ts"), "utf8");
    const m = /JSON\.stringify\(ABILITY_GROUP_MEMBERS\)\)\.digest\("hex"\)\)\s*\.toBe\("([0-9a-f]{64})"\)/.exec(pinned);
    expect(m, "franchise's pin of ABILITY_GROUP_MEMBERS").not.toBeNull();
    expect(m![1]).toBe(ABILITY_GROUP_DIGEST);
    expect(createHash("sha256").update(JSON.stringify(ABILITY_GROUP_COPY)).digest("hex")).toBe(ABILITY_GROUP_DIGEST);
  });
});

// --- the trap (AB2's note): the options must reach the steps with the shifts ----------------------

function allShifts(p: PlayerState): boolean {
  const s = p.attributes.development?.fadeShift;
  return s !== undefined && ABILITY_GROUPS.every((g) => typeof s[g] === "number" && Number.isFinite(s[g]));
}
function anyShift(p: PlayerState): boolean { return p.attributes.development?.fadeShift !== undefined; }
/** The first week of camp: the players' steps have run once (their memory is written at the week's end). */
const campWeek1 = (season: number): CalendarStamp => ({ season, phase: "TRAINING_CAMP", week: 1, day: 7 });
/** The file at `standin-development/1`: the same records with no fade shifts. */
const asVersion1 = () => readStandInFile(JSON.stringify({
  ...JSON.parse(text) as object,
  startingDevelopment: { ...file.startingDevelopment!, version: "standin-development/1" },
  league: {
    ...file.league,
    players: file.league.players.map((p) => {
      const d = p.attributes.development;
      if (d === undefined) return p;
      const { fadeShift: _f, ...development } = d;
      return { ...p, attributes: { ...p.attributes, development } };
    }),
  },
}, (_k, v) => (v instanceof Set ? [...v] : v)));

describe("a stand-in run with aging \"ability\" (the AB2 trap)", () => {
  it("reaches the players' steps with all 12 shifts on every man, and the steps run the ability path", () => {
    const players = { development: true, injuries: true, aging: "ability" } as const;
    const { run } = runRealSeason({ seed: "aging-trap", rosters: "standin", standIn: file, players, stopAfter: campWeek1(file.season) });
    const people = run.people!;
    expect(people.playerMemory!.switches).toStrictEqual(players);
    const signed = people.players.filter((p) => p.teamId !== undefined);
    expect(signed.length).toBeGreaterThan(1500);
    expect(signed.filter((p) => !allShifts(p)).map((p) => String(p.bio.id))).toEqual([]);
    // The reserve pool is drawn with its shifts too.
    expect(people.players.filter((p) => !allShifts(p)).length).toBe(0);
    // At the default aging the shifts never reach the run, and the week is another.
    const byPosition = runRealSeason({ seed: "aging-trap", rosters: "standin", standIn: file, players: { development: true, injuries: true }, stopAfter: campWeek1(file.season) }).run;
    expect(byPosition.people!.players.filter(anyShift).length).toBe(0);
    expect(byPosition.people!.playerMemory!.switches).toStrictEqual({ development: true, injuries: true });
    expect(JSON.stringify(byPosition.events)).not.toBe(JSON.stringify(run.events));
  }, 300_000);

  it("is refused on a /1 file, which has no shifts, and plays it at the default aging", () => {
    const one = asVersion1();
    expect(() => runRealSeason({ seed: "aging-trap", rosters: "standin", standIn: one, players: { development: true, aging: "ability" }, stopAfter: campWeek1(one.season) }))
      .toThrow(/no fade shifts for every ability group/);
    expect(() => runCapCheck({ seed: "aging-trap", file: one as CapCheckInput["file"], seasons: 1, players: { development: true, injuries: true, aging: "ability" } }))
      .toThrow(/no fade shifts for every ability group/);
    expect(() => runRealSeason({ seed: "aging-trap", rosters: "standin", standIn: one, players: { development: true }, stopAfter: campWeek1(one.season) })).not.toThrow();
  }, 300_000);

  it("reaches the steps with the shifts in the cap check's walk too (the career check's), recorded in the memory", () => {
    const seen: SeasonPeople[] = [];
    const stop = new Error("seen");
    const watch = (players: NonNullable<CapCheckInput["players"]>) => {
      seen.length = 0;
      try {
        runCapCheck({
          seed: "aging-trap", file: file as CapCheckInput["file"], seasons: 1, players,
          onDay: (_s, _day, people) => { if (people.playerMemory?.switches !== undefined) { seen.push(people); throw stop; } },
        });
      } catch (e) {
        if (e !== stop) throw e;
      }
      return seen[0]!;
    };
    const ability = watch({ development: true, injuries: true, aging: "ability", techniqueKnee: true });
    expect(ability.playerMemory!.switches).toStrictEqual({ development: true, injuries: true, aging: "ability", techniqueKnee: true });
    expect(ability.players.filter((p) => p.teamId !== undefined && !allShifts(p)).length).toBe(0);
    const byPosition = watch({ development: true, injuries: true });
    expect(byPosition.playerMemory!.switches).toStrictEqual({ development: true, injuries: true });
    expect(byPosition.players.filter(anyShift).length).toBe(0);
  }, 300_000);
});

describe("a generated league with aging \"ability\"", () => {
  it("draws every man's shifts (the reserve pool's too) and records the options; at the default, none", () => {
    const players = { development: true, injuries: false, aging: "ability", abilityCurves: "B" } as const;
    const { run } = runRealSeason({ seed: "aging-made-up", season: 2027, players, stopAfter: campWeek1(2027) });
    expect(run.people!.playerMemory!.switches).toStrictEqual(players);
    expect(run.people!.players.filter((p) => !allShifts(p)).length).toBe(0);
    const byPosition = runRealSeason({ seed: "aging-made-up", season: 2027, players: { development: true, injuries: false }, stopAfter: campWeek1(2027) }).run;
    expect(byPosition.people!.players.filter(anyShift).length).toBe(0);
  }, 300_000);
});

describe("a run with injury-risk \"spot\" (AB5): the option reaches the steps and is recorded where it acts", () => {
  it("is recorded in a generated league's memory with injuries on, and not with injuries off (where it does not act)", () => {
    const spot = { development: false, injuries: true, injuryRisk: "spot" } as const;
    const { run } = runRealSeason({ seed: "spot-made-up", season: 2027, players: spot, stopAfter: campWeek1(2027) });
    expect(run.people!.playerMemory!.switches).toStrictEqual(spot);
    const off = runRealSeason({ seed: "spot-made-up", season: 2027, players: { development: true, injuries: false, injuryRisk: "spot" }, stopAfter: campWeek1(2027) }).run;
    expect(off.people!.playerMemory!.switches).toStrictEqual({ development: true, injuries: false });
  }, 300_000);

  it("plays the games with it: the same seed gives the same weeks, and other injuries than the group path's", () => {
    const week2 = { season: 2027, phase: "REGULAR_SEASON", week: 2, day: 7 } as const;
    const play = (injuryRisk?: "spot" | "group") =>
      runRealSeason({ seed: "spot-games", season: 2027, players: { development: false, injuries: true, ...(injuryRisk ? { injuryRisk } : {}) }, stopAfter: week2 }).run;
    const spot = play("spot");
    const hurt = (r: typeof spot) => JSON.stringify(r.events.filter((e) => e.event.type === "INJURY_OCCURRED"));
    expect(spot.events.some((e) => e.event.type === "INJURY_OCCURRED" && e.event.payload.setting === "GAME")).toBe(true);
    expect(JSON.stringify(play("spot").events)).toBe(JSON.stringify(spot.events));
    const group = play();
    expect(hurt(group)).not.toBe(hurt(spot));
    // "group" typed is the default, byte for byte.
    expect(JSON.stringify(play("group").events)).toBe(JSON.stringify(group.events));
  }, 600_000);

  it("is recorded beside aging \"ability\" in the cap check's walk (the career check's)", () => {
    const stop = new Error("seen");
    let seen: SeasonPeople | undefined;
    const players = { development: true, injuries: true, aging: "ability", injuryRisk: "spot" } as const;
    try {
      runCapCheck({
        seed: "spot-trap", file: file as CapCheckInput["file"], seasons: 1, players,
        onDay: (_s, _day, people) => { if (people.playerMemory?.switches !== undefined) { seen = people; throw stop; } },
      });
    } catch (e) {
      if (e !== stop) throw e;
    }
    expect(seen!.playerMemory!.switches).toStrictEqual(players);
    expect(seen!.players.filter((p) => p.teamId !== undefined && !allShifts(p)).length).toBe(0);
  }, 300_000);
});

describe("a run with the spot path's tuning options (AB6): they reach the steps, and the count is the engine's who-played reports'", () => {
  it("records them in a generated league's memory, and keeps each man's contact as the reader counts the games' reports", () => {
    const players = { development: true, injuries: true, aging: "ability", injuryRisk: "spot", healingByAge: false, perContact: 0.002 } as const;
    const week1 = { season: 2027, phase: "REGULAR_SEASON", week: 1, day: 7 } as const;
    const count = new Map<string, number>();
    const { run } = runRealSeason({
      seed: "wear-made-up", season: 2027, players, stopAfter: week1,
      onGame: (observation, _game, snapshot) => {
        for (const r of participationFrom(observation.events, snapshot)) {
          const n = contactOf(r.contests);
          if (n > 0) count.set(String(r.player), (count.get(String(r.player)) ?? 0) + n);
        }
      },
    });
    const memory = run.people!.playerMemory!;
    expect(memory.switches).toStrictEqual(players);
    expect(count.size).toBeGreaterThan(300);
    expect(memory.contact).toStrictEqual(Object.fromEntries(count));
    // At the defaults the memory keeps no count.
    const plain = runRealSeason({ seed: "wear-made-up", season: 2027, players: { development: true, injuries: true }, stopAfter: { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 7 } }).run;
    expect(plain.people!.playerMemory!.switches).toStrictEqual({ development: true, injuries: true });
    expect("contact" in plain.people!.playerMemory!).toBe(false);
  }, 600_000);
});
