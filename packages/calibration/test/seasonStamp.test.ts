/**
 * ADR-089 — THE SEASON COMMAND'S RULES STAMP (`src/season/stamp.ts`; step 0's plan §4, O11; step 1's
 * plan §3, §7.2 item 3, §16.4: K18 settled by option (a)).
 *
 *  1. On load: a save with no `engineRules` (or exactly `legacy`) carries on under `legacy` (P1,
 *     default D10), through the real `makeSave` and `readSave`; a save of `pocket-1.s1` written as
 *     `<name>@<digest>` carries on under `pocket-1.s1`; every other value is refused with its own
 *     message; a new league plays what `--engine-rules` names, or the default.
 *  2. The `--load` conflict: a `--engine-rules` that differs from the save's is refused, not
 *     converted (ADR-089:1321), with its own message; the same name is accepted.
 *  3. On save: the caller always, the rules only when not `legacy`, as `<name>@<digest>`, so a legacy
 *     save is byte for byte the save E1 wrote.
 *  4. `--out` carries the caller and the rules always, the overlay digest only when not `legacy`.
 *  5. Step 3's bundle (ADR-089 step 3, plan §2.1): a `pocket-1.s3` save is written as
 *     `pocket-1.s3@<digest>`, reads back through the real `makeSave` and `readSave`, carries on under
 *     `pocket-1.s3` at this build's digest only, and is never carried on under another name.
 */
import { describe, expect, it } from "vitest";
import { buildLeague, makeSave, readSave } from "@ff/franchise";
import type { CalendarStamp } from "@ff/contracts";
import { EngineRulesError, POCKET_1_S1_DIGEST, POCKET_1_S2_DIGEST, POCKET_1_S3_DIGEST } from "../src/pocket/rules.js";
import { savePlayedWith, seasonOutStamp, seasonRules } from "../src/season/stamp.js";

const league = buildLeague("adr-089:season-stamp");
const camp: CalendarStamp = { season: 2027, phase: "TRAINING_CAMP", week: 1, day: 1 };
const saveWith = (playedWith?: { caller: string; engineRules?: string }) =>
  makeSave({ league, calendar: camp, season: null, createdBy: "test", ...(playedWith ? { playedWith } : {}) });
const onDisk = (s: unknown) => JSON.stringify(s, null, 2);
const loaded = (engineRules?: string) =>
  readSave(onDisk(saveWith({ caller: "v7", ...(engineRules === undefined ? {} : { engineRules }) }))).save;

const POCKET_SAVE = `pocket-1.s1@${POCKET_1_S1_DIGEST}`;

describe("carrying on (--load)", () => {
  it("a save with no engineRules, before P1 or since, or exactly legacy, carries on under legacy", () => {
    expect(seasonRules(readSave(onDisk(saveWith({ caller: "v5" }))).save)).toBe("legacy");
    expect(seasonRules(readSave(onDisk(saveWith())).save)).toBe("legacy");
    expect(seasonRules(loaded("legacy"))).toBe("legacy");
  });

  it("a save of pocket-1.s1 at this build's digest carries on under pocket-1.s1", () => {
    const save = loaded(POCKET_SAVE);
    expect(save.playedWith).toEqual({ caller: "v7", engineRules: POCKET_SAVE });
    expect(seasonRules(save)).toBe("pocket-1.s1");
  });

  it("every other value is refused, not converted, each with its own message (K18)", () => {
    const cases: [string, string | RegExp][] = [
      ["pocket-1.s1", "This save was played with engine rules pocket-1.s1 and carries no overlay digest; a save of non-legacy rules is stamped <name>@<digest>"],
      ["pocket-1.s1@xyz", /^This save's engine rules "pocket-1.s1@xyz" are malformed/],
      ["@fnv1a:1a2b3c4d", /^This save's engine rules "@fnv1a:1a2b3c4d" are malformed/],
      ["legacy@fnv1a:1a2b3c4d", "This save names engine rules legacy with an overlay digest; a legacy save carries none"],
      ["pocket-1.s9@fnv1a:1a2b3c4d", "This save was played with engine rules pocket-1.s9, which this version does not have"],
      ["pocket-1.s1@fnv1a:00000000", `This save was played with engine rules pocket-1.s1 at overlay fnv1a:00000000; this build's pocket-1.s1 is ${POCKET_1_S1_DIGEST}`],
    ];
    for (const [value, message] of cases) {
      const save = loaded(value);
      expect(save.playedWith?.engineRules, "readSave keeps the string as given").toBe(value);
      expect(() => seasonRules(save), value).toThrow(EngineRulesError);
      expect(() => seasonRules(save), value).toThrow(message);
    }
  });

  it("an empty engineRules is refused as malformed by the season, if franchise ever lets one through", () => {
    // franchise's readSave refuses an empty string itself (it asks for a non-empty one), so the
    // season's own refusal is checked on the playedWith it would read.
    expect(() => seasonRules({ playedWith: { engineRules: "" } })).toThrow(/^This save's engine rules "" are malformed/);
  });

  it("a new league plays what --engine-rules names, or the default", () => {
    expect(seasonRules(undefined)).toBe("legacy");
    expect(seasonRules(undefined, "legacy")).toBe("legacy");
    expect(seasonRules(undefined, "pocket-1.s1")).toBe("pocket-1.s1");
    for (const bad of ["pocket-1", "default", POCKET_SAVE]) {
      expect(() => seasonRules(undefined, bad), bad).toThrow(/^season --engine-rules: engine rules ".*" are not in this build/);
    }
  });
});

describe("the --load conflict (ADR-089:1321, refused, not converted)", () => {
  it("a --engine-rules that differs from the save's is refused with its own message", () => {
    expect(() => seasonRules(loaded(), "pocket-1.s1")).toThrow(EngineRulesError);
    expect(() => seasonRules(loaded(), "pocket-1.s1")).toThrow(
      "This save was played with engine rules legacy; carrying it on under pocket-1.s1 is refused, not converted (ADR-089 §9). Drop --engine-rules, or name legacy",
    );
    expect(() => seasonRules(loaded(POCKET_SAVE), "legacy")).toThrow(
      "This save was played with engine rules pocket-1.s1; carrying it on under legacy is refused, not converted (ADR-089 §9). Drop --engine-rules, or name pocket-1.s1",
    );
  });

  it("the save's own rules, named, are accepted; an unknown name is refused as unknown first", () => {
    expect(seasonRules(loaded(), "legacy")).toBe("legacy");
    expect(seasonRules(loaded(POCKET_SAVE), "pocket-1.s1")).toBe("pocket-1.s1");
    expect(() => seasonRules(loaded(), "pocket-1.s9")).toThrow(/^season --engine-rules: engine rules "pocket-1.s9" are not in this build/);
  });
});

describe("--save", () => {
  it("a legacy save names only its caller, so it is byte for byte the save E1 wrote", () => {
    expect(savePlayedWith("v7", "legacy")).toEqual({ caller: "v7" });
    expect(JSON.stringify(savePlayedWith("v7", "legacy"))).toBe(JSON.stringify({ caller: "v7" }));
    expect(onDisk(saveWith(savePlayedWith("v7", "legacy")))).toBe(onDisk(saveWith({ caller: "v7" })));
  });

  it("pocket-1.s1 is written as <name>@<digest>, reads back, and carries on under itself", () => {
    expect(savePlayedWith("v7", "pocket-1.s1")).toEqual({ caller: "v7", engineRules: POCKET_SAVE });
    const back = readSave(onDisk(saveWith(savePlayedWith("v7", "pocket-1.s1")))).save;
    expect(back.playedWith).toEqual({ caller: "v7", engineRules: POCKET_SAVE });
    expect(seasonRules(back)).toBe("pocket-1.s1");
    expect(POCKET_SAVE).toMatch(/^[a-z0-9.-]+@fnv1a:[0-9a-f]{8}$/);
  });
});

describe("--out", () => {
  it("carries the caller and the rules, always", () => {
    expect(seasonOutStamp("v7", "legacy")).toEqual({ callerVersion: "v7", engineRules: "legacy" });
    expect(seasonOutStamp("v4", "legacy", undefined)).toEqual({ callerVersion: "v4", engineRules: "legacy" });
  });

  it("the overlay digest only when the rules are not legacy, as two fields (not the save's one string)", () => {
    expect(seasonOutStamp("v7", "legacy", "fnv1a:00000000")).toEqual({ callerVersion: "v7", engineRules: "legacy" });
    expect(seasonOutStamp("v7", "pocket-1.s1", POCKET_1_S1_DIGEST)).toEqual({ callerVersion: "v7", engineRules: "pocket-1.s1", engineRulesDigest: POCKET_1_S1_DIGEST });
  });
});

describe("pocket-1.s3 (ADR-089 step 3)", () => {
  const S3_SAVE = `pocket-1.s3@${POCKET_1_S3_DIGEST}`;

  it("--save writes pocket-1.s3@<digest>; it reads back and carries on under pocket-1.s3", () => {
    expect(savePlayedWith("v7", "pocket-1.s3")).toEqual({ caller: "v7", engineRules: S3_SAVE });
    const back = readSave(onDisk(saveWith(savePlayedWith("v7", "pocket-1.s3")))).save;
    expect(back.playedWith).toEqual({ caller: "v7", engineRules: S3_SAVE });
    expect(seasonRules(back)).toBe("pocket-1.s3");
    expect(seasonRules(back, "pocket-1.s3")).toBe("pocket-1.s3");
    expect(seasonRules(undefined, "pocket-1.s3")).toBe("pocket-1.s3");
  });

  it("loads only at this build's digest, and is never carried on under another name", () => {
    const cases: [string, string | RegExp][] = [
      [`pocket-1.s3@${POCKET_1_S2_DIGEST}`, `This save was played with engine rules pocket-1.s3 at overlay ${POCKET_1_S2_DIGEST}; this build's pocket-1.s3 is ${POCKET_1_S3_DIGEST}`],
      ["pocket-1.s3", "This save was played with engine rules pocket-1.s3 and carries no overlay digest; a save of non-legacy rules is stamped <name>@<digest>"],
    ];
    for (const [value, message] of cases) {
      expect(() => seasonRules(loaded(value)), value).toThrow(EngineRulesError);
      expect(() => seasonRules(loaded(value)), value).toThrow(message);
    }
    expect(() => seasonRules(loaded(S3_SAVE), "pocket-1.s2")).toThrow(
      "This save was played with engine rules pocket-1.s3; carrying it on under pocket-1.s2 is refused, not converted (ADR-089 §9). Drop --engine-rules, or name pocket-1.s3",
    );
    expect(() => seasonRules(loaded(`pocket-1.s2@${POCKET_1_S2_DIGEST}`), "pocket-1.s3")).toThrow(
      "This save was played with engine rules pocket-1.s2; carrying it on under pocket-1.s3 is refused, not converted (ADR-089 §9). Drop --engine-rules, or name pocket-1.s2",
    );
  });

  it("--out carries the name and its digest as two fields", () => {
    expect(seasonOutStamp("v7", "pocket-1.s3", POCKET_1_S3_DIGEST)).toEqual({ callerVersion: "v7", engineRules: "pocket-1.s3", engineRulesDigest: POCKET_1_S3_DIGEST });
  });
});
