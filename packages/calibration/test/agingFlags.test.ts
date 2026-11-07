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
import { agingFromRecord, agingLabel, readAgingFlag, sameAging, settleAging, type AgingFlags } from "../src/season/agingFlags.js";
import { runCapCheck, type CapCheckInput } from "../src/season/capCheck.js";
import { ABILITY_GROUP_COPY, ABILITY_GROUP_DIGEST } from "../src/season/careerAging.js";
import { agingActsOn } from "../src/season/playerChecksRun.js";
import { agingOf, runRealSeason } from "../src/season/realSeason.js";
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
    expect(flags("--ability-rules")).toEqual({ aging: "ability" });
    expect(flags("--aging", "ability", "--ability-rules")).toEqual({ aging: "ability" });
    expect(flags("--aging", "ability", "--ability-curves", "D")).toEqual({ aging: "ability" });
    expect(flags("--aging", "ability", "--ability-curves", "B", "--technique-knee", "--smarts-snaps", "0.225"))
      .toEqual({ aging: "ability", abilityCurves: "B", techniqueKnee: true, smartsSnaps: 0.225 });
    expect(flags("--ability-rules", "--smarts-snaps", "0")).toEqual({ aging: "ability", smartsSnaps: 0 });
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

const allShifts = (p: PlayerState) => {
  const s = p.attributes.development?.fadeShift;
  return s !== undefined && ABILITY_GROUPS.every((g) => typeof s[g] === "number" && Number.isFinite(s[g]));
};
const anyShift = (p: PlayerState) => p.attributes.development?.fadeShift !== undefined;
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
