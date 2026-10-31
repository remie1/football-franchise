/**
 * The 20-season check one seed at a time (ADR-087 D5b, `careerCheckRun.ts`): the arms, the seed
 * sets, the fingerprint, the codec a checkpoint keeps the people in, and a seed stopped after a
 * season's checkpoint and carried on from it (on made-up seasons here; on the real walk, three
 * switched-on seasons, with FF_CAREER_RESUME=1).
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { StaffState } from "@ff/contracts";
import { buildLeague, buildStaff, type runSeason, type SeasonRun } from "@ff/franchise";
import type { CapCheckInput } from "../src/season/capCheck.js";
import {
  armInput, CAREER_SEED_SETS, careerCachePaths, careerFingerprint, CareerCheckStopped, COACH_STYLE_LINEUPS, decodeState, encodeState,
  readCareerRecords, runCareerSeed, seedOf, stateDifference, withHeadCoachLineups,
} from "../src/season/careerCheckRun.js";
import { readStandInFile } from "../src/season/standInLeague.js";

type SeasonInput = Parameters<typeof runSeason>[0];

const hook = vi.hoisted(() => ({ runSeason: undefined as undefined | ((input: never) => unknown) }));
vi.mock("@ff/franchise", async (importOriginal) => {
  const real = await importOriginal<typeof import("@ff/franchise")>();
  return {
    ...real,
    runSeason: (input: Parameters<typeof real.runSeason>[0]) =>
      hook.runSeason === undefined ? real.runSeason(input) : (hook.runSeason as (i: typeof input) => SeasonRun)(input),
  };
});

const FILE = join(__dirname, "..", "..", "attributes", "leagues", "standin-2026-10-23.json");
const file = readStandInFile(readFileSync(FILE, "utf8")) as CapCheckInput["file"];
const REPO = join(__dirname, "..", "..", "..");

/** Each season answered with no games and the people handed back unchanged. */
const madeUp = (i: SeasonInput): SeasonRun => ({
  state: { season: i.season, standings: [] } as unknown as SeasonRun["state"],
  calendar: { season: i.season, phase: "OFF_SUMMER", week: 6, day: 7 }, events: [], complete: true, people: i.people!,
});
function withMadeUpSeasons<T>(body: () => T): T {
  hook.runSeason = madeUp as never;
  try { return body(); } finally { hook.runSeason = undefined; }
}
const scratch = () => mkdtempSync(join(tmpdir(), "career-check-"));

describe("the arms and the seeds", () => {
  it("both, development, and the two coach-style arms", () => {
    expect(armInput("both")).toEqual({ players: { development: true, injuries: true } });
    expect(armInput("development")).toEqual({ players: { development: true, injuries: false } });
    expect(armInput("incumbent").players).toEqual({ development: true, injuries: true });
    expect(armInput("form").players).toEqual({ development: true, injuries: true });
    expect(armInput("both").staffTransform).toBeUndefined();
  });

  it("a coach-style arm sets every sitting head coach's leanings, and no one else's", () => {
    const staff = buildStaff(buildLeague("career-check-staff"), { firstSeason: 2026, lineups: true }).world.staff;
    const sitting = (s: StaffState) => { const j = s.career[s.career.length - 1]; return j?.role === "HEAD_COACH" && j.lastSeason === undefined && j.ended === undefined && j.team !== undefined; };
    const handedIn = JSON.stringify(staff);
    for (const arm of ["incumbent", "form"] as const) {
      const changed = armInput(arm).staffTransform!(staff);
      expect(changed).toHaveLength(staff.length);
      const heads = changed.filter(sitting);
      expect(heads.length).toBe(32);
      for (const h of heads) expect(h.lineup).toEqual(COACH_STYLE_LINEUPS[arm]);
      changed.forEach((s, i) => { if (s.role !== "HEAD_COACH" && !sitting(s)) expect(s).toBe(staff[i]); });
    }
    // The staff handed in is not changed.
    withHeadCoachLineups(staff, COACH_STYLE_LINEUPS.form);
    expect(JSON.stringify(staff)).toBe(handedIn);
  });

  it("the seed sets: four tuning seeds, twelve grade seeds, counted from 1", () => {
    expect(CAREER_SEED_SETS.tune).toEqual(["d5b-t1", "d5b-t2", "d5b-t3", "d5b-t4"]);
    expect(CAREER_SEED_SETS.grade).toHaveLength(12);
    expect(seedOf("grade", 1)).toBe("d5b-g1");
    expect(seedOf("grade", 12)).toBe("d5b-g12");
    expect(() => seedOf("tune", 5)).toThrow(RangeError);
    expect(() => seedOf("tune", 0)).toThrow(RangeError);
    expect(() => careerCachePaths("/x", "both", "../evil", 20)).toThrow(SyntaxError);
    expect(careerCachePaths("/x", "form", "d5b-t2", 20)).toEqual({ rows: "/x/form-d5b-t2-20.json", checkpoint: "/x/form-d5b-t2-20.checkpoint.json" });
  });
});

describe("the fingerprint", () => {
  const base = { repoRoot: REPO, leagueSha256: "a".repeat(64), engineRules: "legacy", callerVersion: "v7", arm: "both" as const };
  it("covers every package's source, the league file, the engine rules, the caller and the arm", () => {
    const fp = careerFingerprint(base);
    expect(fp.fingerprint).toMatch(/^[0-9a-f]{16}$/);
    expect(fp.files).toBeGreaterThan(100);
    expect(careerFingerprint(base).fingerprint).toBe(fp.fingerprint);
    for (const change of [{ leagueSha256: "b".repeat(64) }, { engineRules: "pocket-1.s2" }, { callerVersion: "v6" }, { arm: "form" as const }]) {
      expect(careerFingerprint({ ...base, ...change }).fingerprint).not.toBe(fp.fingerprint);
    }
  });

  it("changes when a source file changes", () => {
    const root = scratch();
    try {
      mkdirSync(join(root, "packages", "one", "src", "deep"), { recursive: true });
      mkdirSync(join(root, "packages", "two"), { recursive: true });
      writeFileSync(join(root, "packages", "one", "src", "a.ts"), "export const a = 1;");
      writeFileSync(join(root, "packages", "one", "src", "deep", "b.json"), "{}");
      const one = careerFingerprint({ ...base, repoRoot: root });
      expect(one.files).toBe(2);
      writeFileSync(join(root, "packages", "one", "src", "deep", "b.json"), "{ }");
      expect(careerFingerprint({ ...base, repoRoot: root }).fingerprint).not.toBe(one.fingerprint);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the codec", () => {
  it("brings back Sets, Maps, undefined properties, NaN, the infinities and -0, and an object that looks like a tag", () => {
    const value = {
      set: new Set(["a", "b"]), map: new Map<unknown, unknown>([["k", { v: 1 }], [2, new Set([3])]]), gone: undefined,
      list: [1, undefined, null, -0, NaN, Infinity, -Infinity], tagLike: { $set: [1] }, nested: { deep: [{ x: "y" }] },
    };
    const text = JSON.stringify(encodeState(value));
    const back = decodeState(JSON.parse(text));
    expect(stateDifference(back, value)).toBeNull();
    expect(Object.keys(back as object)).toContain("gone");
    expect(Object.is((back as { list: number[] }).list[3], -0)).toBe(true);
    // The differences it finds.
    expect(stateDifference({ a: 1 }, { a: 1, b: undefined })).toBe("${keys}");
    expect(stateDifference([0], [-0])).toBe("$[0]");
    expect(stateDifference(new Set([1, 2]), new Set([2, 1]))).toBe("$<set>[0]");
  });

  it("refuses what it cannot keep", () => {
    expect(() => encodeState({ when: new Date(0) })).toThrow(/\$\.when is a Date/);
    expect(() => encodeState({ f: () => 1 })).toThrow(/function/);
  });

  it("keeps the league file's people as they are (traits are Sets)", () => {
    const people = { players: file.league.players.slice(0, 200), teams: file.league.teams, contracts: (file.contracts ?? []).slice(0, 200) };
    const back = decodeState(JSON.parse(JSON.stringify(encodeState(people))));
    expect(stateDifference(back, people)).toBeNull();
    expect((back as typeof people).players[0]!.attributes.traits).toBeInstanceOf(Set);
  });
});

describe("one seed: the cache and the checkpoint (made-up seasons)", () => {
  const league = { path: "packages/attributes/leagues/standin-2026-10-23.json", sha256: "f".repeat(64) };
  it("a seed stopped after its second season's checkpoint carries on from it, and gives the unbroken seed's rows", () => {
    const dirA = scratch(), dirB = scratch();
    try {
      const opts = { file, league, seed: "resume-made-up", arm: "both" as const, seasons: 3, fingerprint: "0123456789abcdef" };
      const straight = withMadeUpSeasons(() => runCareerSeed({ ...opts, cacheDir: dirA }));
      expect(straight.from).toBe("run");
      expect(straight.record.seconds).toHaveLength(3);
      const paths = careerCachePaths(dirB, "both", "resume-made-up", 3);
      expect(() => withMadeUpSeasons(() => runCareerSeed({ ...opts, cacheDir: dirB, stopAfter: 2 }))).toThrow(CareerCheckStopped);
      expect(existsSync(paths.checkpoint)).toBe(true);
      expect(existsSync(paths.rows)).toBe(false);
      const cp = JSON.parse(readFileSync(paths.checkpoint, "utf8")) as { seasonsDone: number; seconds: number[] };
      expect(cp.seasonsDone).toBe(2);
      expect(cp.seconds).toHaveLength(2);
      const resumed = withMadeUpSeasons(() => runCareerSeed({ ...opts, cacheDir: dirB }));
      expect(resumed.from).toBe("resumed");
      expect(JSON.stringify(resumed.record.rows)).toBe(JSON.stringify(straight.record.rows));
      expect(resumed.record.seconds).toHaveLength(3);
      expect(existsSync(paths.checkpoint)).toBe(false);
      // Once written, the rows come from the cache.
      const cached = runCareerSeed({ ...opts, cacheDir: dirB });
      expect(cached.from).toBe("cache");
      expect(JSON.stringify(cached.record)).toBe(JSON.stringify(resumed.record));
      const read = readCareerRecords(dirB, "both", ["resume-made-up", "missing-seed"], 3);
      expect([...read.records.keys()]).toEqual(["resume-made-up"]);
      expect(read.missing).toEqual(["missing-seed"]);
    } finally {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    }
  }, 300_000);

  it("refuses a checkpoint made for another seed, arm, length or build", () => {
    const dir = scratch();
    try {
      const opts = { file, league, seed: "resume-other", arm: "both" as const, seasons: 2, fingerprint: "0123456789abcdef", cacheDir: dir };
      expect(() => withMadeUpSeasons(() => runCareerSeed({ ...opts, stopAfter: 1 }))).toThrow(CareerCheckStopped);
      expect(() => withMadeUpSeasons(() => runCareerSeed({ ...opts, fingerprint: "fedcba9876543210" }))).toThrow(/another fingerprint/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 300_000);
});

// --- the real walk, three switched-on seasons (about 12 minutes) ---------------------------------

const RESUME = process.env.FF_CAREER_RESUME === "1";

describe.skipIf(!RESUME)("one seed on the real walk: stopped after season 2 and resumed, against three seasons unbroken (FF_CAREER_RESUME=1)", () => {
  it("gives the unbroken walk's rows, and the checkpoint's people come back as the same objects", () => {
    const dirA = scratch(), dirB = scratch();
    const league = { path: "packages/attributes/leagues/standin-2026-10-23.json", sha256: "real" };
    const opts = { file, league, seed: "d5b-resume", arm: "both" as const, seasons: 3, fingerprint: "resume-proof-0001" };
    const log = (what: string) => (season: number, seconds: number) => console.log(`${what} ${season}: ${seconds.toFixed(0)} s`);
    try {
      const straight = runCareerSeed({ ...opts, cacheDir: dirA, onSeason: log("unbroken") });
      expect(() => runCareerSeed({ ...opts, cacheDir: dirB, stopAfter: 2, onSeason: log("stopped") })).toThrow(CareerCheckStopped);
      const paths = careerCachePaths(dirB, "both", "d5b-resume", 3);
      const text = readFileSync(paths.checkpoint, "utf8");
      const people = decodeState((JSON.parse(text) as { people: unknown }).people);
      expect(stateDifference(decodeState(JSON.parse(JSON.stringify(encodeState(people)))), people)).toBeNull();
      const resumed = runCareerSeed({ ...opts, cacheDir: dirB, onSeason: log("resumed") });
      expect(resumed.from).toBe("resumed");
      expect(JSON.stringify(resumed.record.rows)).toBe(JSON.stringify(straight.record.rows));
      console.log(`rows ${JSON.stringify(straight.record.rows).length} bytes, identical; checkpoint ${text.length} bytes`);
    } finally {
      rmSync(dirA, { recursive: true, force: true });
      rmSync(dirB, { recursive: true, force: true });
    }
  }, 3_600_000);
});
