/**
 * ADR-089 step 0 — THE SEASON COMMAND'S RULES STAMP (`src/season/stamp.ts`; plan §4, O11).
 *
 *  1. On load: a save with no `engineRules` carries on under `legacy` (P1, default D10), through the
 *     real `makeSave` and `readSave`; a name this version does not have refuses; a new league plays
 *     the default.
 *  2. On save: the caller always, the rules only when not `legacy`, so a step-0 save is byte for byte
 *     the save E1 wrote; any other name is written as given, whatever this build has.
 *  3. `--out` carries the caller and the rules always, the overlay digest only when not `legacy`.
 */
import { describe, expect, it } from "vitest";
import { buildLeague, makeSave, readSave } from "@ff/franchise";
import type { CalendarStamp } from "@ff/contracts";
import { EngineRulesError } from "../src/pocket/rules.js";
import { savePlayedWith, seasonOutStamp, seasonRules } from "../src/season/stamp.js";

const league = buildLeague("adr-089:season-stamp");
const camp: CalendarStamp = { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 1 };
const saveWith = (playedWith?: { caller: string; engineRules?: string }) =>
  makeSave({ league, calendar: camp, season: null, createdBy: "test", ...(playedWith ? { playedWith } : {}) });
const onDisk = (s: unknown) => JSON.stringify(s, null, 2);

describe("carrying on (--load)", () => {
  it("a save with no engineRules, before P1 or since, carries on under legacy", () => {
    expect(seasonRules(readSave(onDisk(saveWith({ caller: "v5" }))).save)).toBe("legacy");
    expect(seasonRules(readSave(onDisk(saveWith())).save)).toBe("legacy");
    expect(seasonRules(readSave(onDisk(saveWith({ caller: "v7", engineRules: "legacy" }))).save)).toBe("legacy");
  });

  it("a save played under rules this version does not have is refused, not converted", () => {
    const later = readSave(onDisk(saveWith({ caller: "v7", engineRules: "pocket-1.s1" }))).save;
    expect(later.playedWith).toEqual({ caller: "v7", engineRules: "pocket-1.s1" });
    expect(() => seasonRules(later)).toThrow(EngineRulesError);
    expect(() => seasonRules(later)).toThrow("This save was played with engine rules pocket-1.s1, which this version does not have");
  });

  it("a new league plays the default", () => {
    expect(seasonRules(undefined)).toBe("legacy");
  });
});

describe("--save", () => {
  it("a legacy save names only its caller, so it is byte for byte the save E1 wrote", () => {
    expect(savePlayedWith("v7", "legacy")).toEqual({ caller: "v7" });
    expect(JSON.stringify(savePlayedWith("v7", "legacy"))).toBe(JSON.stringify({ caller: "v7" }));
    expect(onDisk(saveWith(savePlayedWith("v7", "legacy")))).toBe(onDisk(saveWith({ caller: "v7" })));
  });

  it("any other name is written as given, whatever this build has, and reads back", () => {
    expect(savePlayedWith("v7", "pocket-1.s1")).toEqual({ caller: "v7", engineRules: "pocket-1.s1" });
    expect(readSave(onDisk(saveWith(savePlayedWith("v7", "pocket-1.s1")))).save.playedWith).toEqual({ caller: "v7", engineRules: "pocket-1.s1" });
  });
});

describe("--out", () => {
  it("carries the caller and the rules, always", () => {
    expect(seasonOutStamp("v7", "legacy")).toEqual({ callerVersion: "v7", engineRules: "legacy" });
    expect(seasonOutStamp("v4", "legacy", undefined)).toEqual({ callerVersion: "v4", engineRules: "legacy" });
  });

  it("the overlay digest only when the rules are not legacy", () => {
    expect(seasonOutStamp("v7", "legacy", "fnv1a:00000000")).toEqual({ callerVersion: "v7", engineRules: "legacy" });
    expect(seasonOutStamp("v7", "pocket-1.s1", "fnv1a:1234abcd")).toEqual({ callerVersion: "v7", engineRules: "pocket-1.s1", engineRulesDigest: "fnv1a:1234abcd" });
  });
});
